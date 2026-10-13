// Magic Wand Shapes: shape paths and procedural art (sky, spells, sparkle).
// Every drawing first tries its generated art key (image-requests.md,
// "New Molly Party game: wand-shapes").
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { TAU, clamp, lerp } from '../../engine/util.js';
import { RAINBOW } from '../../engine/particles.js';

export const NAVY = '#24163f';
export const CX = 960, CY = 500;
const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// --- shapes --------------------------------------------------------------------
function resample(pts, n, closed) {
  const P = closed ? [...pts, pts[0]] : pts;
  const seg = [];
  let total = 0;
  for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y); seg.push(d); total += d; }
  const out = [];
  const step = total / (closed ? n : n - 1);
  let si = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (si < seg.length - 1 && acc + seg[si] < target) { acc += seg[si]; si++; }
    const u = seg[si] ? clamp((target - acc) / seg[si], 0, 1) : 0;
    out.push({ x: lerp(P[si].x, P[si + 1].x, u), y: lerp(P[si].y, P[si + 1].y, u) });
  }
  return out;
}

const dense = (f, n = 240, a = 0, b = 1) => Array.from({ length: n }, (_, i) => f(lerp(a, b, i / (n - 1))));

export const SHAPES = {
  circle: { dots: 22, closed: true, col: '#6fd0ff', path: () => dense((u) => ({ x: CX + Math.cos(u * TAU - Math.PI / 2) * 300, y: CY + Math.sin(u * TAU - Math.PI / 2) * 300 }), 240) },
  heart: {
    dots: 26, closed: true, col: '#ff7ac6',
    path: () => dense((u) => {
      const t = u * TAU, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return { x: CX + x * 20, y: CY - 20 - y * 20 };
    }, 300),
  },
  star: {
    dots: 30, closed: true, col: '#ffd23f',
    path: () => Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 145 : 340;
      return { x: CX + Math.cos(a) * r, y: CY + 20 + Math.sin(a) * r };
    }),
  },
  moon: {
    dots: 26, closed: true, col: '#fff08a',
    path: () => {
      // outer arc round the left, inner arc back (crescent opening right)
      const outer = dense((u) => { const a = lerp(-1.15, 1.15, u) + Math.PI; return { x: CX + 20 + Math.cos(-a) * 310, y: CY + Math.sin(-a) * 310 }; }, 160);
      const inner = dense((u) => { const a = lerp(1.6, -1.6, u) + Math.PI; return { x: CX + 150 + Math.cos(-a) * 260, y: CY + Math.sin(-a) * 258 }; }, 140);
      return [...outer, ...inner];
    },
  },
  rainbow: { dots: 22, closed: false, col: '#ff9f1c', path: () => dense((u) => ({ x: CX + Math.cos(Math.PI + u * Math.PI) * 400, y: CY + 260 + Math.sin(Math.PI + u * Math.PI) * 400 }), 200) },
};
export const SHAPE_ORDER = ['circle', 'heart', 'star', 'moon', 'rainbow'];

/** Dot positions for a shape. */
export function shapeDots(id) {
  const s = SHAPES[id];
  return resample(s.path(), s.dots, s.closed);
}

/** Fill path of a shape (used for the "coming alive" glow). */
export function shapePath(g, id) {
  const pts = SHAPES[id].path();
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  if (SHAPES[id].closed) g.closePath();
}

// --- sky -----------------------------------------------------------------------
export function drawSky(g, t) {
  const bg = art('bg/wand-shapes');
  if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#2b1b66'); gr.addColorStop(0.45, '#7b4fb8'); gr.addColorStop(0.8, '#ff9fc8'); gr.addColorStop(1, '#ffc9a8');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // twinkling stars
  for (let i = 0; i < 80; i++) {
    const x = hh(i) * W, y = hh(i + 50) * 620, a = 0.3 + 0.7 * Math.abs(Math.sin(t * (1 + hh(i + 9) * 2) + i));
    g.globalAlpha = a; g.fillStyle = '#fff';
    g.beginPath(); g.arc(x, y, 1.2 + hh(i + 3) * 2.4, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  // drifting side clouds
  for (let i = 0; i < 5; i++) {
    const x = ((hh(i + 20) * W + t * (10 + i * 4)) % (W + 500)) - 250, y = 220 + i * 110;
    g.fillStyle = 'rgba(255,214,236,0.28)';
    for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + j * 55, y + Math.sin(j * 1.7) * 12, 40 + (j % 2) * 16, 0, TAU); g.fill(); }
  }
  // cloud ledge along the bottom
  g.lineWidth = 5; g.strokeStyle = 'rgba(36,22,63,0.5)';
  for (const [row, col, yy] of [[0, '#f3c6ef', 905], [1, '#ffe0f4', 950]]) {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(0, H);
    for (let i = 0; i <= 14; i++) {
      const x = i * (W / 14), y = yy + Math.sin(i * 1.9 + row) * 18;
      g.lineTo(x, y);
      g.arc(x + W / 28, y, W / 28 + 8, Math.PI, 0);
    }
    g.lineTo(W, H); g.closePath(); g.fill(); g.stroke();
  }
}

