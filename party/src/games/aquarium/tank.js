// Dream Aquarium: the fish tank itself (geometry, room backdrop, water, sand,
// glass front, lid and cabinet). Static parts are painted once into cached
// canvases; the water's light rays and the sand wipe are drawn per frame.
//
// Depth: things on the sand stand on a base line from y 748 (back) to y 878
// (front); d = 0..1 along it gives a scale of 0.78..1.05. Fish carry their own
// depth `fd` (0 back .. 1 front) and sort against decor by the same key.
import { W, H } from '../../engine/canvas.js';
import { art } from '../../engine/art.js';
import * as ui from '../../engine/ui.js';
import { TAU, clamp, lerp } from '../../engine/util.js';
import { drawStarShape, drawHeartShape } from '../../engine/emotes.js';

export const NAVY = '#24163f';
export const WATER = { x0: 290, x1: 1630, y0: 196, y1: 890 };
export const LID = { x0: 262, x1: 1658, y0: 118, y1: 178 };
export const BASE_Y0 = 748, BASE_Y1 = 878;          // decor base line, back .. front
export const SAND_TOP = 732;
export const SWITCH = { x: 1584, y: 148, r: 26 };   // day / night button on the lid
export const SWITCH_HIT = { x: SWITCH.x - 40, y: SWITCH.y - 34, w: 80, h: 68 };

export const depthOfY = (y) => clamp((y - BASE_Y0) / (BASE_Y1 - BASE_Y0), 0, 1);
export const yOfDepth = (d) => lerp(BASE_Y0, BASE_Y1, d);
export const decorScale = (d) => 0.78 + 0.27 * d;
export const fishScale = (fd) => 0.72 + 0.33 * fd;
export const inWater = (x, y, pad = 0) => x >= WATER.x0 + pad && x <= WATER.x1 - pad && y >= WATER.y0 + pad && y <= WATER.y1 - pad;
export const sandEdge = (x) => SAND_TOP + Math.sin(x * 0.011) * 6 + Math.sin(x * 0.027 + 1) * 4;

/** '#rrggbb' lightened (k > 0) or darkened (k < 0). */
const shadeCache = new Map();
export function shade(c, k) {
  const key = c + k;
  let s = shadeCache.get(key);
  if (s) return s;
  const v = parseInt(c.slice(1), 16), r = (v >> 16) & 255, gg = (v >> 8) & 255, b = v & 255;
  const f = (x) => Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k));
  s = `rgb(${f(r)},${f(gg)},${f(b)})`;
  shadeCache.set(key, s);
  return s;
}
export function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// --- sands ------------------------------------------------------------------------
export const SANDS = [
  { id: 'golden', name: 'Golden sand', base: '#f6d891', dark: '#dcb36b', specks: ['#fff3c8', '#c99b52', '#ffffff'] },
  { id: 'pink', name: 'Pink sand', base: '#ffc8de', dark: '#f09ec2', specks: ['#ffffff', '#e57aa8', '#ffe3ef'] },
  { id: 'white', name: 'Pearl sand', base: '#fbf6ee', dark: '#e1d6c4', specks: ['#ffffff', '#cbbfa9', '#ffe9f4'] },
  { id: 'lilac', name: 'Lilac sand', base: '#dccbff', dark: '#b79ff0', specks: ['#ffffff', '#9a7fe0', '#f3ecff'] },
  { id: 'mint', name: 'Mint sand', base: '#c3f2dc', dark: '#8fd8b5', specks: ['#ffffff', '#5fbf93', '#e8fff4'] },
  { id: 'rainbow', name: 'Rainbow sand', base: '#fdeef5', dark: '#efd2e2', specks: ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'] },
  { id: 'starry', name: 'Starry sand', base: '#4a4890', dark: '#33316e', specks: ['#ffe680', '#ffffff', '#a9b8ff'], glitter: true },
];

const sandCache = new Map();
/** The sand band (whole tank width) for sand i, cached. */
export function sandCanvas(i) {
  let c = sandCache.get(i);
  if (c) return c;
  const s = SANDS[i], w = WATER.x1 - WATER.x0, h = WATER.y1 - SAND_TOP + 16;
  c = mk(w, h);
  const g = c.getContext('2d');
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += 10) g.lineTo(x, sandEdge(x + WATER.x0) - SAND_TOP + 8);
  g.lineTo(w, h); g.closePath();
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, s.dark); gr.addColorStop(0.35, s.base); gr.addColorStop(1, shade(s.base, s.glitter ? 0.08 : 0.25));
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  let seed = 7 + i * 31;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < 900; k++) {
    const x = rnd() * w, y = rnd() * h, r = 1 + rnd() * (s.id === 'rainbow' ? 3.2 : 2.2) * (0.5 + y / h);
    g.fillStyle = s.specks[Math.floor(rnd() * s.specks.length)];
    g.globalAlpha = 0.45 + rnd() * 0.5;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  // soft ripples in the sand
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const x = rnd() * w, y = 30 + rnd() * (h - 50), l = 30 + rnd() * 50;
    g.beginPath(); g.moveTo(x - l / 2, y); g.quadraticCurveTo(x, y - 6, x + l / 2, y); g.stroke();
  }
  g.restore();
  // outline of the sand's back edge
  g.beginPath();
  for (let x = 0; x <= w; x += 10) { const y = sandEdge(x + WATER.x0) - SAND_TOP + 8; x ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.stroke();
  sandCache.set(i, c);
  return c;
}
/** A small square swatch of sand i (palette icon). */
const swatchCache = new Map();
export function sandSwatch(i) {
  let c = swatchCache.get(i);
  if (c) return c;
  c = mk(80, 80);
  const g = c.getContext('2d'), src = sandCanvas(i);
  g.drawImage(src, 300, 60, 160, 100, 0, 0, 80, 80);
  swatchCache.set(i, c);
  return c;
}

