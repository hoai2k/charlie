// Snowball Splat - procedural art. Every piece first asks for generated art
// (art()/drawArt(), see image-requests-history.md "New Party game: snowball-splat")
// and falls back to the vector drawing here, which is what ships today.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { clamp, lerp, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
// Feet area (world px). The top band holds the fence, cottage and sky.
export const ARENA = { x0: 90, y0: 280, x1: 1830, y1: 1028 };
// Frozen pond in the middle: slippery, and there's no snow to scoop on it.
export const POND = { x: 960, y: 652, rx: 205, ry: 88 };
export const WALL_H = 84;          // front-face height of a fort wall

const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// --- small pieces -------------------------------------------------------------
/** A snowball centred on (x, y) with radius r. */
export function drawSnowball(g, x, y, r) {
  if (drawArt(g, 'prop/snowball', x, y, r * 2.3, r * 2.3)) return;
  g.save();
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.65, '#f1f7ff'); gr.addColorStop(1, '#bcd9f5');
  g.fillStyle = gr; g.strokeStyle = NAVY; g.lineWidth = Math.max(1.5, r * 0.17);
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(160,200,240,0.6)';
  g.beginPath(); g.arc(x + r * 0.3, y + r * 0.25, r * 0.18, 0, TAU); g.arc(x - r * 0.25, y + r * 0.42, r * 0.12, 0, TAU); g.fill();
  g.restore();
}

/** Ground shadow for something at height z above (x, y). */
export function drawShadow(g, x, y, r, z = 0, alpha = 0.28) {
  const k = clamp(1 - z / 360, 0.35, 1);
  g.save(); g.globalAlpha = alpha * k; g.fillStyle = '#39507a';
  g.beginPath(); g.ellipse(x, y, r * k, r * 0.38 * k, 0, 0, TAU); g.fill(); g.restore();
}

/** A giant rolling snowball; rot = rolled angle. */
export function drawGiantBall(g, x, y, r, rot, dirx = 1) {
  g.save(); g.translate(x, y - r);
  if (drawArt(g, 'prop/giant-snowball', 0, 0, r * 2.15, r * 2.15)) {
    g.restore(); return;
  }
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#eef6ff'); gr.addColorStop(1, '#a9cdf0');
  g.fillStyle = gr; g.strokeStyle = NAVY; g.lineWidth = Math.max(3, r * 0.08);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
  // rolling lumps
  g.save(); g.beginPath(); g.arc(0, 0, r - 2, 0, TAU); g.clip();
  g.rotate(rot * (dirx >= 0 ? 1 : -1));
  g.fillStyle = 'rgba(150,190,235,0.55)';
  for (let i = 0; i < 7; i++) { const a = i * 0.9, d = r * (0.25 + (i % 3) * 0.22); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.08 + (i % 2) * 0.05), 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(130,175,225,0.6)'; g.lineWidth = r * 0.05;
  g.beginPath(); g.arc(0, 0, r * 0.6, 0.3, 1.6); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.45, 3.4, 4.5); g.stroke();
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fill();
  g.restore();
}

