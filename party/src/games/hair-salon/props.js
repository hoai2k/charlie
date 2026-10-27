// Hair Salon: tools, hair bling and other props. Every prop looks up its
// generated art first (drawArt) and falls back to the procedural drawing.
import * as ui from '../../engine/ui.js';
import { drawArt } from '../../engine/art.js';
import { TAU } from '../../engine/util.js';
import { RAINBOW } from '../../engine/particles.js';
import { drawHeartShape, drawStarShape } from '../../engine/emotes.js';

const NAVY = '#24163f';

export const TOOLS = [
  { id: 'brush', name: 'Brush', art: 'prop/salon-brush' },
  { id: 'scissors', name: 'Snip', art: 'prop/salon-scissors' },
  { id: 'grow', name: 'Grow', art: 'prop/salon-grow-spray' },
  { id: 'curl', name: 'Curl', art: 'prop/salon-curler' },
  { id: 'straight', name: 'Straight', art: 'prop/salon-straightener' },
  { id: 'colour', name: 'Colour', art: 'prop/salon-color-spray' },
  { id: 'style', name: 'Styles', art: 'prop/salon-hairtie' },
  { id: 'bling', name: 'Bling', art: 'prop/salon-bling' },
];
export const TOOL_IDX = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));

export const BLING = [
  { id: 'bow-pink', name: 'Pink bow', art: 'prop/hair-bow-pink', kind: 'bow', color: '#ff6fb1' },
  { id: 'flower-pink', name: 'Flower', art: 'prop/hair-flower-pink', kind: 'flower', color: '#ff8fd0' },
  { id: 'clip-star', name: 'Star clip', art: 'prop/hair-clip-star', kind: 'star', color: '#ffd23f' },
  { id: 'tiara', name: 'Tiara', art: 'prop/hair-tiara', kind: 'tiara', color: '#dfe6f5', wide: true },
  { id: 'bow-blue', name: 'Blue bow', art: 'prop/hair-bow-blue', kind: 'bow', color: '#7fd3ff', dots: true },
  { id: 'clip-heart', name: 'Heart clip', art: 'prop/hair-clip-heart', kind: 'heart', color: '#ff4d6d' },
  { id: 'daisy', name: 'Daisy', art: 'prop/hair-daisy', kind: 'flower', color: '#ffffff' },
  { id: 'butterfly', name: 'Butterfly', art: 'prop/hair-butterfly', kind: 'butterfly', color: '#b36bff' },
  { id: 'crown', name: 'Crown', art: 'prop/hair-crown', kind: 'crown', color: '#ffd23f', wide: true },
  { id: 'bow-yellow', name: 'Yellow bow', art: 'prop/hair-bow-yellow', kind: 'bow', color: '#ffd23f' },
];
export const BLING_IDX = Object.fromEntries(BLING.map((b, i) => [b.id, i]));

