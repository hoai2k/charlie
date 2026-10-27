// Pancake Tower - every player stacks a pancake tower on their own plate.
// A flying chef pan slides back and forth above the tower; press A to drop
// what's in it. Stack it right on top for a PERFECT; lean too far one way and
// the tower wobbles... and topples in a cartoon crash (only the part above
// the weak spot falls, and the top pancake lands on your head as a hat).
// Golden pancakes are extra wide and worth 3, syrup makes the next drop
// stick perfectly, waffles are worth 2. Tallest tower after 50 s wins.
//
// Art hooks (procedural fallbacks ship today): bg/pancake-tower, thumb/pancake-tower,
//   prop/pancake prop/pancake-golden prop/waffle prop/butter-pat prop/strawberries
//   prop/cream-swirl prop/pancake-plate prop/chef-pan prop/syrup-bottle
// Sound hooks (synth/manifest fallbacks today): pancake-flip pancake-plop
//   pancake-perfect pancake-crash syrup-pour tower-wobble topping-squish
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art } from '../engine/art.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { clamp, lerp, damp, rand, pick, chance, TAU, placementsFromScores, later } from '../engine/util.js';
import {
  KINDS, PERFECT, PLATE_HALF, makeItem, itemH, towerHeight, towerValue, stability, drop, aiTarget,
  makeSequence, supportHalf,
} from './pancake-tower/stack.js';
import { drawItem, drawPlate, drawPan, panItemLift, drawSyrupBottle, drawCrown } from './pancake-tower/draw.js';

const NAVY = ui.NAVY;
const DURATION = 50;
const FINALE_AT = 10;          // seconds left: everyone's next item is golden
const BASE_Y = 920;            // counter top (screen px)
const TOP_Y = 124;             // lanes start under the scoreboard
const PLATE_H = 20;            // plate height (design px)
const GAP = 165;               // pan floats this high above the tower top
const RANGE = 125;             // pan slides between -RANGE..RANGE
const SPEED0 = 235, SPEED_PER = 8, SPEED_MAX = 470;
const FLIP_T = 0.5, POUR_T = 0.95, TILT_T = 0.3;
const G_FALL = 2600;
const AI_ERR = [52, 28, 14];   // CPU drop error (design px, 1 sigma) per level

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
const CRUMB = { pancake: ['#e7a14c', '#f8cf7f', '#c97a2c'], golden: ['#ffd23f', '#fff3a6', '#e89a14'], waffle: ['#f7c66a', '#d48a2c'],
  butter: ['#fff1a0', '#ffe36b'], berries: ['#ff4d6d', '#ff8fa8', '#36d17a'], cream: ['#ffffff', '#f3f0ff', '#ff3b5c'] };

