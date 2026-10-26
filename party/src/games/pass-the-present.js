// Pass the Present - hot potato at a birthday party. Run around the rug with
// the left stick, aim with the right stick and throw with RT (A also throws).
// The present flies straight: whoever it touches catches it; if it touches no
// one (or they dash out of the way with LT / B) it flies back to the thrower.
// Don't be holding it when it pops! Keyboard players aim where they walk.
//
// Art hooks (optional; procedural fallbacks ship today):
//   bg/pass-the-present  prop/present  prop/party-rug
// New-pose hooks (fall back to existing poses): 'hold-present' -> carry,
//   'toss' -> throw, 'catch-present' -> surprised, 'sooty' -> dizzy
import { playerName } from '../state.js';
import { W, H } from '../engine/canvas.js';
import { Actor, POSE_NAMES } from '../engine/sprites.js';
import { charById } from '../data/characters.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, sfxLoop, voice, music } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { input } from '../engine/input.js';
import { aiProfile, reactionTime, Brain } from '../engine/ai.js';
import { drawHeartShape } from '../engine/emotes.js';
import { bodyRadius } from '../engine/crowd.js';
import { clamp, lerp, damp, rand, pick, chance, shuffle, ease, TAU } from '../engine/util.js';

import { meta } from './pass-the-present.meta.js';
export { meta };

// --- tuning -----------------------------------------------------------------
// RY leaves room between the back and front rows for name tags + the overhead present.
const CX = 960, CY = 645, RX = 545, RY = 222, RUG_RY = 190;
const MIN_HOLD = 0.25;
const HOT = 4.2;           // seconds of "heating up" before a pop
// Running around: players stay inside an oval around the rug (feet positions).
const AREA = { cx: CX, cy: 702, rx: RX + 110, ry: 236 };
const SPEED = 340;         // run speed, px/s
const HOLD_SLOW = 0.82;    // the holder runs a little slower
const DASH_V = 1150, DASH_T = 0.22, DASH_CD = 0.9;
// Throwing: straight along the aim, caught by whoever it touches.
const THROW_V = 1300, RANGE = 900, RETURN_T = 0.55;
const CATCH_R = 80;        // catch radius at scale 1 (ground distance, y counts x1.6)
const ASSIST = 0.5;        // radians: the aim snaps to a friend within this angle
const BODY_R = 70;         // players push each other apart

const NEW_POSE_FALLBACK = { 'hold-present': 'carry', toss: 'throw', 'catch-present': 'surprised', sooty: 'dizzy' };
const poseName = (n) => (POSE_NAMES.includes(n) ? n : NEW_POSE_FALLBACK[n] || 'idle');

export class Game {
  constructor(api) {
    this.api = api;
    this.real = api.players;
    this.npc = null;
    let players = this.real;
    if (players.length < 2) {
      this.npc = { index: players.length, tag: 'TROLL', color: '#6f7d3c', charId: 'troll', isAI: true, aiLevel: 0, ctrl: input.createAI(920) };
      players = [...players, this.npc];
    }
    this.players = players;
    const n = players.length;
    this.n = n;
    this.t = 0;
    this.baseScale = n <= 3 ? 1.17 : n <= 4 ? 1.1 : n <= 6 ? 0.92 : 0.8;
    this.cam = api.camera;
    this.hearts0 = n <= 2 ? 3 : n <= 4 ? 2 : 1;
    this.round = 0;
    this.elimCount = 0;
    this.ends = null;
    this.fuseRange = n <= 3 ? [5, 11] : n <= 4 ? [4, 8.5] : [3, 6.5];
    this.pres = { state: 'rest', rest: 0.8, holder: null, from: null, to: null, ft: 0, fuse: 0, fuseMax: 1, tickT: 0, tick: 0, spin: 0, heat: 0, pass: 0, spawnT: 0 };
    this.lastLoser = null;
    this.rumbleT = 0;
    this.nervT = 1;
    this.ents = players.map((p, i) => {
      const sc = this.baseScale * (p.charId === 'troll' ? 0.58 : 1);
      const a = new Actor(p, { scale: sc });
      return {
        p, a, i, sc, hearts: this.hearts0, state: 'ring', x: CX, y: CY, tx: CX, ty: CY, holdT: 0,
        aimX: 1, aimY: 0, vx: 0, vy: 0, dashT: 0, dashCd: 0, dashX: 0, dashY: 0,
        dizzy: 0, elimIdx: -1, brain: new Brain(p), ai: null, spot: null, mood: 0, soot: null, heartShake: 0,
      };
    });
    this.layout(true);
    for (const e of this.ents) { e.a.x = e.x; e.a.y = e.y; e.a.snap(); e.aimX = CX - e.x; e.aimY = CY - e.y; const m = Math.hypot(e.aimX, e.aimY) || 1; e.aimX /= m; e.aimY /= m; }
    this.confettiDots = Array.from({ length: 90 }, () => ({ a: rand(TAU), d: Math.sqrt(rand()), c: pick(RAINBOW), r: rand(TAU) }));
    this.bulbs = Array.from({ length: 7 }, (_, i) => ({ x: 120 + i * 280 + rand(-40, 40), p: rand(TAU) }));
  }

  // --------------------------------------------------------------- layout
  ringMembers() { return this.ents.filter((e) => e.state === 'ring' || e.state === 'elimWait'); }

  layout(snap = false, dt = 0) {
    const ring = this.ents.filter((e) => e.state === 'ring' || e.state === 'elimWait');
    const m = ring.length;
    ring.forEach((e, k) => {
      const ang = -Math.PI / 2 + (k / m) * TAU + (m % 2 === 0 ? Math.PI / m : 0) + (m === 2 ? Math.PI / 2 - Math.PI / 2 : 0);
      e.tx = CX + Math.cos(ang) * RX; e.ty = CY + Math.sin(ang) * RY;
      e.ringAng = ang;
    });
    // Players start spread around the rug, then run freely (layout only
    // depth-scales them: nearer the bottom of the screen = a bit bigger).
    for (const e of this.ents) {
      if (e.state === 'ring' || e.state === 'elimWait') {
        if (snap) { e.x = e.tx; e.y = e.ty; }
        const depth = 0.9 + 0.16 * clamp((e.y - (CY - RY)) / (2 * RY), 0, 1);
        e.a.scale = e.sc * depth;
      }
    }
    void dt;
  }

