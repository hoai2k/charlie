// Hideable things for Hide & Seek Picnic: little creatures (drawn in code,
// with tiny idle animations so careful watchers spot them) and objects
// (existing prop art, with simple drawn fallbacks).
//
//   drawThing(g, id, x, y, h, t, { seed, variant })   centered on (x, y), h px tall
//   thingWidth(id, h, variant)                        width for that height
//
// Every creature also has an optional art key (`prop/seek-<id>`); when it
// exists it replaces the drawing and the animation becomes a gentle
// transform (wobble, bob, blink) instead.
import { art } from '../../engine/art.js';
import { TAU, clamp } from '../../engine/util.js';
import { drawSparkleShape, starPath } from '../../engine/emotes.js';

export const NAVY = '#24163f';

// --- tiny drawing kit ---------------------------------------------------------
function unit(g, h, aspect) {
  const u = h / 100;
  g.scale(u, u);
  g.lineWidth = clamp(h * 0.055, 1.3, 3.4) / u;
  g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
  return u;
}
const ell = (g, x, y, rx, ry, r = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), r, 0, TAU); };
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); };
const fs = (g, c) => { g.fillStyle = c; g.fill(); g.stroke(); };
const fill = (g, c) => { g.fillStyle = c; g.fill(); };
/** 0 most of the time, a quick 0→1→0 blip every `period` seconds. */
const blip = (t, period, len = 0.25, phase = 0) => {
  const k = ((t + phase) % period + period) % period;
  return k < len ? Math.sin((k / len) * Math.PI) : 0;
};
const shine = (g, x, y, rx, ry, rot = -0.5) => { g.save(); g.globalAlpha *= 0.75; ell(g, x, y, rx, ry, rot); fill(g, '#ffffff'); g.restore(); };
function eye(g, x, y, r, closed = 0) {
  if (closed > 0.5) { g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x, y + r * 0.8, x + r, y); g.stroke(); return; }
  circ(g, x, y, r); fill(g, NAVY);
  circ(g, x - r * 0.35, y - r * 0.35, r * 0.38); fill(g, '#ffffff');
}

// --- creatures -----------------------------------------------------------------
const LADY = [['#ff3b4e', '#c81e3a'], ['#ff8a1f', '#d4600c'], ['#ffd23f', '#d39b00']];
function ladybug(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const [c1, c2] = LADY[(o.variant || 0) % LADY.length];
  const walk = Math.sin(t * 0.8 + s) > 0.55 ? 1 : 0;
  const wig = Math.sin(t * 16 + s) * 5 * walk;
  const open = blip(t, 5.5, 0.9, s * 3);
  g.save(); g.rotate(Math.sin(t * 0.7 + s) * 0.08);
  // legs
  for (const side of [-1, 1]) for (const [i, lx] of [-28, -6, 16].entries()) {
    g.beginPath(); g.moveTo(lx, side * 26); g.lineTo(lx + (i % 2 ? wig : -wig) - 4, side * 46); g.stroke();
  }
  // antennae
  g.beginPath(); g.moveTo(52, -8); g.quadraticCurveTo(62, -20, 70, -22); g.moveTo(52, 8); g.quadraticCurveTo(62, 20, 70, 22); g.stroke();
  circ(g, 70, -22, 4); fill(g, NAVY); circ(g, 70, 22, 4); fill(g, NAVY);
  // head
  circ(g, 40, 0, 21); fs(g, '#2b2340');
  circ(g, 50, -9, 5); fill(g, '#ffffff'); circ(g, 50, 9, 5); fill(g, '#ffffff');
  circ(g, 52, -9, 2.5); fill(g, NAVY); circ(g, 52, 9, 2.5); fill(g, NAVY);
  // hind wings when the shell opens
  if (open > 0.02) {
    g.save(); g.globalAlpha *= 0.7;
    ell(g, -18, -30 * open, 40, 18, -0.5 * open); fs(g, '#e9f4ff');
    ell(g, -18, 30 * open, 40, 18, 0.5 * open); fs(g, '#e9f4ff');
    g.restore();
  }
  // shell halves (they lift apart to fly)
  for (const side of [-1, 1]) {
    g.save(); g.translate(30, 0); g.rotate(side * -0.55 * open); g.translate(-30, 0);
    g.beginPath(); g.ellipse(-8, 0, 46, 40, 0, side < 0 ? Math.PI : 0, side < 0 ? TAU : Math.PI); g.closePath();
    g.fillStyle = c1; g.fill();
    g.save(); g.clip(); ell(g, -8, side * 22, 46, 18); fill(g, c2); g.restore();
    g.stroke();
    for (const [sx, sy, r] of [[-28, 18, 8], [-4, 25, 7], [16, 13, 6], [-34, 4, 5]]) { circ(g, sx, side * sy, r); fill(g, '#2b2340'); }
    g.restore();
  }
  shine(g, -22, -24, 10, 5);
  g.restore();
}

