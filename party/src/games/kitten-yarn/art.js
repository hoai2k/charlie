// Kitten Cuddles - procedural art kit (every piece first tries generated art).
//   prop/kitten-atlas (6 coats x 5 states), prop/kitten-fairy, prop/yarn-ball-<c>,
//   prop/kitten-basket + prop/kitten-basket-front, prop/kitten-cattree, prop/kitten-bed
import { W } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { drawHeartShape, drawSparkleShape } from '../../engine/emotes.js';
import { TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
export const GROUND_Y = 900;
export const TREE_H = 760, TREE_W = 340;
// platform tops (fraction of tree height from the bottom) and how far right of the trunk the lip is
export const PLATFORMS = [[0.34, 120], [0.63, 135], [0.92, 110]];
export const BED = { x: 960, y: 885, w: 560, h: 220 };

// coats: ginger, grey, white, tuxedo, calico, cream
export const COATS = [
  { body: '#ffb35c', dark: '#e57a2c', belly: '#fff1dc', ear: '#ff9ab8' },
  { body: '#c3c8dc', dark: '#8d93b1', belly: '#f3f4fb', ear: '#ffaac4' },
  { body: '#fffaf6', dark: '#e9dfe8', belly: '#ffffff', ear: '#ffb3cc' },
  { body: '#3d3756', dark: '#2a2540', belly: '#ffffff', ear: '#ff9ab8', tux: true },
  { body: '#fff7ef', dark: '#f08a3c', belly: '#ffffff', ear: '#ffa6c0', calico: true },
  { body: '#ffe4bd', dark: '#f0bd7f', belly: '#fff8ea', ear: '#ffaac4' },
];
const STATE_ROW = { sit: 0, tumble: 1, pounce: 2, sleep: 3, cuddle: 4 };
export const YARN = [
  { key: 'prop/yarn-ball-pink', c: '#ff7ac6', d: '#e0459f' },
  { key: 'prop/yarn-ball-blue', c: '#6cc4ff', d: '#3290d8' },
  { key: 'prop/yarn-ball-yellow', c: '#ffd84a', d: '#e8aa18' },
];

/** A kitten centred at the origin, about 100 px tall at s = 1. */
export function drawKitten(g, k, state, t, s = 1) {
  if (k.fairy) return drawFairyKitten(g, t, s);
  const atlas = art('prop/kitten-atlas');
  if (atlas) {
    const cw = atlas.width / 6, ch = atlas.height / 5;
    // Each 192px atlas cell contains ~110px of kitten artwork.
    const sz = 192 * s;
    g.drawImage(atlas, k.coat * cw, (STATE_ROW[state] ?? 0) * ch, cw, ch, -sz / 2, -sz / 2, sz, sz);
    return;
  }
  const c = COATS[k.coat];
  g.save(); g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 3.5; g.strokeStyle = NAVY;
  if (state === 'tumble') {
    g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fillStyle = c.body; g.fill(); g.stroke();
    patches(g, c, 0);
    ears(g, c, -14, -26, 0.9, -0.5); ears(g, c, 14, -26, 0.9, 0.5);
    g.beginPath(); g.moveTo(26, 16); g.quadraticCurveTo(46, 30, 34, 42); g.lineWidth = 9; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 5.5; g.strokeStyle = c.body; g.stroke();
    happyEyes(g, -10, -6, 6); happyEyes(g, 10, -6, 6); nose(g, 0, 2);
  } else if (state === 'pounce') {
    // stretched leap, facing right
    tail(g, c, -46, -2, -70, -26, t);
    g.beginPath(); g.ellipse(-4, 0, 42, 20, -0.15, 0, TAU); g.fillStyle = c.body; g.fill(); g.stroke();
    patches(g, c, 1);
    for (const [x, y] of [[24, 12], [34, 2], [-34, 14], [-24, 18]]) { g.beginPath(); g.ellipse(x + 10, y, 11, 7, 0.3, 0, TAU); g.fillStyle = c.belly; g.fill(); g.stroke(); }
    head(g, c, 40, -14, 0.82, 'wide', t);
  } else if (state === 'sleep') {
    tail(g, c, 30, 14, -10, 26, 0, true);
    g.beginPath(); g.ellipse(0, 8, 44, 26, 0, 0, TAU); g.fillStyle = c.body; g.fill(); g.stroke();
    patches(g, c, 2);
    head(g, c, -18, -2, 0.8, 'sleep', t);
  } else {
    // sit / cuddle: front view
    tail(g, c, 22, 30, 52, -6 + Math.sin(t * 6) * 8, t);
    g.beginPath(); g.ellipse(0, 22, 28, 26, 0, 0, TAU); g.fillStyle = c.body; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, 26, 15, 17, 0, 0, TAU); g.fillStyle = c.belly; g.fill();
    for (const x of [-12, 12]) { g.beginPath(); g.ellipse(x, 46, 10, 7, 0, 0, TAU); g.fillStyle = c.belly; g.fill(); g.stroke(); }
    if (state === 'cuddle') for (const x of [-20, 20]) { g.beginPath(); g.ellipse(x, -8, 8, 11, x > 0 ? -0.5 : 0.5, 0, TAU); g.fillStyle = c.belly; g.fill(); g.stroke(); }
    head(g, c, 0, -14, 1, state === 'cuddle' ? 'happy' : 'open', t);
  }
  g.restore();
}