// --- glow sprites -------------------------------------------------------------------------
const glowCache = new Map();
/** A soft radial glow (cached by '#rrggbb'). */
export function glowSprite(color) {
  let c = glowCache.get(color);
  if (!c) {
    c = mk(128, 128);
    const x = c.getContext('2d');
    const v = parseInt(color.slice(1), 16), r = (v >> 16) & 255, gg = (v >> 8) & 255, b = v & 255;
    const gr = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.4, `rgba(${r},${gg},${b},0.45)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
  }
  return c;
}
export function glow(g, color, x, y, r, alpha = 1) {
  if (alpha <= 0.01) return;
  g.save(); g.globalAlpha *= alpha; g.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); g.restore();
}

// --- room backdrop (cached) ---------------------------------------------------------------
let roomCache = null;
export function drawRoom(g) {
  if (!roomCache) {
    roomCache = mk(W, H);
    paintRoom(roomCache.getContext('2d'));
  }
  g.drawImage(roomCache, 0, 0, W, H);
}

function paintRoom(g) {
  const bg = art('bg/aquarium');
  if (bg) { g.drawImage(bg, 0, 0, W, H); }
  else {
    g.fillStyle = '#d9f6f2'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 96) { g.fillStyle = '#c4efe9'; g.fillRect(x, 0, 44, H); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x + 60, 0, 5, H); }
    // little bubbles and stars on the wallpaper
    g.save(); g.globalAlpha = 0.5;
    for (let y = 60, r = 0; y < 930; y += 110, r++) {
      for (let x = (r % 2) * 70 + 30; x < W; x += 140) {
        g.save(); g.translate(x, y);
        if ((x + y) % 3 === 0) drawStarShape(g, 16, '#ffffff');
        else { g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke(); g.beginPath(); g.arc(-3, -3, 2.5, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
        g.restore();
      }
    }
    g.restore();
    // wainscot and floor
    g.fillStyle = '#9fe0d8'; g.fillRect(0, 700, W, 236);
    g.fillStyle = '#ffffff'; g.fillRect(0, 692, W, 12);
    g.strokeStyle = 'rgba(36,22,63,0.18)'; g.lineWidth = 3;
    for (let x = 30; x < W; x += 120) { g.strokeRect(x, 724, 90, 180); }
    const fl = g.createLinearGradient(0, 930, 0, H);
    fl.addColorStop(0, '#e9b37a'); fl.addColorStop(1, '#d39558');
    g.fillStyle = fl; g.fillRect(0, 930, W, H - 930);
    g.strokeStyle = 'rgba(120,70,30,0.3)'; g.lineWidth = 2;
    for (let y = 958; y < H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = 'rgba(160,100,50,0.3)'; g.fillRect(0, 930, W, 8);
    // a shelf with a plant and a toy boat on the right
    g.save(); g.translate(1786, 560);
    ui.roundRect(g, -110, 0, 220, 18, 6); g.fillStyle = '#e8b989'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    // pot plant
    g.beginPath(); g.moveTo(-80, 0); g.lineTo(-74, -44); g.lineTo(-30, -44); g.lineTo(-24, 0); g.closePath(); g.fillStyle = '#ff8fb6'; g.fill(); g.lineWidth = 3.5; g.stroke();
    for (const [a, l] of [[-0.6, 60], [-0.2, 74], [0.25, 66], [0.65, 52]]) { g.save(); g.translate(-52, -44); g.rotate(a); g.beginPath(); g.ellipse(0, -l / 2, 11, l / 2, 0, 0, TAU); g.fillStyle = '#5fcf7c'; g.fill(); g.lineWidth = 3; g.stroke(); g.restore(); }
    // toy sailboat
    g.beginPath(); g.moveTo(10, -14); g.lineTo(96, -14); g.lineTo(84, 0); g.lineTo(22, 0); g.closePath(); g.fillStyle = '#3fa7ff'; g.fill(); g.lineWidth = 3.5; g.stroke();
    g.beginPath(); g.moveTo(52, -14); g.lineTo(52, -80); g.stroke();
    g.beginPath(); g.moveTo(55, -78); g.lineTo(86, -22); g.lineTo(55, -22); g.closePath(); g.fillStyle = '#fff4e6'; g.fill(); g.stroke();
    g.restore();
    // round porthole picture on the left wall, under the legend
    g.save(); g.translate(130, 560);
    g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.arc(0, 0, 54, 0, TAU); const sky = g.createLinearGradient(0, -54, 0, 54); sky.addColorStop(0, '#9fe3ff'); sky.addColorStop(0.62, '#d9f6ff'); sky.addColorStop(0.62, '#3fb5e6'); sky.addColorStop(1, '#2a8fd0'); g.fillStyle = sky; g.fill(); g.lineWidth = 4; g.stroke();
    g.beginPath(); g.arc(-16, -18, 13, 0, TAU); g.fillStyle = '#fff6a8'; g.fill();
    for (const a of [0, 1, 2, 3, 4, 5, 6, 7]) { const x = Math.cos(a / 8 * TAU) * 62, y = Math.sin(a / 8 * TAU) * 62; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fillStyle = '#fff4e6'; g.fill(); g.lineWidth = 2; g.stroke(); }
    g.restore();
  }
}

// --- water (back of the tank) ---------------------------------------------------------------
let waterCache = null;
function paintWater() {
  const w = WATER.x1 - WATER.x0, h = WATER.y1 - WATER.y0;
  const c = mk(w, h), g = c.getContext('2d');
  const img = art('bg/aquarium-water');
  if (img) { g.drawImage(img, 0, 0, w, h); return c; }
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#9be9f2'); gr.addColorStop(0.45, '#4fbde3'); gr.addColorStop(1, '#2a79c4');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // faint far-away hills, rocks and weeds
  g.fillStyle = 'rgba(40,110,190,0.35)';
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += 20) g.lineTo(x, h - 230 - Math.sin(x * 0.006) * 40 - Math.sin(x * 0.017) * 18);
  g.lineTo(w, h); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(40,120,170,0.35)'; g.lineCap = 'round';
  for (let k = 0; k < 16; k++) {
    const x = 40 + k * 84 + (k % 3) * 17, top = h - 330 - (k % 4) * 40;
    g.lineWidth = 12 - (k % 3) * 3;
    g.beginPath(); g.moveTo(x, h - 150);
    g.bezierCurveTo(x - 20, h - 220, x + 20, top + 60, x - 6, top); g.stroke();
  }
  g.fillStyle = 'rgba(30,90,170,0.3)';
  for (let k = 0; k < 8; k++) { g.beginPath(); g.ellipse(80 + k * 175, h - 175, 60 + (k % 3) * 20, 34, 0, 0, TAU); g.fill(); }
  return c;
}
export function drawWaterBack(g, t) {
  if (!waterCache) waterCache = paintWater();
  const { x0, y0, x1, y1 } = WATER;
  g.drawImage(waterCache, x0, y0, x1 - x0, y1 - y0);
  // swaying light rays from the surface
  g.save();
  g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {
    const bx = x0 + 120 + k * 200 + Math.sin(t * 0.3 + k * 1.7) * 40, sw = 50 + (k % 3) * 22;
    const lean = 160 + Math.sin(t * 0.21 + k) * 40;
    const a = 0.05 + 0.03 * Math.sin(t * 0.7 + k * 2.1);
    const gr = g.createLinearGradient(0, y0, 0, y1 - 120);
    gr.addColorStop(0, `rgba(255,255,255,${a * 2})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(bx, y0); g.lineTo(bx + sw, y0); g.lineTo(bx + sw * 2.2 + lean, y1 - 120); g.lineTo(bx + lean, y1 - 120); g.closePath(); g.fill();
  }
  g.restore();
}

