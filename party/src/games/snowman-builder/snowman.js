// Snowman Builder: the snowman model (stacked balls + decorations) and all of
// its procedural drawing. Everything is drawn in "yard units" with the anchor
// of each thing at the origin; generated art (prop/snowman-*) replaces the
// vector drawing when it exists.
import { art, drawArt } from '../../engine/art.js';
import { clamp, lerp, pick, TAU } from '../../engine/util.js';
import { starPath } from '../../engine/emotes.js';
import * as ui from '../../engine/ui.js';

export const NAVY = '#24163f';
export const REF_R = 60;           // decorations are drawn at their box size on a ball of this radius
export const MIN_STACK_R = 26;     // smallest ball that can go on the snowman
export const MAX_R = 88;
export const KY = 0.72;            // ground-plane squash (3/4 view)

const BRIGHT = ['#ff4d6d', '#3fa7ff', '#9b5cff', '#36d17a', '#ff9f1c', '#ff6fd0', '#2ec4b6'];

// anchor: 'c' centre, 'b' bottom-centre, 'l' left-centre (pointing right).
// layer: 0 behind the balls, 2 scarf, 3 face/body bits, 4 hats, 5 friends.
// snap: how far outside a ball the hand may be and still stick it on.
export const ITEMS = [
  { id: 'coal', name: 'Coal eye', box: [22, 22], anchor: 'c', layer: 3, snap: 26 },
  { id: 'googly', name: 'Googly eye', box: [30, 30], anchor: 'c', layer: 3, snap: 26 },
  { id: 'carrot', name: 'Carrot nose', box: [64, 24], anchor: 'l', layer: 3, snap: 26, flip: true },
  { id: 'smile', name: 'Coal smile', box: [70, 30], anchor: 'c', layer: 3, snap: 26 },
  { id: 'cheek', name: 'Rosy cheek', box: [30, 18], anchor: 'c', layer: 3, snap: 20 },
  { id: 'shades', name: 'Sunglasses', box: [90, 34], anchor: 'c', layer: 3.5, snap: 26 },
  { id: 'tophat', name: 'Top hat', box: [80, 80], anchor: 'b', layer: 4, snap: 80, hat: true },
  { id: 'bobble', name: 'Bobble hat', box: [84, 80], anchor: 'b', layer: 4, snap: 80, hat: true, colors: BRIGHT },
  { id: 'partyhat', name: 'Party hat', box: [56, 84], anchor: 'b', layer: 4, snap: 80, hat: true, colors: BRIGHT },
  { id: 'tiara', name: 'Tiara', box: [72, 40], anchor: 'b', layer: 4, snap: 70, hat: true },
  { id: 'earmuffs', name: 'Earmuffs', box: [120, 60], anchor: 'c', layer: 4, snap: 60, hat: true, colors: ['#b98cff', '#ff7ac6', '#4fb8ff', '#ff4d6d'] },
  { id: 'scarf', name: 'Scarf', box: [60, 100], anchor: 'c', layer: 2, snap: 40, colors: BRIGHT, scarf: true },
  { id: 'arm', name: 'Stick arm', box: [120, 60], anchor: 'l', layer: 0, snap: 50, arm: true },
  { id: 'mitten', name: 'Mitten', box: [34, 40], anchor: 'c', layer: 3, snap: 40, colors: ['#2ec4b6', '#ff4d6d', '#9b5cff', '#ff9f1c'] },
  { id: 'button', name: 'Coal button', box: [26, 26], anchor: 'c', layer: 3, snap: 22 },
  { id: 'heart', name: 'Heart button', box: [30, 28], anchor: 'c', layer: 3, snap: 22 },
  { id: 'star', name: 'Gold star', box: [34, 34], anchor: 'c', layer: 3, snap: 22 },
  { id: 'bowtie', name: 'Bow tie', box: [60, 30], anchor: 'c', layer: 3, snap: 30, colors: ['#ff4d6d', '#3fa7ff', '#9b5cff', '#ff6fd0'] },
  { id: 'flower', name: 'Flower', box: [40, 40], anchor: 'c', layer: 3.5, snap: 30, colors: ['#ff6fd0', '#ffd23f', '#ff9f1c', '#b98cff', '#4fb8ff'] },
  { id: 'bird', name: 'Birdie', box: [56, 44], anchor: 'b', layer: 5, snap: 70, flip: true, hat: true },
  { id: 'broom', name: 'Broom', box: [60, 170], anchor: 'c', layer: 0.5, snap: 40 },
];
export const ITEM = Object.fromEntries(ITEMS.map((d, i) => [d.id, i]));
export const itemDef = (id) => ITEMS[ITEM[id]];
const ART = { coal: 'coal', button: 'coal', googly: 'googly', carrot: 'carrot', smile: 'smile', cheek: 'cheek', shades: 'shades', tophat: 'tophat', bobble: 'bobble', partyhat: 'partyhat', tiara: 'tiara', earmuffs: 'earmuffs', arm: 'arm', mitten: 'mitten', heart: 'heart', star: 'star', bowtie: 'bowtie', flower: 'flower', bird: 'bird', broom: 'broom' };

