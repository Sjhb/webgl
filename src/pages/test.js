import React, { useEffect, createRef } from 'react';
import Matrix4 from 'Matrix4';
import getWebGLContext from 'getWebGLContext';

function getShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(source);
    throw new Error((type === gl.VERTEX_SHADER ? '顶点' : '片元' )+ '着色器编译失败');
  }
  return shader;
}
function getProgram (gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  const vShader = getShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fShader = getShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  return program;
}
function getFrameBufferObject (gl, width, height) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  const depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
  const e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (e !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('------' + e.toString());
  }
  framebuffer.texture = texture;
  return framebuffer;
}
export default function Shadow () {
  const canvasRef = createRef();
  useEffect(() => {
    if (canvasRef.current) {
      const gl = getWebGLContext(canvasRef.current, true);
      const LIGHT_VERTEX_SOURCE = `
        attribute vec4 a_Position;
        uniform mat4 a_MvMatrix;
        void main () {
          gl_Position = a_MvMatrix * a_Position;
        }
        `;
        const LIGHT_FRAGMENT_SOURCE = `
        precision mediump float;
        void main () {
          gl_FragColor = vec4(gl_FragCoord.z, 0.0,0.0,0.0);
        }
      `;
      const SHADOW_VERTEX_SOURCE = `
        attribute vec4 a_Position;
        attribute vec2 a_TexCoord;
        uniform mat4 a_MvpMatrix;
        varying vec2 u_TexCoord;
        void main () {
          gl_Position = a_MvpMatrix * a_Position;
          u_TexCoord = a_TexCoord;
        }
        `;
      const SHADOW_FRAGMENT_SOURCE = `
        precision mediump float;
        uniform sampler2D u_Sampler;
        varying vec2 u_TexCoord;
        void main () {
          // gl_FragColor = vec4(u_TexCoord, 0.0,1.0);
          gl_FragColor = texture2D(u_Sampler, u_TexCoord);
        }
      `;
      const program = getProgram(gl, SHADOW_VERTEX_SOURCE, SHADOW_FRAGMENT_SOURCE);
      const lightProgram = getProgram(gl, LIGHT_VERTEX_SOURCE, LIGHT_FRAGMENT_SOURCE);
      const fbo = getFrameBufferObject(gl, 512, 512);
      gl.clearColor(0.0,0.0,0.0,1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      if (lightProgram) {
        gl.useProgram(lightProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
        gl.viewport(0,0, 512,512);
        const laPosition = gl.getAttribLocation(lightProgram, 'a_Position');
        const laMvMatrix = gl.getUniformLocation(lightProgram, 'a_MvMatrix');
        const points = new Float32Array([
          -1.0, -1.0 ,-3.0,
          1.0, -1.0 ,-3.0,
          1.0, 1.0 ,-3.0,
          -1.0, 1.0 ,-3.0,
        ]);
        const pointBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
        gl.vertexAttribPointer(laPosition, 3, gl.FLOAT, false, 0,0);
        gl.enableVertexAttribArray(laPosition);

        const viewMatrix = new Matrix4();
        const mvpMatrix = new Matrix4();
        const proMatrix = new Matrix4();
        viewMatrix.setLookAt(0.0,0.0,1.0, 0,0,-5, 0,1,0);
        proMatrix.setPerspective(50,1, 1,200);
        mvpMatrix.set(proMatrix).multiply(viewMatrix);
        gl.uniformMatrix4fv(laMvMatrix, false, mvpMatrix.elements);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        const modelMatrix1 = new Matrix4();
        const mvpMatrix1 = new Matrix4();
        modelMatrix1.setTranslate(0,0,2);
        modelMatrix1.scale(0.3,0.3,1);
        mvpMatrix1.set(proMatrix).multiply(viewMatrix).multiply(modelMatrix1);
        gl.uniformMatrix4fv(laMvMatrix, false, mvpMatrix1.elements);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      }
      const drawCube = () => {
        gl.useProgram(program);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        gl.viewport(0,0, canvasRef.current.width,canvasRef.current.height);
        gl.clearColor(1.0,1.0,1.0,1.0);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        const aPosition = gl.getAttribLocation(program, 'a_Position');
        const aMvpMatrix = gl.getUniformLocation(program, 'a_MvpMatrix');
        const uSampler = gl.getUniformLocation(program, 'u_Sampler');
        const aTexCoord = gl.getAttribLocation(program, 'a_TexCoord');
        
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.uniform1i(uSampler, 0);
  
        const points = new Float32Array([
          -1.0, -1.0 ,-3.0, 0.0,0.0,
          1.0, -1.0 ,-3.0, 1.0,0.0,
          1.0, 1.0 ,-3.0, 1.0,1.0,

          -1.0, 1.0 ,-3.0, 0.0,1.0,
          -1.0, -1.0 ,-3.0, 0.0,0.0,
          1.0, 1.0 ,-3.0, 1.0,1.0,
        ]);
        const BSIZE = points.BYTES_PER_ELEMENT;
        const pointBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, BSIZE * 5,0);
        gl.enableVertexAttribArray(aPosition);

        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, BSIZE * 5,BSIZE * 3);
        gl.enableVertexAttribArray(aTexCoord);
  
        const viewMatrix = new Matrix4();
        const modelMatrix = new Matrix4();
        const proMatrix = new Matrix4();
        const mvpMatrix = new Matrix4();
        const normalMatrix = new Matrix4();
        viewMatrix.setLookAt(1.5,1.5,5, 0,0,-5, 0,1,0);
        proMatrix.setPerspective(50, canvasRef.current.width/canvasRef.current.height, 1,100);
        mvpMatrix.set(proMatrix).multiply(viewMatrix).multiply(modelMatrix);
        gl.uniformMatrix4fv(aMvpMatrix, false, mvpMatrix.elements);
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();
        // gl.uniformMatrix4fv(aNormalMatrix, false, normalMatrix.elements);
  
        gl.drawArrays(gl.TRIANGLES, 0, 6);
  
        // const modelMatrix1 = new Matrix4();
        // const proMatrix1 = new Matrix4();
        // const mvpMatrix1 = new Matrix4();
        // const normalMatrix1 = new Matrix4();
        // modelMatrix1.setTranslate(0,0,1.2);
        // modelMatrix1.scale(0.3,0.3,1);
        // proMatrix1.setPerspective(50, canvasRef.current.width/canvasRef.current.height, 1,100);
        // mvpMatrix1.set(proMatrix1).multiply(viewMatrix).multiply(modelMatrix1);
        // gl.uniformMatrix4fv(aMvpMatrix, false, mvpMatrix1.elements);
        // normalMatrix1.setInverseOf(modelMatrix1);
        // normalMatrix1.transpose();
        // gl.uniformMatrix4fv(aNormalMatrix, false, normalMatrix1.elements);
        
        // gl.uniform3fv(fColor, [0.8,1.0,0.2]);
        // gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      }
      canvasRef.current.onmousedown = (e) => {
        drawCube();
        const rect = canvasRef.current.getBoundingClientRect();
        const pixels = new Uint8Array(4);
        gl.readPixels(e.clientX - rect.left, rect.bottom - e.clientY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        console.log(pixels);
      }
      drawCube();
    }
  }, [canvasRef])
  return <div>
    <canvas ref={canvasRef} width="500" height="500" />
  </div>
}