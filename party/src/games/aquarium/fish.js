// Dream Aquarium: fish kinds, names, drawing and how they swim.
//
// A fish is a plain object (see makeFish). Its personality comes from its
// kind: goldfish are curious and come to look at taps; clownfish live by an
// anemone; angelfish glide; puffers puff up when startled; bettas swish their
// big fins slowly near the top; neon tetras zoom about as a school of three;
// seahorses hold on to plants; jellyfish pulse up and drift down.
// The game sets `f.state` for eating, looking, fleeing, hiding and playing;
// updateFish() moves the fish for whatever state it is in.
import { art } from '../../engine/art.js';
import { drawEmote } from '../../engine/emotes.js';
import { RAINBOW } from '../../engine/particles.js';
import { TAU, clamp, lerp, damp, rand, pick, chance, shuffle } from '../../engine/util.js';
import { NAVY, WATER, shade, yOfDepth, fishScale } from './tank.js';

const F = (n, c, a, extra) => ({ n, c, a, ...extra });
export const KINDS = [
  { id: 'goldfish', name: 'Goldfish', w: 110, h: 80, speed: 115, band: [0.15, 0.85], curious: 0.85, wig: 9, cpu: 1.4,
    colors: [F('orange', '#ff9a3c', '#ffc27a'), F('gold', '#ffd23f', '#fff0a0'), F('calico', '#fff4ea', '#ffd0b0', { spots: ['#ff9a3c', '#3b3270'] }), F('red', '#ff5a5a', '#ffb0a0')] },
  { id: 'clownfish', name: 'Clownfish', w: 100, h: 64, speed: 150, band: [0.4, 1], curious: 0.55, wig: 13, cpu: 1.3,
    colors: [F('orange', '#ff8a2a', '#ffb070'), F('pink', '#ff7ab0', '#ffb8d6'), F('purple', '#a77bff', '#d0b8ff'), F('blue', '#3fa7ff', '#9fd3ff')] },
  { id: 'angelfish', name: 'Angelfish', w: 110, h: 130, speed: 72, band: [0.05, 0.6], curious: 0.45, wig: 5, cpu: 1,
    colors: [F('lilac', '#c9a8ff', '#9b6cff'), F('gold', '#ffd23f', '#e8a020'), F('sky', '#8fd3ff', '#3f8fe0'), F('pink', '#ffb3d1', '#ff6fa8')] },
  { id: 'puffer', name: 'Pufferfish', w: 100, h: 84, speed: 55, band: [0.3, 0.9], curious: 0.6, wig: 10, cpu: 1.1,
    colors: [F('yellow', '#ffe066', '#e0a020'), F('sky', '#9fd8ff', '#5a9fe0'), F('pink', '#ffb8d6', '#e57aa8'), F('mint', '#a6f0c8', '#4fc490')] },
  { id: 'betta', name: 'Betta fish', w: 130, h: 110, speed: 62, band: [0.02, 0.5], curious: 0.7, wig: 4, cpu: 1,
    colors: [F('blue', '#4f6dff', '#9fb4ff'), F('red', '#ff4d5e', '#ffb0a0'), F('purple', '#9b5cff', '#e0b0ff'), F('pink', '#ff6fc8', '#ffd0f0')] },
  { id: 'tetra', name: 'Neon tetras', w: 54, h: 26, speed: 175, band: [0.15, 0.8], curious: 0.3, wig: 16, school: 3, cpu: 1,
    colors: [F('neon', '#cfe4ff', '#3ff0ff', { red: '#ff4d6d' }), F('rainbow', '#ffffff', '#ff6fd0', { rainbow: true }), F('pink', '#ffd0e6', '#ff6fb1'), F('gold', '#fff0b0', '#ffb020')] },
  { id: 'seahorse', name: 'Seahorse', w: 60, h: 120, speed: 38, band: [0.3, 0.95], curious: 0.3, wig: 6, upright: true, cpu: 0.9,
    colors: [F('yellow', '#ffd23f', '#ffb020'), F('pink', '#ff9ec4', '#ff6fa8'), F('orange', '#ff9a4d', '#e8742a'), F('purple', '#b48cff', '#8a5ce0')] },
  { id: 'jellyfish', name: 'Jellyfish', w: 90, h: 140, speed: 34, band: [0.02, 0.65], curious: 0.1, wig: 3, jelly: true, cpu: 0.8,
    colors: [F('pink', '#ffb3d9', '#ff7ab8'), F('lilac', '#d6c2ff', '#a98bff'), F('blue', '#a8dcff', '#6fb8ff'), F('peach', '#ffd0b0', '#ff9f7a')] },
];
export const KIND = Object.fromEntries(KINDS.map((k) => [k.id, k]));

