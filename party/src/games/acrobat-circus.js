// Acrobat Circus (Play Studio). A cosy big-top show in four acts, each player
// in their own little ring: Trampoline (A on landing bounces higher),
// Flying Trapeze (A leaps from bar to bar), Tightrope (the stick balances,
// A hops) and Ball Balance (the stick rolls, A hops to pop balloons). In the
// air the stick spins flips, B tucks, X twists and Y strikes a star; let go of
// the stick to land on your feet. Wobbly landings just bounce you into the
// safety net. Tricks earn applause. Then everyone builds a human pyramid in
// the big ring and the finale show replays each acrobat's best trick under
// a spotlight before a group bow. No losing, ever.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, hasSound } from '../engine/audio.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { clamp, lerp, rand, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { playerName } from '../state.js';
import { drawStarShape } from '../engine/emotes.js';
import { PHOTO_POSES, photoPosePressed, strikePhotoPose, randomPhotoPose } from '../engine/photo-poses.js';
import {
  NAVY, GOLD, RED, drawBigTop, drawSpotCones, drawStationRing, drawTrampoline, TRAMP_BED, drawRope, drawBar,
  drawTower, drawNet, drawBall, drawBalloon, drawParasol, drawActIcon, drawIcon, BALLOON_COLORS,
} from './acrobat-circus/art.js';
import {
  newAir, airInput, updateAir, recordAir, judge, twistScale, planTrick, playTrick, endTrick, wrapAngle,
} from './acrobat-circus/tricks.js';

export const meta = {
  id: 'acrobat-circus',
  title: 'Acrobat Circus',
  category: 'studio',
  type: 'Circus show · Everyone wins',
  goal: 'Bounce, swing, balance and flip through four circus acts, build a human pyramid, then star in the finale show!',
  controls: [['stick', 'In the air: flip! (and balance, roll)'], ['a', 'Bounce higher, leap, hop'], ['b', 'Tuck: spin faster'], ['x', 'Twist'], ['y', 'Star jump']],
  infoAt: 'tl',
  tips: ['Let go of the stick to land on your feet!', 'On the trampoline, press A just as you land to bounce higher.', 'A wobbly landing? The safety net bounces you right back up!'],
  music: 'bouncy',
  duration: 'about 3 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  drawIcon,
};

const G = 1500;                 // gravity in station units / s²
const ACT_TIME = 28;
const OUTRO = 2.2;
const INTRO = 2.6;
const SCALE = 0.72;             // acrobat size in a station
const TRAMP_H = [95, 155, 215, 262];
const NET_UP = 40;              // the safety net's height above a station's floor
const ACTS = [
  { id: 'tramp', name: 'Trampoline', line: 'Bounce, flip and twist!', tip: 'Press A as you land to bounce higher!' },
  { id: 'trapeze', name: 'Flying Trapeze', line: 'Leap from bar to bar!', tip: 'Press A to leap. Let go of the stick to land on your feet!' },
  { id: 'rope', name: 'Tightrope', line: 'Walk the wobbly rope!', tip: 'Wobbling? Push the stick the other way!' },
  { id: 'ball', name: 'Ball Balance', line: 'Roll and pop the balloons!', tip: 'Roll under a balloon, then hop with A!' },
];
const STEPS = ['tramp', 'trapeze', 'rope', 'ball', 'pyramid', 'show'];
const HINTS = {
  tramp: [['a', 'Bounce!'], ['stick', 'Flip'], ['x', 'Twist'], ['y', 'Star']],
  trapeze: [['a', 'Leap!'], ['stick', 'Flip'], ['b', 'Tuck'], ['x', 'Twist']],
  rope: [['stick', 'Balance'], ['a', 'Hop'], ['x', 'Twist'], ['y', 'Star']],
  ball: [['stick', 'Roll'], ['a', 'Hop'], ['x', 'Twist'], ['y', 'Star']],
};
const CHEERS = ['Ta-da!', 'Wow!', 'Bravo!', 'Yay!', 'Hup!'];
const NONE = { x: 0, tuck: false, twist: false, star: false };
// Pyramid rows (players per row, bottom first); 1–2 players stand on the Troll strongman.
const ROWS = { 1: [1], 2: [2], 3: [2, 1], 4: [3, 1], 5: [3, 2], 6: [3, 2, 1], 7: [4, 2, 1], 8: [4, 3, 1] };
const FLOOR = 930;              // big-ring floor (screen px)
const POSE_TIME = 4.5;          // "Strike a pose!" on top of the pyramid

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