/** The water surface line and caustic wiggles (drawn above the fish). */
export function drawSurface(g, t) {
  const { x0, y0, x1 } = WATER;
  g.save();
  g.beginPath();
  for (let x = x0; x <= x1; x += 12) { const y = y0 + Math.sin(x * 0.02 + t * 2.2) * 3 + Math.sin(x * 0.045 - t * 1.3) * 2; x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.lineTo(x1, y0 - 20); g.lineTo(x0, y0 - 20); g.closePath();
  g.fillStyle = 'rgba(220,250,255,0.55)'; g.fill();
  g.beginPath();
  for (let x = x0; x <= x1; x += 12) { const y = y0 + Math.sin(x * 0.02 + t * 2.2) * 3 + Math.sin(x * 0.045 - t * 1.3) * 2; x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
  // caustic sparkles just under the surface
  g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.lineCap = 'round';
  for (let k = 0; k < 18; k++) {
    const x = x0 + 40 + k * 72 + Math.sin(t * 0.8 + k) * 14, y = y0 + 22 + (k % 3) * 12;
    g.beginPath(); g.moveTo(x - 14, y); g.quadraticCurveTo(x, y - 6 - Math.sin(t * 2 + k) * 3, x + 14, y); g.stroke();
  }
  g.restore();
}

/** The sand (with an optional left-to-right wipe from the old colour). */
export function drawSand(g, idx, from, wipe) {
  const x = WATER.x0, y = SAND_TOP - 8;
  if (from !== null && from !== undefined && wipe < 1) g.drawImage(sandCanvas(from), x, y);
  g.save();
  if (wipe < 1) { g.beginPath(); g.rect(x, y, (WATER.x1 - WATER.x0) * wipe, 400); g.clip(); }
  g.drawImage(sandCanvas(idx), x, y);
  g.restore();
}

// --- glass, frame, lid and cabinet -----------------------------------------------------------------
export function drawTankFront(g, t, nightK) {
  const { x0, y0, x1, y1 } = WATER;
  // glass reflections
  g.save();
  g.beginPath(); g.rect(x0, LID.y1, x1 - x0, y1 - LID.y1); g.clip();
  g.globalAlpha = 0.16 * (1 - nightK * 0.6);
  g.fillStyle = '#ffffff';
  for (const [bx, w] of [[x0 + 90, 70], [x0 + 190, 22], [x1 - 330, 46], [x1 - 260, 16]]) {
    g.beginPath(); g.moveTo(bx, y1); g.lineTo(bx + w, y1); g.lineTo(bx + w + 260, LID.y1); g.lineTo(bx + 260, LID.y1); g.closePath(); g.fill();
  }
  g.restore();
  // frame pillars and bottom rim
  g.lineJoin = 'round';
  const rim = '#7fd8e0';
  for (const x of [x0 - 22, x1]) {
    ui.roundRect(g, x, LID.y1 - 4, 22, y1 - LID.y1 + 18, 8); g.fillStyle = rim; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + 5, LID.y1 + 6, 5, y1 - LID.y1 - 6);
  }
  ui.roundRect(g, x0 - 26, y1, x1 - x0 + 52, 18, 8); g.fillStyle = rim; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  // cabinet
  ui.roundRect(g, x0 - 40, y1 + 16, x1 - x0 + 80, 70, 10); g.fillStyle = '#d9a066'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x0 - 34, y1 + 20, x1 - x0 + 68, 6);
  for (let k = 0; k < 4; k++) {
    const cx = x0 + (x1 - x0) * (k + 0.5) / 4;
    ui.roundRect(g, cx - 140, y1 + 32, 280, 50, 8); g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.4)'; g.stroke();
    g.beginPath(); g.arc(cx, y1 + 46, 6, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
  }
  drawLid(g, t, nightK);
}

