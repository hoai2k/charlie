// Trick or Treat! - procedural art: the street, the houses, the door visitors,
// candies, the pumpkin bucket and the thumbnail. Every piece first asks for
// generated art (art()/drawArt()) and falls back to these drawings.
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { TAU, clamp } from '../../engine/util.js';
import { starPath } from '../../engine/emotes.js';

export const NAVY = '#24163f';
export const GROUND_Y = 700;            // houses stand on this line
export const WALK = { x0: 70, x1: W - 70, y0: 760, y1: 1000 };
export const HOUSE_W = 300, HOUSE_H = 420;
export const HOUSE_X = [165, 483, 801, 1119, 1437, 1755];
// door rect relative to the house (bottom-centre origin), see image-requests.md;
// matches the doorway measured in the delivered tot-house art (56.5%-91% high)
export const DOOR = { w: HOUSE_W * 0.26, top: -HOUSE_H * (1 - 0.565), bottom: -HOUSE_H * (1 - 0.91) };

/** True when house i is painted art (it brings its own porch lantern and step pumpkins). */
export function paintedHouse(i) { return !!art(`prop/tot-house-${i}`); }
/** Where the porch light sits: the painted lantern above the door, else beside it. */
export function porchLight(x, i) {
  return paintedHouse(i) ? { x, y: GROUND_Y + DOOR.top - 42 } : { x: x + DOOR.w / 2 + 24, y: GROUND_Y + DOOR.top + 10 };
}

const SIDING = [['#9fe8c8', '#6fc8a4'], ['#c9b0ff', '#a387e8'], ['#ffc49a', '#f09e6c'], ['#a8dcff', '#78b8ea'], ['#ffb3d4', '#ec8ab4'], ['#fff09a', '#e8cf63']];
const ROOF = ['#6a3fa0', '#4a3a8c', '#8a3f6a', '#3f5a9c', '#7a3a8a', '#9a5a2a'];
export const CANDY_COLS = ['#ff9f1c', '#9b5cff', '#ff4d9a', '#3fbf6a', '#ffd23f', '#ff7ac6'];

function line(g, w = 5) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// --- background ----------------------------------------------------------------
let bgCache = null;
export function streetBackground() {
  if (bgCache) return bgCache;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#3a2a7a'); sky.addColorStop(0.55, '#8a5ab8'); sky.addColorStop(1, '#ffb58a');
  g.fillStyle = sky; g.fillRect(0, 0, W, GROUND_Y + 10);
  // stars
  for (let i = 0; i < 70; i++) {
    const x = (i * 337) % W, y = 20 + ((i * 151) % 330), r = 1.5 + (i % 3);
    g.globalAlpha = 0.5 + (i % 4) * 0.12; g.fillStyle = '#fff6d0';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  // moon with a soft halo
  const mx = 1500, my = 190;
  const halo = g.createRadialGradient(mx, my, 60, mx, my, 260);
  halo.addColorStop(0, 'rgba(255,240,190,0.5)'); halo.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(mx, my, 260, 0, TAU); g.fill();
  g.fillStyle = '#fff4c8'; line(g, 5); g.beginPath(); g.arc(mx, my, 92, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#f2e2a6'; for (const [dx, dy, r] of [[-30, -20, 16], [26, 18, 12], [10, -40, 8], [-18, 36, 10]]) { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, TAU); g.fill(); }
  // wispy clouds
  g.fillStyle = 'rgba(255,220,240,0.35)';
  for (const [x, y, s] of [[300, 160, 1.2], [880, 110, 0.9], [1200, 300, 1], [600, 330, 0.8]]) {
    g.beginPath(); g.ellipse(x, y, 130 * s, 26 * s, 0, 0, TAU); g.ellipse(x + 70 * s, y - 14 * s, 80 * s, 24 * s, 0, 0, TAU); g.fill();
  }
  // far hills with tiny cottages
  g.fillStyle = '#5a3a8a';
  g.beginPath(); g.moveTo(0, GROUND_Y);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, 520 + Math.sin(x * 0.004) * 50 + Math.sin(x * 0.011) * 18);
  g.lineTo(W, GROUND_Y); g.closePath(); g.fill();
  g.fillStyle = '#47307a';
  g.beginPath(); g.moveTo(0, GROUND_Y);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, 590 + Math.sin(x * 0.006 + 2) * 36);
  g.lineTo(W, GROUND_Y); g.closePath(); g.fill();
  for (let i = 0; i < 9; i++) {
    const x = 90 + i * 215, y = 572 + Math.sin(x * 0.006 + 2) * 36;
    g.fillStyle = '#2f2058'; g.fillRect(x - 12, y - 18, 24, 18); g.beginPath(); g.moveTo(x - 16, y - 18); g.lineTo(x, y - 32); g.lineTo(x + 16, y - 18); g.fill();
    g.fillStyle = '#ffd36e'; g.fillRect(x - 5, y - 12, 7, 7);
  }
  // sidewalk
  const sw = g.createLinearGradient(0, GROUND_Y, 0, 1010);
  sw.addColorStop(0, '#d9a98a'); sw.addColorStop(1, '#c08a74');
  g.fillStyle = sw; g.fillRect(0, GROUND_Y, W, 1010 - GROUND_Y);
  g.strokeStyle = 'rgba(90,40,50,0.22)'; g.lineWidth = 3;
  for (let y = GROUND_Y + 40, row = 0; y < 1010; y += 52, row++) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = (row % 2) * 70; x < W; x += 140) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, Math.min(1010, y + 52)); g.stroke(); }
  }
  // curb + street
  g.fillStyle = '#e8d2c4'; g.fillRect(0, 1004, W, 16);
  g.fillStyle = '#7a63a8'; g.fillRect(0, 1020, W, H - 1020);
  g.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = 40; x < W; x += 180) g.fillRect(x, 1052, 90, 8);
  // fallen leaves
  const leaf = ['#ff8a2a', '#ffb23f', '#e8642a', '#c94a3a'];
  for (let i = 0; i < 60; i++) {
    const x = (i * 263) % W, y = GROUND_Y + 30 + ((i * 97) % 290);
    g.save(); g.translate(x, y); g.rotate(i); g.fillStyle = leaf[i % 4]; g.globalAlpha = 0.75;
    g.beginPath(); g.ellipse(0, 0, 9, 5, 0, 0, TAU); g.fill(); g.restore();
  }
  // street lamps between the houses
  for (let i = 0; i < HOUSE_X.length - 1; i++) {
    const x = (HOUSE_X[i] + HOUSE_X[i + 1]) / 2;
    g.fillStyle = '#3a2a5a'; g.fillRect(x - 5, GROUND_Y - 250, 10, 262);
    const lg = g.createRadialGradient(x, GROUND_Y - 262, 4, x, GROUND_Y - 262, 90);
    lg.addColorStop(0, 'rgba(255,230,150,0.75)'); lg.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = lg; g.beginPath(); g.arc(x, GROUND_Y - 262, 90, 0, TAU); g.fill();
    g.fillStyle = '#ffe69a'; line(g, 4); g.beginPath(); g.arc(x, GROUND_Y - 262, 16, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#3a2a5a'; g.beginPath(); g.moveTo(x - 20, GROUND_Y - 274); g.lineTo(x, GROUND_Y - 292); g.lineTo(x + 20, GROUND_Y - 274); g.fill();
  }
  bgCache = c;
  return c;
}

