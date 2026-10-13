// Procedural art for No Jumping on the Bed! (bed-bounce). Every piece has an
// art() hook in the game file; these are the fallbacks that ship today.
import { W, H } from '../../engine/canvas.js';
import { TAU, clamp } from '../../engine/util.js';
function starPath(g, x, y, R, r, n = 5) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, d = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
  g.closePath();
}

export const NAVY = '#24163f';
export const BED = { x: 90, y: 440, w: 1400, h: 600, top: 760, x0: 330, x1: 1450 };
export const DOOR = { x: 1580, y: 380, w: 240, h: 550 };
export const CEIL = 178;
export const FLOOR = 930;
export function configureBedArt(hasArt) {
  BED.top = hasArt ? BED.y + BED.h * 0.51 : 760;
  BED.x0 = hasArt ? BED.x + BED.w * 0.17 + 10 : 330;
}

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function ink(g, w = 5) { g.strokeStyle = NAVY; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }

// --- room -------------------------------------------------------------------------------
let roomCache = null;
export function roomBackground() {
  if (roomCache) return roomCache;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // wallpaper
  const wall = g.createLinearGradient(0, 0, 0, FLOOR);
  wall.addColorStop(0, '#2b2160'); wall.addColorStop(1, '#4a3a8c');
  g.fillStyle = wall; g.fillRect(0, 0, W, FLOOR);
  // wallpaper stripes + tiny stars
  g.globalAlpha = 0.07; g.fillStyle = '#ffffff';
  for (let x = 0; x < W; x += 120) g.fillRect(x, 0, 50, FLOOR);
  g.globalAlpha = 1;
  for (let y = 140; y < FLOOR - 40; y += 90) for (let x = (y / 90) % 2 ? 60 : 0; x < W; x += 120) {
    g.save(); g.translate(x + 30, y); g.fillStyle = 'rgba(255,240,190,0.35)'; starPath(g, 0, 0, 7, 3, 5); g.fill(); g.restore();
  }
  // ceiling trim
  g.fillStyle = '#1d1645'; g.fillRect(0, 0, W, 130);
  g.fillStyle = '#5b4aa3'; g.fillRect(0, 128, W, 14);
  // skirting + floor
  const fl = g.createLinearGradient(0, FLOOR, 0, H);
  fl.addColorStop(0, '#8a5a3c'); fl.addColorStop(1, '#5e3a27');
  g.fillStyle = fl; g.fillRect(0, FLOOR, W, H - FLOOR);
  g.strokeStyle = 'rgba(40,20,10,0.35)'; g.lineWidth = 3;
  for (let y = FLOOR + 30; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = '#e8dcff'; g.fillRect(0, FLOOR - 26, W, 26);
  g.fillStyle = NAVY; g.fillRect(0, FLOOR - 2, W, 4);
  // rug
  g.fillStyle = '#ff9ccc'; g.beginPath(); g.ellipse(980, 1030, 620, 50, 0, 0, TAU); g.fill(); ink(g, 5);
  g.fillStyle = '#ffd1e8'; g.beginPath(); g.ellipse(980, 1030, 480, 34, 0, 0, TAU); g.fill();
  // round window with the moon
  const wx = 560, wy = 330, wr = 150;
  g.fillStyle = '#e8dcff'; g.beginPath(); g.arc(wx, wy, wr + 22, 0, TAU); g.fill(); ink(g, 6);
  const sky = g.createLinearGradient(0, wy - wr, 0, wy + wr);
  sky.addColorStop(0, '#0f1440'); sky.addColorStop(1, '#3b3d8f');
  g.fillStyle = sky; g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.clip();
  for (let k = 0; k < 22; k++) {
    const sx = wx - wr + ((k * 97) % (wr * 2)), sy = wy - wr + ((k * 61) % (wr * 2));
    g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(sx, sy, 2 + (k % 3), 0, TAU); g.fill();
  }
  // crescent moon with a sleepy face
  g.fillStyle = '#fff1a8'; g.beginPath(); g.arc(wx + 20, wy - 10, 78, 0, TAU); g.fill();
  g.fillStyle = '#1b1f55'; g.beginPath(); g.arc(wx + 58, wy - 34, 70, 0, TAU); g.fill();
  g.strokeStyle = '#c89a30'; g.lineWidth = 4; g.beginPath(); g.arc(wx - 22, wy + 4, 10, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = '#ffb3c8'; g.beginPath(); g.arc(wx - 18, wy + 30, 9, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = '#e8dcff'; g.lineWidth = 12;
  g.beginPath(); g.moveTo(wx - wr, wy); g.lineTo(wx + wr, wy); g.moveTo(wx, wy - wr); g.lineTo(wx, wy + wr); g.stroke();
  g.beginPath(); g.arc(wx, wy, wr, 0, TAU); ink(g, 6);
  // curtains
  for (const s of [-1, 1]) {
    g.fillStyle = '#7a5bd6';
    g.beginPath(); g.moveTo(wx + s * 120, 150); g.quadraticCurveTo(wx + s * 230, 330, wx + s * 190, 520);
    g.lineTo(wx + s * 250, 520); g.quadraticCurveTo(wx + s * 270, 320, wx + s * 250, 150); g.closePath(); g.fill(); ink(g, 5);
  }
  g.fillStyle = '#d9b26a'; rr(g, wx - 280, 140, 560, 16, 8); g.fill(); ink(g, 4);
  // shelf with books and toys
  const shx = 1100, shy = 360;
  g.fillStyle = '#b07a4f'; rr(g, shx, shy, 340, 22, 6); g.fill(); ink(g, 4);
  const books = ['#ff6fb1', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff'];
  books.forEach((col, k) => { g.fillStyle = col; rr(g, shx + 20 + k * 34, shy - 90 + (k % 2) * 14, 30, 90 - (k % 2) * 14, 5); g.fill(); ink(g, 4); });
  // toy ball and a little rocket
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(shx + 240, shy - 34, 34, 0, TAU); g.fill(); ink(g, 4);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(shx + 230, shy - 44, 9, 0, TAU); g.fill();
  g.fillStyle = '#bfe9ff'; g.beginPath(); g.moveTo(shx + 305, shy - 110); g.lineTo(shx + 325, shy - 40); g.lineTo(shx + 285, shy - 40); g.closePath(); g.fill(); ink(g, 4);
  // picture frame
  g.fillStyle = '#ffd23f'; rr(g, 860, 230, 150, 120, 12); g.fill(); ink(g, 5);
  g.fillStyle = '#9fe0ff'; rr(g, 876, 246, 118, 88, 8); g.fill();
  g.fillStyle = '#5ddc6a'; g.beginPath(); g.moveTo(876, 334); g.lineTo(920, 280); g.lineTo(960, 320); g.lineTo(994, 290); g.lineTo(994, 334); g.closePath(); g.fill();
  // door frame + hall (the door itself is drawn by code)
  g.fillStyle = '#7b4e33'; rr(g, DOOR.x - 16, DOOR.y - 16, DOOR.w + 32, DOOR.h + 18, 18); g.fill(); ink(g, 5);
  g.fillStyle = '#2a1a3a'; g.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  // a little night-light by the floor
  g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(1530, 870, 14, 0, TAU); g.fill(); ink(g, 3);
  const gl = g.createRadialGradient(1530, 870, 2, 1530, 870, 80);
  gl.addColorStop(0, 'rgba(255,240,170,0.5)'); gl.addColorStop(1, 'rgba(255,240,170,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(1530, 870, 80, 0, TAU); g.fill();
  roomCache = c;
  return c;
}

// --- door ----------------------------------------------------------------------------------
/** open 0..1 (swings towards the right hinge), hall 0..1 (hall light on), wiggle = knob rattle angle. */
export function drawDoor(g, open, hall, wiggle, t, doorImg, between = null) {
  const { x, y, w, h } = DOOR;
  // hall light behind the door
  if (hall > 0.01) {
    g.save(); g.globalAlpha = hall;
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, '#ffe6a0'); gr.addColorStop(1, '#ffc865');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.restore();
  }
  if (between) between(g);
  const pw = w * (1 - open * 0.82);
  const px = x + w - pw;
  if (doorImg) g.drawImage(doorImg, px, y, pw, h);
  else {
    g.fillStyle = '#f3e3c3'; rr(g, px, y, pw, h, 10); g.fill(); ink(g, 5);
    if (pw > 60) {
      g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 4;
      rr(g, px + pw * 0.14, y + 40, pw * 0.72, h * 0.36, 10); g.stroke();
      rr(g, px + pw * 0.14, y + h * 0.48, pw * 0.72, h * 0.42, 10); g.stroke();
      // moon + star decoration
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(px + pw * 0.5, y + 130, 30, 0, TAU); g.fill();
      g.fillStyle = '#f3e3c3'; g.beginPath(); g.arc(px + pw * 0.5 + 14, y + 120, 26, 0, TAU); g.fill();
    }
    // knob (left side)
    g.save(); g.translate(px + Math.max(18, pw * 0.14), y + h * 0.53); g.rotate(wiggle);
    g.fillStyle = '#ffcf4a'; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill(); ink(g, 4);
    g.fillStyle = '#ffffff'; g.fillRect(-12, -3, 24, 6);
    g.restore();
  }
  // light under the door + spill on the floor
  if (hall > 0.01) {
    g.save(); g.globalAlpha = hall * (open > 0.05 ? 1 : 0.9);
    g.fillStyle = '#fff1b0'; g.fillRect(x + 4, y + h - 6, w - 8, 8);
    const spread = open > 0.05 ? 1 : 0.6;
    const sp = g.createLinearGradient(0, FLOOR, 0, H);
    sp.addColorStop(0, 'rgba(255,225,140,0.75)'); sp.addColorStop(1, 'rgba(255,225,140,0)');
    g.fillStyle = sp;
    g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x + w, FLOOR); g.lineTo(x + w + 140 * spread, H); g.lineTo(x - 260 * spread - open * 300, H); g.closePath(); g.fill();
    g.restore();
  }
}

// --- bed -----------------------------------------------------------------------------------
export function drawBedBack(g, squash) {
  // headboard
  g.save();
  g.translate(0, BED.top); g.scale(1, 1 - squash * 0.04); g.translate(0, -BED.top);
  g.fillStyle = '#c98a5a'; rr(g, 96, 470, 200, 560, 90); g.fill(); ink(g, 6);
  g.fillStyle = '#e0a676'; rr(g, 120, 500, 152, 300, 70); g.fill();
  // heart cut-out
  g.fillStyle = '#ff7ab8';
  g.beginPath(); g.moveTo(196, 640); g.bezierCurveTo(140, 600, 150, 540, 196, 565); g.bezierCurveTo(242, 540, 252, 600, 196, 640); g.fill(); ink(g, 4);
  // foot board (low)
  g.fillStyle = '#c98a5a'; rr(g, 1440, 700, 60, 330, 26); g.fill(); ink(g, 6);
  g.restore();
}

export function drawBedFront(g, squash, t) {
  const top = BED.top + squash * 18;
  // legs
  g.fillStyle = '#9b6440';
  for (const lx of [260, 1400]) { rr(g, lx, 960, 46, 70, 12); g.fill(); ink(g, 5); }
  // mattress
  g.fillStyle = '#ffffff'; rr(g, 250, top + 10, 1220, 140 - squash * 10, 34); g.fill(); ink(g, 6);
  g.strokeStyle = 'rgba(36,22,63,0.18)'; g.lineWidth = 3;
  for (let x = 320; x < 1440; x += 90) { g.beginPath(); g.arc(x, top + 80, 6, 0, TAU); g.stroke(); }
  // pillows by the headboard
  g.fillStyle = '#fffaf2';
  g.beginPath(); g.ellipse(330, top - 18, 82, 40, -0.15, 0, TAU); g.fill(); ink(g, 5);
  // duvet: a fluffy pink quilt over the mattress, draping over the side
  g.fillStyle = '#ff9ccc';
  g.beginPath();
  g.moveTo(420, top - 6);
  for (let x = 420; x <= 1460; x += 52) g.quadraticCurveTo(x + 26, top - 16 - Math.sin(t * 2 + x) * 2, x + 52, top - 6);
  g.lineTo(1478, top + 40); g.lineTo(1478, top + 190);
  for (let x = 1478; x >= 410; x -= 54) g.quadraticCurveTo(x - 27, top + 214, x - 54, top + 190);
  g.lineTo(410, top + 30); g.closePath(); g.fill(); ink(g, 6);
  // quilt stitches + stars
  g.strokeStyle = 'rgba(160,40,110,0.3)'; g.lineWidth = 3; g.setLineDash([10, 10]);
  for (let x = 560; x < 1460; x += 150) { g.beginPath(); g.moveTo(x, top + 4); g.lineTo(x, top + 180); g.stroke(); }
  g.beginPath(); g.moveTo(420, top + 95); g.lineTo(1470, top + 95); g.stroke();
  g.setLineDash([]);
  for (let x = 490; x < 1460; x += 150) for (const yy of [50, 140]) {
    g.save(); g.translate(x, top + yy); g.fillStyle = '#fff3a8'; starPath(g, 0, 0, 14, 6, 5); g.fill(); g.restore();
  }
}

/** A sleeper's lump under the duvet. */
export function drawLump(g, x, w, color, breathe) {
  const top = BED.top;
  g.fillStyle = '#ffb0d6';
  g.beginPath(); g.ellipse(x + w * 0.35, top - 4, w * 0.75, 30 + breathe * 5, 0, Math.PI, TAU); g.fill(); ink(g, 5);
  g.fillStyle = color; g.globalAlpha = 0.25;
  g.beginPath(); g.ellipse(x + w * 0.35, top - 6, w * 0.55, 16 + breathe * 3, 0, Math.PI, TAU); g.fill();
  g.globalAlpha = 1;
}
/** Duvet edge tucked under a sleeper's chin. */
export function drawTuck(g, x, w) {
  const top = BED.top;
  g.fillStyle = '#ff9ccc';
  rr(g, x - w * 0.62, top - 22, w * 1.24, 40, 20); g.fill(); ink(g, 5);
  g.fillStyle = '#ffffff'; rr(g, x - w * 0.58, top - 20, w * 1.16, 12, 6); g.fill();
}

// --- ceiling glow stars ---------------------------------------------------------------------
export function drawGlowStar(g, x, y, r, glow, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t + x) * 0.08);
  if (glow > 0.05) {
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, r * 3.2);
    gr.addColorStop(0, `rgba(220,255,170,${0.65 * glow})`); gr.addColorStop(1, 'rgba(220,255,170,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 3.2, 0, TAU); g.fill();
  }
  g.fillStyle = glow > 0.05 ? '#eaffb0' : '#b9c98f';
  starPath(g, 0, 0, r, r * 0.45, 5); g.fill(); ink(g, 3);
  g.restore();
}

// --- collectibles -----------------------------------------------------------------------------
export function drawStar(g, x, y, r, gold, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3 + x) * 0.2);
  const s = 1 + Math.sin(t * 6 + y) * 0.05; g.scale(s, s);
  if (gold) {
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, r * 2);
    gr.addColorStop(0, 'rgba(255,240,150,0.7)'); gr.addColorStop(1, 'rgba(255,240,150,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 2, 0, TAU); g.fill();
  }
  g.fillStyle = gold ? '#ffb020' : '#ffe14a';
  starPath(g, 0, 0, r, r * 0.5, 5); g.fill(); ink(g, 4);
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.3, r * 0.18, r * 0.1, -0.5, 0, TAU); g.fill();
  // happy face
  g.fillStyle = NAVY;
  g.beginPath(); g.arc(-r * 0.2, -r * 0.02, r * 0.07, 0, TAU); g.arc(r * 0.2, -r * 0.02, r * 0.07, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 2.5; g.beginPath(); g.arc(0, r * 0.1, r * 0.15, 0.3, Math.PI - 0.3); g.stroke();
  g.restore();
}

