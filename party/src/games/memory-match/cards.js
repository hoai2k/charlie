// Unicorn Memory Match: card art. Card backs (unicorn + stars) and faces
// (a character from the roster) are rendered once per size into bitmaps.
import { getBaseImage } from '../../engine/sprites.js';
import { art } from '../../engine/art.js';
import { CHARACTERS, charById } from '../../data/characters.js';
import { drawStarShape, drawSparkleShape, drawHeartShape } from '../../engine/emotes.js';
import { FONT } from '../../engine/ui.js';
import { TAU } from '../../engine/util.js';

const NAVY = '#24163f';
const RES = 2; // bitmap oversampling for crisp cards on big TVs

/** Every face a card can show: each roster entry plus a few extra members. */
export function allFaces() {
  const short = { unicorn: 'Unicorn' };
  const faces = CHARACTERS.map((c) => ({ key: c.id, charId: c.id, asset: c.members[0].asset, face: c.members[0].face, name: short[c.id] || c.name, color: c.color }));
  const extra = [
    { key: 'fellowfox', charId: 'felicity', asset: 'fellowfox', name: 'Fellowfox', color: '#ff9b4a', face: memberFace('felicity', 1) },
    { key: 'kpop-left', charId: 'kpop-girls', asset: 'kpop-girl-left', name: 'KPop Girl', color: '#ff7ad9', face: memberFace('kpop-girls', 1) },
    { key: 'kpop-right', charId: 'kpop-girls', asset: 'kpop-girl-right', name: 'KPop Girl', color: '#ff9f6a', face: memberFace('kpop-girls', 2) },
  ];
  return faces.concat(extra);
}

const memberFace = (id, i) => charById(id)?.members[i]?.face || [0.5, 0.3, 0.2];

function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const cache = new Map();
function cached(key, w, h, paint) {
  const k = `${key}|${Math.round(w)}x${Math.round(h)}`;
  let c = cache.get(k);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES);
    const g = c.getContext('2d');
    g.scale(RES, RES);
    paint(g, w, h);
    cache.set(k, c);
  }
  return c;
}

/** Card back centered at (x, y). */
export function drawCardBack(g, x, y, w, h) {
  // prop/card-back (same file as the older prop/memory-card-back key): its visible
  // card (transparent padding trimmed) is stretched to the card.
  const img = art('prop/card-back') || art('prop/memory-card-back');
  if (img) { const b = opaqueBox(img); g.drawImage(img, b.x, b.y, b.w, b.h, x - w / 2, y - h / 2, w, h); return; }
  g.drawImage(cached('back', w, h, paintBack), x - w / 2, y - h / 2, w, h);
}

// Opaque bounds of an image (measured once per image).
const boxes = new WeakMap();
function opaqueBox(img) {
  let b = boxes.get(img);
  if (b) return b;
  b = { x: 0, y: 0, w: img.width, h: img.height };
  try {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const cg = c.getContext('2d'); cg.drawImage(img, 0, 0);
    const d = cg.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 >= x0) b = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  } catch (e) { /* tainted or not ready: draw the whole image */ }
  boxes.set(img, b);
  return b;
}

/** Card face for `face` (from allFaces) centered at (x, y). */
export function drawCardFace(g, face, x, y, w, h) {
  const frame = art('prop/card-front');
  const c = cached((frame ? 'framed-' : 'face-') + face.key, w, h, (cg, cw, ch) => paintFace(cg, cw, ch, face, frame));
  g.drawImage(c, x - w / 2, y - h / 2, w, h);
}

function paintBack(g, w, h) {
  const r = Math.min(w, h) * 0.12;
  rr(g, 2, 2, w - 4, h - 4, r);
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#c9a8ff'); gr.addColorStop(0.55, '#ff9ed8'); gr.addColorStop(1, '#ffc9a8');
  g.fillStyle = gr; g.fill();
  g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  // inner frame
  rr(g, w * 0.07, h * 0.055, w * 0.86, h * 0.89, r * 0.7);
  g.lineWidth = Math.max(2, w * 0.025); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
  // rainbow arc
  g.save(); rr(g, w * 0.07, h * 0.055, w * 0.86, h * 0.89, r * 0.7); g.clip();
  const cols = ['#ff6b8b', '#ffb04d', '#ffe066', '#7fe08a', '#7fc8ff', '#b48cff'];
  cols.forEach((c, i) => {
    g.strokeStyle = c; g.globalAlpha = 0.55; g.lineWidth = w * 0.045;
    g.beginPath(); g.arc(w / 2, h * 0.86, w * (0.52 - i * 0.045), Math.PI, TAU); g.stroke();
  });
  g.globalAlpha = 1;
  g.restore();
  // corner sparkles
  for (const [sx, sy, s] of [[0.2, 0.14, 0.13], [0.82, 0.18, 0.1], [0.18, 0.86, 0.09], [0.84, 0.84, 0.12]]) {
    g.save(); g.translate(w * sx, h * sy); drawSparkleShape(g, w * s * 1.5, '#ffffff'); g.restore();
  }
  // unicorn head
  g.save(); g.translate(w * 0.5, h * 0.53);
  const s = Math.min(w, h * 0.78) / 100;
  g.scale(s, s);
  drawUnicornHead(g);
  g.restore();
  // little stars
  g.save(); g.translate(w * 0.24, h * 0.36); drawStarShape(g, w * 0.13, '#ffe066'); g.restore();
  g.save(); g.translate(w * 0.78, h * 0.68); drawStarShape(g, w * 0.1, '#fff3a6'); g.restore();
}

