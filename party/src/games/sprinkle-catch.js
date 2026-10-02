// Sprinkle Catch - a giant floating birthday cake rains treats; run, jump and
// catch the most. Golden cupcakes are worth 5, grumpy broccoli bonks you.
//
// Art hooks (all optional, procedural fallbacks ship today):
//   bg/sprinkle-catch  prop/giant-cake  prop/treat-sprinkle  prop/treat-cupcake
//   prop/treat-golden  prop/treat-broccoli
// New-pose hooks (fall back to existing poses): 'catch' -> cheer
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime, Brain, steer } from '../engine/ai.js';
import { drawSparkleShape } from '../engine/emotes.js';
import { clamp, approach, rand, randInt, pick, chance, TAU } from '../engine/util.js';

export const meta = {
  id: 'sprinkle-catch',
  title: 'Sprinkle Catch',
  category: 'party',
  type: 'Free-for-all',
  goal: 'Catch the most treats from the giant cake!',
  controls: [['stick', 'Run left and right'], ['a', 'Jump']],
  tips: ['Golden cupcakes are worth 5 - listen for the chime!', 'Grumpy broccoli makes you dizzy. Jump over it!', 'Sugar Rush at the end: treats rain twice as fast!'],
  music: 'party',
  duration: '40 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = w / 400;
    g.translate(x, y); g.scale(s, s);
    const hh = h / s;
    const grd = g.createLinearGradient(0, 0, 0, hh);
    grd.addColorStop(0, '#9fdcff'); grd.addColorStop(1, '#ffe3f2');
    g.fillStyle = grd; g.fillRect(0, 0, 400, hh);
    ui.cloud(g, 60, hh * 0.2, 0.45, '#fff', 0.9);
    ui.cloud(g, 340, hh * 0.28, 0.4, '#fff', 0.9);
    g.fillStyle = '#ff9ccf'; g.fillRect(0, hh * 0.84, 400, hh * 0.2);
    g.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(i * 52 + 10, hh * 0.84, 14, Math.PI, 0); g.fill(); }
    drawCake(g, 200, hh * 0.5, 0.31, 0, 0, t || 0, false);
    // falling treats
    const tt = (t || 0) * 1.2;
    for (let i = 0; i < 5; i++) {
      const ty = hh * 0.5 + ((tt + i * 0.37) % 1) * hh * 0.3;
      const tx = 130 + i * 35 + Math.sin(tt + i) * 6;
      g.save(); g.translate(tx, ty); g.scale(0.6, 0.6);
      if (i === 2) drawCupcake(g, true, 0, '#ffe066', t || 0); else if (i % 2) drawCupcake(g, false, i, '#ff8fc7', t || 0); else drawSprinkle(g, i);
      g.restore();
    }
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 40;
const RUSH_AT = 10;
const GROUND_Y = 905;       // where treats land / feet baseline
const GRAV = 600;
const BOUNCE_V = 560;
const MAX_SPEED = 560;
const JUMP_V = 900, JUMP_G = 2300;
const SOLO_GOAL = 30;
const VALUE = { sprinkle: 1, cupcake: 2, golden: 5 };
const WRAPPERS = ['#ff8fc7', '#7fd3ff', '#8be8b8', '#c9a0ff'];

const NEW_POSE_FALLBACK = { catch: 'cheer' };
const poseName = (n) => (POSE_NAMES.includes(n) ? n : NEW_POSE_FALLBACK[n] || 'idle');

