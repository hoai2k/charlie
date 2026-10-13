// Procedural art for Ghost Giggles (the fallback until generated art lands).
import { TAU, clamp } from '../../engine/util.js';
import { RAINBOW } from '../../engine/particles.js';
import { drawSparkleShape } from '../../engine/emotes.js';
import { art } from '../../engine/art.js';
import * as ui from '../../engine/ui.js';

const NAVY = '#24163f';

export const GHOST_COLORS = [
  { id: 'pink', c: '#ff8fd0', d: '#e25aa8' },
  { id: 'sky', c: '#7fd3ff', d: '#3fa7e6' },
  { id: 'mint', c: '#7ff0b8', d: '#3fc888' },
  { id: 'gold', c: '#ffe066', d: '#f0b820' },
  { id: 'lilac', c: '#c4a0ff', d: '#9a6cf0' },
  { id: 'peach', c: '#ffb38a', d: '#ff8a5a' },
  { id: 'rainbow', c: '#ff9fd8', d: '#c97fd0', rainbow: true },
];

export const WINDOWS = [{ x: 330 }, { x: 1260 }, { x: 1620 }].map((w) => ({ ...w, top: 120, bot: 420, w: 240 }));
export const FIRE = { x: 780, y: 470 };
// Measured in the accepted generated room. Keep fallback geometry unchanged.
export function roomWindows() {
  if (!art('bg/ghost-giggles')) return WINDOWS;
  return [
    { x: 389, top: 14, bot: 465, w: 273 },
    { x: 1263, top: 23, bot: 464, w: 276 },
    { x: 1662, top: 12, bot: 465, w: 232 },
  ];
}
export function roomFire() {
  return art('bg/ghost-giggles') ? { x: 833, y: 483 } : FIRE;
}
export const TRUNKS = [{ x: 160, y: 600 }, { x: 1760, y: 600 }];

function bodyFill(g, col, w, h) {
  if (!col) return '#ffffff';
  if (!col.rainbow) return col.c;
  const gr = g.createLinearGradient(0, -h, 0, 0);
  RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
  return gr;
}

/**
 * A little sheet ghost, origin = its centre, `w` wide (height 1.25 w).
 * col: null (white) or a GHOST_COLORS entry. o: { t, giggle, blink, look, arms }
 */
export function drawGhostShape(g, w, col, { t = 0, giggle = false, blink = false, look = 0, shy = false } = {}) {
  const u = w / 100, h = 125 * u;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  g.translate(0, h * 0.1);
  // body outline: dome + sides + wavy hem
  const path = () => {
    g.beginPath();
    g.moveTo(-48 * u, -10 * u);
    g.bezierCurveTo(-52 * u, -92 * u, 52 * u, -92 * u, 48 * u, -10 * u);
    g.lineTo(50 * u, 38 * u);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x0 = 50 * u - (i * 100 * u) / n, x1 = 50 * u - ((i + 1) * 100 * u) / n;
      const wob = Math.sin(t * 8 + i * 1.7) * 5 * u;
      g.quadraticCurveTo((x0 + x1) / 2, 58 * u + wob, x1, 38 * u);
    }
    g.closePath();
  };
  path();
  g.fillStyle = bodyFill(g, col, w, h); g.fill();
  // soft shading
  g.save(); path(); g.clip();
  g.fillStyle = col ? 'rgba(36,22,63,0.12)' : 'rgba(150,130,200,0.18)';
  g.beginPath(); g.ellipse(34 * u, 10 * u, 26 * u, 60 * u, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath(); g.ellipse(-24 * u, -54 * u, 10 * u, 16 * u, 0.5, 0, TAU); g.fill();
  g.restore();
  path(); g.lineWidth = 4 * u; g.strokeStyle = NAVY; g.stroke();
  // arms
  const flap = Math.sin(t * (giggle ? 22 : 5)) * (giggle ? 0.5 : 0.25);
  g.fillStyle = bodyFill(g, col, w, h);
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * 46 * u, 4 * u); g.rotate(s * (0.5 + flap));
    g.beginPath(); g.ellipse(s * 10 * u, 0, 14 * u, 9 * u, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  // face
  const ey = -30 * u, lk = look * 4 * u;
  g.fillStyle = NAVY; g.strokeStyle = NAVY;
  if (giggle) {
    g.lineWidth = 4.5 * u;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 18 * u - 9 * u, ey + 2 * u); g.quadraticCurveTo(s * 18 * u, ey - 10 * u, s * 18 * u + 9 * u, ey + 2 * u); g.stroke(); }
    g.beginPath(); g.moveTo(-14 * u, ey + 14 * u); g.quadraticCurveTo(0, ey + 16 * u, 14 * u, ey + 14 * u); g.quadraticCurveTo(12 * u, ey + 34 * u, 0, ey + 34 * u); g.quadraticCurveTo(-12 * u, ey + 34 * u, -14 * u, ey + 14 * u); g.fill();
    g.fillStyle = '#ff6f91'; g.beginPath(); g.ellipse(0, ey + 28 * u, 7 * u, 4 * u, 0, 0, TAU); g.fill();
  } else {
    for (const s of [-1, 1]) {
      g.beginPath();
      if (blink) g.ellipse(s * 18 * u + lk, ey, 9 * u, 2 * u, 0, 0, TAU); else g.ellipse(s * 18 * u + lk, ey, 9 * u, 13 * u, 0, 0, TAU);
      g.fill();
      if (!blink) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 18 * u + lk - 3 * u, ey - 5 * u, 3.5 * u, 0, TAU); g.fill(); g.fillStyle = NAVY; }
    }
    g.lineWidth = 3.5 * u;
    g.beginPath();
    if (shy) g.arc(lk, ey + 18 * u, 5 * u, 0.1 * Math.PI, 0.9 * Math.PI);
    else g.arc(lk, ey + 14 * u, 8 * u, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,90,150,0.45)';
  g.beginPath(); g.ellipse(-30 * u, ey + 14 * u, 8 * u, 5 * u, 0, 0, TAU); g.ellipse(30 * u, ey + 14 * u, 8 * u, 5 * u, 0, 0, TAU); g.fill();
  g.restore();
}

