// Piñata Party: procedural art (piñatas, candy, the padded party bat, the
// backyard). Every piece is looked up as generated art first (art()/drawArt())
// and falls back to the drawing here.
import { W, H } from '../../engine/canvas.js';
import * as ui from '../../engine/ui.js';
import { art, drawArt } from '../../engine/art.js';
import { drawSparkleShape } from '../../engine/emotes.js';
import { TAU, clamp } from '../../engine/util.js';

export const NAVY = '#24163f';
export const RAINBOW6 = ['#ff5fa2', '#ffb03f', '#ffe14d', '#6fdc8c', '#5ec8ff', '#b07cff'];
const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------------------
// Piñata shapes. Local units: the body centre is (0, 0), a normal piñata is
// ~260 px wide at size 1. `rope` is where the rope ties on, `core` is the
// ellipse cracks appear in, `eyes`/`mouth`/`cheeks` place the live face and
// `strands` the swinging crepe-paper tassels (or tail).
// ---------------------------------------------------------------------------
function capsule(p, x1, y1, x2, y2, r) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.moveTo(x1 + Math.cos(a - Math.PI / 2) * r, y1 + Math.sin(a - Math.PI / 2) * r);
  p.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2);
  p.arc(x1, y1, r, a + Math.PI / 2, a + Math.PI * 1.5);
  p.closePath();
}
function ell(p, x, y, rx, ry) { p.moveTo(x + rx, y); p.ellipse(x, y, rx, ry, 0, 0, TAU); p.closePath(); }

function legs(p, y0, y1) {
  capsule(p, -72, y0 - 8, -74, y1 - 6, 15); capsule(p, -38, y0, -36, y1, 15);
  capsule(p, 22, y0, 24, y1, 15); capsule(p, 56, y0 - 8, 60, y1 - 6, 15);
}

export const PINATAS = {
  star: {
    name: 'Star',
    bands: RAINBOW6,
    path() {
      const p = new Path2D();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 50 : 114;
        if (i === 0) p.moveTo(Math.cos(a) * r, Math.sin(a) * r); else p.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      p.closePath();
      return p;
    },
    rope: [0, -112], core: [0, 4, 52, 46],
    eyes: [[-20, -2], [20, -2]], mouth: [0, 20], cheeks: [[-34, 14], [34, 14]],
    strands: [[108, -34], [66, 90], [-66, 90], [-108, -34]],
  },
  unicorn: {
    name: 'Unicorn',
    bands: ['#ffffff', '#ffc2e2', '#dccbff', '#bfe9ff', '#fff0a8'],
    path() {
      const p = new Path2D();
      ell(p, -12, 18, 92, 48); legs(p, 46, 102);
      capsule(p, 40, 0, 78, -72, 26);
      ell(p, 92, -82, 40, 32); ell(p, 122, -66, 26, 21);
      p.moveTo(70, -102); p.lineTo(80, -136); p.lineTo(94, -106); p.closePath();
      return p;
    },
    rope: [-12, -30], core: [-14, 18, 64, 30],
    eyes: [[100, -88]], mouth: [126, -54], cheeks: [[112, -68]],
    strands: [[-100, 4]],
    extra: 'unicorn',
  },
  llama: {
    name: 'Llama',
    bands: ['#fff3c9', '#ffd1e8', '#c9f2e0', '#ffe38a', '#d9e4ff'],
    path() {
      const p = new Path2D();
      ell(p, -12, 22, 88, 44); legs(p, 50, 104);
      capsule(p, 42, 12, 58, -84, 23);
      ell(p, 66, -98, 33, 26); ell(p, 92, -90, 21, 17);
      capsule(p, 52, -116, 46, -146, 8); capsule(p, 70, -118, 72, -148, 8);
      ell(p, -100, 6, 18, 16);
      return p;
    },
    rope: [-12, -22], core: [-14, 22, 60, 28],
    eyes: [[74, -104]], mouth: [96, -82], cheeks: [[82, -90]],
    strands: [],
    extra: 'llama',
  },
  donkey: {
    name: 'Donkey',
    bands: ['#ff7ab8', '#ffa24a', '#ffe14d', '#7fe08a', '#62c6ff', '#b58cff'],
    path() {
      const p = new Path2D();
      ell(p, -10, 20, 90, 46); legs(p, 48, 104);
      capsule(p, 40, 4, 66, -54, 27);
      ell(p, 84, -66, 37, 31); ell(p, 114, -50, 27, 22);
      capsule(p, 70, -90, 56, -144, 11); capsule(p, 88, -92, 92, -146, 11);
      return p;
    },
    rope: [-10, -26], core: [-12, 20, 62, 30],
    eyes: [[92, -74]], mouth: [118, -40], cheeks: [[104, -56]],
    strands: [[-98, 2]],
    extra: 'donkey',
  },
};
export const PINATA_KINDS = Object.keys(PINATAS);

