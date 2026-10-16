// Candy Mini-Golf - everyone putts at the same time on the same candyland
// hole. Move the target marker with the stick: the line from the ball shows
// the direction and its length the strength (the ball rolls about that far on
// flat felt). Press A to putt. Balls bounce off gumdrops and
// candy-cane rails and knock each other around. 3 short holes; the first
// ball in the cup scores the most, a hole in one earns a bonus.
//
// Art hooks (procedural fallbacks ship today; see image-requests-history.md):
//   bg/mini-golf  thumb/mini-golf  prop/golf-gumdrop  prop/golf-lollipop
//   prop/golf-spinner-hub  prop/golf-donut  prop/golf-donut-exit  prop/golf-jelly
//   prop/golf-cookie-bridge  prop/golf-flag  prop/golf-cup
// Poses: 'putt' while lining up and 'putt-swing' on the stroke; characters
// without those frames yet fall back to crouch / action.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { clamp, lerp, rand, chance, TAU, ease, placementsFromScores } from '../engine/util.js';
import {
  HOLES, BALL_R, stepBall, pointInPoly, substeps, simulate, buildField, teeSpots, powerToSpeed, powerForDistance, rollDistance, warpOut,
} from './mini-golf/course.js';
import * as D from './mini-golf/draw.js';

const NAVY = D.NAVY;
const HOLE_T = 20;                 // seconds per hole
const METER_T = 1.0;               // (CPU planning only: time it used to take to line up)
const AIM_MIN = 45;                 // shortest target distance (px)
const AIM_MAX = 620;                // longest: a full-power putt
const AIM_SPEED = 560;              // target marker speed at full stick (px/s)
const PTS = [5, 4, 3, 2, 2, 1, 1, 1];
const HIO_BONUS = 2;
const WALK = 660;
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;

// CPU tuning per level (Easy, Normal, Hard)
const AI_THINK = [[0.8, 1.6], [0.5, 1.0], [0.3, 0.6]];
const AI_AIM_ERR = [0.06, 0.03, 0.012];
const AI_OFFSETS = [[0, -0.12, 0.12], [-0.24, -0.12, 0, 0.12, 0.24], [-0.4, -0.22, -0.1, 0, 0.1, 0.22, 0.4]];
const SIM_BUDGET = 12;             // CPU shot simulations per frame (all CPUs together)

