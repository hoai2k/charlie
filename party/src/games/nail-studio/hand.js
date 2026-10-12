// Sparkle Nails: the client's hand (or paw), the nails and everything painted
// on them, the stickers and gems, polish bottles, tool icons and the little
// hand fan. All drawing is procedural; stickers and the fan look up generated
// art first (prop/nail-sticker-*, prop/nail-fan).
//
// Hand space: origin at the middle of the palm, fingers point up (-y), units
// are "station units" (the station scales them). The nails are what the
// player paints, so their geometry is exact and shared by drawing and the
// cursor hit test.
import { drawArt } from '../../engine/art.js';
import { RAINBOW } from '../../engine/particles.js';
import { drawSparkleShape, drawStarShape, drawHeartShape, starPath } from '../../engine/emotes.js';
import * as ui from '../../engine/ui.js';
import { clamp, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';

export const POLISH = [
  { c: '#ff6fb1', n: 'Pink' },
  { c: '#ff4d6d', n: 'Cherry' },
  { c: '#ff9f1c', n: 'Orange' },
  { c: '#ffd23f', n: 'Lemon' },
  { c: '#4fd98a', n: 'Mint' },
  { c: '#4fb8ff', n: 'Sky' },
  { c: '#a77bff', n: 'Purple' },
  { c: '#ffffff', n: 'Snow' },
  { c: '#f2c84b', n: 'Gold', shimmer: true },
  { c: '#3b2a6e', n: 'Midnight' },
];

/** Design tools (step 2). Glitter is its own layer; the rest are one pattern per nail. */
export const TOOLS = [
  { id: 'glitter', n: 'Glitter' },
  { id: 'stripes', n: 'Stripes' },
  { id: 'dots', n: 'Dots' },
  { id: 'hearts', n: 'Hearts' },
  { id: 'stars', n: 'Stars' },
  { id: 'tips', n: 'Tips' },
  { id: 'rainbow', n: 'Rainbow' },
];
export const TOOL_IDX = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));
export const TOOL_NAME = { stripes: 'Stripes', dots: 'Polka Dots', hearts: 'Hearts', stars: 'Stars', tips: 'Tips', rainbow: 'Rainbow Tips', glitter: 'Sparkle' };

/** Gems and stickers (step 3). */
export const ITEMS = [
  { id: 'gem-pink', n: 'Pink gem', c: '#ff6fb1' },
  { id: 'gem-blue', n: 'Blue gem', c: '#4fb8ff' },
  { id: 'gem-purple', n: 'Heart gem', c: '#a77bff' },
  { id: 'pearl', n: 'Pearl', c: '#f6efff' },
  { id: 'star', n: 'Gold star', c: '#ffd23f' },
  { id: 'heart', n: 'Heart', c: '#ff4d6d' },
  { id: 'flower', n: 'Daisy', c: '#ffffff' },
  { id: 'butterfly', n: 'Butterfly', c: '#ff8fd0' },
  { id: 'bow', n: 'Bow', c: '#ff6fb1' },
  { id: 'crown', n: 'Crown', c: '#ffd23f' },
];
export const ITEM_SIZE = 40;   // hand units

function hex(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
export function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; }

// --- clients ---------------------------------------------------------------------
// Skin / fur per client. Animals get paws; Bronze a shiny robot hand; the cake
// a frosting-soft hand with sprinkles.
const STYLE = {
  fox: { kind: 'paw', skin: '#ff9a4d', shade: '#e0702a', cuff: '#fff4e6' },
  fellowfox: { kind: 'paw', skin: '#ffa25e', shade: '#e27a35', cuff: '#fff4e6' },
  hotdog: { kind: 'paw', skin: '#ffd85a', shade: '#f0b72e', cuff: '#ff9ed6' },
  unicorn: { kind: 'paw', skin: '#efe6ff', shade: '#c5b3ee', cuff: '#ffc2e2' },
  'cotton-candy': { kind: 'paw', skin: '#ffd0ea', shade: '#f5a8d4', cuff: '#b9e6ff' },
  'professor-hoot': { kind: 'paw', skin: '#b9a6ec', shade: '#9480d4', cuff: '#ffe7a8' },
  bronze: { kind: 'robot', skin: '#9fd8b4', shade: '#5fae80', cuff: '#ffd23f' },
  'marshmallow-birthday-cake': { kind: 'mitt', skin: '#fff3f7', shade: '#ffc9dc', cuff: '#ff8fb6' },
  glimmer: { kind: 'hand', skin: '#d6fff6', shade: '#9fe6d6', cuff: '#7fe3d4' },
  marina: { kind: 'hand', skin: '#ffd9c4', shade: '#f2b49a', cuff: '#e8364a' },
  scale: { kind: 'hand', skin: '#ffe2cc', shade: '#f2bea0', cuff: '#2a9d8f' },
  'princess-amber': { kind: 'hand', skin: '#f6c7a0', shade: '#dfa077', cuff: '#ff9a1f' },
  snowstar: { kind: 'hand', skin: '#ffe6d6', shade: '#f2c1a8', cuff: '#39c46a' },
  felicity: { kind: 'hand', skin: '#f0c19a', shade: '#d89a70', cuff: '#ff8a2a' },
  'kpop-girls': { kind: 'hand', skin: '#ffdcc2', shade: '#efb999', cuff: '#b04dff' },
};
const SKINS = ['#ffd9c4', '#f6c7a0', '#d9a074', '#a8704a', '#ffe2cc'];
export function handStyle(id, color = '#ff6fb1') {
  const s = STYLE[id];
  if (s) return { ...s };
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const skin = SKINS[h % SKINS.length];
  return { kind: 'hand', skin, shade: mix(skin, '#a05a3a', 0.25), cuff: color };
}