// Off-screen box every piñata is drawn into (local units).
const BOX = { x0: -160, y0: -190, w: 330, h: 330 };
const CS = 1.6;                // cache resolution multiplier
const cache = new Map();

function fringeFill(g, path, colors, band = 15) {
  g.save(); g.clip(path);
  const { x0, y0, w, h } = BOX;
  let i = 0;
  for (let y = y0; y < y0 + h; y += band, i++) { g.fillStyle = colors[i % colors.length]; g.fillRect(x0, y, w, band + 1); }
  // crepe-paper fringe: the band above hangs little tongues over the one below
  i = 0;
  for (let y = y0 + band; y < y0 + h; y += band, i++) {
    g.fillStyle = 'rgba(36,22,63,0.13)'; g.fillRect(x0, y + 5, w, 2.5);
    g.fillStyle = colors[i % colors.length];
    g.beginPath();
    for (let x = x0 + ((i * 3) % 7); x < x0 + w; x += 7) { g.moveTo(x, y - 1); g.lineTo(x + 3.5, y + 6 + (hh(x * 0.3 + i) * 3)); g.lineTo(x + 7, y - 1); }
    g.fill();
  }
  // soft cel shading
  const gr = g.createLinearGradient(-100, -120, 90, 120);
  gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(36,22,63,0.22)');
  g.fillStyle = gr; g.fillRect(x0, y0, w, h);
  g.restore();
}

function outlineThenFill(g, path, colors) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = NAVY; g.lineWidth = 11; g.stroke(path);
  fringeFill(g, path, colors);
}

