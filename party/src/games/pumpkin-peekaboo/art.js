// Procedural art for Pumpkin Peekaboo (the fallback until generated art lands).
import { TAU } from '../../engine/util.js';
import { drawSparkleShape } from '../../engine/emotes.js';
import * as ui from '../../engine/ui.js';

const NAVY = '#24163f';

/**
 * A friendly jack-o'-lantern (or the witch-hat kitty), origin = bottom centre,
 * `w` = width. face: 0 tongue grin, 1 wink, 2 googly, 3 raspberry, 'giggle',
 * 'cat', 'purr'.
 */
export function drawPumpkin(g, w, face, { t = 0, golden = false, blink = false, look = 0 } = {}) {
  if (face === 'cat' || face === 'purr') { drawCat(g, w, face === 'purr', t, blink, look); return; }
  const u = w / 100;
  const bh = w * 0.8, cy = -bh / 2;
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  // stem + leaf
  g.lineWidth = 3.5 * u; g.strokeStyle = NAVY;
  g.fillStyle = golden ? '#c9a227' : '#5a8a2e';
  g.beginPath(); g.moveTo(-6 * u, -bh + 6 * u); g.quadraticCurveTo(-8 * u, -bh - 14 * u, 2 * u, -bh - 20 * u); g.lineTo(9 * u, -bh - 15 * u); g.quadraticCurveTo(3 * u, -bh - 8 * u, 6 * u, -bh + 6 * u); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = golden ? '#ffe066' : '#6fcf4a';
  g.beginPath(); g.moveTo(4 * u, -bh - 8 * u); g.quadraticCurveTo(22 * u, -bh - 26 * u, 34 * u, -bh - 10 * u); g.quadraticCurveTo(20 * u, -bh - 2 * u, 4 * u, -bh - 8 * u); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-6 * u, -bh - 6 * u); g.bezierCurveTo(-22 * u, -bh - 10 * u, -20 * u, -bh - 26 * u, -12 * u, -bh - 22 * u); g.stroke();
  // body: overlapping ribs
  const body = g.createLinearGradient(0, -bh, 0, 0);
  if (golden) { body.addColorStop(0, '#fff3a0'); body.addColorStop(0.5, '#ffd23f'); body.addColorStop(1, '#e0a412'); }
  else { body.addColorStop(0, '#ffb24d'); body.addColorStop(0.55, '#ff8a1f'); body.addColorStop(1, '#e0621a'); }
  const ribs = [[-30, 22], [30, 22], [-14, 26], [14, 26], [0, 26]];
  for (const [rx, rw] of ribs) {
    g.beginPath(); g.ellipse(rx * u, cy, rw * u, bh / 2, 0, 0, TAU);
    g.fillStyle = body; g.fill(); g.lineWidth = 3.5 * u; g.strokeStyle = NAVY; g.stroke();
  }
  g.beginPath(); g.ellipse(0, cy, 22 * u, bh / 2 - 2 * u, 0, 0, TAU); g.fillStyle = body; g.fill();
  // shine
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(-28 * u, cy - bh * 0.22, 6 * u, 12 * u, 0.4, 0, TAU); g.fill();
  // carved face
  const glowA = golden ? '#fffbe0' : '#ffe680', glowB = golden ? '#ffd23f' : '#ffaa2e';
  const carve = () => {
    const gr = g.createRadialGradient(0, cy, 2, 0, cy, 40 * u);
    gr.addColorStop(0, glowA); gr.addColorStop(1, glowB);
    g.fillStyle = gr; g.fill(); g.lineWidth = 3 * u; g.strokeStyle = NAVY; g.stroke();
  };
  const ey = cy - 10 * u, ex = 17 * u;
  const roundEye = (x, r = 8) => { g.beginPath(); if (blink) g.ellipse(x, ey, r * u, 1.6 * u, 0, 0, TAU); else g.arc(x, ey, r * u, 0, TAU); carve(); };
  const happyEye = (x) => { g.beginPath(); g.moveTo(x - 9 * u, ey + 3 * u); g.quadraticCurveTo(x, ey - 10 * u, x + 9 * u, ey + 3 * u); g.quadraticCurveTo(x, ey - 3 * u, x - 9 * u, ey + 3 * u); carve(); };
  const cheeks = () => { g.fillStyle = 'rgba(255,90,140,0.4)'; g.beginPath(); g.ellipse(-30 * u, cy + 6 * u, 7 * u, 4 * u, 0, 0, TAU); g.ellipse(30 * u, cy + 6 * u, 7 * u, 4 * u, 0, 0, TAU); g.fill(); };
  const lk = look * 2 * u;
  switch (face) {
    case 0: { // tongue-out grin
      roundEye(-ex + lk); roundEye(ex + lk);
      g.beginPath(); g.moveTo(-22 * u, cy + 6 * u); g.quadraticCurveTo(0, cy + 30 * u, 22 * u, cy + 6 * u); g.quadraticCurveTo(0, cy + 14 * u, -22 * u, cy + 6 * u); carve();
      const wag = Math.sin(t * 9) * 3 * u;
      g.beginPath(); g.ellipse(4 * u + wag * 0.3, cy + 22 * u, 8 * u, 9 * u, 0.15, 0, Math.PI); g.fillStyle = '#ff6f91'; g.fill(); g.lineWidth = 3 * u; g.strokeStyle = NAVY; g.stroke();
      break;
    }
    case 1: { // wink
      happyEye(-ex); roundEye(ex + lk, 9);
      g.beginPath(); g.moveTo(-20 * u, cy + 10 * u); g.quadraticCurveTo(4 * u, cy + 30 * u, 24 * u, cy + 4 * u); g.quadraticCurveTo(4 * u, cy + 18 * u, -20 * u, cy + 10 * u); carve();
      cheeks();
      break;
    }
    case 2: { // googly crossed eyes, buck teeth
      for (const s of [-1, 1]) {
        g.beginPath(); g.arc(s * ex, ey, 10 * u, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3 * u; g.strokeStyle = NAVY; g.stroke();
        const wob = Math.sin(t * 7 + s) * 1.5 * u;
        g.beginPath(); g.arc(s * ex - s * 4 * u + wob, ey + 2 * u, 4.5 * u, 0, TAU); g.fillStyle = NAVY; g.fill();
      }
      g.beginPath(); g.moveTo(-20 * u, cy + 8 * u); g.quadraticCurveTo(0, cy + 28 * u, 20 * u, cy + 8 * u); g.closePath(); carve();
      g.fillStyle = '#ff9a2e'; g.fillRect(-7 * u, cy + 8 * u, 6 * u, 8 * u); g.fillRect(1 * u, cy + 8 * u, 6 * u, 8 * u);
      g.lineWidth = 2.5 * u; g.strokeRect(-7 * u, cy + 8 * u, 6 * u, 8 * u); g.strokeRect(1 * u, cy + 8 * u, 6 * u, 8 * u);
      break;
    }
    case 3: { // puffed cheeks, raspberry
      g.lineWidth = 3.5 * u; g.strokeStyle = NAVY;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex - 8 * u, ey - 5 * u); g.lineTo(s * ex + s * 2 * u, ey); g.lineTo(s * ex - 8 * u, ey + 5 * u); g.stroke(); }
      g.beginPath(); g.ellipse(0, cy + 14 * u, 10 * u, 7 * u, 0, 0, TAU); carve();
      const wag = Math.sin(t * 30) * 2 * u;
      g.beginPath(); g.ellipse(wag, cy + 22 * u, 7 * u, 8 * u, 0, 0, Math.PI); g.fillStyle = '#ff6f91'; g.fill(); g.lineWidth = 3 * u; g.stroke();
      g.fillStyle = 'rgba(255,90,140,0.5)'; g.beginPath(); g.ellipse(-28 * u, cy + 10 * u, 10 * u, 7 * u, 0, 0, TAU); g.ellipse(28 * u, cy + 10 * u, 10 * u, 7 * u, 0, 0, TAU); g.fill();
      g.strokeStyle = '#bfe8ff'; g.lineWidth = 2.5 * u;
      for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6; g.beginPath(); g.moveTo(Math.cos(a) * 16 * u, cy + 22 * u + Math.sin(a) * 6 * u); g.lineTo(Math.cos(a) * 26 * u, cy + 24 * u + Math.sin(a) * 12 * u); g.stroke(); }
      break;
    }
    case 'giggle': default: {
      happyEye(-ex); happyEye(ex);
      g.beginPath(); g.moveTo(-24 * u, cy + 2 * u); g.quadraticCurveTo(0, cy + 6 * u, 24 * u, cy + 2 * u); g.quadraticCurveTo(22 * u, cy + 34 * u, 0, cy + 34 * u); g.quadraticCurveTo(-22 * u, cy + 34 * u, -24 * u, cy + 2 * u); carve();
      g.beginPath(); g.ellipse(0, cy + 26 * u, 10 * u, 6 * u, 0, Math.PI, 0); g.fillStyle = '#ff6f91'; g.fill();
      cheeks();
      // happy tear
      g.fillStyle = '#9fe0ff'; g.beginPath(); g.ellipse(ex + 12 * u, ey + 6 * u, 3 * u, 4.5 * u, 0, 0, TAU); g.fill();
      break;
    }
  }
  if (golden) {
    g.save(); g.translate(-24 * u, cy - 28 * u); const k = 0.6 + 0.4 * Math.sin(t * 6); g.scale(k, k); drawSparkleShape(g, 22 * u, '#ffffff'); g.restore();
  }
  g.restore();
}

