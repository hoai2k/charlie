// Acrobat Circus: procedural art (the big top, the little station rings and
// every prop). Each piece first asks for generated art by key (see
// image-requests.md, "acrobat-circus") and falls back to vector drawing.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { drawStarShape } from '../../engine/emotes.js';
import { TAU, clamp } from '../../engine/util.js';

export const NAVY = '#24163f';
export const RED = '#e2405a';
export const CREAM = '#fff0da';
export const GOLD = '#ffc83d';
export const BLUE = '#3fa7ff';
export const BALLOON_COLORS = [['pink', '#ff6fb1'], ['blue', '#4fb8ff'], ['yellow', '#ffd23f'], ['mint', '#4fd98a']];

// ---------------------------------------------------------------------------
// The big top (full screen)

let tentCache = null;
function buildTent() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#5b1f47'; g.fillRect(0, 0, W, H);
  // canvas stripes radiating from the centre pole
  const ax = W / 2, ay = -80, n = 30;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (i / n), a1 = Math.PI * ((i + 1) / n);
    g.beginPath(); g.moveTo(ax, ay);
    g.lineTo(ax + Math.cos(a0) * 2600, ay + Math.sin(a0) * 2600);
    g.lineTo(ax + Math.cos(a1) * 2600, ay + Math.sin(a1) * 2600);
    g.closePath();
    g.fillStyle = i % 2 ? '#d93a55' : '#f7e4c9'; g.fill();
  }
  // soft shading: darker up high and at the sides
  let gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(60,16,50,0.55)'); gr.addColorStop(0.45, 'rgba(60,16,50,0.1)'); gr.addColorStop(1, 'rgba(60,16,50,0.35)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createRadialGradient(W / 2, H * 0.45, 200, W / 2, H * 0.45, 1150);
  gr.addColorStop(0, 'rgba(255,240,210,0.18)'); gr.addColorStop(1, 'rgba(40,10,40,0.55)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // audience stands
  for (const side of [-1, 1]) {
    g.save();
    if (side > 0) { g.translate(W, 0); g.scale(-1, 1); }
    for (let r = 0; r < 5; r++) {
      const y = 430 + r * 86, w = 430 - r * 22;
      g.fillStyle = r % 2 ? '#43204f' : '#4d2759';
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 30); g.lineTo(w, y + 86); g.lineTo(0, y + 86); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,200,61,0.35)'; g.fillRect(0, y + 2, w, 5);
    }
    g.restore();
  }
  // ring floor
  g.fillStyle = '#3d1838'; g.fillRect(0, 860, W, H - 860);
  g.save();
  g.beginPath(); g.ellipse(W / 2, 1010, 1080, 230, 0, 0, TAU);
  gr = g.createRadialGradient(W / 2, 980, 60, W / 2, 1010, 1080);
  gr.addColorStop(0, '#ffe0a6'); gr.addColorStop(1, '#e5b46c');
  g.fillStyle = gr; g.fill();
  g.lineWidth = 34; g.strokeStyle = RED; g.stroke();
  g.lineWidth = 8; g.strokeStyle = GOLD;
  g.beginPath(); g.ellipse(W / 2, 1000, 1080, 226, 0, Math.PI, TAU); g.stroke();
  g.lineWidth = 5; g.strokeStyle = NAVY;
  g.beginPath(); g.ellipse(W / 2, 1010, 1097, 247, 0, Math.PI, TAU); g.stroke();
  // sawdust specks
  g.fillStyle = 'rgba(160,100,40,0.18)';
  for (let i = 0; i < 260; i++) {
    const a = (i * 2.399) % TAU, rr = Math.sqrt((i * 0.618) % 1);
    const x = W / 2 + Math.cos(a) * rr * 1000, y = 1010 + Math.sin(a) * rr * 200;
    if (y < 800) continue;
    g.beginPath(); g.ellipse(x, y, 6, 2.5, 0, 0, TAU); g.fill();
  }
  g.restore();
  // gold stars on the curb
  for (let i = -4; i <= 4; i++) {
    const a = Math.PI * 1.5 + i * 0.14, x = W / 2 + Math.cos(a) * 1080, y = 1010 + Math.sin(a) * 230;
    g.save(); g.translate(x, y + 2); drawStarShape(g, 26, GOLD); g.restore();
  }
  // valance with scallops
  g.fillStyle = '#b8233f';
  g.fillRect(0, 0, W, 34);
  for (let x = 0; x < W + 80; x += 80) {
    g.beginPath(); g.arc(x + 40, 34, 40, 0, Math.PI); g.fillStyle = (x / 80) % 2 ? '#b8233f' : '#f7e4c9'; g.fill();
    g.lineWidth = 4; g.strokeStyle = GOLD; g.stroke();
  }
  return c;
}

