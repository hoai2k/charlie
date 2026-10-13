// Puppy Splash: procedural art kit (the fallbacks that ship today).
import * as ui from '../../engine/ui.js';
import { TAU, clamp } from '../../engine/util.js';
import { drawSparkleShape } from '../../engine/emotes.js';

export const NAVY = '#24163f';
export const POOL = { x: 1580, y: 770, rx: 175, ry: 92 };
export const PUDDLES = [{ x: 380, y: 590, rx: 125, ry: 52 }, { x: 1120, y: 520, rx: 120, ry: 48 }, { x: 800, y: 850, rx: 130, ry: 52 }];
export const PORCH_Y = 330;

// breeds: body, ear, patch, spots
export const BREEDS = [
  { body: '#ffe2b0', ear: '#e8b070', patch: null, spots: false, fluffy: false },   // golden
  { body: '#ffffff', ear: '#f4ecff', patch: null, spots: false, fluffy: true },    // poodle
  { body: '#ffffff', ear: '#a8682e', patch: '#c98a48', spots: false, fluffy: false }, // beagle
  { body: '#ffffff', ear: '#2f2a45', patch: null, spots: true, fluffy: false },    // spotty
  { body: '#eef0f8', ear: '#9aa0b8', patch: '#b8bdd0', spots: false, fluffy: true }, // big sheepdog
];

const MUD = '#7a4a22';
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, k) {
  const A = hex(a), B = hex(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}
function ol(g, w = 3) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; }

/**
 * A puppy, side view facing right, origin at the feet, ~100 px tall.
 * o: { breed, mud (0..1), t, run (0..1 leg speed), wag, shake (0..1), tongue, bark, sit, eyesShut, fluff (0..1 clean glow) }
 */
