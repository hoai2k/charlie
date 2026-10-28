// Plushie Workshop: drawing a plushie. Everything is drawn in the plush frame
// (data.js: one 512 x 560 cell, seat line y = 540). Each body / piece / clothes
// item uses its generated art when it is in assets/art/index.json, else a
// procedural stand-in drawn to the same landmarks.
import { art } from '../../engine/art.js';
import { RAINBOW } from '../../engine/particles.js';
import { clamp, ease, TAU } from '../../engine/util.js';
import { NAVY, CW, CH, F, FLAT, squashAt, BODIES, FABRICS, SEW_ROWS, DRESS_ROWS, bowHome, bowTilt } from './data.js';

const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hex(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
export function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; }

export function heartPath(p, x, y, s) {
  p.moveTo(x, y + s * 0.85);
  p.bezierCurveTo(x - s * 1.25, y + s * 0.05, x - s * 0.75, y - s * 0.95, x, y - s * 0.35);
  p.bezierCurveTo(x + s * 0.75, y - s * 0.95, x + s * 1.25, y + s * 0.05, x, y + s * 0.85);
  p.closePath();
  return p;
}
export function starPath(p, x, y, r, inner = 0.48, n = 5, rot = -Math.PI / 2) {
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? r * inner : r;
    if (i) p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  p.closePath();
  return p;
}
const ell = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; };
const circ = (x, y, r) => ell(x, y, r, r);
const poly = (pts) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };

// ---------------------------------------------------------------------------
// Fabric patterns (tiles in frame px, so they scale with the plush)
const tiles = new Map();
function tileFor(fab) {
  if (!fab.pat) return null;
  if (tiles.has(fab.id)) return tiles.get(fab.id);
  const s = fab.pat === 'rainbow' ? 168 : 56;
  const c = document.createElement('canvas'); c.width = s; c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = fab.pc || '#fff';
  if (fab.pat === 'dots') { for (const [x, y] of [[14, 14], [42, 42]]) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); } }
  else if (fab.pat === 'gingham') { g.globalAlpha = 0.45; g.fillRect(0, 0, 28, 56); g.fillRect(0, 0, 56, 28); g.globalAlpha = 0.35; g.fillRect(0, 0, 28, 28); }
  else if (fab.pat === 'stars') { g.fill(starPath(new Path2D(), 16, 16, 9)); g.fill(starPath(new Path2D(), 44, 42, 6)); }
  else if (fab.pat === 'hearts') { g.fill(heartPath(new Path2D(), 16, 16, 8)); g.fill(heartPath(new Path2D(), 44, 42, 6)); }
  else if (fab.pat === 'stripes') { g.globalAlpha = 0.75; g.fillRect(0, 0, 56, 14); g.fillRect(0, 28, 56, 14); }
  else if (fab.pat === 'rainbow') { RAINBOW.slice(0, 6).forEach((col, i) => { g.fillStyle = mix(col, '#ffffff', 0.35); g.fillRect(0, i * 28, s, 28); }); }
  tiles.set(fab.id, c);
  return c;
}

/** Fill a path with the fabric (colour, pattern, soft shading) and outline it. */
function fabricPart(g, fab, path, shade, lw = 6) {
  g.fillStyle = fab.c; g.fill(path);
  const tile = tileFor(fab);
  if (tile) { g.fillStyle = g.createPattern(tile, 'repeat'); g.fill(path); }
  g.fillStyle = shade; g.fill(path);
  g.lineWidth = lw; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke(path);
}
function trimPart(g, color, path, lw = 5, stroke = true) {
  g.fillStyle = color; g.fill(path);
  if (stroke) { g.lineWidth = lw; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke(path); }
}
function shadeFor(g) {
  const s = g.createRadialGradient(190, 150, 20, 256, 330, 400);
  s.addColorStop(0, 'rgba(255,255,255,0.4)'); s.addColorStop(0.42, 'rgba(255,255,255,0)'); s.addColorStop(1, 'rgba(36,22,63,0.24)');
  return s;
}
/** Rotate an ear about its base: the flat skin's ears flop outwards. */
function droop(g, bx, by, side, p, fn) {
  g.save(); g.translate(bx, by); g.rotate(side * (1 - p) * 0.75); g.translate(-bx, -by); fn(); g.restore();
}