const NAMES = ['Bubbles', 'Finn', 'Coral', 'Pearl', 'Splash', 'Sunny', 'Wiggles', 'Sprinkles', 'Marshmallow', 'Pickle', 'Noodle', 'Blossom',
  'Sparkle', 'Ziggy', 'Peaches', 'Jellybean', 'Biscuit', 'Captain', 'Muffin', 'Twinkle', 'Squishy', 'Ripple', 'Tango', 'Lulu', 'Mochi',
  'Pebble', 'Doodle', 'Cupcake', 'Skipper', 'Daisy', 'Rosie', 'Ollie', 'Toffee', 'Pip', 'Bloop', 'Gumdrop', 'Waffles', 'Nugget', 'Poppy', 'Zoom'];
const KIND_NAMES = {
  goldfish: ['Goldie', 'Nugget', 'Sunny'], clownfish: ['Giggles', 'Stripes', 'Chuckles'], angelfish: ['Angel', 'Ballerina', 'Grace'],
  puffer: ['Puffy', 'Balloon', 'Puffball'], betta: ['Princess', 'Swishy', 'Duchess'], seahorse: ['Prancer', 'Curly', 'Pony'],
  jellyfish: ['Wobbles', 'Jiggles', 'Jelly'], tetra: ['The Zoomers', 'The Sparkle Squad', 'Zip, Zap & Zoom', 'The Rainbows', 'The Glowies', 'Team Speedy'],
};
/** A few name choices for a new fish (avoiding names already in the tank). */
export function nameChoices(kind, used) {
  if (kind.school) return shuffle(KIND_NAMES.tetra.filter((n) => !used.has(n))).slice(0, 5);
  const pool = shuffle(NAMES.filter((n) => !used.has(n)));
  const special = shuffle((KIND_NAMES[kind.id] || []).filter((n) => !used.has(n)));
  const out = [];
  if (special.length) out.push(special[0]);
  for (const n of pool) { if (out.length >= 6) break; if (!out.includes(n)) out.push(n); }
  return shuffle(out);
}

export function makeFish(kind, color, x, y, owner, t) {
  const f = {
    id: 0, kind, color, name: '', owner, x, y, fd: rand(0.3, 0.9), tfd: rand(0.2, 0.95),
    vx: rand(-60, 60), vy: rand(-20, 20), face: chance(0.5) ? 1 : -1, dir: 1, wig: rand(TAU), tilt: 0,
    state: 'swim', st: 0, tx: x, ty: y, born: t, puff: 0, puffT: 0, full: 0, fullT: 0, emote: null, hidden: 0,
    seed: Math.random(), held: null, play: null, bump: -9, pulse: rand(1), naming: false, fed: 0,
  };
  f.dir = f.face;
  if (kind.school) f.mates = [0, 1].map((i) => ({ x: x - 40 - i * 20, y: y + (i ? 22 : -20), wig: rand(TAU), face: f.face, ox: -46 - i * 14, oy: i ? 24 : -22 }));
  return f;
}