// --- geometry ----------------------------------------------------------------------
// Fingers for a hand seen from the back (a right hand: thumb on the left).
const FINGERS = [
  { bx: -112, by: 74, a: -0.92, len: 118, w: 56, nh: 44 },   // thumb
  { bx: -78, by: -4, a: -0.13, len: 150, w: 54, nh: 50 },
  { bx: -22, by: -12, a: -0.03, len: 170, w: 56, nh: 54 },
  { bx: 34, by: -8, a: 0.07, len: 158, w: 54, nh: 52 },
  { bx: 86, by: 10, a: 0.2, len: 120, w: 48, nh: 42 },
];
const TOES = [-1.08, -0.52, 0, 0.52, 1.08];

/**
 * Finger/toe and nail geometry. `wig` (0..1) wiggles the fingers (showcase
 * and happy moments); t is the clock for it.
 */
export function geom(style, wig = 0, t = 0) {
  const fingers = [], nails = [];
  if (style.kind === 'paw') {
    TOES.forEach((a0, i) => {
      const a = a0 + Math.sin(t * 11 + i * 1.3) * 0.07 * wig;
      const r = 152 - Math.abs(a0) * 8;
      const cx = Math.sin(a) * r, cy = 80 - Math.cos(a) * r;
      fingers.push({ cx, cy, a, rx: 46, ry: 54 });
      const d = 44;
      nails.push({ x: cx + Math.sin(a) * d, y: cy - Math.cos(a) * d, w: 46, h: 46, rot: a, i });
    });
  } else {
    const fat = style.kind === 'mitt' ? 1.12 : 1;
    FINGERS.forEach((f, i) => {
      const a = f.a + Math.sin(t * 12 + i * 1.7) * 0.08 * wig;
      const dx = Math.sin(a), dy = -Math.cos(a);
      const tx = f.bx + dx * f.len, ty = f.by + dy * f.len, w = f.w * fat;
      fingers.push({ bx: f.bx, by: f.by, tx, ty, a, w, len: f.len });
      const nh = f.nh, nw = w * 0.72, back = nh / 2 + w * 0.16;
      nails.push({ x: tx - dx * back, y: ty - dy * back, w: nw, h: nh, rot: a, i });
    });
  }
  return { fingers, nails };
}

/** Rotate a hand-space point into nail i's frame (tip toward -y). */
export function toNail(n, x, y) {
  const c = Math.cos(-n.rot), s = Math.sin(-n.rot), dx = x - n.x, dy = y - n.y;
  return { u: dx * c - dy * s, v: dx * s + dy * c };
}
export function fromNail(n, u, v) {
  const c = Math.cos(n.rot), s = Math.sin(n.rot);
  return { x: n.x + u * c - v * s, y: n.y + u * s + v * c };
}

/** Index of the nail under hand point (x, y), or -1. */
export function nailAt(G, x, y, slack = 8) {
  let best = -1, bd = Infinity;
  G.nails.forEach((n, i) => {
    const { u, v } = toNail(n, x, y);
    if (Math.abs(u) <= n.w / 2 + slack && Math.abs(v) <= n.h / 2 + slack) {
      const d = Math.hypot(u, v);
      if (d < bd) { bd = d; best = i; }
    }
  });
  return best;
}

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  const u = l2 ? clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + u * vx), py - (ay + u * vy));
}

