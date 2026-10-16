// Balloon Float (Molly Party) - everybody flies a bunch of balloons over a
// meadow while the breeze rushes the sky past. Hold A (or push up) to zoom
// up, let go to swoop down; the grass is a big friendly BOING. Grab the
// hearts and stars streaming by, burst through giggly face-clouds (they
// sneeze out hearts), and wave back at the birds (they drop a heart). Gusts
// whoosh everything past, and the last 10 seconds are a Star Shower.
//
// Art hooks (all optional, procedural fallbacks ship today):
//   bg/balloon-float (tiles left-right)  prop/balloon-pink|blue|yellow|mint|purple
//   prop/float-heart  prop/float-star  prop/float-golden-star
//   prop/cloud-face  prop/cloud-face-giggle  prop/bird-fly  prop/bird-wave
// SFX hooks (file if present, else the synth named second):
//   bf-boing>boing  bf-gust>whoosh  bf-cloud-giggle>giggle  bf-chirp>note  bf-heart>collect
//   bf-golden>golden-chime  bf-shower>fanfare  bf-rise>balloon-stretch
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { clamp, approach, rand, randInt, pick, chance, TAU, placementsFromScores } from '../engine/util.js';
import { BALLOONS, drawBalloon, drawHeart, drawStar, drawGoldenStar, drawFaceCloud, drawBird, drawSky } from './balloon-float/art.js';

const snd = (k, fb, o = {}) => sfx(k, { ...o, fallback: fb });

export const meta = {
  id: 'balloon-float',
  title: 'Balloon Float',
  category: 'molly',
  type: 'Free-for-all',
  goal: 'Fly with your balloons and grab the hearts and stars!',
  controls: [['stick', 'Fly left and right'], ['a', 'Hold to go up, let go to go down']],
  tips: ['Big gold stars are worth 3!', 'Bump through the silly clouds - they sneeze out hearts.', 'Touch the grass for a big BOING!'],
  goalEasy: 'Hold A to float up and let go to float down - grab the hearts and stars flying by!',
  controlsEasy: [['a', 'Hold to go up, let go to go down']],
  tipsEasy: ['The ring shows your next heart - the arrow says up or down!', 'Treats only come to you after you press A!', 'Big gold stars are worth 3!', 'Touch the grass for a big BOING!'],
  music: 'chase',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const thumb = art('thumb/balloon-float');
    if (thumb) { g.drawImage(thumb, x, y, w, h); g.restore(); return; }
    const s = w / 400; g.translate(x, y); g.scale(s, s);
    const hh = h / s;
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#6cc6ff'); gr.addColorStop(1, '#ffe6d0');
    g.fillStyle = gr; g.fillRect(0, 0, 400, hh);
    g.fillStyle = '#62c95a'; g.fillRect(0, hh * 0.86, 400, hh);
    g.save(); g.translate(300, hh * 0.3); drawFaceCloud(g, 0.3, Math.sin(t * 2) > 0.3 ? 1 : 0, t, 1); g.restore();
    // a bunch of balloons
    const bx = 170, by = hh * 0.36 + Math.sin(t * 2) * 6;
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.32;
      g.strokeStyle = 'rgba(36,22,63,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx, by + 90); g.lineTo(bx + Math.sin(a) * 50, by + 30 - Math.cos(a) * 30); g.stroke();
      g.save(); g.translate(bx + Math.sin(a) * 50, by + 30 - Math.cos(a) * 30); g.rotate(a * 0.6); drawBalloon(g, BALLOONS[i], 0.6); g.restore();
    }
    for (let i = 0; i < 4; i++) { g.save(); g.translate(((i * 110 - t * 80) % 440 + 440) % 440 - 20, hh * 0.6 + (i % 2) * 40); if (i % 2) drawStar(g, 0.4); else drawHeart(g, 0.4); g.restore(); }
    g.save(); g.translate(80, hh * 0.2); g.scale(0.5, 0.5); drawBird(g, t * 12, Math.sin(t * 2) > 0); g.restore();
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 45;
const SHOWER_AT = 10;
const GROUND = 958;           // feet bounce here
const TOP = 150;              // balloons can't go above this
const SPEED_X = 600;
const RISE = 560, SINK = 420;
const WIND = 260;
const VALUE = { heart: 1, star: 1, gold: 3 };
const CLOUD_MOODS = 3;
const EASY_GRAB = 3;          // Molly Easy: treats come to you while A is held and this long after

