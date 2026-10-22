// Pumpkin Peekaboo (Molly Party) - silly jack-o'-lanterns pop up out of the
// holes in a moonlit pumpkin patch. Dash over and press A to BOOP one: it
// giggles, pulls a new face and spits candy into your trick-or-treat bucket.
// Golden pumpkins make it rain candy for everybody, and sometimes a kitty in a
// witch hat pops up instead (boop it and it purrs and gives a big lollipop).
// The last 12 seconds are a Pumpkin Party: pumpkins pop up everywhere.
// No penalties: a missed pumpkin just blows a raspberry and ducks.
//
// Art hooks (all optional; the procedural drawings below ship today):
//   bg/pumpkin-peekaboo  thumb/pumpkin-peekaboo  prop/pp-hole
//   prop/pp-pumpkin-1..4  prop/pp-pumpkin-giggle  prop/pp-pumpkin-golden(-giggle)
//   prop/pp-witch-cat(-purr)  prop/pp-candy-1..4  prop/pp-bucket
// New-pose hook: 'boop' -> high-five -> action.
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, Brain, steer } from '../engine/ai.js';
import { easySteer } from '../engine/easy.js';
import { drawSparkleShape, drawHeartShape } from '../engine/emotes.js';
import { clamp, lerp, rand, randInt, pick, chance, TAU, ease, placementsFromScores } from '../engine/util.js';
import { drawPumpkin, drawCandy, drawBucket, drawBat, drawPatchBackground, drawMoonFace } from './pumpkin-peekaboo/art.js';

const NAVY = '#24163f';
// prop/pp-hole (320x160, drawn 200x100 centred on the hole): the dark opening is an ellipse
// centred at art (162, 72), radii (65, 41) - measured from the art's interior colour.
function holeOpening(h, s) {
  const k = 200 * s / 320;
  return { cx: h.x + (162 - 160) * k, cy: h.y + (72 - 80) * k, rx: 65 * k, ry: 41 * k };
}
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

export const meta = {
  id: 'pumpkin-peekaboo',
  title: 'Pumpkin Peekaboo',
  category: 'molly',
  type: 'Candy hunt',
  goal: 'Boop the silly pumpkins to get candy!',
  controls: [['stick', 'Run around the patch'], ['a', 'Boop!']],
  tips: ['Run to a pumpkin and press A. Boop boop!', 'Golden pumpkins make it rain candy for everyone!', 'Boop the kitty in the witch hat for a big lollipop.'],
  // Molly Easy: you walk to the pumpkins by yourself; A boops
  goalEasy: 'You walk to the pumpkins by yourself. Press A to boop them!',
  controlsEasy: [['a', 'Boop! (A runs you to the nearest pumpkin)'], ['stick', 'Move with either stick if you like']],
  tipsEasy: ['Press A when the big A bounces. Boop boop!', 'Want a different pumpkin? Walk over with the stick, then press A!', 'Golden pumpkins make it rain candy for everyone!'],
  music: 'spooky',
  duration: '45 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = w / 400, hh = h / s;
    g.translate(x, y); g.scale(s, s);
    const sky = g.createLinearGradient(0, 0, 0, hh);
    sky.addColorStop(0, '#22185a'); sky.addColorStop(0.55, '#6a3f9c'); sky.addColorStop(0.56, '#3f6e36'); sky.addColorStop(1, '#2c5128');
    g.fillStyle = sky; g.fillRect(0, 0, 400, hh);
    g.fillStyle = '#fff';
    for (let i = 0; i < 18; i++) { g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 3 + i); g.fillRect((i * 97) % 400, (i * 37) % (hh * 0.45), 3, 3); }
    g.globalAlpha = 1;
    drawMoonFace(g, 330, hh * 0.18, 34, t);
    const holes = [[90, hh * 0.78, 0, 0.75], [200, hh * 0.86, 1, 1], [312, hh * 0.76, 2, 0.6]];
    holes.forEach(([hx, hy, f, r], i) => {
      g.fillStyle = '#24160f'; g.beginPath(); g.ellipse(hx, hy, 52, 17, 0, 0, TAU); g.fill();
      const rise = clamp(r + Math.sin(t * 2.4 + i * 2) * 0.12, 0, 1);
      g.save(); g.beginPath(); g.rect(hx - 80, hy - 200, 160, 200); g.clip();
      g.translate(hx, hy + (1 - rise) * 90);
      const key = i === 2 ? 'prop/pp-witch-cat' : i === 1 ? 'prop/pp-pumpkin-giggle' : 'prop/pp-pumpkin-1';
      if (!drawArt(g, key, 0, 0, 104, 104, { anchor: 'bottom' })) drawPumpkin(g, 92, i === 2 ? 'cat' : i === 1 ? 'giggle' : 0, { t, golden: false });
      g.restore();
    });
    // candy spraying out of the giggling pumpkin
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.9 + i / 4) % 1;
      const cx = 200 + (i - 1.5) * 70 * k, cy = hh * 0.62 - Math.sin(k * Math.PI) * 80;
      g.save(); g.translate(cx, cy); g.rotate(t * 4 + i);
      if (!drawArt(g, `prop/pp-candy-${(i % 4) + 1}`, 0, 0, 34, 34)) drawCandy(g, i % 4, 15);
      g.restore();
    }
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 45;
const PARTY_AT = 12;          // seconds left when the Pumpkin Party starts
const MAX_SPEED = 640;
const CPU_SPEED = [0.66, 0.78, 0.88];   // CPU top speed share per level (all below a human)
const BOOP_RANGE = 250;       // generous: a press this close lunges you in
const BOOP_NEAR = 120;
const SOLO_GOAL = 45;
const ROWS = [{ y: 455, n: 5 }, { y: 595, n: 6 }, { y: 740, n: 5 }, { y: 885, n: 6 }];
const MOVE = { x0: 80, x1: W - 80, y0: 410, y1: 962 };
const DS = (y) => depthScale(y, { top: 380, near: 960, far: 0.78, nearScale: 1.04 });

