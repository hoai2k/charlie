// Sparkle Bead Shop: beads, charms and patterns.
//
// A bead token is { s: shapeIndex, c: colourIndex }; a charm token is
// { charm: charmIndex }. Every bead is drawn procedurally (glossy gradient,
// highlight, navy outline) into a small cached canvas per shape/colour/size,
// so a string of 16 beads at 8 stations stays cheap. Generated art drops in:
//   prop/bead-atlas    8 columns (BEAD_COLORS order) x 6 rows (SHAPES order)
//   prop/charm-<name>  one image per charm, the jump ring at the top centre
import { art } from '../../engine/art.js';
import { starPath, drawSparkleShape } from '../../engine/emotes.js';
import { TAU, shuffle, pick, randInt, chance } from '../../engine/util.js';

export const NAVY = '#24163f';

export const SHAPES = ['heart', 'star', 'round', 'flower', 'moon', 'gem'];
export const BEAD_COLORS = [
  { name: 'Pink', c: '#ff7ac6', l: '#ffd6ee', d: '#c9479a' },
  { name: 'Red', c: '#ff4d5e', l: '#ffc0c6', d: '#bf2335' },
  { name: 'Orange', c: '#ff9f1c', l: '#ffdca6', d: '#c96d00' },
  { name: 'Yellow', c: '#ffd23f', l: '#fff4b3', d: '#c99600' },
  { name: 'Mint', c: '#4fd98a', l: '#c6f7da', d: '#1f9e57' },
  { name: 'Sky', c: '#4fb8ff', l: '#cdebff', d: '#1c78c9' },
  { name: 'Purple', c: '#a77bff', l: '#e4d6ff', d: '#6f43d2' },
  { name: 'Pearl', c: '#f3ecfa', l: '#ffffff', d: '#b7a9cc' },
];
// Colours used in pattern orders: clearly different from each other (no
// pink next to red, no yellow next to orange, no pearl).
export const PATTERN_COLORS = [0, 3, 4, 5, 6];

export const CHARMS = ['heart', 'star', 'crown', 'butterfly', 'shell', 'cupcake', 'rainbow', 'horn'];

export const sameTok = (a, b) => !!a && !!b && (a.charm ?? -1) === (b.charm ?? -1) && (a.charm != null || (a.s === b.s && a.c === b.c));

// --- bead shapes (paths centred on 0,0; r = the bead's radius) ---------------
function heartPath(g, r) {
  g.beginPath();
  g.moveTo(0, r * 0.95);
  g.bezierCurveTo(-r * 1.3, r * 0.08, -r * 0.98, -r * 1.08, 0, -r * 0.46);
  g.bezierCurveTo(r * 0.98, -r * 1.08, r * 1.3, r * 0.08, 0, r * 0.95);
  g.closePath();
}
function gemPath(g, r) {
  g.beginPath();
  g.moveTo(-r * 0.55, -r * 0.8); g.lineTo(r * 0.55, -r * 0.8); g.lineTo(r, -r * 0.18);
  g.lineTo(0, r * 0.98); g.lineTo(-r, -r * 0.18); g.closePath();
}
function flowerPath(g, r) {
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5, x = Math.cos(a) * r * 0.55, y = Math.sin(a) * r * 0.55;
    g.moveTo(x + r * 0.47, y); g.arc(x, y, r * 0.47, 0, TAU);
  }
}
const MOON_IN = { x: 0.5, y: -0.22, r: 0.78 };

function shapeFill(g, r, col) {
  const gr = g.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.08, 0, 0, r * 1.25);
  gr.addColorStop(0, col.l); gr.addColorStop(0.45, col.c); gr.addColorStop(1, col.d);
  return gr;
}

