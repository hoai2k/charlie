// No Jumping on the Bed! (Molly Party, cheeky) - Nanny Moo, a kindly cow in a
// nightcap, says goodnight and shuts the door... BOUNCE! Hold A to bounce
// higher and higher on a giant fluffy bed (every landing with A held goes
// higher), steer with the stick, grab stars, touch the glow-stars on the
// ceiling and bonk friends with pillows (tap A in the air) for feather
// explosions. When the hallway light shows under the door, thump-thump
// footsteps come and the handle wiggles (2 s warning): LET GO to flop under
// the duvet and fake-snore. Anyone still bouncing when Nanny Moo peeks gets a
// pompous "Hmm!" and a few stars wobble out (grab them again). Teddies and the
// cat join in, the springs go super, feathers fill the room. Finale: Nanny Moo
// walks in, sighs at the feather storm... and jumps on the bed herself.
//
// Art hooks (procedural fallbacks ship today): bg/bed-bounce, thumb/bed-bounce,
//   prop/bb-bed bb-door nanny-moo nanny-moo-peek nanny-moo-jump bb-pillow
//   bb-feather bb-star bb-glowstar bb-teddy bb-cat
// Sounds (optional files, fallbacks today): bb-boing bb-boing-big bb-flop
//   bb-pillow bb-ceiling bb-footstep bb-handle bb-door-open bb-door-shut
//   bb-snore bb-caught bb-moo bb-sigh bb-giant
import { W, H } from '../engine/canvas.js';
import { Actor, drawSpeech } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound, music } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { reactionTime } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, TAU, placementsFromScores } from '../engine/util.js';
import {
  NAVY, BED, DOOR, CEIL, FLOOR, configureBedArt, roomBackground, drawDoor, drawBedBack, drawBedFront, drawTuck,
  drawGlowStar, drawStar, drawFeather, drawPillow, drawTeddy, drawCat, drawCow, drawIcon,
} from './bed-bounce/draw.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const GAME_T = 60;
const FINALE_AT = 51;
const G = 2700;
const SPEED = 560;
const WARN = 2.0;
const PEEK = 2.7;
const MAX_LV = 5;
const LEVELS = [0, 0.24, 0.43, 0.62, 0.82, 1.04];   // fraction of the ceiling height
const LVL = 2;                                       // clamp for aiLevel lookups

export const meta = {
  id: 'bed-bounce',
  title: 'No Jumping on the Bed!',
  category: 'molly',
  type: 'Sneaky bouncing',
  goal: 'Bounce on the bed and grab stars - but hide when Nanny Moo comes!',
  controls: [['stick', 'Steer left and right'], ['a', 'Hold: bounce higher! Tap: pillow bonk']],
  tips: ['Light under the door + thump thump = LET GO to hide under the duvet!', 'Touch the glowing ceiling stars for big points.', 'Caught? A few stars fall out - grab them back!'],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t) {
    const img = art('thumb/bed-bounce');
    if (img) g.drawImage(img, x, y, w, h); else drawIcon(g, x, y, w, h, t || 0);
  },
};

export class Game {
  constructor(api) {
    configureBedArt(!!art('prop/bb-bed'));
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.scale = n <= 2 ? 1.0 : n <= 4 ? 0.92 : 0.74;
    if (api.camera) api.camera.maxZoom = Math.min(api.camera.maxZoom ?? 1.4, 1.2);
    this.units = this.players.map((p, i) => {
      const x = lerp(BED.x0 + 70, BED.x1 - 70, n === 1 ? 0.5 : i / (n - 1));
      const a = new Actor(p, { scale: this.scale, x, y: BED.top });
      a.facing = x < W / 2 ? 1 : -1; a.setPose('sleep'); a.snap();
      const U = {
        p, i, a, x, z: 0, vz: 0, vx: 0, state: 'hide', level: 0, dive: false, letGo: 0,
        swingT: 0, swingCd: 0, hitCd: 0, ceilHit: false, score: 0, caughtN: 0, ceilN: 0, bonkN: 0,
        lock: 0, caughtNow: false, freezeT: 0, popLock: 0.3 + i * 0.05,
        ai: { lapse: 0, hideAt: null, late: false, tx: x, swing: 0, popAt: 0 },
      };
      a.attach((g, info) => {
        if (U.state === 'hide') return;
        const sw = U.swingT > 0 ? Math.sin((1 - U.swingT / 0.3) * Math.PI) * 2.2 : 0;
        drawPillow(g, info.hand.x + 6, info.hand.y - 6, 74, -0.5 - sw + Math.sin(this.t * 7 + i) * 0.1, art('prop/bb-pillow'));
      });
      return U;
    });
    this.items = [];
    this.feathers = [];     // decorative drifting feathers
    this.glow = Array.from({ length: 10 }, (_, k) => ({ x: lerp(BED.x0 - 10, BED.x1 + 10, k / 9), y: CEIL + (k % 2 ? 16 : -6), glow: 0, lit: false }));
    this.buddies = [];
    this.phase = 'intro'; this.pt = 0;
    this.round = 0;
    this.mult = 1;
    this.door = 1; this.hall = 1; this.wiggle = 0;
    this.squash = 0;
    this.cow = { mode: 'door', x: DOOR.x + DOOR.w / 2, y: FLOOR, alpha: 1, face: 'smile', arms: 'wave', look: 0, z: 0, vz: 0, speech: null };
    this.banner = null;
    this.fake = false;
    this.finished = false;
    this.steps = 0;
    this.say('Night night!', 3);
  }

  // --- helpers -----------------------------------------------------------------------------
  say(text, dur) { this.cow.speech = { text, t: 0, dur }; }
  showBanner(text, dur, color, size = 140) { this.banner = { text, t: 0, dur, color, size }; }
  ceilZ(U) { return BED.top - CEIL - 24 - U.a.height; }
  vFor(U, lv) { return Math.sqrt(2 * G * Math.max(40, this.ceilZ(U) * LEVELS[lv])); }
  bodyY(U) { return BED.top - U.z - U.a.height * 0.5; }
  get sneaky() { return this.phase === 'warn' || this.phase === 'peek'; }

  addScore(U, k, x, y, color = '#ffd23f', label = null) {
    U.score += k;
    particles.popText(x, y, label || `+${k}`, color, k >= 3 ? 50 : 40);
    if (!U.p.isAI) sfx('collect', { step: U.score % 8, vol: 0.3 });
  }

