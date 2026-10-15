// Rainbow Tug-of-War - the first TEAM game.
// Players split into Pink Team (left) and Blue Team (right) and pull a
// rainbow rope across a puddle of rainbow jelly. Pulling is a rhythm
// "heave-ho": a ring shrinks onto the beat heart and pressing A ON the beat
// gives a strong pull, off the beat a weak one - and you only get one pull per
// beat, so timing beats mashing. Events: SUPER PULL (everyone mashes X) and a
// banana peel that slides under the leading team (B to hop over it). Best of
// three short pulls; the losers slide into the jelly with a splash and pop
// out giggling.
import { W, H } from '../engine/canvas.js';
import { Actor, POSES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, music, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { PLAYER_COLORS } from '../data/characters.js';
import { randomFreeCharacter } from '../state.js';
import { clamp, lerp, damp, rand, pick, chance, shuffle, ease, later, TAU } from '../engine/util.js';
import {
  TEAMS, JELLY, NAVY, drawBackground, drawMat, drawGoalFlag, drawPool, drawRipple, drawRope, ropeYAt,
  drawBow, drawBanana, drawBeatHeart, drawIcon,
} from './tug-of-war/draw.js';

const GROUND = 862;                         // feet line
const POOL = { x: 960, y: 884, rx: 205, ry: 50 };
const FRONT = 330;                          // front puller's distance from the centre
const WIN_D = 175;                          // rope offset that dunks the other team
const ROUND_TIME = 15;
const WINS_NEEDED = 2;
const ROUNDS = 3;
const PERFECT = 0.1, GOOD = 0.21;           // timing windows (seconds either side of the beat)
const LATENCY = 0.025;                      // presses land a touch late (input + audio); centre the window on it
const STRENGTH = { perfect: 1, good: 0.6, weak: 0.18 };
const IMP = 200, DECAY = 4;                 // rope impulse per full-team perfect pull; velocity decay per second
// Pulling stance: the requested 'pull' pose once it exists, else the lean-back 'knockback' frames.
const PULL_POSE = POSES.pull ? 'pull' : 'knockback';
// Layout by the bigger team's size: spacing between pullers and character scale.
const LAYOUT = { 1: { sp: 0, sc: 1.5 }, 2: { sp: 230, sc: 1.35 }, 3: { sp: 175, sc: 1.12 }, 4: { sp: 140, sc: 0.98 } };
// CPU timing by level: spread of their press around the beat, bias, chance to skip a beat,
// mash speed (x profile mashRate) and the chance to hop a banana in time.
const CPU = [
  { sigma: 0.19, bias: -0.02, miss: 0.14, mash: 0.62, hop: 0.6 },
  { sigma: 0.11, bias: 0, miss: 0.06, mash: 0.8, hop: 0.82 },
  { sigma: 0.065, bias: 0, miss: 0.025, mash: 0.95, hop: 0.94 },
];

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const beatSfx = () => (hasSound('inst/kick') ? 'inst/kick' : 'stomp');
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

/** Controller for the solo rival (not a session player): same press/pressed interface as an AI pad. */
class GhostCtrl {
  constructor() { this.next = new Set(); this.now = new Set(); }
  press(b) { this.next.add(b); }
  hold() {} move() {} rumble() {}
  reset() { this.next.clear(); this.now.clear(); }
  poll() { this.now = this.next; this.next = new Set(); }
  pressed(b) { return this.now.has(b); }
  held(b) { return this.now.has(b); }
}

export const meta = {
  id: 'tug-of-war',
  title: 'Rainbow Tug-of-War',
  category: 'party',
  type: 'Team game',
  goal: 'Pink Team vs Blue Team: pull the rope on the beat and splash the other team into the jelly!',
  controls: [['a', 'Pull - right on the beat!'], ['x', 'SUPER PULL: mash!'], ['b', 'Hop over the banana']],
  tips: [
    'Press A as the ring hits the heart. One pull per beat!',
    'Whole team on the beat = TEAM HEAVE!',
    'Win 2 of 3 pulls. A smaller team pulls extra hard.',
  ],
  music: 'gameon',
  duration: '~1 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon,
};

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.solo = this.n === 1;
    this.t = 0;
    // Teams: alternate slots (P1 pink, P2 blue, ...). Solo: a CPU rival joins Blue.
    const list = this.players.slice();
    if (this.solo) {
      this.ghost = {
        index: 1, charId: randomFreeCharacter(this.players), variant: 0, glow: null, color: PLAYER_COLORS[1],
        tag: 'CPU', isAI: true, aiLevel: api.level ?? 0, ctrl: new GhostCtrl(), stars: 0, ghost: true,
      };
      list.push(this.ghost);
    }
    this.teams = [[], []];
    list.forEach((p, i) => this.teams[i % 2].push(p));
    this.size = this.teams.map((t) => t.length);
    const maxSize = Math.max(...this.size);
    this.power = this.size.map((s) => maxSize / s);     // shown as "x2 power" on the smaller team
    const L = LAYOUT[maxSize] || LAYOUT[4];
    this.sp = L.sp;
    this.members = [];
    this.teams.forEach((tp, team) => tp.forEach((p, k) => {
      const side = TEAMS[team].side;
      const off = FRONT + k * L.sp;
      const a = new Actor(p, { scale: L.sc, x: W / 2 + side * off, y: GROUND, facing: -side });
      const baseW = a.width / a.scale;
      a.scale = Math.min(L.sc, (L.sp ? L.sp * 1.15 : 380) / baseW);
      a.facing = -side; a.snap();
      a.setPose(PULL_POSE); a.poseTime = 0.4;   // skip the knockback pose's red flash
      this.members.push({
        p, ctrl: p.ctrl, team, k, side, a, off, isAI: !!p.isAI, ghost: !!p.ghost,
        x: a.x, y: GROUND, z: 0, vz: 0, state: 'pull', st: 0,
        pulse: 0, lean: 0.08, lastCycle: -99, extra: 0, grade: null,
        onBeat: 0, roundOnBeat: 0, perfects: 0, streak: 0, slip: 0, mash: 0, goo: 0, gooCol: JELLY[0],
        gx: null, gy: null, ang: 0, nagged: 0,
        ai: { cycle: -99, off: 0, skip: false, pressed: false, mashT: rand(0.1, 0.3), hopAt: null },
      });
    }));
    this.real = this.members.filter((m) => !m.ghost);
    this.wins = [0, 0];
    this.round = 1;
    this.phase = 'countdown';     // countdown | pull | end | reset | ready
    this.phaseT = 0;
    this.roundT = 0;
    this.pos = 0; this.vel = 0;   // rope offset (+ = toward Blue) and its speed
    this.jig = { p: 0, v: 0 };    // rope wobble spring
    this.poolWob = 0;
    this.event = null;
    this.events = [];
    this.mashing = false;
    this.finished = false;
    this.banner = null;           // { text, color, t, size }
    this.flash = [0, 0];          // team flag glow
    this.teamHeave = null;        // { team, t }
    this.splashed = false;
    // beat clock: bt counts heaves (two music beats each)
    this.period = 0.9375; this.bt = 0; this.beatInt = 0; this.pulse = 0; this.mbPrev = null;
    this.cpuSoundCycle = [-1, -1];
    this.clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 470 + 120, y: 250 + (i % 3) * 60, s: 0.8 + (i % 2) * 0.35, v: 12 + i * 3 }));
    this.updatePositions(0);
  }

  // ---- beat clock -------------------------------------------------------
  /** Heave clock, phase-locked to the music when it is playing (2 beats per heave). */
  updateBeat(dt) {
    const bpm = music.song ? music.bpm : 0;
    this.period = bpm >= 90 && bpm <= 170 ? 120 / bpm : 0.9375;
    this.bt += dt / this.period;
    if (music.song) {
      const mb = music.beat() / 2;
      const adv = this.mbPrev === null ? 0 : mb - this.mbPrev;
      this.mbPrev = mb;
      const want = dt / this.period;
      if (mb > 0 && adv > want * 0.4 && adv < want * 2.5) {
        let d = mb - this.bt; d -= Math.round(d);
        this.bt += d * Math.min(1, dt * 6);
      }
    }
    const bi = Math.floor(this.bt);
    if (bi > this.beatInt) { this.beatInt = bi; this.onBeat(bi); }
    this.pulse = Math.max(0, this.pulse - dt * 3.2);
  }

  onBeat(b) {
    this.pulse = 1;
    if (this.phase === 'pull' || this.phase === 'countdown' || this.phase === 'ready') {
      if (!this.mashing) sfx(beatSfx(), { vol: this.phase === 'pull' ? 0.42 : 0.3 });
    }
    if (this.phase === 'ready' && this.readyBeat - b > 0) sfx('count', { vol: 0.5 });
    if (this.phase === 'pull') this.checkTeamHeave(b - 1);
  }

  /** Every member of a team (2+) pulled PERFECT on the same beat: bonus yank. */
  checkTeamHeave(cycle) {
    for (let team = 0; team < 2; team++) {
      if (this.size[team] < 2) continue;
      const ms = this.members.filter((m) => m.team === team);
      if (!ms.every((m) => m.lastCycle === cycle && m.grade === 'perfect')) continue;
      this.vel += TEAMS[team].side * IMP * 0.4;
      this.teamHeave = { team, t: 0 };
      const cx = ms.reduce((s, m) => s + m.x, 0) / ms.length;
      particles.popText(cx, GROUND - 330, 'TEAM HEAVE!', TEAMS[team].color, 64);
      for (const m of ms) {
        particles.burst(m.gx ?? m.x, m.gy ?? m.y - 80, { type: 'star', count: 5, colors: ['#ffd23f', '#ffffff', TEAMS[team].color] });
        m.a.emote('star', 0.8);
      }
      snd('tug-team-heave', 'star', { vol: 0.7 });
      fx.shake(6, 0.15);
      this.jig.v += 260;
    }
  }

  // ---- phases -----------------------------------------------------------
  preUpdate(dt) { this.t += dt; this.updateBeat(dt); this.tickAll(dt); }
  postUpdate(dt) { this.t += dt; this.updateBeat(dt); this.phaseT += dt; if (this.phase === 'end') this.endPhase(dt, true); this.tickAll(dt); }

  update(dt) {
    this.t += dt;
    if (this.ghost) this.ghost.ctrl.poll();
    this.updateBeat(dt);
    this.phaseT += dt;
    if (this.phase === 'countdown') this.startRound();
    if (this.phase === 'pull') this.pullPhase(dt);
    else if (this.phase === 'end') this.endPhase(dt);
    else if (this.phase === 'reset') this.resetPhase(dt);
    else if (this.phase === 'ready') this.readyPhase(dt);
    this.tickAll(dt);
  }

  setPhase(ph) { this.phase = ph; this.phaseT = 0; }

  startRound() {
    this.setPhase('pull');
    this.roundT = 0;
    this.vel = 0;
    this.event = null; this.mashing = false;
    for (const m of this.members) {
      m.state = 'pull'; m.lastCycle = -99; m.grade = null; m.slip = 0; m.mash = 0; m.z = 0; m.vz = 0; m.streak = 0;
      m.ai.cycle = -99; m.ai.hopAt = null; m.roundOnBeat = 0;
      m.a.clearEmotes(); m.a.facing = -m.side; m.a.setPose(PULL_POSE); m.a.poseTime = 0.4;
    }
    // One event per round, two in the last one.
    if (this.round === 1) this.events = [{ at: 7, kind: 'super' }];
    else if (this.round === 2) this.events = [{ at: 5.5, kind: 'banana' }];
    else { const k = shuffle(['super', 'banana']); this.events = [{ at: 4.5, kind: k[0] }, { at: 10, kind: k[1] }]; }
    if (this.round > 1) { sfx('whistle'); this.showBanner('GO!', '#ffffff', 110); }
  }

  showBanner(text, color, size = 110) { this.banner = { text, color, t: 0, size }; }

  pullPhase(dt) {
    this.roundT += dt;
    // events
    if (!this.event && this.events.length && this.roundT >= this.events[0].at) {
      const ev = this.events.shift();
      if (ev.kind === 'super') this.startSuper(); else this.startBanana();
    }
    if (this.event) this.updateEvent(dt);
    // CPUs and input
    for (const m of this.members) {
      if (m.isAI) this.aiInput(m, dt);
      const c = m.ctrl;
      if (this.mashing) { if (c.pressed('x')) this.mashPress(m); }
      else if (c.pressed('a')) this.tryPull(m);
      if (this.event && this.event.kind === 'banana' && c.pressed('b')) this.hop(m);
    }
    // rope physics
    this.vel *= Math.exp(-DECAY * dt);
    this.pos += this.vel * dt;
    // the team being dragged scuffs its feet
    if (Math.abs(this.vel) > 45) {
      const dragged = this.vel > 0 ? 0 : 1;
      for (const m of this.members) if (m.team === dragged && m.z <= 0 && chance(dt * 9)) {
        particles.burst(m.x, m.y - 4, { type: 'dust', count: 1, angle: m.side > 0 ? Math.PI : 0, spread: 0.4, speed: [60, 140] });
      }
    }
    // nervous front pullers near the edge
    for (const m of this.members) {
      if (m.k !== 0) continue;
      const losing = TEAMS[m.team].side * this.pos < -WIN_D * 0.7;
      if (losing && chance(dt * 1.5) && !m.a.emotes.some((e) => e.kind === 'sweat')) m.a.emote('sweat', 0.8);
    }
    if (Math.abs(this.pos) >= WIN_D) { this.endRound(this.pos > 0 ? 1 : 0); return; }
    if (this.roundT >= ROUND_TIME && !this.event) {
      let win;
      if (Math.abs(this.pos) >= 4) win = this.pos > 0 ? 1 : 0;
      else {
        const score = [0, 1].map((t) => this.members.filter((m) => m.team === t).reduce((s, m) => s + m.roundOnBeat, 0) / this.size[t]);
        win = score[0] === score[1] ? pick([0, 1]) : score[1] > score[0] ? 1 : 0;
      }
      this.endRound(win);
    }
  }

  // ---- pulling ----------------------------------------------------------
  tryPull(m) {
    if (m.state !== 'pull' || m.slip > 0 || m.z > 0) return;
    const n = Math.round(this.bt);
    if (m.lastCycle === n) {
      // one pull per beat: extra presses just fumble
      m.extra++;
      if (!m.isAI && m.extra === 3 && m.nagged < 3) {
        m.nagged++;
        const h = m.a.anchor('head');
        particles.popText(h.x, h.y - 70, 'Wait for the beat!', '#ffffff', 30);
      }
      return;
    }
    m.lastCycle = n; m.extra = 1;
    const err = (this.bt - n) * this.period - LATENCY;
    const ae = Math.abs(err);
    const grade = ae <= PERFECT ? 'perfect' : ae <= GOOD ? 'good' : 'weak';
    m.grade = grade;
    const str = STRENGTH[grade];
    this.vel += m.side * str * IMP / this.size[m.team];
    this.jig.v += 60 * str;
    m.pulse = grade === 'perfect' ? 1 : grade === 'good' ? 0.7 : 0.35;
    m.a.squash(grade === 'perfect' ? 0.22 : 0.1);
    if (grade !== 'weak') { m.onBeat++; m.roundOnBeat++; }
    if (grade === 'perfect') { m.perfects++; m.streak++; } else m.streak = 0;
    const head = m.a.anchor('head');
    const gx = m.gx ?? m.x, gy = m.gy ?? m.y - 80;
    if (grade === 'perfect') {
      particles.burst(gx, gy, { type: 'star', count: m.isAI ? 3 : 6, colors: ['#ffd23f', '#ffffff', TEAMS[m.team].color], speed: [120, 300] });
      particles.burst(m.x, m.y - 4, { type: 'dust', count: 3, angle: m.side > 0 ? 0 : Math.PI, spread: 0.5, speed: [60, 160] });
    }
    if (!m.isAI) {
      const label = grade === 'perfect' ? pick(['Heave!', 'Ho!', 'Perfect!']) : grade === 'good' ? 'Good!' : err < 0 ? 'Too early' : 'Too late';
      const col = grade === 'perfect' ? '#ffd23f' : grade === 'good' ? '#ffffff' : '#c9b8ff';
      const size = (grade === 'perfect' ? 44 : grade === 'good' ? 36 : 30) * (this.members.length > 4 ? 0.85 : 1);
      particles.popText(head.x, head.y - 64, label, col, size);
      if (grade === 'perfect') snd('tug-heave', 'bounce', { vol: 0.55 });
      else if (grade === 'good') sfx('pump', { vol: 0.6 });
      else sfx('tock', { vol: 0.7 });
      m.ctrl.rumble?.(grade === 'perfect' ? 0.5 : 0.2, 70);
      if (m.streak > 0 && m.streak % 4 === 0) {
        particles.popText(head.x, head.y - 110, `${m.streak} in a row!`, TEAMS[m.team].color, 34);
        m.a.emote('star', 0.9); sfx('sparkle', { vol: 0.6 });
      }
    } else if (grade === 'perfect' && this.cpuSoundCycle[m.team] !== n) {
      this.cpuSoundCycle[m.team] = n;
      snd('tug-heave', 'bounce', { vol: 0.28 });
    }
  }

  aiInput(m, dt) {
    const lvl = clamp(m.p.aiLevel ?? 0, 0, 2), C = CPU[lvl];
    if (this.mashing) {
      if (this.event && this.event.t < this.event.warn + m.ai.react) return;
      m.ai.mashT -= dt;
      if (m.ai.mashT <= 0) { m.ctrl.press('x'); m.ai.mashT = 1 / (aiProfile(m.p).mashRate * C.mash * rand(0.85, 1.15)); }
      return;
    }
    if (m.ai.hopAt !== null && this.t >= m.ai.hopAt) { m.ctrl.press('b'); m.ai.hopAt = null; }
    if (m.state !== 'pull' || m.slip > 0 || m.z > 0) return;
    const n = Math.round(this.bt);
    if (m.ai.cycle !== n) {
      m.ai.cycle = n;
      m.ai.skip = chance(C.miss);
      m.ai.off = clamp(gauss() * C.sigma + C.bias, -0.42 * this.period, 0.42 * this.period);
      m.ai.pressed = false;
    }
    if (m.ai.skip || m.ai.pressed) return;
    const rel = (this.bt - n) * this.period;
    if (rel >= m.ai.off + LATENCY - 1 / 60) { m.ctrl.press('a'); m.ai.pressed = true; }
  }

  // ---- events -----------------------------------------------------------
  startSuper() {
    this.event = { kind: 'super', t: 0, warn: 1.1, dur: 2.2, go: false };
    for (const m of this.members) { m.mash = 0; m.ai.react = m.isAI ? reactionTime(m.p) * 0.7 : 0; }
    this.showBanner('SUPER PULL!', '#ffd23f', 130);
    snd('tug-superpull', 'drumroll', { vol: 0.8 });
    fx.flash('#fff6c0', 0.15);
  }

  startBanana() {
    const team = Math.abs(this.pos) > 15 ? (this.pos > 0 ? 1 : 0) : pick([0, 1]);
    const side = TEAMS[team].side;
    this.event = { kind: 'banana', team, t: 0, warn: 1.0, x: W / 2 + side * 1010, vx: -side * 560, rot: 0, hit: new Set(), planned: false, done: false };
    this.showBanner('Banana peel!', '#ffe14d', 110);
    snd('tug-banana', hasSound('boing') ? 'boing' : 'bounce', { vol: 0.7 });
    for (const m of this.members) if (m.team === team && m.k === 0) m.a.emote('exclaim', 1);
  }

  updateEvent(dt) {
    const ev = this.event;
    ev.t += dt;
    if (ev.kind === 'super') {
      if (!ev.go && ev.t >= ev.warn) {
        ev.go = true; this.mashing = true;
        sfx('whistle');
        for (const m of this.members) if (m.state === 'pull' && m.slip <= 0) { m.a.facing = m.side; m.a.setPose('run'); m.a.speed = 1; }
      }
      if (ev.go && ev.t >= ev.warn + ev.dur) this.resolveSuper();
      return;
    }
    // banana: waits at the edge, then slides under the team toward the puddle
    if (ev.t < ev.warn) return;
    if (!ev.planned) {
      ev.planned = true;
      for (const m of this.members) {
        if (!m.isAI || m.team !== ev.team) continue;
        const C = CPU[clamp(m.p.aiLevel ?? 0, 0, 2)];
        const ta = this.t + Math.max(0, Math.abs(m.x - ev.x) - 26) / Math.abs(ev.vx);
        m.ai.hopAt = chance(C.hop) ? ta - rand(0.12, 0.42) : chance(0.5) ? ta - rand(0.75, 1.0) : null;
      }
    }
    ev.x += ev.vx * dt;
    ev.rot += dt * 9 * Math.sign(ev.vx);
    for (const m of this.members) {
      if (m.team !== ev.team || ev.hit.has(m) || m.state !== 'pull') continue;
      if (Math.abs(m.x - ev.x) < 26) {
        ev.hit.add(m);
        const h = m.a.anchor('head');
        if (m.z > 6) {
          particles.popText(h.x, h.y - 70, 'Hop!', '#7be04d', 38);
          particles.burst(m.x, m.y - m.z, { type: 'sparkle', count: 5, colors: ['#ffffff', '#ffe14d'] });
          sfx('correct', { vol: 0.5 });
        } else this.slip(m);
      }
    }
    if (Math.sign(ev.vx) * (ev.x - POOL.x) > -40) {
      // plop into the jelly
      particles.burst(ev.x, POOL.y - 6, { type: 'drop', count: 10, colors: JELLY, angle: -Math.PI / 2, spread: 0.9, speed: [200, 420] });
      this.poolWob = Math.min(1.4, this.poolWob + 0.4);
      snd('tug-plop', 'bubble', { vol: 0.8 });
      this.event = null;
      for (const m of this.members) m.ai.hopAt = null;
    }
  }

  mashPress(m) {
    if (m.state !== 'pull' || m.slip > 0) return;
    m.mash++;
    m.a.squash(0.06);
    if (chance(0.5)) particles.burst(m.x, m.y - 4, { type: 'dust', count: 1, angle: m.side > 0 ? Math.PI : 0, spread: 0.5, speed: [80, 180] });
    if (!m.isAI) { sfx('pump', { vol: 0.35 }); m.ctrl.rumble?.(0.25, 40); }
    this.jig.v += 20;
  }

  resolveSuper() {
    this.event = null; this.mashing = false;
    const avg = [0, 1].map((t) => this.members.filter((m) => m.team === t).reduce((s, m) => s + m.mash, 0) / this.size[t]);
    const diff = avg[1] - avg[0];
    for (const m of this.members) if (m.state === 'pull') { m.a.facing = -m.side; m.a.setPose(PULL_POSE); m.a.poseTime = 0.4; }
    if (Math.abs(diff) < 0.8) { this.showBanner('Even!', '#ffffff', 100); sfx('bonk'); return; }
    const win = diff > 0 ? 1 : 0;
    const move = clamp(Math.abs(diff) * 11, 30, 120) * TEAMS[win].side;
    this.vel += move * DECAY;
    this.jig.v += 400;
    this.flash[win] = 1;
    fx.shake(14, 0.3); fx.flash(TEAMS[win].color, 0.15);
    snd('tug-yank', 'whoosh', { vol: 0.9 }); sfx('cheer', { vol: 0.5 });
    this.showBanner(`${TEAMS[win].name} SUPER PULL!`, TEAMS[win].color, 96);
    for (const m of this.members) {
      if (m.team === win) { m.pulse = 1; m.a.squash(0.3); m.a.emote('star', 1); }
      else m.a.playOnce('surprised', 0.4, PULL_POSE);
    }
  }

  slip(m) {
    m.slip = 1.4;
    m.streak = 0;
    m.a.playOnce('surprised', 0.3, 'dizzy');
    this.vel -= m.side * IMP * 0.55 / this.size[m.team];
    const h = m.a.anchor('head');
    particles.popText(h.x, h.y - 70, 'Whoops!', '#ffe14d', 40);
    particles.burst(m.x, m.y - 10, { type: 'star', count: 6, colors: ['#ffe14d', '#ffffff'] });
    snd('tug-slip', hasSound('squeak') ? 'squeak' : 'dash', { vol: 0.8 });
    if (!m.isAI) m.ctrl.rumble?.(0.6, 160);
  }

  hop(m) {
    if (m.z > 0 || m.vz > 0 || m.slip > 0 || m.state !== 'pull') return;
    m.vz = 820;
    m.a.playOnce('jump', 0.55, PULL_POSE);
    snd('tug-hop', 'jump', { vol: 0.6 });
  }

  // ---- round end --------------------------------------------------------
  endRound(win) {
    this.setPhase('end');
    this.event = null; this.mashing = false;
    this.roundWinner = win;
    this.wins[win]++;
    this.final = this.wins[win] >= WINS_NEEDED || this.round >= ROUNDS;
    this.endFrom = this.pos;
    this.endTo = TEAMS[win].side * (WIN_D + 25);
    this.flash[win] = 1;
    this.splashed = false;
    const losers = this.members.filter((m) => m.team !== win).sort((a, b) => a.k - b.k);
    const nl = losers.length, spread = Math.min(95, 320 / nl);
    losers.forEach((m, i) => {
      m.state = 'dragged'; m.slideAt = 0.2 + i * 0.16;
      m.px = POOL.x + (i - (nl - 1) / 2) * spread + rand(-8, 8);
      m.py = POOL.y + (i % 2 ? 10 : -6);
      m.slip = 0; m.z = 0; m.vz = 0;
    });
    for (const m of this.members) if (m.team === win) { m.state = 'win'; m.pulse = 1; m.slip = 0; m.a.facing = -m.side; m.a.setPose(PULL_POSE); }
    snd('tug-yank', 'whoosh', { vol: 0.9 });
    fx.hitstop(0.06); fx.shake(10, 0.25);
    if (this.api.camera) this.api.camera.punch(POOL.x, POOL.y - 140, this.members.length > 4 ? 1.12 : 1.22, 1.0);
  }

  endPhase(dt, post = false) {
    const k = ease.outCubic(clamp(this.phaseT / 0.6, 0, 1));
    this.pos = lerp(this.endFrom, this.endTo, k);
    const win = this.roundWinner;
    if (this.phaseT > 0.55 && !this.cheered) {
      this.cheered = true;
      for (const m of this.members) if (m.team === win) {
        m.a.setPose('celebrate');
        if (m.k === 0) m.a.say(pick(['Yay!', 'Woo-hoo!', 'We did it!']), 1.4, 'yay');
      }
      sfx('fanfare', { vol: 0.7 });
      this.showBanner(this.final ? `${TEAMS[win].name} wins!` : `${TEAMS[win].name} wins the pull!`, TEAMS[win].color, this.final ? 120 : 96);
    }
    for (const m of this.members) {
      if (m.state === 'dragged' && this.phaseT >= m.slideAt) {
        m.state = 'slide'; m.st = 0; m.sx = m.x; m.sy = m.y;
        m.a.facing = -m.side;
        m.a.playOnce('tumble', 0.55, 'swim');
        if (!m.isAI) m.ctrl.rumble?.(0.7, 200);
      }
    }
    if (post) return;
    if (this.phaseT > (this.final ? 3.3 : 3.4)) {
      if (this.final) { this.finishMatch(); return; }
      this.setPhase('reset');
      this.cheered = false;
      this.round++;
      this.resetFrom = this.pos;
      const losers = this.members.filter((m) => m.team !== win).sort((a, b) => a.k - b.k);
      losers.forEach((m, i) => { m.popAt = i * 0.14; });
      for (const m of this.members) if (m.team === win) { m.state = 'pull'; m.a.setPose(PULL_POSE); m.a.poseTime = 0.4; }
      this.showBanner(`Round ${this.round}`, '#ffffff', 120);
      sfx('swap');
    }
  }

  splash(m) {
    const first = !this.splashed;
    this.splashed = true;
    const col = TEAMS[m.team].color;
    particles.burst(m.x, m.py - 6, { type: 'drop', count: first ? 30 : 18, colors: JELLY, angle: -Math.PI / 2, spread: 1.0, speed: [260, 700] });
    particles.burst(m.x, m.py - 10, { type: 'bubble', count: 8, colors: ['#ffffff', ...JELLY] });
    particles.ring(m.x, m.py, '#ffffff', 140, 0.45);
    this.poolWob = Math.min(1.6, this.poolWob + (first ? 0.9 : 0.45));
    snd('tug-splash', 'splash', { vol: first ? 1 : 0.7, rate: rand(0.92, 1.1) });
    if (first) {
      particles.popText(POOL.x, POOL.y - 220, 'SPLASH!', col, 90);
      fx.shake(16, 0.3); fx.flash('#ffffff', 0.12);
      later(() => sfx('giggle', { vol: 0.6 }), 250);
    }
    m.a.emote('exclaim', 0.6);
    m.gooCol = pick(JELLY);
  }

  resetPhase(dt) {
    const k = ease.inOutQuad(clamp(this.phaseT / 1.1, 0, 1));
    this.pos = lerp(this.resetFrom, 0, k);
    for (const m of this.members) {
      if (m.state === 'jelly' && this.phaseT >= m.popAt) {
        m.state = 'pop'; m.st = 0; m.sx = m.x; m.sy = m.y + m.sink;
        m.a.playOnce('jump', 0.35, 'giggle');
        m.goo = 1;
        snd('tug-pop-out', 'pop', { vol: 0.7, rate: rand(0.9, 1.15) });
        if (m.k === 0) m.a.say(pick(['Hee hee!', 'Sticky!', 'Wheee!']), 1.3, 'laugh');
        particles.burst(m.x, POOL.y - 10, { type: 'drop', count: 10, colors: JELLY, angle: -Math.PI / 2, spread: 0.8, speed: [200, 420] });
      }
    }
    if (this.phaseT > 1.6 && this.members.every((m) => m.state === 'pull' || m.state === 'win')) {
      this.setPhase('ready');
      this.readyBeat = Math.floor(this.bt) + 3;
    }
  }

  readyPhase() {
    if (this.bt >= this.readyBeat - 0.5) this.startRound();
  }

  finishMatch() {
    if (this.finished) return;
    this.finished = true;
    const win = this.roundWinner;
    const best = Math.max(...this.real.map((m) => m.onBeat));
    const placements = this.players.map((p) => (this.members.find((m) => m.p === p).team === win ? 1 : 2));
    const stats = this.players.map((p) => {
      const m = this.members.find((mm) => mm.p === p);
      const mvp = !this.solo && best > 0 && m.onBeat === best;
      return `${mvp ? 'MVP! ' : ''}${m.onBeat} beat${m.onBeat === 1 ? '' : 's'}`;
    });
    const ws = this.members.filter((m) => m.team === win);
    const fx0 = ws.reduce((s, m) => s + m.x, 0) / ws.length;
    this.api.finish({ placements, stats, focus: { x: fx0, y: GROUND - 180, zoom: 1.2 } });
  }

  // ---- per-frame animation ----------------------------------------------
  tickAll(dt) {
    this.jig.v += (-this.jig.p * 120 - this.jig.v * 8) * dt; this.jig.p += this.jig.v * dt;
    this.poolWob = Math.max(0, this.poolWob - dt * 0.9);
    this.flash = this.flash.map((f) => Math.max(0, f - dt * 1.5));
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.6) this.banner = null; }
    if (this.teamHeave) { this.teamHeave.t += dt; if (this.teamHeave.t > 1) this.teamHeave = null; }
    this.updatePositions(dt);
  }

  updatePositions(dt) {
    for (const m of this.members) {
      const a = m.a;
      a.update(dt);
      m.pulse = Math.max(0, m.pulse - dt * 2.6);
      if (m.slip > 0) {
        m.slip -= dt;
        if (m.slip <= 0 && m.state === 'pull') { a.setPose(this.mashing ? 'run' : PULL_POSE); a.poseTime = 0.4; }
      }
      if (m.goo > 0) { m.goo = Math.max(0, m.goo - dt * 0.35); a.tint(m.goo > 0.02 ? m.gooCol : null, 0.45 * m.goo); }
      const home = W / 2 + m.side * m.off + this.pos;
      let ang = 0;
      switch (m.state) {
        case 'pull': case 'win': case 'dragged': {
          m.x = home; m.y = GROUND;
          if (m.vz !== 0 || m.z > 0) {
            m.z += m.vz * dt; m.vz -= 2600 * dt;
            if (m.z <= 0) { m.z = 0; m.vz = 0; particles.burst(m.x, m.y - 2, { type: 'dust', count: 4, speed: [40, 120] }); }
          }
          if (m.state === 'win' && a.currentPose === 'celebrate') break;
          if (this.mashing && m.slip <= 0) ang = 0.16 * a.facing + Math.sin(this.t * 30 + m.k) * 0.03;
          else if (m.slip > 0) ang = Math.sin(this.t * 14) * 0.2 * Math.min(1, m.slip);
          else {
            const dragged = clamp(-m.side * this.vel / 160, 0, 1);    // being pulled toward the puddle
            m.lean = 0.08 + 0.2 * ease.outQuad(m.pulse) - 0.1 * dragged + (m.state === 'win' ? 0.12 : 0);
            ang = -m.lean * a.facing;
          }
          break;
        }
        case 'slide': {
          m.st += dt;
          const u = clamp(m.st / 0.5, 0, 1);
          m.x = lerp(m.sx, m.px, ease.inOutQuad(u));
          m.y = lerp(m.sy, m.py, u);
          m.z = Math.sin(u * Math.PI) * 70;
          ang = a.facing * 0.7 * Math.sin(u * Math.PI);
          if (u >= 1) { m.state = 'jelly'; m.st = 0; m.z = 0; m.sink = 0; this.splash(m); }
          break;
        }
        case 'jelly': {
          m.st += dt;
          m.x = m.px + Math.sin(this.t * 2 + m.k) * 4;
          m.y = m.py;
          m.sink = lerp(m.sink, a.height * 0.42 + Math.sin(this.t * 3 + m.k * 1.3) * 5, 1 - Math.exp(-6 * dt));
          if (m.st > 0.9 && !m.giggled) { m.giggled = true; a.setPose('giggle'); a.emote('happy', 1.2); }
          break;
        }
        case 'pop': {
          m.st += dt;
          const u = clamp(m.st / 0.6, 0, 1);
          m.x = lerp(m.sx, home, ease.outQuad(u));
          m.y = lerp(m.sy, GROUND, u);
          m.z = Math.sin(u * Math.PI) * 170;
          if (chance(dt * 20)) particles.burst(m.x, m.y - m.z - a.height * 0.4, { type: 'drop', count: 1, colors: [m.gooCol], speed: [20, 80] });
          if (u >= 1) {
            m.state = 'pull'; m.z = 0; m.giggled = false;
            a.facing = -m.side; a.playOnce('giggle', 0.9, PULL_POSE);
            particles.burst(m.x, m.y - 4, { type: 'dust', count: 5, speed: [40, 120] });
            sfx('land', { vol: 0.6 });
          }
          break;
        }
        default: break;
      }
      a.x = m.x; a.y = m.state === 'jelly' ? m.y + m.sink : m.y; a.z = m.state === 'jelly' ? 0 : m.z;
      m.ang = damp(m.ang, ang, 14, dt || 1);
      // rope grip: the hand anchor turned with the lean, kept to a sensible height
      const hand = a.anchor('hand');
      const dx = hand.x - a.x, dy = hand.y - a.y, c = Math.cos(m.ang), s = Math.sin(m.ang);
      const h = a.height;
      let gx = a.x + dx * c - dy * s, gy = a.y + dx * s + dy * c;
      const fwd = clamp((gx - a.x) * -m.side, 6, h * 0.42);
      gx = a.x - m.side * fwd;
      // 0.72: the rearing pony/unicorn 'pull' frames hold their hooves up to ~0.7h.
      gy = clamp(gy, a.y - a.z - h * 0.72, a.y - a.z - h * 0.3);
      if (m.state === 'jelly') gy = Math.min(gy, m.py - 8);
      if (m.gx === null || !dt) { m.gx = gx; m.gy = gy; } else { m.gx = damp(m.gx, gx, 22, dt); m.gy = damp(m.gy, gy, 22, dt); }
    }
  }

  // ---- drawing ----------------------------------------------------------
  ropePoints() {
    const pts = [];
    const tail = (m, dir) => [
      { x: m.gx + dir * 110, y: m.gy + 44 },
      { x: m.gx + dir * 190, y: Math.max(m.gy + 70, GROUND - 6) },
    ];
    const pink = this.members.filter((m) => m.team === 0).sort((a, b) => a.gx - b.gx);
    const blue = this.members.filter((m) => m.team === 1).sort((a, b) => a.gx - b.gx);
    const pb = pink[0], bb = blue[blue.length - 1];
    pts.push(...tail(pb, -1).reverse());
    for (const m of pink) pts.push({ x: m.gx, y: m.gy });
    const pf = pink[pink.length - 1], bf = blue[0];
    const lo = Math.min(pf.gx, bf.gx), hi = Math.max(pf.gx, bf.gx);
    const mx = clamp(W / 2 + this.pos, lo + 20, hi - 20);
    const sag = 16 + clamp(this.jig.p, -22, 22);
    this.mid = { x: mx, y: (pf.gy + bf.gy) / 2 + sag };
    if (hi - lo > 50) pts.push(this.mid);
    for (const m of blue) pts.push({ x: m.gx, y: m.gy });
    pts.push(...tail(bb, 1));
    return pts;
  }

  drawMember(g, m) {
    const a = m.a, p = m.p;
    const inJelly = m.state === 'jelly';
    if (!inJelly && m.state !== 'slide' && m.state !== 'pop') {
      // shadow + ring (unrotated, on the ground)
      const r = Math.max(46, a.width * 0.42);
      const zs = Math.max(0.5, 1 - m.z / 300);
      g.save();
      g.globalAlpha = 0.22; g.fillStyle = '#1b1030';
      g.beginPath(); g.ellipse(m.x, m.y, r * 0.8 * zs, r * 0.2 * zs, 0, 0, TAU); g.fill();
      g.globalAlpha = 1; g.lineWidth = 6; g.strokeStyle = p.color;
      g.beginPath(); g.ellipse(m.x, m.y + 2, r, r * 0.3, 0, 0, TAU); g.stroke();
      g.globalAlpha = 0.25; g.fillStyle = p.color; g.fill();
      g.restore();
    }
    g.save();
    if (inJelly) { g.beginPath(); g.rect(m.x - 400, 0, 800, m.py + 2); g.clip(); }
    const fy = a.y - a.z;
    g.translate(a.x, fy); g.rotate(m.ang); g.translate(-a.x, -fy);
    a.draw(g, { shadow: false });
    g.restore();
    if (inJelly) drawRipple(g, m.x, m.py, Math.max(40, a.width * 0.36), this.t + m.k, m.gooCol);
  }

  draw(g) {
    const t = this.t;
    drawBackground(g, t, GROUND, this.clouds);
    drawMat(g, 0, 10, 740, GROUND - 50, t);
    drawMat(g, 1, W - 740, W - 10, GROUND - 50, t);
    drawGoalFlag(g, 0, W / 2 - WIN_D - 30, POOL.y - POOL.ry + 6, t, this.flash[0]);
    drawGoalFlag(g, 1, W / 2 + WIN_D + 30, POOL.y - POOL.ry + 6, t, this.flash[1]);
    drawPool(g, POOL, t, this.poolWob);
    // pullers: back ones first; the ones in the jelly after the puddle
    const order = this.members.slice().sort((a, b) => (a.state === 'jelly') - (b.state === 'jelly') || b.k - a.k);
    for (const m of order) this.drawMember(g, m);
    // rope over the hands
    const pts = this.ropePoints();
    drawRope(g, pts, t, this.members.length > 4 ? 15 : 17, this.pos);
    // centre bow
    if (this.mid) {
      const by = ropeYAt(pts, this.mid.x);
      drawBow(g, this.mid.x, by, t, clamp(this.vel / 400, -0.6, 0.6), this.members.length > 4 ? 0.85 : 1);
    }
    // banana peel
    const ev = this.event;
    if (ev && ev.kind === 'banana') {
      const wait = ev.t < ev.warn;
      drawBanana(g, ev.x + (wait ? Math.sin(t * 20) * 4 : 0), GROUND + 14, ev.rot, 1);
    }
    // player tags
    for (const m of this.members) {
      const h = m.a.anchor('head');
      const up = (m.a.emotes.length ? 52 : 0) + (m.a.speech ? 60 : 0);
      ui.playerTag(g, m.p, h.x, h.y - 22 - up);
    }
  }

  drawHUD(g) {
    const t = this.t;
    // --- team panels
    const PW = 640, PH = 128;
    for (let team = 0; team < 2; team++) {
      const T = TEAMS[team];
      const x = team === 0 ? 30 : W - 30 - PW, y = 16;
      const glow = this.flash[team];
      g.save();
      if (glow > 0) { const k = 1 + glow * 0.04; g.translate(x + PW / 2, y + PH / 2); g.scale(k, k); g.translate(-(x + PW / 2), -(y + PH / 2)); }
      ui.panel(g, x, y, PW, PH, { r: 30, fill: T.light, stroke: T.dark, lineWidth: 6 });
      const al = team === 0 ? 'left' : 'right';
      const tx = team === 0 ? x + 28 : x + PW - 28;
      ui.text(g, T.name, tx, y + 36, { size: 38, color: T.color, align: al, strokeWidth: 7, weight: 800 });
      // round-win stars
      for (let i = 0; i < WINS_NEEDED; i++) {
        const sx = team === 0 ? x + 270 + i * 50 : x + PW - 270 - i * 50;
        g.save(); g.globalAlpha = i < this.wins[team] ? 1 : 0.3;
        ui.stars(g, 1, sx, y + 36, 22, { color: i < this.wins[team] ? '#ffd23f' : '#ffffff' });
        g.restore();
      }
      if (this.power[team] > 1.01) {
        const bx = team === 0 ? x + PW - 120 : x + 120;
        ui.panel(g, bx - 82, y + 14, 164, 44, { r: 22, fill: '#ffd23f', lineWidth: 4, shadow: false });
        ui.text(g, `x${+this.power[team].toFixed(1)} power`, bx, y + 37, { size: 26, color: NAVY, stroke: false, weight: 800 });
      }
      // members
      const ms = this.members.filter((m) => m.team === team);
      ms.forEach((m, i) => {
        const cw = 150;
        const cx = team === 0 ? x + 54 + i * cw : x + PW - 54 - i * cw;
        const cy = y + 92;
        ui.drawPortrait(g, m.p, cx, cy, 25, { expr: m.state === 'jelly' || m.state === 'pop' ? 'happy' : 'neutral', ring: m.p.color, ringWidth: 5 });
        const lx = team === 0 ? cx + 34 : cx - 34, la = team === 0 ? 'left' : 'right';
        ui.text(g, m.p.tag, lx, cy - 7, { size: 22, color: m.p.color, align: la, strokeWidth: 5 });
        ui.text(g, `${m.onBeat} ♪`, lx, cy + 16, { size: 22, color: NAVY, align: la, stroke: false, weight: 800 });
      });
      g.restore();
    }
    // --- timer / round
    if (this.phase === 'pull' || this.phase === 'countdown') ui.timer(g, ROUND_TIME - this.roundT, W / 2, 64);
    ui.panel(g, W / 2 - 110, 120, 220, 46, { r: 23, fill: '#ffffff', lineWidth: 5 });
    ui.text(g, `Round ${Math.min(this.round, ROUNDS)} of ${ROUNDS}`, W / 2, 144, { size: 28, color: NAVY, stroke: false, weight: 800 });
    // --- tug meter
    this.drawMeter(g, W / 2, 196);
    // --- beat heart / events
    const hx = W / 2, hy = 330;
    const ev = this.event;
    if (ev && ev.kind === 'super') this.drawMash(g, hx, hy, ev);
    else if (this.phase === 'pull' || this.phase === 'countdown' || this.phase === 'ready') {
      const frac = this.bt - Math.floor(this.bt);
      drawBeatHeart(g, hx, hy, 60, this.pulse, 1 - frac, { ringColor: '#ffffff' });
      let label = null;
      if (this.phase === 'ready') {
        const left = this.readyBeat - Math.floor(this.bt);
        label = left > 0 ? String(left) : null;
      } else label = this.beatInt % 2 ? 'HO!' : 'HEAVE!';
      if (label) {
        const k = 1 + this.pulse * 0.35;
        g.save(); g.translate(hx, hy + 104); g.scale(k, k);
        ui.text(g, label, 0, 0, { size: 46, color: this.phase === 'ready' ? '#ffffff' : '#ffd23f', strokeWidth: 9, weight: 800 });
        g.restore();
      }
    }
    if (ev && ev.kind === 'banana') {
      const side = TEAMS[ev.team].side;
      const bx = W / 2 + side * 520, by = 360;
      const k = 1 + Math.sin(t * 12) * 0.05;
      g.save(); g.translate(bx, by); g.scale(k, k);
      ui.panel(g, -200, -46, 400, 92, { r: 40, fill: '#fff8c8' });
      drawBanana(g, -140, 22, 0, 0.6);
      ui.glyph(g, 'b', -40, 0, 56, { pulse: true });
      ui.text(g, 'Hop!', 80, 2, { size: 50, color: '#7a5a00', stroke: false, weight: 800 });
      g.restore();
    }
    // first-round hint
    if (this.round === 1 && this.phase === 'pull' && this.roundT > 0.9 && this.roundT < 6.5 && !ev) {
      g.save(); g.globalAlpha = clamp(Math.min(6.5 - this.roundT, (this.roundT - 0.9) * 4), 0, 1);
      ui.panel(g, W / 2 - 440, 470, 880, 70, { r: 35, fill: '#fff8ec' });
      ui.glyph(g, 'a', W / 2 - 390, 505, 50, { pulse: true });
      ui.text(g, 'Press A when the ring hits the heart!', W / 2 + 30, 506, { size: 34, color: NAVY, stroke: false, weight: 700 });
      g.restore();
    }
    if (this.banner) ui.banner(g, this.banner.text, this.banner.t, { size: this.banner.size, y: 590, color: this.banner.color });
  }

  drawMeter(g, cx, cy) {
    const w = 560, h = 30, x0 = cx - w / 2;
    g.save();
    ui.roundRect(g, x0 - 6, cy - h / 2 - 6, w + 12, h + 12, 20); g.fillStyle = '#ffffff'; g.fill();
    g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
    ui.roundRect(g, x0, cy - h / 2, w, h, 14); g.save(); g.clip();
    const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
    gr.addColorStop(0, TEAMS[0].color); gr.addColorStop(0.5, '#fff4fa'); gr.addColorStop(1, TEAMS[1].color);
    g.fillStyle = gr; g.fillRect(x0, cy - h / 2, w, h);
    g.restore();
    // splash ends
    for (const sd of [-1, 1]) {
      g.fillStyle = sd < 0 ? TEAMS[0].dark : TEAMS[1].dark;
      g.beginPath(); g.arc(cx + sd * (w / 2 + 26), cy, 16, 0, TAU); g.fill();
      g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    }
    g.fillStyle = NAVY; g.fillRect(cx - 2, cy - h / 2, 4, h);
    // marker = the bow
    const u = clamp(this.pos / WIN_D, -1, 1);
    const mx = cx + u * (w / 2 - 8);
    g.translate(mx, cy);
    g.fillStyle = '#ff6fb1'; g.strokeStyle = NAVY; g.lineWidth = 4;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(sd * 22, -14); g.lineTo(sd * 22, 14); g.closePath(); g.fill(); g.stroke(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }

  drawMash(g, hx, hy, ev) {
    const t = this.t;
    const k = 1 + Math.abs(Math.sin(t * (ev.go ? 16 : 6))) * 0.12;
    g.save(); g.translate(hx, hy); g.scale(k, k);
    ui.glyph(g, 'x', 0, 0, 120);
    g.restore();
    ui.text(g, ev.go ? 'MASH X!' : 'Get ready...', hx, hy + 104, { size: ev.go ? 54 : 44, color: '#5fb0ff', strokeWidth: 10, weight: 800 });
    if (ev.go) {
      const left = clamp((ev.warn + ev.dur - ev.t) / ev.dur, 0, 1);
      ui.bar(g, hx - 90, hy + 146, 180, 18, left, '#ffd23f');
    }
    // team power bars
    const avg = [0, 1].map((tm) => this.members.filter((m) => m.team === tm).reduce((s, m) => s + m.mash, 0) / this.size[tm]);
    const top = Math.max(12, ...avg);
    for (let tm = 0; tm < 2; tm++) {
      const T = TEAMS[tm];
      const bw = 380, bh = 44, bx = tm === 0 ? hx - 140 - bw : hx + 140, by = hy - bh / 2;
      ui.panel(g, bx - 6, by - 6, bw + 12, bh + 12, { r: 26, fill: '#ffffff', lineWidth: 5 });
      const f = clamp(avg[tm] / top, 0, 1);
      g.save(); ui.roundRect(g, bx, by, bw, bh, 20); g.clip();
      g.fillStyle = T.color;
      if (tm === 0) g.fillRect(bx + bw * (1 - f), by, bw * f, bh); else g.fillRect(bx, by, bw * f, bh);
      g.restore();
      ui.text(g, T.name, bx + bw / 2, by - 30, { size: 30, color: T.color, strokeWidth: 6 });
    }
  }
}

