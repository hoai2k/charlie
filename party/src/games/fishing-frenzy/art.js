// Fishing Frenzy - procedural art. Every piece first asks for generated art
// (art()/drawArt(), keys listed in image-requests-history.md) and falls back to the
// vector drawing below, which is what ships today.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { TAU, clamp, lerp } from '../../engine/util.js';

export const NAVY = '#24163f';
/** The pond: an ellipse (the generated background must match it). */
export const POND = { x: 960, y: 580, rx: 700, ry: 280 };

/** Fit the measured generated pond to the same ellipse used by fish and docks.
 * Stretch its middle, then fit the surrounding sky/banks without cropping them.
 */
export function drawPondBackground(g, image) {
  const sourceX = [0, 333, 1592, W].map((x) => x * image.width / W);
  const sourceY = [0, 293, 905, H].map((y) => y * image.height / H);
  const destX = [0, POND.x - POND.rx, POND.x + POND.rx, W];
  const destY = [0, POND.y - POND.ry, POND.y + POND.ry, H];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    g.drawImage(image, sourceX[col], sourceY[row], sourceX[col + 1] - sourceX[col], sourceY[row + 1] - sourceY[row],
      destX[col], destY[row], destX[col + 1] - destX[col], destY[row + 1] - destY[row]);
  }
}

export const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Inside the pond ellipse scaled by k? */
export function inPond(x, y, k = 1) {
  const dx = (x - POND.x) / (POND.rx * k), dy = (y - POND.y) / (POND.ry * k);
  return dx * dx + dy * dy <= 1;
}
/** Pull a point back inside the pond ellipse scaled by k. */
export function clampPond(x, y, k = 1) {
  const dx = (x - POND.x) / (POND.rx * k), dy = (y - POND.y) / (POND.ry * k);
  const d = Math.hypot(dx, dy);
  if (d <= 1) return { x, y };
  return { x: POND.x + (dx / d) * POND.rx * k, y: POND.y + (dy / d) * POND.ry * k };
}
/** y of the near (bottom) shore at x. */
export const edgeY = (x) => POND.y + POND.ry * Math.sqrt(Math.max(0, 1 - ((x - POND.x) / POND.rx) ** 2));
/** x of the left (side -1) or right (side 1) shore at y. */
export const edgeX = (y, side) => POND.x + side * POND.rx * Math.sqrt(Math.max(0, 1 - ((y - POND.y) / POND.ry) ** 2));
/** Fake depth: things at the back of the pond are drawn a little smaller. */
export const pondDepth = (y) => lerp(0.82, 1.06, clamp((y - (POND.y - POND.ry)) / (POND.ry * 2), 0, 1));

// --- the catches --------------------------------------------------------------------
export const LOOKS = {
  sunny: { body: '#ffc93c', belly: '#fff3b0', fin: '#ff8a3d', ry: 0.34, cheek: true },
  darty: { body: '#ff7ac6', belly: '#ffe0f1', fin: '#a77bff', ry: 0.21, stripe: '#ffffff' },
  puffy: { body: '#a77bff', belly: '#eadfff', fin: '#ff8fd0', ry: 0.42, spikes: true, cheek: true },
  bubba: { body: '#33c3b0', belly: '#d8fff6', fin: '#ff9f1c', ry: 0.33, spots: '#ffe46b', lips: true },
  golden: { body: '#ffd23f', belly: '#fff6c4', fin: '#ffb300', ry: 0.3, shine: true, cheek: true },
};

/**
 * Draw one catch, centred at (0, 0) in the current transform, facing right,
 * L = body length (tail tip to nose). t drives the tail wag.
 */
export function drawCatch(g, kind, L, t = 0, o = {}) {
  // Generated art: 320x240, the catch facing right, centred, filling the width.
  if (drawArt(g, 'prop/fishing-' + kind, 0, 0, L * 1.25, L * 0.94)) return;
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  const lw = Math.max(2, L * 0.045);
  g.lineWidth = lw; g.strokeStyle = NAVY;
  if (kind === 'boot') drawBoot(g, L, t);
  else if (kind === 'duck') drawDuck(g, L, t);
  else if (kind === 'chest') drawChest(g, L, t);
  else drawFish(g, LOOKS[kind] || LOOKS.sunny, L, t, o);
  g.restore();
}

