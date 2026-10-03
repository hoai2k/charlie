// Cake Bakery: cake geometry, cached 2.5D body rendering, decorations and
// where dropped toppings land. Everything lives in "cake-local" units: origin
// at the center of the cake stand, +y down; a station draws it scaled by k.
import { RAINBOW } from '../../engine/particles.js';
import { starPath, drawSparkleShape, drawHeartShape } from '../../engine/emotes.js';
import { drawPortrait } from '../../engine/sprites.js';
import { art, drawArt } from '../../engine/art.js';
import { clamp, lerp, rand, pick, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
export const KY = 0.36;            // top-face squash (view angle)
const CACHE = { w: 580, h: 560, ox: 290, oy: 450 };

// --- shapes (unit polygons, width 1, centered) ---------------------------------
function circlePoly(n) { return Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [Math.cos(a) * 0.5, Math.sin(a) * 0.5]; }); }
function heartPoly(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    pts.push([16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const sx = Math.max(...xs) - Math.min(...xs), cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return pts.map(([x, y]) => [x / sx, ((y - cy) / sx) * 1.05]);
}
function starPoly() {
  return Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.31 : 0.54; return [Math.cos(a) * r, Math.sin(a) * r + 0.04]; });
}
function inPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function buildRange(poly) {
  const out = [];
  for (let k = 0; k <= 80; k++) {
    const u = -0.5 + k / 80;
    let lo = null, hi = null;
    for (let s = 0; s <= 80; s++) { const v = -0.62 + s * 0.0155; if (inPoly(poly, u, v)) { if (lo === null) lo = v; hi = v; } }
    out.push(lo === null ? null : [lo, hi]);
  }
  return out;
}
/** Points evenly spaced along the outline. */
function samplePoly(poly, count) {
  const seg = poly.map((p, i) => { const q = poly[(i + 1) % poly.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
  const total = seg.reduce((a, b) => a + b, 0);
  const out = [];
  let i = 0, acc = 0;
  for (let k = 0; k < count; k++) {
    const d = (k / count) * total;
    while (acc + seg[i] < d) { acc += seg[i]; i = (i + 1) % poly.length; }
    const p = poly[i], q = poly[(i + 1) % poly.length], f = (d - acc) / seg[i];
    out.push([lerp(p[0], q[0], f), lerp(p[1], q[1], f)]);
  }
  return out;
}

export const SHAPES = [
  { id: 'round', name: 'Round', poly: circlePoly(48) },
  { id: 'heart', name: 'Heart', poly: heartPoly(72) },
  { id: 'star', name: 'Star', poly: starPoly() },
  { id: 'tower', name: 'Tall Tower', poly: circlePoly(48), tower: true },
];
for (const s of SHAPES) { s.range = buildRange(s.poly); s.rim = samplePoly(s.poly, 44); }

export const FLAVORS = [
  { name: 'Vanilla', c: '#fff0c4', d: '#e8c98a' },
  { name: 'Chocolate', c: '#9a6440', d: '#6a3f24' },
  { name: 'Strawberry', c: '#ffaccd', d: '#e77aa4' },
  { name: 'Mint', c: '#aef0cc', d: '#6fcf9f' },
  { name: 'Blueberry', c: '#a9bfff', d: '#7489dd' },
  { name: 'Lemon', c: '#fff38a', d: '#e2c94a' },
  { name: 'Red Velvet', c: '#e8546b', d: '#b72d47' },
  { name: 'Rainbow', c: '#ffc4e6', d: '#d98ac0', rainbow: true },
];
export const FROSTINGS = [
  { name: 'Pink', c: '#ff9fd0', d: '#e070ad' },
  { name: 'Vanilla', c: '#fffaf0', d: '#e9dcc8' },
  { name: 'Chocolate', c: '#7a4a2e', d: '#57311c' },
  { name: 'Lavender', c: '#cfb0ff', d: '#a681ec' },
  { name: 'Sky Blue', c: '#a6e0ff', d: '#73bfe8' },
  { name: 'Mint', c: '#a5f2cd', d: '#6fd3a5' },
  { name: 'Lemon', c: '#fff29e', d: '#e8d164' },
  { name: 'Rainbow', c: '#ffd6ef', d: '#e6a8d3', rainbow: true },
];
export const STYLES = ['Smooth', 'Drips', 'Swirls'];
export const DRIZZLES = [
  { name: 'None' },
  { name: 'Chocolate', c: '#5a321c' },
  { name: 'Caramel', c: '#d98a2b' },
  { name: 'Strawberry', c: '#ff5c8a' },
  { name: 'White', c: '#ffffff' },
  { name: 'Rainbow', c: '#ff9fd8', rainbow: true },
];
export const DECOS = [
  { id: 'sprinkles', name: 'Sprinkles' },
  { id: 'cherry', name: 'Cherry' },
  { id: 'strawberry', name: 'Strawberry' },
  { id: 'star', name: 'Candy Star' },
  { id: 'heart', name: 'Candy Heart' },
  { id: 'flower', name: 'Sugar Flower' },
  { id: 'gummy', name: 'Gummy Bear' },
  { id: 'candle', name: 'Candle', topOnly: true },
  { id: 'unicorn', name: 'Unicorn Horn', topOnly: true },
  { id: 'topper', name: 'Me Topper!', topOnly: true },
];
export const DECO = Object.fromEntries(DECOS.map((d, i) => [d.id, i]));
export const CANDY = ['#ff4d6d', '#ffd23f', '#3fa7ff', '#36d17a', '#b36bff', '#ff8c3a', '#ff6fd0', '#25d0c8'];
const SPRINKLE_COLORS = ['#ff4d6d', '#ffd23f', '#3fa7ff', '#36d17a', '#b36bff', '#ffffff', '#ff8fd0', '#ff9f1c'];

export function newCake() {
  return { shape: 0, layers: 2, flavors: [0, 2, 0], frosting: 0, style: 0, drizzle: 0, decos: [], version: 0 };
}

export function layerGeom(cake, i) {
  const sh = SHAPES[cake.shape];
  const base = sh.tower ? 250 : 360, shrink = sh.tower ? 0.87 : 0.79, h = sh.tower ? 112 : 84;
  const yb = -8 - i * h;
  return { w: base * Math.pow(shrink, i), h, yb, yt: yb - h };
}
export const topLayer = (cake) => layerGeom(cake, cake.layers - 1);
function rangeAt(sh, u) { if (u < -0.5 || u > 0.5) return null; return sh.range[Math.round((u + 0.5) * 80)]; }

/** Top face y range [back, front] of layer i at local x (or null). */
export function faceRange(cake, i, x) {
  const sh = SHAPES[cake.shape], L = layerGeom(cake, i);
  const r = rangeAt(sh, x / L.w);
  if (!r) return null;
  return [L.yt + r[0] * L.w * KY, L.yt + r[1] * L.w * KY, L];
}

/**
 * Where does something dropped at (x, y) end up?
 * Returns { x, y, surface: 'top'|'side'|'plate'|'floor', layer }.
 * `exact` = keep the cursor depth when the cursor is over a top face.
 */
export function landing(cake, x, y, { topOnly = false, jitterDepth = false } = {}) {
  for (let i = cake.layers - 1; i >= 0; i--) {
    const fr = faceRange(cake, i, x);
    if (!fr) continue;
    const [back, front, L] = fr;
    const inset = (front - back) * 0.12;
    if (y <= front) {
      let ly;
      if (jitterDepth) ly = rand(back + inset, front - inset);
      else ly = y >= back + inset ? Math.min(y, front - inset) : lerp(back, front, 0.5);
      return { x, y: ly, surface: 'top', layer: i };
    }
    const sideBottom = L.yb + (front - L.yt);
    if (y <= sideBottom && !topOnly) return { x, y, surface: 'side', layer: i };
    if (y <= sideBottom && topOnly) break;
  }
  if (topOnly) {
    const T = topLayer(cake), i = cake.layers - 1;
    const cx = clamp(x, -T.w * 0.32, T.w * 0.32);
    const fr = faceRange(cake, i, cx) || [T.yt - 5, T.yt + 5];
    return { x: cx, y: lerp(fr[0], fr[1], 0.5), surface: 'top', layer: i };
  }
  const pr = 245;
  if (Math.abs(x) < pr * 0.96) {
    const half = Math.sqrt(1 - (x / pr) ** 2) * pr * KY;
    return { x, y: rand(half * 0.25, half * 0.8), surface: 'plate' };
  }
  return { x, y: 110, surface: 'floor' };
}

// --- body rendering (cached per cake) ------------------------------------------
function rainbowGrad(g, x0, x1) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
  return gr;
}
function facePath(g, sh, cx, cy, w) {
  g.beginPath();
  sh.poly.forEach(([px, py], i) => { const X = cx + px * w, Y = cy + py * w * KY; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
  g.closePath();
}
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function drawLayer(g, cake, i) {
  const sh = SHAPES[cake.shape], L = layerGeom(cake, i);
  const fl = FLAVORS[cake.flavors[i] ?? 0], fr = FROSTINGS[cake.frosting];
  const rimK = cake.style === 0 ? 0.24 : cake.style === 1 ? 0.12 : 0.14;
  const step = 2;
  // outline pass
  g.lineJoin = 'round';
  for (let y = L.yb; y >= L.yt; y -= step) { facePath(g, sh, 0, y, L.w); g.lineWidth = 7; g.strokeStyle = NAVY; g.stroke(); }
  // side fill pass
  const sideGrad = g.createLinearGradient(-L.w / 2, 0, L.w / 2, 0);
  sideGrad.addColorStop(0, fl.d); sideGrad.addColorStop(0.35, fl.c); sideGrad.addColorStop(0.6, fl.c); sideGrad.addColorStop(1, fl.d);
  const frostGrad = g.createLinearGradient(-L.w / 2, 0, L.w / 2, 0);
  frostGrad.addColorStop(0, fr.d); frostGrad.addColorStop(0.4, fr.c); frostGrad.addColorStop(1, fr.d);
  // mode: 'all' or 'frost' (only the frosting band, redrawn over the crumb texture)
  const sideSlices = (cg, mode = 'all') => {
    for (let y = L.yb; y >= L.yt; y -= step) {
      const f = (L.yb - y) / L.h; // 0 bottom .. 1 top
      if (mode === 'frost' && f <= 1 - rimK) continue;
      facePath(cg, sh, 0, y, L.w);
      if (f > 1 - rimK) cg.fillStyle = fr.rainbow ? rainbowGrad(cg, -L.w / 2, L.w / 2) : frostGrad;
      else if (fl.rainbow) cg.fillStyle = RAINBOW[Math.min(6, Math.floor(f / (1 - rimK) * 7))];
      else cg.fillStyle = sideGrad;
      cg.fill();
    }
  };
  if (!drawCrumbSide(g, L, sideSlices, `${cake.shape}|${i}|${cake.flavors[i] ?? 0}|${cake.frosting}|${cake.style}`)) sideSlices(g);
  // filling stripe
  g.save(); facePath(g, sh, 0, L.yb - L.h * 0.42, L.w * 1.0); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.stroke(); g.restore();
  // top face
  facePath(g, sh, 0, L.yt, L.w);
  g.fillStyle = fr.rainbow ? rainbowGrad(g, -L.w / 2, L.w / 2) : fr.c; g.fill();
  g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  g.save(); facePath(g, sh, 0, L.yt, L.w); g.clip();
  g.globalAlpha = 0.35; g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(-L.w * 0.12, L.yt - L.w * KY * 0.12, L.w * 0.22, L.w * KY * 0.12, -0.2, 0, TAU); g.fill();
  g.restore();
  // frosting style extras
  const rim = sh.rim.map(([px, py], k) => ({ x: px * L.w, y: L.yt + py * L.w * KY, k, front: py > -0.06 }));
  if (cake.style === 1) {
    for (const p of rim) {
      if (!p.front) continue;
      const len = L.h * (0.18 + 0.42 * hash(p.k + i * 7)), wd = 11;
      g.beginPath(); g.moveTo(p.x - wd / 2, p.y - 4); g.lineTo(p.x - wd / 2, p.y + len); g.arc(p.x, p.y + len, wd / 2, Math.PI, 0, true); g.lineTo(p.x + wd / 2, p.y - 4); g.closePath();
      g.fillStyle = fr.rainbow ? RAINBOW[p.k % 7] : fr.c; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    }
    facePath(g, sh, 0, L.yt, L.w); g.fillStyle = fr.rainbow ? rainbowGrad(g, -L.w / 2, L.w / 2) : fr.c; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  } else if (cake.style === 2) {
    const pts = rim.filter((p, idx) => idx % 2 === 0).sort((a, b) => a.y - b.y);
    for (const p of pts) {
      const r = 12;
      g.fillStyle = fr.rainbow ? RAINBOW[p.k % 7] : fr.c;
      g.beginPath(); g.ellipse(p.x, p.y - 2, r, r * 0.75, 0, 0, TAU); g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.ellipse(p.x, p.y - 9, r * 0.62, r * 0.5, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(p.x - 3, p.y - 13); g.quadraticCurveTo(p.x, p.y - 22, p.x + 2, p.y - 15); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(p.x - 4, p.y - 6, 2.5, 0, TAU); g.fill();
    }
  }
}

function drawDrizzle(g, cake) {
  const dz = DRIZZLES[cake.drizzle];
  if (!dz.c) return;
  const sh = SHAPES[cake.shape], i = cake.layers - 1, L = layerGeom(cake, i);
  const col = (k) => (dz.rainbow ? RAINBOW[k % 7] : dz.c);
  g.save(); facePath(g, sh, 0, L.yt, L.w); g.clip();
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 0; k < 6; k++) {
    const v = -0.42 + k * 0.17;
    g.beginPath();
    for (let s = 0; s <= 20; s++) {
      const u = -0.55 + s * 0.055;
      const x = u * L.w, y = L.yt + (v + Math.sin(s * 1.3 + k) * 0.04 + u * 0.18) * L.w * KY;
      s ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.lineWidth = 9; g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = 6; g.strokeStyle = col(k); g.stroke();
  }
  g.restore();
  // drips over the front edge
  for (const [px, py] of sh.rim) {
    if (py < 0.05) continue;
    const k = Math.round(px * 100);
    if (hash(k + 3) < 0.45) continue;
    const x = px * L.w, y = L.yt + py * L.w * KY, len = 10 + hash(k) * L.h * 0.35;
    g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x, y + len);
    g.lineWidth = 9; g.lineCap = 'round'; g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = 6; g.strokeStyle = col(k); g.stroke();
  }
}

// Sponge crumb texture: the side band of prop/cake-sponge-round (plain cream
// sponge), normalized to white so multiplying it over a layer's flavor colour
// only adds the crumb speckles and soft shading. The layers keep their
// procedural shape (round/heart/star/tower), flavors and frosting.
let crumbTex = null;
function crumbTexture() {
  if (crumbTex !== null) return crumbTex;
  const img = art('prop/cake-sponge-round');
  if (!img) return null;                       // not loaded (yet): try again later
  crumbTex = false;
  try {
    const sx = Math.round(img.width * 0.37), sy = Math.round(img.height * 0.71);
    const w = Math.round(img.width * 0.26), h = Math.round(img.height * 0.24);   // clear of its outline
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cg = c.getContext('2d'); cg.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    const d = cg.getImageData(0, 0, w, h), px = d.data, mean = [0, 0, 0];
    for (let i = 0; i < px.length; i += 4) { mean[0] += px[i]; mean[1] += px[i + 1]; mean[2] += px[i + 2]; }
    const n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) for (let ch = 0; ch < 3; ch++) px[i + ch] = Math.min(255, px[i + ch] * 255 / (mean[ch] / n));
    cg.putImageData(d, 0, 0);
    crumbTex = c;
  } catch (e) { /* unreadable canvas: plain sides */ }
  return crumbTex;
}
// Finished sides are cached by what they depend on (shape, layer, flavour,
// frosting, style, scale): decorations change the cake often, its sides rarely.
const sideCache = new Map();
const SIDE_CACHE_MAX = 64;
function drawCrumbSide(g, L, sideSlices, key) {
  const tex = crumbTexture();
  if (!tex) return false;
  const k = Math.hypot(g.getTransform().a, g.getTransform().b) || 1;
  const x0 = -L.w / 2 - 12, y0 = L.yt - L.w * KY / 2 - 12, bw = L.w + 24, bh = L.yb - L.yt + L.w * KY + 24;
  const ck = `${key}|${k.toFixed(3)}`;
  const hit = sideCache.get(ck);
  if (hit) { sideCache.delete(ck); sideCache.set(ck, hit); g.drawImage(hit, x0, y0, bw, bh); return true; }
  const c = document.createElement('canvas');
  c.width = Math.ceil(bw * k); c.height = Math.ceil(bh * k);
  const cg = c.getContext('2d');
  cg.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
  sideSlices(cg);
  // crumb texture masked to the side's shape, then multiplied over it
  const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
  const tg = t.getContext('2d');
  tg.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
  const pat = tg.createPattern(tex, 'repeat');
  if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(L.w / (tex.width * 2)));
  tg.fillStyle = pat; tg.fillRect(x0, y0, bw, bh);
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(c, 0, 0);
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalCompositeOperation = 'multiply'; cg.globalAlpha = 0.9; cg.drawImage(t, 0, 0);
  cg.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); cg.globalCompositeOperation = 'source-over'; cg.globalAlpha = 1;
  sideSlices(cg, 'frost');
  g.drawImage(c, x0, y0, bw, bh);
  sideCache.set(ck, c);
  if (sideCache.size > SIDE_CACHE_MAX) sideCache.delete(sideCache.keys().next().value);
  return true;
}

function drawStand(g) {
  const rx = 250, ry = rx * KY;
  g.lineWidth = 5; g.strokeStyle = NAVY;
  g.beginPath(); g.moveTo(-40, 14); g.lineTo(-70, 70); g.lineTo(70, 70); g.lineTo(40, 14); g.closePath();
  g.fillStyle = '#e9e2f5'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, 72, 90, 22, 0, 0, TAU); g.fillStyle = '#d8cfe8'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, 14, rx, ry, 0, 0, TAU); g.fillStyle = '#d9cfe9'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, 0, rx * 0.86, ry * 0.86, 0, 0, TAU); g.lineWidth = 3; g.strokeStyle = '#ffd23f'; g.stroke();
}

