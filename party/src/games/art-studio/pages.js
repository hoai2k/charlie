// Art Studio coloring pages: procedural line art drawn once into a
// transparent canvas (navy lines, alpha = ink). Shapes are drawn as white
// fills with outlines in painter's order and then the white is keyed out,
// so overlapping shapes leave clean outlines and every region is closed
// (the fill bucket treats the ink as walls).
export const CW = 1600, CH = 900;
const INK = '#24163f';
const TAU = Math.PI * 2;

export const PAGES = [
  { id: 'blank', name: 'Blank Paper' },
  { id: 'castle', name: 'Castle' },
  { id: 'unicorn', name: 'Unicorn' },
  { id: 'garden', name: 'Rainbow Garden' },
];

function setInk(g, w = 8) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.fillStyle = '#fff'; }
/** Fill + outline one closed shape. */
function shape(g, build, w = 8) { setInk(g, w); g.beginPath(); build(g); g.closePath(); g.fill(); g.stroke(); }
/** Union of shapes with one clean outer outline. */
function union(g, builds, w = 8) {
  setInk(g, w * 2);
  for (const b of builds) { g.beginPath(); b(g); g.closePath(); g.stroke(); }
  for (const b of builds) { g.beginPath(); b(g); g.closePath(); g.fill(); }
}
function line(g, build, w = 8) { setInk(g, w); g.beginPath(); build(g); g.stroke(); }
const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
const ell = (x, y, rx, ry, rot = 0) => (g) => g.ellipse(x, y, rx, ry, rot, 0, TAU);
const rect = (x, y, w, h) => (g) => g.rect(x, y, w, h);
const rrect = (x, y, w, h, r) => (g) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); };

function cloud(g, x, y, s) {
  union(g, [circ(x - 60 * s, y + 10 * s, 40 * s), circ(x - 15 * s, y - 18 * s, 55 * s), circ(x + 45 * s, y, 45 * s), circ(x + 85 * s, y + 18 * s, 30 * s), rrect(x - 95 * s, y + 5 * s, 205 * s, 45 * s, 22 * s)]);
}
function sun(g, x, y, r, face = true) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    shape(g, (c) => { c.moveTo(x + Math.cos(a - 0.12) * (r + 12), y + Math.sin(a - 0.12) * (r + 12)); c.lineTo(x + Math.cos(a) * (r + 52), y + Math.sin(a) * (r + 52)); c.lineTo(x + Math.cos(a + 0.12) * (r + 12), y + Math.sin(a + 0.12) * (r + 12)); });
  }
  shape(g, circ(x, y, r));
  if (face) {
    setInk(g, 7);
    g.beginPath(); g.arc(x - r * 0.32, y - r * 0.12, r * 0.12, Math.PI, 0); g.stroke();
    g.beginPath(); g.arc(x + r * 0.32, y - r * 0.12, r * 0.12, Math.PI, 0); g.stroke();
    g.beginPath(); g.arc(x, y + r * 0.12, r * 0.38, 0.25, Math.PI - 0.25); g.stroke();
  }
}
function star(g, x, y, r) {
  shape(g, (c) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } }, 6);
}
function heart(g, x, y, s) {
  shape(g, (c) => { c.moveTo(x, y + s * 0.35); c.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45); c.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35); }, 6);
}
function flower(g, x, y, r, stemTo) {
  if (stemTo) {
    shape(g, rrect(x - 9, y, 18, stemTo - y, 8), 7);
    shape(g, ell(x - 34, y + (stemTo - y) * 0.55, 34, 15, -0.5), 7);
    shape(g, ell(x + 34, y + (stemTo - y) * 0.4, 34, 15, 0.5), 7);
  }
  const petals = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; petals.push(circ(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.55)); }
  union(g, petals, 7);
  setInk(g, 7);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + TAU / 12; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4); g.lineTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05); g.stroke(); }
  shape(g, circ(x, y, r * 0.45), 7);
}
function butterfly(g, x, y, s) {
  for (const sx of [-1, 1]) {
    shape(g, ell(x + sx * 34 * s, y - 18 * s, 34 * s, 26 * s, sx * 0.5), 6);
    shape(g, ell(x + sx * 26 * s, y + 20 * s, 22 * s, 17 * s, -sx * 0.4), 6);
  }
  shape(g, ell(x, y, 9 * s, 34 * s), 6);
  line(g, (c) => { c.moveTo(x - 3 * s, y - 32 * s); c.quadraticCurveTo(x - 14 * s, y - 56 * s, x - 22 * s, y - 58 * s); c.moveTo(x + 3 * s, y - 32 * s); c.quadraticCurveTo(x + 14 * s, y - 56 * s, x + 22 * s, y - 58 * s); }, 5);
}
function rainbow(g, cx, cy, r0, r1, bands) {
  const step = (r1 - r0) / bands;
  for (let i = 0; i < bands; i++) {
    const ro = r1 - i * step, ri = ro - step;
    shape(g, (c) => { c.arc(cx, cy, ro, Math.PI, TAU); c.lineTo(cx + ri, cy); c.arc(cx, cy, ri, TAU, Math.PI, true); });
  }
}
function ground(g, y0, y1, amp = 30) {
  shape(g, (c) => { c.moveTo(-20, CH + 20); c.lineTo(-20, y0); c.bezierCurveTo(400, y0 - amp, 900, y1 + amp, CW + 20, y1); c.lineTo(CW + 20, CH + 20); });
}