// Tinted copies of the generated ghost art (white art * colour), cached.
const tintCache = new Map();
export function tintedArt(key, col) {
  const img = art(key);
  if (!img) return null;
  if (!col) return img;
  const ck = key + '|' + col.id;
  let c = tintCache.get(ck);
  if (c && c._src === img) return c;
  c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c._src = img;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'multiply';
  if (col.rainbow) {
    const gr = x.createLinearGradient(0, 0, 0, c.height);
    RAINBOW.forEach((cc, i) => gr.addColorStop(i / (RAINBOW.length - 1), cc));
    x.fillStyle = gr;
  } else x.fillStyle = col.c;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(img, 0, 0);
  tintCache.set(ck, c);
  return c;
}

/** Curtains over one window. open 0 = closed, 1 = fully open. */
export function drawCurtains(g, win, open, t) {
  const half = win.w / 2, hh = win.bot - win.top + 20;
  const pw = half * (1 - 0.72 * clamp(open, 0, 1));
  const img = art('prop/gg-curtain');
  for (const s of [-1, 1]) {
    g.save();
    g.translate(win.x + s * half, win.top - 14);
    g.scale(-s, 1);   // left panel (s=-1) drawn as is, right mirrored
    if (img) g.drawImage(img, 0, 0, pw + 6, hh);
    else {
      g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(pw + 6, 0);
      const sway = Math.sin(t * 1.5 + s) * 4;
      g.quadraticCurveTo(pw + sway, hh * 0.5, pw + 6 + sway * 0.5, hh);
      g.lineTo(0, hh); g.closePath();
      const gr = g.createLinearGradient(0, 0, pw, 0);
      gr.addColorStop(0, '#7a2f78'); gr.addColorStop(1, '#a3479c');
      g.fillStyle = gr; g.fill(); g.stroke();
      g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3;
      for (let i = 1; i < 4; i++) { const fx = (pw * i) / 4; g.beginPath(); g.moveTo(fx, 6); g.quadraticCurveTo(fx + sway * 0.3, hh * 0.5, fx + sway * 0.5, hh - 4); g.stroke(); }
      g.fillStyle = '#ffd23f'; g.fillRect(0, hh - 12, pw + 6 + sway * 0.5, 12); g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(0, hh - 12, pw + 6 + sway * 0.5, 12);
      // tassel
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(pw * 0.55, hh * 0.55, 8, 0, TAU); g.fill(); g.stroke();
    }
    g.restore();
  }
  // rod
  g.fillStyle = '#c99a3a'; g.strokeStyle = NAVY; g.lineWidth = 3;
  ui.roundRect(g, win.x - half - 20, win.top - 22, win.w + 40, 12, 6); g.fill(); g.stroke();
}