function patches(g, c, seed) {
  if (!c.calico && !c.tux) {
    // tabby stripes
    g.save(); g.clip(); g.strokeStyle = c.dark; g.lineWidth = 4;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 14 - 4, -40); g.quadraticCurveTo(i * 14 + 6, -24, i * 14 - 2, -14); g.stroke(); }
    g.restore();
    return;
  }
  g.save(); g.clip();
  if (c.calico) {
    g.fillStyle = '#f08a3c'; g.beginPath(); g.arc(-18 + seed * 4, -10, 16, 0, TAU); g.fill();
    g.fillStyle = '#3d3756'; g.beginPath(); g.arc(18, 6 - seed * 3, 13, 0, TAU); g.fill();
  } else { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 14, 16, 22, 0, 0, TAU); g.fill(); }
  g.restore();
}

function ears(g, c, x, y, s, tilt) {
  g.save(); g.translate(x, y); g.rotate(tilt); g.scale(s, s);
  g.beginPath(); g.moveTo(-11, 6); g.lineTo(0, -16); g.lineTo(11, 6); g.closePath();
  g.fillStyle = c.calico && x < 0 ? '#f08a3c' : c.body; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-5, 3); g.lineTo(0, -8); g.lineTo(5, 3); g.closePath(); g.fillStyle = c.ear; g.fill();
  g.restore();
}

function tail(g, c, x0, y0, x1, y1, t, flat = false) {
  g.beginPath(); g.moveTo(x0, y0);
  g.quadraticCurveTo((x0 + x1) / 2 + (flat ? 0 : 18), (y0 + y1) / 2 + 14, x1, y1);
  g.lineWidth = 13; g.strokeStyle = NAVY; g.stroke();
  g.lineWidth = 7.5; g.strokeStyle = c.body; g.stroke();
  g.lineWidth = 3.5; g.strokeStyle = NAVY;
}