// --- sparkle cursor ---------------------------------------------------------------
export function drawSparkle(g, x, y, s, rot, color) {
  g.save(); g.translate(x, y);
  const gl = g.createRadialGradient(0, 0, 2, 0, 0, s);
  gl.addColorStop(0, color); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalAlpha = 0.7; g.fillStyle = gl; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); g.globalAlpha = 1;
  g.rotate(rot);
  if (!drawArt(g, 'prop/wand-sparkle', 0, 0, s * 1.3, s * 1.3)) {
    g.fillStyle = '#fffbe0'; g.strokeStyle = color; g.lineWidth = 4; g.lineJoin = 'round';
    const r = s * 0.62, r2 = s * 0.16;
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r2 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

// --- spells -----------------------------------------------------------------------
export function drawFrogBubble(g, x, y, r, t) {
  g.save(); g.translate(x, y);
  const wob = 1 + Math.sin(t * 6) * 0.03;
  g.scale(wob, 2 - wob);
  if (drawArt(g, 'prop/wand-bubble-frog', 0, 0, r * 2, r * 2)) { g.restore(); return; }
  // frog
  const s = r / 100;
  g.save(); g.scale(s, s); g.translate(0, 20);
  g.fillStyle = '#5ddc6a'; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.ellipse(0, 10, 46, 36, 0, 0, TAU); g.fill(); g.stroke();
  for (const sx of [-1, 1]) {
    g.fillStyle = '#5ddc6a'; g.beginPath(); g.arc(sx * 22, -26, 16, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * 22, -26, 10, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.arc(sx * 22 + 2, -25, 5, 0, TAU); g.fill();
  }
  g.fillStyle = '#c9f7a8'; g.beginPath(); g.ellipse(0, 20, 28, 18, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 3.5; g.beginPath(); g.arc(0, -4, 18, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = '#ff9fb8'; g.beginPath(); g.arc(-28, -2, 6, 0, TAU); g.arc(28, -2, 6, 0, TAU); g.fill();
  // waving arm
  g.strokeStyle = NAVY; g.lineWidth = 9; g.lineCap = 'round';
  const wa = Math.sin(t * 8) * 0.5;
  g.beginPath(); g.moveTo(36, 4); g.lineTo(36 + Math.cos(-1 + wa) * 30, 4 + Math.sin(-1 + wa) * 30); g.stroke();
  g.strokeStyle = '#5ddc6a'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(36, 4); g.lineTo(36 + Math.cos(-1 + wa) * 30, 4 + Math.sin(-1 + wa) * 30); g.stroke();
  g.restore();
  // bubble
  const bg = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  bg.addColorStop(0, 'rgba(255,255,255,0.15)'); bg.addColorStop(0.75, 'rgba(160,220,255,0.18)'); bg.addColorStop(1, 'rgba(255,160,230,0.55)');
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(2, r * 0.03); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(-r * 0.42, -r * 0.45, r * 0.16, r * 0.08, -0.7, 0, TAU); g.fill();
  g.restore();
}

export function drawHeartBalloon(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2) * 0.08);
  if (drawArt(g, 'prop/wand-heart-balloon', 0, s * 0.33, s * 1.5, s * 2)) { g.restore(); return; }
  g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, s * 0.62);
  for (let i = 1; i <= 10; i++) g.lineTo(Math.sin(i * 1.3 + t * 3) * 10, s * 0.62 + i * s * 0.09);
  g.stroke();
  g.fillStyle = '#ff5aa8'; g.lineWidth = Math.max(3, s * 0.03);
  g.beginPath();
  g.moveTo(0, s * 0.6);
  g.bezierCurveTo(-s * 0.9, s * 0.05, -s * 0.5, -s * 0.7, 0, -s * 0.25);
  g.bezierCurveTo(s * 0.5, -s * 0.7, s * 0.9, s * 0.05, 0, s * 0.6);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.3, -s * 0.22, s * 0.12, s * 0.07, -0.6, 0, TAU); g.fill();
  g.fillStyle = '#ff5aa8'; g.beginPath(); g.moveTo(-8, s * 0.6); g.lineTo(8, s * 0.6); g.lineTo(0, s * 0.68); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

export function drawStarFace(g, x, y, r, rot, t) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (drawArt(g, 'prop/wand-shooting-star', 0, 0, r * 2.4, r * 2.4)) { g.restore(); return; }
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = Math.max(3, r * 0.05); g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.stroke();
  g.rotate(-rot * 0.5);
  g.strokeStyle = NAVY; g.lineWidth = Math.max(2.5, r * 0.05);
  g.beginPath(); g.arc(-r * 0.2, -r * 0.05, r * 0.1, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.beginPath(); g.arc(r * 0.2, -r * 0.05, r * 0.1, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.beginPath(); g.arc(0, r * 0.1, r * 0.14, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = '#ff9f9f'; g.beginPath(); g.arc(-r * 0.33, r * 0.12, r * 0.07, 0, TAU); g.arc(r * 0.33, r * 0.12, r * 0.07, 0, TAU); g.fill();
  g.restore();
}

export function drawSleepyMoon(g, x, y, r, t) {
  g.save(); g.translate(x, y + Math.sin(t * 1.5) * 6); g.rotate(Math.sin(t * 0.8) * 0.06);
  if (drawArt(g, 'prop/wand-sleepy-moon', 0, 0, r * 2.4, r * 2.4)) { g.restore(); return; }
  const glow = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.5);
  glow.addColorStop(0, 'rgba(255,245,180,0.5)'); glow.addColorStop(1, 'rgba(255,245,180,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(0, 0, r * 1.5, 0, TAU); g.fill();
  g.fillStyle = '#fff08a'; g.strokeStyle = NAVY; g.lineWidth = Math.max(3, r * 0.04);
  g.beginPath(); g.arc(0, 0, r, Math.PI * 0.32, Math.PI * 1.68); g.arc(r * 0.5, -r * 0.05, r * 0.8, Math.PI * 1.48, Math.PI * 0.52, true); g.closePath(); g.fill(); g.stroke();
  // closed eye + smile + cheek
  g.lineWidth = Math.max(2.5, r * 0.04);
  g.beginPath(); g.arc(-r * 0.5, -r * 0.12, r * 0.12, 0.2, Math.PI - 0.2); g.stroke();
  g.beginPath(); g.arc(-r * 0.48, r * 0.25, r * 0.12, 0.3, Math.PI - 0.6); g.stroke();
  g.fillStyle = '#ffb3a8'; g.beginPath(); g.arc(-r * 0.66, r * 0.1, r * 0.08, 0, TAU); g.fill();
  // nightcap
  g.fillStyle = '#6fa8ff';
  g.beginPath(); g.moveTo(-r * 0.75, -r * 0.6); g.quadraticCurveTo(-r * 0.2, -r * 1.25, r * 0.55, -r * 1.05); g.quadraticCurveTo(-r * 0.05, -r * 0.92, -r * 0.2, -r * 0.82); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff';
  for (const [px, py] of [[-0.45, -0.85], [-0.15, -1.0], [0.2, -1.02]]) { g.beginPath(); g.arc(px * r, py * r, r * 0.05, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(r * 0.58, -r * 1.05, r * 0.1, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** The living rainbow: k = 0..1 fill, base at (x, y), radius r. */
export function drawRainbowArc(g, x, y, r, k, t, alpha = 1) {
  g.save(); g.globalAlpha *= alpha;
  if (drawArt(g, 'prop/wand-rainbow', x, y + r * 0.08, r * 2.4, r * 1.25, { anchor: 'bottom' })) { g.restore(); return; }
  const cols = RAINBOW.slice(0, 7), bandW = r * 0.075;
  cols.forEach((c, i) => {
    const kk = clamp(k * 1.4 - i * 0.06, 0, 1);
    if (kk <= 0) return;
    g.strokeStyle = c; g.lineWidth = bandW + 1;
    g.beginPath(); g.arc(x, y, r + (3 - i) * bandW, Math.PI, Math.PI + Math.PI * kk); g.stroke();
  });
  // smiling clouds at the feet
  for (const sx of [-1, 1]) {
    const cx = x + sx * r, cy = y + Math.sin(t * 5 + sx) * 6;
    g.fillStyle = '#fff'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.arc(cx - 40, cy, 34, 0, TAU); g.arc(cx + 40, cy, 34, 0, TAU); g.arc(cx, cy - 22, 44, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(cx, cy + 6, 78, 30, 0, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.arc(cx - 14, cy - 8, 4, 0, TAU); g.arc(cx + 14, cy - 8, 4, 0, TAU); g.fill();
    g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 10, 0.2, Math.PI - 0.2); g.stroke();
  }
  g.restore();
}
