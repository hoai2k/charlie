// Rainbow Tug-of-War: procedural art. Every piece first asks for generated art
// (art()/drawArt(), keys listed in image-requests.md) and falls back to the
// vector drawing below, which is what ships today.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { clamp, TAU } from '../../engine/util.js';

export const NAVY = ui.NAVY;
export const TEAMS = [
  { name: 'Pink Team', color: '#ff5fa8', dark: '#c2347a', light: '#ffd0e6', side: -1, key: 'pink' },
  { name: 'Blue Team', color: '#3fa0ff', dark: '#1d6fc0', light: '#cfe8ff', side: 1, key: 'blue' },
];
export const JELLY = ['#ff6f9f', '#ffa24d', '#ffd84d', '#6fdc7a', '#56b8ff', '#a77bff'];

const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------------------
// Background: sunny meadow under a big rainbow.

let bgCache = null;
function bakeBackground(ground) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // sky
  const sky = g.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#7fcfff'); sky.addColorStop(0.7, '#c9eeff'); sky.addColorStop(1, '#e9f8ff');
  g.fillStyle = sky; g.fillRect(0, 0, W, ground + 10);
  // big soft rainbow behind everything
  const bands = ['#ff6f91', '#ffa04a', '#ffe066', '#7fe08a', '#5fbaff', '#a98bff'];
  g.save(); g.globalAlpha = 0.5;
  bands.forEach((col, i) => {
    g.strokeStyle = col; g.lineWidth = 46;
    g.beginPath(); g.arc(W / 2, ground + 120, 860 - i * 44, Math.PI, TAU); g.stroke();
  });
  g.restore();
  // sun glow top right
  const sun = g.createRadialGradient(1700, 300, 10, 1700, 300, 260);
  sun.addColorStop(0, 'rgba(255,250,210,0.95)'); sun.addColorStop(0.3, 'rgba(255,240,170,0.5)'); sun.addColorStop(1, 'rgba(255,240,170,0)');
  g.fillStyle = sun; g.fillRect(1400, 0, 520, 600);
  // hills
  ui.hills(g, ground - 150, '#b5ecb0', 50, 0.0032, 1.2);
  ui.hills(g, ground - 90, '#94de92', 36, 0.0045, 3.1);
  // trees on the far hills
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 225 + hh(i) * 80, y = ground - 120 + hh(i + 9) * 30, s = 0.7 + hh(i + 3) * 0.5;
    g.fillStyle = '#8a6a4a'; g.fillRect(x - 6 * s, y - 10 * s, 12 * s, 40 * s);
    g.fillStyle = ['#5fc46d', '#4fb763', '#6ccf74'][i % 3];
    g.beginPath(); g.arc(x, y - 30 * s, 34 * s, 0, TAU); g.arc(x - 24 * s, y - 14 * s, 24 * s, 0, TAU); g.arc(x + 24 * s, y - 14 * s, 24 * s, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(x - 10 * s, y - 44 * s, 12 * s, 0, TAU); g.fill();
  }
  // meadow
  const grass = g.createLinearGradient(0, ground - 70, 0, H);
  grass.addColorStop(0, '#8fe07f'); grass.addColorStop(1, '#4fb85c');
  g.fillStyle = grass;
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, ground - 70 + Math.sin(x * 0.004) * 8);
  g.lineTo(W, H); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 4;
  g.beginPath(); for (let x = 0; x <= W; x += 40) { const y = ground - 70 + Math.sin(x * 0.004) * 8; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
  // grass tufts and flowers
  for (let i = 0; i < 90; i++) {
    const x = hh(i * 3.1) * W, y = ground - 50 + hh(i * 7.7) * (H - ground + 40);
    if (Math.abs(x - W / 2) < 260 && Math.abs(y - ground - 15) < 70) continue; // the jelly puddle goes here
    if (i % 3) {
      g.strokeStyle = 'rgba(40,120,60,0.5)'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 9, y - 12); g.moveTo(x, y); g.lineTo(x, y - 16); g.moveTo(x + 6, y); g.lineTo(x + 10, y - 11); g.stroke();
    } else {
      const col = ['#ff8fc4', '#ffe066', '#ffffff', '#b9a0ff', '#7fd0ff'][i % 5];
      g.fillStyle = col;
      for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 0, TAU); g.fill(); }
      g.fillStyle = '#ffcf3a'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
    }
  }
  // bunting between two poles
  for (const px of [70, W - 70]) {
    g.fillStyle = '#fff4e0'; g.strokeStyle = NAVY; g.lineWidth = 5;
    ui.roundRect(g, px - 9, 380, 18, ground - 400, 8); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(px, 378, 15, 0, TAU); g.fill(); g.stroke();
  }
  const flags = 26;
  g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath();
  for (let i = 0; i <= 60; i++) { const u = i / 60, x = 70 + u * (W - 140), y = 400 + Math.sin(u * Math.PI) * 70; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  for (let i = 0; i < flags; i++) {
    const u = (i + 0.5) / flags, x = 70 + u * (W - 140), y = 400 + Math.sin(u * Math.PI) * 70;
    const col = u < 0.5 ? (i % 2 ? TEAMS[0].color : '#ffe066') : (i % 2 ? TEAMS[1].color : '#ffe066');
    g.fillStyle = col; g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x + 22, y); g.lineTo(x, y + 40); g.closePath(); g.fill(); g.stroke();
  }
  return c;
}