function head(g, c, x, y, s, eyes, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  ears(g, c, -17, -22, 1, -0.25); ears(g, c, 17, -22, 1, 0.25);
  g.beginPath(); g.ellipse(0, 0, 30, 26, 0, 0, TAU); g.fillStyle = c.body; g.fill(); g.stroke();
  if (c.tux) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 12, 14, 11, 0, 0, TAU); g.fill(); }
  else if (c.calico) { g.save(); g.beginPath(); g.ellipse(0, 0, 28.5, 24.5, 0, 0, TAU); g.clip(); g.fillStyle = '#f08a3c'; g.beginPath(); g.arc(-22, -14, 16, 0, TAU); g.fill(); g.fillStyle = '#3d3756'; g.beginPath(); g.arc(24, -16, 12, 0, TAU); g.fill(); g.restore(); }
  else { g.strokeStyle = c.dark; g.lineWidth = 3.5; for (const dx of [-7, 0, 7]) { g.beginPath(); g.moveTo(dx, -25); g.lineTo(dx * 0.7, -16); g.stroke(); } g.strokeStyle = NAVY; }
  // cheeks
  g.fillStyle = 'rgba(255,120,170,0.45)'; g.beginPath(); g.ellipse(-17, 8, 6, 4, 0, 0, TAU); g.ellipse(17, 8, 6, 4, 0, 0, TAU); g.fill();
  if (eyes === 'sleep' || eyes === 'happy') { happyEyes(g, -11, -2, 6, eyes === 'sleep'); happyEyes(g, 11, -2, 6, eyes === 'sleep'); }
  else {
    const big = eyes === 'wide' ? 9 : 8;
    const blink = Math.sin(t * 1.7 + x) > 0.985 ? 0.15 : 1;
    for (const ex of [-11, 11]) {
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(ex, -2, big * 0.85, big * blink, 0, 0, TAU); g.fill();
      if (blink > 0.5) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - 2.5, -5, 3, 0, TAU); g.arc(ex + 2, 1, 1.5, 0, TAU); g.fill(); }
    }
  }
  nose(g, 0, 8);
  // mouth + whiskers
  g.lineWidth = 2.5; g.beginPath(); g.arc(-4, 11, 4, 0, Math.PI); g.arc(4, 11, 4, 0, Math.PI); g.stroke();
  g.lineWidth = 2; g.beginPath();
  for (const sd of [-1, 1]) { g.moveTo(sd * 20, 6); g.lineTo(sd * 36, 3); g.moveTo(sd * 20, 10); g.lineTo(sd * 35, 12); }
  g.stroke(); g.lineWidth = 3.5;
  g.restore();
}

function happyEyes(g, x, y, r, sleep = false) {
  g.lineWidth = 3; g.strokeStyle = NAVY;
  g.beginPath();
  if (sleep) g.arc(x, y - 2, r, 0.15 * Math.PI, 0.85 * Math.PI);
  else g.arc(x, y + 3, r, 1.15 * Math.PI, 1.85 * Math.PI);
  g.stroke(); g.lineWidth = 3.5;
}
function nose(g, x, y) { g.fillStyle = '#ff7aa8'; g.beginPath(); g.moveTo(x - 4, y - 2); g.lineTo(x + 4, y - 2); g.lineTo(x, y + 2); g.closePath(); g.fill(); }