const BUNNY = [['#fffaf6', '#e9dff5'], ['#e3b991', '#c9976c'], ['#d9d6e4', '#b9b4cc']];
function bunny(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const [c1, c2] = BUNNY[(o.variant || 0) % BUNNY.length];
  const tw = blip(t, 3.1, 0.35, s * 2);
  const tw2 = blip(t, 4.7, 0.3, s * 5 + 1);
  const sniff = Math.sin(t * 14) * (Math.sin(t * 0.9 + s) > 0.3 ? 1 : 0);
  g.translate(0, 4);
  // ears
  const ears = [[-12, -0.18 - tw2 * 0.25], [12, 0.2 + tw * 0.45]];
  for (const [ex, er] of ears) {
    g.save(); g.translate(ex, -20); g.rotate(er);
    ell(g, 0, -24, 10, 25); fs(g, c1);
    ell(g, 0, -22, 5, 18); fill(g, '#ffb3cf');
    g.restore();
  }
  // body
  ell(g, 0, 30, 30, 22); fs(g, c1);
  ell(g, 4, 34, 17, 14); fill(g, c2);
  ell(g, -16, 50, 11, 6); fs(g, c1); ell(g, 16, 50, 11, 6); fs(g, c1);
  // head
  circ(g, 0, 0, 25); fs(g, c1);
  const blink = blip(t, 3.7, 0.18, s);
  eye(g, -10, -2, 4.5, blink); eye(g, 10, -2, 4.5, blink);
  circ(g, -15, 8, 5); fill(g, 'rgba(255,120,170,0.35)'); circ(g, 15, 8, 5); fill(g, 'rgba(255,120,170,0.35)');
  g.save(); g.translate(0, 7); g.scale(1 + sniff * 0.12, 1 - sniff * 0.1);
  g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.lineTo(0, 4); g.closePath(); g.fillStyle = '#ff7fae'; g.fill();
  g.restore();
  g.save(); g.lineWidth *= 0.6;
  g.beginPath(); g.moveTo(0, 11); g.quadraticCurveTo(-4, 15, -7, 13); g.moveTo(0, 11); g.quadraticCurveTo(4, 15, 7, 13); g.stroke();
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 8, 9); g.lineTo(sd * 26, 6 + sniff); g.moveTo(sd * 8, 11); g.lineTo(sd * 25, 13 + sniff); g.stroke(); }
  g.restore();
}

const FLY = [['#ff8fd0', '#b36bff'], ['#ffb347', '#ffd23f'], ['#6fd3ff', '#5a7bff']];
function butterfly(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const [c1, c2] = FLY[(o.variant || 0) % FLY.length];
  const active = Math.sin(t * 0.6 + s) > -0.2 ? 1 : 0.25;
  const flap = 0.3 + 0.7 * Math.abs(Math.cos(t * 3.2 * active + s));
  for (const side of [-1, 1]) {
    g.save(); g.scale(side * flap, 1);
    g.save(); g.rotate(-0.35); ell(g, 30, -14, 30, 24); fs(g, c1); circ(g, 34, -14, 9); fill(g, c2); circ(g, 18, -22, 4); fill(g, '#ffffff'); g.restore();
    g.save(); g.rotate(0.45); ell(g, 22, 18, 20, 17); fs(g, c2); circ(g, 24, 20, 6); fill(g, c1); g.restore();
    g.restore();
  }
  ell(g, 0, 4, 6, 26); fs(g, '#3b2a55');
  circ(g, 0, -24, 8); fs(g, '#3b2a55');
  g.beginPath(); g.moveTo(-3, -30); g.quadraticCurveTo(-10, -44, -16, -46); g.moveTo(3, -30); g.quadraticCurveTo(10, -44, 16, -46); g.stroke();
  circ(g, -16, -46, 3); fill(g, NAVY); circ(g, 16, -46, 3); fill(g, NAVY);
}

const SNAIL = [['#ff9fb8', '#e2577f'], ['#ffb36b', '#d97a26'], ['#b39bff', '#7c5ad8']];
function snail(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const [c1, c2] = SNAIL[(o.variant || 0) % SNAIL.length];
  const w1 = Math.sin(t * 2.2 + s) * 5, w2 = Math.sin(t * 2.2 + s + 1.3) * 5;
  const blink = blip(t, 4.2, 0.18, s);
  g.translate(0, 8);
  // eye stalks
  g.beginPath(); g.moveTo(48, -6); g.lineTo(52 + w1, -40); g.moveTo(58, -4); g.lineTo(68 + w2, -36); g.stroke();
  circ(g, 52 + w1, -42, 7); fs(g, '#e7f5b0'); circ(g, 68 + w2, -38, 7); fs(g, '#e7f5b0');
  if (blink < 0.5) { circ(g, 53 + w1, -42, 3); fill(g, NAVY); circ(g, 69 + w2, -38, 3); fill(g, NAVY); }
  // body
  g.beginPath(); g.moveTo(-66, 36); g.quadraticCurveTo(-40, 28, 20, 30); g.quadraticCurveTo(46, 30, 50, 0);
  g.quadraticCurveTo(54, -12, 64, -6); g.quadraticCurveTo(74, 4, 66, 22); g.quadraticCurveTo(60, 38, 30, 40);
  g.lineTo(-60, 42); g.quadraticCurveTo(-70, 40, -66, 36); g.closePath(); fs(g, '#e7f5b0');
  g.beginPath(); g.moveTo(56, 12); g.quadraticCurveTo(61, 16, 66, 12); g.stroke();
  // shell
  circ(g, -10, -2, 38); fs(g, c1);
  g.save(); g.lineWidth *= 1.1; g.strokeStyle = c2;
  g.beginPath();
  for (let a = 0; a < 11; a += 0.2) { const r = 32 - a * 2.9; g.lineTo(-10 + Math.cos(a + 1.2) * r, -2 + Math.sin(a + 1.2) * r); }
  g.stroke(); g.restore();
  shine(g, -26, -22, 9, 5);
}