export function drawBackground(g, t, ground, clouds) {
  const bg = art('bg/tug-of-war');
  if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
  if (!bgCache) { try { bgCache = bakeBackground(ground); } catch (e) { bgCache = null; } }
  if (bgCache) g.drawImage(bgCache, 0, 0);
  else { ui.sky(g, '#7fcfff', '#e9f8ff'); g.fillStyle = '#7fd87a'; g.fillRect(0, ground - 70, W, H); }
  // drifting clouds (in front of the rainbow, behind the poles' bunting is fine)
  for (const c of clouds) {
    const x = ((c.x + t * c.v) % (W + 400)) - 200;
    ui.cloud(g, x, c.y, c.s, '#ffffff', 0.85);
  }
}

// ---------------------------------------------------------------------------
// Team picnic mats (the team zones) and goal flags.

export function drawMat(g, team, x0, x1, y, t) {
  const T = TEAMS[team];
  const key = `prop/tug-mat-${T.key}`;
  const w = x1 - x0, h = 92;
  if (drawArt(g, key, (x0 + x1) / 2, y + h / 2, w, h, { fit: 'stretch' })) return;
  g.save();
  const skew = 26 * T.side;
  g.beginPath();
  g.moveTo(x0 + skew, y); g.lineTo(x1 + skew, y); g.lineTo(x1 - skew * 0.2, y + h); g.lineTo(x0 - skew * 0.2, y + h); g.closePath();
  g.fillStyle = '#ffffff'; g.fill();
  g.save(); g.clip();
  // gingham
  g.globalAlpha = 0.55; g.fillStyle = T.color;
  for (let x = x0 - 60; x < x1 + 60; x += 48) g.fillRect(x, y, 24, h);
  for (let yy = y; yy < y + h; yy += 30) g.fillRect(x0 - 60, yy, w + 120, 15);
  g.restore();
  g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  // fringe
  g.strokeStyle = T.dark; g.lineWidth = 3;
  for (let x = x0 + 10; x < x1; x += 18) { g.beginPath(); g.moveTo(x - skew * 0.2, y + h + 1); g.lineTo(x - skew * 0.2, y + h + 9); g.stroke(); }
  g.restore();
}

export function drawGoalFlag(g, team, x, y, t, glow = 0) {
  const T = TEAMS[team];
  const key = `prop/tug-flag-${T.key}`;
  if (drawArt(g, key, x, y + 4, 110, 150, { anchor: 'bottom' })) return;
  g.save();
  g.translate(x, y);
  g.strokeStyle = NAVY; g.lineWidth = 4; g.fillStyle = '#fff4e0';
  ui.roundRect(g, -4, -128, 8, 128, 4); g.fill(); g.stroke();
  const wave = Math.sin(t * 4 + x) * 6, sd = T.side;
  g.beginPath();
  g.moveTo(0, -126);
  g.quadraticCurveTo(30 * sd, -136 + wave, 64 * sd, -112 + wave * 0.5);
  g.quadraticCurveTo(30 * sd, -96 - wave, 0, -98);
  g.closePath();
  g.fillStyle = T.color; g.fill(); g.stroke();
  if (glow > 0) { g.globalAlpha = glow; g.fillStyle = '#fff'; g.fill(); }
  g.restore();
}

// ---------------------------------------------------------------------------
// The rainbow jelly puddle. `wob` is a 0..1+ wobble amount (splashes).

