// Dino Dig (Sister Party) - a big sandbox full of buried bones. A digs with a little
// spade where you stand: sand sprays, the hole gets deeper, and after a few digs a bone
// pops out with a fanfare, flies over and clacks into place on one giant, silly dinosaur
// skeleton on the platform at the back. Some digs find silly surprises instead: a rubber
// duck (its head, in some games), a teapot (its tail tip, in some games), a sock (on a
// foot), a toy crown and a teacup (a saddle on its back). Everyone builds the same dino;
// the pips on the platform show the bones found. When it's finished (or the clock runs
// out and everyone helps finish it) the dino comes to life: it wobbles, dances (mash A to
// make it dance more), then sneezes a giant "ACHOO!" that blows everyone's explorer hats
// off. Gallery ending: everyone poses with the dino and gets a star. No losers.
//
// Controls: A digs (hold A to keep digging); the stick walks (either stick); B dashes;
// X tosses a handful of sand in the air, just for fun. Sister Party Easy: A again and
// again with no steering walks you to the next mound (easyAutoOk).
//
// Art hooks (all optional; procedural stand-ins in dino-dig/art.js): bg/dino-dig,
//   thumb/dino-dig, prop/dino-<piece> (16 skeleton pieces on one template),
//   prop/dino-skull-sneeze, prop/dino-bones (4x2 atlas), prop/dino-mound, prop/dino-teacup,
//   prop/dino-explorer-hat; reused: prop/sand-spade, prop/sand-hole, prop/rubber-duck,
//   prop/fhs-teapot, prop/beach-sock, prop/treasure-crown.
// Poses: 'dig' (falls back to 'crouch' on the fairies), cheer, surprised, laugh, dance-*,
//   celebrate. No new poses needed.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, mashInterval } from '../engine/ai.js';
import { easySteer, easyPrompt, easyAutoOk } from '../engine/easy.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { clamp, approach, rand, randInt, pick, chance, TAU } from '../engine/util.js';
import { Dash } from '../engine/dash.js';
import { outfitAttach, outfitItem } from '../engine/outfits.js';
import {
  NAVY, SAND, ARENA, DINO, J, ORDER, SILLY_HOST, toScreen, pieceTarget, sillyTarget,
  drawSite, drawDino, drawPips, drawMound, drawHole, drawBone, drawSillyItem, drawHat, drawSpade, fitDinoHead,
} from './dino-dig/art.js';

import { meta } from './dino-dig.meta.js';
export { meta };