export function drawFeather(g, x, y, s, rot, img) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (img) { g.drawImage(img, -30 * s, -30 * s, 60 * s, 60 * s); g.restore(); return; }
  g.scale(s, s);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(-4, -16, 26, -2); g.quadraticCurveTo(-4, 14, -26, 0); g.fill();
  g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#ffc2df'; g.beginPath(); g.ellipse(20, -1, 7, 5, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(36,22,63,0.5)'; g.beginPath(); g.moveTo(-30, 1); g.lineTo(22, -1); g.stroke();
  g.restore();
}

export function drawPillow(g, x, y, w, rot, img) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (img) { g.drawImage(img, -w / 2, -w * 0.375, w, w * 0.75); g.restore(); return; }
  const h = w * 0.62;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(-w / 2, -h / 2); g.quadraticCurveTo(0, -h / 2 + 10, w / 2, -h / 2);
  g.quadraticCurveTo(w / 2 - 10, 0, w / 2, h / 2); g.quadraticCurveTo(0, h / 2 - 10, -w / 2, h / 2);
  g.quadraticCurveTo(-w / 2 + 10, 0, -w / 2, -h / 2); g.closePath(); g.fill(); ink(g, 4);
  g.strokeStyle = 'rgba(255,120,180,0.6)'; g.lineWidth = 3; g.setLineDash([5, 5]);
  g.strokeRect(-w * 0.3, -h * 0.22, w * 0.6, h * 0.44); g.setLineDash([]);
  g.restore();
}