export function newSnowman(x, y) { return { x, y, balls: [], items: [] }; }

/** Centres of the balls of a stack standing on (x, y), bottom first. `anim` adds per-ball sway/hop. */
export function ballCenters(sm, x = sm.x, y = sm.y, anim = null) {
  const out = [];
  let cy = y, prev = null;
  sm.balls.forEach((b, i) => {
    const sq = anim?.squash ?? 0;
    const r = b.r;
    cy = prev ? cy - prev.r * 0.8 * (1 - sq) - r * 0.8 * (1 - sq) : y - r * (1 - sq * 0.6);
    const sway = anim ? (anim.sway || 0) * i * i * 0.6 : 0;
    out.push({ x: x + sway, y: cy - (anim?.hop || 0), r, i });
    prev = b;
  });
  return out;
}

/** Top of the stack (or the ground) above (x, y). */
export function stackTop(sm) {
  const c = ballCenters(sm);
  if (!c.length) return sm.y;
  const t = c[c.length - 1];
  return t.y - t.r;
}
export function stackHeight(sm) { return sm.y - stackTop(sm); }

/** Item anchor in yard units for ball centres `cs` (ground items use their own spot). */
export function itemPos(it, cs, sm) {
  if (it.ball < 0 || !cs[it.ball]) return { x: it.gx, y: it.gy, s: it.gs || 1 };
  const c = cs[it.ball];
  return { x: c.x + it.u * c.r, y: c.y + it.v * c.r, s: clamp(c.r / REF_R, 0.55, 1.45) };
}

/**
 * Where an item dropped at (x, y) attaches: { ball, u, v, rot, flip } on the
 * snowman, or null when it misses (it then falls to the snow).
 */
export function attachAt(sm, x, y, kind) {
  const def = itemDef(kind), cs = ballCenters(sm);
  let best = null, bd = Infinity;
  for (const c of cs) {
    const d = Math.hypot(x - c.x, y - c.y) - c.r;
    if (d < bd) { bd = d; best = c; }
  }
  if (!best || bd > def.snap) return null;
  let dx = x - best.x, dy = y - best.y;
  const d = Math.hypot(dx, dy);
  const lim = def.hat || def.arm ? 0.9 : 0.94;
  if (d > best.r * lim) { dx *= (best.r * lim) / d; dy *= (best.r * lim) / d; }
  const u = dx / best.r, v = dy / best.r;
  const out = { ball: best.i, u, v, rot: 0, flip: 1 };
  if (def.hat) out.rot = clamp(Math.atan2(dy, dx) + Math.PI / 2, -0.55, 0.55);
  if (def.flip) out.flip = u < -0.12 ? -1 : 1;
  if (def.arm) {
    out.flip = u < 0 ? -1 : 1;
    out.rot = clamp(Math.atan2(v, Math.abs(u) + 0.001), -0.9, 0.5);   // elevation, outward
  }
  if (kind === 'broom') out.rot = (u < 0 ? -1 : 1) * 0.35;
  if (kind === 'scarf') out.flip = u < 0 ? -1 : 1;
  return out;
}