function drawFish(g, k, L, t, o) {
  const rx = L * 0.4, ry = L * k.ry;
  const wag = Math.sin(t * (o.fast ? 22 : 9)) * 0.28;
  // tail
  g.save(); g.translate(-rx * 0.86, 0); g.rotate(wag);
  g.fillStyle = k.fin; g.beginPath();
  g.moveTo(0, 0); g.quadraticCurveTo(-L * 0.12, -L * 0.24, -L * 0.24, -L * 0.24);
  g.quadraticCurveTo(-L * 0.15, 0, -L * 0.24, L * 0.24); g.quadraticCurveTo(-L * 0.12, L * 0.24, 0, 0);
  g.closePath(); g.fill(); g.stroke();
  g.restore();
  // dorsal fin
  g.fillStyle = k.fin; g.beginPath();
  g.moveTo(-rx * 0.45, -ry * 0.82); g.quadraticCurveTo(-rx * 0.1, -ry * 1.55 - L * 0.04, rx * 0.35, -ry * 0.9);
  g.closePath(); g.fill(); g.stroke();
  // body
  g.fillStyle = k.body; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.clip();
  g.fillStyle = k.belly; g.beginPath(); g.ellipse(rx * 0.08, ry * 0.75, rx * 0.95, ry * 0.62, 0, 0, TAU); g.fill();
  if (k.stripe) { g.strokeStyle = k.stripe; g.lineWidth = ry * 0.28; g.beginPath(); g.moveTo(-rx, -ry * 0.05); g.quadraticCurveTo(0, -ry * 0.25, rx, -ry * 0.05); g.stroke(); }
  if (k.spots) { g.fillStyle = k.spots; for (const [sx, sy, sr] of [[-0.45, -0.35, 0.16], [-0.1, -0.5, 0.12], [-0.6, 0.1, 0.11], [0.05, -0.15, 0.09]]) { g.beginPath(); g.arc(rx * sx, ry * sy, L * sr * 0.5, 0, TAU); g.fill(); } }
  if (k.shine) {
    const gr = g.createLinearGradient(-rx, -ry, rx, ry);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.55, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-rx, -ry, rx * 2, ry * 2);
  }
  // scales
  g.strokeStyle = 'rgba(36,22,63,0.18)'; g.lineWidth = Math.max(1.5, L * 0.022);
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-rx * 0.35 + i * rx * 0.24, -ry * 0.05, ry * 0.32, -1.1, 1.1); g.stroke(); }
  g.restore();
  g.strokeStyle = NAVY; g.lineWidth = Math.max(2, L * 0.045);
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  if (k.spikes) {
    g.fillStyle = k.fin;
    for (let i = 0; i < 5; i++) { const a = -2.4 + i * 0.5; g.beginPath(); g.arc(Math.cos(a) * rx * 1.02, Math.sin(a) * ry * 1.02, L * 0.03, 0, TAU); g.fill(); g.stroke(); }
  }
  // side fin
  g.save(); g.translate(-rx * 0.05, ry * 0.25); g.rotate(0.5 + Math.sin(t * 7) * 0.25);
  g.fillStyle = k.fin; g.beginPath(); g.ellipse(-L * 0.06, 0, L * 0.09, L * 0.045, 0, 0, TAU); g.fill(); g.stroke();
  g.restore();
  // face
  const ex = rx * 0.52, ey = -ry * 0.18, er = L * 0.085;
  g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(ex + er * 0.25, ey + er * 0.1, er * 0.55, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + er * 0.42, ey - er * 0.18, er * 0.2, 0, TAU); g.fill();
  if (k.cheek) { g.fillStyle = 'rgba(255,110,160,0.55)'; g.beginPath(); g.ellipse(ex - er * 0.2, ey + er * 1.5, er * 0.6, er * 0.38, 0, 0, TAU); g.fill(); }
  g.strokeStyle = NAVY; g.lineWidth = Math.max(1.8, L * 0.035);
  if (k.lips) { g.fillStyle = '#ff7a9c'; g.beginPath(); g.ellipse(rx * 0.95, ry * 0.18, L * 0.05, L * 0.06, 0, 0, TAU); g.fill(); g.stroke(); }
  else if (o.open) { g.fillStyle = '#7a2740'; g.beginPath(); g.ellipse(rx * 0.86, ry * 0.2, L * 0.04, L * 0.05, 0, 0, TAU); g.fill(); g.stroke(); }
  else { g.beginPath(); g.arc(rx * 0.78, ry * 0.12, L * 0.06, 0.2, 1.6); g.stroke(); }
}

