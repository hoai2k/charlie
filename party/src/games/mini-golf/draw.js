// Candy Mini-Golf: procedural art. Every prop first tries its generated art
// key (see image-requests.md, "New Party game: mini-golf") and falls back to
// the vector drawing here.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { TAU, clamp } from '../../engine/util.js';
import { WALL_R, CUP_R, BALL_R, HUB_R, POP_R, BLADE_W, riverX, spinAngle } from './course.js';

export const NAVY = '#24163f';
const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const GUM_COLORS = [['#ff7ac6', '#ffc2e4'], ['#a77bff', '#d9c6ff'], ['#ff9f1c', '#ffd49a'], ['#4fd98a', '#b8f5cf'], ['#ffd23f', '#fff0a8']];
const SPRINKLES = ['#ff4d6d', '#ffd23f', '#3fa7ff', '#5ddc6a', '#b36bff', '#ffffff'];

function polyPath(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }

// --- scenery (outside the course) ----------------------------------------------
function lollipopTree(g, x, y, s, c1, c2) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(80,20,60,0.18)'; g.beginPath(); g.ellipse(6, 4, 34, 12, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -80); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -80); g.stroke();
  swirl(g, 0, -112, 40, c1, c2);
  g.restore();
}

/** A round swirl candy: disc in c1 with a c2 spiral. */
export function swirl(g, x, y, r, c1, c2, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = NAVY; g.beginPath(); g.arc(0, 0, r + 4, 0, TAU); g.fill();
  g.fillStyle = c1; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = c2; g.lineWidth = r * 0.22; g.lineCap = 'round';
  g.beginPath();
  for (let a = 0; a < TAU * 2.6; a += 0.2) { const rr = (a / (TAU * 2.6)) * r * 0.86; a ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(0, 0); }
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.16, -0.6, 0, TAU); g.fill();
  g.restore();
}

function gumdropBush(g, x, y, s, c) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(80,20,60,0.18)'; g.beginPath(); g.ellipse(4, 6, 40, 12, 0, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, -18, 40, 34, 0, Math.PI, 0); g.lineTo(40, 2); g.lineTo(-40, 2); g.closePath(); g.fill();
  g.fillStyle = c[0]; g.beginPath(); g.ellipse(0, -18, 35, 30, 0, Math.PI, 0); g.lineTo(35, -2); g.lineTo(-35, -2); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-26 + hh(i + x) * 52, -30 + hh(i * 3 + y) * 24, 2.4, 0, TAU); g.fill(); }
  g.restore();
}

function candyCanePost(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 18;
  const path = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -70); g.arc(16, -70, 16, Math.PI, 0); };
  path(); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 12; path(); g.stroke();
  g.strokeStyle = '#ff4d6d'; g.setLineDash([9, 9]); path(); g.stroke(); g.setLineDash([]);
  g.restore();
}

function coneShrub(g, x, y, s, c) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = NAVY; g.beginPath(); g.moveTo(-22, -40); g.lineTo(22, -40); g.lineTo(0, 6); g.closePath(); g.fill();
  g.fillStyle = '#f2b86b'; g.beginPath(); g.moveTo(-17, -38); g.lineTo(17, -38); g.lineTo(0, -1); g.closePath(); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(0, -50, 27, 0, TAU); g.fill();
  g.fillStyle = c; g.beginPath(); g.arc(0, -50, 23, 0, TAU); g.fill();
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(4, -74, 6, 0, TAU); g.fill();
  g.restore();
}