// ---------------------------------------------------------------------------
// Procedural bodies (frame px, stuffed shape; the caller applies the squash)
function drawBodyProc(g, kind, fab, p, t) {
  const shade = shadeFor(g);
  const light = mix(fab.c, '#ffffff', 0.55), pink = '#ffb6d0';
  const wag = Math.sin(t * 2.2) * 0.06;
  // --- behind the body: tails and dragon wings
  if (kind === 'kitty') {
    const tail = new Path2D(); tail.moveTo(370, 505); tail.bezierCurveTo(470, 500, 470, 380, 430, 350 + wag * 80);
    g.lineCap = 'round'; g.lineWidth = 46; g.strokeStyle = NAVY; g.stroke(tail); g.lineWidth = 34; g.strokeStyle = fab.c; g.stroke(tail);
    g.strokeStyle = 'rgba(36,22,63,0.12)'; g.stroke(tail);
  } else if (kind === 'puppy') fabricPart(g, fab, ell(398, 470, 22, 40, 0.7 + wag), shade);
  else if (kind === 'bunny') trimPart(g, '#ffffff', circ(392, 500, 34));
  else if (kind === 'unicorn') { RAINBOW.slice(0, 5).forEach((c, i) => trimPart(g, mix(c, '#ffffff', 0.35), ell(400 + i * 6, 470 + i * 12, 30, 18, 0.6 + wag), 4)); }
  else if (kind === 'dragon') {
    fabricPart(g, fab, poly([[350, 470], [470, 545], [500, 470], [380, 420]]), shade);
    trimPart(g, '#ffd23f', poly([[452, 520], [470, 470], [486, 510]]), 4);
    for (const s of [-1, 1]) {
      const x0 = 256 + s * 100;
      const w = poly([[x0, 330], [x0 + s * 120, 250 + wag * 60], [x0 + s * 110, 330], [x0 + s * 130, 360], [x0 + s * 40, 380]]);
      trimPart(g, '#ffd23f', w);
    }
  }
  // --- body, tummy, feet, arms
  fabricPart(g, fab, ell(256, 430, 140, 112), shade);
  if (kind === 'bear' || kind === 'puppy') trimPart(g, light, ell(256, 440, 82, 64), 4, false);
  if (kind === 'dragon') { trimPart(g, '#fff1b8', ell(256, 440, 80, 74), 4); g.strokeStyle = 'rgba(36,22,63,0.3)'; g.lineWidth = 3; for (let y = 400; y < 500; y += 22) { g.beginPath(); g.moveTo(256 - 60, y); g.quadraticCurveTo(256, y + 10, 256 + 60, y); g.stroke(); } }
  for (const s of [-1, 1]) {
    fabricPart(g, fab, ell(256 + s * 70, 510, 54, 36), shade);
    trimPart(g, pink, ell(256 + s * 70, 514, 28, 18), 3, false);
  }
  for (const s of [-1, 1]) fabricPart(g, fab, ell(256 + s * 128, 400, 40, 62, -s * 0.35), shade);
  // --- ears / horns behind the head
  if (kind === 'bear') for (const s of [-1, 1]) droop(g, 256 + s * 80, 130, s, p, () => { fabricPart(g, fab, circ(256 + s * 92, 105, 42), shade); trimPart(g, pink, circ(256 + s * 92, 108, 22), 3, false); });
  if (kind === 'bunny') for (const s of [-1, 1]) droop(g, 256 + s * 45, 120, s, p, () => { fabricPart(g, fab, ell(256 + s * 46, 58, 32, 66, s * 0.12), shade); trimPart(g, pink, ell(256 + s * 46, 66, 15, 46, s * 0.12), 3, false); });
  if (kind === 'kitty' || kind === 'unicorn') for (const s of [-1, 1]) droop(g, 256 + s * 70, 120, s, p, () => {
    fabricPart(g, fab, poly([[256 + s * 30, 100], [256 + s * 92, 30], [256 + s * 112, 128]]), shade);
    trimPart(g, pink, poly([[256 + s * 52, 98], [256 + s * 90, 56], [256 + s * 100, 116]]), 3, false);
  });
  if (kind === 'dragon') {
    for (let i = 0; i < 5; i++) { const a = -2.2 + i * 0.32, x = 256 + Math.cos(a) * 112, y = 200 + Math.sin(a) * 112; trimPart(g, '#ffd23f', poly([[x - 16, y + 8], [x + Math.cos(a) * 34, y + Math.sin(a) * 34], [x + 16, y + 8]]), 4); }
    for (const s of [-1, 1]) trimPart(g, '#fff1b8', poly([[256 + s * 40, 98], [256 + s * 62, 26], [256 + s * 78, 104]]), 4);
  }
  // --- head
  fabricPart(g, fab, circ(256, 200, 115), shade);
  if (kind === 'kitty') for (const s of [-1, 1]) fabricPart(g, fab, poly([[256 + s * 100, 196], [256 + s * 138, 222], [256 + s * 104, 236]]), shade, 4);
  if (kind === 'bear') trimPart(g, light, ell(256, 252, 56, 40), 4);
  if (kind === 'puppy') trimPart(g, light, ell(256, 250, 64, 44), 4);
  if (kind === 'unicorn') {
    trimPart(g, '#ffd23f', poly([[234, 98], [278, 98], [256, 6]]), 5);
    g.strokeStyle = '#d99b00'; g.lineWidth = 3; for (let i = 1; i < 4; i++) { const y = 98 - i * 22, w = 22 - i * 5; g.beginPath(); g.moveTo(256 - w, y + 6); g.lineTo(256 + w, y - 4); g.stroke(); }
    ['#ff9ed0', '#c6a6ff', '#8fd3ff', '#ffe08a'].forEach((c, i) => trimPart(g, c, circ(296 + i * 22, 92 + i * 30, 30 - i * 2), 4));
  }
  if (kind === 'puppy') for (const s of [-1, 1]) droop(g, 256 + s * 92, 120, -s, p, () => { fabricPart(g, fab, ell(256 + s * 112, 196, 38, 80, -s * 0.28), shade); trimPart(g, mix(fab.c, '#24163f', 0.18), ell(256 + s * 114, 214, 20, 50, -s * 0.28), 3, false); });
  // cheeks
  g.fillStyle = 'rgba(255,120,160,0.28)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(256 + s * 76, 240, 22, 13, 0, 0, TAU); g.fill(); }
  // seams and the flat skin's wrinkles
  g.strokeStyle = 'rgba(36,22,63,0.22)'; g.lineWidth = 3; g.setLineDash([9, 8]);
  g.beginPath(); g.moveTo(256, 330); g.lineTo(256, 360); g.stroke(); g.setLineDash([]);
  const w = 1 - p;
  if (w > 0.02) {
    g.save(); g.globalAlpha = w * 0.75; g.strokeStyle = NAVY; g.lineWidth = 4; g.lineCap = 'round';
    for (const [x, y, dx, dy] of [[170, 410, 60, 18], [300, 380, 70, -12], [210, 470, 90, 10], [330, 450, 40, 22], [180, 170, 50, -14], [290, 140, 60, 16], [200, 260, 40, 10]]) {
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dx * 0.5, y + dy + 14, x + dx, y + dy); g.stroke();
    }
    g.restore();
  }
}

// ---------------------------------------------------------------------------
// Body art (white fabric cells tinted to the fabric, with the trim on top)
const tinted = new Map();
function bodyCell(img, fab, col) {
  const key = `${img.src}|${fab.id}|${col}`;
  if (tinted.has(key)) return tinted.get(key);
  const cw = img.width / 2, ch = img.height / 2;
  const c = document.createElement('canvas'); c.width = Math.round(cw); c.height = Math.round(ch);
  const g = c.getContext('2d');
  g.drawImage(img, col * cw, 0, cw, ch, 0, 0, cw, ch);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = fab.c; g.fillRect(0, 0, cw, ch);
  const tile = tileFor(fab);
  if (tile) { g.globalCompositeOperation = 'source-atop'; g.save(); g.scale(cw / CW, ch / CH); g.globalAlpha = 0.85; g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, CW, CH); g.restore(); }
  g.globalCompositeOperation = 'destination-in'; g.drawImage(img, col * cw, 0, cw, ch, 0, 0, cw, ch);
  g.globalCompositeOperation = 'source-over'; g.drawImage(img, col * cw, ch, cw, ch, 0, 0, cw, ch);   // trim
  tinted.set(key, c);
  if (tinted.size > 32) tinted.delete(tinted.keys().next().value);
  return c;
}

/** The body at puff p in [0, 1] (caller: frame space, no squash yet). */
function drawBody(g, body, fab, p, t) {
  const img = art(`prop/plushie-body-${body.id}`);
  const S = squashAt(p);
  if (!img) {
    g.save(); g.translate(F.cx, F.seat); g.scale(S.sx, S.sy); g.translate(-F.cx, -F.seat);
    drawBodyProc(g, body.id, fab, p, t); g.restore();
    return;
  }
  const a = smooth(0.2, 0.75, p);
  if (a < 1) {   // the flat cell is already squashed: draw it relative to the flat squash
    g.save(); g.translate(F.cx, F.seat); g.scale(S.sx / FLAT.sx, S.sy / FLAT.sy); g.translate(-F.cx, -F.seat);
    g.globalAlpha *= 1 - a; g.drawImage(bodyCell(img, fab, 0), 0, 0, CW, CH); g.restore();
  }
  if (a > 0) {
    g.save(); g.translate(F.cx, F.seat); g.scale(S.sx, S.sy); g.translate(-F.cx, -F.seat);
    g.globalAlpha *= a; g.drawImage(bodyCell(img, fab, 1), 0, 0, CW, CH); g.restore();
  }
}

// ---------------------------------------------------------------------------
// Hit mask: is a frame point on the (stuffed) plush?
const masks = new Map();
/** Release game-owned canvases when the workshop leaves the screen. */
export function clearPlushCaches() {
  tinted.clear();
  masks.clear();
  tiles.clear();
}

export function onPlush(bodyIdx, x, y) {
  const body = BODIES[bodyIdx];
  const hasArt = !!art(`prop/plushie-body-${body.id}`);
  const key = body.id + (hasArt ? '+art' : '');
  let m = masks.get(key);
  if (!m) {
    const D = 4, w = CW / D, h = CH / D;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.scale(1 / D, 1 / D);
    try { drawBody(g, body, FABRICS[0], 1, 0); } catch (e) { /* ignore */ }
    let data = null;
    try { data = g.getImageData(0, 0, w, h).data; } catch (e) { data = null; }
    m = { w, h, D, data };
    masks.set(key, m);
  }
  if (!m.data) return Math.hypot(x - 256, y - 330) < 230;
  const ix = Math.floor(x / m.D), iy = Math.floor(y / m.D);
  if (ix < 0 || iy < 0 || ix >= m.w || iy >= m.h) return false;
  return m.data[(iy * m.w + ix) * 4 + 3] > 100;
}

