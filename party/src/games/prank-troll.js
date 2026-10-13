// Prank the Sleeping Troll (Molly Party, cheeky) - the big friendly troll is
// snoring against a tree in the meadow. Grab a prank from a basket (A), tiptoe
// over and press A by the troll: a curly crayon moustache, flowers in his
// hair, bows on his ears, a party hat, glitter in his beard, pink toenails...
// three feather tickles make him SNEEZE a flower shower that blows everyone
// back. Big snores blow the pranksters' hair about. Every so often he stirs
// (snore stops, an eye cracks open, a big "!" - nearly 2 s of warning):
// FREEZE and you turn into a bush! Anyone wiggling gets a sleepy swat and
// tumbles away giggling (the prank they carried goes back, maybe one prank
// falls off). Finale: he wakes, a garden fairy holds up a mirror, he ROARS
// with laughter and dances in his prank outfit. Gentle counting + a shared
// "pranks together" tally.
//
// Art hooks (procedural fallbacks ship today): bg/prank-troll, thumb/prank-troll,
//   prop/ptroll-troll-asleep pt-troll-awake pt-basket pt-crayon pt-moustache pt-flower
//   pt-bow pt-party-hat pt-feather pt-glitter pt-polish pt-bush pt-mirror
// Sounds (optional files, fallbacks today): pt-pick pt-prank pt-scribble pt-tickle
//   pt-achoo pt-big-snore pt-stir pt-swat pt-mumble pt-freeze pt-roar-laugh pt-yawn
import { W, H } from '../engine/canvas.js';
import { Actor, drawSpeech, ensureSpriteSet } from '../engine/sprites.js';
import { drawNpcSprite } from '../engine/npc-art.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound, music } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { depthScale } from '../engine/camera.js';
import { reactionTime } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, shuffle, TAU, placementsFromScores } from '../engine/util.js';
import {
  NAVY, TROLL, A, FLOWER_SPOTS, BOW_SPOTS, FLOWER_COLS, configureTrollArt, toScreen, meadowBackground, drawTroll, drawBasket,
  drawItem, drawBush, drawSwat, drawMirror, drawIcon,
} from './prank-troll/draw.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const GAME_T = 61;
const FINALE_AT = 52;
const STIR = 1.8;
const LOOK = 2.0;
const SETTLE = 0.6;
const SPEED = 500;
const BOUNDS = { x0: 90, x1: W - 90, y0: 340, y1: 1020 };
const ZONE = { x: 960, y: 548, rx: 330, ry: 190 };     // the troll + tree (can't walk through)
const REACH = { rx: 470, ry: 300 };                    // close enough to prank him
const PICK_R = 120;
const KINDS = ['crayon', 'flower', 'bow', 'hat', 'feather', 'glitter', 'polish'];
const STATIONS = [
  { kind: 'crayon', x: 330, y: 470 }, { kind: 'flower', x: 1590, y: 470 },
  { kind: 'bow', x: 210, y: 770 }, { kind: 'hat', x: 1710, y: 770 },
  { kind: 'feather', x: 560, y: 965 }, { kind: 'glitter', x: 1360, y: 965 },
  { kind: 'polish', x: 960, y: 925 },
];
const ITEM_ART = { crayon: 'prop/ptroll-crayon', flower: 'prop/ptroll-flower', bow: 'prop/ptroll-bow', hat: 'prop/ptroll-party-hat', feather: 'prop/ptroll-feather', glitter: 'prop/ptroll-glitter', polish: 'prop/ptroll-polish' };

export const meta = {
  id: 'prank-troll',
  title: 'Prank the Sleeping Troll',
  category: 'molly',
  type: 'Sneaky pranks',
  goal: 'Sneak up and give the sleeping troll a silly makeover!',
  controls: [['stick', 'Tiptoe around'], ['a', 'Grab a prank / prank the troll']],
  tips: ['Grab a prank from a basket, then press A next to the troll!', 'When he stirs and the "!" pops up: FREEZE and you turn into a bush!', 'Three feather tickles make him sneeze!'],
  music: 'chill',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    const img = art('thumb/prank-troll');
    if (img) g.drawImage(img, x, y, w, h); else drawIcon(g, x, y, w, h, t || 0);
  },
};

const inZone = (x, y, z = ZONE, k = 1) => ((x - z.x) / (z.rx * k)) ** 2 + ((y - z.y) / (z.ry * k)) ** 2;

