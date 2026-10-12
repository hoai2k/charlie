// Sandcastle Beach: the beach backdrop (day and sunset), the live sea and sun,
// and the gentle wave sheet of the finale. The static parts are rendered once
// into offscreen canvases; generated art (bg/sandcastle-beach[-sunset]) replaces them.
import { W, H } from '../../engine/canvas.js';
import { art } from '../../engine/art.js';
import { TAU, clamp, lerp } from '../../engine/util.js';
import { NAVY, SAND, SAND_L, SAND_D } from './pieces.js';

export const HORIZON = 150, SHORE = 330, WET = 372;

const DAY = { sky0: '#8fd8ff', sky1: '#d8f4ff', sea0: '#3cc6d9', sea1: '#7fe3e0', sand0: '#f7dc9e', sand1: '#efc77c', wet: '#d7ad6c' };
const DUSK = { sky0: '#6a4fb0', sky1: '#ffb07a', sea0: '#7b5bb8', sea1: '#ff9f8a', sand0: '#f8d0a4', sand1: '#ebb58c', wet: '#c99078' };

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

let cache = { day: null, dusk: null };

function cloud(g, x, y, s, c) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = c;
  g.beginPath(); g.arc(-40, 6, 26, 0, TAU); g.arc(-10, -8, 34, 0, TAU); g.arc(28, 0, 28, 0, TAU); g.arc(52, 10, 18, 0, TAU); g.rect(-60, 6, 120, 22); g.fill();
  g.restore();
}

function umbrella(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(150,100,40,0.22)'; g.beginPath(); g.ellipse(30, 6, 120, 26, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -190); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.stroke();
  const cols = ['#ff6fb1', '#ffffff', '#3fa7ff', '#ffffff', '#ffd23f', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + (i / 6) * Math.PI, a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    g.beginPath(); g.moveTo(-14, -200);
    g.lineTo(-14 + Math.cos(a0) * 130, -200 + Math.sin(a0) * 60 + 40);
    g.quadraticCurveTo(-14 + Math.cos((a0 + a1) / 2) * 120, -200 + Math.sin((a0 + a1) / 2) * 55 + 52, -14 + Math.cos(a1) * 130, -200 + Math.sin(a1) * 60 + 40);
    g.closePath(); g.fillStyle = cols[i]; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
  }
  g.restore();
}
function towel(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.08);
  g.fillStyle = '#7fd3ff'; g.beginPath(); g.rect(-60, -110, 120, 220); g.fill();
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) g.fillRect(-60, -110 + 20 + i * 42, 120, 14);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.strokeRect(-60, -110, 120, 220);
  g.restore();
}
function ball(g, x, y, r) {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(150,100,40,0.22)'; g.beginPath(); g.ellipse(6, r * 0.9, r, r * 0.3, 0, 0, TAU); g.fill();
  const cols = ['#ff4d6d', '#ffffff', '#3fa7ff', '#ffffff', '#ffd23f', '#ffffff'];
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, (i / 6) * TAU, ((i + 1) / 6) * TAU); g.closePath(); g.fillStyle = cols[i]; g.fill(); }
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.4, r * 0.25, r * 0.14, -0.6, 0, TAU); g.fill();
  g.restore();
}

