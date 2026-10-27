// Sneaky Dance - procedural art: the night library, Professor Hoot napping in
// his armchair (eyes that pop open one at a time), the dancing lamp, flying
// books, the disco ball, the freeze disguises and the thumbnail. Every piece
// asks for generated art first.
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { RAINBOW } from '../../engine/particles.js';
import { TAU, clamp, lerp } from '../../engine/util.js';
import { starPath } from '../../engine/emotes.js';
import * as ui from '../../engine/ui.js';

export const NAVY = '#24163f';
export const FLOOR_Y = 610;
// The library backdrop's floor meets the back wall at y ~668: chair legs and
// the lamp base stand just in front of that line, not on the wainscot.
export const CHAIR = { x: 960, y: 690, w: 420 };
export const SEAT = { x: 960, y: 598 };
export const LAMP = { x: 1440, y: 684 };
export const BALL = { x: 520 };
export const BOOK_COLS = ['#ff5a7a', '#3fc1c9', '#9b6bff', '#ffb02e', '#5ccf6b'];

function line(g, w = 5) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; }
function rr(g, x, y, w, h, r) { ui.roundRect(g, x, y, w, h, r); }

// ------------------------------------------------------------------ library
let libCache = null;
export function libraryBackground() {
  if (libCache) return libCache;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // back wall
  const wall = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  wall.addColorStop(0, '#3a2350'); wall.addColorStop(1, '#5a3468');
  g.fillStyle = wall; g.fillRect(0, 0, W, FLOOR_Y + 4);
  // bookshelves
  const shelves = [[40, 560], [1320, 560]];
  for (const [x0, w] of shelves) {
    g.fillStyle = '#7a4a2a'; line(g, 6); rr(g, x0, 90, w, FLOOR_Y - 80, 12); g.fill(); g.stroke();
    g.fillStyle = '#4a2a18'; g.fillRect(x0 + 18, 110, w - 36, FLOOR_Y - 130);
    for (let row = 0; row < 4; row++) {
      const y = 110 + row * 118;
      let x = x0 + 22, k = row * 7;
      while (x < x0 + w - 40) {
        const bw = 18 + ((k * 37) % 4) * 7, bh = 72 + ((k * 53) % 5) * 7;
        const tilt = k % 11 === 5 ? 0.18 : 0;
        g.save(); g.translate(x + bw / 2, y + 110); g.rotate(tilt);
        g.fillStyle = BOOK_COLS[k % BOOK_COLS.length]; line(g, 3); rr(g, -bw / 2, -bh, bw, bh, 3); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,230,140,0.8)'; g.fillRect(-bw / 2 + 3, -bh + 12, bw - 6, 4); g.fillRect(-bw / 2 + 3, -18, bw - 6, 4);
        g.restore();
        x += bw + 3 + (tilt ? 8 : 0); k++;
      }
      g.fillStyle = '#9a5e34'; line(g, 4); rr(g, x0 + 10, y + 108, w - 20, 14, 4); g.fill(); g.stroke();
    }
  }
  // rolling ladder
  g.strokeStyle = '#c98a48'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(420, 120); g.lineTo(380, FLOOR_Y); g.moveTo(480, 120); g.lineTo(440, FLOOR_Y); g.stroke();
  for (let k = 0; k < 7; k++) { const y = 160 + k * 64, dx = (y - 120) / (FLOOR_Y - 120) * 40; g.beginPath(); g.moveTo(420 - dx, y); g.lineTo(480 - dx, y); g.stroke(); }
  // round window with moon (behind the chair)
  const wx = 960, wy = 210;
  g.fillStyle = '#1a2b5a'; line(g, 8); g.beginPath(); g.arc(wx, wy, 150, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#fff6c0'; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(wx - 120 + ((k * 61) % 240), wy - 110 + ((k * 89) % 220), 2 + (k % 2), 0, TAU); g.fill(); }
  g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(wx + 60, wy - 50, 44, 0, TAU); g.fill();
  g.fillStyle = '#1a2b5a'; g.beginPath(); g.arc(wx + 80, wy - 64, 40, 0, TAU); g.fill();
  g.strokeStyle = '#c98a48'; g.lineWidth = 8; g.beginPath(); g.moveTo(wx - 150, wy); g.lineTo(wx + 150, wy); g.moveTo(wx, wy - 150); g.lineTo(wx, wy + 150); g.stroke();
  line(g, 8); g.beginPath(); g.arc(wx, wy, 150, 0, TAU); g.stroke();
  // wall sconces
  for (const x of [700, 1220]) {
    const gr = g.createRadialGradient(x, 300, 4, x, 300, 120);
    gr.addColorStop(0, 'rgba(255,214,120,0.55)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, 300, 120, 0, TAU); g.fill();
    g.fillStyle = '#ffd36e'; line(g, 4); g.beginPath(); g.ellipse(x, 300, 14, 22, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#c98a48'; rr(g, x - 20, 320, 40, 12, 4); g.fill(); g.stroke();
  }
  // floor
  const fl = g.createLinearGradient(0, FLOOR_Y, 0, H);
  fl.addColorStop(0, '#b77a46'); fl.addColorStop(1, '#d9a066');
  g.fillStyle = fl; g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  g.strokeStyle = 'rgba(110,60,30,0.3)'; g.lineWidth = 3;
  for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(W / 2 + k * 60, FLOOR_Y); g.lineTo(W / 2 + k * 170, H); g.stroke(); }
  line(g, 5); g.beginPath(); g.moveTo(0, FLOOR_Y); g.lineTo(W, FLOOR_Y); g.stroke();
  // big round rug
  g.save(); g.translate(W / 2, 850);
  g.fillStyle = '#7a2f6e'; line(g, 6); g.beginPath(); g.ellipse(0, 0, 820, 220, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = '#ffcf5a'; g.lineWidth = 8; g.beginPath(); g.ellipse(0, 0, 770, 195, 0, 0, TAU); g.stroke();
  g.fillStyle = '#9b3f8c'; g.beginPath(); g.ellipse(0, 0, 720, 175, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,207,90,0.6)'; g.lineWidth = 4;
  for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * 600, Math.sin(a) * 140, 30, 10, a, 0, TAU); g.stroke(); }
  g.fillStyle = 'rgba(255,207,90,0.35)'; g.beginPath(); g.ellipse(0, 0, 260, 64, 0, 0, TAU); g.fill();
  g.restore();
  // potted fern
  g.fillStyle = '#c96a3a'; line(g, 5); g.beginPath(); g.moveTo(1800, 640); g.lineTo(1880, 640); g.lineTo(1866, 720); g.lineTo(1814, 720); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#3f9a4f'; g.lineWidth = 10;
  for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(1840, 640); g.quadraticCurveTo(1840 + (k - 2.5) * 30, 560, 1840 + (k - 2.5) * 50, 540 + Math.abs(k - 2.5) * 20); g.stroke(); }
  libCache = c;
  return c;
}

