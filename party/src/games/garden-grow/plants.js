// Procedural art for Silly Garden: dirt plots, growth stages, the five silly
// plants, the watering can, butterflies, the rain cloud and the thumbnail.
// Every piece first tries its art key (drawArt) and falls back to vectors.
import * as ui from '../../engine/ui.js';
import { drawArt, hasArt } from '../../engine/art.js';
import { drawSparkleShape } from '../../engine/emotes.js';
import { TAU, clamp } from '../../engine/util.js';

export const NAVY = '#24163f';
const ol = (g, w = 4) => { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };

export const KINDS = ['sunflower', 'carrot', 'strawberry', 'pumpkin', 'sneezy'];

/** Dirt mound centred at 0,0. wet 0..1 darkens it. */
export function drawDirt(g, wet, hi) {
  if (hi > 0) {
    g.save(); g.globalAlpha = hi;
    g.fillStyle = '#fff6a8'; g.beginPath(); g.ellipse(0, 4, 118, 62, 0, 0, TAU); g.fill();
    g.restore();
  }
  if (!drawArt(g, 'prop/gg-dirt', 0, 0, 200, 108)) {
    g.fillStyle = '#a8673a'; g.beginPath(); g.ellipse(0, 0, 98, 50, 0, 0, TAU); g.fill(); ol(g, 4);
    g.fillStyle = '#c07a45'; g.beginPath(); g.ellipse(-6, -8, 80, 34, 0, 0, TAU); g.fill();
    g.strokeStyle = '#8d5330'; g.lineWidth = 4;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-58, i * 14 - 6); g.quadraticCurveTo(0, i * 14 - 14, 58, i * 14 - 6); g.stroke(); }
    g.fillStyle = '#e0b48a'; for (const [x, y] of [[-60, 18], [52, 14], [20, 24]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
  }
  if (wet > 0) { g.save(); g.globalAlpha = wet * 0.45; g.fillStyle = '#4a2a1a'; g.beginPath(); g.ellipse(0, 0, 92, 46, 0, 0, TAU); g.fill(); g.restore(); }
}

export function drawSeed(g, t) {
  g.fillStyle = '#7a4a1e'; g.beginPath(); g.ellipse(0, -8, 12, 9, 0.4, 0, TAU); g.fill(); ol(g, 3);
  g.save(); g.translate(14, -26); const k = 0.5 + Math.sin(t * 6) * 0.25; g.scale(k, k); drawSparkleShape(g, 18, '#ffffff'); g.restore();
}

export function drawSprout(g, k, t) {
  const s = 0.5 + k * 0.6;
  g.save(); g.scale(s, s); g.rotate(Math.sin(t * 4) * 0.08);
  if (!drawArt(g, 'prop/gg-sprout', 0, 4, 90, 112, { anchor: 'bottom' })) {
    g.strokeStyle = '#3fae54'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -50); g.stroke();
    g.fillStyle = '#5fd36a';
    for (const sx of [-1, 1]) { g.save(); g.translate(0, -50); g.rotate(sx * 0.5); g.beginPath(); g.ellipse(sx * 22, -6, 24, 13, 0, 0, TAU); g.fill(); ol(g, 3); g.restore(); }
  }
  g.restore();
}

export function drawBud(g, k, t) {
  const wob = Math.sin(t * (8 + k * 14)) * (0.04 + k * 0.1);
  g.save(); g.rotate(wob); const s = 0.85 + k * 0.3; g.scale(s, s);
  if (!drawArt(g, 'prop/gg-bud', 0, 4, 120, 168, { anchor: 'bottom' })) {
    g.strokeStyle = '#3fae54'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(8, -60, 0, -115); g.stroke();
    g.fillStyle = '#5fd36a';
    for (const sx of [-1, 1]) { g.save(); g.translate(0, -50); g.rotate(sx * 0.6); g.beginPath(); g.ellipse(sx * 28, 0, 30, 14, 0, 0, TAU); g.fill(); ol(g, 3); g.restore(); }
    g.fillStyle = '#7fe08f'; g.beginPath(); g.ellipse(0, -138, 26, 32 + k * 6, 0, 0, TAU); g.fill(); ol(g, 4);
    g.strokeStyle = '#3fae54'; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, -120); g.lineTo(0, -160); g.lineTo(14, -120); g.stroke();
  }
  g.restore();
}

