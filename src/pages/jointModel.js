import React, { createRef, useEffect, useState } from 'react';
import Matrix4 from 'Matrix4';

export default function JointModel (params) {
  const [arm1Angle, setArm1Angle] = useState(0);
  const [arm2Angle, setArm2Angle] = useState(0);
  const [finger1Angle, setFinger1Angle] = useState(0);
  const [finger2Angle, setFinger2Angle] = useState(0);
  const [plamAngle, setPalmAngle] = useState(0);
  const canvasRef = createRef();
  const F = {};
  useEffect(() => {
    if (canvasRef.current) {
      F.gl = canvasRef.current.getContext('webgl');
      const VSHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        attribute vec4 a_Normal;
        uniform mat4 a_mvpMatrix;
        uniform mat4 a_normalMatrix;
        uniform vec3 a_lightDirection;
        uniform vec3 a_ambientlightColor;
        uniform vec3 a_lightColor;
        varying vec4 u_Color;
        void main () {
          gl_Position = a_mvpMatrix * a_Position;
          vec3 normal = normalize(vec3(a_normalMatrix * a_Normal));
          float nor = max(dot(normal, normalize(a_lightDirection)), 0.0);
          u_Color = vec4(a_ambientlightColor * a_Color.rgb + vec3(a_Color) * a_lightColor * nor, a_Color.a);
        }
      `;
      const FSHADER_SOURCE = `
        precision mediump float;
        varying vec4 u_Color;
        void main () {
          gl_FragColor = u_Color;
        }
      `;
      const vshader = F.gl.createShader(F.gl.VERTEX_SHADER);
      const fshader = F.gl.createShader(F.gl.FRAGMENT_SHADER);
      F.gl.shaderSource(vshader, VSHADER_SOURCE);
      F.gl.shaderSource(fshader, FSHADER_SOURCE);
      F.gl.compileShader(vshader);
      F.gl.compileShader(fshader);
      if (!F.gl.getShaderParameter(vshader, F.gl.COMPILE_STATUS)) throw new Error('顶点着色器编译失败');
      if (!F.gl.getShaderParameter(fshader, F.gl.COMPILE_STATUS)) throw new Error('片元着色器编译失败');
      const program = F.gl.createProgram();
      F.gl.attachShader(program, vshader);
      F.gl.attachShader(program, fshader);
      F.gl.linkProgram(program);
      F.gl.useProgram(program);

      F.aPosition = F.gl.getAttribLocation(program, 'a_Position');
      F.aColor = F.gl.getAttribLocation(program, 'a_Color');
      F.aMvpMatrix = F.gl.getUniformLocation(program, 'a_mvpMatrix');
      F.aNormal = F.gl.getAttribLocation(program, 'a_Normal');
      F.aLightDirection = F.gl.getUniformLocation(program, 'a_lightDirection');
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
      F.gl.uniform3fv(F.aLightDirection, [-0.5, -0.3, 0.4]);

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
      vpMatrix.setPerspective(50,canvasRef.current.width/canvasRef.current.height, 1,100);
      vpMatrix.lookAt(20,10,30, 0.0,0,0, 0.0,1.0,0.0);
    }
  }, [canvasRef]);
  
  let modelMatrix = new Matrix4();
  const mvpMatrix = new Matrix4();
  const normalMatrix = new Matrix4();
  const vpMatrix = new Matrix4();

  useEffect(() => {
    F.gl.clearColor(0.0,0.0,0.0,1.0);
    F.gl.enable(F.gl.DEPTH_TEST);
    F.gl.clear(F.gl.COLOR_BUFFER_BIT| F.gl.DEPTH_BUFFER_BIT);
    F.gl.clear(F.gl.COLOR_BUFFER_BIT);

    // 绘制基座
    const baseHeight = 2.0;
    modelMatrix.setTranslate(0, -12.0, 0.0);
    drawBox(10, baseHeight, 10);

    // 画ARM1
    const arm1Height = 10.0;
    modelMatrix.translate(0, baseHeight, 0);
    modelMatrix.rotate(arm1Angle, 0, 1, 0);
    drawBox(3, arm1Height, 3);
    
    // 画ARM2
    const arm2Height = 10.0;
    modelMatrix.translate(0, arm1Height, 0);
    modelMatrix.rotate(arm2Angle, 1, 0, 0);
    drawBox(2, arm2Height, 2);
    
    // 画plam
    const plamHeight = 2.0;
    modelMatrix.translate(0, arm2Height, 0);
    modelMatrix.rotate(plamAngle, 0, 1, 0);
    drawBox(4, plamHeight, 2);
    
    // 画finger1
    modelMatrix.translate(0, plamHeight, 0);
    pushMatrix(modelMatrix);
    modelMatrix.translate(2, 0, 0);
    modelMatrix.rotate(finger1Angle, 0, 1, 0,);
    drawBox(1, 2, 1);
    modelMatrix = popMatrix();
    
    // 画finger2
    modelMatrix.translate(-2, 0, 0);
    modelMatrix.rotate(finger2Angle, 0, 1, 0,);
    drawBox(1, 2, 1);

  }, [arm1Angle, arm2Angle, finger1Angle, finger2Angle, plamAngle]);
  
  const matrixStack = [];
  function pushMatrix(matrix) {
    const m = new Matrix4(matrix)
    matrixStack.push(m);
  }
  function popMatrix() {
    return matrixStack.pop();
  }
  
  function drawBox (width, height, depth) {
    pushMatrix(modelMatrix);
    modelMatrix.scale(width, height, depth);
    mvpMatrix.set(vpMatrix);
    mvpMatrix.multiply(modelMatrix);
    F.gl.uniformMatrix4fv(F.aMvpMatrix, false, mvpMatrix.elements);

    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    F.gl.uniformMatrix4fv(F.aNormalMatrix, false, normalMatrix.elements);
    F.gl.drawElements(F.gl.TRIANGLES, 36, F.gl.UNSIGNED_BYTE, 0);

    modelMatrix = popMatrix();
  }

  return <div>
    <canvas width="500" height="500" ref={canvasRef}></canvas>
    <div>
      Arm1：
      <button onClick={() => setArm1Angle(arm1Angle + 5)}>+</button>
      <button onClick={() => setArm1Angle(arm1Angle - 5)}>-</button>
      Arm2：
      <button onClick={() => setArm2Angle(arm2Angle + 5)}>+</button>
      <button onClick={() => setArm2Angle(arm2Angle - 5)}>-</button>
      Plam：
      <button onClick={() => setPalmAngle(plamAngle + 5)}>+</button>
      <button onClick={() => setPalmAngle(plamAngle - 5)}>-</button>
      Finger1：
      <button onClick={() => setFinger1Angle(finger1Angle + 5)}>+</button>
      <button onClick={() => setFinger1Angle(finger1Angle - 5)}>-</button>
      Finger2：
      <button onClick={() => setFinger2Angle(finger2Angle + 5)}>+</button>
      <button onClick={() => setFinger2Angle(finger2Angle - 5)}>-</button>
    </div>
    <div>
      <p>arm1Angle: {arm1Angle}</p>
      <p>arm2Angle: {arm2Angle}</p>
      <p>plamAngle: {plamAngle}</p>
      <p>finger1Angle: {finger1Angle}</p>
      <p>finger2Angle: {finger2Angle}</p>
    </div>
  </div> 
}