// ------------------------------------------------------------------ armchair
export function drawChairBack(g) {
  const { x, y, w } = CHAIR;
  if (drawArt(g, 'prop/sd-armchair', x, y, w, w * 520 / 560, { anchor: 'bottom' })) return true;
  // legs
  g.fillStyle = '#7a4a2a'; line(g, 4);
  for (const dx of [-150, 150]) { rr(g, x + dx - 12, y - 30, 24, 30, 6); g.fill(); g.stroke(); }
  // wingback
  g.fillStyle = '#d0384f'; line(g, 6);
  g.beginPath();
  g.moveTo(x - 170, y - 70); g.lineTo(x - 175, y - 260); g.quadraticCurveTo(x - 200, y - 330, x - 150, y - 360);
  g.quadraticCurveTo(x, y - 420, x + 150, y - 360); g.quadraticCurveTo(x + 200, y - 330, x + 175, y - 260); g.lineTo(x + 170, y - 70); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#b02a42'; g.beginPath(); g.ellipse(x, y - 230, 120, 150, 0, 0, TAU); g.fill();
  g.fillStyle = '#ffd23f';
  for (const [bx, by] of [[-70, -300], [0, -320], [70, -300], [-80, -200], [0, -215], [80, -200]]) { g.beginPath(); g.arc(x + bx, y + by, 7, 0, TAU); g.fill(); line(g, 2); g.stroke(); }
  // seat cushion
  g.fillStyle = '#e04a62'; line(g, 5); rr(g, x - 160, y - 110, 320, 60, 24); g.fill(); g.stroke();
  return false;
}

