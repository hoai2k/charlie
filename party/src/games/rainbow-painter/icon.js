// Procedural thumbnail for Rainbow Painter (menus + how-to screen).
import * as ui from '../../engine/ui.js';
import { drawArt } from '../../engine/art.js';
import { drawSparkleShape } from '../../engine/emotes.js';
import { TAU } from '../../engine/util.js';

const NAVY = '#24163f';
const COLS = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#4fd36a', '#3fa7ff', '#9b5cff'];
const GREYS = ['#b9b8c2', '#c4c3cc', '#cfced6', '#bdbcc6', '#b3b2bd', '#a9a8b4'];

export function drawRainbowIcon(g, x, y, w, h, t) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (drawArt(g, 'thumb/rainbow-painter', x + w / 2, y + h / 2, w, h, { fit: 'cover' })) { g.restore(); return; }
  const s = w / 400, hh = h / s;
  g.translate(x, y); g.scale(s, s);
  // sky: grey on the right, blue on the left
  const gr = g.createLinearGradient(0, 0, 400, 0);
  gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(0.55, '#b8e4ff'); gr.addColorStop(0.62, '#c9c8d2'); gr.addColorStop(1, '#a9a8b4');
  g.fillStyle = gr; g.fillRect(0, 0, 400, hh);
  // rainbow: left half coloured, right half grey
  const cx = 200, cy = hh * 1.02;
  for (let i = 0; i < 6; i++) {
    const r = hh * 0.86 - i * 16;
    g.lineWidth = 17;
    g.strokeStyle = COLS[i]; g.beginPath(); g.arc(cx, cy, r, Math.PI, Math.PI * 1.62); g.stroke();
    g.strokeStyle = GREYS[i]; g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.62, TAU); g.stroke();
  }
  // sun
  g.save(); g.translate(352, 48);
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 28, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-9, -4, 3.5, 0, TAU); g.arc(9, -4, 3.5, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, 5, 9, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.restore();
  // hills
  ui.hills(g, hh * 0.86, '#5fcf73', 8, 0.02, 1);
  // the paint cloud, raining colour
  const bob = Math.sin(t * 3) * 4;
  g.save(); g.translate(240, hh * 0.3 + bob);
  for (let i = 0; i < 6; i++) {
    const ph = ((t * 1.6 + i * 0.17) % 1);
    g.fillStyle = COLS[i]; g.beginPath(); g.ellipse(-36 + i * 14, 18 + ph * 70, 4, 7, 0, 0, TAU); g.fill();
  }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-26, 4, 20, 0, TAU); g.arc(0, -6, 24, 0, TAU); g.arc(26, 4, 18, 0, TAU); g.rect(-40, 4, 80, 18); g.fill();
  g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-26, 4, 18, 0, TAU); g.arc(0, -6, 22, 0, TAU); g.arc(26, 4, 16, 0, TAU); g.rect(-38, 4, 76, 16); g.fill();
  g.restore();
  for (let i = 0; i < 5; i++) {
    g.save(); g.translate(40 + i * 70, 40 + (i % 2) * 50); const k = 0.5 + 0.5 * Math.sin(t * 4 + i); g.scale(k, k); drawSparkleShape(g, 14, '#ffffff'); g.restore();
  }
  g.restore();
}