export function drawTrunk(g, x, y, bounce, t) {
  g.save(); g.translate(x, y);
  g.scale(1 + bounce * 0.2, 1 - bounce * 0.2);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
  // open lid behind
  g.fillStyle = '#9a5a32'; g.beginPath(); g.moveTo(-90, -96); g.lineTo(90, -96); g.lineTo(80, -170); g.lineTo(-80, -170); g.closePath(); g.fill(); g.stroke();
  // costume bits peeking out
  g.fillStyle = '#7b4fd6'; g.beginPath(); g.moveTo(-60, -96); g.lineTo(-30, -176 - Math.sin(t * 3) * 6); g.lineTo(-6, -96); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.save(); g.translate(-32, -150); drawSparkleShape(g, 16, '#ffe066'); g.restore();
  g.fillStyle = 'rgba(143,214,255,0.85)';
  g.beginPath(); g.ellipse(30, -120, 30, 18, -0.5, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(58, -116, 26, 16, 0.5, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff8fd0'; g.beginPath(); g.moveTo(-6, -96); g.quadraticCurveTo(10, -140, 20, -96); g.fill(); g.stroke();
  // box
  g.fillStyle = '#b8743f'; ui.roundRect(g, -100, -100, 200, 100, 14); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-96, -50); g.lineTo(96, -50); g.stroke();
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 3;
  for (const s of [-1, 1]) { g.fillRect(s * 100 - (s > 0 ? 22 : 0), -100, 22, 22); g.strokeRect(s * 100 - (s > 0 ? 22 : 0), -100, 22, 22); }
  ui.roundRect(g, -14, -66, 28, 30, 6); g.fill(); g.stroke();
  g.restore();
}

export function drawDiscoBall(g, x, y, r, t) {
  g.save(); g.translate(x, y);
  g.strokeStyle = '#d8c8e0'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -r); g.lineTo(0, -y - 10); g.stroke();
  g.rotate(Math.sin(t) * 0.05);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = '#c9c2e8'; g.fill();
  g.save(); g.clip();
  const n = 8;
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    const px = i * r / n * 1.1 + ((t * 30) % (r / n * 1.1)), py = j * r / n * 1.1;
    const k = (i * 7 + j * 13 + Math.floor(t * 8)) % 5;
    g.fillStyle = ['#ffffff', '#f2d8ff', '#bfa8e8', '#ffc4e6', '#9a8cd0'][(k + 5) % 5];
    g.fillRect(px - r / n * 0.5, py - r / n * 0.5, r / n * 0.95, r / n * 0.95);
  }
  g.restore();
  g.lineWidth = 4; g.strokeStyle = NAVY; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.restore();
}

/** Cheerful fire (live, on top of the cached room). */
export function drawFire(g, x, y, t, k = 1) {
  g.save(); g.translate(x, y);
  const gr = g.createRadialGradient(0, -40, 5, 0, -40, 140);
  gr.addColorStop(0, `rgba(255,190,90,${0.45 * k})`); gr.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = gr; g.fillRect(-140, -180, 280, 200);
  const flames = [['#ff7a2e', 1, 0], ['#ffb03f', 0.72, 1.3], ['#ffe066', 0.45, 2.1]];
  for (const [c, s, ph] of flames) {
    g.fillStyle = c;
    for (let i = -1; i <= 1; i++) {
      const hgt = (70 + Math.sin(t * 9 + i * 2 + ph) * 12) * s;
      g.beginPath(); g.moveTo(i * 36 - 30 * s, 0);
      g.quadraticCurveTo(i * 36 - 30 * s, -hgt * 0.6, i * 36 + Math.sin(t * 7 + i) * 6, -hgt);
      g.quadraticCurveTo(i * 36 + 30 * s, -hgt * 0.6, i * 36 + 30 * s, 0); g.closePath(); g.fill();
    }
  }
  // smiling log
  g.fillStyle = '#8a5230'; g.strokeStyle = NAVY; g.lineWidth = 3;
  ui.roundRect(g, -70, -12, 140, 22, 11); g.fill(); g.stroke();
  g.restore();
}