/** (Re)render the cake body into its cache canvas at screen scale k. */
export function renderBody(cake, k) {
  if (!cake.cache || cake.cacheK !== k) {
    cake.cache = document.createElement('canvas');
    cake.cache.width = Math.ceil(CACHE.w * k); cake.cache.height = Math.ceil(CACHE.h * k);
    cake.cacheK = k;
  }
  const c = cake.cache, g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.setTransform(k, 0, 0, k, CACHE.ox * k, CACHE.oy * k);
  drawStand(g);
  for (let i = 0; i < cake.layers; i++) drawLayer(g, cake, i);
  drawDrizzle(g, cake);
  cake.renderedVersion = cake.version;
  cake.bites = 0;
}

/** Take a bite out of the cached body (front-right of the top layer). */
export function biteBody(cake, k, n) {
  const T = topLayer(cake), sh = SHAPES[cake.shape];
  const pts = sh.rim.filter(([px, py]) => px > 0.1 && py > -0.1).sort((a, b) => b[0] - a[0]);
  const [px, py] = pts[Math.min(pts.length - 1, 2 + n * 3)] || [0.4, 0];
  const x = px * T.w, y = T.yt + py * T.w * KY + T.h * 0.2;
  const g = cake.cache.getContext('2d');
  g.setTransform(k, 0, 0, k, CACHE.ox * k, CACHE.oy * k);
  g.save(); g.globalCompositeOperation = 'destination-out';
  for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + (j - 1) * 20, y - 6 + Math.abs(j - 1) * 8, 22, 0, TAU); g.fill(); }
  g.restore();
  const fl = FLAVORS[cake.flavors[cake.layers - 1] ?? 0];
  g.lineWidth = 5; g.strokeStyle = fl.d; g.lineCap = 'round';
  for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + (j - 1) * 20, y - 6 + Math.abs(j - 1) * 8, 22, 0.3, Math.PI - 0.3); g.stroke(); }
  g.fillStyle = fl.c;
  for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(x + rand(-40, 40), y + rand(14, 30), 3, 0, TAU); g.fill(); }
  return { x, y };
}

