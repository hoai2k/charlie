// Wizard Quick-Draw: wizard-school courtyard at night. Professor Hoot (a wise
// owl in a wizard hat) holds a lantern. Wait for it to burst GOLD, then press A
// to cast first. Fake-outs (flickers, ruffles, hoots, moths) tempt you to
// jump the gun and fizzle. First to 3 points wins.
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { starPath, drawStarShape } from '../engine/emotes.js';
import { reactionTime } from '../engine/ai.js';
import { placementsFromScores, rand, randInt, pick, chance, clamp, lerp, damp, ease, TAU } from '../engine/util.js';

const GOAL = 3;
const NAVY = '#24163f';
const CRYSTAL = { x: W / 2, y: 585 };
const OWL = { x: 700, y: 470 };            // feet on the perch
const HANG = { x: 940, y: 190 };           // lantern hangs from the staff hook here
const GRIP = { x: OWL.x + 100, y: OWL.y - 108 };
const FEET_Y = 985;

/** First pose from the list that the engine knows (new poses can be added to the engine later). */
const pickPose = (...names) => names.find((n) => POSE_NAMES.includes(n)) || 'idle';

export const meta = {
  id: 'wizard-quickdraw',
  title: 'Wizard Quick-Draw',
  category: 'party',
  type: 'Reaction duel',
  goal: 'Wait for the lantern to burst GOLD, then cast first! First to 3 points wins.',
  controls: [['a', 'Cast your spell']],
  tips: [
    "Don't cast early! Your wand will fizzle and you're out for the round.",
    'Professor Hoot loves fake-outs: flickers, feather ruffles, hoots and moths.',
    'Only the golden CAST! light counts. Stay calm and wait for it.',
  ],
  music: 'tense',
  duration: '1 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save();
    g.translate(x, y);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1b1550'); gr.addColorStop(0.7, '#4a2c86'); gr.addColorStop(1, '#7a4aa8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      const sx = (i * 0.618 * w * 3.1) % w, sy = (i * 0.37 * h * 2.3) % (h * 0.6);
      g.globalAlpha = 0.5 + Math.sin(t * 3 + i) * 0.4; g.fillStyle = '#fff';
      g.beginPath(); g.arc(sx, sy, h * 0.008 + (i % 3) * h * 0.004, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // moon
    g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(w * 0.84, h * 0.2, h * 0.11, 0, TAU); g.fill();
    g.fillStyle = '#e8dca0'; g.beginPath(); g.arc(w * 0.81, h * 0.18, h * 0.03, 0, TAU); g.fill();
    // castle silhouette
    g.fillStyle = '#1a1038';
    const bw = w * 0.07;
    [[0.08, 0.48], [0.2, 0.38], [0.32, 0.52], [0.62, 0.45], [0.74, 0.36], [0.88, 0.5]].forEach(([cx, top], i) => {
      g.fillRect(w * cx, h * top, bw, h * 0.75);
      g.beginPath(); g.moveTo(w * cx - bw * 0.15, h * top); g.lineTo(w * cx + bw / 2, h * (top - 0.16 - (i % 2) * 0.05)); g.lineTo(w * cx + bw * 1.15, h * top); g.closePath(); g.fill();
      g.fillStyle = '#ffd86a'; g.fillRect(w * cx + bw * 0.35, h * (top + 0.1), bw * 0.28, bw * 0.4); g.fillStyle = '#1a1038';
    });
    g.fillRect(0, h * 0.78, w, h * 0.3);
    // golden lantern burst
    const lx = w * 0.3, ly = h * 0.34, burst = 0.8 + Math.sin(t * 4) * 0.2;
    const rg = g.createRadialGradient(lx, ly, 0, lx, ly, h * 0.5 * burst);
    rg.addColorStop(0, 'rgba(255,230,120,0.95)'); rg.addColorStop(0.4, 'rgba(255,200,60,0.4)'); rg.addColorStop(1, 'rgba(255,200,60,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe680'; g.strokeStyle = '#6b4510'; g.lineWidth = h * 0.016;
    ui.roundRect(g, lx - h * 0.07, ly - h * 0.09, h * 0.14, h * 0.18, h * 0.04); g.fill(); g.stroke();
    g.fillStyle = '#fffbe0'; g.beginPath(); g.ellipse(lx, ly, h * 0.03, h * 0.05, 0, 0, TAU); g.fill();
    // crystal + wand beam
    const cx = w * 0.72, cy = h * 0.58, wx = w * 0.42, wy = h * 0.74;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,111,177,0.55)'; g.lineWidth = h * 0.05; g.beginPath(); g.moveTo(wx, wy); g.lineTo(cx, cy); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = h * 0.014; g.stroke();
    g.fillStyle = '#7fe6ff'; g.strokeStyle = NAVY; g.lineWidth = h * 0.018;
    g.beginPath(); g.moveTo(cx, cy - h * 0.14); g.lineTo(cx + h * 0.09, cy - h * 0.02); g.lineTo(cx + h * 0.05, cy + h * 0.12); g.lineTo(cx - h * 0.05, cy + h * 0.12); g.lineTo(cx - h * 0.09, cy - h * 0.02); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(cx - h * 0.03, cy - h * 0.06); g.lineTo(cx, cy - h * 0.11); g.lineTo(cx - h * 0.005, cy + h * 0.02); g.closePath(); g.fill();
    // wand
    g.strokeStyle = '#5a3a1a'; g.lineWidth = h * 0.03; g.beginPath(); g.moveTo(wx - w * 0.07, wy + h * 0.14); g.lineTo(wx, wy); g.stroke();
    g.save(); g.translate(wx, wy); drawStarShape(g, h * 0.17 * (1 + Math.sin(t * 6) * 0.1), '#ffd23f'); g.restore();
    // fireworks
    const cols = ['#ff6fb1', '#ffd23f', '#7fe6ff'];
    for (let k = 0; k < 3; k++) {
      const fx0 = w * (0.58 + k * 0.15), fy0 = h * (0.2 + (k % 2) * 0.12), ph = (t * 0.9 + k * 0.33) % 1;
      g.strokeStyle = cols[k]; g.lineWidth = h * 0.015; g.globalAlpha = 1 - ph * 0.7;
      for (let r = 0; r < 10; r++) {
        const a = (r / 10) * TAU, r0 = h * 0.03 + ph * h * 0.05, r1 = r0 + h * 0.045;
        g.beginPath(); g.moveTo(fx0 + Math.cos(a) * r0, fy0 + Math.sin(a) * r0); g.lineTo(fx0 + Math.cos(a) * r1, fy0 + Math.sin(a) * r1); g.stroke();
      }
    }
    g.restore();
  },
};