/** Red knitted mitten centred on (x, y), height s. */
export function drawMitten(g, x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (drawArt(g, 'prop/triple-mitten', 0, 0, s * 1.1, s * 1.1)) { g.restore(); return; }
  const k = s / 100;
  g.scale(k, k);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 7;
  g.fillStyle = '#ff4d6d';
  g.beginPath();
  g.moveTo(-26, 28); g.lineTo(-30, -14); g.quadraticCurveTo(-30, -48, 0, -48); g.quadraticCurveTo(28, -48, 28, -16);
  g.lineTo(28, 28); g.closePath(); g.fill(); g.stroke();
  // thumb
  g.beginPath(); g.ellipse(-36, 0, 12, 20, -0.5, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff4d6d'; g.fillRect(-30, -12, 10, 24);
  // knit stripes
  g.strokeStyle = '#ffd23f'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(-27, -6); g.lineTo(27, -6); g.stroke();
  g.strokeStyle = '#ffffff'; g.beginPath(); g.moveTo(-27, 6); g.lineTo(27, 6); g.stroke();
  // cuff
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 7;
  ui.roundRect(g, -32, 24, 64, 26, 10); g.fill(); g.stroke();
  g.fillStyle = '#e2ecfa'; for (let i = 0; i < 4; i++) g.fillRect(-24 + i * 15, 30, 6, 14);
  g.restore();
}

/** White splat on the ground at (x, y). */
export function drawGroundSplat(g, x, y, r, seed, alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.translate(x, y); g.scale(1, 0.42);
  if (drawArt(g, 'prop/snow-splat', 0, 0, r * 2.6, r * 2.6)) { g.restore(); return; }
  g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(120,160,215,0.55)'; g.lineWidth = 3;
  g.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, rr = r * (0.7 + hh(seed + i) * 0.45);
    const a2 = a + Math.PI / n, r2 = r * (0.45 + hh(seed + i + 50) * 0.2);
    if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    g.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
  }
  g.closePath(); g.fill(); g.stroke();
  for (let i = 0; i < 4; i++) { const a = hh(seed + i * 7) * TAU, d = r * (1.15 + hh(seed + i * 3) * 0.35); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.13, 0, TAU); g.fill(); }
  g.restore();
}

/** Snowy splat stuck on a face (forward space, centred on the eyes). */
export function drawFaceSplat(g, x, y, r, alpha = 1) {
  g.save(); g.globalAlpha *= alpha; g.translate(x, y);
  if (drawArt(g, 'prop/face-splat', 0, 0, r * 2.4, r * 2.4)) { g.restore(); return; }
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.1);
  g.beginPath();
  g.arc(0, 0, r * 0.72, 0, TAU);
  g.moveTo(r * 0.9, -r * 0.25); g.arc(r * 0.62, -r * 0.3, r * 0.35, 0, TAU);
  g.moveTo(-r * 0.4, -r * 0.55); g.arc(-r * 0.55, -r * 0.5, r * 0.32, 0, TAU);
  g.moveTo(r * 0.1, r * 0.95); g.arc(-r * 0.05, r * 0.7, r * 0.28, 0, TAU);
  g.fill();
  g.stroke();
  g.fill();
  // drips
  g.beginPath(); g.ellipse(-r * 0.5, r * 0.75, r * 0.12, r * 0.28, 0, 0, TAU); g.ellipse(r * 0.42, r * 0.62, r * 0.1, r * 0.22, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(160,200,240,0.7)';
  g.beginPath(); g.arc(r * 0.2, r * 0.18, r * 0.16, 0, TAU); g.arc(-r * 0.3, -r * 0.1, r * 0.1, 0, TAU); g.fill();
  g.restore();
}

/** Floating power-up pickup, centred on (x, y). kind: 'giant' | 'mitten'. */
export function drawPowerup(g, kind, x, y, s, t) {
  g.save(); g.translate(x, y);
  // glow
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(0, 0, 4, 0, 0, s * 0.95);
  const c = kind === 'giant' ? '150,210,255' : '255,140,170';
  gr.addColorStop(0, `rgba(${c},0.75)`); gr.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = gr; g.fillRect(-s, -s, s * 2, s * 2); g.restore();
  // bubble
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4;
  g.beginPath(); g.arc(0, 0, s * 0.56, 0, TAU); g.fill(); g.stroke();
  g.rotate(Math.sin(t * 2.4) * 0.12);
  if (kind === 'giant') {
    if (!drawArt(g, 'prop/powerup-giant', 0, 0, s * 1.05, s * 1.05)) drawGiantBall(g, 0, s * 0.36, s * 0.36, t * 0.6);
  } else {
    drawMitten(g, 0, 0, s * 0.7, -0.15);
    ui.text(g, 'x3', s * 0.36, s * 0.3, { size: Math.round(s * 0.3), color: '#ffd23f', weight: 800 });
  }
  g.restore();
}