const MOUSE = [['#cfc8dc', '#aaa1c0'], ['#e5c9a8', '#c4a07a'], ['#f2eef7', '#cfc6dd']];
function mouse(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const [c1, c2] = MOUSE[(o.variant || 0) % MOUSE.length];
  const sw = Math.sin(t * 2.6 + s);
  const sniff = Math.sin(t * 15) * (Math.sin(t * 1.1 + s) > 0.4 ? 1 : 0);
  // tail
  g.save(); g.lineWidth *= 2.2; g.strokeStyle = NAVY;
  g.beginPath(); g.moveTo(-40, 28); g.bezierCurveTo(-70, 30 + sw * 10, -62, -20 - sw * 14, -78 - sw * 6, -30); g.stroke();
  g.lineWidth /= 2.2 * 0.45; g.strokeStyle = '#ff9fc0'; g.stroke();
  g.restore();
  // body
  ell(g, -6, 18, 42, 30); fs(g, c1);
  ell(g, 4, 28, 24, 14); fill(g, c2);
  ell(g, 6, 46, 9, 5); fs(g, '#ffb3cf'); ell(g, -26, 46, 9, 5); fs(g, '#ffb3cf');
  // head
  g.save(); g.translate(30, 2); g.rotate(sniff * 0.03);
  g.beginPath(); g.moveTo(-22, -18); g.quadraticCurveTo(10, -26, 36, 4); g.quadraticCurveTo(10, 24, -20, 18); g.closePath(); fs(g, c1);
  circ(g, -6, -26, 17); fs(g, c1); circ(g, -6, -26, 10); fill(g, '#ffb3cf');
  const blink = blip(t, 3.3, 0.16, s);
  eye(g, 8, -4, 5, blink);
  circ(g, 36, 4, 6); fs(g, '#ff7fae');
  g.save(); g.lineWidth *= 0.6;
  for (const k of [-1, 1]) { g.beginPath(); g.moveTo(28, 6); g.lineTo(54, 2 + k * 8 + sniff * 2); g.stroke(); }
  g.restore();
  g.restore();
}

const BIRD = [['#5aaef5', '#dff1ff', '#3b82d6'], ['#ff7a8f', '#ffe1e6', '#d9455f'], ['#ffd23f', '#fff6c8', '#e0a300']];
function bird(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const [c1, c2, c3] = BIRD[(o.variant || 0) % BIRD.length];
  const hop = blip(t, 2.9, 0.35, s * 2);
  const bob = Math.sin(t * 2 + s) * 0.08;
  g.translate(0, -hop * 14);
  // feet
  g.beginPath(); g.moveTo(-6, 44); g.lineTo(-8, 52); g.moveTo(8, 44); g.lineTo(8, 52); g.stroke();
  // tail
  g.beginPath(); g.moveTo(-30, 10); g.lineTo(-58, -6); g.lineTo(-54, 14); g.closePath(); fs(g, c3);
  g.save(); g.rotate(bob);
  circ(g, 0, 8, 38); fs(g, c1);
  ell(g, 10, 20, 22, 18); fill(g, c2);
  g.save(); g.translate(-10, 12); g.rotate(0.35 + blip(t, 3.6, 0.3, s) * -0.6); ell(g, 0, 0, 22, 13); fs(g, c3); g.restore();
  g.beginPath(); g.moveTo(30, -6); g.lineTo(48, 0); g.lineTo(30, 6); g.closePath(); fs(g, '#ffa53a');
  eye(g, 16, -6, 5.5, blip(t, 4.1, 0.15, s));
  g.beginPath(); g.moveTo(-2, -28); g.quadraticCurveTo(2, -40, 10, -36); g.moveTo(2, -29); g.quadraticCurveTo(10, -38, 16, -32); g.stroke();
  g.restore();
}

function frog(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const puff = 0.6 + 0.4 * Math.max(0, Math.sin(t * 2.4 + s));
  const blink = blip(t, 3.4, 0.2, s);
  g.translate(0, 6);
  ell(g, -34, 36, 18, 10); fs(g, '#5cc257'); ell(g, 34, 36, 18, 10); fs(g, '#5cc257');
  ell(g, 0, 18, 46, 30); fs(g, '#74d66a');
  ell(g, 0, 28, 28, 16); fill(g, '#c8f2a0');
  ell(g, 0, 34, 16 * puff, 10 * puff); fs(g, '#e9ffd0');
  for (const sd of [-1, 1]) {
    circ(g, sd * 22, -16, 16); fs(g, '#74d66a');
    circ(g, sd * 22, -16, 10); fill(g, '#ffffff');
    if (blink > 0.5) { ell(g, sd * 22, -16, 12, 10); fill(g, '#5cc257'); g.beginPath(); g.moveTo(sd * 22 - 9, -16); g.lineTo(sd * 22 + 9, -16); g.stroke(); }
    else { circ(g, sd * 22 + 2, -15, 5); fill(g, NAVY); circ(g, sd * 22, -17, 2); fill(g, '#ffffff'); }
  }
  g.beginPath(); g.moveTo(-20, 8); g.quadraticCurveTo(0, 20, 20, 8); g.stroke();
  circ(g, -30, 6, 5); fill(g, 'rgba(255,120,170,0.4)'); circ(g, 30, 6, 5); fill(g, 'rgba(255,120,170,0.4)');
}

