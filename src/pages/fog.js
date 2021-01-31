import React, { createRef, useState, useEffect } from 'react';
import Matrix4 from 'Matrix4';

// 雾化
export default function Fog () {
  const [near, setNear] = useState(44);
  const [far, setFar] = useState(72);
  const domRef = createRef();
  const dom1Ref = createRef();
  const F = {
    fogColor: [0.137, 0.231, 0.423, 1.0],
  };
  const M = {
    fogColor: [0.137, 0.231, 0.423, 1.0],
  };
  const init = (dom, container, isW) => {
    container.gl = dom.getContext('webgl');
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
        u_Dist = ${isW ? 'gl_Position.w' : 'distance(a_modelMatrix * a_Position, a_lookAt)'};
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
    const vshader = container.gl.createShader(container.gl.VERTEX_SHADER);
    const fshader = container.gl.createShader(container.gl.FRAGMENT_SHADER);
    container.gl.shaderSource(vshader, VSHADER_SOURCE);
    container.gl.shaderSource(fshader, FSHADER_SOURCE);
    container.gl.compileShader(vshader);
    container.gl.compileShader(fshader);
    if (!container.gl.getShaderParameter(vshader, container.gl.COMPILE_STATUS)) {
      throw new Error('顶点着色器初始化失败')
    }
    if (!container.gl.getShaderParameter(fshader, container.gl.COMPILE_STATUS)) {
      throw new Error('片元着色器初始化失败')
    }

    const program = container.gl.createProgram();
    container.gl.attachShader(program, vshader);
    container.gl.attachShader(program, fshader);
    container.gl.linkProgram(program);
    container.gl.useProgram(program);

    container.aPosition = container.gl.getAttribLocation(program, 'a_Position');
    container.aColor = container.gl.getAttribLocation(program, 'a_Color');
    container.aMvpMatrix = container.gl.getUniformLocation(program, 'a_mvpMatrix');
    container.aLookAt = container.gl.getUniformLocation(program, 'a_lookAt');
    container.aModelMatix = container.gl.getUniformLocation(program, 'a_modelMatrix');
    container.uFogColor = container.gl.getUniformLocation(program, 'u_FogColor');
    container.uDistConfig = container.gl.getUniformLocation(program, 'u_DistConfig');

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

    const pointBuf = container.gl.createBuffer();
    container.gl.bindBuffer(container.gl.ARRAY_BUFFER, pointBuf);
    container.gl.bufferData(container.gl.ARRAY_BUFFER, points, container.gl.STATIC_DRAW);
    container.gl.vertexAttribPointer(container.aPosition, 3, container.gl.FLOAT, false, 0, 0);
    container.gl.enableVertexAttribArray(container.aPosition);
    
    const colorBuf = container.gl.createBuffer();
    container.gl.bindBuffer(container.gl.ARRAY_BUFFER, colorBuf);
    container.gl.bufferData(container.gl.ARRAY_BUFFER, colors, container.gl.STATIC_DRAW);
    container.gl.vertexAttribPointer(container.aColor, 3, container.gl.FLOAT, false, 0, 0);
    container.gl.enableVertexAttribArray(container.aColor);

    const indicas = new Uint8Array([
      0, 1, 2, 1, 2,3,
      4,5,6,5,6,7,
      8,9,10,8,10,11,
      12,13,14, 13,14, 15,
      16,17,18, 17,18,19,
      20,21,22, 21,22,23
    ]);

    const indexBuffer = container.gl.createBuffer();
    container.gl.bindBuffer(container.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    container.gl.bufferData(container.gl.ELEMENT_ARRAY_BUFFER, indicas, container.gl.STATIC_DRAW);
  }
  useEffect(() => {
    if (domRef.current && !F.gl) {
      init(domRef.current, F);
    }
    if (dom1Ref.current && !M.gl) {
      init(dom1Ref.current, M, true);
    }
  }, [domRef, dom1Ref]);

  useEffect(() => {
    if (F.gl && M.gl) {
      [F, M].map(e => {
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
        e.gl.uniformMatrix4fv(e.aMvpMatrix, false, mvpMatrix.elements);
        e.gl.uniformMatrix4fv(e.aModelMatix, false, modelMatrix.elements);
        e.gl.uniform4fv(e.aLookAt, eye);
        e.gl.uniform2fv(e.uDistConfig, distConfig);
        e.gl.uniform4fv(e.uFogColor, e.fogColor);
  
        e.gl.clearColor(...e.fogColor);
        e.gl.enable(e.gl.DEPTH_TEST);
        e.gl.clear(e.gl.COLOR_BUFFER_BIT| e.gl.DEPTH_BUFFER_BIT);
        e.gl.clear(e.gl.COLOR_BUFFER_BIT);
        e.gl.drawElements(e.gl.TRIANGLES, 36, e.gl.UNSIGNED_BYTE, 0);
      })
    }
  }, [near, far]);

  return <div>
  <canvas ref={domRef} width="500" height="500"/>
  <canvas ref={dom1Ref} width="500" height="500"/>
  <div>
    near: 
    <button onClick={() => {setNear(near + 1)}}>+</button>
    <button onClick={() => {setNear(near - 1)}}>-</button>
    far: 
    <button onClick={() => {setFar(far + 1)}}>+</button>
    <button onClick={() => {setFar(far - 1)}}>-</button>
    <h3>near: {near}</h3>
    <h3>far: {far}</h3>
    <h3>第二个使用W分量，可以看到与计算distance有一定偏差</h3>
  </div>
</div>
}