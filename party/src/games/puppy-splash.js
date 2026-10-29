// Puppy Splash (Molly Party, cooperative): muddy puppies zoom around the
// backyard. Hold A to blast them with your garden hose (the stick aims, and
// the stream bends toward the nearest muddy puppy) until they are clean and
// fluffy; then each one shakes water everywhere (on whoever is close!), barks
// and bounds up to a dog bed on the porch. Splash a friend: they get soaked
// and do a wet-dog shake. Run through the bubble pool for a rainbow bubble
// hose (cleans twice as fast); muddy puppies splash mud out of the puddles.
// Surprise: a giant muddy sheepdog everyone cleans together. Last 10 s:
// Zoomies! Count the clean puppies together.
//
// Art hooks (all optional, procedural fallbacks ship today):
//   bg/puppy-splash  prop/puppy-1..4  prop/puppy-shake  prop/bubble-pool
//   prop/mud-puddle  prop/dog-bed  prop/hose-nozzle
// New-pose hook: 'hose-spray' (falls back to 'action').
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import { depthScale } from '../engine/camera.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime, steer, Brain } from '../engine/ai.js';
import { clamp, damp, rand, randInt, pick, chance, TAU, dist, lerp, later } from '../engine/util.js';
import { Dash } from '../engine/dash.js';
import { celebrateHop } from '../engine/celebrate.js';
import {
  NAVY, POOL, PUDDLES, PORCH_Y, BREEDS, drawPuppy, drawMud, makeBlobs, drawBackyard, drawPuddle, drawPool, drawBed, drawNozzle,
} from './puppy-splash/art.js';
import { meta } from './puppy-splash.meta.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const poseName = (n) => (POSE_NAMES.includes(n) ? n : n === 'hose-spray' ? 'action' : 'idle');

export { meta };


// --- tuning -----------------------------------------------------------------
const DURATION = 50;
const ZOOMIES_AT = 10;
const BIG_AT = 24;            // seconds left when the giant sheepdog bounds in
const MAX_SPEED = 520;
const SPRAY_SLOW = 0.6;
const RANGE = 470;
const CONE = 0.3;
const CLEAN_RATE = 1.15;      // mud per second from one hose (mud starts at 1)
const CPU_SPEED = [0.6, 0.72, 0.84];
const CPU_CLEAN = [0.42, 0.55, 0.7];
const BOUNDS = { x0: 70, x1: W - 70, y0: PORCH_Y + 50, y1: 1000 };
const BED_COLORS = ['#ff9ccf', '#9fd6ff', '#ffe066', '#b8f0c8', '#d8b8ff'];

function inEllipse(x, y, e, k = 1) { return ((x - e.x) / (e.rx * k)) ** 2 + ((y - e.y) / (e.ry * k)) ** 2 < 1; }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

