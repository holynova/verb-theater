// Solve a homography from a measured projection quadrilateral in a 426 × 240 preview.
const angles = {
  left: [
    [80, 55],
    [290, 28],
    [290, 177],
    [80, 165],
  ],
  right: [
    [137, 30],
    [346, 52],
    [346, 160],
    [137, 180],
  ],
  last: [
    [141, 30],
    [350, 52],
    [350, 159],
    [141, 180],
  ],
  front: [
    [0, 0],
    [426, 0],
    [426, 240],
    [0, 240],
  ],
};
function perspective(points, width, height) {
  const target = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ],
    rows = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = points[i],
      [u, v] = target[i];
    rows.push(
      [x, y, 1, 0, 0, 0, -x * u, -y * u, u],
      [0, 0, 0, x, y, 1, -x * v, -y * v, v],
    );
  }
  for (let i = 0; i < 8; i++) {
    let pivot = i;
    for (let k = i + 1; k < 8; k++)
      if (Math.abs(rows[k][i]) > Math.abs(rows[pivot][i])) pivot = k;
    [rows[i], rows[pivot]] = [rows[pivot], rows[i]];
    const d = rows[i][i];
    for (let j = i; j <= 8; j++) rows[i][j] /= d;
    for (let k = 0; k < 8; k++) {
      if (k === i) continue;
      const f = rows[k][i];
      for (let j = i; j <= 8; j++) rows[k][j] -= f * rows[i][j];
    }
  }
  const [a, b, c, d, e, f, g, h] = rows.map((r) => r[8]);
  return (
    "matrix3d(" +
    [a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].join(",") +
    ")"
  );
}