/** Is hand point (x, y) on the hand (palm, fingers or nails)? */
export function onHand(style, G, x, y, slack = 6) {
  if (nailAt(G, x, y, slack) >= 0) return true;
  if (style.kind === 'paw') {
    if (((x / (126 + slack)) ** 2 + ((y - 102) / (104 + slack)) ** 2) <= 1) return true;
    return G.fingers.some((f) => ((x - f.cx) / (f.rx + slack)) ** 2 + ((y - f.cy) / (f.ry + slack)) ** 2 <= 1);
  }
  if (x >= -122 - slack && x <= 120 + slack && y >= -24 - slack && y <= 178 + slack) return true;
  return G.fingers.some((f) => segDist(x, y, f.bx, f.by, f.tx, f.ty) <= f.w / 2 + slack);
}

// --- hand drawing --------------------------------------------------------------------
function capsule(g, f) {
  const dx = Math.sin(f.a), dy = -Math.cos(f.a), nx = -dy, ny = dx, r = f.w / 2;
  g.moveTo(f.bx + nx * r, f.by + ny * r);
  g.lineTo(f.tx + nx * r, f.ty + ny * r);
  g.arc(f.tx, f.ty, r, f.a, f.a - Math.PI, true);
  g.lineTo(f.bx - nx * r, f.by - ny * r);
  g.closePath();
}

function palmPath(g, style) {
  if (style.kind === 'paw') { g.ellipse(0, 102, 126, 104, 0, 0, TAU); return; }
  const x0 = -122, x1 = 120, y0 = -26, y1 = 178;
  g.moveTo(x0 + 40, y0);
  g.lineTo(x1 - 40, y0);
  g.quadraticCurveTo(x1, y0, x1, y0 + 46);
  g.lineTo(x1 - 6, y1 - 56);
  g.quadraticCurveTo(x1 - 14, y1, x1 - 70, y1);
  g.lineTo(x0 + 66, y1);
  g.quadraticCurveTo(x0 + 6, y1, x0, y1 - 70);
  g.lineTo(x0, y0 + 40);
  g.quadraticCurveTo(x0, y0, x0 + 40, y0);
  g.closePath();
}

function wristPath(g, style) {
  const w = style.kind === 'paw' ? 82 : 86;
  g.moveTo(-w, 150); g.lineTo(-w + 4, 236); g.lineTo(w - 4, 236); g.lineTo(w, 150); g.closePath();
}

/**
 * The whole hand (no nails): o.wrist (default true) draws the wrist and a cuff
 * in the client's colour; o.G is the geometry from geom().
 */
