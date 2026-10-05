// Treasure Dig - procedural props and the beach background. Every prop first
// tries generated art (see the treasure-dig section of image-requests.md) and
// falls back to the drawing here. Sizes: `s` is the box the prop fits in.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { TAU, clamp, lerp } from '../../engine/util.js';

export const NAVY = '#24163f';
const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** First art key that exists wins; false = draw the procedural fallback. */
export function drawKeys(g, keys, x, y, w, h, o) {
  for (const k of keys) if (drawArt(g, k, x, y, w, h, o)) return true;
  return false;
}

// --- heat colours ----------------------------------------------------------------
/** Detector heat 0..1 -> blue (cold) -> yellow (warm) -> red (hot). */
const HEAT_STOPS = [[0, [63, 167, 255]], [0.3, [120, 205, 255]], [0.55, [255, 226, 77]], [0.8, [255, 150, 30]], [1, [255, 59, 72]]];
export function heatRGB(h, l = 0) {
  h = clamp(h, 0, 1);
  let i = 1;
  while (i < HEAT_STOPS.length - 1 && h > HEAT_STOPS[i][0]) i++;
  const [h0, c0] = HEAT_STOPS[i - 1], [h1, c1] = HEAT_STOPS[i];
  const k = (h - h0) / (h1 - h0);
  return c0.map((v, j) => Math.round(clamp(lerp(v, c1[j], k) + l, 0, 255)));
}
/** CSS colour for a heat; `l` brightens (+) or darkens (-) a little. */
export function heatColor(h, l = 0, a = 1) {
  const [r, g, b] = heatRGB(h, l);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

// --- treasures --------------------------------------------------------------------
function outline(g, s) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.06); }

/** A scallop shell (fan up, hinge down). */
export function shellPath(g, s) {
  g.beginPath();
  g.moveTo(-s * 0.1, s * 0.34);
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + 0.22 + (i / 8) * (Math.PI - 0.44);
    const r = s * 0.5, b = s * 0.06;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.92 + s * 0.12;
    if (i === 0) g.lineTo(x, y);
    else {
      const am = a - (Math.PI - 0.44) / 16;
      g.quadraticCurveTo(Math.cos(am) * (r + b), Math.sin(am) * (r + b) * 0.92 + s * 0.12, x, y);
    }
  }
  g.lineTo(s * 0.1, s * 0.34);
  g.closePath();
}
function drawShell(g, s, c1 = '#ffb48a', c2 = '#ff8fa3') {
  outline(g, s);
  // little hinge ears
  g.fillStyle = c2; g.beginPath(); g.moveTo(-s * 0.2, s * 0.28); g.lineTo(-s * 0.06, s * 0.2); g.lineTo(-s * 0.06, s * 0.4); g.lineTo(-s * 0.22, s * 0.4); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(s * 0.2, s * 0.28); g.lineTo(s * 0.06, s * 0.2); g.lineTo(s * 0.06, s * 0.4); g.lineTo(s * 0.22, s * 0.4); g.closePath(); g.fill(); g.stroke();
  const gr = g.createLinearGradient(0, -s * 0.4, 0, s * 0.35); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; shellPath(g, s); g.fill(); g.stroke();
  g.lineWidth = Math.max(1.5, s * 0.035); g.strokeStyle = 'rgba(36,22,63,0.45)';
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + 0.22 + (i / 8) * (Math.PI - 0.44);
    g.beginPath(); g.moveTo(0, s * 0.32); g.lineTo(Math.cos(a) * s * 0.44, Math.sin(a) * s * 0.4 + s * 0.12); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-s * 0.16, -s * 0.18, s * 0.08, s * 0.04, -0.6, 0, TAU); g.fill();
}

