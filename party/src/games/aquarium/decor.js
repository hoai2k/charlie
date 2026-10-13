// Dream Aquarium: decorations that stand on the sand (plants, castles, shells,
// bubblers and night lights). Each is drawn procedurally around its base
// centre (0, 0), up = -y, at world size w × h; optional generated art
// (`prop/aq-<id>-<colour>`, see image-requests.md) replaces the body.
import { art } from '../../engine/art.js';
import * as ui from '../../engine/ui.js';
import { TAU, clamp } from '../../engine/util.js';
import { drawStarShape, drawHeartShape } from '../../engine/emotes.js';
import { RAINBOW } from '../../engine/particles.js';
import { NAVY, shade, glow } from './tank.js';

const C = (n, c, a, extra) => ({ n, c, a, ...extra });

export const DECOR = [
  // plants
  { id: 'kelp', name: 'Seaweed', group: 'plants', w: 120, h: 360, sway: 1, plant: true, hide: true, cpu: 1.4,
    colors: [C('green', '#4fc46a', '#2f9a52'), C('teal', '#2ec4b6', '#1d8f86'), C('plum', '#b0569e', '#7d3a76')] },
  { id: 'fern', name: 'Leafy plant', group: 'plants', w: 200, h: 170, sway: 0.5, plant: true, hide: true, cpu: 1.2,
    colors: [C('green', '#5ccf6f', '#38a052'), C('lime', '#a6e04f', '#76b52e'), C('red', '#e0566e', '#b03650')] },
  { id: 'anemone', name: 'Anemone', group: 'plants', w: 180, h: 150, sway: 0.6, anemone: true, cpu: 1.1,
    colors: [C('pink', '#ff8fc8', '#ffd1e8'), C('purple', '#b48cff', '#e2d4ff'), C('orange', '#ff9f5a', '#ffd9b0')] },
  { id: 'coral', name: 'Coral', group: 'plants', w: 190, h: 190, plant: true, hide: true, cpu: 1.2,
    colors: [C('pink', '#ff7aa8', '#ffc0d6'), C('orange', '#ff9a4d', '#ffd0a8'), C('purple', '#a77bff', '#d9c8ff')] },
  { id: 'seagrass', name: 'Sea grass', group: 'plants', w: 170, h: 150, sway: 0.8, plant: true, cpu: 1,
    colors: [C('green', '#62d06e', '#3c9e4e'), C('gold', '#f2c94c', '#c99a2e'), C('blue', '#5aa9ff', '#3a7ed0')] },
  // castles & houses
  { id: 'castle', name: 'Castle', group: 'castles', w: 330, h: 330, unique: false, hide: true, door: { x: 0, y: -46 }, out: { x: 0, y: -205 }, cpu: 1.3,
    lights: [[0, -205, 60, '#ffd27a'], [-115, -150, 40, '#ffd27a'], [115, -150, 40, '#ffd27a']],
    colors: [C('pink', '#ffb3d1', '#ff6fa8'), C('lilac', '#d6c2ff', '#9b6cff'), C('sky', '#bfe3ff', '#3fa7ff')] },
  { id: 'tower', name: 'Little tower', group: 'castles', w: 150, h: 260, hide: true, door: { x: 0, y: -34 }, out: { x: 0, y: -150 }, cpu: 0.9,
    lights: [[0, -150, 44, '#ffd27a']],
    colors: [C('pink', '#ffb3d1', '#ff6fa8'), C('lilac', '#d6c2ff', '#9b6cff'), C('sky', '#bfe3ff', '#3fa7ff')] },
  { id: 'shellhouse', name: 'Shell house', group: 'castles', w: 230, h: 230, hide: true, door: { x: 20, y: -40 }, out: { x: -40, y: -120 }, cpu: 1,
    lights: [[-40, -120, 46, '#ffd27a'], [20, -50, 36, '#ffd27a']],
    colors: [C('pink', '#ffb8cf', '#ff7aa8'), C('peach', '#ffd2b0', '#ff9f6a'), C('lilac', '#e2d0ff', '#a77bff')] },
  { id: 'arch', name: 'Rock arch', group: 'castles', w: 300, h: 200, through: { y: -62, hw: 70 }, cpu: 0.9,
    colors: [C('grey', '#b9c1d6', '#8e97b0'), C('sand', '#e8c99a', '#c9a06a'), C('pink', '#f4b8cc', '#d98aa6')] },
  { id: 'boat', name: 'Little boat', group: 'castles', w: 340, h: 230, hide: true, cpu: 0.7,
    colors: [C('wood', '#c98a4b', '#fff4e6')] },
  // shells & rocks
  { id: 'scallop', name: 'Scallop shell', group: 'shells', w: 90, h: 80, small: true, cpu: 1,
    colors: [C('peach', '#ffc49a', '#ff9f6a'), C('pink', '#ffb3cf', '#ff7aa8'), C('white', '#fbf3ea', '#e3d3c0')] },
  { id: 'conch', name: 'Spiral shell', group: 'shells', w: 110, h: 80, small: true, cpu: 0.9,
    colors: [C('pink', '#ffc0d0', '#ff7aa8'), C('cream', '#fff0d6', '#e8c99a'), C('lilac', '#e2d0ff', '#b48cff')] },
  { id: 'starfish', name: 'Starfish', group: 'shells', w: 90, h: 80, small: true, cpu: 1.1,
    colors: [C('orange', '#ff9a4d', '#ffd0a8'), C('pink', '#ff7ab0', '#ffc0da'), C('purple', '#a77bff', '#d9c8ff'), C('yellow', '#ffd23f', '#fff0a0')] },
  { id: 'clam', name: 'Pearl clam', group: 'shells', w: 120, h: 90, small: true, cpu: 0.9, pearl: true,
    lights: [[0, -30, 30, '#ffffff']],
    colors: [C('white', '#f6efe6', '#d9cbb8'), C('pink', '#ffc0d6', '#f08cb0'), C('blue', '#bfe0ff', '#86b8f0')] },
  { id: 'pebbles', name: 'Pebbles', group: 'shells', w: 140, h: 60, small: true, cpu: 0.8,
    colors: [C('rainbow', '#ff9f1c', '#ffd23f', { mix: RAINBOW }), C('ocean', '#3fa7ff', '#2ec4b6', { mix: ['#3fa7ff', '#2ec4b6', '#7fd3ff', '#5a7dff', '#a0f0e8'] }), C('candy', '#ff8fc8', '#c9a0ff', { mix: ['#ff8fc8', '#c9a0ff', '#ffc0da', '#ffffff', '#ff6fb1'] })] },
  { id: 'rock', name: 'Big rock', group: 'shells', w: 200, h: 140, hide: true, cpu: 0.8,
    colors: [C('grey', '#a9b2c8', '#7d87a3'), C('sand', '#e2c08f', '#bf9a64'), C('slate', '#7f93c4', '#5d6fa0')] },
  // bubblers
  { id: 'airstone', name: 'Bubble stone', group: 'bubblers', w: 70, h: 40, small: true, bubbler: 'stream', top: -30, cpu: 1,
    colors: [C('blue', '#7fb8ff', '#4f86d6'), C('pink', '#ffa8d0', '#e07aa8')] },
  { id: 'diver', name: 'Diver helmet', group: 'bubblers', w: 140, h: 150, bubbler: 'puff', top: -146, cpu: 1.1,
    colors: [C('brass', '#f0b94a', '#c98a2a'), C('silver', '#d4dbe8', '#9aa6bd')] },
  { id: 'volcano', name: 'Bubble volcano', group: 'bubblers', w: 180, h: 160, bubbler: 'volcano', top: -150, cpu: 1,
    lights: [[0, -150, 70, '#ff8a4d']],
    colors: [C('red', '#a56b5a', '#ff5a36'), C('purple', '#7f6aa8', '#ff6fd0')] },
  { id: 'chest', name: 'Treasure chest', group: 'bubblers', w: 150, h: 120, bubbler: 'chest', top: -90, cpu: 1,
    lights: [[0, -80, 60, '#ffd23f']],
    colors: [C('gold', '#b5733e', '#ffd23f')] },
  // night lights
  { id: 'glowstone', name: 'Glow crystals', group: 'lights', w: 100, h: 120, cpu: 1,
    lights: [[0, -60, 110, null]],
    colors: [C('blue', '#7fd3ff', '#d6f3ff'), C('pink', '#ff9fd6', '#ffe0f2'), C('green', '#7ff0a0', '#dcffe8')] },
  { id: 'lantern', name: 'Lantern', group: 'lights', w: 80, h: 140, cpu: 0.9,
    lights: [[0, -98, 120, '#ffd27a']],
    colors: [C('gold', '#ffcf5a', '#fff3c4')] },
  { id: 'glowshroom', name: 'Glow mushrooms', group: 'lights', w: 120, h: 110, cpu: 1,
    lights: [[-20, -70, 90, null], [34, -50, 60, null]],
    colors: [C('teal', '#4fe0d0', '#c8fff8'), C('pink', '#ff8fd0', '#ffe0f4'), C('purple', '#b48cff', '#efe4ff')] },
  { id: 'moonlight', name: 'Moon lamp', group: 'lights', w: 100, h: 150, cpu: 0.8,
    lights: [[0, -100, 120, '#fff1a0']],
    colors: [C('gold', '#fff1a0', '#ffd23f')] },
];
export const DECOR_BY_ID = Object.fromEntries(DECOR.map((d) => [d.id, d]));