function castle(g) {
  sun(g, 1400, 150, 70);
  cloud(g, 230, 150, 1.0); cloud(g, 1050, 110, 0.75);
  ground(g, 760, 740, 40);
  // middle tall tower (behind)
  union(g, [rect(705, 190, 190, 260), rect(705, 165, 40, 30), rect(780, 165, 40, 30), rect(855, 165, 40, 30)]);
  shape(g, (c) => { c.moveTo(690, 190); c.lineTo(800, 40); c.lineTo(910, 190); });
  // main wall with battlements
  const tops = []; for (let x = 470; x < 1130; x += 70) tops.push(rect(x, 360, 40, 34));
  union(g, [rect(470, 390, 660, 410), ...tops]);
  // side towers
  for (const tx of [380, 1080]) {
    const bt = []; for (let k = 0; k < 3; k++) bt.push(rect(tx + 4 + k * 52, 225, 36, 32));
    union(g, [rect(tx, 255, 160, 545), ...bt]);
    shape(g, (c) => { c.moveTo(tx - 20, 255); c.lineTo(tx + 80, 70); c.lineTo(tx + 180, 255); });
    line(g, (c) => { c.moveTo(tx + 80, 70); c.lineTo(tx + 80, 20); }, 6);
    shape(g, (c) => { c.moveTo(tx + 80, 20); c.lineTo(tx + 140, 34); c.lineTo(tx + 80, 48); }, 6);
    shape(g, (c) => { c.moveTo(tx + 50, 470); c.lineTo(tx + 50, 420); c.arc(tx + 80, 420, 30, Math.PI, 0); c.lineTo(tx + 110, 470); }, 7);
    shape(g, (c) => { c.moveTo(tx + 50, 650); c.lineTo(tx + 50, 600); c.arc(tx + 80, 600, 30, Math.PI, 0); c.lineTo(tx + 110, 650); }, 7);
  }
  line(g, (c) => { c.moveTo(800, 40); c.lineTo(800, -10); }, 6);
  shape(g, (c) => { c.moveTo(800, 2); c.lineTo(860, 16); c.lineTo(800, 30); }, 6);
  shape(g, circ(800, 300, 45), 7);
  // windows + door
  for (const wx of [560, 1040]) shape(g, (c) => { c.moveTo(wx - 35, 560); c.lineTo(wx - 35, 500); c.arc(wx, 500, 35, Math.PI, 0); c.lineTo(wx + 35, 560); }, 7);
  shape(g, (c) => { c.moveTo(720, 800); c.lineTo(720, 640); c.arc(800, 640, 80, Math.PI, 0); c.lineTo(880, 800); });
  line(g, (c) => { c.moveTo(800, 562); c.lineTo(800, 800); }, 6);
  // path
  shape(g, (c) => { c.moveTo(720, 800); c.bezierCurveTo(700, 850, 620, 880, 560, 910); c.lineTo(1040, 910); c.bezierCurveTo(980, 880, 900, 850, 880, 800); }, 7);
  for (const [x, y] of [[180, 820], [300, 860], [1300, 830], [1450, 860]]) flower(g, x, y, 22, null);
  star(g, 300, 400, 30); star(g, 1300, 420, 26); heart(g, 160, 560, 60); heart(g, 1450, 600, 56);
}