/** Cute unicorn head facing right in a ~100 px box centered on the origin. */
export function drawUnicornHead(g) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 3.5;
  // mane (behind)
  const mane = ['#ff7ad9', '#b48cff', '#7fd3ff', '#ffd23f'];
  mane.forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath(); g.arc(-24 + i * 2, -22 + i * 15, 15 - i, 0, TAU); g.fill(); g.stroke();
  });
  // neck + head
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(-18, 40);
  g.bezierCurveTo(-26, 10, -18, -22, 2, -28);
  g.bezierCurveTo(22, -32, 34, -16, 38, -2);
  g.bezierCurveTo(44, 12, 36, 22, 24, 20);
  g.bezierCurveTo(14, 18, 10, 24, 12, 40);
  g.closePath(); g.fill(); g.stroke();
  // ear
  g.beginPath(); g.moveTo(-6, -24); g.lineTo(-2, -44); g.lineTo(10, -28); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffc2e4'; g.beginPath(); g.moveTo(-3, -27); g.lineTo(-1, -38); g.lineTo(6, -29); g.closePath(); g.fill();
  // horn
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.moveTo(4, -30); g.lineTo(28, -60); g.lineTo(16, -26); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#e09a12'; g.lineWidth = 2;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(6 + i * 4, -30 - i * 7); g.lineTo(13 + i * 4, -28 - i * 7); g.stroke(); }
  g.strokeStyle = NAVY; g.lineWidth = 3.5;
  // forelock
  g.fillStyle = '#ff7ad9'; g.beginPath(); g.arc(-4, -22, 9, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#b48cff'; g.beginPath(); g.arc(-14, -14, 8, 0, TAU); g.fill(); g.stroke();
  // happy closed eye + lashes
  g.beginPath(); g.arc(14, -8, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.beginPath(); g.moveTo(9, -4); g.lineTo(6, 0); g.moveTo(13, -2); g.lineTo(12, 3); g.stroke();
  // cheek + nostril + smile
  g.fillStyle = 'rgba(255,120,170,0.55)'; g.beginPath(); g.ellipse(20, 6, 6, 4, 0, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(34, 6, 1.8, 0, TAU); g.fill();
  g.beginPath(); g.arc(30, 12, 5, 0.2 * Math.PI, 0.7 * Math.PI); g.stroke();
}

function paintFace(g, w, h, face, frame) {
  let r = Math.min(w, h) * 0.12;
  // pastel window (inside the generated card-front frame's cream panel when it exists:
  // that panel spans x 11-89%, y 9-90% of the 300x399 image)
  let ix = w * 0.07, iy = h * 0.055, iw = w * 0.86, ih = h * 0.7, nameY = null;
  if (frame) {
    g.drawImage(frame, 0, 0, w, h);
    ix = w * 0.135; iy = h * 0.115; iw = w * 0.73; ih = h * 0.6; r = Math.min(w, h) * 0.07;
    nameY = iy + ih + (h * 0.885 - iy - ih) * 0.5;
  } else {
    rr(g, 2, 2, w - 4, h - 4, r);
    g.fillStyle = '#fffaf2'; g.fill();
    g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  }
  g.save(); rr(g, ix, iy, iw, ih, r * 0.7); g.clip();
  const gr = g.createLinearGradient(0, iy, 0, iy + ih);
  gr.addColorStop(0, lighten(face.color, 0.78)); gr.addColorStop(1, lighten(face.color, 0.45));
  g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  g.globalAlpha = 0.35; g.fillStyle = '#ffffff';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(ix + iw * ((i * 0.37) % 1), iy + ih * ((i * 0.53 + 0.1) % 1), w * 0.05, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  const img = getBaseImage(face.asset);
  if (img) {
    // Bust crop: zoom so the face is big and readable, centered in the window.
    const [fx, fy, fr] = face.face;
    const ihh = img.height;
    let s = (iw * 0.3) / (fr * ihh);
    s = Math.min(s, (ih * 1.6) / ihh);                       // don't over-zoom tiny faces
    s = Math.max(s, Math.min((iw * 0.9) / img.width, (ih * 0.95) / ihh)); // never smaller than full body
    const dx = ix + iw / 2 - fx * ihh * s, dy = iy + ih * 0.4 - fy * ihh * s;
    g.drawImage(img, Math.min(ix, Math.max(ix + iw - img.width * s, dx)), Math.min(iy + ih * 0.04, dy), img.width * s, ihh * s);
  } else {
    g.save(); g.translate(ix + iw / 2, iy + ih / 2); drawHeartShape(g, w * 0.4, face.color); g.restore();
  }
  g.restore();
  rr(g, ix, iy, iw, ih, r * 0.7); g.lineWidth = 2.5; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.stroke();
  // name ribbon
  const ny = nameY ?? iy + ih + (h - iy - ih) * 0.48;
  const maxW = frame ? w * 0.72 : w * 0.86;
  let size = Math.min(h * (frame ? 0.095 : 0.11), w * 0.16);
  g.font = `800 ${size}px ${FONT}`;
  const tw = g.measureText(face.name).width;
  if (tw > maxW) { size *= maxW / tw; g.font = `800 ${size}px ${FONT}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = size * 0.28; g.strokeStyle = NAVY; g.strokeText(face.name, w / 2, ny);
  g.fillStyle = face.color; g.fillText(face.name, w / 2, ny);
}

export { charById };
