// Bubble Pop (Molly Party) - a cheeky bubble machine zooms along a cloud and
// blasts bubbles over a garden. Run under them and jump to pop: every pop
// bounces you up again, so you can chain pops in the air. Each bubble has a
// surprise inside (giggling duckling, star, confetti, rainbow, cupcake, boing
// frog). Giant bubbles take three bonks. Everyone's pops fill one shared
// bubble meter; when it's full: BUBBLE BATH finale, and everybody wins.
//
// Art hooks (all optional, procedural fallbacks ship today):
//   bg/bubble-pop  prop/bubble-machine  prop/bubble  prop/bubble-duckling
//   prop/bubble-star  prop/bubble-cupcake  prop/bubble-frog  prop/bubble-frog-hop
//   prop/bubble-rainbow  prop/rubber-duck
// SFX hooks (file if present, else the synth named second):
//   bp-pop>pop  bp-bigpop>bigpop  bp-blast>whoosh  bp-boing>boing  bp-quack>giggle
//   bp-bath>fanfare  bp-wobble>bounce
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime, Brain, steer } from '../engine/ai.js';
import { clamp, approach, rand, randInt, pick, chance, TAU, later } from '../engine/util.js';
import { drawBubble, drawDuckling, drawStarFace, drawCupcake, drawFrog, drawRainbow, drawRubberDuck, drawMachine, drawGarden, drawSparkle } from './bubble-pop/art.js';

const snd = (k, fb, o = {}) => sfx(k, { ...o, fallback: fb });

