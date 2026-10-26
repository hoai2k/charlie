// Sparkle Bead Shop (Play Studio). Everyone runs a bead-shop table (split
// stations). Rounds 1-2: friendly customers bring a pattern card and a
// started bracelet; continue the pattern by threading beads from the tray
// (rows = shapes, columns = colours). Right beads slide down the string with
// a chime, a finished repeat sparkles, and the customer wears the bracelet
// away (a star each). A wrong bead just wiggles off. Final round: free design
// (bracelet, necklace or anklet, beads + charms: LB / RB go Beads, Charms,
// Done; X threads one and stays, A threads one and goes on to the next one
// (or just goes on if X already threaded); A on Done = finished); then everyone
// wears their jewellery, twirls in the big mirror and poses for a photo.
import { playerName } from '../state.js';
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait, getSpriteSet } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { input } from '../engine/input.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, makesMistake } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU, showstopper } from '../engine/util.js';
import { drawSparkleShape, drawStarShape } from '../engine/emotes.js';
import { CHARACTERS } from '../data/characters.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  NAVY, SHAPES, BEAD_COLORS, CHARMS, TYPES, ROUND_KINDS, FREE_TRAY, CHARM_TRAY, charmAt,
  sameTok, drawToken, drawCharm, drawGlint, drawLoop, strandPoints, drawTypeIcon, makeOrder, endsGroup, trayFor, autoDesign,
} from './bead-bracelets/beads.js';
import { drawDoneTab, drawDoneCard } from '../engine/studio-ui.js';
import { meta } from './bead-bracelets.meta.js';

export { meta };

// --- station design (local units; each station is scaled by k) ---------------
const SW = 860, SH = 600;
const COUNTER_Y = 222;
const CUST = { x: 98, y: 330, h: 250, maxW: 176 };
const CARD = { x: 204, y: 18, w: 406, h: 188 };
const SHELF = { x: 622, y: 18, w: 224, h: 188 };
const STR = { x0: 226, x1: 786, y: 286, sag: 22, tip: 842 };
const CHAR = { x: 98, y: 590, h: 238, maxW: 172 };
const TRAY = { x: 198, y: 394, w: 650, h: 196 };
const TABS = { x: 206, y: 346, w: 435, h: 40 };
const TAB_W = TABS.w / 3;   // free design: Beads, Charms, Done
const VIS_ROWS = 3, VIS_COLS = 6;
const ROUND_TIME = 55, DESIGN_TIME = 80;
const ROUND_MORE = 30;   // "Keep playing!" at a round's / the design's "Time's up!"
const SCALE = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103, 105, 108];
const CUSTOMERS = [...CHARACTERS.map((c) => c.id), 'glimmer', 'professor-hoot', 'fellowfox'];
const THANKS = ['Thank you!', 'So pretty!', 'I love it!', 'Sparkly!', 'Yay!', 'Perfect!'];
const BYE = ['Thank you!', 'Lovely!', 'See you!'];

/** Recorded sound if it exists, else the synth stand-in. */
const snd = (key, fallback, o) => (hasSound(key) ? sfx(key, o) : fallback && sfx(fallback, o));
function hex(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; }
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Station positions: try every column count, keep the biggest scale. */
function layoutStations(n) {
  const top = 112, bottom = H - 10, left = 12, right = W - 12, gap = 14;
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (right - left - gap * (cols - 1)) / cols, ch = (bottom - top - gap * (rows - 1)) / rows;
    const k = Math.min(cw / SW, ch / SH, 1.6);
    if (!best || k > best.k + 1e-6) best = { cols, rows, k };
  }
  const { cols, rows, k } = best, sw = SW * k, sh = SH * k;
  const y0 = top + (bottom - top - (rows * sh + (rows - 1) * gap)) / 2;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
    const x0 = (W - (inRow * sw + (inRow - 1) * gap)) / 2;
    return { x: x0 + c * (sw + gap), y: y0 + r * (sh + gap), k };
  });
}

