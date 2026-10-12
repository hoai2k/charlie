// Pottery Wheel: the clay model and how a pot is drawn.
//
// A pot is a surface of revolution: `r[i]` is the radius of ring i (bottom to
// top) and `h` the height, in "pot units" (screen px at scale 1). Shaping
// pulls nearby rings toward the tool with a soft Gaussian falloff and keeps
// the clay's volume, so squeezing makes the pot taller and pulling the top
// up makes it thinner. Paint lives on the surface in (angle, height) space:
// glaze dips, bands, brush strokes, dots and stickers, so they turn with the
// pot and squash at the edges like real 3D.
import { art, drawArt } from '../../engine/art.js';
import { RAINBOW } from '../../engine/particles.js';
import { drawHeartShape } from '../../engine/emotes.js';
import { clamp, lerp, rand, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
export const KY = 0.22;          // ellipse squash of a ring seen from slightly above
export const N = 24;             // rings in the profile
export const WALL = 11;          // rim thickness
export const RMIN = 14, RMAX = 175, HMIN = 46, HMAX = 390;
export const WET = '#a8775a';    // wet clay before firing

export const CLAYS = [
  { id: 'terracotta', name: 'Terracotta!', c: '#e3895a' },
  { id: 'cream', name: 'Creamy white!', c: '#f6e7d2' },
  { id: 'pink', name: 'Pink clay!', c: '#f5aec3' },
  { id: 'speckled', name: 'Speckled!', c: '#ecdcc4', speck: true },
  { id: 'choc', name: 'Chocolate clay!', c: '#a2694a' },
  { id: 'lilac', name: 'Lilac clay!', c: '#cfb8ef' },
];

export const PAINTS = [
  { name: 'Pink', c: '#ff7ac6' },
  { name: 'Red', c: '#ff4d5e' },
  { name: 'Orange', c: '#ff9f1c' },
  { name: 'Yellow', c: '#ffd23f' },
  { name: 'Mint', c: '#4fd98a' },
  { name: 'Sky', c: '#4fb8ff' },
  { name: 'Blue', c: '#4a5bd8' },
  { name: 'Purple', c: '#a77bff' },
  { name: 'White', c: '#fffaf2' },
  { name: 'Gold', c: '#f2c53d', shine: true },
  { name: 'Rainbow', c: '#ff7ac6', rainbow: true },
];
export const GOLD = 9, RAINBOW_I = 10;

export const STICKERS = ['heart', 'star', 'flower', 'butterfly', 'rainbow', 'moon', 'cat', 'fish', 'sun', 'strawberry'];

// Ready-made shapes (Surprise! and what CPU potters aim for): [u, radius] control points.
export const PRESETS = {
  vase: { h: 300, pts: [[0, 62], [0.3, 118], [0.55, 96], [0.8, 46], [1, 70]] },
  bowl: { h: 120, pts: [[0, 58], [0.35, 118], [0.7, 150], [1, 166]] },
  cup: { h: 190, pts: [[0, 64], [0.25, 80], [1, 90]], handles: 1 },
  bottle: { h: 340, pts: [[0, 72], [0.28, 108], [0.5, 82], [0.66, 32], [1, 38]] },
  jar: { h: 220, pts: [[0, 82], [0.2, 114], [0.75, 108], [0.9, 78], [1, 84]] },
  plate: { h: 56, pts: [[0, 92], [0.5, 150], [1, 172]] },
  trophy: { h: 260, pts: [[0, 74], [0.14, 40], [0.36, 40], [0.62, 96], [1, 122]], handles: 2 },
  mug: { h: 210, pts: [[0, 84], [0.5, 90], [1, 86]], handles: 1 },
};
export const PRESET_NAMES = Object.keys(PRESETS);

// --- profile ---------------------------------------------------------------------------
export function volumeOf(r, h) {
  let v = 0;
  for (let i = 0; i < N - 1; i++) v += (r[i] * r[i] + r[i + 1] * r[i + 1]) / 2;
  return v * h / (N - 1);
}

export function newPot() {
  const r = [];
  for (let i = 0; i < N; i++) { const u = i / (N - 1); r.push(108 * (1 - 0.42 * u * u) + 6 * Math.sin(u * 3)); }
  const pot = {
    r, h: 150, handles: 0, vol: 0, grabTop: false,
    clay: null, fired: false,
    layers: [], stripes: [], strokes: [], dots: [], stickers: [],
  };
  pot.vol = volumeOf(r, pot.h);
  return pot;
}

/** Radius at height fraction u (0 bottom .. 1 top), linear between rings. */
export function radiusAt(pot, u) {
  const f = clamp(u, 0, 1) * (N - 1), i = Math.min(N - 2, Math.floor(f));
  return lerp(pot.r[i], pot.r[i + 1], f - i);
}

export function maxRadius(pot) { let m = 0; for (const v of pot.r) m = Math.max(m, v); return m; }

/** Radii for a preset, scaled so it holds `vol` clay. */
export function presetProfile(name, vol, jitter = 0) {
  const P = PRESETS[name];
  const r = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    let j = 0;
    while (j < P.pts.length - 2 && P.pts[j + 1][0] < u) j++;
    const [u0, r0] = P.pts[j], [u1, r1] = P.pts[j + 1];
    const t = clamp((u - u0) / Math.max(1e-6, u1 - u0), 0, 1);
    r.push(lerp(r0, r1, (1 - Math.cos(t * Math.PI)) / 2));
  }
  const h = P.h * (1 + rand(-jitter, jitter));
  if (jitter) for (let i = 0; i < N; i++) r[i] *= 1 + Math.sin(i * 0.7 + rand(TAU)) * jitter * 0.4;
  const s = Math.sqrt(vol / volumeOf(r, h));
  return { r: r.map((v) => clamp(v * s, RMIN, RMAX)), h, handles: P.handles || 0 };
}