function owl(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const blink = blip(t, 3.2, 0.22, s);
  const tilt = Math.sin(t * 0.7 + s) * 0.12;
  g.translate(0, 6);
  // wings
  ell(g, -36, 14, 12, 28, 0.25); fs(g, '#6f4fb0'); ell(g, 36, 14, 12, 28, -0.25); fs(g, '#6f4fb0');
  ell(g, 0, 10, 38, 44); fs(g, '#8e6bc7');
  ell(g, 0, 22, 24, 26); fill(g, '#dccbf7');
  g.save(); g.lineWidth *= 0.7;
  for (const [vx, vy] of [[-8, 16], [8, 16], [0, 26], [-10, 34], [10, 34]]) { g.beginPath(); g.moveTo(vx - 4, vy); g.lineTo(vx, vy + 4); g.lineTo(vx + 4, vy); g.stroke(); }
  g.restore();
  g.save(); g.rotate(tilt);
  g.beginPath(); g.moveTo(-30, -18); g.lineTo(-34, -44); g.lineTo(-14, -30); g.closePath(); fs(g, '#8e6bc7');
  g.beginPath(); g.moveTo(30, -18); g.lineTo(34, -44); g.lineTo(14, -30); g.closePath(); fs(g, '#8e6bc7');
  for (const sd of [-1, 1]) {
    circ(g, sd * 15, -12, 15); fs(g, '#ffd27a');
    circ(g, sd * 15, -12, 10); fill(g, '#ffffff');
    if (blink > 0.5) { circ(g, sd * 15, -12, 11); fill(g, '#8e6bc7'); g.beginPath(); g.moveTo(sd * 15 - 9, -11); g.quadraticCurveTo(sd * 15, -6, sd * 15 + 9, -11); g.stroke(); }
    else { circ(g, sd * 15 + 1, -11, 5.5); fill(g, NAVY); circ(g, sd * 15 - 1, -13, 2); fill(g, '#ffffff'); }
  }
  g.beginPath(); g.moveTo(-5, -2); g.lineTo(5, -2); g.lineTo(0, 7); g.closePath(); fs(g, '#ffa53a');
  g.restore();
  g.beginPath(); g.moveTo(-10, 54); g.lineTo(-10, 48); g.moveTo(10, 54); g.lineTo(10, 48); g.stroke();
}

function firefly(g, h, t, o) {
  unit(g, h);
  ell(g, -18, -18, 16, 10, -0.6); g.save(); g.globalAlpha *= 0.75; fs(g, '#eef6ff'); g.restore();
  ell(g, 6, -20, 16, 10, 0.6); g.save(); g.globalAlpha *= 0.75; fs(g, '#eef6ff'); g.restore();
  ell(g, -6, 16, 18, 22); fs(g, '#ffe14d');
  circ(g, -4, -8, 16); fs(g, '#3b2a55');
  eye(g, 2, -10, 3.5, 0);
}
// Soft pulsing glow drawn under/over a firefly (art or drawn).
function fireflyGlow(g, h, t, o) {
  const s = o.seed || 0;
  const k = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 2.1 + s)), 3);
  const r = h * (0.7 + 0.35 * k);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= 0.85 * k;
  const gr = g.createRadialGradient(0, h * 0.18, 0, 0, h * 0.18, r);
  gr.addColorStop(0, 'rgba(255,240,120,0.95)'); gr.addColorStop(0.4, 'rgba(255,220,80,0.45)'); gr.addColorStop(1, 'rgba(255,220,80,0)');
  g.fillStyle = gr; g.fillRect(-r, h * 0.18 - r, r * 2, r * 2);
  g.restore();
}

// Fox's lost scarf: an orange-and-cream striped band with fringe.
function scarf(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const fl = Math.sin(t * 2.4 + s) * 6;
  const P = (u) => {
    const a = [-62, -18], b = [-24, -58], c = [16, 46], d = [60 + fl * 0.3, 18 + fl];
    const v = 1 - u;
    return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]];
  };
  const N = 24, wd = 13;
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = P(u), q = P(Math.min(1, u + 0.01)), q0 = P(Math.max(0, u - 0.01));
    const dx = q[0] - q0[0], dy = q[1] - q0[1], m = Math.hypot(dx, dy) || 1;
    L.push([p[0] - dy / m * wd, p[1] + dx / m * wd]); R.push([p[0] + dy / m * wd, p[1] - dx / m * wd]);
  }
  // fringe
  g.save(); g.lineWidth *= 0.8; g.strokeStyle = '#ff7a2a';
  for (const [i, sgn] of [[0, -1], [N, 1]]) {
    const a = L[i], b = R[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const nx = (i === 0 ? -1 : 1) * -dy, ny = (i === 0 ? -1 : 1) * dx, m = Math.hypot(nx, ny) || 1;
    for (let k = 0; k <= 4; k++) {
      const x = a[0] + dx * k / 4, y = a[1] + dy * k / 4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + nx / m * 12 * sgn * sgn, y + ny / m * 12); g.stroke();
    }
  }
  g.restore();
  for (let i = 0; i < N; i++) {
    g.beginPath(); g.moveTo(...L[i]); g.lineTo(...L[i + 1]); g.lineTo(...R[i + 1]); g.lineTo(...R[i]); g.closePath();
    g.fillStyle = Math.floor(i / 3) % 2 ? '#fff1dc' : '#ff7a2a'; g.fill();
    g.strokeStyle = g.fillStyle; g.save(); g.lineWidth = 1; g.stroke(); g.restore();
  }
  g.strokeStyle = NAVY;
  g.beginPath(); L.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); for (let i = N; i >= 0; i--) g.lineTo(...R[i]); g.closePath(); g.stroke();
}

function teddy(g, h, t, o) {
  unit(g, h);
  const s = o.seed || 0;
  const wave = blip(t, 4.4, 0.6, s) * 0.6;
  const c = '#c98b5a', d = '#e8bf91';
  g.translate(0, 4);
  circ(g, -24, -34, 12); fs(g, c); circ(g, 24, -34, 12); fs(g, c);
  circ(g, -24, -34, 6); fill(g, d); circ(g, 24, -34, 6); fill(g, d);
  ell(g, -18, 40, 14, 11); fs(g, c); ell(g, 18, 40, 14, 11); fs(g, c);
  ell(g, 0, 22, 28, 24); fs(g, c); ell(g, 0, 26, 16, 14); fill(g, d);
  ell(g, -30, 16, 9, 15, 0.4); fs(g, c);
  g.save(); g.translate(28, 10); g.rotate(-0.4 - wave); ell(g, 0, 4, 9, 15); fs(g, c); g.restore();
  circ(g, 0, -16, 26); fs(g, c);
  ell(g, 0, -8, 12, 9); fs(g, d);
  ell(g, 0, -11, 5, 3.5); fill(g, NAVY);
  eye(g, -10, -20, 4, blip(t, 5, 0.15, s)); eye(g, 10, -20, 4, blip(t, 5, 0.15, s));
  g.beginPath(); g.moveTo(-6, 4); g.lineTo(6, 4); g.lineTo(0, 10); g.closePath(); fs(g, '#ff6fb1');
}