// --- tuning -----------------------------------------------------------------
const DURATION = 72;        // digging time; then everyone helps finish the dino
const SPEED = 520;
const DIGS_SMALL = 4, DIGS_BIG = 3;   // digs to get a bone out of a mound (1-2 players dig a little longer)
const REACH = 105;          // dig a mound this close (y counts 1.5x)
const DIG_GAP = 0.17;       // fastest digging (mashing)
const HOLD_GAP = 0.38;      // holding A digs this often
const POP_T = 0.55, FLY_T = 0.75;
const EXTRAS = ['sock', 'teacup', 'crown'];
const SILLY_TEXT = { duck: 'Quack!', teapot: 'A teapot!', sock: 'A sock!', crown: 'A crown!', teacup: 'A teacup!' };
const SILLY_SND = { duck: ['bp-quack', 'squeak'], teapot: ['fhs-pop', 'pop'], sock: ['td-sock', 'boing'], crown: ['golden-chime', 'sparkle'], teacup: ['bead-click', 'pop'] };
// Finale timeline (seconds after the dino is finished)
const F_WAKE = 1.6, F_DANCE = 6.4, F_AHH = 7.7, F_LAUGH = 10.2;

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const smooth = (u) => u * u * (3 - 2 * u);

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.easy = !!api.easy;
    const n = this.n = this.players.length;
    this.t = 0; this.el = 0; this.phase = 'dig'; this.rush = false; this.fT = 0;
    api.limit(() => (this.phase === 'dig' && !this.rush ? Math.max(0, DURATION - this.el) : null), { showAt: Infinity });
    this.base = n <= 2 ? 0.92 : n <= 4 ? 0.86 : n <= 6 ? 0.8 : 0.74;
    // the dino: a duck for a head and/or a teapot tail tip in some games (at least one)
    let duck = chance(0.5), teapot = chance(0.5);
    if (!duck && !teapot) (chance(0.5) ? (duck = true) : (teapot = true));
    this.headKind = duck ? 'duck' : 'skull'; this.tailKind = teapot ? 'teapot' : 'tail';
    const quota = n === 1 ? 1 : Math.round(n * 1.4);   // bones per piece: everyone's bones go into one dino
    this.slots = ORDER.map((id) => {
      const kind = id === 'head' && duck ? 'duck' : id === 'tail-3' && teapot ? 'teapot' : 'bone';
      return { id, kind, quota: kind === 'bone' ? quota : 1, have: 0, pend: 0, pop: 0 };
    });
    this.extras = Object.fromEntries(EXTRAS.map((id) => [id, { found: false, pend: false, show: 0 }]));
    this.sillyAt = 6;              // no surprise before this (seconds)
    this.mounds = []; this.holes = []; this.flights = []; this.hats = []; this.gusts = [];
    this.bounce = 0; this.energy = 0; this.danceT = 0; this.hop = 0; this.hopV = 0;
    this.found = 0; this.total = this.slots.reduce((s, sl) => s + sl.quota, 0);
    this.ents = this.players.map((p, i) => this.makeEnt(p, i));
    this.digs = n <= 2 ? DIGS_SMALL : DIGS_BIG;
    this.moundCount = clamp(n + 3, 5, 10);
    for (let i = 0; i < this.moundCount; i++) this.spawnMound(true);
  }

  makeEnt(p, i) {
    const n = this.n, rows = n > 4 ? 2 : 1, perRow = Math.ceil(n / rows);
    const r = Math.floor(i / perRow), c = i - r * perRow, inRow = r === rows - 1 ? n - r * perRow : perRow;
    const x = W / 2 + (c - (inRow - 1) / 2) * (n > 4 ? 300 : 330);
    const y = rows === 1 ? 800 : 720 + r * 170;
    // the explorer hat replaces any hat from the player's saved look for this game
    const outfit = (p.outfit || []).filter((o) => outfitItem(o.id)?.slot !== 'head');
    const a = new Actor(p, { scale: this.base, x, y, outfit });
    a.facing = x < W / 2 ? 1 : -1; a.snap();
    const e = {
      p, a, i, x, y, vx: 0, vy: 0, dash: new Dash({ color: '#f3d394' }),
      digT: 0, digCd: 0, scoop: 0, mound: null, hat: true, finds: 0, popN: 0, popT: 0,
      ai: { target: null, think: rand(0.2, 0.8), mashT: 0, wander: 0, wx: x, wy: y },
      ez: { go: false, goT: 0, target: null, think: 0 },
    };
    a.char.members.forEach((def, mi) => a.attach((g, info) => this.drawWorn(g, e, def, info, mi), { member: mi }));
    return e;
  }

  // ------------------------------------------------------------------ mounds
  spawnMound(initial = false) {
    for (let k = 0; k < 40; k++) {
      const x = rand(ARENA.x0 + 70, ARENA.x1 - 70), y = rand(ARENA.y0 + 20, ARENA.y1 - 30);
      const near = (o, r) => Math.hypot(o.x - x, (o.y - y) * 1.5) < r;
      if (this.mounds.some((m) => near(m, 250)) || this.holes.some((h) => near(h, 120))) continue;
      if (!initial && this.ents.some((e) => near(e, 120))) continue;
      const m = { x, y, digs: 0, dug: 0, sq: 0, s: 1, hint: chance(0.6) ? 'bone' : 'sparkle', bone: randInt(0, 7), ph: rand(TAU), born: initial ? 1 : 0 };
      this.mounds.push(m);
      return m;
    }
    return null;
  }
  moundNear(e, reach = REACH) {
    let best = null, bd = reach;
    for (const m of this.mounds) {
      if (m.born < 0.6) continue;
      const d = Math.hypot(m.x - e.x, (m.y - e.y) * 1.5);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { this.placeActor(e); e.a.moveAnim(0, 0, 1); e.a.update(dt); }
    this.tickMounds(dt);
  }

  update(dt) {
    this.t += dt;
    if (this.phase === 'dig') {
      this.el += dt;
      if (!this.rush && this.el >= DURATION) this.startRush();
    } else this.updateFinale(dt);
    for (const e of this.ents) {
      if (this.phase === 'dig') {
        if (e.p.isAI) this.aiThink(e, dt);
        this.movePlayer(e, dt);
        this.handleButtons(e, dt);
      } else this.finaleMove(e, dt);
    }
    spread(this.ents, { radius: (e) => bodyRadius(e.a) * 0.8, yScale: 1.6, strength: Math.min(1, dt * 12), bounds: ARENA });
    this.tickMounds(dt);
    this.tickFlights(dt);
    this.tickDino(dt);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }
  }

  postUpdate(dt) {
    // the gallery: everyone poses with the dino, who keeps grooving gently
    this.t += dt; this.fT += dt;
    this.tickDino(dt);
    this.tickHats(dt);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }
  }

  placeActor(e) {
    e.a.x = e.x; e.a.y = e.y;
    e.a.scale = this.base * depthScale(e.y, { top: 560, near: 1020 });
  }

  tickMounds(dt) {
    for (const m of this.mounds) { m.sq = Math.max(0, m.sq - dt * 4); m.born = Math.min(1, m.born + dt * 2.5); m.s = 0.4 + 0.6 * smooth(m.born); }
    for (const h of this.holes) h.t += dt;
    this.holes = this.holes.filter((h) => h.t < 5);
    if (this.phase === 'dig' && !this.rush) {
      this.spawnT = (this.spawnT || 0) - dt;
      if (this.mounds.length < this.moundCount && this.spawnT <= 0) { this.spawnT = 0.5; this.spawnMound(); }
    }
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const a = e.a, c = e.p.ctrl;
    e.popT = Math.max(0, e.popT - dt);
    e.digT = Math.max(0, e.digT - dt); e.digCd = Math.max(0, e.digCd - dt);
    e.scoop = Math.max(0, e.scoop - dt * 4.5);
    let ix = c.x, iy = c.y;
    if (this.easy && !e.p.isAI) [ix, iy] = this.easyPilot(e, dt);
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    const slow = e.digT > 0 ? 0.25 : 1;
    e.vx = approach(e.vx, ix * SPEED * slow, 4200 * dt); e.vy = approach(e.vy, iy * SPEED * 0.8 * slow, 4200 * dt);
    const dd = e.dash.update(dt, c, { x: e.x, y: e.y, actor: a, ok: !e.p.isAI && e.digT <= 0 });
    e.x = clamp(e.x + e.vx * dt + dd.x, ARENA.x0, ARENA.x1); e.y = clamp(e.y + e.vy * dt + dd.y, ARENA.y0, ARENA.y1);
    if (e.digT > 0) { if (!a._once && a.pose !== 'dig') a.setPose('dig'); }
    else a.moveAnim(e.vx, e.vy, SPEED, { run: Math.hypot(e.vx, e.vy) > 380 });
  }

  handleButtons(e, dt) {
    const c = e.p.ctrl;
    if (c.pressed('a')) this.dig(e, true);
    else if (c.held('a') && e.digCd <= 0 && (e.holdT = (e.holdT || 0) + dt) > HOLD_GAP) { e.holdT = 0; this.dig(e, false); }
    if (!c.held('a')) e.holdT = 0;
    if (!e.p.isAI && c.pressed('x')) this.tossSand(e);
  }

  /** A: dig where you stand (a mound in reach gets deeper; anywhere else is just a happy scoop). */
  dig(e, pressed) {
    if (e.digCd > 0) return;
    const m = this.moundNear(e);
    // Easy: A again and again with no mound here walks you to one (easyAutoOk)
    if (!m && pressed && this.easy && !e.p.isAI && !e.ez.go && easyAutoOk(e.ez)) { e.ez.go = true; e.ez.goT = 6; e.ez.target = null; e.ez.think = 0; }
    e.digCd = DIG_GAP; e.scoop = 1; e.holdT = 0;
    if (m) e.digT = 0.42;   // (a scoop in plain sand doesn't stop you walking)
    else if (!e.a._once) e.a.playOnce('dig', 0.22);
    const a = e.a;
    if (m) a.facing = m.x >= e.x ? 1 : -1;
    a.squash(0.12);
    const hand = a.anchor('hand'), gx = m ? m.x : hand.x + a.facing * 30, gy = m ? m.y - 10 : e.y - 4;
    // sand sprays back over your shoulder
    const back = a.facing > 0 ? Math.PI + 0.9 : -0.9;
    particles.burst(gx, gy, { type: 'drop', count: m ? 12 : 7, colors: SAND, speed: [260, 560], angle: back - Math.PI / 2 + (a.facing > 0 ? -0.4 : 0.4), spread: 0.55, size: [7, 13], gravity: 1300, life: [0.45, 0.7] });
    particles.burst(gx, gy, { type: 'dust', count: 3, color: '#f3d394', speed: [40, 120], size: [14, 24] });
    snd('td-dig', 'brush', { vol: m ? 0.55 : 0.35, rate: rand(0.9, 1.15) });
    if (!e.p.isAI) e.p.ctrl.rumble(0.15, 40);
    if (!m) return;
    m.digs++; m.sq = 1; m.dug = m.digs / this.digs;
    if (m.digs >= this.digs) this.unearth(e, m);
  }

  tossSand(e) {
    if ((e.tossT || 0) > this.t) return;
    e.tossT = this.t + 0.5;
    const a = e.a;
    a.playOnce('cheer', 0.4); a.squash(-0.15);
    particles.burst(e.x, e.y - a.height * 1.05, { type: 'drop', count: 16, colors: SAND, speed: [200, 480], angle: -Math.PI / 2, spread: 0.6, size: [6, 11], gravity: 1100, life: [0.6, 0.9] });
    particles.burst(e.x, e.y - a.height * 1.1, { type: 'sparkle', count: 4, colors: ['#fff6a8', '#ffffff'] });
    sfx('whoosh', { vol: 0.25, rate: 1.4 });
  }

  /** A mound is dug out: a bone (or a silly surprise) pops out of the hole. */
  unearth(e, m) {
    this.mounds = this.mounds.filter((o) => o !== m);
    this.holes.push({ x: m.x, y: m.y + 6, t: 0 });
    for (const o of this.ents) { if (o.ai.target === m) o.ai.target = null; if (o.ez.target === m) o.ez.target = null; }
    const find = this.allocate();
    const fl = { e, x: m.x, y: m.y - 20, sx: m.x, sy: m.y - 20, t: 0, rot: rand(-0.5, 0.5), ...find };
    this.flights.push(fl);
    e.finds++;
    const a = e.a;
    a.playOnce(find.silly ? 'surprised' : 'cheer', find.silly ? 0.55 : 0.5);
    particles.burst(m.x, m.y - 20, { type: 'drop', count: 18, colors: SAND, speed: [300, 620], angle: -Math.PI / 2, spread: 1.1, size: [7, 14], gravity: 1300, life: [0.5, 0.8] });
    particles.ring(m.x, m.y - 10, '#fff6a8', 140, 0.35);
    fx.shake(4, 0.12);
    if (!e.p.isAI) e.p.ctrl.rumble(0.45, 120);
    if (find.silly) {
      const [k, fb] = SILLY_SND[find.silly];
      snd(k, fb, { vol: 0.8 }); sfx('giggle', { vol: 0.4, rate: 1.2 });
      this.pop(e, SILLY_TEXT[find.silly], '#ff7ac6', 50);
      particles.burst(m.x, m.y - 50, { type: 'star', count: 10, colors: RAINBOW });
      voice(e.p.charId, 'laugh');   // rationed by the engine
      e.a.emote('happy', 1);
    } else {
      snd('golden-chime', 'collect', { vol: 0.55, rate: rand(0.95, 1.1) });
      particles.burst(m.x, m.y - 50, { type: 'sparkle', count: 8, colors: ['#ffffff', '#fff6a8', '#ffe1f5'] });
      this.pop(e, 'A bone!', '#ffffff', 44);
    }
  }

  /** What the next find is: the next piece in build order (a silly piece if it's the duck/teapot slot), or an extra surprise. */
  allocate() {
    // now and then (once its spot on the dino is built) a silly extra
    const ready = EXTRAS.filter((id) => { const x = this.extras[id]; const host = this.slot(SILLY_HOST[id]); return !x.found && !x.pend && host.have >= host.quota; });
    if (ready.length && this.el > this.sillyAt && (chance(0.35) || this.rush)) {
      const id = pick(ready); this.extras[id].pend = true; this.sillyAt = this.el + rand(5, 8);
      return { silly: id, target: id };
    }
    const sl = this.slots.find((s) => s.have + s.pend < s.quota);
    if (sl) { sl.pend++; return sl.kind === 'bone' ? { bone: randInt(0, 7), slot: sl } : { silly: sl.kind, slot: sl }; }
    // everything is on its way: a bonus bone that just sparkles in
    return { bone: randInt(0, 7), slot: null };
  }
  slot(id) { return this.slots.find((s) => s.id === id); }

  pop(e, str, color, size = 46) {
    e.popN = e.popT > 0 ? e.popN + 1 : 0; e.popT = 0.7;
    particles.popText(e.x + (e.popN % 2 ? 40 : -40), e.y - e.a.height - 50 - (e.popN % 3) * 42, str, color, size);
  }

  // ------------------------------------------------------------------ flights
  flightTarget(f) {
    if (f.slot) return pieceTarget(f.slot.id);
    if (f.target) return sillyTarget(f.target);
    return toScreen(585, 300);
  }
  tickFlights(dt) {
    for (const f of this.flights) {
      f.t += dt;
      if (f.t < POP_T) {   // up out of the hole, a little hover
        const u = f.t / POP_T;
        f.x = f.sx; f.y = f.sy - Math.sin(u * Math.PI * 0.5) * 120; f.rot += dt * 5;
      } else {
        const u = clamp((f.t - POP_T) / (f.fly || FLY_T), 0, 1), k = smooth(u);
        if (f.fx === undefined) { f.fx = f.x; f.fy = f.y; snd('gg-whoosh', 'whoosh', { vol: 0.25, rate: 1.3 }); }
        const tg = this.flightTarget(f);
        f.x = f.fx + (tg.x - f.fx) * k; f.y = f.fy + (tg.y - f.fy) * k - Math.sin(u * Math.PI) * 220;
        f.rot += dt * 9 * (1 - u);
        if (u >= 1) { f.dead = true; this.arrive(f); }
      }
    }
    this.flights = this.flights.filter((f) => !f.dead);
  }

  /** A find reaches the dino: clack! */
  arrive(f) {
    const tg = this.flightTarget(f);
    this.bounce = Math.max(this.bounce, 0.35);
    this.found++;
    if (f.slot) {
      const s = f.slot; s.pend--; s.have++; s.pop = 1;
      const done = s.have >= s.quota;
      snd('golf-clack', 'hit', { vol: done ? 0.9 : 0.6, rate: rand(0.95, 1.15) });
      particles.burst(tg.x, tg.y, { type: 'sparkle', count: done ? 14 : 6, colors: ['#ffffff', '#fff6a8', '#ffe1f5'], speed: [80, 260] });
      if (done) {
        sfx('star', { vol: 0.55 });
        particles.ring(tg.x, tg.y, '#ffffff', 160, 0.4);
        fx.shake(3, 0.1);
        if (s.kind !== 'bone') { sfx('giggle', { vol: 0.45 }); particles.burst(tg.x, tg.y, { type: 'star', count: 12, colors: RAINBOW }); }
      }
      if (this.slots.every((x) => x.have >= x.quota) && this.phase === 'dig') this.dinoDone();
    } else if (f.target) {
      const x = this.extras[f.target]; x.pend = false; x.found = true; x.show = 0.001;
      snd('golf-clack', 'hit', { vol: 0.7 }); sfx('giggle', { vol: 0.45, rate: 1.1 });
      particles.burst(tg.x, tg.y, { type: 'star', count: 12, colors: RAINBOW });
    } else {
      snd('golf-clack', 'hit', { vol: 0.5 });
      particles.burst(tg.x, tg.y, { type: 'sparkle', count: 8, colors: RAINBOW });
    }
  }

  // ------------------------------------------------------------------ the end of digging
  /** Time's up: everyone helps finish the dino (the rest of the bones fly in from everyone). */
  startRush() {
    this.rush = true;
    sfx('magic'); particles.popText(W / 2, 560, 'Everybody help!', '#ff7ac6', 64);
    let k = 0;
    const launch = (e, find) => {
      const a = e.a;
      this.flights.push({ e, x: e.x, y: e.y - a.height * 0.6, sx: e.x, sy: e.y - a.height * 0.6, t: POP_T * 0.6 - k * 0.07, fly: 0.85, rot: rand(TAU), ...find });
      k++;
    };
    for (const id of EXTRAS) { const x = this.extras[id]; if (!x.found && !x.pend) { x.pend = true; launch(this.ents[k % this.n], { silly: id, target: id }); } }
    for (const s of this.slots) {
      while (s.have + s.pend < s.quota) {
        if (k > 60) { s.have = s.quota - s.pend; break; }   // a huge party: the rest just appears
        s.pend++;
        launch(this.ents[k % this.n], s.kind === 'bone' ? { bone: randInt(0, 7), slot: s } : { silly: s.kind, slot: s });
      }
    }
    for (const e of this.ents) e.a.playOnce('cheer', 0.6);
    if (this.slots.every((x) => x.have >= x.quota)) this.dinoDone();
  }

  dinoDone() {
    this.phase = 'finale'; this.fT = 0; this.stage = 'wake';
    this.mounds.forEach((m) => this.holes.push({ x: m.x, y: m.y, t: 3, poof: true }));
    for (const m of this.mounds) particles.burst(m.x, m.y - 20, { type: 'dust', count: 4, color: '#f3d394' });
    this.mounds = [];
    snd('sc-done', 'fanfare', { vol: 0.8 }); sfx('magic');
    fx.flash('#fff6d0', 0.25);
    this.api.camera && this.api.camera.punch(DINO.x, DINO.y - 180, 1.12, 0.8);
    // everyone gathers in front of the dino to watch
    const n = this.n, rows = n > 5 ? 2 : 1, perRow = Math.ceil(n / rows);
    this.ents.forEach((e, i) => {
      const r = Math.floor(i / perRow), c = i - r * perRow, inRow = r === rows - 1 ? n - r * perRow : perRow;
      e.spot = { x: DINO.x + (c - (inRow - 1) / 2) * Math.min(250, 1300 / Math.max(1, inRow)), y: rows === 1 ? 700 : 660 + r * 150 };
      e.digT = 0; e.vx = 0; e.vy = 0; e.dash.cancel();
      e.a.playOnce('cheer', 0.6);
    });
  }

  updateFinale(dt) {
    this.fT += dt;
    const t = this.fT;
    if (this.stage === 'wake' && t >= F_WAKE) {
      this.stage = 'dance';
      snd('roar', null, { vol: 0.45, rate: 1.5 }); sfx('fanfare', { vol: 0.5 });
      particles.burst(toScreen(980, 70).x, toScreen(980, 70).y, { type: 'heart', count: 8 });
    } else if (this.stage === 'dance' && t >= F_DANCE) {
      this.stage = 'ahh'; this.ahhN = 0;
    } else if (this.stage === 'ahh') {
      const n = Math.floor((t - F_DANCE) / 0.55);
      if (n > this.ahhN && n <= 2) { this.ahhN = n; const h = this.headScreen(); particles.popText(h.x + 40, h.y - 60 - n * 30, n === 1 ? 'Ah...' : 'Ah... ah...', '#ffffff', 46 + n * 8); sfx('whoosh', { vol: 0.2 + n * 0.1, rate: 0.7 + n * 0.15 }); }
      if (t >= F_AHH) this.sneeze();
    } else if (this.stage === 'laugh' && t >= F_LAUGH) {
      this.stage = 'done';
      this.ents.forEach((e) => { e.a.clearEmotes(); e.a.setPose('celebrate'); });
      this.api.finishTogether({ title: 'Dino-mite!', stats: this.ents.map((e) => `${e.finds} find${e.finds === 1 ? '' : 's'}`), focus: { x: DINO.x, y: DINO.y - 160 } });
    }
    // mash A while it dances: it dances more
    if (this.stage === 'dance' || this.stage === 'wake') {
      for (const e of this.ents) {
        const c = e.p.ctrl;
        if (e.p.isAI ? chance(dt * 1.6) : c.pressed('a')) {
          this.energy = Math.min(2.2, this.energy + (e.p.isAI ? 0.15 : 0.3));
          if (this.stage === 'dance' && this.hop <= 0 && this.energy > 0.9 && chance(0.4)) { this.hopV = 300 + this.energy * 90; snd('boing', 'bounce', { vol: 0.35 }); }
          if (!e.p.isAI) {
            e.a.playOnce(pick(['dance-up', 'dance-side', 'dance-star', 'dance']), 0.45, 'dance');
            particles.burst(e.x, e.y - e.a.height - 20, { type: 'note', count: 1, colors: RAINBOW });
          }
        }
      }
    }
    this.tickHats(dt);
  }

  headScreen() { return toScreen(this.headKind === 'duck' ? 1000 : 1010, 90); }

  sneeze() {
    this.stage = 'laugh';
    const h = this.headScreen();
    snd('pt-achoo', 'gg-achoo', { vol: 1 }); snd('roar', null, { vol: 0.5, rate: 1.2 });
    fx.shake(18, 0.5); fx.flash('#fff8e0', 0.2);
    this.api.camera && this.api.camera.punch(W / 2, 700, 1.06, 0.5);
    particles.popText(h.x - 120, h.y + 70, 'ACHOO!', '#ff7ac6', 110);
    // a gust of sand blows out across the dig site
    for (let i = 0; i < 4; i++) particles.burst(h.x + 20, h.y + 30, { type: 'drop', count: 30, colors: SAND, speed: [700, 1400], angle: 2.15 + i * 0.16, spread: 0.3, size: [7, 14], gravity: 380, life: [0.8, 1.3] });
    particles.burst(h.x + 20, h.y + 30, { type: 'smoke', count: 18, color: '#f7e2b5', speed: [400, 900], angle: 2.4, spread: 0.5, size: [30, 60] });
    this.gusts.push({ t: 0 });
    // hats off!
    let laughs = 0;
    for (const e of this.ents) {
      const a = e.a;
      if (e.hat) {
        e.hat = false;
        // one hat per member; x/y on the sand, z = height above it (it leaves from the top of the head)
        a.members.forEach((m, mi) => {
          const top = mi === 0 ? a.anchor('head') : { x: m.x, y: m.y - m.def.h * a.scale * (m.def.top ?? 1) };
          const S = m.def.h * a.scale * 0.36, dir = top.x >= h.x - 200 ? 1 : -1;
          this.hats.push({ x: top.x, y: m.y, z: m.y - top.y, vx: dir * rand(250, 520) + (top.x - h.x) * 0.2, vy: rand(30, 110), vz: rand(650, 900), rot: 0, spin: dir * rand(6, 11), S, landed: false });
        });
      }
      a.playOnce('surprised', 0.6, 'laugh'); a.squash(0.4);
      e.x += (e.x >= h.x ? 1 : -1) * 30;
      if (laughs < 2 && chance(0.6)) { laughs++; setTimeout(() => voice(e.p.charId, 'laugh'), 500 + laughs * 300); }
    }
    sfx('crowd-ooh', { vol: 0.4 });
    setTimeout(() => sfx('giggle', { vol: 0.6 }), 700);
  }

  finaleMove(e, dt) {
    const a = e.a;
    if (e.spot && this.stage !== 'laugh' && this.stage !== 'done') {
      const dx = e.spot.x - e.x, dy = e.spot.y - e.y, d = Math.hypot(dx, dy);
      if (d > 8) {
        const k = Math.min(1, d / 60) * SPEED * 0.7;
        e.vx = (dx / d) * k; e.vy = (dy / d) * k;
        e.x += e.vx * dt; e.y += e.vy * dt;
        a.moveAnim(e.vx, e.vy, SPEED);
        return;
      }
      e.vx = 0; e.vy = 0;
      a.facing = DINO.x + 200 >= e.x ? 1 : -1;
      if (!a._once) a.setPose(this.stage === 'dance' ? (e.i % 2 ? 'dance' : 'clap') : 'idle');
    } else if (!a._once && this.stage === 'laugh') a.setPose('laugh');
  }

  tickHats(dt) {
    for (const h of this.hats) {
      if (h.landed) { h.rest = Math.min(1, (h.rest || 0) + dt * 3); continue; }
      h.vz -= 1500 * dt; h.z += h.vz * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.spin * dt;
      h.vx *= Math.exp(-0.8 * dt);
      // it plops onto the sand and settles (spinning in the plane only)
      if (h.z <= 0 && h.vz < 0) {
        h.z = 0;
        if (Math.abs(h.vz) > 260) { h.vz = -h.vz * 0.35; h.spin *= 0.5; sfx('pop', { vol: 0.15, rate: 1.6 }); }
        else { h.landed = true; h.vz = 0; h.vx = 0; h.vy = 0; h.rot = rand(-0.35, 0.35); }
      }
      h.x = clamp(h.x, 70, W - 70); h.y = clamp(h.y, ARENA.y0, H - 30);
    }
    for (const g of this.gusts) g.t += dt;
    this.gusts = this.gusts.filter((g) => g.t < 1.2);
  }

  // ------------------------------------------------------------------ the dino's motion
  tickDino(dt) {
    this.bounce = approach(this.bounce, 0, dt * 2.5);
    for (const s of this.slots) s.pop = Math.max(0, s.pop - dt * 3);
    for (const id of EXTRAS) { const x = this.extras[id]; if (x.show > 0 && x.show < 1) x.show = Math.min(1, x.show + dt * 2.5); }
    this.energy = Math.max(0, this.energy - dt * 0.35);
    // hops
    if (this.hopV || this.hop > 0) {
      this.hop += this.hopV * dt; this.hopV -= 2200 * dt;
      if (this.hop <= 0) { this.hop = 0; this.hopV = 0; fx.shake(5, 0.12); particles.burst(DINO.x, DINO.y, { type: 'dust', count: 8, color: '#e9c27a', speed: [80, 220] }); }
    }
  }

  dinoPose() {
    const t = this.t, b = this.bounce;
    const pose = { bob: Math.sin(t * 2) * 3 + b * 10, sway: 0, hop: this.hop, legs: [0, 0, 0, 0], neck: Math.sin(t * 1.3) * 0.03, head: Math.sin(t * 1.7) * 0.03, tail: Math.sin(t * 1.5) * 0.04, lean: 0 };
    if (this.phase !== 'finale') return pose;
    const ft = this.fT, st = this.stage;
    if (st === 'wake') {
      const w = Math.min(1, ft / F_WAKE);
      pose.sway = Math.sin(ft * 22) * 0.035 * w; pose.neck = Math.sin(ft * 9) * 0.07 * w; pose.tail = Math.sin(ft * 11) * 0.12 * w;
      pose.bob += Math.abs(Math.sin(ft * 18)) * 6 * w;
    } else if (st === 'dance' || st === 'done' || st === 'laugh') {
      const k = st === 'dance' ? 1 + this.energy * 0.7 : st === 'laugh' ? 0.6 : 0.45;
      const beat = t * (st === 'dance' ? 7 + this.energy * 1.5 : 5);
      pose.bob = Math.abs(Math.sin(beat)) * 18 * k + b * 10;
      pose.sway = Math.sin(beat * 0.5) * 0.06 * k;
      pose.legs = [Math.sin(beat) * 0.22 * k, -Math.sin(beat) * 0.22 * k, -Math.sin(beat) * 0.25 * k, Math.sin(beat) * 0.25 * k];
      pose.neck = Math.sin(beat * 0.5 + 1) * 0.16 * k; pose.head = Math.sin(beat + 0.5) * 0.12 * k;
      pose.tail = Math.sin(beat * 0.5) * 0.3 * k;
      if (st === 'laugh') { const u = clamp((ft - F_AHH) / 0.25, 0, 1); pose.neck += 0.18 * (1 - u) - 0.06; pose.head += Math.sin(ft * 30) * 0.05 * (1 - clamp(ft - F_AHH - 1.5, 0, 1)); }
    } else if (st === 'ahh') {
      const u = clamp((ft - F_DANCE) / (F_AHH - F_DANCE), 0, 1);
      pose.neck = -0.28 * smooth(u); pose.head = -0.22 * smooth(u); pose.lean = 0.05 * u;
      pose.bob = Math.sin(ft * 30) * 2 * u;
    }
    // A crowned duck is taller than the skull: keep its high hops inside the view.
    const top = this.api.camera?.toWorld(0, 12).y ?? 12;
    return fitDinoHead(pose, this.headKind, this.extras.crown.show > 0, top);
  }

  dinoFace() {
    if (this.phase !== 'finale') return 'calm';
    if (this.stage === 'ahh') return 'ahh';
    if (this.stage === 'laugh' && this.fT - F_AHH < 0.7) return 'sneeze';
    return this.stage === 'wake' && this.fT < 0.5 ? 'calm' : 'alive';
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, prof = aiProfile(p), ctrl = p.ctrl, A = e.ai;
    A.think -= dt;
    if (A.target && !this.mounds.includes(A.target)) A.target = null;
    if (A.think <= 0) {
      A.think = reactionTime(p) * 1.3;
      if (!A.target || chance(0.15)) {
        if (chance(prof.mistake * 0.3)) { A.target = null; A.wander = rand(0.6, 1.2); A.wx = rand(ARENA.x0, ARENA.x1); A.wy = rand(ARENA.y0, ARENA.y1); }
        else {
          let best = null, bs = Infinity;
          for (const m of this.mounds) {
            if (m.born < 0.6) continue;
            let sc = Math.hypot(m.x - e.x, (m.y - e.y) * 1.3);
            for (const o of this.ents) if (o !== e && (o.ai.target === m || o.ez.target === m || (!o.p.isAI && Math.hypot(o.x - m.x, o.y - m.y) < REACH * 1.2))) sc += 600;
            if (sc < bs) { bs = sc; best = m; }
          }
          A.target = best;
        }
      }
    }
    let tx = null, ty = null;
    if (A.wander > 0) { A.wander -= dt; tx = A.wx; ty = A.wy; }
    else if (A.target) { const side = A.target.x > e.x ? -1 : 1; tx = A.target.x + side * 70; ty = A.target.y + 10; }
    const near = A.target && this.moundNear(e) === A.target;
    ctrl.hold('a', false);
    if (near) {
      ctrl.move(0, 0);
      A.mashT -= dt;
      // CPUs dig a bit slower than a mashing child, so the kids find most of the bones
      if (A.mashT <= 0) { A.mashT = mashInterval(p) * 2.6 + rand(0, 0.15); ctrl.press('a'); }
      return;
    }
    if (tx === null) { ctrl.move(0, 0); return; }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 12) { ctrl.move(0, 0); return; }
    const k = clamp(d / 70, 0, 1) * Math.min(0.85, prof.speed);
    ctrl.move((dx / d) * k, (dy / d) * k);
  }

  /** Sister Party Easy: the stick walks her if she likes; A again and again (no steering) walks her to a mound. */
  easyPilot(e, dt) {
    const z = e.ez, c = e.p.ctrl;
    const st = easySteer(z, c, dt);
    if (st.pushing) z.go = false;
    if (z.go && (z.goT -= dt) <= 0) z.go = false;
    if (z.target && !this.mounds.includes(z.target)) z.target = null;
    if (!z.go) { z.target = null; return st.manual ? [st.x, st.y] : [0, 0]; }
    z.think -= dt;
    if (!z.target || z.think <= 0) {
      z.think = 1;
      let best = null, bs = Infinity;
      for (const m of this.mounds) {
        if (m.born < 0.6) continue;
        let sc = Math.hypot(m.x - e.x, (m.y - e.y) * 1.3) - (m === z.target ? 120 : 0);
        for (const o of this.ents) if (o !== e && (o.ai.target === m || o.ez.target === m)) sc += 500;
        if (sc < bs) { bs = sc; best = m; }
      }
      z.target = best;
    }
    if (!z.target) return [0, 0];
    if (this.moundNear(e, REACH * 0.8) === z.target) { z.go = false; return [0, 0]; }   // there: dig!
    const side = z.target.x > e.x ? -1 : 1;
    const dx = z.target.x + side * 66 - e.x, dy = z.target.y + 8 - e.y, d = Math.hypot(dx, dy);
    if (d < 10) { z.go = false; return [0, 0]; }
    const k = clamp(d / 80, 0, 1) * 0.8;
    return [(dx / d) * k, (dy / d) * k];
  }

  // -------------------------------------------------------------------- draw
  drawWorn(g, e, def, info, mi) {
    if (e.hat) {
      const at = outfitAttach(def, info, 'head');
      g.save(); g.translate(at.x, at.y); if (at.rot) g.rotate(at.rot); drawHat(g, at.scale); g.restore();
    }
    if (mi === 0 && this.phase === 'dig') {
      const at = outfitAttach(def, info, 'hand');
      // the scoop: down into the sand, then a flick back over the shoulder
      const s = e.scoop, ang = s > 0.6 ? (1 - s) / 0.4 * 0.5 : s > 0 ? 0.5 - (0.6 - s) / 0.6 * 1.6 : -0.15;
      g.save(); g.translate(at.x, at.y); drawSpade(g, info.h * 0.5, ang); g.restore();
    }
  }

  draw(g) {
    drawSite(g, this.t);
    // the dino
    const built = {}, pop = {};
    for (const s of this.slots) { built[s.id] = s.quota ? s.have / s.quota : 0; pop[s.id] = s.pop; }
    const extras = {};
    for (const id of EXTRAS) extras[id] = this.extras[id].show;
    drawDino(g, { built, pop, head: this.headKind, tail: this.tailKind, extras, face: this.dinoFace(), t: this.t, ghost: this.phase === 'dig', pose: this.dinoPose() });
    drawPips(g, this.slots, this.t);
    // holes, mounds and players, back to front
    for (const h of this.holes) drawHole(g, h.x, h.y, 170, 1, clamp(h.poof ? (5 - h.t) / 2 : (5 - h.t) / 1.5, 0, 1));
    const items = [];
    for (const m of this.mounds) items.push({ y: m.y, m });
    for (const e of this.ents) items.push({ y: e.y, e });
    for (const h of this.hats) if (h.landed) items.push({ y: h.y, h });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.m) drawMound(g, it.m, this.t);
      else if (it.h) this.drawLooseHat(g, it.h);
      else it.e.a.draw(g, { ring: it.e.p.color });
    }
    // flying hats
    for (const h of this.hats) if (!h.landed) this.drawLooseHat(g, h);
    // finds popping out and flying to the dino
    for (const f of this.flights) {
      if (f.t < 0) continue;
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot);
      const size = f.t < POP_T ? 60 + 40 * Math.min(1, f.t / 0.2) : 100;
      if (f.silly) drawSillyItem(g, f.silly, size * 1.3); else drawBone(g, f.bone, size);
      g.restore();
      if (f.t < POP_T && Math.random() < 0.3) particles.burst(f.x, f.y, { type: 'sparkle', count: 1, colors: ['#fff6a8', '#ffffff'] });
    }
    // tags and the Easy A cue
    if (!this.api.ended?.()) for (const e of this.ents) {
      const top = e.y - e.a.height - 30 - (e.a.emotes.length ? 48 : 0);
      ui.playerTag(g, e.p, e.x, top);
      if (this.easy && !e.p.isAI && this.phase === 'dig') {
        const m = this.moundNear(e);
        if (m) easyPrompt(g, e.p, { target: { x: m.x, y: m.y - 60 }, child: { x: e.x, y: e.y - e.a.height } });
      }
    }
  }

  drawLooseHat(g, h) {
    g.save(); g.translate(h.x, h.y - h.z);
    g.rotate(h.rot);
    drawHat(g, h.S);
    g.restore();
  }

  drawHUD(g) {
    if (this.api.ended?.()) return;
    if (this.phase === 'dig') ui.scoreboard(g, this.players, this.ents.map((e) => e.finds), { y: 14, avoidCenter: true, format: (v) => '🦴 ' + v });
    if (this.phase === 'dig' && this.el < 6 && this.players.some((p) => !p.isAI)) {
      g.save(); g.globalAlpha = clamp(6 - this.el, 0, 1);
      ui.text(g, this.easy ? 'Press A to dig up the dino bones!' : 'Walk to a sandy mound and press A to dig!', W / 2, H - 60, { size: 40, color: '#ffffff', weight: 800, stroke: NAVY });
      g.restore();
    }
    if (this.phase === 'finale') {
      if (this.stage === 'wake' || (this.stage === 'dance' && this.fT < F_WAKE + 1.4)) {
        g.save(); g.globalAlpha = clamp(Math.min(this.fT * 3, F_WAKE + 1.4 - this.fT), 0, 1);
        ui.banner(g, "It's alive!", this.fT, { y: 560, size: 120, color: '#5ddc6a' });
        g.restore();
      }
      if (this.stage === 'dance' && this.players.some((p) => !p.isAI)) {
        const pulse = 1 + Math.sin(this.t * 10) * 0.06;
        g.save(); g.translate(W / 2, H - 70); g.scale(pulse, pulse);
        ui.text(g, 'Press A to make the dino dance!', 0, 0, { size: 44, color: '#ffffff', weight: 800, stroke: NAVY });
        g.restore();
      }
    }
  }
}