// --- fort wall -----------------------------------------------------------------
/**
 * A packed-snow fort wall. Footprint (w x d) centred on (x, y); k = build
 * progress (0..1, for the rebuild pop-up), dmg = 0..1 how bitten-down it is.
 */
export function drawWall(g, wl, k, dmg, t) {
  const x0 = wl.x - wl.w / 2, x1 = wl.x + wl.w / 2, y0 = wl.y - wl.d / 2, y1 = wl.y + wl.d / 2;
  const h = WALL_H * k * (1 - dmg * 0.42);
  const wob = wl.wob > 0 ? Math.sin(t * 60) * wl.wob * 8 : 0;
  g.save(); g.translate(wob, 0);
  g.fillStyle = 'rgba(57,80,122,0.22)'; ui.roundRect(g, x0 + 6, y0 + 8, wl.w + 8, wl.d + 6, 14); g.fill();
  const horiz = wl.w >= wl.d;
  const key = horiz ? 'prop/snow-wall' : 'prop/snow-wall-side';
  const img = art(key);
  if (img) {
    drawWallArt(g, img, horiz, x0, y0, wl.w, wl.d, h);
    if (dmg > 0) drawCracks(g, x0, y1 - h, wl.w, h, dmg, wl.seed);
    g.restore(); return;
  }
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  // front face
  const fg = g.createLinearGradient(0, y1 - h, 0, y1);
  fg.addColorStop(0, '#e6f1ff'); fg.addColorStop(1, '#b7d3f2');
  g.fillStyle = fg; ui.roundRect(g, x0, y1 - h, wl.w, h, 10); g.fill(); g.stroke();
  // snow bricks on the front
  g.save(); ui.roundRect(g, x0, y1 - h, wl.w, h, 10); g.clip();
  g.strokeStyle = 'rgba(110,150,205,0.55)'; g.lineWidth = 3;
  const rows = Math.max(1, Math.round(h / 28));
  for (let r = 1; r < rows; r++) { const yy = y1 - h + (h * r) / rows; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke(); }
  const bw = horiz ? 58 : 34;
  for (let r = 0; r < rows; r++) {
    const ya = y1 - h + (h * r) / rows, yb = y1 - h + (h * (r + 1)) / rows;
    for (let xx = x0 + (r % 2 ? bw / 2 : bw); xx < x1 - 6; xx += bw) { g.beginPath(); g.moveTo(xx, ya); g.lineTo(xx, yb); g.stroke(); }
  }
  g.restore();
  // top face
  const tg = g.createLinearGradient(0, y0 - h, 0, y1 - h);
  tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#f1f7ff');
  g.fillStyle = tg; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath();
  // a lumpy top edge where it's been bitten
  const steps = Math.max(4, Math.round(wl.w / 26));
  g.moveTo(x0, y1 - h);
  g.lineTo(x0, y0 - h + 8);
  for (let i = 0; i <= steps; i++) {
    const xx = lerp(x0 + 6, x1 - 6, i / steps);
    const bite = dmg > 0 ? hh(wl.seed + i) * dmg * 12 : 0;
    g.lineTo(xx, y0 - h + bite + (i % 2 ? 2 : -2));
  }
  g.lineTo(x1, y0 - h + 8); g.lineTo(x1, y1 - h);
  g.closePath(); g.fill(); g.stroke();
  // snow sparkle
  g.fillStyle = 'rgba(255,255,255,0.95)';
  for (let i = 0; i < 3; i++) { const sx = lerp(x0 + 14, x1 - 14, hh(wl.seed * 3 + i)), sy = lerp(y0 - h + 8, y1 - h - 6, hh(wl.seed * 5 + i)); sparkle(g, sx, sy, 5 + 2 * Math.sin(t * 3 + i)); }
  if (dmg > 0) drawCracks(g, x0, y1 - h, wl.w, h, dmg, wl.seed);
  g.restore();
}