const BLOCK = [['#ff6b8b', '#ffd23f'], ['#5aaef5', '#ff9f1c'], ['#7fe08a', '#b36bff']];
function block(g, h, t, o) {
  unit(g, h);
  const [c1, c2] = BLOCK[(o.variant || 0) % BLOCK.length];
  g.beginPath(); g.moveTo(-38, -24); g.lineTo(-16, -44); g.lineTo(44, -44); g.lineTo(22, -24); g.closePath(); fs(g, shade(c1, 0.25));
  g.beginPath(); g.moveTo(22, -24); g.lineTo(44, -44); g.lineTo(44, 22); g.lineTo(22, 44); g.closePath(); fs(g, shade(c1, -0.2));
  g.beginPath(); g.rect(-38, -24, 60, 68); fs(g, c1);
  g.save(); g.translate(-8, 10); starPath(g, 22, 0.48); fs(g, c2); g.restore();
}

function ball(g, h, t, o) {
  unit(g, h);
  const r = 46;
  g.save(); g.rotate(t * 0.4 + (o.seed || 0));
  const cols = ['#ff4d6d', '#ffffff', '#3fa7ff', '#ffffff', '#ffd23f', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, i * TAU / 6, (i + 1) * TAU / 6); g.closePath(); fill(g, cols[i]);
  }
  g.restore();
  circ(g, 0, 0, r); g.stroke();
  circ(g, 0, 0, 9); fs(g, '#ffffff');
  shine(g, -20, -22, 12, 7);
}