function drawMeadow(g) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#ffc9e3'); gr.addColorStop(1, '#ffb3d6');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // cotton-candy swirl patches
  for (let i = 0; i < 26; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(200,170,255,0.18)';
    g.beginPath(); g.ellipse(hh(i) * W, hh(i + 50) * H, 60 + hh(i + 9) * 90, 30 + hh(i + 4) * 40, hh(i + 2) * 3, 0, TAU); g.fill();
  }
  // sprinkles
  g.lineCap = 'round'; g.lineWidth = 5;
  for (let i = 0; i < 420; i++) {
    const x = hh(i * 3.1) * W, y = hh(i * 7.3) * H, a = hh(i * 1.7) * TAU;
    g.strokeStyle = SPRINKLES[i % SPRINKLES.length]; g.globalAlpha = 0.7;
    g.beginPath(); g.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5); g.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); g.stroke();
  }
  g.globalAlpha = 1;
  // sidewalk for the cheering gallery
  const sy = 962;
  g.fillStyle = NAVY; g.fillRect(0, sy - 6, W, H - sy + 6);
  const tiles = ['#fff3c4', '#ffd6ea', '#d6f0ff', '#e2ffd6', '#eadbff'];
  for (let x = 0, i = 0; x < W; x += 96, i++) { g.fillStyle = tiles[i % tiles.length]; g.fillRect(x + 2, sy, 92, H - sy); }
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, sy, W, 8);
  // decorations (top band and sides)
  const trees = [[160, 205, 0.8, 0], [430, 200, 0.7, 1], [1500, 205, 0.75, 2], [1760, 200, 0.85, 3], [60, 520, 0.7, 4], [1866, 470, 0.7, 0], [60, 870, 0.6, 1], [1866, 860, 0.62, 2]];
  const cols = [['#ff7ac6', '#fff'], ['#5ddc6a', '#fff'], ['#3fa7ff', '#fff6a8'], ['#ffd23f', '#ff4d6d'], ['#b36bff', '#fff']];
  for (const [x, y, s, c] of trees) lollipopTree(g, x, y, s, cols[c][0], cols[c][1]);
  for (const [x, y, s, c] of [[300, 215, 0.7, 2], [1080, 210, 0.6, 1], [1300, 215, 0.7, 3], [640, 218, 0.62, 4], [52, 330, 0.55, 0], [1870, 660, 0.55, 1]]) gumdropBush(g, x, y, s, GUM_COLORS[c]);
  for (const [x, y] of [[840, 222], [1660, 225], [40, 700], [1880, 300]]) candyCanePost(g, x, y, 0.7);
  for (const [x, y, c] of [[560, 220, '#c9f2ff'], [1880, 760, '#ffd0e6'], [44, 440, '#fff3a0'], [1180, 222, '#d9c6ff']]) coneShrub(g, x, y, 0.75, c);
}

// --- the course ------------------------------------------------------------------
/** Static floor layer: meadow (or bg art), felt, tee mat, slope shading. */
export function buildFloor(hole) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const bg = art('bg/mini-golf');
  if (bg) g.drawImage(bg, 0, 0, W, H); else drawMeadow(g);
  // drop shadow of the green
  g.save(); g.translate(10, 18); polyPath(g, hole.outline); g.fillStyle = 'rgba(90,20,70,0.25)'; g.fill(); g.restore();
  g.save();
  polyPath(g, hole.outline); g.fillStyle = '#86dca0'; g.fill(); g.clip();
  // mowing stripes
  g.fillStyle = '#7ed398';
  for (let x = -H; x < W + H; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x + 60 + H * 0.6, H); g.lineTo(x + H * 0.6, H); g.closePath(); g.fill(); }
  // soft felt speckle
  g.fillStyle = 'rgba(255,255,255,0.10)';
  for (let i = 0; i < 500; i++) { g.beginPath(); g.arc(hh(i * 2.3) * W, 240 + hh(i * 5.1) * 700, 1.5 + hh(i) * 2, 0, TAU); g.fill(); }
  // tee mat
  const T = hole.tee, th = Math.max(T.sp * 4.8, T.sp1 * 3.6);
  g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, T.x - 110, T.y - th / 2, 220, th, 40); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 5; g.setLineDash([16, 12]); ui.roundRect(g, T.x - 110, T.y - th / 2, 220, th, 40); g.stroke(); g.setLineDash([]);
  // slope: lighter at the top of the hill, darker at the bottom
  const s = hole.slope;
  if (s) {
    const len = Math.hypot(s.ax, s.ay), dx = s.ax / len, dy = s.ay / len;
    const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, half = Math.abs(dx) * (s.x1 - s.x0) / 2 + Math.abs(dy) * (s.y1 - s.y0) / 2;
    const gr = g.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(1, 'rgba(20,90,50,0.22)');
    g.fillStyle = gr; g.fillRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0);
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 4; g.setLineDash([10, 10]); g.strokeRect(s.x0 + 6, s.y0 + 6, s.x1 - s.x0 - 12, s.y1 - s.y0 - 12); g.setLineDash([]);
  }
  // inner-edge shade
  polyPath(g, hole.outline); g.strokeStyle = 'rgba(20,80,45,0.18)'; g.lineWidth = 46; g.stroke();
  g.restore();
  return cv;
}

