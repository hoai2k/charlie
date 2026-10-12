// Star Maker art: the glowing "star spirit" creatures that come alive out of a
// finished constellation, the Moon friend (in a nightcap), a single star glow
// sprite, and the CPU constellation templates. Everything is procedural; each
// creature and Moon expression first looks for its generated art key
// (image-requests.md, "star-maker") and falls back to these drawings.
import { art } from '../../engine/art.js';
import { clamp, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';

export const TYPES = [
  { id: 'bunny', name: 'Bunny', move: 'hop', speed: 230 },
  { id: 'kitty', name: 'Kitty', move: 'trot', speed: 200 },
  { id: 'bird', name: 'Bird', move: 'fly', speed: 270 },
  { id: 'butterfly', name: 'Butterfly', move: 'flutter', speed: 150 },
  { id: 'fish', name: 'Fish', move: 'swim', speed: 180 },
  { id: 'whale', name: 'Whale', move: 'glide', speed: 115 },
  { id: 'unicorn', name: 'Unicorn', move: 'gallop', speed: 300 },
  { id: 'dragon', name: 'Dragon', move: 'fly', speed: 230 },
];
export const TYPE = Object.fromEntries(TYPES.map((t, i) => [t.id, i]));

// --- colour helpers ------------------------------------------------------------
export function rgb(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
export function mix(c, k = 0.5, to = [255, 255, 255]) {
  const [r, g, b] = rgb(c);
  return `rgb(${Math.round(r + (to[0] - r) * k)},${Math.round(g + (to[1] - g) * k)},${Math.round(b + (to[2] - b) * k)})`;
}
export function mixHex(c, k = 0.5) {
  const [r, g, b] = rgb(c);
  return '#' + [r, g, b].map((v) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
}
export function rgba(c, a) { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; }

// --- a soft glow sprite per colour (drawn with drawImage: cheap for 100+ stars) --
const glowCache = new Map();
export function glowSprite(color) {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, rgba(color, 0.95)); gr.addColorStop(0.18, rgba(color, 0.55)); gr.addColorStop(0.5, rgba(color, 0.14)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  glowCache.set(color, c);
  return c;
}

/** Four-point twinkle star (the constellation stars). */
export function starShape(g, x, y, r, rot = 0, points = 4, inner = 0.32) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot - Math.PI / 2 + (i / (points * 2)) * TAU, rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

/** A placed star: glow + bright shape + white core. */
export function drawStar(g, x, y, r, color, { tw = 0, alpha = 1, wish = false, ring = null } = {}) {
  g.save();
  g.globalAlpha *= alpha;
  const k = 1 + Math.sin(tw) * 0.12;
  const gs = r * (wish ? 7 : 5.2) * k;
  g.globalCompositeOperation = 'lighter';
  g.drawImage(glowSprite(color), x - gs / 2, y - gs / 2, gs, gs);
  g.globalCompositeOperation = 'source-over';
  if (ring) { g.beginPath(); g.arc(x, y, r * 1.9, 0, TAU); g.lineWidth = 4; g.strokeStyle = ring; g.stroke(); }
  if (wish) {
    starShape(g, x, y, r * 1.55 * k, tw * 0.15, 5, 0.45);
    const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
    gr.addColorStop(0, '#fff6a8'); gr.addColorStop(0.5, '#ffb3e6'); gr.addColorStop(1, '#a8e4ff');
    g.fillStyle = gr; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
  } else {
    starShape(g, x, y, r * 1.35 * k, Math.sin(tw * 0.5) * 0.15);
    g.fillStyle = mix(color, 0.35); g.fill();
  }
  g.beginPath(); g.arc(x, y, r * 0.38, 0, TAU); g.fillStyle = '#ffffff'; g.fill();
  g.restore();
}

// --- shape helpers (unit space: a creature fits roughly in [-1, 1]) ---------------
const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); };
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
/** Closed tapered tube along a quadratic/bezier-ish polyline (tails, legs, necks). */
function tube(g, pts, r0, r1) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const r = r0 + (r1 - r0) * (i / (n - 1));
    L.push([pts[i][0] - dy * r, pts[i][1] + dx * r]); R.push([pts[i][0] + dy * r, pts[i][1] - dx * r]);
  }
  g.beginPath();
  L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  const e = pts[n - 1], ea = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
  g.arc(e[0], e[1], r1, ea, ea + Math.PI, true);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  const s = pts[0], sa = Math.atan2(R[0][1] - s[1], R[0][0] - s[0]);
  g.arc(s[0], s[1], r0, sa, sa + Math.PI, true);
  g.closePath();
}
/** Points along a cubic bezier. */
function bez(p0, p1, p2, p3, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}