export function drawHandBase(g, style, G, o = {}) {
  const wrist = o.wrist !== false;
  const shapes = [];
  if (wrist) shapes.push((q) => wristPath(q, style));
  if (style.kind === 'paw') {
    shapes.push((q) => palmPath(q, style));
    for (const f of G.fingers) shapes.push((q) => q.ellipse(f.cx, f.cy, f.rx, f.ry, f.a, 0, TAU));
  } else {
    shapes.push((q) => palmPath(q, style));
    for (const f of G.fingers) shapes.push((q) => capsule(q, f));
  }
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  // pass 1: one thick navy silhouette
  g.strokeStyle = NAVY; g.lineWidth = 12;
  for (const s of shapes) { g.beginPath(); s(g); g.stroke(); }
  // pass 2: fill
  let fill = style.skin;
  if (style.kind === 'robot') {
    const gr = g.createLinearGradient(-150, -200, 150, 200);
    gr.addColorStop(0, mix(style.skin, '#ffffff', 0.45)); gr.addColorStop(0.5, style.skin); gr.addColorStop(1, style.shade);
    fill = gr;
  }
  g.fillStyle = fill;
  for (const s of shapes) { g.beginPath(); s(g); g.fill(); }
  // soft shading on the right side
  // (each shape on its own: one combined path would leave holes where shapes overlap)
  const sh = g.createLinearGradient(-40, 0, 150, 0);
  sh.addColorStop(0, 'rgba(160,80,110,0)'); sh.addColorStop(1, 'rgba(160,80,110,0.16)');
  const hl = g.createRadialGradient(-60, 50, 4, -60, 50, 90);
  hl.addColorStop(0, 'rgba(255,255,255,0.32)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sh;
  for (const s of shapes) { g.beginPath(); s(g); g.fill(); }
  g.fillStyle = hl;
  g.beginPath(); palmPath(g, style); g.fill();
  // details
  g.strokeStyle = style.shade; g.lineWidth = 4;
  if (style.kind === 'paw') {
    // fur tufts between the toes and at the sides
    g.strokeStyle = style.shade; g.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      const a = (TOES[i] + TOES[i + 1]) / 2, x = Math.sin(a) * 104, y = 80 - Math.cos(a) * 104;
      g.beginPath(); g.moveTo(x - Math.sin(a) * 8, y + Math.cos(a) * 8); g.lineTo(x + Math.sin(a) * 18, y - Math.cos(a) * 18); g.stroke();
    }
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 116, 92); g.quadraticCurveTo(sx * 134, 108, sx * 122, 130); g.stroke(); }
    // a little heart on the back of the paw
    g.save(); g.translate(0, 112); g.globalAlpha = 0.5; drawHeartShape(g, 52, style.shade); g.restore();
  } else {
    for (const f of G.fingers) {
      // knuckle wrinkles
      const dx = Math.sin(f.a), dy = -Math.cos(f.a), nx = -dy, ny = dx;
      for (const k of [0.42, 0.47]) {
        const cx = f.bx + dx * f.len * k, cy = f.by + dy * f.len * k, r = f.w * 0.22;
        g.beginPath(); g.moveTo(cx - nx * r, cy - ny * r); g.quadraticCurveTo(cx + dx * 4, cy + dy * 4, cx + nx * r, cy + ny * r); g.stroke();
      }
      if (style.kind === 'robot') {
        g.save(); g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.45)';
        const cx = f.bx + dx * f.len * 0.62, cy = f.by + dy * f.len * 0.62, r = f.w / 2 - 2;
        g.beginPath(); g.moveTo(cx - nx * r, cy - ny * r); g.lineTo(cx + nx * r, cy + ny * r); g.stroke();
        g.restore();
      }
    }
    if (style.kind === 'robot') {
      g.fillStyle = 'rgba(36,22,63,0.4)';
      for (const [x, y] of [[-90, 0], [88, 0], [-90, 150], [88, 150]]) { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
      g.beginPath(); g.arc(0, 80, 26, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.arc(-7, 73, 7, 0, TAU); g.fillStyle = '#fff6c8'; g.fill();
    } else if (style.kind === 'mitt') {
      const cols = ['#ff6fb1', '#4fb8ff', '#ffd23f', '#4fd98a', '#a77bff'];
      for (let i = 0; i < 14; i++) {
        const x = -90 + ((i * 53) % 180), y = 10 + ((i * 37) % 150), a = i * 1.3;
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = cols[i % cols.length];
        ui.roundRect(g, -9, -3.5, 18, 7, 3.5); g.fill(); g.restore();
      }
    }
  }
  // cuff
  if (wrist) {
    g.save();
    g.beginPath(); wristPath(g, style); g.clip();
    const cy = 196;
    if (style.kind === 'paw') {
      g.fillStyle = style.cuff;
      g.beginPath(); g.moveTo(-100, 250);
      for (let x = -100; x <= 100; x += 25) g.quadraticCurveTo(x + 12, cy - 18, x + 25, cy);
      g.lineTo(100, 250); g.closePath(); g.fill();
    } else {
      g.fillStyle = style.cuff; g.fillRect(-100, cy, 200, 60);
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(-100, cy, 200, 9);
    }
    g.restore();
  }
  g.restore();
}

// --- nails ----------------------------------------------------------------------------
function nailPath(g, w, h) {
  const r = w / 2;
  g.beginPath();
  g.moveTo(-r, h / 2 - w * 0.28);
  g.lineTo(-r, -h / 2 + r);
  g.arc(0, -h / 2 + r, r, Math.PI, 0);
  g.lineTo(r, h / 2 - w * 0.28);
  g.quadraticCurveTo(r, h / 2, 0, h / 2);
  g.quadraticCurveTo(-r, h / 2, -r, h / 2 - w * 0.28);
  g.closePath();
}

function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function smallHeart(g, x, y, s, color) {
  g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(0, s * 0.35);
  g.bezierCurveTo(-s * 0.9, -s * 0.2, -s * 0.45, -s * 0.9, 0, -s * 0.4);
  g.bezierCurveTo(s * 0.45, -s * 0.9, s * 0.9, -s * 0.2, 0, s * 0.35);
  g.fillStyle = color; g.fill(); g.restore();
}