function railStroke(g, draw) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.save(); g.translate(0, 9); draw(); g.strokeStyle = '#a21d45'; g.lineWidth = WALL_R * 2 + 6; g.stroke(); g.restore();
  draw(); g.strokeStyle = NAVY; g.lineWidth = WALL_R * 2 + 6; g.stroke();
  draw(); g.strokeStyle = '#ffffff'; g.lineWidth = WALL_R * 2; g.stroke();
  draw(); g.strokeStyle = '#ff4d6d'; g.lineWidth = WALL_R * 2 - 2; g.setLineDash([13, 15]); g.stroke(); g.setLineDash([]);
  g.save(); g.translate(0, -4); draw(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3; g.stroke(); g.restore();
}

/** Static rail layer (transparent canvas), drawn over the river and the floor. */
export function buildRails(hole) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  railStroke(g, () => polyPath(g, hole.outline));
  for (const w of hole.walls) railStroke(g, () => { g.beginPath(); g.moveTo(w[0], w[1]); g.lineTo(w[2], w[3]); });
  // peppermint knobs on the corners
  for (const [x, y] of hole.outline) swirl(g, x, y - 2, 14, '#ffffff', '#ff4d6d');
  for (const w of hole.walls) swirl(g, w[2], w[3] - 2, 14, '#ffffff', '#ff4d6d');
  return cv;
}

