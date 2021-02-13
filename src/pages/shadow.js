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
        uniform mat4 a_MvpMatrix;
        uniform mat4 a_LightMvpMatrix;
        varying vec4 u_Position;
        void main () {
          gl_Position = a_MvpMatrix * a_Position;
          u_Position = a_LightMvpMatrix * a_Position;
        }
        `;
      const SHADOW_FRAGMENT_SOURCE = `
        precision mediump float;
        uniform vec3 f_Color;
        uniform sampler2D u_Sampler;
        varying vec4 u_Position;
        void main () {
          vec3 shadowCoord = (u_Position.xyz/u_Position.w)/2.0 + 0.5;
          vec4 rgbDepth = texture2D(u_Sampler, shadowCoord.xy);
          float depth = rgbDepth.r;
          float visibility = (shadowCoord.z > depth + 0.005) ? 0.7 : 1.0;
          // gl_FragColor = vec4(f_Color.rgb, 1.0);
          gl_FragColor = vec4(f_Color.rgb * visibility, 1.0);
        }
      `;
      const program = getProgram(gl, SHADOW_VERTEX_SOURCE, SHADOW_FRAGMENT_SOURCE);
      const lightProgram = getProgram(gl, LIGHT_VERTEX_SOURCE, LIGHT_FRAGMENT_SOURCE);
      const fbo = getFrameBufferObject(gl, 512,512);
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
        viewMatrix.setLookAt(0.0,0.0,4.0, 0,0,-5, 0,1,0);
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

      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.viewport(0,0, canvasRef.current.width,canvasRef.current.height);
      const aPosition = gl.getAttribLocation(program, 'a_Position');
      const aMvpMatrix = gl.getUniformLocation(program, 'a_MvpMatrix');
      const fColor = gl.getUniformLocation(program, 'f_Color');
      const uSampler = gl.getUniformLocation(program, 'u_Sampler');
      const aLightMvpMatrix = gl.getUniformLocation(program, 'a_LightMvpMatrix');
      
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.uniform1i(uSampler, 0);

      const points = new Float32Array([
        -1.0, -1.0 ,-3.0,
        1.0, -1.0 ,-3.0,
        1.0, 1.0 ,-3.0,
        -1.0, 1.0 ,-3.0,
      ]);
      const pointBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
      gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0,0);
      gl.enableVertexAttribArray(aPosition);

      gl.uniform3fv(fColor, [1.0,1.0,1.0]);

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

      // -------
      const viewMatrix2 = new Matrix4();
      const mvpMatrix2 = new Matrix4();
      const proMatrix2 = new Matrix4();
      viewMatrix2.setLookAt(0.0,0.0,4.0, 0,0,-5, 0,1,0);
      proMatrix2.setPerspective(50,1, 1,200);
      mvpMatrix2.set(proMatrix2).multiply(viewMatrix2);
      gl.uniformMatrix4fv(aLightMvpMatrix, false, mvpMatrix2.elements);
      //-----

      gl.clearColor(0.8,0.8,0.8,1.0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      const modelMatrix1 = new Matrix4();
      const proMatrix1 = new Matrix4();
      const mvpMatrix1 = new Matrix4();
      const normalMatrix1 = new Matrix4();
      modelMatrix1.setTranslate(0,0,1.2);
      modelMatrix1.scale(0.3,0.3,1);
      proMatrix1.setPerspective(50, canvasRef.current.width/canvasRef.current.height, 1,100);
      mvpMatrix1.set(proMatrix1).multiply(viewMatrix).multiply(modelMatrix1);
      gl.uniformMatrix4fv(aMvpMatrix, false, mvpMatrix1.elements);
      normalMatrix1.setInverseOf(modelMatrix1);
      normalMatrix1.transpose();

      // -------
      const modelMatrix3 = new Matrix4();
      const mvpMatrix3 = new Matrix4();
      modelMatrix3.setTranslate(0,0,2);
      modelMatrix3.scale(0.3,0.3,1);
      mvpMatrix3.set(proMatrix2).multiply(viewMatrix2).multiply(modelMatrix3);
      gl.uniformMatrix4fv(aLightMvpMatrix, false, mvpMatrix3.elements);
      // ------
      
      gl.uniform3fv(fColor, [0.8,1.0,0.2]);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
  }, [canvasRef])
  return <div>
    <canvas ref={canvasRef} width="500" height="500" />
  </div>
}