let pupSerial = 0;

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.playT = 0;
    this.timeLeft = DURATION;
    this.baseScale = n <= 2 ? 0.86 : n <= 4 ? 0.8 : 0.7;
    this.pups = [];
    this.porch = [];
    this.team = 0;
    this.spawnT = 0.2;
    this.bigDone = false;
    this.zoomies = false; this.zoomT = 0;
    this.splashAt = 0; this.barkAt = 0;
    this.decor = Array.from({ length: 60 }, () => {
      let x, y, k = 0;
      do { x = rand(60, W - 60); y = rand(PORCH_Y + 30, 1060); k++; } while ((inEllipse(x, y, POOL, 1.4) || PUDDLES.some((p) => inEllipse(x, y, p, 1.3))) && k < 20);
      return { x, y, s: rand(0.6, 1.1), c: pick(['#ffffff', '#ffffff', '#ffe066', '#ffb3d9', '#c9a0ff']) };
    });
    // beds along the porch (one per clean puppy; more appear as needed)
    this.slots = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 17; col++) {
      this.slots.push({ x: 110 + col * ((W - 220) / 16) + (row === 1 ? 50 : row === 2 ? -30 : 0), y: [310, 262, 214][row], c: BED_COLORS[(col + row * 2) % BED_COLORS.length], pup: null, used: false });
    }
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? W / 2 : 300 + ((W - 600) * i) / (n - 1);
      const y = 920 - (i % 2) * 50;
      const a = new Actor(p, { scale: this.baseScale, x, y });
      const sizeK = clamp(120 / a.leader.h, 1, 2.4);
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      return {
        p, a, i, x, y, sizeK, vx: 0, vy: 0, aim: x < W / 2 ? -0.5 : -Math.PI + 0.5, spraying: false, sprayT: 0, hitD: RANGE,
        cleaned: 0, wet: 0, mud: 0, bubble: 0, dash: new Dash(), brain: new Brain(p), target: null, wander: 0, wx: x, wy: y, giggleCd: 0,
        poolCd: 0, holdT: 0, restT: 0, streamPh: rand(TAU),
      };
    });
    for (let k = 0; k < this.muddyTarget(); k++) this.spawnPup(true);
  }

  muddyTarget() { return clamp(this.n + 3, 4, 10); }

  // ------------------------------------------------------------------ puppies
  spawnPup(inside = false, big = false) {
    const side = chance(0.5) ? -1 : 1;
    const x = inside ? rand(260, W - 260) : side < 0 ? -60 : W + 60;
    const y = inside ? rand(BOUNDS.y0 + 60, 900) : rand(BOUNDS.y0 + 80, 900);
    const d = {
      id: pupSerial++, x, y, z: 0, vz: 0, vx: 0, vy: 0, breed: big ? 4 : randInt(0, 3), big, mud: 1, hp: big ? 5.5 : 1,
      state: inside ? 'run' : 'enter', t: rand(5), facing: side < 0 ? 1 : -1, wx: x, wy: y, wt: 0, speed: rand(230, 330) * (big ? 0.7 : 1),
      blobs: makeBlobs(big ? 12 : randInt(8, 11)), sprayed: 0, credit: new Map(), shakeT: 0, barkT: 0, slot: null, sq: 0, rollT: 0,
      tongue: chance(0.7), splashCd: 0, hop: 0,
    };
    if (!inside) { d.wx = side < 0 ? rand(200, 500) : rand(W - 500, W - 200); d.wy = y; d.vz = 520; }
    this.pups.push(d);
    return d;
  }

  pickRun(d) {
    // zoom somewhere; sometimes straight into a mud puddle for a roll
    if (chance(0.22)) { const p = pick(PUDDLES); d.wx = p.x + rand(-40, 40); d.wy = p.y + rand(-10, 10); }
    else {
      for (let k = 0; k < 5; k++) {
        d.wx = rand(BOUNDS.x0 + 60, BOUNDS.x1 - 60); d.wy = rand(BOUNDS.y0 + 30, 940);
        if (!inEllipse(d.wx, d.wy, POOL, 1.3)) break;
      }
    }
    d.wt = rand(1.2, 2.6);
  }

  updatePup(d, dt) {
    d.t += dt; d.sq = damp(d.sq, 0, 8, dt); d.splashCd = Math.max(0, d.splashCd - dt);
    if (d.state !== 'bark' && d.state !== 'porch') d.barkT = Math.max(0, d.barkT - dt);
    if (d.z > 0 || d.vz) { d.vz -= 2000 * dt; d.z += d.vz * dt; if (d.z <= 0) { d.z = 0; d.vz = 0; d.sq = 0.25; } }
    const sprayed = d.sprayed > 0;
    d.sprayed = Math.max(0, d.sprayed - dt);
    const px = d.x;
    switch (d.state) {
      case 'enter': case 'run': {
        if (d.state === 'enter' && d.x > 120 && d.x < W - 120) d.state = 'run';
        d.wt -= dt;
        const dd = dist(d.x, d.y, d.wx, d.wy);
        if (d.state === 'run' && (dd < 24 || d.wt <= 0)) {
          const pud = PUDDLES.find((p) => inEllipse(d.x, d.y, p, 0.9));
          if (pud && dd < 30 && chance(0.7)) { d.state = 'roll'; d.rollT = rand(0.9, 1.5); snd('ps-squelch', 'splat', { vol: 0.4 }); }
          else this.pickRun(d);
        }
        let sp = d.speed * (this.zoomies ? 1.35 : 1) * (sprayed ? 0.12 : 1);
        if (dd > 1) { d.vx = damp(d.vx, ((d.wx - d.x) / dd) * sp, 6, dt); d.vy = damp(d.vy, ((d.wy - d.y) / dd) * sp, 6, dt); }
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.state === 'run') { d.x = clamp(d.x, BOUNDS.x0, BOUNDS.x1); d.y = clamp(d.y, BOUNDS.y0, BOUNDS.y1 - 20); }
        if (inEllipse(d.x, d.y, POOL, 1.15) && d.state === 'run') this.pickRun(d);
        d.hop += dt * (Math.hypot(d.vx, d.vy) > 40 ? 14 : 3);
        // puddle splashes
        const pud = PUDDLES.find((p) => inEllipse(d.x, d.y, p, 0.95));
        if (pud && Math.hypot(d.vx, d.vy) > 120 && d.splashCd <= 0) this.mudSplash(d, pud);
        if (sprayed && chance(dt * 2)) { d.vz = 260; }
        break;
      }
      case 'roll': {
        d.rollT -= dt; d.vx = damp(d.vx, 0, 8, dt); d.vy = damp(d.vy, 0, 8, dt);
        d.mud = Math.min(1, d.mud + dt * 0.5);
        if (chance(dt * 6)) particles.burst(d.x + rand(-30, 30), d.y - 10, { type: 'drop', count: 2, colors: ['#7a4a22', '#946033'], speed: [60, 180] });
        if (sprayed) d.rollT = Math.min(d.rollT, 0.1);
        if (d.rollT <= 0) { d.state = 'run'; this.pickRun(d); d.vz = 380; }
        break;
      }
      case 'shake': {
        d.shakeT -= dt;
        if (chance(dt * 40)) {
          const a = rand(TAU);
          particles.burst(d.x + Math.cos(a) * 30, d.y - 50 * this.pScale(d) + Math.sin(a) * 20, { type: 'drop', count: 2, colors: ['#bfeaff', '#ffffff', '#7fd3ff'], angle: a, spread: 0.3, speed: [300, 600], size: [6, 12] });
        }
        if (d.shakeT <= 0) { d.state = 'bark'; d.barkT = 0.55; this.bark(d); }
        break;
      }
      case 'bark': {
        d.barkT -= dt;
        if (d.barkT <= 0) this.goPorch(d);
        break;
      }
      case 'toporch': {
        const dd = dist(d.x, d.y, d.wx, d.wy);
        const sp = 560;
        if (dd > 6) { d.x += ((d.wx - d.x) / dd) * Math.min(sp * dt, dd); d.y += ((d.wy - d.y) / dd) * Math.min(sp * dt, dd); d.hop += dt * 16; if (d.z <= 0 && chance(dt * 3)) d.vz = 300; }
        else { d.state = 'porch'; d.sq = 0.3; d.facing = d.x < W / 2 ? 1 : -1; particles.burst(d.x, d.y - 20, { type: 'heart', count: 3, colors: ['#ff6fb1', '#ff9ad5'], speed: [60, 140] }); snd('ps-flop', 'land', { vol: 0.4 }); }
        break;
      }
      case 'inside': {
        const dd = dist(d.x, d.y, d.wx, d.wy);
        if (dd > 8) { d.x += ((d.wx - d.x) / dd) * Math.min(420 * dt, dd); d.y += ((d.wy - d.y) / dd) * Math.min(420 * dt, dd); d.hop += dt * 16; }
        else { d.gone = true; particles.burst(d.x, d.y - 20, { type: 'heart', count: 2, colors: ['#ff6fb1'] }); }
        break;
      }
      case 'porch': {
        if (chance(dt * 0.12)) { d.barkT = 0.3; this.bark(d, 0.25); d.vz = 200; }
        d.barkT = Math.max(0, d.barkT - dt);
        break;
      }
      default: break;
    }
    if (Math.abs(d.x - px) > 0.5) d.facing = d.x > px ? 1 : -1;
  }

  pScale(d) { return (d.big ? 1.9 : 1) * (d.state === 'porch' || d.state === 'inside' || (d.state === 'toporch' && d.y < PORCH_Y + 40) ? 0.72 : 1) * depthScale(d.y, { top: PORCH_Y, near: 1000, far: 0.82 }); }

  mudSplash(d, pud) {
    d.splashCd = 0.6;
    particles.burst(d.x, d.y, { type: 'drop', count: 8, colors: ['#7a4a22', '#946033', '#5e3816'], speed: [120, 300], size: [8, 14] });
    if (this.t - this.splashAt > 0.2) { this.splashAt = this.t; snd('ps-squelch', 'splat', { vol: 0.35, rate: rand(0.9, 1.2) }); }
    d.mud = Math.min(1, d.mud + 0.15);
    for (const e of this.ents) {
      if (dist(e.x, e.y, d.x, d.y) < 150 && e.mud <= 0.2) {
        e.mud = 3; e.a.playOnce('surprised', 0.4); e.a.tint('#8a5a2b', 0.35);
        particles.popText(e.x, e.y - e.a.height - 30, 'Splat!', '#a8682e', 40);
      }
    }
  }

  bark(d, vol = 0.6) {
    d.barkT = Math.max(d.barkT, 0.3);
    if (this.t - this.barkAt < 0.12) return;
    this.barkAt = this.t;
    snd(d.big ? 'ps-big-woof' : 'ps-bark', d.big ? 'roar' : 'squeak', { vol, rate: d.big ? 1 : rand(1.0, 1.3) });
  }

  clean(d) {
    d.mud = 0; d.state = 'shake'; d.shakeT = d.big ? 1.1 : 0.75; d.vz = 240; d.vx = d.vy = 0;
    const v = d.big ? 3 : 1;
    this.team += v;
    // the hose that did most of the work gets the puppy; helpers get a sparkle
    let best = null, bv = -1;
    for (const [e, c] of d.credit) if (c > bv) { bv = c; best = e; }
    const sc = this.pScale(d);
    snd('ps-shake', 'pet-shake', { vol: 0.8 }); sfx('sparkle'); snd('ps-clean', 'star', { vol: 0.6 });
    particles.burst(d.x, d.y - 60 * sc, { type: 'sparkle', count: 14, colors: ['#ffffff', '#fff6a8', '#bfeaff'] });
    particles.ring(d.x, d.y - 40 * sc, '#bfeaff', 230 * (d.big ? 1.6 : 1), 0.5);
    if (best) {
      best.cleaned += v;
      particles.popText(d.x, d.y - 130 * sc, '+' + v, '#ffffff', d.big ? 70 : 54);
      best.a.playOnce('cheer', 0.6);
      if (!best.p.isAI) best.p.ctrl.rumble(0.35, 90);
      for (const [e, c] of d.credit) if (e !== best && c > 0.25 * d.hp) { e.a.playOnce('cheer', 0.5); e.a.emote('star', 0.8); }
    }
    // the shake gets everyone close wet
    const R = d.big ? 420 : 240;
    for (const e of this.ents) if (dist(e.x, e.y, d.x, d.y) < R) this.soak(e, d.x);
    if (d.big) {
      fx.slowmo(0.4, 0.8); fx.shake(14, 0.5); fx.flash('#ffffff', 0.2);
      particles.confettiRain(W, 100);
      this.api.camera && this.api.camera.punch(d.x, d.y - 100, 1.25, 0.6);
      snd('ps-hooray', 'fanfare');
      for (const e of this.ents) { e.a.playOnce('celebrate', 1.2); voice(e.p.charId, 'woo'); }
    } else if (this.team % 5 === 0) {
      sfx('yay'); particles.popText(W / 2, 200, `${this.team}!`, '#ffe066', 80);
      fx.shake(5, 0.2);
    }
  }

  soak(e, fromX) {
    if (e.wet > 1.2) return;
    e.wet = 2.2;
    if (e.mud > 0) { e.mud = 0; e.a.tint(null); particles.burst(e.x, e.y - e.a.height * 0.6, { type: 'sparkle', count: 6, colors: ['#fff', '#bfeaff'] }); }
    e.a.playOnce('surprised', 0.35, 'idle');
    later(() => e.a.playOnce('shake', 0.6), 350);
    e.vx += (e.x >= fromX ? 1 : -1) * 260;
    particles.burst(e.x, e.y - e.a.height * 0.9, { type: 'drop', count: 10, colors: ['#bfeaff', '#ffffff', '#7fd3ff'], speed: [80, 240] });
    if (e.giggleCd <= 0) { e.giggleCd = 2.5; voice(e.p.charId, 'laugh'); }
    if (!e.p.isAI) e.p.ctrl.rumble(0.3, 120);
  }

  goPorch(d) {
    d.state = 'toporch';
    let slot = this.slots.find((sl) => !sl.pup);
    if (!slot) {
      // porch is full: the sleepiest puppy trots in through the door for a nap
      const old = this.porch.shift();
      slot = old.slot; old.slot = null; old.state = 'inside'; old.wx = 960 + rand(-30, 30); old.wy = 178;
    }
    slot.pup = d; slot.used = true; d.slot = slot;
    this.porch.push(d);
    d.wx = slot.x; d.wy = slot.y;
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); this.syncActor(e); e.a.update(dt); }
    for (const d of this.pups) this.updatePup(d, dt);
  }

  update(dt) {
    this.t += dt; this.playT += dt;
    this.timeLeft = Math.max(0, DURATION - this.playT);
    if (!this.zoomies && this.timeLeft <= ZOOMIES_AT) this.startZoomies();
    if (this.zoomies) this.zoomT += dt;
    if (this.bigBanner !== undefined) this.bigBanner += dt;
    if (!this.bigDone && this.timeLeft <= BIG_AT) this.startBig();
    this.spawning(dt);
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate(dt);
    for (const e of this.ents) this.spray(e, dt);
    for (const d of this.pups) this.updatePup(d, dt);
    this.pups = this.pups.filter((d) => !d.gone);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
    if (this.api.camera) this.api.camera.follow(W / 2, H / 2, 1, 3);
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.spraying = false; this.movePlayer(e, dt); this.syncActor(e); e.a.update(dt); }
    for (const d of this.pups) this.updatePup(d, dt);
  }

  syncActor(e) {
    e.a.x = e.x; e.a.y = e.y; e.a.z = e.a._hop ? e.a._hop.z : 0;
    e.a.scale = this.baseScale * e.sizeK * depthScale(e.y, { top: PORCH_Y, near: 1000, far: 0.84, nearScale: 1.04 });
  }

  spawning(dt) {
    const muddy = this.pups.filter((d) => d.state === 'run' || d.state === 'enter' || d.state === 'roll').length;
    this.spawnT -= dt;
    if (muddy < this.muddyTarget() + (this.zoomies ? 3 : 0) && this.spawnT <= 0) {
      this.spawnT = this.zoomies ? rand(0.3, 0.6) : rand(0.6, 1.3);
      this.spawnPup(false);
      if (chance(0.5)) this.bark(this.pups[this.pups.length - 1], 0.3);
    }
  }

  startZoomies() {
    this.zoomies = true; this.zoomT = 0;
    sfx('whistle'); snd('ps-zoomies', 'magic'); fx.flash('#fff6a8', 0.2); fx.shake(8, 0.3);
    for (let k = 0; k < 3; k++) this.spawnPup(false);
  }

  startBig() {
    this.bigDone = true;
    const d = this.spawnPup(false, true);
    this.bigPup = d;
    fx.shake(10, 0.4); snd('ps-big-woof', 'roar', { vol: 0.7 }); sfx('stomp');
    this.bigBanner = 0;
    for (const e of this.ents) e.a.playOnce('surprised', 0.5);
  }

  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.wet = Math.max(0, e.wet - dt); e.giggleCd = Math.max(0, e.giggleCd - dt); e.poolCd = Math.max(0, e.poolCd - dt);
    if (e.mud > 0) { e.mud -= dt; if (e.mud <= 0) a.tint(null); }
    if (e.bubble > 0) e.bubble -= dt;
    // the gallery: a kid still runs about the yard and jumps (X: A goes on); CPUs celebrate in place
    const still = this.done && p.isAI;
    let ix = still ? 0 : c.x, iy = still ? 0 : c.y;
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    e.spraying = !this.done && c.held('a');
    // aim: the stick sets it; while standing still the aim stays put
    if (m > 0.3) {
      const ta = Math.atan2(iy, ix);
      e.aim += angDiff(ta, e.aim) * Math.min(1, dt * (e.spraying ? 9 : 16));
    }
    const sp = MAX_SPEED * (p.isAI ? CPU_SPEED[clamp(p.aiLevel ?? 0, 0, 2)] / aiProfile(p).speed : 1) * (e.spraying ? SPRAY_SLOW : 1);
    e.vx = damp(e.vx, ix * sp, 10, dt); e.vy = damp(e.vy, iy * sp * 0.85, 10, dt);
    const dd = e.dash.update(dt, c, { x: e.x, y: e.y, actor: a, ok: !p.isAI });   // B: a short dash
    e.x = clamp(e.x + e.vx * dt + dd.x, BOUNDS.x0, BOUNDS.x1); e.y = clamp(e.y + e.vy * dt + dd.y, BOUNDS.y0, BOUNDS.y1);
    // bubble pool: wade in for a bubble hose
    if (inEllipse(e.x, e.y, POOL, 1.05)) {
      if (e.bubble < 6.5 && e.poolCd <= 0) {
        e.bubble = 8; e.poolCd = 1;
        snd('ps-bubbles', 'bubble', { vol: 0.7 }); sfx('magic');
        particles.burst(e.x, e.y - 40, { type: 'bubble', count: 14, colors: ['#ffffff', '#bfeaff', '#ffd6f0'], speed: [60, 200] });
        particles.popText(e.x, e.y - a.height - 40, 'Bubbles!', '#ff8fc7', 46);
        a.playOnce('dance', 0.6);
      }
      if (chance(dt * 8)) particles.burst(e.x + rand(-40, 40), e.y - 10, { type: 'bubble', count: 1, colors: ['#fff', '#bfeaff'], speed: [20, 80] });
    }
    // through a puddle: splat!
    if (Math.hypot(e.vx, e.vy) > 200 && e.mud <= 0 && PUDDLES.some((pd) => inEllipse(e.x, e.y, pd, 0.9))) {
      e.mud = 2.5; a.tint('#8a5a2b', 0.3); snd('ps-squelch', 'splat', { vol: 0.4 });
      particles.burst(e.x, e.y, { type: 'drop', count: 8, colors: ['#7a4a22', '#946033'], speed: [100, 260] });
    }
    if (e.spraying) {
      if (!a._once) a.setPose(poseName('hose-spray'));
      a.facing = Math.cos(e.aim) >= 0 ? 1 : -1;
      a.speed = clamp(Math.hypot(e.vx, e.vy) / sp, 0, 1);
    } else if (this.done && !p.isAI && celebrateHop(a, c.pressed('x'), dt, { scale: this.baseScale }).air) { /* jumping for joy */ }
    else if (this.done && (p.isAI || Math.hypot(e.vx, e.vy) < 40)) { if (!a._once && a.pose !== 'celebrate') a.setPose('celebrate'); }
    else a.moveAnim(e.vx, e.vy, sp, { run: Math.hypot(e.vx, e.vy) > sp * 0.6 });
  }

  separate(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const r = (A.a.radius + B.a.radius) * 0.6;
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy);
      if (d < r && d > 0.01) {
        const k = ((r - d) / d) * 0.5 * Math.min(1, dt * 14);
        A.x -= dx * k; A.y -= (dy / 1.6) * k; B.x += dx * k; B.y += (dy / 1.6) * k;
      }
    }
  }

  nozzle(e) {
    const a = e.a, h = a.height;
    return { x: e.x + Math.cos(e.aim) * (h * 0.22 + 16), y: e.y - h * 0.45 + Math.sin(e.aim) * 14 };
  }

  spray(e, dt) {
    e.streamPh += dt * 12;
    if (!e.spraying) { e.sprayT = 0; e.hitD = 0; return; }
    e.sprayT += dt;
    const n = this.nozzle(e);
    // aim assist: bend toward the nearest muddy puppy in a wide cone
    let assist = null, ad = 1e9;
    for (const d of this.pups) {
      if (d.mud <= 0 || d.state === 'enter' && (d.x < 40 || d.x > W - 40)) continue;
      if (d.state !== 'run' && d.state !== 'roll' && d.state !== 'enter') continue;
      const cy = d.y - 40 * this.pScale(d);
      const dd = dist(n.x, n.y, d.x, cy);
      if (dd > RANGE + 60) continue;
      const da = Math.abs(angDiff(Math.atan2(cy - n.y, d.x - n.x), e.aim));
      if (da < 0.7 && dd + da * 300 < ad) { ad = dd + da * 300; assist = { d, a: Math.atan2(cy - n.y, d.x - n.x) }; }
    }
    if (assist) e.aim += angDiff(assist.a, e.aim) * Math.min(1, dt * 6);
    // stream length: stops at the first puppy it hits
    let reach = RANGE;
    const bubble = e.bubble > 0;
    const rate = CLEAN_RATE * (bubble ? 2 : 1) * (e.p.isAI ? CPU_CLEAN[clamp(e.p.aiLevel ?? 0, 0, 2)] : 1);
    let hitAny = false;
    for (const d of this.pups) {
      if (d.mud <= 0 || (d.state !== 'run' && d.state !== 'roll' && d.state !== 'enter')) continue;
      const sc = this.pScale(d);
      const cy = d.y - 45 * sc;
      const dd = dist(n.x, n.y, d.x, cy);
      if (dd > RANGE + 40 * sc) continue;
      const da = Math.abs(angDiff(Math.atan2(cy - n.y, d.x - n.x), e.aim));
      if (da < CONE + (55 * sc) / Math.max(60, dd)) {
        hitAny = true;
        reach = Math.min(reach, dd);
        d.sprayed = 0.25;
        d.mud = Math.max(0, d.mud - (rate * dt) / d.hp);
        d.credit.set(e, (d.credit.get(e) || 0) + rate * dt);
        if (chance(dt * 14)) particles.burst(d.x + rand(-30, 30) * sc, cy + rand(-20, 20) * sc, { type: bubble ? 'bubble' : 'drop', count: 2, colors: bubble ? ['#fff', '#ffd6f0', '#bfeaff'] : ['#7a4a22', '#bfeaff', '#ffffff'], speed: [80, 220] });
        if (chance(dt * 4)) snd('ps-scrub', 'scrub', { vol: 0.25 });
        if (d.mud <= 0) this.clean(d);
      }
    }
    // splash a friend!
    for (const o of this.ents) {
      if (o === e) continue;
      const cy = o.y - o.a.height * 0.5;
      const dd = dist(n.x, n.y, o.x, cy);
      if (dd > reach + 30) continue;
      const da = Math.abs(angDiff(Math.atan2(cy - n.y, o.x - n.x), e.aim));
      if (da < CONE + 50 / Math.max(60, dd)) {
        if (o.wet <= 1.2 && (!e.p.isAI || chance(dt * 3))) { this.soak(o, e.x); if (!e.p.isAI || !o.p.isAI) particles.popText(o.x, o.y - o.a.height - 40, 'Splash!', '#7fd3ff', 44); e.a.playOnce('laugh', 0.5, poseName('hose-spray')); sfx('splash'); }
      }
    }
    e.hitD = reach;
    // stream sound (gated)
    if (e.sprayT < dt * 1.5) snd('ps-hose', 'hose-sputter', { vol: 0.35 });
    if (chance(dt * (hitAny ? 6 : 3))) snd('ps-spray', 'water', { vol: 0.15 });
    // spray droplets at the end of the stream
    const ex = n.x + Math.cos(e.aim) * reach, ey = n.y + Math.sin(e.aim) * reach + this.streamDrop(reach);
    if (chance(dt * 30)) particles.burst(ex, ey, { type: bubble ? 'bubble' : 'drop', count: 1, colors: bubble ? ['#ffffff', '#ffd6f0', '#bfeaff', '#fff6a8'] : ['#bfeaff', '#ffffff', '#7fd3ff'], speed: [60, 200], size: bubble ? [10, 22] : [6, 11] });
  }

  streamDrop(len) { return (len / RANGE) ** 2 * 26; }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), c = p.ctrl;
    if (e.brain.ready(dt)) {
      e.wander = 0;
      const muddy = this.pups.filter((d) => d.mud > 0 && (d.state === 'run' || d.state === 'roll') );
      if (chance(prof.mistake * 1.2)) { e.wander = rand(0.6, 1.3); e.wx = rand(200, W - 200); e.wy = rand(BOUNDS.y0 + 40, 950); e.target = null; }
      else if (e.bubble <= 0 && dist(e.x, e.y, POOL.x, POOL.y) < 450 && chance(0.25)) { e.target = 'pool'; }
      else if (muddy.length) {
        const pool = chance(prof.mistake) ? muddy : muddy.slice().sort((a, b) => dist(a.x, a.y, e.x, e.y) - (a.big ? 400 : 0) - dist(b.x, b.y, e.x, e.y) + (b.big ? 400 : 0)).slice(0, 2);
        e.target = pick(pool);
      } else e.target = null;
      e.brain.wait(reactionTime(p) + rand(0.3, 0.7));
    }
    e.restT = Math.max(0, e.restT - dt);
    let tx = e.x, ty = e.y, hold = false;
    if (e.wander > 0) { e.wander -= dt; tx = e.wx; ty = e.wy; }
    else if (e.target === 'pool') { tx = POOL.x; ty = POOL.y; if (e.bubble > 0) e.target = null; }
    else if (e.target && e.target.mud > 0 && e.target.state !== 'shake') {
      const d = e.target;
      const dd = dist(e.x, e.y, d.x, d.y);
      const want = 250;
      // stand a hose-length away, then aim and spray
      const ang = Math.atan2(e.y - d.y, e.x - d.x);
      tx = d.x + Math.cos(ang) * want; ty = d.y + Math.sin(ang) * want * 0.7;
      if (dd < RANGE * 0.95) {
        hold = e.restT <= 0;
        if (chance(dt * prof.mistake * 0.8)) e.restT = rand(0.4, 1.0);   // easy CPUs pause now and then
        // aim by nudging the stick toward the puppy when close enough
        if (dd < want + 60) { const aa = Math.atan2(d.y - 40 - e.y, d.x - e.x) + rand(-1, 1) * prof.aimError * 0.4; c.move(Math.cos(aa) * 0.35, Math.sin(aa) * 0.35); c.hold('a', hold); return; }
      }
    } else e.target = null;
    c.hold('a', hold);
    const dd = steer(p, e.x, e.y, tx, ty, { arrive: 60 });
    if (dd < 10) c.move(0, 0);
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    const scores = this.ents.map((e) => e.cleaned);
    const top = Math.max(...scores);
    const highlight = top > 0 && this.n > 1 && scores.filter((s) => s === top).length === 1 ? scores.indexOf(top) : null;
    for (const e of this.ents) { e.spraying = false; e.a.clearEmotes(); e.a.setPose('celebrate'); }
    // every porch puppy barks hooray
    for (const d of this.porch) { d.vz = rand(300, 500); d.barkT = 0.5; }
    snd('ps-hooray', 'fanfare'); this.bark(this.porch[0] || { barkT: 0 }, 0.7);
    particles.confettiRain(W, 90);
    this.api.finish({
      showcase: true, highlight, title: `${this.team} clean puppies!`,
      stats: scores.map((s) => `${s} pupp${s === 1 ? 'y' : 'ies'}`),
      focus: { x: W / 2, y: 330, zoom: 1.2 },
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    const bg = art('bg/puppy-splash');
    if (bg) g.drawImage(bg, 0, 0, W, H); else drawBackyard(g, this.t, this.decor);
    for (const p of PUDDLES) { if (!drawArt(g, 'prop/mud-puddle', p.x, p.y, p.rx * 2.1, p.ry * 2.3)) drawPuddle(g, p, this.t); }
    if (!drawArt(g, 'prop/bubble-pool', POOL.x, POOL.y, 360, 230)) drawPool(g, this.t);
    if (chance(0.06)) particles.burst(POOL.x + rand(-120, 120), POOL.y + rand(-50, 30), { type: 'bubble', count: 1, colors: ['#ffffff', '#bfeaff', '#ffd6f0'], speed: [20, 70], size: [10, 20] });
    // porch beds + clean puppies
    const porch = this.pups.filter((d) => d.state === 'porch').sort((a, b) => a.y - b.y);
    for (const b of this.slots) {
      if (!b.used) continue;
      g.save(); g.translate(b.x, b.y + 6); const s = b.pup && b.pup.big ? 1.1 : 0.66; g.scale(s, s);
      if (!drawArt(g, 'prop/dog-bed', 0, 0, 150, 82, { anchor: 'bottom' })) drawBed(g, b.c);
      g.restore();
    }
    for (const d of porch) this.drawPup(g, d);
    // yard: sorted by depth
    const items = [];
    for (const d of this.pups) if (d.state !== 'porch') items.push({ y: d.y, f: () => this.drawPup(g, d) });
    for (const e of this.ents) items.push({ y: e.y, f: () => this.drawPlayer(g, e) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();
    // streams on top so they always read
    for (const e of this.ents) if (e.spraying) this.drawStream(g, e);
    for (const e of this.ents) {
      const a = e.a;
      if ((this.playT < 6 || !e.p.isAI) && !this.api.ended?.()) ui.playerTag(g, e.p, e.x, e.y - a.height - 22 - (a.emotes.length ? 50 : 0));
    }
  }

  drawPlayer(g, e) {
    const a = e.a;
    if (e.bubble > 0) {
      g.save(); g.globalAlpha = 0.35 + 0.15 * Math.sin(this.t * 8);
      g.strokeStyle = RAINBOW[Math.floor(this.t * 6) % RAINBOW.length]; g.lineWidth = 6;
      g.beginPath(); g.ellipse(e.x, e.y, a.radius * 1.4, a.radius * 0.55, 0, 0, TAU); g.stroke(); g.restore();
    }
    // hose trailing on the grass behind the player
    const n = this.nozzle(e);
    const back = Math.cos(e.aim) >= 0 ? -1 : 1;
    g.save(); g.strokeStyle = '#2e9a48'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(n.x, n.y); g.quadraticCurveTo(e.x + back * 40, e.y + 10, e.x + back * 110, e.y + 26 + Math.sin(this.t * 2 + e.i) * 6); g.stroke();
    g.strokeStyle = '#5fd47a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(n.x, n.y - 2); g.quadraticCurveTo(e.x + back * 40, e.y + 8, e.x + back * 110, e.y + 24 + Math.sin(this.t * 2 + e.i) * 6); g.stroke();
    g.restore();
    a.draw(g, { ring: e.p.color });
    // nozzle
    g.save(); g.translate(n.x, n.y); g.rotate(e.aim); if (Math.cos(e.aim) < 0) g.scale(1, -1);
    if (!drawArt(g, 'prop/hose-nozzle', 6, 0, 70, 40)) drawNozzle(g);
    g.restore();
    if (e.wet > 0 && chance(0.3)) particles.burst(e.x + rand(-30, 30), e.y - a.height * rand(0.3, 0.9), { type: 'drop', count: 1, colors: ['#bfeaff', '#7fd3ff'], speed: [10, 40], gravity: 600 });
    if (e.bubble > 0 && chance(0.15)) particles.burst(e.x + rand(-30, 30), e.y - a.height * rand(0.4, 1), { type: 'bubble', count: 1, colors: ['#ffffff', '#ffd6f0', '#bfeaff'], speed: [20, 60] });
  }

  drawStream(g, e) {
    const n = this.nozzle(e);
    const len = Math.max(40, e.hitD);
    const bubble = e.bubble > 0;
    const k = clamp(e.sprayT / 0.15, 0, 1);
    const L = len * k;
    const cx = Math.cos(e.aim), cy = Math.sin(e.aim);
    const ex = n.x + cx * L, ey = n.y + cy * L + this.streamDrop(L);
    const mx = n.x + cx * L * 0.5, my = n.y + cy * L * 0.5 - 18 * k + this.streamDrop(L) * 0.2;
    g.save(); g.lineCap = 'round';
    const layers = bubble ? [['rgba(255,170,220,0.45)', 30], ['rgba(191,234,255,0.8)', 18], ['#ffffff', 7]] : [['rgba(127,211,255,0.45)', 30], ['rgba(127,211,255,0.9)', 16], ['#ffffff', 6]];
    for (const [c, w] of layers) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(n.x, n.y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); }
    // wobbling droplets along the stream
    for (let i = 0; i < 8; i++) {
      const f = ((i / 8) + e.streamPh * 0.08) % 1;
      const px = lerp(lerp(n.x, mx, f), lerp(mx, ex, f), f), py = lerp(lerp(n.y, my, f), lerp(my, ey, f), f);
      g.fillStyle = bubble ? RAINBOW[i % RAINBOW.length] : '#ffffff';
      g.globalAlpha = bubble ? 0.6 : 0.9;
      g.beginPath(); g.arc(px + Math.sin(e.streamPh + i) * 6, py + Math.cos(e.streamPh * 1.3 + i) * 6, bubble ? 9 : 5, 0, TAU);
      if (bubble) { g.lineWidth = 3; g.strokeStyle = g.fillStyle; g.stroke(); } else g.fill();
    }
    g.globalAlpha = 0.6; g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(ex, ey, 26, 14, 0, 0, TAU); g.fill();
    g.restore();
  }

  drawPup(g, d) {
    const sc = this.pScale(d);
    const t = d.t;
    const moving = Math.hypot(d.vx, d.vy) > 40 && (d.state === 'run' || d.state === 'enter') || d.state === 'toporch' || d.state === 'inside';
    const bob = moving ? Math.abs(Math.sin(d.hop)) * 8 : 0;
    g.save();
    g.fillStyle = 'rgba(36,22,63,0.2)'; g.beginPath(); g.ellipse(d.x, d.y, 50 * sc, 12 * sc, 0, 0, TAU); g.fill();
    if (d.state === 'porch' || d.state === 'toporch' || d.state === 'bark') {
      // fresh-and-fluffy glow
      g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4); g.fillStyle = '#fff6a8';
      g.beginPath(); g.ellipse(d.x, d.y - 50 * sc, 70 * sc, 50 * sc, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
    }
    g.translate(d.x, d.y - d.z - bob);
    const shaking = d.state === 'shake';
    let rot = 0;
    if (shaking) rot = Math.sin(t * 60) * 0.18;
    else if (d.state === 'roll') rot = Math.sin(t * 8) * 1.2;
    else if (d.sprayed > 0) rot = Math.sin(t * 20) * 0.05;
    const sq = d.sq;
    g.scale(sc * d.facing * (1 + sq * 0.4), sc * (1 - sq * 0.4));
    g.translate(0, -30); g.rotate(rot); g.translate(0, 30);
    const key = shaking && d.breed === 0 && art('prop/puppy-shake') ? 'prop/puppy-shake' : `prop/puppy-${(d.breed % 4) + 1}`;
    const drewArt = !d.big && drawArt(g, key, 0, 0, 122, 100, { anchor: 'bottom' });
    if (!drewArt) {
      drawPuppy(g, {
        breed: d.breed, mud: d.mud, t, run: moving ? 1 : 0, wag: d.sprayed > 0 || d.state === 'porch' || d.state === 'bark' || d.state === 'toporch',
        shake: shaking ? 1 : 0, tongue: d.tongue && !shaking, bark: d.barkT > 0.05, sit: d.state === 'porch', eyesShut: shaking || d.state === 'roll' || d.sprayed > 0 && Math.sin(t * 3) > 0.3,
        fluff: d.mud <= 0 ? 1 : 0,
      });
    }
    drawMud(g, d.blobs, d.mud, t);
    g.restore();
    if (d.barkT > 0.05 && d.state !== 'porch') {
      const bx = d.x + d.facing * 70 * sc, by = d.y - 120 * sc - d.z;
      g.save(); g.translate(bx, by); g.rotate(-0.1 * d.facing);
      ui.text(g, d.big ? 'WOOF!' : 'Woof!', 0, 0, { size: d.big ? 54 : 36, color: '#ffffff', strokeWidth: 6 });
      g.restore();
    }
    if (d.big && d.mud > 0) {
      // a big shared progress ring: everyone helps
      ui.bar(g, d.x - 90, d.y - d.z - 205 * sc, 180, 22, 1 - d.mud, '#7fd3ff');
    }
  }

  drawHUD(g) {
    // the gallery ending puts its ribbon and stars bar where the clock and counts were
    if (!this.api.ended?.()) {
      ui.timer(g, this.timeLeft);
      ui.scoreboard(g, this.players, this.ents.map((e) => e.cleaned), { y: 985, format: (v) => String(v), out: null });
    }
    const x = W - 260, y = 26;
    ui.panel(g, x, y, 230, 84, { r: 40, fill: '#eaf8ff', stroke: '#7fd3ff', lineWidth: 6 });
    g.save(); g.translate(x + 50, y + 78); g.scale(-0.55, 0.55); drawPuppy(g, { breed: 1, mud: 0, t: this.t, wag: true, tongue: true, fluff: 1 }); g.restore();
    ui.text(g, '×', x + 112, y + 44, { size: 36, color: NAVY, stroke: false });
    ui.text(g, String(this.team), x + 172, y + 44, { size: 52, color: NAVY, stroke: false, weight: 800 });
    if (this.zoomies && this.zoomT < 2.4) {
      g.save(); g.globalAlpha = clamp(2.4 - this.zoomT, 0, 1);
      ui.banner(g, 'Zoomies!', this.zoomT, { y: 540, size: 150, color: '#ff8fc7' });
      g.restore();
    }
    if (this.bigPup && this.bigBanner !== undefined && this.bigBanner < 2.4) {
      g.save(); g.globalAlpha = clamp(2.4 - this.bigBanner, 0, 1);
      ui.banner(g, 'Giant muddy puppy!', this.bigBanner, { y: 540, size: 120, color: '#ffd23f' });
      g.restore();
    }
  }
}