export const artKey = (d, ci) => (d.colors.length > 1 ? `prop/aq-${d.id}-${d.colors[ci % d.colors.length].n}` : `prop/aq-${d.id}`);

// Window / door / glass points measured on the delivered art (world units at
// scale 1, base centre origin). They replace the procedural layout while that
// art is drawn, so night window lights and peekaboo pop-outs sit on the
// painted windows. `scale` enlarges art whose canvas has tall empty headroom.
const castleFit = (y, sx, sy) => ({ lights: [[0, y], [-sx, sy], [sx, sy]], out: { x: 0, y } });
const towerFit = (y) => ({ lights: [[0, y]], out: { x: 0, y } });
const shellFit = (wx, wy, dx, dy) => ({ lights: [[wx, wy], [dx, dy]], out: { x: wx, y: wy }, door: { x: dx, y: dy + 18 } });
const ART_FIT = {
  'prop/aq-castle-pink': castleFit(-166, 120, -96),
  'prop/aq-castle-lilac': castleFit(-173, 118, -103),
  'prop/aq-castle-sky': castleFit(-180, 114, -130),
  'prop/aq-tower-pink': towerFit(-127),
  'prop/aq-tower-lilac': towerFit(-121),
  'prop/aq-tower-sky': towerFit(-124),
  'prop/aq-shellhouse-pink': shellFit(79, -71, 20, -62),
  'prop/aq-shellhouse-peach': shellFit(65, -74, 12, -68),
  'prop/aq-shellhouse-lilac': shellFit(81, -83, 19, -66),
  // The lantern art fills only the lower 69 % of its canvas; its glass centre is at -35 (unscaled).
  'prop/aq-lantern': { scale: 1.3, lights: [[0, -46]], glass: { y: -46, rx: 20, ry: 19 } },
};
/** The measured fit for this item's art, if that art is loaded (else null: procedural layout). */
function artFit(d, it) { const key = artKey(d, it.color); return art(key) ? ART_FIT[key] || null : null; }
/** Door, pop-out window and light points for this item (generated art or procedural). */
export function decorDoor(d, it) { return (artFit(d, it) || {}).door || d.door; }
export function decorOut(d, it) { return (artFit(d, it) || {}).out || d.out; }
function lightPoints(d, it) {
  const fit = artFit(d, it);
  if (!fit || !fit.lights || !d.lights) return d.lights;
  return fit.lights.map(([x, y], i) => { const base = d.lights[Math.min(i, d.lights.length - 1)]; return [x, y, base[2], base[3]]; });
}

