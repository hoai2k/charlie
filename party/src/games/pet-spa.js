// Pet Spa (Play Studio): every player gets an animal friend at their own spa
// station. The pet arrives muddy and sad; scrub, rinse, towel, brush, add
// bows and give a treat until the happiness meter fills and the pet
// celebrates. Finale: a pet parade on a little stage.
//
// Pets are drawn with the normal Actor system. Mud, suds, water drops and
// accessories are drawn in the pet's *image space* through an attachment, so
// they ride every bounce and squash (and the mud is masked to the pet's own
// silhouette).
import { W, H } from '../engine/canvas.js';
import { Actor, getBaseImage } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime, steer } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { drawHeartShape, drawStarShape, drawSparkleShape } from '../engine/emotes.js';

const NAVY = '#24163f';

/** Play a recorded sound when it exists, else a synth stand-in. */
function snd(key, fallback, opts) { if (hasSound(key)) sfx(key, opts); else if (fallback) sfx(fallback, opts); }
const TOOL_ART = { sponge: 'prop/sponge', shower: 'prop/shower-head', towel: 'prop/towel', brush: 'prop/brush', treat: 'prop/pet-treat' };

// ---------------------------------------------------------------------------
// Pets. Fellowfox normally follows Felicity, so it gets a one-member entry
// built here (same base art, no game-wide data change needed).
const PETS = [
  { id: 'fox', name: 'Fox', char: 'fox' },
  { id: 'fellowfox', name: 'Fellowfox', custom: { asset: 'fellowfox', h: 110, dx: 0, dy: 0, follow: 0, face: [0.36, 0.38, 0.32], top: 0.95, facing: -1, motion: 'trot' }, color: '#ff8a2a' },
  { id: 'cotton-candy', name: 'Cotton Candy', char: 'cotton-candy' },
  { id: 'unicorn', name: 'Unicorn', char: 'unicorn' },
  { id: 'hotdog', name: 'Hotdog', char: 'hotdog' },
];

function makePetActor(def) {
  if (def.char) return new Actor(def.char);
  const a = new Actor('fox');
  a.char = { id: def.id, name: def.name, color: def.color, members: [def.custom] };
  a.charId = def.id;
  a.members = [{ def: def.custom, i: 0, x: 0, y: 0, facing: 1, phase: 0 }];
  return a;
}

// Alpha mask of a pet's base art (quarter resolution) for "is the cursor on
// the pet?" tests and for placing mud on the body.
const maskCache = new Map();
function petMask(asset) {
  if (maskCache.has(asset)) return maskCache.get(asset);
  const img = getBaseImage(asset);
  const iw = img ? img.width : 400, ih = img ? img.height : 400, D = 4;
  const mw = Math.ceil(iw / D), mh = Math.ceil(ih / D);
  const a = new Uint8Array(mw * mh);
  let ok = false;
  if (img) {
    try {
      const c = document.createElement('canvas'); c.width = mw; c.height = mh;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, mw, mh);
      const d = x.getImageData(0, 0, mw, mh).data;
      for (let i = 0; i < mw * mh; i++) a[i] = d[i * 4 + 3];
      ok = true;
    } catch (e) { ok = false; }
  }
  if (!ok) { // ellipse fallback
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const nx = (x / mw - 0.5) / 0.45, ny = (y / mh - 0.55) / 0.42;
      a[y * mw + x] = nx * nx + ny * ny < 1 ? 255 : 0;
    }
  }
  const pts = [];
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (a[y * mw + x] > 200) pts.push([(x + 0.5) * D, (y + 0.5) * D]);
  const m = {
    iw, ih, img, pts,
    at(ix, iy) {
      const x = Math.floor(ix / D), y = Math.floor(iy / D);
      if (x < 0 || y < 0 || x >= mw || y >= mh) return 0;
      return a[y * mw + x];
    },
    near(ix, iy, r) { // any opaque pixel within r (image px)
      for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) {
        if (this.at(ix + dx, iy + dy) > 120) return true;
      }
      return false;
    },
  };
  maskCache.set(asset, m);
  return m;
}

// ---------------------------------------------------------------------------
// Tools

const TOOLS = [
  { id: 'sponge', name: 'Soap' },
  { id: 'shower', name: 'Rinse' },
  { id: 'towel', name: 'Towel' },
  { id: 'brush', name: 'Brush' },
  { id: 'bow', name: 'Bows' },
  { id: 'treat', name: 'Treat' },
];
const TOOL_IDX = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));

const ACCESSORIES = [
  { kind: 'bow', color: '#ff6fb1' },
  { kind: 'flower', color: '#ffd23f' },
  { kind: 'star', color: '#ffd23f' },
  { kind: 'heart', color: '#ff4d6d' },
  { kind: 'crown', color: '#ffd23f' },
  { kind: 'bow', color: '#7fd3ff' },
  { kind: 'gem', color: '#9b5cff' },
  { kind: 'flower', color: '#ff8fd0' },
];

function drawAccessory(g, kind, color, s, t = 0) {
  g.save();
  g.lineWidth = Math.max(2, s * 0.09); g.strokeStyle = NAVY; g.lineJoin = 'round';
  switch (kind) {
    case 'bow': {
      g.fillStyle = color;
      for (const side of [-1, 1]) {
        g.beginPath(); g.moveTo(0, 0);
        g.bezierCurveTo(side * s * 0.5, -s * 0.55, side * s * 0.75, -s * 0.1, side * s * 0.62, s * 0.18);
        g.bezierCurveTo(side * s * 0.45, s * 0.35, side * s * 0.2, s * 0.1, 0, 0);
        g.fill(); g.stroke();
        g.beginPath(); g.moveTo(side * s * 0.05, s * 0.06); g.lineTo(side * s * 0.28, s * 0.55); g.lineTo(side * s * 0.12, s * 0.48); g.closePath(); g.fill(); g.stroke();
      }
      g.beginPath(); g.arc(0, 0, s * 0.15, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.38, -s * 0.12, s * 0.1, s * 0.05, -0.6, 0, TAU); g.fill();
      break;
    }
    case 'flower': {
      g.fillStyle = color;
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 - Math.PI / 2;
        g.beginPath(); g.ellipse(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3, s * 0.24, s * 0.17, a, 0, TAU); g.fill(); g.stroke();
      }
      g.fillStyle = '#ff9f1c'; g.beginPath(); g.arc(0, 0, s * 0.16, 0, TAU); g.fill(); g.stroke();
      break;
    }
    case 'star': g.rotate(Math.sin(t * 3) * 0.1); drawStarShape(g, s * 1.1, color); break;
    case 'heart': drawHeartShape(g, s * 0.95, color); break;
    case 'crown': {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(-s * 0.5, s * 0.2); g.lineTo(-s * 0.55, -s * 0.3); g.lineTo(-s * 0.25, -s * 0.05); g.lineTo(0, -s * 0.45);
      g.lineTo(s * 0.25, -s * 0.05); g.lineTo(s * 0.55, -s * 0.3); g.lineTo(s * 0.5, s * 0.2); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(0, s * 0.03, s * 0.09, 0, TAU); g.fill();
      g.fillStyle = '#7fd3ff'; g.beginPath(); g.arc(-s * 0.3, s * 0.07, s * 0.06, 0, TAU); g.arc(s * 0.3, s * 0.07, s * 0.06, 0, TAU); g.fill();
      break;
    }
    case 'gem': {
      g.fillStyle = color;
      g.beginPath(); g.moveTo(0, -s * 0.42); g.lineTo(s * 0.36, -s * 0.1); g.lineTo(0, s * 0.42); g.lineTo(-s * 0.36, -s * 0.1); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.moveTo(0, -s * 0.36); g.lineTo(s * 0.14, -s * 0.1); g.lineTo(-s * 0.14, -s * 0.1); g.closePath(); g.fill();
      break;
    }
    default: break;
  }
  g.restore();
}

