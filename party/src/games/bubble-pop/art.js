// Bubble Pop drawing kit: procedural fallbacks for every art key the game
// asks for (see the header of ../bubble-pop.js). All shapes are drawn around
// the origin; callers translate/scale.
import * as ui from '../../engine/ui.js';
import { drawStarShape, drawSparkleShape } from '../../engine/emotes.js';
import { drawArt } from '../../engine/art.js';
import { TAU } from '../../engine/util.js';

const NAVY = '#24163f';

/** A soap bubble of radius r (iridescent rim, see-through middle). */
export function drawBubble(g, r, t, giant = false, hit = 0) {
  if (drawArt(g, 'prop/bubble', 0, 0, r * 2.15, r * 2.15)) return;
  g.save();
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  gr.addColorStop(0, 'rgba(255,255,255,0.05)');
  gr.addColorStop(0.75, 'rgba(200,230,255,0.10)');
  gr.addColorStop(0.93, 'rgba(255,190,240,0.32)');
  gr.addColorStop(1, 'rgba(255,255,255,0.55)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  // iridescent rim
  const cols = ['#ff8fd0', '#ffd96b', '#7ff0c4', '#8fc8ff', '#c9a0ff', '#ff8fd0'];
  g.lineWidth = giant ? 6 : 4;
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = cols[i]; g.globalAlpha = 0.55;
    const a0 = t * 0.8 + i * (TAU / 5);
    g.beginPath(); g.arc(0, 0, r - 2, a0, a0 + TAU / 5 + 0.05); g.stroke();
  }
  g.globalAlpha = 1;
  // highlights
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = r * 0.09; g.lineCap = 'round';
  g.beginPath(); g.arc(0, 0, r * 0.72, Math.PI * 1.08, Math.PI * 1.38); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath(); g.arc(-r * 0.5, -r * 0.2, r * 0.07, 0, TAU); g.fill();
  g.beginPath(); g.arc(r * 0.48, r * 0.5, r * 0.06, 0, TAU); g.fill();
  if (hit > 0) { g.strokeStyle = `rgba(255,255,255,${hit})`; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, r + 4, 0, TAU); g.stroke(); }
  g.restore();
}