export const meta = {
  id: 'bubble-pop',
  title: 'Bubble Pop',
  category: 'molly',
  type: 'Team-up',
  goal: 'Jump and pop the bubbles to fill the bubble meter for a bubble bath!',
  controls: [['stick', 'Run'], ['a', 'Jump and pop']],
  tips: ['Every pop bounces you up again - pop pop pop in the air!', 'Giant bubbles need three bonks.', 'Every bubble has a surprise inside!'],
  goalEasy: 'You run under the bubbles by yourself - press A to jump and pop them!',
  controlsEasy: [['a', 'Jump and pop']],
  tipsEasy: ['Jump when the A pops up over your head!', 'Every pop bounces you up again - pop pop pop!', 'Every bubble has a surprise inside!'],
  music: 'bouncy',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  infoAt: 'tr',
  drawIcon(g, x, y, w, h, t = 0) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const thumb = art('thumb/bubble-pop');
    if (thumb) { g.drawImage(thumb, x, y, w, h); g.restore(); return; }
    const s = w / 400; g.translate(x, y); g.scale(s, s);
    const hh = h / s;
    const grd = g.createLinearGradient(0, 0, 0, hh); grd.addColorStop(0, '#7fd0ff'); grd.addColorStop(1, '#d8f4ff');
    g.fillStyle = grd; g.fillRect(0, 0, 400, hh);
    g.fillStyle = '#6ccf62'; g.fillRect(0, hh * 0.82, 400, hh);
    g.save(); g.translate(200, hh * 0.42); g.scale(0.32, 0.32); drawMachine(g, t, Math.max(0, Math.sin(t * 3)), t * 2); g.restore();
    const items = [drawDuckling, (gg) => drawStarFace(gg), (gg) => drawCupcake(gg), (gg) => { gg.translate(0, 40); drawFrog(gg, false, 0.8); }];
    for (let i = 0; i < 4; i++) {
      const bx = 70 + i * 88, by = hh * 0.62 + Math.sin(t * 2 + i * 1.7) * 10 - (i % 2) * 40;
      g.save(); g.translate(bx, by);
      g.save(); g.scale(0.45, 0.45); items[i](g); g.restore();
      drawBubble(g, 36, t + i); g.restore();
    }
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const MAX_TIME = 52;         // the meter is forced full by now
const FINALE_T = 6.5;
const GROUND_Y = 905;
const MAX_SPEED = 640;
const JUMP_V = 1020, JUMP_G = 2500, POP_BOUNCE = 820, GIANT_BOUNCE = 1080, MAX_Z = 430;
const MACHINE_Y = 450;          // cloud bottom; keeps the machine's head clear of the meter panel
const SURPRISES = ['duck', 'star', 'confetti', 'rainbow', 'cupcake', 'frog'];
const SURPRISE_W = [3, 3, 2, 2, 2, 3];

let serial = 0;
const pickSurprise = () => {
  let r = Math.random() * SURPRISE_W.reduce((a, b) => a + b, 0);
  for (let i = 0; i < SURPRISES.length; i++) { r -= SURPRISE_W[i]; if (r <= 0) return SURPRISES[i]; }
  return 'duck';
};

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: humans run under a bubble by themselves, A jumps
    this.players = api.players;
    const n = this.n = this.players.length;
    this.t = 0; this.el = 0;
    this.scale = n <= 3 ? 1.0 : n <= 4 ? 0.92 : n <= 6 ? 0.82 : 0.74;
    this.bubbles = []; this.goodies = []; this.rainbows = []; this.ducks = [];
    this.meter = 0; this.meterShow = 0; this.meterPulse = 0;
    // a full meter takes roughly 35-45 s of lively popping
    this.perPop = 1 / (50 + 26 * n);
    this.spawnT = 0.4; this.blastT = 0.2;   // open with a big blast this.blastLeft = 0; this.blastGap = 0; this.giantT = rand(7, 9);
    this.machine = { x: W / 2, vx: 0, puff: 0, sq: 0, wand: 0, dir: 1 };
    this.finale = false; this.finaleT = 0; this.foam = 0; this.done = false;
    this.popSndAt = -1;
    this.ents = this.players.map((p, i) => {
      const a = new Actor(p, { scale: this.scale, x: 0, y: GROUND_Y });
      if (a.height < 110 * this.scale) a.scale *= (110 * this.scale) / a.height;   // tiny avatars (fairies) stay readable
      const x = n === 1 ? W / 2 : 240 + ((W - 480) * i) / (n - 1);
      a.x = x; a.y = GROUND_Y + ((i % 3) - 1) * 14; a.facing = x < W / 2 ? 1 : -1; a.snap();
      return { p, a, i, x, vx: 0, z: 0, vz: 0, pops: 0, combo: 0, popN: 0, popT: 0, brain: new Brain(p), target: null, err: 0, wander: 0, wanderX: x, frogT: 0 };
    });
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    this.updateMachine(dt);
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.el += dt;
    this.updateMachine(dt);
    if (!this.finale) {
      this.meter = Math.min(1, this.meter + dt / 150);   // a gentle trickle so it always gets there
      if (this.el >= MAX_TIME) this.meter = 1;
      this.spawning(dt);
      if (this.meter >= 1) this.startFinale();
    } else {
      this.finaleT += dt;
      this.foam = approach(this.foam, 1, dt / 1.4);
      this.finaleRain(dt);
      if (this.finaleT >= FINALE_T && !this.done) this.finish();
    }
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      else if (this.easy && !this.done) this.easyThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.pushPlayers(dt);
    this.updateBubbles(dt);
    this.updateGoodies(dt);
    for (const e of this.ents) { e.a.x = e.x; e.a.z = e.z; e.a.update(dt); }
    this.meterShow = approach(this.meterShow, this.meter, dt * 0.6);
    this.meterPulse = Math.max(0, this.meterPulse - dt * 3);
  }

  postUpdate(dt) {
    this.t += dt;
    this.updateMachine(dt);
    this.updateBubbles(dt); this.updateGoodies(dt);
    for (const e of this.ents) { e.a.update(dt); }
  }

  updateMachine(dt) {
    const m = this.machine, prev = m.x;
    const sp = this.finale ? 1.6 : 0.85;
    m.x = W / 2 + Math.sin(this.t * sp * 0.8) * W * 0.32 + Math.sin(this.t * sp * 2.1) * 70;
    m.vx = (m.x - prev) / Math.max(dt, 1e-3);
    m.puff = Math.max(0, m.puff - dt * 3); m.sq = approach(m.sq, 0, dt * 0.9);
    m.wand += dt * (2 + m.puff * 10);
  }

  spawning(dt) {
    const n = this.n;
    const live = this.bubbles.length, cap = 9 + 3 * n;
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = clamp(1 / (1.0 + 0.45 * n), 0.2, 0.75) * rand(0.7, 1.3); if (live < cap) this.spawnBubble(); }
    // BLAST: a fan of bubbles all at once
    this.blastT -= dt;
    if (this.blastT <= 0 && this.blastLeft <= 0) {
      this.blastLeft = 5 + Math.min(4, n); this.blastT = rand(7, 10); this.blastGap = 0;
      snd('bp-blast', 'whoosh'); this.machine.sq = 0.25;
    }
    if (this.blastLeft > 0) {
      this.blastGap -= dt;
      if (this.blastGap <= 0) { this.spawnBubble({ fan: (this.blastLeft % 2 ? 1 : -1) * rand(0.6, 1.2) }); this.blastLeft--; this.blastGap = 0.07; }
    }
    this.giantT -= dt;
    if (this.giantT <= 0) { this.giantT = rand(9, 12); if (!this.bubbles.some((b) => b.giant)) this.spawnBubble({ giant: true }); }
  }

  spawnBubble(o = {}) {
    const m = this.machine;
    const giant = !!o.giant;
    const r = giant ? 120 : rand(46, 64);
    const dir = o.fan ? Math.sign(o.fan) : (chance(0.5) ? 1 : -1);
    // the art blows from the wand in its mouth; the procedural one from its side wand
    const [nx, ny] = art('prop/bubble-machine') ? [-86, -141] : [161, -163];
    const b = {
      id: serial++, x: m.x + nx, y: MACHINE_Y + ny, r, giant, hp: giant ? 3 : 1, hit: 0,
      vx: clamp(m.vx * 0.3, -160, 160) + dir * rand(140, 360) * (o.fan ? Math.abs(o.fan) : 1) * (giant ? 0.5 : 1),
      vy: rand(-160, 40), sway: rand(TAU), age: 0, grow: 0, surprise: giant ? 'giant' : pickSurprise(), spin: rand(-1, 1), wob: 0,
      fall: giant ? 70 : rand(85, 125),
    };
    this.bubbles.push(b);
    m.puff = 1; m.sq = Math.max(m.sq, 0.12);
    if (this.t - (this.blowAt || 0) > 0.12) { this.blowAt = this.t; sfx('bubble', { vol: 0.5 }); }
    if (giant) { particles.popText(b.x, b.y - 140, 'GIANT!', '#7fd3ff', 60); sfx('grow'); }
    return b;
  }

  updateBubbles(dt) {
    for (const b of this.bubbles) {
      b.age += dt; b.grow = Math.min(1, b.grow + dt * 4); b.hit = Math.max(0, b.hit - dt * 3); b.wob = approach(b.wob, 0, dt * 2);
      b.vx *= Math.exp(-1.1 * dt);
      b.vy = approach(b.vy, b.fall, 260 * dt);
      const sway = Math.sin(b.age * 1.8 + b.sway) * 60;
      b.x += (b.vx + sway) * dt; b.y += b.vy * dt;
      if (b.x < b.r + 20) { b.x = b.r + 20; b.vx = Math.abs(b.vx) + 60; }
      if (b.x > W - b.r - 20) { b.x = W - b.r - 20; b.vx = -Math.abs(b.vx) - 60; }
      if (b.y < 150) { b.y = 150; b.vy = Math.abs(b.vy); }
      if (b.y > GROUND_Y - b.r * 0.6) this.popBubble(b, null, true);
    }
    if (!this.done) for (const b of this.bubbles) if (!b.dead) this.checkBubble(b);
    this.bubbles = this.bubbles.filter((b) => !b.dead);
  }

  bodyW(e) { return clamp(e.a.width * 0.35, 40, 90); }

  checkBubble(b) {
    for (const e of this.ents) {
      const a = e.a, feet = a.y - e.z, top = feet - a.height * 1.02;
      const py = clamp(b.y, top, feet - 30);
      const dx = b.x - e.x, dy = b.y - py;
      const rr = b.r * (0.75 + 0.25 * b.grow) + this.bodyW(e) * 0.75;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (b.giant) {
        if (b.cool > b.age) continue;
        b.cool = b.age + 0.25;
        this.bonkGiant(b, e);
      } else this.popBubble(b, e);
      if (b.dead) return;
    }
  }

  bonkGiant(b, e) {
    b.hp--; b.hit = 1; b.wob = 1;
    (b.helpers || (b.helpers = new Set())).add(e);
    const a = e.a;
    if (b.y < a.y - e.z - a.height * 0.6) { e.vz = GIANT_BOUNCE; b.vy = -260; } else { b.vy = -340; e.vz = Math.max(e.vz, 600); }
    b.vx += (b.x - e.x) * 2;
    a.squash(0.35); a.playOnce('surprised', 0.3);
    snd('bp-boing', 'boing'); snd('bp-wobble', 'bounce', { vol: 0.6 });
    fx.shake(5, 0.15);
    e.pops++; this.addMeter(1);
    this.pop(e, b.hp > 0 ? 'Boing!' : '+1', '#7fd3ff', 52);
    particles.burst(b.x, b.y, { type: 'bubble', count: 8, colors: ['#ffffff', '#bfe8ff'] });
    if (!e.p.isAI) e.p.ctrl.rumble(0.4, 110);
    if (b.hp <= 0) this.popBubble(b, e);
  }

  addMeter(k) {
    if (this.finale) return;
    this.meter = Math.min(1, this.meter + this.perPop * k);
    this.meterPulse = 1;
  }

  popBubble(b, e, ground = false) {
    if (b.dead) return;
    b.dead = true;
    const big = b.giant;
    // sound (gated so a blast doesn't machine-gun)
    if (big) { snd('bp-bigpop', 'bigpop'); fx.flash('#ffffff', 0.18); fx.shake(12, 0.3); fx.hitstop(0.06); this.api.camera && this.api.camera.punch(b.x, b.y, 1.15, 0.4); }
    else if (this.t - this.popSndAt > 0.05) { this.popSndAt = this.t; snd('bp-pop', 'pop', { vol: ground ? 0.5 : 0.9, rate: rand(0.9, 1.2) }); }
    particles.burst(b.x, b.y, { type: 'ring', count: 1, color: '#ffffff', size: [b.r * 0.8, b.r * 0.8] });
    particles.burst(b.x, b.y, { type: 'drop', count: big ? 18 : 7, colors: ['#ffffff', '#cdeeff', '#ffd6f0'], speed: [120, 380] });
    particles.burst(b.x, b.y, { type: 'sparkle', count: big ? 12 : 4, colors: ['#ffffff', '#fff6a8'] });
    if (e && !big) {
      e.pops++; this.addMeter(1);
      // pop-bounce: chain pops in the air
      if (e.z > 8) {
        e.vz = Math.max(e.vz, POP_BOUNCE); e.combo++;
        if (e.combo >= 2) { this.pop(e, `x${e.combo}!`, RAINBOW[e.combo % RAINBOW.length], 44 + Math.min(e.combo, 6) * 4, 1); sfx('collect', { step: Math.min(e.combo, 14) }); }
        if (e.combo === 4 || e.combo === 7) { e.a.emote('sparkle', 1); fx.shake(5, 0.15); particles.burst(e.x, e.a.y - e.z - e.a.height, { type: 'star', count: 10, colors: RAINBOW }); }
      }
      this.pop(e, '+1', '#ffffff', 46);
      e.a.playOnce('cheer', 0.35); e.a.squash(0.2);
      if (!e.p.isAI) e.p.ctrl.rumble(0.25, 60);
    }
    if (big) {
      const hs = b.helpers ? [...b.helpers] : [];
      for (const h of hs) { h.pops += 2; this.pop(h, '+2', '#ffd23f', 58); h.a.playOnce('celebrate', 0.9); voice(h.p.charId, 'woo'); }
      this.addMeter(4);
      particles.burst(b.x, b.y, { type: 'confetti', count: 50 });
      for (let k = 0; k < 4; k++) this.release(b.x + rand(-60, 60), b.y + rand(-40, 40), pick(SURPRISES), pick(hs) || e, true);
      particles.popText(b.x, b.y - 40, 'Hooray!', '#ffd23f', 80);
      return;
    }
    this.release(b.x, b.y, b.surprise, e, ground);
  }

  /** Let a surprise out of a popped bubble. */
  release(x, y, kind, e, quiet) {
    const g = { kind, x, y, vx: rand(-80, 80), vy: -rand(120, 260), t: 0, by: e, dead: false, flip: chance(0.5) ? 1 : -1, hops: 0, onHead: null, rot: 0 };
    switch (kind) {
      case 'duck':
        if (!quiet) snd('bp-quack', 'giggle');
        break;
      case 'star':
        sfx('star', { vol: 0.6 }); g.vy = -500;
        break;
      case 'confetti':
        particles.burst(x, y, { type: 'confetti', count: 26 }); if (!quiet) sfx('yay', { vol: 0.5 });
        return;
      case 'rainbow':
        this.rainbows.push({ x, y: y + 60, t: 0 }); sfx('magic', { vol: 0.6 });
        particles.burst(x, y, { type: 'sparkle', count: 10, colors: RAINBOW });
        return;
      case 'cupcake':
        sfx('sparkle', { vol: 0.5 });
        if (!e) g.vy = 0;
        break;
      case 'frog':
        snd('bp-boing', 'boing', { vol: 0.6 });
        break;
      default: break;
    }
    this.goodies.push(g);
  }

  updateGoodies(dt) {
    for (const g of this.goodies) {
      g.t += dt;
      switch (g.kind) {
        case 'duck': {
          if (g.y < GROUND_Y - 10) { g.vy = Math.min(g.vy + 700 * dt, 220); g.x += g.vx * dt; g.y += g.vy * dt; }
          else { g.y = GROUND_Y - 10; g.vx = g.flip * 330; g.x += g.vx * dt; g.waddle = (g.waddle || 0) + dt; }
          if (g.x < -80 || g.x > W + 80) g.dead = true;
          break;
        }
        case 'star': {
          const tx = W / 2 + (this.meterShow - 0.5) * 560, ty = 70;
          if (g.t < 0.35) { g.y += g.vy * dt; g.vy *= 0.9; }
          else { g.x += (tx - g.x) * Math.min(1, dt * 5); g.y += (ty - g.y) * Math.min(1, dt * 5); }
          g.rot += dt * 8;
          if (Math.random() < dt * 20) particles.burst(g.x, g.y, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffd23f'], size: [10, 16] });
          if (g.t > 0.35 && Math.hypot(tx - g.x, ty - g.y) < 30) { g.dead = true; this.addMeter(1); sfx('coin', { vol: 0.5 }); }
          if (g.t > 3) g.dead = true;
          break;
        }
        case 'cupcake': {
          const e = g.by;
          if (e) {
            const h = e.a.anchor('hand');
            g.x += (h.x - g.x) * Math.min(1, dt * 8); g.y += (h.y - g.y) * Math.min(1, dt * 8);
            if (g.t > 0.3 && !g.eaten) { g.eaten = true; e.a.playOnce('eat', 0.6); sfx('munch'); e.a.emote('heart', 1); later(() => { g.dead = true; particles.burst(g.x, g.y, { type: 'heart', count: 4 }); }, 450); }
          } else { g.vy += 900 * dt; g.y += g.vy * dt; if (g.y > GROUND_Y) { g.dead = true; particles.burst(g.x, GROUND_Y, { type: 'sparkle', count: 5 }); } }
          break;
        }
        case 'frog': this.updateFrog(g, dt); break;
        default: g.dead = true;
      }
    }
    this.goodies = this.goodies.filter((g) => !g.dead);
    for (const r of this.rainbows) r.t += dt;
    this.rainbows = this.rainbows.filter((r) => r.t < 1.6);
    for (const d of this.ducks) { d.t += dt; d.x += d.vx * dt; if (d.x < 80 || d.x > W - 80) d.vx = -d.vx; }
  }

  updateFrog(g, dt) {
    if (g.onHead) {
      const e = g.onHead, a = e.a;
      g.x = e.x; g.y = a.y - e.z - a.height * 0.98; g.sit -= dt;
      if (g.sit <= 0) { g.onHead = null; g.vy = -900; g.vx = g.flip * 260; snd('bp-boing', 'boing'); a.squash(0.3); }
      return;
    }
    g.vy += 1600 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
    if (g.x < 40 || g.x > W - 40) { g.flip = -g.flip; g.vx = -g.vx; g.x = clamp(g.x, 40, W - 40); }
    // land on someone's head: silly!
    if (g.vy > 0 && g.hops < 6) {
      for (const e of this.ents) {
        const a = e.a, hy = a.y - e.z - a.height * 0.98;
        if (Math.abs(e.x - g.x) < 46 && g.y > hy - 10 && g.y < hy + 30 && !g.headDone) {
          g.onHead = e; g.sit = 0.7; g.headDone = true; a.playOnce('surprised', 0.5); a.squash(0.35);
          voice(e.p.charId, 'laugh'); sfx('squeak', { vol: 0.6 }); e.a.emote('exclaim', 0.6);
          return;
        }
      }
    }
    if (g.y >= GROUND_Y && g.vy > 0) {
      g.y = GROUND_Y; g.hops++; g.headDone = false;
      if (g.hops > 5) { g.vy = -1100; g.vx = g.flip * 520; }
      else { g.vy = -rand(820, 1050); g.vx = g.flip * rand(180, 320); if (chance(0.3)) { g.flip = -g.flip; g.vx = -g.vx; } }
      snd('bp-boing', 'boing', { vol: 0.55, rate: rand(0.9, 1.2) });
      particles.burst(g.x, GROUND_Y, { type: 'dust', count: 4, color: '#fff' });
    }
    if (g.y < -100 || g.t > 9) g.dead = true;
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const p = e.p, a = e.a, ctrl = p.ctrl;
    e.popT = Math.max(0, e.popT - dt);
    let inX = this.done ? 0 : ctrl.x;
    if (this.easy && !p.isAI && !this.done) {
      const d = e.ezX - e.x;
      inX = Math.abs(d) > 12 ? Math.sign(d) * clamp(Math.abs(d) / 90, 0.25, 0.85) : 0;
    }
    const target = inX * MAX_SPEED;
    e.vx = approach(e.vx, target, (Math.sign(target) !== Math.sign(e.vx) ? 6000 : 4200) * dt);
    e.x = clamp(e.x + e.vx * dt, 60, W - 60);
    if (!this.done && ctrl.pressed('a') && e.z <= 0.5) {
      e.vz = JUMP_V; e.combo = 0; sfx('jump', { vol: 0.6 }); a.squash(-0.25);
      particles.burst(e.x, a.y, { type: 'dust', count: 4, color: '#fff', speed: [30, 90], size: [8, 14] });
    }
    if (e.z > 0 || e.vz > 0) {
      // holding A floats a little longer (feels great, not needed)
      const g = JUMP_G * (ctrl.held('a') && e.vz > 0 ? 0.8 : 1);
      e.vz -= g * dt; e.z += e.vz * dt;
      if (e.z > MAX_Z) { e.z = MAX_Z; e.vz = Math.min(e.vz, 0); }
      if (e.z <= 0) {
        e.z = 0; e.vz = 0; a.squash(0.3); sfx('land', { vol: 0.5 });
        if (e.combo >= 3) { voice(p.charId, 'yay'); a.playOnce('cheer', 0.5); }
        e.combo = 0;
        particles.burst(e.x, a.y, { type: 'dust', count: 5, color: '#fff', speed: [40, 110], size: [8, 16] });
      }
    }
    if (this.finale && this.foam > 0.5 && e.z <= 1 && !a._once) { a.setPose(Math.abs(e.vx) > 60 ? 'swim' : 'celebrate'); if (Math.abs(e.vx) > 20) a.facing = e.vx > 0 ? 1 : -1; }
    else if (e.z > 1) { if (!a._once) a.setPose(e.vz > 0 ? 'jump' : 'fall'); if (Math.abs(e.vx) > 20) a.facing = e.vx > 0 ? 1 : -1; }
    else a.moveAnim(e.vx, 0, MAX_SPEED, { run: Math.abs(e.vx) > 380 });
  }

  pushPlayers(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const sep = (A.a.width + B.a.width) * 0.22 + 10;
      const dx = B.x - A.x;
      if (Math.abs(dx) < sep && Math.abs(A.z - B.z) < 100) {
        const dir = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx), ov = sep - Math.abs(dx), k = Math.min(1, dt * 10);
        A.x -= dir * ov * 0.5 * k; B.x += dir * ov * 0.5 * k;
      }
    }
  }

  /** Molly Easy: pick a bubble for this human and run under it; e.ezReady = "jump now!". */
  easyThink(e, dt) {
    const a = e.a;
    e.ezPick = (e.ezPick ?? 0) - dt;
    if (!e.target || e.target.dead || e.ezPick <= 0) {
      e.ezPick = 0.5;
      let best = null, bu = -1;
      for (const b of this.bubbles) {
        if (b.y < 260) continue;
        const d = Math.abs(b.x - e.x);
        const low = clamp((b.y - 380) / 400, 0, 1);
        let u = (0.4 + low) / (0.5 + d / 450) * (b.giant ? 1.4 : 1) * (b === e.target ? 1.5 : 1);
        for (const o of this.ents) if (o !== e && o.target === b) u *= 0.25;
        if (u > bu) { bu = u; best = b; }
      }
      e.target = best;
    }
    const b = e.target;
    const home = this.n === 1 ? W / 2 : 240 + ((W - 480) * e.i) / (this.n - 1);
    e.ezX = b ? clamp(b.x, 60, W - 60) : home;
    const head = a.y - a.height;
    e.ezReady = !!b && e.z <= 0.5 && Math.abs(b.x - e.x) < b.r + 40 && b.y > head - 250 && b.y < head + 20;
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl, a = e.a;
    // Molly Party: gentler than the other shelves
    const lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const slow = [0.68, 0.8, 0.9][lvl];
    if (e.brain.ready(dt)) {
      let best = null, bu = -1;
      for (const b of this.bubbles) {
        const d = Math.abs(b.x - e.x);
        const low = clamp((b.y - 380) / 400, 0, 1);
        let u = (0.4 + low) / (0.5 + d / 500) * rand(0.7, 1.3) * (b.giant ? 1.5 : 1);
        for (const o of this.ents) if (o !== e && o.target === b) u *= 0.5;
        if (u > bu) { bu = u; best = b; }
      }
      if (!best || chance(prof.mistake * 1.6 + 0.08)) { e.wander = rand(0.6, 1.4); e.wanderX = clamp(e.x + rand(-420, 420), 100, W - 100); e.target = null; }
      else { e.target = best; e.err = rand(-1, 1) * (prof.aimError + 0.15) * 90; e.wander = 0; }
      e.brain.wait(reactionTime(p) * (lvl === 0 ? 1.4 : 1.1));
    }
    let tx = null;
    if (e.wander > 0) { e.wander -= dt; tx = e.wanderX; }
    else if (e.target && !e.target.dead) tx = e.target.x + e.err;
    else e.target = null;
    if (tx === null) { ctrl.move(0, 0); return; }
    const d = Math.abs(tx - e.x);
    if (d > 30) ctrl.move(Math.sign(tx - e.x) * clamp(d / 70, 0.3, 1) * prof.speed * slow, 0); else ctrl.move(0, 0);
    const b = e.target;
    if (b && !b.dead && e.z <= 0.5) {
      const head = a.y - a.height;
      if (Math.abs(b.x - e.x) < b.r + 30 && b.y > head - 240 && b.y < head + 10 && !e.jumpWait) {
        if (chance(lvl === 0 ? 0.55 : 0.75)) ctrl.press('a');
        e.jumpWait = true; later(() => { e.jumpWait = false; }, 250 + Math.random() * 300);
      }
    }
  }

  // ------------------------------------------------------------------ finale
  startFinale() {
    this.finale = true; this.finaleT = 0; this.meter = 1;    snd('bp-bath', 'fanfare'); sfx('splash'); fx.flash('#ffffff', 0.3); fx.shake(10, 0.4); fx.slowmo(0.5, 0.6);
    particles.confettiRain(W, 120);
    for (let i = 0; i < Math.max(4, this.n + 2); i++) this.ducks.push({ x: rand(150, W - 150), vx: rand(-120, 120), t: rand(5), s: rand(0.8, 1.15) });
    for (const e of this.ents) { e.a.clearEmotes(); e.a.playOnce('celebrate', 1); voice(e.p.charId, 'woo'); }
    for (const b of this.bubbles) b.fall = 60;
  }

  finaleRain(dt) {
    this.rainT = (this.rainT || 0) - dt;
    if (this.rainT <= 0 && this.finaleT < FINALE_T - 1.2) {
      this.rainT = 0.08;
      const b = this.spawnBubble();
      b.x = rand(100, W - 100); b.y = rand(160, 320); b.vx = rand(-60, 60); b.vy = 30; b.surprise = pick(['confetti', 'star', 'duck', 'rainbow']);
    }
    if (Math.random() < dt * 30) {
      const x = rand(W), y = GROUND_Y - this.foam * 140 + rand(-30, 30);
      particles.burst(x, y, { type: 'bubble', count: 1, colors: ['#ffffff', '#d6f0ff'], size: [10, 24] });
    }
  }

  finish() {
    this.done = true;
    for (const e of this.ents) { e.a.clearEmotes(); e.a.setPose('celebrate'); }
    const total = this.ents.reduce((s, e) => s + e.pops, 0);
    this.api.finish({
      placements: this.ents.map(() => 1), showcase: true, title: 'Bubble Bath!',
      stats: this.ents.map((e) => `${e.pops} pop${e.pops === 1 ? '' : 's'}`),
      focus: { x: W / 2, y: GROUND_Y - 200, zoom: 1.12 }, total,
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    const bg = art('bg/bubble-pop');
    if (bg) g.drawImage(bg, 0, 0, W, H); else drawGarden(g, W, H, this.t);
    this.drawMachine(g);
    for (const r of this.rainbows) {
      const k = r.t / 1.6, s = 0.4 + Math.min(1, r.t * 4) * 0.7;
      g.save(); g.translate(r.x, r.y - r.t * 40); drawRainbow(g, s, k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4); g.restore();
    }
    this.drawFoam(g, false);
    for (const d of this.ducks) { g.save(); g.translate(d.x, GROUND_Y - this.foam * 120 + Math.sin(d.t * 3) * 8); g.rotate(Math.sin(d.t * 2.4) * 0.15); g.scale(d.vx < 0 ? -d.s : d.s, d.s); drawRubberDuck(g, 1); g.restore(); }
    for (const gd of this.goodies) if (gd.kind === 'frog' || gd.kind === 'duck') this.drawGoodie(g, gd);
    const order = this.ents.slice().sort((a, b) => a.a.y - b.a.y);
    for (const e of order) e.a.draw(g, { ring: this.foam > 0.3 ? null : e.p.color });
    this.drawFoam(g, true);
    for (const gd of this.goodies) if (gd.kind !== 'frog' && gd.kind !== 'duck') this.drawGoodie(g, gd);
    for (const gd of this.goodies) if (gd.kind === 'frog' && gd.onHead) this.drawGoodie(g, gd);
    for (const b of this.bubbles) this.drawBubbleEnt(g, b);
    if (this.easy && !this.finale) {
      // Molly Easy: your bubble gets a ring in your colour
      for (const e of this.ents) {
        const b = e.target;
        if (e.p.isAI || !b || b.dead) continue;
        g.save(); g.globalAlpha = 0.5 + 0.4 * Math.sin(this.t * 9 + e.i);
        g.strokeStyle = e.p.color; g.lineWidth = 8;
        g.beginPath(); g.arc(b.x, b.y, b.r * (0.75 + 0.25 * b.grow) + 14 + Math.sin(this.t * 8) * 4, 0, TAU); g.stroke(); g.restore();
      }
    }
    for (const e of order) {
      const a = e.a, top = a.y - e.z - a.height - 22 - (a.emotes.length ? 50 : 0);
      if (this.el < 6 || !e.p.isAI) ui.playerTag(g, e.p, e.x, top);
      if (this.easy && !e.p.isAI && e.ezReady && !this.finale) ui.glyph(g, 'a', e.x + 70, top - 10, 62, { pulse: true });
    }
  }

  drawMachine(g) {
    const m = this.machine;
    const bob = Math.sin(this.t * 2.2) * 8;
    g.save(); g.translate(m.x, MACHINE_Y + bob); g.rotate(clamp(m.vx / 4000, -0.08, 0.08));
    g.scale(1 + m.sq * 0.6, 1 - m.sq * 0.6); g.scale(0.85, 0.85);
    drawMachine(g, this.t, m.puff, m.wand);
    g.restore();
  }

  drawBubbleEnt(g, b) {
    g.save();
    const s = 0.3 + 0.7 * b.grow;
    const wob = Math.sin(b.age * 14) * b.wob * 0.12;
    g.translate(b.x, b.y); g.scale(s * (1 + wob), s * (1 - wob));
    // the surprise inside
    g.save(); g.globalAlpha = 0.9; g.rotate(Math.sin(b.age * 1.5) * 0.3);
    const k = b.r / 60;
    g.scale(0.55 * k, 0.55 * k);
    drawInside(g, b.surprise, b.age);
    g.restore();
    drawBubble(g, b.r, b.age + b.id, b.giant, b.hit);
    if (b.giant) {
      for (let i = 0; i < 3; i++) {
        g.save(); g.translate(-30 + i * 30, -b.r - 26);
        g.globalAlpha = i < b.hp ? 1 : 0.25; drawSparkle(g, 0, 0, 30, '#ffffff'); g.restore();
      }
    }
    g.restore();
  }

  drawGoodie(g, gd) {
    g.save(); g.translate(gd.x, gd.y);
    switch (gd.kind) {
      case 'duck': {
        const waddle = gd.waddle ? Math.sin(gd.waddle * 18) * 0.18 : Math.sin(gd.t * 20) * 0.1;
        g.rotate(waddle); g.scale(gd.vx < 0 ? -1 : 1, 1);
        drawDuckling(g, gd.waddle ? 0.2 : (Math.sin(gd.t * 30) + 1) / 2, true);
        break;
      }
      case 'star': g.rotate(gd.rot); drawStarFace(g, 0.9); break;
      case 'cupcake': drawCupcake(g, 0.8); break;
      case 'frog': {
        const hop = gd.onHead ? false : gd.y < GROUND_Y - 4;
        g.scale(gd.flip, 1); if (hop) g.rotate(clamp(gd.vy / 2000, -0.4, 0.4));
        drawFrog(g, hop, gd.onHead ? 0.7 : 0.9);
        break;
      }
      default: break;
    }
    g.restore();
  }

  drawFoam(g, front) {
    if (this.foam <= 0) return;
    const top = GROUND_Y - this.foam * (front ? 36 : 150);
    g.save();
    g.fillStyle = front ? 'rgba(255,255,255,0.92)' : 'rgba(230,245,255,0.95)';
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W + 40; x += 40) g.lineTo(x, top + Math.sin(x * 0.02 + this.t * (front ? 3 : 2)) * 14);
    g.lineTo(W, H); g.closePath(); g.fill();
    for (let i = 0; i < 46; i++) {
      const x = ((i * 97 + this.t * (front ? 30 : -20)) % (W + 120)) - 60;
      const r = front ? 16 + ((i * 37) % 16) : 26 + ((i * 37) % 30);
      g.fillStyle = front ? (i % 3 ? '#ffffff' : '#e8f6ff') : (i % 2 ? '#f2fbff' : '#ffe6f6');
      g.beginPath(); g.arc(x, top + 10 + ((i * 53) % 40) + Math.sin(this.t * 2 + i) * 6, r, 0, TAU); g.fill();
    }
    g.restore();
  }

  drawHUD(g) {
    // shared bubble meter (top centre)
    const mw = 640, mx = W / 2 - mw / 2, my = 36, mh = 60;
    const pulse = 1 + this.meterPulse * 0.04;
    g.save(); g.translate(W / 2, my + mh / 2); g.scale(pulse, pulse); g.translate(-W / 2, -(my + mh / 2));
    ui.panel(g, mx - 70, my - 12, mw + 170, mh + 24, { r: 40, fill: '#ffffff' });
    g.save(); g.translate(mx - 30, my + mh / 2); drawBubble(g, 24, this.t); g.restore();
    ui.bar(g, mx + 10, my + 8, mw - 20, mh - 16, this.meterShow, '#7fd3ff', { bg: 'rgba(36,22,63,0.12)' });
    // bubbles inside the bar
    g.save(); ui.roundRect(g, mx + 10, my + 8, (mw - 20) * clamp(this.meterShow, 0, 1), mh - 16, (mh - 16) / 2); g.clip();
    for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.arc(mx + 20 + i * 36, my + mh / 2 + Math.sin(this.t * 3 + i) * 8, 6 + (i % 3) * 3, 0, TAU); g.fill(); }
    g.restore();
    // bathtub goal at the end
    g.save(); g.translate(mx + mw + 50, my + mh / 2 + 6); drawTub(g, this.t, this.finale); g.restore();
    g.restore();
    ui.scoreboard(g, this.players, this.ents.map((e) => e.pops), { y: 985, format: (v) => String(v) });
    if (this.finale) {
      const k = this.finaleT;
      g.save(); g.globalAlpha = clamp(3.4 - k, 0, 1);
      ui.banner(g, 'Bubble Bath!', k, { y: 420, size: 150, color: '#ff8fd0' });
      g.restore();
    }
  }

  pop(e, str, color, size, side = 0) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    const a = e.a, top = a.y - e.z - a.height;
    const lvl = e.popN % 3;
    particles.popText(e.x + side * 70 + (lvl === 1 ? 34 : lvl === 2 ? -34 : 0), top - 18 - lvl * 50, str, color, size);
  }
}