function drawCat(g, w, purr, t, blink, look) {
  const u = w / 100;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 3.5 * u; g.strokeStyle = NAVY;
  const hy = -46 * u;
  const fur = '#b9a8d8', furD = '#9a86c2';
  // body peeking out
  g.fillStyle = furD; g.beginPath(); g.ellipse(0, -8 * u, 34 * u, 22 * u, 0, Math.PI, 0); g.fill(); g.stroke();
  // ears
  g.fillStyle = fur;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 34 * u, hy - 12 * u); g.lineTo(s * 30 * u, hy - 44 * u); g.lineTo(s * 12 * u, hy - 30 * u); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffb3d1'; g.beginPath(); g.moveTo(s * 30 * u, hy - 18 * u); g.lineTo(s * 28 * u, hy - 36 * u); g.lineTo(s * 18 * u, hy - 28 * u); g.closePath(); g.fill(); g.fillStyle = fur;
  }
  // head
  g.beginPath(); g.ellipse(0, hy, 40 * u, 33 * u, 0, 0, TAU); g.fill(); g.stroke();
  // witch hat
  g.save(); g.translate(4 * u, hy - 30 * u); g.rotate(0.12 + Math.sin(t * 3) * 0.05);
  g.fillStyle = '#7b4fd6';
  g.beginPath(); g.ellipse(0, 0, 40 * u, 9 * u, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-22 * u, -2 * u); g.quadraticCurveTo(-8 * u, -40 * u, 10 * u, -62 * u); g.quadraticCurveTo(20 * u, -54 * u, 14 * u, -46 * u); g.quadraticCurveTo(14 * u, -24 * u, 22 * u, -2 * u); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.fillRect(-21 * u, -10 * u, 42 * u, 7 * u); g.strokeRect(-21 * u, -10 * u, 42 * u, 7 * u);
  g.translate(2 * u, -26 * u); drawSparkleShape(g, 16 * u, '#ffe066');
  g.restore();
  // face
  const ey = hy - 2 * u;
  if (purr) {
    g.beginPath(); g.moveTo(-22 * u, ey + 2 * u); g.quadraticCurveTo(-14 * u, ey - 7 * u, -6 * u, ey + 2 * u); g.moveTo(6 * u, ey + 2 * u); g.quadraticCurveTo(14 * u, ey - 7 * u, 22 * u, ey + 2 * u); g.stroke();
  } else {
    for (const s of [-1, 1]) {
      g.fillStyle = '#7fe0a0'; g.beginPath(); if (blink) g.ellipse(s * 14 * u, ey, 9 * u, 1.5 * u, 0, 0, TAU); else g.ellipse(s * 14 * u, ey, 9 * u, 11 * u, 0, 0, TAU); g.fill(); g.stroke();
      if (!blink) { g.fillStyle = NAVY; g.beginPath(); g.ellipse(s * 14 * u + look * 2 * u, ey + 1 * u, 4 * u, 7 * u, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 14 * u - 3 * u, ey - 4 * u, 2.5 * u, 0, TAU); g.fill(); }
    }
  }
  g.fillStyle = 'rgba(255,110,170,0.45)'; g.beginPath(); g.ellipse(-26 * u, ey + 12 * u, 7 * u, 4 * u, 0, 0, TAU); g.ellipse(26 * u, ey + 12 * u, 7 * u, 4 * u, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff7aa8'; g.beginPath(); g.moveTo(-4 * u, ey + 10 * u); g.lineTo(4 * u, ey + 10 * u); g.lineTo(0, ey + 14 * u); g.closePath(); g.fill();
  g.lineWidth = 2.5 * u;
  g.beginPath(); g.moveTo(0, ey + 14 * u); g.quadraticCurveTo(-5 * u, ey + 20 * u, -10 * u, ey + 16 * u); g.moveTo(0, ey + 14 * u); g.quadraticCurveTo(5 * u, ey + 20 * u, 10 * u, ey + 16 * u); g.stroke();
  g.lineWidth = 2 * u;
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(s * 20 * u, ey + 12 * u + i * 5 * u); g.lineTo(s * 44 * u, ey + 8 * u + i * 9 * u); g.stroke(); }
  // paws on the rim
  g.lineWidth = 3 * u; g.fillStyle = fur;
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 24 * u, -2 * u, 12 * u, 8 * u, 0, 0, TAU); g.fill(); g.stroke(); }
  g.restore();
}