function render(P) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // sky
  let gr = g.createLinearGradient(0, 0, 0, HORIZON);
  gr.addColorStop(0, P.sky0); gr.addColorStop(1, P.sky1);
  g.fillStyle = gr; g.fillRect(0, 0, W, HORIZON + 2);
  const dusk = P === DUSK;
  cloud(g, 330, 70, 1.1, dusk ? 'rgba(255,190,150,0.85)' : 'rgba(255,255,255,0.9)');
  cloud(g, 1230, 52, 0.8, dusk ? 'rgba(255,170,170,0.8)' : 'rgba(255,255,255,0.85)');
  cloud(g, 1720, 96, 0.6, dusk ? 'rgba(255,200,160,0.75)' : 'rgba(255,255,255,0.8)');
  // sea
  gr = g.createLinearGradient(0, HORIZON, 0, SHORE);
  gr.addColorStop(0, P.sea0); gr.addColorStop(1, P.sea1);
  g.fillStyle = gr; g.fillRect(0, HORIZON, W, SHORE - HORIZON + 30);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = hash(i) * W, y = HORIZON + 14 + hash(i + 50) * (SHORE - HORIZON - 40), w = 20 + hash(i + 9) * 40;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 6, x + w, y); g.stroke();
  }
  g.fillStyle = 'rgba(36,22,63,0.25)'; g.fillRect(0, HORIZON - 1, W, 3);
  // sand
  gr = g.createLinearGradient(0, SHORE, 0, H);
  gr.addColorStop(0, P.sand0); gr.addColorStop(1, P.sand1);
  g.fillStyle = gr; g.fillRect(0, SHORE, W, H - SHORE);
  // wet band near the water
  gr = g.createLinearGradient(0, SHORE, 0, WET + 10);
  gr.addColorStop(0, P.wet); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, SHORE, W, WET + 10 - SHORE);
  // ripples and speckles
  g.strokeStyle = 'rgba(160,110,50,0.18)'; g.lineWidth = 3;
  for (let i = 0; i < 70; i++) {
    const x = hash(i + 200) * W, y = WET + hash(i + 300) * (H - WET), w = 40 + hash(i + 400) * 70;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 8, x + w, y); g.stroke();
  }
  for (let i = 0; i < 900; i++) {
    const x = hash(i + 1000) * W, y = SHORE + hash(i + 3000) * (H - SHORE);
    g.fillStyle = hash(i + 5000) > 0.5 ? 'rgba(170,120,60,0.28)' : 'rgba(255,255,255,0.35)';
    g.beginPath(); g.arc(x, y, 1.4 + hash(i + 7000) * 1.8, 0, TAU); g.fill();
  }
  umbrella(g, 92, 610, 0.8);
  towel(g, 1840, 520, 0.7);
  ball(g, 1830, 700, 30);
  ball(g, 70, 820, 24);
  return c;
}

/** The static backdrop, crossfading to sunset with k (0..1). */
export function drawBackdrop(g, k) {
  const day = art('bg/sandcastle-beach') || (cache.day ||= render(DAY));
  g.drawImage(day, 0, 0, W, H);
  if (k > 0.001) {
    const dusk = art('bg/sandcastle-beach-sunset') || (cache.dusk ||= render(DUSK));
    g.save(); g.globalAlpha = clamp(k, 0, 1); g.drawImage(dusk, 0, 0, W, H); g.restore();
  }
}