// --- houses ----------------------------------------------------------------------
const houseCache = [];
function houseImage(i) {
  if (houseCache[i]) return houseCache[i];
  const c = document.createElement('canvas'); c.width = HOUSE_W + 40; c.height = HOUSE_H + 30;
  const g = c.getContext('2d');
  g.translate(c.width / 2, HOUSE_H + 10);
  const w = HOUSE_W, h = HOUSE_H, [base, dark] = SIDING[i % 6];
  // body
  const bodyTop = -h * 0.62;
  g.fillStyle = base; line(g, 6);
  rr(g, -w / 2 + 12, bodyTop, w - 24, -bodyTop, 10); g.fill(); g.stroke();
  // siding lines
  g.strokeStyle = dark; g.lineWidth = 3;
  for (let y = bodyTop + 22; y < -6; y += 22) { g.beginPath(); g.moveTo(-w / 2 + 16, y); g.lineTo(w / 2 - 16, y); g.stroke(); }
  // roof
  g.fillStyle = ROOF[i % 6]; line(g, 6);
  const roofStyle = i % 3;
  g.beginPath();
  if (roofStyle === 0) { g.moveTo(-w / 2 - 4, bodyTop + 6); g.lineTo(0, -h + 4); g.lineTo(w / 2 + 4, bodyTop + 6); }
  else if (roofStyle === 1) { g.moveTo(-w / 2 - 4, bodyTop + 6); g.lineTo(-w * 0.28, -h + 30); g.lineTo(w * 0.28, -h + 30); g.lineTo(w / 2 + 4, bodyTop + 6); }
  else { g.moveTo(-w / 2 - 4, bodyTop + 6); g.quadraticCurveTo(-w * 0.1, -h - 10, 0, -h + 4); g.quadraticCurveTo(w * 0.1, -h - 10, w / 2 + 4, bodyTop + 6); }
  g.closePath(); g.fill(); g.stroke();
  // roof shingles
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3;
  for (let k = 1; k < 4; k++) { const y = bodyTop - k * (h * 0.36 / 4); g.beginPath(); g.moveTo(-w * (0.5 - k * 0.1), y); g.lineTo(w * (0.5 - k * 0.1), y); g.stroke(); }
  // chimney or round attic window
  if (i % 2) { g.fillStyle = '#c96a5a'; line(g, 5); g.fillRect(w * 0.18, -h + 40, 32, 60); g.strokeRect(w * 0.18, -h + 40, 32, 60); }
  g.fillStyle = '#ffe9a0'; line(g, 5); g.beginPath(); g.arc(0, bodyTop - 50, 22, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-22, bodyTop - 50); g.lineTo(22, bodyTop - 50); g.moveTo(0, bodyTop - 72); g.lineTo(0, bodyTop - 28); g.stroke();
  // windows (left/right)
  for (const s of [-1, 1]) {
    const x = s * w * 0.3, y = bodyTop + 40;
    g.fillStyle = '#ffd96e'; line(g, 5); rr(g, x - 30, y, 60, 66, 8); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 66); g.moveTo(x - 30, y + 33); g.lineTo(x + 30, y + 33); g.stroke();
    // shutters
    g.fillStyle = ROOF[(i + 2) % 6]; rr(g, x - 46, y, 14, 66, 4); g.fill(); g.stroke(); rr(g, x + 32, y, 14, 66, 4); g.fill(); g.stroke();
    // window decoration: cat silhouette or a smiley cobweb spider
    if ((i + (s > 0 ? 1 : 0)) % 2) {
      g.fillStyle = '#2a1a40'; g.beginPath(); g.ellipse(x + 12, y + 58, 10, 8, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + 12, y + 46, 7, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(x + 6, y + 42); g.lineTo(x + 7, y + 35); g.lineTo(x + 11, y + 40); g.moveTo(x + 18, y + 42); g.lineTo(x + 17, y + 35); g.lineTo(x + 13, y + 40); g.fill();
    } else {
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
      for (let a = 0; a < 5; a++) { g.beginPath(); g.moveTo(x - 30, y); g.lineTo(x - 30 + Math.cos(a * 0.39) * 26, y + Math.sin(a * 0.39) * 26); g.stroke(); }
      for (const r of [10, 18, 26]) { g.beginPath(); g.arc(x - 30, y, r, 0, Math.PI / 2); g.stroke(); }
    }
  }
  // bunting garland
  const by = bodyTop + 14;
  g.strokeStyle = NAVY; g.lineWidth = 2; g.beginPath(); g.moveTo(-w / 2 + 14, by); g.quadraticCurveTo(0, by + 26, w / 2 - 14, by); g.stroke();
  for (let k = 0; k < 9; k++) {
    const t = (k + 0.5) / 9, x = -w / 2 + 14 + t * (w - 28), y = by + 26 * 4 * t * (1 - t) * 0.5 * 2 * 0.5;
    g.fillStyle = k % 2 ? '#ff8a2a' : '#8a4ad0'; line(g, 2);
    g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.lineTo(x, y + 16); g.closePath(); g.fill(); g.stroke();
  }
  // doorway frame + porch steps
  const dw = DOOR.w;
  g.fillStyle = '#fff4e0'; line(g, 6); rr(g, -dw / 2 - 12, DOOR.top - 12, dw + 24, DOOR.bottom - DOOR.top + 12, 14); g.fill(); g.stroke();
  g.fillStyle = '#2a1840'; rr(g, -dw / 2, DOOR.top, dw, DOOR.bottom - DOOR.top, 10); g.fill();
  g.fillStyle = '#d8c0b0'; line(g, 5);
  rr(g, -dw / 2 - 30, DOOR.bottom, dw + 60, 14, 4); g.fill(); g.stroke();
  rr(g, -dw / 2 - 44, DOOR.bottom + 14, dw + 88, 16, 4); g.fill(); g.stroke();
  // little bushes
  for (const s of [-1, 1]) {
    g.fillStyle = '#4fa86a'; line(g, 4);
    const x = s * (w / 2 - 34);
    g.beginPath(); g.arc(x - 12, -18, 20, 0, TAU); g.arc(x + 12, -20, 22, 0, TAU); g.arc(x, -34, 20, 0, TAU); g.fill(); g.stroke();
  }
  houseCache[i] = c;
  return c;
}