// Each creature: (g, ph, P) where P(pathFn, kind) paints one part. Kinds:
// 'body' (glow fill + white outline), 'soft' (lighter fill), 'accent' (owner-tinted
// fill), 'horn' (gold), 'eye' (navy dot), 'shine' (white dot), 'line' (white
// stroke only), 'face' (navy stroke), 'blush' (pink, main pass only).
const SHAPES = {
  bunny(g, ph, P) {
    P(() => circ(g, -0.64, 0.1, 0.18), 'soft');
    P(() => ell(g, -0.3, 0.56, 0.3, 0.12), 'body');
    P(() => ell(g, 0.36, -0.72, 0.11, 0.34, -0.3 + Math.sin(ph * 1.3) * 0.1), 'body');
    P(() => ell(g, -0.05, 0.15, 0.56, 0.43), 'body');
    P(() => ell(g, 0.3, 0.6, 0.17, 0.1), 'body');
    P(() => circ(g, 0.46, -0.22, 0.33), 'body');
    P(() => ell(g, 0.6, -0.76, 0.12, 0.36, 0.2 + Math.sin(ph * 1.3 + 1) * 0.12), 'body');
    P(() => ell(g, 0.6, -0.74, 0.05, 0.24, 0.2 + Math.sin(ph * 1.3 + 1) * 0.12), 'accent');
    P(() => circ(g, 0.6, -0.26, 0.055), 'eye');
    P(() => circ(g, 0.615, -0.28, 0.02), 'shine');
    P(() => circ(g, 0.78, -0.16, 0.045), 'blush');
    P(() => ell(g, 0.56, -0.1, 0.08, 0.045), 'blush');
  },
  kitty(g, ph, P) {
    const sw = Math.sin(ph * 2) * 0.12;
    P(() => tube(g, bez([-0.5, 0.1], [-0.95, 0.05], [-0.95, -0.55 + sw], [-0.62, -0.62 + sw], 10), 0.09, 0.07), 'body');
    P(() => tube(g, [[-0.38, 0.25], [-0.4 - sw, 0.64]], 0.09, 0.08), 'body');
    P(() => tube(g, [[0.28, 0.25], [0.3 + sw, 0.64]], 0.09, 0.08), 'body');
    P(() => ell(g, -0.04, 0.16, 0.56, 0.3), 'body');
    P(() => tube(g, [[-0.2, 0.25], [-0.2 + sw, 0.64]], 0.09, 0.08), 'body');
    P(() => tube(g, [[0.44, 0.25], [0.46 - sw, 0.64]], 0.09, 0.08), 'body');
    P(() => poly(g, [[0.28, -0.36], [0.3, -0.72], [0.5, -0.47]]), 'body');
    P(() => poly(g, [[0.58, -0.48], [0.78, -0.7], [0.82, -0.36]]), 'body');
    P(() => circ(g, 0.55, -0.2, 0.31), 'body');
    P(() => poly(g, [[0.33, -0.4], [0.34, -0.6], [0.45, -0.46]]), 'accent');
    P(() => { g.beginPath(); g.arc(0.46, -0.22, 0.06, Math.PI * 1.1, Math.PI * 1.9); }, 'face');
    P(() => { g.beginPath(); g.arc(0.68, -0.22, 0.06, Math.PI * 1.1, Math.PI * 1.9); }, 'face');
    P(() => poly(g, [[0.55, -0.12], [0.61, -0.12], [0.58, -0.08]]), 'blush');
    P(() => { g.beginPath(); g.moveTo(0.66, -0.07); g.lineTo(0.95, -0.12); g.moveTo(0.66, -0.04); g.lineTo(0.95, 0.0); }, 'line');
  },
  bird(g, ph, P) {
    const f = Math.sin(ph * 3);
    P(() => poly(g, [[-0.4, 0.0], [-0.95, -0.22], [-0.85, 0.08], [-0.95, 0.34], [-0.4, 0.18]]), 'body');
    P(() => ell(g, 0, 0.05, 0.52, 0.38), 'body');
    P(() => ell(g, 0.05, 0.16, 0.32, 0.2), 'soft');
    P(() => circ(g, 0.44, -0.3, 0.27), 'body');
    P(() => poly(g, [[0.66, -0.36], [0.92, -0.27], [0.66, -0.2]]), 'horn');
    P(() => ell(g, -0.12, -0.1 - f * 0.22, 0.4, 0.15 + Math.abs(f) * 0.1, -0.35 - f * 0.55), 'accent');
    P(() => circ(g, 0.5, -0.33, 0.05), 'eye');
    P(() => circ(g, 0.515, -0.35, 0.018), 'shine');
    P(() => ell(g, 0.45, -0.2, 0.07, 0.04), 'blush');
    P(() => { g.beginPath(); g.moveTo(-0.05, 0.42); g.lineTo(-0.08, 0.6); g.moveTo(0.12, 0.42); g.lineTo(0.12, 0.6); }, 'line');
  },
  butterfly(g, ph, P) {
    const fx = 0.3 + 0.7 * Math.abs(Math.cos(ph * 3));
    g.save(); g.scale(fx, 1);
    for (const sx of [-1, 1]) {
      P(() => ell(g, sx * 0.48, -0.3, 0.46, 0.38, sx * -0.45), 'body');
      P(() => ell(g, sx * 0.36, 0.32, 0.3, 0.26, sx * 0.5), 'accent');
      P(() => circ(g, sx * 0.55, -0.32, 0.12), 'soft');
      P(() => circ(g, sx * 0.36, 0.34, 0.07), 'shine');
    }
    g.restore();
    P(() => ell(g, 0, 0.02, 0.08, 0.45), 'body');
    P(() => circ(g, 0, -0.52, 0.13), 'body');
    P(() => { g.beginPath(); g.moveTo(-0.04, -0.62); g.quadraticCurveTo(-0.15, -0.85, -0.28, -0.9); g.moveTo(0.04, -0.62); g.quadraticCurveTo(0.15, -0.85, 0.28, -0.9); }, 'line');
    P(() => circ(g, -0.28, -0.9, 0.045), 'shine');
    P(() => circ(g, 0.28, -0.9, 0.045), 'shine');
    P(() => circ(g, -0.045, -0.53, 0.025), 'eye');
    P(() => circ(g, 0.045, -0.53, 0.025), 'eye');
  },
  fish(g, ph, P) {
    const w = Math.sin(ph * 4) * 0.14;
    P(() => poly(g, [[-0.45, 0], [-0.95, -0.42 + w], [-0.82, 0 + w], [-0.95, 0.42 + w]]), 'accent');
    P(() => { g.beginPath(); g.moveTo(-0.25, -0.3); g.quadraticCurveTo(-0.05, -0.75, 0.28, -0.32); g.closePath(); }, 'accent');
    P(() => ell(g, 0.05, 0, 0.6, 0.4), 'body');
    P(() => ell(g, 0.12, 0.15, 0.36, 0.17), 'soft');
    P(() => ell(g, -0.02, 0.1, 0.16, 0.08, 0.5 + w * 2), 'accent');
    P(() => { g.beginPath(); for (const x of [-0.25, -0.05]) { g.moveTo(x, -0.2); g.quadraticCurveTo(x + 0.12, 0, x, 0.2); } }, 'line');
    P(() => circ(g, 0.4, -0.08, 0.085), 'eye');
    P(() => circ(g, 0.42, -0.11, 0.03), 'shine');
    P(() => { g.beginPath(); g.arc(0.52, 0.08, 0.08, 0.2, Math.PI * 0.8); }, 'face');
  },
  whale(g, ph, P) {
    const w = Math.sin(ph * 1.6) * 0.18;
    P(() => tube(g, bez([-0.35, 0.05], [-0.65, 0.05], [-0.7, -0.2], [-0.8, -0.38 + w * 0.5], 8), 0.2, 0.06), 'body');
    P(() => ell(g, -0.92, -0.48 + w * 0.5, 0.2, 0.08, -0.5 + w), 'body');
    P(() => ell(g, -0.74, -0.6 + w * 0.5, 0.2, 0.08, 1.0 + w), 'body');
    P(() => ell(g, 0.1, 0.04, 0.74, 0.44), 'body');
    P(() => { g.beginPath(); g.ellipse(0.12, 0.12, 0.6, 0.34, 0, 0.15, Math.PI - 0.15); g.closePath(); }, 'soft');
    P(() => ell(g, 0.15, 0.32, 0.2, 0.07, 0.6 + Math.sin(ph * 2) * 0.3), 'accent');
    P(() => { g.beginPath(); for (const x of [-0.05, 0.15, 0.35]) { g.moveTo(x, 0.22); g.lineTo(x + 0.06, 0.38); } }, 'line');
    P(() => circ(g, 0.56, -0.02, 0.06), 'eye');
    P(() => circ(g, 0.575, -0.04, 0.022), 'shine');
    P(() => { g.beginPath(); g.arc(0.6, 0.08, 0.14, 0.3, Math.PI * 0.75); }, 'face');
    P(() => ell(g, 0.5, 0.12, 0.08, 0.045), 'blush');
  },
  unicorn(g, ph, P) {
    const sw = Math.sin(ph * 3) * 0.2;
    P(() => tube(g, bez([-0.5, -0.05], [-0.8, -0.15], [-0.85, 0.25 + sw * 0.4], [-0.98, 0.45], 10), 0.11, 0.05), 'accent');
    P(() => tube(g, [[-0.42, 0.2], [-0.48 - sw, 0.74]], 0.075, 0.065), 'body');
    P(() => tube(g, [[0.28, 0.2], [0.34 + sw, 0.74]], 0.075, 0.065), 'body');
    P(() => ell(g, -0.06, 0.1, 0.54, 0.29), 'body');
    P(() => tube(g, [[-0.25, 0.2], [-0.25 + sw, 0.74]], 0.075, 0.065), 'body');
    P(() => tube(g, [[0.42, 0.2], [0.44 - sw, 0.74]], 0.075, 0.065), 'body');
    P(() => tube(g, [[0.3, 0.0], [0.42, -0.25], [0.5, -0.42]], 0.17, 0.12), 'body');
    P(() => ell(g, 0.62, -0.46, 0.24, 0.15, 0.4), 'body');
    P(() => poly(g, [[0.48, -0.58], [0.6, -0.6], [0.66, -0.98]]), 'horn');
    P(() => poly(g, [[0.42, -0.58], [0.4, -0.76], [0.5, -0.6]]), 'body');
    P(() => { g.beginPath(); for (let i = 0; i < 4; i++) g.arc(0.38 - i * 0.07, -0.5 + i * 0.15, 0.09, 0, TAU); }, 'accent');
    P(() => { g.beginPath(); g.arc(0.62, -0.5, 0.05, Math.PI * 1.1, Math.PI * 1.9); }, 'face');
    P(() => ell(g, 0.7, -0.38, 0.06, 0.035), 'blush');
  },
  dragon(g, ph, P) {
    const f = Math.sin(ph * 2.6), sw = Math.sin(ph * 1.5) * 0.1;
    const wing = (dx) => P(() => poly(g, [[dx - 0.05, -0.15], [dx - 0.25, -0.62 - f * 0.25], [dx - 0.4, -0.45 - f * 0.15], [dx - 0.55, -0.5 - f * 0.2], [dx - 0.55, -0.2 - f * 0.05], [dx - 0.3, -0.05]]), 'accent');
    wing(0.12);
    P(() => tube(g, bez([-0.4, 0.2], [-0.8, 0.3], [-0.95, 0.05 + sw], [-0.82, -0.12 + sw], 10), 0.17, 0.05), 'body');
    P(() => poly(g, [[-0.82, -0.1 + sw], [-0.98, -0.24 + sw], [-0.76, -0.24 + sw]]), 'accent');
    P(() => ell(g, -0.2, 0.52, 0.14, 0.1), 'body');
    P(() => ell(g, 0, 0.12, 0.48, 0.37), 'body');
    P(() => ell(g, 0.08, 0.22, 0.27, 0.22), 'soft');
    P(() => { g.beginPath(); for (const [x, y] of [[-0.35, -0.12], [-0.12, -0.24], [0.1, -0.24]]) { g.moveTo(x - 0.08, y + 0.04); g.lineTo(x, y - 0.12); g.lineTo(x + 0.08, y + 0.04); } }, 'accent');
    P(() => ell(g, 0.22, 0.52, 0.14, 0.1), 'body');
    P(() => poly(g, [[0.36, -0.48], [0.3, -0.72], [0.46, -0.52]]), 'horn');
    P(() => poly(g, [[0.52, -0.52], [0.56, -0.76], [0.64, -0.5]]), 'horn');
    P(() => ell(g, 0.48, -0.28, 0.3, 0.26), 'body');
    P(() => ell(g, 0.74, -0.2, 0.17, 0.13), 'body');
    wing(0.32);
    P(() => circ(g, 0.52, -0.33, 0.055), 'eye');
    P(() => circ(g, 0.535, -0.35, 0.02), 'shine');
    P(() => circ(g, 0.84, -0.24, 0.022), 'eye');
    P(() => { g.beginPath(); g.arc(0.7, -0.18, 0.1, 0.4, Math.PI * 0.7); }, 'face');
    P(() => ell(g, 0.5, -0.16, 0.07, 0.04), 'blush');
  },
};

