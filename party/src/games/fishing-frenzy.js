// Fishing Frenzy - everyone fishes in one sparkling pond. Aim the target ring
// with the stick, A to cast. Fish swim over and nibble (little dips: wait!),
// then BITE (big "!": press A!). Reel with A (or spin the stick) but ease off
// when the fish tugs or the line snaps. Most points in 60 s wins; the last
// 15 s are a FISH FRENZY with lots more fish.
import { W, H } from '../engine/canvas.js';
import { Actor, POSES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { playerName } from '../state.js';
import { aiProfile, reactionTime, mash } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, TAU, ease, placementsFromScores } from '../engine/util.js';
import {
  NAVY, POND, inPond, clampPond, edgeY, edgeX, pondDepth, hh, drawCatch, drawBobber, drawRod, drawBasket,
  drawLilyPad, drawFrog, drawPondBackground, buildBackground, buildDocks, drawIconArt, drawBang,
} from './fishing-frenzy/art.js';

const DURATION = 60;
const FRENZY_AT = 45;
const BITE_WIN = 0.85;          // seconds to press A after the "!"
const RING_SPEED = 900;
const SNAP_AT = 1;

// New sounds go through hasSound with a synth/manifest fallback (see report).
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

// Poses: 'reel' is a requested new pose (holding the rod, leaning back and
// cranking); until it is registered the game uses 'pump'.
const POSE = { cast: 'cast', reel: POSES.reel ? 'reel' : 'pump', tug: 'balance', catch: 'catch', snap: 'hurt' };

// Everything that can bite. pts = points; len = body length; notice = how far
// it spots a bobber; shy = spooked by a plop closer than this; nib = nibbles
// before the bite; pull = how hard it tugs while reeling; reel = A presses to land.
const KINDS = {
  sunny:  { pts: 2,  len: 60,  speed: 75, notice: 260, nib: [1, 2], pull: 0.35, reel: 7,  move: 'wander', w: 34, line: 'Gotcha!' },
  darty:  { pts: 3,  len: 64,  speed: 60, dart: 430, notice: 220, nib: [1, 2], pull: 0.55, reel: 8, move: 'dart', w: 22, line: 'Speedy!' },
  puffy:  { pts: 4,  len: 58,  speed: 48, notice: 280, shy: 95, nib: [1, 3], pull: 0.6, reel: 10, move: 'wander', w: 17, line: 'Puffy!' },
  bubba:  { pts: 6,  len: 100, speed: 40, notice: 240, nib: [1, 2], pull: 0.95, reel: 13, move: 'wander', w: 10, line: 'Big one!', big: true },
  golden: { pts: 12, len: 74,  speed: 95, dart: 380, notice: 240, shy: 85, nib: [2, 3], pull: 1.25, reel: 16, move: 'dart', w: 0, line: 'GOLDEN FISH!' },
  boot:   { pts: 0,  len: 60,  junk: true, snag: 62, reel: 4,  pull: 0, move: 'still', w: 7, max: 2, line: 'A boot?!' },
  duck:   { pts: 1,  len: 56,  junk: true, surface: true, snag: 50, speed: 26, reel: 4, pull: 0, move: 'drift', w: 5, max: 1, line: 'Squeak!' },
  chest:  { pts: 8,  len: 72,  junk: true, snag: 62, reel: 14, pull: 0, move: 'still', w: 3, max: 1, line: 'Treasure!' },
};
const SPAWN_KINDS = Object.keys(KINDS).filter((k) => k !== 'golden');

export const meta = {
  id: 'fishing-frenzy',
  title: 'Fishing Frenzy',
  category: 'party',
  type: 'Free-for-all',
  goal: 'Catch the most fish points in 60 seconds!',
  controls: [['stick', 'Aim your cast'], ['a', 'Cast / hook the fish / reel it in']],
  tips: [
    'Little dips are nibbles - WAIT for the big ! then press A!',
    'When the fish tugs, stop reeling or your line snaps!',
    'Big fish and golden fish are worth lots. Shy purple fish swim away from a splash!',
  ],
  music: 'chill',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) { drawIconArt(g, x, y, w, h, t); },
};