function conserve(pot, keepHeight) {
  const v = volumeOf(pot.r, pot.h);
  if (v <= 0) return;
  if (!keepHeight) {
    const h = clamp(pot.h * pot.vol / v, HMIN, HMAX);
    pot.h = h;
  }
  const v2 = volumeOf(pot.r, pot.h);
  if (Math.abs(v2 - pot.vol) / pot.vol > 0.004) {
    const s = Math.sqrt(pot.vol / v2);
    for (let i = 0; i < N; i++) pot.r[i] = clamp(pot.r[i] * s, RMIN, RMAX);
  }
}

/**
 * The tool at (tx, ty) (tx = distance from the axis, ty = height) shapes the
 * clay for dt seconds. Returns how hard it pushed (0..), for sounds and splashes.
 */
export function shapeClay(pot, tx, ty, dt, { pressed = false } = {}) {
  const h = pot.h, rt = pot.r[N - 1];
  // grab the top: the tool at (or above) the rim pulls it up or pushes it down
  if (pressed || pot.grabTop) {
    const atTop = ty > h - 14 && ty < h + 70 && tx < rt + 40;
    if (pressed) pot.grabTop = atTop;
    else if (Math.abs(ty - h) > 90 || tx > rt + 80) pot.grabTop = false;
  }
  let work = 0;
  if (pot.grabTop) {
    const target = clamp(ty, HMIN, HMAX);
    const dh = (target - pot.h) * (1 - Math.exp(-5 * dt));
    pot.h += dh;
    work = Math.abs(dh) / Math.max(dt, 1e-3) / 200;
    conserve(pot, true);
    return work;
  }
  const sig = 30 + h * 0.04;
  for (let i = 0; i < N; i++) {
    const yi = (i / (N - 1)) * h;
    const w = Math.exp(-(((yi - ty) / sig) ** 2));
    if (w < 0.03) continue;
    const d = tx - pot.r[i];
    if (d > 60) continue;                          // the tool isn't touching the wall
    const rate = d < 0 ? 4 : 2.2;                // pushing in is quicker than drawing out
    const dr = d * (1 - Math.exp(-rate * w * dt));
    pot.r[i] = clamp(pot.r[i] + dr, RMIN, RMAX);
    work += Math.abs(dr);
  }
  smooth(pot, tx, ty, dt, 0.5, sig);
  conserve(pot, false);
  return work / Math.max(dt, 1e-3) / 200;
}

