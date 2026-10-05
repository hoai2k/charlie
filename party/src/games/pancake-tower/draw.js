// Pancake Tower: procedural art. Every piece first tries generated art
// (prop/... keys, see image-requests.md) and falls back to vector drawing.
// Items are drawn in lane design units with the origin at their
// bottom-centre (canvas y down, so the item spans y = -h..0).
import * as ui from '../../engine/ui.js';
import { drawArt } from '../../engine/art.js';
import { TAU } from '../../engine/util.js';
import { KINDS } from './stack.js';

const NAVY = ui.NAVY;
export const ART_BOX = { w: 1.04, h: 1.3 };   // art boxes are this much bigger than the item

const ITEM_ART = {
  pancake: 'prop/pancake', golden: 'prop/pancake-golden', waffle: 'prop/waffle',
  butter: 'prop/butter-pat', berries: 'prop/strawberries', cream: 'prop/cream-swirl',
};

/** Draw one tower item (origin bottom-centre). sq: landing jiggle, t: time. */
export function drawItem(g, it, t = 0, sq = 0) {
  const k = KINDS[it.kind];
  let w = it.w, h = it.h;
  let sx = 1 + sq * 0.16, sy = 1 - sq * 0.22;
  if (it.topping && it.covered) { sy *= k.squishH / k.h; sx *= 1.22; }
  g.save();
  g.scale(sx, sy);
  if (!drawArt(g, ITEM_ART[it.kind], 0, 0, w * ART_BOX.w, h * ART_BOX.h, { anchor: 'bottom', fit: 'stretch' })) {
    switch (it.kind) {
      case 'golden': drawPancake(g, w, h, true, t); break;
      case 'waffle': drawWaffle(g, w, h); break;
      case 'butter': drawButter(g, w, h); break;
      case 'berries': drawBerries(g, w, h); break;
      case 'cream': drawCream(g, w, h); break;
      default: drawPancake(g, w, h, false, t);
    }
  }
  g.restore();
  if (it.glaze) drawGlaze(g, w * sx, h * sy, it.syrup, t, it.seed || 0);
}

export function drawPancake(g, w, h, golden = false, t = 0) {
  const r = h * 0.46;
  g.lineJoin = 'round';
  // body: golden-brown crust top and bottom...
  ui.roundRect(g, -w / 2, -h, w, h, r);
  const gr = g.createLinearGradient(0, -h, 0, 0);
  if (golden) { gr.addColorStop(0, '#ffe680'); gr.addColorStop(0.5, '#ffc21a'); gr.addColorStop(1, '#d98400'); }
  else { gr.addColorStop(0, '#e9a24a'); gr.addColorStop(0.5, '#d88a35'); gr.addColorStop(1, '#a8601f'); }
  g.fillStyle = gr; g.fill();
  // ...and a pale fluffy middle with a wavy edge
  g.save();
  ui.roundRect(g, -w / 2, -h, w, h, r); g.clip();
  g.fillStyle = golden ? '#fff6b8' : '#ffe6ad';
  g.beginPath();
  const n = 9, x0 = -w / 2 + r * 0.3, x1 = w / 2 - r * 0.3;
  g.moveTo(x0, -h * 0.5);
  for (let i = 0; i <= n; i++) { const x = lerpX(x0, x1, i / n); g.lineTo(x, -h * (0.66 + (i % 2 ? 0.05 : -0.02))); }
  for (let i = n; i >= 0; i--) { const x = lerpX(x0, x1, i / n); g.lineTo(x, -h * (0.34 + (i % 2 ? -0.04 : 0.02))); }
  g.closePath(); g.fill();
  g.restore();
  ui.roundRect(g, -w / 2, -h, w, h, r);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  // gloss on the top crust
  g.fillStyle = 'rgba(255,255,255,0.5)';
  ui.roundRect(g, -w * 0.36, -h * 0.9, w * 0.3, h * 0.12, h * 0.06); g.fill();
  if (golden) {
    // twinkles
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * 2.1, k = 0.5 + 0.5 * Math.sin(a);
      g.save(); g.translate(-w * 0.3 + i * w * 0.3, -h * 0.5 - Math.sin(a * 0.7) * 3);
      g.scale(k, k); g.fillStyle = '#ffffff';
      g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 2.5 : 9; g.lineTo(Math.cos(j * TAU / 8) * rr, Math.sin(j * TAU / 8) * rr); } g.closePath(); g.fill();
      g.restore();
    }
  }
}