function drawBoot(g, L, t) {
  // an old rain boot with a daisy growing out of it
  const s = L;
  // flower stem + leaves
  g.strokeStyle = '#2f9e5a'; g.lineWidth = s * 0.05;
  g.beginPath(); g.moveTo(-s * 0.05, -s * 0.2); g.quadraticCurveTo(-s * 0.12, -s * 0.5, -s * 0.02, -s * 0.66); g.stroke();
  g.fillStyle = '#58cc76'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.035);
  g.beginPath(); g.ellipse(-s * 0.14, -s * 0.42, s * 0.08, s * 0.035, -0.6, 0, TAU); g.fill(); g.stroke();
  g.save(); g.translate(-s * 0.02, -s * 0.68); g.rotate(Math.sin(t * 2) * 0.15);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * s * 0.075, Math.sin(a) * s * 0.075, s * 0.06, s * 0.032, a, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, s * 0.05, 0, TAU); g.fill(); g.stroke();
  g.restore();
  // boot
  g.fillStyle = '#7d8ac2';
  g.beginPath();
  g.moveTo(-s * 0.24, -s * 0.28); g.lineTo(s * 0.12, -s * 0.28); g.lineTo(s * 0.12, s * 0.02);
  g.quadraticCurveTo(s * 0.44, s * 0.04, s * 0.46, s * 0.2); g.lineTo(s * 0.46, s * 0.3); g.lineTo(-s * 0.26, s * 0.3); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#5a6699'; g.fillRect(-s * 0.26, s * 0.22, s * 0.72, s * 0.08); g.strokeRect(-s * 0.26, s * 0.22, s * 0.72, s * 0.08);
  g.fillStyle = '#a7b2e6'; g.fillRect(-s * 0.24, -s * 0.28, s * 0.36, s * 0.08); g.strokeRect(-s * 0.24, -s * 0.28, s * 0.36, s * 0.08);
  // patch
  g.fillStyle = '#ffb3d9'; g.beginPath(); g.rect(-s * 0.16, -s * 0.06, s * 0.13, s * 0.12); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-s * 0.18, -s * 0.12, s * 0.025, s * 0.08, 0, 0, TAU); g.fill();
}

function drawDuck(g, L, t) {
  const s = L;
  g.fillStyle = '#ffd23f';
  // tail flick + body
  g.beginPath(); g.moveTo(-s * 0.42, -s * 0.12); g.quadraticCurveTo(-s * 0.48, -s * 0.32, -s * 0.3, -s * 0.2); g.lineTo(-s * 0.3, -s * 0.05); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-s * 0.04, s * 0.04, s * 0.38, s * 0.22, 0, 0, TAU); g.fill(); g.stroke();
  // wing
  g.fillStyle = '#ffc21a'; g.beginPath(); g.ellipse(-s * 0.08, s * 0.02, s * 0.16, s * 0.09, -0.2, 0, TAU); g.fill(); g.stroke();
  // head
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(s * 0.2, -s * 0.24, s * 0.17, 0, TAU); g.fill(); g.stroke();
  // beak
  g.fillStyle = '#ff8a3d'; g.beginPath(); g.ellipse(s * 0.39, -s * 0.2, s * 0.1, s * 0.05, 0.1, 0, TAU); g.fill(); g.stroke();
  // eye
  g.fillStyle = NAVY; g.beginPath(); g.arc(s * 0.25, -s * 0.28, s * 0.035, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 0.26, -s * 0.295, s * 0.012, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,120,160,0.5)'; g.beginPath(); g.ellipse(s * 0.2, -s * 0.18, s * 0.04, s * 0.025, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(s * 0.12, -s * 0.33, s * 0.05, s * 0.025, -0.5, 0, TAU); g.fill();
}

function drawChest(g, L, t) {
  const s = L;
  g.fillStyle = '#b8743a';
  ui.roundRect(g, -s * 0.44, -s * 0.08, s * 0.88, s * 0.42, s * 0.05); g.fill(); g.stroke();
  // lid (a little open, gold glowing out)
  g.save(); g.globalCompositeOperation = 'lighter';
  const gl = 0.5 + 0.5 * Math.sin(t * 4);
  g.fillStyle = `rgba(255,220,90,${0.35 + gl * 0.3})`; g.beginPath(); g.ellipse(0, -s * 0.1, s * 0.4, s * 0.08, 0, 0, TAU); g.fill();
  g.restore();
  g.fillStyle = '#c98546';
  g.beginPath(); g.moveTo(-s * 0.46, -s * 0.12); g.quadraticCurveTo(-s * 0.44, -s * 0.42, 0, -s * 0.44); g.quadraticCurveTo(s * 0.44, -s * 0.42, s * 0.46, -s * 0.12); g.closePath(); g.fill(); g.stroke();
  // gold bands + lock
  g.fillStyle = '#ffd23f';
  for (const bx of [-0.3, 0.24]) { g.fillRect(bx * s, -s * 0.42, s * 0.07, s * 0.76); g.strokeRect(bx * s, -s * 0.42, s * 0.07, s * 0.76); }
  ui.roundRect(g, -s * 0.07, -s * 0.12, s * 0.14, s * 0.16, s * 0.03); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(0, -s * 0.04, s * 0.022, 0, TAU); g.fill();
  // coins peeking out
  g.fillStyle = '#ffe46b';
  for (const cx of [-0.18, 0.05, 0.36]) { g.beginPath(); g.ellipse(cx * s, -s * 0.12, s * 0.06, s * 0.03, 0, 0, TAU); g.fill(); g.stroke(); }
}