export function makeItem(kind) {
  const def = itemDef(kind);
  return { kind, ball: -1, u: 0, v: 0, rot: 0, flip: 1, color: def.colors ? pick(def.colors) : null, born: 0, gx: 0, gy: 0, gs: 1 };
}

/** Rough pick-up circle for an item at its anchor: { x, y, r } (yard units). */
export function itemHit(it, p) {
  const def = itemDef(it.kind), [w, h] = def.box, s = p.s;
  let cx = p.x, cy = p.y;
  if (def.anchor === 'b') cy -= h * 0.5 * s;
  if (def.anchor === 'l') { const a = it.rot; cx += Math.cos(a) * w * 0.45 * s * it.flip; cy += Math.sin(a) * w * 0.45 * s; }
  if (it.kind === 'scarf') return { x: cx, y: cy, r: 30 * s };
  return { x: cx, y: cy, r: Math.max(16, Math.min(w, h) * 0.55 * s + 6) };
}

// --- balls -----------------------------------------------------------------------
/** One snowball centred at (x, y). spin/dir add rolling speckles (moving along dir). */
export function drawBall(g, x, y, r, { spin = 0, dir = 0, seed = 0, glow = 0, sparkle = 0, t = 0 } = {}) {
  g.save();
  if (!drawArt(g, 'prop/snowman-ball', x, y, r * 2.06, r * 2.06)) {
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.65, '#f4f8ff'); gr.addColorStop(1, '#cfdcf3');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    // lilac cel shade, lower right
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    g.fillStyle = 'rgba(176,170,232,0.32)';
    g.beginPath(); g.arc(x - r * 0.28, y - r * 0.3, r * 1.08, 0, TAU); g.arc(x + r * 0.2, y + r * 0.25, r * 1.4, 0, TAU, true); g.fill('evenodd');
    g.restore();
    g.lineWidth = Math.max(2.5, r * 0.05); g.strokeStyle = NAVY;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.ellipse(x - r * 0.42, y - r * 0.45, r * 0.18, r * 0.1, -0.7, 0, TAU); g.fill();
  }
  // rolling speckles and seams: little bits of snow texture turning with the ball
  const ca = Math.cos(dir), sa = Math.sin(dir) * KY;
  const nlen = Math.hypot(ca, sa) || 1, dx = ca / nlen, dy = sa / nlen;
  g.fillStyle = 'rgba(150,170,215,0.55)';
  for (let i = 0; i < 9; i++) {
    const ph = spin + i * 2.399 + seed;
    const c = Math.cos(ph);
    if (c < 0.05) continue;
    const lat = Math.sin(i * 7.13 + seed * 3) * 0.75;
    const along = Math.sin(ph) * Math.sqrt(1 - lat * lat) * 0.88;
    const px = x + (dx * along - dy * lat) * r, py = y + (dy * along + dx * lat) * r;
    const sz = r * 0.07 * (0.5 + c * 0.5);
    g.beginPath(); g.ellipse(px, py, sz * 1.3, sz, i, 0, TAU); g.fill();
  }
  if (glow > 0) {
    g.globalAlpha = glow; g.lineWidth = 6; g.strokeStyle = '#ffd23f'; g.setLineDash([12, 10]); g.lineDashOffset = -t * 40;
    g.beginPath(); g.arc(x, y, r + 8, 0, TAU); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  }
  if (sparkle > 0) {
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + i * 2.1 + seed, rr = r * 0.6;
      const k = (Math.sin(t * 5 + i * 2 + seed) + 1) / 2;
      sparkleAt(g, x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.16 * k * sparkle, '#ffffff');
    }
  }
  g.restore();
}

export function sparkleAt(g, x, y, s, color = '#fff6a8') {
  if (s <= 0.5) return;
  g.save(); g.translate(x, y); g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? s * 0.22 : s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fillStyle = color; g.fill(); g.restore();
}

export function drawShadow(g, x, y, r, alpha = 0.18) {
  g.fillStyle = `rgba(80,90,160,${alpha})`;
  g.beginPath(); g.ellipse(x, y, r * 1.05, r * 0.3, 0, 0, TAU); g.fill();
}

