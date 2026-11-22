// Independent photographic plates. Motion is computed in the object's own coordinates.
const W = 512,
  H = 341;
const plates = [];
const photoOrder = [
  0, 1, 2, 3, 4, 5, 6, 7, -1, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, -1, 26, 26,
];
const plateLoad = Promise.all(
  [1, 2, 3].map(async (n) => {
    const img = new Image();
    img.src = "projection/plates-" + n + ".webp";
    await img.decode();
    for (let k = 0; k < 9; k++) {
      const tile = document.createElement("canvas");
      tile.width = W;
      tile.height = H;
      const left = Math.round(((k % 3) * img.width) / 3),
        top = Math.round((Math.floor(k / 3) * img.height) / 3);
      tile
        .getContext("2d")
        .drawImage(
          img,
          left + 1,
          top + 1,
          Math.round(img.width / 3) - 2,
          Math.round(img.height / 3) - 2,
          0,
          0,
          W,
          H,
        );
      plates[(n - 1) * 9 + k] = tile;
    }
  }),
);
const pose = new Image();
pose.src = "projection/poses.webp";
const atlasesReady = Promise.all([plateLoad, pose.decode()]);
function poseImage(c, k) {
  c.drawImage(
    pose,
    (k % 2) * 512,
    Math.floor(k / 2) * 341,
    512,
    341,
    0,
    0,
    W,
    H,
  );
}
function dot(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, 2 * Math.PI);
  c.fill();
}
function line(c, x, y, x2, y2, width, color) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
}
function hash(i) {
  const n = Math.sin(i * 127.13 + 51.98) * 43758.5453;
  return n - Math.floor(n);
}
function grad(c, x, y, x2, y2, stops) {
  const g = c.createLinearGradient(x, y, x2, y2);
  stops.forEach(([p, v]) => g.addColorStop(p, v));
  return g;
}
function bits(c, t, count, origin, velocity, gravity, colors, size = 2) {
  for (let i = 0; i < count; i++) {
    const p = (t + hash(i + 4) * 0.23) % 1,
      dx = (hash(i + 70) - 0.5) * velocity[0],
      dy = velocity[1] * (0.4 + hash(i + 32));
    const x = origin[0] + (hash(i + 13) - 0.5) * origin[2] + dx * p,
      y = origin[1] + dy * p + gravity * p * p;
    c.globalAlpha = Math.sin(Math.PI * p) * 0.9;
    dot(c, x, y, 0.6 + hash(i + 11) * size, colors[i % colors.length]);
  }
  c.globalAlpha = 1;
}
// Smooth local deformations with fixed edges, evaluated in a small GPU surface.
function createWarp() {
  const surface = document.createElement("canvas");
  surface.width = W;
  surface.height = H;
  const gl = surface.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;
  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  const program = gl.createProgram();
  gl.attachShader(
    program,
    shader(
      gl.VERTEX_SHADER,
      "attribute vec2 pos;varying vec2 uv;void main(){uv=vec2(pos.x*.5+.5,.5-pos.y*.5);gl_Position=vec4(pos,0.,1.);}",
    ),
  );
  gl.attachShader(
    program,
    shader(
      gl.FRAGMENT_SHADER,
      "precision mediump float; varying vec2 uv;uniform sampler2D plate;uniform vec4 joints[6];uniform vec2 radius[6];void main(){vec2 q=uv;for(int i=0;i<6;i++){vec2 d=(uv-joints[i].xy)/radius[i];q-=joints[i].zw*exp(-dot(d,d)*2.);}gl_FragColor=texture2D(plate,clamp(q,0.,1.));}",
    ),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const a = gl.getAttribLocation(program, "pos");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
    gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
  for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
    gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR);
  const joints = gl.getUniformLocation(program, "joints[0]"),
    radius = gl.getUniformLocation(program, "radius[0]");
  let last = null;
  return function (c, img, anchors) {
    if (gl.isContextLost()) {
      c.drawImage(img, 0, 0);
      return;
    }
    if (last !== img) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      last = img;
    }
    const j = new Float32Array(24),
      r = new Float32Array(12).fill(1);
    anchors.forEach(([x, y, dx, dy, rx, ry], i) => {
      j.set([x / W, y / H, dx / W, dy / H], i * 4);
      r.set([rx / W, ry / H], i * 2);
    });
    gl.uniform4fv(joints, j);
    gl.uniform2fv(radius, r);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    c.drawImage(surface, 0, 0);
  };
}
let warp;
try {
  warp = createWarp();
} catch {
  warp = null;
}
const plateCanvas = document.createElement("canvas");
plateCanvas.width = W;
plateCanvas.height = H;
const pc = plateCanvas.getContext("2d");
function objectFrame(id, scene, t) {
  const key = id * 3 + scene,
    img = plates[photoOrder[key]],
    c = pc;
  const phase = t % 1,
    beat = (1 - Math.cos(phase * 2 * Math.PI)) / 2,
    hit = Math.exp(-6 * ((phase + 0.5) % 1));
  const swing = Math.sin(phase * 2 * Math.PI),
    rapid = Math.sin(phase * 4 * Math.PI),
    step = Math.min(7, Math.floor(t * 2));
  c.save();
  c.clearRect(0, 0, W, H);
  c.lineCap = "round";
  c.lineJoin = "round";
  const motions = {
    4: [[256, 204, 0, 18 * beat, 105, 130]],
    6: [
      [250, 147, 27 * swing, -8 * beat, 92, 106],
      [245, 195, 37 * swing, -18 * beat, 76, 54],
    ],
    7: [[270, 145, 11 * hit, -15 * hit, 245, 95]],
    12: [
      [250, 219, 0, 18 * beat, 245, 75],
      [99, 199, 12 * beat, 0, 75, 74],
      [415, 200, -12 * beat, 0, 80, 70],
    ],
    15: [[254, 158, 0, 4 * beat, 112, 80]],
    16: [
      [117, 179, 11 * beat, -4 * beat, 60, 75],
      [271, 182, -9 * beat, 0, 60, 68],
      [358, 175, 12 * beat, -3 * beat, 64, 68],
    ],
    18: [
      [171, 159, 0, 15 * hit, 90, 60],
      [338, 165, 0, 15 * (1 - hit), 90, 60],
      [251, 87, 4 * swing, 3 * hit, 65, 86],
    ],
    19: [
      [138, 156, 0, 7 * hit, 90, 110],
      [375, 150, 0, -6 * hit, 85, 100],
    ],
    20: [
      [228, 158, 10 * swing, -5 * beat, 150, 190],
      [391, 130, -9 * swing, 0, 75, 95],
    ],
    23: [
      [205, 160, -5 * beat, -7 * beat, 55, 55],
      [305, 160, 5 * beat, -7 * beat, 55, 55],
      [257, 230, 0, 9 * beat, 76, 53],
    ],
    24: [[252, 108, 4 * rapid, 0, 55, 185]],
    25: [[257, 210, 5 * rapid, -3 * beat, 100, 85]],
    26: [
      [206, 124, 0, -4 * beat, 51, 32],
      [302, 125, 0, -4 * beat, 49, 32],
      [254, 221, 3 * swing, 5 * beat, 67, 55],
    ],
    28: [
      [72, 167, 12 * swing, -3 * beat, 38, 60],
      [183, 175, -15 * swing, -6 * beat, 36, 60],
      [310, 159, 17 * swing, 0, 38, 64],
      [445, 156, -20 * swing, 2 * beat, 41, 71],
    ],
    29: [
      [72, 167, 12 * swing, -3 * beat, 38, 60],
      [183, 175, -15 * swing, -6 * beat, 36, 60],
      [310, 159, 17 * swing, 0, 38, 64],
      [445, 156, -20 * swing, 2 * beat, 41, 71],
    ],
  };
  if (img) {
    if (motions[key] && warp) {
      try {
        warp(c, img, motions[key]);
      } catch {
        warp = null;
        c.drawImage(img, 0, 0);
      }
    } else c.drawImage(img, 0, 0);
  }
  switch (key) {
    case 0: {
      // Separate the cut end from the cucumber against the matching timber.
      const cuts = 1 + Math.floor(t),
        end = 410,
        left = end - cuts * 28;
      c.drawImage(
        img,
        left,
        19,
        end - left + 60,
        105,
        left,
        123,
        end - left + 60,
        105,
      );
      for (let i = 0; i < cuts; i++) {
        const x = left + i * 28,
          offset = (i + 1) * (4 + 5 * hit);
        c.drawImage(
          img,
          x,
          125,
          28,
          108,
          x + offset,
          125 + (i % 2) * 3,
          28,
          108,
        );
        c.fillStyle = "#afc786";
        c.beginPath();
        c.ellipse(
          x + offset,
          173,
          3.4,
          22 - (i === cuts - 1 ? 5 : 0),
          -0.05,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      break;
    }
    case 1:
      for (let i = 0; i < Math.floor((t + 0.3) * 27); i++)
        dot(
          c,
          280 + (hash(i) - 0.5) * 196,
          196 + (hash(i + 52) - 0.5) * 133,
          1 + hash(i + 17),
          "#493e30",
        );
      bits(
        c,
        phase,
        22,
        [266, 22, 94],
        [70, 155],
        68,
        ["#665446", "#382b26"],
        1.4,
      );
      break;
    case 2: {
      const base = 247,
        y = 102 + step * 15 + hit * 9;
      c.fillStyle = "rgba(58,42,25,.26)";
      c.beginPath();
      c.ellipse(262, base + 2, 18, 4, -0.12, 0, 7);
      c.fill();
      c.fillStyle = grad(c, 250, 0, 258, 0, [
        [0, "#5e5d5b"],
        [0.36, "#dcdbd0"],
        [1, "#6a6969"],
      ]);
      c.fillRect(251, y, 6, base - y);
      c.fillStyle = "#8e8d86";
      c.beginPath();
      c.ellipse(254, y, 9, 3, 0, 0, 7);
      c.fill();
      break;
    }
    case 3: {
      const pitch = 22,
        yEnd = 302 - (Math.floor(t) + beat) * 60;
      c.save();
      c.beginPath();
      c.rect(0, 0, W, Math.max(6, yEnd));
      c.clip();
      for (let y = yEnd - 23 * pitch; y <= yEnd; y += pitch) {
        c.fillStyle = grad(c, 0, y, 0, y + pitch, [
          [0, "#87949c"],
          [0.18, "#f9faf4"],
          [0.8, "#d9e0e3"],
          [1, "#8c999e"],
        ]);
        c.fillRect(0, y, W, pitch);
      }
      c.restore();
      c.fillStyle = "#dce1dd";
      c.fillRect(0, yEnd - 3, W, 7);
      line(c, 472, 0, 472, 144 + beat * 72, 1.6, "#f5f4eb");
      break;
    }
    case 4: {
      const h = 36 + beat * 73;
      c.drawImage(img, 178, 232, 158, 61, 178, 227, 158, h + 32);
      line(c, 179, 227 + h + 32, 334, 227 + h + 32, 1, "#bdb5aa");
      break;
    }
    case 5:
      c.fillStyle =
        "rgba(10,18,66," + (Math.floor(t * 2) % 2 ? 0.74 : 0.04) + ")";
      c.fillRect(0, 0, W, H);
      break;
    case 6:
      dot(
        c,
        249 + Math.sin(t * Math.PI) * 148,
        178 + beat * 106 - 63 * Math.sin(phase * Math.PI),
        5 + beat * 5,
        "#f9f7df",
      );
      break;
    case 7:
      bits(
        c,
        phase,
        72,
        [257, 141, 342],
        [226, -104],
        244,
        ["#edfaff", "#a7d4e2"],
        2,
      );
      break;
    case 8: {
      c.fillStyle = grad(c, 0, 0, W, H, [
        [0, "#241a39"],
        [0.5, "#424369"],
        [1, "#101521"],
      ]);
      c.fillRect(0, 0, W, H);
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = ["#858db9", "#b6b5d3", "#66718e"][i];
        c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(0, 240 + i * 42);
        c.bezierCurveTo(180, 269, 235, 220, 407 + i * 16, -20);
        c.stroke();
      }
      ["W", "P", "X", "▰"].forEach((l, i) => {
        const pos = Math.max(0, Math.min(1, t - i));
        const x = 22 + 398 * pos * pos,
          y = 46 + i * 71 - 42 * pos;
        c.fillStyle = ["#345ca4", "#b15a38", "#498763", "#5099c3"][i];
        c.fillRect(x, y, 26, 30);
        c.fillStyle = "white";
        c.font = "bold 19px sans-serif";
        c.fillText(l, x + 4, y + 22);
      });
      break;
    }
    case 9:
      for (let i = 0; i < 46; i++) {
        const a = (i * Math.PI * 2) / 46,
          x = 258 + 81 * Math.cos(a),
          y = 152 + 48 * Math.sin(a);
        c.fillStyle = "rgba(50,135,255," + (0.14 + 0.67 * beat) + ")";
        c.beginPath();
        c.moveTo(x - 4, y);
        c.quadraticCurveTo(
          x - 1,
          y - 15 * beat,
          x + 2,
          y - 26 * beat - hash(i) * 5,
        );
        c.lineTo(x + 5, y);
        c.fill();
      }
      break;
    case 10:
      for (let i = 0; i < 42; i++) {
        const x = 358 + (i % 9) * 5,
          y = 75 + Math.floor(i / 9) * 4,
          len = beat * (148 + hash(i) * 80);
        line(
          c,
          x,
          y,
          x - len * 0.73 + i * 0.08,
          y + len,
          0.8,
          "rgba(225,248,255," + (0.13 + 0.6 * beat) + ")",
        );
      }
      break;
    case 11: {
      const z = 1 + 0.55 * beat;
      c.drawImage(
        img,
        0,
        0,
        W,
        H,
        (W * (1 - z)) / 2,
        (H * (1 - z)) / 2,
        W * z,
        H * z,
      );
      if (beat > 0.5) {
        c.save();
        c.translate((W * (1 - z)) / 2, (H * (1 - z)) / 2);
        c.scale(z, z);
        poseImage(c, 0);
        c.restore();
      }
      c.strokeStyle = "white";
      c.lineWidth = 1;
      c.strokeRect(22, 16, 468, 307);
      c.fillStyle = "white";
      c.font = "11px monospace";
      c.fillText("REC  ●", 35, 37);
      break;
    }
    case 12:
      bits(
        c,
        phase,
        140,
        [256, 187, 191],
        [390, -201],
        269,
        ["#e8fdff", "#dce7d9", "#9cc8d3"],
        3,
      );
      break;
    case 13: {
      const x = W * (1 - phase),
        fold = 60 * Math.sin(phase * Math.PI);
      c.save();
      c.beginPath();
      c.rect(x, 0, W - x, H);
      c.clip();
      poseImage(c, 1);
      c.restore();
      c.fillStyle = "rgba(54,37,19,.19)";
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + fold, 0);
      c.lineTo(x + fold + 34, H);
      c.lineTo(x + 29, H);
      c.fill();
      c.fillStyle = grad(c, x - 8, 0, x + fold + 1, 0, [
        [0, "#f4efe4"],
        [0.7, "#fffdf1"],
        [1, "#b8ad98"],
      ]);
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + fold, 0);
      c.lineTo(x + 30, H);
      c.fill();
      break;
    }
    case 14: {
      const k = Math.min(1, (Math.floor(t) + beat) / 3.6);
      c.strokeStyle = "#f6fcf9";
      c.lineWidth = 14;
      c.beginPath();
      c.moveTo(297, 111);
      c.bezierCurveTo(307, 95, 317, 99, 323 + 70 * k, 106 - 4 * beat);
      c.stroke();
      break;
    }
    case 15:
      c.fillStyle = "rgba(80,10,14," + 0.44 * (1 - beat) + ")";
      c.fillRect(175, 92, 171, 127);
      break;
    case 16:
      for (let i = 0; i < 4; i++) {
        const a = Math.max(0, Math.min(1, (t - i * 0.64) * 4));
        if (!a) continue;
        c.save();
        c.beginPath();
        c.rect(i * 128, 0, 128, H);
        c.clip();
        c.globalAlpha = a;
        poseImage(c, 2);
        c.restore();
      }
      break;
    case 18:
      c.globalAlpha = beat * 0.8;
      poseImage(c, 3);
      c.globalAlpha = 1;
      break;
    case 17:
      for (let i = 0; i <= step; i++) {
        const x = 253 + (hash(i) - 0.5) * 128,
          y = 162 + (hash(i + 31) - 0.5) * 107,
          fly = i === step ? Math.max(0, 1 - phase * 9) : 0;
        const dx = x + fly * 260,
          dy = y - fly * 186;
        line(c, dx, dy, dx + 29, dy - 22, 3, "#ccc7ab");
        c.fillStyle = i % 2 ? "#df4c36" : "#307e9a";
        c.beginPath();
        c.moveTo(dx + 14, dy - 18);
        c.lineTo(dx + 32, dy - 32);
        c.lineTo(dx + 29, dy - 16);
        c.fill();
      }
      break;
    case 20:
      c.font = "bold 17px sans-serif";
      c.textAlign = "center";
      c.lineWidth = 3;
      c.strokeStyle = "#554068";
      c.strokeText("♪　ラララ　♪", 256, 297);
      c.fillStyle = "white";
      c.fillText("♪　ラララ　♪", 256, 297);
      break;
    case 21:
      bits(
        c,
        phase,
        74,
        [259, 10, 231],
        [52, 135],
        109,
        ["#fffef6", "#ece6da"],
        1.7,
      );
      for (let i = 0; i < Math.floor(t * 55); i++)
        dot(c, 157 + hash(i) * 194, 90 + hash(i + 40) * 90, 0.9, "#fff9f2");
      break;
    case 22:
      c.fillStyle = "rgba(255,95,12," + 0.16 * beat + ")";
      c.fillRect(0, 0, W, H);
      bits(
        c,
        phase,
        30,
        [258, 219, 260],
        [115, -182],
        -14,
        ["#ffc044", "#fb7024"],
        2,
      );
      break;
    case 24:
      bits(
        c,
        phase,
        28,
        [259, 216, 28],
        [55, -79],
        -14,
        ["#c5bab0", "#dad6cf"],
        4,
      );
      break;
    case 25:
      bits(c, phase, 15, [258, 188, 20], [52, -43], -18, ["#e1ebee"], 4);
      break;
    case 27: {
      c.fillStyle = grad(c, 0, 0, W, H, [
        [0, "#284f43"],
        [1, "#253f39"],
      ]);
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#d2d8c4";
      c.font = "italic 22px Georgia";
      [
        "y = 2x + 3",
        "∠ABC = 60°",
        "a² + b² = c²",
        "3x − 4 = 11",
        "面積 = 底辺 × 高さ ÷ 2",
        "x = (a + b) / 2",
      ].forEach((s, i) => c.fillText(s, 52 + (i % 2) * 88, 52 + i * 44));
      const edge = Math.min(W, (Math.floor(t) + beat) * 147);
      c.fillStyle = "#2b4940";
      c.fillRect(0, 0, edge, H);
      for (let i = 0; i < 35; i++)
        line(
          c,
          0,
          hash(i) * H,
          edge,
          hash(i) * H + 3,
          2,
          "rgba(220,225,205,.045)",
        );
      break;
    }
  }
  c.restore();
  return plateCanvas;
}