// ---------------------------------------------------------------------------
// Sewn pieces
function atlasCell(g, key, cols, rows, col, row, x, y, w, h) {
  const img = art(key);
  if (!img) return false;
  const cw = img.width / cols, ch = img.height / rows;
  g.drawImage(img, col * cw, row * ch, cw, ch, x - w / 2, y - h / 2, w, h);
  return true;
}
function stitchRing(g, path, color = 'rgba(255,255,255,0.85)') {
  g.save(); g.setLineDash([7, 7]); g.lineWidth = 2.5; g.strokeStyle = color; g.stroke(path); g.restore();
}
function outline(g, path, lw = 4) { g.lineWidth = lw; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke(path); }

function drawEye(g, i, s) {
  const r = s / 2;
  if (i === 0) { const p = circ(0, 0, r * 0.8); g.fillStyle = '#1c1430'; g.fill(p); outline(g, p, 3); g.fillStyle = '#5b4d78'; for (const dx of [-0.22, 0.22]) { g.beginPath(); g.arc(dx * r, 0, r * 0.13, 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(-r * 0.35, -r * 0.4, r * 0.14, 0, TAU); g.fill(); }
  else if (i === 1) { const p = ell(0, 0, r * 0.72, r * 0.9); g.fillStyle = '#1c1430'; g.fill(p); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.25, -r * 0.35, r * 0.25, 0, TAU); g.fill(); g.beginPath(); g.arc(r * 0.25, r * 0.3, r * 0.12, 0, TAU); g.fill(); }
  else if (i === 2) { g.lineCap = 'round'; g.strokeStyle = '#1c1430'; g.lineWidth = r * 0.24; g.beginPath(); g.arc(0, -r * 0.2, r * 0.7, 0.25, Math.PI - 0.25); g.stroke(); g.lineWidth = r * 0.12; for (const a of [0.6, 1.1, 1.6]) { g.beginPath(); g.moveTo(Math.cos(a) * r * 0.7, -r * 0.2 + Math.sin(a) * r * 0.7); g.lineTo(Math.cos(a) * r * 1.0, -r * 0.2 + Math.sin(a) * r * 1.0); g.stroke(); } }
  else if (i === 3) { const p = heartPath(new Path2D(), 0, 0, r * 0.8); g.fillStyle = '#ff5c9a'; g.fill(p); outline(g, p, 3); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-r * 0.35, -r * 0.3, r * 0.15, 0, TAU); g.fill(); }
  else if (i === 4) { const p = starPath(new Path2D(), 0, 0, r * 0.95); g.fillStyle = '#ffd23f'; g.fill(p); outline(g, p, 3); }
  else if (i === 5) { const p = circ(0, 0, r * 0.88); g.fillStyle = '#fff'; g.fill(p); outline(g, p, 3); g.fillStyle = '#1c1430'; g.beginPath(); g.arc(r * 0.12, r * 0.28, r * 0.42, 0, TAU); g.fill(); }
  else if (i === 6) { const p = ell(0, 0, r * 0.74, r * 0.92); const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#2a4fb8'); gr.addColorStop(1, '#6fd0ff'); g.fillStyle = gr; g.fill(p); outline(g, p, 3); g.fillStyle = '#1c1430'; g.beginPath(); g.ellipse(0, r * 0.05, r * 0.35, r * 0.45, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.25, -r * 0.35, r * 0.22, 0, TAU); g.fill(); g.beginPath(); g.arc(r * 0.25, r * 0.35, r * 0.1, 0, TAU); g.fill(); g.strokeStyle = '#1c1430'; g.lineWidth = r * 0.12; g.lineCap = 'round'; for (const a of [-1.2, -0.8]) { g.beginPath(); g.moveTo(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.9); g.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.2); g.stroke(); } }
  else { g.lineCap = 'round'; g.strokeStyle = '#1c1430'; g.lineWidth = r * 0.26; g.beginPath(); g.arc(0, r * 0.35, r * 0.65, Math.PI + 0.35, -0.35); g.stroke(); }
}
function drawNose(g, i, s) {
  const r = s / 2;
  let p;
  if (i === 0) { p = new Path2D(); p.moveTo(-r * 0.8, -r * 0.4); p.quadraticCurveTo(0, -r * 0.65, r * 0.8, -r * 0.4); p.quadraticCurveTo(r * 0.3, r * 0.6, 0, r * 0.6); p.quadraticCurveTo(-r * 0.3, r * 0.6, -r * 0.8, -r * 0.4); g.fillStyle = '#6b3f2a'; }
  else if (i === 1) { p = poly([[-r * 0.5, -r * 0.35], [r * 0.5, -r * 0.35], [0, r * 0.2]]); g.fillStyle = '#ff8fb5'; g.fill(p); outline(g, p, 3); g.lineWidth = 3; g.beginPath(); g.moveTo(0, r * 0.2); g.lineTo(0, r * 0.6); g.moveTo(0, r * 0.6); g.lineTo(-r * 0.4, r * 0.85); g.moveTo(0, r * 0.6); g.lineTo(r * 0.4, r * 0.85); g.stroke(); return; }
  else if (i === 2) { p = heartPath(new Path2D(), 0, 0, r * 0.6); g.fillStyle = '#ff6fa3'; }
  else if (i === 3) { p = circ(0, 0, r * 0.55); g.fillStyle = '#1c1430'; }
  else if (i === 4) { p = poly([[-r * 0.45, -r * 0.3], [r * 0.45, -r * 0.3], [0, r * 0.35]]); g.fillStyle = '#ffa0bf'; }
  else if (i === 5) { p = ell(0, 0, r * 0.85, r * 0.55); g.fillStyle = '#1c1430'; }
  else if (i === 6) { g.fillStyle = '#3b2b52'; for (const dx of [-0.35, 0.35]) { g.beginPath(); g.ellipse(dx * r, 0, r * 0.18, r * 0.24, dx, 0, TAU); g.fill(); } return; }
  else { p = circ(0, 0, r * 0.7); g.fillStyle = '#ff3b55'; }
  g.fill(p); outline(g, p, 3);
  g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.ellipse(-r * 0.22, -r * 0.18, r * 0.16, r * 0.1, -0.4, 0, TAU); g.fill();
}
function drawMouth(g, i, s) {
  const r = s / 2;
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 5;
  if (i === 0) { g.setLineDash([9, 7]); g.beginPath(); g.arc(0, -r * 0.45, r * 0.7, 0.45, Math.PI - 0.45); g.stroke(); g.setLineDash([]); }
  else if (i === 1) { const p = new Path2D(); p.moveTo(-r * 0.55, -r * 0.1); p.quadraticCurveTo(0, -r * 0.05, r * 0.55, -r * 0.1); p.quadraticCurveTo(r * 0.45, r * 0.6, 0, r * 0.6); p.quadraticCurveTo(-r * 0.45, r * 0.6, -r * 0.55, -r * 0.1); g.fillStyle = '#8a1f3d'; g.fill(p); g.save(); g.clip(p); g.fillStyle = '#ff8fb0'; g.beginPath(); g.ellipse(0, r * 0.5, r * 0.32, r * 0.22, 0, 0, TAU); g.fill(); g.restore(); outline(g, p, 4); }
  else if (i === 2) { g.beginPath(); g.arc(-r * 0.22, -r * 0.1, r * 0.22, 0.1, Math.PI - 0.1); g.arc(r * 0.22, -r * 0.1, r * 0.22, 0.1, Math.PI - 0.1); g.stroke(); }
  else if (i === 3) { const p = ell(0, 0, r * 0.18, r * 0.24); g.fillStyle = '#8a1f3d'; g.fill(p); outline(g, p, 4); }
  else if (i === 4) { g.beginPath(); g.arc(0, -r * 0.5, r * 0.6, 0.5, Math.PI - 0.5); g.stroke(); const p = new Path2D(); p.rect(-r * 0.2, -r * 0.06, r * 0.19, r * 0.3); p.rect(r * 0.01, -r * 0.06, r * 0.19, r * 0.3); g.fillStyle = '#fff'; g.fill(p); outline(g, p, 3); }
  else if (i === 5) { g.beginPath(); g.arc(0, -r * 0.5, r * 0.6, 0.5, Math.PI - 0.5); g.stroke(); const p = new Path2D(); p.moveTo(-r * 0.2, -r * 0.05); p.lineTo(-r * 0.2, r * 0.25); p.arc(0, r * 0.25, r * 0.2, Math.PI, 0, true); p.lineTo(r * 0.2, -r * 0.05); g.fillStyle = '#ff7fa8'; g.fill(p); outline(g, p, 3); }
  else if (i === 6) { g.beginPath(); g.arc(0, -r * 0.5, r * 0.6, 0.5, Math.PI - 0.5); g.stroke(); for (const dx of [-0.25, 0.25]) { const p = poly([[dx * r - r * 0.09, -r * 0.03], [dx * r + r * 0.09, -r * 0.03], [dx * r, r * 0.2]]); g.fillStyle = '#fff'; g.fill(p); outline(g, p, 2.5); } }
  else { const p = new Path2D(); p.moveTo(-r * 0.75, -r * 0.2); p.quadraticCurveTo(0, -r * 0.05, r * 0.75, -r * 0.2); p.quadraticCurveTo(r * 0.55, r * 0.6, 0, r * 0.6); p.quadraticCurveTo(-r * 0.55, r * 0.6, -r * 0.75, -r * 0.2); g.fillStyle = '#8a1f3d'; g.fill(p); g.save(); g.clip(p); g.fillStyle = '#fff'; g.fillRect(-r, -r * 0.3, 2 * r, r * 0.28); g.fillStyle = '#ff8fb0'; g.beginPath(); g.ellipse(0, r * 0.55, r * 0.4, r * 0.25, 0, 0, TAU); g.fill(); g.restore(); outline(g, p, 4); }
}
function drawHeart(g, i, s) {
  const r = s / 2;
  if (i === 5) { for (const [x, y, k, c] of [[-0.35, 0.2, 0.42, '#ff5c8a'], [0.38, 0.1, 0.36, '#ff9ec8'], [0, -0.42, 0.34, '#c38bff']]) { const p = heartPath(new Path2D(), x * r, y * r, r * k); g.fillStyle = c; g.fill(p); outline(g, p, 3); } return; }
  const p = heartPath(new Path2D(), 0, 0, r * 0.82);
  const fill = ['#ff4d6d', '#ff9ec8', null, '#ff7aa8', '#c6a6ff', null, '#ffcf3f', null][i];
  if (i === 2 || i === 7) {
    g.save(); g.clip(p);
    if (i === 2) RAINBOW.slice(0, 6).forEach((c, k) => { g.fillStyle = c; g.fillRect(-r, -r + k * (2 * r / 6), 2 * r, 2 * r / 6 + 1); });
    else [['#ff9ec8', -1, -1], ['#9fd2ff', 0, -1], ['#ffe066', -1, 0], ['#93e3bf', 0, 0]].forEach(([c, x, y]) => { g.fillStyle = c; g.fillRect(x * r, y * r, r, r); });
    g.restore();
  } else { g.fillStyle = fill; g.fill(p); }
  if (i === 6) { g.fillStyle = '#fff6c2'; for (const [x, y] of [[-0.3, -0.2], [0.25, 0.1], [0, 0.4], [0.35, -0.35]]) { g.beginPath(); g.arc(x * r, y * r, r * 0.07, 0, TAU); g.fill(); } }
  outline(g, p, 4);
  const inner = heartPath(new Path2D(), 0, r * 0.02, r * 0.66);
  if (i !== 3) stitchRing(g, inner, i === 7 ? 'rgba(36,22,63,0.6)' : 'rgba(255,255,255,0.85)');
  if (i === 3) { g.fillStyle = 'rgba(36,22,63,0.55)'; for (const dx of [-0.2, 0.2]) { g.beginPath(); g.arc(dx * r, 0, r * 0.1, 0, TAU); g.fill(); } }
  if (i === 4) { const st = starPath(new Path2D(), 0, 0, r * 0.3); g.fillStyle = '#ffd23f'; g.fill(st); outline(g, st, 2); }
}
function drawPatch(g, i, s) {
  const r = s / 2;
  let p;
  if (i === 0) { p = starPath(new Path2D(), 0, 0, r * 0.95, 0.5); g.fillStyle = '#ffd23f'; g.fill(p); }
  else if (i === 1) { p = new Path2D(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; p.moveTo(Math.cos(a) * r * 0.55 + r * 0.32, Math.sin(a) * r * 0.55); p.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.32, r * 0.2, a, 0, TAU); } g.fillStyle = '#ffffff'; g.fill(p); outline(g, p, 3); const c = circ(0, 0, r * 0.3); g.fillStyle = '#ffd23f'; g.fill(c); outline(g, c, 3); return; }
  else if (i === 2) { p = circ(0, 0, r * 0.85); g.fillStyle = '#7fbfff'; g.fill(p); }
  else if (i === 3) { p = new Path2D(); p.rect(-r * 0.78, -r * 0.78, r * 1.56, r * 1.56); g.fillStyle = '#ffffff'; g.fill(p); g.save(); g.clip(p); g.fillStyle = 'rgba(255,77,109,0.55)'; for (let k = -4; k < 4; k++) { g.fillRect(k * r * 0.4, -r, r * 0.2, 2 * r); g.fillRect(-r, k * r * 0.4, 2 * r, r * 0.2); } g.restore(); }
  else if (i === 4) { const R = r * 0.88; p = new Path2D(); p.arc(0, 0, R, -1.27, 1.27, true); p.quadraticCurveTo(-R * 0.25, 0, R * 0.3, -R * 0.955); p.closePath(); g.fillStyle = '#ffe066'; g.fill(p); }
  else if (i === 5) { p = new Path2D(); for (const [x, y, rr] of [[-0.45, 0.15, 0.38], [0, -0.15, 0.5], [0.45, 0.15, 0.38], [0, 0.3, 0.36]]) { p.moveTo(x * r + rr * r, y * r); p.arc(x * r, y * r, rr * r, 0, TAU); } g.fillStyle = '#ffffff'; g.fill(p); outline(g, p, 3); return; }
  else if (i === 6) { RAINBOW.slice(0, 5).forEach((c, k) => { g.beginPath(); g.arc(0, r * 0.4, r * (0.9 - k * 0.13), Math.PI, 0); g.lineWidth = r * 0.14; g.strokeStyle = c; g.stroke(); }); return; }
  else { p = new Path2D(); p.ellipse(0, r * 0.25, r * 0.42, r * 0.34, 0, 0, TAU); for (const [x, y] of [[-0.55, -0.25], [-0.2, -0.6], [0.2, -0.6], [0.55, -0.25]]) { p.moveTo(x * r + r * 0.18, y * r); p.ellipse(x * r, y * r, r * 0.18, r * 0.22, 0, 0, TAU); } g.fillStyle = '#a0662f'; g.fill(p); outline(g, p, 3); return; }
  outline(g, p, 4);
  if (i === 2) { g.save(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, x = Math.cos(a) * r * 0.66, y = Math.sin(a) * r * 0.66, d = r * 0.07; g.beginPath(); g.moveTo(x - d, y - d); g.lineTo(x + d, y + d); g.moveTo(x + d, y - d); g.lineTo(x - d, y + d); g.stroke(); } g.restore(); }
  else stitchRing(g, i === 0 ? starPath(new Path2D(), 0, 0, r * 0.72, 0.5) : i === 3 ? (() => { const q = new Path2D(); q.rect(-r * 0.62, -r * 0.62, r * 1.24, r * 1.24); return q; })() : p, 'rgba(36,22,63,0.45)');
}