  // --- phases --------------------------------------------------------------------------------
  startBounce(resume = false) {
    if (!resume) this.round++;
    this.phase = 'bounce'; this.pt = 0;
    const left = FINALE_AT - this.t;
    let dur = this.round === 1 ? 7.8 : rand(5.6, 7.6);
    this.toFinale = false;
    if (left <= dur + WARN + PEEK + 3) {
      // last stretch runs straight into the finale (or squeeze in one more peek)
      if (left <= 9.5) { dur = left; this.toFinale = true; } else dur = left - WARN - PEEK - 3.5;
    }
    this.bounceDur = Math.max(2.5, dur);
    this.fake = this.round >= 3 && !this.toFinale && !resume && chance(0.35);
    if (resume) { music.play(this.api.meta.music || 'bouncy', { fadeIn: 0.3 }); return; }
    if (this.round > 1) {
      music.play(this.api.meta.music || 'bouncy', { fadeIn: 0.3 });
      const msg = this.round === 2 ? 'Teddies too!' : this.round === 3 ? 'Kitty too!' : this.round === 4 ? 'Super stars x2!' : 'BOUNCE!';
      this.showBanner(msg, 1.2, '#ff7ac6', this.round === 4 ? 120 : 140);
    } else this.showBanner('BOUNCE!', 1.1, '#ff7ac6', 160);
    if (this.round === 2) this.addBuddy('teddy', 560), this.addBuddy('teddy', 1240);
    if (this.round === 3) this.addBuddy('cat', 900);
    if (this.round >= 4) this.mult = 2;
    for (const B of this.buddies) { B.hideAt = null; B.caught = false; }
    for (const U of this.units) { U.ai.hideAt = null; U.ai.popAt = rand(0.1, 0.5) + reactionTime(U.p) * 0.6; U.caughtNow = false; if (U.lock > 0 && this.round > 1) U.lock = 0; }
  }

  addBuddy(kind, x) {
    const B = { kind, x, z: 0, vz: 0, hidden: true, level: 1, hideAt: null, caught: false, popT: rand(0.2, 0.8), face: 1 };
    this.buddies.push(B);
    particles.burst(x, BED.top - 30, { type: 'star', count: 10, colors: ['#ffd23f', '#ffffff'], speed: [120, 300] });
  }

  startWarn() {
    this.phase = 'warn'; this.pt = 0; this.steps = 0;
    music.stop(0.4);
    for (const U of this.units) {
      const lvl = clamp(U.p.aiLevel ?? 0, 0, LVL);
      U.ai.hideAt = rand(0.35, [1.5, 1.1, 0.8][lvl]) + reactionTime(U.p) * 0.5;
      U.ai.late = chance([0.22, 0.1, 0.04][lvl]);
      if (!U.p.isAI) U.p.ctrl.rumble(0.4, 200);
    }
    for (const B of this.buddies) B.hideAt = B.kind === 'cat' && chance(0.5) ? 9 : rand(0.4, 1.5);
  }

  startPeek() {
    this.phase = 'peek'; this.pt = 0;
    snd('bb-door-open', 'whoosh', { vol: 0.5 });
    this.cow.face = 'sus'; this.cow.speech = null;
    snd('bb-snore', 'snore', { vol: 0.5 });
    this.peekCaught = 0;
  }

  endPeek() {
    let sneaky = 0;
    for (const U of this.units) {
      if (U.state === 'hide' && !U.caughtNow) {
        sneaky++;
        this.addScore(U, 2, U.x, BED.top - U.a.height * 0.6, '#bfe9ff', 'Sneaky! +2');
        particles.burst(U.x, BED.top - 40, { type: 'sparkle', count: 6, colors: ['#bfe9ff', '#ffffff'], speed: [60, 160] });
      }
      U.lock = 0;
    }
    snd('bb-door-shut', 'bonk', { vol: 0.4 });
    fx.shake(4, 0.15);
    this.startBounce();
  }

  startFinale() {
    this.phase = 'finale'; this.pt = 0; this.steps = 0;
    music.stop(0.4);
    this.finaleBoing = false;
  }

  caught(U) {
    if (U.caughtNow) return;
    U.caughtNow = true; U.caughtN++;
    U.freezeT = 0.8; U.lock = 9;
    const drop = Math.min(3, U.score);
    U.score -= drop;
    const y = this.bodyY(U);
    for (let k = 0; k < drop; k++) {
      this.items.push({ kind: 'star', x: U.x, y, vx: rand(-260, 260), vy: rand(-420, -220), t: rand(0, 3), drop: 0.9, val: 1 });
    }
    if (drop) particles.popText(U.x, y - U.a.height * 0.6, `-${drop}`, '#ff9ad0', 44);
    U.a.playOnce('surprised', 0.8, 'fall'); U.a.flash('#ffffff', 0.2); U.a.emote('exclaim', 1.2);
    U.a.squash(0.4);
    voice(U.p.charId, 'gasp');
    if (!U.p.isAI) U.p.ctrl.rumble(0.6, 250);
    this.peekCaught++;
    if (this.peekCaught === 1) {
      this.cow.face = 'gasp';
      this.say('Hmm?!', 1.4);
      snd('bb-caught', 'boing', { vol: 0.7 });
      snd('bb-moo', null, { vol: 0.6 });
      fx.shake(6, 0.2);
      if (this.api.camera) this.api.camera.punch(U.x, y, 1.1, 0.5);
    }
  }

