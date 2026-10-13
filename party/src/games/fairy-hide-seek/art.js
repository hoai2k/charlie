// Fairy Hide & Seek: procedural art (each piece tries its generated art first).
//   bg/fairy-hide-seek  prop/fhs-<spot type>  prop/fhs-frog  prop/fhs-snail
//   prop/fhs-ladybug  prop/fhs-magnifier   (fairies: garden fairy NPC sets)
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { drawNpcSprite } from '../../engine/npc-art.js';
import * as ui from '../../engine/ui.js';
import { TAU } from '../../engine/util.js';

export const NAVY = '#24163f';
export const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Spot types: size of the drawn box (bottom-centre anchored).
export const SPOTS = {
  'flower-pink': { w: 210, h: 280 },    // boxes match the art's aspect so it sits on the ground
  'flower-yellow': { w: 210, h: 280 },
  mushroom: { w: 230, h: 215 },
  leaf: { w: 250, h: 195 },
  teapot: { w: 240, h: 205 },
  can: { w: 240, h: 185 },
  pot: { w: 210, h: 210 },
  boot: { w: 180, h: 200 },
};

// --- glow ----------------------------------------------------------------------
const glowCache = new Map();
export function glow(g, x, y, r, color, alpha = 1) {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 128;
    const x2 = c.getContext('2d');
    const gr = x2.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color + '88'); gr.addColorStop(1, color + '00');
    x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
  }
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= alpha;
  g.drawImage(c, x - r, y - r, r * 2, r * 2); g.restore();
}

// --- background (cached) ----------------------------------------------------------
let bgCache = null;
function buildBg() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 230);
  sky.addColorStop(0, '#7fd0ff'); sky.addColorStop(1, '#d4f1ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, 240);
  for (const [x, y, s] of [[220, 80, 1], [760, 60, 0.8], [1350, 90, 1.1], [1780, 55, 0.7]]) ui.cloud(g, x, y, s, '#fff', 0.95);
  // far hedge with roses
  g.fillStyle = '#4aa65e';
  g.beginPath(); g.moveTo(0, 240); for (let x = 0; x <= W; x += 60) g.quadraticCurveTo(x + 30, 160 + hh(x) * 30, x + 60, 215); g.lineTo(W, 290); g.lineTo(0, 290); g.fill();
  for (let i = 0; i < 26; i++) { const x = hh(i + 3) * W, y = 190 + hh(i + 8) * 50; g.fillStyle = ['#ff6f9a', '#ffd23f', '#fff', '#ff9fd8'][i % 4]; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
  // picket fence
  g.fillStyle = '#fffaf2'; g.strokeStyle = '#c9b8a8'; g.lineWidth = 3;
  g.fillRect(0, 238, W, 12); g.fillRect(0, 266, W, 12);
  for (let x = 10; x < W; x += 46) { g.beginPath(); g.moveTo(x, 290); g.lineTo(x, 222); g.lineTo(x + 14, 208); g.lineTo(x + 28, 222); g.lineTo(x + 28, 290); g.closePath(); g.fill(); g.stroke(); }
  // lawn with mown stripes
  const lawn = g.createLinearGradient(0, 285, 0, H);
  lawn.addColorStop(0, '#8fdc6e'); lawn.addColorStop(1, '#5fbf52');
  g.fillStyle = lawn; g.fillRect(0, 285, W, H - 285);
  g.globalAlpha = 0.12; g.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 280 - 200, H); g.lineTo(i * 280 + 40, 285); g.lineTo(i * 280 + 180, 285); g.lineTo(i * 280 - 60, H); g.fill(); }
  g.globalAlpha = 1;
  // stepping-stone path
  g.fillStyle = '#efe4d2'; g.strokeStyle = '#c9b8a0'; g.lineWidth = 3;
  for (let i = 0; i < 14; i++) { const u = i / 13; const x = 960 + Math.sin(u * 5) * 420, y = 300 + u * 700; g.beginPath(); g.ellipse(x, y, 40 + u * 30, 16 + u * 12, 0, 0, TAU); g.fill(); g.stroke(); }
  // daisies & clover
  for (let i = 0; i < 160; i++) {
    const x = hh(i + 100) * W, y = 300 + hh(i + 200) * (H - 300), r = 3 + (y / H) * 4;
    if (i % 3) { g.fillStyle = '#4ea84a'; g.beginPath(); g.arc(x, y, r * 1.2, 0, TAU); g.arc(x + r, y, r * 1.2, 0, TAU); g.arc(x + r * 0.5, y - r, r * 1.2, 0, TAU); g.fill(); }
    else { g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.256) * r, y + Math.sin(k * 1.256) * r, r * 0.8, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, r * 0.6, 0, TAU); g.fill(); }
  }
  return c;
}
/** The background as an image (generated art or the cached procedural one). */
export function bgImage() {
  const img = art('bg/fairy-hide-seek');
  if (img) return img;
  if (!bgCache) bgCache = buildBg();
  return bgCache;
}