// Wall art is drawn in two slices: the top face always covers the footprint
// (w x d, raised by h) and only the front face (height h) shrinks with damage
// and grows back on a rebuild, so the top never squashes. Fractions of the
// image height that are the top face (see image-requests.md):
const WALL_TOP = { h: 0.34, v: 0.67 };
function drawWallArt(g, img, horiz, x0, y0, w, d, h) {
  const iw = img.width, ih = img.height, top = ih * (horiz ? WALL_TOP.h : WALL_TOP.v);
  const yTop = y0 - h;
  g.drawImage(img, 0, 0, iw, top, x0, yTop, w, d);
  if (h > 0.5) g.drawImage(img, 0, top, iw, ih - top, x0, yTop + d, w, h);
}

function drawCracks(g, x, y, w, h, dmg, seed) {
  g.save(); g.strokeStyle = 'rgba(70,100,160,0.75)'; g.lineWidth = 3; g.lineCap = 'round';
  const n = Math.ceil(dmg * 4);
  for (let i = 0; i < n; i++) {
    let cx = x + w * (0.15 + hh(seed + i * 11) * 0.7), cy = y + 6;
    g.beginPath(); g.moveTo(cx, cy);
    for (let s = 0; s < 3; s++) { cx += (hh(seed + i + s * 5) - 0.5) * 22; cy += h * 0.22; g.lineTo(cx, cy); }
    g.stroke();
  }
  g.restore();
}

/** Crumbled wall: a low lumpy pile of snow; `k` 0..1 = how soon it rebuilds (shows a faint outline). */
export function drawRubble(g, wl, k) {
  const x0 = wl.x - wl.w / 2, y1 = wl.y + wl.d / 2;
  if (k > 0.55) {
    g.save(); g.globalAlpha = (k - 0.55) / 0.45 * 0.5; g.setLineDash([10, 10]); g.strokeStyle = '#ffffff'; g.lineWidth = 4;
    ui.roundRect(g, x0, wl.y - wl.d / 2 - WALL_H, wl.w, wl.d + WALL_H, 10); g.stroke(); g.restore();
  }
  if (wl.w >= wl.d) { if (drawArt(g, 'prop/snow-rubble', wl.x, y1 + 4, wl.w + 30, 60, { anchor: 'bottom' })) return; }
  else if (art('prop/snow-rubble')) {
    // A side wall runs away from the camera: a line of smaller heaps along it.
    for (let i = 1; i <= 3; i++) drawArt(g, 'prop/snow-rubble', wl.x + (i - 2) * 6, wl.y - wl.d / 2 + (i * wl.d) / 3 + 4, wl.w + 64, 40, { anchor: 'bottom' });
    return;
  }
  g.save(); g.strokeStyle = NAVY; g.lineWidth = 4;
  const n = Math.max(3, Math.round(Math.max(wl.w, wl.d) / 45));
  for (let i = 0; i < n; i++) {
    const horiz = wl.w >= wl.d;
    const px = horiz ? x0 + ((i + 0.5) / n) * wl.w : wl.x + (hh(wl.seed + i) - 0.5) * 30;
    const py = horiz ? wl.y + (hh(wl.seed + i) - 0.5) * 16 : wl.y - wl.d / 2 + ((i + 0.5) / n) * wl.d;
    const r = 20 + hh(wl.seed + i * 3) * 12;
    g.fillStyle = i % 2 ? '#eef5ff' : '#ffffff';
    g.beginPath(); g.ellipse(px, py, r, r * 0.6, 0, Math.PI, TAU); g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

// --- snowman ---------------------------------------------------------------------
/** Snowman on the ground at (x, y). hp 3 = whole, 2 = lost the hat, 1 = lost the head. */
export function drawSnowman(g, sm, k, t) {
  const { x, y } = sm;
  const wob = sm.wob > 0 ? Math.sin(t * 40) * sm.wob * 0.25 : Math.sin(t * 1.3 + sm.seed) * 0.02;
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(57,80,122,0.25)'; g.beginPath(); g.ellipse(6, 4, 50, 17, 0, 0, TAU); g.fill();
  g.scale(k, k); g.rotate(wob);
  const ball = (cy, r) => {
    const gr = g.createRadialGradient(-r * 0.35, cy - r * 0.4, r * 0.1, 0, cy, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.75, '#eef6ff'); gr.addColorStop(1, '#b8d5f2');
    g.fillStyle = gr; g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.arc(0, cy, r, 0, TAU); g.fill(); g.stroke();
  };
  const keyFor = sm.hp >= 3 ? 'prop/snowman' : sm.hp === 2 ? 'prop/snowman-nohat' : 'prop/snowman-body';
  if (drawArt(g, keyFor, 0, 6, 150, 210, { anchor: 'bottom' })) { g.restore(); return; }
  // twig arms (behind)
  g.strokeStyle = '#7a4a2a'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-26, -92); g.lineTo(-64, -118); g.moveTo(-50, -109); g.lineTo(-56, -128); g.stroke();
  g.beginPath(); g.moveTo(26, -92); g.lineTo(62, -112); g.moveTo(50, -105); g.lineTo(62, -96); g.stroke();
  ball(-38, 42);
  ball(-100, 31);
  // buttons
  g.fillStyle = NAVY; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, -84 - i * 16 + 32, 4.5, 0, TAU); g.fill(); }
  if (sm.hp >= 2) {
    ball(-148, 24);
    // eyes, smile, carrot
    g.fillStyle = NAVY;
    g.beginPath(); g.arc(-8, -154, 3.8, 0, TAU); g.arc(9, -154, 3.8, 0, TAU); g.fill();
    for (let i = 0; i < 5; i++) { const a = 0.5 + i * 0.5; g.beginPath(); g.arc(Math.cos(a) * 12, -146 + Math.sin(a) * 9, 2, 0, TAU); g.fill(); }
    g.fillStyle = '#ff9f1c'; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -150); g.lineTo(24, -145); g.lineTo(0, -142); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff7aa8'; g.globalAlpha = 0.6; g.beginPath(); g.arc(-15, -144, 4, 0, TAU); g.arc(16, -144, 4, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  // scarf
  g.fillStyle = sm.scarf; g.strokeStyle = NAVY; g.lineWidth = 4;
  ui.roundRect(g, -30, sm.hp >= 2 ? -132 : -128, 60, 14, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(14, -122); g.lineTo(30, -96); g.lineTo(18, -94); g.lineTo(6, -120); g.closePath(); g.fill(); g.stroke();
  if (sm.hp >= 3) drawHat(g, 0, -168, sm.hat);
  g.restore();
}