// Lava pixels of a generated volcano (bright orange/yellow), re-lit at night.
const lavaCache = new WeakMap();
function lavaOf(img) {
  if (lavaCache.has(img)) return lavaCache.get(img);
  let c = null;
  try {
    c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const im = x.getImageData(0, 0, c.width, c.height), p = im.data;
    for (let i = 0; i < p.length; i += 4) if (!(p[i] >= 190 && p[i] - p[i + 2] >= 90 && p[i + 3] > 128)) p[i + 3] = 0;
    x.putImageData(im, 0, 0);
  } catch (e) { c = null; }
  lavaCache.set(img, c);
  return c;
}

/** Local bounding box (x0, y0, x1, y1) of a decoration at scale 1. */
export function decorBox(d) { return { x0: -d.w / 2, x1: d.w / 2, y0: -d.h, y1: 4 }; }

// -------------------------------------------------------------------------------------------
// drawing helpers
function E(g, x, y, rx, ry, fill, rot = 0, lw = 4) { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = NAVY; g.stroke(); } }
function P(g, pts, fill, lw = 4, close = true) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = NAVY; g.stroke(); } }
function face(g, x, y, s = 1) {
  g.fillStyle = NAVY;
  g.beginPath(); g.arc(x - 9 * s, y, 3.2 * s, 0, TAU); g.arc(x + 9 * s, y, 3.2 * s, 0, TAU); g.fill();
  g.lineWidth = 2.5 * s; g.strokeStyle = NAVY; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y + 3 * s, 5 * s, 0.25, Math.PI - 0.25); g.stroke();
  g.fillStyle = 'rgba(255,120,160,0.5)'; g.beginPath(); g.arc(x - 15 * s, y + 5 * s, 3.5 * s, 0, TAU); g.arc(x + 15 * s, y + 5 * s, 3.5 * s, 0, TAU); g.fill();
}
function sway(env, it, k) { return Math.sin(env.t * 1.3 + it.seed * 9 + k * 0.7) ; }

function drawPearl(g, it) {
  if ((it.clamOpen ?? 1) <= 0.2) return;
  E(g, 0, -30, 14, 14, '#fdfbff', 0, 3);
  E(g, -4, -34, 4, 4, '#ffffff', 0, 0);
  g.fillStyle = 'rgba(200,180,255,0.4)'; g.beginPath(); g.arc(4, -26, 6, 0, TAU); g.fill();
}

/** Authored body fit, shared with its night redraw so silhouettes stay seated. */
function drawGenerated(g, d, it, env, img) {
  g.save();
  if (d.sway) g.transform(1, 0, sway(env, it, 0) * 0.06 * d.sway, 1, 0, 0);
  const s = Math.min(d.w / img.width, d.h / img.height) * ((ART_FIT[artKey(d, it.color)] || {}).scale || 1);
  if (d.id === 'chest' && it.open > 0) {
    // Measured lid/body seam: y=122 on the 300x240 authored chest.
    const seam = Math.round(img.height * 122 / 240), hingeY = (seam - img.height) * s;
    g.save(); g.translate(0, hingeY); g.rotate(-clamp(it.open, 0, 1) * 1.1);
    g.drawImage(img, 0, 0, img.width, seam, -img.width * s / 2, -seam * s, img.width * s, seam * s);
    g.restore();
    // Body goes in front of the opening lid, using the same pixels and placement as closed.
    g.drawImage(img, 0, seam, img.width, img.height - seam, -img.width * s / 2, hingeY, img.width * s, (img.height - seam) * s);
  } else g.drawImage(img, -img.width * s / 2, -img.height * s, img.width * s, img.height * s);
  g.restore();
}

/** Draw a decoration at the current origin (base centre). it: { color, seed, open, born } */
export function drawDecor(g, d, it, env) {
  const col = d.colors[it.color % d.colors.length];
  g.lineJoin = 'round'; g.lineCap = 'round';
  const img = art(artKey(d, it.color));
  if (img) {
    drawGenerated(g, d, it, env, img);
    overlay(g, d, it, env, col, true);
    return;
  }
  const f = DRAW[d.id];
  if (f) f(g, d, it, env, col);
  overlay(g, d, it, env, col);
}