export function drawChairFront(g, hasArt) {
  if (hasArt) return;
  const { x, y } = CHAIR;
  // rolled arms
  for (const s of [-1, 1]) {
    g.fillStyle = '#d0384f'; line(g, 6);
    rr(g, x + s * 175 - 45, y - 150, 90, 120, 30); g.fill(); g.stroke();
    g.fillStyle = '#e8566c'; g.beginPath(); g.ellipse(x + s * 175, y - 146, 46, 26, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + s * 175, y - 146, 9, 0, TAU); g.fill(); line(g, 2); g.stroke();
  }
  // skirt with tassels
  g.fillStyle = '#b02a42'; line(g, 5); rr(g, x - 175, y - 62, 350, 40, 10); g.fill(); g.stroke();
  for (let k = 0; k < 9; k++) { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x - 160 + k * 40, y - 22); g.lineTo(x - 168 + k * 40, y - 6); g.lineTo(x - 152 + k * 40, y - 6); g.closePath(); g.fill(); }
}

// ------------------------------------------------------------------ Professor Hoot
/**
 * Professor Hoot sitting in the chair. Origin = his seat (bottom centre).
 * o: { t, eyeL, eyeR (0..1 open), look (-1..1 pupils), mouth: 'sleep'|'snore'|'yawn'|'hmm'|'grin',
 *      hatTip (0..1 tipped over an eye), stand (0..1), shades (0..1), dance (0..1), squint, breathe }
 */
