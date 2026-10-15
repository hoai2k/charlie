// Unicorn Hop (Molly Party) - everyone rides a unicorn along a candy meadow
// that scrolls faster and faster. Press A to hop over puddles, bouncy
// mushrooms and sleeping bunnies; grab stars, rainbow candies and giant
// lollipops. Clean hops grow a rainbow trail behind you. Bumping is never a
// penalty: puddles splash, mushrooms BOING you sky-high, bunnies pop up.
// The last 10 seconds are the Rainbow Rush: faster, and treats everywhere.
//
// Riders sit on a procedural unicorn (four-legged characters gallop on their
// own, wearing the wardrobe Unicorn Horn). 1-4 lanes stacked top to bottom;
// 5-8 players share lanes two by two.
//
// Art hooks (all optional, procedural fallbacks ship today):
//   bg/unicorn-jump (seamless horizontal tile)  prop/uj-mount  prop/uj-mount-jump
//   prop/uj-puddle  prop/uj-mushroom  prop/uj-bunny  prop/uj-bunny-awake
//   prop/uj-star  prop/uj-candy  prop/uj-lollipop
// New-pose hooks: 'ride-sit' -> sit -> ride (sitting astride the unicorn)
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, sfxLoop, hasSound, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { drawMirroredScroll } from '../engine/scroll-art.js';
import { aiProfile, Brain } from '../engine/ai.js';
import { outfitItem } from '../engine/outfits.js';
import { charById } from '../data/characters.js';
import { drawSparkleShape, drawStarShape, drawHeartShape } from '../engine/emotes.js';
import { clamp, lerp, approach, rand, randInt, pick, chance, TAU, placementsFromScores } from '../engine/util.js';