/** Wet sponge: evens out bumps near the tool. */
export function smooth(pot, tx, ty, dt, strength = 3, sig = 60) {
  const h = pot.h, r = pot.r.slice();
  for (let i = 1; i < N - 1; i++) {
    const yi = (i / (N - 1)) * h;
    const w = Math.exp(-(((yi - ty) / sig) ** 2));
    if (w < 0.03) continue;
    const avg = (r[i - 1] + r[i + 1]) / 2;
    pot.r[i] += (avg - r[i]) * (1 - Math.exp(-strength * 6 * w * dt));
  }
  if (strength > 1) conserve(pot, false);
}

/** "It's a ...!" */
export function potName(pot) {
  const mr = maxRadius(pot), h = pot.h, ratio = h / (2 * mr);
  let top = Infinity;
  for (let i = Math.floor(N * 0.55); i < N - 1; i++) top = Math.min(top, pot.r[i]);
  const neck = top / mr;
  if (pot.handles === 2 && ratio > 0.6) return 'Trophy';
  if (h < 75 || ratio < 0.24) return 'Plate';
  if (pot.handles === 1 && ratio < 1.5) return 'Mug';
  let low = Infinity;
  for (let i = 1; i < Math.floor(N * 0.45); i++) low = Math.min(low, pot.r[i]);
  if (ratio >= 0.6 && low < mr * 0.5 && pot.r[N - 1] > mr * 0.8) return 'Goblet';
  if (ratio < 0.55) return 'Bowl';
  if (ratio < 1.0) return neck < 0.62 ? 'Pot' : 'Cup';
  if (neck < 0.5) return ratio > 1.6 ? 'Bottle' : 'Vase';
  return ratio > 1.45 ? 'Tall Vase' : 'Jar';
}

// --- projection -------------------------------------------------------------------------
/** A point on ring u at turn angle a (0 = facing us): { x, y } in pot units, y = height. */
export function ringPoint(pot, u, a, R = radiusAt(pot, u)) {
  return { x: R * Math.sin(a), y: u * pot.h - R * KY * Math.cos(a) };
}

/** The surface point under a cursor (pot units), or null when the cursor is off the pot. */
export function surfaceAt(pot, cx, cy) {
  let u = cy / pot.h;
  for (let it = 0; it < 4; it++) {
    const R = radiusAt(pot, u);
    const s = cx / R;
    if (Math.abs(s) >= 1) return null;
    u = (cy + R * KY * Math.sqrt(1 - s * s)) / pot.h;
  }
  if (u < 0 || u > 1) return null;
  const R = radiusAt(pot, u), s = clamp(cx / R, -1, 1);
  return { u, a: Math.asin(s), R };
}

// --- drawing ----------------------------------------------------------------------------
function hex(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
export function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join(''); }
export function paintColor(i, seed = 0) { const p = PAINTS[i]; return p.rainbow ? RAINBOW[Math.abs(Math.floor(seed)) % RAINBOW.length] : p.c; }

/** Trace the pot's outer silhouette in screen space. */
function bodyPath(g, pot, P) {
  const r = pot.r, h = pot.h;
  const pts = [];
  // bottom front arc (left to right)
  for (let j = 0; j <= 10; j++) { const a = -Math.PI / 2 + (Math.PI * j) / 10; pts.push([r[0] * Math.sin(a), -r[0] * KY * Math.cos(a)]); }
  for (let i = 1; i < N; i++) pts.push([r[i], (i / (N - 1)) * h]);
  const rt = r[N - 1];
  for (let j = 1; j < 10; j++) { const a = Math.PI / 2 - (Math.PI * j) / 10; pts.push([rt * Math.sin(a), h + rt * KY * Math.cos(a)]); }
  for (let i = N - 1; i >= 1; i--) pts.push([-r[i], (i / (N - 1)) * h]);
  g.beginPath();
  const [x0, y0] = P(pts[0][0], pts[0][1]);
  g.moveTo(x0, y0);
  // smooth through midpoints
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = P(pts[i][0], pts[i][1]), [bx, by] = P(pts[i + 1][0], pts[i + 1][1]);
    g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
  }
  const [lx, ly] = P(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  g.lineTo(lx, ly);
  g.closePath();
}

