import React, { createRef, useEffect } from 'react';
import getWebGLContext from 'getWebGLContext';

export default function RoundPoint() {
  const dom = createRef();
  let F = {}
  useEffect(() => {
    if (dom.current) {
      const VERTEX_SHADER_SOURCE = `
        attribute vec4 a_Position;
        void main () {
          gl_Position = a_Position;
          gl_PointSize = 10.0;
        }
      `;
      const FRAGMENT_SHADER_SOURCE = `
        precision mediump float;
        uniform float u_Width;
        void main () {
          float dist = distance(gl_PointCoord, vec2(0.5,0.5));
          if (dist > 0.5) {
            discard;
          } else {
            gl_FragColor = vec4(0.5,1.0,0.0,1.0);
          }
        }
      `;
      F.gl = getWebGLContext(dom.current, true);
      const vertexShader = F.gl.createShader(F.gl.VERTEX_SHADER);
      const fragmentShader = F.gl.createShader(F.gl.FRAGMENT_SHADER);
      F.gl.shaderSource(vertexShader, VERTEX_SHADER_SOURCE);
      F.gl.shaderSource(fragmentShader, FRAGMENT_SHADER_SOURCE);
      F.gl.compileShader(vertexShader);
      F.gl.compileShader(fragmentShader);

      if (!F.gl.getShaderParameter(vertexShader, F.gl.COMPILE_STATUS)) {
        throw new Error('顶点着色器初始化失败')
      }
      if (!F.gl.getShaderParameter(fragmentShader, F.gl.COMPILE_STATUS)) {
        throw new Error('片元着色器初始化失败')
      }

      const program = F.gl.createProgram();
      F.gl.attachShader(program, vertexShader);
      F.gl.attachShader(program, fragmentShader);
      F.gl.linkProgram(program)
      F.gl.useProgram(program);
      F.gl.clearColor(0,0,0,1.0);

      const a_Position = F.gl.getAttribLocation(program, 'a_Position');
      const u_Width = F.gl.getUniformLocation(program, 'u_Width');
      const glWidth = F.gl.drawingBufferWidth;
      console.log(glWidth)
      F.gl.uniform1f(u_Width, glWidth);

      let points = new Float32Array([
        0.0, 0.0, 0.0,
        0.0, 0.5, 0.0,
        0.5, 0.5, 0.0,
        0.5, 0.0, 0.0,
      ]);
      const buf = F.gl.createBuffer();
      F.gl.bindBuffer(F.gl.ARRAY_BUFFER, buf);
      F.gl.bufferData(F.gl.ARRAY_BUFFER, points, F.gl.STATIC_DRAW);
      F.gl.vertexAttribPointer(a_Position, 3, F.gl.FLOAT, false, 0,0);
      F.gl.enableVertexAttribArray(a_Position);

      F.gl.clear(F.gl.COLOR_BUFFER_BIT);
      F.gl.drawArrays(F.gl.POINTS, 0, 4);
    }
  }, [dom]);

  return <div className="App">
    <canvas ref={dom} width="500" height="500"/>
  </div>
}