/** Full-screen big top. `crowd` 0..1 makes the audience bounce. */
export function drawBigTop(g, t, crowd = 0) {
  const img = art('bg/acrobat-circus');
  if (img) { g.drawImage(img, 0, 0, W, H); drawLights(g, t, 1); return; }
  if (!tentCache) tentCache = buildTent();
  g.drawImage(tentCache, 0, 0);
  drawAudience(g, t, crowd);
  drawLights(g, t, 0);
}

const HEADS = ['#ffd2b0', '#e8a77f', '#9c6a4d', '#ffc6d9', '#c9e7ff', '#ffe08a', '#c7b5ff', '#a6ecc6'];
function drawAudience(g, t, crowd) {
  for (const side of [-1, 1]) {
    for (let r = 0; r < 5; r++) {
      const y = 430 + r * 86, w = 430 - r * 22;
      for (let i = 0; i < 6; i++) {
        const xx = 34 + i * ((w - 50) / 6);
        const x = side < 0 ? xx : W - xx;
        const seed = r * 7 + i * 3 + (side > 0 ? 50 : 0);
        const hop = Math.max(0, Math.sin(t * (6 + (seed % 3)) + seed)) * (4 + crowd * 16);
        const hy = y + 52 - hop;
        g.fillStyle = HEADS[seed % HEADS.length];
        g.beginPath(); g.arc(x, hy, 17, 0, TAU); g.fill();
        g.fillStyle = ['#ff6fb1', '#4fb8ff', '#ffd23f', '#4fd98a', '#a77bff'][seed % 5];
        ui.roundRect(g, x - 20, hy + 14, 40, 34, 14); g.fill();
        if (crowd > 0.35 && (seed % 4 === 0)) {   // hands up!
          g.strokeStyle = HEADS[seed % HEADS.length]; g.lineWidth = 7; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x - 16, hy + 20); g.lineTo(x - 26, hy - 14 - hop * 0.3); g.moveTo(x + 16, hy + 20); g.lineTo(x + 26, hy - 14 - hop * 0.3); g.stroke();
        }
      }
    }
  }
}

function drawLights(g, t, alphaOnly) {
  // two swags of bulb lights across the top
  for (const [y0, sag, phase] of [[70, 70, 0], [120, 50, 1.7]]) {
    if (!alphaOnly) {
      g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(W / 2, y0 + sag * 2, W, y0); g.stroke();
    }
    for (let i = 1; i < 24; i++) {
      const u = i / 24, x = u * W, y = y0 + sag * 4 * u * (1 - u) + 6;
      const on = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.3 + phase);
      g.fillStyle = `rgba(255,${200 + (i % 3) * 20},${120 + (i % 2) * 80},${on})`;
      g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
    }
  }
}

/** Soft swaying spotlight cones (drawn over the stage, additive). */
export function drawSpotCones(g, t, xs, floorY = 930, alpha = 0.22) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i] + Math.sin(t * 0.7 + i) * 6;
    const gr = g.createLinearGradient(0, 0, 0, floorY);
    gr.addColorStop(0, `rgba(255,250,220,${alpha * 0.2})`); gr.addColorStop(1, `rgba(255,245,200,${alpha})`);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 50, -20); g.lineTo(x + 50, -20); g.lineTo(x + 230, floorY); g.lineTo(x - 230, floorY); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(x, floorY, 230, 46, 0, 0, TAU); g.fillStyle = `rgba(255,245,200,${alpha * 0.9})`; g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// A station's little ring (local station units, vw × vh, floor line at `floor`)