  // ---------------------------------------------------------------- update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { this.faceCenter(e); e.a.setPose('idle'); e.a.update(dt); }
  }

  /** Stick, aim, throw and dash (humans and CPUs alike: CPUs drive a virtual controller). */
  playerInput(e, dt) {
    const ctrl = e.p.ctrl, P = this.pres;
    const holder = P.holder === e && P.state === 'held';
    const mx = ctrl.x, my = ctrl.y, mm = Math.hypot(mx, my);
    const sp = SPEED * (holder ? HOLD_SLOW : 1) * Math.min(1, mm);
    if (e.dashT > 0) { e.dashT -= dt; e.vx = e.dashX * DASH_V; e.vy = e.dashY * DASH_V; }
    else { e.vx = damp(e.vx, mm > 0.15 ? (mx / mm) * sp : 0, 12, dt); e.vy = damp(e.vy, mm > 0.15 ? (my / mm) * sp : 0, 12, dt); }
    // Aim: the right stick; without one (keyboard), or when it has been idle a moment, the way you're running.
    const rx = ctrl.rx, ry = ctrl.ry, rm = Math.hypot(rx, ry);
    if (rm > 0.35) { e.aimX = rx / rm; e.aimY = ry / rm; e.rIdle = 0; }
    else {
      e.rIdle = (e.rIdle || 0) + dt;
      if (mm > 0.35 && (e.p.ctrl.kind !== 'pad' || e.rIdle > 0.75)) { e.aimX = mx / mm; e.aimY = my / mm; }
    }
    // Dash: a quick burst the way you're running (or away from where you aim).
    if ((ctrl.pressed('lt') || ctrl.pressed('b')) && e.dashCd <= 0 && e.dashT <= 0) {
      const dx = mm > 0.2 ? mx / mm : -e.aimY, dy = mm > 0.2 ? my / mm : e.aimX;
      e.dashX = dx; e.dashY = dy; e.dashT = DASH_T; e.dashCd = DASH_CD;
      sfx('whoosh', { vol: 0.6 }); e.a.squash(0.2);
      particles.burst(e.x, e.y - 10, { type: 'dust', count: 6, speed: [60, 160], size: [12, 20] });
    }
    if (holder && (ctrl.pressed('rt') || ctrl.pressed('a')) && e.holdT >= MIN_HOLD) this.throwPresent(e);
  }

  /** Move with the current velocity: stay in the play area, don't overlap friends. */
  moveEnt(e, dt) {
    e.x += e.vx * dt; e.y += e.vy * dt;
    for (const o of this.ents) {
      if (o === e || (o.state !== 'ring' && o.state !== 'elimWait')) continue;
      const dx = e.x - o.x, dy = (e.y - o.y) * 1.6, d = Math.hypot(dx, dy), min = Math.max(BODY_R * (e.a.scale + o.a.scale) * 0.5, (bodyRadius(e.a) + bodyRadius(o.a)) * 0.8);
      if (d > 0.01 && d < min) { const push = (min - d) * 0.5; e.x += (dx / d) * push; e.y += (dy / d) * push / 1.6; }
    }
    const nx = (e.x - AREA.cx) / AREA.rx, ny = (e.y - AREA.cy) / AREA.ry, r = Math.hypot(nx, ny);
    if (r > 1) { e.x = AREA.cx + (nx / r) * AREA.rx; e.y = AREA.cy + (ny / r) * AREA.ry; }
    const depth = 0.9 + 0.16 * clamp((e.y - (CY - RY)) / (2 * RY), 0, 1);
    e.a.scale = e.sc * depth;
  }

  faceCenter(e) { e.a.facing = e.x < CX ? 1 : -1; if (Math.abs(e.x - CX) < 60) e.a.facing = e.y < CY ? 1 : -1; }

  /** Every human player is out (the host then offers "B: skip to the end"). */
  humansOut() {
    const hs = this.ents.filter((e, i) => e && !e.p.isAI);
    return hs.length > 0 && hs.every((e) => e.state === 'out');
  }

  update(dt) {
    this.t += dt;
    const P = this.pres;
    this.layout(false, dt);
    for (const e of this.ents) {
      e.dashCd = Math.max(0, e.dashCd - dt);
      if (e.dizzy > 0) { e.dizzy -= dt; if (e.dizzy <= 0) this.afterDizzy(e); }
      e.heartShake = Math.max(0, e.heartShake - dt);
    }
    if (!this.ends) this.stepPresent(dt);
    for (const e of this.ents) this.updateEnt(e, dt);
    P.spin += dt * (2 + P.heat * 10);
    this.followCamera();
    if (this.ends) {
      this.ends.t += dt;
      if (this.ends.t > 2.4 && !this.ends.done) this.finishNow();
    }
  }

  postUpdate(dt) {
    this.t += dt;
    this.layout(false, dt);
    for (const e of this.ents) this.updateEnt(e, dt);
  }

  updateEnt(e, dt) {
    const a = e.a, P = this.pres;
    if (e.state === 'ring' || e.state === 'elimWait') {
      const holder = P.holder === e && (P.state === 'held');
      const free = e.state === 'ring' && e.dizzy <= 0 && !this.ends;
      if (e.p.isAI && free) this.aiThink(e, dt);
      if (free) this.playerInput(e, dt); else { e.vx = damp(e.vx, 0, 10, dt); e.vy = damp(e.vy, 0, 10, dt); e.dashT = 0; }
      this.moveEnt(e, dt);
      const moving = Math.hypot(e.vx, e.vy) > 40;
      if (e.dashT > 0) { if (!a._once) a.setPose('dash'); }
      else if (e.dizzy > 0) { if (!a._once && a.pose !== 'dizzy') a.setPose(poseName('sooty')); }
      else if (this.ends && this.ends.winner === e) { if (a.pose !== 'celebrate') { a.clearEmotes(); a.setPose('celebrate'); } }
      else if (holder) { if (!a._once) a.setPose(moving ? 'carry' : poseName('hold-present')); a.speed = moving ? 1 : 0.35 + P.heat * 0.9; }
      else if (!a._once) { a.setPose(moving ? 'walk' : 'idle'); a.speed = moving ? clamp(Math.hypot(e.vx, e.vy) / SPEED, 0.5, 1.2) : 0; }
      // Face where you're aiming while holding, otherwise where you run.
      const fx_ = holder ? e.aimX : Math.abs(e.vx) > 30 ? e.vx : 0;
      if (fx_) a.facing = fx_ > 0 ? 1 : -1;
    } else if (e.state === 'leaving') {
      const s = e.spot;
      const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy);
      const sp = 380 * dt;
      if (d > sp) { e.x += dx / d * sp; e.y += dy / d * sp; if (!a._once) { a.setPose('walk'); a.speed = 0.7; } a.facing = dx > 0 ? 1 : -1; }
      else { e.x = s.x; e.y = s.y; e.state = 'out'; e.mood = 0; a.facing = s.x < CX ? 1 : -1; a.clearEmotes(); a.setPose('pout'); }
      a.scale = damp(a.scale, e.sc * 0.82, 5, dt);
    } else if (e.state === 'out') {
      e.mood += dt;
      if (e.mood > 2 && a.pose === 'pout') { a.clearEmotes(); a.setPose('clap'); }
      a.scale = damp(a.scale, e.sc * 0.82, 5, dt);
    }
    a.x = e.x; a.y = e.y;
    a.update(dt);
  }

  // ----------------------------------------------------------- the present
  startRound() {
    const P = this.pres;
    const alive = this.ents.filter((e) => e.state === 'ring');
    let cand = alive;
    if (alive.length > 2 && this.lastLoser) cand = alive.filter((e) => e !== this.lastLoser);
    const h = pick(cand);
    this.round++;
    const [lo, hi] = this.t > 85 ? [2.5, 4.5] : this.fuseRange;
    P.state = 'held'; P.holder = h; P.from = null; P.fuse = rand(lo, hi); P.fuseMax = P.fuse; P.tickT = 0.5; P.tick = 0; P.heat = 0; P.pass = 0; P.spawnT = 0;
    h.holdT = 0; h.ai = null;
    sfx('magic'); sfx('note', { midi: 84, dur: 0.3, vol: 0.2 });
    if (this.fuseLoop) this.fuseLoop.stop();
    this.fuseLoop = sfxLoop('fuse-sizzle');   // fizzes while the present ticks
    const px = h.x, py = h.y - h.a.height - 40;
    particles.burst(px, py, { type: 'sparkle', count: 12, colors: ['#fff', '#ffe066', '#ff9fcd'] });
    particles.popText(CX, CY - 40, this.round === 1 ? 'Pass it on!' : `Round ${this.round}`, '#ffffff', 64);
    if (this.round > 1) this.musicBackAt = this.t + 1.2;   // the song (hushed by the pop) fades back in
  }

  /** The friend the holder's aim would hit (aim assist: within ASSIST radians and in range). */
  aimTarget(h) {
    let best = null, bestAng = ASSIST;
    for (const o of this.ents) {
      if (o === h || o.state !== 'ring') continue;
      const dx = o.x - h.x, dy = o.y - h.y, d = Math.hypot(dx, dy);
      if (d < 1 || d > RANGE + 60) continue;
      const ang = Math.acos(clamp((dx * h.aimX + dy * h.aimY) / d, -1, 1));
      if (ang < bestAng) { bestAng = ang; best = o; }
    }
    return best;
  }

  stepPresent(dt) {
    const P = this.pres;
    if (this.musicBackAt != null && this.t >= this.musicBackAt) { this.musicBackAt = null; music.hush(false, 2.5); }
    if (P.state === 'rest') {
      P.rest -= dt;
      if (P.rest <= 0) {
        const alive = this.ents.filter((e) => e.state === 'ring');
        if (alive.length <= 1) { this.decide(alive[0] || null); return; }
        if (this.ents.some((e) => e.dizzy > 0 && e.state !== 'elimWait' && e.dizzy > 0.4)) P.rest = 0.2; else this.startRound();
      }
      return;
    }
    // the fuse burns while the present is held or flying
    P.fuse -= dt;
    const rem = Math.max(0, P.fuse);
    P.heat = clamp(1 - rem / HOT, 0, 1);
    P.heat = Math.pow(P.heat, 0.85);
    if (this.fuseLoop) this.fuseLoop.setRate(1 + 0.6 * P.heat);   // fizz rises as it heats
    P.tickT -= dt;
    if (P.tickT <= 0) {
      P.tickT = lerp(0.8, 0.12, P.heat);
      P.tick ^= 1;
      sfx(P.tick ? 'tick' : 'tock');
      if (P.heat > 0.3 && P.holder && !P.holder.p.isAI) P.holder.p.ctrl.rumble(0.15 + P.heat * 0.5, 70);
      if (P.heat > 0.6 && Math.random() < 0.5) { const hp = this.presPos(); particles.burst(hp.x, hp.y - 30, { type: 'spark', count: 2, colors: ['#ffd23f', '#ff6a1a'], speed: [60, 200], life: [0.2, 0.4] }); }
    }
    if (P.state === 'held') {
      const h = P.holder;
      h.holdT += dt;
      if (P.fuse <= 0) { this.pop(h); return; }
      if (P.heat > 0.5 && Math.random() < dt * 2) h.a.emote('sweat', 0.8);
    } else if (P.state === 'flying') {
      // Straight out along the aim; the first friend it touches catches it
      // (unless they're mid-dash: that's a dodge).
      const step = THROW_V * dt;
      P.gx += P.ux * step; P.gy += P.uy * step; P.dist += step;
      P.ft += dt;
      if (P.fuse <= 0) { this.pop(P.from); return; }
      for (const o of this.ents) {
        if (o === P.from || o.state !== 'ring' || o.dashT > 0 || o.dizzy > 0) continue;
        if (Math.hypot(o.x - P.gx, (o.y - P.gy) * 1.6) < CATCH_R * o.a.scale) { this.land(o); return; }
      }
      const nx = (P.gx - AREA.cx) / (AREA.rx + 120), ny = (P.gy - AREA.cy) / (AREA.ry + 120);
      if (P.dist >= RANGE || Math.hypot(nx, ny) > 1) this.missed();
    } else if (P.state === 'returning') {
      P.ft += dt;
      if (P.fuse <= 0) { this.pop(P.from); return; }
      if (P.ft >= RETURN_T) this.land(P.from, true);
    }
    // nervous friends
    if (P.heat > 0.55) {
      this.nervT -= dt;
      if (this.nervT <= 0) {
        this.nervT = rand(0.4, 0.9);
        const opts = this.ents.filter((e) => e.state === 'ring' && e !== P.holder && !e.a._once && e.dizzy <= 0);
        if (opts.length) pick(opts).a.emote('sweat', 0.8);
      }
    }
  }

  presPos() {
    const P = this.pres;
    if (P.state === 'flying') {
      // Flies at chest height with a gentle arc; (gx, gy) is the spot below it.
      const k = clamp(P.dist / RANGE, 0, 1);
      return { x: P.gx, y: P.gy - P.z - Math.sin(k * Math.PI) * 90, k, gx: P.gx, gy: P.gy };
    }
    if (P.state === 'returning') {
      // Boomerangs back to the thrower, wherever they've run to.
      const f = P.from, k = clamp(P.ft / RETURN_T, 0, 1), e = ease.inOutQuad(k);
      const gx = lerp(P.gx, f.x, e), gy = lerp(P.gy, f.y, e);
      const z = lerp(P.z, f.a.height + 44 * (f.a.scale / f.sc || 1), e);
      return { x: gx, y: gy - z - Math.sin(k * Math.PI) * 140, k: k * 2, gx, gy };
    }
    const h = P.holder;
    if (!h) return { x: CX, y: CY };
    return { x: h.x + (h.a.facing || 1) * 6, y: h.y - h.a.height - 44 * (h.a.scale / h.sc || 1) };
  }

  throwPresent(e) {
    const P = this.pres;
    // Aim assist: a throw close enough to a friend goes straight at them.
    const t = this.aimTarget(e);
    let ux = e.aimX, uy = e.aimY;
    if (t) { const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1; ux = dx / d; uy = dy / d; }
    P.state = 'flying'; P.from = e; P.ft = 0; P.pass++;
    P.gx = e.x + ux * 40; P.gy = e.y + uy * 40; P.ux = ux; P.uy = uy; P.dist = 0;
    P.z = e.a.height * 0.8;
    e.a.playOnce(poseName('toss'), 0.32, 'idle'); e.a.squash(0.25);
    if (Math.abs(ux) > 0.1) e.a.facing = ux > 0 ? 1 : -1;
    sfx('swap'); sfx('whoosh');
    const hp = this.presPos();
    particles.burst(hp.x, hp.y, { type: 'dust', count: 4, speed: [40, 120], size: [10, 16] });
  }

  /** Nobody caught it: it flies back to the thrower. */
  missed() {
    const P = this.pres, pos = this.presPos();
    P.state = 'returning'; P.ft = 0; P.z = P.gy - pos.y;
    sfx('boing');
    particles.popText(pos.x, pos.y - 40, pick(['Missed!', 'Whoops!', 'Boomerang!']), '#ffffff', 52);
  }

  land(t, returned = false) {
    const P = this.pres;
    P.holder = t; P.state = 'held'; P.ft = 0;
    t.holdT = 0; t.ai = null;
    t.a.playOnce(poseName('catch-present'), 0.3, poseName('hold-present')); t.a.squash(0.3);
    sfx('pop');
    const hp = this.presPos();
    particles.burst(hp.x, hp.y + 30, { type: 'spark', count: 6, colors: ['#fff', '#ffe066'], speed: [100, 240] });
    particles.ring(t.x, t.y - t.a.height * 0.5, t.p.color, 90, 0.3);
    if (returned) t.a.emote('sweat', 0.8);
    if (P.fuse <= 0) this.pop(t);
  }

  pop(h) {
    const P = this.pres;
    P.state = 'popping'; P.heat = 1;
    if (this.fuseLoop) { this.fuseLoop.stop(0.05); this.fuseLoop = null; }
    const a = h.a;
    const hp = { x: h.x, y: h.y - h.a.height - 30 };
    if (this.cam) this.cam.punch(h.x, h.y - h.a.height * 0.7, 1.28, 0.45);
    music.hush(true, 0.12); this.musicBackAt = null;   // the music stops dead at the pop
    sfx('bigpop'); sfx('boom'); fx.shake(24, 0.55); fx.flash('#ffffff', 0.2); fx.hitstop(0.09);
    voice(h.p.charId, 'ouch');
    if (!h.p.isAI) h.p.ctrl.rumble(1, 400);
    particles.burst(hp.x, hp.y, { type: 'confetti', count: 90, speed: [300, 900], life: [1.4, 2.4] });
    particles.burst(hp.x, hp.y, { type: 'star', count: 14, colors: ['#ffd23f', '#fff', '#ff6fb1'] });
    particles.burst(h.x, h.y - h.a.height * 0.8, { type: 'dust', count: 22, color: 'rgb(48,38,60)', speed: [80, 360], size: [22, 44], life: [0.7, 1.4] });
    particles.burst(h.x, h.y - h.a.height * 0.7, { type: 'smoke', count: 12, speed: [30, 140], size: [26, 50] });
    particles.ring(hp.x, hp.y, '#ffffff', 220, 0.5);
    particles.popText(hp.x, hp.y - 70, 'POP!', '#ff4d6d', 90);
    // loses a heart
    h.hearts = Math.max(0, h.hearts - 1); h.heartShake = 1;
    particles.popText(h.x + 60, h.y - h.a.height - 10, '-1', '#ff4d6d', 56);
    particles.burst(h.x, h.y - h.a.height, { type: 'heart', count: 5, colors: ['#ff4f8b'], speed: [60, 220], gravity: 500 });
    this.sootPuff = { x: h.x, y: h.y - h.a.height * 0.72, s: h.a.height, t0: this.t };
    // soot + dizzy
    a.clearEmotes(); a.playOnce('hurt', 0.4, poseName('sooty')); a.squash(0.4);
    h.dizzy = 1.7;
    if (h.soot) a.detach(h.soot);
    h.soot = a.attach((g, info) => {
      const hd = info.head, u = info.h;
      g.save();
      g.globalAlpha = 0.6 * clamp(1 - Math.max(0, (this.t - h.sootT - 2.5)) / 1.2, 0, 1);
      g.fillStyle = '#2b2233';
      g.beginPath(); g.ellipse(hd.x - u * 0.05, hd.y + u * 0.12, u * 0.085, u * 0.07, 0.3, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(hd.x + u * 0.07, hd.y + u * 0.09, u * 0.06, u * 0.05, -0.4, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(hd.x, hd.y + u * 0.2, u * 0.07, u * 0.04, 0, 0, TAU); g.fill();
      g.globalAlpha *= 0.8;
      g.beginPath(); g.ellipse(hd.x - u * 0.02, hd.y + u * 0.02, u * 0.1, u * 0.06, 0, 0, TAU); g.fill();
      g.restore();
    });
    h.sootT = this.t;
    this.lastLoser = h;
    // everyone else reacts
    for (const o of this.ents) {
      if (o === h) continue;
      if (o.state === 'ring') { if (chance(0.75)) o.a.playOnce('cheer', 0.55); }
      else if (o.state === 'out') o.a.playOnce('cheer', 0.7, 'clap');
    }
    sfx('cheer');
    P.holder = h; P.rest = 2.1;
    if (h.hearts <= 0) h.state = 'elimWait';
    P.state = 'rest';
  }

  afterDizzy(e) {
    const a = e.a;
    a.clearEmotes();
    if (e.soot) { a.detach(e.soot); e.soot = null; }
    if (e.state === 'elimWait') {
      // out of hearts: leave the circle and cheer from the side
      this.elimCount++;
      e.elimIdx = this.elimCount;
      const idx = this.elimCount - 1;
      const side = idx % 2 === 0 ? -1 : 1, col = Math.floor(idx / 2);
      e.spot = { x: CX + side * (800 + col * 0) + (side > 0 ? 0 : 0), y: 960 };
      e.spot = { x: side < 0 ? 95 + col * 105 : W - 95 - col * 105, y: 975 };
      e.state = 'leaving';
      voice(e.p.charId, 'aww');
      const alive = this.ents.filter((o) => o.state === 'ring');
      if (alive.length <= 1 && !this.ends) this.decide(alive[0] || null);
    } else a.setPose('idle');
  }

  decide(winner) {
    if (this.ends) return;
    this.ends = { t: 0, winner, done: false };
    if (this.fuseLoop) { this.fuseLoop.stop(); this.fuseLoop = null; }
    if (winner) {
      winner.a.clearEmotes(); winner.a.setPose('celebrate');
      sfx('win'); sfx('fanfare'); particles.confettiRain(W, 120); fx.slowmo(0.5, 0.7);
      particles.popText(winner.x, winner.y - winner.a.height - 60, 'Winner!', '#ffd23f', 76);
    }
    this.pres.state = 'rest'; this.pres.rest = 99;
  }

  finishNow() {
    this.ends.done = true;
    const n = this.n;
    const place = this.ents.map((e) => (e === this.ends.winner ? 1 : e.elimIdx > 0 ? n - e.elimIdx + 1 : 1));
    // anyone still standing (shouldn't happen) shares first
    const stats = this.ents.map((e) => (e === this.ends.winner ? `${e.hearts} heart${e.hearts === 1 ? '' : 's'} left` : 'Popped!'));
    const k = this.real.length;
    const w = this.ends.winner;
    this.api.finish({ placements: place.slice(0, k), stats: stats.slice(0, k), focus: w ? { x: w.x, y: w.y - w.a.height * 0.6 } : undefined });
  }

  destroy() {
    if (this.npc) input.releaseAI(this.npc.ctrl);
    if (this.fuseLoop) this.fuseLoop.stop();
  }

  // -------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const P = this.pres, p = e.p, prof = aiProfile(p), ctrl = p.ctrl;
    const lvl = clamp(p.aiLevel ?? 0, 0, 2);
    if (!e.ai) e.ai = { t: 0, plan: null, wanderT: 0, wx: e.x, wy: e.y, dodged: false };
    const ai = e.ai;
    ai.t += dt;
    if (P.holder === e && P.state === 'held') {
      // Holding: pick a friend, walk a little closer if they're far, aim (with
      // a level-dependent wobble) and throw after a short think.
      if (!ai.plan || ai.plan.target.state !== 'ring') {
        const opts = this.ents.filter((o) => o !== e && o.state === 'ring');
        if (!opts.length) { ctrl.move(0, 0); return; }
        opts.sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y));
        let wait = reactionTime(p) + rand(0.15, 0.5);
        const dither = lvl === 0 && chance(0.4);
        if (dither) { wait += rand(1.0, 2.2); e.a.emote('question', 1.4); }   // Easy dithers: risky and funny
        ai.plan = { target: chance(0.6) ? opts[0] : pick(opts), wait, err: rand(-1, 1) * [0.32, 0.16, 0.06][lvl], t: 0 };
      }
      const pl = ai.plan, t = pl.target;
      pl.t += dt;
      const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (d > 520) ctrl.move(dx / d, dy / d); else ctrl.move(0, 0);
      const c = Math.cos(pl.err), sn = Math.sin(pl.err);
      ctrl.aim((dx / d) * c - (dy / d) * sn, (dx / d) * sn + (dy / d) * c);
      const hurry = prof.mistake < 0.2 ? 1 - P.heat * 0.55 : 1;
      if (pl.t >= pl.wait * hurry && e.holdT >= MIN_HOLD && d <= RANGE) { ctrl.press('rt'); ai.plan = null; ctrl.move(0, 0); }
      return;
    }
    ai.plan = null;
    // Not holding. If the present is flying at me, maybe dash out of its way.
    if (P.state === 'flying' && P.from !== e) {
      const rx = e.x - P.gx, ry = e.y - P.gy, along = rx * P.ux + ry * P.uy;
      const side = Math.abs(rx * P.uy - ry * P.ux);
      if (!ai.dodged && along > 0 && along / THROW_V < 0.32 && side < CATCH_R * e.a.scale * 1.2) {
        ai.dodged = true;
        if (e.dashCd <= 0 && chance([0.12, 0.3, 0.5][lvl])) {
          const sx = rx * P.uy - ry * P.ux >= 0 ? 1 : -1;   // dash sideways, away from the line
          ctrl.move(P.uy * sx, -P.ux * sx); ctrl.press('lt');
          return;
        }
      }
    } else ai.dodged = false;
    // Otherwise wander, keeping some distance from whoever has the present.
    ai.wanderT -= dt;
    const h = P.holder && P.holder !== e && P.holder.state === 'ring' ? P.holder : null;
    if (ai.wanderT <= 0) {
      ai.wanderT = rand(0.8, 2.0);
      let wx = AREA.cx + rand(-0.85, 0.85) * AREA.rx, wy = AREA.cy + rand(-0.8, 0.8) * AREA.ry;
      if (h) {
        // keep away from the holder, but each CPU heads off at its own angle so the
        // others don't all bunch up on the one far side of the rug
        const fan = ((e.i * 0.618) % 1 - 0.5) * 2.4 + rand(-0.3, 0.3);
        const away = Math.atan2((e.y - h.y) * 1.8, e.x - h.x) + fan;
        wx = e.x + Math.cos(away) * rand(140, 280); wy = e.y + (Math.sin(away) / 1.8) * rand(140, 280);
        // aim inside the play oval, not into its edge where everyone would pile up
        const nx = (wx - AREA.cx) / AREA.rx, ny = (wy - AREA.cy) / AREA.ry, r = Math.hypot(nx, ny);
        if (r > 0.85) { wx = AREA.cx + (nx / r) * 0.85 * AREA.rx; wy = AREA.cy + (ny / r) * 0.85 * AREA.ry; }
      }
      ai.wx = wx; ai.wy = wy;
    }
    const dx = ai.wx - e.x, dy = ai.wy - e.y, d = Math.hypot(dx, dy);
    if (d > 30) ctrl.move((dx / d) * 0.7, (dy / d) * 0.7); else ctrl.move(0, 0);
  }

  // ------------------------------------------------------------------ draw
  draw(g) {
    this.drawBackground(g);
    const P = this.pres;
    const holder = P.state === 'held' ? P.holder : null;
    const order = this.ents.slice().sort((a, b) => a.a.y - b.a.y);
    // target highlight under the actors
    if (holder && !this.ends) this.drawTargetRing(g, holder);
    for (const e of order) if (e.state !== 'out') this.drawEnt(g, e);
    if (holder && !this.ends) this.drawAimArrow(g, holder);
    this.drawPresentWorld(g);
    this.drawSootPuff(g);
    for (const e of order) if (e.state !== 'out') this.drawOverlay(g, e);
  }

  // Soot cloud bursting over the popped player's head (the smoke/dust particles
  // stay as the procedural part of the effect either way).
  drawSootPuff(g) {
    const sp = this.sootPuff;
    if (!sp) return;
    const k = (this.t - sp.t0) / 1.3;
    if (k >= 1 || k < 0) { this.sootPuff = null; return; }
    const grow = 0.55 + 0.45 * ease.outBack(clamp(k * 3, 0, 1)) + k * 0.25;
    const w = sp.s * 1.9 * grow;
    g.save(); g.translate(sp.x, sp.y - k * 60); g.rotate(Math.sin(k * 5) * 0.05);
    drawArt(g, 'prop/soot-puff', 0, 0, w, w * 0.72, { alpha: k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45 });
    g.restore();
  }

  drawHUD(g) {
    // spectators stay in screen space so they never get cropped by the camera
    for (const e of this.ents) if (e.state === 'out') { this.drawEnt(g, e); this.drawOverlay(g, e); }
    this.drawHud(g);
  }

  followCamera() {
    const cam = this.cam; if (!cam) return;
    const P = this.pres;
    if (this.ends && this.ends.winner) { const w = this.ends.winner; cam.follow(w.x, w.y - 80, 1.25, 2.5); return; }
    if (P.state === 'held' || P.state === 'flying' || P.state === 'returning') {
      const pos = this.presPos();
      cam.follow(lerp(CX, pos.x, 0.22), lerp(CY - 40, pos.y, 0.22), 1.06 + 0.05 * P.heat, 1.4);
    } else cam.follow(CX, H / 2, 1.0, 1.4);
  }

  drawEnt(g, e) {
    const a = e.a;
    const ringCol = e.state === 'ring' || e.state === 'elimWait' ? e.p.color : false;
    a.draw(g, { ring: ringCol, alpha: 1 });
  }

  drawOverlay(g, e) {
    const a = e.a, P = this.pres;
    const top = a.y - a.height - 22;
    const emo = a.emotes.length ? 48 : 0;
    const isHolder = P.holder === e && P.state === 'held';
    if (e.state === 'ring' || e.state === 'elimWait') {
      // hearts above the head
      this.drawHearts(g, e, a.x, top - emo - 6 - (isHolder ? 78 : 0));
      ui.playerTag(g, e.p, a.x, top - emo - 34 - (isHolder ? 78 : 0));
      if (isHolder && !e.p.isAI && e.holdT > 0.6 && !this.ends) {
        ui.glyph(g, e.p.ctrl.kind === 'pad' ? 'rt' : 'a', a.x + 92, a.y - a.height - 28, 54, { pulse: true });
      }
    } else {
      ui.playerTag(g, e.p, a.x, top - emo - 8);
    }
  }

  drawHearts(g, e, x, y) {
    const n = this.hearts0, s = 17;
    const w = n * (s * 1.6);
    const sh = e.heartShake > 0 ? Math.sin(this.t * 60) * 3 * e.heartShake : 0;
    for (let k = 0; k < n; k++) {
      g.save(); g.translate(x - w / 2 + s * 0.8 + k * s * 1.6 + sh, y);
      const full = k < e.hearts;
      if (full) drawHeartShape(g, s * 1.6, '#ff4f8b');
      else { g.globalAlpha = 0.5; drawHeartShape(g, s * 1.6, '#8a8296'); }
      g.restore();
    }
  }

  drawTargetRing(g, h) {
    const t = this.aimTarget(h);
    if (!t || t.state !== 'ring') return;
    const pul = 0.5 + 0.5 * Math.sin(this.t * 8);
    const rx = Math.max(60, t.a.width * 0.55) * (t.a.scale / t.sc);
    g.save(); g.translate(t.x, t.y + 2);
    g.lineWidth = 9; g.strokeStyle = '#ffffff'; g.globalAlpha = 0.6 + 0.4 * pul;
    g.beginPath(); g.ellipse(0, 0, rx + pul * 8, (rx + pul * 8) * 0.32, 0, 0, TAU); g.stroke();
    g.lineWidth = 5; g.strokeStyle = h.p.color; g.globalAlpha = 1;
    g.beginPath(); g.ellipse(0, 0, rx + pul * 8, (rx + pul * 8) * 0.32, 0, 0, TAU); g.stroke();
    g.fillStyle = h.p.color; g.globalAlpha = 0.28; g.fill();
    g.restore();
  }

  /** Dashed arrow along the aim: to the friend it would hit, or its full range (a miss). */
  drawAimArrow(g, h) {
    const t = this.aimTarget(h);
    const x0 = h.x, y0 = h.y - h.a.height * 0.55;
    let ux = h.aimX, uy = h.aimY, len = RANGE * 0.55;
    if (t) { const dx = t.x - h.x, dy = t.y - h.y, d = Math.hypot(dx, dy) || 1; ux = dx / d; uy = dy / d; len = Math.max(0, d - 80); }
    const sx = x0 + ux * 70, sy = y0 + uy * 50, ex = x0 + ux * len, ey = y0 + uy * len * (t ? 1 : 0.8);
    if (Math.hypot(ex - sx, ey - sy) < 30) return;
    const ang = Math.atan2(ey - sy, ex - sx);
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalAlpha = t ? 1 : 0.55;   // faint when the throw would miss
    g.strokeStyle = '#24163f'; g.lineWidth = 22; g.globalAlpha *= 0.9;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.globalAlpha = t ? 1 : 0.6;
    g.setLineDash([26, 16]); g.lineDashOffset = -this.t * 90;
    g.strokeStyle = '#ffffff'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.setLineDash([]);
    g.translate(ex, ey); g.rotate(ang);
    const pul = 1 + Math.sin(this.t * 10) * 0.08;
    g.scale(pul, pul);
    g.beginPath(); g.moveTo(44, 0); g.lineTo(-10, -34); g.lineTo(-10, 34); g.closePath();
    g.fillStyle = h.p.color; g.fill(); g.lineWidth = 8; g.strokeStyle = '#24163f'; g.stroke();
    g.restore();
  }

  drawPresentWorld(g) {
    const P = this.pres;
    if (P.state === 'rest' || P.state === 'popping') return;
    const pos = this.presPos();
    const sh = P.heat * 6;
    const flying = P.state === 'flying' || P.state === 'returning';
    const big = flying ? 1.0 : 1 + Math.sin(this.t * (6 + P.heat * 20)) * 0.03 * (1 + P.heat * 2);
    g.save();
    g.translate(pos.x + Math.sin(this.t * 48) * sh * 0.5, pos.y + Math.cos(this.t * 41) * sh * 0.4);
    if (flying) g.rotate(P.spin * 3.2 * 0.3 + pos.k * 7);
    else g.rotate(Math.sin(this.t * 30) * 0.05 * P.heat * 2);
    const size = 92 * (flying ? 1 : this.holderScale());
    g.scale(big, big);
    const presentKey = P.heat > 0.55 && art('prop/present-ticking') ? 'prop/present-ticking' : 'prop/present';
    const pimg = art(presentKey);
    if (pimg) {
      // Generated present: the procedural red glow (cached bitmap) behind it and a
      // red-hot copy cross-faded in as the fuse burns down.
      const pul = 0.5 + 0.5 * Math.sin(this.t * (6 + P.heat * 18));
      if (P.heat > 0.05) {
        const r = (100 + P.heat * 30) * (size / 90);
        g.save(); g.globalAlpha *= (0.35 + 0.45 * pul) * P.heat; g.drawImage(presentGlow(), -r, -r, r * 2, r * 2); g.restore();
      }
      const fs = Math.min(size * 1.2 / pimg.width, size * 1.2 / pimg.height), dw = pimg.width * fs, dh = pimg.height * fs;
      g.drawImage(pimg, -dw / 2, -dh / 2, dw, dh);
      if (P.heat > 0.1) {
        g.save(); g.globalAlpha *= clamp((P.heat - 0.1) * 1.1, 0, 0.9) * (0.85 + 0.15 * pul);
        g.drawImage(hotArt(presentKey, pimg), -dw / 2, -dh / 2, dw, dh); g.restore();
      }
    } else drawPresent(g, 0, 0, size, P.heat, this.t, 1);
    g.restore();
    // shadow while flying
    if (flying) {
      g.save(); g.globalAlpha = 0.2; g.fillStyle = '#24163f';
      g.beginPath(); g.ellipse(pos.gx, pos.gy, 34, 10, 0, 0, TAU); g.fill(); g.restore();
    }
  }

  holderScale() { const h = this.pres.holder; return h ? clamp(h.a.scale / 1, 0.7, 1.05) : 1; }

  drawHud(g) {
    const n = this.players.length;
    ui.scoreboard(g, this.players, this.ents.map(() => ''), { y: 36, out: this.ents.map((e) => e.state === 'leaving' || e.state === 'out') });
    // hearts on the chips
    const chipW = Math.min(260, (W - 120) / n - 16);
    const total = n * chipW + (n - 1) * 16;
    let x = (W - total) / 2;
    this.ents.forEach((e) => {
      const gone = e.state === 'leaving' || e.state === 'out';
      g.save(); if (gone) g.globalAlpha = 0.45;
      const s = Math.min(15, (chipW - 110) / this.hearts0 / 1.5);
      for (let k = 0; k < this.hearts0; k++) {
        g.save(); g.translate(x + chipW - 28 - (this.hearts0 - 1 - k) * s * 1.7, 36 + 50);
        if (k < e.hearts) drawHeartShape(g, s * 1.7, '#ff4f8b'); else { g.globalAlpha *= 0.4; drawHeartShape(g, s * 1.7, '#8a8296'); }
        g.restore();
      }
      g.restore();
      x += chipW + 16;
    });
    const P = this.pres;
    if (!this.ends && P.state === 'held' && this.round === 1 && P.pass === 0 && this.t < 12) {
      const pads = this.ents.some((e) => !e.p.isAI && e.p.ctrl.kind === 'pad');
      ui.text(g, pads ? 'Run with the left stick, aim with the right stick, A to throw!' : 'Run around, then press A to throw the way you run!', W / 2, 1010, { size: 40, color: '#ffffff' });
    }
    if (this.ends && this.ends.winner) {
      const nm = playerName(this.ends.winner.p);
      ui.banner(g, `${nm} ${(charById(this.ends.winner.p.charId) || {}).plural ? 'win' : 'wins'}!`, this.ends.t, { y: 300, size: 110, color: '#ffd23f' });
    }
    // red vignette as the fuse runs low
    if (P.heat > 0.3 && (P.state === 'held' || P.state === 'flying' || P.state === 'returning')) {
      const k = (P.heat - 0.3) / 0.7, pul = 0.5 + 0.5 * Math.sin(this.t * (8 + 14 * P.heat));
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
      gr.addColorStop(0, 'rgba(255,40,60,0)'); gr.addColorStop(1, `rgba(255,40,60,${0.45 * k * (0.6 + 0.4 * pul)})`);
      g.save(); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    }
  }

  drawBackground(g) {
    const bg = art('bg/pass-the-present');
    if (bg) { g.drawImage(bg, 0, 0, W, H); this.drawRugLayer(g); return; }
    // wall
    const wall = g.createLinearGradient(0, 0, 0, 400); wall.addColorStop(0, '#ffc2de'); wall.addColorStop(1, '#ffe6f2');
    g.fillStyle = wall; g.fillRect(0, 0, W, 410);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = 0; x < W; x += 120) g.fillRect(x, 0, 60, 410);
    // dado rail
    g.fillStyle = '#ffffff'; g.fillRect(0, 380, W, 26); g.fillStyle = '#e8a6c8'; g.fillRect(0, 404, W, 6);
    // floor
    const fl = g.createLinearGradient(0, 410, 0, H); fl.addColorStop(0, '#edc088'); fl.addColorStop(1, '#c78d52');
    g.fillStyle = fl; g.fillRect(0, 410, W, H - 410);
    g.strokeStyle = 'rgba(120,70,30,0.22)'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const y = 410 + (i * i * 4.2) + i * 18; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let i = 0; i < 40; i++) { const x = (i * 197) % W, y0 = 420 + ((i * 131) % 600); g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 2, y0 + 70); g.stroke(); }
    // bunting
    drawBunting(g, this.t);
    // balloons
    for (const b of this.bulbs) {
      const by = 262 + Math.sin(this.t * 0.8 + b.p) * 10;
      g.save(); g.translate(b.x, by);
      const col = RAINBOW[(Math.round(b.x / 60)) % 7];
      g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 36); g.quadraticCurveTo(10, 70, -6, 112); g.stroke();
      g.fillStyle = col; g.strokeStyle = '#24163f'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(0, 0, 32, 40, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, 40); g.lineTo(-6, 52); g.lineTo(6, 52); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-10, -14, 6, 11, 0.5, 0, TAU); g.fill();
      g.restore();
    }
    // present pile + cake table at the back
    drawTable(g, 250, 420, this.t); drawTable(g, W - 250, 420, this.t, true);
    this.drawRugLayer(g);
  }

  // The round rug under the circle (the generated background has no rug).
  drawRugLayer(g) {
    // Rug art (prop/party-rug: a flat 960x368 oval at the game's 3/4 angle, edge to
    // edge). Sized (RX+150) wide like the procedural rug; a slight vertical stretch
    // keeps its rim outside the player ellipse.
    const rw = (RX + 150) * 2, rh = rw * 0.4;
    if (!drawArt(g, 'prop/party-rug', CX, CY + 18, rw, rh, { fit: 'stretch' })) drawRug(g, CX, CY + 14, RX + 150, RUG_RY + 78, this.confettiDots);
  }
}