export function drawWaffle(g, w, h) {
  ui.roundRect(g, -w / 2, -h, w, h, 8);
  const gr = g.createLinearGradient(0, -h, 0, 0);
  gr.addColorStop(0, '#f7c66a'); gr.addColorStop(1, '#d48a2c');
  g.fillStyle = gr; g.fill();
  // waffle grid (front face)
  g.save(); ui.roundRect(g, -w / 2, -h, w, h, 8); g.clip();
  g.fillStyle = 'rgba(160,85,20,0.45)';
  const cols = 7, rows = 2, cw = w / cols, rh = h / rows;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    ui.roundRect(g, -w / 2 + c * cw + cw * 0.18, -h + r * rh + rh * 0.2, cw * 0.64, rh * 0.6, 3); g.fill();
  }
  g.restore();
  ui.roundRect(g, -w / 2, -h, w, h, 8); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-w / 2 + 8, -h + 4, w - 16, 4);
}

export function drawButter(g, w, h) {
  ui.roundRect(g, -w / 2, -h, w, h, 6);
  g.fillStyle = '#fff1a0'; g.fill();
  g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = '#fffbe0'; ui.roundRect(g, -w / 2 + 6, -h + 4, w - 12, h * 0.32, 3); g.fill();
  // melty drip
  g.fillStyle = '#ffe36b';
  g.beginPath(); g.ellipse(w * 0.2, -2, w * 0.12, 5, 0, 0, TAU); g.fill();
}

export function drawBerries(g, w, h) {
  const berry = (x, y, r, rot) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath(); g.moveTo(0, r * 1.1); g.bezierCurveTo(-r * 1.2, r * 0.2, -r * 0.9, -r * 0.9, 0, -r * 0.8); g.bezierCurveTo(r * 0.9, -r * 0.9, r * 1.2, r * 0.2, 0, r * 1.1); g.closePath();
    g.fillStyle = '#ff4d6d'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = '#ffe08a'; for (const [sx, sy] of [[-0.35, 0], [0.3, -0.1], [0, 0.45], [-0.1, -0.4], [0.35, 0.4]]) { g.beginPath(); g.arc(sx * r, sy * r, r * 0.07, 0, TAU); g.fill(); }
    g.fillStyle = '#36d17a'; g.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; g.lineTo(Math.cos(a) * r * 0.55, -r * 0.8 + Math.sin(a) * r * 0.35); g.lineTo(0, -r * 0.7); }
    g.fill(); g.lineWidth = 2.5; g.stroke();
    g.restore();
  };
  const r = h * 0.42;
  berry(-w * 0.27, -r * 1.05, r, -0.35);
  berry(w * 0.27, -r * 1.05, r, 0.35);
  berry(0, -r * 1.2, r * 1.1, 0);
}

export function drawCream(g, w, h) {
  g.lineWidth = 4; g.strokeStyle = NAVY; g.fillStyle = '#ffffff';
  const tiers = [[w * 0.5, h * 0.32], [w * 0.38, h * 0.3], [w * 0.24, h * 0.26]];
  let y = 0;
  for (const [hw, th] of tiers) {
    g.beginPath(); g.ellipse(0, y - th * 0.5, hw, th * 0.62, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(200,210,240,0.45)'; g.beginPath(); g.ellipse(hw * 0.25, y - th * 0.3, hw * 0.6, th * 0.22, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#ffffff';
    y -= th * 0.82;
  }
  // tip + cherry
  g.beginPath(); g.moveTo(-w * 0.1, y + 2); g.quadraticCurveTo(0, y - h * 0.3, w * 0.12, y + 2); g.fill(); g.stroke();
  g.fillStyle = '#ff3b5c'; g.beginPath(); g.arc(w * 0.03, y - h * 0.22, h * 0.13, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-w * 0.0, y - h * 0.27, h * 0.04, 0, TAU); g.fill();
}

/** Amber syrup over an item's top with drips down the sides. live = still sticky. */
export function drawGlaze(g, w, h, live, t, seed) {
  g.save();
  g.fillStyle = live ? 'rgba(201,110,24,0.92)' : 'rgba(190,100,20,0.75)';
  g.strokeStyle = NAVY; g.lineWidth = 3;
  const hw = Math.min(w * 0.46, 120);
  g.beginPath();
  g.moveTo(-hw, -h * 0.82);
  // drips
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const x = -hw + (i / n) * hw * 2;
    const len = (i % 2 ? 0.55 : 0.25) * h + ((seed * 7 + i * 13) % 5) * 1.5 + (live ? Math.sin(t * 2 + i) * 2 : 0);
    g.lineTo(x - 5, -h * 0.75); g.quadraticCurveTo(x, -h * 0.75 + len + 6, x + 5, -h * 0.75);
  }
  g.lineTo(hw, -h * 0.82);
  g.quadraticCurveTo(0, -h * 1.12, -hw, -h * 0.82);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,230,170,0.75)';
  g.beginPath(); g.ellipse(-hw * 0.4, -h * 0.9, hw * 0.18, 3, -0.1, 0, TAU); g.fill();
  if (live) {
    const k = 0.6 + 0.4 * Math.sin(t * 8);
    g.translate(hw * 0.5, -h * 0.95); g.scale(k, k); g.fillStyle = '#ffffff';
    g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 3 : 11; g.lineTo(Math.cos(j * TAU / 8) * rr, Math.sin(j * TAU / 8) * rr); } g.closePath(); g.fill();
  }
  g.restore();
}