function drawInside(g, kind, t) {
  switch (kind) {
    case 'duck': drawDuckling(g, (Math.sin(t * 6) + 1) / 2, false); break;
    case 'star': drawStarFace(g); break;
    case 'cupcake': drawCupcake(g); break;
    case 'frog': g.translate(0, 45); drawFrog(g, false); break;
    case 'rainbow': g.translate(0, 40); drawRainbow(g, 0.45); break;
    case 'confetti': for (let i = 0; i < 9; i++) { g.save(); g.rotate(i * 0.7 + t); g.translate(16 + (i % 3) * 10, 0); g.fillStyle = RAINBOW[i % RAINBOW.length]; g.fillRect(-7, -3, 14, 6); g.restore(); } break;
    case 'giant': g.scale(1.4, 1.4); drawDuckling(g, 0.5); g.translate(-50, 20); g.scale(0.6, 0.6); drawStarFace(g); g.translate(170, 10); drawCupcake(g); break;
    default: break;
  }
}

function drawTub(g, t, full) {
  g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = '#24163f';
  if (full || true) {
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-26 + i * 13, -16 - (full ? Math.sin(t * 6 + i) * 4 + 6 : 0), 10, 0, TAU); g.fill(); }
  }
  ui.roundRect(g, -38, -16, 76, 34, 14); g.fillStyle = '#ff9ccf'; g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(-34, 22, 5, 0, TAU); g.arc(34, 22, 5, 0, TAU); g.fill();
}