export function drawPuppy(g, o) {
  const B = BREEDS[o.breed % BREEDS.length];
  const mud = o.mud || 0;
  const body = mix(B.body, '#9a6a3a', mud * 0.55);
  const ear = mix(B.ear, MUD, mud * 0.4);
  const t = o.t || 0;
  const leg = Math.sin(t * 18) * (o.run || 0);
  ol(g, 3.5);
  // tail
  const wag = Math.sin(t * (o.wag ? 22 : 6)) * (o.wag ? 0.6 : 0.2);
  g.save(); g.translate(-44, -58); g.rotate(-0.9 + wag);
  g.fillStyle = body; ui.roundRect(g, -7, -34, 14, 36, 7); g.fill(); g.stroke();
  if (B.fluffy || o.fluff) { g.beginPath(); g.arc(0, -34, 11, 0, TAU); g.fill(); g.stroke(); }
  g.restore();
  // legs
  g.fillStyle = body;
  const legs = o.sit ? [[-30, 0], [26, 0]] : [[-34, leg * 8], [-18, -leg * 8], [18, leg * 8], [32, -leg * 8]];
  for (const [x, dx] of legs) { ui.roundRect(g, x - 8 + dx * 0.4, -34, 16, 34, 7); g.fill(); g.stroke(); }
  // body
  g.beginPath(); g.ellipse(0, -50, 52, 28, 0, 0, TAU); g.fill(); g.stroke();
  if (B.fluffy || o.fluff > 0) {
    // fluffy rim
    g.save(); g.globalAlpha = B.fluffy ? 1 : clamp(o.fluff, 0, 1);
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.beginPath(); g.arc(Math.cos(a) * 46, -50 + Math.sin(a) * 24, 11, 0, TAU); g.fill(); g.stroke(); }
    g.beginPath(); g.ellipse(0, -48, 48, 24, 0, 0, TAU); g.fill();
    g.restore();
  }
  if (B.patch) { g.fillStyle = mix(B.patch, MUD, mud * 0.4); g.beginPath(); g.ellipse(-10, -60, 26, 16, 0, 0, TAU); g.fill(); }
  if (B.spots) { g.fillStyle = '#2f2a45'; for (const [x, y, r] of [[-24, -56, 8], [6, -62, 6], [18, -44, 7], [-6, -40, 5]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
  // head
  g.save(); g.translate(44, -78);
  if (o.bark) g.rotate(-0.25);
  g.fillStyle = body;
  g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill(); g.stroke();
  if (B.fluffy) { for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-18 + i * 9, -26 + Math.abs(i - 2) * 3, 10, 0, TAU); g.fill(); g.stroke(); } g.beginPath(); g.arc(0, 0, 27, 0, TAU); g.fill(); }
  if (B.patch) { g.fillStyle = mix(B.patch, MUD, mud * 0.4); g.beginPath(); g.ellipse(-8, -10, 18, 14, 0.4, 0, TAU); g.fill(); }
  // snout
  g.fillStyle = mix('#fff6ec', '#9a6a3a', mud * 0.5);
  g.beginPath(); g.ellipse(24, 8, 16, 12, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(37, 3, 6, 5, 0, 0, TAU); g.fill();
  // mouth / tongue
  if (o.bark) {
    g.fillStyle = '#7a2440'; g.beginPath(); g.ellipse(26, 20, 10, 8, 0, 0, TAU); g.fill(); g.stroke();
  } else if (o.tongue) {
    g.fillStyle = '#ff7a9a'; g.beginPath(); g.ellipse(24, 22 + Math.sin(t * 10) * 1.5, 6, 9, 0, 0, TAU); g.fill(); g.stroke();
  }
  // eye
  if (o.eyesShut) { g.beginPath(); g.arc(8, -6, 6, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); }
  else { g.fillStyle = NAVY; g.beginPath(); g.ellipse(9, -6, 5.5, 7, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(11, -9, 2.2, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,120,150,0.4)'; g.beginPath(); g.ellipse(4, 10, 7, 4, 0, 0, TAU); g.fill();
  // ear
  const ef = o.shake ? Math.sin(t * 50) * 0.8 : Math.sin(t * 4) * 0.08;
  g.save(); g.translate(-12, -16); g.rotate(0.3 + ef);
  g.fillStyle = ear; g.beginPath(); g.ellipse(0, 18, 11, 22, 0.1, 0, TAU); g.fill(); g.stroke(); g.restore();
  g.restore();
}

/** Mud splotches over the puppy (drawn in the same space as drawPuppy). */
export function drawMud(g, blobs, mud, t) {
  if (mud <= 0.001) return;
  g.save();
  for (const b of blobs) {
    if (b.k > mud) continue;   // cleaned blobs vanish one by one
    const fade = clamp((mud - b.k) / 0.08, 0, 1);
    g.globalAlpha = 0.9 * fade;
    g.fillStyle = b.dark ? '#5e3816' : '#7a4a22';
    g.beginPath(); g.ellipse(b.x, b.y, b.r * 1.15, b.r * 0.85, b.a, 0, TAU); g.fill();
    g.beginPath(); g.arc(b.x + b.r * 0.8, b.y + b.r * 0.5, b.r * 0.35, 0, TAU); g.fill();
    if (b.drip) { g.beginPath(); g.ellipse(b.x, b.y + b.r + 6 + Math.sin(t * 3 + b.x) * 2, 4, 8, 0, 0, TAU); g.fill(); }
  }
  g.restore();
}

export function makeBlobs(n = 11) {
  const spots = [[-30, -54], [-6, -60], [20, -50], [-20, -38], [10, -40], [38, -86], [52, -70], [30, -98], [-36, -20], [26, -16], [-44, -66], [0, -50]];
  return spots.slice(0, n).map(([x, y], i) => ({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 8, r: 10 + Math.random() * 9, a: Math.random() * 3, k: (i + 0.5) / n, dark: Math.random() < 0.4, drip: Math.random() < 0.35 }));
}

export function drawBackyard(g, t, decor) {
  // house wall
  const W = 1920;
  g.fillStyle = '#9fd6f5'; g.fillRect(0, 0, W, 175);
  g.fillStyle = 'rgba(255,255,255,0.18)'; for (let y = 10; y < 175; y += 26) g.fillRect(0, y, W, 4);
  // windows + door
  ol(g, 5);
  for (const x of [220, 620, 1300, 1700]) {
    g.fillStyle = '#fff'; ui.roundRect(g, x - 80, 30, 160, 110, 14); g.fill(); g.stroke();
    g.fillStyle = '#cdeeff'; ui.roundRect(g, x - 66, 42, 60, 86, 8); g.fill(); ui.roundRect(g, x + 6, 42, 60, 86, 8); g.fill();
    g.fillStyle = '#ff9ccf'; ui.roundRect(g, x - 92, 128, 184, 22, 8); g.fill(); g.stroke();
    for (let k = 0; k < 4; k++) { g.fillStyle = ['#ff5d8f', '#ffd23f', '#ffffff', '#c9a0ff'][k]; g.beginPath(); g.arc(x - 60 + k * 40, 124, 10, 0, TAU); g.fill(); }
  }
  g.fillStyle = '#ff7ab8'; ui.roundRect(g, 900, 10, 120, 170, 16); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(995, 100, 8, 0, TAU); g.fill(); g.stroke();
  // porch deck
  const deck = g.createLinearGradient(0, 170, 0, PORCH_Y);
  deck.addColorStop(0, '#e2b07a'); deck.addColorStop(1, '#cf9558');
  g.fillStyle = deck; g.fillRect(0, 170, W, PORCH_Y - 170);
  g.strokeStyle = 'rgba(120,70,30,0.35)'; g.lineWidth = 3;
  for (let y = 196; y < PORCH_Y; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#b97a3e'; g.fillRect(0, PORCH_Y - 8, W, 16);
  ol(g, 4); g.beginPath(); g.moveTo(0, PORCH_Y + 8); g.lineTo(W, PORCH_Y + 8); g.stroke();
  // lawn
  const gr = g.createLinearGradient(0, PORCH_Y, 0, 1080);
  gr.addColorStop(0, '#7fd66e'); gr.addColorStop(1, '#55c25a');
  g.fillStyle = gr; g.fillRect(0, PORCH_Y + 8, W, 1080 - PORCH_Y);
  g.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 12; i++) if (i % 2) g.fillRect(i * 170, PORCH_Y + 8, 170, 760);
  for (const f of decor) {
    g.save(); g.translate(f.x, f.y); g.scale(f.s, f.s); g.fillStyle = f.c;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(Math.cos(k * TAU / 5) * 6, Math.sin(k * TAU / 5) * 6, 5, 0, TAU); g.fill(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.restore();
  }
  // picket fences at the sides
  for (const side of [0, 1]) {
    const x0 = side ? W - 46 : 6;
    for (let y = PORCH_Y + 30; y < 1060; y += 54) {
      g.fillStyle = '#ffffff'; ol(g, 3);
      g.beginPath(); g.moveTo(x0, y + 50); g.lineTo(x0, y + 10); g.lineTo(x0 + 20, y - 6); g.lineTo(x0 + 40, y + 10); g.lineTo(x0 + 40, y + 50); g.closePath(); g.fill(); g.stroke();
    }
  }
}

export function drawPuddle(g, p, t) {
  g.save(); g.translate(p.x, p.y);
  ol(g, 4);
  g.fillStyle = '#7a4a22';
  g.beginPath();
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * TAU; const r = 1 + Math.sin(a * 3 + p.x) * 0.08; const x = Math.cos(a) * p.rx * r, y = Math.sin(a) * p.ry * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#946033'; g.beginPath(); g.ellipse(-10, -4, p.rx * 0.7, p.ry * 0.55, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(-p.rx * 0.35, -p.ry * 0.3, p.rx * 0.22, p.ry * 0.14, -0.2, 0, TAU); g.fill();
  // bloop bubbles
  const k = (t * 0.8 + p.x * 0.01) % 1;
  g.globalAlpha = 1 - k; g.strokeStyle = '#5e3816'; g.lineWidth = 3;
  g.beginPath(); g.arc(p.rx * 0.3, 0, 4 + k * 10, 0, TAU); g.stroke();
  g.restore();
}

export function drawPool(g, t) {
  const P = POOL;
  g.save(); g.translate(P.x, P.y);
  ol(g, 5);
  // rim
  g.fillStyle = '#ff8fc7'; g.beginPath(); g.ellipse(0, 10, P.rx + 20, P.ry + 22, 0, 0, TAU); g.fill(); g.stroke();
  g.save(); g.beginPath(); g.ellipse(0, 10, P.rx + 20, P.ry + 22, 0, 0, TAU); g.clip();
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 12; i++) { g.save(); g.rotate((i / 12) * TAU); g.fillRect(0, -10, P.rx + 30, 20); g.restore(); }
  g.restore();
  g.fillStyle = '#6fd0ff'; g.beginPath(); g.ellipse(0, 0, P.rx - 4, P.ry - 6, 0, 0, TAU); g.fill(); g.stroke();
  // foam
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + t * 0.2;
    const r = 0.25 + ((i * 37) % 10) / 16;
    g.beginPath(); g.arc(Math.cos(a) * P.rx * r * 0.8, Math.sin(a) * P.ry * r * 0.7 - 6, 22 + Math.sin(t * 2 + i) * 4, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(127,211,255,0.8)'; g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-90 + i * 36, -12 + (i % 2) * 18, 9, 0, TAU); g.stroke(); }
  g.restore();
}

export function drawBed(g, color) {
  ol(g, 4);
  g.fillStyle = color; g.beginPath(); g.ellipse(0, -18, 72, 24, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = mix(color.length === 7 ? color : '#ff9ccf', '#ffffff', 0.5); g.beginPath(); g.ellipse(0, -22, 54, 14, 0, 0, TAU); g.fill();
}

export function drawNozzle(g) {
  ol(g, 3);
  g.fillStyle = '#3fbf5a'; ui.roundRect(g, -16, -9, 34, 18, 7); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; ui.roundRect(g, -10, 6, 12, 14, 4); g.fill(); g.stroke();
  g.fillStyle = '#9aa0b8'; ui.roundRect(g, 16, -7, 14, 14, 4); g.fill(); g.stroke();
}

export function sparkleAt(g, x, y, s, c = '#fff') { g.save(); g.translate(x, y); drawSparkleShape(g, s, c); g.restore(); }
