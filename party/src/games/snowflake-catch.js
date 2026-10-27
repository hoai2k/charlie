// Snowflake Giggles (Molly Party) - race around a snowy meadow catching
// giggly snowflakes in a little snow jar held up over your head (hold A).
// Flakes pop into the jar with a sparkle and a giggle, and the jar fills up and
// glows when it's full. Every flake also flies on to the big
// shared snowman at the back, who grows piece by piece until he's finished
// and dances. A cheeky snowman friend lobs snowballs that burst into glitter
// (glitter = a bonus!), and sledding penguins zoom across spraying extra
// flakes (and spin anyone they boop). Cooperative: everyone wins together.
//
// Art hooks (all optional, procedural fallbacks ship today): bg/snowflake-catch,
//   prop/snowflake, prop/snowflake-big, prop/snowball, prop/snowman-friend(+-throw),
//   prop/penguin-sled, prop/bigsnowman-1..6
// Poses: 'carry' (arms up, holding something overhead) while the jar is up; every
//   playable character has it, and characters without arms balance the jar on top.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { easySteer, easyPrompt, easyAutoOk } from '../engine/easy.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { clamp, approach, rand, randInt, pick, chance, TAU, dist } from '../engine/util.js';
import { Dash } from '../engine/dash.js';
import { ARENA, BIG, FRIEND, NAVY, drawFlake, drawSnowball, drawPenguin, drawFriend, drawBigSnowman, drawMeadow, drawSnowJar, JAR, friendHand } from './snowflake-catch/art.js';

import { meta } from './snowflake-catch.meta.js';

export { meta };

