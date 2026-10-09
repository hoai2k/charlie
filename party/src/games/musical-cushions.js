// Musical Cushions - party musical chairs. Fluffy cushions sit in a ring on a
// big rug; while the record player plays, everyone dances around the ring
// (the ring turns and the cushions boing you away, so nobody can camp on one).
// When the needle lifts and the music stops, race to a cushion and press A to
// plop down. There is one cushion too few (two with a big crowd): whoever is
// left standing goes to the cheer mats. Last one sitting wins. Small parties
// finish with a best-of-3 final on the last cushion.
//
// Art hooks (procedural fallbacks ship today): bg/musical-cushions,
//   prop/cushion-0..7, prop/record-player, prop/party-speaker.
// Sound hooks (synth fallbacks today): cush-scratch (in tune.js), cush-plop,
//   cush-boing, cush-out, cush-fakeout, cush-needle.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound, music } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { art } from '../engine/art.js';
import { input } from '../engine/input.js';
import { aiProfile, reactionTime, steer, Brain } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, shuffle, ease, TAU, placementsFromScores } from '../engine/util.js';
import { session, freeCharacters, playerName } from '../state.js';
import { PLAYER_COLORS } from '../data/characters.js';
import { Tune } from './musical-cushions/tune.js';
import { NAVY, C, WALL_Y, RP, SPEAKERS, CUSHION_COLORS, roomBackground, drawCushion, drawRecordPlayer, drawSpeaker, drawIcon } from './musical-cushions/draw.js';

const ROOM = { x0: 250, x1: 1670, y0: 455, y1: 1030 };
const WALK = 370;
const TELL = 0.65;               // the needle-lift warning before every stop (and fake-out)
const SCRAMBLE_MAX = 6;
const OUT_T = 2.7;
const BUMP_T = 0.15, BUMP_SPEED = 560, BUMP_CD = 1.4;
const DASH_T = 0.15, DASH_SPEED = 800, DASH_CD = 0.9;
// Energy: starts empty, fills only while walking round the ring the way the
// arrows go (standing by a cushion earns nothing); a dash or a bump costs one third.
const STAM_MAX = 1, STAM_COST = 1 / 3, STAM_GAIN = 0.3;   // full bar after ~3.3 s of walking with the arrows
const STUN_T = 0.8;
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const ds = (y) => depthScale(y, { top: ROOM.y0, near: ROOM.y1, far: 0.88, nearScale: 1.04 });
const DANCE_MOVES = ['dance-star', 'dance-up', 'dance-side', 'dance-down'];

export const meta = {
  id: 'musical-cushions',
  title: 'Musical Cushions',
  category: 'party',
  type: 'Musical chairs',
  goal: 'Dance around the cushions - when the music stops, plop down on one! Last one sitting wins.',
  controls: [['stick', 'Dance around the ring the way the arrows go'], ['a', 'Sit on a cushion (only when the music stops!)'], ['b', 'Dash (uses energy)'], ['x', 'Hip-bump a friend (uses energy)']],
  tips: ['Watch the record player: when the needle lifts, get ready!', 'Sitting while the music plays makes you dizzy - and sometimes it only pretends to stop!', 'Follow the arrows round the ring to fill your energy bar, then B dashes and X bumps!'],
  music: 'bouncy',
  duration: '30-60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon,
};

export class Game {
  constructor(api) {
    this.api = api;
    this.real = api.players;
    let players = this.real;
    // Musical chairs needs a crowd: a lone player gets three CPU party guests.
    this.guests = [];
    if (players.length === 1) {
      const free = shuffle(freeCharacters(players));
      for (let k = 1; k <= 3; k++) {
        const g = {
          index: k, charId: (free[k - 1] || free[0]).id, variant: 0, glow: null, color: PLAYER_COLORS[k],
          tag: 'CPU', isAI: true, aiLevel: session.cpuLevel ?? 0, ctrl: input.createAI(940 + k), stars: 0, guest: true,
        };
        this.guests.push(g);
      }
      players = [...players, ...this.guests];
    }
    this.players = players;
    const n = players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.scale = n <= 4 ? 0.95 : n <= 6 ? 0.82 : 0.74;
    this.cushW = n <= 4 ? 118 : n <= 6 ? 108 : 100;
    this.bo3 = n <= 4;                 // small parties: the final is first to `finalTarget` stars
    this.finalTarget = n === 2 ? 3 : 2;
    if (api.camera) api.camera.maxZoom = Math.min(api.camera.maxZoom, 1.3);
    // plan the rounds so the whole game fits in ~50-65 s
    let N = n, R = 0;
    while (N > 2) { N = this.cushionsFor(N); R++; }
    R += this.bo3 ? this.finalTarget + 0.5 : 1;
    this.avgMusic = clamp((47 - R * 5.4) / R, 3.6, 7.2);

    this.units = players.map((p, i) => this.makeUnit(p, i));
    // cushions
    const k = this.cushionsFor(n);
    this.cushions = [];
    for (let j = 0; j < k; j++) this.cushions.push(this.makeCushion(j, k));
    this.rx = this.ringRx(k); this.ry = this.rx * 0.5;
    this.ringAng = -Math.PI / 2; this.ringDir = 1; this.walkDir = 1;
    this.layoutCushions();

    this.tune = new Tune();
    this.phase = 'ready'; this.pt = 0;
    this.round = 0;
    this.outCount = 0;
    this.arm = 0.85; this.armTo = 0.85;    // record arm: 0 on the record, 1 lifted off
    this.spin = 0;
    this.lightK = 0;
    this.banner = null; this.msg = null;
    this.fakeAt = -1; this.fakeDone = true; this.fake = false;
    this.musicT = 0; this.musicDur = 5;
    this.winner = null; this.endT = 0; this.finished = false;
    this.notesT = 0;
    this.bpm = 128;
  }

  cushionsFor(N) { return N <= 2 ? 1 : N - (N >= 5 ? 2 : 1); }
  ringRx(k) { return k === 1 ? 120 : clamp(160 + k * 40, 240, 420); }

  makeUnit(p, i) {
    const n = this.n;
    const ang = -Math.PI / 2 + (i / n) * TAU + 0.2;
    const x = C.x + Math.cos(ang) * 560, y = C.y + Math.sin(ang) * 255;
    const a = new Actor(p, { scale: this.scale, x, y });
    a.facing = x < C.x ? 1 : -1; a.snap();
    return {
      p, i, a, x, y, z: 0, vx: 0, vy: 0, aim: Math.atan2(C.y - y, C.x - x),
      state: 'in', seat: null, sitT: 0, sitFrom: null, standT: 0, standFrom: null, standTo: null,
      stun: 0, kb: 0, stam: 0, stamFlash: 0, needT: 0, dashT: 0, dashCd: 0, bumpT: 0, bumpCd: 0, bumpDir: 0, bumpHit: null, danceCd: 0, cheerCd: 0,
      outRound: 0, outOrder: -1, wins: 0, sits: 0, spot: null, outT: 0, boingCd: 0,
      brain: new Brain(p), ai: { margin: 100 },
    };
  }

