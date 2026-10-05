// Musical Cushions - procedural art: the cosy party room, fluffy cushions, the
// record player and the menu thumbnail. Every piece first asks for generated
// art (art()/drawArt()) and falls back to the drawing here.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { TAU, clamp, lerp } from '../../engine/util.js';

export const NAVY = '#24163f';
export const WALL_Y = 400;                       // where the back wall meets the floor
export const C = { x: 960, y: 735 };             // centre of the rug / cushion ring
export const RUG = { rx: 640, ry: 300 };
export const RP = { x: 960, y: 412 };            // record player table: front foot line
export const SPEAKERS = [{ x: 735, y: 408 }, { x: 1185, y: 408 }];
// pastel cushion colours: [top, side, button]
export const CUSHION_COLORS = [
  ['#ff9fcf', '#e874ad', '#ffd23f'], ['#8fe3c5', '#5cc4a2', '#ff6fb1'], ['#c7a7ff', '#a27fe6', '#ffe46b'],
  ['#ffe27a', '#f2bf3f', '#ff7aa8'], ['#8fd0ff', '#5eaee6', '#ffffff'], ['#ffb98a', '#f0915a', '#8fe3c5'],
  ['#ff8f9f', '#e8667a', '#fff1a8'], ['#b6ef8a', '#86cf5c', '#c7a7ff'],
];

const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// --- the room (cached) -----------------------------------------------------------
let bgCache = null;
export function roomBackground() {
  if (bgCache) return bgCache;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.lineJoin = 'round'; g.lineCap = 'round';
  // wall: lilac-pink stripes
  const wg = g.createLinearGradient(0, 0, 0, WALL_Y);
  wg.addColorStop(0, '#f6c9e6'); wg.addColorStop(1, '#ffdcef');
  g.fillStyle = wg; g.fillRect(0, 0, W, WALL_Y);
  g.fillStyle = 'rgba(255,255,255,0.32)';
  for (let x = 0; x < W; x += 96) g.fillRect(x, 0, 44, WALL_Y);
  // tiny hearts on the stripes
  g.fillStyle = 'rgba(255,111,177,0.22)';
  for (let x = 22; x < W; x += 96) for (let y = 30; y < WALL_Y - 60; y += 70) { heart(g, x + ((y / 70) % 2) * 0, y + 20, 7); }
  // windows with an evening sky
  for (const wx of [330, 1590]) window_(g, wx, 150);
  // balloons in the corners
  balloons(g, 120, 210, ['#ff6fb1', '#ffd23f', '#3fa7ff']);
  balloons(g, 1800, 210, ['#9b5cff', '#6fe3b4', '#ff9f1c']);
  // bunting
  bunting(g, 0, 118, 960, 112, 0);
  bunting(g, 960, 112, 1920, 118, 5);
  // wainscot + skirting
  g.fillStyle = '#fff3fa'; g.fillRect(0, WALL_Y - 92, W, 92);
  g.fillStyle = 'rgba(200,120,180,0.18)';
  for (let x = 30; x < W; x += 150) { ui.roundRect(g, x, WALL_Y - 78, 120, 58, 10); g.fill(); }
  g.fillStyle = '#e6a0c8'; g.fillRect(0, WALL_Y - 96, W, 8);
  g.fillStyle = '#b47ab0'; g.fillRect(0, WALL_Y - 14, W, 14);
  g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(0, WALL_Y); g.lineTo(W, WALL_Y); g.stroke();
  // fairy lights along the wainscot (the game makes them twinkle)
  // wooden floor
  const rows = 14, rowH = (H - WALL_Y) / rows;
  for (let r = 0; r < rows; r++) {
    const y0 = WALL_Y + r * rowH;
    g.fillStyle = r % 2 ? '#e9b47c' : '#efbf88'; g.fillRect(0, y0, W, rowH + 1);
    g.fillStyle = 'rgba(150,85,40,0.16)';
    for (let k = 0; k < 6; k++) { const x = ((hh(r * 7 + k) * W) + k * 330) % W; g.fillRect(x, y0, 3, rowH); }
    g.fillStyle = 'rgba(150,85,40,0.2)'; g.fillRect(0, y0, W, 2);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, y0 + 3, W, rowH * 0.3);
  }
  const fs = g.createLinearGradient(0, WALL_Y, 0, WALL_Y + 90);
  fs.addColorStop(0, 'rgba(90,40,60,0.28)'); fs.addColorStop(1, 'rgba(90,40,60,0)');
  g.fillStyle = fs; g.fillRect(0, WALL_Y, W, 90);
  // sideline cheer mats
  for (const [x0, col] of [[16, '#bfeedd'], [W - 196, '#e4d4ff']]) {
    g.fillStyle = 'rgba(36,22,63,0.18)'; ui.roundRect(g, x0 + 6, 470, 180, 520, 40); g.fill();
    g.fillStyle = col; g.strokeStyle = NAVY; g.lineWidth = 5; ui.roundRect(g, x0, 460, 180, 520, 40); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 4; g.setLineDash([12, 12]); ui.roundRect(g, x0 + 14, 474, 152, 492, 30); g.stroke(); g.setLineDash([]);
    for (let k = 0; k < 9; k++) { g.fillStyle = ['#ff6fb1', '#ffd23f', '#3fa7ff'][k % 3]; g.beginPath(); g.arc(x0 + 90 + Math.sin(k * 2.1) * 40, 520 + k * 52, 7, 0, TAU); g.fill(); }
  }
  // the big round rug
  const { rx, ry } = RUG;
  g.fillStyle = 'rgba(80,30,60,0.2)'; g.beginPath(); g.ellipse(C.x + 8, C.y + 14, rx + 18, ry + 14, 0, 0, TAU); g.fill();
  // scalloped edge
  g.fillStyle = '#ff9fcf'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath();
  const sc = 44;
  for (let k = 0; k <= sc; k++) {
    const a0 = (k / sc) * TAU, a1 = ((k + 0.5) / sc) * TAU, a2 = ((k + 1) / sc) * TAU;
    const p = (a, r) => [C.x + Math.cos(a) * rx * r, C.y + Math.sin(a) * ry * r];
    const [x0, y0] = p(a0, 1), [cx, cy] = p(a1, 1.06), [x2, y2] = p(a2, 1);
    if (k === 0) g.moveTo(x0, y0);
    g.quadraticCurveTo(cx, cy, x2, y2);
  }
  g.closePath(); g.fill(); g.stroke();
  const rings = [[0.9, '#fff1f8'], [0.78, '#c9f0e2'], [0.62, '#fff1f8'], [0.5, '#e8dbff'], [0.3, '#fff1f8']];
  for (const [k, col] of rings) { g.fillStyle = col; g.beginPath(); g.ellipse(C.x, C.y, rx * k, ry * k, 0, 0, TAU); g.fill(); }
  // polka dots on the mint ring
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * TAU;
    g.fillStyle = ['#ff9fcf', '#ffd23f', '#9b8cff'][k % 3];
    g.beginPath(); g.ellipse(C.x + Math.cos(a) * rx * 0.7, C.y + Math.sin(a) * ry * 0.7, 9, 6, 0, 0, TAU); g.fill();
  }
  // a star in the middle
  g.save(); g.translate(C.x, C.y); g.scale(1, ry / rx);
  g.fillStyle = '#ffe27a'; g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 4;
  g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 26 : 62; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill(); g.stroke(); g.restore();
  bgCache = cv;
  return cv;
}