/** One piece of hair bling, centred at 0,0, about `s` across. */
export function drawBling(g, def, s, t = 0) {
  const w = def.wide ? s * 1.45 : s;
  if (drawArt(g, def.art, 0, 0, w, def.wide ? s * 1.08 : s)) return;
  g.save();
  g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = NAVY; g.lineJoin = 'round';
  const c = def.color;
  switch (def.kind) {
    case 'bow': {
      g.fillStyle = c;
      for (const side of [-1, 1]) {
        g.beginPath(); g.moveTo(0, 0);
        g.bezierCurveTo(side * s * 0.4, -s * 0.45, side * s * 0.6, -s * 0.08, side * s * 0.5, s * 0.15);
        g.bezierCurveTo(side * s * 0.36, s * 0.3, side * s * 0.16, s * 0.08, 0, 0);
        g.fill(); g.stroke();
        g.beginPath(); g.moveTo(side * s * 0.04, s * 0.05); g.lineTo(side * s * 0.22, s * 0.45); g.lineTo(side * s * 0.1, s * 0.4); g.closePath(); g.fill(); g.stroke();
      }
      if (def.dots) {
        g.fillStyle = '#ffffff';
        for (const [dx, dy] of [[-0.35, -0.08], [-0.24, 0.1], [0.3, -0.12], [0.38, 0.06]]) { g.beginPath(); g.arc(dx * s, dy * s, s * 0.04, 0, TAU); g.fill(); }
      }
      g.fillStyle = c; g.beginPath(); g.arc(0, 0, s * 0.12, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.3, -s * 0.1, s * 0.08, s * 0.04, -0.6, 0, TAU); g.fill();
      break;
    }
    case 'flower': {
      g.fillStyle = c;
      for (let i = 0; i < (c === '#ffffff' ? 8 : 5); i++) {
        const n = c === '#ffffff' ? 8 : 5, a = (i * TAU) / n - Math.PI / 2;
        const r = c === '#ffffff' ? 0.28 : 0.24;
        g.beginPath(); g.ellipse(Math.cos(a) * s * r, Math.sin(a) * s * r, s * (c === '#ffffff' ? 0.17 : 0.2), s * (c === '#ffffff' ? 0.09 : 0.14), a, 0, TAU); g.fill(); g.stroke();
      }
      g.fillStyle = '#ffc23f'; g.beginPath(); g.arc(0, 0, s * 0.13, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-s * 0.04, -s * 0.04, s * 0.04, 0, TAU); g.fill();
      break;
    }
    case 'star': {
      g.fillStyle = '#c9d6e8'; ui.roundRect(g, -s * 0.42, -s * 0.06, s * 0.84, s * 0.12, s * 0.06); g.fill(); g.stroke();
      g.rotate(Math.sin(t * 2) * 0.08); drawStarShape(g, s * 0.75, c);
      g.fillStyle = '#7fd3ff'; g.beginPath(); g.arc(0, s * 0.02, s * 0.07, 0, TAU); g.fill();
      break;
    }
    case 'heart': {
      g.fillStyle = '#c9d6e8'; ui.roundRect(g, -s * 0.42, -s * 0.06, s * 0.84, s * 0.12, s * 0.06); g.fill(); g.stroke();
      drawHeartShape(g, s * 0.7, c);
      break;
    }
    case 'butterfly': {
      for (const side of [-1, 1]) {
        g.fillStyle = c;
        g.beginPath(); g.ellipse(side * s * 0.24, -s * 0.12, s * 0.24, s * 0.2, side * 0.5, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#ff8fd0';
        g.beginPath(); g.ellipse(side * s * 0.2, s * 0.17, s * 0.15, s * 0.13, -side * 0.4, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(side * s * 0.27, -s * 0.15, s * 0.06, 0, TAU); g.fill();
      }
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, 0, s * 0.06, s * 0.28, 0, 0, TAU); g.fill();
      g.strokeStyle = NAVY; g.lineWidth = Math.max(1.5, s * 0.03);
      g.beginPath(); g.moveTo(0, -s * 0.26); g.quadraticCurveTo(-s * 0.1, -s * 0.42, -s * 0.16, -s * 0.44); g.moveTo(0, -s * 0.26); g.quadraticCurveTo(s * 0.1, -s * 0.42, s * 0.16, -s * 0.44); g.stroke();
      break;
    }
    case 'tiara': {
      const W2 = s * 0.72;
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(-W2, s * 0.18);
      g.quadraticCurveTo(-W2 * 0.8, -s * 0.05, -W2 * 0.55, -s * 0.02);
      g.lineTo(-W2 * 0.35, -s * 0.22); g.lineTo(-W2 * 0.18, -s * 0.08);
      g.lineTo(0, -s * 0.42);
      g.lineTo(W2 * 0.18, -s * 0.08); g.lineTo(W2 * 0.35, -s * 0.22); g.lineTo(W2 * 0.55, -s * 0.02);
      g.quadraticCurveTo(W2 * 0.8, -s * 0.05, W2, s * 0.18);
      g.quadraticCurveTo(0, s * 0.02, -W2, s * 0.18);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(0, -s * 0.12, s * 0.09, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#7fd3ff';
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * W2 * 0.35, -s * 0.06, s * 0.055, 0, TAU); g.fill(); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(-s * 0.03, -s * 0.15, s * 0.03, 0, TAU); g.fill();
      break;
    }
    case 'crown': {
      g.fillStyle = c;
      const W2 = s * 0.55;
      g.beginPath();
      g.moveTo(-W2, s * 0.25); g.lineTo(-W2 * 1.08, -s * 0.28); g.lineTo(-W2 * 0.48, s * 0.0); g.lineTo(0, -s * 0.4);
      g.lineTo(W2 * 0.48, 0); g.lineTo(W2 * 1.08, -s * 0.28); g.lineTo(W2, s * 0.25); g.closePath(); g.fill(); g.stroke();
      for (const [x, y] of [[-W2 * 1.08, -s * 0.3], [0, -s * 0.43], [W2 * 1.08, -s * 0.3]]) { g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(x, y, s * 0.06, 0, TAU); g.fill(); g.stroke(); }
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, s * 0.08, s * 0.08, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#4fb8ff'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * W2 * 0.55, s * 0.1, s * 0.055, 0, TAU); g.fill(); g.stroke(); }
      break;
    }
    default: break;
  }
  g.restore();
}

/** Tool icons (tool bar and the hand cursor). o: { color, open (scissors 0..1), on } */
export function drawTool(g, id, x, y, s, t = 0, o = {}) {
  const def = TOOLS.find((d) => d.id === id);
  g.save(); g.translate(x, y);
  if (def && drawArt(g, def.art, 0, 0, s * 1.1, s * 1.1)) {
    if (id === 'colour') swatch(g, o.color, s * 0.3, s * 0.3, s * 0.2);
    g.restore(); return;
  }
  g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
  switch (id) {
    case 'brush': {
      g.rotate(-0.5);
      g.fillStyle = '#ff7ac6'; ui.roundRect(g, -s * 0.08, s * 0.05, s * 0.16, s * 0.48, s * 0.07); g.fill(); g.stroke();
      g.fillStyle = '#ff9ed6'; ui.roundRect(g, -s * 0.24, -s * 0.48, s * 0.48, s * 0.56, s * 0.2); g.fill(); g.stroke();
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc((i - 1) * s * 0.12, -s * 0.38 + j * s * 0.12, s * 0.03, 0, TAU); g.fill(); }
      break;
    }
    case 'scissors': {
      const open = 0.18 + 0.32 * (o.open ?? 1);
      for (const side of [-1, 1]) {
        g.save(); g.rotate(side * open);
        g.fillStyle = '#e8eef8';
        g.beginPath(); g.moveTo(-s * 0.04, 0); g.lineTo(0, -s * 0.52); g.lineTo(s * 0.06, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#ff6fb1';
        g.beginPath(); g.ellipse(side * -s * 0.02, s * 0.28, s * 0.13, s * 0.16, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#ffe8f4'; g.beginPath(); g.ellipse(side * -s * 0.02, s * 0.28, s * 0.06, s * 0.08, 0, 0, TAU); g.fill();
        g.restore();
      }
      g.fillStyle = '#c9d6e8'; g.beginPath(); g.arc(0, 0, s * 0.05, 0, TAU); g.fill(); g.stroke();
      break;
    }
    case 'grow': {
      g.rotate(0.15);
      g.fillStyle = '#5ddc6a'; ui.roundRect(g, -s * 0.2, -s * 0.1, s * 0.4, s * 0.58, s * 0.12); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; ui.roundRect(g, -s * 0.12, -s * 0.28, s * 0.24, s * 0.2, s * 0.05); g.fill(); g.stroke();
      g.fillStyle = '#ff7ac6'; ui.roundRect(g, -s * 0.06, -s * 0.38, s * 0.12, s * 0.12, s * 0.04); g.fill(); g.stroke();
      g.save(); g.translate(0, s * 0.2); drawStarShape(g, s * 0.28, '#ffd23f'); g.restore();
      if (o.on) for (let i = 0; i < 3; i++) { const p = (t * 2 + i / 3) % 1; g.globalAlpha = 1 - p; g.fillStyle = i % 2 ? '#fff6a8' : '#b8ffcc'; g.beginPath(); g.arc(-s * 0.2 - p * s * 0.3, -s * 0.36 - p * s * 0.1 + (i - 1) * s * 0.1, s * 0.05, 0, TAU); g.fill(); }
      break;
    }
    case 'curl': {
      g.rotate(-0.6);
      g.fillStyle = '#9b5cff'; ui.roundRect(g, -s * 0.09, -s * 0.5, s * 0.18, s * 0.6, s * 0.09); g.fill(); g.stroke();
      g.fillStyle = '#ffd23f'; ui.roundRect(g, -s * 0.12, s * 0.08, s * 0.24, s * 0.1, s * 0.04); g.fill(); g.stroke();
      g.fillStyle = '#ff7ac6'; ui.roundRect(g, -s * 0.1, s * 0.16, s * 0.2, s * 0.32, s * 0.08); g.fill(); g.stroke();
      g.strokeStyle = '#ffd36e'; g.lineWidth = Math.max(2, s * 0.06);
      g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(-s * 0.12, -s * 0.42 + k * s * 0.13); g.lineTo(s * 0.12, -s * 0.36 + k * s * 0.13); } g.stroke();
      break;
    }
    case 'straight': {
      g.rotate(-0.35);
      for (const side of [-1, 1]) {
        g.save(); g.rotate(side * 0.08);
        g.fillStyle = side < 0 ? '#4fd98a' : '#7fe0b4'; ui.roundRect(g, side < 0 ? -s * 0.16 : s * 0.0, -s * 0.5, s * 0.16, s * 0.95, s * 0.08); g.fill(); g.stroke();
        g.restore();
      }
      g.fillStyle = '#e8eef8'; ui.roundRect(g, -s * 0.13, -s * 0.48, s * 0.26, s * 0.4, s * 0.04); g.fill(); g.stroke();
      if (o.on) { g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 3; i++) { const p = (t * 1.5 + i / 3) % 1; g.globalAlpha = 1 - p; g.beginPath(); g.arc(s * (0.18 + 0.1 * Math.sin(p * 6 + i)), -s * 0.5 - p * s * 0.4, s * (0.06 + p * 0.08), 0, TAU); g.fill(); } }
      break;
    }
    case 'colour': {
      g.rotate(0.12);
      g.fillStyle = '#f4f6fb'; ui.roundRect(g, -s * 0.2, -s * 0.22, s * 0.4, s * 0.68, s * 0.12); g.fill(); g.stroke();
      // rainbow band
      for (let i = 0; i < 4; i++) { g.fillStyle = RAINBOW[i * 2]; g.fillRect(-s * 0.2 + 3, s * 0.02 + i * s * 0.06, s * 0.4 - 6, s * 0.06); }
      g.strokeRect(-s * 0.2 + 2, s * 0.02, s * 0.4 - 4, s * 0.24);
      g.fillStyle = '#c9d6e8'; ui.roundRect(g, -s * 0.1, -s * 0.34, s * 0.2, s * 0.14, s * 0.04); g.fill(); g.stroke();
      g.fillStyle = '#41335a'; ui.roundRect(g, -s * 0.07, -s * 0.44, s * 0.14, s * 0.1, s * 0.03); g.fill();
      swatch(g, o.color, s * 0.3, s * 0.3, s * 0.2);
      break;
    }
    case 'style': {
      g.fillStyle = '#ff6fb1'; g.strokeStyle = NAVY;
      g.beginPath(); g.ellipse(0, 0, s * 0.38, s * 0.3, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ffe8f4'; g.beginPath(); g.ellipse(0, 0, s * 0.22, s * 0.15, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(s * 0.3, -s * 0.18, s * 0.11, 0, TAU); g.fill(); g.stroke();
      break;
    }
    case 'bling': {
      drawBling(g, BLING[0], s * 0.8, t);
      g.save(); g.translate(s * 0.28, -s * 0.28); drawStarShape(g, s * 0.3, '#ffd23f'); g.restore();
      break;
    }
    default: break;
  }
  g.restore();
}

/** Small round colour chip (rainbow and glitter get their own look). */
export function swatch(g, col, x, y, r) {
  if (!col) return;
  g.save(); g.translate(x, y);
  g.lineWidth = Math.max(2, r * 0.22); g.strokeStyle = NAVY;
  if (col.id === 'rainbow') {
    for (let i = 0; i < 6; i++) { g.fillStyle = RAINBOW[i]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, (i * TAU) / 6, ((i + 1) * TAU) / 6); g.closePath(); g.fill(); }
  } else if (col.id === 'glitter') {
    g.fillStyle = '#c9b8ff'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; for (const [dx, dy, rr] of [[-0.3, -0.3, 0.2], [0.35, 0.1, 0.16], [-0.1, 0.4, 0.13], [0.15, -0.35, 0.1]]) { g.beginPath(); g.arc(dx * r, dy * r, rr * r, 0, TAU); g.fill(); }
  } else { g.fillStyle = col.c; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.restore();
}

/** Little icons for the style options (drawn in the option strip). */
export function drawStyleIcon(g, id, s, color = '#8a5a3c') {
  g.save();
  g.lineWidth = Math.max(1.5, s * 0.06); g.strokeStyle = NAVY;
  g.fillStyle = '#ffdcc2'; g.beginPath(); g.arc(0, s * 0.06, s * 0.26, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = color;
  const cap = () => { g.beginPath(); g.arc(0, s * 0.06, s * 0.27, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill(); g.stroke(); };
  switch (id) {
    case 'loose':
      g.beginPath(); g.moveTo(-s * 0.3, s * 0.06); g.quadraticCurveTo(-s * 0.36, s * 0.4, -s * 0.28, s * 0.46); g.lineTo(-s * 0.2, s * 0.1); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(s * 0.3, s * 0.06); g.quadraticCurveTo(s * 0.36, s * 0.4, s * 0.28, s * 0.46); g.lineTo(s * 0.2, s * 0.1); g.closePath(); g.fill(); g.stroke();
      cap(); break;
    case 'ponytail':
      g.beginPath(); g.moveTo(s * 0.06, -s * 0.22); g.quadraticCurveTo(s * 0.5, -s * 0.36, s * 0.42, s * 0.3); g.quadraticCurveTo(s * 0.3, -s * 0.1, s * 0.06, -s * 0.12); g.closePath(); g.fill(); g.stroke();
      cap(); break;
    case 'pigtails':
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * s * 0.26, -s * 0.06); g.quadraticCurveTo(sd * s * 0.56, -s * 0.02, sd * s * 0.44, s * 0.4); g.quadraticCurveTo(sd * s * 0.38, s * 0.08, sd * s * 0.24, s * 0.04); g.closePath(); g.fill(); g.stroke(); }
      cap(); break;
    case 'bun':
      g.beginPath(); g.arc(0, -s * 0.3, s * 0.15, 0, TAU); g.fill(); g.stroke(); cap(); break;
    case 'spacebuns':
      for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * s * 0.2, -s * 0.24, s * 0.11, 0, TAU); g.fill(); g.stroke(); }
      cap(); break;
    case 'braid':
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(s * 0.3 + (k % 2 ? 0.02 : -0.02) * s, s * 0.12 + k * s * 0.1, s * 0.07, s * 0.06, 0, 0, TAU); g.fill(); g.stroke(); }
      cap(); break;
    default: cap();
  }
  g.restore();
}

/** Big hand mirror frame for the reveal (the glass is drawn by the caller). */
export function drawMirrorFrame(g, w, h, glass) {
  if (drawArt(g, 'prop/salon-hand-mirror', 0, 0, w, h)) { glass(w * 0.39, h * 0.29, 0, -h * 0.14); return; }
  const rx = w * 0.42, ry = h * 0.32, cy = -h * 0.14;
  g.save();
  g.lineWidth = Math.max(3, w * 0.025); g.strokeStyle = NAVY;
  // handle
  g.fillStyle = '#ff7ac6'; ui.roundRect(g, -w * 0.08, cy + ry * 0.9, w * 0.16, h * 0.42, w * 0.07); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(0, cy + ry * 0.95, w * 0.13, w * 0.06, 0, 0, TAU); g.fill(); g.stroke();
  // frame
  g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(0, cy, rx + w * 0.07, ry + w * 0.07, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(0, cy, rx + w * 0.035, ry + w * 0.035, 0, 0, TAU); g.fill();
  g.save(); g.translate(0, cy - ry - w * 0.05); drawHeartShape(g, w * 0.16, '#ff4d6d'); g.restore();
  g.restore();
  glass(rx * 0.95, ry * 0.95, 0, cy);
}
