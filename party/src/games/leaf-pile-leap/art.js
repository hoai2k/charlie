// Leaf Pile Leap: drawing helpers. Every piece uses its generated art when the key is in
// assets/art/index.json (see the leaf-pile-leap section of image-requests.md) and a
// procedural stand-in until then. Navy outlines, warm autumn colours, no text.
import { W, H } from '../../engine/canvas.js';
import { art } from '../../engine/art.js';
import * as ui from '../../engine/ui.js';
import { TAU, rand } from '../../engine/util.js';

export const NAVY = '#24163f';
// leaf colours (rows of prop/llp-leaves): red, orange, gold, brown
export const LEAF_COLS = [['#e8483a', '#ff9a7a'], ['#f5862a', '#ffc27a'], ['#f2bd2c', '#ffe58f'], ['#b8703a', '#e0a46a']];
const COL_W = [0.3, 0.36, 0.25, 0.09];

/** A random leaf kind: shape (0..3) + 4 * colour (0..3). */
export function leafKind() {
  let r = Math.random(), c = 0;
  while (c < 3 && r > COL_W[c]) { r -= COL_W[c]; c++; }
  return (Math.random() * 4 | 0) + c * 4;
}
export const leafColor = (kind) => LEAF_COLS[kind >> 2][0];

// --- leaves -----------------------------------------------------------------
const LEAF_PX = 72;
const leafCache = [];
function leafPath(g, shape, r) {
  g.beginPath();
  if (shape === 0) {          // maple: five pointy lobes
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? r * 0.42 : r * (i === 4 || i === 6 ? 0.7 : 1);
      if (i === 5) { g.lineTo(0, r * 0.45); continue; }   // the notch over the stem
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.95;
      if (!i) g.moveTo(x, y); else g.lineTo(x, y);
    }
  } else if (shape === 1) {   // oak: wavy oval
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * TAU, wv = 1 + 0.13 * Math.sin(a * 7);
      const x = Math.cos(a) * r * 0.62 * wv, y = Math.sin(a) * r * 0.98 * wv;
      if (!i) g.moveTo(x, y); else g.lineTo(x, y);
    }
  } else if (shape === 2) {   // round birch leaf with a little tip
    g.moveTo(0, -r);
    g.bezierCurveTo(r * 0.95, -r * 0.55, r * 0.85, r * 0.75, 0, r * 0.8);
    g.bezierCurveTo(-r * 0.85, r * 0.75, -r * 0.95, -r * 0.55, 0, -r);
  } else {                    // long slim leaf
    g.moveTo(0, -r);
    g.quadraticCurveTo(r * 0.5, 0, 0, r * 0.85);
    g.quadraticCurveTo(-r * 0.5, 0, 0, -r);
  }
  g.closePath();
}
function leafCanvas(kind) {
  if (leafCache[kind]) return leafCache[kind];
  const c = document.createElement('canvas'); c.width = c.height = LEAF_PX;
  const g = c.getContext('2d'), r = LEAF_PX * 0.4, [fill, light] = LEAF_COLS[kind >> 2];
  g.translate(LEAF_PX / 2, LEAF_PX / 2);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // stem
  g.strokeStyle = NAVY; g.lineWidth = 6; g.beginPath(); g.moveTo(0, r * 0.6); g.lineTo(2, r * 1.15); g.stroke();
  g.strokeStyle = fill; g.lineWidth = 3; g.beginPath(); g.moveTo(0, r * 0.6); g.lineTo(2, r * 1.12); g.stroke();
  leafPath(g, kind & 3, r);
  g.fillStyle = fill; g.fill();
  g.save(); g.clip(); g.fillStyle = light; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.3, r * 0.45, r * 0.6, -0.4, 0, TAU); g.fill(); g.restore();
  leafPath(g, kind & 3, r);
  g.lineWidth = 3.2; g.strokeStyle = NAVY; g.stroke();
  // veins
  g.strokeStyle = light; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, r * 0.6); g.lineTo(0, -r * 0.7);
  if ((kind & 3) === 0) { g.moveTo(0, 0); g.lineTo(-r * 0.6, -r * 0.35); g.moveTo(0, 0); g.lineTo(r * 0.6, -r * 0.35); }
  else { g.moveTo(0, -r * 0.1); g.lineTo(-r * 0.3, -r * 0.4); g.moveTo(0, r * 0.15); g.lineTo(r * 0.3, -r * 0.15); }
  g.stroke();
  return (leafCache[kind] = c);
}