export function drawStationRing(g, vw, vh, floor, t, tint = null) {
  const img = art('bg/acrobat-circus-ring');
  if (img) {
    const s = Math.max(vw / img.width, vh / img.height);
    g.drawImage(img, vw / 2 - (img.width * s) / 2, vh - img.height * s, img.width * s, img.height * s);
  } else {
    const sw = 56, off = (vw / 2) % (sw * 2);
    g.fillStyle = '#f7e4c9'; g.fillRect(0, 0, vw, floor);
    g.fillStyle = '#dc4560';
    for (let x = off - sw * 2; x < vw; x += sw * 2) g.fillRect(x, 0, sw, floor);
    let gr = g.createLinearGradient(0, 0, 0, floor);
    gr.addColorStop(0, 'rgba(70,18,60,0.5)'); gr.addColorStop(0.5, 'rgba(70,18,60,0.08)'); gr.addColorStop(1, 'rgba(70,18,60,0.22)');
    g.fillStyle = gr; g.fillRect(0, 0, vw, floor);
    gr = g.createRadialGradient(vw / 2, floor - 120, 40, vw / 2, floor - 120, Math.max(vw, vh) * 0.75);
    gr.addColorStop(0, 'rgba(255,248,220,0.35)'); gr.addColorStop(1, 'rgba(255,248,220,0)');
    g.fillStyle = gr; g.fillRect(0, 0, vw, floor);
    // floor: curb + sawdust
    g.fillStyle = '#ecbf7a'; g.fillRect(0, floor, vw, vh - floor);
    g.fillStyle = RED; g.fillRect(0, floor - 4, vw, 14);
    g.fillStyle = GOLD; g.fillRect(0, floor - 6, vw, 4);
    g.fillStyle = 'rgba(150,90,30,0.25)';
    for (let x = 12; x < vw; x += 37) { g.beginPath(); g.ellipse(x, floor + 20 + ((x * 7) % 11), 6, 2, 0, 0, TAU); g.fill(); }
  }
  // bulbs
  g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 16); g.quadraticCurveTo(vw / 2, 56, vw, 16); g.stroke();
  const nb = Math.max(6, Math.round(vw / 50));
  for (let i = 1; i < nb; i++) {
    const u = i / nb, x = u * vw, y = 16 + 40 * 2 * u * (1 - u) + 5;
    g.fillStyle = `rgba(255,${210 + (i % 3) * 15},140,${0.65 + 0.35 * Math.sin(t * 3 + i)})`;
    g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
  }
  if (tint) { g.fillStyle = tint; g.fillRect(0, 0, vw, vh); }
}

// ---------------------------------------------------------------------------
// Props (station units; `s` scales them up for the big ring)

