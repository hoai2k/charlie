// Puppet Theater (Play Studio): a little puppet booth for everyone.
//   1. Set the stage: everyone moves a hand, picks a painted backdrop and
//      stands cardboard props on the stage (A picks up / places, B removes).
//      X swaps your puppet between "you on a stick" and a sock puppet.
//   2. Act 1: puppets pop up from behind the playboard. Move, hide (peekaboo!),
//      jump, twirl, make silly sounds and "talk" with picture bubbles from a
//      picture wheel. The audience laughs, gasps, awws and claps; the
//      applause meter fills for a big "Bravo!".
//   3. Curtains close, scene change (new backdrop + props), Act 2.
//   4. Instant replay of the best bits of each act, then a curtain call with
//      the shared photo-pose buttons, roses and confetti. Showcase finish.
import { W, H } from '../engine/canvas.js';
import { Actor, getBaseImage } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU, showstopper } from '../engine/util.js';
import { drawPortrait } from '../engine/sprites.js';
import { playerName } from '../state.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  NAVY, WIN, BOARD_Y, BOARD_B, FEET_Y, BACKDROPS, PROPS, PROP_BY_ID, THEME_PROPS, PICTURES, PIC_BY_ID,
  drawBackdrop, drawProp, propRect, drawRoom, drawBoothBack, drawBoothFront, drawCurtains,
  makeAudience, drawAudience, drawSock, sockHair, drawStick, drawPictureBubble, drawPicture, drawRose, } from './puppet-theater/art.js';

/** A recorded sound when it exists, else a synth stand-in. */
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const SETUP_TIME = [45, 32];
const ACT_TIME = 35;
const REPLAY_LEN = 10;
const CALL_TIME = 10;
const REC_HZ = 15;
const SHELF = { x: 226, y: 836, w: 1468, h: 228 };
const CARD = { y: 852, w: 196, h: 92, gap: 18 };
const TILE = { y: 960, w: 96, h: 90, gap: 9 };
const SILLY = [
  { k: 'boing', fb: 'bounce', pop: 'Boing!' },
  { k: 'pt-honk', fb: 'bonk', pop: 'Honk!' },
  { k: 'squeak', fb: 'pop', pop: 'Squeak!' },
  { k: 'pt-slide-whistle', fb: 'whoosh', pop: 'Wheee!' },
  { k: 'tiny-squeak', fb: 'blip', pop: 'Eep!' },
  { k: 'pt-pop', fb: 'bigpop', pop: 'Pop!' },
];
// D-pad quick pictures on a gamepad.
const DPAD_PICS = { up: 'heart', right: 'star', down: 'wow', left: 'sad' };
// Sock-puppet moods for the photo poses at the curtain call.
const POSE_MOOD = { surprised: 'wow', photo: 'happy', 'pose-twirl': 'spin', sad: 'sad', giggle: 'laugh', tumble: 'wow', 'hip-bump': 'happy', 'dance-star': 'happy', sit: 'sleep', 'high-five': 'happy', strike3: 'happy', dizzy: 'wow', pout: 'sad' };

import { meta } from './puppet-theater.meta.js';