// --- hiding spots (origin = bottom centre, -y up) --------------------------------
function flower(g, w, h, c1, c2, t) {
  g.strokeStyle = NAVY; g.lineWidth = 4; g.lineJoin = 'round';
  g.fillStyle = '#4fb056';
  g.beginPath(); g.moveTo(-12, 0); g.lineTo(-10, -h * 0.62); g.lineTo(10, -h * 0.62); g.lineTo(12, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#62c46a';
  g.beginPath(); g.ellipse(-w * 0.28, -h * 0.16, w * 0.3, h * 0.08, -0.5, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(w * 0.28, -h * 0.3, w * 0.3, h * 0.08, 0.5, 0, TAU); g.fill(); g.stroke();
  const cy = -h + w * 0.48, r = w * 0.5;
  for (let i = 0; i < 8; i++) {
    g.save(); g.translate(0, cy); g.rotate((i / 8) * TAU + 0.2);
    g.fillStyle = i % 2 ? c1 : c2;
    g.beginPath(); g.ellipse(r * 0.55, 0, r * 0.5, r * 0.3, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  g.fillStyle = '#ffb347'; g.beginPath(); g.arc(0, cy, r * 0.34, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-r * 0.12, cy - r * 0.04, 4, 0, TAU); g.arc(r * 0.12, cy - r * 0.04, 4, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, cy + r * 0.06, r * 0.12, 0.2, Math.PI - 0.2); g.stroke();
}
export function drawSpot(g, type, w, h, t) {
  if (drawArt(g, 'prop/fhs-' + type, 0, -h / 2, w, h)) return;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
  switch (type) {
    case 'flower-pink': flower(g, w, h, '#ff7ac6', '#ffc4e6', t); break;
    case 'flower-yellow': flower(g, w, h, '#ffd23f', '#fff0a8', t); break;
    case 'mushroom': {
      g.fillStyle = '#fff1dc';
      g.beginPath(); g.moveTo(-w * 0.18, 0); g.quadraticCurveTo(-w * 0.22, -h * 0.4, -w * 0.14, -h * 0.55); g.lineTo(w * 0.14, -h * 0.55); g.quadraticCurveTo(w * 0.22, -h * 0.4, w * 0.18, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff4d5e';
      g.beginPath(); g.moveTo(-w * 0.5, -h * 0.45); g.quadraticCurveTo(-w * 0.48, -h * 1.02, 0, -h); g.quadraticCurveTo(w * 0.48, -h * 1.02, w * 0.5, -h * 0.45); g.quadraticCurveTo(0, -h * 0.58, -w * 0.5, -h * 0.45); g.fill(); g.stroke();
      g.fillStyle = '#fff';
      for (const [dx, dy, r] of [[-0.25, -0.72, 0.08], [0.1, -0.86, 0.07], [0.3, -0.62, 0.065], [-0.05, -0.6, 0.05], [-0.38, -0.55, 0.04]]) { g.beginPath(); g.ellipse(dx * w, dy * h, r * w, r * w * 0.8, 0, 0, TAU); g.fill(); }
      break;
    }
    case 'leaf': {
      const leaves = [[-0.32, -0.9, -0.7, '#3f9b4d'], [0.32, -0.9, 0.7, '#3f9b4d'], [-0.15, -1, -0.25, '#52b45c'], [0.15, -1, 0.25, '#52b45c'], [0, -0.8, 0, '#66c86c']];
      for (const [dx, sy, rot, c] of leaves) {
        g.save(); g.translate(dx * w * 0.3, 0); g.rotate(rot);
        g.fillStyle = c;
        g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-w * 0.28, -h * 0.3, -w * 0.18, -h * 0.9 * -sy, 0, -h * -sy); g.bezierCurveTo(w * 0.18, -h * 0.9 * -sy, w * 0.28, -h * 0.3, 0, 0); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -h * -sy * 0.85); g.stroke();
        g.restore();
      }
      break;
    }
    case 'teapot': {
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(w * 0.3, -h * 0.45); g.quadraticCurveTo(w * 0.48, -h * 0.5, w * 0.5, -h * 0.82); g.lineTo(w * 0.42, -h * 0.84); g.quadraticCurveTo(w * 0.38, -h * 0.58, w * 0.26, -h * 0.6); g.fill(); g.stroke();
      g.beginPath(); g.arc(-w * 0.36, -h * 0.5, h * 0.17, Math.PI * 0.5, Math.PI * 1.5); g.lineWidth = 12; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
      g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.ellipse(0, -h * 0.42, w * 0.34, h * 0.4, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ffd23f'; g.fillRect(-w * 0.3, -h * 0.12, w * 0.6, 8);
      g.beginPath(); g.ellipse(0, -h * 0.82, w * 0.2, h * 0.06, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(0, -h * 0.9, 10, 0, TAU); g.fill(); g.stroke();
      for (const [dx, dy] of [[-0.12, -0.45], [0.12, -0.38], [0, -0.58]]) { g.fillStyle = '#ff8fb8'; g.beginPath(); g.arc(dx * w, dy * h, 13, 0, TAU); g.fill(); g.fillStyle = '#5fbf7f'; g.beginPath(); g.ellipse(dx * w + 14, dy * h + 6, 9, 5, 0.5, 0, TAU); g.fill(); }
      break;
    }
    case 'can': {
      g.fillStyle = '#6fe3b4';
      g.beginPath(); g.moveTo(w * 0.15, -h * 0.5); g.lineTo(w * 0.46, -h * 0.9); g.lineTo(w * 0.5, -h * 0.82); g.lineTo(w * 0.22, -h * 0.35); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(w * 0.5, -h * 0.88, 14, 22, -0.6, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-w * 0.32, 0); g.lineTo(-w * 0.28, -h * 0.7); g.lineTo(w * 0.22, -h * 0.7); g.lineTo(w * 0.26, 0); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(-w * 0.03, -h * 0.72, w * 0.22, Math.PI, 0); g.lineWidth = 10; g.stroke(); g.strokeStyle = '#6fe3b4'; g.lineWidth = 4; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-w * 0.2, -h * 0.62, 14, h * 0.5);
      break;
    }
    case 'pot': {
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42, x = Math.cos(a) * w * 0.32, y = -h * 0.6 + Math.sin(a) * h * 0.38;
        g.fillStyle = '#4fb056'; g.beginPath(); g.ellipse(x * 0.8, y + 20, 22, 12, a, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = i % 2 ? '#a77bff' : '#d1b3ff';
        for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.256) * 14, y + Math.sin(k * 1.256) * 14, 13, 0, TAU); g.fill(); g.stroke(); }
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
      }
      g.fillStyle = '#e07a4f';
      g.beginPath(); g.moveTo(-w * 0.36, -h * 0.5); g.lineTo(w * 0.36, -h * 0.5); g.lineTo(w * 0.27, 0); g.lineTo(-w * 0.27, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#f0905f'; g.fillRect(-w * 0.42, -h * 0.58, w * 0.84, h * 0.12); g.strokeRect(-w * 0.42, -h * 0.58, w * 0.84, h * 0.12);
      break;
    }
    case 'boot': {
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * w * 0.17, y = -h * 0.88 - (i % 2) * 18; g.strokeStyle = '#3f9b4d'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, -h * 0.7); g.lineTo(x, y); g.stroke(); g.strokeStyle = NAVY; g.lineWidth = 3; g.fillStyle = '#fff'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + Math.cos(k * 1.05) * 11, y + Math.sin(k * 1.05) * 11, 8, 5, k * 1.05, 0, TAU); g.fill(); g.stroke(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
      g.lineWidth = 4; g.fillStyle = '#ffd23f';
      g.beginPath(); g.moveTo(-w * 0.3, -h * 0.78); g.lineTo(w * 0.12, -h * 0.78); g.lineTo(w * 0.14, -h * 0.25); g.quadraticCurveTo(w * 0.5, -h * 0.22, w * 0.48, 0); g.lineTo(-w * 0.32, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffb000'; g.fillRect(-w * 0.32, -h * 0.07, w * 0.8, h * 0.07);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-w * 0.22, -h * 0.7, 12, h * 0.45);
      break;
    }
    default: break;
  }
  g.restore();
}

// --- garden fairies ------------------------------------------------------------------
export const FAIRY_COLS = [
  { id: 'pink', c: '#ff6fb1', hair: '#d93d86', glow: '#ff9ad0' },
  { id: 'blue', c: '#4db8ff', hair: '#1f84d6', glow: '#8fd6ff' },
  { id: 'yellow', c: '#ffe14a', hair: '#d9a400', glow: '#fff09a' },
  { id: 'green', c: '#59e07a', hair: '#23a047', glow: '#a3f5b6' },
  { id: 'purple', c: '#a06bff', hair: '#6c3bd6', glow: '#cdb0ff' },
];
/** A garden fairy; (x, y) = body centre, s = 1 is ~60 px tall. */
export function drawFairy(g, x, y, s, col, t, dir = 1, o = {}) {
  if (o.glow !== false) glow(g, x, y, 58 * s, col.glow, o.glowAlpha ?? 0.8);
  if (drawNpcSprite(g, 'garden-fairy-' + col.id, x, y + 30 * s, 72 * s, t, { pose: o.pose || 'idle', facing: dir, alpha: o.alpha ?? 1, rotation: o.rot || 0 })) return;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(s * dir * 1.2, s * 1.2);
  g.globalAlpha *= o.alpha ?? 1;
  const flap = Math.sin(t * 30) * 0.45;
  g.lineJoin = 'round';
  for (const [ang, w, h2, a] of [[-0.9, 26, 13, 0.75], [-0.1, 20, 10, 0.6]]) {
    for (const side of [0, 1]) {
      g.save(); g.translate(-3, -4); g.rotate(ang + (side ? flap : flap * 0.8) - 0.2 + side * 0.15);
      g.globalAlpha *= a;
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.strokeStyle = col.c; g.lineWidth = 2.2;
      g.beginPath(); g.ellipse(-w * 0.55, -h2 * 0.2, w, h2, 0, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
  }
  g.fillStyle = col.c; g.strokeStyle = NAVY; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(-5, -3); g.lineTo(6, -3); g.lineTo(11, 15); g.quadraticCurveTo(0, 20, -10, 15); g.closePath(); g.fill(); g.stroke();
  g.lineWidth = 2.4; g.beginPath(); g.moveTo(-3, 16); g.lineTo(-4, 24); g.moveTo(4, 16); g.lineTo(5, 24); g.stroke();
  g.fillStyle = col.hair; g.beginPath(); g.arc(0, -13, 11, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffe3cf'; g.beginPath(); g.arc(1, -11, 8.4, 0, TAU); g.fill();
  g.fillStyle = col.hair; g.beginPath(); g.arc(0, -17, 9.5, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  if (o.happy) { g.strokeStyle = NAVY; g.lineWidth = 1.6; g.beginPath(); g.arc(4, -11, 2, Math.PI, 0); g.arc(-1, -11, 2, Math.PI, 0); g.stroke(); }
  else { g.fillStyle = NAVY; g.beginPath(); g.arc(4, -11, 1.6, 0, TAU); g.arc(-1, -11, 1.6, 0, TAU); g.fill(); }
  g.fillStyle = '#ff8fb0'; g.beginPath(); g.arc(6, -8, 1.8, 0, TAU); g.fill();
  g.restore();
}

// --- decoys (origin = bottom centre) -------------------------------------------------
export function drawFrog(g, x, y, s, t, o = {}) {
  g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s * (1 + (o.squash || 0)));
  if (!drawArt(g, 'prop/fhs-frog', 0, -54, 120, 120)) {
    g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4; g.fillStyle = '#6fd36a';
    g.beginPath(); g.ellipse(0, -38, 52, 38, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.arc(-26, -78, 18, 0, TAU); g.arc(26, -78, 18, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-26, -80, 11, 0, TAU); g.arc(26, -80, 11, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.arc(-24, -80, 6, 0, TAU); g.arc(28, -80, 6, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, -42, 28, 0.15, Math.PI - 0.15); g.stroke();
    if (o.mouth) { g.fillStyle = '#ff7a9a'; g.beginPath(); g.ellipse(0, -30, 18, 10 * o.mouth, 0, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = 'rgba(255,120,150,0.6)'; g.beginPath(); g.arc(-36, -40, 7, 0, TAU); g.arc(36, -40, 7, 0, TAU); g.fill();
    g.fillStyle = '#58bd56'; g.strokeStyle = NAVY;
    g.beginPath(); g.ellipse(-36, -6, 20, 9, 0, 0, TAU); g.ellipse(36, -6, 20, 9, 0, 0, TAU); g.fill(); g.stroke();
  }
  g.restore();
}
export function drawSnail(g, x, y, s, t, o = {}) {
  g.save(); g.translate(x, y); g.scale(s * (o.dir || 1), s);
  if (!drawArt(g, 'prop/fhs-snail', 0, -40, 130, 100)) {
    g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.fillStyle = '#ffd9a8';
    g.beginPath(); g.moveTo(-60, 0); g.quadraticCurveTo(-60, -20, 10, -18); g.lineTo(40, -30); g.quadraticCurveTo(64, -60, 60, -8); g.quadraticCurveTo(60, 0, 40, 0); g.closePath(); g.fill(); g.stroke();
    const wave = o.wave ? Math.sin(t * 12) * 0.5 : 0;
    for (const [bx, a] of [[44, -0.3], [54, 0.2 + wave]]) { g.save(); g.translate(bx, -44); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -28); g.stroke(); g.fillStyle = NAVY; g.beginPath(); g.arc(0, -30, 5, 0, TAU); g.fill(); g.restore(); }
    g.fillStyle = NAVY; g.beginPath(); g.arc(52, -20, 2, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = '#ff9fd8'; g.beginPath(); g.arc(-12, -40, 34, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#a77bff'; g.lineWidth = 6; g.beginPath();
    for (let k = 0; k < 40; k++) { const a = k * 0.4, r = 28 - k * 0.65; const px = -12 + Math.cos(a) * r, py = -40 + Math.sin(a) * r; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
  }
  g.restore();
}
export function drawLadybug(g, x, y, s, t, o = {}) {
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s);
  if (!drawArt(g, 'prop/fhs-ladybug', 0, 0, 70, 70)) {
    g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 3;
    if (o.fly) { g.fillStyle = 'rgba(230,248,255,0.8)'; const f = Math.abs(Math.sin(t * 40)); g.beginPath(); g.ellipse(-16, -14, 12, 20 * f + 4, -0.6, 0, TAU); g.ellipse(16, -14, 12, 20 * f + 4, 0.6, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = NAVY; g.beginPath(); g.arc(0, -22, 13, 0, TAU); g.fill();
    g.fillStyle = '#ff4d5e'; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, -26); g.lineTo(0, 26); g.stroke();
    g.fillStyle = NAVY; for (const [dx, dy] of [[-12, -8], [12, -8], [-14, 10], [14, 10]]) { g.beginPath(); g.arc(dx, dy, 5, 0, TAU); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-5, -25, 3, 0, TAU); g.arc(5, -25, 3, 0, TAU); g.fill();
  }
  g.restore();
}

/** Speech bubble with a word ("ribbit!") centred at (x, y). */
export function bubble(g, str, x, y, k = 1) {
  g.save(); g.translate(x, y); g.scale(k, k);
  const w = Math.max(90, ui.measure(g, str, 40, 800) + 40);
  g.fillStyle = '#fff'; g.strokeStyle = NAVY; g.lineWidth = 5;
  ui.roundRect(g, -w / 2, -34, w, 64, 30); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-12, 28); g.lineTo(0, 50); g.lineTo(12, 28); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(-12, 22, 24, 8);
  ui.text(g, str, 0, -2, { size: 40, color: NAVY, stroke: false, weight: 800 });
  g.restore();
}

/** Magnifier rim + handle; lens centre (x, y), radius r, handle toward (hx, hy). */
export function drawMagnifier(g, x, y, r, color, hx, hy, t, glint = 0) {
  const img = art('prop/fhs-magnifier');
  if (img) {
    // art: lens centre at (120, 120) of 320, lens radius 100, handle to the lower right
    const k = r / 100;
    g.drawImage(img, x - 120 * k, y - 120 * k, 320 * k, 320 * k);
    g.save(); g.strokeStyle = color; g.lineWidth = 8; g.beginPath(); g.arc(x, y, r + 4, 0, TAU); g.stroke(); g.restore();
    return;
  }
  const ang = Math.atan2(hy - y, hx - x);
  g.save(); g.lineCap = 'round';
  // handle
  const sx = x + Math.cos(ang) * r * 1.02, sy = y + Math.sin(ang) * r * 1.02, ex = x + Math.cos(ang) * r * 1.75, ey = y + Math.sin(ang) * r * 1.75;
  g.strokeStyle = NAVY; g.lineWidth = 30; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
  g.strokeStyle = '#ff8fc7'; g.lineWidth = 20; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
  g.strokeStyle = '#ffd23f'; g.lineWidth = 20; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(ang) * 14, sy + Math.sin(ang) * 14); g.stroke();
  // rim
  g.strokeStyle = NAVY; g.lineWidth = 22; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.strokeStyle = color; g.lineWidth = 15; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.strokeStyle = '#ffe79a'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r - 9, 0, TAU); g.stroke();
  // glass glint
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 9;
  g.beginPath(); g.arc(x, y, r * 0.72, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
  if (glint > 0) { g.globalAlpha = glint; g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r + 16 + (1 - glint) * 30, 0, TAU); g.stroke(); }
  g.restore();
}