// --- teddy and cat -------------------------------------------------------------------------------
export function drawTeddy(g, x, y, s, t, mode = 'bounce') {
  g.save(); g.translate(x, y); g.scale(s, s);
  const arm = mode === 'bounce' ? -1.1 + Math.sin(t * 10) * 0.3 : 0.3;
  const body = '#b07a4f', light = '#e3b88c';
  // arms
  for (const sd of [-1, 1]) {
    g.save(); g.translate(sd * 30, -70); g.rotate(sd * arm);
    g.fillStyle = body; rr(g, -12, -48, 24, 52, 12); g.fill(); ink(g, 4); g.restore();
  }
  // legs
  for (const sd of [-1, 1]) { g.fillStyle = body; g.beginPath(); g.ellipse(sd * 22, -12, 18, 14, 0, 0, TAU); g.fill(); ink(g, 4); }
  g.fillStyle = body; g.beginPath(); g.ellipse(0, -55, 38, 42, 0, 0, TAU); g.fill(); ink(g, 4);
  g.fillStyle = light; g.beginPath(); g.ellipse(0, -48, 22, 26, 0, 0, TAU); g.fill();
  // head
  for (const sd of [-1, 1]) { g.fillStyle = body; g.beginPath(); g.arc(sd * 28, -140, 14, 0, TAU); g.fill(); ink(g, 4); }
  g.fillStyle = body; g.beginPath(); g.arc(0, -114, 36, 0, TAU); g.fill(); ink(g, 4);
  g.fillStyle = light; g.beginPath(); g.ellipse(0, -104, 18, 13, 0, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(0, -109, 6, 4.5, 0, 0, TAU); g.fill();
  if (mode === 'sleep') {
    g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.arc(-13, -122, 6, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(13, -122, 6, 0.2, Math.PI - 0.2); g.stroke();
  } else {
    g.beginPath(); g.arc(-13, -122, 4.5, 0, TAU); g.arc(13, -122, 4.5, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, -101, 7, 0.1, Math.PI - 0.1); g.fillStyle = '#ff6f8f'; g.fill();
  }
  // bow tie
  g.fillStyle = '#ff4d6d';
  g.beginPath(); g.moveTo(0, -82); g.lineTo(-16, -92); g.lineTo(-16, -72); g.closePath(); g.moveTo(0, -82); g.lineTo(16, -92); g.lineTo(16, -72); g.closePath(); g.fill(); ink(g, 3);
  g.restore();
}

export function drawCat(g, x, y, s, t, mode = 'bounce') {
  g.save(); g.translate(x, y); g.scale(s, s);
  const fur = '#ff9f43', dark = '#d9741f';
  const spread = mode === 'bounce' ? 1 : 0;
  // tail
  g.strokeStyle = NAVY; g.lineWidth = 16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-30, -30); g.quadraticCurveTo(-70, -60 - spread * 30, -50 + Math.sin(t * 8) * 10, -110); g.stroke();
  g.strokeStyle = fur; g.lineWidth = 10; g.stroke();
  // legs splayed
  for (const sd of [-1, 1]) for (const fy of [0, 1]) {
    g.save(); g.translate(sd * 26, -26 - fy * 20); g.rotate(sd * (0.4 + spread * 0.7) + (fy ? sd * 0.3 : 0));
    g.fillStyle = fur; rr(g, -8, 0, 16, 34, 8); g.fill(); ink(g, 3); g.restore();
  }
  g.fillStyle = fur; g.beginPath(); g.ellipse(0, -46, 40, 30, 0, 0, TAU); g.fill(); ink(g, 4);
  g.fillStyle = dark; for (let k = -1; k <= 1; k++) { g.fillRect(k * 14 - 3, -72, 6, 18); }
  // head
  g.fillStyle = fur;
  g.beginPath(); g.moveTo(-30, -96); g.lineTo(-26, -128); g.lineTo(-8, -110); g.lineTo(8, -110); g.lineTo(26, -128); g.lineTo(30, -96);
  g.arc(0, -90, 32, -0.2, Math.PI + 0.2); g.closePath(); g.fill(); ink(g, 4);
  g.fillStyle = '#fff3e3'; g.beginPath(); g.ellipse(0, -80, 16, 11, 0, 0, TAU); g.fill();
  g.fillStyle = NAVY;
  if (mode === 'sleep') {
    g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.arc(-12, -96, 5, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(12, -96, 5, 0.2, Math.PI - 0.2); g.stroke();
  } else {
    g.beginPath(); g.ellipse(-12, -96, 5, 7, 0, 0, TAU); g.ellipse(12, -96, 5, 7, 0, 0, TAU); g.fill();
  }
  g.fillStyle = '#ff7a9a'; g.beginPath(); g.moveTo(-5, -86); g.lineTo(5, -86); g.lineTo(0, -81); g.fill();
  g.restore();
}

// --- Nanny Moo -----------------------------------------------------------------------------------
/**
 * Nanny Moo: a kindly cow in a nightcap and pink dressing gown. Anchor bottom-centre.
 * o: { face: 'smile'|'sus'|'sigh'|'laugh'|'gasp', arms: 'down'|'wave'|'up', lamp: true, t, look: -1..1 }
 */
export function drawCow(g, x, y, h, o = {}) {
  const t = o.t || 0, s = h / 400;
  g.save(); g.translate(x, y); g.scale(s, s);
  const arms = o.arms || 'down';
  // slippers
  for (const sd of [-1, 1]) {
    g.fillStyle = '#ffd1e8'; g.beginPath(); g.ellipse(sd * 38, -12, 36, 16, 0, 0, TAU); g.fill(); ink(g, 4);
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(sd * 38 - 14, -34, 6, 14, -0.3, 0, TAU); g.ellipse(sd * 38 + 2, -36, 6, 14, 0.3, 0, TAU); g.fill(); ink(g, 3);
  }
  // arms behind for "up"
  const arm = (sd, ang) => {
    g.save(); g.translate(sd * 70, -270); g.rotate(ang);
    g.fillStyle = '#ff8fc4'; rr(g, -20, -6, 40, 120, 20); g.fill(); ink(g, 4);
    g.fillStyle = '#fff6ee'; g.beginPath(); g.arc(0, 118, 18, 0, TAU); g.fill(); ink(g, 4);
    g.restore();
  };
  const wave = Math.sin(t * 9) * 0.35;
  const armA = { down: [0.12, -0.12], wave: [0.12, -2.5 + wave], up: [2.7 + wave * 0.5, -2.7 - wave * 0.5] }[arms] || [0.12, -0.12];
  if (arms === 'up') { arm(-1, armA[0]); arm(1, armA[1]); }
  // gown
  g.fillStyle = '#ff8fc4';
  g.beginPath(); g.moveTo(-70, -300); g.quadraticCurveTo(-100, -150, -92, -30); g.quadraticCurveTo(0, -12, 92, -30); g.quadraticCurveTo(100, -150, 70, -300); g.closePath(); g.fill(); ink(g, 5);
  g.fillStyle = '#ff6fb1'; rr(g, -88, -170, 176, 22, 10); g.fill(); ink(g, 4);
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-46, -305); g.lineTo(0, -210); g.lineTo(46, -305); g.closePath(); g.fill(); ink(g, 4);
  // cow patches peeking at the collar
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(-12, -275, 12, 9, 0.3, 0, TAU); g.fill();
  if (arms !== 'up') { arm(-1, armA[0]); arm(1, armA[1]); }
  // lamp in the right hand (night light, no flame)
  if (o.lamp !== false && arms !== 'up') {
    const lx = 70 + Math.sin(armA[1]) * -118, ly = -270 + Math.cos(armA[1]) * 118;
    g.save(); g.translate(lx, ly + 10);
    const gl = g.createRadialGradient(0, 30, 4, 0, 30, 110);
    gl.addColorStop(0, 'rgba(255,236,150,0.55)'); gl.addColorStop(1, 'rgba(255,236,150,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 30, 110, 0, TAU); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.arc(0, 4, 14, Math.PI, TAU); g.stroke();
    g.fillStyle = '#ffd23f'; rr(g, -20, 4, 40, 10, 4); g.fill(); ink(g, 3);
    g.fillStyle = '#fff6c0'; rr(g, -16, 14, 32, 34, 8); g.fill(); ink(g, 3);
    g.fillStyle = '#ffd23f'; rr(g, -20, 46, 40, 10, 4); g.fill(); ink(g, 3);
    g.restore();
  }
  // head
  g.save(); g.translate((o.look || 0) * 8, -340);
  g.rotate((o.tilt || 0));
  // ears
  for (const sd of [-1, 1]) {
    g.save(); g.translate(sd * 70, -20); g.rotate(sd * (0.5 + Math.sin(t * 3) * 0.05));
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(sd * 16, 0, 30, 14, 0, 0, TAU); g.fill(); ink(g, 4);
    g.fillStyle = '#ffc2df'; g.beginPath(); g.ellipse(sd * 18, 0, 18, 7, 0, 0, TAU); g.fill();
    g.restore();
  }
  // horns
  for (const sd of [-1, 1]) {
    g.fillStyle = '#fff3d6'; g.beginPath(); g.moveTo(sd * 30, -50); g.quadraticCurveTo(sd * 52, -78, sd * 40, -96); g.quadraticCurveTo(sd * 60, -70, sd * 46, -44); g.closePath(); g.fill(); ink(g, 3);
  }
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 72, 64, 0, 0, TAU); g.fill(); ink(g, 5);
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(-36, -24, 26, 22, 0.4, 0, TAU); g.fill();
  // muzzle
  g.fillStyle = '#ffb3cf'; g.beginPath(); g.ellipse(0, 34, 56, 34, 0, 0, TAU); g.fill(); ink(g, 4);
  g.fillStyle = '#d96a95'; g.beginPath(); g.ellipse(-18, 30, 7, 10, 0, 0, TAU); g.ellipse(18, 30, 7, 10, 0, 0, TAU); g.fill();
  // eyes
  const face = o.face || 'smile';
  g.fillStyle = NAVY; g.strokeStyle = NAVY; g.lineWidth = 4;
  if (face === 'sigh' || face === 'laugh') {
    g.beginPath(); g.arc(-26, -12, 10, Math.PI + 0.3, TAU - 0.3); g.stroke();
    g.beginPath(); g.arc(26, -12, 10, Math.PI + 0.3, TAU - 0.3); g.stroke();
  } else {
    const eyeH = face === 'sus' ? 4 : 10;
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-26, -10, 13, 14, 0, 0, TAU); g.ellipse(26, -10, 13, 14, 0, 0, TAU); g.fill(); ink(g, 3);
    g.fillStyle = NAVY; const lk = (o.look || 0) * 4;
    g.beginPath(); g.ellipse(-26 + lk, -8, 6, Math.min(eyeH, 8), 0, 0, TAU); g.ellipse(26 + lk, face === 'sus' ? -10 : -8, 6, face === 'sus' ? 9 : 8, 0, 0, TAU); g.fill();
    if (face === 'sus') { // one droopy lid, one raised brow
      g.fillStyle = '#ffffff'; g.fillRect(-42, -26, 32, 14); g.beginPath(); g.moveTo(-42, -12); g.lineTo(-10, -12); ink(g, 4);
      g.beginPath(); g.moveTo(12, -40); g.quadraticCurveTo(26, -50, 42, -38); ink(g, 4);
    }
    if (face === 'gasp') { g.beginPath(); g.moveTo(-40, -36); g.lineTo(-14, -32); g.moveTo(14, -32); g.lineTo(40, -36); ink(g, 4); }
  }
  // mouth
  g.strokeStyle = NAVY; g.lineWidth = 4;
  if (face === 'laugh') { g.fillStyle = '#8a2a4a'; g.beginPath(); g.ellipse(0, 52, 20, 14, 0, 0, Math.PI); g.fill(); ink(g, 4); }
  else if (face === 'gasp') { g.fillStyle = '#8a2a4a'; g.beginPath(); g.ellipse(0, 52, 9, 11, 0, 0, TAU); g.fill(); ink(g, 3); }
  else if (face === 'sigh' || face === 'sus') { g.beginPath(); g.moveTo(-14, 52); g.lineTo(14, 50); g.stroke(); }
  else { g.beginPath(); g.arc(0, 44, 14, 0.3, Math.PI - 0.3); g.stroke(); }
  // nightcap
  const flop = Math.sin(t * 2.4) * 0.12 + (o.capFly || 0);
  g.save(); g.translate(0, -50);
  g.fillStyle = '#7fb6ff';
  g.beginPath(); g.moveTo(-70, 0); g.quadraticCurveTo(-30, -80, 40, -70 - (o.capFly || 0) * 60);
  g.quadraticCurveTo(110 + flop * 60, -60, 120 + flop * 50, 10 - (o.capFly || 0) * 80);
  g.quadraticCurveTo(80, -30, 70, 0); g.closePath(); g.fill(); ink(g, 4);
  g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.globalAlpha = 0.8;
  g.beginPath(); g.moveTo(-30, -40); g.lineTo(-10, -8); g.moveTo(10, -62); g.lineTo(28, -16); g.moveTo(52, -66); g.lineTo(62, -22); g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = '#ffffff'; rr(g, -76, -12, 152, 24, 12); g.fill(); ink(g, 4);
  g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(122 + flop * 50, 16 - (o.capFly || 0) * 80, 16, 0, TAU); g.fill(); ink(g, 4);
  g.restore();
  g.restore();
  g.restore();
}

