// Every photograph is a separate exposure. Playback only selects a source rectangle.
const W = 512,
  H = 288;
const sceneNames = [
  "cucumber",
  "pepper",
  "nail",
  "blinds",
  "paper",
  "lamp",
  "ping-pong",
  "droplets",
  null,
  "burner",
  "shower",
  "zoom",
  "sponge",
  "book",
  "toothpaste",
  "button",
  "classroom",
  "dart",
  "shoulders",
  "drums",
  "karaoke",
  "sugar",
  "embers",
  "smile",
  "spindle",
  "warm-hands",
  "plea",
  null,
  "window",
  "window-wide",
];
const photos = sceneNames.map((name) => {
  if (!name) return null;
  const sheet = new Image();
  sheet.src = "projection/photos/" + name + ".webp";
  return sheet;
});
const atlasesReady = Promise.all([
  guideFramesReady,
  ...photos.filter(Boolean).map((sheet) => sheet.decode()),
]);

const cumulative = new Set([1, 2, 3, 4, 14, 16, 21]);
const alternating = new Set([20, 24, 25]);
function photoFrame(key, seconds) {
  const local = Math.max(0, seconds);
  const phase = local % 1;
  // Four downward strokes. Progress stops while the hand reaches up again.
  if (cumulative.has(key)) {
    const progress = Math.min(1, Math.max(0, (phase - 0.125) / 0.375));
    return Math.min(5, Math.round((Math.floor(local) + progress) * 1.25));
  }
  if (key === 5) {
    const order = [0, 0, 1, 2, 3, 4, 5, 5];
    const frame = order[Math.min(7, Math.floor(phase * 8))];
    return Math.floor(local) % 2 ? 5 - frame : frame;
  }
  if (key === 18 || key === 19) {
    // Frames 0 and 4 land on the right; frame 2 lands on the left.
    const right = Math.floor(local) % 2 ? 4 : 0;
    return [right, 5, 1, 1, 2, 2, 3, 3][Math.floor(phase * 8)];
  }
  if (alternating.has(key)) {
    const cycle = key === 24 || key === 25 ? 0.5 : 1;
    return Math.floor(((local % cycle) / cycle) * 6);
  }
  const id = Math.floor(key / 3);
  const period = gesturePeriod(id);
  const position = (local % period) / period;
  // Contact is the fourth exposure for strikes. Follow-through is visible before reset.
  if ([0, 6, 7, 13, 15, 17, 22].includes(key))
    return [0, 0, 1, 2, 3, 4, 5, 5][Math.floor(position * 8)];
  // Dialling, waving and squeezing play back and forth around the accented beat.
  return Math.round((1 - Math.abs(2 * position - 1)) * 5);
}

const stagePhoto = document.createElement("canvas");
stagePhoto.width = W;
stagePhoto.height = H;
const panel = stagePhoto.getContext("2d");
function objectFrame(id, scene, local) {
  const key = id * 3 + scene;
  const sheet = photos[key];
  if (sheet) {
    const frame = photoFrame(key, local);
    const w = sheet.naturalWidth / 3,
      h = sheet.naturalHeight / 2;
    panel.drawImage(
      sheet,
      (frame % 3) * w,
      Math.floor(frame / 3) * h,
      w,
      h,
      0,
      0,
      W,
      H,
    );
  } else {
    panel.save();
    // The two screen graphics were authored in a 512 × 341 coordinate space.
    panel.scale(1, H / 341);
    drawGraphic(panel, key, local);
    panel.restore();
  }
  return stagePhoto;
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
function drawGraphic(c, key, t) {
  const H = 341;
  const beat = (1 - Math.cos(t * 2 * Math.PI)) / 2;
  if (key === 8) {
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
    return;
  }
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
    line(c, 0, hash(i) * H, edge, hash(i) * H + 3, 2, "rgba(220,225,205,.045)");
}
