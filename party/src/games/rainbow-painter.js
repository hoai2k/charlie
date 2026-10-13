// Rainbow Painter (Molly Party, cooperative): the world has gone grey and the
// sun has fallen asleep. Everyone zooms around on a little paint cloud and
// holds A to rain colour below it. Paint the giant rainbow band by band
// (colours are picked automatically), then the trees, the castle and the
// flower bed, and finally the sleepy sun, who wakes up with a huge grin.
// Painted things come alive: birds sing, flowers dance, the castle sets off
// fireworks. A golden Paint Star bounces around: grab it for a MEGA SPLASH.
//
// Art hooks (all optional, procedural fallbacks ship today):
//   bg/rainbow-painter  bg/rainbow-painter-color  prop/rp-cloud
//   prop/rp-tree(-grey)  prop/rp-castle(-grey)  prop/rp-flower-1..3  prop/rp-flower-grey
//   prop/rp-sun-grey  prop/rp-sun-sleep  prop/rp-sun-awake  prop/rp-bird(-flap)
// Sounds (optional files, synth/manifest fallbacks): rp-spray rp-band rp-alive
//   rp-bird rp-splash rp-boing rp-sun-wake rp-snore rp-firework rp-star rp-party
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { drawSparkleShape, drawStarShape, drawHeartShape } from '../engine/emotes.js';
import { clamp, approach, lerp, rand, pick, chance, ease, TAU, later } from '../engine/util.js';
import { drawRainbowIcon } from './rainbow-painter/icon.js';

const NAVY = '#24163f';
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export const meta = {
  id: 'rainbow-painter',
  title: 'Rainbow Painter',
  category: 'molly',
  type: 'Team paint',
  goal: 'Fly your paint cloud and colour in the whole grey world together!',
  controls: [['stick', 'Fly your cloud'], ['a', 'Hold to rain paint']],
  tips: ['Rain paint on the grey rainbow: the sparkly stripe is a good place to start!', 'Grab the golden Paint Star for a MEGA SPLASH!', 'Paint the sleepy sun last to wake him up.'],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) { drawRainbowIcon(g, x, y, w, h, t || 0); },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 66;
const GROUND = 892;
const RC = { x: 960, y: 1040 };           // rainbow centre
const R_OUT = 770, BAND = 54;
const BAND_COLS = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#4fd36a', '#3fa7ff', '#9b5cff'];
const DROP = 105;                          // paint lands this far under the cloud
const SPRAY_BASE = 108;
let SPRAY_R = SPRAY_BASE;   // grows for small parties (set per game)
const MAXV = 760, ACCEL = 3600;
const Y_MIN = 235, Y_MAX = 880;
const SUN = { x: 1730, y: 318, r: 112 };
const SUN_ART = SUN.r * 2.1;              // face disk ~ SUN.r, so the rays show round it
const TREES = [{ x: 235, s: 0.95 }, { x: 1685, s: 0.95 }];
const CASTLE = { x: 960, s: 0.68 };
const FLOWERS = [470, 600, 730, 1190, 1320, 1450].map((x, i) => ({ x, kind: i % 3, s: 0.95 + (i % 2) * 0.1 }));

// --- colour helpers ---------------------------------------------------------
const greyCache = new Map();
function grey(hex) {
  let v = greyCache.get(hex);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const l = 0.3 * r + 0.59 * gg + 0.11 * b;
  const k = Math.round(118 + l * 0.42);
  v = `rgb(${k},${k},${k + 6})`;
  greyCache.set(hex, v);
  return v;
}
const COL = (h) => h;
const GREY = (h) => grey(h);
function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, k));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

// --- targets ----------------------------------------------------------------
let cellSeed = 0;
function cellsFromShapes(ox, oy, s, shapes, sp = 50) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const sh of shapes) {
    if (sh.c) { x0 = Math.min(x0, sh.c[0] - sh.c[2]); x1 = Math.max(x1, sh.c[0] + sh.c[2]); y0 = Math.min(y0, sh.c[1] - sh.c[2]); y1 = Math.max(y1, sh.c[1] + sh.c[2]); }
    else { x0 = Math.min(x0, sh.r[0]); x1 = Math.max(x1, sh.r[0] + sh.r[2]); y0 = Math.min(y0, sh.r[1]); y1 = Math.max(y1, sh.r[1] + sh.r[3]); }
  }
  const step = sp / s;
  const cells = [];
  for (let y = y0 + step * 0.4; y <= y1; y += step) {
    for (let x = x0 + step * 0.4; x <= x1; x += step) {
      const inside = shapes.some((sh) => (sh.c ? Math.hypot(x - sh.c[0], y - sh.c[1]) <= sh.c[2] + step * 0.2 : x >= sh.r[0] - step * 0.2 && x <= sh.r[0] + sh.r[2] + step * 0.2 && y >= sh.r[1] - step * 0.2 && y <= sh.r[1] + sh.r[3] + step * 0.2));
      if (inside) cells.push(mkCell(ox + x * s, oy + y * s, sp * 0.82));
    }
  }
  return cells;
}
function mkCell(x, y, r) {
  const sd = cellSeed++;
  return { x, y, r, f: 0, sd, ox: Math.sin(sd * 12.9) * r * 0.35, oy: Math.cos(sd * 7.3) * r * 0.35, rot: sd * 1.7 };
}
const TREE_SHAPES = [{ c: [0, -255, 125] }, { c: [-88, -195, 82] }, { c: [88, -195, 82] }, { r: [-24, -175, 48, 175] }];
const CASTLE_SHAPES = [{ r: [-175, -235, 350, 235] }, { r: [-215, -305, 90, 305] }, { r: [125, -305, 90, 305] }, { r: [-60, -340, 120, 110] }, { c: [-170, -350, 48] }, { c: [170, -350, 48] }, { c: [0, -395, 50] }];
const FLOWER_SHAPES = [{ c: [0, -120, 44] }, { r: [-14, -85, 28, 85] }];