/** One leaf, centred at (x, y), `size` px across, turned `rot` in the plane (never squashed). */
export function drawLeaf(g, kind, x, y, size, rot = 0, alpha = 1) {
  const atlas = art('prop/llp-leaves');
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  if (alpha < 1) g.globalAlpha *= alpha;
  if (atlas) {
    const cw = atlas.width / 4, ch = atlas.height / 4;
    g.drawImage(atlas, (kind & 3) * cw, (kind >> 2) * ch, cw, ch, -size / 2, -size / 2, size, size);
  } else g.drawImage(leafCanvas(kind), -size / 2, -size / 2, size, size);
  g.restore();
}

// --- the giant pile ---------------------------------------------------------
export const PILE_FULL_W = 680;
let pileCanvas = null;
const PC_W = 760, PC_H = 470, PC_BASE = 440;   // canvas size and its base line
/** The dome's top edge height (0..1 of its height) at u = -1..1 across. */
export const domeTop = (u) => Math.pow(Math.max(0, 1 - u * u), 0.62);
function buildPile() {
  const c = document.createElement('canvas'); c.width = PC_W; c.height = PC_H;
  const g = c.getContext('2d'), cx = PC_W / 2, hw = 330, hh = 372;
  g.translate(cx, PC_BASE);
  // the dome body
  g.beginPath(); g.moveTo(-hw, 0);
  for (let i = 0; i <= 40; i++) { const u = -1 + (i / 40) * 2; g.lineTo(u * hw, -domeTop(u) * hh); }
  g.lineTo(hw, 0); g.closePath();
  const grd = g.createLinearGradient(0, -hh, 0, 0); grd.addColorStop(0, '#f7a23a'); grd.addColorStop(1, '#c9582a');
  g.fillStyle = grd; g.fill(); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
  // leaves all over it (back to front), plus a ragged ring on the grass
  const spots = [];
  for (let i = 0; i < 190; i++) {
    const u = rand(-1, 1), top = domeTop(u) * hh;
    spots.push({ x: u * hw * 0.96, y: -rand(0, top - 20) + 4, k: leafKind(), s: rand(64, 88), r: rand(TAU) });
  }
  for (let i = 0; i < 30; i++) { const u = -1 + (i / 29) * 2; spots.push({ x: u * hw * 0.97, y: -domeTop(u) * hh + rand(4, 16), k: leafKind(), s: rand(66, 86), r: rand(TAU) }); }
  for (let i = 0; i < 26; i++) spots.push({ x: rand(-hw - 10, hw + 10), y: rand(-4, 14), k: leafKind(), s: rand(60, 76), r: rand(TAU) });
  spots.sort((a, b) => a.y - b.y);
  for (const s of spots) drawLeaf(g, s.k, s.x, s.y, s.s, s.r);
  // a soft light on the top-left
  g.globalCompositeOperation = 'source-atop';
  const lg = g.createRadialGradient(-110, -260, 20, -110, -260, 300);
  lg.addColorStop(0, 'rgba(255,240,190,0.35)'); lg.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = lg; g.fillRect(-PC_W / 2, -PC_BASE, PC_W, PC_H);
  g.globalCompositeOperation = 'source-over';
  pileCanvas = c;
}

/** Stage art key (1..4) for a fill 0..1. */
export const pileStage = (f) => (f < 0.25 ? 1 : f < 0.5 ? 2 : f < 0.75 ? 3 : 4);

/** The giant pile, base centred at (x, y), `w` px wide; sq = squash (+ wide, - tall); wob = jiggle. */
export function drawPile(g, x, y, w, f, sq = 0, wob = 0) {
  const img = art('prop/llp-pile-' + pileStage(f));
  g.save(); g.translate(x, y);
  g.scale(1 + sq * 0.12, 1 - sq * 0.14);
  if (wob) g.transform(1, 0, Math.sin(wob * 30) * wob * 0.08, 1, 0, 0);
  if (img) {
    const h = w * img.height / img.width;
    g.drawImage(img, -w / 2, -h, w, h);
  } else {
    if (!pileCanvas) buildPile();
    const s = w / PILE_FULL_W;
    g.drawImage(pileCanvas, -PC_W / 2 * s, -PC_BASE * s, PC_W * s, PC_H * s);
  }
  g.restore();
}