// --- thumbnail -----------------------------------------------------------------------------------
export function drawIcon(g, x, y, w, h, t = 0) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.translate(x, y); g.scale(w / 800, h / 500);
  const wall = g.createLinearGradient(0, 0, 0, 500);
  wall.addColorStop(0, '#2b2160'); wall.addColorStop(1, '#5a48a0');
  g.fillStyle = wall; g.fillRect(0, 0, 800, 500);
  // window + moon
  g.fillStyle = '#1b1f55'; g.beginPath(); g.arc(150, 120, 80, 0, TAU); g.fill(); ink(g, 6);
  g.fillStyle = '#fff1a8'; g.beginPath(); g.arc(150, 120, 46, 0, TAU); g.fill();
  g.fillStyle = '#1b1f55'; g.beginPath(); g.arc(172, 104, 42, 0, TAU); g.fill();
  // glow stars
  for (let k = 0; k < 6; k++) drawGlowStar(g, 300 + k * 85, 40 + (k % 2) * 16, 14, k % 2 ? 1 : 0.4, t);
  // door peek
  g.fillStyle = '#ffe6a0'; g.fillRect(660, 160, 140, 340);
  drawCow(g, 700, 520, 300, { face: 'sus', t, look: -1 });
  g.fillStyle = '#f3e3c3'; g.fillRect(740, 160, 60, 340); g.strokeStyle = NAVY; g.lineWidth = 5; g.strokeRect(740, 160, 60, 340);
  // bed
  g.fillStyle = '#ffffff'; rr(g, 40, 400, 620, 60, 24); g.fill(); ink(g, 5);
  g.fillStyle = '#ff9ccc'; rr(g, 90, 380, 580, 120, 30); g.fill(); ink(g, 5);
  g.fillStyle = '#c98a5a'; rr(g, 20, 300, 80, 220, 36); g.fill(); ink(g, 5);
  // bouncing teddy + cat with pillows and feathers
  const b = Math.abs(Math.sin(t * 3)) * 40;
  drawTeddy(g, 280, 360 - b - 80, 1.15, t);
  drawPillow(g, 350, 220 - b, 90, 0.5 + Math.sin(t * 6) * 0.3);
  drawCat(g, 500, 340 - (40 - b) - 40, 1.05, t);
  for (let k = 0; k < 10; k++) drawFeather(g, 220 + ((k * 137) % 360), 120 + ((k * 71 + t * 40) % 220), 0.9, k + t, null);
  drawStar(g, 420, 140, 26, true, t);
  g.restore();
}