// --- live props --------------------------------------------------------------------
export function drawRiver(g, hole, t) {
  const rv = hole.river; if (!rv) return;
  g.save();
  polyPath(g, hole.outline); g.clip();
  const path = (off) => {
    g.beginPath();
    for (let y = 230; y <= 940; y += 10) { const x = riverX(rv, y) - rv.w / 2 - off; y === 230 ? g.moveTo(x, y) : g.lineTo(x, y); }
    for (let y = 940; y >= 230; y -= 10) g.lineTo(riverX(rv, y) + rv.w / 2 + off, y);
    g.closePath();
  };
  path(10); g.fillStyle = '#e8b06a'; g.fill();               // caramel bank
  path(0); const gr = g.createLinearGradient(rv.cx - rv.w / 2, 0, rv.cx + rv.w / 2, 0);
  gr.addColorStop(0, '#5a301b'); gr.addColorStop(0.5, '#7b4526'); gr.addColorStop(1, '#5a301b');
  g.fillStyle = gr; g.fill();
  g.clip();
  // flowing glossy streaks
  g.strokeStyle = 'rgba(255,220,180,0.35)'; g.lineWidth = 5; g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const y0 = ((i * 97 + t * 70) % 760) + 220, xo = (hh(i) - 0.5) * rv.w * 0.7;
    g.beginPath();
    for (let k = 0; k < 6; k++) { const y = y0 + k * 8; const x = riverX(rv, y) + xo + Math.sin(y * 0.05 + t * 2) * 4; k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  g.restore();
  // bank outline
  g.save(); polyPath(g, hole.outline); g.clip();
  g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineWidth = 3;
  for (const side of [-1, 1]) { g.beginPath(); for (let y = 230; y <= 940; y += 10) { const x = riverX(rv, y) + side * (rv.w / 2 + 10); y === 230 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  g.restore();
}

export function drawBridge(g, b) {
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  g.save(); g.fillStyle = 'rgba(40,10,0,0.35)'; ui.roundRect(g, b.x0 + 6, b.y0 + 12, w, h, 18); g.fill(); g.restore();
  if (drawArt(g, 'prop/golf-cookie-bridge', b.x0, b.y0, w, h, { anchor: 'topleft', fit: 'stretch' })) return;
  g.save();
  g.fillStyle = NAVY; ui.roundRect(g, b.x0 - 4, b.y0 - 4, w + 8, h + 8, 20); g.fill();
  const gr = g.createLinearGradient(0, b.y0, 0, b.y1); gr.addColorStop(0, '#f4c477'); gr.addColorStop(1, '#d99a48');
  g.fillStyle = gr; ui.roundRect(g, b.x0, b.y0, w, h, 16); g.fill();
  // cracker perforations + chips
  g.strokeStyle = 'rgba(140,80,30,0.45)'; g.lineWidth = 3;
  for (let x = b.x0 + w / 4; x < b.x1 - 5; x += w / 4) { g.beginPath(); g.moveTo(x, b.y0 + 8); g.lineTo(x, b.y1 - 8); g.stroke(); }
  g.fillStyle = 'rgba(140,80,30,0.5)';
  for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(b.x0 + 14 + hh(i) * (w - 28), b.y0 + 14 + hh(i + 3) * (h - 28), 2.5, 0, TAU); g.fill(); }
  g.fillStyle = '#5a301b';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(b.x0 + 20 + hh(i + 20) * (w - 40), b.y0 + 18 + hh(i + 40) * (h - 36), 7, 5, hh(i) * 3, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.3)'; ui.roundRect(g, b.x0 + 8, b.y0 + 6, w - 16, 10, 5); g.fill();
  g.restore();
}

export function drawSlopeArrows(g, s, t) {
  const len = Math.hypot(s.ax, s.ay), dx = s.ax / len, dy = s.ay / len;
  g.save(); g.beginPath(); g.rect(s.x0 + 10, s.y0 + 10, s.x1 - s.x0 - 20, s.y1 - s.y0 - 20); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2;
  const span = Math.abs(dx) * (s.x1 - s.x0) + Math.abs(dy) * (s.y1 - s.y0);
  const px = -dy, py = dx;
  for (let k = 0; k < 5; k++) {
    const u = (((t * 70 + (k * span) / 5) % span) - span / 2);
    for (const off of [-110, 0, 110]) {
      const x = cx + dx * u + px * off, y = cy + dy * u + py * off;
      g.beginPath(); g.moveTo(x - dx * 18 + px * 26, y - dy * 18 + py * 26); g.lineTo(x + dx * 8, y + dy * 8); g.lineTo(x - dx * 18 - px * 26, y - dy * 18 - py * 26); g.stroke();
    }
  }
  g.restore();
}

export function drawJelly(g, j, wob, t) {
  const k = 1 + Math.sin(t * 22) * 0.14 * wob, k2 = 1 - Math.sin(t * 22) * 0.12 * wob;
  g.save(); g.translate(j.x, j.y);
  g.fillStyle = 'rgba(120,20,60,0.22)'; g.beginPath(); g.ellipse(6, 10, j.r * 1.05, j.r * 0.95, 0, 0, TAU); g.fill();
  g.scale(k, k2);
  if (!drawArt(g, 'prop/golf-jelly', 0, 0, j.r * 2.2, j.r * 2.2)) {
    g.fillStyle = NAVY; g.beginPath(); g.arc(0, 0, j.r + 4, 0, TAU); g.fill();
    const gr = g.createRadialGradient(-j.r * 0.3, -j.r * 0.3, 4, 0, 0, j.r);
    gr.addColorStop(0, '#ffb3c8'); gr.addColorStop(0.7, '#ff4d7e'); gr.addColorStop(1, '#d6245a');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, j.r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, j.r * 0.7, 0, TAU); g.stroke();
    // heart
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath();
    const s = j.r * 0.28; g.moveTo(0, s * 0.9); g.bezierCurveTo(-s * 1.6, -s * 0.2, -s * 0.7, -s * 1.3, 0, -s * 0.45); g.bezierCurveTo(s * 0.7, -s * 1.3, s * 1.6, -s * 0.2, 0, s * 0.9); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-j.r * 0.45, -j.r * 0.5, j.r * 0.22, j.r * 0.11, -0.7, 0, TAU); g.fill();
  }
  g.restore();
}

