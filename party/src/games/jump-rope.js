// Jump Rope Jamboree - timing survival. Two bunnies turn a giant candy-striped
// jump rope; everyone stands in a row in the middle and presses A to hop as
// the rope sweeps under their feet. Getting caught costs a heart (3 hearts);
// out players sit on the picnic blanket and cheer. The rope speeds up and does
// tricks (Double Dutch, a sneaky slow-down, a speed burst, golden ropes).
// Last one jumping wins; survivors at the bell are ranked by hearts left.
//
// The rope is a real 3D loop around the axis between the bunnies' paws:
// theta = 0 overhead, PI/2 in front, PI under the feet, 3PI/2 behind. A point
// at height h and depth w is drawn at y = GROUND - h + K * w, so the rope
// sweeps over the heads, down in front, along the ground under the feet and
// back up behind. Its speed is locked to the music's beat when it can be.
import { W, H } from '../engine/canvas.js';
import { Actor, drawSpeech } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, music, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { drawHeartShape } from '../engine/emotes.js';
import { clamp, lerp, damp, rand, pick, chance, TAU, ease, placementsFromScores } from '../engine/util.js';
import {
  NAVY, BUNNIES, ROPE_COLORS, GOLD_ROPE, drawBunny, drawHandle, strokeRope, ghostRope,
  buildBackground, drawClouds, drawThumb,
} from './jump-rope/art.js';

const DURATION = 50;
const HEARTS = 3;
const GROUND = 790;          // screen y of the ground line at depth 0
const K = 0.55;              // depth -> screen y
const AXIS_H = 175;          // paw height above the ground (rope axis)
const HAND_R = 24;           // paws turn in a small circle
const HLX = 330, HRX = 1590; // paw x (rope ends)
const BUNNY_X = [150, 1770];
const EXP = 0.45;            // rope bulge profile: sin(PI s)^EXP (boxy, so the middle all reaches the ground)
const JT = 0.48;             // jump air time (s)
const HJ = 118;              // jump apex (px)
const LAG = 0.1;             // landing recovery before the next hop
const GRACE = 0.08;          // a hop this late still clears ("Phew!")
const CLEAR = 8;             // feet must be this far above the rope
const IDEAL = JT * 0.5;      // press this long before the rope arrives: apex over the rope
const BPM_FALLBACK = 128;
const BLANKET = { x0: 500, y0: 948, x1: 1420, y1: 1068 };

// CPU timing by level (Easy, Normal, Hard): spread of the press time, chance
// to daydream through a pass, and how fast they notice the rope changing speed.
const AI_SIGMA = [0.1, 0.07, 0.045];
const AI_LAPSE = [0.02, 0.008, 0.003];
const AI_ADAPT = [0.85, 0.45, 0.2];

// The show: rope speed in beats per turn (synced to the 128 bpm 'bouncy' song).
const SCRIPT = [
  { t: 0, bpr: 3, rate: 2.5 },
  { t: 8, bpr: 2, rate: 2.2, label: 'Faster!', say: 'Faster!' },
  { t: 14.5, gold: true },
  { t: 18, bpr: 4, rate: 2.5, dd: true, label: 'Double Dutch!', say: 'Two ropes!' },
  { t: 27, bpr: 2, rate: 2.2, dd: false, label: 'One rope!' },
  { t: 29.5, bpr: 6, rate: 5, slow: true, label: 'Sloooow...', say: 'Sooo sleepy...' },
  { t: 34, bpr: 2, rate: 5, label: 'Gotcha!', say: 'Gotcha!', snap: true },
  { t: 36.5, gold: true },
  { t: 38.5, bpr: 1.5, rate: 3, burst: true, label: 'Super Speed!', say: 'Wheee!' },
  { t: 44, bpr: 2, rate: 3, label: 'Last stretch!' },
];

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const wrap = (a) => ((a % TAU) + TAU) % TAU;
const wrapPi = (a) => { a = wrap(a); return a > Math.PI ? a - TAU : a; };
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
const rhoAt = (s, R) => HAND_R + R * Math.pow(Math.max(0, Math.sin(Math.PI * clamp(s, 0, 1))), EXP);