/** Trampoline standing on floorY, 300×125 at s=1; bed top 28% down (90 above the floor). dip 0..1 */
export function drawTrampoline(g, cx, floorY, s = 1, dip = 0, color = BLUE) {
  const w = 300 * s, h = 125 * s;
  if (drawArt(g, 'prop/acrobat-trampoline', cx, floorY, w, h * (1 - 0.12 * clamp(dip, 0, 1)), { anchor: 'bottom', fit: 'stretch' })) return;
  const bedY = floorY - 90 * s;
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  // legs
  g.lineWidth = 4 * s; g.strokeStyle = NAVY; g.fillStyle = '#6a4fc4';
  for (const lx of [-118, -50, 50, 118]) {
    ui.roundRect(g, cx + lx * s - 8 * s, bedY + 20 * s, 16 * s, floorY - bedY - 20 * s, 6 * s); g.fill(); g.stroke();
  }
  // skirt
  const sy = bedY + 6 * s;
  g.beginPath(); g.ellipse(cx, sy, 150 * s, 28 * s, 0, 0, Math.PI); g.lineTo(cx - 150 * s, sy); g.closePath();
  g.save(); g.clip();
  for (let i = -6; i < 6; i++) { g.fillStyle = i % 2 ? GOLD : '#ff6f8f'; g.fillRect(cx + i * 26 * s, sy - 4 * s, 26 * s, 50 * s); }
  g.restore();
  g.beginPath(); g.ellipse(cx, sy + 22 * s, 150 * s, 28 * s, 0, 0, Math.PI);
  g.lineTo(cx - 150 * s, sy);
  g.ellipse(cx, sy, 150 * s, 28 * s, 0, Math.PI, 0, true);
  g.lineWidth = 4 * s; g.stroke();
  // frame ring
  g.lineWidth = 20 * s; g.strokeStyle = NAVY;
  g.beginPath(); g.ellipse(cx, sy, 142 * s, 26 * s, 0, 0, TAU); g.stroke();
  g.lineWidth = 14 * s; g.strokeStyle = color;
  g.beginPath(); g.ellipse(cx, sy, 142 * s, 26 * s, 0, 0, TAU); g.stroke();
  g.setLineDash([10 * s, 16 * s]); g.lineWidth = 6 * s; g.strokeStyle = GOLD;
  g.beginPath(); g.ellipse(cx, sy, 142 * s, 26 * s, 0, 0, TAU); g.stroke();
  g.setLineDash([]);
  // bed (dips in the middle)
  const d = 22 * s * clamp(dip, 0, 1.4);
  g.beginPath();
  g.moveTo(cx - 124 * s, sy);
  g.quadraticCurveTo(cx, sy - 40 * s + d * 0.4, cx + 124 * s, sy);
  g.quadraticCurveTo(cx, sy + 34 * s + d * 1.6, cx - 124 * s, sy);
  g.fillStyle = '#2e2a5e'; g.fill();
  g.lineWidth = 3 * s; g.strokeStyle = NAVY; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2 * s;
  g.beginPath(); g.ellipse(cx, sy + d * 0.5, 60 * s, 8 * s, 0, 0, TAU); g.stroke();
  g.restore();
}
export const TRAMP_BED = 90;   // bed height above the floor at s = 1

/** A trapeze rope from the pivot to one end of the bar. */
export function drawRope(g, x0, y0, x1, y1, w = 4) {
  g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = w + 3;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = '#e6c58a'; g.lineWidth = w;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}

/** Trapeze bar centred on (x, y), rotated by `ang`, `w` wide (120 at s = 1). */
export function drawBar(g, x, y, ang, w = 120) {
  g.save(); g.translate(x, y); g.rotate(ang);
  // The delivered bar fills only the middle of its 256×48 canvas (x 31–68%,
  // y 21–54%): draw just that part, so the end rings meet the ropes at ±w/2.
  const bar = art('prop/acrobat-trapeze');
  if (bar) {
    const sx = bar.width * 0.309, sw = bar.width * 0.375, sy = bar.height * 0.208, sh = bar.height * 0.333;
    const h = 120 * sh / sw;   // wider bars (big trios) stretch, same thickness
    g.drawImage(bar, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  } else {
    const h = 16;
    g.lineWidth = 3.5; g.strokeStyle = NAVY; g.fillStyle = '#fff6ea';
    ui.roundRect(g, -w / 2, -h / 2, w, h, h / 2); g.fill(); g.stroke();
    g.save(); ui.roundRect(g, -w / 2, -h / 2, w, h, h / 2); g.clip();
    g.fillStyle = RED;
    for (let x = -w / 2 + 6; x < w / 2; x += 18) { g.beginPath(); g.moveTo(x, -h / 2); g.lineTo(x + 8, -h / 2); g.lineTo(x + 2, h / 2); g.lineTo(x - 6, h / 2); g.closePath(); g.fill(); }
    g.restore();
    g.fillStyle = GOLD;
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * (w / 2 - 3), 0, 7, 0, TAU); g.fill(); g.stroke(); }
  }
  g.restore();
}