import { meta } from './pancake-tower.meta.js';
export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.time = 0;            // seconds since GO
    this.zoom = 1;
    this.seq = makeSequence(90);
    this.humans = this.players.some((p) => !p.isAI);
    this.finale = false;
    this.ending = false; this.endT = 0; this.finished = false;
    api.limit(() => (this.ending ? null : DURATION - this.time), { showAt: Infinity, x: W / 2, y: 62 });
    this.msg = null;
    this.punchCd = 0;
    this.bg = null;
    this.layout();
  }

  layout() {
    const n = this.n;
    const slot = Math.min((W - 60) / n, 700);
    this.slotW = slot;
    this.lanes = this.players.map((p, i) => {
      const lx = W / 2 + (i - (n - 1) / 2) * slot;
      const s = Math.min(1.25, slot / 480);
      const cx = lx + 20 * s;
      const a = new Actor(p, { scale: 1, x: 0, y: BASE_Y });
      const w1 = a.width || 120;
      const charScale = Math.min(s * 0.92, (s * 150) / w1);
      a.scale = charScale; a.facing = 1; a.snap();
      const L = {
        p, i, a, lx, cx, s, charScale,
        tower: [], idx: 0, item: null, state: 'slide', stT: 0,
        panX: -RANGE, panDir: 1, panY: GAP, panTilt: 0, panAlpha: 1, flipRot: 0,
        fall: null, debris: [], score: 0, best: 0, bestH: 0, streak: 0, perfects: 0, topples: 0, misses: 0,
        wob: 0, wobV: 0, bend: 0, danger: 0, dir: 0, bonusSyrup: false, gotFinale: false,
        dizzyT: 0, hat: null, hatAtt: null, wobbleCd: 0, milestone: 0, vol: p.isAI && this.humans ? 0.5 : 0.85,
        ai: { ready: false, wait: 0.6, tgt: 0, passes: 0, cool: 0 },
        badgePop: 0, endPose: null,
      };
      L.item = makeItem(this.seq[L.idx++]);
      return L;
    });
    this.updateCharPos();
    for (const L of this.lanes) L.a.snap();
  }

  // ---- coordinates -----------------------------------------------------------
  S(L) { return L.s * this.zoom; }
  toScreen(L, x, y) { const S = this.S(L); return { x: L.cx + x * S, y: BASE_Y - (PLATE_H + y) * S }; }
  offAt(L, y) { const Ht = Math.max(240, towerHeight(L.tower)); const yy = clamp(y, 0, Ht); return L.bend * yy * yy / Ht; }
  rotAt(L, y) { const Ht = Math.max(240, towerHeight(L.tower)); return 2 * L.bend * clamp(y, 0, Ht) / Ht; }
  offTop(L) { return this.offAt(L, towerHeight(L.tower)); }
  speed(L) { return Math.min(SPEED_MAX, SPEED0 + SPEED_PER * L.tower.length); }
  updateCharPos() {
    for (const L of this.lanes) {
      const S = this.S(L);
      L.a.scale = L.charScale * Math.max(1, this.zoom);   // characters grow with a zoom-in (never shrink)
      const half = (L.a.width || 100) / 2;
      L.a.x = Math.max(half + 6, L.lx - this.slotW / 2 + half, L.cx - (PLATE_HALF + 14) * S - half * 0.8);   // never off the screen edge or out of its lane
      L.a.y = BASE_Y + 4;
    }
  }

  // ---- update ----------------------------------------------------------------
  preUpdate(dt) { this.t += dt; this.animate(dt, false); }
  postUpdate(dt) { this.t += dt; this.animate(dt, false); }

  update(dt) {
    this.t += dt;
    this.time += dt;
    const left = DURATION - this.time;
    if (!this.finale && left <= FINALE_AT) this.startFinale();
    if (!this.ending && left <= 0) { this.ending = true; this.endT = 0; sfx('whistle'); }
    if (this.ending) {
      this.endT += dt;
      const busy = this.lanes.some((L) => L.state === 'fall');
      if (!this.finished && (!busy || this.endT > 1.4) && this.endT > 0.35) this.finish();
    }
    this.animate(dt, !this.ending);
    if (this.msg) { this.msg.t += dt; if (this.msg.t > this.msg.dur) this.msg = null; }
    this.punchCd -= dt;
  }

  startFinale() {
    this.finale = true;
    this.msg = { text: 'Golden pancakes!', t: 0, dur: 2.2, color: '#ffd23f' };
    snd('golden-chime', 'star'); sfx('magic', { vol: 0.6 });
    fx.flash('#fff3a6', 0.2);
    for (const L of this.lanes) { const p = this.toScreen(L, L.panX, L.panY + 40); particles.burst(p.x, p.y, { type: 'sparkle', count: 6, colors: ['#ffd23f', '#ffffff'] }); }
  }

  animate(dt, playing) {
    // shared zoom: fit the tallest tower (+ pan) in the lane area
    let need = 0;
    for (const L of this.lanes) need = Math.max(need, (PLATE_H + Math.max(towerHeight(L.tower), L.bestH * 0.6) + GAP + 95) * L.s);
    // Narrow lanes (6-8 players) may zoom in past 1 while the towers are short,
    // up to full design size or a plate 85% of the lane wide, whichever is less.
    const s0 = Math.min(...this.lanes.map((L) => L.s));
    const zMax = clamp(Math.min(1 / s0, (this.slotW * 0.85) / (300 * s0)), 1, 1.8);
    const zt = clamp((BASE_Y - TOP_Y - 18) / need, 0.26, zMax);
    this.zoom = damp(this.zoom, zt, 2.5, dt);
    this.updateCharPos();
    for (const L of this.lanes) this.updateLane(L, dt, playing);
  }

  updateLane(L, dt, playing) {
    const th = towerHeight(L.tower);
    // wobble: a landing kick (spring) + a sway that grows with the lean
    L.wobV += (-L.wob * 55 - L.wobV * 4.2) * dt; L.wob += L.wobV * dt;
    const d2 = L.danger * L.danger;
    const sway = Math.sin(this.t * (2.7 + L.i * 0.17) + L.i) * (0.006 + 0.06 * d2) + L.dir * 0.035 * d2;
    L.bend = clamp(sway + L.wob * 0.05, -0.16, 0.16);
    for (const it of L.tower) if (it.sq || it.sqv) { it.sqv += (-it.sq * 320 - it.sqv * 14) * dt; it.sq += it.sqv * dt; if (Math.abs(it.sq) < 0.002 && Math.abs(it.sqv) < 0.02) it.sq = it.sqv = 0; }
    L.panY = damp(L.panY, th + GAP, 6, dt);
    L.panTilt = Math.max(0, L.panTilt - dt * 3.2);
    L.badgePop = Math.max(0, L.badgePop - dt * 2.5);
    L.panAlpha = this.ending ? Math.max(0, L.panAlpha - dt * 2.5) : 1;
    this.updateDebris(L, dt);
    // hat
    if (L.hat) {
      L.hat.t -= dt;
      if (L.hat.t <= 0) this.dropHat(L);
    }
    // character
    L.dizzyT -= dt;
    const a = L.a;
    if (L.endPose) a.setPose(L.endPose);
    else if (L.dizzyT > 0) a.setPose('dizzy');
    else if (L.danger > 0.62 && L.tower.length > 2) a.setPose('balance');
    else a.setPose('idle');
    if (L.danger > 0.8 && playing && chance(dt * 1.1)) a.emote('sweat', 0.8);
    a.update(dt);

    if (!playing) {
      if (L.state === 'fall') this.updateFall(L, dt);   // let the last drops land
      else if (L.state === 'flip') L.stT += dt;
      return;
    }
    L.stT += dt;
    switch (L.state) {
      case 'slide': {
        if (L.p.isAI) this.aiThink(L, dt);
        if (L.p.ctrl.pressed('a')) { this.release(L); break; }
        L.panX += L.panDir * this.speed(L) * dt;
        if (L.panX > RANGE) { L.panX = RANGE - (L.panX - RANGE); L.panDir = -1; }
        if (L.panX < -RANGE) { L.panX = -RANGE + (-RANGE - L.panX); L.panDir = 1; }
        break;
      }
      case 'fall': this.updateFall(L, dt); break;
      case 'flip': if (L.stT >= FLIP_T) this.enterSlide(L); break;
      case 'pour':
        if (!L.poured && L.stT > POUR_T * 0.55) {
          L.poured = true;
          const top = L.tower[L.tower.length - 1];
          if (top) { top.syrup = true; top.glaze = true; top.seed = top.seed || rand(10); top.sq = 0.4; }
          const p = this.toScreen(L, (top ? top.x : 0) + this.offTop(L), th + 8);
          particles.burst(p.x, p.y, { type: 'drop', count: 8, colors: ['#c96e18', '#e08a2c'], angle: -Math.PI / 2, spread: 1.2, speed: [80, 220] });
          particles.popText(p.x, p.y - 50 * this.S(L), 'Sticky!', '#ffb45c', clamp(46 * L.s, 30, 54));
        }
        if (L.stT >= POUR_T) this.nextItem(L);
        break;
      case 'oops': if (L.stT >= (L.oopsT || 0.5)) this.nextItem(L); break;
      default: break;
    }
  }

  enterSlide(L) {
    L.state = 'slide'; L.stT = 0;
    L.ai.ready = false; L.ai.wait = reactionTime(L.p) * ((L.p.aiLevel ?? 0) === 0 ? 1.25 : 1);
  }

  nextItem(L) {
    if (L.bonusSyrup && L.tower.length) { L.bonusSyrup = false; this.startPour(L); return; }
    let kind = this.seq[L.idx++ % this.seq.length];
    if (kind === 'syrup') {
      if (L.tower.length && !L.tower[L.tower.length - 1].syrup) { this.startPour(L); return; }
      kind = this.seq[L.idx++ % this.seq.length];
      if (kind === 'syrup') kind = 'pancake';
    }
    if (this.finale && !L.gotFinale) { kind = 'golden'; L.gotFinale = true; }
    L.item = makeItem(kind);
    L.state = 'flip'; L.stT = 0;
    snd('pancake-flip', 'flip', { vol: L.vol * 0.8 });
    if (kind === 'golden') {
      snd('golden-chime', 'sparkle', { vol: L.vol });
      const p = this.toScreen(L, L.panX, L.panY + 60);
      particles.burst(p.x, p.y, { type: 'sparkle', count: 8, colors: ['#ffd23f', '#fff3a6', '#ffffff'], speed: [60, 220] });
    }
  }

  startPour(L) {
    L.state = 'pour'; L.stT = 0; L.poured = false; L.item = null;
    snd('syrup-pour', 'bubble', { vol: L.vol });
    L.a.emote('heart', 1);
  }

  release(L) {
    if (!L.item) return;
    // what you see is what you get: aim relative to the swaying top you can see
    L.item.x = L.panX - this.offTop(L);
    L.fall = { y: L.panY + panItemLift() - 2, vy: 0, vx: L.panX };
    L.state = 'fall'; L.stT = 0;
    L.panTilt = 1;
    L.a.playOnce('action', 0.28);
    sfx('whoosh', { vol: 0.35 * L.vol });
  }

  updateFall(L, dt) {
    const f = L.fall;
    f.vy -= G_FALL * dt; f.y += f.vy * dt;
    if (f.y <= towerHeight(L.tower)) this.land(L);
  }

  land(L) {
    const it = L.item, th0 = towerHeight(L.tower);
    L.item = null;
    it.seed = rand(10);
    const r = drop(L.tower, it);
    const S = this.S(L);
    const fs = clamp(44 * L.s, 28, 56);
    if (r.result === 'miss') {
      // sails past the tower and splats on the counter
      L.misses++; L.streak = 0;
      this.addDebris(L, it, it.x, th0 + it.h / 2, { vx: r.fallDir * 160, vy: -80, vr: r.fallDir * rand(3, 6) });
      const p = this.toScreen(L, it.x + this.offTop(L), th0);
      particles.popText(p.x, p.y - 30 * S, 'Oops!', '#ffffff', fs);
      L.a.playOnce('surprised', 0.5);
      L.state = 'oops'; L.stT = 0; L.oopsT = 0.45;
      return;
    }
    const th = towerHeight(L.tower);
    const fallenN = r.fallen.length;
    // landing feedback
    const top = this.toScreen(L, it.x + this.offTop(L), Math.min(th, th0 + itemH(it)));
    if (fallenN === 0) {
      it.sq = 1; it.sqv = 0;
      const below = L.tower[L.tower.length - 2];
      if (below) { below.sq = 0.5; if (below.topping) snd('topping-squish', 'squeak', { vol: 0.6 * L.vol }); }
      L.wobV += clamp(r.dx / 90, -1.2, 1.2) * 2.4 + (r.perfect ? 0 : rand(-0.3, 0.3));
      snd('pancake-plop', 'land', { vol: L.vol });
      particles.burst(top.x, this.toScreen(L, 0, th0).y, { type: 'dust', count: 4, speed: [40, 120], size: [8, 16] });
      if (r.perfect) {
        L.streak++; L.perfects++;
        const label = r.sticky ? 'Sticky!' : L.streak >= 3 ? `Perfect x${L.streak}!` : 'Perfect!';
        particles.popText(top.x, top.y - 70 * S, label, '#8ef0a8', fs);
        particles.ring(top.x, top.y - 10 * S, '#ffffff', 120 * S, 0.4);
        particles.burst(top.x, top.y, { type: 'sparkle', count: 6, colors: ['#ffffff', '#fff3a6', L.p.color], speed: [80, 260] });
        snd('pancake-perfect', 'collect', { step: Math.min(L.streak, 8), vol: L.vol });
        L.a.playOnce('cheer', 0.45);
        if (L.streak % 3 === 0) {
          L.bonusSyrup = true;
          later(() => particles.popText(top.x, top.y - 120 * S, 'Syrup bonus!', '#ffb45c', fs * 0.9), 250);
          sfx('magic', { vol: 0.5 * L.vol });
          if (!L.p.isAI) L.p.ctrl.rumble(0.3, 100);
        }
      } else {
        L.streak = 0;
      }
      const v = it.value;
      if (!r.perfect || v > 1) particles.popText(top.x + 70 * S, top.y - 20 * S, `+${v}`, it.kind === 'golden' ? '#ffd23f' : '#ffffff', fs * (v > 1 ? 1.1 : 0.85));
      if (it.kind === 'golden') {
        particles.burst(top.x, top.y, { type: 'star', count: 10, colors: ['#ffd23f', '#fff3a6'], speed: [150, 420] });
        sfx('star', { vol: 0.7 * L.vol });
        L.a.playOnce('cheer', 0.5);
      }
    }
    const st = stability(L.tower);
    L.danger = st.danger; L.dir = st.dir;
    if (fallenN === 1) {
      // just the new one slid off the edge
      const f = r.fallen[0];
      L.misses++; L.streak = 0;
      this.addDebris(L, f, f.x, th + f.h / 2, { vx: r.fallDir * 220, vy: 60, vr: r.fallDir * rand(4, 7) });
      particles.popText(top.x, top.y - 40 * S, 'Whoops!', '#ffffff', fs);
      L.a.playOnce('surprised', 0.5);
      L.state = 'oops'; L.stT = 0; L.oopsT = 0.45;
    } else if (fallenN >= 2) {
      this.topple(L, r.fallen, r.fallDir);
    } else {
      if (L.danger > 0.72 && !r.perfect) {
        particles.popText(top.x, top.y - 110 * S, 'Wobbly!', '#ffb3d9', fs * 0.85);
        L.a.emote('sweat', 1);
      }
      this.nextItem(L);
    }
    L.score = towerValue(L.tower);
    if (L.score > L.best) { L.best = L.score; L.bestH = th; }
    L.badgePop = 1;
    const m = Math.floor(L.score / 10);
    if (m > L.milestone && fallenN === 0) {
      L.milestone = m;
      particles.ring(top.x, top.y, L.p.color, 240 * S, 0.6);
      particles.burst(top.x, top.y, { type: 'confetti', count: 18, speed: [200, 500] });
      particles.popText(top.x, top.y - 160 * S, `${m * 10}!`, '#ffd23f', fs * 1.3);
      sfx('fanfare', { vol: 0.45 * L.vol });
      L.a.say(pick(['Yay!', 'So tall!', 'Wow!']), 1.2, 'yay');
    }
    if (L.danger > 0.75 && !L.p.isAI) snd('tower-wobble', 'tock', { vol: 0.5 });
  }

  topple(L, fallen, dir) {
    L.topples++; L.streak = 0;
    const th = towerHeight(L.tower);
    const sup = L.tower[L.tower.length - 1];
    const px = sup ? sup.x + dir * supportHalf(sup) * 0.9 : dir * PLATE_HALF;
    const py = th;
    let y = th;
    // the top non-topping item becomes a pancake hat
    let hatIt = null;
    if (!L.hat) for (let k = fallen.length - 1; k >= 0; k--) if (!fallen[k].topping) { hatIt = fallen[k]; break; }
    const offs = this.offTop(L);
    fallen.forEach((it, k) => {
      const h = itemH(it);
      const cx = it.x + offs, cy = y + h / 2;
      y += h;
      it.covered = false;
      this.addDebris(L, it, cx, cy, {
        tilt: { px: px + offs, py, rx: cx - px - offs, ry: cy - py, dir, delay: 0 },
        hat: it === hatIt,
      });
    });
    const top = this.toScreen(L, px, py + 80);
    const S = this.S(L);
    snd('pancake-crash', 'crumble', { vol: L.vol });
    later(() => { sfx('boom', { vol: 0.5 * L.vol }); snd('crowd-gasp', null, { vol: 0.5 * L.vol }); }, 260);
    later(() => sfx('giggle', { vol: 0.8 * L.vol }), 900);
    fx.shake(fallen.length >= 4 ? 12 : 7, 0.3);
    particles.popText(top.x, top.y - 60 * S, fallen.length >= 4 ? 'TOPPLE!' : 'Wobble-wobble... CRASH!', '#ff8fa8', clamp(58 * L.s, 34, 70) * (fallen.length >= 4 ? 1 : 0.7));
    particles.burst(top.x, top.y, { type: 'star', count: 8, colors: ['#ffd23f', '#ffffff'], speed: [120, 360] });
    if (this.api.camera && this.punchCd <= 0 && (!L.p.isAI || fallen.length >= 5)) {
      this.punchCd = 1.6;
      this.api.camera.punch(top.x, top.y + 120, this.n > 4 ? 1.08 : 1.18, 0.35);
    }
    if (!L.p.isAI) L.p.ctrl.rumble(0.7, 260);
    L.a.playOnce('surprised', 0.45);
    voice(L.p.charId, 'gasp');
    L.dizzyT = 1.9;
    L.wob = 0; L.wobV = -dir * 1.5;
    L.state = 'oops'; L.stT = 0; L.oopsT = 0.9;
  }

  // ---- debris (fallen items) -------------------------------------------------
  addDebris(L, it, x, y, o = {}) {
    L.debris.push({
      it, x, y, vx: o.vx || 0, vy: o.vy || 0, rot: 0, vr: o.vr || 0, t: 0, phase: o.tilt ? 'tilt' : 'fly', tilt: o.tilt || null,
      hat: !!o.hat, bounced: false, restT: 0,
    });
  }

  updateDebris(L, dt) {
    const floorY = -PLATE_H;
    for (const d of L.debris) {
      d.t += dt;
      const h = itemH(d.it);
      if (d.phase === 'tilt') {
        const tl = d.tilt, u = Math.min(1, d.t / TILT_T), phi = 0.8 * u * u;
        const rot = (ph) => { const a = -tl.dir * ph; return { x: tl.px + tl.rx * Math.cos(a) - tl.ry * Math.sin(a), y: tl.py + tl.rx * Math.sin(a) + tl.ry * Math.cos(a) }; };
        const p = rot(phi);
        d.x = p.x; d.y = p.y; d.rot = tl.dir * phi;
        if (u >= 1) {
          const q = rot(phi + 0.01), w = 2 * 0.8 / TILT_T;
          d.vx = (q.x - p.x) / 0.01 * w * rand(0.8, 1.25) + tl.dir * rand(20, 120);
          d.vy = (q.y - p.y) / 0.01 * w * rand(0.7, 1.1) + rand(80, 260);
          d.vr = tl.dir * rand(3, 7);
          if (d.hat) this.startHatFlight(L, d); else d.phase = 'fly';
        }
      } else if (d.phase === 'hatfly') {
        const hf = d.hf, u = Math.min(1, d.t / hf.dur);
        const head = this.headDesign(L);
        d.x = lerp(hf.x0, head.x, u); d.y = lerp(hf.y0, head.y, u) + Math.sin(u * Math.PI) * hf.arc;
        d.rot = (1 - u) * hf.spin;
        if (u >= 1) { this.putHat(L, d.it); d.dead = true; }
      } else if (d.phase === 'fly') {
        d.vy -= 2400 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
        const ext = Math.abs(Math.sin(d.rot)) * d.it.w / 2 + Math.abs(Math.cos(d.rot)) * h / 2;
        if (d.vy < 0 && d.y - ext <= floorY) {
          d.y = floorY + ext;
          const p = this.toScreen(L, d.x, floorY);
          if (!d.bounced && d.vy < -350) {
            d.bounced = true; d.vy = -d.vy * 0.28; d.vx *= 0.55; d.vr *= 0.4;
            sfx('splat', { vol: 0.55 * L.vol });
            particles.burst(p.x, p.y, { type: 'shard', count: 5, colors: CRUMB[d.it.kind], speed: [120, 320], size: [6, 12] });
            if (d.it.topping) particles.burst(p.x, p.y, { type: 'drop', count: 6, colors: CRUMB[d.it.kind], angle: -Math.PI / 2, spread: 1.3 });
          } else {
            d.phase = 'rest'; d.vx = 0; d.vy = 0; d.vr = 0; d.restT = 0;
            d.rotTarget = Math.round(d.rot / Math.PI) * Math.PI; d.y = floorY + h / 2;
            if (!d.bounced) { sfx('splat', { vol: 0.5 * L.vol }); particles.burst(p.x, p.y, { type: 'dust', count: 3 }); }
            d.squash = 1;
          }
        }
      } else if (d.phase === 'rest') {
        d.restT += dt; d.squash = Math.max(0, (d.squash || 0) - dt * 4);
        d.rot = damp(d.rot, d.rotTarget ?? 0, 22, dt);
        if (d.restT > 1.6) d.dead = true;
      }
    }
    if (L.debris.some((d) => d.dead)) L.debris = L.debris.filter((d) => !d.dead);
  }

  /** The character's head top, in this lane's design coords. */
  headDesign(L) {
    const hp = L.a.anchor('head'), S = this.S(L);
    return { x: (hp.x - L.cx) / S, y: (BASE_Y - hp.y) / S - PLATE_H + 6 };
  }

  startHatFlight(L, d) {
    const head = this.headDesign(L);
    d.phase = 'hatfly'; d.t = 0;
    d.hf = { x0: d.x, y0: d.y, dur: 0.6, arc: 120 + Math.max(0, d.y - head.y) * 0.1, spin: d.rot + Math.sign(head.x - d.x || -1) * -TAU };
  }

  putHat(L, it) {
    L.hat = { it, t: 3.2 };
    const a = L.a;
    L.hatAtt = a.attach((g, info) => {
      const w = info.h * 0.8, k = w / it.w;
      g.save(); g.translate(info.head.x, info.head.y + it.h * k * 0.25); g.rotate(Math.sin(performance.now() / 180) * 0.08 - 0.1);
      g.scale(k, k);
      drawItem(g, { ...it, covered: false, glaze: it.glaze, syrup: false }, this.t, 0);
      g.restore();
    });
    a.squash(0.45);
    snd('boing', 'bounce', { vol: 0.7 * L.vol });
    const hp = a.anchor('head');
    particles.burst(hp.x, hp.y, { type: 'star', count: 6, colors: ['#ffd23f', '#ffffff'], speed: [80, 220] });
    a.say(pick(['Hee hee!', 'A pancake hat!', 'Oopsie!']), 1.3, 'laugh');
  }

  dropHat(L) {
    const it = L.hat.it;
    if (L.hatAtt) { L.a.detach(L.hatAtt); L.hatAtt = null; }
    const head = this.headDesign(L);
    L.hat = null;
    this.addDebris(L, it, head.x, head.y, { vx: -120, vy: 380, vr: -5 });
  }

  // ---- CPU -------------------------------------------------------------------
  aiThink(L, dt) {
    const ai = L.ai, p = L.p, lvl = clamp(p.aiLevel ?? 0, 0, 2);
    ai.cool -= dt;
    if (!ai.ready) {
      ai.wait -= dt;
      if (ai.wait > 0) return;
      const smart = lvl === 2 || (lvl === 1 && chance(0.55));
      let err = AI_ERR[lvl] * gauss();
      if (chance(aiProfile(p).mistake * 0.6)) err *= 2.2;
      ai.tgt = clamp(aiTarget(L.tower, L.item, smart) + err, -RANGE * 0.97, RANGE * 0.97);
      ai.passes = lvl === 0 ? (chance(0.35) ? 1 : 0) : lvl === 1 && chance(0.1) ? 1 : 0;
      ai.ready = true;
    }
    const target = clamp(ai.tgt + this.offTop(L), -RANGE * 0.98, RANGE * 0.98);
    const step = this.speed(L) * dt;
    const d = L.panDir * (target - L.panX);
    if (d <= step * 0.5 && d > -step * 0.5 && ai.cool <= 0) {
      if (ai.passes > 0) { ai.passes--; ai.cool = 0.25; } else p.ctrl.press('a');
    }
  }

  // ---- finish ----------------------------------------------------------------
  finish() {
    if (this.finished) return;
    this.finished = true;
    const scores = this.lanes.map((L) => L.score);
    const placements = placementsFromScores(scores);
    const stats = this.lanes.map((L) => `${L.score} pt${L.score === 1 ? '' : 's'}${L.perfects ? `, ${L.perfects} perfect` : ''}`);
    const best = Math.max(...scores);
    let focus;
    this.lanes.forEach((L, i) => {
      const win = placements[i] === 1 && (best > 0 || this.n === 1);
      L.endPose = win ? 'celebrate' : 'clap';
      if (win) {
        const p = this.toScreen(L, 0, towerHeight(L.tower) + 40);
        particles.burst(p.x, p.y, { type: 'confetti', count: 40, speed: [250, 700] });
        if (!focus) focus = { x: L.cx, y: Math.max(TOP_Y + 200, p.y + 160), zoom: this.n > 4 ? 1.1 : 1.25 };
        L.a.say(pick(['Yay!', 'So tall!', 'Pancakes!']), 1.6, 'yay');
      }
    });
    sfx('cheer', { vol: 0.6 });
    this.api.finish({ placements, stats, focus, solo: scores[0] });
  }

  // ---- drawing -----------------------------------------------------------------
  drawBackground(g) {
    const img = art('bg/pancake-tower');
    if (img) { g.drawImage(img, 0, 0, W, H); return; }
    if (!this.bg) {
      try {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        paintKitchen(c.getContext('2d'));
        this.bg = c;
      } catch (e) { this.bg = null; }
    }
    if (this.bg) g.drawImage(this.bg, 0, 0);
    else paintKitchen(g);
  }

  draw(g) {
    this.drawBackground(g);
    // lane columns
    for (const L of this.lanes) {
      const x0 = L.lx - this.slotW / 2 + 8, w = this.slotW - 16;
      g.save();
      ui.roundRect(g, x0, TOP_Y, w, BASE_Y - TOP_Y + 30, 28);
      g.fillStyle = 'rgba(255,255,255,0.26)'; g.fill();
      g.lineWidth = 4; g.strokeStyle = L.p.color; g.globalAlpha = 0.45; g.stroke();
      g.restore();
    }
    for (const L of this.lanes) this.drawLane(g, L);
    // counter front badges
    const leader = Math.max(...this.lanes.map((L) => L.score));
    for (const L of this.lanes) this.drawBadge(g, L, leader > 0 && L.score === leader);
  }

  drawLane(g, L) {
    const S = this.S(L), th = towerHeight(L.tower), t = this.t;
    // best-height flag
    if (L.best > L.score && L.bestH > th + 10) {
      g.save(); g.translate(L.cx, BASE_Y); g.scale(S, S);
      const y = -(PLATE_H + L.bestH);
      g.setLineDash([14, 10]); g.strokeStyle = 'rgba(36,22,63,0.45)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-170, y); g.lineTo(170, y); g.stroke(); g.setLineDash([]);
      g.fillStyle = L.p.color; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.beginPath(); g.moveTo(170, y); g.lineTo(170, y - 46); g.stroke();
      g.beginPath(); g.moveTo(170, y - 46); g.lineTo(212, y - 36); g.lineTo(170, y - 26); g.closePath(); g.fill(); g.stroke();
      g.restore();
      const p = this.toScreen(L, 150, L.bestH + 26);
      ui.text(g, String(L.best), p.x, p.y, { size: clamp(30 * S, 16, 34), color: '#ffffff', strokeWidth: 5 });
    }
    // character (behind the tower; in front of it in narrow 6-8 player lanes,
    // where the zoomed-in plate fills the lane and would hide them)
    const front = this.n > 5;
    if (!front) L.a.draw(g, { ring: L.p.color });
    // plate + tower
    g.save(); g.translate(L.cx, BASE_Y); g.scale(S, S);
    drawPlate(g, L.p.color, 300, PLATE_H);
    let y = 0;
    for (const it of L.tower) {
      const h = itemH(it);
      const yc = y + h / 2;
      g.save();
      g.translate(it.x + this.offAt(L, yc), -(PLATE_H + y));
      g.rotate(this.rotAt(L, yc));
      drawItem(g, it, t, it.sq || 0);
      g.restore();
      y += h;
    }
    // pan + its item
    if (L.panAlpha > 0.01) this.drawPanAndItem(g, L, th);
    // falling item
    if (L.state === 'fall' && L.item) {
      g.save(); g.translate(L.fall.vx, -(PLATE_H + L.fall.y)); drawItem(g, L.item, t); g.restore();
    }
    // debris
    for (const d of L.debris) {
      const h = itemH(d.it);
      g.save();
      g.translate(d.x, -(PLATE_H + d.y));
      g.rotate(d.rot);
      if (d.phase === 'rest') {
        const fade = d.restT > 1.1 ? 1 - (d.restT - 1.1) / 0.5 : 1;
        g.globalAlpha = clamp(fade, 0, 1);
        const sq = d.squash || 0; g.scale(1 + sq * 0.25, 1 - sq * 0.3);
      }
      g.translate(0, h / 2);
      drawItem(g, d.it, t);
      g.restore();
    }
    g.restore();
    if (front) L.a.draw(g, { ring: L.p.color });
    // tag
    if (!this.finished && (!L.p.isAI || this.time < 4.5)) {
      const hp = L.a.anchor('head');
      ui.playerTag(g, L.p, hp.x, hp.y - 18 - (L.hat ? 40 * L.a.scale : 0) - (L.a.emotes.length ? 34 : 0));
    }
  }

  drawPanAndItem(g, L, th) {
    const t = this.t;
    const tilt = Math.sin(Math.min(1, L.panTilt) * Math.PI) * 0.55 * (L.panTilt > 0 ? 1 : 0);
    const bob = Math.sin(t * 3 + L.i) * 5;
    const px = L.panX, py = -(PLATE_H + L.panY) + bob;
    g.save();
    g.globalAlpha = L.panAlpha;
    // drop guide while aiming
    if (L.state === 'slide' && L.item && !this.ending) {
      const topVis = (L.tower.length ? L.tower[L.tower.length - 1].x : 0) + this.offTop(L);
      const aligned = Math.abs(px - topVis) <= PERFECT;
      g.setLineDash([10, 12]); g.lineWidth = 5;
      g.strokeStyle = aligned ? 'rgba(80,220,120,0.95)' : 'rgba(255,255,255,0.8)';
      g.beginPath(); g.moveTo(px, py + 4); g.lineTo(px, -(PLATE_H + th) - 4); g.stroke(); g.setLineDash([]);
      g.save(); g.translate(px, -(PLATE_H + th)); g.globalAlpha *= 0.28;
      drawItem(g, L.item, t); g.restore();
      if (aligned) { g.fillStyle = 'rgba(80,220,120,0.9)'; g.beginPath(); g.ellipse(px, -(PLATE_H + th), 22, 8, 0, 0, TAU); g.fill(); }
    }
    // syrup pour
    if (L.state === 'pour') {
      const u = clamp(L.stT / POUR_T, 0, 1);
      const topVis = (L.tower.length ? L.tower[L.tower.length - 1].x : 0) + this.offTop(L);
      const in_ = Math.min(1, u / 0.2), out = u > 0.85 ? (u - 0.85) / 0.15 : 0;
      const bx = topVis + 70, by = -(PLATE_H + th) - 150 - (1 - in_) * 120 - out * 120;
      const ang = -2.3 * Math.min(1, u / 0.3) * (1 - out);
      if (u > 0.25 && u < 0.85) {
        const sx = bx + Math.cos(ang - Math.PI / 2) * 72, sy = by + Math.sin(ang - Math.PI / 2) * 72;
        g.strokeStyle = '#c96e18'; g.lineWidth = 10 + Math.sin(t * 20) * 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx - 10, sy + 40, topVis, -(PLATE_H + th) - 4); g.stroke();
      }
      g.save(); g.translate(bx, by); g.rotate(ang); g.globalAlpha *= 1 - out; drawSyrupBottle(g); g.restore();
    }
    // the pan (and its item, flipping)
    if (L.state !== 'pour') {
      g.save(); g.translate(px, py); g.rotate(-tilt * (L.panDir > 0 ? 1 : 1));
      const it = L.state === 'fall' ? null : L.item;
      if (it) {
        let lift = 0, rot = 0;
        if (L.state === 'flip') { const u = clamp(L.stT / FLIP_T, 0, 1); lift = 4 * u * (1 - u) * 140; rot = u * TAU; }
        g.save(); g.translate(0, -panItemLift() - lift - it.h / 2); g.rotate(rot); g.translate(0, it.h / 2); drawItem(g, it, t); g.restore();
      }
      // the rightmost lane's pan is mirrored so its handle stays on screen
      const flipPan = this.n > 1 && L.i === this.n - 1;
      if (flipPan) g.scale(-1, 1);
      drawPan(g, t, clamp(L.panDir * (flipPan ? -0.8 : 0.8), -1, 1), L.streak > 0 ? 1 : 0.5, L.p.color);
      g.restore();
    }
    g.restore();
  }

  drawBadge(g, L, lead) {
    const r = 30 * clamp(L.s, 0.75, 1.15), x = L.cx, y = BASE_Y + 70;
    const k = 1 + L.badgePop * 0.25;
    g.save(); g.translate(x, y); g.scale(k, k);
    g.fillStyle = 'rgba(36,22,63,0.25)'; g.beginPath(); g.arc(3, 5, r, 0, TAU); g.fill();
    g.fillStyle = L.p.color; g.strokeStyle = NAVY; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
    ui.text(g, String(L.score), 0, 2, { size: r * 1.15, color: '#ffffff', strokeWidth: Math.max(4, r * 0.18), weight: 800 });
    if (lead) { g.translate(0, -r * 0.92); g.rotate(Math.sin(this.t * 3) * 0.1); drawCrown(g, r * 1.1); }
    g.restore();
  }

  drawHUD(g) {
    const vals = this.lanes.map((L) => L.score);
    const best = Math.max(...vals);
    ui.scoreboard(g, this.players, vals, {
      y: 22, avoidCenter: true,
      format: (v) => `${v}`,
      highlight: vals.map((v) => best > 0 && v === best),
      expr: this.lanes.map((L) => (L.dizzyT > 0 ? 'sad' : L.streak >= 2 ? 'happy' : 'neutral')),
    });
    if (this.time < 4.5 && !this.ending) {
      g.save(); g.globalAlpha = clamp(4.5 - this.time, 0, 1);
      const y = 190;
      ui.panel(g, W / 2 - 400, y - 36, 800, 72, { r: 36, fill: '#fff8ec' });
      ui.glyph(g, 'a', W / 2 - 350, y, 50, { pulse: true });
      ui.text(g, this.n === 1 ? 'Drop it right on top! How tall can you go?' : 'Drop it right on top! Tallest tower wins!', W / 2 + 30, y + 1, { size: 32, color: NAVY, stroke: false, weight: 700, maxWidth: 680 });
      g.restore();
    }
    if (this.msg) ui.banner(g, this.msg.text, this.msg.t, { size: 96, y: 300, color: this.msg.color, strokeWidth: 20 });
    if (this.ending && !this.finished) ui.banner(g, 'Time!', this.endT, { size: 120, y: 320, color: '#ffffff' });
  }

  destroy() {
    for (const L of this.lanes) if (L.hatAtt) L.a.detach(L.hatAtt);
  }
}