/** The pattern layer of one nail, drawn in the nail frame (already clipped). */
export function drawPattern(g, tool, color, w, h, seed = 1, t = 0) {
  const top = -h / 2, R = rng(seed);
  const ink = color === '#ffffff' ? '#ffffff' : color;
  switch (tool) {
    case 'stripes': {
      g.strokeStyle = ink; g.lineWidth = w * 0.17; g.lineCap = 'butt';
      for (let k = -2; k <= 2; k++) { const o = k * w * 0.42; g.beginPath(); g.moveTo(-w + o, h * 0.6); g.lineTo(w + o, -h * 0.6); g.stroke(); }
      break;
    }
    case 'dots': {
      g.fillStyle = ink;
      const sp = w * 0.34, r = w * 0.095;
      for (let row = 0; row * sp < h + sp; row++) for (let col = -2; col <= 2; col++) {
        const x = col * sp + (row % 2 ? sp / 2 : 0), y = top + sp * 0.5 + row * sp * 0.86;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      break;
    }
    case 'hearts':
      smallHeart(g, 0, top + h * 0.42, w * 0.46, ink);
      smallHeart(g, -w * 0.22, top + h * 0.8, w * 0.22, ink);
      smallHeart(g, w * 0.24, top + h * 0.16, w * 0.2, ink);
      break;
    case 'stars':
      for (const [x, y, s] of [[0, top + h * 0.45, w * 0.5], [-w * 0.24, top + h * 0.14, w * 0.22], [w * 0.22, top + h * 0.82, w * 0.22]]) {
        g.save(); g.translate(x, y); g.rotate(R() * 0.6 - 0.3); starPath(g, s * 0.5, 0.45); g.fillStyle = ink; g.fill(); g.restore();
      }
      break;
    case 'tips': {
      const d = h * 0.32;
      g.fillStyle = ink;
      g.beginPath(); g.moveTo(-w, top - 4); g.lineTo(w, top - 4); g.lineTo(w, top + d * 0.7);
      g.quadraticCurveTo(0, top + d * 1.35, -w, top + d * 0.7); g.closePath(); g.fill();
      break;
    }
    case 'rainbow': {
      const bands = RAINBOW.slice(0, 6), bh = h * 0.075;
      for (let i = bands.length - 1; i >= 0; i--) {
        const d = h * 0.16 + i * bh;
        g.fillStyle = bands[i];
        g.beginPath(); g.moveTo(-w, top - 4); g.lineTo(w, top - 4); g.lineTo(w, top + d * 0.75);
        g.quadraticCurveTo(0, top + d * 1.3, -w, top + d * 0.75); g.closePath(); g.fill();
      }
      break;
    }
    case 'glitter': {
      const cols = [ink, '#ffffff', mix(color, '#ffffff', 0.5)];
      for (let i = 0; i < 26; i++) {
        const x = (R() - 0.5) * w, y = top + R() * h, r = 1.4 + R() * 2.4;
        g.fillStyle = cols[i % 3]; g.globalAlpha = 0.75 + R() * 0.25;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const x = (R() - 0.5) * w * 0.7, y = top + h * (0.2 + R() * 0.6), tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2.1 + seed);
        g.save(); g.translate(x, y); g.globalAlpha = tw; drawSparkleShape(g, w * 0.34, '#ffffff'); g.restore();
      }
      break;
    }
    default: break;
  }
}

/**
 * One nail at its place on the hand. `s` is the nail state:
 * { color, under, cover, art: {tool, color, t, seed}, glitter: {color, t, seed}, wet, pop }.
 */
