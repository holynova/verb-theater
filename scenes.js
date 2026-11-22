// All shapes are drawn in a 600 × 330 stage. A shared palette and ink pass
// keep the twelve props and the movement guide in the same visual world.
const StageArt = (() => {
  const ink = "#26322d",
    paper = "#fff2d3",
    red = "#ed5c46",
    gold = "#ffc449",
    teal = "#67b9ad",
    rose = "#f1a7a2",
    blue = "#9acbd8",
    green = "#bad291";
  const palettes = [
    rose,
    gold,
    blue,
    green,
    gold,
    blue,
    green,
    rose,
    blue,
    rose,
    gold,
    green,
  ];
  const tau = Math.PI * 2;
  function paint(canvas, id, beat = 0, guide = "", wide = false) {
    const c = canvas.getContext("2d");
    const w = canvas.width,
      h = canvas.height;
    c.setTransform(w / 600, 0, 0, h / 330, 0, 0);
    c.lineCap = "round";
    c.lineJoin = "round";
    function finish(fill, stroke = ink, width = 3) {
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = width;
        c.stroke();
      }
    }
    function rect(x, y, w, h, r, fill, stroke = ink, width = 3) {
      c.beginPath();
      c.roundRect(x, y, w, h, r);
      finish(fill, stroke, width);
    }
    function oval(x, y, rx, ry, fill, stroke = ink, width = 3) {
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, tau);
      finish(fill, stroke, width);
    }
    function poly(points, fill, stroke = ink, width = 3, close = true) {
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      if (close) c.closePath();
      finish(fill, stroke, width);
    }
    function path(d, fill = null, stroke = ink, width = 3) {
      const p = new Path2D(d);
      if (fill) {
        c.fillStyle = fill;
        c.fill(p);
      }
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = width;
        c.stroke(p);
      }
    }
    function line(x, y, X, Y, color = ink, width = 3) {
      poly(
        [
          [x, y],
          [X, Y],
        ],
        null,
        color,
        width,
        false,
      );
    }
    function at(x, y, angle, fn, scale = 1) {
      c.save();
      c.translate(x, y);
      c.rotate(angle);
      c.scale(scale, scale);
      fn();
      c.restore();
    }
    function star(x, y, r, fill = paper) {
      poly(
        [
          [x, y - r],
          [x + r * 0.23, y - r * 0.23],
          [x + r, y],
          [x + r * 0.23, y + r * 0.23],
          [x, y + r],
          [x - r * 0.23, y + r * 0.23],
          [x - r, y],
          [x - r * 0.23, y - r * 0.23],
        ],
        fill,
        ink,
        2,
      );
    }
    function face(x, y, size = 1) {
      at(
        x,
        y,
        0,
        () => {
          oval(-11, -3, 2.5, 4, ink, null);
          oval(11, -3, 2.5, 4, ink, null);
          path("M -5 5 Q 0 12 6 4", null, ink, 2);
        },
        size,
      );
    }
    function hatch(x, y, n) {
      for (let i = 0; i < n; i++)
        line(x + i * 6, y, x + i * 6 + 5, y - 7, ink, 1);
    }
    function shadow(x, y, rx) {
      oval(x, y, rx, 8, "#34382d30", null);
    }
    function hills() {
      poly(
        [
          [0, 240],
          [80, 184],
          [145, 221],
          [226, 135],
          [304, 219],
          [410, 142],
          [533, 224],
          [600, 159],
          [600, 330],
          [0, 330],
        ],
        teal,
        null,
      );
      poly(
        [
          [0, 280],
          [130, 224],
          [220, 262],
          [333, 210],
          [451, 246],
          [550, 205],
          [600, 238],
          [600, 330],
          [0, 330],
        ],
        green,
        ink,
        2,
      );
    }
    function cloud(x, y, s) {
      at(
        x,
        y,
        0,
        () =>
          path(
            "M -39 8 Q -44 -5 -29 -7 Q -25 -26 -7 -18 Q 5 -36 19 -18 Q 39 -20 38 -4 Q 54 -2 48 8 Z",
            paper,
            ink,
            2,
          ),
        s,
      );
    }
    function rays(x, y, n, r) {
      for (let i = 0; i < n; i++) {
        const a = (i * tau) / n;
        line(
          x + Math.cos(a) * r,
          y + Math.sin(a) * r,
          x + Math.cos(a) * (r + 8),
          y + Math.sin(a) * (r + 8),
          ink,
          2,
        );
      }
    }
    function bird(x, y, s) {
      at(
        x,
        y,
        0,
        () => {
          oval(0, 0, 27, 23, gold);
          oval(12, -15, 19, 18, gold);
          poly(
            [
              [28, -18],
              [41, -13],
              [29, -9],
            ],
            red,
          );
          oval(17, -19, 2, 3, ink, null);
          path("M -19 -1 Q -10 15 2 5", null, ink, 2);
        },
        s,
      );
    }
    const phase = beat - Math.floor(beat),
      pulse = Math.exp(-phase * 5),
      arc = Math.sin(Math.PI * phase),
      wave = Math.cos(beat * Math.PI);
    c.fillStyle = guide ? "#dedfc7" : palettes[id];
    c.fillRect(0, 0, 600, 330);
    // The dot screens are printed in the margins, leaving the active prop clear.
    c.fillStyle = "#27342d35";
    for (let row = 0; row < 33; row++)
      for (let col = 0; col < 10; col++) {
        if (col + row < 12 || col + (32 - row) < 11) {
          const x = 6 + col * 9 + (row % 2) * 4;
          c.fillRect(x, row * 10, 2, 2);
          c.fillRect(598 - x, 330 - row * 10, 2, 2);
        }
      }
    if (guide) {
      const motion = (1 + Math.cos(tau * phase)) * 0.5,
        alt = Math.sin(beat * Math.PI);
      shadow(300, 290, 96);
      c.save();
      c.translate(300, 171);
      function limb(points, color, width) {
        poly(points, null, ink, width + 5, false);
        poly(points, null, color, width, false);
      }
      const lift = guide === "walk" ? alt * 18 : 0;
      limb(
        [
          [-18, 37],
          [-30, 76 - lift],
          [-38, 103 - lift],
        ],
        teal,
        18,
      );
      limb(
        [
          [18, 37],
          [32, 76 + lift],
          [39, 103 + lift],
        ],
        teal,
        18,
      );
      oval(-44, 106 - lift, 20, 7, ink);
      oval(45, 106 + lift, 20, 7, ink);
      rect(-36, -38, 72, 90, 21, red);
      let arms;
      switch (guide) {
        case "clap":
          arms = [
            [-56, -4],
            [-60 + 49 * motion, -44],
            [56, -4],
            [60 - 49 * motion, -44],
          ];
          break;
        case "pull":
          arms = [
            [-42, -42],
            [-15, -95 + 68 * motion],
            [41, -35],
            [9, -73 + 63 * motion],
          ];
          break;
        case "fan":
          arms = [
            [-56, 0],
            [-53 + 36 * alt, -52],
            [49, 6],
            [62, 24],
          ];
          break;
        case "knock":
          arms = [
            [-55, 3],
            [-49, 24],
            [64, -35],
            [66 + 28 * motion, -68 + 26 * motion],
          ];
          break;
        case "twist":
          arms = [
            [-45, 0],
            [-42, 22],
            [60, -3],
            [67 + 13 * Math.cos(beat * tau), -45 + 9 * Math.sin(beat * tau)],
          ];
          break;
        default:
          arms = [
            [-47, 3],
            [-62, -8 - lift],
            [47, 3],
            [62, -8 + lift],
          ];
      }
      const hand = (sign, elbow, palm) => {
        limb([[sign * 27, -25], elbow, palm], paper, 13);
        oval(...palm, 9, 11, gold);
      };
      hand(-1, arms[0], arms[1]);
      hand(1, arms[2], arms[3]);
      oval(0, -72, 30, 29, paper);
      path(
        "M -31 -76 Q -30 -111 0 -104 Q 28 -105 28 -82 L 37 -79 L 36 -74 Z",
        teal,
      );
      face(0, -70, 0.8);
      if (guide === "clap" && motion > 0.76) {
        line(-4, -63, -7, -72);
        line(6, -62, 10, -69);
      }
      if (guide === "pull") {
        line(0, -150, 0, Math.min(arms[1][1], arms[3][1]) - 7, ink, 3);
      }
      if (guide === "knock") {
        rect(104, -102, 11, 95, 2, teal);
      }
      if (guide === "twist") {
        at(...arms[3], beat * tau, () => {
          line(-12, 0, 12, 0, red, 4);
        });
      }
      c.restore();
      return;
    }
    // Short-and-wide thumbnails retain the natural proportions of their subjects.
    if (wide) {
      c.translate(300, 165);
      c.scale(0.66, 0.98);
      c.translate(-300, -165);
    }
    switch (id) {
      case 0: {
        // Toast pops up as the palms meet.
        shadow(300, 299, 140);
        star(125, 94, 13);
        star(464, 84, 22, gold);
        star(499, 188, 9);
        for (let i = 0; i < 3; i++) {
          line(189 + i * 8, 116 - i * 5, 185 + i * 8, 94 - i * 5);
          line(372 + i * 7, 86 + i * 4, 379 + i * 7, 66 + i * 4);
        }
        function bread(x, y, a, sz) {
          at(
            x,
            y,
            a,
            () => {
              const slice =
                "M -34 -9 C -54 -14 -49 -46 -24 -48 Q 0 -56 24 -48 C 52 -44 52 -15 35 -9 L 35 40 Q 35 47 28 47 L -26 47 Q -34 47 -34 40 Z";
              path(slice, "#c78244");
              at(0, 0, 0, () => path(slice, "#ffda89", ink, 2), 0.82);
              face(0, -1, 1);
              hatch(-20, 26, 3);
              oval(-19, -27, 2, 3, "#cc9556", null);
            },
            sz,
          );
        }
        bread(327, 115 - 31 * pulse, 0.22 + 0.06 * pulse, 0.96);
        bread(251, 113 - 55 * pulse, -0.2 - 0.08 * pulse, 1.05);
        path("M 412 245 C 458 211 434 300 500 269 L 520 258", null, ink, 4);
        at(523, 256, -0.42, () => {
          rect(-4, -8, 15, 16, 3, paper);
          line(11, -4, 21, -4);
          line(11, 4, 21, 4);
        });
        rect(203, 275, 26, 16, 4, ink);
        rect(358, 275, 26, 16, 4, ink);
        path(
          "M 170 193 Q 173 160 204 155 L 347 145 Q 381 141 398 165 L 418 191 L 418 257 Q 417 275 395 278 L 198 284 Q 172 283 170 261 Z",
          teal,
        );
        path(
          "M 170 193 Q 176 175 204 175 L 349 165 Q 373 162 383 182 L 393 202 L 392 276 L 197 284 Q 172 282 170 261 Z",
          "#87c8b6",
        );
        path("M 191 166 L 340 153 Q 353 152 360 159 L 207 172 Z", ink);
        line(400, 193, 400, 237);
        rect(391, 201 + 10 * pulse, 23, 8, 3, red);
        oval(358, 244, 11, 11, paper);
        line(358, 244, 362, 237);
        rect(194, 216, 71, 25, 12, paper);
        at(229, 233, 0, () => {
          c.fillStyle = ink;
          c.font = "bold 12px monospace";
          c.textAlign = "center";
          c.fillText("TOAST", 0, 0);
        });
        hatch(284, 266, 9);
        break;
      }
      case 1: {
        shadow(300, 291, 110);
        star(138, 161, 17, paper);
        star(455, 143, 12, red);
        for (let i = 0; i < 11; i++) {
          const f = (beat * 0.48 + i * 0.173) % 1,
            x = 294 + Math.sin(i * 14.6) * (30 + 100 * f),
            y = 202 - 150 * Math.sin(Math.PI * f);
          at(x, y, i + f * 4, () => {
            oval(-5, 0, 9, 8, paper);
            oval(4, -5, 9, 8, paper);
            oval(6, 5, 8, 7, paper);
            oval(1, 2, 3, 3, gold, null);
          });
        }
        poly(
          [
            [207, 172],
            [390, 172],
            [368, 281],
            [231, 281],
          ],
          paper,
        );
        for (let i = 0; i < 4; i++)
          poly(
            [
              [218 + i * 44, 175],
              [240 + i * 41, 175],
              [251 + i * 33, 278],
              [237 + i * 33, 278],
            ],
            red,
            null,
          );
        oval(300, 175, 93, 13, paper);
        face(299, 227, 1.25);
        break;
      }
      case 2: {
        cloud(105, 83, 0.65);
        cloud(501, 95, 0.75);
        hills();
        line(142, 40, 451, 40, ink, 11);
        line(300, 40, 300, 71, ink, 6);
        at(300, 75, 0.34 * Math.cos(phase * tau) * Math.exp(-phase * 2), () => {
          oval(0, 125, 15, 17, red);
          path(
            "M -77 120 Q -55 104 -54 68 Q -55 13 -18 5 Q 0 -5 19 5 Q 56 18 55 66 Q 56 106 77 120 Z",
            gold,
          );
          oval(0, 120, 77, 9, "#c79049");
          line(41, 39, 46, 62, paper, 6);
          line(0, 137, 0, 180, ink, 3);
          oval(0, 189, 12, 13, null, ink, 5);
        });
        break;
      }
      case 3: {
        cloud(116, 69, 0.75);
        cloud(444, 82, 1);
        hills();
        line(-10, 173, 610, 46, ink, 6);
        const x = 185 + (beat % 8) * 28,
          y = 173 - x * 0.203;
        at(x, y, 0, () => {
          oval(0, -3, 9, 9, paper);
          line(0, 6, 0, 37, ink, 6);
          rect(-60, 33, 120, 74, 15, red);
          rect(-49, 43, 98, 38, 8, paper);
          line(0, 42, 0, 82);
          face(-23, 60, 0.55);
          face(25, 60, 0.55);
          line(-44, 94, 44, 94, paper, 3);
        });
        break;
      }
      case 4: {
        cloud(107, 93, 0.7);
        cloud(502, 106, 0.55);
        shadow(300, 298, 63);
        line(300, 135, 300, 290, ink, 10);
        line(299, 135, 299, 288, "#d89751", 5);
        at(300, 136, beat * 1.56 + 0.12 * arc, () => {
          for (const color of [red, teal, paper, "#538a9b"]) {
            poly(
              [
                [0, 0],
                [6, -90],
                [72, -80],
                [51, -33],
              ],
              color,
            );
            poly(
              [
                [0, 0],
                [72, -80],
                [50, -28],
              ],
              "#24352a30",
              ink,
              1.5,
            );
            c.rotate(Math.PI / 2);
          }
          oval(0, 0, 9, 9, gold);
        });
        break;
      }
      case 5: {
        cloud(106, 80, 0.7);
        oval(464, 70, 27, 27, gold);
        rays(464, 70, 10, 34);
        rect(-5, 218, 610, 120, 0, teal, null);
        for (let i = 0; i < 12; i++) {
          const x = ((((i * 81 - beat * 14) % 660) + 660) % 660) - 20;
          path(
            "M " + x + " " + (246 + (i % 3) * 24) + " q 12 7 25 0",
            null,
            paper,
            3,
          );
        }
        at(308 + arc * 7, 219 + wave * 4, 0.035 * wave, () => {
          line(0, -145, 0, 6, ink, 5);
          path("M -5 -134 Q -75 -88 -87 -15 L -5 -15 Z", paper);
          path("M 5 -120 Q 66 -65 81 -15 L 5 -15 Z", red);
          poly(
            [
              [1, -146],
              [40, -137],
              [1, -129],
            ],
            gold,
          );
          poly(
            [
              [-102, -3],
              [103, -3],
              [77, 24],
              [-68, 24],
            ],
            "#477f82",
          );
          oval(0, 10, 4, 4, paper);
          oval(25, 10, 4, 4, paper);
        });
        break;
      }
      case 6: {
        shadow(300, 292, 90);
        rect(228, 108, 143, 152, 7, "#c68a50");
        poly(
          [
            [201, 126],
            [300, 41],
            [397, 126],
          ],
          red,
        );
        poly(
          [
            [221, 117],
            [300, 55],
            [378, 117],
          ],
          paper,
        );
        rect(271, 124, 57, 57, 23, ink);
        at(300, 155 - 16 * pulse, 0, () => bird(0, 0, 0.6 + pulse * 0.25));
        oval(300, 216, 27, 27, paper);
        line(300, 216, 300, 198);
        line(300, 216, 312, 221);
        line(271, 258, 271, 284);
        oval(271, 286, 6, 10, gold);
        line(327, 257, 327, 276);
        oval(327, 278, 6, 10, gold);
        break;
      }
      case 7: {
        shadow(300, 288, 81);
        star(156, 117, 16, gold);
        star(436, 100, 11);
        bird(300, 197 - 47 * pulse, 1.45);
        at(298, 145 - 78 * pulse, -0.19 * pulse, () => {
          path(
            "M -66 0 Q -52 -68 -3 -75 Q 50 -72 65 0 L 42 -14 L 22 4 L 1 -14 L -22 4 L -45 -15 Z",
            paper,
          );
          hatch(-22, -34, 4);
        });
        path(
          "M 224 177 L 248 195 L 268 173 L 289 199 L 313 177 L 337 195 L 371 173 Q 386 270 301 280 Q 226 279 224 177 Z",
          paper,
        );
        oval(261, 230, 8, 5, "#e9b298", null);
        oval(281, 253, 4, 3, "#e9b298", null);
        break;
      }
      case 8: {
        shadow(300, 284, 135);
        line(344, 131, 431, 49, ink, 5);
        oval(433, 48, 5, 5, paper);
        rect(232, 96, 107, 48, 12, null, ink, 9);
        rect(160, 121, 280, 148, 14, red);
        rect(174, 135, 252, 118, 9, "#e98061");
        rect(186, 150, 133, 84, 5, ink);
        for (let j = 0; j < 7; j++)
          for (let i = 0; i < 14; i++)
            oval(193 + i * 9, 159 + j * 11, 1.6, 1.6, paper, null);
        rect(334, 149, 76, 27, 3, paper);
        for (let i = 0; i < 8; i++)
          line(340 + i * 9, 154, 340 + i * 9, 161, ink, 1);
        line(345 + 22 * (1 + wave), 151, 345 + 22 * (1 + wave), 171, red, 3);
        at(371, 211, beat * Math.PI, () => {
          oval(0, 0, 23, 23, paper);
          line(0, 0, 0, -15, ink, 5);
        });
        break;
      }
      case 9: {
        shadow(300, 292, 83);
        oval(300, 106, 70, 67, "#c6e2d6");
        for (let i = 0; i < 10; i++) {
          const x = 300 + Math.sin(i * 18) * ((i % 4) * 7 + 10),
            y = 119 + (i % 3) * 12;
          oval(x, y, 12, 12, [red, gold, teal][i % 3]);
        }
        rect(261, 40, 78, 12, 6, red);
        poly(
          [
            [244, 163],
            [355, 163],
            [373, 280],
            [228, 280],
          ],
          red,
        );
        rect(262, 188, 77, 31, 14, paper);
        at(300, 202, beat * Math.PI, () => line(-13, 0, 13, 0, ink, 7));
        rect(266, 236, 68, 29, 9, ink);
        oval(
          289 + phase * 51,
          246 + Math.sin(phase * 2) * 26,
          10,
          10,
          [gold, teal, paper][Math.floor(beat) % 3],
        );
        break;
      }
      case 10: {
        oval(457, 69, 26, 26, paper);
        for (let i = 0; i < 10; i++) {
          const height = 48 + ((i * 37) % 69);
          rect(i * 65 - 16, 167 - height, 58, height, 0, i % 2 ? teal : rose);
          for (let j = 0; j < 3; j++)
            rect(i * 65 - 8 + j * 15, 175 - height, 7, 15, 0, paper, ink, 1);
        }
        poly(
          [
            [0, 166],
            [600, 166],
            [600, 330],
            [0, 330],
          ],
          "#657970",
        );
        for (let i = 0; i < 5; i++) {
          let t = ((i + beat * 0.66) % 5) / 5;
          let y = 167 + t * t * 174;
          let half = 44 + t * 178;
          poly(
            [
              [300 - half, y],
              [300 + half, y],
              [314 + half, y + 4 + t * 19],
              [286 - half, y + 4 + t * 19],
            ],
            paper,
            null,
          );
        }
        rect(86, 83, 12, 91, 2, ink);
        rect(73, 59, 38, 61, 8, ink);
        oval(92, 75, 8, 8, red);
        oval(92, 101, 8, 8, green);
        break;
      }
      case 11: {
        cloud(102, 70, 0.7);
        cloud(465, 63, 0.5);
        hills();
        path(
          "M 291 187 Q 225 209 243 221 Q 310 239 92 330 L 519 330 Q 347 258 368 238 Q 383 216 310 188 Z",
          blue,
        );
        for (let i = 0; i < 6; i++) {
          const t = ((i + beat * 0.7) % 6) / 6,
            x = 300 + Math.sin(i * 2.9) * 65 * t;
          oval(x, 191 + t * t * 146, 9 + 36 * t, 3 + 11 * t, "#819785");
        }
        const ripple = 8 + phase * 18;
        oval(327, 282, ripple, ripple * 0.27, null, paper, 2);
        break;
      }
    }
  }
  return { paint };
})();