/**
 * Draw a star spirit centred at (x, y), `size` = half-size in px, facing ±1.
 * o: { ph (animation phase), color (owner colour), alpha, rot, sx, sy (squash) }
 */
export function drawCreature(g, type, x, y, size, o = {}) {
  const { ph = 0, color = '#c9a8ff', alpha = 1, facing = 1, rot = 0, sx = 1, sy = 1, halo = true } = o;
  if (alpha <= 0.01) return;
  g.save();
  g.translate(x, y);
  g.globalAlpha *= alpha;
  if (halo) {
    g.globalCompositeOperation = 'lighter';
    const hs = size * 3.2;
    g.globalAlpha *= 0.55;
    g.drawImage(glowSprite(color), -hs / 2, -hs / 2, hs, hs);
    g.globalAlpha /= 0.55;
    g.globalCompositeOperation = 'source-over';
  }
  g.rotate(rot);
  g.scale(facing * sx, sy);
  const img = art('prop/star-maker-' + type);
  if (img) {
    const s = (size * 2) / Math.max(img.width, img.height);
    g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
    g.restore();
    return;
  }
  g.scale(size, size);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const shape = SHAPES[type] || SHAPES.bunny;
  const px = 1 / size;
  // pass 1: soft wide glow strokes
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = rgba(color, 0.22);
  g.lineWidth = Math.max(0.05, 15 * px);
  shape(g, ph, (fn, kind) => { if (kind === 'eye' || kind === 'shine' || kind === 'blush' || kind === 'face') return; fn(); g.stroke(); });
  g.restore();
  // pass 2: translucent fills, bright outlines and the face
  const body = rgba(mixHex(color, 0.62), 0.5);
  const soft = 'rgba(255,255,255,0.32)', accent = rgba(mixHex(color, 0.3), 0.62);
  const lw = Math.max(0.012, 3.4 * px);
  shape(g, ph, (fn, kind) => {
    fn();
    switch (kind) {
      case 'eye': g.fillStyle = '#2b2160'; g.fill(); return;
      case 'shine': g.fillStyle = '#ffffff'; g.fill(); return;
      case 'blush': g.fillStyle = 'rgba(255,140,190,0.75)'; g.fill(); return;
      case 'face': g.lineWidth = lw * 1.1; g.strokeStyle = '#2b2160'; g.stroke(); return;
      case 'line': g.lineWidth = lw * 0.8; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke(); return;
      case 'horn': g.fillStyle = 'rgba(255,226,122,0.85)'; g.fill(); break;
      case 'soft': g.fillStyle = soft; g.fill(); break;
      case 'accent': g.fillStyle = accent; g.fill(); break;
      default: g.fillStyle = body; g.fill();
    }
    g.lineWidth = lw; g.strokeStyle = '#ffffff'; g.stroke();
  });
  g.restore();
}

