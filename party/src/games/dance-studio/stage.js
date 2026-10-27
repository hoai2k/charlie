// Dance Studio: data (moves, music, lights, backdrops) and the procedural
// art (stage backdrops, light beams, curtains, mirror floor, mirror ball,
// move-card pictograms, the rehearsal studio). Every drawing looks up its
// generated art first (art()/drawArt(), see image-requests.md) and falls back
// to the vector drawing below, which is what ships today.
import { art, drawArt } from '../../engine/art.js';
import * as ui from '../../engine/ui.js';
import { RAINBOW } from '../../engine/particles.js';
import { drawStarShape, drawHeartShape, drawSparkleShape, starPath } from '../../engine/emotes.js';
import { clamp, lerp, TAU } from '../../engine/util.js';

export const NAVY = '#24163f';

// ---------------------------------------------------------------------------
// Data
// The dance moves. Each one sits on a button (btn); `show` moves are only in
// the show, where LB / RB aren't needed for the setup categories. poses: the
// character pose to play, best first: the requested dance-* art (see
// image-requests.md, "dance-studio — real-time dance moves") and then poses
// every character already has. beats: how long it lasts. The extras add motion
// on top: hop (jump height, fraction of the height; artHop with the move's own
// art, which is drawn airborne already), roll
// (a full cartwheel turn about the middle), travel (px it carries you in the
// show; none in the setup), kick (can-can kicks), sway (hula hips), drop
// (splits: down and wide), lean (radians), glide (moonwalk: slides back while
// facing forward), mirror (every other press does it to the other side).
// No "paper flips" (the owner's rule): a twirl is the pose-twirl art, never a
// squash through scaleX 0; a change of side switches facing at once.
export const DANCES = [
  { id: 'disco', btn: 'x', name: 'Disco!', poses: ['dance-disco', 'dance-side'], color: '#ff6fb1', beats: 1, lean: -0.16, mirror: true, sound: 'sparkle' },
  { id: 'star', btn: 'a', name: 'Star Jump', poses: ['dance-starfish', 'dance-star'], color: '#ffd23f', beats: 1, hop: 0.42, artHop: 0.1, sound: 'boing' },
  { id: 'hula', btn: 'b', name: 'Hula', poses: ['dance-hula', 'float', 'balance'], color: '#5ddc6a', beats: 2, sway: 0.16, sound: 'whoosh' },
  { id: 'twirl', btn: 'y', name: 'Twirl', poses: ['pose-twirl', 'strike3', 'dance-up'], color: '#9b5cff', beats: 1, hop: 0.06, sound: 'sparkle' },
  { id: 'cartwheel', btn: 'lt', name: 'Cartwheel', poses: ['dance-cartwheel', 'dance-star'], color: '#ff9f1c', beats: 2, roll: true, travel: 220, mirror: true, sound: 'whoosh' },
  { id: 'cancan', btn: 'rt', name: 'Can-can', poses: ['dance-cancan', 'balance', 'dance-star'], color: '#ff4d6d', beats: 2, kick: true, mirror: true, sound: 'boing' },
  { id: 'splits', btn: 'lb', name: 'Splits', poses: ['dance-splits', 'dance-down'], color: '#3fa7ff', beats: 2, drop: true, show: true, sound: 'land' },
  { id: 'moonwalk', btn: 'rb', name: 'Moonwalk', poses: ['dance-moonwalk', 'walk'], color: '#c49bff', beats: 2, glide: 150, mirror: true, show: true, sound: 'whoosh' },
];
export const DANCE = Object.fromEntries(DANCES.map((m, i) => [m.id, i]));

// Built-in songs (engine SONGS table): key, bpm.
export const MUSIC = [
  { id: 'dance', name: 'Disco Groove', bpm: 120, color: '#9b5cff' },
  { id: 'bouncy', name: 'Bubblegum Pop', bpm: 128, color: '#ff6fb1' },
  { id: 'party', name: 'Party Time', bpm: 138, color: '#ff9f1c' },
  { id: 'victory', name: 'Superstar', bpm: 132, color: '#ffc12e' },
  { id: 'menu', name: 'Sunny Stroll', bpm: 112, color: '#5ddc6a' },
  { id: 'chill', name: 'Dreamy', bpm: 92, color: '#7fd3ff' },
];

export const LIGHTS = [
  { id: 'none', name: 'None', colors: ['#ffffff'], none: true },
  { id: 'rainbow', name: 'Rainbow', colors: RAINBOW },
  { id: 'pink', name: 'Bubblegum', colors: ['#ff6fb1', '#ffb3d9', '#ff4d9a', '#ffd6ef'] },
  { id: 'ocean', name: 'Ocean', colors: ['#3fa7ff', '#36e0d0', '#7fd3ff', '#5b8cff'] },
  { id: 'sunset', name: 'Sunset', colors: ['#ff9f1c', '#ff4d6d', '#ffd23f', '#ff7a59'] },
  { id: 'disco', name: 'Disco Ball', colors: ['#ffffff', '#e0d4ff', '#fff6a8', '#c8f4ff'], specks: true },
  { id: 'galaxy', name: 'Galaxy', colors: ['#9b5cff', '#ff6fd0', '#5b8cff', '#c49bff'], twinkle: true },
];

export const STAGES = [
  { id: 'stars', name: 'Starry Night', color: '#2b2370' },
  { id: 'candy', name: 'Candy Land', color: '#ffb3d9' },
  { id: 'sea', name: 'Under the Sea', color: '#1fa3c4' },
  { id: 'rainbow', name: 'Rainbow Sky', color: '#7fd3ff' },
  { id: 'castle', name: 'Castle Ballroom', color: '#c49bff' },
  { id: 'city', name: 'Neon City', color: '#3a2a7a' },
];