export class Game {
  constructor(api) {
    configureTrollArt(!!(art('prop/ptroll-troll-asleep') && art('prop/ptroll-troll-awake')));
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.base = n <= 4 ? 0.82 : 0.7;
    if (api.camera) api.camera.maxZoom = Math.min(api.camera.maxZoom ?? 1.4, 1.2);
    const starts = [];
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0.5 : i / (n - 1);
      starts.push({ x: lerp(380, 1540, k), y: 880 + (i % 2) * 70 });
    }
    this.units = this.players.map((p, i) => {
      const s = starts[i];
      const a = new Actor(p, { scale: this.base, x: s.x, y: s.y });
      a.facing = s.x < W / 2 ? 1 : -1; a.snap();
      const U = {
        p, i, a, x: s.x, y: s.y, vx: 0, vy: 0, kx: 0, ky: 0, item: null, pranks: 0, still: 0, bush: 0,
        swatted: false, stun: 0, sneaky: 0, swats: 0,
        ai: { mode: 'fetch', st: null, tx: s.x, ty: s.y, wait: rand(0.2, 0.8), freezeAt: null, oops: 0, oopsT: 0, dx: 0, dy: 0 },
      };
      a.attach((g, info) => {
        if (!U.item) return;
        const bob = Math.sin(this.t * 8 + i) * 4;
        this.drawItemAt(g, U.item, info.head.x, info.head.y - 44 + bob, 0.8);
      });
      return U;
    });
    this.P = { tache: 0, flowers: [], bows: 0, hats: 0, glitter: 0, toes: 0 };
    this.history = [];
    this.total = 0;
    this.tickles = 0;
    this.tr = { eyeL: 0, eyeR: 0, look: 0, mouth: 0.4, sway: 0, breath: 0, tickle: 0, laugh: false, awake: false, wob: 0 };
    this.troll = { speech: null, mark: null, tickleT: 0, sneezeT: -1, gustT: -1 };
    this.flying = [];
    this.swats = [];
    this.winds = [];
    this.falling = [];
    this.noise = 0;
    this.phase = 'sneak'; this.pt = 0;
    this.round = 0;
    this.banner = null;
    this.finished = false;
    // the mirror fairy: a garden fairy nobody is playing as
    const used = new Set(this.players.map((p) => p.charId.replace(/^molly-/, '')));
    const fairyId = ['garden-fairy-pink', 'garden-fairy-yellow', 'garden-fairy-blue', 'garden-fairy-purple', 'garden-fairy-green'].find((id) => !used.has(id)) || null;
    this.fairy = { asset: fairyId || 'garden-fairy-pink', x: -100, y: 470, z: 120, pose: 'walk' };
    ensureSpriteSet(this.fairy.asset);
    this.fairyOn = false;
    this.snoreT = 0;
  }

  // --- helpers ------------------------------------------------------------------------------
  showBanner(text, dur, color, size = 140) { this.banner = { text, t: 0, dur, color, size }; }
  trollSay(text, dur = 1.4) { this.troll.speech = { text, t: 0, dur }; }
  drawItemAt(g, kind, x, y, s) {
    const img = art(ITEM_ART[kind]);
    if (img) { const w = 70 * s, h = w * img.height / img.width; g.drawImage(img, x - w / 2, y - h / 2, w, h); }
    else drawItem(g, kind, x, y, s, this.t);
  }
  get sleeping() { return this.phase === 'sneak' || this.phase === 'settle'; }

  targetFor(kind) {
    const P = this.P;
    switch (kind) {
      case 'crayon': return A.tache;
      case 'flower': return FLOWER_SPOTS[P.flowers.length % FLOWER_SPOTS.length];
      case 'bow': return BOW_SPOTS[P.bows % BOW_SPOTS.length];
      case 'hat': return A.top;
      case 'feather': return A.nose;
      case 'glitter': return A.chin;
      case 'polish': return P.toes % 2 ? A.toeR : A.toeL;
      default: return A.face;
    }
  }

  // --- phases ---------------------------------------------------------------------------------
  startSneak(resume = false) {
    if (!resume) this.round++;
    this.phase = 'sneak'; this.pt = 0;
    const left = FINALE_AT - this.t;
    let dur = this.round === 1 ? 7.5 : rand(5.2, 7.2) * Math.max(0.75, 1 - this.round * 0.04);
    this.toFinale = false;
    if (left <= dur + STIR + LOOK + SETTLE + 3) {
      if (left <= 9) { dur = left; this.toFinale = true; } else dur = left - STIR - LOOK - SETTLE - 3.5;
    }
    this.sneakDur = Math.max(2, dur);
    this.fake = this.round >= 3 && !this.toFinale && !resume && chance(0.35);
    this.gustAt = this.round >= 2 && this.sneakDur > 4.5 ? rand(2.2, this.sneakDur - 1.6) : -1;
    if (resume) return;
    if (this.round > 1) music.play(this.api.meta.music || 'chill', { fadeIn: 0.4 });
    for (const U of this.units) { U.swatted = false; U.ai.freezeAt = null; U.ai.oops = 0; }
  }

  startStir() {
    this.phase = 'stir'; this.pt = 0;
    this.noise = 0;
    music.stop(0.3);
    snd('pt-stir', 'squeak', { vol: 0.6 });
    this.troll.mark = '?';
    this.showBanner('FREEZE!', 1.4, '#8fdcff', 150);
    fx.shake(5, 0.2);
    for (const U of this.units) {
      U.still = 0;
      const lvl = clamp(U.p.aiLevel ?? 0, 0, 2);
      U.ai.freezeAt = reactionTime(U.p) * [1.5, 1.15, 0.85][lvl] + rand(0.05, 0.35);
      U.ai.oops = !this.fake && chance([0.25, 0.12, 0.05][lvl]) ? rand(0.15, 0.5) : 0;
      if (!U.p.isAI) U.p.ctrl.rumble(0.45, 200);
    }
  }

  startLook() {
    this.phase = 'look'; this.pt = 0;
    this.troll.mark = '!';
    this.lookSaid = false;
    snd('pt-mumble', null, { vol: 0.6 });
    fx.shake(4, 0.15);
  }

  startSettle(phew = false) {
    this.phase = 'settle'; this.pt = 0;
    this.troll.mark = null;
    this.resumeAfter = phew;
    if (phew) this.showBanner('Phew!', 1.0, '#9ff0c8', 140);
    else {
      for (const U of this.units) {
        if (!U.swatted && U.bush > 0.5) {
          U.pranks += 1; U.sneaky++;
          particles.popText(U.x, U.y - U.a.height - 60, 'Sneaky! +1', '#9ff0c8', 42);
          particles.burst(U.x, U.y - U.a.height * 0.5, { type: 'petal', count: 6, colors: ['#5cc35a', '#ff9fd2'], speed: [60, 180] });
        }
      }
      snd('pt-freeze', 'sparkle', { vol: 0.4 });
    }
    this.trollSay('Zzz...', 1.0);
  }

  startFinale() {
    this.phase = 'finale'; this.pt = 0;
    music.stop(0.4);
    this.troll.mark = null;
    this.fstep = 0;
    for (const U of this.units) { U.ai.freezeAt = null; }
  }

  // --- frame ------------------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    this.animTroll(dt, this.t0);
    for (const U of this.units) { U.a.setPose(U.i % 2 ? 'wave' : 'ready'); this.placeActor(U); U.a.update(dt); }
  }

  update(dt) {
    this.t += dt; this.pt += dt;
    if (this.round === 0) this.startSneak();
    const tr = this.troll;
    if (tr.speech) { tr.speech.t += dt; if (tr.speech.t > tr.speech.dur) tr.speech = null; }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    switch (this.phase) {
      case 'sneak':
        if (this.gustAt > 0 && this.pt >= this.gustAt) { this.gustAt = -1; this.bigSnore(); }
        if (this.pt >= this.sneakDur) { if (this.toFinale) this.startFinale(); else this.startStir(); }
        else if (this.noise >= 1 && this.pt > 2.5 && !this.toFinale) { this.trollSay('Hrmm?', 1.0); this.startStir(); }
        break;
      case 'stir':
        if (this.fake && this.pt >= STIR) { snd('pt-big-snore', 'snore', { vol: 0.6 }); this.startSettle(true); }
        else if (this.pt >= STIR) this.startLook();
        break;
      case 'look': if (this.pt >= LOOK) this.startSettle(); break;
      case 'settle': if (this.pt >= SETTLE) { music.play(this.api.meta.music || 'chill', { fadeIn: 0.4 }); this.startSneak(this.resumeAfter); } break;
      case 'finale': this.updateFinale(dt); break;
      case 'end': if (this.pt >= 1.0) this.finishNow(); break;
      default: break;
    }
    this.noise = Math.max(0, this.noise - dt * 0.22);
    // snores
    if (this.sleeping) {
      this.snoreT -= dt;
      if (this.snoreT <= 0) { this.snoreT = 2.4; snd('snore', 'snore', { vol: 0.35 }); }
    }
    this.updateSneeze(dt);
    for (const U of this.units) {
      if (U.p.isAI) this.ai(U, dt);
      this.control(U, dt);
    }
    this.updateFlying(dt);
    this.updateSwats(dt);
    this.updateFx(dt);
    this.animTroll(dt, this.t);
  }

  postUpdate(dt) {
    this.t += dt * 0.5;
    if (this.troll.speech) this.troll.speech.t += dt;
    if (this.banner) this.banner.t += dt;
    this.updateFinale(dt, true);
    this.animTroll(dt, this.t);
    for (const U of this.units) { this.placeActor(U); U.a.update(dt); }
    this.updateFx(dt);
  }

  animTroll(dt, t) {
    const tr = this.tr, ph = this.phase;
    const sleepy = ph === 'sneak' || ph === 'settle';
    tr.breath = Math.sin(t * 2.6);
    tr.mouth = sleepy ? 0.35 + 0.35 * Math.max(0, Math.sin(t * 2.6)) + (this.troll.gustT > 0 ? 0.6 : 0) : ph === 'stir' ? 0.15 : 0.1;
    let eyeL = 0, eyeR = 0, look = 0;
    if (ph === 'stir') { eyeR = clamp((this.pt - 0.4) / 1.2, 0, 0.45); tr.wob = Math.sin(this.pt * 9) * 0.6; }
    else if (ph === 'look') { eyeL = 0.9; eyeR = 1; look = Math.sin(this.pt * 3.2); tr.wob = 0; }
    else if (ph === 'finale' || ph === 'end') { eyeL = eyeR = clamp(this.pt / 0.8, 0, 1); look = this.pt > 1.8 && this.pt < 2.6 ? 1 : 0; }
    else tr.wob = damp(tr.wob, 0, 4, dt);
    tr.eyeL = damp(tr.eyeL, eyeL, 10, dt); tr.eyeR = damp(tr.eyeR, eyeR, 10, dt); tr.look = damp(tr.look, look, 6, dt);
    tr.tickle = damp(tr.tickle, this.troll.tickleT > 0 ? 1 : 0, 8, dt);
    this.troll.tickleT = Math.max(0, this.troll.tickleT - dt);
    const dance = this.dancing ? Math.sin(t * 6) * 1.6 : 0;
    tr.sway = tr.wob + dance + (this.troll.tickleT > 0 ? Math.sin(t * 30) * 0.3 : 0);
  }

  // --- players --------------------------------------------------------------------------------------
  control(U, dt) {
    const c = U.p.ctrl, a = U.a;
    const finale = this.phase === 'finale' || this.phase === 'end';
    U.stun = Math.max(0, U.stun - dt);
    const mag = Math.hypot(c.x, c.y);
    const moving = mag > 0.3 || c.pressed('a');
    // freeze detection (stir + look)
    const watch = this.phase === 'stir' || this.phase === 'look';
    if (watch && !moving && U.stun <= 0) U.still += dt; else U.still = 0;
    const wantBush = watch && U.still > 0.2 && !U.swatted;
    U.bush = damp(U.bush, wantBush ? 1 : 0, wantBush ? 14 : 8, dt);
    if (wantBush && U.bush > 0.5 && !U.bushed) { U.bushed = true; snd('pt-freeze', 'pop', { vol: 0.25 }); particles.burst(U.x, U.y - 40, { type: 'petal', count: 4, colors: ['#5cc35a', '#7fd35f'], speed: [60, 140] }); }
    if (!wantBush) U.bushed = false;
    // caught wiggling while he looks
    if (this.phase === 'look' && this.pt > 0.2 && moving && !U.swatted && U.stun <= 0) this.swat(U);
    // movement
    let vx = 0, vy = 0;
    if (U.stun <= 0 && !finale) {
      const sp = SPEED * Math.min(1, mag);
      vx = (mag > 0.15 ? c.x / mag : 0) * sp; vy = (mag > 0.15 ? c.y / mag : 0) * sp;
    }
    U.vx = damp(U.vx, vx, 12, dt); U.vy = damp(U.vy, vy, 12, dt);
    U.kx *= Math.pow(0.04, dt); U.ky *= Math.pow(0.04, dt);
    U.x += (U.vx + U.kx) * dt; U.y += (U.vy + U.ky) * dt;
    this.collide(U);
    // noise: running near him while carrying
    if (this.sleeping && U.item && mag > 0.85 && inZone(U.x, U.y, ZONE, 1.9) < 1) {
      this.noise += dt * 0.32;
      if (chance(dt * 6)) particles.burst(U.x + rand(-20, 20), U.y, { type: 'dust', count: 2, colors: ['#d8c79a', '#ffffff'], speed: [40, 100] });
      if (chance(dt * 1.2)) particles.popText(U.x + rand(-30, 30), U.y - U.a.height - 20, 'stomp', '#ffffff', 28);
    }
    // A: grab or prank
    if (c.pressed('a') && U.stun <= 0 && !finale) {
      if (!U.item) {
        const st = STATIONS.find((s) => Math.hypot(s.x - U.x, s.y - 20 - U.y) < PICK_R + U.a.radius * 0.4);
        if (st) this.grab(U, st);
      } else if (inZone(U.x, U.y, { x: ZONE.x, y: ZONE.y, ...REACH }) < 1) this.prank(U);
    }
    // poses
    if (!a._once) {
      if (finale) a.setPose(this.dancing ? (U.i % 2 ? 'dance' : 'laugh') : 'surprised');
      else if (U.bush > 0.5) a.setPose('crouch');
      else a.moveAnim(U.vx, U.vy, SPEED, { run: mag > 0.85 });
    }
    this.placeActor(U);
    a.update(dt);
  }

  placeActor(U) {
    const a = U.a;
    a.x = U.x; a.y = U.y;
    a.scale = this.base * depthScale(U.y, { top: 340, near: 1020, far: 0.82, nearScale: 1.05 });
  }

  collide(U) {
    U.x = clamp(U.x, BOUNDS.x0, BOUNDS.x1); U.y = clamp(U.y, BOUNDS.y0, BOUNDS.y1);
    const d = inZone(U.x, U.y);
    if (d < 1) {
      const nx = (U.x - ZONE.x) / ZONE.rx, ny = (U.y - ZONE.y) / ZONE.ry;
      const len = Math.hypot(nx, ny) || 1;
      U.x = ZONE.x + (nx / len) * ZONE.rx * 1.001; U.y = ZONE.y + (ny / len) * ZONE.ry * 1.001;
    }
    // gentle separation so friends don't stack
    for (const V of this.units) {
      if (V === U) continue;
      const dx = U.x - V.x, dy = (U.y - V.y) * 1.6, dd = Math.hypot(dx, dy);
      if (dd > 0 && dd < 70) { U.x += (dx / dd) * (70 - dd) * 0.3; U.y += (dy / dd) * (70 - dd) * 0.18; }
    }
  }

  grab(U, st) {
    U.item = st.kind;
    U.a.playOnce('catch', 0.3); U.a.squash(0.25);
    snd('pt-pick', 'pop', { vol: 0.4 });
    particles.burst(st.x, st.y - 80, { type: 'sparkle', count: 6, colors: ['#ffffff', '#ffd23f', U.p.color], speed: [60, 180] });
    if (!U.p.isAI) U.p.ctrl.rumble(0.2, 60);
  }

  prank(U) {
    const kind = U.item;
    U.item = null;
    const tgt = this.targetFor(kind);
    const to = toScreen(tgt);
    this.flying.push({ kind, x0: U.x, y0: U.y - U.a.height - 40, x: U.x, y: U.y, tx: to.x, ty: to.y, t: 0, dur: 0.42, U });
    U.a.playOnce('throw', 0.35); U.a.squash(0.25);
    snd('pt-swoosh', 'whoosh', { vol: 0.3 });
  }

  land(F) {
    const P = this.P, U = F.U, kind = F.kind;
    switch (kind) {
      case 'crayon': P.tache = Math.min(3, P.tache + 1); snd('pt-scribble', 'brush', { vol: 0.7 }); break;
      case 'flower': if (P.flowers.length < FLOWER_SPOTS.length) P.flowers.push(FLOWER_COLS[P.flowers.length % FLOWER_COLS.length]); snd('pt-prank', 'grow', { vol: 0.5 }); break;
      case 'bow': P.bows = Math.min(BOW_SPOTS.length, P.bows + 1); snd('pt-prank', 'sparkle', { vol: 0.5 }); break;
      case 'hat': P.hats = Math.min(1, P.hats + 1); snd('pt-prank', 'pop', { vol: 0.6 }); break;
      case 'glitter': P.glitter = Math.min(4, P.glitter + 1); snd('pt-prank', 'sparkle', { vol: 0.6 }); break;
      case 'polish': P.toes = Math.min(10, P.toes + 2); snd('pt-prank', 'brush', { vol: 0.5 }); break;
      case 'feather': this.tickle(U); break;
      default: break;
    }
    if (kind !== 'feather') this.history.push(kind);
    U.pranks += 1; this.total += 1;
    const to = { x: F.tx, y: F.ty };
    particles.burst(to.x, to.y, { type: 'sparkle', count: 12, colors: ['#ffffff', '#ffd23f', '#ff7ac6', U.p.color], speed: [100, 300] });
    particles.popText(U.x, U.y - U.a.height - 60, '+1', '#ffd23f', 46);
    if (U.a && !U.a._once) U.a.playOnce('cheer', 0.4);
    if (!U.p.isAI) { sfx('collect', { step: U.pranks % 8, vol: 0.3 }); U.p.ctrl.rumble(0.3, 80); }
    // he mumbles and smiles in his sleep
    this.tr.wob = 0.8;
    if (chance(0.4) && kind !== 'feather') this.trollSay(pick(['Mmm...', 'Hehe...', 'Zzz...']), 0.9);
    if (this.total % 10 === 0) { this.showBanner(`${this.total} pranks!`, 1.0, '#ffd23f', 110); fx.flash('#ffffff', 0.1); sfx('star'); }
  }

  tickle(U) {
    this.tickles++;
    this.troll.tickleT = 1.3;
    snd('pt-tickle', 'giggle', { vol: 0.7 });
    this.trollSay(this.tickles % 3 === 2 ? 'Ah... ah...' : 'Hee hee...', 1.0);
    U.tickles = (U.tickles || 0) + 1;
    if (this.tickles % 3 === 0 && this.troll.sneezeT < 0) this.troll.sneezeT = 0.9;
  }

  updateSneeze(dt) {
    const tr = this.troll;
    if (tr.sneezeT < 0 || !this.sleeping) return;
    tr.sneezeT -= dt;
    this.tr.wob = Math.sin(this.t * 20) * 0.5;
    if (tr.sneezeT > 0) return;
    tr.sneezeT = -1;
    // ACHOO! a flower shower that blows everyone back
    const nose = toScreen(A.nose);
    snd('pt-achoo', 'boom', { vol: 0.7 });
    fx.shake(16, 0.35); fx.flash('#fff0f8', 0.15); fx.slowmo(0.5, 0.4);
    if (this.api.camera) this.api.camera.punch(nose.x, nose.y + 100, 1.12, 0.6);
    particles.popText(nose.x, nose.y - 120, 'ACHOO!', '#ff7ac6', 90);
    for (let k = 0; k < 4; k++) particles.burst(nose.x, nose.y + 30, { type: 'petal', count: 22, colors: FLOWER_COLS, speed: [300, 900], angle: Math.PI / 2, spread: 1.3 });
    particles.burst(nose.x, nose.y + 30, { type: 'confetti', count: 30, colors: RAINBOW, speed: [300, 800], angle: Math.PI / 2, spread: 1.2 });
    for (const U of this.units) {
      const dx = U.x - ZONE.x, dy = U.y - ZONE.y, d = Math.hypot(dx, dy) || 1;
      if (d < 760) {
        const f = 900 * (1 - d / 900);
        U.kx += (dx / d) * f; U.ky += (dy / d) * f;
        U.stun = Math.max(U.stun, 0.4);
        U.a.playOnce('tumble', 0.5, 'giggle'); U.a.squash(0.3);
        voice(U.p.charId, 'laugh');
      }
      if ((U.tickles || 0) > 0) { U.pranks += 1; particles.popText(U.x, U.y - U.a.height - 90, 'Achoo! +1', '#ff7ac6', 42); U.tickles = 0; }
    }
    this.total += 1;
    // a few new flowers land in his hair from the sneeze
    for (let k = 0; k < 2; k++) if (this.P.flowers.length < FLOWER_SPOTS.length) this.P.flowers.push(pick(FLOWER_COLS));
  }

  bigSnore() {
    this.troll.gustT = 0.7;
    snd('pt-big-snore', 'snore', { vol: 1 });
    fx.shake(8, 0.3);
    const m = toScreen(A.mouth);
    for (let k = 0; k < 14; k++) this.winds.push({ x: m.x + rand(-60, 60), y: m.y + rand(0, 40), a: Math.PI / 2 + rand(-1.3, 1.3), t: 0, life: rand(0.5, 0.9), len: rand(60, 140) });
    particles.popText(m.x + 140, m.y - 40, 'SNORRRE', '#ffffff', 56);
    for (const U of this.units) {
      const dx = U.x - ZONE.x, dy = U.y - ZONE.y, d = Math.hypot(dx, dy) || 1;
      if (d < 560) {
        U.kx += (dx / d) * 520; U.ky += (dy / d) * 520;
        U.a.playOnce('surprised', 0.5); U.a.squash(0.2);
        particles.burst(U.x, U.y - U.a.height * 0.9, { type: 'dust', count: 5, colors: ['#ffffff'], speed: [100, 220], angle: Math.atan2(dy, dx), spread: 0.6 });
      }
    }
  }

  swat(U) {
    U.swatted = true; U.swats++;
    const side = U.x < ZONE.x ? -1 : 1;
    const sh = toScreen(side < 0 ? [230, 340] : [670, 340]);
    this.swats.push({ U, sx: sh.x, sy: sh.y, tx: U.x, ty: U.y - U.a.height * 0.5, t: 0, hit: false });
    if (!this.lookSaid) { this.lookSaid = true; this.trollSay('Mmm?!', 1.2); }
  }

  updateSwats(dt) {
    for (const S of this.swats) {
      S.t += dt;
      if (!S.hit && S.t >= 0.28) {
        S.hit = true;
        const U = S.U;
        const dx = U.x - ZONE.x, dy = U.y - ZONE.y, d = Math.hypot(dx, dy) || 1;
        U.kx += (dx / d) * 800; U.ky += (dy / d) * 800;
        U.stun = 1.0;
        U.a.playOnce('tumble', 0.55, 'giggle'); U.a.squash(0.4); U.a.emote('dizzy', 1.2);
        voice(U.p.charId, 'laugh');
        snd('pt-swat', 'whoosh', { vol: 0.6 }); snd('pt-boing', 'boing', { vol: 0.5 });
        fx.shake(7, 0.2);
        particles.popText(U.x, U.y - U.a.height - 70, 'Hee hee!', '#ff9ad0', 44);
        particles.burst(U.x, U.y - U.a.height * 0.5, { type: 'star', count: 8, colors: ['#ffd23f', '#ffffff'], speed: [120, 300] });
        if (!U.p.isAI) U.p.ctrl.rumble(0.5, 200);
        // the prank they carried hops back into its basket
        if (U.item) {
          const st = STATIONS.find((s) => s.kind === U.item);
          this.falling.push({ kind: U.item, x: U.x, y: U.y - U.a.height, tx: st.x, ty: st.y - 80, t: 0, dur: 0.7, arc: 220 });
          U.item = null;
        }
        // maybe one prank falls off him
        if (this.history.length && chance(0.5)) this.dropPrank();
      }
      S.dead = S.t > 0.7;
    }
    this.swats = this.swats.filter((S) => !S.dead);
  }

  dropPrank() {
    const kind = this.history.pop(), P = this.P;
    let at = null;
    if (kind === 'crayon' && P.tache > 0) { at = A.tache; P.tache--; }
    else if (kind === 'flower' && P.flowers.length) { at = FLOWER_SPOTS[P.flowers.length - 1]; P.flowers.pop(); }
    else if (kind === 'bow' && P.bows > 0) { P.bows--; at = BOW_SPOTS[P.bows]; }
    else if (kind === 'hat' && P.hats > 0 && !this.history.includes('hat')) { P.hats = 0; at = A.top; }
    else if (kind === 'glitter' && P.glitter > 0) { P.glitter--; at = A.chin; }
    else if (kind === 'polish' && P.toes > 0) { P.toes = Math.max(0, P.toes - 2); at = A.toeL; }
    if (!at) return;
    const p = toScreen(at);
    const st = STATIONS.find((s) => s.kind === kind);
    this.falling.push({ kind, x: p.x, y: p.y, tx: st.x, ty: st.y - 80, t: 0, dur: 0.9, arc: 300 });
    particles.popText(p.x, p.y - 30, 'oops!', '#ffffff', 40);
  }

  updateFlying(dt) {
    for (const F of this.flying) {
      F.t += dt;
      const k = clamp(F.t / F.dur, 0, 1);
      F.x = lerp(F.x0, F.tx, k); F.y = lerp(F.y0, F.ty, k) - Math.sin(k * Math.PI) * 160;
      if (k >= 1 && !F.done) { F.done = true; this.land(F); }
    }
    this.flying = this.flying.filter((F) => !F.done);
    for (const F of this.falling) { F.t += dt; if (F.t >= F.dur) F.dead = true; }
    this.falling = this.falling.filter((F) => !F.dead);
  }

  updateFx(dt) {
    this.troll.gustT = Math.max(-1, this.troll.gustT - dt);
    for (const w of this.winds) w.t += dt;
    this.winds = this.winds.filter((w) => w.t < w.life);
  }

  // --- finale -------------------------------------------------------------------------------------------
  updateFinale(dt, post = false) {
    if (this.phase !== 'finale' && this.phase !== 'end') return;
    const pt = this.pt;
    const step = (k, at, fn) => { if (this.fstep === k && pt >= at) { this.fstep++; fn(); } };
    step(0, 0, () => { snd('pt-yawn', 'aww', { vol: 0.5 }); this.trollSay('Yaaawn!', 1.2); fx.shake(4, 0.2); });
    step(1, 0.8, () => {
      this.fairyOn = true;
      this.fairy.x = -80; this.fairy.pose = 'walk';
      snd('pt-fairy', 'magic', { vol: 0.6 });
    });
    if (this.fairyOn) {
      const k = clamp((pt - 0.8) / 1.1, 0, 1);
      this.fairy.x = lerp(-80, 1340, 1 - Math.pow(1 - k, 3)); this.fairy.z = 140 + Math.sin(this.t * 4) * 14;
      if (k >= 1 && this.fairy.pose === 'walk') this.fairy.pose = 'idle';
    }
    step(2, 2.0, () => { this.troll.mark = '!'; snd('pt-stir', 'squeak', { vol: 0.6 }); this.trollSay('!!!', 0.8); });
    step(3, 2.7, () => {
      this.troll.mark = null;
      this.tr.laugh = true; this.dancing = true;
      snd('pt-roar-laugh', 'roar', { vol: 0.9 }); sfx('cheer');
      fx.shake(18, 0.5); fx.flash('#fff6c0', 0.2); fx.slowmo(0.45, 0.6);
      if (this.api.camera) this.api.camera.punch(TROLL.x, 420, 1.12, 0.8);
      particles.confettiRain(W, 140);
      const f = toScreen(A.face);
      for (let k = 0; k < 3; k++) particles.burst(f.x, f.y, { type: 'petal', count: 20, colors: FLOWER_COLS, speed: [300, 800] });
      this.trollSay('HA HA HA!', 2.0);
      music.play('party', { fadeIn: 0.3 });
      for (const U of this.units) {
        U.pranks += 2;
        particles.popText(U.x, U.y - U.a.height - 60, 'Ha ha! +2', '#ffd23f', 44);
        U.a.playOnce('laugh', 0.8, 'dance');
        voice(U.p.charId, 'laugh');
      }
      this.fairy.pose = 'celebrate';
    });
    step(4, 8.0, () => { this.phase = 'end'; this.pt = 0; });
    if (this.dancing && !post && chance(dt * 4)) {
      const f = toScreen(A.face);
      particles.burst(f.x + rand(-200, 200), f.y - 100, { type: 'note', count: 1, colors: RAINBOW, speed: [80, 200], angle: -Math.PI / 2, spread: 0.8 });
    }
  }

  finishNow() {
    if (this.finished) return;
    this.finished = true;
    this.api.finish({
      placements: placementsFromScores(this.units.map((U) => U.pranks)),
      stats: this.units.map((U) => `${U.pranks} pranks`),
      focus: { x: W / 2, y: 520, zoom: 1.05 },
      ...(this.total > 0 ? { title: `${this.total} pranks together!` } : {}),
    });
  }

  // --- CPU ---------------------------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, A2 = U.ai, c = p.ctrl, lvl = clamp(p.aiLevel ?? 0, 0, 2);
    if (this.phase === 'finale' || this.phase === 'end') { c.move(0, 0); return; }
    if (this.phase === 'stir' || this.phase === 'look') {
      const freezeNow = A2.freezeAt != null && (this.phase === 'look' || this.pt >= A2.freezeAt);
      if (!freezeNow) { this.aiWalk(U, dt, lvl); return; }
      if (this.phase === 'look' && A2.oops > 0) { A2.oops -= dt; this.aiWalk(U, dt, lvl); return; }
      c.move(0, 0); return;
    }
    if (U.stun > 0) { c.move(0, 0); return; }
    if (A2.wait > 0) { A2.wait -= dt; c.move(0, 0); return; }
    if (chance(dt * [0.25, 0.12, 0.05][lvl])) { A2.wait = rand(0.4, 1.1); return; }
    this.aiWalk(U, dt, lvl);
  }

  aiWalk(U, dt, lvl) {
    const A2 = U.ai, c = U.p.ctrl;
    if (!U.item) {
      if (!A2.st || A2.mode !== 'fetch') {
        A2.mode = 'fetch';
        // prefer a basket that's near-ish, with some silliness
        const opts = shuffle(STATIONS.slice()).sort((a, b) => Math.hypot(a.x - U.x, a.y - U.y) * rand(0.6, 1.4) - Math.hypot(b.x - U.x, b.y - U.y) * rand(0.6, 1.4));
        A2.st = opts[Math.min(opts.length - 1, Math.floor(rand(0, 3)))];
      }
      A2.tx = A2.st.x; A2.ty = A2.st.y + 10;
      if (Math.hypot(A2.tx - U.x, A2.ty - U.y) < 90) { c.press('a'); A2.wait = rand(0.15, 0.4) + [0.4, 0.2, 0][lvl]; }
    } else {
      if (A2.mode !== 'deliver') {
        A2.mode = 'deliver';
        const ang = Math.atan2((U.y - ZONE.y) / ZONE.ry, (U.x - ZONE.x) / ZONE.rx) + rand(-0.4, 0.4);
        const a = clamp(ang, 0.1, Math.PI - 0.1);
        A2.tx = ZONE.x + Math.cos(a) * ZONE.rx * 1.18; A2.ty = ZONE.y + Math.sin(a) * ZONE.ry * 1.18;
      }
      if (inZone(U.x, U.y, { x: ZONE.x, y: ZONE.y, ...REACH }) < 0.75) { c.press('a'); A2.mode = 'fetch'; A2.st = null; A2.wait = rand(0.2, 0.6) + [0.5, 0.25, 0][lvl]; c.move(0, 0); return; }
    }
    // route round the troll if the straight line crosses him
    let tx = A2.tx, ty = A2.ty;
    let blocked = false;
    for (let k = 1; k < 8; k++) { const x = lerp(U.x, tx, k / 8), y = lerp(U.y, ty, k / 8); if (inZone(x, y, ZONE, 1.05) < 1) { blocked = true; break; } }
    if (blocked) { tx = U.x < ZONE.x === tx < ZONE.x ? tx : ZONE.x + (U.x < ZONE.x ? -1 : 1) * 60; ty = ZONE.y + ZONE.ry + 130; if (Math.abs(U.y - ty) < 40) tx = A2.tx; }
    const dx = tx - U.x, dy = ty - U.y, d = Math.hypot(dx, dy);
    const sp = [0.62, 0.74, 0.84][lvl] * clamp(d / 60, 0.3, 1);
    const wob = Math.sin(this.t * 2 + U.i * 1.7) * [0.4, 0.22, 0.1][lvl];
    const ang = Math.atan2(dy, dx) + wob;
    c.move(Math.cos(ang) * sp, Math.sin(ang) * sp);
  }

  // --- drawing ------------------------------------------------------------------------------------------
  draw(g) {
    const t = this.t || this.t0;
    const bg = art('bg/prank-troll');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(meadowBackground(), 0, 0);
    // stations, players and the troll, sorted by depth
    const list = [];
    for (const st of STATIONS) list.push({ y: st.y, fn: () => this.drawStation(g, st, t) });
    list.push({ y: ZONE.y + 40, fn: () => this.drawTrollAll(g, t) });
    for (const U of this.units) list.push({ y: U.y, fn: () => this.drawUnit(g, U, t) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.fn();
    // swats, flying pranks, wind
    for (const S of this.swats) {
      const k = S.t < 0.28 ? S.t / 0.28 : Math.max(0, 1 - (S.t - 0.28) / 0.42);
      drawSwat(g, S.sx, S.sy, S.tx, S.ty, k);
    }
    for (const F of this.flying) this.drawItemAt(g, F.kind, F.x, F.y, 0.9);
    for (const F of this.falling) {
      const k = clamp(F.t / F.dur, 0, 1);
      g.save(); g.globalAlpha = 1 - k * 0.3;
      this.drawItemAt(g, F.kind, lerp(F.x, F.tx, k), lerp(F.y, F.ty, k) - Math.sin(k * Math.PI) * F.arc, 0.8);
      g.restore();
    }
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineCap = 'round';
    for (const w of this.winds) {
      const k = w.t / w.life, d = 80 + k * 500;
      g.globalAlpha = 1 - k; g.lineWidth = 8 * (1 - k) + 2;
      const x = w.x + Math.cos(w.a) * d, y = w.y + Math.sin(w.a) * d * 0.7;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(w.a) * w.len, y + Math.sin(w.a) * w.len * 0.7); g.stroke();
    }
    g.restore();
    // the mirror fairy
    if (this.fairyOn) {
      const f = this.fairy, fy = f.y - f.z, fh = 130;
      g.save(); g.globalAlpha = 0.25; g.fillStyle = NAVY; g.beginPath(); g.ellipse(f.x, f.y, 40, 12, 0, 0, TAU); g.fill(); g.restore();
      if (!drawNpcSprite(g, f.asset, f.x, fy, fh, t, { pose: f.pose, facing: -1 })) {
        // tiny fallback fairy: wings + body
        g.save(); g.translate(f.x, fy - 60);
        g.fillStyle = 'rgba(200,240,255,0.85)'; g.beginPath(); g.ellipse(18, -10, 30, 18, -0.5 + Math.sin(t * 30) * 0.3, 0, TAU); g.fill();
        g.fillStyle = '#ff9fd2'; g.beginPath(); g.ellipse(0, 20, 18, 30, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffe0c8'; g.beginPath(); g.arc(0, -16, 16, 0, TAU); g.fill();
        g.restore();
      }
      const mImg = art('prop/ptroll-mirror');
      const mx = f.x - 70, my = fy - fh * 0.55;
      if (mImg) g.drawImage(mImg, mx - 50, my - 65, 100, 130); else drawMirror(g, mx, my, 1.1, t);
    }
  }

  drawTrollAll(g, t) {
    const tr = this.tr;
    drawTroll(g, { ...tr, awake: this.phase === 'finale' || this.phase === 'end' }, this.P, t, art('prop/ptroll-troll-asleep'), art('prop/ptroll-troll-awake'));
    // Zzz
    if (this.sleeping) {
      const m = toScreen(A.face);
      for (let k = 0; k < 3; k++) {
        const zt = (t * 0.45 + k / 3) % 1;
        g.save(); g.globalAlpha = Math.sin(zt * Math.PI);
        ui.text(g, 'Z', m.x + 180 + zt * 90, m.y - 60 - zt * 110, { size: 40 + zt * 34, color: '#ffffff', strokeWidth: 8 });
        g.restore();
      }
    }
    // "?" / "!" over his head
    if (this.troll.mark) {
      const k = this.phase === 'stir' ? clamp(this.pt / 0.4, 0, 1) : 1;
      const p = toScreen(A.top);
      g.save(); g.translate(p.x + 230, p.y + 40 + Math.sin(t * 12) * 6); g.scale(k, k);
      ui.text(g, this.troll.mark, 0, 0, { size: this.troll.mark === '!' ? 150 : 120, color: '#ffd23f', strokeWidth: 16 });
      g.restore();
    }
    // targets for anyone carrying a prank
    const carried = new Set(this.units.filter((U) => U.item).map((U) => U.item));
    for (const kind of carried) {
      const p = toScreen(this.targetFor(kind));
      g.save(); g.globalAlpha = 0.55 + 0.35 * Math.sin(t * 8);
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.setLineDash([10, 8]);
      g.beginPath(); g.arc(p.x, p.y, 30 + Math.sin(t * 8) * 4, 0, TAU); g.stroke(); g.setLineDash([]);
      g.restore();
    }
    if (this.troll.speech) {
      const s = this.troll.speech, p = toScreen(A.face);
      drawSpeech(g, s.text, p.x - 250, p.y - 70, 1.25, s.t, s.dur);
    }
  }

  drawStation(g, st, t) {
    const img = art('prop/ptroll-basket');
    if (img) g.drawImage(img, st.x - 75, st.y - 56, 150, 112); else drawBasket(g, st.x, st.y, 1);
    const bob = Math.sin(t * 3 + st.x) * 8;
    this.drawItemAt(g, st.kind, st.x, st.y - 100 + bob, 1.0);
    // A prompt for a human next to it with empty hands
    const near = this.units.some((U) => !U.p.isAI && !U.item && Math.hypot(st.x - U.x, st.y - 20 - U.y) < PICK_R + 30);
    if (near && this.phase !== 'finale') ui.glyph(g, 'a', st.x + 60, st.y - 150, 44, { pulse: true });
  }

  drawUnit(g, U, t) {
    const a = U.a;
    a.draw(g, { ring: U.p.color });
    if (U.bush > 0.02) {
      const img = art('prop/ptroll-bush');
      const w = Math.max(110, a.width * 1.2), h = a.height * 0.95;
      if (img) { g.save(); g.translate(U.x, U.y + 6); g.scale(U.bush, U.bush); g.drawImage(img, -w / 2, -h, w, h); g.restore(); }
      else drawBush(g, U.x, U.y + 6, w, h, U.bush, t, U.i);
    }
    // prank prompt for a human carrying next to the troll
    if (!U.p.isAI && U.item && this.phase !== 'finale' && inZone(U.x, U.y, { x: ZONE.x, y: ZONE.y, ...REACH }) < 1) {
      ui.glyph(g, 'a', U.x + 50, U.y - a.height - 90, 44, { pulse: true });
    }
    if (this.t < 5 || (!U.p.isAI && this.n > 1 && this.t < 9)) {
      const sc = this.n > 4 ? 0.8 : 0.95;
      g.save(); g.translate(U.x, U.y - a.height - (U.item ? 100 : 30)); g.scale(sc, sc); ui.playerTag(g, U.p, 0, 0); g.restore();
    }
  }

  drawHUD(g) {
    const t = this.t || this.t0;
    ui.scoreboard(g, this.players, this.units.map((U) => U.pranks), {
      y: 16, avoidCenter: true, format: (v) => `${v}`,
      expr: this.units.map((U) => (U.stun > 0 ? 'happy' : U.bush > 0.5 ? 'surprised' : 'neutral')),
    });
    ui.timer(g, Math.max(0, GAME_T - this.t));
    // shared tally
    g.save();
    ui.panel(g, W - 300, 108, 270, 66, { r: 33, fill: '#fff8ec' });
    ui.text(g, `Together: ${this.total}`, W - 165, 142, { size: 34, color: NAVY, stroke: false, weight: 800 });
    g.restore();
    // noise meter (only once it matters)
    if (this.noise > 0.05 && this.sleeping) {
      const x = 60, y = 130;
      ui.panel(g, x - 20, y - 10, 280, 60, { r: 30, fill: '#ffffff' });
      ui.text(g, 'Shh!', x + 40, y + 21, { size: 30, color: NAVY, stroke: false, weight: 800 });
      ui.bar(g, x + 90, y + 8, 150, 26, clamp(this.noise, 0, 1), this.noise > 0.7 ? '#ff6f6f' : '#ffb347');
    }
    if (this.banner) {
      const b = this.banner, fade = clamp((b.dur - b.t) / 0.25, 0, 1);
      g.save(); g.globalAlpha = fade;
      ui.banner(g, b.text, b.t, { size: b.size, y: 790, color: b.color });
      g.restore();
    }
    let hint = null, glyph = null;
    if (this.round === 1 && this.phase === 'sneak' && this.t < 8) { hint = 'Grab a prank from a basket!'; glyph = 'a'; }
    else if (this.round <= 2 && (this.phase === 'stir' || this.phase === 'look')) hint = 'Freeze! Hands off!';
    if (hint) {
      const w = ui.measure(g, hint, 40, 800) + (glyph ? 150 : 80);
      ui.panel(g, W / 2 - w / 2, H - 98, w, 72, { r: 36, fill: glyph ? '#fff8ec' : '#e6f7ff' });
      ui.text(g, hint, W / 2 - (glyph ? 30 : 0), H - 61, { size: 40, color: NAVY, stroke: false, weight: 800 });
      if (glyph) ui.glyph(g, glyph, W / 2 + w / 2 - 52, H - 62, 50, { pulse: true });
    }
  }
}