export function drawDonut(g, x, y, exit, t) {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(80,20,40,0.22)'; g.beginPath(); g.ellipse(6, 10, 60, 54, 0, 0, TAU); g.fill();
  if (!drawArt(g, exit ? 'prop/golf-donut-exit' : 'prop/golf-donut', 0, 0, 120, 120)) {
    g.fillStyle = NAVY; g.beginPath(); g.arc(0, 0, 60, 0, TAU); g.fill();
    g.fillStyle = '#e8a560'; g.beginPath(); g.arc(0, 0, 56, 0, TAU); g.fill();
    // frosting with drippy edge
    g.fillStyle = exit ? '#7b4526' : '#ff8fc8';
    g.beginPath();
    for (let a = 0; a <= TAU + 0.01; a += 0.15) { const r = 48 + Math.sin(a * 7) * 3; a ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(r, 0); }
    g.closePath(); g.fill();
    g.strokeStyle = exit ? SPRINKLES[5] : '#fff'; g.lineWidth = 4; g.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + 0.2, r = 34 + (i % 3) * 5, b = a * 3;
      g.strokeStyle = exit ? '#ffffff' : SPRINKLES[i % 5];
      g.beginPath(); g.moveTo(Math.cos(a) * r - Math.cos(b) * 4, Math.sin(a) * r - Math.sin(b) * 4); g.lineTo(Math.cos(a) * r + Math.cos(b) * 4, Math.sin(a) * r + Math.sin(b) * 4); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-22, -30, 16, 7, -0.6, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.arc(0, 0, 29, 0, TAU); g.fill();
  }
  // portal swirl in the hole
  const gr = g.createRadialGradient(0, 0, 2, 0, 0, 26);
  gr.addColorStop(0, exit ? '#fff6c0' : '#d9a8ff'); gr.addColorStop(1, exit ? '#ffb43a' : '#5a2a9e');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 3;
  for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, 8 + k * 6, t * (exit ? -4 : 4) + k * 2, t * (exit ? -4 : 4) + k * 2 + 2.2); g.stroke(); }
  g.restore();
}

export function drawSpinner(g, sp, t) {
  const a0 = spinAngle(sp, t);
  const blade = (dx, dy, shadow) => {
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k * TAU) / 4, ca = Math.cos(a), sa = Math.sin(a);
      const tx = sp.x + ca * (sp.L - POP_R) + dx, ty = sp.y + sa * (sp.L - POP_R) + dy;
      g.lineCap = 'round';
      if (shadow) {
        g.strokeStyle = 'rgba(20,60,30,0.25)'; g.lineWidth = BLADE_W * 2; g.beginPath(); g.moveTo(sp.x + dx, sp.y + dy); g.lineTo(tx, ty); g.stroke();
        g.fillStyle = 'rgba(20,60,30,0.25)'; g.beginPath(); g.arc(tx, ty, POP_R, 0, TAU); g.fill();
        continue;
      }
      g.strokeStyle = NAVY; g.lineWidth = BLADE_W * 2 + 4; g.beginPath(); g.moveTo(sp.x, sp.y); g.lineTo(tx, ty); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = BLADE_W * 2 - 2; g.beginPath(); g.moveTo(sp.x, sp.y); g.lineTo(tx, ty); g.stroke();
      const cols = [['#ff7ac6', '#fff'], ['#3fa7ff', '#fff6a8'], ['#5ddc6a', '#fff'], ['#ffd23f', '#ff4d6d']][k];
      g.save(); g.translate(tx, ty); g.rotate(a);
      if (!drawArt(g, 'prop/golf-lollipop', 0, 0, POP_R * 2 + 6, POP_R * 2 + 6)) swirl(g, 0, 0, POP_R - 2, cols[0], cols[1], t * 3);
      g.restore();
    }
  };
  blade(10, 14, true);
  blade(0, 0, false);
  g.save(); g.translate(sp.x, sp.y); g.rotate(a0);
  if (!drawArt(g, 'prop/golf-spinner-hub', 0, 0, HUB_R * 2 + 8, HUB_R * 2 + 8)) {
    g.fillStyle = NAVY; g.beginPath(); g.arc(0, 0, HUB_R + 3, 0, TAU); g.fill();
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ff4d6d' : '#ffffff'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, HUB_R, (k * TAU) / 8, ((k + 1) * TAU) / 8); g.closePath(); g.fill(); }
    g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill(); g.stroke();
  }
  g.restore();
}