// Deterministic little random numbers for scenery (stable between frames).
const modn = (a, n) => ((a % n) + n) % n;
function hash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

function hexRgb(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
export function rgba(c, a) { const [r, g, b] = hexRgb(c); return `rgba(${r},${g},${b},${a})`; }
export function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; }

// ---------------------------------------------------------------------------
// Backdrops: drawn into (x, y, w, h); the interesting part sits in the middle.
export function drawBackdrop(g, id, x, y, w, h, t) {
  const img = art('bg/dance-studio-stage-' + id);
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (img) {
    // cover-fit the 1920x1080 image to the box, keeping its top-centre
    const s = Math.max(w / img.width, h / (img.height * 0.72));
    const dw = img.width * s, dh = img.height * s;
    g.drawImage(img, x + (w - dw) / 2, y, dw, dh);
    g.restore();
    return;
  }
  const u = Math.min(w / 1920, h / 780) || 1;   // scenery scale
  switch (id) {
    case 'stars': backdropStars(g, x, y, w, h, t, u); break;
    case 'candy': backdropCandy(g, x, y, w, h, t, u); break;
    case 'sea': backdropSea(g, x, y, w, h, t, u); break;
    case 'rainbow': backdropRainbow(g, x, y, w, h, t, u); break;
    case 'castle': backdropCastle(g, x, y, w, h, t, u); break;
    default: backdropCity(g, x, y, w, h, t, u); break;
  }
  g.restore();
}

function vgrad(g, x, y, h, stops) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
}

function backdropStars(g, x, y, w, h, t, u) {
  g.fillStyle = vgrad(g, x, y, h, ['#160f3f', '#2b2370', '#5a3d9e']); g.fillRect(x, y, w, h);
  const n = Math.round(clamp(w * h / 9000, 12, 120));
  for (let i = 0; i < n; i++) {
    const sx = x + hash(i) * w, sy = y + hash(i + 50) * h * 0.85;
    const tw = 0.55 + 0.45 * Math.sin(t * 2.4 + i * 1.7);
    g.save(); g.translate(sx, sy); g.globalAlpha = tw;
    g.fillStyle = i % 5 === 0 ? '#fff6a8' : '#ffffff';
    if (i % 4 === 0) { g.scale(u * 1.4, u * 1.4); drawSparkleShape(g, 26, g.fillStyle); }
    else { g.beginPath(); g.arc(0, 0, Math.max(1.2, 3.5 * u), 0, TAU); g.fill(); }
    g.restore();
  }
  // smiling crescent moon
  const mx = x + w * 0.8, my = y + h * 0.24, r = 90 * u;
  g.save(); g.fillStyle = '#fff3b0'; g.strokeStyle = NAVY; g.lineWidth = Math.max(1.5, 5 * u);
  g.beginPath(); g.arc(mx, my, r, 0, TAU); g.arc(mx + r * 0.45, my - r * 0.2, r * 0.82, 0, TAU, true); g.fill('evenodd');
  g.fillStyle = NAVY; g.beginPath(); g.arc(mx - r * 0.55, my + r * 0.05, r * 0.07, 0, TAU); g.fill();
  g.restore();
  // soft purple clouds near the bottom
  for (let i = 0; i < 6; i++) ui.cloud(g, x + (i + 0.3) * w / 5.5, y + h * 0.9 + Math.sin(i * 2) * 10 * u, 1.6 * u, '#7a5cc4', 0.55);
  // shooting star
  const k = (t * 0.25) % 1;
  if (k < 0.3) {
    const sx = x + w * (0.15 + k * 1.6), sy = y + h * (0.12 + k * 0.6);
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4 * u; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 120 * u, sy - 50 * u); g.stroke();
    g.translate(sx, sy); g.scale(u * 1.6, u * 1.6); drawStarShape(g, 30, '#fff6a8'); g.restore();
  }
}

function backdropCandy(g, x, y, w, h, t, u) {
  g.fillStyle = vgrad(g, x, y, h, ['#bff5e6', '#ffe0f0']); g.fillRect(x, y, w, h);
  for (let i = 0; i < 4; i++) ui.cloud(g, x + (0.1 + i * 0.27) * w + Math.sin(t * 0.3 + i) * 20 * u, y + h * (0.14 + (i % 2) * 0.1), 1.8 * u, '#ffffff', 0.9);
  // gumdrop hills
  const cols = ['#ff8fc8', '#9fe6a0', '#c49bff', '#ffd27f'];
  for (let i = 0; i < 7; i++) {
    const cx = x + (i / 6) * w, r = (150 + hash(i + 3) * 90) * u;
    g.fillStyle = cols[i % 4]; g.strokeStyle = NAVY; g.lineWidth = 4 * u;
    g.beginPath(); g.ellipse(cx, y + h, r * 1.2, r, 0, Math.PI, 0); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(cx - r * 0.4, y + h - r * 0.6, r * 0.12, 0, TAU); g.fill();
  }
  // lollipop trees
  for (let i = 0; i < 5; i++) {
    const lx = x + (0.08 + i * 0.21) * w, ly = y + h * 0.78, lr = 50 * u;
    g.fillStyle = '#fff'; g.fillRect(lx - 5 * u, ly - lr, 10 * u, h * 0.3); g.strokeStyle = NAVY; g.lineWidth = 3 * u; g.strokeRect(lx - 5 * u, ly - lr, 10 * u, h * 0.3);
    g.save(); g.translate(lx, ly - lr * 1.6); g.rotate(t * 0.6 + i);
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#ffffff' : RAINBOW[(i + k) % RAINBOW.length]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, lr, (k / 6) * TAU, ((k + 1) / 6) * TAU); g.fill(); }
    g.beginPath(); g.arc(0, 0, lr, 0, TAU); g.lineWidth = 4 * u; g.stroke();
    g.restore();
  }
}