/** Glaze colour of the pot at height u (the latest dip that covers it), or null. */
export const showU = (L) => Math.max(L.u0, 1 - (L.reveal ?? 1) * (1 - L.u0 + 0.06));
export function glazeAt(pot, u) {
  for (let i = pot.layers.length - 1; i >= 0; i--) { const L = pot.layers[i]; if (u >= showU(L) - 0.001) return L; }
  return null;
}

/** Path of the region above (from) a ring line at u, with drips; dripSeed > 0 adds drips. */
function aboveLine(g, pot, P, u, phi, drip = 0, seed = 0, closeUp = true) {
  const R = radiusAt(pot, u);
  const big = 600;
  const [sx, sy] = P(-big, u * pot.h);
  g.moveTo(sx, sy);
  const n = 28;
  for (let j = 0; j <= n; j++) {
    const a = -Math.PI / 2 + (Math.PI * j) / n;
    const th = a - phi;
    const d = drip ? drip * Math.max(0, Math.sin(th * 5 + seed)) ** 6 + drip * 0.3 * Math.max(0, Math.sin(th * 3 + seed * 2)) ** 8 : 0;
    const p = ringPoint(pot, u, a, R);
    const [x, y] = P(p.x, p.y - d);
    g.lineTo(x, y);
  }
  const [ex, ey] = P(big, u * pot.h);
  g.lineTo(ex, ey);
  if (closeUp) { const [tx, ty] = P(big, pot.h + 300); g.lineTo(tx, ty); const [ux, uy] = P(-big, pot.h + 300); g.lineTo(ux, uy); g.closePath(); }
}

function fillGlaze(g, L, P, pot) {
  const pc = PAINTS[L.color];
  if (pc.rainbow) {
    // horizontal rainbow bands from the dip line to the top
    const y0 = P(0, L.u0 * pot.h - 60)[1], y1 = P(0, pot.h + 40)[1];
    const gr = g.createLinearGradient(0, y0, 0, y1);
    RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
    g.fillStyle = gr;
  } else g.fillStyle = pc.c;
  g.fill();
}

/**
 * Draw a pot. o: { x, y (base centre, screen), k (scale), phi (turn angle),
 * color (override body colour), glow (0..1 hot kiln glow), wet, specks,
 * t (time), hover (item), alpha }.
 */