export function drawPool(g, P, t, wob) {
  const k = Math.sin(t * 17) * wob;
  const rx = P.rx * (1 + 0.05 * k), ry = P.ry * (1 - 0.14 * k);
  const img = art('prop/tug-jelly-pool');
  if (img) {
    const dw = rx * 2.3, dh = dw * img.height / img.width;
    g.drawImage(img, P.x - dw / 2, P.y - dh / 2, dw, dh);
    return;
  }
  g.save();
  // rim shadow
  g.fillStyle = 'rgba(36,22,63,0.22)';
  g.beginPath(); g.ellipse(P.x, P.y + 10, rx + 16, ry + 12, 0, 0, TAU); g.fill();
  // rim (soft pink sugar crust)
  g.fillStyle = '#fff1f7'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.ellipse(P.x, P.y, rx + 14, ry + 9, 0, 0, TAU); g.fill(); g.stroke();
  // concentric jelly bands
  g.beginPath(); g.ellipse(P.x, P.y, rx, ry, 0, 0, TAU); g.save(); g.clip();
  JELLY.forEach((col, i) => {
    const s = 1 - i * 0.15;
    const sway = Math.sin(t * 2.2 + i) * 6 * (1 + wob * 3);
    g.fillStyle = col;
    g.beginPath(); g.ellipse(P.x + sway, P.y + 4 * i * (1 - 0.3 * k), rx * s * 1.05, ry * s * 1.1, 0, 0, TAU); g.fill();
  });
  // glossy highlights
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath(); g.ellipse(P.x - rx * 0.42, P.y - ry * 0.42, rx * 0.26, ry * 0.18, -0.12, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(P.x + rx * 0.35, P.y - ry * 0.5, rx * 0.12, ry * 0.1, 0.1, 0, TAU); g.fill();
  // tiny rising bubbles
  for (let i = 0; i < 7; i++) {
    const ph = (t * 0.6 + hh(i)) % 1;
    const bx = P.x + (hh(i + 4) - 0.5) * rx * 1.6, by = P.y + ry * 0.4 - ph * ry * 0.9;
    g.globalAlpha = Math.sin(ph * Math.PI) * 0.7;
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(bx, by, 4 + hh(i + 2) * 5, 0, TAU); g.stroke();
  }
  g.restore();
  g.globalAlpha = 1;
  g.lineWidth = 4; g.strokeStyle = 'rgba(36,22,63,0.55)';
  g.beginPath(); g.ellipse(P.x, P.y, rx, ry, 0, 0, TAU); g.stroke();
  g.restore();
}

/** Jelly ripple ring around something sitting in the puddle. */
export function drawRipple(g, x, y, w, t, col = '#ff9fc6') {
  g.save();
  g.fillStyle = col; g.globalAlpha = 0.85;
  g.beginPath(); g.ellipse(x, y, w, w * 0.24, 0, 0, TAU); g.fill();
  g.globalAlpha = 1; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3;
  g.beginPath(); g.ellipse(x, y, w * (1 + 0.08 * Math.sin(t * 6)), w * 0.24, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 2.5;
  g.beginPath(); g.ellipse(x, y, w, w * 0.24, 0, 0, TAU); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// The rainbow rope: a thick striped cord through the grip points.

const ROPE_STRIPES = ['#ff5f8f', '#ff9f43', '#ffd93d', '#5fd47a', '#4fb0ff', '#9d7bff'];

export function ropePath(g, pts) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const l = pts[pts.length - 1];
  g.lineTo(l.x, l.y);
}

export function drawRope(g, pts, t, thick = 16, shift = 0) {
  if (pts.length < 2) return;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  ropePath(g, pts);
  g.lineWidth = thick + 8; g.strokeStyle = NAVY; g.stroke();
  g.lineWidth = thick; g.strokeStyle = '#fff6fb'; g.stroke();
  const seg = thick * 0.9;
  g.lineCap = 'butt';
  g.setLineDash([seg, seg * (ROPE_STRIPES.length - 1)]);
  ROPE_STRIPES.forEach((c, i) => {
    g.lineDashOffset = -i * seg + shift;
    g.strokeStyle = c; g.lineWidth = thick; g.stroke();
  });
  g.setLineDash([]);
  // twist shading + highlight
  g.translate(0, -thick * 0.22);
  g.lineCap = 'round';
  g.lineWidth = thick * 0.22; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.stroke();
  g.restore();
}

/** Point on the rope polyline at x (linear between points). */
export function ropeYAt(pts, x) {
  if (!pts.length) return 0;
  if (x <= pts[0].x) return pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x) { const a = pts[i - 1], b = pts[i]; const u = (x - a.x) / Math.max(1, b.x - a.x); return a.y + (b.y - a.y) * u; }
  }
  return pts[pts.length - 1].y;
}

