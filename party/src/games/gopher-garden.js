// Gopher Gardens - one shared garden full of dirt-mound holes. Cheeky gophers pop
// up; run over and bop them with your squeaky mallet (A) for a point: sparkles,
// a cute bonk, and the gopher ducks down dazed and giggly. Sometimes a garden
// fairy pops up instead: don't bop her! (she goes dizzy, you say "oops" and lose a
// point). Now and then the Troll pops up: bop at him and he grabs your mallet,
// you tug it back for a couple of seconds (mash A to tug harder) while he grins,
// then he lets go and ducks. 60 seconds, the pop-ups get busier, most bops wins.
// B dashes (engine/dash.js).
//
// Art hooks (all optional; the procedural stand-ins in gopher-garden/art.js ship today):
//   bg/gopher-garden  thumb/gopher-garden  prop/gopher-hole  prop/gopher-hole-front
//   prop/gopher-up  prop/gopher-up-2  prop/gopher-bonked  prop/gopher-mallet
//   prop/gopher-troll-up  prop/gopher-troll-tug   (image-requests.md, "gopher-garden")
// Reused sprites: garden-fairy-* (wave / dizzy), troll (laugh / grab), players' swing / pull.
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, Brain, steer } from '../engine/ai.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { Dash } from '../engine/dash.js';
import { clamp, lerp, rand, pick, chance, TAU, ease, placementsFromScores } from '../engine/util.js';
import { NAVY, holeOpening, drawHoleBack, drawHoleFront, drawGopher, drawDazeStars, drawMallet, drawGardenBackground } from './gopher-garden/art.js';

import { meta } from './gopher-garden.meta.js';
export { meta };

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && hasSound(fb) && sfx(fb, o));
const poseName = (n, ...fb) => [n, ...fb].find((p) => POSE_NAMES.includes(p)) || 'action';

// --- tuning -----------------------------------------------------------------
const DURATION = 60;
const MAX_SPEED = 600;
const CPU_SPEED = [0.66, 0.78, 0.9];      // CPU top speed share per level (all below a human)
const BOP_RANGE = 230;                    // a press this close lunges you in
const BOP_NEAR = 125;
const SWING_T = 0.36, HIT_AT = 0.11, SWING_CD = 0.42;
const OOPS_STUN = 0.55;                   // bopped a fairy: a short "oops" freeze
const TUG_MIN = 1.5, TUG_MAX = 2.4;       // the Troll keeps your mallet this long
const ROWS = [{ y: 445, n: 4 }, { y: 595, n: 5 }, { y: 750, n: 4 }, { y: 905, n: 5 }];
const HOLE_DX = 330;
const MOVE = { x0: 80, x1: W - 80, y0: 400, y1: 985 };
const DS = (y) => depthScale(y, { top: 380, near: 960, far: 0.8, nearScale: 1.04 });
const HOLE_W = 222;                       // hole width at depth scale 1
const FAIRIES = ['pink', 'blue', 'yellow', 'green', 'purple'];
const FAIRY_GLOW = { pink: '#ff9ad5', blue: '#8fd3ff', yellow: '#ffe066', green: '#9be37a', purple: '#c9a6ff' };
// prop/gopher-troll-tug (400x400): the mallet head sits at his grip point
const TUG_GRIP = [300, 170];