function drawPearl(g, s, t) {
  outline(g, s);
  // open clam
  g.fillStyle = '#c9a2ff';
  g.beginPath(); g.ellipse(0, s * 0.18, s * 0.46, s * 0.2, 0, 0, Math.PI); g.lineTo(-s * 0.46, s * 0.18); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#e3cdff';
  g.beginPath(); g.ellipse(0, s * 0.02, s * 0.44, s * 0.3, 0, Math.PI, TAU); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = Math.max(1.5, s * 0.03);
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, s * 0.02); g.lineTo(i * s * 0.17, -s * 0.24 + Math.abs(i) * s * 0.05); g.stroke(); }
  // the pearl
  const glow = 0.5 + 0.5 * Math.sin(t * 4);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + glow * 0.25;
  const rg = g.createRadialGradient(0, s * 0.08, 1, 0, s * 0.08, s * 0.4); rg.addColorStop(0, '#fff'); rg.addColorStop(1, 'rgba(255,220,255,0)');
  g.fillStyle = rg; g.fillRect(-s * 0.4, -s * 0.32, s * 0.8, s * 0.8); g.restore();
  outline(g, s);
  const pg = g.createRadialGradient(-s * 0.06, s * 0.02, 1, 0, s * 0.08, s * 0.2); pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#f0d6f2');
  g.fillStyle = pg; g.beginPath(); g.arc(0, s * 0.08, s * 0.18, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.06, s * 0.02, s * 0.05, 0, TAU); g.fill();
}

function drawGem(g, s, c = '#4fd2ff', d = '#1f8fe0') {
  outline(g, s);
  const w = s * 0.42, top = -s * 0.28, mid = -s * 0.1, bot = s * 0.36;
  g.fillStyle = c;
  g.beginPath(); g.moveTo(-w * 0.55, top); g.lineTo(w * 0.55, top); g.lineTo(w, mid); g.lineTo(0, bot); g.lineTo(-w, mid); g.closePath(); g.fill();
  g.fillStyle = d; g.beginPath(); g.moveTo(-w, mid); g.lineTo(0, bot); g.lineTo(-w * 0.3, mid); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(w, mid); g.lineTo(0, bot); g.lineTo(w * 0.3, mid); g.closePath(); g.globalAlpha = 0.6; g.fill(); g.globalAlpha = 1;
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(-w * 0.55, top); g.lineTo(-w * 0.1, top); g.lineTo(-w * 0.3, mid); g.lineTo(-w, mid); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-w * 0.55, top); g.lineTo(w * 0.55, top); g.lineTo(w, mid); g.lineTo(0, bot); g.lineTo(-w, mid); g.closePath(); g.stroke();
  g.lineWidth = Math.max(1.5, s * 0.03); g.beginPath(); g.moveTo(-w, mid); g.lineTo(w, mid); g.moveTo(-w * 0.3, mid); g.lineTo(0, bot); g.lineTo(w * 0.3, mid); g.stroke();
}