/** Static room (cached by the game). */
export function drawRoom(g, W, H) {
  const WALL = 470;
  // wallpaper stripes
  g.fillStyle = '#6c3f8f'; g.fillRect(0, 0, W, WALL);
  for (let x = 0; x < W; x += 80) { g.fillStyle = '#7c4ba0'; g.fillRect(x, 0, 40, WALL); }
  g.fillStyle = 'rgba(255,240,180,0.35)';
  for (let i = 0; i < 60; i++) { g.save(); g.translate((i * 167) % W, 30 + (i * 59) % 380); drawSparkleShape(g, 10, 'rgba(255,240,200,0.5)'); g.restore(); }
  // wainscot
  g.fillStyle = '#4b2a6a'; g.fillRect(0, WALL - 110, W, 110);
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3;
  for (let x = 20; x < W; x += 160) { ui.roundRect(g, x, WALL - 96, 130, 80, 10); g.stroke(); }
  g.fillStyle = '#c99a3a'; g.fillRect(0, WALL - 116, W, 10);
  // windows
  for (const w of WINDOWS) {
    const x0 = w.x - w.w / 2;
    g.save();
    g.beginPath(); g.moveTo(x0, w.bot); g.lineTo(x0, w.top + w.w / 2); g.arc(w.x, w.top + w.w / 2, w.w / 2, Math.PI, 0); g.lineTo(x0 + w.w, w.bot); g.closePath();
    const sky = g.createLinearGradient(0, w.top, 0, w.bot); sky.addColorStop(0, '#1f1a5c'); sky.addColorStop(1, '#5a3a9a');
    g.fillStyle = sky; g.fill();
    g.save(); g.clip();
    g.fillStyle = '#fff'; for (let i = 0; i < 14; i++) g.fillRect(x0 + ((i * 53) % w.w), w.top + ((i * 37) % (w.bot - w.top - 60)), 3, 3);
    if (w.x === 1260) { g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(w.x + 40, w.top + 90, 44, 0, TAU); g.fill(); }
    g.fillStyle = '#3a2a6a'; g.beginPath(); g.ellipse(w.x, w.bot + 20, w.w * 0.8, 70, 0, 0, TAU); g.fill();
    g.restore();
    g.lineWidth = 12; g.strokeStyle = '#e8d6b0'; g.stroke();
    g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = 8; g.strokeStyle = '#e8d6b0'; g.beginPath(); g.moveTo(w.x, w.top + 20); g.lineTo(w.x, w.bot); g.moveTo(x0, w.top + w.w * 0.75); g.lineTo(x0 + w.w, w.top + w.w * 0.75); g.stroke();
    g.fillStyle = '#e8d6b0'; g.strokeStyle = NAVY; g.lineWidth = 4; ui.roundRect(g, x0 - 16, w.bot - 6, w.w + 32, 20, 6); g.fill(); g.stroke();
    g.restore();
  }
  // portraits
  const portrait = (x, y, kind) => {
    g.save(); g.translate(x, y); g.strokeStyle = NAVY; g.lineWidth = 4;
    g.fillStyle = '#d9a63a'; ui.roundRect(g, -62, -76, 124, 152, 14); g.fill(); g.stroke();
    g.fillStyle = '#ffe7c4'; ui.roundRect(g, -48, -62, 96, 124, 10); g.fill(); g.stroke();
    if (kind === 'cat') {
      g.fillStyle = '#b9a8d8';
      g.beginPath(); g.moveTo(-30, -20); g.lineTo(-26, -48); g.lineTo(-8, -32); g.moveTo(30, -20); g.lineTo(26, -48); g.lineTo(8, -32); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -6, 32, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = NAVY; g.beginPath(); g.arc(-12, -10, 4, 0, TAU); g.arc(12, -10, 4, 0, TAU); g.fill();
      g.beginPath(); g.arc(0, 2, 8, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      g.fillStyle = '#ff8fd0'; g.beginPath(); g.ellipse(0, 44, 30, 14, 0, 0, TAU); g.fill(); g.stroke();
    } else {
      g.fillStyle = '#ff8a1f'; g.beginPath(); g.ellipse(0, 6, 38, 32, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#5a8a2e'; g.fillRect(-4, -34, 8, 12);
      g.fillStyle = '#ffe066'; g.beginPath(); g.arc(-13, 0, 6, 0, TAU); g.arc(13, 0, 6, 0, TAU); g.fill();
      g.beginPath(); g.arc(0, 10, 16, 0.1 * Math.PI, 0.9 * Math.PI); g.fill(); g.stroke();
    }
    g.restore();
  };
  portrait(1000, 215, 'pumpkin'); portrait(1880, 230, 'cat'); portrait(540, 220, 'cat');
  // cute cobweb with a smiling spider
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { const a = i * Math.PI / 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 150, Math.sin(a) * 150); g.stroke(); }
  for (let r = 40; r <= 140; r += 33) { g.beginPath(); for (let i = 0; i <= 4; i++) { const a = i * Math.PI / 8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(96, 50); g.lineTo(96, 120); g.stroke();
  g.fillStyle = '#5a3a8a'; g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(96, 132, 14, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(91, 129, 4, 0, TAU); g.arc(101, 129, 4, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(91, 130, 2, 0, TAU); g.arc(101, 130, 2, 0, TAU); g.fill();
  g.beginPath(); g.arc(96, 135, 5, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.restore();
  // fireplace
  g.save(); g.translate(FIRE.x, FIRE.y); g.strokeStyle = NAVY; g.lineWidth = 4; g.lineJoin = 'round';
  g.fillStyle = '#9a8aa8'; ui.roundRect(g, -190, -300, 380, 300, 12); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 3;
  for (let y = -270; y < 0; y += 34) for (let x = -180 + ((y / 34) % 2 ? 20 : 0); x < 180; x += 60) { g.strokeRect(x, y, 56, 30); }
  g.strokeStyle = NAVY; g.lineWidth = 4;
  g.fillStyle = '#2a1a2e'; g.beginPath(); g.moveTo(-120, 0); g.lineTo(-120, -150); g.arc(0, -150, 120, Math.PI, 0); g.lineTo(120, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c47a4a'; ui.roundRect(g, -220, -320, 440, 30, 10); g.fill(); g.stroke();
  // mantel: candles and little smiling pumpkins
  for (const cx of [-160, 160]) {
    g.fillStyle = '#ff8a1f'; g.beginPath(); g.ellipse(cx, -340, 26, 20, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffe066'; g.beginPath(); g.arc(cx - 9, -344, 4, 0, TAU); g.arc(cx + 9, -344, 4, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx, -338, 9, 0.1 * Math.PI, 0.9 * Math.PI); g.fill();
  }
  for (const cx of [-60, 60]) { g.fillStyle = '#fff4dc'; g.fillRect(cx - 8, -380, 16, 60); g.strokeRect(cx - 8, -380, 16, 60); g.fillStyle = '#ffb03f'; g.beginPath(); g.ellipse(cx, -392, 7, 12, 0, 0, TAU); g.fill(); }
  g.restore();
  // floor
  const fl = g.createLinearGradient(0, WALL, 0, H);
  fl.addColorStop(0, '#b5794a'); fl.addColorStop(1, '#d69a62');
  g.fillStyle = fl; g.fillRect(0, WALL, W, H - WALL);
  g.strokeStyle = 'rgba(90,50,30,0.3)'; g.lineWidth = 3;
  for (let y = WALL + 30, i = 0; y < H; y += 30 + i * 4, i++) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (i * 137) % 300; x < W; x += 300) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 30 + i * 4); g.stroke(); } }
  g.fillStyle = '#4b2a6a'; g.fillRect(0, WALL - 6, W, 12);
  // big round rug
  g.save(); g.translate(W / 2, 760);
  g.fillStyle = '#ff9fcf'; g.beginPath(); g.ellipse(0, 0, 640, 190, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#ffd1e8'; g.beginPath(); g.ellipse(0, 0, 560, 160, 0, 0, TAU); g.fill();
  g.fillStyle = '#c4a0ff'; g.beginPath(); g.ellipse(0, 0, 440, 122, 0, 0, TAU); g.fill();
  g.fillStyle = '#ffe9a8'; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.save(); g.translate(Math.cos(a) * 500, Math.sin(a) * 142); drawSparkleShape(g, 26, '#fff6c8'); g.restore(); }
  g.restore();
}