// --- the Moon friend -----------------------------------------------------------------
/** expr: 'happy' | 'wow' | 'wink' | 'sleepy'. */
export function drawMoon(g, x, y, R, expr = 'happy', t = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(Math.sin(t * 0.8) * 0.05);
  // halo
  g.save(); g.globalCompositeOperation = 'lighter';
  const hs = R * 5; g.globalAlpha = 0.5; g.drawImage(glowSprite('#fff1b0'), -hs / 2, -hs / 2, hs, hs);
  g.restore();
  const key = expr === 'happy' ? 'prop/star-maker-moon' : 'prop/star-maker-moon-' + expr;
  const img = art(key) || art('prop/star-maker-moon');
  if (img) {
    const s = (R * 2.6) / Math.max(img.width, img.height);
    g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
    g.restore();
    return;
  }
  g.lineJoin = 'round'; g.lineCap = 'round';
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
  gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.7, '#ffe9a0'); gr.addColorStop(1, '#ffd86e');
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = gr; g.fill();
  g.lineWidth = Math.max(3, R * 0.06); g.strokeStyle = NAVY; g.stroke();
  // craters
  g.fillStyle = 'rgba(214,170,80,0.35)';
  for (const [cx, cy, cr] of [[-0.5, 0.35, 0.14], [0.45, 0.45, 0.1], [0.55, -0.15, 0.08], [-0.15, 0.62, 0.07]]) { g.beginPath(); g.arc(cx * R, cy * R, cr * R, 0, TAU); g.fill(); }
  // face
  g.strokeStyle = NAVY; g.fillStyle = NAVY; g.lineWidth = Math.max(3, R * 0.07);
  const ey = -R * 0.08, ex = R * 0.32;
  const closedEye = (cx) => { g.beginPath(); g.arc(cx, ey, R * 0.12, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); };
  const openEye = (cx, big) => { g.beginPath(); g.arc(cx, ey, R * (big ? 0.13 : 0.1), 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + R * 0.04, ey - R * 0.05, R * 0.045, 0, TAU); g.fill(); g.fillStyle = NAVY; };
  const sleepyEye = (cx) => { g.beginPath(); g.moveTo(cx - R * 0.12, ey); g.quadraticCurveTo(cx, ey + R * 0.08, cx + R * 0.12, ey); g.stroke(); };
  if (expr === 'wow') { openEye(-ex, true); openEye(ex, true); }
  else if (expr === 'wink') { openEye(-ex); closedEye(ex); }
  else if (expr === 'sleepy') { sleepyEye(-ex); sleepyEye(ex); }
  else { closedEye(-ex); closedEye(ex); }
  g.fillStyle = 'rgba(255,120,170,0.55)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * R * 0.55, R * 0.16, R * 0.15, R * 0.09, 0, 0, TAU); g.fill(); }
  g.fillStyle = NAVY;
  if (expr === 'wow') { g.beginPath(); g.ellipse(0, R * 0.3, R * 0.11, R * 0.14, 0, 0, TAU); g.fill(); }
  else if (expr === 'sleepy') { g.beginPath(); g.ellipse(0, R * 0.3, R * 0.07, R * 0.05, 0, 0, TAU); g.fill(); }
  else { g.beginPath(); g.arc(0, R * 0.2, R * 0.2, 0.2, Math.PI - 0.2); g.stroke(); }
  // nightcap
  g.save();
  const cap = () => {
  g.beginPath();
  g.moveTo(-R * 0.82, -R * 0.5);
  g.quadraticCurveTo(-R * 0.1, -R * 1.25, R * 0.62, -R * 0.82);
  g.quadraticCurveTo(R * 1.2, -R * 0.75 + Math.sin(t * 1.3) * R * 0.05, R * 1.3, -R * 0.15 + Math.sin(t * 1.3) * R * 0.08);
  g.quadraticCurveTo(R * 0.9, -R * 0.55, R * 0.62, -R * 0.42);
  g.quadraticCurveTo(-R * 0.1, -R * 0.62, -R * 0.82, -R * 0.5);
  g.closePath();
  };
  cap();
  g.fillStyle = '#ff8fc8'; g.fill();
  g.save(); g.clip(); g.strokeStyle = '#ffffff'; g.lineWidth = R * 0.14;
  for (let k = -1; k < 6; k++) { g.beginPath(); g.moveTo(-R * 0.6 + k * R * 0.36, -R * 1.3); g.lineTo(-R * 0.9 + k * R * 0.36, -R * 0.3); g.stroke(); }
  g.restore();
  cap();
  g.lineWidth = Math.max(3, R * 0.06); g.strokeStyle = NAVY; g.stroke();
  g.beginPath(); g.arc(R * 1.3, -R * 0.12 + Math.sin(t * 1.3) * R * 0.08, R * 0.16, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
  g.restore();
  g.restore();
}