export function drawHoot(g, o) {
  const t = o.t || 0;
  const stand = o.stand || 0, dance = o.dance || 0;
  const key = o.artKey;
  g.save();
  const breathe = (o.breathe ?? 0) * Math.sin(t * 2.2) * 0.03;
  const bounce = dance * Math.abs(Math.sin(t * 7)) * 22;
  g.translate(0, -stand * 46 - bounce);
  g.rotate(dance * Math.sin(t * 3.5) * 0.14);
  g.scale(1 + breathe, 1 - breathe);
  if (key && drawArt(g, key, 0, 6 + stand * 30, 330, 330 * (key === 'prop/sd-hoot-party' ? 520 : 460) / 420, { anchor: 'bottom' })) { g.restore(); return; }
  const BROWN = '#b7773d', CREAM = '#f6dfb8', ROBE = '#2f3f9e';
  // feet / legs (standing shows little legs)
  g.fillStyle = '#ff9a2e'; line(g, 3);
  for (const s of [-1, 1]) {
    if (stand > 0.05) { g.strokeStyle = '#ff9a2e'; g.lineWidth = 9; g.beginPath(); g.moveTo(s * 30, -10); g.lineTo(s * 32 + dance * Math.sin(t * 7 + s) * 8, 40 * stand); g.stroke(); line(g, 3); }
    const fy = stand * 40;
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(s * 32 + k * 9, fy - 2, 6, 10, k * 0.3, 0, TAU); g.fill(); g.stroke(); }
  }
  // robe back panels
  g.fillStyle = ROBE; line(g, 5);
  g.beginPath(); g.moveTo(-96, -190); g.quadraticCurveTo(-128, -90, -104, 0); g.lineTo(104, 0); g.quadraticCurveTo(128, -90, 96, -190); g.closePath(); g.fill(); g.stroke();
  // body
  g.fillStyle = BROWN; g.beginPath(); g.ellipse(0, -112, 92, 108, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = CREAM; g.beginPath(); g.ellipse(0, -92, 60, 76, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(183,119,61,0.6)'; g.lineWidth = 3;
  for (let r = 0; r < 4; r++) for (let k = -1; k <= 1; k++) { const cx = k * 24 + (r % 2) * 12, cy = -140 + r * 26; g.beginPath(); g.moveTo(cx - 8, cy); g.lineTo(cx, cy + 6); g.lineTo(cx + 8, cy); g.stroke(); }
  // robe front edges with stars
  for (const s of [-1, 1]) {
    g.fillStyle = ROBE; line(g, 5);
    g.beginPath(); g.moveTo(s * 62, -196); g.quadraticCurveTo(s * 70, -100, s * 58, 0); g.lineTo(s * 104, 0); g.quadraticCurveTo(s * 124, -100, s * 96, -196); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f';
    for (let k = 0; k < 3; k++) { g.save(); g.translate(s * 84, -150 + k * 52); starPath(g, 8); g.fill(); g.restore(); }
  }
  // wings
  const wingUp = clamp((o.wingUp || 0) + dance, 0, 1);
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * 92, -130);
    const wave = dance ? Math.sin(t * 7 + (s > 0 ? Math.PI : 0)) * 0.5 : 0;
    g.rotate(s * (0.25 - wingUp * (s > 0 ? 2.3 : 0.9)) + wave * s);
    g.fillStyle = BROWN; line(g, 5);
    g.beginPath(); g.ellipse(0, 50, 30, 62, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(80,40,20,0.35)'; g.lineWidth = 3;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-14 + k * 10, 70); g.lineTo(-10 + k * 10, 100); g.stroke(); }
    g.restore();
  }
  // a book open on his tummy while he naps
  if (o.book) {
    g.save(); g.translate(0, -66); g.rotate(-0.08);
    g.fillStyle = '#ff5a7a'; line(g, 4); rr(g, -70, -26, 140, 52, 6); g.fill(); g.stroke();
    g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(-64, -22); g.quadraticCurveTo(-32, -32, 0, -20); g.lineTo(0, 22); g.quadraticCurveTo(-32, 12, -64, 20); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(64, -22); g.quadraticCurveTo(32, -32, 0, -20); g.lineTo(0, 22); g.quadraticCurveTo(32, 12, 64, 20); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  // head
  const hy = -228;
  g.fillStyle = BROWN; line(g, 5);
  // ear tufts
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 50, hy - 64); g.lineTo(s * 84, hy - 104); g.lineTo(s * 80, hy - 50); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(0, hy, 92, 80, 0, 0, TAU); g.fill(); g.stroke();
  // facial discs
  g.fillStyle = CREAM;
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 38, hy + 2, 38, 0, TAU); g.fill(); }
  // eyes
  const look = (o.look || 0) * 9;
  const squint = o.squint || 0;
  [[-1, o.eyeL ?? 0], [1, o.eyeR ?? 0]].forEach(([s, k]) => {
    const ex = s * 38, ey = hy + 2;
    if (k < 0.12) {
      g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.arc(ex, ey - 4, 16, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    } else {
      const ry = 27 * k * (1 - squint * 0.45);
      g.fillStyle = '#ffffff'; line(g, 4); g.beginPath(); g.ellipse(ex, ey, 26, ry, 0, 0, TAU); g.fill(); g.stroke();
      g.save(); g.beginPath(); g.ellipse(ex, ey, 26, ry, 0, 0, TAU); g.clip();
      g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(ex + look, ey + 2, 14, 0, TAU); g.fill();
      g.fillStyle = NAVY; g.beginPath(); g.arc(ex + look, ey + 2, 8, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex + look - 4, ey - 3, 4, 0, TAU); g.fill();
      g.restore();
      if (squint > 0.2) { g.strokeStyle = BROWN; g.lineWidth = 10; g.beginPath(); g.moveTo(ex - 28, ey - ry - 6 + s * 6); g.lineTo(ex + 28, ey - ry - 6 - s * 6); g.stroke(); }
    }
  });
  // glasses (slipped down while asleep)
  const slip = (o.eyeL ?? 0) + (o.eyeR ?? 0) < 0.3 ? 12 : 0;
  if (!(o.shades > 0.5)) {
    g.strokeStyle = '#d9a300'; g.lineWidth = 5;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 38, hy + 2 + slip, 32, 0, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(-8, hy - 4 + slip); g.quadraticCurveTo(0, hy - 12 + slip, 8, hy - 4 + slip); g.stroke();
  }
  // beak / mouth
  g.fillStyle = '#ff9a2e'; line(g, 4);
  const m = o.mouth || 'sleep';
  if (m === 'yawn' || m === 'hmm' || m === 'snore') {
    const open = m === 'yawn' ? 34 : m === 'hmm' ? 14 : 8 + Math.max(0, Math.sin(t * 2.2)) * 8;
    g.beginPath(); g.moveTo(-16, hy + 22); g.lineTo(16, hy + 22); g.lineTo(0, hy + 40); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#7a2440'; g.beginPath(); g.ellipse(0, hy + 44 + open * 0.4, 14, open * 0.6, 0, 0, TAU); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.moveTo(-16, hy + 22); g.lineTo(16, hy + 22); g.lineTo(0, hy + 50); g.closePath(); g.fill(); g.stroke();
    if (m === 'grin') { g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.arc(0, hy + 44, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  }
  // cheeks
  g.fillStyle = 'rgba(255,120,150,0.4)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 62, hy + 30, 12, 7, 0, 0, TAU); g.fill(); }
  // sunglasses (finale)
  if (o.shades > 0.01) {
    const drop = (1 - clamp(o.shades, 0, 1)) * -120;
    g.save(); g.translate(0, hy + drop);
    if (!drawArt(g, 'prop/sd-sunglasses', 0, 0, 170, 68)) drawShades(g, 1);
    g.restore();
  }
  // wizard hat (tips over one eye while he naps)
  const tip = o.hatTip || 0;
  g.save(); g.translate(-tip * 20, hy - 64 + tip * 26); g.rotate(-0.12 - tip * 0.42 + dance * Math.sin(t * 3.5) * 0.2);
  g.fillStyle = '#5b3fae'; line(g, 5);
  g.beginPath(); g.moveTo(-74, 6); g.quadraticCurveTo(-10, -60, 4, -150); g.quadraticCurveTo(40, -70, 78, 6); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#4a2f96'; rr(g, -96, -6, 192, 24, 12); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f';
  for (const [sx, sy, r] of [[-24, -30, 10], [16, -60, 8], [-4, -100, 7], [32, -22, 7]]) { g.save(); g.translate(sx, sy); starPath(g, r); g.fill(); g.restore(); }
  g.restore();
  g.restore();
}

export function drawShades(g, s = 1) {
  g.save(); g.scale(s, s);
  line(g, 5);
  g.fillStyle = '#ff5aa8';
  for (const sx of [-40, 40]) { g.save(); g.translate(sx, 0); starPath(g, 34); g.fill(); g.stroke(); g.fillStyle = '#2a1650'; starPath(g, 24); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-8, -8, 7, 3, -0.6, 0, TAU); g.fill(); g.fillStyle = '#ff5aa8'; g.restore(); }
  g.strokeStyle = '#ff5aa8'; g.lineWidth = 7; g.beginPath(); g.moveTo(-10, -4); g.lineTo(10, -4); g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ lamp
/** Reading lamp with a face. (x, y) = base. dance 0..1, frozen 0..1 (holding still with a sweat drop). */
export function drawLamp(g, x, y, t, dance = 0, frozen = 0, beat = 0) {
  g.save(); g.translate(x, y);
  const hop = dance * Math.abs(Math.sin(beat * Math.PI)) * 34;
  const sway = dance * Math.sin(beat * Math.PI) * 0.22;
  const sq = dance * (1 - Math.abs(Math.sin(beat * Math.PI))) * 0.12;
  g.translate(0, -hop); g.rotate(sway); g.scale(1 + sq, 1 - sq);
  if (drawArt(g, 'prop/sd-lamp', 0, 0, 160, 300, { anchor: 'bottom' })) { g.restore(); if (frozen > 0.3) sweat(g, x + 50, y - 270, t); return; }
  g.fillStyle = '#d9a300'; line(g, 5);
  g.beginPath(); g.ellipse(0, -8, 60, 16, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = NAVY; g.lineWidth = 14; g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(-30 * (1 - dance) + 20 * dance * Math.sin(beat * Math.PI * 2), -140, 0, -210); g.stroke();
  g.strokeStyle = '#ffcf5a'; g.lineWidth = 8; g.stroke();
  // glow
  const gr = g.createRadialGradient(0, -230, 10, 0, -230, 170);
  gr.addColorStop(0, 'rgba(255,228,150,0.45)'); gr.addColorStop(1, 'rgba(255,228,150,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, -230, 170, 0, TAU); g.fill();
  // shade
  g.fillStyle = '#ff9ccf'; line(g, 5);
  g.beginPath(); g.moveTo(-44, -300); g.lineTo(44, -300); g.lineTo(76, -214); g.lineTo(-76, -214); g.closePath(); g.fill(); g.stroke();
  for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? '#ffd23f' : '#ff6fb1'; g.beginPath(); g.arc(-68 + k * 17, -206 + Math.sin(t * 8 + k) * dance * 3, 6, 0, TAU); g.fill(); }
  // face
  g.fillStyle = NAVY;
  if (frozen > 0.3) {
    for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 18, -262, 10, 0, TAU); g.fill(); line(g, 3); g.stroke(); g.fillStyle = NAVY; g.beginPath(); g.arc(s * 18, -262, 5, 0, TAU); g.fill(); }
    g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(-10, -238); g.lineTo(10, -238); g.stroke();
  } else if (dance > 0.3) {
    g.strokeStyle = NAVY; g.lineWidth = 4;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 18, -258, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.fillStyle = '#7a2440'; g.beginPath(); g.arc(0, -242, 10, 0, Math.PI); g.fill();
  } else {
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 18, -260, 5, 0, TAU); g.fill(); }
    g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.arc(0, -248, 10, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  }
  g.restore();
  if (frozen > 0.3) sweat(g, x + 50 + sway * 60, y - 270 - hop, t);
}