// ---- the kitchen backdrop (cached) --------------------------------------------
function paintKitchen(g) {
  // wall
  const gr = g.createLinearGradient(0, 0, 0, BASE_Y);
  gr.addColorStop(0, '#fff1b8'); gr.addColorStop(1, '#ffe0ec');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.4)';
  for (let x = 0; x < W; x += 120) g.fillRect(x, 0, 56, BASE_Y);
  // round window
  g.save();
  g.translate(W / 2, 330);
  g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 8;
  g.beginPath(); g.arc(0, 0, 230, 0, TAU); g.fill(); g.stroke();
  g.save(); g.beginPath(); g.arc(0, 0, 200, 0, TAU); g.clip();
  const sk = g.createLinearGradient(0, -200, 0, 200); sk.addColorStop(0, '#7fd3ff'); sk.addColorStop(1, '#d4f1ff');
  g.fillStyle = sk; g.fillRect(-200, -200, 400, 400);
  ui.cloud(g, -80, -60, 0.8); ui.cloud(g, 110, 40, 0.6); ui.cloud(g, -20, 120, 0.5);
  g.fillStyle = '#8ee59b'; g.beginPath(); g.ellipse(0, 230, 300, 90, 0, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = NAVY; g.lineWidth = 8;
  g.beginPath(); g.moveTo(-200, 0); g.lineTo(200, 0); g.moveTo(0, -200); g.lineTo(0, 200); g.stroke();
  g.restore();
  // hanging pans and whisks along the top edges
  const hang = (x, y, kind, s) => {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.strokeStyle = NAVY; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, -60); g.lineTo(0, 0); g.stroke();
    if (kind === 0) {
      g.fillStyle = '#e8925a'; g.beginPath(); g.ellipse(0, 70, 52, 52, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#f7b98a'; g.beginPath(); g.ellipse(-12, 60, 30, 30, 0, 0, TAU); g.fill();
      g.fillStyle = '#c96e3a'; ui.roundRect(g, -8, -4, 16, 26, 6); g.fill(); g.stroke();
    } else if (kind === 1) {
      g.fillStyle = '#c3cbe0'; ui.roundRect(g, -6, 0, 12, 40, 5); g.fill(); g.stroke();
      g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 3, 40); g.quadraticCurveTo(i * 16, 90, 0, 112); } g.stroke();
    } else {
      g.fillStyle = '#ffd23f'; ui.roundRect(g, -8, 0, 16, 60, 6); g.fill(); g.stroke();
      g.fillStyle = '#ff9fc8'; ui.roundRect(g, -28, 60, 56, 46, 12); g.fill(); g.stroke();
    }
    g.restore();
  };
  g.strokeStyle = '#c98a4b'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(40, 150); g.lineTo(560, 150); g.moveTo(W - 560, 150); g.lineTo(W - 40, 150); g.stroke();
  [[90, 0], [200, 1], [300, 2], [410, 0], [510, 1]].forEach(([x, k], i) => hang(x, 210, k, 0.8 + (i % 2) * 0.15));
  [[W - 90, 2], [W - 200, 0], [W - 300, 1], [W - 410, 0], [W - 510, 2]].forEach(([x, k], i) => hang(x, 210, k, 0.8 + (i % 2) * 0.15));
  // shelves with syrup and berry jars at the sides
  for (const side of [0, 1]) {
    const sx = side ? W - 330 : 30;
    for (const sy of [520, 720]) {
      g.fillStyle = '#c98a4b'; g.strokeStyle = NAVY; g.lineWidth = 5;
      ui.roundRect(g, sx, sy, 300, 18, 6); g.fill(); g.stroke();
      for (let i = 0; i < 4; i++) {
        const bx = sx + 40 + i * 72, by = sy;
        if ((i + side + (sy > 600 ? 1 : 0)) % 2) {
          g.fillStyle = '#e08a2c'; ui.roundRect(g, bx - 16, by - 70, 32, 70, 10); g.fill(); g.stroke();
          g.fillStyle = '#ff4d6d'; ui.roundRect(g, bx - 8, by - 86, 16, 18, 4); g.fill(); g.stroke();
        } else {
          g.fillStyle = 'rgba(220,240,255,0.9)'; ui.roundRect(g, bx - 24, by - 58, 48, 58, 12); g.fill(); g.stroke();
          g.fillStyle = '#ff4d6d'; for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(bx - 10 + (j % 2) * 20, by - 16 - Math.floor(j / 2) * 18, 8, 0, TAU); g.fill(); }
          g.fillStyle = '#ffd23f'; ui.roundRect(g, bx - 26, by - 66, 52, 12, 5); g.fill(); g.stroke();
        }
      }
    }
  }
  // counter
  const ct = g.createLinearGradient(0, BASE_Y, 0, BASE_Y + 28);
  ct.addColorStop(0, '#ffd6e8'); ct.addColorStop(1, '#ff9fc8');
  g.fillStyle = ct; g.fillRect(0, BASE_Y - 4, W, 30);
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, BASE_Y - 2, W, 5);
  g.fillStyle = NAVY; g.fillRect(0, BASE_Y + 26, W, 5);
  // checker tiles
  const ts = 52;
  for (let y = BASE_Y + 31, r = 0; y < H; y += ts, r++) {
    for (let x = 0, c = 0; x < W; x += ts, c++) { g.fillStyle = (r + c) % 2 ? '#bff0de' : '#ffffff'; g.fillRect(x, y, ts, ts); }
  }
  g.fillStyle = 'rgba(36,22,63,0.12)'; g.fillRect(0, BASE_Y + 31, W, 12);
}