// --- object fallbacks (art normally covers these) -----------------------------------
function cupcake(gold) {
  return (g, h) => {
    unit(g, h);
    g.beginPath(); g.moveTo(-30, 4); g.lineTo(30, 4); g.lineTo(22, 46); g.lineTo(-22, 46); g.closePath(); fs(g, gold ? '#f2b705' : '#ff9fc6');
    for (let x = -18; x <= 18; x += 12) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x * 0.8, 44); g.stroke(); }
    g.beginPath(); g.moveTo(-36, 6); g.quadraticCurveTo(-40, -18, -14, -22); g.quadraticCurveTo(0, -46, 16, -24); g.quadraticCurveTo(40, -18, 36, 6); g.closePath(); fs(g, gold ? '#ffd84d' : '#fff0f6');
    if (gold) { g.save(); g.translate(0, -38); starPath(g, 14, 0.45); fs(g, '#ffe680'); g.restore(); } else { circ(g, 0, -34, 9); fs(g, '#ff3b4e'); }
  };
}
function gemShape(color) {
  return (g, h) => {
    unit(g, h);
    g.beginPath(); g.moveTo(0, -48); g.lineTo(34, -12); g.lineTo(0, 48); g.lineTo(-34, -12); g.closePath(); fs(g, color);
    g.beginPath(); g.moveTo(-34, -12); g.lineTo(34, -12); g.moveTo(0, -48); g.lineTo(-12, -12); g.lineTo(0, 48); g.lineTo(12, -12); g.closePath(); g.stroke();
    shine(g, -10, -26, 6, 10, 0.5);
  };
}
function starThing(g, h) { unit(g, h); starPath(g, 48, 0.48); fs(g, '#ffd23f'); shine(g, -10, -14, 7, 4); }
function duck(g, h) {
  unit(g, h);
  ell(g, -4, 18, 44, 26); fs(g, '#ffd93d');
  circ(g, 22, -18, 22); fs(g, '#ffd93d');
  g.beginPath(); g.moveTo(40, -16); g.quadraticCurveTo(58, -14, 52, -6); g.quadraticCurveTo(44, -4, 40, -8); g.closePath(); fs(g, '#ff9f1c');
  eye(g, 26, -22, 4, 0);
  g.save(); g.translate(-10, 14); g.rotate(-0.3); ell(g, 0, 0, 18, 10); fs(g, '#ffc61a'); g.restore();
}
function strawberry(g, h) {
  unit(g, h);
  g.beginPath(); g.moveTo(0, 46); g.bezierCurveTo(-46, 10, -40, -30, 0, -26); g.bezierCurveTo(40, -30, 46, 10, 0, 46); fs(g, '#ff3b4e');
  for (const [x, y] of [[-14, -8], [10, -12], [0, 8], [-18, 14], [16, 10], [0, 26]]) { ell(g, x, y, 2.5, 4); fill(g, '#ffe680'); }
  g.beginPath(); g.moveTo(-22, -28); g.lineTo(0, -40); g.lineTo(22, -28); g.lineTo(8, -24); g.lineTo(0, -32); g.lineTo(-8, -24); g.closePath(); fs(g, '#4cc95a');
}
function crown(color, jewel) {
  return (g, h) => {
    unit(g, h);
    g.beginPath(); g.moveTo(-46, 30); g.lineTo(-50, -26); g.lineTo(-24, 0); g.lineTo(0, -36); g.lineTo(24, 0); g.lineTo(50, -26); g.lineTo(46, 30); g.closePath(); fs(g, color);
    circ(g, 0, 14, 8); fs(g, jewel); circ(g, -28, 16, 6); fs(g, '#7fd3ff'); circ(g, 28, 16, 6); fs(g, '#7fe08a');
  };
}
function wand(g, h) {
  unit(g, h);
  g.save(); g.rotate(0.25);
  g.beginPath(); g.rect(-5, -14, 10, 62); fs(g, '#b36bff');
  g.translate(0, -30); starPath(g, 22, 0.48); fs(g, '#ffd23f');
  g.restore();
}
function lollipop(g, h) {
  unit(g, h);
  g.beginPath(); g.rect(-3, 0, 6, 50); fs(g, '#ffffff');
  circ(g, 0, -18, 28); fs(g, '#ff6fb1');
  g.save(); g.strokeStyle = '#ffffff'; g.beginPath(); for (let a = 0; a < 12; a += 0.25) { const r = a * 2.2; g.lineTo(Math.cos(a) * r, -18 + Math.sin(a) * r); } g.stroke(); g.restore();
}
function donut(g, h) {
  unit(g, h);
  circ(g, 0, 0, 44); fs(g, '#e7a35f');
  g.beginPath(); for (let a = 0; a <= TAU + 0.01; a += TAU / 16) { const r = 38 + (Math.round(a / (TAU / 16)) % 2 ? 4 : -2); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); fs(g, '#ff8fc7');
  circ(g, 0, 0, 13); fs(g, '#fff8ec');
}
function letter(g, h) {
  unit(g, h);
  g.beginPath(); g.rect(-34, -22, 68, 46); fs(g, '#fff4e0');
  g.beginPath(); g.moveTo(-34, -22); g.lineTo(0, 6); g.lineTo(34, -22); g.stroke();
  circ(g, 0, 6, 8); fs(g, '#ff4d6d');
  for (const sd of [-1, 1]) { g.save(); g.scale(sd, 1); ell(g, 46, -14, 16, 9, -0.5); fs(g, '#ffffff'); g.restore(); }
}
function present(g, h) {
  unit(g, h);
  g.beginPath(); g.rect(-40, -16, 80, 60); fs(g, '#ff8fc7');
  g.beginPath(); g.rect(-44, -28, 88, 16); fs(g, '#ff6fb1');
  g.beginPath(); g.rect(-6, -28, 12, 72); fs(g, '#ffd23f');
  ell(g, -14, -36, 14, 9, 0.3); fs(g, '#ffd23f'); ell(g, 14, -36, 14, 9, -0.3); fs(g, '#ffd23f');
}
function lantern(g, h) {
  unit(g, h);
  g.beginPath(); g.arc(0, -40, 10, Math.PI, TAU); g.stroke();
  g.beginPath(); g.rect(-20, -34, 40, 8); fs(g, '#d9a400');
  ell(g, 0, 0, 24, 30); fs(g, '#fff3b0');
  circ(g, 0, 4, 10); fill(g, '#ffb703');
  g.beginPath(); g.rect(-20, 28, 40, 10); fs(g, '#d9a400');
}
function potion(g, h) {
  unit(g, h);
  g.beginPath(); g.rect(-9, -46, 18, 14); fs(g, '#c98b5a');
  g.beginPath(); g.moveTo(-10, -34); g.lineTo(10, -34); g.lineTo(10, -16); g.arc(0, 12, 34, -1.27, Math.PI + 1.27); g.closePath(); fs(g, '#d9ccff');
  g.save(); g.beginPath(); g.arc(0, 12, 30, 0.3, Math.PI - 0.3); g.closePath(); fill(g, '#b36bff'); g.restore();
  shine(g, -14, 0, 6, 12, 0.2);
}
function crystal(g, h) {
  unit(g, h);
  for (const [x, rot, s] of [[-18, -0.35, 0.7], [18, 0.35, 0.75], [0, 0, 1]]) {
    g.save(); g.translate(x, 30); g.rotate(rot); g.scale(s, s);
    g.beginPath(); g.moveTo(0, -78); g.lineTo(16, -56); g.lineTo(14, 0); g.lineTo(-14, 0); g.lineTo(-16, -56); g.closePath(); fs(g, '#bfe8ff');
    g.restore();
  }
}
function fairyThing(color) {
  return (g, h, t) => {
    unit(g, h);
    const f = 0.5 + 0.5 * Math.abs(Math.sin(t * 9));
    g.save(); g.globalAlpha *= 0.8;
    for (const sd of [-1, 1]) { g.save(); g.scale(sd * f, 1); ell(g, 22, -10, 22, 14, -0.4); fs(g, '#e9f8ff'); g.restore(); }
    g.restore();
    g.beginPath(); g.moveTo(0, -6); g.lineTo(-16, 40); g.lineTo(16, 40); g.closePath(); fs(g, color);
    circ(g, 0, -18, 14); fs(g, '#ffd9b8');
    eye(g, -5, -18, 2.5, 0); eye(g, 5, -18, 2.5, 0);
  };
}
function cookie(g, h) {
  unit(g, h);
  circ(g, 0, 0, 44); fs(g, '#e0a76a');
  for (const [x, y] of [[-14, -16], [12, -8], [-4, 14], [20, 18], [-22, 8]]) { circ(g, x, y, 6); fill(g, '#5b3a29'); }
}
function glowShroom(g, h) {
  unit(g, h);
  g.beginPath(); g.rect(-10, 0, 20, 44); fs(g, '#fff4e6');
  g.beginPath(); g.moveTo(-44, 6); g.quadraticCurveTo(-40, -44, 0, -44); g.quadraticCurveTo(40, -44, 44, 6); g.closePath(); fs(g, '#9b7bff');
  for (const [x, y, r] of [[-20, -16, 7], [10, -28, 6], [24, -6, 5]]) { circ(g, x, y, r); fill(g, '#9ff3ff'); }
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  if (k > 0) { r += (255 - r) * k; gg += (255 - gg) * k; b += (255 - b) * k; } else { r *= 1 + k; gg *= 1 + k; b *= 1 + k; }
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}

