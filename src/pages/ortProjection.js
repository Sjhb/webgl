import React, { createRef, useEffect } from 'react';
import Matrix4 from 'Matrix4';

// 正射投影
export default function OrtProjection () {
  const domRef = createRef();
  const pRef = createRef();
  useEffect(() => {
    if (domRef.current) {
      const dom = domRef.current;
      const gl = dom.getContext('webgl');
      const VSHADER_SOURCE = `
        attribute vec4 a_position;
        attribute vec4 a_color;
        uniform mat4 u_modelViewMatrix;
        uniform mat4 u_projMatrix;
        varying vec4 f_color;
        void main () {
          gl_Position = u_projMatrix * u_modelViewMatrix * a_position;
          f_color = a_color;
        }
      `;
      const FSHADER_SOURCE = `
        precision mediump float;
        varying vec4 f_color;
        void main () {
          gl_FragColor = f_color;
        }
      `; 
      const vshader = gl.createShader(gl.VERTEX_SHADER);
      const fshader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(vshader, VSHADER_SOURCE);
      gl.shaderSource(fshader, FSHADER_SOURCE);
      gl.compileShader(vshader);
      gl.compileShader(fshader);
      if (!gl.getShaderParameter(fshader, gl.COMPILE_STATUS) || !gl.getShaderParameter(vshader, gl.COMPILE_STATUS) ) {
        throw new Error('创建着色器失败');
      }

      const program = gl.createProgram();
      gl.attachShader(program, vshader);
      gl.attachShader(program, fshader);
      gl.linkProgram(program);
      gl.useProgram(program);
      gl.clearColor(0.0,0.0,0.0,1.0);

      const aPosition = gl.getAttribLocation(program, 'a_position');
      const aColor = gl.getAttribLocation(program, 'a_color');
      const modelViewMatrix = gl.getUniformLocation(program, 'u_modelViewMatrix');
      const projMatrix = gl.getUniformLocation(program, 'u_projMatrix');

      const points = new Float32Array([
        0.0, 0.5, -0.4, 0.4, 1.0, 0.4,
        -0.5, -0.5, -0.4,.4, 1.0, 0.4,
        0.5, -0.5, -0.4,1.0, 0.4, 0.4,

        0.5, 0.4, -0.2,1.0, 0.4, 1.4,
        -0.5, 0.4, -0.2,1.0, 1.0, 0.4,
        0.0, -0.6, -0.2,1.0, 1.0, 0.4,
        
        0.0, 0.5, 0.0,0.4, 0.4, 1.0,
        -0.5, -0.5, 0.0,0.4, 0.4, 1.0,
        0.5, -0.5, 0.0,1.0, 0.4, 0.4,
      ]);
      const FSIZE = points.BYTES_PER_ELEMENT;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, FSIZE * 6, 0);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
      gl.enableVertexAttribArray(aColor);

      let near=0.0,far=0.5;
      document.addEventListener('keydown', (e) => {
        switch(e.key) {
          case 'ArrowUp': {near += 0.01;break;}
          case 'ArrowDown': {near -= 0.01;break;}
          case 'ArrowLeft': {far += 0.01;break;}
          case 'ArrowRight': {far -= 0.01;break;}

        }
        draw();
      })
      function draw () {
        const viewMatrix = new Matrix4();
        const projMatrix1 = new Matrix4();
        viewMatrix.setLookAt(0.2,0.25,0.25, 0.0,0.0,0.0, 0, 1, 0);
        projMatrix1.setOrtho(-1.0, 1.0, -1.0, 1.0, near, far);
        gl.uniformMatrix4fv(modelViewMatrix, false, viewMatrix.elements);
        gl.uniformMatrix4fv(projMatrix, false, projMatrix1.elements);
  
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 9); 
        if (pRef.current) {
          pRef.current.innerHTML= `near:${near}----far:${far}`
        }
      }
      draw();
    }
  }, [domRef]);

  return <div>
    <canvas ref={domRef} width="500" height="500"/>
    <p ref={pRef}></p>
  </div>
}