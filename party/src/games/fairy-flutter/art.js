// Fairy Flutter: procedural art (every piece tries its generated art first).
//   bg/fairy-flutter  prop/ff-moon  prop/ff-moon-happy  prop/ff-jar
//   prop/ff-sparkle  prop/ff-dewdrop  prop/ff-petal  prop/ff-star
//   prop/ff-bee  prop/ff-bee-giggle   (garden fairies: NPC sprite sets)
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { drawNpcSprite } from '../../engine/npc-art.js';
import { starPath } from '../../engine/emotes.js';
import { TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
export const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const RAINBOW_BANDS = ['#ff5d8f', '#ff9f43', '#ffd93b', '#5fe08a', '#4fb8ff', '#a77bff'];

// --- glow sprites (additive halos) -------------------------------------------
const glowCache = new Map();
function glowSprite(color) {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color + '88'); gr.addColorStop(1, color + '00');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
  }
  return c;
}
export function glow(g, x, y, r, color, alpha = 1) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= alpha;
  g.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); g.restore();
}

// --- background --------------------------------------------------------------
let bgCache = null;
function buildBg() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#5b3fa8'); gr.addColorStop(0.35, '#b07fe0'); gr.addColorStop(0.65, '#ffb3d1'); gr.addColorStop(1, '#ffd9b0');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // faint stars
  g.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) { g.globalAlpha = 0.25 + hh(i) * 0.6; g.beginPath(); g.arc(hh(i + 1) * W, hh(i + 2) * H * 0.45, 1 + hh(i + 3) * 2.4, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  // far hills
  g.fillStyle = '#e59acb';
  g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, 860 + Math.sin(x * 0.004) * 50 + Math.sin(x * 0.011) * 20); g.lineTo(W, H); g.fill();
  g.fillStyle = '#c97fc4';
  g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, 930 + Math.sin(x * 0.006 + 2) * 40); g.lineTo(W, H); g.fill();
  // giant glowing flowers along the bottom
  const cols = [['#ff7ac6', '#ffd1ec'], ['#ffd23f', '#fff3b0'], ['#6fd0ff', '#d6f3ff'], ['#b98bff', '#eadcff'], ['#ff9f7a', '#ffe0d0']];
  for (let i = 0; i < 9; i++) {
    const x = 80 + i * 225 + (hh(i + 20) - 0.5) * 80, top = 760 + hh(i + 30) * 120, r = 60 + hh(i + 40) * 40;
    g.strokeStyle = '#4c9e6a'; g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + 30, (H + top) / 2, x, top); g.stroke();
    g.fillStyle = '#5fbf7f';
    g.beginPath(); g.ellipse(x + 34, top + 140, 46, 18, -0.5, 0, TAU); g.fill();
    const [c1, c2] = cols[i % cols.length];
    glow(g, x, top, r * 2.2, c1, 0.5);
    flowerHead(g, x, top, r, c1, c2);
  }
  return c;
}
export function flowerHead(g, x, y, r, c1, c2, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineJoin = 'round'; g.lineWidth = Math.max(2, r * 0.06); g.strokeStyle = NAVY;
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate((i / 8) * TAU);
    g.fillStyle = i % 2 ? c1 : c2;
    g.beginPath(); g.ellipse(r * 0.62, 0, r * 0.52, r * 0.3, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(0, 0, r * 0.33, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffb347'; g.beginPath(); g.arc(-r * 0.08, -r * 0.08, r * 0.14, 0, TAU); g.fill();
  g.restore();
}
export function drawBackground(g, t) {
  const img = art('bg/fairy-flutter');
  if (img) g.drawImage(img, 0, 0, W, H);
  else { if (!bgCache) bgCache = buildBg(); g.drawImage(bgCache, 0, 0); }
}

/** Puffy cloud (drifting, drawn by the game). */
export function puff(g, x, y, s, alpha = 0.75) {
  g.save(); g.globalAlpha *= alpha; g.fillStyle = '#fff3fb';
  for (const [dx, dy, r] of [[-60, 10, 42], [-20, -12, 56], [32, -4, 50], [72, 12, 36], [0, 22, 46]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); }
  g.restore();
}

// --- moon and jar ------------------------------------------------------------
export function drawMoon(g, x, y, size, t, happy) {
  glow(g, x, y, size * 1.1, '#fff3c0', 0.75 + Math.sin(t * 2) * 0.1);
  if (drawArt(g, happy ? 'prop/ff-moon-happy' : 'prop/ff-moon', x, y, size, size) || (happy && drawArt(g, 'prop/ff-moon', x, y, size, size))) return;
  const r = size * 0.42;
  g.save(); g.translate(x, y); g.rotate(-0.25);
  g.fillStyle = '#fff1a8'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.arc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65); g.arc(r * 0.55, 0, r * 0.82, Math.PI * 1.45, Math.PI * 0.55, true); g.closePath(); g.fill(); g.stroke();
  g.restore();
  // face on the crescent (left-middle)
  const fx = x - r * 0.55, fy = y + r * 0.05;
  g.strokeStyle = NAVY; g.lineWidth = 4; g.lineCap = 'round';
  if (happy) {
    g.beginPath(); g.arc(fx - 4, fy - 14, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(fx, fy + 8, 11, 0, Math.PI); g.closePath(); g.fill();
    g.fillStyle = '#ff7a9a'; g.beginPath(); g.arc(fx, fy + 13, 5, 0, Math.PI); g.fill();
  } else {
    const blink = (t % 3.4) < 0.12;
    if (blink) { g.beginPath(); g.moveTo(fx - 10, fy - 14); g.lineTo(fx + 2, fy - 14); g.stroke(); }
    else { g.fillStyle = NAVY; g.beginPath(); g.arc(fx - 4, fy - 14, 5, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(fx - 2, fy + 4, 10, 0.2, Math.PI - 0.4); g.stroke();
  }
  g.fillStyle = 'rgba(255,120,160,0.5)'; g.beginPath(); g.arc(fx + 12, fy + 2, 7, 0, TAU); g.fill();
}

// The delivered prop/ff-jar (320x400) has a see-through glass body, so the fill
// behind it must stay inside the glass. Its outer silhouette from the neck rim
// (row 148) down to the base, traced from the alpha and inset 7 px so the
// fill's edge tucks under the ~11 px painted outline. Pixels from the centre.
const JAR_ART = { w: 320, h: 400, top: -52, bottom: 158 };
const JAR_GLASS = [
  -98, -52, -105, -44, -113, -32, -119, -20, -124, -8, -127, 4, -129, 16, -130, 28, -131, 40, -130, 52,
  -128, 64, -126, 76, -122, 88, -117, 100, -111, 112, -103, 124, -94, 136, -87, 148, -72, 160, -61, 164,
  60, 164, 70, 160, 85, 148, 93, 136, 102, 124, 110, 112, 116, 100, 121, 88, 125, 76, 127, 64,
  129, 52, 129, 40, 129, 28, 128, 16, 126, 4, 123, -8, 118, -20, 112, -32, 104, -44, 97, -52,
];

/** Jar centred at (x, y), size w x h; fill 0..1 drawn behind the glass. */
export function drawJar(g, x, y, w, h, fill, t, wob = 0) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 18) * wob * 0.12); g.scale(1 + wob * 0.1, 1 - wob * 0.08);
  let bx = -w * 0.42, by = -h * 0.32, bw = w * 0.84, bh = h * 0.78;
  // glowing fill (behind the glass)
  g.save();
  const img = art('prop/ff-jar');
  if (img) {
    // same contain fit drawArt uses, in the art's 320x400 pixel space
    const k = Math.min(w / img.width, h / img.height) * (img.width / JAR_ART.w);
    g.beginPath();
    for (let i = 0; i < JAR_GLASS.length; i += 2) g.lineTo(JAR_GLASS[i] * k, JAR_GLASS[i + 1] * k);
    g.closePath(); g.clip();
    bx = -131 * k; bw = 262 * k; by = JAR_ART.top * k; bh = (JAR_ART.bottom - JAR_ART.top) * k;
  } else { roundRectPath(g, bx, by, bw, bh, w * 0.22); g.clip(); }
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(bx, by, bw, bh);
  const fh = bh * Math.min(1, fill), fy = by + bh - fh;
  if (fh > 0) {
    const gr = g.createLinearGradient(0, fy, 0, by + bh);
    gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#ff9fd8');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(bx, fy);
    for (let i = 0; i <= 12; i++) g.lineTo(bx + (bw * i) / 12, fy + Math.sin(t * 5 + i) * 4);
    g.lineTo(bx + bw, by + bh); g.lineTo(bx, by + bh); g.closePath(); g.fill();
    // twinkles in the fill
    for (let i = 0; i < 14; i++) {
      const sx = bx + hh(i) * bw, sy = fy + 10 + hh(i + 5) * Math.max(0, fh - 14);
      if (sy > by + bh) continue;
      g.save(); g.translate(sx, sy); g.rotate(t * 2 + i);
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
      g.fillStyle = '#fff'; starPath(g, 7, 0.4, 4); g.fill(); g.restore();
    }
  }
  g.restore();
  if (!drawArt(g, 'prop/ff-jar', 0, 0, w, h)) {
    g.lineJoin = 'round';
    g.strokeStyle = NAVY; g.lineWidth = 5;
    roundRectPath(g, bx, by, bw, bh, w * 0.22); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx + 14, by + 20); g.lineTo(bx + 14, by + bh * 0.6); g.stroke();
    // neck + cork
    g.fillStyle = '#c98a55'; g.strokeStyle = NAVY; g.lineWidth = 4;
    roundRectPath(g, -w * 0.22, -h * 0.5, w * 0.44, h * 0.2, 8); g.fill(); g.stroke();
    // ribbon bow
    g.fillStyle = '#ff7ac6';
    g.beginPath(); g.ellipse(-w * 0.16, -h * 0.33, w * 0.13, h * 0.06, 0.3, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(w * 0.16, -h * 0.33, w * 0.13, h * 0.06, -0.3, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -h * 0.33, w * 0.06, 0, TAU); g.fill(); g.stroke();
  }
  g.restore();
}
function roundRectPath(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// --- pickups -----------------------------------------------------------------
export function drawPickup(g, kind, x, y, s, t, seed = 0) {
  g.save(); g.translate(x, y);
  if (kind === 'sparkle') {
    glow(g, 0, 0, 46 * s, '#fff1a0', 0.8);
    g.rotate(t * 1.5 + seed);
    if (!drawArt(g, 'prop/ff-sparkle', 0, 0, 64 * s, 64 * s)) {
      g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 3;
      starPath(g, 26 * s, 0.38, 4); g.fill(); g.stroke();
      g.fillStyle = '#fff'; starPath(g, 9 * s, 0.4, 4); g.fill();
    }
  } else if (kind === 'petal') {
    glow(g, 0, 0, 40 * s, '#ffb3d9', 0.6);
    g.rotate(Math.sin(t * 2 + seed) * 1.2 + seed);
    if (!drawArt(g, 'prop/ff-petal', 0, 0, 64 * s, 64 * s)) {
      g.fillStyle = '#ff9fd0'; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 22 * s); g.bezierCurveTo(-26 * s, 4 * s, -18 * s, -24 * s, 0, -18 * s); g.bezierCurveTo(18 * s, -24 * s, 26 * s, 4 * s, 0, 22 * s); g.fill(); g.stroke();
      g.fillStyle = '#ff6fb1'; g.beginPath(); g.ellipse(0, 12 * s, 5 * s, 8 * s, 0, 0, TAU); g.fill();
    }
  } else if (kind === 'dew') {
    glow(g, 0, 0, 50 * s, '#9fe8ff', 0.7);
    g.translate(0, Math.sin(t * 3 + seed) * 4);
    if (!drawArt(g, 'prop/ff-dewdrop', 0, 0, 70 * s, 70 * s)) {
      const gr = g.createLinearGradient(-20 * s, -26 * s, 20 * s, 26 * s);
      gr.addColorStop(0, '#e6fbff'); gr.addColorStop(0.5, '#7fd8ff'); gr.addColorStop(1, '#b49bff');
      g.fillStyle = gr; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, -30 * s); g.bezierCurveTo(14 * s, -10 * s, 24 * s, 2 * s, 24 * s, 12 * s); g.arc(0, 12 * s, 24 * s, 0, Math.PI); g.bezierCurveTo(-24 * s, 2 * s, -14 * s, -10 * s, 0, -30 * s); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-9 * s, 6 * s, 5 * s, 9 * s, 0.4, 0, TAU); g.fill();
    }
  } else if (kind === 'star') {
    const p = 1 + Math.sin(t * 7 + seed) * 0.08;
    glow(g, 0, 0, 90 * s, '#ffe680', 1);
    g.scale(p, p); g.rotate(Math.sin(t * 2 + seed) * 0.2);
    if (!drawArt(g, 'prop/ff-star', 0, 0, 110 * s, 110 * s)) {
      g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 4; g.lineJoin = 'round';
      starPath(g, 46 * s, 0.5, 5); g.fill(); g.stroke();
      g.fillStyle = '#fff4a8'; starPath(g, 26 * s, 0.5, 5); g.fill();
      g.fillStyle = NAVY; g.beginPath(); g.arc(-8 * s, -2 * s, 3.5 * s, 0, TAU); g.arc(8 * s, -2 * s, 3.5 * s, 0, TAU); g.fill();
      g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, 4 * s, 7 * s, 0.2, Math.PI - 0.2); g.stroke();
    }
  }
  g.restore();
}