/** Sun: high on the right by day, setting on the horizon in the middle at sunset. */
export function drawSun(g, t, k) {
  const x = lerp(1560, 960, k), y = lerp(66, HORIZON + 8, k), r = lerp(44, 92, k);
  g.save();
  g.beginPath(); g.rect(0, 0, W, HORIZON); g.clip();
  const glow = g.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
  glow.addColorStop(0, k > 0.3 ? 'rgba(255,190,110,0.6)' : 'rgba(255,250,200,0.6)'); glow.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 2.6, 0, TAU); g.fill();
  if (k < 0.5) {
    g.strokeStyle = 'rgba(255,220,90,0.8)'; g.lineWidth = 6; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + t * 0.3;
      g.beginPath(); g.moveTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2); g.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5); g.stroke();
    }
  }
  g.fillStyle = k > 0.3 ? `rgb(255,${Math.round(lerp(210, 140, k))},${Math.round(lerp(80, 70, k))})` : '#ffd84a';
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(36,22,63,0.6)'; g.stroke();
  if (k < 0.4) {
    // a sleepy-happy sun face
    g.strokeStyle = NAVY; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.arc(x - r * 0.32, y - r * 0.08, r * 0.14, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(x + r * 0.32, y - r * 0.08, r * 0.14, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(x, y + r * 0.12, r * 0.28, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = 'rgba(255,130,120,0.6)'; g.beginPath(); g.ellipse(x - r * 0.55, y + r * 0.2, r * 0.13, r * 0.08, 0, 0, TAU); g.ellipse(x + r * 0.55, y + r * 0.2, r * 0.13, r * 0.08, 0, 0, TAU); g.fill();
  }
  g.restore();
  if (k > 0.2) {
    // golden glitter path on the sea
    g.save(); g.globalAlpha = (k - 0.2) / 0.8;
    g.fillStyle = 'rgba(255,220,140,0.75)';
    for (let i = 0; i < 16; i++) {
      const yy = HORIZON + 10 + i * 11, w = 30 + i * 9 + Math.sin(t * 3 + i) * 10;
      g.fillRect(x - w / 2 + Math.sin(t * 2 + i * 1.7) * 8, yy, w, 3.5);
    }
    g.restore();
  }
}

/** Live sea sparkle and the lapping foam at the shoreline. */
export function drawShore(g, t, k) {
  g.save();
  // twinkles
  for (let i = 0; i < 18; i++) {
    const ph = (t * 0.7 + hash(i) * 5) % 2;
    if (ph > 0.6) continue;
    const a = Math.sin((ph / 0.6) * Math.PI);
    const x = hash(i + 20) * W, y = HORIZON + 20 + hash(i + 40) * (SHORE - HORIZON - 50);
    g.fillStyle = `rgba(255,255,255,${a * 0.9})`;
    g.beginPath(); g.moveTo(x, y - 7 * a); g.lineTo(x + 2, y); g.lineTo(x, y + 7 * a); g.lineTo(x - 2, y); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x - 7 * a, y); g.lineTo(x, y + 2); g.lineTo(x + 7 * a, y); g.lineTo(x, y - 2); g.closePath(); g.fill();
  }
  // lapping water edge
  const lap = Math.sin(t * 0.9) * 10;
  g.beginPath(); g.moveTo(0, SHORE - 30);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, SHORE + lap + Math.sin(x * 0.012 + t * 1.3) * 7);
  g.lineTo(W, SHORE - 30); g.closePath();
  g.fillStyle = k > 0.5 ? 'rgba(255,170,150,0.55)' : 'rgba(127,227,224,0.6)'; g.fill();
  g.beginPath();
  for (let x = 0; x <= W; x += 40) { const y = SHORE + lap + Math.sin(x * 0.012 + t * 1.3) * 7; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
  g.lineWidth = 7; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineCap = 'round'; g.stroke();
  g.restore();
}

/** The finale wave: a gentle sheet of water from the shore down to y. */
export function drawWave(g, y, t, alpha = 1) {
  if (y <= SHORE + 2) return;
  g.save();
  g.globalAlpha = alpha;
  const edge = (x) => y + Math.sin(x * 0.01 + t * 3) * 14 + Math.sin(x * 0.027 - t * 2) * 6;
  g.beginPath(); g.moveTo(0, SHORE - 20);
  for (let x = 0; x <= W; x += 30) g.lineTo(x, edge(x));
  g.lineTo(W, SHORE - 20); g.closePath();
  const gr = g.createLinearGradient(0, SHORE, 0, y);
  gr.addColorStop(0, 'rgba(70,200,225,0.55)'); gr.addColorStop(1, 'rgba(140,235,240,0.35)');
  g.fillStyle = gr; g.fill();
  // foam scallops along the front
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let x = 0; x <= W; x += 34) { g.beginPath(); g.arc(x + Math.sin(t * 4 + x) * 4, edge(x) - 2, 15, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 4;
  for (let i = 0; i < 24; i++) {
    const x = hash(i + 90) * W, yy = SHORE + (y - SHORE) * (0.2 + hash(i + 91) * 0.7);
    g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + 25, yy - 6, x + 50, yy); g.stroke();
  }
  g.restore();
}

export { SAND, SAND_L, SAND_D };
