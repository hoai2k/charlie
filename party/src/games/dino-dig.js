// Dino Dig (Sister Party) - one big sandbox where you can dig anywhere. A digs with a little
// spade where you stand: sand sprays and the sand there turns dark, damp and dug-over (one
// growing patch, painted into a dig mask). After a few digs on a spot you find what was
// hidden there (nothing shows on the surface): a bone (it pops out with a fanfare, flies over
// and clacks into place on one giant, silly dinosaur skeleton on the platform at the back),
// nothing ("Nothing here!"), a critter (a snake or a scorpion pops up, surprised, and dashes
// off the screen: funny, harmless, no points lost) or a silly surprise: a rubber duck (its
// head, in some games), a teapot (its tail tip, in some games), a sock (on a foot), a toy
// crown and a teacup (a saddle on its back). Dug-out spots give little more, so everyone
// moves on and digs all over. Everyone builds the same dino; the pips on the platform show
// the bones found. When it's finished (or the clock runs out and everyone helps finish it)
// the dino comes to life: it wobbles, dances (mash A to make it dance more), then sneezes a
// giant "ACHOO!" that blows everyone's explorer hats off. In the finale and the gallery the
// kids walk about (stick) and jump (X; A too once the dancing is over and before the
// gallery). Gallery ending: everyone poses with the dino and gets a star. No losers.
//
// Hiding: the sandbox is a grid of spots (COLS x ROWS); each spot's first layer is filled at
// random (find / critter / nothing) and the pace nudges it as it's dug (behind schedule, an
// empty spot may hold a bone after all; far ahead, a bone may wait), so the dino gets built
// in about a minute. Deeper layers of a dug spot rarely hold anything.
//
// Controls: A digs (hold A to keep digging); the stick walks (either stick); B dashes;
// X tosses a handful of sand in the air, just for fun. Sister Party Easy: A again and
// again with no steering (easyAutoOk) and nothing left to dig in reach walks you to an
// undug spot nearby.
//
// Art hooks (all optional; procedural stand-ins in dino-dig/art.js): bg/dino-dig,
//   thumb/dino-dig, prop/dino-<piece> (16 skeleton pieces on one template),
//   prop/dino-skull-sneeze, prop/dino-bones (4x2 atlas), prop/dino-teacup,
//   prop/dino-explorer-hat, prop/dino-snake + prop/dino-scorpion (4x1 atlases),
//   prop/dino-dug-sand (tiling texture); reused: prop/sand-spade, prop/rubber-duck,
//   prop/fhs-teapot, prop/beach-sock, prop/treasure-crown. (prop/dino-mound is no longer used.)
// Poses: 'dig' (falls back to 'crouch' on the fairies), cheer, surprised, laugh, look-around,
//   dance-*, celebrate, jump. No new poses needed.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { depthScale } from '../engine/camera.js';
import { aiProfile, reactionTime, mashInterval } from '../engine/ai.js';
import { easySteer, easyPrompt, easyAutoOk } from '../engine/easy.js';
import { celebrateWalk } from '../engine/celebrate.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { clamp, approach, lerp, rand, randInt, pick, chance, TAU } from '../engine/util.js';
import { Dash } from '../engine/dash.js';
import { outfitAttach, outfitItem } from '../engine/outfits.js';
import {
  NAVY, SAND, ARENA, DINO, J, ORDER, SILLY_HOST, toScreen, pieceTarget, sillyTarget,
  drawSite, drawDino, drawPips, drawBone, drawSillyItem, drawHat, drawSpade, fitDinoHead,
  DugSand, DUG, drawCritter,
} from './dino-dig/art.js';

import { meta } from './dino-dig.meta.js';
export { meta };