/** Vertical range of a fish (top, bottom) at its current depth. */
export function fishRange(f) {
  const s = fishScale(f.fd), k = f.kind, hh = (k.upright ? k.h * 0.55 : k.h * 0.5) * s;
  const top = WATER.y0 + 30 + hh;
  const bottom = yOfDepth(f.fd) - (k.jelly ? 110 : hh + 8) * s;
  return [top, Math.max(top + 20, bottom)];
}
export function bandY(f, p) { const [a, b] = fishRange(f); return lerp(a, b, p); }

/** Pick a new wandering target that suits the fish's personality. */
export function wanderTarget(f, game) {
  const k = f.kind;
  f.tfd = clamp(f.fd + rand(-0.5, 0.5), 0.05, 0.98);
  const [b0, b1] = k.band;
  let x = rand(WATER.x0 + 80, WATER.x1 - 80);
  if (k.id === 'angelfish' || k.id === 'betta') x = clamp(f.x + (f.dir > 0 ? 1 : -1) * rand(250, 600) * (chance(0.25) ? -1 : 1), WATER.x0 + 90, WATER.x1 - 90);
  let y = bandY(f, rand(b0, b1));
  if (k.id === 'clownfish' && f.home && game.decor.includes(f.home) && chance(0.75)) {
    const h = f.home; x = h.x + rand(-90, 90) * h.s; y = h.y - rand(60, 170) * h.s; f.tfd = clamp(h.d + rand(-0.05, 0.05), 0, 1);
  }
  f.tx = x; f.ty = y;
}

// --- movement ------------------------------------------------------------------------------
export function steerTo(f, tx, ty, speed, dt, arrive = 80, rate = 3) {
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
  const sp = speed * clamp(d / arrive, 0, 1);
  const vx = d > 0.5 ? dx / d * sp : 0, vy = d > 0.5 ? dy / d * sp : 0;
  f.vx = damp(f.vx, vx, rate, dt); f.vy = damp(f.vy, vy, rate, dt);
  return d;
}

/** Physics + animation common to every state. */
export function integrate(f, dt, game) {
  const k = f.kind;
  if (k.jelly && f.state !== 'held') {
    // pulse: a quick upward push, then a slow sink
    f.pulse += dt / 1.8;
    if (f.pulse >= 1) { f.pulse -= 1; f.vy -= (f.ty < f.y - 30 ? 120 : 70); }
    f.vy += 22 * dt;
    f.vy = clamp(f.vy, -140, 60);
  }
  f.x += f.vx * dt; f.y += f.vy * dt;
  f.fd = damp(f.fd, f.tfd, 0.6, dt);
  if (f.state !== 'held' && f.state !== 'leave') {
    const [top, bottom] = fishRange(f);
    if (f.y < top) { f.y = top; f.vy = Math.max(0, f.vy); }
    if (f.y > bottom) { f.y = bottom; f.vy = Math.min(0, f.vy); }
    f.x = clamp(f.x, WATER.x0 + 50, WATER.x1 - 50);
  }
  const sp = Math.hypot(f.vx, f.vy);
  if (Math.abs(f.vx) > 10 && !k.jelly) f.dir = f.vx > 0 ? 1 : -1;
  f.face = approach(f.face, f.dir, dt * 5);
  f.wig += dt * (k.wig + sp * 0.06 + (f.state === 'held' ? 14 : 0));
  f.tilt = damp(f.tilt, k.upright || k.jelly ? f.vx * 0.0015 : clamp(Math.atan2(f.vy, Math.abs(f.vx) + 30) * 0.6, -0.5, 0.5), 6, dt);
  f.puffT -= dt;
  f.puff = damp(f.puff, f.puffT > 0 ? 1 : 0, f.puffT > 0 ? 10 : 2.5, dt);
  if (f.emote) { f.emote.t += dt; if (f.emote.t > f.emote.dur) f.emote = null; }
  if (f.fullT > 0) { f.fullT -= dt; if (f.fullT <= 0) f.full = 0; }
  // the school follows its leader
  if (f.mates) {
    for (const m of f.mates) {
      const ox = m.ox * f.face, tx = f.x + ox + Math.sin(game.t * 2 + m.oy) * 8, ty = f.y + m.oy + Math.cos(game.t * 2.6 + m.ox) * 6;
      const px = m.x;
      m.x = damp(m.x, tx, 5, dt); m.y = damp(m.y, ty, 5, dt);
      const mvx = (m.x - px) / Math.max(dt, 1e-3);
      if (Math.abs(mvx) > 6) m.face = approach(m.face, mvx > 0 ? 1 : -1, dt * 6);
      m.wig += dt * (k.wig + Math.abs(mvx) * 0.06);
    }
  }
}
const approach = (v, t, s) => (v < t ? Math.min(t, v + s) : Math.max(t, v - s));