// Tiny avatars (e.g. the 54 px garden fairies) are drawn bigger so they read next to the holes.
const sizeFix = (a) => Math.max(1, 120 / (a.char.members[0].h || 120));

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.playT = 0;
    this.timeLeft = DURATION;
    this.done = false;
    api.limit(() => (this.done ? null : this.timeLeft), { showAt: Infinity });
    this.baseScale = n <= 4 ? 0.92 : n <= 6 ? 0.84 : 0.78;
    this.holes = [];
    for (const r of ROWS) {
      const span = (r.n - 1) * HOLE_DX;
      for (let i = 0; i < r.n; i++) this.holes.push({ x: W / 2 - span / 2 + i * HOLE_DX, y: r.y, busy: null, cool: 0, dirt: 0 });
    }
    this.critters = [];
    this.spawnT = 0.5;
    this.trollT = rand(7, 10);
    this.hint = 4.5;
    // warm the NPC sprite sets so the first fairy / troll pops up drawn
    this.npcCache = [new Actor('troll'), ...FAIRIES.map((f) => new Actor(`garden-fairy-${f}`))];
    this.ents = this.players.map((p, i) => {
      const cols = Math.min(n, 4), row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, n - row * cols);
      const x = W / 2 + (col - (inRow - 1) / 2) * 340;
      const y = n <= 4 ? 680 : 520 + row * 300;
      const a = new Actor(p, { scale: this.baseScale, x, y });
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      const e = {
        p, a, i, x, y, vx: 0, vy: 0, score: 0, bops: 0, oops: 0, tugs: 0,
        swingT: -1, swingCd: 0, swingTarget: null, stun: 0, tug: null, lunge: 0, lx: 0, ly: 0,
        streak: 0, streakT: 0, popN: 0, popT: 0,
        brain: new Brain(p), target: null, aiPress: -1, wander: 0, wx: x, wy: y, aiMash: 0,
        dash: new Dash({ color: '#e8d7c0' }),
      };
      a.attach((g, info) => this.drawMalletAttach(g, info, e, true), { behind: true });
      a.attach((g, info) => this.drawMalletAttach(g, info, e, false));
      return e;
    });
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    // a couple of gophers peek during 3-2-1 so everyone sees what's coming
    if (this.critters.length < 2 && chance(dt * 1.5)) this.spawn('gopher', 1.3);
    this.updateCritters(dt);
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); this.syncActor(e); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.playT += dt;
    this.timeLeft = Math.max(0, DURATION - this.playT);
    this.hint = Math.max(0, this.hint - dt);
    this.spawning(dt);
    for (const e of this.ents) {
      if (e.p.isAI) this.aiThink(e, dt);
      this.movePlayer(e, dt);
    }
    spread(this.ents, { radius: (e) => bodyRadius(e.a) * 0.8, yScale: 1.6, strength: Math.min(1, dt * 12), bounds: MOVE, skip: (e) => !!e.tug });
    this.updateCritters(dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
    if (this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    this.updateCritters(dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
  }

  syncActor(e) {
    const a = e.a;
    const wob = e.tug ? Math.sin(this.t * 22) * 7 * DS(e.y) : 0;   // tug-of-war wobble
    a.x = e.x + wob; a.y = e.y;
    a.scale = this.baseScale * DS(e.y) * sizeFix(a);
  }

  /** 0 at the start, 1 at the end: the garden gets busier. */
  get busy() { return clamp(this.playT / DURATION, 0, 1); }

  spawning(dt) {
    const k = this.busy;
    const want = Math.round(clamp(2 + this.n * 0.75, 3, 8) * (1 + 0.6 * k));
    const active = this.critters.filter((c) => c.phase === 'rise' || c.phase === 'up').length;
    this.spawnT -= dt; this.trollT -= dt;
    if (this.trollT <= 0 && this.playT > 4 && !this.critters.some((c) => c.kind === 'troll')) {
      this.trollT = rand(7, 11) * (1 - 0.25 * k);
      if (this.spawn('troll')) return;
    }
    if (this.spawnT <= 0 && active < want) {
      this.spawnT = rand(0.45, 0.8) * (1 - 0.45 * k);
      const fairies = this.critters.filter((c) => c.kind === 'fairy' && c.phase !== 'sink').length;
      const kind = fairies < 2 && chance(0.15 + 0.07 * k) ? 'fairy' : 'gopher';
      this.spawn(kind);
    }
  }

  spawn(kind, lifeMul = 1) {
    const free = this.holes.filter((h) => !h.busy && h.cool <= 0);
    if (!free.length) return null;
    const h = pick(free);
    const k = this.busy;
    const life = (kind === 'troll' ? rand(2.4, 3.0) : kind === 'fairy' ? rand(2.2, 3.0) : rand(2.1, 3.0) * (1 - 0.3 * k)) * lifeMul;
    const c = { h, kind, phase: 'rise', t: 0, rise: 0, life, sq: 0, wob: 0, seed: rand(TAU), blink: rand(1, 3), mood: chance(0.5) ? 'up' : 'wink', by: null };
    if (kind === 'fairy') {
      c.color = pick(FAIRIES);
      c.actor = new Actor(`garden-fairy-${c.color}`, { scale: 2.3 * DS(h.y) });
      c.actor.setPose('wave');
      c.actor.facing = h.x < W / 2 ? 1 : -1;
    } else if (kind === 'troll') {
      c.actor = new Actor('troll', { scale: 0.95 * DS(h.y) });
      c.actor.setPose('laugh');
      c.actor.facing = h.x < W / 2 ? 1 : -1;
    }
    h.busy = c; h.dirt = 0.4;
    this.critters.push(c);
    const s = DS(h.y);
    particles.burst(h.x, h.y - 10 * s, { type: 'dust', count: kind === 'troll' ? 12 : 6, color: '#9a6a43', speed: [60, 200], size: [10, 20] });
    if (kind === 'fairy') { snd('npc/fairy/chime', 'sparkle', { vol: 0.5 }); particles.burst(h.x, h.y - 80 * s, { type: 'sparkle', count: 6, colors: ['#ffffff', FAIRY_GLOW[c.color]] }); }
    else if (kind === 'troll') { snd('npc/troll/grumble', 'stomp', { vol: 0.7 }); fx.shake(5, 0.2); }
    else snd('pt-popup', 'pop', { vol: 0.4, rate: rand(0.95, 1.25) });
    return c;
  }

  updateCritters(dt) {
    for (const c of this.critters) {
      c.t += dt;
      c.sq *= Math.exp(-7 * dt);
      c.blink -= dt; if (c.blink < -0.12) c.blink = rand(1.2, 3.2);
      if (c.actor) c.actor.update(dt);
      switch (c.phase) {
        case 'rise': {
          const k = clamp(c.t / (c.kind === 'troll' ? 0.35 : 0.24), 0, 1);
          c.rise = ease.outBack(k);
          if (k >= 1) { c.phase = 'up'; c.t = 0; c.sq = -0.2; }
          break;
        }
        case 'up':
          c.rise = 1; c.wob = Math.sin(c.t * 2.2 + c.seed) * 0.04;
          c.life -= dt;
          if (c.life <= 0) {
            c.phase = 'tease'; c.t = 0;
            if (c.kind === 'gopher') { c.mood = 'tease'; c.sq = 0.15; }
          }
          break;
        case 'tease':   // nobody came: a cheeky tongue out, then down (no penalty)
          c.wob = Math.sin(c.t * 28) * 0.08;
          if (c.t > 0.35) this.sink(c);
          break;
        case 'bonked':  // happy-dazed wobble, then duck down
          c.rise = 1 - 0.18 * ease.outQuad(clamp(c.t / 0.2, 0, 1));
          c.wob = Math.sin(c.t * 16) * 0.14 * (1 - clamp(c.t / 0.9, 0, 1));
          if (c.t > 0.85) this.sink(c);
          break;
        case 'dizzy':   // a bopped fairy: woozy wobble with stars, then she flutters back down
          c.rise = 1;
          c.wob = Math.sin(c.t * 7) * 0.16;
          if (c.t > 1.5) this.sink(c);
          break;
        case 'tug':     // the troll has a mallet: the player's tug ends it
          c.rise = 1; c.wob = Math.sin(this.t * 22 + 1.5) * 0.05;
          break;
        case 'gloat':   // let go: a big laugh, then down
          c.rise = 1; c.wob = Math.sin(c.t * 10) * 0.04;
          if (c.t > 0.8) this.sink(c);
          break;
        case 'sink': {
          const k = clamp(c.t / 0.22, 0, 1);
          c.rise = c.rise0 * (1 - k * k);
          if (k >= 1) { c.dead = true; c.h.busy = null; c.h.cool = 0.45; }
          break;
        }
        default: break;
      }
    }
    for (const h of this.holes) { h.cool -= dt; h.dirt = Math.max(0, h.dirt - dt); }
    this.critters = this.critters.filter((c) => !c.dead);
  }

  sink(c) { c.phase = 'sink'; c.t = 0; c.rise0 = c.rise; }

  hittable(c) { return c.phase === 'rise' || c.phase === 'up' || c.phase === 'tease'; }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.swingCd = Math.max(0, e.swingCd - dt);
    e.stun = Math.max(0, e.stun - dt);
    e.streakT = Math.max(0, e.streakT - dt);
    e.popT = Math.max(0, e.popT - dt);
    if (e.tug) { this.updateTug(e, dt); return; }
    const frozen = this.done || e.stun > 0;
    let ix = frozen ? 0 : c.x, iy = frozen ? 0 : c.y;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    const top = MAX_SPEED * (p.isAI ? CPU_SPEED[clamp(p.aiLevel || 0, 0, 2)] : 1) * (e.swingT >= 0 ? 0.5 : 1);
    const k = 1 - Math.exp(-14 * dt);
    e.vx += (ix * top - e.vx) * k; e.vy += (iy * top * 0.8 - e.vy) * k;
    if (e.lunge > 0) { e.lunge -= dt; e.x += e.lx * dt; e.y += e.ly * dt; }
    const dd = e.dash.update(dt, c, { x: e.x, y: e.y, actor: a, ok: !frozen && e.swingT < 0 && !p.isAI });
    e.x += dd.x; e.y += dd.y;
    e.x = clamp(e.x + e.vx * dt, MOVE.x0, MOVE.x1);
    e.y = clamp(e.y + e.vy * dt, MOVE.y0, MOVE.y1);
    if (!a._once) a.moveAnim(e.vx, e.vy, top, { run: Math.hypot(e.vx, e.vy) > 380 });
    else if (Math.abs(e.vx) > 30 && e.swingT < 0) a.facing = e.vx > 0 ? 1 : -1;
    if (e.swingT >= 0) {
      const before = e.swingT;
      e.swingT += dt;
      if (before < HIT_AT && e.swingT >= HIT_AT) this.impact(e);
      if (e.swingT > SWING_T) e.swingT = -1;
    }
    if (!frozen && c.pressed('a') && e.swingCd <= 0) this.startSwing(e);
  }

  /** Bopping distance (the lawn is seen at an angle, so rows are squashed). */
  bopDist(e, c) { return Math.hypot(c.h.x - e.x, (c.h.y - e.y) * 1.35); }

  /** What A would bop right now: the nearest pop-up in reach (or the CPU's chosen one). */
  bopTarget(e, prefer = null) {
    if (prefer && this.hittable(prefer) && this.bopDist(e, prefer) < BOP_RANGE) return prefer;
    let best = null, bd = BOP_RANGE;
    for (const c of this.critters) {
      if (!this.hittable(c)) continue;
      const d = this.bopDist(e, c);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  startSwing(e, prefer = null) {
    const a = e.a;
    e.swingT = 0; e.swingCd = SWING_CD;
    const best = this.bopTarget(e, prefer);
    e.swingTarget = best;
    if (best) {
      const d = this.bopDist(e, best);
      if (d > BOP_NEAR) {
        // close enough: a little hop in so the mallet lands on it
        const dx = best.h.x - e.x, dy = best.h.y + 22 - e.y, dl = Math.hypot(dx, dy) || 1;
        const travel = Math.max(0, dl - 100);
        e.lunge = HIT_AT; e.lx = (dx / dl) * travel / HIT_AT; e.ly = (dy / dl) * travel / HIT_AT;
      }
      if (Math.abs(best.h.x - e.x) > 10) a.facing = best.h.x >= e.x ? 1 : -1;
    }
    a.playOnce(poseName('swing', 'action'), SWING_T);
    // the 2-frame swing art (backswing, follow-through): reach the follow-through at the impact
    a.poseTime = Math.max(0, SWING_T / 2 - HIT_AT);
    a.squash(-0.12);
    snd('pinata-swish', 'whoosh', { vol: e.p.isAI ? 0.2 : 0.4, rate: rand(0.95, 1.15) });
  }

  impact(e) {
    const c = e.swingTarget;
    e.swingTarget = null;
    if (!c || !this.hittable(c) || this.bopDist(e, c) > BOP_RANGE + 40) {
      // a happy whiff: a little puff of grass, no penalty
      const hd = e.a.anchor('hand');
      particles.burst(hd.x + e.a.facing * 40, e.y - 6, { type: 'dust', count: 4, color: '#b7e39a', speed: [40, 120], size: [8, 14] });
      return;
    }
    if (c.kind === 'gopher') this.bopGopher(e, c);
    else if (c.kind === 'fairy') this.bopFairy(e, c);
    else this.grabbedByTroll(e, c);
  }

  bopGopher(e, c) {
    const h = c.h, s = DS(h.y), top = h.y - 130 * s;
    c.phase = 'bonked'; c.t = 0; c.by = e; c.sq = 0.6; c.mood = 'bonked';
    e.score += 1; e.bops += 1;
    e.streak = e.streakT > 0 ? e.streak + 1 : 1; e.streakT = 2.4;
    e.a.squash(0.2);
    if (!e.p.isAI) e.p.ctrl.rumble(0.35, 80);
    snd('pt-bonk', 'bonk', { vol: 0.75, rate: rand(1.0, 1.2) });
    snd('squeak', 'tiny-squeak', { vol: 0.45, rate: rand(1.1, 1.4) });
    fx.hitstop(0.035); fx.shake(3, 0.1);
    particles.ring(h.x, top + 30 * s, '#fff6a8', 90 * s, 0.3);
    particles.burst(h.x, top, { type: 'sparkle', count: 8, colors: ['#fff6a8', '#ffffff', '#ffd23f', '#ff9ad5'], speed: [120, 300] });
    particles.burst(h.x, top - 10 * s, { type: 'star', count: 4, colors: ['#ffd23f', '#fff6a8'], speed: [160, 320], size: [12, 20] });
    if (chance(0.5)) snd('giggle', null, { vol: 0.35, rate: rand(1.2, 1.5) });
    this.pop(e, '+1', '#ffd23f', 56);
    if (e.streak === 3 || e.streak === 5 || (e.streak >= 8 && e.streak % 4 === 0)) {
      this.pop(e, `Bop x${e.streak}!`, '#6fe3b4', 40, 1);
      sfx('star', { vol: 0.5 });
      e.a.emote('star', 0.7);
      if (!e.p.isAI && chance(0.3)) voice(e.p.charId, 'woo');
    }
  }

  bopFairy(e, c) {
    const h = c.h, s = DS(h.y);
    c.phase = 'dizzy'; c.t = 0; c.by = e;
    c.actor.setPose('dizzy');
    c.actor.flash('#ffffff', 0.15);
    const lost = e.score > 0 ? 1 : 0;
    e.score -= lost; e.oops += 1;
    e.streak = 0; e.streakT = 0;
    e.stun = OOPS_STUN; e.vx = e.vy = 0;
    e.a.playOnce(poseName('surprised', 'hurt'), 0.7);
    e.a.emote('sweat', 0.9);
    if (!e.p.isAI) e.p.ctrl.rumble(0.15, 120);
    snd('ob-oops', 'aww', { vol: 0.6 });
    snd('npc/fairy/chime', null, { vol: 0.35, rate: 0.75 });
    particles.burst(h.x, h.y - 120 * s, { type: 'star', count: 5, colors: ['#ffffff', FAIRY_GLOW[c.color]], speed: [60, 160], size: [10, 16] });
    this.pop(e, lost ? 'Oops! -1' : 'Oops!', '#ff8fb1', 48);
  }

  grabbedByTroll(e, c) {
    const h = c.h, s = DS(h.y);
    c.phase = 'tug'; c.t = 0; c.by = e;
    const side = e.x < h.x ? -1 : 1;   // which side of the hole the player stands
    c.actor.facing = -side;
    c.actor.setPose('grab', { restart: true });
    e.tug = { c, t: 0, dur: rand(TUG_MIN + 0.2, TUG_MAX), side, mash: 0 };
    e.swingT = -1; e.lunge = 0; e.vx = e.vy = 0; e.streak = 0; e.streakT = 0;
    e.tugs += 1;
    e.dash.cancel();
    // stand at mallet's length from his hands
    e.x = clamp(h.x + side * 205 * s, MOVE.x0, MOVE.x1); e.y = clamp(h.y + 26 * s, MOVE.y0, MOVE.y1);
    e.a.facing = -side;
    e.a.setPose(poseName('pull', 'knockback', 'balance'));
    e.a.emote('exclaim', 0.8);
    if (!e.p.isAI) e.p.ctrl.rumble(0.4, 200);
    snd('sd-grab', 'wt-grab', { vol: 0.6 });
    snd('npc/troll/laugh', null, { vol: 0.7 });
    fx.shake(6, 0.2);
    c.actor.say('Mine!', 1.0, null);
    particles.burst(h.x - side * 60 * s, h.y - 150 * s, { type: 'dust', count: 5, color: '#ffffff', speed: [60, 140], size: [10, 16] });
  }

  updateTug(e, dt) {
    const T = e.tug, a = e.a, c = T.c;
    T.t += dt;
    e.vx = e.vy = 0;
    a.facing = -T.side;
    if (!a._once) a.setPose(poseName('pull', 'knockback', 'balance'));
    // mashing A tugs harder: the mallet comes back a little sooner (never before TUG_MIN)
    if (!this.done && e.p.ctrl.pressed('a')) {
      T.mash += 1; T.dur = Math.max(TUG_MIN, T.dur - 0.08);
      a.squash(0.12);
      if (T.mash % 3 === 1) snd('tug-heave', null, { vol: 0.35, rate: rand(1.05, 1.25) });
      particles.burst(e.x + T.side * 20, e.y - 4, { type: 'dust', count: 2, color: '#e8d7c0', speed: [40, 100], size: [8, 12] });
    }
    if (chance(dt * 3)) particles.burst(a.anchor('head').x, a.anchor('head').y + 10, { type: 'drop', count: 1, color: '#9fdcff', speed: [60, 140], size: [6, 9] });
    if (T.t >= T.dur || this.done) this.releaseTug(e);
  }

  releaseTug(e) {
    const T = e.tug, c = T.c, a = e.a;
    e.tug = null;
    e.swingCd = 0.25;
    if (c && c.phase === 'tug') {
      c.phase = 'gloat'; c.t = 0;
      c.actor.setPose('laugh');
      snd('npc/troll/laugh', null, { vol: 0.6 });
    }
    // the mallet pops free: a little stumble back
    e.lunge = 0.14; e.lx = T.side * 420; e.ly = 0;
    a.playOnce(poseName('knockback', 'surprised'), 0.45);
    a.squash(0.25);
    snd('tug-pop-out', 'pop', { vol: 0.5 });
    const hd = a.anchor('hand');
    particles.burst(hd.x, hd.y, { type: 'star', count: 5, colors: ['#ffd23f', '#ffffff'], speed: [100, 220], size: [10, 16] });
    if (!e.p.isAI) e.p.ctrl.rumble(0.3, 80);
  }

  pop(e, str, color, size, side = 0) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    const a = e.a, top = a.y - a.height;
    const lvl = e.popN % 3;
    particles.popText(e.x + side * 80 + (lvl === 1 ? 36 : lvl === 2 ? -36 : 0), top - 30 - lvl * 50, str, color, size);
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), c = p.ctrl, lvl = clamp(p.aiLevel || 0, 0, 2);
    if (e.tug) {   // tug at the mashing rate
      e.aiMash -= dt;
      if (e.aiMash <= 0) { c.press('a'); e.aiMash = 1 / (prof.mashRate * rand(0.7, 1.1)); }
      c.move(0, 0);
      return;
    }
    if (e.stun > 0) { c.move(0, 0); return; }
    if (e.brain.ready(dt)) {
      e.target = null;
      if (chance(prof.mistake * 0.8)) {
        e.wander = rand(0.4, 1.0); e.wx = rand(MOVE.x0 + 100, MOVE.x1 - 100); e.wy = rand(MOVE.y0 + 40, MOVE.y1 - 40);
      } else {
        // a mix-up now and then (more on Easy): go bop a fairy or the troll by mistake
        const oops = chance(prof.mistake * 0.55);
        let best = null, bu = 0;
        const sp = MAX_SPEED * CPU_SPEED[lvl];
        for (const cr of this.critters) {
          if (cr.phase !== 'up' && cr.phase !== 'rise') continue;
          if ((cr.kind !== 'gopher') !== oops) continue;
          const d = this.bopDist(e, cr);
          const tt = d / sp + 0.3;
          if (cr.phase === 'up' && tt > cr.life + 0.4) continue;
          let u = 1 / tt * rand(0.8, 1.2);
          // gentle: leave it to a human who's nearer
          for (const o of this.ents) if (!o.p.isAI && this.bopDist(o, cr) < d * 0.85) { u *= lvl === 0 ? 0.25 : lvl === 1 ? 0.5 : 0.8; break; }
          for (const o of this.ents) if (o !== e && o.p.isAI && o.target === cr) { u *= 0.2; break; }
          if (u > bu) { bu = u; best = cr; }
        }
        e.target = best;
        e.aiPress = -1;
      }
      e.brain.wait(reactionTime(p) * 0.6 + rand(0.15, 0.35));
    }
    let tx = null, ty = null;
    const T = e.target;
    if (e.wander > 0) { e.wander -= dt; tx = e.wx; ty = e.wy; }
    else if (T) {
      if (T.phase === 'up' || T.phase === 'rise') {
        tx = T.h.x + (e.x < T.h.x ? -95 : 95); ty = T.h.y + 22;
        if (this.bopDist(e, T) < BOP_NEAR + 30) {
          if (e.aiPress < 0) e.aiPress = reactionTime(p) * (lvl === 0 ? 1.0 : 0.65);
          e.aiPress -= dt;
          if (e.aiPress <= 0 && e.swingCd <= 0) {
            this.startSwing(e, T);
            e.aiPress = -1; e.target = null; e.brain.wait(rand(0.15, 0.4));
          }
        }
      } else e.target = null;
    }
    if (tx === null) { c.move(0, 0); return; }
    steer(p, e.x, e.y, tx, ty, { arrive: 60 });
  }

  // ------------------------------------------------------------------ finish
  finish() {
    if (this.done) return;
    this.done = true;
    for (const e of this.ents) if (e.tug) this.releaseTug(e);
    for (const c of this.critters) if (this.hittable(c)) this.sink(c);
    const scores = this.ents.map((e) => e.score);
    const placements = this.n === 1 ? [1] : placementsFromScores(scores);
    const top = Math.max(...scores);
    this.ents.forEach((e, i) => {
      e.a.clearEmotes();
      e.vx = e.vy = 0;
      if (placements[i] === 1) e.a.setPose('celebrate');
      else e.a.setPose(i % 2 ? 'cheer' : 'wave');
    });
    const wa = this.ents[Math.max(0, scores.indexOf(top))];
    this.api.finish({ placements, stats: scores.map((s) => `${s} bop${s === 1 ? '' : 's'}`), solo: scores[0], focus: { x: wa.x, y: wa.y - wa.a.height * 0.5 } });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    const bg = art('bg/gopher-garden');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      if (!this.bgCache) {
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        drawGardenBackground(cv.getContext('2d'), W, H);
        this.bgCache = cv;
      }
      g.drawImage(this.bgCache, 0, 0);
    }
    for (const h of this.holes) this.drawHoleBackAt(g, h);
    // y-sorted world: each hole's pop-up with its front lip, then the players
    const list = [];
    for (const h of this.holes) list.push({ y: h.y + 2, f: () => this.drawHoleContents(g, h) });
    for (const e of this.ents) list.push({ y: e.y, f: () => e.a.draw(g, { ring: e.p.color }) });
    list.sort((A, B) => A.y - B.y);
    for (const it of list) it.f();
    // mallets the troll is holding, over both of them
    for (const e of this.ents) if (e.tug) this.drawTugMallet(g, e);
    for (const e of this.ents) {
      const a = e.a;
      const top = a.y - a.height - 26 - (a.emotes.length ? 50 : 0);
      ui.playerTag(g, e.p, e.x, top);
    }
  }

  drawHUD(g) {
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 990, format: (v) => String(v) });
    if (this.hint > 0 && !this.done) {
      g.save(); g.globalAlpha = clamp(this.hint, 0, 1);
      ui.panel(g, W / 2 - 520, 120, 1040, 66, { r: 33, fill: '#fff8ec' });
      ui.glyph(g, 'a', W / 2 - 480, 153, 46, { pulse: true });
      ui.text(g, 'Bop the gophers!  Not the fairies or the troll!', W / 2 - 446, 155, { size: 34, color: NAVY, stroke: false, weight: 700, align: 'left', maxWidth: 930 });
      g.restore();
    }
  }

  holeW(h) { return HOLE_W * DS(h.y); }

  drawHoleBackAt(g, h) {
    const w = this.holeW(h);
    if (drawArt(g, 'prop/gopher-hole', h.x, h.y, w, w / 2)) return;
    g.save(); g.translate(h.x, h.y); drawHoleBack(g, w, h.dirt / 0.4); g.restore();
  }

  drawHoleFrontAt(g, h) {
    const w = this.holeW(h);
    if (art('prop/gopher-hole')) { drawArt(g, 'prop/gopher-hole-front', h.x, h.y, w, w / 2); return; }   // no front art: the clip does it
    g.save(); g.translate(h.x, h.y); drawHoleFront(g, w); g.restore();
  }

  /** Clip to everything above the opening's front arc (the critter's buried part is hidden). */
  clipHole(g, h) {
    const w = this.holeW(h), O = holeOpening(h.x, h.y, w);
    g.beginPath();
    g.moveTo(h.x - w * 2, O.cy - 900); g.lineTo(h.x + w * 2, O.cy - 900); g.lineTo(h.x + w * 2, O.cy);
    g.lineTo(O.cx + O.rx, O.cy);
    g.ellipse(O.cx, O.cy, O.rx, O.ry, 0, 0, Math.PI);
    g.lineTo(h.x - w * 2, O.cy); g.closePath();
    g.clip();
  }

  drawHoleContents(g, h) {
    const c = h.busy;
    if (c && c.rise > 0.01) {
      g.save();
      this.clipHole(g, h);
      if (c.kind === 'gopher') this.drawGopherAt(g, c);
      else if (c.kind === 'fairy') this.drawFairyAt(g, c);
      else this.drawTrollAt(g, c);
      g.restore();
    }
    this.drawHoleFrontAt(g, h);
    // dazed stars over a bonked gopher / dizzy fairy (outside the clip)
    if (c && (c.phase === 'bonked' || (c.kind === 'gopher' && c.phase === 'sink' && c.t < 0.15))) {
      const s = DS(h.y);
      g.save(); g.translate(h.x, h.y - 170 * s * c.rise); drawDazeStars(g, 50 * s, this.t); g.restore();
    }
  }

  drawGopherAt(g, c) {
    const h = c.h, s = DS(h.y), w = 150 * s;
    const O = holeOpening(h.x, h.y, this.holeW(h));
    const baseY = O.cy + 14 * s + (1 - clamp(c.rise, -0.2, 1.3)) * w * 1.35;
    g.save(); g.translate(h.x, baseY); g.rotate(c.wob); g.scale(1 + c.sq * 0.3, 1 - c.sq * 0.3);
    const key = c.mood === 'bonked' ? 'prop/gopher-bonked' : c.mood === 'wink' || c.mood === 'tease' ? 'prop/gopher-up-2' : 'prop/gopher-up';
    if (!drawArt(g, key, 0, 0, w * 1.07, w * 1.07, { anchor: 'bottom' })) drawGopher(g, w, c.mood, { t: this.t, blink: c.blink < 0 });
    g.restore();
  }

  drawFairyAt(g, c) {
    const h = c.h, s = DS(h.y), a = c.actor;
    const O = holeOpening(h.x, h.y, this.holeW(h));
    const tall = a.height;
    const bob = c.phase === 'up' ? Math.sin(this.t * 3 + c.seed) * 6 * s : 0;
    a.x = h.x; a.y = O.cy - 4 * s + bob + (1 - clamp(c.rise, -0.2, 1.3)) * tall * 1.1;
    a.snap();
    // a soft glow so she reads as "magic friend, not a gopher"
    const gy = a.y - tall * 0.5;
    const gr = g.createRadialGradient(h.x, gy, 4, h.x, gy, tall * 0.75);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(h.x, gy, tall * 0.75, 0, TAU); g.fill();
    g.save(); g.translate(h.x, a.y); g.rotate(c.wob); g.translate(-h.x, -a.y);
    a.draw(g, { shadow: false });
    g.restore();
  }

  /** The troll's mallet-gripping hands (where the mallet head goes while he holds it). */
  trollGrip(c) {
    const h = c.h, a = c.actor;
    if (art('prop/gopher-troll-tug')) {
      const w = 260 * DS(h.y), k = w / 400, O = holeOpening(h.x, h.y, this.holeW(h));
      const f = a.facing;
      return { x: h.x + (TUG_GRIP[0] - 200) * k * f, y: this.trollBase(c, O) + (TUG_GRIP[1] - 400) * k };
    }
    return a.anchor('hand');
  }

  trollBase(c, O) {
    const s = DS(c.h.y);
    return O.cy + 20 * s + (1 - clamp(c.rise, -0.2, 1.3)) * 300 * s;
  }

  drawTrollAt(g, c) {
    const h = c.h, s = DS(h.y), a = c.actor;
    const O = holeOpening(h.x, h.y, this.holeW(h));
    const holding = c.phase === 'tug';
    const key = holding ? 'prop/gopher-troll-tug' : 'prop/gopher-troll-up';
    const w = 260 * s;
    const baseArt = this.trollBase(c, O);
    if (art(key)) {
      g.save(); g.translate(h.x, baseArt); g.rotate(c.wob); g.scale(a.facing, 1);
      drawArt(g, key, 0, 0, w, w, { anchor: 'bottom' });
      g.restore();
      return;
    }
    // the sprite: sunk to the waist in the hole
    a.x = h.x; a.y = O.cy + a.height * 0.5 + (1 - clamp(c.rise, -0.2, 1.3)) * a.height * 0.6;
    a.snap();
    g.save(); g.translate(h.x, O.cy); g.rotate(c.wob); g.translate(-h.x, -O.cy);
    a.draw(g, { shadow: false });
    g.restore();
  }

  drawTugMallet(g, e) {
    const c = e.tug.c, hd = e.a.anchor('hand'), tg = this.trollGrip(c);
    const ang = Math.atan2(tg.y - hd.y, tg.x - hd.x);
    const L = Math.max(40, Math.hypot(tg.x - hd.x, tg.y - hd.y) / 0.84);
    g.save(); g.translate(hd.x, hd.y); g.rotate(ang + Math.sin(this.t * 22) * 0.05);
    this.drawMalletShape(g, L, e.p.color);
    g.restore();
  }

  drawMalletShape(g, L, color) {
    // prop/gopher-mallet: 480x200, grip at (96, 100), head at the right end
    if (drawArt(g, 'prop/gopher-mallet', L * (240 - 96) / 400, 0, L * 480 / 400, L * 200 / 400)) return;
    drawMallet(g, L, color);
  }

  drawMalletAttach(g, info, e, behindLayer) {
    if (e.tug) return;   // the troll has it (drawTugMallet)
    const L = Math.max(70, info.h * 0.62);
    const rear = info.hand.x < info.eyes.x - info.h * 0.04;
    const REST = rear ? -2.15 : -0.8, BACK = -2.75, END = 0.35;
    let ang = REST + Math.sin(this.t * 3 + e.i) * 0.05;
    const s = e.swingT;
    if (e.stun > 0) ang = REST + Math.sin(this.t * 14) * 0.3;
    else if (s >= 0) {
      if (s < HIT_AT * 0.6) ang = lerp(REST, BACK, ease.outQuad(s / (HIT_AT * 0.6)));
      else if (s < HIT_AT) ang = lerp(BACK, END, ease.inQuad((s - HIT_AT * 0.6) / (HIT_AT * 0.4)));
      else ang = lerp(END, REST, ease.inOutQuad(clamp((s - HIT_AT - 0.06) / (SWING_T - HIT_AT - 0.06), 0, 1)));
    }
    // up and back it goes behind the character (never over a face); forward, in front
    if ((ang < (rear ? -2.45 : -1.75)) !== behindLayer) return;
    if (s > HIT_AT * 0.5 && s < HIT_AT + 0.08 && e.stun <= 0) {
      const k = 1 - clamp((s - HIT_AT) / 0.08, 0, 1);
      g.save(); g.globalAlpha = 0.5 * k; g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineWidth = L * 0.18;
      g.beginPath(); g.arc(info.hand.x, info.hand.y, L * 0.8, Math.max(BACK, ang - 1.3), ang); g.stroke(); g.restore();
    }
    g.save(); g.translate(info.hand.x, info.hand.y); g.rotate(ang);
    this.drawMalletShape(g, L, e.p.color);
    g.restore();
  }
}
