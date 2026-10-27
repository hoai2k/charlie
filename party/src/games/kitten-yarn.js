// Kitten Cuddles (Molly Party) - kittens leap off two cat trees, ride in on
// yarn balls and flutter down on fairy wings. Run under them with your basket
// (they boing off your head into it), press A to cuddle everyone you're
// holding, and they hop onto the giant cushion bed where a nap pile grows.
// Basket full? The next kitten sits on your head. Gentle counting: every
// cuddle counts, ties share.
//
// Art hooks (all optional, procedural fallbacks ship today): bg/kitten-yarn,
//   prop/kitten-atlas, prop/kitten-fairy, prop/yarn-ball-{pink,blue,yellow},
//   prop/kitten-basket(+-front), prop/kitten-cattree, prop/kitten-bed
// New-pose hooks: 'cuddle' -> catch -> cheer
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { easySteer, easyPrompt } from '../engine/easy.js';
import { drawHeartShape } from '../engine/emotes.js';
import { bodyRadius, claimed } from '../engine/crowd.js';
import { clamp, approach, rand, randInt, pick, chance, TAU, placementsFromScores } from '../engine/util.js';
import {
  GROUND_Y, BED, NAVY, drawKitten, drawYarn, drawBasketBack, drawBasketFront, drawCatTree, perchPoint, drawBed, drawBedFront, drawRoom, YARN,
} from './kitten-yarn/art.js';

import { meta } from './kitten-yarn.meta.js';

export { meta };

// --- tuning -----------------------------------------------------------------
const DURATION = 45;
const PARTY_AT = 12;          // last seconds: Kitten Party (everything doubles)
const G = 1500;               // kitten gravity
const MAX_SPEED = 640;
const JUMP_V = 820, JUMP_G = 2400;
const CAP = 3;                // kittens per basket
const SOLO_GOAL = 20;
const ESCAPE_T = 6.5;         // an uncuddled kitten hops out after this long
const NEW_POSE_FALLBACK = { cuddle: 'catch' };
const poseName = (n) => (POSE_NAMES.includes(n) ? n : NEW_POSE_FALLBACK[n] || 'cheer');
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

let kid = 0;