function face(g, x, y, s, { happy = true, closed = false, open = 0 } = {}) {
  g.fillStyle = NAVY; g.strokeStyle = NAVY; g.lineWidth = 3.5 * s; g.lineCap = 'round';
  if (closed) { for (const sx of [-1, 1]) { g.beginPath(); g.arc(x + sx * 10 * s, y, 6 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
  else { g.beginPath(); g.arc(x - 10 * s, y, 4.5 * s, 0, TAU); g.arc(x + 10 * s, y, 4.5 * s, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 11 * s, y - 2 * s, 1.6 * s, 0, TAU); g.arc(x + 9 * s, y - 2 * s, 1.6 * s, 0, TAU); g.fill(); }
  if (open > 0) { g.fillStyle = '#ff6f91'; g.beginPath(); g.ellipse(x, y + 13 * s, 8 * s, (4 + open * 7) * s, 0, 0, TAU); g.fill(); g.stroke(); }
  else if (happy) { g.beginPath(); g.arc(x, y + 6 * s, 8 * s, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  g.fillStyle = 'rgba(255,111,145,0.45)'; g.beginPath(); g.ellipse(x - 18 * s, y + 8 * s, 6 * s, 3.5 * s, 0, 0, TAU); g.ellipse(x + 18 * s, y + 8 * s, 6 * s, 3.5 * s, 0, 0, TAU); g.fill();
}

/** Giant giggly sunflower; giggle 0..1 shakes it and closes its eyes. */
export function drawSunflower(g, k, t, giggle) {
  const sway = Math.sin(t * 2) * 0.05 + (giggle ? Math.sin(t * 40) * 0.04 : 0);
  g.save(); g.rotate(sway); g.scale(k, k);
  if (drawArt(g, giggle ? 'prop/gg-sunflower-giggle' : 'prop/gg-sunflower', 0, 6, 230, 460, { anchor: 'bottom' }) || (giggle && drawArt(g, 'prop/gg-sunflower', 0, 6, 230, 460, { anchor: 'bottom' }))) { g.restore(); return; }
  g.strokeStyle = '#3fae54'; g.lineWidth = 14; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(14, -180, 0, -340); g.stroke();
  g.fillStyle = '#5fd36a';
  for (const [y, sx] of [[-120, -1], [-190, 1], [-260, -1]]) { g.save(); g.translate(4, y); g.rotate(sx * 0.5); g.beginPath(); g.ellipse(sx * 40, 0, 44, 18, 0, 0, TAU); g.fill(); ol(g, 4); g.restore(); }
  g.save(); g.translate(0, -360);
  g.fillStyle = '#ffd23f';
  for (let i = 0; i < 16; i++) { g.save(); g.rotate(i * TAU / 16 + Math.sin(t * 3) * 0.05); g.beginPath(); g.ellipse(0, -72, 16, 34, 0, 0, TAU); g.fill(); ol(g, 3.5); g.restore(); }
  g.fillStyle = '#8a5424'; g.beginPath(); g.arc(0, 0, 56, 0, TAU); g.fill(); ol(g, 5);
  g.fillStyle = '#6d3f18'; for (let i = 0; i < 14; i++) { const a = i * 2.39, r = 12 + (i % 4) * 9; g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r + 14, 3, 0, TAU); g.fill(); }
  face(g, 0, -8, 1.9, { closed: giggle > 0, open: giggle > 0 ? 0.6 + Math.sin(t * 30) * 0.4 : 0 });
  g.restore();
  g.restore();
}

/** A carrot that pops out of the soil and waves. pop 0..1 rise, wave arm angle. */
export function drawCarrot(g, pop, t, hop, free = false) {
  g.save(); g.translate(0, -hop);
  g.rotate(Math.sin(t * 3) * 0.08);
  const rise = pop;
  g.translate(0, (1 - rise) * 60);
  if (!drawArt(g, 'prop/gg-carrot', 0, 20, 150, 212, { anchor: 'bottom' })) {
    // leafy top
    g.fillStyle = '#4fcf6a';
    for (const a of [-0.5, 0, 0.5]) { g.save(); g.translate(0, -150); g.rotate(a + Math.sin(t * 6 + a) * 0.1); g.beginPath(); g.ellipse(0, -36, 14, 40, 0, 0, TAU); g.fill(); ol(g, 3.5); g.restore(); }
    // body
    g.fillStyle = '#ff8a2a';
    g.beginPath(); g.moveTo(-48, -150); g.quadraticCurveTo(-50, -60, 0, 20); g.quadraticCurveTo(50, -60, 48, -150); g.quadraticCurveTo(0, -172, -48, -150); g.fill(); ol(g, 4.5);
    g.strokeStyle = '#d96a14'; g.lineWidth = 3; for (const y of [-80, -40, -110]) { g.beginPath(); g.moveTo(-26, y); g.lineTo(-10, y + 3); g.stroke(); }
    face(g, 0, -118, 1.4, { open: hop > 5 ? 0.6 : 0 });
    // waving arm
    const wave = Math.sin(t * 9) * 0.6;
    g.save(); g.translate(40, -96); g.rotate(-1.0 + wave);
    g.strokeStyle = '#ff8a2a'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -40); g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-6, -40); g.moveTo(6, 0); g.lineTo(6, -40); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -48, 11, 0, TAU); g.fill(); ol(g, 3);
    g.restore();
  }
  g.restore();
  // soil lip in front (with art the game redraws the mound's front half instead)
  if (!free && !hasArt('prop/gg-dirt')) { g.fillStyle = '#a8673a'; g.beginPath(); g.ellipse(0, 4, 58, 16, 0, 0, Math.PI); g.fill(); }
}

export function drawStrawberryBush(g, t) {
  if (drawArt(g, 'prop/gg-strawberry-bush', 0, 6, 190, 130, { anchor: 'bottom' })) return;
  g.fillStyle = '#4fcf6a';
  for (const [x, y, r] of [[-50, -30, 36], [50, -30, 36], [0, -50, 44], [-20, -20, 34], [24, -18, 34]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); ol(g, 3.5); }
  g.fillStyle = '#4fcf6a'; g.beginPath(); g.arc(0, -36, 40, 0, TAU); g.fill();
  g.fillStyle = '#fff'; for (const [x, y] of [[-40, -50], [36, -60], [0, -24]]) { for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); g.fillStyle = '#fff'; }
}