/** Draw one bead at the origin with radius r (no cache). */
function paintBead(g, shape, col, r) {
  const lw = Math.max(1.1, r * 0.13);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = lw;
  const fill = shapeFill(g, r, col);
  if (shape === 'round') {
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = fill; g.fill(); g.stroke();
    // bead hole
    g.beginPath(); g.ellipse(0, 0, r * 0.16, r * 0.1, 0, 0, TAU); g.fillStyle = 'rgba(36,22,63,0.35)'; g.fill();
  } else if (shape === 'heart') {
    heartPath(g, r); g.fillStyle = fill; g.fill(); g.stroke();
  } else if (shape === 'star') {
    starPath(g, r * 1.16, 0.52); g.fillStyle = fill; g.fill(); g.stroke();
  } else if (shape === 'flower') {
    flowerPath(g, r); g.lineWidth = lw * 2; g.stroke(); g.fillStyle = fill; g.fill();
    g.lineWidth = lw * 0.7;
    g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fillStyle = col === BEAD_COLORS[3] ? '#ff9f1c' : '#fff1a0'; g.fill(); g.stroke();
  } else if (shape === 'moon') {
    // crescent: the outer disc minus an offset disc (outlines on both edges)
    g.save();
    g.beginPath(); g.rect(-r * 2, -r * 2, r * 4, r * 4); g.arc(r * MOON_IN.x, r * MOON_IN.y, r * MOON_IN.r, 0, TAU, true); g.clip();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = fill; g.fill(); g.stroke();
    g.restore();
    g.save();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
    g.beginPath(); g.arc(r * MOON_IN.x, r * MOON_IN.y, r * MOON_IN.r, 0, TAU); g.stroke();
    g.restore();
  } else if (shape === 'gem') {
    gemPath(g, r); g.fillStyle = fill; g.fill(); g.stroke();
    // facets
    g.lineWidth = lw * 0.55; g.strokeStyle = 'rgba(36,22,63,0.45)';
    g.beginPath(); g.moveTo(-r, -r * 0.18); g.lineTo(r, -r * 0.18);
    g.moveTo(-r * 0.55, -r * 0.8); g.lineTo(-r * 0.3, -r * 0.18); g.lineTo(0, r * 0.98); g.lineTo(r * 0.3, -r * 0.18); g.lineTo(r * 0.55, -r * 0.8);
    g.stroke();
    g.beginPath(); g.moveTo(-r * 0.5, -r * 0.76); g.lineTo(r * 0.5, -r * 0.76); g.lineTo(r * 0.28, -r * 0.22); g.lineTo(-r * 0.28, -r * 0.22); g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  }
  // glossy highlight
  const hx = shape === 'moon' ? -r * 0.55 : -r * 0.36, hy = shape === 'moon' ? -r * 0.1 : -r * 0.4;
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath(); g.ellipse(hx, hy, r * 0.24, r * 0.13, -0.7, 0, TAU); g.fill();
  g.beginPath(); g.arc(hx + r * 0.26, hy - r * 0.14, r * 0.06, 0, TAU); g.fill();
}

const cache = new Map();
function beadCanvas(si, ci, px) {
  const key = si * 1000 + ci * 100 + px;
  let c = cache.get(key);
  if (c) return c;
  if (cache.size > 700) cache.clear();
  const half = Math.ceil(px * 1.35) + 2;
  c = document.createElement('canvas');
  c.width = c.height = half * 2;
  const g = c.getContext('2d');
  g.translate(half, half);
  paintBead(g, SHAPES[si], BEAD_COLORS[ci], px);
  c.half = half;
  cache.set(key, c);
  return c;
}

/**
 * Draw a bead (or charm) token centred at x, y with radius r in the current
 * transform. opts: alpha, rot, hang (charms hang below x, y from a ring).
 */
export function drawToken(g, tok, x, y, r, opts = {}) {
  if (!tok) return;
  if (tok.charm != null) { drawCharm(g, tok.charm, x, y, r, opts); return; }
  if (r < 0.6) return;
  g.save();
  if (opts.alpha !== undefined) g.globalAlpha *= opts.alpha;
  g.translate(x, y);
  if (opts.rot) g.rotate(opts.rot);
  const atlas = art('prop/bead-atlas');
  if (atlas) {
    const cw = atlas.width / 8, ch = atlas.height / 6, s = r * 2.3;
    g.drawImage(atlas, tok.c * cw, tok.s * ch, cw, ch, -s / 2, -s / 2, s, s);
    g.restore();
    return;
  }
  const m = g.getTransform(), sy = Math.hypot(m.c, m.d) || 1;
  let px = r * sy;
  px = px < 24 ? Math.max(2, Math.round(px)) : Math.round(px / 3) * 3;
  const c = beadCanvas(tok.s, tok.c, px);
  const k = r / px;
  g.drawImage(c, -c.half * k, -c.half * k, c.width * k, c.height * k);
  g.restore();
}

/** Little four-point twinkle that rides on a bead ("glint"). u: 0..1 life. */
export function drawGlint(g, x, y, r, u) {
  if (u <= 0 || u >= 1) return;
  const k = Math.sin(u * Math.PI);
  g.save(); g.translate(x + r * 0.35, y - r * 0.45); g.rotate(u * 1.5); g.globalAlpha *= k;
  drawSparkleShape(g, r * 1.6 * k, '#ffffff');
  g.restore();
}

