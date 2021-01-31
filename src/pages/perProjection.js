import React, { createRef, useEffect } from "react";
import Matrix4 from 'Matrix4';

// 透视矩阵
export default function PerProjection () {
  const canvasRef = createRef();
  useEffect(() => {
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext('webgl');
      const VSHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        uniform mat4 u_MvpMatrix;
        varying vec4 u_Color;
        void main () {
          gl_Position = u_MvpMatrix * a_Position;
          u_Color = a_Color;
        }
      `;
      const FSHADER_SOURCE = `
        precision mediump float;
        varying vec4 u_Color;
        void main () {
          gl_FragColor = u_Color;
        }
      `;
      const vshader = gl.createShader(gl.VERTEX_SHADER);
      const fshader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(vshader, VSHADER_SOURCE);
      gl.shaderSource(fshader, FSHADER_SOURCE);
      gl.compileShader(vshader);
      gl.compileShader(fshader);
      if (!gl.getShaderParameter(vshader, gl.COMPILE_STATUS) || !gl.getShaderParameter(fshader, gl.COMPILE_STATUS)) {
        throw new Error('shader 编译失败');
      }

      const program = gl.createProgram();
      gl.attachShader(program, vshader);
      gl.attachShader(program, fshader);
      gl.linkProgram(program);
      gl.useProgram(program);

      const aPosition = gl.getAttribLocation(program, 'a_Position');
      const aColor = gl.getAttribLocation(program, 'a_Color');
      const uMvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');

      const points = new Float32Array([
        0.0, 1.0, -4.0, 0.4, 1.0, 0.4,
        -0.5, -1.0, -4.0, 0.4, 1.0, 0.4,
        0.5, -1.0, -4.0, 1.0, 0.4, 0.4,

        0.0, 1.0, -2.0, 1.0, 1.0, 0.4,
        -0.5, -1.0, -2.0, 1.0, 1.0, 0.4,
        0.5, -1.0, -2.0, 1.0, 0.4, 0.4,

        0.0, 1.0, 0.0, 0.4, 0.4, 1.0,
        -0.5, -1.0, 0.0, 0.4, 0.4, 1.0,
        0.5, -1.0, 0.0, 1.0, 0.4, 0.4,

      ])
      const BFISZE = points.BYTES_PER_ELEMENT;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, BFISZE * 6, 0);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, BFISZE * 6, BFISZE * 3);
      gl.enableVertexAttribArray(aColor);

      const viewMatrix = new Matrix4();
      const proMatrix = new Matrix4();
      const modelMatrix = new Matrix4();
      const mvpMatrix = new Matrix4();
      viewMatrix.setLookAt(0, 0, 5, 0, 0, -100, 0, 1, 0);
      proMatrix.setPerspective(30, canvasRef.current.width/canvasRef.current.height, 1, 100);
      modelMatrix.setTranslate(0.75, 0.0, 0.0);
      mvpMatrix.set(proMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix.elements);

      gl.clearColor(0.0,0.0,0.0,1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.POLYGON_OFSET_FILL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 9);

      gl.polygonOffset(1.0,1.0);
      modelMatrix.setTranslate(-0.75, 0.0, 0.0);
      mvpMatrix.set(proMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix.elements);
      gl.drawArrays(gl.TRIANGLES, 0, 9);
    }
  }, [canvasRef]);
  return <div>
    <canvas width="500" height="500" ref={canvasRef}></canvas>
  </div>
}