const NAVY = '#24163f';
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export const meta = {
  id: 'unicorn-jump',
  title: 'Unicorn Hop',
  category: 'molly',
  type: 'Hop & collect',
  goal: 'Ride your unicorn, hop over things and grab the treats!',
  controls: [['a', 'Hop!'], ['stick', 'Gallop faster or slower']],
  tips: ['Hop over puddles, mushrooms and sleepy bunnies to grow a rainbow trail.', 'Stars float up high - hop to grab them!', 'Bumping is just silly: mushrooms go BOING!'],
  // Molly Easy: the unicorn gallops by itself; A hops when the big A shows
  goalEasy: 'Your unicorn gallops by itself. Press A to hop over things!',
  controlsEasy: [['a', 'Hop!']],
  tipsEasy: ['Press A when the big A pops up!', 'Bumping is just silly: mushrooms go BOING!'],
  music: 'bouncy',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    t = t || 0;
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = w / 400, hh = h / s;
    g.translate(x, y); g.scale(s, s);
    const gr = g.createLinearGradient(0, 0, 0, hh);
    gr.addColorStop(0, '#ffc2e6'); gr.addColorStop(1, '#d8c8ff');
    g.fillStyle = gr; g.fillRect(0, 0, 400, hh);
    g.save(); g.globalAlpha = 0.55; g.lineWidth = 12;
    RAINBOW.slice(0, 6).forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(200, hh + 40, 250 - i * 12, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); });
    g.restore();
    ui.cloud(g, 70, hh * 0.18, 0.35, '#fff', 0.9);
    ui.cloud(g, 330, hh * 0.25, 0.3, '#fff', 0.9);
    g.fillStyle = '#9be8b8'; g.fillRect(0, hh * 0.8, 400, hh * 0.2);
    g.fillStyle = '#c6f5d6'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(i * 44 + 10, hh * 0.8, 16, Math.PI, 0); g.fill(); }
    // rainbow trail
    const hop = Math.abs(Math.sin(t * 2.4));
    const uy = hh * 0.8 - hop * 50;
    g.save(); g.lineCap = 'round';
    RAINBOW.slice(0, 6).forEach((c, i) => {
      g.strokeStyle = c; g.lineWidth = 7; g.beginPath();
      for (let k = 0; k <= 20; k++) { const px = 175 - k * 9; const py = uy - 70 + i * 6 + Math.sin(t * 6 - k * 0.5) * 5; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
    });
    g.restore();
    drawPuddle(g, 300 - ((t * 60) % 120), hh * 0.82, 0.5, t);
    drawUnicorn(g, 210, uy, 0.62, t * 9, hop > 0.3, { saddle: '#ff6fb1' });
    for (let i = 0; i < 3; i++) { g.save(); g.translate(290 + i * 34, hh * 0.32 + Math.sin(t * 3 + i) * 6); drawStar(g, 15, t + i); g.restore(); }
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 45;
const RUSH_AT = 10;            // seconds left when the Rainbow Rush starts
const SPEED0 = 560, SPEED1 = 760, SPEED_RUSH = 920;   // ground scroll px/s (scale 1)
const HOP_V = 1250, HOP_G = 3000;                     // per lane scale
const SOLO_GOAL = 120;
const TOP = 250, BOT = 1010;
const TRAIL_MAX = 14;
const SADDLE = 122;            // saddle height above the hooves (mount units)
const OB_ART = { puddle: 'prop/uj-puddle', mushroom: 'prop/uj-mushroom', bunny: 'prop/uj-bunny' };
const NEW_POSE_FALLBACK = { 'ride-sit': ['sit', 'ride'] };
const poseName = (n) => {
  if (POSE_NAMES.includes(n)) return n;
  for (const f of NEW_POSE_FALLBACK[n] || []) if (POSE_NAMES.includes(f)) return f;
  return 'idle';
};
// pastel unicorn coats, one per player slot (generic unicorns, not the roster's Last Unicorn)
const COATS = [['#ffd9ee', '#f6c2e0'], ['#dbe6ff', '#c3d3f7'], ['#d8f7e6', '#bfe9d2'], ['#fff1c4', '#f2dea2'], ['#ebdcff', '#d7c2fa'], ['#ffe2cf', '#f5caae'], ['#d2f5f5', '#b7e4e4'], ['#ffdcf7', '#f1c0e9']];
const QUAD = new Set(['fox', 'cotton-candy', 'unicorn']);

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: no stick; A hops (a press just before landing still counts)
    this.players = api.players;
    const n = this.n = this.players.length;
    this.t = 0; this.time = 0;
    this.timeLeft = DURATION;
    this.rush = false; this.rushT = 0;
    this.done = false;
    this.dist = 0;               // ground distance travelled (px at scale 1)
    this.speed = SPEED0;
    const L = this.L = n <= 4 ? n : Math.ceil(n / 2);
    this.s = [1.05, 1.05, 0.86, 0.7, 0.6][L];
    const span = BOT - TOP, lh = span / L;
    this.lanes = Array.from({ length: L }, (_, i) => ({
      i, ground: L === 1 ? 880 : TOP + lh * (i + 1) - 18, h: lh,
      obs: [], items: [], nextOb: 700 + i * 140 + rand(0, 200), riders: [],
    }));
    this.ents = this.players.map((p, i) => {
      const lane = this.lanes[n <= 4 ? i : Math.floor(i / 2)];
      const two = n > 4 && (lane.i * 2 + 1 < n);
      const slot = n <= 4 ? 0 : i % 2;
      const baseX = two ? (slot === 0 ? 780 : 420) : 620;
      const quad = QUAD.has(p.charId);
      const s = this.s;
      // normalise height so tiny avatars (e.g. garden fairies, 54 px) still read on a unicorn
      const lh0 = (charById(p.charId)?.members[0]?.h) || 170;
      const norm = clamp((quad ? 165 : 160) / lh0, 0.85, 2.6);
      const a = new Actor(p, { scale: s * (quad ? 1.05 : 1.0) * norm, x: baseX, y: lane.ground });
      a.facing = 1; a.snap();
      if (quad && p.charId !== 'unicorn') {
        const keep = (p.outfit || []).filter((o) => { const it = outfitItem(o.id); return it && it.slot !== 'head'; });
        a.setOutfit([...keep, { id: 'unicorn-horn', colour: 7 }]);
      }
      const e = {
        p, a, i, lane, quad, baseX, x: baseX, vx: 0, pv: 0, z: 0, vz: 0, score: 0, trail: 0, best: 0,
        hist: [], phase: rand(TAU), wet: 0, dizzy: 0, popN: 0, popT: 0, cheerT: 0, bob: 0,
        brain: new Brain(p), plan: new Map(), aiX: baseX, aiXT: 0,
      };
      lane.riders.push(e);
      return e;
    });
    for (const e of this.ents) this.setRidePose(e);
    this.clouds = Array.from({ length: 7 }, (_, i) => ({ x: i * 330 + rand(0, 120), y: rand(60, 230), s: rand(0.5, 0.95) }));
    this.gallop = null;
  }

  setRidePose(e) {
    const a = e.a;
    if (a._once) return;
    if (e.quad) a.setPose(e.z > 2 ? (e.vz > 0 ? 'jump' : 'fall') : e.dizzy > 0 ? 'dizzy' : this.started || this.done ? 'run' : 'idle');
    else a.setPose(e.dizzy > 0 ? 'dizzy' : poseName('ride-sit'));
    if (e.quad) a.speed = 1;
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.phase += dt * 3; this.setRidePose(e); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    if (!this.started) {
      this.started = true; this.startT = this.t - dt;
      if (hasSound('uh-gallop')) this.gallop = sfxLoop('uh-gallop', { vol: 0.35 });
      for (const e of this.ents) if (!e.p.isAI) e.a.say('Giddy-up!', 1.2, 'woo');
    }
    const el = this.t - this.startT;
    this.timeLeft = Math.max(0, DURATION - el);
    if (!this.rush && this.timeLeft <= RUSH_AT) this.startRush();
    if (this.rush) this.rushT += dt;
    const target = this.rush ? SPEED_RUSH : lerp(SPEED0, SPEED1, clamp(el / (DURATION - RUSH_AT), 0, 1));
    this.speed = approach(this.speed, target, 220 * dt);
    this.step(dt, true);
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    this.speed = approach(this.speed, 0, 900 * dt);
    this.step(dt, false);
  }

  /** One frame of world motion; `live` = gameplay on (input, spawns, collisions). */
  step(dt, live) {
    const sv = this.speed * this.s;     // on-screen scroll speed
    this.dist += this.speed * dt;
    this.time += dt;
    for (const ln of this.lanes) {
      if (live) {
        ln.nextOb -= this.speed * dt;
        if (ln.nextOb <= 0) this.spawnSection(ln);
      }
      for (const o of ln.obs) { o.x -= sv * dt; o.sq = approach(o.sq, 0, dt * 3); o.t += dt; if (o.fly) { o.fly.vz -= 2200 * dt; o.fly.z += o.fly.vz * dt; o.fly.r += o.fly.spin * dt; if (o.fly.z <= 0 && o.fly.vz < 0) { o.fly = null; o.awake = 2.5; o.sq = 0.4; } } if (o.awake > 0) o.awake -= dt; }
      for (const it of ln.items) { it.x -= sv * dt; it.t += dt; if (it.got) it.gt += dt; it.pulse = Math.max(0, it.pulse - dt); }
      ln.obs = ln.obs.filter((o) => o.x > -260);
      ln.items = ln.items.filter((it) => it.x > -120 && !(it.got && it.gt > 0.35));
    }
    for (const e of this.ents) {
      if (live && e.p.isAI) this.aiThink(e, dt);
      this.moveRider(e, dt, live);
    }
    if (live) for (const e of this.ents) this.collide(e);
  }

  startRush() {
    this.rush = true; this.rushT = 0;
    snd('uh-rush', 'fever'); sfx('magic');
    fx.flash('#ffd6f2', 0.3); fx.shake(8, 0.3);
    particles.confettiRain(W, 100);
    for (const ln of this.lanes) ln.nextOb = Math.min(ln.nextOb, 200);
    for (const e of this.ents) { e.a.emote('sparkle', 1.5); if (!e.p.isAI) e.a.say('Wheee!', 1.2, 'woo'); }
  }

  // -------------------------------------------------------------- the course
  /** One obstacle plus the treats around it, spawned just off the right edge. */
  spawnSection(ln) {
    const s = this.s;
    const x0 = W + 140;
    const kinds = ['puddle', 'mushroom', 'bunny'];
    const kind = pick(kinds);
    const ob = { kind, x: x0, w: (kind === 'puddle' ? 170 : kind === 'mushroom' ? 110 : 120) * s, hgt: (kind === 'puddle' ? 6 : kind === 'mushroom' ? 70 : 46) * s, sq: 0, t: rand(5), hit: new Set(), cleared: new Set(), fly: null, awake: 0 };
    ln.obs.push(ob);
    // star arc over the obstacle: grabbed by hopping over it
    const apex = (HOP_V * HOP_V) / (2 * HOP_G) * s;
    const airDist = (2 * HOP_V / HOP_G) * this.speed * s;
    const arc = this.rush ? 5 : 3;
    for (let k = 0; k < arc; k++) {
      const f = arc === 1 ? 0 : k / (arc - 1) - 0.5;
      const big = !this.rush && k === 1 && chance(0.18);
      ln.items.push({ kind: big ? 'lolly' : 'star', x: x0 + f * airDist * 0.62, h: apex * (1 - f * f * 2.4) * 0.92 + 60 * s, t: rand(5), got: null, gt: 0, by: new Set(), pulse: 0 });
    }
    // a row of candies on the ground after it (run through them)
    const gap = (this.rush ? rand(560, 760) : rand(720, 1050) * lerp(1.1, 0.95, clamp(this.speed / SPEED1, 0, 1)));
    const nc = this.rush ? randInt(4, 6) : randInt(1, 3);
    const cx0 = x0 + 260 * s + airDist * 0.25;
    const cspan = gap * s - 380 * s - airDist * 0.25;
    for (let k = 0; k < nc; k++) {
      const x = cx0 + (cspan * (k + 0.5)) / nc;
      const up = this.rush && k % 2 === 1;
      ln.items.push({ kind: 'candy', x, h: (up ? 150 : 46) * s, t: rand(5), hue: k, got: null, gt: 0, by: new Set(), pulse: 0 });
    }
    ln.nextOb = gap;
  }

  // ----------------------------------------------------------------- riders
  moveRider(e, dt, live) {
    const a = e.a, p = e.p, s = this.s;
    e.dizzy = Math.max(0, e.dizzy - dt); e.wet = Math.max(0, e.wet - dt);
    e.popT = Math.max(0, e.popT - dt); e.cheerT = Math.max(0, e.cheerT - dt);
    e.phase += dt * (6 + this.speed / 90);
    const human = this.easy && !p.isAI;
    const inX = live && !human ? p.ctrl.x : 0;
    e.vx = approach(e.vx, inX * 420 * s, 2600 * dt);
    e.pv *= Math.exp(-5 * dt);
    const lo = e.baseX - 300 * s, hi = e.baseX + 360 * s;
    e.x = clamp(e.x + (e.vx + e.pv) * dt, Math.max(200, lo), Math.min(W - 260, hi));
    if (!live && this.done) e.x = approach(e.x, e.baseX, 200 * dt);
    // Molly Easy: a press in the air or while dizzy is remembered for a moment
    if (human) { e.buf = Math.max(0, (e.buf || 0) - dt); if (live && p.ctrl.pressed('a')) e.buf = 0.3; }
    if (live && (human ? e.buf > 0 : p.ctrl.pressed('a')) && e.z <= 6 * s && e.dizzy <= 0) { e.buf = 0; this.hop(e, 1); }
    if (e.z > 0 || e.vz > 0) {
      e.vz -= HOP_G * s * dt; e.z += e.vz * dt;
      if (e.z <= 0) {
        e.z = 0; e.vz = 0;
        a.squash(0.28); e.land = 0.18;
        particles.burst(e.x, e.lane.ground, { type: 'dust', count: 5, color: '#fff', speed: [40, 120], size: [8, 16] });
        snd('uh-land', 'land', { vol: 0.5 });
      }
    }
    e.land = Math.max(0, (e.land || 0) - dt);
    // rainbow trail history (screen y of the saddle)
    e.hist.push({ t: this.time, y: e.lane.ground - e.z - this.seatH(e) * 0.75, x: e.x });
    while (e.hist.length > 2 && e.hist[0].t < this.time - 2) e.hist.shift();
    if (e.trail >= 6 && Math.random() < dt * (e.trail * 1.4)) particles.burst(e.x - 60 * s, e.lane.ground - e.z - this.seatH(e) * 0.7, { type: 'sparkle', count: 1, colors: ['#fff', '#fff6a8', '#ffc2e6'], speed: [20, 80], size: [10, 18] });
    // actor placement
    a.x = e.x + (e.quad ? 0 : -14 * s);
    a.y = e.lane.ground;
    a.z = e.z + (e.quad ? 0 : this.seatLift(e));
    a.facing = 1;
    if (!this.done) this.setRidePose(e);
    a.update(dt);
  }

  /** Height of the saddle above the ground (riders) / half body (quads). */
  seatH(e) { return e.quad ? e.a.height * 0.55 : SADDLE * this.s; }
  /** How high the rider's feet sit: into the saddle, with a gallop bob. */
  seatLift(e) {
    const bob = e.z > 1 ? 0 : Math.abs(Math.sin(e.phase)) * 7 * this.s;
    return SADDLE * this.s - e.a.height * 0.2 + bob;
  }

  hop(e, power) {
    const s = this.s;
    e.vz = HOP_V * s * power; e.z = Math.max(e.z, 1);
    e.a.squash(-0.22);
    snd('uh-hop', 'jump', { vol: 0.8 });
    particles.burst(e.x, e.lane.ground, { type: 'dust', count: 4, color: '#fff', speed: [30, 100], size: [8, 14] });
    if (!e.p.isAI) e.p.ctrl.rumble(0.15, 50);
  }

  collide(e) {
    const s = this.s, ln = e.lane;
    // obstacles: clear or bump
    for (const o of ln.obs) {
      if (o.hit.has(e) || o.cleared.has(e)) continue;
      const dx = o.x - e.x;
      const reach = o.w * 0.5 + 26 * s;
      if (Math.abs(dx) < reach && e.z < o.hgt && !o.fly) this.bump(e, o);
      else if (dx < -reach) { o.cleared.add(e); this.cleared(e, o); }
    }
    // treats
    const top = this.seatH(e) + e.a.height * 0.85;
    for (const it of ln.items) {
      if (it.got || it.by.has(e)) continue;
      const dx = Math.abs(it.x - e.x);
      const r = (it.kind === 'lolly' ? 80 : it.kind === 'star' ? 62 : 56) * s;
      if (dx < r && it.h > e.z - 20 * s && it.h < e.z + top) this.collect(e, it);
    }
  }

  cleared(e, o) {
    e.score += 1;
    e.trail = Math.min(TRAIL_MAX, e.trail + 1);
    e.best = Math.max(e.best, e.trail);
    const a = e.a;
    snd('uh-clear', 'collect', { step: Math.min(e.trail, 12) });
    this.pop(e, '+1', '#ffffff', 42);
    if (o.kind === 'bunny' && !o.awake) {
      o.awake = 1.8; o.sq = 0.5;
      snd('uh-bunny', 'tiny-squeak', { vol: 0.6 });
      particles.burst(o.x, e.lane.ground - 60 * this.s, { type: 'heart', count: 3, colors: ['#ff8fc7', '#ffc2e6'] });
    }
    if (o.kind === 'mushroom') o.sq = 0.25;
    if (e.trail > 0 && e.trail % 5 === 0) {
      snd('uh-rainbow', 'sparkle-beam', { vol: 0.8 }); sfx('sparkle');
      this.pop(e, e.trail >= 10 ? 'Super rainbow!' : 'Rainbow!', RAINBOW[(e.trail / 5) % RAINBOW.length | 0], 52, 1);
      particles.burst(e.x, e.lane.ground - e.z - this.seatH(e), { type: 'star', count: 14, colors: RAINBOW });
      particles.ring(e.x, e.lane.ground - e.z - this.seatH(e), '#fff6a8', 160, 0.45);
      fx.shake(5, 0.15);
      if (this.api.camera && !e.p.isAI) this.api.camera.punch(e.x, e.lane.ground - this.seatH(e), 1.08, 0.35);
      a.playOnce('cheer', 0.6); a.emote('sparkle', 1);
      if (!e.p.isAI) e.p.ctrl.rumble(0.35, 90);
      if (chance(0.5)) a.say(pick(['Wheee!', 'Yay!', 'Woo!']), 1, 'woo');
    } else if (e.cheerT <= 0 && chance(0.35)) { a.playOnce('cheer', 0.4); e.cheerT = 1; }
  }

  bump(e, o) {
    o.hit.add(e);
    const a = e.a, s = this.s, gy = e.lane.ground;
    const lost = Math.min(e.trail, 3);
    e.trail -= lost;
    if (!e.p.isAI) e.p.ctrl.rumble(0.4, 120);
    if (o.kind === 'puddle') {
      snd('uh-splash', 'splash');
      particles.burst(o.x, gy - 10, { type: 'drop', count: 16, colors: ['#7fd3ff', '#bfeaff', '#ffffff'], speed: [250, 560] });
      particles.burst(o.x, gy - 6, { type: 'bubble', count: 6, colors: ['#bfeaff'] });
      e.wet = 1.4; e.pv = -260 * s; o.sq = 0.6;
      a.playOnce('surprised', 0.5); a.flash('#9fe0ff', 0.3); a.squash(0.3);
      voice(e.p.charId, 'laugh');
      this.pop(e, 'Splash!', '#7fd3ff', 46);
    } else if (o.kind === 'mushroom') {
      snd('uh-boing', 'boing');
      o.sq = 0.8;
      e.vz = HOP_V * s * 1.28; e.z = Math.max(e.z, 2);
      a.squash(-0.35); a.playOnce('surprised', 0.6);
      particles.burst(o.x, gy - o.hgt, { type: 'star', count: 8, colors: ['#ff6f91', '#ffffff', '#ffd23f'] });
      voice(e.p.charId, 'woo');
      this.pop(e, 'BOING!', '#ff6f91', 58);
      fx.shake(6, 0.18);
    } else {
      snd('uh-bunny-boing', 'rubber-bounce');
      sfx('tiny-squeak', { vol: 0.6 });
      o.fly = { z: 0, vz: 900 * s, r: 0, spin: rand(-12, 12) };
      e.dizzy = 0.55; e.pv = -160 * s;
      e.vz = Math.max(e.vz, 520 * s); e.z = Math.max(e.z, 2);
      a.playOnce('dizzy', 0.55); a.emote('dizzy', 0.8);
      particles.burst(o.x, gy - 40 * s, { type: 'heart', count: 5, colors: ['#ff8fc7', '#ffffff'] });
      voice(e.p.charId, 'laugh');
      this.pop(e, 'Boop!', '#ffb3d9', 46);
    }
    if (lost >= 3) particles.burst(e.x - 50 * s, gy - e.z - this.seatH(e), { type: 'spark', count: 8, colors: RAINBOW });
  }

  collect(e, it) {
    it.by.add(e); it.pulse = 0.3;
    if (it.by.size >= e.lane.riders.length) { it.got = e; it.gt = 0; }
    const a = e.a;
    const v = it.kind === 'lolly' ? 3 : 1;
    e.score += v;
    const y = e.lane.ground - it.h;
    if (it.kind === 'lolly') {
      snd('uh-lolly', 'golden-chime'); sfx('sparkle');
      particles.burst(it.x, y, { type: 'star', count: 14, colors: RAINBOW });
      fx.flash('#fff3b0', 0.1);
      this.pop(e, '+3', '#ffd23f', 64);
      a.emote('heart', 1); a.playOnce('cheer', 0.5);
      voice(e.p.charId, 'yay');
    } else if (it.kind === 'star') {
      snd('uh-star', 'star', { vol: 0.7 });
      particles.burst(it.x, y, { type: 'sparkle', count: 5, colors: ['#ffd23f', '#fff6a8', '#fff'] });
      if (e.popT <= 0) this.pop(e, '+1', '#ffd23f', 34);
    } else {
      snd('uh-candy', 'coin', { vol: 0.55 });
      particles.burst(it.x, y, { type: 'spark', count: 6, colors: RAINBOW, speed: [120, 260] });
    }
  }

  pop(e, str, color, size, side = 0) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.6;
    const lvl = e.popN % 3;
    const top = e.lane.ground - e.z - this.seatH(e) - e.a.height * 0.9;
    particles.popText(e.x + side * 80 + (lvl === 1 ? 40 : lvl === 2 ? -40 : 0), top - lvl * 46, str, color, size * clamp(this.s * 1.15, 0.8, 1.15));
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, ctrl = p.ctrl, prof = aiProfile(p), s = this.s;
    // Gentle on purpose: even Hard misses now and then; Easy bumps a lot.
    const skill = [0.55, 0.7, 0.8][clamp(p.aiLevel ?? 0, 0, 2)];
    const sv = this.speed * s;
    for (const o of e.lane.obs) {
      if (o.hit.has(e) || o.cleared.has(e) || e.plan.has(o)) continue;
      const dx = o.x - e.x;
      if (dx < 0 || dx > sv * 1.3) continue;
      // decide once per obstacle: a good hop lands the apex over it
      const good = chance(skill);
      const lead = good ? rand(0.18, 0.42) : chance(0.5) ? rand(0.55, 0.8) : rand(-0.1, 0.05);
      e.plan.set(o, { at: lead, skip: !good && chance(0.4) });
    }
    if (e.plan.size > 30) for (const k of e.plan.keys()) if (!e.lane.obs.includes(k)) e.plan.delete(k);
    if (e.z <= 1) {
      for (const [o, pl] of e.plan) {
        if (pl.done || pl.skip || o.hit.has(e) || o.cleared.has(e)) continue;
        const tArrive = (o.x - e.x) / sv;
        if (tArrive <= pl.at) { ctrl.press('a'); pl.done = true; break; }
      }
      // sometimes hop for a lollipop just for fun
      if (chance(dt * prof.mistake * 0.4)) ctrl.press('a');
    }
    // wander forward/back a little, aiming at the next lollipop
    e.aiXT -= dt;
    if (e.aiXT <= 0) {
      e.aiXT = rand(...prof.think) * 2;
      e.aiX = e.baseX + rand(-140, 200) * s;
      const lolly = e.lane.items.find((it) => it.kind === 'lolly' && !it.got && it.x > e.x);
      if (lolly && chance(skill)) e.aiX = clamp(lolly.x - sv * 0.6, e.baseX - 250 * s, e.baseX + 330 * s);
    }
    const d = e.aiX - e.x;
    ctrl.move(Math.abs(d) < 20 ? 0 : clamp(d / 120, -1, 1) * prof.speed * 0.8, 0);
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    if (this.gallop) { this.gallop.stop(0.4); this.gallop = null; }
    const scores = this.ents.map((e) => e.score);
    const placements = this.n === 1 ? [scores[0] >= SOLO_GOAL ? 1 : 2] : placementsFromScores(scores);
    const top = Math.max(...scores);
    this.ents.forEach((e, i) => {
      e.a.clearEmotes();
      if (scores[i] === top || placements[i] <= 2) { e.a._once = null; e.a.setPose('celebrate'); e.a.emote('sparkle', 2); }
      else { e.a._once = null; e.a.setPose(e.quad ? 'cheer' : 'wave'); }
    });
    const wi = scores.indexOf(top), we = this.ents[wi];
    this.api.finish({
      placements, solo: scores[0],
      stats: this.ents.map((e) => `${e.score} treats`),
      focus: { x: we.x, y: we.lane.ground - this.seatH(we) - 40 },
    });
  }

  destroy() { if (this.gallop) { this.gallop.stop(0.1); this.gallop = null; } }

  // -------------------------------------------------------------------- draw
  draw(g) {
    this.drawBackground(g);
    for (const ln of this.lanes) this.drawLaneGround(g, ln);
    for (const ln of this.lanes) {
      for (const o of ln.obs) this.drawObstacle(g, ln, o);
      for (const it of ln.items) if (it.h < 80 * this.s) this.drawItem(g, ln, it);
      const rs = ln.riders.slice().sort((a, b) => a.x - b.x);
      for (const e of rs) this.drawTrail(g, e);
      for (const e of rs) this.drawRider(g, e);
      for (const o of ln.obs) if (o.fly) this.drawObstacle(g, ln, o, true);
      for (const it of ln.items) if (it.h >= 80 * this.s) this.drawItem(g, ln, it);
    }
    for (const e of this.ents) {
      const top = e.lane.ground - e.z - this.seatH(e) - e.a.height * (e.quad ? 0.5 : 0.82) - 18 - (e.a.emotes.length ? 50 : 0);
      ui.playerTag(g, e.p, e.x, top);
    }
    if (this.easy && !this.done) for (const e of this.ents) if (!e.p.isAI) this.drawHopCue(g, e);
  }

  /** Molly Easy: the next thing to hop glows, and a big A pops up when it's time. */
  drawHopCue(g, e) {
    const s = this.s, sv = Math.max(1, this.speed * s);
    let next = null;
    for (const o of e.lane.obs) {
      if (o.hit.has(e) || o.cleared.has(e) || o.fly || o.x < e.x) continue;
      if (!next || o.x < next.x) next = o;
    }
    if (!next) return;
    const tArrive = (next.x - e.x) / sv;
    if (tArrive > 1.4) return;
    const gy = e.lane.ground;
    const now = tArrive <= 0.5 && e.z <= 6 * s;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 14);
    g.save();
    g.strokeStyle = now ? '#ffd23f' : e.p.color; g.lineWidth = (now ? 10 : 7) * Math.max(0.7, s);
    g.globalAlpha = now ? 0.75 + 0.25 * pulse : 0.85;
    g.beginPath(); g.ellipse(next.x, gy - next.hgt * 0.4, next.w * 0.62 + pulse * 6, (next.hgt * 0.5 + 34) * Math.max(0.7, s), 0, 0, TAU); g.stroke();
    g.restore();
    if (now) {
      const top = gy - this.seatH(e) - e.a.height * (e.quad ? 0.5 : 0.82) - 70 * s;
      ui.glyph(g, 'a', e.x + 110 * s, top + Math.sin(this.t * 10) * 6, 84 * clamp(s * 1.1, 0.75, 1.1), { pulse: true });
    }
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 22, avoidCenter: true, format: (v) => String(v) });
    if (this.n === 1) ui.text(g, `Goal: ${SOLO_GOAL}`, W / 2, 140, { size: 38, color: '#ffd23f' });
    if (this.rush) {
      const pulse = 1 + Math.sin(this.t * 9) * 0.06;
      g.save(); g.translate(W / 2, this.n === 1 ? 190 : 150); g.scale(pulse, pulse);
      ui.text(g, 'RAINBOW RUSH!', 0, 0, { size: 44, color: RAINBOW[Math.floor(this.t * 8) % RAINBOW.length], weight: 800 });
      g.restore();
      if (this.rushT < 2.2) {
        g.save(); g.globalAlpha = clamp(2.2 - this.rushT, 0, 1);
        ui.banner(g, 'Rainbow Rush!', this.rushT, { y: 520, size: 150, color: '#ff6fd0' });
        g.restore();
      }
    }
  }

  // ------------------------------------------------------------ background
  drawBackground(g) {
    const bg = art('bg/unicorn-jump');
    if (bg) {
      // The backdrop keeps its decoration above the lanes and a plain meadow
      // below, so it needs no readability wash.
      drawMirroredScroll(g, bg, W, H, this.dist * 0.2);
      if (this.rush) this.drawRushTint(g);
      return;
    }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, this.rush ? '#ff9fd8' : '#ffc6e8'); gr.addColorStop(0.45, '#e2d0ff'); gr.addColorStop(1, '#fff0f8');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // sun
    g.save(); g.translate(1600, 170);
    g.globalAlpha = 0.3; g.fillStyle = '#fff6a8';
    for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(80, -12); g.lineTo(200 + Math.sin(this.t * 2 + i) * 12, 0); g.lineTo(80, 12); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, 76, 0, TAU); g.fill();
    g.restore();
    // big rainbow arc
    g.save(); g.globalAlpha = this.rush ? 0.75 : 0.4; g.lineWidth = 30;
    RAINBOW.slice(0, 6).forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(760, 820, 700 - i * 30, Math.PI * 1.06, Math.PI * 1.94); g.stroke(); });
    g.restore();
    // clouds (slow parallax)
    for (const c of this.clouds) {
      const x = ((c.x - this.dist * 0.08 * c.s) % (W + 400) + W + 400) % (W + 400) - 200;
      ui.cloud(g, x, c.y, c.s, '#fff', 0.85);
    }
    // far hills with gumdrop trees
    const off1 = this.dist * 0.12, off2 = this.dist * 0.25;
    this.hillLayer(g, 330, '#f7c6ef', 50, 0.0026, off1);
    for (let k = -1; k < 8; k++) {
      const x = ((k * 300 - off1) % 2400 + 2400) % 2400 - 200;
      gumTree(g, x, 335 + Math.sin((k * 300) * 0.0026) * 20, 0.7, ['#ff8fc7', '#8be8b8', '#c9a0ff', '#ffe066'][((k % 4) + 4) % 4]);
    }
    this.hillLayer(g, 400, '#bdeed2', 40, 0.0037, off2);
    // meadow below
    const mg = g.createLinearGradient(0, 380, 0, H);
    mg.addColorStop(0, '#c9f3d8'); mg.addColorStop(1, '#a6e6c2');
    g.fillStyle = mg; g.fillRect(0, 420, W, H - 420);
    // scattered flowers drift by with the ground (per lane band)
    if (this.rush) this.drawRushTint(g);
  }

  hillLayer(g, y, color, amp, freq, off) {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) g.lineTo(x, y + Math.sin((x + off) * freq) * amp + Math.sin((x + off) * freq * 2.3) * amp * 0.3);
    g.lineTo(W, H); g.closePath(); g.fill();
  }

  drawRushTint(g) {
    g.save(); g.globalAlpha = 0.08 + 0.05 * Math.sin(this.t * 8);
    g.fillStyle = '#ff6fd0'; g.fillRect(0, 0, W, H); g.restore();
  }

  drawLaneGround(g, ln) {
    const s = this.s, y = ln.ground;
    const off = this.dist * s;
    // back scenery for this lane: bushes and a candy-cane fence (parallax 0.6)
    const off6 = off * 0.6, bs = 330 * s;
    for (let k = -1; k < W / bs + 2; k++) {
      const wx = k * bs - (off6 % bs);
      const seed = (((Math.floor((off6 + wx) / bs + 0.5) * 7919) % 97) + 97) % 97;
      const col = ['#8fe0b0', '#ffc2e0', '#c9b8ff', '#9fe6c4'][seed % 4];
      g.fillStyle = col;
      const by = y - 18 * s;
      for (const [dx, r] of [[-34, 30], [0, 42], [36, 32]]) { g.beginPath(); g.arc(wx + dx * s, by - r * 0.6 * s, r * s, Math.PI, 0); g.fill(); }
      if (seed % 3 === 0) { // lollipop flower
        g.fillStyle = '#fff'; g.fillRect(wx + 120 * s, by - 90 * s, 6 * s, 90 * s);
        g.fillStyle = ['#ff6fb1', '#ffd23f', '#7fd3ff'][seed % 3 === 0 ? (seed >> 2) % 3 : 0];
        g.beginPath(); g.arc(wx + 123 * s, by - 96 * s, 22 * s, 0, TAU); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 4 * s; g.beginPath(); g.arc(wx + 123 * s, by - 96 * s, 11 * s, 0, 5); g.stroke();
      }
    }
    // candy-cane fence just behind the path
    const fsx = 70 * s;
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6 * s;
    g.beginPath(); g.moveTo(0, y - 40 * s); g.lineTo(W, y - 40 * s); g.stroke();
    for (let x = -((off * 0.85) % fsx); x < W; x += fsx) {
      g.fillStyle = '#ffffff'; ui.roundRect(g, x - 5 * s, y - 56 * s, 10 * s, 50 * s, 5 * s); g.fill();
      g.fillStyle = '#ff8fc7'; g.fillRect(x - 5 * s, y - 46 * s, 10 * s, 6 * s); g.fillRect(x - 5 * s, y - 28 * s, 10 * s, 6 * s);
    }
    // path band
    g.fillStyle = '#ffe3f1';
    g.fillRect(0, y - 6 * s, W, 30 * s);
    g.fillStyle = '#8fdcae';
    g.fillRect(0, y + 22 * s, W, 14 * s);
    // scalloped grass edge
    g.fillStyle = '#a8ecc2';
    const step = 46 * s;
    for (let x = -((off) % step) - step; x < W + step; x += step) { g.beginPath(); g.arc(x, y - 6 * s, step * 0.55, Math.PI, 0); g.fill(); }
    // stripes on the path (speed lines)
    g.fillStyle = 'rgba(255,255,255,0.75)';
    const st = 180 * s;
    for (let x = -((off) % st); x < W; x += st) ui.roundRect(g, x, y + 6 * s, 70 * s, 7 * s, 3.5 * s), g.fill();
    // little flowers
    const fs = 260 * s;
    for (let k = -1; k < W / fs + 2; k++) {
      const wx = k * fs - (off % fs);
      const seed = Math.floor((off + wx) / fs + 0.5);
      const col = ['#ff8fc7', '#ffd23f', '#c9a0ff', '#7fd3ff'][((seed % 4) + 4) % 4];
      g.fillStyle = col;
      for (let pI = 0; pI < 5; pI++) { const ang = pI * TAU / 5; g.beginPath(); g.arc(wx + Math.cos(ang) * 6 * s, y - 14 * s + Math.sin(ang) * 6 * s, 5 * s, 0, TAU); g.fill(); }
      g.fillStyle = '#fff6a8'; g.beginPath(); g.arc(wx, y - 14 * s, 4 * s, 0, TAU); g.fill();
    }
  }

  // -------------------------------------------------------------- obstacles
  drawObstacle(g, ln, o, flying = false) {
    const s = this.s, gy = ln.ground;
    if (o.fly && !flying) {
      // empty grass where the bunny was
      return;
    }
    g.save();
    if (o.fly) { g.translate(o.x, gy - o.fly.z - 40 * s); g.rotate(o.fly.r); g.translate(0, 40 * s); }
    else g.translate(o.x, gy + 4 * s);
    const sq = o.sq;
    g.scale(1 + sq * 0.4, 1 - sq * 0.4);
    if (o.kind === 'bunny' && (o.awake > 0 || o.fly)) {
      if (!drawArt(g, 'prop/uj-bunny-awake', 0, 0, 150 * s, 140 * s, { anchor: 'bottom' })) drawBunny(g, s, true, o.t);
    } else {
      const key = OB_ART[o.kind];
      // the sleeping-bunny art has wide transparent margins: a bigger box (and a
      // nudge down onto the grass) makes it read like the ~90 px bunny asked for
      const box = o.kind === 'puddle' ? [200 * s, 70 * s] : o.kind === 'mushroom' ? [140 * s, 130 * s] : [180 * s, 135 * s];
      if (!drawArt(g, key, 0, o.kind === 'bunny' ? 10 * s : 0, box[0], box[1], { anchor: 'bottom' })) {
        if (o.kind === 'puddle') drawPuddle(g, 0, 0, s, o.t);
        else if (o.kind === 'mushroom') drawMushroom(g, s, o.t);
        else drawBunny(g, s, false, o.t);
      }
    }
    g.restore();
    if (o.kind === 'bunny' && !o.awake && !o.fly) {
      // floating Zz
      for (let k = 0; k < 2; k++) {
        const ph = (o.t * 0.7 + k * 0.5) % 1;
        ui.text(g, 'z', o.x + 30 * s + ph * 30 * s, gy - 80 * s - ph * 50 * s, { size: (22 + k * 8) * s, color: '#ffffff', alpha: 1 - ph, strokeWidth: 4 });
      }
    }
  }

  drawItem(g, ln, it) {
    const s = this.s;
    const k = it.got ? 1 - it.gt / 0.35 : 1;
    if (k <= 0) return;
    const y = ln.ground - it.h;
    g.save();
    let x = it.x;
    let yy = y + Math.sin(it.t * 4 + it.x * 0.01) * 6 * s;
    if (it.got) { const e = it.got; const ty = e.lane.ground - e.z - this.seatH(e) - 30 * s; x = lerp(it.x, e.x, 1 - k); yy = lerp(yy, ty, 1 - k); }
    g.translate(x, yy);
    const ps = (it.got ? 1 + (1 - k) * 0.6 : 1) + it.pulse * 1.2;
    g.scale(s * ps, s * ps);
    g.globalAlpha = k;
    if (it.kind === 'star') {
      g.rotate(Math.sin(it.t * 3) * 0.25);
      if (!drawArt(g, 'prop/uj-star', 0, 0, 74, 74)) drawStar(g, 32, it.t);
    } else if (it.kind === 'candy') {
      g.rotate(it.t * 3);
      if (!drawArt(g, 'prop/uj-candy', 0, 0, 66, 66)) drawCandy(g, it.hue);
    } else {
      // lollipop: soft glow
      const gl = g.createRadialGradient(0, -40, 6, 0, -40, 90);
      gl.addColorStop(0, 'rgba(255,246,168,0.7)'); gl.addColorStop(1, 'rgba(255,246,168,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(0, -40, 90, 0, TAU); g.fill();
      g.rotate(Math.sin(it.t * 4) * 0.15);
      if (!drawArt(g, 'prop/uj-lollipop', 0, 30, 90, 120, { anchor: 'bottom' })) drawLolly(g, it.t);
    }
    g.restore();
  }

  // ----------------------------------------------------------------- riders
  drawTrail(g, e) {
    if (e.trail <= 0 || e.hist.length < 2) return;
    const s = this.s;
    const sv = this.speed * s;
    const len = Math.min(1.6, 0.12 + e.trail * 0.11);
    const pts = [];
    for (let i = e.hist.length - 1; i >= 0; i--) {
      const h = e.hist[i], age = this.time - h.t;
      if (age > len) break;
      pts.push({ x: e.x - 50 * s - age * Math.max(sv, 200), y: h.y + Math.sin(this.time * 9 - age * 12) * 4 * s, k: 1 - age / len });
    }
    if (pts.length < 2) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const bands = RAINBOW.slice(0, 6), bw = 7 * s * (0.7 + Math.min(e.trail, 10) * 0.05);
    bands.forEach((c, bi) => {
      g.strokeStyle = c;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        g.globalAlpha = 0.9 * b.k;
        g.lineWidth = bw * (0.4 + 0.6 * b.k);
        const oy = (bi - 2.5) * bw * 0.95;
        g.beginPath(); g.moveTo(a.x, a.y + oy); g.lineTo(b.x, b.y + oy); g.stroke();
      }
    });
    g.restore();
  }

  drawRider(g, e) {
    const s = this.s, gy = e.lane.ground, a = e.a;
    // shadow + player ring
    const zs = Math.max(0.35, 1 - e.z / (400 * s));
    g.save();
    g.globalAlpha = 0.25 * zs; g.fillStyle = '#4a2a6a';
    g.beginPath(); g.ellipse(e.x, gy + 4 * s, 95 * s * zs, 16 * s * zs, 0, 0, TAU); g.fill();
    g.globalAlpha = 0.9; g.lineWidth = 5; g.strokeStyle = e.p.color;
    g.beginPath(); g.ellipse(e.x, gy + 4 * s, 100 * s, 20 * s, 0, 0, TAU); g.stroke();
    g.restore();
    if (e.quad) {
      a.draw(g, { shadow: false });
    } else {
      const stretch = clamp((a.width + 40 * s) / (190 * s), 1, 1.9);
      const jump = e.z > 8 * s;
      const my = gy - e.z + (e.land > 0 ? 4 * s : 0);
      const tilt = jump ? clamp(-e.vz / (HOP_V * s), -1, 1) * 0.12 : Math.sin(e.phase * 2) * 0.02;
      const bob = jump ? 0 : Math.abs(Math.sin(e.phase)) * 7 * s;
      // unicorn body
      g.save(); g.translate(e.x, my - bob * 0.5); g.rotate(tilt);
      g.scale(stretch, 1);
      const key = jump ? 'prop/uj-mount-jump' : 'prop/uj-mount';
      if (!drawArt(g, key, 0, 0, 300 * s, 225 * s, { anchor: 'bottom' }) && !(jump && drawArt(g, 'prop/uj-mount', 0, 0, 300 * s, 225 * s, { anchor: 'bottom' }))) {
        drawUnicorn(g, 0, 0, s, e.phase, jump, { saddle: e.p.color, wet: e.wet, stretch, coat: COATS[e.i % COATS.length] });
      }
      g.restore();
      // rider, clipped at the saddle so they sit astride
      const seatY = my - SADDLE * s + 12 * s - bob * 0.5;
      g.save();
      g.beginPath(); g.rect(0, -400, W, seatY + 400); g.clip();
      a.draw(g, { shadow: false });
      g.restore();
      // saddle blanket over the seam
      g.save(); g.translate(e.x, seatY - 2 * s); g.rotate(tilt);
      const sw = Math.max(70 * s, a.width * 0.75);
      ui.roundRect(g, -sw / 2 - 14 * s, -6 * s, sw + 10 * s, 22 * s, 10 * s);
      g.fillStyle = e.p.color; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(-sw / 2 - 6 * s, -1 * s, sw - 6 * s, 4 * s);
      g.translate(-4 * s, 6 * s); drawHeartShape(g, 14 * s, '#ffffff');
      g.restore();
    }
    if (e.wet > 0) {
      for (let k = 0; k < 3; k++) {
        const ph = (this.time * 1.6 + k / 3) % 1;
        g.save(); g.globalAlpha = (1 - ph) * Math.min(1, e.wet);
        g.fillStyle = '#7fd3ff';
        g.beginPath(); g.ellipse(e.x - 30 * s + k * 30 * s, gy - e.z - this.seatH(e) - a.height * 0.5 + ph * 60 * s, 5 * s, 8 * s, 0, 0, TAU); g.fill();
        g.restore();
      }
    }
  }
}