// ---------------------------------------------------------------------------

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    const n = this.n;
    this.time = 0;
    this.sc = n <= 4 ? 1.35 : n <= 6 ? 1.2 : 1.02;
    const spacing = n > 1 ? clamp((W - 420) / (n - 1), 150, 330) : 0;
    this.base = null;

    this.actors = this.players.map((p, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * spacing;
      const a = new Actor(p.charId, { scale: this.sc, x, y: FEET_Y, facing: x < W / 2 - 4 ? 1 : x > W / 2 + 4 ? -1 : 1 });
      a.snap();
      a.setPose('ready');
      return a;
    });
    this.ps = this.players.map(() => ({
      pts: 0, locked: false, best: null, wand: -1.25, wandTarget: -1.25, tip: { x: 0, y: 0 },
      jumpAt: null, reactAt: null, pressed: false, puffT: 0,
    }));
    this.actors.forEach((a, i) => {
      a.attach((g, info) => this.drawWand(g, info, i));
    });

    this.bg = this.makeBackground();
    this.candles = Array.from({ length: 9 }, (_, i) => ({
      x: [160, 330, 500, 90, 1480, 1640, 1790, 1350, 1860][i], y: [330, 200, 430, 560, 220, 420, 270, 520, 600][i],
      ph: rand(TAU), sz: rand(0.8, 1.15),
    }));
    this.stars = Array.from({ length: 70 }, () => ({ x: rand(W), y: rand(0, 520), r: rand(1, 3), ph: rand(TAU), sp: rand(1, 3) }));

    // round state machine
    this.round = 1;
    this.st = 'intro';          // intro | wait | go | resolve | allout
    this.stT = 0;
    this.waitLen = 3;
    this.goT = 0;
    this.fakes = [];
    this.winner = -1;
    this.res = null;
    this.finishing = false;
    this.roundsPlayed = 0;
    this.msg = null;

    // set pieces
    this.owl = { mode: 'idle', t: 0, blink: rand(1, 3), blinking: 0, look: { x: 0, y: 0 }, hootT: 0, wingUp: 0 };
    this.lant = { level: 0.12, flick: 0, burst: 0, swing: 0, swingV: 0, wasGo: false };
    this.cry = { hit: -1, color: '#7fe6ff', flash: 0 };
    this.moths = [];
    this.rockets = [];
    this.beams = [];
    this.later = [];
    this.puffs = [];
    this.fakeNow = null;
  }

  // ----- helpers ---------------------------------------------------------

  after(delay, fn) { this.later.push({ t: delay, fn }); }

  // ----- state machine ---------------------------------------------------

  startRound() {
    this.st = 'intro'; this.stT = 0; this.msg = null;
    this.ps.forEach((s, i) => {
      s.locked = false; s.pressed = false; s.jumpAt = null; s.reactAt = null; s.wandTarget = -1.25;
      const a = this.actors[i]; a.alpha = 1; a.clearEmotes(); a.setPose('ready');
    });
    this.res = null; this.winner = -1;
    this.lant.burst = 0;
  }

  startWait() {
    this.st = 'wait'; this.stT = 0;
    this.waitLen = rand(2, 6);
    // 0-3 fake-outs spread over the wait, always finished well before GO
    const maxFakes = clamp(Math.floor((this.waitLen - 0.9) / 1.15), 0, 3);
    const k = this.waitLen < 2.5 ? randInt(0, 1) : randInt(Math.min(1, maxFakes), maxFakes);
    const types = ['flicker', 'ruffle', 'hoot', 'moth'].sort(() => Math.random() - 0.5);
    this.fakes = [];
    const lo = 0.55, hi = this.waitLen - 0.95;
    for (let i = 0; i < k; i++) {
      const at = lo + ((hi - lo) * (i + rand(0.1, 0.9))) / k;
      this.fakes.push({ at, type: types[i % types.length], done: false });
    }
  }

  startFake(f) {
    f.done = true;
    this.fakeNow = { type: f.type, t: 0 };
    const o = this.owl, L = this.lant;
    if (f.type === 'flicker') { L.flick = 1.0; sfx('tick'); }
    else if (f.type === 'ruffle') {
      o.mode = 'ruffle'; o.t = 0; sfx('flip');
      for (let i = 0; i < 7; i++) particles.burst(OWL.x + rand(-60, 60), OWL.y - rand(80, 200), { type: 'petal', count: 1, colors: ['#c99356', '#e8c28a', '#a8743f'], speed: [30, 120], life: [0.8, 1.4], size: [8, 13] });
    } else if (f.type === 'hoot') {
      o.mode = 'hoot'; o.t = 0; o.hootT = 0.9;
      sfx('npc/hoot/hoo'); sfx('note', { midi: 55, dur: 0.35, vol: 0.2 });
      this.after(0.38, () => sfx('note', { midi: 52, dur: 0.5, vol: 0.2 }));
    } else if (f.type === 'moth') {
      const fromL = chance(0.5);
      this.moths.push({ x: fromL ? -40 : W + 40, y: rand(260, 420), dir: fromL ? 1 : -1, t: 0, ph: rand(TAU), spd: rand(250, 330) });
      sfx('tock');
      this.after(0.5, () => sfx('tock'));
      this.after(1.0, () => sfx('tock'));
    }
    // CPUs may fall for it
    this.players.forEach((p, i) => {
      const s = this.ps[i];
      if (!p.isAI || s.locked) return;
      const pFall = [0.15, 0.08, 0.03][clamp(p.aiLevel ?? 0, 0, 2)];
      if (chance(pFall)) s.jumpAt = this.stT + rand(0.25, 0.6);
    });
  }

  goNow() {
    this.st = 'go'; this.goT = 0; this.stT = 0;
    this.lant.burst = 1; this.lant.level = 1; this.lant.flick = 0;
    this.owl.mode = 'alert'; this.owl.t = 0;
    fx.flash('#ffe27a', 0.2);
    sfx('npc/hoot/ready'); sfx('star'); sfx('bigpop');
    this.after(0.05, () => sfx('magic'));
    for (let i = 0; i < 26; i++) particles.burst(HANG.x, 285, { type: pick(['sparkle', 'spark', 'star']), count: 1, colors: ['#fff7b0', '#ffd23f', '#ffffff'], speed: [200, 700], life: [0.4, 0.9] });
    particles.ring(HANG.x, 285, '#ffe27a', 400, 0.6);
    this.players.forEach((p, i) => {
      const s = this.ps[i];
      s.jumpAt = null;
      if (p.isAI && !s.locked) s.reactAt = reactionTime(p);
    });
  }

  lock(i) {
    const s = this.ps[i], a = this.actors[i], p = this.players[i];
    if (s.locked) return;
    s.locked = true; s.wandTarget = 1.0;
    a.setPose('dizzy'); a.squash(0.3);
    const tip = s.tip.x ? s.tip : a.anchor('hand');
    for (let k = 0; k < 18; k++) particles.burst(tip.x, tip.y, { type: 'spark', count: 1, colors: ['#7ae582', '#b8f5b0', '#3fb34f', '#d6ffd0'], speed: [60, 260], life: [0.4, 0.9], size: [5, 10], gravity: -80 });
    particles.burst(tip.x, tip.y, { type: 'bubble', count: 5, speed: [30, 120], size: [8, 16] });
    particles.ring(tip.x, tip.y, '#7ae582', 90, 0.4);
    for (let k = 0; k < 4; k++) this.puffs.push({ x: tip.x + rand(-14, 14), y: tip.y + rand(-10, 8), r: rand(18, 30), t: 0, life: rand(0.9, 1.4), vx: rand(-20, 20) });
    particles.popText(a.x, a.y - a.height - 90, 'Fizzle!', '#7ae582', 56);
    sfx('wrong'); sfx('stun'); sfx('fizzle');
    p.ctrl.rumble && p.ctrl.rumble(0.5, 200);
    if (this.ps.every((x) => x.locked)) {
      this.st = 'allout'; this.stT = 0; this.msg = 'Everybody fizzled! Again!';
      sfx('aww');
    }
  }

  cast(i) {
    const s = this.ps[i], a = this.actors[i], p = this.players[i];
    const ms = Math.max(60, Math.round((this.goT - 0.008) * 1000));
    this.st = 'resolve'; this.stT = 0; this.winner = i;
    s.pts++; if (s.best === null || ms < s.best) s.best = ms;
    this.res = { i, ms, hit: false, done: false };
    const tip = s.tip.x ? s.tip : a.anchor('hand');
    const fwd = a.facing;
    s.wandTarget = Math.atan2(CRYSTAL.y - tip.y, (CRYSTAL.x - tip.x) * fwd);
    a.playOnce('throw', 0.45, pickPose('cast', 'cheer')); a.squash(0.3);
    this.beams.push({ i, t: 0, color: p.color });
    this.owl.mode = 'cheer'; this.owl.t = 0;
    sfx('magic'); sfx('whoosh');
    fx.slowmo(0.5, 0.45);
    this.api.camera && this.api.camera.punch((a.x + CRYSTAL.x) / 2, (a.y - a.height * 0.6 + CRYSTAL.y) / 2 + 40, s.pts >= GOAL ? 1.35 : 1.25, 0.9);
    p.ctrl.rumble && p.ctrl.rumble(0.8, 250);
    this.ps.forEach((o, j) => {
      if (j !== i && !o.locked) this.actors[j].playOnce('surprised', 1.1, 'idle');
    });
    const winning = s.pts >= GOAL;
    this.after(0.22, () => this.crystalHit(i, winning));
    this.after(0.5, () => {
      a.setPose(winning ? pickPose('celebrate', 'cheer') : 'cheer');
      a.emote(winning ? 'hearts' : 'star', 1.6);
      sfx('cheer'); sfx('applause'); sfx('npc/hoot/bravo'); voice(p.charId, 'yay');
      particles.popText(a.x + a.facing * 150, a.y - a.height * 0.55, '+1', '#ffd23f', 64);
    });
  }

  crystalHit(i, big) {
    const p = this.players[i];
    this.res.hit = true;
    this.cry.hit = 0; this.cry.color = p.color; this.cry.flash = 1;
    fx.flash('#ffffff', 0.18); fx.shake(big ? 20 : 12, 0.35);
    sfx('bigpop'); sfx('sparkle'); sfx('star');
    particles.ring(CRYSTAL.x, CRYSTAL.y, p.color, 320, 0.7);
    particles.ring(CRYSTAL.x, CRYSTAL.y, '#ffffff', 180, 0.5);
    particles.burst(CRYSTAL.x, CRYSTAL.y, { type: 'sparkle', count: 30, colors: [p.color, '#ffffff', '#fff6a8', '#7fe6ff'], speed: [150, 520], life: [0.6, 1.3] });
    particles.burst(CRYSTAL.x, CRYSTAL.y, { type: 'shard', count: 10, colors: ['#7fe6ff', '#c9a8ff', '#ffffff'], speed: [200, 480], gravity: 900, life: [0.5, 1] });
    const count = big ? 9 : 5;
    for (let k = 0; k < count; k++) {
      this.after(0.12 + k * (big ? 0.16 : 0.2), () => {
        this.rockets.push({
          x: CRYSTAL.x, y: CRYSTAL.y - 40, tx: rand(380, W - 380), ty: rand(110, 420), t: 0, dur: rand(0.45, 0.7),
          color: pick([p.color, p.color, '#ffd23f', '#ffffff', pick(RAINBOW)]), big,
        });
        sfx('whoosh', { vol: 0.4 });
      });
    }
    if (big) { fx.slowmo(0.5, 0.5); particles.confettiRain(W, 90); }
  }

  update(dt) {
    this.time += dt;
    this.ambient(dt);
    this.stT += dt;
    const ctrlA = this.players.map((p) => p.ctrl.pressed('a'));

    if (this.st === 'intro') {
      if (this.stT >= (this.round === 1 && this.roundsPlayed === 0 ? 1.0 : 1.3)) this.startWait();
    } else if (this.st === 'wait') {
      for (const f of this.fakes) if (!f.done && this.stT >= f.at) this.startFake(f);
      if (this.fakeNow) { this.fakeNow.t += dt; if (this.fakeNow.t > 1) this.fakeNow = null; }
      this.players.forEach((p, i) => {
        const s = this.ps[i];
        if (s.locked) return;
        if (p.isAI && s.jumpAt !== null && this.stT >= s.jumpAt) { s.jumpAt = null; p.ctrl.press('a'); }
        if (ctrlA[i]) this.lock(i);
      });
      if (this.st === 'wait' && this.stT >= this.waitLen) this.goNow();
    } else if (this.st === 'go') {
      this.goT += dt;
      const cands = [];
      this.players.forEach((p, i) => {
        const s = this.ps[i];
        if (s.locked) return;
        if (p.isAI && s.reactAt !== null && this.goT >= s.reactAt) { s.reactAt = null; p.ctrl.press('a'); }
        if (ctrlA[i]) cands.push(i);
      });
      if (cands.length) this.cast(pick(cands));
      else if (this.goT > 6) {
        this.st = 'allout'; this.stT = 0; this.msg = 'Too slow! Try again!';
        this.lant.burst = 0; sfx('aww');
      }
    } else if (this.st === 'resolve') {
      const win = this.ps[this.winner].pts >= GOAL;
      if (!this.finishing && this.stT > (win ? 2.5 : 2.3)) {
        this.roundsPlayed++;
        if (win || this.roundsPlayed >= 16) {
          this.finishing = true;
          this.finishGame();
        } else { this.round++; this.startRound(); }
      }
    } else if (this.st === 'allout') {
      if (this.stT > 1.8) this.startRound();
    }
  }

  finishGame() {
    const pts = this.ps.map((s) => s.pts);
    const wi = pts.indexOf(Math.max(...pts)), wa = this.actors[wi];
    this.api.finish({
      focus: { x: (wa.x + CRYSTAL.x) / 2, y: wa.y - wa.height * 0.7, zoom: 1.3 },
      placements: placementsFromScores(pts),
      stats: this.ps.map((s) => `${s.pts} pt${s.pts === 1 ? '' : 's'}${s.best ? ` · best ${s.best} ms` : ''}`),
    });
  }

  preUpdate(dt) { this.ambient(dt); }
  postUpdate(dt) { this.ambient(dt); }

  /** Animation that always runs (countdown, play, finish). */
  ambient(dt) {
    this.clock = (this.clock || 0) + dt;
    const L = this.lant, o = this.owl;
    this.actors.forEach((a, i) => {
      const s = this.ps[i];
      s.wand = damp(s.wand, s.wandTarget, 14, dt);
      if (s.locked && this.st === 'wait' && (s.puffT -= dt) <= 0) {
        s.puffT = 0.12;
        particles.burst(s.tip.x, s.tip.y, { type: 'spark', count: 1, colors: ['#7ae582', '#b8f5b0'], speed: [20, 70], gravity: -80, life: [0.5, 0.9], size: [4, 8] });
      }
      a.update(dt);
    });
    // lantern light level
    if (this.st === 'go') { L.level = 1; }
    else {
      let tgt = 0.12;
      if (L.flick > 0) { L.flick -= dt; tgt = 0.12 + (Math.sin(this.clock * 55) > 0 ? 0.5 : 0.05) * (0.4 + Math.random() * 0.6); L.level = lerp(L.level, tgt, 0.7); }
      else L.level = damp(L.level, tgt, 6, dt);
      L.burst = Math.max(0, L.burst - dt * 1.5);
    }
    // swing: springy pendulum, nudged by moths
    L.swingV += (-L.swing * 30 - L.swingV * 2.2) * dt; L.swing += L.swingV * dt;
    if (this.st === 'go' || this.st === 'resolve') L.swingV += Math.sin(this.clock * 7) * 0.05;
    // owl
    o.t += dt;
    if (o.mode !== 'idle') {
      const dur = { ruffle: 0.8, hoot: 1.0, alert: 99, cheer: 2.4 }[o.mode] || 1;
      if (o.t > dur) o.mode = 'idle';
    }
    if (this.st === 'wait' || this.st === 'intro') { if (o.mode === 'alert' || o.mode === 'cheer') o.mode = 'idle'; }
    o.blink -= dt;
    if (o.blink <= 0) { o.blinking = 0.14; o.blink = rand(1.8, 4.5); }
    if (o.blinking > 0) o.blinking -= dt;
    // eyes track the lantern (or the winner, or a moth)
    let lx = HANG.x - OWL.x, ly = 100;
    if (this.moths.length) { lx = this.moths[0].x - OWL.x; ly = this.moths[0].y - (OWL.y - 180); }
    else if (this.winner >= 0 && this.st === 'resolve') { lx = this.actors[this.winner].x - OWL.x; ly = 600; }
    else if (this.st === 'go') { lx = 0; ly = 600; }
    const m = Math.hypot(lx, ly) || 1;
    o.look.x = damp(o.look.x, lx / m, 10, dt); o.look.y = damp(o.look.y, ly / m, 10, dt);
    // moths
    for (const mo of this.moths) {
      mo.t += dt; mo.x += mo.dir * mo.spd * dt; mo.y += Math.sin(mo.t * 5 + mo.ph) * 60 * dt;
      if (Math.random() < dt * 14) particles.burst(mo.x, mo.y, { type: 'sparkle', count: 1, colors: ['#fff6c8', '#ffe9a0'], speed: [5, 30], life: [0.3, 0.6], size: [6, 10], gravity: 20 });
      if (Math.abs(mo.x - HANG.x) < 60 && !mo.nudged) { mo.nudged = true; L.swingV += mo.dir * 1.6; }
    }
    this.moths = this.moths.filter((mo) => mo.x > -80 && mo.x < W + 80);
    // crystal
    if (this.cry.hit >= 0) { this.cry.hit += dt; if (this.cry.hit > 2.4) this.cry.hit = -1; }
    this.cry.flash = Math.max(0, this.cry.flash - dt * 2.2);
    // beams
    for (const b of this.beams) {
      b.t += dt;
      if (b.t < 0.45 && Math.random() < 0.9) {
        const s = this.ps[b.i], p = clamp(b.t / 0.2, 0, 1);
        particles.burst(lerp(s.tip.x, CRYSTAL.x, p) + rand(-12, 12), lerp(s.tip.y, CRYSTAL.y, p) + rand(-12, 12), { type: 'sparkle', count: 1, colors: [b.color, '#fff', '#ffd23f'], speed: [10, 90], life: [0.3, 0.7], size: [10, 18] });
      }
    }
    this.beams = this.beams.filter((b) => b.t < 0.65);
    // rockets
    for (const r of this.rockets) {
      r.t += dt;
      const k = clamp(r.t / r.dur, 0, 1), e = ease.outQuad(k);
      r.px = lerp(r.x, r.tx, e) + Math.sin(k * 9) * 10 * (1 - k); r.py = lerp(r.y, r.ty, e);
      particles.burst(r.px, r.py, { type: 'spark', count: 2, colors: ['#ffd23f', r.color, '#fff'], speed: [10, 60], life: [0.2, 0.45], size: [3, 6], gravity: 120 });
      if (r.t >= r.dur) {
        r.dead = true;
        const cols = [r.color, '#ffd23f', '#ffffff', r.color, pick(RAINBOW)];
        particles.burst(r.tx, r.ty, { type: 'spark', count: r.big ? 46 : 32, colors: cols, speed: [180, 520], life: [0.7, 1.3], size: [4, 8], gravity: 260 });
        particles.burst(r.tx, r.ty, { type: 'star', count: r.big ? 14 : 8, colors: cols, speed: [120, 380], life: [0.8, 1.4] });
        particles.burst(r.tx, r.ty, { type: 'sparkle', count: 10, colors: ['#fff', '#fff6a8'], speed: [60, 260], life: [0.7, 1.2] });
        particles.ring(r.tx, r.ty, r.color, 200, 0.5);
        sfx(chance(0.5) ? 'pop' : 'sparkle', { vol: 0.6 });
        fx.shake(5, 0.12);
      }
    }
    this.rockets = this.rockets.filter((r) => !r.dead);
    // green puffs
    for (const pf of this.puffs) { pf.t += dt; pf.y -= 30 * dt; pf.x += pf.vx * dt; }
    this.puffs = this.puffs.filter((pf) => pf.t < pf.life);
    // delayed callbacks
    for (const l of this.later) l.t -= dt;
    const due = this.later.filter((l) => l.t <= 0);
    this.later = this.later.filter((l) => l.t > 0);
    due.forEach((l) => l.fn());
  }

  // ----- drawing -----------------------------------------------------------

  makeBackground() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    ui.sky(g, '#0d0a33', '#5b3a96', 700);
    const gr = g.createLinearGradient(0, 380, 0, 700); gr.addColorStop(0, 'rgba(255,140,200,0)'); gr.addColorStop(1, 'rgba(255,150,170,0.35)');
    g.fillStyle = gr; g.fillRect(0, 380, W, 320);
    // moon
    const mx = 250, my = 215;
    const mg = g.createRadialGradient(mx, my, 40, mx, my, 240); mg.addColorStop(0, 'rgba(255,248,200,0.5)'); mg.addColorStop(1, 'rgba(255,248,200,0)');
    g.fillStyle = mg; g.fillRect(mx - 260, my - 260, 520, 520);
    g.fillStyle = '#fff7cf'; g.beginPath(); g.arc(mx, my, 92, 0, TAU); g.fill();
    g.fillStyle = '#eadf9f';
    [[-28, -22, 20], [30, 18, 26], [-8, 40, 12], [34, -34, 10]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, TAU); g.fill(); });
    // far hills
    g.fillStyle = '#2b1f5e'; ui.hills(g, 560, '#2b1f5e', 30, 0.003, 2);
    g.fillStyle = '#231852';
    // castle silhouette
    const castle = (ox, sc, col) => {
      g.save(); g.translate(ox, 650); g.scale(sc, sc); g.fillStyle = col;
      g.fillRect(-380, -120, 760, 140);
      const tower = (x, w, h, roof, win) => {
        g.fillStyle = col; g.fillRect(x - w / 2, -h, w, h + 20);
        g.beginPath(); g.moveTo(x - w / 2 - 14, -h); g.lineTo(x, -h - roof); g.lineTo(x + w / 2 + 14, -h); g.closePath(); g.fill();
        for (let k = 0; k < win; k++) {
          g.fillStyle = k % 3 === 1 ? '#ffb347' : '#ffe08a';
          g.beginPath(); g.moveTo(x - 9, -h * (0.35 + k * 0.2) + 24); g.lineTo(x - 9, -h * (0.35 + k * 0.2)); g.arc(x, -h * (0.35 + k * 0.2), 9, Math.PI, 0); g.lineTo(x + 9, -h * (0.35 + k * 0.2) + 24); g.fill();
        }
        g.fillStyle = col;
      };
      tower(-300, 70, 300, 120, 3); tower(-150, 90, 380, 150, 4); tower(0, 120, 300, 100, 3); tower(150, 80, 420, 170, 4); tower(300, 70, 260, 110, 2);
      // crenellations
      for (let x = -380; x < 380; x += 36) g.fillRect(x, -144, 22, 26);
      g.restore();
    };
    castle(1290, 1.05, '#1c1244');
    // a second smaller tower on the left
    g.save(); g.translate(560, 650); g.scale(0.5, 0.5); g.fillStyle = '#1c1244';
    g.fillRect(-45, -300, 90, 340); g.beginPath(); g.moveTo(-62, -300); g.lineTo(0, -430); g.lineTo(62, -300); g.closePath(); g.fill();
    g.fillStyle = '#ffd86a'; g.fillRect(-9, -220, 18, 36); g.restore();
    // courtyard stone wall
    g.fillStyle = '#34246d'; g.fillRect(0, 600, W, 70);
    g.fillStyle = '#3f2c80';
    for (let x = 0; x < W; x += 60) g.fillRect(x + 8, 590, 40, 22);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3;
    for (let x = 0; x < W; x += 90) { g.beginPath(); g.moveTo(x, 612); g.lineTo(x, 670); g.stroke(); }
    // floor
    const fg = g.createLinearGradient(0, 670, 0, H); fg.addColorStop(0, '#4b3a8f'); fg.addColorStop(1, '#2a1d5e');
    g.fillStyle = fg; g.fillRect(0, 670, W, H - 670);
    g.strokeStyle = 'rgba(20,10,60,0.4)'; g.lineWidth = 3;
    for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(W / 2 + k * 95, 670); g.lineTo(W / 2 + k * 340, H); g.stroke(); }
    for (let k = 0; k < 7; k++) { const yy = 670 + Math.pow(k / 6, 1.7) * (H - 670); g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    // rune circle for the duelists
    g.save(); g.translate(W / 2, 960); g.scale(1, 0.14); g.strokeStyle = 'rgba(190,150,255,0.35)'; g.lineWidth = 16;
    g.beginPath(); g.arc(0, 0, 900, 0, TAU); g.stroke(); g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 840, 0, TAU); g.stroke(); g.restore();
    // vignette
    const vg = g.createRadialGradient(W / 2, H / 2, 400, W / 2, H / 2, 1150); vg.addColorStop(0, 'rgba(10,5,40,0)'); vg.addColorStop(1, 'rgba(10,5,40,0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  }

  drawWand(g, info, i) {
    const s = this.ps[i], a = this.actors[i];
    const hx = info.hand.x, hy = info.hand.y;
    const len = info.h * 0.46;
    let ang = s.wand;
    if (this.st === 'wait' && !s.locked) ang += Math.sin(this.clock * 3 + i) * 0.04 + (this.stT > this.waitLen - 0.6 ? Math.sin(this.clock * 40) * 0.015 : 0);
    const tx = hx + Math.cos(ang) * len, ty = hy + Math.sin(ang) * len;
    // grip is the hand; draw the shaft a little behind it
    const bx = hx - Math.cos(ang) * len * 0.18, by = hy - Math.sin(ang) * len * 0.18;
    g.lineCap = 'round';
    g.strokeStyle = NAVY; g.lineWidth = 11; g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
    g.strokeStyle = '#8b5a2b'; g.lineWidth = 6.5; g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 7; g.beginPath(); g.moveTo(bx + (tx - bx) * 0.12, by + (ty - by) * 0.12); g.lineTo(bx + (tx - bx) * 0.2, by + (ty - by) * 0.2); g.stroke();
    // star tip
    const glow = s.locked ? 0.15 : 0.7 + Math.sin(this.clock * 6 + i) * 0.3 + (this.st === 'go' ? 0.6 : 0);
    g.save(); g.translate(tx, ty);
    { const gr = 34 * (info.h / 170) * (0.9 + glow * 0.3);
      const rg = g.createRadialGradient(0, 0, 2, 0, 0, gr);
      const c = s.locked ? '122,229,130' : '255,236,140';
      rg.addColorStop(0, `rgba(${c},${clamp(glow * 0.8, 0, 1)})`); rg.addColorStop(1, `rgba(${c},0)`);
      g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.beginPath(); g.arc(0, 0, gr, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = 1; g.rotate(Math.sin(this.clock * 2 + i) * 0.3);
    drawStarShape(g, 30 * (info.h / 170), s.locked ? '#9dd8a0' : '#ffd23f');
    g.restore();
    // remember the tip in logical screen coordinates (for beams and puffs)
    if (this.baseInv) {
      const m = g.getTransform();
      const pt = m.transformPoint({ x: tx, y: ty });
      const lp = this.baseInv.transformPoint(pt);
      s.tip.x = lp.x; s.tip.y = lp.y;
    }
  }

  draw(g) {
    this.baseInv = null;
    try { this.baseInv = g.getTransform().inverse(); } catch (e) { /* ignore */ }
    const L = this.lant;
    const bg = art('bg/wizard-quickdraw');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(this.bg, 0, 0);
    this.drawStars(g);
    this.drawFog(g);
    this.drawCandles(g);
    this.drawPerchAndOwl(g);
    this.drawLantern(g);
    this.moths.forEach((m) => this.drawMoth(g, m));
    this.drawCrystal(g);
    // players
    this.actors.forEach((a, i) => {
      const s = this.ps[i], p = this.players[i];
      a.draw(g, { ring: s.locked ? '#7ae582' : p.color, alpha: s.locked ? 0.85 : 1 });
    });
    this.drawBeams(g);
    this.drawRockets(g);
    this.puffs.forEach((pf) => {
      const k = pf.t / pf.life;
      g.save(); g.globalAlpha = 0.65 * (1 - k); g.fillStyle = '#7ae582'; g.strokeStyle = '#2f9e44'; g.lineWidth = 3;
      g.beginPath(); g.arc(pf.x, pf.y, pf.r * (0.7 + k), 0, TAU); g.fill(); g.restore();
    });
    // go-glow tint over everything
    if (L.burst > 0 || this.st === 'go') {
      g.save(); g.globalAlpha = (this.st === 'go' ? 0.12 : L.burst * 0.12) + (this.st === 'go' ? Math.sin(this.clock * 12) * 0.02 : 0);
      g.fillStyle = '#ffd23f'; g.fillRect(0, 0, W, H); g.restore();
    }
    this.drawWorldHud(g);
  }

  drawStars(g) {
    g.save(); g.fillStyle = '#fff';
    for (const s of this.stars) {
      g.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin((this.clock || 0) * s.sp + s.ph));
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
    }
    g.restore();
  }

  drawFog(g) {
    const t = this.clock || 0;
    g.save(); g.globalAlpha = 0.16; g.fillStyle = '#d9c8ff';
    for (let k = 0; k < 6; k++) {
      const x = ((k * 420 + t * 14) % (W + 500)) - 250;
      g.beginPath(); g.ellipse(x, 690 + (k % 3) * 22, 260, 38, 0, 0, TAU); g.fill();
    }
    g.restore();
  }

  drawCandles(g) {
    const t = this.clock || 0;
    const boost = this.st === 'go' ? 1 : this.lant.burst;
    for (const c of this.candles) {
      const bob = Math.sin(t * 1.3 + c.ph) * 12;
      const x = c.x + Math.sin(t * 0.7 + c.ph) * 8, y = c.y + bob, s = c.sz;
      g.save(); g.translate(x, y); g.scale(s, s);
      // glow
      const fl = 0.8 + Math.sin(t * 9 + c.ph * 3) * 0.1 + boost * 0.5;
      const rg = g.createRadialGradient(0, -52, 2, 0, -52, 70 * fl);
      rg.addColorStop(0, 'rgba(255,220,120,0.55)'); rg.addColorStop(1, 'rgba(255,200,80,0)');
      g.fillStyle = rg; g.fillRect(-90, -130, 180, 160);
      // candle body
      g.fillStyle = '#fff4dc'; g.strokeStyle = NAVY; g.lineWidth = 4;
      ui.roundRect(g, -13, -40, 26, 56, 7); g.fill(); g.stroke();
      g.fillStyle = '#ffd8ee'; g.beginPath(); g.ellipse(0, -40, 13, 5, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.moveTo(-9, -8); g.quadraticCurveTo(-4, 4, -8, 14); g.lineTo(-13, 14); g.lineTo(-13, -8); g.fill();
      // flame
      g.fillStyle = '#ffb02e'; g.beginPath(); g.moveTo(0, -78 * (0.95 + boost * 0.2));
      g.bezierCurveTo(12, -58, 11, -44, 0, -42); g.bezierCurveTo(-11, -44, -12, -58, 0, -78 * (0.95 + boost * 0.2)); g.fill();
      g.fillStyle = '#fff3a0'; g.beginPath(); g.ellipse(0, -52, 4.5, 8, 0, 0, TAU); g.fill();
      g.restore();
    }
  }

  drawPerchAndOwl(g) {
    // posts and beam
    g.save();
    g.fillStyle = '#6b4423'; g.strokeStyle = NAVY; g.lineWidth = 6;
    ui.roundRect(g, OWL.x - 18, OWL.y + 6, 36, 190, 8); g.fill(); g.stroke();
    ui.roundRect(g, OWL.x - 40, OWL.y + 190, 80, 22, 8); g.fill(); g.stroke();
    ui.roundRect(g, OWL.x - 190, OWL.y - 6, 380, 34, 17); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3;
    for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(OWL.x + k * 40, OWL.y + 6); g.lineTo(OWL.x + k * 40 + 10, OWL.y + 22); g.stroke(); }
    // lantern staff
    const sb = { x: OWL.x + 40, y: OWL.y - 4 }, top = { x: HANG.x - 36, y: HANG.y - 4 };
    g.lineCap = 'round';
    g.strokeStyle = NAVY; g.lineWidth = 17; g.beginPath(); g.moveTo(sb.x, sb.y); g.lineTo(top.x, top.y); g.stroke();
    g.beginPath(); g.moveTo(top.x, top.y); g.quadraticCurveTo(top.x + 4, top.y - 46, HANG.x, top.y - 28); g.quadraticCurveTo(HANG.x + 40, top.y - 20, HANG.x, HANG.y - 4); g.stroke();
    g.strokeStyle = '#a06a35'; g.lineWidth = 9; g.beginPath(); g.moveTo(sb.x, sb.y); g.lineTo(top.x, top.y); g.stroke();
    g.beginPath(); g.moveTo(top.x, top.y); g.quadraticCurveTo(top.x + 4, top.y - 46, HANG.x, top.y - 28); g.quadraticCurveTo(HANG.x + 40, top.y - 20, HANG.x, HANG.y - 4); g.stroke();
    g.restore();
    // owl
    const o = this.owl;
    const hootAmt = o.mode === 'hoot' ? Math.sin(clamp(o.t / 1, 0, 1) * Math.PI) : 0;
    g.save();
    g.translate(OWL.x, OWL.y);
    if (o.mode === 'ruffle') { const k = 1 - o.t / 0.8; g.translate(Math.sin(o.t * 70) * 5 * k, 0); g.scale(1 + 0.07 * k * Math.abs(Math.sin(o.t * 30)), 1 + 0.07 * k); }
    if (o.mode === 'cheer') g.translate(0, -Math.abs(Math.sin(o.t * 9)) * 22);
    if (o.mode === 'alert') g.translate(0, -6 + Math.sin(this.clock * 14) * 1.5);
    if (o.mode === 'hoot') g.scale(1 + hootAmt * 0.04, 1 - hootAmt * 0.03);
    if (!drawArt(g, 'prop/professor-hoot', 0, 0, 260, 330, { anchor: 'bottom' })) this.drawOwlProcedural(g, o, hootAmt);
    g.restore();
    if (o.mode === 'hoot' && o.t > 0.1) ui.text(g, 'hoo...', OWL.x - 150, OWL.y - 270 - o.t * 14, { size: 40, color: '#fff', alpha: Math.sin(clamp(o.t, 0, 1) * Math.PI) });
  }

  drawOwlProcedural(g, o, hootAmt) {
    const lw = 6;
    g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = NAVY;
    const wingUp = o.mode === 'cheer' ? 1 : 0;
    // tail
    g.fillStyle = '#7a4f26'; g.beginPath(); g.moveTo(-34, -20); g.lineTo(-26, 26); g.lineTo(0, 12); g.lineTo(26, 26); g.lineTo(34, -20); g.closePath(); g.fill(); g.stroke();
    // body
    g.fillStyle = '#b07a42'; g.beginPath(); g.ellipse(0, -96, 76, 96, 0, 0, TAU); g.fill(); g.stroke();
    // belly with feather scallops
    g.fillStyle = '#f6dcae'; g.beginPath(); g.ellipse(0, -84, 50, 72, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(176,122,66,0.8)'; g.lineWidth = 3.5;
    for (let r = 0; r < 4; r++) for (let c = -1; c <= 1; c++) { g.beginPath(); g.arc(c * 24 + (r % 2) * 12 - 6, -110 + r * 24, 11, 0.2, Math.PI - 0.2); g.stroke(); }
    g.strokeStyle = NAVY; g.lineWidth = lw;
    // left wing
    g.save(); g.translate(-62, -108); g.rotate(wingUp ? -0.9 : 0.12);
    g.fillStyle = '#8a5a2e'; g.beginPath(); g.ellipse(0, 20, 26, 70, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#6b4423'; g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-12 + k * 12, 50); g.lineTo(-12 + k * 12, 72 - k * 4); g.stroke(); }
    g.restore();
    // feet
    g.strokeStyle = NAVY; g.lineWidth = lw; g.fillStyle = '#ffa63d';
    for (const fx0 of [-26, 26]) for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(fx0 + k * 11, 6, 6.5, 12, k * 0.3, 0, TAU); g.fill(); g.stroke(); }
    // head
    g.fillStyle = '#c28a4d';
    g.beginPath(); g.moveTo(-70, -210); g.lineTo(-52, -248); g.lineTo(-24, -226); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(70, -210); g.lineTo(52, -248); g.lineTo(24, -226); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -178, 80, 66, 0, 0, TAU); g.fill(); g.stroke();
    // face discs
    g.fillStyle = '#f7ead0'; g.lineWidth = 0;
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 36, -180, 40, 42, 0, 0, TAU); g.fill(); }
    g.lineWidth = lw;
    // eyes
    const wide = o.mode === 'alert' ? 1.18 : 1;
    const blink = o.blinking > 0 ? 0.08 : 1;
    for (const sx of [-1, 1]) {
      g.save(); g.translate(sx * 36, -180);
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 26 * wide, 26 * wide * blink, 0, 0, TAU); g.fill();
      if (blink > 0.5) {
        g.fillStyle = '#ffb52e'; g.beginPath(); g.arc(o.look.x * 9, o.look.y * 7, 15 * wide, 0, TAU); g.fill();
        g.fillStyle = NAVY; g.beginPath(); g.arc(o.look.x * 11, o.look.y * 8.5, 8 * wide, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(o.look.x * 11 - 4, o.look.y * 8.5 - 5, 3.5, 0, TAU); g.fill();
      }
      // spectacles
      g.strokeStyle = '#e8ae2f'; g.lineWidth = 7; g.fillStyle = 'rgba(190,235,255,0.22)';
      g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 24, Math.PI * 1.15, Math.PI * 1.5); g.stroke();
      g.restore();
    }
    g.strokeStyle = '#e8ae2f'; g.lineWidth = 6; g.beginPath(); g.moveTo(-6, -184); g.quadraticCurveTo(0, -192, 6, -184); g.stroke();
    // beak
    g.strokeStyle = NAVY; g.lineWidth = lw; g.fillStyle = '#ff9a1f';
    g.beginPath(); g.moveTo(-11, -166); g.lineTo(11, -166); g.lineTo(0, -144 - hootAmt * -2); g.closePath(); g.fill(); g.stroke();
    if (hootAmt > 0.05) { g.fillStyle = '#c0392b'; g.beginPath(); g.ellipse(0, -148, 7 * hootAmt + 1, 9 * hootAmt, 0, 0, TAU); g.fill(); g.fillStyle = '#ff9a1f'; g.beginPath(); g.moveTo(-9, -139); g.lineTo(9, -139); g.lineTo(0, -128 + hootAmt * 8); g.closePath(); g.fill(); g.stroke(); }
    // wizard hat
    g.save(); g.translate(0, -226); g.rotate(-0.1);
    g.fillStyle = '#5b3fb0'; g.lineWidth = lw; g.strokeStyle = NAVY;
    g.beginPath(); g.ellipse(0, 0, 100, 19, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-60, -4); g.quadraticCurveTo(-40, -90, -2, -128); g.quadraticCurveTo(40, -144, 52, -118); g.quadraticCurveTo(24, -96, 58, -4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; g.fillRect(-58, -26, 112, 15);
    g.strokeRect(-58, -26, 112, 15);
    g.save(); g.translate(-10, -58); g.rotate(0.2); drawStarShape(g, 26, '#ffd23f'); g.restore();
    g.save(); g.translate(26, -92); g.rotate(-0.3); drawStarShape(g, 18, '#ffd23f'); g.restore();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(51, -118, 8, 0, TAU); g.fill(); g.stroke();
    g.restore();
    // right wing gripping the staff
    g.save(); g.translate(58, -126); g.rotate(-0.5 - (wingUp ? 0.7 : 0));
    g.fillStyle = '#8a5a2e'; g.strokeStyle = NAVY; g.lineWidth = lw;
    g.beginPath(); g.ellipse(0, 24, 24, 62, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
  }

  drawLantern(g) {
    const L = this.lant, lvl = clamp(L.level, 0, 1);
    const go = this.st === 'go';
    g.save();
    g.translate(HANG.x, HANG.y);
    g.rotate(L.swing * 0.35);
    // chain
    g.strokeStyle = NAVY; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 44); g.stroke();
    g.strokeStyle = '#d6b25e'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 44); g.stroke();
    g.translate(0, 44);
    // glow (additive-ish)
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gr = 90 + lvl * 160 + (go ? 340 + Math.sin(this.clock * 10) * 30 : L.burst * 240);
    const gg = g.createRadialGradient(0, 62, 6, 0, 62, gr);
    const col = go || L.burst > 0 ? '255,214,70' : '255,170,90';
    gg.addColorStop(0, `rgba(${col},${0.2 + lvl * (go ? 0.8 : 0.45)})`); gg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gg; g.fillRect(-gr, 62 - gr, gr * 2, gr * 2);
    if (go) {
      g.globalAlpha = 0.45; g.fillStyle = '#ffe27a';
      for (let k = 0; k < 12; k++) {
        const a = this.clock * 0.9 + (k / 12) * TAU;
        g.beginPath(); g.moveTo(0, 62); g.lineTo(Math.cos(a - 0.07) * 820, 62 + Math.sin(a - 0.07) * 820); g.lineTo(Math.cos(a + 0.07) * 820, 62 + Math.sin(a + 0.07) * 820); g.closePath(); g.fill();
      }
    }
    g.restore();
    // cap
    g.fillStyle = '#4a3b2a'; g.strokeStyle = NAVY; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-30, 14); g.lineTo(-14, -6); g.lineTo(14, -6); g.lineTo(30, 14); g.closePath(); g.fill(); g.stroke();
    // glass body
    const bodyCol = go ? '#ffe46a' : `rgb(${Math.round(70 + lvl * 300)},${Math.round(50 + lvl * 230)},${Math.round(40 + lvl * 40)})`;
    g.fillStyle = bodyCol;
    ui.roundRect(g, -36, 12, 72, 100, 18); g.fill(); g.stroke();
    // flame
    const fs = go ? 1.5 : 0.55 + lvl * 1.4;
    g.save(); g.translate(0, 98);
    g.fillStyle = go ? '#ffffff' : '#ffb347';
    g.beginPath(); g.moveTo(0, -62 * fs); g.bezierCurveTo(24 * fs, -28 * fs, 20 * fs, -2, 0, 0); g.bezierCurveTo(-20 * fs, -2, -24 * fs, -28 * fs, 0, -62 * fs); g.fill();
    g.fillStyle = go ? '#fff6a0' : '#ffe08a'; g.beginPath(); g.ellipse(0, -14 * fs, 7 * fs, 15 * fs, 0, 0, TAU); g.fill();
    g.restore();
    // frame bars + highlight
    g.strokeStyle = '#7a5a2a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-14, 14); g.lineTo(-14, 110); g.moveTo(14, 14); g.lineTo(14, 110); g.stroke();
    ui.roundRect(g, -36, 12, 72, 100, 18); g.strokeStyle = NAVY; g.lineWidth = 6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-24, 46, 5, 20, 0, 0, TAU); g.fill();
    // base
    g.fillStyle = '#4a3b2a'; g.lineWidth = 6; ui.roundRect(g, -40, 108, 80, 18, 8); g.fill(); g.stroke();
    g.restore();
  }

  drawMoth(g, m) {
    const flap = Math.sin(m.t * 30);
    g.save(); g.translate(m.x, m.y); g.scale(1.5, 1.5);
    const rg = g.createRadialGradient(0, 0, 2, 0, 0, 46); rg.addColorStop(0, 'rgba(255,245,200,0.5)'); rg.addColorStop(1, 'rgba(255,245,200,0)');
    g.fillStyle = rg; g.fillRect(-50, -50, 100, 100);
    g.scale(m.dir, 1);
    g.fillStyle = '#f4e6ff'; g.strokeStyle = NAVY; g.lineWidth = 3.5;
    for (const sy of [-1, 1]) {
      g.save(); g.scale(1, 1); g.translate(-4, 0); g.rotate(sy * (0.5 + flap * 0.55));
      g.beginPath(); g.ellipse(-4, -sy * 0 - 12, 13, 22, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
    }
    g.fillStyle = '#7a5aa8'; g.beginPath(); g.ellipse(0, 0, 14, 6, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = NAVY; g.lineWidth = 2.5; g.beginPath(); g.moveTo(13, -3); g.quadraticCurveTo(22, -14, 28, -10); g.moveTo(13, -1); g.quadraticCurveTo(24, -6, 30, 0); g.stroke();
    g.restore();
  }

  drawCrystal(g) {
    const t = this.clock || 0, c = this.cry;
    const bob = Math.sin(t * 2) * 8;
    const x = CRYSTAL.x, y = CRYSTAL.y + bob;
    const hit = c.hit >= 0;
    const hk = hit ? clamp(c.hit / 0.6, 0, 1) : 0;
    g.save(); g.translate(x, y);
    // base glow
    const gl = g.createRadialGradient(0, 0, 10, 0, 0, 170 + c.flash * 160);
    const gc = hit ? c.color : '#7fe6ff';
    gl.addColorStop(0, hit ? 'rgba(255,255,255,0.5)' : 'rgba(127,230,255,0.35)'); gl.addColorStop(1, 'rgba(127,230,255,0)');
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(-340, -340, 680, 680); g.restore();
    // runes ring on the floor beneath
    g.save(); g.translate(0, 112 - bob); g.scale(1, 0.22); g.strokeStyle = 'rgba(190,230,255,0.55)'; g.lineWidth = 8;
    g.beginPath(); g.arc(0, 0, 80 + Math.sin(t * 2) * 4, 0, TAU); g.stroke(); g.restore();
    // bloom petals (crystal flower)
    if (hit) {
      const bl = ease.outBack(clamp(c.hit / 0.5, 0, 1)), fade = c.hit > 1.6 ? 1 - (c.hit - 1.6) / 0.8 : 1;
      g.save(); g.globalAlpha = clamp(fade, 0, 1);
      for (let k = 0; k < 10; k++) {
        g.save(); g.rotate((k / 10) * TAU + t * 0.4);
        const len = 130 * bl * (k % 2 ? 0.72 : 1);
        g.fillStyle = k % 2 ? '#ffffff' : c.color; g.strokeStyle = NAVY; g.lineWidth = 4;
        g.beginPath(); g.moveTo(0, -30); g.lineTo(18, -30 - len * 0.45); g.lineTo(0, -30 - len); g.lineTo(-18, -30 - len * 0.45); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      g.restore();
    }
    // the crystal itself
    const sc = 1 + (hit ? Math.sin(hk * Math.PI) * 0.25 : 0) + c.flash * 0.1;
    g.scale(sc, sc); g.rotate(hit ? Math.sin(c.hit * 8) * 0.06 * (1 - hk) : Math.sin(t * 1.3) * 0.03);
    const r = 66;
    const body = hit && c.hit < 1.2 ? c.color : '#7fe6ff';
    g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = NAVY;
    g.fillStyle = body;
    g.beginPath(); g.moveTo(0, -r * 1.35); g.lineTo(r * 0.85, -r * 0.4); g.lineTo(r * 0.55, r * 0.95); g.lineTo(-r * 0.55, r * 0.95); g.lineTo(-r * 0.85, -r * 0.4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(0, -r * 1.35); g.lineTo(-r * 0.85, -r * 0.4); g.lineTo(-r * 0.2, -r * 0.35); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,20,120,0.28)'; g.beginPath(); g.moveTo(0, -r * 1.35); g.lineTo(r * 0.85, -r * 0.4); g.lineTo(r * 0.2, -r * 0.35); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,20,120,0.22)'; g.beginPath(); g.moveTo(-r * 0.2, -r * 0.35); g.lineTo(r * 0.2, -r * 0.35); g.lineTo(r * 0.55, r * 0.95); g.lineTo(-r * 0.55, r * 0.95); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-r * 0.85, -r * 0.4); g.lineTo(-r * 0.2, -r * 0.35); g.lineTo(-r * 0.55, r * 0.95); g.moveTo(r * 0.85, -r * 0.4); g.lineTo(r * 0.2, -r * 0.35); g.lineTo(r * 0.55, r * 0.95); g.moveTo(-r * 0.2, -r * 0.35); g.lineTo(r * 0.2, -r * 0.35); g.stroke();
    // twinkle
    const tw = (Math.sin(t * 4) + 1) / 2;
    g.save(); g.translate(-r * 0.4, -r * 0.7); g.globalAlpha = 0.4 + tw * 0.6; g.fillStyle = '#fff'; starPath(g, 16 + tw * 8, 0.25, 4); g.fill(); g.restore();
    g.restore();
  }

  drawBeams(g) {
    for (const b of this.beams) {
      const s = this.ps[b.i];
      if (!s.tip.x) continue;
      const p = clamp(b.t / 0.2, 0, 1), fade = b.t > 0.35 ? 1 - (b.t - 0.35) / 0.3 : 1;
      const ex = lerp(s.tip.x, CRYSTAL.x, p), ey = lerp(s.tip.y, CRYSTAL.y, p);
      const dx = ex - s.tip.x, dy = ey - s.tip.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      g.save(); g.globalAlpha = clamp(fade, 0, 1); g.lineCap = 'round'; g.lineJoin = 'round';
      const path = () => {
        g.beginPath(); g.moveTo(s.tip.x, s.tip.y);
        const segs = 14;
        for (let k = 1; k <= segs; k++) {
          const f = k / segs, w = Math.sin(f * 14 - this.clock * 40) * 16 * Math.sin(f * Math.PI);
          g.lineTo(s.tip.x + dx * f + nx * w, s.tip.y + dy * f + ny * w);
        }
      };
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = b.color; g.globalAlpha *= 0.55; g.lineWidth = 44; path(); g.stroke();
      g.globalAlpha = clamp(fade, 0, 1); g.strokeStyle = '#ffd23f'; g.lineWidth = 18; path(); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 7; path(); g.stroke();
      g.restore();
      g.save(); g.translate(ex, ey); g.globalAlpha = clamp(fade, 0, 1); g.rotate(this.clock * 6); drawStarShape(g, 60, '#fff6a8'); g.restore();
    }
  }

  drawRockets(g) {
    for (const r of this.rockets) {
      if (r.px === undefined) continue;
      g.save(); g.translate(r.px, r.py); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
      g.fillStyle = r.color; g.globalAlpha = 0.6; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill(); g.restore();
    }
  }

  /** Tags, point pips and the reaction plate live in the world (they follow the camera). */
  drawWorldHud(g) {
    const n = this.n;
    this.actors.forEach((a, i) => {
      const s = this.ps[i], p = this.players[i];
      const top = a.y - a.height - 34 - (a.pose === 'celebrate' ? 14 : 0);
      ui.playerTag(g, p, a.x, top);
      // point pips
      const pr = 17 * (n > 6 ? 0.8 : 1), gap = pr * 2.5;
      for (let k = 0; k < GOAL; k++) {
        g.save(); g.translate(a.x + (k - (GOAL - 1) / 2) * gap, a.y + 32);
        const filled = k < s.pts;
        if (filled) drawStarShape(g, pr * 2.1, '#ffd23f');
        else { starPath(g, pr * 1.2); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.stroke(); }
        g.restore();
      }
      if (s.locked && (this.st === 'wait' || this.st === 'go' || this.st === 'allout')) {
        ui.text(g, 'Fizzled!', a.x, a.y + 64, { size: 28, color: '#9dffa8', strokeWidth: 6 });
      }
    });
    // reaction plate
    if (this.st === 'resolve' && this.res) {
      const a = this.actors[this.res.i], k = clamp(this.stT / 0.35, 0, 1), sc = ease.outBack(k);
      const word = this.res.ms < 250 ? 'Lightning!' : this.res.ms < 350 ? 'Super fast!' : this.res.ms < 500 ? 'Nice!' : 'Got it!';
      const top = a.y - a.height - 135;
      g.save(); g.translate(a.x, top); g.scale(sc, sc);
      ui.panel(g, -130, -62, 260, 104, { fill: '#fff8ec', stroke: this.players[this.res.i].color });
      ui.text(g, `${this.res.ms} ms`, 0, -22, { size: 54, color: '#24163f', stroke: false, weight: 800 });
      ui.text(g, word, 0, 22, { size: 30, color: this.players[this.res.i].color, strokeWidth: 5 });
      g.restore();
    }

  }

  /** Screen-space HUD (drawn by the host after the camera). */
  drawHUD(g) {
    ui.scoreboard(g, this.players, this.ps.map((s) => s.pts), { y: 30, format: (v) => `${v}/${GOAL}` });
    // CAST!
    if (this.st === 'go') {
      const k = clamp(this.goT / 0.3, 0, 1), sc = ease.outElastic(k) * (1 + Math.sin(this.clock * 14) * 0.03);
      g.save(); g.translate(1390, 330); g.rotate(-0.06); g.scale(sc, sc);
      ui.text(g, 'CAST!', 0, 0, { size: 230, color: '#ffe14a', strokeWidth: 36, weight: 800 });
      g.restore();
    }

    // messages
    if (this.st === 'intro') {
      ui.banner(g, `Round ${this.round}`, this.stT, { y: 430, size: 120, color: '#ffffff', strokeWidth: 20 });
    }
    if (this.st === 'wait' && this.roundsPlayed < 2 && this.stT > 0.2) {
      ui.text(g, 'Wait for the golden light...', W / 2, 168, { size: 48, color: '#ffffff', alpha: 0.9 });
    }
    if (this.st === 'allout' && this.msg) {
      ui.banner(g, this.msg, this.stT, { y: 440, size: 72, color: '#9dffa8', strokeWidth: 16 });
    }
    if (this.st === 'resolve' && this.stT > 0.55 && this.res) {
      const win = this.ps[this.res.i].pts >= GOAL;
      if (win) ui.banner(g, `${this.players[this.res.i].tag} wins the duel!`, this.stT - 0.55, { y: 440, size: 96, color: '#ffd23f', strokeWidth: 18 });
    }
  }
}