function coin(g, x, y, r, s, face = true) {
  g.fillStyle = '#e8a400'; g.beginPath(); g.ellipse(x, y + r * 0.18, r, r * 0.42, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(x, y, r, r * 0.42, 0, 0, TAU); g.fill(); g.stroke();
  if (face) { g.strokeStyle = '#e8a400'; g.lineWidth = Math.max(1.5, s * 0.03); g.beginPath(); g.ellipse(x, y, r * 0.6, r * 0.24, 0, 0, TAU); g.stroke(); outline(g, s); }
}
function drawCoins(g, s) {
  outline(g, s);
  const r = s * 0.24;
  coin(g, -s * 0.14, s * 0.28, r, s); coin(g, -s * 0.14, s * 0.18, r, s); coin(g, -s * 0.14, s * 0.08, r, s);
  coin(g, s * 0.2, s * 0.3, r, s); coin(g, s * 0.2, s * 0.2, r, s);
  // one standing coin with a star
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(s * 0.08, -s * 0.18, s * 0.24, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = '#e8a400'; g.lineWidth = Math.max(1.5, s * 0.035); g.beginPath(); g.arc(s * 0.08, -s * 0.18, s * 0.16, 0, TAU); g.stroke();
  g.fillStyle = '#fff6a8'; star(g, s * 0.08, -s * 0.18, s * 0.1);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-s * 0.02, -s * 0.3, s * 0.05, s * 0.025, -0.7, 0, TAU); g.fill();
}
function star(g, x, y, r, inner = 0.45) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

export function drawCrownShape(g, s) {
  outline(g, s);
  const w = s * 0.8, h = s * 0.56, y0 = s * 0.26;
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.moveTo(-w / 2, y0); g.lineTo(-w / 2 - w * 0.05, y0 - h * 0.85); g.lineTo(-w * 0.25, y0 - h * 0.48); g.lineTo(0, y0 - h);
  g.lineTo(w * 0.25, y0 - h * 0.48); g.lineTo(w / 2 + w * 0.05, y0 - h * 0.85); g.lineTo(w / 2, y0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#f2a900'; g.fillRect(-w / 2, y0 - h * 0.24, w, h * 0.24); g.strokeRect(-w / 2, y0 - h * 0.24, w, h * 0.24);
  const jewel = (x, y, c, r) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.lineWidth = Math.max(1.5, s * 0.03); g.stroke(); };
  jewel(0, y0 - h * 0.12, '#ff4d6d', s * 0.06); jewel(-w * 0.3, y0 - h * 0.12, '#3fa7ff', s * 0.045); jewel(w * 0.3, y0 - h * 0.12, '#36d17a', s * 0.045);
  jewel(0, y0 - h - s * 0.01, '#fff', s * 0.04); jewel(-w / 2 - w * 0.05, y0 - h * 0.88, '#fff', s * 0.035); jewel(w / 2 + w * 0.05, y0 - h * 0.88, '#fff', s * 0.035);
}

export const LOOT = {
  shell: { pts: 1, name: 'Shell!', color: '#ffb48a', sparks: ['#ffd0b8', '#ff9fb2', '#fff'] },
  pearl: { pts: 2, name: 'Pearl!', color: '#e3cdff', sparks: ['#ffffff', '#f3dcff', '#c9a2ff'] },
  gem: { pts: 3, name: 'Gem!', color: '#4fd2ff', sparks: ['#8fe6ff', '#4fd2ff', '#ffffff'] },
  coins: { pts: 5, name: 'Gold coins!', color: '#ffd23f', sparks: ['#ffd23f', '#fff6a8', '#ffb400'] },
  crown: { pts: 10, name: 'CROWN!', color: '#ffd23f', sparks: ['#ffd23f', '#fff6a8', '#ff6fd0', '#ffffff'] },
  // washed-up beach gifts (visible, walk over to grab)
  starfish: { pts: 1, name: 'Starfish!', color: '#ff9a4d', sparks: ['#ffb36b', '#fff'] },
};

/** Draw a treasure centred at (0,0), fitting a box of size s. */
export function drawLoot(g, kind, s, t = 0) {
  const keys = { shell: ['prop/treasure-shell', 'prop/charm-shell'], pearl: ['prop/treasure-pearl'], gem: ['prop/treasure-gem', 'prop/gem-blue'], coins: ['prop/treasure-coins'], crown: ['prop/treasure-crown', 'prop/crown'], starfish: ['prop/beach-starfish'] }[kind] || [];
  if (drawKeys(g, keys, 0, 0, s, s)) return;
  g.save();
  if (kind === 'shell') drawShell(g, s);
  else if (kind === 'pearl') drawPearl(g, s, t);
  else if (kind === 'gem') drawGem(g, s);
  else if (kind === 'coins') drawCoins(g, s);
  else if (kind === 'crown') drawCrownShape(g, s);
  else if (kind === 'starfish') drawStarfish(g, s, t);
  g.restore();
}

export function drawStarfish(g, s, t = 0) {
  outline(g, s);
  g.save(); g.rotate(Math.sin(t * 2) * 0.1);
  g.fillStyle = '#ff9a4d';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? s * 0.2 : s * 0.46;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd0a0';
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; for (let k = 1; k <= 2; k++) { g.beginPath(); g.arc(Math.cos(a) * s * 0.13 * k, Math.sin(a) * s * 0.13 * k, s * 0.03, 0, TAU); g.fill(); } }
  // cute face
  g.fillStyle = NAVY; g.beginPath(); g.arc(-s * 0.06, -s * 0.02, s * 0.03, 0, TAU); g.arc(s * 0.06, -s * 0.02, s * 0.03, 0, TAU); g.fill();
  g.lineWidth = Math.max(1.5, s * 0.025); g.beginPath(); g.arc(0, s * 0.02, s * 0.05, 0.2, Math.PI - 0.2); g.stroke();
  g.restore();
}