export function drawNail(g, n, s, t = 0, o = {}) {
  const { w, h } = n;
  g.save();
  g.translate(n.x, n.y); g.rotate(n.rot);
  const pop = s.pop > 0 ? 1 + Math.sin(s.pop * Math.PI) * 0.18 : 1;
  if (pop !== 1) g.scale(pop, pop);
  nailPath(g, w, h);
  g.fillStyle = o.bare || '#ffe4ec'; g.fill();
  g.save(); g.clip();
  // natural nail: a pale tip
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath(); g.moveTo(-w, -h / 2 - 2); g.lineTo(w, -h / 2 - 2); g.lineTo(w, -h / 2 + h * 0.16); g.quadraticCurveTo(0, -h / 2 + h * 0.3, -w, -h / 2 + h * 0.16); g.closePath(); g.fill();
  if (s.under != null) { g.fillStyle = POLISH[s.under].c; g.fillRect(-w, -h, w * 2, h * 2); }
  if (s.color != null) {
    const cov = clamp(s.cover ?? 1, 0, 1);
    const y0 = h / 2 - cov * (h + 6);
    g.fillStyle = POLISH[s.color].c;
    if (cov >= 1) g.fillRect(-w, -h, w * 2, h * 2);
    else {
      // a wavy wet brush edge
      g.beginPath(); g.moveTo(-w, h);
      g.lineTo(-w, y0);
      for (let x = -w / 2; x <= w / 2 + 0.1; x += w / 4) g.quadraticCurveTo(x - w / 8, y0 - 5, x, y0 + Math.sin(x * 0.3 + t * 9) * 2);
      g.lineTo(w, y0); g.lineTo(w, h); g.closePath(); g.fill();
    }
    if (POLISH[s.color].shimmer) {
      g.fillStyle = 'rgba(255,255,255,0.6)';
      const R = rng(n.i * 13 + 5);
      for (let i = 0; i < 12; i++) { const x = (R() - 0.5) * w, y = (R() - 0.5) * h; if (y > y0) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); } }
    }
  }
  if (s.art) {
    const rev = clamp((s.art.t ?? 1) / 0.3, 0, 1);
    g.save();
    if (rev < 1) { g.beginPath(); g.rect(-w, h / 2 - rev * (h + 4), w * 2, h * 2); g.clip(); }
    drawPattern(g, s.art.tool, s.art.color, w, h, s.art.seed, t);
    g.restore();
  }
  if (s.glitter) {
    const rev = clamp((s.glitter.t ?? 1) / 0.3, 0, 1);
    g.save(); g.globalAlpha = rev;
    drawPattern(g, 'glitter', s.glitter.color, w, h, s.glitter.seed, t);
    g.restore();
  }
  // gloss (stronger while wet)
  const wet = s.wet || 0;
  g.fillStyle = `rgba(255,255,255,${0.42 + wet * 0.35})`;
  g.beginPath(); g.ellipse(-w * 0.2, -h * 0.08, w * 0.1, h * 0.3, 0.05, 0, TAU); g.fill();
  if (wet > 0) {
    const yy = ((t * 0.7 + n.i * 0.23) % 1) * h - h / 2;
    g.fillStyle = `rgba(255,255,255,${0.35 * wet})`;
    g.beginPath(); g.ellipse(w * 0.15, yy, w * 0.08, h * 0.12, 0, 0, TAU); g.fill();
  }
  g.restore();
  nailPath(g, w, h);
  g.lineWidth = o.line ?? 4; g.strokeStyle = NAVY; g.stroke();
  if (o.hover) {
    g.save(); g.setLineDash([7, 6]); g.lineDashOffset = -t * 30;
    g.lineWidth = 4; g.strokeStyle = '#ffffff';
    g.scale(1.22, 1.14); nailPath(g, w, h); g.stroke();
    g.restore();
  }
  g.restore();
}

// --- stickers and gems ---------------------------------------------------------------
function gemCut(g, s, color) {
  const r = s * 0.46;
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + TAU / 16; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fillStyle = color; g.fill(); g.stroke();
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + TAU / 16; g.lineTo(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52); }
  g.closePath(); g.fillStyle = mix(color, '#ffffff', 0.45); g.fill();
  g.lineWidth = Math.max(1, s * 0.03); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.ellipse(-r * 0.3, -r * 0.35, r * 0.18, r * 0.1, -0.6, 0, TAU); g.fill();
}