export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.finished = false;
    this.phase = 'intro';
    this.phaseT = 0;
    this.sceneIdx = 0;
    this.scenes = [{ backdrop: 'castle', props: [] }, { backdrop: 'sea', props: [] }];
    const bds = shuffle(BACKDROPS.map((b) => b.id));
    this.scenes[0].backdrop = bds[0]; this.scenes[1].backdrop = bds[1];
    this.bdFade = null;            // { from, t } cross-fade when the backdrop changes
    this.audience = makeAudience();
    this.audSndT = 0;
    this.meter = 0; this.bravos = 0;
    this.roses = [];
    this.pops = [];                // audience reaction words ("Ha ha!")
    this.rec = [null, null];
    this.curtain = 1;              // start closed
    this.trans = null;
    this.banner = null;
    this.humans = this.players.filter((p) => !p.isAI);
    this.propLimit = clamp(Math.floor(16 / this.n), 2, 5);
    const h = this.n <= 3 ? 250 : this.n <= 5 ? 220 : 185;
    this.puppetH = h;
    this.pp = this.players.map((p, i) => this.makePuppet(p, i));
    // Setting the stage and each act run on a clock (the play scene draws it).
    api.limit(() => (this.phase === 'setup' && !this.trans ? Math.max(0, this.setupTime - this.phaseT) : null), { showAt: Infinity, x: W / 2, y: 62 });
    api.limit(() => (this.phase === 'act' && !this.trans ? Math.max(0, ACT_TIME - this.phaseT + 0.8) : null), { showAt: Infinity, x: W / 2, y: 62 });
    this.startTransition('Puppet Theater', 'Set the stage!', () => this.startSetup(0), { first: true });
  }

  makePuppet(p, i) {
    const a = new Actor(p);
    a.scale = this.puppetH / a.leader.h;
    const span = WIN.x1 - WIN.x0 - 200;
    const x = WIN.x0 + 100 + (this.n === 1 ? span / 2 : (span * i) / (this.n - 1));
    a.x = x; a.y = FEET_Y + this.puppetH * 0.6; a.facing = x < W / 2 ? 1 : -1; a.snap();
    const sock = p.isAI ? chance(0.3) : false;
    return {
      p, i, a, kind: sock ? 'sock' : 'stick',
      x, baseY: a.y, liftV: 0, z: 0, vz: 0, vx: 0, tilt: 0, spinT: 0, spin: 1,
      cur: { x: WIN.x0 + 160 + ((WIN.x1 - WIN.x0 - 320) * (i + 0.5)) / this.n, y: 430 }, held: null, hover: null,
      ready: false, silly: randInt(0, SILLY.length - 1),
      laughs: 0, peeks: 0, pics: 0, tricks: 0, chats: 0, props: 0,
      bubble: null, lastPic: 'heart', wheel: null, hiddenT: 0, recent: {}, landProp: false,
      sock: { mouth: 0, eyesX: 0, eyesY: 0, ex: 0, ey: 0, blink: 0, blinkT: rand(1, 4), tilt: 0, spin: 1, mood: null, moodT: 0, talkT: 0 },
      hair: sockHair(i + randInt(0, 3)),
      ai: p.isAI ? { t: rand(0.4, 1.4), plan: [], step: null, targetX: x, hideT: 0, wait: 0 } : null,
      poof: 0,
    };
  }

  /** Half-width of a puppet's formation (trios and pairs are wide), for keeping it on stage. */
  halfW(pp) {
    if (pp.kind === 'sock') return 80;
    if (!pp._half) {
      let e = 0;
      for (const m of pp.a.char.members) {
        const img = getBaseImage(m.asset);
        const w = img ? (img.width / img.height) * m.h : m.h * 0.6;
        e = Math.max(e, (Math.abs(m.dx) + w * 0.4) * pp.a.scale);
      }
      pp._half = Math.max(60, e);
    }
    return pp._half;
  }
  clampX(pp, x) { const h = this.halfW(pp) + 50; return clamp(x, WIN.x0 + h, WIN.x1 - h); }

  // ---------------------------------------------------------------------------
  // Phases

  startTransition(title, sub, mid, o = {}) {
    this.trans = { t: o.first ? 0.7 : 0, title, sub, mid, called: false, hold: o.hold ?? 1.4 };
    if (!o.first) snd('pt-curtain', 'whoosh', { vol: 0.7 });
  }

  updateTransition(dt) {
    const T = this.trans; if (!T) return;
    T.t += dt;
    const close = 0.7, hold = close + T.hold, open = hold + 0.85;
    if (T.t < close) this.curtain = ease.inOutQuad(clamp(T.t / close, 0, 1));
    else if (T.t < hold) {
      this.curtain = 1;
      if (!T.called) { T.called = true; T.mid && T.mid(); sfx('drumroll', { vol: 0.5 }); }
    } else {
      if (!T.opened) { T.opened = true; snd('pt-curtain', 'whoosh', { vol: 0.7 }); }
      this.curtain = 1 - ease.inOutQuad(clamp((T.t - hold) / (open - hold), 0, 1));
      if (T.t >= open) { this.curtain = 0; this.trans = null; if (T.after) T.after(); this.onOpened(); }
    }
  }

  onOpened() {
    if (this.phase === 'act') {
      snd('applause', 'cheer', { vol: 0.6 });
      this.audClap(1);
      for (const pp of this.pp) { pp.a.playOnce('wave', 1.0, 'idle'); }
    } else if (this.phase === 'setup') sfx('magic', { vol: 0.6 });
  }

  startSetup(idx) {
    this.phase = 'setup'; this.phaseT = 0; this.sceneIdx = idx;
    this.scene = this.scenes[idx];
    this.scene.props = [];
    this.bdFade = null;
    for (const pp of this.pp) {
      pp.ready = false; pp.held = null; pp.props = 0; pp.bubble = null; pp.wheel = null;
      pp.z = 0; pp.vz = 0; pp.spinT = 0;
      pp.a.y = pp.baseY = FEET_Y + this.puppetH * 0.62; pp.a.setPose('idle');
      pp.cur.x = WIN.x0 + 160 + ((WIN.x1 - WIN.x0 - 320) * (pp.i + 0.5)) / this.n; pp.cur.y = 430;
      if (pp.ai) { pp.ai.plan = null; pp.ai.step = null; pp.ai.t = rand(0.6, 1.6); }
    }
    this.setupTime = SETUP_TIME[idx];
  }

  startAct() {
    this.phase = 'act'; this.phaseT = 0;
    this.rec[this.sceneIdx] = { frames: [], events: [], backdrop: this.scene.backdrop, props: this.scene.props.map((pr) => ({ ...pr })) };
    this.recT = 0;
    for (const pp of this.pp) {
      if (pp.held && pp.held.isNew) pp.held = null;
      else if (pp.held) { this.scene.props.push(pp.held); pp.held = null; }
      pp.a.y = pp.baseY = FEET_Y + this.puppetH + 60;   // start hidden, then pop up
      pp.popDelay = 0.3 + pp.i * 0.18;
      pp.hiddenT = 0; pp.recent = {}; pp.bubble = null; pp.wheel = null;
      if (pp.ai) { pp.ai.t = rand(0.8, 2); pp.ai.targetX = pp.x; pp.ai.hideT = 0; }
    }
    this.rec[this.sceneIdx].props = this.scene.props.map((pr) => ({ ...pr }));
    this.tagT = 5;
  }

  startReplay() {
    this.phase = 'replay'; this.phaseT = 0;
    this.replayIdx = 0;
    this.beginReplaySegment(0);
  }

  beginReplaySegment(k) {
    const R = this.rec[k];
    this.replayIdx = k;
    if (!R || !R.frames.length) { this.replay = null; return; }
    this.scene = { backdrop: R.backdrop, props: R.props.map((pr) => ({ ...pr })) };
    const dur = R.frames.length / REC_HZ;
    const len = Math.min(REPLAY_LEN, dur);
    // The window with the most audience reactions.
    let best = 0, bestS = Math.max(0, dur - len);
    for (let s = 0; s <= dur - len + 0.01; s += 0.5) {
      const c = R.events.filter((e) => e.type === 'fun' && e.t >= s && e.t < s + len).length;
      if (c > best) { best = c; bestS = s; }
    }
    this.replay = { R, s: bestS, e: bestS + len, t: bestS, last: bestS };
    for (const pp of this.pp) { pp.bubble = null; pp.wheel = null; pp.a.clearEmotes(); }
    this.applyReplayFrame(bestS);
  }

  startCall() {
    this.phase = 'call'; this.phaseT = 0;
    this.scene = { backdrop: this.scenes[this.sceneIdx].backdrop, props: this.scenes[this.sceneIdx].props.map((pr) => ({ ...pr })) };
    const span = WIN.x1 - WIN.x0 - 240;
    this.pp.forEach((pp, i) => {
      pp.x = WIN.x0 + 120 + (this.n === 1 ? span / 2 : (span * i) / (this.n - 1));
      pp.a.x = pp.x; pp.z = 0; pp.vz = 0; pp.spinT = 0; pp.bubble = null; pp.wheel = null;
      pp.a.y = pp.baseY = FEET_Y - 10; pp.a.facing = 1; pp.a.snap();
      pp.a._once = null; pp.a.setPose('idle'); pp.a.playOnce('bow', 1.2, 'idle');
      pp.sock.mood = 'happy'; pp.sock.moodT = 1.2;
      pp.poseCD = 0;
      if (pp.ai) pp.ai.t = rand(0.3, 1.0);
    });
    this.roses = [];
    this.roseT = 0.4;
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    for (const pp of this.pp) if (pp.ai) { pp.p.ctrl.move(0, 0); }
    // with kids playing, only a kid can be the Showstopper
    const highlight = this.n > 1 ? showstopper(this.pp.map((pp) => pp.p), this.pp.map((pp) => pp.laughs)) : null;
    const stats = this.pp.map((pp) => {
      const bits = [`${pp.laughs} laugh${pp.laughs === 1 ? '' : 's'}`];
      if (pp.peeks) bits.push(`${pp.peeks} peekaboo${pp.peeks === 1 ? '' : 's'}`);
      else if (pp.chats) bits.push(`${pp.chats} chat${pp.chats === 1 ? '' : 's'}`);
      else if (pp.pics) bits.push(`${pp.pics} picture${pp.pics === 1 ? '' : 's'}`);
      else if (pp.tricks) bits.push(`${pp.tricks} twirl${pp.tricks === 1 ? '' : 's'}`);
      return bits.join(' · ');
    });
    const hp = highlight !== null ? this.pp[highlight] : null;
    const focus = hp ? { x: hp.a.x, y: hp.a.y - this.puppetH * 0.6, zoom: 1.25 } : { x: W / 2, y: 520, zoom: 1.1 };
    this.api.finish({ showcase: true, highlight, stats, title: this.bravos >= 3 ? 'Standing Ovation!' : 'Bravo!', focus });
  }

  onDone() {
    if (this.phase === 'call') { this.finishGame(); return; }
    if (this.trans && this.trans.title === 'Curtain Call!') return;
    this.startTransition('Curtain Call!', 'Take a bow!', () => this.startCall());
  }

  // ---------------------------------------------------------------------------
  // Update

  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2) this.banner = null; }
    if (this.bdFade) { this.bdFade.t += dt * 2.5; if (this.bdFade.t >= 1) this.bdFade = null; }
    this.updateTransition(dt);
    this.audSndT -= dt;
    this.tagT = Math.max(0, (this.tagT || 0) - dt);
    for (const s of this.audience) { s.laugh = Math.max(0, s.laugh - dt * 0.9); s.clap = Math.max(0, s.clap - dt * 0.6); }
    for (const pp of this.pops) pp.t += dt;
    this.pops = this.pops.filter((q) => q.t < 1.3);
    for (const pr of (this.scene ? this.scene.props : [])) { pr.wob = damp(pr.wob || 0, 0, 3, dt); pr.wv = (pr.wv || 0) * Math.exp(-3 * dt) - (pr.wr || 0) * 60 * dt; pr.wr = (pr.wr || 0) + pr.wv * dt; }

    if (this.phase === 'setup') this.updateSetup(dt);
    else if (this.phase === 'act') this.updateAct(dt);
    else if (this.phase === 'replay') this.updateReplay(dt);
    else if (this.phase === 'call') this.updateCall(dt);
    for (const pp of this.pp) this.animPuppet(pp, dt);
    this.updateRoses(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    for (const s of this.audience) { s.laugh = Math.max(0, s.laugh - dt * 0.5); s.clap = Math.max(0.3, s.clap - dt * 0.2); }
    for (const pp of this.pp) this.animPuppet(pp, dt);
    this.updateRoses(dt);
  }

  // ---- setup -------------------------------------------------------------
  cardRect(k) {
    const total = BACKDROPS.length * CARD.w + (BACKDROPS.length - 1) * CARD.gap;
    const x0 = W / 2 - total / 2 - 120;
    return { x: x0 + k * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
  }
  readyRect() { const c = this.cardRect(BACKDROPS.length - 1); return { x: c.x + c.w + 40, y: CARD.y, w: 250, h: CARD.h }; }
  tileRect(k) {
    const total = PROPS.length * TILE.w + (PROPS.length - 1) * TILE.gap;
    const x0 = W / 2 - total / 2;
    return { x: x0 + k * (TILE.w + TILE.gap), y: TILE.y, w: TILE.w, h: TILE.h };
  }
  inRect(r, x, y, pad = 0) { return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad; }
  overStage(x, y) { return x > WIN.x0 + 20 && x < WIN.x1 - 20 && y > WIN.y0 + 10 && y < BOARD_Y + 30; }

  /** What the hand is over: { kind: 'card'|'ready'|'tile'|'prop'|'stage'|null, k }. */
  hoverAt(x, y) {
    if (y > SHELF.y - 6) {
      for (let k = 0; k < BACKDROPS.length; k++) if (this.inRect(this.cardRect(k), x, y, 6)) return { kind: 'card', k };
      if (this.inRect(this.readyRect(), x, y, 6)) return { kind: 'ready' };
      for (let k = 0; k < PROPS.length; k++) if (this.inRect(this.tileRect(k), x, y, 4)) return { kind: 'tile', k };
      return { kind: null };
    }
    const props = this.scene.props;
    for (let k = props.length - 1; k >= 0; k--) if (this.inRect(propRect(props[k]), x, y, 6)) return { kind: 'prop', k, pr: props[k] };
    if (this.overStage(x, y)) return { kind: 'stage' };
    return { kind: null };
  }

  ownedProps(pp) { return this.scene.props.filter((pr) => pr.owner === pp.i).length + (pp.held && pp.held.isNew ? 1 : 0); }

  setBackdrop(id, pp) {
    if (this.scene.backdrop === id) { sfx('blip', { vol: 0.4 }); return; }
    this.bdFade = { from: this.scene.backdrop, t: 0 };
    this.scene.backdrop = id;
    snd('pt-backdrop', 'swap', { vol: 0.7 });
    particles.burst(W / 2, 420, { type: 'sparkle', count: 14, speed: [100, 380] });
    if (pp) { pp.a.playOnce('surprised', 0.6, 'idle'); pp.sock.mood = 'wow'; pp.sock.moodT = 0.6; }
    for (const q of this.pp) if (chance(0.5)) q.a.emote(pick(['sparkle', 'heart', 'star']), 1);
  }

  updateSetup(dt) {
    let allReady = true;
    for (const pp of this.pp) {
      if (pp.ai) this.aiSetup(pp, dt);
      this.updateHand(pp, dt);
      if (!pp.ready) allReady = false;
    }
    // Humans decide when the scene is ready; CPUs never hold them up.
    const humansReady = this.humans.length ? this.pp.filter((pp) => !pp.p.isAI).every((pp) => pp.ready) : allReady;
    if (!this.trans) {
      if (humansReady && this.phaseT > 2.5 && !this.readyHold) { this.readyHold = 0.9; this.banner = { text: 'Places, everyone!', t: 0 }; sfx('fanfare', { vol: 0.6 }); }
      if (this.readyHold) { this.readyHold -= dt; if (this.readyHold <= 0) { this.readyHold = 0; this.toAct(); } }
      else if (this.phaseT >= this.setupTime) this.toAct();
    }
  }

  toAct() {
    if (this.trans) return;
    this.readyHold = 0;
    const k = this.sceneIdx;
    this.startTransition(`Act ${k + 1}`, BACKDROPS.find((b) => b.id === this.scene.backdrop).name, () => this.startAct());
  }

  updateHand(pp, dt) {
    const c = pp.p.ctrl, cur = pp.cur;
    const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    // speeds up the longer the stick is held, so small nudges stay precise
    pp.handHold = Math.hypot(mx, my) > 0.15 ? (pp.handHold || 0) + dt : 0;
    const sp = 980 * (0.35 + 0.65 * clamp(pp.handHold / 0.5, 0, 1));
    cur.x = clamp(cur.x + mx * sp * dt, 40, W - 40);
    cur.y = clamp(cur.y + my * sp * dt, WIN.y0 + 20, H - 30);
    if (this.trans) return;
    const hv = this.hoverAt(cur.x, cur.y);
    pp.hover = hv;
    if (pp.held) {
      pp.held.x = cur.x; pp.held.y = cur.y + (PROP_BY_ID[pp.held.id].stand ? PROP_BY_ID[pp.held.id].h * 0.5 : 0);
    }
    // backdrop: d-pad left/right on a pad, LB/RB on anything
    const step = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0) + (pad ? (c.pressed('right') ? 1 : 0) - (c.pressed('left') ? 1 : 0) : 0);
    if (step) {
      const k = BACKDROPS.findIndex((b) => b.id === this.scene.backdrop);
      this.setBackdrop(BACKDROPS[(k + step + BACKDROPS.length) % BACKDROPS.length].id, pp);
    }
    if (c.pressed('x')) this.swapPuppet(pp);
    if (c.pressed('y')) this.toggleReady(pp);
    if (c.pressed('a')) {
      if (pp.held) {
        if (this.overStage(cur.x, cur.y)) this.placeHeld(pp);
        else { // back to the shelf
          if (!pp.held.isNew) { /* a moved prop dropped off stage goes away */ particles.burst(cur.x, cur.y, { type: 'smoke', count: 6 }); }
          pp.held = null; sfx('back', { vol: 0.5 });
        }
      } else if (hv.kind === 'card') this.setBackdrop(BACKDROPS[hv.k].id, pp);
      else if (hv.kind === 'ready') this.toggleReady(pp);
      else if (hv.kind === 'tile') {
        if (this.ownedProps(pp) >= this.propLimit) {
          sfx('error', { vol: 0.5 }); this.popText(cur.x, cur.y - 40, `${this.propLimit} props each!`, '#ff6fb1');
        } else {
          const d = PROPS[hv.k];
          pp.held = { id: d.id, x: cur.x, y: cur.y, owner: pp.i, isNew: true, s: 1, wr: 0, wv: 0, ph: rand(TAU) };
          sfx('pop', { vol: 0.6 });
        }
      } else if (hv.kind === 'prop') {
        const pr = hv.pr;
        this.scene.props.splice(this.scene.props.indexOf(pr), 1);
        pr.isNew = false; pp.held = pr; sfx('select', { vol: 0.6 });
      }
    } else if (c.pressed('b')) {
      if (pp.held) { particles.burst(cur.x, cur.y, { type: 'smoke', count: 8 }); sfx('back', { vol: 0.5 }); pp.held = null; }
      else if (hv.kind === 'prop') {
        this.scene.props.splice(this.scene.props.indexOf(hv.pr), 1);
        particles.burst(cur.x, cur.y, { type: 'smoke', count: 10 }); snd('pt-poof', 'pop', { vol: 0.6 });
      }
    }
  }

  placeHeld(pp) {
    const pr = pp.held, d = PROP_BY_ID[pr.id];
    if (d.stand) pr.y = clamp(pr.y, WIN.y0 + d.h + 10, BOARD_Y + 24);
    else pr.y = clamp(pr.y, WIN.y0 + d.h * 0.5 + 6, BOARD_Y - d.h * 0.5 - 30);
    pr.x = clamp(pr.x, WIN.x0 + d.w * 0.4, WIN.x1 - d.w * 0.4);
    pr.wv = 6; pr.isNew = false; pr.owner = pr.owner ?? pp.i;
    this.scene.props.push(pr);
    pp.held = null; pp.props++;
    snd('pt-place', 'stamp', { vol: 0.7 });
    particles.burst(pr.x, d.stand ? pr.y - d.h * 0.4 : pr.y, { type: 'sparkle', count: 10, speed: [80, 260] });
    pp.a.playOnce('cheer', 0.6, 'idle'); pp.sock.mood = 'happy'; pp.sock.moodT = 0.6;
  }

  swapPuppet(pp) {
    pp.kind = pp.kind === 'stick' ? 'sock' : 'stick';
    pp.poof = 0.5;
    snd('pt-poof', 'magic', { vol: 0.6 });
    const top = pp.a.y - this.puppetH;
    particles.burst(pp.a.x, Math.max(BOARD_Y - 60, top + 60), { type: 'smoke', count: 12, colors: ['#ffffff', '#ffd6ec'] });
    particles.burst(pp.a.x, BOARD_Y - 60, { type: 'sparkle', count: 8 });
    pp.a.squash(0.3); pp.sock.mouth = 1;
  }

  toggleReady(pp) {
    pp.ready = !pp.ready;
    if (pp.ready) { sfx('correct', { vol: 0.6 }); pp.a.playOnce('cheer', 0.7, 'idle'); pp.a.emote('star', 1); }
    else sfx('back', { vol: 0.5 });
  }

  /** CPUs: maybe pick a backdrop (only when no humans are around), place a few props, then ready. */
  aiSetup(pp, dt) {
    const A = pp.ai, c = pp.p.ctrl;
    if (!A.plan) {
      const plan = [];
      if (!this.humans.length && pp.i === 0) plan.push({ kind: 'card', k: randInt(0, BACKDROPS.length - 1) });
      const nProps = Math.min(this.propLimit, this.n >= 6 ? randInt(1, 2) : this.n <= 2 ? randInt(3, 4) : randInt(2, 3));
      for (let k = 0; k < nProps; k++) plan.push({ kind: 'prop' });
      if (chance(0.15)) plan.push({ kind: 'swap' });
      plan.push({ kind: 'ready' });
      A.plan = plan; A.wait = rand(0.5, 1.5) + pp.i * 0.3;
    }
    A.wait -= dt;
    c.move(0, 0);
    if (A.wait > 0 || this.trans) return;
    if (!A.step) {
      A.step = A.plan.shift() || null;
      if (!A.step) return;
      if (A.step.kind === 'prop') {
        // a prop that suits the backdrop (from the shelf), and a free spot on stage
        const ids = THEME_PROPS[this.scene.backdrop] || PROPS.map((d) => d.id);
        const id = pick(ids), d = PROP_BY_ID[id];
        A.step.tile = PROPS.findIndex((q) => q.id === id);
        const lane = (pp.i + 0.5) / this.n;
        const x = WIN.x0 + 120 + (WIN.x1 - WIN.x0 - 240) * clamp(lane + rand(-0.12, 0.12), 0.02, 0.98);
        const y = d.stand ? rand(BOARD_Y - 40, BOARD_Y + 10) - d.h * 0.5 : rand(WIN.y0 + 80, WIN.y0 + 260);
        A.step.spot = { x, y };
        A.step.stage = 0;
      }
    }
    const S = A.step;
    const go = (tx, ty) => {
      const dx = tx - pp.cur.x, dy = ty - pp.cur.y, d = Math.hypot(dx, dy);
      const k = this.api.players.length && pp.p.aiLevel === 0 ? 0.75 : 1;
      if (d > 14) { c.move(clamp(dx / 140, -1, 1) * k, clamp(dy / 140, -1, 1) * k); return false; }
      return true;
    };
    if (S.kind === 'card') {
      const r = this.cardRect(S.k);
      if (go(r.x + r.w / 2, r.y + r.h / 2)) { c.press('a'); A.step = null; A.wait = rand(0.6, 1.2); }
    } else if (S.kind === 'prop') {
      if (S.stage === 0) {
        const r = this.tileRect(S.tile);
        if (go(r.x + r.w / 2, r.y + r.h / 2)) { c.press('a'); S.stage = 1; A.wait = rand(0.2, 0.5); }
      } else if (S.stage === 1) {
        if (!pp.held) { A.step = null; return; }   // limit reached
        if (go(S.spot.x, S.spot.y)) { c.press('a'); A.step = null; A.wait = rand(0.5, 1.4); }
      }
    } else if (S.kind === 'swap') { c.press('x'); A.step = null; A.wait = rand(0.4, 0.9); }
    else if (S.kind === 'ready') {
      if (!pp.ready) c.press('y');
      A.step = null; A.wait = 999;
    }
  }

  // ---- act ------------------------------------------------------------------
  updateAct(dt) {
    if (!this.trans) {
      for (const pp of this.pp) {
        // the audience slowly forgets: a favourite trick gets laughs again after a rest
        for (const k in pp.recent) { pp.recent[k] = Math.max(0, pp.recent[k] - dt / 4); }
        if (pp.popDelay > 0) { pp.popDelay -= dt; if (pp.popDelay <= 0) this.popUp(pp); continue; }
        if (pp.ai) this.aiAct(pp, dt);
        this.controlPuppet(pp, dt);
      }
      // record for the replay
      this.recT += dt;
      const R = this.rec[this.sceneIdx];
      while (R.frames.length < this.recT * REC_HZ) R.frames.push(this.pp.map((pp) => this.snapshot(pp)));
      if (this.phaseT >= ACT_TIME + 0.8) {
        if (this.sceneIdx === 0) this.startTransition('Scene 2', 'Change the stage!', () => this.startSetup(1));
        else this.startTransition('Instant Replay!', 'The best bits', () => this.startReplay(), { hold: 1.6 });
      }
    }
  }

  snapshot(pp) {
    const a = pp.a;
    return [Math.round(pp.x), Math.round(pp.a.y), Math.round(pp.z), a.facing, a.pose, +pp.spin.toFixed(2), pp.kind === 'sock' ? 1 : 0, pp.sock.mood, +pp.tilt.toFixed(3)];
  }

  recEvent(type, data) {
    if (this.phase !== 'act') return;
    this.rec[this.sceneIdx].events.push({ t: this.recT, type, ...data });
  }

  popUp(pp) {
    pp.a.y = pp.baseY = FEET_Y - 4;
    pp.a.squash(-0.35); pp.vz = 0;
    snd('pt-popup', 'pop', { vol: 0.6, semi: pp.i });
    particles.burst(pp.x, BOARD_Y - 10, { type: 'star', count: 6, speed: [120, 300] });
  }

  controlPuppet(pp, dt) {
    const c = pp.p.ctrl, a = pp.a;
    const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    // picture wheel: hold B, point the stick, let go
    if (c.pressed('b') && !pp.wheel) pp.wheel = { t: 0, sel: null };
    if (pp.wheel) {
      pp.wheel.t += dt;
      const m = Math.hypot(mx, my);
      if (m > 0.5) {
        let ang = Math.atan2(mx, -my);  // 0 = up, clockwise
        if (ang < 0) ang += TAU;
        const sel = Math.round(ang / (TAU / 8)) % 8;
        if (sel !== pp.wheel.sel) { pp.wheel.sel = sel; sfx('move', { vol: 0.35 }); }
      }
      if (!c.held('b')) {
        const id = pp.wheel.sel !== null ? PICTURES[pp.wheel.sel].id : (pp.wheel.t < 0.35 ? pp.lastPic : null);
        pp.wheel = null;
        if (id) this.showPicture(pp, id);
      }
    }
    if (pad) for (const [btn, id] of Object.entries(DPAD_PICS)) if (c.pressed(btn)) this.showPicture(pp, id);
    const wheel = !!pp.wheel;
    // move along the stage
    const sp = 560;
    const tx = wheel ? 0 : mx * sp;
    pp.vx = damp(pp.vx, tx, 10, dt);
    pp.x = this.clampX(pp, pp.x + pp.vx * dt);
    if (Math.abs(pp.vx) > 30) a.facing = pp.vx > 0 ? 1 : -1;
    // up raises the puppet a little; down hides it behind the playboard
    const hy = wheel ? 0 : my;
    const target = hy > 0.15 ? FEET_Y + hy * (this.puppetH + 70) : FEET_Y + hy * 110;
    pp.baseY = damp(pp.baseY, target, hy > 0.15 ? 9 : 12, dt);
    // jump
    if (c.pressed('a') && pp.z <= 0.5) {
      pp.vz = 980; pp.landProp = false; pp.hitHang = false;
      a.squash(-0.3); snd('boing', 'jump', { vol: 0.45 });
      pp.sock.mouth = 1;
      this.recEvent('sound', { k: 'boing', fb: 'jump' });
      this.addFun(pp, 'jump', 0.6, 'ooh');
    }
    if (c.pressed('x') && pp.spinT <= 0) this.twirl(pp);
    if (c.pressed('y')) this.silly(pp);
    // hide & peekaboo
    const hiddenFrac = (pp.baseY - BOARD_Y) / this.puppetH;
    if (hiddenFrac > 0.75) pp.hiddenT += dt;
    else if (hiddenFrac < 0.25) {
      if (pp.hiddenT > 0.6) this.peekaboo(pp);
      pp.hiddenT = 0;
    }
  }

  showPicture(pp, id) {
    const P = PIC_BY_ID[id]; if (!P) return;
    pp.bubble = { id, t: 0, dur: 2.4 };
    pp.lastPic = id; pp.pics++;
    const a = pp.a;
    if (pp.kind === 'stick') {
      a.playOnce(P.pose, 1.4, 'idle');
      if (P.voice) voice(a.charId, P.voice);
      else sfx(id === 'zzz' ? 'snore' : 'blip', { vol: 0.6 });
    } else {
      pp.sock.mood = P.mood; pp.sock.moodT = 1.6; pp.sock.talkT = 0.9;
      snd('pt-sock-chatter', 'giggle', { vol: 0.5, rate: 1.1 + (pp.i % 3) * 0.1 });
    }
    a.squash(-0.15);
    this.recEvent('bubble', { i: pp.i, id });
    // A conversation: answering a friend's bubble nearby
    let chat = false;
    for (const q of this.pp) {
      if (q === pp || !q.bubble || q.bubble.t > 2.6 || q.bubble.t < 0.15) continue;
      if (Math.abs(q.x - pp.x) < 520) { chat = true; q.chatted = (q.chatted || 0) + 1; }
    }
    const kind = { heart: 'aww', laugh: 'laugh', star: 'clap', note: 'clap', wow: 'ooh', question: 'laugh', sad: 'aww', zzz: 'laugh' }[id];
    if (chat) {
      pp.chats++;
      this.addFun(pp, 'chat', 1.2, kind);
      // face each other
      const q = this.pp.filter((o) => o !== pp && o.bubble && Math.abs(o.x - pp.x) < 520).sort((u, v) => Math.abs(u.x - pp.x) - Math.abs(v.x - pp.x))[0];
      if (q) a.facing = q.x > pp.x ? 1 : -1;
    } else this.addFun(pp, 'pic-' + id, 0.8, kind);
  }

  twirl(pp) {
    pp.spinT = 0.6; pp.tricks++;
    snd('pt-twirl', 'whoosh', { vol: 0.6 });
    sfx('sparkle', { vol: 0.4 });
    pp.a.playOnce('dance-star', 0.7, 'idle');
    particles.burst(pp.x, pp.baseY - pp.z - this.puppetH * 0.5, { type: 'sparkle', count: 10, speed: [80, 260] });
    this.recEvent('sound', { k: 'pt-twirl', fb: 'whoosh' });
    this.addFun(pp, 'twirl', 0.8, 'clap');
  }

  silly(pp) {
    const S = SILLY[pp.silly]; pp.silly = (pp.silly + 1) % SILLY.length;
    snd(S.k, S.fb, { vol: 0.75 });
    this.recEvent('sound', { k: S.k, fb: S.fb });
    pp.a.squash(0.35); pp.a.playOnce(pick(['laugh', 'surprised', 'cheer']), 0.6, 'idle');
    pp.sock.mouth = 1; pp.sock.mood = 'wow'; pp.sock.moodT = 0.5;
    this.popText(pp.x, pp.baseY - pp.z - this.puppetH - 30, S.pop, '#ffd23f');
    this.addFun(pp, 'silly-' + S.k, 0.9, 'laugh');
  }

  peekaboo(pp) {
    pp.peeks++;
    pp.a.playOnce('surprised', 0.7, 'idle'); pp.a.squash(-0.4); pp.a.emote('exclaim', 0.8);
    pp.sock.mood = 'wow'; pp.sock.moodT = 0.8; pp.sock.mouth = 1;
    snd('pt-peekaboo', 'pop', { vol: 0.8 });
    this.recEvent('sound', { k: 'pt-peekaboo', fb: 'pop' });
    this.popText(pp.x, BOARD_Y - this.puppetH - 40, 'Peekaboo!', '#7fe0a8');
    particles.burst(pp.x, BOARD_Y - 30, { type: 'star', count: 8, speed: [150, 360] });
    this.addFun(pp, 'peek', 1.4, 'laugh');
  }

  /**
   * The audience reacts. Doing the same trick again and again gets smaller
   * laughs; mixing it up keeps them giggling (and fills the Bravo meter).
   */
  addFun(pp, kind, amt, react = 'laugh') {
    const rec = pp.recent[kind] || 0;
    const gain = amt / (1 + rec * 0.9);
    pp.recent[kind] = rec + 1;
    if (this.phase !== 'act') return;
    const x = pp.x;
    for (const s of this.audience) { const d = Math.abs(s.x - x); if (d < 700) { const k = gain * (1 - d / 900); if (react === 'clap') s.clap = Math.min(1, s.clap + k); else s.laugh = Math.min(1, s.laugh + k); } }
    this.meter += gain * 0.11 / Math.max(1, Math.pow(this.n * 0.6, 0.75));
    if (gain >= 0.55) {
      pp.laughs++;
      this.recEvent('fun', { x, react });
      this.audReact(react, x, gain);
    }
    if (this.meter >= 1) this.bravo();
  }

  audReact(react, x, gain = 1) {
    const words = { laugh: ['Ha ha!', 'Hee hee!', 'Ha!'], aww: ['Aww!'], ooh: ['Ooh!', 'Wow!'], clap: ['Yay!', 'Clap clap!'] }[react] || ['Ha ha!'];
    const s = this.audience.filter((q) => Math.abs(q.x - x) < 500);
    const seat = s.length ? pick(s) : pick(this.audience);
    this.pops.push({ x: seat.x + rand(-30, 30), y: seat.y - 170 * seat.s, text: pick(words), t: 0, color: { laugh: '#ffd23f', aww: '#ff8fd0', ooh: '#7fd3ff', clap: '#7fe0a8' }[react] || '#fff' });
    if (this.audSndT <= 0) {
      this.audSndT = 0.55;
      const v = clamp(0.35 + gain * 0.3, 0.3, 0.8);
      if (react === 'laugh') snd('pt-laugh', 'giggle', { vol: v });
      else if (react === 'aww') snd('crowd-aww', 'aww', { vol: v });
      else if (react === 'ooh') snd('crowd-ooh', 'magic', { vol: v });
      else snd('inst/clap', 'pop', { vol: v });
    }
  }

  audClap(k = 1) { for (const s of this.audience) s.clap = Math.min(1, s.clap + k * rand(0.6, 1)); }

  bravo() {
    this.meter = 0; this.bravos++;
    this.banner = { text: this.bravos > 1 ? `Bravo x${this.bravos}!` : 'Bravo!', t: 0 };
    snd('applause', 'cheer', { vol: 0.9 }); sfx('fanfare', { vol: 0.5 });
    this.audClap(1.2);
    for (const s of this.audience) s.laugh = Math.min(1, s.laugh + 0.5);
    particles.confettiRain(W, 140);
    fx.flash('#ffffff', 0.12);
    if (this.api.camera) this.api.camera.punch(W / 2, 480, 1.08, 0.5);
    for (const pp of this.pp) { pp.a.playOnce('celebrate', 1.0, 'idle'); pp.sock.mood = 'happy'; pp.sock.moodT = 1; }
    for (let k = 0; k < 6; k++) this.throwRose();
    this.recEvent('fun', { x: W / 2, react: 'clap' });
  }

  aiAct(pp, dt) {
    const A = pp.ai, c = pp.p.ctrl;
    c.move(0, 0);
    // walk toward a target spot
    let mx = 0;
    if (Math.abs(A.targetX - pp.x) > 30) mx = clamp((A.targetX - pp.x) / 160, -1, 1) * 0.8;
    let my = 0;
    if (A.hideT > 0) { A.hideT -= dt; my = 1; mx = 0; }
    c.move(mx, my);
    A.t -= dt;
    if (A.t > 0) return;
    const busy = Math.sqrt(Math.max(1, this.n / 2));
    A.t = rand(0.7, 1.7) * busy * (pp.p.aiLevel === 0 ? 1.15 : 1);
    // answer a friend's bubble?
    const friend = this.pp.find((q) => q !== pp && q.bubble && q.bubble.t < 1.2 && Math.abs(q.x - pp.x) < 520);
    if (friend && chance(0.6)) {
      const reply = { heart: 'heart', laugh: 'laugh', star: 'star', note: 'note', wow: pick(['wow', 'question']), question: pick(['star', 'heart', 'laugh']), sad: 'heart', zzz: 'wow' }[friend.bubble.id] || 'heart';
      pp.a.facing = friend.x > pp.x ? 1 : -1;
      this.showPicture(pp, reply);
      return;
    }
    const r = Math.random();
    if (r < 0.32) {
      const others = this.pp.filter((q) => q !== pp);
      A.targetX = others.length && chance(0.5) ? clamp(pick(others).x + rand(-160, 160), WIN.x0 + 80, WIN.x1 - 80) : rand(WIN.x0 + 100, WIN.x1 - 100);
    } else if (r < 0.48) c.press('a');
    else if (r < 0.7) this.showPicture(pp, pick(PICTURES).id);
    else if (r < 0.8) c.press('x');
    else if (r < 0.9) c.press('y');
    else A.hideT = rand(0.9, 1.4);
  }

  // ---- replay ------------------------------------------------------------------
  applyReplayFrame(t) {
    const R = this.replay.R;
    const f = R.frames[clamp(Math.floor(t * REC_HZ), 0, R.frames.length - 1)];
    if (!f) return;
    this.pp.forEach((pp, i) => {
      const s = f[i]; if (!s) return;
      const [x, y, z, facing, pose, spin, sock, mood, tilt] = s;
      pp.x = x; pp.baseY = y; pp.z = z; pp.a.facing = facing; pp.spin = spin; pp.tilt = tilt;
      pp.kind = sock ? 'sock' : 'stick';
      if (pp.a.pose !== pose) { pp.a._once = null; pp.a.setPose(pose); }
      if (mood !== pp.sock.mood) { pp.sock.mood = mood; pp.sock.moodT = 0.3; }
    });
  }

  updateReplay(dt) {
    const P = this.replay;
    if (this.trans) return;
    if (!P) { this.nextReplay(); return; }
    const before = P.t;
    P.t = Math.min(P.e, P.t + dt);
    this.applyReplayFrame(P.t);
    for (const e of P.R.events) {
      if (e.t < before || e.t >= P.t) continue;
      if (e.type === 'bubble') { const pp = this.pp[e.i]; if (pp) pp.bubble = { id: e.id, t: 0, dur: 2.4 }; if (pp && pp.kind === 'sock') pp.sock.talkT = 0.9; }
      else if (e.type === 'sound') snd(e.k, e.fb, { vol: 0.5 });
      else if (e.type === 'fun') {
        for (const s of this.audience) if (Math.abs(s.x - e.x) < 700) { if (e.react === 'clap') s.clap = Math.min(1, s.clap + 0.6); else s.laugh = Math.min(1, s.laugh + 0.6); }
        this.audReact(e.react, e.x, 0.7);
      }
    }
    if (P.t >= P.e) this.nextReplay();
  }

  nextReplay() {
    if (this.trans) return;
    if (this.replayIdx === 0 && this.rec[1] && this.rec[1].frames.length) {
      this.startTransition('Act 2', 'Replay', () => this.beginReplaySegment(1), { hold: 0.8 });
    } else {
      this.startTransition('Curtain Call!', 'Take a bow!', () => this.startCall());
    }
  }

  // ---- curtain call ---------------------------------------------------------------
  updateCall(dt) {
    if (this.trans) return;
    const t = this.phaseT;
    if (!this.callStart) { this.callStart = true; snd('applause', 'cheer', { vol: 0.9 }); this.audClap(1); particles.confettiRain(W, 160); sfx('yay'); }
    this.audClap(dt * 2);
    for (const s of this.audience) if (chance(dt * 0.8)) s.laugh = Math.min(1, s.laugh + 0.4);
    for (const pp of this.pp) {
      const c = pp.p.ctrl, a = pp.a;
      pp.poseCD = Math.max(0, (pp.poseCD || 0) - dt);
      let { x: mx } = photoMove(c), jump = c.pressed('a'), pose = photoPosePressed(c);
      if (pp.ai) {
        pp.ai.t -= dt;
        if (pp.ai.t <= 0) { pp.ai.t = rand(0.6, 1.4); if (chance(0.35)) jump = true; else pose = randomPhotoPose(); }
        mx = 0;
      }
      pp.vx = damp(pp.vx, mx * 420, 10, dt);
      pp.x = this.clampX(pp, pp.x + pp.vx * dt);
      if (Math.abs(pp.vx) > 30) a.facing = pp.vx > 0 ? 1 : -1;
      pp.baseY = damp(pp.baseY, FEET_Y - 10, 8, dt);
      if (jump && pp.z <= 0.5) { pp.vz = 900; a.squash(-0.3); snd('boing', 'jump', { vol: 0.35 }); }
      if (pose && pp.poseCD <= 0) {
        pp.poseCD = 0.35;
        if (pp.kind === 'stick') strikePhotoPose(a, pose, { onBump: () => this.bumpNear(pp) });
        else {
          const m = POSE_MOOD[pose.pose] || 'happy';
          if (m === 'spin') pp.spinT = 0.6; else { pp.sock.mood = m; pp.sock.moodT = 1.4; }
          pp.sock.mouth = 1; a.squash(-0.12); sfx(pose.sound || 'pop', { vol: 0.4 });
          if (pose.bump) this.bumpNear(pp);
        }
      }
    }
    this.roseT -= dt;
    if (this.roseT <= 0) { this.roseT = rand(0.25, 0.6); this.throwRose(); }
    if (chance(dt * 2)) particles.burst(rand(WIN.x0 + 100, WIN.x1 - 100), rand(220, 420), { type: pick(['star', 'heart', 'sparkle']), count: 8 });
    if (t > CALL_TIME) this.finishGame();
  }

  bumpNear(pp) {
    for (const q of this.pp) {
      if (q === pp) continue;
      const dx = q.x - pp.x;
      if (Math.abs(dx) < 140) { q.vx += Math.sign(dx || 1) * 500; q.vz = Math.max(q.vz, 380); q.a.playOnce('surprised', 0.6, 'idle'); q.sock.mood = 'wow'; q.sock.moodT = 0.6; }
    }
    snd('boing', 'bounce', { vol: 0.4 });
  }

  throwRose() {
    const from = pick(this.audience);
    const target = this.pp.length ? pick(this.pp) : null;
    const tx = target ? target.x + rand(-120, 120) : rand(WIN.x0 + 100, WIN.x1 - 100);
    this.roses.push({ x: from.x, y: from.y - 120, sx: from.x, sy: from.y - 120, tx: clamp(tx, WIN.x0 + 60, WIN.x1 - 60), ty: BOARD_Y - 4, t: 0, dur: rand(0.7, 1.0), rot: rand(TAU), vr: rand(-10, 10), landed: false });
    sfx('whoosh', { vol: 0.2 });
  }

  updateRoses(dt) {
    for (const r of this.roses) {
      if (r.landed) { r.life -= dt; continue; }
      r.t += dt;
      const k = clamp(r.t / r.dur, 0, 1);
      r.x = lerp(r.sx, r.tx, k); r.y = lerp(r.sy, r.ty, k) - Math.sin(k * Math.PI) * 360;
      r.rot += r.vr * dt;
      if (k >= 1) { r.landed = true; r.life = 3; r.rot = rand(-0.4, 0.4) + Math.PI / 2; sfx('pop', { vol: 0.25 }); particles.burst(r.x, r.y, { type: 'petal', count: 4 }); }
    }
    this.roses = this.roses.filter((r) => !r.landed || r.life > 0);
    if (this.roses.length > 40) this.roses.splice(0, this.roses.length - 40);
  }

  // ---- shared puppet animation ------------------------------------------------
  animPuppet(pp, dt) {
    const a = pp.a, S = pp.sock;
    // jump physics
    if (this.phase !== 'replay') {
      if (pp.z > 0 || pp.vz > 0) {
        pp.vz -= 2600 * dt; pp.z += pp.vz * dt;
        if (this.phase === 'act' && pp.vz > 0 && !pp.hitHang) this.headBump(pp);
        if (pp.z <= 0) {
          pp.z = 0;
          if (pp.vz < -300) { a.squash(0.3); this.onLand(pp); }
          pp.vz = 0;
        }
      }
    }
    pp.spinT = Math.max(0, pp.spinT - dt);
    if (this.phase !== 'replay') pp.spin = pp.spinT > 0 ? Math.cos((1 - pp.spinT / 0.6) * TAU) : 1;
    if (this.phase !== 'replay') pp.x = this.clampX(pp, pp.x);
    a.x = pp.x; a.y = pp.baseY; a.z = pp.z;
    if (this.phase !== 'replay') {
      pp.tilt = damp(pp.tilt, clamp(pp.vx / 560, -1, 1) * 0.14 + Math.sin(this.t * 2 + pp.i) * 0.02, 8, dt);
      if (this.phase === 'act' || this.phase === 'call') {
        if (pp.z > 0) { if (!a._once) a.setPose('jump'); }
        else a.moveAnim(Math.abs(pp.vx) > 40 ? pp.vx : 0, 0, 560);
      } else if (!a._once) a.setPose(pp.ready ? 'wave' : 'idle');
    }
    a.update(dt);
    // sock face
    S.moodT = Math.max(0, S.moodT - dt);
    if (S.moodT <= 0 && this.phase !== 'replay') S.mood = null;
    S.talkT = Math.max(0, S.talkT - dt);
    let mouthT = 0;
    if (S.talkT > 0 || S.mood === 'laugh' || S.mood === 'sing') mouthT = 0.5 + 0.5 * Math.sin(this.t * 16 + pp.i);
    else if (S.mood === 'wow') mouthT = 0.8;
    else if (S.mood === 'happy') mouthT = 0.35;
    else if (pp.z > 0) mouthT = 0.6;
    S.mouth = damp(S.mouth, mouthT, 14, dt);
    // googly pupils: lag behind the motion, then wobble
    const tx = clamp(-pp.vx / 500, -1, 1) * 0.8 * (a.facing || 1), ty = clamp(pp.vz / 900, -1, 1) * 0.8 + 0.2;
    S.ex = (S.ex || 0) + ((tx - S.eyesX) * 120 - (S.ex || 0) * 9) * dt; S.eyesX = clamp(S.eyesX + S.ex * dt, -1, 1);
    S.ey = (S.ey || 0) + ((ty - S.eyesY) * 120 - (S.ey || 0) * 9) * dt; S.eyesY = clamp(S.eyesY + S.ey * dt, -1, 1);
    S.blinkT -= dt;
    if (S.blinkT <= 0) { S.blink = 1; S.blinkT = rand(2, 5); }
    S.blink = Math.max(0, S.blink - dt * 7);
    S.tilt = damp(S.tilt, (S.mood === 'sad' ? 0.25 : S.mood === 'think' ? -0.18 : 0) + pp.tilt, 8, dt);
    if (pp.bubble) { pp.bubble.t += dt; if (pp.bubble.t > pp.bubble.dur) pp.bubble = null; }
    pp.poof = Math.max(0, pp.poof - dt);
  }

  /** Landing: bonk friends nearby, wobble props underfoot. */
  onLand(pp) {
    if (this.phase !== 'act') return;
    sfx('land', { vol: 0.35 });
    for (const q of this.pp) {
      if (q === pp || q.popDelay > 0) continue;
      if (Math.abs(q.x - pp.x) < 90 && q.z <= 0 && (q.baseY - BOARD_Y) / this.puppetH < 0.5) {
        q.vz = 520; q.vx += Math.sign(q.x - pp.x || 1) * 420;
        q.a.playOnce('dizzy', 0.9, 'idle'); q.a.emote('dizzy', 0.9); q.sock.mood = 'wow'; q.sock.moodT = 0.9;
        snd('pt-bonk', 'bonk', { vol: 0.6 });
        particles.burst((pp.x + q.x) / 2, pp.baseY - this.puppetH * 0.8, { type: 'star', count: 8 });
        this.recEvent('sound', { k: 'pt-bonk', fb: 'bonk' });
        this.addFun(pp, 'bonk', 1.1, 'laugh');
      }
    }
    for (const pr of this.scene.props) {
      const d = PROP_BY_ID[pr.id];
      if (!d.stand) continue;
      if (Math.abs(pr.x - pp.x) < d.w * 0.5 + 30 && Math.abs(pr.y - BOARD_Y) < 120) {
        pr.wv = (pr.wv || 0) + (pp.x < pr.x ? 5 : -5);
        if (!pp.landProp) { pp.landProp = true; this.propSound(pr); this.addFun(pp, 'prop-' + pr.id, 0.6, 'laugh'); }
      }
    }
    // hanging props: bump them with your head on the way up (checked on land for simplicity)
  }

  /** Jumping up into a hanging prop (sun, star, cloud...) makes it swing. */
  headBump(pp) {
    const top = pp.baseY - pp.z - this.puppetH;
    for (const pr of this.scene.props) {
      const d = PROP_BY_ID[pr.id];
      if (d.stand) continue;
      if (Math.abs(pr.x - pp.x) < d.w * 0.5 && top < pr.y + d.h * 0.5 && top > pr.y - d.h * 0.5) {
        pp.hitHang = true;
        pr.wv = (pr.wv || 0) + (pp.x < pr.x ? 7 : -7);
        this.propSound(pr); pp.a.emote('star', 0.6);
        this.addFun(pp, 'hang-' + pr.id, 0.9, 'laugh');
        return;
      }
    }
  }

  propSound(pr) {
    const s = { star: 'sparkle', sun: 'sparkle', moon: 'magic', fish: 'splash', flower: 'grow', tree: 'crumble', mushroom: 'bounce', rocket: 'whoosh', lollipop: 'munch', castle: 'fanfare', house: 'pop', cloud: 'whoosh', rainbow: 'sparkle', palm: 'crumble' }[pr.id] || 'pop';
    sfx(s, { vol: 0.45 });
    const d = PROP_BY_ID[pr.id];
    particles.burst(pr.x, d.stand ? pr.y - d.h * 0.6 : pr.y, { type: pr.id === 'flower' ? 'petal' : pr.id === 'fish' ? 'drop' : 'sparkle', count: 8 });
  }

  popText(x, y, text, color) { particles.popText(x, y, text, color); }

  // ---------------------------------------------------------------------------
  // Drawing

  draw(g) {
    const t = this.t;
    drawRoom(g, t);
    drawBoothBack(g);
    const sc = this.scene || this.scenes[0];
    if (this.bdFade) {
      drawBackdrop(g, this.bdFade.from, WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, t);
      g.save(); g.globalAlpha = ease.inOutQuad(clamp(this.bdFade.t, 0, 1));
      drawBackdrop(g, sc.backdrop, WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, t);
      g.restore();
    } else drawBackdrop(g, sc.backdrop, WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, t);
    // props
    for (const pr of sc.props) this.drawPlacedProp(g, pr, t);
    if (this.phase === 'setup') for (const pp of this.pp) if (pp.hover && pp.hover.kind === 'prop' && !pp.held && !pp.p.isAI) this.drawPropHighlight(g, pp.hover.pr, pp.p.color);
    // puppets
    for (const pp of this.pp) this.drawPuppet(g, pp, t);
    drawCurtains(g, this.curtain, t);
    drawBoothFront(g, t);
    // roses on the playboard / in flight
    for (const r of this.roses) drawRose(g, r.x, r.y, r.rot, r.landed ? clamp(r.life, 0, 1) : 1);
    drawAudience(g, this.audience, t);
    for (const q of this.pops) {
      const k = q.t / 1.3;
      g.save(); g.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      ui.text(g, q.text, q.x, q.y - k * 60, { size: 34 + Math.min(1, q.t * 6) * 6, color: q.color, strokeWidth: 7 });
      g.restore();
    }
    // bubbles and tags above everything on stage
    if (this.curtain < 0.5) {
      for (const pp of this.pp) this.drawBubble(g, pp, t);
      for (const pp of this.pp) if (pp.wheel) this.drawWheel(g, pp, t);
    }
  }

  drawPlacedProp(g, pr, t) {
    const d = PROP_BY_ID[pr.id];
    const rot = (pr.wr || 0) * 0.08;
    if (!d.stand) {
      // string from the valance
      g.save(); g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(pr.x, WIN.y0 - 10); g.lineTo(pr.x + Math.sin(rot) * 20, pr.y - d.h * 0.45); g.stroke(); g.restore();
      const sway = Math.sin(t * 1.3 + (pr.ph || 0)) * 0.04;
      g.save(); g.translate(pr.x, WIN.y0 - 10); g.rotate(rot + sway); g.translate(-pr.x, -(WIN.y0 - 10));
      drawProp(g, pr.id, pr.x, pr.y, pr.s || 1, 0, t);
      g.restore();
    } else drawProp(g, pr.id, pr.x, pr.y, pr.s || 1, rot, t);
  }

  drawPropHighlight(g, pr, color) {
    const r = propRect(pr);
    g.save(); g.strokeStyle = color; g.lineWidth = 5; g.setLineDash([14, 10]); g.lineDashOffset = -this.t * 40;
    ui.roundRect(g, r.x - 8, r.y - 8, r.w + 16, r.h + 16, 16); g.stroke(); g.restore();
  }

  drawPuppet(g, pp, t) {
    const a = pp.a, H0 = this.puppetH;
    const feetY = pp.baseY - pp.z;
    if (feetY - H0 > BOARD_B + 20) return;   // fully hidden
    g.save();
    if (pp.poof > 0) { const k = 1 - pp.poof / 0.5; g.translate(pp.x, feetY); g.scale(0.6 + 0.4 * ease.outBack(clamp(k * 1.2, 0, 1)), 0.6 + 0.4 * ease.outBack(clamp(k * 1.2, 0, 1))); g.translate(-pp.x, -feetY); }
    if (pp.kind === 'sock') {
      const S = pp.sock;
      const sockState = { ...S, spin: pp.spin, tilt: S.tilt, mood: S.mood };
      drawSock(g, pp.x, feetY - 6, H0 * 0.86, pp.p.color, pp.hair, a.facing, sockState, t + pp.i);
    } else {
      // sticks behind the puppet, one per member
      for (const m of a.members) drawStick(g, m.x, m.y - a.z - 2, pp.tilt);
      g.translate(pp.x, feetY); g.rotate(pp.tilt); g.scale(pp.spin, 1); g.translate(-pp.x, -feetY);
      a.draw(g, { shadow: false, emotes: true });
    }
    g.restore();
    if (pp.kind === 'stick') this.drawRibbon(g, pp.x, Math.max(feetY + 26, BOARD_Y - 18), pp.p.color);
  }

  drawRibbon(g, x, y, color) {
    if (y > BOARD_Y - 6) return;
    g.save(); g.translate(x, y);
    g.fillStyle = color; g.strokeStyle = NAVY; g.lineWidth = 2.5;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(sd * 18, -10); g.lineTo(sd * 18, 10); g.closePath(); g.fill(); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }

  headY(pp) { return pp.baseY - pp.z - this.puppetH * (pp.kind === 'sock' ? 0.95 : 1.0); }

  drawBubble(g, pp, t) {
    const hy = this.headY(pp);
    if (pp.baseY - BOARD_Y > this.puppetH * 0.75) return;
    if (pp.bubble) {
      const y = Math.max(250, hy - 14);
      drawPictureBubble(g, pp.bubble.id, clamp(pp.x + pp.a.facing * 30, WIN.x0 + 70, WIN.x1 - 70), y, pp.bubble.t, pp.bubble.dur, this.n > 5 ? 0.85 : 1);
    }
    const showTag = this.phase === 'setup' || (this.phase === 'act' && (this.tagT > 0 || (pp.popDelay > -1.5)));
    if (showTag && !pp.bubble && !this.trans) ui.playerTag(g, pp.p, pp.x, Math.max(200, hy - 18), { label: pp.p.tag });
  }

  drawWheel(g, pp, t) {
    const cx = clamp(pp.x, WIN.x0 + 170, WIN.x1 - 170), cy = clamp(this.headY(pp) + 40, 330, BOARD_Y - 150);
    const R = 132, k = ease.outBack(clamp(pp.wheel.t / 0.2, 0, 1));
    g.save(); g.translate(cx, cy); g.scale(k, k);
    g.fillStyle = 'rgba(36,22,63,0.55)'; g.beginPath(); g.arc(0, 0, R + 58, 0, TAU); g.fill();
    g.strokeStyle = pp.p.color; g.lineWidth = 6; g.stroke();
    PICTURES.forEach((P, i) => {
      const ang = (i / 8) * TAU, x = Math.sin(ang) * R, y = -Math.cos(ang) * R;
      const sel = pp.wheel.sel === i;
      g.fillStyle = sel ? '#ffffff' : P.color;
      g.beginPath(); g.arc(x, y, sel ? 50 : 42, 0, TAU); g.fill();
      g.lineWidth = sel ? 6 : 4; g.strokeStyle = sel ? pp.p.color : NAVY; g.stroke();
      drawPicture(g, P.id, x, y, sel ? 62 : 52, t);
    });
    if (pp.wheel.sel !== null) {
      const ang = (pp.wheel.sel / 8) * TAU;
      g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(ang) * 60, -Math.cos(ang) * 60); g.stroke();
    }
    ui.glyph(g, 'b', 0, 0, 40);
    g.restore();
  }

  // ---- HUD ---------------------------------------------------------------------
  drawHUD(g) {
    const t = this.t;
    if (this.phase === 'setup') this.drawShelf(g, t);
    if (this.phase === 'setup' && !this.trans) for (const pp of this.pp) this.drawHand(g, pp, t);
    this.drawChips(g);
    // header
    if (!this.trans) {
      if (this.phase === 'setup') {
        this.headerPill(g, `Scene ${this.sceneIdx + 1} · Set the stage!`);
      } else if (this.phase === 'act') {
        this.headerPill(g, `Act ${this.sceneIdx + 1} · ${BACKDROPS.find((b) => b.id === this.scene.backdrop).name}`);
        this.drawMeter(g, t);
      } else if (this.phase === 'replay') {
        this.drawReplayFrame(g, t);
      } else if (this.phase === 'call') {
        this.headerPill(g, 'Curtain Call!');
        this.drawMeter(g, t, true);
      }
    }
    // hints
    if (!this.trans && this.humans.length) {
      const anyPad = this.humans.some((p) => p.ctrl.kind === 'pad');
      if (this.phase === 'setup') {
        this.hintBar(g, [['stick', 'Move hand'], ['a', 'Pick up / place'], ['b', 'Remove'], [anyPad ? 'dpad' : 'rb', 'Backdrop'], ['x', 'Stick / sock'], ['y', 'Ready!']], BOARD_Y + 50);
      } else if (this.phase === 'act') {
        this.hintBar(g, [['stick', 'Move · down hides'], ['a', 'Jump'], ['b', 'Hold: pictures'], ['x', 'Twirl'], ['y', 'Silly sound']].concat(anyPad ? [['dpad', 'Quick pictures']] : []), H - 40);
      } else if (this.phase === 'call') {
        const [r1, r2] = photoPoseHints(anyPad);
        this.hintBar(g, r1, H - 96, 30); this.hintBar(g, r2, H - 44, 30);
      }
    }
    // title card on the closed curtains
    if (this.trans && this.curtain > 0.6) {
      const T = this.trans, k = clamp((this.curtain - 0.6) / 0.4, 0, 1);
      g.save(); g.globalAlpha = k;
      const y = 400;
      ui.panel(g, W / 2 - 430, y - 120, 860, 230, { r: 40, fill: '#fff4d6', stroke: '#ffd23f', lineWidth: 10 });
      ui.text(g, T.title, W / 2, y - 30, { size: 96, color: '#ff4d6d', strokeWidth: 12, maxWidth: 800 });
      if (T.sub) ui.text(g, T.sub, W / 2, y + 60, { size: 46, color: NAVY, stroke: false, weight: 800, maxWidth: 780 });
      for (const sd of [-1, 1]) { g.save(); g.translate(W / 2 + sd * 380, y - 100); g.rotate(Math.sin(t * 3) * 0.2); drawStarIcon(g); g.restore(); }
      g.restore();
    }
    if (this.banner) ui.banner(g, this.banner.text, this.banner.t, { size: 120, y: 330, color: '#ffd23f' });
  }

  headerPill(g, str) {
    const w = 520, x = W / 2 - 120 - w;
    ui.panel(g, x, 26, w, 70, { r: 35, fill: '#ffffff', lineWidth: 5 });
    ui.text(g, str, x + w / 2, 62, { size: 34, color: NAVY, stroke: false, weight: 800, maxWidth: w - 40 });
  }

  hintBar(g, list, y, size = 32) {
    g.save(); g.globalAlpha = 0.85; g.fillStyle = 'rgba(36,22,63,0.6)';
    ui.roundRect(g, 240, y - size * 0.85, W - 480, size * 1.7, size * 0.85); g.fill(); g.restore();
    ui.hints(g, list, W / 2, y, { size, gap: 26 });
  }

  drawMeter(g, t, full = false) {
    const x = W / 2 + 120, y = 30, w = 520, h = 62;
    ui.panel(g, x, y, w, h + 4, { r: 33, fill: '#ffffff', lineWidth: 5 });
    // clapping hands icon
    g.save(); g.translate(x + 40, y + 34); g.rotate(Math.sin(t * 10) * 0.15 * (this.meter > 0.7 || full ? 1 : 0.2));
    g.fillStyle = '#ffd9b8'; g.strokeStyle = NAVY; g.lineWidth = 3;
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 9, 0, 11, 19, sd * 0.35, 0, TAU); g.fill(); g.stroke(); }
    g.restore();
    const f = full ? 1 : this.meter;
    ui.bar(g, x + 76, y + 18, w - 150, 30, f, f > 0.8 ? '#ff4d6d' : '#ffd23f');
    ui.text(g, this.bravos ? `x${this.bravos}` : 'Bravo!', x + w - 38, y + 34, { size: 26, color: '#ff4d6d', strokeWidth: 5, maxWidth: 66 });
  }

  drawChips(g) {
    const n = this.n, left = Math.ceil(n / 2);
    this.pp.forEach((pp, i) => {
      const side = i < left ? 0 : 1, k = side ? i - left : i;
      const x = side ? W - 196 : 8, y = 200 + k * 104, w = 188, h = 92;
      const p = pp.p;
      ui.panel(g, x, y, w, h, { r: 30, fill: '#ffffff', stroke: p.color, lineWidth: 6 });
      drawPortrait(g, p, x + 44, y + 46, 34, { expr: pp.bubble ? 'happy' : 'neutral' });
      ui.text(g, p.tag, x + 88, y + 26, { size: 24, color: p.color, align: 'left', strokeWidth: 5 });
      let val;
      if (this.phase === 'setup') val = pp.ready ? 'Ready!' : `${this.ownedProps(pp)}/${this.propLimit}`;
      else val = String(pp.laughs);
      ui.text(g, val, x + w - 16, y + 62, { size: 34, color: pp.ready && this.phase === 'setup' ? '#2bb673' : NAVY, align: 'right', stroke: false, weight: 800, maxWidth: w - 96 });
      if (this.phase !== 'setup') { g.save(); g.translate(x + 104, y + 62); drawPicture(g, 'laugh', 0, 0, 30, this.t); g.restore(); }
      // puppet kind badge
      g.save(); g.translate(x + 70, y + 76);
      if (pp.kind === 'sock') { g.fillStyle = p.color; g.strokeStyle = NAVY; g.lineWidth = 2.5; ui.roundRect(g, -10, -14, 20, 24, 8); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-3, -7, 4, 0, TAU); g.arc(5, -7, 4, 0, TAU); g.fill(); }
      else { g.fillStyle = '#c98a4f'; g.strokeStyle = NAVY; g.lineWidth = 2.5; g.fillRect(-3, -16, 6, 28); g.strokeRect(-3, -16, 6, 28); }
      g.restore();
    });
  }

  drawShelf(g, t) {
    if (this.curtain > 0.9) return;
    ui.panel(g, SHELF.x, SHELF.y, SHELF.w, SHELF.h, { r: 30, fill: '#fff4dc', lineWidth: 6 });
    g.save(); g.fillStyle = '#e3a265'; ui.roundRect(g, SHELF.x + 12, TILE.y - 8, SHELF.w - 24, 8, 4); g.fill(); g.restore();
    // backdrop cards
    BACKDROPS.forEach((b, k) => {
      const r = this.cardRect(k), on = this.scene.backdrop === b.id;
      const hov = this.pp.some((pp) => !pp.p.isAI && pp.hover && pp.hover.kind === 'card' && pp.hover.k === k);
      g.save();
      if (hov) { g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(1.06, 1.06); g.translate(-r.x - r.w / 2, -r.y - r.h / 2); }
      drawBackdrop(g, b.id, r.x, r.y, r.w, r.h, t, false);
      g.lineWidth = on ? 7 : 4; g.strokeStyle = on ? '#ff4d6d' : NAVY; ui.roundRect(g, r.x, r.y, r.w, r.h, 10); g.stroke();
      ui.text(g, b.name, r.x + r.w / 2, r.y + r.h - 16, { size: 22, color: '#ffffff', strokeWidth: 5, maxWidth: r.w - 12 });
      if (on) { g.translate(r.x + r.w - 10, r.y + 8); drawStarIcon(g, 22); }
      g.restore();
    });
    // ready button
    const rr = this.readyRect();
    const humansReady = this.pp.filter((pp) => !pp.p.isAI);
    const nReady = this.pp.filter((pp) => pp.ready).length;
    ui.panel(g, rr.x, rr.y, rr.w, rr.h, { r: 24, fill: '#7fe0a8', lineWidth: 5, shadow: false });
    ui.glyph(g, 'y', rr.x + 40, rr.y + rr.h / 2, 40);
    ui.text(g, 'Ready!', rr.x + 140, rr.y + rr.h / 2 - 12, { size: 34, color: '#ffffff', strokeWidth: 6 });
    ui.text(g, `${nReady}/${this.n}`, rr.x + 140, rr.y + rr.h / 2 + 22, { size: 24, color: NAVY, stroke: false, weight: 800 });
    void humansReady;
    // prop tiles
    PROPS.forEach((d, k) => {
      const r = this.tileRect(k);
      const hov = this.pp.some((pp) => !pp.p.isAI && pp.hover && pp.hover.kind === 'tile' && pp.hover.k === k);
      g.save();
      g.fillStyle = hov ? '#ffffff' : '#ffe8f3'; ui.roundRect(g, r.x, r.y, r.w, r.h, 14); g.fill();
      g.lineWidth = hov ? 5 : 3; g.strokeStyle = hov ? '#ff6fb1' : NAVY; g.stroke();
      const s = Math.min((r.w - 14) / d.w, (r.h - 12) / d.h) * (hov ? 1.12 : 1);
      if (d.stand) drawProp(g, d.id, r.x + r.w / 2, r.y + r.h / 2 + d.h * s * 0.5, s, 0, t, { shadow: false });
      else drawProp(g, d.id, r.x + r.w / 2, r.y + r.h / 2, s, 0, t);
      g.restore();
    });
  }

  drawHand(g, pp, t) {
    const c = pp.cur, p = pp.p;
    if (pp.held) {
      const d = PROP_BY_ID[pp.held.id];
      const ok = this.overStage(c.x, c.y);
      g.save(); g.globalAlpha = ok ? 0.95 : 0.6;
      const bob = Math.sin(t * 6 + pp.i) * 4;
      if (d.stand) drawProp(g, d.id, c.x, c.y + d.h * 0.5 + bob, 1, Math.sin(t * 4) * 0.05, t);
      else drawProp(g, d.id, c.x, c.y + bob, 1, Math.sin(t * 4) * 0.05, t);
      g.restore();
    }
    // pointing hand in the player's colour
    g.save(); g.translate(c.x, c.y);
    const press = p.ctrl.held('a') ? 0.88 : 1; g.scale(press, press);
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, 34); g.lineTo(4, 30); g.lineTo(10, 46); g.lineTo(20, 42); g.lineTo(13, 27); g.lineTo(26, 26); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = p.color; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.stroke();
    g.restore();
    ui.playerTag(g, p, c.x + 26, c.y - 10, { label: p.tag });
  }

  drawReplayFrame(g, t) {
    // film-strip border around the stage and a blinking REPLAY badge
    g.save();
    g.fillStyle = 'rgba(20,10,30,0.85)';
    g.fillRect(WIN.x0 - 10, WIN.y0 + 20, 26, BOARD_Y - WIN.y0 - 20); g.fillRect(WIN.x1 - 16, WIN.y0 + 20, 26, BOARD_Y - WIN.y0 - 20);
    g.fillStyle = '#fff4d6';
    for (let y = WIN.y0 + 34; y < BOARD_Y - 20; y += 40) { g.fillRect(WIN.x0 - 3, y + ((t * 120) % 40), 12, 18); g.fillRect(WIN.x1 - 9, y + ((t * 120) % 40), 12, 18); }
    g.restore();
    const w = 600, x = W / 2 - w / 2;
    ui.panel(g, x, 22, w, 78, { r: 39, fill: '#ffffff', lineWidth: 5 });
    if (Math.sin(t * 6) > -0.3) { g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(x + 50, 61, 16, 0, TAU); g.fill(); g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke(); }
    ui.text(g, `Instant Replay · Act ${this.replayIdx + 1}`, x + w / 2 + 24, 61, { size: 36, color: NAVY, stroke: false, weight: 800, maxWidth: w - 120 });
    if (this.replay) ui.bar(g, x + 80, 108, w - 160, 14, (this.replay.t - this.replay.s) / Math.max(0.1, this.replay.e - this.replay.s), '#ff6fb1', { lineWidth: 3 });
  }
}

function drawStarIcon(g, s = 40) {
  starIcon(g, s);
}
function starIcon(g, s) {
  g.save(); g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, s * 0.1);
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.27 : s * 0.6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill(); g.stroke(); g.restore();
}
