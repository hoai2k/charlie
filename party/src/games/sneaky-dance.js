// Sneaky Dance (Molly Party) - Professor Hoot is having a nap in his armchair
// in the library ("Shhh!"). While he snores, everybody dances as wildly as
// they can around the rug: the stick moves and wiggles (every new direction
// is a dance move), A is a big jump-spin, and dancing earns stars - wilder
// dancing earns more, and everyone's dancing fills a shared party meter.
// When Hoot stirs (the music in everybody's head stops, the snoring stops,
// ONE eye slowly pops open and a big "?" grows - almost two seconds of
// warning) everybody FREEZES: let go of the stick and A and you turn into a
// pretend book-reader, a lamp or a statue, and earn sneaky stars. Anyone
// still wiggling when he looks gets a pompous telling-off (a wagging "Tsk
// tsk!", a huffy "Harrumph!" or a scandalised "Well I never!", never the same
// twice running) and two stars bounce out of their pocket - they can grab them
// back (no one is ever out). When he dozes off again, everybody snickers.
// It escalates: books fly off the shelves, the lamp joins the dance, a disco
// ball comes down, and Hoot gets more suspicious (fake-out yawns!). Finale:
// Hoot wakes up for real (spectacles flying - "Well I never!")... then puts on
// sunglasses and joins the dance party.
//
// Art hooks (procedural fallbacks ship today): bg/sneaky-dance, thumb/sneaky-dance,
//   prop/sd-armchair, prop/sd-hoot-sleep, prop/sd-hoot-peek, prop/sd-hoot-stare,
//   prop/sd-hoot-yawn, prop/sd-hoot-party, prop/sd-lamp, prop/sd-book-1..3,
//   prop/sd-disguise-book, prop/sd-lampshade, prop/sd-sunglasses; reused prop/df-disco-ball.
//   Requested (fallback = sd-hoot-stare + code-drawn extras): prop/sd-hoot-scold
//   (+ wagging finger), prop/sd-hoot-shock (+ shock lines, feather puff).
// Sound hooks (fallbacks today): sd-snore, sd-stir, sd-peek, sd-hmm, sd-drop,
//   sd-grab, sd-phew, sd-freeze, sd-hush, sd-yawn, sd-books, sd-lamp, sd-disco, sd-wake, sd-shades, sd-spin.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound, music } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime, steer } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, TAU, dist, placementsFromScores } from '../engine/util.js';
import { easySteer } from '../engine/easy.js';
import { Tune } from './sneaky-dance/tune.js';
import { nextKind, sayFor, drawShock, drawSteam, drawWag, drawShout } from '../engine/fluster.js';
import {
  NAVY, SEAT, LAMP, BALL, BOOK_COLS, libraryBackground, drawChairBack, drawChairFront, drawHoot, drawLamp, drawBook,
  drawDiscoBall, drawBeams, drawDisguise, drawPlinth, drawBubble, drawStarPickup, drawIcon,
} from './sneaky-dance/draw.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const GAME_T = 60;
const WAKE_AT = 50;           // Hoot wakes for real (finale party) at about this time
const GRACE = 0.3;            // after his eyes open, a moment to settle
const DROP = 2;               // stars that bounce out when caught
const BOUNDS = { x0: 150, x1: W - 150, y0: 680, y1: 1030 };
const SPEED = 430;
const CPU_SPEED = [0.6, 0.72, 0.84];
const CPU_LATE = [0.3, 0.14, 0.05];   // chance a CPU keeps dancing too long
const MOVES = { up: 'dance-up', down: 'dance-down', left: 'dance-side', right: 'dance-side' };
const DISGUISES = ['book', 'lamp', 'statue'];
const BUBBLE = { x: 1150, y: 200 };

