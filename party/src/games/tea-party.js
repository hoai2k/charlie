// Teddy Tea Party (Molly Party) - teddies, a bunny and a fancy unicorn sit at
// a garden tea table and think of a treat (picture bubble). Dash to a treat
// cart, grab the matching treat (A) and toss it over (A). Happy guests do
// silly reactions: teddy tips the tea on his own head, the unicorn's hat
// pops off, bunny ears helicopter... A wrong treat just boings back.
// Every treat fills the party heart garland; a full garland = HOORAY party.
// Gentle counting: everyone scores, ties share.
//
// Art hooks (all optional, procedural fallbacks ship today): bg/tea-party,
// thumb/tea-party, prop/tea-table, prop/tea-teapot, prop/tea-cart,
// prop/tea-cup-pink|cupcake|strawberry|cookie|cake,
// prop/tea-guest-<teddy|honey|bunny|unicorn|panda>[-happy].
// Sounds with synth fallbacks: tea-toss, tea-catch, tea-slurp, tea-spill,
// tea-hat-pop, tea-ears, tea-boing-back, tea-hooray, tea-pickup.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { aiProfile, reactionTime, Brain, steer } from '../engine/ai.js';
import { clamp, rand, pick, chance, TAU, placementsFromScores, ease } from '../engine/util.js';
import {
  ITEMS, ITEM_COLOR, drawItem, drawGuest, drawHat, drawBubble, drawCart, drawTable, drawTeapot, drawGarden, TABLE,
} from './tea-party/draw.js';