/** The centre marker: a big rainbow bow tied on the rope with a pennant. */
export function drawBow(g, x, y, t, sway = 0, s = 1) {
  // Measured knot at (148,89) in the 300px canvas: pin it to the rope.
  if (drawArt(g, 'prop/tug-bow', x + s, y + 30.5 * s, 150 * s, 150 * s)) return;
  g.save();
  g.translate(x, y); g.scale(s, s);
  g.rotate(sway * 0.4);
  // pennant hanging below
  g.save(); g.rotate(Math.sin(t * 3) * 0.08 + sway * 0.5);
  const bands = ['#ff5f8f', '#ffd93d', '#4fb0ff'];
  bands.forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath(); g.moveTo(-22 + i * 14.7, 6); g.lineTo(-22 + (i + 1) * 14.7, 6); g.lineTo(0, 86); g.closePath(); g.fill();
  });
  g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(-22, 6); g.lineTo(22, 6); g.lineTo(0, 86); g.closePath(); g.stroke();
  g.restore();
  // bow loops
  for (const sd of [-1, 1]) {
    g.save(); g.scale(sd, 1);
    g.fillStyle = '#ff6fb1'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(22, -40, 64, -26, 54, 4); g.bezierCurveTo(48, 26, 18, 16, 0, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(32, -12, 12, 6, -0.4, 0, TAU); g.fill();
    // tails
    g.fillStyle = '#ff4d93';
    g.beginPath(); g.moveTo(4, 6); g.lineTo(30, 46); g.lineTo(20, 40); g.lineTo(14, 52); g.lineTo(-2, 10); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 5;
  g.beginPath(); g.arc(0, 2, 13, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// Banana peel (slips one team).

export function drawBanana(g, x, y, rot, s = 1) {
  g.save();
  g.translate(x, y);
  g.fillStyle = 'rgba(36,22,63,0.22)'; g.beginPath(); g.ellipse(0, 4, 46 * s, 10 * s, 0, 0, TAU); g.fill();
  g.rotate(rot);
  if (drawArt(g, 'prop/tug-banana', 0, -18 * s, 110 * s, 80 * s)) { g.restore(); return; }
  g.scale(s, s);
  g.strokeStyle = NAVY; g.lineWidth = 4; g.lineJoin = 'round';
  // three floppy peel petals
  const petal = (a, len, col) => {
    g.save(); g.rotate(a);
    g.fillStyle = col;
    g.beginPath(); g.moveTo(-10, -6); g.quadraticCurveTo(-18, -len * 0.6, -4, -len); g.quadraticCurveTo(14, -len * 0.6, 10, -6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-3, -len * 0.55, 3, len * 0.22, 0, 0, TAU); g.fill();
    g.restore();
  };
  petal(-1.25, 44, '#ffe14d');
  petal(1.2, 42, '#ffd23f');
  petal(0.05, 34, '#ffe97a');
  // stem
  g.fillStyle = '#8a6a3a'; ui.roundRect(g, -6, -10, 12, 14, 4); g.fill(); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// HUD beat heart: pulses on the beat; a ring shrinks onto it.

export function drawBeatHeart(g, x, y, r, pulse, approach, o = {}) {
  g.save();
  g.translate(x, y);
  // approach ring
  if (approach !== null) {
    const rr = r * (1 + 1.7 * approach);
    g.globalAlpha = clamp(1.25 - approach, 0, 1) * (o.dim ? 0.4 : 1);
    g.lineWidth = 10; g.strokeStyle = NAVY;
    g.beginPath(); g.arc(0, 2, rr, 0, TAU); g.stroke();
    g.lineWidth = 6; g.strokeStyle = o.ringColor || '#ffffff';
    g.beginPath(); g.arc(0, 2, rr, 0, TAU); g.stroke();
    g.globalAlpha = 1;
  }
  // target ring
  g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.setLineDash([10, 8]); g.beginPath(); g.arc(0, 2, r * 1.02, 0, TAU); g.stroke(); g.setLineDash([]);
  const k = 1 + pulse * 0.28;
  g.scale(k, k);
  if (pulse > 0.05) {
    const glow = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.9);
    glow.addColorStop(0, `rgba(255,240,140,${0.6 * pulse})`); glow.addColorStop(1, 'rgba(255,240,140,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, 0, r * 1.9, 0, TAU); g.fill();
  }
  if (!drawArt(g, 'prop/tug-beat-heart', 0, 0, r * 2.1, r * 2.1)) {
    const s = r / 50;
    g.scale(s, s);
    g.beginPath();
    g.moveTo(0, 44);
    g.bezierCurveTo(-58, 6, -54, -40, -24, -42);
    g.bezierCurveTo(-10, -43, -2, -32, 0, -24);
    g.bezierCurveTo(2, -32, 10, -43, 24, -42);
    g.bezierCurveTo(54, -40, 58, 6, 0, 44);
    g.closePath();
    const gr = g.createLinearGradient(0, -44, 0, 44);
    gr.addColorStop(0, '#ff8cc6'); gr.addColorStop(1, '#e8337f');
    g.fillStyle = gr; g.fill();
    g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.beginPath(); g.ellipse(-22, -22, 9, 13, -0.6, 0, TAU); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// Thumbnail.

export function drawIcon(g, x, y, w, h, t) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const sky = g.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#7fcfff'); sky.addColorStop(1, '#e4f6ff');
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  const bands = ['#ff6f91', '#ffa04a', '#ffe066', '#7fe08a', '#5fbaff', '#a98bff'];
  g.save(); g.globalAlpha = 0.6;
  bands.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = h * 0.05; g.beginPath(); g.arc(x + w / 2, y + h * 0.95, h * (0.72 - i * 0.05), Math.PI, TAU); g.stroke(); });
  g.restore();
  g.fillStyle = '#7fd87a'; g.fillRect(x, y + h * 0.7, w, h * 0.3);
  // puddle
  const P = { x: x + w / 2, y: y + h * 0.82, rx: w * 0.13, ry: h * 0.06 };
  JELLY.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.ellipse(P.x, P.y + i * h * 0.004, P.rx * (1 - i * 0.14), P.ry * (1 - i * 0.14), 0, 0, TAU); g.fill(); });
  g.strokeStyle = NAVY; g.lineWidth = h * 0.012; g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.stroke();
  // two teams of blobs
  const tug = Math.sin(t * 2.4) * w * 0.02;
  const blob = (bx, by, col, face) => {
    g.save(); g.translate(bx, by); g.rotate(-face * 0.28);
    g.strokeStyle = NAVY; g.lineWidth = h * 0.012;
    // feet dug in
    g.fillStyle = col;
    for (const fx2 of [-0.04, 0.035]) { g.beginPath(); g.ellipse(fx2 * h - face * h * 0.01, -h * 0.005, h * 0.03, h * 0.016, 0, 0, TAU); g.fill(); g.stroke(); }
    g.beginPath(); g.ellipse(0, -h * 0.1, h * 0.075, h * 0.095, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-face * h * 0.03, -h * 0.15, h * 0.015, h * 0.025, -0.4, 0, TAU); g.fill();
    // eyes, cheeks, determined grin
    for (const ex of [0.012, 0.045]) {
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(face * ex * h, -h * 0.15, h * 0.011, h * 0.016, 0, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(face * h * 0.06, -h * 0.125, h * 0.011, 0, TAU); g.fill();
    g.beginPath(); g.arc(face * h * 0.03, -h * 0.13, h * 0.016, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.restore();
  };
  const pts = [];
  for (let i = 0; i < 2; i++) {
    const bx = x + w * (0.3 - i * 0.14) + tug, by = y + h * 0.84;
    blob(bx, by, TEAMS[0].color, 1);
    pts.unshift({ x: bx + h * 0.06, y: by - h * 0.05 });
  }
  const left = pts.slice();
  const right = [];
  for (let i = 0; i < 2; i++) {
    const bx = x + w * (0.7 + i * 0.14) + tug, by = y + h * 0.84;
    blob(bx, by, TEAMS[1].color, -1);
    right.push({ x: bx - h * 0.06, y: by - h * 0.05 });
  }
  const all = [{ x: x - 10, y: left[0].y + 8 }, ...left, { x: x + w / 2 + tug, y: y + h * 0.77 }, ...right, { x: x + w + 10, y: right[1].y + 8 }];
  drawRope(g, all, t, h * 0.03, -t * 30);
  drawBow(g, x + w / 2 + tug, y + h * 0.77, t, 0, h / 900);
  // title-ish heart beat
  const pulse = Math.max(0, 1 - ((t * 1.1) % 1) * 3);
  drawBeatHeart(g, x + w / 2, y + h * 0.3, h * 0.1, pulse, null);
  g.restore();
}
