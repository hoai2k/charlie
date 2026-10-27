// Butterfly Ballet: procedural art (teacher, butterflies, move pictograms,
// tutu, background). Every piece first tries its generated art key
// (image-requests.md, "New Molly Party game: ballet-butterflies").
import { W, H } from '../../engine/canvas.js';
import { art, drawArt } from '../../engine/art.js';
import { TAU, clamp, lerp } from '../../engine/util.js';
import { outfitAnchors } from '../../engine/outfits.js';

export const NAVY = '#24163f';
export const BFLY = [
  { id: 'pink', c: '#ff7ac6', d: '#d94f9f', l: '#ffd0ea' },
  { id: 'blue', c: '#6fd0ff', d: '#3a9fd6', l: '#d8f3ff' },
  { id: 'yellow', c: '#ffd23f', d: '#ff9f1c', l: '#fff3b0' },
  { id: 'purple', c: '#b98bff', d: '#8a5ce0', l: '#eadcff' },
];

const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// --- butterflies --------------------------------------------------------------
/** A butterfly seen from above, centred at (x, y), `s` = wingspan px, flap 0..1 (1 = open). */
export function drawButterfly(g, x, y, s, col, flap = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const fx = 0.25 + 0.75 * Math.abs(flap);
  g.scale(fx, 1);
  if (!drawArt(g, 'prop/ballet-butterfly-' + col.id, 0, 0, s, s)) {
    g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(1.5, s * 0.045);
    for (const side of [-1, 1]) {
      // upper wing
      g.fillStyle = col.c;
      g.beginPath(); g.moveTo(0, -s * 0.05);
      g.bezierCurveTo(side * s * 0.25, -s * 0.5, side * s * 0.55, -s * 0.38, side * s * 0.46, -s * 0.06);
      g.quadraticCurveTo(side * s * 0.3, s * 0.04, 0, s * 0.02); g.closePath(); g.fill(); g.stroke();
      // lower wing
      g.fillStyle = col.d;
      g.beginPath(); g.moveTo(0, s * 0.02);
      g.bezierCurveTo(side * s * 0.36, s * 0.04, side * s * 0.36, s * 0.36, side * s * 0.14, s * 0.32);
      g.quadraticCurveTo(side * s * 0.04, s * 0.26, 0, s * 0.1); g.closePath(); g.fill(); g.stroke();
      // spots
      g.fillStyle = col.l;
      g.beginPath(); g.arc(side * s * 0.27, -s * 0.2, s * 0.075, 0, TAU); g.fill();
      g.beginPath(); g.arc(side * s * 0.16, s * 0.17, s * 0.045, 0, TAU); g.fill();
    }
    g.fillStyle = NAVY;
    g.beginPath(); g.ellipse(0, s * 0.03, s * 0.04, s * 0.2, 0, 0, TAU); g.fill();
    g.lineWidth = Math.max(1, s * 0.03);
    g.beginPath(); g.moveTo(0, -s * 0.14); g.quadraticCurveTo(-s * 0.06, -s * 0.3, -s * 0.12, -s * 0.3);
    g.moveTo(0, -s * 0.14); g.quadraticCurveTo(s * 0.06, -s * 0.3, s * 0.12, -s * 0.3); g.stroke();
  }
  g.restore();
}

export function drawPetal(g, x, y, s, rot, c = '#ff9fcf') {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (!drawArt(g, 'prop/ballet-petal', 0, 0, s, s)) {
    g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.3, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-s * 0.12, -s * 0.06, s * 0.2, s * 0.09, 0, 0, TAU); g.fill();
  }
  g.restore();
}

// --- the teacher ---------------------------------------------------------------
/**
 * Madame Papillon, a butterfly fairy. (x, y) = her feet, h = height.
 * move: null|'up'|'twirl'|'plie'|'side'|'bow'; k = 0..1 progress of the demo.
 */