function backdropSea(g, x, y, w, h, t, u) {
  g.fillStyle = vgrad(g, x, y, h, ['#5fe0f0', '#1fa3c4', '#126f9e']); g.fillRect(x, y, w, h);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const rx = x + (i + 0.5) * w / 6 + Math.sin(t * 0.5 + i) * 30 * u;
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.beginPath(); g.moveTo(rx - 30 * u, y); g.lineTo(rx + 40 * u, y); g.lineTo(rx + 160 * u, y + h); g.lineTo(rx + 20 * u, y + h); g.fill();
  }
  g.restore();
  // seaweed + coral
  for (let i = 0; i < 9; i++) {
    const sx = x + (i + 0.3) * w / 9, base = y + h;
    g.strokeStyle = i % 3 === 0 ? '#ff7aa8' : '#3fcf7a'; g.lineCap = 'round'; g.lineWidth = (i % 3 === 0 ? 18 : 12) * u;
    g.beginPath(); g.moveTo(sx, base);
    for (let k = 1; k <= 5; k++) g.lineTo(sx + Math.sin(t * 1.4 + k + i) * 16 * u, base - k * (i % 3 === 0 ? 26 : 50) * u);
    g.stroke();
  }
  // bubbles
  for (let i = 0; i < 14; i++) {
    const by = y + h - ((t * 60 * u + hash(i) * h * 1.3) % (h * 1.1));
    const bx = x + hash(i + 9) * w + Math.sin(t * 2 + i) * 10 * u;
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3 * u;
    g.beginPath(); g.arc(bx, by, (6 + hash(i + 4) * 10) * u, 0, TAU); g.stroke();
  }
  // little fish
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? -1 : 1;
    const fx = x + (((t * 50 * dir * u + hash(i) * w) % w) + w) % w, fy = y + h * (0.25 + i * 0.13);
    g.save(); g.translate(fx, fy); g.scale(dir * u * 1.4, u * 1.4);
    g.fillStyle = ['#ffd23f', '#ff9f1c', '#ff6fb1', '#c49bff'][i]; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 26, 16, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-22, 0); g.lineTo(-40, -14); g.lineTo(-40, 14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(12, -4, 3.5, 0, TAU); g.fill();
    g.restore();
  }
}

function backdropRainbow(g, x, y, w, h, t, u) {
  g.fillStyle = vgrad(g, x, y, h, ['#6cc8ff', '#bfe8ff']); g.fillRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h * 1.05, R = Math.min(w * 0.45, h * 0.95);
  const band = R * 0.075;
  RAINBOW.slice(0, 6).forEach((c, i) => {
    g.strokeStyle = c; g.lineWidth = band + 1;
    g.beginPath(); g.arc(cx, cy, R - i * band, Math.PI, 0); g.stroke();
  });
  ui.cloud(g, cx - R * 0.95, cy - band * 2, 2.8 * u, '#ffffff', 1);
  ui.cloud(g, cx + R * 0.95, cy - band * 2, 2.8 * u, '#ffffff', 1);
  for (let i = 0; i < 4; i++) ui.cloud(g, x + ((hash(i) * w + t * 20 * u) % (w + 200 * u)) - 100 * u, y + h * (0.1 + i * 0.08), 1.2 * u, '#ffffff', 0.85);
  for (let i = 0; i < 10; i++) {
    g.save(); g.translate(x + hash(i + 20) * w, y + hash(i + 30) * h * 0.7); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i);
    g.scale(u * 1.2, u * 1.2); drawSparkleShape(g, 28, '#ffffff'); g.restore();
  }
}

function backdropCastle(g, x, y, w, h, t, u) {
  g.fillStyle = vgrad(g, x, y, h, ['#f7d9ff', '#e2c4ff']); g.fillRect(x, y, w, h);
  // arched windows with a twilight view
  const nW = 4;
  for (let i = 0; i < nW; i++) {
    const wx = x + (i + 0.5) * w / nW, ww = w / nW * 0.42, wy = y + h * 0.2, wh = h * 0.62;
    g.save(); g.beginPath(); g.moveTo(wx - ww / 2, wy + wh); g.lineTo(wx - ww / 2, wy + ww / 2); g.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww / 2, wy + wh); g.closePath();
    g.fillStyle = vgrad(g, wy, wy, wh, ['#5b4bb8', '#ff9fc8', '#ffd7a0']); g.fill();
    g.lineWidth = 8 * u; g.strokeStyle = '#ffffff'; g.stroke(); g.lineWidth = 3 * u; g.strokeStyle = NAVY; g.stroke();
    g.clip(); g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(wx + (hash(i * 7 + k) - 0.5) * ww, wy + hash(i * 3 + k) * wh * 0.4 + ww * 0.3, 2.5 * u, 0, TAU); g.fill(); }
    g.restore();
  }
  // pillars
  for (let i = 0; i <= nW; i++) {
    const px = x + (i / nW) * w, pw = 46 * u;
    g.fillStyle = '#ffc4e1'; g.fillRect(px - pw / 2, y, pw, h);
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(px - pw / 2 + 6 * u, y, 8 * u, h);
    g.strokeStyle = NAVY; g.lineWidth = 3 * u; g.strokeRect(px - pw / 2, y - 2, pw, h + 4);
  }
  // heart garland
  g.strokeStyle = '#ffd23f'; g.lineWidth = 4 * u;
  g.beginPath(); for (let i = 0; i <= 40; i++) { const k = i / 40; g.lineTo(x + k * w, y + h * 0.1 + Math.abs(Math.sin(k * Math.PI * 4)) * 40 * u); } g.stroke();
  for (let i = 0; i < 8; i++) {
    const k = (i + 0.5) / 8;
    g.save(); g.translate(x + k * w, y + h * 0.1 + Math.abs(Math.sin(k * Math.PI * 4)) * 40 * u + 12 * u); g.scale(u * 1.3, u * 1.3);
    drawHeartShape(g, 20, '#ff6fb1'); g.restore();
  }
  // chandeliers
  for (const k of [0.25, 0.75]) {
    const cx = x + k * w, cy = y + h * 0.16;
    g.save(); g.translate(cx, cy); g.scale(u, u);
    g.strokeStyle = NAVY; g.lineWidth = 3; g.fillStyle = '#ffd23f';
    g.beginPath(); g.ellipse(0, 0, 70, 16, 0, 0, TAU); g.fill(); g.stroke();
    for (let j = -2; j <= 2; j++) { g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(j * 30, -18, 7 + Math.sin(t * 8 + j) * 1, 0, TAU); g.fill(); }
    g.restore();
  }
}