// --- silly finds ---------------------------------------------------------------------
/** A friendly crab. `snap` 0..1 opens the claws. */
export function drawCrab(g, s, t = 0, snap = 0) {
  if (drawKeys(g, ['prop/beach-crab'], 0, 0, s, s)) return;
  g.save(); outline(g, s);
  // legs
  g.lineWidth = Math.max(2.5, s * 0.05);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const wig = Math.sin(t * 18 + i * 1.3 + side) * s * 0.03;
    g.beginPath(); g.moveTo(side * s * 0.18, s * 0.1 + i * s * 0.05); g.lineTo(side * s * 0.38, s * 0.14 + i * s * 0.07 + wig); g.lineTo(side * s * 0.44, s * 0.3 + i * s * 0.05 + wig); g.stroke();
  }
  // claws
  for (const side of [-1, 1]) {
    const op = (0.25 + 0.75 * snap) * (0.6 + 0.4 * Math.abs(Math.sin(t * 9 + side)));
    g.save(); g.translate(side * s * 0.34, -s * 0.12); g.rotate(side * 0.3);
    g.lineWidth = Math.max(2.5, s * 0.05); g.beginPath(); g.moveTo(-side * s * 0.1, s * 0.16); g.lineTo(0, s * 0.02); g.stroke();
    outline(g, s);
    g.fillStyle = '#ff6a4d';
    g.beginPath(); g.ellipse(0, -s * 0.04, s * 0.12, s * 0.1, 0, Math.PI * 0.1 + op * 0.5, Math.PI * 1.9 - op * 0.5); g.lineTo(0, -s * 0.04); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  // body
  const gr = g.createLinearGradient(0, -s * 0.2, 0, s * 0.25); gr.addColorStop(0, '#ff8a6a'); gr.addColorStop(1, '#ff5a46');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, s * 0.08, s * 0.28, s * 0.19, 0, 0, TAU); g.fill(); g.stroke();
  // eye stalks
  for (const side of [-1, 1]) {
    g.beginPath(); g.moveTo(side * s * 0.08, -s * 0.06); g.lineTo(side * s * 0.1, -s * 0.2); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(side * s * 0.1, -s * 0.24, s * 0.075, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(side * s * 0.1 + s * 0.015, -s * 0.235, s * 0.035, 0, TAU); g.fill();
  }
  // smile + cheeks
  g.lineWidth = Math.max(2, s * 0.035); g.beginPath(); g.arc(0, s * 0.06, s * 0.08, 0.25, Math.PI - 0.25); g.stroke();
  g.fillStyle = 'rgba(255,190,200,0.9)'; g.beginPath(); g.arc(-s * 0.16, s * 0.1, s * 0.04, 0, TAU); g.arc(s * 0.16, s * 0.1, s * 0.04, 0, TAU); g.fill();
  g.restore();
}