let treatSerial = 0;

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.timeLeft = DURATION;
    this.scale = n <= 3 ? 1.0 : n <= 4 ? 0.92 : n <= 6 ? 0.82 : 0.72;
    this.treats = [];
    this.beams = [];
    this.spawnT = 0.5;
    this.goldenT = rand(6, 9);
    this.showerT = rand(5, 8);
    this.showerLeft = 0; this.showerGap = 0;
    this.cake = { x: W / 2, vx: 0, sq: 0, mouth: 0, blink: 0 };
    this.rush = false; this.rushT = 0;
    this.done = false;
    this.ents = this.players.map((p, i) => {
      const a = new Actor(p.charId, { scale: this.scale, x: 0, y: GROUND_Y });
      const x = n === 1 ? W / 2 : 260 + ((W - 520) * i) / (n - 1);
      const lane = ((i % 3) - 1) * 16;
      a.x = x; a.y = GROUND_Y + lane; a.facing = x < W / 2 ? 1 : -1; a.snap();
      return {
        p, a, i, x, vx: 0, pv: 0, z: 0, vz: 0, score: 0, stun: 0, inv: 0, streak: 0, streakT: 0, lane,
        brain: new Brain(p), target: null, err: 0, wander: 0, wanderX: x, dodge: new Map(), bumpCd: 0, lastLand: 0,
      };
    });
    this.sparkles = Array.from({ length: 26 }, () => ({ x: rand(W), y: rand(H), p: rand(TAU), s: rand(0.5, 1) }));
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    this.updateCake(dt);
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    if (!this.started) { this.started = true; this.startT = this.t - dt; }
    this.timeLeft = Math.max(0, DURATION - (this.t - this.startT));
    if (!this.rush && this.timeLeft <= RUSH_AT && !this.done) this.startRush();
    if (this.rush) this.rushT += dt;

    this.updateCake(dt);
    if (!this.done) this.spawning(dt);
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.pushPlayers(dt);
    this.updateTreats(dt);
    for (const e of this.ents) {
      e.a.x = e.x; e.a.z = e.z;
      e.a.update(dt);
    }
    for (const b of this.beams) b.t += dt;
    this.beams = this.beams.filter((b) => b.t < 1.2);

    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    this.updateCake(dt);
    for (const e of this.ents) { e.a.update(dt); }
    this.updateTreats(dt);
  }

  startRush() {
    this.rush = true; this.rushT = 0;
    sfx('whistle'); sfx('magic'); fx.flash('#ff9ad5', 0.25); fx.shake(8, 0.3);
    particles.confettiRain(W, 90);
  }

  updateCake(dt) {
    const c = this.cake;
    const prev = c.x;
    const spd = this.rush ? 0.95 : 0.6;
    c.x = W / 2 + Math.sin(this.t * spd + 0.4) * (W * 0.34) + Math.sin(this.t * spd * 2.3) * 60;
    c.vx = (c.x - prev) / Math.max(dt, 1e-3);
    c.sq = approach(c.sq, 0, dt * 0.8);
    c.mouth = Math.max(0, c.mouth - dt);
  }

  spawning(dt) {
    const n = this.n;
    let interval = clamp(1 / (0.55 + 0.42 * n), 0.27, 0.85);
    if (this.rush) interval *= 0.5;
    // a shower of sprinkles now and then
    this.showerT -= dt;
    if (this.showerT <= 0 && this.showerLeft <= 0) { this.showerLeft = randInt(4, 6); this.showerT = rand(7, 10); this.showerGap = 0; }
    if (this.showerLeft > 0) {
      this.showerGap -= dt;
      if (this.showerGap <= 0) { this.spawnTreat('sprinkle', { fan: (this.showerLeft - 3) * 0.12 }); this.showerLeft--; this.showerGap = 0.1; }
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = interval * rand(0.7, 1.3);
      const r = Math.random();
      const broc = this.t - this.startT > 3 && r < 0.14;
      this.spawnTreat(broc ? 'broc' : r < 0.6 ? 'sprinkle' : 'cupcake');
    }
    this.goldenT -= dt;
    if (this.goldenT <= 0) { this.goldenT = this.rush ? rand(3.5, 5) : rand(8, 11); this.spawnTreat('golden'); }
  }

  spawnTreat(kind, o = {}) {
    const c = this.cake;
    const x = clamp(c.x + rand(-140, 140), 60, W - 60);
    const y = 395;
    const t = {
      id: treatSerial++, kind, x, y, vx: clamp(c.vx * 0.35, -120, 120) + rand(-50, 50) + (o.fan || 0) * 380, vy: rand(20, 140),
      term: kind === 'golden' ? 330 : kind === 'cupcake' ? 400 : kind === 'broc' ? 470 : 440,
      r: kind === 'sprinkle' ? 26 : kind === 'cupcake' ? 32 : kind === 'golden' ? 38 : 38,
      age: 0, state: 'fall', bounces: 0, life: 0, rot: rand(TAU), spin: rand(-4, 4), hue: pick(WRAPPERS), grace: 0.15,
      sq: 0, sway: rand(TAU),
    };
    if (kind === 'sprinkle' || kind === 'cupcake') t.bounces = chance(0.5) ? randInt(1, 2) : 0;
    if (kind === 'golden') { t.bounces = 1; t.vx *= 0.4; }
    this.treats.push(t);
    c.sq = 0.1; c.mouth = 0.25;
    particles.burst(x, y - 10, { type: 'dust', count: 3, color: '#fff', speed: [20, 80], size: [8, 14] });
    if (kind === 'golden') {
      sfx('note', { midi: 88, dur: 0.5, vol: 0.28 }); setTimeout(() => sfx('note', { midi: 95, dur: 0.6, vol: 0.22 }), 110);
      sfx('sparkle');
      this.beams.push({ x, t: 0 });
      particles.popText(x, y + 30, 'Golden cupcake!', '#ffd23f', 44);
      c.mouth = 0.8;
    }
    return t;
  }

  bodyW(e) { return clamp(e.a.height * 0.28 + 38 * this.scale, 52, 86); }
  reach(e) { return e.a.height * 0.6 + 82 * this.scale; }

  movePlayer(e, dt) {
    const p = e.p, a = e.a, ctrl = p.ctrl;
    e.stun = Math.max(0, e.stun - dt); e.inv = Math.max(0, e.inv - dt);
    e.streakT = Math.max(0, e.streakT - dt); e.bumpCd = Math.max(0, e.bumpCd - dt);
    const stunned = e.stun > 0;
    const inX = this.done ? 0 : ctrl.x;
    const target = inX * MAX_SPEED * (stunned ? 0.25 : 1);
    e.vx = approach(e.vx, target, (Math.abs(target) > Math.abs(e.vx) || Math.sign(target) !== Math.sign(e.vx) ? 5400 : 3600) * dt);
    e.pv *= Math.exp(-7 * dt);
    e.x = clamp(e.x + (e.vx + e.pv) * dt, 70, W - 70);
    if (!this.done && ctrl.pressed('a') && e.z <= 0.5 && !stunned) {
      e.vz = JUMP_V; sfx('jump'); a.squash(-0.2);
      particles.burst(e.x, a.y, { type: 'dust', count: 4, color: '#fff', speed: [30, 90], size: [8, 14] });
    }
    if (e.z > 0 || e.vz > 0) {
      e.vz -= JUMP_G * dt; e.z += e.vz * dt;
      if (e.z <= 0) { e.z = 0; e.vz = 0; a.squash(0.3); sfx('land'); a.playOnce(poseName('land'), 0.15); particles.burst(e.x, a.y, { type: 'dust', count: 5, color: '#fff', speed: [40, 110], size: [8, 16] }); }
    }
    if (!stunned && e.stun === 0 && a.pose === 'dizzy' && !a._once) a.setPose('idle');
    if (stunned) { if (a.pose !== 'dizzy' && !a._once) a.setPose('dizzy'); }
    else if (e.z > 1) { if (!a._once) a.setPose(e.vz > 0 ? 'jump' : 'fall'); if (Math.abs(e.vx) > 20) a.facing = e.vx > 0 ? 1 : -1; }
    else a.moveAnim(e.vx, 0, MAX_SPEED, { run: Math.abs(e.vx) > 380 });
    if (this.done && !a._once && a.pose !== 'celebrate' && a.pose !== 'pout') a.setPose('idle');
  }

  pushPlayers(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const sep = (A.a.height + B.a.height) * 0.2 + 18;
      const dx = B.x - A.x, adx = Math.abs(dx);
      if (adx < sep && Math.abs(A.z - B.z) < 110) {
        const dir = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx);
        const ov = sep - adx;
        const k = Math.min(1, dt * 14);
        A.x -= dir * ov * 0.5 * k; B.x += dir * ov * 0.5 * k;
        A.pv -= dir * ov * 2.2 * dt * 10 * 0.1; B.pv += dir * ov * 2.2 * dt * 10 * 0.1;
        if (ov > sep * 0.45 && A.bumpCd <= 0 && B.bumpCd <= 0 && (Math.abs(A.vx) + Math.abs(B.vx)) > 300) {
          A.bumpCd = B.bumpCd = 0.5;
          A.a.squash(0.2); B.a.squash(0.2);
          sfx('bonk'); particles.burst((A.x + B.x) / 2, A.a.y - A.a.height * 0.5, { type: 'spark', count: 6, color: '#fff' });
        }
      }
    }
    for (const e of E) e.x = clamp(e.x, 70, W - 70);
  }

  // ------------------------------------------------------------------ treats
  updateTreats(dt) {
    for (const t of this.treats) {
      t.age += dt; t.rot += t.spin * dt; t.sq = approach(t.sq, 0, dt * 3); t.grace -= dt;
      if (t.state === 'caught') {
        t.ct += dt;
        const h = t.by.a.anchor('hand');
        const k = clamp(t.ct / 0.14, 0, 1);
        t.x += (h.x - t.x) * Math.min(1, dt * 24); t.y += (h.y - t.y) * Math.min(1, dt * 24);
        if (k >= 1) t.state = 'dead';
        continue;
      }
      if (t.state === 'ground') {
        t.life -= dt;
        if (t.kind === 'broc') {
          t.x += t.vx * dt; t.hop += dt;
          const ph = (t.hop * 2.6) % 1;
          t.yo = -Math.abs(Math.sin(ph * Math.PI)) * 34;
          if (t.x < 50 || t.x > W - 50) t.vx = -t.vx;
        }
        if (t.life <= 0) {
          t.state = 'dead';
          particles.burst(t.x, GROUND_Y - 10, { type: t.kind === 'broc' ? 'shard' : 'sparkle', count: 5, colors: t.kind === 'broc' ? ['#4fb85a', '#2e8b3e'] : ['#ffffff', '#ffe066'], size: [8, 14] });
        }
        continue;
      }
      // falling / bouncing
      t.vy = Math.min(t.vy + GRAV * dt, t.term);
      t.x += t.vx * dt; t.y += t.vy * dt;
      t.vx *= Math.exp(-0.15 * dt);
      if (t.x < 40) { t.x = 40; t.vx = Math.abs(t.vx); } else if (t.x > W - 40) { t.x = W - 40; t.vx = -Math.abs(t.vx); }
      if (t.y >= GROUND_Y && t.vy > 0) {
        t.y = GROUND_Y;
        if (t.kind === 'broc') {
          t.state = 'ground'; t.life = 2.8; t.hop = 0; t.yo = 0; t.vx = (chance(0.5) ? 1 : -1) * rand(150, 230); t.vy = 0;
          particles.burst(t.x, GROUND_Y, { type: 'dust', count: 6, color: '#fff', speed: [60, 160], size: [10, 18] });
          sfx('stomp');
        } else if (t.bounces > 0) {
          t.vy = -BOUNCE_V * (t.bounces > 1 ? 1 : 0.78); t.bounces--; t.sq = 0.3;
          particles.burst(t.x, GROUND_Y, { type: 'dust', count: 3, color: '#fff', speed: [30, 90], size: [8, 14] });
        } else {
          t.state = 'ground'; t.life = t.kind === 'golden' ? 2 : 1.1; t.vy = 0; t.vx *= 0.1; t.sq = 0.4;
          particles.burst(t.x, GROUND_Y, { type: 'dust', count: 3, color: '#fff', speed: [30, 90], size: [8, 14] });
        }
      }
      if (t.kind === 'golden' && Math.random() < dt * 14) particles.burst(t.x, t.y, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffd23f'], speed: [10, 50], size: [10, 18] });
    }
    // catching / bonking
    for (const t of this.treats) {
      if (t.state === 'caught' || t.state === 'dead' || t.grace > 0 || this.done) continue;
      if (t.kind === 'broc') this.checkBroc(t); else this.checkCatch(t);
    }
    this.treats = this.treats.filter((t) => t.state !== 'dead');
  }

  checkCatch(t) {
    let best = null, bd = 1e9;
    for (const e of this.ents) {
      if (e.stun > 0) continue;
      const feet = e.a.y - e.z, H_ = this.reach(e);
      const dx = Math.abs(t.x - e.x);
      if (dx < this.bodyW(e) + t.r * 0.6 && t.y > feet - H_ * 1.02 - t.r * 0.3 && t.y < feet + 30 && dx < bd) { best = e; bd = dx; }
    }
    if (!best) return;
    this.collect(best, t);
  }

  collect(e, t) {
    const val = VALUE[t.kind];
    e.score += val;
    e.streak = e.streakT > 0 ? e.streak + 1 : 1; e.streakT = 1.6;
    t.state = 'caught'; t.ct = 0; t.by = e;
    const a = e.a, top = a.y - a.z - a.height;
    a.playOnce(poseName('catch'), t.kind === 'golden' ? 0.7 : 0.45); a.squash(0.25);
    const col = t.kind === 'golden' ? '#ffd23f' : t.kind === 'cupcake' ? '#ff6fb1' : '#ffffff';
    particles.popText(e.x, top - 10, '+' + val, col, t.kind === 'golden' ? 72 : 52);
    if (t.kind === 'golden') {
      sfx('star'); sfx('sparkle'); voice(e.p.charId, 'yay');
      particles.burst(e.x, top + a.height * 0.4, { type: 'star', count: 14, colors: ['#ffd23f', '#fff6a8', '#fff'] });
      fx.flash('#fff3b0', 0.12); fx.shake(5, 0.18);
      a.emote('sparkle', 1.2);
    } else {
      sfx('collect', { step: Math.min(e.streak - 1, 14) });
      particles.burst(t.x, t.y, { type: 'spark', count: 6, colors: RAINBOW, speed: [120, 260] });
      if (t.kind === 'cupcake') a.emote('star', 0.6);
    }
    if (e.streak === 3 || e.streak === 5 || e.streak === 8 || e.streak === 12) {
      particles.popText(e.x + 70, top + 30, `x${e.streak}!`, '#6fe3b4', 38);
      if (!e.p.isAI) e.p.ctrl.rumble(0.3, 90);
    }
  }

  checkBroc(t) {
    for (const e of this.ents) {
      if (e.inv > 0 || e.stun > 0) continue;
      const feet = e.a.y - e.z, H_ = this.reach(e) * 0.9;
      const dx = Math.abs(t.x - e.x);
      const bw = this.bodyW(e) * 0.8 + t.r * 0.5;
      if (t.state === 'fall') {
        if (dx < bw && t.y > feet - H_ * 1.0 && t.y < feet + 20) { this.bonk(e, t); return; }
      } else if (dx < bw && e.z < 55) { this.bonk(e, t); return; }
    }
  }

  bonk(e, t) {
    t.state = 'dead';
    const a = e.a;
    particles.burst(t.x, t.y, { type: 'shard', count: 10, colors: ['#4fb85a', '#2e8b3e', '#8be08f'] });
    particles.burst(e.x, a.y - a.z - a.height, { type: 'star', count: 6, colors: ['#ffd23f'] });
    e.stun = 1.1; e.inv = 2.2; e.streak = 0; e.vx = 0; e.pv = 0;
    const lose = Math.min(2, e.score);
    e.score -= lose;
    sfx('bonk'); sfx('stun'); voice(e.p.charId, 'ouch'); fx.shake(9, 0.22);
    if (!e.p.isAI) e.p.ctrl.rumble(0.8, 220);
    a.playOnce('hurt', 0.35, 'dizzy'); a.squash(0.35);
    particles.popText(e.x, a.y - a.z - a.height - 10, lose ? '-' + lose : 'Bonk!', '#ff4d6d', 56);
    for (let k = 0; k < lose; k++) {
      const s = this.spawnTreat('sprinkle');
      s.x = e.x; s.y = a.y - a.height * 0.9; s.vx = rand(-280, 280); s.vy = -rand(420, 640); s.grace = 0.55; s.bounces = 0;
      this.cake.sq = 0;
    }
  }

  // ---------------------------------------------------------------------- AI
  predict(t, targetY) {
    if (t.state === 'ground') return { x: t.x, T: Math.min(t.life, 1) };
    let x = t.x, y = t.y, vx = t.vx, vy = t.vy, b = t.bounces, T = 0;
    while (T < 2.8) {
      vy = Math.min(vy + GRAV * 0.04, t.term); x += vx * 0.04; y += vy * 0.04; T += 0.04;
      if (y >= targetY && vy > 0) return { x, T };
      if (y >= GROUND_Y) { if (b > 0) { vy = -BOUNCE_V; b--; y = GROUND_Y - 1; } else return { x, T }; }
    }
    return { x, T };
  }

  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl, a = e.a;
    if (e.stun > 0) { ctrl.move(0, 0); return; }
    const skill = clamp(1 - prof.mistake * 2.4, 0.3, 0.97);
    const midY = e.a.y - this.reach(e) * 0.55;
    const maxV = MAX_SPEED * prof.speed;

    if (e.brain.ready(dt)) {
      // notice broccoli, choose a treat to chase
      for (const t of this.treats) if (t.kind === 'broc' && !e.dodge.has(t.id)) e.dodge.set(t.id, chance(skill));
      if (e.dodge.size > 40) for (const k of e.dodge.keys()) { if (!this.treats.some((t) => t.id === k)) e.dodge.delete(k); }
      let best = null, bu = -1;
      const cands = [];
      for (const t of this.treats) {
        if (t.kind === 'broc' || t.state === 'caught' || t.state === 'dead') continue;
        const pr = this.predict(t, midY);
        const travel = Math.abs(pr.x - e.x) / maxV;
        if (travel > pr.T + 0.1) continue;
        cands.push(t);
        let u = VALUE[t.kind] / (0.45 + travel) * rand(0.85, 1.15);
        const mine = Math.abs(pr.x - e.x);
        for (const o of this.ents) if (o !== e && o.stun <= 0 && mine > 90 && Math.abs(pr.x - o.x) < mine * 0.7) { u *= 0.35; break; }
        if (u > bu) { bu = u; best = t; }
      }
      if (cands.length && chance(prof.mistake)) best = pick(cands);   // distracted: any treat
      if (chance(prof.mistake * 0.8) || !best) {
        e.wander = rand(0.5, 1.0); e.wanderX = clamp(e.x + rand(-300, 300), 100, W - 100); e.target = null;
      } else { e.target = best; e.err = rand(-1, 1) * prof.aimError * 110; e.wander = 0; }
      e.brain.wait(reactionTime(p));
    }

    // dodging broccoli takes priority
    let dodgeX = null, jump = false;
    for (const t of this.treats) {
      if (t.kind !== 'broc' || t.state === 'dead' || !e.dodge.get(t.id)) continue;
      if (t.state === 'fall') {
        const pr = this.predict(t, e.a.y - a.height * 0.5);
        if (pr.T < 1.2 && Math.abs(pr.x - e.x) < 120) dodgeX = e.x + (e.x >= pr.x ? 1 : -1) * 190;
      } else {
        const d = t.x - e.x;
        if (Math.abs(d) < 130 && e.z <= 1 && ((d > 0) === (t.vx < 0) || Math.abs(d) < 60)) jump = true;
        else if (Math.abs(d) < 190) dodgeX = e.x - Math.sign(d || 1) * 150;
      }
    }
    if (jump) { ctrl.press('a'); }

    let tx = null;
    if (dodgeX !== null) tx = dodgeX;
    else if (e.wander > 0) { e.wander -= dt; tx = e.wanderX; }
    else if (e.target && e.target.state !== 'dead' && e.target.state !== 'caught') {
      const pr = this.predict(e.target, midY);
      tx = pr.x + e.err;
    } else if (e.target) e.target = null;
    if (tx === null) { ctrl.move(0, 0); return; }
    tx = clamp(tx, 90, W - 90);
    // hop to snag a bouncing treat above the head
    const tt = e.target;
    if (tt && tt.state === 'fall' && tt.vy < 0 && e.z <= 1 && Math.abs(tt.x - e.x) < 70 && tt.y < e.a.y - a.height * 1.05 && tt.y > e.a.y - a.height - 190 && !chance(prof.mistake * 0.5)) ctrl.press('a');
    const d = steer(p, e.x, 0, tx, 0, { arrive: 55, wobble: false });
    if (d < 10) ctrl.move(0, 0);
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    const scores = this.ents.map((e) => e.score);
    let placements;
    if (this.n === 1) placements = [scores[0] >= SOLO_GOAL ? 1 : 2];
    else placements = scores.map((s) => 1 + scores.filter((o) => o > s).length);
    const top = Math.max(...scores);
    this.ents.forEach((e, i) => {
      e.a.clearEmotes();
      if (this.n === 1 ? scores[0] >= SOLO_GOAL : scores[i] === top) e.a.setPose('celebrate'); else if (this.n > 1 && placements[i] === Math.max(...placements) && placements[i] > 1) e.a.setPose('pout'); else e.a.setPose('idle');
    });
    this.api.finish({ placements, stats: scores.map((s) => `${s} pts`) });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    this.drawBackground(g);
    this.drawBeams(g);
    this.drawCakeBig(g);
    // far treats (falling) behind actors, caught ones in front
    const order = this.ents.slice().sort((a, b) => a.a.y - b.a.y);
    for (const t of this.treats) if (t.state !== 'caught') this.drawTreatWorld(g, t);
    for (const e of order) {
      const a = e.a;
      g.save();
      if (e.inv > 0 && e.stun <= 0 && Math.floor(this.t * 14) % 2 === 0) g.globalAlpha = 0.55;
      a.draw(g, { ring: e.p.color });
      g.restore();
    }
    for (const t of this.treats) if (t.state === 'caught') this.drawTreatWorld(g, t);
    for (const e of order) {
      const a = e.a;
      const top = a.y - a.z - a.height - 24 - (a.emotes.length ? 52 : 0);
      ui.playerTag(g, e.p, e.x, top);
    }
    this.drawHud(g);
  }

  drawHud(g) {
    ui.timer(g, this.timeLeft);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 985, format: (v) => String(v), out: null });
    if (this.n === 1) ui.text(g, `Goal: ${SOLO_GOAL} treats`, 190, 64, { size: 42, color: '#ffd23f' });
    if (this.rush) {
      const pulse = 1 + Math.sin(this.t * 9) * 0.06;
      g.save(); g.translate(W / 2, 150); g.scale(pulse, pulse);
      ui.text(g, 'SUGAR RUSH x2', 0, 0, { size: 46, color: '#ff6fb1', weight: 800 });
      g.restore();
      if (this.rushT < 2.4) {
        g.save(); g.globalAlpha = clamp(2.4 - this.rushT, 0, 1);
        ui.banner(g, 'Sugar Rush!', this.rushT, { y: 520, size: 160, color: '#ff6fb1' });
        g.restore();
      }
    }
  }

  drawBeams(g) {
    for (const b of this.beams) {
      const k = 1 - b.t / 1.2;
      g.save(); g.globalAlpha = k * 0.45;
      const gr = g.createLinearGradient(0, 380, 0, GROUND_Y);
      gr.addColorStop(0, 'rgba(255,230,120,0.9)'); gr.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = gr; g.fillRect(b.x - 55, 380, 110, GROUND_Y - 380);
      g.restore();
    }
  }

  drawTreatWorld(g, t) {
    g.save();
    const yo = t.yo || 0;
    g.translate(t.x, t.y + yo);
    const sq = t.sq;
    g.scale(1 + sq * 0.5, 1 - sq * 0.5);
    // soft ground shadow
    if (t.state !== 'caught') {
      g.save(); g.setTransform(g.getTransform()); g.restore();
    }
    const rot = t.kind === 'broc' ? Math.sin(t.age * 9) * 0.18 : t.kind === 'sprinkle' ? t.rot : Math.sin(t.age * 5 + t.sway) * 0.2;
    g.rotate(rot);
    const key = 'prop/treat-' + (t.kind === 'broc' ? 'broccoli' : t.kind);
    if (!drawArt(g, key, 0, 0, t.r * 2.8, t.r * 2.8)) {
      if (t.kind === 'sprinkle') drawSprinkle(g, t.id);
      else if (t.kind === 'cupcake') drawCupcake(g, false, t.id, t.hue, t.age);
      else if (t.kind === 'golden') drawCupcake(g, true, t.id, '#ffe066', t.age);
      else drawBroccoli(g, t.age, t.state === 'ground');
    }
    g.restore();
    if (t.state === 'fall' || t.state === 'ground') {
      g.save(); g.globalAlpha = 0.18 + (t.state === 'fall' ? 0.12 * clamp((t.y - 400) / 500, 0, 1) : 0);
      g.fillStyle = '#4a2a6a';
      g.beginPath(); g.ellipse(t.x, GROUND_Y + 22, t.r * (0.5 + clamp((t.y - 400) / 700, 0, 1) * 0.5), t.r * 0.16, 0, 0, TAU); g.fill();
      g.restore();
    }
  }

  drawCakeBig(g) {
    const c = this.cake;
    // candy cloud under the cake
    const y = 372;
    ui.cloud(g, c.x - 6, y + 24, 2.1, '#ffffff', 0.95);
    const wob = Math.sin(this.t * 3) * 0.02 + (this.rush ? Math.sin(this.t * 22) * 0.015 : 0);
    if (!drawArt(g, 'prop/giant-cake', c.x, y + 10, 520, 420, { anchor: 'bottom' })) {
      drawCake(g, c.x, y, 0.8, c.sq, c.mouth, this.t, this.rush, wob);
    }
  }

  drawBackground(g) {
    const bg = art('bg/sprinkle-catch');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return this.drawRushTint(g); }
    ui.sky(g, '#8fd6ff', '#ffe3f2', 900);
    // sun
    g.save(); g.translate(1650, 180);
    g.globalAlpha = 0.35; g.fillStyle = '#fff6a8';
    for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(80, -14); g.lineTo(220 + Math.sin(this.t + i) * 10, 0); g.lineTo(80, 14); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(0, 0, 80, 0, TAU); g.fill();
    g.restore();
    // rainbow
    g.save(); g.globalAlpha = 0.45; g.lineWidth = 26;
    ['#ff6f91', '#ffb86f', '#ffe66f', '#8be8b8', '#7fd3ff', '#c9a0ff'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(520, 860, 640 - i * 26, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); });
    g.restore();
    // drifting clouds
    for (let i = 0; i < 6; i++) ui.cloud(g, ((i * 410 + this.t * (14 + i * 3)) % (W + 500)) - 250, 150 + (i % 3) * 120 + Math.sin(this.t * 0.4 + i) * 8, 0.8 + (i % 2) * 0.3, '#fff', 0.85);
    // candy hills
    ui.hills(g, 700, '#ffc2e0', 36, 0.0032, 1);
    for (let i = 0; i < 7; i++) drawGumdrop(g, 120 + i * 290 + (i % 2) * 60, 735 + (i % 3) * 8, 38 + (i % 3) * 8, ['#ff8fc7', '#8be8b8', '#c9a0ff', '#ffe066'][i % 4]);
    ui.hills(g, 790, '#c4efd0', 30, 0.0041, 2.5);
    for (let i = 0; i < 6; i++) drawLollipop(g, 200 + i * 330 + (i % 2) * 90, 830 + (i % 2) * 6, 1 - (i % 3) * 0.12, ['#ff6fb1', '#7fd3ff', '#ffb03f', '#b58cff'][i % 4]);
    // ground strip: frosting
    g.fillStyle = '#ff9ccf'; g.fillRect(0, 872, W, H - 872);
    g.fillStyle = '#ffb5dc'; g.fillRect(0, 872, W, 22);
    g.fillStyle = '#fff6fb';
    for (let x = -20; x < W + 40; x += 56) { g.beginPath(); g.arc(x + 28, 872, 30, Math.PI, 0); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.0)';
    for (let i = 0; i < 70; i++) {
      const sx = (i * 197) % W, sy = 930 + ((i * 89) % 140);
      g.save(); g.translate(sx, sy); g.rotate(i * 1.3); g.fillStyle = ['#fff', '#ffe066', '#7fd3ff', '#8be8b8', '#c9a0ff'][i % 5];
      ui.roundRect(g, -10, -4, 20, 8, 4); g.fill(); g.restore();
    }
    g.fillStyle = '#e57fb7'; g.fillRect(0, 900, W, 4);
    this.drawRushTint(g);
    // sparkles in the air
    g.save();
    for (const s of this.sparkles) {
      const a = 0.5 + 0.5 * Math.sin(this.t * 2 + s.p);
      g.globalAlpha = a * 0.5; g.save(); g.translate(s.x, (s.y + this.t * 12) % 860); drawSparkleShape(g, 20 * s.s, '#ffffff'); g.restore();
    }
    g.restore();
  }

  drawRushTint(g) {
    if (!this.rush) return;
    g.save(); g.globalAlpha = 0.1 + 0.07 * Math.sin(this.t * 8);
    g.fillStyle = '#ff6fb1'; g.fillRect(0, 0, W, H); g.restore();
  }
}