/** Like engine steer(), but at a capped Molly-Party speed. */
function steerTo(p, fx, fy, tx, ty, arrive, speed, wobble = 0) {
  const dx = tx - fx, dy = ty - fy, d = Math.hypot(dx, dy);
  if (d < 1) { p.ctrl.move(0, 0); return d; }
  const ang = Math.atan2(dy, dx) + Math.sin(performance.now() / 400 + p.index * 1.7) * wobble;
  const k = clamp(d / arrive, 0, 1) * speed;
  p.ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
  return d;
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.easy = !!api.easy;     // Molly Easy: humans auto-run to kittens, A cuddles
    const n = this.n = this.players.length;
    this.t = 0; this.timeLeft = DURATION; this.done = false; this.party = false; this.partyT = 0;
    // the nap clock, shown the whole game
    api.limit(() => (this.done ? null : this.timeLeft), { showAt: Infinity });
    this.scale = n <= 3 ? 1 : n <= 4 ? 0.92 : n <= 6 ? 0.84 : 0.76;
    this.kittens = [];
    this.balls = [];            // loose yarn balls (after the rider hopped off)
    this.pile = 0;              // kittens napping on the bed
    this.spawnT = 0.4; this.rollT = 2.2; this.fairyT = rand(7, 10);
    this.mewAt = -1;
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? W / 2 : 380 + ((W - 760) * i) / (n - 1);
      const lane = ((i % 3) - 1) * 12;
      const a = new Actor(p, { scale: this.scale, x, y: GROUND_Y + lane });
      if (a.leader.h < 80) a.scale *= 1.7;   // tiny fairy avatars
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      return { p, a, i, x, vx: 0, pv: 0, z: 0, vz: 0, lane, score: 0, basket: [], head: null, brain: new Brain(p), target: null, err: 0, wander: 0, wanderX: x, hold: 1, cuddleWait: 0, bumpCd: 0, popN: 0, popT: 0, flashT: 0 };
    });
    // a few kittens already waiting on the trees
    for (let s = 0; s < 2; s++) for (let l = 0; l < 3; l++) if (l !== 1 || s === 0) this.addPerch(s, l, rand(0.6, 2.4));
  }

  // ------------------------------------------------------------------ helpers
  bw() { return 170 * this.scale; }
  rimY(e) { return GROUND_Y + e.lane + 30 - this.bw() * 0.42; }
  headY(e) { return e.a.anchor('head').y; }
  slotPos(e, idx) {
    const bw = this.bw();
    const off = [0, -0.26, 0.26][idx] * bw;
    return { x: e.x + off, y: this.rimY(e) - 8 * this.scale };
  }
  pop(e, str, color, size = 50) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    const top = e.a.y - e.z - e.a.height - (e.head ? 60 : 10);
    const lvl = e.popN % 3;
    particles.popText(e.x + (lvl === 1 ? 40 : lvl === 2 ? -40 : 0), top - lvl * 50, str, color, size);
  }
  mew(rate = 1) {
    if (this.t - this.mewAt < 0.12) return;
    this.mewAt = this.t;
    snd('kit-mew', 'tiny-squeak', { vol: 0.5, rate: rand(0.95, 1.25) * rate });
  }

  newKitten(o) {
    const k = { id: kid++, coat: randInt(0, 5), fairy: false, state: 'perch', x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0, sq: 0, t: 0, age: rand(10), grace: 0, face: 1, ...o };
    this.kittens.push(k);
    return k;
  }
  addPerch(side, level, wait = rand(0.5, 1.4)) {
    const pp = perchPoint(side, level);
    return this.newKitten({ state: 'perch', side, level, x: pp.x, y: pp.y, wait, face: side === 0 ? 1 : -1 });
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.z = this.lift(e); e.a.moveAnim(0, 0, 1); e.a.update(dt); }
    for (const k of this.kittens) { k.age += dt; if (k.state === 'perch') k.t += dt * 0.3; }
  }

  update(dt) {
    this.t += dt;
    if (this.startT === undefined) this.startT = this.t - dt;
    const el = this.t - this.startT;
    this.timeLeft = Math.max(0, DURATION - el);
    if (!this.party && this.timeLeft <= PARTY_AT && !this.done) this.startParty();
    if (this.party) this.partyT += dt;
    if (!this.done) this.spawning(dt, el);
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      else if (this.easy && !this.done) this.easyThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.pushPlayers(dt);
    this.updateKittens(dt);
    this.updateBalls(dt);
    for (const e of this.ents) { e.a.x = e.x; e.a.z = e.z + this.lift(e); e.a.update(dt); }
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.x = e.x; e.a.update(dt); }
    this.updateKittens(dt);
    this.updateBalls(dt);
  }

  startParty() {
    this.party = true; this.partyT = 0;
    snd('kit-party', 'whistle'); sfx('magic'); fx.flash('#ffc2e6', 0.25); fx.shake(10, 0.35);
    particles.confettiRain(W, 100);
    // a stampede of yarn riders from both sides
    for (let i = 0; i < Math.min(3 + this.n, 9); i++) this.spawnRoller(i % 2, 0.25 * i);
  }

  spawning(dt, el) {
    const n = this.n;
    const live = this.kittens.filter((k) => k.state !== 'nap').length;
    const cap = 7 + n * 2;
    let interval = clamp(1.3 / (0.8 + 0.3 * n), 0.32, 1.1);
    if (this.party) interval *= 0.5;
    // trees always have someone waiting to leap
    this.spawnT -= dt;
    if (this.spawnT <= 0 && live < cap) {
      this.spawnT = interval * rand(0.7, 1.3);
      const side = randInt(0, 1), level = randInt(0, 2);
      if (!this.kittens.some((k) => k.state === 'perch' && k.side === side && k.level === level)) this.addPerch(side, level, rand(0.35, 0.9));
    }
    this.rollT -= dt;
    if (this.rollT <= 0 && live < cap + 2) {
      this.rollT = (this.party ? rand(1.2, 2) : rand(2.6, 4.2)) / Math.min(2, 0.8 + n * 0.15);
      this.spawnRoller(randInt(0, 1), 0);
    }
    this.fairyT -= dt;
    if (this.fairyT <= 0 && el > 3) {
      this.fairyT = this.party ? rand(4, 6) : rand(9, 12);
      if (!this.kittens.some((k) => k.fairy && k.state === 'flutter')) this.spawnFairy();
    }
  }

  spawnRoller(side, delay) {
    const dir = side === 0 ? 1 : -1;
    const k = this.newKitten({
      state: 'roll', x: side === 0 ? -80 - delay * 300 : W + 80 + delay * 300, y: GROUND_Y + 34, vx: dir * rand(380, 560), face: dir,
      ball: { ci: randInt(0, YARN.length - 1), rot: 0 }, hopX: rand(500, W - 500), bounce: rand(TAU),
    });
    if (!delay) { sfx('whoosh', { vol: 0.35 }); this.mew(1.1); }
    return k;
  }

  spawnFairy() {
    const x = rand(500, W - 500);
    this.newKitten({ state: 'flutter', fairy: true, coat: 2, x, baseX: x, y: -80, vy: 150, life: 13, ph: rand(TAU) });
    snd('kit-fairy', 'golden-chime'); sfx('sparkle');
    particles.popText(x, 150, 'Fairy kitty!', '#ff7ac6', 50);
  }

  leap(k, tx = null) {
    // aim at the middle of the room, often near someone
    if (tx === null) {
      // a few tries; keep the one farthest from where other kittens are already landing,
      // so 8 players spread over the room instead of all chasing one spot
      const landing = this.kittens.filter((o) => o !== k && o.state === 'leap').map((o) => o.landX);
      let bd = -1;
      for (let i = 0; i < 4; i++) {
        const e = chance(0.55) ? pick(this.ents) : null;
        const x = clamp(e ? e.x + rand(-180, 180) : rand(330, W - 330), 300, W - 300);
        const d = landing.reduce((m, lx) => Math.min(m, Math.abs(lx - x)), 1e9);
        if (d > bd) { bd = d; tx = x; }
        if (d > 300) break;
      }
    }
    tx = clamp(tx, 300, W - 300);
    const T = rand(1.0, 1.3) * (this.party ? 0.88 : 1);
    const ty = GROUND_Y - 20;
    k.state = 'leap'; k.landX = tx; k.vx = (tx - k.x) / T; k.vy = (ty - k.y - 0.5 * G * T * T) / T;
    k.spin = Math.sign(k.vx || 1) * rand(7, 11); k.grace = 0.15; k.face = Math.sign(k.vx || 1);
    sfx('jump', { vol: 0.35, rate: 1.3 }); this.mew();
  }

  updateKittens(dt) {
    for (const k of this.kittens) {
      k.age += dt; k.t += dt; k.sq = approach(k.sq, 0, dt * 3); k.grace -= dt;
      switch (k.state) {
        case 'perch':
          k.wait -= dt;
          if (k.wait <= 0 && !this.done) this.leap(k);
          break;
        case 'leap': {
          k.vy += G * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.spin * dt;
          if (k.x < 60 || k.x > W - 60) { k.vx = -k.vx * 0.6; k.x = clamp(k.x, 60, W - 60); }
          if (!this.done && k.vy > 0 && k.grace <= 0) this.tryCatch(k);
          if (k.state === 'leap' && k.y >= GROUND_Y + 10) this.toFloor(k, true);
          break;
        }
        case 'flutter': {
          k.life -= dt;
          k.x = clamp(k.baseX + Math.sin(k.t * 1.9 + k.ph) * 260, 120, W - 120);
          if (k.life <= 0) { k.vy = -260; } else if (k.y > GROUND_Y - 120) k.vy = -rand(220, 320);
          else if (k.y < 260 && k.vy < 0) k.vy = rand(120, 190);
          k.y += k.vy * dt;
          if (k.y < -160 && k.life <= 0) k.state = 'gone';
          if (Math.random() < dt * 18) particles.burst(k.x, k.y, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffc2f0', '#c9a0ff'], speed: [10, 50], size: [10, 18] });
          if (!this.done && k.vy > 0) this.tryCatch(k);
          break;
        }
        case 'roll': {
          k.x += k.vx * dt; k.ball.rot += (k.vx / 38) * dt;
          k.bounceY = -Math.abs(Math.sin(k.t * 7 + k.bounce)) * 10;
          if (!this.done) this.tryScoop(k, 80);
          if (k.state !== 'roll') break;
          const passed = k.vx > 0 ? k.x > k.hopX : k.x < k.hopX;
          if (passed) {
            // hop off; the kitten chases its yarn ball
            this.balls.push({ x: k.x, vx: k.vx * 0.9, rot: k.ball.rot, ci: k.ball.ci, trail: [] });
            k.ball = null; this.toFloor(k, false); k.vy = -420; k.air = true; k.chase = this.balls[this.balls.length - 1];
            this.mew(1.15);
          }
          break;
        }
        case 'floor': this.floorKitten(k, dt); break;
        case 'hop': {
          // tween into a basket / onto a head
          k.ht += dt / 0.28;
          const e = k.owner;
          const to = k.toHead ? this.headPos(e) : this.slotPos(e, e.basket.indexOf(k));
          const u = clamp(k.ht, 0, 1);
          k.x = k.fx + (to.x - k.fx) * u; k.y = k.fy + (to.y - k.fy) * u - Math.sin(u * Math.PI) * 70;
          k.rot *= Math.exp(-dt * 14);
          if (u >= 1) { k.state = k.toHead ? 'head' : 'basket'; k.sq = 0.4; k.bt = 0; snd('kit-plop', 'cush-plop', { vol: 0.5, rate: rand(1, 1.2) }); }
          break;
        }
        case 'basket': case 'head': {
          k.bt += dt;
          const e = k.owner;
          const to = k.state === 'head' ? this.headPos(e) : this.slotPos(e, e.basket.indexOf(k));
          k.x = to.x; k.y = to.y; k.rot = Math.sin(k.t * 3) * 0.06;
          if (k.bt > ESCAPE_T && !this.done) this.escape(k);
          break;
        }
        case 'hug': {
          k.ht += dt;
          const e = k.owner;
          const c = e.a.anchor('center');
          k.x += (c.x + k.hx - k.x) * Math.min(1, dt * 16); k.y += (c.y - 10 + k.hy - k.y) * Math.min(1, dt * 16);
          if (k.ht > 0.42) this.flyToBed(k);
          break;
        }
        case 'fly': {
          k.ft += dt / k.fd;
          const u = clamp(k.ft, 0, 1);
          const sp = this.pileSlot(k.slot);
          k.x = k.fx + (sp.x - k.fx) * u; k.y = k.fy + (sp.y - k.fy) * u - Math.sin(u * Math.PI) * 260;
          k.rot += dt * 9 * k.face;
          if (u >= 1) {
            k.state = 'nap'; k.rot = 0; k.sq = 0.4; k.x = sp.x; k.y = sp.y;
            snd('kit-nap', 'pop', { vol: 0.35, rate: rand(1.1, 1.4) });
            particles.burst(k.x, k.y, { type: 'heart', count: 3, colors: ['#ff6fb1', '#ffb3d9'], speed: [40, 120], size: [12, 20] });
          }
          break;
        }
        case 'climb': {
          k.ct += dt / 0.7;
          const u = clamp(k.ct, 0, 1);
          k.x = k.fx + (k.tx - k.fx) * u; k.y = k.fy + (k.ty - k.fy) * u - Math.sin(u * Math.PI) * 60;
          if (u >= 1) { k.state = 'perch'; k.wait = rand(0.5, 1.6); k.face = k.side === 0 ? 1 : -1; }
          break;
        }
        case 'wait':
          k.wt -= dt; k.rot += dt * 6;
          if (k.wt <= 0) this.flyToBed(k);
          break;
        case 'nap':
          if (Math.random() < dt * 0.25) particles.burst(k.x + 20, k.y - 30, { type: 'note', count: 1, colors: ['#9fc7ff'], speed: [10, 30], size: [14, 20], gravity: -40 });
          break;
        default: break;
      }
    }
    this.kittens = this.kittens.filter((k) => k.state !== 'gone');
  }

  /** Small avatars (garden fairies) hover just above the basket rim so they stay visible. */
  lift(e) { return e.a.leader.h < 80 ? this.bw() * 0.45 : 0; }

  headPos(e) { const h = e.a.anchor('head'); return { x: h.x, y: h.y + 6 }; }

  // a falling kitten crossing someone's head/basket column
  tryCatch(k) {
    let best = null, bd = 1e9;
    for (const e of this.ents) {
      const col = Math.max(this.bw() * 0.5, e.a.width * 0.42) + 26;
      const dx = Math.abs(k.x - e.x);
      const top = this.headY(e) - 40, bot = this.rimY(e) + 30;
      if (dx < col && k.y > top && k.y < bot && dx < bd) { best = e; bd = dx; }
    }
    if (best) this.grab(best, k, true);
  }

  // walking into a kitten on the floor / on a yarn ball
  tryScoop(k, reach) {
    for (const e of this.ents) {
      if (e.z > 60) continue;
      if (Math.abs(k.x - e.x) < reach + this.bw() * 0.25) { if (this.grab(e, k, false)) return true; }
    }
    return false;
  }

  grab(e, k, fromAir) {
    const room = e.basket.length < CAP;
    if (!room && e.head) {
      if (!fromAir) return false;
      // nowhere to go: boing off!
      k.vy = -rand(520, 680); k.vx = (k.x < e.x ? -1 : 1) * rand(160, 300); k.grace = 0.45; k.state = 'leap';
      snd('kit-boing', 'boing', { vol: 0.6 }); e.a.squash(0.3);
      particles.burst(k.x, k.y, { type: 'star', count: 5, colors: ['#ffd23f', '#fff'] });
      return true;
    }
    if (k.state === 'roll' && k.ball) {
      this.balls.push({ x: k.x, vx: k.vx * 0.85, rot: k.ball.rot, ci: k.ball.ci, trail: [] });
      k.ball = null;
    }
    k.owner = e; k.state = 'hop'; k.ht = 0; k.fx = k.x; k.fy = k.y; k.toHead = !room;
    if (room) e.basket.push(k); else e.head = k;
    const a = e.a;
    if (fromAir) { snd('kit-boing', 'boing', { vol: 0.55, rate: rand(1.0, 1.25) }); a.squash(0.35); particles.ring(k.x, k.y, '#ffffff', 80, 0.3); }
    else { sfx('jump', { vol: 0.3, rate: 1.4 }); a.squash(0.2); }
    this.mew(1.1);
    if (!room) {
      // kitty hat!
      a.playOnce('surprised', 0.4, 'idle'); a.emote('exclaim', 0.8);
      this.pop(e, 'Kitty hat!', '#ff9f1c', 46);
      sfx('giggle', { vol: 0.6 });
      if (!e.p.isAI) e.p.ctrl.rumble(0.3, 90);
    } else if (k.fairy) {
      particles.burst(k.x, k.y, { type: 'sparkle', count: 14, colors: ['#fff6a8', '#ffc2f0', '#c9a0ff'] });
      sfx('sparkle'); this.api.camera && this.api.camera.punch(e.x, a.y - a.height * 0.6, 1.12, 0.3);
    }
    return true;
  }

  escape(k) {
    const e = k.owner;
    if (k.state === 'head') e.head = null; else e.basket.splice(e.basket.indexOf(k), 1);
    k.owner = null; this.toFloor(k, false); k.vy = -520; k.air = true; k.vx = rand(-1, 1) * 260;
    this.mew(1.2);
    particles.burst(k.x, k.y, { type: 'dust', count: 4, color: '#fff', speed: [30, 90] });
    k.sq = 0.3;
  }

  toFloor(k, landed) {
    k.state = 'floor'; k.y = GROUND_Y + 30 + rand(-6, 10); k.rot = 0; k.vx = 0; k.vy = 0; k.air = false;
    k.floorT = rand(5, 8); k.goal = rand(250, W - 250); k.pause = rand(0.2, 0.6); k.pounce = 0;
    if (landed) {
      k.sq = 0.5;
      particles.burst(k.x, GROUND_Y + 30, { type: 'dust', count: 5, color: '#fff', speed: [40, 120], size: [8, 16] });
      snd('kit-plop', 'cush-plop', { vol: 0.35, rate: 1.3 });
    }
  }

  floorKitten(k, dt) {
    const floorY = GROUND_Y + 30;
    if (k.air) {
      k.vy += G * dt; k.y += k.vy * dt; k.x = clamp(k.x + k.vx * dt, 60, W - 60);
      if (k.y >= floorY) {
        k.y = floorY; k.air = false; k.sq = 0.45;
        if (k.pounce) {
          k.pounce = 0;
          snd('kit-pounce', 'boing', { vol: 0.4, rate: 1.3 });
          particles.burst(k.x, floorY, { type: 'dust', count: 6, color: '#fff', speed: [50, 140], size: [10, 18] });
          particles.burst(k.x, floorY - 40, { type: 'star', count: 4, colors: ['#ffd23f', '#fff'], speed: [80, 180] });
          if (k.victim && k.victim.state === 'floor' && !k.victim.air) { k.victim.vy = -380; k.victim.air = true; k.victim.vx = Math.sign(k.vx || 1) * 220; k.victim.sq = 0.5; }
        }
        k.vx = 0;
      }
    } else {
      k.floorT -= dt;
      // chase the yarn ball it fell off, else wander
      if (k.chase && this.balls.includes(k.chase)) k.goal = k.chase.x - Math.sign(k.chase.vx) * 40;
      else k.chase = null;
      if (k.floorT <= 0) {
        // head home and climb back up a tree
        const side = k.x < W / 2 ? 0 : 1, homeX = side === 0 ? 210 : W - 210;
        k.goal = homeX;
        if (Math.abs(k.x - homeX) < 30) {
          const level = randInt(0, 2), pp = perchPoint(side, level);
          if (!this.kittens.some((o) => o !== k && (o.state === 'perch' || o.state === 'climb') && o.side === side && o.level === level)) {
            Object.assign(k, { state: 'climb', side, level, ct: 0, fx: k.x, fy: k.y, tx: pp.x, ty: pp.y });
            return;
          }
          k.floorT = rand(1, 2);
        }
      }
      k.pause -= dt;
      const d = k.goal - k.x;
      if (k.pause <= 0 && Math.abs(d) > 12) {
        const spd = k.chase ? 420 : k.floorT <= 0 ? 330 : 240;
        k.vx = Math.sign(d) * spd; k.face = Math.sign(d);
        k.x += k.vx * dt;
      } else {
        k.vx = 0;
        if (k.pause <= 0 && !k.chase) { k.pause = rand(0.4, 1.2); k.goal = clamp(k.x + rand(-500, 500), 200, W - 200); }
      }
      // playful pounce on a nearby kitten
      if (!k.air && chance(dt * 0.5)) {
        const o = this.kittens.find((o) => o !== k && o.state === 'floor' && !o.air && Math.abs(o.x - k.x) < 170 && Math.abs(o.x - k.x) > 40);
        if (o) {
          k.air = true; k.pounce = 1; k.victim = o; k.vy = -560; k.vx = (o.x - k.x) / 0.72; k.face = Math.sign(k.vx);
          this.mew(0.95);
        }
      }
    }
    if (!this.done && !k.air) this.tryScoop(k, 54);
  }

  updateBalls(dt) {
    for (const b of this.balls) {
      b.x += b.vx * dt; b.rot += (b.vx / 38) * dt;
      b.vx *= Math.exp(-0.6 * dt); b.age = (b.age || 0) + dt;

      b.trail.push(b.x); if (b.trail.length > 30) b.trail.shift();
      if (b.x < 70 || b.x > W - 70) { b.vx = -b.vx * 0.8; b.x = clamp(b.x, 70, W - 70); }
      if (Math.abs(b.vx) < 40 || b.age > 3.5) b.life = (b.life ?? 1.2) - dt;
    }
    this.balls = this.balls.filter((b) => (b.life ?? 1) > 0);
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const a = e.a, ctrl = e.p.ctrl;
    e.popT = Math.max(0, e.popT - dt); e.bumpCd = Math.max(0, e.bumpCd - dt);
    const inX = this.done ? 0 : this.easy && !e.p.isAI ? (e.autoX || 0) : ctrl.x;
    const target = inX * MAX_SPEED;
    e.vx = approach(e.vx, target, (Math.abs(target) > Math.abs(e.vx) ? 5200 : 4200) * dt);
    e.pv *= Math.exp(-7 * dt);
    e.x = clamp(e.x + (e.vx + e.pv) * dt, 260, W - 260);
    if (!this.done && ctrl.pressed('a')) {
      if (e.basket.length || e.head) this.cuddle(e);
      else if (e.z <= 0.5) { e.vz = JUMP_V; sfx('jump'); a.squash(-0.2); }
    }
    if (e.z > 0 || e.vz > 0) {
      e.vz -= JUMP_G * dt; e.z += e.vz * dt;
      if (e.z <= 0) { e.z = 0; e.vz = 0; a.squash(0.3); sfx('land', { vol: 0.6 }); particles.burst(e.x, a.y, { type: 'dust', count: 4, color: '#fff', speed: [40, 100], size: [8, 14] }); }
    }
    if (e.z > 1) { if (!a._once) a.setPose(e.vz > 0 ? 'jump' : 'fall'); }
    else a.moveAnim(e.vx, 0, MAX_SPEED, { run: Math.abs(e.vx) > 420 });
  }

  cuddle(e) {
    const list = [...e.basket]; if (e.head) list.push(e.head);
    e.basket = []; e.head = null;
    let pts = 0;
    list.forEach((k, i) => {
      pts += k.fairy ? 3 : 1;
      k.state = 'hug'; k.ht = -i * 0.05; k.hx = (i - (list.length - 1) / 2) * 34 * this.scale; k.hy = -Math.abs(i - (list.length - 1) / 2) * 10;
    });
    const triple = list.length >= 3;
    if (triple) pts += 1;
    e.score += pts;
    const a = e.a, c = a.anchor('center');
    a.playOnce(poseName('cuddle'), 0.55, 'idle'); a.squash(0.3); a.emote('hearts', 1.1);
    snd('kit-purr', 'sparkle', { vol: 0.8 });
    sfx('collect', { step: Math.min(e.score, 14) });
    particles.burst(c.x, c.y - 20, { type: 'heart', count: 6 + list.length * 4, colors: ['#ff4d8d', '#ff9ccf', '#ffd1e8'], speed: [120, 300] });
    this.pop(e, '+' + pts, '#ff4d8d', triple ? 72 : 56);
    if (!e.p.isAI) e.p.ctrl.rumble(triple ? 0.6 : 0.3, triple ? 200 : 90);
    if (triple) {
      this.pop(e, 'Triple cuddle!', '#ff9f1c', 50);
      snd('kit-triple', 'fanfare', { vol: 0.6 }); voice(e.p.charId, 'yay');
      fx.shake(9, 0.25); fx.flash('#ffe1f0', 0.15);
      particles.burst(c.x, c.y, { type: 'star', count: 14, colors: RAINBOW, speed: [200, 420] });
      this.api.camera && this.api.camera.punch(e.x, a.y - a.height * 0.5, 1.15, 0.35);
    } else if (list.some((k) => k.fairy)) { voice(e.p.charId, 'woo'); fx.flash('#fff6d0', 0.1); }
  }

  flyToBed(k) {
    k.state = 'fly'; k.ft = 0; k.fd = rand(0.65, 0.85); k.fx = k.x; k.fy = k.y; k.slot = this.pile++; k.owner = null;
    k.face = k.x < BED.x ? 1 : -1;
  }

  /** Mound of nap spots over the bed; later spots stack higher. */
  pileSlot(i) {
    const ROWS = [9, 8, 7, 6, 5, 4], CAPN = 39;
    const layer = Math.floor(i / CAPN);
    let idx = i % CAPN, row = 0;
    while (idx >= ROWS[row]) { idx -= ROWS[row]; row++; }
    const n = ROWS[row];
    const spread = (n - 1) * 50 * Math.pow(0.8, Math.min(layer, 3));
    const x = BED.x - spread / 2 + (spread * idx) / (n - 1) + (layer % 2 ? 20 : 0);
    // later layers climb into a taller, narrower mound (kept on the bed, clear of the crowd in front)
    return { x, y: BED.y - 112 - row * 28 - Math.min(layer, 4) * 34 };
  }

  pushPlayers(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      // baskets side by side, never stacked: at least a basket width, or the sprites' own width
      const sep = Math.max(this.bw() * 0.95, (bodyRadius(A.a) + bodyRadius(B.a)) * 0.8);
      const dx = B.x - A.x, adx = Math.abs(dx);
      if (adx < sep && Math.abs(A.z - B.z) < 100) {
        const dir = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx);
        const ov = sep - adx, k = Math.min(1, dt * 20);
        A.x -= dir * ov * 0.5 * k; B.x += dir * ov * 0.5 * k;
        if (ov > sep * 0.4 && A.bumpCd <= 0 && (Math.abs(A.vx) + Math.abs(B.vx)) > 400) {
          A.bumpCd = B.bumpCd = 0.5; A.a.squash(0.2); B.a.squash(0.2);
          A.pv -= dir * 240; B.pv += dir * 240;
          sfx('bounce', { vol: 0.5 });
        }
      }
    }
    for (const e of E) e.x = clamp(e.x, 260, W - 260);
  }

  // ---------------------------------------------------------------------- AI
  predictX(k, y) {
    if (k.state === 'flutter') return { x: k.x, T: 0.6 };
    if (k.state !== 'leap') return { x: k.x, T: 0 };
    const disc = k.vy * k.vy + 2 * G * (y - k.y);
    if (disc < 0) return { x: k.x, T: 0 };
    const T = (-k.vy + Math.sqrt(disc)) / G;
    return { x: k.x + k.vx * T, T: Math.max(0, T) };
  }

  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl;
    const speed = prof.speed * 0.86;           // Molly Party: CPUs play along, never dominate
    const mistake = Math.min(0.6, prof.mistake * 1.6 + 0.08);
    const held = e.basket.length + (e.head ? 1 : 0);
    if (held && e.cuddleWait > 0) { e.cuddleWait -= dt; if (e.cuddleWait <= 0) ctrl.press('a'); }
    if (e.brain.ready(dt)) {
      if (held && e.cuddleWait <= 0 && (held >= e.hold || e.head || e.basket.some((k) => k.bt > 4))) {
        e.cuddleWait = rand(0.25, 0.9) + (p.aiLevel ? 0 : rand(0.2, 0.8));
        e.hold = chance(0.35 + (p.aiLevel || 0) * 0.2) ? 3 : randInt(1, 2);
      }
      const yC = this.headY(e);
      let best = null, bu = -1;
      for (const k of this.kittens) {
        if (!['leap', 'flutter', 'roll', 'floor', 'perch'].includes(k.state)) continue;
        let x, T;
        if (k.state === 'perch') { x = clamp(k.x + (k.side === 0 ? 500 : -500), 300, W - 300); T = k.wait + 1; }
        else if (k.state === 'roll') { x = k.x + k.vx * 0.5; T = 1; }
        else if (k.state === 'floor') { x = k.x; T = 1.5; }
        else ({ x, T } = this.predictX(k, yC));
        const travel = Math.abs(x - e.x) / (MAX_SPEED * speed);
        if (k.state === 'leap' && travel > T + 0.15) continue;
        let u = (k.fairy ? 3 : 1) / (0.5 + travel) * (k.state === 'perch' ? 0.25 : k.state === 'floor' ? 0.7 : 1) * rand(0.8, 1.2);
        for (const o of this.ents) if (o !== e && Math.abs(o.x - x) < Math.abs(e.x - x) * 0.6) { u *= 0.4; break; }
        u /= 1 + claimed(this.ents, e, k) * 1.5;   // leave kittens another basket is already after
        if (u > bu) { bu = u; best = { k, x }; }
      }
      if (!best || chance(mistake)) { e.target = null; e.wander = rand(0.4, 1.1); e.wanderX = clamp(e.x + rand(-400, 400), 280, W - 280); }
      else { e.target = best.k; e.err = rand(-1, 1) * prof.aimError * 120; e.wander = 0; }
      e.brain.wait(reactionTime(p) * 1.2);
    }
    let tx = null;
    if (e.wander > 0) { e.wander -= dt; tx = e.wanderX; }
    else if (e.target) {
      const k = e.target;
      if (k.state === 'leap' || k.state === 'flutter') tx = this.predictX(k, this.headY(e)).x + e.err;
      else if (k.state === 'roll' || k.state === 'floor') tx = k.x + e.err * 0.5;
      else if (k.state === 'perch') tx = clamp(k.x + (k.side === 0 ? 480 : -480), 300, W - 300);
      else e.target = null;
    }
    if (tx === null) { ctrl.move(0, 0); return; }
    // hop over-the-head kittens / leaping late
    const d = steerTo(p, e.x, 0, clamp(tx, 270, W - 270), 0, 50, speed);
    if (d < 12) ctrl.move(0, 0);
  }

  /** Molly Easy (humans): the basket runs itself to the best kitten; the player only presses A. */
  easyThink(e, dt) {
    // the stick runs the basket while it's pushed; let go and the autopilot carries on from here
    const st = easySteer(e, e.p.ctrl, dt);
    if (st.manual) {
      e.autoX = st.x * 0.9;
      if (st.pushing) { e.target = null; e.retarget = 0; e.homeX = e.x; }
      return;
    }
    e.retarget = (e.retarget || 0) - dt;
    const yC = this.headY(e);
    const live = (k) => k && ['leap', 'flutter', 'roll', 'floor', 'perch'].includes(k.state);
    if (e.retarget <= 0 || !live(e.target)) {
      e.retarget = 0.35;
      let best = null, bu = -1;
      for (const k of this.kittens) {
        if (!live(k)) continue;
        let x, T;
        if (k.state === 'perch') { x = clamp(k.x + (k.side === 0 ? 500 : -500), 300, W - 300); T = k.wait + 1; }
        else if (k.state === 'roll') { x = k.x + k.vx * 0.5; T = 1; }
        else if (k.state === 'floor') { x = k.x; T = 1.5; }
        else ({ x, T } = this.predictX(k, yC));
        const travel = Math.abs(x - e.x) / (MAX_SPEED * 0.85);
        if (k.state === 'leap' && travel > T + 0.2) continue;
        let u = (k.fairy ? 3 : 1) / (0.5 + travel) * (k.state === 'perch' ? 0.25 : k.state === 'floor' ? 0.7 : 1);
        if (k === e.target) u *= 1.5;   // don't flip-flop between kittens
        // spread out: leave kittens that someone else is closer to (or already chasing)
        for (const o of this.ents) if (o !== e && (o.target === k || Math.abs(o.x - x) < Math.abs(e.x - x) * 0.6)) { u *= 0.35; break; }
        if (u > bu) { bu = u; best = k; }
      }
      e.target = best;
      if (!best) e.homeX = e.homeX ?? e.x;
    }
    let tx = e.homeX ?? e.x;
    const k = e.target;
    if (k) {
      if (k.state === 'leap' || k.state === 'flutter') tx = this.predictX(k, yC).x;
      else if (k.state === 'perch') tx = clamp(k.x + (k.side === 0 ? 480 : -480), 300, W - 300);
      else tx = k.x;
    }
    const d = clamp(tx, 270, W - 270) - e.x;
    e.autoX = Math.abs(d) < 12 ? 0 : clamp(d / 60, -1, 1) * 0.85;
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    // everyone still holding (or playing on the floor) goes for a nap too
    let i = 0;
    for (const k of this.kittens) {
      if (['basket', 'head', 'hop', 'floor', 'leap', 'roll', 'perch', 'flutter'].includes(k.state)) {
        if (k.owner && (k.state === 'basket' || k.state === 'head' || k.state === 'hop')) { k.owner.score += k.fairy ? 3 : 1; }
        k.ball = null;
        const kk = k; const delay = 0.15 + (i++) * 0.06;
        kk.state = 'wait'; kk.wt = delay;
      }
    }
    for (const e of this.ents) { e.basket = []; e.head = null; }
    const scores = this.ents.map((e) => e.score);
    const placements = this.n === 1 ? [scores[0] >= SOLO_GOAL ? 1 : 2] : placementsFromScores(scores);
    this.ents.forEach((e, k) => {
      e.a.clearEmotes();
      if (placements[k] === 1) e.a.setPose('celebrate'); else e.a.setPose('cheer');
    });
    snd('kit-purr', 'sparkle'); sfx('cheer', { vol: 0.6 });
    this.api.finish({ placements, stats: scores.map((s) => `${s} cuddle${s === 1 ? '' : 's'}`), solo: scores[0], title: 'Nap time!', focus: { x: BED.x, y: BED.y - 160 } });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    drawRoom(g, this.t);
    drawCatTree(g, 150, GROUND_Y + 10, 1, this.t);
    drawCatTree(g, W - 150, GROUND_Y + 10, -1, this.t + 1);
    // perched kittens (wiggle-butt telegraph before a leap)
    for (const k of this.kittens) if (k.state === 'perch' || k.state === 'climb') {
      const ready = k.state === 'perch' && k.wait < 0.45;
      g.save(); g.translate(k.x + (ready ? Math.sin(this.t * 40) * 3 : 0), k.y - 44 * 0.9);
      g.scale(k.face, 1);
      if (ready) g.scale(1 + Math.sin(this.t * 30) * 0.05, 1 - Math.sin(this.t * 30) * 0.05);
      drawKitten(g, k, 'sit', k.age, 0.9);
      g.restore();
      if (ready) ui.text(g, '!', k.x + k.face * 40, k.y - 120, { size: 40, color: '#ff4d6d' });
    }
    drawBed(g, this.t);
    for (const k of this.kittens) if (k.state === 'nap') this.drawK(g, k, 'sleep', 0.62);
    drawBedFront(g);
    // loose yarn balls and their threads
    for (const b of this.balls) this.drawBall(g, b);
    // floor and rolling kittens behind players' baskets
    for (const k of this.kittens) {
      if (k.state === 'floor') this.drawK(g, k, k.air ? 'pounce' : 'sit', 0.78, k.air ? k.face : 1);
      else if (k.state === 'roll') {
        this.drawBall(g, { x: k.x, rot: k.ball.rot, ci: k.ball.ci, trail: null }, k.bounceY);
        g.save(); g.translate(k.x, GROUND_Y + 34 - 74 + k.bounceY); g.rotate(Math.sin(k.t * 9) * 0.18); g.scale(k.face, 1); drawKitten(g, k, 'sit', k.age, 0.72); g.restore();
      }
    }
    const order = this.ents.slice().sort((a, b) => a.a.y - b.a.y);
    for (const e of order) {
      e.a.draw(g, { ring: e.p.color });
      const by = GROUND_Y + e.lane + 30, bw = this.bw();
      drawBasketBack(g, e.x, by, bw);
      for (const k of e.basket) if (k.state === 'basket') this.drawK(g, k, 'sit', 0.6 * this.scale / 0.92);
      drawBasketFront(g, e.x, by, bw, this.t + e.i);
      if (e.head && e.head.state === 'head') this.drawK(g, e.head, 'sit', 0.58 * this.scale / 0.92);
    }
    // airborne kittens on top
    for (const k of this.kittens) {
      if (k.state === 'leap') { if (k.vy < 0) this.drawK(g, k, 'pounce', 0.8, k.face); else this.drawK(g, k, 'tumble', 0.8, 1, true); }
      else if (k.state === 'flutter') { g.save(); g.translate(k.x, k.y); drawKitten(g, k, 'sit', k.age, 1.0); g.restore(); }
      else if (k.state === 'hop') this.drawK(g, k, 'tumble', 0.65, 1, true);
      else if (k.state === 'hug') this.drawK(g, k, 'cuddle', 0.66);
      else if (k.state === 'fly' || k.state === 'wait') this.drawK(g, k, 'tumble', 0.66, 1, true);
    }
    // cuddle prompts + tags
    for (const e of order) {
      const a = e.a;
      const top = a.y - e.z - a.height - 26 - (e.head ? 64 * this.scale : 0) - (a.emotes.length ? 50 : 0);
      ui.playerTag(g, e.p, e.x, top);
      if (!this.done && (e.basket.length || e.head) && (!e.p.isAI || this.n === 1)) {
        const full = e.basket.length >= CAP || e.head;
        const pulse = 1 + Math.sin(this.t * (full ? 12 : 6)) * 0.12;
        // Molly Easy: the same big A as the other Sister games (cuddling isn't tied to a target: over the tag)
        if (this.easy && !e.p.isAI) easyPrompt(g, e.p, { child: { x: e.x, y: top + 26 }, size: full ? 92 : 80 });
        else {
          g.save(); g.translate(e.x + 80 * this.scale, top - 10); g.scale(pulse, pulse);
          ui.glyph(g, 'a', 0, 0, full ? 54 : 42);
          g.restore();
        }
      }
    }
  }

  drawK(g, k, state, s, face = 1, spin = false) {
    g.save(); g.translate(k.x, k.y - (state === 'sleep' ? 0 : 0));
    if (spin) g.rotate(k.rot);
    const sq = k.sq; g.scale((1 + sq * 0.5) * face, 1 - sq * 0.5);
    if (state === 'sit' && (k.state === 'basket' || k.state === 'head')) g.rotate(Math.sin(k.t * 4 + k.id) * 0.08);
    drawKitten(g, k, state, k.age, s);
    g.restore();
  }

  drawBall(g, b, yo = 0) {
    const y = GROUND_Y + 34 + yo;
    if (b.trail && b.trail.length > 2) {
      g.save(); g.strokeStyle = YARN[b.ci].c; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath();
      b.trail.forEach((x, i) => { const yy = GROUND_Y + 66 + Math.sin(i * 0.9) * 4; if (i) g.lineTo(x, yy); else g.moveTo(x, yy); });
      g.lineTo(b.x, y + 30); g.stroke(); g.restore();
    }
    g.save(); g.globalAlpha = 0.2; g.fillStyle = NAVY; g.beginPath(); g.ellipse(b.x, GROUND_Y + 70, 34, 9, 0, 0, TAU); g.fill(); g.restore();
    g.save(); g.translate(b.x, y); drawYarn(g, b.ci, b.rot, 0.9); g.restore();
  }

  drawHUD(g) {
    // (the nap clock is api.limit's, drawn by the play scene)
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 990, format: (v) => '♥ ' + v });
    if (this.n === 1) ui.text(g, `Goal: ${SOLO_GOAL} ♥`, W - 200, 64, { size: 42, color: '#ff4d8d' });
    if (this.party) {
      const pulse = 1 + Math.sin(this.t * 9) * 0.06;
      g.save(); g.translate(W / 2, 150); g.scale(pulse, pulse);
      ui.text(g, 'KITTEN PARTY!', 0, 0, { size: 46, color: '#ff6fb1', weight: 800 });
      g.restore();
      if (this.partyT < 2.2) { g.save(); g.globalAlpha = clamp(2.2 - this.partyT, 0, 1); ui.banner(g, 'Kitten Party!', this.partyT, { y: 520, size: 150, color: '#ff6fb1' }); g.restore(); }
    }
  }
}