// --- tuning -----------------------------------------------------------------
const DURATION = 72;        // digging time; then everyone helps finish the dino
const SPEED = 520;
const COLS = 16, ROWS = 7;   // the hidden spots under the sand (about 100 x 59 px each)
const DIGS = 3, DIGS_SOLO = 4;      // digs to dig a spot out (one player digs a little longer)
const REACH = 85;           // you dig the best spot this close to your spade (y counts 1.5x)
const LAYER_COST = 140;     // ...and a dug-out spot counts as this much farther (so a fresh one next to it wins)
const DIG_FWD = 56;         // the spade goes in this far in front of your feet (x actor scale)
const P_FIND = 0.5, P_CRITTER = 0.16;   // a fresh spot's odds (critters of the rest)
const PACE_T = 58;          // the pace aims to have the dino built by about this time
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
    // bones per piece: everyone's bones go into one dino (the sandbox has COLS x ROWS spots to share)
    const quota = n <= 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4;
    this.slots = ORDER.map((id) => {
      const kind = id === 'head' && duck ? 'duck' : id === 'tail-3' && teapot ? 'teapot' : 'bone';
      return { id, kind, quota: kind === 'bone' ? quota : 1, have: 0, pend: 0, pop: 0 };
    });
    this.extras = Object.fromEntries(EXTRAS.map((id) => [id, { found: false, pend: false, show: 0 }]));
    this.sillyAt = 6;              // no surprise before this (seconds)
    this.flights = []; this.hats = []; this.gusts = []; this.critters = [];
    this.critterAt = 5;            // no critter before this (seconds)
    this.bounce = 0; this.energy = 0; this.danceT = 0; this.hop = 0; this.hopV = 0;
    this.found = 0; this.total = this.slots.reduce((s, sl) => s + sl.quota, 0);
    this.ents = this.players.map((p, i) => this.makeEnt(p, i));
    this.digs = n <= 1 ? DIGS_SOLO : DIGS;
    this.dug = new DugSand();
    // the hidden spots: what's under each one is random, and nothing shows on the surface
    this.cw = (ARENA.x1 - ARENA.x0) / COLS; this.ch = (ARENA.y1 - ARENA.y0) / ROWS;
    this.cells = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      this.cells.push({
        c, r, x: ARENA.x0 + (c + 0.5) * this.cw + rand(-10, 10), y: ARENA.y0 + (r + 0.5) * this.ch + rand(-5, 5),
        layer: 0, digs: 0, item: chance(P_FIND) ? 'find' : chance(P_CRITTER / (1 - P_FIND)) ? 'critter' : null,
      });
    }
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
      digT: 0, digCd: 0, scoop: 0, hat: true, finds: 0, popN: 0, popT: 0, free: false,
      ai: { target: null, tLayer: 0, think: rand(0.2, 0.8), mashT: 0, wander: 0, wx: x, wy: y },
      ez: { go: false, goT: 0, target: null, think: 0 },
    };
    a.char.members.forEach((def, mi) => a.attach((g, info) => this.drawWorn(g, e, def, info, mi), { member: mi }));
    return e;
  }

  // ------------------------------------------------------------------ the hidden spots
  /** Where the spade goes in: just in front of the feet. */
  digPoint(e) { return { x: e.x + e.a.facing * DIG_FWD * e.a.scale, y: e.y + 4 }; }
  /** The spot you'd dig now: the least-dug one near the spade (a fresh spot beside a dug one wins). */
  digCell(e) {
    const p = this.digPoint(e);
    let best = null, bs = Infinity;
    for (const cell of this.cells) {
      const d = Math.hypot(cell.x - p.x, (cell.y - p.y) * 1.5);
      if (d > REACH) continue;
      const sc = d + cell.layer * LAYER_COST;
      if (sc < bs) { bs = sc; best = cell; }
    }
    return best;
  }
  /** Where to stand to dig `cell`, and which way to face. */
  standFor(cell, e) {
    let side = cell.x >= e.x ? 1 : -1;
    const off = DIG_FWD * e.a.scale;
    if (cell.x - side * off < ARENA.x0 || cell.x - side * off > ARENA.x1) side = -side;
    return { x: clamp(cell.x - side * off, ARENA.x0, ARENA.x1), y: clamp(cell.y - 4, ARENA.y0, ARENA.y1), side };
  }
  /** A spot to walk to: near, little dug, nobody else on it (bias: lean a little toward hidden finds). */
  pickCell(e, bias = false, keep = null) {
    let best = null, bs = Infinity;
    for (const cell of this.cells) {
      let sc = Math.hypot(cell.x - e.x, (cell.y - e.y) * 1.3) + cell.layer * 500 + rand(0, 40);
      if (cell === keep) sc -= 120;
      if (bias && cell.layer === 0 && cell.item === 'find') sc -= 70;
      for (const o of this.ents) {
        if (o === e) continue;
        if (o.ai.target === cell || o.ez.target === cell) sc += 400;
        else if (Math.hypot(o.x - cell.x, (o.y - cell.y) * 1.5) < 100) sc += 200;
      }
      if (sc < bs) { bs = sc; best = cell; }
    }
    return best;
  }
  /** How far the dino is behind the pace (> 0: behind, < 0: ahead), as a fraction of all the bones. */
  behind() {
    let got = 0;
    for (const s of this.slots) got += Math.min(s.quota, s.have + s.pend);
    return clamp((this.el - 2) / PACE_T, 0, 1) - got / this.total;
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { this.placeActor(e); e.a.moveAnim(0, 0, 1); e.a.update(dt); }
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
    this.tickCritters(dt);
    this.tickFlights(dt);
    this.tickDino(dt);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }
  }

  postUpdate(dt) {
    // the gallery: everyone poses with the dino, who keeps grooving gently
    this.t += dt; this.fT += dt;
    this.tickDino(dt);
    this.tickHats(dt);
    this.tickCritters(dt);
    // the kids can still walk about and jump (X: A goes on here)
    for (const e of this.ents) if (!e.p.isAI) this.freeWalk(e, dt, ['x']);
    for (const e of this.ents) { this.placeActor(e); e.a.update(dt); }
  }

  placeActor(e) {
    e.a.x = e.x; e.a.y = e.y;
    e.a.scale = this.base * depthScale(e.y, { top: 560, near: 1020 });
  }

  // ------------------------------------------------------------------ critters
  /** A critter pops out of a spot: surprised, then off it dashes, away from the digger and off the screen. */
  spawnCritter(e, cell) {
    const kind = chance(0.5) ? 'snake' : 'scorpion';
    const dir = cell.x >= e.x ? 1 : -1;
    const seen = new Set([e]);
    this.critters.push({ kind, x: cell.x, y: cell.y + 6, dir, state: 'pop', t: 0, rise: 0, lift: 0, vy: rand(-40, 40), seen });
    const a = e.a;
    a.facing = dir; a.playOnce('surprised', 0.8, 'laugh'); a.squash(0.35);
    snd('gg-peek', 'pop', { vol: 0.7, rate: 1.1 }); snd('mm-gasp', 'boing', { vol: 0.4 });
    setTimeout(() => sfx('giggle', { vol: 0.5, rate: 1.15 }), 450);
    particles.burst(cell.x, cell.y - 10, { type: 'drop', count: 16, colors: DUG, speed: [260, 520], angle: -Math.PI / 2, spread: 1, size: [6, 12], gravity: 1300, life: [0.45, 0.7] });
    particles.popText(cell.x + dir * 30, cell.y - 150, '!', '#ff7ac6', 70);
    this.pop(e, kind === 'snake' ? 'A wiggly snake!' : 'A scorpion!', '#ffd23f', 42);
    if (!e.p.isAI) e.p.ctrl.rumble(0.35, 100);
    // anyone close by jumps too
    for (const o of this.ents) if (o !== e && Math.hypot(o.x - cell.x, o.y - cell.y) < 160) { seen.add(o); o.a.playOnce('surprised', 0.6); o.a.squash(0.3); }
  }
  tickCritters(dt) {
    for (const c of this.critters) {
      c.t += dt;
      if (c.state === 'pop') {
        c.rise = Math.min(1, c.t / 0.22);
        // a surprised little jump, then a wobble in place
        const j = c.t - 0.22;
        c.lift = j > 0 && j < 0.4 ? Math.sin(j / 0.4 * Math.PI) * 42 : 0;
        if (c.t > 0.95) {
          c.state = 'run'; c.t = 0;
          snd(c.kind === 'snake' ? 'ds-slide' : 'aq-wiggle', 'whoosh', { vol: 0.35, rate: 1.3 });
        }
      } else {
        const v = Math.min(1, c.t / 0.3) * (c.kind === 'snake' ? 760 : 820);
        c.x += c.dir * v * dt;
        c.y = clamp(c.y + c.vy * dt, ARENA.y0 - 10, ARENA.y1 + 20);
        c.lift = c.kind === 'scorpion' ? Math.abs(Math.sin(c.t * 22)) * 4 : 0;
        if (Math.random() < dt * 14) particles.burst(c.x - c.dir * 40, c.y - 4, { type: 'dust', count: 1, color: '#f3d394', speed: [20, 80], size: [10, 18] });
        // anyone it scoots past hops out of the way (once each)
        for (const o of this.ents) {
          if (c.seen.has(o) || Math.abs(o.x - c.x) > 70 || Math.abs(o.y - c.y) > 60) continue;
          c.seen.add(o); o.a.playOnce('surprised', 0.5); o.a.squash(0.35);
          if (!o.p.isAI) sfx('giggle', { vol: 0.35, rate: 1.25 });
        }
        if (c.x < -200 || c.x > W + 200) c.dead = true;
      }
    }
    this.critters = this.critters.filter((c) => !c.dead);
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

  /** A: dig where you stand (the spot under your spade gets dug a little deeper; a few digs and it's dug out). */
  dig(e, pressed) {
    if (e.digCd > 0) return;
    const human = !e.p.isAI, z = e.ez;
    let cell = this.digCell(e);
    // Easy: A again and again with nothing fresh to dig here walks you to an undug spot (easyAutoOk)
    if (pressed && this.easy && human) {
      const autoOk = easyAutoOk(z);
      if (!z.go && (!cell || cell.layer > 0) && autoOk) { z.go = true; z.goT = 6; z.target = null; z.think = 0; }
    }
    if (this.easy && human && z.go) cell = null;   // (on the way: just a happy scoop)
    e.digCd = DIG_GAP; e.scoop = 1; e.holdT = 0;
    const a = e.a;
    if (cell) { e.digT = 0.42; if (Math.abs(cell.x - e.x) > 12) a.facing = cell.x >= e.x ? 1 : -1; }
    else if (!a._once) a.playOnce('dig', 0.22);   // (a scoop in passing doesn't stop you walking)
    a.squash(0.12);
    const p = this.digPoint(e);
    const gx = cell ? lerp(p.x, cell.x, 0.6) + rand(-12, 12) : p.x, gy = cell ? lerp(p.y, cell.y, 0.6) + rand(-6, 6) : p.y;
    const deep = cell && cell.layer > 0;
    // sand sprays back over your shoulder
    const back = a.facing > 0 ? Math.PI + 0.9 : -0.9;
    particles.burst(gx, gy - 6, { type: 'drop', count: cell ? 12 : 7, colors: deep ? DUG : cell && cell.digs ? [...SAND.slice(0, 2), ...DUG.slice(0, 2)] : SAND, speed: [260, 560], angle: back - Math.PI / 2 + (a.facing > 0 ? -0.4 : 0.4), spread: 0.55, size: [7, 13], gravity: 1300, life: [0.45, 0.7] });
    particles.burst(gx, gy - 6, { type: 'dust', count: 3, color: deep ? '#d6a865' : '#f3d394', speed: [40, 120], size: [14, 24] });
    snd('td-dig', 'brush', { vol: cell ? 0.55 : 0.35, rate: rand(0.9, 1.15) });
    if (human) e.p.ctrl.rumble(0.15, 40);
    if (!cell) return;
    cell.digs++;
    // the dug-over patch grows where you dig
    // (big soft blobs, so neighbouring spots run together into one patch)
    this.dug.paint(gx, gy, 50 + cell.digs * 10 + Math.min(2, cell.layer) * 6, { alpha: 0.5 });
    if (cell.digs >= this.digs) this.unearth(e, cell);
  }

  /** A spot is dug out: what was hidden there (the pace nudges it a little). */
  unearth(e, cell) {
    const fresh = cell.layer === 0, behind = this.behind();
    let item = fresh ? cell.item : null;
    if (fresh && item === null && chance(clamp(behind * 2.2, 0, 0.75))) item = 'find';     // behind: a bone after all
    else if (fresh && item === 'find' && behind < -0.12 && chance(0.5)) item = null;          // well ahead: it can wait
    else if (!fresh) item = chance(clamp(0.12 + behind * 1.6, 0.06, 0.6)) ? 'find' : null;   // a dug-out spot rarely has more
    if (item === 'critter' && (this.el < this.critterAt || this.critters.length >= 2)) item = behind > 0 ? 'find' : null;
    if (this.rush || this.phase !== 'dig') item = item === 'critter' ? null : item;
    cell.layer++; cell.digs = 0; cell.item = null;
    this.dug.paint(cell.x + rand(-14, 14), cell.y + rand(-5, 5), rand(58, 70), { deep: true, alpha: fresh ? 0.45 : 0.3 });
    for (const o of this.ents) { if (o.ai.target === cell) o.ai.target = null; if (o.ez.target === cell) o.ez.target = null; }
    if (item === 'find') this.find(e, cell);
    else if (item === 'critter') { this.critterAt = this.el + rand(4, 7); this.spawnCritter(e, cell); }
    else this.nothing(e, cell, fresh);
  }

  /** Nothing here: a little puff, and on you go. */
  nothing(e, cell, fresh) {
    particles.burst(cell.x, cell.y - 16, { type: 'dust', count: fresh ? 6 : 3, color: '#ead2a2', speed: [50, 150], size: [16, 28] });
    sfx('pop', { vol: 0.2, rate: 0.6 });
    if (fresh || !e.p.isAI) this.pop(e, fresh ? 'Nothing here!' : 'All dug!', '#ffffff', fresh ? 36 : 30);
    if (!e.a._once) e.a.playOnce('look-around', 0.6);
  }

  /** A bone (or a silly surprise) pops out of the sand. */
  find(e, cell) {
    const m = cell;
    const find = this.allocate();
    const fl = { e, x: m.x, y: m.y - 20, sx: m.x, sy: m.y - 20, t: 0, rot: rand(-0.5, 0.5), ...find };
    this.flights.push(fl);
    e.finds++;
    const a = e.a;
    a.playOnce(find.silly ? 'surprised' : 'cheer', find.silly ? 0.55 : 0.5);
    particles.burst(m.x, m.y - 20, { type: 'drop', count: 18, colors: DUG, speed: [300, 620], angle: -Math.PI / 2, spread: 1.1, size: [7, 14], gravity: 1300, life: [0.5, 0.8] });
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
    if (!e.p.isAI) {
      // walk and jump about: X jumps (A makes the dino dance until it sneezes, then A jumps too)
      const c = e.p.ctrl, jump = this.stage === 'wake' || this.stage === 'dance' || this.stage === 'ahh' ? ['x'] : ['a', 'x'];
      if (!e.free && (Math.hypot(c.x, c.y) > 0.3 || c.pressed('b') || jump.some((b) => c.pressed(b)))) e.free = true;
      if (e.free) {
        const m = this.freeWalk(e, dt, jump);
        if (!m.moving && !m.air && !a._once && a.pose === 'idle') a.setPose(this.stage === 'dance' ? 'dance' : this.stage === 'laugh' ? 'laugh' : 'idle');
        return;
      }
    }
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
    if (A.target && A.target.layer > A.tLayer) A.target = null;   // dug out (by anyone): find another spot
    if (A.think <= 0) {
      A.think = reactionTime(p) * 1.3;
      if (!A.target || chance(0.1)) {
        if (chance(prof.mistake * 0.3)) { A.target = null; A.wander = rand(0.6, 1.2); A.wx = rand(ARENA.x0, ARENA.x1); A.wy = rand(ARENA.y0, ARENA.y1); }
        else { A.target = this.pickCell(e, false, A.target); A.tLayer = A.target ? A.target.layer : 0; }
      }
    }
    ctrl.hold('a', false);
    let tx = null, ty = null, side = 0;
    if (A.wander > 0) { A.wander -= dt; tx = A.wx; ty = A.wy; }
    else if (A.target) { const st = this.standFor(A.target, e); tx = st.x; ty = st.y; side = st.side; }
    if (tx === null) { ctrl.move(0, 0); return; }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (A.target && !(A.wander > 0) && d < 16) {
      ctrl.move(0, 0);
      e.a.facing = side;
      A.mashT -= dt;
      // CPUs dig a bit slower than a mashing child, so the kids find most of the bones
      if (A.mashT <= 0) { A.mashT = mashInterval(p) * 2.6 + rand(0, 0.15); ctrl.press('a'); }
      return;
    }
    if (d < 12) { ctrl.move(0, 0); return; }
    const k = clamp(d / 70, 0.25, 1) * Math.min(0.85, prof.speed);
    ctrl.move((dx / d) * k, (dy / d) * k);
  }

  /** Sister Party Easy: the stick walks her if she likes; A again and again (no steering) walks her to an undug spot nearby. */
  easyPilot(e, dt) {
    const z = e.ez, c = e.p.ctrl;
    const st = easySteer(z, c, dt);
    if (st.pushing) z.go = false;
    if (z.go && (z.goT -= dt) <= 0) z.go = false;
    if (z.target && z.target.layer > 0) z.target = null;
    if (!z.go) { z.target = null; return st.manual ? [st.x, st.y] : [0, 0]; }
    z.think -= dt;
    if (!z.target || z.think <= 0) { z.think = 1; z.target = this.pickCell(e, true, z.target); }
    if (!z.target) { z.go = false; return [0, 0]; }
    const at = this.standFor(z.target, e);
    const dx = at.x - e.x, dy = at.y - e.y, d = Math.hypot(dx, dy);
    if (d < 14) { z.go = false; e.a.facing = at.side; return [0, 0]; }   // there: dig!
    const k = clamp(d / 80, 0.3, 1) * 0.8;
    return [(dx / d) * k, (dy / d) * k];
  }

  // ---------------------------------------------------------------------- finale walking
  /** Celebrating on the move (humans): the stick walks, B dashes, `jump` buttons hop. */
  freeWalk(e, dt, jump) {
    const a = e.a;
    const m = celebrateWalk(a, e.p.ctrl, dt, ARENA, { pos: e, jump, dust: '#f3d394', scale: a.scale / this.base });
    e.vx = 0; e.vy = 0;
    if (m.landed) particles.burst(e.x, e.y - 4, { type: 'drop', count: 6, colors: SAND, speed: [120, 260], angle: -Math.PI / 2, spread: 1.2, size: [5, 9], gravity: 1200, life: [0.3, 0.5] });
    return m;
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
    // the dug-over sand, then critters and players, back to front
    this.dug.draw(g);
    const items = [];
    for (const c of this.critters) items.push({ y: c.y, c });
    for (const e of this.ents) items.push({ y: e.y, e });
    for (const h of this.hats) if (h.landed) items.push({ y: h.y, h });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.c) drawCritter(g, it.c, this.t);
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
      const top = e.y - e.a.z - e.a.height - 30 - (e.a.emotes.length ? 48 : 0);
      ui.playerTag(g, e.p, e.x, top);
      if (this.easy && !e.p.isAI && this.phase === 'dig' && !this.rush && !e.ez.go) {
        // beside the fresh spot under the spade; over her head when it's all dug here (A again walks her on)
        const cell = this.digCell(e), child = { x: e.x, y: e.y - e.a.height };
        if (cell && cell.layer === 0) easyPrompt(g, e.p, { target: { x: cell.x, y: cell.y - 50 }, child });
        else easyPrompt(g, e.p, { child });
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
      ui.text(g, this.easy ? 'Press A to dig up the dino bones!' : 'Dig anywhere! Press A to dig, then dig somewhere new.', W / 2, H - 60, { size: 40, color: '#ffffff', weight: 800, stroke: NAVY });
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
