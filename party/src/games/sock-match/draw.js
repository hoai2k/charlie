// Silly Sock Match - procedural drawing kit (socks, puppy, basket, line, yard).
// Every piece first tries its generated art key (see image-requests.md,
// "New Molly Party game: sock-match") and falls back to the vectors here.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { drawArt, art } from '../../engine/art.js';
import { TAU } from '../../engine/util.js';
import { starPath } from '../../engine/particles.js';

const NAVY = '#24163f';

export const PATTERNS = ['stripes', 'dots', 'hearts', 'stars', 'googly', 'rainbow', 'zigzag', 'flowers', 'checks', 'paws'];
export const PAT_COLOR = {
  stripes: '#ff8fc7', dots: '#5fb8ff', hearts: '#ff6f91', stars: '#ffd23f', googly: '#9be35a',
  rainbow: '#c9a0ff', zigzag: '#ffb03f', flowers: '#8be8c8', checks: '#b58cff', paws: '#ffc49a',
};

// sock outline in a 100 x 143 box centred on the origin, toe to the right
function sockPath(g) {
  g.beginPath();
  g.moveTo(-30, -66); g.lineTo(20, -66); g.lineTo(20, 12);
  g.bezierCurveTo(20, 20, 30, 22, 40, 24);
  g.bezierCurveTo(64, 28, 64, 68, 36, 68);
  g.lineTo(-4, 68);
  g.bezierCurveTo(-36, 68, -32, 40, -30, 28);
  g.closePath();
}

/** One sock centred at the origin (~100x143 at s = 1). flip mirrors it. */
export function drawSock(g, pat, s = 1, t = 0, flip = false) {
  g.save();
  if (flip) g.scale(-1, 1);
  if (drawArt(g, 'prop/sock-' + pat, 0, 0, 100 * s, 143 * s)) { g.restore(); return; }
  g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  sockPath(g);
  g.save(); g.clip();
  fillPattern(g, pat, t);
  // heel + toe patches
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(-28, 52, 18, 22, 0.4, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(56, 46, 16, 24, 0, 0, TAU); g.fill();
  // ribbed cuff
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(-34, -70, 58, 22);
  g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 2;
  for (let x = -26; x < 22; x += 7) { g.beginPath(); g.moveTo(x, -68); g.lineTo(x, -50); g.stroke(); }
  g.restore();
  sockPath(g);
  g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  g.beginPath(); g.moveTo(-30, -48); g.lineTo(20, -48); g.lineWidth = 3; g.stroke();
  if (pat === 'googly') drawGoogly(g, t);
  g.restore();
}

function fillPattern(g, pat, t) {
  const R = (c) => { g.fillStyle = c; g.fillRect(-70, -80, 140, 160); };
  if (pat === 'stripes') { R('#ff8fc7'); g.fillStyle = '#fff'; for (let y = -44; y < 80; y += 26) g.fillRect(-70, y, 140, 12); }
  else if (pat === 'dots') { R('#5fb8ff'); g.fillStyle = '#ffe066'; for (let y = -40; y < 80; y += 24) for (let x = -40; x < 70; x += 24) { g.beginPath(); g.arc(x + ((y / 24) % 2 ? 12 : 0), y, 7, 0, TAU); g.fill(); } }
  else if (pat === 'hearts') { R('#ffd6ea'); for (let y = -34; y < 80; y += 30) for (let x = -34; x < 70; x += 30) heart(g, x + ((Math.round(y / 30)) % 2 ? 15 : 0), y, 9, '#ff3b55'); }
  else if (pat === 'stars') { R('#4a3a8a'); g.fillStyle = '#ffd23f'; for (let y = -34; y < 80; y += 30) for (let x = -36; x < 70; x += 30) { g.save(); g.translate(x + ((Math.round(y / 30)) % 2 ? 15 : 0), y); starPath(g, 11); g.fill(); g.restore(); } }
  else if (pat === 'googly') { R('#9be35a'); g.fillStyle = '#7fcf3e'; for (let y = -40; y < 80; y += 20) g.fillRect(-70, y, 140, 6); }
  else if (pat === 'rainbow') { const c = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff', '#ff6fd0']; c.forEach((col, i) => { g.fillStyle = col; g.fillRect(-70, -48 + i * 18, 140, 18); }); }
  else if (pat === 'zigzag') {
    R('#ffb03f'); g.strokeStyle = '#7a3cff'; g.lineWidth = 12; g.lineJoin = 'miter';
    for (const y0 of [-14, 34]) { g.beginPath(); for (let x = -70, i = 0; x < 80; x += 16, i++) g.lineTo(x, y0 + (i % 2 ? 12 : -12)); g.stroke(); }
  } else if (pat === 'flowers') {
    R('#8be8c8');
    for (let y = -34; y < 80; y += 34) for (let x = -34; x < 70; x += 34) {
      const fx = x + ((Math.round(y / 34)) % 2 ? 17 : 0);
      g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(fx + Math.cos(k * 1.256) * 7, y + Math.sin(k * 1.256) * 7, 5.5, 0, TAU); g.fill(); }
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(fx, y, 4.5, 0, TAU); g.fill();
    }
  } else if (pat === 'checks') { R('#fff'); g.fillStyle = '#b58cff'; for (let y = -70, j = 0; y < 80; y += 18, j++) for (let x = -70, i = 0; x < 80; x += 18, i++) if ((i + j) % 2) g.fillRect(x, y, 18, 18); }
  else if (pat === 'paws') {
    R('#ffc49a'); g.fillStyle = '#8a5530';
    for (let y = -32; y < 80; y += 34) for (let x = -30; x < 70; x += 34) {
      const px = x + ((Math.round(y / 34)) % 2 ? 17 : 0);
      g.beginPath(); g.ellipse(px, y + 3, 7, 6, 0, 0, TAU); g.fill();
      for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(px + k * 7, y - 7 + Math.abs(k) * 2, 3, 0, TAU); g.fill(); }
    }
  }
}