// --- charms ---------------------------------------------------------------
const GOLD = { l: '#fff3b0', c: '#ffd23f', d: '#c99600' };
function goldFill(g, r) {
  const gr = g.createLinearGradient(-r, -r, r, r);
  gr.addColorStop(0, GOLD.l); gr.addColorStop(0.5, GOLD.c); gr.addColorStop(1, GOLD.d);
  return gr;
}
function ol(g, r, k = 0.12) { g.lineWidth = Math.max(1, r * k); g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }

/** Charm body centred at the origin, about 2.4 r tall. */
function paintCharm(g, name, r) {
  if (name === 'heart') {
    heartPath(g, r * 1.05); g.fillStyle = goldFill(g, r); g.fill(); ol(g, r);
    heartPath(g, r * 0.62); g.fillStyle = '#ff5fa8'; g.fill(); ol(g, r, 0.07);
  } else if (name === 'star') {
    starPath(g, r * 1.25, 0.5); g.fillStyle = goldFill(g, r); g.fill(); ol(g, r);
  } else if (name === 'crown') {
    const w = r * 1.1;
    g.beginPath(); g.moveTo(-w, r * 0.6); g.lineTo(-w, -r * 0.45); g.lineTo(-w * 0.5, r * 0.05); g.lineTo(0, -r * 0.75);
    g.lineTo(w * 0.5, r * 0.05); g.lineTo(w, -r * 0.45); g.lineTo(w, r * 0.6); g.closePath();
    g.fillStyle = goldFill(g, r); g.fill(); ol(g, r);
    for (const [x, y, c] of [[-w * 0.5, r * 0.35, '#4fb8ff'], [0, r * 0.3, '#ff4d5e'], [w * 0.5, r * 0.35, '#4fd98a']]) { g.beginPath(); g.arc(x, y, r * 0.16, 0, TAU); g.fillStyle = c; g.fill(); ol(g, r, 0.06); }
  } else if (name === 'butterfly') {
    for (const sx of [-1, 1]) {
      g.beginPath(); g.ellipse(sx * r * 0.55, -r * 0.35, r * 0.62, r * 0.5, sx * -0.5, 0, TAU); g.fillStyle = '#ff7ac6'; g.fill(); ol(g, r, 0.09);
      g.beginPath(); g.ellipse(sx * r * 0.45, r * 0.45, r * 0.42, r * 0.36, sx * 0.5, 0, TAU); g.fillStyle = '#a77bff'; g.fill(); ol(g, r, 0.09);
      g.beginPath(); g.arc(sx * r * 0.6, -r * 0.4, r * 0.16, 0, TAU); g.fillStyle = '#fff4b3'; g.fill();
    }
    g.beginPath(); g.ellipse(0, 0, r * 0.13, r * 0.75, 0, 0, TAU); g.fillStyle = '#5a3a7a'; g.fill(); ol(g, r, 0.07);
  } else if (name === 'shell') {
    g.beginPath(); g.moveTo(0, r * 0.85);
    g.lineTo(-r * 1.05, -r * 0.2);
    g.quadraticCurveTo(-r * 0.9, -r * 1.05, 0, -r * 1.0);
    g.quadraticCurveTo(r * 0.9, -r * 1.05, r * 1.05, -r * 0.2); g.closePath();
    const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#ffe3d1'); gr.addColorStop(1, '#ff9fae');
    g.fillStyle = gr; g.fill(); ol(g, r);
    g.lineWidth = Math.max(0.8, r * 0.07); g.strokeStyle = 'rgba(160,60,80,0.55)';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, r * 0.8); g.lineTo(i * r * 0.42, -r * 0.88 + Math.abs(i) * r * 0.15); g.stroke(); }
    g.beginPath(); g.ellipse(0, r * 0.85, r * 0.3, r * 0.16, 0, 0, TAU); g.fillStyle = '#ffb7c0'; g.fill(); ol(g, r, 0.07);
  } else if (name === 'cupcake') {
    g.beginPath(); g.moveTo(-r * 0.7, 0); g.lineTo(r * 0.7, 0); g.lineTo(r * 0.5, r * 0.95); g.lineTo(-r * 0.5, r * 0.95); g.closePath();
    g.fillStyle = '#4fb8ff'; g.fill(); ol(g, r, 0.09);
    g.lineWidth = Math.max(0.8, r * 0.06); g.strokeStyle = 'rgba(255,255,255,0.7)';
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * r * 0.32, r * 0.08); g.lineTo(i * r * 0.24, r * 0.88); g.stroke(); }
    g.beginPath(); g.ellipse(0, -r * 0.12, r * 0.85, r * 0.32, 0, 0, TAU); g.ellipse(0, -r * 0.45, r * 0.55, r * 0.3, 0, 0, TAU);
    g.fillStyle = '#ffc0e3'; ol(g, r, 0.18); g.fill();
    g.beginPath(); g.arc(0, -r * 0.82, r * 0.2, 0, TAU); g.fillStyle = '#ff4d5e'; g.fill(); ol(g, r, 0.07);
  } else if (name === 'rainbow') {
    const cols = ['#ff4d5e', '#ffd23f', '#4fd98a', '#4fb8ff'];
    g.lineCap = 'butt';
    cols.forEach((c, i) => {
      g.beginPath(); g.arc(0, r * 0.45, r * (1.05 - i * 0.22), Math.PI, TAU);
      g.lineWidth = r * 0.24; g.strokeStyle = NAVY; g.stroke();
      g.lineWidth = r * 0.17; g.strokeStyle = c; g.stroke();
    });
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * r * 0.8, r * 0.5, r * 0.3, 0, TAU); g.arc(sx * r * 0.5, r * 0.58, r * 0.24, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
  } else if (name === 'horn') {
    g.beginPath(); g.moveTo(0, -r * 1.15); g.lineTo(r * 0.5, r * 0.8); g.quadraticCurveTo(0, r * 1.0, -r * 0.5, r * 0.8); g.closePath();
    const gr = g.createLinearGradient(-r * 0.5, 0, r * 0.5, 0); gr.addColorStop(0, '#fff8d8'); gr.addColorStop(0.6, '#ffd23f'); gr.addColorStop(1, '#ffb0de');
    g.fillStyle = gr; g.fill(); ol(g, r);
    g.save(); g.clip(); g.lineWidth = Math.max(0.8, r * 0.09); g.strokeStyle = 'rgba(201,150,0,0.8)';
    for (let i = 0; i < 4; i++) { const y = -r * 0.55 + i * r * 0.38; g.beginPath(); g.moveTo(-r * 0.6, y + r * 0.2); g.lineTo(r * 0.6, y - r * 0.08); g.stroke(); }
    g.restore();
  }
}

