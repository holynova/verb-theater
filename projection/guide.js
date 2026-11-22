// Pose coordinates are drawn in a 240 by 240 practice window.
const gesturePaths = {
  fist: "M -13 13 Q -25 4 -24 -8 Q -26 -16 -20 -19 Q -18 -25 -12 -23 Q -8 -28 -2 -24 Q 4 -27 10 -21 Q 20 -20 22 -10 Q 26 -4 21 5 L 12 17 M -21 -17 Q -12 -16 -6 -10 M -14 -21 L -1 -14 M -4 -23 L 7 -17 M 15 -13 Q 7 -16 2 -9 Q 1 -5 7 -5 L 15 -6",
  point:
    "M -12 15 Q -19 7 -16 -2 L -9 -18 L -4 -43 Q -3 -51 2 -49 Q 6 -48 5 -41 L 3 -20 Q 9 -23 12 -17 Q 19 -18 20 -12 Q 27 -10 23 -1 L 13 16 M 4 -19 L 2 -12 M 12 -16 L 10 -10",
  open: "M -13 14 Q -24 6 -25 -3 L -33 -18 Q -35 -23 -31 -23 L -17 -11 L -24 -33 Q -25 -39 -21 -38 L -9 -17 L -14 -40 Q -14 -46 -10 -44 L -2 -20 L -2 -44 Q 0 -49 3 -45 L 7 -19 L 11 -36 Q 13 -41 16 -37 L 14 -9 Q 22 -20 28 -19 Q 31 -17 26 -12 L 13 12",
  pinch:
    "M -12 16 Q -20 10 -21 3 Q -29 2 -25 -4 Q -30 -7 -24 -13 Q -26 -19 -18 -20 L -6 -27 Q -2 -30 3 -26 L 16 -17 Q 22 -15 23 -8 L 15 16 M -22 -13 L -9 -17 L -2 -13 M -17 -19 L -6 -23 L 1 -19 M -20 -5 L -9 -9 M 9 -12 Q 6 -20 0 -17 Q -4 -13 0 -9 L 8 -4",
  turn: "M -14 15 Q -22 5 -20 -5 L -22 -23 Q -21 -27 -18 -26 L -13 -12 L -14 -30 Q -12 -36 -9 -31 L -5 -15 L -3 -32 Q 0 -37 2 -31 L 3 -17 L 10 -29 Q 14 -32 15 -27 L 12 -11 Q 18 -18 22 -14 Q 25 -11 20 -5 L 12 13",
  side: "M -11 16 Q -17 8 -13 -7 L -4 -39 Q -2 -47 1 -44 L -1 -21 L 5 -43 Q 8 -48 10 -42 L 6 -17 Q 15 -25 18 -21 Q 19 -18 14 -11 L 10 13",
};
const guidePaths = Object.fromEntries(
  Object.entries(gesturePaths).map(([k, d]) => [k, new Path2D(d)]),
);
function strokePath(c, d) {
  c.stroke(new Path2D(d));
}
function torso(c) {
  strokePath(
    c,
    "M 48 247 Q 49 212 61 199 Q 70 190 95 184 Q 109 181 108 169 Q 109 159 103 146 Q 98 130 101 116 Q 103 100 115 95 Q 130 88 139 102 Q 147 114 141 137 Q 137 151 132 163 Q 128 177 140 182 Q 167 189 179 200 Q 190 214 191 247",
  );
}
function floatingHand(c, x, y, angle, shape, bottom = 264) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.stroke(guidePaths[shape]);
  const length = Math.max(84, bottom - y + 62);
  strokePath(
    c,
    "M -13 13 Q -12 36 -17 " + length + " M 12 15 Q 9 42 18 " + length,
  );
  c.restore();
}
function raisedArm(c, side, lift, wave = false) {
  c.save();
  c.translate(122, 193);
  c.scale(side, 1);
  if (!wave) {
    const ex = 48 + 9 * lift,
      ey = -37 + 24 * lift,
      wx = 23 + 3 * lift,
      wy = -104 + 71 * lift;
    const arm = new Path2D(
      "M 4 1 Q 17 -5 " +
        (ex - 9) +
        " " +
        (ey - 2) +
        " Q " +
        (ex - 15) +
        " " +
        (ey - 22) +
        " " +
        (wx - 5) +
        " " +
        (wy + 6) +
        " L " +
        (wx + 5) +
        " " +
        (wy + 1) +
        " Q " +
        (ex + 11) +
        " " +
        (ey - 15) +
        " " +
        (ex + 12) +
        " " +
        ey +
        " Q " +
        (ex + 14) +
        " " +
        (ey + 11) +
        " 23 24 Q 10 36 0 37",
    );
    c.fillStyle = "#030303";
    c.fill(arm);
    c.stroke(arm);
    c.translate(wx, wy);
    c.rotate(-0.24);
    c.scale(0.34, 0.38);
    c.fill(guidePaths.fist);
    c.stroke(guidePaths.fist);
    c.restore();
    return;
  }
  const a = -0.92 + 1.85 * lift;
  c.rotate(a);
  c.fillStyle = "#030303";
  c.beginPath();
  c.moveTo(3, 9);
  c.quadraticCurveTo(18, -10, 24, -43);
  c.lineTo(28, -83);
  c.lineTo(48, -81);
  c.lineTo(45, -33);
  c.quadraticCurveTo(46, 2, 18, 34);
  c.fill();
  c.stroke();
  c.translate(39, -91);
  c.scale(0.64, 0.68);
  c.fill(guidePaths.open);
  c.stroke(guidePaths.open);
  c.restore();
}
function drawGuide(c, id, t) {
  const beat = t * Math.PI * 2,
    swing = (1 - Math.cos(beat)) / 2;
  c.lineWidth = 1.25;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.strokeStyle = "#f8f7f2";
  c.fillStyle = "#030303";
  switch (id) {
    case -1:
      torso(c);
      break;
    case 0:
      torso(c);
      raisedArm(c, 1, swing);
      break;
    case 1:
      floatingHand(c, 120, 110 + 103 * swing, -0.025, "fist");
      break;
    case 2: {
      const x = 42 + 152 * swing,
        y = 210 - 94 * swing;
      floatingHand(c, x, y, -1.17 + 0.57 * swing, "pinch", 325);
      break;
    }
    case 3:
      floatingHand(
        c,
        119,
        155,
        Math.sin(beat) * 0.57,
        swing > 0.55 ? "pinch" : "turn",
      );
      break;
    case 4:
      floatingHand(
        c,
        120,
        151 + 6 * swing,
        -0.11,
        swing > 0.48 ? "fist" : "turn",
      );
      break;
    case 5:
      floatingHand(
        c,
        120,
        151 + 20 * swing,
        -0.08,
        swing > 0.44 ? "fist" : "point",
      );
      break;
    case 6:
      torso(c);
      raisedArm(c, -1, swing);
      raisedArm(c, 1, 1 - swing);
      break;
    case 7:
      floatingHand(
        c,
        119 + 11 * Math.sin(beat * 2),
        147,
        0.5 * Math.sin(beat * 2),
        "fist",
      );
      break;
    case 8:
      floatingHand(c, 116, 160 + 8 * Math.sin(beat * 2), 0.28, "side");
      c.save();
      c.translate(240, 0);
      c.scale(-1, 1);
      floatingHand(c, 116, 160 - 8 * Math.sin(beat * 2), 0.28, "side");
      c.restore();
      break;
    case 9:
      torso(c);
      raisedArm(c, 1, swing, true);
      break;
  }
}