function drawGoogly(g, t) {
  g.lineWidth = 3; g.strokeStyle = NAVY;
  for (const [x, y, r] of [[-14, -22, 13], [10, -18, 11]]) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    const a = t * 7 + x, d = r * 0.4;
    g.fillStyle = NAVY; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.abs(Math.sin(a)) * d, r * 0.48, 0, TAU); g.fill();
  }
  // silly smile with tongue on the foot
  g.beginPath(); g.arc(30, 40, 14, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = '#ff6f91'; g.beginPath(); g.ellipse(30, 55, 7, 6, 0, 0, TAU); g.fill(); g.stroke();
}

function heart(g, x, y, r, color) {
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.4);
  g.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  g.fillStyle = color; g.fill();
}

// ------------------------------------------------------------------ puppy

/**
 * The puppy, feet at the origin, facing right (dir -1 mirrors). pose: 'stand'
 * | 'run' | 'bow'. `sock` (pattern) is drawn in its mouth.
 */
export function drawPuppy(g, pose, dir, t, sock = null) {
  g.save(); g.scale(dir, 1);
  const key = pose === 'run' ? 'prop/sock-puppy-run' : pose === 'bow' ? 'prop/sock-puppy-bow' : 'prop/sock-puppy';
  const hop = pose === 'run' ? Math.abs(Math.sin(t * 16)) * 16 : 0;
  g.translate(0, -hop);
  if (drawArt(g, key, 0, 0, 210, 158, { anchor: 'bottom' })) {
    if (sock) { g.save(); g.translate(78, -72); g.rotate(0.9 + Math.sin(t * 18) * 0.5); drawSock(g, sock, 0.55, t); g.restore(); }
    g.restore(); return;
  }
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  const bow = pose === 'bow';
  const legPh = pose === 'run' ? t * 18 : 0;
  // tail
  const wag = Math.sin(t * (bow ? 22 : 14)) * 0.6;
  g.save(); g.translate(-58, bow ? -86 : -70); g.rotate(-0.9 + wag);
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10, -26, 4, -40); g.lineWidth = 12; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
  g.restore(); g.strokeStyle = NAVY; g.lineWidth = 5;
  // legs
  const legs = [[-40, 0], [-24, 1.6], [30, 3.1], [44, 4.7]];
  for (const [x, ph] of legs) {
    const sw = Math.sin(legPh + ph) * 14;
    const top = bow && x > 0 ? -26 : -40;
    g.beginPath(); g.moveTo(x, top); g.lineTo(x + sw, -4); g.lineWidth = 15; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 9; g.strokeStyle = '#fff'; g.stroke();
  }
  g.strokeStyle = NAVY; g.lineWidth = 5;
  // body
  g.save(); if (bow) { g.translate(0, -50); g.rotate(0.28); g.translate(0, 50); }
  g.beginPath(); g.ellipse(0, -58, 66, 34, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.stroke();
  g.fillStyle = '#e0b48a'; g.beginPath(); g.ellipse(-24, -70, 18, 12, 0.3, 0, TAU); g.fill();
  g.restore();
  // head
  const hy = bow ? -48 : -100, hx = 58;
  g.save(); g.translate(hx, hy); g.rotate(pose === 'run' ? Math.sin(t * 16) * 0.08 : Math.sin(t * 3) * 0.05);
  // back ear
  g.beginPath(); g.ellipse(-22, -12, 13, 26, 0.5 + (pose === 'run' ? -0.8 : 0), 0, TAU); g.fillStyle = '#a8703f'; g.fill(); g.stroke();
  g.beginPath(); g.arc(0, 0, 38, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.stroke();
  // brown patch over one eye/ear
  g.save(); g.beginPath(); g.arc(0, 0, 36, 0, TAU); g.clip();
  g.fillStyle = '#c98f5a'; g.beginPath(); g.ellipse(-12, -14, 22, 20, 0, 0, TAU); g.fill(); g.restore();
  // snout
  g.beginPath(); g.ellipse(28, 10, 22, 16, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(46, 4, 8, 6, 0, 0, TAU); g.fill();
  // eye
  g.beginPath(); g.ellipse(6, -8, 6, 8, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(4, -11, 2.5, 0, TAU); g.fill();
  // tongue / mouth
  if (!sock) { g.fillStyle = '#ff6f91'; g.beginPath(); g.ellipse(32, 30, 7, 10 + Math.sin(t * 12) * 2, 0, 0, TAU); g.fill(); g.lineWidth = 3; g.stroke(); }
  // front ear (floppy)
  g.lineWidth = 5;
  g.beginPath(); g.ellipse(-6, -26, 13, 26, -0.2 + (pose === 'run' ? -1.0 + Math.sin(t * 16) * 0.3 : Math.sin(t * 4) * 0.1), 0, TAU); g.fillStyle = '#a8703f'; g.fill(); g.stroke();
  if (sock) { g.save(); g.translate(40, 26); g.rotate(1.2 + Math.sin(t * 18) * 0.45); drawSock(g, sock, 0.55, t); g.restore(); }
  g.restore();
  g.restore();
}

// ------------------------------------------------------------------ basket

export function drawBasket(g, x, y, sq, t) {
  g.save(); g.translate(x, y); g.scale(1 + sq * 0.25, 1 - sq * 0.25);
  if (drawArt(g, 'prop/sock-basket', 0, 0, 260, 188, { anchor: 'bottom' })) { g.restore(); return; }
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  // socks peeking out
  for (const [dx, pat, r] of [[-60, 'stripes', -0.5], [10, 'dots', 0.2], [64, 'hearts', 0.7]]) { g.save(); g.translate(dx, -150); g.rotate(r + Math.sin(t * 3 + dx) * 0.05); drawSock(g, pat, 0.6, t); g.restore(); }
  g.beginPath(); g.moveTo(-130, -150); g.lineTo(130, -150); g.lineTo(108, 0); g.lineTo(-108, 0); g.closePath();
  g.fillStyle = '#e8b878'; g.fill();
  g.save(); g.clip();
  g.strokeStyle = '#c99554'; g.lineWidth = 5;
  for (let yy = -136; yy < 0; yy += 18) { g.beginPath(); for (let xx = -140; xx < 150; xx += 20) g.lineTo(xx, yy + ((xx / 20) % 2 ? 5 : -5)); g.stroke(); }
  g.restore();
  g.strokeStyle = NAVY; g.lineWidth = 6;
  g.beginPath(); g.moveTo(-130, -150); g.lineTo(130, -150); g.lineTo(108, 0); g.lineTo(-108, 0); g.closePath(); g.stroke();
  ui.roundRect(g, -140, -164, 280, 26, 13); g.fillStyle = '#d9a05e'; g.fill(); g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ line

export const LINE = { x0: 150, x1: 1770, y: 236, sag: 108 };
export function lineY(x) {
  const k = (x - LINE.x0) / (LINE.x1 - LINE.x0);
  return (1 - k) * (1 - k) * LINE.y + 2 * k * (1 - k) * (LINE.y + LINE.sag) + k * k * LINE.y;
}

export function drawLine(g) {
  g.save();
  g.lineCap = 'round';
  // poles
  for (const x of [LINE.x0 - 16, LINE.x1 + 16]) {
    g.fillStyle = '#b07a4a'; g.strokeStyle = NAVY; g.lineWidth = 5;
    ui.roundRect(g, x - 11, LINE.y - 30, 22, 640 - LINE.y + 30, 8); g.fill(); g.stroke();
    ui.roundRect(g, x - 44, LINE.y - 34, 88, 18, 8); g.fill(); g.stroke();
  }
  g.strokeStyle = NAVY; g.lineWidth = 7;
  g.beginPath(); g.moveTo(LINE.x0, LINE.y); g.quadraticCurveTo(960, LINE.y + LINE.sag, LINE.x1, LINE.y); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
  g.restore();
}

export function drawPin(g, x, y) {
  if (drawArt(g, 'prop/clothespin', x, y, 22, 44)) return;
  g.save(); g.fillStyle = '#e8c39a'; g.strokeStyle = NAVY; g.lineWidth = 3;
  ui.roundRect(g, x - 8, y - 20, 16, 40, 5); g.fill(); g.stroke();
  g.fillStyle = '#b8c0d0'; g.fillRect(x - 9, y - 4, 18, 6);
  g.restore();
}

// ------------------------------------------------------------------ yard

let bgCache = null;
export function drawYard(g, t) {
  const bg = art('bg/sock-match');
  if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
  if (!bgCache) {
    bgCache = document.createElement('canvas'); bgCache.width = W; bgCache.height = H;
    paintYard(bgCache.getContext('2d'));
  }
  g.drawImage(bgCache, 0, 0);
  // drifting clouds + sun rays
  for (let i = 0; i < 4; i++) ui.cloud(g, ((i * 520 + t * (16 + i * 4)) % (W + 500)) - 250, 140 + (i % 2) * 90, 0.9 + (i % 2) * 0.3, '#fff', 0.85);
}

function paintYard(g) {
  ui.sky(g, '#7cc8ff', '#d8f1ff', 600);
  g.fillStyle = '#d8f1ff'; g.fillRect(0, 600, W, H);
  // sun
  g.fillStyle = 'rgba(255,240,150,0.45)'; g.beginPath(); g.arc(1600, 150, 130, 0, TAU); g.fill();
  g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(1600, 150, 80, 0, TAU); g.fill();
  ui.hills(g, 470, '#a6e3a0', 40, 0.003, 0.5);
  // picket fence
  const fy = 560;
  g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(36,22,63,0.55)'; g.lineWidth = 3;
  g.fillRect(0, fy - 70, W, 16); g.fillRect(0, fy - 30, W, 16);
  for (let x = 10; x < W; x += 54) {
    g.beginPath(); g.moveTo(x, fy); g.lineTo(x, fy - 100); g.lineTo(x + 17, fy - 122); g.lineTo(x + 34, fy - 100); g.lineTo(x + 34, fy); g.closePath(); g.fill(); g.stroke();
  }
  // flowers along the fence
  for (let i = 0; i < 22; i++) {
    const x = 40 + i * 88 + (i % 3) * 10, h = 60 + (i % 4) * 22;
    g.strokeStyle = '#3fa34d'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, fy + 6); g.lineTo(x, fy - h); g.stroke();
    if (i % 3 === 0) { // sunflower
      g.fillStyle = '#ffd23f'; for (let k = 0; k < 10; k++) { g.beginPath(); g.ellipse(x + Math.cos(k * 0.628) * 16, fy - h + Math.sin(k * 0.628) * 16, 9, 5, k * 0.628, 0, TAU); g.fill(); }
      g.fillStyle = '#8a5530'; g.beginPath(); g.arc(x, fy - h, 11, 0, TAU); g.fill();
    } else {
      g.fillStyle = ['#ff8fc7', '#c9a0ff', '#ff6f91'][i % 3];
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x, fy - h + k * 16, 11, 0, TAU); g.fill(); }
    }
  }
  // lawn
  const gr = g.createLinearGradient(0, fy, 0, H);
  gr.addColorStop(0, '#93df7a'); gr.addColorStop(1, '#5fc65a');
  g.fillStyle = gr; g.fillRect(0, fy, W, H - fy);
  g.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 10; i++) g.fillRect(i * 210, fy, 105, H - fy);
  for (let i = 0; i < 70; i++) {
    const x = (i * 271) % W, y = fy + 30 + ((i * 113) % (H - fy - 40));
    if (i % 2) { g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.256) * 6, y + Math.sin(k * 1.256) * 6, 4.5, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
    else { g.strokeStyle = '#4fb04a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y - 14); g.moveTo(x, y); g.lineTo(x + 5, y - 14); g.stroke(); }
  }
}