// ---------------------------------------------------------------- drawing kit

/** Procedural unicorn, side view facing right; origin = ground under the body. */
export function drawUnicorn(g, x, y, s, phase, jump, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const ol = () => { g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke(); };
  const [body, shade] = o.coat || COATS[0];
  const hoof = '#ff8fc7';
  // legs: gallop swing (front pair / back pair)
  const leg = (lx, ang, far) => {
    g.save(); g.translate(lx, -78); g.rotate(ang);
    g.beginPath(); ui.roundRect(g, -9, -6, 18, 74, 9);
    g.fillStyle = far ? shade : body; g.fill(); ol();
    g.beginPath(); ui.roundRect(g, -10, 58, 20, 16, 6); g.fillStyle = hoof; g.fill(); ol();
    g.restore();
  };
  const sw = jump ? 0 : Math.sin(phase);
  const fa = jump ? -0.9 : 0.55 * sw, ba = jump ? 0.9 : -0.55 * sw;
  leg(46, fa + 0.25, true); leg(-52, ba - 0.25, true);
  // tail (rainbow)
  g.save(); g.translate(-82, -112);
  const tw = jump ? 0.5 : Math.sin(phase * 0.5 + 1) * 0.2;
  RAINBOW.slice(0, 5).forEach((c, i) => {
    g.strokeStyle = c; g.lineWidth = 9;
    g.beginPath(); g.moveTo(0, i * 4);
    g.quadraticCurveTo(-40, -10 + i * 8 + tw * 30, -56 - i * 2, 40 + i * 6 + tw * 20); g.stroke();
  });
  g.restore();
  // body
  g.beginPath(); g.ellipse(0, -100, 82, 40, 0, 0, TAU); g.fillStyle = body; g.fill(); ol();
  g.beginPath(); g.ellipse(-6, -86, 60, 18, 0, 0, Math.PI); g.fillStyle = shade; g.fill();
  leg(34, -fa + 0.25, false); leg(-60, -ba - 0.25, false);
  // neck + head
  g.beginPath();
  g.moveTo(50, -126); g.quadraticCurveTo(70, -170, 86, -186); g.lineTo(118, -170); g.quadraticCurveTo(96, -140, 82, -96); g.closePath();
  g.fillStyle = body; g.fill(); ol();
  g.beginPath(); g.ellipse(108, -184, 34, 24, 0.35, 0, TAU); g.fillStyle = body; g.fill(); ol();
  // snout + nostril
  g.beginPath(); g.ellipse(132, -170, 15, 13, 0.3, 0, TAU); g.fillStyle = '#ffe0ef'; g.fill(); ol();
  g.fillStyle = NAVY; g.beginPath(); g.arc(138, -172, 2.5, 0, TAU); g.fill();
  // ear
  g.beginPath(); g.moveTo(88, -200); g.lineTo(84, -228); g.lineTo(102, -206); g.closePath(); g.fillStyle = body; g.fill(); ol();
  // horn
  g.beginPath(); g.moveTo(104, -204); g.lineTo(126, -252); g.lineTo(116, -200); g.closePath();
  const hg = g.createLinearGradient(104, -204, 126, -252); hg.addColorStop(0, '#ffd23f'); hg.addColorStop(1, '#fff6a8');
  g.fillStyle = hg; g.fill(); ol();
  g.strokeStyle = '#e8a81c'; g.lineWidth = 2;
  for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(106 + k * 4, -206 - k * 11); g.lineTo(118 + k * 2, -204 - k * 11); g.stroke(); }
  // eye
  g.fillStyle = NAVY; g.beginPath(); g.ellipse(112, -188, 6, 8, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(114, -191, 2.4, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 2.5; g.beginPath(); g.moveTo(108, -196); g.lineTo(104, -201); g.stroke();
  g.fillStyle = 'rgba(255,111,177,0.45)'; g.beginPath(); g.ellipse(118, -174, 9, 5, 0, 0, TAU); g.fill();
  // mane (rainbow curls along the neck)
  const mw = jump ? 0.6 : Math.sin(phase + 0.5) * 0.25;
  RAINBOW.slice(0, 5).forEach((c, i) => {
    g.fillStyle = c;
    const t = i / 4;
    const mx = lerp(90, 46, t) - 10 - mw * 8, my = lerp(-206, -122, t);
    g.beginPath(); g.ellipse(mx, my, 16, 12, -0.6, 0, TAU); g.fill();
  });
  // saddle blanket (a hint; the rider's blanket is drawn over it)
  if (o.saddle) {
    g.beginPath(); ui.roundRect(g, -40, -142, 70, 34, 10); g.fillStyle = o.saddle; g.fill(); ol();
    g.fillStyle = '#ffd23f'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(-30 + k * 17, -110, 3.5, 0, TAU); g.fill(); }
  }
  g.restore();
}