const slotPos = (n, i) => {
  const u = (i + 0.5) / n;
  return { x: STR.x0 + u * (STR.x1 - STR.x0), y: STR.y + STR.sag * 4 * u * (1 - u) };
};
const stringY = (x) => { const u = clamp((x - STR.x0) / (STR.x1 - STR.x0), 0, 1); return STR.y + STR.sag * 4 * u * (1 - u); };
const beadR = (n) => Math.min(25, ((STR.x1 - STR.x0) / n) * 0.45);

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.orders = [[], []];
    this.flashT = 0;
    // The round clock, shown all game (the intros show the full time to come).
    api.limit(() => {
      const P = this.phase;
      return P === 'play' || P === 'design' ? this.timeLeft : P === 'intro' ? ROUND_TIME : P === 'designIntro' ? DESIGN_TIME : null;
    }, {
      showAt: Infinity, x: W / 2, y: 54,
      // At 0 it asks "Time's up!": Keep playing = +ROUND_MORE s, All done = the round ends (or the show starts).
      timeUp: {
        more: () => { this.timeLeft += ROUND_MORE; },
        done: () => { if (this.phase === 'play') this.endRound(); else if (this.phase === 'design') this.startShow(); },
      },
    });
    const rects = layoutStations(this.n);
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i]));
    this.ptrSt = this.stations.find((s) => !s.p.isAI) || null;
    this.sideRoom = Math.min(...rects.map((r) => r.x)) > 260;
    this.jars = Array.from({ length: 14 }, (_, i) => ({ c: BEAD_COLORS[i % 8].c, s: i % 6, h: 60 + (i * 37) % 40 }));
    this.startRound(0);
  }

  // --- setup -------------------------------------------------------------------
  makeStation(p, i, r) {
    const a = new Actor(p, { x: CHAR.x, y: CHAR.y, facing: 1 });
    a.scale = Math.min(CHAR.h / a.leader.h, CHAR.maxW / Math.max(1, a.width / a.scale));
    a.snap();
    const st = {
      p, i, ox: r.x, oy: r.y, k: r.k, actor: a, baseScale: a.scale,
      mode: 'wait', order: null, orderIdx: 0, beads: [], slots: 10, given: 0,
      tray: FREE_TRAY, cur: { r: 0, c: 0 }, sx: 0, sy: 0, trayBump: 0,
      fly: null, wob: [], queued: null, pops: [], glints: [],
      cust: null, custQueue: shuffle(CUSTOMERS.filter((id) => id !== p.charId)),
      done: 0, shelf: [], shelfPop: 0, hintT: 0, wrongRun: 0, idleT: 0, cardPop: 0, finishFx: null,
      pick: 0, type: 'bracelet', design: null, wearing: false, twirlT: -1, doneBump: 0, stringShake: 0, onDone: false,
      ai: { t: rand(0.6, 1.4), target: null, plan: null, erred: false, type: null },
    };
    a.attach((g, info) => this.drawWorn(g, st, info, a.char.members[0]));
    return st;
  }

  toScreen(st, x, y) { return { x: st.ox + x * st.k, y: st.oy + y * st.k }; }

  orderFor(round, idx) {
    const list = this.orders[round];
    while (list.length <= idx) {
      const kinds = ROUND_KINDS[round];
      const o = makeOrder(list.length < kinds.length ? kinds[list.length] : pick(kinds));
      o.tray = trayFor(o, round);
      list.push(o);
    }
    return list[idx];
  }

  newCustomer(st) {
    if (!st.custQueue.length) st.custQueue = shuffle(CUSTOMERS.filter((id) => id !== st.p.charId));
    const id = st.custQueue.shift();
    const a = new Actor(id, { x: -140, y: CUST.y, facing: 1, load: false });
    a.scale = Math.min(CUST.h / a.leader.h, CUST.maxW / Math.max(1, a.width / a.scale));
    a.y = Math.min(CUST.y, COUNTER_Y + a.height * 0.36);   // the top ~2/3 shows above the counter
    a.snap();
    const cust = { actor: a, state: 'enter', t: 0, wear: null };
    a.attach((g, info) => {
      if (!cust.wear) return;
      const h = info.h, rx = Math.max(7, h * 0.09);
      drawLoop(g, cust.wear.slice(0, 12), info.hand.x, info.hand.y, rx, rx * 0.42, Math.max(2.4, h * 0.024), { spin: this.t * 0.8 });
    });
    if (st.cust && st.cust.state !== 'gone') { st.oldCust = st.cust; if (st.oldCust.state !== 'leave') this.custLeave(st.oldCust); }
    st.cust = cust;
    a.setPose('walk');
  }

  custLeave(cust) { cust.state = 'leave'; cust.t = 0; cust.actor.facing = -1; cust.actor.setPose('walk'); }

  // --- rounds --------------------------------------------------------------------
  startRound(round) {
    this.round = round;
    this.phase = 'intro'; this.phaseT = 0; this.timeLeft = ROUND_TIME;
    for (const st of this.stations) {
      Object.assign(st, { mode: 'wait', orderIdx: 0, order: null, beads: [], fly: null, wob: [], queued: null, hintT: 0, wrongRun: 0, finishFx: null });
      st.ai.target = null;
      this.newCustomer(st);
    }
    sfx('magic'); snd('jingle/round');
  }

  beginOrder(st) {
    const o = this.orderFor(this.round, st.orderIdx);
    st.order = o; st.mode = 'pattern';
    st.beads = o.seq.slice(0, o.given); st.slots = o.seq.length; st.given = o.given;
    st.tray = o.tray;
    st.cur = { r: clamp(st.cur.r, 0, o.tray.rows.length - 1), c: clamp(st.cur.c, 0, o.tray.cols.length - 1) };
    st.cardPop = 0; st.hintT = 0; st.wrongRun = 0; st.idleT = 0; st.pops = []; st.glints = [];
    st.ai.target = null; st.ai.t = Math.max(st.ai.t, rand(0.8, 1.5));
    if (!st.p.isAI) sfx('card-flip', { fallback: 'flip', vol: 0.6 });
  }

  endRound() {
    this.phase = 'roundEnd'; this.phaseT = 0;
    for (const st of this.stations) {
      st.mode = 'idle'; st.fly = null; st.queued = null; st.hintT = 0;
      const c = st.cust;
      if (c && (c.state === 'wait' || c.state === 'enter')) { c.state = 'bye'; c.t = 0; c.actor.playOnce('wave', 1.0, 'idle'); c.actor.say(pick(BYE), 1.2, null); }
      st.actor.playOnce('cheer', 0.7, 'idle');
    }
    sfx('whistle', { vol: 0.5 }); snd('applause', 'cheer', { vol: 0.6 });
  }

  startDesign() {
    this.round = 2;
    this.phase = 'designIntro'; this.phaseT = 0; this.timeLeft = DESIGN_TIME;
    for (const st of this.stations) {
      Object.assign(st, { mode: 'wait', order: null, beads: [], fly: null, wob: [], queued: null, hintT: 0, finishFx: null, tray: FREE_TRAY, cur: { r: 2, c: 0 }, sx: 0, sy: 0, pick: 0, slots: 12, given: 0 });
      st.ai = { t: rand(1.0, 2.2), target: null, plan: null, erred: false, type: null };
      if (st.cust && st.cust.state !== 'gone') this.custLeave(st.cust);
    }
    sfx('magic'); sfx('sparkle'); snd('jingle/round');
  }

  pickType(st, idx) {
    st.pick = idx; st.type = TYPES[idx].id; st.slots = TYPES[idx].slots;
    st.mode = 'design'; st.tray = FREE_TRAY; st.cur = { r: 2, c: idx * 2 }; st.beads = []; st.onDone = false;
    st.cardPop = 0;
    sfx('select'); sfx('sparkle');
    const c = this.toScreen(st, TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h / 2);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 12, colors: ['#fff', '#fff6a8', '#ffc4e6'] });
    st.actor.playOnce('cheer', 0.5, 'idle');
  }

  finishDesign(st, auto = false) {
    if (st.beads.length < 3 && !auto) { st.doneBump = 0.4; sfx('blip'); st.hintT = 1.2; return; }
    if (auto && st.beads.length < 6) st.beads = st.beads.concat(autoDesign(st.type)).slice(0, st.slots);
    st.mode = 'done'; st.fly = null; st.queued = null;
    st.design = st.beads.slice(); st.wearing = true; st.twirlT = 0; st.doneT = 0;
    const a = st.actor, c = a.anchor('center'), sc = this.toScreen(st, c.x, c.y);
    sfx('magic'); sfx('sparkle'); snd('golden-chime', 'star', { vol: 0.7 });
    particles.burst(sc.x, sc.y, { type: 'sparkle', count: 18, colors: ['#fff', '#fff6a8', '#ffc4e6'], speed: [120, 360] });
    particles.burst(sc.x, sc.y, { type: 'star', count: 8 });
    a.playOnce('pose-twirl', 1.0, 'idle'); a.squash(-0.25);
  }

  startShow() {
    this.phase = 'show'; this.phaseT = 0; this.photoTaken = false; this.cheese = false;
    for (const st of this.stations) {
      if (st.mode === 'done') continue;
      // ended early (pause menu "All done!" or the timer): a pretty design for anyone unfinished
      if (this.round < 2 || st.mode === 'pick' || st.mode === 'wait') { const ty = TYPES[randInt(0, TYPES.length - 1)]; st.type = ty.id; st.slots = ty.slots; st.beads = []; }
      this.finishDesign(st, true);
    }
    const n = this.n;
    const rows = n >= 6 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
    const spots = [];
    rows.forEach((count, r) => {
      const y = rows.length === 1 ? 900 : r === 0 ? 950 : 742;
      const th = rows.length === 1 ? (n === 1 ? 520 : n <= 2 ? 460 : n <= 4 ? 410 : 330) : r === 0 ? 280 : 236;
      const sp = Math.min(400, 1300 / count);
      for (let k = 0; k < count; k++) spots.push({ x: W / 2 + (k - (count - 1) / 2) * sp + (r ? sp / 2 : 0), y, th, sp });
    });
    this.stations.forEach((st, i) => {
      const a = st.actor, sp = spots[i];
      const from = this.toScreen(st, a.x, a.y);
      st.show = { from: { x: from.x, y: from.y, s: a.scale * st.k }, to: sp, toScale: Math.min(sp.th / a.leader.h, (sp.sp * 0.9) / Math.max(1, a.width / a.scale)) };
      a.clearEmotes(); a.say(null);
      st.twirlT = -1;
    });
    // back row (second half) draws first
    this.showOrder = this.stations.slice().sort((a, b) => a.show.to.y - b.show.to.y);
    this.twirlGap = n <= 3 ? 1.6 : n <= 5 ? 1.3 : 1.05;
    this.twirlStart = 1.5;
    this.cheeseAt = this.twirlStart + n * this.twirlGap + 0.4;
    sfx('whoosh'); sfx('magic');
  }

  /** "Say cheese!": move (stick), jump (A) and pose (every other button) until the photo. */
  cheeseMove(st, dt) {
    const a = st.actor, c = st.p.ctrl, hop = st.hop, base = st.show.to;
    st.poseCD = Math.max(0, st.poseCD - dt);
    let mx = photoMove(c).x, jump = c.pressed('a'), pose = photoPosePressed(c);
    if (st.p.isAI) {
      // CPUs ham it up a little: shuffle, hop and pose at random
      st.aiT = (st.aiT ?? rand(0.2, 0.8)) - dt;
      if (st.aiT <= 0) { st.aiT = rand(0.5, 1.3); st.aiMx = chance(0.4) ? rand(-0.8, 0.8) : 0; if (chance(0.35)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      mx = st.aiMx || 0;
      if (Math.abs(a.x - base.x) > base.sp * 0.6) mx = Math.sign(base.x - a.x) * 0.6;
    }
    const minX = 230, maxX = W - 230;
    a.x = clamp(a.x + mx * 560 * dt, minX, maxX);
    if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1;
    if (jump && hop.h <= 0) { hop.v = 980; sfx('boing', { vol: 0.35 }); a.squash(-0.25); }
    hop.v -= 2800 * dt; hop.h = Math.max(0, hop.h + hop.v * dt);
    if (hop.h <= 0 && hop.v < 0) { if (hop.v < -200) a.squash(0.2); hop.v = 0; }
    a.y = base.y - hop.h * (a.scale / (st.show.toScale || 1));
    if (pose && st.poseCD <= 0) {
      st.poseCD = 0.35;
      strikePhotoPose(a, pose, { onBump: (who) => this.bumpNeighbours(st, who) });
    }
    if (!a._once) a.setPose(hop.h > 0 ? 'jump' : Math.abs(mx) > 0.2 ? 'walk' : 'idle');
  }

  /** The bump pose nudges whoever is standing close by (they stumble a little). */
  bumpNeighbours(st, a) {
    for (const o of this.stations) {
      if (o === st || !o.hop) continue;
      const b = o.actor, dx = b.x - a.x;
      if (Math.abs(dx) < (a.width + b.width) * 0.45) { b.x = clamp(b.x + Math.sign(dx || 1) * 70, 230, W - 230); b.playOnce('surprised', 0.8, 'idle'); b.squash(0.2); o.hop.v = Math.max(o.hop.v, 300); }
    }
    sfx('boing', { vol: 0.4 });
  }

  /** Render the stage (no HUD) into a small canvas: the photo. */
  snapshot() {
    try {
      const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2;
      const g = c.getContext('2d'); g.scale(0.5, 0.5);
      this.drawShow(g, true);
      return c;
    } catch (e) { return null; }
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const done = this.stations.map((s) => s.done);
    this.api.finish({
      showcase: true,
      highlight: showstopper(this.players, done),  // with kids playing, only a kid can be it
      stats: done.map((v) => plural(v, 'bracelet')),
      title: 'Sparkly!',
    });
  }

  onDone() {
    if (this.phase === 'show') { if (!this.photoTaken) this.phaseT = Math.max(this.phaseT, this.cheeseAt + CHEESE_TIME - 0.5); else this.finishGame(); return; }
    this.startShow();
  }

  // --- update ----------------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    const P = this.phase;
    if (P === 'intro') {
      if (this.phaseT >= 2.2) { this.phase = 'play'; this.phaseT = 0; for (const st of this.stations) if (st.mode === 'wait') this.beginOrder(st); }
    } else if (P === 'play') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);   // at 0 the clock's "Time's up!" (api.limit) ends the round
    } else if (P === 'roundEnd') {
      if (this.phaseT > 2.8) { if (this.round === 0) this.startRound(1); else this.startDesign(); }
    } else if (P === 'designIntro') {
      if (this.phaseT > 2.2) { this.phase = 'design'; this.phaseT = 0; for (const st of this.stations) st.mode = 'pick'; }
    } else if (P === 'design') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);   // (at 0 the clock's "Time's up!" starts the show)
      const all = this.stations.every((s) => s.mode === 'done' && s.doneT > 1.6);
      if (all) this.startShow();
    } else if (P === 'show') {
      this.updateShow(dt);
    }
    if (P !== 'show') {
      this.pointerInput();
      for (const st of this.stations) this.updateStation(st, dt);
    }
    if (this.api.camera && P !== 'show') this.api.camera.follow(W / 2, H / 2, 1, 6);
  }

  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    for (const st of this.stations) { st.actor.update(dt); if (st.twirlT >= 0) st.twirlT += dt; }
  }

  updateStation(st, dt) {
    const p = st.p, c = p.ctrl, a = st.actor;
    st.cardPop += dt; st.trayBump = Math.max(0, st.trayBump - dt); st.hintT = Math.max(0, st.hintT - dt);
    st.shelfPop += dt; st.doneBump = Math.max(0, st.doneBump - dt); st.stringShake = Math.max(0, st.stringShake - dt);
    if (st.mode === 'done') st.doneT = (st.doneT || 0) + dt;
    if (st.twirlT >= 0) { st.twirlT += dt; if (st.twirlT > 1.1) st.twirlT = -1; }
    st.pops = st.pops.filter((q) => (q.t += dt) < 0.3);
    st.glints = st.glints.filter((q) => (q.t += dt) < 0.7);
    this.updateCustomer(st, dt);
    this.updateFly(st, dt);
    this.updateFinishFx(st, dt);
    a.update(dt);
    if (p.isAI) this.updateAI(st, dt);

    // tray scroll follows the cursor
    const nr = st.tray.rows.length, nc = st.tray.cols.length;
    const firstR = clamp(st.cur.r - 1, 0, Math.max(0, nr - VIS_ROWS)), firstC = clamp(st.cur.c - Math.floor(VIS_COLS / 2) + 1, 0, Math.max(0, nc - VIS_COLS));
    st.sy = damp(st.sy, firstR, 14, dt); st.sx = damp(st.sx, firstC, 14, dt);

    if (st.mode === 'design') {
      // LB / RB: Beads, Charms, Done · stick / D-pad (LT / RT): pick a bead · X: thread it and stay ·
      // A: thread one (unless X already has, here) and go on to the next tab (on Done: finished!) ·
      // B: take the last bead off (on Done: back to the tray)
      st.idleT += dt;
      const tab = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
      if (tab) this.stepTab(st, tab);
      else if (st.onDone) {
        if (c.pressed('a')) this.finishDesign(st);
        else if (c.pressed('b')) this.stepTab(st, -1);
      } else {
        const dx = c.nav.x + (c.pressed('rt') ? 1 : 0) - (c.pressed('lt') ? 1 : 0);
        if (dx) this.moveCursor(st, 0, Math.sign(dx));
        if (c.nav.y) this.moveCursor(st, c.nav.y, 0);
        if (c.pressed('x')) { if (this.threadCursor(st)) st.didTab = true; }
        else if (c.pressed('a')) {
          if (!st.didTab) this.threadCursor(st);
          this.stepTab(st, 1);
        }
        if (c.pressed('b')) this.undo(st);
      }
    } else if (st.mode === 'pattern') {
      st.idleT += dt;
      // a gentle nudge: the Y hint lights up by itself after a long think
      if (!p.isAI && st.idleT > 14 && st.hintT <= 0) { st.hintT = 3; st.idleT = 6; }
      // (no categories here: LB / RB and LT / RT step along the tray too; A or X threads the bead)
      const dx = c.nav.x + (c.pressed('rb') || c.pressed('rt') ? 1 : 0) - (c.pressed('lb') || c.pressed('lt') ? 1 : 0);
      if (dx) this.moveCursor(st, 0, Math.sign(dx));
      if (c.nav.y) this.moveCursor(st, c.nav.y, 0);
      if (c.pressed('a') || c.pressed('x')) this.threadCursor(st);
      if (c.pressed('b')) this.undo(st);
      if (c.pressed('y')) this.hint(st);
    } else if (st.mode === 'pick') {
      const dx = c.nav.x + (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
      if (dx) { st.pick = (st.pick + Math.sign(dx) + TYPES.length) % TYPES.length; st.trayBump = 0.15; if (!p.isAI) sfx('move'); }
      if (c.pressed('a')) this.pickType(st, st.pick);
    } else if (st.mode === 'done') {
      if (c.pressed('b') && this.phase === 'design') { st.mode = 'design'; st.wearing = false; sfx('back'); a.setPose('idle'); }
    }
  }

  moveCursor(st, dr, dc) {
    const nr = st.tray.rows.length, nc = st.tray.cols.length;
    if (dr) st.cur.r = (st.cur.r + dr + nr) % nr;
    if (dc) st.cur.c = (st.cur.c + dc + nc) % nc;
    st.trayBump = 0.12;
    if (!st.p.isAI) sfx('move', { vol: 0.6 });
  }

  /** Free design, LB / RB: Beads -> Charms -> Done (and round again). */
  stepTab(st, d) {
    const cur = st.onDone ? 2 : st.tray.kind === 'beads' ? 0 : 1, next = (cur + d + 3) % 3;
    st.onDone = next === 2; st.didTab = false;
    if (!st.onDone && (next === 0) !== (st.tray.kind === 'beads')) this.toggleTray(st);
    else { st.trayBump = 0.15; if (!st.p.isAI) sfx('move'); }
  }

  toggleTray(st) {
    st.tray = st.tray.kind === 'beads' ? CHARM_TRAY : FREE_TRAY;
    st.cur = { r: 0, c: clamp(st.cur.c, 0, st.tray.cols.length - 1) };
    st.sx = st.sy = 0; st.trayBump = 0.2;
    if (!st.p.isAI) sfx('swap');
  }

  tokAt(st, r, c) {
    const tr = st.tray;
    if (tr.kind === 'charms') return { charm: charmAt(r, c) };
    return { s: tr.rows[r], c: tr.cols[c] };
  }

  /** Centre of tray cell (r, c) in local units, taking the scroll into account. */
  cellPos(st, r, c) {
    const L = this.trayLayout(st);
    return { x: L.x0 + (c - st.sx + 0.5) * L.colW, y: L.y0 + (r - st.sy + 0.5) * L.rowH, r: L.br };
  }

  trayLayout(st) {
    const tr = st.tray;
    const visR = Math.min(VIS_ROWS, tr.rows.length), visC = Math.min(VIS_COLS, tr.cols.length);
    const innerX = TRAY.x + 36, innerW = TRAY.w - 72, innerY = TRAY.y + 14, innerH = TRAY.h - 28;
    const colW = innerW / Math.max(visC, tr.kind === 'charms' ? 4 : 4), rowH = Math.min(innerH / visR, 84);
    const x0 = innerX + (innerW - colW * visC) / 2, y0 = innerY + (innerH - rowH * visR) / 2;
    return { x0, y0, colW, rowH, visR, visC, innerX, innerW, innerY, innerH, br: Math.min(rowH * 0.38, colW * 0.3, 30) };
  }

  threadCursor(st) { return this.thread(st, this.tokAt(st, st.cur.r, st.cur.c), this.cellPos(st, st.cur.r, st.cur.c)); }

  thread(st, tok, from) {
    if (st.mode !== 'pattern' && st.mode !== 'design') return false;
    if (st.fly || st.wob.some((w) => w.kind === 'wiggle' && !w.popped)) { st.queued = { tok, from }; return true; }
    if (st.beads.length >= st.slots) { st.stringShake = 0.35; sfx('blip'); return false; }
    const idx = st.beads.length;
    const ok = st.mode !== 'pattern' || sameTok(tok, st.order.seq[idx]);
    st.fly = { tok, from: { x: from.x, y: from.y }, idx, t: 0, ok };
    st.idleT = 0;
    snd('bead-click', 'tick', { vol: st.p.isAI ? 0.5 : 0.9 });
    st.actor.playOnce('action', 0.3, 'idle');
    return true;
  }

  updateFly(st, dt) {
    for (const w of st.wob) w.t += dt;
    for (const w of st.wob) {
      if (w.kind === 'wiggle' && w.t >= 0.42 && !w.popped) {
        w.popped = true; w.vx = rand(-160, 160); w.vy = -rand(260, 360);
        snd('boing', 'bounce', { vol: 0.35 });
      }
      if (w.popped || w.kind === 'back') { w.vy += 1400 * dt; w.x += w.vx * dt; w.y += w.vy * dt; }
    }
    st.wob = st.wob.filter((w) => w.t < (w.kind === 'wiggle' ? 1.0 : 0.6));
    const f = st.fly;
    if (!f) { if (st.queued && !st.wob.some((w) => w.kind === 'wiggle' && !w.popped)) { const q = st.queued; st.queued = null; this.thread(st, q.tok, q.from); } return; }
    f.t += dt;
    const ARC = 0.2;
    const slot = slotPos(st.slots, f.idx);
    const slide = 0.1 + 0.26 * clamp((STR.tip - slot.x) / (STR.tip - STR.x0), 0, 1);
    if (f.t < ARC) {
      const u = ease.outQuad(f.t / ARC);
      f.x = lerp(f.from.x, STR.tip - 6, u); f.y = lerp(f.from.y, STR.y - 4, u) - Math.sin(u * Math.PI) * 70;
    } else {
      const u = ease.inQuad(clamp((f.t - ARC) / slide, 0, 1));
      f.x = lerp(STR.tip - 6, slot.x, u); f.y = stringY(f.x);
      if (!f.zip) { f.zip = true; snd('bead-zip', 'brush', { vol: 0.5 }); }
      if (f.t >= ARC + slide) this.land(st, f, slot);
    }
  }

  land(st, f, slot) {
    st.fly = null;
    const sc = this.toScreen(st, slot.x, slot.y);
    if (!f.ok) {
      st.wob.push({ kind: 'wiggle', tok: f.tok, x: slot.x, y: slot.y, t: 0 });
      st.wrongRun++;
      if (st.wrongRun >= 2 && !st.p.isAI) { st.hintT = 3; st.wrongRun = 0; }
      st.actor.playOnce('think', 0.7, 'idle');
      sfx('bubble', { vol: 0.5 });
      return;
    }
    st.wrongRun = 0;
    st.beads.push(f.tok);
    st.pops.push({ i: f.idx, t: 0 }); st.glints.push({ i: f.idx, t: 0 });
    sfx('note', { midi: SCALE[f.idx % SCALE.length], vol: st.p.isAI ? 0.13 : 0.22, dur: 0.28 });
    particles.burst(sc.x, sc.y, { type: 'sparkle', count: 4, colors: ['#fff', '#fff6a8'], speed: [40, 140], size: [6 * st.k + 4, 12 * st.k + 4] });
    st.actor.squash(0.12);
    if (st.mode === 'pattern') {
      if (st.hintT > 0) st.hintT = Math.min(st.hintT, 0.4);
      if (endsGroup(st.order, f.idx) && f.idx >= st.given) this.repeatSparkle(st, f.idx);
      if (st.beads.length >= st.slots) this.completeOrder(st);
    } else if (st.beads.length % 4 === 0) this.repeatSparkle(st, f.idx, 4);
  }

  /** A repeat of the pattern is finished: its beads twinkle in turn. */
  repeatSparkle(st, last, size) {
    let n = size;
    if (!n) { let acc = 0; for (const gsz of st.order.groups) { acc += gsz; if (acc - 1 === last) { n = gsz; break; } } }
    for (let j = 0; j < n; j++) {
      const i = last - j;
      if (i < 0) break;
      st.glints.push({ i, t: -j * 0.06 });
      const s = slotPos(st.slots, i), sc = this.toScreen(st, s.x, s.y);
      particles.burst(sc.x, sc.y - 10 * st.k, { type: 'sparkle', count: 3, colors: ['#fff', '#ffe27a', '#ffc4e6'], speed: [60, 200] });
    }
    sfx('sparkle', { vol: st.p.isAI ? 0.5 : 0.9 });
    if (!st.actor._once || st.actor.pose === 'action') st.actor.playOnce('cheer', 0.5, 'idle');
  }

  hint(st) {
    st.hintT = 3.5; st.idleT = 0;
    if (!st.p.isAI) sfx('magic', { vol: 0.6 });
  }

  undo(st) {
    if (st.fly) return;
    const min = st.mode === 'pattern' ? st.given : 0;
    if (st.beads.length <= min) {
      if (st.mode === 'design' && !st.beads.length) { st.mode = 'pick'; st.onDone = false; sfx('back'); return; }
      st.stringShake = 0.3; if (!st.p.isAI) sfx('blip'); return;
    }
    const i = st.beads.length - 1, tok = st.beads.pop(), s = slotPos(st.slots, i);
    st.wob.push({ kind: 'back', tok, x: s.x, y: s.y, t: 0, vx: rand(-60, 60), vy: -380 });
    sfx('pop', { vol: 0.5 });
  }

  completeOrder(st) {
    st.mode = 'wait'; st.done++;
    st.finishFx = { toks: st.beads.slice(), n: st.slots, t: 0 };
    snd('match-chime', 'correct');
    st.actor.playOnce('celebrate', 1.2, 'idle');
    st.actor.emote('heart', 1.2);
    const c = this.toScreen(st, (STR.x0 + STR.x1) / 2, STR.y);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 16, colors: ['#fff', '#fff6a8', '#ffc4e6'], speed: [100, 340] });
  }

  updateFinishFx(st, dt) {
    const f = st.finishFx;
    if (!f) return;
    f.t += dt;
    if (f.t >= 0.95 && !f.given) {
      f.given = true;
      const cu = st.cust;
      if (cu) {
        cu.wear = f.toks; cu.state = 'happy'; cu.t = 0;
        cu.actor.playOnce('cheer', 0.8, 'idle'); cu.actor.emote('heart', 1.4);
        cu.actor.say(pick(THANKS), 1.3, st.p.isAI ? null : 'yay');
        const h = cu.actor.anchor('head'), hs = this.toScreen(st, h.x, h.y);
        particles.burst(hs.x, hs.y, { type: 'heart', count: 7, speed: [100, 260] });
      }
      st.shelf.push(f.toks); st.shelfPop = 0;
      const sp = this.toScreen(st, SHELF.x + SHELF.w / 2, SHELF.y + 60);
      particles.popText(sp.x, sp.y, '+★', '#ffd23f', 44 * Math.max(0.7, st.k));
      particles.burst(sp.x, sp.y, { type: 'star', count: 6, speed: [80, 220] });
      sfx('star', { vol: st.p.isAI ? 0.5 : 1 });
    }
    if (f.t >= 1.05) { st.finishFx = null; st.beads = []; }
  }

  updateCustomer(st, dt) {
    for (const cu of [st.cust, st.oldCust]) {
      if (!cu) continue;
      const a = cu.actor;
      cu.t += dt;
      if (cu.state === 'enter') {
        const u = clamp(cu.t / 0.8, 0, 1);
        a.x = lerp(-140, CUST.x, ease.outQuad(u)); a.setPose('walk'); a.facing = 1;
        if (u >= 1) { cu.state = 'wait'; a.setPose('idle'); if (cu === st.cust) st.cardPop = 0; if (chance(0.5)) a.emote('heart', 1); }
      } else if (cu.state === 'wait') {
        if (st.mode === 'pattern' && chance(dt * 0.12)) a.playOnce(pick(['think', 'wave']), 0.9, 'idle');
      } else if (cu.state === 'happy') {
        if (cu.t > 1.1) {
          this.custLeave(cu);
          if (this.phase === 'play' && cu === st.cust) { st.orderIdx++; this.newCustomer(st); this.beginOrder(st); }
        }
      } else if (cu.state === 'bye') {
        if (cu.t > 1.0) this.custLeave(cu);
      } else if (cu.state === 'leave') {
        a.x -= 420 * dt; a.facing = -1; a.setPose('walk');
        if (a.x < -170) cu.state = 'gone';
      }
      a.update(dt);
    }
    if (st.oldCust && st.oldCust.state === 'gone') st.oldCust = null;
  }

  // --- CPU players ----------------------------------------------------------------
  updateAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai, prof = aiProfile(st.p);
    ai.t -= dt;
    if (ai.t > 0) return;
    const think = () => (rand(...prof.think) * 1.9 + 0.5) / prof.speed;
    const step = () => { ai.t = rand(0.12, 0.22) / prof.speed; };
    const navTo = (tg) => {
      if (tg.kind && (tg.kind !== st.tray.kind || st.onDone)) { c.press('rb'); step(); return true; }
      if (st.cur.r !== tg.r) { c.press(tg.r > st.cur.r ? 'down' : 'up'); step(); return true; }
      if (st.cur.c !== tg.c) { c.press(tg.c > st.cur.c ? 'right' : 'left'); step(); return true; }
      return false;
    };
    if (st.mode === 'pattern') {
      if (st.fly || st.wob.length) { ai.t = 0.1; return; }
      if (!ai.target) {
        const want = st.order.seq[st.beads.length], tr = st.tray;
        let r = tr.rows.indexOf(want.s), col = tr.cols.indexOf(want.c);
        if (!ai.erred && makesMistake(st.p)) {
          // a look-alike: same shape, other colour (or the other way round)
          if (chance(0.5) && tr.cols.length > 1) col = (col + randInt(1, tr.cols.length - 1)) % tr.cols.length;
          else if (tr.rows.length > 1) r = (r + randInt(1, tr.rows.length - 1)) % tr.rows.length;
          ai.erred = true;
        } else ai.erred = false;
        ai.target = { r, c: col };
      }
      if (navTo(ai.target)) return;
      c.press('a'); ai.target = null; ai.t = think();
    } else if (st.mode === 'pick') {
      if (ai.type === null) ai.type = randInt(0, TYPES.length - 1);
      if (st.pick !== ai.type) { c.press('right'); ai.t = rand(0.3, 0.5); return; }
      c.press('a'); ai.t = rand(0.8, 1.4);
    } else if (st.mode === 'design') {
      if (!ai.plan) ai.plan = autoDesign(st.type);
      if (st.fly) { ai.t = 0.1; return; }
      const tok = ai.plan[st.beads.length];
      if (!tok) { c.press(st.onDone ? 'a' : 'rb'); ai.t = st.onDone ? 3 : rand(0.3, 0.5); return; }   // RB to Done, then A
      const tg = tok.charm != null ? { kind: 'charms', r: Math.floor(tok.charm / 4), c: tok.charm % 4 } : { kind: 'beads', r: FREE_TRAY.rows.indexOf(tok.s), c: FREE_TRAY.cols.indexOf(tok.c) };
      if (navTo(tg)) return;
      c.press('x'); ai.t = think() * 0.7;   // (X: thread it and stay on this tray)
    }
  }

  // --- mouse / touch (the first human player) -----------------------------------------
  pointerInput() {
    const btn = ui.clickedHint();
    if (btn && this.ptrSt) { this.ptrSt.p.ctrl.inject(btn); return; }
    const st = this.ptrSt, P = input.pointer;
    if (!st || !P.seen) return;
    const k = st.k;
    const over = (x, y, w, h) => input.pointerOver({ x: st.ox + x * k, y: st.oy + y * k, w: w * k, h: h * k });
    const hit = (x, y, w, h) => over(x, y, w, h) && P.pressed;
    if (st.mode === 'design' && st.onDone) {
      const d = this.doneRect();
      if (hit(d.x, d.y, d.w, d.h)) this.finishDesign(st);
      return;
    }
    if (st.mode === 'pattern' || st.mode === 'design') {
      const L = this.trayLayout(st);
      for (let r = 0; r < st.tray.rows.length; r++) {
        for (let c = 0; c < st.tray.cols.length; c++) {
          const cp = this.cellPos(st, r, c);
          if (cp.x < L.innerX || cp.x > L.innerX + L.innerW || cp.y < L.innerY || cp.y > L.innerY + L.innerH) continue;
          if (hit(cp.x - L.colW / 2, cp.y - L.rowH / 2, L.colW, L.rowH)) { st.cur = { r, c }; st.trayBump = 0.12; this.threadCursor(st); return; }
        }
      }
      // scroll arrows
      if (st.tray.cols.length > VIS_COLS) {
        if (hit(TRAY.x, TRAY.y, 36, TRAY.h)) { this.moveCursor(st, 0, -1); return; }
        if (hit(TRAY.x + TRAY.w - 36, TRAY.y, 36, TRAY.h)) { this.moveCursor(st, 0, 1); return; }
      }
      if (st.tray.rows.length > VIS_ROWS) {
        if (hit(TRAY.x + 40, TRAY.y - 6, TRAY.w - 80, 22)) { this.moveCursor(st, -1, 0); return; }
        if (hit(TRAY.x + 40, TRAY.y + TRAY.h - 16, TRAY.w - 80, 22)) { this.moveCursor(st, 1, 0); return; }
      }
      // the last bead on the string comes off
      const last = st.beads.length - 1;
      if (last >= (st.mode === 'pattern' ? st.given : 0)) {
        const s = slotPos(st.slots, last), r = beadR(st.slots) * 1.3;
        if (hit(s.x - r, s.y - r, r * 2, r * 2.4)) { this.undo(st); return; }
      }
      if (st.mode === 'pattern' && hit(CARD.x + CARD.w - 64, CARD.y + CARD.h - 60, 60, 56)) { this.hint(st); return; }
      if (st.mode === 'design') {
        const d = this.doneRect();
        if (hit(d.x, d.y, d.w, d.h)) { this.finishDesign(st); return; }
        for (let i = 0; i < 3; i++) {
          if (!hit(TABS.x + i * TAB_W, TABS.y, TAB_W, TABS.h)) continue;
          if (i === 2) st.onDone = true;
          else { st.onDone = false; if ((i === 0) !== (st.tray.kind === 'beads')) this.toggleTray(st); }
          return;
        }
      }
    } else if (st.mode === 'pick') {
      for (let i = 0; i < TYPES.length; i++) {
        const t = this.typeTile(i);
        if (over(t.x, t.y, t.w, t.h) && P.moved && st.pick !== i) { st.pick = i; sfx('move', { vol: 0.5 }); }
        if (hit(t.x, t.y, t.w, t.h)) { this.pickType(st, i); return; }
      }
    } else if (st.mode === 'done' && this.phase === 'design') {
      const d = this.doneRect();
      if (hit(d.x, d.y, d.w, d.h)) { st.mode = 'design'; st.wearing = false; sfx('back'); }
    }
  }

  doneRect() { return { x: CARD.x + CARD.w - 190, y: CARD.y + CARD.h - 78, w: 176, h: 64 }; }
  typeTile(i) { const w = 196, gap = 16, x0 = TRAY.x + (TRAY.w - (w * 3 + gap * 2)) / 2; return { x: x0 + i * (w + gap), y: TRAY.y + 8, w, h: TRAY.h - 16 }; }

  // --- showcase --------------------------------------------------------------------
  updateShow(dt) {
    const t = this.phaseT, cam = this.api.camera;
    for (const st of this.stations) {
      const a = st.actor, s = st.show;
      if (t < 1.3) {
        const e = ease.inOutQuad(clamp(t / 1.2, 0, 1));
        a.x = lerp(s.from.x, s.to.x, e); a.y = lerp(s.from.y, s.to.y, e); a.scale = lerp(s.from.s, s.toScale, e);
        a.facing = s.to.x >= s.from.x ? 1 : -1; a.setPose(e < 1 ? 'walk' : 'idle');
      } else if (!st.settled) { st.settled = true; a.facing = 1; a.setPose('idle'); }
      if (st.twirlT >= 0) { st.twirlT += dt; if (st.twirlT > 1.1) { st.twirlT = -1; a.playOnce('strike2', 0.8, 'idle'); } }
      a.update(dt);
    }
    // one twirl at a time
    for (let i = 0; i < this.n; i++) {
      const at = this.twirlStart + i * this.twirlGap;
      if (t >= at && t - dt < at) {
        const st = this.stations[i], a = st.actor;
        st.twirlT = 0; st.spotT = 0;
        a.playOnce('pose-twirl', 1.0, 'idle'); a.squash(-0.2);
        sfx('magic', { vol: 0.8 }); sfx('sparkle');
        snd('crowd-ooh', null, { vol: 0.5 });
        const hand = a.anchor('hand');
        particles.burst(hand.x, hand.y, { type: 'sparkle', count: 14, colors: ['#fff', '#fff6a8', '#ffc4e6'], speed: [80, 260] });
        if (cam) cam.punch(a.x, a.y - a.height * 0.5, 1.18, this.twirlGap * 0.55);
      }
    }
    for (const st of this.stations) if (st.spotT !== undefined) st.spotT += dt;
    const ch = this.cheeseAt;
    if (t >= ch && !this.cheese) { this.cheese = true; sfx('giggle'); for (const st of this.stations) { st.actor.setPose('wave'); st.hop = { h: 0, v: 0 }; st.poseCD = 0; } }
    // Until the shutter clicks everyone can run, jump and pose for the photo.
    if (this.cheese && !this.photoTaken) for (const st of this.stations) this.cheeseMove(st, dt);
    const shot = ch + CHEESE_TIME;
    for (const d of [3, 2, 1]) if (t >= shot - d && t - dt < shot - d) sfx(d === 1 ? 'tock' : 'tick');
    if (t >= shot && !this.photoTaken) {
      this.photoTaken = true; this.photoT = 0;
      this.photo = this.snapshot();   // exactly what the stage looked like at the click
      fx.flash('#ffffff', 0.45);
      if (hasSound('camera-flash')) sfx('camera-flash', { vol: 0.7 }); else sfx('shutter');
      sfx('fanfare'); snd('applause', 'cheer');
      particles.confettiRain(W, 140);
      this.stations.forEach((st, i) => { st.hop = null; st.actor.y = st.show.to.y; st.actor.playOnce(i % 2 ? 'photo' : 'strike3', 1.0, 'celebrate'); });
    }
    if (this.photoTaken) {
      const before = this.photoT;
      this.photoT += dt;
      if (before < PHOTO_PIN + PHOTO_FLY && this.photoT >= PHOTO_PIN + PHOTO_FLY) { sfx('pop'); particles.burst(PIN.x, PIN.y - 120, { type: 'sparkle', count: 10, colors: ['#fff', '#ffd23f'] }); }
    }
    if (this.photoTaken && this.photoT > PHOTO_PIN + PHOTO_FLY + 1.6) this.finishGame();
    if (cam && !cam.punchState) cam.follow(W / 2, H / 2, 1, 3);
  }

  // =================================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'show') { this.drawShow(g); return; }
    this.drawShopBack(g);
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawHUD(g) {
    this.drawTopBar(g);
    const P = this.phase, t = this.phaseT;
    const sub = (s) => ui.text(g, s, W / 2, H / 2 + 120, { size: 58, color: '#fff', alpha: clamp((t - 0.3) / 0.3, 0, 1) });
    if (P === 'intro') {
      ui.banner(g, this.round === 0 ? 'Round 1' : 'Round 2', t, { size: 170, color: '#ff7ac6' });
      sub(this.round === 0 ? 'Finish the patterns!' : 'Trickier patterns!');
    } else if (P === 'roundEnd' && t > 0.3) {
      ui.banner(g, 'Great job!', t - 0.3, { size: 150, color: '#ffd23f' });
    } else if (P === 'designIntro') {
      ui.banner(g, 'Design time!', t, { size: 160, color: '#b98bff' });
      sub('Make your own sparkly jewelry!');
    } else if (P === 'show') this.drawShowHUD(g);
  }

  drawTopBar(g) {
    if (this.phase === 'show') return;
    g.save();
    const gr = g.createLinearGradient(0, 0, 0, 104);
    gr.addColorStop(0, '#fff3fa'); gr.addColorStop(1, '#ffe0f0');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 96);
    for (let x = W; x >= 0; x -= 48) g.quadraticCurveTo(x - 24, 112, x - 48, 96);
    g.closePath(); g.fill();
    g.lineWidth = 4; g.strokeStyle = 'rgba(36,22,63,0.25)'; g.stroke();
    g.restore();
    // title with a little bead garland
    const tx = 28;
    [[0, 0], [2, 3], [1, 5], [3, 6]].forEach(([s, c], i) => drawToken(g, { s, c }, tx + 16 + i * 28, 54 + Math.sin(this.t * 3 + i) * 3, 12));
    ui.text(g, 'Sparkle Bead Shop', tx + 126, 54, { size: 44, color: '#ff6fb1', align: 'left', strokeWidth: 9, maxWidth: 470 });
    // round (the clock beside it is the play scene's api.limit countdown)
    const label = this.round === 2 ? 'Design' : `Round ${this.round + 1}`;
    ui.panel(g, W / 2 - 310, 26, 196, 56, { r: 28, fill: this.round === 2 ? '#b98bff' : '#ff7ac6', lineWidth: 4 });
    ui.text(g, label, W / 2 - 212, 55, { size: 34, strokeWidth: 6 });
    // controls legend (top-right corner)
    const anyPick = this.stations.some((s) => s.mode === 'pick');
    let list;
    if (this.round === 2 && anyPick) list = [['stick', 'Choose'], ['a', 'OK']];
    else if (this.round === 2) list = [['stick', 'Pick'], ['x', 'Thread'], ['a', 'Thread, go on'], ['b', 'Undo'], ['rb', 'Charms · Done']];
    else list = [['stick', 'Pick'], ['a', 'Thread'], ['b', 'Undo'], ['y', 'Hint']];
    ui.hints(g, list, W - 24, 54, { size: 30, gap: 20, align: 'right' });
  }

  drawShopBack(g) {
    const bg = art('bg/bead-bracelets');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    const t = this.t;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffeaf5'); gr.addColorStop(1, '#ffe6d6');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 40, H);
    // shelves of bead jars at both sides (only when the stations leave room)
    if (this.sideRoom) for (const side of [0, 1]) {
      const x0 = side ? W - 250 : 20;
      for (let s = 0; s < 3; s++) {
        const y = 330 + s * 250;
        g.fillStyle = '#d8a06a'; g.fillRect(x0, y, 230, 18); g.fillStyle = '#b97f4c'; g.fillRect(x0, y + 18, 230, 8);
        for (let j = 0; j < 3; j++) {
          const jar = this.jars[(side * 9 + s * 3 + j) % this.jars.length], jx = x0 + 40 + j * 75, jh = jar.h + 30;
          g.fillStyle = 'rgba(220,240,255,0.65)'; ui.roundRect(g, jx - 28, y - jh, 56, jh, 12); g.fill();
          g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
          for (let b = 0; b < 6; b++) drawToken(g, { s: (jar.s + b) % 6, c: (BEAD_COLORS.findIndex((cc) => cc.c === jar.c) + (b % 2)) % 8 }, jx - 14 + (b % 3) * 14, y - 12 - Math.floor(b / 3) * 16, 8);
          g.fillStyle = '#ff9fcf'; g.fillRect(jx - 30, y - jh - 10, 60, 14); g.strokeRect(jx - 30, y - jh - 10, 60, 14);
        }
      }
    }
    // a swag of giant beads under the title band
    for (let i = 0; i < 26; i++) {
      const x = 40 + i * 72, y = 132 + Math.sin(i * 0.8) * 10 + Math.sin(t * 1.5 + i) * 2;
      drawToken(g, { s: i % 6, c: (i * 3) % 8 }, x, y, 16);
    }
    g.fillStyle = '#e8b98a'; g.fillRect(0, H - 40, W, 40);
  }

  // --- one station ---------------------------------------------------------------------
  drawStation(g, st) {
    const { p, k } = st;
    g.save();
    g.translate(st.ox, st.oy); g.scale(k, k);
    g.save();
    ui.roundRect(g, 0, 0, SW, SH, 26); g.clip();
    this.drawWallAndCounter(g, st);
    this.drawCard(g, st);
    this.drawShelf(g, st);
    this.drawString(g, st);
    this.drawTrayArea(g, st);
    this.drawFinishFx(g, st);
    // the shop keeper (the player's character)
    const a = st.actor;
    g.fillStyle = mix(p.color, '#ffffff', 0.55);
    g.beginPath(); g.ellipse(CHAR.x, CHAR.y, 80, 20, 0, 0, TAU); g.fill();
    this.drawActorTwirl(g, a, st.twirlT, { ring: p.color });
    // flying bead on top of everything
    if (st.fly) drawToken(g, st.fly.tok, st.fly.x, st.fly.y, beadR(st.slots) * 1.05, { hang: false });
    for (const w of st.wob) {
      const life = w.kind === 'wiggle' ? (w.popped ? 1 - (w.t - 0.42) / 0.58 : 1) : 1 - w.t / 0.6;
      const wig = w.kind === 'wiggle' && !w.popped ? Math.sin(w.t * 48) * 0.35 : w.t * 6;
      drawToken(g, w.tok, w.x, w.y, beadR(st.slots), { alpha: clamp(life, 0, 1), rot: wig });
    }
    g.restore();
    // frame
    ui.roundRect(g, 0, 0, SW, SH, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke();
    g.restore();
  }

  drawWallAndCounter(g, st) {
    const p = st.p;
    const room = art('bg/bead-bracelets-station');
    if (room) g.drawImage(room, 0, 0, SW, SH);
    else {
      const wg = g.createLinearGradient(0, 0, 0, COUNTER_Y);
      wg.addColorStop(0, mix(p.color, '#ffffff', 0.86)); wg.addColorStop(1, mix(p.color, '#ffffff', 0.74));
      g.fillStyle = wg; g.fillRect(0, 0, SW, COUNTER_Y);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let y = 18, row = 0; y < COUNTER_Y; y += 34, row++) for (let x = (row % 2) * 17; x < SW; x += 34) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
    }
    // customer (behind the counter)
    if (this.round < 2) {
      g.save(); g.beginPath(); g.rect(0, 0, SW, COUNTER_Y + 2); g.clip();
      if (st.oldCust) st.oldCust.actor.draw(g, { shadow: false });
      if (st.cust && st.cust.state !== 'gone') st.cust.actor.draw(g, { shadow: false });
      g.restore();
    } else this.drawMirror(g, st);
    if (!room) {
      // counter top: wood with a soft bead mat
      const cg = g.createLinearGradient(0, COUNTER_Y, 0, SH);
      cg.addColorStop(0, '#f6d2a6'); cg.addColorStop(1, '#e7b07c');
      g.fillStyle = cg; g.fillRect(0, COUNTER_Y, SW, SH - COUNTER_Y);
      g.fillStyle = 'rgba(150,90,40,0.12)';
      for (let y = COUNTER_Y + 30; y < SH; y += 44) g.fillRect(0, y, SW, 3);
      g.fillStyle = '#c98a55'; g.fillRect(0, COUNTER_Y, SW, 12);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, COUNTER_Y, SW, 3);
    }
    // the bead mat under the string
    ui.roundRect(g, STR.x0 - 46, STR.y - 52, STR.tip - STR.x0 + 52, 116, 26);
    g.fillStyle = mix(p.color, '#ffffff', 0.72); g.fill();
    g.save(); g.setLineDash([10, 8]); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)';
    ui.roundRect(g, STR.x0 - 38, STR.y - 44, STR.tip - STR.x0 + 36, 100, 20); g.stroke(); g.restore();
  }

  /** Free-design round: a little vanity mirror where the customer stood. */
  drawMirror(g, st) {
    const cx = CUST.x, cy = 110, rx = 66, ry = 84;
    g.beginPath(); g.ellipse(cx, cy, rx + 12, ry + 12, 0, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
    const mg = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    mg.addColorStop(0, '#e9f8ff'); mg.addColorStop(0.5, '#cdeeff'); mg.addColorStop(1, '#f2e6ff');
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fillStyle = mg; g.fill(); g.lineWidth = 4; g.stroke();
    g.save(); g.clip();
    drawPortrait(g, st.p, cx, cy + 6, 50, { expr: st.mode === 'done' ? 'happy' : 'neutral' });
    g.globalAlpha = 0.45; g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(cx - rx, cy - ry * 0.1); g.lineTo(cx - rx * 0.1, cy - ry); g.lineTo(cx + rx * 0.2, cy - ry); g.lineTo(cx - rx, cy + ry * 0.25); g.fill();
    g.restore();
    for (let i = 0; i < 4; i++) {
      const a = this.t * 1.3 + i * 1.6;
      g.save(); g.translate(cx + Math.cos(a) * (rx + 22), cy + Math.sin(a) * (ry + 18)); g.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 4 + i);
      drawSparkleShape(g, 26, '#fff6a8'); g.restore();
    }
  }

  drawCard(g, st) {
    const t = this.t, mode = st.mode;
    const custHere = st.cust && (st.cust.state === 'wait' || st.cust.state === 'happy');
    const showOrder = this.round < 2 && st.order && (mode === 'pattern' || st.finishFx) && custHere;
    const design = this.round === 2 && mode !== 'wait';
    if (!showOrder && !design) return;
    const pop = ease.outBack(clamp(st.cardPop / 0.35, 0, 1));
    g.save();
    g.translate(CARD.x + CARD.w / 2, CARD.y + CARD.h / 2); g.rotate(-0.015); g.scale(pop, pop);
    const x = -CARD.w / 2, y = -CARD.h / 2;
    // speech tail toward the customer
    if (this.round < 2) {
      g.beginPath(); g.moveTo(x + 6, y + 70); g.lineTo(x - 30, y + 104); g.lineTo(x + 6, y + 106); g.closePath();
      g.fillStyle = '#fffaf0'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
    }
    const card = art('prop/pattern-card');
    if (card) g.drawImage(card, x, y, CARD.w, CARD.h);
    else {
      ui.panel(g, x, y, CARD.w, CARD.h, { r: 22, fill: '#fffaf0', lineWidth: 5 });
      g.fillStyle = design ? '#d9c4ff' : '#ffc4e6'; ui.roundRect(g, x + 5, y + 5, CARD.w - 10, 26, 16); g.fill();
      g.beginPath(); g.arc(0, y + 14, 9, 0, TAU); g.fillStyle = '#ff4d6d'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    }
    if (design) this.drawDesignCard(g, st, x, y);
    else this.drawPatternSample(g, st, x, y, t);
    g.restore();
  }

  drawPatternSample(g, st, x, y, t) {
    const o = st.order;
    const n = o.card;
    // items with little gaps between the repeats, then "..."
    const items = [];
    let gi = 0, inGroup = 0;
    for (let i = 0; i < n; i++) {
      items.push({ i, gap: 0 });
      inGroup++;
      if (inGroup >= o.groups[gi] && i < n - 1) { items[items.length - 1].gap = 1; gi++; inGroup = 0; }
    }
    const gaps = items.filter((it) => it.gap).length;
    const units = n + gaps * 0.5 + 1.1;
    const slot = Math.min(56, (CARD.w - 44) / units), r = slot * 0.43;
    let cx = x + (CARD.w - units * slot) / 2 + slot / 2;
    const cy = y + 32 + (CARD.h - 32) / 2 - 8;
    const pts = items.map((it) => { const px = cx; cx += slot + (it.gap ? slot * 0.5 : 0); return { x: px, y: cy, i: it.i }; });
    // cord through the sample
    g.beginPath(); g.moveTo(pts[0].x - slot * 0.6, cy); g.lineTo(cx - slot * 0.2, cy);
    g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.stroke();
    // which sample bead matches the next bead to thread (for the hint)
    const next = st.beads.length, hintOn = st.hintT > 0 && st.mode === 'pattern';
    const match = hintOn && !o.grow ? next % o.unit : -1;
    for (const q of pts) {
      if (q.i === match) {
        const pulse = 1 + Math.sin(t * 10) * 0.12;
        g.beginPath(); g.arc(q.x, q.y, r * 1.45 * pulse, 0, TAU); g.fillStyle = 'rgba(255,226,90,0.6)'; g.fill();
      }
      drawToken(g, o.seq[q.i], q.x, q.y, r);
    }
    // "..."
    for (let d = 0; d < 3; d++) { g.beginPath(); g.arc(cx - slot * 0.1 + d * slot * 0.24, cy, slot * 0.07, 0, TAU); g.fillStyle = NAVY; g.fill(); }
    // hint button (Y)
    if (st.mode === 'pattern') {
      const bx = x + CARD.w - 34, by = y + CARD.h - 30;
      ui.glyph(g, 'y', bx, by, 40, { pulse: st.idleT > 8 && !st.p.isAI });
      if (st.hintT > 0) { g.save(); g.translate(bx - 30, by - 4); g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8); drawSparkleShape(g, 34, '#ffe27a'); g.restore(); }
    }
  }

  drawDesignCard(g, st, x, y) {
    const t = this.t;
    if (st.mode === 'pick') {
      ui.text(g, 'Make your own!', 0, y + 90, { size: 40, color: '#b98bff', strokeWidth: 8, maxWidth: CARD.w - 120 });
      for (const sx of [-1, 1]) { g.save(); g.translate(sx * 182, y + 92); g.rotate(t); drawSparkleShape(g, 40, '#ffd23f'); g.restore(); }
      for (let i = 0; i < 6; i++) drawToken(g, { s: i, c: [0, 3, 5, 4, 6, 2][i] }, (i - 2.5) * 52, y + 150 + Math.sin(t * 3 + i) * 4, 17);
      return;
    }
    drawTypeIcon(g, st.type, x + 92, y + 108, 130, t);
    // count of beads
    ui.text(g, `${st.beads.length}/${st.slots}`, x + 196, y + 70, { size: 40, color: NAVY, stroke: false, weight: 800, align: 'left' });
    const d = this.doneRect(), dx = d.x - CARD.x - CARD.w / 2, dy = d.y - CARD.y - CARD.h / 2;
    const ok = st.beads.length >= 3, done = st.mode === 'done';
    const wob = st.doneBump > 0 ? Math.sin(st.doneBump * 40) * 0.08 : 0;
    g.save(); g.translate(dx + d.w / 2, dy + d.h / 2); g.rotate(wob);
    if (done) {
      ui.panel(g, -d.w / 2, -d.h / 2, d.w, d.h, { r: d.h / 2, fill: '#36d17a', lineWidth: 5 });
      ui.text(g, 'Ready!', 0, 2, { size: 36, strokeWidth: 6 });
    } else {
      // RB along to the Done tab; there A says it's finished
      ui.panel(g, -d.w / 2, -d.h / 2, d.w, d.h, { r: d.h / 2, fill: st.onDone ? '#36d17a' : ok ? '#ffd23f' : '#e6e0ee', lineWidth: 5 });
      ui.glyph(g, st.onDone ? 'a' : 'rb', -d.w / 2 + 34, 0, 42, { pulse: (ok || st.onDone) && !st.p.isAI });
      ui.text(g, st.onDone ? 'Ready!' : 'Done', 20, 2, { size: 34, color: ok || st.onDone ? NAVY : '#9a90ad', stroke: false, weight: 800 });
    }
    g.restore();
  }

  drawShelf(g, st) {
    const { p } = st, x = SHELF.x, y = SHELF.y, w = SHELF.w, h = SHELF.h;
    const shelf = art('prop/bead-shelf');
    if (shelf) g.drawImage(shelf, x, y + 44, w, h - 44);
    else {
      ui.panel(g, x, y + 44, w, h - 44, { r: 16, fill: '#f0c08f', lineWidth: 4, shadow: false });
      g.fillStyle = 'rgba(150,90,40,0.25)';
      for (let yy = y + 60; yy < y + h - 8; yy += 18) for (let xx = x + 16; xx < x + w - 8; xx += 18) { g.beginPath(); g.arc(xx, yy, 2.2, 0, TAU); g.fill(); }
    }
    // player tag + portrait + count
    ui.panel(g, x + 4, y, 76, 40, { r: 20, fill: p.color, lineWidth: 4, shadow: false });
    ui.text(g, p.tag, x + 42, y + 21, { size: 24, strokeWidth: 5, shadow: false });
    drawPortrait(g, p, x + 106, y + 20, 22, { ring: p.color, ringWidth: 3, expr: st.mode === 'done' || (st.finishFx && st.finishFx.t > 0.9) ? 'happy' : 'neutral' });
    g.save(); g.translate(x + 150, y + 21); drawStarShape(g, 36, '#ffd23f'); g.restore();
    const bump = st.shelfPop < 0.4 ? 1 + 0.35 * Math.sin((st.shelfPop / 0.4) * Math.PI) : 1;
    g.save(); g.translate(x + 194, y + 22); g.scale(bump, bump);
    ui.text(g, String(st.done), 0, 0, { size: 36, color: NAVY, stroke: false, weight: 800 });
    g.restore();
    // finished bracelets on pegs (the latest six)
    const list = st.shelf.slice(-6), extra = st.shelf.length - list.length;
    list.forEach((toks, j) => {
      const col = j % 3, row = Math.floor(j / 3);
      const px = x + 40 + col * 72, py = y + 66 + row * 64;
      g.beginPath(); g.arc(px, py, 4, 0, TAU); g.fillStyle = '#8a5a2e'; g.fill();
      const fresh = j === list.length - 1 && st.shelfPop < 0.5 ? ease.outBack(clamp(st.shelfPop / 0.5, 0, 1)) : 1;
      g.save(); g.translate(px, py + 26); g.scale(fresh, fresh);
      drawLoop(g, toks.slice(0, 12), 0, 0, 28, 14, 6.5, { spin: this.t * 0.4 + j });
      g.restore();
    });
    if (extra > 0) ui.text(g, '+' + extra, x + w - 22, y + h - 18, { size: 24, color: NAVY, stroke: false, weight: 800 });
    if (!st.shelf.length && this.round < 2) {
      g.save(); g.globalAlpha = 0.35;
      for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + 40 + j * 72, y + 66, 4, 0, TAU); g.fillStyle = '#8a5a2e'; g.fill(); g.beginPath(); g.ellipse(x + 40 + j * 72, y + 92, 28, 14, 0, 0, TAU); g.lineWidth = 3; g.setLineDash([5, 5]); g.strokeStyle = NAVY; g.stroke(); g.setLineDash([]); }
      g.restore();
    }
  }

  drawString(g, st) {
    const t = this.t;
    if (this.round === 2 && (st.mode === 'pick' || st.mode === 'wait')) return;
    if (this.round < 2 && !st.order) return;
    const shake = st.stringShake > 0 ? Math.sin(st.stringShake * 60) * 4 : 0;
    g.save(); g.translate(shake, 0);
    const n = st.slots, r = beadR(n);
    // cord
    g.beginPath(); g.moveTo(STR.x0 - 22, STR.y);
    for (let x = STR.x0; x <= STR.x1; x += 14) g.lineTo(x, stringY(x));
    g.lineTo(STR.tip - 30, STR.y);
    g.lineWidth = 7; g.strokeStyle = NAVY; g.lineCap = 'round'; g.stroke();
    g.lineWidth = 3.5; g.strokeStyle = '#fff3fb'; g.stroke();
    // clasp
    g.beginPath(); g.arc(STR.x0 - 30, STR.y, 10, 0, TAU); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 3.5; g.strokeStyle = '#ffd23f'; g.stroke();
    // needle
    g.save(); g.translate(STR.tip - 34, STR.y);
    const ng = g.createLinearGradient(0, -6, 0, 6); ng.addColorStop(0, '#ffffff'); ng.addColorStop(1, '#a9b3c8');
    g.beginPath(); g.moveTo(-6, -5); g.lineTo(28, -1.5); g.lineTo(36, 0); g.lineTo(28, 1.5); g.lineTo(-6, 5); g.closePath();
    g.fillStyle = ng; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.ellipse(2, 0, 4, 2, 0, 0, TAU); g.fillStyle = NAVY; g.fill();
    g.restore();
    // empty slots
    const next = st.beads.length;
    for (let i = next; i < n; i++) {
      const s = slotPos(n, i);
      g.beginPath(); g.arc(s.x, s.y, r * 0.55, 0, TAU);
      g.lineWidth = 2.5; g.setLineDash([4, 5]); g.strokeStyle = 'rgba(36,22,63,0.3)'; g.stroke(); g.setLineDash([]);
    }
    // where the next bead goes (+ the hint's ghost bead)
    if (next < n && (st.mode === 'pattern' || st.mode === 'design')) {
      const s = slotPos(n, next), pulse = 0.5 + 0.5 * Math.sin(t * 6);
      g.beginPath(); g.arc(s.x, s.y, r * (1.05 + pulse * 0.12), 0, TAU); g.lineWidth = 4; g.strokeStyle = st.p.color; g.globalAlpha = 0.5 + 0.4 * pulse; g.stroke(); g.globalAlpha = 1;
      if (st.hintT > 0 && st.mode === 'pattern') drawToken(g, st.order.seq[next], s.x, s.y - Math.abs(Math.sin(t * 5)) * 8, r, { alpha: 0.45 + 0.25 * pulse });
    }
    // beads (a finished strand is drawn by drawFinishFx while it curls up)
    for (let i = 0; i < (st.finishFx ? 0 : next); i++) {
      const s = slotPos(n, i), tok = st.beads[i];
      const pop = st.pops.find((q) => q.i === i);
      const k = pop ? 1 + 0.4 * Math.sin((pop.t / 0.3) * Math.PI) : 1;
      if (tok.charm != null) drawCharm(g, tok.charm, s.x, s.y, r * 0.85 * k, { hang: true, swing: Math.sin(t * 2.4 + i) * 0.18 });
      else drawToken(g, tok, s.x, s.y, r * k);
      const gl = st.glints.find((q) => q.i === i);
      if (gl && gl.t > 0) drawGlint(g, s.x, s.y, r, gl.t / 0.7);
    }
    // little "started" ribbon over the customer's beads
    if (this.round < 2 && st.given > 0 && !st.finishFx) {
      const a = slotPos(n, 0), b = slotPos(n, st.given - 1);
      g.beginPath(); g.moveTo(a.x - r, a.y + r + 10); g.lineTo(b.x + r, b.y + r + 10);
      g.lineWidth = 5; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,122,198,0.55)'; g.stroke();
    }
    g.restore();
  }

  drawTrayArea(g, st) {
    const t = this.t;
    if (this.round === 2 && st.mode === 'pick') { this.drawTypePicker(g, st); return; }
    if (this.round === 2 && st.mode === 'done') { this.drawDoneNote(g, st); return; }
    if (this.round === 2 && st.mode === 'wait') return;
    if (this.round < 2 && !st.order) return;
    // tabs (free design: beads / charms / Done)
    if (this.round === 2) {
      const tw = TAB_W;
      ['beads', 'charms'].forEach((kind, i) => {
        const sel = st.tray.kind === kind && !st.onDone, tx = TABS.x + i * tw;
        ui.panel(g, tx + 3, TABS.y + (sel ? 0 : 5), tw - 6, TABS.h - (sel ? 0 : 5), { r: 14, fill: sel ? '#ffffff' : mix(st.p.color, '#ffffff', 0.45), lineWidth: sel ? 4 : 3, shadow: false });
        if (kind === 'beads') { drawToken(g, { s: 0, c: 0 }, tx + tw / 2 - 26, TABS.y + 21, 11); drawToken(g, { s: 1, c: 5 }, tx + tw / 2, TABS.y + 21, 11); drawToken(g, { s: 2, c: 3 }, tx + tw / 2 + 26, TABS.y + 21, 11); }
        else { drawCharm(g, 0, tx + tw / 2 - 22, TABS.y + 21, 11); drawCharm(g, 2, tx + tw / 2 + 22, TABS.y + 21, 11); }
      });
      drawDoneTab(g, TABS.x + 2 * tw + 3, TABS.y + (st.onDone ? 0 : 5), tw - 6, TABS.h - (st.onDone ? 0 : 5), { sel: st.onDone, label: false });
      ui.glyph(g, 'lb', TABS.x + TABS.w + 24, TABS.y + 20, 32); ui.glyph(g, 'rb', TABS.x + TABS.w + 62, TABS.y + 20, 32);
    }
    if (this.round === 2 && st.onDone) {
      drawDoneCard(g, TRAY, st.p.color, { back: st.beads.length < 3 ? 'Thread 3 beads first! (LB)' : 'LB to change something' });
      return;
    }
    // the tray
    const tray = art('prop/bead-tray');
    if (tray) g.drawImage(tray, TRAY.x, TRAY.y, TRAY.w, TRAY.h);
    else {
      ui.panel(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h, { r: 22, fill: '#c98a55', lineWidth: 5 });
      const vg = g.createLinearGradient(0, TRAY.y, 0, TRAY.y + TRAY.h);
      vg.addColorStop(0, '#7a4fb8'); vg.addColorStop(1, '#5b3891');
      ui.roundRect(g, TRAY.x + 12, TRAY.y + 10, TRAY.w - 24, TRAY.h - 20, 16); g.fillStyle = vg; g.fill();
    }
    const L = this.trayLayout(st), tr = st.tray;
    g.save();
    g.beginPath(); g.rect(L.innerX - 6, L.innerY - 4, L.innerW + 12, L.innerH + 8); g.clip();
    // hinted cell
    let hint = null;
    if (st.hintT > 0 && st.mode === 'pattern') {
      const want = st.order.seq[st.beads.length];
      if (want) hint = { r: tr.rows.indexOf(want.s), c: tr.cols.indexOf(want.c) };
    }
    for (let r = 0; r < tr.rows.length; r++) {
      for (let c = 0; c < tr.cols.length; c++) {
        const cp = this.cellPos(st, r, c);
        if (cp.y < L.innerY - L.rowH || cp.y > L.innerY + L.innerH + L.rowH) continue;
        const sel = st.cur.r === r && st.cur.c === c;
        const isHint = hint && hint.r === r && hint.c === c;
        // dimple
        g.beginPath(); g.ellipse(cp.x, cp.y + L.br * 0.15, L.br * 1.2, L.br * 1.05, 0, 0, TAU); g.fillStyle = 'rgba(30,10,60,0.32)'; g.fill();
        if (isHint) {
          const pulse = 1 + Math.sin(t * 9) * 0.1;
          g.beginPath(); g.arc(cp.x, cp.y, L.br * 1.55 * pulse, 0, TAU); g.fillStyle = 'rgba(255,226,90,0.55)'; g.fill();
          g.lineWidth = 4; g.strokeStyle = '#fff3a0'; g.stroke();
        }
        if (sel) {
          const k = 1 + st.trayBump * 1.2;
          g.save(); g.translate(cp.x, cp.y); g.scale(k, k);
          ui.roundRect(g, -L.colW / 2 + 5, -L.rowH / 2 + 3, L.colW - 10, L.rowH - 6, 14);
          g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill(); g.lineWidth = 5; g.strokeStyle = st.p.color; g.stroke();
          g.restore();
        }
        const tok = this.tokAt(st, r, c);
        const rr = L.br * (sel ? 1.15 : 1);
        drawToken(g, tok, cp.x, cp.y + (sel ? Math.sin(t * 5) * 2 : 0), tok.charm != null ? rr * 0.85 : rr);
        if (isHint) {
          const by = cp.y - L.br * 1.6 - Math.abs(Math.sin(t * 6)) * 8;
          g.beginPath(); g.moveTo(cp.x - 12, by - 14); g.lineTo(cp.x + 12, by - 14); g.lineTo(cp.x, by); g.closePath();
          g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        }
      }
    }
    g.restore();
    // scroll arrows
    const arrow = (x, y, dir, on) => {
      if (!on) return;
      g.save(); g.translate(x, y); g.rotate(dir);
      g.beginPath(); g.moveTo(-9, -13); g.lineTo(9, 0); g.lineTo(-9, 13); g.closePath();
      g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); g.restore();
    };
    const nc = tr.cols.length, nr = tr.rows.length;
    arrow(TRAY.x + 22, TRAY.y + TRAY.h / 2, Math.PI, nc > VIS_COLS && st.sx > 0.1);
    arrow(TRAY.x + TRAY.w - 22, TRAY.y + TRAY.h / 2, 0, nc > VIS_COLS && st.sx < nc - VIS_COLS - 0.1);
    arrow(TRAY.x + TRAY.w / 2, TRAY.y + 6, -Math.PI / 2, nr > VIS_ROWS && st.sy > 0.1);
    arrow(TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h - 6, Math.PI / 2, nr > VIS_ROWS && st.sy < nr - VIS_ROWS - 0.1);
  }

  drawTypePicker(g, st) {
    const t = this.t;
    TYPES.forEach((ty, i) => {
      const r = this.typeTile(i), sel = st.pick === i;
      const k = sel ? 1 + st.trayBump * 0.8 : 1;
      g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(k, k);
      ui.panel(g, -r.w / 2, -r.h / 2, r.w, r.h, { r: 22, fill: sel ? '#ffffff' : mix(st.p.color, '#ffffff', 0.6), lineWidth: sel ? 6 : 4, stroke: sel ? st.p.color : NAVY });
      drawTypeIcon(g, ty.id, 0, -16, 128, t + i);
      ui.text(g, ty.name, 0, r.h / 2 - 26, { size: 30, color: sel ? st.p.color : NAVY, stroke: sel ? NAVY : false, strokeWidth: 5, weight: 800 });
      g.restore();
    });
    if (!st.p.isAI) ui.glyph(g, 'a', TRAY.x + TRAY.w - 26, TRAY.y + 26, 40, { pulse: true });
  }

  drawDoneNote(g, st) {
    ui.panel(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h, { r: 22, fill: 'rgba(255,255,255,0.85)', lineWidth: 4 });
    const p = Math.min(1, (st.doneT || 0) / 0.3), sc = ease.outBack(p);
    g.save(); g.translate(TRAY.x + TRAY.w / 2, TRAY.y + 66); g.rotate(-0.06); g.scale(sc, sc);
    ui.panel(g, -150, -40, 300, 80, { r: 40, fill: '#36d17a', lineWidth: 5 });
    ui.text(g, 'Ta-da!', 0, 2, { size: 50, weight: 800 });
    g.restore();
    const waiting = this.stations.filter((s) => s.mode !== 'done').length;
    if (waiting) ui.text(g, waiting === 1 ? 'Waiting for 1 friend...' : `Waiting for ${waiting} friends...`, TRAY.x + TRAY.w / 2, TRAY.y + 132, { size: 28, color: NAVY, stroke: false });
    if (!st.p.isAI && this.phase === 'design') {
      ui.glyph(g, 'b', TRAY.x + TRAY.w / 2 - 50, TRAY.y + 168, 36);
      ui.text(g, 'Change', TRAY.x + TRAY.w / 2 - 22, TRAY.y + 170, { size: 30, align: 'left', color: NAVY, stroke: false });
    }
  }

  /** Completed bracelet: the strand curls into a ring and floats to the customer. */
  drawFinishFx(g, st) {
    const f = st.finishFx;
    if (!f) return;
    const n = f.toks.length, r = beadR(f.n);
    const cx = (STR.x0 + STR.x1) / 2, cy = STR.y - 10;
    const hand = st.cust ? st.cust.actor.anchor('hand') : { x: CUST.x, y: 160 };
    const u1 = ease.inOutQuad(clamp(f.t / 0.45, 0, 1)), u2 = ease.inOutQuad(clamp((f.t - 0.5) / 0.42, 0, 1));
    const rx = lerp(110, 40, u2), ry = rx * 0.42;
    const ox = lerp(cx, hand.x, u2), oy = lerp(cy, hand.y, u2) - Math.sin(u2 * Math.PI) * 60;
    const items = f.toks.map((tok, i) => {
      const s = slotPos(f.n, i), a = this.t * 1.5 + (i / n) * TAU + Math.PI / 2;
      const rx2 = ox + Math.cos(a) * rx, ry2 = oy + Math.sin(a) * ry;
      return { tok, x: lerp(s.x, rx2, u1), y: lerp(s.y, ry2, u1), z: Math.sin(a) * u1 };
    }).sort((a, b) => a.z - b.z);
    const br = r * lerp(1, 0.55, u2);
    for (const it of items) {
      if (it.tok.charm != null) drawCharm(g, it.tok.charm, it.x, it.y, br * 0.85, { hang: true });
      else drawToken(g, it.tok, it.x, it.y, br * (0.85 + 0.15 * (it.z + 1) / 2));
    }
    if (f.t < 0.6) { g.save(); g.globalAlpha = Math.sin((f.t / 0.6) * Math.PI); g.translate(cx, cy); drawSparkleShape(g, 120, '#fff6a8'); g.restore(); }
  }

  // --- jewellery worn on a character (Actor attachment) ------------------------------
  drawWorn(g, st, info, def) {
    if (!st.wearing || !st.design) return;
    const h = info.h, toks = st.design, t = this.t + st.i;
    if (st.type === 'necklace') {
      const faceW = clamp(def.face[2] * h * 2, h * 0.2, h * 0.42);
      const w = Math.min(faceW * 1.0, h * 0.3), sag = w * 0.34, br = Math.max(2.2, w * 0.07);
      const list = toks.slice(0, 16), pts = strandPoints(list.length, w, sag);
      const nx = info.neck.x, ny = info.neck.y - h * 0.01;
      g.beginPath(); g.moveTo(nx - w * 0.48, ny);
      for (const q of pts) g.lineTo(nx + q.x, ny + q.y);
      g.lineTo(nx + w * 0.48, ny); g.lineWidth = Math.max(1, br * 0.35); g.strokeStyle = 'rgba(36,22,63,0.6)'; g.stroke();
      list.forEach((tok, i) => {
        const q = pts[i];
        if (tok.charm != null) drawCharm(g, tok.charm, nx + q.x, ny + q.y, br * 1.1, { hang: true, swing: Math.sin(t * 2 + i) * 0.15 });
        else drawToken(g, tok, nx + q.x, ny + q.y, br);
      });
    } else {
      const rx = Math.max(7, h * 0.085), br = Math.max(2.4, h * 0.024);
      const at = st.type === 'anklet' ? { x: info.hand.x * 0.25, y: -h * 0.07 } : info.hand;
      drawLoop(g, toks.slice(0, 12), at.x, at.y, rx, rx * 0.42, br, { spin: t * 0.7 });
    }
  }

  drawActorTwirl(g, a, twirlT, opts) {
    // Characters with real twirl frames (pose-twirl) just play them; only a
    // character without them gets the flipping-card fake spin.
    if (twirlT >= 0 && twirlT < 1 && !getSpriteSet(a.leader.asset)?.poses['pose-twirl']) {
      const ang = ease.inOutQuad(clamp(twirlT, 0, 1)) * TAU * 2, sx = Math.cos(ang);
      const s = Math.abs(sx) < 0.08 ? (sx < 0 ? -0.08 : 0.08) : sx;
      g.save(); g.translate(a.x, 0); g.scale(s, 1); g.translate(-a.x, 0);
      a.draw(g, { ...opts, emotes: false });
      g.restore();
      return;
    }
    a.draw(g, opts);
  }

  // --- the mirror showcase ------------------------------------------------------------
  drawShow(g, forPhoto = false) {
    const t = this.t;
    const bg = art('bg/bead-bracelets-mirror');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#f6d7ff'); gr.addColorStop(1, '#ffd9ec');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (let x = 0; x < W; x += 90) g.fillRect(x, 0, 45, H);
      // the big mirror
      const mx0 = 200, mx1 = W - 200, my0 = 70, my1 = H - 40, top = 230;
      const path = () => { g.beginPath(); g.moveTo(mx0, my1); g.lineTo(mx0, my0 + top); g.bezierCurveTo(mx0, my0 - 40, mx1, my0 - 40, mx1, my0 + top); g.lineTo(mx1, my1); g.closePath(); };
      path(); g.lineWidth = 56; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 44; g.strokeStyle = '#ffd23f'; g.stroke();
      g.lineWidth = 14; g.strokeStyle = '#ffe98a'; g.stroke();
      const mg = g.createLinearGradient(0, my0, 0, my1);
      mg.addColorStop(0, '#dff4ff'); mg.addColorStop(0.7, '#efe4ff'); mg.addColorStop(1, '#ffe4f3');
      path(); g.fillStyle = mg; g.fill();
      g.save(); path(); g.clip();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 4; i++) { const x = mx0 + 120 + i * 380 + ((t * 30) % 380); g.beginPath(); g.moveTo(x, my0); g.lineTo(x + 90, my0); g.lineTo(x - 260, my1); g.lineTo(x - 350, my1); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(255,190,225,0.5)'; g.fillRect(mx0, 820, mx1 - mx0, my1 - 820);
      g.restore();
      // bulbs around the frame
      for (let i = 0; i < 22; i++) {
        const u = i / 21, x = lerp(mx0, mx1, u), y = i === 0 || i === 21 ? my0 + top : my0 + top - Math.sin(u * Math.PI) * (top + 20);
        g.beginPath(); g.arc(x, y - 4, 10, 0, TAU); g.fillStyle = `rgba(255,250,210,${0.6 + 0.4 * Math.sin(t * 3 + i)})`; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      }
      for (let i = 0; i < 6; i++) { const yy = my0 + top + 60 + i * 120; for (const xx of [mx0, mx1]) { g.beginPath(); g.arc(xx, yy, 10, 0, TAU); g.fillStyle = `rgba(255,250,210,${0.6 + 0.4 * Math.sin(t * 3 + i * 2)})`; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); } }
    }
    // spotlight on the twirler
    const tw = this.stations.find((s) => s.twirlT >= 0);
    if (tw) {
      const a = tw.actor;
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,246,200,0.22)';
      g.beginPath(); g.moveTo(a.x - 30, 0); g.lineTo(a.x + 30, 0); g.lineTo(a.x + a.width * 0.8 + 40, a.y); g.lineTo(a.x - a.width * 0.8 - 40, a.y); g.closePath(); g.fill();
      g.restore();
    }
    if (!forPhoto && this.photo && this.photoT >= PHOTO_PIN + PHOTO_FLY) this.drawPinnedPhoto(g, 1);
    for (const st of this.showOrder) {
      this.drawActorTwirl(g, st.actor, st.twirlT, { ring: st.p.color });
    }
  }

  /** The photo pinned to the wall: k = 0 (big, centre) .. 1 (small, on its pin). */
  drawPinnedPhoto(g, k) {
    const e = ease.inOutQuad(clamp(k, 0, 1));
    const w = lerp(W * 0.7, PIN.w, e), h = w * (H / W), x = lerp(W / 2, PIN.x, e), y = lerp(H / 2 - 55, PIN.y, e), rot = lerp(0, PIN.rot, e);
    const m = Math.max(8, w * 0.035), mb = m * 3.2;
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgba(36,22,63,0.25)'; g.fillRect(-w / 2 - m + 8, -h / 2 - m + 10, w + m * 2, h + m + mb);
    g.fillStyle = '#ffffff'; g.fillRect(-w / 2 - m, -h / 2 - m, w + m * 2, h + m + mb);
    if (this.photo) g.drawImage(this.photo, -w / 2, -h / 2, w, h);
    g.lineWidth = Math.max(2, w * 0.004); g.strokeStyle = NAVY; g.strokeRect(-w / 2 - m, -h / 2 - m, w + m * 2, h + m + mb);
    ui.text(g, 'Sparkle Stars!', 0, h / 2 + mb * 0.5, { size: Math.max(16, mb * 0.55), color: '#ff7ac6', stroke: false, weight: 800 });
    if (e > 0.98) {   // the pin
      g.beginPath(); g.arc(0, -h / 2 - m * 0.4, Math.max(9, w * 0.03), 0, TAU); g.fillStyle = '#ff4d6d'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.arc(-3, -h / 2 - m * 0.4 - 3, Math.max(3, w * 0.009), 0, TAU); g.fillStyle = '#ffffff'; g.fill();
    }
    g.restore();
  }

  drawShowHUD(g) {
    const t = this.phaseT, cam = this.api.camera;
    // magnifier bubble showing the twirler's design up close
    for (const st of this.stations) {
      if (st.spotT === undefined || st.spotT > this.twirlGap * 0.95) continue;
      const a = st.actor, u = st.spotT, life = Math.min(clamp(u / 0.25, 0, 1), clamp((this.twirlGap * 0.95 - u) / 0.25, 0, 1));
      const pos = cam ? cam.toScreen(a.x, a.y - a.height * 0.6) : { x: a.x, y: a.y - a.height * 0.6 };
      const R = 150, bx = pos.x > W / 2 ? 330 : W - 330, by = 300;
      g.save(); g.globalAlpha = life; g.translate(bx, by); g.scale(ease.outBack(life), ease.outBack(life));
      g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = '#fffaf0'; g.fill(); g.lineWidth = 10; g.strokeStyle = st.p.color; g.stroke(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      this.drawDesignBig(g, st, 0, -6, R * 1.5);
      ui.text(g, playerName(st.p), 0, R + 40, { size: 44, color: '#fff', maxWidth: 440 });
      g.restore();
    }
    const ch = this.cheeseAt, shot = ch + CHEESE_TIME;
    if (!this.photoTaken && t > ch) {
      if (t < shot - 3) ui.banner(g, 'Say cheese!', t - ch, { y: 300, size: 130, color: '#fff' });
      else { const n = Math.ceil(shot - t), f = 1 - (shot - t - (n - 1)); g.save(); g.translate(W / 2, 300); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(n), 0, 0, { size: 200, color: '#ffd23f', strokeWidth: 12 }); g.restore(); }
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
        ui.hints(g, r1, W / 2, H - 104, { size: 36 }); ui.hints(g, r2, W / 2, H - 50, { size: 36 });
      }
    }
    if (!this.photoTaken && t < this.twirlStart + 0.3) ui.banner(g, 'Mirror, mirror!', t, { y: 170, size: 110, color: '#ff7ac6' });
    if (this.photoTaken && this.photoT < PHOTO_PIN + PHOTO_FLY) {
      if (this.photo) {
        const k = Math.max(0, this.photoT - PHOTO_PIN) / PHOTO_FLY;
        g.save(); g.fillStyle = `rgba(36,22,63,${0.45 * clamp(this.photoT / 0.4, 0, 1) * (1 - k)})`; g.fillRect(0, 0, W, H); g.restore();
        const pop = this.photoT < 0.4 ? ease.outBack(this.photoT / 0.4) : 1;
        g.save(); g.translate(W / 2, H / 2); g.scale(pop, pop); g.translate(-W / 2, -H / 2);
        this.drawPinnedPhoto(g, k);
        g.restore();
      } else this.drawPhoto(g);
    }
  }

  /** The design drawn large (magnifier bubble + photo strip). */
  drawDesignBig(g, st, x, y, s) {
    const toks = st.design || [];
    if (st.type === 'necklace') {
      const pts = strandPoints(toks.length, s * 0.9, s * 0.42), br = Math.min(s * 0.05, (s * 0.9) / Math.max(8, toks.length) * 0.45);
      g.beginPath(); g.moveTo(x - s * 0.47, y - s * 0.2);
      for (const q of pts) g.lineTo(x + q.x, y - s * 0.2 + q.y);
      g.lineTo(x + s * 0.47, y - s * 0.2); g.lineWidth = Math.max(1.5, br * 0.3); g.strokeStyle = 'rgba(36,22,63,0.6)'; g.stroke();
      toks.forEach((tok, i) => {
        const q = pts[i];
        if (tok.charm != null) drawCharm(g, tok.charm, x + q.x, y - s * 0.2 + q.y, br * 1.2, { hang: true });
        else drawToken(g, tok, x + q.x, y - s * 0.2 + q.y, br);
      });
    } else drawLoop(g, toks, x, y, s * 0.36, s * 0.17, Math.min(s * 0.055, (s * 2.2) / Math.max(8, toks.length) * 0.2), { spin: this.t * 0.6 });
  }

  drawPhoto(g) {
    const p = Math.min(1, this.photoT / 0.5);
    const fx0 = 110, fy0 = 110, fx1 = W - 110, fy1 = H - 150;
    g.save(); g.fillStyle = `rgba(36,22,63,${0.5 * p})`;
    g.beginPath(); g.rect(0, 0, W, H); g.rect(fx0, fy0, fx1 - fx0, fy1 - fy0); g.fill('evenodd');
    g.restore();
    // polaroid border with everyone's design along the bottom strip
    g.save(); g.globalAlpha = p;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.rect(fx0 - 40, fy0 - 40, fx1 - fx0 + 80, fy1 - fy0 + 170); g.rect(fx0, fy0, fx1 - fx0, fy1 - fy0); g.fill('evenodd');
    g.lineWidth = 6; g.strokeStyle = NAVY; g.strokeRect(fx0 - 40, fy0 - 40, fx1 - fx0 + 80, fy1 - fy0 + 170); g.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    const n = this.n, sw = Math.min(260, (fx1 - fx0) / n);
    this.stations.forEach((st, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * sw, y = fy1 + 62;
      this.drawDesignBig(g, st, x, y + (st.type === 'necklace' ? 10 : 0), Math.min(200, sw * 0.86));
      g.beginPath(); g.arc(x - sw * 0.38, y - 40, 9, 0, TAU); g.fillStyle = st.p.color; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    });
    g.restore();
    const s = ease.outBack(Math.min(1, Math.max(0, (this.photoT - 0.2) / 0.5)));
    if (s > 0) {
      g.save(); g.translate(W / 2, 100); g.scale(s, s); g.rotate(-0.03);
      ui.panel(g, -400, -50, 800, 100, { r: 50, fill: '#ff7ac6' });
      ui.text(g, 'Sparkle Stars!', 0, 4, { size: 66, weight: 800 });
      for (const sx of [-1, 1]) { g.save(); g.translate(sx * 440, 0); g.rotate(this.t * 2 * sx); drawStarShape(g, 70, '#ffd23f'); g.restore(); }
      g.restore();
    }
  }
}

// "Say cheese!" lasts this long (seconds, ending with 3-2-1), then the photo
// shows big for PHOTO_PIN s, flies PHOTO_FLY s to its pin on the wall.
const CHEESE_TIME = 6, PHOTO_PIN = 2.4, PHOTO_FLY = 0.8;
const PIN = { x: 260, y: 230, w: 300, rot: -0.09 };