function backdropCity(g, x, y, w, h, t, u) {
  g.fillStyle = vgrad(g, x, y, h, ['#1d1450', '#3a2a7a', '#6a3d9e']); g.fillRect(x, y, w, h);
  g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(x + w * 0.18, y + h * 0.2, 60 * u, 0, TAU); g.fill();
  for (let layer = 0; layer < 2; layer++) {
    const n = layer ? 9 : 12;
    for (let i = 0; i < n; i++) {
      const bw = w / n * (0.8 + hash(i + layer * 20) * 0.3), bx = x + (i / n) * w + (layer ? w / n / 2 : 0) - bw * 0.1;
      const bh = h * (layer ? 0.35 + hash(i + 7) * 0.25 : 0.5 + hash(i + 3) * 0.35);
      const by = y + h - bh;
      g.fillStyle = layer ? '#4b2f8f' : '#2e2068'; g.strokeStyle = NAVY; g.lineWidth = 3 * u;
      ui.roundRect(g, bx, by, bw, bh + 20, 16 * u); g.fill(); g.stroke();
      const cols = ['#ffd23f', '#ff8fc8', '#7fd3ff', '#9fe6a0'];
      for (let wy = by + 20 * u; wy < y + h - 20 * u; wy += 40 * u) for (let wx = bx + 14 * u; wx < bx + bw - 24 * u; wx += 30 * u) {
        const on = Math.sin(wx * 0.13 + wy * 0.07 + Math.floor(t * 0.7 + hash(wx + wy) * 3)) > -0.2;
        g.fillStyle = on ? cols[Math.floor(hash(wx * 3 + wy) * 4)] : 'rgba(255,255,255,0.08)';
        ui.roundRect(g, wx, wy, 14 * u, 18 * u, 4 * u); g.fill();
      }
    }
  }
  // glowing shapes
  const shapes = [['star', '#ffd23f'], ['heart', '#ff6fb1'], ['note', '#7fd3ff']];
  shapes.forEach(([k, c], i) => {
    const sx = x + w * (0.4 + i * 0.2), sy = y + h * (0.18 + (i % 2) * 0.1);
    const glow = 0.7 + 0.3 * Math.sin(t * 3 + i * 2);
    g.save(); g.translate(sx, sy); g.scale(u * 2.4, u * 2.4); g.globalAlpha = glow;
    g.shadowColor = c; g.shadowBlur = 18; g.fillStyle = c;
    if (k === 'star') { starPath(g, 18); g.fill(); }
    else if (k === 'heart') { drawHeartShape(g, 30, c); }
    else { g.beginPath(); g.ellipse(-6, 10, 8, 6, -0.4, 0, TAU); g.fill(); g.fillRect(0, -16, 3.5, 26); g.fillRect(0, -16, 12, 5); }
    g.restore();
  });
}

