import React, { createRef, useEffect } from 'react';
import getWebGLContext from 'getWebGLContext';

export default function Circle() {
  const dom = createRef();
  useEffect(() => {
    if (dom.current) {
      const VERTEX_SHADER_SOURCE = `
        attribute vec4 a_Position;
        void main () {
          gl_Position = a_Position;
        }
      `;
      const FRAGMENT_SHADER_SOURCE = `
        precision mediump float;
        uniform float u_Width;
        void main () {
          float x = u_Width / 2.0 - gl_FragCoord.x;
          float y = u_Width / 2.0 - gl_FragCoord.y;
          float r = sqrt(x * x + y * y);
          float percent = r / (u_Width / 4.0) * 0.5;
          gl_FragColor = vec4(percent, 0.0, 1.0 - percent, 1.0);
        }
      `;
      const gl = getWebGLContext(dom.current, true);
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(vertexShader, VERTEX_SHADER_SOURCE);
      gl.shaderSource(fragmentShader, FRAGMENT_SHADER_SOURCE);
      gl.compileShader(vertexShader);
      gl.compileShader(fragmentShader);

      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) && !gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) ) {
        throw new Error('着色器编译失败')
      }

      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program)
      gl.useProgram(program);
      gl.clearColor(0,0,0,1.0);

      const a_Position = gl.getAttribLocation(program, 'a_Position');
      const u_Width = gl.getUniformLocation(program, 'u_Width');
      const glWidth = gl.drawingBufferWidth;
      gl.uniform1f(u_Width, glWidth);

      let points = [0.0, 0.0,  0.5, 0.0];
      const num = 100;
      const angle = 360/num * (Math.PI / 180);
      for (let i = 1; i<=num; i++) {
        points.push(Math.cos(angle * i) * 0.5);
        points.push(Math.sin(angle * i) * 0.5);
      }
      points = new Float32Array(points);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, (num + 2));
    }
  }, [dom]);

  return <div className="App">
    <canvas ref={dom} width="500" height="500"/>
  </div>
}