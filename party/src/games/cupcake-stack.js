// Cupcake Tower (Molly Party) - everyone stacks ONE giant shared tower of
// cupcakes. Each player's cupcake zips back and forth above the tower, carried
// by a garden fairy; press A to drop it. Sticky icing: every drop sticks (way
// off? it boings back on), crooked ones make the whole tower wobble and giggle.
// Cherries and candles land on top, a perfect drop sparkles, three perfects in
// a row (or Golden Time) bring a golden super-cupcake. The camera climbs into
// the sky as the tower grows. Finale: a birthday cake lands on the very top and
// everybody mashes A to blow out the candles.
//
// Art hooks (procedural fallbacks ship today): bg/cupcake-stack thumb/cupcake-stack
//   prop/cake-stand prop/cupcake-<pink|blue|mint|lemon|lilac|choc|gold>
//   prop/cupcake-cherry prop/cupcake-candle prop/candle-flame prop/cupcake-topper-cake
// Sound hooks (fallbacks today): cs-drop cs-squish cs-perfect cs-candle-light cs-milestone
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import { drawNpcSprite } from '../engine/npc-art.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { drawSparkleShape } from '../engine/emotes.js';
import { easyPrompt } from '../engine/easy.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, TAU, later } from '../engine/util.js';
import { celebrateHop } from '../engine/celebrate.js';

const NAVY = '#24163f';
const PLAY_T = 45;            // stacking time; then the birthday finale
const BREEZE_T = 8;           // blowing time; then a magic breeze puts out the last candles
const GOLDEN_AT = 22;         // Golden Time: everyone's next cupcake is golden
const GROUND = 950;           // lawn / cake stand foot (world y)
const STAND_X = W / 2;
const STAND_TOP = 718;        // plate surface
const CUP_W = 130;
const CUP_H = 74;             // stack increment per cupcake
const RANGE = 360;            // slider swing
const LIFT = 230;             // slider height above the tower top
const ROW = 105;
const G = 2700;
const AI_ERR = [62, 40, 26];  // CPU aim error (px, 1 sigma)
const FROST = {
  pink: ['#ff9ccf', '#ff6fb1'], blue: ['#9fdcff', '#5bb8f5'], mint: ['#a6f0cf', '#4fd29a'],
  lemon: ['#fff08a', '#ffd23f'], lilac: ['#d9c2ff', '#a77bff'], choc: ['#b07a55', '#7c4a2d'], gold: ['#ffe066', '#e8a81c'],
};
const FLAVORS = ['pink', 'blue', 'mint', 'lemon', 'lilac', 'choc'];
const WRAPS = ['#ff8fc7', '#7fd3ff', '#8be8b8', '#ffb86f', '#c9a0ff', '#ff6f91'];
const FAIRIES = ['pink', 'blue', 'yellow', 'green', 'purple'];
const FAIRY_COL = { pink: '#ff73b5', blue: '#7599ff', yellow: '#ffd842', green: '#8ac544', purple: '#a96bf0' };

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

import { meta } from './cupcake-stack.meta.js';