/** One piece of a Sew row, centred at (x, y) in frame px (eyes: the pair's midpoint). */
export function drawPiece(g, row, i, x, y, { alpha = 1, k = 1 } = {}) {
  const R = SEW_ROWS[row], s = R.size * k;
  g.save(); g.globalAlpha *= alpha;
  const one = (dx, mirror) => {
    g.save(); g.translate(x + dx, y); if (mirror) g.scale(-1, 1);
    const [key, cols, rows, arow] = R.atlas;
    if (!atlasCell(g, key, cols, rows, i, arow, 0, 0, s * 1.33, s * 1.33)) {
      if (R.id === 'eyes') drawEye(g, i, s); else if (R.id === 'nose') drawNose(g, i, s);
      else if (R.id === 'mouth') drawMouth(g, i, s); else if (R.id === 'heart') drawHeart(g, i, s); else drawPatch(g, i, s);
    }
    g.restore();
  };
  if (R.id === 'eyes') { one(F.eyeDX * k, false); one(-F.eyeDX * k, true); } else one(0, false);
  g.restore();
}
/**
 * The needle's trip round a piece as it's sewn on (frame px): points round its edge, the
 * last back at the first. Eyes go round one eye, hop across (`jump`: no thread there) and
 * round the other.
 */
export function stitchPath(row, x, y) {
  const R = SEW_ROWS[row], pts = [], jump = new Set();
  const loop = (cx, cy, r, n, a0) => { for (let k = 0; k <= n; k++) { const a = a0 + (k / n) * TAU; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); } };
  if (R.id === 'eyes') {
    loop(x - F.eyeDX, y, R.size * 0.52, 6, -Math.PI / 2);
    jump.add(pts.length - 1);
    loop(x + F.eyeDX, y, R.size * 0.52, 6, -Math.PI / 2);
  } else if (R.id === 'mouth') {
    const n = 6; for (let k = 0; k <= n; k++) { const a = -Math.PI / 2 + (k / n) * TAU; pts.push({ x: x + Math.cos(a) * R.size * 0.55, y: y + Math.sin(a) * R.size * 0.3 }); }
  } else loop(x, y, pieceRadius(row) * 0.82, 7, -Math.PI / 2);
  return { pts, jump };
}

