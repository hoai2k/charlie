// Choo-Choo Shapes (Molly Party) - a happy toy train with a face zooms into
// the station. Every carriage has shape windows (circle, square, triangle,
// star, heart); toy animals on the platform hold up matching shapes. Grab an
// animal (A), run it to the carriage with its shape and pop it in (A). When
// every seat is full the engine toots, everybody waves and the train zooms off
// around the loop in the background (tunnel, bridge, waving cow) while new
// passengers run onto the platform. Three trains (the last one is the
// Rainbow Express), then the full train parades back in. Cooperative: the
// whole party wins together; stats count each player's passengers.
//
// Silly bits: an animal sometimes boings up onto the roof instead, the wrong
// window bounces the animal back with a "boing", A away from the train juggles
// your passenger, A over the engine makes it honk and giggle, and passengers
// left waiting too long hop aboard by themselves (no stalls, no losing).
//
// Art hooks (procedural fallbacks ship today): bg/shape-train, thumb/shape-train,
// prop/shape-train-engine, prop/shape-train-car-red|blue|green|yellow|pink,
// prop/shape-train-animal-bunny|bear|duck|pig|cat|frog|elephant|penguin,
// prop/shape-train-cow, prop/shape-train-tunnel.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, makesMistake } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, shuffle, ease, dist, TAU, later } from '../engine/util.js';
import { Dash } from '../engine/dash.js';
import {
  NAVY, TRACK_Y, FAR_Y, TUNNEL, COW, RIVER, SHAPES, SHAPE_IDS, ANIMAL_IDS, ENGINE_W, ENGINE_H, CAR_W, CAR_H, GAP, ENGINE_COLORS,
  shapePath, drawShape, drawAnimal, drawPassenger, drawEngine, drawCar, drawWindowBack, drawWindowFrame, drawCow, drawTunnelPortal,
  buildBackdrop, roundRectPath,
} from './shape-train/art.js';
import { meta } from './shape-train.meta.js';

const TRAINS = 3;
const ARENA = { x0: 110, y0: 592, x1: 1810, y1: 1030 };
const WALK = 470;
const PICK_R = 125;            // grab an animal this close
const BOARD_Y = 800;           // pop into the train from anywhere above this line
const CAR_SLACK = 56;          // ...in front of the carriage (+/- this much)
const FAR_S = 0.3;             // far loop train scale
const FAR_V = 760;             // far loop speed (px/s)
const ROOF_CHANCE = 0.2;
const HARD_CAP = 100;
const HOUSE_X = 292;            // the station house (far left) hides the loop train          // safety: never run longer than this
const ARRIVE_T = [2.3, 1.9, 1.7];
const POSE = { carryMove: 'carry', carryStill: 'hold-present', grab: 'catch', pop: 'toss', cheer: 'cheer', wave: 'wave', oops: 'surprised', giggle: 'laugh' };

const snd = (k, fb, o = {}) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

function toot(big = true) {
  if (hasSound('st-toot')) { sfx('st-toot', { vol: big ? 1 : 0.6 }); return; }
  const blast = (v) => { sfx('note', { midi: 76, dur: 0.38, wave: 'square', vol: v * 0.16, force: true }); sfx('note', { midi: 71, dur: 0.38, wave: 'sawtooth', vol: v * 0.1, force: true }); };
  blast(big ? 1 : 0.6);
  if (big) later(() => blast(1), 420);
}

export { meta };