export function drawGumdrop(g, bp, sq) {
  const c = GUM_COLORS[bp.c % GUM_COLORS.length];
  g.save(); g.translate(bp.x, bp.y);
  g.fillStyle = 'rgba(60,20,50,0.25)'; g.beginPath(); g.ellipse(8, 12, bp.r * 1.05, bp.r * 0.95, 0, 0, TAU); g.fill();
  const k = 1 + sq * 0.25;
  g.scale(k, k);
  if (!drawArt(g, 'prop/golf-gumdrop', 0, -4, bp.r * 2.3, bp.r * 2.3)) {
    g.fillStyle = NAVY; g.beginPath(); g.arc(0, 0, bp.r + 4, 0, TAU); g.fill();
    const gr = g.createRadialGradient(-bp.r * 0.35, -bp.r * 0.45, 3, 0, 0, bp.r);
    gr.addColorStop(0, c[1]); gr.addColorStop(1, c[0]);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, bp.r, 0, TAU); g.fill();
    // dome rim shading + sugar
    g.strokeStyle = 'rgba(36,22,63,0.18)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, bp.r - 4, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 12; i++) { const a = hh(i + bp.x) * TAU, r = Math.sqrt(hh(i * 3 + bp.y)) * bp.r * 0.85; g.fillRect(Math.cos(a) * r - 1.5, Math.sin(a) * r - 1.5, 3, 3); }
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-bp.r * 0.35, -bp.r * 0.45, bp.r * 0.3, bp.r * 0.15, -0.6, 0, TAU); g.fill();
  }
  g.restore();
}

export function drawCup(g, cup) {
  if (drawArt(g, 'prop/golf-cup', cup.x, cup.y, CUP_R * 2 + 10, CUP_R * 2 + 10)) return;
  g.save(); g.translate(cup.x, cup.y);
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, CUP_R + 6, CUP_R + 5, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#2a1840'; g.beginPath(); g.ellipse(0, 1, CUP_R, CUP_R - 1, 0, 0, TAU); g.fill();
  g.fillStyle = '#4a2f6e'; g.beginPath(); g.ellipse(0, -4, CUP_R - 4, CUP_R - 9, 0, Math.PI, 0); g.fill();
  g.restore();
}

/** Flag on a candy-cane pole, foot at the cup centre. */
export function drawFlag(g, cup, t, alpha = 1) {
  g.save(); g.globalAlpha = alpha;
  if (drawArt(g, 'prop/golf-flag', cup.x, cup.y + 2, 64, 134, { anchor: 'bottom' })) { g.restore(); return; }
  g.translate(cup.x, cup.y);
  const top = -132;
  g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 11; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, top); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, top); g.stroke();
  g.strokeStyle = '#ff4d6d'; g.setLineDash([7, 7]); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, top); g.stroke(); g.setLineDash([]);
  // waving pennant
  g.fillStyle = '#ff6fb1'; g.strokeStyle = NAVY; g.lineWidth = 4; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(2, top + 2);
  for (let i = 0; i <= 8; i++) { const u = i / 8; g.lineTo(2 + u * 62, top + 2 + u * 22 + Math.sin(t * 6 - u * 3) * 5 * u); }
  for (let i = 8; i >= 0; i--) { const u = i / 8; g.lineTo(2 + u * 62, top + 46 - u * 22 + Math.sin(t * 6 - u * 3) * 5 * u); }
  g.closePath(); g.fill(); g.stroke();
  // star on the pennant
  g.fillStyle = '#fff'; g.beginPath();
  const sx = 26, sy = top + 24 + Math.sin(t * 6 - 1.2) * 2;
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4 : 9; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
  g.closePath(); g.fill();
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, top - 4, 7, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** A golf ball in the player's colour. (x, y) = ground point; z = height. */
export function drawBall(g, x, y, z, color, scale = 1) {
  const r = BALL_R * scale;
  g.save();
  const sh = clamp(1 - z / 220, 0.4, 1);
  g.fillStyle = `rgba(20,50,30,${0.35 * sh})`; g.beginPath(); g.ellipse(x + 3 + z * 0.15, y + r * 0.55, r * 1.05 * sh, r * 0.5 * sh, 0, 0, TAU); g.fill();
  const cy = y - z;
  g.fillStyle = NAVY; g.beginPath(); g.arc(x, cy, r + 3, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x - r * 0.4, cy - r * 0.45, 1, x, cy, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, color); gr.addColorStop(1, color);
  g.fillStyle = gr; g.beginPath(); g.arc(x, cy, r, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(x + r * 0.2, cy + r * 0.25, r * 0.7, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x - r * 0.35, cy - r * 0.4, r * 0.25, 0, TAU); g.fill();
  g.restore();
}

/** Candy-cane putter from the hand (hx, hy) to the club head (cx, cy), head turned to `ang`. */
export function drawPutter(g, hx, hy, cx, cy, ang) {
  g.save(); g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 10; g.beginPath(); g.moveTo(hx, hy); g.lineTo(cx, cy); g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = 5.5; g.beginPath(); g.moveTo(hx, hy); g.lineTo(cx, cy); g.stroke();
  g.strokeStyle = '#ff4d6d'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(hx, hy); g.lineTo(cx, cy); g.stroke(); g.setLineDash([]);
  g.translate(cx, cy); g.rotate(ang + Math.PI / 2);
  g.fillStyle = '#ff6fb1'; g.strokeStyle = NAVY; g.lineWidth = 3.5;
  ui.roundRect(g, -17, -6, 34, 12, 6); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-12, -3, 24, 3);
  g.restore();
}