export function drawTeacher(g, x, y, h, t, move = null, k = 0, sideDir = 1) {
  const amt = move ? Math.sin(clamp(k, 0, 1) * Math.PI) : 0;   // in-and-out of the pose
  let dx = 0, dy = Math.sin(t * 2.4) * 10, sx = 1, tilt = 0;
  if (move === 'plie') dy += amt * h * 0.12;
  if (move === 'up') dy -= amt * h * 0.08;
  if (move === 'side') { dx = sideDir * amt * h * 0.28; tilt = sideDir * amt * 0.12; }
  if (move === 'twirl') { dy -= amt * h * 0.06; tilt = Math.sin(k * TAU * 2) * 0.06 * amt; }   // the twirl art + a little rise (no paper squash)
  if (move === 'bow') tilt = amt * 0.35;
  // shadow
  g.save(); g.fillStyle = 'rgba(36,22,63,0.18)';
  g.beginPath(); g.ellipse(x + dx, y + 14, h * 0.2 * (1 - dy / 200), h * 0.045, 0, 0, TAU); g.fill(); g.restore();
  g.save(); g.translate(x + dx, y - 20 + dy); g.rotate(tilt);
  const key = move ? 'prop/ballet-teacher-' + move : 'prop/ballet-teacher';
  const img = art(key) || art('prop/ballet-teacher');
  if (img) {
    g.scale(Math.abs(sx) < 0.15 ? 0.15 * Math.sign(sx || 1) : sx, 1);
    drawArt(g, art(key) ? key : 'prop/ballet-teacher', 0, 0, h * 0.8, h, { anchor: 'bottom' });
    g.restore(); return;
  }
  const s = h / 300;
  g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // wings (behind) - big butterfly wings, flapping
  const flap = 0.8 + 0.2 * Math.sin(t * 6);
  for (const side of [-1, 1]) {
    g.save(); g.translate(0, -190); g.scale(side * flap * Math.max(0.35, Math.abs(sx)), 1);
    const gr = g.createLinearGradient(0, -120, 150, 60);
    gr.addColorStop(0, '#ff9fd8'); gr.addColorStop(0.5, '#b98bff'); gr.addColorStop(1, '#6fd0ff');
    g.fillStyle = gr; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(40, -150, 190, -170, 170, -40); g.quadraticCurveTo(130, 10, 0, 10); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.moveTo(0, 10); g.bezierCurveTo(110, 10, 140, 110, 70, 120); g.quadraticCurveTo(20, 110, 0, 30); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [px, py, r] of [[110, -80, 18], [140, -40, 11], [70, -110, 10], [70, 70, 12]]) { g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); }
    g.restore();
  }
  g.scale(sx < 0 ? -Math.max(0.25, -sx) : Math.max(0.25, sx), 1);
  const skin = '#ffe0cc';
  // legs (ballet slippers)
  g.strokeStyle = NAVY; g.lineWidth = 12;
  const legSpread = move === 'plie' ? 34 * amt : 0, legOut = move === 'side' ? 40 * amt : 0;
  for (const side of [-1, 1]) {
    const lx = side * (14 + legSpread) + (side === sideDir ? legOut : 0);
    g.strokeStyle = NAVY; g.lineWidth = 14;
    g.beginPath(); g.moveTo(side * 12, -110); g.quadraticCurveTo(side * (16 + legSpread * 1.4), -60, lx, -6); g.stroke();
    g.strokeStyle = skin; g.lineWidth = 8;
    g.beginPath(); g.moveTo(side * 12, -110); g.quadraticCurveTo(side * (16 + legSpread * 1.4), -60, lx, -6); g.stroke();
    g.fillStyle = '#ff7ac6'; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.ellipse(lx + side * 4, -4, 11, 6, 0, 0, TAU); g.fill(); g.stroke();
  }
  // tutu
  g.fillStyle = '#ffc4e6'; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI, rr = i % 2 ? 78 : 66;
    const px = Math.cos(a) * rr, py = -118 + Math.sin(-a) * 14 + (i % 2 ? 8 : 0);
    if (!i) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.quadraticCurveTo(0, -150, -66, -118); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ff7ac6';
  g.beginPath(); g.ellipse(0, -126, 60, 10, 0, 0, TAU); g.fill(); g.stroke();
  // body (leotard)
  g.fillStyle = '#ff7ac6';
  g.beginPath(); g.moveTo(-22, -128); g.quadraticCurveTo(-26, -175, -20, -195); g.lineTo(20, -195); g.quadraticCurveTo(26, -175, 22, -128); g.closePath(); g.fill(); g.stroke();
  // arms
  const armPose = (side) => {
    if (move === 'up') return [[side * 22, -190], [side * (30 - 10 * amt), -230 - 30 * amt], [side * (12 + 30 * (1 - amt)), -270 * amt + -170 * (1 - amt)]];
    if (move === 'plie') return [[side * 22, -190], [side * (46 + 10 * amt), -160 + 20 * amt], [side * (30 - 10 * amt), -130 + 10 * amt]];
    if (move === 'side') return [[side * 22, -190], [side * 70, -200 - (side === sideDir ? 20 : -10) * amt], [side * 110, -210 - (side === sideDir ? 40 : -20) * amt]];
    if (move === 'twirl') return [[side * 22, -190], [side * 50, -225], [side * 10, -255]];
    if (move === 'bow') return [[side * 22, -190], [side * 50, -150], [side * 70, -130]];
    return [[side * 22, -190], [side * 44, -160 + Math.sin(t * 2 + side) * 6], [side * 54, -130]];
  };
  for (const side of [-1, 1]) {
    const [a, b, c] = armPose(side);
    g.strokeStyle = NAVY; g.lineWidth = 12; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...b, ...c); g.stroke();
    g.strokeStyle = skin; g.lineWidth = 6.5; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...b, ...c); g.stroke();
    if (side === 1) { // wand
      g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.moveTo(...c); g.lineTo(c[0] + 18, c[1] - 22); g.stroke();
      g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(c[0] + 20, c[1] - 25, 7 + Math.sin(t * 8) * 1.5, 0, TAU); g.fill();
    }
  }
  // head
  g.fillStyle = skin; g.strokeStyle = NAVY; g.lineWidth = 4.5;
  g.beginPath(); g.arc(0, -228, 30, 0, TAU); g.fill(); g.stroke();
  // hair + bun
  g.fillStyle = '#b98bff';
  g.beginPath(); g.arc(0, -236, 31, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, -270, 17, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(13, -262, 5, 0, TAU); g.fill();
  // face
  g.fillStyle = NAVY;
  if (move === 'twirl' || move === 'bow') {
    g.lineWidth = 3; g.strokeStyle = NAVY;
    g.beginPath(); g.arc(-10, -226, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(10, -226, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  } else { g.beginPath(); g.arc(-10, -226, 3.6, 0, TAU); g.arc(10, -226, 3.6, 0, TAU); g.fill(); }
  g.fillStyle = '#ff9fb8'; g.beginPath(); g.arc(-18, -216, 5, 0, TAU); g.arc(18, -216, 5, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.arc(0, -216, 7, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  // antennae
  g.lineWidth = 3;
  for (const side of [-1, 1]) {
    g.beginPath(); g.moveTo(side * 8, -255); g.quadraticCurveTo(side * 24, -292, side * 30 + Math.sin(t * 4) * 3, -300); g.stroke();
    g.fillStyle = '#ff7ac6'; g.beginPath(); g.arc(side * 30 + Math.sin(t * 4) * 3, -300, 6, 0, TAU); g.fill(); g.stroke();
  }
  g.restore();
}

// --- move pictograms -------------------------------------------------------------
/** A little ballerina silhouette doing `move`, centred in a box of size `s`. */
export function drawMovePicto(g, move, x, y, s, t) {
  if (drawArt(g, 'prop/ballet-move-' + move, x, y, s, s)) return;
  const k = 0.5 + 0.5 * Math.sin(t * 6);
  g.save(); g.translate(x, y); g.scale(s / 240, s / 240);
  g.lineCap = 'round'; g.lineJoin = 'round';
  let bodyDy = 0, spin = 1;
  if (move === 'plie') bodyDy = 18 + 14 * k;
  if (move === 'up') bodyDy = -8 * k;
  if (move === 'twirl') spin = Math.sin(t * 4.5) >= 0 ? 1 : -1;   // turns by switching sides, never a paper squash
  // motion lines
  g.strokeStyle = '#b98bff'; g.lineWidth = 8;
  if (move === 'twirl') { for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(0, 40 - i * 60, 82, 18, 0, 0.1 + i, Math.PI * 1.3 + i); g.stroke(); } }
  if (move === 'side') { for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-100, -30 + i * 30); g.lineTo(-60, -30 + i * 30); g.stroke(); } }
  if (move === 'up') { for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 70, -70); g.lineTo(sx * 80, -100); g.stroke(); } }
  if (move === 'plie') { g.beginPath(); g.moveTo(-90, 100); g.quadraticCurveTo(0, 80, 90, 100); g.stroke(); }
  g.translate(move === 'side' ? 20 + 14 * k : 0, bodyDy);
  g.scale(spin, 1);
  g.strokeStyle = '#ff5aa8'; g.lineWidth = 18;
  // legs
  g.beginPath();
  if (move === 'plie') { g.moveTo(-8, 20); g.lineTo(-40, 60); g.lineTo(-30, 96 - bodyDy); g.moveTo(8, 20); g.lineTo(40, 60); g.lineTo(30, 96 - bodyDy); }
  else if (move === 'side') { g.moveTo(-6, 20); g.lineTo(-18, 96); g.moveTo(6, 20); g.lineTo(56, 90); }
  else if (move === 'twirl') { g.moveTo(0, 20); g.lineTo(0, 98); g.moveTo(4, 30); g.lineTo(30, 55); g.lineTo(6, 62); }
  else { g.moveTo(-8, 20); g.lineTo(-14, 98); g.moveTo(8, 20); g.lineTo(14, 98); }
  g.stroke();
  // tutu
  g.fillStyle = '#ffc4e6'; g.strokeStyle = '#ff5aa8'; g.lineWidth = 6;
  g.beginPath(); g.ellipse(0, 14, 56, 15, 0, 0, TAU); g.fill(); g.stroke();
  // body
  g.strokeStyle = '#ff5aa8'; g.lineWidth = 26; g.beginPath(); g.moveTo(0, 6); g.lineTo(0, -40); g.stroke();
  // arms
  g.lineWidth = 15; g.beginPath();
  if (move === 'up') { g.moveTo(-8, -40); g.quadraticCurveTo(-36, -80, -12, -112); g.moveTo(8, -40); g.quadraticCurveTo(36, -80, 12, -112); }
  else if (move === 'plie') { g.moveTo(-8, -36); g.quadraticCurveTo(-56, -20, -26, 4); g.moveTo(8, -36); g.quadraticCurveTo(56, -20, 26, 4); }
  else if (move === 'side') { g.moveTo(-8, -40); g.lineTo(-70, -50); g.moveTo(8, -40); g.lineTo(76, -62); }
  else { g.moveTo(-8, -40); g.quadraticCurveTo(-40, -70, -6, -100); g.moveTo(8, -40); g.quadraticCurveTo(48, -40, 54, -10); }
  g.stroke();
  // head
  g.fillStyle = '#ff5aa8'; g.beginPath(); g.arc(0, -66, 24, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, -94, 12, 0, TAU); g.fill();
  g.restore();
}