// --- Granny's neat little pile ------------------------------------------------
let neatCanvas = null;
function buildNeat() {
  const c = document.createElement('canvas'); c.width = 240; c.height = 140;
  const g = c.getContext('2d');
  g.translate(120, 128);
  g.beginPath(); g.ellipse(0, 0, 100, 96, 0, Math.PI, TAU); g.closePath();
  g.fillStyle = '#e6893a'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  // tidy rings of leaves, like a cake
  for (let row = 0; row < 5; row++) {
    const ry = -8 - row * 19, half = Math.sqrt(Math.max(0, 1 - ((row * 19 + 8) / 96) ** 2)) * 96;
    const n = Math.max(1, Math.round(half / 15));
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : -half + 12 + (i / (n - 1)) * (half * 2 - 24);
      drawLeaf(g, (i + row) % 4 + ((row % 3) * 4), x, ry, 34, (i % 2 ? 0.3 : -0.3) + row * 0.2);
    }
  }
  // the little label stake with a bow
  g.lineWidth = 4; g.strokeStyle = NAVY; g.fillStyle = '#fff6e0';
  g.beginPath(); g.moveTo(92, 6); g.lineTo(92, -56); g.stroke();
  ui.roundRect(g, 74, -86, 40, 30, 6); g.fill(); g.stroke();
  g.fillStyle = '#ff7ab8'; g.beginPath(); g.moveTo(92, -56); g.lineTo(80, -64); g.lineTo(80, -48); g.closePath(); g.moveTo(92, -56); g.lineTo(104, -64); g.lineTo(104, -48); g.closePath(); g.fill(); g.stroke();
  neatCanvas = c;
}
/** Granny's pile at (x, y) (base centre), k = 0 (all thrown about) .. 1 (perfectly neat). */
export function drawNeatPile(g, x, y, k, sq = 0) {
  if (k <= 0.02) return;
  const img = art('prop/llp-granny-pile');
  g.save(); g.translate(x, y); g.scale((0.55 + 0.45 * k) * (1 + sq * 0.15), (0.2 + 0.8 * k) * (1 - sq * 0.15));
  if (img) { const w = 200, h = w * img.height / img.width; g.drawImage(img, -w / 2, -h, w, h); }
  else { if (!neatCanvas) buildNeat(); g.drawImage(neatCanvas, -100, -107, 200, 117); }
  g.restore();
}

// --- the rake -----------------------------------------------------------------
/** A rake from the handle end (x0, y0) to the head (x1, y1). */
export function drawRake(g, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  const img = art('prop/llp-rake');
  g.save(); g.translate(x0, y0); g.rotate(ang);
  if (img) {
    const L = len * 1.12, h = L * img.height / img.width;
    g.drawImage(img, -(35 / 360) * L, -(68 / 140) * h, L, h);
    g.restore(); return;
  }
  g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 11; g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.82, 0); g.stroke();
  g.strokeStyle = '#c98a4b'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.82, 0); g.stroke();
  g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.beginPath(); g.moveTo(1, 0); g.lineTo(len * 0.14, 0); g.stroke();
  // fan of springy tines
  const n = len * 0.82, hs = Math.max(26, len * 0.3);
  for (const [c, w] of [[NAVY, 7], ['#e8483a', 3.5]]) {
    g.strokeStyle = c; g.lineWidth = w;
    for (let i = 0; i < 7; i++) {
      const d = -0.62 + (i / 6) * 1.24;
      g.beginPath(); g.moveTo(n, 0); g.lineTo(n + Math.cos(d) * hs, Math.sin(d) * hs); g.stroke();
    }
    g.beginPath(); g.arc(n, 0, hs * 0.55, -0.62, 0.62); g.stroke();
  }
  g.restore();
}