// ============================================================================
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.started = false;
    this.timeLeft = DURATION;
    this.scale = n <= 2 ? 0.86 : n <= 4 ? 0.8 : n <= 6 ? 0.72 : 0.66;
    // fill speed: fewer painters paint faster so a solo round still finishes
    this.fillRate = 6.5 / Math.pow(n, 0.62);
    SPRAY_R = SPRAY_BASE * (n === 1 ? 1.4 : n === 2 ? 1.2 : n === 3 ? 1.08 : 1);
    this.phase = 'rainbow';  // rainbow -> world -> sun -> party (or magic on time-out)
    this.phaseT = 0;
    this.bandIdx = 0;
    this.splats = [];
    this.birds = [];
    this.star = null; this.starT = 6;
    this.sprayGate = 0; this.blobGate = 0; this.blobStep = 0;
    this.bumpGate = 0;
    this.snoreT = 2;
    this.fireT = 0;
    this.partyT = 0;
    this.finished = false;
    this.banner = null;
    this.sunWake = 0;       // 0 asleep .. 1 fully awake (animates)
    this.sunLook = 0;
    this.colorK = 0;        // world colour fade 0..1
    this.buildTargets();
    this.bgClouds = Array.from({ length: 6 }, (_, i) => ({ x: rand(W), y: 120 + (i % 3) * 110 + rand(-20, 20), s: rand(0.7, 1.15), v: rand(10, 24) }));
    this.ents = this.players.map((p, i) => {
      const a = new Actor(p, { scale: this.scale });
      // tiny avatars (garden fairies) get scaled up so they read on the cloud
      const minH = 145 * this.scale;
      if (a.height < minH) a.scale *= minH / a.height;
      const x = n === 1 ? W / 2 : 260 + ((W - 520) * i) / (n - 1);
      const y = 430 + (i % 2) * 120;
      a.facing = x < W / 2 ? 1 : -1;
      const e = { p, a, i, x, y, vx: 0, vy: 0, spraying: false, sprayT: 0, score: 0, brain: new Brain(p), tx: x, ty: y, cell: null, wander: 0, holdOff: 0, tilt: 0, sq: 0, bob: rand(TAU), popN: 0, popT: 0, combo: 0, comboT: 0 };
      this.placeActor(e);
      a.snap && a.snap();
      return e;
    });
    this.cloudW = 200 * clamp(this.scale / 0.8, 0.8, 1.1);
    this.ents.forEach((e) => { e.cw = Math.max(Math.min(this.cloudW, e.a.height * 1.75), e.a.width * 1.15, 150); });
  }

  buildTargets() {
    this.bands = BAND_COLS.map((col, i) => {
      const rm = R_OUT - BAND * (i + 0.5);
      const cells = [];
      const nCells = Math.round((Math.PI * rm) / (BAND * 1.05));
      for (let k = 0; k <= nCells; k++) {
        const ang = Math.PI + (k / nCells) * Math.PI;
        const x = RC.x + Math.cos(ang) * rm, y = RC.y + Math.sin(ang) * rm;
        if (y < GROUND - 18) cells.push(mkCell(x, y, BAND * 0.9));
      }
      return { kind: 'band', i, col, rm, cells, prog: 0, done: false, alive: 0 };
    });
    this.trees = TREES.map((tr) => ({ kind: 'tree', x: tr.x, y: GROUND + 12, s: tr.s, cells: cellsFromShapes(tr.x, GROUND + 12, tr.s, TREE_SHAPES, 52), prog: 0, done: false, alive: 0, sway: 0 }));
    this.castle = { kind: 'castle', x: CASTLE.x, y: GROUND + 6, s: CASTLE.s, cells: cellsFromShapes(CASTLE.x, GROUND + 6, CASTLE.s, CASTLE_SHAPES, 54), prog: 0, done: false, alive: 0 };
    this.flowerBed = { kind: 'flowers', cells: [], prog: 0, done: false, alive: 0 };
    for (const f of FLOWERS) { f.y = GROUND + 78; this.flowerBed.cells.push(...cellsFromShapes(f.x, f.y, f.s, FLOWER_SHAPES, 44)); }
    this.sun = { kind: 'sun', cells: cellsFromShapes(SUN.x, SUN.y, 1, [{ c: [0, 0, SUN.r] }], 52), prog: 0, done: false, alive: 0 };
    this.world = [...this.trees, this.castle, this.flowerBed];
    this.all = [...this.bands, ...this.world, this.sun];
    this.totalCells = this.all.reduce((s, t) => s + t.cells.length, 0);
  }

  activeTargets() {
    if (this.phase === 'rainbow') return this.bands.filter((b) => !b.done);
    if (this.phase === 'world') return this.world.filter((t) => !t.done);
    if (this.phase === 'sun') return this.sun.done ? [] : [this.sun];
    return [];
  }

  placeActor(e) {
    const a = e.a;
    a.x = e.x; a.y = e.y - 20 + Math.sin(this.t * 2.4 + e.bob) * 4; a.z = 0;
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    this.ambient(dt);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    if (!this.started) { this.started = true; this.startT = this.t - dt; this.banner = { text: 'Paint the rainbow!', t: 0 }; }
    this.phaseT += dt;
    const playing = this.phase === 'rainbow' || this.phase === 'world' || this.phase === 'sun';
    if (playing) this.timeLeft = Math.max(0, DURATION - (this.t - this.startT));
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.2) this.banner = null; }
    this.ambient(dt);

    for (const e of this.ents) {
      if (e.p.isAI && playing) this.aiThink(e, dt);
      this.moveCloud(e, dt, playing);
    }
    this.bumpClouds(dt);
    if (playing) this.paint(dt);
    this.updateStar(dt, playing);
    this.updateSplats(dt);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }

    if (playing) this.checkProgress();
    if (playing && this.timeLeft <= 0) this.startMagic();
    if (this.phase === 'magic') this.updateMagic(dt);
    if (this.phase === 'party') this.updateParty(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    this.ambient(dt);
    this.updateParty(dt, true);
    for (const e of this.ents) { this.moveCloud(e, dt, false); this.placeActor(e); e.a.update(dt); }
    this.updateSplats(dt);
  }

  ambient(dt) {
    for (const c of this.bgClouds) { c.x += c.v * dt; if (c.x > W + 220) c.x = -220; }
    for (const t of this.all) if (t.done) t.alive += dt;
    const painted = this.all.reduce((s, t) => s + t.cells.reduce((q, c) => q + Math.min(1, c.f), 0), 0);
    this.colorK = approach(this.colorK, painted / this.totalCells, dt * 0.8);
    this.bumpGate -= dt; this.sprayGate -= dt; this.blobGate -= dt;
    // sun
    const wantWake = this.sun.done ? 1 : 0;
    this.sunWake = approach(this.sunWake, wantWake, dt * 1.6);
    if (!this.sun.done) {
      this.snoreT -= dt;
      if (this.snoreT <= 0) { this.snoreT = 3.2; snd('rp-snore', 'snore', { vol: 0.45 }); particles.burst(SUN.x - 90, SUN.y - 90, { type: 'note', count: 1, colors: ['#b9b6c8'], speed: [20, 40], angle: -2.3, spread: 0.2, size: [26, 30], gravity: -20 }); }
    }
    // birds (from painted trees)
    for (const b of this.birds) {
      b.t += dt;
      b.x = b.cx + Math.cos(b.t * b.w + b.ph) * b.rx;
      b.y = b.cy + Math.sin(b.t * b.w * 1.3 + b.ph) * b.ry;
      b.chirp -= dt;
      if (b.chirp <= 0) {
        b.chirp = rand(1.4, 3);
        if (this.phase !== 'party' || chance(0.4)) { snd('rp-bird', null, { vol: 0.35 }); if (!hasSound('rp-bird')) { sfx('note', { midi: 91 + (b.id % 3) * 2, dur: 0.07, vol: 0.12 }); later(() => sfx('note', { midi: 96, dur: 0.07, vol: 0.1 }), 80); } }
        particles.burst(b.x, b.y - 20, { type: 'note', count: 1, colors: ['#ff6fd0', '#3fa7ff', '#ffd23f'], speed: [30, 60], angle: -1.57, spread: 0.6, size: [24, 30], gravity: -30 });
      }
    }
    // castle fireworks once painted
    if (this.castle.done) {
      this.fireT -= dt;
      if (this.fireT <= 0) {
        this.fireT = this.phase === 'party' ? rand(0.35, 0.6) : rand(1.6, 2.4);
        const fxp = this.castle.x + pick([-170, 170, 0]) * this.castle.s, fy = rand(260, 420);
        particles.burst(fxp, fy, { type: pick(['star', 'sparkle', 'heart']), count: 16, colors: RAINBOW, speed: [120, 300], gravity: 120 });
        particles.ring(fxp, fy, pick(RAINBOW), 120, 0.45);
        snd('rp-firework', 'petal-firework', { vol: 0.35 });
      }
    }
  }

  moveCloud(e, dt, playing) {
    const c = e.p.ctrl;
    const ix = playing ? c.x : 0, iy = playing ? c.y : 0;
    const len = Math.hypot(ix, iy), k = len > 1 ? 1 / len : 1;
    const tvx = ix * k * MAXV, tvy = iy * k * MAXV;
    e.vx = approach(e.vx, tvx, ACCEL * dt);
    e.vy = approach(e.vy, tvy, ACCEL * dt);
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.x < 90) { e.x = 90; e.vx = Math.abs(e.vx) * 0.4; }
    if (e.x > W - 90) { e.x = W - 90; e.vx = -Math.abs(e.vx) * 0.4; }
    if (e.y < Y_MIN) { e.y = Y_MIN; e.vy = Math.abs(e.vy) * 0.4; }
    if (e.y > Y_MAX) { e.y = Y_MAX; e.vy = -Math.abs(e.vy) * 0.4; }
    e.tilt = approach(e.tilt, clamp(e.vx / MAXV, -1, 1) * 0.16, dt * 1.8);
    e.sq = approach(e.sq, 0, dt * 2);
    e.popT = Math.max(0, e.popT - dt);
    e.comboT = Math.max(0, e.comboT - dt); if (e.comboT <= 0) e.combo = 0;
    const a = e.a;
    if (Math.abs(e.vx) > 40) a.facing = e.vx > 0 ? 1 : -1;
    const was = e.spraying;
    e.spraying = playing && c.held('a');
    if (e.spraying && !was) { a.squash(0.15); }
    if (!a._once) {
      if (this.phase === 'party') a.setPose(e.i % 2 ? 'dance' : 'celebrate');
      else a.setPose(e.spraying ? 'paint' : 'idle');
    }
    if (e.spraying) {
      e.sprayT += dt;
      // falling paint drops
      const col = this.sprayColor(e);
      if (Math.random() < dt * 40) particles.burst(e.x + rand(-e.cw * 0.3, e.cw * 0.3), e.y + 30, { type: 'drop', count: 1, colors: col, speed: [380, 520], angle: Math.PI / 2, spread: 0.12, life: [0.18, 0.24], size: [9, 13], gravity: 900 });
      if (this.sprayGate <= 0) { this.sprayGate = 0.16; snd('rp-spray', 'brush', { vol: 0.22, rate: rand(0.9, 1.15) }); }
      if (Math.random() < dt * 9) this.addSplat(e.x + rand(-60, 60), e.y + DROP + rand(-50, 50), pick(col));
    }
  }

  sprayColor(e) {
    if (this.phase === 'rainbow') {
      const r = Math.hypot(e.x - RC.x, e.y + DROP - RC.y);
      const bi = Math.floor((R_OUT - r) / BAND);
      const b = this.bands[clamp(bi, 0, 5)];
      return [bi >= -1 && bi <= 6 && !b.done ? b.col : this.bands[this.bandIdx].col];
    }
    const px = e.x, py = e.y + DROP;
    for (const t of this.trees) if (Math.abs(px - t.x) < 180 && py > t.y - 400) return ['#4fd36a', '#2fb35a', '#ff4d6d'];
    if (Math.abs(px - this.castle.x) < 230 && py > GROUND - 360) return ['#ff9ccf', '#b58cff', '#7fd3ff'];
    if (py > GROUND - 20) return ['#ff6fd0', '#ffd23f', '#3fa7ff'];
    if (Math.hypot(px - SUN.x, py - SUN.y) < 200) return ['#ffd23f', '#ffb03f'];
    return RAINBOW;
  }

  addSplat(x, y, col) {
    if (this.splats.length > 140) this.splats.shift();
    this.splats.push({ x, y, col, r: rand(14, 30), t: 0, life: rand(1.4, 2.2), rot: rand(TAU), n: 5 + Math.floor(rand(0, 3)) });
  }
  updateSplats(dt) {
    for (const s of this.splats) s.t += dt;
    this.splats = this.splats.filter((s) => s.t < s.life);
  }

  bumpClouds(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy) || 1;
      const min = (A.cw + B.cw) * 0.42;
      if (d < min) {
        const nx = dx / d, ny = dy / d / 1.6, ov = min - d;
        A.x -= nx * ov * 0.5; B.x += nx * ov * 0.5; A.y -= ny * ov * 0.3; B.y += ny * ov * 0.3;
        const rel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
        if (rel > 0) {
          const imp = rel * 0.9 + 120;
          A.vx -= nx * imp; A.vy -= ny * imp; B.vx += nx * imp; B.vy += ny * imp;
          if (rel > 260 && this.bumpGate <= 0) {
            this.bumpGate = 0.18;
            A.sq = B.sq = 0.35; A.a.squash(0.25); B.a.squash(0.25);
            snd('rp-boing', 'boing', { vol: 0.5, rate: rand(0.95, 1.2) });
            particles.burst((A.x + B.x) / 2, (A.y + B.y) / 2, { type: 'sparkle', count: 6, colors: ['#ffffff', '#ffe066'] });
            if (chance(0.5)) A.a.playOnce('surprised', 0.35); else B.a.playOnce('surprised', 0.35);
          }
        }
      }
    }
  }

  // ------------------------------------------------------------- painting
  paint(dt) {
    const targets = this.activeTargets();
    if (!targets.length) return;
    for (const e of this.ents) {
      if (!e.spraying) continue;
      const px = e.x, py = e.y + DROP;
      const rate = this.fillRate * dt * (e.p.isAI ? 0.9 : 1.1);
      for (const t of targets) {
        if (t.done) continue;
        for (const c of t.cells) {
          if (c.f >= 1) continue;
          const d = Math.hypot(c.x - px, c.y - py);
          if (d > SPRAY_R + c.r * 0.35) continue;
          c.f += rate * (d < SPRAY_R * 0.6 ? 1.25 : 0.85);
          if (c.f >= 1) { c.f = 1; this.blob(e, c, t); }
        }
      }
    }
  }

  blob(e, c, t) {
    e.score++;
    e.combo++; e.comboT = 0.7;
    const col = t.kind === 'band' ? t.col : pick(RAINBOW);
    if (this.blobGate <= 0) {
      this.blobGate = 0.07;
      this.blobStep = (this.blobStep + 1) % 15;
      sfx('collect', { step: this.blobStep, vol: 0.32 });
    }
    particles.burst(c.x, c.y, { type: Math.random() < 0.5 ? 'sparkle' : 'spark', count: 2, colors: [col, '#ffffff'], speed: [60, 160], size: [10, 16] });
    if (e.combo === 6 || e.combo === 14 || e.combo === 24) {
      this.pop(e, e.combo >= 24 ? 'Super!' : e.combo >= 14 ? 'Wow!' : 'Splish!', pick(['#ffd23f', '#ff6fd0', '#6fe3ff']), 44);
      e.a.playOnce('cheer', 0.4); e.a.emote(pick(['heart', 'star', 'sparkle']), 0.8);
      if (!e.p.isAI) e.p.ctrl.rumble(0.25, 70);
    }
  }

  checkProgress() {
    for (const t of this.activeTargets()) {
      if (t.done) continue;
      let s = 0; for (const c of t.cells) s += Math.min(1, c.f);
      t.prog = s / t.cells.length;
      if (t.prog >= 0.86) this.complete(t);
    }
    if (this.phase === 'rainbow' && this.bands[this.bandIdx].done) {
      const next = this.bands.findIndex((b) => !b.done);
      if (next >= 0) { this.bandIdx = next; }
      else { this.phase = 'world'; this.phaseT = 0; this.banner = { text: 'Now colour the world!', t: 0 }; fx.slowmo && fx.slowmo(0.5, 0.6); }
    } else if (this.phase === 'world' && this.world.every((t) => t.done)) {
      this.phase = 'sun'; this.phaseT = 0; this.banner = { text: 'Wake up the sun!', t: 0 };
      snd('rp-band', 'golden-chime', { vol: 0.7 });
    } else if (this.phase === 'sun' && this.sun.done) {
      this.startParty();
    }
  }

  complete(t, quiet = false) {
    t.done = true; t.alive = 0;
    for (const c of t.cells) c.f = 1;
    if (t.kind === 'band') {
      const col = t.col, allDone = this.bands.every((b) => b.done);
      if (!quiet) {
        snd('rp-band', 'sparkle-beam', { vol: 0.7 }); sfx('sparkle');
        sfx('note', { midi: 72 + [0, 2, 4, 5, 7, 9][t.i], dur: 0.25, vol: 0.2 });
        later(() => sfx('note', { midi: 79 + [0, 2, 4, 5, 7, 9][t.i], dur: 0.35, vol: 0.18 }), 120);
        fx.shake(7, 0.2); fx.flash(col, 0.12);
        this.celebrateAll(allDone ? 'celebrate' : 'cheer');
        if (allDone) { this.api.camera && this.api.camera.punch(RC.x, 600, 1.12, 0.5); particles.confettiRain(W, 70); sfx('fanfare'); }
      }
      for (let k = 0; k < t.cells.length; k += 2) { const c = t.cells[k]; particles.burst(c.x, c.y, { type: 'star', count: 2, colors: [col, '#ffffff'], speed: [80, 240], size: [12, 20] }); }
      return;
    }
    if (!quiet) {
      snd('rp-alive', 'sm-alive', { vol: 0.7 }); sfx('magic');
      fx.shake(6, 0.2);
      this.celebrateAll('cheer');
    }
    const cx = t.cells.reduce((s, c) => s + c.x, 0) / t.cells.length, cy = t.cells.reduce((s, c) => s + c.y, 0) / t.cells.length;
    particles.burst(cx, cy, { type: 'star', count: 18, colors: RAINBOW, speed: [140, 360] });
    particles.ring(cx, cy, '#ffffff', 260, 0.5);
    if (t.kind === 'tree') {
      for (let k = 0; k < 2; k++) this.birds.push({ id: this.birds.length, cx: t.x + (k ? 40 : -40), cy: t.y - 300 * t.s, rx: rand(110, 170), ry: rand(40, 70), w: rand(1.1, 1.6) * (k ? -1 : 1), ph: rand(TAU), t: 0, x: t.x, y: t.y - 260, chirp: rand(0.2, 0.8), hue: k ? '#7fd3ff' : '#ff9ccf' });
      particles.popText(t.x, t.y - 470 * t.s, 'Tweet!', '#7fd3ff', 48);
    } else if (t.kind === 'castle') {
      this.fireT = 0.2; particles.popText(t.x, t.y - 430 * t.s, 'Ta-da!', '#ff6fd0', 54);
    } else if (t.kind === 'flowers') {
      for (const f of FLOWERS) particles.burst(f.x, f.y - 120, { type: 'heart', count: 3, colors: ['#ff6fd0', '#ff9ccf'], speed: [60, 160] });
      particles.popText(960, GROUND + 20, 'Dance!', '#ffd23f', 54);
    } else if (t.kind === 'sun') {
      snd('rp-sun-wake', 'win', { vol: 0.8 });
      fx.flash('#fff3b0', 0.3); fx.shake(12, 0.35); fx.slowmo && fx.slowmo(0.45, 0.8);
      this.api.camera && this.api.camera.punch(SUN.x - 200, SUN.y + 150, 1.25, 0.8);
      particles.burst(SUN.x, SUN.y, { type: 'star', count: 30, colors: ['#ffd23f', '#fff6a8', '#ff9f1c'], speed: [200, 520] });
      particles.popText(SUN.x - 60, SUN.y + 170, 'Good morning!', '#ffd23f', 52);
    }
  }

  celebrateAll(pose) {
    for (const e of this.ents) {
      e.a.playOnce(pose, pose === 'celebrate' ? 1.2 : 0.55);
      if (chance(0.35)) voice(e.p.charId, pick(['yay', 'woo']));
    }
  }

  // ------------------------------------------------------------ paint star
  updateStar(dt, playing) {
    if (!playing) { this.star = null; return; }
    if (!this.star) {
      this.starT -= dt;
      if (this.starT <= 0) {
        const fromLeft = chance(0.5);
        this.star = { x: fromLeft ? -60 : W + 60, y: rand(260, 640), vx: (fromLeft ? 1 : -1) * rand(230, 300), vy: rand(-120, 120), t: 0 };
        snd('rp-star', 'golden-chime', { vol: 0.5 });
      }
      return;
    }
    const s = this.star;
    s.t += dt;
    s.x += s.vx * dt; s.y += s.vy * dt + Math.sin(s.t * 4) * 60 * dt;
    if (s.y < 220 || s.y > 760) s.vy = -s.vy;
    if (s.t > 1.2 && (s.x < -80 || s.x > W + 80)) { this.star = null; this.starT = rand(6, 9); return; }
    if (Math.random() < dt * 20) particles.burst(s.x, s.y, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffd23f'], speed: [10, 60], size: [10, 18] });
    for (const e of this.ents) {
      if (Math.hypot(e.x - s.x, (e.y - 40) - s.y) < 120) { this.megaSplash(e); this.star = null; this.starT = rand(7, 10); return; }
    }
  }

  megaSplash(e) {
    const px = e.x, py = e.y + DROP;
    const R = 330;
    let got = 0;
    for (const t of this.activeTargets()) for (const c of t.cells) {
      if (c.f < 1 && Math.hypot(c.x - px, c.y - py) < R) { c.f = 1; got++; e.score++; }
    }
    // even when nothing is in reach, help the current thing along
    if (got < 6) {
      const pool = this.activeTargets().flatMap((t) => t.cells.filter((c) => c.f < 1));
      pool.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
      for (const c of pool.slice(0, 10)) { c.f = 1; e.score++; particles.burst(c.x, c.y, { type: 'star', count: 3, colors: RAINBOW }); }
    }
    snd('rp-splash', 'paint-splat-wet', { vol: 0.9 }); sfx('bigpop');
    fx.shake(14, 0.3); fx.flash('#fff6c0', 0.18); fx.hitstop && fx.hitstop(0.06);
    this.api.camera && this.api.camera.punch(px, py - 60, 1.18, 0.35);
    particles.burst(px, py, { type: 'drop', count: 40, colors: RAINBOW, speed: [300, 700], size: [12, 20], gravity: 600 });
    particles.burst(px, py, { type: 'star', count: 20, colors: ['#ffd23f', '#fff6a8'], speed: [200, 500] });
    particles.ring(px, py, '#ffd23f', R, 0.5);
    for (let k = 0; k < 18; k++) this.addSplat(px + rand(-R, R) * 0.8, py + rand(-R, R) * 0.6, pick(RAINBOW));
    particles.popText(px, e.y - e.a.height - 40, 'MEGA SPLASH!', '#ffd23f', 64);
    e.a.playOnce('celebrate', 0.9); e.a.emote('sparkle', 1.2); voice(e.p.charId, 'woo');
    if (!e.p.isAI) e.p.ctrl.rumble(0.8, 260);
  }

  // ------------------------------------------------------------- endings
  startMagic() {
    this.phase = 'magic'; this.phaseT = 0; this.magicQ = this.all.filter((t) => !t.done);
    this.banner = { text: 'Rainbow magic!', t: 0 };
    sfx('magic'); fx.flash('#ffffff', 0.2);
  }
  updateMagic(dt) {
    // quickly finish whatever is left, one thing after another, with a sparkle sweep
    this.magicT = (this.magicT || 0) - dt;
    if (this.magicT > 0) return;
    const t = this.magicQ.shift();
    if (!t) { this.startParty(); return; }
    this.magicT = 0.32;
    this.complete(t, t.kind !== 'sun');
    if (t.kind === 'band') sfx('note', { midi: 76 + t.i * 2, dur: 0.2, vol: 0.18 });
    else sfx('sparkle');
  }
  startParty() {
    if (this.phase === 'party') return;
    if (!this.sun.done) this.complete(this.sun);
    this.phase = 'party'; this.partyT = 0;
    this.banner = { text: 'Rainbow world!', t: 0 };
    particles.confettiRain(W, 140);
    sfx('cheer'); snd('rp-party', 'applause', { vol: 0.6 });
    for (const e of this.ents) { e.a.setPose(e.i % 2 ? 'dance' : 'celebrate'); voice(e.p.charId, 'yay'); }
  }
  updateParty(dt, post = false) {
    if (this.phase !== 'party') return;
    this.partyT += dt;
    if (Math.random() < dt * 3) particles.burst(rand(200, W - 200), rand(200, 600), { type: pick(['heart', 'star', 'sparkle']), count: 10, colors: RAINBOW, speed: [100, 260] });
    if (!post && !this.finished && this.partyT > 3.6) this.finish();
  }

  finish() {
    this.finished = true;
    const stats = this.ents.map((e) => `${e.score} splats`);
    const best = Math.max(...this.ents.map((e) => e.score));
    this.api.finish({ showcase: true, placements: this.ents.map(() => 1), highlight: null, stats, title: 'Rainbow world!', focus: { x: SUN.x - 300, y: 500 }, best });
  }

  // ------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl;
    const lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const speedCap = [0.62, 0.74, 0.86][lvl];
    if (e.brain.ready(dt)) {
      e.brain.wait(reactionTime(p) + [0.5, 0.25, 0.1][lvl]);
      e.holdOff = chance(prof.mistake * 0.9) ? rand(0.6, 1.4) : 0;   // daydreaming: forgets to hold A
      if (chance(prof.mistake * 0.8)) { e.wander = rand(0.8, 1.6); e.tx = rand(200, W - 200); e.ty = rand(Y_MIN + 40, Y_MAX - 60); e.cell = null; }
      else {
        // golden star nearby?
        const s = this.star;
        if (s && s.t > 0.6 && Math.hypot(s.x - e.x, s.y - e.y) < 520 && chance([0.25, 0.45, 0.6][lvl])) { e.cell = { star: true }; }
        else {
          let best = null, bs = Infinity;
          const px = e.x, py = e.y + DROP;
          for (const t of this.activeTargets()) for (const c of t.cells) {
            if (c.f >= 1) continue;
            let sc = Math.hypot(c.x - px, c.y - py) * rand(0.8, 1.25);
            if (t.kind === 'band' && t.i !== this.bandIdx) sc += 220;
            for (const o of this.ents) {
              if (o === e) continue;
              if (Math.hypot(o.x - c.x, o.y + DROP - c.y) < 220) sc += 260;
              if (o.cell && !o.cell.star && Math.hypot(o.cell.x - c.x, o.cell.y - c.y) < 300) sc += 500;
            }
            if (sc < bs) { bs = sc; best = c; }
          }
          e.cell = best;
        }
      }
    }
    let tx, ty;
    if (e.wander > 0) { e.wander -= dt; tx = e.tx; ty = e.ty; }
    else if (e.cell && e.cell.star && this.star) { tx = this.star.x; ty = this.star.y + 40; }
    else if (e.cell && !e.cell.star && e.cell.f < 1) { tx = e.cell.x + Math.sin(this.t * 2 + e.i) * 30; ty = e.cell.y - DROP; }
    else { e.cell = null; e.brain.wait(Math.min(e.brain.t, 0.15)); tx = e.x; ty = e.y; }
    ty = clamp(ty, Y_MIN, Y_MAX);
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    const wob = Math.sin(this.t * 2.5 + e.i * 1.7) * prof.aimError * 0.5;
    const ang = Math.atan2(dy, dx) + wob, k = clamp(d / 90, 0, 1) * speedCap;
    if (d < 6) ctrl.move(0, 0); else ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
    e.holdOff = Math.max(0, e.holdOff - dt);
    const near = e.cell && !e.cell.star && Math.hypot(e.cell.x - e.x, e.cell.y - (e.y + DROP)) < SPRAY_R * 1.1;
    ctrl.hold('a', !!(near && e.holdOff <= 0 && this.phase !== 'party'));
  }

  // ----------------------------------------------------------------- draw
  pop(e, str, color, size) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    particles.popText(e.x + (e.popN % 2 ? 40 : -40), e.y - e.a.height - 30 - (e.popN % 3) * 40, str, color, size);
  }

  draw(g) {
    this.drawSky(g);
    this.drawSun(g);
    // The painted backdrop has its own outlined clouds.
    if (!this.bgArt) for (const c of this.bgClouds) ui.cloud(g, c.x, c.y, c.s, mix('#dcdce4', '#ffffff', this.colorK), 0.75);
    this.drawRainbow(g);
    this.drawGround(g);
    for (const t of this.trees) this.drawTarget(g, t);
    this.drawTarget(g, this.castle);
    this.drawTarget(g, this.flowerBed);
    this.drawBirds(g);
    this.drawSplats(g);
    this.drawStar(g);
    this.drawReticles(g);
    const order = this.ents.slice().sort((a, b) => a.y - b.y);
    for (const e of order) this.drawRider(g, e);
    const showTags = this.t - (this.startT ?? this.t) < 5 || !this.started;
    for (const e of order) {
      const top = e.a.y - e.a.height - 22 - (e.a.emotes.length ? 52 : 0);
      if (showTags || !e.p.isAI) ui.playerTag(g, e.p, e.x, top);
    }
  }

  drawSky(g) {
    const k = this.colorK;
    const bg = art('bg/rainbow-painter');
    if (bg) {
      g.drawImage(bg, 0, 0, W, H);
      const bc = art('bg/rainbow-painter-color');
      if (bc && k > 0) { g.save(); g.globalAlpha = ease.inOutQuad(clamp(k, 0, 1)); g.drawImage(bc, 0, 0, W, H); g.restore(); }
      this.bgArt = true;
      return;
    }
    this.bgArt = false;
    const top = mix('#9b9aa8', '#6fc8ff', k), bot = mix('#d2d0d8', '#ffd9ee', k);
    ui.sky(g, top, bot, GROUND + 40);
    // a soft sun glow once the sun wakes
    if (this.sunWake > 0) {
      g.save(); g.globalAlpha = this.sunWake * 0.5;
      const gr = g.createRadialGradient(SUN.x, SUN.y, 40, SUN.x, SUN.y, 700);
      gr.addColorStop(0, '#fff3a0'); gr.addColorStop(1, 'rgba(255,243,160,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    }
  }

  drawGround(g) {
    const k = this.colorK;
    if (!this.bgArt) {
      ui.hills(g, GROUND - 40, mix('#b3b2bb', '#8fe39a', k), 30, 0.0036, 1.2);
      ui.hills(g, GROUND + 10, mix('#a19fab', '#5fcf73', k), 20, 0.0051, 3.1);
      g.fillStyle = mix('#8f8d99', '#49b85f', k); g.fillRect(0, GROUND + 70, W, H - GROUND - 70);
      // little tufts
      g.fillStyle = mix('#7f7d89', '#3a9d4f', k);
      for (let i = 0; i < 40; i++) { const x = (i * 157) % W, y = GROUND + 90 + (i * 53) % 90; g.beginPath(); g.ellipse(x, y, 14, 5, 0, 0, TAU); g.fill(); }
    }
    // rainbow feet: puffy clouds where it touches the ground (wide enough to
    // hide the clipped ends of the legs over the painted backdrop)
    for (const sx of [-1, 1]) {
      if (this.bgArt && drawArt(g, 'prop/rp-cloud', RC.x + sx * (R_OUT - BAND * 3), GROUND - 4, 390, 215)) continue;
      ui.cloud(g, RC.x + sx * (R_OUT - BAND * 3) - 40, GROUND - 6, 1.3, mix('#e4e4ea', '#ffffff', k), 0.95);
    }
  }

  drawRainbow(g) {
    g.save();
    // No procedural hills cover the legs on the painted backdrop: end them
    // under the feet clouds instead of on the HUD strip.
    if (this.bgArt) { g.beginPath(); g.rect(0, 0, W, GROUND + 20); g.clip(); }
    g.lineCap = 'butt';
    const active = this.phase === 'rainbow' ? this.bandIdx : -1;
    for (const b of this.bands) {
      // grey band
      g.lineWidth = BAND + 2;
      g.strokeStyle = grey(b.col);
      g.beginPath(); g.arc(RC.x, RC.y, b.rm, Math.PI, TAU); g.stroke();
      // painted part
      if (b.done) this.strokeBand(g, b, 1);
      else if (b.cells.some((c) => c.f > 0)) { g.save(); this.clipCells(g, b, 0.95); this.strokeBand(g, b, 1); g.restore(); }
    }
    // outline
    g.lineWidth = 5; g.strokeStyle = NAVY; g.globalAlpha = 0.85;
    g.beginPath(); g.arc(RC.x, RC.y, R_OUT, Math.PI, TAU); g.stroke();
    g.beginPath(); g.arc(RC.x, RC.y, R_OUT - BAND * 6, Math.PI, TAU); g.stroke();
    g.globalAlpha = 1;
    // the band to paint now shimmers
    if (active >= 0) {
      const b = this.bands[active];
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
      g.lineWidth = BAND * 0.92;
      g.globalAlpha = 0.18 + pulse * 0.22;
      g.strokeStyle = b.col;
      g.setLineDash([26, 18]); g.lineDashOffset = -this.t * 90;
      g.beginPath(); g.arc(RC.x, RC.y, b.rm, Math.PI, TAU); g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 0.5 + pulse * 0.5; g.lineWidth = 4; g.strokeStyle = '#ffffff';
      g.beginPath(); g.arc(RC.x, RC.y, b.rm + BAND / 2 - 2, Math.PI, TAU); g.stroke();
      g.beginPath(); g.arc(RC.x, RC.y, b.rm - BAND / 2 + 2, Math.PI, TAU); g.stroke();
      g.globalAlpha = 1;
      // sparkles running along the band
      for (let k = 0; k < 7; k++) {
        const ang = Math.PI + (((this.t * 0.09 + k / 7) % 1) * 0.84 + 0.08) * Math.PI;
        g.save(); g.translate(RC.x + Math.cos(ang) * b.rm, RC.y + Math.sin(ang) * b.rm);
        g.scale(0.6 + 0.4 * Math.sin(this.t * 7 + k), 0.6 + 0.4 * Math.sin(this.t * 7 + k));
        drawSparkleShape(g, 22, '#ffffff'); g.restore();
      }
    }
    // a happy shine across a finished rainbow
    if (this.bands[5].done) {
      g.globalAlpha = 0.25 + 0.1 * Math.sin(this.t * 3);
      g.lineWidth = 10; g.strokeStyle = '#ffffff';
      g.beginPath(); g.arc(RC.x, RC.y, R_OUT - 14, Math.PI * 1.15, Math.PI * 1.45); g.stroke();
    }
    g.restore();
  }

  strokeBand(g, b, alpha) {
    g.globalAlpha = alpha;
    g.lineWidth = BAND + 2; g.strokeStyle = b.col;
    g.beginPath(); g.arc(RC.x, RC.y, b.rm, Math.PI, TAU); g.stroke();
    g.lineWidth = BAND * 0.28; g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.beginPath(); g.arc(RC.x, RC.y, b.rm + BAND * 0.2, Math.PI, TAU); g.stroke();
    g.globalAlpha = 1;
  }

  /** Clip to the painted blobs of a target (blobby splat circles). */
  clipCells(g, t, mul = 1) {
    g.beginPath();
    for (const c of t.cells) {
      if (c.f <= 0) continue;
      const k = c.f >= 1 ? 1 : ease.outBack(clamp(c.f * 1.3, 0, 1));
      const r = c.r * k * mul;
      g.moveTo(c.x + r, c.y); g.arc(c.x, c.y, r, 0, TAU);
      const r2 = r * 0.55;
      g.moveTo(c.x + c.ox + r2, c.y + c.oy); g.arc(c.x + c.ox, c.y + c.oy, r2, 0, TAU);
      const r3 = r * 0.4;
      g.moveTo(c.x - c.oy + r3, c.y + c.ox); g.arc(c.x - c.oy, c.y + c.ox, r3, 0, TAU);
    }
    g.clip();
  }

  drawTarget(g, t) {
    const painted = t.done || t.cells.some((c) => c.f > 0);
    const activeNow = this.activeTargets().includes(t);
    const pulse = activeNow && !t.done ? 0.5 + 0.5 * Math.sin(this.t * 6) : 0;
    if (!t.done) this.drawThing(g, t, GREY, false, pulse);
    if (painted) {
      g.save();
      if (!t.done) this.clipCells(g, t, 1.05);
      this.drawThing(g, t, COL, true, 0);
      g.restore();
    }
  }

  /** Draw a world object in colour (pal = COL) or grey (pal = GREY). */
  drawThing(g, t, pal, color, pulse) {
    const alive = t.done ? t.alive : 0;
    const party = this.phase === 'party';
    if (t.kind === 'tree') {
      const sway = t.done ? Math.sin(this.t * 2.2 + t.x) * 0.04 : 0;
      g.save(); g.translate(t.x, t.y); g.rotate(sway); g.scale(t.s, t.s);
      if (pulse) glowHint(g, 0, -230, 190, pulse);
      if (!drawPaintArt(g, 'prop/rp-tree', 'prop/rp-tree-grey', color, 315, 400)) drawTree(g, pal, this.t, t.done && color);
      g.restore();
    } else if (t.kind === 'castle') {
      const bounce = t.done ? Math.abs(Math.sin(this.t * (party ? 6 : 2.5))) * (party ? 0.03 : 0.01) : 0;
      g.save(); g.translate(t.x, t.y); g.scale(t.s * (1 + bounce), t.s * (1 - bounce));
      if (pulse) glowHint(g, 0, -220, 260, pulse);
      if (!drawPaintArt(g, 'prop/rp-castle', 'prop/rp-castle-grey', color, 600, 565)) drawCastle(g, pal, this.t, t.done && color);
      else drawFlags(g, pal, this.t, t.done && color, true);
      g.restore();
    } else if (t.kind === 'flowers') {
      FLOWERS.forEach((f, i) => {
        const dance = t.done && color;
        const beat = dance ? Math.sin(this.t * (party ? 9 : 6) + i * 1.3) : 0;
        g.save(); g.translate(f.x, f.y); g.rotate(beat * 0.18); g.scale(f.s * (1 - Math.abs(beat) * 0.05), f.s * (1 + Math.abs(beat) * 0.07));
        if (pulse) glowHint(g, 0, -110, 80, pulse);
        // Tulips/bellflowers retain their own silhouette during the reveal.
        const key = color ? `prop/rp-flower-${f.kind + 1}` : 'prop/rp-flower-grey';
        const drawn = !color && f.kind === 0
          ? drawArt(g, key, 0, 0, 110 / 0.95, 143 / 0.95, { anchor: 'bottom' })
          : drawPaintArt(g, `prop/rp-flower-${f.kind + 1}`, 'prop/rp-flower-grey', color, 110 / 0.95, 143 / 0.95);
        if (!drawn) drawFlower(g, pal, f.kind, this.t + i, dance);
        g.restore();
      });
    }
  }

  drawSun(g) {
    const s = this.sun;
    const awake = this.sunWake;
    g.save(); g.translate(SUN.x, SUN.y);
    const breathe = 1 + Math.sin(this.t * (awake > 0.5 ? 4 : 1.4)) * (awake > 0.5 ? 0.04 : 0.025);
    g.scale(breathe, breathe);
    const pulse = this.phase === 'sun' && !s.done ? 0.5 + 0.5 * Math.sin(this.t * 6) : 0;
    if (pulse) glowHint(g, 0, 0, SUN.r + 60, pulse);
    // rays (spin once awake)
    const rays = (pal, k) => {
      g.save(); g.rotate(this.t * (0.15 + awake * 0.8));
      for (let i = 0; i < 12; i++) {
        g.rotate(TAU / 12);
        const L = SUN.r + 30 + 26 * k + (awake > 0 ? Math.sin(this.t * 6 + i) * 10 * awake : 0);
        g.beginPath(); g.moveTo(SUN.r - 6, -18); g.lineTo(L, 0); g.lineTo(SUN.r - 6, 18); g.closePath();
        g.fillStyle = pal('#ffb03f'); g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      }
      g.restore();
    };
    let greyArt = false;
    if (!s.done) {
      rays(GREY, 0);
      greyArt = drawArt(g, 'prop/rp-sun-grey', 0, 0, SUN_ART, SUN_ART);
      if (!greyArt) drawSunFace(g, GREY, this.t, 0, 0);
    }
    if (s.done || s.cells.some((c) => c.f > 0)) {
      g.save(); g.translate(-SUN.x, -SUN.y);
      if (!s.done) this.clipCells(g, s, 1.05);
      g.translate(SUN.x, SUN.y);
      rays(COL, awake);
      const key = awake > 0.35 ? 'prop/rp-sun-awake' : 'prop/rp-sun-sleep';
      if (!drawArt(g, key, 0, 0, SUN_ART, SUN_ART)) drawSunFace(g, COL, this.t, awake, s.prog);
      g.restore();
    }
    g.restore();
    if (!s.done && !greyArt) {
      // Zzz
      for (let k = 0; k < 3; k++) {
        const ph = (this.t * 0.5 + k / 3) % 1;
        ui.text(g, 'z', SUN.x - 110 - ph * 60, SUN.y - 70 - ph * 90, { size: 26 + k * 8, color: '#ffffff', alpha: Math.sin(ph * Math.PI), strokeWidth: 5 });
      }
    }
  }

  drawBirds(g) {
    for (const b of this.birds) {
      const flap = Math.sin(this.t * 18 + b.ph) > 0;
      const dir = Math.cos(b.t * b.w + b.ph) * -Math.sign(b.w) >= 0 ? -1 : 1;
      g.save(); g.translate(b.x, b.y); g.scale(dir, 1);
      if (!drawArt(g, flap ? 'prop/rp-bird-flap' : 'prop/rp-bird', 0, 0, 70, 70)) drawBird(g, b.hue, flap);
      g.restore();
    }
  }

  drawSplats(g) {
    for (const s of this.splats) {
      const k = s.t / s.life;
      g.save(); g.globalAlpha = (k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9) * 0.5;
      g.translate(s.x, s.y); g.rotate(s.rot);
      g.fillStyle = s.col;
      g.beginPath(); g.arc(0, 0, s.r, 0, TAU);
      for (let i = 0; i < s.n; i++) { const a = i * TAU / s.n; g.moveTo(Math.cos(a) * s.r * 1.4, Math.sin(a) * s.r * 1.4); g.arc(Math.cos(a) * s.r * 1.25, Math.sin(a) * s.r * 1.25, s.r * 0.3, 0, TAU); }
      g.fill();
      g.restore();
    }
  }

  drawStar(g) {
    const s = this.star;
    if (!s) return;
    g.save(); g.translate(s.x, s.y);
    const gr = g.createRadialGradient(0, 0, 10, 0, 0, 90);
    gr.addColorStop(0, 'rgba(255,240,140,0.8)'); gr.addColorStop(1, 'rgba(255,240,140,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 90, 0, TAU); g.fill();
    g.rotate(Math.sin(s.t * 5) * 0.3);
    const sc = 1 + Math.sin(s.t * 9) * 0.08; g.scale(sc, sc);
    if (!drawArt(g, 'prop/rp-paint-star', 0, 0, 110, 110)) {
      drawStarShape(g, 64, '#ffd23f');
      g.fillStyle = NAVY; g.beginPath(); g.arc(-12, -4, 5, 0, TAU); g.arc(12, -4, 5, 0, TAU); g.fill();
      g.strokeStyle = NAVY; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(0, 6, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    }
    g.restore();
  }

  drawReticles(g) {
    if (this.phase === 'party' || this.phase === 'magic') return;
    for (const e of this.ents) {
      const px = e.x, py = e.y + DROP;
      const col = e.spraying ? this.sprayColor(e)[0] : '#ffffff';
      g.save();
      g.globalAlpha = e.spraying ? 0.7 : 0.35;
      g.strokeStyle = e.p.color; g.lineWidth = 5;
      g.setLineDash([14, 10]); g.lineDashOffset = this.t * 40;
      g.beginPath(); g.ellipse(px, py, SPRAY_R * 0.8, SPRAY_R * 0.8, 0, 0, TAU); g.stroke();
      g.setLineDash([]);
      if (e.spraying) { g.globalAlpha = 0.22; g.fillStyle = col; g.beginPath(); g.arc(px, py, SPRAY_R * 0.8, 0, TAU); g.fill(); }
      g.restore();
    }
  }

  drawRider(g, e) {
    const a = e.a;
    const cy = e.y + Math.sin(this.t * 2.4 + e.bob) * 4;
    g.save();
    g.translate(e.x, cy); g.rotate(e.tilt); g.translate(-e.x, -cy);
    // character stands on the cloud; draw cloud last so feet sink in a little
    a.draw(g, { shadow: false });
    const w = e.cw, h = w * 0.55;
    g.save(); g.translate(e.x, cy + 10); g.scale(1 + e.sq * 0.25 + (e.spraying ? Math.sin(this.t * 30) * 0.02 : 0), 1 - e.sq * 0.25);
    if (!drawArt(g, 'prop/rp-cloud', 0, 0, w, h)) drawPaintCloud(g, w, h, e.p.color, e.spraying, this.t);
    else { g.fillStyle = e.p.color; g.globalAlpha = 0.9; ui.roundRect(g, -w * 0.3, h * 0.26, w * 0.6, 10, 5); g.fill(); }
    g.restore();
    g.restore();
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 14, avoidCenter: true, format: (v) => String(v) });
    this.drawChecklist(g);
    if (this.banner) {
      const k = this.banner.t;
      g.save(); g.globalAlpha = clamp(Math.min(k * 4, (2.2 - k) * 3), 0, 1);
      ui.banner(g, this.banner.text, k, { y: 470, size: 110, color: '#ffffff' });
      g.restore();
    }
  }

  drawChecklist(g) {
    const items = [...this.bands.map((b) => ({ t: b, icon: 'band' })), { t: this.trees, icon: 'tree' }, { t: [this.castle], icon: 'castle' }, { t: [this.flowerBed], icon: 'flower' }, { t: [this.sun], icon: 'sun' }];
    const sz = 62, gap = 10, total = items.length * (sz + gap) - gap;
    let x = W / 2 - total / 2;
    const y = H - 52;
    g.save();
    ui.panel(g, x - 18, y - sz / 2 - 10, total + 36, sz + 20, { r: 30, fill: 'rgba(255,255,255,0.85)' });
    items.forEach((it, i) => {
      const list = Array.isArray(it.t) ? it.t : [it.t];
      const done = list.every((t) => t.done);
      const cur = it.icon === 'band' ? this.phase === 'rainbow' && it.t.i === this.bandIdx : this.activeTargets().some((t) => list.includes(t));
      const cx = x + sz / 2;
      g.save(); g.translate(cx, y);
      if (cur) { const s = 1.12 + Math.sin(this.t * 8) * 0.08; g.scale(s, s); }
      g.beginPath(); g.arc(0, 0, sz / 2, 0, TAU); g.fillStyle = done ? '#fff7d6' : cur ? '#ffffff' : '#ecebf2'; g.fill();
      g.lineWidth = cur ? 5 : 3; g.strokeStyle = cur ? '#ff6fd0' : NAVY; g.stroke();
      const pal = done || cur ? COL : GREY;
      g.globalAlpha = done || cur ? 1 : 0.6;
      if (it.icon === 'band') {
        g.lineWidth = 12; g.strokeStyle = done ? it.t.col : cur ? it.t.col : grey(it.t.col);
        g.beginPath(); g.arc(0, 12, 20, Math.PI, TAU); g.stroke();
      } else if (it.icon === 'tree') { g.scale(0.15, 0.15); g.translate(0, 200); drawTree(g, pal, 0, false); }
      else if (it.icon === 'castle') { g.scale(0.11, 0.11); g.translate(0, 210); drawCastle(g, pal, 0, false); }
      else if (it.icon === 'flower') { g.scale(0.32, 0.32); g.translate(0, 95); drawFlower(g, pal, 0, 0, false); }
      else { g.scale(0.2, 0.2); drawSunFace(g, pal, this.t, done ? 1 : 0, 0); }
      g.restore();
      if (done) { g.save(); g.translate(cx + sz * 0.32, y - sz * 0.32); drawStarShape(g, 16, '#ffd23f'); g.restore(); }
      x += sz + gap;
    });
    g.restore();
  }
}

// ---------------------------------------------------------------- drawing kit

function glowHint(g, x, y, r, k) {
  g.save();
  const gr = g.createRadialGradient(x, y, r * 0.3, x, y, r);
  gr.addColorStop(0, `rgba(255,255,255,${0.35 * k})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.restore();
}

function outline(g, w = 5) { g.lineWidth = w; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke(); }

function drawTree(g, C, t, alive) {
  g.fillStyle = C('#a0612f');
  ui.roundRect(g, -24, -178, 48, 178, 14); g.fill(); outline(g);
  g.fillStyle = C('#4fcf6a');
  g.beginPath(); g.arc(-88, -195, 82, 0, TAU); g.arc(88, -195, 82, 0, TAU); g.arc(0, -255, 125, 0, TAU); g.fill();
  g.beginPath(); g.arc(-88, -195, 82, Math.PI * 0.55, Math.PI * 1.55); outline(g); g.beginPath(); g.arc(88, -195, 82, -Math.PI * 0.55, Math.PI * 0.45); outline(g);
  g.beginPath(); g.arc(0, -255, 125, Math.PI * 1.05, Math.PI * 1.95); outline(g);
  g.fillStyle = C('#7fe08f'); g.beginPath(); g.arc(-40, -300, 34, 0, TAU); g.fill();
  const apples = [[-60, -230], [50, -280], [90, -180], [-100, -170], [10, -190]];
  apples.forEach(([x, y], i) => {
    const b = alive ? Math.sin(t * 5 + i) * 4 : 0;
    g.fillStyle = C('#ff4d6d'); g.beginPath(); g.arc(x, y + b, 15, 0, TAU); g.fill(); outline(g, 3);
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(x - 5, y - 5 + b, 4, 0, TAU); g.fill();
  });
  if (alive) { // cheeky face in the leaves
    g.fillStyle = NAVY; g.beginPath(); g.arc(-26, -250, 8, 0, TAU); g.arc(26, -250, 8, 0, TAU); g.fill();
    g.lineWidth = 5; g.strokeStyle = NAVY; g.lineCap = 'round'; g.beginPath(); g.arc(0, -232, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,111,177,0.55)'; g.beginPath(); g.ellipse(-50, -228, 14, 8, 0, 0, TAU); g.ellipse(50, -228, 14, 8, 0, 0, TAU); g.fill();
  }
}

function drawPaintArt(g, colorKey, greyKey, color, w, h) {
  // A grayscale draw of the same raster makes splat reveals pixel aligned.
  // The authored grey images remain available when colour art is unavailable.
  if (!art(colorKey)) return drawArt(g, color ? colorKey : greyKey, 0, 0, w, h, { anchor: 'bottom' });
  g.save();
  if (!color) g.filter = 'grayscale(1)';
  const drawn = drawArt(g, colorKey, 0, 0, w, h, { anchor: 'bottom' });
  g.restore();
  return drawn;
}

function drawFlags(g, C, t, alive, generated = false) {
  // Accepted castle tips, measured in the full-canvas 600x565 draw box.
  const tips = generated ? [[-168, -489], [168, -489]] : [[-170, -420], [170, -420], [0, -470]];
  for (const [x, y] of tips) {
    g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x, y - 30); g.stroke();
    const wv = alive ? Math.sin(t * 8 + x) * 8 : 0;
    g.fillStyle = C(x === 0 ? '#ffd23f' : '#ff6fd0');
    g.beginPath(); g.moveTo(x, y - 30); g.quadraticCurveTo(x + 22, y - 30 + wv, x + 44, y - 20 + wv); g.quadraticCurveTo(x + 22, y - 10 + wv, x, y - 8); g.closePath(); g.fill(); outline(g, 3);
  }
}

function drawCastle(g, C, t, alive) {
  // towers
  for (const sx of [-1, 1]) {
    g.fillStyle = C('#ff9ccf'); ui.roundRect(g, sx * 170 - 45, -305, 90, 305, 8); g.fill(); outline(g);
    g.fillStyle = C('#b58cff'); g.beginPath(); g.moveTo(sx * 170 - 58, -300); g.lineTo(sx * 170, -400); g.lineTo(sx * 170 + 58, -300); g.closePath(); g.fill(); outline(g);
    g.fillStyle = C('#7fd3ff'); drawHeartAt(g, sx * 170, -230, 16);
  }
  // main wall
  g.fillStyle = C('#ffc2e0'); ui.roundRect(g, -150, -235, 300, 235, 10); g.fill(); outline(g);
  // battlements
  g.fillStyle = C('#ffc2e0');
  for (let i = 0; i < 5; i++) { ui.roundRect(g, -150 + i * 64, -262, 44, 34, 6); g.fill(); outline(g, 4); }
  // centre tower
  g.fillStyle = C('#ffb3d9'); ui.roundRect(g, -60, -345, 120, 120, 8); g.fill(); outline(g);
  g.fillStyle = C('#9b5cff'); g.beginPath(); g.moveTo(-74, -340); g.lineTo(0, -450); g.lineTo(74, -340); g.closePath(); g.fill(); outline(g);
  g.fillStyle = C('#ffd23f'); g.beginPath(); g.arc(0, -290, 26, 0, TAU); g.fill(); outline(g, 4);
  // door
  g.fillStyle = C('#c4743a'); g.beginPath(); g.moveTo(-48, 0); g.lineTo(-48, -80); g.arc(0, -80, 48, Math.PI, TAU); g.lineTo(48, 0); g.closePath(); g.fill(); outline(g);
  g.fillStyle = C('#ffd23f'); g.beginPath(); g.arc(28, -55, 6, 0, TAU); g.fill();
  // windows
  g.fillStyle = C('#7fd3ff');
  for (const x of [-100, 100]) drawHeartAt(g, x, -150, 20);
  if (alive) { g.save(); g.globalAlpha = 0.4 + 0.3 * Math.sin(t * 5); g.fillStyle = '#fff6a8'; for (const x of [-100, 100]) drawHeartAt(g, x, -150, 20); g.restore(); }
  drawFlags(g, C, t, alive);
}

function drawHeartAt(g, x, y, s) {
  g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(0, s * 0.9); g.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.6, -s * 1.2, 0, -s * 0.4); g.bezierCurveTo(s * 0.6, -s * 1.2, s * 1.4, -s * 0.1, 0, s * 0.9); g.closePath();
  g.fill(); outline(g, 3); g.restore();
}

const FLOWER_COLS = ['#ff6fd0', '#ffd23f', '#3fa7ff'];
function drawFlower(g, C, kind, t, dance) {
  g.strokeStyle = C('#3fae54'); g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(8, -50, 0, -100); g.stroke();
  g.fillStyle = C('#4fcf6a');
  for (const sx of [-1, 1]) { g.save(); g.translate(0, -45); g.rotate(sx * 0.7); g.beginPath(); g.ellipse(sx * 20, 0, 22, 10, 0, 0, TAU); g.fill(); outline(g, 3); g.restore(); }
  g.save(); g.translate(0, -120);
  const pc = C(FLOWER_COLS[kind]);
  g.fillStyle = pc;
  if (kind === 0) { for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * TAU / 8 + (dance ? t * 0.8 : 0)); g.beginPath(); g.ellipse(0, -30, 13, 22, 0, 0, TAU); g.fill(); outline(g, 3); g.restore(); } }
  else if (kind === 1) { g.beginPath(); g.moveTo(-34, -6); g.lineTo(-34, -40); g.lineTo(-16, -24); g.lineTo(0, -46); g.lineTo(16, -24); g.lineTo(34, -40); g.lineTo(34, -6); g.quadraticCurveTo(34, 34, 0, 34); g.quadraticCurveTo(-34, 34, -34, -6); g.fill(); outline(g, 4); }
  else { for (let i = 0; i < 5; i++) { g.save(); g.rotate(i * TAU / 5); g.beginPath(); g.arc(0, -26, 20, 0, TAU); g.fill(); outline(g, 3); g.restore(); } }
  g.fillStyle = C(kind === 1 ? '#fff3c4' : '#ffe066'); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); outline(g, 4);
  // face
  g.fillStyle = NAVY;
  if (dance) { g.beginPath(); g.arc(-8, -4, 4, 0, TAU); g.arc(8, -4, 4, 0, TAU); g.fill(); }
  else { g.lineWidth = 3; g.strokeStyle = NAVY; g.beginPath(); g.arc(-8, -4, 4, 0.1, Math.PI - 0.1); g.moveTo(12, -4); g.arc(8, -4, 4, 0.1, Math.PI - 0.1); g.stroke(); }
  g.lineWidth = 3; g.strokeStyle = NAVY; g.beginPath(); g.arc(0, 4, 7, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.restore();
}

function drawSunFace(g, C, t, awake, prog) {
  const R = SUN.r;
  g.fillStyle = C('#ffd23f'); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); outline(g, 6);
  g.fillStyle = C('#fff3a0'); g.beginPath(); g.ellipse(-40, -50, 30, 18, -0.5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,120,150,0.45)'; g.beginPath(); g.ellipse(-62, 26, 20, 12, 0, 0, TAU); g.ellipse(62, 26, 20, 12, 0, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 7; g.lineCap = 'round'; g.fillStyle = NAVY;
  if (awake > 0.35) {
    // big sparkly eyes and grin
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 38, -14, 15, 20 * Math.min(1, awake * 1.4), 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * 38 - 5, -21, 5, 0, TAU); g.fill(); g.fillStyle = NAVY; }
    g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(0, 22, 42, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(-26, 22, 52, 9);
  } else {
    // sleepy: closed eyes, peeking one eye open when half painted
    g.beginPath(); g.arc(-38, -14, 15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    if (prog > 0.5 && Math.sin(t * 3) > 0) { g.beginPath(); g.arc(38, -14, 12, 0, TAU); g.fill(); }
    else { g.beginPath(); g.arc(38, -14, 15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    const o = 8 + Math.sin(t * 1.4) * 4;
    g.beginPath(); g.ellipse(0, 34, 12, o, 0, 0, TAU); g.stroke();
  }
}

function drawBird(g, hue, flap) {
  g.fillStyle = hue; g.beginPath(); g.ellipse(0, 0, 26, 21, 0, 0, TAU); g.fill(); outline(g, 4);
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(4, 6, 14, 10, 0, 0, TAU); g.fill();
  g.fillStyle = hue; g.beginPath(); g.ellipse(-6, flap ? -16 : 8, 16, 9, flap ? -0.7 : 0.5, 0, TAU); g.fill(); outline(g, 3);
  g.fillStyle = '#ffb03f'; g.beginPath(); g.moveTo(24, -4); g.lineTo(38, 0); g.lineTo(24, 6); g.closePath(); g.fill(); outline(g, 3);
  g.fillStyle = NAVY; g.beginPath(); g.arc(12, -6, 4, 0, TAU); g.fill();
}

function drawPaintCloud(g, w, h, ring, spraying, t) {
  const s = w / 230;
  g.save(); g.scale(s, s);
  g.beginPath();
  g.arc(-70, 10, 42, 0, TAU); g.arc(-25, -12, 52, 0, TAU); g.arc(35, -8, 50, 0, TAU); g.arc(80, 12, 38, 0, TAU);
  g.moveTo(-90, 20); g.rect(-90, 10, 180, 42);
  g.fillStyle = '#ffffff'; g.fill();
  g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-70, 10, 38, 0, TAU); g.arc(-25, -12, 48, 0, TAU); g.arc(35, -8, 46, 0, TAU); g.arc(80, 12, 34, 0, TAU); g.rect(-86, 10, 172, 38); g.fill();
  g.fillStyle = '#e9e0ff'; ui.roundRect(g, -84, 30, 168, 20, 10); g.fill();
  // player colour band
  g.fillStyle = ring; ui.roundRect(g, -60, 34, 120, 12, 6); g.fill();
  // rainbow drips while spraying
  if (spraying) {
    for (let i = 0; i < 5; i++) {
      const x = -60 + i * 30, len = 10 + Math.abs(Math.sin(t * 12 + i)) * 14;
      g.fillStyle = RAINBOW[i % RAINBOW.length]; ui.roundRect(g, x - 6, 48, 12, len, 6); g.fill();
    }
  }
  g.restore();
}
