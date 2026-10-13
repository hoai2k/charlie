// Muddy Mayhem: procedural art kit (the fallbacks that ship today). The puppy,
// puddle and backyard drawing started life in Puppy Splash and were copied
// here so this game stays self-contained.
import * as ui from '../../engine/ui.js';
import { TAU, clamp, rand } from '../../engine/util.js';

export const NAVY = '#24163f';
export const PORCH_Y = 330;
export const LINE_Y = 330;                 // washing line height (sheet tops)
export const POSTS = [230, 1690];
export const MEGA = { x: 960, y: 748, rx: 215, ry: 80 };
export const PUDDLES = [
  { x: 600, y: 705, rx: 122, ry: 50 }, { x: 1330, y: 700, rx: 122, ry: 50 },
  { x: 330, y: 930, rx: 128, ry: 52 }, { x: 1600, y: 935, rx: 128, ry: 52 },
];
export const MUD = '#7a4a22';
export const MUD_DARK = '#5e3816';
export const MUD_COLS = ['#7a4a22', '#946033', '#5e3816'];

// ---------------------------------------------------------------- helpers
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, k) {
  const A = hex(a), B = hex(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}
export function ol(g, w = 3) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; }

// ---------------------------------------------------------------- puppies
export const BREEDS = [
  { body: '#ffe2b0', ear: '#e8b070', patch: null, spots: false, fluffy: false },   // golden
  { body: '#ffffff', ear: '#f4ecff', patch: null, spots: false, fluffy: true },    // poodle
  { body: '#ffffff', ear: '#a8682e', patch: '#c98a48', spots: false, fluffy: false }, // beagle
  { body: '#ffffff', ear: '#2f2a45', patch: null, spots: true, fluffy: false },    // spotty
];