  makeCushion(j, k) {
    return { j, ang: (j / k) * TAU, ang0: 0, ang1: 0, x: C.x, y: C.y, z: 0, sq: 0, sqv: 0, color: j % CUSHION_COLORS.length, taken: null, gone: false, poofT: 0, pop: 1 };
  }

  get live() { return this.cushions.filter((c) => !c.gone); }
  get alive() { return this.units.filter((u) => u.state === 'in'); }

  layoutCushions() {
    for (const c of this.cushions) {
      const a = c.ang + this.ringAng;
      c.x = C.x + Math.cos(a) * this.rx; c.y = C.y + Math.sin(a) * this.ry;
    }
  }

  // --- rounds ------------------------------------------------------------------------
  startRound(first = false) {
    this.round++;
    const alive = this.alive.length;
    const final = alive === 2;
    const k = final ? 1 : this.cushionsFor(alive);
    // remove extra cushions with a poof, re-space the rest
    const live = shuffle(this.live);
    const drop = Math.max(0, live.length - k);
    for (let i = 0; i < drop; i++) {
      const c = live[i]; c.gone = true; c.poofT = 0;
      particles.burst(c.x, c.y - 20, { type: 'smoke', count: 8, speed: [60, 200] });
      particles.burst(c.x, c.y - 20, { type: 'petal', count: 10, colors: ['#ffffff', CUSHION_COLORS[c.color][0]], speed: [100, 300] });
    }
    if (drop) { sfx('pop'); sfx('whoosh', { vol: 0.5 }); }
    const keep = this.live.sort((a, b) => a.ang - b.ang);
    keep.forEach((c, j) => {
      c.ang0 = c.ang;
      let target = (j / keep.length) * TAU;
      // turn the short way round
      while (target - c.ang0 > Math.PI) target -= TAU;
      while (target - c.ang0 < -Math.PI) target += TAU;
      c.ang1 = target; c.taken = null;
    });
    this.rx0 = this.rx; this.rx1 = this.ringRx(k);
    this.phase = 'reset'; this.pt = 0;
    this.resetDur = first ? 0.35 : final && this.round > 1 && this.bo3 && this.alive.some((u) => u.wins) ? 0.9 : 1.3;
    this.ringDir = this.round % 2 ? 1 : -1;
    this.walkDir = -this.ringDir;
    this.bpm = Math.min(152, 126 + this.round * 5);
    this.musicDur = Math.max(this.round === 1 ? 3.6 : 3, this.avgMusic * rand(0.6, 1.4));
    if (final && this.bo3) this.musicDur = rand(2.8, 5.6);
    this.musicT = 0;
    const fakeChance = this.round === 1 ? 0 : final ? 0.75 : Math.min(0.75, 0.35 + this.round * 0.12);
    this.fakeDone = !(this.musicDur > 3.6 && chance(fakeChance));
    this.fakeAt = this.fakeDone ? -1 : rand(1.4, this.musicDur - 1.8);
    this.fake = false;
    for (const U of this.units) {
      U.ai = { margin: [rand(120, 200), rand(85, 120), rand(62, 82)][clamp(U.p.aiLevel ?? 0, 0, 2)], dawdle: 0 };
      U.finalist = final && U.state === 'in';
    }
    if (!first) {
      if (final) this.showBanner('FINAL!', 1.2);
      else this.showBanner(`Round ${this.round}`, 1.1);
      sfx('swap');
    }
  }

  startMusic() {
    this.phase = 'music'; this.pt = 0;
    this.armTo = 0;
    this.tune.start(this.bpm);
    snd('cush-needle', null);
    for (const U of this.units) if (U.state === 'in' && !U.p.isAI) U.p.ctrl.rumble(0.2, 80);
  }

  startTell(fake) {
    this.phase = 'tell'; this.pt = 0; this.fake = fake;
    this.armTo = 0.55;
    this.tune.tell(TELL);
  }

  endTell() {
    if (this.fake) {
      this.fake = false; this.fakeDone = true;
      this.phase = 'music';
      this.armTo = 0;
      this.tune.recover();
      snd('cush-fakeout', 'giggle');
      particles.popText(RP.x, RP.y - 230, 'Hee hee!', '#ff6fb1', 50);
      particles.burst(RP.x, RP.y - 170, { type: 'note', count: 6, colors: ['#ff6fb1', '#9b5cff', '#3fa7ff'] });
      this.ringDir *= -1;     // and the ring spins the other way!
      return;
    }
    this.stopMusic();
  }

  stopMusic() {
    this.phase = 'scramble'; this.pt = 0;
    this.armTo = 1;
    this.tune.stop();
    this.showBanner('SIT!', 0.9);
    fx.flash('#ffffff', 0.18); fx.shake(6, 0.2);
    sfx('whistle', { vol: 0.5 });
    if (this.api.camera) this.api.camera.punch(C.x, C.y - 40, 1.06, 0.9);
    for (const U of this.units) {
      if (U.state === 'out') { U.a.playOnce('surprised', 0.4); continue; }
      if (!U.p.isAI) U.p.ctrl.rumble(0.5, 140);
      if (!U.stun) U.a.playOnce('surprised', 0.25);
    }
  }

  resolve() {
    const alive = this.alive;
    const seated = alive.filter((u) => u.seat);
    const standing = alive.filter((u) => !u.seat);
    this.phase = 'out'; this.pt = 0;
    this.outs = [];
    this.replay = false;
    if (!seated.length) { // nobody sat (everyone wandered off): play the round again
      this.replay = true;
      this.showMsg('Nobody sat down - again!');
      return;
    }
    for (const u of seated) { u.a.playOnce('cheer', 0.6); u.a.emote('happy', 1.0); }
    if (this.bo3 && alive.length === 2) {
      const w = seated[0], l = standing[0];
      w.wins++;
      particles.popText(w.x, w.y - w.a.height - 70, '+1 ★', '#ffd23f', 58);
      sfx('star'); voice(w.p.charId, 'yay');
      if (w.wins >= this.finalTarget) {
        this.eliminate([l]);
      } else {
        if (l) { l.a.playOnce('pout', 1.2, 'idle'); voice(l.p.charId, 'aww'); }
        this.showMsg(`${playerName(w.p)} gets a star! First to ${this.finalTarget} wins.`);
      }
      return;
    }
    this.eliminate(standing);
  }

  eliminate(list) {
    this.outs = list;
    for (const U of list) {
      U.state = 'out'; U.outRound = this.round; U.outOrder = this.outCount++; U.outT = 0;
      U.vx = U.vy = 0; U.stun = 0; U.kb = 0;
      U.a.clearEmotes(); U.a.playOnce('surprised', 0.45, 'sad');
      particles.popText(U.x, U.y - U.a.height - 60, 'Out!', '#ff6f7f', 60);
      particles.burst(U.x, U.y - U.a.height * 0.6, { type: 'star', count: 6, colors: ['#c7a7ff', '#ffffff'], speed: [100, 260] });
      voice(U.p.charId, 'aww');
      if (!U.p.isAI) U.p.ctrl.rumble(0.6, 260);
      const k = U.outOrder, left = k % 2 === 0, row = Math.floor(k / 2);
      U.spot = { x: left ? 92 + (row % 2) * 30 : W - 92 - (row % 2) * 30, y: 560 + row * 118 };
    }
    if (list.length) {
      snd('cush-out', 'aww');
      if (list.length === 1) {
        this.showMsg(`${playerName(list[0].p)} is out!`);
        if (this.api.camera) this.api.camera.punch(list[0].x, list[0].y - 70, 1.22, 0.7);
      } else this.showMsg(`${list.length} friends are out!`);
      fx.shake(5, 0.2);
    }
  }