// --- tutu for dancers ---------------------------------------------------------------
// Which characters get a tutu (two-legged ones; the four-legged friends, the
// cake and Hotdog keep their wings and crowns only).
const TUTU_OK = new Set(['princess-amber', 'kpop-girls', 'felicity', 'bronze', 'snowstar', 'marina', 'scale']);
export const wantsTutu = (charId) => TUTU_OK.has(charId);

/** Attachment: a ruffly tutu around the waist (forward space, feet at 0). */
export function drawTutu(g, def, info, col, t) {
  const A = outfitAnchors(def, info);
  if (A.fit && A.fit.quad) return;
  const h = A.h;
  const mermaid = def.asset && /marina|scale/.test(def.asset);
  const y = lerp(A.neck.y, 0, mermaid ? 0.32 : 0.4), x = lerp(A.neck.x, 0, 0.5);
  const w = clamp(A.faceW * 1.5, h * 0.26, h * 0.5), hgt = w * 0.32;
  g.save(); g.translate(x, y); g.rotate(A.bodyTilt || 0);
  g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(1.6, h * 0.012);
  const wob = Math.sin(t * 7) * 0.04;
  for (const [sc, c, a] of [[1, col.l, 0.92], [0.78, col.c, 0.95]]) {
    g.globalAlpha = a; g.fillStyle = c;
    g.beginPath();
    const n = 9;
    g.moveTo(-w * 0.32 * sc, -hgt * 0.4);
    for (let i = 0; i <= n; i++) {
      const u = i / n, px = lerp(-w * 0.5, w * 0.5, u) * sc * (1 + wob);
      const py = hgt * (0.55 + 0.25 * Math.sin(u * Math.PI)) * sc + (i % 2 ? hgt * 0.2 : 0);
      g.lineTo(px, py);
    }
    g.lineTo(w * 0.32 * sc, -hgt * 0.4); g.closePath(); g.fill(); g.stroke();
  }
  g.globalAlpha = 1; g.fillStyle = col.d;
  g.beginPath(); g.ellipse(0, -hgt * 0.35, w * 0.33, hgt * 0.22, 0, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

// --- background ------------------------------------------------------------------
export function drawStageBg(g, t, lights = 0) {
  const bg = art('bg/ballet-butterflies');
  if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
  const sky = g.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, '#c9b2ff'); sky.addColorStop(0.55, '#ffc8e4'); sky.addColorStop(1, '#ffe6c8');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // sun glow
  const sg = g.createRadialGradient(960, 520, 20, 960, 520, 620);
  sg.addColorStop(0, 'rgba(255,248,210,0.9)'); sg.addColorStop(1, 'rgba(255,248,210,0)');
  g.fillStyle = sg; g.fillRect(0, 0, W, H);
  // clouds
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 6; i++) {
    const cx = ((hh(i) * W + t * (8 + i * 3)) % (W + 400)) - 200, cy = 150 + hh(i + 5) * 260;
    for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(cx + j * 48, cy + Math.sin(j * 2) * 10, 40 + (j % 2) * 18, 0, TAU); g.fill(); }
  }
  // garden hills
  g.fillStyle = '#9fe0a0';
  g.beginPath(); g.moveTo(0, 640); for (let x = 0; x <= W; x += 40) g.lineTo(x, 600 + Math.sin(x * 0.004 + 1) * 40); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  g.fillStyle = '#7fd08a';
  g.beginPath(); g.moveTo(0, 690); for (let x = 0; x <= W; x += 40) g.lineTo(x, 660 + Math.sin(x * 0.006 + 3) * 28); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  // tulips along the back
  for (let i = 0; i < 26; i++) {
    const x = 30 + i * 74 + hh(i) * 30, y = 650 + hh(i + 3) * 40;
    const c = ['#ff7ac6', '#ffd23f', '#b98bff', '#ff4d6d', '#6fd0ff'][i % 5];
    g.strokeStyle = '#3c9c55'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y + 60); g.lineTo(x + Math.sin(t + i) * 3, y); g.stroke();
    g.fillStyle = c; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x - 14, y - 18); g.lineTo(x - 7, y - 4); g.lineTo(x, y - 20); g.lineTo(x + 7, y - 4); g.lineTo(x + 14, y - 18); g.quadraticCurveTo(x + 16, y + 8, x, y + 8); g.quadraticCurveTo(x - 16, y + 8, x - 14, y - 18); g.fill(); g.stroke();
  }
  // flower stage: a giant flower
  g.save(); g.translate(960, 885);
  g.lineJoin = 'round';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    g.save(); g.scale(1, 0.26); g.rotate(a);
    g.fillStyle = i % 2 ? '#ff9fd0' : '#ffb8dc'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.ellipse(700, 0, 300, 210, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  g.scale(1, 0.26);
  const fl = g.createRadialGradient(0, 0, 50, 0, 0, 820);
  fl.addColorStop(0, '#fff3fa'); fl.addColorStop(0.7, '#ffd6ec'); fl.addColorStop(1, '#ffc0e0');
  g.fillStyle = fl; g.strokeStyle = NAVY; g.lineWidth = 6;
  g.beginPath(); g.ellipse(0, 0, 820, 760, 0, 0, TAU); g.fill(); g.stroke();
  // spotlight pools
  g.globalAlpha = 0.25 + lights * 0.25;
  g.fillStyle = '#fffbe0';
  g.beginPath(); g.ellipse(0, 0, 600, 520, 0, 0, TAU); g.fill();
  g.restore();
  // rose-and-vine arches on the sides
  for (const side of [-1, 1]) {
    const bx = side < 0 ? 0 : W;
    g.save(); g.translate(bx, 0); g.scale(-side, 1);
    g.fillStyle = '#4fae62'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(150, 0); g.quadraticCurveTo(250, 320, 170, 640); g.quadraticCurveTo(130, 900, 200, H); g.lineTo(0, H); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#6cc77b';
    for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(120 + Math.sin(i * 1.7) * 50, 40 + i * 75, 34, 18, Math.sin(i) * 0.8, 0, TAU); g.fill(); g.stroke(); }
    for (let i = 0; i < 9; i++) {
      const rx = 120 + Math.cos(i * 2.3) * 60, ry = 80 + i * 110;
      g.fillStyle = ['#ff4d6d', '#ff7ac6', '#ffd23f'][i % 3];
      g.beginPath(); g.arc(rx, ry, 24, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(rx, ry, 11, 0, Math.PI * 1.5); g.stroke();
      g.strokeStyle = NAVY; g.lineWidth = 5;
    }
    g.restore();
  }
  // fairy lights across the top
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const u = i / 8, x = side < 0 ? 140 + u * 520 : W - 140 - u * 520, y = 130 + Math.sin(u * Math.PI) * 70;
      const on = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.3);
      g.fillStyle = `rgba(255,240,170,${0.35 * on})`; g.beginPath(); g.arc(x, y, 20, 0, TAU); g.fill();
      g.fillStyle = ['#fff6a8', '#ffc4e6', '#c8efff'][i % 3]; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
    }
  }
}