export function drawFairyKitten(g, t, s = 1) {
  const flap = Math.sin(t * 16);
  if (drawArt(g, 'prop/kitten-fairy', 0, 0, 130 * s, 130 * s * (1 - flap * 0.04))) return;
  g.save(); g.scale(s, s);
  // glow
  const gr = g.createRadialGradient(0, 0, 10, 0, 0, 80);
  gr.addColorStop(0, 'rgba(255,240,255,0.8)'); gr.addColorStop(1, 'rgba(255,200,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 80, 0, TAU); g.fill();
  // wings
  g.lineWidth = 3; g.strokeStyle = NAVY;
  for (const sd of [-1, 1]) {
    g.save(); g.translate(sd * 14, -4); g.scale(sd * (0.75 + flap * 0.25), 1);
    g.beginPath(); g.ellipse(28, -22, 30, 20, -0.5, 0, TAU); g.fillStyle = 'rgba(214,170,255,0.85)'; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(22, 12, 20, 13, 0.5, 0, TAU); g.fillStyle = 'rgba(255,170,220,0.85)'; g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(30, -24, 4, 0, TAU); g.arc(22, 12, 3, 0, TAU); g.fill();
    g.restore();
  }
  g.restore();
  drawKitten(g, { coat: 2, fairy: false }, 'sit', t, s);
  // flower crown
  g.save(); g.scale(s, s);
  for (let i = -2; i <= 2; i++) { g.fillStyle = ['#ff7ac6', '#ffd23f', '#8be8b8', '#ffd23f', '#ff7ac6'][i + 2]; g.beginPath(); g.arc(i * 9, -44 + Math.abs(i) * 2, 5.5, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
  g.translate(30, -50); drawSparkleShape(g, 14 + flap * 3, '#fff6a8');
  g.restore();
}

/** Yarn ball centred at origin, radius ~38 at s=1. rot spins the strands. */
export function drawYarn(g, ci, rot, s = 1) {
  const y = YARN[ci % YARN.length];
  g.save(); g.scale(s, s); g.rotate(rot);
  if (!drawArt(g, y.key, 0, 0, 76, 76)) {
    g.lineWidth = 3.5; g.strokeStyle = NAVY;
    g.beginPath(); g.arc(0, 0, 36, 0, TAU); g.fillStyle = y.c; g.fill(); g.stroke();
    g.save(); g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.clip();
    g.strokeStyle = y.d; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(0, 0, 36, 12 + i * 5, i * 0.7, 0, TAU); g.stroke(); }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-12, -14, 9, 5, -0.6, 0, TAU); g.fill();
  }
  g.restore();
}

/** Basket back layer (bottom-centre anchor). */
export function drawBasketBack(g, x, y, w) {
  const h = w * 0.6;
  if (drawArt(g, 'prop/kitten-basket', x, y, w, h, { anchor: 'bottom' })) return;
  g.save(); g.translate(x, y);
  g.lineWidth = 4; g.strokeStyle = NAVY;
  g.beginPath(); g.ellipse(0, -h * 0.62, w * 0.48, h * 0.2, 0, Math.PI, TAU); g.fillStyle = '#c98a4b'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, -h * 0.6, w * 0.42, h * 0.14, 0, 0, TAU); g.fillStyle = '#ffc2dc'; g.fill();
  g.restore();
}
/** Basket front layer: drawn over the kittens inside. */
export function drawBasketFront(g, x, y, w, t) {
  const h = w * 0.6;
  if (drawArt(g, 'prop/kitten-basket-front', x, y, w, h, { anchor: 'bottom' })) return;
  g.save(); g.translate(x, y);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-w * 0.48, -h * 0.62); g.lineTo(-w * 0.38, -6); g.quadraticCurveTo(0, 6, w * 0.38, -6); g.lineTo(w * 0.48, -h * 0.62);
  g.ellipse(0, -h * 0.62, w * 0.48, h * 0.2, 0, 0, Math.PI);
  g.closePath();
  g.fillStyle = '#e0a462'; g.fill(); g.stroke();
  // weave
  g.save(); g.clip(); g.strokeStyle = '#b87436'; g.lineWidth = 3;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.ellipse(0, -h * 0.62 + i * h * 0.15, w * 0.46, h * 0.2, 0, 0.1, Math.PI - 0.1); g.stroke(); }
  for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * w * 0.1, -h * 0.45); g.lineTo(i * w * 0.08, 0); g.stroke(); }
  g.restore();
  // rim + bow
  g.beginPath(); g.ellipse(0, -h * 0.62, w * 0.48, h * 0.2, 0, 0, Math.PI); g.lineWidth = 9; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#f0bd7f'; g.stroke();
  g.translate(0, -h * 0.38); g.rotate(Math.sin(t * 5) * 0.08);
  g.lineWidth = 3; g.strokeStyle = NAVY; g.fillStyle = '#ff4d6d';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-16, -9); g.lineTo(-16, 9); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(16, -9); g.lineTo(16, 9); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** Cat tree: bottom-centre at (x, y). mirror = -1 for the right-hand tree. */
export function drawCatTree(g, x, y, mirror, t) {
  g.save(); g.translate(x, y); g.scale(mirror, 1);
  if (!drawArt(g, 'prop/kitten-cattree', 0, 0, TREE_W, TREE_H, { anchor: 'bottom' })) {
    g.lineWidth = 5; g.strokeStyle = NAVY; g.lineJoin = 'round';
    // base
    ui.roundRect(g, -120, -36, 280, 36, 14); g.fillStyle = '#b79bea'; g.fill(); g.stroke();
    // posts
    const post = (px, y0, y1) => {
      g.fillStyle = '#e8c48e'; g.fillRect(px - 18, y1, 36, y0 - y1); g.strokeRect(px - 18, y1, 36, y0 - y1);
      g.strokeStyle = '#c99a5c'; g.lineWidth = 3;
      for (let yy = y1 + 8; yy < y0; yy += 12) { g.beginPath(); g.moveTo(px - 16, yy); g.lineTo(px + 16, yy + 5); g.stroke(); }
      g.strokeStyle = NAVY; g.lineWidth = 5;
    };
    post(-20, -36, -TREE_H * 0.63);
    post(60, -TREE_H * 0.34, -TREE_H * 0.92);
    // cubby on the middle level
    ui.roundRect(g, -90, -TREE_H * 0.63 - 110, 140, 110, 30); g.fillStyle = '#ffb3d9'; g.fill(); g.stroke();
    g.beginPath(); g.arc(-20, -TREE_H * 0.63 - 45, 32, 0, TAU); g.fillStyle = '#5b3f7a'; g.fill(); g.stroke();
    // platforms
    for (const [f, lip] of PLATFORMS) {
      const py = -TREE_H * f;
      g.beginPath(); g.ellipse(lip - 70, py + 8, 90, 22, 0, 0, TAU); g.fillStyle = '#8f6fd6'; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(lip - 70, py, 90, 22, 0, 0, TAU); g.fillStyle = '#c7b0ff'; g.fill(); g.stroke();
    }
    // pom-pom toy
    const sw = Math.sin(t * 2.2) * 0.25;
    g.save(); g.translate(PLATFORMS[1][1] - 10, -TREE_H * 0.63 + 16); g.rotate(sw);
    g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 90); g.stroke();
    g.beginPath(); g.arc(0, 100, 15, 0, TAU); g.fillStyle = '#ff7ac6'; g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
}

