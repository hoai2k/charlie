// Duckling Parade: procedural art kit (the fallbacks that ship today).
// Every drawer uses local coordinates; callers translate/scale.
import * as ui from '../../engine/ui.js';
import { TAU } from '../../engine/util.js';
import { drawSparkleShape } from '../../engine/emotes.js';

export const NAVY = '#24163f';
export const POND = { x: 960, y: 650, rx: 380, ry: 165 };
export const NEST = { x: 960, y: 405 };

function ol(g, w = 3) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; }

/**
 * A duckling, side view facing right. Origin at the feet. ~62 px tall.
 * o: { quack, golden, swim, blink, wing (0..1 flap), hat, eyesShut }
 */
export function drawDuckling(g, o = {}) {
  const body = o.golden ? '#ffd23f' : '#ffe45c';
  const shade = o.golden ? '#f0a810' : '#f5c531';
  ol(g, 3);
  if (!o.swim) {
    // feet
    g.fillStyle = '#ff9f1c';
    g.beginPath(); g.ellipse(-6, -2, 9, 4, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(8, -2, 9, 4, 0, 0, TAU); g.fill(); g.stroke();
  }
  // tail tuft
  g.fillStyle = body;
  g.beginPath(); g.moveTo(-22, -24); g.lineTo(-34, -34); g.lineTo(-26, -18); g.closePath(); g.fill(); g.stroke();
  // body
  g.beginPath(); g.ellipse(-2, -20, 25, 18, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = shade; g.beginPath(); g.ellipse(-2, -10, 20, 7, 0, 0, Math.PI); g.fill();
  // wing
  g.save(); g.translate(-6, -22); g.rotate(-(o.wing || 0) * 0.9);
  g.fillStyle = shade; g.beginPath(); g.ellipse(-4, 0, 13, 8, -0.25, 0, TAU); g.fill(); g.stroke(); g.restore();
  // head
  g.fillStyle = body;
  g.beginPath(); g.arc(14, -44, 16, 0, TAU); g.fill(); g.stroke();
  // hair tuft
  g.beginPath(); g.moveTo(10, -59); g.quadraticCurveTo(12, -70, 18, -62); g.quadraticCurveTo(20, -70, 24, -60); g.stroke();
  // beak
  g.fillStyle = '#ff9f1c';
  if (o.quack) {
    g.beginPath(); g.moveTo(26, -46); g.lineTo(42, -54); g.lineTo(30, -42); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(26, -40); g.lineTo(40, -32); g.lineTo(28, -37); g.closePath(); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.ellipse(33, -41, 10, 5, 0.1, 0, TAU); g.fill(); g.stroke();
  }
  // eye
  if (o.eyesShut) { g.beginPath(); g.arc(18, -47, 4, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
  else {
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(19, -47, 3.6, o.blink ? 0.8 : 5, 0, 0, TAU); g.fill();
    if (!o.blink) { g.fillStyle = '#fff'; g.beginPath(); g.arc(20, -49, 1.5, 0, TAU); g.fill(); }
  }
  // cheek
  g.fillStyle = 'rgba(255,120,150,0.45)'; g.beginPath(); g.ellipse(12, -38, 5, 3, 0, 0, TAU); g.fill();
  if (o.golden) { g.save(); g.translate(-14, -30); drawSparkleShape(g, 12, '#fff'); g.restore(); }
}

/** Little extras on the duckling's head (origin at the feet, facing right). */
export function drawHat(g, kind, t) {
  if (!kind) return;
  ol(g, 2.5);
  if (kind === 'flower') {
    g.save(); g.translate(14, -62); g.rotate(Math.sin(t * 5) * 0.15);
    const cols = ['#ff7ac6', '#ffffff', '#ff7ac6', '#ffffff', '#ff7ac6'];
    for (let i = 0; i < 5; i++) { g.save(); g.rotate(i * TAU / 5); g.fillStyle = cols[i]; g.beginPath(); g.ellipse(0, -9, 6, 9, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill(); g.stroke();
    g.restore();
  } else if (kind === 'bow') {
    g.save(); g.translate(8, -60); g.fillStyle = '#ff5d9e';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -8); g.lineTo(-12, 8); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(12, -8); g.lineTo(12, 8); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.stroke(); g.restore();
  } else if (kind === 'crown') {
    g.save(); g.translate(14, -60); g.fillStyle = '#ffd23f';
    g.beginPath(); g.moveTo(-11, 0); g.lineTo(-11, -12); g.lineTo(-5, -6); g.lineTo(0, -15); g.lineTo(5, -6); g.lineTo(11, -12); g.lineTo(11, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff4d8d'; g.beginPath(); g.arc(0, -4, 2.5, 0, TAU); g.fill(); g.restore();
  } else if (kind === 'glasses') {
    g.save(); g.translate(20, -47); g.fillStyle = '#2a2350';
    g.beginPath(); g.ellipse(-3, 0, 7, 5, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(10, 0, 6, 5, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, -2); g.lineTo(-2, -3); g.stroke();
    g.restore();
  } else if (kind === 'party') {
    g.save(); g.translate(12, -58); g.rotate(-0.2); g.fillStyle = '#7fd3ff';
    g.beginPath(); g.moveTo(-9, 0); g.lineTo(0, -24); g.lineTo(9, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(0, -25, 4, 0, TAU); g.fill(); g.stroke(); g.restore();
  }
}

/** Mama duck, side view facing right, origin at the feet, ~170 px tall. */
export function drawMama(g, t, o = {}) {
  ol(g, 5);
  g.fillStyle = '#ff9f1c';
  if (!o.sitting) {
    const st = Math.sin(t * 10) * (o.walk ? 8 : 0);
    g.beginPath(); g.ellipse(-14 + st, -4, 18, 7, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(16 - st, -4, 18, 7, 0, 0, TAU); g.fill(); g.stroke();
  }
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(-58, -66); g.lineTo(-86, -96); g.lineTo(-62, -48); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-6, -58, 62, 46, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#e8eef8'; g.beginPath(); g.ellipse(-18, -60, 30, 20, -0.2, 0, TAU); g.fill(); g.stroke();
  // neck + head
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(34, -104, 22, 34, 0.15, 0, TAU); g.fill();
  g.beginPath(); g.arc(40, -136, 30, 0, TAU); g.fill(); g.stroke();
  // beak
  g.fillStyle = '#ff9f1c';
  const q = o.quack ? 1 : 0;
  g.beginPath(); g.moveTo(62, -142); g.quadraticCurveTo(92, -146 - q * 8, 96, -134 - q * 6); g.lineTo(64, -128); g.closePath(); g.fill(); g.stroke();
  if (q) { g.beginPath(); g.moveTo(64, -126); g.lineTo(92, -118); g.lineTo(64, -120); g.closePath(); g.fill(); g.stroke(); }
  // eye
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(48, -144, 5, Math.sin(t * 0.8) > 0.97 ? 1 : 7, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(50, -147, 2, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,120,150,0.5)'; g.beginPath(); g.ellipse(38, -126, 8, 5, 0, 0, TAU); g.fill();
  // bow
  ol(g, 3.5);
  g.save(); g.translate(30, -164); g.fillStyle = '#ff5d9e';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-20, -12); g.lineTo(-20, 12); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(20, -12); g.lineTo(20, 12); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); g.stroke(); g.restore();
}

export function drawNest(g, front = false) {
  // origin: bottom centre, ~300 wide
  ol(g, 4);
  if (!front) {
    g.fillStyle = '#b07a3c'; g.beginPath(); g.ellipse(0, -36, 150, 46, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#7a4f22'; g.beginPath(); g.ellipse(0, -44, 112, 26, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff6e8';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(-80 + i * 32, -46 + (i % 2) * 6, 9, 5, i, 0, TAU); g.fill(); }
    return;
  }
  // front rim (drawn over the ducklings sitting inside)
  g.fillStyle = '#c48a46';
  g.beginPath(); g.ellipse(0, -22, 150, 30, 0, 0, Math.PI); g.lineTo(-150, -30); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#8d5a26'; g.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const x = -130 + i * 23; g.beginPath(); g.moveTo(x, -26); g.quadraticCurveTo(x + 12, -12, x + 24, -22); g.stroke(); }
}

export function drawLily(g, t) {
  ol(g, 3);
  g.fillStyle = '#4fc46a';
  g.beginPath(); g.ellipse(0, 0, 72, 30, 0, 0.25, TAU - 0.05); g.lineTo(0, 0); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(1 + i * 1.1) * 60, Math.sin(1 + i * 1.1) * 24); g.stroke(); }
  g.save(); g.translate(-46, -6);
  ol(g, 2.5);
  for (let i = 0; i < 5; i++) { g.save(); g.rotate(-1.3 + i * 0.65); g.fillStyle = '#ffa3d1'; g.beginPath(); g.ellipse(0, -11, 6, 12, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  g.fillStyle = '#ffe066'; g.beginPath(); g.arc(0, -2, 5, 0, TAU); g.fill();
  g.restore();
}

export function drawReeds(g, t, front = true) {
  ol(g, 3);
  for (let i = 0; i < 7; i++) {
    const x = -60 + i * 20, h = 120 + ((i * 37) % 60), sw = Math.sin(t * 1.6 + i) * 6;
    g.fillStyle = i % 2 ? '#3fae54' : '#56c96a';
    g.beginPath(); g.moveTo(x - 6, 0); g.quadraticCurveTo(x + sw * 0.5, -h * 0.5, x + sw, -h); g.quadraticCurveTo(x + 6 + sw * 0.5, -h * 0.5, x + 7, 0); g.closePath(); g.fill(); g.stroke();
    if (i % 2 === 0) { g.fillStyle = '#8a5a2b'; ui.roundRect(g, x + sw - 6, -h - 4, 12, 34, 6); g.fill(); g.stroke(); }
  }
}

export function drawBoot(g) {
  ol(g, 4);
  g.fillStyle = '#ff4d5e';
  g.beginPath(); g.moveTo(-34, -120); g.lineTo(26, -120); g.lineTo(26, -36); g.quadraticCurveTo(70, -32, 70, -8); g.lineTo(70, 0); g.lineTo(-34, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; for (const [x, y] of [[-14, -96], [10, -70], [-18, -44], [40, -16], [8, -20]]) { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
  g.fillStyle = '#c7303f'; g.beginPath(); g.ellipse(-4, -120, 30, 9, 0, 0, TAU); g.fill(); g.stroke();
}
export function drawBootRim(g) {
  ol(g, 4); g.fillStyle = '#ff4d5e';
  g.beginPath(); g.ellipse(-4, -120, 30, 9, 0, 0, Math.PI); g.stroke();
  g.beginPath(); g.moveTo(-34, -120); g.lineTo(-34, -100); g.lineTo(26, -100); g.lineTo(26, -120); g.ellipse(-4, -120, 30, 9, 0, 0, Math.PI); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-34, -120); g.lineTo(-34, -100); g.moveTo(26, -120); g.lineTo(26, -100); g.stroke();
}

export function drawBush(g, t) {
  ol(g, 4);
  g.fillStyle = '#4bb95c';
  const blobs = [[-62, -40, 42], [62, -40, 42], [-30, -74, 46], [30, -74, 46], [0, -46, 56]];
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); }
  g.beginPath(); for (const [x, y, r] of blobs) { g.moveTo(x + r - 4, y); g.arc(x, y, r - 4, 0, TAU); } g.fill();
  for (let i = 0; i < 9; i++) {
    const x = -80 + ((i * 47) % 160), y = -24 - ((i * 31) % 90);
    g.save(); g.translate(x, y); g.rotate(t * 0.3 + i);
    g.fillStyle = i % 2 ? '#ffffff' : '#ff8fc7';
    for (let k = 0; k < 5; k++) { g.rotate(TAU / 5); g.beginPath(); g.ellipse(0, -6, 4, 6, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill(); g.restore();
  }
}

export function drawMushroom(g) {
  ol(g, 4);
  g.fillStyle = '#fff3dc'; ui.roundRect(g, -20, -56, 40, 56, 14); g.fill(); g.stroke();
  g.fillStyle = '#ff5d6c'; g.beginPath(); g.moveTo(-70, -48); g.quadraticCurveTo(-64, -130, 0, -132); g.quadraticCurveTo(64, -130, 70, -48); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; for (const [x, y, r] of [[-34, -82, 12], [10, -108, 10], [36, -72, 11], [-6, -66, 7]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
}

/** The meadow and pond (drawn when there is no bg art). */
export function drawMeadow(g, t, decor) {
  const sky = g.createLinearGradient(0, 0, 0, 260);
  sky.addColorStop(0, '#8fd6ff'); sky.addColorStop(1, '#d8f3ff');
  g.fillStyle = sky; g.fillRect(0, 0, W(), 260);
  // sun
  g.save(); g.translate(1700, 90); g.fillStyle = 'rgba(255,246,168,0.45)';
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(60, -10); g.lineTo(140 + Math.sin(t * 2 + i) * 10, 0); g.lineTo(60, 10); g.fill(); }
  g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.fill(); g.restore();
  for (let i = 0; i < 5; i++) ui.cloud(g, ((i * 430 + t * (12 + i * 3)) % 2400) - 240, 60 + (i % 2) * 70, 0.7 + (i % 3) * 0.2, '#fff', 0.9);
  ui.hills(g, 190, '#9fe08a', 30, 0.004, 0.5);
  // far trees
  for (let i = 0; i < 9; i++) {
    const x = 90 + i * 225 + (i % 2) * 40, y = 220;
    g.fillStyle = '#8a5a2b'; g.fillRect(x - 7, y - 30, 14, 34);
    g.fillStyle = i % 2 ? '#3fae54' : '#4fc46a'; g.beginPath(); g.arc(x, y - 52, 38, 0, TAU); g.arc(x - 26, y - 34, 26, 0, TAU); g.arc(x + 26, y - 34, 26, 0, TAU); g.fill();
  }
  // grass
  const gr = g.createLinearGradient(0, 220, 0, 1080);
  gr.addColorStop(0, '#8ee07a'); gr.addColorStop(1, '#5cc65a');
  g.fillStyle = gr; g.fillRect(0, 225, W(), 1080 - 225);
  // mown stripes
  g.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 12; i++) if (i % 2) g.fillRect(i * 170, 225, 170, 860);
  // flowers
  for (const f of decor) {
    g.save(); g.translate(f.x, f.y); g.scale(f.s, f.s);
    g.fillStyle = f.c; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(Math.cos(k * TAU / 5) * 6, Math.sin(k * TAU / 5) * 6, 5, 0, TAU); g.fill(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.restore();
  }
  drawPond(g, t);
}

export function drawPond(g, t) {
  const P = POND;
  g.save();
  g.fillStyle = '#e8d39a'; g.beginPath(); g.ellipse(P.x, P.y + 8, P.rx + 26, P.ry + 22, 0, 0, TAU); g.fill();
  const wg = g.createLinearGradient(0, P.y - P.ry, 0, P.y + P.ry);
  wg.addColorStop(0, '#5cc8f5'); wg.addColorStop(1, '#3a9fe0');
  g.fillStyle = wg; g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.fill();
  ol(g, 4); g.stroke();
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 4;
  for (let i = 0; i < 7; i++) {
    const x = P.x - 300 + ((i * 113 + t * 20) % 600), y = P.y - 110 + ((i * 53) % 220);
    g.beginPath(); g.moveTo(x - 30, y); g.quadraticCurveTo(x - 15, y - 6, x, y); g.quadraticCurveTo(x + 15, y + 6, x + 30, y); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 9; i++) { const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); g.save(); g.globalAlpha = a; g.translate(P.x - 320 + i * 80, P.y - 100 + ((i * 71) % 200)); drawSparkleShape(g, 12, '#fff'); g.restore(); }
  g.restore();
}

const W = () => 1920;