/** Tightrope tower: bottom-centre on the floor, 90×270, deck 7% down from the top. */
export function drawTower(g, x, floorY, mirror = false, h = 270) {
  const w = h / 3;
  g.save();
  if (mirror) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
  if (!drawArt(g, 'prop/acrobat-tower', x, floorY, w, h, { anchor: 'bottom', fit: 'stretch' })) {
    const top = floorY - h, deck = top + h * 0.07;
    g.lineWidth = 3.5; g.strokeStyle = NAVY; g.lineJoin = 'round';
    // ladder
    g.strokeStyle = GOLD; g.lineWidth = 4;
    for (let y = deck + 30; y < floorY - 10; y += 26) { g.beginPath(); g.moveTo(x + 10, y); g.lineTo(x + 30, y); g.stroke(); }
    g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + 32, deck + 14); g.lineTo(x + 32, floorY); g.stroke();
    // pole
    g.save(); ui.roundRect(g, x - 11, deck, 22, floorY - deck, 8); g.clip();
    g.fillStyle = '#fff6ea'; g.fillRect(x - 11, deck, 22, floorY - deck);
    g.fillStyle = RED;
    for (let y = deck - 20; y < floorY; y += 30) { g.beginPath(); g.moveTo(x - 11, y); g.lineTo(x + 11, y + 14); g.lineTo(x + 11, y + 28); g.lineTo(x - 11, y + 14); g.closePath(); g.fill(); }
    g.restore();
    g.lineWidth = 3.5; ui.roundRect(g, x - 11, deck, 22, floorY - deck, 8); g.stroke();
    // foot
    g.fillStyle = '#6a4fc4'; g.beginPath(); g.ellipse(x, floorY - 4, 34, 9, 0, 0, TAU); g.fill(); g.stroke();
    // deck
    g.fillStyle = BLUE; g.beginPath(); g.ellipse(x, deck + 6, w * 0.52, 10, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = GOLD; g.beginPath(); g.ellipse(x, deck + 1, w * 0.48, 7, 0, 0, TAU); g.fill(); g.stroke();
  }
  g.restore();
}

/** Safety net from x0 to x1 at y, sagging by `sag` at sx. */
export function drawNet(g, x0, x1, y, sag = 0, sx = (x0 + x1) / 2, t = 0) {
  const yAt = (x) => {
    const u = x <= sx ? (x - x0) / Math.max(1, sx - x0) : (x1 - x) / Math.max(1, x1 - sx);
    return y + 10 * Math.sin(Math.PI * (x - x0) / (x1 - x0)) + sag * Math.sin(u * Math.PI / 2);
  };
  g.save();
  g.lineCap = 'round';
  // posts
  for (const px of [x0, x1]) {
    g.fillStyle = '#6a4fc4'; g.strokeStyle = NAVY; g.lineWidth = 3;
    ui.roundRect(g, px - 6, y - 8, 12, 60, 5); g.fill(); g.stroke();
  }
  // mesh
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
  const step = 22;
  for (let x = x0; x <= x1 - step; x += step) {
    g.beginPath(); g.moveTo(x, yAt(x)); g.lineTo(x + step / 2, yAt(x + step / 2) + 10); g.lineTo(x + step, yAt(x + step)); g.stroke();
    g.beginPath(); g.moveTo(x + step / 2, yAt(x + step / 2) + 10); g.lineTo(x + step / 2, yAt(x + step / 2) + 20); g.stroke();
  }
  g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.moveTo(x0, yAt(x0));
  for (let x = x0; x <= x1; x += 10) g.lineTo(x, yAt(x));
  g.stroke();
  g.strokeStyle = GOLD; g.lineWidth = 2.5; g.stroke();
  g.restore();
  return yAt;
}

/** The big striped balance ball, centred at (x, y), radius r, rolled by `rot`. */
export function drawBall(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (!drawArt(g, 'prop/acrobat-ball', 0, 0, r * 2, r * 2)) {
    const cols = ['#ff6fb1', '#ffd23f', '#4fb8ff', '#4fd98a'];
    for (let i = 0; i < 8; i++) {
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, (i / 8) * TAU, ((i + 1) / 8) * TAU); g.closePath();
      g.fillStyle = cols[i % 4]; g.fill();
    }
    g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fillStyle = '#fff6ea'; g.fill();
    g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    drawStarShape(g, r * 0.42, GOLD);
    g.lineWidth = 4; g.strokeStyle = NAVY; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  }
  g.restore();
  // fixed highlight (doesn't roll)
  g.save(); g.globalAlpha = 0.45; g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(x - r * 0.42, y - r * 0.45, r * 0.22, r * 0.12, -0.7, 0, TAU); g.fill();
  g.restore();
}