export const meta = {
  id: 'sneaky-dance',
  title: 'Sneaky Dance',
  category: 'molly',
  type: 'Sneaky freeze',
  goal: 'Dance like crazy while Professor Hoot naps - FREEZE when he peeks!',
  controls: [['stick', 'Wiggle to dance'], ['a', 'Big jump-spin']],
  tips: ['Zzz = dance! When the snoring stops and his eye opens: let go and freeze!', 'Wild wiggles and spins earn more stars.', 'Caught? Grab your bouncing stars back!'],
  goalEasy: 'Hold A to dance while Professor Hoot naps - let go to FREEZE when he peeks!',
  controlsEasy: [['a', 'Hold to dance, let go to freeze'], ['stick', 'Dance around with either stick if you like']],
  tipsEasy: ['Zzz = hold A and dance - or wiggle a stick!', 'His eye opens? Let go of everything - freeze!', 'Tap A for a big jump-spin!'],
  music: 'sneaky',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon,
};

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.easy = !!api.easy;     // Molly Easy: hold A = dance (moves by itself), let go = freeze
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.t0 = 0;
    this.scale = n <= 4 ? 0.95 : 0.8;
    if (api.camera) api.camera.maxZoom = Math.min(api.camera.maxZoom ?? 1.4, 1.25);
    const rows = n <= 4 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const spots = [];
    rows.forEach((cnt, r) => {
      const y = rows.length === 1 ? 880 : r === 0 ? 800 : 960;
      const span = cnt <= 1 ? 0 : Math.min(1300, cnt * 330);
      for (let k = 0; k < cnt; k++) spots.push({ x: W / 2 + (cnt <= 1 ? 0 : -span / 2 + (span * k) / (cnt - 1)) + (rows.length === 2 && r === 0 ? -100 : 0), y });
    });
    this.units = this.players.map((p, i) => {
      const s = spots[i];
      const a = new Actor(p, { scale: this.scale, x: s.x, y: s.y });
      const sizeK = clamp(120 / a.leader.h, 1, 2.4);
      a.scale = this.scale * sizeK;
      a.facing = s.x < W / 2 ? 1 : -1; a.snap();
      const U = {
        p, i, a, x: s.x, y: s.y, homeX: s.x, homeY: s.y, vx: 0, vy: 0, z: 0, vz: 0, sizeK,
        stars: 0, acc: 0, dir: null, spinCd: 0, spinT: 0, streak: 0,
        state: 'dance', caughtT: 0, caughtThis: false, disguise: DISGUISES[i % 3], dk: 0, sneaky: 0, caughtN: 0,
        ai: { dir: [0, 0], dirT: 0, dawdle: 0, stopAt: null, wiggleAt: null, wiggleT: 0, star: null },
      };
      a.attach((g, info) => { if (U.disguise !== 'statue') drawDisguise(g, info, U.disguise, U.dk, this.t); });
      return U;
    });
    this.tune = new Tune();
    this.tune.vol = 0.5;
    this.phase = 'ready'; this.pt = 0;
    this.round = 0;
    this.level = 0; this.meter = 0;
    this.lastFake = false;
    this.banner = null;
    this.finished = false;
    // Hoot
    this.hoot = { eyeL: 0, eyeR: 0, look: 0, lookTo: 0, mouth: 'snore', hatTip: 1, stand: 0, shades: 0, dance: 0, squint: 0, wingUp: 0, shake: 0, stareAt: null, stareT: 0, bubble: 'zzz', bubbleK: 1, react: null, lastReact: 'huff', reactT: 0, reactDur: 1, say: null };
    this.snoreT = 0.6;
    this.pickups = [];
    this.books = [];
    this.lampDance = 0; this.lampFrozen = 0;
    this.ball = 0; this.spin = 0; this.lightK = 0;
    this.dim = 0;
  }

  // --- helpers -------------------------------------------------------------------------
  active(U) {
    const c = U.p.ctrl;
    // Easy: A (or X) dances, and the stick moves and dances too (as in Medium): freezing is
    // just letting go of everything, so no particular stick move is ever needed
    if (this.easy && !U.p.isAI) return c.held('a') || c.pressed('a') || c.held('x') || c.pressed('x') || Math.hypot(c.x, c.y) > 0.3;
    if (Math.hypot(c.x, c.y) > 0.3) return true;
    for (const b of ['a', 'b', 'x', 'y']) if (c.held(b) || c.pressed(b)) return true;
    return false;
  }
  showBanner(text, dur, color, size = 130) { this.banner = { text, t: 0, dur, color, size }; }
  get danceOn() { return this.phase === 'snore' || this.phase === 'party'; }
  get watching() { return this.phase === 'look'; }

  // --- phases ----------------------------------------------------------------------------
  startSnore() {
    this.round++;
    this.phase = 'snore'; this.pt = 0;
    const lv = this.level;
    this.snoreDur = this.round === 1 ? 6.5 : rand(3.4, 5.8) - lv * 0.3;
    const H0 = this.hoot;
    H0.eyeL = 0; H0.eyeR = 0; H0.mouth = 'snore'; H0.squint = 0; H0.wingUp = 0; H0.stareAt = null; H0.bubble = 'zzz';
    this.tune.start(Math.min(140, 120 + this.round * 3 + lv * 4));
    for (const U of this.units) {
      if (U.state !== 'dance') { U.state = 'dance'; U.a.tint(null); }
      U.caughtThis = false; U.ai.stopAt = null; U.ai.wiggleAt = null;
      if (this.round > 1) U.a.playOnce('cheer', 0.4);
    }
    if (this.round > 1) this.showBanner('Dance!', 0.8, '#ff7ac6', 110);
    this.snoreT = 0.5;
  }

  startStir() {
    this.phase = 'stir'; this.pt = 0;
    this.stirDur = [1.9, 1.8, 1.7, 1.6][this.level];
    this.fake = this.level >= 1 && !this.lastFake && chance(0.3);
    this.lastFake = this.fake;
    this.tune.tell(0.5);
    this.stopAt = 0.45;
    snd('sd-stir', 'snore', { vol: 0.5, rate: 0.7 });
    const H0 = this.hoot;
    H0.mouth = 'hmm'; H0.shake = 0.6; H0.bubble = 'q';
    for (const U of this.units) {
      const lvl = clamp(U.p.aiLevel ?? 0, 0, 2);
      U.ai.stopAt = chance(CPU_LATE[lvl]) ? this.stirDur + rand(0.3, 0.9) : rand(0.25, 0.5) + reactionTime(U.p) * 0.9;
      U.ai.wiggleAt = null;
      if (!U.p.isAI) U.p.ctrl.rumble(0.3, 160);
    }
  }

  startLook() {
    this.phase = 'look'; this.pt = 0;
    this.lookDur = rand(2.1, 2.7) + this.level * 0.15;
    const H0 = this.hoot;
    H0.eyeL = 1; H0.eyeR = 1; H0.mouth = 'hmm'; H0.hatTip = 0.25; H0.lookTo = rand(-1, 1); H0.bubble = 'q';
    snd('sd-peek', 'npc/hoot/hoo', { vol: 0.5 });
    fx.shake(4, 0.2);
    if (this.api.camera) this.api.camera.punch(W / 2, 700, 1.05, 0.7);
    for (const U of this.units) {
      const lvl = clamp(U.p.aiLevel ?? 0, 0, 2);
      U.ai.wiggleAt = chance([0.18, 0.08, 0.03][lvl]) ? rand(GRACE + 0.3, this.lookDur - 0.4) : null;
    }
  }

  startYawn() {
    this.phase = 'yawn'; this.pt = 0;
    const H0 = this.hoot;
    H0.mouth = 'yawn'; H0.eyeL = 0; H0.eyeR = 0; H0.wingUp = 1; H0.bubble = 'zzz';
    snd('sd-yawn', 'npc/troll/yawn', { vol: 0.5 });
    particles.popText(BUBBLE.x, BUBBLE.y + 100, 'Yaaawn...', '#c9b3ff', 46);
  }

  endLook() {
    // everyone who froze is a sneaky star
    let any = false;
    for (const U of this.units) {
      if (U.state === 'still' && !U.caughtThis) {
        any = true; U.sneaky++;
        this.addStars(U, 2, '#8fdcff', 'Sneaky! +2');
        particles.burst(U.x, U.y - U.a.height * 0.6, { type: 'sparkle', count: 10, colors: ['#ffffff', '#bfe9ff', '#ffd23f'], speed: [120, 300] });
        U.a.playOnce('cheer', 0.45);
      }
    }
    if (any) snd('sd-phew', 'star', { vol: 0.5 });
    // he dozes off again after a telling-off: everybody snickers behind his back
    if (this.units.some((U) => U.caughtThis)) {
      let v = 0;
      for (const U of this.units) {
        this.later(0.35 + rand(0.25), () => { if (this.phase === 'snore') { U.a.playOnce(U.caughtThis ? 'laugh' : 'giggle', 0.8); if (v++ < 2) voice(U.p.charId, 'laugh'); } });
      }
    }
    this.hoot.eyeL = 0; this.hoot.eyeR = 0;
    if (this.t >= WAKE_AT - 1) this.startWake();
    else this.startSnore();
  }

  startWake() {
    this.phase = 'wake'; this.pt = 0;
    this.tune.stop('sd-hush');
    const H0 = this.hoot;
    H0.eyeL = 1; H0.eyeR = 1; H0.mouth = 'hmm'; H0.hatTip = 0; H0.bubble = 'hmm'; H0.stareAt = null; H0.squint = 0;
    snd('sd-wake', 'npc/hoot/hoo', { vol: 0.7 });
    fx.shake(8, 0.3);
    this.showBanner('He\'s awake!', 1.2, '#ffd23f', 120);
    this.hootReact('shock', 1.05, 'Well I never!');
    particles.burst(SEAT.x, SEAT.y - 230, { type: 'petal', count: 14, colors: ['#b7773d', '#f6dfb8', '#d9a066'], speed: [160, 420] });
    // they've been rumbled - and it's hilarious
    this.units.forEach((U, k) => { U.state = 'dance'; U.dk = 0; U.a.tint(null); U.a.playOnce('surprised', 0.4); this.later(0.45 + k * 0.12, () => { U.a.playOnce('laugh', 0.9); if (k < 3) voice(U.p.charId, 'laugh'); }); });
  }

  startParty() {
    this.phase = 'party'; this.pt = 0;
    this.partyEnd = Math.max(GAME_T, this.t + 7);
    const H0 = this.hoot;
    H0.mouth = 'grin'; H0.bubble = 'party';
    this.level = 3; this.ensureBooks();
    this.tune.start(150);
    snd('sd-disco', 'fanfare', { vol: 0.7 }); sfx('cheer');
    fx.flash('#ffffff', 0.25); fx.shake(10, 0.35);
    particles.confettiRain(W, 100);
    if (this.api.camera) this.api.camera.punch(SEAT.x, SEAT.y - 160, 1.2, 0.8);
    this.showBanner('Dance party!', 1.8, '#ff7ac6', 150);
    for (const U of this.units) { U.a.playOnce('celebrate', 0.8); voice(U.p.charId, 'woo'); }
  }

  endGame() {
    this.phase = 'end'; this.pt = 0;
    this.tune.stop(null);
    for (const U of this.units) { U.state = 'dance'; U.dk = 0; U.a.tint(null); U.a.setPose('celebrate'); }
    particles.confettiRain(W, 120);
    sfx('win'); sfx('cheer');
    fx.slowmo(0.5, 0.5);
    this.showBanner('Best party ever!', 1.6, '#ffd23f');
  }

  finishNow() {
    if (this.finished) return;
    this.finished = true;
    const scores = this.units.map((U) => U.stars);
    this.api.finish({
      placements: placementsFromScores(scores),
      stats: this.units.map((U) => `${U.stars} ★ · ${U.sneaky} sneaky`),
      focus: { x: W / 2, y: 700, zoom: 1.05 },
    });
  }

  // --- escalation -------------------------------------------------------------------------
  levelUp() {
    this.level++;
    const L = this.level;
    if (L === 1) {
      this.ensureBooks();
      this.showBanner('Books fly!', 1.4, '#3fc1c9', 120);
      snd('sd-books', 'whoosh', { vol: 0.6 }); sfx('flip');
    } else if (L === 2) {
      this.showBanner('Dancing lamp!', 1.4, '#ff9ccf', 120);
      snd('sd-lamp', 'boing', { vol: 0.6 });
      particles.burst(LAMP.x, LAMP.y - 250, { type: 'note', count: 10, colors: RAINBOW, speed: [120, 300] });
    } else if (L === 3) {
      this.showBanner('Disco!', 1.4, '#ffd23f', 150);
      snd('sd-disco', 'magic', { vol: 0.6 }); fx.flash('#ffffff', 0.15);
    }
    fx.shake(6, 0.2);
  }

  ensureBooks() {
    if (this.books.length) return;
    for (let k = 0; k < 7; k++) {
      const left = k % 2 === 0;
      this.books.push({
        x: left ? rand(80, 560) : rand(1360, 1840), y: rand(150, 520), z: 0, home: { x: left ? rand(80, 560) : rand(1360, 1840), y: rand(150, 520) },
        cx: left ? rand(360, 760) : rand(1160, 1560), cy: rand(260, 440), rx: rand(160, 320), ry: rand(60, 140), ph: rand(TAU), sp: rand(0.8, 1.4) * (chance(0.5) ? 1 : -1),
        col: BOOK_COLS[k % BOOK_COLS.length], idx: k, flap: rand(TAU), fly: 0, fall: 0, vy: 0, floorY: rand(640, 700),
      });
    }
  }

  // --- frame ------------------------------------------------------------------------------
  preUpdate(dt) {
    this.t0 += dt;
    if (!this.stoppedHostMusic) { this.stoppedHostMusic = true; if (music.name) music.stop(0.1); }
    for (const U of this.units) { U.a.setPose(U.i % 2 ? 'wave' : 'ready'); this.place(U); U.a.update(dt); }
    this.animHoot(dt);
    this.snoreSound(dt);
  }

  update(dt) {
    this.t += dt; this.pt += dt;
    if (!this.stoppedHostMusic) { this.stoppedHostMusic = true; if (music.name) music.stop(0.1); }
    if (this.phase === 'ready') this.startSnore();
    this.tune.update(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    switch (this.phase) {
      case 'snore':
        if (this.t >= WAKE_AT) this.startWake();
        else if (this.pt >= this.snoreDur) this.startStir();
        break;
      case 'stir':
        if (this.stopAt != null && this.pt >= this.stopAt) { this.stopAt = null; this.tune.stop('sd-hush'); }
        this.stirEyes();
        if (this.pt >= this.stirDur) { if (this.fake) this.startYawn(); else this.startLook(); }
        break;
      case 'look': this.lookAround(dt); if (this.pt >= this.lookDur) this.endLook(); break;
      case 'yawn': if (this.pt >= 1.3) this.startSnore(); break;
      case 'wake': this.wakeAnim(); if (this.pt >= 2.4) this.startParty(); break;
      case 'party': if (this.t >= this.partyEnd) this.endGame(); break;
      case 'end': if (this.pt >= 1.6) this.finishNow(); break;
      default: break;
    }
    // escalation: the party meter, with a time floor so it always happens
    const want = Math.min(3, Math.max(Math.floor(this.meter), Math.floor(this.t / 16)));
    if (this.phase === 'snore' && want > this.level) this.levelUp();
    for (const U of this.units) {
      if (U.p.isAI) this.ai(U, dt);
      this.control(U, dt);
    }
    this.separate(dt);
    this.updatePickups(dt);
    this.animWorld(dt);
    this.animHoot(dt);
    this.snoreSound(dt);
  }

  postUpdate(dt) {
    this.t += dt * 0.5;
    this.tune.update(dt);
    if (this.banner) this.banner.t += dt;
    for (const U of this.units) { this.physics(U, dt); this.place(U); U.a.update(dt); }
    this.animWorld(dt);
    this.animHoot(dt);
  }

  destroy() { this.tune.destroy(); }

  snoreSound(dt) {
    if (this.phase !== 'snore' && this.phase !== 'ready' && this.phase !== 'yawn') return;
    this.snoreT -= dt;
    if (this.snoreT <= 0) {
      this.snoreT = 2.2;
      snd('sd-snore', 'snore', { vol: 0.45 });
      particles.burst(SEAT.x + 60, SEAT.y - 280, { type: 'bubble', count: 2, colors: ['#e6e0ff', '#ffffff'], speed: [30, 80], angle: -Math.PI / 2, spread: 0.6 });
    }
  }

  stirEyes() {
    const H0 = this.hoot, k = this.pt / this.stirDur;
    // snore stops, he shuffles, then ONE eye creaks open (left), the other stays shut
    H0.eyeL = clamp((k - 0.3) / 0.55, 0, 1);
    H0.eyeR = 0;
    H0.look = Math.sin(this.pt * 3) * 0.6;
    H0.hatTip = lerp(1, 0.6, clamp(k * 2, 0, 1));
    if (k > 0.3 && !this.peekSnd) { this.peekSnd = true; snd('sd-peek', 'tick', { vol: 0.5 }); }
    if (k < 0.3) this.peekSnd = false;
  }

  lookAround(dt) {
    const H0 = this.hoot;
    if (H0.stareAt) {
      H0.stareT -= dt;
      const U = H0.stareAt;
      H0.lookTo = clamp((U.x - SEAT.x) / 500, -1, 1);
      H0.squint = 1; H0.bubble = 'hmm';
      if (H0.stareT <= 0) { H0.stareAt = null; H0.squint = 0; H0.bubble = 'q'; }
    } else if (chance(dt * 1.2)) H0.lookTo = rand(-1, 1);
    H0.look = damp(H0.look, H0.lookTo, 8, dt);
  }

  wakeAnim() {
    const H0 = this.hoot, k = this.pt;
    H0.stand = clamp((k - 0.4) / 0.5, 0, 1);
    H0.wingUp = k > 1.0 ? 1 : 0;
    if (k > 1.0 && !this.shadesOn) { this.shadesOn = true; snd('sd-shades', 'sparkle', { vol: 0.6 }); }
    H0.shades = clamp((k - 1.1) / 0.45, 0, 1);
    if (k > 1.6) { H0.mouth = 'grin'; H0.bubble = 'party'; }
  }

  animHoot(dt) {
    const H0 = this.hoot;
    H0.shake = Math.max(0, H0.shake - dt);
    if (H0.reactT > 0) { H0.reactT -= dt; if (H0.reactT <= 0) H0.react = null; }
    this.runTimers(dt);
    const want = this.phase === 'snore' || this.phase === 'ready' || this.phase === 'yawn' ? 1 : this.phase === 'stir' ? 0.6 : this.phase === 'look' ? 0.25 : 0;
    H0.hatTip = damp(H0.hatTip, want, 3, dt);
    H0.dance = damp(H0.dance, this.phase === 'party' || this.phase === 'end' ? 1 : 0, 4, dt);
    H0.bubbleK = damp(H0.bubbleK, 1, 10, dt);
    if (this.phase === 'yawn' && this.pt > 0.9) H0.wingUp = 0;
  }

  animWorld(dt) {
    const t = this.t || this.t0;
    const beat = this.tune.beat;
    const moving = this.danceOn || this.phase === 'end';
    this.dim = damp(this.dim, this.phase === 'stir' || this.phase === 'look' ? 1 : 0, 6, dt);
    this.lightK = damp(this.lightK, moving && this.level >= 3 ? 1 : 0, moving ? 3 : 10, dt);
    this.spin += dt * (moving ? 2.2 : 0);
    // books
    for (const b of this.books) {
      b.flap += dt * (moving ? 14 : 3);
      if (moving) {
        b.fall = 0; b.vy = 0;
        b.fly = Math.min(1, b.fly + dt * 1.5);
        b.ph += dt * b.sp;
        const tx = b.cx + Math.cos(b.ph) * b.rx, ty = b.cy + Math.sin(b.ph * 1.3) * b.ry;
        b.x = lerp(b.home.x, tx, b.fly); b.y = lerp(b.home.y, ty, b.fly);
      } else if (this.level >= 1 && b.fly > 0) {
        // they drop to the floor and play dead
        if (b.y < b.floorY) { b.vy += 1800 * dt; b.y = Math.min(b.floorY, b.y + b.vy * dt); if (b.y >= b.floorY && !b.thud) { b.thud = true; if (chance(0.5)) sfx('land', { vol: 0.25 }); } }
      }
      if (moving) b.thud = false;
    }
    // lamp
    this.lampDance = damp(this.lampDance, moving && this.level >= 2 ? 1 : 0, 6, dt);
    this.lampFrozen = damp(this.lampFrozen, this.level >= 2 && (this.phase === 'stir' || this.phase === 'look') ? 1 : 0, 8, dt);
    // disco ball
    this.ball = damp(this.ball, this.level >= 3 ? 1 : 0, 1.5, dt);
    if (moving && Math.floor(beat) !== this.lastBeat) {
      this.lastBeat = Math.floor(beat);
      if (this.level >= 2) particles.burst(LAMP.x, LAMP.y - 280, { type: 'note', count: 1, colors: RAINBOW, speed: [80, 160], angle: -Math.PI / 2, spread: 0.8 });
      if (this.phase === 'party') particles.burst(SEAT.x + rand(-160, 160), SEAT.y - 300, { type: 'note', count: 1, colors: RAINBOW, speed: [80, 180] });
    }
  }

  // --- players ---------------------------------------------------------------------------
  control(U, dt) {
    U.spinCd = Math.max(0, U.spinCd - dt);
    const act = this.active(U);
    if (this.phase === 'end') { this.physics(U, dt); this.place(U); U.a.update(dt); return; }
    if (U.state === 'caught') {
      U.caughtT -= dt;
      U.vx = damp(U.vx, 0, 10, dt); U.vy = damp(U.vy, 0, 10, dt);
      if (U.caughtT <= 0) U.state = 'dance';
    } else if (this.watching && this.pt >= GRACE) {
      this.watchInput(U, dt, act);
    } else {
      this.danceInput(U, dt, act);
    }
    // disguise fade (and a statue's grey)
    const showD = U.state === 'still';
    U.dk = damp(U.dk, showD ? 1 : 0, showD ? 10 : 12, dt);
    if (U.disguise === 'statue') { if (U.dk > 0.05) U.a.tint('#d8d4e6', 0.6 * U.dk); else if (U.state !== 'caught') U.a.tint(null); }
    this.physics(U, dt);
    this.place(U);
    U.a.update(dt);
  }

  danceInput(U, dt, act) {
    const c = U.p.ctrl, a = U.a;
    let ix = c.x, iy = c.y;
    if (this.easy && !U.p.isAI) [ix, iy] = this.easyDance(U, dt, act);
    const mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; }
    const sp = SPEED * (U.p.isAI ? CPU_SPEED[clamp(U.p.aiLevel ?? 0, 0, 2)] / aiProfile(U.p).speed : 1);
    U.vx = damp(U.vx, ix * sp, 9, dt); U.vy = damp(U.vy, iy * sp * 0.75, 9, dt);
    const earning = this.danceOn;
    let dir = null;
    if (mag > 0.4) dir = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 'right' : 'left') : (iy > 0 ? 'down' : 'up');
    if (dir && dir !== U.dir) {
      a.playOnce(MOVES[dir], 0.42, 'dance'); a.squash(0.22);
      if (dir === 'left' || dir === 'right') a.facing = dir === 'right' ? 1 : -1;
      if (earning) {
        U.acc += 0.4;
        particles.burst(U.x, U.y - a.height * 0.7, { type: 'note', count: 2, colors: [U.p.color, '#ffffff'], speed: [80, 200] });
        if (!U.p.isAI) sfx('note', { midi: { up: 79, down: 67, left: 72, right: 76 }[dir], vol: 0.25 });
      }
    }
    U.dir = dir;
    if (c.pressed('a') && U.spinCd <= 0 && U.z <= 0) {
      U.spinCd = 0.45; U.vz = 820; U.spinT = 0.5;
      a.playOnce('dance-star', 0.5, 'dance'); a.squash(0.35);
      particles.burst(U.x, U.y - a.height * 0.5, { type: 'star', count: 10, colors: [U.p.color, '#ffd23f', '#ffffff'], speed: [150, 380] });
      particles.ring(U.x, U.y - 10, U.p.color, 120, 0.35);
      snd('sd-spin', 'whoosh', { vol: 0.45 });
      if (earning) U.acc += 1;
    }
    if (act && earning) {
      U.streak += dt;
      U.acc += dt * (1.6 + Math.min(1, U.streak / 4) * 0.8) * (this.phase === 'party' ? 2 : this.level >= 3 ? 1.3 : 1);
      if (!a._once) a.setPose('dance');
      this.meter += (dt * 0.13) / this.n;
      if (U.streak > 3 && chance(dt * 4)) particles.burst(U.x + rand(-30, 30), U.y - a.height * rand(0.2, 1), { type: 'sparkle', count: 1, colors: [U.p.color, '#ffd23f'], speed: [30, 90] });
    } else {
      U.streak = Math.max(0, U.streak - dt * 3);
      if (!a._once) { if (Math.hypot(U.vx, U.vy) > 60) a.setPose('dance'); else a.setPose('idle'); }
    }
    while (U.acc >= 1) { U.acc -= 1; this.addStars(U, 1); }
    this.grabStars(U);
  }

  watchInput(U, dt, act) {
    U.vx = damp(U.vx, 0, 14, dt); U.vy = damp(U.vy, 0, 14, dt);
    if (act && !U.caughtThis) { this.catchUnit(U); return; }
    if (!act && U.state === 'dance') {
      U.state = 'still';
      // a plain standing pose becomes a funny frozen pose
      if (!U.a._once) { U.a.playOnce(pick(['strike3', 'balance', 'dance-up', 'pose-twirl']), 1.4, 'idle'); U.a.update(0.22); }
      snd('sd-freeze', 'sparkle', { vol: 0.25 });
    }
    if (act && U.state === 'still' && U.caughtThis) { /* already caught this look: just giggle */ }
  }

  catchUnit(U) {
    const a = U.a, H0 = this.hoot;
    U.state = 'caught'; U.caughtT = 1.0; U.caughtThis = true; U.caughtN++; U.streak = 0; U.dk = 0;
    if (U.disguise === 'statue') a.tint(null);
    a.playOnce('surprised', 0.5, 'idle'); a.squash(0.35);
    voice(U.p.charId, 'gasp');
    H0.stareAt = U; H0.stareT = 0.9; H0.bubbleK = 0.6;
    snd('sd-hmm', 'npc/hoot/hoo', { vol: 0.6, rate: 0.85 });
    // a proper telling-off, a different one each time
    if (!H0.react || H0.reactT <= 0.3) this.hootReact(nextKind(H0.lastReact), 1.0);
    fx.shake(5, 0.2);
    if (!U.p.isAI) U.p.ctrl.rumble(0.5, 220);
    // a couple of stars bounce out of their pocket
    const k = Math.min(DROP, U.stars);
    for (let i = 0; i < k; i++) {
      U.stars--;
      const ang = -Math.PI / 2 + (i ? 0.7 : -0.7) + rand(-0.2, 0.2);
      this.pickups.push({ x: U.x, y: U.y, z: U.a.height * 0.6, vz: 600, vx: Math.cos(ang) * rand(140, 220), vy: rand(-40, 60), t: 0, owner: U, life: 10 });
    }
    if (k) snd('sd-drop', 'coin', { vol: 0.4, rate: 0.8 });
  }

  /** Professor Hoot is scandalised: 'shock' | 'scold' | 'huff'. */
  hootReact(kind, dur, text = null) {
    const H0 = this.hoot;
    H0.react = kind; H0.lastReact = kind; H0.reactT = dur; H0.reactDur = dur; H0.say = text || sayFor(kind, H0.say);
    H0.shake = Math.max(H0.shake, kind === 'shock' ? 0.5 : 0.25);
    if (kind === 'huff') snd('sd-huff', 'squeak', { vol: 0.35, rate: 0.75 });
    if (kind === 'scold') snd('sd-tsk', 'tick', { vol: 0.5 });
  }

  /** Runs fn after a delay of game time (paused games don't fire early). */
  later(delay, fn) { (this.timers || (this.timers = [])).push({ t: delay, fn }); }
  runTimers(dt) {
    if (!this.timers || !this.timers.length) return;
    for (const T of this.timers) { T.t -= dt; if (T.t <= 0 && !T.done) { T.done = true; if (!this.finished) T.fn(); } }
    this.timers = this.timers.filter((T) => !T.done);
  }

  addStars(U, n, color = '#ffd23f', label = null) {
    U.stars += n;
    if (U.p.isAI && !label && this.n > 3) return;
    particles.popText(U.x + rand(-30, 30), U.y - U.a.height - 40 - U.z, label || `+${n}`, color, label ? 42 : 34);
    if (!U.p.isAI) sfx('collect', { step: U.stars % 8, vol: 0.2 });
  }

  updatePickups(dt) {
    for (const s of this.pickups) {
      s.t += dt; s.life -= dt;
      s.vz -= 1600 * dt; s.z += s.vz * dt;
      if (s.z <= 0) { s.z = 0; if (Math.abs(s.vz) > 120) { s.vz = -s.vz * 0.5; sfx('bounce', { vol: 0.12 }); } else s.vz = 0; s.vx *= 0.7; s.vy *= 0.7; }
      s.x = clamp(s.x + s.vx * dt, BOUNDS.x0, BOUNDS.x1); s.y = clamp(s.y + s.vy * dt, BOUNDS.y0, BOUNDS.y1);
    }
    this.pickups = this.pickups.filter((s) => s.life > 0 && !s.got);
  }

  grabStars(U) {
    if (!this.danceOn) return;
    for (const s of this.pickups) {
      if (s.got || s.z > 40 || s.t < 0.5) continue;
      if (s.owner !== U && s.t < 2) continue;
      if (dist(U.x, U.y, s.x, s.y) < U.a.radius + 40) {
        s.got = true; U.stars++;
        particles.popText(s.x, s.y - 60, '+1', '#ffd23f', 40);
        particles.burst(s.x, s.y - 30, { type: 'star', count: 6, colors: ['#ffd23f', '#ffffff'], speed: [80, 200] });
        snd('sd-grab', 'coin', { vol: 0.4 });
        U.a.playOnce('cheer', 0.35);
      }
    }
  }

  physics(U, dt) {
    const a = U.a;
    if (U.z > 0 || U.vz > 0) { U.vz -= 2800 * dt; U.z += U.vz * dt; if (U.z <= 0) { U.z = 0; U.vz = 0; a.squash(0.3); } }
    if (U.spinT > 0) { U.spinT -= dt; a.facing = Math.sin(U.spinT * 40) > 0 ? 1 : -1; }
    U.x = clamp(U.x + U.vx * dt, BOUNDS.x0, BOUNDS.x1);
    U.y = clamp(U.y + U.vy * dt, BOUNDS.y0, BOUNDS.y1);
  }

  place(U) {
    const a = U.a;
    a.x = U.x; a.y = U.y; a.z = U.z;
    a.scale = this.scale * U.sizeK * (0.88 + 0.14 * clamp((U.y - BOUNDS.y0) / (BOUNDS.y1 - BOUNDS.y0), 0, 1));
  }

  separate(dt) {
    const E = this.units;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const r = (A.a.radius + B.a.radius) * 0.6;
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy);
      if (d < r && d > 0.01) {
        const k = ((r - d) / d) * 0.5 * Math.min(1, dt * 12);
        A.x -= dx * k; A.y -= (dy / 1.6) * k; B.x += dx * k; B.y += (dy / 1.6) * k;
      }
    }
  }

  /** Molly Easy (humans): while A is held the dancer picks its own moves, on the beat. */
  easyDance(U, dt, act) {
    // the stick, if they use it, moves them like Medium (never while he's looking)
    const st = easySteer(U, U.p.ctrl, dt);
    if (st.manual && !this.watching) {
      U.homeX = U.x; U.homeY = U.y; U.edT = 0;   // autopilot carries on from here, no drift back
      return [st.x, st.y];
    }
    if (!act) { U.edT = 0; return [0, 0]; }
    U.edT = (U.edT || 0) - dt;
    if (U.edT <= 0) {
      U.edT = 0.34;
      // dropped stars of yours nearby? boogie over to them
      const star = this.danceOn && this.pickups.find((s) => !s.got && (s.owner === U || s.t > 2) && dist(U.x, U.y, s.x, s.y) < 520);
      if (star) { const a = Math.atan2(star.y - U.y, star.x - U.x); U.edDir = [Math.cos(a), Math.sin(a)]; }
      else {
        // a new dance move each beat: side, up, other side, down... drifting back home
        U.edStep = ((U.edStep ?? U.i) + 1) % 4;
        const v = [[1, 0], [0, -1], [-1, 0], [0, 1]][U.edStep];
        const hx = U.homeX - U.x, hy = U.homeY - U.y, hd = Math.hypot(hx, hy);
        const pull = clamp(hd / 300, 0, 0.8);
        U.edDir = [v[0] * (1 - pull) + (hd ? hx / hd : 0) * pull, v[1] * (1 - pull) + (hd ? hy / hd : 0) * pull];
      }
    }
    return [U.edDir[0] * 0.8, U.edDir[1] * 0.8];
  }

  // --- CPU ---------------------------------------------------------------------------------
  ai(U, dt) {
    const p = U.p, A = U.ai, lvl = clamp(p.aiLevel ?? 0, 0, 2);
    const dance = () => {
      // grab a bouncing star if one is close
      if (!A.star || A.star.got || A.star.life <= 0) A.star = this.pickups.find((s) => (s.owner === U || s.t > 2) && dist(U.x, U.y, s.x, s.y) < 420) || null;
      if (A.star && chance(0.98)) { steer(p, U.x, U.y, A.star.x, A.star.y, { arrive: 10 }); if (chance(dt * 0.8)) p.ctrl.press('a'); return; }
      A.dirT -= dt;
      if (A.dirT <= 0) {
        A.dirT = rand(0.25, 0.6);
        // wander about the rug, drifting back toward the middle
        const back = Math.atan2(U.homeY - U.y, U.homeX - U.x);
        const ang = chance(0.25) ? back : rand(TAU);
        A.dir = [Math.cos(ang), Math.sin(ang)];
      }
      p.ctrl.move(A.dir[0], A.dir[1]);
      if (chance(dt * [0.6, 0.9, 1.2][lvl])) p.ctrl.press('a');
    };
    if (this.danceOn) {
      if (A.dawdle > 0) { A.dawdle -= dt; p.ctrl.move(0, 0); return; }
      if (chance(dt * [0.4, 0.22, 0.1][lvl])) { A.dawdle = rand(0.5, 1.3); return; }
      dance();
      return;
    }
    if (this.phase === 'stir' || this.phase === 'look') {
      const tt = this.phase === 'stir' ? this.pt : this.stirDur + this.pt;
      if (A.stopAt != null && tt < A.stopAt) { dance(); return; }
      if (this.phase === 'look' && A.wiggleAt != null && this.pt >= A.wiggleAt) { A.wiggleAt = null; A.wiggleT = rand(0.2, 0.4); }
      if (A.wiggleT > 0) { A.wiggleT -= dt; p.ctrl.move(rand(-1, 1), rand(-1, 1)); return; }
      p.ctrl.move(0, 0);
      return;
    }
    p.ctrl.move(0, 0);
  }

  // --- drawing -------------------------------------------------------------------------------
  draw(g) {
    const t = this.t || this.t0;
    const bg = art('bg/sneaky-dance');
    if (bg) g.drawImage(bg, 0, 0, W, H); else g.drawImage(libraryBackground(), 0, 0);
    // disco ball (comes down at level 3)
    if (this.ball > 0.01) {
      drawBeams(g, BALL.x, -60 + this.ball * 300, this.spin, this.lightK);
      drawDiscoBall(g, BALL.x, -60 + this.ball * 300, this.spin, this.lightK, t);
    }
    // books (behind everything on the floor)
    for (const b of this.books) if (b.fly > 0.01) drawBook(g, b.x, b.y, b.flap, b.col, b.idx, this.danceOn ? Math.sin(b.ph * 2) * 0.3 : 0.6 * (b.idx % 2 ? 1 : -1));
    // Hoot in his chair
    const H0 = this.hoot;
    const hasChair = drawChairBack(g);
    g.save();
    g.translate(SEAT.x + (H0.shake > 0 ? Math.sin(t * 40) * 6 * H0.shake : 0), SEAT.y);
    const R = H0.react && this.phase !== 'party' && this.phase !== 'end' && H0.shades < 0.5 ? H0.react : null;
    const key = this.phase === 'party' || this.phase === 'end' || (this.phase === 'wake' && H0.shades > 0.9) ? 'prop/sd-hoot-party'
      : R === 'scold' && art('prop/sd-hoot-scold') ? 'prop/sd-hoot-scold'
        : R === 'shock' && art('prop/sd-hoot-shock') ? 'prop/sd-hoot-shock'
          : H0.stareAt ? 'prop/sd-hoot-stare' : this.phase === 'look' || this.phase === 'wake' ? 'prop/sd-hoot-stare'
        : this.phase === 'yawn' ? 'prop/sd-hoot-yawn' : this.phase === 'stir' && H0.eyeL > 0.3 ? 'prop/sd-hoot-peek' : 'prop/sd-hoot-sleep';
    drawHoot(g, {
      t, eyeL: H0.eyeL, eyeR: H0.eyeR, look: H0.look, mouth: H0.mouth, hatTip: H0.hatTip, stand: H0.stand, shades: H0.shades, dance: H0.dance,
      squint: H0.squint, wingUp: H0.wingUp, book: this.phase !== 'wake' && this.phase !== 'party' && this.phase !== 'end' && !H0.stareAt && this.phase !== 'look',
      breathe: this.phase === 'snore' || this.phase === 'ready' ? 1 : 0, artKey: key,
    });
    g.restore();
    if (H0.stand < 0.5) drawChairFront(g, hasChair);
    if (R) this.drawHootReact(g, t, R, key);
    // lamp
    drawLamp(g, LAMP.x, LAMP.y, t, this.lampDance, this.lampFrozen, this.tune.beat);
    // the "telegraph" glow round Hoot while he stirs
    if (this.phase === 'stir') {
      const k = this.pt / this.stirDur;
      g.save(); g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 16);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 14 + k * 10;
      g.beginPath(); g.ellipse(SEAT.x, SEAT.y - 190, 240 + k * 40, 230 + k * 40, 0, 0, TAU); g.stroke();
      g.restore();
    }
    // gaze lines toward whoever wiggled
    if (H0.stareAt) {
      const U = H0.stareAt;
      g.save(); g.strokeStyle = 'rgba(255,77,109,0.75)'; g.lineWidth = 6; g.setLineDash([18, 14]); g.lineDashOffset = -t * 120;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(SEAT.x + s * 38, SEAT.y - 226); g.lineTo(U.x + s * 14, U.y - U.a.height * 0.75); g.stroke(); }
      g.restore();
    }
    // dimming while he looks (the dancers stay bright)
    if (this.dim > 0.01) { g.save(); g.globalAlpha = 0.18 * this.dim; g.fillStyle = '#1a1030'; g.fillRect(0, 0, W, H); g.restore(); }
    // dropped stars
    for (const s of this.pickups) {
      g.save(); g.globalAlpha = 0.25; g.fillStyle = NAVY; g.beginPath(); g.ellipse(s.x, s.y, 20, 6, 0, 0, TAU); g.fill(); g.restore();
      drawStarPickup(g, s.x, s.y - 24 - s.z, 22, t + s.x, s.life < 2 ? (Math.sin(t * 20) > 0 ? 1 : 0.3) : 1);
    }
    // dancers
    const list = this.units.slice().sort((a, b) => a.y - b.y);
    for (const U of list) this.drawUnit(g, U, t);
    // party lights
    if (this.lightK > 0.01) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const cols = ['255,111,177', '63,167,255', '255,210,63', '155,92,255'];
      const beat = this.tune.beat, pulse = Math.pow(1 - (beat % 1), 3);
      for (let k = 0; k < 4; k++) {
        const x = W / 2 + Math.cos(t * 0.9 + k * 1.7) * 640, y = 860 + Math.sin(t * 1.3 + k * 2.3) * 140;
        const r = 230 + pulse * 40;
        const gr = g.createRadialGradient(x, y, 10, x, y, r);
        gr.addColorStop(0, `rgba(${cols[k]},${0.22 * this.lightK})`); gr.addColorStop(1, `rgba(${cols[k]},0)`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, TAU); g.fill();
      }
      g.restore();
    }
    // Hoot's bubble: Zzz (dance!) / ? (he's stirring) / ?! (caught) / notes (party)
    const bk = this.phase === 'end' ? 0 : H0.bubbleK * (this.phase === 'stir' ? 0.75 + 0.35 * clamp(this.pt / this.stirDur, 0, 1) : this.phase === 'look' ? 1.1 : 0.8);
    drawBubble(g, BUBBLE.x, BUBBLE.y + (this.phase === 'stir' ? Math.sin(t * 30) * 4 : 0), H0.bubble, bk, t);
  }

  /** Code-drawn extras for Hoot's reactions (stand-ins until the art lands). */
  drawHootReact(g, t, R, key) {
    const H0 = this.hoot, k = clamp((H0.reactDur - H0.reactT) / 0.15, 0, 1), fade = clamp(H0.reactT / 0.2, 0, 1);
    const hx = SEAT.x, hy = SEAT.y - 250 - H0.stand * 46;
    g.save(); g.globalAlpha = fade;
    if (R === 'shock') {
      drawShock(g, hx, hy, 160, t, k);
      if (key !== 'prop/sd-hoot-shock' && H0.reactDur - H0.reactT < 0.6) {
        // his spectacles pop up off his beak
        const u = (H0.reactDur - H0.reactT) / 0.6;
        g.save(); g.translate(hx + 30 * u, hy - 30 - Math.sin(u * Math.PI) * 120); g.rotate(u * 5);
        g.strokeStyle = '#24163f'; g.lineWidth = 9; g.fillStyle = 'rgba(220,240,255,0.6)';
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 28, 0, 22, 0, TAU); g.fill(); g.stroke(); }
        g.strokeStyle = '#e5b53a'; g.lineWidth = 5;
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 28, 0, 22, 0, TAU); g.stroke(); }
        g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke();
        g.restore();
      }
    } else if (R === 'huff') drawSteam(g, hx, hy - 10, 150, t);
    else if (R === 'scold' && key !== 'prop/sd-hoot-scold') drawWag(g, hx + 175, hy + 10, 1.5, t, -1);
    drawShout(g, H0.say, hx - 300, hy - 120 - (1 - k) * 20, 54, t, k);
    g.restore();
  }

  drawUnit(g, U, t) {
    const a = U.a;
    if (U.disguise === 'statue') drawPlinth(g, U.x, U.y, Math.max(90, a.width * 0.9), U.dk);
    // dance glow under each dancer
    g.save();
    g.globalAlpha = 0.35 + (this.danceOn ? 0.3 * Math.pow(1 - (this.tune.beat % 1), 2) : 0);
    g.fillStyle = U.state === 'still' ? '#e6f7ff' : U.p.color;
    g.beginPath(); g.ellipse(U.x, U.y + 4, 90 * a.scale / U.sizeK, 26 * a.scale / U.sizeK, 0, 0, TAU); g.fill();
    g.restore();
    a.draw(g, { ring: U.p.color });
    if (U.state === 'caught') {
      g.save(); g.translate(U.x + 40, U.y - a.height - 30 - U.z); g.rotate(Math.sin(t * 20) * 0.1);
      ui.text(g, '!', 0, 0, { size: 60, color: '#ff4d6d', strokeWidth: 8 });
      g.restore();
    }
    // Easy: Hoot is snoring and you're standing still - a bouncing A says "dance!"
    if (this.easy && !U.p.isAI && this.danceOn && U.state !== 'caught' && !U.p.ctrl.held('a') && !U.p.ctrl.held('x') && Math.hypot(U.p.ctrl.x, U.p.ctrl.y) <= 0.3) {
      const b = Math.abs(Math.sin(t * 8));
      g.save(); g.translate(U.x + 70, U.y - U.z - a.height - 20 - b * 14); g.scale(1 + b * 0.15, 1 + b * 0.15);
      ui.glyph(g, 'a', 0, 0, 50); g.restore();
    }
    if (this.t < 5 || (!U.p.isAI && this.n > 1 && this.t < 12)) {
      const sc = this.n > 4 ? 0.8 : 0.95;
      g.save(); g.translate(U.x, U.y - U.z - a.height - 34); g.scale(sc, sc); ui.playerTag(g, U.p, 0, 0); g.restore();
    }
  }

  drawHUD(g) {
    ui.scoreboard(g, this.players, this.units.map((U) => U.stars), {
      y: 16, avoidCenter: true, format: (v) => `${v} ★`,
      expr: this.units.map((U) => (U.state === 'caught' ? 'surprised' : U.state === 'still' ? 'neutral' : 'happy')),
    });
    ui.timer(g, Math.max(0, GAME_T - this.t));
    // party meter (shared): fills toward the next surprise
    if (this.level < 3 && this.phase !== 'wake' && this.phase !== 'party' && this.phase !== 'end') {
      const k = clamp(Math.max(this.meter, this.t / 16) - this.level, 0, 1);
      const x = W - 130, y = 140, h = 300;
      ui.panel(g, x - 26, y - 10, 52, h + 20, { r: 26, fill: '#2a1650', stroke: '#ffd23f', lineWidth: 5 });
      g.save(); ui.roundRect(g, x - 16, y, 32, h, 16); g.clip();
      const gr = g.createLinearGradient(0, y + h, 0, y);
      gr.addColorStop(0, '#ff4d9a'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#5ddc6a');
      g.fillStyle = gr; g.fillRect(x - 16, y + h * (1 - k), 32, h * k);
      g.restore();
      const icon = ['book', 'lamp', 'disco'][this.level];
      g.save(); g.translate(x, y - 46);
      if (icon === 'book') drawBook(g, 0, 10, (this.t || this.t0) * 6, '#3fc1c9', 0, 0);
      else if (icon === 'lamp') { g.scale(0.22, 0.22); drawLamp(g, 0, 160, this.t, 1, 0, this.tune.beat); }
      else { g.fillStyle = '#c8d2e8'; g.strokeStyle = NAVY; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(-12 + (i % 3) * 9, -10 + Math.floor(i / 3) * 12, 6, 6); }
      g.restore();
    }
    if (this.banner) {
      const b = this.banner, fade = clamp((b.dur - b.t) / 0.25, 0, 1);
      g.save(); g.globalAlpha = fade;
      ui.banner(g, b.text, b.t, { size: b.size, y: 440, color: b.color });
      g.restore();
    }
    // first-time hints (pictures carry it; words are a bonus for grown-ups)
    let hint = null, glyph = null, tone = '#fff8ec';
    if (this.round === 1 && this.phase === 'snore' && this.t < 7) { hint = this.easy ? 'Shhh... hold to dance while he snores!' : 'Shhh... dance while he snores!'; glyph = this.easy ? 'a' : 'stick'; }
    else if ((this.round <= 2 || this.easy) && (this.phase === 'stir' || this.phase === 'look')) { hint = this.easy ? 'He\'s waking - let go, FREEZE!' : 'He\'s waking - FREEZE!'; tone = '#ffe3e8'; }
    if (hint) {
      g.save();
      const w = ui.measure(g, hint, 40, 800) + (glyph ? 150 : 80);
      ui.panel(g, W / 2 - w / 2, H - 98, w, 72, { r: 36, fill: tone });
      ui.text(g, hint, W / 2 - (glyph ? 30 : 0), H - 61, { size: 40, color: NAVY, stroke: false, weight: 800 });
      if (glyph) ui.glyph(g, glyph, W / 2 + w / 2 - 52, H - 62, 50, { pulse: true });
      g.restore();
    }
  }
}