// Tiny avatars (e.g. the 54 px garden fairies) are drawn bigger so they read next to the pumpkins.
const sizeFix = (a) => Math.max(1, 120 / (a.char.members[0].h || 120));
const NEW_POSE_FALLBACK = { boop: ['high-five', 'action'] };
const poseName = (n) => {
  if (POSE_NAMES.includes(n)) return n;
  for (const f of NEW_POSE_FALLBACK[n] || []) if (POSE_NAMES.includes(f)) return f;
  return 'action';
};

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: humans walk by themselves to a pumpkin; A boops
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.playT = 0;
    this.timeLeft = DURATION;
    this.party = false; this.partyT = 0;
    this.done = false;
    this.baseScale = n <= 4 ? 0.95 : n <= 6 ? 0.86 : 0.8;
    this.holes = [];
    ROWS.forEach((r, ri) => {
      const span = (r.n - 1) * 270;
      for (let i = 0; i < r.n; i++) this.holes.push({ x: W / 2 - span / 2 + i * 270, y: r.y, row: ri, busy: null, cool: 0, dirt: 0 });
    });
    this.pumpkins = [];
    this.flying = [];     // candies flying into buckets
    this.ground = [];     // candy-rain candies on the ground / falling
    this.bats = [];
    this.spawnT = 0.4;
    this.batT = rand(2, 4);
    this.rainLeft = 0; this.rainT = 0;
    this.goldenT = rand(7, 10);
    this.catT = rand(5, 9);
    this.collectAt = 0; this.collectStep = 0;
    this.flies = Array.from({ length: 14 }, () => ({ x: rand(W), y: rand(420, 1000), p: rand(TAU), s: rand(0.6, 1.1) }));
    this.ents = this.players.map((p, i) => {
      const cols = Math.min(n, 4), row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, n - row * cols);
      const x = W / 2 + (col - (inRow - 1) / 2) * Math.min(300, (W - 400) / Math.max(1, inRow - 1 || 1));
      const y = n <= 4 ? 680 : 640 + row * 150;
      const a = new Actor(p, { scale: this.baseScale, x, y });
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      const e = { p, a, i, x, y, vx: 0, vy: 0, score: 0, cd: 0, streak: 0, streakT: 0, lunge: 0, lx: 0, ly: 0, brain: new Brain(p), target: null, aiPress: -1, wander: 0, wx: x, wy: y, popN: 0, popT: 0, bucketSq: 0, sweets: [],
        auto: this.easy && !p.isAI ? { ix: 0, iy: 0, target: null, t: 0, home: { x, y } } : null };
      a.attach((g, info) => this.drawBucketAt(g, info, e));
      return e;
    });
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    // a couple of pumpkins peek during 3-2-1 so everyone sees what's coming
    if (this.pumpkins.length < 3 && chance(dt * 1.6)) this.spawnPumpkin('pumpkin', 1.4);
    this.updatePumpkins(dt);
    this.updateDecor(dt);
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); this.syncActor(e); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.playT += dt;
    this.timeLeft = Math.max(0, DURATION - this.playT);
    if (!this.party && this.timeLeft <= PARTY_AT) this.startParty();
    if (this.party) this.partyT += dt;
    this.spawning(dt);
    for (const e of this.ents) {
      if (e.p.isAI) this.aiThink(e, dt);
      if (e.auto) this.easyThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate(dt);
    this.updatePumpkins(dt);
    this.updateCandy(dt);
    this.updateDecor(dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
    if (this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    this.updatePumpkins(dt);
    this.updateCandy(dt);
    this.updateDecor(dt);
    for (const e of this.ents) { this.syncActor(e); e.a.update(dt); }
  }

  syncActor(e) {
    const a = e.a;
    a.x = e.x; a.y = e.y;
    a.scale = this.baseScale * DS(e.y) * sizeFix(a);
    e.bucketSq = Math.max(0, e.bucketSq - 0.016 * 3);
  }

  startParty() {
    this.party = true; this.partyT = 0;
    snd('pp-party', 'fanfare');
    sfx('magic');
    fx.flash('#ffb347', 0.25); fx.shake(10, 0.35);
    particles.confettiRain(W, 110);
    for (let i = 0; i < 6; i++) this.spawnBat(true);
    this.spawnT = 0;
  }

  spawning(dt) {
    const want = Math.round(clamp(2.4 + this.n * 0.85, 3, 9) * (this.party ? 1.7 : 1));
    const active = this.pumpkins.filter((pk) => pk.phase !== 'sink').length;
    this.spawnT -= dt;
    if (this.spawnT <= 0 && active < want) {
      this.spawnT = this.party ? rand(0.08, 0.2) : rand(0.25, 0.55);
      let kind = 'pumpkin';
      if (this.goldenT <= 0 && !this.pumpkins.some((pk) => pk.kind === 'golden')) { kind = 'golden'; this.goldenT = this.party ? rand(4, 6) : rand(8, 12); }
      else if (this.catT <= 0 && !this.pumpkins.some((pk) => pk.kind === 'cat')) { kind = 'cat'; this.catT = rand(6, 10); }
      this.spawnPumpkin(kind);
    }
    this.goldenT -= dt; this.catT -= dt;
    if (this.rainLeft > 0) {
      this.rainT -= dt;
      while (this.rainT <= 0 && this.rainLeft > 0) { this.rainT += 0.07; this.rainLeft--; this.dropRainCandy(); }
    }
  }

  spawnPumpkin(kind, lifeMul = 1) {
    const free = this.holes.filter((h) => !h.busy && h.cool <= 0);
    if (!free.length) return null;
    // prefer holes away from the crowd a little, so everyone gets a turn
    const h = pick(free);
    const life = (kind === 'golden' ? rand(2.8, 3.4) : kind === 'cat' ? rand(3.0, 3.8) : this.party ? rand(1.9, 2.8) : rand(2.4, 3.6)) * lifeMul;
    const pk = { h, kind, face: randInt(0, 3), phase: 'rise', t: 0, rise: 0, life, sq: 0, wob: 0, blink: rand(1, 3), by: null, look: rand(-1, 1), seed: rand(TAU) };
    h.busy = pk; h.dirt = 0.35;
    this.pumpkins.push(pk);
    const s = DS(h.y);
    particles.burst(h.x, h.y, { type: 'dust', count: 6, color: '#8a5a3c', speed: [60, 180], size: [10, 18] });
    if (kind === 'golden') {
      snd('pp-golden-pop', 'golden-chime', { vol: 0.8 }); sfx('sparkle');
      particles.burst(h.x, h.y - 80 * s, { type: 'sparkle', count: 10, colors: ['#fff6a8', '#ffd23f', '#fff'] });
    } else if (kind === 'cat') {
      snd('pp-meow', 'tiny-squeak', { vol: 0.8 });
    } else {
      snd('pp-pop', 'pt-popup', { vol: 0.45, rate: rand(0.9, 1.2) });
    }
    return pk;
  }

  updatePumpkins(dt) {
    for (const pk of this.pumpkins) {
      pk.t += dt;
      pk.sq *= Math.exp(-7 * dt);
      pk.wob *= Math.exp(-3 * dt);
      pk.blink -= dt; if (pk.blink < -0.12) pk.blink = rand(1.2, 3.2);
      switch (pk.phase) {
        case 'rise': {
          const k = clamp(pk.t / 0.26, 0, 1);
          pk.rise = ease.outBack(k);
          if (k >= 1) { pk.phase = 'up'; pk.t = 0; pk.sq = -0.25; }
          break;
        }
        case 'up':
          pk.rise = 1;
          pk.life -= dt;
          pk.look = Math.sin(pk.t * 1.7 + pk.seed);
          if (pk.life <= 0) { pk.phase = 'tease'; pk.t = 0; pk.sq = 0.2; if (pk.kind !== 'cat') snd('pp-raspberry', 'shrink', { vol: 0.35, rate: rand(1, 1.3) }); }
          break;
        case 'tease':   // nobody came: blows a raspberry and ducks (no penalty)
          pk.wob = Math.sin(pk.t * 30) * 0.12;
          if (pk.t > 0.45) { pk.phase = 'sink'; pk.t = 0; }
          break;
        case 'booped':
          pk.rise = 1;
          pk.wob = Math.sin(pk.t * 26) * 0.16 * (1 - pk.t / pk.hold);
          if (pk.kind === 'cat' && chance(dt * 6)) particles.burst(pk.h.x + rand(-40, 40), pk.h.y - 150 * DS(pk.h.y), { type: 'heart', count: 1, colors: ['#ff6fb1', '#ff9ad5'], speed: [30, 80], size: [16, 24] });
          if (pk.t > pk.hold) { pk.phase = 'sink'; pk.t = 0; }
          break;
        case 'sink': {
          const k = clamp(pk.t / 0.22, 0, 1);
          pk.rise = 1 - k * k;
          if (k >= 1) { pk.dead = true; pk.h.busy = null; pk.h.cool = 0.5; }
          break;
        }
        default: break;
      }
    }
    for (const h of this.holes) { h.cool -= dt; h.dirt = Math.max(0, h.dirt - dt); }
    this.pumpkins = this.pumpkins.filter((pk) => !pk.dead);
  }

  updateDecor(dt) {
    this.batT -= dt;
    if (this.batT <= 0) { this.batT = this.party ? rand(0.8, 1.6) : rand(3, 6); this.spawnBat(false); }
    for (const b of this.bats) { b.x += b.vx * dt; b.t += dt; b.y = b.y0 + Math.sin(b.t * 2.2) * 26; }
    this.bats = this.bats.filter((b) => b.x > -200 && b.x < W + 200);
  }

  spawnBat(party) {
    const dir = chance(0.5) ? 1 : -1;
    this.bats.push({ x: dir > 0 ? -120 : W + 120, y0: rand(90, 300), y: 0, vx: dir * rand(180, 320) * (party ? 1.4 : 1), t: rand(TAU), s: rand(0.7, 1.05), c: pick(['#8a5cd6', '#b07ae8', '#6f4bbf']) });
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.cd = Math.max(0, e.cd - dt);
    e.streakT = Math.max(0, e.streakT - dt);
    e.popT = Math.max(0, e.popT - dt);
    let ix = e.auto ? (this.done ? 0 : e.auto.ix) : c.x, iy = e.auto ? (this.done ? 0 : e.auto.iy) : c.y;
    const m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; }
    const top = MAX_SPEED * (p.isAI ? CPU_SPEED[clamp(p.aiLevel || 0, 0, 2)] : e.auto ? (e.auto.manual ? 0.9 : 0.72) : 1);
    const tx = ix * top, ty = iy * top * 0.8;
    const k = 1 - Math.exp(-14 * dt);
    e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
    if (e.lunge > 0) {
      e.lunge -= dt;
      e.x += e.lx * dt; e.y += e.ly * dt;
    }
    e.x = clamp(e.x + e.vx * dt, MOVE.x0, MOVE.x1);
    e.y = clamp(e.y + e.vy * dt, MOVE.y0, MOVE.y1);
    if (!a._once) a.moveAnim(e.vx, e.vy, top, { run: Math.hypot(e.vx, e.vy) > 380 });
    else if (Math.abs(e.vx) > 30) a.facing = e.vx > 0 ? 1 : -1;
    if (c.pressed('a')) this.tryBoop(e);
  }

  separate(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const r = (A.a.radius + B.a.radius) * 0.7;
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy);
      if (d < r && d > 0.01) {
        const push = (r - d) * 0.5 * Math.min(1, dt * 12);
        A.x -= (dx / d) * push; B.x += (dx / d) * push;
        A.y -= (dy / d) * push * 0.5; B.y += (dy / d) * push * 0.5;
      }
    }
  }

  /** Distance used for booping (the patch is seen at an angle, so rows are squashed). */
  boopDist(e, pk) { return Math.hypot(pk.h.x - e.x, (pk.h.y - e.y) * 1.35); }

  tryBoop(e) {
    if (e.cd > 0 || this.done) return;
    e.cd = 0.22;
    const a = e.a;
    let best = null, bd = BOOP_RANGE;
    for (const pk of this.pumpkins) {
      if (pk.phase !== 'up' && pk.phase !== 'rise' && pk.phase !== 'tease') continue;
      const d = this.boopDist(e, pk);
      if (d < bd) { bd = d; best = pk; }
    }
    if (!best && e.auto && !e.auto.pushing) {
      // Molly Easy: nothing in reach - run to the nearest pumpkin (from here) and boop it there
      const go = this.easyNearest(e);
      if (go) { e.auto.target = { kind: 'pk', pk: go }; e.auto.go = go; e.auto.t = 3; e._ezSteer = 0; e.auto.manual = false; e.cd = 0; return; }
    }
    a.playOnce(poseName('boop'), 0.3);
    if (!best) {
      // a happy whiff: little sparkle, no penalty
      const hnd = a.anchor('hand');
      particles.burst(hnd.x + a.facing * 20, hnd.y, { type: 'sparkle', count: 4, colors: ['#fff6a8', '#ffffff'], speed: [40, 120], size: [10, 16] });
      sfx('whoosh', { vol: 0.35 });
      return;
    }
    if (bd > BOOP_NEAR) {
      // lunge in: you were close enough, here you go
      const dx = best.h.x - e.x, dy = best.h.y + 20 - e.y, d = Math.hypot(dx, dy) || 1;
      const travel = d - 90;
      e.lunge = 0.12; e.lx = (dx / d) * travel / 0.12; e.ly = (dy / d) * travel / 0.12;
      particles.burst(e.x, e.y, { type: 'dust', count: 5, color: '#fff', speed: [60, 140], size: [10, 16] });
      sfx('dash', { vol: 0.5 });
    }
    a.facing = best.h.x >= e.x ? 1 : -1;
    this.boop(e, best);
  }

  boop(e, pk) {
    const a = e.a, h = pk.h, s = DS(h.y);
    const topY = h.y - 130 * s;
    pk.phase = 'booped'; pk.t = 0; pk.by = e; pk.sq = 0.55;
    pk.hold = pk.kind === 'cat' ? 1.3 : pk.kind === 'golden' ? 1.1 : 0.85;
    e.streak = e.streakT > 0 ? e.streak + 1 : 1; e.streakT = 2.2;
    a.squash(0.25);
    if (!e.p.isAI) e.p.ctrl.rumble(0.35, 90);
    snd('pp-boop', 'boing', { vol: 0.8, rate: rand(0.95, 1.15) });
    fx.hitstop(0.035);
    particles.ring(h.x, topY + 40 * s, '#fff6a8', 90 * s, 0.3);
    let candies = 3, val = 3, label = '+3', color = '#ffb347';
    if (pk.kind === 'golden') {
      candies = 6; val = 6; label = '+6'; color = '#ffd23f';
      snd('pp-golden-boop', 'golden-chime'); sfx('sparkle'); voice(e.p.charId, 'woo');
      fx.flash('#fff3b0', 0.2); fx.shake(12, 0.35); fx.slowmo(0.45, 0.45);
      this.api.camera && this.api.camera.punch(h.x, h.y - 80, 1.18, 0.35);
      particles.burst(h.x, topY, { type: 'star', count: 18, colors: ['#ffd23f', '#fff6a8', '#ffffff'], speed: [200, 480] });
      this.startRain(h);
      a.emote('sparkle', 1.3);
      a.say('Candy rain!', 1.4, null);
    } else if (pk.kind === 'cat') {
      candies = 4; val = 5; label = '+5'; color = '#ff6fb1';
      snd('pp-purr', 'tiny-squeak'); sfx('magic', { vol: 0.5 }); voice(e.p.charId, 'laugh');
      particles.burst(h.x, topY, { type: 'heart', count: 12, colors: ['#ff6fb1', '#ff9ad5', '#ffd1ea'], speed: [120, 300] });
      a.emote('heart', 1.4);
      fx.shake(5, 0.15);
    } else {
      snd('pp-giggle', 'giggle', { vol: 0.75, rate: rand(0.95, 1.25) });
      particles.burst(h.x, topY, { type: 'confetti', count: 12, colors: ['#ff9f1c', '#9b5cff', '#ffd23f', '#5ddc6a'], speed: [160, 360] });
      fx.shake(4, 0.12);
      if (chance(0.25)) voice(e.p.charId, 'laugh');
      if (e.streak > 1) a.emote('star', 0.6);
    }
    if (e.streak === 3 || e.streak === 5 || e.streak === 8 || e.streak >= 12 && e.streak % 4 === 0) {
      candies += 1; val += 1;
      this.pop(e, `Boop x${e.streak}!`, '#6fe3b4', 40, 1);
      sfx('star', { vol: 0.6 });
    }
    this.pop(e, label, color, pk.kind === 'golden' ? 72 : 56);
    snd('pp-candy-spit', 'pop', { vol: 0.5 });
    // spit the candy out in a fountain, then it zooms into the bucket
    let left = val;
    for (let i = 0; i < candies; i++) {
      const v = i === candies - 1 ? left : Math.max(1, Math.floor(val / candies));
      left -= v;
      this.flyCandy(e, h.x, topY + 30 * s, { delay: i * 0.07, value: v, kind: pk.kind === 'cat' ? 1 : randInt(0, 3), spread: (i - (candies - 1) / 2) * 90 });
    }
  }

  flyCandy(e, x, y, { delay = 0, value = 1, kind = 0, spread = 0, dur = 0.62, arc = 190 } = {}) {
    this.flying.push({ e, x0: x, y0: y, x, y, t: -delay, dur, value, kind, rot: rand(TAU), spin: rand(-9, 9), spread, arc });
  }

  startRain(h) {
    this.rainLeft = 24 + this.n * 3; this.rainT = 0.15;
    snd('pp-candy-rain', 'sparkle-beam', { vol: 0.8 });
    particles.popText(W / 2, 300, 'Candy rain!', '#ffd23f', 84);
  }

  dropRainCandy() {
    this.ground.push({ x: rand(140, W - 140), y: rand(MOVE.y0 + 20, MOVE.y1 - 20), z: rand(700, 1000), vz: -rand(300, 600), state: 'fall', life: 6, kind: randInt(0, 3), rot: rand(TAU), spin: rand(-6, 6), bounced: false });
  }

  updateCandy(dt) {
    for (const c of this.flying) {
      c.t += dt;
      if (c.t < 0) continue;
      const k = clamp(c.t / c.dur, 0, 1);
      const hand = c.e.a.anchor('hand');
      const tx = hand.x, ty = hand.y - 12;
      const mx = c.x0 + c.spread;
      // quadratic bezier: start -> above the pumpkin (fanned out) -> bucket
      const u = ease.inOutQuad(k);
      const cx = mx, cy = Math.min(c.y0, ty) - c.arc;
      c.x = (1 - u) * (1 - u) * c.x0 + 2 * (1 - u) * u * cx + u * u * tx;
      c.y = (1 - u) * (1 - u) * c.y0 + 2 * (1 - u) * u * cy + u * u * ty;
      c.rot += c.spin * dt;
      if (k >= 1) { c.done = true; this.land(c); }
    }
    this.flying = this.flying.filter((c) => !c.done);
    for (const c of this.ground) {
      c.rot += c.spin * dt;
      if (c.state === 'fall') {
        c.vz -= 1500 * dt; c.z += c.vz * dt;
        if (c.z <= 0) {
          if (!c.bounced) { c.bounced = true; c.z = 0; c.vz = 260; particles.burst(c.x, c.y, { type: 'sparkle', count: 2, colors: ['#fff6a8'], speed: [30, 80], size: [8, 12] }); }
          else { c.z = 0; c.vz = 0; c.state = 'ground'; c.spin *= 0.2; }
        }
      } else {
        c.life -= dt;
        if (c.life <= 0) { c.dead = true; particles.burst(c.x, c.y - 10, { type: 'sparkle', count: 3, colors: ['#ffffff', '#ffd23f'], size: [8, 12] }); }
      }
      if (this.done || c.dead || c.z > 120) continue;
      for (const e of this.ents) {
        if (Math.hypot(c.x - e.x, (c.y - e.y) * 1.4) < 95) {
          c.dead = true;
          this.flyCandy(e, c.x, c.y - c.z - 10, { value: 1, kind: c.kind, dur: 0.32, arc: 60 });
          break;
        }
      }
    }
    this.ground = this.ground.filter((c) => !c.dead);
  }

  land(c) {
    const e = c.e;
    e.score += c.value;
    e.bucketSq = 0.5;
    if (e.sweets.length < 9) e.sweets.push({ kind: c.kind, x: rand(-0.3, 0.3), r: rand(-0.6, 0.6) });
    if (this.t - this.collectAt > 0.4) this.collectStep = 0;
    this.collectAt = this.t;
    sfx('collect', { step: Math.min(this.collectStep++, 12), vol: 0.5 });
    if (this.n === 1 && e.score >= SOLO_GOAL && !this.soloHit) {
      this.soloHit = true;
      sfx('fanfare'); particles.confettiRain(W, 80);
      e.a.playOnce('celebrate', 1.2); e.a.say('Bucket full!', 1.6, 'yay');
    }
  }

  pop(e, str, color, size, side = 0) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    const a = e.a, top = a.y - a.height;
    const lvl = e.popN % 3;
    particles.popText(e.x + side * 80 + (lvl === 1 ? 36 : lvl === 2 ? -36 : 0), top - 30 - lvl * 50, str, color, size);
  }

  // ------------------------------------------------------------- Molly Easy
  /** A pumpkin A would boop right now (the big A shows over it). */
  boopable(e) {
    let best = null, bd = BOOP_RANGE;
    for (const pk of this.pumpkins) {
      if (pk.phase !== 'up' && pk.phase !== 'rise' && pk.phase !== 'tease') continue;
      const d = this.boopDist(e, pk);
      if (d < bd) { bd = d; best = pk; }
    }
    return best;
  }

  /** Easy: the nearest pumpkin that's up (from where the kid is now). */
  easyNearest(e) {
    let best = null, bd = Infinity;
    for (const pk of this.pumpkins) {
      if (pk.phase !== 'up' && pk.phase !== 'rise') continue;
      const d = this.boopDist(e, pk);
      if (d < bd) { bd = d; best = pk; }
    }
    return best;
  }

  /** Easy (A only): walk to the best pumpkin nobody else is going for (or rain candy).
   * The stick steers while it's pushed; A away from a pumpkin runs to the nearest one and boops it. */
  easyThink(e, dt) {
    const au = e.auto;
    const st = easySteer(e, e.p.ctrl, dt);
    au.manual = st.manual; au.pushing = st.pushing;
    if (st.manual) {
      au.ix = st.x; au.iy = st.y;
      if (st.pushing) { au.target = null; au.go = null; au.t = 0; au.home = { x: e.x, y: e.y }; }   // pick up from here after
      return;
    }
    if (au.go) {
      const pk = au.go;
      if (pk.phase !== 'up' && pk.phase !== 'rise' && pk.phase !== 'tease') au.go = null;   // it ducked: back to normal
      else if (this.boopable(e) === pk && this.boopDist(e, pk) < BOOP_NEAR && e.cd <= 0) { au.go = null; this.tryBoop(e); }
    }
    au.t -= dt;
    const T = au.target;
    const gone = !T || (T.kind === 'pk' && T.pk.phase !== 'up' && T.pk.phase !== 'rise') || (T.kind === 'candy' && T.gc.dead);
    if (!au.go && (gone || au.t <= 0)) {
      au.t = 0.5;
      let best = null, bu = 0;
      const sp = MAX_SPEED * 0.72;
      for (const pk of this.pumpkins) {
        if (pk.phase !== 'up' && pk.phase !== 'rise') continue;
        const d = this.boopDist(e, pk);
        const tt = Math.max(0, d - BOOP_RANGE * 0.6) / sp + 0.3;
        if (pk.phase === 'up' && tt > pk.life + 0.3) continue;
        let u = (pk.kind === 'golden' ? 3 : pk.kind === 'cat' ? 2.2 : 1) / tt;
        for (const o of this.ents) if (o !== e && o.auto && o.auto.target && o.auto.target.pk === pk) { u *= 0.2; break; }
        if (T && T.pk === pk) u *= 1.5;
        if (u > bu) { bu = u; best = { kind: 'pk', pk }; }
      }
      for (const gc of this.ground) {
        const u = 0.5 / (Math.hypot(gc.x - e.x, (gc.y - e.y) * 1.4) / sp + 0.3);
        if (u > bu) { bu = u; best = { kind: 'candy', gc }; }
      }
      au.target = best;
    }
    const t = au.target;
    let tx = au.home.x, ty = au.home.y, arrive = 40;
    if (au.go) { const pk = au.go; tx = pk.h.x + (e.x < pk.h.x ? -90 : 90); ty = pk.h.y + 22; arrive = 10; }
    else if (t && t.kind === 'pk') { tx = t.pk.h.x + (e.x < t.pk.h.x ? -90 : 90); ty = t.pk.h.y + 22; arrive = 20; }
    else if (t && t.kind === 'candy') { tx = t.gc.x; ty = t.gc.y; arrive = 10; }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    au.ix = 0; au.iy = 0;
    if (d > arrive) { const k = clamp(d / 90, 0, 1); au.ix = (dx / d) * k; au.iy = (dy / d) * k; }
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), c = p.ctrl, lvl = clamp(p.aiLevel || 0, 0, 2);
    if (e.brain.ready(dt)) {
      e.target = null;
      if (chance(prof.mistake * 1.2)) {
        e.wander = rand(0.5, 1.2); e.wx = rand(MOVE.x0 + 100, MOVE.x1 - 100); e.wy = rand(MOVE.y0 + 40, MOVE.y1 - 40);
      } else {
        let best = null, bu = 0;
        const sp = MAX_SPEED * CPU_SPEED[lvl];
        for (const pk of this.pumpkins) {
          if (pk.phase !== 'up' && pk.phase !== 'rise') continue;
          const d = this.boopDist(e, pk);
          const tt = d / sp + 0.3;
          if (pk.phase === 'up' && tt > pk.life + 0.4) continue;
          let u = (pk.kind === 'golden' ? 3 : pk.kind === 'cat' ? 2.2 : 1) / tt * rand(0.8, 1.2);
          // gentle: leave it to a human who's nearer
          for (const o of this.ents) if (!o.p.isAI && this.boopDist(o, pk) < d * 0.85) { u *= lvl === 0 ? 0.25 : lvl === 1 ? 0.5 : 0.8; break; }
          for (const o of this.ents) if (o !== e && o.p.isAI && o.target && o.target.pk === pk) { u *= 0.2; break; }
          if (u > bu) { bu = u; best = { kind: 'pk', pk }; }
        }
        for (const gc of this.ground) {
          const d = Math.hypot(gc.x - e.x, (gc.y - e.y) * 1.4);
          const u = 0.55 / (d / sp + 0.3) * rand(0.8, 1.2);
          if (u > bu) { bu = u; best = { kind: 'candy', gc }; }
        }
        e.target = best;
        e.aiPress = -1;
      }
      e.brain.wait(reactionTime(p) * 0.6 + rand(0.15, 0.35));
    }
    let tx = null, ty = null;
    const T = e.target;
    if (e.wander > 0) { e.wander -= dt; tx = e.wx; ty = e.wy; }
    else if (T && T.kind === 'pk') {
      const pk = T.pk;
      if (pk.phase === 'up' || pk.phase === 'rise') {
        tx = pk.h.x + (e.x < pk.h.x ? -80 : 80); ty = pk.h.y + 22;
        const d = this.boopDist(e, pk);
        if (d < BOOP_NEAR + 20) {
          if (e.aiPress < 0) e.aiPress = reactionTime(p) * (lvl === 0 ? 1.1 : 0.7);
          e.aiPress -= dt;
          if (e.aiPress <= 0) { c.press('a'); e.aiPress = -1; e.target = null; e.brain.wait(rand(0.15, 0.4)); }
        }
      } else e.target = null;
    } else if (T && T.kind === 'candy') {
      if (T.gc.dead) e.target = null; else { tx = T.gc.x; ty = T.gc.y; }
    }
    if (tx === null) { c.move(0, 0); return; }
    steer(p, e.x, e.y, tx, ty, { arrive: 60 });
  }

  // ------------------------------------------------------------------ finish
  finish() {
    if (this.done) return;
    this.done = true;
    // credit candy still in the air
    for (const c of this.flying) { c.e.score += c.value; }
    this.flying = [];
    for (const pk of this.pumpkins) if (pk.phase === 'up' || pk.phase === 'rise') { pk.phase = 'booped'; pk.t = 0; pk.hold = 1.2; pk.sq = 0.4; }
    const scores = this.ents.map((e) => e.score);
    const placements = this.n === 1 ? [1] : placementsFromScores(scores);
    const top = Math.max(...scores);
    this.ents.forEach((e, i) => {
      e.a.clearEmotes();
      e.vx = e.vy = 0;
      if (placements[i] === 1) e.a.setPose('celebrate');
      else e.a.setPose(i % 2 ? 'cheer' : 'wave');
    });
    const wi = scores.indexOf(top);
    const wa = this.ents[Math.max(0, wi)];
    this.api.finish({ placements, stats: scores.map((s) => `${s} candy`), solo: scores[0], focus: { x: wa.x, y: wa.y - wa.a.height * 0.5 } });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    this.drawBackground(g);
    // holes
    for (const h of this.holes) this.drawHole(g, h);
    // y-sorted world: pumpkins (at their hole), players, candy on the ground
    const list = [];
    for (const pk of this.pumpkins) list.push({ y: pk.h.y + 2, f: () => this.drawPumpkinAt(g, pk) });
    for (const e of this.ents) list.push({ y: e.y, f: () => e.a.draw(g, { ring: e.p.color }) });
    for (const c of this.ground) list.push({ y: c.y, f: () => this.drawGroundCandy(g, c) });
    list.sort((A, B) => A.y - B.y);
    for (const it of list) it.f();
    for (const c of this.flying) if (c.t >= 0) this.drawCandyAt(g, c.x, c.y, c.kind, 30, c.rot);
    for (const e of this.ents) {
      const a = e.a;
      const top = a.y - a.height - 26 - (a.emotes.length ? 50 : 0);
      ui.playerTag(g, e.p, e.x, top);
    }
    // Molly Easy: a big bouncing A over the pumpkin A would boop
    if (this.easy && !this.done) {
      for (const e of this.ents) {
        if (!e.auto) continue;
        const pk = this.boopable(e);
        if (!pk) continue;
        const s = DS(pk.h.y);
        ui.glyph(g, 'a', pk.h.x, pk.h.y - 200 * s + Math.sin(this.t * 9 + e.i) * 6, 84 * s, { pulse: true });
      }
    }
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 990, format: (v) => String(v) });
    if (this.n === 1) {
      const e = this.ents[0];
      const k = clamp(e.score / SOLO_GOAL, 0, 1);
      g.save(); g.translate(1210, 64);
      ui.bar(g, -150, -18, 300, 36, k, '#ff9f1c');
      g.translate(-185, 0); this.drawCandyAt(g, 0, 0, 1, 26, 0.2);
      g.restore();
    }
    if (this.party) {
      const pulse = 1 + Math.sin(this.t * 10) * 0.06;
      g.save(); g.translate(W / 2, 150); g.scale(pulse, pulse);
      ui.text(g, 'PUMPKIN PARTY!', 0, 0, { size: 48, color: '#ffb347', weight: 800 });
      g.restore();
      if (this.partyT < 2.2) {
        g.save(); g.globalAlpha = clamp(2.2 - this.partyT, 0, 1);
        ui.banner(g, 'Pumpkin Party!', this.partyT, { y: 470, size: 150, color: '#ffb347' });
        g.restore();
      }
    }
  }

  drawBackground(g) {
    const bg = art('bg/pumpkin-peekaboo');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      if (!this.bgCache) {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        drawPatchBackground(c.getContext('2d'), W, H, this.holes);
        this.bgCache = c;
      }
      g.drawImage(this.bgCache, 0, 0);
      // live touches: twinkles, moon face, lantern glow
      g.save();
      for (let i = 0; i < 30; i++) {
        const a = 0.5 + 0.5 * Math.sin(this.t * (1.5 + (i % 5) * 0.4) + i * 2.1);
        g.globalAlpha = a * 0.9;
        g.save(); g.translate((i * 263 + 90) % W, 30 + ((i * 71) % 250)); drawSparkleShape(g, 10 + (i % 3) * 5, '#fff8d8'); g.restore();
      }
      g.restore();
      drawMoonFace(g, 1560, 150, 92, this.t);
      const lit = this.party ? 0.55 + 0.45 * Math.sin(this.t * 9) : 0.6 + 0.2 * Math.sin(this.t * 2);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const lx = 330 + i * 62, ly = 268 + Math.sin(i * 0.9) * 8 + i * 4;
        const gr = g.createRadialGradient(lx, ly, 2, lx, ly, 40);
        gr.addColorStop(0, `rgba(255,170,60,${0.5 * lit})`); gr.addColorStop(1, 'rgba(255,170,60,0)');
        g.fillStyle = gr; g.fillRect(lx - 40, ly - 40, 80, 80);
      }
      g.restore();
    }
    for (const b of this.bats) { g.save(); g.translate(b.x, b.y); g.scale(b.s * Math.sign(b.vx), b.s); drawBat(g, b.t, b.c); g.restore(); }
    // fireflies
    g.save();
    for (const f of this.flies) {
      const x = f.x + Math.sin(this.t * 0.6 + f.p) * 40, y = f.y + Math.cos(this.t * 0.8 + f.p) * 22;
      g.globalAlpha = 0.35 + 0.35 * Math.sin(this.t * 3 + f.p);
      g.save(); g.translate(x, y); drawSparkleShape(g, 14 * f.s, '#fff3a0'); g.restore();
    }
    g.restore();
    if (this.party) { g.save(); g.globalAlpha = 0.07 + 0.05 * Math.sin(this.t * 8); g.fillStyle = '#ff9f1c'; g.fillRect(0, 0, W, H); g.restore(); }
  }

  drawHole(g, h) {
    const s = DS(h.y);
    if (drawArt(g, 'prop/pp-hole', h.x, h.y, 200 * s, 100 * s)) return;
    g.save(); g.translate(h.x, h.y);
    g.fillStyle = '#7a5434'; g.beginPath(); g.ellipse(0, 4 * s, 100 * s, 38 * s, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a170d'; g.beginPath(); g.ellipse(0, 0, 80 * s, 26 * s, 0, 0, TAU); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 3 * s; g.stroke();
    if (h.dirt > 0) {
      g.globalAlpha = h.dirt / 0.35; g.fillStyle = '#8a5a3c';
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc((i - 2) * 30 * s, -10 * s - Math.sin(i) * 6 * s, 7 * s, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  /** Front half of the hole rim, drawn over the pumpkin's base (procedural only). */
  drawHoleLip(g, h) {
    if (art('prop/pp-hole')) return;   // the pumpkin is clipped to the art's opening instead
    const s = DS(h.y);
    g.save(); g.translate(h.x, h.y);
    g.fillStyle = '#7a5434';
    g.beginPath(); g.ellipse(0, 4 * s, 100 * s, 38 * s, 0, 0, Math.PI); g.ellipse(0, 0, 80 * s, 26 * s, 0, Math.PI, 0, true); g.closePath(); g.fill();
    g.strokeStyle = NAVY; g.lineWidth = 3 * s;
    g.beginPath(); g.ellipse(0, 0, 80 * s, 26 * s, 0, 0, Math.PI); g.stroke();
    // curly vine leaves on the rim
    g.fillStyle = '#4fae4a';
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 78 * s, 18 * s, 18 * s, 9 * s, sx * 0.5, 0, TAU); g.fill(); g.stroke(); }
    g.restore();
  }

  drawPumpkinAt(g, pk) {
    const h = pk.h, s = DS(h.y), w = 148 * s;
    const rise = clamp(pk.rise, -0.2, 1.3);
    const holeImg = art('prop/pp-hole');
    // With the hole art the pumpkin sits down in the opening (its bottom just above the
    // front lip) and is clipped along the opening's front edge instead of a straight line.
    const baseY = h.y + (holeImg ? 26 : 6) * s + (1 - rise) * w * 1.05;
    const O = holeImg && holeOpening(h, s);
    g.save();
    g.beginPath();
    if (O) {
      // Above the opening's painted front edge (its lower arc). The pumpkin is wider than
      // the opening, so out at the sides it sinks into the ground along a shallow curve that
      // continues from the arc's ends (no straight cut anywhere).
      const L = h.x - w * 1.2, R = h.x + w * 1.2, RX = 80 * s, d = 12 * s;
      g.moveTo(L, h.y - w * 2.4); g.lineTo(R, h.y - w * 2.4); g.lineTo(R, O.cy);
      for (let i = 0; i <= 48; i++) {
        const dx = RX - (2 * RX * i) / 48, a = Math.abs(dx);
        const y = a <= O.rx ? O.ry * Math.sqrt(1 - (a / O.rx) ** 2) : d * Math.sin(Math.PI * (a - O.rx) / (RX - O.rx));
        g.lineTo(O.cx + dx, O.cy + y);
      }
      g.lineTo(L, O.cy); g.closePath();
    } else g.rect(h.x - w * 1.2, h.y - w * 2.4, w * 2.4, w * 2.4 + 2 * s);
    g.clip();
    g.translate(h.x, baseY);
    const sq = pk.sq;
    g.rotate(pk.wob);
    g.scale(1 + sq * 0.35, 1 - sq * 0.35);
    const giggle = pk.phase === 'booped';
    let key, face;
    if (pk.kind === 'cat') { key = giggle ? 'prop/pp-witch-cat-purr' : 'prop/pp-witch-cat'; face = giggle ? 'purr' : 'cat'; }
    else if (pk.kind === 'golden') { key = giggle ? 'prop/pp-pumpkin-golden-giggle' : 'prop/pp-pumpkin-golden'; face = giggle ? 'giggle' : pk.face; }
    else { face = giggle ? 'giggle' : pk.phase === 'tease' ? 3 : pk.face; key = giggle ? 'prop/pp-pumpkin-giggle' : `prop/pp-pumpkin-${face + 1}`; }
    if (pk.kind === 'golden') {
      const gr = g.createRadialGradient(0, -w * 0.45, 10, 0, -w * 0.45, w * 0.95);
      gr.addColorStop(0, `rgba(255,230,120,${0.55 + 0.2 * Math.sin(this.t * 6)})`); gr.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, -w * 0.45, w * 0.95, 0, TAU); g.fill();
    }
    if (!drawArt(g, key, 0, 0, w * 1.12, w * 1.12, { anchor: 'bottom' })) {
      drawPumpkin(g, w, face, { t: this.t + pk.seed, golden: pk.kind === 'golden', blink: pk.blink < 0, look: pk.look });
    }
    g.restore();
    this.drawHoleLip(g, h);
    if (pk.kind === 'golden' && chance(0.25)) particles.burst(h.x + rand(-60, 60) * s, h.y - rand(40, 160) * s * rise, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffd23f'], speed: [10, 40], size: [10, 16] });
  }

  drawCandyAt(g, x, y, kind, r, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    if (!drawArt(g, `prop/pp-candy-${kind + 1}`, 0, 0, r * 2.2, r * 2.2)) drawCandy(g, kind, r);
    g.restore();
  }

  drawGroundCandy(g, c) {
    const s = DS(c.y);
    g.save(); g.globalAlpha = 0.25; g.fillStyle = NAVY;
    g.beginPath(); g.ellipse(c.x, c.y, 26 * s * (1 - clamp(c.z / 900, 0, 0.7)), 8 * s, 0, 0, TAU); g.fill(); g.restore();
    const blink = c.state === 'ground' && c.life < 1.5 && Math.floor(this.t * 10) % 2 === 0;
    if (blink) return;
    this.drawCandyAt(g, c.x, c.y - c.z - 20 * s, c.kind, 28 * s, c.rot);
  }

  drawBucketAt(g, info, e) {
    const S = info.h * 0.3;
    const x = info.hand.x, y = info.hand.y + S * 0.35;
    g.save(); g.translate(x, y);
    const sq = e.bucketSq;
    g.scale(1 + sq * 0.3, 1 - sq * 0.3);
    if (!drawArt(g, 'prop/pp-bucket', 0, 0, S * 1.15, S * 1.15)) drawBucket(g, S, e.sweets, (k, cx, cy, r, rot) => this.drawCandyAt(g, cx, cy, k, r, rot));
    // art: heap the sweets on the rim (19% above the centre), not up in the handle
    else for (let i = 0; i < e.sweets.length; i++) { const sw = e.sweets[i]; this.drawCandyAt(g, sw.x * S, -S * 0.22 - Math.floor(i / 3) * S * 0.1, sw.kind, S * 0.16, sw.r); }
    g.restore();
  }
}