/** Party balloon centred at (x, y) (52×68), string trailing below. */
export function drawBalloon(g, x, y, ci, t, alpha = 1) {
  const [name, col] = BALLOON_COLORS[ci % BALLOON_COLORS.length];
  g.save(); g.globalAlpha *= alpha;
  g.strokeStyle = 'rgba(36,22,63,0.7)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, y + 34);
  for (let i = 1; i <= 6; i++) g.lineTo(x + Math.sin(t * 3 + i) * 4, y + 34 + i * 9);
  g.stroke();
  if (!drawArt(g, `prop/acrobat-balloon-${name}`, x, y, 52, 68)) {
    g.lineWidth = 3; g.strokeStyle = NAVY; g.fillStyle = col;
    g.beginPath(); g.ellipse(x, y - 2, 24, 30, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - 6, y + 32); g.lineTo(x + 6, y + 32); g.lineTo(x, y + 26); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(x - 9, y - 14, 6, 9, -0.4, 0, TAU); g.fill();
  }
  g.restore();
}

/** Parasol held at the origin (handle end), pointing up, `h` tall. */
export function drawParasol(g, h = 70) {
  if (drawArt(g, 'prop/acrobat-parasol', 0, 0, h, h, { anchor: 'bottom' })) return;
  const u = h / 70;
  g.save(); g.scale(u, u);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -56); g.stroke();
  g.beginPath(); g.arc(-5, 0, 5, 0, Math.PI); g.stroke();
  // canopy
  g.beginPath(); g.moveTo(-34, -46);
  g.quadraticCurveTo(0, -84, 34, -46);
  for (let i = 4; i > 0; i--) { const x = -34 + (i - 1) * 17; g.quadraticCurveTo(x + 8.5, -40, x, -46); }
  g.closePath();
  g.fillStyle = '#ff9fcf'; g.fill(); g.lineWidth = 3; g.stroke();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(-8, -46); g.quadraticCurveTo(0, -78, 0, -70); g.quadraticCurveTo(0, -78, 8, -46); g.quadraticCurveTo(0, -40, -8, -46); g.fill();
  g.fillStyle = GOLD; g.beginPath(); g.arc(0, -68, 4, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// Little HUD icons for the acts

export function drawActIcon(g, id, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s / 60, s / 60);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
  switch (id) {
    case 'tramp':
      g.fillStyle = BLUE; g.beginPath(); g.ellipse(0, 10, 26, 8, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-18, 14); g.lineTo(-20, 26); g.moveTo(18, 14); g.lineTo(20, 26); g.stroke();
      g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(0, -16, 9, 0, TAU); g.fill(); g.stroke();
      break;
    case 'trapeze':
      g.beginPath(); g.moveTo(-14, -28); g.lineTo(-16, 8); g.moveTo(14, -28); g.lineTo(16, 8); g.stroke();
      g.fillStyle = '#fff6ea'; ui.roundRect(g, -22, 4, 44, 9, 4); g.fill(); g.stroke();
      g.fillStyle = GOLD; g.beginPath(); g.arc(0, 22, 7, 0, TAU); g.fill(); g.stroke();
      break;
    case 'rope':
      g.beginPath(); g.moveTo(-28, 6); g.quadraticCurveTo(0, 14, 28, 6); g.stroke();
      g.fillStyle = '#ff9fcf'; g.beginPath(); g.moveTo(-16, -12); g.quadraticCurveTo(0, -30, 16, -12); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, -12); g.lineTo(0, 4); g.stroke();
      break;
    case 'ball':
      drawBall(g, 0, 4, 22, 0.4);
      break;
    case 'pyramid':
      for (const [px, py] of [[-16, 14], [0, 14], [16, 14], [-8, -2], [8, -2], [0, -18]]) {
        g.fillStyle = ['#ff6fb1', '#4fb8ff', '#ffd23f', '#4fd98a', '#a77bff', '#ff9f1c'][(px + py + 40) % 6 | 0];
        g.beginPath(); g.arc(px, py, 7, 0, TAU); g.fill(); g.stroke();
      }
      break;
    default:   // 'show'
      drawStarShape(g, 26, GOLD);
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// Thumbnail