// --- bumblebee ---------------------------------------------------------------
export function drawBee(g, x, y, s, t, dir, giggle, spin) {
  g.save(); g.translate(x, y); g.rotate(spin); g.scale(dir, 1);
  const flap = Math.abs(Math.sin(t * 40));
  if (drawArt(g, giggle ? 'prop/ff-bee-giggle' : 'prop/ff-bee', 0, 0, 120 * s, 120 * s * (0.94 + flap * 0.06)) || (giggle && drawArt(g, 'prop/ff-bee', 0, 0, 120 * s, 120 * s))) { g.restore(); return; }
  g.scale(s, s); g.lineJoin = 'round';
  // wings
  g.fillStyle = 'rgba(230,248,255,0.85)'; g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath(); g.ellipse(-8, -34, 16, 26 * (0.5 + flap * 0.5), -0.4, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(10, -32, 14, 22 * (0.5 + flap * 0.5), 0.4, 0, TAU); g.fill(); g.stroke();
  // body
  g.save(); g.beginPath(); g.ellipse(0, 0, 44, 34, 0, 0, TAU); g.clip();
  g.fillStyle = '#ffd23f'; g.fillRect(-50, -40, 100, 80);
  g.fillStyle = '#5a3a28'; g.fillRect(-26, -40, 14, 80); g.fillRect(-2, -40, 14, 80);
  g.restore();
  g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 44, 34, 0, 0, TAU); g.stroke();
  // stinger-free round tail + antennae
  g.beginPath(); g.moveTo(30, -26); g.quadraticCurveTo(34, -46, 44, -48); g.moveTo(22, -30); g.quadraticCurveTo(22, -50, 30, -56); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(44, -48, 4, 0, TAU); g.arc(30, -56, 4, 0, TAU); g.fill();
  // face
  if (giggle) {
    g.lineWidth = 3; g.beginPath(); g.arc(26, -6, 5, Math.PI * 1.1, Math.PI * 1.9); g.arc(40, -6, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(33, 8, 8, 0, Math.PI); g.closePath(); g.fill();
  } else {
    g.fillStyle = NAVY; g.beginPath(); g.arc(26, -6, 5, 0, TAU); g.arc(40, -6, 5, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(27.5, -8, 1.8, 0, TAU); g.arc(41.5, -8, 1.8, 0, TAU); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(33, 6, 7, 0.2, Math.PI - 0.2); g.stroke();
  }
  g.fillStyle = 'rgba(255,110,150,0.6)'; g.beginPath(); g.arc(20, 6, 5, 0, TAU); g.arc(44, 6, 4, 0, TAU); g.fill();
  g.restore();
}

// --- garden fairy friends --------------------------------------------------------
export const FAIRY_COLS = [
  { id: 'pink', c: '#ff6fb1', hair: '#d93d86', glow: '#ff9ad0' },
  { id: 'blue', c: '#4db8ff', hair: '#1f84d6', glow: '#8fd6ff' },
  { id: 'yellow', c: '#ffe14a', hair: '#d9a400', glow: '#fff09a' },
  { id: 'green', c: '#59e07a', hair: '#23a047', glow: '#a3f5b6' },
  { id: 'purple', c: '#a06bff', hair: '#6c3bd6', glow: '#cdb0ff' },
];
/** A small garden fairy; (x, y) = body centre. */
export function drawFairy(g, x, y, s, col, t, dir = 1, o = {}) {
  glow(g, x, y, 60 * s, col.glow, o.glowAlpha ?? 0.8);
  if (drawNpcSprite(g, 'garden-fairy-' + col.id, x, y + 25 * s, 64 * s, t, { pose: o.pose || 'idle', facing: dir, alpha: o.alpha ?? 1, rotation: o.rot || 0 })) return;
  g.save(); g.translate(x, y); g.scale(s * dir, s);
  if (o.rot) g.rotate(o.rot);
  g.globalAlpha *= o.alpha ?? 1;
  const flap = Math.sin(t * 30) * 0.45;
  g.lineJoin = 'round';
  for (const [ang, w, h2, a] of [[-0.9, 26, 13, 0.75], [-0.1, 20, 10, 0.6]]) {
    for (const side of [0, 1]) {
      g.save(); g.translate(-3, -4); g.rotate(ang + (side ? flap : flap * 0.8) - 0.2 + side * 0.15);
      g.globalAlpha *= a;
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.strokeStyle = col.c; g.lineWidth = 2.2;
      g.beginPath(); g.ellipse(-w * 0.55, -h2 * 0.2, w, h2, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = col.glow + 'aa'; g.beginPath(); g.ellipse(-w * 0.45, -h2 * 0.2, w * 0.5, h2 * 0.5, 0, 0, TAU); g.fill();
      g.restore();
    }
  }
  g.fillStyle = col.c; g.strokeStyle = NAVY; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(-5, -3); g.lineTo(6, -3); g.lineTo(11, 15); g.quadraticCurveTo(0, 20, -10, 15); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = NAVY; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(-3, 16); g.lineTo(-4, 24 + Math.sin(t * 9) * 1.5); g.moveTo(4, 16); g.lineTo(5, 24 - Math.sin(t * 9) * 1.5); g.stroke();
  g.beginPath(); g.moveTo(5, 0); g.lineTo(16, -6 + Math.sin(t * 7) * 3); g.stroke();
  g.fillStyle = col.hair; g.beginPath(); g.arc(0, -13, 11, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffe3cf'; g.beginPath(); g.arc(1, -11, 8.4, 0, TAU); g.fill();
  g.fillStyle = col.hair; g.beginPath(); g.arc(0, -17, 9.5, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(4, -11, 1.6, 0, TAU); g.arc(-1, -11, 1.6, 0, TAU); g.fill();
  g.fillStyle = '#ff8fb0'; g.beginPath(); g.arc(6, -8, 1.8, 0, TAU); g.fill();
  g.restore();
}

// --- rainbow wind stream -------------------------------------------------------
/** pts: [{x, y}] along the stream; a = alpha; t for the flowing chevrons. */
export function drawStream(g, pts, a, t, dir) {
  if (pts.length < 2 || a <= 0) return;
  g.save(); g.globalAlpha *= a; g.lineCap = 'round'; g.lineJoin = 'round';
  const bw = 15;
  RAINBOW_BANDS.forEach((c, i) => {
    g.strokeStyle = c; g.lineWidth = bw + 1;
    const off = (i - 2.5) * bw;
    g.beginPath();
    pts.forEach((p, k) => { const q = pts[Math.min(k + 1, pts.length - 1)], r = pts[Math.max(k - 1, 0)]; const nx = -(q.y - r.y), ny = q.x - r.x, l = Math.hypot(nx, ny) || 1; const X = p.x + (nx / l) * off, Y = p.y + (ny / l) * off; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); });
    g.stroke();
  });
  // flowing white chevrons
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 6;
  const n = pts.length, ph = ((t * 2.2) % 1);
  for (let k = 0; k < 12; k++) {
    const u = (k + ph) / 12, idx = Math.floor(u * (n - 2));
    const p = pts[dir > 0 ? idx : n - 1 - idx], q = pts[dir > 0 ? idx + 1 : n - 2 - idx];
    if (!p || !q) continue;
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    g.save(); g.translate(p.x, p.y); g.rotate(ang);
    g.beginPath(); g.moveTo(-10, -18); g.lineTo(8, 0); g.lineTo(-10, 18); g.stroke();
    g.restore();
  }
  g.restore();
}