/** Bits the code animates on top of the art too (pearl, chest lid). */
function overlay(g, d, it, env, col, generated = false) {
  if (generated && d.id === 'clam') drawPearl(g, it);
  if (d.id === 'chest' && it.open > 0) {
    // lid flips open with a burst of light
    const o = clamp(it.open, 0, 1);
    if (!generated) {
      g.save(); g.translate(0, -70);
      g.rotate(-o * 1.1);
      ui.roundRect(g, -72, -40, 144, 40, 18); g.fillStyle = col.c; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      g.fillStyle = col.a; g.fillRect(-10, -40, 20, 40); g.strokeRect(-10, -40, 20, 40);
      g.restore();
    }
    g.save(); g.globalAlpha = o; g.fillStyle = '#fff1a0';
    E(g, 0, -70, 60, 10, '#ffe066', 0, 3);
    for (const [x, c] of [[-30, '#ffd23f'], [-8, '#ffffff'], [16, '#ffd23f'], [36, '#ff8fc8']]) E(g, x, -76, 9, 9, c, 0, 2.5);
    g.restore();
  }
}

/** Bright bits drawn over the night shade. */
export function drawDecorGlow(g, d, it, env) {
  const col = d.colors[it.color % d.colors.length];
  const k = env.night;
  const img0 = art(artKey(d, it.color)), fit = artFit(d, it);
  if (img0 && d.id === 'volcano') {
    const lava = lavaOf(img0);
    if (lava) {
      g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = k * (0.7 + 0.3 * Math.sin(env.t * 3));
      drawGenerated(g, d, it, env, lava);
      g.restore();
      return;
    }
  }
  if (fit && fit.glass) {
    const q = fit.glass;
    g.save(); g.globalAlpha = k; E(g, 0, q.y, q.rx, q.ry, '#fff3c4', 0, 0); E(g, 0, q.y, q.rx / 2, q.ry / 2, '#ffffff', 0, 0); g.restore();
    return;
  }
  if (d.id === 'glowstone' || d.id === 'glowshroom' || d.id === 'moonlight') {
    const img = img0;
    if (img) {
      const pulse = d.id === 'glowstone' ? 0.7 + 0.3 * Math.sin(env.t * 2 + it.seed * 7)
        : d.id === 'glowshroom' ? 0.75 + 0.25 * Math.sin(env.t * 1.6 + it.seed * 5) : 1;
      g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = k * 0.45 * pulse;
      drawGenerated(g, d, it, env, img);
      g.restore();
      return;
    }
  }
  if (d.id === 'glowstone') {
    g.save(); g.globalAlpha = k * (0.7 + 0.3 * Math.sin(env.t * 2 + it.seed * 7));
    crystals(g, col.c, col.a, 0); g.restore();
  } else if (d.id === 'glowshroom') {
    g.save(); g.globalAlpha = k * (0.75 + 0.25 * Math.sin(env.t * 1.6 + it.seed * 5));
    shrooms(g, col.c, col.a, true); g.restore();
  } else if (d.id === 'lantern') {
    g.save(); g.globalAlpha = k; E(g, 0, -98, 24, 26, '#fff3c4', 0, 0); E(g, 0, -98, 12, 14, '#ffffff', 0, 0); g.restore();
  } else if (d.id === 'moonlight') {
    g.save(); g.globalAlpha = k; moon(g, '#fff8d0', '#ffffff'); g.restore();
  } else if (d.lights && (d.group === 'castles')) {
    g.save(); g.globalAlpha = k * 0.9;
    for (const [x, y] of lightPoints(d, it)) E(g, x, y, 13, 13, '#ffe9a0', 0, 0);
    g.restore();
  } else if (d.id === 'volcano') {
    g.save(); g.globalAlpha = k * (0.7 + 0.3 * Math.sin(env.t * 3)); lava(g, col.a, 0); g.restore();
  } else if (d.id === 'clam' && (it.clamOpen ?? 1) > 0.2) {
    g.save(); g.globalAlpha = k * 0.8; E(g, 0, -30, 13, 13, '#ffffff', 0, 0); g.restore();
  }
}

/** Light pools under the night shade ('screen' blended). */
export function decorLights(d, it) {
  if (!d.lights) return [];
  const col = d.colors[it.color % d.colors.length];
  if (d.id === 'chest' && !(it.open > 0.2)) return [];
  return lightPoints(d, it).map(([x, y, r, c]) => [x, y, r, c || col.c]);
}