/** A charm: centred at x, y, or with opts.hang hanging from a ring at x, y. */
export function drawCharm(g, ci, x, y, r, opts = {}) {
  const name = CHARMS[ci];
  g.save();
  if (opts.alpha !== undefined) g.globalAlpha *= opts.alpha;
  g.translate(x, y);
  if (opts.hang) {
    g.rotate(opts.swing || 0);
    g.beginPath(); g.arc(0, r * 0.28, r * 0.26, 0, TAU); g.lineWidth = Math.max(1, r * 0.13); g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = Math.max(0.6, r * 0.07); g.strokeStyle = GOLD.c; g.stroke();
    g.translate(0, r * 1.55);
  }
  const img = art('prop/charm-' + name);
  if (img) {
    const s = Math.min(r * 2.5 / img.width, r * 2.5 / img.height);
    g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
  } else paintCharm(g, name, r);
  g.restore();
}

// --- jewellery types --------------------------------------------------------
export const TYPES = [
  { id: 'bracelet', name: 'Bracelet', slots: 12 },
  { id: 'necklace', name: 'Necklace', slots: 16 },
  { id: 'anklet', name: 'Anklet', slots: 10 },
];

/** A closed loop of beads seen at a slight tilt (bracelets/anklets, shelf rings). */
export function drawLoop(g, toks, x, y, rx, ry, br, { spin = 0, back = true } = {}) {
  const n = Math.max(1, toks.length);
  const items = toks.map((tok, i) => {
    const a = spin + (i / n) * TAU + Math.PI / 2;
    return { tok, x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry, z: Math.sin(a) };
  });
  // the cord
  g.save();
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.lineWidth = Math.max(1, br * 0.35); g.strokeStyle = 'rgba(36,22,63,0.55)'; g.stroke();
  g.restore();
  items.sort((a, b) => a.z - b.z);
  for (const it of items) {
    if (!back && it.z < 0) continue;
    const k = 0.82 + 0.18 * (it.z + 1) / 2;
    if (it.tok.charm != null) drawCharm(g, it.tok.charm, it.x, it.y, br * 0.8 * k, { hang: true });
    else drawToken(g, it.tok, it.x, it.y, br * k, { alpha: it.z < 0 ? 0.85 : 1 });
  }
}

