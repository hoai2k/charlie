// Gopher Gardens: procedural stand-ins for the requested art (image-requests.md,
// "gopher-garden"). Each is replaced by its art key once that is in assets/art/index.json.
import { TAU } from '../../engine/util.js';
import { drawSparkleShape } from '../../engine/emotes.js';

export const NAVY = '#24163f';

// Hole geometry, shared with the prop/gopher-hole art (320x160 canvas): the dark opening
// is an ellipse centred at (160, 78), 170 x 64 px. `w` is the hole's drawn width.
export function holeOpening(x, y, w) {
  const k = w / 320;
  return { cx: x, cy: y + (78 - 80) * k, rx: 85 * k, ry: 32 * k };
}

/** The back of a dirt-mound hole, centred at (0, 0), `w` wide. */
export function drawHoleBack(g, w, dirt = 0) {
  const k = w / 320;
  g.save(); g.scale(k, k);
  g.lineJoin = 'round';
  // mound
  g.fillStyle = '#9a6a43'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, 4, 150, 62, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#b07e52'; g.beginPath(); g.ellipse(0, -10, 128, 44, 0, Math.PI, TAU); g.fill();
  // pebbles and tufts on the far side
  g.fillStyle = '#d8c7b0';
  for (const [px, py, r] of [[-108, -18, 7], [96, -26, 6], [118, -6, 5]]) { g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); g.lineWidth = 2.5; g.stroke(); }
  g.strokeStyle = '#4f9a3e'; g.lineWidth = 5; g.lineCap = 'round';
  for (const sx of [-70, 60]) { g.beginPath(); g.moveTo(sx, -40); g.lineTo(sx - 6, -58); g.moveTo(sx + 6, -40); g.lineTo(sx + 8, -60); g.moveTo(sx + 12, -40); g.lineTo(sx + 20, -54); g.stroke(); }
  // the opening
  g.fillStyle = '#2b190f'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, -2, 85, 32, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 6, 70, 20, 0, 0, TAU); g.fill();
  if (dirt > 0) {
    g.globalAlpha = Math.min(1, dirt); g.fillStyle = '#8a5a3c';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((i - 2.5) * 30, -40 - Math.sin(i * 1.7) * 16, 9, 0, TAU); g.fill(); }
  }
  g.restore();
}