function unicorn(g) {
  rainbow(g, 800, 760, 470, 720, 5);
  cloud(g, 150, 690, 1.1); cloud(g, 1450, 690, 1.1);
  ground(g, 760, 770, 25);
  // tail
  union(g, [ell(470, 470, 70, 110, 0.5), ell(420, 560, 60, 95, 0.2), ell(455, 650, 45, 70, -0.3)]);
  // back legs
  shape(g, rrect(545, 560, 58, 245, 26)); shape(g, rrect(625, 575, 58, 230, 26));
  // body + neck + head (one silhouette)
  const neck = (c) => { c.moveTo(860, 470); c.quadraticCurveTo(900, 330, 960, 270); c.lineTo(1060, 300); c.quadraticCurveTo(1010, 420, 1000, 540); };
  union(g, [ell(760, 520, 250, 130), neck, ell(1055, 290, 105, 78, 0.35), ell(1125, 345, 62, 50, 0.35)]);
  // front legs
  shape(g, rrect(860, 580, 58, 225, 26)); shape(g, rrect(940, 565, 58, 240, 26));
  for (const lx of [545, 625, 860, 940]) line(g, (c) => { c.moveTo(lx + 4, 775); c.lineTo(lx + 54, 775); }, 6);
  // mane
  union(g, [circ(990, 205, 42), circ(945, 255, 44), circ(915, 320, 44), circ(895, 390, 42), circ(880, 455, 38)]);
  // ear + horn
  shape(g, (c) => { c.moveTo(1015, 220); c.lineTo(1030, 150); c.lineTo(1065, 215); });
  shape(g, (c) => { c.moveTo(1060, 215); c.lineTo(1170, 70); c.lineTo(1100, 232); });
  line(g, (c) => { for (let k = 1; k < 4; k++) { const u = k / 4; c.moveTo(1060 + 110 * u, 215 - 145 * u + 10); c.lineTo(1100 + 70 * u, 232 - 162 * u - 6); } }, 5);
  // face
  line(g, (c) => { c.arc(1065, 290, 18, 0.2, Math.PI - 0.2); }, 6);
  line(g, (c) => { c.moveTo(1052, 302); c.lineTo(1044, 312); c.moveTo(1066, 307); c.lineTo(1064, 318); c.moveTo(1080, 304); c.lineTo(1086, 314); }, 5);
  shape(g, circ(1150, 350, 7), 5);
  line(g, (c) => { c.arc(1120, 362, 22, 0.4, Math.PI - 0.6); }, 6);
  shape(g, ell(1075, 345, 22, 14, 0.3), 5);
  // decorations
  star(g, 250, 180, 44); star(g, 1360, 160, 38); star(g, 620, 130, 30); star(g, 1450, 420, 30);
  heart(g, 330, 420, 70); heart(g, 1300, 500, 64);
  for (const [x, y] of [[250, 840], [700, 870], [1150, 860], [1420, 830]]) flower(g, x, y, 24, null);
}