export function emote(f, kind, dur = 1.4) { f.emote = { kind, t: 0, dur }; }

// --- drawing ---------------------------------------------------------------------------------
function E(g, x, y, rx, ry, fill, rot = 0, lw = 3.5) { g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = NAVY; g.stroke(); } }
function eye(g, x, y, r, happy, look = 0) {
  if (happy) { g.lineWidth = 3; g.strokeStyle = NAVY; g.lineCap = 'round'; g.beginPath(); g.arc(x, y + 2, r * 0.8, Math.PI + 0.3, -0.3); g.stroke(); return; }
  E(g, x, y, r, r, '#ffffff', 0, 3);
  E(g, x + 1.5 + look, y + 0.5, r * 0.58, r * 0.62, NAVY, 0, 0);
  E(g, x + look - 0.5, y - r * 0.3, r * 0.22, r * 0.22, '#ffffff', 0, 0);
}
function smile(g, x, y, w = 6) { g.lineWidth = 2.6; g.strokeStyle = NAVY; g.lineCap = 'round'; g.beginPath(); g.arc(x, y - w * 0.5, w, 0.35, Math.PI - 0.6); g.stroke(); }
function blush(g, x, y, r = 5) { g.fillStyle = 'rgba(255,110,150,0.45)'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, TAU); g.fill(); }

