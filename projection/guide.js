// Each exposure is an individually illustrated pose. Use the exhibition clock so
// both side screens and the projected object hold the same beat when seeking.
function loadFrameSheet(name) {
  const sheet = new Image();
  sheet.src = "projection/frames/" + name + ".webp";
  return sheet;
}
const gestureSheets = [
  "chop-pull",
  "flick-turn",
  "squeeze-point",
  "tap-shake",
  "rub-wave",
].map(loadFrameSheet);
const returnSheet = loadFrameSheet("recovery");
const guideFramesReady = Promise.all(
  [...gestureSheets, returnSheet].map((sheet) => sheet.decode()),
);
const openAndClose = [0, 0, 1, 2, 3, 3, 2, 1];
const alternate = [0, 0, 1, 1, 2, 2, 3, 3];
const flick = [0, 0, 1, 2, 3, 3, 1, 0];

function guideExposure(id, time) {
  if (id < 0) return { sheet: returnSheet, column: 0, row: 0 };
  const period = gesturePeriod(id);
  const step = Math.floor(((time % period) * 8) / period);
  const row = id % 2;
  if (id < 2) {
    return {
      sheet: time % 1 < 0.625 ? gestureSheets[0] : returnSheet,
      column:
        time % 1 < 0.625
          ? [0, 0, 1, 2, 3][step]
          : Math.min(3, Math.floor(((time % 1) - 0.625) / 0.09375)),
      row,
    };
  }
  const cycle =
    id === 6 || id === 8 ? alternate : id === 2 ? flick : openAndClose;
  return { sheet: gestureSheets[Math.floor(id / 2)], column: cycle[step], row };
}

function drawGuide(c, id, time, x, y, width, height) {
  const { sheet, column, row } = guideExposure(id, time);
  if (!sheet.complete || !sheet.naturalWidth) return;
  const cellWidth = sheet.naturalWidth / 4,
    cellHeight = sheet.naturalHeight / 2;
  const scale = Math.min(width / cellWidth, height / cellHeight);
  const w = cellWidth * scale,
    h = cellHeight * scale;
  c.save();
  c.globalCompositeOperation = "lighten";
  c.drawImage(
    sheet,
    column * cellWidth,
    row * cellHeight,
    cellWidth,
    cellHeight,
    x + (width - w) / 2,
    y + height - h,
    w,
    h,
  );
  c.restore();
}