// --- bobber, rod, basket -------------------------------------------------------------
/** Bobber floating at the water line (x, y). sink 0..1 pushes it under. */
export function drawBobber(g, x, y, s, sink = 0, color = '#ff4d6d') {
  g.save(); g.translate(x, y + sink * 16 * s);
  if (!drawArt(g, 'prop/fishing-bobber', 0, -12 * s, 30 * s, 40 * s)) {
    g.lineWidth = 3 * s; g.strokeStyle = NAVY;
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, -10 * s, 11 * s, 0, Math.PI); g.fill(); g.stroke();
    g.fillStyle = color; g.beginPath(); g.arc(0, -10 * s, 11 * s, Math.PI, TAU); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, -21 * s); g.lineTo(0, -31 * s); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, -32 * s, 3.5 * s, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-4 * s, -15 * s, 2.5 * s, 4 * s, -0.5, 0, TAU); g.fill();
  }
  g.restore();
  // water covering the bottom of it
  g.save(); g.fillStyle = 'rgba(90,190,240,0.55)'; g.beginPath(); g.ellipse(x, y + 2 * s, 16 * s, 5 * s, 0, 0, TAU); g.fill(); g.restore();
}

/**
 * A fishing rod from the grip (hx, hy) to the tip (tx, ty), bent by `bend`
 * (px, sideways toward +y of the rod direction). Returns nothing.
 */
export function drawRod(g, hx, hy, tx, ty, bend, color, s = 1) {
  // The flexible shaft stays procedural for bite/tension feedback. The
  // regenerated handle ends at the grip, so it can share that bending shaft.
  const len = Math.hypot(tx - hx, ty - hy), ang = Math.atan2(ty - hy, tx - hx);
  // The compact 4:1 handle can be drawn whole at its intended thickness.
  const handle = art('prop/fishing-rod');
  const iw = handle ? handle.width || 256 : 0, ih = handle ? handle.height || 64 : 0;
  const hk = handle ? (17 * s) / ih : 0;
  const butt = handle ? iw * hk : len * 0.18;
  const bx = hx - Math.cos(ang) * butt, by = hy - Math.sin(ang) * butt;
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const cx = (hx + tx) / 2 + nx * bend, cy = (hy + ty) / 2 + ny * bend;
  g.save(); g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 11 * s; g.beginPath(); g.moveTo(bx, by); g.lineTo(hx, hy); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 5.5 * s; g.beginPath(); g.moveTo(bx, by); g.lineTo(hx, hy); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
  g.strokeStyle = color; g.lineWidth = 5.5 * s; g.setLineDash([10 * s, 10 * s]); g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke(); g.setLineDash([]);
  // grip + reel
  if (handle) {
    g.save(); g.translate(hx, hy); g.rotate(ang);
    const dh = ih * hk;
    g.drawImage(handle, -butt, -dh * 0.5, butt, dh);
    g.restore();
  } else {
    g.strokeStyle = NAVY; g.lineWidth = 13 * s; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (hx - bx) * 0.7, by + (hy - by) * 0.7); g.stroke();
    g.strokeStyle = '#8b5a2b'; g.lineWidth = 8 * s; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (hx - bx) * 0.7, by + (hy - by) * 0.7); g.stroke();
    const rx = bx + (hx - bx) * 0.55 + nx * 9 * s, ry = by + (hy - by) * 0.55 + ny * 9 * s;
    g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 3 * s; g.beginPath(); g.arc(rx, ry, 8 * s, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(rx, ry, 2.5 * s, 0, TAU); g.fill();
  }
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(tx, ty, 4 * s, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** Wicker basket standing at (x, y) = bottom centre; `fish` = kinds caught (last few show). */
export function drawBasket(g, x, y, s, fish, t, pop = 0) {
  const k = 1 + pop * 0.25 * Math.sin(pop * 14);
  g.save(); g.translate(x, y); g.scale(s * k, s / k);
  // tails/heads poking out of the top
  const show = fish.slice(-5);
  show.forEach((kind, i) => {
    const u = show.length === 1 ? 0 : i / (show.length - 1) - 0.5;
    g.save(); g.translate(u * 56, -74 - (i % 2) * 8); g.rotate(-Math.PI / 2 + u * 0.9 + Math.sin(t * 2 + i) * 0.05);
    drawCatch(g, kind, 42, 0);
    g.restore();
  });
  if (!drawArt(g, 'prop/fishing-basket', 0, 0, 120, 88, { anchor: 'bottom' })) {
    g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
    g.fillStyle = '#d9a35c';
    g.beginPath(); g.moveTo(-52, -54); g.lineTo(52, -54); g.lineTo(42, 0); g.lineTo(-42, 0); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(120,70,20,0.5)'; g.lineWidth = 3;
    for (let r = 0; r < 3; r++) { g.beginPath(); g.moveTo(-50 + r * 3, -40 + r * 14); g.lineTo(50 - r * 3, -40 + r * 14); g.stroke(); }
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 14, -52); g.lineTo(i * 11.5, -2); g.stroke(); }
    g.strokeStyle = NAVY; g.lineWidth = 4;
    g.fillStyle = '#c38a45'; ui.roundRect(g, -58, -62, 116, 14, 7); g.fill(); g.stroke();
  }
  g.restore();
}