/** Draw the cached body at screen position (sx, sy) = stand center. */
export function drawBody(g, cake, sx, sy, k) {
  if (!cake.cache || cake.renderedVersion !== cake.version || cake.cacheK !== k) renderBody(cake, k);
  g.drawImage(cake.cache, sx - CACHE.ox * k, sy - CACHE.oy * k);
}

// --- decorations ---------------------------------------------------------------
export function makeDeco(kind, x, y, extra = {}) {
  return { kind, x, y, vy: 0, state: 'fall', ...extra };
}
export function sprinkle(x, y) {
  return { kind: 'sprinkle', x, y, vy: rand(-120, 40), vx: rand(-90, 90), rot: rand(TAU), color: pick(SPRINKLE_COLORS), state: 'fall', spin: rand(-12, 12) };
}

function ol(g, w = 3) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke(); }

// Generated topping art (cake-local units; (x, y) = where it touches the cake).
// [art key, drawn height, how far the pick/base sinks below the landing point]
const TOPPING_ART = {
  cherry: ['prop/topper-cherry', 48, 3],
  strawberry: ['prop/topper-strawberry', 40, 4],
  star: ['prop/topper-star', 54, 6],
  heart: ['prop/topper-heart', 54, 6],
  flower: ['prop/topper-flower', 36, 4],
  unicorn: ['prop/topper-unicorn-horn', 78, 4],
};
// The candle art is pink; other candy colors get a hue-shifted copy, built once.
const CANDLE_HUE = 334, CANDLE_H = 62;
const candleCache = new Map();
function hueOf(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
function candleArt(color) {
  const img = art('prop/candle');
  if (!img) return null;
  if (!color || color === '#ff6fd0') return img;
  let c = candleCache.get(color);
  if (c === undefined) {
    c = img;
    try {
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const x = cv.getContext('2d');
      if ('filter' in x) { x.filter = `hue-rotate(${Math.round(hueOf(color) - CANDLE_HUE)}deg)`; x.drawImage(img, 0, 0); c = cv; }
    } catch (e) { c = img; }
    candleCache.set(color, c);
  }
  return c;
}

export function drawDecoShape(g, d, t, { lit = false, flame = 1, charId = null, ring = null } = {}) { // charId: a character id or the player (for its colour scheme)
  const x = d.x, y = d.y;
  const ta = TOPPING_ART[d.kind];
  if (ta) {
    const [key, h, sink] = ta;
    g.save(); g.translate(x, y + sink); if (d.rot) g.rotate(d.rot * 0.5);
    const ok = drawArt(g, key, 0, 0, h * 1.6, h, { anchor: 'bottom' });
    g.restore();
    if (ok) return;
  }
  switch (d.kind) {
    case 'cherry': {
      g.beginPath(); g.moveTo(x, y - 22); g.quadraticCurveTo(x + 2, y - 40, x + 12, y - 46); g.lineWidth = 4; g.strokeStyle = '#3d8b3d'; g.stroke();
      g.beginPath(); g.ellipse(x + 10, y - 44, 7, 4, -0.5, 0, TAU); g.fillStyle = '#5ccf7a'; g.fill(); ol(g, 2);
      g.beginPath(); g.arc(x, y - 12, 14, 0, TAU); g.fillStyle = '#e8213f'; g.fill(); ol(g);
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(x - 5, y - 17, 4, 2.5, -0.6, 0, TAU); g.fill();
      break;
    }
    case 'strawberry': {
      g.beginPath(); g.moveTo(x - 15, y - 26); g.quadraticCurveTo(x - 17, y - 6, x, y + 2); g.quadraticCurveTo(x + 17, y - 6, x + 15, y - 26); g.quadraticCurveTo(x, y - 32, x - 15, y - 26);
      g.fillStyle = '#ff3b5c'; g.fill(); ol(g);
      g.fillStyle = '#ffe58a';
      for (const [dx, dy] of [[-7, -18], [0, -14], [7, -18], [-4, -8], [4, -8], [0, -22]]) { g.beginPath(); g.ellipse(x + dx, y + dy, 1.6, 2.4, 0, 0, TAU); g.fill(); }
      g.fillStyle = '#4cc46a';
      g.beginPath(); for (let k = 0; k < 5; k++) { const a = Math.PI + (k / 4) * Math.PI; g.lineTo(x + Math.cos(a) * 13, y - 27 + Math.sin(a) * 6); g.lineTo(x + Math.cos(a + 0.3) * 5, y - 27); } g.closePath(); g.fill(); ol(g, 2);
      break;
    }
    case 'star': {
      g.save(); g.translate(x, y - 14); g.rotate(d.rot || 0); starPath(g, 15, 0.5); g.restore();
      g.fillStyle = d.color || '#ffd23f'; g.fill(); ol(g);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - 4, y - 18, 3, 0, TAU); g.fill();
      break;
    }
    case 'gummy': {
      g.save(); g.globalAlpha *= 0.9; g.fillStyle = d.color || '#ff4d6d';
      g.beginPath();
      g.arc(x - 7, y - 37, 4.5, 0, TAU); g.arc(x + 7, y - 37, 4.5, 0, TAU); g.fill();
      g.beginPath(); g.arc(x, y - 30, 9, 0, TAU); g.fill(); ol(g, 2.5);
      g.beginPath(); g.ellipse(x, y - 12, 11, 13, 0, 0, TAU); g.fill(); ol(g, 2.5);
      for (const [dx, dy] of [[-11, -16], [11, -16], [-7, -1], [7, -1]]) { g.beginPath(); g.arc(x + dx, y + dy, 4.5, 0, TAU); g.fill(); ol(g, 2); }
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x - 4, y - 16, 3, 5, 0.3, 0, TAU); g.fill();
      g.fillStyle = NAVY; g.beginPath(); g.arc(x - 3, y - 31, 1.4, 0, TAU); g.arc(x + 3, y - 31, 1.4, 0, TAU); g.fill();
      g.restore();
      break;
    }
    case 'candle': {
      const cimg = candleArt(d.color);
      if (cimg) {
        // image is 64x95 with the wick tip ~3 px from the top edge
        const ch = CANDLE_H, cw = ch * cimg.width / cimg.height;
        g.drawImage(cimg, x - cw / 2, y + 2 - ch, cw, ch);
        if (lit && flame > 0.02) drawFlame(g, x, y + 2 - ch + 1, t, flame);
        break;
      }
      const h = 54;
      g.beginPath(); g.rect(x - 6, y - h, 12, h); g.fillStyle = '#fffaf2'; g.fill();
      g.save(); g.clip(); g.strokeStyle = d.color || '#ff6fd0'; g.lineWidth = 5;
      for (let k = -2; k < 8; k++) { g.beginPath(); g.moveTo(x - 8, y - k * 10); g.lineTo(x + 8, y - k * 10 - 10); g.stroke(); }
      g.restore();
      g.beginPath(); g.rect(x - 6, y - h, 12, h); ol(g, 2.5);
      g.beginPath(); g.moveTo(x, y - h); g.lineTo(x, y - h - 8); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      if (lit && flame > 0.02) drawFlame(g, x, y - h - 10, t, flame);
      break;
    }
    case 'heart': {
      g.save(); g.translate(x, y - 16); g.rotate((d.rot || 0) * 0.5);
      g.beginPath(); g.moveTo(0, 8); g.lineTo(0, 18); g.lineWidth = 3; g.strokeStyle = '#f5e6c8'; g.stroke();
      drawHeartShape(g, 30, d.color || '#ff6fae'); g.restore();
      break;
    }
    case 'flower': {
      g.save(); g.translate(x, y - 12);
      g.fillStyle = d.color || '#ff9fd0';
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * 9, Math.sin(a) * 9 * 0.8, 8, 6, a, 0, TAU); g.fill(); ol(g, 2); }
      g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); ol(g, 2);
      g.restore();
      break;
    }
    case 'unicorn': {
      g.beginPath(); g.moveTo(x - 13, y); g.lineTo(x, y - 74); g.lineTo(x + 13, y); g.closePath();
      g.fillStyle = '#ffd86b'; g.fill(); ol(g);
      g.strokeStyle = '#e0a93a'; g.lineWidth = 3;
      for (let k = 1; k < 5; k++) { const yy = y - k * 15; g.beginPath(); g.moveTo(x - 13 * (1 - k / 5), yy + 4); g.lineTo(x + 13 * (1 - k / 5), yy - 4); g.stroke(); }
      break;
    }
    case 'topper': {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 92); g.lineWidth = 7; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke();
      g.save(); g.translate(x, y - 74);
      g.beginPath(); g.moveTo(0, -8); g.lineTo(30, 0); g.lineTo(0, 8); g.closePath(); g.fillStyle = ring || '#ff6fd0'; g.fill(); ol(g, 2);
      g.restore();
      if (charId) drawPortrait(g, charId, x, y - 128, 36, { ring: ring || '#ffd23f', ringWidth: 6, expr: 'happy' });
      g.save(); g.translate(x + 30, y - 160); g.globalAlpha *= 0.6 + 0.4 * Math.sin(t * 4); drawSparkleShape(g, 18, '#fff6a8'); g.restore();
      break;
    }
    default: break;
  }
}