/** Perch point (where a kitten sits before leaping) for tree side (0 left, 1 right) and level. */
export function perchPoint(side, level) {
  const [fallbackHeight, lip] = PLATFORMS[level];
  const f = art('prop/kitten-cattree') ? [0.315, 0.705, 0.96][level] : fallbackHeight;
  const x = side === 0 ? 150 + lip - 40 : W - 150 - lip + 40;
  return { x, y: GROUND_Y + 10 - TREE_H * f };
}

export function drawBed(g, t) {
  const { x, y, w, h } = BED;
  if (drawArt(g, 'prop/kitten-bed', x, y, w, h, { anchor: 'bottom' })) return;
  g.save(); g.translate(x, y);
  g.lineWidth = 5; g.strokeStyle = NAVY;
  g.beginPath(); g.ellipse(0, -h * 0.4, w * 0.48, h * 0.38, 0, 0, TAU); g.fillStyle = '#b79bea'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, -h * 0.5, w * 0.38, h * 0.22, 0, 0, TAU); g.fillStyle = '#9ff0cf'; g.fill(); g.stroke();
  // front rim
  g.beginPath(); g.ellipse(0, -h * 0.3, w * 0.48, h * 0.3, 0, 0.05, Math.PI - 0.05); g.lineWidth = 34; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 26; g.strokeStyle = '#cdb6ff'; g.stroke();
  for (let i = 0; i < 6; i++) { const a = 0.35 + i * 0.48; g.save(); g.translate(Math.cos(a) * w * 0.48, -h * 0.3 + Math.sin(a) * h * 0.3); drawSparkleShape(g, 12, '#fff6a8'); g.restore(); }
  g.restore();
}

