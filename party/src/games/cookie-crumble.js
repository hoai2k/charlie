// Cookie Crumble: top-down grid of giant cookies floating on a milk lake.
// A cookie you step on and then leave cracks and falls. A = little hop to
// cross a one-cookie gap. Fall in = splash, swim to the shore and cheer on
// the others. Last one standing wins; if time runs out the survivors tie.
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { depthScale } from '../engine/camera.js';
import { rand, randInt, pick, chance, clamp, lerp, damp, ease, shuffle, TAU } from '../engine/util.js';

const T = 136;                       // cell size
const COLS = 10, ROWS = 6;
const GX = (W - COLS * T) / 2, GY = 132;
const FACE = 124;                    // visible cookie size
const TIME_LIMIT = 60;
const CRACK_T = [0, 0.5, 1.0], FALL_T = 1.5;   // crack stage thresholds and fall time (seconds of crack timer)
const HOP_DIST = 235, HOP_DUR = 0.4;
const SPEED = 330;
const PR = 30;                       // player feet radius for bumping
const CHAR_SCALE = 0.7;
const CRUMBLE_START = 17;            // random crumbling begins
const NAVY = '#24163f';
const pickPose = (...names) => names.find((n) => POSE_NAMES.includes(n)) || 'idle';

export const meta = {
  id: 'cookie-crumble',
  title: 'Cookie Crumble',
  category: 'party',
  type: 'Last one standing',
  goal: 'Stay on the cookies! Cookies you leave crack and fall into the milk.',
  controls: [['stick', 'Run around'], ['a', 'Hop over a gap']],
  tips: [
    'Keep moving! A cookie you step off will crack and fall.',
    'Press A while running to hop over one missing cookie.',
    'Bump your friends toward the milk, but watch your own step!',
  ],
  music: 'chase',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save(); g.translate(x, y);
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#fffdf6'); gr.addColorStop(1, '#cfe8ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,180,230,0.35)'; g.lineWidth = h * 0.012;
    for (let i = 0; i < 6; i++) { g.beginPath(); for (let k = 0; k <= 20; k++) { const xx = (k / 20) * w, yy = h * (0.12 + i * 0.16) + Math.sin(k * 0.7 + t * 2 + i) * h * 0.012; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
    const cols = 5, rows = 3, cs = Math.min(w / (cols + 0.4), h / (rows + 0.5)), ox = (w - cols * cs) / 2, oy = (h - rows * cs) / 2;
    const missing = new Set(['1,1', '2,0', '3,2']);
    const cracked = new Set(['2,1', '4,1']);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = ox + c * cs + cs / 2, cy = oy + r * cs + cs / 2, key = `${c},${r}`;
      if (missing.has(key)) {
        const ph = (t * 0.8 + c * 0.3) % 1;
        g.strokeStyle = `rgba(255,255,255,${0.9 - ph})`; g.lineWidth = cs * 0.05; g.beginPath(); g.ellipse(cx, cy, cs * (0.15 + ph * 0.3), cs * (0.1 + ph * 0.2), 0, 0, TAU); g.stroke();
        continue;
      }
      const hs = cs * 0.43;
      if (drawArt(g, cracked.has(key) ? 'prop/cookie-tile-cracked' : (c + r) % 3 === 0 ? 'prop/cookie-2' : 'prop/cookie-1', cx, cy + cs * 0.03, hs * 2.25, hs * 2.25)) continue;
      g.fillStyle = 'rgba(80,120,170,0.25)'; ui.roundRect(g, cx - hs + 3, cy - hs + cs * 0.1, hs * 2, hs * 2, hs * 0.5); g.fill();
      g.fillStyle = '#b97a3a'; ui.roundRect(g, cx - hs, cy - hs + cs * 0.07, hs * 2, hs * 2, hs * 0.5); g.fill();
      g.fillStyle = (c + r) % 3 === 0 ? '#f7b5d0' : '#e8b068'; ui.roundRect(g, cx - hs, cy - hs, hs * 2, hs * 2, hs * 0.5); g.fill();
      g.strokeStyle = '#6b3f1d'; g.lineWidth = cs * 0.04; g.stroke();
      g.fillStyle = (c + r) % 3 === 0 ? '#ffffff' : '#5a3418';
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + Math.cos(k * 2.1 + c) * hs * 0.5, cy + Math.sin(k * 2.1 + r) * hs * 0.5, cs * 0.07, cs * 0.05, k, 0, TAU); g.fill(); }
      if (cracked.has(key)) {
        g.strokeStyle = '#3a200d'; g.lineWidth = cs * 0.035; g.beginPath(); g.moveTo(cx - hs * 0.6, cy - hs * 0.5); g.lineTo(cx - hs * 0.1, cy); g.lineTo(cx + hs * 0.1, cy + hs * 0.2); g.lineTo(cx + hs * 0.6, cy + hs * 0.6); g.stroke();
      }
    }
    // a swimmer popping up in a hole
    const sx = ox + 1.5 * cs, sy = oy + 1.5 * cs + Math.sin(t * 4) * cs * 0.03;
    g.fillStyle = '#ffd9b3'; g.strokeStyle = NAVY; g.lineWidth = cs * 0.04;
    g.beginPath(); g.arc(sx, sy - cs * 0.05, cs * 0.24, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(sx - cs * 0.08, sy - cs * 0.08, cs * 0.03, 0, TAU); g.arc(sx + cs * 0.08, sy - cs * 0.08, cs * 0.03, 0, TAU); g.fill();
    g.strokeStyle = NAVY; g.beginPath(); g.arc(sx, sy - cs * 0.02, cs * 0.07, 0.2, Math.PI - 0.2); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = cs * 0.05; g.beginPath(); g.ellipse(sx, sy + cs * 0.14, cs * 0.3, cs * 0.08, 0, 0, TAU); g.stroke();
    g.restore();
  },
};

// ---------------------------------------------------------------------------
// procedural cookie sprites

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function squirclePath(g, cx, cy, half, seed, wobble = 3) {
  g.beginPath();
  const N = 44;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const co = Math.cos(a), si = Math.sin(a);
    const n = 4.2;
    const r = half / Math.pow(Math.pow(Math.abs(co), n) + Math.pow(Math.abs(si), n), 1 / n);
    const k = r + Math.sin(a * 5 + seed) * wobble + Math.sin(a * 9 + seed * 2.3) * wobble * 0.5;
    const px = cx + co * k, py = cy + si * k;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}