// ---------------------------------------------------------------------------
// Stage floor (mirror-glossy planks) from y0 down to y0 + h.
export function drawFloor(g, x, y0, w, h, light, t) {
  if (!drawArt(g, 'prop/dance-studio-floor', x, y0, w, h, { anchor: 'topleft', fit: 'stretch' })) {
    g.fillStyle = vgrad(g, y0, y0, h, ['#5a2f6e', '#3b1f4f', '#2a1638']); g.fillRect(x, y0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = Math.max(1, h * 0.008);
    const n = 14;
    for (let i = -n; i <= n; i++) {
      // planks converge a little toward the back
      const bx = x + w / 2 + (i / n) * w * 0.5, fx = x + w / 2 + (i / n) * w * 0.75;
      g.beginPath(); g.moveTo(bx, y0); g.lineTo(fx, y0 + h); g.stroke();
    }
    for (let k = 1; k < 5; k++) { const yy = y0 + h * (k / 5) ** 1.4; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    g.fillStyle = '#ffd23f'; g.fillRect(x, y0, w, Math.max(3, h * 0.025));
  }
  // glossy shine + coloured light pools
  if (light && !light.none) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const cs = light.colors;
    for (let i = 0; i < 4; i++) {
      const px = x + w * (0.2 + i * 0.2) + Math.sin(t * 1.3 + i * 1.7) * w * 0.06;
      const gr = g.createRadialGradient(px, y0 + h * 0.45, 0, px, y0 + h * 0.45, w * 0.14);
      gr.addColorStop(0, rgba(cs[i % cs.length], 0.28)); gr.addColorStop(1, rgba(cs[i % cs.length], 0));
      g.fillStyle = gr; g.beginPath(); g.ellipse(px, y0 + h * 0.45, w * 0.14, h * 0.32, 0, 0, TAU); g.fill();
    }
    g.restore();
  }
}

// ---------------------------------------------------------------------------
// Light beams from the top of a box. beat: fractional beat; pulse 0..1 (on-beat flash).
export function drawLights(g, light, x, y, w, h, t, beat = 0, pulse = 0, power = 1) {
  if (!light || light.none || power <= 0) return;
  const cs = light.colors, n = clamp(Math.round(w / 300), 3, 6);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sx = x + (i + 0.5) * w / n;
    const sw = Math.sin(beat * Math.PI * 0.5 + i * 1.3) * 0.38 + (i % 2 ? 0.12 : -0.12);
    const len = h * 1.05, half = w * 0.06;
    const ex = sx + Math.sin(sw) * len, ey = y + Math.cos(sw) * len;
    const c = cs[modn(i + Math.floor(beat / 2), cs.length)];
    const a = (0.16 + pulse * 0.14) * power * (light.specks ? 0.6 : 1);
    const gr = g.createLinearGradient(sx, y, ex, ey);
    gr.addColorStop(0, rgba(c, a * 1.6)); gr.addColorStop(1, rgba(c, a * 0.25));
    g.fillStyle = gr;
    const px = Math.cos(sw) * half, py = -Math.sin(sw) * half;
    g.beginPath(); g.moveTo(sx - px * 0.15, y - py * 0.15); g.lineTo(sx + px * 0.15, y + py * 0.15); g.lineTo(ex + px, ey + py); g.lineTo(ex - px, ey - py); g.closePath(); g.fill();
  }
  if (light.specks) {
    for (let i = 0; i < 40; i++) {
      const a = hash(i) * TAU + t * 0.6, r = (0.15 + hash(i + 40) * 0.85);
      const px = x + w / 2 + Math.cos(a) * r * w * 0.55, py = y + h * 0.45 + Math.sin(a) * r * h * 0.5;
      g.fillStyle = `rgba(255,255,255,${(0.35 + 0.3 * Math.sin(t * 5 + i)) * power})`;
      g.beginPath(); g.arc(px, py, Math.max(1.5, w * 0.003), 0, TAU); g.fill();
    }
  }
  if (light.twinkle) {
    for (let i = 0; i < 18; i++) {
      const tw = Math.max(0, Math.sin(t * 2.2 + i * 2.1));
      g.save(); g.translate(x + hash(i + 70) * w, y + hash(i + 90) * h * 0.8); g.globalAlpha = tw * power;
      const s = w / 1920 * 1.6; g.scale(s, s); drawSparkleShape(g, 32, cs[i % cs.length]); g.restore();
    }
  }
  if (pulse > 0) { g.fillStyle = rgba(cs[modn(Math.floor(beat), cs.length)], pulse * 0.08 * power); g.fillRect(x, y, w, h); }
  g.restore();
}

// ---------------------------------------------------------------------------
// Curtains: frame (side drapes + valance) plus the main drapes, open = 0 closed .. 1 open.
export function drawCurtains(g, x, y, w, h, open = 1, t = 0) {
  const u = w / 1920;
  if (open < 1) {
    // the main drapes slide out to the sides
    const half = (w / 2) * (1 - open);
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? x : x + w - half;
      drape(g, x0, y, half + 2, h, u, side);
    }
  }
  if (drawArt(g, 'prop/dance-studio-curtains', x, y, w, h, { anchor: 'topleft', fit: 'stretch' })) return;
  const sideW = 200 * u;
  drape(g, x, y, sideW, h, u, -1, true);
  drape(g, x + w - sideW, y, sideW, h, u, 1, true);
  // valance with scallops and gold fringe
  const vh = 90 * u;
  g.save();
  g.fillStyle = '#c4185f'; g.fillRect(x, y, w, vh * 0.7);
  const n = Math.max(6, Math.round(w / (160 * u)));
  for (let i = 0; i < n; i++) {
    const cx = x + (i + 0.5) * w / n, r = w / n / 2;
    g.fillStyle = i % 2 ? '#d61f6c' : '#c4185f';
    g.beginPath(); g.arc(cx, y + vh * 0.62, r, 0, Math.PI); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 6 * u; g.beginPath(); g.arc(cx, y + vh * 0.62, r - 3 * u, 0.1, Math.PI - 0.1); g.stroke();
  }
  g.strokeStyle = NAVY; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(x, y + vh * 0.62); g.lineTo(x + w, y + vh * 0.62); g.stroke();
  g.restore();
}