function stationRects(n) {
  const top = 112, bottom = 1068, left = 14, right = W - 14, gap = 14;
  if (n === 1) return [{ x: 260, y: top, w: 1400, h: bottom - top }];
  const cols = n === 2 ? 2 : n <= 4 ? 2 : 4, rows = n === 2 ? 1 : 2;
  const w = (right - left - gap * (cols - 1)) / cols, h = (bottom - top - gap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const inRow = Math.min(cols, n - row * cols);
    const ox = ((cols - inRow) * (w + gap)) / 2;
    return { x: left + ox + col * (w + gap), y: top + row * (h + gap), w, h };
  });
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.crowd = 0;
    this.clapCD = 0; this.bigClapCD = 0;
    this.phase = 'acts';
    this.actI = 0; this.actT = 0; this.outroT = -1;
    this.cpuOnly = this.players.every((p) => p.isAI);
    const rects = stationRects(this.n);
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i]));
    this.glimmer = new Actor('glimmer', { scale: 1.1, x: 300, y: 420 });
    this.glimmer.setPose('float');
    let start = null;
    try { start = new URLSearchParams(location.search).get('acstart'); } catch (e) { /* no location */ }
    if (start === 'pyramid' || start === 'show') { this.startPyramid(); if (start === 'show') this.startShow(); }
    else {
      const i = ACTS.findIndex((a) => a.id === start);
      this.startAct(Math.max(0, i));
    }
  }

  makeStation(p, i, r) {
    const k = Math.min(r.h / 540, r.w / 480);
    const vw = r.w / k, vh = r.h / k;
    const a = new Actor(p, { scale: SCALE, x: vw / 2, y: vh - 140, facing: i % 2 ? -1 : 1 });
    a.snap();
    const st = {
      p, i, r, k, vw, vh, floor: vh - 36, actor: a, air: null, plan: null, s: {}, claps: 0, best: null, tricks: 0,
      label: null, clapBump: 0, flipCD: 0, wobCD: 0, rot: 0, pivot: 'center',
    };
    // a frilly parasol for balance on the tightrope
    a.attach((g, info) => {
      if (this.phase !== 'acts' || this.act.id !== 'rope' || st.s.mode !== 'walk') return;
      g.translate(info.hand.x, info.hand.y + info.h * 0.08);
      g.rotate(0.15 - (st.s.lean || 0) * 0.5 * info.facing);
      drawParasol(g, info.h * 0.6);
    });
    return st;
  }

  get act() { return ACTS[this.actI]; }
  get live() { return this.phase === 'acts' && this.outroT < 0; }
  toScreen(st, x, y) { return { x: st.r.x + x * st.k, y: st.r.y + y * st.k }; }

  // =========================================================================
  // Acts
  startAct(i) {
    this.actI = i; this.actT = 0; this.outroT = -1;
    for (const st of this.stations) this.enterAct(st);
    sfx('whistle', { vol: 0.5 });
    this.glimmer.say(ACTS[i].line, INTRO - 0.2, null);
  }

  enterAct(st) {
    const a = st.actor, id = this.act.id;
    st.air = null; st.plan = null; st.rot = 0; st.pivot = 'center';
    if (st.p.isAI) endTrick(st.p);
    a.z = 0; a.setPose('idle'); a.speed = 0;
    const { vw, floor } = st;
    if (id === 'tramp') {
      st.s = { z: 0, vz: Math.sqrt(2 * G * TRAMP_H[0]), level: 0, dip: 0, aBuf: 0, decide: rand(25, 70), decided: false };
      a.x = vw / 2; a.y = floor - TRAMP_BED; a.facing = st.i % 2 ? -1 : 1;
      st.air = newAir(a, a.x, a.y);
    } else if (id === 'trapeze') {
      const L = 300, amp = vw < 700 ? 0.36 : 0.46;
      const d = Math.min(200, vw / 2 - 40 - L * Math.sin(amp));
      st.s = { mode: 'bar', on: 0, onT: 0, ph: rand(TAU), px: [vw / 2 - d, vw / 2 + d], py: 8, L, amp, fl: null, vy: 0, vx: 0, bounces: 0, sag: 0, sagX: vw / 2, aiWait: rand(0.5, 1.6), aiQ: rand(0.45, 0.8) + (st.p.aiLevel || 0) * 0.08, spin: 0 };
      this.placeOnBar(st);
    } else if (id === 'rope') {
      const xa = 70, xb = vw - 70;
      st.s = { mode: 'walk', xa, xb, y: floor - 251, x: xa + 26, dir: 1, lean: 0, leanV: 0, ph: rand(20), z: 0, vz: 0, vy: 0, vx: 0, bounces: 0, sag: 0, fl: null, aiT: 0, aiX: 0, hopCD: rand(2, 4), crossings: 0, spin: 0 };
      if (st.i % 2) { st.s.x = xb - 26; st.s.dir = -1; }
      a.x = st.s.x; a.y = st.s.y; a.facing = st.s.dir;
    } else if (id === 'ball') {
      const R = 62;
      st.s = { mode: 'ride', R, bx: vw / 2 + rand(-60, 60), bvx: 0, rot: 0, z: 0, vz: 0, fl: null, slipT: 0, balloons: [], aiT: 0, aiTarget: null, hopCD: 0 };
      const nb = clamp(Math.round(vw / 170), 3, 6);
      for (let j = 0; j < nb; j++) st.s.balloons.push(this.newBalloon(st, j));
      a.x = st.s.bx; a.y = floor - 2 * R;
    }
    a.snap();
  }

  newBalloon(st, j) {
    const x = rand(70, st.vw - 70);
    return { x, y: rand(140, 300), ci: (j + st.i) % BALLOON_COLORS.length, ph: rand(TAU), alive: true, respawn: 0, pop: 0 };
  }

  update(dt) {
    this.t += dt;
    this.crowd = Math.max(0, this.crowd - dt * 0.35);
    this.clapCD -= dt; this.bigClapCD -= dt;
    this.glimmer.update(dt);
    if (this.phase === 'acts') this.updateActs(dt);
    else if (this.phase === 'pyramid') this.updatePyramid(dt);
    else if (this.phase === 'show') this.updateShow(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    this.glimmer.update(dt);
    for (const st of this.stations) st.actor.update(dt);
    if (this.troll) this.troll.actor.update(dt);
  }

  updateActs(dt) {
    this.actT += dt;
    const live = this.live;
    for (const st of this.stations) {
      st.clapBump = Math.max(0, st.clapBump - dt);
      st.flipCD -= dt; st.wobCD -= dt;
      if (st.label) st.label.t += dt;
      if (st.p.isAI && live) this.aiAct(st, dt);
      if (st.plan && st.air) playTrick(st.p, st.plan, dt);
      const inp = live ? airInput(st.p.ctrl) : NONE;
      switch (this.act.id) {
        case 'tramp': this.updateTramp(st, dt, inp, live); break;
        case 'trapeze': this.updateTrapeze(st, dt, inp, live); break;
        case 'rope': this.updateRope(st, dt, inp, live); break;
        case 'ball': this.updateBall(st, dt, inp, live); break;
      }
      st.actor.update(dt);
    }
    if (this.outroT < 0 && this.actT >= ACT_TIME) {
      this.outroT = 0;
      for (const st of this.stations) { if (st.p.isAI) endTrick(st.p); }
      snd('applause', 'cheer', { vol: 0.6 }); sfx('whistle', { vol: 0.4 });
      this.crowd = 1;
    }
    if (this.outroT >= 0) {
      this.outroT += dt;
      const settled = this.stations.every((st) => !st.air);
      if (this.outroT > OUTRO && (settled || this.outroT > OUTRO + 2)) {
        if (this.actI + 1 < ACTS.length) this.startAct(this.actI + 1);
        else this.startPyramid();
      }
    }
  }

  // --- shared trick feedback ----------------------------------------------
  airEvents(st, ev) {
    const a = st.actor;
    if (!ev.flip && !ev.twist && !ev.star) return;
    const c = this.toScreen(st, a.x, a.y - a.z - a.height * 0.5);
    if (ev.flip) {
      if (st.flipCD <= 0) { snd('ac-flip', 'whoosh', { vol: this.n > 4 ? 0.25 : 0.4 }); st.flipCD = 0.15; }
      particles.burst(c.x, c.y, { type: 'sparkle', count: 4, colors: ['#fff', st.p.color], speed: [60, 160] });
    }
    if (ev.twist) { sfx('sparkle', { vol: 0.25 }); particles.burst(c.x, c.y, { type: 'star', count: 3, speed: [80, 200], colors: [GOLD, '#fff'] }); }
    if (ev.star) { sfx('star', { vol: 0.3 }); particles.burst(c.x, c.y, { type: 'star', count: 7, speed: [120, 300] }); }
  }

  /** Landing: score the jump, cheer, remember the best trick. */
  land(st, extra = {}) {
    const air = st.air;
    st.air = null; st.plan = null;
    if (st.p.isAI) endTrick(st.p);
    if (!air) return null;
    const res = judge(air, st.actor.facing, extra);
    this.award(st, res);
    return res;
  }

  award(st, res, { quiet = false } = {}) {
    const a = st.actor;
    const head = this.toScreen(st, a.x, a.y - a.z - a.height * 1.05);
    if (!res.clean) {
      particles.popText(head.x, head.y, 'Whoops!', '#ffffff', 34);
      snd('crowd-aww', null, { vol: 0.25 });
    }
    if (res.score <= 0) return;
    st.claps += res.score; st.clapBump = 0.35; st.tricks++;
    if (res.rec && res.rec.length > 4 && (!st.best || res.score >= st.best.score)) st.best = { score: res.score, name: res.name, rec: res.rec, act: this.phase === 'acts' ? this.act.id : this.phase, clean: res.clean };
    if (res.name) st.label = { text: res.name + '!', t: 0, color: st.p.color, big: res.score >= 9 };
    particles.popText(head.x, head.y - (res.clean ? 0 : 40), `+${res.score}`, GOLD, res.score >= 9 ? 56 : 42);
    const big = res.score >= 9;
    particles.burst(head.x, head.y + 20, { type: 'confetti', count: Math.min(40, 6 + res.score * 2), speed: [150, 420 + res.score * 15] });
    if (res.clean && res.tricky) particles.burst(head.x, head.y + 30, { type: 'sparkle', count: 8, colors: ['#fff', GOLD] });
    this.crowd = Math.min(1, this.crowd + res.score * 0.06);
    if (!quiet) {
      if (big && this.bigClapCD <= 0) { snd('applause', 'cheer', { vol: 0.55 }); this.bigClapCD = 3; this.clapCD = 1; }
      else if (this.clapCD <= 0) { snd('ac-clap', 'yay', { vol: 0.35 }); this.clapCD = 0.5; }
      if (res.clean && res.tricky) snd('ac-tada', 'star', { vol: 0.35 });
    }
    if (res.clean) a.playOnce(big ? 'strike3' : 'cheer', 0.5);
    if (big && this.n <= 2) fx.shake(6, 0.2);
  }

  wobble(st) {
    const a = st.actor;
    a.playOnce('dizzy', 0.8);
    a.squash(0.3);
    if (st.wobCD <= 0) { snd('ac-net', 'boing', { vol: 0.45 }); st.wobCD = 0.3; }
  }

  // --- Act 1: trampoline ---------------------------------------------------
  updateTramp(st, dt, inp, live) {
    const s = st.s, a = st.actor, c = st.p.ctrl;
    const bedY = st.floor - TRAMP_BED;
    if (live && c.pressed('a')) s.aBuf = 0.3;
    s.aBuf -= dt;
    s.dip = Math.max(0, s.dip - dt * 4);
    if (s.stopped) { a.z = 0; a.y = bedY + s.dip * 14; return; }
    s.vz -= G * dt; s.z += s.vz * dt;
    if (st.air) {
      this.airEvents(st, updateAir(st.air, inp, dt, a, s.vz > 0));
      recordAir(st.air, a.x, bedY - s.z, a, dt);
    }
    if (s.z <= 0 && s.vz < 0) {
      const impact = -s.vz;
      s.z = 0;
      const res = st.air ? this.land(st) : null;
      const wob = res && !res.clean;
      if (wob) this.wobble(st);
      const hit = s.aBuf > 0 && !wob;
      s.aBuf = 0;
      const was = s.level;
      s.level = hit ? Math.min(3, s.level + 1) : wob ? 0 : Math.max(0, s.level - 1);
      s.dip = clamp(impact / 900, 0.4, 1.2);
      a.squash(0.22 + s.level * 0.04);
      snd('ac-boing', 'rubber-bounce', { vol: this.n > 4 ? 0.3 : 0.45, semi: s.level * 2 });
      const feet = this.toScreen(st, a.x, bedY);
      if (!live) {
        // the act is over: settle down with smaller and smaller bounces
        if (s.level === 0 && impact < 700) { s.stopped = true; s.vz = 0; a.setPose('idle'); a.playOnce('bow', 0.9, 'idle'); return; }
        s.level = Math.max(0, Math.min(s.level, was - 1));
      }
      if (hit && s.level > was) {
        particles.ring(feet.x, feet.y, st.p.color, 90 * st.k, 0.35);
        particles.burst(feet.x, feet.y, { type: 'spark', count: 8, colors: [GOLD, '#fff'] });
        if (s.level === 3) particles.popText(feet.x, feet.y - 30 * st.k, 'Sky high!', '#ffffff', 32);
      }
      s.vz = Math.sqrt(2 * G * TRAMP_H[s.level]);
      st.air = newAir(a, a.x, bedY);
      s.decided = false; s.decide = rand(20, 75);
      if (st.p.isAI && live) st.plan = planTrick(st.p, (2 * s.vz) / G);
    }
    a.z = s.z;
    a.y = bedY + s.dip * 14;
  }

  // --- Act 2: flying trapeze -------------------------------------------------
  barAngle(st, i) { const s = st.s; return s.amp * Math.sin(s.ph + (i ? Math.PI : 0)); }
  barPos(st, i) {
    const s = st.s, th = this.barAngle(st, i);
    return { x: s.px[i] + s.L * Math.sin(th), y: s.py + s.L * Math.cos(th), ang: -th };
  }
  placeOnBar(st) {
    const s = st.s, a = st.actor, b = this.barPos(st, s.on);
    a.x = b.x; a.y = b.y - 7; a.z = 0;
    a.facing = s.on === 0 ? 1 : -1;
  }
  /** How good a leap from the current bar would be (0..1): best when it's swung toward the other bar. */
  leapQuality(st) {
    const s = st.s, dir = s.on === 0 ? 1 : -1;
    return (clamp((this.barAngle(st, s.on) * dir) / s.amp, -1, 1) + 1) / 2;
  }
  flyPath(st, dt) {
    const s = st.s, fl = s.fl, a = st.actor;
    fl.t += dt;
    const u = Math.min(1, fl.t / fl.T);
    const tgt = fl.bar !== undefined ? (() => { const b = this.barPos(st, fl.bar); return { x: b.x, y: b.y - 7 }; })() : fl.to;
    a.x = lerp(fl.from.x, tgt.x, u);
    a.y = lerp(fl.from.y, tgt.y, u) - fl.apex * 4 * u * (1 - u);
    return u;
  }

  updateTrapeze(st, dt, inp, live) {
    const s = st.s, a = st.actor, c = st.p.ctrl;
    s.ph += dt * 2.25;
    s.sag = Math.max(0, s.sag - dt * 2.5);
    const netY = st.floor - NET_UP;
    st.pivot = 'center'; st.rot = 0;
    if (s.mode === 'bar') {
      s.onT += dt;
      this.placeOnBar(st);
      st.pivot = 'feet'; st.rot = this.barPos(st, s.on).ang;
      if (!a._once) a.setPose('balance');
      if (live && c.pressed('a') && s.onT > 0.4) {
        const q = this.leapQuality(st);
        const to = 1 - s.on;
        s.fl = { from: { x: a.x, y: a.y }, bar: to, T: 0.72 + 0.58 * q, t: 0, apex: 35 + 85 * q };
        s.mode = 'fly';
        st.air = newAir(a, a.x, a.y);
        a.squash(-0.25);
        sfx('whoosh', { vol: 0.4 });
        if (q > 0.82) { const h = this.toScreen(st, a.x, a.y - a.height * 1.2); particles.popText(h.x, h.y, 'Great leap!', '#ffffff', 30); }
        if (st.p.isAI) st.plan = planTrick(st.p, s.fl.T);
      }
    } else if (s.mode === 'fly') {
      const u = this.flyPath(st, dt);
      this.airEvents(st, updateAir(st.air, inp, dt, a, u < 0.5));
      recordAir(st.air, a.x, a.y, a, dt);
      st.rot = st.air.rot;
      if (u >= 1) {
        const off = Math.abs(wrapAngle(st.air.rot));
        if (off < 0.75) {
          s.mode = 'bar'; s.on = s.fl.bar; s.onT = 0; s.fl = null;
          this.land(st, { bonus: 2, bonusName: 'Catch' });
          snd('ac-catch', 'land', { vol: 0.5 });
          a.squash(0.25);
          this.placeOnBar(st);
        } else {
          const spin = st.air.rot;
          this.land(st, { clean: false });
          s.mode = 'drop'; s.vy = 60; s.vx = (s.fl.bar === 1 ? 1 : -1) * 70; s.bounces = 0; s.spin = spin;
          s.fl = null;
          snd('wheee-fall', 'whoosh', { vol: 0.35 });
          a.playOnce('tumble', 0.6, 'fall');
        }
      }
    } else if (s.mode === 'drop') {
      s.vy += G * dt; a.y += s.vy * dt; a.x = clamp(a.x + s.vx * dt, 40, st.vw - 40);
      s.spin = lerp(s.spin, Math.round(s.spin / TAU) * TAU, 1 - Math.exp(-4 * dt));
      st.rot = s.spin;
      if (a.y >= netY && s.vy > 0) {
        a.y = netY; s.sag = 1; s.sagX = a.x;
        s.vy = -Math.sqrt(2 * G * (s.bounces ? 50 : 105)); s.bounces++;
        this.wobble(st);
        if (s.bounces >= 2) {
          // the net springs you back up to the nearest bar
          const b0 = this.barPos(st, 0), b1 = this.barPos(st, 1);
          const to = Math.abs(b0.x - a.x) < Math.abs(b1.x - a.x) ? 0 : 1;
          s.mode = 'return'; s.fl = { from: { x: a.x, y: a.y }, bar: to, T: 0.9, t: 0, apex: 120 };
          a.playOnce('jump', 0.9);
          snd('ac-boing', 'rubber-bounce', { vol: 0.4, semi: 5 });
        }
      }
    } else if (s.mode === 'return') {
      const u = this.flyPath(st, dt);
      if (u >= 1) { s.mode = 'bar'; s.on = s.fl.bar; s.onT = 0; s.fl = null; sfx('land', { vol: 0.4 }); a.squash(0.2); this.placeOnBar(st); }
    }
  }

  // --- Act 3: tightrope ------------------------------------------------------
  updateRope(st, dt, inp, live) {
    const s = st.s, a = st.actor, c = st.p.ctrl;
    const netY = st.floor - NET_UP;
    s.sag = Math.max(0, s.sag - dt * 2.5);
    st.pivot = 'center'; st.rot = 0;
    if (s.mode === 'walk') {
      const tt = this.t;
      const drift = 0.5 * Math.sin(tt * 1.25 + s.ph) + 0.32 * Math.sin(tt * 2.7 + s.ph * 1.7);
      const stick = live ? inp.x : -clamp(s.lean * 2, -1, 1);
      s.leanV += (drift * 0.75 + s.lean * 0.35 - stick * 2.4) * dt;
      s.leanV *= Math.exp(-1.8 * dt);
      s.lean += s.leanV * dt;
      if (Math.abs(s.lean) > 0.6 && st.wobCD <= 0 && Math.abs(s.leanV) > 0.25) { snd('ac-wobble', 'tower-wobble', { vol: 0.3 }); st.wobCD = 1.2; a.emote('exclaim', 0.6); }
      if (Math.abs(s.lean) > 1) {
        s.mode = 'fall'; s.vy = -80; s.vx = Math.sign(s.lean) * 50; s.bounces = 0; s.spin = s.lean * 0.5;
        const h = this.toScreen(st, a.x, a.y - a.height);
        particles.popText(h.x, h.y, 'Whoa!', '#ffffff', 34);
        snd('crowd-gasp', null, { vol: 0.25 });
        a.playOnce('tumble', 0.7, 'fall');
      } else {
        const speed = live ? 52 * (1 - Math.min(0.6, Math.abs(s.lean) * 0.5)) : 0;
        s.x += s.dir * speed * dt;
        if ((s.dir > 0 && s.x >= s.xb - 24) || (s.dir < 0 && s.x <= s.xa + 24)) {
          s.dir = -s.dir; s.crossings++;
          const res = { clean: true, tricky: false, score: 3, name: 'All the way across', rec: null };
          this.award(st, res);
          a.playOnce('strike3', 0.8, 'balance');
          snd('ac-tada', 'star', { vol: 0.35 });
        }
        a.x = s.x; a.y = s.y; a.z = 0;
        if (!a._once) { a.facing = s.dir; a.setPose(live ? 'balance' : 'idle'); }
        st.pivot = 'feet'; st.rot = s.lean * 0.5;
        if (live && c.pressed('a')) {
          s.mode = 'hop'; s.z = 0; s.vz = Math.sqrt(2 * G * 118);
          st.air = newAir(a, a.x, a.y);
          a.squash(-0.2); sfx('jump', { vol: 0.35 }); s.sag = 0.8;
          if (st.p.isAI) st.plan = planTrick(st.p, (2 * s.vz) / G);
        }
      }
    } else if (s.mode === 'hop') {
      s.vz -= G * dt; s.z += s.vz * dt;
      s.lean *= Math.exp(-3 * dt); s.leanV *= Math.exp(-3 * dt);
      this.airEvents(st, updateAir(st.air, inp, dt, a, s.vz > 0));
      recordAir(st.air, a.x, s.y - s.z, a, dt);
      a.z = Math.max(0, s.z); st.rot = st.air.rot;
      if (s.z <= 0 && s.vz < 0) {
        s.z = 0; a.z = 0;
        const res = this.land(st);
        if (res.clean) { s.mode = 'walk'; s.lean = rand(-0.12, 0.12); s.leanV = 0; s.sag = 1; a.squash(0.25); sfx('land', { vol: 0.35 }); }
        else { s.mode = 'fall'; s.vy = 40; s.vx = rand(-40, 40); s.bounces = 0; s.spin = st.rot; a.playOnce('tumble', 0.7, 'fall'); snd('wheee-fall', 'whoosh', { vol: 0.3 }); }
      }
    } else if (s.mode === 'fall') {
      s.vy += G * dt; a.y += s.vy * dt; a.x = clamp(a.x + s.vx * dt, s.xa + 10, s.xb - 10);
      s.spin = lerp(s.spin, Math.round(s.spin / TAU) * TAU, 1 - Math.exp(-4 * dt));
      st.rot = s.spin;
      if (a.y >= netY && s.vy > 0) {
        a.y = netY; s.sag = 1.2;
        s.vy = -Math.sqrt(2 * G * (s.bounces ? 45 : 95)); s.bounces++;
        this.wobble(st);
        if (s.bounces >= 2) {
          s.x = clamp(a.x, s.xa + 30, s.xb - 30);
          s.mode = 'return'; s.fl = { from: { x: a.x, y: a.y }, to: { x: s.x, y: s.y }, T: 0.85, t: 0, apex: 90 };
          a.playOnce('jump', 0.85);
          snd('ac-boing', 'rubber-bounce', { vol: 0.4, semi: 5 });
        }
      }
    } else if (s.mode === 'return') {
      const u = this.flyPath(st, dt);
      if (u >= 1) { s.mode = 'walk'; s.lean = 0; s.leanV = 0; a.squash(0.2); sfx('land', { vol: 0.35 }); s.sag = 1; }
    }
  }

  // --- Act 4: ball balance ---------------------------------------------------
  updateBall(st, dt, inp, live) {
    const s = st.s, a = st.actor, c = st.p.ctrl, R = s.R;
    const top = st.floor - 2 * R;
    // the ball
    if (s.mode === 'ride' && live) s.bvx += inp.x * 600 * dt;
    s.bvx *= Math.exp(-(s.mode === 'ride' ? 1.3 : 0.7) * dt);
    s.bvx = clamp(s.bvx, -290, 290);
    s.bx += s.bvx * dt;
    if (s.bx < R + 8) { s.bx = R + 8; s.bvx = Math.abs(s.bvx) * 0.5; if (Math.abs(s.bvx) > 40) sfx('bounce', { vol: 0.25 }); }
    if (s.bx > st.vw - R - 8) { s.bx = st.vw - R - 8; s.bvx = -Math.abs(s.bvx) * 0.5; if (Math.abs(s.bvx) > 40) sfx('bounce', { vol: 0.25 }); }
    s.rot += (s.bvx / R) * dt;
    // balloons
    for (const b of s.balloons) {
      b.ph += dt;
      if (!b.alive) { b.respawn -= dt; if (b.respawn <= 0) { Object.assign(b, this.newBalloon(st, b.ci + 1)); b.pop = 0; b.grow = 0; } }
      b.grow = Math.min(1, (b.grow ?? 1) + dt * 3);
    }
    st.pivot = 'center'; st.rot = 0;
    if (s.mode === 'ride') {
      a.x = s.bx; a.y = top; a.z = 0;
      if (!a._once) {
        if (Math.abs(s.bvx) > 30) { a.moveAnim(s.bvx, 0, 290); } else { a.setPose('balance'); a.speed = 0; }
      }
      st.pivot = 'feet'; st.rot = clamp(s.bvx / 290, -1, 1) * 0.12;
      if (live && c.pressed('a')) {
        s.mode = 'air'; s.z = 0; s.vz = Math.sqrt(2 * G * 185);
        st.air = newAir(a, a.x, a.y);
        a.squash(-0.25); snd('ac-boing', 'rubber-bounce', { vol: 0.35, semi: 3 });
        if (st.p.isAI) st.plan = planTrick(st.p, (2 * s.vz) / G);
      }
    } else if (s.mode === 'air') {
      s.vz -= G * dt; s.z += s.vz * dt;
      a.x = s.bx; a.y = top; a.z = Math.max(0, s.z);
      this.airEvents(st, updateAir(st.air, inp, dt, a, s.vz > 0));
      recordAir(st.air, a.x, top - s.z, a, dt);
      st.rot = st.air.rot;
      const cx = a.x, cy = top - s.z - a.height * 0.5;
      for (const b of s.balloons) {
        if (!b.alive) continue;
        const by = b.y + Math.sin(b.ph * 1.6) * 6;
        if (Math.hypot(b.x - cx, by - cy) < 30 + a.height * 0.34) {
          b.alive = false; b.respawn = 1.4; st.air.pops++;
          const p = this.toScreen(st, b.x, by);
          particles.burst(p.x, p.y, { type: 'confetti', count: 16, speed: [120, 360], colors: [BALLOON_COLORS[b.ci][1], '#fff', GOLD] });
          particles.burst(p.x, p.y, { type: 'shard', count: 6, colors: [BALLOON_COLORS[b.ci][1]], speed: [120, 260] });
          particles.popText(p.x, p.y - 20, 'Pop!', '#ffffff', 34);
          snd('ac-pop', 'bigpop', { vol: 0.45 });
        }
      }
      if (s.z <= 0 && s.vz < 0) {
        s.z = 0; a.z = 0;
        const res = this.land(st);
        if (res.clean) { s.mode = 'ride'; a.squash(0.25); sfx('land', { vol: 0.35 }); }
        else {
          const side = Math.sign(s.bvx) || (st.i % 2 ? -1 : 1);
          const tx = clamp(s.bx - side * (R + 50), 50, st.vw - 50);
          s.mode = 'slip'; s.fl = { from: { x: a.x, y: a.y }, to: { x: tx, y: st.floor }, T: 0.5, t: 0, apex: 40 };
          a.playOnce('tumble', 0.5, 'dizzy');
          snd('wheee-fall', 'whoosh', { vol: 0.3 });
        }
      }
    } else if (s.mode === 'slip') {
      const u = this.flyPath(st, dt);
      st.rot = Math.sin(u * Math.PI) * 1.2;
      if (u >= 1) { s.mode = 'sit'; s.slipT = 0.8; this.wobble(st); }
    } else if (s.mode === 'sit') {
      s.slipT -= dt;
      if (s.slipT <= 0) { s.mode = 'back'; s.fl = { from: { x: a.x, y: a.y }, to: { x: s.bx, y: top }, T: 0.55, t: 0, apex: 70 }; a.playOnce('jump', 0.55); sfx('jump', { vol: 0.3 }); }
    } else if (s.mode === 'back') {
      s.fl.to.x = s.bx;
      const u = this.flyPath(st, dt);
      if (u >= 1) { s.mode = 'ride'; a.squash(0.2); sfx('land', { vol: 0.3 }); }
    }
  }

  // --- CPU acrobats ----------------------------------------------------------
  aiAct(st, dt) {
    const s = st.s, p = st.p, c = p.ctrl, lvl = p.aiLevel || 0;
    if (this.act.id === 'tramp') {
      // time the A press for the landing (the trick plan drives the stick)
      if (s.vz < 0 && !s.decided && s.z < s.decide) {
        s.decided = true;
        if (chance([0.72, 0.85, 0.95][lvl])) c.press('a');
      }
      return;
    }
    if (st.air) return;   // in the air the trick plan drives the stick
    switch (this.act.id) {
      case 'trapeze':
        c.move(0, 0);
        if (s.mode === 'bar' && s.onT > s.aiWait) {
          if (this.leapQuality(st) > Math.min(0.95, s.aiQ) || s.onT > 4.5) { c.press('a'); s.aiWait = rand(0.5, 1.8) / aiProfile(p).speed; s.aiQ = rand(0.45, 0.8) + lvl * 0.08; }
        }
        break;
      case 'rope':
        if (s.mode !== 'walk') { c.move(0, 0); break; }
        s.aiT -= dt;
        if (s.aiT <= 0) {
          s.aiT = [rand(0.18, 0.34), rand(0.12, 0.24), rand(0.08, 0.15)][lvl];
          const err = rand(-1, 1) * [0.35, 0.2, 0.08][lvl];
          s.aiX = clamp(s.lean * 2.1 + s.leanV * 0.9 + err, -1, 1);
          if (Math.abs(s.lean) < 0.08 && Math.abs(s.leanV) < 0.1) s.aiX *= 0.3;
        }
        c.move(s.aiX, 0);
        s.hopCD -= dt;
        if (s.hopCD <= 0 && Math.abs(s.lean) < 0.25 && Math.abs(s.leanV) < 0.3) { c.press('a'); s.hopCD = rand(2.2, 4.5); }
        break;
      case 'ball': {
        if (s.mode !== 'ride') { c.move(0, 0); break; }
        s.aiT -= dt;
        if (!s.aiTarget || !s.aiTarget.alive || s.aiT <= 0) {
          s.aiT = rand(1.5, 3);
          const alive = s.balloons.filter((b) => b.alive);
          s.aiTarget = alive.length ? alive.reduce((best, b) => (Math.abs(b.x - s.bx) + rand(0, 80) < Math.abs(best.x - s.bx) ? b : best), alive[0]) : null;
        }
        const tx = s.aiTarget ? s.aiTarget.x : st.vw / 2 + Math.sin(this.t * 0.5 + st.i) * st.vw * 0.3;
        const dx = tx - s.bx;
        const want = clamp(dx / 90, -1, 1) * aiProfile(p).speed;
        c.move(clamp(want - s.bvx / 400, -1, 1), 0);
        s.hopCD -= dt;
        if (s.aiTarget && Math.abs(dx) < 28 && Math.abs(s.bvx) < 150 && s.hopCD <= 0) { c.press('a'); s.hopCD = reactionTime(p) + 0.4; }
        else if (!s.aiTarget && s.hopCD <= 0 && chance(dt * 0.6)) { c.press('a'); s.hopCD = 1.5; }
        break;
      }
    }
  }

  // =========================================================================
  // The human pyramid (shared big ring, screen px)
  startPyramid() {
    if (this.phase === 'pyramid' || this.phase === 'show') return;
    this.phase = 'pyramid'; this.pt = 0;
    const n = this.n;
    const sc = n >= 7 ? 0.84 : n >= 5 ? 0.92 : 1.05;
    this.glimmer.x = 250; this.glimmer.y = 420; this.glimmer.facing = 1;
    this.glimmer.say('Human pyramid!', 2.4, null);
    sfx('whistle', { vol: 0.5 });
    // biggest (and groups) at the bottom, littlest on top
    const order = shuffle([...this.stations]).sort((a, b) => {
      const ga = a.actor.char.members.length > 1 ? 1000 : 0, gb = b.actor.char.members.length > 1 ? 1000 : 0;
      return (gb + b.actor.leader.h) - (ga + a.actor.leader.h);
    });
    const slots = [];
    const sp = (n >= 7 ? 196 : 206) * sc / 0.9;
    if (n <= 2) {
      const tr = new Actor('troll', { scale: 0.82, x: W / 2, y: FLOOR, facing: 1 });
      tr.snap(); tr.setPose('stomp-giant');
      this.troll = { actor: tr, isTroll: true, placed: true };
      const h = tr.height;
      if (n === 1) slots.push({ row: 1, x: W / 2, fixedY: FLOOR - h * 0.95 + 6, sup: [] });
      else for (const sx of [-1, 1]) slots.push({ row: 1, x: W / 2 + sx * h * 0.33, fixedY: FLOOR - h * 0.72, sup: [] });
    } else {
      this.troll = null;
      const rows = ROWS[n];
      let prev = null;
      rows.forEach((m, j) => {
        const step = j > 0 && m < prev.length - 1 && m > 1 ? sp * 2 : sp;
        const row = [];
        for (let i = 0; i < m; i++) {
          const x = W / 2 + (i - (m - 1) / 2) * step;
          const sup = prev ? prev.filter((o) => Math.abs(o.x - x) < sp * 0.8) : [];
          row.push({ row: j, x, sup });
        }
        slots.push(...row); prev = row;
      });
    }
    this.slots = slots;
    // everyone starts on the ring floor at the sides
    const left = [], right = [];
    order.forEach((st, i) => (i % 2 ? right : left).push(st));
    const place = (list, side) => list.forEach((st, j) => {
      const a = st.actor;
      a.scale = sc; a.z = 0; a.alpha = 1; a.setPose('idle'); a.speed = 0;
      a.x = side < 0 ? 120 + j * 130 : W - 120 - j * 130; a.y = FLOOR + (j % 2) * 18;
      a.facing = -side; a.snap();
    });
    place(left, -1); place(right, 1);
    order.forEach((st, i) => {
      const slot = slots[i];
      slot.st = st;
      st.air = null; st.plan = null; st.rot = 0; st.pivot = 'center'; st.label = null;
      if (st.p.isAI) endTrick(st.p);
      st.py = { slot, mode: 'wait', z: 0, vz: 0, fl: null, openT: 0, aiDelay: rand(0.5, 1.4) / aiProfile(st.p).speed + i * 0.15, home: { x: st.actor.x, y: st.actor.y } };
    });
    this.pyr = { doneT: -1, flashed: false, tumbleT: -1 };
  }

  slotOpen(slot) { return slot.sup.every((o) => o.st && o.st.py.mode === 'placed'); }
  slotY(slot) {
    if (slot.fixedY !== undefined) return slot.fixedY;
    if (!slot.sup.length) return FLOOR + (slot.row === 0 ? 0 : 0);
    let sum = 0;
    for (const o of slot.sup) {
      const a = o.st.actor;
      sum += this.slotY(o) - a.height * (a.leader.top ?? 0.92) + 8;
    }
    return sum / slot.sup.length;
  }
  slotSway(slot) { return Math.sin(this.t * 2.1) * slot.row * 4; }

  updatePyramid(dt) {
    this.pt += dt;
    const P = this.pyr;
    if (this.troll) this.troll.actor.update(dt);
    for (const st of this.stations) {
      const a = st.actor, q = st.py, c = st.p.ctrl, slot = q.slot;
      a.update(dt);
      if (st.label) st.label.t += dt;
      if (q.mode === 'wait') {
        const open = this.pt > 1.6 && this.slotOpen(slot);
        if (open) q.openT += dt;
        let mx = 0, jump = false;
        if (st.p.isAI) {
          if (open && q.openT > q.aiDelay) jump = true;
          else if (!open && chance(dt * 0.25) && q.z <= 0) { c.press('a'); }
        } else { mx = c.x; jump = c.pressed('a'); }
        if (st.plan && st.air) playTrick(st.p, st.plan, dt);
        if (open && (jump || q.openT > 7) && q.z <= 0) { this.pyrLeap(st); continue; }
        // on the floor: walk about, hop for fun (with tricks!)
        if (q.z <= 0) {
          a.x = clamp(a.x + mx * 330 * dt, 80, W - 80);
          if (!a._once) a.moveAnim(mx * 330, 0, 330);
          if (open) a.facing = Math.sign(slot.x - a.x) || 1;
          if (c.pressed('a') && !open) {
            q.vz = Math.sqrt(2 * 2600 * 170); q.z = 0.01;
            st.air = newAir(a, a.x, a.y);
            sfx('jump', { vol: 0.3 });
            if (st.p.isAI) st.plan = planTrick(st.p, (2 * q.vz) / 2600);
          }
        } else {
          q.vz -= 2600 * dt; q.z += q.vz * dt;
          if (st.air) { this.airEvents(st, updateAir(st.air, airInput(c), dt, a, q.vz > 0)); recordAir(st.air, a.x, a.y - q.z, a, dt); st.rot = st.air.rot; }
          if (q.z <= 0) {
            q.z = 0; q.vz = 0; st.rot = 0;
            const res = this.landPyr(st);
            if (res && !res.clean) this.wobble(st); else { a.squash(0.2); }
          }
        }
        a.z = Math.max(0, q.z);
      } else if (q.mode === 'leap') {
        const fl = q.fl;
        fl.t += dt;
        const u = Math.min(1, fl.t / fl.T);
        const ty = this.slotY(slot);
        a.x = lerp(fl.from.x, slot.x + this.slotSway(slot), u);
        a.y = lerp(fl.from.y, ty, u) - fl.apex * 4 * u * (1 - u);
        a.z = 0;
        if (st.plan && st.air) playTrick(st.p, st.plan, dt);
        if (st.air) { this.airEvents(st, updateAir(st.air, airInput(c), dt, a, u < 0.5)); recordAir(st.air, a.x, a.y, a, dt); st.rot = st.air.rot; }
        if (u >= 1) {
          q.mode = 'placed'; st.rot = 0;
          const res = this.landPyr(st, { bonus: 1, bonusName: slot.row > 0 || this.troll ? 'Pyramid' : null });
          a.facing = slot.x < W / 2 - 10 ? 1 : slot.x > W / 2 + 10 ? -1 : (st.i % 2 ? -1 : 1);
          a.setPose(slot.row === 0 && !this.troll ? 'stomp-giant' : 'balance');
          if (res && !res.clean) a.playOnce('dizzy', 0.6); else a.playOnce('ready', 0.5);
          a.squash(0.3);
          snd('ac-stack', 'stomp', { vol: 0.5 });
          particles.burst(a.x, a.y, { type: 'dust', count: 8 });
          const sups = this.troll && slot.row === 1 ? [this.troll] : slot.sup.map((o) => o.st);
          for (const o of sups) { const oa = o.actor; oa.squash(0.25); if (!o.isTroll) oa.playOnce('surprised', 0.35); }
          if (this.troll && slot.row === 1) this.troll.actor.playOnce('ready', 0.5, 'stomp-giant');
        }
      } else if (q.mode === 'placed') {
        a.x = slot.x + this.slotSway(slot); a.y = this.slotY(slot); a.z = 0;
        if (P.doneT >= 0 && P.tumbleT < 0) {
          const pose = st.p.isAI ? null : photoPosePressed(c);
          q.poseCD = (q.poseCD || 0) - dt;
          if (pose && q.poseCD <= 0 && pose.btn !== 'a') { q.poseCD = 0.35; strikePhotoPose(a, pose); }
          if (st.p.isAI && chance(dt * 0.7)) strikePhotoPose(a, randomPhotoPose());
        }
      } else if (q.mode === 'tumble') {
        const fl = q.fl;
        fl.t += dt;
        if (fl.t < 0) { a.x = slot.x + this.slotSway(slot); a.y = this.slotY(slot); continue; }
        const u = Math.min(1, fl.t / fl.T);
        if (!fl.from) { fl.from = { x: a.x, y: a.y }; a.playOnce('tumble', fl.T, 'fall'); }
        a.x = lerp(fl.from.x, fl.to.x, u);
        a.y = lerp(fl.from.y, fl.to.y, u) - fl.apex * 4 * u * (1 - u);
        st.rot = fl.spin * ease.inOutQuad(u);
        if (u >= 1) { q.mode = 'down'; st.rot = 0; a.squash(0.3); a.playOnce('dizzy', 0.8, 'cheer'); snd('ac-boing', 'rubber-bounce', { vol: 0.35 }); particles.burst(a.x, a.y, { type: 'dust', count: 8 }); }
      }
    }
    // all stacked: ta-da, pose, snap, tumble
    if (P.doneT < 0 && this.stations.every((st) => st.py.mode === 'placed')) {
      P.doneT = 0;
      snd('jingle/showstopper', 'fanfare', { vol: 0.7 });
      snd('applause', 'cheer', { vol: 0.7 });
      particles.confettiRain(W, 140);
      this.crowd = 1;
      fx.flash('#fff6d0', 0.2);
      for (const st of this.stations) { st.actor.playOnce('strike3', 0.9); st.actor.emote('star', 1.2); }
      if (this.troll) { this.troll.actor.playOnce('cheer', 0.8, 'stomp-giant'); snd('npc/troll/laugh', null, { vol: 0.5 }); }
      this.glimmer.say('Strike a pose!', 2.2, null);
    }
    if (P.doneT >= 0) {
      P.doneT += dt;
      this.crowd = Math.max(this.crowd, 0.6);
      if (!P.flashed && P.doneT > POSE_TIME) {
        P.flashed = true;
        snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.4);
        particles.burst(W / 2, 500, { type: 'sparkle', count: 30, speed: [200, 600] });
      }
      if (P.tumbleT < 0 && P.doneT > POSE_TIME + 0.8) {
        P.tumbleT = 0;
        snd('wheee-fall', 'whoosh', { vol: 0.5 });
        // top first: everyone tumbles down into a happy heap at their start spots
        const maxRow = Math.max(...this.slots.map((s) => s.row));
        for (const st of this.stations) {
          const q = st.py;
          q.mode = 'tumble';
          q.fl = { t: -(maxRow - q.slot.row) * 0.22, T: 0.75, apex: 110, to: { x: q.home.x, y: FLOOR + (st.i % 2) * 14 }, spin: (q.slot.x < W / 2 ? -1 : 1) * TAU, from: null };
        }
      }
      if (P.tumbleT >= 0) {
        P.tumbleT += dt;
        if (P.tumbleT > 2.4) this.startShow();
      }
    }
  }

  pyrLeap(st) {
    const a = st.actor, q = st.py, slot = q.slot;
    const ty = this.slotY(slot);
    const rise = Math.max(0, a.y - ty);
    q.mode = 'leap';
    q.fl = { from: { x: a.x, y: a.y - q.z }, t: 0, T: 0.75 + Math.min(0.45, rise / 700), apex: 90 + rise * 0.35 };
    q.z = 0; a.z = 0;
    st.air = newAir(a, a.x, a.y);
    a.squash(-0.25);
    sfx('jump', { vol: 0.4 });
    if (st.p.isAI) st.plan = planTrick(st.p, q.fl.T);
  }

  landPyr(st, extra) {
    const air = st.air;
    st.air = null; st.plan = null;
    if (st.p.isAI) endTrick(st.p);
    if (!air) return null;
    const res = judge(air, st.actor.facing, extra);
    const a = st.actor;
    if (res.score > 0) {
      st.claps += res.score;
      if (res.rec && res.rec.length > 4 && (!st.best || res.score >= st.best.score)) st.best = { score: res.score, name: res.name, rec: res.rec, act: 'pyramid', clean: res.clean };
      particles.popText(a.x, a.y - a.height * 1.1, `+${res.score}`, GOLD, 44);
      if (res.name && (res.tricky || res.score > 1)) st.label = { text: res.name + '!', t: 0, color: st.p.color };
      if (this.clapCD <= 0) { snd('ac-clap', 'yay', { vol: 0.35 }); this.clapCD = 0.5; }
      this.crowd = Math.min(1, this.crowd + res.score * 0.05);
    }
    return res;
  }

  // =========================================================================
  // The finale show: each acrobat's best trick, replayed under a spotlight
  startShow() {
    if (this.phase === 'show') return;
    if (this.phase !== 'pyramid') this.startPyramid();
    this.phase = 'show'; this.sht = 0;
    const per = this.n >= 5 ? 2 : 1;
    const order = [...this.stations];
    const groups = [];
    for (let i = 0; i < order.length; i += per) groups.push(order.slice(i, i + per));
    const spots = per === 1 ? [W / 2] : [W * 0.34, W * 0.66];
    // the crowd of acrobats waits along the sides, clapping
    this.stations.forEach((st, i) => {
      const a = st.actor;
      a.scale = this.n >= 5 ? 0.8 : 0.92; a.z = 0; st.rot = 0; st.air = null; st.plan = null; st.label = null;
      if (st.p.isAI) endTrick(st.p);
      const side = i % 2 ? 1 : -1, j = Math.floor(i / 2);
      st.home = { x: side < 0 ? 100 + j * 92 : W - 100 - j * 92, y: FLOOR + 20 + (j % 2) * 16 };
      a.x = st.home.x; a.y = st.home.y; a.facing = -side; a.setPose('clap'); a.snap();
      if (!st.best) st.best = { score: 1, name: 'Big Bounce', rec: syntheticBounce(), act: 'tramp', clean: true };
      st.sh = null;
    });
    this.show = { groups, gi: -1, gt: 0, spots, bowT: -1, ts: per === 1 ? 2.1 : 1.6, span: per === 1 ? 280 : 140 };
    if (this.troll) { this.troll.actor.x = W - 150; this.troll.actor.y = FLOOR - 10; this.troll.actor.facing = -1; this.troll.actor.setPose('clap'); this.troll.actor.scale = 0.7; this.troll.actor.snap(); }
    this.glimmer.x = 240; this.glimmer.y = 470; this.glimmer.facing = 1;
    this.glimmer.say('The finale show!', 2.2, null);
    sfx('drumroll', { vol: 0.5 });
    this.nextGroup();
  }

  nextGroup() {
    const S = this.show;
    // the last group hops back to the sides
    if (S.gi >= 0) for (const st of S.groups[S.gi]) { st.sh = { mode: 'exit', t: 0, from: { x: st.actor.x, y: st.actor.y } }; }
    S.gi++; S.gt = 0;
    if (S.gi >= S.groups.length) { this.startBow(); return; }
    S.groups[S.gi].forEach((st, j) => {
      const a = st.actor;
      st.sh = { mode: 'enter', t: 0, from: { x: a.x, y: a.y }, spot: S.spots[j], fi: 0, z: 0, vz: 0, scale: this.n >= 5 ? 1.0 : 1.12 };
      sfx('jump', { vol: 0.4 });
    });
  }

  startBow() {
    const S = this.show;
    S.bowT = 0;
    const n = this.n, gap = Math.min(220, 1500 / n);
    this.stations.forEach((st, i) => {
      const a = st.actor;
      st.sh = { mode: 'line', t: -i * 0.06, from: { x: a.x, y: a.y }, to: { x: W / 2 + (i - (n - 1) / 2) * gap, y: FLOOR }, T: 0.7 };
    });
  }

  updateShow(dt) {
    this.sht += dt;
    const S = this.show;
    S.gt += dt;
    if (this.troll) this.troll.actor.update(dt);
    for (const st of this.stations) {
      const a = st.actor, sh = st.sh;
      a.update(dt);
      if (!sh) continue;
      sh.t += dt;
      if (sh.mode === 'enter') {
        const T = 0.7, u = Math.min(1, sh.t / T);
        const bedY = FLOOR - TRAMP_BED * this.show.ts;
        a.scale = lerp(a.scale, sh.scale, u);
        a.x = lerp(sh.from.x, sh.spot, u); a.y = lerp(sh.from.y, bedY, u) - 180 * 4 * u * (1 - u);
        a.facing = Math.sign(sh.spot - sh.from.x) || 1;
        if (!a._once) a.setPose('jump');
        if (u >= 1) { sh.mode = 'pre'; sh.t = 0; a.y = bedY; a.squash(0.3); snd('ac-boing', 'rubber-bounce', { vol: 0.4 }); sh.dip = 1; }
      } else if (sh.mode === 'pre') {
        // two little warm-up bounces
        const bedY = FLOOR - TRAMP_BED * this.show.ts;
        const T = 0.38, k = Math.floor(sh.t / T), f = (sh.t % T) / T;
        a.y = bedY; a.z = Math.sin(f * Math.PI) * 50;
        a.setPose(f < 0.5 ? 'jump' : 'fall');
        sh.dip = Math.max(0, (sh.dip || 0) - dt * 4);
        if (k > sh.k0) { a.squash(0.2); sh.dip = 0.7; snd('ac-boing', 'rubber-bounce', { vol: 0.3, semi: k * 2 }); }
        sh.k0 = k;
        if (sh.t >= T * 2) {
          sh.mode = 'play'; sh.t = 0; a.z = 0; sh.dip = 1;
          const rec = st.best.rec;
          sh.endDx = rec.length ? rec[rec.length - 1][0] : 0;
          sh.facing0 = rec.length ? rec[0][5] : 1;
          a.squash(0.3);
          snd('ac-boing', 'rubber-bounce', { vol: 0.45, semi: 6 });
          const c = { x: sh.spot, y: bedY - 120 };
          particles.ring(c.x, c.y + 120, st.p.color, 160, 0.4);
        }
      } else if (sh.mode === 'play') {
        const rec = st.best.rec, bedY = FLOOR - TRAMP_BED * this.show.ts, h = a.height;
        sh.dip = Math.max(0, (sh.dip || 0) - dt * 4);
        const fi = Math.min(rec.length - 1, Math.floor(sh.t * 30));
        const fr = rec[fi];
        const span = this.show.span;
        a.x = sh.spot + clamp((fr[0] - sh.endDx / 2) * h, -span, span);
        a.y = bedY; a.z = clamp(fr[1] * h, 0, 470) + 10;
        st.rot = fr[2]; st.tw = fr[3];
        a.facing = fr[5] || 1;
        if (fr[4] && a.pose !== fr[4] && !a._once) a.setPose(fr[4]);
        if (fi >= rec.length - 1) {
          sh.mode = 'fall'; sh.vz = 0; sh.t = 0;
          st.rot = Math.round(st.rot / TAU) * TAU; st.tw = 1;
        }
      } else if (sh.mode === 'fall') {
        const bedY = FLOOR - TRAMP_BED * this.show.ts;
        sh.vz -= 2600 * dt; a.z = Math.max(0, a.z + sh.vz * dt); a.y = bedY;
        st.rot = 0;
        if (!a._once) a.setPose('fall');
        if (a.z <= 0) {
          sh.mode = 'tada'; sh.t = 0; sh.dip = 1;
          a.squash(0.35); a.playOnce('strike3', 1.2, 'celebrate');
          snd('ac-tada', 'star', { vol: 0.5 });
          if (this.bigClapCD <= 0) { snd('applause', 'cheer', { vol: 0.6 }); this.bigClapCD = 1.6; }
          particles.burst(a.x, a.y - a.height, { type: 'confetti', count: 40, speed: [250, 600] });
          particles.burst(a.x, a.y - a.height * 0.6, { type: 'star', count: 10 });
          this.crowd = 1;
          a.say(pick(CHEERS), 1.2, st.p.isAI ? null : 'woo');
        }
      } else if (sh.mode === 'tada') {
        sh.dip = Math.max(0, (sh.dip || 0) - dt * 4);
      } else if (sh.mode === 'exit') {
        const T = 0.6, u = Math.min(1, sh.t / T);
        a.scale = lerp(a.scale, this.n >= 5 ? 0.8 : 0.92, u);
        a.x = lerp(sh.from.x, st.home.x, u); a.y = lerp(sh.from.y, st.home.y, u) - 140 * 4 * u * (1 - u); a.z = 0;
        st.rot = 0; st.tw = 1;
        if (u >= 1) { st.sh = null; a.setPose('clap'); a.facing = st.home.x < W / 2 ? 1 : -1; }
      } else if (sh.mode === 'line') {
        if (sh.t < 0) continue;
        const u = Math.min(1, sh.t / sh.T);
        a.scale = lerp(a.scale, this.n >= 5 ? 0.85 : 1, u);
        a.x = lerp(sh.from.x, sh.to.x, u); a.y = lerp(sh.from.y, sh.to.y, u) - 120 * 4 * u * (1 - u); a.z = 0;
        st.rot = 0; st.tw = 1;
        if (u >= 1) { sh.mode = 'bow'; a.setPose('idle'); a.facing = 1; sh.poseCD = 0; }
      } else if (sh.mode === 'bow') {
        const c = st.p.ctrl;
        sh.poseCD -= dt;
        const pose = st.p.isAI ? null : photoPosePressed(c);
        if (pose && sh.poseCD <= 0 && S.bowT > 1.6) { sh.poseCD = 0.35; strikePhotoPose(a, pose); }
        if (st.p.isAI && S.bowT > 2 && chance(dt * 0.6)) strikePhotoPose(a, randomPhotoPose());
      }
    }
    if (S.bowT < 0) {
      const grp = S.groups[S.gi];
      if (grp && grp.every((st) => st.sh && st.sh.mode === 'tada' && st.sh.t > 1.5)) this.nextGroup();
    } else {
      S.bowT += dt;
      if (S.bowT > 0.9 && !S.bowed) {
        S.bowed = true;
        for (const st of this.stations) st.actor.playOnce('bow', 1.1, 'celebrate');
        if (this.troll) this.troll.actor.playOnce('bow', 1.1, 'clap');
        particles.confettiRain(W, 180);
        snd('applause', 'cheer', { vol: 0.8 }); sfx('fanfare', { vol: 0.5 });
        this.crowd = 1;
        this.glimmer.say('Bravo!', 2.5, null);
      }
      if (S.bowT > 5.2) this.finishGame();
    }
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((st) => {
      const b = st.best ? st.best.name : 'Big Bounce';
      return this.n > 4 ? `${st.claps} claps` : `${b} · ${st.claps} claps`;
    });
    this.api.finish({ showcase: true, highlight: null, stats, title: 'Bravo!', focus: { x: W / 2, y: FLOOR - 160, zoom: 1.05 } });
  }

  onDone() {
    if (this.phase === 'acts') this.startPyramid();
    else if (this.phase === 'pyramid') {
      if (this.pyr.doneT < 0) {
        for (const st of this.stations) if (st.py.mode !== 'placed') { st.py.mode = 'placed'; st.air = null; st.plan = null; if (st.p.isAI) endTrick(st.p); st.rot = 0; }
      } else this.startShow();
    } else if (this.show && this.show.bowT < 0) this.startBow();
    else this.finishGame();
  }

  destroy() {}

  // =========================================================================
  // Drawing
  draw(g) {
    drawBigTop(g, this.t, this.crowd);
    if (this.phase === 'acts') {
      for (const st of this.stations) this.drawStation(g, st);
      this.drawTopBar(g);
      this.drawActIntro(g);
    } else if (this.phase === 'pyramid') this.drawPyramid(g);
    else this.drawShow(g);
  }

  /** Draw an acrobat with flip rotation and twist. */
  drawAcrobat(g, st, opts = {}) {
    const a = st.actor;
    const rot = st.rot || 0;
    const tw = st.air ? twistScale(st.air) : (st.tw ?? 1);
    const px = a.x, py = st.pivot === 'feet' ? a.y - a.z : a.y - a.z - a.height * 0.5;
    g.save();
    g.translate(px, py);
    if (rot) g.rotate(rot);
    if (tw !== 1) g.scale(tw, 1);
    g.translate(-px, -py);
    a.draw(g, { shadow: false, ...opts });
    g.restore();
  }

  shadow(g, x, y, w, alpha = 0.22) {
    g.save(); g.globalAlpha = alpha; g.fillStyle = '#1b1030';
    g.beginPath(); g.ellipse(x, y, w, w * 0.22, 0, 0, TAU); g.fill(); g.restore();
  }

  drawStation(g, st) {
    const { r, k, vw, vh, floor, p } = st, a = st.actor, s = st.s, id = this.act.id;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 24); g.clip();
    g.translate(r.x, r.y); g.scale(k, k);
    drawStationRing(g, vw, vh, floor, this.t);
    const netY = floor - NET_UP;
    if (id === 'tramp') {
      const bedY = floor - TRAMP_BED;
      drawTrampoline(g, vw / 2, floor, 1, s.dip, p.color);
      this.shadow(g, a.x, bedY + s.dip * 14, 40 * Math.max(0.35, 1 - a.z / 320), 0.25);
      // "press A now!" glow as you come down
      if (!p.isAI && this.live && s.vz < 0 && a.z < 85) {
        g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 20);
        g.strokeStyle = GOLD; g.lineWidth = 5; g.beginPath(); g.ellipse(vw / 2, bedY + 4, 90, 16, 0, 0, TAU); g.stroke(); g.restore();
      }
      this.drawAcrobat(g, st);
      // power pips
      for (let j = 0; j < 3; j++) {
        g.save(); g.translate(vw / 2 - 40 + j * 40, floor + 18);
        g.globalAlpha = j < s.level ? 1 : 0.4;
        drawStarShape(g, 24, j < s.level ? GOLD : '#ffffff');
        g.restore();
      }
    } else if (id === 'trapeze') {
      drawNet(g, 34, vw - 34, netY, s.sag * 22, s.sagX, this.t);
      for (let i = 0; i < 2; i++) {
        const b = this.barPos(st, i), bw = Math.max(120, (s.mode === 'bar' && s.on === i ? a.width * 0.9 : 0));
        const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
        drawRope(g, s.px[i] - 10, s.py, b.x - (bw / 2 - 4) * ca, b.y - (bw / 2 - 4) * sa);
        drawRope(g, s.px[i] + 10, s.py, b.x + (bw / 2 - 4) * ca, b.y + (bw / 2 - 4) * sa);
        drawBar(g, b.x, b.y, b.ang, bw);
      }
      if (s.mode === 'drop' || s.mode === 'return') this.shadow(g, a.x, netY + 10, 34, 0.18);
      this.drawAcrobat(g, st);
      if (!p.isAI && this.live && s.mode === 'bar' && s.onT > 0.4 && this.leapQuality(st) > 0.75) {
        const t = this.barPos(st, 1 - s.on);
        g.save(); g.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 18);
        g.strokeStyle = GOLD; g.lineWidth = 5; g.beginPath(); g.arc(t.x, t.y - 4, 34, 0, TAU); g.stroke(); g.restore();
        ui.text(g, 'A!', a.x, a.y - a.height - 30, { size: 34, color: '#7dff8a', strokeWidth: 6 });
      }
    } else if (id === 'rope') {
      drawNet(g, 34, vw - 34, netY, s.sag * 20, a.x, this.t);
      drawTower(g, s.xa, floor, false);
      drawTower(g, s.xb, floor, true);
      // the rope dips under the walker
      const dipX = s.mode === 'walk' || s.mode === 'hop' ? a.x : vw / 2;
      const dip = (s.mode === 'walk' ? 9 : 3) + s.sag * 10;
      g.save(); g.lineCap = 'round';
      g.strokeStyle = NAVY; g.lineWidth = 6;
      g.beginPath(); g.moveTo(s.xa, s.y); g.quadraticCurveTo(dipX, s.y + dip * 2, s.xb, s.y); g.stroke();
      g.strokeStyle = '#f2d9a6'; g.lineWidth = 3; g.stroke();
      g.restore();
      if (s.mode === 'walk') {
        // the walker stands on the dipped rope
        const u = (a.x - s.xa) / (s.xb - s.xa);
        a.y = s.y + dip * 2 * 2 * u * (1 - u) * 0.95;
      }
      if (s.mode === 'fall') this.shadow(g, a.x, netY + 10, 30, 0.18);
      this.drawAcrobat(g, st);
      // balance meter
      this.drawBalance(g, st);
    } else if (id === 'ball') {
      for (const b of s.balloons) if (b.alive) drawBalloon(g, b.x, b.y + Math.sin(b.ph * 1.6) * 6, b.ci, this.t + b.ph, b.grow ?? 1);
      this.shadow(g, s.bx, floor + 2, s.R * 0.9, 0.25);
      drawBall(g, s.bx, floor - s.R, s.R, s.rot);
      if (s.mode === 'slip' || s.mode === 'sit' || s.mode === 'back') this.shadow(g, a.x, floor + 2, 30, 0.18);
      this.drawAcrobat(g, st);
    }
    // trick name
    if (st.label && st.label.t < 1.8) {
      const L = st.label, sc = ease.outBack(clamp(L.t / 0.3, 0, 1)), al = clamp((1.8 - L.t) / 0.4, 0, 1);
      g.save(); g.translate(vw / 2, 92); g.scale(sc, sc); g.globalAlpha = al;
      ui.fitText(g, L.text, 0, 0, { size: L.big ? 40 : 34, color: '#fff', stroke: NAVY, strokeWidth: 8, maxWidth: vw - 60 });
      g.restore();
    }
    g.restore();
    // frame
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 24);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = 5; g.strokeStyle = p.color; g.stroke();
    g.restore();
    this.drawStationHUD(g, st);
  }

  drawBalance(g, st) {
    const s = st.s;
    if (s.mode !== 'walk' || st.p.isAI && this.n > 2) return;
    const x = st.vw / 2, y = 150, R = 54;
    g.save();
    g.lineCap = 'round';
    g.lineWidth = 14; g.strokeStyle = NAVY;
    g.beginPath(); g.arc(x, y, R, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    const zones = [[1.15, 1.3, '#ff6f8f'], [1.3, 1.42, '#ffd23f'], [1.42, 1.58, '#5ddc6a'], [1.58, 1.7, '#ffd23f'], [1.7, 1.85, '#ff6f8f']];
    g.lineWidth = 9;
    for (const [a0, a1, c] of zones) { g.strokeStyle = c; g.beginPath(); g.arc(x, y, R, Math.PI * a0, Math.PI * a1); g.stroke(); }
    const ang = Math.PI * 1.5 + clamp(s.lean, -1, 1) * Math.PI * 0.35;
    g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * (R + 6), y + Math.sin(ang) * (R + 6)); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.lineWidth = 3; g.stroke();
    // push-this-way arrow
    if (Math.abs(s.lean) > 0.4 && !st.p.isAI) {
      const d = -Math.sign(s.lean), ax = x + d * (R + 40);
      g.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 14);
      g.fillStyle = '#7dff8a'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.moveTo(ax + d * 22, y - 18); g.lineTo(ax - d * 6, y - 38); g.lineTo(ax - d * 6, y - 26); g.lineTo(ax - d * 24, y - 26); g.lineTo(ax - d * 24, y - 10); g.lineTo(ax - d * 6, y - 10); g.lineTo(ax - d * 6, y + 2); g.closePath();
      g.fill(); g.stroke();
    }
    g.restore();
  }

  drawStationHUD(g, st) {
    const { r, p } = st;
    const small = r.w < 600;
    const s = small ? 0.78 : 1;
    // name chip
    const cw = 214 * s, ch = 62 * s, x = r.x + 12, y = r.y + 12;
    g.save();
    ui.panel(g, x, y, cw, ch, { r: ch / 2, fill: '#ffffff', stroke: p.color, lineWidth: 5, shadow: false });
    drawPortrait(g, p, x + ch / 2, y + ch / 2, ch * 0.4, { expr: st.clapBump > 0 ? 'happy' : 'neutral' });
    ui.text(g, p.tag, x + ch + 4, y + ch * 0.33, { size: 20 * s, color: p.color, align: 'left', strokeWidth: 4 });
    const bump = 1 + st.clapBump * 0.8;
    g.translate(x + ch + 4, y + ch * 0.7); g.scale(bump, bump);
    ui.text(g, `${st.claps}`, 0, 0, { size: 26 * s, color: NAVY, align: 'left', stroke: false, weight: 800 });
    const tw = ui.measure(g, `${st.claps}`, 26 * s, 800);
    ui.text(g, 'claps', tw + 6, 2 * s, { size: 17 * s, color: '#7a6a99', align: 'left', stroke: false });
    g.restore();
    // best trick
    if (st.best && !small) {
      ui.text(g, `Best: ${st.best.name}`, r.x + r.w - 18, r.y + 34, { size: 22, color: '#ffffff', align: 'right', strokeWidth: 5, maxWidth: r.w - cw - 60 });
    } else if (st.best) {
      ui.text(g, '★ ' + st.best.score, r.x + r.w - 16, r.y + 32, { size: 22, color: GOLD, align: 'right', strokeWidth: 5 });
    }
    // control hints (humans)
    if (!p.isAI && this.live) {
      const list = HINTS[this.act.id];
      const hs = small ? 22 : r.w < 1000 ? 26 : 30;
      const items = small ? list.slice(0, 3) : list;
      g.save();
      g.globalAlpha = 0.85; g.fillStyle = 'rgba(36,22,63,0.55)';
      ui.roundRect(g, r.x + 10, r.y + r.h - hs * 1.75, r.w - 20, hs * 1.5, hs * 0.75); g.fill();
      g.restore();
      ui.hints(g, items, r.x + r.w / 2, r.y + r.h - hs, { size: hs, gap: small ? 14 : 26 });
    }
  }

  drawTopBar(g) {
    // step pills
    const x0 = 150;
    STEPS.forEach((id, i) => {
      const x = x0 + i * 62, y = 56, cur = i === this.actI, done = i < this.actI;
      g.save();
      g.globalAlpha = done || cur ? 1 : 0.55;
      g.beginPath(); g.arc(x, y, cur ? 30 : 25, 0, TAU);
      g.fillStyle = cur ? '#fff6d0' : done ? '#ffe08a' : '#f2e6ff'; g.fill();
      g.lineWidth = cur ? 6 : 4; g.strokeStyle = cur ? GOLD : NAVY; g.stroke();
      drawActIcon(g, id, x, y, cur ? 40 : 32);
      g.restore();
    });
    // title
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -330, -40, 660, 80, { r: 40, fill: RED });
    ui.text(g, this.act.name, 0, 2, { size: 50, weight: 800 });
    g.restore();
    const left = Math.max(0, ACT_TIME - this.actT);
    ui.timer(g, left, W - 190, 56);
  }

  drawActIntro(g) {
    const t = this.actT;
    if (t > INTRO + 0.4) return;
    const al = clamp((INTRO + 0.4 - t) / 0.4, 0, 1);
    g.save(); g.globalAlpha = al;
    g.fillStyle = 'rgba(36,22,63,0.45)'; g.fillRect(0, 360, W, 330);
    ui.banner(g, `Act ${this.actI + 1}: ${this.act.name}!`, t, { y: 470, size: 110, color: GOLD });
    ui.text(g, this.act.tip, W / 2, 600, { size: 44, color: '#ffffff' });
    const gl = this.glimmer;
    gl.x = 250; gl.y = 660; gl.facing = 1;
    this.drawGlimmer(g);
    g.restore();
  }

  drawGlimmer(g) {
    const gl = this.glimmer;
    gl.z = 20 + Math.sin(this.t * 2) * 10;
    gl.draw(g, { shadow: false });
  }

  drawPyramid(g) {
    const P = this.pyr;
    drawSpotCones(g, this.t, [W / 2], FLOOR, 0.16 + this.crowd * 0.08);
    // floor shadows
    for (const st of this.stations) { const a = st.actor, m = st.py.mode; if (m === 'wait' || m === 'down') this.shadow(g, a.x, a.y, 50 * a.scale * Math.max(0.4, 1 - a.z / 400), 0.2); }
    // open slots glow
    for (const slot of this.slots) {
      if (!slot.st || slot.st.py.mode !== 'wait' || !this.slotOpen(slot) || this.pt < 1.6) continue;
      const y = this.slotY(slot);
      g.save(); g.globalAlpha = 0.5 + 0.4 * Math.sin(this.t * 8);
      g.strokeStyle = slot.st.p.color; g.lineWidth = 7;
      g.beginPath(); g.ellipse(slot.x, y, 60, 16, 0, 0, TAU); g.stroke();
      g.restore();
    }
    if (this.troll) this.troll.actor.draw(g);
    // pyramid rows bottom-up, then everyone else
    const placed = this.stations.filter((st) => st.py.mode === 'placed').sort((a, b) => a.py.slot.row - b.py.slot.row || a.actor.y - b.actor.y);
    const others = this.stations.filter((st) => st.py.mode !== 'placed').sort((a, b) => a.actor.y - b.actor.y);
    for (const st of placed) this.drawAcrobat(g, st);
    for (const st of others) this.drawAcrobat(g, st, { ring: st.py.mode === 'wait' || st.py.mode === 'down' ? st.p.color : null });
    // tags over the waiting acrobats whose turn it is
    for (const st of others) {
      const q = st.py;
      if (q.mode !== 'wait') continue;
      const a = st.actor;
      ui.playerTag(g, st.p, a.x, a.y - a.z - a.height - 16);
      if (!st.p.isAI && this.pt > 1.6 && this.slotOpen(q.slot)) ui.glyph(g, 'a', a.x + 52, a.y - a.z - a.height - 34, 40, { pulse: true });
    }
    for (const st of this.stations) this.drawFloatLabel(g, st);
    this.drawGlimmer(g);
    // HUD
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -330, -40, 660, 80, { r: 40, fill: RED });
    ui.text(g, P.doneT >= 0 ? 'Ta-da!' : 'Human Pyramid', 0, 2, { size: 50, weight: 800 });
    g.restore();
    this.drawStepsMini(g, 4);
    const humans = this.stations.filter((st) => !st.p.isAI);
    if (humans.length) {
      if (P.doneT >= 0 && P.tumbleT < 0) {
        ui.text(g, 'Strike a pose!', W / 2, H - 96, { size: 40, color: GOLD });
        ui.hints(g, PHOTO_POSES.filter((q) => !q.pad && q.btn !== 'ls' && q.btn !== 'rs').slice(0, 6).map((q) => [q.btn, q.label]), W / 2, H - 42, { size: 32 });
      } else if (P.doneT < 0) {
        ui.hints(g, [['stick', 'Walk'], ['a', 'Jump to your spot!'], ['stick', 'Flip in the air']], W / 2, H - 42, { size: 32 });
      }
    }
    if (P.doneT >= 0 && P.doneT < POSE_TIME) {
      const n = Math.ceil(POSE_TIME - P.doneT);
      if (n <= 3) { const f = 1 - (POSE_TIME - P.doneT - (n - 1)); g.save(); g.translate(W / 2, 250); g.scale(1 + f * 0.3, 1 + f * 0.3); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(n), 0, 0, { size: 150, color: GOLD, strokeWidth: 12 }); g.restore(); }
    }
    if (this.pt < 2.2) {
      g.save(); g.globalAlpha = clamp((2.2 - this.pt) / 0.4, 0, 1);
      ui.banner(g, 'Human Pyramid!', this.pt, { y: 360, size: 110, color: GOLD });
      ui.text(g, 'Jump onto your glowing spot!', W / 2, 470, { size: 44 });
      g.restore();
    }
  }

  drawStepsMini(g, cur) {
    STEPS.forEach((id, i) => {
      const x = 150 + i * 62, y = 56;
      g.save();
      g.globalAlpha = i <= cur ? 1 : 0.55;
      g.beginPath(); g.arc(x, y, i === cur ? 30 : 25, 0, TAU);
      g.fillStyle = i === cur ? '#fff6d0' : i < cur ? '#ffe08a' : '#f2e6ff'; g.fill();
      g.lineWidth = i === cur ? 6 : 4; g.strokeStyle = i === cur ? GOLD : NAVY; g.stroke();
      drawActIcon(g, id, x, y, i === cur ? 40 : 32);
      g.restore();
    });
  }

  drawFloatLabel(g, st) {
    const L = st.label;
    if (!L || L.t > 1.6) return;
    const a = st.actor, sc = ease.outBack(clamp(L.t / 0.3, 0, 1)), al = clamp((1.6 - L.t) / 0.4, 0, 1);
    g.save(); g.translate(a.x, a.y - a.z - a.height - 70); g.scale(sc, sc); g.globalAlpha = al;
    ui.text(g, L.text, 0, 0, { size: 32, color: '#fff', strokeWidth: 7 });
    g.restore();
  }

  drawShow(g) {
    const S = this.show;
    const performing = S.bowT < 0 && S.groups[S.gi] ? S.groups[S.gi] : [];
    // the waiting acrobats (dimmed by the house lights going down)
    const side = this.stations.filter((st) => !performing.includes(st)).sort((a, b) => a.actor.y - b.actor.y);
    if (this.troll) this.troll.actor.draw(g);
    for (const st of side) { this.shadow(g, st.actor.x, st.actor.y, 44 * st.actor.scale); this.drawAcrobat(g, st); }
    if (S.bowT < 0) {
      g.save(); g.fillStyle = 'rgba(20,8,30,0.42)'; g.fillRect(0, 0, W, H); g.restore();
      drawSpotCones(g, this.t, S.spots.slice(0, performing.length), FLOOR, 0.3);
      performing.forEach((st, j) => {
        const sh = st.sh, x = S.spots[j];
        drawTrampoline(g, x, FLOOR, S.ts, sh ? sh.dip || 0 : 0, st.p.color);
      });
      for (const st of performing) {
        const a = st.actor;
        this.shadow(g, a.x, FLOOR - TRAMP_BED * this.show.ts + 6, 60 * Math.max(0.4, 1 - a.z / 500), 0.3);
        this.drawAcrobat(g, st);
      }
      // name cards
      performing.forEach((st, j) => {
        const x = S.spots[j], sh = st.sh;
        const show = sh && (sh.mode === 'tada' || sh.mode === 'play' || sh.mode === 'fall' || sh.mode === 'pre');
        if (!sh) return;
        const w = this.n >= 5 ? 600 : 780, y = 150;
        g.save(); g.translate(x, y);
        const pop = ease.outBack(clamp((sh.mode === 'enter' ? sh.t : 1) / 0.4, 0, 1));
        g.scale(pop, pop);
        ui.panel(g, -w / 2, -54, w, 108, { r: 30, fill: '#ffffff', stroke: st.p.color, lineWidth: 7 });
        drawPortrait(g, st.p, -w / 2 + 56, 0, 40, { expr: 'happy' });
        ui.text(g, playerName(st.p), -w / 2 + 108, -22, { size: 28, color: st.p.color, align: 'left', strokeWidth: 5, maxWidth: w - 140 });
        ui.text(g, show && sh.mode === 'tada' ? `${st.best.name}!` : 'Best trick...', -w / 2 + 108, 22, { size: 34, color: NAVY, align: 'left', stroke: false, weight: 800, maxWidth: w - 140 });
        g.restore();
        if (sh.mode === 'tada') {
          const a = st.actor;
          ui.text(g, `+${st.best.score}`, a.x + 120, a.y - a.height - 40 - sh.t * 20, { size: 54, color: GOLD, alpha: clamp(1.5 - sh.t, 0, 1) });
        }
      });
    } else {
      drawSpotCones(g, this.t, [W * 0.3, W / 2, W * 0.7], FLOOR, 0.18);
      const line = [...this.stations].sort((a, b) => a.actor.y - b.actor.y);
      for (const st of line) { if (st.sh && st.sh.mode === 'bow') this.shadow(g, st.actor.x, st.actor.y, 50 * st.actor.scale); this.drawAcrobat(g, st, { ring: st.p.color }); }
      if (S.bowT > 0.9 && !this.finished) ui.banner(g, 'Bravo!', S.bowT - 0.9, { y: 260, size: 150, color: GOLD });
      const humans = this.stations.filter((st) => !st.p.isAI);
      if (humans.length && S.bowT > 1.6) ui.hints(g, PHOTO_POSES.filter((q) => !q.pad && q.btn !== 'ls' && q.btn !== 'rs').slice(0, 6).map((q) => [q.btn, q.label]), W / 2, H - 42, { size: 32 });
    }
    this.drawGlimmer(g);
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -330, -40, 660, 80, { r: 40, fill: RED });
    ui.text(g, 'Finale Show', 0, 2, { size: 50, weight: 800 });
    g.restore();
    this.drawStepsMini(g, 5);
  }
}

/** A plain big bounce, for anyone who somehow never left the ground. */
function syntheticBounce() {
  const rec = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; rec.push([0, 1.6 * 4 * u * (1 - u), 0, 1, u < 0.5 ? 'jump' : 'fall', 1]); }
  return rec;
}