/** The front lip of the mound, drawn over whatever pops out of it. */
export function drawHoleFront(g, w) {
  const k = w / 320;
  g.save(); g.scale(k, k);
  g.lineJoin = 'round';
  g.beginPath();
  g.ellipse(0, 4, 150, 62, 0, 0, Math.PI);           // outer front edge, right to left
  g.ellipse(0, -2, 85, 32, 0, Math.PI, 0, true);      // back along the opening's front arc
  g.closePath();
  g.fillStyle = '#9a6a43'; g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 5; g.stroke();
  // soft highlight on the lip and a pebble + tuft
  g.strokeStyle = 'rgba(255,230,190,0.45)'; g.lineWidth = 6;
  g.beginPath(); g.ellipse(0, -2, 98, 42, 0, 0.35, Math.PI - 0.35); g.stroke();
  g.fillStyle = '#d8c7b0'; g.strokeStyle = NAVY; g.lineWidth = 2.5;
  g.beginPath(); g.arc(-70, 44, 8, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = '#4f9a3e'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(98, 50); g.lineTo(92, 30); g.moveTo(104, 50); g.lineTo(108, 28); g.moveTo(110, 50); g.lineTo(120, 34); g.stroke();
  g.restore();
}

/**
 * A cute gopher from the tummy up, bottom centre at (0, 0), `w` wide.
 * mood: 'up' | 'wink' | 'tease' | 'bonked'.
 */
export function drawGopher(g, w, mood, { t = 0, blink = false } = {}) {
  const k = w / 160;
  g.save(); g.scale(k, k);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const fur = '#c98a4b', cream = '#f6e2c0';
  // body
  g.fillStyle = fur; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath();
  g.moveTo(-62, 10); g.bezierCurveTo(-66, -60, -58, -112, 0, -116); g.bezierCurveTo(58, -112, 66, -60, 62, 10); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = cream; g.beginPath(); g.ellipse(0, -30, 36, 46, 0, 0, TAU); g.fill();
  // head
  const hy = -126;
  g.fillStyle = fur;
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 38, hy - 34, 15, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#f2a7a0'; g.beginPath(); g.arc(sx * 38, hy - 34, 7, 0, TAU); g.fill(); g.fillStyle = fur; }
  g.beginPath(); g.ellipse(0, hy, 54, 48, 0, 0, TAU); g.fill(); g.stroke();
  if (mood === 'bonked') {
    // a little bump
    g.fillStyle = '#f7a1b8'; g.beginPath(); g.ellipse(10, hy - 48, 14, 11, 0, Math.PI, TAU); g.fill(); g.stroke();
  }
  // muzzle
  g.fillStyle = cream; g.beginPath(); g.ellipse(0, hy + 18, 30, 22, 0, 0, TAU); g.fill();
  // eyes
  g.strokeStyle = NAVY; g.fillStyle = NAVY; g.lineWidth = 4.5;
  if (mood === 'bonked') {
    for (const sx of [-1, 1]) {
      g.beginPath();
      for (let i = 0; i <= 20; i++) { const a = i * 0.65 + t * 6 * sx, r = i * 0.62; const px = sx * 22 + Math.cos(a) * r, py = hy - 8 + Math.sin(a) * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
    }
  } else {
    for (const sx of [-1, 1]) {
      if (blink || (mood === 'wink' && sx > 0)) { g.beginPath(); g.arc(sx * 22, hy - 6, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
      g.beginPath(); g.ellipse(sx * 22, hy - 8, 8.5, 11, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * 22 + 3, hy - 12, 3.4, 0, TAU); g.fill(); g.fillStyle = NAVY;
    }
  }
  // cheeks
  g.fillStyle = 'rgba(255,120,140,0.45)';
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 38, hy + 12, 9, 6, 0, 0, TAU); g.fill(); }
  // nose
  g.fillStyle = '#ff8fa3'; g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath(); g.ellipse(0, hy + 8, 9, 6.5, 0, 0, TAU); g.fill(); g.stroke();
  // mouth + teeth
  g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(-12, hy + 20); g.quadraticCurveTo(-6, hy + 26, 0, hy + 20); g.quadraticCurveTo(6, hy + 26, 12, hy + 20); g.stroke();
  g.fillStyle = '#fff';
  g.beginPath(); g.rect(-7, hy + 22, 7, 11); g.rect(0, hy + 22, 7, 11); g.fill(); g.stroke();
  if (mood === 'tease' || mood === 'bonked' || mood === 'wink') {
    g.fillStyle = '#ff6f91';
    g.beginPath(); g.ellipse(mood === 'bonked' ? 10 : 6, hy + 38, 8, 10, mood === 'bonked' ? 0.4 : 0, 0, TAU); g.fill(); g.stroke();
  }
  // paws
  g.fillStyle = fur; g.strokeStyle = NAVY; g.lineWidth = 4;
  const pawY = mood === 'up' ? hy + 34 : -52;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * (mood === 'up' ? 50 : 44), pawY, 13, 11, 0, 0, TAU); g.fill(); g.stroke(); }
  g.restore();
}

/** Stars circling a dazed head at (0, 0). */
export function drawDazeStars(g, r, t, color = '#ffd23f') {
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + (i / 3) * TAU;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.32;
    g.save(); g.translate(x, y); g.globalAlpha = 0.6 + 0.4 * Math.sin(a);
    drawSparkleShape(g, r * 0.32, color);
    g.restore();
  }
}

/**
 * A soft squeaky toy mallet, lying along +x from the grip at (0, 0): handle knob just
 * behind the grip, the head at about 0.85 L. Matches prop/gopher-mallet's layout
 * (480x200, grip at (96, 100)).
 */
