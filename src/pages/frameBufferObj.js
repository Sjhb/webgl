import React, { useEffect, createRef } from 'react';
import Matrix4 from 'Matrix4'

function getShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error((type === gl.VERTEX_SHADER ? '顶点' : '片元' )+ '着色器编译失败');
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
const imgUrl = 'http://localhost:3000/r.jpg';
export default function FrameBufferObj () {
  const canvasRef = createRef();
  useEffect(() => {
    if (canvasRef.current) {
      const VERTEX_SHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec2 a_TexCoord;
        uniform mat4 a_MvpMatrix;
        varying vec2 u_TexCoord;
        void main () {
          gl_Position = a_MvpMatrix * a_Position;
          u_TexCoord = a_TexCoord;
        }
      `;
      const FRAGMENT_SHADER_SOURCE = `
        precision mediump float;
        uniform sampler2D u_Sampler;
        varying vec2 u_TexCoord;
        void main () {
          gl_FragColor = texture2D(u_Sampler, u_TexCoord);
        }
      `;
      const gl = canvasRef.current.getContext('webgl');
      const program = getProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
      gl.useProgram(program);
      const aPosition = gl.getAttribLocation(program, 'a_Position');
      const aMvpMatrix = gl.getUniformLocation(program, 'a_MvpMatrix');
      const aTexCoord = gl.getAttribLocation(program, 'a_TexCoord');
      const uSampler = gl.getUniformLocation(program, 'u_Sampler');

      let angle = 0;
      const viewMatrix = new Matrix4();
      const proMatrix = new Matrix4();
      viewMatrix.setLookAt(0, 3, 6, 0,0,0,0,1,0);
      proMatrix.setPerspective(50, canvasRef.current.width/canvasRef.current.height, 1, 100);
      
      gl.enable(gl.DEPTH_TEST);
      
      const image = new Image();
      image.src = imgUrl;
      image.onload = () => {
        render();
      }
      const po = [0,
        [-1.0,1.0,1.0], // 1
        [1.0,1.0,1.0], // 2
        [1.0,-1.0,1.0], // 3
        [-1.0,-1.0,1.0], // 4
        [-1.0,1.0,-1.0], // 5
        [1.0,1.0,-1.0], // 6
        [1.0,-1.0,-1.0], // 7
        [-1.0,-1.0,-1.0], // 8
        //   5-------6
        //  /|      /|
        // 1-------2 |
        // | 8-----|-7
        // | /     |/
        // 4-------3
      ]
      const te = [0, [0.0,1.0],[1.0,1.0],[1.0,0.0],[0.0,0.0]];

      const OFFSCREEN_WIDTH = 256;
      const OFFSCREEN_HEIGHT = 256;

      function initFramebufferObj (gl) {
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        
        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
        
        const frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
        const e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (e!==gl.FRAMEBUFFER_COMPLETE) {
          console.error('------' + e.toString());
        }

        frameBuffer.texture = texture;
        return frameBuffer;
      }
      
      function drawTexCube (gl) {
        const faces = new Float32Array([
          ...po[1],...te[1], ...po[2],...te[2], ...po[3],...te[3], ...po[4],...te[4], // 前
          ...po[5],...te[1],...po[6],...te[2],...po[7],...te[3],...po[8],...te[4], // 后
          ...po[1],...te[1],...po[5],...te[2],...po[8],...te[3],...po[4],...te[4], // 左
          ...po[2],...te[1],...po[6],...te[2],...po[7],...te[3],...po[3],...te[4], // 右
          ...po[5],...te[1],...po[6],...te[2],...po[2],...te[3],...po[1],...te[4], // 上
          ...po[8],...te[1],...po[7],...te[2],...po[4],...te[4],...po[3],...te[3], // 下
        ]);
        const indicas = new Uint8Array([
          0,1,2,0,2,3, // 前
          4,5,6,4,6,7, // 后
          8,9,10,8,10,11, // 左
          12,13,14,12,14,15, // 右
          16,17,18,16,18,19, // 上
          20,21,22,21,22,23, // 下
        ]);
        const BSIZE = faces.BYTES_PER_ELEMENT;
  
        const pointBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
        gl.bufferData(gl.ARRAY_BUFFER, faces, gl.STATIC_DRAW);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, BSIZE * 5, 0);
        gl.enableVertexAttribArray(aPosition);
  
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, BSIZE * 5, BSIZE * 3);
        gl.enableVertexAttribArray(aTexCoord);
        
        const indicaBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicaBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicas, gl.STATIC_DRAW);

        const tempTexture = gl.createTexture();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tempTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.uniform1i(uSampler, 0);

        const mvpMatrix = new Matrix4();
        const modelMatrix = new Matrix4();
        modelMatrix.setRotate(angle, 0, 1, 0);
        mvpMatrix.set(proMatrix).multiply(viewMatrix).multiply(modelMatrix);
        gl.uniformMatrix4fv(aMvpMatrix, false, mvpMatrix.elements);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
      }
      function drawSquare (gl, fbo) {
        const faces1 = new Float32Array([
          ...po[1],...te[1], ...po[2],...te[2], ...po[3],...te[3], ...po[1],...te[1], ...po[3],...te[3],...po[4],...te[4],
        ]);
        const BSIZE = faces1.BYTES_PER_ELEMENT;
        const pointBuf1 = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf1);
        gl.bufferData(gl.ARRAY_BUFFER, faces1, gl.STATIC_DRAW);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, BSIZE * 5, 0);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, BSIZE * 5, BSIZE * 3);
        gl.enableVertexAttribArray(aTexCoord);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.uniform1i(uSampler, 0);

        const mvpMatrix = new Matrix4();
        const viewMatrix = new Matrix4();
        viewMatrix.setLookAt(-3, 3, 6, 0,0,0,0,1,0);
        mvpMatrix.set(proMatrix).multiply(viewMatrix);
        gl.uniformMatrix4fv(aMvpMatrix, false, mvpMatrix.elements);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      function draw () {
        const fbo = initFramebufferObj(gl);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0,0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
        gl.clearColor(0.2,0.2,0.4,1.0);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        drawTexCube(gl);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvasRef.current.width, canvasRef.current.height);
        gl.clearColor(0.0,0.4,0.4,1.0);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        drawSquare(gl, fbo);
      }
      function render () {
        if (canvasRef.current) {
          angle += 1;
          draw();
          window.requestAnimationFrame(render);
        }
      }
    }
  }, [canvasRef])
  return <div>
    <canvas ref={canvasRef} width="500" height="500" />
  </div>
}