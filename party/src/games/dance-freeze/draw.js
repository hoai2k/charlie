// Dance & Freeze - procedural art: the disco hall, the light-up floor, the DJ
// booth, the disco ball, the tickle feather, the DANCE/FREEZE icons and the
// thumbnail. Every piece asks for generated art first.
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { RAINBOW } from '../../engine/particles.js';
import { TAU, clamp, lerp } from '../../engine/util.js';
import { starPath } from '../../engine/emotes.js';

export const NAVY = '#24163f';
export const FLOOR = { y0: 600, y1: 1050 };
export const BOOTH = { x: 960, y: 572, w: 520 };
export const BALL = { x: 960, y: 0, len: 150 };

function line(g, w = 5) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round'; }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

let hallCache = null;
export function hallBackground() {
  if (hallCache) return hallCache;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const wall = g.createLinearGradient(0, 0, 0, FLOOR.y0);
  wall.addColorStop(0, '#2a1650'); wall.addColorStop(1, '#5a2a8a');
  g.fillStyle = wall; g.fillRect(0, 0, W, FLOOR.y0 + 4);
  // arch windows with a starry night
  for (const x of [300, 660, 1260, 1620]) {
    g.fillStyle = '#1a1040'; line(g, 6);
    g.beginPath(); g.moveTo(x - 90, 520); g.lineTo(x - 90, 260); g.arc(x, 260, 90, Math.PI, 0); g.lineTo(x + 90, 520); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff6c0';
    for (let k = 0; k < 9; k++) { const sx = x - 70 + ((k * 53) % 140), sy = 200 + ((k * 71) % 290); g.beginPath(); g.arc(sx, sy, 2 + (k % 2), 0, TAU); g.fill(); }
    g.strokeStyle = '#ffd36e'; g.lineWidth = 6; g.beginPath(); g.moveTo(x, 170); g.lineTo(x, 520); g.moveTo(x - 90, 380); g.lineTo(x + 90, 380); g.stroke();
  }
  // curtains
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? 0 : W;
    const gr = g.createLinearGradient(x0, 0, x0 - s * 180, 0);
    gr.addColorStop(0, '#c9305a'); gr.addColorStop(1, '#ff5a8a');
    g.fillStyle = gr; line(g, 6);
    g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 - s * 200, 0); g.quadraticCurveTo(x0 - s * 120, 300, x0 - s * 170, FLOOR.y0 + 60); g.lineTo(x0, FLOOR.y0 + 60); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(120,20,60,0.35)'; g.lineWidth = 4;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0 - s * 50 * k, 0); g.quadraticCurveTo(x0 - s * 40 * k, 300, x0 - s * 45 * k, FLOOR.y0 + 60); g.stroke(); }
    g.fillStyle = '#ffd23f'; line(g, 4); g.beginPath(); g.ellipse(x0 - s * 150, 330, 22, 12, 0, 0, TAU); g.fill(); g.stroke();
  }
  // string lights + paper stars
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2;
  g.beginPath(); for (let x = 0; x <= W; x += 30) { const y = 70 + Math.sin(x * 0.012) * 30; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  for (let x = 30, k = 0; x < W; x += 60, k++) { const y = 80 + Math.sin(x * 0.012) * 30; g.fillStyle = RAINBOW[k % RAINBOW.length]; g.beginPath(); g.ellipse(x, y, 7, 10, 0, 0, TAU); g.fill(); }
  for (const [x, y, r] of [[480, 170, 26], [1440, 160, 30], [820, 230, 18], [1110, 240, 20]]) { g.save(); g.translate(x, y); g.fillStyle = '#ffd23f'; line(g, 4); starPath(g, r); g.fill(); g.stroke(); g.restore(); }
  // speakers
  for (const x of [150, W - 150]) {
    g.fillStyle = '#3a2a5a'; line(g, 6); rr(g, x - 80, 340, 160, 250, 18); g.fill(); g.stroke();
    for (const [yy, r] of [[410, 42], [520, 56]]) { g.fillStyle = '#1a1030'; g.beginPath(); g.arc(x, yy, r, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(x, yy, r * 0.3, 0, TAU); g.fill(); }
  }
  // floor base
  g.fillStyle = '#20123a'; g.fillRect(0, FLOOR.y0, W, H - FLOOR.y0);
  hallCache = c;
  return c;
}

/** Light-up dance floor. mode: 'dance' (rainbow on the beat) | 'freeze' (icy) ; k = freeze blend. */
export function drawFloor(g, beat, k, t, party = 0) {
  const rows = 6, cols = 12, y0 = FLOOR.y0, y1 = FLOOR.y1;
  const top = W * 0.42, bot = W * 0.6;      // half-widths at top and bottom (perspective)
  for (let r = 0; r < rows; r++) {
    const ya = lerp(y0, y1, Math.pow(r / rows, 1.15)), yb = lerp(y0, y1, Math.pow((r + 1) / rows, 1.15));
    const wa = lerp(top, bot, r / rows), wb = lerp(top, bot, (r + 1) / rows);
    for (let c = 0; c < cols; c++) {
      const xa0 = W / 2 - wa + (2 * wa * c) / cols, xa1 = W / 2 - wa + (2 * wa * (c + 1)) / cols;
      const xb0 = W / 2 - wb + (2 * wb * c) / cols, xb1 = W / 2 - wb + (2 * wb * (c + 1)) / cols;
      const on = (Math.floor(beat) + r + c * (party ? 2 : 1)) % 3 === 0;
      let col;
      if (k > 0.5) col = (r + c) % 2 ? '#bfe9ff' : '#e6f7ff';
      else col = RAINBOW[(r * 3 + c + Math.floor(beat / 2)) % RAINBOW.length];
      g.globalAlpha = k > 0.5 ? 0.55 + 0.1 * Math.sin(t * 2 + r + c) : on ? 0.95 : 0.45;
      g.fillStyle = col;
      g.beginPath(); g.moveTo(xa0 + 3, ya + 2); g.lineTo(xa1 - 3, ya + 2); g.lineTo(xb1 - 3, yb - 2); g.lineTo(xb0 + 3, yb - 2); g.closePath(); g.fill();
    }
  }
  g.globalAlpha = 1;
}

/** Disco ball hanging from the ceiling; spin = angle, k = shine. */
export function drawDiscoBall(g, spin, shine, t) {
  const x = BALL.x, y = BALL.y + BALL.len;
  g.strokeStyle = '#d9a300'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y - 70); g.stroke();
  if (drawArt(g, 'prop/df-disco-ball', x - 75, BALL.y + BALL.len - 110, 150, 190, { anchor: 'topleft' })) return;
  const r = 70;
  g.save(); g.translate(x, y);
  g.fillStyle = '#c8d2e8'; line(g, 5); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.save(); g.clip();
  for (let row = -5; row <= 5; row++) {
    for (let col = -8; col <= 8; col++) {
      const a = col * 0.36 + (spin % 0.36);
      const sx = Math.sin(a) * r * Math.cos(row * 0.28), sy = row * 13;
      if (Math.cos(a) < 0) continue;
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

/** Spinning-light beams from the ball (dance only). */
export function drawBeams(g, spin, k, party) {
  if (k <= 0.01) return;
  const x = BALL.x, y = BALL.y + BALL.len;
  g.save(); g.globalCompositeOperation = 'lighter';
  const n = party ? 10 : 6;
  for (let i = 0; i < n; i++) {
    const a = spin * 0.7 + (i / n) * TAU;
    const tx = x + Math.cos(a) * 1200, ty = y + 300 + Math.abs(Math.sin(a)) * 700;
    const col = RAINBOW[i % RAINBOW.length];
    const gr = g.createLinearGradient(x, y, tx, ty);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.13 * k * (party ? 1.5 : 1);
    g.fillStyle = gr;
    const px = -(ty - y), py = tx - x, l = Math.hypot(px, py) || 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(tx + (px / l) * 90, ty + (py / l) * 90); g.lineTo(tx - (px / l) * 90, ty - (py / l) * 90); g.closePath(); g.fill();
  }
  g.restore();
}

/** DJ booth front (drawn over the DJ's legs). spin = record angle, pulse = beat pulse, icy = freeze blend. */
export function drawBooth(g, spin, pulse, icy, t) {
  const { x, y, w } = BOOTH, h = 150;
  if (!drawArt(g, 'prop/df-dj-booth', x, y, w, w * 300 / 560, { anchor: 'bottom' })) {
    g.fillStyle = '#ff9ad0'; line(g, 6); rr(g, x - w / 2, y - h, w, h, 26); g.fill(); g.stroke();
    // light strips
    for (let i = 0; i < 3; i++) {
      g.fillStyle = icy > 0.5 ? '#bfe9ff' : RAINBOW[(i * 2 + Math.floor(t * 4)) % RAINBOW.length];
      g.globalAlpha = icy > 0.5 ? 0.8 : 0.6 + 0.4 * pulse;
      rr(g, x - w / 2 + 30, y - h + 52 + i * 26, w - 60, 12, 6); g.fill();
    }
    g.globalAlpha = 1;
    // heart grille
    g.fillStyle = '#ff5aa0'; line(g, 4);
    g.beginPath(); const hx = x, hy = y - h + 26; g.moveTo(hx, hy + 12); g.bezierCurveTo(hx - 26, hy - 4, hx - 12, hy - 22, hx, hy - 8); g.bezierCurveTo(hx + 12, hy - 22, hx + 26, hy - 4, hx, hy + 12); g.fill(); g.stroke();
  }
  // turntable record on top (left)
  const rx = x - w * 0.15 - 60, ry = y - h - 4;
  g.save(); g.translate(rx, ry); g.scale(1, 0.32);
  g.fillStyle = '#d8c8f0'; line(g, 5); g.beginPath(); g.arc(0, 0, 78, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#1a1030'; g.beginPath(); g.arc(0, 0, 66, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; for (const r of [30, 44, 56]) { g.beginPath(); g.arc(0, 0, r, spin, spin + 1.6); g.stroke(); }
  g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(Math.cos(spin) * 12, Math.sin(spin) * 12, 4, 0, TAU); g.fill();
  g.restore();
  // second turntable
  g.save(); g.translate(x + w * 0.15 + 60, ry); g.scale(1, 0.32);
  g.fillStyle = '#d8c8f0'; line(g, 5); g.beginPath(); g.arc(0, 0, 78, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#1a1030'; g.beginPath(); g.arc(0, 0, 66, 0, TAU); g.fill();
  g.fillStyle = '#6fd0ff'; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill();
  g.restore();
}

/** Giant tickle feather; (x, y) = quill end, rot = angle. */
export function drawFeather(g, x, y, rot, s = 1, t = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (drawArt(g, 'prop/df-feather', 0, 0, 90, 220, { anchor: 'bottom' })) { g.restore(); return; }
  // vane
  const gr = g.createLinearGradient(0, -200, 0, 0);
  gr.addColorStop(0, '#ff9ad0'); gr.addColorStop(1, '#b98bff');
  g.fillStyle = gr; line(g, 4);
  g.beginPath(); g.moveTo(0, -20);
  for (let i = 0; i <= 10; i++) { const yy = -20 - i * 18; const w = Math.sin((i / 10) * Math.PI) * 40 + 6; g.lineTo(-w + Math.sin(t * 20 + i) * 3, yy); }
  for (let i = 10; i >= 0; i--) { const yy = -20 - i * 18; const w = Math.sin((i / 10) * Math.PI) * 40 + 6; g.lineTo(w + Math.sin(t * 20 + i + 1) * 3, yy - 6); }
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2;
  for (let i = 1; i < 10; i++) { const yy = -20 - i * 18; g.beginPath(); g.moveTo(0, yy); g.lineTo(-30, yy - 12); g.moveTo(0, yy); g.lineTo(30, yy - 12); g.stroke(); }
  // quill
  g.strokeStyle = NAVY; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -200); g.stroke();
  g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.stroke();
  g.restore();
}

/** Big FREEZE snowflake icon (with a cute face). */
export function drawSnowflake(g, x, y, r, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (drawArt(g, 'prop/df-snowflake', 0, 0, r * 2.2, r * 2.2)) { g.restore(); return; }
  g.lineCap = 'round';
  for (const [w, col] of [[r * 0.32, NAVY], [r * 0.2, '#8fdcff']]) {
    g.strokeStyle = col; g.lineWidth = w;
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate((i / 6) * TAU);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r);
      g.moveTo(0, -r * 0.6); g.lineTo(-r * 0.28, -r * 0.82); g.moveTo(0, -r * 0.6); g.lineTo(r * 0.28, -r * 0.82);
      g.stroke(); g.restore();
    }
  }
  g.fillStyle = '#e6f7ff'; line(g, Math.max(3, r * 0.08)); g.beginPath(); g.arc(0, 0, r * 0.42, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(-r * 0.14, -r * 0.05, r * 0.06, 0, TAU); g.arc(r * 0.14, -r * 0.05, r * 0.06, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.05); g.beginPath(); g.arc(0, r * 0.06, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.restore();
}

/** Big DANCE icon: two bouncing music notes. */
export function drawNotes(g, x, y, r, t) {
  g.save(); g.translate(x, y);
  if (drawArt(g, 'prop/df-music', 0, 0, r * 2.2, r * 2.2)) { g.restore(); return; }
  for (let i = 0; i < 2; i++) {
    const hop = Math.abs(Math.sin(t * 6 + i * 1.5)) * r * 0.25;
    const nx = (i ? 0.45 : -0.45) * r, ny = -hop + (i ? -0.05 : 0.05) * r;
    g.save(); g.translate(nx, ny); g.rotate((i ? 0.15 : -0.15));
    g.fillStyle = i ? '#3fa7ff' : '#ff4d9a'; line(g, Math.max(3, r * 0.08));
    g.beginPath(); g.ellipse(-r * 0.12, r * 0.45, r * 0.26, r * 0.19, -0.4, 0, TAU); g.fill(); g.stroke();
    g.fillRect(r * 0.08, -r * 0.6, r * 0.1, r * 1.05); g.strokeRect(r * 0.08, -r * 0.6, r * 0.1, r * 1.05);
    g.beginPath(); g.moveTo(r * 0.18, -r * 0.6); g.quadraticCurveTo(r * 0.55, -r * 0.4, r * 0.4, -r * 0.05); g.lineWidth = r * 0.12; g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = r * 0.06; g.strokeStyle = i ? '#3fa7ff' : '#ff4d9a'; g.stroke();
    g.restore();
  }
  g.restore();
}

export function drawIcon(g, x, y, w, h, t = 0) {
  const th = art('thumb/dance-freeze');
  if (th) { g.drawImage(th, x, y, w, h); return; }
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = w / 400; g.translate(x, y); g.scale(s, s);
  const hh = h / s;
  const bg = g.createLinearGradient(0, 0, 0, hh);
  bg.addColorStop(0, '#2a1650'); bg.addColorStop(1, '#6a2a9a');
  g.fillStyle = bg; g.fillRect(0, 0, 400, hh);
  // floor
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
    g.globalAlpha = (r + c + Math.floor(t * 3)) % 3 ? 0.45 : 0.95;
    g.fillStyle = c < 4 ? RAINBOW[(r + c) % 7] : '#bfe9ff';
    g.fillRect(c * 50 + 2, hh - 80 + r * 27, 46, 24);
  }
  g.globalAlpha = 1;
  // ball
  g.strokeStyle = '#d9a300'; g.lineWidth = 3; g.beginPath(); g.moveTo(200, 0); g.lineTo(200, 30); g.stroke();
  g.fillStyle = '#c8d2e8'; line(g, 4); g.beginPath(); g.arc(200, 58, 30, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(186 + (i % 3) * 10, 44 + Math.floor(i / 3) * 14, 7, 7);
  drawNotes(g, 95, 135, 52, t);
  drawSnowflake(g, 305, 135, 52, t * 0.5);
  drawFeather(g, 360, 240, -0.6 + Math.sin(t * 8) * 0.2, 0.45, t);
  g.restore();
}