function drawExtras(g, kind) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (kind === 'unicorn') {
    // rainbow mane curls down the back of the neck
    const pts = [];
    for (let i = 0; i < 7; i++) { const k = i / 6; pts.push([66 - k * 44 - 10, -112 + k * 96]); }
    g.strokeStyle = NAVY; g.lineWidth = 6;
    for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, 15, 0, TAU); g.stroke(); }
    pts.forEach(([x, y], i) => { g.fillStyle = RAINBOW6[i % 6]; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill(); });
    g.fillStyle = 'rgba(255,255,255,0.45)'; for (const [x, y] of pts) { g.beginPath(); g.arc(x - 5, y - 5, 4, 0, TAU); g.fill(); }
    // golden horn
    g.beginPath(); g.moveTo(88, -106); g.lineTo(104, -168); g.lineTo(114, -102); g.closePath();
    g.fillStyle = '#ffd23f'; g.fill(); g.strokeStyle = NAVY; g.lineWidth = 5; g.stroke();
    g.strokeStyle = '#e2a400'; g.lineWidth = 3;
    for (let k = 0; k < 4; k++) { const y = -114 - k * 13; g.beginPath(); g.moveTo(91 + k * 3.4, y + 4); g.lineTo(112 - k * 2.4, y - 4); g.stroke(); }
    // hooves
    g.fillStyle = '#c9a0ff'; g.strokeStyle = NAVY; g.lineWidth = 4;
    for (const x of [-74, -36, 24, 60]) { g.beginPath(); g.ellipse(x, x < 0 && x < -50 || x > 50 ? 98 : 104, 15, 7, 0, 0, TAU); g.fill(); g.stroke(); }
  } else if (kind === 'llama') {
    // a woven blanket over the back with pom-poms
    const p = new Path2D(); { const x = -64, y = -26, w = 96, h = 64, r = 16; p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); }
    g.save(); g.clip(p);
    const cols = ['#ff4d6d', '#ffd23f', '#2ec4b6', '#b07cff'];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[i % 4]; g.fillRect(-70, -26 + i * 11, 110, 11);
      g.fillStyle = cols[(i + 2) % 4];
      g.beginPath(); for (let x = -70; x < 40; x += 12) { g.moveTo(x, -26 + i * 11 + 11); g.lineTo(x + 6, -26 + i * 11 + 3); g.lineTo(x + 12, -26 + i * 11 + 11); } g.fill();
    }
    g.restore();
    g.strokeStyle = NAVY; g.lineWidth = 5; g.stroke(p);
    for (const [x, c] of [[-60, '#ff4d6d'], [-16, '#ffd23f'], [28, '#2ec4b6']]) { g.fillStyle = c; g.beginPath(); g.arc(x, 44, 8, 0, TAU); g.fill(); g.lineWidth = 3.5; g.stroke(); }
    // ear tips
    g.fillStyle = '#ff9ccf'; for (const [x, y] of [[46, -142], [72, -144]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
  } else if (kind === 'donkey') {
    // spiky fringe mane
    g.strokeStyle = NAVY; g.lineWidth = 5; g.fillStyle = '#ff5fa2';
    g.beginPath(); g.moveTo(46, -86);
    for (let i = 0; i < 6; i++) { const k = i / 5; const x = 60 - k * 38, y = -92 + k * 74; g.lineTo(x - 22, y - 2); g.lineTo(x - 6, y + 10); }
    g.lineTo(30, 4); g.closePath(); g.fill(); g.stroke();
    // inner ears
    g.fillStyle = '#ffb3d9'; g.lineWidth = 3;
    for (const [x1, y1, x2, y2] of [[68, -98, 58, -134], [88, -100, 91, -136]]) { g.beginPath(); g.moveTo(x1 - 4, y1); g.lineTo(x2, y2); g.lineTo(x1 + 5, y1); g.closePath(); g.fill(); }
    // nostril
    g.fillStyle = NAVY; g.beginPath(); g.ellipse(128, -52, 3.5, 5, 0.3, 0, TAU); g.fill();
  } else if (kind === 'star') {
    // a shiny centre medallion behind the face
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(0, 8, 46, 40, 0, 0, TAU); g.fill();
  }
}

/** Cached canvas for a piñata kind (body only; face, cracks and tassels are live). */
export function pinataCanvas(kind) {
  const key = kind;
  if (cache.has(key)) return cache.get(key);
  const def = PINATAS[kind];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(BOX.w * CS); cv.height = Math.ceil(BOX.h * CS);
  const g = cv.getContext('2d');
  g.scale(CS, CS); g.translate(-BOX.x0, -BOX.y0);
  const path = def.path();
  outlineThenFill(g, path, def.bands);
  drawExtras(g, kind);
  cache.set(key, cv);
  return cv;
}

/** Live tassels / tail strands. `sway` radians, `t` time. */
export function drawStrands(g, def, sway, t, scale = 1) {
  for (let s = 0; s < def.strands.length; s++) {
    const [sx, sy] = def.strands[s];
    for (let k = 0; k < 4; k++) {
      const len = 40 + k * 5, a = Math.PI / 2 + sway + Math.sin(t * 5 + k + s) * 0.12 + (k - 1.5) * 0.18;
      const ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
      g.strokeStyle = NAVY; g.lineWidth = 9 * scale; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + Math.cos(a + 0.3) * len * 0.5, sy + Math.sin(a + 0.3) * len * 0.5, ex, ey); g.stroke();
      g.strokeStyle = RAINBOW6[(k + s * 2) % 6]; g.lineWidth = 5.5 * scale;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + Math.cos(a + 0.3) * len * 0.5, sy + Math.sin(a + 0.3) * len * 0.5, ex, ey); g.stroke();
    }
    g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.arc(sx, sy, 7, 0, TAU); g.fill(); g.stroke();
  }
}