// --- CPU constellation templates --------------------------------------------------------
// pts in unit space (facing right); `path` is the order a CPU visits the stars:
// a new index places a star (joined to the previous one), a repeated index taps
// that star (joins it up), 'x' lifts the pen (start a new line).
export const TEMPLATES = {
  bunny: { pts: [[0.32, -1.0], [0.62, -0.98], [0.45, -0.45], [0.82, -0.2], [0.1, 0.0], [-0.6, 0.05], [-0.3, 0.55], [0.4, 0.55]], path: [0, 2, 1, 'x', 2, 3, 'x', 2, 4, 5, 6, 7, 4] },
  kitty: { pts: [[0.35, -0.75], [0.55, -0.45], [0.78, -0.75], [0.8, -0.15], [0.3, 0.05], [-0.5, 0.05], [-0.9, -0.5], [-0.45, 0.6], [0.35, 0.6]], path: [0, 1, 2, 3, 4, 0, 'x', 4, 5, 6, 'x', 5, 7, 'x', 4, 8] },
  bird: { pts: [[0.95, -0.28], [0.45, -0.55], [0.05, -0.85], [-0.35, -0.1], [-0.95, -0.2], [-0.95, 0.3], [0.2, 0.4]], path: [0, 1, 2, 3, 4, 5, 3, 'x', 1, 6, 3] },
  butterfly: { pts: [[0, -0.55], [-0.85, -0.75], [-0.6, 0.0], [-0.65, 0.6], [0, 0.4], [0.65, 0.6], [0.6, 0.0], [0.85, -0.75]], path: [0, 1, 2, 0, 'x', 2, 3, 4, 5, 6, 0, 7, 6] },
  fish: { pts: [[0.85, 0.0], [0.2, -0.45], [-0.45, 0.0], [0.2, 0.45], [-0.95, -0.45], [-0.95, 0.45]], path: [0, 1, 2, 3, 0, 'x', 2, 4, 5, 2] },
  whale: { pts: [[0.85, 0.05], [0.4, -0.45], [-0.3, -0.3], [-0.8, -0.45], [-0.95, -0.75], [-0.6, -0.75], [-0.3, 0.35], [0.4, 0.45]], path: [0, 1, 2, 3, 4, 'x', 3, 5, 'x', 2, 6, 7, 0] },
  unicorn: { pts: [[0.75, -1.0], [0.65, -0.5], [0.3, -0.1], [-0.5, -0.05], [-0.95, 0.4], [-0.45, 0.75], [0.35, 0.75], [0.95, -0.35]], path: [0, 1, 7, 'x', 1, 2, 3, 4, 'x', 3, 5, 'x', 2, 6] },
  dragon: { pts: [[0.95, -0.25], [0.5, -0.6], [0.2, -0.15], [-0.15, -0.95], [-0.4, -0.2], [-0.95, 0.15], [-0.2, 0.5], [0.4, 0.45]], path: [0, 1, 2, 3, 4, 2, 'x', 4, 5, 'x', 4, 6, 7, 2] },
};

/** Bounding box of a list of {x, y}. */
export function bbox(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of list) { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y); }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}
export const creatureSize = (b) => clamp(Math.max(b.w, b.h) * 0.55, 70, 175);