/** Candy at the origin; kind 0 wrapped sweet, 1 lollipop, 2 candy corn, 3 pink chocolate. r = radius. */
export function drawCandy(g, kind, r) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.12);
  switch (kind) {
    case 0: {
      g.fillStyle = '#b07ae8';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.5, 0); g.lineTo(s * r * 1.15, -r * 0.5); g.lineTo(s * r * 1.15, r * 0.5); g.closePath(); g.fill(); g.stroke(); }
      g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.fillStyle = '#ff9f1c'; g.fill(); g.stroke();
      g.save(); g.clip(); g.strokeStyle = '#ffe066'; g.lineWidth = r * 0.18;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * r * 0.35 - r, -r); g.lineTo(i * r * 0.35 + r, r); g.stroke(); }
      g.restore();
      break;
    }
    case 1: {
      g.fillStyle = '#fff'; g.fillRect(-r * 0.09, 0, r * 0.18, r * 1.2); g.strokeRect(-r * 0.09, 0, r * 0.18, r * 1.2);
      g.beginPath(); g.arc(0, -r * 0.15, r * 0.7, 0, TAU); g.fillStyle = '#ff6fb1'; g.fill(); g.stroke();
      const cols = ['#ffd23f', '#5ddc6a', '#3fa7ff'];
      g.lineWidth = r * 0.14;
      for (let i = 0; i < 3; i++) { g.strokeStyle = cols[i]; g.beginPath(); g.arc(0, -r * 0.15, r * (0.18 + i * 0.16), i, i + 4.2); g.stroke(); }
      break;
    }
    case 2: {
      g.beginPath(); g.moveTo(0, -r * 0.95); g.quadraticCurveTo(r * 0.3, -r * 0.4, r * 0.75, r * 0.7); g.quadraticCurveTo(0, r * 0.95, -r * 0.75, r * 0.7); g.quadraticCurveTo(-r * 0.3, -r * 0.4, 0, -r * 0.95); g.closePath();
      g.save(); g.clip();
      g.fillStyle = '#ffd23f'; g.fillRect(-r, r * 0.2, r * 2, r);
      g.fillStyle = '#ff8a1f'; g.fillRect(-r, -r * 0.3, r * 2, r * 0.5);
      g.fillStyle = '#fff8ea'; g.fillRect(-r, -r, r * 2, r * 0.7);
      g.restore(); g.stroke();
      break;
    }
    default: {
      ui.roundRect(g, -r * 0.8, -r * 0.55, r * 1.6, r * 1.1, r * 0.3); g.fillStyle = '#ff8fc7'; g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(-r * 0.12, -r * 0.55, r * 0.24, r * 1.1);
      g.fillStyle = '#ff4d8d';
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * 0.28, -r * 0.62, r * 0.28, r * 0.16, s * 0.4, 0, TAU); g.fill(); g.stroke(); }
      break;
    }
  }
  g.restore();
}