/** The plate on the counter (origin = plate bottom centre, plate top at y=-ph). */
export function drawPlate(g, color, pw = 300, ph = 20) {
  if (drawArt(g, 'prop/pancake-plate', 0, 6, pw * 1.04, (ph + 12) * 1.0, { anchor: 'bottom', fit: 'stretch' })) {
    // colour band so lanes stay told apart even with art
    g.fillStyle = color; g.globalAlpha = 0.9; ui.roundRect(g, -pw * 0.3, -6, pw * 0.6, 7, 3); g.fill(); g.globalAlpha = 1;
    return;
  }
  g.lineWidth = 4; g.strokeStyle = NAVY;
  // underside
  g.fillStyle = '#d9def0';
  g.beginPath(); g.moveTo(-pw * 0.36, 0); g.lineTo(pw * 0.36, 0); g.lineTo(pw * 0.5, -ph * 0.7); g.lineTo(-pw * 0.5, -ph * 0.7); g.closePath(); g.fill(); g.stroke();
  // top rim
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(0, -ph * 0.75, pw * 0.52, ph * 0.42, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = color; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, -ph * 0.75, pw * 0.44, ph * 0.28, 0, 0, TAU); g.stroke();
}

/**
 * The flying chef pan (origin = bottom centre of the bowl). Handle to the
 * right. look: -1..1 eye direction, t: time, happy: smile size.
 */
export function drawPan(g, t, look = 0, happy = 0.5, color = '#ff6fb1') {
  if (drawArt(g, 'prop/chef-pan', 22.5, 0, 295, 105, { anchor: 'bottom', fit: 'stretch' })) return;
  g.lineJoin = 'round'; g.lineCap = 'round';
  // short handle, angled up
  g.save(); g.translate(108, -30); g.rotate(-0.45);
  g.lineWidth = 4; g.strokeStyle = NAVY;
  g.fillStyle = '#5b6182'; ui.roundRect(g, -4, -6, 32, 12, 6); g.fill(); g.stroke();
  g.fillStyle = '#c98a4b'; ui.roundRect(g, 22, -10, 40, 20, 9); g.fill(); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(52, 0, 5, 0, TAU); g.fill();
  g.restore();
  // bowl (front face)
  g.beginPath();
  g.moveTo(-118, -36); g.lineTo(118, -36); g.lineTo(98, -2); g.quadraticCurveTo(96, 0, 90, 0); g.lineTo(-90, 0); g.quadraticCurveTo(-96, 0, -98, -2); g.closePath();
  const gr = g.createLinearGradient(0, -36, 0, 0);
  gr.addColorStop(0, '#6a7196'); gr.addColorStop(1, '#3d4262');
  g.fillStyle = gr; g.fill(); g.stroke();
  // rim
  g.fillStyle = '#9aa3c8'; ui.roundRect(g, -122, -40, 244, 10, 5); g.fill(); g.stroke();
  // face
  const ex = look * 4;
  g.fillStyle = '#ffffff';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 26 + ex, -19, 7, 8, 0, 0, TAU); g.fill(); }
  g.fillStyle = NAVY;
  const blink = (t % 3.3) < 0.12;
  for (const sx of [-1, 1]) { g.beginPath(); if (blink) g.fillRect(sx * 26 + ex - 6, -19, 12, 2.5); else g.arc(sx * 26 + ex * 1.4, -18, 4, 0, TAU); g.fill(); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  g.beginPath(); g.arc(ex, -12, 6 + happy * 4, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = 'rgba(255,120,170,0.55)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 44 + ex, -11, 7, 4, 0, 0, TAU); g.fill(); }
  // little chef hat perched on the handle end
  g.save(); g.translate(160, -62); g.rotate(0.2 + Math.sin(t * 3) * 0.06);
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 3;
  ui.roundRect(g, -13, -10, 26, 12, 3); g.fill(); g.stroke();
  g.beginPath(); g.arc(-8, -16, 9, 0, TAU); g.arc(8, -16, 9, 0, TAU); g.arc(0, -24, 10, 0, TAU); g.fill();
  g.beginPath(); g.arc(-8, -16, 9, Math.PI * 0.6, Math.PI * 1.6); g.stroke();
  g.beginPath(); g.arc(8, -16, 9, -Math.PI * 0.6, Math.PI * 0.4); g.stroke();
  g.beginPath(); g.arc(0, -24, 10, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  g.restore();
}

/** Syrup bottle (origin = centre); the spout points up at rotation 0. */
export function drawSyrupBottle(g) {
  if (drawArt(g, 'prop/syrup-bottle', 0, 0, 100, 150)) return;
  g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
  // body
  g.beginPath();
  g.moveTo(-14, -58); g.lineTo(-14, -40); g.quadraticCurveTo(-40, -30, -40, -6); g.lineTo(-40, 56); g.quadraticCurveTo(-40, 70, -26, 70);
  g.lineTo(26, 70); g.quadraticCurveTo(40, 70, 40, 56); g.lineTo(40, -6); g.quadraticCurveTo(40, -30, 14, -40); g.lineTo(14, -58); g.closePath();
  const gr = g.createLinearGradient(-40, 0, 40, 0);
  gr.addColorStop(0, '#b25b10'); gr.addColorStop(0.45, '#e08a2c'); gr.addColorStop(1, '#a64f0c');
  g.fillStyle = gr; g.fill(); g.stroke();
  // label (no text: a heart)
  g.fillStyle = '#fff4dc'; ui.roundRect(g, -30, 2, 60, 42, 10); g.fill(); g.stroke();
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.moveTo(0, 36); g.bezierCurveTo(-22, 22, -12, 6, 0, 16); g.bezierCurveTo(12, 6, 22, 22, 0, 36); g.fill();
  // cap
  g.fillStyle = '#ff4d6d'; ui.roundRect(g, -17, -74, 34, 18, 6); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.45)'; ui.roundRect(g, -32, -20, 8, 60, 4); g.fill();
}

/** Little crown for the tallest tower's badge. */
export function drawCrown(g, w) {
  g.save(); g.lineWidth = Math.max(2, w * 0.07); g.strokeStyle = NAVY; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -w * 0.5); g.lineTo(-w * 0.25, -w * 0.22); g.lineTo(0, -w * 0.62); g.lineTo(w * 0.25, -w * 0.22); g.lineTo(w / 2, -w * 0.5); g.lineTo(w / 2, 0); g.closePath();
  g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(0, -w * 0.16, w * 0.09, 0, TAU); g.fill();
  g.restore();
}