/** Draw one fish body at the origin, facing right. */
function body(g, f, col, t, wig, glowOnly = false) {
  const k = f.kind.id, sw = Math.sin(wig);
  const happy = f.happy > 0;
  g.lineJoin = 'round'; g.lineCap = 'round';
  switch (k) {
    case 'goldfish': {
      g.save(); g.translate(-30, 0); g.rotate(sw * 0.35);
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(4, 0); g.quadraticCurveTo(-26, s * 10, -34, s * 34); g.quadraticCurveTo(-18, s * 12, -40, s * 6); g.quadraticCurveTo(-16, 0, 4, 0); g.fillStyle = col.a; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke(); }
      g.restore();
      g.beginPath(); g.moveTo(-4, -26); g.quadraticCurveTo(8, -46 + sw * 3, 26, -28); g.closePath(); g.fillStyle = col.a; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      E(g, 6, 0, 44, 31, col.c);
      if (col.spots) { g.save(); g.beginPath(); g.ellipse(6, 0, 44, 31, 0, 0, TAU); g.clip(); E(g, -14, -12, 16, 12, col.spots[0], 0.3, 0); E(g, 14, 16, 12, 8, col.spots[0], 0, 0); E(g, -2, 10, 7, 5, col.spots[1], 0, 0); E(g, 22, -18, 6, 5, col.spots[1], 0, 0); g.restore(); E(g, 6, 0, 44, 31, null); }
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(0, -16, 22, 7, -0.15, 0, TAU); g.fill();
      g.save(); g.translate(6, 12); g.rotate(0.5 + sw * 0.3); E(g, 0, 8, 7, 12, col.a, 0, 3); g.restore();
      eye(g, 30, -6, 9, happy); blush(g, 32, 10); smile(g, 42, 10, 5);
      break;
    }
    case 'clownfish': {
      g.save(); g.translate(-36, 0); g.rotate(sw * 0.35);
      g.beginPath(); g.moveTo(6, 0); g.quadraticCurveTo(-14, -26, -22, -18); g.quadraticCurveTo(-16, 0, -22, 18); g.quadraticCurveTo(-14, 26, 6, 0); g.fillStyle = col.c; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.moveTo(-16, -14); g.quadraticCurveTo(-12, 0, -16, 14); g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.stroke();
      g.restore();
      g.beginPath(); g.moveTo(-18, -22); g.quadraticCurveTo(0, -40 + sw * 2, 20, -26); g.closePath(); g.fillStyle = col.c; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      E(g, 4, 0, 42, 27, col.c);
      g.save(); g.beginPath(); g.ellipse(4, 0, 42, 27, 0, 0, TAU); g.clip();
      for (const x of [-24, 4, 30]) { g.fillStyle = NAVY; g.fillRect(x - 8, -30, 16, 60); g.fillStyle = '#ffffff'; g.fillRect(x - 5, -30, 10, 60); }
      g.restore(); E(g, 4, 0, 42, 27, null);
      g.save(); g.translate(0, 12); g.rotate(0.6 + sw * 0.3); E(g, 0, 7, 6, 10, col.a, 0, 3); g.restore();
      eye(g, 34, -6, 7.5, happy); smile(g, 41, 9, 4.5);
      break;
    }
    case 'angelfish': {
      g.save(); g.translate(-30, 0); g.rotate(sw * 0.25);
      g.beginPath(); g.moveTo(6, 0); g.lineTo(-22, -22); g.quadraticCurveTo(-14, 0, -22, 22); g.closePath(); g.fillStyle = col.a; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      g.restore();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(14, s * 30); g.quadraticCurveTo(-20, s * 70, -36 + sw * 4, s * 66); g.quadraticCurveTo(-18, s * 34, -18, s * 10); g.closePath(); g.fillStyle = col.a; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke(); }
      g.beginPath(); g.moveTo(46, 2); g.quadraticCurveTo(28, -42, 2, -40); g.quadraticCurveTo(-26, -10, -26, 0); g.quadraticCurveTo(-26, 10, 2, 40); g.quadraticCurveTo(28, 42, 46, 2); g.closePath();
      g.fillStyle = col.c; g.fill();
      g.save(); g.clip(); g.fillStyle = col.a; g.globalAlpha = 0.55; for (const x of [-12, 8]) g.fillRect(x, -44, 8, 88); g.restore();
      g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      eye(g, 28, -6, 8, happy); smile(g, 40, 8, 4); blush(g, 26, 10, 4);
      break;
    }
    case 'puffer': {
      const p = f.puff;
      const r = lerp(36, 58, p);
      g.save(); g.translate(-r + 4, 0); g.rotate(sw * 0.4);
      g.beginPath(); g.moveTo(4, 0); g.lineTo(-18, -14); g.quadraticCurveTo(-12, 0, -18, 14); g.closePath(); g.fillStyle = col.c; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      g.restore();
      if (p > 0.05) {
        g.fillStyle = shade(col.c, -0.1); g.strokeStyle = NAVY; g.lineWidth = 2.5;
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, sp = r + 9 * p; g.beginPath(); g.moveTo(Math.cos(a - 0.12) * r * 0.95, Math.sin(a - 0.12) * r * 0.95 * lerp(0.82, 1, p)); g.lineTo(Math.cos(a) * sp, Math.sin(a) * sp * lerp(0.82, 1, p)); g.lineTo(Math.cos(a + 0.12) * r * 0.95, Math.sin(a + 0.12) * r * 0.95 * lerp(0.82, 1, p)); g.fill(); g.stroke(); }
      }
      E(g, 0, 0, r * lerp(1.05, 1, p), r * lerp(0.82, 1, p), col.c);
      g.save(); g.beginPath(); g.ellipse(0, 0, r * lerp(1.05, 1, p), r * lerp(0.82, 1, p), 0, 0, TAU); g.clip();
      E(g, 0, r * 0.7, r * 0.95, r * 0.55, shade(col.c, 0.55), 0, 0);
      g.fillStyle = col.a; for (const [x, y] of [[-14, -18], [0, -24], [12, -16], [-24, -6], [-4, -10]]) { g.beginPath(); g.arc(x * r / 36, y * r / 36, 2.6, 0, TAU); g.fill(); }
      g.restore(); E(g, 0, 0, r * lerp(1.05, 1, p), r * lerp(0.82, 1, p), null);
      g.save(); g.translate(-4, 6); g.rotate(-0.4 + sw * 0.5); E(g, 0, 0, 5, 9, col.a, 0, 2.5); g.restore();
      eye(g, r * 0.55, -r * 0.2, lerp(8, 10, p), happy && p < 0.5);
      if (p > 0.4) { E(g, r * 0.86, r * 0.22, 4, 5, NAVY, 0, 0); } else smile(g, r * 0.84, r * 0.25, 4);
      blush(g, r * 0.4, r * 0.2, 4);
      break;
    }
    case 'betta': {
      // big flowing tail and fins
      g.save(); g.translate(-18, 0);
      g.beginPath(); g.moveTo(0, -8);
      for (let i = 0; i <= 10; i++) { const a = -1.1 + i / 10 * 2.2; const r = 62 + Math.sin(i * 1.7 + wig * 0.8) * 6; g.lineTo(-Math.cos(a) * r + Math.sin(wig + i) * 3, Math.sin(a) * r * 0.9 + sw * 6); }
      g.lineTo(0, 8); g.closePath();
      const gr = g.createLinearGradient(0, 0, -70, 0); gr.addColorStop(0, col.c); gr.addColorStop(1, col.a);
      g.fillStyle = gr; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { const a = -0.8 + i * 0.4; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-Math.cos(a) * 50, Math.sin(a) * 44 + sw * 4); g.stroke(); }
      g.restore();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(16, s * 10); g.quadraticCurveTo(-4, s * 52 + sw * 4, -26, s * 46); g.quadraticCurveTo(-10, s * 20, -10, s * 4); g.closePath(); g.fillStyle = shade(col.c, 0.15); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
      E(g, 10, 0, 32, 17, col.c);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(6, -8, 16, 4, 0, 0, TAU); g.fill();
      eye(g, 28, -4, 6.5, happy); smile(g, 37, 6, 3.5);
      break;
    }
    case 'tetra': {
      g.save(); g.translate(-18, 0); g.rotate(sw * 0.4);
      g.beginPath(); g.moveTo(4, 0); g.lineTo(-12, -10); g.lineTo(-9, 0); g.lineTo(-12, 10); g.closePath(); g.fillStyle = col.c; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      g.restore();
      E(g, 2, 0, 24, 10, col.c, 0, 2.5);
      const stripe = col.rainbow ? RAINBOW[Math.floor(t * 6 + f.seed * 7) % RAINBOW.length] : col.a;
      g.save(); g.beginPath(); g.ellipse(2, 0, 24, 10, 0, 0, TAU); g.clip();
      g.fillStyle = stripe; g.fillRect(-20, -4, 40, 5);
      if (col.red) { g.fillStyle = col.red; g.fillRect(-22, 1, 22, 9); }
      g.restore(); E(g, 2, 0, 24, 10, null, 0, 2.5);
      eye(g, 16, -2, 4, false);
      break;
    }
    case 'seahorse': {
      g.save(); g.rotate(sw * 0.05);
      // tail curl
      g.beginPath(); g.moveTo(-4, 26); g.quadraticCurveTo(-14, 52, 4, 58); g.quadraticCurveTo(18, 58, 12, 46); g.quadraticCurveTo(6, 40, 2, 48);
      g.lineWidth = 16; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 10; g.strokeStyle = col.c; g.stroke();
      // back fin
      g.beginPath(); g.moveTo(-16, -8); g.quadraticCurveTo(-34 + Math.sin(wig * 3) * 4, 0, -16, 14); g.closePath(); g.fillStyle = col.a; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      // body
      g.beginPath(); g.moveTo(-6, -32); g.quadraticCurveTo(-20, -6, -10, 20); g.quadraticCurveTo(-2, 34, 6, 26); g.quadraticCurveTo(22, 4, 8, -26); g.closePath();
      g.fillStyle = col.c; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      g.strokeStyle = shade(col.c, -0.18); g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-6 + i, -14 + i * 9); g.lineTo(10 - i * 2, -16 + i * 9); g.stroke(); }
      // head + snout
      g.beginPath(); g.moveTo(4, -40); g.lineTo(28, -36); g.lineTo(28, -28); g.lineTo(6, -26); g.closePath(); g.fillStyle = col.c; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      E(g, 0, -36, 15, 14, col.c);
      for (const [x, y] of [[-8, -52], [0, -54], [8, -50]]) { g.beginPath(); g.moveTo(x - 4, y + 6); g.lineTo(x, y - 4); g.lineTo(x + 4, y + 6); g.fillStyle = col.a; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke(); }
      eye(g, 4, -38, 5.5, happy); blush(g, 6, -28, 3.5);
      g.restore();
      break;
    }
    case 'jellyfish': {
      const pp = f.pulse, sq = Math.sin(pp * TAU) * 0.08;
      // tentacles
      for (let i = 0; i < 5; i++) {
        const x0 = -26 + i * 13;
        g.beginPath(); g.moveTo(x0, -2);
        for (let j = 1; j <= 8; j++) g.lineTo(x0 + Math.sin(t * 2.4 + i * 1.3 + j * 0.8) * (3 + j * 1.3), -2 + j * 10);
        g.lineWidth = i % 2 ? 6 : 4; g.strokeStyle = shade(col.a, 0.1); g.globalAlpha = 0.85; g.stroke(); g.globalAlpha = 1;
      }
      g.save(); g.scale(1 + sq, 1 - sq);
      g.beginPath(); g.moveTo(-42, 0); g.bezierCurveTo(-44, -54, 44, -54, 42, 0);
      for (let i = 0; i < 6; i++) { const x = 42 - (i + 1) * 14; g.quadraticCurveTo(x + 7, 9, x, 0); }
      g.closePath();
      g.globalAlpha = glowOnly ? 1 : 0.92; g.fillStyle = col.c; g.fill(); g.globalAlpha = 1;
      if (!glowOnly) { g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-16, -28, 12, 6, -0.5, 0, TAU); g.fill();
      if (!glowOnly) { eye(g, -10, -16, 4.5, happy); eye(g, 10, -16, 4.5, happy); smile(g, 0, -6, 4); blush(g, -20, -8, 4); blush(g, 20, -8, 4); }
      g.restore();
      break;
    }
  }
}