// --- registry ---------------------------------------------------------------------
// h: height in the scene (px). aspect: width / height for drawn versions.
// where: spot tags it may hide in (see scenes.js). art: existing/optional key(s)
// (variant picks one). anim: transform animation applied to art versions.
// sound: recorded sfx played when found (fallback to a synth).
const SHINY = { glint: true };
export const THINGS = {
  ladybug:     { h: 28, aspect: 1.35, draw: ladybug, art: 'prop/seek-ladybug', anim: 'wobble', variants: 3, where: ['ground', 'perch', 'small'], sound: 'tiny-squeak' },
  bunny:       { h: 74, aspect: 0.72, draw: bunny, art: 'prop/seek-bunny', anim: 'twitch', variants: 3, where: ['ground', 'peek'], sound: 'boing' },
  butterfly:   { h: 40, aspect: 1.25, draw: butterfly, art: 'prop/seek-butterfly', anim: 'flap', variants: 3, where: ['air', 'perch', 'ground', 'tree', 'small'], sound: 'wing-twinkle' },
  snail:       { h: 36, aspect: 1.45, draw: snail, art: 'prop/seek-snail', anim: 'wobble', variants: 3, where: ['perch', 'ground', 'small'], sound: 'tiny-squeak' },
  mouse:       { h: 36, aspect: 1.5, draw: mouse, art: 'prop/seek-mouse', anim: 'twitch', variants: 3, where: ['ground', 'shelf', 'hole', 'small'], sound: 'tiny-squeak' },
  bird:        { h: 44, aspect: 1.15, draw: bird, art: 'prop/seek-bird', anim: 'hop', variants: 3, where: ['tree', 'perch'], sound: 'wing-twinkle' },
  frog:        { h: 42, aspect: 1.2, draw: frog, art: 'prop/seek-frog', anim: 'hop', where: ['water', 'ground', 'perch'], sound: 'boing' },
  owl:         { h: 58, aspect: 0.9, draw: owl, art: 'prop/seek-owl', anim: 'blink', where: ['tree', 'hole'], sound: 'npc/hoot/hoo' },
  firefly:     { h: 30, aspect: 1.0, draw: firefly, art: 'prop/firefly', anim: 'float', glow: fireflyGlow, where: ['air', 'ground', 'tree', 'perch', 'water', 'small'], sound: 'firefly-catch' },
  scarf:       { h: 46, aspect: 1.45, draw: scarf, art: 'prop/seek-scarf', anim: 'sway', where: ['ground', 'tree', 'basket'], sound: 'wing-twinkle', owner: 'fox' },
  teddy:       { h: 62, aspect: 0.9, draw: teddy, art: 'prop/seek-teddy', anim: 'sway', where: ['ground', 'shelf', 'peek'], sound: 'squeak' },
  block:       { h: 40, aspect: 1.0, draw: block, art: 'prop/seek-block', variants: 3, where: ['ground', 'shelf', 'perch'], sound: 'stamp' },
  ball:        { h: 44, aspect: 1.0, draw: ball, art: 'prop/seek-ball', where: ['ground', 'shelf'], sound: 'rubber-bounce' },
  goldcupcake: { h: 52, aspect: 1.0, draw: cupcake(true), art: 'prop/golden-cupcake', ...SHINY, where: ['perch', 'ground', 'basket', 'shelf'], sound: 'golden-chime' },
  cupcake:     { h: 50, aspect: 0.93, draw: cupcake(false), art: 'prop/treat-cupcake', where: ['perch', 'ground', 'basket'], sound: 'munch' },
  strawberry:  { h: 30, aspect: 1.0, draw: strawberry, art: 'prop/topper-strawberry', where: ['perch', 'ground', 'basket', 'small'], sound: 'pop' },
  duck:        { h: 42, aspect: 1.0, draw: duck, art: 'prop/rubber-duck', anim: 'bob', where: ['water', 'shelf', 'ground'], sound: 'squeak' },
  gem:         { h: 32, aspect: 0.9, draw: gemShape('#3fa7ff'), art: ['prop/gem-blue', 'prop/gem-purple', 'prop/gem-green'], variants: 3, ...SHINY, where: ['ground', 'perch', 'shelf', 'small', 'hole'], sound: 'golden-chime' },
  star:        { h: 40, aspect: 0.9, draw: starThing, art: 'prop/topper-star', ...SHINY, where: ['air', 'ground', 'tree', 'perch', 'shelf', 'small'], sound: 'star' },
  crown:       { h: 40, aspect: 1.4, draw: crown('#ffd23f', '#ff4d6d'), art: 'prop/crown-gold', ...SHINY, where: ['ground', 'shelf', 'perch'], sound: 'golden-chime' },
  tiara:       { h: 32, aspect: 1.45, draw: crown('#e8ecff', '#ff6fb1'), art: 'prop/tiara-star', ...SHINY, where: ['ground', 'shelf', 'perch'], sound: 'golden-chime' },
  wand:        { h: 62, aspect: 0.5, draw: wand, art: 'prop/wand-star', ...SHINY, where: ['ground', 'shelf', 'tree'], sound: 'sparkle-beam' },
  lollipop:    { h: 50, aspect: 0.67, draw: lollipop, art: 'prop/treat-lollipop', where: ['ground', 'basket', 'shelf'], sound: 'pop' },
  donut:       { h: 40, aspect: 1.08, draw: donut, art: 'prop/treat-donut', where: ['ground', 'basket', 'perch', 'shelf'], sound: 'munch' },
  letter:      { h: 40, aspect: 1.48, draw: letter, art: 'prop/owl-mail', anim: 'flap', where: ['air', 'tree', 'ground', 'shelf'], sound: 'wing-twinkle' },
  present:     { h: 50, aspect: 1.04, draw: present, art: 'prop/present', where: ['ground', 'shelf'], sound: 'pop' },
  lantern:     { h: 56, aspect: 0.64, draw: lantern, art: 'prop/lantern-on', anim: 'sway', where: ['ground', 'tree'], sound: 'golden-chime', glowColor: 'rgba(255,214,110,' },
  potion:      { h: 52, aspect: 0.76, draw: potion, art: 'prop/potion-bottle', ...SHINY, where: ['ground', 'shelf', 'hole'], sound: 'bubble' },
  crystal:     { h: 44, aspect: 1.0, draw: crystal, art: 'prop/ing-snow-crystal', ...SHINY, where: ['ground', 'perch', 'tree'], sound: 'sparkle-beam' },
  fairy:       { h: 56, aspect: 0.7, draw: fairyThing('#ff8fd0'), art: ['prop/fairy-pink', 'prop/fairy-blue', 'prop/fairy-yellow'], variants: 3, anim: 'float', where: ['air', 'tree', 'ground', 'perch'], sound: 'npc/fairy/chime' },
  cookie:      { h: 40, aspect: 1.0, draw: cookie, art: 'prop/cookie-1', where: ['perch', 'basket', 'ground'], sound: 'munch' },
  glowshroom:  { h: 44, aspect: 1.0, draw: glowShroom, art: 'prop/ing-glow-mushroom', where: ['ground', 'perch'], sound: 'sparkle-beam' },
  moondrop:    { h: 42, aspect: 1.0, draw: gemShape('#9fd4ff'), art: 'prop/ing-moon-drop', ...SHINY, where: ['ground', 'perch', 'water'], sound: 'water' },
};
export const SYNTH_FALLBACK = { 'tiny-squeak': 'pop', boing: 'bounce', 'wing-twinkle': 'sparkle', 'npc/hoot/hoo': 'correct', 'firefly-catch': 'sparkle', squeak: 'pop', stamp: 'stamp', 'rubber-bounce': 'bounce', 'golden-chime': 'star', munch: 'munch', pop: 'pop', star: 'star', 'sparkle-beam': 'magic', bubble: 'bubble', 'npc/fairy/chime': 'sparkle', water: 'water' };