export function drawLilyPad(g, x, y, r, rot, flower, t) {
  g.save(); g.translate(x, y);
  if (!drawArt(g, flower ? 'prop/fishing-lilypad-flower' : 'prop/fishing-lilypad', 0, 0, r * 2.2, r * 1.5)) {
    g.scale(1, 0.62); g.rotate(rot);
    g.fillStyle = 'rgba(20,70,90,0.25)'; g.beginPath(); g.arc(4, 8, r, 0, TAU); g.fill();
    g.fillStyle = '#4fc26a'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, 0.35, TAU - 0.05); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const a = 0.9 + i * 1.1; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); g.stroke(); }
    g.rotate(-rot); g.scale(1, 1 / 0.62);
    if (flower) {
      g.translate(-r * 0.2, -r * 0.15);
      g.fillStyle = '#ffb3d9'; g.strokeStyle = NAVY; g.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.sin(t) * 0.05; g.beginPath(); g.ellipse(Math.cos(a) * 11, Math.sin(a) * 6 - 6, 10, 6, a, 0, TAU); g.fill(); g.stroke(); }
      g.fillStyle = '#ff6fb1'; for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; g.beginPath(); g.ellipse(Math.cos(a) * 6, Math.sin(a) * 3 - 12, 7, 5, a, 0, TAU); g.fill(); g.stroke(); }
      g.fillStyle = '#ffe46b'; g.beginPath(); g.arc(0, -14, 5, 0, TAU); g.fill(); g.stroke();
    }
  }
  g.restore();
}

/** The frog on its lily pad: (x, y) = bottom centre; puff 0..1 throat bubble. */
export function drawFrog(g, x, y, s, blink, puff) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (!drawArt(g, 'prop/fishing-frog', 0, 0, 90, 76, { anchor: 'bottom' })) {
    g.lineWidth = 3.5; g.strokeStyle = NAVY; g.fillStyle = '#6fd36b';
    g.beginPath(); g.ellipse(0, -22, 34, 22, 0, 0, TAU); g.fill(); g.stroke();
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 26, -6, 14, 7, 0, 0, TAU); g.fill(); g.stroke(); }
    if (puff > 0) { g.fillStyle = '#ffe0f1'; g.beginPath(); g.arc(0, -10, 8 + puff * 12, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#6fd36b';
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 15, -42, 11, 0, TAU); g.fill(); g.stroke(); }
    for (const sx of [-1, 1]) {
      if (blink) { g.beginPath(); g.moveTo(sx * 15 - 6, -42); g.lineTo(sx * 15 + 6, -42); g.stroke(); }
      else { g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * 15, -42, 7, 0, TAU); g.fill(); g.fillStyle = NAVY; g.beginPath(); g.arc(sx * 15, -41, 4, 0, TAU); g.fill(); }
    }
    g.beginPath(); g.arc(0, -24, 11, 0.3, Math.PI - 0.3); g.stroke();
    g.fillStyle = 'rgba(255,110,160,0.5)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 22, -26, 6, 3.5, 0, 0, TAU); g.fill(); }
  }
  g.restore();
}

