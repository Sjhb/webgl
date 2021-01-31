import React, { createRef, useState, useEffect } from 'react';
import Matrix4 from 'Matrix4';

// 雾化
export default function Fog () {
  const [near, setNear] = useState(55);
  const [far, setFar] = useState(75);
  const domRef = createRef();
  const F = {};
  useEffect(() => {
    if (domRef.current) {
      const dom = domRef.current;
      F.gl = dom.getContext('webgl');
      const VSHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        uniform vec4 a_lookAt;
        uniform mat4 a_mvpMatrix;
        uniform mat4 a_modelMatrix;
        varying vec4 u_Color;
        varying float u_Dist;
        void main () {
          gl_Position = a_mvpMatrix * a_Position;
          u_Dist = distance(a_modelMatrix * a_Position, a_lookAt);
          u_Color = a_Color;
        }
      `;
      const FSHADER_SOURCE = `
        precision mediump float;
        uniform vec2 u_DistConfig;
        uniform vec4 u_FogColor;
        varying vec4 u_Color;
        varying float u_Dist;
        void main () {
          float fogFactor = clamp((u_DistConfig.y - u_Dist) / (u_DistConfig.y - u_DistConfig.x), 0.0, 1.0);
          vec3 color = mix(u_FogColor.xyz, vec3(u_Color), fogFactor);
          gl_FragColor = vec4(color, u_Color.a);
        }
      `;
      const vshader = F.gl.createShader(F.gl.VERTEX_SHADER);
      const fshader = F.gl.createShader(F.gl.FRAGMENT_SHADER);
      F.gl.shaderSource(vshader, VSHADER_SOURCE);
      F.gl.shaderSource(fshader, FSHADER_SOURCE);
      F.gl.compileShader(vshader);
      F.gl.compileShader(fshader);
      if (!F.gl.getShaderParameter(vshader, F.gl.COMPILE_STATUS)) {
        throw new Error('顶点着色器初始化失败')
      }
      if (!F.gl.getShaderParameter(fshader, F.gl.COMPILE_STATUS)) {
        throw new Error('片元着色器初始化失败')
      }

      const program = F.gl.createProgram();
      F.gl.attachShader(program, vshader);
      F.gl.attachShader(program, fshader);
      F.gl.linkProgram(program);
      F.gl.useProgram(program);

      F.aPosition = F.gl.getAttribLocation(program, 'a_Position');
      F.aColor = F.gl.getAttribLocation(program, 'a_Color');
      F.aMvpMatrix = F.gl.getUniformLocation(program, 'a_mvpMatrix');
      F.aLookAt = F.gl.getUniformLocation(program, 'a_lookAt');
      F.aModelMatix = F.gl.getUniformLocation(program, 'a_modelMatrix');
      F.uFogColor = F.gl.getUniformLocation(program, 'u_FogColor');
      F.uDistConfig = F.gl.getUniformLocation(program, 'u_DistConfig');

      const sp = [
        [], [-1.0, 1.0, 1.0], [-1.0, -1.0, 1.0], [1.0, 1.0, 1.0], [1.0, -1.0, 1.0],
        [-1.0, 1.0, -1.0], [-1.0, -1.0, -1.0], [1.0, 1.0, -1.0], [1.0, -1.0, -1.0],
      ];
      const sc = [
        [], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0]
      ];

      const points = new Float32Array([
        ...sp[1],...sp[2], ...sp[3],  ...sp[4], // 前
        ...sp[5], ...sp[6], ...sp[7],  ...sp[8], // 后
        ...sp[5],...sp[1], ...sp[2], ...sp[6], // 左
        ...sp[7],...sp[3], ...sp[8], ...sp[4], // 右
        ...sp[5],...sp[1], ...sp[7], ...sp[3], // 上
        ...sp[6],...sp[2], ...sp[8], ...sp[4], // 下
      ]);

      const colors = new Float32Array([
        ...sc[1],...sc[1], ...sc[1], ...sc[1], // 前
        ...sc[2],...sc[2], ...sc[2], ...sc[2], // 后
        ...sc[3],...sc[3], ...sc[3], ...sc[3], // 左
        ...sc[4],...sc[4], ...sc[4], ...sc[4], // 右
        ...sc[5],...sc[5], ...sc[5], ...sc[5], // 上
        ...sc[6],...sc[6], ...sc[6], ...sc[6], // 下
      ])

      const pointBuf = F.gl.createBuffer();
      F.gl.bindBuffer(F.gl.ARRAY_BUFFER, pointBuf);
      F.gl.bufferData(F.gl.ARRAY_BUFFER, points, F.gl.STATIC_DRAW);
      F.gl.vertexAttribPointer(F.aPosition, 3, F.gl.FLOAT, false, 0, 0);
      F.gl.enableVertexAttribArray(F.aPosition);
      
      const colorBuf = F.gl.createBuffer();
      F.gl.bindBuffer(F.gl.ARRAY_BUFFER, colorBuf);
      F.gl.bufferData(F.gl.ARRAY_BUFFER, colors, F.gl.STATIC_DRAW);
      F.gl.vertexAttribPointer(F.aColor, 3, F.gl.FLOAT, false, 0, 0);
      F.gl.enableVertexAttribArray(F.aColor);

      const indicas = new Uint8Array([
        0, 1, 2, 1, 2,3,
        4,5,6,5,6,7,
        8,9,10,8,10,11,
        12,13,14, 13,14, 15,
        16,17,18, 17,18,19,
        20,21,22, 21,22,23
      ]);

      const indexBuffer = F.gl.createBuffer();
      F.gl.bindBuffer(F.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      F.gl.bufferData(F.gl.ELEMENT_ARRAY_BUFFER, indicas, F.gl.STATIC_DRAW);
    }
  }, [domRef]);

  useEffect(() => {
    if (F.gl) {
      const eye = new Float32Array([25, 55, 35, 1.0]);
      const distConfig = new Float32Array([near, far]);
      const viewMatrix = new Matrix4();
      const perMatrix = new Matrix4();
      const modelMatrix = new Matrix4();
      const mvpMatrix = new Matrix4();
      viewMatrix.setLookAt(eye[0],eye[1],eye[2], 0, 2, 0, 0, 1, 0);
      modelMatrix.setScale(10, 10, 10);
      perMatrix.setPerspective(30,domRef.current.width/domRef.current.height, 1,1000);
      mvpMatrix.set(perMatrix).multiply(viewMatrix).multiply(modelMatrix);
      F.gl.uniformMatrix4fv(F.aMvpMatrix, false, mvpMatrix.elements);
      F.gl.uniformMatrix4fv(F.aModelMatix, false, modelMatrix.elements);
      F.gl.uniform4fv(F.aLookAt, eye);
      F.gl.uniform2fv(F.uDistConfig, distConfig);
      F.gl.uniform4fv(F.uFogColor, [0.137, 0.231, 0.423, 1.0]);

      F.gl.clearColor(0.137, 0.231, 0.423, 1.0);
      F.gl.enable(F.gl.DEPTH_TEST);
      F.gl.clear(F.gl.COLOR_BUFFER_BIT| F.gl.DEPTH_BUFFER_BIT);
      F.gl.clear(F.gl.COLOR_BUFFER_BIT);
      F.gl.drawElements(F.gl.TRIANGLES, 36, F.gl.UNSIGNED_BYTE, 0);
    }
  }, [near, far]);

  return <div>
  <canvas ref={domRef} width="500" height="500"/>
  <div>
    near: 
    <button onClick={() => {setNear(near + 1)}}>+</button>
    <button onClick={() => {setNear(near - 1)}}>-</button>
    far: 
    <button onClick={() => {setFar(far + 1)}}>+</button>
    <button onClick={() => {setFar(far - 1)}}>-</button>
    <h3>near: {near}</h3>
    <h3>far: {far}</h3>
  </div>
</div>
}