  // --- frame ---------------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    if (this.cow.speech) this.cow.speech.t += dt;
    for (const U of this.units) { U.a.setPose('sleep'); U.a.update(dt); }
    this.updateDecor(dt);
  }

  update(dt) {
    this.t += dt; this.pt += dt;
    const c = this.cow;
    if (c.speech) { c.speech.t += dt; if (c.speech.t > c.speech.dur) c.speech = null; }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    switch (this.phase) {
      case 'intro':
        // Nanny Moo leaves, the door shuts... BOUNCE!
        c.arms = 'down'; c.alpha = Math.max(0, 1 - this.pt / 0.5); c.x += dt * 160;
        this.door = Math.max(0, 1 - this.pt / 0.6);
        this.hall = Math.max(0, 1 - this.pt / 0.8);
        if (this.pt >= 0.6 && !this.shut) { this.shut = true; snd('bb-door-shut', 'bonk', { vol: 0.5 }); fx.shake(5, 0.15); }
        if (this.pt >= 0.8) { c.mode = 'none'; this.startBounce(); }
        break;
      case 'bounce':
        if (this.pt >= this.bounceDur) { if (this.toFinale) this.startFinale(); else this.startWarn(); }
        break;
      case 'warn': this.updateWarn(dt); break;
      case 'peek': this.updatePeek(dt); break;
      case 'finale': this.updateFinale(dt); break;
      case 'end': if (this.pt > 1.2) this.finishNow(); break;
      default: break;
    }
    this.spawnItems(dt);
    for (const U of this.units) {
      if (U.p.isAI) this.ai(U, dt);
      this.control(U, dt);
    }
    this.updateBuddies(dt);
    this.updateItems(dt);
    this.updateDecor(dt);
    this.squash = damp(this.squash, 0, 8, dt);
  }

  postUpdate(dt) {
    this.t += dt * 0.5;
    if (this.cow.speech) this.cow.speech.t += dt;
    if (this.banner) this.banner.t += dt;
    for (const U of this.units) this.physics(U, dt, true);
    this.updateCowJump(dt);
    this.updateDecor(dt);
  }

  updateWarn(dt) {
    const pt = this.pt;
    this.hall = Math.min(1, pt / 0.3);
    // thump... thump... (getting louder)
    const stepT = [0, 0.5, 1.0, 1.45];
    while (this.steps < stepT.length && pt >= stepT[this.steps]) {
      const k = this.steps++;
      if (this.fake && k >= 2) { snd('bb-footstep', 'stomp', { vol: 0.25 }); continue; }
      snd('bb-footstep', 'stomp', { vol: 0.35 + k * 0.15 });
      fx.shake(3 + k * 2, 0.12);
      particles.popText(DOOR.x + DOOR.w / 2 + rand(-40, 40), DOOR.y + 120 + k * 30, 'THUMP', '#ffe6a0', 40 + k * 6);
    }
    if (this.fake) {
      // she walks past... phew!
      if (pt > 1.5) this.hall = Math.max(0, 1 - (pt - 1.5) / 0.6);
      if (pt >= 2.2) {
        this.showBanner('Phew!', 1.0, '#9ff0c8', 150);
        snd('bb-snore', 'giggle', { vol: 0.5 });
        for (const U of this.units) if (U.state === 'hide' && !U.p.isAI) U.a.emote('sweat', 1);
        this.startBounce(true);
      }
      return;
    }
    if (pt > 1.1) {
      this.wiggle = Math.sin(pt * 40) * 0.7;
      if (Math.floor(pt * 8) !== this.lastRattle) { this.lastRattle = Math.floor(pt * 8); if (this.lastRattle % 2 === 0) snd('bb-handle', 'tick', { vol: 0.4 }); }
    }
    if (pt >= WARN) { this.wiggle = 0; this.startPeek(); }
  }

  updatePeek(dt) {
    const pt = this.pt, c = this.cow;
    c.mode = 'peek';
    this.hall = 1;
    this.door = pt < 0.3 ? pt / 0.3 * 0.42 : pt > PEEK - 0.35 ? Math.max(0, (PEEK - pt) / 0.35 * 0.42) : 0.42;
    c.look = Math.sin(pt * 2.6) * 1;
    const looking = pt > 0.45 && pt < PEEK - 0.4;
    if (looking) {
      for (const U of this.units) if (U.state !== 'hide' && !U.caughtNow) this.caught(U);
      for (const B of this.buddies) if (!B.hidden && !B.caught) {
        B.caught = true;
        this.say('Hmm?!', 1.2);
        this.cow.face = 'gasp';
        snd('bb-caught', 'boing', { vol: 0.6 });
        particles.popText(B.x, BED.top - B.z - 160, '!', '#ffd23f', 70);
      }
    }
    if (pt > PEEK - 0.8 && !this.peekNight) {
      this.peekNight = true;
      if (!this.peekCaught && !this.buddies.some((B) => B.caught)) { c.face = 'smile'; this.say('Zzz...', 0.9); }
    }
    if (pt >= PEEK) { this.peekNight = false; c.mode = 'none'; this.door = 0; this.endPeek(); }
  }

  updateFinale(dt) {
    const pt = this.pt, c = this.cow;
    this.hall = Math.min(1, pt / 0.3);
    const stepT = [0, 0.45, 0.9, 1.3];
    while (this.steps < stepT.length && pt >= stepT[this.steps]) {
      const k = this.steps++;
      snd('bb-footstep', 'stomp', { vol: 0.4 + k * 0.15 }); fx.shake(3 + k * 2, 0.12);
      particles.popText(DOOR.x + DOOR.w / 2 + rand(-40, 40), DOOR.y + 120 + k * 30, 'THUMP', '#ffe6a0', 42 + k * 6);
    }
    if (pt > 1.0 && pt < 1.6) this.wiggle = Math.sin(pt * 40) * 0.7; else this.wiggle = 0;
    if (pt >= 1.6 && c.mode !== 'walk' && c.mode !== 'jump' && c.mode !== 'bed') {
      c.mode = 'walk'; c.x = DOOR.x + DOOR.w / 2; c.y = FLOOR; c.alpha = 1; c.face = 'gasp'; c.arms = 'down';
      snd('bb-door-open', 'whoosh', { vol: 0.6 });
      this.say('!!!', 1.0);
      // the feather storm
      for (let k = 0; k < 70; k++) this.feathers.push(this.newFeather(rand(BED.x0 - 100, BED.x1), rand(CEIL, BED.top - 60), true));
      fx.flash('#ffffff', 0.15);
      if (this.api.camera) this.api.camera.punch(1400, 650, 1.08, 0.6);
    }
    if (pt >= 1.6) this.door = Math.min(1, (pt - 1.6) / 0.25);
    if (c.mode === 'walk') {
      c.x = lerp(DOOR.x + DOOR.w / 2, 1540, clamp((pt - 1.6) / 0.9, 0, 1));
      if (pt > 2.6 && pt < 3.7) { c.face = 'sigh'; if (!this.sighed) { this.sighed = true; this.say('...', 1.0); snd('bb-sigh', 'aww', { vol: 0.5 }); } }
      if (pt > 3.7) { c.face = 'laugh'; c.arms = 'up'; }
      if (pt >= 4.0) { c.mode = 'jump'; c.jx0 = c.x; c.jt = 0; snd('bb-boing-big', 'rubber-bounce', { vol: 0.7 }); }
    }
    this.updateCowJump(dt);
    if (pt >= 10.2 && this.phase === 'finale') { this.phase = 'end'; this.pt = 0; }
  }

  updateCowJump(dt) {
    const c = this.cow;
    if (c.mode === 'jump') {
      c.jt += dt;
      const k = clamp(c.jt / 0.7, 0, 1);
      c.x = lerp(c.jx0, W / 2 - 40, k);
      c.y = lerp(FLOOR, BED.top, k) - Math.sin(k * Math.PI) * 300;
      if (k >= 1) {
        c.mode = 'bed'; c.y = BED.top; c.z = 0; c.vz = 1100;
        this.giantBoing();
      }
    } else if (c.mode === 'bed') {
      c.vz -= G * dt; c.z += c.vz * dt;
      if (c.z <= 0) { c.z = 0; c.vz = 1000; this.squash = 1; snd('bb-boing-big', 'rubber-bounce', { vol: 0.5 }); fx.shake(6, 0.15); }
    }
  }

  giantBoing() {
    this.squash = 1.6;
    snd('bb-giant', 'giant-stomp', { vol: 0.9 });
    sfx('cheer');
    fx.shake(18, 0.4); fx.flash('#fff3c0', 0.25); fx.slowmo(0.4, 0.6);
    if (this.api.camera) this.api.camera.punch(W / 2, 600, 1.12, 0.8);
    particles.confettiRain(W, 120);
    for (let k = 0; k < 40; k++) this.feathers.push(this.newFeather(rand(BED.x0, BED.x1), BED.top - rand(0, 80), true));
    for (const U of this.units) {
      U.state = 'air'; U.lock = 0; U.dive = false; U.level = MAX_LV;
      U.vz = this.vFor(U, MAX_LV) * 1.02; U.ceilHit = false;
      U.a.playOnce('flip', 0.6, 'celebrate');
      this.addScore(U, 3, U.x, BED.top - U.a.height - 40, '#ff7ac6', 'Wheee! +3');
      voice(U.p.charId, 'woo');
    }
    for (const B of this.buddies) { B.hidden = false; B.vz = 1600; }
  }

  finishNow() {
    if (this.finished) return;
    this.finished = true;
    this.api.finish({
      placements: placementsFromScores(this.units.map((U) => U.score)),
      stats: this.units.map((U) => (U.bonkN ? `${U.score} stars · ${U.bonkN} bonks` : `${U.score} stars`)),
      focus: { x: W / 2, y: 600, zoom: 1.05 },
    });
  }

  // --- players -----------------------------------------------------------------------------------
  control(U, dt) {
    const c = U.p.ctrl, a = U.a;
    U.swingT = Math.max(0, U.swingT - dt);
    U.swingCd = Math.max(0, U.swingCd - dt);
    U.hitCd = Math.max(0, U.hitCd - dt);
    U.popLock = Math.max(0, U.popLock - dt);
    const finale = this.phase === 'finale' || this.phase === 'end';
    const canPlay = this.phase !== 'intro' && !(this.phase === 'finale' && !this.finaleBoing && this.cow.mode !== 'bed');
    if (U.freezeT > 0) {
      // caught: a silly mid-air freeze, then a plop under the covers
      U.freezeT -= dt;
      if (U.freezeT <= 0) { U.dive = true; }
      a.update(dt);
      a.x = U.x; a.y = BED.top; a.z = U.z;
      return;
    }
    if (U.state === 'hide') {
      U.vx = 0;
      const wants = c.pressed('a') || c.held('a');
      if (wants && U.lock <= 0 && U.popLock <= 0 && canPlay && !finale) {
        U.state = 'air'; U.level = 1; U.vz = this.vFor(U, 1); U.dive = false; U.letGo = 0; U.ceilHit = false;
        a.playOnce('spring-jump', 0.35, 'jump'); a.squash(0.35);
        snd('bb-boing', 'boing', { vol: 0.45, semi: 0 });
        particles.burst(U.x, BED.top - 10, { type: 'dust', count: 6, colors: ['#ffd1e8', '#ffffff'], speed: [80, 200] });
        this.squash += 0.15;
      } else {
        a.setPose('sleep');
      }
    } else if (U.state === 'air') {
      // steer
      U.vx = damp(U.vx, c.x * SPEED, 7, dt);
      if (Math.abs(c.x) > 0.2) a.facing = c.x > 0 ? 1 : -1;
      // let go -> dive under the covers
      const holding = c.held('a') || finale;
      if (!holding) U.letGo += dt; else U.letGo = 0;
      if (!finale && (U.letGo > 0.12 || c.y > 0.65)) {
        if (!U.dive) { U.dive = true; a.setPose('tuck'); snd('bb-flop', 'whoosh', { vol: 0.25 }); }
      } else if (U.dive && holding && c.y < 0.3) { U.dive = false; }
      // pillow bonk
      if (c.pressed('a') && U.swingCd <= 0 && !finale) this.swing(U);
    }
    this.physics(U, dt, false);
  }

  physics(U, dt, post) {
    const a = U.a;
    if (U.state === 'air' && U.freezeT <= 0) {
      U.vz -= G * dt * (U.dive ? 2.6 : 1);
      if (U.dive && U.vz > 0) U.vz *= Math.pow(0.02, dt);
      U.z += U.vz * dt;
      U.x = clamp(U.x + U.vx * dt, BED.x0, BED.x1);
      // ceiling glow stars
      const cz = this.ceilZ(U);
      if (U.z >= cz && U.vz > 0) {
        U.z = cz; U.vz = -U.vz * 0.25;
        if (!U.ceilHit && !post) this.touchCeiling(U);
        U.ceilHit = true;
      }
      if (U.z <= 0 && U.vz <= 0) this.land(U, post);
      if (!a._once && U.state === 'air') a.setPose(U.dive ? 'tuck' : U.vz > 0 ? 'jump' : 'fall');
    }
    a.x = U.x; a.y = BED.top + this.squash * 18; a.z = U.z;
    a.update(dt);
  }

  land(U, post) {
    const a = U.a, c = U.p.ctrl;
    U.z = 0;
    U.ceilHit = false;
    const finale = this.phase === 'finale' || this.phase === 'end';
    this.squash = Math.min(1.4, this.squash + 0.12 + U.level * 0.05);
    particles.burst(U.x, BED.top - 6, { type: 'dust', count: 5, colors: ['#ffd1e8', '#ffffff'], speed: [60, 180] });
    if (!U.dive && (c.held('a') || finale || post) && U.lock <= 0) {
      U.level = Math.min(MAX_LV, U.level + 1);
      U.vz = this.vFor(U, U.level);
      a.squash(0.3);
      if (U.level >= 4 && !a._once) a.playOnce(U.level >= MAX_LV ? 'flip' : 'spring-jump', 0.45);
      snd(U.level >= MAX_LV ? 'bb-boing-big' : 'bb-boing', U.level >= MAX_LV ? 'rubber-bounce' : 'boing', { vol: 0.3 + U.level * 0.06, semi: U.level * 1.5, force: true });
      if (U.level >= 3) particles.ring(U.x, BED.top - 4, U.p.color, 80 + U.level * 20, 0.3);
    } else {
      // flop under the duvet
      U.state = 'hide'; U.vz = 0; U.level = 0; U.dive = false;
      U.popLock = 0.15;
      a.squash(0.4); a.setPose('sleep');
      snd('bb-flop', 'cush-plop', { vol: 0.45 });
      particles.burst(U.x, BED.top - 20, { type: 'dust', count: 8, colors: ['#ff9ccc', '#ffffff'], speed: [80, 220] });
      if (this.sneaky && !U.caughtNow) particles.popText(U.x, BED.top - U.a.height * 0.5, 'Zzz', '#bfe9ff', 40);
    }
  }

  touchCeiling(U) {
    const y = CEIL;
    let best = null, bd = 1e9;
    for (const s of this.glow) { const d = Math.abs(s.x - U.x); if (d < bd) { bd = d; best = s; } }
    if (best) { best.glow = 1; best.lit = true; }
    this.addScore(U, this.mult, U.x, y + 70, '#eaffb0');
    particles.burst(U.x, y + 20, { type: 'star', count: 12, colors: ['#eaffb0', '#ffffff', '#ffd23f'], speed: [120, 360] });
    snd('bb-ceiling', 'star', { vol: 0.45 });
    U.ceilN++;
    U.a.flash('#fffbd0', 0.15);
    if (this.glow.every((s) => s.lit) && !this.allLit) {
      this.allLit = true;
      this.showBanner('All stars glowing!', 1.3, '#eaffb0', 110);
      fx.flash('#eaffb0', 0.15);
      for (const s of this.glow) particles.burst(s.x, s.y, { type: 'sparkle', count: 6, colors: ['#eaffb0', '#ffffff'], speed: [80, 200] });
      for (const V of this.units) this.addScore(V, 2, V.x, BED.top - V.z - V.a.height - 50, '#eaffb0');
    }
  }

  swing(U) {
    const a = U.a;
    U.swingT = 0.3; U.swingCd = 0.35;
    a.playOnce('throw', 0.3);
    snd('bb-pillow', 'whoosh', { vol: 0.25 });
    const reach = 150 * this.scale + 40;
    for (const V of this.units) {
      if (V === U || V.state !== 'air' || V.hitCd > 0 || V.freezeT > 0) continue;
      const dx = V.x - U.x, dz = (V.z - U.z);
      if (Math.abs(dx) > reach || Math.abs(dz) > 170) continue;
      if (dx !== 0 && Math.sign(dx) !== a.facing && Math.abs(dx) > 40) continue;
      V.hitCd = 0.6;
      V.vx += Math.sign(dx || 1) * 420;
      V.a.playOnce('dizzy', 0.5); V.a.squash(0.35);
      if (!V.p.isAI) V.p.ctrl.rumble(0.4, 140);
      const mx = (U.x + V.x) / 2, my = (this.bodyY(U) + this.bodyY(V)) / 2;
      U.bonkN++;
      this.addScore(U, 2, mx, my - 60, '#ffffff', 'BONK! +2');
      this.addScore(V, 1, V.x, this.bodyY(V) - 40, '#ffd1e8', 'Hee! +1');
      voice(V.p.charId, 'laugh');
      snd('bb-pillow', 'pop', { vol: 0.6 });
      fx.hitstop(0.04); fx.shake(4, 0.1);
      for (let k = 0; k < 14; k++) this.feathers.push(this.newFeather(mx, my, false, true));
      this.items.push({ kind: 'feather', x: mx + rand(-40, 40), y: my, vx: rand(-80, 80), vy: -120, t: rand(3), val: 1 });
      break;
    }
  }

  // --- stars, feathers, buddies ------------------------------------------------------------------------
  spawnItems(dt) {
    if (!(this.phase === 'bounce' || this.phase === 'warn')) return;
    const want = 3 + Math.ceil(this.n * 0.7) + Math.min(3, this.round);
    const live = this.items.filter((it) => it.kind !== 'feather').length;
    if (live < want && chance(dt * 4)) {
      const gold = chance(0.22);
      const top = CEIL + 70, bot = BED.top - 170;
      const y = gold ? rand(top, top + 130) : rand(top + 60, bot);
      this.items.push({ kind: gold ? 'gold' : 'star', x: rand(BED.x0, BED.x1), y, vx: 0, vy: 0, t: rand(3), born: 0, val: gold ? 3 : 1 });
    }
  }

  updateItems(dt) {
    for (const it of this.items) {
      it.t += dt;
      it.born = Math.min(1, (it.born ?? 1) + dt * 3);
      if (it.drop > 0) {
        it.drop -= dt; it.vy += 700 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
        it.vx *= Math.pow(0.3, dt);
        if (it.drop <= 0 || it.y > BED.top - 120) { it.drop = 0; it.vy = 0; }
        it.x = clamp(it.x, BED.x0 - 20, BED.x1 + 20); it.y = clamp(it.y, CEIL + 60, BED.top - 110);
      } else if (it.kind === 'feather') {
        it.vy = damp(it.vy, 60, 2, dt); it.y += it.vy * dt; it.x += Math.sin(it.t * 3) * 60 * dt;
        if (it.y > BED.top - 30) it.dead = true;
      }
      if (it.dead) continue;
      for (const U of this.units) {
        if (U.state !== 'air' || U.freezeT > 0) continue;
        const r = 56 + U.a.height * 0.32;
        if (Math.abs(U.x - it.x) < r * 0.8 && Math.abs(this.bodyY(U) - it.y) < r) {
          it.dead = true;
          const k = it.val * (it.kind === 'feather' ? 1 : this.mult);
          this.addScore(U, k, it.x, it.y - 30, it.kind === 'gold' ? '#ffb020' : it.kind === 'feather' ? '#ffffff' : '#ffd23f');
          particles.burst(it.x, it.y, { type: it.kind === 'feather' ? 'sparkle' : 'star', count: it.kind === 'gold' ? 14 : 7, colors: ['#ffd23f', '#ffffff', U.p.color], speed: [100, 300] });
          if (it.kind === 'gold') { snd('bb-ceiling', 'star', { vol: 0.4 }); U.a.playOnce('cheer', 0.4); }
          break;
        }
      }
    }
    this.items = this.items.filter((it) => !it.dead);
  }

  newFeather(x, y, storm = false, burst = false) {
    const a = rand(TAU), sp = burst ? rand(150, 420) : storm ? rand(40, 160) : 0;
    return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (burst ? 120 : 0), rot: rand(TAU), vr: rand(-3, 3), s: rand(0.6, 1.1), t: rand(3) };
  }

  updateDecor(dt) {
    for (const s of this.glow) s.glow = damp(s.glow, s.lit ? 0.35 : 0, 2.2, dt);
    const ambient = this.phase === 'intro' ? 0 : Math.min(26, (this.round - 1) * 7);
    const amb = this.feathers.filter((f) => f.amb).length;
    if (amb < ambient && chance(dt * 4)) { const f = this.newFeather(rand(BED.x0 - 200, BED.x1 + 100), CEIL - 20); f.amb = true; this.feathers.push(f); }
    for (const f of this.feathers) {
      f.t += dt;
      f.vx = damp(f.vx, Math.sin(f.t * 1.7) * 50, 1.6, dt);
      f.vy = damp(f.vy, 45, 1.4, dt);
      f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt + Math.sin(f.t * 2) * dt;
      if (f.y > FLOOR + 60) f.dead = true;
    }
    this.feathers = this.feathers.filter((f) => !f.dead);
    if (this.feathers.length > 260) this.feathers.splice(0, this.feathers.length - 260);
  }

  updateBuddies(dt) {
    for (const B of this.buddies) {
      if (B.hidden) {
        B.popT -= dt;
        if (this.phase === 'bounce' && B.popT <= 0) { B.hidden = false; B.vz = 900; B.level = 1; }
        continue;
      }
      if (this.sneaky && B.hideAt != null && this.pt >= B.hideAt && !B.caught && this.phase === 'warn') B.dive = true;
      if (this.phase === 'peek' && B.caught && this.pt > 1.4) B.dive = true;
      B.vz -= G * dt * (B.dive ? 2.4 : 1); B.z += B.vz * dt;
      B.x += Math.sin(this.t * 0.8 + B.x) * 40 * dt;
      if (B.z <= 0) {
        B.z = 0;
        if (B.dive) { B.hidden = true; B.dive = false; B.popT = rand(0.4, 1.4); B.level = 1; snd('bb-flop', 'cush-plop', { vol: 0.2 }); }
        else { B.level = Math.min(4, B.level + 1); B.vz = Math.sqrt(2 * G * 380 * LEVELS[B.level]); this.squash += 0.08; snd('bb-boing', 'boing', { vol: 0.15, semi: 4 + B.level }); }
      }
    }
  }

  // --- CPU ---------------------------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, A = U.ai, lvl = clamp(p.aiLevel ?? 0, 0, LVL);
    const c = p.ctrl;
    if (this.phase === 'finale' || this.phase === 'end' || this.phase === 'intro') { c.move(0, 0); c.hold('a', this.phase !== 'intro'); return; }
    if (this.phase === 'peek' || (this.phase === 'warn' && !this.fake && A.hideAt != null && this.pt >= A.hideAt && !(A.late && this.pt < 2.15))) {
      c.move(0, 0); c.hold('a', false); return;
    }
    if (this.phase === 'warn' && this.fake && A.hideAt != null && this.pt >= A.hideAt) { c.move(0, 0); c.hold('a', false); return; }
    // bouncing: hold A (with daydreams), chase the nearest star, bonk friends
    if (U.state === 'hide' && this.pt < A.popAt) { c.hold('a', false); return; }
    if (A.lapse > 0) { A.lapse -= dt; c.hold('a', false); c.move(0, 0); return; }
    if (chance(dt * [0.28, 0.14, 0.06][lvl])) { A.lapse = rand(0.4, 1.0); return; }
    c.hold('a', true);
    let best = null, bd = 1e9;
    for (const it of this.items) { const d = Math.abs(it.x - U.x) + Math.abs(it.y - this.bodyY(U)) * 0.4; if (d < bd) { bd = d; best = it; } }
    A.tx = best ? best.x + Math.sin(this.t * 1.3 + U.i) * [140, 80, 30][lvl] : W / 2;
    const dx = A.tx - U.x;
    c.move(Math.abs(dx) < 30 ? 0 : clamp(dx / 200, -1, 1) * [0.6, 0.8, 0.95][lvl], 0);
    A.swing -= dt;
    if (U.state === 'air' && A.swing <= 0) {
      const near = this.units.some((V) => V !== U && V.state === 'air' && Math.abs(V.x - U.x) < 160 && Math.abs(V.z - U.z) < 150);
      if (near && chance([0.25, 0.4, 0.55][lvl])) { c.press('a'); }
      A.swing = rand(0.4, 0.9);
    }
  }

  // --- drawing ----------------------------------------------------------------------------------------
  draw(g) {
    const t = this.t || this.t0;
    const bg = art('bg/bed-bounce');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(roomBackground(), 0, 0);
    for (const s of this.glow) {
      const img = art('prop/bb-glowstar');
      if (img) {
        g.save(); g.globalAlpha = 0.6 + s.glow * 0.4; g.drawImage(img, s.x - 30, s.y - 30, 60, 60); g.restore();
      } else drawGlowStar(g, s.x, s.y, 26, s.glow, t);
    }
    // the door (Nanny Moo stands in it at bedtime, peeks round it later)
    const c = this.cow;
    drawDoor(g, this.door, this.hall, this.wiggle, t, art('prop/bb-door'), (gg) => {
      if (c.mode === 'door' && c.alpha > 0.01) { gg.save(); gg.globalAlpha = c.alpha; this.drawCowStanding(gg, c.x, FLOOR, t, 'wave'); gg.restore(); }
    });
    if (c.mode === 'peek') this.drawPeek(g, t);
    // warning "!"
    if (this.phase === 'warn' && !(this.fake && this.pt > 1.5)) {
      const k = clamp(this.pt / 0.2, 0, 1), bob = Math.sin(t * 14) * 8;
      g.save(); g.globalAlpha = k;
      ui.text(g, '!', DOOR.x + DOOR.w / 2, DOOR.y - 70 + bob, { size: 150 + Math.sin(t * 12) * 10, color: '#ffd23f', strokeWidth: 16 });
      g.restore();
    }
    // the bed
    const bed = art('prop/bb-bed');
    if (bed) {
      g.save(); g.translate(0, BED.y + BED.h); g.scale(1, 1 - this.squash * 0.03); g.drawImage(bed, BED.x, -BED.h, BED.w, BED.h); g.restore();
    } else { drawBedBack(g, this.squash); drawBedFront(g, this.squash, t); }
    // sleepers
    for (const B of this.buddies) if (B.hidden) this.drawBuddyHidden(g, B, t);
    for (const U of this.units) if (U.state === 'hide' && U.freezeT <= 0) this.drawSleeper(g, U, t);
    // bouncers
    for (const B of this.buddies) if (!B.hidden) this.drawBuddy(g, B, t);
    const air = this.units.filter((U) => U.state !== 'hide' || U.freezeT > 0).sort((a, b) => a.z - b.z);
    for (const U of air) this.drawBouncer(g, U, t);
    // collectibles
    const starImg = art('prop/bb-star'), fImg = art('prop/bb-feather');
    for (const it of this.items) {
      const bob = Math.sin(it.t * 3) * 8, s = it.born ?? 1;
      if (it.kind === 'feather') { drawFeather(g, it.x, it.y, 1.3, Math.sin(it.t * 3) * 0.6, fImg); continue; }
      const r = (it.kind === 'gold' ? 40 : 32) * s;
      if (starImg) {
        g.save(); g.translate(it.x, it.y + bob); g.rotate(Math.sin(it.t * 3) * 0.2);
        if (it.kind === 'gold') { g.shadowColor = '#fff3a0'; g.shadowBlur = 30; }
        g.drawImage(starImg, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2); g.restore();
      } else drawStar(g, it.x, it.y + bob, r, it.kind === 'gold', it.t);
    }
    // Nanny Moo in the room (finale)
    if (c.mode === 'walk') this.drawCowStanding(g, c.x, FLOOR, t, c.arms);
    if (c.mode === 'jump' || c.mode === 'bed') this.drawCowJump(g, c.x, (c.mode === 'bed' ? BED.top - c.z : c.y), t);
    // feathers on top
    for (const f of this.feathers) drawFeather(g, f.x, f.y, f.s, f.rot, fImg);
    // Nanny's speech bubble
    if (c.speech) {
      const sx = c.mode === 'peek' ? DOOR.x - 60 : c.mode === 'walk' ? c.x : c.mode === 'bed' || c.mode === 'jump' ? c.x : c.x;
      const sy = c.mode === 'peek' ? 430 : c.mode === 'bed' ? BED.top - c.z - 440 : FLOOR - 430;
      drawSpeech(g, c.speech.text, sx, sy, 1.3, c.speech.t, c.speech.dur);
    }
    // night tint while sneaking
    const dark = this.phase === 'peek' ? 0.18 : this.phase === 'warn' && !this.fake ? clamp(this.pt / 1.5, 0, 1) * 0.12 : 0;
    if (dark > 0) { g.save(); g.globalAlpha = dark; g.fillStyle = '#0b0a2a'; g.fillRect(0, 0, DOOR.x - 20, H); g.restore(); }
  }

  drawCowStanding(g, x, y, t, arms) {
    const c = this.cow;
    const img = art('prop/nanny-moo');
    const bob = Math.abs(Math.sin(t * 6)) * 6;
    if (img) {
      g.save(); g.translate(x, y - bob * 0.3);
      g.drawImage(img, -160, -400, 320, 400); g.restore();
    } else drawCow(g, x, y - bob * 0.3, 400, { face: c.face, arms, t, look: -0.6 });
  }

  drawCowJump(g, x, y, t) {
    const img = art('prop/nanny-moo-jump');
    const sq = this.cow.mode === 'bed' && this.cow.z < 30 ? 0.15 : 0;
    if (img) {
      g.save(); g.translate(x, y); g.scale(1 + sq, 1 - sq); g.drawImage(img, -168, -420, 336, 420); g.restore();
    } else {
      g.save(); g.translate(x, y); g.scale(1 + sq, 1 - sq);
      drawCow(g, 0, 0, 420, { face: 'laugh', arms: 'up', t, capFly: 0.4 + Math.sin(t * 8) * 0.2, lamp: false });
      g.restore();
    }
  }

  drawPeek(g, t) {
    const c = this.cow, open = this.door / 0.42;
    const edge = DOOR.x + DOOR.w * this.door * 0.82 + 6;
    const lean = clamp(open, 0, 1);
    const img = art('prop/nanny-moo-peek');
    g.save();
    g.beginPath();
    g.rect(DOOR.x, DOOR.y, edge - DOOR.x, DOOR.h);
    // the art leans out whole (lantern too), so let it show down to its feet
    g.rect(DOOR.x - 220 * lean, DOOR.y - 60, 220 * lean + 10, img ? 480 : 340);
    g.clip();
    const x = DOOR.x + 70 - 70 * lean;
    if (img) {
      // her robe (the art's right edge) tucks in behind the door slab
      g.drawImage(img, edge - 304, 800 - 360, 300, 360);
    } else {
      g.translate(x + 20, FLOOR + 40);
      g.rotate(-0.22 * lean);
      drawCow(g, 0, 0, 430, { face: c.face, arms: 'down', t, look: -0.5 + c.look * 0.5, tilt: -0.1 });
    }
    g.restore();
  }

  drawSleeper(g, U, t) {
    const a = U.a, x = U.x;
    // only the head peeks out over the duvet
    g.save();
    g.beginPath(); g.rect(x - 200, 0, 400, BED.top - 4 + this.squash * 18); g.clip();
    const sink = a.height * 0.46;
    a.y = BED.top + sink + this.squash * 18; a.z = 0;
    a.draw(g, { shadow: false, emotes: false });
    a.y = BED.top + this.squash * 18;
    g.restore();
    const w = Math.max(70, a.width * 0.75);
    drawTuck(g, x, w);
    g.fillStyle = U.p.color; g.beginPath(); g.ellipse(x, BED.top - 6, w * 0.4, 6, 0, 0, TAU); g.fill();
    // Zzz
    const zt = (t * 0.8 + U.i * 0.37) % 1;
    g.save(); g.globalAlpha = Math.sin(zt * Math.PI) * (this.sneaky ? 1 : 0.6);
    ui.text(g, 'z', x + 40 + zt * 40, BED.top - a.height * 0.5 - zt * 70, { size: 30 + zt * 20, color: '#bfe9ff', strokeWidth: 6 });
    g.restore();
    if (this.showTags()) this.drawTag(g, U, BED.top - a.height * 0.45 - 30);
  }

  drawBouncer(g, U, t) {
    const a = U.a;
    // little shadow on the duvet shrinks as they go higher
    const k = clamp(1 - U.z / 600, 0.25, 1);
    g.save(); g.globalAlpha = 0.25 * k; g.fillStyle = NAVY;
    g.beginPath(); g.ellipse(U.x, BED.top - 4, 60 * k * this.scale + 10, 10 * k, 0, 0, TAU); g.fill(); g.restore();
    g.save(); g.globalAlpha = 0.55; g.fillStyle = U.p.color;
    g.beginPath(); g.ellipse(U.x, BED.top - 4, 46 * k * this.scale + 8, 7 * k, 0, 0, TAU); g.fill(); g.restore();
    a.draw(g, { shadow: false });
    if (this.showTags()) this.drawTag(g, U, BED.top - U.z - a.height - 26);
  }

  showTags() { return this.t < 6 || this.phase === 'intro'; }
  drawTag(g, U, y) {
    const sc = this.n > 4 ? 0.8 : 0.95;
    g.save(); g.translate(U.x, y); g.scale(sc, sc); ui.playerTag(g, U.p, 0, 0); g.restore();
  }

  drawBuddy(g, B, t) {
    const img = art(B.kind === 'cat' ? 'prop/bb-cat' : 'prop/bb-teddy');
    const y = BED.top - B.z;
    if (img) { const h = B.kind === 'cat' ? 110 : 120; g.drawImage(img, B.x - h / 2, y - h, h, h); }
    else if (B.kind === 'cat') drawCat(g, B.x, y, 1.0, t, 'bounce');
    else drawTeddy(g, B.x, y, 0.85, t, 'bounce');
  }

  drawBuddyHidden(g, B, t) {
    g.save(); g.beginPath(); g.rect(B.x - 120, 0, 240, BED.top - 4); g.clip();
    if (B.kind === 'cat') drawCat(g, B.x, BED.top + 60, 0.9, t, 'sleep'); else drawTeddy(g, B.x, BED.top + 80, 0.8, t, 'sleep');
    g.restore();
    drawTuck(g, B.x, 70);
  }

  drawHUD(g) {
    const t = this.t || this.t0;
    ui.scoreboard(g, this.players, this.units.map((U) => U.score), {
      y: 16, avoidCenter: true, format: (v) => `${v} ★`,
      expr: this.units.map((U) => (U.caughtNow && this.phase === 'peek' ? 'surprised' : U.state === 'air' ? 'happy' : 'neutral')),
    });
    ui.timer(g, Math.max(0, GAME_T - this.t));
    // state badge: bounce! / shhh!
    const sneaky = (this.phase === 'warn' && !(this.fake && this.pt > 1.6)) || this.phase === 'peek' || (this.phase === 'finale' && this.pt < 1.6);
    if (this.phase !== 'intro' && this.phase !== 'end') {
      const x = W / 2, y = 186;
      const shake = this.phase === 'warn' ? Math.sin(t * 50) * 5 : 0;
      g.save(); g.translate(x + shake, y);
      const sc = sneaky ? 1.08 + 0.06 * Math.sin(t * 10) : 1;
      g.scale(sc, sc);
      ui.panel(g, -170, -50, 340, 100, { r: 50, fill: sneaky ? '#bfe9ff' : '#ffc2e2' });
      if (sneaky) {
        ui.text(g, 'Zzz', -100, 2, { size: 40, color: '#5a7bd6', stroke: false, weight: 800 });
        ui.text(g, 'HIDE!', 50, 3, { size: 50, color: NAVY, stroke: false, weight: 800 });
      } else {
        ui.glyph(g, 'a', -110, 0, 54, { pulse: true });
        ui.text(g, this.phase === 'finale' ? 'PARTY!' : 'BOUNCE!', 40, 3, { size: 46, color: NAVY, stroke: false, weight: 800 });
      }
      g.restore();
    }
    if (this.banner) {
      const b = this.banner, fade = clamp((b.dur - b.t) / 0.25, 0, 1);
      g.save(); g.globalAlpha = fade;
      ui.banner(g, b.text, b.t, { size: b.size, y: 400, color: b.color });
      g.restore();
    }
    // first-time hints (pictures carry it; words are a bonus for grown-ups)
    let hint = null, glyph = null;
    if (this.round === 1 && this.phase === 'bounce' && this.t < 8) { hint = 'Hold A to bounce higher!'; glyph = 'a'; }
    else if (this.round <= 2 && this.phase === 'warn' && !this.fake) hint = 'Someone\'s coming! Let go to hide!';
    if (hint) {
      const w = ui.measure(g, hint, 40, 800) + (glyph ? 150 : 80);
      ui.panel(g, W / 2 - w / 2, H - 98, w, 72, { r: 36, fill: glyph ? '#fff8ec' : '#e6f7ff' });
      ui.text(g, hint, W / 2 - (glyph ? 30 : 0), H - 61, { size: 40, color: NAVY, stroke: false, weight: 800 });
      if (glyph) ui.glyph(g, glyph, W / 2 + w / 2 - 52, H - 62, 50, { pulse: true });
    }
  }
}