  endGame() {
    this.phase = 'end'; this.pt = 0;
    const w = this.alive[0] || null;
    this.winner = w;
    if (w) {
      w.a.clearEmotes(); w.a.setPose('celebrate'); w.a.squash(0.4);
      particles.confettiRain(W, 110);
      particles.burst(w.x, w.y - w.a.height * 0.6, { type: 'star', count: 16, colors: ['#ffd23f', '#fff6a8', '#ffffff'], speed: [200, 520] });
      sfx('win'); sfx('cheer'); voice(w.p.charId, 'woo');
      fx.slowmo(0.5, 0.6);
      if (this.api.camera) this.api.camera.punch(w.x, w.y - 80, 1.25, 1.2);
      this.showBanner(`${playerName(w.p)}!`, 1.6);
    }
    for (const U of this.units) if (U !== w && U.state === 'out') U.a.setPose('clap');
  }

  finishNow() {
    if (this.finished) return;
    this.finished = true;
    const scores = this.units.map((u) => (u === this.winner ? 1000 : u.state === 'in' ? 500 + u.wins : u.outRound * 10 + u.wins));
    const placements = placementsFromScores(scores);
    const stats = this.units.map((u, i) => (placements[i] === 1 ? 'Top seat!' : u.finalist ? 'Finalist!' : u.outRound ? `Out round ${u.outRound}` : 'Still in'));
    const nReal = this.real.length;
    const w = this.winner;
    this.api.finish({
      placements: placements.slice(0, nReal), stats: stats.slice(0, nReal),
      solo: this.units[0] === w ? 100 : this.units[0].outRound,
      focus: w ? { x: w.x, y: w.y - w.a.height * 0.5, zoom: 1.3 } : undefined,
    });
  }

  showBanner(text, dur) { this.banner = { text, t: 0, dur }; }
  showMsg(text) { this.msg = { text, t: 0 }; }