// --- background -----------------------------------------------------------------------
/** The static scene (sky, trees, meadow, pond). Docks are drawn separately. */
export function buildBackground() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  // sky
  ui.sky(g, '#8fd3ff', '#e6f7ff', 300);
  ui.cloud(g, 300, 120, 0.9, '#fff', 0.95); ui.cloud(g, 1580, 95, 0.75, '#fff', 0.95); ui.cloud(g, 1050, 150, 0.5, '#fff', 0.8);
  // far hills
  g.fillStyle = '#9ddc8f'; g.beginPath(); g.moveTo(0, 260);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, 225 - Math.sin(x * 0.004 + 1) * 40 - Math.sin(x * 0.011) * 14);
  g.lineTo(W, 300); g.lineTo(0, 300); g.closePath(); g.fill();
  // meadow
  const mg = g.createLinearGradient(0, 230, 0, H);
  mg.addColorStop(0, '#86d873'); mg.addColorStop(1, '#5cc163');
  g.fillStyle = mg; g.fillRect(0, 245, W, H - 245);
  // trees along the back
  const tree = (x, y, s, col) => {
    g.fillStyle = '#9a6a3a'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.fillRect(x - 9 * s, y - 40 * s, 18 * s, 44 * s); g.strokeRect(x - 9 * s, y - 40 * s, 18 * s, 44 * s);
    g.fillStyle = col;
    g.beginPath(); g.arc(x, y - 78 * s, 46 * s, 0, TAU); g.arc(x - 34 * s, y - 56 * s, 30 * s, 0, TAU); g.arc(x + 34 * s, y - 56 * s, 30 * s, 0, TAU); g.fill();
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.arc(x - 14 * s, y - 92 * s, 16 * s, 0, TAU); g.fill();
    if (col === '#ff9ad0') return;
    g.fillStyle = '#ff6f8f'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + (hh(x + i) - 0.5) * 70 * s, y - 60 * s - hh(x * 3 + i) * 40 * s, 5 * s, 0, TAU); g.fill(); }
  };
  const treeSpots = [[90, 300, 1.15, '#3fb35d'], [260, 270, 0.85, '#ff9ad0'], [420, 262, 0.75, '#48bf66'], [700, 250, 0.6, '#3fb35d'], [1230, 250, 0.62, '#48bf66'], [1500, 262, 0.75, '#ff9ad0'], [1680, 275, 0.9, '#3fb35d'], [1840, 300, 1.15, '#48bf66']];
  for (const [x, y, s, c] of treeSpots) tree(x, y, s, c);
  // grass tufts + flowers
  for (let i = 0; i < 260; i++) {
    const x = hh(i) * W, y = 270 + hh(i + 50) * (H - 270);
    if (inPond(x, y, 1.12)) continue;
    if (i % 3 === 0) {
      g.fillStyle = ['#ff8ad0', '#ffe46b', '#ffffff', '#c49bff'][i % 4];
      g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
      g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill();
    } else {
      g.strokeStyle = 'rgba(40,120,60,0.55)'; g.lineWidth = 3; g.beginPath();
      g.moveTo(x - 6, y); g.lineTo(x - 9, y - 12); g.moveTo(x, y); g.lineTo(x, y - 16); g.moveTo(x + 6, y); g.lineTo(x + 10, y - 11); g.stroke();
    }
  }
  // pond: pebble rim, water
  const P = POND;
  g.fillStyle = 'rgba(30,80,40,0.25)'; g.beginPath(); g.ellipse(P.x + 8, P.y + 14, P.rx + 46, P.ry + 34, 0, 0, TAU); g.fill();
  g.fillStyle = '#efdcae'; g.strokeStyle = NAVY; g.lineWidth = 6;
  g.beginPath(); g.ellipse(P.x, P.y, P.rx + 40, P.ry + 28, 0, 0, TAU); g.fill(); g.stroke();
  for (let i = 0; i < 150; i++) {
    const a = hh(i * 3) * TAU, r = 1.0 + hh(i * 7) * 0.05;
    const x = P.x + Math.cos(a) * (P.rx + 20) * r, y = P.y + Math.sin(a) * (P.ry + 14) * r;
    g.fillStyle = ['#d8c08c', '#c9d2dc', '#f7ead0', '#b9c6a8'][i % 4];
    g.beginPath(); g.ellipse(x, y, 9 + hh(i) * 8, 6 + hh(i + 1) * 5, a, 0, TAU); g.fill();
  }
  const wg = g.createLinearGradient(0, P.y - P.ry, 0, P.y + P.ry);
  wg.addColorStop(0, '#2f9fd8'); wg.addColorStop(0.5, '#47b6e6'); wg.addColorStop(1, '#66c8ef');
  g.fillStyle = wg; g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.fill();
  g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  // deep middle + light edge
  const dg = g.createRadialGradient(P.x, P.y - 20, 40, P.x, P.y, P.rx * 0.8);
  dg.addColorStop(0, 'rgba(20,90,160,0.35)'); dg.addColorStop(1, 'rgba(20,90,160,0)');
  g.save(); g.scale(1, P.ry / P.rx); g.fillStyle = dg; g.beginPath(); g.arc(P.x, P.y * P.rx / P.ry, P.rx, 0, TAU); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 4;
  g.beginPath(); g.ellipse(P.x, P.y, P.rx - 14, P.ry - 10, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  // pebbles under the water near the edge
  g.save(); g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.clip();
  for (let i = 0; i < 70; i++) {
    const a = hh(i * 5 + 9) * TAU, r = 0.86 + hh(i * 2 + 1) * 0.12;
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(P.x + Math.cos(a) * P.rx * r, P.y + Math.sin(a) * P.ry * r, 10, 6, 0, 0, TAU); g.fill();
  }
  // water weeds
  g.strokeStyle = 'rgba(30,140,90,0.45)'; g.lineWidth = 6; g.lineCap = 'round';
  for (const [wx, wy] of [[520, 560], [760, 730], [1180, 420], [1420, 640], [940, 480], [1600, 560], [330, 610]]) {
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(wx + k * 14, wy + 30); g.quadraticCurveTo(wx + k * 24 + 10, wy, wx + k * 10, wy - 34); g.stroke(); }
  }
  g.restore();
  // cattails + reeds at the back of the pond
  const reeds = (x, y, s) => {
    for (let k = 0; k < 5; k++) {
      const ox = (k - 2) * 12 * s, top = y - (70 + hh(x + k) * 50) * s;
      g.strokeStyle = NAVY; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox + 6 * s, (y + top) / 2, x + ox + (k - 2) * 4 * s, top); g.stroke();
      g.strokeStyle = '#4fae4f'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox + 6 * s, (y + top) / 2, x + ox + (k - 2) * 4 * s, top); g.stroke();
      if (k % 2 === 0) { g.fillStyle = '#8b5a2b'; g.strokeStyle = NAVY; g.lineWidth = 3 * s; ui.roundRect(g, x + ox + (k - 2) * 4 * s - 6 * s, top + 4 * s, 12 * s, 30 * s, 6 * s); g.fill(); g.stroke(); }
    }
  };
  reeds(560, 330, 1); reeds(1370, 325, 1); reeds(420, 365, 0.9); reeds(1520, 360, 0.9); reeds(960, 300, 0.8);
  return cv;
}