function garden(g) {
  sun(g, 170, 160, 85);
  rainbow(g, 1150, 520, 260, 470, 5);
  cloud(g, 860, 470, 0.9); cloud(g, 1450, 470, 0.9);
  cloud(g, 520, 140, 0.8);
  ground(g, 640, 600, 30);
  // mushroom house
  shape(g, rrect(1210, 600, 170, 230, 30));
  shape(g, (c) => { c.moveTo(1150, 620); c.bezierCurveTo(1150, 440, 1440, 440, 1440, 620); c.quadraticCurveTo(1295, 650, 1150, 620); });
  for (const [x, y, r] of [[1230, 560, 26], [1300, 515, 22], [1370, 560, 24]]) shape(g, circ(x, y, r), 7);
  shape(g, (c) => { c.moveTo(1265, 830); c.lineTo(1265, 750); c.arc(1295, 750, 30, Math.PI, 0); c.lineTo(1325, 830); }, 7);
  shape(g, circ(1295, 680, 26), 7);
  line(g, (c) => { c.moveTo(1269, 680); c.lineTo(1321, 680); c.moveTo(1295, 654); c.lineTo(1295, 706); }, 5);
  // flowers
  const fl = [[170, 560, 52, 860], [420, 520, 60, 870], [700, 600, 48, 880], [930, 560, 56, 875], [1530, 640, 40, 880]];
  for (const [x, y, r, s] of fl) flower(g, x, y, r, s);
  butterfly(g, 560, 300, 1.2); butterfly(g, 1000, 230, 0.9);
  for (const [x, y] of [[300, 780], [820, 800], [1120, 790]]) { line(g, (c) => { c.moveTo(x - 20, y + 30); c.quadraticCurveTo(x - 10, y, x - 22, y - 20); c.moveTo(x, y + 30); c.quadraticCurveTo(x + 4, y - 5, x + 2, y - 30); c.moveTo(x + 20, y + 30); c.quadraticCurveTo(x + 14, y, x + 26, y - 18); }, 6); }
  star(g, 720, 90, 30); star(g, 1500, 110, 28); heart(g, 330, 330, 54);
}

const cache = new Map();
/** The page's line-art canvas (null for blank), cached. */
export function pageCanvas(id) {
  if (id === 'blank') return null;
  if (cache.has(id)) return cache.get(id);
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, CW, CH);
  if (id === 'castle') castle(g); else if (id === 'unicorn') unicorn(g); else if (id === 'garden') garden(g);
  const img = g.getImageData(0, 0, CW, CH), d = img.data;
  const alpha = new Uint8Array(CW * CH);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const a = Math.min(255, Math.round((255 - lum) * 1.25));
    d[i] = 36; d[i + 1] = 22; d[i + 2] = 63; d[i + 3] = a; alpha[j] = a;
  }
  g.putImageData(img, 0, 0);
  const entry = { canvas: c, alpha, regions: labelRegions(alpha) };
  cache.set(id, entry);
  return entry;
}

/** Connected areas between the lines: [{ x, y, size }] (a sample pixel each). */
function labelRegions(alpha) {
  const seen = new Uint8Array(CW * CH);
  const out = [];
  for (let start = 0; start < alpha.length; start += 7) {
    if (seen[start] || alpha[start] > 90) continue;
    const stack = [start];
    seen[start] = 1;
    let size = 0, sx = 0, sy = 0;
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % CW;
      if (size % 97 === 1) { sx = x; sy = (p - x) / CW; }
      if (x > 0 && !seen[p - 1] && alpha[p - 1] <= 90) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < CW - 1 && !seen[p + 1] && alpha[p + 1] <= 90) { seen[p + 1] = 1; stack.push(p + 1); }
      if (p >= CW && !seen[p - CW] && alpha[p - CW] <= 90) { seen[p - CW] = 1; stack.push(p - CW); }
      if (p < alpha.length - CW && !seen[p + CW] && alpha[p + CW] <= 90) { seen[p + CW] = 1; stack.push(p + CW); }
    }
    if (size > 500) out.push({ x: sx, y: sy, size });
  }
  return out;
}