// ---------------------------------------------------------------- drawing kit

function capsule(g, w, h, color) {
  ui.roundRect(g, -w / 2, -h / 2, w, h, h / 2);
  g.fillStyle = color; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(36,22,63,0.85)'; g.stroke();
}

function drawSprinkle(g, seed) {
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.fill();
  const cols = ['#ff4d8d', '#ffd23f', '#3fa7ff', '#36d17a', '#b58cff'];
  for (let i = 0; i < 5; i++) {
    g.save(); g.rotate(i * (TAU / 5) + 0.3 + (seed % 3) * 0.2); g.translate(10, 0); capsule(g, 20, 9, cols[(i + seed) % 5]); g.restore();
  }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
}

function drawCupcake(g, golden, seed, wrap, t) {
  if (golden) {
    const k = 0.75 + Math.sin(t * 6) * 0.15;
    const gr = g.createRadialGradient(0, 0, 8, 0, 0, 70);
    gr.addColorStop(0, `rgba(255,236,120,${0.7 * k})`); gr.addColorStop(1, 'rgba(255,236,120,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.fill();
  }
  const frost = golden ? '#ffd23f' : ['#ff9ccf', '#ffffff', '#b8f0ff', '#e6d0ff'][seed % 4];
  g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#24163f';
  // wrapper
  g.beginPath(); g.moveTo(-22, -2); g.lineTo(22, -2); g.lineTo(16, 26); g.lineTo(-16, 26); g.closePath();
  g.fillStyle = golden ? '#e8a81c' : wrap; g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3;
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 10, 0); g.lineTo(i * 8, 24); g.stroke(); }
  g.strokeStyle = '#24163f'; g.lineWidth = 3;
  // frosting tiers
  const tiers = [[26, 13, -4], [21, 12, -14], [14, 11, -23]];
  for (const [rx, ry, y] of tiers) { g.beginPath(); g.ellipse(0, y, rx, ry, 0, 0, TAU); g.fillStyle = frost; g.fill(); g.stroke(); }
  g.fillStyle = golden ? '#fff7c2' : 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-8, -26, 5, 3, -0.5, 0, TAU); g.fill();
  // cherry / star
  if (golden) { g.save(); g.translate(0, -36); drawSparkleShape(g, 26, '#ffffff'); g.restore(); }
  else { g.beginPath(); g.arc(0, -34, 7, 0, TAU); g.fillStyle = '#ff2d55'; g.fill(); g.stroke(); }
  // sprinkles
  const sc = ['#ff4d8d', '#3fa7ff', '#36d17a', '#ffd23f'];
  for (let i = 0; i < 4; i++) { g.save(); g.translate(-12 + i * 8, -2 + ((i * 7) % 5) - 8); g.rotate(i * 1.4); g.fillStyle = sc[(i + seed) % 4]; g.fillRect(-4, -1.5, 8, 3); g.restore(); }
}

