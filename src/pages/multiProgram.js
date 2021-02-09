import React, { createRef, useState, useEffect } from 'react';
import flatMap from 'lodash/flatMap';
import Matrix4 from 'Matrix4';
const imgUrl = 'http://localhost:3000/r.jpg';
export default function  MultiProgram () {
  const canvasRef = createRef();
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const gl = canvas.getContext('webgl');
      const SOLID_VERTEX_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        uniform mat4 a_MvpMatrix;
        varying vec4 u_Color;
        void main () {
          gl_Position = a_MvpMatrix * a_Position;
          u_Color = a_Color;
        }
      `;
      const SOLID_FRAGMENT_SOURCE = `
        precision mediump float;
        varying vec4 u_Color;
        void main () {
          gl_FragColor = u_Color;
        }
      `;
      const TEX_VERTEX_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        attribute vec2 a_TexCoord;
        uniform mat4 a_MvpMatrix;
        varying vec2 u_TexCoord;
        void main () {
          gl_Position = a_MvpMatrix * a_Position;
          u_TexCoord = a_TexCoord;
        }
      `;
      const TEX_FRAGMENT_SOURCE = `
        precision mediump float;
        uniform sampler2D u_Sampler;
        varying vec2 u_TexCoord;
        void main () {
          gl_FragColor = texture2D(u_Sampler, u_TexCoord);
        }
      `;
      const getShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(type === gl.VERTEX_SHADER ?'顶点着色器初始化失败':'片元着色器初始化失败');
        return shader;
      }
      const getProgram = (vertexSource, fragmentSource) => {
        const program = gl.createProgram();
        const vertexShader = getShader(gl.VERTEX_SHADER, vertexSource);
        const framentShader = getShader(gl.FRAGMENT_SHADER, fragmentSource);
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, framentShader);
        return program;
      }
      const solidProgram = getProgram(SOLID_VERTEX_SOURCE, SOLID_FRAGMENT_SOURCE);
      const texProgram = getProgram(TEX_VERTEX_SOURCE, TEX_FRAGMENT_SOURCE);
      gl.linkProgram(solidProgram);
      gl.linkProgram(texProgram);

      gl.clearColor(0.0,0.0,0.0,1.0);
      gl.enable(gl.DEPTH_TEST);
      let rotate = 0;
      let drawTexCube = false;
      const image = new Image();
      image.src = imgUrl;
      image.onload = () => {
        drawTexCube = true;
      }
      const ps = [[-1.0, 1.0, 1.0], [1.0, 1.0, 1.0],[1.0, -1.0, 1.0],[-1.0, -1.0, 1.0],[-1.0, 1.0, -1.0],[1.0, 1.0, -1.0],[1.0, -1.0, -1.0],[-1.0, -1.0, -1.0]];
      const points = new Float32Array([
        ...ps[0],...ps[1],...ps[2],...ps[3], // 前
        ...ps[4],...ps[5],...ps[6],...ps[7], // 后
        ...ps[0],...ps[4],...ps[7],...ps[3], // 左
        ...ps[1],...ps[5],...ps[6],...ps[2], // 右
        ...ps[0],...ps[1],...ps[5],...ps[4], // 上
        ...ps[3],...ps[2],...ps[6],...ps[7], // 下
      ]);
      
      const indicas =  new Uint8Array([
        0,1,2,0,2,3,
        4,5,6,4,6,7,
        8,9,10,8,10,11,
        12,13,14,12,14,15,
        16,17,18,16,18,19,
        20,21,22,20,22,23,
      ]);
      
      const renderSolidCube = () => {
        gl.useProgram(solidProgram);
        const co = [0.0, 0.6,0.6, 1.0];
        const sAPosition = gl.getAttribLocation(solidProgram, 'a_Position');
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
        gl.vertexAttribPointer(sAPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(sAPosition);
  
        const colors = new Float32Array(flatMap(new Array(24).fill(co), e => e));
        const sAColor = gl.getAttribLocation(solidProgram, 'a_Color');
        const colorBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        gl.vertexAttribPointer(sAColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(sAColor);
  
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicas, gl.STATIC_DRAW);
        
        const modelMatrix = new Matrix4();
        const viewMatrix = new Matrix4();
        const perMatrix = new Matrix4();
        modelMatrix.setTranslate(-2.0, 0, 0);
        viewMatrix.setLookAt(0, 6, 10, 0.0,0.0,0.0, 0, 1, 0);
        perMatrix.setPerspective(50, gl.drawingBufferWidth/gl.drawingBufferHeight, 1, 100);
        modelMatrix.rotate(rotate, 0, 1, 0);
        const mvpMatrix = new Matrix4();
        const sMvpMatrix = gl.getUniformLocation(solidProgram, 'a_MvpMatrix');
        mvpMatrix.set(perMatrix).multiply(viewMatrix).multiply(modelMatrix);
        gl.uniformMatrix4fv(sMvpMatrix, false, mvpMatrix.elements);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
      }
      const renderTexCube = () => {
        gl.useProgram(texProgram);
        const tp = [[0.0,1.0], [1.0,1.0], [1.0,0.0], [0.0,0.0], ];
        const tps = new Float32Array([
          ...tp[0],...tp[1],...tp[2],...tp[3],
          ...tp[0],...tp[1],...tp[2],...tp[3],
          ...tp[0],...tp[1],...tp[2],...tp[3],
          ...tp[0],...tp[1],...tp[2],...tp[3],
          ...tp[0],...tp[1],...tp[2],...tp[3],
          ...tp[0],...tp[1],...tp[2],...tp[3],
        ]);
        const tAPosition = gl.getAttribLocation(texProgram, 'a_Position');
        const tATexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
        const pBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
        gl.vertexAttribPointer(tAPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(tAPosition);
        
        const tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, tps, gl.STATIC_DRAW);
        gl.vertexAttribPointer(tATexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(tATexCoord);

        const u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');
        const texture = gl.createTexture();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.uniform1i(u_Sampler, 0);

        const modelMatrix = new Matrix4();
        const viewMatrix = new Matrix4();
        const perMatrix = new Matrix4();
        modelMatrix.setTranslate(2.0, 0, 0);
        viewMatrix.setLookAt(0, 6, 10, 0.0,0.0,0.0, 0, 1, 0);
        perMatrix.setPerspective(50, gl.drawingBufferWidth/gl.drawingBufferHeight, 1, 100);
        modelMatrix.rotate(rotate, 0, 1, 0);
        const mvpMatrix = new Matrix4();
        const sMvpMatrix = gl.getUniformLocation(texProgram, 'a_MvpMatrix');
        mvpMatrix.set(perMatrix).multiply(viewMatrix).multiply(modelMatrix);
        gl.uniformMatrix4fv(sMvpMatrix, false, mvpMatrix.elements);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicas, gl.STATIC_DRAW);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
      }
      const render = () => {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPETH_BUFFER_BIT);
        rotate += 1;
        renderSolidCube();
        if (drawTexCube) {
          renderTexCube();
        }
        window.requestAnimationFrame(() => {
          render();
        });
      }
      render();
    }
  }, [canvasRef]);
  return <div>
    <canvas width="500" height="500" ref={canvasRef}/>
  </div>
}