// --- the whole snowman -----------------------------------------------------------
/**
 * Draw a snowman standing on (x, y). o: { anim: { hop, sway, squash, wave, blink, flap, look },
 * hover (item to glow), held (item drawn last), t, scale }
 */
export function drawSnowman(g, sm, x, y, o = {}) {
  const t = o.t || 0, anim = o.anim || null;
  const cs = ballCenters(sm, x, y, anim);
  if (cs.length) drawShadow(g, x, y + 2, cs[0].r * (1 - (anim?.hop || 0) / 300), 0.2);
  const items = sm.items.filter((it) => it.ball >= 0 && it !== o.held);
  const behind = items.filter((it) => itemDef(it.kind).layer < 1);
  const front = items.filter((it) => itemDef(it.kind).layer >= 1).sort((a, b) => itemDef(a.kind).layer - itemDef(b.kind).layer);
  for (const it of behind) drawPlaced(g, it, cs, sm, o);
  for (const c of cs) drawBall(g, c.x, c.y, c.r, { seed: c.i * 1.7 + (sm.seed || 0), spin: sm.balls[c.i].spin || 0, dir: 0, sparkle: o.sparkle || 0, t });
  for (const it of front) drawPlaced(g, it, cs, sm, o);
  return cs;
}

function drawPlaced(g, it, cs, sm, o) {
  const p = itemPos(it, cs, sm);
  const pop = it.born > 0 ? 1 + Math.sin(Math.min(1, it.born / 0.3) * Math.PI) * 0.35 * (1 - Math.min(1, it.born / 0.3)) : 1;
  if (o.hover === it) hoverRing(g, it, p, o.t || 0, o.color || '#ffd23f');
  let rot = it.rot;
  const anim = o.anim;
  if (anim && it.kind === 'arm') rot += (anim.wave || 0) * (0.55 + 0.45 * Math.sin((o.t || 0) * 9 + it.u * 3)) * -1;
  if (anim && it.kind === 'broom') rot += Math.sin((o.t || 0) * 4) * 0.12 * (anim.wave ? 1 : 0);
  let dy = 0;
  if (anim && it.kind === 'bird' && anim.flap) dy = -Math.abs(Math.sin((o.t || 0) * 7 + it.u)) * 14 * p.s;
  const c = it.ball >= 0 ? cs[it.ball] : null;
  if (it.kind === 'scarf' && c) { drawScarf(g, it, c, o.t || 0, anim); return; }
  drawItem(g, it.kind, p.x, p.y + dy, p.s * pop, { rot, flip: it.flip, color: it.color, t: o.t || 0, blink: anim?.blink || 0, flap: anim?.flap || 0 });
}

export function hoverRing(g, it, p, t, color) {
  const h = itemHit(it, p);
  g.save(); g.globalAlpha = 0.6 + 0.25 * Math.sin(t * 8);
  g.beginPath(); g.arc(h.x, h.y, h.r + 8, 0, TAU);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill(); g.lineWidth = 4; g.setLineDash([9, 7]); g.strokeStyle = color; g.stroke();
  g.restore();
}

// --- decorations -----------------------------------------------------------------
/** Draw a decoration with its anchor at (x, y), scale s (1 = box size). */
export function drawItem(g, kind, x, y, s, { rot = 0, flip = 1, color = null, t = 0, blink = 0, flap = 0, icon = false } = {}) {
  const def = itemDef(kind);
  if (!def) return;
  g.save();
  g.translate(x, y); g.rotate(rot * (def.arm ? flip : 1)); g.scale(s * flip, s);
  if (blink && (kind === 'coal' || kind === 'googly')) g.scale(1, Math.max(0.15, 1 - blink));
  const [w, h] = def.box;
  const key = ART[kind] ? `prop/snowman-${ART[kind]}` : null;
  const bx = def.anchor === 'l' ? 0 : -w / 2, by = def.anchor === 'b' ? -h : -h / 2;
  if (!(key && drawArt(g, key, bx, by, w, h, { anchor: 'topleft' }))) DRAW[kind](g, color || (def.colors ? def.colors[0] : null), t, flap);
  g.restore();
}