const SELF_ANIMATED = new Set(['ladybug', 'bunny', 'butterfly', 'snail', 'mouse', 'bird', 'frog', 'owl', 'scarf', 'teddy', 'ball']);

function artKey(th, variant) {
  if (!th.art) return null;
  return Array.isArray(th.art) ? th.art[(variant || 0) % th.art.length] : th.art;
}

export function thingWidth(id, h, variant = 0) {
  const th = THINGS[id];
  const img = art(artKey(th, variant));
  return h * (img ? img.width / img.height : th.aspect);
}

/** Transform animation for art versions (and a little life for drawn objects). */
function animate(g, kind, h, t, s) {
  switch (kind) {
    case 'wobble': g.rotate(Math.sin(t * 2 + s) * 0.08); break;
    case 'twitch': { const k = blip(t, 3.2, 0.3, s); g.rotate(k * 0.12); g.scale(1, 1 + k * 0.05); break; }
    case 'flap': g.scale(0.75 + 0.25 * Math.abs(Math.cos(t * 3 + s)), 1); break;
    case 'hop': g.translate(0, -blip(t, 2.9, 0.35, s) * h * 0.18); break;
    case 'blink': g.scale(1, 1 - blip(t, 3.2, 0.2, s) * 0.06); break;
    case 'float': g.translate(Math.sin(t * 1.3 + s) * h * 0.06, Math.sin(t * 2.1 + s) * h * 0.08); break;
    case 'sway': g.rotate(Math.sin(t * 1.6 + s) * 0.07); break;
    case 'bob': g.translate(0, Math.sin(t * 2 + s) * h * 0.04); g.rotate(Math.sin(t * 1.4 + s) * 0.05); break;
    default: break;
  }
}

/**
 * Draw thing `id` centered on (x, y), `h` px tall.
 * o: { seed, variant, still (no animation), alpha }
 */
export function drawThing(g, id, x, y, h, t = 0, o = {}) {
  const th = THINGS[id];
  if (!th) return;
  const s = o.seed || 0, tt = o.still ? 0 : t;
  g.save();
  g.translate(x, y);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  if (th.glow && !o.mask) th.glow(g, h, tt, o);
  if (th.glowColor && !o.mask) {
    const k = 0.75 + 0.25 * Math.sin(tt * 7 + s) * Math.sin(tt * 3.1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, h * 0.9);
    gr.addColorStop(0, th.glowColor + (0.5 * k) + ')'); gr.addColorStop(1, th.glowColor + '0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, h * 0.9, 0, TAU); g.fill();
  }
  const img = art(artKey(th, o.variant));
  if (img) {
    if (th.anim && !o.still) animate(g, th.anim, h, tt, s);
    const w = h * img.width / img.height;
    g.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    // Drawn creatures animate their own parts; drawn objects get the transform.
    if (th.anim && !o.still && !SELF_ANIMATED.has(id)) animate(g, th.anim, h, tt, s);
    th.draw(g, h, tt, o);
  }
  g.restore();
  // Shiny things glint now and then (rewarding careful watchers).
  if (th.glint && !o.mask && !o.still) {
    const k = blip(t, 3.6, 0.5, s * 1.7);
    if (k > 0) {
      g.save(); g.translate(x + h * 0.28, y - h * 0.3); g.scale(k, k); g.rotate(t * 2);
      drawSparkleShape(g, h * 0.7, '#ffffff');
      g.restore();
    }
  }
}