function heart(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.4, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  g.fill();
}

function window_(g, x, y) {
  const w = 210, h = 190;
  g.fillStyle = NAVY; ui.roundRect(g, x - w / 2 - 12, y - 12, w + 24, h + 24, 26); g.fill();
  g.fillStyle = '#fff3fa'; ui.roundRect(g, x - w / 2 - 6, y - 6, w + 12, h + 12, 22); g.fill();
  const sg = g.createLinearGradient(0, y, 0, y + h);
  sg.addColorStop(0, '#4b3a8f'); sg.addColorStop(1, '#c57ac0');
  g.fillStyle = sg; ui.roundRect(g, x - w / 2, y, w, h, 18); g.fill();
  g.fillStyle = '#fff6c2';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x - w / 2 + 14 + hh(i + x) * (w - 28), y + 12 + hh(i * 3 + x) * (h * 0.6), 2 + hh(i + 9) * 2, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(x + 50, y + 50, 22, 0, TAU); g.fill();
  g.fillStyle = '#4b3a8f'; g.beginPath(); g.arc(x + 60, y + 44, 19, 0, TAU); g.fill();
  g.strokeStyle = '#fff3fa'; g.lineWidth = 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h); g.moveTo(x - w / 2, y + h * 0.52); g.lineTo(x + w / 2, y + h * 0.52); g.stroke();
  // curtains
  for (const s of [-1, 1]) {
    g.fillStyle = '#ff8fc4'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath();
    const ox = x + s * (w / 2 + 16);
    g.moveTo(ox, y - 22); g.lineTo(ox - s * 64, y - 22);
    g.quadraticCurveTo(ox - s * 40, y + h * 0.45, ox - s * 22, y + h * 0.55);
    g.quadraticCurveTo(ox - s * 40, y + h * 0.8, ox - s * 30, y + h + 22);
    g.lineTo(ox + s * 10, y + h + 22); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(ox - s * 24, y + h * 0.55, 10, 16, 0, 0, TAU); g.fill(); g.stroke();
  }
  g.fillStyle = '#c47ab0'; g.strokeStyle = NAVY; g.lineWidth = 4; ui.roundRect(g, x - w / 2 - 50, y - 34, w + 100, 16, 8); g.fill(); g.stroke();
}