export function drawStrawberry(g, s, sq) {
  g.save(); g.scale(s * (1 + sq * 0.3), s * (1 - sq * 0.3));
  if (!drawArt(g, 'prop/gg-strawberry', 0, 0, 66, 72)) {
    g.fillStyle = '#ff3d5e'; g.beginPath(); g.moveTo(0, 32); g.bezierCurveTo(-38, 10, -34, -26, 0, -24); g.bezierCurveTo(34, -26, 38, 10, 0, 32); g.fill(); ol(g, 3.5);
    g.fillStyle = '#ffe9a8'; for (const [x, y] of [[-14, -4], [14, -4], [-8, 14], [8, 14], [0, 0], [-20, 6], [20, 6]]) { g.beginPath(); g.ellipse(x, y, 2, 3, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#4fcf6a'; g.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI + i * Math.PI / 4; g.ellipse(Math.cos(a) * 12, -24 + Math.sin(a) * 4, 10, 5, a, 0, TAU); } g.fill();
    face(g, 0, -6, 0.9, {});
  }
  g.restore();
}

export function drawPumpkin(g, rot, t, scared) {
  g.save(); g.rotate(rot);
  if (!drawArt(g, 'prop/gg-pumpkin', 0, 0, 170, 157)) {
    g.fillStyle = '#ff9a2e';
    for (const [x, rx] of [[-42, 40], [42, 40], [-18, 42], [18, 42], [0, 44]]) { g.beginPath(); g.ellipse(x, 0, rx, 62, 0, 0, TAU); g.fill(); ol(g, 4); }
    g.beginPath(); g.ellipse(0, 0, 40, 60, 0, 0, TAU); g.fill();
    g.fillStyle = '#5c8f2e'; ui.roundRect(g, -8, -78, 16, 26, 6); g.fill(); ol(g, 3.5);
    g.strokeStyle = '#4fcf6a'; g.lineWidth = 4; g.beginPath(); g.arc(18, -70, 12, Math.PI, TAU * 0.9); g.stroke();
    face(g, 0, -6, 1.8, { open: scared ? 0.5 + Math.sin(t * 20) * 0.3 : 0 });
  }
  g.restore();
}

export function drawVine(g) {
  if (drawArt(g, 'prop/gg-vine', 0, 6, 180, 84, { anchor: 'bottom' })) return;
  g.strokeStyle = '#3fae54'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-70, -6); g.bezierCurveTo(-30, -40, 20, 10, 70, -16); g.stroke();
  g.fillStyle = '#5fd36a'; for (const [x, y] of [[-40, -20], [10, -10], [50, -24]]) { g.beginPath(); g.ellipse(x, y, 20, 13, 0.3, 0, TAU); g.fill(); ol(g, 3); }
}

/** Sneezy puffball flower. charge 0..1 (about to sneeze), achoo 0..1 (sneeze blast). */
export function drawSneezy(g, t, charge, achoo) {
  const lean = achoo > 0 ? -0.25 * achoo : charge * 0.12;
  g.save(); g.rotate(lean + Math.sin(t * 2.5) * 0.04);
  const key = achoo > 0.2 ? 'prop/gg-sneeze-flower-achoo' : 'prop/gg-sneeze-flower';
  if (drawArt(g, key, 0, 6, 150, 250, { anchor: 'bottom' }) || drawArt(g, 'prop/gg-sneeze-flower', 0, 6, 150, 250, { anchor: 'bottom' })) { g.restore(); return; }
  g.strokeStyle = '#3fae54'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10, -80, 0, -150); g.stroke();
  g.fillStyle = '#5fd36a'; for (const sx of [-1, 1]) { g.save(); g.translate(0, -60); g.rotate(sx * 0.6); g.beginPath(); g.ellipse(sx * 28, 0, 30, 13, 0, 0, TAU); g.fill(); ol(g, 3); g.restore(); }
  g.save(); g.translate(0, -190);
  const puff = 1 + charge * 0.25 - achoo * 0.1;
  g.scale(puff, puff);
  g.fillStyle = '#ff9ad5';
  for (let i = 0; i < 10; i++) { const a = i * TAU / 10; g.beginPath(); g.arc(Math.cos(a) * 42, Math.sin(a) * 42, 22, 0, TAU); g.fill(); ol(g, 3); }
  g.beginPath(); g.arc(0, 0, 48, 0, TAU); g.fill();
  g.fillStyle = '#ffd6ee'; g.beginPath(); g.arc(-14, -16, 12, 0, TAU); g.fill();
  if (achoo > 0.2) face(g, 0, -4, 1.4, { closed: true, open: 1 });
  else face(g, 0, -4, 1.4, { closed: charge > 0.5, happy: charge < 0.3 });
  // twitchy nose
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(Math.sin(t * (10 + charge * 30)) * 2, 4, 5 + charge * 3, 0, TAU); g.fill(); ol(g, 2.5);
  g.restore();
  g.restore();
}