/** Draw a fish (with its school mates) in world space. */
export function drawFish(g, f, env, o = {}) {
  const k = f.kind, col = k.colors[f.color % k.colors.length];
  const s = fishScale(f.fd) * (o.scale || 1);
  const age = env.t - f.born, pop = age < 0.35 ? 0.3 + 0.7 * Math.sin(Math.min(1, age / 0.35) * Math.PI / 2) * 1.1 : 1;
  const bump = env.t - f.bump, bq = bump >= 0 && bump < 0.5 ? Math.sin(bump * 25) * Math.exp(-bump * 8) * 0.15 : 0;
  if (f.hidden > 0) return;
  const one = (x, y, face, wig, sc) => {
    g.save(); g.translate(x, y);
    g.rotate(f.tilt * (face >= 0 ? 1 : -1) * (k.upright || k.jelly ? -1 : 1));
    const fx = k.jelly ? 1 : (Math.abs(face) < 0.12 ? 0.12 * Math.sign(face || 1) : face);
    g.scale(sc * pop * fx * (1 + bq), sc * pop * (1 - bq));
    const key = `prop/aq-${k.id}-${col.n}` + (k.id === 'puffer' && f.puff > 0.5 ? '-puffed' : '');
    const img = art(key);
    if (img) {
      const w = k.id === 'puffer' && f.puff > 0.5 ? 130 : k.w, h = k.id === 'puffer' && f.puff > 0.5 ? 130 : k.h;
      const fit = Math.min(w / img.width, h / img.height), wq = 1 + Math.sin(wig) * 0.04;
      g.scale(wq, 1);
      if (k.jelly) g.scale(1 + Math.sin(f.pulse * TAU) * 0.06, 1 - Math.sin(f.pulse * TAU) * 0.06);
      // Jelly art seats its bell centre at 22.5% height; pulse around that point,
      // leaving its longer tentacles below. Other fish keep their centre anchor.
      g.drawImage(img, -img.width * fit / 2, -img.height * fit * (k.jelly ? 0.225 : 0.5), img.width * fit, img.height * fit);
    } else body(g, f, col, env.t, wig);
    g.restore();
  };
  if (f.mates) for (const m of f.mates) one(m.x, m.y, m.face, m.wig, s);
  one(f.x, f.y, f.face, f.wig, s);
  if (f.emote && !o.photo) drawEmote(g, f.emote.kind, f.x + 10 * s, f.y - (k.h * 0.5 + 34) * s, 30, f.emote.t);
}