/** Jack-o'-lantern trick-or-treat bucket centred at the origin, S = size; candy piled on top. */
export function drawBucket(g, S, sweets, drawC) {
  g.save(); g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, S * 0.05);
  // handle
  g.beginPath(); g.ellipse(0, -S * 0.28, S * 0.36, S * 0.34, 0, Math.PI, 0); g.stroke();
  // candy pile
  for (let i = 0; i < sweets.length; i++) {
    const sw = sweets[i];
    drawC(sw.kind, sw.x * S, -S * 0.3 - Math.floor(i / 3) * S * 0.1, S * 0.15, sw.r);
  }
  g.beginPath(); g.ellipse(0, 0, S * 0.42, S * 0.36, 0, 0, TAU); g.fillStyle = '#ff8a1f'; g.fill(); g.stroke();
  g.fillStyle = '#ffb34d'; g.beginPath(); g.ellipse(0, -S * 0.28, S * 0.36, S * 0.09, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY;
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * S * 0.15, -S * 0.03, S * 0.06, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(0, S * 0.06, S * 0.16, 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = S * 0.05; g.stroke();
  g.restore();
}

/** A cute little bat (faces right) flapping. */
export function drawBat(g, t, color = '#8a5cd6') {
  const f = Math.sin(t * 14);
  g.save(); g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 3; g.fillStyle = color;
  for (const s of [-1, 1]) {
    g.save(); g.scale(s, 1); g.rotate(f * 0.5);
    g.beginPath(); g.moveTo(8, -4); g.quadraticCurveTo(30, -26, 52, -12); g.quadraticCurveTo(44, -4, 46, 4); g.quadraticCurveTo(36, 0, 32, 8); g.quadraticCurveTo(22, 2, 8, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  g.beginPath(); g.ellipse(0, 0, 15, 14, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-10, -9); g.lineTo(-8, -22); g.lineTo(-2, -12); g.moveTo(10, -9); g.lineTo(8, -22); g.lineTo(2, -12); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-5, -2, 4, 0, TAU); g.arc(5, -2, 4, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-4, -1, 2, 0, TAU); g.arc(6, -1, 2, 0, TAU); g.fill();
  g.lineWidth = 2; g.beginPath(); g.arc(0, 4, 4, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.restore();
}

/** Big friendly moon with a sleepy smile and a soft glow. */
export function drawMoonFace(g, x, y, r, t) {
  g.save(); g.translate(x, y);
  const gr = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.2);
  gr.addColorStop(0, 'rgba(255,240,180,0.45)'); gr.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 2.2, 0, TAU); g.fill();
  g.fillStyle = '#fff1b8'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.05);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(230,200,120,0.5)';
  for (const [cx, cy, cr] of [[-0.45, -0.4, 0.14], [0.4, 0.35, 0.1], [0.5, -0.5, 0.08]]) { g.beginPath(); g.arc(cx * r, cy * r, cr * r, 0, TAU); g.fill(); }
  g.lineCap = 'round';
  const bl = Math.sin(t * 0.7) > 0.96;
  for (const s of [-1, 1]) { g.beginPath(); if (bl) { g.moveTo(s * r * 0.3 - r * 0.1, -r * 0.08); g.lineTo(s * r * 0.3 + r * 0.1, -r * 0.08); } else g.arc(s * r * 0.3, -r * 0.05, r * 0.1, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  g.beginPath(); g.arc(0, r * 0.15, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,130,160,0.35)'; g.beginPath(); g.ellipse(-r * 0.5, r * 0.18, r * 0.13, r * 0.08, 0, 0, TAU); g.ellipse(r * 0.5, r * 0.18, r * 0.13, r * 0.08, 0, 0, TAU); g.fill();
  g.restore();
}

/** Static background (cached by the game): night sky, cottage, fence, scarecrow, patch. */
export function drawPatchBackground(g, W, H, holes) {
  const HZ = 370;
  const sky = g.createLinearGradient(0, 0, 0, HZ);
  sky.addColorStop(0, '#1b1450'); sky.addColorStop(0.6, '#4a2c86'); sky.addColorStop(1, '#8a5aa8');
  g.fillStyle = sky; g.fillRect(0, 0, W, HZ);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) { g.globalAlpha = 0.3 + ((i * 37) % 10) / 15; const s = 1.5 + (i % 3); g.fillRect((i * 211) % W, (i * 53) % 300, s, s); }
  g.globalAlpha = 1;
  // soft clouds
  for (let i = 0; i < 4; i++) ui.cloud(g, 300 + i * 470, 120 + (i % 2) * 70, 0.9, '#b79ad8', 0.35);
  // far hills
  g.fillStyle = '#5a3a8a'; g.beginPath(); g.moveTo(0, HZ);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, 300 - Math.sin(x * 0.004) * 30 - Math.sin(x * 0.011) * 14);
  g.lineTo(W, HZ); g.closePath(); g.fill();
  g.fillStyle = '#43306e'; g.beginPath(); g.moveTo(0, HZ);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, 335 - Math.sin(x * 0.006 + 2) * 20);
  g.lineTo(W, HZ); g.closePath(); g.fill();
  // cottage
  g.save(); g.translate(200, 352); g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.fillStyle = '#a0603a'; g.fillRect(-90, -110, 180, 110); g.strokeRect(-90, -110, 180, 110);
  g.fillStyle = '#6b3f8f'; g.beginPath(); g.moveTo(-110, -105); g.lineTo(0, -190); g.lineTo(110, -105); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#7a4a2a'; g.fillRect(40, -200, 26, 50); g.strokeRect(40, -200, 26, 50);
  for (const wx of [-50, 50]) {
    const gr = g.createRadialGradient(wx, -62, 4, wx, -62, 60); gr.addColorStop(0, 'rgba(255,200,90,0.6)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = gr; g.fillRect(wx - 60, -122, 120, 120);
    g.fillStyle = '#ffd36a'; g.fillRect(wx - 22, -84, 44, 44); g.strokeRect(wx - 22, -84, 44, 44);
    g.beginPath(); g.moveTo(wx, -84); g.lineTo(wx, -40); g.moveTo(wx - 22, -62); g.lineTo(wx + 22, -62); g.stroke();
  }
  g.fillStyle = '#5a3420'; ui.roundRect(g, -14, -50, 28, 50, 12); g.fill(); g.stroke();
  g.restore();
  // lantern string from the cottage
  g.strokeStyle = '#2a1a3e'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(290, 262); for (let i = 0; i <= 7; i++) g.lineTo(330 + i * 62, 268 + Math.sin(i * 0.9) * 8 + i * 4); g.stroke();
  for (let i = 0; i < 7; i++) {
    const lx = 330 + i * 62, ly = 268 + Math.sin(i * 0.9) * 8 + i * 4;
    g.fillStyle = ['#ff9f1c', '#ffb347', '#ff7a3c'][i % 3]; g.beginPath(); g.ellipse(lx, ly + 10, 14, 12, 0, 0, TAU); g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
  }
  // fence
  g.strokeStyle = NAVY; g.lineWidth = 3;
  for (let x = 560; x < W; x += 70) { g.fillStyle = '#9a6a48'; ui.roundRect(g, x, 318, 16, 62, 5); g.fill(); g.stroke(); }
  g.fillStyle = '#b07a52'; g.fillRect(540, 332, W, 10); g.strokeRect(540, 332, W, 10); g.fillRect(540, 356, W, 10); g.strokeRect(540, 356, W, 10);
  // scarecrow (friendly)
  g.save(); g.translate(1240, 372); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.fillStyle = '#7a5a3a'; g.fillRect(-5, -150, 10, 150); g.strokeRect(-5, -150, 10, 150); g.fillRect(-70, -118, 140, 9); g.strokeRect(-70, -118, 140, 9);
  g.fillStyle = '#5a9be0'; ui.roundRect(g, -34, -124, 68, 76, 12); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 66, -118); g.lineTo(s * 84, -128); g.lineTo(s * 82, -108); g.closePath(); g.fill(); }
  g.fillStyle = '#ffe0b0'; g.beginPath(); g.arc(0, -150, 28, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#c0843c'; g.beginPath(); g.ellipse(0, -172, 50, 10, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-26, -172); g.quadraticCurveTo(0, -214, 26, -172); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-10, -152, 4, 0, TAU); g.arc(10, -152, 4, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, -144, 12, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,100,140,0.45)'; g.beginPath(); g.arc(-18, -140, 5, 0, TAU); g.arc(18, -140, 5, 0, TAU); g.fill();
  g.restore();
  // ground
  const gr = g.createLinearGradient(0, HZ, 0, H);
  gr.addColorStop(0, '#355f34'); gr.addColorStop(0.5, '#3f7038'); gr.addColorStop(1, '#2f5a2c');
  g.fillStyle = gr; g.fillRect(0, HZ, W, H - HZ);
  // soil rows under the holes
  const rows = [...new Set(holes.map((h) => h.y))];
  for (const y of rows) {
    g.fillStyle = 'rgba(110,70,40,0.35)';
    g.beginPath(); g.ellipse(W / 2, y + 4, 860, 46 + (y - 400) * 0.04, 0, 0, TAU); g.fill();
  }
  // grass tufts
  g.strokeStyle = '#5c9a4c'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const x = (i * 157) % W, y = HZ + 20 + ((i * 89) % (H - HZ - 30));
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y - 10); g.moveTo(x, y); g.lineTo(x + 4, y - 11); g.stroke();
  }
  // curly vines
  g.strokeStyle = '#2f7a32'; g.lineWidth = 5;
  for (let i = 0; i < 10; i++) {
    const x0 = (i * 211) % W, y0 = 420 + ((i * 97) % 540);
    g.beginPath(); g.moveTo(x0, y0);
    for (let k = 1; k <= 14; k++) g.lineTo(x0 + k * 14, y0 + Math.sin(k * 0.9 + i) * 14);
    g.stroke();
    g.beginPath(); g.arc(x0 + 200, y0 + Math.sin(14 * 0.9 + i) * 14 - 10, 10, 0, Math.PI * 1.6); g.stroke();
    g.fillStyle = '#4fae4a';
    g.beginPath(); g.ellipse(x0 + 80, y0 - 10, 16, 9, 0.5, 0, TAU); g.fill();
  }
  // little decor pumpkins at the edges
  const deco = [[60, 470, 0.35], [1860, 520, 0.4], [1840, 760, 0.32], [70, 720, 0.3]];
  for (const [x, y, s] of deco) { g.save(); g.translate(x, y); drawPumpkin(g, 170 * s, 'giggle', { t: 0 }); g.restore(); }
  // hay bales (bottom right; bottom left stays clear for the info button)
  g.save(); g.translate(1780, 960); g.strokeStyle = NAVY; g.lineWidth = 4;
  g.fillStyle = '#e8c15a'; ui.roundRect(g, -110, -70, 220, 90, 16); g.fill(); g.stroke();
  g.strokeStyle = '#b98f2a'; g.lineWidth = 3; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-100, -40 + i * 12); g.lineTo(100, -40 + i * 12); g.stroke(); }
  g.restore();
}