export function drawCan(g, x, y, s, tilt) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  if (drawArt(g, 'prop/gg-watering-can', 0, 0, s * 1.35, s) || drawArt(g, 'prop/watering-can', 0, 0, s * 1.4, s * 1.4)) { g.restore(); return; }
  g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = NAVY; g.lineJoin = 'round';
  g.fillStyle = '#7fd3ff';
  g.beginPath(); g.moveTo(s * 0.3, -s * 0.05); g.lineTo(s * 0.85, -s * 0.42); g.lineTo(s * 0.92, -s * 0.32); g.lineTo(s * 0.38, s * 0.12); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#5bb8f0'; g.beginPath(); g.ellipse(s * 0.9, -s * 0.38, s * 0.07, s * 0.12, -0.6, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#7fd3ff'; ui.roundRect(g, -s * 0.38, -s * 0.3, s * 0.7, s * 0.6, s * 0.14); g.fill(); g.stroke();
  g.beginPath(); g.arc(-s * 0.05, -s * 0.32, s * 0.24, Math.PI, TAU); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-s * 0.05, 0, s * 0.1, 0, TAU); g.fill();
  g.restore();
}

export function drawButterfly(g, t, c1, c2, s = 1) {
  const flap = 0.25 + Math.abs(Math.sin(t * 14)) * 0.75;
  g.save(); g.scale(s, s);
  g.save(); g.scale(flap, 1);
  // the art has its own body and antennae: flap it and stop there
  if (drawArt(g, 'prop/gg-butterfly', 0, 0, 80, 64)) { g.restore(); g.restore(); return; }
  g.fillStyle = c1;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 18, -10, 20, 16, sx * 0.4, 0, TAU); g.fill(); ol(g, 2.5); }
  g.fillStyle = c2;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 14, 12, 13, 11, -sx * 0.4, 0, TAU); g.fill(); ol(g, 2.5); }
  g.fillStyle = '#fff6a8'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 20, -12, 4, 0, TAU); g.fill(); }
  g.restore();
  g.fillStyle = NAVY; ui.roundRect(g, -3, -16, 6, 34, 3); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 2; g.beginPath(); g.moveTo(-1, -16); g.lineTo(-8, -28); g.moveTo(1, -16); g.lineTo(8, -28); g.stroke();
  g.restore();
}