/** Night glow for a fish (jellyfish and tetras shine, everyone else gets a faint halo). */
export function fishGlowColor(f) {
  const k = f.kind, col = k.colors[f.color % k.colors.length];
  if (k.jelly) return col.a;
  if (k.school) return col.rainbow ? '#ff9fe0' : col.a;
  return null;
}
export function drawFishGlowBits(g, f, env) {
  const k = f.kind, col = k.colors[f.color % k.colors.length];
  if (!(k.jelly || k.school) || f.hidden > 0) return;
  const s = fishScale(f.fd);
  const one = (x, y, face, wig) => {
    g.save(); g.translate(x, y); g.scale(s * (k.jelly ? 1 : face), s);
    if (k.jelly) { g.globalAlpha *= 0.55; body(g, f, { ...col, c: shade(col.c, 0.5) }, env.t, wig, true); }
    else { g.fillStyle = col.rainbow ? RAINBOW[Math.floor(env.t * 6 + f.seed * 7) % RAINBOW.length] : shade(col.a, 0.4); g.fillRect(-20, -4, 38, 5); }
    g.restore();
  };
  if (f.mates) for (const m of f.mates) one(m.x, m.y, m.face, m.wig);
  one(f.x, f.y, f.face, f.wig);
}

/** Palette icon for a fish kind. */
export function drawFishIcon(g, kind, x, y, size, color, t) {
  const f = makeFish(kind, color, 0, 0, -1, -9);
  f.face = 1; f.dir = 1; f.wig = t * kind.wig * 0.5; f.fd = 1; f.tilt = 0; f.mates = null;
  const s = size / Math.max(kind.w * (kind.school ? 1.6 : 1), kind.h) * 0.9;
  g.save(); g.translate(x, y); g.scale(s / fishScale(1), s / fishScale(1));
  drawFish(g, f, { t: 99 }, {});
  if (kind.school) { for (const [dx, dy] of [[-26, -18], [-30, 16]]) { const m = makeFish(kind, color, dx, dy, -1, -9); m.mates = null; m.face = 1; m.fd = 1; m.wig = f.wig + dx; drawFish(g, m, { t: 99 }, { scale: 0.75 }); } }
  g.restore();
}