export function drawSeaweed(g, s, t = 0) {
  if (drawKeys(g, ['prop/beach-seaweed'], 0, 0, s, s)) return;
  g.save(); outline(g, s);
  const cols = ['#3fbf6a', '#2f9e5a', '#6fd38a'];
  for (let i = 0; i < 3; i++) {
    const x0 = (i - 1) * s * 0.2;
    g.fillStyle = cols[i];
    g.beginPath(); g.moveTo(x0 - s * 0.06, -s * 0.3);
    for (let k = 0; k <= 6; k++) { const y = -s * 0.3 + (k / 6) * s * 0.75; g.lineTo(x0 - s * 0.06 + Math.sin(k * 1.4 + t * 3 + i) * s * 0.07, y); }
    for (let k = 6; k >= 0; k--) { const y = -s * 0.3 + (k / 6) * s * 0.75; g.lineTo(x0 + s * 0.06 + Math.sin(k * 1.4 + t * 3 + i) * s * 0.07, y); }
    g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

export function drawSock(g, s) {
  if (drawKeys(g, ['prop/beach-sock'], 0, 0, s, s)) return;
  g.save(); outline(g, s);
  g.beginPath();
  g.moveTo(-s * 0.14, -s * 0.4); g.lineTo(s * 0.12, -s * 0.4); g.lineTo(s * 0.12, s * 0.1);
  g.quadraticCurveTo(s * 0.42, s * 0.12, s * 0.4, s * 0.28); g.quadraticCurveTo(s * 0.38, s * 0.42, s * 0.1, s * 0.4);
  g.lineTo(-s * 0.06, s * 0.4); g.quadraticCurveTo(-s * 0.16, s * 0.38, -s * 0.15, s * 0.24); g.closePath();
  g.fillStyle = '#ffffff'; g.fill();
  g.save(); g.clip();
  const stripes = ['#ff6fb1', '#3fa7ff', '#ffd23f'];
  for (let i = 0; i < 6; i++) { g.fillStyle = stripes[i % 3]; g.fillRect(-s * 0.3, -s * 0.36 + i * s * 0.14, s * 0.8, s * 0.06); }
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(s * 0.36, s * 0.32, s * 0.12, 0, TAU); g.fill();
  g.restore();
  g.stroke();
  g.fillStyle = '#e8e2f2'; g.fillRect(-s * 0.14, -s * 0.4, s * 0.26, s * 0.08); g.strokeRect(-s * 0.14, -s * 0.4, s * 0.26, s * 0.08);
  g.restore();
}

export function drawDuck(g, s) {
  if (drawKeys(g, ['prop/beach-duck', 'prop/rubber-duck'], 0, 0, s, s)) return;
  g.save(); outline(g, s);
  g.fillStyle = '#ffd84d';
  g.beginPath(); g.ellipse(-s * 0.02, s * 0.14, s * 0.36, s * 0.22, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(s * 0.12, -s * 0.14, s * 0.19, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.ellipse(s * 0.33, -s * 0.1, s * 0.1, s * 0.05, 0.1, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(s * 0.17, -s * 0.18, s * 0.035, 0, TAU); g.fill();
  g.fillStyle = '#ffbf1f'; g.beginPath(); g.ellipse(-s * 0.08, s * 0.1, s * 0.15, s * 0.08, -0.3, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

// --- chest ---------------------------------------------------------------------------
/** Treasure chest: (0,0) = bottom centre; w = width; open 0..1. */
export function drawChest(g, w, open = 0, t = 0) {
  if (open < 0.5 ? drawKeys(g, ['prop/treasure-chest'], 0, 0, w, w * 0.8, { anchor: 'bottom' }) : drawKeys(g, ['prop/treasure-chest-open'], 0, 0, w, w * 1.0, { anchor: 'bottom' })) return;
  const h = w * 0.46, x = -w / 2;
  g.save(); outline(g, w * 0.5);
  if (open > 0) {
    // golden glow from inside
    g.save(); g.globalCompositeOperation = 'lighter';
    const rg = g.createRadialGradient(0, -h, 4, 0, -h, w * 0.9); rg.addColorStop(0, `rgba(255,236,140,${0.8 * open})`); rg.addColorStop(1, 'rgba(255,200,60,0)');
    g.fillStyle = rg; g.fillRect(-w, -h - w, w * 2, w * 2); g.restore();
  }
  const lidH = h * 0.62;
  if (open > 0.5) {
    // lid flipped open, standing up behind the chest (inside face showing)
    const k = (open - 0.5) * 2;
    g.save(); g.translate(0, -h); g.scale(1, 0.4 + 0.6 * k);
    g.fillStyle = '#7a4420';
    g.beginPath(); g.moveTo(x + 4, 0); g.lineTo(x - w * 0.02, -lidH * 1.25); g.quadraticCurveTo(0, -lidH * 1.55, -x + w * 0.02, -lidH * 1.25); g.lineTo(-x - 4, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f';
    for (const bx of [-0.36, 0.28]) { g.beginPath(); g.rect(bx * w, -lidH * 1.35, w * 0.08, lidH * 1.35); g.fill(); g.stroke(); }
    g.restore();
  }
  // body
  g.fillStyle = '#b86a32'; ui.roundRect(g, x, -h, w, h, w * 0.05); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.3)'; g.lineWidth = Math.max(1.5, w * 0.012);
  for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(x + 4, -h + (i * h) / 3); g.lineTo(x + w - 4, -h + (i * h) / 3); g.stroke(); }
  outline(g, w * 0.5);
  g.fillStyle = '#ffd23f';
  for (const bx of [-0.36, 0.28]) { g.fillRect(bx * w, -h, w * 0.08, h); g.strokeRect(bx * w, -h, w * 0.08, h); }
  if (open > 0) {
    // coins heaped inside
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.ellipse(0, -h, w * 0.46, h * 0.28 * open, 0, Math.PI, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff6a8';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-w * 0.3 + i * w * 0.12, -h - h * 0.08 * open - Math.sin(i * 2.1) * h * 0.06, w * 0.03, 0, TAU); g.fill(); }
  }
  // lid (closed, squashing down as it starts to open)
  if (open <= 0.5) {
  g.save(); g.translate(0, -h);
  g.scale(1, 1 - open * 1.6);
  g.fillStyle = '#c87a3a';
  g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -lidH * 0.5); g.quadraticCurveTo(0, -lidH * 1.25, -x, -lidH * 0.5); g.lineTo(-x, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f';
  for (const bx of [-0.36, 0.28]) { g.beginPath(); g.rect(bx * w, -lidH * 0.92, w * 0.08, lidH * 0.92); g.fill(); g.stroke(); }
  g.restore();
  }
  // lock
  if (open < 0.5) {
    g.fillStyle = '#ffd23f'; ui.roundRect(g, -w * 0.07, -h - h * 0.12, w * 0.14, h * 0.32, w * 0.03); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(0, -h + h * 0.02, w * 0.018, 0, TAU); g.fill();
  }
  g.restore();
}

// --- the detector ------------------------------------------------------------------------
/** The shell-shaped treasure detector gadget, centred; `heat` colours its light, `pulse` 0..1 flashes it. */
export function drawDetector(g, s, heat, pulse, t, bang = false) {
  const col = heatColor(heat);
  // glow
  g.save(); g.globalCompositeOperation = 'lighter';
  const r = s * (0.7 + pulse * 0.5 + (bang ? 0.25 : 0));
  const rg = g.createRadialGradient(0, 0, 2, 0, 0, r);
  rg.addColorStop(0, heatColor(heat, 30, 0.55 + pulse * 0.4)); rg.addColorStop(1, heatColor(heat, 0, 0));
  g.fillStyle = rg; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
  if (!drawArt(g, 'prop/shell-detector', 0, 0, s, s)) {
    // antenna
    outline(g, s);
    g.lineWidth = Math.max(2, s * 0.06);
    g.beginPath(); g.moveTo(s * 0.12, -s * 0.3); g.quadraticCurveTo(s * 0.18, -s * 0.48, s * 0.3, -s * 0.52); g.stroke();
    g.fillStyle = pulse > 0.4 ? '#ffffff' : col; g.beginPath(); g.arc(s * 0.3, -s * 0.52, s * 0.08, 0, TAU); g.fill(); g.stroke();
    drawShell(g, s * 0.95, '#ffd1ec', '#ff8fc8');
  }
  // the light ("screen") on the shell
  g.save(); outline(g, s);
  g.lineWidth = Math.max(2, s * 0.05);
  g.fillStyle = pulse > 0.5 ? '#ffffff' : col;
  g.beginPath(); g.arc(0, s * 0.02, s * 0.16, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-s * 0.05, -s * 0.03, s * 0.05, 0, TAU); g.fill();
  g.restore();
}

/** Red "!" badge: the detector says DIG HERE. */
export function drawBang(g, s, t) {
  g.save(); g.scale(1 + Math.sin(t * 16) * 0.08, 1 + Math.sin(t * 16) * 0.08);
  g.fillStyle = '#ff4d6d'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2.5, s * 0.1);
  g.beginPath(); g.arc(0, 0, s / 2, 0, TAU); g.fill(); g.stroke();
  ui.text(g, '!', 0, s * 0.03, { size: s * 0.8, color: '#fff', stroke: false, weight: 800 });
  g.restore();
}

/** A dug hole (x, y centre). k = 0..1 fresh -> filled in. */
export function drawHole(g, x, y, r, k = 1) {
  if (k <= 0) return;
  g.save(); g.globalAlpha = k;
  if (!drawArt(g, 'prop/sand-hole', x, y, r * 2.6, r * 1.3)) {
    g.fillStyle = '#e8c27e'; g.beginPath(); g.ellipse(x, y, r * 1.3, r * 0.62, 0, 0, TAU); g.fill();
    g.fillStyle = '#b98a4a'; g.beginPath(); g.ellipse(x, y + r * 0.04, r, r * 0.44, 0, 0, TAU); g.fill();
    g.fillStyle = '#8f6534'; g.beginPath(); g.ellipse(x, y + r * 0.1, r * 0.72, r * 0.3, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.6)';
    for (let i = 0; i < 5; i++) { const a = Math.PI + 0.3 + i * 0.6; g.beginPath(); g.arc(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.55, r * 0.12, 0, TAU); g.fill(); }
  }
  g.restore();
}

// --- background --------------------------------------------------------------------------
export const SHORE = 262;  // y where the sea meets the sand

function umbrella(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 6;
  g.fillStyle = 'rgba(120,80,30,0.2)'; g.beginPath(); g.ellipse(-30, 4, 170, 50, 0, 0, TAU); g.fill();
  g.fillStyle = '#f3efe6'; g.fillRect(-5, -200, 10, 202); g.strokeRect(-5, -200, 10, 202);
  // canopy: a striped dome with a scalloped rim
  const rim = -190, top = -290, R = 175;
  const dome = () => {
    g.beginPath(); g.moveTo(-R, rim);
    g.bezierCurveTo(-R, top + 10, -R * 0.4, top, 0, top);
    g.bezierCurveTo(R * 0.4, top, R, top + 10, R, rim);
    for (let i = 5; i >= 0; i--) { const x0 = -R + (i * 2 * R) / 6; g.quadraticCurveTo(x0 + R / 6, rim + 18, x0, rim); }
    g.closePath();
  };
  dome(); g.save(); g.clip();
  const cols = ['#ff6fb1', '#ffffff', '#3fc1ff', '#ffffff', '#ffd23f', '#ffffff'];
  for (let i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.beginPath(); g.moveTo(0, top - 40); g.lineTo(-R + (i * 2 * R) / 6, rim + 20); g.lineTo(-R + ((i + 1) * 2 * R) / 6, rim + 20); g.closePath(); g.fill(); }
  g.fillStyle = 'rgba(36,22,63,0.12)'; g.fillRect(-R, rim - 24, 2 * R, 50);
  g.restore();
  dome(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, top - 4, 11, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

function sandcastle(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.fillStyle = 'rgba(120,80,30,0.2)'; g.beginPath(); g.ellipse(0, 4, 120, 26, 0, 0, TAU); g.fill();
  const tower = (tx, w, h) => {
    g.fillStyle = '#eac27a'; g.beginPath(); g.rect(tx - w / 2, -h, w, h); g.fill(); g.stroke();
    g.fillStyle = '#eac27a';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.rect(tx - w / 2 + i * (w / 3) + 2, -h - 14, w / 3 - 8, 14); g.fill(); g.stroke(); }
  };
  g.fillStyle = '#e2b56a'; g.beginPath(); g.rect(-90, -60, 180, 60); g.fill(); g.stroke();
  tower(-70, 50, 100); tower(70, 50, 100); tower(0, 66, 140);
  g.fillStyle = '#b98a4a'; g.beginPath(); g.moveTo(-16, 0); g.lineTo(-16, -30); g.arc(0, -30, 16, Math.PI, 0); g.lineTo(16, 0); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = NAVY; g.beginPath(); g.moveTo(0, -154); g.lineTo(0, -196); g.stroke();
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.moveTo(0, -196); g.lineTo(34, -186); g.lineTo(0, -174); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function towel(g, x, y, w, h, rot, c1, c2) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = 'rgba(120,80,30,0.18)'; ui.roundRect(g, -w / 2 + 6, -h / 2 + 8, w, h, 10); g.fill();
  g.fillStyle = c1; ui.roundRect(g, -w / 2, -h / 2, w, h, 10); g.fill();
  g.save(); ui.roundRect(g, -w / 2, -h / 2, w, h, 10); g.clip();
  g.fillStyle = c2; for (let i = 0; i < 8; i++) if (i % 2) g.fillRect(-w / 2 + (i * w) / 8, -h / 2, w / 8, h);
  g.restore();
  g.strokeStyle = NAVY; g.lineWidth = 5; ui.roundRect(g, -w / 2, -h / 2, w, h, 10); g.stroke();
  g.restore();
}

/** The beach (sea strip at the top, wet sand, dry sand, edge decor). */
export function buildBeach(arena) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  // sea
  const sea = g.createLinearGradient(0, 0, 0, SHORE);
  sea.addColorStop(0, '#2f9ee0'); sea.addColorStop(0.55, '#45c0ec'); sea.addColorStop(1, '#7fe0f0');
  g.fillStyle = sea; g.fillRect(0, 0, W, SHORE + 40);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = hh(i) * W, y = 20 + hh(i + 9) * (SHORE - 60), w = 30 + hh(i + 3) * 50;
    g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - 8, x + w / 2, y); g.stroke();
  }
  // sand
  const sand = g.createLinearGradient(0, SHORE, 0, H);
  sand.addColorStop(0, '#e9c98a'); sand.addColorStop(0.1, '#f6dea4'); sand.addColorStop(1, '#f9e3b0');
  g.fillStyle = sand;
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, SHORE + Math.sin(x * 0.006) * 10 + Math.sin(x * 0.017) * 5);
  g.lineTo(W, H); g.closePath(); g.fill();
  // wet sand band
  g.fillStyle = 'rgba(190,150,90,0.28)';
  g.beginPath(); g.moveTo(0, SHORE + 70);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, SHORE + 62 + Math.sin(x * 0.009 + 1) * 12);
  for (let x = W; x >= 0; x -= 40) g.lineTo(x, SHORE + Math.sin(x * 0.006) * 10 + Math.sin(x * 0.017) * 5);
  g.closePath(); g.fill();
  // sand ripples + speckles
  g.strokeStyle = 'rgba(214,170,100,0.45)'; g.lineWidth = 3;
  for (let i = 0; i < 70; i++) {
    const x = hh(i + 40) * W, y = SHORE + 90 + hh(i + 71) * (H - SHORE - 90), w = 40 + hh(i + 5) * 70;
    g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - 7, x + w / 2, y); g.stroke();
  }
  for (let i = 0; i < 900; i++) {
    const x = hh(i + 200) * W, y = SHORE + 20 + hh(i + 900) * (H - SHORE);
    g.fillStyle = i % 3 ? 'rgba(200,150,80,0.35)' : 'rgba(255,255,255,0.55)';
    g.beginPath(); g.arc(x, y, 1.5 + hh(i + 3) * 2.5, 0, TAU); g.fill();
  }
  // pebbles
  for (let i = 0; i < 22; i++) {
    const x = hh(i + 500) * W, y = SHORE + 120 + hh(i + 520) * (H - SHORE - 160);
    g.fillStyle = ['#d9c7b0', '#c9b8a8', '#e8dccb'][i % 3]; g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, 7 + hh(i) * 6, 5 + hh(i + 1) * 3, hh(i + 2), 0, TAU); g.fill(); g.stroke();
  }
  // decor at the edges (outside the digging area)
  towel(g, arena.x1 + 20, 640, 170, 78, 0.2, '#ff8fc8', '#ffffff');
  towel(g, arena.x0 - 4, 905, 170, 78, -0.15, '#5fc9ff', '#ffffff');
  sandcastle(g, arena.x0 - 18, 640, 0.62);
  umbrella(g, arena.x1 + 50, 990, 0.72);
  return cv;
}