  // --- frame -------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    if (!this.stoppedHostMusic) { this.stoppedHostMusic = true; if (music.name) music.stop(0.1); }
    for (const c of this.cushions) { c.z = Math.abs(Math.sin(this.t0 * 2 + c.j)) * 3; }
    for (const U of this.units) { U.a.setPose(U.i % 2 ? 'wave' : 'idle'); U.a.scale = this.scale * ds(U.y); U.a.update(dt); }
    this.arm = damp(this.arm, this.armTo, 6, dt);
  }

  /** Every human player is out (the host then offers "B: skip to the end"). */
  humansOut() {
    const hs = this.units.filter((e, i) => e && !e.p.isAI);
    return hs.length > 0 && hs.every((e) => e.state === 'out');
  }

  update(dt) {
    this.t += dt; this.pt += dt;
    if (!this.stoppedHostMusic) { this.stoppedHostMusic = true; if (music.name) music.stop(0.1); }
    if (this.phase === 'ready') this.startRound(true);
    this.tune.update(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.msg) { this.msg.t += dt; if (this.msg.t > 2.4) this.msg = null; }

    switch (this.phase) {
      case 'reset': {
        const k = ease.inOutQuad(clamp(this.pt / Math.max(0.01, this.resetDur * 0.75), 0, 1));
        this.rx = lerp(this.rx0, this.rx1, k); this.ry = this.rx * 0.5;
        for (const c of this.live) c.ang = lerp(c.ang0, c.ang1, k);
        if (this.pt >= this.resetDur) this.startMusic();
        break;
      }
      case 'music':
        this.musicT += dt;
        if (!this.fakeDone && this.musicT >= this.fakeAt) this.startTell(true);
        else if (this.musicT >= this.musicDur) this.startTell(false);
        break;
      case 'tell':
        if (this.pt >= TELL) this.endTell();
        break;
      case 'scramble': {
        const free = this.live.filter((c) => !c.taken).length;
        if (free === 0 || this.pt >= SCRAMBLE_MAX || !this.alive.some((u) => !u.seat)) {
          if (this.pt > 0.35 || free === 0) this.resolve();
        }
        break;
      }
      case 'out':
        if (this.pt >= (this.replay ? 1.4 : this.outs.length ? OUT_T : 1.9)) {
          if (this.alive.length <= 1) this.endGame();
          else { this.standUpAll(); this.startRound(); }
        }
        break;
      case 'end':
        if (this.pt >= 1.4) this.finishNow();
        break;
      default: break;
    }

    // ring turns while the music plays (slowing with it during the tell)
    const playing = this.phase === 'music' || this.phase === 'tell';
    if (playing) this.ringAng += this.ringDir * (0.3 + 0.035 * this.round) * this.tune.rate * dt;
    this.layoutCushions();
    this.updateCushions(dt, playing);
    this.arm = damp(this.arm, this.armTo, this.phase === 'tell' ? 5 : 9, dt);
    this.spin += dt * (playing ? 3.2 * this.tune.rate : 0);
    this.lightK = damp(this.lightK, playing ? 1 : 0, playing ? 3 : 8, dt);
    if (playing) {
      this.notesT -= dt;
      if (this.notesT <= 0) {
        this.notesT = 60 / this.bpm / Math.max(0.3, this.tune.rate);
        particles.burst(RP.x + rand(-60, 40), RP.y - 190, { type: 'note', count: 1, colors: ['#ff6fb1', '#9b5cff', '#3fa7ff', '#ff9f1c'], speed: [60, 140], angle: -Math.PI / 2, spread: 0.8 });
      }
    }

    // input + movement
    const sitters = [];
    for (const U of this.units) {
      if (U.p.isAI) this.ai(U, dt);
      this.control(U, dt, sitters);
    }
    if (sitters.length) {
      sitters.sort((a, b) => a.d - b.d);
      for (const s of sitters) {
        if (s.U.seat || s.c.taken) { const alt = this.nearestFree(s.U); if (alt && alt.d <= this.reach()) this.sit(s.U, alt.c); continue; }
        this.sit(s.U, s.c);
      }
    }
    this.collide(dt);
    for (const U of this.units) this.animate(U, dt);
  }

  postUpdate(dt) {
    this.t += dt * 0.5;
    this.tune.update(dt);
    if (this.banner) this.banner.t += dt;
    this.layoutCushions(); this.updateCushions(dt, false);
    for (const U of this.units) { this.moveOut(U, dt); this.animate(U, dt); }
  }

  destroy() {
    this.tune.destroy();
    for (const gp of this.guests) input.releaseAI(gp.ctrl);
  }

  standUpAll() {
    for (const U of this.alive) {
      if (!U.seat) continue;
      const c = U.seat;
      c.taken = null; U.seat = null;
      const ox = (c.x - C.x) / Math.max(1, this.rx), oy = (c.y - C.y) / Math.max(1, this.ry);
      const l = Math.hypot(ox, oy) || 1;
      const away = this.cushW * 0.5 + 60;
      U.standFrom = { x: c.x, y: c.y + 2 };
      U.standTo = { x: clamp(c.x + (ox / l) * away, ROOM.x0, ROOM.x1), y: clamp(c.y + (oy / l) * away * 0.7 + (l < 0.01 ? away : 0), ROOM.y0, ROOM.y1) };
      U.standT = 0.32;
      U.a.playOnce('jump', 0.32, 'idle');
    }
  }

  updateCushions(dt, playing) {
    const beat = this.tune.beat;
    for (const c of this.cushions) {
      // squash spring
      c.sqv += (-c.sq * 220 - c.sqv * 14) * dt; c.sq += c.sqv * dt;
      if (c.gone) { c.poofT += dt; continue; }
      if (c.taken) { c.z = damp(c.z, 0, 12, dt); continue; }
      if (playing) {
        const ph = (beat + c.j * 0.5) % 1;
        c.z = Math.max(0, Math.sin(ph * Math.PI)) * 9 * this.tune.rate;
      } else c.z = damp(c.z, 0, 10, dt);
    }
  }

  reach() { return this.cushW * 0.5 + 72; }
  cdist(U, c) { const dx = U.x - c.x, dy = (U.y - c.y) * 1.4; return Math.hypot(dx, dy); }
  nearestFree(U) {
    let best = null;
    for (const c of this.live) { if (c.taken) continue; const d = this.cdist(U, c); if (!best || d < best.d) best = { c, d }; }
    return best;
  }
  nearestAny(U) {
    let best = null;
    for (const c of this.live) { const d = this.cdist(U, c); if (!best || d < best.d) best = { c, d }; }
    return best;
  }

  control(U, dt, sitters) {
    const p = U.p, a = U.a;
    U.stun = Math.max(0, U.stun - dt); U.kb = Math.max(0, U.kb - dt);
    U.dashCd = Math.max(0, U.dashCd - dt); U.dashT = Math.max(0, U.dashT - dt);
    U.bumpCd = Math.max(0, U.bumpCd - dt); U.bumpT = Math.max(0, U.bumpT - dt);
    U.danceCd = Math.max(0, U.danceCd - dt); U.cheerCd = Math.max(0, U.cheerCd - dt); U.boingCd = Math.max(0, U.boingCd - dt);

    if (U.state === 'out') {
      this.moveOut(U, dt);
      if (p.ctrl.pressed('a') && U.cheerCd <= 0 && U.outT > 1.2 && this.phase !== 'end') this.cheer(U);
      return;
    }
    if (U.seat) {
      U.sitT += dt;
      const c = U.seat, k = clamp(U.sitT / 0.2, 0, 1);
      U.x = lerp(U.sitFrom.x, c.x, k); U.y = lerp(U.sitFrom.y, c.y + 2, k);
      U.z = Math.sin(k * Math.PI) * 40 + k * this.cushW * 0.2 * ds(c.y);
      return;
    }
    if (U.standT > 0) {
      U.standT -= dt;
      const k = 1 - clamp(U.standT / 0.32, 0, 1);
      U.x = lerp(U.standFrom.x, U.standTo.x, k); U.y = lerp(U.standFrom.y, U.standTo.y, k);
      U.z = Math.sin(k * Math.PI) * 36 + (1 - k) * this.cushW * 0.2;
      if (U.standT <= 0) U.z = 0;
      return;
    }
    if (this.phase === 'end' || this.phase === 'ready') { U.vx = damp(U.vx, 0, 10, dt); U.vy = damp(U.vy, 0, 10, dt); return; }

    let mx = p.ctrl.x, my = p.ctrl.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    if (mag > 0.25) U.aim = Math.atan2(my, mx);
    const free = U.stun <= 0 && U.kb <= 0;

    if (free && p.ctrl.pressed('a')) this.pressA(U, sitters);
    if (free && p.ctrl.pressed('b') && U.dashCd <= 0 && this.phase !== 'out' && this.spend(U)) this.startDash(U);
    if (free && p.ctrl.pressed('x') && U.bumpCd <= 0 && this.phase !== 'out' && this.spend(U)) this.startBump(U);

    if (U.bumpT > 0) { U.vx = Math.cos(U.bumpDir) * BUMP_SPEED; U.vy = Math.sin(U.bumpDir) * BUMP_SPEED; this.bumpHits(U); }
    else if (U.dashT > 0) { U.vx = Math.cos(U.aim) * DASH_SPEED; U.vy = Math.sin(U.aim) * DASH_SPEED; }
    else if (U.kb > 0) { U.vx = damp(U.vx, 0, 3, dt); U.vy = damp(U.vy, 0, 3, dt); }
    else if (U.stun > 0) { U.vx = damp(U.vx, 0, 5, dt); U.vy = damp(U.vy, 0, 5, dt); }
    else {
      const sp = WALK * (this.phase === 'out' ? 0.4 : 1);
      U.vx = damp(U.vx, mx * sp, 12, dt); U.vy = damp(U.vy, my * sp, 12, dt);
    }
    U.x += U.vx * dt; U.y += U.vy * dt;
    U.z = damp(U.z, 0, 14, dt);
    this.gainEnergy(U, dt);
  }

  /** Walking round the ring in the arrows' direction fills the energy bar. */
  gainEnergy(U, dt) {
    U.stamFlash = Math.max(0, U.stamFlash - dt); U.needT = Math.max(0, U.needT - dt);
    if (U.state !== 'in' || U.seat || U.dashT > 0 || U.bumpT > 0 || U.kb > 0) return;
    if (this.phase !== 'music' && this.phase !== 'tell') return;
    const dx = U.x - C.x, dy = (U.y - C.y) * 2.2;             // the ring is a squashed ellipse
    const r = Math.hypot(dx, dy);
    if (r < 40) return;
    // tangent along the arrows (walkDir) at the player's spot
    const tx = (-dy / r) * this.walkDir, ty = (dx / r) * this.walkDir / 2.2;
    const tl = Math.hypot(tx, ty) || 1;
    const along = (U.vx * tx + U.vy * ty) / tl / WALK;           // 1 = full speed with the arrows
    if (along <= 0.15) return;
    const before = U.stam;
    U.stam = Math.min(STAM_MAX, U.stam + along * STAM_GAIN * dt);
    // a little sparkle each time a third fills
    if (Math.floor(before / STAM_COST + 1e-6) < Math.floor(U.stam / STAM_COST + 1e-6)) {
      U.stamFlash = 0.35;
      particles.burst(U.x, U.y - U.a.height * 0.5, { type: 'sparkle', count: 4, colors: ['#ffe36e', '#ffffff'], speed: [40, 120] });
      if (!U.p.isAI) sfx('collect', { step: Math.round(U.stam / STAM_COST), vol: 0.35 });
    }
  }

  /** Pay for a dash or bump; not enough energy -> a little "need energy" nudge. */
  spend(U) {
    if (U.stam + 1e-6 >= STAM_COST) { U.stam = Math.max(0, U.stam - STAM_COST); return true; }
    if (U.needT <= 0 && !U.p.isAI) {
      U.needT = 1.2; sfx('error', { vol: 0.35 });
      particles.popText(U.x, U.y - U.a.height - 20, 'Need energy! Follow the arrows', '#ffb02e', 30);
    }
    return false;
  }

  startDash(U) {
    U.dashT = DASH_T; U.dashCd = DASH_CD;
    U.a.playOnce('dash', 0.3); U.a.squash(0.25); sfx('dash', { vol: 0.6 });
    particles.burst(U.x, U.y - 10, { type: 'dust', count: 6, angle: U.aim + Math.PI, spread: 0.5, speed: [100, 240] });
  }

  pressA(U, sitters) {
    if (this.phase === 'scramble') {
      const nf = this.nearestFree(U);
      if (nf && nf.d <= this.reach()) { sitters.push({ U, c: nf.c, d: nf.d }); return; }
      return;
    }
    if (this.phase === 'out') return;
    const na = this.nearestAny(U);
    if (na && na.d <= this.reach()) this.notYet(U, na.c);
    else if (U.danceCd <= 0) {
      // a happy little dance move (harmless)
      U.danceCd = 0.55;
      U.a.playOnce(pick(DANCE_MOVES), 0.5); U.a.squash(0.3); U.z = 26;
      sfx('note', { midi: pick([72, 76, 79, 84]), vol: 0.35 });
      particles.burst(U.x, U.y - U.a.height, { type: 'note', count: 2, colors: [U.p.color, '#ffffff'], speed: [60, 140] });
    }
  }

  notYet(U, c) {
    const ang = Math.atan2(U.y - c.y, U.x - c.x);
    U.stun = STUN_T; U.vx = Math.cos(ang) * 420; U.vy = Math.sin(ang) * 420;
    U.z = 30;
    U.a.playOnce('hurt', 0.25, 'dizzy'); U.a.squash(0.4); U.a.emote('dizzy', STUN_T);
    c.sqv += 9;
    particles.popText(U.x, U.y - U.a.height - 50, 'Not yet!', '#ff9f1c', 50);
    particles.burst(c.x, c.y - 30, { type: 'star', count: 6, colors: ['#ffd23f', '#ffffff'], speed: [120, 300] });
    snd('cush-boing', 'bounce'); sfx('stun', { vol: 0.6 });
    voice(U.p.charId, 'ouch');
    if (!U.p.isAI) U.p.ctrl.rumble(0.6, 220);
  }

  sit(U, c) {
    c.taken = U; U.seat = c; U.sitT = 0; U.sitFrom = { x: U.x, y: U.y }; U.sits++;
    U.vx = U.vy = 0; U.dashT = 0; U.bumpT = 0;
    U.a.playOnce('sit', 0.05, 'sit'); U.a.squash(0.45);
    c.sqv += 12;
    const col = CUSHION_COLORS[c.color][0];
    particles.burst(c.x, c.y - 30, { type: 'petal', count: 12, colors: ['#ffffff', col], speed: [120, 320] });
    particles.burst(c.x, c.y - 20, { type: 'dust', count: 6 });
    particles.ring(c.x, c.y - 20, U.p.color, 110, 0.4);
    particles.popText(c.x, c.y - this.cushW - 60, 'Safe!', U.p.color, 50);
    snd('cush-plop', 'stamp'); sfx('collect', { step: Math.min(8, this.live.filter((k) => k.taken).length * 2) });
    if (chance(0.6)) voice(U.p.charId, 'yay');
    if (!U.p.isAI) U.p.ctrl.rumble(0.35, 120);
    // the very last cushion: a little slow-mo sting
    if (!this.live.some((k) => !k.taken)) { fx.hitstop(0.06); fx.shake(6, 0.2); }
  }

  startBump(U) {
    U.bumpT = BUMP_T; U.bumpCd = BUMP_CD; U.bumpHit = new Set();
    U.bumpDir = U.p.isAI && U.ai.bumpAim != null ? U.ai.bumpAim : U.aim;
    U.ai.bumpAim = null;
    U.a.playOnce('hip-bump', 0.4); U.a.squash(0.25);
    if (Math.abs(Math.cos(U.aim)) > 0.2) U.a.facing = Math.cos(U.aim) > 0 ? 1 : -1;
    sfx('whoosh', { vol: 0.45 });
  }

  bumpHits(U) {
    for (const T of this.units) {
      if (T === U || T.state !== 'in' || T.standT > 0 || U.bumpHit.has(T)) continue;
      const d = Math.hypot(T.x - U.x, T.y - U.y);
      if (d > (U.a.radius + T.a.radius) * 1.15 + 10) continue;
      U.bumpHit.add(T);
      const mx = (U.x + T.x) / 2, my = (U.y + T.y) / 2 - 60;
      if (T.seat) { // seated friends are safe
        T.a.squash(0.2); sfx('bounce', { vol: 0.4 });
        particles.popText(mx, my - 30, 'Safe!', '#ffffff', 40);
        U.bumpT = 0; continue;
      }
      const ang = Math.atan2(T.y - U.y, T.x - U.x);
      T.kb = 0.42; T.vx = Math.cos(ang) * 560; T.vy = Math.sin(ang) * 560;
      T.a.playOnce('knockback', 0.42); T.a.squash(0.35); T.a.flash('#ffffff', 0.12);
      U.bumpT = 0; U.vx *= 0.2; U.vy *= 0.2;
      particles.burst(mx, my, { type: 'star', count: 8, colors: ['#ffd23f', '#fff', U.p.color], speed: [150, 380] });
      particles.popText(mx, my - 30, 'Boop!', '#ff6fb1', 46);
      snd('boing', 'bonk'); voice(T.p.charId, 'gasp');
      fx.shake(4, 0.12);
      if (!T.p.isAI) T.p.ctrl.rumble(0.6, 180);
      if (!U.p.isAI) U.p.ctrl.rumble(0.3, 100);
    }
  }

  cheer(U) {
    U.cheerCd = 0.5;
    U.a.playOnce('cheer', 0.5, 'clap'); U.a.squash(0.25);
    const hp = U.a.anchor('hand');
    particles.burst(hp.x, hp.y, { type: 'confetti', count: 14, angle: -Math.PI / 2 + (U.x < W / 2 ? 0.5 : -0.5), spread: 0.6, speed: [300, 600] });
    sfx('pop', { vol: 0.5 });
  }

  moveOut(U, dt) {
    if (U.state !== 'out' || !U.spot) return;
    U.outT += dt;
    U.z = damp(U.z, 0, 12, dt);
    if (U.outT < 1.0) { U.vx = 0; U.vy = 0; return; }
    const dx = U.spot.x - U.x, dy = U.spot.y - U.y, d = Math.hypot(dx, dy);
    if (d > 6) {
      const sp = Math.min(440, d * 5);
      U.vx = (dx / d) * sp; U.vy = (dy / d) * sp;
      U.x += U.vx * dt; U.y += U.vy * dt;
      U.arrived = false;
    } else {
      U.vx = U.vy = 0;
      if (!U.arrived) {
        U.arrived = true; U.arriveT = 0;
        U.a.facing = U.x < W / 2 ? 1 : -1;
        U.a.setPose('pout');
      }
      U.arriveT += dt;
      if (U.arriveT > 1.4 && U.a.pose === 'pout' && this.phase !== 'end') { U.a.clearEmotes(); U.a.setPose('clap'); }
    }
  }

  collide(dt) {
    const U = this.units.filter((u) => u.state === 'in' && !u.seat && u.standT <= 0);
    const R = 30 * this.scale / 0.95;
    for (let i = 0; i < U.length; i++) {
      for (let j = i + 1; j < U.length; j++) {
        const A = U[i], B = U[j];
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.001, min = R * 2;
        if (d < min) { const push = (min - d) / 2, nx = dx / d, ny = dy / d; A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push; }
      }
    }
    const solidAll = this.phase === 'music' || this.phase === 'tell' || this.phase === 'reset' || this.phase === 'ready';
    for (const u of U) {
      for (const c of this.live) {
        if (!solidAll && !c.taken) continue;
        const min = this.cushW * 0.5 * ds(c.y) + R * 0.8;
        const dx = u.x - c.x, dy = (u.y - c.y) * 1.4, d = Math.hypot(dx, dy);
        if (d < min) {
          const nx = d > 0.01 ? dx / d : 1, ny = d > 0.01 ? dy / d : 0;
          u.x = c.x + nx * min; u.y = c.y + (ny * min) / 1.4;
          if (solidAll && u.boingCd <= 0 && this.phase !== 'reset') { // the cushion boings you along
            u.boingCd = 0.6; c.sqv += 5; sfx('bounce', { vol: 0.25 });
            u.vx += nx * 160; u.vy += ny * 110;
          }
        }
      }
      u.x = clamp(u.x, ROOM.x0, ROOM.x1); u.y = clamp(u.y, ROOM.y0, ROOM.y1);
    }
  }

  animate(U, dt) {
    const a = U.a;
    a.x = U.x; a.y = U.y; a.z = U.z;
    a.scale = this.scale * ds(U.y);
    if (U.state === 'in' && !U.seat && U.standT <= 0) {
      if (U.stun > 0) { if (!a._once) a.setPose('dizzy'); }
      else if (U.kb > 0 || U.bumpT > 0 || U.dashT > 0) { /* playOnce running */ }
      else if (this.phase === 'end') { /* celebrate set */ }
      else {
        if (a.pose === 'dizzy') a.setPose('idle');
        const spd = Math.hypot(U.vx, U.vy);
        const playing = this.phase === 'music' || this.phase === 'tell' || this.phase === 'reset';
        if (spd < 40 && playing) { if (!a._once) a.setPose('dance'); }
        else a.moveAnim(U.vx, U.vy, WALK, { run: this.phase === 'scramble' && spd > WALK * 0.6 });
      }
    } else if (U.state === 'out' && U.outT >= 1.0 && !U.arrived) a.moveAnim(U.vx, U.vy, 440);
    else if (U.seat && U.sitT > 0.2 && !a._once && a.pose !== 'sit' && this.phase !== 'end') a.setPose('sit');
    if (U.seat && this.winner === U) a.setPose('celebrate');
    a.update(dt);
  }

  // --- CPU ---------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, lvl = clamp(p.aiLevel ?? 0, 0, 2), A = U.ai;
    if (U.state === 'out') {
      p.ctrl.move(0, 0);
      if (U.arrived && this.phase !== 'end' && chance(dt * 0.35)) p.ctrl.press('a');
      return;
    }
    if (U.seat || U.standT > 0 || this.phase === 'out' || this.phase === 'end') { p.ctrl.move(0, 0); return; }
    if (this.phase === 'scramble') { this.aiScramble(U, dt, lvl); return; }
    A.goAt = null; A.target = null; A.sitAt = null; A.retargetAt = null;
    if (this.phase !== 'tell') { A.tellAt = null; A.early = false; }
    // Easy CPUs sometimes stop to dance on the spot
    if (A.dawdle > 0) { A.dawdle -= dt; p.ctrl.move(0, 0); return; }
    if (lvl === 0 && this.phase === 'music' && chance(dt * 0.14)) A.dawdle = rand(0.5, 1.3);
    const m = A.margin;
    const erx = this.rx + this.cushW * 0.5 + m, ery = this.ry + this.cushW * 0.35 + m * 0.6;
    const myA = Math.atan2((U.y - C.y) / ery, (U.x - C.x) / erx);
    let tx = C.x + Math.cos(myA + this.walkDir * 0.6) * erx, ty = C.y + Math.sin(myA + this.walkDir * 0.6) * ery;
    if (this.phase === 'tell') {
      if (A.tellAt == null) {
        A.tellAt = this.t + reactionTime(p) * (lvl === 2 ? 0.6 : 1);
        A.lean = lvl === 2 || (lvl === 1 && chance(0.6));
        A.early = false;
      }
      if (this.t >= A.tellAt) {
        const na = this.nearestAny(U);
        if (A.lean && na) {
          const c = na.c, ox = c.x - C.x, oy = (c.y - C.y) * 2, l = Math.hypot(ox, oy) || 1;
          const off = this.cushW * 0.5 + 34;
          tx = c.x + (ox / l) * off; ty = c.y + (oy / l) * off * 0.6;
        }
        if (!A.early) { // jumping the gun: Easy CPUs fall for it a lot, Normal ones on fake-outs
          A.early = true;
          const pr = [0.3, this.fake ? 0.12 : 0.03, 0][lvl];
          if (na && na.d < this.reach() && chance(pr)) p.ctrl.press('a');
        }
      }
    }
    steer(p, U.x, U.y, tx, ty, { arrive: 30 });
    // the odd dance move or playful bump while the music plays
    if (this.phase === 'music') {
      const na = this.nearestAny(U);
      if (U.danceCd <= 0 && chance(dt * 0.12) && (!na || na.d > this.reach() + 50)) p.ctrl.press('a');
      if (U.bumpCd <= 0 && U.stam >= 2 * STAM_COST && chance(dt * [0.05, 0.08, 0.1][lvl])) {   // keep one for the scramble
        const r = this.nearestRival(U, 95);
        if (r) { A.bumpAim = Math.atan2(r.y - U.y, r.x - U.x); p.ctrl.press('x'); }
      }
    }
  }

  nearestRival(U, maxD) {
    let best = null, bd = maxD;
    for (const T of this.units) {
      if (T === U || T.state !== 'in' || T.seat || T.standT > 0) continue;
      const d = Math.hypot(T.x - U.x, T.y - U.y);
      if (d < bd) { bd = d; best = T; }
    }
    return best;
  }

  pickCushion(U, lvl) {
    const free = this.live.filter((c) => !c.taken).map((c) => ({ c, d: this.cdist(U, c) })).sort((a, b) => a.d - b.d);
    if (!free.length) return null;
    if (lvl === 0) return (free.length > 1 && chance(aiProfile(U.p).mistake) ? free[1] : free[0]).c;
    const others = this.units.filter((o) => o !== U && o.state === 'in' && !o.seat);
    const look = lvl === 2 ? free.length : Math.min(2, free.length);
    for (let i = 0; i < look; i++) {
      const f = free[i];
      const beaten = others.some((o) => this.cdist(o, f.c) < f.d * 0.7 && o.stun <= 0);
      if (!beaten) return f.c;
    }
    return free[0].c;
  }

  aiScramble(U, dt, lvl) {
    const p = U.p, A = U.ai;
    if (A.goAt == null) A.goAt = this.t + reactionTime(p) * (A.lean ? 0.6 : 1) + (lvl === 0 ? rand(0.05, 0.3) : 0);
    if (this.t < A.goAt) return;            // still dancing for a moment: the stick keeps its last push
    if (!A.target || A.target.taken || A.target.gone) {
      if (A.target && A.retargetAt == null) A.retargetAt = this.t + reactionTime(p) * 0.6;
      if (A.retargetAt != null && this.t < A.retargetAt) { p.ctrl.move(0, 0); return; }
      A.retargetAt = null;
      A.target = this.pickCushion(U, lvl);
      if (!A.target) { p.ctrl.move(0, 0); return; }
    }
    const c = A.target, d = this.cdist(U, c);
    steer(p, U.x, U.y, c.x, c.y, { arrive: 24, wobble: lvl < 2 });
    if (d < this.reach() * 0.85) {
      if (A.sitAt == null) A.sitAt = this.t + [rand(0.08, 0.25), rand(0, 0.08), 0][lvl];
      if (this.t >= A.sitAt) { p.ctrl.press('a'); A.sitAt = null; }
    } else if (lvl >= 1 && d > 280 && U.dashCd <= 0 && U.stam >= STAM_COST && chance(dt * 4)) {
      U.aim = Math.atan2(c.y - U.y, c.x - U.x);
      p.ctrl.press('b');
    }
    if (U.bumpCd <= 0 && U.brain.ready(dt)) {
      U.brain.think();
      const r = this.nearestRival(U, 110);
      if (r && U.stam >= STAM_COST && this.cdist(r, c) < d && chance([0.12, 0.3, 0.45][lvl])) { A.bumpAim = Math.atan2(r.y - U.y, r.x - U.x); p.ctrl.press('x'); }
    }
  }

  // --- drawing -----------------------------------------------------------------------
  draw(g) {
    const bg = art('bg/musical-cushions');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(roomBackground(), 0, 0);
    const t = this.t || this.t0;
    const beat = this.tune.beat;
    const pulse = this.lightK * Math.pow(1 - (beat % 1), 3);
    // party dimming + fairy lights twinkling on the beat
    if (this.lightK > 0.01) { g.save(); g.globalAlpha = 0.16 * this.lightK; g.fillStyle = '#3a1d6e'; g.fillRect(0, 0, W, H); g.restore(); }
    this.drawFairyLights(g, t, beat);
    // speakers + record player
    for (const s of SPEAKERS) drawSpeaker(g, s.x, s.y, pulse);
    drawRecordPlayer(g, this.spin, this.arm, t, { wobble: this.phase === 'tell' ? 1 : 0, glow: this.phase === 'tell' ? 0.6 + 0.4 * Math.sin(t * 30) : 0 });
    if (this.phase === 'tell' || (this.phase === 'scramble' && this.pt < 0.6)) {
      const k = this.phase === 'tell' ? clamp(this.pt / 0.2, 0, 1) : 1 - this.pt / 0.6;
      g.save(); g.globalAlpha = k;
      ui.text(g, '!', RP.x + 150, RP.y - 220 + Math.sin(t * 20) * 4, { size: 80, color: '#ffd23f', strokeWidth: 12 });
      g.restore();
    }
    this.drawRugArrows(g, t);
    // y-sorted scene
    const list = [];
    for (const c of this.cushions) if (!c.gone || c.poofT < 0.3) list.push({ y: c.y, fn: () => this.drawCushionObj(g, c, t) });
    for (const U of this.units) list.push({ y: U.y + (U.seat ? 3 : 0), fn: () => this.drawUnit(g, U) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();
    // party lights
    if (this.lightK > 0.01) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const cols = ['255,111,177', '63,167,255', '255,210,63', '155,92,255'];
      for (let k = 0; k < 4; k++) {
        const x = C.x + Math.cos(t * 0.8 + k * 1.7) * 520, y = C.y + Math.sin(t * 1.1 + k * 2.3) * 220;
        const r = 210 + pulse * 30;
        const gr = g.createRadialGradient(x, y, 10, x, y, r);
        gr.addColorStop(0, `rgba(${cols[k]},${0.2 * this.lightK})`); gr.addColorStop(1, `rgba(${cols[k]},0)`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU); g.fill();
      }
      g.restore();
    }
  }

  drawFairyLights(g, t, beat) {
    const y0 = WALL_Y - 104;
    g.save();
    g.strokeStyle = 'rgba(36,22,63,0.5)'; g.lineWidth = 2.5;
    g.beginPath();
    for (let x = 0; x <= W; x += 40) { const y = y0 + Math.sin(x * 0.02) * 6 + 8; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    const on = this.lightK;
    for (let i = 0; i * 64 + 20 < W; i++) {
      const x = i * 64 + 20, y = y0 + Math.sin(x * 0.02) * 6 + 16;
      const lit = on > 0.5 ? ((Math.floor(beat) + i) % 3 === 0 ? 1 : 0.45) : 0.75;
      g.fillStyle = RAINBOW[i % RAINBOW.length];
      g.globalAlpha = 0.5 + 0.5 * lit;
      g.beginPath(); g.ellipse(x, y, 7, 10, 0, 0, TAU); g.fill();
      if (lit === 1) { g.globalAlpha = 0.35; g.beginPath(); g.arc(x, y, 18, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  drawRugArrows(g, t) {
    if (!(this.phase === 'music' || this.phase === 'tell' || this.phase === 'reset')) return;
    const n = 10, erx = this.rx + this.cushW * 0.5 + 70, ery = this.ry + this.cushW * 0.35 + 42;
    g.save();
    g.globalAlpha = 0.45 * (this.phase === 'reset' ? clamp(this.pt / 0.4, 0, 1) : 1);
    g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(36,22,63,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + this.walkDir * t * 0.35;
      const x = C.x + Math.cos(a) * erx, y = C.y + Math.sin(a) * ery;
      const dir = Math.atan2(Math.cos(a) * ery * this.walkDir, -Math.sin(a) * erx * this.walkDir);
      g.save(); g.translate(x, y); g.scale(1, 0.6); g.rotate(dir);
      g.beginPath(); g.moveTo(16, 0); g.lineTo(-10, -13); g.lineTo(-4, 0); g.lineTo(-10, 13); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    g.restore();
  }

  drawCushionObj(g, c, t) {
    const s = ds(c.y);
    const glow = this.phase === 'scramble' && !c.taken && !c.gone ? 1 : 0;
    const alpha = c.gone ? 1 - c.poofT / 0.3 : 1;
    const sq = clamp(c.sq, -0.5, 0.8) + (c.taken ? 0.18 : 0);
    drawCushion(g, c.x, c.y, this.cushW * s * (c.gone ? 1 + c.poofT : 1), c.color, { z: c.z, sq, glow, t, alpha });
  }

  drawUnit(g, U) {
    const a = U.a, p = U.p;
    const showRing = U.state === 'in' && !U.seat && U.standT <= 0;
    a.draw(g, { ring: showRing ? p.color : null, shadow: !U.seat });
    if (U.state === 'in' && !U.seat && this.phase !== 'end') this.drawEnergy(g, U);
    // player tags: everyone at the start; humans while racing for a seat
    const early = this.round <= 1 && this.t < 4.5;
    if (U.state === 'in' && (early || (!p.isAI && (this.phase === 'scramble' || this.phase === 'tell')))) {
      const sc = (this.n > 5 ? 0.72 : 0.9) * (early ? 1 : 0.85);
      g.save(); g.translate(U.x, U.y - U.z - a.height - 30); g.scale(sc, sc); ui.playerTag(g, p, 0, 0); g.restore();
    }
    // final stars over the two finalists
    if (this.bo3 && U.state === 'in' && this.alive.length === 2 && this.phase !== 'end') {
      for (let k = 0; k < this.finalTarget; k++) {
        g.save(); g.translate(U.x + (k - (this.finalTarget - 1) / 2) * 34, U.y - U.z - a.height - (this.phase === 'scramble' && !p.isAI ? 92 : 40));
        g.globalAlpha = k < U.wins ? 1 : 0.35;
        ui.stars(g, 1, 0, 0, 24, { color: k < U.wins ? '#ffd23f' : '#ffffff' });
        g.restore();
      }
    }
  }

  /** Three-segment energy bar under the player (one segment = one dash or bump). */
  drawEnergy(g, U) {
    const w = 84, h = 12, x = U.x - w / 2, y = U.y + 24;
    g.save();
    if (U.needT > 0) g.translate(Math.sin(this.t * 60) * 3 * (U.needT / 1.2), 0);
    ui.roundRect(g, x - 3, y - 3, w + 6, h + 6, 7); g.fillStyle = 'rgba(36,22,63,0.75)'; g.fill();
    const fill = U.stam / STAM_MAX;
    if (fill > 0) { ui.roundRect(g, x, y, Math.max(h, w * fill), h, 5); g.fillStyle = U.stamFlash > 0 ? '#ffffff' : '#ffd23f'; g.fill(); }
    g.fillStyle = 'rgba(36,22,63,0.85)';
    for (let k = 1; k < 3; k++) g.fillRect(x + (w * k) / 3 - 1, y, 2, h);
    g.restore();
  }

  drawHUD(g) {
    const units = this.units;
    const finalists = this.bo3 && this.alive.length === 2;
    const values = units.map((u) => (u.state === 'out' ? 'Out' : finalists ? `${u.wins} ★` : u.seat ? 'Safe!' : 'In'));
    ui.scoreboard(g, this.players, values, {
      y: 16, avoidCenter: true,
      out: units.map((u) => u.state === 'out'),
      expr: units.map((u) => (u.state === 'out' ? 'sad' : u.seat || u === this.winner ? 'happy' : 'neutral')),
      highlight: units.map((u) => u === this.winner),
    });
    this.drawMusicPill(g);
    // round info
    if (this.round > 0 && this.phase !== 'end') {
      const k = this.live.length;
      const txt = finalists ? (this.bo3 ? `Final - first to ${this.finalTarget} stars!` : 'Final!') : `Round ${this.round}  ·  ${k} cushion${k === 1 ? '' : 's'}`;
      const w = ui.measure(g, txt, 28, 800) + 50;
      ui.panel(g, W / 2 - w / 2, 108, w, 48, { r: 24, fill: '#fff8ec', lineWidth: 4 });
      ui.text(g, txt, W / 2, 133, { size: 28, color: NAVY, stroke: false, weight: 800 });
    }
    if (this.banner) {
      const b = this.banner;
      const fade = clamp((b.dur - b.t) / 0.25, 0, 1);
      g.save(); g.globalAlpha = fade;
      ui.banner(g, b.text, b.t, { size: b.text === 'SIT!' ? 190 : 130, y: H / 2 - 150, color: b.text === 'SIT!' ? '#ff6fb1' : '#ffd23f' });
      g.restore();
    }
    if (this.msg) {
      const a = clamp(Math.min(this.msg.t / 0.2, (2.4 - this.msg.t) / 0.3), 0, 1);
      g.save(); g.globalAlpha = a;
      const w = Math.min(1100, ui.measure(g, this.msg.text, 38, 800) + 70);
      ui.panel(g, W / 2 - w / 2, H - 92, w, 66, { r: 33 });
      ui.text(g, this.msg.text, W / 2, H - 58, { size: 38, color: NAVY, stroke: false, weight: 800, maxWidth: w - 50 });
      g.restore();
    }
    // first-round hints
    if (this.round === 1 && !this.msg) {
      let hint = null;
      if (this.phase === 'music' || this.phase === 'reset' || this.phase === 'tell') hint = 'Dance around! When the music stops, sit with';
      else if (this.phase === 'scramble') hint = 'Quick! Run to a cushion and press';
      if (hint) {
        g.save();
        const w = ui.measure(g, hint, 36, 800) + 150;
        ui.panel(g, W / 2 - w / 2, H - 92, w, 66, { r: 33 });
        ui.text(g, hint, W / 2 - 30, H - 58, { size: 36, color: NAVY, stroke: false, weight: 800 });
        ui.glyph(g, 'a', W / 2 + w / 2 - 50, H - 59, 46, { pulse: this.phase === 'scramble' });
        g.restore();
      }
    }
  }

  drawMusicPill(g) {
    const x = W / 2, y = 54, t = this.t || this.t0;
    const ph = this.phase;
    const playing = ph === 'music' || ph === 'tell';
    let fill = '#ffffff', label = '', col = NAVY;
    if (ph === 'music') { fill = '#8fe3c5'; }
    else if (ph === 'tell') { fill = '#ffe27a'; }
    else if (ph === 'scramble') { fill = '#ff6fb1'; label = 'SIT!'; col = '#ffffff'; }
    else if (ph === 'out' || ph === 'end') { fill = '#e8dbff'; label = 'Stop'; }
    else { label = 'Ready'; }
    const shake = ph === 'tell' ? Math.sin(t * 50) * 4 : 0;
    const sc = ph === 'scramble' ? 1 + 0.08 * Math.max(0, Math.sin(t * 10)) : 1;
    g.save(); g.translate(x + shake, y); g.scale(sc, sc);
    ui.panel(g, -96, -38, 192, 76, { r: 38, fill });
    if (playing) {
      const beat = this.tune.beat;
      for (let i = 0; i < 3; i++) {
        const hop = Math.abs(Math.sin((beat + i * 0.33) * Math.PI)) * 12 * this.tune.rate;
        g.save(); g.translate(-46 + i * 46, 4 - hop);
        if (ph === 'tell') g.rotate(Math.sin(t * 30 + i) * 0.3);
        ui.text(g, i % 2 ? '♫' : '♪', 0, 0, { size: 44, color: ['#ff4d9a', '#7a4dff', '#1fae8a'][i], strokeWidth: 6 });
        g.restore();
      }
    } else ui.text(g, label, 0, 3, { size: label === 'SIT!' ? 46 : 36, color: col, stroke: label === 'SIT!' ? NAVY : false, weight: 800 });
    g.restore();
  }
}