function sweat(g, x, y, t) {
  g.save(); g.translate(x, y + (t * 30) % 20);
  g.fillStyle = '#8fdcff'; line(g, 3);
  g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(10, 2, 0, 8); g.quadraticCurveTo(-10, 2, 0, -14); g.fill(); g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ flying book
export function drawBook(g, x, y, flap, col, idx = 0, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (drawArt(g, `prop/sd-book-${(idx % 3) + 1}`, 0, 0, 84, 64)) { g.restore(); return; }
  const open = 0.25 + 0.75 * Math.abs(Math.sin(flap));
  line(g, 4);
  for (const s of [-1, 1]) {
    g.save(); g.scale(s, 1);
    g.fillStyle = col;
    g.beginPath(); g.moveTo(0, 6); g.lineTo(40, 6 - open * 26); g.lineTo(40, -14 - open * 26); g.lineTo(0, -14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fffaf0';
    g.beginPath(); g.moveTo(0, 2); g.lineTo(34, 2 - open * 24); g.lineTo(34, -12 - open * 24); g.lineTo(0, -12); g.closePath(); g.fill();
    g.restore();
  }
  g.restore();
}

// ------------------------------------------------------------------ disco ball
export function drawDiscoBall(g, x, y, spin, shine, t) {
  g.strokeStyle = '#d9a300'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, -10); g.lineTo(x, y - 70); g.stroke();
  if (drawArt(g, 'prop/df-disco-ball', x - 75, y - 110, 150, 190, { anchor: 'topleft' })) return;
  const r = 66;
  g.save(); g.translate(x, y);
  g.fillStyle = '#c8d2e8'; line(g, 5); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.save(); g.clip();
  for (let row = -5; row <= 5; row++) {
    for (let col = -8; col <= 8; col++) {
      const a = col * 0.36 + (spin % 0.36);
      if (Math.cos(a) < 0) continue;
      const sx = Math.sin(a) * r * Math.cos(row * 0.28), sy = row * 12;
      const tw = (Math.sin(t * 6 + row * 3 + col * 7) + 1) / 2;
      g.fillStyle = tw > 0.8 && shine > 0.3 ? '#ffffff' : ['#9fb0d8', '#d8e2f8', '#b8c4e8', '#ffc4e6', '#c4e8ff'][(row + col + 20) % 5];
      g.fillRect(sx - 6, sy - 5, 11 * Math.cos(a), 10);
    }
  }
  g.restore();
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.fillStyle = '#ffd23f'; rr(g, -14, -r - 14, 28, 16, 4); g.fill(); g.stroke();
  g.restore();
}

export function drawBeams(g, x, y, spin, k, n = 8) {
  if (k <= 0.01) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = spin * 0.7 + (i / n) * TAU;
    const tx = x + Math.cos(a) * 1300, ty = y + 300 + Math.abs(Math.sin(a)) * 700;
    const gr = g.createLinearGradient(x, y, tx, ty);
    gr.addColorStop(0, RAINBOW[i % RAINBOW.length]); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.14 * k; g.fillStyle = gr;
    const px = -(ty - y), py = tx - x, l = Math.hypot(px, py) || 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(tx + (px / l) * 90, ty + (py / l) * 90); g.lineTo(tx - (px / l) * 90, ty - (py / l) * 90); g.closePath(); g.fill();
  }
  g.restore();
}