export function drawPot(g, pot, o) {
  const k = o.k, cx = o.x, by = o.y, phi = o.phi || 0;
  const P = (x, y) => [cx + x * k, by - y * k];
  const base = o.color || (pot.fired && pot.clay ? pot.clay.c : WET);
  const h = pot.h;
  g.save();
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  g.lineJoin = 'round'; g.lineCap = 'round';
  // handles behind the pot
  const handleAngles = handleAnglesOf(pot, phi, o.still);
  for (const a of handleAngles) if (Math.cos(a) < 0) drawHandle(g, pot, P, a, base, k);
  // body
  bodyPath(g, pot, P);
  g.fillStyle = base; g.fill();
  g.save();
  bodyPath(g, pot, P); g.clip();
  if (pot.clay?.speck && pot.fired) drawSpecks(g, pot, P, phi, k, '#7a5a40', 60, 0.5);
  // glaze dips
  pot.layers.forEach((L) => {
    if ((L.reveal ?? 1) <= 0) return;
    g.beginPath();
    aboveLine(g, pot, P, showU(L), phi, (L.reveal ?? 1) >= 1 ? 9 : 4, L.seed);
    fillGlaze(g, L, P, pot);
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(36,22,63,0.25)'; g.stroke();
  });
  // bands
  for (const s of pot.stripes) drawBand(g, pot, P, s, phi);
  // brush strokes
  for (const s of pot.strokes) drawStroke(g, pot, P, s, phi, k);
  // dots
  for (const d of pot.dots) {
    if (d.held) continue;
    const a = d.th + phi, c = Math.cos(a);
    if (c <= 0.02) continue;
    const p = ringPoint(pot, d.u, a);
    const [x, y] = P(p.x, p.y);
    const s = d.s * k;
    g.fillStyle = d.c; g.beginPath(); g.ellipse(x, y, s * c, s, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(x - s * 0.3 * c, y - s * 0.3, s * 0.3 * c, s * 0.3, 0, 0, TAU); g.fill();
  }
  // stickers
  for (const st of pot.stickers) {
    if (st.held) continue;
    const a = st.th + phi, c = Math.cos(a);
    if (c <= 0.05) continue;
    const p = ringPoint(pot, st.u, a);
    const [x, y] = P(p.x, p.y);
    g.save(); g.translate(x, y); g.scale(c * k, k); g.rotate(st.rot || 0);
    drawSticker(g, st.kind, st.s, o.t || 0);
    g.restore();
  }
  // wet sheen / throwing lines while it spins
  if (o.wet) {
    g.strokeStyle = 'rgba(60,30,20,0.16)'; g.lineWidth = 2.5 * Math.max(0.6, k);
    for (let j = 1; j < 9; j++) {
      const u = j / 9;
      g.beginPath();
      for (let s = 0; s <= 16; s++) { const a = -Math.PI / 2 + (Math.PI * s) / 16; const p = ringPoint(pot, u, a); const [x, y] = P(p.x, p.y); s ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    drawSpecks(g, pot, P, phi, k, 'rgba(80,45,30,0.55)', 26, 1.1);
  }
  // hot glow
  if (o.glow > 0) { g.globalAlpha = clamp(o.glow, 0, 1); g.fillStyle = '#ff8a3c'; g.fillRect(cx - 400 * k, by - (h + 120) * k, 800 * k, (h + 260) * k); g.globalAlpha = 1; }
  // cel shading: darker rim, a soft highlight on the left
  bodyPath(g, pot, P);
  g.lineWidth = 34 * k; g.strokeStyle = 'rgba(36,22,63,0.13)'; g.stroke();
  g.lineWidth = 14 * k; g.strokeStyle = 'rgba(36,22,63,0.12)'; g.stroke();
  const shine = o.wet ? 0.38 : glazeAt(pot, 0.5) ? (PAINTS[glazeAt(pot, 0.5).color].shine ? 0.65 : 0.45) : 0.22;
  g.strokeStyle = `rgba(255,255,255,${shine})`;
  for (const [f, w] of [[-0.52, 0.16], [-0.6, 0.06]]) {
    g.beginPath();
    for (let i = 2; i < N - 2; i++) {
      const u = i / (N - 1), R = pot.r[i];
      const [x, y] = P(R * f, u * h - R * KY * 0.8);
      i > 2 ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.lineWidth = Math.max(2, w * (maxRadius(pot) * 0.5) * k * (f < -0.55 ? 1 : 1)); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${shine * 0.9})`;
  }
  g.restore();
  bodyPath(g, pot, P);
  g.lineWidth = Math.max(2.5, 4.5 * k); g.strokeStyle = NAVY; g.stroke();
  // the rim and the opening
  const rt = pot.r[N - 1], ri = Math.max(3, rt - WALL);
  const top = glazeAt(pot, 1);
  const rimC = o.color || (top ? (PAINTS[top.color].rainbow ? RAINBOW[0] : PAINTS[top.color].c) : base);
  const [tx, ty] = P(0, h);
  g.beginPath(); g.ellipse(tx, ty, rt * k, rt * KY * k, 0, 0, TAU);
  g.fillStyle = mix(rimC.startsWith('#') ? rimC : '#a8775a', '#ffffff', 0.18); g.fill();
  g.lineWidth = Math.max(2.5, 4 * k); g.strokeStyle = NAVY; g.stroke();
  g.beginPath(); g.ellipse(tx, ty + 1 * k, ri * k, ri * KY * k, 0, 0, TAU);
  g.fillStyle = mix(rimC.startsWith('#') ? rimC : '#a8775a', '#24163f', 0.5); g.fill();
  g.lineWidth = Math.max(1.5, 2.5 * k); g.stroke();
  // a little light on the inside back wall
  g.save(); g.beginPath(); g.ellipse(tx, ty + 1 * k, ri * k, ri * KY * k, 0, 0, TAU); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(tx, ty - ri * KY * k * 0.9, ri * k * 0.9, ri * KY * k * 0.7, 0, 0, TAU); g.fill();
  if (o.glow > 0) { g.globalAlpha = clamp(o.glow, 0, 1); g.fillStyle = '#ff8a3c'; g.fillRect(tx - rt * k, ty - rt * k, rt * 2 * k, rt * 2 * k); }
  g.restore();
  // handles in front
  for (const a of handleAngles) if (Math.cos(a) >= 0) drawHandle(g, pot, P, a, base, k, o.glow);
  g.restore();
}

function handleAnglesOf(pot, phi, still) {
  if (!pot.handles) return [];
  const a0 = still ? Math.PI / 2 : Math.PI / 2 + phi;
  return pot.handles === 1 ? [a0] : [a0, a0 + Math.PI];
}

function drawHandle(g, pot, P, a, base, k, glow = 0) {
  const u1 = pot.h < 90 ? 0.3 : 0.24, u2 = pot.h < 90 ? 0.85 : 0.78;
  const D = 34 + pot.h * 0.09;
  const pts = [];
  for (let j = 0; j <= 14; j++) {
    const t = j / 14, u = lerp(u2, u1, t);
    const rho = radiusAt(pot, u) - 4 + D * Math.sin(Math.PI * t) ** 0.7;
    const p = ringPoint(pot, u, a, rho);
    pts.push(P(p.x, p.y));
  }
  const L = glazeAt(pot, (u1 + u2) / 2);
  const col = L ? (PAINTS[L.color].rainbow ? RAINBOW[4] : PAINTS[L.color].c) : base;
  const T = 17 * k;
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  path(); g.lineWidth = T + Math.max(5, 9 * k); g.strokeStyle = NAVY; g.stroke();
  path(); g.lineWidth = T; g.strokeStyle = col; g.stroke();
  if (glow > 0) { g.save(); g.globalAlpha = clamp(glow, 0, 1); path(); g.strokeStyle = '#ff8a3c'; g.stroke(); g.restore(); }
  path(); g.lineWidth = T * 0.25; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.stroke();
}

function drawSpecks(g, pot, P, phi, k, color, n, size) {
  g.fillStyle = color;
  for (let j = 0; j < n; j++) {
    const th = (j * 2.399) % TAU, u = ((j * 0.618) % 1) * 0.95 + 0.02;
    const a = th + phi, c = Math.cos(a);
    if (c <= 0.1) continue;
    const p = ringPoint(pot, u, a);
    const [x, y] = P(p.x, p.y);
    g.beginPath(); g.ellipse(x, y, 3.2 * k * size * c, 2.2 * k * size, 0, 0, TAU); g.fill();
  }
}

function drawBand(g, pot, P, s, phi) {
  const u0 = clamp(s.u - s.w / 2, 0, 1), u1 = clamp(s.u + s.w / 2, 0, 1);
  if (u1 <= u0) return;
  const n = 26, R0 = radiusAt(pot, u0), R1 = radiusAt(pot, u1);
  g.beginPath();
  for (let j = 0; j <= n; j++) { const a = -Math.PI / 2 + (Math.PI * j) / n; const p = ringPoint(pot, u0, a, R0); const [x, y] = P(p.x, p.y); j ? g.lineTo(x, y) : g.moveTo(x, y); }
  for (let j = n; j >= 0; j--) { const a = -Math.PI / 2 + (Math.PI * j) / n; const p = ringPoint(pot, u1, a, R1); const [x, y] = P(p.x, p.y); g.lineTo(x, y); }
  g.closePath();
  if (PAINTS[s.color].rainbow) {
    const [x0] = P(-RMAX, 0), [x1] = P(RMAX, 0);
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    // the rainbow turns with the pot
    for (let i = 0; i <= 12; i++) gr.addColorStop(i / 12, RAINBOW[Math.abs(Math.floor(i + phi * 2)) % RAINBOW.length]);
    g.fillStyle = gr;
  } else g.fillStyle = PAINTS[s.color].c;
  g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(36,22,63,0.22)'; g.stroke();
}

function drawStroke(g, pot, P, s, phi, k) {
  const p = s.pts;
  const rb = PAINTS[s.color].rainbow;
  g.lineWidth = s.w * k;
  g.strokeStyle = PAINTS[s.color].c;
  let open = false;
  if (!rb) g.beginPath();
  for (let i = 0; i < p.length; i += 2) {
    const a = p[i] + phi, u = p[i + 1];
    if (Math.cos(a) <= 0.03) { open = false; continue; }
    const q = ringPoint(pot, u, a);
    const [x, y] = P(q.x, q.y);
    if (rb) {
      if (open) { g.lineTo(x, y); g.strokeStyle = RAINBOW[Math.floor(i / 8) % RAINBOW.length]; g.stroke(); }
      g.beginPath(); g.moveTo(x, y); open = true;
    } else {
      if (open) g.lineTo(x, y); else g.moveTo(x, y);
      open = true;
    }
  }
  if (!rb) g.stroke();
  if (p.length === 2 && Math.cos(p[0] + phi) > 0.03) {
    const q = ringPoint(pot, p[1], p[0] + phi); const [x, y] = P(q.x, q.y);
    g.fillStyle = PAINTS[s.color].c; g.beginPath(); g.arc(x, y, s.w * k / 2, 0, TAU); g.fill();
  }
}

// --- stickers ---------------------------------------------------------------------------
/** A sticker centred at 0,0 about `s` units across (white border, navy outline). */
export function drawSticker(g, kind, s, t = 0) {
  if (art('prop/pottery-sticker-' + kind)) { drawArt(g, 'prop/pottery-sticker-' + kind, 0, 0, s * 1.15, s * 1.15); return; }
  g.save();
  const u = s / 44;
  g.scale(u, u);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // every sticker: draw the shape twice, first fat white (the sticker border), then coloured
  const twice = (path, fill, lw = 3) => {
    path(); g.lineWidth = 9; g.strokeStyle = '#ffffff'; g.stroke(); g.fillStyle = '#ffffff'; g.fill();
    path(); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = NAVY; g.stroke();
  };
  switch (kind) {
    case 'heart':
      g.save(); g.scale(1, 1);
      twice(() => { g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(-26, -2, -16, -22, 0, -9); g.bezierCurveTo(16, -22, 26, -2, 0, 16); g.closePath(); }, '#ff5fa2');
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-8, -7, 4, 3, -0.6, 0, TAU); g.fill();
      g.restore(); break;
    case 'star':
      twice(() => { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 20, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 1); } g.closePath(); }, '#ffd23f');
      break;
    case 'flower':
      twice(() => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; g.moveTo(Math.cos(a) * 11 + 8.5, Math.sin(a) * 11); g.arc(Math.cos(a) * 11, Math.sin(a) * 11, 8.5, 0, TAU); } }, '#ff8fcf', 2.5);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      break;
    case 'butterfly':
      twice(() => { g.beginPath(); g.ellipse(-10, -7, 11, 9, -0.5, 0, TAU); g.moveTo(21, -7); g.ellipse(10, -7, 11, 9, 0.5, 0, TAU); g.moveTo(-1, 9); g.ellipse(-8, 9, 7, 6, 0.4, 0, TAU); g.moveTo(15, 9); g.ellipse(8, 9, 7, 6, -0.4, 0, TAU); }, '#b98bff', 2.5);
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, 1, 3, 13, 0, 0, TAU); g.fill();
      g.lineWidth = 2; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(-1, -11); g.quadraticCurveTo(-4, -18, -8, -19); g.moveTo(1, -11); g.quadraticCurveTo(4, -18, 8, -19); g.stroke();
      break;
    case 'rainbow': {
      twice(() => { g.beginPath(); g.arc(0, 8, 21, Math.PI, 0); g.lineTo(9, 8); g.arc(0, 8, 9, 0, Math.PI, true); g.closePath(); }, '#ffffff', 2.5);
      const cs = ['#ff4d6d', '#ffd23f', '#5ddc6a', '#3fa7ff'];
      cs.forEach((c, i) => { g.beginPath(); g.arc(0, 8, 18.5 - i * 3, Math.PI, 0); g.lineWidth = 3.2; g.strokeStyle = c; g.stroke(); });
      g.fillStyle = '#fff'; g.lineWidth = 2; g.strokeStyle = NAVY;
      for (const sx of [-15, 15]) { g.beginPath(); g.arc(sx - 4, 10, 5, 0, TAU); g.arc(sx + 3, 9, 6, 0, TAU); g.fill(); g.stroke(); }
      break;
    }
    case 'moon':
      twice(() => { g.beginPath(); g.arc(0, 0, 19, 0.6, TAU - 0.6 + 0.0001, false); g.quadraticCurveTo(-2, 0, Math.cos(0.6) * 19, Math.sin(0.6) * 19); g.closePath(); }, '#ffe066');
      g.fillStyle = NAVY; g.beginPath(); g.arc(-8, -2, 2, 0, TAU); g.fill();
      g.lineWidth = 1.8; g.strokeStyle = NAVY; g.beginPath(); g.arc(-7, 5, 3.5, 0.2, Math.PI - 0.2); g.stroke();
      break;
    case 'cat':
      twice(() => { g.beginPath(); g.moveTo(-17, -4); g.lineTo(-15, -20); g.lineTo(-5, -12); g.lineTo(5, -12); g.lineTo(15, -20); g.lineTo(17, -4); g.quadraticCurveTo(19, 16, 0, 16); g.quadraticCurveTo(-19, 16, -17, -4); g.closePath(); }, '#ffab5e');
      g.fillStyle = NAVY; g.beginPath(); g.arc(-7, 0, 2.4, 0, TAU); g.arc(7, 0, 2.4, 0, TAU); g.fill();
      g.fillStyle = '#ff6f9a'; g.beginPath(); g.moveTo(-2.5, 5); g.lineTo(2.5, 5); g.lineTo(0, 8); g.closePath(); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = NAVY; g.beginPath(); g.moveTo(-6, 7); g.lineTo(-15, 6); g.moveTo(6, 7); g.lineTo(15, 6); g.stroke();
      break;
    case 'fish':
      twice(() => { g.beginPath(); g.ellipse(-3, 0, 15, 11, 0, 0, TAU); g.moveTo(10, 0); g.lineTo(21, -10); g.lineTo(21, 10); g.closePath(); }, '#4fb8ff');
      g.fillStyle = NAVY; g.beginPath(); g.arc(-10, -2, 2.3, 0, TAU); g.fill();
      g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(-1, 0, 6, -1, 1); g.stroke();
      break;
    case 'sun':
      twice(() => { g.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 14 : 21, a = (i * Math.PI) / 8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }, '#ff9f1c');
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      g.fillStyle = NAVY; g.beginPath(); g.arc(-4, -2, 1.8, 0, TAU); g.arc(4, -2, 1.8, 0, TAU); g.fill();
      g.lineWidth = 1.8; g.beginPath(); g.arc(0, 2, 4.5, 0.3, Math.PI - 0.3); g.stroke();
      break;
    case 'strawberry':
      twice(() => { g.beginPath(); g.moveTo(0, 19); g.bezierCurveTo(-22, 4, -16, -12, 0, -10); g.bezierCurveTo(16, -12, 22, 4, 0, 19); g.closePath(); }, '#ff4d5e');
      g.fillStyle = '#4fd98a'; g.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI + (i / 4) * Math.PI; g.lineTo(Math.cos(a) * 10, -11 + Math.sin(a) * 5 - (i % 2) * 3); } g.closePath(); g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
      g.fillStyle = '#fff3b0'; for (const [x, y] of [[-6, -2], [5, -1], [-1, 5], [-7, 7], [7, 7], [0, 12]]) { g.beginPath(); g.ellipse(x, y, 1.4, 2, 0, 0, TAU); g.fill(); }
      break;
    default:
      drawHeartShape(g, 30, '#ff5fa2');
  }
  g.restore();
}

