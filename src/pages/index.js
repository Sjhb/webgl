
import React, { createRef } from 'react';
import getWebGLContext from 'getWebGLContext';

class App extends React.Component {
  dom = createRef();
  rect = null;
  points = [];
  a_Position = null;
  a_PointSize = null;
  a_PointColor = null;
  u_Color = null;
  gl = null;
  program = null;

  clickHandle = () => {
    if (!this.dom.current) return;
    this.gl = getWebGLContext(this.dom.current, true);
    const VSHADER_SOURCE = `
      attribute vec4 a_Position;
      attribute vec2 a_TextCoord;
      varying vec2 v_TextCoord;
      void main () {
        gl_Position = a_Position;
        v_TextCoord = a_TextCoord;
      }
    `;
    const FSHADER_SOURCE = `
      precision mediump float;
      uniform sampler2D u_Sampler;
      uniform sampler2D u_Sampler1;
      varying vec2 v_TextCoord;
      void main () {
        vec4 color0 = texture2D(u_Sampler, v_TextCoord);
        vec4 color1 = texture2D(u_Sampler1, v_TextCoord);
        gl_FragColor = color0 * color1;
      }
    `;
    const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    const fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(vShader, VSHADER_SOURCE);
    this.gl.shaderSource(fShader, FSHADER_SOURCE);
    this.gl.compileShader(vShader);
    this.gl.compileShader(fShader);

    if (!this.gl.getShaderParameter(vShader, this.gl.COMPILE_STATUS) && !this.gl.getShaderParameter(fShader, this.gl.COMPILE_STATUS)) {
      throw new Error('着色器编译失败')
    }
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vShader);
    this.gl.attachShader(this.program, fShader);
    this.gl.linkProgram(this.program);
    this.gl.useProgram(this.program);
    this.gl.clearColor(1.0,1.0,1.0,1.0);

    const a_Position = this.gl.getAttribLocation(this.program, 'a_Position');
    const a_TextCoord = this.gl.getAttribLocation(this.program, 'a_TextCoord');
    const u_Sampler = this.gl.getUniformLocation(this.program, 'u_Sampler');
    const u_Sampler1 = this.gl.getUniformLocation(this.program, 'u_Sampler1');

    const points = new Float32Array([
      -0.5, 0.5, 0.0, 1.0,
      -0.5, -0.5, 0.0, 0.0,
      0.5, 0.5, 1.0, 1.0,
      0.5, -0.5, 1.0, 0.0,
    ]);

    const FSIZE = points.BYTES_PER_ELEMENT;
    const buf = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, points, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(a_Position, 2, this.gl.FLOAT, false, FSIZE * 4, 0);
    this.gl.enableVertexAttribArray(a_Position)
    this.gl.vertexAttribPointer(a_TextCoord, 2, this.gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
    this.gl.enableVertexAttribArray(a_TextCoord)

    let t1 = false, t0 = false;
    const image = new Image();
    const texture = this.gl.createTexture();
    image.onload = () => {
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);
      
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, image);
      this.gl.uniform1i(u_Sampler, 0);
      if (t1) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      }
      t0 = true;
      return true;
    }

    const image1 = new Image();
    const texture1 = this.gl.createTexture();
    image1.onload = () => {
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);
      this.gl.activeTexture(this.gl.TEXTURE1);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture1);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, image1);
      this.gl.uniform1i(u_Sampler1, 1);
      if (t0) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      }
      t1 = true;
    }
    image1.src = "http://localhost:3000/p.jpg";
    image.src = 'http://localhost:3000/r.jpg';
  }

  componentDidMount () {
    this.clickHandle();
  }

  render () {
    return (
      <div className="App">
        <canvas ref={this.dom} width="500" height="500"/>
        <button onClick={this.clickHandle}>test</button>
      </div>
    );
  }
}

export default App;