/** Happy little rain cloud (centre 0,0). */
export function drawRainCloud(g, t) {
  if (drawArt(g, 'prop/gg-rain-cloud', 0, 0, 300, 170)) return;
  g.fillStyle = '#e8f2ff';
  g.beginPath(); g.arc(-80, 10, 50, 0, TAU); g.arc(-25, -25, 66, 0, TAU); g.arc(45, -15, 58, 0, TAU); g.arc(95, 15, 42, 0, TAU); g.rect(-110, 10, 220, 50); g.fill();
  ol(g, 5);
  g.fillStyle = '#e8f2ff'; g.beginPath(); g.arc(-80, 10, 46, 0, TAU); g.arc(-25, -25, 62, 0, TAU); g.arc(45, -15, 54, 0, TAU); g.arc(95, 15, 38, 0, TAU); g.rect(-106, 10, 212, 46); g.fill();
  face(g, 0, 0, 1.6, { closed: Math.sin(t * 2) > 0.9 });
}

/** Thumbnail (menus + how-to). */
export function drawGardenIcon(g, x, y, w, h, t) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (drawArt(g, 'thumb/garden-grow', x + w / 2, y + h / 2, w, h, { fit: 'cover' })) { g.restore(); return; }
  const s = w / 400, hh = h / s;
  g.translate(x, y); g.scale(s, s);
  ui.sky(g, '#8fd6ff', '#d8f3ff', hh * 0.4);
  g.fillStyle = '#7fd36a'; g.fillRect(0, hh * 0.38, 400, hh);
  g.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { ui.roundRect(g, i * 36, hh * 0.24, 22, hh * 0.18, 8); g.fill(); }
  g.fillRect(0, hh * 0.3, 400, 8);
  g.fillStyle = '#6cc35a'; for (let i = 0; i < 6; i++) g.fillRect(0, hh * 0.45 + i * 30, 400, 12);
  g.save(); g.translate(105, hh * 0.92); g.scale(0.42, 0.42); drawDirt(g, 0, 0); drawSunflower(g, 1, t, Math.sin(t * 2) > 0 ? 1 : 0); g.restore();
  g.save(); g.translate(230, hh * 0.86); g.scale(0.6, 0.6); drawDirt(g, 0, 0); drawCarrot(g, 1, t, 0); g.restore();
  g.save(); g.translate(330 - ((t * 40) % 60), hh * 0.8); g.scale(0.45, 0.45); drawPumpkin(g, t * 2, t, false); g.restore();
  for (let i = 0; i < 3; i++) { g.save(); g.translate(80 + i * 120 + Math.sin(t + i) * 10, 50 + i * 15 + Math.cos(t * 2 + i) * 8); g.rotate(0.3); drawButterfly(g, t + i, ['#ff8fd0', '#ffd23f', '#9b8cff'][i], '#ffffff', 0.5); g.restore(); }
  g.restore();
}

export const clamp01 = (v) => clamp(v, 0, 1);
