// Balloon Float drawing kit: procedural fallbacks for every art key the game
// asks for (see the header of ../balloon-float.js).
import * as ui from '../../engine/ui.js';
import { drawStarShape, drawHeartShape, drawSparkleShape } from '../../engine/emotes.js';
import { drawArt, art } from '../../engine/art.js';
import { TAU } from '../../engine/util.js';
import { drawMirroredScroll } from '../../engine/scroll-art.js';

const NAVY = '#24163f';
export const BALLOONS = [
  { key: 'prop/balloon-float-balloon-pink', c: '#ff7ac6', d: '#e0509f' },
  { key: 'prop/balloon-float-balloon-blue', c: '#5ec2ff', d: '#2f93d6' },
  { key: 'prop/balloon-float-balloon-yellow', c: '#ffdc4a', d: '#e0ac10' },
  { key: 'prop/balloon-mint', c: '#5fe3a8', d: '#2bb57a' },
  { key: 'prop/balloon-float-balloon-purple', c: '#b48bff', d: '#8558e0' },
];

/** One balloon, origin at its knot (bottom centre). s = scale (1 = 74x102). */
export function drawBalloon(g, b, s = 1) {
  if (drawArt(g, b.key, 0, 0, 74 * s, 102 * s, { anchor: 'bottom' })) return;
  g.save(); g.scale(s, s); g.lineJoin = 'round';
  g.fillStyle = b.c; g.strokeStyle = NAVY; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(0, -8);
  g.bezierCurveTo(-46, -28, -40, -100, 0, -100); g.bezierCurveTo(40, -100, 46, -28, 0, -8); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-7, 2); g.lineTo(0, -9); g.lineTo(7, 2); g.closePath(); g.fillStyle = b.d; g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-14, -70, 8, 14, 0.5, 0, TAU); g.fill();
  g.beginPath(); g.arc(-4, -50, 3, 0, TAU); g.fill();
  g.restore();
}

export function drawHeart(g, s = 1) {
  if (drawArt(g, 'prop/float-heart', 0, 0, 74 * s, 74 * s)) return;
  g.save(); g.scale(s, s); drawHeartShape(g, 64, '#ff5fa2'); g.restore();
}

export function drawStar(g, s = 1) {
  if (drawArt(g, 'prop/float-star', 0, 0, 78 * s, 78 * s)) return;
  g.save(); g.scale(s, s); drawStarShape(g, 66, '#ffd23f'); g.restore();
}