// -------------------------------------------------------------------------------------------
const DRAW = {
  kelp(g, d, it, env, col) {
    for (let k = 0; k < 3; k++) {
      const bx = (k - 1) * 30, h = d.h * [0.86, 1, 0.74][k], w = 26;
      const pts = [], N = 14;
      for (let i = 0; i <= N; i++) {
        const p = i / N, y = -p * h;
        const off = Math.sin(p * 5 + k * 2 + env.t * 1.5 + it.seed * 6) * 12 * p + sway(env, it, k) * 26 * p ** 1.6 * d.sway;
        pts.push([bx + off, y, (1 - p * 0.7) * w / 2]);
      }
      const L = pts.map(([x, y, hw]) => [x - hw, y]), R = pts.map(([x, y, hw]) => [x + hw, y]).reverse();
      P(g, [...L, ...R], k === 1 ? col.c : shade(col.c, -0.08), 4);
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = 2.5; g.strokeStyle = col.a; g.stroke();
      for (let i = 3; i < N; i += 4) { const [x, y, hw] = pts[i]; E(g, x + hw + 6, y, 7, 7, shade(col.c, 0.25), 0, 3); }
    }
  },
  fern(g, d, it, env, col) {
    const leaves = [[-1.25, 0.7], [-0.85, 0.95], [-0.45, 1], [0, 1.05], [0.45, 1], [0.85, 0.92], [1.25, 0.72], [-0.2, 0.8], [0.25, 0.85]];
    leaves.forEach(([a, l], i) => {
      g.save(); g.translate(0, -10); g.rotate(a * 0.9 + sway(env, it, i) * 0.06);
      const L = 150 * l;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-26, -L * 0.5, 0, -L); g.quadraticCurveTo(26, -L * 0.5, 0, 0);
      g.fillStyle = i % 2 ? col.c : shade(col.c, -0.1); g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.moveTo(0, -6); g.lineTo(0, -L + 12); g.lineWidth = 2.5; g.strokeStyle = col.a; g.stroke();
      g.restore();
    });
    E(g, 0, -6, 34, 12, shade(col.a, -0.2), 0, 3.5);
  },
  anemone(g, d, it, env, col) {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1), a = -Math.PI / 2 + (p - 0.5) * 2.4;
      const s = sway(env, it, i) * 10 * (d.sway || 1);
      const x0 = (p - 0.5) * 110, y0 = -66, len = 62 + Math.cos((p - 0.5) * 3) * 22;
      const x1 = x0 + Math.cos(a) * len + s, y1 = y0 + Math.sin(a) * len;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.cos(a) * len * 0.5 - s * 0.5, y0 + Math.sin(a) * len * 0.6, x1, y1);
      g.lineWidth = 20; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 13; g.strokeStyle = col.c; g.stroke();
      E(g, x1, y1, 8, 8, col.a, 0, 3);
    }
    g.beginPath(); g.moveTo(-70, 0); g.quadraticCurveTo(-78, -50, -58, -70); g.lineTo(58, -70); g.quadraticCurveTo(78, -50, 70, 0); g.closePath();
    g.fillStyle = shade(col.c, -0.15); g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-44 + i * 18, -28 - (i % 2) * 12, 5, 0, TAU); g.fill(); }
    face(g, 0, -34, 1.1);
  },
  coral(g, d, it, env, col) {
    E(g, 0, -10, 56, 18, '#c9b8a8', 0, 3.5);
    const br = (x, y, a, len, w, depth) => {
      const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x1, y1);
      g.lineWidth = w + 7; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = w; g.strokeStyle = depth % 2 ? col.c : shade(col.c, -0.08); g.stroke();
      if (depth < 3) { br(x1, y1, a - 0.5, len * 0.72, w * 0.78, depth + 1); br(x1, y1, a + 0.45, len * 0.68, w * 0.78, depth + 1); }
      else { g.beginPath(); g.arc(x1, y1, w * 0.62, 0, TAU); g.fillStyle = col.a; g.fill(); }
    };
    br(-20, -18, -Math.PI / 2 - 0.35, 62, 22, 0);
    br(22, -18, -Math.PI / 2 + 0.3, 56, 20, 1);
  },
  seagrass(g, d, it, env, col) {
    E(g, 0, -4, 50, 10, shade(col.c, -0.3), 0, 3);
    for (let i = 0; i < 9; i++) {
      const p = i / 8, x = (p - 0.5) * 80, h = 90 + Math.sin(i * 2.3) * 30 + 30;
      const s = sway(env, it, i) * 18 * d.sway + (p - 0.5) * 40;
      g.beginPath(); g.moveTo(x - 6, 0); g.quadraticCurveTo(x - 4 + s * 0.3, -h * 0.55, x + s, -h); g.quadraticCurveTo(x + 4 + s * 0.3, -h * 0.55, x + 6, 0); g.closePath();
      g.fillStyle = i % 2 ? col.c : col.a; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    }
  },
  castle(g, d, it, env, col) {
    const wall = col.c, roof = col.a, dark = shade(col.c, -0.15);
    const tower = (cx, w, top) => {
      ui.roundRect(g, cx - w / 2, top, w, -top, 6); g.fillStyle = dark; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      P(g, [[cx - w / 2 - 10, top + 4], [cx, top - 92], [cx + w / 2 + 10, top + 4]], roof, 4);
      g.beginPath(); g.moveTo(cx, top - 92); g.lineTo(cx, top - 122); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      P(g, [[cx, top - 122], [cx + 26, top - 113], [cx, top - 104]], '#ffd23f', 3);
      E(g, cx, top + 50, 13, 15, '#5a4f8f', 0, 3.5);
    };
    tower(-115, 62, -200);
    tower(115, 62, -200);
    // keep with crenellations
    ui.roundRect(g, -80, -250, 160, 250, 6); g.fillStyle = wall; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    for (let i = 0; i < 4; i++) { g.fillStyle = wall; g.fillRect(-80 + i * 46, -272, 26, 24); g.strokeRect(-80 + i * 46, -272, 26, 24); }
    P(g, [[-60, -272], [0, -330], [60, -272]], roof, 4);
    E(g, 0, -205, 16, 18, '#5a4f8f', 0, 3.5);
    // stones
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (const [x, y] of [[-50, -150], [40, -120], [-30, -90], [52, -200], [-58, -230], [20, -170]]) { ui.roundRect(g, x, y, 22, 10, 4); g.fill(); }
    // door
    g.beginPath(); g.moveTo(-34, 0); g.lineTo(-34, -60); g.arc(0, -60, 34, Math.PI, 0); g.lineTo(34, 0); g.closePath();
    g.fillStyle = '#3b3270'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.save(); g.translate(0, -112); drawHeartShape(g, 18, roof); g.restore();
  },
  tower(g, d, it, env, col) {
    ui.roundRect(g, -46, -170, 92, 170, 8); g.fillStyle = col.c; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    P(g, [[-58, -166], [0, -250], [58, -166]], col.a, 4);
    g.beginPath(); g.moveTo(0, -250); g.lineTo(0, -262); g.stroke();
    E(g, 0, -150, 15, 17, '#5a4f8f', 0, 3.5);
    g.beginPath(); g.moveTo(-20, 0); g.lineTo(-20, -40); g.arc(0, -40, 20, Math.PI, 0); g.lineTo(20, 0); g.closePath(); g.fillStyle = '#3b3270'; g.fill(); g.lineWidth = 4; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; for (const [x, y] of [[-30, -100], [10, -80], [-12, -120]]) { ui.roundRect(g, x, y, 20, 9, 4); g.fill(); }
  },
  shellhouse(g, d, it, env, col) {
    // chimney
    ui.roundRect(g, 40, -214, 26, 50, 4); g.fillStyle = shade(col.a, -0.1); g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.moveTo(-110, 0); g.bezierCurveTo(-120, -150, -40, -210, 40, -190); g.bezierCurveTo(110, -170, 120, -60, 105, 0); g.closePath();
    g.fillStyle = col.c; g.fill(); g.lineWidth = 4.5; g.strokeStyle = NAVY; g.stroke();
    // spiral
    g.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * 4.2 * Math.PI, r = 74 * (1 - i / 64); const x = -10 + Math.cos(a) * r * 1.1, y = -110 + Math.sin(a) * r * 0.9; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineWidth = 4; g.strokeStyle = shade(col.a, -0.05); g.stroke();
    // window with flower box
    E(g, -40, -120, 22, 22, '#5a4f8f', 0, 4);
    g.beginPath(); g.moveTo(-40, -142); g.lineTo(-40, -98); g.moveTo(-62, -120); g.lineTo(-18, -120); g.lineWidth = 3; g.strokeStyle = col.c; g.stroke();
    ui.roundRect(g, -68, -98, 56, 14, 4); g.fillStyle = '#c98a4b'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    for (const [x, c] of [[-58, '#ff6fb1'], [-40, '#ffd23f'], [-22, '#ff6fb1']]) E(g, x, -102, 6, 6, c, 0, 2.5);
    // door
    g.beginPath(); g.moveTo(-6, 0); g.lineTo(-6, -50); g.arc(20, -50, 26, Math.PI, 0); g.lineTo(46, 0); g.closePath(); g.fillStyle = col.a; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    E(g, 36, -30, 4, 4, '#ffd23f', 0, 2);
  },
  arch(g, d, it, env, col) {
    g.beginPath(); g.moveTo(-150, 0); g.bezierCurveTo(-160, -150, -60, -200, 0, -200); g.bezierCurveTo(60, -200, 160, -150, 150, 0);
    g.lineTo(78, 0); g.bezierCurveTo(80, -80, 40, -120, 0, -120); g.bezierCurveTo(-40, -120, -80, -80, -78, 0); g.closePath();
    g.fillStyle = col.c; g.fill(); g.lineWidth = 4.5; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-60, -160, 40, 14, -0.5, 0, TAU); g.fill();
    g.fillStyle = col.a; for (const [x, y, r] of [[-110, -60, 14], [100, -90, 10], [-40, -170, 9], [118, -30, 12]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    E(g, 20, -196, 30, 10, '#6fd07a', 0, 3);
    for (const [x, r] of [[-130, 12], [-104, 8], [128, 10]]) E(g, x, -4, r, r * 0.7, shade(col.c, -0.15), 0, 3);
  },
  boat(g, d, it, env, col) {
    g.save(); g.rotate(-0.08);
    g.beginPath(); g.moveTo(-6, -80); g.lineTo(-6, -224); g.lineWidth = 7; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#8a5a2e'; g.stroke();
    P(g, [[0, -220], [110, -100], [0, -100]], '#fff4e6', 4);
    ui.roundRect(g, 30, -150, 30, 22, 4); g.fillStyle = '#ff9ec4'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    P(g, [[-12, -210], [-90, -110], [-12, -110]], '#bfe6ff', 4);
    g.beginPath(); g.moveTo(-170, -90); g.quadraticCurveTo(-150, 10, 0, 6); g.quadraticCurveTo(150, 10, 170, -90); g.closePath();
    g.fillStyle = col.c; g.fill(); g.lineWidth = 4.5; g.strokeStyle = NAVY; g.stroke();
    g.strokeStyle = 'rgba(36,22,63,0.3)'; g.lineWidth = 2.5; for (const y of [-64, -38]) { g.beginPath(); g.moveTo(-150, y); g.quadraticCurveTo(0, y + 30, 150, y); g.stroke(); }
    for (const x of [-90, -30, 30]) E(g, x, -52, 13, 13, '#bfe6ff', 0, 3.5);
    g.save(); g.translate(110, -60); drawHeartShape(g, 22, '#ff6fb1'); g.restore();
    g.restore();
  },
  scallop(g, d, it, env, col) {
    g.beginPath(); g.moveTo(0, -8);
    for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, r = 44; g.lineTo(Math.cos(a) * r, -14 + Math.sin(a) * r * 1.3); }
    g.closePath(); g.fillStyle = col.c; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    g.strokeStyle = col.a; g.lineWidth = 2.5; for (let i = 1; i < 8; i++) { const a = Math.PI + i / 8 * Math.PI; g.beginPath(); g.moveTo(0, -8); g.lineTo(Math.cos(a) * 38, -14 + Math.sin(a) * 50); g.stroke(); }
    P(g, [[-16, 0], [-10, -12], [10, -12], [16, 0]], col.a, 3);
  },
  conch(g, d, it, env, col) {
    g.beginPath(); g.moveTo(-54, -10); g.quadraticCurveTo(-30, -64, 20, -56); g.quadraticCurveTo(56, -40, 52, -6); g.quadraticCurveTo(0, 6, -54, -10); g.closePath();
    g.fillStyle = col.c; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    for (let i = 0; i < 3; i++) P(g, [[-30 + i * 22, -44 + i * 3], [-24 + i * 22, -66 + i * 5], [-16 + i * 22, -48 + i * 3]], shade(col.c, -0.1), 3);
    E(g, 26, -24, 20, 14, col.a, -0.4, 3);
    E(g, 28, -24, 10, 6, shade(col.a, 0.4), -0.4, 0);
  },
  starfish(g, d, it, env, col) {
    g.save(); g.translate(0, -36); g.rotate(0.1 + Math.sin(env.t * 0.8 + it.seed * 5) * 0.03);
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? 17 : 40; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fillStyle = col.c; g.fill(); g.lineWidth = 7; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 2; g.strokeStyle = col.c; g.stroke();
    g.fillStyle = col.a; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU; g.beginPath(); g.arc(Math.cos(a) * 26, Math.sin(a) * 26, 3.5, 0, TAU); g.fill(); }
    face(g, 0, -2, 0.7);
    g.restore();
  },
  clam(g, d, it, env, col) {
    const o = it.clamOpen ?? 1;
    // back half (opens up)
    g.save(); g.translate(0, -26); g.rotate(-0.15 - o * 0.45);
    g.beginPath(); g.moveTo(-56, 0); g.quadraticCurveTo(-50, -56, 0, -60); g.quadraticCurveTo(50, -56, 56, 0); g.closePath();
    g.fillStyle = shade(col.c, -0.06); g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    g.strokeStyle = col.a; g.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 8, -4); g.lineTo(i * 22, -50 + Math.abs(i) * 6); g.stroke(); }
    g.restore();
    drawPearl(g, it);
    // front half
    g.beginPath(); g.moveTo(-58, -26); g.quadraticCurveTo(-52, 6, 0, 2); g.quadraticCurveTo(52, 6, 58, -26); g.quadraticCurveTo(0, -12, -58, -26); g.closePath();
    g.fillStyle = col.c; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    g.strokeStyle = col.a; g.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 22, -18); g.lineTo(i * 10, -2); g.stroke(); }
  },
  pebbles(g, d, it, env, col) {
    const mix = col.mix || [col.c, col.a];
    const pts = [[-50, -10, 16], [-22, -12, 18], [8, -10, 17], [36, -12, 16], [58, -8, 12], [-60, -6, 11], [-36, -30, 15], [-6, -34, 16], [22, -32, 15], [6, -54, 14], [-20, -52, 12], [44, -30, 12]];
    pts.forEach(([x, y, r], i) => { E(g, x, y, r, r * 0.82, mix[i % mix.length], 0, 3); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU); g.fill(); });
  },
  rock(g, d, it, env, col) {
    g.beginPath(); g.moveTo(-96, 0); g.bezierCurveTo(-110, -90, -40, -140, 20, -132); g.bezierCurveTo(90, -126, 110, -60, 98, 0); g.closePath();
    g.fillStyle = col.c; g.fill(); g.lineWidth = 4.5; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = col.a; g.beginPath(); g.moveTo(30, 0); g.bezierCurveTo(80, -20, 100, -50, 98, 0); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-30, -100, 34, 12, -0.4, 0, TAU); g.fill();
    E(g, 14, -128, 36, 11, '#6fd07a', 0.05, 3);
    for (const [x, y] of [[-50, -50], [30, -70], [-10, -30]]) { g.fillStyle = col.a; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
  },
  airstone(g, d, it, env, col) {
    E(g, 0, -4, 34, 7, shade(col.a, -0.2), 0, 3);
    E(g, 0, -18, 26, 16, col.c, 0, 3.5);
    g.fillStyle = col.a; for (const [x, y] of [[-10, -20], [6, -24], [14, -14], [-2, -12], [-16, -12]]) { g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill(); }
  },
  diver(g, d, it, env, col) {
    ui.roundRect(g, -64, -30, 128, 30, 10); g.fillStyle = col.a; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    E(g, 0, -86, 62, 62, col.c, 0, 4.5);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-26, -116, 16, 9, -0.6, 0, TAU); g.fill();
    E(g, 0, -80, 30, 30, col.a, 0, 4); E(g, 0, -80, 22, 22, '#9fd8ff', 0, 3.5);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-8, -88, 6, 0, TAU); g.fill();
    for (const s of [-1, 1]) { E(g, s * 44, -82, 12, 14, col.a, 0, 3.5); E(g, s * 44, -82, 7, 9, '#9fd8ff', 0, 2.5); }
    for (const a of [0.4, 1.2, 1.9, 2.7]) E(g, Math.cos(a + Math.PI) * 46, -86 + Math.sin(a + Math.PI) * 46, 4, 4, shade(col.a, -0.2), 0, 2);
    ui.roundRect(g, -10, -152, 20, 14, 4); g.fillStyle = col.a; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
  },
  volcano(g, d, it, env, col) {
    P(g, [[-90, 0], [-34, -150], [34, -150], [90, 0]], col.c, 4.5);
    E(g, 0, -150, 34, 9, shade(col.c, -0.35), 0, 4);
    lava(g, col.a, 1);
    g.fillStyle = 'rgba(255,255,255,0.18)'; P(g, [[-80, -4], [-30, -144], [-14, -144], [-54, -4]], 'rgba(255,255,255,0.18)', 0);
  },
  chest(g, d, it, env, col) {
    ui.roundRect(g, -70, -72, 140, 72, 8); g.fillStyle = col.c; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = col.a; for (const x of [-56, 44]) { g.fillRect(x, -72, 12, 72); g.strokeRect(x, -72, 12, 72); }
    if (!(it.open > 0)) {
      ui.roundRect(g, -72, -112, 144, 44, 20); g.fillStyle = shade(col.c, 0.1); g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      g.fillStyle = col.a; for (const x of [-56, 44]) { g.fillRect(x, -110, 12, 42); g.strokeRect(x, -110, 12, 42); }
      for (const [x, c] of [[-24, '#ffd23f'], [20, '#ffffff']]) E(g, x, -70, 7, 5, c, 0, 2);
    }
    g.save(); g.translate(0, -62); drawHeartShape(g, 22, '#ffd23f'); g.restore();
  },
  glowstone(g, d, it, env, col) {
    E(g, 0, -12, 46, 16, '#8e97b0', 0, 3.5);
    crystals(g, col.c, col.a, 4);
  },
  lantern(g, d, it, env, col) {
    ui.roundRect(g, -6, -72, 12, 72, 4); g.fillStyle = '#8a5a2e'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    E(g, 0, -4, 24, 7, '#8a5a2e', 0, 3);
    E(g, 0, -98, 26, 28, 'rgba(255,243,196,0.9)', 0, 4);
    g.strokeStyle = col.c; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -126); g.lineTo(0, -70); g.moveTo(-26, -98); g.lineTo(26, -98); g.stroke();
    ui.roundRect(g, -18, -134, 36, 12, 4); g.fillStyle = col.c; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.arc(0, -138, 9, Math.PI, 0); g.lineWidth = 3.5; g.stroke();
  },
  glowshroom(g, d, it, env, col) { shrooms(g, col.c, col.a, false); },
  moonlight(g, d, it, env, col) {
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-20, -30, 20, -50, 0, -70); g.lineWidth = 7; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 3.5; g.strokeStyle = '#c98a4b'; g.stroke();
    E(g, 0, -4, 26, 7, '#c98a4b', 0, 3);
    moon(g, col.c, col.a);
  },
};