/** Player spots: the near shore first (left to right), then the sides. */
function layoutSlots(n) {
  const bottomN = n <= 4 ? n : (n === 5 || n === 7) ? 3 : 4;
  const sp = n <= 4 ? 360 : 300;
  const slots = [];
  for (let i = 0; i < bottomN; i++) {
    const x = W / 2 + (i - (bottomN - 1) / 2) * sp;
    slots.push({ x, y: 975, side: 0, shore: { x, y: edgeY(x) - 34 }, basket: { x: x + 104, y: 1022 } });
  }
  const sides = [[190, 470, -1], [1730, 470, 1], [280, 772, -1], [1640, 772, 1]];
  for (let i = 0; i < n - bottomN; i++) {
    const [x, y, side] = sides[i];
    slots.push({ x, y, side, shore: { x: edgeX(y, side) - side * 34, y }, basket: { x: x + side * 104, y: y + 30 } });
  }
  return slots;
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0; this.clock = 0;
    this.over = false;
    this.frenzy = false; this.frenzyT = -10;
    this.scale = this.n <= 4 ? 1 : 0.86;
    this.slots = layoutSlots(this.n);
    this.fish = []; this.fishId = 0;
    this.ripples = [];
    this.reveals = [];
    this.goldBanner = null;
    this.nextGolden = rand(14, 19);
    this.spawnT = 0;
    this.units = this.players.map((p, i) => this.makeUnit(p, i));
    this.bg = buildBackground();
    this.docks = buildDocks(this.slots, this.players.map((p) => p.color));
    this.pads = [[470, 470, 46, 0.4, true], [1450, 480, 52, 2.1, false], [1250, 700, 40, 4.2, true], [720, 400, 38, 1.1, false], [1640, 640, 34, 3.3, false], [300, 590, 34, 5.1, false]]
      .map(([x, y, r, rot, fl], i) => ({ x, y, r, rot, fl, ph: i * 1.7 }));
    this.frog = { pad: 1, blinkT: 2, puffT: 0, nextRibbit: rand(4, 8) };
    this.flies = [0, 1].map((i) => ({ ph: i * 3, cx: i ? 1300 : 640, cy: i ? 360 : 420, col: i ? '#5fd1ff' : '#ff6fb1' }));
    this.sparkles = Array.from({ length: 22 }, (_, i) => ({ a: hh(i * 3) * TAU, r: Math.sqrt(hh(i * 7 + 1)) * 0.9, ph: hh(i + 9) * TAU, sp: 1.5 + hh(i + 4) * 2 }));
    // start with a pond full of fish
    const start = this.targetCount();
    for (let i = 0; i < start; i++) this.spawn(null, true);
  }

  makeUnit(p, i) {
    const s = this.slots[i];
    const a = new Actor(p, { scale: this.scale, x: s.x, y: s.y });
    a.facing = s.side === 0 ? (s.x < POND.x ? 1 : -1) : -s.side;
    a.snap();
    const toC = Math.atan2(POND.y - s.shore.y, POND.x - s.shore.x);
    const ring = clampPond(s.shore.x + Math.cos(toC) * 200, s.shore.y + Math.sin(toC) * 140, 0.9);
    return {
      p, i, a, s, ring, state: 'aim', st: 0, score: 0, catches: [], fishN: 0,
      bob: null, fish: null, reel: null, rodAng: -1.0, rodBend: 0, basketPop: 0,
      spinLast: null, spinAcc: 0, hint: 0,
      ai: { target: null, retarget: 0, err: { x: 0, y: 0 }, settle: 0, aimT: 0, idle: 0, hookAt: -1, jumpAt: -1, ms: {}, pullSeenAt: -1, careless: false, pullId: -1 },
    };
  }

  // --- fish population --------------------------------------------------------------
  targetCount() { return Math.round((6 + this.n * 1.5) * (this.frenzy ? 1.7 : 1)); }

  spawn(kind, instant = false) {
    if (!kind) {
      const counts = {};
      for (const f of this.fish) counts[f.kind] = (counts[f.kind] || 0) + 1;
      const opts = SPAWN_KINDS.filter((k) => !KINDS[k].max || (counts[k] || 0) < KINDS[k].max);
      let tot = 0; for (const k of opts) tot += KINDS[k].w * (this.frenzy && !KINDS[k].junk ? 1.3 : 1);
      let r = rand(tot); kind = opts[0];
      for (const k of opts) { r -= KINDS[k].w * (this.frenzy && !KINDS[k].junk ? 1.3 : 1); if (r <= 0) { kind = k; break; } }
    }
    const K = KINDS[kind];
    // somewhere away from bobbers (and not right under a dock)
    let x = POND.x, y = POND.y;
    for (let k = 0; k < 20; k++) {
      const a = rand(TAU), r = Math.sqrt(rand(0.04, 1)) * (K.junk ? 0.72 : 0.8);
      x = POND.x + Math.cos(a) * POND.rx * r; y = POND.y + Math.sin(a) * POND.ry * r;
      if (this.units.every((U) => !U.bob || Math.hypot(U.bob.x - x, U.bob.y - y) > 170) && this.fish.every((f) => !f.K.junk || Math.hypot(f.x - x, f.y - y) > 120)) break;
    }
    const f = {
      id: this.fishId++, kind, K, x, y, vx: 0, vy: 0, tx: x, ty: y, face: chance(0.5) ? 1 : -1, tilt: 0,
      size: K.junk ? 1 : rand(0.88, 1.2), state: 'swim', st: 0, appear: instant ? 1 : 0, cool: instant ? 0 : 0.6,
      U: null, nibLeft: 0, nibT: 0, wait: rand(0.3, 1.2), scare: 0, t: rand(10), life: kind === 'golden' ? 15 : 0, fleeFrom: null,
    };
    if (kind === 'golden') f.size = 1;
    this.fish.push(f);
    if (!instant) {
      particles.burst(x, y, { type: 'bubble', count: kind === 'golden' ? 14 : 5, colors: ['#ffffff', '#c8f1ff'], speed: [20, 80] });
      if (kind === 'golden') {
        snd('golden-chime', 'magic');
        particles.burst(x, y - 20, { type: 'sparkle', count: 18, colors: ['#ffd23f', '#fff6a8', '#ffffff'], speed: [80, 300] });
        particles.popText(x, y - 60, 'Golden fish!', '#ffd23f', 52);
        this.ripple(x, y, '#fff3a0', 130, 1.0);
      }
    }
    return f;
  }

  ripple(x, y, color = '#ffffff', max = 70, life = 0.8) { this.ripples.push({ x, y, color, max, life, t: 0 }); }

  // --- frame --------------------------------------------------------------------------
  preUpdate(dt) {
    this.clock += dt;
    this.ambient(dt);
    for (const f of this.fish) this.moveFish(f, dt);
    for (const U of this.units) { U.a.setPose('idle'); this.animUnit(U, dt); U.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.clock += dt;
    const left = DURATION - this.t;
    if (!this.frenzy && this.t >= FRENZY_AT) this.startFrenzy();
    // population
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.fish.filter((f) => f.kind !== 'golden').length < this.targetCount()) { this.spawn(); this.spawnT = this.frenzy ? 0.25 : 0.9; }
    if (this.t >= this.nextGolden && !this.fish.some((f) => f.kind === 'golden') && left > 6) { this.spawn('golden'); this.nextGolden = this.t + rand(15, 20); }
    this.updateFish(dt);
    for (const U of this.units) this.updateUnit(U, dt);
    this.updateReveals(dt);
    this.ambient(dt);
    for (const U of this.units) { this.animUnit(U, dt); U.a.update(dt); }
    if (this.goldBanner) { this.goldBanner.t += dt; if (this.goldBanner.t > 2.2) this.goldBanner = null; }
    if (left <= 0 && !this.over) this.endGame();
  }

  postUpdate(dt) {
    this.clock += dt;
    this.ambient(dt);
    for (const f of this.fish) if (f.state !== 'hooked') this.moveFish(f, dt);
    this.updateReveals(dt);
    for (const U of this.units) { this.animUnit(U, dt); U.a.update(dt); }
  }

  startFrenzy() {
    this.frenzy = true; this.frenzyT = this.t;
    snd('fever', 'fanfare'); fx.flash('#bff3ff', 0.25); fx.shake(8, 0.3);
    for (let i = 0; i < 14; i++) {
      const a = rand(TAU), r = Math.sqrt(rand()) * 0.85;
      const x = POND.x + Math.cos(a) * POND.rx * r, y = POND.y + Math.sin(a) * POND.ry * r;
      particles.burst(x, y, { type: 'bubble', count: 4, colors: ['#ffffff', '#c8f1ff'], speed: [40, 140] });
      this.ripple(x, y, '#ffffff', 90, 0.9);
    }
    for (let i = 0; i < 6; i++) this.spawn();
    if (!this.fish.some((f) => f.kind === 'golden')) { this.spawn('golden'); this.nextGolden = this.t + 12; }
    for (const U of this.units) if (U.state === 'aim' || U.state === 'float') { U.a.playOnce('cheer', 0.5); }
  }

  ambient(dt) {
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < r.life);
    const fr = this.frog;
    fr.blinkT -= dt; if (fr.blinkT < -0.12) fr.blinkT = rand(1.5, 4);
    fr.nextRibbit -= dt; fr.puffT = Math.max(0, fr.puffT - dt);
    if (fr.nextRibbit <= 0) { fr.nextRibbit = rand(5, 9); fr.puffT = 0.7; }
    for (const U of this.units) U.basketPop = Math.max(0, U.basketPop - dt);
  }

  // --- fish ---------------------------------------------------------------------------
  updateFish(dt) {
    const nk = this.frenzy ? 1.4 : 1;
    for (const f of this.fish) {
      this.moveFish(f, dt);
      f.cool = Math.max(0, f.cool - dt);
      f.scare = Math.max(0, f.scare - dt);
      if (f.kind === 'golden' && f.state === 'swim' && !f.U) {
        f.life -= dt;
        if (f.life <= 0) { f.state = 'leave'; f.st = 0; }
        if (chance(dt * 10)) particles.burst(f.x + rand(-30, 30), f.y + rand(-14, 14), { type: 'sparkle', count: 1, colors: ['#ffd23f', '#fff6a8', '#fff'], size: [10, 18], speed: [5, 40], life: [0.4, 0.8], gravity: -30 });
      }
      // notice a floating bobber
      if (f.state === 'swim' && f.cool <= 0 && f.appear >= 1 && !f.K.junk) {
        for (const U of this.units) {
          if (U.state !== 'float' || U.fish || U.bob.grace > 0) continue;
          const d = Math.hypot(U.bob.x - f.x, U.bob.y - f.y), R = f.K.notice * nk;
          if (d < R && chance(dt * (1.2 + 2.6 * (1 - d / R)) * nk)) { this.claim(f, U); break; }
        }
      }
      if (f.kind === 'duck' && f.state === 'swim' && f.cool <= 0) {
        for (const U of this.units) {
          if (U.state !== 'float' || U.fish) continue;
          if (Math.hypot(U.bob.x - f.x, U.bob.y - f.y) < f.K.snag) { this.claim(f, U); f.state = 'snag'; f.st = rand(0.4, 0.8); break; }
        }
      }
      const U = f.U;
      if (f.state === 'nibble') {
        f.nibT -= dt;
        if (f.nibT <= 0) {
          if (f.nibLeft > 0) { f.nibLeft--; f.nibT = rand(0.45, 0.85) * (this.frenzy ? 0.65 : 1); this.nibble(f, U); }
          else this.bite(f, U);
        }
      } else if (f.state === 'snag') {
        f.st -= dt;
        if (f.st <= 0) this.bite(f, U);
      } else if (f.state === 'bite') {
        f.st -= dt;
        if (f.st <= 0) this.missed(f, U);
      }
    }
    this.fish = this.fish.filter((f) => !(f.state === 'leave' && f.appear <= 0));
  }

  claim(f, U) {
    f.U = U; U.fish = f;
    if (!f.K.junk) { f.state = 'approach'; f.st = 0; }
    U.ai.idle = 0;
  }

  release(f, flee = true) {
    const U = f.U;
    if (U && U.fish === f) U.fish = null;
    f.U = null;
    if (f.K.junk) { f.state = 'swim'; f.cool = 2.5; return; }
    if (flee && U && U.bob) { f.state = 'flee'; f.st = 1.0; f.fleeFrom = { x: U.bob.x, y: U.bob.y }; f.scare = 0.8; }
    else f.state = 'swim';
    f.cool = 2.5;
  }

  moveFish(f, dt) {
    f.t += dt;
    const K = f.K;
    if (f.state === 'leave') { f.appear = Math.max(0, f.appear - dt * 0.8); }
    else if (f.appear < 1) f.appear = Math.min(1, f.appear + dt * 1.2);
    if (f.state === 'hooked') return;
    let tx = f.tx, ty = f.ty, sp = K.speed || 0;
    if (f.state === 'swim' || f.state === 'leave') {
      if (K.move === 'still') { f.vx = f.vy = 0; return; }
      if (K.move === 'drift') {
        if (Math.hypot(tx - f.x, ty - f.y) < 30) this.newTarget(f, 300);
      } else if (K.move === 'dart') {
        f.wait -= dt;
        if (f.wait > 0) sp = K.speed * 0.4;
        else { sp = K.dart; if (Math.hypot(tx - f.x, ty - f.y) < 40) { f.wait = rand(0.6, 1.6); this.newTarget(f, 420); } }
      } else if (Math.hypot(tx - f.x, ty - f.y) < 30) this.newTarget(f, 460);
    } else if (f.state === 'approach') {
      const U = f.U;
      if (!U || U.state !== 'float') { this.release(f, false); return; }
      tx = U.bob.x - f.face * 4; ty = U.bob.y + 14; sp = (K.speed || 60) * 1.6 + 110;
      f.st += dt;
      if (f.st > 4) { this.release(f, false); return; }   // safety: never wait forever
      if (Math.hypot(tx - f.x, ty - f.y) < 16) { f.state = 'nibble'; f.nibLeft = randInt(K.nib[0], K.nib[1]); f.nibT = rand(0.25, 0.5) * (this.frenzy ? 0.65 : 1); }
    } else if (f.state === 'nibble' || f.state === 'bite' || f.state === 'snag') {
      const U = f.U;
      if (!U || U.state !== 'float') { this.release(f, false); return; }
      if (K.junk) return;
      tx = U.bob.x - f.face * (K.len * 0.32 * f.size) + Math.sin(f.t * 5) * 4; ty = U.bob.y + 12; sp = 120;
    } else if (f.state === 'flee') {
      f.st -= dt;
      const fl = f.fleeFrom || { x: POND.x, y: POND.y };
      const a = Math.atan2(f.y - fl.y, f.x - fl.x);
      tx = f.x + Math.cos(a) * 200; ty = f.y + Math.sin(a) * 200; sp = (K.dart || K.speed * 4) + 80;
      if (f.st <= 0) { f.state = 'swim'; this.newTarget(f, 400); }
    }
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
    const want = d > 1 ? Math.min(sp, d * 4) : 0;
    const k = f.state === 'flee' ? 10 : 3;
    f.vx = damp(f.vx, d > 1 ? (dx / d) * want : 0, k, dt);
    f.vy = damp(f.vy, d > 1 ? (dy / d) * want : 0, k, dt);
    f.x += f.vx * dt; f.y += f.vy * dt;
    const c = clampPond(f.x, f.y, f.U ? 0.95 : K.surface ? 0.84 : 0.86);
    if (c.x !== f.x || c.y !== f.y) { f.x = c.x; f.y = c.y; if (f.state === 'swim' || f.state === 'flee') this.newTarget(f, 300); }
    if (Math.abs(f.vx) > 12) f.face = f.vx > 0 ? 1 : -1;
    f.tilt = damp(f.tilt, clamp(Math.atan2(f.vy, Math.abs(f.vx) + 20) * 0.6, -0.45, 0.45), 6, dt);
  }

  newTarget(f, range) {
    for (let k = 0; k < 8; k++) {
      const a = rand(TAU), r = rand(80, range);
      const x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r * 0.6;
      if (inPond(x, y, f.K.surface ? 0.8 : 0.82)) { f.tx = x; f.ty = y; return; }
    }
    const c = clampPond(POND.x + rand(-300, 300), POND.y + rand(-120, 120), 0.8);
    f.tx = c.x; f.ty = c.y;
  }

  nibble(f, U) {
    U.bob.dip = 0.55;
    snd('fish-nibble', 'bubble', { vol: 0.5 });
    this.ripple(U.bob.x, U.bob.y, '#ffffff', 46, 0.5);
    particles.burst(U.bob.x, U.bob.y - 4, { type: 'bubble', count: 2, colors: ['#ffffff'], speed: [20, 60], size: [5, 9] });
    if (U.p.isAI) {
      const lvl = clamp(U.p.aiLevel ?? 0, 0, 2);
      if (U.ai.jumpAt < 0 && chance([0.14, 0.06, 0.02][lvl])) U.ai.jumpAt = this.t + rand(0.08, 0.25);
    }
  }

  bite(f, U) {
    f.state = 'bite'; f.st = BITE_WIN;
    U.bob.dip = 1; U.bob.under = true;
    snd('fish-bite', 'pop'); sfx('splash', { vol: 0.6 });
    this.ripple(U.bob.x, U.bob.y, '#ffffff', 90, 0.6);
    particles.burst(U.bob.x, U.bob.y - 6, { type: 'drop', count: 10, colors: ['#ffffff', '#bfefff', '#7fd3f7'], angle: -Math.PI / 2, spread: 0.9, speed: [160, 360] });
    U.a.emote('exclaim', 0.8);
    if (!U.p.isAI) U.p.ctrl.rumble(0.5, 140);
    if (U.p.isAI && U.ai.hookAt < 0) {
      const lvl = clamp(U.p.aiLevel ?? 0, 0, 2);
      U.ai.hookAt = this.t + reactionTime(U.p) * [1.05, 1, 0.95][lvl] + (lvl === 0 && chance(0.12) ? 0.5 : 0);
    }
  }

  missed(f, U) {
    U.bob.under = false; U.bob.dip = 0.3;
    particles.popText(U.bob.x, U.bob.y - 50, 'Missed!', '#ffffff', 40);
    snd('fish-missed', 'back', { vol: 0.6 });
    U.a.playOnce('surprised', 0.4);
    this.release(f, true);
    U.ai.hookAt = -1;
  }

  // --- players ------------------------------------------------------------------------
  rodTip(U) {
    const h = U.a.anchor('hand');
    const L = clamp(U.a.height * 0.82, 110, 175);
    return { hx: h.x, hy: h.y, x: h.x + Math.cos(U.rodAng) * L * U.a.facing, y: h.y + Math.sin(U.rodAng) * L };
  }

  updateUnit(U, dt) {
    const p = U.p, c = p.ctrl;
    U.st += dt;
    if (p.isAI) this.ai(U, dt);
    const canAim = U.state === 'aim' || U.state === 'reveal' || U.state === 'snap';
    if (canAim) {
      U.ring.x += c.x * RING_SPEED * dt; U.ring.y += c.y * RING_SPEED * 0.7 * dt;
      const r = clampPond(U.ring.x, U.ring.y, 0.88); U.ring.x = r.x; U.ring.y = r.y;
    }
    switch (U.state) {
      case 'aim':
        if (c.pressed('a') && U.st > 0.12) this.cast(U);
        break;
      case 'cast': {
        const b = U.bob;
        b.u += dt / b.dur;
        const u = clamp(b.u, 0, 1);
        b.x = lerp(b.sx, b.tx, u); b.y = lerp(b.sy, b.ty, u); b.z = Math.sin(u * Math.PI) * b.arc;
        if (b.u >= 1) this.plop(U);
        break;
      }
      case 'float': {
        const b = U.bob;
        b.grace = Math.max(0, b.grace - dt);
        b.dip = Math.max(b.under ? 1 : 0, b.dip - dt * 3);
        if (c.pressed('a')) {
          const f = U.fish;
          if (f && f.state === 'bite') this.hook(U, f);
          else if (f && f.state === 'nibble') this.tooSoon(U, f);
          else this.reelIn(U);
        }
        break;
      }
      case 'reelin': {
        const b = U.bob, tip = this.rodTip(U);
        b.u += dt / 0.3;
        const u = ease.inOutQuad ? ease.inOutQuad(clamp(b.u, 0, 1)) : clamp(b.u, 0, 1);
        b.x = lerp(b.sx, tip.x, u); b.y = lerp(b.sy, tip.y + 40, u); b.z = Math.sin(u * Math.PI) * 60;
        if (b.u >= 1) { U.bob = null; this.setState(U, 'aim'); }
        break;
      }
      case 'reel': this.updateReel(U, dt); break;
      case 'snap': if (U.st > 0.9) this.setState(U, 'aim'); break;
      default: break;
    }
    // facing: toward the ring / bobber
    const tgt = U.bob ? U.bob : U.ring;
    if (U.s.side === 0) { if (Math.abs(tgt.x - U.a.x) > 40) U.a.facing = tgt.x > U.a.x ? 1 : -1; }
    else U.a.facing = -U.s.side;
  }

  setState(U, s) { U.state = s; U.st = 0; }

  cast(U) {
    const tip = this.rodTip(U);
    const d = Math.hypot(U.ring.x - tip.x, U.ring.y - tip.y);
    U.bob = { sx: tip.x, sy: tip.y, tx: U.ring.x, ty: U.ring.y, x: tip.x, y: tip.y, z: 0, u: 0, dur: 0.32 + d / 2400, arc: 90 + d * 0.18, dip: 0, under: false, grace: 0 };
    this.setState(U, 'cast');
    U.a.playOnce(POSE.cast, 0.4); U.a.squash(0.2);
    snd('fish-cast', 'whoosh', { vol: 0.7 });
    U.ai.target = null; U.ai.idle = 0; U.ai.hookAt = -1; U.ai.jumpAt = -1;
  }

  plop(U) {
    const b = U.bob;
    b.x = b.tx; b.y = b.ty; b.z = 0; b.dip = 0.8; b.grace = 0.25;
    this.setState(U, 'float');
    snd('fish-plop', 'water', { vol: 0.6 });
    this.ripple(b.x, b.y, '#ffffff', 80, 0.8); this.ripple(b.x, b.y, U.p.color, 50, 0.5);
    particles.burst(b.x, b.y - 4, { type: 'drop', count: 7, colors: ['#ffffff', '#bfefff'], angle: -Math.PI / 2, spread: 1, speed: [100, 260] });
    for (const f of this.fish) {
      if (f.state !== 'swim' && f.state !== 'approach') continue;
      const d = Math.hypot(f.x - b.x, f.y - b.y);
      // shy fish dart away from a splash right on top of them
      if (f.K.shy && d < f.K.shy && f.state === 'swim') {
        f.state = 'flee'; f.st = 1.1; f.fleeFrom = { x: b.x, y: b.y }; f.scare = 1; f.cool = 2.5;
        particles.popText(f.x, f.y - 40, 'Eek!', '#e9dcff', 34);
      }
      // junk on the bottom snags a hook dropped near it
      if (f.K.junk && !f.K.surface && !f.U && !U.fish && f.cool <= 0 && d < f.K.snag) { this.claim(f, U); f.state = 'snag'; f.st = rand(0.6, 1.2); }
    }
  }

  reelIn(U) {
    const b = U.bob;
    if (U.fish) this.release(U.fish, false);
    b.sx = b.x; b.sy = b.y; b.u = 0; b.under = false;
    this.setState(U, 'reelin');
    snd('fish-reel', 'tick', { vol: 0.4 });
    this.ripple(b.x, b.y, '#ffffff', 40, 0.4);
  }

  tooSoon(U, f) {
    particles.popText(U.bob.x, U.bob.y - 50, 'Too soon!', '#ffb3d9', 42);
    snd('fish-scare', 'wrong', { vol: 0.5 });
    this.ripple(U.bob.x, U.bob.y, '#ffffff', 60, 0.5);
    this.release(f, true);
    U.a.playOnce('surprised', 0.5); U.a.emote('sweat', 0.8);
    U.bob.dip = 0.6;
  }

  hook(U, f) {
    f.state = 'hooked'; f.st = 0;
    U.bob.under = false;
    const K = f.K;
    const pullK = K.pull * (K.big ? 1 : 0.85 + f.size * 0.15);
    U.reel = { f, prog: 0, ten: 0.12, pull: pullK, need: Math.round(K.reel * (K.junk ? 1 : 0.8 + f.size * 0.2)), pullT: 0, warnT: 0, nextPull: rand(0.7, 1.3), pulls: 0, x0: f.x, y0: f.y, presses: 0, redT: 0, shown: 0.12, creak: 0 };
    this.setState(U, 'reel');
    U.a.playOnce('surprised', 0.25, POSE.reel); U.a.squash(0.3);
    snd('fish-hook', 'pop'); sfx('splash', { vol: 0.8 });
    particles.popText(f.x, f.y - 60, K.junk ? 'Snagged!' : 'Hooked!', '#ffe14d', 46);
    particles.burst(f.x, f.y - 6, { type: 'drop', count: 12, colors: ['#ffffff', '#bfefff', '#7fd3f7'], angle: -Math.PI / 2, spread: 1.1, speed: [180, 420] });
    this.ripple(f.x, f.y, '#ffffff', 100, 0.7);
    if (!U.p.isAI) U.p.ctrl.rumble(0.6, 180);
    U.ai.hookAt = -1; U.ai.jumpAt = -1; U.ai.pullSeenAt = -1;
  }

  updateReel(U, dt) {
    const R = U.reel, f = R.f, c = U.p.ctrl;
    let presses = c.pressed('a') ? 1 : 0;
    // spinning the stick reels too (a quarter turn = one press)
    if (!U.p.isAI) {
      const mag = Math.hypot(c.x, c.y);
      if (mag > 0.6) {
        const ang = Math.atan2(c.y, c.x);
        if (U.spinLast !== null) { const d = Math.atan2(Math.sin(ang - U.spinLast), Math.cos(ang - U.spinLast)); U.spinAcc += d; }
        U.spinLast = ang;
        while (Math.abs(U.spinAcc) >= Math.PI / 2) { presses++; U.spinAcc -= Math.sign(U.spinAcc) * Math.PI / 2; }
      } else { U.spinLast = null; U.spinAcc = 0; }
    }
    // the fish tugs now and then (a short wiggle warns first)
    if (R.pull > 0.2) {
      if (R.pullT > 0) { R.pullT -= dt; if (R.pullT <= 0) { R.nextPull = rand(1.0, 2.1) / (0.6 + R.pull * 0.5); } }
      else if (R.warnT > 0) {
        R.warnT -= dt;
        if (R.warnT <= 0) {
          R.pullT = rand(0.7, 1.2) * (0.7 + R.pull * 0.45); R.pulls++;
          snd('fish-tug', 'splash', { vol: 0.8 });
          particles.burst(f.x, f.y - 6, { type: 'drop', count: 10, colors: ['#ffffff', '#bfefff'], angle: -Math.PI / 2, spread: 1.2, speed: [160, 380] });
          U.a.playOnce(POSE.tug, R.pullT, POSE.reel);
          if (!U.p.isAI) U.p.ctrl.rumble(0.35 + R.pull * 0.3, 200);
        }
      } else {
        R.nextPull -= dt;
        if (R.nextPull <= 0 && R.prog < 0.93) { R.warnT = 0.4; sfx('splash', { vol: 0.35 }); }
      }
    }
    const pulling = R.pullT > 0;
    for (let i = 0; i < presses; i++) {
      R.presses++;
      R.prog += (1 / R.need) * (pulling ? 0.3 : 1);
      R.ten += pulling ? 0.04 + 0.16 * R.pull : 0.05 + 0.03 * R.pull;
      U.rodKick = 1;
      if (R.presses % 2 === 0) snd('fish-reel', 'tick', { vol: 0.25 });
      if (chance(0.5)) particles.burst(f.x + rand(-10, 10), f.y - 4, { type: 'drop', count: 2, colors: ['#ffffff', '#bfefff'], angle: -Math.PI / 2, spread: 0.8, speed: [80, 200], size: [4, 8] });
    }
    if (pulling) { R.ten += 0.25 * R.pull * dt; R.prog = Math.max(0, R.prog - 0.06 * R.pull * dt); }
    else R.ten = Math.max(0, R.ten - 0.7 * dt);
    R.shown = damp(R.shown, R.ten, 18, dt);
    R.redT = R.ten > 0.78 ? R.redT + dt : 0;
    if (R.ten > 0.78) { R.creak -= dt; if (R.creak <= 0) { R.creak = 0.45; snd('fish-creak', hasSound('balloon-stretch') ? 'balloon-stretch' : 'tock', { vol: 0.5 }); } }
    // the fish follows the line toward the shore
    const S = U.s.shore;
    const u = ease.outQuad ? ease.outQuad(clamp(R.prog, 0, 1)) : clamp(R.prog, 0, 1);
    const th = pulling ? Math.sin(this.clock * 30) * 16 * (0.5 + R.pull * 0.5) : R.warnT > 0 ? Math.sin(this.clock * 40) * 6 : Math.sin(this.clock * 6) * 4;
    const ang = Math.atan2(S.y - R.y0, S.x - R.x0);
    f.x = lerp(R.x0, S.x, u) - Math.sin(ang) * th; f.y = lerp(R.y0, S.y, u) + Math.cos(ang) * th * 0.6;
    f.face = S.x >= R.x0 ? 1 : -1;
    f.tilt = pulling ? Math.sin(this.clock * 24) * 0.35 : Math.sin(this.clock * 8) * 0.12;
    U.bob.x = f.x; U.bob.y = f.y; U.bob.z = 0;
    if (pulling && chance(dt * 12)) particles.burst(f.x + rand(-20, 20), f.y - 4, { type: 'drop', count: 2, colors: ['#ffffff', '#bfefff'], angle: -Math.PI / 2, spread: 1, speed: [120, 260] });
    if (chance(dt * 6)) this.ripple(f.x, f.y, '#ffffff', 50, 0.5);
    if (R.ten >= SNAP_AT) this.snapLine(U);
    else if (R.prog >= 1) this.land(U);
  }

  snapLine(U) {
    const R = U.reel, f = R.f;
    const tip = this.rodTip(U);
    particles.popText((tip.x + f.x) / 2, (tip.y + f.y) / 2 - 30, 'SNAP!', '#ff6f91', 60);
    particles.burst((tip.x + f.x) / 2, (tip.y + f.y) / 2, { type: 'star', count: 8, colors: ['#ffffff', '#ffe14d'], speed: [120, 320] });
    snd('fish-snap', 'crack'); voice(U.p.charId, 'aww');
    fx.shake(this.n > 4 ? 5 : 9, 0.2);
    U.a.playOnce(POSE.snap, 0.5, 'sad'); U.a.emote('sweat', 0.9);
    if (!U.p.isAI) U.p.ctrl.rumble(0.8, 220);
    f.U = null; U.fish = null;
    if (f.K.junk) { f.state = 'swim'; f.cool = 3; }
    else { f.state = 'flee'; f.st = 1.2; f.fleeFrom = { x: U.s.shore.x, y: U.s.shore.y }; f.cool = 3; f.scare = 1; }
    U.reel = null; U.bob = null;
    this.setState(U, 'snap');
  }

  land(U) {
    const R = U.reel, f = R.f;
    this.fish = this.fish.filter((x) => x !== f);
    U.fish = null; U.reel = null; U.bob = null;
    this.setState(U, 'reveal');
    sfx('splash'); snd('fish-catch', 'jump', { vol: 0.7 });
    particles.burst(f.x, f.y - 6, { type: 'drop', count: 18, colors: ['#ffffff', '#bfefff', '#7fd3f7'], angle: -Math.PI / 2, spread: 0.8, speed: [250, 560] });
    this.ripple(f.x, f.y, '#ffffff', 110, 0.8);
    this.reveals.push({ U, kind: f.kind, K: f.K, size: f.size, x: f.x, y: f.y, x0: f.x, y0: f.y, t: 0, phase: 'fly', spin: 0, scale: pondDepth(f.y) });
  }

  updateReveals(dt) {
    for (const r of this.reveals) {
      r.t += dt;
      const U = r.U, a = U.a, head = a.anchor('head');
      const hx = head.x, hy = head.y - 40 * this.scale - r.K.len * 0.2;
      if (r.phase === 'fly') {
        const u = clamp(r.t / 0.6, 0, 1);
        r.x = lerp(r.x0, hx, u); r.y = lerp(r.y0, hy, u) - Math.sin(u * Math.PI) * 230;
        r.spin = u * TAU * 1.5;
        r.scale = lerp(pondDepth(r.y0), 1, u);
        if (chance(dt * 30)) particles.burst(r.x, r.y, { type: 'drop', count: 1, colors: ['#bfefff', '#ffffff'], speed: [10, 60], size: [5, 9] });
        if (u >= 1) this.revealLand(r);
      } else if (r.phase === 'hold') {
        r.x = hx; r.y = hy + Math.sin(r.t * 7) * 6; r.spin = 0;
        if (r.t > r.hold) { r.phase = 'toss'; r.t = 0; r.x0 = r.x; r.y0 = r.y; }
      } else if (r.phase === 'toss') {
        const u = clamp(r.t / 0.3, 0, 1), B = U.s.basket;
        r.x = lerp(r.x0, B.x, u); r.y = lerp(r.y0, B.y - 50, u) - Math.sin(u * Math.PI) * 70;
        r.scale = lerp(1, 0.5, u); r.spin = u * Math.PI;
        if (u >= 1) {
          r.done = true;
          U.catches.push(r.kind); U.basketPop = 0.5;
          sfx('pop', { vol: 0.5 });
          particles.burst(B.x, B.y - 50, { type: 'sparkle', count: 6, colors: ['#ffffff', U.p.color, '#ffe14d'], speed: [60, 200] });
          if (U.state === 'reveal') this.setState(U, 'aim');
        }
      }
    }
    this.reveals = this.reveals.filter((r) => !r.done);
  }

  revealLand(r) {
    const U = r.U, K = r.K, a = U.a;
    r.phase = 'hold'; r.t = 0;
    const bonus = !K.junk && r.size >= 1.12 ? 1 : 0;
    const pts = K.pts + bonus;
    U.score += pts; U.fishN += K.junk ? 0 : 1;
    r.hold = r.kind === 'golden' ? 1.2 : 0.6;
    const top = a.y - a.height - 60;
    const big = K.big || bonus > 0;
    const label = r.kind === 'sunny' && bonus ? 'Big one!' : big && !K.junk ? 'Big one!' : K.line;
    a.playOnce(POSE.catch, 0.35, 'idle');
    if (!U.p.isAI) U.p.ctrl.rumble(0.5, 200);
    if (r.kind === 'golden') {
      a.playOnce('celebrate', 1.4, 'idle'); a.say('Wow!', 1.4, 'woo');
      fx.slowmo(0.45, 0.7); fx.flash('#fff3a0', 0.3); fx.shake(12, 0.35);
      sfx('fanfare'); snd('golden-chime', 'star');
      particles.burst(r.x, r.y, { type: 'confetti', count: 50, colors: ['#ffd23f', '#fff6a8', '#ffffff', U.p.color] });
      particles.burst(r.x, r.y, { type: 'star', count: 14, colors: ['#ffd23f', '#ffffff'], speed: [200, 520] });
      particles.ring(r.x, r.y, '#ffd23f', 200, 0.6);
      if (this.api.camera) this.api.camera.punch(a.x, a.y - a.height * 0.6, 1.25, 0.7);
      this.goldBanner = { t: 0, U };
    } else if (r.kind === 'boot') {
      a.playOnce('laugh', 1.0, 'idle'); a.say('Hee hee!', 1.2, 'laugh');
      snd('fish-boot', 'boing');
      particles.burst(r.x, r.y - 40, { type: 'petal', count: 10, colors: ['#ffffff', '#ffe46b', '#ffb3d9'], speed: [60, 200] });
    } else if (r.kind === 'duck') {
      a.playOnce('cheer', 0.6, 'idle');
      snd('fish-duck', hasSound('squeak') ? 'squeak' : 'pop');
      particles.burst(r.x, r.y, { type: 'heart', count: 6, colors: ['#ffd23f', '#ff8ad0'] });
    } else if (r.kind === 'chest') {
      a.playOnce('celebrate', 1.0, 'idle'); a.say('Treasure!', 1.2, 'woo');
      sfx('coin'); sfx('fanfare', { vol: 0.6 });
      particles.burst(r.x, r.y, { type: 'star', count: 16, colors: ['#ffd23f', '#ffe46b', '#ffffff'], speed: [200, 500] });
      particles.burst(r.x, r.y, { type: 'sparkle', count: 14, colors: ['#ffd23f', '#fff6a8'] });
      fx.shake(8, 0.25);
      if (this.api.camera) this.api.camera.punch(a.x, a.y - a.height * 0.6, 1.15, 0.45);
    } else {
      a.playOnce(big ? 'celebrate' : 'cheer', big ? 1.0 : 0.6, 'idle');
      voice(U.p.charId, big ? 'woo' : 'yay');
      sfx('collect', { step: Math.min(6, pts) });
      particles.burst(r.x, r.y, { type: 'sparkle', count: big ? 16 : 9, colors: ['#ffffff', '#fff6a8', U.p.color], speed: [100, 320] });
      if (big) { sfx('star'); fx.shake(6, 0.2); particles.ring(r.x, r.y, '#ffffff', 150, 0.45); }
    }
    a.squash(0.35);
    particles.popText(a.x, top - 50, label, r.kind === 'golden' ? '#ffd23f' : '#ffffff', r.kind === 'golden' ? 60 : big ? 54 : 44);
    particles.popText(a.x + 70, top + 4, pts > 0 ? `+${pts}` : '+0', pts >= 8 ? '#ffd23f' : pts > 0 ? '#9ef08a' : '#d6d6e8', pts >= 6 ? 58 : 46);
  }

  // --- CPU ----------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 0, 0, 2), ai = U.ai;
    if (U.state === 'aim' || U.state === 'reveal' || U.state === 'snap') {
      ai.retarget -= dt; ai.aimT += U.state === 'aim' ? dt : 0;
      const tgt = ai.target;
      const bad = !tgt || !this.fish.includes(tgt) || tgt.U || (tgt.state !== 'swim' && tgt.state !== 'approach') || tgt.appear < 1;
      if (bad || ai.retarget <= 0) this.aiChoose(U, lvl);
      let tx = POND.x, ty = POND.y;
      const f = ai.target;
      if (f) {
        const lead = [0, 0.35, 0.6][lvl];
        tx = f.x + f.vx * lead; ty = f.y + f.vy * lead;
        if (f.K.shy && lvl > 0) {
          // shy fish: land a little in front of it, not on its head
          const a = Math.atan2(U.s.shore.y - ty, U.s.shore.x - tx);
          tx += Math.cos(a) * (f.K.shy + 30); ty += Math.sin(a) * (f.K.shy + 30) * 0.7;
        }
        tx += ai.err.x; ty += ai.err.y;
      } else { tx = ai.err.x + POND.x; ty = ai.err.y + POND.y; }
      const c = clampPond(tx, ty, 0.88); tx = c.x; ty = c.y;
      const dx = tx - U.ring.x, dy = ty - U.ring.y, d = Math.hypot(dx, dy);
      if (d > 4) { const k = clamp(d / 90, 0.15, 1) * prof.speed; p.ctrl.move((dx / d) * k, (dy / d) * k / 0.7); }
      else p.ctrl.move(0, 0);
      if (U.state === 'aim') {
        if (d < 26) ai.settle += dt; else ai.settle = 0;
        if (ai.settle > [0.3, 0.15, 0.06][lvl] || ai.aimT > 5) { p.ctrl.move(0, 0); p.ctrl.press('a'); ai.aimT = 0; ai.settle = 0; }
      }
      return;
    }
    p.ctrl.move(0, 0);
    if (U.state === 'float') {
      const f = U.fish;
      if (f && f.state === 'bite' && ai.hookAt >= 0 && this.t >= ai.hookAt) { p.ctrl.press('a'); ai.hookAt = -1; return; }
      if (ai.jumpAt >= 0 && this.t >= ai.jumpAt) { ai.jumpAt = -1; if (f && (f.state === 'nibble' || f.state === 'bite')) p.ctrl.press('a'); return; }
      if (!f) {
        ai.idle += dt;
        const R2 = 280 * (this.frenzy ? 1.4 : 1);
        const near = this.fish.some((o) => !o.K.junk && !o.U && o.state === 'swim' && Math.hypot(o.x - U.bob.x, o.y - U.bob.y) < R2);
        const patience = near ? [7, 5, 3.5][lvl] : [4, 2.5, 1.5][lvl];
        if (ai.idle > patience) { ai.idle = 0; p.ctrl.press('a'); }
      }
      return;
    }
    if (U.state === 'reel') {
      const R = U.reel;
      const warn = R.warnT > 0 || R.pullT > 0;
      if (warn) {
        if (ai.pullId !== R.pulls + (R.pullT > 0 ? 0 : 1)) {
          ai.pullId = R.pulls + (R.pullT > 0 ? 0 : 1);
          ai.pullSeenAt = this.t + reactionTime(p) * 0.7;
          ai.careless = lvl === 0 ? chance(0.4) : lvl === 1 ? chance(0.1) : false;
        }
      }
      const aware = warn && ai.pullSeenAt >= 0 && this.t >= ai.pullSeenAt && !ai.careless;
      let hold = false;
      if (aware && R.ten > [0.55, 0.42, 0.3][lvl]) hold = true;
      if (!ai.careless && R.ten > [0.86, 0.8, 0.72][lvl]) hold = true;
      if (!hold) mash(p, dt, 'a', ai.ms);
    }
  }

  aiChoose(U, lvl) {
    const ai = U.ai, from = U.ring;
    ai.retarget = rand(1.5, 3);
    const cands = this.fish.filter((f) => !f.U && f.appear >= 1 && f.state === 'swim' && !(f.K.junk && lvl > 0 && f.kind === 'boot'));
    let best = null, bs = -1;
    for (const f of cands) {
      let v = f.kind === 'boot' ? 1.5 : f.K.pts + (f.kind === 'golden' ? lvl * 5 : 0);
      if (f.kind === 'chest' && lvl === 0) v = 3;
      const d = Math.hypot(f.x - from.x, f.y - from.y);
      let s = v / (1 + d / 450) * (lvl === 0 ? rand(0.4, 1.6) : rand(0.8, 1.2));
      if (this.units.some((o) => o !== U && o.bob && Math.hypot(o.bob.x - f.x, o.bob.y - f.y) < 160)) s *= 0.3;
      if (s > bs) { bs = s; best = f; }
    }
    if (lvl === 0 && cands.length && chance(0.3)) best = pick(cands);
    ai.target = best;
    const e = [110, 60, 26][lvl] * Math.sqrt(rand());
    const ea = rand(TAU);
    ai.err = best ? { x: Math.cos(ea) * e, y: Math.sin(ea) * e * 0.7 } : { x: rand(-300, 300), y: rand(-100, 100) };
  }

  endGame() {
    this.over = true;
    const scores = this.units.map((u) => u.score);
    const placements = placementsFromScores(scores);
    const stats = this.units.map((u) => `${u.score} pts · ${u.catches.length} catch${u.catches.length === 1 ? '' : 'es'}`);
    for (const U of this.units) {
      if (U.state === 'reel' || U.state === 'float' || U.state === 'cast') { if (U.fish) this.release(U.fish, false); U.reel = null; U.bob = null; U.state = 'aim'; }
      U.a.playOnce(placements[U.i] === 1 ? 'celebrate' : 'clap', 2.5, placements[U.i] === 1 ? 'celebrate' : 'idle');
    }
    const w = this.units[placements.indexOf(1)];
    this.api.finish({ placements, stats, solo: scores[0], focus: { x: w.a.x, y: w.a.y - w.a.height * 0.5, zoom: 1.3 } });
  }

  // --- animation ----------------------------------------------------------------------
  animUnit(U, dt) {
    let ang = -1.0, bend = 0;
    const a = U.a;
    U.rodKick = Math.max(0, (U.rodKick || 0) - dt * 8);
    switch (U.state) {
      case 'aim': ang = -0.8 + Math.sin(this.clock * 2 + U.i) * 0.05; break;
      case 'cast': { const u = clamp(U.bob ? U.bob.u * 2.2 : 1, 0, 1); ang = lerp(-2.1, -0.45, ease.outBack ? ease.outBack(u) : u); break; }
      case 'float': {
        const f = U.fish;
        ang = -0.55 + Math.sin(this.clock * 1.6 + U.i) * 0.03;
        if (U.bob && U.bob.dip > 0) ang += U.bob.dip * 0.12 * (f && f.state === 'bite' ? 1 + Math.sin(this.clock * 40) * 0.5 : 1);
        bend = (U.bob ? U.bob.dip : 0) * 14;
        break;
      }
      case 'reelin': ang = -1.2; break;
      case 'reel': {
        const R = U.reel;
        ang = -1.15 + (R && R.pullT > 0 ? 0.35 + Math.sin(this.clock * 30) * 0.06 : Math.sin(this.clock * 9) * 0.03) - U.rodKick * 0.08;
        bend = 10 + (R ? R.shown * 34 + (R.pullT > 0 ? 14 : 0) : 0);
        break;
      }
      case 'reveal': ang = -1.35; break;
      case 'snap': ang = -0.8 + Math.sin(U.st * 20) * 0.15 * Math.max(0, 1 - U.st * 2); break;
      default: break;
    }
    U.rodAng = damp(U.rodAng, ang, U.state === 'cast' ? 30 : 12, dt);
    U.rodBend = damp(U.rodBend, bend, 12, dt);
    // base pose (one-shots play over it)
    const base = U.state === 'reel' ? POSE.reel : 'idle';
    if (this.over) return;
    a.setPose(base);
  }

  // --- drawing ------------------------------------------------------------------------
  draw(g) {
    const bg = art('bg/fishing-frenzy');
    if (bg) drawPondBackground(g, bg); else g.drawImage(this.bg, 0, 0);
    const t = this.clock;
    // under the water
    g.save();
    g.beginPath(); g.ellipse(POND.x, POND.y, POND.rx - 3, POND.ry - 3, 0, 0, TAU); g.clip();
    // light caustics
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const y = POND.y - POND.ry + 40 + i * 62;
      g.beginPath();
      for (let x = POND.x - POND.rx; x <= POND.x + POND.rx; x += 40) { const yy = y + Math.sin(x * 0.012 + t * 1.2 + i) * 8; if (x === POND.x - POND.rx) g.moveTo(x, yy); else g.lineTo(x, yy); }
      g.stroke();
    }
    const under = this.fish.filter((f) => !f.K.surface && f.state !== 'hooked').sort((a, b) => a.y - b.y);
    for (const f of under) this.drawFish(g, f, true);
    // water tint over the fish
    g.fillStyle = 'rgba(70,180,235,0.22)'; g.fillRect(POND.x - POND.rx, POND.y - POND.ry, POND.rx * 2, POND.ry * 2);
    // surface sparkles
    for (const s of this.sparkles) {
      const k = Math.max(0, Math.sin(t * s.sp + s.ph));
      if (k < 0.3) continue;
      const x = POND.x + Math.cos(s.a) * POND.rx * s.r, y = POND.y + Math.sin(s.a) * POND.ry * s.r;
      g.globalAlpha = (k - 0.3) / 0.7 * 0.9; star4(g, x, y, 4 + k * 8, '#ffffff');
    }
    g.globalAlpha = 1;
    // hooked fish thrash right at the surface
    for (const f of this.fish) if (f.state === 'hooked') this.drawFish(g, f, false);
    // ripples
    for (const r of this.ripples) {
      const u = r.t / r.life, rr = r.max * ease.outQuad(u);
      g.globalAlpha = (1 - u) * 0.85; g.strokeStyle = r.color; g.lineWidth = 4 * (1 - u) + 1.5;
      g.beginPath(); g.ellipse(r.x, r.y, rr, rr * 0.38, 0, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
    // surface things
    for (const pd of this.pads) drawLilyPad(g, pd.x, pd.y + Math.sin(t * 1.3 + pd.ph) * 2, pd.r, pd.rot + Math.sin(t * 0.4 + pd.ph) * 0.05, pd.fl, t);
    const fp = this.pads[this.frog.pad];
    drawFrog(g, fp.x + 6, fp.y + 8 + Math.sin(t * 1.3 + fp.ph) * 2, 0.8, this.frog.blinkT < 0, this.frog.puffT > 0 ? Math.sin((this.frog.puffT / 0.7) * Math.PI * 3) ** 2 : 0);
    for (const f of this.fish) if (f.K.surface) this.drawFish(g, f, false);
    // aim rings
    for (const U of this.units) if (U.state === 'aim' || U.state === 'reveal' || U.state === 'snap') this.drawRing(g, U);
    // floating bobbers
    for (const U of this.units) {
      const b = U.bob;
      if (!b || U.state === 'reel') continue;
      if (U.state === 'float') drawBobber(g, b.x, b.y + Math.sin(t * 3 + U.i) * 2, 1, b.under ? 1 : b.dip, U.p.color);
    }
    // docks, baskets
    g.drawImage(this.docks, 0, 0);
    // dragonflies
    for (const d of this.flies) {
      const x = d.cx + Math.sin(t * 0.7 + d.ph) * 260, y = d.cy + Math.sin(t * 1.3 + d.ph) * 70 - 60;
      const vx = Math.cos(t * 0.7 + d.ph);
      drawDragonfly(g, x, y, vx > 0 ? 1 : -1, t, d.col);
    }
    // characters, rods and lines (sorted by depth)
    const list = [];
    for (const U of this.units) {
      list.push({ y: U.s.basket.y - 1, fn: () => drawBasket(g, U.s.basket.x, U.s.basket.y, this.scale, U.catches, t, U.basketPop) });
      list.push({ y: U.a.y, fn: () => this.drawUnit(g, U) });
    }
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();
    // flying catches + bite bangs + reel meters on top
    for (const r of this.reveals) this.drawReveal(g, r);
    for (const U of this.units) {
      if (U.state === 'float' && U.fish && U.fish.state === 'bite') {
        const k = ease.outBack ? ease.outBack(clamp((BITE_WIN - U.fish.st) / 0.18, 0, 1)) : 1;
        g.save(); g.translate(U.bob.x, U.bob.y - 70); g.scale(k, k); g.rotate(Math.sin(t * 30) * 0.08);
        drawBang(g, 0, 0, 34); g.restore();
      }
      if (U.state === 'reel') this.drawMeter(g, U);
    }
  }

  drawFish(g, f, under) {
    const K = f.K;
    const L = K.len * f.size * pondDepth(f.y);
    g.save();
    g.translate(f.x, f.y);
    let alpha = f.appear * (under ? 0.9 : 1);
    if (f.state === 'leave') alpha *= f.appear;
    g.globalAlpha = alpha;
    // glow for the golden one
    if (f.kind === 'golden') {
      g.save(); g.globalCompositeOperation = 'lighter';
      const r = L * (1 + 0.12 * Math.sin(f.t * 6));
      const gr = g.createRadialGradient(0, 0, 4, 0, 0, r);
      gr.addColorStop(0, 'rgba(255,230,120,0.7)'); gr.addColorStop(1, 'rgba(255,210,80,0)');
      g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
    }
    if (K.junk && !K.surface) {
      // half sunk in the mud
      g.fillStyle = 'rgba(20,60,90,0.25)'; g.beginPath(); g.ellipse(0, L * 0.3, L * 0.55, L * 0.14, 0, 0, TAU); g.fill();
      if (f.kind === 'chest' && Math.sin(f.t * 2) > 0.85) { g.globalAlpha = 1; star4(g, L * 0.2, -L * 0.3, 10, '#fff6a8'); g.globalAlpha = alpha; }
    } else if (!under || K.surface) {
      g.fillStyle = 'rgba(20,60,90,0.18)'; g.beginPath(); g.ellipse(0, L * 0.26, L * 0.5, L * 0.12, 0, 0, TAU); g.fill();
    }
    if (K.surface) {
      g.translate(0, Math.sin(f.t * 2) * 2 - L * 0.12);
      g.rotate(Math.sin(f.t * 1.6) * 0.06);
    }
    g.scale(f.face, 1);
    if (!K.junk) g.rotate(f.tilt);
    drawCatch(g, f.kind, L, f.t, { fast: f.state === 'flee' || f.state === 'hooked', open: f.state === 'nibble' || f.state === 'bite' });
    g.restore();
    if (K.surface) {
      g.save(); g.fillStyle = 'rgba(90,190,240,0.45)'; g.beginPath(); g.ellipse(f.x, f.y + 2, L * 0.48, L * 0.1, 0, 0, TAU); g.fill(); g.restore();
    }
    if (f.scare > 0) {
      g.save(); g.globalAlpha = Math.min(1, f.scare * 2);
      ui.text(g, '!', f.x, f.y - L * 0.6, { size: 34, color: '#ffffff', strokeWidth: 6 });
      g.restore();
    }
  }

  drawRing(g, U) {
    const r = U.ring, col = U.p.color, t = this.clock;
    const pulse = 1 + Math.sin(t * 6 + U.i) * 0.06;
    const k = pondDepth(r.y);
    g.save(); g.translate(r.x, r.y); g.scale(pulse * k, pulse * k);
    g.globalAlpha = U.state === 'aim' ? 1 : 0.45;
    g.lineWidth = 9; g.strokeStyle = NAVY; g.beginPath(); g.ellipse(0, 0, 44, 18, 0, 0, TAU); g.stroke();
    g.lineWidth = 5; g.strokeStyle = col; g.beginPath(); g.ellipse(0, 0, 44, 18, 0, 0, TAU); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.setLineDash([8, 10]); g.lineDashOffset = -t * 30;
    g.beginPath(); g.ellipse(0, 0, 30, 12, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 6, 3, 0, 0, TAU); g.fill();
    if (U.state === 'aim') ui.text(g, U.p.tag, 0, -38, { size: 24, color: col, strokeWidth: 5, shadow: false });
    g.restore();
  }

  drawUnit(g, U) {
    const a = U.a, p = U.p;
    a.draw(g, { ring: p.color });
    // rod + line
    if (!this.over || U.state !== 'reveal') {
      const tip = this.rodTip(U);
      const s = clamp(this.scale, 0.85, 1);
      drawRod(g, tip.hx, tip.hy, tip.x, tip.y, U.rodBend * a.facing, p.color, s);
      const b = U.bob;
      if (b) {
        const by = b.y - b.z - (U.state === 'float' ? 12 : 0);
        const taut = U.state === 'reel';
        const R = U.reel;
        const sag = taut ? 0 : U.state === 'float' ? 40 : 10;
        g.save(); g.lineCap = 'round';
        g.strokeStyle = taut && R && R.shown > 0.78 && Math.sin(this.clock * 30) > 0 ? '#ff4d6d' : 'rgba(255,255,255,0.95)';
        g.lineWidth = taut ? 3 : 2.5;
        const wob = taut && R && R.pullT > 0 ? Math.sin(this.clock * 50) * 4 : 0;
        g.beginPath(); g.moveTo(tip.x, tip.y); g.quadraticCurveTo((tip.x + b.x) / 2 + wob, (tip.y + by) / 2 + sag, b.x, by); g.stroke();
        g.restore();
        if (U.state === 'cast' || U.state === 'reelin') drawBobber(g, b.x, b.y - b.z, 1, 0, p.color);
      }
    }
    // player tag at the start (and over a busy reel)
    if (this.t < 5) {
      const sc = this.n > 5 ? 0.75 : 0.95;
      g.save(); g.translate(a.x, a.y - a.height - 30); g.scale(sc, sc); ui.playerTag(g, p, 0, 0); g.restore();
    }
  }

  drawReveal(g, r) {
    const L = r.K.len * r.size * 1.25;
    g.save(); g.translate(r.x, r.y);
    if (r.phase === 'hold') {
      g.save(); g.globalCompositeOperation = 'lighter';
      const rr = L * 0.95, gr = g.createRadialGradient(0, 0, 4, 0, 0, rr);
      gr.addColorStop(0, r.kind === 'golden' ? 'rgba(255,230,120,0.8)' : 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(-rr, -rr, rr * 2, rr * 2); g.restore();
    }
    g.scale(r.scale * Math.cos(r.spin) || 0.05, r.scale);
    if (r.phase === 'fly' && !r.K.junk) g.rotate(-0.4);
    drawCatch(g, r.kind, L, this.clock * 2, { fast: true, open: r.phase === 'fly' });
    g.restore();
  }

  drawMeter(g, U) {
    const R = U.reel; if (!R) return;
    const a = U.a, sc = this.n > 4 ? 0.86 : 1;
    const x = a.x, y = a.y - a.height - 66 * sc;
    const pulling = R.pullT > 0, warn = R.warnT > 0;
    g.save(); g.translate(x + (pulling ? Math.sin(this.clock * 60) * 3 : 0), y); g.scale(sc, sc);
    const w = 220, h = 26;
    ui.panel(g, -w / 2 - 16, -42, w + 32, 92, { r: 24, fill: pulling ? '#ffe0e6' : '#ffffff', lineWidth: 5, shadow: true });
    // progress: fish swimming toward the shore
    const py = -22;
    g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-w / 2 + 10, py); g.lineTo(w / 2 - 10, py); g.stroke();
    g.strokeStyle = '#3fa7ff'; g.beginPath(); g.moveTo(w / 2 - 10, py); g.lineTo(w / 2 - 10 - (w - 20) * clamp(R.prog, 0, 1), py); g.stroke();
    const fxp = w / 2 - 10 - (w - 20) * clamp(R.prog, 0, 1);
    g.save(); g.translate(fxp, py); g.scale(-1, 1); g.rotate(pulling ? Math.sin(this.clock * 30) * 0.3 : 0);
    drawCatch(g, R.f.kind, 28, this.clock); g.restore();
    // the basket at the end
    g.fillStyle = '#d9a35c'; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-w / 2 - 6, py - 9); g.lineTo(-w / 2 + 14, py - 9); g.lineTo(-w / 2 + 10, py + 9); g.lineTo(-w / 2 - 2, py + 9); g.closePath(); g.fill(); g.stroke();
    // tension bar
    const ty = 4;
    g.save(); ui.roundRect(g, -w / 2, ty, w, h, 12); g.clip();
    for (const [z0, z1, col] of [[0, 0.55, '#5ddc6a'], [0.55, 0.78, '#ffd23f'], [0.78, 1, '#ff4d6d']]) {
      g.globalAlpha = 0.35; g.fillStyle = col; g.fillRect(-w / 2 + z0 * w, ty, (z1 - z0) * w, h);
      const end = clamp(R.shown, z0, z1);
      if (end > z0) { g.globalAlpha = 1; g.fillRect(-w / 2 + z0 * w, ty, (end - z0) * w, h); }
    }
    g.restore();
    ui.roundRect(g, -w / 2, ty, w, h, 12); g.lineWidth = 4; g.strokeStyle = R.shown > 0.78 && Math.sin(this.clock * 30) > 0 ? '#ff4d6d' : NAVY; g.stroke();
    // label
    if (pulling || warn) {
      const k = 1 + Math.sin(this.clock * 20) * 0.08;
      g.save(); g.translate(0, -66); g.scale(k, k);
      ui.text(g, pulling ? 'WAIT!' : 'Tug!', 0, 0, { size: 40, color: '#ff4d6d', strokeWidth: 8 });
      g.restore();
    } else if (!U.p.isAI) {
      ui.glyph(g, 'a', -w / 2 - 30, ty + h / 2, 40, { pulse: true });
      ui.text(g, 'REEL!', 0, -66, { size: 34, color: '#ffffff', strokeWidth: 7 });
    }
    g.restore();
  }

  /** Centre of the scoreboard's timer gap (off-centre for odd player counts). */
  timerX() { return W / 2; }   // ui.scoreboard centres its gap

  drawHUD(g) {
    const scores = this.units.map((u) => u.score);
    const m = Math.max(...scores);
    ui.scoreboard(g, this.players, scores, { y: 22, avoidCenter: true, format: (v) => `${v}`, highlight: scores.map((s) => m > 0 && s === m) });
    ui.timer(g, DURATION - this.t, this.timerX(), 60);
    if (this.frenzy) {
      const k = this.t - this.frenzyT;
      const pulse = 1 + Math.sin(this.t * 8) * 0.05;
      g.save(); g.translate(W / 2, 140); g.scale(pulse, pulse);
      ui.text(g, 'FISH FRENZY!', 0, 0, { size: 44, color: '#5fd1ff', weight: 800 });
      g.restore();
      if (k < 2) ui.banner(g, 'FISH FRENZY!', k, { size: 150, y: H / 2 - 60, color: '#5fd1ff' });
    }
    if (this.goldBanner) {
      const { t, U } = this.goldBanner;
      g.save(); g.globalAlpha = clamp(2.2 - t, 0, 1);
      ui.banner(g, `${playerName(U.p)}: GOLDEN FISH!`, t, { size: 96, y: 300, color: '#ffd23f' });
      g.restore();
    }
    // how-to reminder for the first seconds
    if (this.t < 7) {
      const al = this.t < 6 ? 1 : 7 - this.t;
      g.save(); g.globalAlpha = al;
      ui.panel(g, W / 2 - 520, 168, 1040, 70, { r: 35, fill: '#fff8ec' });
      ui.glyph(g, 'stick', W / 2 - 486, 203, 46);
      ui.glyph(g, 'a', W / 2 - 432, 203, 46, { pulse: true });
      ui.text(g, 'Aim and cast!  Wait for the big !  then press A', W / 2 + 56, 204, { size: 34, color: NAVY, stroke: false, maxWidth: 820 });
      g.restore();
    }
  }
}

function star4(g, x, y, r, color) {
  g.save(); g.translate(x, y); g.fillStyle = color; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.restore();
}

function drawDragonfly(g, x, y, face, t, col) {
  g.save(); g.translate(x, y); g.scale(face, 1);
  const flap = Math.sin(t * 40) * 0.5 + 0.5;
  g.fillStyle = 'rgba(220,245,255,0.75)'; g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 1.5;
  for (const s of [-1, 1]) {
    g.beginPath(); g.ellipse(-2, s * (6 + flap * 4) - 4, 16, 5 + flap * 2, s * 0.3, 0, TAU); g.fill(); g.stroke();
  }
  g.strokeStyle = NAVY; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(12, -4); g.lineTo(-24, -2); g.stroke();
  g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); g.moveTo(12, -4); g.lineTo(-24, -2); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(14, -4, 5, 0, TAU); g.fill(); g.stroke();
  g.restore();
}