/** The thread sewn so far: a running stitch along the path (frame px), `u` = 0..1 of the trip. */
function drawThread(g, path, u, alpha = 1) {
  const { pts, jump } = path, n = pts.length - 1, done = Math.min(n, Math.floor(u * n + 1e-4));
  g.save(); g.globalAlpha *= alpha; g.lineCap = 'round';
  for (let k = 0; k < done; k++) {
    if (jump.has(k)) continue;
    const a = pts[k], b = pts[k + 1];
    const x0 = a.x + (b.x - a.x) * 0.16, y0 = a.y + (b.y - a.y) * 0.16, x1 = a.x + (b.x - a.x) * 0.84, y1 = a.y + (b.y - a.y) * 0.84;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
    g.lineWidth = 7.5; g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = 4.5; g.strokeStyle = '#ff5fa2'; g.stroke();
  }
  for (let k = 0; k <= done; k++) { if (k && jump.has(k - 1) && k === done) continue; const p = pts[k]; g.fillStyle = NAVY; g.beginPath(); g.arc(p.x, p.y, 3.2, 0, TAU); g.fill(); }
  g.restore();
}

/** Half-size of a piece (for "something already sewn here?" and the stitch ring). */
export function pieceRadius(row) { const R = SEW_ROWS[row]; return R.id === 'eyes' ? F.eyeDX + R.size * 0.5 : R.size * 0.55; }