/** Live face. mood: 'happy' | 'giggle' | 'wow'. */
export function drawFace(g, def, mood, t) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const blink = mood === 'happy' && (t % 3.3) > 3.15;
  for (const [x, y] of def.eyes) {
    if (mood === 'giggle' || blink) {
      g.strokeStyle = NAVY; g.lineWidth = 4.5;
      g.beginPath(); g.arc(x, y + 3, 7, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else {
      const r = mood === 'wow' ? 8.5 : 7;
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(x, y, r * 0.85, r * 1.15, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 2, y - 3.5, 2.6, 0, TAU); g.fill();
    }
  }
  g.fillStyle = 'rgba(255,90,150,0.45)';
  for (const [x, y] of def.cheeks) { g.beginPath(); g.ellipse(x, y, 9, 5.5, 0, 0, TAU); g.fill(); }
  const [mx, my] = def.mouth;
  g.strokeStyle = NAVY; g.lineWidth = 4;
  if (mood === 'wow') { g.fillStyle = '#ff6f91'; g.beginPath(); g.ellipse(mx, my + 2, 6, 7.5, 0, 0, TAU); g.fill(); g.stroke(); }
  else if (mood === 'giggle') { g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(mx, my - 2, 9, 0.05 * Math.PI, 0.95 * Math.PI); g.closePath(); g.fill(); g.stroke(); }
  else { g.beginPath(); g.arc(mx, my - 6, 9, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
}

/** Seeded crack lines inside the core ellipse; draws the first `n`. */
export function makeCracks(seed, core) {
  const [cx, cy, rx, ry] = core;
  const out = [];
  for (let i = 0; i < 5; i++) {
    const a = hh(seed + i * 3.1) * TAU, r = 0.3 + hh(seed + i * 7.7) * 0.5;
    let x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    const pts = [[x, y]];
    let dir = hh(seed + i * 5.3) * TAU;
    for (let k = 0; k < 4; k++) {
      dir += (k % 2 ? 1 : -1) * (0.6 + hh(seed + i + k) * 0.6);
      x += Math.cos(dir) * (12 + hh(seed * 3 + k + i) * 10); y += Math.sin(dir) * (10 + hh(seed * 5 + k - i) * 8);
      x = clamp(x, cx - rx, cx + rx); y = clamp(y, cy - ry, cy + ry);
      pts.push([x, y]);
    }
    out.push(pts);
  }
  return out;
}

export function drawCracks(g, cracks, n) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < Math.min(n, cracks.length); i++) {
    const pts = cracks[i];
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 7;
    g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x + 1.5, y + 2) : g.moveTo(x + 1.5, y + 2))); g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    if (n >= 4 && i < 2) {
      // a little hole with candy peeking out
      const [x, y] = pts[2];
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(x, y, 9, 7, 0.4, 0, TAU); g.fill();
      g.fillStyle = RAINBOW6[i * 3]; g.beginPath(); g.arc(x - 1, y, 3.5, 0, TAU); g.fill();
    }
  }
}

/**
 * Draw a whole piñata at the current transform (body centre = origin).
 * o: { mood, cracks, crackN, sway, t, gold, flip }
 */