export function drawGoldenStar(g, s = 1, t = 0) {
  g.save(); g.scale(s, s);
  const k = 0.75 + Math.sin(t * 6) * 0.2;
  const gr = g.createRadialGradient(0, 0, 10, 0, 0, 110);
  gr.addColorStop(0, `rgba(255,240,140,${0.85 * k})`); gr.addColorStop(1, 'rgba(255,240,140,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 110, 0, TAU); g.fill();
  if (!drawArt(g, 'prop/float-golden-star', 0, 0, 130, 130)) {
    drawStarShape(g, 112, '#ffcf1f');
    g.strokeStyle = NAVY; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.arc(-14, -4, 7, Math.PI * 1.1, Math.PI * 1.9); g.arc(14, -4, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(0, 6, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,110,150,0.5)'; g.beginPath(); g.ellipse(-26, 8, 7, 4, 0, 0, TAU); g.ellipse(26, 8, 7, 4, 0, 0, TAU); g.fill();
  }
  g.restore();
}

/** Puffy cloud with a funny face, centred, 360x225 at s=1. giggle 0..1 */
export function drawFaceCloud(g, s, giggle, t, mood) {
  g.save(); g.scale(s, s);
  if (drawArt(g, giggle > 0 ? 'prop/cloud-face-giggle' : 'prop/cloud-face', 0, 0, 360, 225)) { g.restore(); return; }
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(36,22,63,0.55)'; g.lineWidth = 5;
  const puffs = [[-110, 20, 62], [-50, -30, 78], [30, -42, 82], [105, 0, 66], [60, 40, 62], [-30, 44, 66], [-120, 50, 40]];
  g.fillStyle = '#ffffff';
  g.beginPath(); for (const [x, y, r] of puffs) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.stroke();
  g.beginPath(); for (const [x, y, r] of puffs) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.fill();
  g.fillStyle = 'rgba(200,225,255,0.45)'; g.beginPath(); g.ellipse(0, 70, 150, 26, 0, 0, TAU); g.fill();
  // face
  g.strokeStyle = NAVY; g.fillStyle = NAVY; g.lineWidth = 6; g.lineCap = 'round';
  if (giggle > 0) {
    g.beginPath(); g.moveTo(-50, -14); g.lineTo(-30, -4); g.lineTo(-50, 6); g.moveTo(50, -14); g.lineTo(30, -4); g.lineTo(50, 6); g.stroke();
    g.beginPath(); g.ellipse(0, 30, 30, 24 + Math.sin(t * 30) * 4, 0, 0, Math.PI); g.closePath(); g.fillStyle = '#ff6f91'; g.fill(); g.stroke();
    g.fillStyle = '#ff9ccf'; g.beginPath(); g.ellipse(8, 50, 12, 10, 0, 0, TAU); g.fill();
  } else if (mood === 1) {
    // silly: one eye winking, tongue out
    g.beginPath(); g.arc(-38, -6, 9, 0, TAU); g.fill();
    g.beginPath(); g.arc(38, -4, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(0, 18, 22, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    g.fillStyle = '#ff7aa8'; g.beginPath(); g.ellipse(6, 44, 11, 13, 0, 0, TAU); g.fill(); g.stroke();
  } else if (mood === 2) {
    // puffed cheeks blowing
    g.beginPath(); g.arc(-36, -8, 8, 0, TAU); g.arc(36, -8, 8, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, 28, 10, 0, TAU); g.stroke();
  } else {
    const bl = Math.sin(t * 1.7 + s) > 0.96 ? 0.15 : 1;
    g.beginPath(); g.ellipse(-36, -6, 9, 12 * bl, 0, 0, TAU); g.ellipse(36, -6, 9, 12 * bl, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, 18, 12, 0, TAU); g.lineWidth = 5; g.stroke();
  }
  g.fillStyle = 'rgba(255,110,160,0.4)'; g.beginPath(); g.ellipse(-70, 22, 18, 10, 0, 0, TAU); g.ellipse(70, 22, 18, 10, 0, 0, TAU); g.fill();
  g.restore();
}

/** Bluebird, centred, facing left (flies right to left). */
export function drawBird(g, flap, waving, color = '#5ab8ff') {
  if (drawArt(g, waving ? 'prop/bird-wave' : 'prop/bird-fly', 0, 0, 100, 80)) return;
  g.save(); g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = NAVY;
  g.fillStyle = color;
  g.beginPath(); g.moveTo(26, -2); g.lineTo(46, -12); g.lineTo(44, 8); g.closePath(); g.fill(); g.stroke(); // tail
  g.beginPath(); g.ellipse(0, 0, 32, 24, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#fff3d6'; g.beginPath(); g.ellipse(-6, 8, 18, 12, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(-30, -4); g.lineTo(-44, waving ? -8 : 0); g.lineTo(-30, 4); g.closePath(); g.fill(); g.stroke();
  if (waving) { g.beginPath(); g.moveTo(-30, 4); g.lineTo(-40, 8); g.lineTo(-30, 8); g.fill(); }
  g.fillStyle = NAVY; g.beginPath(); g.arc(-16, -8, 4, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-17, -9.5, 1.5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,110,160,0.5)'; g.beginPath(); g.ellipse(-12, 2, 5, 3, 0, 0, TAU); g.fill();
  // wing
  g.fillStyle = color;
  g.save(); g.translate(4, -6);
  if (waving) { g.rotate(-1.2 + Math.sin(flap * 3) * 0.5); g.beginPath(); g.ellipse(0, -18, 9, 22, 0, 0, TAU); g.fill(); g.stroke(); }
  else { g.scale(1, Math.sin(flap) * 0.9); g.beginPath(); g.ellipse(4, -16, 18, 18, 0, 0, TAU); g.fill(); g.stroke(); }
  g.restore();
  g.restore();
}

export function drawSparkle(g, x, y, s, c = '#fff') { g.save(); g.translate(x, y); drawSparkleShape(g, s, c); g.restore(); }

/** Scrolling meadow sky (fallback for bg/balloon-float). scroll = px travelled. */
export function drawSky(g, W, H, t, scroll, groundY) {
  const bg = art('bg/balloon-float');
  if (bg) {
    drawMirroredScroll(g, bg, W, H, scroll * 0.35);
    return true;
  }
  ui.sky(g, '#6cc6ff', '#ffe6d0', groundY);
  // sun
  g.save(); g.translate(260, 170); g.globalAlpha = 0.3; g.fillStyle = '#fff6a8';
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(70, -12); g.lineTo(180 + Math.sin(t * 2 + i) * 10, 0); g.lineTo(70, 12); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, 66, 0, TAU); g.fill(); g.restore();
  // far clouds
  for (let i = 0; i < 6; i++) { const x = ((i * 420 - scroll * 0.12) % (W + 400) + W + 400) % (W + 400) - 200; ui.cloud(g, x, 140 + (i % 3) * 90, 0.6 + (i % 2) * 0.25, '#ffffff', 0.55); }
  // far hills
  bandHills(g, W, H, 820, '#b9e6b0', 40, 0.0025, scroll * 0.15);
  // windmill + trees on the mid hills
  const mid = scroll * 0.35;
  bandHills(g, W, H, 880, '#8fd67f', 34, 0.0034, mid);
  for (let i = 0; i < 8; i++) {
    const x = ((i * 300 - mid) % 2400 + 2400) % 2400 - 200;
    const y = 880 + Math.sin((x + mid) * 0.0034) * 34 - 10;
    if (i === 3) drawWindmill(g, x, y, t); else drawTree(g, x, y, 0.8 + (i % 3) * 0.15);
  }
  // meadow
  g.fillStyle = '#62c95a'; g.fillRect(0, groundY, W, H - groundY);
  g.fillStyle = '#7ddc6c';
  const nearOff = scroll % 34;
  for (let x = -nearOff; x < W + 34; x += 34) { g.beginPath(); g.moveTo(x, groundY + 4); g.lineTo(x + 9, groundY - 18); g.lineTo(x + 18, groundY + 4); g.fill(); }
  for (let i = 0; i < 26; i++) {
    const x = ((i * 157 - scroll) % (W + 100) + W + 100) % (W + 100) - 50, y = groundY + 30 + ((i * 41) % 80);
    g.fillStyle = ['#ff8fc7', '#ffe066', '#ffffff', '#c9a0ff', '#ff6f6f'][i % 5];
    g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(x, y); g.arc(x + Math.cos(k * 1.26) * 7, y + Math.sin(k * 1.26) * 7, 5, 0, TAU); } g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill();
  }
  return false;
}

function bandHills(g, W, H, y, color, amp, freq, off) {
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin((x + off) * freq) * amp + Math.sin((x + off) * freq * 2.3) * amp * 0.3);
  g.lineTo(W, H); g.closePath(); g.fillStyle = color; g.fill();
}

function drawTree(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#a86f4a'; g.fillRect(-6, -40, 12, 42);
  g.fillStyle = '#4fb85a'; g.beginPath(); g.arc(0, -56, 30, 0, TAU); g.arc(-20, -40, 20, 0, TAU); g.arc(20, -40, 20, 0, TAU); g.fill();
  g.restore();
}

function drawWindmill(g, x, y, t) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#fff3e6'; g.beginPath(); g.moveTo(-26, 0); g.lineTo(-16, -110); g.lineTo(16, -110); g.lineTo(26, 0); g.fill();
  g.fillStyle = '#ff8f8f'; g.beginPath(); g.moveTo(-22, -108); g.lineTo(0, -136); g.lineTo(22, -108); g.fill();
  g.translate(0, -112); g.rotate(t * 1.4);
  g.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { g.rotate(TAU / 4); g.fillRect(-6, 0, 12, 70); }
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
  g.restore();
}