export function drawMallet(g, L, color) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  const hr = L * 0.04;
  // handle
  g.fillStyle = '#fff4e6'; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.roundRect(-L * 0.16, -hr, L * 0.86, hr * 2, hr); g.fill(); g.stroke();
  g.save(); g.beginPath(); g.roundRect(-L * 0.16, -hr, L * 0.86, hr * 2, hr); g.clip();
  g.strokeStyle = '#ff7eb6'; g.lineWidth = hr * 0.9;
  for (let i = 0; i < 8; i++) { const x = -L * 0.14 + i * L * 0.1; g.beginPath(); g.moveTo(x, hr * 1.4); g.lineTo(x + hr * 1.6, -hr * 1.4); g.stroke(); }
  g.restore();
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.arc(-L * 0.17, 0, hr * 1.6, 0, TAU); g.fill(); g.stroke();
  // head: a squishy barrel across the end of the handle
  const hx = L * 0.84, hw = L * 0.17, hh = L * 0.22;
  g.fillStyle = color;
  g.beginPath(); g.roundRect(hx - hw, -hh, hw * 2, hh * 2, hw * 0.7); g.fill(); g.stroke();
  g.fillStyle = '#ffffff';
  for (const sy of [-1, 1]) { g.beginPath(); g.ellipse(hx, sy * hh, hw * 0.98, hh * 0.18, 0, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(hx - hw * 0.45, 0, hw * 0.22, hh * 0.55, 0, 0, TAU); g.fill();
  g.save(); g.translate(hx + hw * 0.15, 0); drawSparkleShape(g, hw * 0.55, '#ffe066'); g.restore();
  g.restore();
}

/** The whole garden (cached by the game). Holes are drawn per frame, not here. */
export function drawGardenBackground(g, W, H) {
  // sky
  const sky = g.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#d8f1ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, 300);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [cx, cy, s] of [[330, 90, 1], [1450, 70, 1.2], [960, 140, 0.7]]) {
    for (const [dx, dy, r] of [[-50, 10, 34], [0, -8, 46], [52, 8, 36], [100, 16, 26]]) { g.beginPath(); g.arc(cx + dx * s, cy + dy * s, r * s, 0, TAU); g.fill(); }
  }
  g.fillStyle = '#fff2a0'; g.beginPath(); g.arc(1760, 80, 54, 0, TAU); g.fill();
  // hedge
  g.fillStyle = '#3f8f3a'; g.fillRect(0, 200, W, 120);
  g.fillStyle = '#4fa646';
  for (let x = -20; x < W + 40; x += 64) { g.beginPath(); g.arc(x, 210 + ((x / 64) % 2) * 6, 42, 0, TAU); g.fill(); }
  g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.moveTo(0, 318); g.lineTo(W, 318); g.stroke();
  // gate
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) { const x = 900 + i * 22; g.beginPath(); g.moveTo(x, 320); g.lineTo(x, 238); g.lineTo(x + 8, 228); g.lineTo(x + 16, 238); g.lineTo(x + 16, 320); g.closePath(); g.fill(); g.lineWidth = 2.5; g.stroke(); }
  // flower bed
  g.fillStyle = '#7a5434'; g.fillRect(0, 318, W, 34);
  const cols = ['#ff7eb6', '#ffd23f', '#ffffff', '#b07ae8', '#ff8c5a'];
  for (let i = 0; i < 44; i++) {
    const x = 20 + i * 44 + (i % 3) * 6, y = 318 + (i % 2) * 10, c = cols[i % cols.length];
    g.strokeStyle = '#3f8f3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 20); g.lineTo(x, y); g.stroke();
    g.fillStyle = c;
    for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 6, 0, TAU); g.fill(); }
    g.fillStyle = '#ffb000'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
  }
  // lawn with mown stripes
  const lawn = g.createLinearGradient(0, 350, 0, H);
  lawn.addColorStop(0, '#86cf5d'); lawn.addColorStop(1, '#6dbb4a');
  g.fillStyle = lawn; g.fillRect(0, 350, W, H - 350);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 12; i += 2) { g.beginPath(); g.moveTo(i * 180 - 120, H); g.lineTo(i * 180 + 60, 350); g.lineTo(i * 180 + 220, 350); g.lineTo(i * 180 + 60, H); g.closePath(); g.fill(); }
  // a few clover tufts and daisies on the lawn
  for (let i = 0; i < 40; i++) {
    const x = (i * 397 + 53) % W, y = 380 + ((i * 211) % (H - 400));
    if (i % 3) { g.fillStyle = 'rgba(60,130,50,0.35)'; g.beginPath(); g.ellipse(x, y, 12, 5, 0, 0, TAU); g.fill(); }
    else { g.fillStyle = '#ffffff'; for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 3, 3.5, 0, TAU); g.fill(); } g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill(); }
  }
}