// Warm halo behind a flame: one cached radial-gradient sprite, reused.
let flameGlow = null;
function flameGlowSprite() {
  if (!flameGlow) {
    flameGlow = document.createElement('canvas'); flameGlow.width = flameGlow.height = 96;
    const x = flameGlow.getContext('2d'), gr = x.createRadialGradient(48, 48, 2, 48, 48, 48);
    gr.addColorStop(0, 'rgba(255,220,120,0.55)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 96, 96);
  }
  return flameGlow;
}
function drawFlame(g, x, base, t, flame) {
  const f = flame * (0.9 + 0.12 * Math.sin(t * 23 + x) + 0.08 * Math.sin(t * 37 + base));
  const fy = base;
  const img = art('prop/candle-flame');
  if (img) {
    // candle-flame art is 119x128; the flame's base sits at (65, 108)
    const r = 34 * f;
    g.drawImage(flameGlowSprite(), x - r, fy - 8 - r, r * 2, r * 2);
    const k = (30 * f) / 108;
    g.save(); g.translate(x, fy + 2);
    g.rotate(Math.sin(t * 7 + x * 0.1) * 0.09);
    g.scale(1 + 0.08 * Math.sin(t * 19 + x), 1 + 0.06 * Math.sin(t * 13 + base));
    g.drawImage(img, -65 * k, -108 * k, img.width * k, img.height * k);
    g.restore();
    return;
  }
  const gl = g.createRadialGradient(x, fy - 8, 1, x, fy - 8, 34 * f);
  gl.addColorStop(0, 'rgba(255,220,120,0.55)'); gl.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(x, fy - 8, 34 * f, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(x, fy - 26 * f); g.quadraticCurveTo(x + 10 * f, fy - 6 * f, x, fy + 2); g.quadraticCurveTo(x - 10 * f, fy - 6 * f, x, fy - 26 * f);
  g.fillStyle = '#ffb02e'; g.fill();
  g.beginPath(); g.moveTo(x, fy - 15 * f); g.quadraticCurveTo(x + 5 * f, fy - 3 * f, x, fy + 1); g.quadraticCurveTo(x - 5 * f, fy - 3 * f, x, fy - 15 * f);
  g.fillStyle = '#fff6b0'; g.fill();
}

/** Sprinkles are drawn in color batches (cheap even with hundreds). */
export function drawSprinkles(g, list) {
  const byColor = new Map();
  for (const s of list) { if (!byColor.has(s.color)) byColor.set(s.color, []); byColor.get(s.color).push(s); }
  g.lineCap = 'round';
  g.lineWidth = 6.5; g.strokeStyle = 'rgba(36,22,63,0.55)';
  g.beginPath();
  for (const s of list) { const dx = Math.cos(s.rot) * 5, dy = Math.sin(s.rot) * 5 * (s.state === 'fall' ? 1 : 0.5); g.moveTo(s.x - dx, s.y - dy); g.lineTo(s.x + dx, s.y + dy); }
  g.stroke();
  g.lineWidth = 4;
  for (const [c, arr] of byColor) {
    g.beginPath(); g.strokeStyle = c;
    for (const s of arr) { const dx = Math.cos(s.rot) * 5, dy = Math.sin(s.rot) * 5 * (s.state === 'fall' ? 1 : 0.5); g.moveTo(s.x - dx, s.y - dy); g.lineTo(s.x + dx, s.y + dy); }
    g.stroke();
  }
}

/** Little icon for the decoration menu (centered at cx, cy, about `size` px). */
export function drawDecoIcon(g, kind, cx, cy, size, t) {
  // generated sprinkle-scatter art (125x128) for the Sprinkles menu / cursor icon
  if (kind === 'sprinkles' && drawArt(g, 'prop/sprinkles', cx, cy, size * 0.95, size * 0.95)) return;
  g.save(); g.translate(cx, cy); const s = size / 60; g.scale(s, s);
  if (kind === 'sprinkles') {
    // shaker jar
    g.beginPath(); g.rect(-14, -16, 28, 34); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill(); ol(g);
    g.beginPath(); g.rect(-16, -26, 32, 12); g.fillStyle = '#ff6fd0'; g.fill(); ol(g);
    const cs = ['#ff4d6d', '#ffd23f', '#3fa7ff', '#36d17a', '#b36bff'];
    for (let k = 0; k < 9; k++) { g.beginPath(); const x = -9 + (k % 3) * 9, y = -6 + Math.floor(k / 3) * 8; g.moveTo(x - 3, y + (k % 2 ? 2 : -2)); g.lineTo(x + 3, y - (k % 2 ? 2 : -2)); g.lineWidth = 3; g.strokeStyle = cs[k % 5]; g.stroke(); }
  } else if (kind === 'topper') {
    g.beginPath(); g.moveTo(0, 26); g.lineTo(0, -6); g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke();
    g.beginPath(); g.arc(0, -14, 16, 0, TAU); g.fillStyle = '#ffd6ef'; g.fill(); ol(g);
    g.fillStyle = NAVY; g.beginPath(); g.arc(-5, -16, 2, 0, TAU); g.arc(5, -16, 2, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, -11, 5, 0.2, Math.PI - 0.2); g.lineWidth = 2; g.stroke();
  } else {
    if (kind === 'unicorn') { g.translate(0, 6); g.scale(0.72, 0.72); }
    const d = { kind, x: 0, y: kind === 'candle' || kind === 'unicorn' ? 26 : 18, rot: 0.2, color: kind === 'gummy' ? '#36d17a' : kind === 'star' ? '#ffd23f' : '#ff6fd0' };
    drawDecoShape(g, d, t, { lit: kind === 'candle', flame: 0.8 });
  }
  g.restore();
}