function drape(g, x, y, w, h, u, side, tied = false) {
  g.save();
  g.beginPath();
  if (tied) {
    // gathered with a tie-back at 62% height
    const inner = side < 0 ? x + w : x, outer = side < 0 ? x : x + w, ty = y + h * 0.62;
    g.moveTo(outer, y); g.lineTo(inner, y);
    g.quadraticCurveTo(inner - side * w * 0.05, y + h * 0.4, inner - side * w * 0.55, ty);
    g.quadraticCurveTo(inner - side * w * 0.2, y + h * 0.8, inner, y + h); g.lineTo(outer, y + h); g.closePath();
  } else g.rect(x, y, w, h);
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  const folds = Math.max(2, Math.round(w / (60 * u)));
  for (let i = 0; i <= folds * 2; i++) gr.addColorStop(i / (folds * 2), i % 2 ? '#e8357c' : '#a8124f');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 3 * u; g.stroke();
  if (tied) {
    const ty = y + h * 0.62, tx = side < 0 ? x + w * 0.42 : x + w * 0.58;
    g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(tx, ty, 26 * u, 12 * u, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - 8 * u, ty + 50 * u); g.lineTo(tx + 8 * u, ty + 50 * u); g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
export function drawMirrorBall(g, x, y, r, t, glow = 0) {
  g.save();
  g.strokeStyle = '#c9c3dd'; g.lineWidth = Math.max(2, r * 0.05);
  g.beginPath(); g.moveTo(x, y - r - r * 0.8); g.lineTo(x, y - r); g.stroke();
  if (!drawArt(g, 'prop/mirror-ball', x, y, r * 2.1, r * 2.1)) {
    g.beginPath(); g.arc(x, y, r, 0, TAU);
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#cfc8e8'); gr.addColorStop(1, '#8a80b0');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    const rows = 8, rot = (t * 0.6) % 1;
    for (let j = 0; j < rows; j++) {
      const lat = -Math.PI / 2 + (j + 0.5) * Math.PI / rows, ry = y + Math.sin(lat) * r, rw = Math.cos(lat) * r;
      const cols = 12;
      for (let i = 0; i < cols; i++) {
        const lon = ((i + rot) / cols) * Math.PI;
        const cx = x - Math.cos(lon) * rw;
        const shade = Math.sin(lon) * 0.5 + 0.5;
        g.fillStyle = (i + j) % 3 === 0 ? `rgba(255,255,255,${0.6 * shade})` : `rgba(160,140,220,${0.35 * shade})`;
        g.fillRect(cx - r * 0.07, ry - r * 0.07, r * 0.13, r * 0.12);
      }
    }
    g.restore();
    g.strokeStyle = NAVY; g.lineWidth = Math.max(2, r * 0.06); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  }
  // glints
  for (let i = 0; i < 3; i++) {
    const a = t * 1.7 + i * 2.1, k = 0.5 + 0.5 * Math.sin(t * 4 + i * 2);
    g.save(); g.translate(x + Math.cos(a) * r * 0.6, y + Math.sin(a * 0.7) * r * 0.5); g.globalAlpha = k;
    const s = r / 50 * (0.8 + glow * 0.8); g.scale(s, s); drawSparkleShape(g, 26, '#ffffff'); g.restore();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// Move-card pictograms: a round-headed kid figure. Arm/leg angles are degrees
// out from straight down (90 = sideways, 180 = straight up); b = elbow/knee bend.
const PICTO = {
  up:     { la: [172, 0], ra: [172, 0], ll: [8, 0], rl: [8, 0] },
  point:  { la: [40, 60], ra: [140, 0], ll: [6, 0], rl: [22, 0], lean: 10 },
  knees:  { la: [25, -50], ra: [25, -50], ll: [40, -70], rl: [40, -70], dy: 10 },
  star:   { la: [130, 0], ra: [130, 0], ll: [32, 0], rl: [32, 0], dy: -10 },
  twirl:  { la: [95, 30], ra: [175, 0], ll: [4, 0], rl: [12, -40], deco: 'swirl' },
  clap:   { la: [40, -115], ra: [40, -115], ll: [8, 0], rl: [8, 0], deco: 'clap' },
  wave:   { la: [15, 0], ra: [120, 40], ll: [8, 0], rl: [8, 0], deco: 'wave' },
  bump:   { la: [150, 20], ra: [120, 40], ll: [14, 0], rl: [10, 0], lean: -14, hip: 8, deco: 'bump' },
  swim:   { la: [60, 0], ra: [170, 0], ll: [10, 0], rl: [10, 0], deco: 'waves' },
  slide:  { la: [100, 0], ra: [100, 0], ll: [30, 0], rl: [30, 0], lean: 12, deco: 'speed' },
  peace:  { la: [15, 0], ra: [40, -140], ll: [8, 0], rl: [8, 0], deco: 'peace' },
  tada:   { la: [115, 0], ra: [115, 0], ll: [16, 0], rl: [16, 0], deco: 'sparkle' },
  wobble: { la: [95, 0], ra: [95, 0], ll: [6, 0], rl: [80, -80], lean: 8, deco: 'wobble' },
  bow:    { la: [10, 0], ra: [10, 0], ll: [6, 0], rl: [6, 0], bow: true },
  hop:    { la: [140, 0], ra: [140, 0], ll: [50, -110], rl: [50, -110], dy: -18, deco: 'hop' },
  float:  { la: [100, -25], ra: [100, -25], ll: [4, 0], rl: [4, 0], dy: -12, deco: 'float' },
  // the real-time dance moves (DANCES)
  disco:     { la: [148, 0], ra: [40, -105], ll: [22, 0], rl: [6, -35], lean: -10, deco: 'sparkle' },
  hula:      { la: [96, -28], ra: [96, 28], ll: [10, 0], rl: [10, 0], hip: 8, lean: -6, deco: 'hula' },
  cartwheel: { la: [128, 0], ra: [128, 0], ll: [34, 0], rl: [34, 0], flip: true, deco: 'roll' },
  cancan:    { la: [55, -120], ra: [55, -120], ll: [6, 0], rl: [165, 0], lean: -8, deco: 'kick' },
  splits:    { la: [150, 0], ra: [150, 0], ll: [88, 0], rl: [88, 0], dy: 22 },
  moonwalk:  { la: [35, 30], ra: [20, 25], ll: [8, 0], rl: [28, -45], lean: -12, deco: 'speed' },
};

/** The standard "None" icon (dashed circle with a cross), as in the dress-up menus. */
export function drawNoneIcon(g, cx, cy, size) {
  g.save(); g.translate(cx, cy);
  g.setLineDash([size * 0.08, size * 0.07]);
  g.beginPath(); g.arc(0, 0, size * 0.3, 0, TAU); g.lineWidth = Math.max(2, size * 0.04); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke();
  g.setLineDash([]);
  g.beginPath(); g.moveTo(-size * 0.12, -size * 0.12); g.lineTo(size * 0.12, size * 0.12); g.moveTo(size * 0.12, -size * 0.12); g.lineTo(-size * 0.12, size * 0.12);
  g.stroke(); g.restore();
}

/** Draw a move card's picture centred at (cx, cy), fitted to `size`. */
export function drawMovePicto(g, move, cx, cy, size, t = 0, active = false) {
  if (drawArt(g, 'prop/dance-move-' + move.id, cx, cy, size, size)) return;
  const P = PICTO[move.id] || PICTO.up, k = size / 124;
  g.save(); g.translate(cx, cy + size * 0.02); g.scale(k, k);
  const bob = active ? Math.sin(t * 10) * 3 : 0;
  g.translate(0, (P.dy || 0) + bob);
  if (P.flip) g.rotate(Math.PI + (active ? Math.sin(t * 4) * 0.25 : 0));
  // deco behind
  g.lineCap = 'round'; g.lineJoin = 'round';
  decoBehind(g, P.deco, move.color, t);
  g.rotate(((P.lean || 0) * Math.PI) / 180);
  const hipX = P.hip || 0, hipY = 12, shY = -22;
  const limb = (base, ang, side, L1, L2) => {
    const a1 = (ang[0] * Math.PI) / 180, a2 = ((ang[0] + ang[1]) * Math.PI) / 180;
    const ex = base[0] + side * Math.sin(a1) * L1, ey = base[1] + Math.cos(a1) * L1;
    const hx = ex + side * Math.sin(a2) * L2, hy = ey + Math.cos(a2) * L2;
    return [[base[0], base[1]], [ex, ey], [hx, hy]];
  };
  const bow = P.bow;
  const neck = bow ? [6, shY + 4] : [0, shY];
  const parts = [
    limb([hipX - 6, hipY], P.ll, -1, 20, 20), limb([hipX + 6, hipY], P.rl, 1, 20, 20),
    limb([neck[0] - 4, neck[1] + 4], P.la, -1, 17, 17), limb([neck[0] + 4, neck[1] + 4], P.ra, 1, 17, 17),
  ];
  const strokeAll = (w, c) => {
    g.strokeStyle = c; g.lineWidth = w;
    for (const pts of parts) { g.beginPath(); g.moveTo(...pts[0]); g.lineTo(...pts[1]); g.lineTo(...pts[2]); g.stroke(); }
    g.beginPath(); g.moveTo(neck[0], neck[1]); g.lineTo(hipX, hipY); g.stroke();
  };
  strokeAll(17, NAVY); strokeAll(10, '#ffffff');
  // skirt-ish body
  g.fillStyle = move.color; g.strokeStyle = NAVY; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(neck[0] - 7, neck[1] + 6); g.lineTo(neck[0] + 7, neck[1] + 6); g.lineTo(hipX + 15, hipY + 6); g.lineTo(hipX - 15, hipY + 6); g.closePath(); g.fill(); g.stroke();
  // head
  const hx = bow ? 16 : neck[0], hy = bow ? -24 : neck[1] - 16;
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hx, hy, 14, 0, TAU); g.fill(); g.lineWidth = 3.5; g.stroke();
  g.fillStyle = '#ff9fc8'; g.beginPath(); g.arc(hx - 7, hy + 4, 3, 0, TAU); g.arc(hx + 7, hy + 4, 3, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(hx - 4.5, hy - 1, 2, 0, TAU); g.arc(hx + 4.5, hy - 1, 2, 0, TAU); g.fill();
  g.lineWidth = 2; g.beginPath(); g.arc(hx, hy + 3, 4, 0.2, Math.PI - 0.2); g.stroke();
  g.rotate(-((P.lean || 0) * Math.PI) / 180);
  decoFront(g, P.deco, move.color, t, parts);
  g.restore();
}

function decoBehind(g, deco, color, t) {
  if (deco === 'swirl') {
    g.strokeStyle = color; g.lineWidth = 5;
    g.beginPath(); g.ellipse(0, 26, 34, 9, 0, 0.2 + t * 4, 0.2 + t * 4 + 4.6); g.stroke();
  } else if (deco === 'waves') {
    g.strokeStyle = color; g.lineWidth = 4;
    for (const yy of [30, 40]) { g.beginPath(); for (let i = -40; i <= 40; i += 4) g.lineTo(i, yy + Math.sin(i * 0.25 + t * 6) * 3); g.stroke(); }
  } else if (deco === 'speed') {
    g.strokeStyle = color; g.lineWidth = 4;
    for (const yy of [-20, 0, 20]) { g.beginPath(); g.moveTo(-50, yy); g.lineTo(-32, yy); g.stroke(); }
  } else if (deco === 'roll') {
    g.strokeStyle = color; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, 50, 0.3 + t * 3, 0.3 + t * 3 + 4.2); g.stroke();
  } else if (deco === 'kick') {
    g.strokeStyle = color; g.lineWidth = 4;
    g.beginPath(); g.arc(14, 0, 44, -1.9, -0.9); g.stroke(); g.beginPath(); g.arc(14, 0, 54, -1.8, -1.0); g.stroke();
  } else if (deco === 'float') {
    g.fillStyle = color; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(0, 46, 22, 5, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
}

function decoFront(g, deco, color, t, parts) {
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 4;
  if (deco === 'clap') {
    for (const [a, r] of [[-2.2, 20], [-1.57, 22], [-0.9, 20]]) { g.beginPath(); g.moveTo(Math.cos(a) * 12, -14 + Math.sin(a) * 12); g.lineTo(Math.cos(a) * r * 1.3, -14 + Math.sin(a) * r * 1.3); g.stroke(); }
  } else if (deco === 'wave') {
    const h = parts[3][2];
    g.beginPath(); g.arc(h[0] + 4, h[1], 12, -1.2, 0.4); g.stroke(); g.beginPath(); g.arc(h[0] + 4, h[1], 19, -1.2, 0.4); g.stroke();
  } else if (deco === 'bump') {
    g.beginPath(); g.arc(-26, 14, 8, 2, 4.4); g.stroke(); g.beginPath(); g.arc(-26, 14, 15, 2, 4.4); g.stroke();
  } else if (deco === 'peace') {
    const h = parts[3][2];
    g.lineWidth = 3.5; g.strokeStyle = NAVY;
    g.beginPath(); g.moveTo(h[0], h[1]); g.lineTo(h[0] - 2, h[1] - 12); g.moveTo(h[0], h[1]); g.lineTo(h[0] + 6, h[1] - 11); g.stroke();
  } else if (deco === 'sparkle') {
    for (const [x, y, s] of [[-44, -30, 1], [44, -36, 0.8], [40, 10, 0.6]]) { g.save(); g.translate(x, y); g.scale(s * (0.8 + 0.2 * Math.sin(t * 6 + x)), s); drawSparkleShape(g, 26, '#ffd23f'); g.restore(); }
  } else if (deco === 'wobble') {
    g.beginPath(); g.arc(0, -10, 44, -2.6, -2.1); g.stroke(); g.beginPath(); g.arc(0, -10, 44, -1.05, -0.55); g.stroke();
  } else if (deco === 'hula') {
    g.lineWidth = 3;
    for (let i = -3; i <= 3; i++) { const sw = Math.sin(t * 8 + i) * 3; g.beginPath(); g.moveTo(i * 5 + 8, 18); g.lineTo(i * 6 + 8 + sw, 34); g.stroke(); }
  } else if (deco === 'hop') {
    g.beginPath(); g.moveTo(-14, 54); g.lineTo(-20, 62); g.moveTo(0, 54); g.lineTo(0, 64); g.moveTo(14, 54); g.lineTo(20, 62); g.stroke();
  } else if (deco === 'float') {
    for (const [x, y] of [[-36, -40], [36, -46]]) { g.save(); g.translate(x, y + Math.sin(t * 3 + x) * 3); drawSparkleShape(g, 20, '#ffffff'); g.restore(); }
  }
}

// ---------------------------------------------------------------------------
// The rehearsal studio behind the setup stations.
export function drawStudio(g, W, H, t) {
  const img = art('bg/dance-studio');
  if (img) { g.drawImage(img, 0, 0, W, H); return; }
  g.fillStyle = vgrad(g, 0, 0, H, ['#ffd9ec', '#ffc4e1']); g.fillRect(0, 0, W, H);
  // mirror panels
  const top = 120, bot = H - 190, n = 6, pw = W / n;
  for (let i = 0; i < n; i++) {
    const x = i * pw + 14;
    g.fillStyle = vgrad(g, top, top, bot - top, ['#e8f4ff', '#cfe3f7', '#e4d8ff']);
    ui.roundRect(g, x, top, pw - 28, bot - top, 18); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#ff9fcf'; g.stroke();
    g.save(); g.clip(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 18;
    for (let k = 0; k < 2; k++) { const sx = x + 60 + k * 70 + ((t * 20) % 40); g.beginPath(); g.moveTo(sx, top); g.lineTo(sx - 160, bot); g.stroke(); }
    g.restore();
  }
  // barre
  g.fillStyle = '#d99a5b'; g.strokeStyle = NAVY; g.lineWidth = 4;
  ui.roundRect(g, 0, H - 300, W, 18, 9); g.fill(); g.stroke();
  // fairy lights
  g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath(); for (let i = 0; i <= 60; i++) { const k = i / 60; g.lineTo(k * W, 40 + Math.abs(Math.sin(k * Math.PI * 6)) * 40); } g.stroke();
  for (let i = 0; i < 36; i++) {
    const k = (i + 0.5) / 36, x = k * W, y = 46 + Math.abs(Math.sin(k * Math.PI * 6)) * 40;
    g.fillStyle = RAINBOW[i % RAINBOW.length]; g.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3 + i);
    g.beginPath(); g.arc(x, y + 8, 8, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  // wood floor
  g.fillStyle = vgrad(g, H - 190, H - 190, 190, ['#e8b27c', '#d4955a']); g.fillRect(0, H - 190, W, 190);
  g.strokeStyle = 'rgba(120,60,20,0.25)'; g.lineWidth = 3;
  for (let x = 0; x < W; x += 120) { g.beginPath(); g.moveTo(x, H - 190); g.lineTo(x - 60, H); g.stroke(); }
}

