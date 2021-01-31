import React, { createRef, useEffect, useState } from 'react';
import Matrix4 from 'Matrix4';

let catchMouve = false;
let startX = 0;
let startY = 0;
// 鼠标控制旋转
export default function MouseRotate () {
  const [xRotate, setXRotate] = useState(0);
  const [yRotate, setYRotate] = useState(0);
  const [rect, setReact] = useState(null);
  const domRef = createRef();
  const F = {};
  useEffect(() => {
    if (domRef.current) {
      const dom = domRef.current;
      if (!rect) {
        setReact(dom.getBoundingClientRect());
      }
      F.gl = dom.getContext('webgl');
      const VSHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        attribute vec4 a_Normal;
        uniform mat4 a_mvpMatrix;
        uniform mat4 a_normalMatrix;
        uniform mat4 a_modelMatrix;
        varying vec4 u_Color;
        varying vec4 u_Position;
        varying vec4 u_Normal;
        void main () {
          gl_Position = a_mvpMatrix * a_Position;
          u_Position = a_modelMatrix * a_Position;
          u_Normal = a_normalMatrix * a_Normal;
          u_Color = a_Color;
        }
        `;
        const FSHADER_SOURCE = `
        precision mediump float;
        uniform vec3 a_lightPosition;
        uniform vec3 a_ambientlightColor;
        uniform vec3 a_lightColor;
        varying vec4 u_Color;
        varying vec4 u_Position;
        varying vec4 u_Normal;
        void main () {
          vec3 lightDirection = a_lightPosition - vec3(u_Position);
          vec3 normal = normalize(vec3(u_Normal));
          float nor = max(dot(normal, normalize(lightDirection)), 0.0);
          gl_FragColor = vec4(a_ambientlightColor * u_Color.rgb + u_Color.rgb * a_lightColor * nor, u_Color.a);
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
      F.aModelMatrix = F.gl.getUniformLocation(program, 'a_modelMatrix');
      F.aNormal = F.gl.getAttribLocation(program, 'a_Normal');
      F.aLightPosition = F.gl.getUniformLocation(program, 'a_lightPosition');
      F.aLightColor = F.gl.getUniformLocation(program, 'a_lightColor');
      F.aAmbientlightColor = F.gl.getUniformLocation(program, 'a_ambientlightColor');
      F.aNormalMatrix = F.gl.getUniformLocation(program, 'a_normalMatrix');

      const sp = [
        [], [-1.0, 1.0, 1.0], [-1.0, -1.0, 1.0], [1.0, 1.0, 1.0], [1.0, -1.0, 1.0],
        [-1.0, 1.0, -1.0], [-1.0, -1.0, -1.0], [1.0, 1.0, -1.0], [1.0, -1.0, -1.0],
      ];
      const sc = [
        [], [1.0, 0.3, 0.3], [0.3, 0.3, 1.0], [1.0, 1.0, 0.4], [0.4, 1.0, 0.4], [0.4, 1.0,1.0], [1.0,0.4 ,1.0]
      ];

      const nm = [
        [], [0,1,0], [0,-1,0],
        [0, 0, 1.0], [0, 0, -1.0],
        [1.0, 0.0, 0.0], [-1.0, 0.0, 0.0],
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

      const normals =  new Float32Array([
        ...nm[3], ...nm[3],...nm[3],...nm[3], // 前
        ...nm[4], ...nm[4],...nm[4],...nm[4], // 后
        ...nm[6], ...nm[6],...nm[6],...nm[6],// 左
        ...nm[5],...nm[5],...nm[5],...nm[5], // 右
        ...nm[1],...nm[1],...nm[1],...nm[1],// 上
        ...nm[2],...nm[2],...nm[2],...nm[2], // 下
      ]);

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

      const normalBuf = F.gl.createBuffer();
      F.gl.bindBuffer(F.gl.ARRAY_BUFFER, normalBuf);
      F.gl.bufferData(F.gl.ARRAY_BUFFER, normals, F.gl.STATIC_DRAW);
      F.gl.vertexAttribPointer(F.aNormal, 3, F.gl.FLOAT, false, 0, 0);
      F.gl.enableVertexAttribArray(F.aNormal);

      F.gl.uniform3fv(F.aLightColor, [1.0 , 1.0, 1.0]);
      F.gl.uniform3fv(F.aAmbientlightColor, [0.2, 0.2, 0.2]);
      F.gl.uniform3fv(F.aLightPosition, [-1.0, 1.3, 1.6]);

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
    const viewMatrix = new Matrix4();
    const perMatrix = new Matrix4();
    const modelMatrix = new Matrix4();
    const mvpMatrix = new Matrix4();
    const normalMatrix = new Matrix4();
    viewMatrix.setLookAt(0,0,10, 0.0,0.0,-100, 0.0,1.0,0.0);
    modelMatrix.rotate(xRotate, 1, 0, 0).rotate(yRotate, 0, 1, 0);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    perMatrix.setPerspective(30,domRef.current.width/domRef.current.height, 1,100);
    mvpMatrix.set(perMatrix).multiply(viewMatrix).multiply(modelMatrix);
    F.gl.uniformMatrix4fv(F.aMvpMatrix, false, mvpMatrix.elements);
    F.gl.uniformMatrix4fv(F.aNormalMatrix, false, normalMatrix.elements);
    F.gl.uniformMatrix4fv(F.aModelMatrix, false, modelMatrix.elements);
    
    F.gl.clearColor(0.0,0.0,0.0,1.0);
    F.gl.enable(F.gl.DEPTH_TEST);
    F.gl.clear(F.gl.COLOR_BUFFER_BIT| F.gl.DEPTH_BUFFER_BIT);
    F.gl.clear(F.gl.COLOR_BUFFER_BIT);
    F.gl.drawElements(F.gl.TRIANGLES, 36, F.gl.UNSIGNED_BYTE, 0);
  }, [xRotate, yRotate]);

  const mouseMoveHandle = (e) => {
    if (catchMouve) {
      setYRotate(((e.clientX - startX) / rect.width) * 180 + yRotate);
      setXRotate(((e.clientY - startY) / rect.height) * 180 + xRotate);
      startX = e.clientX;
      startY = e.clientY;
    }
  }
  const mouseDownHandle = (e) => {
    catchMouve = true;
    startX = e.clientX;
    startY = e.clientY;
  }
  const mouseUpHandle = (e) => { catchMouve = false }
  const mouseLeaveHande = (e) => {catchMouve = false}
  return <div>
    <canvas
      ref={domRef}
      width="500"
      height="500"
      onMouseMove={mouseMoveHandle}
      onMouseDown={mouseDownHandle}
      onMouseUp={mouseUpHandle}
      onMouseLeave={mouseLeaveHande}
    />
    <div>
      <div>绕Y轴旋转：{yRotate}</div>
      <div>绕X轴旋转：{xRotate}</div>
    </div>
  </div>;
}