function line(g, w = 3) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; }
function shine(g, x, y, rx, ry, a = -0.6) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU); g.fill(); }

function coalLump(g, r) {
  line(g, 2.5);
  g.fillStyle = '#2d2a3e';
  g.beginPath();
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, rr = r * (0.85 + ((i * 37) % 5) * 0.05); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.stroke();
  shine(g, -r * 0.3, -r * 0.35, r * 0.28, r * 0.16);
}

function hatTone(c) { return c || '#ff4d6d'; }

const DRAW = {
  coal(g) { coalLump(g, 10); },
  button(g) { coalLump(g, 12); },
  googly(g) {
    line(g, 2.5); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(3, 4, 7, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(1, 2, 2.2, 0, TAU); g.fill();
  },
  carrot(g) {
    line(g, 2.5);
    g.fillStyle = '#ff8a1c';
    g.beginPath(); g.moveTo(2, -11); g.quadraticCurveTo(30, -7, 62, 1); g.quadraticCurveTo(30, 9, 2, 11); g.quadraticCurveTo(-3, 0, 2, -11); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(160,60,0,0.55)'; g.lineWidth = 2;
    for (const xx of [16, 28, 40]) { g.beginPath(); g.moveTo(xx, -6 + xx * 0.07); g.lineTo(xx + 4, -2 + xx * 0.05); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(18, -5, 10, 2.5, 0.05, 0, TAU); g.fill();
  },
  smile(g) { for (let i = 0; i < 5; i++) { const a = Math.PI * (0.18 + i * 0.16); g.save(); g.translate(Math.cos(a) * 30, Math.sin(a) * 26 - 12); coalLump(g, 6.5); g.restore(); } },
  cheek(g) {
    g.fillStyle = 'rgba(255,120,170,0.55)'; g.beginPath(); g.ellipse(0, 0, 14, 8.5, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(-5, -3, 2.2, 0, TAU); g.fill();
  },
  shades(g) {
    line(g, 3);
    for (const sx of [-1, 1]) {
      g.save(); g.translate(sx * 22, 0);
      g.fillStyle = '#ff5fa8'; g.beginPath();
      g.moveTo(0, 13); g.bezierCurveTo(-24, -2, -14, -20, 0, -8); g.bezierCurveTo(14, -20, 24, -2, 0, 13); g.fill(); g.stroke();
      shine(g, -6, -6, 5, 2.5);
      g.restore();
    }
    g.beginPath(); g.moveTo(-8, -4); g.quadraticCurveTo(0, -9, 8, -4); g.stroke();
    g.beginPath(); g.moveTo(-40, -5); g.lineTo(-45, -8); g.moveTo(40, -5); g.lineTo(45, -8); g.stroke();
  },
  tophat(g) {
    line(g, 3);
    g.fillStyle = '#2f2752'; ui.roundRect(g, -40, -12, 80, 12, 6); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-26, -10); g.lineTo(-24, -78); g.quadraticCurveTo(0, -84, 24, -78); g.lineTo(26, -10); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e8213f'; g.fillRect(-25, -26, 50, 12); g.strokeRect(-25, -26, 50, 12);
    g.fillStyle = '#36a35a'; for (const a of [-0.6, 0.3]) { g.save(); g.translate(14, -22); g.rotate(a); g.beginPath(); g.ellipse(6, 0, 8, 4, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    g.fillStyle = '#ff2d55'; g.beginPath(); g.arc(13, -21, 3.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-18, -72, 8, 44);
  },
  bobble(g, c) {
    line(g, 3);
    const col = hatTone(c);
    g.fillStyle = col; g.beginPath(); g.moveTo(-38, -14); g.bezierCurveTo(-40, -70, 40, -70, 38, -14); g.closePath(); g.fill(); g.stroke();
    g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.85)'; for (const yy of [-30, -48]) g.fillRect(-42, yy, 84, 8); g.restore();
    g.beginPath(); g.moveTo(-38, -14); g.bezierCurveTo(-40, -70, 40, -70, 38, -14); g.stroke();
    g.fillStyle = '#fff'; ui.roundRect(g, -42, -18, 84, 18, 8); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 2; for (let xx = -34; xx <= 34; xx += 8) { g.beginPath(); g.moveTo(xx, -15); g.lineTo(xx, -3); g.stroke(); }
    line(g, 3); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -64, 13, 0, TAU); g.fill(); g.stroke();
  },
  partyhat(g, c) {
    line(g, 3);
    g.fillStyle = hatTone(c); g.beginPath(); g.moveTo(-26, -2); g.lineTo(0, -74); g.lineTo(26, -2); g.quadraticCurveTo(0, 6, -26, -2); g.fill(); g.stroke();
    g.save(); g.clip(); g.fillStyle = '#ffd23f';
    for (const [xx, yy] of [[-10, -14], [9, -26], [-4, -40], [6, -54], [-14, -2], [16, -8]]) { g.beginPath(); g.arc(xx, yy, 4.5, 0, TAU); g.fill(); }
    g.restore();
    g.beginPath(); g.moveTo(-26, -2); g.lineTo(0, -74); g.lineTo(26, -2); g.stroke();
    g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * 6, -78 + Math.sin(a) * 6, 6, 4, a, 0, TAU); g.fill(); g.stroke(); }
  },
  tiara(g, t) {
    line(g, 2.5);
    g.fillStyle = '#e3e8f7';
    g.beginPath(); g.moveTo(-34, -2);
    g.lineTo(-30, -18); g.lineTo(-20, -10); g.lineTo(-11, -28); g.lineTo(0, -12); g.lineTo(11, -28); g.lineTo(20, -10); g.lineTo(30, -18); g.lineTo(34, -2);
    g.quadraticCurveTo(0, -8, -34, -2); g.fill(); g.stroke();
    g.fillStyle = '#ff5fa8'; g.beginPath(); g.moveTo(0, -13); g.bezierCurveTo(-11, -20, -6, -32, 0, -25); g.bezierCurveTo(6, -32, 11, -20, 0, -13); g.fill(); g.stroke();
    g.fillStyle = '#7fd3ff'; for (const xx of [-20, 20]) { g.beginPath(); g.arc(xx, -9, 3.5, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#ffffff'; for (const xx of [-11, 11]) { g.beginPath(); g.arc(xx, -27, 3, 0, TAU); g.fill(); }
  },
  earmuffs(g, c) {
    line(g, 3);
    g.strokeStyle = NAVY; g.lineWidth = 9; g.beginPath(); g.arc(0, 18, 50, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.strokeStyle = '#c7cbe0'; g.lineWidth = 5; g.stroke();
    line(g, 3);
    for (const sx of [-1, 1]) {
      g.fillStyle = hatTone(c);
      g.beginPath();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, rr = i % 2 ? 15 : 19; g.lineTo(sx * 46 + Math.cos(a) * rr, 14 + Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.stroke();
      shine(g, sx * 46 - 6, 7, 5, 3);
    }
  },
  scarf(g, c) {   // icon / ground version: a little rolled scarf
    line(g, 3); const col = hatTone(c);
    g.fillStyle = col; ui.roundRect(g, -28, -14, 56, 22, 10); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(8, 4); g.lineTo(22, 40); g.lineTo(6, 42); g.lineTo(-2, 6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(-14, -14, 8, 22); g.fillRect(4, -14, 8, 22);
    g.beginPath(); g.moveTo(10, 24); g.lineTo(17, 22); g.lineTo(19, 29); g.lineTo(12, 30); g.fill();
  },
  arm(g) {
    line(g, 3.5);
    g.strokeStyle = NAVY; g.lineWidth = 11;
    const path = () => { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(50, -4, 72, -14); g.lineTo(112, -20); g.moveTo(96, -18); g.lineTo(110, -38); g.moveTo(98, -17); g.lineTo(118, -6); g.moveTo(66, -12); g.lineTo(76, -32); };
    path(); g.stroke();
    g.strokeStyle = '#8b5a33'; g.lineWidth = 6; path(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, -2); g.quadraticCurveTo(40, -5, 66, -13); g.stroke();
  },
  mitten(g, c) {
    line(g, 3); g.fillStyle = hatTone(c);
    g.beginPath(); g.moveTo(-12, 14); g.lineTo(-13, -6); g.quadraticCurveTo(-13, -20, 0, -20); g.quadraticCurveTo(13, -20, 13, -4); g.lineTo(12, 14); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(-14, -2, 6, 9, -0.5, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; ui.roundRect(g, -14, 10, 28, 10, 4); g.fill(); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * 6, -4 + Math.sin(a) * 6); g.lineTo(-Math.cos(a) * 6, -4 - Math.sin(a) * 6); g.stroke(); }
  },
  heart(g) {
    line(g, 2.5); g.fillStyle = '#ff5fa8';
    g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(-20, -2, -11, -18, 0, -8); g.bezierCurveTo(11, -18, 20, -2, 0, 12); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(-3.5, -1, 1.8, 0, TAU); g.arc(3.5, -1, 1.8, 0, TAU); g.fill();
    shine(g, -7, -7, 3, 2);
  },
  star(g) { line(g, 2.5); starPath(g, 17, 0.5); g.fillStyle = '#ffd23f'; g.fill(); g.stroke(); shine(g, -4, -5, 3.5, 2); },
  bowtie(g, c) {
    line(g, 3); g.fillStyle = hatTone(c);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-28, -13); g.quadraticCurveTo(-32, 0, -28, 13); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(28, -13); g.quadraticCurveTo(32, 0, 28, 13); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; for (const [xx, yy] of [[-18, -4], [-14, 6], [17, -3], [13, 6]]) { g.beginPath(); g.arc(xx, yy, 2.5, 0, TAU); g.fill(); }
    g.fillStyle = hatTone(c); ui.roundRect(g, -6, -7, 12, 14, 4); g.fill(); g.stroke();
  },
  flower(g, c) {
    line(g, 2.5); g.fillStyle = hatTone(c);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; g.beginPath(); g.ellipse(Math.cos(a) * 11, Math.sin(a) * 11, 9, 7, a, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.stroke();
  },
  bird(g, c, t, flap) {
    line(g, 2.5);
    g.strokeStyle = NAVY; g.beginPath(); g.moveTo(-4, -2); g.lineTo(-5, 0); g.moveTo(4, -2); g.lineTo(5, 0); g.stroke();
    g.fillStyle = '#e8213f';
    g.beginPath(); g.moveTo(-14, -14); g.lineTo(-30, -26); g.lineTo(-24, -10); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -16, 18, 15, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(2, -30); g.lineTo(8, -40); g.lineTo(12, -28); g.fill(); g.stroke();
    g.fillStyle = '#ffd6d6'; g.beginPath(); g.ellipse(4, -10, 9, 6, 0, 0, TAU); g.fill();
    g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(16, -20); g.lineTo(26, -16); g.lineTo(16, -13); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(10, -21, 2.6, 0, TAU); g.fill();
    g.save(); g.translate(-4, -16); g.rotate(-0.3 - (flap ? Math.abs(Math.sin(t * 18)) * 0.9 : 0));
    g.fillStyle = '#c4122f'; g.beginPath(); g.ellipse(-4, 0, 10, 6, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
  },
  broom(g) {
    line(g, 3);
    g.save(); g.strokeStyle = NAVY; g.lineWidth = 10; g.beginPath(); g.moveTo(0, -84); g.lineTo(0, 30); g.stroke();
    g.strokeStyle = '#a8703f'; g.lineWidth = 6; g.stroke(); g.restore();
    g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(-8, 26); g.lineTo(-28, 84); g.quadraticCurveTo(0, 90, 28, 84); g.lineTo(8, 26); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(150,100,20,0.6)'; g.lineWidth = 2; for (const xx of [-14, -5, 5, 14]) { g.beginPath(); g.moveTo(xx * 0.4, 32); g.lineTo(xx, 84); g.stroke(); }
    line(g, 2.5); g.fillStyle = '#e8213f'; g.fillRect(-10, 30, 20, 7); g.strokeRect(-10, 30, 20, 7);
  },
};

const scarfTints = new WeakMap();
/** The white scarf-tail art multiplied by colour `col` (outline and shading kept), cached. */
function tintedScarf(img, col) {
  let byCol = scarfTints.get(img);
  if (!byCol) scarfTints.set(img, (byCol = new Map()));
  let c = byCol.get(col);
  if (!c) {
    c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0);
    byCol.set(col, c);
  }
  return c;
}

/** Scarf wrapped round ball c at its height, tail hanging on one side. */
function drawScarf(g, it, c, t, anim) {
  const r = c.r, yy = clamp(it.v, -0.85, 0.85) * r, half = Math.sqrt(Math.max(0, r * r - yy * yy)) * 1.04;
  const cy = c.y + yy, th = r * 0.3, col = it.color || '#ff4d6d';
  const sag = r * 0.12;
  g.save();
  g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = NAVY;
  // tail
  const side = it.flip, tx = c.x + side * half * 0.45;
  const sw = Math.sin(t * 3 + c.i) * (anim ? 0.15 : 0.05);
  g.save(); g.translate(tx, cy + th * 0.3); g.rotate(-side * 0.12 + sw);
  const tw = th * 0.95, tl = r * 0.85;
  const tail = art('prop/snowman-scarf');
  if (tail) {
    // The authored tail is plain white (x 58..181 of its 240 px canvas): tint it to this scarf's
    // colour and fit that strip to the same tw x tl box as the procedural tail.
    const k = tail.width / 240;
    g.drawImage(tintedScarf(tail, col), 58 * k, 0, 123 * k, tail.height, -tw / 2, 0, tw, tl);
  } else {
    g.fillStyle = col; ui.roundRect(g, -tw / 2, 0, tw, tl, 6); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; for (let k = 1; k <= 2; k++) g.fillRect(-tw / 2 + 2, tl * (0.25 * k + 0.1), tw - 4, tl * 0.1);
    g.strokeStyle = col; g.lineWidth = 3; for (let k = 0; k < 4; k++) { const fx = -tw / 2 + 4 + k * (tw - 8) / 3; g.beginPath(); g.moveTo(fx, tl); g.lineTo(fx, tl + 8); g.stroke(); }
  }
  g.restore();
  // the wrap: a band bowing down across the ball
  const band = () => {
    g.beginPath();
    g.moveTo(c.x - half, cy - th / 2);
    g.quadraticCurveTo(c.x, cy - th / 2 + sag * 2, c.x + half, cy - th / 2);
    g.lineTo(c.x + half * 0.98, cy + th / 2);
    g.quadraticCurveTo(c.x, cy + th / 2 + sag * 2, c.x - half * 0.98, cy + th / 2);
    g.closePath();
  };
  band();
  g.fillStyle = col; g.fill();
  g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let k = -3; k <= 3; k++) { const sx = c.x + k * r * 0.32; g.beginPath(); g.moveTo(sx - 6, cy - th); g.lineTo(sx + 6, cy - th); g.lineTo(sx + 2, cy + th * 1.3); g.lineTo(sx - 10, cy + th * 1.3); g.closePath(); g.fill(); }
  g.restore();
  band(); g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke();
  // knot
  g.fillStyle = col; g.beginPath(); g.ellipse(tx, cy + th * 0.35, th * 0.45, th * 0.42, 0, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** List / cursor icon for an item, centred in a box of size sz. */
export function drawItemIcon(g, kind, x, y, sz, t = 0, color = null) {
  const def = itemDef(kind);
  if (!def) return;
  const [w, h] = def.box;
  const s = (sz * 0.8) / Math.max(w, h, 40);
  let ax = x, ay = y;
  if (def.anchor === 'b') ay = y + (h * s) / 2;
  if (def.anchor === 'l') ax = x - (w * s) / 2;
  if (def.arm) { drawItem(g, kind, ax, ay + h * s * 0.15, s, { color, t, icon: true }); return; }
  drawItem(g, kind, ax, ay, s, { color, t, icon: true });
}

export const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * k; };
export { lerp };