/** A puppy, side view facing right, origin at the feet, ~100 px tall. */
export function drawPuppy(g, o) {
  const B = BREEDS[o.breed % BREEDS.length];
  const mud = o.mud || 0;
  const body = mix(B.body, '#9a6a3a', mud * 0.55);
  const ear = mix(B.ear, MUD, mud * 0.4);
  const t = o.t || 0;
  const leg = Math.sin(t * 18) * (o.run || 0);
  ol(g, 3.5);
  const wag = Math.sin(t * (o.wag ? 22 : 6)) * (o.wag ? 0.6 : 0.2);
  g.save(); g.translate(-44, -58); g.rotate(-0.9 + wag);
  g.fillStyle = body; ui.roundRect(g, -7, -34, 14, 36, 7); g.fill(); g.stroke();
  if (B.fluffy) { g.beginPath(); g.arc(0, -34, 11, 0, TAU); g.fill(); g.stroke(); }
  g.restore();
  g.fillStyle = body;
  const legs = o.sit ? [[-30, 0], [26, 0]] : [[-34, leg * 8], [-18, -leg * 8], [18, leg * 8], [32, -leg * 8]];
  for (const [x, dx] of legs) { ui.roundRect(g, x - 8 + dx * 0.4, -34, 16, 34, 7); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(0, -50, 52, 28, 0, 0, TAU); g.fill(); g.stroke();
  if (B.fluffy) {
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.beginPath(); g.arc(Math.cos(a) * 46, -50 + Math.sin(a) * 24, 11, 0, TAU); g.fill(); g.stroke(); }
    g.beginPath(); g.ellipse(0, -48, 48, 24, 0, 0, TAU); g.fill();
  }
  if (B.patch) { g.fillStyle = mix(B.patch, MUD, mud * 0.4); g.beginPath(); g.ellipse(-10, -60, 26, 16, 0, 0, TAU); g.fill(); }
  if (B.spots) { g.fillStyle = '#2f2a45'; for (const [x, y, r] of [[-24, -56, 8], [6, -62, 6], [18, -44, 7], [-6, -40, 5]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
  g.save(); g.translate(44, -78);
  if (o.bark) g.rotate(-0.25);
  g.fillStyle = body;
  g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill(); g.stroke();
  if (B.fluffy) { for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-18 + i * 9, -26 + Math.abs(i - 2) * 3, 10, 0, TAU); g.fill(); g.stroke(); } g.beginPath(); g.arc(0, 0, 27, 0, TAU); g.fill(); }
  if (B.patch) { g.fillStyle = mix(B.patch, MUD, mud * 0.4); g.beginPath(); g.ellipse(-8, -10, 18, 14, 0.4, 0, TAU); g.fill(); }
  g.fillStyle = mix('#fff6ec', '#9a6a3a', mud * 0.5);
  g.beginPath(); g.ellipse(24, 8, 16, 12, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(37, 3, 6, 5, 0, 0, TAU); g.fill();
  if (o.bark) {
    g.fillStyle = '#7a2440'; g.beginPath(); g.ellipse(26, 20, 10, 8, 0, 0, TAU); g.fill(); g.stroke();
  } else if (o.tongue) {
    g.fillStyle = '#ff7a9a'; g.beginPath(); g.ellipse(24, 22 + Math.sin(t * 10) * 1.5, 6, 9, 0, 0, TAU); g.fill(); g.stroke();
  }
  if (o.eyesShut) { g.beginPath(); g.arc(8, -6, 6, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); }
  else { g.fillStyle = NAVY; g.beginPath(); g.ellipse(9, -6, 5.5, 7, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(11, -9, 2.2, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,120,150,0.4)'; g.beginPath(); g.ellipse(4, 10, 7, 4, 0, 0, TAU); g.fill();
  const ef = o.shake ? Math.sin(t * 50) * 0.8 : Math.sin(t * 4) * 0.08;
  g.save(); g.translate(-12, -16); g.rotate(0.3 + ef);
  g.fillStyle = ear; g.beginPath(); g.ellipse(0, 18, 11, 22, 0.1, 0, TAU); g.fill(); g.stroke(); g.restore();
  g.restore();
}

/** Mud splotches over a puppy (same space as drawPuppy). */
export function drawMudBlobs(g, blobs, mud, t) {
  if (mud <= 0.001) return;
  g.save();
  for (const b of blobs) {
    if (b.k > mud) continue;
    g.globalAlpha = 0.9 * clamp((mud - b.k) / 0.08, 0, 1);
    g.fillStyle = b.dark ? MUD_DARK : MUD;
    g.beginPath(); g.ellipse(b.x, b.y, b.r * 1.15, b.r * 0.85, b.a, 0, TAU); g.fill();
    g.beginPath(); g.arc(b.x + b.r * 0.8, b.y + b.r * 0.5, b.r * 0.35, 0, TAU); g.fill();
    if (b.drip) { g.beginPath(); g.ellipse(b.x, b.y + b.r + 6 + Math.sin(t * 3 + b.x) * 2, 4, 8, 0, 0, TAU); g.fill(); }
  }
  g.restore();
}

export function makeBlobs(n = 11) {
  const spots = [[-30, -54], [-6, -60], [20, -50], [-20, -38], [10, -40], [38, -86], [52, -70], [30, -98], [-36, -20], [26, -16], [-44, -66], [0, -50]];
  return spots.slice(0, n).map(([x, y], i) => ({ x: x + rand(-5, 5), y: y + rand(-4, 4), r: 10 + rand(9), a: rand(3), k: (i + 0.5) / n, dark: Math.random() < 0.4, drip: Math.random() < 0.35 }));
}

// ---------------------------------------------------------------- backyard
export function drawBackyard(g, t, decor) {
  const W = 1920;
  // cottage wall (cream boards)
  g.fillStyle = '#fff1d6'; g.fillRect(0, 0, W, 175);
  g.fillStyle = 'rgba(214,170,120,0.25)'; for (let y = 14; y < 175; y += 24) g.fillRect(0, y, W, 3);
  ol(g, 5);
  for (const x of [230, 620, 1300, 1690]) {
    g.fillStyle = '#ffffff'; ui.roundRect(g, x - 80, 26, 160, 112, 14); g.fill(); g.stroke();
    g.fillStyle = '#cdeeff'; ui.roundRect(g, x - 66, 38, 60, 88, 8); g.fill(); ui.roundRect(g, x + 6, 38, 60, 88, 8); g.fill();
    // lace curtains
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 66, 38); g.quadraticCurveTo(x + s * 30, 70, x + s * 50, 126); g.lineTo(x + s * 66, 126); g.closePath(); g.fill(); }
    g.fillStyle = '#ffb3cf'; ui.roundRect(g, x - 92, 128, 184, 22, 8); g.fill(); g.stroke();
    for (let k = 0; k < 4; k++) { g.fillStyle = ['#ff5d8f', '#ffd23f', '#ffffff', '#c9a0ff'][k]; g.beginPath(); g.arc(x - 60 + k * 40, 124, 10, 0, TAU); g.fill(); }
  }
  g.fillStyle = '#8fd8d0'; ui.roundRect(g, 900, 10, 120, 170, 16); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(995, 100, 8, 0, TAU); g.fill(); g.stroke();
  // porch deck
  const deck = g.createLinearGradient(0, 170, 0, PORCH_Y);
  deck.addColorStop(0, '#e2b07a'); deck.addColorStop(1, '#cf9558');
  g.fillStyle = deck; g.fillRect(0, 170, W, PORCH_Y - 170);
  g.strokeStyle = 'rgba(120,70,30,0.35)'; g.lineWidth = 3;
  for (let y = 196; y < PORCH_Y; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#b97a3e'; g.fillRect(0, PORCH_Y - 8, W, 16);
  ol(g, 4); g.beginPath(); g.moveTo(0, PORCH_Y + 8); g.lineTo(W, PORCH_Y + 8); g.stroke();
  // geranium pots
  for (const x of [70, W - 70]) {
    g.fillStyle = '#e07a4a'; ol(g, 4); g.beginPath(); g.moveTo(x - 36, 250); g.lineTo(x + 36, 250); g.lineTo(x + 26, 310); g.lineTo(x - 26, 310); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#4caf50'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x - 30 + k * 15, 238 - (k % 2) * 10, 16, 0, TAU); g.fill(); }
    g.fillStyle = '#ff4d6d'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x - 24 + k * 16, 222 - (k % 2) * 12, 9, 0, TAU); g.fill(); }
  }
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
}

/** Washing-line posts and the sagging line (drawn behind the sheets). */
export function drawLine(g, t) {
  ol(g, 5);
  for (const x of POSTS) {
    g.fillStyle = '#c98a48'; ui.roundRect(g, x - 10, LINE_Y - 30, 20, 590 - LINE_Y, 6); g.fill(); g.stroke();
    g.fillStyle = '#e2b07a'; ui.roundRect(g, x - 40, LINE_Y - 34, 80, 16, 6); g.fill(); g.stroke();
    g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(x, 590, 34, 9, 0, 0, TAU); g.fill();
  }
  g.strokeStyle = '#f4ecff'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(POSTS[0], LINE_Y - 26); g.quadraticCurveTo(960, LINE_Y + 18, POSTS[1], LINE_Y - 26); g.stroke();
}
/** Height of the line at x (matches the sag in drawLine). */
export function lineY(x) {
  const u = (x - POSTS[0]) / (POSTS[1] - POSTS[0]);
  return LINE_Y - 26 + 4 * u * (1 - u) * 22;
}

export function drawPuddle(g, p, t, scale = 1) {
  g.save(); g.translate(p.x, p.y); g.scale(scale, scale);
  ol(g, 4);
  g.fillStyle = MUD;
  g.beginPath();
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * TAU; const r = 1 + Math.sin(a * 3 + p.x) * 0.08; const x = Math.cos(a) * p.rx * r, y = Math.sin(a) * p.ry * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#946033'; g.beginPath(); g.ellipse(-10, -4, p.rx * 0.7, p.ry * 0.55, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(-p.rx * 0.35, -p.ry * 0.3, p.rx * 0.22, p.ry * 0.14, -0.2, 0, TAU); g.fill();
  const k = (t * 0.8 + p.x * 0.01) % 1;
  g.globalAlpha = 1 - k; g.strokeStyle = MUD_DARK; g.lineWidth = 3;
  g.beginPath(); g.arc(p.rx * 0.3, 0, 4 + k * 10, 0, TAU); g.stroke();
  g.restore();
}

/** The giant bubbling puddle; k = size 0..1, boil = 0..1 bubbling. */
export function drawMegaPuddle(g, t, k, boil = 0) {
  if (k <= 0.01) return;
  const P = MEGA;
  g.save(); g.translate(P.x, P.y); g.scale(k, k);
  ol(g, 5);
  g.fillStyle = MUD_DARK;
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU; const r = 1 + Math.sin(a * 4 + t * 2) * 0.05 + Math.sin(a * 7) * 0.04; const x = Math.cos(a) * P.rx * r, y = Math.sin(a) * P.ry * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = MUD; g.beginPath(); g.ellipse(-14, -6, P.rx * 0.76, P.ry * 0.6, 0, 0, TAU); g.fill();
  g.fillStyle = '#a8703c'; g.beginPath(); g.ellipse(-30, -14, P.rx * 0.4, P.ry * 0.28, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(-P.rx * 0.4, -P.ry * 0.38, P.rx * 0.2, P.ry * 0.12, -0.2, 0, TAU); g.fill();
  // bubbles
  for (let i = 0; i < 7; i++) {
    const ph = (t * (0.9 + boil * 1.6) + i * 0.37) % 1;
    const bx = Math.cos(i * 2.4) * P.rx * 0.55, by = Math.sin(i * 1.7) * P.ry * 0.45;
    const r = (8 + (i % 3) * 7) * (0.4 + ph) * (1 + boil * 0.6);
    g.globalAlpha = 1 - ph * 0.6;
    g.fillStyle = '#a8703c'; g.beginPath(); g.arc(bx, by - r * 0.4, r, Math.PI, 0); g.fill();
    g.strokeStyle = MUD_DARK; g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(bx - r * 0.35, by - r * 0.8, r * 0.22, 0, TAU); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- targets
const SHEET_W = 230, SHEET_H = 205;
const SHEET_TRIM = ['#ffb3d9', '#9fd6ff', '#ffe066', '#c9b3ff'];

/** Outline paths for each target kind (local space). Used to fill and to clip splats. */
export function targetPath(g, T, sway = 0) {
  g.beginPath();
  if (T.kind === 'sheet') {
    const w = SHEET_W / 2, h = SHEET_H, s = sway * 22;
    g.moveTo(-w, 0); g.lineTo(w, 0);
    g.quadraticCurveTo(w + s * 0.6, h * 0.5, w + s, h - 6);
    for (let i = 0; i <= 6; i++) { const x = w + s - (i / 6) * (2 * w); g.quadraticCurveTo(x + w / 6, h + (i % 2 ? 10 : -4), x, h - 4); }
    g.quadraticCurveTo(-w + s * 0.6, h * 0.5, -w, 0);
  } else if (T.kind === 'rug') {
    ui.roundRect(g, -165, -68, 330, 136, 26);
  } else if (T.kind === 'basket') {
    g.moveTo(-90, -96); g.lineTo(90, -96); g.lineTo(72, 0); g.lineTo(-72, 0); g.closePath();
    g.moveTo(-80, -96); g.ellipse(0, -112, 80, 30, 0, Math.PI, 0); g.ellipse(-6, -150, 60, 26, 0, 0, TAU);
  } else if (T.kind === 'fence') {
    for (let i = 0; i < 5; i++) {
      const x = -136 + i * 62;
      g.moveTo(x, 0); g.lineTo(x, -112); g.lineTo(x + 20, -136); g.lineTo(x + 40, -112); g.lineTo(x + 40, 0); g.closePath();
    }
    g.rect(-150, -96, 300, 20); g.rect(-150, -40, 300, 20);
  }
}

/** Draw a clean target (procedural). */
export function drawTarget(g, T, t) {
  ol(g, 4);
  if (T.kind === 'sheet') {
    const sway = T.sway;
    g.fillStyle = '#ffffff'; targetPath(g, T, sway); g.fill(); g.stroke();
    // soft fold shading + pastel trim
    g.save(); targetPath(g, T, sway); g.clip();
    g.fillStyle = 'rgba(159,214,255,0.22)';
    for (const fx of [-60, 10, 70]) { g.beginPath(); g.ellipse(fx + sway * 14, 120, 12, 110, 0, 0, TAU); g.fill(); }
    g.fillStyle = SHEET_TRIM[T.n % SHEET_TRIM.length];
    g.fillRect(-140, SHEET_H - 26, 300, 30);
    if (T.n % 2 === 0) { g.fillStyle = 'rgba(255,179,217,0.35)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(-90 + (k % 3) * 90 + sway * 10, 40 + Math.floor(k / 3) * 50, 9, 0, TAU); g.fill(); } }
    g.restore();
    // pegs
    for (const px of [-95, 95]) { g.fillStyle = '#e2b07a'; ol(g, 3); ui.roundRect(g, px - 6, -16, 12, 30, 4); g.fill(); g.stroke(); }
  } else if (T.kind === 'rug') {
    // fringe
    g.strokeStyle = '#fff6e0'; g.lineWidth = 4;
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { const y = -56 + k * 14; g.beginPath(); g.moveTo(s * 165, y); g.lineTo(s * 184, y + 2); g.stroke(); }
    ol(g, 4); g.fillStyle = '#fffaf0'; targetPath(g, T); g.fill(); g.stroke();
    g.strokeStyle = '#ffb3cf'; g.lineWidth = 8; ui.roundRect(g, -146, -50, 292, 100, 18); g.stroke();
    // roses in the corners and middle
    for (const [x, y, r] of [[-120, -38, 11], [120, -38, 11], [-120, 38, 11], [120, 38, 11], [0, 0, 22]]) {
      g.fillStyle = '#ff9ccf'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.strokeStyle = '#e0609a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.5, 0, 5); g.stroke();
      g.fillStyle = '#7fd66e'; g.beginPath(); g.ellipse(x + r * 1.2, y + r * 0.3, r * 0.6, r * 0.3, 0.5, 0, TAU); g.fill();
    }
  } else if (T.kind === 'basket') {
    // towels (behind the rim)
    ol(g, 4);
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -112, 80, 30, 0, Math.PI, 0); g.fill(); g.stroke();
    g.fillStyle = '#f2f8ff'; ui.roundRect(g, -64, -150, 116, 34, 14); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; ui.roundRect(g, -54, -176, 96, 30, 12); g.fill(); g.stroke();
    // frilly pillowcase
    for (let k = 0; k < 6; k++) { g.fillStyle = '#ffe3f0'; g.beginPath(); g.arc(-48 + k * 17, -176, 8, Math.PI, 0); g.fill(); }
    // wicker
    g.fillStyle = '#e8b878'; ol(g, 4);
    g.beginPath(); g.moveTo(-90, -96); g.lineTo(90, -96); g.lineTo(72, 0); g.lineTo(-72, 0); g.closePath(); g.fill(); g.stroke();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(160,100,40,0.5)'; g.lineWidth = 3;
    for (let y = -84; y < 0; y += 16) { g.beginPath(); g.moveTo(-95, y); g.lineTo(95, y); g.stroke(); }
    for (let x = -90; x < 90; x += 22) { g.beginPath(); g.moveTo(x, -96); g.lineTo(x * 0.8, 0); g.stroke(); }
    g.restore();
    g.fillStyle = '#d9a35e'; ui.roundRect(g, -96, -104, 192, 18, 9); g.fill(); g.stroke();
  } else if (T.kind === 'fence') {
    g.fillStyle = '#ffffff'; ol(g, 4); targetPath(g, T); g.fill(); g.stroke();
    g.fillStyle = 'rgba(159,214,255,0.25)';
    for (let i = 0; i < 5; i++) g.fillRect(-136 + i * 62 + 28, -110, 8, 106);
  }
}

/** A splat shape (centred at 0,0) built once with random lobes and droplets. */
export function makeSplat(r, dark = false) {
  const n = 9;
  const lobes = Array.from({ length: n }, (_, i) => 0.72 + Math.random() * 0.45 + (i % 3 === 0 ? 0.25 : 0));
  const drops = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => ({ a: rand(TAU), d: rand(1.3, 1.9), r: rand(0.1, 0.22) }));
  return { r, rot: rand(TAU), lobes, drops, col: dark ? MUD_DARK : Math.random() < 0.5 ? MUD : '#86522a', drip: Math.random() < 0.5 ? rand(0.4, 1.1) : 0 };
}

export function drawSplat(g, s, x, y, grow = 1) {
  const r = s.r * grow;
  g.save(); g.translate(x, y); g.rotate(s.rot);
  g.fillStyle = s.col;
  g.beginPath();
  const n = s.lobes.length;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, rr = r * s.lobes[i % n];
    const am = ((i - 0.5) / n) * TAU, rm = r * 0.7;
    if (!i) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else g.quadraticCurveTo(Math.cos(am) * rm * 1.25, Math.sin(am) * rm * 1.25, Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
  for (const d of s.drops) { g.beginPath(); g.arc(Math.cos(d.a) * r * d.d, Math.sin(d.a) * r * d.d, r * d.r, 0, TAU); g.fill(); }
  g.rotate(-s.rot);
  if (s.drip) { g.beginPath(); g.ellipse(r * 0.1, r * 0.6 + r * s.drip * 0.5, r * 0.12, r * s.drip * 0.6, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.3, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- Granny Goose
/**
 * Granny Goose, facing right, origin at her feet, ~230 px tall.
 * o: { t, pose: 'walk'|'alert'|'spray'|'gasp'|'slip'|'sit', mud 0..1, step (walk phase) }
 * Returns the nozzle point in local space.
 */
export function drawGoose(g, o) {
  const t = o.t || 0, pose = o.pose || 'walk';
  const walk = pose === 'walk' ? Math.sin(o.step || 0) : 0;
  const sit = pose === 'sit';
  const lean = pose === 'spray' ? 0.14 : pose === 'gasp' || pose === 'alert' ? -0.1 : walk * 0.06;
  const open = pose === 'alert' || pose === 'gasp' || (sit && Math.sin(t * 14) > 0);
  ol(g, 4);
  g.save();
  // feet and legs
  if (!sit) {
    g.strokeStyle = '#ff9a2e'; g.lineWidth = 7;
    for (const [fx, ph] of [[-18, 0], [18, Math.PI]]) {
      const lift = pose === 'walk' ? Math.max(0, Math.sin((o.step || 0) + ph)) * 10 : 0;
      g.beginPath(); g.moveTo(fx, -40); g.lineTo(fx, -6 - lift); g.stroke();
      g.fillStyle = '#ff9a2e'; ol(g, 3); g.beginPath(); g.moveTo(fx - 8, -lift); g.lineTo(fx + 22, -lift); g.lineTo(fx + 6, -14 - lift); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#ff9a2e'; g.lineWidth = 7;
    }
  } else {
    // feet poking up out of the puddle
    g.fillStyle = '#ff9a2e'; ol(g, 3);
    for (const fx of [62, 84]) { g.beginPath(); g.moveTo(fx, -30); g.lineTo(fx + 18, -48 - Math.sin(t * 9 + fx) * 6); g.lineTo(fx - 4, -50); g.closePath(); g.fill(); g.stroke(); }
  }
  g.translate(0, sit ? 34 : 0);
  g.rotate(lean);
  // tail
  ol(g, 4); g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(-50, -110); g.lineTo(-86, -132 + walk * 4); g.lineTo(-58, -86); g.closePath(); g.fill(); g.stroke();
  // body
  g.beginPath(); g.ellipse(-4, -86, 64, 54, 0, 0, TAU); g.fill(); g.stroke();
  // apron
  g.save(); g.beginPath(); g.ellipse(-4, -86, 64, 54, 0, 0, TAU); g.clip();
  g.fillStyle = '#c9b3ff'; g.beginPath(); g.ellipse(14, -64, 46, 44, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(-26 + k * 12, -26, 7, 0, Math.PI); g.fill(); }
  g.fillStyle = '#b39ce8'; ui.roundRect(g, 4, -70, 30, 22, 6); g.fill(); g.stroke();
  g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(19, -60, 4, 0, TAU); g.fill();
  g.restore();
  // neck + head
  const headBack = pose === 'gasp' ? -10 : pose === 'spray' ? 12 : 0;
  const hx = 44 + headBack, hy = -196 + (pose === 'alert' ? -6 : 0);
  g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 36;
  g.beginPath(); g.moveTo(22, -120); g.quadraticCurveTo(50, -150, hx - 2, hy + 10); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 28; g.stroke();
  // pearls
  g.fillStyle = '#fffaf0'; ol(g, 2);
  for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(14 + k * 7, -128 + Math.abs(k - 2.5) * 2.5, 4.5, 0, TAU); g.fill(); g.stroke(); }
  ol(g, 4);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hx, hy, 27, 0, TAU); g.fill(); g.stroke();
  // curlers + hairnet
  const pop = pose === 'gasp' ? 1 : 0;
  for (const [cx, cy, a, c] of [[-14, -24, -0.5, '#ff9ccf'], [2, -30, 0, '#9fd6ff'], [18, -24 - pop * 14, 0.5 + pop, '#ffe066']]) {
    g.save(); g.translate(hx + cx, hy + cy); g.rotate(a);
    g.fillStyle = c; ol(g, 3); ui.roundRect(g, -10, -7, 20, 14, 6); g.fill(); g.stroke();
    g.restore();
  }
  g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 1.5; g.setLineDash([3, 4]);
  g.beginPath(); g.arc(hx, hy - 6, 30, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.setLineDash([]);
  // beak
  g.fillStyle = '#ff9a2e'; ol(g, 3);
  if (open) {
    g.beginPath(); g.moveTo(hx + 20, hy - 6); g.lineTo(hx + 52, hy - 14); g.lineTo(hx + 22, hy + 2); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(hx + 20, hy + 6); g.lineTo(hx + 48, hy + 16); g.lineTo(hx + 20, hy + 14); g.closePath(); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.moveTo(hx + 20, hy - 6); g.quadraticCurveTo(hx + 50, hy - 2, hx + 54, hy + 4); g.lineTo(hx + 20, hy + 9); g.closePath(); g.fill(); g.stroke();
  }
  // eye + spectacles
  const ex = hx + 8, ey = hy - 6;
  if (sit) { g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(ex, ey + 2, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else {
    const big = pose === 'alert' || pose === 'gasp' ? 1.5 : 1;
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(ex + (pose === 'spray' ? 3 : 0), ey, 4 * big, 5 * big, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + 1.5, ey - 2, 1.6 * big, 0, TAU); g.fill();
    if (pose === 'spray') { g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(ex - 8, ey - 12); g.lineTo(ex + 8, ey - 8); g.stroke(); }
  }
  g.strokeStyle = '#d9a300'; g.lineWidth = 2.5; g.beginPath(); g.arc(ex, ey, 10, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(ex - 10, ey); g.lineTo(hx - 20, ey - 4); g.stroke();
  g.fillStyle = 'rgba(255,120,150,0.45)'; g.beginPath(); g.ellipse(hx + 2, hy + 10, 7, 4, 0, 0, TAU); g.fill();
  // wing
  let nozzle = null;
  ol(g, 4); g.fillStyle = '#f4f0fa';
  if (pose === 'spray') {
    g.save(); g.translate(10, -104); g.rotate(-0.15);
    g.beginPath(); g.ellipse(36, 0, 46, 18, 0, 0, TAU); g.fill(); g.stroke();
    // nozzle
    g.fillStyle = '#3fbf5a'; ol(g, 3); ui.roundRect(g, 70, -10, 36, 20, 7); g.fill(); g.stroke();
    g.fillStyle = '#9aa0b8'; ui.roundRect(g, 104, -7, 12, 14, 4); g.fill(); g.stroke();
    g.restore();
    nozzle = { x: 10 + 118 * Math.cos(-0.15), y: -104 + 118 * Math.sin(-0.15) };
  } else if (pose === 'alert' || pose === 'gasp' || sit) {
    for (const s of [-1, 1]) {
      g.save(); g.translate(s < 0 ? -30 : 20, -110); g.rotate(s * -0.9 + Math.sin(t * (sit ? 16 : 10)) * 0.15 - 1.0);
      g.beginPath(); g.ellipse(0, -30, 18, 40, 0, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
  } else {
    g.save(); g.translate(-14, -92); g.rotate(-0.25 + walk * 0.1);
    g.beginPath(); g.ellipse(0, 0, 44, 24, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(36,22,63,0.3)'; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-26 + k * 14, 6); g.lineTo(-14 + k * 14, 18); g.stroke(); }
    g.restore();
    // nozzle held low at her side
    g.save(); g.translate(28, -76); g.rotate(0.6);
    g.fillStyle = '#3fbf5a'; ol(g, 3); ui.roundRect(g, -6, -9, 32, 18, 7); g.fill(); g.stroke();
    g.restore();
  }
  // mud on her (finale)
  if (o.mud > 0) {
    g.globalAlpha = clamp(o.mud, 0, 1);
    for (const [x, y, r] of [[-30, -100, 18], [10, -70, 14], [30, -110, 12], [-10, -130, 10], [hx - 10, hy - 14, 10], [hx + 14, hy + 8, 7], [-50, -70, 12]]) {
      g.fillStyle = MUD; g.beginPath(); g.ellipse(x, y, r * 1.2, r, 0.3, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(x + 2, y + r + 5, 3.5, 7, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
  g.restore();
  return nozzle || { x: 60, y: -90 };
}

// ---------------------------------------------------------------- thumbnail
export function drawThumb(g, x, y, w, h, t, ICON_BLOBS, ICON_SPLATS) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = w / 400;
  g.translate(x, y); g.scale(s, s);
  const hh = h / s;
  const gr = g.createLinearGradient(0, 0, 0, hh);
  gr.addColorStop(0, '#fff1d6'); gr.addColorStop(0.2, '#fff1d6'); gr.addColorStop(0.21, '#d9a46a'); gr.addColorStop(0.32, '#d9a46a'); gr.addColorStop(0.33, '#7fd66e'); gr.addColorStop(1, '#55c25a');
  g.fillStyle = gr; g.fillRect(0, 0, 400, hh);
  // line + sheet
  g.strokeStyle = '#f4ecff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-10, 40); g.quadraticCurveTo(200, 60, 410, 40); g.stroke();
  g.save(); g.translate(150, 50); g.scale(0.82, 0.82);
  const T = { kind: 'sheet', sway: Math.sin(t * 2) * 0.4, n: 0 };
  drawTarget(g, T, t);
  g.save(); targetPath(g, T, T.sway); g.clip();
  ICON_SPLATS.forEach((sp, i) => drawSplat(g, sp.s, sp.x, sp.y, Math.min(1, (t * 2 + i * 0.3) % 6 / 0.3)));
  g.restore();
  g.restore();
  // goose peeking
  g.save(); g.translate(330, hh * 0.88); g.scale(-0.55, 0.55); drawGoose(g, { t, pose: 'gasp' }); g.restore();
  // muddy puppy shaking
  g.save(); g.translate(105, hh * 0.95); g.scale(0.85, 0.85); g.rotate(Math.sin(t * 30) * 0.08);
  drawPuppy(g, { breed: 1, mud: 0.8, t, shake: 1, eyesShut: true, wag: true });
  drawMudBlobs(g, ICON_BLOBS, 0.8, t);
  g.restore();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + t * 2; g.fillStyle = i % 2 ? MUD : MUD_DARK; g.beginPath(); g.arc(130 + Math.cos(a) * (70 + (t * 60 + i * 9) % 30), hh * 0.8 + Math.sin(a) * 40, 7, 0, TAU); g.fill(); }
  g.restore();
}