// --- thumbnail -----------------------------------------------------------------------
export function drawIcon(g, x, y, w, h, t = 0) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#ffc2e0'; g.fillRect(x, y, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle = SPRINKLES[i % 6]; g.fillRect(x + hh(i) * w, y + hh(i + 9) * h, 6, 2.5); }
  // green
  const gx = x + w * 0.07, gy = y + h * 0.14, gw = w * 0.86, gh = h * 0.74;
  g.fillStyle = 'rgba(90,20,70,0.25)'; ui.roundRect(g, gx + 6, gy + 8, gw, gh, h * 0.12); g.fill();
  g.fillStyle = '#86dca0'; ui.roundRect(g, gx, gy, gw, gh, h * 0.12); g.fill();
  g.save(); ui.roundRect(g, gx, gy, gw, gh, h * 0.12); g.clip();
  g.fillStyle = '#7ed398'; for (let i = -4; i < 14; i++) { g.beginPath(); g.moveTo(gx + i * w * 0.1, gy); g.lineTo(gx + i * w * 0.1 + w * 0.05, gy); g.lineTo(gx + i * w * 0.1 + w * 0.05 + gh * 0.6, gy + gh); g.lineTo(gx + i * w * 0.1 + gh * 0.6, gy + gh); g.closePath(); g.fill(); }
  g.restore();
  g.lineJoin = 'round';
  const lw = Math.max(4, h * 0.035);
  ui.roundRect(g, gx, gy, gw, gh, h * 0.12); g.strokeStyle = NAVY; g.lineWidth = lw + 4; g.stroke();
  ui.roundRect(g, gx, gy, gw, gh, h * 0.12); g.strokeStyle = '#fff'; g.lineWidth = lw; g.stroke();
  ui.roundRect(g, gx, gy, gw, gh, h * 0.12); g.strokeStyle = '#ff4d6d'; g.setLineDash([lw * 1.3, lw * 1.5]); g.stroke(); g.setLineDash([]);
  const s = h / 520;
  // gumdrop + spinner
  g.save(); g.translate(x + w * 0.44, y + h * 0.3); g.scale(s, s); drawGumdrop(g, { x: 0, y: 0, r: 38, c: 1 }, 0); g.restore();
  g.save(); g.translate(x + w * 0.42, y + h * 0.72); g.scale(s, s); drawGumdrop(g, { x: 0, y: 0, r: 34, c: 2 }, 0); g.restore();
  g.save(); g.translate(x + w * 0.62, y + h * 0.5); g.scale(s * 0.9, s * 0.9); drawSpinner(g, { x: 0, y: 0, L: 130, w: 1.2 }, t); g.restore();
  // cup + flag
  const cx = x + w * 0.82, cy = y + h * 0.55;
  g.save(); g.translate(cx, cy); g.scale(s * 1.2, s * 1.2); drawCup(g, { x: 0, y: 0 }); drawFlag(g, { x: 0, y: 0 }, t); g.restore();
  // balls rolling in
  const cols = ['#ff4d6d', '#3fa7ff', '#ffc12e'];
  for (let i = 0; i < 3; i++) {
    const u = ((t * 0.35 + i * 0.27) % 1);
    const bx = x + w * (0.14 + u * 0.22), by = y + h * (0.3 + i * 0.2) + Math.sin(u * 7 + i) * h * 0.03;
    drawBall(g, bx, by, 0, cols[i], s * 1.6);
  }
  // putter in the foreground
  drawPutter(g, x + w * 0.12, y + h * 0.95, x + w * 0.2, y + h * 0.72, -0.3);
  g.restore();
}