/** Procedural tool icons (cursor + toolbar). */
function drawTool(g, id, x, y, s, t = 0, o = {}) {
  if (TOOL_ART[id] && drawArt(g, TOOL_ART[id], x, y, s * 1.1, s * 1.1)) return;
  g.save(); g.translate(x, y);
  g.lineWidth = Math.max(2, s * 0.07); g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
  switch (id) {
    case 'sponge': {
      g.rotate(-0.15);
      g.fillStyle = '#ffe04d'; ui.roundRect(g, -s * 0.48, -s * 0.32, s * 0.96, s * 0.64, s * 0.16); g.fill(); g.stroke();
      g.fillStyle = '#7fe0a8'; ui.roundRect(g, -s * 0.48, s * 0.12, s * 0.96, s * 0.2, s * 0.08); g.fill(); g.stroke();
      g.fillStyle = '#e8b820';
      for (const [hx, hy, r] of [[-0.25, -0.12, 0.07], [0.05, -0.18, 0.05], [0.25, -0.06, 0.08], [-0.05, 0.0, 0.05]]) { g.beginPath(); g.arc(hx * s, hy * s, r * s, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.strokeStyle = '#8fd6ff'; g.lineWidth = Math.max(1.5, s * 0.03);
      for (const [bx, by, r] of [[-0.32, -0.42, 0.1], [-0.1, -0.5, 0.07], [0.3, -0.45, 0.12]]) { g.beginPath(); g.arc(bx * s, by * s, r * s, 0, TAU); g.fill(); g.stroke(); }
      break;
    }
    case 'shower': {
      g.rotate(0.35);
      g.fillStyle = '#c9d6e8'; ui.roundRect(g, -s * 0.07, -s * 0.05, s * 0.14, s * 0.62, s * 0.06); g.fill(); g.stroke();
      g.fillStyle = '#e8f1ff'; g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.36, s * 0.22, 0, Math.PI, TAU); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#9fb3d1'; g.beginPath(); g.ellipse(0, -s * 0.12, s * 0.36, s * 0.07, 0, 0, TAU); g.fill(); g.stroke();
      g.rotate(-0.35);
      if (o.on !== false) {
        g.fillStyle = '#5cc8ff';
        for (let i = 0; i < 4; i++) {
          const p = ((t * 2.5) + i / 4) % 1;
          g.globalAlpha = 1 - p;
          g.beginPath(); g.ellipse(-s * 0.25 + i * s * 0.14, s * 0.05 + p * s * 0.45, s * 0.04, s * 0.08, 0, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
      }
      break;
    }
    case 'towel': {
      g.rotate(-0.1);
      g.fillStyle = '#ff9ecf'; ui.roundRect(g, -s * 0.45, -s * 0.35, s * 0.9, s * 0.7, s * 0.14); g.fill(); g.stroke();
      g.fillStyle = '#ffffff';
      g.fillRect(-s * 0.45 + 3, -s * 0.13, s * 0.9 - 6, s * 0.08); g.fillRect(-s * 0.45 + 3, s * 0.08, s * 0.9 - 6, s * 0.08);
      g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = Math.max(1, s * 0.03);
      g.beginPath(); g.moveTo(-s * 0.3, -s * 0.35); g.quadraticCurveTo(-s * 0.2, 0, -s * 0.3, s * 0.35); g.stroke();
      break;
    }
    case 'brush': {
      g.rotate(-0.6);
      g.fillStyle = '#c98a4f'; ui.roundRect(g, -s * 0.08, 0, s * 0.16, s * 0.55, s * 0.07); g.fill(); g.stroke();
      g.fillStyle = '#ff7ac6'; g.beginPath(); g.ellipse(0, -s * 0.14, s * 0.24, s * 0.3, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc((i - 1) * s * 0.11, -s * 0.26 + j * s * 0.12, s * 0.035, 0, TAU); g.fill(); }
      break;
    }
    case 'bow': drawAccessory(g, o.acc ? o.acc.kind : 'bow', o.acc ? o.acc.color : '#ff6fb1', s * 0.95, t); break;
    case 'treat': {
      // heart cookie with pink frosting
      g.save(); g.scale(1.05, 1.05);
      drawHeartShape(g, s * 0.95, '#e0a060');
      g.restore();
      g.save(); g.scale(0.78, 0.78); drawHeartShape(g, s * 0.95, '#ff9ecf'); g.restore();
      for (const [sx, sy, c] of [[-0.12, -0.12, '#7fd3ff'], [0.1, -0.15, '#ffd23f'], [0.0, 0.02, '#36d17a']]) {
        g.fillStyle = c; g.fillRect(sx * s - 2, sy * s - 5, 4, 10);
      }
      break;
    }
    default: break;
  }
  g.restore();
}

// Pre-rendered foam clumps (3 variants) so dozens of suds stay cheap.
const foamCache = [];
function foamSprite(i) {
  if (!foamCache[i]) {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d');
    g.translate(48, 48);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#a9dcff'; g.lineWidth = 3;
    const ph = i * 2.1;
    const blobs = [0, 1, 2, 3].map((j) => { const a = ph + j * 1.7; return [Math.cos(a) * 16, Math.sin(a) * 12, 17 + ((j * 7 + i * 3) % 3) * 4]; });
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#ffffff'; for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r - 2, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(190,230,255,0.6)'; g.beginPath(); g.arc(10, 8, 6, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#a9dcff'; g.lineWidth = 2;
    g.beginPath(); g.arc(-8, -10, 5, 0, TAU); g.stroke();
    foamCache[i] = c;
  }
  return foamCache[i];
}

function drawDuck(g, x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  if (drawArt(g, 'prop/rubber-duck', 0, 0, s * 1.2, s * 1.2)) { g.restore(); return; }
  g.lineWidth = Math.max(2, s * 0.08); g.strokeStyle = NAVY;
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.ellipse(0, s * 0.12, s * 0.48, s * 0.3, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(s * 0.2, -s * 0.22, s * 0.24, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.ellipse(s * 0.46, -s * 0.18, s * 0.14, s * 0.07, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(s * 0.26, -s * 0.27, s * 0.04, 0, TAU); g.fill();
  g.restore();
}

// ---------------------------------------------------------------------------

export const meta = {
  id: 'pet-spa',
  title: 'Pet Spa',
  category: 'studio',
  type: 'Caring · Everyone together',
  goal: 'Give your muddy pet a bubbly bath and make it super happy!',
  controls: [['stick', 'Move your hand'], ['a', 'Hold to use the tool'], ['rb', 'Change tool (LB / RB)'], ['x', 'Pick the next step'], ['b', 'Cuddle'], ['y', 'Squeaky duck']],
  tips: ['Scrub off the mud, then rinse the bubbles.', 'Towel your pet dry — watch it shake!', 'Fill the heart meter for a happy dance. Then put on a show!'],
  music: 'chill',
  duration: '1–2 min',
  minPlayers: 1, maxPlayers: 8,
  countdown: false,
  drawIcon(g, x, y, w, h, t) {
    // Tiled spa wall
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#bff3e6'); gr.addColorStop(1, '#ffd6ec');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = Math.max(1, h * 0.01);
    for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(x + (w * i) / 8, y); g.lineTo(x + (w * i) / 8, y + h * 0.62); g.stroke(); }
    for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(x, y + (h * 0.62 * j) / 5); g.lineTo(x + w, y + (h * 0.62 * j) / 5); g.stroke(); }
    g.restore();
    g.fillStyle = '#ffb3d9'; g.fillRect(x, y + h * 0.62, w, h * 0.38);
    const cx = x + w * 0.5, cy = y + h * 0.66, s = h / 200;
    // fox peeking out of a bubble bath
    const img = getBaseImage('fox');
    if (img) {
      const ih = h * 0.62, iw = (img.width / img.height) * ih;
      g.save(); g.beginPath(); g.rect(x, y, w, cy - y + 4 * s); g.clip();
      g.drawImage(img, cx - iw * 0.55, cy - ih * 0.62 + Math.sin(t * 2) * 3 * s, iw, ih);
      g.restore();
    }
    // tub
    g.save(); g.lineWidth = 5 * s; g.strokeStyle = NAVY;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(cx - 80 * s, cy); g.lineTo(cx + 80 * s, cy); g.quadraticCurveTo(cx + 78 * s, cy + 52 * s, cx + 40 * s, cy + 56 * s);
    g.lineTo(cx - 40 * s, cy + 56 * s); g.quadraticCurveTo(cx - 78 * s, cy + 52 * s, cx - 80 * s, cy); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; for (const fx2 of [-50, 50]) { g.beginPath(); g.arc(cx + fx2 * s, cy + 60 * s, 7 * s, 0, TAU); g.fill(); g.stroke(); }
    g.fillStyle = '#ff9ecf'; ui.roundRect(g, cx - 84 * s, cy - 6 * s, 168 * s, 14 * s, 7 * s); g.fill(); g.stroke();
    g.restore();
    // bubbles
    for (let i = 0; i < 14; i++) {
      const bx = cx + Math.cos(i * 2.1) * 75 * s, by = cy - 6 * s - Math.abs(Math.sin(i * 1.3)) * 22 * s;
      const r = (9 + (i % 4) * 4) * s;
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = '#8fd6ff'; g.lineWidth = 2 * s;
      g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.4 + i / 5) % 1;
      g.save(); g.globalAlpha = Math.sin(p * Math.PI);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.strokeStyle = '#ffffff'; g.lineWidth = 2 * s;
      g.beginPath(); g.arc(x + w * (0.15 + i * 0.18), y + h * (0.6 - p * 0.5), (6 + i * 2) * s, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
    g.save(); g.translate(x + w * 0.83, y + h * 0.22); g.rotate(Math.sin(t * 2) * 0.2); drawHeartShape(g, 34 * s, '#ff4f8b'); g.restore();
    drawDuck(g, x + w * 0.18, y + h * 0.83, 34 * s, Math.sin(t * 3) * 0.15);
    ui.text(g, 'Pet Spa', x + w / 2, y + h * 0.1, { size: h * 0.11, color: '#ffffff', maxWidth: w * 0.9 });
  },
};

// ---------------------------------------------------------------------------

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.t = 0;
    this.phase = 'spa';      // spa -> parade
    this.phaseT = 0;
    this.allDoneT = 0;
    this.finished = false;
    this.bubbles = Array.from({ length: 24 }, () => ({ x: rand(W), y: rand(H), r: rand(6, 22), sp: rand(20, 60), ph: rand(TAU) }));
    this.flying = [];        // treats and squeaky ducks in flight (screen space)
    const n = this.players.length;
    this.layoutStations(n);
    // Assign pets: all five before repeats, avoiding a player's own character.
    const order = shuffle(PETS);
    const count = new Map();
    this.stations = this.players.map((p, i) => {
      const uses = (d) => count.get(d.id) || 0;
      const cands = order.filter((d) => d.char !== p.charId);
      const def = cands.reduce((best, d) => (uses(d) < uses(best) ? d : best), cands[0]);
      count.set(def.id, uses(def) + 1);
      return this.makeStation(p, i, def);
    });
    this.banner = { text: 'Bath time!', t: 0 };
    sfx('magic');
  }

  layoutStations(n) {
    const top = 104, bottom = H - 16, gap = 18;
    const rows = n <= 4 ? 1 : 2;
    const perRow = rows === 1 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const cols = perRow[0];
    const sh = (bottom - top - gap * (rows - 1)) / rows;
    let sw = (W - 32 - gap * (cols - 1)) / cols;
    if (n === 1) sw = 1180;
    if (n === 2) sw = Math.min(sw, 900);
    this.rects = [];
    perRow.forEach((cnt, r) => {
      const total = cnt * sw + (cnt - 1) * gap;
      for (let c = 0; c < cnt; c++) this.rects.push({ x: (W - total) / 2 + c * (sw + gap), y: top + r * (sh + gap), w: sw, h: sh });
    });
  }

  makeStation(p, i, def) {
    const r = this.rects[i];
    const compact = r.h < 600;
    const s = {
      p, i, r, compact,
      headerH: compact ? 74 : 96,
      toolH: compact ? 62 : 84,
      k: Math.min(1.25, Math.max(0.6, Math.min(r.w / 460, r.h / 700))),
      cursor: { x: 0, y: 0, px: 0, py: 0, speed: 0 },
      tool: 0, accIdx: randInt(0, ACCESSORIES.length - 1),
      done: false, doneT: 0, happy: 0, happyTarget: 0, care: 0,
      treats: 0, cuddles: 0, toys: 0,
      shakeT: 0, jumpT: -1, useT: 0, sfxT: 0, giggleT: 2, cooldown: 0, sparkleT: 0, dripT: 0,
      events: {}, toolPop: 0,
      ai: p.isAI ? { t: rand(0.6, 1.4), target: null, distract: rand(4, 9), idleT: 0 } : null,
    };
    // Pedestal and characters.
    s.ped = { x: r.x + r.w * 0.57, y: r.y + r.h - s.toolH - (compact ? 26 : r.h * 0.12) };
    s.char = new Actor(p.charId, { x: r.x + r.w * (r.w < 520 ? 0.15 : 0.14), y: s.ped.y + (compact ? 6 : r.h * 0.07) });
    const ch = s.char;
    ch.scale = clamp((r.h * (compact ? 0.3 : 0.26)) / ch.leader.h, 0.38, 1.4);
    ch.facing = 1; ch.snap();
    this.rebuildPet(s, def);
    s.cursor.x = s.cursor.px = s.ped.x + r.w * 0.05;
    s.cursor.y = s.cursor.py = s.ped.y - s.pet.height * 0.55;
    return s;
  }

  rebuildPet(s, def) {
    s.def = def;
    const pet = makePetActor(def);
    const r = s.r;
    const maxH = (s.ped.y - (r.y + s.headerH + 34)) * 0.95;
    const maxW = r.w * (r.w < 520 ? 0.62 : 0.56);
    const w1 = pet.width / pet.scale;
    pet.scale = Math.min(maxH / pet.leader.h, maxW / w1, 3.2);
    pet.x = s.ped.x; pet.y = s.ped.y; pet.facing = 1;
    pet.snap();
    pet.setPose('sad');
    s.pet = pet;
    s.mask = petMask(pet.leader.asset);
    this.makeMud(s);
    s.suds = []; s.sudsPeak = 0; s.wet = 0; s.wasWet = false; s.fluff = 0; s.acc = [];
    s.events = {};
    if (!s.mudCanvas) { s.mudCanvas = document.createElement('canvas'); }
    // Half resolution is plenty for soft mud and much cheaper to redraw.
    s.mudCanvas.width = Math.ceil(s.mask.iw / 2); s.mudCanvas.height = Math.ceil(s.mask.ih / 2);
    s.mudDirty = true;
    pet.attach((g, info) => this.drawPetOverlay(g, info, s));
  }

  makeMud(s) {
    const m = s.mask;
    const cand = m.pts.filter(([x, y]) => y > m.ih * 0.18 && y < m.ih * 0.94);
    const blobs = [];
    const want = 14;
    let tries = 0;
    while (blobs.length < want && tries++ < 600 && cand.length) {
      const [x, y] = pick(cand);
      const minD = m.ih * 0.13;
      if (blobs.some((b) => Math.hypot(b.x - x, b.y - y) < minD)) continue;
      blobs.push({
        x, y, r: m.ih * rand(0.07, 0.11), amt: 1,
        shape: Array.from({ length: 9 }, () => rand(0.75, 1.2)),
        dots: Array.from({ length: 4 }, () => [rand(-1.4, 1.4), rand(-1.4, 1.4), rand(0.12, 0.25)]),
        rot: rand(TAU),
      });
    }
    s.mud = blobs;
    s.mudStart = blobs.length;
  }

  // ---- geometry helpers ---------------------------------------------------
  petPx(s) { return (s.pet.leader.h * s.pet.scale) / s.mask.ih; }
  imgFlip(s) { return s.pet.leader.facing === -1 ? -1 : 1; }
  toImage(s, x, y) {
    const k = this.petPx(s), f = s.pet.facing * this.imgFlip(s);
    return { x: (x - s.pet.x) / (f * k) + s.mask.iw / 2, y: (y - (s.pet.y - s.pet.z)) / k + s.mask.ih };
  }
  toScreen(s, ix, iy) {
    const k = this.petPx(s), f = s.pet.facing * this.imgFlip(s);
    return { x: s.pet.x + (ix - s.mask.iw / 2) * f * k, y: s.pet.y - s.pet.z + (iy - s.mask.ih) * k };
  }
  onPet(s, x, y, slack = 10) {
    const p = this.toImage(s, x, y);
    return s.mask.near(p.x, p.y, slack / this.petPx(s));
  }

  // ---- progress -------------------------------------------------------------
  mudLeft(s) { return s.mud.reduce((a, b) => a + b.amt, 0) / Math.max(1, s.mudStart); }
  sudsTotal(s) { return s.suds.reduce((a, b) => a + b.amt, 0); }
  parts(s) {
    const clean = 1 - this.mudLeft(s);
    const suds = this.sudsTotal(s);
    const rinse = s.sudsPeak > 0 ? clean * clamp(1 - suds / Math.max(1, s.sudsPeak * 0.6), 0, 1) : 0;
    const dry = s.wasWet ? clamp(1 - s.wet, 0, 1) : 0;
    return { clean, rinse, dry, fluff: s.fluff, bow: s.acc.length ? 1 : 0, treat: s.treats ? 1 : 0, suds };
  }
  happiness(s) {
    const q = this.parts(s);
    return 0.3 * q.clean + 0.15 * q.rinse + 0.15 * q.dry + 0.15 * q.fluff + 0.125 * q.bow + 0.125 * q.treat;
  }
  nextTool(s) {
    const q = this.parts(s);
    if (q.clean < 0.985) return 'sponge';
    if (q.suds > 0.15 || !s.wasWet) return 'shower';
    if (s.wet > 0.01) return 'towel';
    if (s.fluff < 0.99) return 'brush';
    if (!s.acc.length) return 'bow';
    if (!s.treats) return 'treat';
    return null;
  }

  // ---- update -----------------------------------------------------------------
  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.2) this.banner = null; }
    for (const b of this.bubbles) { b.y -= b.sp * dt; b.x += Math.sin(this.t + b.ph) * 10 * dt; if (b.y < -30) { b.y = H + 30; b.x = rand(W); } }
    this.updateFlying(dt);
    if (this.phase === 'spa') {
      for (const s of this.stations) this.updateStation(s, dt);
      const all = this.stations.every((s) => s.done);
      if (all) {
        this.allDoneT += dt;
        if (this.allDoneT > 3) this.startParade();
      }
      // Gentle cap so a forgotten round still reaches the parade.
      if (this.phaseT > 300) this.startParade();
    } else if (this.phase === 'parade') {
      this.updateParade(dt);
    }
  }

  updateFlying(dt) {
    for (const f of this.flying) {
      f.t += dt;
      const p = Math.min(1, f.t / f.dur);
      if (f.done) continue;
      if (p >= 1) { f.done = true; f.onLand && f.onLand(); }
    }
    this.flying = this.flying.filter((f) => !f.done);
  }

  updateStation(s, dt) {
    const p = s.p, c = p.ctrl, r = s.r, pet = s.pet;
    if (p.isAI) this.ai(s, dt);
    // Cursor
    const sp = 820 * s.k;
    const cur = s.cursor;
    cur.px = cur.x; cur.py = cur.y;
    cur.x = clamp(cur.x + c.x * sp * dt, r.x + 30, r.x + r.w - 30);
    cur.y = clamp(cur.y + c.y * sp * dt, r.y + s.headerH + 10, r.y + r.h - s.toolH - 10);
    cur.speed = damp(cur.speed, Math.hypot(cur.x - cur.px, cur.y - cur.py) / Math.max(dt, 1e-3), 12, dt);
    const motion = 1 + Math.min(1, cur.speed / (420 * s.k)) * 0.7;

    // Tool switching
    if (c.pressed('rb')) this.setTool(s, (s.tool + 1) % TOOLS.length);
    if (c.pressed('lb')) this.setTool(s, (s.tool + TOOLS.length - 1) % TOOLS.length);
    if (c.pressed('x')) {
      const nt = this.nextTool(s);
      if (nt) this.setTool(s, TOOL_IDX[nt]); else { sfx('blip'); }
    }
    s.toolPop = Math.max(0, s.toolPop - dt * 3);
    s.cooldown -= dt; s.sfxT -= dt; s.giggleT -= dt; s.sparkleT -= dt;
    if (c.pressed('b') && s.cooldown <= 0) this.cuddle(s);
    if (c.pressed('y') && s.cooldown <= 0) this.squeaky(s);

    const tool = TOOLS[s.tool].id;
    const hold = c.held('a'), tap = c.pressed('a');
    s.using = hold;
    const on = this.onPet(s, cur.x, cur.y, 14 * s.k);
    const ip = this.toImage(s, cur.x, cur.y);
    const px = this.petPx(s);
    let brushing = false;

    if (hold && tool === 'sponge') {
      const rad = (52 * s.k) / px;
      let any = false;
      for (const b of s.mud) {
        if (b.amt <= 0) continue;
        const d = Math.hypot(b.x - ip.x, b.y - ip.y);
        if (d < rad + b.r * 0.8) {
          const before = b.amt;
          b.amt = Math.max(0, b.amt - 0.5 * motion * dt);
          any = true; s.mudDirty = true;
          if (before > 0 && b.amt <= 0) this.blobCleaned(s, b);
        }
      }
      if (on) {
        s.useT += dt;
        if (s.useT > 0.07) { s.useT = 0; this.addSuds(s, ip.x + rand(-30, 30) / px * s.k, ip.y + rand(-24, 24) / px * s.k); }
        if (s.sfxT <= 0) { sfx('bubble'); s.sfxT = 0.13; }
        if (chance(dt * 10)) particles.burst(cur.x, cur.y, { type: 'bubble', count: 1, speed: [40, 120], size: [5, 12] });
        if (any && s.giggleT <= 0) { s.giggleT = rand(1.8, 3); pet.squash(0.12); if (this.mudLeft(s) < 0.6) sfx('giggle'); }
      }
      if (this.mudLeft(s) <= 0.015 && !s.events.clean) {
        s.events.clean = true;
        for (const b of s.mud) b.amt = 0; s.mudDirty = true;
        const head = pet.anchor('center');
        particles.burst(head.x, head.y, { type: 'sparkle', count: 18, colors: ['#ffffff', '#fff6a8', '#bff3ff'] });
        particles.popText(head.x, head.y - 40, 'Squeaky clean!', '#7fd3ff', 44 * s.k);
        sfx('correct'); pet.playOnce('surprised', 0.4, 'idle'); pet.emote('sparkle', 1.2);
        s.char.playOnce('cheer', 0.5); this.rumble(p, 0.3, 80);
      }
    } else if (hold && tool === 'shower') {
      const hx = cur.x, hy = cur.y + 30 * s.k;
      if (chance(dt * 40)) particles.burst(cur.x + rand(-14, 14) * s.k, cur.y + 16 * s.k, { type: 'drop', count: 1, angle: Math.PI / 2, spread: 0.25, speed: [260, 420], colors: ['#5cc8ff', '#8fe0ff', '#ffffff'], size: [4, 8] });
      if (s.sfxT <= 0) { sfx('water'); s.sfxT = 0.22; }
      const rad = (80 * s.k) / px;
      const ih = this.toImage(s, hx, hy);
      for (const u of s.suds) {
        if (Math.hypot(u.x - ih.x, u.y - ih.y) < rad + u.r) {
          const before = u.amt;
          u.amt = Math.max(0, u.amt - 1.0 * dt);
          if (before > 0.05 && u.amt <= 0.05 && chance(0.5)) { const sp2 = this.toScreen(s, u.x, u.y); particles.burst(sp2.x, sp2.y, { type: 'bubble', count: 3, size: [6, 12] }); }
        }
      }
      s.suds = s.suds.filter((u) => u.amt > 0.02);
      // a little rinse helps the last bits of mud too
      for (const b of s.mud) if (b.amt > 0 && Math.hypot(b.x - ih.x, b.y - ih.y) < rad + b.r) { b.amt = Math.max(0, b.amt - 0.25 * dt); s.mudDirty = true; }
      if (this.onPet(s, hx, hy, 30 * s.k)) {
        if (!s.wasWet) { s.wasWet = true; pet.playOnce('surprised', 0.4); pet.emote('exclaim', 0.8); voice(s.def.char || 'fox', 'gasp'); }
        s.wet = Math.min(1, s.wet + 0.45 * dt);
      }
      if (this.parts(s).clean > 0.98 && s.sudsPeak > 0 && this.sudsTotal(s) <= 0.15 && !s.events.rinse) {
        s.events.rinse = true;
        const cpt = pet.anchor('center');
        particles.popText(cpt.x, cpt.y - 40, 'All rinsed!', '#5cc8ff', 42 * s.k);
        sfx('splash'); s.char.playOnce('cheer', 0.5);
      }
    } else if (hold && tool === 'towel') {
      if (on && s.wet > 0) {
        s.wet = Math.max(0, s.wet - 0.3 * motion * dt);
        if (s.sfxT <= 0) { snd('towel', 'brush'); s.sfxT = hasSound('towel') ? 0.4 : 0.16; }
        if (chance(dt * 10)) particles.burst(cur.x, cur.y, { type: 'drop', count: 2, colors: ['#8fe0ff'], speed: [80, 200], size: [3, 6] });
        if (s.wet <= 0 && s.wasWet) this.shakeOff(s);
      } else if (on && s.sfxT <= 0) { sfx('brush'); s.sfxT = 0.3; }
    } else if (hold && tool === 'brush') {
      if (on) {
        brushing = true;
        const before = s.fluff;
        s.fluff = Math.min(1, s.fluff + (s.wet > 0.3 ? 0.12 : 0.22) * motion * dt);
        if (s.sfxT <= 0) { sfx('brush'); s.sfxT = 0.14; }
        if (s.sparkleT <= 0) { s.sparkleT = 0.09; particles.burst(cur.x + rand(-20, 20), cur.y + rand(-20, 20), { type: 'sparkle', count: 1, colors: ['#ffffff', '#fff6a8', '#ffc8f0'] }); }
        if (before < 1 && s.fluff >= 1) {
          const cpt = pet.anchor('center');
          particles.burst(cpt.x, cpt.y, { type: 'star', count: 14 });
          particles.popText(cpt.x, cpt.y - 50, 'So shiny!', '#ffd23f', 44 * s.k);
          sfx('sparkle'); sfx('star'); s.char.playOnce('cheer', 0.5);
        }
      }
    } else if (tap && tool === 'bow') {
      if (on) this.placeAccessory(s, ip.x, ip.y);
      else { sfx('blip'); particles.burst(cur.x, cur.y, { type: 'spark', count: 4, colors: ['#ffffff'] }); }
    } else if (tap && tool === 'treat' && s.cooldown <= 0) {
      this.giveTreat(s);
    }

    // Drying shake droplets & wet drips
    if (s.shakeT > 0) {
      s.shakeT -= dt;
      if (chance(dt * 14)) {
        const c2 = pet.anchor('center'), side = chance(0.5) ? 1 : -1;
        particles.burst(c2.x + side * pet.width * 0.3, c2.y + rand(-30, 30), { type: 'drop', count: 3, angle: side > 0 ? -0.2 : Math.PI + 0.2, spread: 0.7, speed: [200, 420], colors: ['#5cc8ff', '#ffffff'], size: [4, 8] });
      }
    }
    if (s.wet > 0.15) {
      s.dripT -= dt;
      if (s.dripT <= 0) {
        s.dripT = rand(0.08, 0.25) / s.wet;
        const [ix, iy] = pick(s.mask.pts);
        const sp2 = this.toScreen(s, ix, iy);
        particles.burst(sp2.x, sp2.y, { type: 'drop', count: 1, angle: Math.PI / 2, spread: 0.1, speed: [40, 90], colors: ['#8fe0ff'], size: [3, 6] });
      }
    }
    // Squeaky duck jump
    if (s.jumpT >= 0) {
      s.jumpT += dt;
      const jp = s.jumpT / 0.6;
      pet.z = jp < 1 ? Math.sin(jp * Math.PI) * 90 * s.k : 0;
      if (jp >= 1) { s.jumpT = -1; pet.z = 0; pet.squash(0.3); sfx('land'); }
    }

    // Mood poses
    if (brushing) pet.setPose('dance');
    else if (s.done) pet.setPose(s.doneT < 2.4 ? 'celebrate' : 'idle');
    else if (this.mudLeft(s) > 0.5) pet.setPose('sad');
    else pet.setPose('idle');

    // Happiness meter
    s.happyTarget = this.happiness(s);
    s.happy = damp(s.happy, s.happyTarget, 4, dt);
    if (!s.done && s.happyTarget >= 0.995) this.petDone(s);
    if (s.done) {
      s.doneT += dt;
      if (chance(dt * 0.3)) pet.emote('heart', 1.2);
      if (chance(dt * 0.25)) s.char.playOnce('cheer', 0.5);
    }
    s.char.setPose(s.done ? (s.doneT < 2.4 ? 'celebrate' : 'idle') : 'idle');
    s.mudT = (s.mudT || 0) - dt;
    if (s.mudDirty && s.mudT <= 0) { this.renderMud(s); s.mudT = 0.06; }
    pet.update(dt);
    s.char.update(dt);
  }

  rumble(p, a, ms) { try { p.ctrl.rumble && p.ctrl.rumble(a, ms); } catch (e) { /* ignore */ } }

  setTool(s, i) {
    if (s.tool === i) { s.toolPop = 0.6; return; }
    s.tool = i; s.toolPop = 1; sfx('swap');
  }

  blobCleaned(s, b) {
    const sp2 = this.toScreen(s, b.x, b.y);
    particles.burst(sp2.x, sp2.y, { type: 'sparkle', count: 5, colors: ['#ffffff', '#fff6a8'] });
    particles.burst(sp2.x, sp2.y, { type: 'bubble', count: 4, size: [6, 14] });
    s.events.blobs = (s.events.blobs || 0) + 1;
    sfx('collect', { step: Math.min(12, s.events.blobs) });
  }

  addSuds(s, x, y) {
    if (s.mask.at(x, y) < 60) return;
    const near = s.suds.find((u) => Math.hypot(u.x - x, u.y - y) < s.mask.ih * 0.05);
    if (near) { near.amt = Math.min(1.4, near.amt + 0.25); }
    else if (s.suds.length < 44) s.suds.push({ x, y, r: s.mask.ih * rand(0.035, 0.06), amt: 0.6, ph: rand(TAU) });
    else { const u = pick(s.suds); u.amt = Math.min(1.4, u.amt + 0.2); }
    s.sudsPeak = Math.max(s.sudsPeak, this.sudsTotal(s));
  }

  shakeOff(s) {
    if (s.events.dry) return;
    s.events.dry = true;
    s.shakeT = 1.0;
    const pet = s.pet, c = pet.anchor('center');
    pet.playOnce('shake', 0.9, 'idle');
    for (const side of [-1, 1]) particles.burst(c.x + side * 30, c.y, { type: 'drop', count: 18, angle: side > 0 ? -0.3 : Math.PI + 0.3, spread: 0.9, speed: [260, 560], colors: ['#5cc8ff', '#8fe0ff', '#ffffff'], size: [4, 9] });
    sfx('splash'); sfx('whoosh');
    particles.popText(c.x, c.y - 60, 'Fluffy dry!', '#ff9ecf', 44 * s.k);
    s.char.playOnce('surprised', 0.4, 'idle');
    setTimeout(() => { if (!this.finished) s.char.playOnce('cheer', 0.5); }, 450);
    this.rumble(s.p, 0.4, 150);
  }

  placeAccessory(s, ix, iy) {
    const a = ACCESSORIES[s.accIdx % ACCESSORIES.length];
    s.acc.push({ x: ix, y: iy, kind: a.kind, color: a.color, rot: rand(-0.35, 0.35), t: 0 });
    if (s.acc.length > 7) s.acc.shift();
    s.accIdx = (s.accIdx + 1) % ACCESSORIES.length;
    const cur = s.cursor;
    particles.burst(cur.x, cur.y, { type: 'sparkle', count: 8 });
    particles.burst(cur.x, cur.y, { type: 'heart', count: 2 });
    sfx('stamp'); sfx('sparkle');
    s.pet.playOnce('cheer', 0.45); s.pet.emote('heart', 1);
    s.care++;
    if (s.acc.length === 1) particles.popText(cur.x, cur.y - 40, 'So cute!', '#ff6fb1', 42 * s.k);
  }

  giveTreat(s) {
    s.cooldown = 0.9;
    const pet = s.pet, head = pet.anchor('head');
    const from = { x: s.cursor.x, y: s.cursor.y };
    const to = { x: head.x + pet.facing * 10, y: head.y + pet.height * 0.18 };
    sfx('whoosh');
    this.flying.push({
      kind: 'treat', from, to, t: 0, dur: 0.38, arc: 80 * s.k, s: 40 * s.k,
      onLand: () => {
        s.treats++; s.care += 2;
        pet.playOnce('eat', 0.8); pet.squash(0.25); pet.emote('hearts', 1.6);
        sfx('munch'); setTimeout(() => sfx('munch', { force: true }), 260);
        particles.burst(to.x, to.y, { type: 'heart', count: 7 });
        particles.burst(to.x, to.y, { type: 'spark', count: 6, colors: ['#e0a060', '#ff9ecf'] });
        particles.popText(to.x, to.y - 50, s.treats === 1 ? 'Yummy!' : pick(['Nom nom!', 'Yum!', 'Crunch!']), '#ffb067', 42 * s.k);
        s.char.playOnce('cheer', 0.5);
      },
    });
  }

  cuddle(s) {
    s.cooldown = 0.35; s.cuddles++; s.care++;
    const c = s.pet.anchor('center');
    s.pet.squash(0.3); s.pet.emote('heart', 1);
    particles.burst(c.x, c.y - 10, { type: 'heart', count: 4 });
    sfx('giggle');
    s.char.playOnce('cheer', 0.4);
  }

  squeaky(s) {
    if (s.jumpT >= 0) return;
    s.cooldown = 0.8; s.toys++; s.care++;
    const pet = s.pet, head = pet.anchor('head');
    snd('squeak', 'bubble'); sfx('pop');
    this.flying.push({
      kind: 'duck', from: { x: s.cursor.x, y: s.cursor.y }, to: { x: head.x, y: head.y - 80 * s.k }, t: 0, dur: 0.45, arc: 140 * s.k, s: 36 * s.k,
      onLand: () => {
        particles.burst(head.x, head.y - 80 * s.k, { type: 'star', count: 6 });
        snd('squeak', 'bounce');
      },
    });
    setTimeout(() => {
      if (this.finished) return;
      s.jumpT = 0; pet.playOnce('cheer', 0.6); voice(s.def.char || 'fox', 'woo');
    }, 180);
  }

  petDone(s) {
    s.done = true; s.doneT = 0;
    const pet = s.pet, c = pet.anchor('center');
    particles.burst(c.x, c.y, { type: 'confetti', count: 60 });
    particles.burst(c.x, c.y, { type: 'heart', count: 12 });
    particles.ring(c.x, c.y, '#ff6fb1', 260 * s.k);
    particles.popText(c.x, s.r.y + s.headerH + 60, 'Happy pet!', '#ff6fb1', 64 * s.k);
    sfx('fanfare'); sfx('yay');
    fx.flash('#fff6fb', 0.2); fx.shake(6, 0.2);
    pet.playOnce('celebrate', 2.4, 'idle');
    s.char.playOnce('celebrate', 2.4, 'idle');
    voice(s.p.charId, 'yay');
    this.rumble(s.p, 0.6, 250);
  }

  // ---- CPU ---------------------------------------------------------------------
  ai(s, dt) {
    const p = s.p, c = p.ctrl, A = s.ai, prof = aiProfile(p);
    const cur = s.cursor;
    A.t -= dt;
    A.distract -= dt;
    // Little distractions: cuddles and squeaky ducks (easier CPUs dawdle more).
    if (A.distract <= 0 && !s.done) {
      A.distract = rand(5, 10) * (1 + (p.aiLevel || 0) * 0.6);
      A.idleT = rand(0.6, 1.4) * (1 - (p.aiLevel || 0) * 0.3);
      c.hold('a', false); c.move(0, 0);
      c.press(chance(0.5) ? 'b' : 'y');
    }
    if (A.idleT > 0) { A.idleT -= dt; c.move(0, 0); c.hold('a', false); return; }

    let want = this.nextTool(s);
    if (want !== A.lastWant) {
      // Admire the work for a moment after each finished step.
      if (A.lastWant !== undefined) { A.idleT = rand(0.8, 1.8) * (1 - (p.aiLevel || 0) * 0.3); A.lastWant = want; c.hold('a', false); c.move(0, 0); return; }
      A.lastWant = want;
    }
    if (!want) {
      // Free play once happy: a few more bows and treats, then relax.
      if (A.t > 0) { c.move(0, 0); c.hold('a', false); return; }
      A.t = rand(2.5, 5);
      if (s.acc.length < 4 && chance(0.6)) want = 'bow';
      else { c.press(pick(['b', 'y', 'b'])); return; }
    }
    const wi = TOOL_IDX[want];
    if (s.tool !== wi) {
      c.hold('a', false);
      if (A.t <= 0) {
        const fwd = (wi - s.tool + TOOLS.length) % TOOLS.length;
        c.press(fwd <= TOOLS.length / 2 ? 'rb' : 'lb');
        A.t = reactionTime(p) * 0.7;
      }
      c.move(0, 0);
      return;
    }
    // Choose a target point (screen space).
    const pickBody = (yMin = 0.25, yMax = 0.9) => {
      const m = s.mask;
      const cand = m.pts.filter(([, y]) => y > m.ih * yMin && y < m.ih * yMax);
      const [ix, iy] = pick(cand.length ? cand : m.pts);
      return { ix, iy };
    };
    let tgt = A.target;
    const valid = tgt && tgt.tool === want && (!tgt.until || !tgt.until());
    if (!valid) {
      tgt = null;
      if (want === 'sponge') {
        const b = s.mud.filter((m) => m.amt > 0).sort((a, b2) => b2.amt - a.amt)[0];
        if (b) tgt = { tool: want, ix: b.x, iy: b.y, until: () => b.amt <= 0 };
      } else if (want === 'shower') {
        const u = s.suds.slice().sort((a, b2) => b2.amt - a.amt)[0];
        if (u && this.sudsTotal(s) > 0.15) tgt = { tool: want, ix: u.x, iy: u.y - s.mask.ih * 0.1, until: () => u.amt <= 0.05 };
        else { const q = pickBody(0.3, 0.6); tgt = { tool: want, ix: q.ix, iy: q.iy - s.mask.ih * 0.1, life: 1.2 }; }
      } else if (want === 'towel' || want === 'brush') {
        const q = pickBody(); tgt = { tool: want, ix: q.ix, iy: q.iy, life: rand(0.5, 0.9) };
      } else if (want === 'bow') {
        const q = pickBody(0.05, 0.55); tgt = { tool: want, ix: q.ix, iy: q.iy, tap: true };
      } else if (want === 'treat') {
        tgt = { tool: want, head: true, tap: true };
      }
      if (tgt) tgt.age = 0;
      A.target = tgt;
    }
    if (!tgt) { c.move(0, 0); c.hold('a', false); return; }
    tgt.age += dt;
    let tx, ty;
    if (tgt.head) { const h2 = s.pet.anchor('head'); tx = h2.x - 40 * s.pet.facing * s.k; ty = h2.y + 40 * s.k; }
    else { const sp2 = this.toScreen(s, tgt.ix, tgt.iy); tx = sp2.x; ty = sp2.y; }
    // Easier CPUs scrub with a lazy circular wiggle.
    const wig = 26 * s.k;
    tx += Math.cos(this.t * 5 + p.index) * wig; ty += Math.sin(this.t * 6 + p.index) * wig * 0.6;
    const d = steer(p, cur.x, cur.y, tx, ty, { arrive: 70 * s.k });
    const close = d < 60 * s.k;
    if (tgt.tap) {
      c.hold('a', false);
      if (close && A.t <= 0) { c.press('a'); A.t = reactionTime(p) + 0.4; A.target = null; }
    } else {
      c.hold('a', close || (d < 120 * s.k && s.using));
      if (tgt.life !== undefined && close) { tgt.life -= dt; if (tgt.life <= 0) A.target = null; }
      if (tgt.age > 6) A.target = null;
    }
    if (prof.speed < 0.85 && chance(dt * 0.4)) c.hold('a', false);
  }

  // ---- parade --------------------------------------------------------------------
  startParade() {
    if (this.phase === 'parade') return;
    this.phase = 'parade'; this.phaseT = 0;
    for (const p of this.players) if (p.isAI) { p.ctrl.hold('a', false); p.ctrl.move(0, 0); }
    const n = this.stations.length;
    const targetH = n <= 3 ? 250 : n <= 5 ? 200 : 158;
    const spacing = Math.min(360, 1640 / n);
    this.stations.forEach((s, i) => {
      const pet = s.pet;
      pet.scale = targetH / pet.leader.h;
      const w1 = pet.width / pet.scale;
      pet.scale = Math.min(pet.scale, (spacing * 0.95) / w1);
      pet.facing = 1; pet.z = 0;
      pet.x = -200 - i * 260; pet.y = 690; pet.snap();
      pet.setPose('walk');
      s.shakeT = 0; s.jumpT = -1;
      s.paradeX = W / 2 + (i - (n - 1) / 2) * spacing;
      s.arrived = false;
      s.wet = 0;
      s.suds.forEach((u) => (u.amt *= 0.0));
      const ch = s.char;
      const aud = Math.min(200, (W - 160) / n);
      ch.scale = n > 5 ? 0.6 : 0.75; ch.x = W / 2 + (i - (n - 1) / 2) * aud; ch.y = 1060; ch.facing = 1; ch.snap();
      ch.setPose('clap');
    });
    this.banner = { text: 'Pet Parade!', t: 0 };
    sfx('fanfare'); snd('applause', 'cheer');
    // Camera: start close on the stage entrance, then pull back as the pets line up.
    const cam = this.api.camera;
    if (cam) { cam.x = 620; cam.y = 600; cam.zoom = 1.25; cam.follow(760, 600, 1.2, 1.4); }
  }

  updateParade(dt) {
    const t = this.phaseT;
    const cam = this.api.camera;
    if (cam) {
      const lead = this.stations.reduce((mx, s) => Math.max(mx, s.pet.x), -Infinity);
      if (t < 3.4) cam.follow(clamp(lead, 600, W - 600), 600, 1.2, 1.6);
      else cam.follow(W / 2, H / 2, 1, 1.2);
    }
    this.stations.forEach((s, i) => {
      const pet = s.pet;
      if (!s.arrived) {
        if (t > 0.4 + i * 0.25) {
          const dx = s.paradeX - pet.x;
          const v = Math.sign(dx) * Math.min(Math.abs(dx) / dt, 620);
          pet.x += v * dt;
          pet.moveAnim(v, 0, 620);
          if (Math.abs(dx) < 2) {
            s.arrived = true; pet.x = s.paradeX; pet.facing = i < this.stations.length / 2 ? 1 : -1;
            pet.playOnce('bow', 0.7, 'celebrate');
            particles.burst(pet.x, pet.y - pet.height * 0.6, { type: 'sparkle', count: 12 });
            sfx('collect', { step: i * 2 });
          }
        }
      } else if (chance(dt * 0.4)) pet.emote('heart', 1);
      pet.update(dt);
      const ch = s.char;
      if (chance(dt * 0.8)) ch.playOnce(pick(['cheer', 'cheer', 'wave']), 0.6, 'clap');
      ch.update(dt);
    });
    if (t > 3.6 && !this.paradeConfetti) {
      this.paradeConfetti = true;
      particles.confettiRain(W, 160); sfx('yay'); snd('applause', 'cheer');
      fx.flash('#ffffff', 0.15);
    }
    if (t > 3.6 && chance(dt * 2.5)) {
      const x = rand(200, W - 200), y = rand(180, 420);
      particles.burst(x, y, { type: pick(['star', 'heart', 'sparkle']), count: 10 });
    }
    if (t > 8.5) this.finishGame();
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const cares = this.stations.map((s) => s.care + s.acc.length * 2 + s.treats * 2 + (s.done ? 10 : 0));
    const best = Math.max(...cares);
    const winners = cares.filter((c) => c === best);
    const highlight = this.players.length > 1 && winners.length === 1 ? cares.indexOf(best) : null;
    const stats = this.stations.map((s) => {
      const bits = [];
      if (s.acc.length) bits.push(`${s.acc.length} bow${s.acc.length > 1 ? 's' : ''}`);
      if (s.treats) bits.push(`${s.treats} treat${s.treats > 1 ? 's' : ''}`);
      return `${s.def.name}${bits.length ? ' · ' + bits.join(', ') : ''}`;
    });
    const hs = highlight !== null ? this.stations[highlight] : null;
    const focus = this.phase === 'parade' ? (hs ? { x: hs.pet.x, y: hs.pet.y - hs.pet.height * 0.5, zoom: 1.3 } : { x: W / 2, y: 600, zoom: 1.15 }) : undefined;
    this.api.finish({ showcase: true, highlight, stats, title: 'So Sparkly!', focus });
  }

  postUpdate(dt) {
    this.t += dt;
    for (const s of this.stations) { s.pet.update(dt); s.char.update(dt); }
  }

  onDone() {
    if (this.phase === 'spa') {
      // Make every pet presentable for the show.
      this.startParade();
    } else this.finishGame();
  }

  // ---- drawing ---------------------------------------------------------------------
  renderMud(s) {
    s.mudDirty = false;
    const c = s.mudCanvas, g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    for (const b of s.mud) {
      if (b.amt <= 0.01) continue;
      const k = 0.45 + 0.55 * b.amt;
      g.save();
      g.translate(b.x, b.y); g.rotate(b.rot);
      g.globalAlpha = Math.min(1, 0.25 + b.amt * 0.85);
      g.fillStyle = '#76492a';
      g.beginPath();
      const n = b.shape.length;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU, rr = b.r * k * b.shape[i % n];
        const a2 = ((i + 0.5) / n) * TAU, rr2 = b.r * k * (b.shape[i % n] + b.shape[(i + 1) % n]) * 0.42;
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else g.quadraticCurveTo(Math.cos(a2 - TAU / n) * rr2 * 1.25, Math.sin(a2 - TAU / n) * rr2 * 1.25, Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.fill();
      // splatter dots
      for (const [dx, dy, rr] of b.dots) { g.beginPath(); g.arc(dx * b.r * k, dy * b.r * k, rr * b.r * k, 0, TAU); g.fill(); }
      // darker core + shine
      g.fillStyle = '#5e3a1e'; g.beginPath(); g.ellipse(b.r * 0.15 * k, b.r * 0.15 * k, b.r * 0.55 * k, b.r * 0.45 * k, 0.4, 0, TAU); g.fill();
      g.globalAlpha *= 0.35; g.fillStyle = '#d9a873';
      g.beginPath(); g.ellipse(-b.r * 0.3 * k, -b.r * 0.35 * k, b.r * 0.28 * k, b.r * 0.12 * k, -0.5, 0, TAU); g.fill();
      g.restore();
    }
    if (s.mask.img) {
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(s.mask.img, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  /** Attachment callback: draws in the pet's forward space; we convert to image space. */
  drawPetOverlay(g, info, s) {
    const m = s.mask;
    const pxs = info.h / m.ih;
    const flip = s.pet.leader.facing === -1 ? -1 : 1;
    g.save();
    g.scale(flip * pxs, pxs);
    g.translate(-m.iw / 2, -m.ih);
    // mud
    if (s.mud.some((b) => b.amt > 0.01)) g.drawImage(s.mudCanvas, 0, 0, m.iw, m.ih);
    // wet sheen
    if (s.wet > 0.05) {
      g.save(); g.globalAlpha = Math.min(0.9, s.wet);
      for (let i = 0; i < 9; i++) {
        const pt = m.pts[(i * 977 + 31) % m.pts.length];
        const r = m.ih * 0.018;
        g.fillStyle = 'rgba(160,225,255,0.85)'; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = r * 0.25;
        g.beginPath(); g.ellipse(pt[0], pt[1], r * 0.7, r, 0, 0, TAU); g.fill(); g.stroke();
      }
      g.restore();
    }
    // suds (foam clumps from cached sprites; they gently breathe)
    const tt = this.t;
    const base = g.globalAlpha;
    for (const u of s.suds) {
      if (u.amt < 0.03) continue;
      const k = Math.min(1, u.amt) * (1 + 0.06 * Math.sin(tt * 3 + u.ph));
      g.globalAlpha = base * Math.min(1, u.amt * 1.6);
      const r = u.r * k * 1.25;
      g.drawImage(foamSprite(Math.floor(u.ph * 10) % 3), u.x - r, u.y - r, r * 2, r * 2);
    }
    g.globalAlpha = base;
    // brushed shine glints
    if (s.fluff > 0.3 && !s.wet) {
      for (let i = 0; i < 4; i++) {
        const p = (tt * 0.7 + i * 0.25) % 1;
        const pt = m.pts[(i * 1543 + 97 + Math.floor(tt * 0.7 + i * 0.25) * 211) % m.pts.length];
        g.save(); g.translate(pt[0], pt[1]); g.globalAlpha = Math.sin(p * Math.PI) * s.fluff;
        g.scale(m.ih / 320, m.ih / 320);
        drawSparkleShape(g, 22, '#ffffff');
        g.restore();
      }
    }
    // accessories (constant size relative to the pet)
    for (const a of s.acc) {
      a.t += 1 / 60;
      const pop = a.t < 0.25 ? ease.outBack(a.t / 0.25) : 1;
      g.save(); g.translate(a.x, a.y); g.scale(flip, 1); g.rotate(a.rot);
      g.scale(pop, pop);
      drawAccessory(g, a.kind, a.color, m.ih * 0.13, tt + a.x);
      g.restore();
    }
    g.restore();
  }

  drawBackground(g) {
    const bg = art('bg/pet-spa');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#c8f5ea'); gr.addColorStop(0.55, '#e7f7ff'); gr.addColorStop(1, '#ffd9ef');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3;
    for (let x = 0; x <= W; x += 96) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += 96) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // scalloped awning
    g.fillStyle = '#ff9ecf';
    g.fillRect(0, 0, W, 54);
    for (let x = 0; x < W + 60; x += 80) {
      g.fillStyle = (x / 80) % 2 ? '#ffffff' : '#ff9ecf';
      g.beginPath(); g.arc(x + 40, 54, 40, 0, Math.PI); g.fill();
    }
    g.fillStyle = '#ffffff'; for (let x = 0; x < W; x += 160) g.fillRect(x + 80, 0, 80, 54);
    g.restore();
    for (const b of this.bubbles) {
      g.save(); g.globalAlpha = 0.55;
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.strokeStyle = '#ffffff'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.2, 0, TAU); g.fill();
      g.restore();
    }
  }

  drawHeader(g) {
    ui.panel(g, W / 2 - 330, 16, 660, 76, { r: 38, fill: '#ffffff' });
    ui.text(g, 'Pet Spa', W / 2 - 190, 55, { size: 50, color: '#ff6fb1' });
    ui.glyph(g, 'lb', W / 2 - 34, 54, 34); ui.glyph(g, 'rb', W / 2 + 18, 54, 34);
    ui.text(g, 'Tools', W / 2 + 46, 55, { size: 30, color: NAVY, align: 'left', stroke: false });
    ui.glyph(g, 'x', W / 2 + 160, 54, 36);
    ui.text(g, 'Next step', W / 2 + 184, 55, { size: 30, color: NAVY, align: 'left', stroke: false });
  }

  stepDone(s, id) {
    const q = this.parts(s);
    switch (id) {
      case 'sponge': return q.clean >= 0.985;
      case 'shower': return s.wasWet && q.rinse >= 0.97;
      case 'towel': return s.wasWet && s.wet <= 0;
      case 'brush': return s.fluff >= 1;
      case 'bow': return s.acc.length > 0;
      case 'treat': return s.treats > 0;
      default: return false;
    }
  }

  drawDecor(g, s) {
    const r = s.r, k = s.k;
    const top = r.y + s.headerH + 16;
    const avail = s.ped.y - s.pet.height - top - 10;
    if (avail < 120) return;
    const ww = Math.min(r.w * 0.5, 300), wh = Math.min(avail * 0.85, 240);
    const wx = r.x + r.w * 0.5 - ww / 2, wy = top + 6;
    g.save();
    // arched window with sky and clouds
    g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, TAU); g.lineTo(wx + ww, wy + wh); g.closePath();
    const sky = g.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#e8f7ff');
    g.fillStyle = sky; g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    g.save(); g.clip();
    ui.cloud(g, wx + ww * 0.3 + Math.sin(this.t * 0.3 + s.i) * 20, wy + wh * 0.55, ww / 420, '#ffffff', 0.95);
    g.fillStyle = '#ffe066'; g.beginPath(); g.arc(wx + ww * 0.75, wy + ww * 0.3, ww * 0.1, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = '#ffffff'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(wx + ww / 2, wy + 4); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh * 0.6); g.lineTo(wx + ww, wy + wh * 0.6); g.stroke();
    // shelf with bottles and a duck
    const sy = wy + wh + 26 * k, sx0 = r.x + 30, sx1 = r.x + r.w - 30;
    if (sy + 10 < s.ped.y - s.pet.height) {
      g.fillStyle = '#e6b98a'; ui.roundRect(g, sx0, sy, sx1 - sx0, 12 * k, 5); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      const cols = ['#ff9ecf', '#7fd3ff', '#b78bff', '#7fe0a8'];
      for (let i = 0; i < 4; i++) {
        const bx = sx0 + 24 * k + i * 34 * k, bh = (40 + (i % 2) * 14) * k;
        g.fillStyle = cols[i]; ui.roundRect(g, bx, sy - bh, 26 * k, bh, 8 * k); g.fill(); g.stroke();
        g.fillStyle = '#ffffff'; g.fillRect(bx + 6 * k, sy - bh * 0.6, 14 * k, bh * 0.3);
      }
      drawDuck(g, sx1 - 40 * k, sy - 18 * k, 36 * k, Math.sin(this.t * 2 + s.i) * 0.1);
    }
    g.restore();
  }

  drawStation(g, s) {
    const r = s.r, p = s.p, k = s.k;
    // card
    ui.panel(g, r.x, r.y, r.w, r.h, { r: 30, fill: 'rgba(255,255,255,0.82)', stroke: p.color, lineWidth: 7 });
    g.save();
    ui.roundRect(g, r.x + 8, r.y + 8, r.w - 16, r.h - 16, 24); g.clip();
    // back wall tile + mirror arch
    g.fillStyle = 'rgba(255,214,236,0.55)'; g.fillRect(r.x, r.y + s.headerH, r.w, r.h);
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
    const tile = 46 * k;
    for (let x = r.x; x < r.x + r.w; x += tile) { g.beginPath(); g.moveTo(x, r.y + s.headerH); g.lineTo(x, r.y + r.h); g.stroke(); }
    for (let y = r.y + s.headerH; y < r.y + r.h; y += tile) { g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke(); }
    // floor
    g.fillStyle = '#bfeee0'; g.fillRect(r.x, s.ped.y - 6 * k, r.w, r.h);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let x = r.x; x < r.x + r.w; x += 60 * k) g.fillRect(x, s.ped.y - 6 * k, 30 * k, r.h);
    g.restore();
    // pedestal: fluffy round rug
    const pw = Math.max(s.pet.width * 0.62, 110 * k), ph = pw * 0.24;
    g.save();
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * TAU, rr = 1 + (i % 2) * 0.06;
      g.lineTo(s.ped.x + Math.cos(a) * pw * rr, s.ped.y + Math.sin(a) * ph * rr);
    }
    g.fill(); g.stroke();
    g.fillStyle = s.done ? '#ffd23f' : '#ff9ecf';
    g.beginPath(); g.ellipse(s.ped.x, s.ped.y, pw * 0.8, ph * 0.72, 0, 0, TAU); g.fill();
    g.restore();
    // header: tag + pet name + happiness meter
    const hy = r.y + 14;
    g.save();
    g.fillStyle = p.color; ui.roundRect(g, r.x + 16, hy, 70, 36, 16); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    ui.text(g, p.tag, r.x + 51, hy + 18, { size: 24, strokeWidth: 5, shadow: false });
    g.restore();
    ui.text(g, s.def.name, r.x + r.w / 2 + 30, hy + 18, { size: s.compact ? 30 : 36, color: '#ffffff', maxWidth: r.w - 200 });
    const by = r.y + (s.compact ? 50 : 60), bx = r.x + 62, bw = r.w - 92, bh = s.compact ? 18 : 24;
    const full = s.done;
    ui.bar(g, bx, by, bw, bh, s.happy, full ? '#ffd23f' : '#ff6fb1', { bg: 'rgba(36,22,63,0.15)', lineWidth: 3 });
    g.save(); g.translate(r.x + 38, by + bh / 2);
    const beat = 1 + Math.sin(this.t * (full ? 8 : 4)) * 0.08;
    g.scale(beat, beat); drawHeartShape(g, s.compact ? 34 : 42, full ? '#ff2f7a' : '#ff6fb1');
    g.restore();

    this.drawDecor(g, s);
    // player's character watching (behind the pet when overlapping)
    s.char.draw(g, { ring: p.color });
    // pet (with shake)
    const pet = s.pet;
    pet.draw(g);

    // toolbar
    const ty = r.y + r.h - s.toolH + 4, th = s.toolH - 16;
    const n = TOOLS.length;
    const slot = Math.min(th, (r.w - 40) / n - 8);
    const tw = n * (slot + 8) - 8;
    const tx0 = r.x + (r.w - tw) / 2;
    g.save();
    ui.roundRect(g, tx0 - 10, ty - 4, tw + 20, th + 8, 18); g.fillStyle = 'rgba(36,22,63,0.18)'; g.fill();
    const suggest = this.nextTool(s);
    TOOLS.forEach((tl, i) => {
      const x = tx0 + i * (slot + 8), sel = i === s.tool;
      const lift = sel ? 6 + s.toolPop * 8 : 0;
      ui.roundRect(g, x, ty - lift, slot, th, 14);
      g.fillStyle = sel ? p.color : '#ffffff'; g.fill();
      g.lineWidth = sel ? 4 : 2.5; g.strokeStyle = NAVY; g.stroke();
      drawTool(g, tl.id, x + slot / 2, ty - lift + th / 2, slot * 0.72, this.t, { on: false, acc: ACCESSORIES[s.accIdx % ACCESSORIES.length] });
      if (this.stepDone(s, tl.id)) {
        const cx = x + slot - 6, cy = ty - lift + 6, rr = Math.max(9, slot * 0.17);
        g.fillStyle = '#36d17a'; g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - rr * 0.45, cy); g.lineTo(cx - rr * 0.1, cy + rr * 0.4); g.lineTo(cx + rr * 0.5, cy - rr * 0.4); g.stroke();
      }
      if (suggest === tl.id && !sel) {
        const bob = Math.abs(Math.sin(this.t * 5)) * 6;
        ui.glyph(g, 'x', x + slot / 2, ty - 18 - bob, Math.min(30, slot * 0.5));
      }
    });
    g.restore();
    // tool name above selected
    if (!s.compact || s.toolPop > 0) {
      const x = tx0 + s.tool * (slot + 8) + slot / 2;
      ui.text(g, TOOLS[s.tool].name, x, ty - 28 - s.toolPop * 8, { size: 26, color: '#ffffff', alpha: s.compact ? s.toolPop : 1 });
    }
  }

  drawCursor(g, s) {
    const c = s.cursor, p = s.p, k = s.k;
    const tool = TOOLS[s.tool].id;
    const size = 74 * k;
    const using = s.using && this.phase === 'spa';
    g.save();
    g.translate(c.x, c.y);
    // hotspot ring
    g.strokeStyle = p.color; g.lineWidth = 4; g.globalAlpha = 0.9;
    g.beginPath(); g.arc(0, 0, 14 * k + (using ? Math.sin(this.t * 20) * 3 : 0), 0, TAU); g.stroke();
    g.globalAlpha = 1;
    let rot = 0, ox = 0, oy = 0;
    if (using) {
      if (tool === 'sponge' || tool === 'towel') { ox = Math.sin(this.t * 22) * 8; oy = Math.cos(this.t * 18) * 5; rot = Math.sin(this.t * 22) * 0.2; }
      if (tool === 'brush') { oy = Math.sin(this.t * 24) * 9; }
    }
    if (using && tool === 'shower') {
      const grd = g.createLinearGradient(0, -size * 0.2, 0, size * 1.3);
      grd.addColorStop(0, 'rgba(143,224,255,0.75)'); grd.addColorStop(1, 'rgba(143,224,255,0)');
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(-size * 0.28, -size * 0.25); g.lineTo(size * 0.28, -size * 0.25); g.lineTo(size * 0.6, size * 1.3); g.lineTo(-size * 0.6, size * 1.3); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const xx = (i - 2) * size * 0.12, ph = (this.t * 3 + i * 0.37) % 1;
        g.beginPath(); g.moveTo(xx * (1 + ph), -size * 0.1 + ph * size * 1.2); g.lineTo(xx * (1 + ph) * 1.1, ph * size * 1.2 + size * 0.12); g.stroke();
      }
    }
    g.translate(ox, oy); g.rotate(rot);
    const pop = 1 + s.toolPop * 0.25;
    g.scale(pop, pop);
    drawTool(g, tool, 0, tool === 'shower' ? -size * 0.25 : 0, size, this.t, { on: using, acc: ACCESSORIES[s.accIdx % ACCESSORIES.length] });
    g.restore();
    ui.playerTag(g, p, c.x + 34 * k, c.y - 40 * k);
  }

  drawFlying(g) {
    for (const f of this.flying) {
      const p = Math.min(1, f.t / f.dur);
      const x = lerp(f.from.x, f.to.x, p), y = lerp(f.from.y, f.to.y, p) - Math.sin(p * Math.PI) * f.arc;
      if (f.kind === 'treat') drawTool(g, 'treat', x, y, f.s, this.t);
      else drawDuck(g, x, y, f.s, p * TAU);
    }
  }

  drawParade(g) {
    const t = this.phaseT;
    // stage backdrop
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#3b1d6e'); gr.addColorStop(1, '#7b3fb0');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // twinkle lights
    for (let i = 0; i < 40; i++) {
      const x = (i * 197) % W, y = 40 + ((i * 89) % 260);
      g.save(); g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
      g.translate(x, y); drawSparkleShape(g, 18, i % 3 ? '#fff6a8' : '#ffc8f0'); g.restore();
    }
    // spotlights
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const sx = W * (0.15 + i * 0.23), sw = Math.sin(t * 0.9 + i * 1.3) * 260;
      g.globalAlpha = 0.12;
      g.fillStyle = ['#ff9ecf', '#fff6a8', '#9fe8ff', '#c9a6ff'][i];
      g.beginPath(); g.moveTo(sx - 30, -20); g.lineTo(sx + 30, -20); g.lineTo(sx + sw + 220, 760); g.lineTo(sx + sw - 220, 760); g.closePath(); g.fill();
    }
    g.restore();
    // stage
    g.fillStyle = '#ffb3d9'; g.fillRect(0, 700, W, 40);
    g.fillStyle = '#d98ab8'; g.fillRect(0, 740, W, 50);
    g.fillStyle = '#2a1650'; g.fillRect(0, 790, W, H - 790);
    g.strokeStyle = NAVY; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 700); g.lineTo(W, 700); g.moveTo(0, 740); g.lineTo(W, 740); g.stroke();
    for (let x = 30; x < W; x += 120) {
      g.fillStyle = (Math.floor(t * 4) + x / 120) % 2 < 1 ? '#ffd23f' : '#ffffff';
      g.beginPath(); g.arc(x, 765, 9, 0, TAU); g.fill();
    }
    // curtains
    for (const side of [-1, 1]) {
      const open = ease.outCubic(clamp(t / 1.2, 0, 1));
      const cw = lerp(W / 2, 170, open);
      g.save();
      g.fillStyle = '#e8364a';
      const x0 = side < 0 ? 0 : W - cw;
      g.fillRect(x0, 0, cw, 790);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      for (let x = x0 + 20; x < x0 + cw; x += 60) g.fillRect(x, 0, 18, 790);
      g.restore();
    }
    g.fillStyle = '#e8364a'; g.fillRect(0, 0, W, 70);
    for (let x = 0; x < W; x += 80) { g.beginPath(); g.arc(x + 40, 70, 40, 0, Math.PI); g.fill(); }
    // pets
    const order = this.stations.slice().sort((a, b) => a.pet.y - b.pet.y);
    for (const s of order) {
      if (s.arrived) {
        g.save(); g.globalAlpha = 0.35; g.fillStyle = '#fff6a8';
        g.beginPath(); g.ellipse(s.pet.x, s.pet.y + 4, s.pet.width * 0.5, 22, 0, 0, TAU); g.fill(); g.restore();
      }
      s.pet.draw(g);
    }
    // audience: the players' characters cheering
    for (const s of this.stations) { s.char.draw(g, { ring: s.p.color }); }
    this.stations.forEach((s) => { if (s.arrived) ui.text(g, s.def.name, s.pet.x, 760 + 0, { size: 26, color: '#fff', maxWidth: 200 }); });
  }

  draw(g) {
    if (this.phase === 'parade') {
      this.drawParade(g);
    } else {
      this.drawBackground(g);
      this.drawHeader(g);
      for (const s of this.stations) this.drawStation(g, s);
      this.drawFlying(g);
      for (const s of this.stations) this.drawCursor(g, s);
    }
  }

  /** Screen-space overlay (drawn above the camera view). */
  drawHUD(g) {
    if (this.banner) ui.banner(g, this.banner.text, this.banner.t, { size: 120, y: this.phase === 'parade' ? 190 : H / 2 - 40, color: '#ff8fd0' });
    if (this.phase === 'spa' && this.stations.every((s) => s.done)) {
      ui.banner(g, 'Everyone is happy!', this.allDoneT, { size: 100, y: H / 2, color: '#ffd23f' });
    }
  }
}