let serial = 0;

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: humans keep their spot in the sky by themselves, A is up/down
    this.players = api.players;
    const n = this.n = this.players.length;
    this.t = 0; this.el = 0; this.timeLeft = DURATION;
    this.scale = n <= 2 ? 0.95 : n <= 4 ? 0.85 : n <= 6 ? 0.76 : 0.68;
    this.scroll = 0; this.wind = WIND; this.gust = 0; this.gustT = rand(7, 9);
    this.items = []; this.clouds = []; this.birds = []; this.streaks = [];
    this.itemT = 0.5; this.patternT = 2.5; this.goldT = rand(6, 8); this.cloudT = 1.5; this.birdT = rand(3, 5);
    this.shower = false; this.showerT = 0;
    this.done = false;
    // a couple of clouds already in the sky at the start
    this.spawnCloud(W * 0.55); this.spawnCloud(W * 1.05);
    this.ents = this.players.map((p, i) => {
      const a = new Actor(p, { scale: this.scale, x: 0, y: 0 });
      if (a.height < 105 * this.scale) a.scale *= (105 * this.scale) / a.height;   // tiny avatars (fairies) stay readable
      const cols = Math.min(n, 4), row = Math.floor(i / 4), col = i % 4;
      const x = n === 1 ? 560 : 260 + col * ((W * 0.62 - 260) / Math.max(1, cols - 1)) + row * 90;
      const y = n <= 4 ? 520 + (i % 2) * 120 : 420 + row * 300 + (col % 2) * 60;
      a.x = x; a.y = y; a.facing = 1; a.snap(); a.setPose('float');
      const balloons = Array.from({ length: 5 }, (_, k) => ({ b: BALLOONS[(k + i) % BALLOONS.length], ang: (k - 2) * 0.34, len: 0.9 + (k % 2) * 0.18, sw: rand(TAU), sq: 0 }));
      return { p, a, i, x, y, vx: 0, vy: 0, score: 0, streak: 0, streakT: 0, popN: 0, popT: 0, boingT: 0, lean: 0, balloons, brain: new Brain(p), target: null, err: 0, wander: 0, wx: x, wy: y, upHold: false, cloudCd: new Map(), homeX: x, ezHint: null };
    });
  }

  // geometry: balloon bunch centre above the head
  bunch(e) {
    const a = e.a, s = this.scale;
    return { x: e.x - a.facing * 14 * s - e.vx * 0.03, y: e.y - a.height - 105 * s };
  }
  body(e) { return { x: e.x, y: e.y - e.a.height * 0.55 }; }
  topExtent(e) { return e.a.height + 175 * this.scale; }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    this.scroll += this.wind * 0.5 * dt;
    for (const e of this.ents) { e.y += Math.sin(this.t * 2 + e.i) * 12 * dt; this.updateBalloons(e, dt); e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
    this.moveWorld(dt * 0.5);
  }

  update(dt) {
    this.t += dt; this.el += dt;
    this.timeLeft = Math.max(0, DURATION - this.el);
    if (!this.shower && this.timeLeft <= SHOWER_AT) this.startShower();
    if (this.shower) this.showerT += dt;
    // wind + gusts
    this.gustT -= dt;
    if (this.gustT <= 0 && !this.done) { this.gustT = rand(8, 11); this.gust = 2.2; snd('bf-gust', 'whoosh'); fx.shake(4, 0.3); for (let i = 0; i < 14; i++) this.streaks.push({ x: W + rand(0, 600), y: rand(150, 900), len: rand(120, 300), v: rand(1400, 2000) }); }
    this.gust = Math.max(0, this.gust - dt);
    const target = WIND + (this.gust > 0 ? 300 : 0) + (this.shower ? 90 : 0);
    this.wind = approach(this.wind, target, 500 * dt);
    this.scroll += this.wind * dt;
    if (!this.done) this.spawning(dt);
    this.moveWorld(dt);
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.pushPlayers(dt);
    if (!this.done) { this.collect(); this.cloudBumps(); this.birdWaves(); }
    for (const e of this.ents) { this.updateBalloons(e, dt); e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    this.scroll += this.wind * 0.6 * dt;
    this.moveWorld(dt * 0.6);
    for (const e of this.ents) { e.vy = approach(e.vy, 0, 600 * dt); e.y += e.vy * dt; this.updateBalloons(e, dt); e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
  }

  startShower() {
    this.shower = true; this.showerT = 0;
    snd('bf-shower', 'fanfare'); sfx('magic'); fx.flash('#fff3b0', 0.25); fx.shake(8, 0.3);
    particles.confettiRain(W, 80);
    for (const e of this.ents) e.a.emote('star', 1.2);
  }

  // ------------------------------------------------------------------ spawning
  spawning(dt) {
    const n = this.n;
    const rate = (0.65 + 0.24 * n) * (this.shower ? 1.7 : 1);
    this.itemT -= dt;
    if (this.itemT <= 0) {
      this.itemT = (1 / rate) * rand(0.7, 1.3);
      if (this.shower) this.spawnItem(chance(0.65) ? 'star' : 'heart', rand(W * 0.3, W + 40), -40, { fallVy: rand(160, 260) });
      else this.spawnItem(chance(0.62) ? 'heart' : 'star', W + 60, rand(220, 880));
    }
    // patterns: a wavy line or a ring around a golden star
    this.patternT -= dt;
    if (this.patternT <= 0) {
      this.patternT = rand(3.2, 4.6) - Math.min(1.2, n * 0.12);
      const y0 = rand(300, 780), kind = chance(0.5) ? 'heart' : 'star';
      if (chance(0.7)) {
        const amp = rand(60, 140), ph = rand(TAU);
        for (let k = 0; k < 6; k++) this.spawnItem(kind, W + 60 + k * 90, y0 + Math.sin(ph + k * 0.8) * amp);
      } else {
        for (let k = 0; k < 6; k++) this.spawnItem(kind, W + 160 + Math.cos(k * TAU / 6) * 120, y0 + Math.sin(k * TAU / 6) * 120);
        this.spawnItem('gold', W + 160, y0);
      }
    }
    this.goldT -= dt;
    if (this.goldT <= 0) { this.goldT = this.shower ? rand(2.5, 3.5) : rand(6, 8); const it = this.spawnItem('gold', W + 80, rand(250, 820)); particles.popText(W - 160, it.y, '★', '#ffd23f', 60); snd('bf-golden', 'golden-chime', { vol: 0.6 }); }
    this.cloudT -= dt;
    if (this.cloudT <= 0) { this.cloudT = rand(3.2, 4.6); this.spawnCloud(W + 260); }
    this.birdT -= dt;
    if (this.birdT <= 0) {
      this.birdT = rand(4, 6.5);
      const y = rand(240, 760), cnt = randInt(1, 3), col = pick(['#5ab8ff', '#ff8fc7', '#ffd23f', '#9be37a']);
      for (let k = 0; k < cnt; k++) this.birds.push({ x: W + 80 + k * 110, y: y + (k % 2) * 60, vx: -rand(120, 200), t: rand(5), wave: 0, waved: new Set(), col, gave: 0 });
    }
  }

  spawnItem(kind, x, y, o = {}) {
    const it = { id: serial++, kind, x, y, vy: o.fallVy || 0, vx: o.fallVy ? -rand(60, 140) : 0, t: rand(5), r: kind === 'gold' ? 64 : 38, dead: false, homing: null };
    this.items.push(it);
    return it;
  }

  spawnCloud(x) {
    const s = rand(0.85, 1.3);
    this.clouds.push({ x, y: rand(280, 760), s, giggle: 0, sq: 0, mood: randInt(0, CLOUD_MOODS - 1), t: rand(5), sneezes: 0 });
  }

  moveWorld(dt) {
    for (const it of this.items) {
      it.t += dt;
      if (it.homing) {
        // a heart gift drifting to a player
        const e = it.homing, b = this.body(e);
        it.x += (b.x - it.x) * Math.min(1, dt * 3); it.y += (b.y - it.y) * Math.min(1, dt * 3);
      } else {
        if (it.drag) { const k = Math.exp(-2 * dt); it.vx *= k; it.vy *= k; }
        it.x += (-this.wind * (it.kind === 'gold' ? 0.8 : 1) + it.vx) * dt;
        it.y += (it.vy + Math.cos(it.t * 2.2 + it.id) * 30) * dt;
        if (this.easy && !this.done) {
          // Molly Easy: treats close to a human's balloons drift in to meet the nearest one
          let bx = 0, by = 0, best = 230;
          for (const e of this.ents) {
            if (e.p.isAI || !this.ezGrab(e)) continue;
            const b = this.body(e), d = Math.hypot(b.x - it.x, b.y - it.y);
            if (d < best && d > 1) { best = d; bx = b.x; by = b.y; }
          }
          if (best < 230) { const k = Math.min(1, dt * 2.6); it.x += (bx - it.x) * k * 0.5; it.y += (by - it.y) * k; }
        }
      }
      if (it.x < -100 || it.y > H + 80 || it.t > 30) it.dead = true;
    }
    this.items = this.items.filter((it) => !it.dead);
    for (const c of this.clouds) { c.t += dt; c.x -= this.wind * 0.75 * dt; c.giggle = Math.max(0, c.giggle - dt); c.sq = approach(c.sq, 0, dt * 2); }
    this.clouds = this.clouds.filter((c) => c.x > -300);
    for (const b of this.birds) { b.t += dt; b.x += (b.vx - this.wind * 0.4) * dt; b.y += Math.sin(b.t * 3) * 30 * dt; b.wave = Math.max(0, b.wave - dt); }
    this.birds = this.birds.filter((b) => b.x > -120);
    for (const s of this.streaks) s.x -= s.v * dt;
    this.streaks = this.streaks.filter((s) => s.x + s.len > -50);
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const p = e.p, a = e.a, ctrl = p.ctrl;
    e.popT = Math.max(0, e.popT - dt); e.streakT = Math.max(0, e.streakT - dt); e.boingT = Math.max(0, e.boingT - dt);
    if (e.streakT <= 0) e.streak = 0;
    const easy = this.easy && !p.isAI;
    if (easy && !this.done) { this.easyLook(e); e.ezA = ctrl.held('a') ? 0 : (e.ezA ?? 9) + dt; }
    let inX = this.done ? 0 : ctrl.x;
    if (easy && !this.done) {
      // drift toward the next treat, but stay near your own patch of sky
      const want = e.target && !e.target.dead ? clamp(e.target.x - this.wind * 0.25, 120, W * 0.8) : e.homeX;
      const dx = want - e.x;
      inX = Math.abs(dx) > 20 ? Math.sign(dx) * clamp(Math.abs(dx) / 200, 0.2, 0.7) : 0;
    }
    e.vx = approach(e.vx, inX * SPEED_X, 2600 * dt);
    const up = !this.done && (ctrl.held('a') || (!easy && ctrl.y < -0.5));
    const down = !this.done && !easy && ctrl.y > 0.5;
    if (up && !e.upHold) { snd('bf-rise', 'whoosh', { vol: 0.25, rate: 1.4 }); for (const bl of e.balloons) bl.sq = -0.15; }
    e.upHold = up;
    if (up) e.vy = approach(e.vy, -RISE, 2000 * dt);
    else e.vy = approach(e.vy, SINK * (down ? 1.5 : 1), 1250 * dt);
    if (this.gust > 0) e.vx -= 140 * dt;
    e.x = clamp(e.x + e.vx * dt, 90, W - 90);
    e.y += e.vy * dt;
    // ceiling: the balloons squish against the top of the sky
    const minY = TOP + this.topExtent(e);
    if (e.y < minY) { e.y = minY; if (e.vy < -200) { for (const bl of e.balloons) bl.sq = 0.3; sfx('bounce', { vol: 0.3 }); } e.vy = Math.max(e.vy, 60); }
    // the grass: a big friendly BOING
    if (e.y > GROUND) {
      e.y = GROUND; e.vy = -820; e.boingT = 0.5;
      snd('bf-boing', 'boing'); a.squash(0.45); a.playOnce('surprised', 0.35, 'float');
      particles.burst(e.x, GROUND, { type: 'petal', count: 8, colors: ['#ff8fc7', '#ffe066', '#ffffff', '#c9a0ff'] });
      particles.burst(e.x, GROUND, { type: 'dust', count: 5, color: '#ffffff' });
      particles.popText(e.x, GROUND - a.height - 40, 'BOING!', '#7fe0ff', 46);
      if (chance(0.5)) voice(p.charId, 'woo');
      if (!p.isAI) ctrl.rumble(0.4, 120);
    }
    if (Math.abs(e.vx) > 30) a.facing = e.vx > 0 ? 1 : -1;
    e.lean = approach(e.lean, clamp(e.vx / SPEED_X, -1, 1) * 0.12, dt * 1.5);
    if (!a._once && !this.done) a.setPose('float');
    a.speed = 0.5;
  }

  updateBalloons(e, dt) {
    for (const bl of e.balloons) { bl.sw += dt * (1.6 + Math.abs(e.vx) / 400); bl.sq = approach(bl.sq, 0, dt * 1.2); }
  }

  pushPlayers(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const ba = this.body(A), bb = this.body(B);
      const dx = bb.x - ba.x, dy = bb.y - ba.y, d = Math.hypot(dx, dy) || 1;
      const sep = (A.a.width + B.a.width) * 0.3 + 30;
      if (d < sep) {
        const ov = (sep - d) / d, k = Math.min(1, dt * 8);
        A.x -= dx * ov * 0.5 * k; B.x += dx * ov * 0.5 * k; A.y -= dy * ov * 0.3 * k; B.y += dy * ov * 0.3 * k;
        if (sep - d > 30 && this.t - (A.bumpAt || -9) > 0.7 && this.t - (B.bumpAt || -9) > 0.7) {
          A.bumpAt = B.bumpAt = this.t;
          sfx('bounce', { vol: 0.35, rate: 1.3 }); A.a.squash(0.2); B.a.squash(0.2);
          particles.burst((ba.x + bb.x) / 2, (ba.y + bb.y) / 2, { type: 'heart', count: 2 });
        }
      }
    }
  }

  // ------------------------------------------------------------------ pickups
  collect() {
    for (const it of this.items) {
      if (it.dead) continue;
      let best = null, bd = 1e9;
      for (const e of this.ents) {
        if (this.easy && !e.p.isAI && !this.ezGrab(e)) continue;   // Molly Easy: bobbing about idle doesn't grab
        const b = this.body(e), u = this.bunch(e);
        const big = this.easy && !e.p.isAI ? 1.3 : 1;   // Molly Easy: a more generous grab
        const rb = (it.r + this.scale * 62) * big, ru = (it.r + this.scale * 70) * big;
        const d1 = Math.hypot(it.x - b.x, it.y - b.y), d2 = Math.hypot(it.x - u.x, it.y - u.y);
        const d = Math.min(d1 / rb, d2 / ru);
        if (d < 1 && d < bd) { bd = d; best = e; }
      }
      if (best) this.grab(best, it);
    }
  }

  grab(e, it) {
    it.dead = true;
    const v = VALUE[it.kind];
    e.score += v;
    e.streak = e.streakT > 0 ? e.streak + 1 : 1; e.streakT = 1.2;
    const a = e.a;
    a.squash(0.2);
    if (it.kind === 'gold') {
      snd('bf-golden', 'golden-chime'); sfx('sparkle'); voice(e.p.charId, 'yay');
      particles.burst(it.x, it.y, { type: 'star', count: 16, colors: ['#ffd23f', '#fff6a8', '#ffffff'] });
      fx.flash('#fff3b0', 0.12); fx.shake(6, 0.2); fx.hitstop(0.04);
      this.api.camera && this.api.camera.punch(e.x, e.y - a.height, 1.12, 0.35);
      a.playOnce('cheer', 0.6, 'float'); a.emote('sparkle', 1.1);
      this.pop(e, '+3', '#ffd23f', 70);
      if (!e.p.isAI) e.p.ctrl.rumble(0.5, 150);
    } else {
      snd('bf-heart', 'collect', { step: Math.min(e.streak - 1, 14) });
      particles.burst(it.x, it.y, { type: it.kind === 'heart' ? 'heart' : 'star', count: 5, colors: it.kind === 'heart' ? ['#ff5fa2', '#ffb3d9'] : ['#ffd23f', '#fff6a8'] });
      this.pop(e, '+1', it.kind === 'heart' ? '#ff6fb1' : '#ffd23f', 46);
      if (e.streak === 4 || e.streak === 6 || e.streak === 9) { this.pop(e, `x${e.streak}!`, RAINBOW[e.streak % 7], 50, 1); a.playOnce('cheer', 0.45, 'float'); sfx('yay', { vol: 0.5 }); }
    }
  }

  cloudBumps() {
    for (const c of this.clouds) {
      for (const e of this.ents) {
        const b = this.body(e);
        const dx = (b.x - c.x) / (150 * c.s), dy = (b.y - c.y) / (85 * c.s);
        if (dx * dx + dy * dy > 1) continue;
        const last = e.cloudCd.get(c) || -9;
        if (this.t - last < 1.2) continue;
        e.cloudCd.set(c, this.t);
        c.giggle = 1.1; c.sq = 0.35;
        snd('bf-cloud-giggle', 'giggle'); sfx('pop', { vol: 0.35 });
        particles.burst(b.x, b.y, { type: 'smoke', count: 8, colors: ['#ffffff', '#eef6ff'] });
        e.vy *= 0.4; e.a.playOnce('giggle', 0.6, 'float');
        // the cloud sneezes out a couple of hearts (only the first few bumps)
        if (c.sneezes < 1) {
          c.sneezes++;
          // flung up and out of the cloud, so you have to chase them a little
          for (let k = 0; k < 2; k++) { const h = this.spawnItem('heart', c.x + (k ? 1 : -1) * 110 * c.s, c.y - 90 * c.s); h.vx = (k ? 1 : -1) * rand(160, 240); h.vy = -rand(160, 240); h.drag = true; }
          particles.popText(c.x, c.y - 120 * c.s, 'Achoo!', '#ffffff', 46);
        }
      }
    }
  }

  birdWaves() {
    for (const b of this.birds) {
      for (const e of this.ents) {
        if (b.waved.has(e)) continue;
        const bd = this.body(e);
        if (Math.hypot(b.x - bd.x, b.y - bd.y) > 230) continue;
        b.waved.add(e); b.wave = 1.0;
        snd('bf-chirp', 'note', { midi: 88 + randInt(0, 4), dur: 0.12, vol: 0.25 });
        if (!e.waveCd || this.t - e.waveCd > 2) { e.waveCd = this.t; e.a.playOnce('wave', 0.7, 'float'); }
        if (b.gave < 2) { b.gave++; const h = this.spawnItem('heart', b.x, b.y + 20); h.homing = e; }
      }
    }
  }

  /** Molly Easy: is A held now, or was it a moment ago? (the grab and the treat magnet need it) */
  ezGrab(e) { return (e.ezA ?? 9) < EASY_GRAB; }

  /** Molly Easy: the next treat coming at this human, and whether to go up or down for it. */
  easyLook(e) {
    const b = this.body(e);
    if (!e.target || e.target.dead || e.target.homing || e.target.x < b.x - 40) {
      let best = null, bd = Infinity;
      for (const it of this.items) {
        if (it.homing || it.dead || it.x < b.x - 20 || it.x > b.x + 900) continue;
        let d = (it.x - b.x) + Math.abs(it.y - b.y) * 0.6;
        if (this.ents.some((o) => o !== e && o.target === it)) d += 500;
        if (d < bd) { bd = d; best = it; }
      }
      e.target = best;
    }
    const it = e.target;
    e.ezHint = !it ? null : it.y < b.y - 50 ? 'up' : it.y > b.y + 50 ? 'down' : 'ok';
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl;
    const lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const slow = [0.62, 0.76, 0.88][lvl];
    if (e.brain.ready(dt)) {
      let best = null, bu = 0;
      const b = this.body(e);
      for (const it of this.items) {
        if (it.homing || it.x < b.x - 80) continue;
        const lead = Math.max(0, it.x - b.x) / (this.wind + 300);
        const px = it.x - this.wind * lead, py = it.y;
        const d = Math.hypot(px - b.x, py - b.y);
        let u = VALUE[it.kind] / (0.4 + d / 400) * rand(0.7, 1.3);
        for (const o of this.ents) if (o !== e && o.target === it) u *= 0.4;
        if (u > bu) { bu = u; best = it; }
      }
      // Molly Party CPUs daydream a lot (Easy most of all) so little players keep up
      if (!best || chance(prof.mistake * 2.4 + 0.12)) { e.target = null; e.wander = rand(0.8, 1.6) * (lvl === 0 ? 1.6 : 1); e.wx = rand(200, W * 0.75); e.wy = rand(320, 860); }
      else { e.target = best; e.err = rand(-1, 1) * (prof.aimError + 0.2) * 120; e.wander = 0; }
      e.brain.wait(reactionTime(p) * (lvl === 0 ? 1.4 : 1.1));
    }
    let tx, ty;
    if (e.target && !e.target.dead) { tx = e.target.x - this.wind * 0.25; ty = e.target.y + e.err; }
    else { if (e.wander > 0) e.wander -= dt; tx = e.wx; ty = e.wy; }
    const b = this.body(e);
    const dx = tx - b.x;
    ctrl.move(Math.abs(dx) > 30 ? Math.sign(dx) * clamp(Math.abs(dx) / 160, 0.3, 1) * prof.speed * slow : 0, 0);
    // vertical: hold A when the target is above, with a little hysteresis
    const dy = ty - b.y;
    if (dy < -40) e.upHold2 = true; else if (dy > 30) e.upHold2 = false;
    ctrl.hold('a', !!e.upHold2);
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    const scores = this.ents.map((e) => e.score);
    const placements = placementsFromScores(scores);
    const top = Math.max(...scores);
    this.ents.forEach((e, i) => {
      e.a.clearEmotes();
      e.a.setPose(scores[i] === top || this.n === 1 ? 'celebrate' : placements[i] <= 3 ? 'cheer' : 'float');    });
    const wi = scores.indexOf(top), w = this.ents[wi];
    this.api.finish({ placements, stats: scores.map((s) => `${s} ♥`), solo: scores[0], focus: { x: w.x, y: w.y - w.a.height } });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    drawSky(g, W, H, this.t, this.scroll, GROUND + 4);
    if (this.shower) {
      g.save(); g.globalAlpha = 0.35 * clamp(this.showerT, 0, 1); g.lineWidth = 34;
      ['#ff6f91', '#ffb86f', '#ffe66f', '#8be8b8', '#7fd3ff', '#c9a0ff'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(W / 2, 1150, 900 - i * 34, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); });
      g.restore();
    }
    // wind streaks
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineCap = 'round'; g.lineWidth = 6;
    for (const s of this.streaks) { g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + s.len, s.y); g.stroke(); }
    g.restore();
    for (const c of this.clouds) {
      g.save(); g.translate(c.x, c.y + Math.sin(c.t * 1.3) * 8);
      g.scale(1 + c.sq * 0.25, 1 - c.sq * 0.2);
      drawFaceCloud(g, c.s, c.giggle, c.t, c.mood);
      g.restore();
    }
    for (const b of this.birds) {
      g.save(); g.translate(b.x, b.y); g.scale(0.95, 0.95);
      drawBird(g, b.t * 14, b.wave > 0, b.col);
      g.restore();
    }
    for (const it of this.items) this.drawItem(g, it);
    const order = this.ents.slice().sort((a, b) => a.y - b.y);
    for (const e of order) this.drawPlayer(g, e);
    for (const e of order) {
      const u = this.bunch(e);
      const show = this.el < 5 || !e.p.isAI;
      if (show) ui.playerTag(g, e.p, u.x, u.y - 70 * this.scale - 8);
    }
    if (this.easy && !this.done) {
      // Molly Easy: a ring on your next treat, an arrow saying up (hold A) or down (let go),
      // and a big A whenever A hasn't been pressed lately (treats only come to you after A)
      for (const e of this.ents) {
        if (e.p.isAI) continue;
        const it = e.target;
        if (it && !it.dead && !it.homing) {
          g.save(); g.globalAlpha = 0.55 + 0.35 * Math.sin(this.t * 9 + e.i);
          g.strokeStyle = e.p.color; g.lineWidth = 7;
          g.beginPath(); g.arc(it.x, it.y, it.r + 18 + Math.sin(this.t * 8) * 4, 0, TAU); g.stroke(); g.restore();
        }
        if (e.ezHint === 'up' || e.ezHint === 'down') {
          const b = this.body(e), x = b.x + e.a.width * 0.5 + 60, dir = e.ezHint === 'up' ? -1 : 1;
          const y = b.y + dir * Math.abs(Math.sin(this.t * 6)) * 16;
          g.save(); g.translate(x, y); g.fillStyle = e.p.color; g.strokeStyle = '#24163f'; g.lineWidth = 5;
          g.beginPath(); g.moveTo(-24, -dir * 4); g.lineTo(24, -dir * 4); g.lineTo(0, dir * 34); g.closePath(); g.fill(); g.stroke(); g.restore();
          if ((e.ezHint === 'up' || !this.ezGrab(e)) && !e.p.ctrl.held('a')) ui.glyph(g, 'a', x, y - 62, 52, { pulse: true });
        } else if (it && !this.ezGrab(e) && !e.p.ctrl.held('a')) {
          // right on course but A hasn't been pressed lately: the grab needs it
          const b = this.body(e);
          ui.glyph(g, 'a', b.x + e.a.width * 0.5 + 60, b.y - 40, 52, { pulse: true });
        }
      }
    }
  }

  drawItem(g, it) {
    g.save(); g.translate(it.x, it.y);
    if (it.kind === 'heart') { g.rotate(Math.sin(it.t * 3) * 0.15); const s = 1 + Math.sin(it.t * 6) * 0.06; drawHeart(g, s); }
    else if (it.kind === 'star') { g.rotate(it.t * 2); drawStar(g, 1); }
    else { g.rotate(Math.sin(it.t * 2) * 0.2); drawGoldenStar(g, 1, it.t); if (Math.random() < 0.3) particles.burst(it.x + rand(-50, 50), it.y + rand(-50, 50), { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffffff'], size: [10, 18] }); }
    g.restore();
  }

  drawPlayer(g, e) {
    const a = e.a, s = this.scale;
    const hand = a.anchor('hand');
    const u = this.bunch(e);
    // shadow on the meadow, smaller the higher you are
    const hgt = clamp((GROUND - e.y) / 700, 0, 1);
    g.save(); g.globalAlpha = 0.22 * (1 - hgt * 0.6); g.fillStyle = '#24502a';
    g.beginPath(); g.ellipse(e.x, GROUND + 26, (60 - hgt * 30) * s, 12 * s, 0, 0, TAU); g.fill(); g.restore();
    // strings + balloons (behind the character, so the hand holds them)
    const pts = e.balloons.map((bl) => {
      const sway = Math.sin(bl.sw) * 0.12 - e.vx / 3000;
      const ang = bl.ang + sway;
      return { bl, x: u.x + Math.sin(ang) * 62 * s * bl.len, y: u.y - Math.cos(ang) * 46 * s * bl.len + (e.vy / 30) * s, ang };
    });
    g.save(); g.strokeStyle = 'rgba(36,22,63,0.75)'; g.lineWidth = 2;
    for (const q of pts) { g.beginPath(); g.moveTo(hand.x, hand.y); g.quadraticCurveTo((hand.x + q.x) / 2 + Math.sin(q.bl.sw) * 8, (hand.y + q.y) / 2, q.x, q.y); g.stroke(); }
    g.restore();
    for (const q of pts) {
      g.save(); g.translate(q.x, q.y); g.rotate(q.ang * 0.7);
      g.scale(1 + q.bl.sq * 0.4, 1 - q.bl.sq * 0.4);
      drawBalloon(g, q.bl.b, s * 0.95);
      g.restore();
    }
    // ribbon bow in the player's colour at the hand
    g.save(); g.translate(hand.x, hand.y); g.fillStyle = e.p.color; g.strokeStyle = '#24163f'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -8); g.lineTo(-12, 8); g.closePath(); g.moveTo(0, 0); g.lineTo(12, -8); g.lineTo(12, 8); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.stroke();
    g.restore();
    g.save(); g.translate(e.x, e.y); g.rotate(e.lean); g.translate(-e.x, -e.y);
    a.draw(g, { ring: null, shadow: false });
    g.restore();
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 40, avoidCenter: true, format: (v) => String(v) });
    if (this.gust > 1.4) {
      g.save(); g.globalAlpha = clamp((this.gust - 1.4) * 2, 0, 1);
      ui.text(g, 'Whoosh!', W / 2, 220, { size: 70, color: '#ffffff', weight: 800 });
      g.restore();
    }
    if (this.shower && this.showerT < 2.4) {
      g.save(); g.globalAlpha = clamp(2.4 - this.showerT, 0, 1);
      ui.banner(g, 'Star Shower!', this.showerT, { y: 480, size: 150, color: '#ffd23f' });
      g.restore();
    }
  }

  pop(e, str, color, size, side = 0) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    const u = this.bunch(e);
    const lvl = e.popN % 3;
    particles.popText(u.x + side * 70 + (lvl === 1 ? 34 : lvl === 2 ? -34 : 0), u.y - 90 * this.scale - lvl * 46, str, color, size);
  }
}