function drawLid(g, t, nightK) {
  const { x0, x1, y0, y1 } = LID;
  // light strip under the lid
  const lampCol = '#fff6c8';
  g.save(); g.globalAlpha = 0.9;
  ui.roundRect(g, x0 + 30, y1 - 6, x1 - x0 - 60, 14, 6); g.fillStyle = lampCol; g.fill();
  g.restore();
  ui.roundRect(g, x0, y0, x1 - x0, y1 - y0, 18); g.fillStyle = '#ff8fc8'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, x0 + 12, y0 + 8, x1 - x0 - 24, 12, 6); g.fill();
  // scallop trim
  g.fillStyle = '#ffffff';
  for (let x = x0 + 30; x < x1 - 30; x += 36) { g.beginPath(); g.arc(x, y1 - 10, 8, 0, TAU); g.fill(); }
  drawLidLights(g, t, 0);
}

/** Fairy lights along the lid; drawn again after the night shade so they glow. */
export function drawLidLights(g, t, nightK) {
  const { x0, x1, y0 } = LID;
  for (let k = 0, x = x0 + 60; x < x1 - 130; x += 70, k++) {
    const col = ['#ff6fb1', '#ffd23f', '#5ddc6a', '#3fa7ff', '#b07bff'][k % 5];
    const tw = 0.6 + 0.4 * Math.sin(t * 3 + k * 1.3);
    if (nightK > 0.02) glow(g, col, x, y0 + 30, 34, nightK * tw);
    g.save(); if (nightK > 0) g.globalAlpha = nightK;
    g.beginPath(); g.arc(x, y0 + 30, 7, 0, TAU); g.fillStyle = nightK > 0 ? shade(col, 0.45) : col; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    g.restore();
  }
}