export function drawHouse(g, i, x) {
  if (!drawArt(g, `prop/tot-house-${i}`, x, GROUND_Y, HOUSE_W, HOUSE_H, { anchor: 'bottom' })) {
    const c = houseImage(i);
    g.drawImage(c, x - c.width / 2, GROUND_Y - HOUSE_H - 10);
  }
}

/** The door; open 0 (shut) .. 1 (swung open). light: porch light 0..1, gold: jackpot glow. */
export function drawDoor(g, x, open, light, t, { gold = 0, shake = 0, house = -1 } = {}) {
  const dw = DOOR.w, top = GROUND_Y + DOOR.top, bot = GROUND_Y + DOOR.bottom, dh = bot - top;
  const { x: lx, y: ly } = porchLight(x, house);
  // porch light glow
  if (light > 0.01) {
    const col = gold ? '255,215,80' : '255,220,140';
    const gr = g.createRadialGradient(lx, ly, 4, lx, ly, 120 + gold * 60);
    gr.addColorStop(0, `rgba(${col},${0.7 * light})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, 120 + gold * 60, 0, TAU); g.fill();
  }
  if (!paintedHouse(house)) {
    g.fillStyle = light > 0.5 ? (gold ? '#ffd23f' : '#fff0a8') : '#8a7aa0'; line(g, 4);
    rr(g, lx - 9, ly - 14, 18, 26, 5); g.fill(); g.stroke();
  }
  // warm light inside when open
  if (open > 0.02) {
    const gr = g.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, '#ffcf7a'); gr.addColorStop(1, '#ff9f4a');
    g.fillStyle = gr; rr(g, x - dw / 2, top, dw, dh, 10); g.fill();
  }
  // the door leaf swings (squashes toward the hinge on the left)
  const k = 1 - open * 0.86;
  const sx = shake ? Math.sin(t * 70) * 3 * shake : 0;
  g.save(); g.translate(x - dw / 2 + sx, top);
  g.scale(k, 1);
  if (!drawArt(g, 'prop/tot-door', dw / 2, dh / 2, dw, dh, { fit: 'stretch' })) {
    g.fillStyle = gold ? '#ffcb3a' : '#8a4ad0'; line(g, 5 / Math.max(0.3, k));
    rr(g, 0, 0, dw, dh, 10); g.fill(); g.stroke();
    g.strokeStyle = gold ? '#d99a00' : '#6a2ab0'; g.lineWidth = 3 / Math.max(0.3, k);
    rr(g, 10, 12, dw - 20, dh * 0.38, 6); g.stroke(); rr(g, 10, dh * 0.52, dw - 20, dh * 0.38, 6); g.stroke();
    // wreath
    g.strokeStyle = '#e8742a'; g.lineWidth = 7; g.beginPath(); g.arc(dw / 2, dh * 0.3, 14, 0, TAU); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(dw * 0.78, dh * 0.56, 5, 0, TAU); g.fill();
  }
  g.restore();
}

/** Jack-o'-lantern on the steps (lit = glowing face). glowOnly: the house art has painted it. */
export function drawLantern(g, x, y, s, lit, t, glowOnly = false) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (lit > 0.01) {
    const gr = g.createRadialGradient(0, -18, 4, 0, -18, 60);
    gr.addColorStop(0, `rgba(255,190,80,${0.55 * lit})`); gr.addColorStop(1, 'rgba(255,190,80,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, -18, 60, 0, TAU); g.fill();
  }
  if (glowOnly) { g.restore(); return; }
  g.fillStyle = '#ff8a1c'; line(g, 4);
  g.beginPath(); g.ellipse(0, -18, 26, 20, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = '#d9661a'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, -18, 10, 19, 0, 0, TAU); g.stroke();
  g.fillStyle = '#4a8a3a'; line(g, 3); g.fillRect(-3, -44, 7, 9); g.strokeRect(-3, -44, 7, 9);
  g.fillStyle = lit > 0.5 ? '#ffe36e' : '#5a2a10';
  // friendly face: round eyes, big smile
  g.beginPath(); g.arc(-9, -22, 4.5, 0, TAU); g.arc(9, -22, 4.5, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, -16, 12, 0.15 * Math.PI, 0.85 * Math.PI); g.lineTo(-11, -14); g.closePath(); g.fill();
  g.restore();
}

// --- candy -------------------------------------------------------------------------
const CANDY_ART = [['prop/tot-candy-0', 'prop/candy-wrapped'], ['prop/tot-candy-1'], ['prop/tot-candy-2', 'prop/candy-lollipop'], ['prop/tot-candy-3'], ['prop/tot-candy-4'], ['prop/tot-candy-5']];
export function drawCandy(g, kind, x, y, s = 44, rot = 0, gold = false) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (gold) {
    if (drawArt(g, 'prop/candy-golden', 0, 0, s * 1.1, s * 1.1)) { g.restore(); return; }
  } else {
    for (const key of CANDY_ART[kind % 6]) if (drawArt(g, key, 0, 0, s, s)) { g.restore(); return; }
  }
  const u = s / 44;
  g.scale(u, u);
  const col = gold ? '#ffd23f' : CANDY_COLS[kind % 6];
  line(g, 3);
  switch (gold ? 0 : kind % 6) {
    case 0: case 1: // wrapped sweet
      g.fillStyle = col;
      g.beginPath(); g.moveTo(-12, 0); g.lineTo(-22, -9); g.lineTo(-22, 9); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(12, 0); g.lineTo(22, -9); g.lineTo(22, 9); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, 0, 14, 11, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, -8); g.lineTo(4, 8); g.stroke();
      break;
    case 2: // lollipop
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 4); g.lineTo(0, 22); g.stroke();
      line(g, 3); g.fillStyle = col; g.beginPath(); g.arc(0, -6, 14, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath();
      for (let a = 0; a < 9; a += 0.3) { const r = a * 1.4; g.lineTo(Math.cos(a) * r, -6 + Math.sin(a) * r); } g.stroke();
      break;
    case 3: // chocolate bar
      g.fillStyle = '#7a3a1a'; rr(g, -15, -11, 30, 22, 4); g.fill(); g.stroke();
      g.fillStyle = col; rr(g, -15, -4, 30, 15, 3); g.fill(); g.stroke();
      break;
    case 4: // candy corn
      g.beginPath(); g.moveTo(0, -16); g.lineTo(13, 13); g.quadraticCurveTo(0, 18, -13, 13); g.closePath();
      g.fillStyle = '#ff8a1c'; g.fill();
      g.save(); g.clip(); g.fillStyle = '#ffffff'; g.fillRect(-20, -20, 40, 12); g.fillStyle = '#ffd23f'; g.fillRect(-20, 6, 40, 14); g.restore();
      g.stroke();
      break;
    default: // gumdrop
      g.fillStyle = col; g.beginPath(); g.moveTo(-14, 11); g.quadraticCurveTo(-14, -14, 0, -14); g.quadraticCurveTo(14, -14, 14, 11); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)'; for (const [dx, dy] of [[-5, -3], [4, -8], [6, 3], [-3, 5]]) { g.beginPath(); g.arc(dx, dy, 1.8, 0, TAU); g.fill(); }
  }
  if (gold) { g.fillStyle = '#fff'; g.save(); g.translate(14, -12); starPath(g, 6); g.fill(); g.restore(); }
  g.restore();
}

// --- pumpkin bucket (forward space at the hand; h = body height) -------------------------
export function drawBucket(g, hx, hy, h, count, t) {
  const s = clamp(h * 0.34, 34, 70);
  const img = art('prop/tot-bucket');
  if (img) {
    // art: hung by the top of its handle at the hand; candy heaped on the rim (31% down)
    const sz = s * 1.05, top = hy - sz * 0.03, rim = top + sz * 0.33;
    g.drawImage(img, hx - sz / 2, top, sz, sz);
    const heap = clamp(count / 25, 0, 1);
    if (count > 0) {
      for (let i = 0; i < Math.min(9, 2 + Math.floor(count / 3)); i++) {
        const a = (i / 8) * Math.PI;
        const cx = hx - Math.cos(a) * sz * 0.24, cy = rim - Math.sin(a) * sz * 0.14 * heap - heap * sz * 0.05;
        g.fillStyle = CANDY_COLS[i % 6]; g.strokeStyle = NAVY; g.lineWidth = 1.5;
        g.beginPath(); g.arc(cx, cy, s * 0.1, 0, TAU); g.fill(); g.stroke();
      }
    }
    return;
  }
  const x = hx, y = hy + s * 0.15;
  // handle
  g.strokeStyle = NAVY; g.lineWidth = Math.max(2.5, s * 0.07); g.lineCap = 'round';
  g.beginPath(); g.arc(x, y + s * 0.42, s * 0.42, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  const by = y + s * 0.65;
  // candy heap peeking over the rim (grows with the count)
  const heap = clamp(count / 25, 0, 1);
  if (count > 0) {
    for (let i = 0; i < Math.min(9, 2 + Math.floor(count / 3)); i++) {
      const a = (i / 8) * Math.PI;
      const cx = x - Math.cos(a) * s * 0.34, cy = by - s * 0.3 - Math.sin(a) * s * 0.25 * heap - heap * s * 0.12;
      g.fillStyle = CANDY_COLS[i % 6]; g.strokeStyle = NAVY; g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, cy, s * 0.11, 0, TAU); g.fill(); g.stroke();
    }
  }
  {
    g.fillStyle = '#ff8a1c'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2.5, s * 0.06);
    g.beginPath(); g.ellipse(x, by, s * 0.5, s * 0.4, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#d9661a'; g.lineWidth = Math.max(1.5, s * 0.04); g.beginPath(); g.ellipse(x, by, s * 0.2, s * 0.39, 0, 0, TAU); g.stroke();
    g.fillStyle = '#3a1a10';
    g.beginPath(); g.arc(x - s * 0.17, by - s * 0.06, s * 0.07, 0, TAU); g.arc(x + s * 0.17, by - s * 0.06, s * 0.07, 0, TAU); g.fill();
    g.beginPath(); g.arc(x, by + s * 0.04, s * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.closePath(); g.fill();
    // rim
    g.fillStyle = '#2a1a30'; g.beginPath(); g.ellipse(x, by - s * 0.33, s * 0.34, s * 0.07, 0, 0, TAU); g.fill();
  }
}

// --- visitors (origin = feet on the porch, ~170 px tall, `k` = pop-in 0..1) ----------------
function eyes(g, x, y, r, gap, look = 0) {
  g.fillStyle = NAVY;
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * gap, y, r * 0.8, r, 0, 0, TAU); g.fill(); }
  g.fillStyle = '#fff';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * gap - r * 0.25 + look, y - r * 0.35, r * 0.35, 0, TAU); g.fill(); }
}

export const VISITORS = ['skeleton', 'witch', 'scarecrow', 'mummy', 'cat', 'ghost', 'troll'];

export function drawVisitor(g, kind, x, y, t, k, act) {
  const H0 = kind === 'cat' ? 130 : 180;
  g.save(); g.translate(x, y);
  const pop = k < 1 ? 0.3 + 0.7 * k + Math.sin(k * Math.PI) * 0.2 : 1;
  g.scale(pop, pop);
  if (drawArt(g, `prop/tot-${kind}`, 0, kind === 'ghost' ? -20 - Math.sin(t * 3) * 8 : 0, H0 * 0.85, H0, { anchor: 'bottom' })) {
    // a little life on top of the art: bob
    g.restore(); return;
  }
  line(g, 4);
  switch (kind) {
    case 'skeleton': {
      const d = Math.sin(t * 9) * (act ? 1 : 0.4);
      g.strokeStyle = NAVY; g.lineWidth = 12; g.lineCap = 'round';
      // legs
      g.beginPath(); g.moveTo(-10, -70); g.lineTo(-18 - d * 8, -2); g.moveTo(10, -70); g.lineTo(18 - d * 8, -2); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 7; g.stroke();
      // arms dancing
      g.strokeStyle = NAVY; g.lineWidth = 12;
      g.beginPath(); g.moveTo(-22, -120); g.lineTo(-46, -150 + d * 30); g.moveTo(22, -120); g.lineTo(46, -90 - d * 30); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 7; g.stroke();
      // ribcage
      g.fillStyle = '#fff'; line(g, 4); rr(g, -26, -132, 52, 64, 16); g.fill(); g.stroke();
      g.strokeStyle = '#b8b0d0'; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-16, -118 + i * 16); g.lineTo(16, -118 + i * 16); g.stroke(); }
      // skull
      g.save(); g.rotate(d * 0.12); g.translate(0, -160);
      g.fillStyle = '#fff'; line(g, 4); g.beginPath(); g.arc(0, 0, 32, 0, TAU); g.fill(); g.stroke();
      rr(g, -18, 18, 36, 18, 6); g.fill(); g.stroke();
      eyes(g, 0, -4, 9, 13);
      g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, 10, 12, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
      g.restore();
      // bowtie
      g.fillStyle = '#ff4d9a'; line(g, 3); g.beginPath(); g.moveTo(0, -128); g.lineTo(-16, -138); g.lineTo(-16, -118); g.closePath(); g.moveTo(0, -128); g.lineTo(16, -138); g.lineTo(16, -118); g.closePath(); g.fill(); g.stroke();
      break;
    }
    case 'witch': {
      const sw = Math.sin(t * 4) * 0.05;
      g.rotate(sw);
      g.fillStyle = '#8a4ad0'; g.beginPath(); g.moveTo(-50, 0); g.quadraticCurveTo(-34, -80, -20, -110); g.lineTo(20, -110); g.quadraticCurveTo(34, -80, 50, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffd9c0'; g.beginPath(); g.arc(0, -130, 28, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#d8d0e8'; g.beginPath(); g.arc(-24, -138, 12, 0, TAU); g.arc(24, -138, 12, 0, TAU); g.fill(); g.stroke();
      // glasses
      g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(-10, -132, 8, 0, TAU); g.moveTo(18, -132); g.arc(10, -132, 8, 0, TAU); g.stroke();
      g.fillStyle = NAVY; g.beginPath(); g.arc(-10, -132, 3, 0, TAU); g.arc(10, -132, 3, 0, TAU); g.fill();
      g.fillStyle = '#ff9ab8'; g.beginPath(); g.arc(-18, -120, 5, 0, TAU); g.arc(18, -120, 5, 0, TAU); g.fill();
      g.strokeStyle = NAVY; g.beginPath(); g.arc(0, -122, 7, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      // hat
      line(g, 4); g.fillStyle = '#6a2ab0';
      g.beginPath(); g.ellipse(0, -152, 46, 10, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-26, -154); g.lineTo(8, -222); g.lineTo(26, -154); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(-12, -164, 8, 0, TAU); g.fill(); g.stroke();
      // cookie plate
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(46, -78, 30, 9, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#e8a85a'; for (const dx of [34, 48, 60]) { g.save(); g.translate(dx, -88); starPath(g, 10); g.fill(); g.stroke(); g.restore(); }
      break;
    }
    case 'scarecrow': {
      const w = Math.sin(t * 6) * (act ? 0.6 : 0.2);
      g.strokeStyle = '#8a5a2a'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -60); g.stroke();
      g.fillStyle = '#e84a4a'; line(g, 4); rr(g, -34, -120, 68, 66, 10); g.fill(); g.stroke();
      g.strokeStyle = '#9a2a3a'; g.lineWidth = 3; for (const dx of [-14, 8]) { g.beginPath(); g.moveTo(-34 + 34 + dx, -120); g.lineTo(dx, -54); g.stroke(); } g.beginPath(); g.moveTo(-34, -92); g.lineTo(34, -92); g.stroke();
      // arms + straw
      g.save(); g.translate(30, -112); g.rotate(-0.6 + w); g.fillStyle = '#e84a4a'; line(g, 4); rr(g, 0, -8, 40, 16, 6); g.fill(); g.stroke();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 3; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(40, i * 4); g.lineTo(52, i * 8); g.stroke(); } g.restore();
      g.save(); g.translate(-30, -112); g.rotate(0.3); g.fillStyle = '#e84a4a'; line(g, 4); rr(g, -40, -8, 40, 16, 6); g.fill(); g.stroke(); g.restore();
      // pumpkin head
      g.fillStyle = '#ff8a1c'; line(g, 4); g.beginPath(); g.ellipse(0, -150, 34, 28, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#d9661a'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -150, 14, 27, 0, 0, TAU); g.stroke();
      eyes(g, 0, -156, 6, 12);
      g.fillStyle = NAVY; g.beginPath(); g.arc(0, -146, 14, 0.15 * Math.PI, 0.85 * Math.PI); g.closePath(); g.fill();
      // straw hat
      g.fillStyle = '#f2c95a'; line(g, 4); g.beginPath(); g.ellipse(0, -174, 50, 10, 0, 0, TAU); g.fill(); g.stroke();
      rr(g, -24, -200, 48, 28, 10); g.fill(); g.stroke();
      g.fillStyle = '#9b5cff'; g.fillRect(-24, -182, 48, 7);
      break;
    }
    case 'mummy': {
      const sh = act ? Math.sin(t * 30) * 2 : 0;
      g.translate(sh, 0);
      g.fillStyle = '#f4ead8'; line(g, 4);
      rr(g, -32, -150, 64, 150, 30); g.fill(); g.stroke();
      g.strokeStyle = '#c8b8a0'; g.lineWidth = 3;
      for (let y = -134; y < -6; y += 14) { g.beginPath(); g.moveTo(-30, y + ((y / 14) % 2 ? 4 : -4)); g.lineTo(30, y); g.stroke(); }
      // trailing bandage
      g.strokeStyle = '#f4ead8'; g.lineWidth = 10; g.beginPath(); g.moveTo(28, -60); g.quadraticCurveTo(60, -40 + Math.sin(t * 5) * 10, 70, 0); g.stroke();
      // eye slit
      g.fillStyle = '#5a4060'; rr(g, -24, -128, 48, 22, 10); g.fill();
      eyes(g, 0, -117, 7, 11);
      // giggling hand over mouth
      g.fillStyle = '#f4ead8'; line(g, 4); g.beginPath(); g.ellipse(6, -92, 16, 11, 0, 0, TAU); g.fill(); g.stroke();
      break;
    }
    case 'cat': {
      const tail = Math.sin(t * 4) * 0.4;
      g.strokeStyle = NAVY; g.lineWidth = 14; g.lineCap = 'round';
      g.beginPath(); g.moveTo(26, -10); g.quadraticCurveTo(70, -20, 56 + tail * 30, -70); g.stroke();
      g.strokeStyle = '#2a2040'; g.lineWidth = 9; g.stroke();
      g.fillStyle = '#2a2040'; line(g, 4);
      g.beginPath(); g.ellipse(0, -36, 36, 36, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -90, 32, 0, TAU); g.fill(); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 28, -104); g.lineTo(s * 26, -134); g.lineTo(s * 8, -118); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = '#7ef08a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 12, -94, 8, 10, 0, 0, TAU); g.fill(); }
      g.fillStyle = NAVY; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 12, -94, 3, 8, 0, 0, TAU); g.fill(); }
      g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 12 - 3, -98, 2.5, 0, TAU); g.fill(); }
      g.fillStyle = '#ff9ab8'; g.beginPath(); g.moveTo(-4, -82); g.lineTo(4, -82); g.lineTo(0, -78); g.fill();
      if (act) { g.fillStyle = '#ff6f9f'; g.beginPath(); g.arc(0, -72, 6, 0, Math.PI); g.fill(); }
      // bow
      g.fillStyle = '#ff8a1c'; line(g, 3); g.beginPath(); g.moveTo(0, -62); g.lineTo(-16, -72); g.lineTo(-16, -52); g.closePath(); g.moveTo(0, -62); g.lineTo(16, -72); g.lineTo(16, -52); g.closePath(); g.fill(); g.stroke();
      break;
    }
    case 'ghost': {
      const by = -20 - Math.sin(t * 3) * 8;
      g.translate(0, by);
      g.fillStyle = '#ffffff'; line(g, 4);
      g.beginPath(); g.moveTo(-40, 0); g.lineTo(-40, -100); g.arc(0, -100, 40, Math.PI, 0); g.lineTo(40, 0);
      for (let i = 0; i < 4; i++) g.quadraticCurveTo(40 - i * 20 - 10, 14 + Math.sin(t * 8 + i) * 4, 40 - (i + 1) * 20, 0);
      g.closePath(); g.fill(); g.stroke();
      eyes(g, 0, -104, 8, 14);
      g.fillStyle = '#ffb3cc'; g.beginPath(); g.arc(-24, -88, 6, 0, TAU); g.arc(24, -88, 6, 0, TAU); g.fill();
      g.fillStyle = act ? '#ff6f9f' : NAVY; g.beginPath(); g.arc(0, -86, act ? 9 : 6, 0, Math.PI); g.fill();
      // tiny witch hat
      g.fillStyle = '#8a4ad0'; line(g, 3); g.beginPath(); g.ellipse(10, -136, 22, 6, 0.2, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, -138); g.lineTo(22, -176); g.lineTo(22, -134); g.closePath(); g.fill(); g.stroke();
      break;
    }
    default: break;
  }
  g.restore();
}

/** Rubber chicken (centred). */
export function drawChicken(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (!drawArt(g, 'prop/tot-chicken', 0, 0, s, s)) {
    const u = s / 100; g.scale(u, u); line(g, 4);
    g.fillStyle = '#ffe14a';
    g.beginPath(); g.ellipse(0, 0, 40, 14, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.arc(-42, -6, 14, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ff8a1c'; g.beginPath(); g.moveTo(-54, -8); g.lineTo(-70, -2); g.lineTo(-54, 2); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff4d5e'; g.beginPath(); g.arc(-44, -22, 6, 0, TAU); g.arc(-36, -22, 5, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.arc(-46, -8, 3, 0, TAU); g.fill();
    g.strokeStyle = '#ff8a1c'; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 6); g.lineTo(46, 18); g.moveTo(24, 8); g.lineTo(36, 22); g.stroke();
  }
  g.restore();
}

/** Jack-in-the-box: k = spring 0 (shut) .. 1 (out), wob = spring wobble. */
export function drawJack(g, x, y, k, wob, t) {
  g.save(); g.translate(x, y);
  const img = art('prop/tot-jack');
  if (img) {
    // the ghost on its spring rises out of the box (box = bottom 34% of the art)
    const h = 140, w = img.width * h / img.height, boxH = h * 0.34, sy = img.height * 0.66;
    const wx = Math.sin(t * 20) * wob * 5;
    g.save(); g.beginPath(); g.rect(-w, -h - 60, w * 2, h + 60 - boxH + 2); g.clip();
    g.drawImage(img, -w / 2 + wx, -h + (1 - k) * (h - boxH), w, h);
    g.restore();
    g.drawImage(img, 0, sy, img.width, img.height - sy, -w / 2, -boxH, w, boxH);
    g.restore(); return;
  }
  line(g, 4);
  // spring
  const top = -50 - k * 90;
  g.strokeStyle = '#c0c8d8'; g.lineWidth = 5; g.beginPath();
  for (let i = 0; i <= 16; i++) { const yy = -50 + (top + 50) * (i / 16); g.lineTo(Math.sin(i * 1.6) * 12 + Math.sin(t * 20) * wob * 8 * (i / 16), yy); }
  g.stroke();
  // sock ghost head
  if (k > 0.05) {
    g.save(); g.translate(Math.sin(t * 20) * wob * 10, top); g.rotate(Math.sin(t * 14) * wob * 0.3);
    g.fillStyle = '#fff'; line(g, 4); g.beginPath(); g.arc(0, -22, 26, 0, TAU); g.fill(); g.stroke();
    eyes(g, 0, -26, 5, 9);
    g.fillStyle = '#ff6f9f'; g.beginPath(); g.arc(0, -14, 7, 0, Math.PI); g.fill();
    g.fillStyle = '#ff4d9a'; g.beginPath(); g.arc(0, -50, 8, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  // box
  g.fillStyle = '#9b5cff'; rr(g, -36, -54, 72, 54, 6); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) g.fillRect(-36 + 6 + i * 24, -50, 10, 46);
  g.strokeRect(-36, -54, 72, 54);
  g.restore();
}

/** Flying candy ghost with a sack. */
export function drawCandyGhost(g, x, y, t) {
  g.save(); g.translate(x, y + Math.sin(t * 3) * 10);
  if (drawArt(g, 'prop/tot-candy-ghost', 0, 0, 300, 250)) { g.restore(); return; }
  line(g, 5);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(-60, 30); g.lineTo(-60, -30); g.arc(0, -30, 60, Math.PI, 0); g.lineTo(60, 30);
  for (let i = 0; i < 4; i++) g.quadraticCurveTo(60 - i * 30 - 15, 50 + Math.sin(t * 9 + i) * 6, 60 - (i + 1) * 30, 30);
  g.closePath(); g.fill(); g.stroke();
  eyes(g, 8, -36, 9, 16, 2);
  g.fillStyle = '#ffb3cc'; g.beginPath(); g.arc(-18, -16, 7, 0, TAU); g.arc(36, -16, 7, 0, TAU); g.fill();
  g.fillStyle = '#ff6f9f'; g.beginPath(); g.arc(9, -14, 10, 0, Math.PI); g.fill();
  // sack
  g.fillStyle = '#c98a4a'; line(g, 4); g.beginPath(); g.ellipse(-70, 40, 34, 30, 0.4, 0, TAU); g.fill(); g.stroke();
  for (let i = 0; i < 4; i++) { g.fillStyle = CANDY_COLS[i]; g.beginPath(); g.arc(-80 + i * 10, 18, 7, 0, TAU); g.fill(); }
  g.restore();
}

/** Big candy pile for the finale (n = candies, grows). */
export function drawCandyPile(g, x, y, n, t) {
  const s = clamp(0.25 + n / 160, 0.25, 1.15);
  if (drawArt(g, 'prop/tot-candy-pile', x, y, 700 * s, 404 * s, { anchor: 'bottom' })) return;
  const w = 420 * s, h = 230 * s;
  g.save();
  g.fillStyle = '#ff9f4a'; g.strokeStyle = NAVY; g.lineWidth = 6;
  g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.5, y - h * 1.2, x, y - h * 1.1); g.quadraticCurveTo(x + w * 0.5, y - h * 1.2, x + w, y); g.closePath(); g.fill(); g.stroke();
  g.clip();
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 60 + n; i++) {
    const cx = x + (rnd() * 2 - 1) * w, cy = y - rnd() * h * 1.15;
    drawCandy(g, Math.floor(rnd() * 6), cx, cy, 40 * Math.max(0.7, s), rnd() * TAU);
  }
  g.restore();
}

// --- thumbnail -------------------------------------------------------------------------
export function drawIcon(g, x, y, w, h, t = 0) {
  const th = art('thumb/trick-or-treat');
  if (th) { g.drawImage(th, x, y, w, h); return; }
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = w / 400;
  g.translate(x, y); g.scale(s, s);
  const hh = h / s;
  const sky = g.createLinearGradient(0, 0, 0, hh);
  sky.addColorStop(0, '#3a2a7a'); sky.addColorStop(0.7, '#9a5ab8'); sky.addColorStop(1, '#ffb58a');
  g.fillStyle = sky; g.fillRect(0, 0, 400, hh);
  g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(330, 50, 30, 0, TAU); g.fill();
  // house
  g.fillStyle = '#c9b0ff'; line(g, 4); rr(g, 120, 90, 160, 140, 8); g.fill(); g.stroke();
  g.fillStyle = '#6a3fa0'; g.beginPath(); g.moveTo(108, 94); g.lineTo(200, 30); g.lineTo(292, 94); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffcf7a'; rr(g, 176, 140, 48, 90, 6); g.fill(); g.stroke();
  g.fillStyle = '#d8c0b0'; g.fillRect(100, 228, 200, 22);
  g.save(); g.translate(200, 230); g.scale(0.6, 0.6); drawVisitor(g, 'mummy', 0, 0, t, 1, true); g.restore();
  drawLantern(g, 140, 240, 1, 1, t);
  drawLantern(g, 262, 240, 0.8, 1, t);
  for (let i = 0; i < 5; i++) drawCandy(g, i, 60 + i * 70, 40 + ((i * 37) % 30) + Math.sin(t * 3 + i) * 6, 30, t + i);
  g.restore();
}