export function drawPinata(g, kind, o = {}) {
  const def = PINATAS[kind];
  const t = o.t || 0;
  if (o.gold) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(0, 0, 30, 0, 0, 190);
    gr.addColorStop(0, `rgba(255,230,120,${0.35 + Math.sin(t * 5) * 0.1})`); gr.addColorStop(1, 'rgba(255,210,80,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 190, 0, TAU); g.fill(); g.restore();
  }
  // tail/tassels behind the body for animals, in front for the star
  if (kind !== 'star') drawStrands(g, def, o.sway || 0, t);
  const key = 'prop/pinata-' + kind;
  const img = art(key);
  if (img) {
    // Generated piñata: 520x520 transparent, body centre at the image centre,
    // drawn into the same 325x325 local box as the procedural one.
    drawArt(g, key, 0, -12, 325, 325);
  } else {
    const cv = pinataCanvas(kind);
    g.drawImage(cv, BOX.x0, BOX.y0, BOX.w, BOX.h);
  }
  if (kind === 'star') drawStrands(g, def, o.sway || 0, t);
  if (o.cracks) drawCracks(g, o.cracks, o.crackN || 0);
  if (!img) drawFace(g, def, o.mood || 'happy', t);
  if (o.gold) {
    for (let i = 0; i < 4; i++) {
      const a = t * 1.6 + (i * TAU) / 4;
      g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6 + i * 2);
      g.translate(Math.cos(a) * 120, Math.sin(a) * 90); drawSparkleShape(g, 22, '#fff6a8'); g.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// Candy
// ---------------------------------------------------------------------------
export const CANDY_R = { sweet: 20, pop: 22, gold: 25 };
const WRAP = ['#ff5fa2', '#5ec8ff', '#7ee08a', '#b07cff', '#ffb03f'];
const candyCache = new Map();

function candyArtKey(kind) { return kind === 'sweet' ? 'prop/candy-wrapped' : kind === 'pop' ? 'prop/candy-lollipop' : 'prop/candy-golden'; }

function paintCandy(g, kind, v) {
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = NAVY;
  if (kind === 'pop') {
    // lollipop: swirl disc on a stick
    g.lineWidth = 7; g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 30); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 30); g.stroke();
    const c1 = WRAP[v % 5], c2 = '#ffffff';
    g.fillStyle = c1; g.strokeStyle = NAVY; g.lineWidth = 3.5; g.beginPath(); g.arc(0, -4, 18, 0, TAU); g.fill(); g.stroke();
    g.save(); g.beginPath(); g.arc(0, -4, 16, 0, TAU); g.clip();
    g.strokeStyle = c2; g.lineWidth = 4.5; g.beginPath();
    for (let a = 0; a < 12; a += 0.25) { const r = a * 1.4; g.lineTo(Math.cos(a) * r, -4 + Math.sin(a) * r); }
    g.stroke(); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-7, -12, 4, 2.5, -0.6, 0, TAU); g.fill();
    return;
  }
  const gold = kind === 'gold';
  const body = gold ? '#ffd23f' : WRAP[v % 5];
  const r = gold ? 16 : 13;
  // twisted wrapper ends
  for (const s of [-1, 1]) {
    g.fillStyle = gold ? '#ffe680' : body; g.lineWidth = 3;
    g.beginPath(); g.moveTo(s * (r - 2), 0); g.lineTo(s * (r + 13), -10); g.lineTo(s * (r + 10), 0); g.lineTo(s * (r + 13), 10); g.closePath(); g.fill(); g.stroke();
  }
  g.fillStyle = body; g.lineWidth = 3.5;
  g.beginPath(); g.ellipse(0, 0, r + 3, r, 0, 0, TAU); g.fill(); g.stroke();
  g.save(); g.beginPath(); g.ellipse(0, 0, r + 1, r - 2, 0, 0, TAU); g.clip();
  g.strokeStyle = gold ? '#fff7c2' : 'rgba(255,255,255,0.75)'; g.lineWidth = 4;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 10 - 10, 14); g.lineTo(k * 10 + 10, -14); g.stroke(); }
  g.restore();
  if (gold) { g.save(); g.translate(0, 0); drawSparkleShape(g, 14, '#ffffff'); g.restore(); }
  g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.ellipse(-6, -6, 4, 2.4, -0.5, 0, TAU); g.fill();
}

function candyCanvas(kind, v) {
  const key = kind + (kind === 'gold' ? '' : v % 5);
  let cv = candyCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'); g.translate(64, 64); g.scale(1.6, 1.6);
  paintCandy(g, kind, v);
  candyCache.set(key, cv);
  return cv;
}

/** Candy centred at (x, y); s = scale. */
export function drawCandy(g, kind, v, x, y, s = 1, rot = 0, t = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (kind === 'gold') {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, 46);
    gr.addColorStop(0, `rgba(255,236,120,${0.55 + Math.sin(t * 7) * 0.2})`); gr.addColorStop(1, 'rgba(255,236,120,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 46, 0, TAU); g.fill(); g.restore();
  }
  // Generated candy: 128x128 transparent, centred, filling ~80% of the canvas.
  if (!drawArt(g, candyArtKey(kind), 0, 0, 72, 72)) g.drawImage(candyCanvas(kind, v), -40, -40, 80, 80);
  g.restore();
}