function balloons(g, x, y, cols) {
  const pts = [[-40, -40], [30, -60], [0, 10]];
  g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 2.5;
  for (const [dx, dy] of pts) { g.beginPath(); g.moveTo(x + dx, y + dy + 46); g.quadraticCurveTo(x + dx * 0.4 + 10, y + 110, x, y + 150); g.stroke(); }
  pts.forEach(([dx, dy], i) => {
    g.fillStyle = cols[i]; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.ellipse(x + dx, y + dy, 36, 44, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x + dx - 7, y + dy + 50); g.lineTo(x + dx + 7, y + dy + 50); g.lineTo(x + dx, y + dy + 42); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x + dx - 12, y + dy - 16, 8, 13, -0.4, 0, TAU); g.fill();
  });
}

function bunting(g, x0, y0, x1, y1, seed) {
  const sag = 70, n = 9;
  const pt = (u) => [lerp(x0, x1, u), lerp(y0, y1, u) + Math.sin(u * Math.PI) * sag];
  g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath();
  for (let k = 0; k <= 20; k++) { const [x, y] = pt(k / 20); k ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  const cols = ['#ff6fb1', '#ffd23f', '#6fe3b4', '#3fa7ff', '#9b5cff', '#ff9f1c'];
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n, [x, y] = pt(u), [xa, ya] = pt(u - 0.035), [xb, yb] = pt(u + 0.035);
    g.fillStyle = cols[(k + seed) % cols.length]; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo(x, y + 58); g.closePath(); g.fill(); g.stroke();
  }
}

// --- cushion -----------------------------------------------------------------------
/**
 * A fluffy square cushion seen from above at 3/4. (x, y) = centre of its
 * footprint on the floor; w = width; z = hop height; sq = squash (0 = rest,
 * + = squished flat); glow = highlight (free seat while the music is off).
 */
export function drawCushion(g, x, y, w, ci, { z = 0, sq = 0, glow = 0, t = 0, alpha = 1 } = {}) {
  const [top, side, btn] = CUSHION_COLORS[ci % CUSHION_COLORS.length];
  const h = w * 0.62, th = w * 0.2;
  g.save();
  g.globalAlpha *= alpha;
  // shadow
  g.fillStyle = 'rgba(70,30,50,0.25)';
  g.beginPath(); g.ellipse(x + 4, y + h * 0.18, w * 0.56 * (1 + z * 0.002), h * 0.46, 0, 0, TAU); g.fill();
  if (glow > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const r = w * (0.95 + 0.08 * Math.sin(t * 8));
    const gr = g.createRadialGradient(x, y, 4, x, y, r);
    gr.addColorStop(0, `rgba(255,236,140,${0.75 * glow})`); gr.addColorStop(1, 'rgba(255,210,80,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 0, TAU); g.fill();
    g.restore();
  }
  const sx = 1 + sq * 0.22, sy = 1 - sq * 0.35;
  g.translate(x, y - z); g.scale(sx, sy);
  if (drawArt(g, 'prop/cushion-' + (ci % CUSHION_COLORS.length), 0, th * 0.5, w * 1.12, w * 1.12 * 0.8, { anchor: 'bottom' })) { g.restore(); return; }
  g.lineJoin = 'round';
  const pillow = (oy, ww, hh2, bulge) => {
    const l = -ww / 2, r = ww / 2, tp = oy - hh2 / 2, bt = oy + hh2 / 2;
    g.beginPath();
    g.moveTo(l + 6, tp + 4);
    g.quadraticCurveTo(0, tp - bulge * 0.7, r - 6, tp + 4);
    g.quadraticCurveTo(r + bulge, oy, r - 6, bt - 4);
    g.quadraticCurveTo(0, bt + bulge * 0.7, l + 6, bt - 4);
    g.quadraticCurveTo(l - bulge, oy, l + 6, tp + 4);
    g.closePath();
  };
  // side (thickness) then top
  g.fillStyle = side; g.strokeStyle = NAVY; g.lineWidth = Math.max(3, w * 0.045);
  pillow(0, w, h, w * 0.1); g.fill(); g.stroke();
  g.fillStyle = top;
  pillow(-th, w, h, w * 0.1); g.fill(); g.stroke();
  // soft highlight
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(-w * 0.18, -th - h * 0.16, w * 0.22, h * 0.14, -0.2, 0, TAU); g.fill();
  // tuft creases to the button
  g.strokeStyle = 'rgba(36,22,63,0.28)'; g.lineWidth = Math.max(2, w * 0.022);
  for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    g.beginPath(); g.moveTo(cx * w * 0.08, -th + cy * h * 0.07); g.lineTo(cx * w * 0.26, -th + cy * h * 0.24); g.stroke();
  }
  g.fillStyle = btn; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, w * 0.03);
  g.beginPath(); g.ellipse(0, -th, w * 0.07, w * 0.05, 0, 0, TAU); g.fill(); g.stroke();
  // corner tassels
  g.fillStyle = btn;
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * w * 0.5, -th - h * 0.42, w * 0.045, 0, TAU); g.fill(); g.stroke(); }
  g.restore();
}

