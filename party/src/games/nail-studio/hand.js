// Sparkle Nails: the client's hand, the nails and everything painted
// on them, the stickers and gems, polish bottles, tool icons and the little
// hand fan. All drawing is procedural; the hand, stickers and the fan look up
// generated art first (prop/nail-hand-<tone>, prop/nail-sticker-*, prop/nail-fan).
//
// Hand space: origin at the middle of the palm, fingers point up (-y), units
// are "station units" (the station scales them). The nails are what the
// player paints, so their geometry is exact and shared by drawing and the
// cursor hit test.
import { HAND_ART_NAILS, HAND_ART_SHAPES } from './hand-art-geometry.js';
import { art, drawArt, hasArt } from '../../engine/art.js';
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
// Every client rests a girl's hand on the cushion (the owner asked for a girl's hand,
// never an animal paw). Natural skin tones: SKINS[tone]; the cuff and bracelet take
// the client's own colour. A generated hand picture per tone (prop/nail-hand-<tone>,
// see image-requests.md "nail-studio") replaces the drawn hand when it exists.
export const SKINS = [
  { skin: '#ffe2d0', shade: '#f0bfa4' },   // 0 fair
  { skin: '#f6c8a2', shade: '#dfa27a' },   // 1 light
  { skin: '#dfa577', shade: '#c08055' },   // 2 tan
  { skin: '#b97c52', shade: '#985c37' },   // 3 brown
  { skin: '#8a5838', shade: '#6c4027' },   // 4 deep brown
];
// tone and cuff per client (the rest pick a tone from their id)
const STYLE = {
  glimmer: { tone: 0, cuff: '#7fe3d4' },
  marina: { tone: 0, cuff: '#e8364a' },
  scale: { tone: 0, cuff: '#2a9d8f' },
  'princess-amber': { tone: 1, cuff: '#ff9a1f' },
  snowstar: { tone: 0, cuff: '#39c46a' },
  felicity: { tone: 1, cuff: '#ff8a2a' },
  'kpop-girls': { tone: 1, cuff: '#b04dff' },
};
export function handStyle(id, color = '#ff6fb1') {
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const s = STYLE[id] || { tone: h % SKINS.length, cuff: color };
  return { kind: 'hand', tone: s.tone, ...SKINS[s.tone], cuff: s.cuff };
}

/** The generated hand picture for this style's tone, if it has been delivered. */
const handArtKey = (style) => `prop/nail-hand-${style.tone}`;
export function hasHandArt(style) { return hasArt(handArtKey(style)); }

// --- geometry ----------------------------------------------------------------------
// A right hand seen from the back (thumb on the left), fingers gently spread. Each finger
// tapers from w at its base to TAPER * w at the rounded tip; its nail is a little longer
// than the finger (NAIL_OVER past the fingertip), like grown, shaped nails.
const FINGERS = [
  { bx: -84, by: 76, a: -0.92, len: 104, w: 46, nh: 46 },   // thumb
  { bx: -58, by: 0, a: -0.13, len: 150, w: 44, nh: 54 },
  { bx: -14, by: -8, a: -0.02, len: 166, w: 45, nh: 56 },
  { bx: 30, by: -4, a: 0.09, len: 154, w: 43, nh: 54 },
  { bx: 70, by: 12, a: 0.22, len: 118, w: 38, nh: 46 },
];
const TAPER = 0.88, NAIL_OVER = 7;

/**
 * Finger and nail geometry. `wig` (0..1) wiggles the fingers (showcase and happy
 * moments; not with the hand picture, whose fingers can't move); t is the clock for it.
 */