/** Wooden docks for the player slots, on a transparent layer (above the water). */
export function buildDocks(slots, colors) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.lineJoin = 'round';
  const plank = (x, y, w, h, vertical) => {
    g.fillStyle = 'rgba(20,60,80,0.25)'; g.fillRect(x + 6, y + 10, w, h);
    g.fillStyle = '#d6a066'; g.strokeStyle = NAVY; g.lineWidth = 5; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
    g.strokeStyle = 'rgba(110,60,20,0.45)'; g.lineWidth = 3;
    if (vertical) { for (let yy = y + 26; yy < y + h - 4; yy += 26) { g.beginPath(); g.moveTo(x + 3, yy); g.lineTo(x + w - 3, yy); g.stroke(); } }
    else { for (let xx = x + 26; xx < x + w - 4; xx += 26) { g.beginPath(); g.moveTo(xx, y + 3); g.lineTo(xx, y + h - 3); g.stroke(); } }
    // nails
    g.fillStyle = 'rgba(80,40,10,0.6)';
    if (vertical) for (let yy = y + 13; yy < y + h; yy += 26) { g.beginPath(); g.arc(x + 10, yy, 2.5, 0, TAU); g.arc(x + w - 10, yy, 2.5, 0, TAU); g.fill(); }
    else for (let xx = x + 13; xx < x + w; xx += 26) { g.beginPath(); g.arc(xx, y + 9, 2.5, 0, TAU); g.arc(xx, y + h - 9, 2.5, 0, TAU); g.fill(); }
  };
  const post = (x, y, col) => {
    g.fillStyle = '#9a6a3a'; g.strokeStyle = NAVY; g.lineWidth = 4;
    ui.roundRect(g, x - 9, y - 46, 18, 56, 6); g.fill(); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(x + 2, y - 70); g.lineTo(x + 36, y - 60); g.lineTo(x + 2, y - 50); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 2, y - 46); g.lineTo(x + 2, y - 72); g.stroke();
  };
  slots.forEach((s, i) => {
    const col = colors[i];
    if (s.side === 0) {
      const top = s.shore.y - 26, w = 128;
      plank(s.x - w / 2, top, w, s.y + 40 - top, true);
      g.fillStyle = col; g.globalAlpha = 0.5; g.fillRect(s.x - w / 2 + 6, s.y + 26, w - 12, 8); g.globalAlpha = 1;
      post(s.x - w / 2 - 4, top + 34, col);
    } else {
      const x0 = s.side < 0 ? s.x - 80 : s.shore.x - 26, x1 = s.side < 0 ? s.shore.x + 26 : s.x + 80;
      plank(x0, s.y - 40, x1 - x0, 64, false);
      g.fillStyle = '#b07a44'; g.strokeStyle = NAVY; g.lineWidth = 4; g.fillRect(x0, s.y + 24, x1 - x0, 14); g.strokeRect(x0, s.y + 24, x1 - x0, 14);
      post(s.side < 0 ? x1 - 6 : x0 + 6, s.y - 34, col);
    }
  });
  return cv;
}