const E = 16;   // cookie thickness shown below the face
function makeCookie(type, seed) {
  const S = FACE + 24;
  const c = makeCanvas(S, S + E);
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2, half = FACE / 2 - 2;
  const rnd = (() => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  const base = ['#e3ab5e', '#f4b9d3', '#7d4c2b', '#f3d79f'][type];
  const edge = ['#c58a40', '#e68fb6', '#5e3519', '#d9b46c'][type];
  const side = ['#a9692c', '#b9763a', '#4a2711', '#c19450'][type];
  // thickness
  g.fillStyle = side; squirclePath(g, cx, cy + E, half, seed); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#5b3416'; g.lineJoin = 'round'; g.stroke();
  // face
  squirclePath(g, cx, cy, half, seed); g.fillStyle = edge; g.fill();
  const rg = g.createRadialGradient(cx - 18, cy - 22, 6, cx, cy, half);
  rg.addColorStop(0, ['#f7cc84', '#fbd3e3', '#97623a', '#fbe8bf'][type]); rg.addColorStop(1, base);
  squirclePath(g, cx, cy, half - 8, seed + 1, 2); g.fillStyle = rg; g.fill();
  g.strokeStyle = '#5b3416'; g.lineWidth = 6; squirclePath(g, cx, cy, half, seed); g.stroke();
  g.save(); squirclePath(g, cx, cy, half - 6, seed); g.clip();
  const dots = (n, fn) => { for (let i = 0; i < n; i++) fn(cx + (rnd() - 0.5) * half * 1.5, cy + (rnd() - 0.5) * half * 1.5, i); };
  if (type === 0) {
    dots(11, (x, y) => { g.fillStyle = '#4a2a12'; g.beginPath(); g.ellipse(x, y, 11 + rnd() * 5, 8 + rnd() * 4, rnd() * 3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - 3, y - 3, 3.5, 2.2, 0, 0, TAU); g.fill(); });
  } else if (type === 1) {
    // icing swirl + sprinkles
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(cx - 14, cy - 18, 34, 20, -0.4, 0, TAU); g.fill();
    const cols = ['#ff4d6d', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff', '#ffffff'];
    dots(24, (x, y, i) => { g.save(); g.translate(x, y); g.rotate(rnd() * 3); g.fillStyle = cols[i % cols.length]; ui.roundRect(g, -8, -3, 16, 6, 3); g.fill(); g.restore(); });
  } else if (type === 2) {
    dots(9, (x, y, i) => { g.fillStyle = i % 2 ? '#fff1d6' : '#2f1608'; g.beginPath(); g.ellipse(x, y, 11 + rnd() * 4, 8 + rnd() * 3, rnd() * 3, 0, TAU); g.fill(); });
  } else {
    dots(26, (x, y) => { g.fillStyle = 'rgba(160,110,50,0.55)'; g.beginPath(); g.ellipse(x, y, 5 + rnd() * 3, 2.5, rnd() * 3, 0, TAU); g.fill(); });
    dots(10, (x, y) => { g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); });
  }
  g.restore();
  // shine
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(cx - 30, cy - 36, 20, 8, -0.7, 0, TAU); g.fill();
  return c;
}

// crack polylines in tile-local units (-1..1), 3 variants, cumulative per stage
const CRACKS = [
  [[[-0.1, -0.9], [0.05, -0.5], [-0.08, -0.15], [0.1, 0.2]], [[0.05, -0.5], [0.4, -0.35], [0.7, -0.45]], [[0.1, 0.2], [-0.25, 0.5], [-0.45, 0.85]], [[-0.08, -0.15], [-0.5, -0.05], [-0.85, -0.3]], [[0.1, 0.2], [0.5, 0.35], [0.9, 0.3]]],
  [[[0.7, -0.8], [0.35, -0.4], [0.4, 0.0], [0.05, 0.3]], [[0.35, -0.4], [-0.1, -0.5], [-0.4, -0.85]], [[0.05, 0.3], [0.3, 0.7], [0.2, 0.95]], [[0.4, 0.0], [0.85, 0.15]], [[0.05, 0.3], [-0.4, 0.2], [-0.85, 0.4]]],
  [[[-0.8, 0.7], [-0.4, 0.3], [-0.45, -0.1], [-0.05, -0.3]], [[-0.4, 0.3], [0.0, 0.45], [0.35, 0.85]], [[-0.05, -0.3], [0.4, -0.2], [0.8, -0.6]], [[-0.45, -0.1], [-0.8, -0.35]], [[-0.05, -0.3], [-0.1, -0.7], [0.1, -0.95]]],
];
const CRACK_STAGES = [2, 4, 5];   // how many polylines are visible at stage 1,2,3

// Each flavor has matching cracked and crumbling art; light cracks remain
// procedural until stage 2, with intact art as the missing-image fallback.
const COOKIE_ART = ['prop/cookie-tile', 'prop/cookie-2', 'prop/cookie-3', 'prop/cookie-4'];
const ART_SIZE = 142;             // round cookie art, a hair wider than the cell so the corners stay small
function cookieArtKey(type, stage) {
  if (type === 0 && stage >= 3) return 'prop/cookie-tile-crumbling';
  if (type === 0 && stage === 2) return 'prop/cookie-tile-cracked';
  if (stage >= 2) {
    const key = `${COOKIE_ART[type]}-${stage >= 3 ? 'crumbling' : 'cracked'}`;
    if (art(key)) return key;
  }
  return COOKIE_ART[type];
}
function cookieArtCracks(type, stage) {
  return stage === 1 || (type !== 0 && cookieArtKey(type, stage) === COOKIE_ART[type]);
}

// ---------------------------------------------------------------------------

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.clock = 0;
    this.ended = false;
    this.endT = 0;
    this.msg = null;
    this.crumbleNext = CRUMBLE_START;
    this.sounds = { crack: 0, crumble: 0, splash: 0 };
    this.sprites = [0, 1, 2, 3].map((tp) => [makeCookie(tp, 1 + tp * 7), makeCookie(tp, 2 + tp * 7), makeCookie(tp, 3 + tp * 7)]);
    this.floaters = Array.from({ length: 9 }, () => ({ x: rand(W), y: rand(120, 960), r: rand(14, 24), ph: rand(TAU), sp: rand(6, 16) }));
    this.ripples = [];
    this.fallers = [];
    this.tiles = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const h = (c * 7 + r * 13 + (c * r) % 5) % 20;
      const type = h < 9 ? 0 : h < 14 ? 1 : h < 17 ? 2 : 3;
      this.tiles.push({ c, r, x: GX + c * T + T / 2, y: GY + r * T + T / 2, state: 'intact', stepped: false, cr: 0, stage: 0, rate: 1, occ: false, type, var: (c + r * 3) % 3, crack: (c * 5 + r * 3) % 3, shake: 0 });
    }
    // slots on the shores for people who fall in
    this.slots = [];
    for (let k = 0; k < 5; k++) {
      this.slots.push({ side: -1, x: 112, y: 235 + k * 150, used: false, edge: GX - 40 });
      this.slots.push({ side: 1, x: W - 112, y: 235 + k * 150, used: false, edge: GX + COLS * T + 40 });
    }
    this.bg = this.makeBackground();
    // starting tiles spread around the grid
    const spots = this.startSpots(this.n);
    this.ps = this.players.map((p, i) => {
      const tl = spots[i];
      const a = new Actor(p.charId, { scale: CHAR_SCALE, x: tl.x, y: tl.y + 14, facing: tl.x < W / 2 ? 1 : -1 });
      a.snap(); a.setPose('idle');
      tl.stepped = true;
      return {
        a, state: 'play', x: tl.x, y: tl.y + 14, vx: 0, vy: 0, kx: 0, ky: 0, hop: null, hopCd: 0, z: 0, face: { x: tl.x < W / 2 ? 1 : -1, y: 0 },
        rank: 0, outAt: null, swim: null, cheerT: rand(1, 3), warned: false, ai: { path: [], target: null, brain: null, hopNext: 0, hesitate: 0 },
      };
    });
    this.ps.forEach((s, i) => { s.ai.brain = null; });
  }

  startSpots(n) {
    const spots = [];
    const used = new Set();
    for (let i = 0; i < n; i++) {
      // walk around an ellipse; for 1 player start in the middle
      let c, r;
      if (n === 1) { c = 4; r = 2; } else {
        const a = (i / n) * TAU + (n === 2 ? 0 : -Math.PI / 2 + 0.4);
        c = Math.round((COLS - 1) / 2 + Math.cos(a) * (COLS * 0.36));
        r = Math.round((ROWS - 1) / 2 + Math.sin(a) * (ROWS * 0.34));
      }
      c = clamp(c, 0, COLS - 1); r = clamp(r, 0, ROWS - 1);
      let guard = 0;
      while (used.has(c + ',' + r) && guard++ < 50) { c = clamp(c + randInt(-1, 1), 0, COLS - 1); r = clamp(r + randInt(-1, 1), 0, ROWS - 1); }
      used.add(c + ',' + r);
      spots.push(this.tiles[r * COLS + c]);
    }
    return spots;
  }

  // ----- tiles -----------------------------------------------------------

  tileAt(x, y) {
    const c = Math.floor((x - GX) / T), r = Math.floor((y - GY) / T);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return this.tiles[r * COLS + c];
  }
  tileRC(c, r) { return c < 0 || r < 0 || c >= COLS || r >= ROWS ? null : this.tiles[r * COLS + c]; }
  solid(t) { return !!t && t.state !== 'fallen'; }
  supported(x, y) {
    const pts = [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12]];
    for (const [dx, dy] of pts) if (this.solid(this.tileAt(x + dx, y + dy))) return true;
    return false;
  }

  crackTile(t, rate = 1, start = 0) {
    if (t.state !== 'intact') return;
    t.state = 'cracking'; t.cr = start; t.rate = rate; t.stage = 0;
  }

  dropTile(t) {
    t.state = 'fallen';
    this.fallers.push({ x: t.x, y: t.y, t: 0, type: t.type, v: t.var, crack: t.crack, rot: rand(-0.3, 0.3) });
    particles.burst(t.x, t.y, { type: 'shard', count: 7, colors: ['#e3ab5e', '#c58a40', '#7d4c2b', '#f3d79f'], speed: [120, 320], gravity: 700, life: [0.5, 0.9], size: [7, 13] });
    particles.burst(t.x, t.y, { type: 'drop', count: 12, colors: ['#ffffff', '#e4f3ff', '#c4e4ff'], speed: [140, 420], angle: -Math.PI / 2, spread: 1.3 });
    particles.burst(t.x, t.y, { type: 'dust', count: 5, speed: [30, 120] });
    this.ripples.push({ x: t.x, y: t.y, t: 0 }, { x: t.x, y: t.y, t: -0.18 });
    if (this.sounds.crumble <= 0) { sfx('crumble'); this.sounds.crumble = 0.08; }
    if (this.sounds.splash <= 0) { sfx('splash'); this.sounds.splash = 0.3; }
    fx.shake(5, 0.15);
  }

  alive() { return this.ps.filter((s) => s.state === 'play'); }
  aliveCount() { return this.ps.reduce((n, s) => n + (s.state === 'play' ? 1 : 0), 0); }

  // ----- update ------------------------------------------------------------

  preUpdate(dt) { this.ambient(dt); }
  postUpdate(dt) { this.ambient(dt); }

  update(dt) {
    this.ambient(dt);
    if (this.ended) {
      this.endT += dt;
      this.updateSwimmers(dt);
      if (this.endT > 1.5 && !this.finished) { this.finished = true; this.finish(); }
      return;
    }
    this.t += dt;
    for (const k in this.sounds) this.sounds[k] -= dt;

    // late-game banners
    if (!this.m1 && this.t >= CRUMBLE_START) { this.m1 = true; this.msg = { text: 'The cookies are crumbling!', t: 0 }; sfx('crack'); fx.shake(8, 0.3); }
    if (!this.m2 && this.t >= 40) { this.m2 = true; this.msg = { text: 'Faster and faster!', t: 0 }; fx.shake(8, 0.3); }
    if (this.msg) { this.msg.t += dt; if (this.msg.t > 2.2) this.msg = null; }

    // random crumbling: gets faster as the clock runs down
    if (this.t >= this.crumbleNext) {
      const prog = clamp((this.t - CRUMBLE_START) / (TIME_LIMIT - CRUMBLE_START), 0, 1);
      const interval = lerp(2.2, 0.42, prog);
      this.crumbleNext = this.t + interval * rand(0.7, 1.2);
      const cands = this.tiles.filter((t) => t.state === 'intact');
      if (cands.length > 1) this.crackTile(pick(cands), lerp(1, 1.5, prog), 0.05);
    }

    this.players.forEach((p, i) => this.updatePlayer(p, this.ps[i], i, dt));
    this.collide(dt);

    // tile occupancy -> cracking
    for (const t of this.tiles) t.occ = false;
    for (const s of this.ps) {
      if (s.state !== 'play') continue;
      const t = this.tileAt(s.x, s.y);
      if (t && !s.hop) { t.occ = true; if (!t.stepped) { t.stepped = true; } }
    }
    for (const t of this.tiles) {
      if (t.state === 'intact' && t.stepped && !t.occ) this.crackTile(t, 1, 0);
      if (t.state === 'cracking') {
        t.cr += dt * t.rate;
        const stage = t.cr >= CRACK_T[2] ? 3 : t.cr >= CRACK_T[1] ? 2 : t.cr >= CRACK_T[0] + 0.01 ? 1 : 0;
        if (stage !== t.stage) {
          t.stage = stage;
          if (stage === 1 && this.sounds.crack <= 0) { sfx('crack'); this.sounds.crack = 0.12; }
          if (stage >= 2) {
            particles.burst(t.x, t.y, { type: 'dust', count: 3, speed: [20, 90] });
            if (stage === 2) sfx('crack');
          }
          // warn anyone standing on it
          for (const s of this.ps) if (s.state === 'play' && !s.hop && this.tileAt(s.x, s.y) === t && stage >= 2) { s.a.playOnce('surprised', 0.5, 'idle'); s.a.emote('exclaim', 0.8); }
        }
        t.shake = t.stage === 3 ? 1 : t.stage === 2 ? 0.4 : 0;
        if (t.cr >= FALL_T) this.dropTile(t);
      }
    }

    // support checks
    const fallen = [];
    for (const s of this.ps) {
      if (s.state !== 'play' || s.hop) continue;
      if (!this.supported(s.x, s.y)) fallen.push(s);
    }
    if (fallen.length) {
      const before = this.aliveCount();
      const rank = before - fallen.length + 1;
      fallen.forEach((s) => this.eliminate(s, rank));
    }
    this.updateSwimmers(dt);
    this.frameCamera();

    // end?
    const alive = this.aliveCount();
    if (!this.ended) {
      if ((this.n > 1 && alive <= 1) || (this.n === 1 && alive === 0)) this.endGame(alive === 1);
      else if (this.t >= TIME_LIMIT) this.endGame(false, true);
    }
  }

  /** Late game: gently frame the shrinking cookie field and the players still on it. */
  frameCamera() {
    const cam = this.api.camera;
    if (!cam || this.t < 18) return;
    cam.maxZoom = 1.2;
    const pts = [];
    for (const t of this.tiles) if (t.state !== 'fallen') pts.push({ x: t.x, y: t.y });
    for (const s of this.ps) if (s.state === 'play') pts.push({ x: s.x, y: s.y });
    if (pts.length) cam.frame(pts, 300, 1.6);
  }

  eliminate(s, rank) {
    const i = this.ps.indexOf(s);
    s.state = 'swim'; s.rank = rank; s.outAt = this.t;
    s.hop = null; s.z = 0;
    // pick the nearest free shore slot (prefer matching side)
    const free = this.slots.filter((sl) => !sl.used);
    free.sort((a, b) => Math.hypot(a.edge - s.x, a.y - s.y) - Math.hypot(b.edge - s.x, b.y - s.y));
    const slot = free[0] || this.slots[i % this.slots.length];
    slot.used = true;
    s.swim = { slot, phase: 'bob', t: 0, sink: 0, climb: 0, startX: 0, startY: 0 };
    s.a.setPose('hurt'); s.a.squash(0.4);
    s.a.facing = slot.side > 0 ? 1 : -1;
    particles.burst(s.x, s.y, { type: 'drop', count: 26, colors: ['#ffffff', '#e4f3ff', '#bfe3ff'], speed: [200, 560], angle: -Math.PI / 2, spread: 1.2 });
    particles.burst(s.x, s.y, { type: 'bubble', count: 8, speed: [60, 220] });
    particles.ring(s.x, s.y, '#ffffff', 220, 0.6);
    this.ripples.push({ x: s.x, y: s.y, t: 0 }, { x: s.x, y: s.y, t: -0.2 }, { x: s.x, y: s.y, t: -0.4 });
    sfx('splash'); sfx('bubble'); sfx('crowd-ooh');
    voice(this.players[i].charId, 'ouch');
    fx.shake(10, 0.25);
    this.lastOut = { x: s.x, y: s.y - 60 };
    if (this.api.camera) this.api.camera.punch(s.x, s.y - 40, 1.16, 0.3);
    this.players[i].ctrl.rumble && this.players[i].ctrl.rumble(0.7, 250);
    s.a.emote('sweat', 1.2);
    particles.popText(s.x, s.y - 120, 'Splash!', '#8fd3ff', 52);
  }

  updateSwimmers(dt) {
    this.ps.forEach((s, i) => {
      if (s.state === 'swim') {
        const sw = s.swim; sw.t += dt;
        if (sw.phase === 'bob') {
          sw.sink = damp(sw.sink, 30, 8, dt);
          s.a.setPose('hurt');
          if (sw.t > 0.8) { sw.phase = 'swim'; sw.t = 0; s.a.setPose('walk'); }
        } else if (sw.phase === 'swim') {
          const tx = sw.slot.edge, ty = sw.slot.y;
          const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
          const sp = 300;
          if (d < 14) { sw.phase = 'climb'; sw.t = 0; sw.startX = s.x; sw.startY = s.y; sfx('splash'); s.a.setPose('idle'); }
          else {
            s.x += (dx / d) * sp * dt; s.y += (dy / d) * sp * dt;
            s.a.facing = dx > 0 ? 1 : -1; s.a.moveAnim(dx / d * 120, 0, 200);
            sw.sink = 26 + Math.sin(this.clock * 9) * 5;
            if (Math.random() < dt * 8) particles.burst(s.x, s.y + 6, { type: 'bubble', count: 1, speed: [10, 40], size: [5, 10] });
            if (Math.random() < dt * 5) this.ripples.push({ x: s.x, y: s.y, t: 0, small: true });
          }
        } else if (sw.phase === 'climb') {
          const k = clamp(sw.t / 0.45, 0, 1);
          s.x = lerp(sw.startX, sw.slot.x, ease.outQuad(k)); s.y = lerp(sw.startY, sw.slot.y, ease.outQuad(k));
          sw.sink = lerp(26, 0, k); s.z = Math.sin(k * Math.PI) * 60;
          if (k >= 1) {
            sw.phase = 'shore'; sw.t = 0; s.z = 0; s.state = 'shore';
            s.a.facing = sw.slot.side > 0 ? -1 : 1;
            s.a.squash(0.35); particles.burst(s.x, s.y, { type: 'drop', count: 10, colors: ['#ffffff', '#bfe3ff'], speed: [100, 300], angle: -Math.PI / 2, spread: 1 });
            s.a.playOnce(pickPose('shake', 'pout'), 1.0, 'pout'); sfx('aww');
            s.pouting = 1.8;
            s.cheerT = rand(1.5, 3);
          }
        }
      } else if (s.state === 'shore') {
        s.cheerT -= dt; s.pouting = (s.pouting || 0) - dt;
        if (s.pouting <= 0 && !s.clapping) { s.clapping = true; s.a.setPose(pickPose('clap', 'cheer')); }
        if (s.cheerT <= 0) {
          s.cheerT = rand(1.4, 3.2);
          if (s.clapping) { s.a.squash(0.2); if (chance(0.5)) s.a.emote(pick(['note', 'heart', 'star']), 1.2); }
        }
      }
      s.a.x = s.x; s.a.y = s.y;
      s.a.z = s.state === 'swim' ? -(s.swim.sink || 0) + s.z : s.z;
    });
  }

  updatePlayer(p, s, i, dt) {
    if (s.state !== 'play') return;
    if (p.isAI) this.thinkAI(p, s, i, dt);
    const c = p.ctrl;
    s.hopCd -= dt;
    if (s.hop) {
      s.hop.t += dt;
      const k = clamp(s.hop.t / HOP_DUR, 0, 1);
      s.z = Math.sin(k * Math.PI) * 78;
      s.x += s.hop.dx * dt; s.y += s.hop.dy * dt;
      s.vx = s.hop.dx * 0.3; s.vy = s.hop.dy * 0.3;
      if (k >= 1) {
        s.hop = null; s.z = 0; s.hopCd = 0.12;
        s.a.squash(0.3); sfx('land');
        particles.burst(s.x, s.y, { type: 'dust', count: 5, speed: [40, 150] });
        s.a.setPose('idle');
      }
    } else {
      let ix = c.x, iy = c.y;
      const m = Math.hypot(ix, iy);
      if (m > 1) { ix /= m; iy /= m; }
      const dead = m < 0.12;
      const tvx = dead ? 0 : ix * SPEED, tvy = dead ? 0 : iy * SPEED;
      const kk = Math.min(1, (dead ? 14 : 11) * dt);
      s.vx += (tvx - s.vx) * kk; s.vy += (tvy - s.vy) * kk;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (!dead) { s.face.x = ix / (m > 1 ? 1 : m || 1); s.face.y = iy / (m > 1 ? 1 : m || 1); const fm = Math.hypot(s.face.x, s.face.y) || 1; s.face.x /= fm; s.face.y /= fm; }
      if (c.pressed('a') && s.hopCd <= 0) this.startHop(s, dead ? null : { x: ix / (m || 1), y: iy / (m || 1) });
    }
    // knock-back
    s.x += s.kx * dt; s.y += s.ky * dt;
    const kd = Math.exp(-6 * dt); s.kx *= kd; s.ky *= kd;
    s.x = clamp(s.x, GX - 80, GX + COLS * T + 80); s.y = clamp(s.y, GY - 70, GY + ROWS * T + 70);
    // animation
    const a = s.a;
    a.x = s.x; a.y = s.y; a.z = s.z;
    if (s.hop) { a.facing = s.hop.dx > 5 ? 1 : s.hop.dx < -5 ? -1 : a.facing; a.setPose('jump'); }
    else {
      const sp = Math.hypot(s.vx, s.vy);
      a.moveAnim(s.vx, s.vy, SPEED, { run: sp > SPEED * 0.6 });
    }
    // little footstep crumbs
    if (!s.hop && Math.hypot(s.vx, s.vy) > 120 && Math.random() < dt * 5) particles.burst(s.x, s.y, { type: 'dust', count: 1, speed: [10, 40], size: [6, 12] });
  }

  startHop(s, dir) {
    let dx = 0, dy = 0;
    if (dir) {
      // gentle aim assist: nudge toward a landing cookie if the straight line would miss
      let ang = Math.atan2(dir.y, dir.x);
      const land = (a) => this.supported(s.x + Math.cos(a) * HOP_DIST, s.y + Math.sin(a) * HOP_DIST);
      if (!land(ang)) {
        for (const off of [0.2, -0.2, 0.4, -0.4, 0.6, -0.6]) { if (land(ang + off)) { ang += off; break; } }
      }
      const sp = HOP_DIST / HOP_DUR;
      dx = Math.cos(ang) * sp; dy = Math.sin(ang) * sp;
    }
    s.hop = { t: 0, dx, dy };
    s.a.squash(-0.3); sfx('jump');
    particles.burst(s.x, s.y, { type: 'dust', count: 4, speed: [30, 110] });
  }

  collide(dt) {
    const list = this.ps.filter((s) => s.state === 'play' && !s.hop);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      const min = PR * 2;
      if (d < min) {
        if (d < 0.01) { dx = rand(-1, 1); dy = rand(-1, 1); d = Math.hypot(dx, dy); }
        const nx = dx / d, ny = dy / d, ov = (min - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        // soft push, stronger when one of them is running into the other
        const rel = ((a.vx - b.vx) * nx + (a.vy - b.vy) * ny);
        const imp = 140 + Math.max(0, rel) * 0.55;
        a.kx -= nx * imp; a.ky -= ny * imp; b.kx += nx * imp; b.ky += ny * imp;
        if (!a.bumpT || this.clock - a.bumpT > 0.3) {
          a.bumpT = this.clock; b.bumpT = this.clock;
          sfx('bonk'); particles.burst((a.x + b.x) / 2, (a.y + b.y) / 2 - 30, { type: 'spark', count: 6, colors: ['#fff6a8', '#ffffff'], speed: [80, 220] });
          a.a.squash(0.25); b.a.squash(0.25);
        }
      }
    }
  }

  endGame(hasWinner, timeUp = false) {
    this.ended = true; this.endT = 0;
    if (hasWinner) {
      const w = this.ps.find((s) => s.state === 'play');
      if (w) {
        w.rank = 1; w.a.setPose('celebrate'); w.a.squash(0.4);
        particles.confettiRain(W, 100); sfx('win'); sfx('cheer'); voice(this.players[this.ps.indexOf(w)].charId, 'yay');
        particles.popText(w.x, w.y - 190, 'Last cookie!', '#ffd23f', 62);
        fx.slowmo(0.5, 0.5);
      }
    } else if (timeUp) {
      this.ps.forEach((s) => { if (s.state === 'play') { s.rank = 1; s.a.setPose('celebrate'); } });
      sfx('win'); particles.confettiRain(W, 80);
    } else {
      this.ps.forEach((s) => { if (s.rank === 0) s.rank = 1; });
    }
  }

  finish() {
    // survivors (rank 0) tie for first
    const placements = this.ps.map((s) => (s.rank === 0 ? 1 : s.rank));
    const stats = this.ps.map((s) => (s.rank === 1 && s.outAt === null ? 'Survived!' : `Out at ${Math.round(s.outAt ?? this.t)}s`));
    const w = this.ps.find((s) => s.state === 'play');
    const focus = w ? { x: w.x, y: w.y - 70, zoom: 1.35 } : this.lastOut ? { x: this.lastOut.x, y: this.lastOut.y, zoom: 1.2 } : undefined;
    this.api.finish({ placements, stats, focus });
  }

  // ----- CPU brain -------------------------------------------------------

  neighbors(t, canHop) {
    const out = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const n = this.tileRC(t.c + dx, t.r + dy);
      if (this.solid(n) && n.stage < 2) out.push({ t: n, hop: false });
      else if (canHop) {
        const f = this.tileRC(t.c + dx * 2, t.r + dy * 2);
        if (this.solid(f) && (!this.solid(n)) && f.stage < 2) out.push({ t: f, hop: true, dx, dy });
      }
    }
    return out;
  }

  planPath(from, target, canHop) {
    // BFS over cookies (hop edges allowed over one missing cookie)
    const prev = new Map(); prev.set(from, null);
    const q = [from];
    while (q.length) {
      const cur = q.shift();
      if (cur === target) break;
      for (const nb of this.neighbors(cur, canHop)) {
        if (prev.has(nb.t)) continue;
        prev.set(nb.t, { from: cur, hop: nb.hop, dx: nb.dx, dy: nb.dy });
        q.push(nb.t);
      }
    }
    if (!prev.has(target)) return null;
    const path = [];
    let cur = target;
    while (cur !== from) { const e = prev.get(cur); path.unshift({ t: cur, hop: e.hop, dx: e.dx, dy: e.dy }); cur = e.from; }
    return path;
  }

  thinkAI(p, s, i, dt) {
    const ai = s.ai, c = p.ctrl;
    const prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 0, 0, 2);
    if (!ai.brain) ai.brain = { t: rand(0.2, 0.7) };
    if (s.hop) { c.move(0, 0); return; }
    const me = this.tileAt(s.x, s.y);
    ai.brain.t -= dt;
    const danger = me && me.state === 'cracking' && me.stage >= 1;
    // Easy CPUs notice trouble late
    if (danger) { ai.hesitate = (ai.hesitate ?? 0); if (ai.hesitate === 0) ai.hesitate = this.clock + reactionTime(p) * 0.8; }
    else ai.hesitate = 0;
    const urgent = danger && this.clock >= ai.hesitate;
    ai.restT = (ai.restT ?? rand(1.5, 4)) - dt;
    const invalid = !ai.target || ai.target.state === 'fallen' || (ai.target.state === 'cracking' && ai.target.stage >= 2);
    if (ai.brain.t <= 0 || (urgent && !ai.urgentDone) || invalid) {
      const crowded = me && this.ps.some((o) => o !== s && o.state === 'play' && Math.hypot(o.x - s.x, o.y - s.y) < 200);
      const wander = ai.restT <= 0;
      ai.brain.t = [rand(0.7, 1.3), rand(0.4, 0.8), rand(0.25, 0.5)][lvl];
      if (me && (invalid || urgent || crowded || wander || me.state !== 'intact')) {
        ai.urgentDone = urgent;
        this.chooseTarget(p, s, ai, me, lvl);
        if (wander) ai.restT = [rand(3, 6), rand(2.5, 4.5), rand(2, 3.5)][lvl];
      }
    }
    if (!danger) ai.urgentDone = false;
    // follow the path
    let dest = null;
    if (me) {
      while (ai.path.length && ai.path[0].t === me) ai.path.shift();
      const nx = ai.path[0];
      if (nx) {
        if (nx.hop) {
          // walk to the edge of this cookie then hop
          const dx = nx.dx, dy = nx.dy;
          const ex = me.x + dx * (T / 2 - 22), ey = me.y + dy * (T / 2 - 22);
          const d = Math.hypot(ex - s.x, ey - s.y);
          if (d < 30 && s.hopCd <= 0) { c.move(dx, dy); c.press('a'); ai.path.shift(); }
          else { dest = { x: ex, y: ey }; }
        } else dest = { x: nx.t.x, y: nx.t.y };
      } else if (ai.target === me || !ai.target) {
        // sit tight (drift a little away from neighbours)
        dest = null;
      }
    }
    if (dest) {
      const dx = dest.x - s.x, dy = dest.y - s.y, d = Math.hypot(dx, dy);
      const k = clamp(d / 30, 0.0, 1) * prof.speed;
      c.move((dx / (d || 1)) * k, (dy / (d || 1)) * k);
    } else {
      // stay roughly on the cookie centre
      const tx = me ? me.x : s.x, ty = me ? me.y : s.y;
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      if (d > 14) c.move((dx / d) * 0.4, (dy / d) * 0.4); else c.move(0, 0);
    }
  }

  chooseTarget(p, s, ai, me, lvl) {
    const canHop = lvl > 0 || chance(0.7);
    const others = this.ps.filter((o) => o !== s && o.state === 'play');
    let best = null, bestScore = -1e9;
    const consider = [];
    // BFS distances to all reachable cookies within a few steps
    const dist = new Map(); dist.set(me, { d: 0, path: [] });
    const q = [me];
    while (q.length) {
      const cur = q.shift(); const info = dist.get(cur);
      if (info.d >= 4) continue;
      for (const nb of this.neighbors(cur, canHop)) {
        if (dist.has(nb.t)) continue;
        dist.set(nb.t, { d: info.d + (nb.hop ? 2 : 1), path: [...info.path, { t: nb.t, hop: nb.hop, dx: nb.dx, dy: nb.dy }] });
        q.push(nb.t);
      }
    }
    for (const [t, info] of dist) {
      let sc = 0;
      if (t.state === 'cracking') sc -= 6 + t.stage * 3;
      let nbs = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const n = this.tileRC(t.c + dx, t.r + dy); if (n && n.state === 'intact') nbs++; }
      sc += nbs * 0.55;
      if (t.state === 'intact' && !t.stepped) sc += 1.4;
      if (t.stepped && t !== me && t.occ) sc -= 4;      // somebody is standing there
      sc -= info.d * 0.7;
      for (const o of others) {
        const d = Math.hypot(o.x - t.x, o.y - t.y);
        if (d < 260) sc -= 2.4 * (1 - d / 260);
      }
      // keep away from the grid border a little
      const edge = Math.min(t.c, COLS - 1 - t.c, t.r, ROWS - 1 - t.r);
      sc += Math.min(edge, 2) * 0.9;
      if (t === me) {
        sc += me.state === 'intact' ? [3.2, 2.6, 2.0][lvl] : -3;
        if (me.state === 'cracking') sc -= 4;
      }
      sc += rand(-1, 1) * [2.6, 1.0, 0.3][lvl];
      consider.push({ t, sc, info });
      if (sc > bestScore) { bestScore = sc; best = { t, info }; }
    }
    // Easy CPUs sometimes just pick a random cookie (even a bad one)
    if (best && chance([0.2, 0.07, 0.02][lvl])) {
      const r = pick(consider); best = { t: r.t, info: r.info };
    }
    if (!best) return;
    ai.target = best.t;
    ai.path = best.info.path.slice();
  }

  // ----- drawing -------------------------------------------------------------

  ambient(dt) {
    this.clock += dt;
    for (const s of this.ps) {
      s.a.scale = CHAR_SCALE * depthScale(s.y, { top: GY, near: GY + ROWS * T, far: 0.84, nearScale: 1.1 });
      s.a.update(dt);
    }
    for (const f of this.fallers) f.t += dt;
    this.fallers = this.fallers.filter((f) => f.t < 0.7);
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 1.1);
    for (const f of this.floaters) { f.x += f.sp * dt; if (f.x > W + 40) f.x = -40; }
  }

  makeBackground() {
    const c = makeCanvas(W, H), g = c.getContext('2d');
    // milk lake
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#f3f9ff'); gr.addColorStop(1, '#d6e9fb');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // soft rings
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = `rgba(255,255,255,${0.35})`; g.lineWidth = 8;
      g.beginPath(); g.ellipse(rand(300, W - 300), rand(100, H - 100), rand(80, 220), rand(30, 80), 0, 0, TAU); g.stroke();
    }
    const vg = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1100); vg.addColorStop(0, 'rgba(180,215,245,0)'); vg.addColorStop(1, 'rgba(150,195,235,0.5)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // shores: crumbly graham-cracker banks with sprinkles and candy
    const shore = (left) => {
      g.save();
      if (!left) { g.translate(W, 0); g.scale(-1, 1); }
      g.fillStyle = '#c9954f';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(215, 0);
      for (let y = 0; y <= H; y += 60) g.quadraticCurveTo(250 + (y % 120 ? 0 : 0), y + 30, 215, y + 60);
      g.lineTo(215, H); g.lineTo(0, H); g.closePath(); g.fill();
      g.strokeStyle = '#6b3f1d'; g.lineWidth = 8; g.stroke();
      g.fillStyle = '#e0b06a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(190, 0);
      for (let y = 0; y <= H; y += 60) g.quadraticCurveTo(222, y + 30, 190, y + 60);
      g.lineTo(190, H); g.lineTo(0, H); g.closePath(); g.fill();
      // foam line
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 10;
      g.beginPath(); g.moveTo(228, 0); for (let y = 0; y <= H; y += 60) g.quadraticCurveTo(262, y + 30, 228, y + 60); g.stroke();
      // sprinkles
      const cols = ['#ff4d6d', '#ffd23f', '#5ddc6a', '#3fa7ff', '#9b5cff', '#ffffff'];
      for (let k = 0; k < 90; k++) { g.save(); g.translate(rand(10, 175), rand(10, H - 10)); g.rotate(rand(TAU)); g.fillStyle = cols[k % cols.length]; ui.roundRect(g, -9, -3.5, 18, 7, 3.5); g.fill(); g.restore(); }
      // gumdrops and lollipops along the outer edge
      for (let k = 0; k < 6; k++) {
        const y = 80 + k * 170 + (left ? 0 : 40);
        g.fillStyle = ['#ff7ac6', '#8be08b', '#ffd23f', '#7fd3ff'][k % 4]; g.strokeStyle = NAVY; g.lineWidth = 4;
        g.beginPath(); g.ellipse(34, y, 24, 18, 0, Math.PI, 0); g.lineTo(58, y); g.lineTo(10, y); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(26, y - 8, 7, 4, -0.5, 0, TAU); g.fill();
      }
      g.restore();
    };
    shore(true); shore(false);
    // plates (drawn unflipped)
    for (const sl of this.slots) {
      g.fillStyle = 'rgba(107,63,29,0.3)'; g.beginPath(); g.ellipse(sl.x, sl.y + 6, 64, 22, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 4; g.stroke();
    }
    return c;
  }

  draw(g) {
    const bg = art('bg/cookie-crumble');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(this.bg, 0, 0);
    this.drawWaves(g);
    // floating cereal rings / marshmallows
    this.floaters.forEach((f, i) => {
      const y = f.y + Math.sin(this.clock * 1.4 + f.ph) * 6;
      if (f.x > 230 && f.x < W - 230 && y > GY - 20 && y < GY + ROWS * T + 20) return;   // hidden under cookies anyway
      g.save(); g.translate(f.x, y);
      g.strokeStyle = i % 2 ? '#ffb1d2' : '#f2c46b'; g.lineWidth = f.r * 0.55; g.beginPath(); g.arc(0, 0, f.r * 0.8, 0, TAU); g.stroke();
      g.restore();
    });
    // ripples on the milk
    for (const r of this.ripples) {
      if (r.t < 0) continue;
      const k = r.t / (r.small ? 0.7 : 1.1);
      if (k >= 1) continue;
      g.save(); g.globalAlpha = (1 - k) * 0.85; g.strokeStyle = '#ffffff'; g.lineWidth = r.small ? 4 : 8 * (1 - k) + 2;
      g.beginPath(); g.ellipse(r.x, r.y + 10, (r.small ? 20 : 30) + k * (r.small ? 40 : 110), ((r.small ? 20 : 30) + k * (r.small ? 40 : 110)) * 0.55, 0, 0, TAU); g.stroke(); g.restore();
    }
    // shadows + cookies
    const cookieArt = !!art(COOKIE_ART[0]);
    for (const t of this.tiles) {
      if (t.state === 'fallen') continue;
      g.fillStyle = 'rgba(90,130,180,0.28)';
      if (cookieArt) { g.beginPath(); g.ellipse(t.x + 6, t.y + 12, ART_SIZE / 2, ART_SIZE / 2 - 4, 0, 0, TAU); g.fill(); }
      else { ui.roundRect(g, t.x - FACE / 2 + 6, t.y - FACE / 2 + 14, FACE, FACE, 40); g.fill(); }
    }
    for (const t of this.tiles) if (t.state !== 'fallen') this.drawTile(g, t);
    for (const f of this.fallers) {
      const k = f.t / 0.7;
      g.save(); g.translate(f.x, f.y + k * 40); g.rotate(f.rot * k * 3); g.scale(1 - k * 0.45, 1 - k * 0.45); g.globalAlpha = 1 - k * k;
      if (drawArt(g, cookieArtKey(f.type, 3), 0, 0, ART_SIZE, ART_SIZE)) { if (cookieArtCracks(f.type, 3)) this.drawCracks(g, f.crack, 3, 1); }
      else { const sp = this.sprites[f.type][f.v]; g.drawImage(sp, -sp.width / 2, -sp.width / 2 - 2); this.drawCracks(g, f.crack, 3, 1); }
      g.restore();
    }
    // characters sorted by depth; swimmers are clipped at the waterline
    const order = this.ps.map((s, i) => i).sort((a, b) => this.ps[a].y - this.ps[b].y);
    for (const i of order) this.drawActor(g, i);
    // tags
    this.ps.forEach((s, i) => {
      if (s.state === 'play') ui.playerTag(g, this.players[i], s.x, s.y - s.a.height - 22 - s.z * 0.6);
    });
  }

  drawWaves(g) {
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 5;
    for (let k = 0; k < 10; k++) {
      const y = 150 + k * 90;
      g.beginPath();
      for (let x = 230; x <= W - 230; x += 24) {
        const yy = y + Math.sin(x * 0.012 + this.clock * 1.2 + k) * 7;
        x === 230 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.stroke();
    }
    g.restore();
  }

  drawCracks(g, variant, stage, alpha) {
    if (stage <= 0) return;
    const n = CRACK_STAGES[stage - 1];
    const set = CRACKS[variant];
    const sc = FACE / 2 - 8;
    g.save(); g.globalAlpha = alpha; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? '#2a1507' : 'rgba(255,240,200,0.55)'; g.lineWidth = pass ? 6 : 9;
      g.translate(pass ? 0 : 0, 0);
      for (let k = 0; k < n; k++) {
        const pl = set[k];
        g.beginPath();
        pl.forEach(([x, y], j) => (j ? g.lineTo(x * sc, y * sc - 2) : g.moveTo(x * sc, y * sc - 2)));
        g.stroke();
      }
    }
    g.restore();
  }

  drawTile(g, t) {
    const sp = this.sprites[t.type][t.var];
    let ox = 0, oy = 0;
    if (t.shake > 0) { ox = Math.sin(this.clock * 70 + t.c * 3) * 3.5 * t.shake; oy = Math.cos(this.clock * 63 + t.r) * 2.5 * t.shake; }
    g.save(); g.translate(t.x + ox, t.y + oy);
    const stage = t.state === 'cracking' ? t.stage : 0;
    const isArt = drawArt(g, cookieArtKey(t.type, stage), 0, 0, ART_SIZE, ART_SIZE);
    // round tint for the art, the squircle for the procedural sprite
    const face = isArt ? () => { g.beginPath(); g.ellipse(0, 0, ART_SIZE / 2 - 6, ART_SIZE / 2 - 7, 0, 0, TAU); } : () => ui.roundRect(g, -FACE / 2 + 4, -FACE / 2 + 2, FACE - 8, FACE - 8, 36);
    if (!isArt) g.drawImage(sp, -sp.width / 2, -sp.width / 2 - 2);
    if (t.stepped && stage < 3) { g.fillStyle = 'rgba(80,40,10,0.13)'; face(); g.fill(); }
    if (stage > 0) {
      if (!isArt || cookieArtCracks(t.type, stage)) this.drawCracks(g, t.crack, stage, 1);
      if (stage === 3 && (!isArt || t.type !== 0)) { g.fillStyle = `rgba(255,255,255,${0.15 + 0.15 * Math.sin(this.clock * 30)})`; face(); g.fill(); }
    }
    g.restore();
  }

  drawActor(g, i) {
    const s = this.ps[i], p = this.players[i], a = s.a;
    if (s.state === 'swim') {
      const sw = s.swim;
      // ripples around the swimmer
      g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = 6;
      const k = (this.clock * 1.4) % 1;
      g.globalAlpha = 0.9 - k * 0.6; g.beginPath(); g.ellipse(s.x, s.y + 4, 44 + k * 26, 18 + k * 10, 0, 0, TAU); g.stroke();
      g.globalAlpha = 0.9; g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(s.x, s.y + 4, 44, 17, 0, 0, TAU); g.fill();
      g.restore();
      g.save(); g.beginPath(); g.rect(s.x - 300, s.y - 400, 600, 400); g.clip();
      a.draw(g, { shadow: false });
      g.restore();
      // milk lip over the body
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.ellipse(s.x, s.y + 2, 40, 12, 0, 0, Math.PI); g.stroke(); g.restore();
    } else {
      a.draw(g, { ring: p.color });
    }
  }

  /** Screen-space HUD (drawn by the host after the camera). */
  drawHUD(g) {
    const left = this.aliveCount();
    const timeLeft = Math.max(0, TIME_LIMIT - this.t);
    ui.timer(g, timeLeft, W / 2, 60);
    ui.text(g, this.n === 1 ? 'Stay on the cookies!' : `${left} left`, W / 2, 128, { size: 34, color: '#ffffff', strokeWidth: 8 });
    const vals = this.ps.map((s) => (s.state === 'play' ? 1 : 0));
    ui.scoreboard(g, this.players, vals, { y: 996, format: (v) => (v ? 'In!' : 'Out'), out: vals.map((v) => !v) });
    if (this.msg) ui.banner(g, this.msg.text, this.msg.t, { y: 120 + 420, size: 80, color: '#ffffff', strokeWidth: 18 });
    if (this.ended && this.endT < 1.4) {
      // winner text handled by pop text; nothing else
    }
  }
}