// ---------------------------------------------------------------------------
// The padded party bat. (x, y) = grip, ang = direction the bat points, L = length.
// ---------------------------------------------------------------------------
export function drawBat(g, x, y, ang, L, color) {
  g.save(); g.translate(x, y); g.rotate(ang);
  // Generated bat: 480x120 transparent, horizontal, handle knob at the left
  // edge, the hand's grip point 20% in (x=96), padded barrel to the right edge.
  if (drawArt(g, 'prop/party-bat', L * 0.36, 0, L * 1.2, L * 0.3)) { g.restore(); return; }
  g.lineJoin = 'round'; g.lineCap = 'round';
  const hr = L * 0.045, r1 = L * 0.085, r2 = L * 0.13, a = L * 0.3;
  // handle + knob
  g.fillStyle = '#6c7fe0'; g.strokeStyle = NAVY; g.lineWidth = 4;
  const hp = new Path2D(); capsule(hp, -L * 0.14, 0, a + 4, 0, hr); g.fill(hp); g.stroke(hp);
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
  for (let k = 0; k < 4; k++) { const xx = -L * 0.08 + k * L * 0.08; g.beginPath(); g.moveTo(xx, -hr + 1); g.lineTo(xx + 5, hr - 1); g.stroke(); }
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.arc(-L * 0.15, 0, hr * 1.5, 0, TAU); g.fill(); g.stroke();
  // padded barrel
  const bp = new Path2D();
  bp.moveTo(a, -r1); bp.lineTo(L - r2, -r2); bp.arc(L - r2, 0, r2, -Math.PI / 2, Math.PI / 2); bp.lineTo(a, r1); bp.arc(a, 0, r1, Math.PI / 2, Math.PI * 1.5); bp.closePath();
  g.fillStyle = color; g.fill(bp);
  g.save(); g.clip(bp);
  g.strokeStyle = '#ffffff'; g.lineWidth = L * 0.06;
  for (let k = 0; k < 6; k++) { const xx = a + k * L * 0.13; g.beginPath(); g.moveTo(xx - r2, r2 * 1.2); g.lineTo(xx + r2, -r2 * 1.2); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(a, -r2, L, r2 * 0.55);
  g.fillStyle = 'rgba(36,22,63,0.18)'; g.fillRect(a, r2 * 0.45, L, r2);
  g.restore();
  g.strokeStyle = NAVY; g.lineWidth = 4.5; g.stroke(bp);
  g.restore();
}

// ---------------------------------------------------------------------------
// Backyard
// ---------------------------------------------------------------------------
export const BAR_Y = 152;      // crossbar the ropes hang from (centre of the painted bar in bg/pinata-party)
export const LAWN_Y = 400;

function balloon(g, x, y, r, color, stringTo) {
  g.strokeStyle = 'rgba(36,22,63,0.55)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, y + r); g.quadraticCurveTo(x + 10, (y + stringTo) / 2 + 20, stringTo === undefined ? x : x - 6, stringTo ?? y + r + 90); g.stroke();
  g.fillStyle = color; g.strokeStyle = NAVY; g.lineWidth = 4;
  g.beginPath(); g.ellipse(x, y, r * 0.86, r, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 5, y + r + 6); g.lineTo(x, y + r - 2); g.lineTo(x + 5, y + r + 6); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x - r * 0.32, y - r * 0.38, r * 0.16, r * 0.26, -0.5, 0, TAU); g.fill();
}

function bunting(g, x0, x1, y, sag, size = 28) {
  g.strokeStyle = NAVY; g.lineWidth = 3;
  const n = Math.max(2, Math.round((x1 - x0) / (size * 1.5)));
  const at = (k) => ({ x: x0 + (x1 - x0) * k, y: y + Math.sin(k * Math.PI) * sag });
  g.beginPath(); for (let i = 0; i <= 40; i++) { const p = at(i / 40); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); } g.stroke();
  for (let i = 0; i < n; i++) {
    const p = at((i + 0.5) / n);
    g.fillStyle = RAINBOW6[i % 6]; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(p.x - size / 2, p.y); g.lineTo(p.x + size / 2, p.y); g.lineTo(p.x, p.y + size * 1.15); g.closePath(); g.fill(); g.stroke();
  }
}