// ---------------------------------------------------------------- drawing kit

function drawPresent(g, x, y, size, heat, t, alpha) {
  const s = size / 90;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= alpha;
  const pul = 0.5 + 0.5 * Math.sin(t * (6 + heat * 18));
  // glow
  if (heat > 0.05) {
    const gr = g.createRadialGradient(0, 0, 10, 0, 0, 100 + heat * 30);
    gr.addColorStop(0, `rgba(255,60,50,${(0.35 + 0.45 * pul) * heat})`); gr.addColorStop(1, 'rgba(255,60,50,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 130, 0, TAU); g.fill();
  }
  const mix = (a, b, k) => Math.round(a + (b - a) * k);
  const base = [mix(255, 235, heat), mix(111, 40, heat), mix(177, 50, heat)];   // pink -> red
  g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#24163f';
  // box
  g.fillStyle = `rgb(${base})`; ui.roundRect(g, -42, -26, 84, 66, 8); g.fill(); g.stroke();
  // lid
  g.fillStyle = `rgb(${mix(255, 255, heat)},${mix(140, 80, heat)},${mix(200, 90, heat)})`; ui.roundRect(g, -48, -42, 96, 24, 8); g.fill(); g.stroke();
  // ribbon
  g.fillStyle = '#ffd23f'; g.fillRect(-9, -42, 18, 82);
  g.strokeStyle = '#24163f'; g.lineWidth = 4; g.strokeRect(-9, -42, 18, 24); g.beginPath(); g.moveTo(-9, -18); g.lineTo(-9, 40); g.moveTo(9, -18); g.lineTo(9, 40); g.stroke();
  // bow
  g.fillStyle = '#ffd23f'; g.lineWidth = 5;
  g.beginPath(); g.ellipse(-20, -56, 20, 14, -0.5, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(20, -56, 20, 14, 0.5, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.arc(0, -48, 9, 0, TAU); g.fill(); g.stroke();
  // polka dots
  g.fillStyle = 'rgba(255,255,255,0.65)';
  for (const [dx, dy] of [[-28, 4], [26, 12], [-26, 28], [28, 32]]) { g.beginPath(); g.arc(dx, dy, 5, 0, TAU); g.fill(); }
  // spark on the bow when hot
  if (heat > 0.2) {
    g.save(); g.translate(0, -70); g.rotate(t * 8);
    g.fillStyle = '#fff6a8'; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? 6 : 14 + 6 * pul; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.restore();
  }
  g.restore();
}

// Red-hot copies of the present art (multiply-tinted once and cached) and the
// heat glow as a cached bitmap, so the art path builds nothing per frame.
const hotCache = new Map();
function hotArt(key, img) {
  let c = hotCache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const cg = c.getContext('2d');
  cg.drawImage(img, 0, 0);
  cg.globalCompositeOperation = 'multiply'; cg.fillStyle = '#ff5a3c'; cg.fillRect(0, 0, c.width, c.height);
  cg.globalCompositeOperation = 'destination-in'; cg.drawImage(img, 0, 0);
  hotCache.set(key, c);
  return c;
}
let glowBmp = null;
function presentGlow() {
  if (glowBmp) return glowBmp;
  glowBmp = document.createElement('canvas'); glowBmp.width = glowBmp.height = 128;
  const cg = glowBmp.getContext('2d');
  const gr = cg.createRadialGradient(64, 64, 64 * 10 / 130, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,60,50,1)'); gr.addColorStop(1, 'rgba(255,60,50,0)');
  cg.fillStyle = gr; cg.fillRect(0, 0, 128, 128);
  return glowBmp;
}

function drawRug(g, cx, cy, rx, ry, dots) {
  g.save();
  // scalloped edge
  g.fillStyle = '#ffffff'; g.strokeStyle = '#24163f'; g.lineWidth = 4;
  const n = 46;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; g.beginPath(); g.ellipse(cx + Math.cos(a) * (rx - 6), cy + Math.sin(a) * (ry - 3), rx * 0.035, ry * 0.07, 0, 0, TAU); g.fill(); }
  const rings = [[1, '#ff9ccf'], [0.9, '#fff3c4'], [0.8, '#8fe0c0'], [0.66, '#7fd3ff'], [0.5, '#c9a0ff'], [0.33, '#ffe066']];
  for (const [k, col] of rings) {
    g.beginPath(); g.ellipse(cx, cy, rx * k, ry * k, 0, 0, TAU); g.fillStyle = col; g.fill();
    if (k === 1) { g.lineWidth = 5; g.stroke(); }
  }
  g.beginPath(); g.ellipse(cx, cy, rx * 0.33, ry * 0.33, 0, 0, TAU); g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.25)'; g.stroke();
  if (dots) for (const d of dots) {
    const r = 0.34 + d.d * 0.6;
    g.save(); g.translate(cx + Math.cos(d.a) * rx * r, cy + Math.sin(d.a) * ry * r); g.rotate(d.r);
    g.fillStyle = d.c; g.globalAlpha = 0.8; g.fillRect(-8, -3, 16, 6); g.restore();
  }
  g.restore();
}

function drawBunting(g, t) {
  const letters = 'HAPPY BIRTHDAY';
  const cols = ['#ff6fb1', '#ffd23f', '#3fa7ff', '#36d17a', '#b58cff', '#ff9f1c'];
  let k = 0;
  const x0 = 120, x1 = W - 120, N = letters.length;
  g.save(); g.strokeStyle = '#24163f'; g.lineWidth = 4;
  g.beginPath();
  for (let i = 0; i <= 40; i++) { const u = i / 40, x = lerp(x0, x1, u), y = 128 + Math.sin(u * Math.PI) * 34; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N, x = lerp(x0, x1, u), y = 128 + Math.sin(u * Math.PI) * 34;
    if (letters[i] === ' ') continue;
    const sw = Math.sin(t * 1.5 + i) * 0.06;
    g.save(); g.translate(x, y); g.rotate(sw);
    g.beginPath(); g.moveTo(-30, 0); g.lineTo(30, 0); g.lineTo(0, 62); g.closePath();
    g.fillStyle = cols[k++ % cols.length]; g.fill(); g.stroke();
    ui.text(g, letters[i], 0, 19, { size: 32, color: '#fff', strokeWidth: 6, shadow: false });
    g.restore();
  }
  g.restore();
}

function drawTable(g, x, y, t, flip) {
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  // table
  g.fillStyle = '#fff'; g.strokeStyle = '#24163f'; g.lineWidth = 5;
  ui.roundRect(g, -120, -10, 240, 26, 10); g.fill(); g.stroke();
  g.fillStyle = '#e8a6c8'; g.fillRect(-100, 16, 18, 80); g.fillRect(82, 16, 18, 80);
  // stack of presents
  const boxes = [[-80, -52, 64, 44, '#7fd3ff'], [-8, -66, 54, 56, '#c9a0ff'], [-56, -86, 40, 34, '#ffd23f']];
  for (const [bx, by, bw, bh, col] of boxes) {
    g.fillStyle = col; ui.roundRect(g, bx, by, bw, bh, 6); g.fill(); g.stroke();
    g.fillStyle = '#ff6fb1'; g.fillRect(bx + bw / 2 - 5, by, 10, bh);
  }
  // cake
  g.fillStyle = '#fff3d6'; ui.roundRect(g, 50, -52, 62, 42, 10); g.fill(); g.stroke();
  g.fillStyle = '#ff9ccf'; ui.roundRect(g, 56, -80, 50, 32, 10); g.fill(); g.stroke();
  g.fillStyle = '#ffd23f'; g.fillRect(77, -104, 6, 24);
  g.fillStyle = '#ff9f1c'; g.beginPath(); g.ellipse(80, -110 + Math.sin(t * 9) * 1.5, 6, 10, 0, 0, TAU); g.fill();
  g.restore();
}