export const meta = {
  id: 'jump-rope',
  title: 'Jump Rope Jamboree',
  category: 'party',
  type: 'Survival',
  goal: 'Hop over the giant jump rope - last one jumping wins!',
  controls: [['a', 'Jump']],
  tips: [
    'Jump when the shrinking circle meets your ring and the rope shadow reaches your feet!',
    'Getting tangled costs a heart. Lose all 3 and you cheer from the blanket.',
    'Watch out for tricks: Double Dutch, a sneaky slow-down and Super Speed! Golden ropes give a heart back.',
  ],
  music: 'bouncy',
  duration: '50 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) { drawThumb(g, x, y, w, h, t); },
};

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.pre = 0;
    this.over = false; this.endAt = -1;
    this.rows = n >= 5 ? 2 : 1;
    this.R = this.rows === 2 ? 245 : 215;
    this.bpm = BPM_FALLBACK;
    this.ropes = [
      { th: 1.55 * Math.PI, w: 0, dir: 1, alpha: 1, active: true, gold: false, goldNext: false, ending: false },
      { th: 0, w: 0, dir: -1, alpha: 0, active: false, gold: false, ending: false, pending: false },
    ];
    this.seg = { bpr: 3, rate: 2.5 };
    this.wTarget = 0;
    this.scriptI = 0;
    this.banner = null;
    this.tutorial = 3;            // show "JUMP!" for the first passes
    this.practice = 3;            // the first two passes are free (counted down at each slap, judged just after)
    this.cueText = null;
    this.burst = false; this.slow = false;
    this.lastBeat = -1; this.beatOk = false;
    this.outGroups = 0; this.lastOutT = -10;
    this.punchT = -10;
    this.bunnies = [0, 1].map((i) => ({ pal: BUNNIES[i], x: BUNNY_X[i], facing: i ? -1 : 1, mood: 'happy', moodT: 0, say: null }));
    this.bg = buildBackground(GROUND, BLANKET);
    this.bgArt = !!art('bg/jump-rope');
    this.units = this.players.map((p, i) => this.makeUnit(p, i));
    this.slap = 0;                // ground-slap flash
    this.lineSeed = Array.from({ length: 10 }, (_, i) => ({ y: 360 + i * 55, x: Math.random() * W, l: rand(120, 260) }));
    try { music.preload('bouncy'); } catch (e) { /* optional */ }
  }

  // --- setup -------------------------------------------------------------------
  makeUnit(p, i) {
    const n = this.n;
    let x, depth, row, sameRow;
    if (this.rows === 1) {
      const step = [0, 0, 330, 300, 270][n] || 270;
      x = 960 + (i - (n - 1) / 2) * step; depth = 0; row = 0; sameRow = step || 400;
    } else {
      const step = 130;
      x = 960 + (i - (n - 1) / 2) * step;
      row = i % 2 === 0 ? 1 : 0;      // 1 = front row
      depth = row ? 100 : -100; sameRow = step * 2;
    }
    const y = GROUND + K * depth;
    const base = this.rows === 2 ? 0.78 : n <= 2 ? 1.05 : n === 3 ? 1.0 : 0.92;
    const a = new Actor(p, { scale: base, x, y });
    const w1 = a.width / a.scale;
    a.scale = Math.min(base, (sameRow * 0.86) / Math.max(1, w1));
    a.facing = x <= 960 ? 1 : -1;
    a.snap();
    const s = (x - HLX) / (HRX - HLX);
    const rho = rhoAt(s, this.R);
    const thc = Math.PI - Math.asin(clamp(depth / rho, -0.95, 0.95));
    const hc = Math.max(0, AXIS_H + rho * Math.cos(thc));
    return {
      p, i, a, x, y, depth, row, homeX: x, homeY: y, rho, thc, hc,
      hearts: HEARTS, jumps: 0, streak: 0, alive: true, state: 'play', outGroup: 0, outT: 0,
      z: 0, jt: -1, lag: 0, buffer: 0, tangled: 0, immune: 0, pending: null, prevA: [null, null], cross: [0, 0],
      chipBump: 0, heartFlash: 0, tagT: 0, coil: 0,
      ai: { percW: 0, key: -1, target: IDEAL, skip: false, pressed: false, delay: -1 },
      seat: null, walk: null, cheerT: rand(1, 3),
    };
  }

  // --- rope geometry -----------------------------------------------------------
  /** Paw position (screen) for rope r at end e (0 left, 1 right). */
  handPos(ri, e) {
    const r = this.ropes[ri], th = r.th;
    const off = ri === 1 ? (e ? 26 : -26) : 0;
    const x = (e ? HRX : HLX) + off;
    const h = AXIS_H + HAND_R * Math.cos(th), w = HAND_R * Math.sin(th);
    return { x, y: GROUND - h + K * w, w };
  }

  ropePoints(ri, th = this.ropes[ri].th) {
    const pts = [];
    const N = 44, off = ri === 1 ? 26 : 0;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const x = lerp(HLX - off, HRX + off, s);
      const rho = rhoAt(s, this.R);
      const h = Math.max(0, AXIS_H + rho * Math.cos(th)), w = rho * Math.sin(th);
      pts.push({ x: 960 + (x - 960) * (1 + w * 0.00028), y: GROUND - h + K * w, w, h });
    }
    return pts;
  }

  // --- frame -------------------------------------------------------------------
  preUpdate(dt) {
    this.pre += dt;
    const r = this.ropes[0];
    r.th = 1.55 * Math.PI + Math.sin(this.pre * 2.4) * 0.05;   // held up behind, wiggling
    for (const U of this.units) { U.a.setPose(this.pre > 1.5 ? 'ready' : 'idle'); U.a.update(dt); }
    this.updateBunnies(dt);
  }

  update(dt) {
    this.t += dt;
    if (this.t >= DURATION && !this.over) { this.endGame('time'); return; }
    this.runScript();
    this.updateRopes(dt);
    for (const U of this.units) this.updateUnit(U, dt);
    this.updateBunnies(dt);
    this.slap = Math.max(0, this.slap - dt * 3);
    if (this.banner) this.banner.t += dt;
    if (this.cueText) { this.cueText.t += dt; if (this.cueText.t > 0.6) this.cueText = null; }
    // last one jumping?
    const alive = this.units.filter((u) => u.alive).length;
    if (!this.over) {
      if (this.n >= 2 && alive <= 1 && this.endAt < 0) {
        this.endAt = this.t + 1.3;
        const w = this.units.find((u) => u.alive);
        if (w) { this.showBanner('Last one jumping!', '#ffd23f'); fx.slowmo(0.5, 0.7); }
      }
      if (this.n === 1 && alive === 0 && this.endAt < 0) this.endAt = this.t + 1.3;
      if (this.endAt > 0 && this.t >= this.endAt) this.endGame('last');
    }
  }

  postUpdate(dt) {
    // The rope winds down; everyone reacts.
    const r = this.ropes[0];
    r.w = damp(r.w, 0, 1.6, dt);
    r.th = wrap(r.th + r.w * dt);
    if (this.ropes[1].alpha > 0) { this.ropes[1].alpha = Math.max(0, this.ropes[1].alpha - dt * 2); this.ropes[1].th = wrap(3 * Math.PI - r.th); }
    for (const U of this.units) {
      if (U.jt >= 0) { U.jt += dt; const u = U.jt / JT; if (u >= 1) { U.jt = -1; U.z = 0; } else U.z = 4 * HJ * u * (1 - u); }
      U.a.z = U.z;
      if (U.walk) this.stepWalk(U, dt);
      U.a.update(dt);
    }
    this.updateBunnies(dt);
    if (this.banner) this.banner.t += dt;
  }

  runScript() {
    while (this.scriptI < SCRIPT.length && this.t >= SCRIPT[this.scriptI].t) {
      const ev = SCRIPT[this.scriptI++];
      if (ev.bpr) { this.seg = { bpr: ev.bpr, rate: ev.rate }; }
      if (ev.label) this.showBanner(ev.label, ev.burst ? '#ff6fb1' : ev.slow ? '#9fd4ff' : ev.dd ? '#7be04d' : '#ffd23f');
      if (ev.say) this.bunnySay(pick([0, 1]), ev.say, 1.6);
      this.burst = !!ev.burst && ev.bpr ? true : ev.bpr ? false : this.burst;
      if (ev.bpr) this.slow = !!ev.slow;
      if (ev.dd === true) { this.ropes[1].pending = true; snd('jr-double', 'swap', { vol: 0.8 }); this.tutorial = Math.max(this.tutorial, 2); }
      if (ev.dd === false) this.ropes[1].ending = true;
      if (ev.slow) { snd('jr-slowdown', 'shrink'); for (const b of this.bunnies) { b.mood = 'sneaky'; b.moodT = 4.2; } }
      if (ev.snap) { snd('jr-speedup', 'whoosh'); sfx('giggle', { vol: 0.6 }); for (const b of this.bunnies) { b.mood = 'cheer'; b.moodT = 1; } }
      if (ev.burst) { snd('jr-speedup', 'whoosh'); sfx('fever', { fallback: 'drumroll', vol: 0.6 }); fx.flash('#ffe0f0', 0.15); for (const b of this.bunnies) { b.mood = 'excited'; b.moodT = 5.5; } }
      if (ev.gold) this.ropes[0].goldNext = true;
      if (ev.bpr && !ev.slow && !ev.snap && ev.t > 0) sfx('swap', { vol: 0.5 });
    }
  }

  ropeOmega(bpr) { return TAU / (bpr * 60 / this.bpm); }

  updateRopes(dt) {
    const r = this.ropes[0], r2 = this.ropes[1];
    if (music.song) this.bpm = music.bpm || BPM_FALLBACK;
    const wT = this.ropeOmega(this.seg.bpr);
    r.w = damp(r.w, wT, this.seg.rate, dt);
    let dth = r.w * dt;
    // Beat lock: nudge the phase so the rope slaps the ground on the beat.
    const beat = music.beat();
    this.beatOk = beat > 0 && beat !== this.lastBeat;
    this.lastBeat = beat;
    if (this.beatOk && Math.abs(r.w - wT) < wT * 0.04) {
      const want = Math.PI + TAU * ((beat / this.seg.bpr) % 1);
      const err = wrapPi(want - r.th);
      dth += clamp(err * 1.3, -0.12 * wT, 0.12 * wT) * dt;
    }
    const old = r.th;
    r.th = wrap(r.th + dth);
    const passed = (a) => (old < a && r.th >= a) || (old > r.th && (a > old || a <= r.th));
    if (passed(0) || old > r.th) this.onTop(0);
    if (passed(Math.PI / 2)) this.onFront(0);
    if (passed(Math.PI)) this.onBottom(0);
    // Second rope: the mirror image, half a turn apart, turning the other way.
    const old2 = r2.th;
    r2.th = wrap(3 * Math.PI - r.th);
    if (r2.pending && passed(Math.PI)) { r2.pending = false; r2.active = true; r2.ending = false; r2.alpha = 0.01; }
    if (r2.active) {
      if (r2.alpha < 1) r2.alpha = Math.min(1, r2.alpha + dt * 3);
      if (r2.ending && Math.cos(r2.th) > 0.75) { r2.active = false; }
      const crossed = (a) => (old2 > a && r2.th <= a);
      if (crossed(Math.PI)) this.onBottom(1);
      if (crossed(Math.PI / 2 * 3)) this.onFront(1);
    } else if (r2.alpha > 0) r2.alpha = Math.max(0, r2.alpha - dt * 3);
    // Per-player crossings.
    for (const U of this.units) {
      for (let ri = 0; ri < 2; ri++) {
        const rr = this.ropes[ri];
        if (!(rr.active && rr.alpha >= 1)) { U.prevA[ri] = null; continue; }
        const a = rr.dir > 0 ? wrap(U.thc - rr.th) : wrap(rr.th - U.thc);
        if (U.prevA[ri] !== null && a > U.prevA[ri] + Math.PI) this.onCross(U, ri);
        U.prevA[ri] = a;
      }
    }
  }

  onTop(ri) {
    const r = this.ropes[ri];
    if (ri === 0) {
      if (r.gold) r.gold = false;
      if (r.goldNext) {
        r.goldNext = false; r.gold = true;
        this.showBanner('Golden rope!', '#ffd23f');
        sfx('golden-chime', { fallback: 'magic' });
        for (const b of this.bunnies) { b.mood = 'cheer'; b.moodT = 0.8; }
      }
    }
    snd('jr-whoosh', null, { vol: 0.25 });
    if (!hasSound('jr-whoosh') && r.w > 5) sfx('whoosh', { vol: 0.12 });
  }

  onFront() { sfx('tick', { vol: 0.35 }); }

  onBottom(ri) {
    const r = this.ropes[ri];
    snd('jr-slap', 'tock', { vol: 0.5 });
    this.slap = 1;
    for (let i = 0; i < 6; i++) particles.burst(rand(520, 1400), GROUND + rand(-10, 10), { type: 'dust', count: 1, colors: ['#fff6dd', '#f2d79a'], speed: [40, 120], size: [10, 18] });
    if (r.gold) particles.burst(960, GROUND - 10, { type: 'sparkle', count: 14, colors: ['#ffd23f', '#fff6a8', '#fff'], speed: [80, 360], jitter: 300 });
    if (this.tutorial > 0) this.tutorial--;
    if (ri === 0 && this.practice > 0) this.practice--;
  }

  // --- players -----------------------------------------------------------------
  updateUnit(U, dt) {
    const p = U.p, a = U.a;
    U.lag -= dt; U.buffer -= dt; U.immune -= dt; U.chipBump = Math.max(0, U.chipBump - dt * 3); U.heartFlash = Math.max(0, U.heartFlash - dt);
    U.tagT = Math.max(0, U.tagT - dt); U.coil = Math.max(0, U.coil - dt);
    if (U.tangled > 0) {
      U.tangled -= dt;
      if (U.tangled <= 0) {
        if (U.alive) { a.setPose('idle'); a.clearEmotes(); a.squash(0.3); if (!U.stumble) particles.popText(U.x, U.y - a.height - 30, 'Back in!', '#ffffff', 34); U.stumble = false; }
        else this.goSit(U);
      }
    }
    if (U.state === 'play' && U.alive) {
      if (p.isAI) this.ai(U, dt);
      const grounded = U.jt < 0;
      if (p.ctrl.pressed('a')) {
        if (grounded && U.lag <= 0 && U.tangled <= 0) this.hop(U);
        else U.buffer = 0.2;
      }
      if (U.jt < 0 && U.lag <= 0 && U.buffer > 0 && U.tangled <= 0) this.hop(U);
    }
    if (U.jt >= 0) {
      U.jt += dt;
      const u = U.jt / JT;
      if (u >= 1) this.land(U);
      else { U.z = 4 * HJ * u * (1 - u); if (u > 0.5 && a.pose === 'jump') a.setPose('fall'); }
    }
    if (U.pending) {
      if (U.z >= U.pending.need) { const pd = U.pending; U.pending = null; this.cleared(U, pd.ri, pd.gold, true); }
      else { U.pending.t -= dt; if (U.pending.t <= 0) { const pd = U.pending; U.pending = null; this.caught(U, pd.ri); } }
    }
    if (U.walk) this.stepWalk(U, dt);
    if (U.state === 'bench') this.benchUpdate(U, dt);
    a.z = U.z;
    a.update(dt);
  }

  hop(U) {
    U.jt = 0; U.buffer = 0;
    const a = U.a;
    a.setPose('skip-hop'); a.squash(-0.35);   // falls back to jump
    snd('jr-hop', 'jump', { vol: U.p.isAI ? 0.12 : 0.45 });
    particles.burst(U.x, U.y, { type: 'dust', count: 3, colors: ['#fff6dd'], speed: [40, 120], angle: -Math.PI / 2, spread: 1.2 });
  }

  land(U) {
    U.jt = -1; U.z = 0; U.lag = LAG;
    const a = U.a;
    a.squash(0.32);
    if (a.pose === 'fall' || a.pose === 'jump' || a.pose === 'skip-hop') a.setPose('idle');
    a.playOnce('land', 0.14, 'idle');
    if (!U.p.isAI) sfx('land', { vol: 0.25 });
  }

  onCross(U, ri) {
    U.cross[ri]++;
    if (!U.alive || U.state !== 'play') return;
    const ai = U.ai;
    if (U.p.isAI && !ai.pressed && !ai.skip && ai.target < 0) ai.delay = -ai.target;
    if (U.tangled > 0 || U.immune > 0) return;
    const need = U.hc + CLEAR;
    const gold = ri === 0 && this.ropes[0].gold;
    if (U.z >= need) this.cleared(U, ri, gold, false);
    else U.pending = { t: GRACE, need, ri, gold };
  }

  cleared(U, ri, gold, close) {
    U.jumps++; U.streak++; U.chipBump = 1;
    const a = U.a, human = !U.p.isAI;
    const top = U.y - U.z - a.height - 20;
    if (human) {
      sfx('collect', { step: Math.min(7, U.streak % 8), vol: 0.45 });
      particles.popText(U.x, top, close ? 'Phew!' : '+1', close ? '#9fe8ff' : '#ffe46b', close ? 40 : 34);
    } else if (close) particles.popText(U.x, top, 'Phew!', '#9fe8ff', 32);
    particles.burst(U.x, U.y - 4, { type: 'sparkle', count: 3, colors: [U.p.color, '#fff'], speed: [60, 180], size: [8, 16] });
    if (U.streak % 10 === 0) {
      particles.popText(U.x, top - 40, `${U.streak} in a row!`, '#ff6fb1', 42);
      particles.burst(U.x, top, { type: 'star', count: 8, colors: ['#ffd23f', '#fff', U.p.color], speed: [120, 300] });
      a.emote('star', 1); if (human) sfx('star', { vol: 0.6 });
      if (chance(0.5)) voice(U.p.charId, 'woo');
    }
    if (gold) {
      if (U.hearts < HEARTS) {
        U.hearts++; U.heartFlash = 1;
        particles.popText(U.x, top - 30, '+1 heart!', '#ff5fa2', 46);
        particles.burst(U.x, top, { type: 'heart', count: 8, colors: ['#ff5fa2', '#ff8fbf'], speed: [100, 260] });
      } else {
        U.jumps += 3;
        particles.popText(U.x, top - 30, '+3', '#ffd23f', 46);
      }
      particles.burst(U.x, U.y - 40, { type: 'star', count: 10, colors: ['#ffd23f', '#fff6a8', '#fff'], speed: [150, 380] });
      a.emote('sparkle', 1);
      sfx('star', { vol: human ? 0.8 : 0.3 });
      for (const B of this.units) if (B.state === 'bench' && chance(0.6)) B.a.playOnce('cheer', 0.6, 'clap');
    }
  }

  caught(U, ri) {
    if (this.over) return;
    if (this.practice > 0) {
      // Warm-up pass: a little stumble and a hint, no heart lost.
      U.streak = 0; U.tangled = 0.5; U.immune = 0.6; U.stumble = true; U.jt = -1; U.z = 0; U.tagT = U.p.isAI ? 0 : 2;
      U.a.playOnce('surprised', 0.4, 'idle'); U.a.squash(0.3);
      particles.popText(U.x, U.y - U.a.height - 40, 'Practice! Hop!', '#9fe8ff', 40);
      sfx('bonk', { vol: 0.35 });
      return;
    }
    U.hearts = Math.max(0, U.hearts - 1); U.streak = 0; U.heartFlash = 1;
    U.tangled = 1.15; U.immune = 1.4; U.coil = 1.15; U.buffer = 0;
    U.jt = -1; U.z = 0; U.tagT = U.p.isAI ? 0 : 2;
    const a = U.a, human = !U.p.isAI;
    a.playOnce('tumble', 0.4, 'dizzy'); a.squash(0.45); a.flash('#ffffff', 0.15); a.emote('dizzy', 1.1);
    const hx = U.x, hy = U.y - a.height * 0.5;
    particles.burst(hx, hy, { type: 'star', count: 9, colors: ['#ffd23f', '#fff', '#ff9fd0'], speed: [180, 420] });
    particles.ring(U.x, U.y - 10, ROPE_COLORS[ri].stripe, 110, 0.35);
    particles.popText(hx, U.y - a.height - 40, U.hearts > 0 ? 'Tangled!' : 'Out!', U.hearts > 0 ? '#ff6fb1' : '#ff4d6d', 50);
    snd('jr-tangle', 'bonk', { vol: 0.8 }); sfx('boing', { fallback: 'hit', vol: 0.5 });
    voice(U.p.charId, 'ouch');
    fx.shake(human ? 10 : 5, 0.22);
    if (human) U.p.ctrl.rumble(0.7, 240);
    if (this.api.camera && this.t - this.punchT > 1.5 && (human || this.n <= 4)) { this.punchT = this.t; this.api.camera.punch(U.x, U.y - 120, 1.18, 0.3); }
    const b = this.bunnies[U.x < 960 ? 0 : 1];
    if (!b.say || b.say.t > 0.8) this.bunnySay(U.x < 960 ? 0 : 1, pick(['Oopsie!', 'Uh-oh!', 'Whoops!']), 1.1);
    b.mood = 'oops'; b.moodT = 0.9;
    for (const B of this.units) if (B.state === 'bench') B.a.playOnce('surprised', 0.4, 'clap');
    if (U.hearts <= 0) {
      U.alive = false;
      if (this.t - this.lastOutT > 0.3) this.outGroups++;
      this.lastOutT = this.t;
      U.outGroup = this.outGroups; U.outT = this.t;
      sfx('crowd-aww', { fallback: 'aww', vol: 0.55 });
      a.say('Aww!', 1.0, null);
      a.emote('tear', 1.2);
    }
  }

  goSit(U) {
    U.state = 'walk';
    const benched = this.units.filter((u) => u.state === 'bench' || u.state === 'walk').length - 1;
    U.seat = benched;
    U.walk = { fx: U.x, fy: U.y, t: 0, dur: 1.1 };
    U.a.setPose('walk'); U.a.clearEmotes();
  }

  seatPos(k) {
    const m = this.units.filter((u) => u.seat !== null).length;
    const step = Math.min(112, (BLANKET.x1 - BLANKET.x0 - 120) / Math.max(1, m - 1));
    return { x: 960 + (k - (m - 1) / 2) * step, y: BLANKET.y0 + 70 };
  }

  stepWalk(U, dt) {
    const w = U.walk, sp = this.seatPos(U.seat);
    w.t += dt;
    const u = clamp(w.t / w.dur, 0, 1), e = ease.inOutQuad(u);
    U.x = lerp(w.fx, sp.x, e); U.y = lerp(w.fy, sp.y, e);
    U.z = Math.abs(Math.sin(u * Math.PI * 4)) * 10 * (1 - u);
    U.a.facing = sp.x >= w.fx ? 1 : -1;
    U.a.scale = lerp(U.a.scale, U.benchScale ?? (U.benchScale = U.a.scale * 0.72), Math.min(1, dt * 4));
    U.a.x = U.x; U.a.y = U.y;
    if (u >= 1) {
      U.walk = null; U.state = 'bench'; U.z = 0;
      U.a.setPose('clap'); U.a.facing = U.x < 960 ? 1 : -1;
    }
  }

  benchUpdate(U, dt) {
    const sp = this.seatPos(U.seat);
    U.x = damp(U.x, sp.x, 4, dt); U.y = sp.y;
    U.a.x = U.x; U.a.y = U.y;
    U.cheerT -= dt;
    if (U.cheerT <= 0 && !this.over) {
      U.cheerT = rand(2.5, 5);
      const r = Math.random();
      if (r < 0.4) U.a.playOnce('cheer', 0.6, 'clap');
      else if (r < 0.6) U.a.emote(pick(['heart', 'note', 'star']), 1.2);
      else if (r < 0.7 && !U.a.speech) U.a.say(pick(['Go go!', 'Jump!', 'Yay!', 'Hop!']), 1.1, null);
    }
  }

  // --- CPU ---------------------------------------------------------------------
  ai(U, dt) {
    const lvl = clamp(U.p.aiLevel ?? 0, 0, 2), ai = U.ai, r0 = this.ropes[0];
    if (ai.percW <= 0) ai.percW = this.ropeOmega(SCRIPT[0].bpr);
    ai.percW = damp(ai.percW, r0.w, 1 / AI_ADAPT[lvl], dt);
    if (ai.delay > 0) { ai.delay -= dt; if (ai.delay <= 0) { U.p.ctrl.press('a'); ai.delay = -1; } }
    if (U.tangled > 0) return;
    // nearest upcoming pass among the ropes in play
    let best = null;
    for (let ri = 0; ri < 2; ri++) {
      const rr = this.ropes[ri];
      if (!(rr.active && rr.alpha >= 1) || U.prevA[ri] === null) continue;
      if (!best || U.prevA[ri] < best.a) best = { ri, a: U.prevA[ri] };
    }
    if (!best) return;
    const key = best.ri * 100000 + U.cross[best.ri];
    if (key !== ai.key) {
      ai.key = key; ai.pressed = false;
      const harder = (this.burst ? 1.25 : 1) * (this.ropes[1].active ? 1.15 : 1);
      ai.target = IDEAL + gauss() * AI_SIGMA[lvl] * harder;
      ai.skip = chance(AI_LAPSE[lvl] * harder);
    }
    if (ai.skip || ai.pressed || ai.target < 0) return;
    const est = best.a / Math.max(0.5, ai.percW);
    if (est <= ai.target) { U.p.ctrl.press('a'); ai.pressed = true; }
  }

  // --- bunnies -----------------------------------------------------------------
  bunnySay(i, text, dur = 1.4) { this.bunnies[i].say = { text, t: 0, dur }; }

  updateBunnies(dt) {
    for (const b of this.bunnies) {
      if (b.moodT > 0) { b.moodT -= dt; if (b.moodT <= 0) b.mood = 'happy'; }
      if (b.mood !== b.lastMood) { b.lastMood = b.mood; b.moodAge = 0; } else b.moodAge = (b.moodAge || 0) + dt;
      if (b.say) { b.say.t += dt; if (b.say.t > b.say.dur) b.say = null; }
    }
  }

  // --- end -----------------------------------------------------------------------
  endGame(reason) {
    if (this.over) return;
    this.over = true;
    for (const U of this.units) if (U.pending) { U.pending = null; U.jumps++; }
    const n = this.n;
    const scores = this.units.map((U) => (U.alive ? 1e6 + U.hearts * 1e4 : U.outGroup * 1000 + U.jumps));
    const placements = placementsFromScores(scores);
    const stats = this.units.map((U) => (U.alive
      ? `${U.hearts} heart${U.hearts === 1 ? '' : 's'} left, ${U.jumps} jumps`
      : `Out at ${Math.round(U.outT)} s, ${U.jumps} jumps`));
    const winners = this.units.filter((U, i) => placements[i] === 1);
    for (const U of this.units) {
      U.pending = null;
      if (placements[U.i] === 1) {
        U.a.setPose('celebrate'); U.a.emote('sparkle', 2);
        particles.burst(U.x, U.y - U.a.height * 0.6, { type: 'confetti', count: 26 });
      } else if (U.state === 'bench') U.a.setPose('clap');
      else if (U.alive) U.a.playOnce('cheer', 0.6, 'idle');
    }
    for (const b of this.bunnies) { b.mood = 'cheer'; b.moodT = 3; }
    this.bunnySay(0, reason === 'time' ? 'Hooray!' : 'Wow!', 2);
    sfx('cheer', { vol: 0.7 });
    if (winners.length && !winners.every((u) => u.p.isAI)) voice(winners[0].p.charId, 'yay');
    const fxs = winners.length ? winners.reduce((s, u) => s + u.x, 0) / winners.length : 960;
    const fys = winners.length ? winners.reduce((s, u) => s + u.y, 0) / winners.length - 100 : GROUND - 100;
    this.api.finish({ placements, stats, focus: { x: fxs, y: fys } });
    if (n === 1 && this.units[0].alive) this.showBanner('You made it!', '#7be04d');
  }

  showBanner(text, color) { this.banner = { text, color, t: 0 }; }

  // --- drawing -------------------------------------------------------------------
  draw(g) {
    const t = this.t + this.pre;
    g.drawImage(this.bg, 0, 0);
    if (!this.bgArt) drawClouds(g, t);   // the painted park has its own clouds (and bunting they'd cover)
    // beat pulse on the mat
    if (this.slap > 0) {
      g.save(); g.globalAlpha = this.slap * 0.25; g.fillStyle = this.ropes[0].gold ? '#ffe66d' : '#ffffff';
      g.beginPath(); g.ellipse(960, GROUND + 6, 700 * (1.02 - this.slap * 0.02), 100, 0, 0, TAU); g.fill(); g.restore();
    }
    if (this.burst && !this.over) this.drawSpeedLines(g, t);

    const ropes = [0, 1].filter((ri) => this.ropes[ri].alpha > 0.01);
    const geo = ropes.map((ri) => ({ ri, pts: this.ropePoints(ri) }));
    // turners (behind everything in the middle)
    this.drawTurners(g, t);
    // rope shadows + timing cues on the ground
    for (const { ri, pts } of geo) this.drawRopeShadow(g, ri, pts);
    this.drawCueGlow(g);
    for (const U of this.units) if (U.state === 'play') this.drawRing(g, U);
    // layered: ropes behind / between rows / in front
    const layerOf = (ri) => {
      const w = Math.sin(this.ropes[ri].th);
      if (this.rows === 1) return w < 0 ? 0 : 2;
      const wm = w * rhoAt(0.5, this.R);
      return wm < -100 ? 0 : wm < 100 ? 1 : 2;
    };
    const rowUnits = (row) => this.units.filter((U) => U.state === 'play' && U.row === row).sort((a, b) => a.x - b.x);
    const drawLayer = (L) => { for (const { ri, pts } of geo) if (layerOf(ri) === L) this.drawRope(g, ri, pts); };
    drawLayer(0);
    if (this.rows === 2) { for (const U of rowUnits(0)) this.drawUnit(g, U); drawLayer(1); for (const U of rowUnits(1)) this.drawUnit(g, U); }
    else { drawLayer(1); for (const U of rowUnits(0)) this.drawUnit(g, U); }
    drawLayer(2);
    // walkers + the cheering section
    const side = this.units.filter((U) => U.state !== 'play').sort((a, b) => a.y - b.y);
    for (const U of side) U.a.draw(g, { ring: U.state === 'walk' ? null : null });
    // handles over the rope ends, then the bunnies' paws/bubbles
    this.drawHandles(g);
    this.drawJumpCue(g);
    this.drawTags(g);
    this.drawBunnyBubbles(g);
  }

  drawSpeedLines(g, t) {
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineCap = 'round'; g.lineWidth = 6;
    for (const L of this.lineSeed) {
      const x = ((L.x + t * 1600) % (W + 400)) - 200;
      g.beginPath(); g.moveTo(x, L.y); g.lineTo(x - L.l, L.y); g.stroke();
    }
    g.restore();
  }

  drawTurners(g, t) {
    for (let i = 0; i < 2; i++) {
      const b = this.bunnies[i];
      const h0 = this.handPos(0, i);
      const r2 = this.ropes[1];
      const hands = [h0, r2.alpha > 0.3 ? this.handPos(1, i) : { x: h0.x - b.facing * 12, y: h0.y + 10 }];
      const bob = Math.max(0, Math.sin(this.ropes[0].th)) * 6 + (b.mood === 'cheer' ? Math.abs(Math.sin(t * 9)) * 10 : 0);
      drawBunny(g, b.x, GROUND - 4, 1, { pal: b.pal, facing: b.facing, t: t + i, mood: b.mood, moodAge: b.moodAge || 0, hands, bob });
    }
  }

  drawHandles(g) {
    for (let ri = 0; ri < 2; ri++) {
      const r = this.ropes[ri];
      if (r.alpha <= 0.01) continue;
      g.save(); g.globalAlpha = r.alpha;
      for (let e = 0; e < 2; e++) {
        const hp = this.handPos(ri, e);
        drawHandle(g, hp.x, hp.y, e ? Math.PI : 0, (r.gold ? GOLD_ROPE : ROPE_COLORS[ri]).handle, 0.9);
      }
      g.restore();
    }
  }

  drawRope(g, ri, pts) {
    const r = this.ropes[ri];
    const mid = pts[pts.length >> 1];
    const rm = rhoAt(0.5, this.R);
    const d01 = clamp(mid.w / rm, -1, 1);
    const th = (this.rows === 2 ? 12 : 13) + 6 * d01;
    // motion blur ghosts
    if (r.w > 3 && !this.over) {
      for (let k = 1; k <= 3; k++) {
        const gp = this.ropePoints(ri, r.th - r.dir * r.w * 0.024 * k);
        ghostRope(g, gp, th * 0.9, (0.2 / k) * r.alpha);
      }
    }
    strokeRope(g, pts, { colors: r.gold ? GOLD_ROPE : ROPE_COLORS[ri], thick: th, depth01: d01, twist: -r.th * r.dir * 26, alpha: r.alpha, glow: r.gold });
    if (r.gold && Math.random() < 0.6) {
      const p = pts[2 + Math.floor(Math.random() * (pts.length - 4))];
      particles.burst(p.x, p.y, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffd23f', '#fff'], size: [10, 20], speed: [10, 60], life: [0.3, 0.6] });
    }
  }

  drawRopeShadow(g, ri, pts) {
    const r = this.ropes[ri];
    const mid = pts[pts.length >> 1];
    const near = 1 - clamp(mid.h / (AXIS_H * 2.2), 0, 1);
    g.save();
    g.globalAlpha = r.alpha * (0.08 + 0.3 * near * near);
    g.strokeStyle = '#2a1a4a'; g.lineCap = 'round'; g.lineWidth = 10 + 10 * near;
    g.beginPath();
    for (let i = 3; i < pts.length - 3; i++) {
      const p = pts[i], y = GROUND + K * p.w;
      if (i === 3) g.moveTo(p.x, y); else g.lineTo(p.x, y);
    }
    g.stroke();
    g.restore();
  }

  /** Seconds until the next rope pass for a unit (and which rope). */
  nextPass(U) {
    let best = null;
    for (let ri = 0; ri < 2; ri++) {
      const rr = this.ropes[ri];
      if (!(rr.active && rr.alpha >= 1) || U.prevA[ri] === null || rr.w <= 0.1) continue;
      const tt = U.prevA[ri] / rr.w;
      if (!best || tt < best.t) best = { t: tt, ri };
    }
    return best;
  }

  drawCueGlow(g) {
    if (this.over || this.t <= 0) return;
    const any = this.units.find((U) => U.state === 'play' && U.alive);
    if (!any) return;
    const np = this.nextPass(any);
    if (!np) return;
    const k = clamp(1 - (np.t - IDEAL * 0.5) / 0.5, 0, 1);
    if (k <= 0) return;
    g.save();
    g.globalAlpha = 0.28 * k;
    const gr = g.createRadialGradient(960, GROUND, 40, 960, GROUND, 700);
    gr.addColorStop(0, '#fff6a8'); gr.addColorStop(1, 'rgba(255,246,168,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(960, GROUND + 4, 720, 110, 0, 0, TAU); g.fill();
    g.restore();
  }

  drawRing(g, U) {
    const a = U.a;
    const rx = Math.max(44, Math.min(a.width * 0.45, 120)), ry = rx * 0.3;
    g.save();
    g.globalAlpha = U.alive ? 1 : 0.4;
    g.lineWidth = 6; g.strokeStyle = U.p.color;
    g.beginPath(); g.ellipse(U.x, U.y + 2, rx, ry, 0, 0, TAU); g.stroke();
    g.globalAlpha *= 0.22; g.fillStyle = U.p.color; g.fill();
    g.restore();
    if (!U.alive || this.over || U.tangled > 0 || this.t <= 0) return;
    const np = this.nextPass(U);
    if (!np) return;
    // approach ring: shrinks onto the player ring at the ideal moment to press A
    const lead = np.t - IDEAL;
    if (lead < 0.75 && lead > -IDEAL) {
      const k = clamp(lead / 0.75, 0, 1);
      const sc = 1 + k * 1.3;
      g.save();
      g.globalAlpha = lead > 0 ? 0.35 + 0.65 * (1 - k) : clamp(1 + lead / IDEAL, 0, 1);
      g.lineWidth = lead > 0 ? 5 : 9;
      g.strokeStyle = lead > 0.06 ? '#ffffff' : '#ffe66d';
      g.beginPath(); g.ellipse(U.x, U.y + 2, rx * sc, ry * sc, 0, 0, TAU); g.stroke();
      g.restore();
    }
  }

  drawUnit(g, U) {
    const a = U.a;
    a.x = U.x; a.y = U.y;
    a.draw(g);
    if (U.coil > 0) this.drawCoil(g, U);
  }

  drawCoil(g, U) {
    const k = U.coil / 1.15, a = U.a;
    const s = a.scale;
    g.save(); g.globalAlpha = Math.min(1, k * 2.5);
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const yy = U.y - (16 + i * 22) * s, rx = (36 + i * 4) * s * (0.9 + 0.1 * Math.sin(this.t * 12 + i)), ry = 9 * s;
      const col = this.ropes[0].gold ? GOLD_ROPE : ROPE_COLORS[0];
      g.strokeStyle = NAVY; g.lineWidth = 11 * s;
      g.beginPath(); g.ellipse(U.x, yy, rx, ry, -0.15 + i * 0.12, 0, TAU); g.stroke();
      g.strokeStyle = col.base; g.lineWidth = 7 * s; g.stroke();
      g.setLineDash([8 * s, 8 * s]); g.strokeStyle = col.stripe; g.stroke(); g.setLineDash([]);
    }
    g.restore();
  }

  drawJumpCue(g) {
    if (this.over || this.t <= 0 || this.tutorial <= 0) return;
    const any = this.units.find((U) => U.state === 'play' && U.alive);
    if (!any) return;
    const np = this.nextPass(any);
    if (!np) return;
    const lead = np.t - IDEAL;
    if (lead > 0.12 || lead < -0.3) return;
    const k = ease.outBack(clamp((0.12 - lead) / 0.18, 0, 1));
    g.save(); g.translate(960, GROUND - 330); g.scale(k, k); g.rotate(-0.05);
    ui.text(g, 'JUMP!', 0, 0, { size: 96, color: '#ffe66d', strokeWidth: 16, weight: 800 });
    g.restore();
  }

  drawTags(g) {
    const show = this.t < 4.5 || this.pre < 3.2 && this.t === 0;
    for (const U of this.units) {
      if (U.state !== 'play') continue;
      if (!(show || U.tagT > 0)) continue;
      const head = U.a.anchor('head');
      g.save(); if (!show) g.globalAlpha = clamp(U.tagT, 0, 1);
      ui.playerTag(g, U.p, head.x, head.y - 18);
      g.restore();
    }
  }

  drawBunnyBubbles(g) {
    this.bunnies.forEach((b, i) => {
      if (!b.say) return;
      drawSpeech(g, b.say.text, b.x + (i ? -40 : 40), GROUND - 375, 1.05, b.say.t, b.say.dur, 1);
    });
  }

  // --- HUD (screen space) ----------------------------------------------------------
  drawHUD(g) {
    this.drawChips(g);
    ui.timer(g, DURATION - this.t);
    if (this.banner && this.banner.t < 1.8) {
      const b = this.banner;
      g.save(); g.globalAlpha = 1 - clamp((b.t - 1.4) / 0.4, 0, 1);
      ui.banner(g, b.text, b.t, { y: 238, size: 92, color: b.color, strokeWidth: 18 });
      g.restore();
    }
  }

  drawChips(g) {
    const n = this.n, gap = 220;
    const chipW = Math.min(260, (W - 120 - gap) / n - 16);
    const y = 30;
    // Left group ends at the timer gap, right group starts after it (centred even for odd counts).
    const gapAt = n === 1 ? 1 : Math.ceil(n / 2);
    let x = W / 2 - gap / 2 - gapAt * chipW - (gapAt - 1) * 16;
    this.units.forEach((U, i) => {
      if (i === gapAt) x = W / 2 + gap / 2;
      const p = U.p, out = !U.alive;
      g.save();
      if (out) g.globalAlpha = 0.5;
      const bump = 1 + U.chipBump * 0.06;
      g.translate(x + chipW / 2, y + 38); g.scale(bump, bump); g.translate(-(x + chipW / 2), -(y + 38));
      ui.panel(g, x, y, chipW, 76, { r: 38, fill: U.heartFlash > 0 && U.hearts < HEARTS ? '#ffe0ea' : '#ffffff', stroke: p.color, lineWidth: 6 });
      ui.drawPortrait(g, p, x + 38, y + 38, 30, { expr: out ? 'sad' : U.tangled > 0 ? 'sad' : 'neutral', ring: null, gray: out });
      ui.text(g, p.tag, x + 84, y + 22, { size: 22, color: p.color, align: 'left', strokeWidth: 5 });
      const v = n <= 4 ? `${U.jumps} hops` : String(U.jumps);
      ui.text(g, v, x + chipW - 18, y + 48, { size: n <= 4 ? 34 : 36, color: NAVY, align: 'right', stroke: false, weight: 800, maxWidth: chipW - 100 });
      g.restore();
      // hearts under the chip
      for (let h = 0; h < HEARTS; h++) {
        const hx = x + chipW / 2 + (h - 1) * 30, hy = y + 92;
        g.save(); g.translate(hx, hy);
        const full = h < U.hearts;
        const pop = full && U.heartFlash > 0 && h === U.hearts - 1 ? 1 + U.heartFlash * 0.4 : 1;
        g.scale(pop, pop);
        if (full) drawHeartShape(g, 26, '#ff4f8b');
        else { g.globalAlpha = 0.45; drawHeartShape(g, 22, '#cfc6dc'); }
        g.restore();
      }
      x += chipW + 16;
    });
  }

  destroy() {}
}