export function geom(style, wig = 0, t = 0) {
  const fingers = [], nails = [];
  if (wig && hasHandArt(style)) wig = 0;
  FINGERS.forEach((f, i) => {
    const a = f.a + Math.sin(t * 12 + i * 1.7) * 0.08 * wig;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const tx = f.bx + dx * f.len, ty = f.by + dy * f.len, w = f.w, tr = (w * TAPER) / 2;
    fingers.push({ bx: f.bx, by: f.by, tx, ty, a, w, tr, len: f.len });
    const nh = f.nh, nw = w * TAPER * 0.86, d = tr + NAIL_OVER - nh / 2;
    nails.push({ x: tx + dx * d, y: ty + dy * d, w: nw, h: nh, rot: a, i });
  });
  if (hasHandArt(style)) {
    // Native canvas remains untrimmed; painting and hit tests share measured nail beds.
    return { fingers, nails: HAND_ART_NAILS[style.tone].map(n => ({ ...n })) };
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

// The hand picture's own outline, for onHand: its alpha at 4 hand units a cell (the drawn
// fingers and thumb don't follow FINGERS, which is the procedural hand's geometry).
const MASK_N = 128, artMasks = new Map();
function artMask(style) {
  const key = handArtKey(style);
  if (artMasks.has(key)) return artMasks.get(key);
  const img = art(key);
  if (!img || !img.width) return null;
  let m = null;
  try {
    const c = document.createElement('canvas'); c.width = c.height = MASK_N;
    const q = c.getContext('2d', { willReadFrequently: true });
    q.drawImage(img, 0, 0, MASK_N, MASK_N);
    const d = q.getImageData(0, 0, MASK_N, MASK_N).data;
    m = new Uint8Array(MASK_N * MASK_N);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0;
  } catch { m = null; }
  artMasks.set(key, m);
  return m;
}
function onArt(m, x, y) {
  const i = Math.floor(((x + 256) / 512) * MASK_N), j = Math.floor(((y + 256) / 512) * MASK_N);
  return i >= 0 && j >= 0 && i < MASK_N && j < MASK_N && m[j * MASK_N + i] === 1;
}

/** Is hand point (x, y) on the hand (back of the hand, fingers or nails)? */
export function onHand(style, G, x, y, slack = 6) {
  if (nailAt(G, x, y, slack) >= 0) return true;
  const m = hasHandArt(style) ? artMask(style) : null;
  if (m) {
    // the hand picture: its skin, not the wrist under the cuff
    if (y > 166 + slack) return false;
    return onArt(m, x, y) || onArt(m, x - slack, y) || onArt(m, x + slack, y) || onArt(m, x, y - slack) || onArt(m, x, y + slack);
  }
  if (x >= -100 - slack && x <= 96 + slack && y >= -18 - slack && y <= 166 + slack) return true;
  return G.fingers.some((f) => segDist(x, y, f.bx, f.by, f.tx, f.ty) <= f.w / 2 + slack);
}

// --- hand drawing --------------------------------------------------------------------
/** A finger: w wide at the base, tapering to a round tip of radius f.tr. */
function fingerPath(g, f) {
  const dx = Math.sin(f.a), dy = -Math.cos(f.a), nx = -dy, ny = dx, r0 = f.w / 2, r1 = f.tr;
  const mx = f.bx + dx * f.len * 0.55, my = f.by + dy * f.len * 0.55, rm = (r0 + r1) / 2 + 1.5;   // a soft middle knuckle
  g.moveTo(f.bx + nx * r0, f.by + ny * r0);
  g.quadraticCurveTo(mx + nx * rm, my + ny * rm, f.tx + nx * r1, f.ty + ny * r1);
  g.arc(f.tx, f.ty, r1, f.a, f.a - Math.PI, true);
  g.quadraticCurveTo(mx - nx * rm, my - ny * rm, f.bx - nx * r0, f.by - ny * r0);
  g.closePath();
}

/** The back of the hand: knuckles along the top, the thumb's soft mound on the left. */
function palmPath(g) {
  g.moveTo(-60, -20);
  g.quadraticCurveTo(14, -32, 78, -12);
  g.quadraticCurveTo(100, -2, 97, 32);
  g.bezierCurveTo(95, 92, 84, 136, 60, 166);
  g.lineTo(-58, 166);
  g.bezierCurveTo(-80, 140, -104, 118, -104, 70);
  g.bezierCurveTo(-104, 18, -94, -14, -60, -20);
  g.closePath();
}

function wristPath(g) {
  g.moveTo(-62, 140); g.lineTo(-60, 240); g.lineTo(60, 240); g.lineTo(62, 140); g.closePath();
}

const CUFF_Y = 200;

/** The client's sleeve cuff (with a lace edge) and a bead bracelet, over the wrist. */
function drawCuff(g, style, generated = false) {
  g.save();
  g.beginPath();
  if (generated) g.rect(-62, 140, 124, 120); else wristPath(g);
  g.clip();
  // sleeve with a scalloped lace edge
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(-80, 260); g.lineTo(-80, CUFF_Y + 6);
  for (let x = -80; x < 80; x += 16) g.quadraticCurveTo(x + 8, CUFF_Y - 8, x + 16, CUFF_Y + 6);
  g.lineTo(80, 260); g.closePath(); g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.45)'; g.stroke();
  g.fillStyle = style.cuff; g.fillRect(-80, CUFF_Y + 12, 160, 60);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-80, CUFF_Y + 14, 160, 6);
  g.restore();
  // bead bracelet just above the cuff
  const y = CUFF_Y - 20;
  for (let i = 0; i < 7; i++) {
    const x = -48 + i * 16, yy = y + Math.abs(i - 3) * 1.2;
    g.beginPath(); g.arc(x, yy, 7.5, 0, TAU);
    g.fillStyle = i % 2 ? '#ffffff' : style.cuff; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.arc(x - 2.4, yy - 2.6, 2.2, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
  }
}

/** A little gold ring with a pink gem on finger f. */
function drawRing(g, f) {
  const dx = Math.sin(f.a), dy = -Math.cos(f.a), k = 0.3;
  const x = f.bx + dx * f.len * k, y = f.by + dy * f.len * k, r = f.w / 2 + 1;
  g.save(); g.translate(x, y); g.rotate(f.a);
  ui.roundRect(g, -r, -5, r * 2, 10, 5); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-r + 4, -3, r * 2 - 8, 2.5);
  g.beginPath(); g.moveTo(0, -12); g.lineTo(8, -4); g.lineTo(0, 4); g.lineTo(-8, -4); g.closePath();
  g.fillStyle = '#ff6fb1'; g.fill(); g.lineWidth = 2.5; g.stroke();
  g.beginPath(); g.arc(-2, -6, 1.8, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
  g.restore();
}

/**
 * The whole hand (no nails): o.wrist (default true) draws the wrist with a cuff and
 * bracelet in the client's colour; G is the geometry from geom().
 */
export function drawHandBase(g, style, G, o = {}) {
  const wrist = o.wrist !== false;
  if (hasHandArt(style)) {
    // the generated hand: a 1024 x 1024 picture, 2 px per hand unit, palm origin at its centre
    g.save();
    if (!wrist) { g.beginPath(); g.rect(-256, -256, 512, 256 + 176); g.clip(); }
    drawArt(g, handArtKey(style), 0, 0, 512, 512);
    g.restore();
    if (wrist) { g.save(); g.translate(21.5, 0); g.scale(1.16, 1); drawCuff(g, style, true); g.restore(); }
    return;
  }
  const shapes = [];
  if (wrist) shapes.push((q) => wristPath(q));
  shapes.push((q) => palmPath(q));
  for (const f of G.fingers) shapes.push((q) => fingerPath(q, f));
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  // pass 1: one bold navy silhouette
  g.strokeStyle = NAVY; g.lineWidth = 11;
  for (const s of shapes) { g.beginPath(); s(g); g.stroke(); }
  // pass 2: skin with a soft cel shade toward the right side; one hand-space gradient, filled
  // opaque shape by shape, so overlapping shapes don't darken each other
  const sh = g.createLinearGradient(-20, 0, 120, 0);
  sh.addColorStop(0, style.skin); sh.addColorStop(1, mix(style.skin, style.shade, 0.7));
  g.fillStyle = sh;
  for (const s of shapes) { g.beginPath(); s(g); g.fill(); }
  const hl = g.createRadialGradient(-34, 50, 6, -34, 50, 96);
  hl.addColorStop(0, 'rgba(255,255,255,0.34)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.beginPath(); palmPath(g); g.fill();
  // each finger: a light stripe down its left side, a little shade at the tip
  for (const f of G.fingers.slice(1)) {
    const dx = Math.sin(f.a), dy = -Math.cos(f.a), nx = -dy, ny = dx;
    g.save(); g.beginPath(); fingerPath(g, f); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.38)'; g.lineWidth = f.w * 0.2;
    g.beginPath(); g.moveTo(f.bx - nx * f.w * 0.22 + dx * 10, f.by - ny * f.w * 0.22 + dy * 10); g.lineTo(f.tx - nx * f.tr * 0.45, f.ty - ny * f.tr * 0.45); g.stroke();
    g.restore();
  }
  // where the fingers meet the hand, a short crease between neighbours
  g.strokeStyle = style.shade; g.lineWidth = 4;
  for (let i = 1; i < G.fingers.length - 1; i++) {
    const a = G.fingers[i], b = G.fingers[i + 1];
    const mx = (a.bx + b.bx) / 2, my = (a.by + b.by) / 2 - 22, ang = (a.a + b.a) / 2;
    g.beginPath(); g.moveTo(mx + Math.sin(ang) * 6, my - Math.cos(ang) * 6); g.lineTo(mx - Math.sin(ang) * 12, my + Math.cos(ang) * 12); g.stroke();
  }
  // knuckle creases (the middle joint) and the knuckle dimples on the back of the hand
  g.globalAlpha = 0.7;
  for (const f of G.fingers) {
    const dx = Math.sin(f.a), dy = -Math.cos(f.a), nx = -dy, ny = dx;
    const cx = f.bx + dx * f.len * 0.55, cy = f.by + dy * f.len * 0.55, r = f.w * 0.16;
    g.beginPath(); g.moveTo(cx - nx * r, cy - ny * r); g.quadraticCurveTo(cx + dx * 3, cy + dy * 3, cx + nx * r, cy + ny * r); g.stroke();
    if (f !== G.fingers[0]) {
      const kx = f.bx + dx * 4, ky = f.by + dy * 4;
      g.beginPath(); g.moveTo(kx - nx * 7, ky - ny * 7 + 3); g.quadraticCurveTo(kx, ky - 3, kx + nx * 7, ky + ny * 7 + 3); g.stroke();
    }
  }
  g.globalAlpha = 1;
  drawRing(g, G.fingers[3]);
  if (wrist) drawCuff(g, style);
  g.restore();
}

// --- nails ----------------------------------------------------------------------------
function nailPath(g, w, h, shape = null) {
  if (shape != null) {
    const points = HAND_ART_SHAPES[shape];
    g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h));
    g.closePath(); return;
  }
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
  nailPath(g, w, h, n.shape);
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
  nailPath(g, w, h, n.shape);
  g.lineWidth = o.line ?? 4; g.strokeStyle = NAVY; g.stroke();
  if (o.hover) {
    g.save(); g.setLineDash([7, 6]); g.lineDashOffset = -t * 30;
    g.lineWidth = 4; g.strokeStyle = '#ffffff';
    g.scale(1.22, 1.14); nailPath(g, w, h, n.shape); g.stroke();
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