export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: gentler fairies + a bigger Perfect window for humans
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0; this.time = 0;
    this.tower = [];
    this.falling = [];
    this.wob = 0; this.wobV = 0; this.giggleT = 0; this.wobbleCd = 0;
    this.golden = false; this.goldenMsgT = 0;
    this.milestone = 0; this.msg = null;
    this.phase = 'play';      // play -> wow -> cake -> blow -> party
    this.ph = 0;
    this.candles = [];        // finale topper candles
    this.gusts = [];
    this.topper = null;
    this.finished = false;
    // the stacking clock (shown the whole time), and the candle-blowing window before the magic breeze
    api.limit(() => (this.phase === 'play' ? Math.max(0, PLAY_T - this.time) : null), { showAt: Infinity });
    api.limit(() => (this.phase === 'blow' ? Math.max(0, BREEZE_T - this.ph) : null), { showAt: Infinity, x: W - 200, y: 400 });   // right side, under the tower counter
    this.humans = this.players.some((p) => !p.isAI);
    if (api.camera) { this._clampWas = api.camera.clampToStage; api.camera.clampToStage = false; }
    this.cam = { x: W / 2, y: H / 2, z: 1 };
    const n = this.n;
    const sc = n <= 4 ? 0.95 : n <= 6 ? 0.85 : 0.76;
    const left = Math.ceil(n / 2);
    this.ents = this.players.map((p, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const k = Math.floor(i / 2), per = side < 0 ? left : n - left;
      const span = 430, x0 = side < 0 ? 560 : W - 560;
      const x = x0 + side * (per <= 1 ? 120 : (span * k) / Math.max(1, per - 1) * 0.92 + 30);
      const a = new Actor(p, { scale: sc, x, y: GROUND + 40 + (k % 2) * 14 });
      a.facing = side < 0 ? 1 : -1; a.snap();
      const fa = new Actor(p, { scale: 0.62 });   // finale row (screen space)
      return {
        p, i, a, fa, score: 0, cups: 0, perfects: 0, streak: 0, candles: 0, wantGold: false, gotGolden: false,
        vol: p.isAI && this.humans ? 0.5 : 0.9,
        s: {
          phase: (i / n) * TAU + rand(-0.2, 0.2), spd: 1.9 + (i % 3) * 0.17, x: STAND_X, y: STAND_TOP - LIFT - (n > 4 ? (i % 2) * ROW : 0),
          row: n > 4 ? i % 2 : 0, item: null, reload: 0.2 + i * 0.12, pop: 0, flip: 0, fairy: FAIRIES[i % 5], seq: 0,
        },
        ai: { target: null, wait: 0, cool: 0 },
      };
    });
    this.sparkles = Array.from({ length: 22 }, () => ({ x: rand(W), y: rand(H), p: rand(TAU), s: rand(0.5, 1) }));
  }

  destroy() { if (this.api.camera && this._clampWas !== undefined) this.api.camera.clampToStage = this._clampWas; }

  // --------------------------------------------------------------- geometry
  get topY() { return STAND_TOP - this.tower.length * CUP_H; }
  get topX() { return this.tower.length ? this.tower[this.tower.length - 1].x : STAND_X; }
  /** Wobble offset of tower item i (visual only). */
  swayAt(i) {
    const len = this.tower.length; if (!len) return { dx: 0, rot: 0 };
    const f = (i + 1) / len;
    const amp = Math.min(1, len / 5);
    return { dx: this.wob * CUP_W * 0.75 * Math.pow(f, 1.5) * amp, rot: this.wob * 0.32 * f * amp };
  }

  // ----------------------------------------------------------------- update
  preUpdate(dt) { this.t += dt; this.animate(dt, false); }
  postUpdate(dt) { this.t += dt; this.animate(dt, false); this.updateFinale(dt, false); }

  update(dt) {
    this.t += dt; this.time += dt;
    if (this.phase === 'play') {
      if (!this.golden && this.time >= GOLDEN_AT) this.startGolden();
      if (this.time >= PLAY_T) this.startFinale();
    }
    this.animate(dt, this.phase === 'play');
    this.updateFinale(dt, true);
    if (this.msg) { this.msg.t += dt; if (this.msg.t > this.msg.dur) this.msg = null; }
  }

  startGolden() {
    this.golden = true; this.goldenMsgT = 0;
    for (const e of this.ents) e.wantGold = true;
    this.msg = { text: 'Golden cupcakes!', t: 0, dur: 2.2, color: '#ffd23f' };
    snd('golden-chime', 'star'); sfx('magic', { vol: 0.6 });
    fx.flash('#fff3a6', 0.2); fx.shake(6, 0.2);
    particles.confettiRain(W, 60);
  }

  animate(dt, playing) {
    // wobble spring (jiggly, settles in about a second)
    this.wobV += (-this.wob * 15 - this.wobV * 1.7) * dt; this.wob += this.wobV * dt;
    this.wob = clamp(this.wob, -0.9, 0.9);
    this.giggleT = Math.max(0, this.giggleT - dt); this.wobbleCd -= dt;
    if (Math.abs(this.wob) > 0.32 && this.wobbleCd <= 0 && this.tower.length > 3) {
      this.wobbleCd = 1.4; this.giggleT = 1.2;
      snd('tower-wobble', 'boing', { vol: 0.55 }); later(() => sfx('giggle', { vol: 0.7 }), 180);
      for (const e of this.ents) if (chance(0.5)) e.a.playOnce('giggle', 0.9);
    }
    for (const it of this.tower) {
      if (it.sq || it.sqv) { it.sqv += (-it.sq * 300 - it.sqv * 12) * dt; it.sq += it.sqv * dt; if (Math.abs(it.sq) < 0.003 && Math.abs(it.sqv) < 0.03) it.sq = it.sqv = 0; }
      it.age += dt;
    }
    // camera
    if (this.api.ended?.()) {
      // gallery ending: ease out until the whole tower, stand foot to the cake's candles, fits
      // between the ribbon (y~140) and the stars bar (y~900); a very tall tower just gets smaller
      const top = (this.topper ? Math.min(this.topper.y, this.topY) : this.topY) - 340, bot = GROUND;
      const z = Math.min(1, (900 - 140) / (bot - top));
      this.follow(STAND_X, (top + bot) / 2 + (540 - 520) / z, z, 3, dt);
    } else if (this.phase === 'play' || this.phase === 'cake' || this.phase === 'blow' || this.phase === 'party') {
      const z = this.phase === 'play' ? clamp(1 - this.tower.length * 0.012, 0.8, 1) : 1;
      const topY = this.topper ? this.topY - 220 : this.topY;
      // play: framed so the carrier fairies (and their tags) sit below the top scoreboard
      const cy = Math.min(GROUND + 130 - H / 2 / z, topY + (this.phase === 'play' ? (this.n > 4 ? -110 : -10) : 40) / z);
      this.follow(W / 2, cy, z, this.phase === 'play' ? 3.5 : 2.6, dt);
    }
    // sliders
    for (const e of this.ents) this.updateSlider(e, dt, playing);
    this.updateFalling(dt);
    // characters
    for (const e of this.ents) {
      const a = e.a;
      if (this.phase === 'play' && !a._once) a.setPose(this.tower.length > 4 ? 'look-up' : 'idle');
      a.update(dt);
      e.fa.update(dt);
    }
  }

  follow(x, y, z, rate, dt) {
    const c = this.cam;
    c.x = damp(c.x, x, rate, dt); c.y = damp(c.y, y, rate, dt); c.z = damp(c.z, z, rate, dt);
    if (this.api.camera) this.api.camera.follow(c.x, c.y, c.z, 30);
  }

  updateSlider(e, dt, playing) {
    const s = e.s;
    const grow = Math.min(0.9, this.tower.length * 0.012);
    s.phase += (s.spd + grow) * (this.easy && !e.p.isAI ? 0.8 : 1) * dt;
    s.x = STAND_X + Math.sin(s.phase) * RANGE;
    const ty = this.topY - LIFT - s.row * ROW;
    s.y = damp(s.y, this.phase === 'play' ? ty : ty - 900, this.phase === 'play' ? 7 : 1.5, dt);
    s.pop = Math.max(0, s.pop - dt * 3); s.flip = Math.max(0, s.flip - dt * 2.2);
    if (!playing) return;
    if (!s.item) {
      s.reload -= dt;
      if (s.reload <= 0) {
        s.item = this.nextItem(e); s.pop = 1;
        snd('cs-pop-in', 'pop', { vol: 0.25 * e.vol });
        if (s.item.kind === 'gold') { snd('golden-chime', 'sparkle', { vol: 0.6 * e.vol }); particles.burst(s.x, s.y - 40, { type: 'sparkle', count: 8, colors: ['#ffd23f', '#fff6a8', '#fff'] }); }
        e.ai.target = null;
      }
      return;
    }
    if (e.p.isAI) this.aiThink(e, dt);
    if (e.p.ctrl.pressed('a')) this.drop(e);
  }

  nextItem(e) {
    const s = e.s; s.seq++;
    if (e.wantGold) { e.wantGold = false; return { kind: 'gold', col: 'gold', wrap: '#e8a81c' }; }
    const len = this.tower.length;
    const r = Math.random();
    if (len >= 2 && r < 0.13) return { kind: 'candle', col: pick(['#ff8fc7', '#7fd3ff', '#ffd23f', '#a6f0cf', '#c9a0ff']) };
    if (len >= 2 && r < 0.24) return { kind: 'cherry' };
    if (r > 0.97) return { kind: 'gold', col: 'gold', wrap: '#e8a81c' };
    return { kind: 'cup', col: pick(FLAVORS), wrap: pick(WRAPS) };
  }

  reloadTime() { return 0.42 + this.n * 0.11; }

  drop(e) {
    const s = e.s;
    if (!s.item) return;
    const it = s.item; s.item = null; s.reload = this.reloadTime(); s.flip = 1;
    this.falling.push({ ...it, x: s.x, y: s.y, vy: 120, owner: e, rot: 0, spin: it.kind === 'cup' || it.kind === 'gold' ? 0 : rand(-6, 6), state: 'fall' });
    snd('cs-drop', 'whoosh', { vol: 0.4 * e.vol });
    e.a.playOnce('toss', 0.4);
    if (!e.p.isAI) e.p.ctrl.rumble(0.15, 50);
  }

  updateFalling(dt) {
    for (const f of this.falling) {
      if (f.state === 'boing') {
        f.bt += dt;
        const k = clamp(f.bt / 0.6, 0, 1);
        const ty = this.topY;
        f.x = lerp(f.fx, this.topX + f.side * CUP_W * 0.36, k);
        f.y = lerp(f.fy, ty, k) - Math.sin(k * Math.PI) * 190;
        f.rot = f.side * Math.sin(k * Math.PI) * 1.6;
        if (k >= 1) { f.y = ty; this.land(f, f.side * CUP_W * 0.36 / 0.55, true); }
        continue;
      }
      f.vy += G * dt; f.y += f.vy * dt; f.rot += f.spin * dt;
      if (f.y >= this.topY) {
        const dx = f.x - this.topX;
        if ((f.kind === 'cup' || f.kind === 'gold') && Math.abs(dx) > CUP_W * 0.82 && this.tower.length) {
          // way off: sticky icing yanks it back on with a boing
          f.state = 'boing'; f.bt = 0; f.fx = f.x; f.fy = this.topY; f.side = Math.sign(dx);
          snd('boing', 'bounce', { vol: 0.7 * f.owner.vol });
          particles.popText(f.x, f.y - 60, 'Boing!', '#ffffff', 46);
          f.owner.a.playOnce('surprised', 0.5);
          continue;
        }
        this.land(f, dx, false);
      }
    }
    this.falling = this.falling.filter((f) => f.state !== 'done');
  }

  land(f, dx, boinged) {
    f.state = 'done';
    const e = f.owner;
    const topY = this.topY;
    if (f.kind === 'cherry' || f.kind === 'candle') { this.landTopping(f, dx); return; }
    const perfect = !boinged && Math.abs(dx) < (this.easy && !e.p.isAI ? 34 : 22);
    const stick = clamp(dx * 0.55, -CUP_W * 0.42, CUP_W * 0.42);
    const it = {
      kind: f.kind, col: f.col, wrap: f.wrap, owner: e,
      x: clamp(lerp(this.topX + stick, STAND_X, 0.12), STAND_X - 160, STAND_X + 160),
      rot: clamp(stick / CUP_W * 0.55, -0.25, 0.25), sq: 1, sqv: 0, tops: [], age: 0,
    };
    const below = this.tower[this.tower.length - 1];
    if (below) { below.sq = 0.6; below.sqv = 0; if (below.tops.length) snd('topping-squish', 'squeak', { vol: 0.5 * e.vol }); }
    this.tower.push(it);
    this.wobV += (stick / CUP_W) * 3.2 + (perfect ? 0 : rand(-0.25, 0.25));
    e.cups++;
    const gold = f.kind === 'gold';
    let pts = gold ? 3 : perfect ? 2 : 1;
    e.score += pts;
    const px = it.x, py = topY - 50;
    snd('cs-squish', 'pancake-plop', { vol: e.vol });
    particles.burst(px, topY, { type: 'dust', count: 5, color: '#fff', speed: [60, 160], size: [8, 16] });
    particles.burst(px, topY - 30, { type: 'spark', count: 6, colors: RAINBOW, speed: [120, 300] });
    if (perfect) {
      e.streak++; e.perfects++;
      particles.ring(px, py, '#ffffff', 150, 0.4);
      particles.burst(px, py, { type: 'sparkle', count: 9, colors: ['#ffffff', '#fff3a6', e.p.color], speed: [100, 320] });
      particles.popText(px, py - 70, e.streak >= 3 ? 'Super!' : 'Perfect!', '#8ef0a8', 54);
      snd('cs-perfect', 'collect', { step: Math.min(e.streak + 2, 10), vol: e.vol });
      e.a.playOnce('cheer', 0.6);
      if (e.streak % 3 === 0) {
        e.wantGold = true;
        later(() => particles.popText(px, py - 140, 'Golden next!', '#ffd23f', 44), 260);
        sfx('magic', { vol: 0.5 * e.vol });
      }
    } else {
      e.streak = 0;
      if (Math.abs(stick) > 26 || boinged) {
        particles.popText(px + Math.sign(stick || 1) * 70, py - 30, pick(['Whoa!', 'Wobble!', 'Hee hee!', 'Oopsie!']), '#ffb3d9', 46);
        if (Math.abs(stick) > 40) this.giggleT = 0.9;
      }
    }
    particles.popText(px + 110, py + 30, '+' + pts, gold ? '#ffd23f' : '#ffffff', gold ? 64 : 46);
    if (gold) {
      sfx('star', { vol: 0.8 }); snd('golden-chime', 'sparkle');
      particles.burst(px, py, { type: 'star', count: 16, colors: ['#ffd23f', '#fff6a8', '#ffffff'], speed: [200, 520] });
      fx.flash('#fff3a6', 0.14); fx.shake(7, 0.2);
      this.api.camera && this.api.camera.punch(px, py, 1.15, 0.25);
      e.a.playOnce('celebrate', 0.9); voice(e.p.charId, 'yay');
    }
    if (!e.p.isAI) e.p.ctrl.rumble(perfect ? 0.35 : 0.2, 80);
    // milestones every 10
    const len = this.tower.length;
    if (len % 10 === 0) {
      this.milestone = len;
      this.msg = { text: String(len) + '!', t: 0, dur: 1.4, color: '#ff6fb1', big: true };
      snd('cs-milestone', 'fanfare', { vol: 0.6 });
      for (let k = 0; k < 3; k++) later(() => sfx('note', { midi: 76 + k * 4, dur: 0.2, vol: 0.22 }), k * 90);
      particles.burst(px, py, { type: 'confetti', count: 30 });
      fx.shake(5, 0.15);
    }
  }

  landTopping(f, dx) {
    const e = f.owner;
    const top = this.tower[this.tower.length - 1];
    if (!top) return;
    const side = dx === 0 ? (chance(0.5) ? 1 : -1) : Math.sign(dx);
    const slot = top.tops.length;
    const t = { kind: f.kind, col: f.col, side: slot % 2 ? -side : side, ang: (slot % 2 ? -side : side) * rand(0.25, 0.55), lit: f.kind === 'candle', pop: 1, spot: clamp(Math.abs(dx) / CUP_W, 0.15, 0.7) - slot * 0.08 };
    top.tops.push(t);
    top.sq = 0.45; top.sqv = 0;
    e.score += 1;
    const px = top.x + t.side * 30, py = this.topY - 40;
    snd('topping-squish', 'squeak', { vol: 0.6 * e.vol });
    if (f.kind === 'candle') {
      e.candles++;
      later(() => { snd('cs-candle-light', 'magic', { vol: 0.45 * e.vol }); particles.burst(px, py - 60, { type: 'sparkle', count: 6, colors: ['#ffd23f', '#ff9f1c', '#fff'] }); }, 150);
      particles.popText(px, py - 90, 'Candle!', '#ffd23f', 42);
    } else {
      particles.burst(px, py, { type: 'heart', count: 4, colors: ['#ff4d6d', '#ff8fa8'] });
      particles.popText(px, py - 80, 'Cherry!', '#ff4d6d', 42);
    }
    particles.popText(px + 80, py - 20, '+1', '#ffffff', 40);
    e.a.playOnce('cheer', 0.4);
  }

  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), lvl = clamp(p.aiLevel ?? 0, 0, 2), s = e.s, ai = e.ai;
    if (!ai.target) {
      ai.target = { off: clamp(gauss() * AI_ERR[lvl], -170, 170) };
      ai.wait = reactionTime(p) * (lvl === 0 ? 1.8 : 1.2) + rand(0, 0.4);
      ai.silly = chance(prof.mistake * 0.6);   // a silly early drop: funny wobbles
    }
    ai.wait -= dt;
    if (ai.wait > 0) return;
    if (ai.silly) { p.ctrl.press('a'); return; }
    // the fairy moves fast in the middle: lead the drop a little
    const lead = Math.cos(s.phase) * RANGE * (s.spd) * 0.06;
    if (Math.abs(s.x + lead - (this.topX + ai.target.off)) < 26) p.ctrl.press('a');
  }

  // ----------------------------------------------------------------- finale
  startFinale() {
    this.phase = 'wow'; this.ph = 0;
    for (const f of this.falling) if (f.state === 'fall' && f.y < this.topY) f.vy = Math.max(f.vy, 900);
    sfx('whistle'); snd('cs-milestone', 'fanfare');
    this.msg = { text: String(this.tower.length) + ' cupcakes!', t: 0, dur: 2.4, color: '#ff6fb1', big: true };
    fx.flash('#ffffff', 0.2);
    for (const e of this.ents) { e.a.setPose('cheer'); e.a.playOnce('celebrate', 1.2, 'look-up'); }
  }

  updateFinale(dt, live) {
    if (this.phase === 'play') return;
    this.ph += dt;
    for (const it of this.tower) for (const tp of it.tops) tp.pop = Math.max(0, tp.pop - dt);
    if (this.phase === 'wow') {
      // zoom out to see the whole tower
      const top = this.topY - 260, bot = GROUND + 120;
      const z = clamp((H * 0.92) / (bot - top), 0.08, 1);
      this.follow(W / 2, (top + bot) / 2, z, 2.8, dt);
      if (this.ph > 2.3 && this.falling.length === 0) this.dropTopper();
      return;
    }
    if (this.topper) {
      const tp = this.topper;
      tp.vy += G * 0.6 * dt; tp.y = Math.min(this.topY, tp.y + tp.vy * dt);
      if (!tp.landed && tp.y >= this.topY) {
        tp.landed = true; tp.sq = 1;
        sfx('stomp'); snd('cs-squish', 'pancake-plop'); fx.shake(10, 0.25);
        this.wobV += 1.8;
        particles.burst(STAND_X, this.topY, { type: 'confetti', count: 40 });
        tp.lightT = 0.3;
      }
      if (tp.lightT !== undefined && tp.lightT > 0) {
        tp.lightT -= dt;
        if (tp.lightT <= 0) {
          for (const c of this.candles) c.lit = true;
          snd('cs-candle-light', 'magic'); sfx('sparkle');
          const w = this.candleWorld(this.candles[0]);
          particles.burst(STAND_X, w.y, { type: 'sparkle', count: 14, colors: ['#ffd23f', '#ff9f1c', '#ffffff'], speed: [80, 300] });
        }
      }
      tp.sq = Math.max(0, tp.sq - dt * 2.5);
    }
    // finale row
    for (const e of this.ents) {
      // the party (and the gallery): a kid walks along the row and jumps (A at the party, X always:
      // in the gallery A goes on)
      if (this.phase === 'party' && !e.p.isAI) {
        const c = e.p.ctrl, sx = Math.abs(c.x) > 0.2 ? c.x : 0, r = this.rowPos(e), fa = e.fa;
        e.rowDx = clamp((e.rowDx || 0) + sx * 420 * dt, 80 - r.x, W - 80 - r.x);
        if (sx) e.rowFace = sx > 0 ? 1 : -1;
        const hop = celebrateHop(fa, c.pressed('x') || (!this.api.ended?.() && c.pressed('a')), dt);
        fa.z = hop.z;
        if (hop.landed) particles.burst(r.x + e.rowDx, r.y, { type: 'sparkle', count: 4 });
        if (!hop.air) { if (sx) fa.moveAnim(sx * 420, 0, 420); else if (!fa._once) fa.setPose('celebrate'); }
        continue;
      }
      if (this.phase === 'party' && !e.fa._once) e.fa.setPose('celebrate');
      else if (!e.fa._once && this.phase !== 'party') e.fa.setPose('ready');
    }
    if (this.phase === 'cake' && this.ph > 1.3 && this.candles.every((c) => c.lit)) { this.phase = 'blow'; this.ph = 0; this.msg = { text: 'Blow!', t: 0, dur: 1.6, color: '#7fd3ff', big: true }; sfx('whistle', { vol: 0.5 }); }
    if (this.phase === 'blow') {
      for (const e of this.ents) {
        if (!live) break;
        if (e.p.isAI) {
          e.ai.cool -= dt;
          if (e.ai.cool <= 0) { e.p.ctrl.press('a'); e.ai.cool = 1 / (aiProfile(e.p).mashRate * 0.32) * rand(0.8, 1.3); }
        }
        if (e.p.ctrl.pressed('a')) this.blow(e);
      }
      const lit = this.candles.filter((c) => c.lit && !c.target);
      if (this.ph > BREEZE_T && lit.length) {
        // a big magic breeze helps with the last ones
        for (const c of lit) { c.lit = false; this.puffOut(c, null); }
        sfx('whoosh'); fx.shake(6, 0.2);
      }
      if (this.candles.every((c) => !c.lit) && this.gusts.length === 0) this.party();
    }
    // gusts (screen space)
    for (const gu of this.gusts) {
      gu.t += dt;
      if (gu.t >= gu.dur && !gu.hit) {
        gu.hit = true;
        const c = gu.c;
        if (c.lit) { c.lit = false; c.target = false; this.puffOut(c, gu.e); }
      }
    }
    this.gusts = this.gusts.filter((gu) => !gu.hit);
    if (this.phase === 'party' && live && this.ph > 3.2 && !this.finished) this.finish();
  }

  dropTopper() {
    this.phase = 'cake'; this.ph = 0;
    this.topper = { y: this.topY - 900, vy: 0, sq: 0, landed: false };
    const nC = clamp(4 + this.n * 2 + Math.floor(this.ents.reduce((s, e) => s + e.candles, 0) / 2), 6, 16);
    this.candles = [];
    if (art('prop/cupcake-topper-cake')) {
      // The art's lower tier only shows a thin ledge behind the top tier (and
      // its face), so every candle stands on the top tier's icing: a back row
      // and a front row, staggered.
      const nB = Math.floor(nC / 2);
      for (let i = 0; i < nC; i++) {
        const back = i < nB, m = back ? nB : nC - nB, j = back ? i : i - nB, w = back ? 140 : 180;
        this.candles.push({ dx: -w / 2 + (w * (j + 0.5)) / m, dy: back ? -194 : -180, lit: false, col: RAINBOW[i % RAINBOW.length], target: false, sm: 0 });
      }
    }
    else for (let i = 0; i < nC; i++) {
      const tier = i < Math.ceil(nC * 0.45) ? 1 : 0;   // 1 = top tier
      const m = tier ? Math.ceil(nC * 0.45) : nC - Math.ceil(nC * 0.45);
      const j = tier ? i : i - Math.ceil(nC * 0.45);
      const w = tier ? 170 : 270;
      this.candles.push({ dx: -w / 2 + (w * (j + 0.5)) / m, dy: tier ? -205 : -112, lit: false, col: RAINBOW[i % RAINBOW.length], target: false, sm: 0 });
    }
    sfx('whoosh');
    this.msg = { text: 'Birthday cake!', t: 0, dur: 1.8, color: '#ffd23f', big: true };
  }

  candleWorld(c) { return { x: STAND_X + this.swayAt(this.tower.length - 1).dx + c.dx, y: (this.topper ? this.topper.y : this.topY) + c.dy - 34 }; }

  blow(e) {
    e.fa.playOnce('blow', 0.45, 'ready'); e.a.playOnce('blow', 0.45);
    snd('cs-blow', 'candle-blow', { vol: 0.7 * e.vol });
    const lit = this.candles.filter((c) => c.lit && !c.target);
    const from = this.rowPos(e);
    if (!lit.length) { particles.burst(from.x, from.y - 90, { type: 'smoke', count: 2, color: '#ffffff' }); return; }
    // pick the candle nearest this player's spot on screen
    let best = lit[0], bd = 1e9;
    for (const c of lit) { const sp = this.toScreen(this.candleWorld(c)); const d = Math.abs(sp.x - from.x) + rand(0, 200); if (d < bd) { bd = d; best = c; } }
    best.target = true;
    this.gusts.push({ e, c: best, t: 0, dur: 0.32, fx: from.x, fy: from.y - 100 });
  }

  puffOut(c, e) {
    const w = this.candleWorld(c);
    c.sm = 1;
    particles.burst(w.x, w.y - 10, { type: 'smoke', count: 4, color: '#ffffff', speed: [30, 90] });
    particles.burst(w.x, w.y - 10, { type: 'sparkle', count: 3, colors: ['#fff', c.col] });
    sfx('pop', { vol: 0.4 });
    if (e) { e.score += 1; particles.popText(w.x, w.y - 50, '+1', e.p.color, 40); }
  }

  party() {
    this.phase = 'party'; this.ph = 0;
    this.msg = { text: 'Happy Birthday!', t: 0, dur: 3.2, color: '#ff6fb1', big: true };
    snd('jingle/happy-birthday', 'fanfare'); sfx('cheer'); sfx('applause', { vol: 0.6 });
    fx.flash('#ffffff', 0.25); fx.shake(8, 0.3); fx.slowmo && fx.slowmo(0.6, 0.5);
    particles.confettiRain(W, 140);
    for (let k = 0; k < 5; k++) later(() => { const w = { x: STAND_X + rand(-400, 400), y: this.topY - rand(150, 420) }; particles.burst(w.x, w.y, { type: 'star', count: 14, colors: RAINBOW }); sfx('pop', { vol: 0.5 }); }, 200 + k * 330);
    for (const e of this.ents) { e.fa.playOnce('cheer', 0.6, 'celebrate'); voice(e.p.charId, 'woo'); }
  }

  finish() {
    this.finished = true;
    // one shared tower: everybody wins together, the team total is the headline
    const len = this.tower.length;
    this.api.finishTogether({
      title: `${len} cupcake${len === 1 ? '' : 's'} tall!`,
      stats: this.ents.map((e) => `${e.cups} cupcake${e.cups === 1 ? '' : 's'}`),
      focus: { x: STAND_X, y: this.topY - 120, zoom: 1.15 },
    });
  }

  rowPos(e) {
    const n = this.n;
    if (this.api.ended?.()) {
      // gallery ending: stand either side of the tower, clear of the stars bar along the bottom
      const left = Math.ceil(n / 2), side = e.i < left ? -1 : 1, j = side < 0 ? left - 1 - e.i : e.i - left;
      const gap = Math.min(220, 560 / Math.max(1, left - 1));
      return { x: W / 2 + side * (260 + j * gap), y: 890 };
    }
    const gap = Math.min(230, (W - 200) / n);
    return { x: W / 2 + (e.i - (n - 1) / 2) * gap, y: 1050 };
  }

  toScreen(p) {
    if (this.api.camera) return this.api.camera.toScreen(p.x, p.y);
    return p;
  }

  // ------------------------------------------------------------------- draw
  draw(g) {
    this.drawSky(g);
    this.drawGround(g);
    const showWorldActors = this.phase === 'play' || this.phase === 'wow';
    if (showWorldActors) {
      const order = this.ents.slice().sort((a, b) => a.a.y - b.a.y);
      for (const e of order) e.a.draw(g, { ring: e.p.color });
    }
    drawStand(g, STAND_X, GROUND, 1);
    this.drawTower(g);
    for (const f of this.falling) this.drawFalling(g, f);
    if (this.phase === 'play' || this.ph < 2) for (const e of this.ents) this.drawSlider(g, e);
    if (showWorldActors && this.cam.y > GROUND - 700 && !this.api.ended?.()) for (const e of this.ents) ui.playerTag(g, e.p, e.a.x, e.a.y - e.a.height - 26);
  }

  drawHUD(g) {
    // (the clocks are api.limit's, drawn by the play scene)
    // the gallery ending's ribbon sits where the player chips were: the tower count stays
    if (!this.api.ended?.()) ui.scoreboard(g, this.players, this.ents.map(() => ''), { y: 18, avoidCenter: this.phase === 'play', format: (v) => v });
    // shared tower counter: the team's score (right side, below the player chips)
    const len = this.tower.length;
    g.save(); g.translate(W - 130, 200);
    ui.panel(g, -100, -56, 200, 112, { r: 40, fill: '#ffffff' });
    g.save(); g.translate(-46, 26); g.scale(0.5, 0.5); drawCupcake(g, 'pink', '#ff8fc7', { happy: true, t: this.t }); g.restore();
    ui.text(g, String(len), 38, 4, { size: 60, color: NAVY, stroke: false, weight: 800 });
    g.restore();
    // finale row of characters blowing
    if (this.phase === 'cake' || this.phase === 'blow' || this.phase === 'party') {
      g.save(); const grd = g.createLinearGradient(0, 860, 0, H); grd.addColorStop(0, 'rgba(126,214,138,0)'); grd.addColorStop(1, 'rgba(126,214,138,0.95)');
      g.fillStyle = grd; g.fillRect(0, 860, W, 220); g.restore();
      for (const e of this.ents) {
        const r = this.rowPos(e);
        e.fa.x = r.x + (e.rowDx || 0); e.fa.y = r.y; e.fa.facing = e.rowFace || (r.x < W / 2 ? 1 : -1);
        e.fa.draw(g, { ring: e.p.color });
      }
      for (const gu of this.gusts) this.drawGust(g, gu);
      if (this.phase === 'blow') {
        const pulse = 1 + Math.sin(this.t * 10) * 0.08;
        g.save(); g.translate(W / 2, 800); g.scale(pulse, pulse);
        ui.glyph(g, 'a', -70, 0, 76);
        drawPuffIcon(g, 40, 0, this.t);
        g.restore();
      }
    }
    // pointing arrows for players whose fairy is over the tower (early game helper)
    if (this.msg) {
      const m = this.msg, k = m.t / m.dur;
      const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      const sc = (m.big ? 1 : 0.8) * (1 + (k < 0.15 ? (1 - k / 0.15) * 0.5 : 0));
      g.save(); g.globalAlpha = clamp(a, 0, 1); g.translate(W / 2, 330); g.scale(sc, sc); g.rotate(Math.sin(this.t * 5) * 0.03);
      ui.text(g, m.text, 0, 0, { size: m.big ? 120 : 80, color: m.color, weight: 800, strokeWidth: 12 });
      g.restore();
    }
  }

  drawGust(g, gu) {
    const c = this.toScreen(this.candleWorld(gu.c));
    const k = clamp(gu.t / gu.dur, 0, 1);
    const x = lerp(gu.fx, c.x, k), y = lerp(gu.fy, c.y, k) - Math.sin(k * Math.PI) * 60;
    g.save(); g.globalAlpha = 0.85; g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round';
    const ang = Math.atan2(c.y - gu.fy, c.x - gu.fx);
    g.translate(x, y); g.rotate(ang);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-i * 26, (i - 1) * 14, 18, -1.2, 1.2); g.stroke(); }
    g.fillStyle = gu.e.p.color; g.beginPath(); g.arc(8, 0, 9, 0, TAU); g.fill();
    g.restore();
  }

  drawTower(g) {
    const len = this.tower.length;
    for (let i = 0; i < len; i++) {
      const it = this.tower[i];
      const sw = this.swayAt(i);
      const y = STAND_TOP - i * CUP_H;
      g.save(); g.translate(it.x + sw.dx, y); g.rotate(it.rot * (1 - Math.min(1, it.age * 0.4)) + sw.rot);
      const sq = it.sq * 0.28;
      g.scale(1 + sq, 1 - sq);
      drawCupcakeArt(g, it.col, it.wrap, { happy: this.giggleT > 0 || it.age < 0.5 || this.phase === 'party', giggle: this.giggleT > 0, t: this.t + i, gold: it.kind === 'gold', seed: i });
      for (const tp of it.tops) this.drawTop(g, tp);
      g.restore();
    }
    if (this.topper) {
      const sw = this.swayAt(len - 1);
      const tp = this.topper;
      g.save(); g.translate(STAND_X + sw.dx, tp.y); g.rotate(sw.rot); g.scale(1 + tp.sq * 0.25, 1 - tp.sq * 0.25);
      if (!drawArt(g, 'prop/cupcake-topper-cake', 0, 0, 380, 300, { anchor: 'bottom' })) drawTopperCake(g, this.t, this.phase === 'party');
      for (const c of this.candles) {
        drawCandle(g, c.dx, c.dy, 0, c.lit, this.t + c.dx, c.col, 1.3);
        if (!c.lit && c.sm > 0) { c.sm = Math.max(0, c.sm - 0.01); }
      }
      g.restore();
    }
  }

  drawTop(g, tp) {
    const s = 1 + tp.pop * 0.4;
    const x = tp.side * (18 + tp.spot * 40), y = -84 + Math.abs(x) * 0.18;
    if (tp.kind === 'cherry') { g.save(); g.translate(x, y); g.scale(s, s); drawCherry(g, 0, 0, tp.ang); g.restore(); }
    else drawCandle(g, x, y + 6, tp.ang, tp.lit, this.t + tp.side, tp.col, s);
  }

  drawFalling(g, f) {
    g.save(); g.translate(f.x, f.y); g.rotate(f.rot);
    if (f.kind === 'cherry') drawCherry(g, 0, 0, 0);
    else if (f.kind === 'candle') drawCandle(g, 0, 0, 0, true, this.t, f.col);
    else drawCupcakeArt(g, f.col, f.wrap, { t: this.t, gold: f.kind === 'gold', wow: true });
    g.restore();
  }

  drawSlider(g, e) {
    const s = e.s, t = this.t;
    const fyY = s.y - 128;
    const dir = Math.cos(s.phase) >= 0 ? 1 : -1;
    const alpha = this.phase === 'play' ? 1 : clamp(1 - this.ph / 1.5, 0, 1);
    g.save(); g.globalAlpha = alpha;
    // glow ring in the player's colour
    g.save(); g.globalAlpha = alpha * 0.35; g.fillStyle = e.p.color;
    g.beginPath(); g.arc(s.x, fyY, 44, 0, TAU); g.fill(); g.restore();
    // drop guide + down arrow when lined up
    if (s.item && this.phase === 'play') {
      const over = Math.abs(s.x - this.topX) < (this.easy && !e.p.isAI ? 40 : 30);
      g.save(); g.globalAlpha = alpha * (over ? 0.8 : 0.3); g.strokeStyle = over ? '#ffffff' : e.p.color; g.lineWidth = 5; g.setLineDash([10, 14]); g.lineDashOffset = -t * 60;
      g.beginPath(); g.moveTo(s.x, s.y + 10); g.lineTo(s.x, this.topY - 90); g.stroke(); g.restore();
      if (over) {
        g.save(); g.translate(s.x, s.y + 40 + Math.abs(Math.sin(t * 10)) * 14); g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 4;
        g.beginPath(); g.moveTo(-18, 0); g.lineTo(18, 0); g.lineTo(0, 22); g.closePath(); g.fill(); g.stroke(); g.restore();
        if (this.easy && !e.p.isAI) easyPrompt(g, e.p, { target: { x: s.x, y: s.y }, child: { x: s.x, y: fyY - 30 } });
      }
      const ps = 1 + s.pop * 0.5;
      g.save(); g.translate(s.x, s.y); g.scale(ps, ps); g.rotate(Math.sin(t * 6 + e.i) * 0.06);
      if (s.item.kind === 'cherry') drawCherry(g, 0, -8, 0);
      else if (s.item.kind === 'candle') drawCandle(g, 0, 0, 0, true, t, s.item.col);
      else drawCupcakeArt(g, s.item.col, s.item.wrap, { t, gold: s.item.kind === 'gold', happy: true });
      g.restore();
    }
    // the fairy
    const flip = s.flip > 0 ? Math.sin((1 - s.flip) * Math.PI) * 0.5 : 0;
    if (!drawNpcSprite(g, 'garden-fairy-' + s.fairy, s.x, fyY + 30, 70, t + e.i, { pose: 'fly', facing: dir, rotation: flip * dir, alpha })) {
      drawFairyProc(g, s.x, fyY, 1.25, s.fairy, t + e.i, dir, flip);
    }
    ui.playerTag(g, e.p, s.x, fyY - 52);
    g.restore();
  }

  drawSky(g) {
    const cam = this.api.camera;
    const tl = cam ? cam.toWorld(0, 0) : { x: 0, y: 0 }, br = cam ? cam.toWorld(W, H) : { x: W, y: H };
    const y0 = tl.y, y1 = br.y;
    const gr = g.createLinearGradient(0, y0, 0, y1);
    for (let k = 0; k <= 4; k++) { const yy = lerp(y0, y1, k / 4); gr.addColorStop(k / 4, skyColor(yy)); }
    g.fillStyle = gr; g.fillRect(tl.x - 10, y0 - 10, br.x - tl.x + 20, y1 - y0 + 20);
    // stars high up
    if (y0 < -4200) {
      const cs = 260;
      for (let cy = Math.floor(y0 / cs); cy <= Math.min(-17, Math.ceil(y1 / cs)); cy++) {
        for (let cx = Math.floor(tl.x / cs); cx <= Math.ceil(br.x / cs); cx++) {
          const h1 = hash(cx * 31.7 + cy * 7.3), wy = cy * cs + hash(cx + cy * 3.1) * cs;
          const a = clamp((-4200 - wy) / 2500, 0, 1) * (0.5 + 0.5 * Math.sin(this.t * 2 + h1 * 9));
          if (a <= 0.02) continue;
          g.save(); g.globalAlpha = a; g.translate(cx * cs + h1 * cs, wy); drawSparkleShape(g, 10 + h1 * 14, '#fff6c8'); g.restore();
        }
      }
    }
    // moon
    if (y1 > -9800 && y0 < -8200) { g.save(); g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(1500, -9000, 120, 0, TAU); g.fill(); g.fillStyle = skyColor(-9000); g.beginPath(); g.arc(1450, -9030, 105, 0, TAU); g.fill(); g.restore(); }
    // rainbow
    if (y1 > -3400 && y0 < -1400) {
      g.save(); g.globalAlpha = 0.55; g.lineWidth = 46;
      ['#ff6f91', '#ffb86f', '#ffe66f', '#8be8b8', '#7fd3ff', '#c9a0ff'].forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(W / 2, -1500, 1100 - i * 46, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); });
      g.restore();
    }
    // clouds by altitude band
    for (let k = Math.max(0, Math.floor((-y1 - 200) / 380)); k <= Math.floor((-y0 + 300) / 380); k++) {
      const wy = -200 - k * 380, hx = hash(k * 13.1);
      if (wy < -6500) continue;
      const x = ((hx * 2600 + this.t * (12 + hx * 20)) % 2800) - 440;
      ui.cloud(g, x, wy, 1 + hx * 0.8, '#ffffff', 0.85);
      if (k % 3 === 1) drawBalloon(g, ((hash(k + 5) * 2200 + this.t * 30) % 2400) - 240, wy - 120 + Math.sin(this.t + k) * 20, RAINBOW[k % 7]);
    }
    // ambient sparkles near the ground
    g.save();
    for (const s of this.sparkles) {
      const a = 0.5 + 0.5 * Math.sin(this.t * 2 + s.p);
      g.globalAlpha = a * 0.4; g.save(); g.translate(s.x, (s.y - this.t * 18) % 800 + 50); drawSparkleShape(g, 18 * s.s, '#ffffff'); g.restore();
    }
    g.restore();
  }

  drawGround(g) {
    const cam = this.api.camera;
    const tl = cam ? cam.toWorld(0, 0) : { x: 0 }, br = cam ? cam.toWorld(W, H) : { x: W, y: H };
    if (br.y < 0) return;
    const bg = art('bg/cupcake-stack');
    if (bg) {
      // Zoomed out (z < 1) the view is wider than the plate: alternate mirrored
      // copies continue the trees, fence and lawn without a hard edge.
      const k0 = Math.floor(tl.x / W), k1 = Math.floor(br.x / W);
      for (let k = k0; k <= k1; k++) {
        if (k % 2 === 0) { g.drawImage(bg, k * W, 0, W, H); continue; }
        g.save(); g.translate((k + 1) * W, 0); g.scale(-1, 1); g.drawImage(bg, 0, 0, W, H); g.restore();
      }
      const x0 = k0 * W, x1 = (k1 + 1) * W;
      // The climbing sky behind this ground-level plate is #8fd6ff. Blend the
      // background's top edge into that exact continuation colour so the seam
      // stays invisible as the camera rises past y=0.
      const topBlend = g.createLinearGradient(0, 0, 0, 72);
      topBlend.addColorStop(0, '#8fd6ff');
      topBlend.addColorStop(1, 'rgba(143,214,255,0)');
      g.fillStyle = topBlend; g.fillRect(x0, 0, x1 - x0, 72);
      if (br.y > H) { g.fillStyle = '#6cc77a'; g.fillRect(tl.x, H, br.x - tl.x, br.y - H); }
      return;
    }
    // hills
    g.fillStyle = '#b8ecc4';
    g.beginPath(); g.moveTo(tl.x - 10, 800);
    for (let x = tl.x - 10; x <= br.x + 20; x += 40) g.lineTo(x, 760 - Math.sin(x * 0.004 + 1) * 40);
    g.lineTo(br.x + 20, 905); g.lineTo(tl.x - 10, 905); g.fill();
    // bunting trees left/right
    drawTree(g, 150, 905); drawTree(g, W - 150, 905);
    g.save(); g.lineWidth = 4; g.strokeStyle = NAVY;
    for (const [x0, x1] of [[150, 700], [W - 700, W - 150]]) {
      g.beginPath(); g.moveTo(x0, 520); g.quadraticCurveTo((x0 + x1) / 2, 600, x1, 520); g.stroke();
      for (let i = 1; i < 9; i++) {
        const k = i / 9, x = lerp(x0, x1, k), y = 520 + Math.sin(k * Math.PI) * 40 + Math.sin(this.t * 2 + i) * 2;
        g.fillStyle = RAINBOW[i % 7]; g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.lineTo(x, y + 36); g.closePath(); g.fill(); g.stroke();
      }
    }
    g.restore();
    // picket fence
    g.fillStyle = '#fff6fb'; g.strokeStyle = 'rgba(36,22,63,0.6)'; g.lineWidth = 3;
    for (let x = Math.floor(tl.x / 46) * 46; x < br.x; x += 46) {
      g.beginPath(); g.moveTo(x, 905); g.lineTo(x, 840); g.lineTo(x + 15, 822); g.lineTo(x + 30, 840); g.lineTo(x + 30, 905); g.closePath(); g.fill(); g.stroke();
    }
    g.fillRect(tl.x, 852, br.x - tl.x, 14);
    // balloons on the fence
    for (let i = 0; i < 6; i++) { const x = [260, 470, 700, 1220, 1450, 1680][i]; drawBalloon(g, x, 760 + Math.sin(this.t * 1.5 + i) * 8, RAINBOW[(i * 2) % 7], 845); }
    // lawn
    g.fillStyle = '#7ed68a'; g.fillRect(tl.x - 10, 900, br.x - tl.x + 20, Math.max(0, br.y - 900) + 10);
    g.fillStyle = '#6cc77a';
    for (let x = Math.floor(tl.x / 120) * 120; x < br.x; x += 120) g.fillRect(x, 900, 60, Math.max(0, br.y - 900) + 10);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i++) { const x = (i * 293) % W, y = 960 + ((i * 71) % 100); g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
  }
}