// ------------------------------------------------------------------ disguises (drawn in actor forward space)
export function drawDisguise(g, info, kind, k, t) {
  if (k <= 0.01) return;
  const h = info.h;
  g.save(); g.globalAlpha *= clamp(k, 0, 1);
  if (kind === 'book') {
    const s = clamp(h / 150, 0.45, 1.3);
    g.translate(info.eyes.x + 6 * s, info.eyes.y + 4 * s); g.rotate(-0.08);
    g.scale(s * (0.6 + 0.4 * k), s * (0.6 + 0.4 * k));
    if (!drawArt(g, 'prop/sd-disguise-book', 0, 0, 92, 74)) {
      line(g, 4);
      g.fillStyle = '#ffd23f'; rr(g, -46, -34, 92, 66, 6); g.fill(); g.stroke();
      g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -34); g.lineTo(0, 32); g.stroke();
      // a duck on the cover
      g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(-22, 4, 12, 0, TAU); g.fill(); line(g, 2); g.stroke();
      g.beginPath(); g.arc(-16, -10, 7, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ff9a2e'; g.beginPath(); g.moveTo(-10, -11); g.lineTo(-2, -8); g.lineTo(-10, -6); g.fill();
      g.fillStyle = '#ff6fb1'; g.save(); g.translate(24, 0); starPath(g, 12); g.fill(); g.restore();
    }
  } else if (kind === 'lamp') {
    const s = clamp(h / 150, 0.45, 1.3);
    g.translate(info.head.x, info.head.y + 14 * s); g.rotate(-0.1 + Math.sin(t * 3) * 0.02);
    g.scale(s, s);
    if (!drawArt(g, 'prop/sd-lampshade', 0, 0, 104, 86, { anchor: 'bottom' })) {
      g.fillStyle = '#ff9ccf'; line(g, 4);
      g.beginPath(); g.moveTo(-30, -66); g.lineTo(30, -66); g.lineTo(52, 0); g.lineTo(-52, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(200,60,120,0.4)'; g.lineWidth = 3;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 8, -64); g.lineTo(i * 15, -2); g.stroke(); }
      for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#ffd23f' : '#ff6fb1'; g.beginPath(); g.arc(-45 + i * 15, 6, 5, 0, TAU); g.fill(); }
      const gr = g.createRadialGradient(0, 30, 4, 0, 30, 80);
      gr.addColorStop(0, 'rgba(255,240,170,0.5)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 30, 80, 0, TAU); g.fill();
    }
  }
  g.restore();
}

/** Statue plinth under a frozen "statue" player (world space, feet at x, y). */
export function drawPlinth(g, x, y, w, k) {
  if (k <= 0.01) return;
  g.save(); g.globalAlpha = clamp(k, 0, 1);
  g.fillStyle = '#e8e4f0'; line(g, 4);
  rr(g, x - w / 2, y - 6, w, 26, 6); g.fill(); g.stroke();
  g.fillStyle = '#d0cadc'; rr(g, x - w / 2 - 10, y + 16, w + 20, 14, 5); g.fill(); g.stroke();
  g.restore();
}

/** Big "Zzz" / "?" / "!" bubble next to Hoot. kind: 'zzz'|'q'|'hmm'|'party'. */
export function drawBubble(g, x, y, kind, k, t) {
  if (k <= 0.01) return;
  g.save(); g.translate(x, y); g.scale(k, k);
  const fill = kind === 'q' ? '#ffe27a' : kind === 'hmm' ? '#ffb3c6' : kind === 'party' ? '#ffb3e0' : '#e6e0ff';
  // tail toward Hoot (lower left)
  g.fillStyle = fill; line(g, 6);
  g.beginPath(); g.moveTo(-50, 40); g.lineTo(-96, 86); g.lineTo(-20, 52); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, 0, 92, 72, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-50, 40); g.lineTo(-20, 52); g.strokeStyle = fill; g.lineWidth = 8; g.stroke();
  if (kind === 'zzz') {
    for (let i = 0; i < 3; i++) {
      const s = 30 + i * 8, ph = Math.sin(t * 3 + i) * 4;
      ui.text(g, 'Z', -38 + i * 34, 20 - i * 22 + ph, { size: s, color: '#7a6cc9', strokeWidth: 6 });
    }
  } else if (kind === 'q') {
    ui.text(g, '?', 0, 6 + Math.sin(t * 10) * 3, { size: 104, color: '#ff8a00', strokeWidth: 10 });
  } else if (kind === 'hmm') {
    ui.text(g, '?!', 0, 6, { size: 96, color: '#ff4d6d', strokeWidth: 10 });
  } else {
    for (let i = 0; i < 2; i++) { g.save(); g.translate(-24 + i * 48, Math.sin(t * 8 + i) * 8); g.fillStyle = i ? '#3fa7ff' : '#ff4d9a'; line(g, 4); g.beginPath(); g.ellipse(-6, 18, 16, 12, -0.4, 0, TAU); g.fill(); g.stroke(); g.fillRect(6, -30, 7, 48); g.strokeRect(6, -30, 7, 48); g.restore(); }
  }
  g.restore();
}

/** Floating star pickup. */
export function drawStarPickup(g, x, y, r, t, blink = 1) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 4) * 0.25); g.globalAlpha *= blink;
  g.fillStyle = '#ffd23f'; line(g, 4); starPath(g, r); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(-r * 0.25, -r * 0.3, r * 0.18, 0, TAU); g.fill();
  g.restore();
}