// --- the game ------------------------------------------------------------------------------
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0; this.t0 = 0;
    this.over = false;
    this.scale = this.n <= 4 ? 0.88 : 0.76;
    this.units = this.players.map((p, i) => this.makeUnit(p, i));
    this.humans = this.players.filter((p) => !p.isAI);
    this.passengers = [];
    this.flyers = [];
    this.trainIdx = 0;
    this.trainsDone = 0;
    this.train = null;
    this.far = null;
    this.combo = { n: 0, t: -9 };
    this.banner = null;
    this.clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 360 + rand(0, 200), y: rand(60, 200), s: rand(0.7, 1.2), v: rand(10, 24) }));
    this.cow = { wave: 0, said: -9, bubble: 0, up: 0 };
    this.fish = null;
    this.bg = buildBackdrop();
    this.nextTrain = null;
    this.startTrain(this.buildTrain());
    this.spawnPassengers(this.train, true);
  }

  makeUnit(p, i) {
    const n = this.n;
    const rows = n > 4 ? 2 : 1, perRow = Math.ceil(n / rows);
    const row = rows === 2 ? (i < perRow ? 0 : 1) : 0, col = row ? i - perRow : i;
    const cnt = row ? n - perRow : perRow;
    const span = ARENA.x1 - ARENA.x0 - 500;
    const x = ARENA.x0 + 250 + ((col + 0.5) / cnt) * span;
    const y = rows === 2 ? (row ? 990 : 900) : 940;
    const a = new Actor(p, { scale: this.scale, x, y });
    a.facing = x < W / 2 ? 1 : -1; a.snap();
    return { p, i, a, x, y, vx: 0, vy: 0, carry: null, hop: 0, delivered: 0, busy: 0, dash: new Dash(), ai: { target: null, actAt: -1, distract: 0, wrongCar: null, thinkT: rand(0.2, 0.8), wander: null } };
  }

  // --- trains -------------------------------------------------------------------------------
  seatCount() { return [4, 5, 5, 6, 7, 8, 9, 10][this.n - 1] || 10; }

  startTrain(train) {
    this.train = train;
    snd('st-chug-in', 'whoosh', { vol: 0.5 });
  }

  buildTrain() {
    const P = this.seatCount();
    const C = clamp(Math.round(P / 2) + 1, 3, 5);
    const shapes = shuffle([...SHAPE_IDS]).slice(0, C);
    const cars = shapes.map((shape) => ({ shape, seats: [], jig: 0 }));
    for (let k = 0; k < P; k++) cars[k % C].seats.push({ who: null, roof: false, glow: 0 });
    for (const car of cars) {
      const two = car.seats.length > 1;
      car.seats.forEach((s, j) => { s.lx = two ? CAR_W * (j ? 0.72 : 0.28) : CAR_W / 2; s.ly = -CAR_H * 0.54; s.r = two ? 42 : 52; });
    }
    const idx = this.trainIdx++;
    const L = ENGINE_W + C * (CAR_W + GAP);
    return {
      idx, cars, L, colors: ENGINE_COLORS[idx % ENGINE_COLORS.length], rainbow: idx === TRAINS - 1,
      state: 'arrive', st: 0, frontX: -40, stopX: Math.round(W / 2 + L / 2), v: 0, rot: 0, chugT: 0, boardT: 0, assistT: 0,
      face: { look: 0, lookY: 0.4, blink: 0, blinkT: rand(1, 3), mouth: 'smile', mouthT: 0, cheeks: 0 }, bump: 0, puffT: 0,
    };
  }

  /** Engine and car origins (bottom-left of each) for a train whose front is at fx. */
  carX(train, i, fx = train.frontX) { return fx - ENGINE_W - (i + 1) * (CAR_W + GAP) + GAP; }
  engineX(train, fx = train.frontX) { return fx - ENGINE_W; }
  seatWorld(train, ci, s) {
    const car = train.cars[ci];
    return { x: this.carX(train, ci) + s.lx, y: TRACK_Y + s.ly - this.carLift(train, car) };
  }
  carLift(train, car) { return Math.sin(car.jig * Math.PI) * 10 + train.bump * 6; }

  spawnPassengers(train, instant = false) {
    const kinds = shuffle([...ANIMAL_IDS]);
    let k = 0;
    const spots = [];
    for (const [ci, car] of train.cars.entries()) {
      for (let j = 0; j < car.seats.length; j++) {
        let best = null, bs = -1;
        for (let tries = 0; tries < 30; tries++) {
          const x = rand(ARENA.x0 + 60, ARENA.x1 - 60), y = rand(ARENA.y0 + 30, ARENA.y1 - 30);
          let d = 1e9;
          for (const s of spots) d = Math.min(d, dist(x, y, s.x, s.y));
          for (const U of this.units) d = Math.min(d, dist(x, y, U.x, U.y) * 1.6);
          if (d > bs) { bs = d; best = { x, y }; }
        }
        spots.push(best);
        const fromLeft = best.x < W / 2;
        const P = {
          id: Math.random(), kind: kinds[k++ % kinds.length], shape: car.shape, ci,
          state: instant ? 'wait' : 'arrive', x: instant ? best.x : (fromLeft ? -60 - rand(0, 200) : W + 60 + rand(0, 200)), y: best.y, z: 0,
          tx: best.x, ty: best.y, t: rand(0, 5), hopT: rand(0.5, 2.5), blinkT: rand(1, 4), blink: 0, face: 'happy', excite: 0,
          carrier: null, juggle: 0, flight: null, wait: 0,
        };
        this.passengers.push(P);
      }
    }
    if (!instant) snd('st-patter', 'giggle', { vol: 0.5 });
  }

  // --- frame ----------------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    this.updateTrain(dt);
    this.updatePassengers(dt);
    for (const U of this.units) { U.a.setPose('idle'); this.placeActor(U); U.a.update(dt); }
    this.updateWorld(dt);
  }

  update(dt) {
    this.t += dt;
    for (const U of this.units) this.updateUnit(U, dt);
    this.collide();
    this.updateTrain(dt);
    this.updatePassengers(dt);
    this.updateFlyers(dt);
    this.updateWorld(dt);
    for (const U of this.units) U.a.update(dt);
    if (!this.over && this.t > HARD_CAP) this.endGame();
  }

  postUpdate(dt) {
    this.t0 += dt;
    this.updateTrain(dt);
    this.updatePassengers(dt);
    this.updateFlyers(dt);
    this.updateWorld(dt);
    for (const U of this.units) { this.placeActor(U); U.a.update(dt); }
  }

  showBanner(text, color = '#ffd23f') { this.banner = { text, t: 0, color }; }

  updateWorld(dt) {
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.7) this.banner = null; }
    for (const c of this.clouds) { c.x -= c.v * dt; if (c.x < -260) { c.x = W + 200; c.y = rand(60, 200); } }
    const cw = this.cow;
    cw.wave = Math.max(0, cw.wave - dt); cw.bubble = Math.max(0, cw.bubble - dt);
    const T = this.train, away = !T || T.state === 'depart' && T.frontX - T.L > 300 || (T.state === 'arrive' || T.state === 'parade') && T.frontX < COW.x - 40;
    cw.up = clamp(cw.up + (away ? dt * 2.5 : -dt * 5), 0, 1);
    if (this.fish) { this.fish.t += dt; if (this.fish.t > 0.9) this.fish = null; }
  }

  placeActor(U) {
    const a = U.a;
    a.x = U.x; a.y = U.y;
    a.z = U.hop > 0 ? Math.sin((1 - U.hop / 0.42) * Math.PI) * 60 : 0;
    a.scale = this.scale * depthScale(U.y, { top: ARENA.y0, near: ARENA.y1, far: 0.9, nearScale: 1.05 });
  }

  // --- players --------------------------------------------------------------------------------
  updateUnit(U, dt) {
    const p = U.p, a = U.a;
    U.hop = Math.max(0, U.hop - dt); U.busy = Math.max(0, U.busy - dt);
    if (p.isAI) this.ai(U, dt);
    let mx = p.ctrl.x, my = p.ctrl.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    if (U.busy > 0) { mx *= 0.3; my *= 0.3; }
    U.vx = damp(U.vx, mx * WALK, 14, dt); U.vy = damp(U.vy, my * WALK, 14, dt);
    const dd = U.dash.update(dt, p.ctrl, { x: U.x, y: U.y, facing: a.facing, actor: U.carry ? null : a, ok: !this.over && U.busy <= 0 && !p.isAI });   // B: a short dash
    U.x += U.vx * dt + dd.x; U.y += U.vy * dt + dd.y;
    if (p.ctrl.pressed('a') && !this.over) this.pressA(U);
    const sp = Math.hypot(U.vx, U.vy);
    if (sp > 200 && Math.random() < dt * 8) particles.burst(U.x, U.y, { type: 'dust', count: 1, colors: ['#e6d3c0', '#ffffff'] });
    if (U.carry) {
      if (!a._once) a.setPose(sp > 40 ? POSE.carryMove : POSE.carryStill);
      a.facing = Math.abs(U.vx) > 4 ? (U.vx > 0 ? 1 : -1) : a.facing;
      a.speed = clamp(sp / WALK, 0, 1);
    } else a.moveAnim(U.vx, U.vy, WALK, { run: sp > WALK * 0.8 });
    this.placeActor(U);
  }

  collide() {
    const list = this.units, R = this.n > 4 ? 30 : 36;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j];
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy) || 0.001;
      if (d < R * 2) { const push = (R * 2 - d) / 2, nx = dx / d, ny = dy / d; A.x -= nx * push; A.y -= ny * push / 1.6; B.x += nx * push; B.y += ny * push / 1.6; }
    }
    for (const U of list) { U.x = clamp(U.x, ARENA.x0, ARENA.x1); U.y = clamp(U.y, ARENA.y0, ARENA.y1); this.placeActor(U); }
  }

  nearestPassenger(U) {
    let best = null, bd = PICK_R;
    for (const P of this.passengers) {
      if (P.state !== 'wait' && P.state !== 'arrive') continue;
      const d = Math.hypot(P.x - U.x, (P.y - U.y) * 1.3);
      if (d < bd) { bd = d; best = P; }
    }
    return best;
  }

  /** Which carriage is this player standing in front of (or null / 'engine'). */
  carAt(U) {
    const T = this.train;
    if (!T || (T.state !== 'board') || U.y > BOARD_Y) return null;
    let best = null, bd = 1e9;
    T.cars.forEach((car, ci) => {
      const x0 = this.carX(T, ci), cx = x0 + CAR_W / 2, d = Math.abs(U.x - cx);
      if (U.x > x0 - CAR_SLACK && U.x < x0 + CAR_W + CAR_SLACK && d < bd) { bd = d; best = ci; }
    });
    if (best !== null) return best;
    const ex = this.engineX(T);
    if (U.x > ex && U.x < ex + ENGINE_W + 40) return 'engine';
    return null;
  }

  pressA(U) {
    const a = U.a;
    if (U.carry) {
      const P = U.carry;
      if (P.flight) return;
      const ci = this.carAt(U);
      if (ci === 'engine') { this.honk(U); return; }
      if (ci === null) { this.juggle(U); return; }
      const car = this.train.cars[ci];
      const seat = car.shape === P.shape ? car.seats.find((s) => !s.who) : null;
      if (seat) this.board(U, P, ci, seat);
      else this.nope(U, P, ci);
      return;
    }
    const P = this.nearestPassenger(U);
    if (P) { this.pickUp(U, P); return; }
    // nothing to do: a happy little hop
    if (U.hop <= 0) { U.hop = 0.42; a.playOnce('jump', 0.42); sfx('jump', { vol: 0.35 }); }
  }

  pickUp(U, P) {
    const a = U.a;
    P.state = 'carried'; P.carrier = U; P.face = 'o';
    P.flight = { kind: 'pickup', fx: P.x, fy: P.y - P.z, t: 0, dur: 0.22 };
    U.carry = P; U.busy = 0.12;
    a.playOnce(POSE.grab, 0.3); a.squash(0.3);
    snd('st-pickup', 'pop', { vol: 0.7 }); snd('st-giggle', 'giggle', { vol: 0.45 });
    particles.burst(P.x, P.y - 60, { type: 'star', count: 7, colors: [SHAPES[P.shape].color, '#fff'], speed: [120, 300] });
    particles.ring(P.x, P.y - 40, SHAPES[P.shape].color, 70, 0.3);
    if (!U.p.isAI) U.p.ctrl.rumble(0.25, 80);
    U.ai.target = null; U.ai.actAt = -1;
    U.ai.wrongCar = U.p.isAI && makesMistake(U.p) && chance(0.6) ? 'pick' : null;
  }

  carryPos(U) {
    const hp = U.a.anchor('head');
    return { x: hp.x, y: hp.y + 8 };
  }

  board(U, P, ci, seat) {
    const T = this.train, a = U.a;
    seat.who = P;
    const roof = chance(ROOF_CHANCE);
    seat.roof = roof;
    const from = this.carryPos(U);
    U.carry = null; P.carrier = null; P.state = 'flying';
    P.flight = { kind: roof ? 'roof' : 'board', fx: from.x, fy: from.y, t: 0, dur: roof ? 0.85 : 0.42, ci, seat, by: U };
    this.flyers.push(P);
    a.playOnce(POSE.pop, 0.35); a.squash(0.35);
    U.busy = 0.18;
    snd('st-whee', 'whoosh', { vol: 0.5 });
    T.face.mouth = 'o'; T.face.mouthT = 0.4;
    if (!U.p.isAI) U.p.ctrl.rumble(0.3, 90);
  }

  landed(P) {
    const T = this.train, f = P.flight, car = T.cars[f.ci], seat = f.seat, U = f.by;
    const w = this.seatWorld(T, f.ci, seat);
    P.state = 'seated'; P.flight = null; P.face = 'happy';
    this.flyers = this.flyers.filter((q) => q !== P);
    this.passengers = this.passengers.filter((q) => q !== P);
    car.jig = 1; seat.glow = 1;
    const S = SHAPES[P.shape];
    const top = seat.roof ? TRACK_Y - CAR_H * 0.92 - 60 : w.y;
    particles.burst(w.x, top, { type: 'sparkle', count: 14, colors: [S.color, S.light, '#ffffff'], speed: [120, 360] });
    particles.burst(w.x, top, { type: 'star', count: 6, colors: [S.color, '#fff6a8'], speed: [180, 420] });
    particles.ring(w.x, top, S.color, 120, 0.4);
    // combo for quick deliveries (by anyone - it's a team)
    const now = this.t;
    this.combo.n = now - this.combo.t < 2.6 ? this.combo.n + 1 : 1;
    this.combo.t = now;
    sfx('collect', { step: Math.min(12, this.combo.n * 2) });
    snd('st-plop', 'pop', { vol: 0.6 });
    if (U) {
      U.delivered++;
      U.a.playOnce(POSE.cheer, 0.7); U.a.emote(chance(0.5) ? 'heart' : 'star', 0.9);
      if (chance(0.45)) voice(U.p.charId, 'yay');
      particles.popText(U.x, U.y - U.a.height - 70, '+1', U.p.color, 54);
    }
    const words = ['', '', 'Super!', 'Speedy!', 'Wow!', 'Amazing!', 'Choo-choo!'];
    if (this.combo.n >= 2 && now - (this.combo.shown ?? -9) > 0.6) { this.combo.shown = now; particles.popText(clamp(w.x, 220, W - 220), top - 90, words[Math.min(words.length - 1, this.combo.n)] || 'Wow!', '#ffd23f', 50 + Math.min(4, this.combo.n) * 4); }
    if (seat.roof) {
      snd('st-roof', 'bounce', { vol: 0.8 }); snd('st-giggle', 'giggle', { vol: 0.6 });
      particles.popText(clamp(w.x, 160, W - 160), top - 40, 'Boing!', '#ff6fbf', 50);
      T.face.mouth = 'grin'; T.face.mouthT = 0.8;
      fx.shake(4, 0.15);
    } else {
      T.face.mouth = 'grin'; T.face.mouthT = 0.4;
    }
    T.bump = 0.6;
    if (T.cars.every((c) => c.seats.every((s) => s.who))) this.allAboard();
  }

  nope(U, P, ci) {
    const T = this.train, car = T.cars[ci];
    const from = this.carryPos(U);
    const tgt = car.seats[0];
    U.carry = null; P.carrier = null;
    P.state = 'flying';
    P.flight = { kind: 'nope', fx: from.x, fy: from.y, t: 0, dur: 0.75, ci, seat: tgt, by: U };
    this.flyers.push(P);
    U.a.playOnce(POSE.pop, 0.3);
    U.busy = 0.5;
    snd('st-whee', 'whoosh', { vol: 0.4 });
    // the right car flashes
    const right = T.cars.findIndex((c) => c.shape === P.shape);
    if (right >= 0) T.cars[right].hint = 1.2;
  }

  nopeBonk(P) {
    const f = P.flight, T = this.train;
    const w = this.seatWorld(T, f.ci, f.seat);
    T.cars[f.ci].jig = 0.6; T.cars[f.ci].wobble = 0.5;
    snd('st-boing', 'bounce', { vol: 0.8 });
    particles.burst(w.x, w.y, { type: 'star', count: 6, colors: ['#ffffff', '#ffd23f'], speed: [150, 320] });
    particles.popText(w.x, w.y - 70, 'Boing!', '#ffffff', 46);
    P.face = 'squint';
    T.face.mouth = 'grin'; T.face.mouthT = 0.7;
    const U = f.by;
    if (U) { U.a.playOnce(POSE.oops, 0.5); if (chance(0.5)) voice(U.p.charId, 'laugh'); U.a.emote('question', 0.9); }
  }

  juggle(U) {
    const P = U.carry;
    if (P.juggle > 0) return;
    P.juggle = 0.55;
    U.a.playOnce(POSE.pop, 0.25);
    snd('st-juggle', 'flip', { vol: 0.5 });
    if (chance(0.5)) snd('st-giggle', 'giggle', { vol: 0.4 });
    particles.burst(U.x, U.y - U.a.height - 40, { type: 'sparkle', count: 5, colors: [SHAPES[P.shape].color, '#fff'] });
  }

  honk(U) {
    const T = this.train;
    if (T.honkT > 0) return;
    T.honkT = 0.6;
    toot(false);
    T.face.mouth = 'o'; T.face.mouthT = 0.5; T.face.cheeks = 1;
    const ex = this.engineX(T) + ENGINE_W * 0.66;
    particles.burst(ex, TRACK_Y - ENGINE_H * 1.02, { type: 'smoke', count: 6, colors: ['#ffffff', '#eef4ff'], angle: -Math.PI / 2, spread: 0.5, speed: [80, 200] });
    particles.popText(ex, TRACK_Y - ENGINE_H - 60, 'Toot!', '#ffffff', 44);
    U.a.playOnce(POSE.giggle, 0.6);
  }

  allAboard() {
    const T = this.train;
    T.state = 'full'; T.st = 0;
    this.showBanner(T.rainbow ? 'Rainbow Express!' : 'All aboard!', T.rainbow ? '#ff9fd3' : '#ffd23f');
    snd('st-allaboard', 'fanfare', { vol: 0.8 });
    fx.flash('#fff6c8', 0.18); fx.slowmo(0.5, 0.45);
    for (const U of this.units) { U.a.playOnce(POSE.cheer, 1.0); if (!U.p.isAI) U.p.ctrl.rumble(0.5, 200); }
    particles.burst(T.stopX - T.L / 2, TRACK_Y - 200, { type: 'confetti', count: 40, speed: [300, 800] });
  }

  // --- the train ------------------------------------------------------------------------------
  updateTrain(dt) {
    const T = this.train;
    if (T) {
      T.st += dt;
      const f = T.face;
      f.blinkT -= dt; if (f.blinkT <= 0) { f.blink = 0.14; f.blinkT = rand(1.5, 3.5); }
      f.blink = Math.max(0, f.blink - dt);
      f.mouthT -= dt; if (f.mouthT <= 0) f.mouth = 'smile';
      f.cheeks = Math.max(0, f.cheeks - dt * 2);
      T.honkT = Math.max(0, (T.honkT || 0) - dt);
      T.bump = Math.max(0, T.bump - dt * 2.5);
      for (const c of T.cars) { c.jig = Math.max(0, c.jig - dt * 3); c.wobble = Math.max(0, (c.wobble || 0) - dt); c.hint = Math.max(0, (c.hint || 0) - dt); for (const s of c.seats) s.glow = Math.max(0, s.glow - dt * 1.5); }
      // where the engine looks: at someone carrying a passenger
      let look = 0, lookY = 0.4;
      const carriers = this.units.filter((U) => U.carry);
      if (carriers.length) {
        const fx0 = this.engineX(T) + ENGINE_W * 0.86;
        const c = carriers.reduce((b, U) => (Math.abs(U.x - fx0) < Math.abs(b.x - fx0) ? U : b));
        look = (c.x - fx0) / 500; lookY = 0.9;
      }
      f.look = damp(f.look, look, 6, dt); f.lookY = damp(f.lookY, lookY, 6, dt);
      const prevX = T.frontX;
      if (T.state === 'arrive' || T.state === 'parade') {
        const dur = T.state === 'parade' ? 2.8 : ARRIVE_T[Math.min(T.idx, ARRIVE_T.length - 1)];
        const k = clamp(T.st / dur, 0, 1);
        T.frontX = lerp(-40, T.stopX, ease.outCubic(k));
        if (k > 0.7 && !T.braked) {
          T.braked = true;
          snd('st-brake', 'whoosh', { vol: 0.45 });
        }
        if (k > 0.7 && k < 1 && Math.random() < dt * 40) {
          for (const ci of [0, T.cars.length - 1]) particles.burst(this.carX(T, ci) + CAR_W * 0.2, TRACK_Y - 4, { type: 'spark', count: 1, colors: ['#ffd23f', '#ffffff'], angle: -Math.PI * 0.8, spread: 0.4 });
        }
        if (k >= 1) {
          T.bump = 1;
          if (T.state === 'parade') { T.state = 'finale'; T.st = 0; this.finale(); }
          else {
            T.state = 'board'; T.st = 0;
            snd('st-bell', 'note', { midi: 84, dur: 0.25, vol: 0.25 });
            later(() => sfx('note', { midi: 88, dur: 0.3, vol: 0.25, force: true }), 160);
            particles.burst(T.frontX - 30, TRACK_Y - 30, { type: 'smoke', count: 10, colors: ['#ffffff', '#e9f2ff'], angle: 0, spread: 1.2, speed: [80, 260] });
            fx.shake(5, 0.15);
          }
        }
      } else if (T.state === 'board') {
        T.boardT += dt;
        this.assist(T, dt);
      } else if (T.state === 'full') {
        if (!T.tooted && T.st > 0.45) {
          T.tooted = true; toot(true);
          T.face.mouth = 'o'; T.face.mouthT = 1.0; T.face.cheeks = 1;
          const ex = this.engineX(T) + ENGINE_W * 0.66;
          particles.burst(ex, TRACK_Y - ENGINE_H * 1.02, { type: 'smoke', count: 22, colors: ['#ffffff', '#f2f7ff'], angle: -Math.PI / 2, spread: 0.7, speed: [150, 420], size: [30, 60] });
          particles.popText(ex, TRACK_Y - ENGINE_H - 80, 'TOOT TOOT!', '#ffffff', 64);
          fx.shake(8, 0.3);
          if (this.api.camera) this.api.camera.punch(this.engineX(T) + ENGINE_W / 2, TRACK_Y - 150, 1.18, 0.5);
          for (const U of this.units) U.a.playOnce(POSE.wave, 1.2);
        }
        if (T.st > 1.55) { T.state = 'depart'; T.st = 0; T.v = 60; snd('st-chug-out', 'whoosh', { vol: 0.6 }); if (this.trainIdx < TRAINS) { this.nextTrain = this.buildTrain(); this.spawnPassengers(this.nextTrain); } }
      } else if (T.state === 'depart') {
        T.v += 1700 * dt;
        T.frontX += T.v * dt;
        if (T.rainbow && Math.random() < dt * 40) particles.burst(this.carX(T, T.cars.length - 1), TRACK_Y - rand(40, 180), { type: 'sparkle', count: 1, colors: RAINBOW });
        if (T.frontX - T.L > W + 60) {
          this.trainsDone++;
          this.far = { train: T, x: W + 60, tunnelIn: false, tunnelOut: false, cow: false, bridge: false };
          this.train = null;
        }
      }
      // wheels, chugging and steam
      const vx = (T.frontX - prevX) / Math.max(dt, 1e-4);
      T.rot += (vx / (ENGINE_H * 0.17)) * dt;
      if (Math.abs(vx) > 30) {
        T.chugT -= dt * clamp(Math.abs(vx) / 260, 0.6, 5);
        if (T.chugT <= 0) {
          T.chugT = 0.32;
          snd('st-chug', 'pump', { vol: 0.25 });
          const ex = this.engineX(T) + ENGINE_W * 0.66;
          particles.burst(ex, TRACK_Y - ENGINE_H * 1.02, { type: 'smoke', count: 2, colors: ['#ffffff', '#f2f7ff'], angle: -Math.PI / 2 - 0.4, spread: 0.3, speed: [60, 140] });
        }
      } else if (T.state === 'board') {
        T.puffT -= dt;
        if (T.puffT <= 0) { T.puffT = rand(0.9, 1.6); const ex = this.engineX(T) + ENGINE_W * 0.66; particles.burst(ex, TRACK_Y - ENGINE_H * 1.02, { type: 'smoke', count: 1, colors: ['#ffffff'], angle: -Math.PI / 2, spread: 0.3, speed: [40, 90] }); }
      }
    }
    // far loop
    const F = this.far;
    if (F) {
      F.x -= FAR_V * dt;
      const Lf = F.train.L * FAR_S;
      F.train.rot += (FAR_V / (ENGINE_H * 0.17 * FAR_S)) * dt;
      if (Math.random() < dt * 6) particles.burst(F.x + ENGINE_W * FAR_S * 0.66, FAR_Y - ENGINE_H * FAR_S, { type: 'smoke', count: 1, colors: ['#ffffff'], angle: -Math.PI / 2 + 0.5, spread: 0.3, speed: [30, 70], size: [10, 18] });
      if (F.train.rainbow && Math.random() < dt * 20) particles.burst(F.x + Lf, FAR_Y - 30, { type: 'sparkle', count: 1, colors: RAINBOW, size: [8, 14] });
      if (!F.tunnelIn && F.x < TUNNEL[1]) { F.tunnelIn = true; snd('st-tunnel', 'whoosh', { vol: 0.35 }); }
      if (!F.tunnelOut && F.x < TUNNEL[0]) { F.tunnelOut = true; particles.burst(TUNNEL[0] - 20, FAR_Y - 30, { type: 'sparkle', count: 8, colors: RAINBOW, size: [8, 16] }); }
      if (!F.bridge && F.x < (RIVER[0] + RIVER[1]) / 2) { F.bridge = true; this.fish = { x: (RIVER[0] + RIVER[1]) / 2 + rand(-60, 60), t: 0 }; sfx('splash', { vol: 0.3 }); }
      if (!F.cow && F.x < COW.x + 300) {
        F.cow = true; this.cow.wave = 2.2; this.cow.bubble = 1.8;
        snd('st-moo', null, { vol: 0.6 });
        for (const U of this.units) if (!U.carry && chance(0.6)) U.a.playOnce(POSE.wave, 0.9);
      }
      if (this.nextTrain && !this.train && F.x + Lf < 260) { this.startTrain(this.nextTrain); this.nextTrain = null; }
      if (F.x + Lf < -60) {
        this.far = null;
        if (this.trainsDone >= TRAINS && !this.train) {
          // the last full train parades back into the station
          F.train.state = 'parade'; F.train.st = 0; F.train.frontX = -40; F.train.braked = false;
          this.train = F.train;
          snd('st-chug-in', 'whoosh', { vol: 0.5 });
        }
      }
    }
  }

  assist(T, dt) {
    const wait = this.n === 1 ? 13 : 11;
    if (T.boardT < wait) return;
    T.assistT -= dt;
    if (T.assistT > 0) return;
    T.assistT = this.n === 1 ? 1.8 : 2.2;
    const free = this.passengers.filter((P) => P.state === 'wait');
    if (!free.length) return;
    const P = pick(free);
    P.state = 'self'; P.face = 'happy';
    particles.popText(P.x, P.y - 150, '!', '#ff9f1c', 54);
    sfx('pop', { vol: 0.4 });
  }

  finale() {
    const T = this.train;
    this.showBanner('Yay! Choo-choo!', '#ffd23f');
    toot(true);
    T.face.mouth = 'grin'; T.face.mouthT = 9;
    particles.confettiRain(W, 140);
    snd('st-allaboard', 'fanfare', { vol: 0.8 });
    fx.flash('#ffffff', 0.15);
    for (const U of this.units) { U.a.playOnce('celebrate', 2); if (chance(0.6)) voice(U.p.charId, 'woo'); }
    later(() => this.endGame(), 1500);
  }

  endGame() {
    if (this.over) return;
    this.over = true;
    const stats = this.units.map((U) => `${U.delivered} aboard`);
    for (const U of this.units) U.a.playOnce('celebrate', 1.4);
    const T = this.train;
    const focus = T ? { x: T.stopX - T.L / 2, y: 560, zoom: 1.08 } : { x: W / 2, y: 640, zoom: 1.08 };
    this.api.finish({ showcase: true, highlight: null, stats, title: 'All aboard!', focus });
  }

  // --- passengers ----------------------------------------------------------------------------
  updatePassengers(dt) {
    const T = this.train;
    for (const P of this.passengers) {
      P.t += dt;
      P.blinkT -= dt; if (P.blinkT <= 0) { P.blink = 0.15; P.blinkT = rand(1.5, 4); }
      P.blink = Math.max(0, P.blink - dt);
      P.juggle = Math.max(0, P.juggle - dt);
      if (P.flight && P.flight.kind === 'pickup') { P.flight.t += dt; if (P.flight.t >= P.flight.dur) { P.flight = null; P.face = 'happy'; } }
      if (P.state === 'arrive') {
        const d = dist(P.x, P.y, P.tx, P.ty);
        const sp = 620;
        if (d < 10) { P.state = 'wait'; P.z = 0; }
        else { P.x += ((P.tx - P.x) / d) * Math.min(d, sp * dt); P.y += ((P.ty - P.y) / d) * Math.min(d, sp * dt); P.z = Math.abs(Math.sin(P.t * 12)) * 22; }
      } else if (P.state === 'wait') {
        P.hopT -= dt;
        // excited when a free player comes near
        let near = false;
        for (const U of this.units) if (!U.carry && Math.hypot(U.x - P.x, (U.y - P.y) * 1.3) < PICK_R * 1.3) near = true;
        P.excite = damp(P.excite, near ? 1 : 0, 8, dt);
        if (P.hopT <= 0) { P.hopT = near ? rand(0.25, 0.5) : rand(1.2, 3); P.hop = 0.35; }
        P.hop = Math.max(0, (P.hop || 0) - dt);
        P.z = P.hop > 0 ? Math.sin((1 - P.hop / 0.35) * Math.PI) * (near ? 30 : 18) : 0;
        P.wait += dt;
      } else if (P.state === 'self') {
        if (!T || T.state !== 'board') { P.state = 'wait'; continue; }
        const ci = T.cars.findIndex((c) => c.shape === P.shape);
        const tx = this.carX(T, ci) + CAR_W / 2, ty = ARENA.y0 + 10;
        const d = dist(P.x, P.y, tx, ty);
        if (d < 30) {
          const seat = T.cars[ci].seats.find((s) => !s.who);
          if (!seat) { P.state = 'wait'; continue; }
          seat.who = P; seat.roof = chance(ROOF_CHANCE);
          P.state = 'flying';
          P.flight = { kind: seat.roof ? 'roof' : 'board', fx: P.x, fy: P.y - 60, t: 0, dur: seat.roof ? 0.85 : 0.45, ci, seat, by: null };
          this.flyers.push(P);
          snd('st-whee', 'whoosh', { vol: 0.4 });
        } else {
          const sp = 420;
          P.x += ((tx - P.x) / d) * Math.min(d, sp * dt); P.y += ((ty - P.y) / d) * Math.min(d, sp * dt);
          P.z = Math.abs(Math.sin(P.t * 14)) * 26;
        }
      }
    }
    // keep waiting passengers from stacking up
    const free = this.passengers.filter((P) => P.state === 'wait');
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
      const A = free[i], B = free[j], dx = B.x - A.x, dy = (B.y - A.y) * 1.5, d = Math.hypot(dx, dy) || 0.01;
      if (d < 90) { const k = ((90 - d) / d) * 0.5 * Math.min(1, dt * 6); A.x -= dx * k; B.x += dx * k; A.y -= (dy / 1.5) * k; B.y += (dy / 1.5) * k; }
    }
    for (const P of free) { P.x = clamp(P.x, ARENA.x0 + 20, ARENA.x1 - 20); P.y = clamp(P.y, ARENA.y0 + 10, ARENA.y1 - 10); }
  }

  updateFlyers(dt) {
    for (const P of [...this.flyers]) {
      const f = P.flight;
      if (!f) continue;
      f.t += dt;
      if (f.kind === 'nope') {
        if (!f.bonked && f.t > f.dur * 0.45) { f.bonked = true; this.nopeBonk(P); }
        if (f.t >= f.dur) {
          P.flight = null;
          this.flyers = this.flyers.filter((q) => q !== P);
          const U = f.by;
          if (U && !U.carry && !this.over) { U.carry = P; P.state = 'carried'; P.carrier = U; P.flight = { kind: 'pickup', fx: P.fx ?? U.x, fy: P.fy ?? U.y - 200, t: 0.1, dur: 0.12 }; U.a.squash(0.3); sfx('land', { vol: 0.4 }); }
          else { P.state = 'wait'; P.x = clamp(U ? U.x + 60 : P.x, ARENA.x0, ARENA.x1); P.y = ARENA.y0 + 40; }
          P.face = 'happy';
        }
      } else if (f.t >= f.dur) this.landed(P);
    }
  }

  /** Where a flying passenger is now (feet). */
  flyerPos(P) {
    const f = P.flight, T = this.train;
    const k = clamp(f.t / f.dur, 0, 1);
    const w = T ? this.seatWorld(T, f.ci, f.seat) : { x: f.fx, y: f.fy };
    if (f.kind === 'nope') {
      const U = f.by, back = U ? this.carryPos(U) : { x: f.fx, y: f.fy };
      const k1 = clamp(k / 0.45, 0, 1), k2 = clamp((k - 0.45) / 0.55, 0, 1);
      if (k < 0.45) return { x: lerp(f.fx, w.x, k1), y: lerp(f.fy, w.y + 40, k1) - Math.sin(k1 * Math.PI) * 140, rot: k1 * 4 };
      P.fx = back.x; P.fy = back.y;
      return { x: lerp(w.x, back.x, k2), y: lerp(w.y + 40, back.y, k2) - Math.sin(k2 * Math.PI) * 220, rot: 4 + k2 * 8 };
    }
    if (f.kind === 'roof') {
      const roofY = TRACK_Y - CAR_H * 0.9 - this.carLift(T, T.cars[f.ci]);
      if (k < 0.45) { const k1 = k / 0.45; return { x: lerp(f.fx, w.x, k1), y: lerp(f.fy, w.y + 40, k1) - Math.sin(k1 * Math.PI) * 150, rot: k1 * 6 }; }
      const k2 = (k - 0.45) / 0.55;
      return { x: w.x, y: lerp(w.y + 40, roofY, ease.outCubic(k2)) - Math.sin(k2 * Math.PI) * 160, rot: 6 + k2 * 6.28 };
    }
    return { x: lerp(f.fx, w.x, ease.inOutQuad(k)), y: lerp(f.fy, w.y + 40, ease.inQuad(k)) - Math.sin(k * Math.PI) * 170, rot: k * TAU };
  }

  // --- CPU ----------------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, A = U.ai, lvl = clamp(p.aiLevel ?? 0, 0, 2), prof = aiProfile(p), t = this.t;
    const cap = [0.58, 0.7, 0.82][lvl] * prof.speed;
    const go = (tx, ty, arrive = 50) => {
      const dx = tx - U.x, dy = ty - U.y, d = Math.hypot(dx, dy);
      if (d < 6) { p.ctrl.move(0, 0); return d; }
      const ang = Math.atan2(dy, dx) + Math.sin(t * 2 + U.i * 1.7) * prof.aimError * 0.5;
      const k = clamp(d / arrive, 0.25, 1) * cap;
      p.ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
      return d;
    };
    if (A.distract > 0) {
      A.distract -= dt; p.ctrl.move(0, 0);
      return;
    }
    if (chance(dt * [0.09, 0.04, 0.015][lvl])) { A.distract = rand(0.6, 1.5); if (!U.carry) U.a.playOnce(chance(0.5) ? 'dance' : 'wave', A.distract); else if (chance(0.5)) p.ctrl.press('a'); p.ctrl.move(0, 0); return; }
    const T = this.train;
    if (U.carry) {
      const P = U.carry;
      if (P.flight) { p.ctrl.move(0, 0); return; }
      if (!T || T.state !== 'board') {
        // wait near the middle of the platform for the next train
        if (!A.wander || t > A.wander.t) A.wander = { x: rand(500, 1400), y: rand(660, 760), t: t + rand(2, 4) };
        go(A.wander.x, A.wander.y, 120);
        return;
      }
      let ci = T.cars.findIndex((c) => c.shape === P.shape);
      if (A.wrongCar === 'pick') A.wrongCar = T.cars.length > 1 ? pick(T.cars.map((_, i) => i).filter((i) => i !== ci)) : null;
      if (typeof A.wrongCar === 'number') ci = A.wrongCar;
      const tx = this.carX(T, ci) + CAR_W / 2 + ((U.i % 3) - 1) * 50, ty = ARENA.y0 + 40 + (U.i % 2) * 50;
      const d = go(tx, ty, 60);
      if (d < 60 && this.carAt(U) === ci) {
        p.ctrl.move(0, 0);
        if (A.actAt < 0) A.actAt = t + reactionTime(p) * [1.1, 0.7, 0.45][lvl];
        if (t >= A.actAt) { p.ctrl.press('a'); A.actAt = -1; if (typeof A.wrongCar === 'number') A.wrongCar = null; }
      } else A.actAt = -1;
      return;
    }
    // pick a passenger: nearest, leaving ones near a human for the human
    A.thinkT -= dt;
    if (!A.target || !this.passengers.includes(A.target) || (A.target.state !== 'wait' && A.target.state !== 'arrive') || A.thinkT <= 0) {
      A.thinkT = rand(...prof.think) * 2;
      let best = null, bs = 1e9;
      for (const P of this.passengers) {
        if (P.state !== 'wait' && P.state !== 'arrive') continue;
        let s = dist(U.x, U.y, P.x, P.y);
        for (const V of this.units) {
          if (V === U) continue;
          if (!V.p.isAI && !V.carry && dist(V.x, V.y, P.x, P.y) < 320) s += 420;
          if (V.p.isAI && V.ai.target === P) s += 600;
        }
        s += rand(0, [260, 140, 60][lvl]);
        if (s < bs) { bs = s; best = P; }
      }
      A.target = best;
    }
    if (!A.target) {
      if (!A.wander || t > A.wander.t) A.wander = { x: rand(400, 1500), y: rand(700, 950), t: t + rand(2, 4) };
      go(A.wander.x, A.wander.y, 120);
      return;
    }
    const P = A.target;
    const d = go(P.x, P.y + 10, 40);
    if (d < PICK_R * 0.7) {
      p.ctrl.move(0, 0);
      if (A.actAt < 0) A.actAt = t + reactionTime(p) * [1.0, 0.65, 0.4][lvl];
      if (t >= A.actAt) { p.ctrl.press('a'); A.actAt = -1; }
    } else A.actAt = -1;
  }

  // --- drawing --------------------------------------------------------------------------------
  draw(g) {
    const t = this.t + this.t0;
    const bg = art('bg/shape-train');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(this.bg, 0, 0);
    if (!bg) for (const c of this.clouds) ui.cloud(g, c.x, c.y, c.s);
    this.drawRiverLife(g, t);
    // the cow (peeks up over the meadow while the station is empty)
    g.save();
    g.beginPath(); g.rect(COW.x - 200, 0, 400, COW.y + 2); g.clip();
    g.translate(COW.x, COW.y + (1 - ease.outBack(this.cow.up)) * 120 + Math.abs(Math.sin(t * (this.cow.wave > 0 ? 9 : 2))) * -4);
    g.rotate(this.cow.wave > 0 ? Math.sin(t * 9) * 0.05 : 0);
    drawCow(g, 104, t, this.cow.wave > 0);
    g.restore();
    if (this.cow.bubble > 0 && this.cow.up > 0.8) this.drawBubble(g, COW.x + 40, COW.y - 140, 'Moo!', clamp(this.cow.bubble / 0.3, 0, 1));
    // the far loop train (clipped at the tunnel)
    if (this.far) this.drawFar(g, t);
    // the station train
    if (this.train) this.drawTrain(g, this.train, t);
    // arrows over the right carriage
    this.drawHints(g, t);
    // platform: players and passengers, sorted by depth
    const list = [];
    for (const U of this.units) list.push({ y: U.y, fn: () => this.drawUnit(g, U, t) });
    for (const P of this.passengers) if (P.state === 'wait' || P.state === 'arrive' || P.state === 'self') list.push({ y: P.y, fn: () => this.drawPlatformPassenger(g, P, t) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();
    for (const P of this.flyers) {
      const q = this.flyerPos(P);
      g.save(); g.translate(q.x, q.y); g.rotate(Math.sin(q.rot) * 0.5 + (P.flight.kind === 'nope' ? q.rot * 0.3 : 0));
      drawPassenger(g, P.kind, P.shape, 78, t, { face: P.face, blink: P.blink });
      g.restore();
    }
  }

  drawRiverLife(g, t) {
    if (!this.fish) return;
    const f = this.fish, k = f.t / 0.9;
    g.save(); g.translate(f.x + k * 50, 380 - Math.sin(k * Math.PI) * 70); g.rotate(-0.8 + k * 1.6);
    g.fillStyle = '#ff9f1c'; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 16, 9, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-14, 0); g.lineTo(-26, -8); g.lineTo(-26, 8); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = NAVY; g.beginPath(); g.arc(8, -2, 2, 0, TAU); g.fill();
    g.restore();
    if (f.t < 0.05 || (f.t > 0.85 && !f.splashed)) { f.splashed = f.t > 0.85; particles.burst(f.x + (f.t > 0.5 ? 50 : 0), 382, { type: 'drop', count: 6, colors: ['#bdf2ff', '#ffffff'], angle: -Math.PI / 2, spread: 0.7, speed: [100, 220], size: [4, 8] }); }
  }

  drawBubble(g, x, y, text, a) {
    g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(0.6 + 0.4 * a, 0.6 + 0.4 * a);
    ui.panel(g, -70, -36, 140, 64, { r: 30, fill: '#ffffff', lineWidth: 5 });
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-30, 26); g.lineTo(-46, 52); g.lineTo(-10, 27); g.fill(); g.stroke();
    g.fillRect(-34, 20, 30, 10);
    ui.text(g, text, 0, -2, { size: 38, color: NAVY, stroke: false, weight: 800 });
    g.restore();
  }

  drawFar(g, t) {
    const F = this.far;
    g.save();
    g.beginPath(); g.rect(HOUSE_X, 0, TUNNEL[0] - HOUSE_X, H); g.rect(TUNNEL[1], 0, W - TUNNEL[1], H); g.clip();
    g.translate(F.x, FAR_Y); g.scale(-FAR_S, FAR_S);
    // drawn as if facing right with its front at x = 0, then mirrored so it heads left
    this.drawTrainBody(g, F.train, 0, 0, t, true);
    g.restore();
    drawTunnelPortal(g, TUNNEL[0], FAR_Y, false);
    drawTunnelPortal(g, TUNNEL[1], FAR_Y, true);
  }

  drawTrain(g, T, t) {
    g.save();
    // a soft shadow under the train
    g.fillStyle = 'rgba(36,22,63,0.18)';
    g.beginPath(); g.ellipse(T.frontX - T.L / 2, TRACK_Y + 10, T.L / 2, 14, 0, 0, TAU); g.fill();
    this.drawTrainBody(g, T, T.frontX, TRACK_Y, t, false);
    g.restore();
  }

  /** Engine + carriages + passengers with the front at (fx, baseY). */
  drawTrainBody(g, T, fx, baseY, t, far) {
    const moving = T.state === 'arrive' || T.state === 'depart' || T.state === 'parade' || far;
    const shake = moving ? Math.sin(t * 40) * 1.5 : 0;
    const waving = T.state === 'full' || T.state === 'depart' || T.state === 'parade' || T.state === 'finale' || far;
    T.cars.forEach((car, ci) => {
      const x0 = fx - ENGINE_W - (ci + 1) * (CAR_W + GAP) + GAP;
      const lift = this.carLift(T, car) + shake;
      g.save(); g.translate(x0, baseY - lift);
      if (car.wobble > 0) { g.translate(CAR_W / 2, 0); g.rotate(Math.sin(t * 40) * car.wobble * 0.06); g.translate(-CAR_W / 2, 0); }
      drawCar(g, car.shape, t, T.rot, { rainbow: T.rainbow });
      for (const s of car.seats) {
        const lit = !!s.who && !s.roof;
        g.save(); g.translate(s.lx, s.ly);
        drawWindowBack(g, car.shape, s.r, lit || (!!s.who && s.roof));
        if (lit) {
          g.save(); shapePath(g, car.shape, s.r * 0.98); g.clip();
          const bob = Math.sin(t * 4 + s.lx) * 3;
          g.translate(0, s.r * 1.38 + bob);
          drawAnimal(g, s.who.kind, s.r * 2.15, t, { arms: waving ? 'wave' : 'down', blink: s.who.blink, face: 'happy' });
          g.restore();
        }
        const hint = !s.who && (car.hint > 0 || this.carriedShapes && this.carriedShapes.has(car.shape)) ? 0.55 + 0.45 * Math.sin(t * 10) : 0;
        drawWindowFrame(g, car.shape, s.r, Math.max(hint, s.glow));
        g.restore();
      }
      // roof riders
      for (const s of car.seats) {
        if (!s.who || !s.roof) continue;
        g.save(); g.translate(s.lx, -CAR_H * 0.9 + 4);
        const wob = Math.sin(t * (moving ? 18 : 3) + s.lx) * (moving ? 0.12 : 0.05);
        g.rotate(wob);
        drawAnimal(g, s.who.kind, 70, t, { arms: waving || moving ? 'wave' : 'up', face: moving ? 'o' : 'happy', blink: s.who.blink });
        g.restore();
      }
      g.restore();
    });
    // engine
    g.save(); g.translate(fx - ENGINE_W, baseY - T.bump * 6 + shake);
    drawEngine(g, T.colors, t, T.rot, far ? { mouth: 'grin' } : T.face);
    g.restore();
  }

  drawHints(g, t) {
    const T = this.train;
    this.carriedShapes = new Set(this.units.filter((U) => U.carry).map((U) => U.carry.shape));
    if (!T || T.state !== 'board') return;
    const per = new Map();
    for (const U of this.units) {
      if (!U.carry || U.carry.flight) continue;
      const ci = T.cars.findIndex((c) => c.shape === U.carry.shape);
      if (ci < 0) continue;
      if (!per.has(ci)) per.set(ci, []);
      per.get(ci).push(U);
    }
    for (const [ci, list] of per) {
      const car = T.cars[ci];
      const cx = this.carX(T, ci) + CAR_W / 2;
      const top = TRACK_Y - CAR_H * 0.98 - this.carLift(T, car) - 30;
      list.forEach((U, k) => {
        const x = cx + (k - (list.length - 1) / 2) * 56, y = top - 30 - Math.abs(Math.sin(t * 6 + k)) * 22;
        g.save(); g.translate(x, y);
        g.fillStyle = U.p.color; g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-14, -30); g.lineTo(14, -30); g.lineTo(14, -6); g.lineTo(26, -6); g.lineTo(0, 22); g.lineTo(-26, -6); g.lineTo(-14, -6); g.closePath(); g.fill(); g.stroke();
        g.restore();
      });
    }
  }

  drawUnit(g, U, t) {
    const a = U.a, p = U.p;
    a.draw(g, { ring: p.color });
    if (U.carry && U.carry.state === 'carried') {
      const P = U.carry, c = this.carryPos(U);
      let x = c.x, y = c.y;
      if (P.flight && P.flight.kind === 'pickup') {
        const k = ease.outCubic(clamp(P.flight.t / P.flight.dur, 0, 1));
        x = lerp(P.flight.fx, c.x, k); y = lerp(P.flight.fy, c.y, k) - Math.sin(k * Math.PI) * 50;
      }
      let rot = Math.sin(t * 5 + U.i) * 0.06;
      if (P.juggle > 0) { const k = 1 - P.juggle / 0.55; y -= Math.sin(k * Math.PI) * 130; rot = k * TAU; }
      g.save(); g.translate(x, y); g.rotate(rot);
      // sized to the carrier, so tiny fairies carry smaller friends
      const ph = clamp(a.height * 0.56, 40, 80);
      drawPassenger(g, P.kind, P.shape, ph, t, { face: P.juggle > 0 ? 'o' : P.face, blink: P.blink, shapeTilt: Math.sin(t * 4) * 0.15, glow: 0.35 + 0.25 * Math.sin(t * 6) });
      g.restore();
    }
    if (this.t < 5 || (this.t0 < 4 && this.t === 0)) {
      const s2 = this.n > 5 ? 0.75 : 0.95;
      g.save(); g.translate(U.x, U.y - a.z - a.height - (U.carry ? 150 : 30)); g.scale(s2, s2); ui.playerTag(g, p, 0, 0); g.restore();
    }
  }

  drawPlatformPassenger(g, P, t) {
    const sc = depthScale(P.y, { top: ARENA.y0, near: ARENA.y1, far: 0.9, nearScale: 1.05 });
    g.save();
    g.fillStyle = 'rgba(36,22,63,0.2)';
    g.beginPath(); g.ellipse(P.x, P.y + 2, 34 * sc * (1 - P.z / 120), 10 * sc, 0, 0, TAU); g.fill();
    g.translate(P.x, P.y - P.z);
    g.scale(sc, sc);
    const sq = P.z > 0 ? 1 : 1 + Math.sin(P.t * 3) * 0.02;
    g.scale(1 / sq, sq);
    if (P.state === 'arrive' || P.state === 'self') g.rotate(Math.sin(P.t * 12) * 0.1);
    drawPassenger(g, P.kind, P.shape, 92, t, { face: P.face, blink: P.blink, shapeTilt: Math.sin(P.t * 2.5) * 0.18 + P.excite * Math.sin(P.t * 12) * 0.2, lift: -P.excite * 10, glow: P.excite * 0.6 });
    g.restore();
    // "grab me" A glyph for humans standing close
    if (P.state === 'wait') {
      for (const U of this.humans.map((p) => this.units[p.index])) {
        if (!U || U.carry) continue;
        if (Math.hypot(U.x - P.x, (U.y - P.y) * 1.3) < PICK_R && this.nearestPassenger(U) === P) {
          g.save(); g.globalAlpha = 0.95; ui.glyph(g, 'a', P.x + 52 * sc, P.y - 150 * sc, 42, { pulse: true }); g.restore();
          break;
        }
      }
    }
  }

  // --- HUD ------------------------------------------------------------------------------------
  drawHUD(g) {
    // the gallery ending: the full train under the play scene's ribbon, no counts or pips
    if (this.api.ended?.()) return;
    const t = this.t + this.t0;
    const vals = this.units.map((U) => U.delivered);
    ui.scoreboard(g, this.players, vals, { y: 14, avoidCenter: true, format: (v) => String(v) });
    // three train pips in the centre gap
    g.save(); g.translate(W / 2, 52);
    ui.panel(g, -100, -38, 200, 76, { r: 38, fill: '#ffffff' });
    for (let i = 0; i < TRAINS; i++) {
      const x = (i - 1) * 60, done = i < this.trainsDone, cur = i === this.trainsDone;
      g.save(); g.translate(x, 6 + (cur ? -Math.abs(Math.sin(t * 6)) * 4 : 0));
      const c = done ? ENGINE_COLORS[i % 3].body : cur ? '#ffd9a0' : '#ded6ee';
      g.fillStyle = c; g.strokeStyle = NAVY; g.lineWidth = 3.5;
      roundRectPath(g, -22, -22, 26, 26, 5); g.fill(); g.stroke();
      roundRectPath(g, 0, -12, 22, 16, 5); g.fill(); g.stroke();
      g.fillStyle = NAVY; g.fillRect(8, -24, 7, 12);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-12, 9, 6, 0, TAU); g.arc(10, 9, 6, 0, TAU); g.fill(); g.stroke();
      if (done) { g.translate(14, -24); ui.stars(g, 1, 0, 0, 16); }
      g.restore();
    }
    g.restore();
    // shapes still to fill on this train
    const T = this.train;
    if (T && (T.state === 'board' || T.state === 'arrive')) {
      const need = [];
      for (const car of T.cars) for (const s of car.seats) if (!s.who) need.push(car.shape);
      if (need.length) {
        const r = 22, gap = 56, w = need.length * gap + 40;
        g.save(); g.translate(W / 2, 140);
        ui.panel(g, -w / 2, -34, w, 68, { r: 34, fill: 'rgba(255,255,255,0.92)' });
        need.forEach((sh, i) => { g.save(); g.translate(-w / 2 + 20 + gap / 2 + i * gap, 2 + Math.sin(t * 5 + i) * 3); drawShape(g, sh, r); g.restore(); });
        g.restore();
      }
    }
    if (this.banner) {
      const b = this.banner;
      g.save(); g.globalAlpha = clamp((1.7 - b.t) / 0.3, 0, 1);
      ui.banner(g, b.text, b.t, { size: 120, y: H / 2 - 120, color: b.color });
      g.restore();
    }
    // picture how-to for the first seconds
    if (this.t < 7) {
      const al = this.t < 6 ? 1 : 1 - (this.t - 6);
      g.save(); g.globalAlpha = al;
      const pw = 760, ph = 110, px = W / 2 - pw / 2, py = H - ph - 18;
      ui.panel(g, px, py, pw, ph, { r: 40 });
      const cy = py + ph / 2;
      ui.glyph(g, 'stick', px + 60, cy, 56);
      g.save(); g.translate(px + 150, cy + 44); drawPassenger(g, 'bunny', 'star', 62, t, {}); g.restore();
      ui.glyph(g, 'a', px + 240, cy, 52, { pulse: true });
      this.arrow(g, px + 290, cy, px + 360, cy);
      g.save(); g.translate(px + 440, cy); drawWindowBack(g, 'star', 34, false); drawWindowFrame(g, 'star', 34, 0.5 + 0.5 * Math.sin(t * 8)); g.restore();
      ui.glyph(g, 'a', px + 530, cy, 52, { pulse: true });
      this.arrow(g, px + 580, cy, px + 640, cy);
      g.save(); g.translate(px + 700, cy); drawWindowBack(g, 'star', 34, true); g.save(); shapePath(g, 'star', 33); g.clip(); g.translate(0, 47); drawAnimal(g, 'bunny', 73, t, { arms: 'wave' }); g.restore(); drawWindowFrame(g, 'star', 34); g.restore();
      g.restore();
    }
  }

  arrow(g, x0, y, x1) {
    g.save(); g.strokeStyle = NAVY; g.fillStyle = NAVY; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x1 - 12, y); g.stroke();
    g.beginPath(); g.moveTo(x1, y); g.lineTo(x1 - 18, y - 13); g.lineTo(x1 - 18, y + 13); g.closePath(); g.fill();
    g.restore();
  }
}