/** A sticker or gem centred at (x, y), about s units across. */
export function drawSticker(g, id, x, y, s, rot = 0, t = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (drawArt(g, `prop/nail-sticker-${id}`, 0, 0, s * 1.1, s * 1.1)) { g.restore(); return; }
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = Math.max(1.5, s * 0.06);
  switch (id) {
    case 'gem-pink': gemCut(g, s, '#ff6fb1'); break;
    case 'gem-blue': gemCut(g, s, '#4fb8ff'); break;
    case 'gem-purple': {
      g.beginPath(); g.moveTo(0, s * 0.38);
      g.bezierCurveTo(-s * 0.62, -s * 0.05, -s * 0.36, -s * 0.52, 0, -s * 0.2);
      g.bezierCurveTo(s * 0.36, -s * 0.52, s * 0.62, -s * 0.05, 0, s * 0.38);
      g.fillStyle = '#a77bff'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, s * 0.18); g.lineTo(-s * 0.2, -s * 0.06); g.lineTo(0, -s * 0.1); g.lineTo(s * 0.2, -s * 0.06); g.closePath();
      g.fillStyle = '#d6c2ff'; g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-s * 0.2, -s * 0.18, s * 0.07, s * 0.04, -0.6, 0, TAU); g.fill();
      break;
    }
    case 'pearl': {
      const gr = g.createRadialGradient(-s * 0.12, -s * 0.14, s * 0.04, 0, 0, s * 0.42);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#f3ecfa'); gr.addColorStop(1, '#d8c8ee');
      g.beginPath(); g.arc(0, 0, s * 0.36, 0, TAU); g.fillStyle = gr; g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-s * 0.12, -s * 0.13, s * 0.08, 0, TAU); g.fill();
      break;
    }
    case 'star':
      starPath(g, s * 0.48, 0.46); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-s * 0.08, -s * 0.12, s * 0.07, s * 0.04, -0.6, 0, TAU); g.fill();
      break;
    case 'heart':
      g.beginPath(); g.moveTo(0, s * 0.38);
      g.bezierCurveTo(-s * 0.7, -s * 0.05, -s * 0.38, -s * 0.6, 0, -s * 0.22);
      g.bezierCurveTo(s * 0.38, -s * 0.6, s * 0.7, -s * 0.05, 0, s * 0.38);
      g.fillStyle = '#ff4d6d'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-s * 0.2, -s * 0.16, s * 0.08, s * 0.05, -0.6, 0, TAU); g.fill();
      break;
    case 'flower':
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * s * 0.24, Math.sin(a) * s * 0.24, s * 0.17, s * 0.12, a, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke(); }
      g.beginPath(); g.arc(0, 0, s * 0.14, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
      break;
    case 'butterfly': {
      const flap = 1 - Math.abs(Math.sin(t * 3)) * 0.18;
      g.save(); g.scale(flap, 1);
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(sx * s * 0.22, -s * 0.1, s * 0.22, s * 0.17, sx * 0.5, 0, TAU); g.fillStyle = '#ff8fd0'; g.fill(); g.stroke();
        g.beginPath(); g.ellipse(sx * s * 0.17, s * 0.16, s * 0.14, s * 0.11, -sx * 0.4, 0, TAU); g.fillStyle = '#b98bff'; g.fill(); g.stroke();
      }
      g.restore();
      g.beginPath(); g.ellipse(0, 0, s * 0.05, s * 0.24, 0, 0, TAU); g.fillStyle = NAVY; g.fill();
      break;
    }
    case 'bow':
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sx * s * 0.5, -s * 0.42, sx * s * 0.5, 0); g.quadraticCurveTo(sx * s * 0.5, s * 0.42, 0, 0);
        g.fillStyle = '#ff6fb1'; g.fill(); g.stroke();
      }
      g.beginPath(); g.arc(0, 0, s * 0.11, 0, TAU); g.fillStyle = '#ff9fd0'; g.fill(); g.stroke();
      break;
    case 'crown':
      g.beginPath(); g.moveTo(-s * 0.42, s * 0.26); g.lineTo(-s * 0.42, -s * 0.16); g.lineTo(-s * 0.2, s * 0.04); g.lineTo(0, -s * 0.32); g.lineTo(s * 0.2, s * 0.04); g.lineTo(s * 0.42, -s * 0.16); g.lineTo(s * 0.42, s * 0.26); g.closePath();
      g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
      g.beginPath(); g.arc(0, s * 0.1, s * 0.08, 0, TAU); g.fillStyle = '#ff4d6d'; g.fill(); g.stroke();
      break;
    default: break;
  }
  g.restore();
}

// --- tray things -------------------------------------------------------------------------
/** A little polish bottle standing on (x, y) (bottom centre), s tall. */
export function drawBottle(g, color, x, y, s, o = {}) {
  g.save(); g.translate(x, y);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.05);
  const bw = s * 0.62, bh = s * 0.56;
  // cap
  g.fillStyle = o.capColor || '#3a2c5e';
  ui.roundRect(g, -s * 0.13, -s, s * 0.26, s * 0.42, s * 0.06); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-s * 0.08, -s * 0.94, s * 0.05, s * 0.3);
  // glass body
  ui.roundRect(g, -bw / 2, -bh - s * 0.02, bw, bh, s * 0.16);
  g.fillStyle = color; g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  ui.roundRect(g, -bw / 2 + s * 0.08, -bh + s * 0.06, s * 0.09, bh * 0.6, s * 0.04); g.fill();
  if (o.shimmer) { g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-bw * 0.2 + (i * 0.37 % 1) * bw * 0.5, -bh * (0.25 + (i * 0.53 % 1) * 0.5), s * 0.025, 0, TAU); g.fill(); } }
  g.restore();
}