/** Little bobble hat (bottom centre at x, y). */
export function drawHat(g, x, y, color) {
  g.save(); g.translate(x, y);
  g.fillStyle = color; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.moveTo(-20, 2); g.quadraticCurveTo(-20, -26, 0, -28); g.quadraticCurveTo(20, -26, 20, 2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; ui.roundRect(g, -23, -4, 46, 11, 5); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, -30, 7, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** Snowman knocked flat: a lumpy pile with the scarf on top. */
export function drawSnowmanPile(g, sm, k) {
  g.save(); g.translate(sm.x, sm.y);
  if (k > 0.55) { g.globalAlpha = (k - 0.55) / 0.45 * 0.5; g.setLineDash([8, 8]); g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, -90, 44, 92, 0, 0, TAU); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
  if (drawArt(g, 'prop/snowman-pile', 0, 6, 130, 70, { anchor: 'bottom' })) { g.restore(); return; }
  g.strokeStyle = NAVY; g.lineWidth = 4;
  for (const [px, py, r] of [[-22, -4, 26], [20, -2, 24], [0, -14, 22]]) { g.fillStyle = '#f3f8ff'; g.beginPath(); g.ellipse(px, py, r, r * 0.65, 0, Math.PI, TAU); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = sm.scarf; ui.roundRect(g, -18, -24, 36, 10, 5); g.fill(); g.stroke();
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(18, -10); g.lineTo(36, -6); g.lineTo(18, -3); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function sparkle(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.25 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

// --- background -------------------------------------------------------------------
function pine(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#7a4a2a'; g.strokeStyle = NAVY; g.lineWidth = 5; g.fillRect(-9, -20, 18, 24); g.strokeRect(-9, -20, 18, 24);
  const tiers = [[-20, 62], [-62, 50], [-100, 38]];
  for (const [ty, w] of tiers) {
    g.fillStyle = '#2f8f5e';
    g.beginPath(); g.moveTo(-w, ty); g.lineTo(0, ty - 66); g.lineTo(w, ty); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(-w * 0.62, ty - 24); g.lineTo(0, ty - 66); g.lineTo(w * 0.62, ty - 24);
    for (let i = 4; i >= 0; i--) g.lineTo(-w * 0.62 + (i / 4) * w * 1.24, ty - 24 + (i % 2 ? 8 : 0));
    g.closePath(); g.fill();
  }
  g.restore();
}

function cottage(g, x, y) {
  g.save(); g.translate(x, y);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  // chimney
  g.fillStyle = '#d96a6a'; g.fillRect(70, -190, 34, 70); g.strokeRect(70, -190, 34, 70);
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(87, -192, 24, 10, 0, 0, TAU); g.fill(); g.stroke();
  // walls
  g.fillStyle = '#ffb3cf'; g.fillRect(-130, -120, 260, 120); g.strokeRect(-130, -120, 260, 120);
  // roof with thick snow
  g.fillStyle = '#9b5cff'; g.beginPath(); g.moveTo(-160, -112); g.lineTo(0, -210); g.lineTo(160, -112); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-168, -108); g.lineTo(0, -218); g.lineTo(168, -108);
  for (let i = 8; i >= 0; i--) g.lineTo(-168 + (i / 8) * 336, -108 + (i % 2 ? 16 : 6));
  g.closePath(); g.fill(); g.stroke();
  // windows (warm light)
  for (const wx of [-82, 50]) {
    g.fillStyle = '#ffe58a'; g.fillRect(wx, -92, 46, 42); g.strokeRect(wx, -92, 46, 42);
    g.beginPath(); g.moveTo(wx + 23, -92); g.lineTo(wx + 23, -50); g.moveTo(wx, -71); g.lineTo(wx + 46, -71); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(wx - 4, -54, 54, 8); g.strokeRect(wx - 4, -54, 54, 8);
  }
  // door + wreath
  g.fillStyle = '#7a4fc2'; g.beginPath(); g.moveTo(-22, 0); g.lineTo(-22, -62); g.arc(0, -62, 22, Math.PI, 0); g.lineTo(22, 0); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#2f8f5e'; g.lineWidth = 7; g.beginPath(); g.arc(0, -58, 11, 0, TAU); g.stroke();
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, -47, 4, 0, TAU); g.fill();
  g.restore();
}

/** Static backdrop: sky, cottage, pines, fence with lights, snowy ground and the pond. */
export function buildBackground() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  // sky
  const sk = g.createLinearGradient(0, 0, 0, 250);
  sk.addColorStop(0, '#8ccaf7'); sk.addColorStop(1, '#dff1ff');
  g.fillStyle = sk; g.fillRect(0, 0, W, 260);
  ui.cloud(g, 300, 70, 0.8, '#ffffff', 0.85); ui.cloud(g, 1180, 50, 0.6, '#ffffff', 0.8);
  // far snowy hills
  g.fillStyle = '#eef6ff';
  g.beginPath(); g.moveTo(0, 240);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, 160 + Math.sin(x * 0.004) * 30 + Math.sin(x * 0.011 + 1) * 12);
  g.lineTo(W, 240); g.closePath(); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(0, 250);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, 196 + Math.sin(x * 0.006 + 2) * 18);
  g.lineTo(W, 250); g.closePath(); g.fill();
  // pines behind the fence
  for (const [px, py, s] of [[80, 215, 1.0], [190, 205, 0.8], [560, 200, 0.7], [700, 212, 0.9], [1120, 206, 0.75], [1290, 214, 0.95], [1860, 214, 1.0]]) pine(g, px, py, s);
  cottage(g, 1580, 222);
  cottage(g, 380, 214);
  // ground
  const gg = g.createLinearGradient(0, 230, 0, H);
  gg.addColorStop(0, '#f4f9ff'); gg.addColorStop(1, '#e3efff');
  g.fillStyle = gg; g.fillRect(0, 230, W, H - 230);
  // soft drifts
  for (let i = 0; i < 46; i++) {
    const x = hh(i) * W, y = 270 + hh(i + 40) * (H - 290), r = 60 + hh(i + 80) * 120;
    g.fillStyle = hh(i + 9) > 0.5 ? 'rgba(200,222,250,0.32)' : 'rgba(255,255,255,0.7)';
    g.beginPath(); g.ellipse(x, y, r, r * 0.28, 0, 0, TAU); g.fill();
  }
  // fence with snow caps and party lights
  const fy = 236;
  g.strokeStyle = NAVY; g.lineWidth = 4;
  g.fillStyle = '#c98a52'; g.fillRect(0, fy - 34, W, 10); g.strokeRect(-4, fy - 34, W + 8, 10);
  g.fillRect(0, fy - 14, W, 10); g.strokeRect(-4, fy - 14, W + 8, 10);
  for (let x = 14; x < W; x += 46) {
    g.fillStyle = '#e0a56c'; g.beginPath(); g.moveTo(x, fy + 6); g.lineTo(x, fy - 50); g.lineTo(x + 12, fy - 62); g.lineTo(x + 24, fy - 50); g.lineTo(x + 24, fy + 6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x + 12, fy - 58, 15, 7, 0, 0, TAU); g.fill();
  }
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(W / 2, fy + 10, W * 0.56, 18, 0, 0, TAU); g.fill();
  // lights string
  g.strokeStyle = '#3a6b4a'; g.lineWidth = 3; g.beginPath();
  for (let x = 0; x <= W; x += 10) g.lineTo(x, fy - 46 + Math.sin((x / 92) * Math.PI) ** 2 * 18);
  g.stroke();
  const LC = ['#ff4d6d', '#ffd23f', '#36d17a', '#3fa7ff', '#ff6fd0', '#9b5cff'];
  for (let i = 0, x = 46; x < W; x += 92, i++) {
    const ly = fy - 46 + 18 * 0.5 + 6;
    g.fillStyle = LC[i % LC.length]; g.strokeStyle = NAVY; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(x, ly + 8, 7, 11, 0, 0, TAU); g.fill(); g.stroke();
  }
  // side banks + trees outside the play area
  const bank = (x, y, r) => { g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(120,160,215,0.6)'; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, Math.PI, TAU); g.closePath(); g.fill(); g.stroke(); };
  for (let y = 300; y < H + 60; y += 90) { bank(18, y, 80 + hh(y) * 30); bank(W - 18, y + 40, 80 + hh(y + 1) * 30); }
  for (let x = 0; x < W + 60; x += 110) bank(x, H + 26, 70 + hh(x) * 30);
  pine(g, 40, 560, 0.85); pine(g, W - 34, 470, 0.8); pine(g, 30, 940, 0.95); pine(g, W - 40, 900, 0.9);
  // pond: snowy rim, ice, cracks and streaks
  const P = POND;
  g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(120,160,215,0.7)'; g.lineWidth = 6;
  g.beginPath(); g.ellipse(P.x, P.y + 4, P.rx + 26, P.ry + 16, 0, 0, TAU); g.fill(); g.stroke();
  const ig = g.createLinearGradient(0, P.y - P.ry, 0, P.y + P.ry);
  ig.addColorStop(0, '#c9efff'); ig.addColorStop(1, '#86cdef');
  g.fillStyle = ig; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.fill(); g.stroke();
  g.save(); g.beginPath(); g.ellipse(P.x, P.y, P.rx - 4, P.ry - 4, 0, 0, TAU); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 8; g.lineCap = 'round';
  for (const [ox, oy, l] of [[-120, -40, 90], [-40, -55, 50], [60, 10, 110], [120, -30, 40]]) { g.beginPath(); g.moveTo(P.x + ox, P.y + oy + 30); g.lineTo(P.x + ox + l * 0.6, P.y + oy); g.stroke(); }
  g.strokeStyle = 'rgba(70,120,180,0.45)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(P.x - 60, P.y + 20); g.lineTo(P.x - 20, P.y + 5); g.lineTo(P.x + 10, P.y + 28); g.moveTo(P.x - 20, P.y + 5); g.lineTo(P.x - 6, P.y - 30); g.stroke();
  g.restore();
  // little snow sparkles
  g.fillStyle = 'rgba(255,255,255,0.95)';
  for (let i = 0; i < 70; i++) sparkle(g, 100 + hh(i + 300) * (W - 200), 280 + hh(i + 400) * (H - 300), 3 + hh(i + 500) * 4);
  return cv;
}

// --- menu thumbnail -----------------------------------------------------------------
export function drawThumb(g, x, y, w, h, t = 0) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = w / 400, hh2 = h / s;
  g.translate(x, y); g.scale(s, s);
  const sk = g.createLinearGradient(0, 0, 0, hh2);
  sk.addColorStop(0, '#9ed4fb'); sk.addColorStop(0.42, '#e3f3ff'); sk.addColorStop(0.43, '#f6faff'); sk.addColorStop(1, '#dbe9fb');
  g.fillStyle = sk; g.fillRect(0, 0, 400, hh2);
  pine(g, 40, hh2 * 0.44, 0.55); pine(g, 360, hh2 * 0.44, 0.6); pine(g, 300, hh2 * 0.42, 0.42);
  // fort wall (left) and snowman (right)
  drawWall(g, { x: 92, y: hh2 * 0.8, w: 120, d: 26, wob: 0, seed: 3 }, 0.7, 0, t);
  g.save(); g.translate(318, hh2 * 0.86); g.scale(0.62, 0.62); drawSnowman(g, { x: 0, y: 0, hp: 3, wob: 0, seed: 1, scarf: '#ff4d6d', hat: '#3fa7ff' }, 1, t); g.restore();
  // a snowball arc with a dotted trail
  const u = (t * 0.6) % 1;
  const sx = 110, sy = hh2 * 0.52, ex = 300, ey = hh2 * 0.42;
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = NAVY; g.lineWidth = 1.5;
  for (let i = 0; i <= 10; i++) {
    const k = i / 10; if (k > u) break;
    const px = lerp(sx, ex, k), py = lerp(sy, ey, k) - Math.sin(k * Math.PI) * 50;
    g.beginPath(); g.arc(px, py, 3, 0, TAU); g.fill();
  }
  const bx = lerp(sx, ex, u), by = lerp(sy, ey, u) - Math.sin(u * Math.PI) * 50;
  drawSnowball(g, bx, by, 13);
  // splat burst near the end
  const k2 = clamp((u - 0.85) / 0.15, 0, 1);
  if (k2 > 0) { g.save(); g.globalAlpha = k2; drawFaceSplat(g, ex + 8, ey, 18 + k2 * 6); g.restore(); }
  // big title-ish snowball + mitten
  drawGiantBall(g, 205, hh2 * 0.95, 34, t * 2);
  drawMitten(g, 60, hh2 * 0.3, 42, -0.3 + Math.sin(t * 3) * 0.1);
  // flakes
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 26; i++) { const fx = (hh(i) * 400 + Math.sin(t + i) * 8) % 400, fy = (hh(i + 7) * hh2 + t * 30 * (0.6 + hh(i + 3))) % hh2; g.beginPath(); g.arc(fx, fy, 1.6 + hh(i + 2) * 2.4, 0, TAU); g.fill(); }
  g.restore();
}