export const meta = {
  id: 'tea-party',
  title: 'Teddy Tea Party',
  category: 'molly',
  type: 'Everyone plays',
  goal: 'Give each tea party guest the treat in their bubble!',
  controls: [['stick', 'Run'], ['a', 'Grab a treat / toss it to a guest']],
  tips: ['Look at the bubble: pink cup, cupcake, strawberry or cookie.', 'Wrong treat? It just bounces back. Try another guest!', 'A rainbow cake is a super treat: 3 hearts!'],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = w / 400;
    g.translate(x, y); g.scale(s, s);
    const hh = h / s;
    const grd = g.createLinearGradient(0, 0, 0, hh);
    grd.addColorStop(0, '#9fdcff'); grd.addColorStop(1, '#c9f2b8');
    g.fillStyle = grd; g.fillRect(0, 0, 400, hh);
    ui.cloud(g, 70, hh * 0.18, 0.4, '#fff', 0.9);
    // guests
    g.save(); g.translate(130, hh * 0.72); g.scale(0.55, 0.55);
    drawGuest(g, 'teddy', { happy: true, t });
    g.save(); g.translate(0, -230 + Math.sin(t * 4) * 6); g.rotate(Math.PI + Math.sin(t * 3) * 0.1); drawItem(g, 'cup', 110, t); g.restore();
    g.restore();
    g.save(); g.translate(275, hh * 0.72); g.scale(0.55, 0.55); drawGuest(g, 'unicorn', { t }); g.restore();
    // table
    g.fillStyle = '#ffd6ea'; g.fillRect(0, hh * 0.7, 400, hh * 0.3);
    g.fillStyle = 'rgba(255,111,177,0.35)';
    for (let i = 0; i < 18; i++) g.fillRect(i * 24, hh * 0.7, 12, hh * 0.3);
    g.fillStyle = '#fff3f9'; g.fillRect(0, hh * 0.68, 400, 16);
    // tea drops
    g.fillStyle = '#c98a4a';
    for (let i = 0; i < 4; i++) { const k = (t * 1.5 + i * 0.25) % 1; g.beginPath(); g.arc(100 + i * 18, hh * 0.18 + k * 60, 5, 0, TAU); g.fill(); }
    // flying cupcake
    g.save(); g.translate(345, hh * 0.25 + Math.sin(t * 3) * 8); g.rotate(Math.sin(t * 2) * 0.3); drawItem(g, 'cupcake', 60, t); g.restore();
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 60;
const RUSH_AT = 15;
const SEAT_Y = 478;
const FLOOR = { x0: 110, x1: W - 110, y0: 660, y1: 850 };
const MAX_SPEED = 640;
const ACCEL = 4200;
const CARTS = [560, 1360];
const CART_Y = 1060;
const SHELF_Y = CART_Y - 198;
const SLOT_DX = [-150, -50, 50, 150];
const CAKE_DX = 262;           // the cake sits on the outer end of each cart
const REACH = 150;             // pick-up distance from a slot
const TOSS_DX = 300;           // how far sideways a guest can be and still get your toss
const CPU_CAP = [0.7, 0.8, 0.9];  // CPU speed scale per level: always gentler than the other shelves

const REACTIONS = {
  teddy: { cup: 'spill', any: ['munch', 'spill', 'hiccup'] },
  honey: { cup: 'spill', any: ['hiccup', 'munch'] },
  panda: { cup: 'spill', any: ['flip', 'munch'] },
  bunny: { any: ['ears', 'ears', 'munch'] },
  unicorn: { any: ['hat', 'hat', 'munch'] },
};
const REACT_T = { spill: 2.0, hat: 1.9, ears: 1.7, hiccup: 1.8, flip: 1.6, munch: 1.3, hooray: 1.6 };

const snd = (k, fb, o = {}) => sfx(k, { ...o, fallback: fb });

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;
    this.time = 0;
    this.timeLeft = DURATION;
    this.done = false;
    this.rush = false; this.rushT = 0;
    this.scale = n <= 4 ? 1 : n <= 6 ? 0.9 : 0.82;
    this.goal = clamp(5 + n, 6, 12);     // hearts in the party garland
    this.hearts = 0; this.parties = 0; this.hoorayT = -9;
    this.heartPop = [];                  // { i, t } garland heart pops
    this.tosses = [];
    this.cakeT = rand(10, 14);
    // guests
    const kinds = n <= 3 ? ['teddy', 'bunny', 'unicorn', 'honey'] : ['teddy', 'bunny', 'unicorn', 'honey', 'panda'];
    const xs = kinds.length === 4 ? [440, 730, 1190, 1480] : [400, 680, 960, 1240, 1520];
    this.teapots = kinds.length === 4 ? [[960, 500, 1]] : [[540, 498, 0.6], [1380, 498, 0.6]];
    this.guests = kinds.map((kind, i) => ({
      kind, i, x: xs[i], state: 'wait', st: rand(0.1, 0.6), wish: null, wishT: 0,
      react: null, rt: 0, bob: rand(TAU), sq: 0, shake: 0, shakeT: 0, blink: 0, blinkT: rand(1, 4),
      hatY: 0, hatR: 0, cupOn: 0, served: 0,
    }));
    // every guest has a wish ready by GO
    for (const gu of this.guests) this.newWish(gu, true);
    // players
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? W / 2 : 300 + ((W - 600) * i) / (n - 1);
      const y = FLOOR.y0 + 60 + (i % 2) * 70;
      const a = new Actor(p, { scale: this.scale, x, y });
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      return {
        p, a, i, x, y, vx: 0, vy: 0, held: null, heldT: 0, score: 0, served: 0, cool: 0,
        brain: new Brain(p), plan: null, popT: 0, popN: 0,
      };
    });
  }

  // ------------------------------------------------------------------ wishes
  newWish(gu, instant = false) {
    const taken = this.guests.filter((o) => o !== gu && o.wish).map((o) => o.wish);
    let opts = ITEMS.filter((k) => !taken.includes(k));
    if (!opts.length || chance(0.25)) opts = ITEMS;
    let wish = pick(opts);
    if (!instant && this.cakeT <= 0 && !this.guests.some((o) => o.wish === 'cake')) { wish = 'cake'; this.cakeT = this.rush ? rand(6, 8) : rand(11, 15); }
    gu.wish = wish; gu.state = 'wish'; gu.wishT = 0; gu.sq = 0.35; gu.popIn = 0;
    if (!instant) {
      snd('pop', 'pop', { vol: 0.35, rate: rand(1.1, 1.3) });
      if (wish === 'cake') { sfx('sparkle'); particles.burst(gu.x, 180, { type: 'star', count: 10, colors: RAINBOW }); }
    }
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    this.updateGuests(dt);
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); e.a.update(dt); }
  }

  update(dt) {
    this.t += dt;
    this.time += dt;
    this.timeLeft = Math.max(0, DURATION - this.time);
    if (!this.rush && this.timeLeft <= RUSH_AT) this.startRush();
    if (this.rush) this.rushT += dt;
    this.cakeT -= dt;
    this.updateGuests(dt);
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate(dt);
    this.updateTosses(dt);
    for (const e of this.ents) { e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    this.updateGuests(dt);
    this.updateTosses(dt);
    for (const e of this.ents) e.a.update(dt);
  }

  startRush() {
    this.rush = true; this.rushT = 0;
    sfx('whistle'); snd('tea-hooray', 'fanfare', { vol: 0.6 }); fx.flash('#ffd6ea', 0.2); fx.shake(8, 0.3);
    particles.confettiRain(W, 70);
    for (const gu of this.guests) { gu.sq = 0.5; }
  }

  updateGuests(dt) {
    for (const gu of this.guests) {
      gu.bob += dt * (gu.state === 'wish' ? 3 + Math.min(gu.wishT, 8) * 0.5 : 2.5);
      gu.sq *= Math.exp(-6 * dt);
      gu.popIn = Math.min(1, (gu.popIn ?? 1) + dt * 4);
      gu.blinkT -= dt; if (gu.blinkT <= 0) { gu.blink = 0.12; gu.blinkT = rand(2, 4.5); }
      gu.blink = Math.max(0, gu.blink - dt);
      if (gu.shakeT > 0) { gu.shakeT -= dt; gu.shake = Math.sin(gu.shakeT * 30) * clamp(gu.shakeT * 2, 0, 1); } else gu.shake = 0;
      if (gu.state === 'wish') gu.wishT += dt;
      else if (gu.state === 'wait') {
        gu.st -= dt;
        if (gu.st <= 0 && !this.done) this.newWish(gu);
      } else if (gu.state === 'happy') {
        gu.rt += dt;
        this.reactionFx(gu, dt);
        if (gu.rt >= REACT_T[gu.react]) { gu.state = 'wait'; gu.st = this.rush ? rand(0.15, 0.4) : rand(0.35, 0.8); gu.react = null; gu.cupOn = 0; gu.hatY = 0; gu.hatR = 0; }
      }
    }
  }

  /** Per-frame bits of each silly reaction. */
  reactionFx(gu, dt) {
    const r = gu.react, k = gu.rt, hx = gu.x, hy = SEAT_Y - 148;
    if (r === 'spill') {
      if (k > 0.25 && !gu.cupOn) {
        gu.cupOn = 1; snd('tea-spill', 'splash', { vol: 0.7 }); fx.shake(5, 0.15);
        particles.burst(hx, hy - 70, { type: 'drop', count: 18, colors: ['#c98a4a', '#e8b07a', '#9fdcff'], speed: [150, 360] });
      }
      if (gu.cupOn && Math.random() < dt * 22) particles.burst(hx + rand(-60, 60), hy - 40, { type: 'drop', count: 1, colors: ['#c98a4a', '#e8b07a'], speed: [10, 60] });
    } else if (r === 'hat') {
      // hat rockets up, spins, flops back down
      const u = clamp(k / 1.5, 0, 1);
      gu.hatY = -Math.sin(u * Math.PI) * 300; gu.hatR = u * TAU * 2;
      if (k > 1.5 && !gu.hatLanded) { gu.hatLanded = true; snd('tea-boing-back', 'boing', { vol: 0.5 }); gu.sq = 0.4; }
    } else if (r === 'ears') {
      gu.earSpin = k * 26;
      if (Math.random() < dt * 10) particles.burst(hx, hy - 60, { type: 'sparkle', count: 1, colors: ['#fff', '#ffb3d1'], speed: [60, 160] });
    } else if (r === 'hiccup') {
      const n = Math.floor(k / 0.5);
      if (n > (gu.hic || 0) && n <= 3) {
        gu.hic = n; gu.sq = -0.6; snd('hic', 'pop', { vol: 0.6, rate: 1 + n * 0.08 });
        particles.burst(hx, hy - 20, { type: 'bubble', count: 6, colors: ['#ffffff', '#ffd6ea', '#bff0ff'], speed: [60, 160] });
      }
    } else if (r === 'flip') {
      if (k > 1.1 && !gu.flipLanded) { gu.flipLanded = true; sfx('land'); gu.sq = 0.5; particles.burst(hx, hy - 60, { type: 'star', count: 8, colors: ['#ffd23f'] }); }
    } else if (r === 'munch') {
      if (Math.random() < dt * 9) particles.burst(hx, hy + 30, { type: 'dust', count: 2, colors: ['#e8b064', '#ff9ccf', '#fff'], speed: [60, 200], size: [6, 12] });
    }
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.cool = Math.max(0, e.cool - dt); e.popT = Math.max(0, e.popT - dt);
    if (e.held) e.heldT += dt;
    const ix = this.done ? 0 : c.x, iy = this.done ? 0 : c.y;
    const m = Math.hypot(ix, iy), k = m > 1 ? 1 / m : 1;
    const cap = p.isAI ? CPU_CAP[clamp(p.aiLevel ?? 0, 0, 2)] : 1;
    const tx = ix * k * MAX_SPEED * cap, ty = iy * k * MAX_SPEED * 0.8 * cap;
    const step = ACCEL * dt;
    e.vx += clamp(tx - e.vx, -step, step); e.vy += clamp(ty - e.vy, -step, step);
    e.x = clamp(e.x + e.vx * dt, FLOOR.x0, FLOOR.x1);
    e.y = clamp(e.y + e.vy * dt, FLOOR.y0, FLOOR.y1);
    if (!this.done && c.pressed('a') && e.cool <= 0) this.action(e);
    if (!a._once) {
      const sp = Math.hypot(e.vx, e.vy);
      if (this.done) { /* finish poses set in finish() */ }
      else if (e.held && sp > 40) { a.setPose('carry'); if (Math.abs(e.vx) > 4) a.facing = e.vx > 0 ? 1 : -1; a.speed = clamp(sp / MAX_SPEED, 0, 1); }
      else a.moveAnim(e.vx, e.vy, MAX_SPEED, { run: sp > 420 });
    }
  }

  separate(dt) {
    const E = this.ents;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const A = E[i], B = E[j];
      const dx = B.x - A.x, dy = (B.y - A.y) * 1.6, d = Math.hypot(dx, dy) || 1;
      const min = (A.a.radius + B.a.radius) * 0.7;
      if (d < min) {
        const push = (min - d) * 0.5 * Math.min(1, dt * 12);
        A.x -= (dx / d) * push; B.x += (dx / d) * push; A.y -= (dy / d) * push * 0.5; B.y += (dy / d) * push * 0.5;
      }
    }
    for (const e of E) { e.x = clamp(e.x, FLOOR.x0, FLOOR.x1); e.y = clamp(e.y, FLOOR.y0, FLOOR.y1); }
  }

  /** Cart slots currently on offer: { kind, x, y } (treat sits at y). */
  slots() {
    const out = [];
    const cake = this.guests.some((g) => g.wish === 'cake');
    CARTS.forEach((cx, ci) => {
      ITEMS.forEach((kind, i) => out.push({ kind, x: cx + SLOT_DX[i], y: SHELF_Y }));
      if (cake) out.push({ kind: 'cake', x: cx + (ci === 0 ? -CAKE_DX : CAKE_DX), y: SHELF_Y - 4 });
    });
    return out;
  }

  nearestSlot(e) {
    let best = null, bd = REACH;
    for (const s of this.slots()) {
      const d = Math.hypot(s.x - e.x, (SHELF_Y - 20 - e.y) * 0.7);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  tossTarget(e) {
    const kind = e.held;
    let best = null, bd = 1e9;
    for (const gu of this.guests) {
      if (gu.state !== 'wish' || gu.wish !== kind) continue;
      const d = Math.abs(gu.x - e.x);
      if (d < TOSS_DX && d < bd) { bd = d; best = gu; }
    }
    if (best) return best;
    // no match nearby: toss to the closest guest anyway (they boing it back)
    if (e.y > FLOOR.y0 + 110) return null;
    for (const gu of this.guests) { const d = Math.abs(gu.x - e.x); if (d < 220 && d < bd) { bd = d; best = gu; } }
    return best;
  }

  action(e) {
    const a = e.a;
    const slot = this.nearestSlot(e);
    if (e.held) {
      if (slot && slot.kind !== e.held) return this.grab(e, slot, true);
      const gu = this.tossTarget(e);
      if (gu) return this.toss(e, gu);
      // nothing to do: a little "hm?"
      a.playOnce('think', 0.35); snd('squeak', 'tick', { vol: 0.3 }); e.cool = 0.25;
      return;
    }
    if (slot) return this.grab(e, slot, false);
    a.playOnce('look-around', 0.4); e.cool = 0.2;
  }

  grab(e, slot, swap) {
    const a = e.a;
    if (swap) particles.burst(e.x, e.y - a.height - 40, { type: 'sparkle', count: 5, colors: ['#fff'] });
    e.held = slot.kind; e.heldT = 0; e.cool = 0.18;
    a.playOnce('catch', 0.3); a.squash(0.25);
    snd('tea-pickup', 'collect', { vol: 0.6, step: 4 });
    particles.burst(slot.x, slot.y - 40, { type: 'spark', count: 8, colors: [ITEM_COLOR[slot.kind], '#fff'], speed: [100, 240] });
    if (!e.p.isAI) e.p.ctrl.rumble(0.25, 60);
  }

  toss(e, gu) {
    const a = e.a;
    const from = { x: e.x + a.facing * 10, y: e.y - a.height - 46 };
    a.facing = gu.x >= e.x ? 1 : -1;
    a.playOnce('toss', 0.4); a.squash(-0.2);
    snd('tea-toss', 'whoosh', { vol: 0.5, rate: rand(1.1, 1.3) });
    this.tosses.push({ kind: e.held, by: e, gu, x0: from.x, y0: from.y, x1: gu.x, y1: SEAT_Y - 150, t: 0, dur: 0.42, back: false, spin: rand(-8, 8) });
    e.held = null; e.cool = 0.25;
  }

  updateTosses(dt) {
    for (const s of this.tosses) {
      s.t += dt;
      if (s.back) { // track the thrower's hands
        const e = s.by;
        s.x1 = e.x; s.y1 = e.y - e.a.height - 46;
      }
      const k = clamp(s.t / s.dur, 0, 1);
      s.x = s.x0 + (s.x1 - s.x0) * k;
      s.y = s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * (s.back ? 160 : 230);
      if (Math.random() < dt * 30) particles.burst(s.x, s.y, { type: 'sparkle', count: 1, colors: [ITEM_COLOR[s.kind], '#fff'], speed: [10, 40], size: [8, 14] });
      if (k >= 1) { s.dead = true; s.back ? this.catchBack(s) : this.arrive(s); }
    }
    this.tosses = this.tosses.filter((s) => !s.dead);
  }

  arrive(s) {
    const gu = s.gu, e = s.by;
    if (!this.done && gu.state === 'wish' && gu.wish === s.kind) return this.serve(e, gu, s.kind);
    // wrong treat (or someone was faster): head shake + boing it back
    gu.shakeT = 0.6; gu.sq = 0.3;
    snd('tea-boing-back', 'boing', { vol: 0.6 }); sfx('giggle', { vol: 0.5 });
    particles.burst(gu.x, SEAT_Y - 150, { type: 'star', count: 4, colors: ['#fff'] });
    this.tosses.push({ kind: s.kind, by: e, gu, x0: s.x1, y0: s.y1, x1: e.x, y1: e.y, t: 0, dur: 0.5, back: true, spin: rand(-10, 10) });
  }

  catchBack(s) {
    const e = s.by;
    if (!e.held && !this.done) {
      e.held = s.kind; e.heldT = 0;
      e.a.playOnce('surprised', 0.3); e.a.squash(0.3);
      sfx('pop', { vol: 0.4 });
      if (chance(0.5)) voice(e.p.charId, 'laugh');
    } else particles.burst(s.x1, s.y1, { type: 'smoke', count: 6, colors: ['#fff'] });
  }

  serve(e, gu, kind) {
    const pts = (kind === 'cake' ? 3 : 1) * (this.rush ? 2 : 1);
    e.score += pts; e.served++; gu.served++;
    gu.state = 'happy'; gu.rt = 0; gu.wish = null; gu.sq = 0.5; gu.hic = 0; gu.hatLanded = false; gu.flipLanded = false; gu.earSpin = 0;
    const table = REACTIONS[gu.kind];
    gu.react = kind === 'cake' ? 'hooray' : (kind === 'cup' && table.cup) || pick(table.any);
    gu.wasCup = kind === 'cup';
    const hx = gu.x, hy = SEAT_Y - 150;
    snd('tea-catch', 'collect', { vol: 0.7, step: Math.min(e.served, 12) });
    if (gu.react === 'munch') snd('munch', 'munch', { vol: 0.7 });
    if (gu.react === 'hat') { snd('tea-hat-pop', 'bigpop', { vol: 0.7 }); particles.burst(hx, hy - 80, { type: 'confetti', count: 26 }); }
    if (gu.react === 'ears') snd('tea-ears', 'whoosh', { vol: 0.6, rate: 1.4 });
    if (gu.react === 'flip') sfx('wheee-fall', { vol: 0.6, fallback: 'jump' });
    sfx('giggle', { vol: 0.7 });
    particles.burst(hx, hy, { type: 'heart', count: 8, colors: ['#ff6fb1', '#ff9ccf', '#fff'], speed: [120, 300] });
    // the thrower cheers
    e.a.playOnce(chance(0.5) ? 'cheer' : 'laugh', 0.6); e.a.emote('heart', 0.9);
    this.pop(e, '+' + pts, kind === 'cake' ? '#b58cff' : '#ff6fb1', kind === 'cake' ? 66 : 54);
    if (!e.p.isAI) e.p.ctrl.rumble(0.4, 100);
    if (kind === 'cake') {
      fx.flash('#fff3b0', 0.15); fx.shake(10, 0.3); fx.slowmo(0.5, 0.5);
      particles.burst(hx, hy, { type: 'star', count: 20, colors: RAINBOW, speed: [200, 500] });
      sfx('fanfare', { vol: 0.5 });
      this.api.camera && this.api.camera.punch(hx, hy + 80, 1.2, 0.5);
    }
    // the heart garland
    for (let i = 0; i < pts; i++) {
      if (this.hearts < this.goal) { this.heartPop.push({ i: this.hearts, t: 0 }); this.hearts++; }
    }
    if (this.hearts >= this.goal) this.hooray();
  }

  hooray() {
    this.hearts = 0; this.parties++; this.hoorayT = this.t; this.heartPop = [];
    snd('tea-hooray', 'fanfare'); sfx('cheer', { vol: 0.7 });
    fx.shake(14, 0.4); fx.flash('#fff', 0.2);
    particles.confettiRain(W, 140);
    for (const x of [300, W - 300]) particles.burst(x, 620, { type: 'confetti', count: 40, speed: [400, 900] });
    for (const gu of this.guests) { gu.sq = 0.7; if (gu.state !== 'happy') gu.jumpT = this.t; }
    for (const e of this.ents) { e.a.playOnce('celebrate', 1.0); voice(e.p.charId, 'woo'); }
    this.api.camera && this.api.camera.punch(W / 2, 520, 1.1, 0.6);
  }

  pop(e, str, color, size) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    particles.popText(e.x + (e.popN % 2 ? 40 : -40) * Math.min(1, e.popN), e.y - e.a.height - 80 - (e.popN % 3) * 40, str, color, size);
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, c = p.ctrl, prof = aiProfile(p);
    if (e.brain.ready(dt)) {
      e.brain.wait(reactionTime(p) + (p.aiLevel ? 0 : rand(0.1, 0.5)));
      const busy = new Set(this.ents.filter((o) => o !== e && o.plan && o.plan.gu).map((o) => o.plan.gu));
      for (const s of this.tosses) busy.add(s.gu);
      if (chance(prof.mistake * 0.5)) { e.plan = { wander: true, x: rand(FLOOR.x0 + 100, FLOOR.x1 - 100), y: rand(FLOOR.y0, FLOOR.y1), t: rand(0.6, 1.2) }; }
      else if (e.held) {
        const cands = this.guests.filter((gu) => gu.state === 'wish' && gu.wish === e.held);
        const free = cands.filter((gu) => !busy.has(gu));
        const list = free.length ? free : cands;
        if (list.length) {
          const gu = list.reduce((b, o) => (Math.abs(o.x - e.x) < Math.abs(b.x - e.x) ? o : b));
          e.plan = { gu, kind: e.held, toss: true };
        } else if (e.heldT > 0.9) e.plan = this.aiPickPlan(e, busy, true);
        else e.plan = null;
      } else e.plan = this.aiPickPlan(e, busy, false);
    }
    const pl = e.plan;
    if (!pl) { c.move(0, 0); return; }
    if (pl.wander) {
      pl.t -= dt;
      if (pl.t <= 0) e.plan = null;
      if (steer(p, e.x, e.y, pl.x, pl.y, { arrive: 60 }) < 30) c.move(0, 0);
      return;
    }
    if (pl.toss) {
      if (!e.held || pl.gu.state !== 'wish' || pl.gu.wish !== e.held) { e.plan = null; c.move(0, 0); return; }
      const ty = FLOOR.y0 + 30;
      const d = steer(p, e.x, e.y, pl.gu.x + (e.x < pl.gu.x ? -60 : 60), ty, { arrive: 80 });
      if (Math.abs(pl.gu.x - e.x) < TOSS_DX * 0.75 && e.y < FLOOR.y0 + 100 && e.cool <= 0) { c.press('a'); e.plan = null; e.brain.wait(reactionTime(p)); }
      else if (d < 20) c.move(0, 0);
      return;
    }
    if (pl.slot) {
      if (e.held === pl.slot.kind) { e.plan = null; return; }
      const d = steer(p, e.x, e.y, pl.slot.x, FLOOR.y1, { arrive: 70 });
      const near = this.nearestSlot(e);
      if (near && near.kind === pl.slot.kind && e.cool <= 0) { c.press('a'); e.brain.wait(reactionTime(p) * 0.6); }
      else if (d < 12) c.move(0, 0);
    }
  }

  /** Choose a guest to help and the cart slot with their treat. */
  aiPickPlan(e, busy, swap) {
    const prof = aiProfile(e.p);
    const wishing = this.guests.filter((gu) => gu.state === 'wish' && (!swap || gu.wish !== e.held));
    if (!wishing.length) return { wander: true, x: rand(FLOOR.x0 + 200, FLOOR.x1 - 200), y: FLOOR.y1 - 30, t: rand(0.4, 0.8) };
    const free = wishing.filter((gu) => !busy.has(gu));
    const gu = pick(free.length ? free : wishing);
    // mistakes: grab the wrong treat now and then (it boings back, which is funny)
    const kind = chance(prof.mistake * 0.6) ? pick(ITEMS) : gu.wish;
    const slots = this.slots().filter((s) => s.kind === kind);
    if (!slots.length) return null;
    const slot = slots.reduce((b, s) => (Math.abs(s.x - e.x) < Math.abs(b.x - e.x) ? s : b));
    return { slot, gu };
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    const scores = this.ents.map((e) => e.score);
    const placements = this.n === 1 ? [1] : placementsFromScores(scores);
    const top = Math.max(...scores);
    this.ents.forEach((e, i) => {
      e.a.clearEmotes();
      e.a.setPose(scores[i] === top ? 'celebrate' : pick(['clap', 'cheer', 'laugh']));
    });
    for (const gu of this.guests) { gu.state = 'happy'; gu.react = 'hooray'; gu.rt = 0; gu.wish = null; }
    const wi = scores.indexOf(top);
    const wa = this.ents[Math.max(0, wi)];
    this.api.finish({ placements, stats: scores.map((s) => `${s} treat${s === 1 ? '' : 's'}`), focus: { x: wa.x, y: wa.y - wa.a.height * 0.5 } });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    drawGarden(g, this.t);
    if (this.rush) { g.save(); g.globalAlpha = 0.06 + 0.04 * Math.sin(this.t * 8); g.fillStyle = '#ff6fb1'; g.fillRect(0, 0, W, H); g.restore(); }
    for (const gu of this.guests) this.drawGuestAt(g, gu);
    drawTable(g);
    for (const [x, y, s] of this.teapots) drawTeapot(g, x, y, s, this.t);
    // little plates in front of each guest
    for (const gu of this.guests) {
      g.save(); g.fillStyle = '#fff'; g.strokeStyle = '#24163f'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(gu.x, SEAT_Y + 4, 54, 13, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#ff9ccf'; g.beginPath(); g.ellipse(gu.x, SEAT_Y + 4, 38, 8, 0, 0, TAU); g.stroke();
      g.restore();
    }
    this.drawGarland(g);
    for (const gu of this.guests) this.drawWish(g, gu);
    // players (behind the carts)
    const order = this.ents.slice().sort((a, b) => a.y - b.y);
    for (const e of order) {
      e.a.draw(g, { ring: e.p.color });
      if (e.held) {
        const bob = Math.sin(this.t * 10 + e.i) * 4;
        g.save(); g.translate(e.x + e.a.facing * 6, e.y - e.a.height - 46 + bob); drawItem(g, e.held, 82, this.t); g.restore();
      }
    }
    for (let ci = 0; ci < CARTS.length; ci++) drawCart(g, CARTS[ci], CART_Y, this.t);
    this.drawCartTreats(g);
    for (const s of this.tosses) {
      g.save(); g.translate(s.x, s.y); g.rotate(s.t * s.spin); drawItem(g, s.kind, 84, this.t); g.restore();
    }
    for (const e of order) {
      const head = e.y - e.a.height - (e.held ? 110 : 30);
      if (this.time < 4 || !e.p.isAI) ui.playerTag(g, e.p, e.x, head);
    }
  }

  drawGuestAt(g, gu) {
    const t = this.t, hx = gu.x;
    const happy = gu.state === 'happy';
    const r = gu.react;
    let jump = 0, rot = 0;
    if (gu.jumpT !== undefined && t - gu.jumpT < 0.6) jump = Math.sin(((t - gu.jumpT) / 0.6) * Math.PI) * 70;
    if (happy && (r === 'hooray' || r === 'ears')) jump = Math.max(jump, Math.abs(Math.sin(gu.rt * 7)) * 40);
    if (happy && r === 'flip') { const u = clamp(gu.rt / 1.1, 0, 1); rot = -ease.inOutQuad(u) * TAU; jump = Math.sin(u * Math.PI) * 150; }
    const wig = gu.state === 'wish' ? Math.sin(gu.bob) * (0.02 + Math.min(gu.wishT, 10) * 0.004) : 0;
    const sq = gu.sq * Math.sin(t * 20) * 0.5;
    g.save();
    g.translate(hx, SEAT_Y - jump);
    if (rot) { g.translate(0, -110); g.rotate(rot); g.translate(0, 110); }
    g.rotate(wig);
    g.scale(1 + sq * 0.3, 1 - sq * 0.3 + Math.sin(gu.bob) * 0.012);
    drawGuest(g, gu.kind, { happy, t, blink: gu.blink > 0, shake: gu.shake, ears: happy && r === 'ears' ? gu.earSpin : 0, hat: !(happy && r === 'hat'), cheeks: happy && r === 'munch' ? Math.abs(Math.sin(gu.rt * 14)) : 0 });
    // the teacup upside down on teddy's head
    if (happy && r === 'spill') {
      const u = clamp((gu.rt - 0.05) / 0.25, 0, 1);
      g.save(); g.translate(0, -200 - (1 - u) * 90 + Math.sin(gu.rt * 12) * 3); g.rotate(Math.PI * u + Math.sin(gu.rt * 6) * 0.08);
      drawItem(g, 'cup', 96, t); g.restore();
      if (gu.cupOn) { // tea dribbles
        g.save(); g.fillStyle = 'rgba(201,138,74,0.8)';
        for (let i = 0; i < 5; i++) { const k = (gu.rt * 1.8 + i * 0.2) % 1; g.beginPath(); g.ellipse(-44 + i * 22, -190 + k * 120, 5, 8, 0, 0, TAU); g.fill(); }
        g.restore();
      }
    }
    g.restore();
    // the unicorn's hat on its flight
    if (gu.kind === 'unicorn' && happy && r === 'hat') {
      g.save(); g.translate(hx, SEAT_Y - 148 - 66 + gu.hatY); g.rotate(gu.hatR); drawHat(g); g.restore();
    }
  }

  drawWish(g, gu) {
    if (gu.state !== 'wish') return;
    const t = this.t;
    const pop = ease.outBack(clamp(gu.popIn ?? 1, 0, 1));
    const hurry = Math.min(gu.wishT, 10);
    const bx = gu.x + (gu.i % 2 ? -60 : 60), by = 182 + Math.sin(gu.bob * 1.3) * (4 + hurry * 0.6);
    const holders = this.ents.filter((e) => e.held === gu.wish);
    const r = 64 * pop * (gu.wish === 'cake' ? 1.12 : 1);
    drawBubble(g, bx, by, r, gu.x, SEAT_Y - 220, holders.length > 0, t);
    g.save(); g.translate(bx, by); g.rotate(Math.sin(t * (3 + hurry * 0.4) + gu.i) * 0.12); drawItem(g, gu.wish, 88 * pop, t); g.restore();
    // little arrows in each holder's colour, pointing at the bubble
    holders.forEach((e, k) => {
      const ax = bx + (k - (holders.length - 1) / 2) * 34, ay = by + r + 30 + Math.sin(t * 9 + k) * 6;
      g.save(); g.translate(ax, ay);
      g.beginPath(); g.moveTo(0, -18); g.lineTo(16, 6); g.lineTo(-16, 6); g.closePath();
      g.fillStyle = e.p.color; g.strokeStyle = '#24163f'; g.lineWidth = 4; g.fill(); g.stroke();
      g.restore();
    });
  }

  drawCartTreats(g) {
    const t = this.t;
    const wanted = new Set(this.guests.filter((gu) => gu.state === 'wish').map((gu) => gu.wish));
    for (const s of this.slots()) {
      const want = wanted.has(s.kind);
      const bob = want ? Math.abs(Math.sin(t * 6 + s.x * 0.01)) * 10 : 0;
      g.save(); g.translate(s.x, s.y - 40 - bob);
      if (s.kind === 'cake') {
        g.fillStyle = '#fff'; g.strokeStyle = '#24163f'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(0, 44 + bob, 44, 10, 0, 0, TAU); g.fill(); g.stroke();
        const k = 0.5 + Math.sin(t * 8) * 0.3;
        const gr = g.createRadialGradient(0, 0, 10, 0, 0, 80); gr.addColorStop(0, `rgba(255,236,140,${k})`); gr.addColorStop(1, 'rgba(255,236,140,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 80, 0, TAU); g.fill();
      }
      drawItem(g, s.kind, s.kind === 'cake' ? 92 : 80, t);
      g.restore();
    }
    // highlight the slot each human is standing at
    for (const e of this.ents) {
      if (e.p.isAI || this.done) continue;
      const s = this.nearestSlot(e);
      if (!s) continue;
      g.save(); g.strokeStyle = e.p.color; g.lineWidth = 6; g.globalAlpha = 0.85;
      g.beginPath(); g.ellipse(s.x, s.y + 2, 46, 12, 0, 0, TAU); g.stroke(); g.restore();
    }
  }

  drawGarland(g) {
    const n = this.goal, x0 = TABLE.x + 120, x1 = TABLE.x + TABLE.w - 120, y = TABLE.y + 96;
    g.save();
    g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath();
    for (let i = 0; i <= 40; i++) { const k = i / 40; g.lineTo(x0 + (x1 - x0) * k, y + Math.sin(k * Math.PI * n) * 6); }
    g.stroke();
    const hooray = this.t - this.hoorayT < 1.2;
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0.5 : i / (n - 1);
      const x = x0 + (x1 - x0) * k;
      const full = i < this.hearts || hooray;
      const hp = this.heartPop.find((h) => h.i === i);
      let s = 1;
      if (hp) { hp.t += 1 / 60; s = 1 + Math.sin(clamp(hp.t / 0.4, 0, 1) * Math.PI) * 0.6; }
      if (hooray) s = 1 + Math.abs(Math.sin(this.t * 12 + i)) * 0.3;
      g.save(); g.translate(x, y + 6); g.scale(s, s);
      heart(g, 22, full ? (hooray ? RAINBOW[i % RAINBOW.length] : '#ff4d8d') : 'rgba(255,255,255,0.75)');
      g.restore();
    }
    this.heartPop = this.heartPop.filter((h) => h.t < 0.5);
    g.restore();
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft);
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 18, avoidCenter: true, format: (v) => String(v) });
    if (this.rush && this.rushT < 2.2) {
      g.save(); g.globalAlpha = clamp(2.2 - this.rushT, 0, 1);
      ui.banner(g, 'Party Rush! x2', this.rushT, { y: 560, size: 130, color: '#ff6fb1' });
      g.restore();
    }
    if (this.t - this.hoorayT < 1.8) {
      g.save(); g.globalAlpha = clamp(1.8 - (this.t - this.hoorayT), 0, 1);
      ui.banner(g, 'Hooray!', this.t - this.hoorayT, { y: 400, size: 170, color: '#ffd23f' });
      g.restore();
    }
  }
}

function heart(g, r, color) {
  g.beginPath();
  g.moveTo(0, r * 0.9);
  g.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.1, 0, -r * 0.4);
  g.bezierCurveTo(r * 0.7, -r * 1.1, r * 1.4, -r * 0.1, 0, r * 0.9);
  g.fillStyle = color; g.fill();
  g.lineWidth = 4; g.strokeStyle = '#24163f'; g.stroke();
}