// ---------------------------------------------------------------------------
// Clothes
function drawClothesProc(g, kind, c, c2, w, t) {
  const col = c === 'rainbow' ? RAINBOW[0] : c;
  const r = w / 2;
  if (kind === 'bow') {
    for (const s of [-1, 1]) { const p = ell(s * r * 0.5, 0, r * 0.5, r * 0.32, s * 0.25); g.fillStyle = col; g.fill(p); outline(g, p, 4); }
    for (const s of [-1, 1]) { const p = poly([[0, 0], [s * r * 0.35, r * 0.55], [s * r * 0.12, r * 0.5]]); g.fillStyle = col; g.fill(p); outline(g, p, 3); }
    const k = circ(0, 0, r * 0.18); g.fillStyle = mix(col, '#ffffff', 0.25); g.fill(k); outline(g, k, 4);
  } else if (kind === 'tophat') {
    const b = ell(0, -w * 0.06, r, r * 0.16); g.fillStyle = col; g.fill(b); outline(g, b, 4);
    const p = new Path2D(); p.rect(-r * 0.58, -w * 0.7, r * 1.16, w * 0.64); g.fillStyle = col; g.fill(p); outline(g, p, 4);
    g.fillStyle = '#a77bff'; g.fillRect(-r * 0.58, -w * 0.22, r * 1.16, w * 0.12); outline(g, (() => { const q = new Path2D(); q.rect(-r * 0.58, -w * 0.22, r * 1.16, w * 0.12); return q; })(), 3);
  } else if (kind === 'party') {
    const p = poly([[-r * 0.6, 0], [r * 0.6, 0], [0, -w * 1.3]]); g.save(); g.clip(p); RAINBOW.forEach((cc, k) => { g.fillStyle = mix(cc, '#ffffff', 0.3); g.fillRect(-r, -w * 1.3 + k * w * 0.2, w, w * 0.2); }); g.restore(); outline(g, p, 4);
    const pom = circ(0, -w * 1.3, r * 0.22); g.fillStyle = '#ff6fb1'; g.fill(pom); outline(g, pom, 3);
  } else if (kind === 'witch') {
    const b = ell(0, -w * 0.05, r, r * 0.17); g.fillStyle = col; g.fill(b); outline(g, b, 4);
    const p = new Path2D(); p.moveTo(-r * 0.42, -w * 0.08); p.lineTo(r * 0.42, -w * 0.08); p.quadraticCurveTo(r * 0.2, -w * 0.5, r * 0.55, -w * 0.62); p.quadraticCurveTo(-r * 0.05, -w * 0.55, -r * 0.42, -w * 0.08); g.fillStyle = col; g.fill(p); outline(g, p, 4);
    const st = starPath(new Path2D(), 0, -w * 0.2, r * 0.13); g.fillStyle = '#ffd23f'; g.fill(st); outline(g, st, 2);
  } else if (kind === 'crown' || kind === 'tiara') {
    const h = kind === 'crown' ? w * 0.55 : w * 0.4;
    const p = poly([[-r * 0.8, 0], [r * 0.8, 0], [r * 0.9, -h], [r * 0.45, -h * 0.5], [0, -h * 1.05], [-r * 0.45, -h * 0.5], [-r * 0.9, -h]]);
    g.fillStyle = kind === 'crown' ? col : '#dfe6f7'; g.fill(p); outline(g, p, 4);
    for (const [x, cc] of [[-0.45, '#3fa7ff'], [0, '#ff4d6d'], [0.45, '#5ddc6a']]) { const j = circ(x * r, -h * 0.3, r * 0.1); g.fillStyle = kind === 'crown' ? cc : '#ff8ec4'; g.fill(j); outline(g, j, 2); }
  } else if (kind === 'flowers') {
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + 0.25 + (k / 6) * (Math.PI - 0.5), x = Math.cos(a) * r * 0.9, y = Math.sin(a) * r * 0.32 - r * 0.12;
      const fc = ['#ff8ec4', '#ffffff', '#ffd23f', '#c6a6ff'][k % 4];
      for (let q = 0; q < 5; q++) { const b = q / 5 * TAU; g.fillStyle = fc; g.beginPath(); g.arc(x + Math.cos(b) * r * 0.08, y + Math.sin(b) * r * 0.08, r * 0.07, 0, TAU); g.fill(); }
      g.fillStyle = '#ffb03f'; g.beginPath(); g.arc(x, y, r * 0.05, 0, TAU); g.fill();
    }
  } else if (kind === 'scarf') {
    const band = new Path2D(); band.moveTo(-r, -14); band.quadraticCurveTo(0, 14, r, -14); band.lineTo(r * 0.95, 26); band.quadraticCurveTo(0, 56, -r * 0.95, 26); band.closePath();
    const tail = poly([[r * 0.35, 20], [r * 0.75, 20], [r * 0.85, 150], [r * 0.4, 145]]);
    for (const p of [tail, band]) {
      g.save(); g.clip(p);
      g.fillStyle = col; g.fillRect(-r * 1.2, -40, w * 1.2, 220);
      if (c === 'rainbow') RAINBOW.forEach((cc, k) => { g.fillStyle = cc; g.fillRect(-r * 1.2 + k * w * 0.18, -40, w * 0.09, 220); });
      else { g.fillStyle = c2; for (let x = -r * 1.2; x < r * 1.2; x += 36) g.fillRect(x, -40, 14, 220); }
      g.restore(); outline(g, p, 4);
    }
  } else if (kind === 'bowtie') {
    for (const s of [-1, 1]) { const p = poly([[0, 0], [s * r, -r * 0.5], [s * r, r * 0.5]]); g.fillStyle = col; g.fill(p); outline(g, p, 4); }
    const k = circ(0, 0, r * 0.2); g.fillStyle = mix(col, '#ffffff', 0.2); g.fill(k); outline(g, k, 3);
    g.fillStyle = '#fff'; for (const [x, y] of [[-0.6, -0.1], [0.55, 0.15], [-0.45, 0.25], [0.7, -0.2]]) { g.beginPath(); g.arc(x * r, y * r, r * 0.07, 0, TAU); g.fill(); }
  } else if (kind === 'necklace') {
    g.strokeStyle = col; g.lineWidth = 6; g.setLineDash([2, 8]); g.lineCap = 'round';
    g.beginPath(); g.moveTo(-r * 0.75, -r * 0.5); g.quadraticCurveTo(0, r * 0.35, r * 0.75, -r * 0.5); g.stroke(); g.setLineDash([]);
    const h = heartPath(new Path2D(), 0, r * 0.08, r * 0.2); g.fillStyle = '#ff6fa3'; g.fill(h); outline(g, h, 3);
  } else if (kind === 'tutu') {
    for (let layer = 0; layer < 3; layer++) {
      const y0 = layer * 8, rr = r * (1 - layer * 0.1), dep = 78 - layer * 14, n = 9;
      const p = new Path2D();
      p.moveTo(-rr * 0.5, y0 - 4);
      p.quadraticCurveTo(-rr * 1.02, y0 + dep * 0.3, -rr, y0 + dep * 0.8);
      for (let k = 0; k < n; k++) {
        const x0 = -rr + (k / n) * 2 * rr, x1 = -rr + ((k + 1) / n) * 2 * rr;
        p.quadraticCurveTo((x0 + x1) / 2, y0 + dep * 1.18, x1, y0 + dep * 0.8);
      }
      p.quadraticCurveTo(rr * 1.02, y0 + dep * 0.3, rr * 0.5, y0 - 4); p.closePath();
      const cc = c === 'rainbow' ? mix(RAINBOW[layer * 2], '#ffffff', 0.35) : mix(c, '#ffffff', layer * 0.22);
      g.fillStyle = cc; g.fill(p); outline(g, p, 3);
      g.save(); g.clip(p); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
      for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(k * rr * 0.11, y0); g.lineTo(k * rr * 0.24, y0 + dep); g.stroke(); }
      g.restore();
    }
    const band = new Path2D(); band.ellipse(0, 0, r * 0.52, 12, 0, 0, TAU); g.fillStyle = c === 'rainbow' ? '#ff6fb1' : mix(c, NAVY, 0.15); g.fill(band); outline(g, band, 3);
  } else if (kind === 'cape') {
    const p = new Path2D(); p.moveTo(-r * 0.45, 0); p.lineTo(r * 0.45, 0); p.quadraticCurveTo(r * 0.9, 120, r, 230);
    for (let k = 0; k <= 6; k++) p.quadraticCurveTo(r - (k + 0.5) * (2 * r / 7), 250, r - (k + 1) * (2 * r / 7), 232);
    p.quadraticCurveTo(-r * 0.9, 120, -r * 0.45, 0); p.closePath();
    if (c === 'rainbow') { g.save(); g.clip(p); RAINBOW.forEach((cc, k) => { g.fillStyle = cc; g.fillRect(-r + k * (2 * r / 7), -10, 2 * r / 7 + 1, 280); }); g.restore(); }
    else { g.fillStyle = c; g.fill(p); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill(p); }
    outline(g, p, 4);
    if (c === '#2e3f8f') { g.fillStyle = '#ffd23f'; for (const [x, y] of [[-0.5, 120], [0.4, 80], [0.6, 190], [-0.2, 200], [0.05, 140]]) g.fill(starPath(new Path2D(), x * r, y, 9)); }
  } else if (kind === 'wings' || kind === 'bat') {
    for (const s of [-1, 1]) {
      g.save(); g.scale(s, 1); g.rotate(Math.sin(t * 3) * 0.04);
      let p;
      if (kind === 'wings') { p = new Path2D(); p.ellipse(r * 0.48, -r * 0.18, r * 0.5, r * 0.34, -0.5, 0, TAU); p.moveTo(r * 0.4, r * 0.15); p.ellipse(r * 0.36, r * 0.2, r * 0.3, r * 0.2, 0.5, 0, TAU); }
      else p = poly([[r * 0.05, 0], [r * 0.6, -r * 0.45], [r * 0.95, -r * 0.2], [r * 0.75, -r * 0.05], [r * 0.82, r * 0.12], [r * 0.55, r * 0.05], [r * 0.5, r * 0.25], [r * 0.2, r * 0.12]]);
      g.fillStyle = col; g.fill(p); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill(p); outline(g, p, 4);
      g.restore();
    }
  }
}