/** Tilted tower for the game-select thumbnail. */
export function drawIconScene(g, x, y, w, h, t) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = w / 400, hh = h / s;
  g.translate(x, y); g.scale(s, s);
  // wall
  const grd = g.createLinearGradient(0, 0, 0, hh);
  grd.addColorStop(0, '#ffe6a8'); grd.addColorStop(1, '#ffd0e4');
  g.fillStyle = grd; g.fillRect(0, 0, 400, hh);
  g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 8; i++) g.fillRect(i * 56, 0, 26, hh);
  // counter
  g.fillStyle = '#ff9fc8'; g.fillRect(0, hh * 0.84, 400, hh * 0.2);
  g.fillStyle = '#ffd1e4'; g.fillRect(0, hh * 0.82, 400, hh * 0.04);
  // stack
  const tt = t || 0;
  g.save(); g.translate(160, hh * 0.86); g.scale(0.7, 0.7);
  drawPlate(g, '#ff6fb1');
  let yy = -18;
  const lean = Math.sin(tt * 2.2) * 3;
  const list = ['pancake', 'waffle', 'pancake', 'golden', 'pancake', 'butter'];
  list.forEach((kind, i) => {
    const k = KINDS[kind];
    const it = { kind, w: k.w, h: k.h, topping: !!k.topping, covered: i < list.length - 1 && !!k.topping, glaze: i === 4, seed: 2 };
    g.save(); g.translate(lean * i * i * 0.12 + (i % 2 ? 6 : -4), yy); g.rotate(lean * i * 0.004);
    drawItem(g, it, tt);
    g.restore();
    yy -= it.covered ? k.squishH : k.h;
  });
  g.restore();
  // pan flipping a pancake
  g.save(); g.translate(318, hh * 0.36); g.scale(0.46, 0.46); g.rotate(-0.12);
  const u = (tt * 0.8) % 1, lift = 4 * u * (1 - u) * 120;
  g.save(); g.translate(0, -10 - lift); g.rotate(u * TAU); g.translate(0, 15); drawPancake(g, 200, 30); g.restore();
  drawPan(g, tt, -0.5, 0.8);
  g.restore();
  // syrup drip sparkle
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) { const a = tt * 2 + i; const px = 60 + i * 70, py = 40 + (i * 37) % 60; const k = 0.5 + 0.5 * Math.sin(a); g.save(); g.translate(px, py); g.scale(k, k); g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 2 : 7; g.lineTo(Math.cos(j * TAU / 8) * rr, Math.sin(j * TAU / 8) * rr); } g.fill(); g.restore(); }
  g.restore();
}

function lerpX(a, b, t) { return a + (b - a) * t; }