/** Duckling ~90 px, facing right. flap 0..1 */
export function drawDuckling(g, flap = 0, laugh = true) {
  if (drawArt(g, 'prop/bubble-duckling', 0, 0, 96, 96)) return;
  g.save(); g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = NAVY;
  g.fillStyle = '#ffe14a';
  g.beginPath(); g.ellipse(0, 12, 30, 24, 0, 0, TAU); g.fill(); g.stroke();       // body
  g.beginPath(); g.moveTo(-26, 4); g.lineTo(-40, -6); g.lineTo(-30, 14); g.closePath(); g.fill(); g.stroke(); // tail
  g.beginPath(); g.arc(14, -18, 20, 0, TAU); g.fill(); g.stroke();                // head
  g.fillStyle = '#ffd000';
  g.save(); g.translate(-4, 6); g.rotate(-0.6 - flap * 0.9);
  g.beginPath(); g.ellipse(0, -10, 10, 18, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); // wing
  g.fillStyle = '#ff9f1c';
  g.beginPath(); g.moveTo(30, -18); g.lineTo(46, laugh ? -24 : -16); g.lineTo(32, -12); g.lineTo(46, laugh ? -6 : -12); g.lineTo(30, -10); g.closePath(); g.fill(); g.stroke();
  g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.arc(18, -22, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();      // happy shut eye
  g.fillStyle = 'rgba(255,120,150,0.55)'; g.beginPath(); g.ellipse(8, -12, 6, 4, 0, 0, TAU); g.fill();
  g.restore();
}

export function drawStarFace(g, s = 1) {
  if (drawArt(g, 'prop/bubble-star', 0, 0, 84 * s, 84 * s)) return;
  g.save(); g.scale(s, s);
  drawStarShape(g, 70, '#ffd23f');
  g.strokeStyle = NAVY; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.arc(-9, -3, 5, Math.PI * 1.1, Math.PI * 1.9); g.arc(9, -3, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.beginPath(); g.arc(0, 4, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,120,150,0.5)'; g.beginPath(); g.ellipse(-16, 6, 5, 3, 0, 0, TAU); g.ellipse(16, 6, 5, 3, 0, 0, TAU); g.fill();
  g.restore();
}

export function drawCupcake(g, s = 1) {
  if (drawArt(g, 'prop/bubble-cupcake', 0, 0, 84 * s, 84 * s)) return;
  g.save(); g.scale(s, s); g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = NAVY;
  g.beginPath(); g.moveTo(-22, 0); g.lineTo(22, 0); g.lineTo(16, 28); g.lineTo(-16, 28); g.closePath(); g.fillStyle = '#7fe0c0'; g.fill(); g.stroke();
  for (const [rx, ry, y] of [[26, 12, -2], [20, 11, -12], [12, 10, -21]]) { g.beginPath(); g.ellipse(0, y, rx, ry, 0, 0, TAU); g.fillStyle = '#ff9ccf'; g.fill(); g.stroke(); }
  g.beginPath(); g.arc(0, -32, 7, 0, TAU); g.fillStyle = '#ff2d55'; g.fill(); g.stroke();
  const sc = ['#ffd23f', '#3fa7ff', '#36d17a', '#b58cff'];
  for (let i = 0; i < 5; i++) { g.save(); g.translate(-14 + i * 7, -8 - (i % 2) * 8); g.rotate(i * 1.3); g.fillStyle = sc[i % 4]; g.fillRect(-4, -1.5, 8, 3); g.restore(); }
  g.restore();
}

/** Frog ~100 px tall, origin at its bottom centre, facing right. */
export function drawFrog(g, hop = false, s = 1) {
  if (drawArt(g, hop ? 'prop/bubble-frog-hop' : 'prop/bubble-frog', 0, 0, 104 * s, 104 * s, { anchor: 'bottom' })) return;
  g.save(); g.scale(s, s); g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = NAVY;
  g.fillStyle = '#5fd36a';
  if (hop) {
    g.beginPath(); g.ellipse(-30, -26, 26, 8, -0.4, 0, TAU); g.fill(); g.stroke();     // legs out behind
    g.beginPath(); g.ellipse(26, -30, 16, 6, 0.5, 0, TAU); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.ellipse(-22, -10, 18, 10, 0, 0, TAU); g.ellipse(22, -10, 18, 10, 0, 0, TAU); g.fill(); g.stroke();
  }
  g.beginPath(); g.ellipse(0, -34, 36, 28, 0, 0, TAU); g.fill(); g.stroke();              // body
  g.fillStyle = '#c9f5a8'; g.beginPath(); g.ellipse(4, -26, 22, 16, 0, 0, TAU); g.fill();  // belly
  for (const ex of [-14, 14]) {
    g.fillStyle = '#5fd36a'; g.beginPath(); g.arc(ex, -62, 13, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, -62, 9, 0, TAU); g.fill();
    g.fillStyle = NAVY; g.beginPath(); g.arc(ex + 2, -61, 5, 0, TAU); g.fill();
  }
  g.lineCap = 'round'; g.lineWidth = 3.5;
  g.beginPath();
  if (hop) { g.fillStyle = '#ff6f91'; g.ellipse(4, -40, 10, 8, 0, 0, TAU); g.fill(); g.stroke(); }
  else { g.arc(0, -46, 18, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  g.fillStyle = 'rgba(255,120,150,0.5)'; g.beginPath(); g.ellipse(-24, -40, 6, 4, 0, 0, TAU); g.ellipse(24, -40, 6, 4, 0, 0, TAU); g.fill();
  g.restore();
}

/** Small rainbow, origin at the bottom centre, ~300 wide. */
export function drawRainbow(g, s = 1, alpha = 1) {
  g.save(); g.globalAlpha *= alpha;
  if (drawArt(g, 'prop/bubble-rainbow', 0, 0, 300 * s, 165 * s, { anchor: 'bottom' })) { g.restore(); return; }
  g.scale(s, s); g.lineWidth = 16;
  ['#ff6f91', '#ffb86f', '#ffe66f', '#8be8b8', '#7fd3ff', '#c9a0ff'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(0, -10, 120 - i * 15, Math.PI, 0); g.stroke(); });
  ui.cloud(g, -112, -14, 0.42, '#fff', 1); ui.cloud(g, 112, -14, 0.42, '#fff', 1);
  g.restore();
}

export function drawRubberDuck(g, s = 1) {
  if (drawArt(g, 'prop/bubble-pop-rubber-duck', 0, 0, 112 * s, 112 * s)) return;
  g.save(); g.scale(s, s); g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = NAVY;
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.moveTo(-44, 0); g.quadraticCurveTo(-48, 30, 0, 30); g.quadraticCurveTo(44, 30, 40, 2); g.quadraticCurveTo(10, 10, -10, -2); g.quadraticCurveTo(-30, -12, -44, 0); g.fill(); g.stroke();
  g.beginPath(); g.arc(18, -16, 22, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff8f1c'; g.beginPath(); g.ellipse(44, -12, 12, 6, 0.1, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(24, -22, 4, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(25, -23.5, 1.4, 0, TAU); g.fill();
  g.fillStyle = '#ff6fb1'; g.beginPath(); g.ellipse(10, -40, 9, 6, -0.5, 0, TAU); g.ellipse(24, -40, 9, 6, 0.5, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

/** The bubble machine on its cloud. Origin = bottom centre of the cloud. */
export function drawMachine(g, t, puff, wand) {
  if (drawArt(g, 'prop/bubble-machine', 0, 0, 520, 390, { anchor: 'bottom' })) return; // the art has its own wand
  g.save(); g.lineJoin = 'round';
  ui.cloud(g, -10, -40, 1.6, '#ffffff', 1);
  g.lineWidth = 6; g.strokeStyle = NAVY;
  // body
  ui.roundRect(g, -150, -290, 300, 220, 60); g.fillStyle = '#ffb3d9'; g.fill(); g.stroke();
  ui.roundRect(g, -150, -150, 300, 44, 20); g.fillStyle = '#8be8c8'; g.fill(); g.stroke();
  for (let i = 0; i < 5; i++) { g.fillStyle = ['#ffd23f', '#7fd3ff', '#ff6f91', '#b58cff', '#5fd36a'][i]; g.beginPath(); g.arc(-110 + i * 55, -128, 9, 0, TAU); g.fill(); }
  // dome on top
  g.beginPath(); g.arc(0, -290, 70, Math.PI, 0); g.fillStyle = 'rgba(200,235,255,0.85)'; g.fill(); g.stroke();
  g.save(); g.beginPath(); g.arc(0, -290, 64, Math.PI, 0); g.clip();
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(-40 + i * 16, -300 - ((t * 40 + i * 23) % 50), 8 + (i % 3) * 3, 0, TAU); g.stroke(); }
  g.restore();
  // crank
  g.strokeStyle = NAVY; g.lineWidth = 6; g.save(); g.translate(-150, -220); g.rotate(t * 3);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-38, 0); g.stroke(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(-38, 0, 10, 0, TAU); g.fill(); g.stroke(); g.restore();
  // face
  const blink = Math.sin(t * 1.3) > 0.97;
  g.fillStyle = NAVY;
  g.beginPath(); g.ellipse(-50, -230, 12, blink ? 2 : 16, 0, 0, TAU); g.ellipse(30, -230, 12, blink ? 2 : 16, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-46, -236, 4, 0, TAU); g.arc(34, -236, 4, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,90,150,0.45)'; g.beginPath(); g.ellipse(-80, -200, 16, 9, 0, 0, TAU); g.ellipse(60, -200, 16, 9, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath();
  if (puff > 0) { g.fillStyle = '#ff6f91'; g.ellipse(-10, -190, 16 + puff * 8, 10 + puff * 14, 0, 0, TAU); g.fill(); g.stroke(); }
  else { g.arc(-10, -206, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  // nozzle
  ui.roundRect(g, 120, -215, 50, 46, 14); g.fillStyle = '#c9a0ff'; g.fill(); g.stroke();
  g.restore();
  drawWand(g, 190, -192, wand);
}

function drawWand(g, x, y, spin) {
  g.save(); g.translate(x, y); g.rotate(spin);
  g.strokeStyle = NAVY; g.lineWidth = 12; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.stroke();
  g.strokeStyle = '#b58cff'; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(220,240,255,0.35)'; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
  g.restore();
}

export function drawSparkle(g, x, y, s, c = '#fff') { g.save(); g.translate(x, y); drawSparkleShape(g, s, c); g.restore(); }

/** Garden background (fallback for bg/bubble-pop). */
export function drawGarden(g, W, H, t) {
  ui.sky(g, '#7fd0ff', '#d8f4ff', 880);
  g.save(); g.translate(1700, 150); g.globalAlpha = 0.35; g.fillStyle = '#fff6a8';
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(70, -12); g.lineTo(190 + Math.sin(t * 2 + i) * 12, 0); g.lineTo(70, 12); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.fill(); g.restore();
  for (let i = 0; i < 5; i++) ui.cloud(g, ((i * 470 + t * (20 + i * 4)) % (W + 500)) - 250, 130 + (i % 3) * 110, 0.7 + (i % 2) * 0.3, '#fff', 0.8);
  ui.hills(g, 720, '#a8e6a0', 30, 0.003, 1);
  // hedges + flowers
  for (let i = 0; i < 9; i++) {
    const hx = i * 230 + 40, hy = 790;
    g.fillStyle = '#5cbf6a'; g.beginPath(); g.arc(hx, hy, 70, Math.PI, 0); g.arc(hx + 70, hy, 55, Math.PI, 0); g.fill();
    for (let k = 0; k < 4; k++) { g.fillStyle = ['#ff8fc7', '#ffe066', '#fff', '#c9a0ff'][(i + k) % 4]; g.beginPath(); g.arc(hx - 30 + k * 32, hy - 40 + ((k * 13) % 25), 8, 0, TAU); g.fill(); }
  }
  // picket fence
  g.fillStyle = '#fff7fb'; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3;
  g.fillRect(0, 818, W, 14); g.fillRect(0, 846, W, 12);
  for (let x = 10; x < W; x += 58) { g.beginPath(); g.moveTo(x, 870); g.lineTo(x, 800); g.lineTo(x + 18, 784); g.lineTo(x + 36, 800); g.lineTo(x + 36, 870); g.closePath(); g.fill(); g.stroke(); }
  // lawn
  const lg = g.createLinearGradient(0, 868, 0, H); lg.addColorStop(0, '#7ad66a'); lg.addColorStop(1, '#4fb257');
  g.fillStyle = lg; g.fillRect(0, 868, W, H - 868);
  g.fillStyle = '#9be88a'; for (let x = 0; x < W; x += 34) { g.beginPath(); g.moveTo(x, 872); g.lineTo(x + 8, 852); g.lineTo(x + 16, 872); g.fill(); }
  for (let i = 0; i < 40; i++) { const dx = (i * 211) % W, dy = 930 + ((i * 67) % 130); g.fillStyle = '#fff'; g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(dx, dy); g.arc(dx + Math.cos(k * 1.26) * 6, dy + Math.sin(k * 1.26) * 6, 4, 0, TAU); } g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(dx, dy, 3, 0, TAU); g.fill(); }
}