// --- squirrel -----------------------------------------------------------------
/** A squirrel at its feet (0, 0) facing right: frame 0/1 run, 2 scared. ~120 px long. */
export function drawSquirrel(g, frame, t) {
  const key = frame === 2 ? 'prop/llp-squirrel-scared' : 'prop/llp-squirrel-run-' + (frame + 1);
  const img = art(key);
  if (img) { const w = 128, h = w * img.height / img.width; g.drawImage(img, -w / 2, -h, w, h); return; }
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 3.5; g.strokeStyle = NAVY;
  const body = '#c8662e', light = '#f3d2a2', scared = frame === 2, run = frame === 0;
  const fluff = scared ? 1.25 : 1;
  // tail (a big curl behind)
  g.fillStyle = body;
  g.save(); g.translate(-34, -34); g.rotate(scared ? -0.5 : run ? 0.55 : -0.15); g.scale(fluff, fluff);
  g.beginPath(); g.moveTo(8, 10); g.bezierCurveTo(-40, 20, -54, -30, -30, -56); g.bezierCurveTo(-10, -76, 22, -60, 12, -40);
  g.bezierCurveTo(4, -30, -14, -40, -16, -28); g.bezierCurveTo(-18, -10, 6, -6, 8, 10); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = light; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(-28, -40, 9, 14, 0.4, 0, TAU); g.fill(); g.globalAlpha = 1;
  g.restore();
  // legs
  g.fillStyle = body;
  const st = run ? 14 : -4;
  for (const [lx, ly] of [[-18 - st, 0], [22 + st, 0]]) { g.beginPath(); g.ellipse(lx, ly - 5, 10, 6, 0, 0, TAU); g.fill(); g.stroke(); }
  // body
  g.save(); g.translate(0, -26); g.rotate(run ? 0.12 : scared ? -0.25 : -0.05);
  g.beginPath(); g.ellipse(0, 0, run ? 34 : 28, 21, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = light; g.beginPath(); g.ellipse(10, 6, 16, 11, 0.2, 0, TAU); g.fill();
  // head
  g.fillStyle = body; g.beginPath(); g.ellipse(30, -16, 18, 16, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(22, -28); g.lineTo(20, -46); g.lineTo(32, -31); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = light; g.beginPath(); g.ellipse(38, -10, 9, 7, 0, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(47, -14, 3.5, 0, TAU); g.fill();
  // eye: a cheeky glint, or wide when scared
  if (scared) { g.fillStyle = '#fff'; g.beginPath(); g.arc(32, -20, 7, 0, TAU); g.fill(); g.stroke(); g.fillStyle = NAVY; g.beginPath(); g.arc(34, -20, 3, 0, TAU); g.fill();
    g.fillStyle = '#ff6f8f'; g.beginPath(); g.ellipse(42, -5, 5, 4, 0, 0, TAU); g.fill(); g.stroke(); }
  else { g.fillStyle = NAVY; g.beginPath(); g.arc(33, -20, 4, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(34.5, -21.5, 1.4, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(38, -6); g.quadraticCurveTo(42, -2, 46, -6); g.stroke(); }
  g.restore();
}

// --- the stepladder -------------------------------------------------------------
export const LADDER_H = 440;
// The authored front top step, measured on the 300 × 640 canvas (151, 78).
export const LADDER_TOP = { x: (151 - 150) * LADDER_H / 640, height: (640 - 78) * LADDER_H / 640 };
/** The stepladder standing at (x, y) (base centre); k 0..1 pops it up. */
export function drawLadder(g, x, y, k = 1) {
  if (k <= 0.01) return;
  const img = art('prop/llp-ladder');
  g.save(); g.translate(x, y); g.scale(1, k);
  if (img) { const h = LADDER_H, w = h * img.width / img.height; g.drawImage(img, -w / 2, -h, w, h); g.restore(); return; }
  const Hh = LADDER_H;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // back legs
  for (const [c, w] of [[NAVY, 16], ['#b4532a', 9]]) {
    g.strokeStyle = c; g.lineWidth = w;
    g.beginPath(); g.moveTo(96, 0); g.lineTo(44, -Hh + 10); g.moveTo(66, 4); g.lineTo(30, -Hh + 14); g.stroke();
  }
  // front rails and rungs
  for (const [c, w] of [[NAVY, 18], ['#e0703a', 10]]) {
    g.strokeStyle = c; g.lineWidth = w;
    g.beginPath(); g.moveTo(-74, 0); g.lineTo(-34, -Hh); g.moveTo(42, 0); g.lineTo(28, -Hh); g.stroke();
    for (let i = 1; i <= 6; i++) {
      const v = i / 6.6, yy = -Hh * v, xl = -74 + 40 * v, xr = 42 - 14 * v;
      g.beginPath(); g.moveTo(xl, yy); g.lineTo(xr, yy); g.stroke();
    }
  }
  // top step
  g.fillStyle = '#f08a4a'; g.strokeStyle = NAVY; g.lineWidth = 5;
  ui.roundRect(g, -48, -Hh - 16, 100, 22, 8); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(2 + Math.cos(i * TAU / 5) * 7, -Hh - 5 + Math.sin(i * TAU / 5) * 5, 3.2, 0, TAU); g.fill(); }
  g.restore();
}

// --- Granny Goose ---------------------------------------------------------------
const GRANNY_H = 232;
export const GRANNY_ART = {
  water: ['prop/mm-granny'],
  doze: ['prop/llp-granny-doze', 'prop/mm-granny-huff'],
  gasp: ['prop/mm-granny-gasp'],
  huff: ['prop/mm-granny-huff'],
  laugh: ['prop/llp-granny-laugh', 'prop/mm-granny-gasp'],
};
/** Granny at her feet (x, y); facing 1 = right. Returns the top of her head. */
export function drawGranny(g, x, y, state, facing, t, bob = 0) {
  const keys = GRANNY_ART[state] || GRANNY_ART.water;
  let img = null; for (const k of keys) { img = art(k); if (img) break; }
  g.save(); g.translate(x, y - bob); g.scale(facing, 1);
  if (img) {
    const w = GRANNY_H * img.width / img.height;
    g.drawImage(img, -w / 2, -GRANNY_H, w, GRANNY_H);
  } else {
    // a plain little goose until her art loads
    g.lineWidth = 4; g.strokeStyle = NAVY; g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(0, -80, 62, 56, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#c9b3ff'; g.beginPath(); g.ellipse(14, -64, 40, 40, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(36, -190, 30, 30, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ff9a2e'; g.beginPath(); g.moveTo(60, -196); g.lineTo(96, -186); g.lineTo(60, -176); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff9ad0'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(14 + i * 14, -218, 9, 0, TAU); g.fill(); g.stroke(); }
  }
  g.restore();
  return y - bob - GRANNY_H;
}

// --- background -------------------------------------------------------------------
// Stand-in until bg/leaf-pile-leap lands: Fairy Hide and Seek's garden, warmed to autumn,
// with autumn trees, a garden gate and a flower bed drawn over it.
let bgCanvas = null;
export const GATE = { x: 1690, y: 352 };
function treeBlob(g, x, y, r, c1, c2) {
  g.fillStyle = c1; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath();
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; g.moveTo(x + Math.cos(a) * r * 0.62 + r * 0.42, y + Math.sin(a) * r * 0.5); g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.5, r * 0.42, 0, TAU); }
  g.fill(); g.stroke(); g.fill();
  g.fillStyle = c2; g.globalAlpha = 0.7; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, TAU); g.fill(); g.globalAlpha = 1;
}
function buildBg() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const src = art('bg/fairy-hide-seek');
  if (src) {
    g.drawImage(src, 0, 0, W, H);
    // autumn wash: greens turn gold
    g.globalCompositeOperation = 'color';
    g.fillStyle = 'rgba(214,150,52,0.42)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(255,214,160,0.35)'; g.fillRect(0, 300, W, H - 300);
    g.globalCompositeOperation = 'source-over';
  } else {
    ui.sky(g, '#8fd0ff', '#ffe9c8', 360);
    g.fillStyle = '#b9b452'; g.fillRect(0, 300, W, H - 300);
    g.fillStyle = '#c4bd5c'; for (let i = 0; i < 9; i++) g.fillRect(0, 330 + i * 86, W, 40);
  }
  // autumn trees along the top
  const cols = [['#e8603a', '#ffb07a'], ['#f59a2a', '#ffd27a'], ['#f2c12c', '#fff09a'], ['#d9482f', '#ff9a7a']];
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 230 + (i % 2) * 40, y = 120 + (i % 3) * 26, r = 140 + (i % 2) * 30;
    g.fillStyle = '#7a4a2a'; g.strokeStyle = NAVY; g.lineWidth = 4; ui.roundRect(g, x - 16, y + 30, 32, 170, 10); g.fill(); g.stroke();
    treeBlob(g, x, y, r, ...cols[i % 4]);
  }
  // the fence line again in front of the trees (cream pickets), with the garden gate
  const fy = 330;
  g.fillStyle = '#fff8ea'; g.strokeStyle = NAVY; g.lineWidth = 3;
  ui.roundRect(g, 0, fy - 46, W, 14, 4); g.fill(); g.stroke();
  ui.roundRect(g, 0, fy - 10, W, 14, 4); g.fill(); g.stroke();
  for (let x = 6; x < W; x += 52) {
    if (Math.abs(x + 16 - GATE.x) < 78) continue;
    g.beginPath(); g.moveTo(x, fy + 26); g.lineTo(x, fy - 66); g.lineTo(x + 16, fy - 84); g.lineTo(x + 32, fy - 66); g.lineTo(x + 32, fy + 26); g.closePath(); g.fill(); g.stroke();
  }
  // gate: posts, an arch and a half-open little door
  g.fillStyle = '#fff8ea';
  for (const px of [GATE.x - 78, GATE.x + 62]) { ui.roundRect(g, px, fy - 120, 18, 150, 6); g.fill(); g.stroke(); }
  g.lineWidth = 12; g.strokeStyle = NAVY; g.beginPath(); g.arc(GATE.x - 1, fy - 112, 72, Math.PI, TAU); g.stroke();
  g.lineWidth = 6; g.strokeStyle = '#f08a4a'; g.stroke();
  g.lineWidth = 3; g.strokeStyle = NAVY; g.fillStyle = '#ffe2c4';
  g.beginPath(); g.moveTo(GATE.x - 60, fy + 24); g.lineTo(GATE.x - 60, fy - 74); g.lineTo(GATE.x - 10, fy - 60); g.lineTo(GATE.x - 10, fy + 34); g.closePath(); g.fill(); g.stroke();
  // autumn flower bed in the right-hand corner (Granny waters it)
  g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(1900, 470, 110, 70, 0, 0, TAU); g.fill(); g.stroke();
  const fl = ['#ff7a3a', '#ffd23f', '#c86ad8', '#ff5a6a', '#ffffff'];
  for (let i = 0; i < 16; i++) {
    const x = 1820 + (i % 4) * 30 + (i % 2) * 10, y = 420 + Math.floor(i / 4) * 26;
    g.fillStyle = '#5d8a3a'; g.beginPath(); g.ellipse(x, y + 6, 16, 9, 0, 0, TAU); g.fill();
    g.fillStyle = fl[i % fl.length];
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6; g.beginPath(); g.arc(x + Math.cos(a) * 8, y - 6 + Math.sin(a) * 8, 6, 0, TAU); g.fill(); }
    g.fillStyle = '#7a4a2a'; g.beginPath(); g.arc(x, y - 6, 4, 0, TAU); g.fill();
  }
  // a few painted leaves near the edges
  for (let i = 0; i < 26; i++) {
    const x = i % 2 ? rand(20, 260) : rand(W - 260, W - 20), y = rand(560, 1060);
    drawLeaf(g, leafKind(), x, y, rand(38, 48), rand(TAU), 0.75);
  }
  bgCanvas = c;
}
/** The whole background (built once the reused art is in; rebuilt never). */
export function drawBackground(g) {
  const bg = art('bg/leaf-pile-leap');
  if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
  if (!bgCanvas || (!bgCanvas._src && art('bg/fairy-hide-seek'))) { buildBg(); bgCanvas._src = !!art('bg/fairy-hide-seek'); }
  g.drawImage(bgCanvas, 0, 0);
}

/** Little leaves tucked round a head poking out of the pile (a collar that hides the cut). */
export function drawCollar(g, x, y, w, seed, t) {
  for (let i = 0; i < 7; i++) {
    const u = -1 + (i / 6) * 2, s = ((seed * 7 + i * 13) % 16);
    drawLeaf(g, s, x + u * w * 0.5, y + 4 - Math.abs(u) * -6 + Math.sin(t * 3 + i) * 1.5, 40 + (i % 3) * 6, u * 1.2 + seed);
  }
}