/** A hanging strand (necklace shape): beads along a U from (-w/2,0) to (w/2,0). */
export function strandPoints(n, w, sag) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : 0.08 + (i / (n - 1)) * 0.84;
    const x = (u - 0.5) * w, y = sag * (1 - Math.pow(2 * u - 1, 2));
    pts.push({ x, y });
  }
  return pts;
}

/** Type icon for the design picker and the card (bracelet / necklace / anklet). */
export function drawTypeIcon(g, type, x, y, s, t = 0) {
  const demo = [{ s: 0, c: 0 }, { s: 2, c: 3 }, { s: 1, c: 5 }, { s: 2, c: 3 }, { s: 3, c: 6 }, { s: 2, c: 3 }, { s: 0, c: 0 }, { s: 2, c: 3 }, { s: 1, c: 5 }, { s: 2, c: 3 }];
  g.save(); g.translate(x, y);
  if (type === 'bracelet') {
    drawLoop(g, demo, 0, 0, s * 0.42, s * 0.22, s * 0.085, { spin: t * 0.6 });
  } else if (type === 'necklace') {
    const toks = demo.slice(0, 9), pts = strandPoints(toks.length, s * 0.9, s * 0.45);
    g.beginPath(); g.moveTo(-s * 0.46, -s * 0.22);
    for (const p of pts) g.lineTo(p.x, p.y - s * 0.22);
    g.lineTo(s * 0.46, -s * 0.22); g.lineWidth = Math.max(1, s * 0.03); g.strokeStyle = 'rgba(36,22,63,0.6)'; g.stroke();
    pts.forEach((p, i) => { if (i !== 4) drawToken(g, toks[i], p.x, p.y - s * 0.22, s * 0.075); });
    drawCharm(g, 0, pts[4].x, pts[4].y - s * 0.24, s * 0.1, { hang: true, swing: Math.sin(t * 2) * 0.15 });
  } else {
    // a little leg and foot with an anklet
    g.beginPath(); g.moveTo(-s * 0.12, -s * 0.45); g.lineTo(-s * 0.13, s * 0.18); g.quadraticCurveTo(-s * 0.15, s * 0.36, s * 0.05, s * 0.36);
    g.lineTo(s * 0.34, s * 0.36); g.quadraticCurveTo(s * 0.42, s * 0.22, s * 0.2, s * 0.16); g.lineTo(s * 0.12, s * 0.1); g.lineTo(s * 0.11, -s * 0.45); g.closePath();
    g.fillStyle = '#ffd9c2'; g.fill(); ol(g, s, 0.03);
    drawLoop(g, demo.slice(0, 8), 0, s * 0.02, s * 0.2, s * 0.08, s * 0.06, { spin: t * 0.6 });
  }
  g.restore();
}

// --- pattern orders ----------------------------------------------------------
// Each order: seq (the finished bracelet), given (beads the customer already
// threaded), groups (sizes of the repeats, for the card's little gaps), card
// (how many beads the card shows).
const tok = (s, c) => ({ s, c });

function twoDifferent(list) { const [a, b, c] = shuffle(list); return [a, b, c]; }

export const ROUND_KINDS = [
  ['ab-color', 'ab-shape', 'abc-color', 'aab', 'ab-both', 'abb'],
  ['ab-both', 'aabb', 'grow', 'abc-both', 'abcb', 'aab-both', 'grow'],
];