/**
 * A worn scarf from the clothes atlas. The generated scarves are a ring seen a little from
 * above (the back of the neck shows as a rim over the front band), so they read as lying
 * flat. Drawn in thin vertical strips: the whole scarf behind the body (its ends wrap round
 * the sides), then over the body only below the rim (an outline closes the cut), with the
 * band sagging into a smile so it hugs the round neck.
 */
const SCARF_CUT = 82, SCARF_SAG = 12;
function scarfCut(x) { return SCARF_CUT * smooth(36, 62, x) * (1 - smooth(186, 206, x)); }
function scarfSag(x) { const u = (x - 128) / 128; return SCARF_SAG * Math.max(0, 1 - u * u); }
function drawScarfArt(g, img, cw, ch, col, arow, front) {
  const dw = 295, k = dw / 256, ax = 128, ay = 96, at = F.neck;
  const sx0 = col * cw, sy0 = arow * ch, q = cw / 256;
  const step = 4;
  for (let x = 0; x < 256; x += step) {
    const cut = front ? scarfCut(x + step / 2) : 0, dy = scarfSag(x + step / 2);
    g.drawImage(img, sx0 + x * q, sy0 + cut * q, step * q + 0.5, (256 - cut) * q,
      at.x + (x - ax) * k - 0.25, at.y + (cut + dy - ay) * k, step * k + 0.5, (256 - cut) * k);
  }
  if (front) {   // close the cut with the art's own outline
    g.beginPath();
    for (let x = 58; x <= 190; x += 4) { const px = at.x + (x - ax) * k, py = at.y + (scarfCut(x) + scarfSag(x) - ay) * k + 1; if (x === 58) g.moveTo(px, py); else g.lineTo(px, py); }
    g.lineWidth = 4.5; g.lineCap = 'round'; g.strokeStyle = NAVY; g.stroke();
  }
}

/**
 * A cape flared out behind the seated plush: the art is split down the middle and each half
 * swings out from its shoulder (with a little billow), widening towards the hem, so the cape
 * shows at both sides of a front-facing plush (the generated capes hang straight down and
 * hid behind the body).
 */
function drawCape(g, img, top, t) {
  const iw = img.width, ih = img.height, n = 24;
  const h = 300, w = 400;
  for (const s of [-1, 1]) {
    const px = F.cx + s * 46, py = top + 18;
    const ang = -s * (0.52 + Math.sin(t * 1.7 + (s > 0 ? 0 : 1.3)) * 0.04);
    g.save(); g.translate(px, py); g.rotate(ang);
    // strips: the inner edge stays at the pivot, the outer edge fans out
    for (let j = 0; j < n; j++) {
      const u0 = j / n, u1 = (j + 1) / n, um = (u0 + u1) / 2;
      const hw = (w / 2) * (0.55 + 0.45 * um);
      const sx = s < 0 ? 0 : iw / 2;
      const dx = s < 0 ? -hw : 0;
      g.drawImage(img, sx, u0 * ih, iw / 2, (u1 - u0) * ih + 0.5, dx, u0 * h - 18, hw, (u1 - u0) * h + 0.6);
    }
    g.restore();
  }
}

/** A puffy stitched heart pillow (the Hug row's stand-in until its art lands). */
function drawPillow(g, c, w) {
  const r = w / 2;
  const p = heartPath(new Path2D(), 0, -r * 0.05, r * 0.86);
  g.fillStyle = c; g.fill(p);
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
  gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(36,22,63,0.2)');
  g.fillStyle = gr; g.fill(p);
  outline(g, p, 5);
  stitchRing(g, heartPath(new Path2D(), 0, -r * 0.03, r * 0.68));
}

/** A little paw (the plush's own fabric) holding a Hug item: a round mitten with toe seams. */
function drawPaw(g, fab, x, y) {
  const p = ell(x, y, 30, 25, 0);
  g.fillStyle = fab.c; g.fill(p);
  const tile = tileFor(fab);
  if (tile) { g.fillStyle = g.createPattern(tile, 'repeat'); g.fill(p); }
  const sh = g.createRadialGradient(x - 10, y - 10, 2, x, y, 32);
  sh.addColorStop(0, 'rgba(255,255,255,0.45)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.05)'); sh.addColorStop(1, 'rgba(36,22,63,0.28)');
  g.fillStyle = sh; g.fill(p);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke(p);
  g.save(); g.strokeStyle = 'rgba(36,22,63,0.55)'; g.lineWidth = 3; g.lineCap = 'round';
  for (const dx of [-10, 0, 10]) { g.beginPath(); g.moveTo(x + dx, y + 24); g.lineTo(x + dx * 0.9, y + 12); g.stroke(); }
  g.restore();
}

/** Where a movable head item (a bow) sits: P.bow, or the item's own spot. */
export function bowAt(P, it) { return (P && P.bow) || bowHome(it); }

/** One clothes item (row, item) in frame px. P (optional): the plush (bow spot, paws' fabric). */
export function drawClothes(g, row, idx, t = 0, P = null) {
  const it = DRESS_ROWS[row].items[idx];
  if (!it || !it.name || idx === 0) return;
  if (it.atlas) {
    const [key, cols, rows, col, arow] = it.atlas;
    const img = art(key);
    if (img) {
      const cw = img.width / cols, ch = img.height / rows;
      drawScarfArt(g, img, cw, ch, col, arow, true);
      return;
    }
    g.save(); g.translate(F.neck.x, F.neck.y);
    drawClothesProc(g, it.pd[0], it.pd[1], it.pd[2], 240, t); g.restore();
    return;
  }
  const img = it.key ? art(it.key) : null;
  if (it.flare && img) { drawCape(g, img, it.top, t); return; }
  let [bx, by, bw] = it.box, rot = it.rot || 0;
  if (it.move) { const b = bowAt(P, it); bx = b.x; by = b.y; rot = bowTilt(it, bx); }
  g.save();
  if (img) {
    const k = bw / img.width, h = img.height * k;
    if (it.grip) {   // held by a paw: the grip lands on it, tilted about it
      const [gx, gy] = it.paws[0];
      g.translate(gx, gy); if (rot) g.rotate(rot);
      g.drawImage(img, -it.grip[0] * bw, -it.grip[1] * h, bw, h);
    } else {
      const cy = it.bottom != null ? it.bottom - h / 2 : it.top != null ? it.top + h / 2 : by;
      g.translate(bx, cy); if (rot) g.rotate(rot);
      g.drawImage(img, -bw / 2, -h / 2, bw, h);
    }
  } else {
    const [kind, c, c2] = it.pd;
    const y = it.bottom != null ? it.bottom : it.top != null ? it.top : by;
    g.translate(bx, y); if (rot) g.rotate(rot);
    if (kind === 'pillow') drawPillow(g, c, bw);
    else drawClothesProc(g, kind, c, c2, bw * (kind === 'bow' ? 0.9 : kind === 'cape' ? 1 : kind === 'wings' || kind === 'bat' ? 0.9 : 1), t);
  }
  g.restore();
  if (it.paws && P) { const fab = FABRICS[P.fabric]; for (const [x, y] of it.paws) drawPaw(g, fab, x, y); }
}