/** Procedural cosy living room. */
export function drawRoom(g, t) {
  const bg = art('bg/kitten-yarn');
  if (bg) { g.drawImage(bg, 0, 0, 1920, 1080); return; }
  // wallpaper stripes
  g.fillStyle = '#ffe7d6'; g.fillRect(0, 0, 1920, 860);
  g.fillStyle = '#ffd9c4'; for (let x = 0; x < 1920; x += 120) g.fillRect(x, 0, 60, 860);
  // tiny hearts on the stripes
  g.globalAlpha = 0.35;
  for (let i = 0; i < 40; i++) { g.save(); g.translate((i * 137) % 1920, 150 + ((i * 263) % 600)); drawHeartShape(g, 18, '#ff9ab8'); g.restore(); }
  g.globalAlpha = 1;
  // window with sky and sun
  g.save(); g.translate(960, 330);
  g.lineWidth = 10; g.strokeStyle = NAVY;
  ui.roundRect(g, -300, -200, 600, 360, 40);
  const sky = g.createLinearGradient(0, -200, 0, 160); sky.addColorStop(0, '#8fd6ff'); sky.addColorStop(1, '#d9f2ff');
  g.fillStyle = sky; g.fill();
  g.save(); g.clip();
  g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(180, -110, 46, 0, TAU); g.fill();
  ui.cloud(g, -150 + Math.sin(t * 0.2) * 30, -90, 0.7, '#fff', 0.95);
  ui.cloud(g, 80 + Math.sin(t * 0.17 + 2) * 30, 30, 0.55, '#fff', 0.9);
  g.fillStyle = '#9be37a'; g.beginPath(); g.ellipse(0, 190, 420, 100, 0, 0, TAU); g.fill();
  g.restore();
  ui.roundRect(g, -300, -200, 600, 360, 40); g.stroke();
  g.fillStyle = '#fff6ee'; g.fillRect(-6, -200, 12, 360); g.fillRect(-300, -26, 600, 12);
  g.lineWidth = 4; g.strokeRect(-6, -200, 12, 360);
  // curtains
  for (const sd of [-1, 1]) {
    g.save(); g.scale(sd, 1);
    g.beginPath(); g.moveTo(290, -230); g.quadraticCurveTo(380 + Math.sin(t * 0.8) * 6, 0, 330, 190); g.lineTo(390, 190); g.lineTo(400, -230); g.closePath();
    g.fillStyle = '#ff9ccf'; g.fill(); g.lineWidth = 5; g.stroke();
    g.restore();
  }
  ui.roundRect(g, -340, 156, 680, 26, 12); g.fillStyle = '#f5d0a8'; g.fill(); g.lineWidth = 5; g.stroke();
  g.restore();
  // sunbeam
  g.save(); g.globalAlpha = 0.16; g.fillStyle = '#fff6b0';
  g.beginPath(); g.moveTo(700, 480); g.lineTo(1220, 480); g.lineTo(1500, 900); g.lineTo(560, 900); g.closePath(); g.fill();
  g.restore();
  // bunting
  g.lineWidth = 3; g.strokeStyle = NAVY;
  for (let seg = 0; seg < 2; seg++) {
    const x0 = seg ? 1000 : 60, x1 = seg ? 1860 : 920;
    g.beginPath(); g.moveTo(x0, 70); g.quadraticCurveTo((x0 + x1) / 2, 140, x1, 70); g.stroke();
    for (let i = 1; i < 9; i++) {
      const k = i / 9, bx = x0 + (x1 - x0) * k, by = 70 + 4 * k * (1 - k) * 70 * 0.5 * 2;
      g.beginPath(); g.moveTo(bx - 20, by); g.lineTo(bx + 20, by); g.lineTo(bx, by + 40); g.closePath();
      g.fillStyle = ['#ff7ac6', '#ffd23f', '#6cc4ff', '#8be8b8'][(i + seg) % 4]; g.fill(); g.stroke();
    }
  }
  // paw pictures
  for (const [px, py] of [[470, 300], [1450, 300]]) {
    ui.roundRect(g, px - 60, py - 70, 120, 140, 14); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#d99a5a'; g.stroke();
    g.fillStyle = '#ff9ab8'; g.beginPath(); g.ellipse(px, py + 14, 22, 18, 0, 0, TAU); g.fill();
    for (const [dx, dy] of [[-22, -12], [-8, -26], [8, -26], [22, -12]]) { g.beginPath(); g.arc(px + dx, py + dy, 8, 0, TAU); g.fill(); }
  }
  // skirting + floor
  g.fillStyle = '#fff6ee'; g.fillRect(0, 830, 1920, 30); g.fillStyle = NAVY; g.fillRect(0, 858, 1920, 4);
  const fl = g.createLinearGradient(0, 860, 0, 1080); fl.addColorStop(0, '#e9b57c'); fl.addColorStop(1, '#d99a5a');
  g.fillStyle = fl; g.fillRect(0, 862, 1920, 218);
  g.strokeStyle = 'rgba(140,80,30,0.25)'; g.lineWidth = 3;
  for (let y = 900; y < 1080; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(1920, y); g.stroke(); }
  // rug
  g.save(); g.translate(960, 960);
  g.beginPath(); g.ellipse(0, 0, 760, 95, 0, 0, TAU); g.fillStyle = '#ff9ccf'; g.fill();
  g.beginPath(); g.ellipse(0, 0, 690, 75, 0, 0, TAU); g.fillStyle = '#ffc2dc'; g.fill();
  g.setLineDash([16, 12]); g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 620, 60, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  g.restore();
}