/** The static backyard, rendered once. */
export function buildBackground() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  // sky
  ui.sky(g, '#7fd0ff', '#e6f7ff', LAWN_Y);
  g.save(); g.translate(1640, 250); g.fillStyle = 'rgba(255,246,168,0.45)';
  for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(70, -12); g.lineTo(170, 0); g.lineTo(70, 12); g.fill(); }
  g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, 66, 0, TAU); g.fill(); g.restore();
  ui.cloud(g, 330, 225, 0.8); ui.cloud(g, 1180, 205, 0.65); ui.cloud(g, 760, 290, 0.5, '#fff', 0.8);
  // trees behind the fence
  for (let i = 0; i < 14; i++) {
    const x = i * 150 + (i % 2) * 40 - 30, y = 330 + (i % 3) * 8, r = 70 + (i % 3) * 16;
    g.fillStyle = i % 2 ? '#4fb35f' : '#5cc26a'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.arc(x + r * 0.7, y + 18, r * 0.7, 0, TAU); g.fill();
  }
  g.fillStyle = '#3f9a52'; g.fillRect(0, 352, W, 60);
  // picket fence
  const fy = 300;
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 3;
  g.fillRect(0, fy + 38, W, 14); g.strokeRect(-4, fy + 38, W + 8, 14);
  g.fillRect(0, fy + 76, W, 14); g.strokeRect(-4, fy + 76, W + 8, 14);
  for (let x = 6; x < W; x += 44) {
    g.beginPath(); g.moveTo(x, LAWN_Y + 12); g.lineTo(x, fy + 12); g.lineTo(x + 15, fy); g.lineTo(x + 30, fy + 12); g.lineTo(x + 30, LAWN_Y + 12); g.closePath();
    g.fillStyle = '#fffaf2'; g.fill(); g.stroke();
  }
  // lawn with mowing stripes
  const lg = g.createLinearGradient(0, LAWN_Y, 0, H); lg.addColorStop(0, '#6cc45e'); lg.addColorStop(1, '#86dc6f');
  g.fillStyle = lg; g.fillRect(0, LAWN_Y, W, H - LAWN_Y);
  g.save(); g.globalAlpha = 0.12; g.fillStyle = '#ffffff';
  for (let i = -6; i < 20; i += 2) { g.beginPath(); g.moveTo(i * 130, H); g.lineTo(i * 130 + 130, H); g.lineTo(960 + (i + 1) * 60 - 480, LAWN_Y); g.lineTo(960 + i * 60 - 480, LAWN_Y); g.closePath(); g.fill(); }
  g.restore();
  g.fillStyle = 'rgba(30,90,40,0.28)'; g.fillRect(0, LAWN_Y, W, 16);
  // grass tufts + daisies
  for (let i = 0; i < 130; i++) {
    const x = hh(i) * W, y = LAWN_Y + 30 + hh(i + 50) * (H - LAWN_Y - 40);
    g.strokeStyle = 'rgba(40,120,50,0.5)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x - 7, y - 9); g.moveTo(x, y); g.lineTo(x, y - 12); g.moveTo(x + 5, y); g.lineTo(x + 7, y - 9); g.stroke();
  }
  for (let i = 0; i < 46; i++) {
    const x = hh(i + 300) * W, y = LAWN_Y + 40 + hh(i + 400) * (H - LAWN_Y - 60);
    const s = 0.7 + ((y - LAWN_Y) / (H - LAWN_Y)) * 0.6;
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) { const a = (k * TAU) / 5; g.beginPath(); g.ellipse(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 3 * s, 4 * s, 2.6 * s, a, 0, TAU); g.fill(); }
    g.fillStyle = ['#ffd23f', '#ff9ccf'][i % 2]; g.beginPath(); g.arc(x, y, 2.6 * s, 0, TAU); g.fill();
  }
  // party table at the back right (behind the play area)
  const tx = 1560, ty = 418;
  g.fillStyle = 'rgba(30,70,30,0.25)'; g.beginPath(); g.ellipse(tx, ty + 6, 170, 16, 0, 0, TAU); g.fill();
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 4;
  ui.roundRect(g, tx - 150, ty - 64, 300, 50, 8); g.fill(); g.stroke();
  g.save(); ui.roundRect(g, tx - 150, ty - 64, 300, 50, 8); g.clip();
  g.fillStyle = '#ff9ccf'; for (let x = tx - 150; x < tx + 150; x += 40) g.fillRect(x, ty - 64, 20, 50);
  g.restore(); ui.roundRect(g, tx - 150, ty - 64, 300, 50, 8); g.stroke();
  for (const lx of [tx - 130, tx + 122]) { g.fillStyle = '#c98a4f'; g.fillRect(lx, ty - 16, 10, 22); g.strokeRect(lx, ty - 16, 10, 22); }
  // cake + presents on the table
  g.fillStyle = '#fff3d6'; ui.roundRect(g, tx - 40, ty - 112, 80, 48, 10); g.fill(); g.stroke();
  g.fillStyle = '#ff6fb1'; g.fillRect(tx - 40, ty - 112, 80, 12); g.strokeRect(tx - 40, ty - 112, 80, 12);
  g.fillStyle = '#5ec8ff'; g.fillRect(tx - 3, ty - 136, 6, 24); g.fillStyle = '#ffb03f'; g.beginPath(); g.ellipse(tx, ty - 142, 5, 8, 0, 0, TAU); g.fill();
  for (const [px, pw, ph, c] of [[tx - 120, 52, 40, '#b07cff'], [tx + 62, 46, 52, '#7ee08a'], [tx + 108, 32, 30, '#ffd23f']]) {
    g.fillStyle = c; g.strokeStyle = NAVY; g.lineWidth = 4; g.fillRect(px, ty - 64 - ph, pw, ph); g.strokeRect(px, ty - 64 - ph, pw, ph);
    g.fillStyle = '#ff4d6d'; g.fillRect(px + pw / 2 - 4, ty - 64 - ph, 8, ph); g.fillRect(px, ty - 64 - ph / 2 - 4, pw, 8);
  }
  // balloon bunches on the fence
  balloon(g, 360, 250, 30, '#ff5fa2', 360); balloon(g, 400, 228, 28, '#ffe14d', 362); balloon(g, 330, 214, 26, '#5ec8ff', 358);
  balloon(g, 1240, 246, 28, '#b07cff', 352); balloon(g, 1278, 222, 30, '#7ee08a', 354);
  // piñata frame: candy-stripe posts + a wooden crossbar with bunting
  const post = (x) => {
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.fillRect(x - 15, BAR_Y - 10, 30, 470 - BAR_Y); g.strokeRect(x - 15, BAR_Y - 10, 30, 470 - BAR_Y);
    g.save(); g.beginPath(); g.rect(x - 15, BAR_Y - 10, 30, 470 - BAR_Y); g.clip();
    g.strokeStyle = '#ff4d6d'; g.lineWidth = 10;
    for (let y = BAR_Y - 40; y < 480; y += 34) { g.beginPath(); g.moveTo(x - 20, y + 20); g.lineTo(x + 20, y); g.stroke(); }
    g.restore(); g.strokeRect(x - 15, BAR_Y - 10, 30, 470 - BAR_Y);
    g.fillStyle = 'rgba(30,70,30,0.3)'; g.beginPath(); g.ellipse(x, 470, 34, 9, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.beginPath(); g.arc(x, BAR_Y - 14, 18, 0, TAU); g.fill(); g.stroke();
  };
  post(64); post(W - 64);
  g.fillStyle = '#c98a4f'; g.strokeStyle = NAVY; g.lineWidth = 5;
  ui.roundRect(g, 40, BAR_Y - 14, W - 80, 26, 12); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(52, BAR_Y - 10, W - 104, 6);
  bunting(g, 90, 940, BAR_Y + 12, 34, 26); bunting(g, 980, W - 90, BAR_Y + 12, 34, 26);
  // a soft vignette on the lawn edges
  const vg = g.createRadialGradient(W / 2, 700, 500, W / 2, 700, 1200);
  vg.addColorStop(0, 'rgba(20,40,20,0)'); vg.addColorStop(1, 'rgba(20,40,20,0.22)');
  g.fillStyle = vg; g.fillRect(0, LAWN_Y, W, H - LAWN_Y);
  return cv;
}