function gumTree(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#fff'; g.fillRect(-5, -60, 10, 60);
  g.beginPath(); g.moveTo(-40, -50); g.quadraticCurveTo(-40, -120, 0, -122); g.quadraticCurveTo(40, -120, 40, -50); g.closePath();
  g.fillStyle = color; g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-14, -96, 7, 14, 0.4, 0, TAU); g.fill();
  g.restore();
}

function drawPuddle(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.ellipse(0, -10, 96, 22, 0, 0, TAU);
  g.fillStyle = '#7fd3ff'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
  g.beginPath(); g.ellipse(0, -12, 80, 15, 0, 0, TAU); g.fillStyle = '#a9e4ff'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3;
  const r = (t * 0.8) % 1;
  g.globalAlpha = 1 - r; g.beginPath(); g.ellipse(20, -12, 18 + r * 40, 4 + r * 8, 0, 0, TAU); g.stroke();
  g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-40, -16, 16, 4, 0, 0, TAU); g.fill();
  // rubber duck
  g.save(); g.translate(-12, -18 + Math.sin(t * 3) * 2); g.rotate(Math.sin(t * 2) * 0.1);
  g.lineWidth = 3; g.strokeStyle = NAVY;
  g.beginPath(); g.ellipse(0, 0, 18, 11, 0, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.stroke();
  g.beginPath(); g.arc(12, -14, 10, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(20, -15); g.lineTo(30, -12); g.lineTo(20, -9); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = NAVY; g.beginPath(); g.arc(14, -17, 2.2, 0, TAU); g.fill();
  g.restore();
  g.restore();
}

function drawMushroom(g, s, t) {
  g.save(); g.scale(s, s);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
  // stem
  g.beginPath(); ui.roundRect(g, -24, -62, 48, 62, 16); g.fillStyle = '#fff4e0'; g.fill(); g.stroke();
  // face
  g.fillStyle = NAVY;
  g.beginPath(); g.arc(-9, -34, 3.5, 0, TAU); g.arc(9, -34, 3.5, 0, TAU); g.fill();
  g.lineWidth = 3; g.beginPath(); g.arc(0, -26, 7, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,111,177,0.5)'; g.beginPath(); g.ellipse(-16, -26, 5, 3, 0, 0, TAU); g.ellipse(16, -26, 5, 3, 0, 0, TAU); g.fill();
  // cap
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(-66, -56); g.quadraticCurveTo(-62, -128, 0, -128); g.quadraticCurveTo(62, -128, 66, -56); g.quadraticCurveTo(0, -42, -66, -56); g.closePath();
  g.fillStyle = '#ff4d6d'; g.fill(); g.stroke();
  g.fillStyle = '#fff';
  for (const [dx, dy, r] of [[-34, -84, 11], [6, -106, 13], [36, -80, 10], [-8, -72, 7], [52, -64, 6]]) { g.beginPath(); g.arc(dx, dy, r, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-30, -108, 14, 6, -0.5, 0, TAU); g.fill();
  g.restore();
}

function drawBunny(g, s, awake, t) {
  g.save(); g.scale(s, s);
  g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
  if (!awake) {
    const br = 1 + Math.sin(t * 2.4) * 0.04;
    g.save(); g.scale(br, 1 / br);
    g.beginPath(); g.ellipse(0, -30, 48, 30, 0, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    g.beginPath(); g.arc(-44, -26, 10, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(30, -42, 26, 22, 0, 0, TAU); g.fill(); g.stroke();
    // ears flopped back
    for (const k of [0, 1]) { g.beginPath(); g.ellipse(14 - k * 10, -66 + k * 4, 9, 26, -1.1 + k * 0.15, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.stroke(); g.beginPath(); g.ellipse(14 - k * 10, -66 + k * 4, 4, 17, -1.1 + k * 0.15, 0, TAU); g.fillStyle = '#ffb3d9'; g.fill(); }
    g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.arc(28, -44, 5, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    g.beginPath(); g.arc(42, -44, 5, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    g.fillStyle = '#ff8fc7'; g.beginPath(); g.arc(52, -36, 4, 0, TAU); g.fill();
    g.restore();
  } else {
    g.beginPath(); g.ellipse(0, -38, 34, 38, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -92, 28, 24, 0, 0, TAU); g.fill(); g.stroke();
    for (const sx of [-1, 1]) {
      g.beginPath(); g.ellipse(sx * 12, -136, 9, 28, sx * 0.2, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(sx * 12, -136, 4, 19, sx * 0.2, 0, TAU); g.fillStyle = '#ffb3d9'; g.fill();
    }
    g.fillStyle = NAVY; g.beginPath(); g.arc(-10, -96, 5, 0, TAU); g.arc(10, -96, 5, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-8, -98, 1.8, 0, TAU); g.arc(12, -98, 1.8, 0, TAU); g.fill();
    g.fillStyle = '#ff8fc7'; g.beginPath(); g.arc(0, -86, 4, 0, TAU); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -78, 5, 4, 0, 0, TAU); g.stroke();
    // waving paw
    g.save(); g.translate(28, -56); g.rotate(-0.8 + Math.sin(t * 12) * 0.4);
    g.beginPath(); g.ellipse(0, -14, 8, 16, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 4; g.stroke();
    g.restore();
  }
  g.restore();
}

function drawStar(g, r, t) {
  const gl = g.createRadialGradient(0, 0, 4, 0, 0, r * 1.8);
  gl.addColorStop(0, 'rgba(255,240,150,0.6)'); gl.addColorStop(1, 'rgba(255,240,150,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 1.8, 0, TAU); g.fill();
  drawStarShape(g, r * 2, '#ffd23f');
  g.fillStyle = NAVY;
  g.beginPath(); g.arc(-r * 0.22, -r * 0.06, r * 0.08, 0, TAU); g.arc(r * 0.22, -r * 0.06, r * 0.08, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = 2; g.beginPath(); g.arc(0, r * 0.08, r * 0.15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
}

function drawCandy(g, hue) {
  g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round';
  const wrap = ['#ff8fc7', '#7fd3ff', '#c9a0ff', '#8be8b8'][hue % 4];
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 20, 0); g.lineTo(sx * 38, -14); g.lineTo(sx * 38, 14); g.closePath(); g.fillStyle = wrap; g.fill(); g.stroke(); }
  g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.clip();
  RAINBOW.slice(0, 6).forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 24, i * TAU / 6, (i + 0.5) * TAU / 6); g.closePath(); g.fill(); });
  g.restore();
  g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-8, -9, 6, 3.5, -0.6, 0, TAU); g.fill();
}

function drawLolly(g, t) {
  g.lineWidth = 4; g.strokeStyle = NAVY;
  g.fillStyle = '#fff'; g.beginPath(); ui.roundRect(g, -5, -20, 10, 50, 5); g.fill(); g.stroke();
  g.save(); g.translate(0, -50); g.rotate(t * 2);
  g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.clip();
  g.lineWidth = 10;
  RAINBOW.forEach((c, i) => { g.strokeStyle = c; g.beginPath(); for (let a = 0; a < 7; a += 0.2) { const r = a * 6; g.lineTo(Math.cos(a + i * 0.9) * r, Math.sin(a + i * 0.9) * r); } g.stroke(); });
  g.restore();
  g.lineWidth = 4; g.strokeStyle = NAVY; g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.stroke();
  g.restore();
  g.save(); g.translate(0, -14); g.fillStyle = '#ff6fb1';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-16, -8); g.lineTo(-16, 8); g.closePath(); g.moveTo(0, 0); g.lineTo(16, -8); g.lineTo(16, 8); g.closePath(); g.fill();
  g.restore();
  g.save(); g.translate(26, -82); g.globalAlpha = (Math.sin(t * 5) + 1) / 2; drawSparkleShape(g, 18, '#ffffff'); g.restore();
}