/** The day / night button on the lid. */
export function drawSwitch(g, t, night, bump, hint) {
  const { x, y, r } = SWITCH;
  const b = 1 + bump * 0.25;
  if (hint) glow(g, night ? '#9fb4ff' : '#fff1a8', x, y, 70, 0.45 + 0.2 * Math.sin(t * 3));
  g.save(); g.translate(x, y); g.scale(b, b);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = night ? '#3d3a8e' : '#bfe6ff'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  if (night) {
    g.beginPath(); g.arc(-2, 0, 14, 0, TAU); g.fillStyle = '#fff6c8'; g.fill(); g.lineWidth = 2.5; g.stroke();
    g.beginPath(); g.arc(5, -5, 12, 0, TAU); g.fillStyle = '#3d3a8e'; g.fill();
    g.save(); g.translate(10, 9); drawStarShape(g, 9, '#fff6c8'); g.restore();
  } else {
    g.strokeStyle = '#ff9f1c'; g.lineWidth = 3; g.lineCap = 'round';
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + t * 0.5; g.beginPath(); g.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); g.lineTo(Math.cos(a) * 19, Math.sin(a) * 19); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
  }
  g.restore();
}

/** Title ribbon above the tank. */
export function drawTitle(g) {
  g.save(); g.translate(960, 62);
  g.fillStyle = '#1f8fa3';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 270, -18); g.lineTo(s * 324, -18); g.lineTo(s * 304, 6); g.lineTo(s * 324, 30); g.lineTo(s * 270, 30); g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
  ui.panel(g, -286, -30, 572, 64, { r: 18, fill: '#36c6d3', lineWidth: 5, shadow: false });
  ui.text(g, 'Dream Aquarium', 0, 2, { size: 46, weight: 800, maxWidth: 440 });
  for (const s of [-1, 1]) { g.save(); g.translate(s * 252, 0); drawHeartShape(g, 22, '#ff8fc8'); g.restore(); }
  g.restore();
}

/** Night: darken the room and the water (glows are added afterwards). */
export function drawNightShade(g, k) {
  if (k < 0.01) return;
  g.save();
  g.globalAlpha = k;
  g.fillStyle = 'rgba(16,12,58,0.5)'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(6,18,70,0.34)'; g.fillRect(WATER.x0, WATER.y0 - 20, WATER.x1 - WATER.x0, WATER.y1 - WATER.y0 + 20);
  g.restore();
  // moonbeam from the lid
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = k * 0.22;
  const gr = g.createLinearGradient(0, WATER.y0, 0, WATER.y1);
  gr.addColorStop(0, 'rgba(170,190,255,1)'); gr.addColorStop(1, 'rgba(170,190,255,0)');
  g.fillStyle = gr; g.fillRect(WATER.x0, WATER.y0, WATER.x1 - WATER.x0, WATER.y1 - WATER.y0);
  g.restore();
}