function drawBroccoli(g, t, rolling) {
  g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = '#24163f';
  // stem
  g.fillStyle = '#9be37a'; ui.roundRect(g, -11, 4, 22, 28, 8); g.fill(); g.stroke();
  // florets
  g.fillStyle = '#3fb34f';
  const bumps = [[-22, -6, 17], [22, -6, 17], [-11, -22, 18], [12, -22, 18], [0, -8, 22]];
  for (const [x, y, r] of bumps) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); }
  g.beginPath(); g.arc(0, -8, 19, 0, TAU); g.fill();
  g.fillStyle = '#2a8f3b'; for (const [x, y] of [[-14, -22], [14, -24], [-24, -8]]) { g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill(); }
  // grumpy face
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(-9, -8, 7, 0, TAU); g.arc(9, -8, 7, 0, TAU); g.fill();
  g.lineWidth = 2.5; g.stroke();
  g.fillStyle = '#24163f'; g.beginPath(); g.arc(-8, -7, 3, 0, TAU); g.arc(10, -7, 3, 0, TAU); g.fill();
  g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-17, -19); g.lineTo(-4, -13); g.moveTo(17, -19); g.lineTo(4, -13); g.stroke();
  g.beginPath(); g.arc(0, 8 + Math.sin(t * 12) * 0.5, 7, Math.PI * 1.15, Math.PI * 1.85); g.lineWidth = 3.5; g.stroke();
}