// --- tuning -----------------------------------------------------------------
const DURATION = 45;
const STORM_AT = 10;
const SPEED = 560;
const STAGE_FRACS = [0.06, 0.22, 0.4, 0.58, 0.78, 1.0];
const JAR_FULL = 6;         // flakes that fill a jar (it glows, then empties: just for show)
const POP_IN = 0.16;        // seconds a caught flake takes to drop into the jar
/** Like engine steer(), but at a capped Molly-Party speed. */
function steerTo(p, fx, fy, tx, ty, arrive, speed, wobble = 0) {
  const dx = tx - fx, dy = ty - fy, d = Math.hypot(dx, dy);
  if (d < 1) { p.ctrl.move(0, 0); return d; }
  const ang = Math.atan2(dy, dx) + Math.sin(performance.now() / 400 + p.index * 1.7) * wobble;
  const k = clamp(d / arrive, 0, 1) * speed;
  p.ctrl.move(Math.cos(ang) * k, Math.sin(ang) * k);
  return d;
}
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.easy = !!api.easy;     // Molly Easy: A = hold up the jar; A again and again (no steering) walks you under a flake
    const n = this.n = this.players.length;
    this.t = 0; this.timeLeft = DURATION; this.done = false; this.storm = false; this.stormT = 0;
    // the snow clock, shown the whole game
    api.limit(() => (this.done ? null : this.timeLeft), { showAt: Infinity });
    this.base = n <= 2 ? 1 : n <= 4 ? 0.92 : n <= 6 ? 0.84 : 0.78;
    this.flakes = []; this.balls = []; this.penguins = []; this.motes = []; this.poofs = []; this.popIns = [];
    this.spawnT = 0.2; this.bigT = rand(4, 6); this.ballT = rand(3, 4); this.pengT = rand(5, 7);
    this.goal = Math.round(16 + n * 11);      // flakes for a finished snowman
    this.built = 0; this.stage = 0; this.bounce = 0; this.dance = 0;
    this.friendThrow = 0;
    this.catchAt = -1;
    this.sparkles = Array.from({ length: 40 }, () => ({ x: rand(60, W - 60), y: rand(500, 1060), p: rand(TAU), s: rand(0.6, 1.2) }));
    const cols = Math.min(n, 4), rows = Math.ceil(n / 4);
    this.ents = this.players.map((p, i) => {
      const r = Math.floor(i / 4), c = i % 4, inRow = r === rows - 1 ? n - r * 4 : cols;
      const x = W / 2 + (c - (inRow - 1) / 2) * 300;
      const y = rows === 1 ? 780 : 700 + r * 170;
      const a = new Actor(p, { scale: this.base, x, y });
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      const boost = a.leader.h < 80 ? 1.9 : 1;   // tiny fairy avatars
      return { p, a, i, boost, x, y, vx: 0, vy: 0, score: 0, lift: 0, jar: 0, jarFull: 0, jarBump: 0, spin: 0, spinDir: 1, glitter: 0, dash: new Dash(), brain: new Brain(p), target: null, wander: 0, wx: x, wy: y, err: [0, 0], popN: 0, popT: 0, giggleT: 0 };
    });
  }

  // ----------------------------------------------------------------- helpers
  /** The held-up jar: bottom centre (x, y), its scale s and the screen y of its open mouth. */
  jarPos(e) {
    const a = e.a, head = a.anchor('head'), hand = a.anchor('hand');
    const s = clamp(a.height / 250, 0.45, 1.3);
    // on top of the head, or between raised hands when they reach higher
    const top = Math.min(head.y, hand.y + a.height * 0.06);
    const y = top - 4 * s + (1 - e.lift) * 24 * s;
    return { x: head.x, y, s, mouth: y - JAR.mouth * s };
  }
  pop(e, str, color, size = 50) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    const top = e.a.y - e.a.height - 30, lvl = e.popN % 3;
    particles.popText(e.x + (lvl === 1 ? 40 : lvl === 2 ? -40 : 0), top - lvl * 46, str, color, size);
  }
  spawnFlake(o = {}) {
    const f = {
      x: rand(ARENA.x0 + 40, ARENA.x1 - 40), y: rand(ARENA.y0 + 20, ARENA.y1 - 20), z: rand(650, 900), vz: rand(150, 210),
      big: false, rot: rand(TAU), spin: rand(-1.5, 1.5), ph: rand(TAU), age: 0, state: 'fall', ...o,
    };
    if (f.big) { f.vz *= 0.7; f.z = 900; }
    this.flakes.push(f);
    return f;
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.scale = this.base * e.boost * depthScale(e.y, { top: 380, near: 1020 }); e.a.moveAnim(0, 0, 1); e.a.update(dt); }
    this.updateFlakes(dt, true);
  }

  update(dt) {
    this.t += dt;
    if (this.startT === undefined) this.startT = this.t - dt;
    const el = this.t - this.startT;
    this.timeLeft = Math.max(0, DURATION - el);
    if (!this.storm && this.timeLeft <= STORM_AT && !this.done) this.startStorm();
    if (this.storm) this.stormT += dt;
    if (!this.done) this.spawning(dt, el);
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      else if (this.easy && !this.done) this.easyThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate(dt);
    this.updateFlakes(dt, false);
    this.updateBalls(dt);
    this.updatePenguins(dt);
    this.updateMotes(dt);
    this.updatePopIns(dt);
    this.bounce = approach(this.bounce, 0, dt * 2.5);
    this.friendThrow = Math.max(0, this.friendThrow - dt);
    for (const e of this.ents) { e.a.x = e.x; e.a.y = e.y; e.a.scale = this.base * e.boost * depthScale(e.y, { top: 380, near: 1020 }); e.a.update(dt); }
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.update(dt); }
    this.updateFlakes(dt, true);
    this.updateMotes(dt);
    this.bounce = approach(this.bounce, 0, dt * 2.5);
  }

  startStorm() {
    this.storm = true; this.stormT = 0;
    snd('sfc-storm', 'whoosh'); sfx('magic'); fx.flash('#e6f2ff', 0.3); fx.shake(10, 0.35);
    for (let i = 0; i < 3; i++) this.spawnFlake({ big: true, z: 900 + i * 150 });
  }

  spawning(dt, el) {
    const n = this.n;
    let interval = clamp(1 / (1.6 + 0.55 * n), 0.08, 0.5);
    if (this.storm) interval *= 0.5;
    this.spawnT -= dt;
    while (this.spawnT <= 0) {
      this.spawnT += interval * rand(0.6, 1.4);
      // half the flakes drift down near someone so everyone gets chances
      const near = chance(0.5) ? pick(this.ents) : null;
      this.spawnFlake(near ? { x: clamp(near.x + rand(-260, 260), ARENA.x0 + 30, ARENA.x1 - 30), y: clamp(near.y + rand(-160, 160), ARENA.y0 + 10, ARENA.y1 - 10) } : {});
    }
    this.bigT -= dt;
    if (this.bigT <= 0) {
      this.bigT = this.storm ? rand(1.5, 2.5) : rand(4.5, 6.5) / Math.min(1.8, 0.8 + n * 0.12);
      this.spawnFlake({ big: true });
      snd('sfc-big', 'golden-chime', { vol: 0.5 });
    }
    this.ballT -= dt;
    if (this.ballT <= 0 && el > 2) { this.ballT = this.storm ? rand(1.8, 2.6) : rand(3, 4.4); this.throwBall(); }
    this.pengT -= dt;
    if (this.pengT <= 0 && el > 3) { this.pengT = this.storm ? rand(3, 4) : rand(5.5, 7.5); this.sendPenguin(); }
  }

  throwBall() {
    const e = pick(this.ents);
    const tx = clamp(e.x + rand(-140, 140), ARENA.x0 + 60, ARENA.x1 - 60), ty = clamp(e.y + rand(-90, 90), ARENA.y0 + 30, ARENA.y1 - 20);
    const hand = friendHand();   // the ball leaves the raised hand (drawn at y - z - 30)
    const sx = FRIEND.x + hand.dx, sy = FRIEND.y - 1, sz = -hand.dy - 31;
    const T = clamp(dist(sx, sy, tx, ty) / 900, 0.9, 1.4);
    this.balls.push({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy) / T, vz: (0 - sz + 0.5 * 1400 * T * T) / T, tx, ty, t: 0, T, rot: 0 });
    this.friendThrow = 0.45;
    snd('sfc-toss', 'snow-throw', { vol: 0.6 }); sfx('giggle', { vol: 0.35, rate: 1.3 });
  }

  sendPenguin() {
    const dir = chance(0.5) ? 1 : -1;
    const e = pick(this.ents);
    const y = clamp(e.y + rand(-60, 60), ARENA.y0 + 40, ARENA.y1 - 30);
    this.penguins.push({ dir, y, x: dir > 0 ? -160 : W + 160, warn: 1.1, t: 0, dropT: 0, hit: new Set() });
    sfx('whistle', { vol: 0.35, rate: 1.4 });
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const a = e.a, ctrl = e.p.ctrl;
    e.popT = Math.max(0, e.popT - dt); e.giggleT = Math.max(0, e.giggleT - dt);
    e.glitter = Math.max(0, e.glitter - dt);
    if (e.glitter <= 0 && a._tint) a.tint(null);
    if (e.spin > 0) {
      e.spin -= dt; e.dash.cancel();
      a.facing = Math.sin(e.spin * 30) > 0 ? 1 : -1;
      e.vx *= Math.exp(-4 * dt); e.vy *= Math.exp(-4 * dt);
      e.x = clamp(e.x + e.vx * dt, ARENA.x0, ARENA.x1); e.y = clamp(e.y + e.vy * dt, ARENA.y0, ARENA.y1);
      if (e.spin <= 0 && !a._once) a.setPose('idle');
      e.lift = 0;
      return;
    }
    const auto = this.easy && !e.p.isAI;
    let ix = this.done ? 0 : auto ? e.autoX || 0 : ctrl.x, iy = this.done ? 0 : auto ? e.autoY || 0 : ctrl.y;
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    if (auto) e.liftHold = Math.max(0, (e.liftHold || 0) - dt);
    const up = !this.done && (ctrl.held('a') || (auto && e.liftHold > 0));
    if (!this.done && ctrl.pressed('a')) {
      sfx('pop', { vol: 0.3, rate: 1.7 });
      a.squash(-0.15);
      if (auto) e.liftHold = 0.55;   // a quick tap still catches
    }
    e.lift = up ? Math.min(1, e.lift + dt * 9) : Math.max(0, e.lift - dt * 7);
    e.jarBump = Math.max(0, e.jarBump - dt * 5);
    if (e.jarFull > 0) {
      e.jarFull -= dt;
      if (e.jarFull <= 0) {   // the full jar tips its snow off to the big snowman (just for show)
        e.jar = Math.max(0, e.jar - JAR_FULL); e.jarFull = 0;
        const j = this.jarPos(e);
        particles.burst(j.x, j.mouth, { type: 'sparkle', count: 10, colors: ['#ffffff', '#d6ecff', '#ffe1f5'], speed: [120, 260], size: [10, 18], angle: Math.atan2(BIG.y - 300 - j.mouth, BIG.x - j.x), spread: 0.7 });
      }
    }
    // Easy: the auto-walk slows right down with the jar up, so timing A beats holding it
    const sp = SPEED * (up ? (auto && !e.ezManual ? 0.4 : 0.85) : 1);
    e.vx = approach(e.vx, ix * sp, 4200 * dt); e.vy = approach(e.vy, iy * sp * 0.8, 4200 * dt);
    const dd = e.dash.update(dt, ctrl, { x: e.x, y: e.y, actor: up ? null : a, facing: a.facing, ok: !this.done && !e.p.isAI });   // B: a short dash
    e.x = clamp(e.x + e.vx * dt + dd.x, ARENA.x0, ARENA.x1); e.y = clamp(e.y + e.vy * dt + dd.y, ARENA.y0, ARENA.y1);
    if (up && !a._once) {
      a.setPose('carry');   // arms up, holding the jar overhead
      a.speed = clamp(Math.hypot(e.vx, e.vy) / SPEED, 0, 1);
      if (Math.abs(e.vx) > 30) a.facing = e.vx > 0 ? 1 : -1;
    } else a.moveAnim(e.vx, e.vy, SPEED, { run: Math.hypot(e.vx, e.vy) > 380 });
  }

  separate(dt) {
    // radius from the drawn (depth-scaled) sprite, so near, bigger players keep more room
    spread(this.ents, { radius: (e) => bodyRadius(e.a), yScale: 1.6, strength: Math.min(1, dt * 12), bounds: ARENA });
  }

  // ------------------------------------------------------------------ flakes
  updateFlakes(dt, idle) {
    for (const f of this.flakes) {
      f.age += dt; f.rot += f.spin * dt;
      if (f.state === 'fall') {
        f.z -= f.vz * dt;
        f.x += Math.sin(f.age * 1.8 + f.ph) * 26 * dt;
        if (!idle && !this.done) this.tryCatch(f);
        if (f.state === 'fall' && f.z <= 0) { f.z = 0; f.state = 'melt'; f.mt = 0; }
      } else if (f.state === 'melt') {
        f.mt += dt;
        if (f.mt > 0.6) f.state = 'dead';
      }
    }
    this.flakes = this.flakes.filter((f) => f.state !== 'dead');
  }

  tryCatch(f) {
    for (const e of this.ents) {
      if (e.lift < 0.5 || e.spin > 0) continue;
      const a = e.a, h = a.height;
      if (f.z > h * 1.65 || f.z < h * 0.5) continue;   // around the jar, held up overhead
      const R = 70 * this.base + (f.big ? 36 : 0) + a.radius * 0.4;
      const dx = f.x - e.x, dy = (f.y - e.y) * 1.7;
      if (dx * dx + dy * dy < R * R) { this.catchFlake(e, f); return; }
    }
  }

  catchFlake(e, f, glitter = false) {
    f.state = 'dead';
    const pts = f.big ? 3 : 1;
    e.score += pts;
    const a = e.a, j = this.jarPos(e), m = { x: j.x, y: j.mouth + 30 * j.s };
    a.squash(0.12);
    // the flake drops into the jar, which fills up and glows when full
    this.popIns.push({ e, x: f.x, y: f.y - f.z, rot: f.rot, big: f.big, t: 0 });
    e.jar += pts; e.jarBump = 1;
    if (e.jar >= JAR_FULL && e.jarFull <= 0) {
      e.jarFull = 1.1;
      snd('ff-jar-full', 'sparkle', { vol: 0.55 });
      particles.ring(j.x, j.mouth + 36 * j.s, '#fff6a8', 90 * j.s + 30, 0.4);
    }
    if (f.big) {
      snd('sfc-big', 'golden-chime'); sfx('sparkle'); voice(e.p.charId, 'woo');
      particles.burst(m.x, m.y, { type: 'star', count: 14, colors: ['#ffc2f0', '#c9b0ff', '#a8f0ff', '#fff6a8'], speed: [160, 360] });
      fx.flash('#f2e6ff', 0.12); fx.shake(6, 0.18);
      this.api.camera && this.api.camera.punch(e.x, a.y - a.height * 0.6, 1.12, 0.3);
      this.pop(e, '+3', '#b36bff', 66);
      a.emote('sparkle', 1);
      if (!e.p.isAI) e.p.ctrl.rumble(0.5, 140);
    } else {
      if (this.t - this.catchAt > 0.04) snd('sfc-catch', 'collect', { step: (e.score % 12), vol: 0.7 });
      this.catchAt = this.t;
      particles.burst(m.x, m.y - 20 * j.s, { type: 'sparkle', count: 6, colors: ['#ffffff', '#bfe6ff', '#ffe1f5'], speed: [80, 200], size: [10, 18] });
      this.pop(e, '+1', '#3fa7ff', 46);
      // the flake giggles as it lands (a sound, not a voice; held back so it never chatters)
      if (e.giggleT <= 0) { e.giggleT = 1.1; sfx('giggle', { vol: 0.35, rate: rand(1.3, 1.6) }); if (chance(0.3)) a.emote('happy', 0.7); }
    }
    // a little sparkle flies to the big snowman
    for (let i = 0; i < pts; i++) this.motes.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, t: -i * 0.08, d: rand(0.55, 0.75), color: f.big ? pick(['#ffc2f0', '#c9b0ff', '#a8f0ff']) : '#ffffff' });
  }

  updatePopIns(dt) {
    for (const p of this.popIns) p.t += dt;
    this.popIns = this.popIns.filter((p) => p.t < POP_IN);
  }

  updateMotes(dt) {
    const tx = BIG.x, ty = BIG.y - 120 - this.stage * 30;
    for (const mo of this.motes) {
      mo.t += dt;
      const u = clamp(mo.t / mo.d, 0, 1), k = u * u * (3 - 2 * u);
      mo.x = mo.sx + (tx - mo.sx) * k; mo.y = mo.sy + (ty - mo.sy) * k - Math.sin(u * Math.PI) * 180;
      if (u >= 1) { mo.dead = true; this.addBuilt(); }
    }
    this.motes = this.motes.filter((m) => !m.dead);
  }

  addBuilt() {
    this.built++;
    this.bounce = Math.max(this.bounce, 0.25);
    particles.burst(BIG.x + rand(-60, 60), BIG.y - rand(40, 280), { type: 'sparkle', count: 2, colors: ['#fff', '#d6ecff'], speed: [30, 90], size: [8, 14] });
    const want = STAGE_FRACS.filter((f) => this.built >= Math.ceil(f * this.goal)).length;
    if (want > this.stage) this.stageUp(want);
  }

  stageUp(s) {
    this.stage = s; this.bounce = 1;
    const top = BIG.y - 90 - s * 45;
    particles.burst(BIG.x, top, { type: 'confetti', count: 30, speed: [200, 480] });
    particles.ring(BIG.x, top, '#ffffff', 220, 0.5);
    fx.shake(8, 0.25);
    if (s >= 6) {
      snd('sfc-done', 'snowman-alive'); sfx('fanfare');
      fx.flash('#fff6d0', 0.25); particles.confettiRain(W, 120);
      this.dance = 1;
      this.api.camera && this.api.camera.punch(BIG.x, BIG.y - 180, 1.2, 0.6);
      particles.popText(BIG.x, BIG.y - 400, 'Hooray!', '#ff7ac6', 72);
      for (const e of this.ents) { e.a.playOnce('cheer', 0.8); }
    } else {
      snd('sfc-stage', 'snowman-stack'); sfx('star', { vol: 0.6 });
      for (const e of this.ents) if (!e.a._once && e.spin <= 0) e.a.playOnce('cheer', 0.5);
    }
  }

  // ------------------------------------------------------------ snowballs etc
  updateBalls(dt) {
    for (const b of this.balls) {
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= 1400 * dt; b.z += b.vz * dt; b.rot += dt * 6;
      if (b.z <= 0) { b.dead = true; this.poof(b.x, b.y); }
    }
    this.balls = this.balls.filter((b) => !b.dead);
    for (const p of this.poofs) p.t += dt;
    this.poofs = this.poofs.filter((p) => p.t < 0.7);
  }

  poof(x, y) {
    snd('sfc-poof', 'snow-burst', { vol: 0.8 }); sfx('sparkle', { vol: 0.6 });
    particles.burst(x, y - 30, { type: 'sparkle', count: 22, colors: RAINBOW, speed: [140, 380], size: [10, 22] });
    particles.burst(x, y - 20, { type: 'smoke', count: 8, color: '#ffffff', speed: [60, 160], size: [24, 40] });
    particles.ring(x, y - 10, '#ffffff', 150, 0.4);
    this.poofs.push({ x, y, t: 0 });
    fx.shake(4, 0.12);
    for (const e of this.ents) {
      const d = Math.hypot(e.x - x, (e.y - y) * 1.6);
      if (d < 140 && !this.done) {
        e.score += 1; e.glitter = 1.6;
        e.a.tint(pick(['#ffb3ec', '#c9b0ff', '#a8e8ff']), 0.28);
        e.a.playOnce('surprised', 0.35, 'idle'); e.a.squash(0.35); e.a.emote('sparkle', 1.2);
        voice(e.p.charId, 'laugh');
        this.pop(e, 'Glitter! +1', '#ff7ac6', 46);
        const m = e.a.anchor('head');
        this.motes.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, t: 0, d: 0.7, color: '#ffc2f0' });
      }
    }
    // the poof leaves a few low flakes to snap up
    for (let i = 0; i < 3; i++) this.spawnFlake({ x: clamp(x + rand(-120, 120), ARENA.x0, ARENA.x1), y: clamp(y + rand(-70, 70), ARENA.y0, ARENA.y1), z: rand(180, 260), vz: rand(70, 100) });
  }

  updatePenguins(dt) {
    for (const p of this.penguins) {
      if (p.warn > 0) { p.warn -= dt; if (p.warn <= 0) { snd('sfc-wheee', 'wheee-fall', { vol: 0.7 }); } continue; }
      p.t += dt; p.x += p.dir * 1250 * dt;
      p.dropT -= dt;
      if (p.dropT <= 0 && p.x > ARENA.x0 && p.x < ARENA.x1) {
        p.dropT = 0.14;
        this.spawnFlake({ x: p.x - p.dir * 40, y: clamp(p.y + rand(-50, 50), ARENA.y0, ARENA.y1), z: rand(140, 230), vz: rand(55, 85) });
        particles.burst(p.x - p.dir * 70, p.y, { type: 'smoke', count: 2, color: '#ffffff', speed: [30, 120], size: [16, 28], angle: p.dir > 0 ? Math.PI : 0, spread: 0.6 });
      }
      for (const e of this.ents) {
        if (p.hit.has(e) || this.done) continue;
        if (Math.abs(e.x - p.x) < 90 && Math.abs(e.y - p.y) < 50) {
          p.hit.add(e);
          e.spin = 0.6; e.vx = p.dir * 380; e.vy = (e.y < p.y ? -1 : 1) * 260;
          e.a.playOnce('dizzy', 0.6, 'idle'); e.a.squash(0.4);
          sfx('bounce'); voice(e.p.charId, 'laugh');
          particles.burst(e.x, e.y - 60, { type: 'star', count: 6, colors: ['#ffd23f', '#fff'] });
          this.pop(e, 'Wheee!', '#3fa7ff', 44);
          if (!e.p.isAI) e.p.ctrl.rumble(0.4, 120);
        }
      }
      if (p.x < -260 || p.x > W + 260) p.dead = true;
    }
    this.penguins = this.penguins.filter((p) => !p.dead);
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl;
    if (e.spin > 0) { ctrl.move(0, 0); return; }
    const speed = Math.min(0.85, prof.speed * 0.9);
    const mistake = Math.min(0.5, prof.mistake * 1.5 + 0.06);
    const h = e.a.height;
    if (e.brain.ready(dt)) {
      let best = null, bu = -1;
      for (const f of this.flakes) {
        if (f.state !== 'fall' || f.z < h * 0.3) continue;
        const tArrive = (f.z - h * 0.8) / f.vz;
        const travel = Math.hypot(f.x - e.x, (f.y - e.y) * 1.25) / (SPEED * speed);
        if (travel > tArrive + 0.3) continue;
        let u = (f.big ? 3 : 1) / (0.5 + travel + Math.max(0, tArrive - travel) * 0.3) * rand(0.8, 1.2);
        for (const o of this.ents) if (o !== e && Math.hypot(o.x - f.x, o.y - f.y) < Math.hypot(e.x - f.x, e.y - f.y) * 0.7) { u *= 0.4; break; }
        // leave flakes (and flakes right next to them) that another player is already after
        let near = 0;
        for (const o of this.ents) if (o !== e && o.target && o.target.state === 'fall' && Math.hypot(o.target.x - f.x, o.target.y - f.y) < 170) near++;
        u /= 1 + near * 1.2;
        if (u > bu) { bu = u; best = f; }
      }
      if (!best || chance(mistake)) { e.target = null; e.wander = rand(0.5, 1.2); e.wx = rand(ARENA.x0 + 100, ARENA.x1 - 100); e.wy = rand(ARENA.y0 + 40, ARENA.y1 - 40); }
      else { e.target = best; e.err = [rand(-1, 1) * prof.aimError * 90, rand(-1, 1) * prof.aimError * 50]; e.wander = 0; }
      e.brain.wait(reactionTime(p) * 1.1);
    }
    // dodge an incoming penguin (Hard is quicker to notice)
    for (const pg of this.penguins) {
      if (pg.warn > 0.6 || Math.abs(pg.y - e.y) > 70) continue;
      if (chance(0.5 + (p.aiLevel || 0) * 0.2)) { e.target = null; e.wander = 0.6; e.wx = e.x; e.wy = clamp(e.y + (e.y < pg.y ? -160 : 160), ARENA.y0, ARENA.y1); }
    }
    let tx = null, ty = null, want = false;
    if (e.wander > 0) { e.wander -= dt; tx = e.wx; ty = e.wy; }
    else if (e.target && e.target.state === 'fall') {
      const f = e.target; tx = f.x + e.err[0]; ty = f.y + e.err[1];
      want = f.z < h * 2.2 && Math.hypot(f.x - e.x, f.y - e.y) < 200;
    } else e.target = null;
    ctrl.hold('a', want || (e.wander > 0 && chance(0.02)));
    if (tx === null) { ctrl.move(0, 0); return; }
    const d = steerTo(p, e.x, e.y, tx, ty, 60, speed, prof.aimError * 0.5);
    if (d < 14) ctrl.move(0, 0);
  }

  /** Molly Easy (humans): the stick walks you, A holds up the jar. Nobody walks you otherwise,
   *  except for a moment after each A pressed again and again with no steering (easyAutoOk):
   *  then you walk under the best flake by yourself. */
  easyThink(e, dt) {
    e.autoX = 0; e.autoY = 0;
    // the stick steers while it's pushed (target = the best flake from where you are, for the A cue)
    const st = easySteer(e, e.p.ctrl, dt);
    e.ezManual = st.manual; e.ezPush = st.pushing;
    if (st.pushing) { e.target = null; e.retarget = 0; e.ezGoT = 0; }
    if (e.p.ctrl.pressed('a') && easyAutoOk(e)) e.ezGoT = 3;
    e.ezGoT = Math.max(0, (e.ezGoT || 0) - dt);
    if (e.spin > 0) return;
    const h = e.a.height;
    const ok = (f) => f && f.state === 'fall' && f.z > h * 0.5;
    e.retarget = (e.retarget || 0) - dt;
    if (e.retarget <= 0 || !ok(e.target)) {
      e.retarget = 0.3;
      let best = null, bu = -1;
      for (const f of this.flakes) {
        if (!ok(f) || f.z < h * 0.7) continue;
        const tArrive = (f.z - h * 0.8) / f.vz;
        const travel = Math.hypot(f.x - e.x, (f.y - e.y) * 1.25) / (SPEED * 0.7);
        if (travel > tArrive + 0.2) continue;
        let u = (f.big ? 3 : 1) / (0.5 + travel + Math.max(0, tArrive - travel) * 0.3);
        if (f === e.target) u *= 1.6;
        for (const o of this.ents) if (o !== e && (o.target === f || Math.hypot(o.x - f.x, o.y - f.y) < Math.hypot(e.x - f.x, e.y - f.y) * 0.7)) { u *= 0.3; break; }
        if (u > bu) { bu = u; best = f; }
      }
      e.target = best;
    }
    if (st.manual) { e.autoX = st.x * 0.9; e.autoY = st.y * 0.9; return; }
    const f = e.target;
    if (!f || e.ezGoT <= 0) return;
    const dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy);
    if (d < 14) return;
    const k = clamp(d / 60, 0, 1) * 0.75;
    e.autoX = (dx / d) * k; e.autoY = (dy / d) * k;
  }

  /** Easy: is this player's flake in reach of the jar right now? */
  easyNow(e) {
    const f = e.target, h = e.a.height;
    if (!f || f.state !== 'fall' || e.spin > 0) return false;
    return f.z < h * 1.9 && f.z > h * 0.5 && Math.hypot(f.x - e.x, (f.y - e.y) * 1.7) < 110;
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    for (const e of this.ents) e.p.ctrl.hold && e.p.isAI && e.p.ctrl.hold('a', false);
    // everyone helps finish the snowman
    const left = Math.max(0, this.goal - this.built - this.motes.length);
    for (let i = 0; i < Math.min(left, 40); i++) {
      const e = this.ents[i % this.n];
      this.motes.push({ x: e.x, y: e.y - 100, sx: e.x, sy: e.y - 100, t: -i * 0.03, d: 0.6, color: '#ffffff' });
    }
    if (left > 40) this.built += left - 40;
    this.ents.forEach((e) => { e.a.clearEmotes(); e.a.tint(null); e.lift = 0; e.a.setPose('celebrate'); });
    const scores = this.ents.map((e) => e.score);
    sfx('cheer', { vol: 0.6 });
    this.api.finishTogether({
      title: 'Snow pals!',
      stats: scores.map((s) => `${s} flake${s === 1 ? '' : 's'}`), focus: { x: BIG.x, y: BIG.y - 160 },
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    drawMeadow(g, this.t, this.sparkles);
    drawBigSnowman(g, BIG.x, BIG.y, this.stage, this.t, this.bounce, this.dance);
    // stage pips under the snowman
    for (let i = 0; i < 6; i++) {
      const x = BIG.x - 125 + i * 50, y = BIG.y + 28, on = i < this.stage;
      g.save(); g.translate(x, y);
      if (on) drawFlake(g, 34, this.t * 0.5 + i, this.t, i === 5);
      else { g.globalAlpha = 0.35; drawFlake(g, 26, 0, 0); }
      g.restore();
    }
    drawFriend(g, FRIEND.x, FRIEND.y, this.friendThrow > 0, this.t);
    // ground shadows / target rings (flat on the snow)
    for (const f of this.flakes) {
      if (f.state === 'fall' && f.z < 800) {
        const k = 1 - f.z / 800;
        const rx = (f.big ? 40 : 24) * (0.5 + k * 0.6), ry = rx * 0.36;
        g.save(); g.globalAlpha = 0.2 + k * 0.4; g.fillStyle = f.big ? '#9b7bff' : '#5a78d0';
        g.beginPath(); g.ellipse(f.x, f.y, rx, ry, 0, 0, TAU); g.fill();
        if (k > 0.55) { g.globalAlpha = (k - 0.55) * 1.6; g.strokeStyle = f.big ? '#c9a0ff' : '#ffffff'; g.lineWidth = 3; g.beginPath(); g.ellipse(f.x, f.y, rx * 1.5, ry * 1.5, 0, 0, TAU); g.stroke(); }
        g.restore();
      } else if (f.state === 'melt') {
        g.save(); g.globalAlpha = 1 - f.mt / 0.6; g.translate(f.x, f.y); g.scale(1, 0.5); drawFlake(g, f.big ? 60 : 30, f.rot, this.t, f.big); g.restore();
      }
    }
    if (this.easy && !this.done) for (const e of this.ents) {
      const f = e.target;
      if (e.p.isAI || !f || f.state !== 'fall') continue;
      const now = this.easyNow(e), pulse = 1 + Math.sin(this.t * (now ? 14 : 5)) * 0.12;
      g.save(); g.globalAlpha = now ? 0.95 : 0.55; g.strokeStyle = e.p.color; g.lineWidth = now ? 7 : 4;
      g.beginPath(); g.ellipse(f.x, f.y, 62 * pulse, 22 * pulse, 0, 0, TAU); g.stroke(); g.restore();
    }
    for (const b of this.balls) {
      const k = clamp(b.t / b.T, 0, 1);
      g.save(); g.globalAlpha = 0.25 + k * 0.4; g.strokeStyle = '#ff7ac6'; g.lineWidth = 4; g.setLineDash([10, 8]);
      g.beginPath(); g.ellipse(b.tx, b.ty, 70 + (1 - k) * 40, 24 + (1 - k) * 14, 0, 0, TAU); g.stroke(); g.restore();
      g.save(); g.globalAlpha = 0.25; g.fillStyle = NAVY; g.beginPath(); g.ellipse(b.x, b.y, 26, 9, 0, 0, TAU); g.fill(); g.restore();
    }
    // penguin warning arrows
    for (const p of this.penguins) if (p.warn > 0) {
      const x = p.dir > 0 ? 70 : W - 70;
      g.save(); g.translate(x, p.y - 40); g.scale(p.dir * (1 + Math.sin(this.t * 20) * 0.1), 1);
      g.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 18);
      g.fillStyle = '#3fa7ff'; g.strokeStyle = NAVY; g.lineWidth = 5;
      g.beginPath(); g.moveTo(-34, -18); g.lineTo(6, -18); g.lineTo(6, -36); g.lineTo(40, 0); g.lineTo(6, 36); g.lineTo(6, 18); g.lineTo(-34, 18); g.closePath(); g.fill(); g.stroke();
      g.restore();
      g.save(); g.globalAlpha = 0.15; g.fillStyle = '#3fa7ff'; g.fillRect(0, p.y - 40, W, 80); g.restore();
    }
    // y-sorted world: players + penguins
    const items = [];
    for (const e of this.ents) items.push({ y: e.y, e });
    for (const p of this.penguins) if (p.warn <= 0) items.push({ y: p.y, p });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.e) this.drawPlayer(g, it.e);
      else { g.save(); g.translate(it.p.x, it.p.y - 40); drawPenguin(g, it.p.dir, this.t); g.restore(); }
    }
    // falling flakes (screen y = ground y - height)
    for (const f of this.flakes) if (f.state === 'fall') {
      const sy = f.y - f.z;
      if (sy < -60) continue;
      g.save(); g.translate(f.x, sy); drawFlake(g, f.big ? 120 : 58, f.rot, f.age, f.big); g.restore();
    }
    // caught flakes dropping into their jar
    for (const p of this.popIns) {
      const j = this.jarPos(p.e), u = clamp(p.t / POP_IN, 0, 1), k = u * u;
      g.save(); g.translate(p.x + (j.x - p.x) * k, p.y + (j.mouth + 10 * j.s - p.y) * k);
      drawFlake(g, (p.big ? 120 : 58) * (1 - u * 0.65), p.rot + u * 3, this.t, p.big); g.restore();
    }
    for (const b of this.balls) { g.save(); g.translate(b.x, b.y - b.z - 30); g.rotate(b.rot); drawSnowball(g, 32); g.restore(); }
    for (const mo of this.motes) if (mo.t > 0) {
      g.save(); g.translate(mo.x, mo.y); g.globalAlpha = 0.9; drawFlake(g, 22, mo.t * 8, mo.t); g.restore();
    }
    // tags
    for (const e of this.ents) {
      const top = e.y - e.a.height - 26 - (e.a.emotes.length ? 48 : 0);
      if (!this.api.ended?.()) ui.playerTag(g, e.p, e.x, top);
      // Easy: a big bouncing A when your flake is right above your head (A = jar up)
      if (this.easy && !this.done && !e.p.isAI && this.easyNow(e)) {
        const f = e.target;
        easyPrompt(g, e.p, { target: { x: f.x, y: f.y - f.z }, child: { x: e.x, y: Math.min(e.y - e.a.height, this.jarPos(e).mouth) } });
      }
    }
  }

  drawPlayer(g, e) {
    const a = e.a;
    a.draw(g, { ring: e.p.color });
    if (e.lift > 0.02) {
      const j = this.jarPos(e), k = e.lift < 1 ? 1 - Math.pow(1 - e.lift, 3) : 1;
      g.save(); g.translate(j.x, j.y); g.rotate(Math.sin(this.t * 5 + e.i) * 0.05); g.scale(k, k);
      g.globalAlpha = Math.min(1, e.lift * 2);
      drawSnowJar(g, j.s, Math.min(1, e.jar / JAR_FULL), clamp(e.jarFull, 0, 1), this.t, e.jarBump);
      g.restore();
    }
    if (e.glitter > 0) {
      for (let i = 0; i < 3; i++) if (Math.random() < 0.3) particles.burst(e.x + rand(-40, 40), e.y - rand(20, a.height), { type: 'sparkle', count: 1, colors: RAINBOW, speed: [10, 40], size: [8, 14] });
    }
  }

  drawHUD(g) {
    // the gallery ending: the built snowman under the play scene's ribbon, no counts
    if (this.api.ended?.()) return;
    // (the snow clock is api.limit's, drawn by the play scene)
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 14, avoidCenter: true, format: (v) => '❄ ' + v });
    // a reminder of the one button for the first few seconds
    const el = this.startT === undefined ? 0 : this.t - this.startT;
    if (el < 6 && this.players.some((p) => !p.isAI)) {
      g.save(); g.globalAlpha = clamp(6 - el, 0, 1);
      ui.text(g, this.easy ? 'Press A to catch snowflakes in your jar!' : 'Hold A to hold up your snow jar!', W / 2, H - 60, { size: 40, color: '#ffffff', weight: 800, stroke: NAVY });
      g.restore();
    }
    if (this.storm) {
      const pulse = 1 + Math.sin(this.t * 9) * 0.06;
      g.save(); g.translate(W / 2, 150); g.scale(pulse, pulse);
      ui.text(g, 'SNOW STORM!', 0, 0, { size: 44, color: '#3fa7ff', weight: 800 });
      g.restore();
      if (this.stormT < 2.2) { g.save(); g.globalAlpha = clamp(2.2 - this.stormT, 0, 1); ui.banner(g, 'Snow Storm!', this.stormT, { y: 520, size: 150, color: '#3fa7ff' }); g.restore(); }
    }
  }
}