/** The part of a worn item drawn behind the body (scarves' back strand). */
function drawClothesBehind(g, row, idx) {
  const it = DRESS_ROWS[row].items[idx];
  if (!it || !idx || !it.atlas) return;
  const [key, cols, rows, col, arow] = it.atlas, img = art(key);
  if (img) drawScarfArt(g, img, img.width / cols, img.height / rows, col, arow, false);
}

// ---------------------------------------------------------------------------
/**
 * Draw a plushie. (x, y) = its seat point on screen; size = the frame's height
 * on screen (CH frame px). P: { body, fabric, puff, pieces, dress }.
 * opts.wob: squishy wobble 0..1, opts.t: time, opts.extra(g): drawn in frame space last.
 */
export function drawPlush(g, P, x, y, size, opts = {}) {
  const t = opts.t || 0, k = size / CH;
  const body = BODIES[P.body], fab = FABRICS[P.fabric];
  const p = clamp(P.puff, 0, 1);
  const wob = opts.wob || 0;
  const S = squashAt(p);
  const wx = 1 + Math.sin(t * 22) * 0.05 * wob, wy = 1 - Math.sin(t * 22) * 0.05 * wob;
  g.save();
  g.translate(x, y); g.scale(k * wx, k * wy); g.translate(-F.cx, -F.seat);
  if (opts.tilt) { g.translate(F.cx, F.seat); g.rotate(opts.tilt); g.translate(-F.cx, -F.seat); }
  const dress = P.dress || [0, 0, 0, 0];
  const inSquash = (fn) => { g.save(); g.translate(F.cx, F.seat); g.scale(S.sx, S.sy); g.translate(-F.cx, -F.seat); fn(); g.restore(); };
  // behind: capes and wings, and the back of a scarf
  if (dress[3]) inSquash(() => drawClothes(g, 3, dress[3], t, P));
  if (dress[1]) inSquash(() => drawClothesBehind(g, 1, dress[1]));
  drawBody(g, body, fab, p, t);
  inSquash(() => {
    for (const pc of P.pieces || []) {
      const st = pc.st ?? 9, sew = pc.sew || 0;
      // While it's being sewn on it sits held in place (a touch big and see-through), the thread
      // going on stitch by stitch; then it settles with a little pop and the thread tucks in.
      const s2 = st - sew;
      const k = s2 < 0 ? 1.06 : s2 < 0.32 ? 1 + 0.22 * Math.sin((s2 / 0.32) * Math.PI) * (1 - s2 / 0.32 * 0.5) : 1;
      g.save(); g.translate(pc.x, pc.y); g.scale(k, k); g.translate(-pc.x, -pc.y);
      drawPiece(g, pc.row, pc.i, pc.x, pc.y, { alpha: s2 < 0 ? 0.82 : 1 });
      g.restore();
      if (sew && s2 < 0.45) {
        if (!pc._path) pc._path = stitchPath(pc.row, pc.x, pc.y);
        drawThread(g, pc._path, clamp(st / sew, 0, 1), s2 > 0.15 ? 1 - (s2 - 0.15) / 0.3 : 1);
      }
    }
    if (dress[1]) drawClothes(g, 1, dress[1], t, P);
    if (dress[2]) drawClothes(g, 2, dress[2], t, P);
    if (dress[0]) drawClothes(g, 0, dress[0], t, P);
    if (opts.extra) opts.extra(g);
  });
  g.restore();
}

/** Screen point -> frame point for a plush drawn at (x, y, size) with puff p (inverse of drawPlush). */
export function toFrame(x, y, sx, sy, size, p) {
  const k = size / CH, S = squashAt(clamp(p, 0, 1));
  return { x: F.cx + (sx - x) / k / S.sx, y: F.seat + (sy - y) / k / S.sy };
}
export function toScreen(x, y, fx, fy, size, p) {
  const k = size / CH, S = squashAt(clamp(p, 0, 1));
  return { x: x + (fx - F.cx) * S.sx * k, y: y + (fy - F.seat) * S.sy * k };
}

/** A fluffy puff of stuffing (art or drawn), centred, `r` px radius. */
export function drawFluff(g, x, y, r, rot = 0, alpha = 1) {
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(rot);
  const img = art('prop/plushie-stuffing');
  if (img) g.drawImage(img, -r, -r, 2 * r, 2 * r);
  else {
    const p = new Path2D();
    for (const [dx, dy, rr] of [[-0.4, 0.1, 0.5], [0.05, -0.3, 0.55], [0.45, 0.05, 0.48], [0, 0.35, 0.45]]) { p.moveTo(dx * r + rr * r, dy * r); p.arc(dx * r, dy * r, rr * r, 0, TAU); }
    g.fillStyle = '#ffffff'; g.fill(p); g.lineWidth = Math.max(1.5, r * 0.08); g.strokeStyle = 'rgba(36,22,63,0.5)'; g.stroke(p); g.fillStyle = '#ffffff'; g.fill(p);
    g.fillStyle = 'rgba(160,170,200,0.25)'; g.beginPath(); g.arc(r * 0.2, r * 0.25, r * 0.4, 0, TAU); g.fill();
  }
  g.restore();
}

/** The sewing needle with its point at (x, y). */
export function drawNeedle(g, x, y, s, bob = 0, thread = '#ff5fa2') {
  const img = art('prop/plushie-needle');
  g.save(); g.translate(x, y - bob);
  if (img) { const k = s / 256; g.drawImage(img, -28 * k, -228 * k, 256 * k, 256 * k); g.restore(); return; }
  const L = s * 0.85;
  g.rotate(-Math.PI / 4);
  // thread loop
  g.strokeStyle = thread; g.lineWidth = Math.max(2, s * 0.03); g.lineCap = 'round';
  g.beginPath(); g.moveTo(L * 0.92, 0); g.bezierCurveTo(L * 1.15, -s * 0.25, L * 0.9, -s * 0.38, L * 0.7, -s * 0.2); g.stroke();
  const p = new Path2D(); p.moveTo(0, 0); p.lineTo(L * 0.2, -s * 0.035); p.lineTo(L, -s * 0.035); p.arc(L, 0, s * 0.035, -Math.PI / 2, Math.PI / 2); p.lineTo(L * 0.2, s * 0.035); p.closePath();
  const gr = g.createLinearGradient(0, -s * 0.04, 0, s * 0.04); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9aa6c2');
  g.fillStyle = gr; g.fill(p); g.lineWidth = Math.max(2, s * 0.022); g.strokeStyle = NAVY; g.stroke(p);
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(L * 0.92, 0, s * 0.03, s * 0.012, 0, 0, TAU); g.fill();
  g.restore();
}

/** A round fabric swatch (the Fabric list). */
export function drawSwatch(g, fab, x, y, r) {
  const p = circ(x, y, r);
  g.save();
  g.fillStyle = fab.c; g.fill(p);
  const tile = tileFor(fab);
  if (tile) { g.save(); g.clip(p); g.translate(x, y); g.scale(r / 60, r / 60); g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(-80, -80, 160, 160); g.restore(); }
  const sh = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  sh.addColorStop(0, 'rgba(255,255,255,0.45)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(36,22,63,0.2)');
  g.fillStyle = sh; g.fill(p);
  g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(p);
  g.restore();
}