export function makeOrder(kind) {
  const [ca, cb, cc] = twoDifferent(PATTERN_COLORS);
  const [sa, sb, sc] = twoDifferent([0, 1, 2, 3, 4, 5]);
  const S = pick([0, 1, 2, 3, 4, 5]), C = pick(PATTERN_COLORS);
  let unit, len, grow = null;
  switch (kind) {
    case 'ab-color': unit = [tok(S, ca), tok(S, cb)]; len = 10; break;
    case 'ab-shape': unit = [tok(sa, C), tok(sb, C)]; len = 10; break;
    case 'abc-color': unit = [tok(S, ca), tok(S, cb), tok(S, cc)]; len = 9; break;
    case 'aab': unit = [tok(S, ca), tok(S, ca), tok(S, cb)]; len = 9; break;
    case 'abb': unit = chance(0.5) ? [tok(S, ca), tok(S, cb), tok(S, cb)] : [tok(sa, ca), tok(sb, cb), tok(sb, cb)]; len = 9; break;
    case 'ab-both': unit = [tok(sa, ca), tok(sb, cb)]; len = 10; break;
    case 'aabb': unit = [tok(sa, ca), tok(sa, ca), tok(sb, cb), tok(sb, cb)]; len = 12; break;
    case 'abc-both': unit = [tok(sa, ca), tok(sb, cb), tok(sc, cc)]; len = 12; break;
    case 'abcb': unit = [tok(sa, ca), tok(sb, cb), tok(sc, cc), tok(sb, cb)]; len = 12; break;
    case 'aab-both': unit = [tok(sa, ca), tok(sa, ca), tok(sb, cb)]; len = 12; break;
    case 'grow': grow = [tok(sa, ca), tok(sb, cb)]; break;
    default: unit = [tok(S, ca), tok(S, cb)]; len = 10;
  }
  if (grow) {
    // A B | A B B | A B B B : one more B each time
    const seq = [], groups = [];
    for (let k = 1; k <= 3; k++) { seq.push(grow[0]); for (let j = 0; j < k; j++) seq.push(grow[1]); groups.push(k + 1); }
    return { kind, seq, given: 2, groups, card: 5, grow: true };
  }
  const seq = Array.from({ length: len }, (_, i) => unit[i % unit.length]);
  const groups = Array.from({ length: Math.ceil(len / unit.length) }, () => unit.length);
  const reps = unit.length === 2 ? 3 : 2;
  return { kind, seq, unit: unit.length, given: unit.length === 2 ? 3 : unit.length, groups, card: unit.length * reps };
}

/** Index of the bead that completes a repeat at position i (for sparkles), or false. */
export function endsGroup(order, i) {
  let acc = 0;
  for (const gsz of order.groups) { acc += gsz; if (acc - 1 === i) return true; if (acc > i) return false; }
  return false;
}

/** Tray grid for an order: rows = shapes, columns = colours, with a few look-alikes. */
export function trayFor(order, round) {
  const shapes = [...new Set(order.seq.map((t) => t.s))];
  const colors = [...new Set(order.seq.map((t) => t.c))];
  const wantRows = Math.min(3, Math.max(2, shapes.length + 1));
  const wantCols = Math.min(5, Math.max(3, colors.length + (round > 0 ? 2 : 1)));
  for (const s of shuffle([0, 1, 2, 3, 4, 5])) if (shapes.length < wantRows && !shapes.includes(s)) shapes.push(s);
  for (const c of shuffle(PATTERN_COLORS)) if (colors.length < wantCols && !colors.includes(c)) colors.push(c);
  return { kind: 'beads', rows: shuffle(shapes), cols: shuffle(colors) };
}

export const FREE_TRAY = { kind: 'beads', rows: [0, 1, 2, 3, 4, 5], cols: [0, 1, 2, 3, 4, 5, 6, 7] };
export const CHARM_TRAY = { kind: 'charms', rows: [0, 1], cols: [0, 1, 2, 3] };
export const charmAt = (r, c) => r * 4 + c;

/** A pretty design for a CPU (or a player who ran out of time). */
export function autoDesign(type) {
  const slots = TYPES.find((t) => t.id === type)?.slots || 12;
  const pal = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
  const shapes = shuffle([0, 1, 2, 3, 4, 5]);
  const unit = pick([
    [tok(shapes[0], pal[0]), tok(2, pal[1])],
    [tok(shapes[0], pal[0]), tok(shapes[1], pal[1]), tok(shapes[0], pal[0]), tok(2, 7)],
    [tok(shapes[0], pal[0]), tok(shapes[1], pal[1]), tok(shapes[2], pal[2])],
  ]);
  const len = Math.min(slots - 1, randInt(8, 11));
  const seq = Array.from({ length: len }, (_, i) => unit[i % unit.length]);
  const charm = { charm: randInt(0, CHARMS.length - 1) };
  seq.splice(Math.floor(len / 2), 0, charm);
  if (chance(0.35) && len > 8) { seq.splice(2, 0, { charm: randInt(0, CHARMS.length - 1) }); seq.splice(seq.length - 2, 0, { charm: charm.charm }); }
  return seq.slice(0, slots);
}