// --- record player ---------------------------------------------------------------
/** The record player on its little table. spin = disc angle; arm 0 (playing) .. 1 (lifted off). */
export function drawRecordPlayer(g, spin, arm, t, { wobble = 0, glow = 0 } = {}) {
  const x = RP.x, y = RP.y;
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  // table
  g.fillStyle = 'rgba(70,30,50,0.25)'; g.beginPath(); g.ellipse(x, y + 2, 170, 20, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 5;
  g.fillStyle = '#c98a55';
  for (const lx of [-120, 120]) { g.beginPath(); g.rect(x + lx - 9, y - 70, 18, 70); g.fill(); g.stroke(); }
  g.fillStyle = '#e0a36a'; ui.roundRect(g, x - 160, y - 92, 320, 30, 12); g.fill(); g.stroke();
  g.fillStyle = '#efb985'; g.beginPath(); g.ellipse(x, y - 92, 160, 18, 0, 0, TAU); g.fill(); g.stroke();
  if (drawArt(g, 'prop/record-player', x, y - 96, 280, 190, { anchor: 'bottom' })) {
    drawArm(g, x, y - 96, arm);
    g.restore();
    return;
  }
  const by = y - 96 + Math.sin(t * 40) * wobble * 2;
  // box
  g.fillStyle = '#ff7ab8'; ui.roundRect(g, x - 130, by - 58, 260, 58, 14); g.fill(); g.stroke();
  g.fillStyle = '#ffb3d9'; g.beginPath();
  g.moveTo(x - 130, by - 52); g.lineTo(x - 108, by - 96); g.lineTo(x + 108, by - 96); g.lineTo(x + 130, by - 52); g.closePath(); g.fill(); g.stroke();
  // knobs
  for (const [kx, col] of [[-95, '#ffd23f'], [-62, '#6fe3b4'], [95, '#8fd0ff']]) { g.fillStyle = col; g.beginPath(); g.arc(x + kx, by - 28, 10, 0, TAU); g.fill(); g.stroke(); }
  // speaker grille dots
  g.fillStyle = 'rgba(36,22,63,0.35)';
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(x - 20 + i * 14, by - 36 + j * 14, 3.2, 0, TAU); g.fill(); }
  // disc
  const dx = x - 12, dy = by - 74;
  if (glow > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(dx, dy, 5, dx, dy, 140);
    gr.addColorStop(0, `rgba(255,240,170,${0.6 * glow})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.fillRect(dx - 150, dy - 150, 300, 300); g.restore();
  }
  g.fillStyle = '#2b2140'; g.beginPath(); g.ellipse(dx, dy, 78, 18, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2;
  for (const r of [0.8, 0.62]) { g.beginPath(); g.ellipse(dx, dy, 78 * r, 18 * r, 0, 0, TAU); g.stroke(); }
  // rotating shine
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 4;
  for (const off of [0, Math.PI]) { const a = spin + off; g.beginPath(); g.ellipse(dx, dy, 66, 15, 0, a, a + 0.6); g.stroke(); }
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath(); g.ellipse(dx, dy, 24, 6.5, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.ellipse(dx + Math.cos(spin) * 12, dy + Math.sin(spin) * 3, 5, 2, 0, 0, TAU); g.fill();
  drawArm(g, x, by, arm);
  g.restore();
}

function drawArm(g, x, by, arm) {
  // pivot at the back right of the deck; the needle rests on the disc at arm = 0
  // and swings up and off it as arm goes to 1
  const k = clamp(arm, 0, 1);
  const px = x + 98, py = by - 84;
  const ex = lerp(x + 26, x + 126, k), ey = lerp(by - 68, by - 122, k) - Math.sin(k * Math.PI) * 16;
  g.strokeStyle = NAVY; g.lineWidth = 11;
  g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.stroke();
  g.strokeStyle = '#e6e2f2'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.stroke();
  g.fillStyle = '#ff6fb1'; g.strokeStyle = NAVY; g.lineWidth = 3.5;
  g.beginPath(); g.arc(px, py, 12, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; ui.roundRect(g, ex - 10, ey - 7, 20, 14, 4); g.fill(); g.stroke();
}

/** A speaker on the floor next to the table; pulse 0..1 pumps the cone. */
export function drawSpeaker(g, x, y, pulse) {
  g.save(); g.lineJoin = 'round';
  g.fillStyle = 'rgba(70,30,50,0.25)'; g.beginPath(); g.ellipse(x, y + 2, 60, 12, 0, 0, TAU); g.fill();
  if (drawArt(g, 'prop/party-speaker', x, y, 120, 170, { anchor: 'bottom' })) { g.restore(); return; }
  g.strokeStyle = NAVY; g.lineWidth = 5; g.fillStyle = '#9b7bff';
  ui.roundRect(g, x - 52, y - 160, 104, 160, 16); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.18)'; ui.roundRect(g, x - 44, y - 152, 30, 144, 10); g.fill();
  const s = 1 + pulse * 0.12;
  for (const [cy, r] of [[-115, 20], [-52, 34]]) {
    g.fillStyle = '#3a2d5c'; g.beginPath(); g.arc(x, y + cy, r * s, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ff9fcf'; g.beginPath(); g.arc(x, y + cy, r * 0.42 * s, 0, TAU); g.fill();
  }
  g.restore();
}

// --- menu thumbnail ----------------------------------------------------------------
export function drawIcon(g, x, y, w, h, t = 0) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#ffd3ec'; g.fillRect(x, y, w, h * 0.34);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 10; i++) g.fillRect(x + (i * w) / 10, y, w / 22, h * 0.34);
  g.fillStyle = '#efbf88'; g.fillRect(x, y + h * 0.34, w, h * 0.66);
  g.fillStyle = 'rgba(150,85,40,0.15)';
  for (let i = 0; i < 6; i++) g.fillRect(x, y + h * 0.34 + i * h * 0.11, w, 2);
  // rug
  const cx = x + w / 2, cy = y + h * 0.66;
  g.fillStyle = '#ff9fcf'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, h * 0.012);
  g.beginPath(); g.ellipse(cx, cy, w * 0.42, h * 0.28, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#c9f0e2'; g.beginPath(); g.ellipse(cx, cy, w * 0.34, h * 0.22, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff1f8'; g.beginPath(); g.ellipse(cx, cy, w * 0.2, h * 0.13, 0, 0, TAU); g.fill();
  // record player
  g.save(); g.translate(cx, y + h * 0.3); const s = h / 700; g.scale(s, s);
  g.translate(-RP.x, -RP.y); drawRecordPlayer(g, t * 4, 0.15 + 0.15 * Math.sin(t * 2), t); g.restore();
  // cushions in a ring, hopping to the beat
  for (let i = 0; i < 4; i++) {
    const a = t * 0.6 + (i / 4) * TAU;
    const px = cx + Math.cos(a) * w * 0.26, py = cy + Math.sin(a) * h * 0.15;
    drawCushion(g, px, py, w * 0.15, i, { z: Math.abs(Math.sin(t * 4.4 + i)) * h * 0.02, t });
  }
  // notes
  g.fillStyle = NAVY; g.font = `900 ${Math.round(h * 0.11)}px Fredoka, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.5 + i / 4) % 1;
    g.globalAlpha = Math.sin(k * Math.PI);
    g.fillStyle = ['#ff4d9a', '#7a4dff', '#ff9f1c', '#1fae8a'][i];
    g.fillText(i % 2 ? '♪' : '♫', x + w * (0.18 + i * 0.2), y + h * (0.28 - k * 0.2));
  }
  g.restore();
}