function drawGumdrop(g, x, y, r, color) {
  g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(-r, -r * 1.5, 0, -r * 1.5); g.quadraticCurveTo(r, -r * 1.5, r, 0); g.closePath();
  g.fillStyle = color; g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.9, r * 0.18, r * 0.35, 0.4, 0, TAU); g.fill();
  g.restore();
}

function drawLollipop(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#fff'; g.fillRect(-5, -110, 10, 120);
  g.beginPath(); g.arc(0, -140, 52, 0, TAU); g.fillStyle = color; g.fill();
  g.lineWidth = 12; g.strokeStyle = '#fff'; g.beginPath();
  for (let a = 0; a < 14; a += 0.2) { const r = a * 3.4; g.lineTo(Math.cos(a) * r, -140 + Math.sin(a) * r); }
  g.stroke();
  g.restore();
}

/** The giant cake: origin at bottom center. squash/mouth/rush animate it. */
function drawCake(g, x, y, s, sq, mouth, t, rush, wob = 0) {
  g.save();
  g.translate(x, y); g.rotate(wob * 1.4); g.scale(s * (1 + sq * 0.6 + wob), s * (1 - sq * 0.6 - wob));
  g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#24163f';
  // bottom layer
  ui.roundRect(g, -190, -100, 380, 100, 26); g.fillStyle = '#ff9ccf'; g.fill(); g.stroke();
  // mid layer
  ui.roundRect(g, -148, -190, 296, 92, 24); g.fillStyle = '#c9a0ff'; g.fill(); g.stroke();
  // top layer
  ui.roundRect(g, -105, -270, 210, 84, 24); g.fillStyle = '#fff3d6'; g.fill(); g.stroke();
  // frosting drips
  g.fillStyle = '#ffffff';
  const drip = (x0, x1, y0) => {
    for (let dx = x0; dx < x1; dx += 38) {
      const len = 16 + ((dx * 7) % 22);
      g.beginPath(); g.moveTo(dx, y0); g.lineTo(dx + 30, y0); g.lineTo(dx + 30, y0 + len); g.arc(dx + 15, y0 + len, 15, 0, Math.PI); g.lineTo(dx, y0); g.fill();
    }
  };
  g.save(); g.lineWidth = 0;
  drip(-186, 160, -98); drip(-144, 120, -188); drip(-101, 80, -268);
  g.restore();
  // sprinkles on layers
  const cols = ['#ff4d8d', '#ffd23f', '#3fa7ff', '#36d17a'];
  for (let i = 0; i < 18; i++) {
    g.save(); g.translate(-170 + ((i * 53) % 340), -40 + ((i * 29) % 36)); g.rotate(i * 1.1);
    g.fillStyle = cols[i % 4]; g.fillRect(-7, -2.5, 14, 5); g.restore();
  }
  // face on the middle layer
  const eyeY = -150;
  g.fillStyle = '#24163f';
  g.beginPath(); g.ellipse(-44, eyeY, 10, 14 * (Math.sin(t * 0.9) > 0.97 ? 0.15 : 1), 0, 0, TAU); g.ellipse(44, eyeY, 10, 14, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,111,177,0.5)'; g.beginPath(); g.ellipse(-76, eyeY + 22, 16, 9, 0, 0, TAU); g.ellipse(76, eyeY + 22, 16, 9, 0, 0, TAU); g.fill();
  g.strokeStyle = '#24163f'; g.lineWidth = 6; g.lineCap = 'round'; g.fillStyle = '#ff6f91';
  g.beginPath();
  if (mouth > 0) { g.ellipse(0, eyeY + 28, 20, 14 + mouth * 14, 0, 0, TAU); g.fill(); g.stroke(); } else { g.arc(0, eyeY + 14, 24, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  // candles
  for (let i = -1; i <= 1; i++) {
    const cx = i * 60;
    g.fillStyle = ['#7fd3ff', '#ff6fb1', '#ffd23f'][i + 1]; g.lineWidth = 5; g.strokeStyle = '#24163f';
    ui.roundRect(g, cx - 9, -322, 18, 54, 6); g.fill(); g.stroke();
    const fl = 1 + Math.sin(t * 12 + i) * 0.12 + (rush ? 0.3 : 0);
    g.save(); g.translate(cx, -330); g.scale(fl, fl);
    g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(0, -34); g.quadraticCurveTo(16, -10, 0, 4); g.quadraticCurveTo(-16, -10, 0, -34); g.fill();
    g.fillStyle = '#ffe066'; g.beginPath(); g.moveTo(0, -22); g.quadraticCurveTo(8, -8, 0, 0); g.quadraticCurveTo(-8, -8, 0, -22); g.fill();
    g.restore();
  }
  g.restore();
}