/** Tool icon for the design tray: a mini nail showing that pattern. */
export function drawToolIcon(g, tool, color, x, y, s, t = 0) {
  const w = s * 0.56, h = s * 0.8;
  g.save(); g.translate(x, y);
  nailPath(g, w, h);
  g.fillStyle = tool === 'glitter' ? '#ffe8f4' : color === '#ffffff' ? '#ffb3d9' : '#fff3f8'; g.fill();
  g.save(); g.clip();
  drawPattern(g, tool, color, w, h, 7, t);
  g.restore();
  nailPath(g, w, h); g.lineWidth = Math.max(2, s * 0.05); g.strokeStyle = NAVY; g.stroke();
  g.restore();
}

/** Small brush (cursor in the polish step): tip at (x, y). */
export function drawBrush(g, color, x, y, s, tilt = -0.5) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.06);
  // bristles
  g.beginPath(); g.moveTo(-s * 0.1, -s * 0.28); g.quadraticCurveTo(-s * 0.12, -s * 0.05, 0, 0); g.quadraticCurveTo(s * 0.12, -s * 0.05, s * 0.1, -s * 0.28); g.closePath();
  g.fillStyle = color; g.fill(); g.stroke();
  // handle (a bottle cap)
  g.fillStyle = '#3a2c5e'; ui.roundRect(g, -s * 0.13, -s * 0.95, s * 0.26, s * 0.67, s * 0.07); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-s * 0.07, -s * 0.88, s * 0.05, s * 0.5);
  g.restore();
}

/** Nail-art pen (cursor in the design step): tip at (x, y). */
export function drawPen(g, color, x, y, s, tilt = -0.5) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.06);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-s * 0.09, -s * 0.2); g.lineTo(s * 0.09, -s * 0.2); g.closePath(); g.fillStyle = color; g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; ui.roundRect(g, -s * 0.12, -s * 0.95, s * 0.24, s * 0.76, s * 0.1); g.fill(); g.stroke();
  g.fillStyle = color; ui.roundRect(g, -s * 0.12, -s * 0.62, s * 0.24, s * 0.18, s * 0.03); g.fill(); g.stroke();
  g.restore();
}

/** Tweezers (cursor in the gem step): tip at (x, y). */
export function drawTweezers(g, x, y, s, open = 0) {
  g.save(); g.translate(x, y); g.rotate(-0.45);
  g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = s * 0.13;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * (s * 0.03 + open * s * 0.06), 0); g.lineTo(sx * s * 0.1, -s * 0.9); g.stroke(); }
  g.strokeStyle = '#d6dbe8'; g.lineWidth = s * 0.07;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * (s * 0.03 + open * s * 0.06), 0); g.lineTo(sx * s * 0.1, -s * 0.9); g.stroke(); }
  g.restore();
}

/** The handheld fan; blade hub at (x, y), about s tall. spin = blade angle. */
export function drawFan(g, x, y, s, spin = 0, blur = 0) {
  g.save(); g.translate(x, y);
  const r = s * 0.36;
  if (!drawArt(g, 'prop/nail-fan', 0, s * 0.14, s, s)) {
    g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.035);
    // handle
    g.fillStyle = '#ff9fd0'; ui.roundRect(g, -s * 0.08, r * 0.8, s * 0.16, s * 0.42, s * 0.07); g.fill(); g.stroke();
    g.save(); g.translate(0, r * 0.8 + s * 0.22); drawHeartShape(g, s * 0.1, '#ffffff'); g.restore();
    // cage back
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = '#c8f5e6'; g.fill(); g.stroke();
    // blades
    g.save(); g.rotate(spin);
    for (let i = 0; i < 3; i++) {
      g.rotate(TAU / 3);
      g.beginPath(); g.ellipse(0, -r * 0.48, r * 0.24, r * 0.46, 0.25, 0, TAU); g.fillStyle = '#ff8fd0'; g.fill(); g.stroke();
    }
    g.restore();
    g.beginPath(); g.arc(0, 0, r * 0.16, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
    // cage wires
    g.save(); g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = Math.max(1, s * 0.012);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
    g.restore();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = Math.max(2, s * 0.05); g.strokeStyle = '#6fd6b4'; g.stroke();
    g.lineWidth = Math.max(1.5, s * 0.02); g.strokeStyle = NAVY; g.stroke();
  }
  if (blur > 0) {
    g.globalAlpha = 0.35 * blur;
    g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
  }
  g.restore();
}

export { drawStarShape, drawSparkleShape, drawHeartShape };