export const meta = {
  id: 'mini-golf',
  title: 'Candy Mini-Golf',
  category: 'party',
  type: 'Everyone putts at once',
  goal: 'Putt your ball into the cup before everyone else - 3 candy holes!',
  controls: [['stick', 'Move the target: the longer the line, the harder the putt'], ['a', 'Putt!']],
  tips: ['The first ball in the cup gets the most points!', 'Put the target on the cup to roll right up to it. Watch out for bumpers!', 'A hole in one wins a bonus!'],
  music: 'gameon',
  duration: '3 holes, about 60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) { D.drawIcon(g, x, y, w, h, t); },
};

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.solo = this.n === 1;
    this.cam = api.camera;
    if (this.cam) this.cam.maxZoom = Math.min(this.cam.maxZoom, 1.35);
    this.scale = this.n <= 4 ? 0.82 : this.n <= 6 ? 0.74 : 0.62;   // 7-8: smaller, so the tee isn't a heap
    this.t = 0;           // animation clock (always runs)
    this.st = 0;          // spinner clock
    this.ht = 0;          // time into the current hole's play
    this.pt = 0;          // time into the current phase
    this.phase = 'play';
    this.frame = 0;
    this.hioT = -10; this.hioWho = null;
    this.over = false;
    this.units = this.players.map((p, i) => ({
      p, i, a: new Actor(p, { scale: this.scale }), pts: 0, timeBonus: 0, hio: 0, sunk: 0,
      ball: null, aim: 0, side: -1, turnHold: 0, ai: { phase: 'idle' }, guide: null,
    }));
    for (const U of this.units) {
      U.ctx = { hole: null, t: 0, spinner: true, ev: (type, x, y, s, ex) => this.onEvent(U, type, x, y, s, ex), rng: Math.random };
    }
    this.loadHole(0);
  }

  // --- holes ---------------------------------------------------------------------------
  loadHole(idx) {
    this.holeIdx = idx;
    const hole = this.hole = HOLES[idx];
    this.floor = D.buildFloor(hole);
    this.rails = D.buildRails(hole);
    this.field = buildField(hole);
    this.bumpSq = hole.bumpers.map(() => 0);
    this.jellyWob = 0;
    this.finished = 0; this.galleryN = 0;
    this.lastSinkFrame = -1; this.lastRank = 0;
    this.st = 0; this.ht = 0;
    const spots = teeSpots(hole, this.n);
    this.units.forEach((U, i) => {
      const s = spots[i];
      U.ball = { x: s.x, y: s.y, vx: 0, vy: 0, z: 0, vz: 0, mode: 'play', jellyLock: false, lipLock: false, sinkT: 0, hideT: 0 };
      U.lastShot = { x: s.x, y: s.y };
      U.aim = 0; U.side = -1; U.turnHold = 0;
      U.done = false; U.rank = 0; U.holePts = 0; U.holeHio = false; U.closest = false; U.strokes = 0; U.sinkTime = null;
      U.charging = false; U.power = 0; U.meterT = 0; U.swingT = 0; U.celebT = 0; U.gallery = null; U.guide = null; U.tgt = null; U.wasReady = false;
      U.ai = { phase: 'idle' };
      U.ctx.hole = hole;
      if (U.p.isAI) { U.p.ctrl.hold('a', false); U.p.ctrl.move(0, 0); }
      const sp = this.standSpot(U);
      U.a.x = sp.x; U.a.y = sp.y; U.a.facing = -U.side; U.a.snap(); U.a.setPose('idle');
      U.a.scale = this.actorScale(U.a.y);
    });
  }

  actorScale(y) { return this.scale * depthScale(y, { top: 250, near: 1040, far: 0.86, nearScale: 1.04 }); }

  standSpot(U) {
    const b = U.ball;
    const off = 34 + Math.min(70, U.a.width * 0.3);
    return { x: clamp(b.x + U.side * off, 70, W - 70), y: b.y - 6 };
  }

  canPutt(U) {
    const b = U.ball;
    if (this.phase !== 'play' || U.done || b.mode !== 'play' || b.vx !== 0 || b.vy !== 0 || b.z > 0) return false;
    const sp = this.standSpot(U);
    return Math.hypot(U.a.x - sp.x, U.a.y - sp.y) < 40;
  }

  // --- frame ---------------------------------------------------------------------------
  preUpdate(dt) {
    this.t += dt; this.st += dt;
    for (const U of this.units) { U.a.setPose('idle'); U.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.frame++;
    this.pt += dt;
    for (let i = 0; i < this.bumpSq.length; i++) this.bumpSq[i] = Math.max(0, this.bumpSq[i] - dt * 4);
    this.jellyWob = Math.max(0, this.jellyWob - dt * 1.6);
    if (this.phase === 'play') {
      this.ht += dt; this.st += dt;
      this.updatePlay(dt);
      const left = HOLE_T - this.ht;
      if (left <= 3 && Math.ceil(left) !== Math.ceil(left + dt) && left > 0) sfx('tick', { vol: 0.5 });
      if (this.units.every((U) => U.done)) this.endHole('done');
      else if (left <= 0) this.endHole('time');
    } else if (this.phase === 'holeEnd') {
      if (this.pt >= 3.0) {
        if (this.holeIdx < HOLES.length - 1) { this.phase = 'wipe'; this.pt = 0; this.wiped = false; snd('golf-wipe', 'whoosh'); }
        else this.finishGame();
      }
    } else if (this.phase === 'wipe') {
      if (this.pt >= 0.45 && !this.wiped) { this.wiped = true; this.loadHole(this.holeIdx + 1); }
      if (this.pt >= 0.9) { this.phase = 'intro'; this.pt = 0; sfx('star'); }
    } else if (this.phase === 'intro') {
      this.st += dt;
      if (this.pt >= 1.8) {
        this.phase = 'play'; this.pt = 0; this.ht = 0;
        sfx('whistle');
        particles.popText(this.hole.tee.x, this.hole.tee.y - 240, 'Go!', '#ffd23f', 80);
      }
    }
    this.updateBallFx(dt);
    this.updateCharacters(dt);
    this.updateCamera();
  }

  postUpdate(dt) {
    this.t += dt; this.pt += dt;
    this.updateCharacters(dt);
  }

  updatePlay(dt) {
    // input / CPU
    // (CPU shot planning shares a per-frame budget; the start rotates so nobody waits on slot order)
    let budget = SIM_BUDGET;
    const n0 = this.frame % this.n;
    for (let k = 0; k < this.n; k++) { const U = this.units[(n0 + k) % this.n]; if (U.p.isAI) budget = this.ai(U, dt, budget); }
    for (const U of this.units) {
      this.updateAim(U, dt);
      this.updateShot(U, dt);
    }
    // physics: shared substeps so balls collide with each other fairly
    let maxS = 0;
    for (const U of this.units) { const b = U.ball; if (b.mode === 'play') maxS = Math.max(maxS, Math.hypot(b.vx, b.vy)); }
    const n = substeps(maxS, dt), h = dt / n;
    for (let k = 0; k < n; k++) {
      for (const U of this.units) {
        const b = U.ball;
        if (b.mode !== 'play') continue;
        U.ctx.t = this.st - dt + (k + 1) * h;
        const e = stepBall(b, h, U.ctx);
        if (e) this.ballEvent(U, e);
      }
      this.collideBalls();
    }
    for (const U of this.units) if (U.ball.mode === 'play' && !pointInPoly(U.ball.x, U.ball.y, this.hole.outline)) this.ballEvent(U, 'oob');
  }

  /** Aim with a target marker relative to the ball: direction = aim, distance = strength. */
  resetTarget(U) {
    const b = U.ball, cup = this.hole.cup;
    const d = clamp(Math.hypot(cup.x - b.x, cup.y - b.y) * 0.7, AIM_MIN + 60, 340);
    const a = Math.atan2(cup.y - b.y, cup.x - b.x);
    U.tgt = { dx: Math.cos(a) * d, dy: Math.sin(a) * d };
  }

  updateAim(U, dt) {
    if (U.done || this.phase !== 'play') return;
    const ready = this.canPutt(U);
    if (!ready) { U.wasReady = false; return; }
    if (!U.wasReady || !U.tgt) { U.wasReady = true; this.resetTarget(U); }
    const c = U.p.ctrl;
    let mx = c.x, my = c.y;
    const mag = Math.hypot(mx, my);
    if (mag > 0.15) {
      // analog sticks move it by how far they're tilted; keys/d-pad speed up the longer they're held
      const analog = c.kind === 'pad' && Math.hypot(c.sx, c.sy) > 0.15;
      if (!analog) { U.turnHold += dt; const k = Math.min(1, 0.35 + U.turnHold * 1.1); mx = (mx / mag) * k; my = (my / mag) * k; }
      U.tgt.dx += mx * AIM_SPEED * dt; U.tgt.dy += my * AIM_SPEED * dt;
    } else U.turnHold = 0;
    let d = Math.hypot(U.tgt.dx, U.tgt.dy);
    if (d < AIM_MIN) { const a = d > 0.01 ? Math.atan2(U.tgt.dy, U.tgt.dx) : U.aim; U.tgt.dx = Math.cos(a) * AIM_MIN; U.tgt.dy = Math.sin(a) * AIM_MIN; d = AIM_MIN; }
    if (d > AIM_MAX) { U.tgt.dx *= AIM_MAX / d; U.tgt.dy *= AIM_MAX / d; d = AIM_MAX; }
    U.aim = Math.atan2(U.tgt.dy, U.tgt.dx);
    U.power = clamp(powerForDistance(d), 0.03, 1);
    const cs = Math.cos(U.aim);
    if (cs > 0.25) U.side = -1; else if (cs < -0.25) U.side = 1;
  }

  updateShot(U, dt) {
    U.swingT = Math.max(0, U.swingT - dt);
    if (!this.canPutt(U) || !U.tgt) return;
    if (U.p.ctrl.pressed('a')) this.putt(U);
  }

  putt(U) {
    const b = U.ball, p = Math.max(0.03, U.power), v = powerToSpeed(p);
    b.vx = Math.cos(U.aim) * v; b.vy = Math.sin(U.aim) * v;
    U.strokes++; U.lastShot = { x: b.x, y: b.y }; b.pinned = false;
    U.charging = false; U.swingT = 0.22; U.shotPow = p; U.wasReady = false;
    U.a.playOnce('putt-swing', 0.35); U.a.squash(0.22);   // falls back to action
    snd('golf-putt', 'hit', { vol: 0.45 + 0.55 * p });
    if (p > 0.6) sfx('whoosh', { vol: 0.5 * p });
    particles.burst(b.x, b.y, { type: 'dust', count: 4 + Math.round(p * 6), colors: ['#ffffff', '#d8ffe4'], angle: U.aim + Math.PI, spread: 0.7, speed: [60, 200] });
    if (p > 0.9) particles.popText(b.x, b.y - 50, 'Full power!', '#ff6fb1', 38);
    if (!U.p.isAI) U.p.ctrl.rumble(0.25 + 0.4 * p, 110);
    U.guide = null;
  }

  collideBalls() {
    const us = this.units;
    for (let i = 0; i < us.length; i++) {
      const A = us[i].ball;
      if (A.mode !== 'play' || A.z > 10) continue;
      for (let j = i + 1; j < us.length; j++) {
        const B = us[j].ball;
        if (B.mode !== 'play' || B.z > 10) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = BALL_R * 2;
        if (d >= min) continue;
        const nx = d > 0.001 ? dx / d : 1, ny = d > 0.001 ? dy / d : 0;
        const push = (min - d) / 2;
        A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push;
        const rel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
        if (rel <= 0) continue;
        const aStill = A.vx === 0 && A.vy === 0, bStill = B.vx === 0 && B.vy === 0;
        const jv = ((1 + 0.93) / 2) * rel;
        A.vx -= jv * nx; A.vy -= jv * ny; B.vx += jv * nx; B.vy += jv * ny;
        if (rel > 90) this.clack(us[i], us[j], A.x + nx * BALL_R, A.y + ny * BALL_R, rel, aStill, bStill);
      }
    }
  }

  clack(UA, UB, x, y, rel, aStill, bStill) {
    snd('golf-clack', 'bonk', { vol: clamp(rel / 900, 0.3, 1) });
    particles.burst(x, y, { type: 'spark', count: Math.round(clamp(rel / 60, 4, 14)), colors: [UA.p.color, UB.p.color, '#ffffff'], speed: [120, 380] });
    if (rel > 600) {
      particles.burst(x, y - 10, { type: 'star', count: 5, colors: ['#ffd23f', '#ffffff'], speed: [150, 320], size: [12, 22] });
      particles.popText(x, y - 40, 'Bonk!', '#ffffff', 42);
      fx.shake(this.n > 4 ? 3 : 5, 0.15);
    }
    for (const [U, still] of [[UA, aStill], [UB, bStill]]) {
      if (still && rel > 250 && !U.done) { U.a.playOnce('surprised', 0.5); U.a.emote('exclaim', 0.8); if (!U.p.isAI) U.p.ctrl.rumble(0.4, 120); }
    }
  }

  onEvent(U, type, x, y, s, ex) {
    if (type === 'rail') {
      if (s > 90) {
        snd('golf-rail', 'tock', { vol: clamp(s / 1000, 0.25, 0.9) });
        if (s > 250) particles.burst(x, y, { type: 'spark', count: Math.round(clamp(s / 120, 3, 9)), colors: ['#ffffff', '#ff4d6d'], speed: [80, 260] });
      }
    } else if (type === 'bumper') {
      const i = this.hole.bumpers.findIndex((bp) => bp.x === ex.cx && bp.y === ex.cy);
      if (i >= 0) this.bumpSq[i] = 1;
      const c = D.GUM_COLORS[(this.hole.bumpers[i]?.c ?? 0) % D.GUM_COLORS.length];
      snd('golf-gumdrop', 'boing', { vol: clamp(s / 700, 0.35, 1) });
      particles.burst(x, y, { type: 'sparkle', count: 6, colors: [c[0], c[1], '#ffffff'], speed: [80, 240], size: [10, 18] });
      if (s > 500) particles.popText(x, y - 40, 'Boing!', c[0], 40);
    } else if (type === 'blade' || type === 'hub') {
      if (s > 60) {
        snd('golf-whack', 'bonk', { vol: clamp(s / 700, 0.3, 0.9) });
        particles.burst(x, y, { type: 'star', count: 5, colors: ['#ff7ac6', '#ffd23f', '#ffffff'], speed: [120, 300], size: [10, 18] });
        if (type === 'blade' && s > 200 && !U.done) { particles.popText(x, y - 40, 'Whack!', '#ff6fb1', 40); U.a.emote('exclaim', 0.7); }
      }
    } else if (type === 'jelly') {
      this.jellyWob = 1;
      snd('golf-jelly', 'bounce', { vol: 0.9 });
      particles.burst(x, y, { type: 'heart', count: 6, colors: ['#ff4d7e', '#ffb3c8'], speed: [80, 220] });
      particles.ring(x, y, '#ff8fb6', 140, 0.4);
      particles.popText(x, y - 60, 'Boing!', '#ff4d7e', 48);
    } else if (type === 'land') {
      sfx('land', { vol: 0.5 });
      particles.burst(x, y, { type: 'dust', count: 5, colors: ['#ffffff'] });
    } else if (type === 'lip') {
      snd('golf-lip', 'tock', { vol: 0.8 });
      particles.popText(x, y - 50, 'Too fast!', '#ffffff', 40);
      if (!U.done) U.a.playOnce('surprised', 0.6);
    }
  }

  ballEvent(U, e) {
    const b = U.ball;
    if (e === 'sink') this.sink(U);
    else if (e === 'splash') {
      b.mode = 'splash'; b.hideT = 1.0; b.vx = b.vy = 0;
      snd('golf-choc-splash', 'splash', { vol: 0.9 });
      particles.burst(b.x, b.y, { type: 'drop', count: 16, colors: ['#7b4526', '#5a301b', '#c98b4f'], speed: [180, 420], angle: -Math.PI / 2, spread: 1.1 });
      particles.ring(b.x, b.y, '#c98b4f', 90, 0.45);
      particles.popText(b.x, b.y - 50, 'Splash!', '#c98b4f', 46);
      U.a.playOnce('surprised', 0.7); U.a.emote('sweat', 1.2); voice(U.p.charId, 'gasp');
      if (!U.p.isAI) U.p.ctrl.rumble(0.4, 160);
    } else if (e === 'warp') {
      b.mode = 'warp'; b.hideT = 0.45;
      snd('golf-warp', 'magic', { vol: 0.9 });
      const a = this.hole.donut.a;
      particles.burst(a.x, a.y, { type: 'sparkle', count: 16, colors: ['#d9a8ff', '#ffffff', '#ff8fc8'], speed: [80, 280] });
      particles.ring(a.x, a.y, '#d9a8ff', 120, 0.4);
    } else if (e === 'oob') {
      b.mode = 'splash'; b.hideT = 0.5; b.vx = b.vy = 0;
      sfx('pop');
    }
  }

  updateBallFx(dt) {
    for (const U of this.units) {
      const b = U.ball;
      if (b.mode === 'sinking') {
        b.sinkT += dt;
        if (b.sinkT >= 0.3) b.mode = 'sunk';
      } else if (b.mode === 'splash' || b.mode === 'warp') {
        b.hideT -= dt;
        if (b.hideT <= 0) {
          if (b.mode === 'warp') {
            warpOut(b, this.hole, rand(-0.3, 0.3)); b.mode = 'play';
            const o = this.hole.donut.b;
            particles.burst(o.x, o.y, { type: 'sparkle', count: 18, colors: ['#fff6c0', '#ffd23f', '#ffffff'], speed: [80, 300] });
            particles.ring(o.x, o.y, '#ffd23f', 130, 0.4);
            particles.popText(o.x, o.y - 70, 'Zoom!', '#ffd23f', 46);
            snd('golf-warp-out', 'pop', { vol: 0.8 });
          } else {
            b.x = U.lastShot.x; b.y = U.lastShot.y; b.vx = b.vy = 0; b.z = 0; b.vz = 0; b.mode = 'play';
            b.jellyLock = false; b.lipLock = false;
            sfx('pop', { vol: 0.6 });
            particles.burst(b.x, b.y, { type: 'sparkle', count: 8, colors: [U.p.color, '#ffffff'], speed: [40, 160] });
          }
        }
      } else if (b.mode === 'play') {
        const s = Math.hypot(b.vx, b.vy);
        // safety net: a ball that jiggles for ages (pinned between the slope and
        // something) is settled where it is, so its owner can putt again
        b.slowT = s > 0 && s < 140 ? (b.slowT || 0) + dt : 0;
        if (b.slowT > 2.5 && !b.pinned) { b.pinned = true; b.vx = b.vy = 0; b.slowT = 0; }
        if (s > 450 && Math.random() < dt * 22) particles.trail(b.x, b.y - b.z, { type: 'sparkle', colors: [U.p.color, '#ffffff'], size: [6, 12], speed: [0, 30], life: [0.2, 0.4] });
      }
    }
  }

  sink(U) {
    const b = U.ball, cup = this.hole.cup;
    b.mode = 'sinking'; b.sinkT = 0; b.sx = b.x; b.sy = b.y; b.vx = b.vy = 0;
    U.done = true; U.sinkTime = this.ht; U.charging = false;
    let rank;
    if (this.lastSinkFrame === this.frame) rank = this.lastRank;
    else rank = this.finished + 1;
    this.finished++; this.lastSinkFrame = this.frame; this.lastRank = rank;
    let pts = this.solo ? 3 + Math.ceil(Math.max(0, HOLE_T - this.ht) / 2) : PTS[Math.min(rank, PTS.length) - 1];
    const hio = U.strokes === 1;
    if (hio) pts += HIO_BONUS;
    U.rank = rank; U.holePts = pts; U.holeHio = hio; U.pts += pts; U.sunk++;
    U.timeBonus += Math.max(0, HOLE_T - this.ht);
    U.celebT = 1.3;
    U.gallery = this.gallerySpot(this.galleryN++);
    // juice
    snd('golf-cup', 'collect', { step: Math.max(0, 5 - rank) });
    particles.burst(cup.x, cup.y, { type: 'confetti', count: 28, colors: [U.p.color, '#ffffff', '#ffd23f', '#ff6fb1'], speed: [200, 520], angle: -Math.PI / 2, spread: 1.2 });
    particles.ring(cup.x, cup.y, U.p.color, 140, 0.45);
    particles.popText(cup.x, cup.y - 150, this.solo ? `+${pts}` : `${ORD[rank - 1]}! +${pts - (hio ? HIO_BONUS : 0)}`, U.p.color, 54);
    U.a.playOnce('celebrate', 1.3, 'cheer'); U.a.squash(0.3); U.a.emote('heart', 1.4);
    voice(U.p.charId, 'yay');
    if (!U.p.isAI) U.p.ctrl.rumble(0.6, 240);
    if (rank === 1) { fx.shake(5, 0.2); if (this.cam && !hio) this.cam.punch(cup.x, cup.y - 60, 1.2, 0.35); }
    if (hio) {
      U.hio++;
      this.hioT = this.t; this.hioWho = U;
      snd('golf-hio', 'fanfare'); sfx('applause', { vol: 0.7 });
      fx.flash('#fff6b0', 0.25); fx.slowmo(0.45, 0.7);
      particles.confettiRain(W, 90);
      particles.burst(cup.x, cup.y - 40, { type: 'star', count: 16, colors: ['#ffd23f', '#ffffff'], speed: [200, 520], size: [16, 30] });
      if (this.cam) this.cam.punch(cup.x, cup.y - 60, 1.3, 0.6);
      U.a.say('Hole in one!', 1.8, 'woo');
    }
  }

  gallerySpot(k) {
    const g = this.hole.gallery;
    return { x: g.x + g.step * k, y: 1018 + (k % 2) * 26 };
  }

  endHole(reason) {
    this.phase = 'holeEnd'; this.pt = 0; this.endReason = reason;
    for (const U of this.units) {
      U.charging = false; U.guide = null;
      if (U.p.isAI) { U.p.ctrl.hold('a', false); U.p.ctrl.move(0, 0); }
      const b = U.ball;
      if (b.mode === 'play') { b.vx = b.vy = 0; }
      if (!U.done) { U.a.playOnce('pout', 1.8, 'idle'); voice(U.p.charId, 'aww'); }
      else U.a.playOnce('cheer', 0.8);
    }
    if (reason === 'time') { sfx('whistle'); this.closestPoint(); } else { sfx('cheer'); fx.flash('#ffffff', 0.12); }
    // this hole's order for the summary panel
    this.summary = this.units.slice().sort((a, b) => (a.done === b.done ? (a.done ? a.rank - b.rank : (b.closest - a.closest) || a.i - b.i) : a.done ? -1 : 1));
  }

  /** Time's up: the un-sunk ball nearest the cup (by the path around walls) gets
   * 1 point, so a hole nobody sinks still gives someone something. */
  closestPoint() {
    if (this.solo) return;
    const left = this.units.filter((U) => !U.done);
    if (!left.length) return;
    const far = (U) => { const b = U.ball, p = b.mode === 'play' ? b : U.lastShot; return this.field.at(p.x, p.y); };
    const best = Math.min(...left.map(far));
    if (!(best < 1e9)) return;
    for (const U of left) {
      if (far(U) > best + 1) continue;
      U.closest = true; U.holePts = 1; U.pts += 1;
      const b = U.ball;
      particles.popText(b.x, b.y - 50, 'Closest! +1', U.p.color, 40);
      U.a.emote('star', 1.2);
    }
  }

  finishGame() {
    if (this.over) return;
    this.over = true; this.phase = 'over';
    const scores = this.units.map((U) => Math.round(U.pts * 1000 + U.timeBonus * 10));
    const placements = placementsFromScores(scores);
    const stats = this.units.map((U) => `${U.pts} pts${U.hio ? ' (hole in one!)' : ''}`);
    const w = this.units[placements.indexOf(1)];
    for (const U of this.units) U.a.playOnce(placements[U.i] === 1 ? 'celebrate' : 'clap', 1.5);
    this.api.finish({ placements, stats, solo: this.solo ? this.units[0].pts : undefined, focus: { x: w.a.x, y: w.a.y - w.a.height * 0.5, zoom: 1.3 } });
  }

  // --- characters ------------------------------------------------------------------------
  updateCharacters(dt) {
    for (const U of this.units) {
      const a = U.a, b = U.ball;
      U.celebT = Math.max(0, U.celebT - dt);
      let tx = a.x, ty = a.y, face = 0, rest = 'idle';
      if (this.phase === 'intro' || this.phase === 'wipe') {
        const sp = this.standSpot(U); tx = sp.x; ty = sp.y; face = -U.side;
      } else if (U.done) {
        if (U.celebT <= 0 && U.gallery) { tx = U.gallery.x; ty = U.gallery.y; rest = 'clap'; face = this.hole.cup.x > a.x ? 1 : -1; }
        else rest = 'celebrate';
      } else if (b.mode === 'play') {
        const s = Math.hypot(b.vx, b.vy);
        if (s < 260 || this.phase !== 'play') { const sp = this.standSpot(U); tx = sp.x; ty = sp.y; face = -U.side; }
        else face = b.x > a.x ? 1 : -1;
        if (this.canPutt(U)) rest = 'putt';   // lining up; falls back to crouch
      } else if (b.mode === 'splash') {
        const sx = U.lastShot.x + U.side * (34 + Math.min(70, a.width * 0.3)); tx = sx; ty = U.lastShot.y - 6;
      } else if (b.mode === 'warp') {
        const o = this.hole.donut.b; tx = o.x + 80; ty = o.y + 20;
      }
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      if (d > 3) {
        const v = Math.min(WALK, d * 7);
        const step = Math.min(d, v * dt);
        a.x += (dx / d) * step; a.y += (dy / d) * step;
        a.moveAnim((dx / d) * v, (dy / d) * v, WALK, { run: v > WALK * 0.6 });
      } else {
        a.x = tx; a.y = ty; a.speed = 0;
        if (face) a.facing = face;
        a.setPose(rest);
      }
      a.scale = this.actorScale(a.y);
      a.update(dt);
    }
  }

  updateCamera() {
    const cam = this.cam; if (!cam) return;
    if (this.phase !== 'play') { cam.follow(W / 2, H / 2, 1, 2); return; }
    const cup = this.hole.cup;
    const pts = [{ x: cup.x, y: cup.y - 120 }];
    for (const U of this.units) {
      if (U.done) continue;
      const b = U.ball;
      pts.push({ x: b.x, y: b.y }, { x: U.a.x, y: U.a.y - U.a.height - 40 }, { x: U.a.x, y: U.a.y + 30 });
    }
    cam.frame(pts, 230, 1.4);
  }

  // --- CPU ---------------------------------------------------------------------------------
  ai(U, dt, budget) {
    const A = U.ai, c = U.p.ctrl, lvl = clamp(U.p.aiLevel ?? 0, 0, 2);
    if (!this.canPutt(U)) {
      if (A.phase !== 'idle') { c.hold('a', false); c.move(0, 0); A.phase = 'idle'; }
      return budget;
    }
    if (A.phase === 'idle') {
      A.phase = 'think';
      A.t = rand(...AI_THINK[lvl]) + (lvl === 0 && chance(0.15) ? 1 : 0);
      A.plan = this.makePlan(U, lvl);
    }
    if (A.phase === 'think') {
      A.t -= dt;
      budget = this.evalPlan(U, A.plan, budget);
      if (A.t <= 0 && A.plan.i >= A.plan.cands.length) {
        const best = A.plan.cands.slice().sort((x, y) => x.cost - y.cost);
        let pickI = 0;
        if (lvl === 0) pickI = Math.floor(rand(0, Math.min(3, best.length)));
        else if (lvl === 1 && chance(0.2)) pickI = Math.min(1, best.length - 1);
        let { a: ang, p: pow } = best[pickI];
        if (lvl === 0 && chance(0.08)) { ang = Math.atan2(this.hole.cup.y - U.ball.y, this.hole.cup.x - U.ball.x); pow = powerForDistance(Math.hypot(this.hole.cup.x - U.ball.x, this.hole.cup.y - U.ball.y)); }
        ang += gauss() * AI_AIM_ERR[lvl];
        pow *= lvl === 0 ? (chance(0.7) ? rand(1.02, 1.3) : rand(0.85, 1.0)) : lvl === 1 ? rand(0.93, 1.1) : rand(0.97, 1.03);
        A.ang = ang; A.pow = clamp(pow, 0.03, 1);
        // where to put the target marker for that shot (distance = how far it rolls on flat felt)
        const td = clamp(rollDistance(powerToSpeed(A.pow)), AIM_MIN, AIM_MAX);
        A.tx = Math.cos(ang) * td; A.ty = Math.sin(ang) * td;
        A.phase = 'aim'; A.ct = 0;
      }
    }
    if (A.phase === 'aim') {
      // slide the marker to the chosen spot like a player would, then putt
      A.ct += dt;
      if (!U.tgt) return budget;
      const ex = A.tx - U.tgt.dx, ey = A.ty - U.tgt.dy, e = Math.hypot(ex, ey);
      if (e < 8 || A.ct > 5) { c.move(0, 0); U.tgt.dx = A.tx; U.tgt.dy = A.ty; c.press('a'); A.phase = 'wait'; }
      else { const k = clamp(e / 120, 0.2, 1); c.move((ex / e) * k, (ey / e) * k); }
    }
    return budget;
  }

  makePlan(U, lvl) {
    const b = U.ball, hole = this.hole, cup = hole.cup, f = this.field;
    const bases = [{ a: Math.atan2(cup.y - b.y, cup.x - b.x), d: Math.hypot(cup.x - b.x, cup.y - b.y) }];
    const route = f.route(b.x, b.y);
    for (let k = route.length - 1; k >= 0; k -= 2) {
      const q = route[k];
      if (f.clear(b.x, b.y, q.x, q.y)) { bases.push({ a: Math.atan2(q.y - b.y, q.x - b.x), d: Math.hypot(q.x - b.x, q.y - b.y) }); break; }
    }
    if (lvl >= 1 || chance(0.6)) {
      if (hole.jelly && b.x < hole.river.cx) { const j = hole.jelly; bases.push({ a: Math.atan2(j.y - b.y, j.x - b.x), d: Math.hypot(j.x - b.x, j.y - b.y) + 500 }); }
      if (hole.donut && b.y > 585) { const o = hole.donut.a; bases.push({ a: Math.atan2(o.y - b.y, o.x - b.x), d: Math.hypot(o.x - b.x, o.y - b.y) + 150 }); }
    }
    const cands = [];
    for (const base of bases) {
      const pd = powerForDistance(base.d);
      const powers = lvl === 0 ? [pd * 1.05, 0.6, 0.9] : lvl === 1 ? [pd, pd * 1.1, 0.45, 0.7, 0.95] : [pd * 0.95, pd * 1.04, pd * 1.15, 0.4, 0.65, 0.9];
      for (const off of AI_OFFSETS[lvl]) for (const p of powers) cands.push({ a: base.a + off, p: clamp(p, 0.03, 1), cost: 1e9 });
    }
    return { cands, i: 0 };
  }

  evalPlan(U, plan, budget) {
    const b = U.ball, hole = this.hole, f = this.field;
    const startCost = f.at(b.x, b.y);
    while (plan.i < plan.cands.length && budget > 0) {
      const c = plan.cands[plan.i++]; budget--;
      const v = powerToSpeed(c.p);
      const r = simulate(hole, b.x, b.y, Math.cos(c.a) * v, Math.sin(c.a) * v, { t0: this.st + Math.max(0, U.ai.t) + 0.3 + c.p * METER_T, spinner: true, dt: 1 / 30, px: 12 });
      if (r.end === 'sink') c.cost = -1000 + c.p * 10;
      else if (r.end === 'splash' || r.end === 'oob') c.cost = startCost + 500;
      else c.cost = f.at(r.x, r.y);
    }
    return budget;
  }

  // --- drawing ---------------------------------------------------------------------------
  draw(g) {
    const hole = this.hole, t = this.t;
    g.drawImage(this.floor, 0, 0);
    if (hole.river) D.drawRiver(g, hole, t);
    if (hole.bridge) D.drawBridge(g, hole.bridge);
    if (hole.slope) D.drawSlopeArrows(g, hole.slope, t);
    if (hole.jelly) D.drawJelly(g, hole.jelly, this.jellyWob, t);
    if (hole.donut) { D.drawDonut(g, hole.donut.a.x, hole.donut.a.y, false, t); D.drawDonut(g, hole.donut.b.x, hole.donut.b.y, true, t); }
    D.drawCup(g, hole.cup);
    hole.bumpers.forEach((bp, i) => D.drawGumdrop(g, bp, Math.sin(this.bumpSq[i] * Math.PI) * this.bumpSq[i]));
    if (hole.spinner) D.drawSpinner(g, hole.spinner, this.st);
    g.drawImage(this.rails, 0, 0);
    // splash ripples
    for (const U of this.units) {
      const b = U.ball;
      if (b.mode === 'splash' && b.hideT > 0.5) {
        const k = 1 - (b.hideT - 0.5) / 0.5;
        g.save(); g.strokeStyle = `rgba(255,220,180,${1 - k})`; g.lineWidth = 4; g.beginPath(); g.ellipse(b.x, b.y, 10 + k * 40, 6 + k * 24, 0, 0, TAU); g.stroke(); g.restore();
      }
    }
    // aim guides and power meters (on the ground)
    for (const U of this.units) this.drawGuide(g, U);
    // y-sorted scene
    const list = [];
    for (const U of this.units) {
      const b = U.ball;
      if (b.mode === 'play' || b.mode === 'sinking') list.push({ y: b.y, fn: () => this.drawBallOf(g, U) });
      list.push({ y: U.a.y, fn: () => this.drawUnit(g, U) });
    }
    const near = this.units.some((U) => U.ball.mode === 'play' && Math.hypot(U.ball.x - hole.cup.x, U.ball.y - hole.cup.y) < 110);
    list.push({ y: hole.cup.y + 1, fn: () => D.drawFlag(g, hole.cup, t, near ? 0.45 : 1) });
    list.sort((p, q) => p.y - q.y);
    for (const e of list) e.fn();
  }

  drawBallOf(g, U) {
    const b = U.ball;
    if (b.mode === 'sinking') {
      const k = clamp(b.sinkT / 0.3, 0, 1), cup = this.hole.cup;
      D.drawBall(g, lerp(b.sx, cup.x, k), lerp(b.sy, cup.y, k) + k * 6, 0, U.p.color, 1 - k * 0.6);
      return;
    }
    D.drawBall(g, b.x, b.y, b.z, U.p.color);
    // a little tag over a human's ball when it's away from its owner
    if (!U.p.isAI && this.n > 1 && Math.hypot(U.a.x - b.x, U.a.y - b.y) > 200) {
      ui.text(g, U.p.tag, b.x, b.y - b.z - 32, { size: 24, color: U.p.color, strokeWidth: 5 });
    }
  }

  drawGuide(g, U) {
    if (U.done || this.phase !== 'play') return;
    const b = U.ball;
    if (!this.canPutt(U)) return;
    const human = !U.p.isAI;
    g.save();
    if (!U.tgt) { g.restore(); return; }
    // straight line from the ball to the target marker; its length is the strength
    const tx = b.x + U.tgt.dx, ty = b.y + U.tgt.dy, d = Math.hypot(U.tgt.dx, U.tgt.dy);
    const k = clamp((d - AIM_MIN) / (AIM_MAX - AIM_MIN), 0, 1);
    const col = `hsl(${Math.round(130 - 130 * k)}, 85%, 55%)`;   // green (soft) .. red (full power)
    const dots = Math.max(2, Math.round(d / 34));
    g.globalAlpha = human ? 0.95 : 0.5;
    for (let i = 1; i < dots; i++) {
      const u = i / dots, x = b.x + U.tgt.dx * u, y = b.y + U.tgt.dy * u;
      if (Math.hypot(x - b.x, y - b.y) < BALL_R + 8) continue;
      g.fillStyle = NAVY; g.beginPath(); g.arc(x, y, human ? 6.5 : 5, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(x, y, human ? 4.3 : 3.2, 0, TAU); g.fill();
    }
    // the marker: a ring with a cross, gold when it's on the cup
    const cup = this.hole.cup, onCup = Math.hypot(tx - cup.x, ty - cup.y) < 26;
    const pulse = 1 + Math.sin(this.t * 6) * 0.06, rr = (human ? 26 : 18) * pulse;
    g.lineWidth = 7; g.strokeStyle = NAVY; g.beginPath(); g.ellipse(tx, ty, rr, rr * 0.62, 0, 0, TAU); g.stroke();
    g.lineWidth = 4; g.strokeStyle = onCup ? '#ffd23f' : U.p.color; g.beginPath(); g.ellipse(tx, ty, rr, rr * 0.62, 0, 0, TAU); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(tx - rr * 0.45, ty); g.lineTo(tx + rr * 0.45, ty); g.moveTo(tx, ty - rr * 0.3); g.lineTo(tx, ty + rr * 0.3); g.stroke();
    if (human) {
      // strength bar next to the ball
      const bx = b.x - 40, by = b.y - 64, bw = 80, bh = 12;
      g.globalAlpha = 0.95;
      ui.roundRect(g, bx - 3, by - 3, bw + 6, bh + 6, 8); g.fillStyle = NAVY; g.fill();
      ui.roundRect(g, bx, by, Math.max(bh, bw * k), bh, 6); g.fillStyle = col; g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
  }

  drawUnit(g, U) {
    const a = U.a, b = U.ball;
    a.draw(g, { ring: U.p.color });
    // the candy-cane putter
    if (!U.done && b.mode === 'play' && this.phase !== 'holeEnd') {
      const sp = this.standSpot(U);
      if (Math.hypot(a.x - sp.x, a.y - sp.y) < 60) {
        const hand = a.anchor('hand');
        const ca = Math.cos(U.aim), sa = Math.sin(U.aim);
        let back = 12;
        if (this.canPutt(U)) back = 14 + (U.power || 0.3) * 46 + Math.sin(this.t * 4) * 1.5;
        else if (U.swingT > 0) { const k = 1 - U.swingT / 0.22; back = lerp(14 + (U.shotPow || 0.5) * 46, -14, ease.outCubic(Math.min(1, k * 2))); }
        const d = BALL_R + 8 + back;
        D.drawPutter(g, hand.x, hand.y + 6, b.x - ca * d, b.y - sa * d, U.aim);
      }
    }
    // 7-8 players: after ~2 s only the humans keep their tags (8 CPU tags heap up on the tee)
    const tagT = this.n > 6 && U.p.isAI ? 2 : 4;
    const showTag = (this.phase === 'play' && this.ht < tagT) || this.phase === 'intro' || (!U.p.isAI && this.n > 1 && this.canPutt(U));
    if (showTag) {
      const sc = this.n > 5 ? 0.72 : 0.85;
      g.save(); g.translate(a.x, a.y - a.height - 30 - (a.emotes.length ? 46 : 0)); g.scale(sc, sc); ui.playerTag(g, U.p, 0, 0); g.restore();
    }
  }

  drawHUD(g) {
    const hole = this.hole;
    ui.scoreboard(g, this.players, this.units.map((U) => U.pts), { y: 18, avoidCenter: true, format: (v) => String(v), highlight: this.units.map((U) => U.done) });
    const left = this.phase === 'play' || this.phase === 'holeEnd' || this.phase === 'over' ? Math.max(0, HOLE_T - this.ht) : HOLE_T;
    ui.timer(g, left, this.timerX(), 60);
    // hole pill
    const label = `Hole ${this.holeIdx + 1} of ${HOLES.length}: ${hole.name}`;
    g.save(); g.font = `700 30px ${ui.FONT}`;
    const pw = g.measureText(label).width + 90;
    ui.panel(g, W / 2 - pw / 2, 116, pw, 52, { r: 26, fill: '#fff8ec' });
    this.drawMiniFlag(g, W / 2 - pw / 2 + 34, 156);
    ui.text(g, label, W / 2 + 18, 143, { size: 30, color: NAVY, stroke: false, weight: 700 });
    g.restore();
    // hints
    if (this.phase === 'play') {
      if (this.holeIdx === 0 && this.ht < 6) this.hintPanel(g, 'Move the target with the stick - press A to putt!', 'a', this.ht, 6);
      else if (this.holeIdx > 0 && this.ht < 4.5) this.hintPanel(g, hole.tip, null, this.ht, 4.5);
    }
    if (this.phase === 'intro') {
      ui.banner(g, `Hole ${this.holeIdx + 1}`, this.pt, { y: 420, size: 150, color: '#ffd23f' });
      if (this.pt > 0.25) ui.text(g, hole.name, W / 2, 540, { size: 64, color: '#ff6fb1', strokeWidth: 12, weight: 800 });
    }
    const hk = this.t - this.hioT;
    if (hk >= 0 && hk < 2.2) ui.banner(g, 'HOLE IN ONE!', hk, { y: 400, size: 140, color: '#ffd23f' });
    if (this.phase === 'holeEnd') this.drawSummary(g);
    if (this.phase === 'wipe') this.drawWipe(g, this.pt / 0.9);
  }

  /** Centre of the gap ui.scoreboard leaves for the timer (it is off-centre for odd player counts). */
  timerX() { return W / 2; }   // ui.scoreboard centres its gap


  drawMiniFlag(g, x, y) {
    g.save(); g.strokeStyle = NAVY; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 32); g.stroke();
    g.fillStyle = '#ff6fb1'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 2, y - 32); g.lineTo(x + 24, y - 25); g.lineTo(x + 2, y - 18); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  hintPanel(g, msg, glyph, t, dur) {
    const a = t < dur - 0.6 ? 1 : (dur - t) / 0.6;
    g.save(); g.globalAlpha = clamp(a, 0, 1);
    const w = 1080, x = W / 2 - w / 2;
    ui.panel(g, x, 1000, w, 66, { r: 33 });
    if (glyph) ui.glyph(g, glyph, x + 46, 1033, 46, { pulse: true });
    ui.text(g, msg, W / 2 + (glyph ? 24 : 0), 1034, { size: 34, color: NAVY, stroke: false, weight: 700, maxWidth: w - 120 });
    g.restore();
  }

  drawSummary(g) {
    const k = clamp((this.pt - 0.35) / 0.35, 0, 1);
    if (k <= 0) {
      if (this.endReason === 'time') ui.banner(g, "Time's up!", this.pt, { y: 470, size: 130, color: '#ffffff' });
      else ui.banner(g, 'Everyone is in!', this.pt, { y: 470, size: 110, color: '#ffd23f' });
      return;
    }
    const n = this.n, cell = n > 6 ? 168 : 190;
    const w = Math.max(560, n * cell + 80), h = 300, x = W / 2 - w / 2, y = 380;
    const sc = ease.outBack(k);
    g.save(); g.translate(W / 2, y + h / 2); g.scale(sc, sc); g.translate(-W / 2, -(y + h / 2));
    ui.panel(g, x, y, w, h, { fill: '#fff8ec' });
    ui.text(g, `Hole ${this.holeIdx + 1} done!`, W / 2, y + 48, { size: 50, color: '#ff6fb1', strokeWidth: 10, weight: 800 });
    this.summary.forEach((U, i) => {
      const cx = x + 40 + cell * (i + 0.5) + (w - 80 - cell * n) / 2, cy = y + 150;
      const pop = clamp((this.pt - 0.6 - i * 0.12) / 0.25, 0, 1);
      if (pop <= 0) return;
      g.save(); g.globalAlpha = pop;
      ui.drawPortrait(g, U.p, cx, cy, 50, { expr: U.done ? 'happy' : 'sad', ring: U.p.color, ringWidth: 6, gray: !U.done });
      const place = U.done ? (this.solo ? 'In!' : ORD[U.rank - 1]) : U.closest ? 'Closest!' : 'Missed';
      const got = U.done || U.closest;
      ui.text(g, place, cx, cy + 76, { size: 30, color: got ? NAVY : '#8a7aa6', stroke: false, weight: 800 });
      ui.text(g, `+${U.holePts}`, cx, cy + 112, { size: 34, color: got ? '#2fb35c' : '#8a7aa6', stroke: false, weight: 800 });
      if (U.holeHio) ui.text(g, 'Hole in one!', cx, cy - 70, { size: 22, color: '#ff6fb1', strokeWidth: 5, weight: 800 });
      g.restore();
    });
    g.restore();
  }

  drawWipe(g, k) {
    const L = lerp(-(W + 900), W + 300, ease.inOutQuad(clamp(k, 0, 1)));
    g.save();
    g.beginPath(); g.moveTo(L, 0); g.lineTo(L + W + 600, 0); g.lineTo(L + W + 300, H); g.lineTo(L - 300, H); g.closePath();
    g.fillStyle = '#ff8fc8'; g.fill(); g.clip();
    g.fillStyle = '#ffffff';
    for (let x = L - 600; x < L + W + 700; x += 140) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x - 240, H); g.lineTo(x - 300, H); g.closePath(); g.fill(); }
    D.swirl(g, L + W / 2 + 150, H / 2, 120, '#ffd23f', '#ff4d6d', this.t * 4);
    g.restore();
  }
}