function lava(g, c, lw) {
  g.lineCap = 'round';
  for (const [x0, x1, y1] of [[-18, -40, -70], [6, 14, -40], [22, 44, -90]]) {
    g.beginPath(); g.moveTo(x0, -150); g.quadraticCurveTo((x0 + x1) / 2 + 8, (-150 + y1) / 2, x1, y1);
    if (lw) { g.lineWidth = 16; g.strokeStyle = NAVY; g.stroke(); }
    g.lineWidth = 10; g.strokeStyle = c; g.stroke();
  }
  E(g, 0, -151, 26, 6, c, 0, 0);
}
function crystals(g, c, a, lw) {
  for (const [x, h, w, r] of [[-26, 70, 22, -0.3], [20, 64, 22, 0.32], [-2, 104, 28, 0], [36, 40, 16, 0.6]]) {
    g.save(); g.translate(x, -14); g.rotate(r);
    P(g, [[-w / 2, 0], [-w / 2, -h + w * 0.6], [0, -h], [w / 2, -h + w * 0.6], [w / 2, 0]], c, lw);
    g.fillStyle = a; g.globalAlpha *= 0.8; P(g, [[-w / 2 + 4, -4], [-w / 2 + 4, -h + w * 0.7], [-2, -h + 6], [-2, -4]], a, 0);
    g.restore();
  }
}
function shrooms(g, c, a, glowOnly) {
  for (const [x, h, r] of [[-20, 66, 30], [34, 44, 22], [-48, 30, 16]]) {
    if (!glowOnly) { ui.roundRect(g, x - 7, -h, 14, h, 6); g.fillStyle = '#fff4e6'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
    g.beginPath(); g.moveTo(x - r, -h + 4); g.quadraticCurveTo(x - r, -h - r * 1.1, x, -h - r * 1.1); g.quadraticCurveTo(x + r, -h - r * 1.1, x + r, -h + 4); g.closePath();
    g.fillStyle = c; g.fill(); if (!glowOnly) { g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke(); }
    g.fillStyle = a; for (const [dx, dy, rr] of [[-0.45, -0.55, 0.16], [0.3, -0.75, 0.13], [0.5, -0.3, 0.1]]) { g.beginPath(); g.arc(x + dx * r, -h + dy * r, rr * r, 0, TAU); g.fill(); }
  }
}
function moon(g, c, a) {
  g.save(); g.translate(0, -104);
  g.beginPath(); g.arc(0, 0, 36, -2.2, 2.2, false); g.arc(16, 0, 30, 2.0, -2.0, true); g.closePath();
  g.fillStyle = c; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-18, -6, 3, 0, TAU); g.fill();
  g.lineWidth = 2.5; g.beginPath(); g.arc(-16, 6, 5, 0.3, Math.PI - 0.6); g.stroke();
  g.beginPath(); g.moveTo(18, -28); g.lineTo(18, -6); g.lineWidth = 2; g.stroke();
  g.save(); g.translate(18, 0); drawStarShape(g, 12, a); g.restore();
  g.restore();
}

/** Palette icon for a decoration. */
export function drawDecorIcon(g, d, x, y, size, color, env) {
  const s = size / Math.max(d.w, d.h) * 0.95;
  g.save(); g.translate(x, y + d.h * s / 2); g.scale(s, s);
  drawDecor(g, d, { color, seed: 0.3, open: 0 }, env);
  g.restore();
}