// ------------------------------------------------------------- drawing kit

function skyColor(y) {
  const K = [[900, '#bfe8ff'], [0, '#8fd6ff'], [-2200, '#a9c8ff'], [-3800, '#ffb3d9'], [-5600, '#b48cff'], [-8000, '#3b2a7a'], [-11000, '#1a1240']];
  if (y >= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) {
    const [ya, ca] = K[i], [yb, cb] = K[i + 1];
    if (y <= ya && y >= yb) return mix(ca, cb, (ya - y) / (ya - yb));
  }
  return K[K.length - 1][1];
}
function mix(a, b, k) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}

function drawTree(g, x, y) {
  g.save(); g.translate(x, y); g.lineWidth = 4; g.strokeStyle = NAVY;
  g.fillStyle = '#a8734a'; ui.roundRect(g, -20, -360, 40, 360, 12); g.fill(); g.stroke();
  g.fillStyle = '#5fc46e';
  for (const [dx, dy, r] of [[-80, -380, 90], [70, -400, 95], [0, -470, 110], [-20, -330, 80], [40, -330, 70]]) { g.beginPath(); g.arc(dx, dy, r, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = '#ff6f91'; for (const [dx, dy] of [[-60, -420], [50, -460], [90, -360], [-100, -340], [10, -520]]) { g.beginPath(); g.arc(dx, dy, 9, 0, TAU); g.fill(); }
  g.restore();
}

function drawBalloon(g, x, y, col, tieY = null) {
  g.save(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(36,22,63,0.7)';
  g.beginPath(); g.moveTo(x, y + 44); g.quadraticCurveTo(x + 10, y + 80, x, tieY ?? y + 120); g.stroke();
  g.fillStyle = col; g.strokeStyle = NAVY; g.lineWidth = 3.5;
  g.beginPath(); g.ellipse(x, y, 32, 40, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x - 11, y - 14, 7, 12, -0.4, 0, TAU); g.fill();
  g.restore();
}

/** Cake stand, origin = foot centre on the ground. s = scale. */
function drawStand(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  // This game needs the broad scalloped stand. Keep the shared prop/cake-stand
  // key untouched for other consumers; its Molly-specific sibling is framed
  // with the plate surface at the existing STAND_TOP world coordinate.
  if (drawArt(g, 'prop/cupcake-stack-cake-stand', 0, 0, 560, 280, { anchor: 'bottom' })) { g.restore(); return; }
  g.lineWidth = 6; g.strokeStyle = NAVY; g.lineJoin = 'round';
  g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(0, 4, 180, 22, 0, 0, TAU); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(0, -16, 140, 26, 0, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-40, -30); g.quadraticCurveTo(-26, -120, -60, -200); g.lineTo(60, -200); g.quadraticCurveTo(26, -120, 40, -30); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd1e8'; g.beginPath(); g.ellipse(0, -110, 34, 12, 0, 0, TAU); g.fill(); g.stroke();
  // plate with scallops
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(0, -214, 270, 34, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ff9ccf';
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.arc(i * 42, -192 + Math.abs(i) * 1.2, 18, 0, Math.PI); g.fill(); g.stroke(); }
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -224, 250, 22, 0, 0, TAU); g.fill();
  g.restore();
}

function drawCupcakeArt(g, col, wrap, o = {}) {
  const key = 'prop/cupcake-' + (o.gold ? 'gold' : col);
  if (o.gold) glowAt(g, 0, -44, 100, o.t || 0);
  if (drawArt(g, key, 0, -44, 130, 114)) return;
  drawCupcake(g, o.gold ? 'gold' : col, wrap || '#e8a81c', o);
}

function glowAt(g, x, y, r, t) {
  const k = 0.75 + Math.sin(t * 6) * 0.15;
  const gr = g.createRadialGradient(x, y, 8, x, y, r);
  gr.addColorStop(0, `rgba(255,236,120,${0.75 * k})`); gr.addColorStop(1, 'rgba(255,236,120,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

/** Procedural cupcake, origin bottom centre, ~130 wide, ~92 tall. */
function drawCupcake(g, col, wrap, o = {}) {
  const [f1, f2] = FROST[col] || FROST.pink;
  const t = o.t || 0;
  g.lineJoin = 'round'; g.lineWidth = 4.5; g.strokeStyle = NAVY;
  // wrapper
  g.beginPath(); g.moveTo(-58, -46); g.lineTo(58, -46); g.lineTo(46, 0); g.lineTo(-46, 0); g.closePath();
  g.fillStyle = wrap; g.fill(); g.stroke();
  g.save(); g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 5;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 17, -46); g.lineTo(i * 14, 0); g.stroke(); }
  g.restore();
  // frosting
  g.strokeStyle = NAVY; g.lineWidth = 4.5;
  const tiers = [[66, 18, -50], [52, 16, -66], [34, 14, -80]];
  tiers.forEach(([rx, ry, y], i) => { g.beginPath(); g.ellipse(0, y, rx, ry, 0, 0, TAU); g.fillStyle = i % 2 ? f2 : f1; g.fill(); g.stroke(); });
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-16, -84, 10, 5, -0.4, 0, TAU); g.fill();
  if (col === 'gold') { g.save(); g.translate(0, -100); g.rotate(t * 2); drawSparkleShape(g, 30, '#ffffff'); g.restore(); }
  // sprinkles
  const sc = ['#ff4d8d', '#3fa7ff', '#36d17a', '#ffd23f', '#ffffff'];
  for (let i = 0; i < 7; i++) { g.save(); g.translate(-44 + i * 15, -54 - ((i * 7) % 4) * 5); g.rotate(i * 1.3); g.fillStyle = sc[(i + (o.seed || 0)) % 5]; ui.roundRect(g, -6, -2, 12, 4, 2); g.fill(); g.restore(); }
  // face on the wrapper
  const ey = -26;
  g.fillStyle = NAVY; g.strokeStyle = NAVY; g.lineWidth = 3.5; g.lineCap = 'round';
  if (o.giggle || o.happy) {
    g.beginPath(); g.arc(-17, ey + 2, 6, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(23, ey + 2); g.arc(17, ey + 2, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  } else if (o.wow) {
    g.beginPath(); g.arc(-17, ey, 5, 0, TAU); g.arc(17, ey, 5, 0, TAU); g.fill();
  } else {
    const blink = Math.sin(t * 1.3) > 0.97 ? 0.2 : 1;
    g.beginPath(); g.ellipse(-17, ey, 4.5, 6 * blink, 0, 0, TAU); g.ellipse(17, ey, 4.5, 6 * blink, 0, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,111,177,0.55)'; g.beginPath(); g.ellipse(-30, ey + 10, 7, 4, 0, 0, TAU); g.ellipse(30, ey + 10, 7, 4, 0, 0, TAU); g.fill();
  g.beginPath();
  if (o.giggle) { g.fillStyle = '#ff6f91'; g.ellipse(0, ey + 12, 8, 6 + Math.abs(Math.sin(t * 18)) * 3, 0, 0, TAU); g.fill(); g.stroke(); }
  else if (o.wow) { g.fillStyle = '#ff6f91'; g.ellipse(0, ey + 13, 5, 6, 0, 0, TAU); g.fill(); g.stroke(); }
  else { g.arc(0, ey + 6, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
}

function drawCherry(g, x, y, ang) {
  g.save(); g.translate(x, y); g.rotate(ang);
  if (drawArt(g, 'prop/cupcake-cherry', 0, -23, 46, 46)) { g.restore(); return; }
  g.lineWidth = 3.5; g.strokeStyle = '#2e8b3e'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(6, -36, 16, -40); g.stroke();
  g.fillStyle = '#ff2d55'; g.strokeStyle = NAVY; g.lineWidth = 3.5;
  g.beginPath(); g.arc(0, -10, 15, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-5, -15, 4, 6, -0.5, 0, TAU); g.fill();
  g.restore();
}

function drawCandle(g, x, y, ang, lit, t, col = '#7fd3ff', s = 1) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
  if (!drawArt(g, 'prop/cupcake-candle', 0, 0, 26, 78, { anchor: 'bottom' })) {
    g.fillStyle = col; g.strokeStyle = NAVY; g.lineWidth = 3.5;
    ui.roundRect(g, -10, -70, 20, 72, 6); g.fill(); g.stroke();
    g.save(); g.beginPath(); ui.roundRect(g, -10, -70, 20, 72, 6); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 5;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-12, -64 + i * 14); g.lineTo(12, -74 + i * 14); g.stroke(); }
    g.restore();
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -70); g.lineTo(0, -80); g.stroke();
  }
  if (lit) {
    const fl = 1 + Math.sin(t * 14) * 0.12;
    g.save(); g.translate(Math.sin(t * 9) * 1.5, -78); g.rotate(-ang * 0.8); g.scale(fl, fl);
    if (!drawArt(g, 'prop/cupcake-stack-candle-flame', 0, 0, 30, 40, { anchor: 'bottom' })) {
      const gr = g.createRadialGradient(0, -14, 2, 0, -14, 34); gr.addColorStop(0, 'rgba(255,230,120,0.6)'); gr.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, -14, 34, 0, TAU); g.fill();
      g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(0, -36); g.quadraticCurveTo(15, -12, 0, 2); g.quadraticCurveTo(-15, -12, 0, -36); g.fill();
      g.fillStyle = '#ffe066'; g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(8, -9, 0, 0); g.quadraticCurveTo(-8, -9, 0, -24); g.fill();
    }
    g.restore();
  }
  g.restore();
}

/** Finale birthday cake topper, origin bottom centre (~360 wide, 220 tall). */
function drawTopperCake(g, t, party) {
  g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = NAVY;
  ui.roundRect(g, -170, -112, 340, 112, 26); g.fillStyle = '#ff9ccf'; g.fill(); g.stroke();
  ui.roundRect(g, -110, -205, 220, 98, 24); g.fillStyle = '#fff3d6'; g.fill(); g.stroke();
  g.fillStyle = '#ffffff';
  const drip = (x0, x1, y0) => { for (let dx = x0; dx < x1; dx += 36) { const len = 14 + ((dx * 7) % 20); g.beginPath(); g.moveTo(dx, y0); g.lineTo(dx + 28, y0); g.lineTo(dx + 28, y0 + len); g.arc(dx + 14, y0 + len, 14, 0, Math.PI); g.lineTo(dx, y0); g.fill(); } };
  drip(-166, 140, -110); drip(-106, 90, -203);
  const cols = ['#ff4d8d', '#ffd23f', '#3fa7ff', '#36d17a'];
  for (let i = 0; i < 16; i++) { g.save(); g.translate(-150 + ((i * 53) % 300), -40 + ((i * 29) % 40)); g.rotate(i * 1.1); g.fillStyle = cols[i % 4]; g.fillRect(-7, -2.5, 14, 5); g.restore(); }
  // face
  const ey = -156;
  g.fillStyle = NAVY;
  if (party) { g.lineWidth = 5; g.beginPath(); g.arc(-36, ey + 4, 9, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(45, ey + 4); g.arc(36, ey + 4, 9, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else { g.beginPath(); g.ellipse(-36, ey, 8, 11, 0, 0, TAU); g.ellipse(36, ey, 8, 11, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,111,177,0.5)'; g.beginPath(); g.ellipse(-62, ey + 18, 12, 7, 0, 0, TAU); g.ellipse(62, ey + 18, 12, 7, 0, 0, TAU); g.fill();
  g.lineWidth = 5; g.beginPath(); g.arc(0, ey + 10, 16, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
}

function drawPuffIcon(g, x, y, t) {
  g.save(); g.translate(x, y); g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const o = ((t * 2 + i / 3) % 1) * 30; g.globalAlpha = 1 - o / 30; g.beginPath(); g.arc(10 + o + i * 20, 0, 22, -1.1, 1.1); g.stroke(); }
  g.restore();
}

/** Procedural garden fairy (fallback when the NPC sprite set isn't loaded). */
function drawFairyProc(g, x, y, s, variant, t, dir = 1, rot = 0) {
  const c = FAIRY_COL[variant] || '#ff73b5';
  g.save(); g.translate(x, y); g.scale(s * dir, s); g.rotate(rot);
  const flap = Math.sin(t * 30) * 0.45;
  g.lineJoin = 'round';
  for (const [ang, w, h2] of [[-0.9, 26, 13], [-0.1, 20, 10]]) {
    for (const side of [0, 1]) {
      g.save(); g.translate(-3, -4); g.rotate(ang + (side ? flap : flap * 0.8) - 0.2 + side * 0.15);
      g.globalAlpha = 0.8; g.fillStyle = 'rgba(255,255,255,0.85)'; g.strokeStyle = c; g.lineWidth = 2.2;
      g.beginPath(); g.ellipse(-w * 0.55, -h2 * 0.2, w, h2, 0, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
  }
  g.fillStyle = c; g.strokeStyle = NAVY; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(-5, -3); g.lineTo(6, -3); g.lineTo(11, 15); g.quadraticCurveTo(0, 20, -10, 15); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-3, 16); g.lineTo(-4, 24); g.moveTo(4, 16); g.lineTo(5, 24); g.stroke();
  g.beginPath(); g.moveTo(-6, 2); g.lineTo(-4, 22); g.moveTo(6, 2); g.lineTo(4, 22); g.stroke();   // arms down holding the cupcake
  g.fillStyle = c; g.beginPath(); g.arc(0, -13, 11, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#ffe3cf'; g.beginPath(); g.arc(1, -11, 8.4, 0, TAU); g.fill();
  g.fillStyle = c; g.beginPath(); g.arc(0, -17, 9.5, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  g.fillStyle = NAVY; g.beginPath(); g.arc(4, -11, 1.6, 0, TAU); g.arc(-1, -11, 1.6, 0, TAU); g.fill();
  g.fillStyle = '#ff8fb0'; g.beginPath(); g.arc(6, -8, 1.8, 0, TAU); g.fill();
  g.restore();
}