/** Menu / how-to thumbnail. */
export function drawIconArt(g, x, y, w, h, t) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const sk = g.createLinearGradient(0, y, 0, y + h * 0.3);
  sk.addColorStop(0, '#8fd3ff'); sk.addColorStop(1, '#dff4ff');
  g.fillStyle = sk; g.fillRect(x, y, w, h * 0.3);
  g.fillStyle = '#7fd36f'; g.fillRect(x, y + h * 0.26, w, h * 0.74);
  const cx = x + w * 0.52, cy = y + h * 0.62, rx = w * 0.46, ry = h * 0.3;
  g.fillStyle = '#efdcae'; g.strokeStyle = NAVY; g.lineWidth = h * 0.012;
  g.beginPath(); g.ellipse(cx, cy, rx + h * 0.03, ry + h * 0.025, 0, 0, TAU); g.fill(); g.stroke();
  const wg = g.createLinearGradient(0, cy - ry, 0, cy + ry); wg.addColorStop(0, '#2f9fd8'); wg.addColorStop(1, '#6ccaf0');
  g.fillStyle = wg; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
  // lily pad
  drawLilyPad(g, x + w * 0.22, y + h * 0.6, h * 0.07, 0.4, true, t);
  // ripples + bobber
  const bx = x + w * 0.66, by = y + h * 0.7;
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = h * 0.008;
  for (let k = 0; k < 3; k++) { const r = ((t * 0.6 + k / 3) % 1); g.globalAlpha = 1 - r; g.beginPath(); g.ellipse(bx, by, h * (0.03 + r * 0.12), h * (0.012 + r * 0.045), 0, 0, TAU); g.stroke(); }
  g.globalAlpha = 1;
  drawBobber(g, bx, by, h / 260, Math.max(0, Math.sin(t * 3)) * 0.6);
  // golden fish leaping in an arc
  const u = (t * 0.45) % 1;
  const fx = x + w * (0.36 + u * 0.2), fy = y + h * (0.6 - Math.sin(u * Math.PI) * 0.42);
  g.save(); g.translate(fx, fy); g.rotate(-0.9 + u * 1.8);
  drawCatch(g, 'golden', h * 0.22, t * 2, { fast: true });
  g.restore();
  for (let i = 0; i < 5; i++) {
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x + w * 0.36 + Math.cos(i * 1.3) * h * 0.05, y + h * 0.6 - ((t * 0.8 + i * 0.2) % 1) * h * 0.12, h * 0.012, 0, TAU); g.fill();
  }
  // rod from the corner, line to the bobber
  const hx = x + w * 0.08, hy = y + h * 0.98, tx = x + w * 0.4, ty = y + h * 0.3;
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = Math.max(1.5, h * 0.006);
  g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo((tx + bx) / 2, (ty + by) / 2 + h * 0.1, bx, by - h * 0.12); g.stroke();
  drawRod(g, hx, hy, tx, ty, -h * 0.04, '#ff6fb1', h / 400);
  // "!" pop
  const k = 1 + Math.max(0, Math.sin(t * 3)) * 0.2;
  g.save(); g.translate(bx + w * 0.02, by - h * 0.26); g.scale(k, k);
  drawBang(g, 0, 0, h * 0.09);
  g.restore();
  g.restore();
}

/** The big yellow "!" bubble (bite!). */
export function drawBang(g, x, y, r) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#ffe14d'; g.strokeStyle = NAVY; g.lineWidth = Math.max(3, r * 0.14);
  g.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.78 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.stroke();
  ui.text(g, '!', 0, r * 0.06, { size: r * 1.25, color: '#ff4d6d', strokeWidth: Math.max(3, r * 0.16), weight: 800, shadow: false });
  g.restore();
}
