// Sandcastle Beach (Play Studio). Everyone gets a patch of a sunny beach and
// builds a sandcastle: flip bucket molds (round towers, pointy towers, walls,
// domes; stack them up to three high), dig moats with the spade that slowly
// fill with sea water, and decorate with shells, starfish and flags. Friendly
// crabs scuttle by, stop to admire a castle and sometimes leave a shell as a
// present (tickle them with A!). When everyone is done (Done + A), or the gentle
// clock runs out, a gentle wave rolls up the beach: it fills every moat to
// the brim and leaves a present, and never knocks anything down. Then the sun
// sets and the camera tours each castle before a sunset group photo.
//
// Controls (the Play Studio pattern): stick moves your hand (right stick:
// tiny nudges), LB/RB pick a tool (the last one is Done), X (or the d-pad)
// changes the style (window/door towers, wall direction, shell kind, colours),
// A builds (on top of what's under your hand, so molds stack), A with the Move
// hand picks a piece up and A puts it down, A on Done: I'm ready (B: not yet).
// B removes what's under your hand (or fills a moat back in), Y asks
// "Smooth it all away?" (Go back is the default) before clearing your patch.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { drawHeartShape } from '../engine/emotes.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  NAVY, SAND, SAND_L, SAND_D, SAND_DD, DEFS,
  foot, silhouette, topHeight, canStack, drawPiece, drawPieceShadow, drawCrab, drawToolIcon, } from './sandcastle-beach/pieces.js';
import { drawBackdrop, drawSun, drawShore, drawWave, HORIZON, SHORE, WET } from './sandcastle-beach/beach.js';

import { askOpen, askUpdate, drawAsk, drawDoneTab } from '../engine/studio-ui.js';
import { meta } from './sandcastle-beach.meta.js';

export { meta };

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const TOOLS = [
  { id: 'hand', name: 'Move' }, { id: 'tower', name: 'Tower' }, { id: 'pointy', name: 'Pointy' },
  { id: 'wall', name: 'Wall' }, { id: 'dome', name: 'Dome' }, { id: 'moat', name: 'Moat' },
  { id: 'shell', name: 'Shell' }, { id: 'star', name: 'Starfish' }, { id: 'flag', name: 'Flag' },
  { id: 'done', name: 'Done' },   // the last "tool": A = I'm ready
];
const DONE = TOOLS.length - 1;
const TOOL = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));
const TOP = 352, BOTTOM = 1066, GAP = 14;
const GD_MIN = 250, GD_MAX = 370, HEAD = 170, MIN_GW = 520, MAX_GW = 940;
const CELL = 18;
const MAX_PIECES = 70, MAX_STACK = 300;
const BUILD_TIME = 170, CPU_TIME = 75;
const NAMES = ['Seashell Palace', 'Starfish Fort', 'Crabby Castle', 'Sunny Keep', 'Coral Towers', 'Sparkle Sands', 'Pearl Palace', 'Wavy Towers', 'Sandy Sky Fort', 'Mermaid Manor', 'Bucket Castle', 'Tide Pool Towers'];
const CHEERS = ['Ta-da!', 'Ooh!', 'Sandy!', 'Yay!', 'Pretty!'];

// --- layout --------------------------------------------------------------------------------
function plotRects(n) {
  const rows = n <= 4 ? 1 : 2, cols = rows === 1 ? n : 4;
  const h = (BOTTOM - TOP - GAP * (rows - 1)) / rows;
  if (n === 1) return [{ x: 260, y: TOP, w: W - 520, h }];
  const w = (W - 28 - GAP * (cols - 1)) / cols;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const inRow = Math.min(cols, n - row * cols);
    const ox = ((cols - inRow) * (w + GAP)) / 2;
    return { x: 14 + ox + col * (w + GAP), y: TOP + row * (h + GAP), w, h };
  });
}
const stripHeight = (n) => (n <= 4 ? 78 : 58);

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.humans = this.players.filter((p) => !p.isAI).length;
    this.t = 0;
    this.phase = 'build';
    this.timeLeft = this.humans ? BUILD_TIME : CPU_TIME;
    // Building runs until sunset: the play scene draws that clock the whole time (api.limit).
    // At sunset the play scene asks "Time's up!": Keep playing adds a minute, All done starts the finale.
    api.limit(() => (this.phase === 'build' ? Math.max(0, this.timeLeft) : null), {
      showAt: Infinity, x: W - 150, y: 54,
      timeUp: { more: () => { this.timeLeft += 60; }, done: () => this.startFinale() },
    });
    this.crabs = [];
    this.crabT = rand(3, 6);
    this.finale = null;
    this.finished = false;
    this.sunsetK = 0;
    this.waveY = SHORE;
    this.flash = 0;
    const rects = plotRects(this.n);
    const sh = stripHeight(this.n);
    this.k = Math.min(...rects.map((r) => Math.min(1.25, (r.h - sh - 8) / (GD_MIN + HEAD), (r.w - 24) / MIN_GW)));
    // plots get deeper when there's room (fewer, taller plots)
    this.GD = clamp(Math.min(...rects.map((r) => (r.h - sh - 12) / this.k - HEAD)), GD_MIN, GD_MAX);
    const names = shuffle(NAMES.slice());
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i], sh, names[i % names.length]));
    sfx('magic');
  }

  makeStation(p, i, r, sh, name) {
    const k = this.k;
    const GW = Math.min(MAX_GW, (r.w - 24) / k);
    const ox = r.x + r.w / 2;
    const GD = this.GD;
    const oy = r.y + r.h - sh - 10 - (GD / 2) * k;
    const st = {
      p, i, r, sh, k, ox, oy, GW, gx0: -GW / 2, gx1: GW / 2, gy0: -GD / 2, gy1: GD / 2, GD, dk: GD / GD_MIN, name,
      cur: { x: 0, y: 10 }, hold: 0, tool: TOOL.tower, toolPop: 0, stylePop: 0,
      styles: { hand: 0, tower: 0, pointy: 0, wall: 0, dome: 0, moat: 0, shell: 0, star: 0, flag: i % 4 },
      pieces: [], held: null, hover: null, hoverCrab: null, aim: null,
      moat: new Map(), digT: 0, digging: false, waterT: 0,
      ready: false, readyT: 0, clearAsk: null, wet: 0, gifts: 0, built: 0, cheerCD: 2, waveCD: 0,
      side: i % 2 ? 1 : -1, ai: null, aiStick: 0, jz: 0, jvz: 0, poseCD: 0,
    };
    const a = new Actor(p, { x: ox + st.side * 90 * k, y: oy + 20 * k, facing: -st.side });
    a.scale = k * 0.78;
    a.snap();
    st.actor = a;
    if (p.isAI) this.planAI(st);
    return st;
  }

  // --- coordinates --------------------------------------------------------------------------
  toScreen(st, x, y) { return { x: st.ox + x * st.k, y: st.oy + y * st.k }; }
  toLocal(st, sx, sy) { return { x: (sx - st.ox) / st.k, y: (sy - st.oy) / st.k }; }

  // --- pieces ------------------------------------------------------------------------------------
  pieceAt(st, x, y) {
    let best = null;
    for (const pc of st.pieces) {
      const [x0, x1, y0, y1] = silhouette({ ...pc, z: pc.z + (pc.dz || 0) });
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      if (!best || pc.sy > best.sy) best = pc;
    }
    return best;
  }
  stackOK(on, type) {
    if (!on || !canStack(on)) return false;
    return on.z + topHeight(on) + DEFS[type].vh <= MAX_STACK;
  }
  /** Where a piece of `type` would go from the hand: on top of the hovered piece, or on the sand. */
  aimFor(st, type, style) {
    const cur = st.cur, hv = st.hover;
    if (hv && this.stackOK(hv, type)) {
      const d = DEFS[hv.type], f = foot(hv);
      const hw = hv.type === 'wall' ? f.hw - 10 : d.topHW;
      const ry = hv.type === 'wall' ? Math.max(0, f.hd - 6) : 0;
      const z = hv.z + topHeight(hv);
      return { on: hv, x: clamp(cur.x, hv.x - hw, hv.x + hw), y: clamp(cur.y + z, hv.y - ry, hv.y + ry), z };
    }
    const f = foot({ type, style, x: 0, y: 0, z: 0 });
    return {
      on: null,
      x: clamp(cur.x, st.gx0 + f.hw + 4, st.gx1 - f.hw - 4),
      y: clamp(cur.y, st.gy0 + f.hd + 4, st.gy1 - f.hd - 4),
      z: 0,
    };
  }
  sortKey(pc) { return pc.on ? pc.on.sy + 0.02 + (pc.y - pc.on.y) * 0.0005 : pc.y; }

  build(st, type, style, aim, { quiet = false } = {}) {
    if (st.pieces.length >= MAX_PIECES) { sfx('error'); st.actor.say('Full!', 1, null); return null; }
    const pc = { type, style, x: aim.x, y: aim.y, z: aim.z, dz: 70, vz: 0, on: aim.on, seed: rand(100), bump: 0, owner: st.i };
    pc.sy = this.sortKey(pc);
    st.pieces.push(pc);
    st.built++;
    if (!aim.on && DEFS[type].kind === 'mold') this.fillUnder(st, pc);
    if (st.ai && st.ai.pending != null) { st.ai.pieceOf[st.ai.pending] = pc; st.ai.pending = null; }
    if (quiet) return pc;
    // the character does the work
    const a = st.actor;
    a.playOnce(type === 'flag' ? 'throw' : 'action', 0.32, 'idle'); a.squash(0.14);
    if (DEFS[type].kind === 'mold') snd('sc-mold-plop', 'stamp', { vol: this.n > 4 ? 0.55 : 0.8 });
    else if (type === 'flag') snd('sc-flag', 'flip', { vol: 0.7 });
    else snd('sc-shell', 'pop', { vol: 0.6 });
    return pc;
  }
  onLand(st, pc) {
    pc.bump = 0.32;
    const s = this.toScreen(st, pc.x, pc.y - pc.z);
    const mold = DEFS[pc.type].kind === 'mold';
    if (mold) {
      particles.burst(s.x, s.y, { type: 'dust', count: 7, colors: [SAND, SAND_L, SAND_D], speed: [60, 160] });
      sfx('land', { vol: 0.35 });
    } else particles.burst(s.x, s.y - 10 * st.k, { type: 'sparkle', count: 5, colors: ['#fff', '#fff6a8'] });
    const level = this.level(pc);
    if (level >= 2 && mold) {
      particles.popText(s.x, s.y - (DEFS[pc.type].vh + 20) * st.k, level >= 3 ? 'So tall!' : 'Taller!', st.p.color, 40);
      sfx('grow', { vol: 0.5 });
    }
    if (st.cheerCD <= 0 && (level >= 2 || st.built % 5 === 0)) {
      st.cheerCD = 5;
      st.actor.playOnce('cheer', 0.6, 'idle');
      if (!st.p.isAI || chance(0.3)) st.actor.say(level >= 3 ? 'So tall!' : pick(CHEERS), 1.1, st.p.isAI ? null : 'yay');
    }
  }
  level(pc) { let n = 1, p = pc; while (p.on) { n++; p = p.on; } return n; }

  /** Re-seat every piece on what's under it (after something was taken away). */
  relayer(st) {
    for (const pc of st.pieces) {
      if (pc.on && !st.pieces.includes(pc.on)) pc.on = pc.on.on && st.pieces.includes(pc.on.on) ? pc.on.on : null;
      const z = pc.on ? pc.on.z + topHeight(pc.on) : 0;
      if (Math.abs(z - pc.z) > 0.5) { pc.dz = (pc.dz || 0) + pc.z - z; pc.vz = 0; pc.z = z; }
      if (!pc.on && pc.type !== 'flag') {
        // a piece dropped to the sand stays inside the plot
        const f = foot(pc);
        pc.y = clamp(pc.y, st.gy0 + f.hd + 4, st.gy1 - f.hd - 4);
      }
      pc.sy = this.sortKey(pc);
    }
  }
  takeAway(st, pc, { silent = false } = {}) {
    for (const o of st.pieces) if (o.on === pc) o.on = pc.on;
    st.pieces = st.pieces.filter((o) => o !== pc);
    this.relayer(st);
    if (!silent) {
      const s = this.toScreen(st, pc.x, pc.y - pc.z - DEFS[pc.type].vh * 0.4);
      snd('sc-remove', 'crumble', { vol: 0.6 });
      particles.burst(s.x, s.y, { type: 'dust', count: 10, colors: [SAND, SAND_L, SAND_D], speed: [80, 220] });
      particles.burst(s.x, s.y, { type: 'sparkle', count: 4, colors: ['#fff'] });
      st.actor.playOnce('action', 0.3, 'idle');
    }
  }
  grab(st, pc) {
    this.takeAway(st, pc, { silent: true });
    pc.on = null; pc.held = true; pc.dz = 0;
    st.held = pc;
    sfx('pop', { vol: 0.5 });
    st.actor.playOnce('action', 0.3, 'idle'); st.actor.squash(0.1);
    const s = this.toScreen(st, pc.x, pc.y - pc.z - 20);
    particles.burst(s.x, s.y, { type: 'sparkle', count: 6, colors: ['#fff', st.p.color] });
  }
  drop(st) {
    const pc = st.held; if (!pc) return;
    st.held = null; pc.held = false;
    const aim = this.aimFor(st, pc.type, pc.style);
    pc.x = aim.x; pc.y = aim.y; pc.dz = (pc.z + 24) - aim.z; pc.z = aim.z; pc.on = aim.on; pc.vz = 0;
    pc.sy = this.sortKey(pc);
    st.pieces.push(pc);
    if (!aim.on && DEFS[pc.type].kind === 'mold') this.fillUnder(st, pc);
    sfx('whoosh', { vol: 0.5 });
  }

  // --- moat -------------------------------------------------------------------------------------------
  underMold(st, x, y) {
    for (const pc of st.pieces) {
      if (pc.on || DEFS[pc.type].kind !== 'mold') continue;
      const f = foot(pc);
      if (pc.type === 'wall') { if (Math.abs(x - pc.x) < f.hw + 6 && Math.abs(y - pc.y) < f.hd + 6) return true; }
      else if (((x - pc.x) / (f.hw + 6)) ** 2 + ((y - pc.y) / (f.hd + 6)) ** 2 < 1) return true;
    }
    return false;
  }
  dig(st, x, y) {
    let dug = 0;
    const ix0 = Math.round(x / CELL), iy0 = Math.round(y / CELL);
    for (let ix = ix0 - 1; ix <= ix0 + 1; ix++) for (let iy = iy0 - 1; iy <= iy0 + 1; iy++) {
      const cx = ix * CELL, cy = iy * CELL;
      if (Math.hypot(cx - x, (cy - y) * 1.3) > CELL * 1.2) continue;
      if (cx < st.gx0 + 12 || cx > st.gx1 - 12 || cy < st.gy0 + 10 || cy > st.gy1 - 8) continue;
      const key = ix + ',' + iy;
      if (st.moat.has(key) || this.underMold(st, cx, cy)) continue;
      st.moat.set(key, { x: cx, y: cy, age: 0, fill: 0, wob: rand(TAU) });
      dug++;
    }
    return dug;
  }
  fillMoat(st, x, y, r = 22) {
    let n = 0;
    for (const [key, c] of st.moat) if (Math.hypot(c.x - x, (c.y - y) * 1.3) < r) { st.moat.delete(key); n++; }
    return n;
  }
  fillUnder(st, pc) {
    const f = foot(pc);
    let n = 0;
    for (const [key, c] of st.moat) {
      const inside = pc.type === 'wall' ? Math.abs(c.x - pc.x) < f.hw + 8 && Math.abs(c.y - pc.y) < f.hd + 8
        : ((c.x - pc.x) / (f.hw + 8)) ** 2 + ((c.y - pc.y) / (f.hd + 8)) ** 2 < 1;
      if (inside) { st.moat.delete(key); n++; }
    }
    return n;
  }

  // --- tools ----------------------------------------------------------------------------------------
  stepTool(st, dir) {
    if (st.held) { sfx('blip'); return; }
    st.tool = (st.tool + dir + TOOLS.length) % TOOLS.length; st.toolPop = 0.25;
    if (!st.p.isAI) sfx('move');
  }
  stepStyle(st, dir = 1) {
    const id = st.held ? st.held.type : TOOLS[st.tool].id;
    const d = DEFS[id];
    if (!d || d.styles.length < 2) { if (!st.p.isAI) sfx('blip'); return; }
    if (st.held) {
      st.held.style = (st.held.style + dir + d.styles.length) % d.styles.length;
      st.held.bump = 0.3;
    }
    st.styles[id] = ((st.held ? st.held.style : st.styles[id] + dir) + d.styles.length) % d.styles.length;
    st.stylePop = 0.3;
    sfx('swap', { vol: 0.6 });
  }

  pressA(st) {
    const tool = TOOLS[st.tool].id;
    if (st.held) { this.drop(st); return; }
    if (tool === 'done') { this.setReady(st, true); return; }
    if (tool === 'moat') return;   // digging is a hold (see update)
    const hv = st.hover;
    if (st.hoverCrab && (!hv || tool === 'hand')) { this.tickle(st.hoverCrab, st); return; }
    if (tool === 'hand') {
      if (hv) this.grab(st, hv); else if (!st.p.isAI) sfx('blip');
      return;
    }
    const style = st.styles[tool];
    if (hv && !this.stackOK(hv, tool) && !st.p.isAI) { this.grab(st, hv); return; }
    const aim = this.aimFor(st, tool, style);
    if (aim.on && st.p.isAI && st.ai && !st.ai.wantStack) { aim.on = null; Object.assign(aim, this.aimFor({ ...st, hover: null }, tool, style)); }
    this.build(st, tool, style, aim);
  }
  pressB(st) {
    if (st.held) { const pc = st.held; st.held = null; this.takeAway(st, { ...pc, on: null }, { silent: false }); return; }
    if (st.hover) { this.takeAway(st, st.hover); return; }
    const n = this.fillMoat(st, st.cur.x, st.cur.y);
    if (n) {
      snd('sc-fill', 'snow-pack', { vol: 0.6 });
      const s = this.toScreen(st, st.cur.x, st.cur.y);
      particles.burst(s.x, s.y, { type: 'dust', count: 8, colors: [SAND, SAND_L], speed: [60, 160] });
      st.actor.playOnce('action', 0.3, 'idle');
    } else if (!st.p.isAI) sfx('blip');
  }

  /** "Smooth it all away?": Go back (the default) or Clear. */
  updateClearAsk(st) {
    const q = st.clearAsk, sel = q.sel, r = askUpdate(st.p.ctrl, q);
    if (q.sel !== sel) sfx('move');
    if (!r) return;
    st.clearAsk = null;
    if (r === 'yes') this.clearPatch(st); else sfx('back');
  }
  /** Y (after the question): smooth the whole patch flat again. */
  clearPatch(st) {
    const s = this.toScreen(st, this.castleCenter(st), 0);
    st.pieces = []; st.moat.clear(); st.held = null; st.hover = null; st.aim = null;
    snd('sc-fill', 'snow-pack', { vol: 0.7 }); sfx('whoosh');
    particles.burst(s.x, s.y, { type: 'dust', count: 22, colors: [SAND, SAND_L], speed: [80, 300] });
    st.actor.playOnce('surprised', 0.5, 'idle');
  }

  setReady(st, on) {
    if (st.ready === on) return;
    st.ready = on; st.readyT = 0; st.clearAsk = null;
    if (st.held) this.drop(st);
    const a = st.actor;
    if (on) {
      sfx('ready'); a.playOnce('celebrate', 1.0, 'idle'); a.squash(-0.2);
      a.say('Done!', 1.2, st.p.isAI ? null : 'ready');
      const s = this.toScreen(st, 0, -40);
      particles.burst(s.x, s.y, { type: 'confetti', count: 22, speed: [180, 420] });
    } else { sfx('back'); }
  }

  // --- crabs ---------------------------------------------------------------------------------------------
  spawnCrab(opts = {}) {
    const st = opts.st || pick(this.stations);
    const dir = opts.dir ?? (chance(0.5) ? 1 : -1);
    const k = this.k;
    const crab = {
      x: opts.x ?? (dir > 0 ? -50 : W + 50),
      y: opts.y ?? st.oy + rand(st.gy0 + 30, st.gy1 - 6) * k,
      dir, speed: rand(55, 80) * k, walk: rand(TAU), state: 'walk', stateT: 0,
      visited: new Set(), happy: 0, look: 0, swim: false, hop: 0, bornT: this.t,
    };
    this.crabs.push(crab);
    if (!opts.quiet) snd('sc-crab', 'td-crab', { vol: 0.35 });
    return crab;
  }
  stationAt(x, y) {
    for (const st of this.stations) {
      const l = this.toLocal(st, x, y);
      if (l.x >= st.gx0 - 10 && l.x <= st.gx1 + 10 && l.y >= st.gy0 - 10 && l.y <= st.gy1 + 10) return st;
    }
    return null;
  }
  tickle(crab, st) {
    crab.state = 'happy'; crab.stateT = 0; crab.happy = 1;
    snd('sc-crab-giggle', 'giggle', { vol: 0.6 });
    particles.burst(crab.x, crab.y - 30 * this.k, { type: 'bubble', count: 8, speed: [60, 160] });
    particles.burst(crab.x, crab.y - 40 * this.k, { type: 'heart', count: 3, speed: [60, 140] });
    if (st) { st.actor.playOnce('giggle', 0.9, 'idle'); }
  }
  updateCrabs(dt) {
    const k = this.k;
    for (const c of this.crabs) {
      c.stateT += dt;
      c.happy = Math.max(0, c.happy - dt * 0.6);
      if (c.state === 'walk') {
        c.x += c.dir * c.speed * dt;
        c.walk += dt * 9;
        // stop to admire a castle
        const st = this.stationAt(c.x, c.y);
        if (st && !c.visited.has(st.i) && st.pieces.length >= 3 && this.phase === 'build') {
          const cx = st.ox + this.castleCenter(st) * k;
          if (Math.abs(c.x - cx) < 30) { c.visited.add(st.i); c.state = 'look'; c.stateT = 0; c.st = st; }
        }
      } else if (c.state === 'look') {
        c.look = Math.sin(c.stateT * 3);
        if (c.stateT > 0.5 && !c.hearted) { c.hearted = true; particles.burst(c.x, c.y - 50 * k, { type: 'heart', count: 2, speed: [40, 90] }); sfx('tiny-squeak', { vol: 0.35 }); }
        if (c.stateT > 2.2) {
          const st = c.st;
          if (st && st.gifts < 2 && chance(0.5) && this.phase === 'build') this.crabGift(c, st);
          c.state = 'walk'; c.stateT = 0; c.hearted = false; c.look = 0;
        }
      } else if (c.state === 'happy') {
        if (c.stateT > 1.4) { c.state = 'walk'; c.stateT = 0; if (chance(0.4)) c.dir *= -1; }
      }
      // paddling through a moat
      const st = this.stationAt(c.x, c.y);
      c.swim = false;
      if (st) {
        const l = this.toLocal(st, c.x, c.y);
        const cell = st.moat.get(Math.round(l.x / CELL) + ',' + Math.round(l.y / CELL));
        if (cell && cell.fill > 0.5) { c.swim = true; if (chance(dt * 3)) particles.burst(c.x, c.y - 4, { type: 'bubble', count: 1, speed: [20, 50] }); }
      }
      // characters wave at crabs walking by
      for (const s2 of this.stations) {
        const a = s2.actor;
        if (s2.waveCD <= 0 && Math.abs(a.x - c.x) < 70 * k && Math.abs(a.y - c.y) < 40 * k && !s2.digging) {
          s2.waveCD = 8; a.playOnce('wave', 0.9, 'idle'); a.emote('heart', 1);
        }
      }
    }
    this.crabs = this.crabs.filter((c) => c.x > -90 && c.x < W + 90);
  }
  crabGift(c, st) {
    const l = this.toLocal(st, c.x, c.y);
    const type = chance(0.6) ? 'shell' : 'star';
    const aim = { on: null, x: clamp(l.x + c.dir * 24, st.gx0 + 24, st.gx1 - 24), y: clamp(l.y + 8, st.gy0 + 14, st.gy1 - 12), z: 0 };
    const pc = this.build(st, type, randInt(0, 2), aim, { quiet: true });
    if (!pc) return;
    st.gifts++;
    pc.dz = 20;
    st.actor.playOnce('surprised', 0.5, 'idle'); st.actor.emote('heart', 1.4);
    particles.popText(c.x, c.y - 70 * this.k, 'A present!', '#ff8fb8', 34);
    sfx('sparkle', { vol: 0.6 });
  }
  castleCenter(st) {
    let sx = 0, n = 0;
    for (const pc of st.pieces) if (!pc.on) { sx += pc.x; n++; }
    return n ? sx / n : 0;
  }

  // --- CPU builders ---------------------------------------------------------------------------------------------
  planAI(st) {
    const half = Math.min(st.GW / 2 - 56, 280);
    const steps = [];
    const add = (s) => { steps.push(s); return steps.length - 1; };
    const keepStyle = randInt(0, 2);
    const hd = st.GD / 2, backY = rand(-0.3, -0.12) * hd;
    const keep = add({ tool: 'tower', style: keepStyle, x: 0, y: backY - 10 });
    let top = keep;
    if (chance(0.6)) top = add({ tool: 'tower', style: 0, on: keep });
    if (chance(0.55)) add({ tool: 'pointy', style: 0, on: top }); else add({ tool: 'flag', style: randInt(0, 3), on: top });
    const wallX = Math.min(100, half - 100);
    const ends = half >= 190 ? Math.min(190, half) : 0;
    const order = chance(0.5) ? [-1, 1] : [1, -1];
    const flagStyle = randInt(0, 3), endKind = chance(0.6) ? 'tower' : 'pointy', starStyle = randInt(0, 2);
    const wallIdx = {};
    for (const s of order) wallIdx[s] = add({ tool: 'wall', style: 0, x: s * wallX, y: backY });
    if (ends) {
      for (const s of order) {
        const e = add({ tool: endKind, style: endKind === 'tower' ? randInt(0, 2) : 0, x: s * ends, y: backY + 6 });
        if (endKind === 'tower') add({ tool: 'flag', style: flagStyle, on: e });
      }
    }
    if (chance(0.6)) for (const s of order) add({ tool: 'star', style: starStyle, on: wallIdx[s], dx: s * 20 });
    if (chance(0.55)) { const dx = rand(90, Math.min(150, half - 50)); for (const s of order) add({ tool: 'dome', style: 0, x: s * dx, y: backY + rand(0.35, 0.5) * hd }); }
    // a moat across the front
    if (chance(0.8)) {
      const y = rand(0.62, 0.75) * hd, pts = [];
      for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([lerp(-half + 10, half - 10, u), y + Math.sin(u * Math.PI) * 0.12 * hd]); }
      if (chance(0.5)) pts.reverse();
      add({ tool: 'moat', path: pts });
    }
    const shellStyle = randInt(0, 2), ns = randInt(2, 4);
    for (let j = 0; j < ns; j++) add({ tool: 'shell', style: chance(0.7) ? shellStyle : randInt(0, 2), x: rand(-half + 30, half - 30), y: rand(0.3, 0.55) * hd });
    if (chance(0.4)) add({ tool: 'star', style: randInt(0, 2), x: rand(-half + 30, half - 30), y: rand(0.35, 0.55) * hd });
    st.ai = { steps, i: 0, t: rand(0.8, 1.6), pieceOf: [], pending: null, mode: 'next', wp: 0, wantStack: false };
  }

  updateAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai;
    if (st.aiStick > 0) { st.aiStick -= dt; if (st.aiStick <= 0) c.move(0, 0); }
    if (st.ready) { c.move(0, 0); return; }
    const prof = aiProfile(st.p), slow = this.humans ? 1.5 : 1;
    if (st.held && ai.mode !== 'carry') { c.press('a'); return; }
    if (ai.mode === 'dig') {
      const step = ai.steps[ai.i], pts = step.path, wp = pts[ai.wp];
      c.hold('a', ai.wp > 0);
      const d = steer(st.p, st.cur.x, st.cur.y, wp[0], wp[1], { arrive: 40, wobble: false });
      if (ai.wp === 0) c.hold('a', false);
      if (d < 14) {
        if (ai.wp === 0) { c.move(0, 0); c.hold('a', true); }
        ai.wp++;
        if (ai.wp >= pts.length) { c.hold('a', false); c.move(0, 0); ai.mode = 'next'; ai.i++; ai.t = rand(0.5, 1) * slow / prof.speed; }
      }
      return;
    }
    if (ai.mode === 'move') {
      const step = ai.steps[ai.i];
      const tgt = this.aiTarget(st, step);
      const d = steer(st.p, st.cur.x, st.cur.y, tgt.x, tgt.y, { arrive: 70 });
      if (d < 12) {
        c.move(0, 0);
        ai.pending = ai.i; ai.wantStack = !!tgt.on;
        c.press('a');
        ai.mode = 'next'; ai.i++;
        ai.t = rand(...prof.think) * slow * rand(0.9, 1.5);
      }
      return;
    }
    ai.t -= dt;
    if (ai.t > 0) return;
    ai.t = rand(0.2, 0.34) / prof.speed;
    const step = ai.steps[ai.i];
    if (!step) {   // all built: RB on to Done, then A
      if (st.tool !== DONE) { c.press('rb'); if (chance(0.3)) ai.t = rand(0.6, 1.2); return; }   // (a look at the castle on the way)
      c.press('a');
      return;
    }
    const want = TOOL[step.tool];
    if (st.tool !== want) {
      const fwd = (want - st.tool + TOOLS.length) % TOOLS.length;
      c.press(fwd <= TOOLS.length / 2 ? 'rb' : 'lb');
      return;
    }
    if (step.tool !== 'moat' && DEFS[step.tool].styles.length > 1 && st.styles[step.tool] !== step.style) { c.press('x'); return; }
    if (step.tool === 'moat') { ai.mode = 'dig'; ai.wp = 0; return; }
    if (step.on !== undefined && !(ai.pieceOf[step.on] && st.pieces.includes(ai.pieceOf[step.on]))) {
      // the piece to build on is gone: skip
      ai.i++; return;
    }
    ai.mode = 'move';
  }
  aiTarget(st, step) {
    if (step.on !== undefined) {
      const pc = ai_on(st, step);
      if (pc) {
        const top = topHeight(pc);
        return { on: pc, x: pc.x + (step.dx || 0), y: pc.y - pc.z - top * 0.82 + (pc.type === 'wall' ? 0 : 0) };
      }
    }
    return { on: null, x: step.x, y: step.y };
  }

  // =========================================================================================
  update(dt) {
    this.t += dt;
    if (this.phase === 'build') this.updateBuild(dt);
    else this.updateFinale(dt);
    this.updatePieces(dt);
    this.updateCrabs(dt);
    this.flash = Math.max(0, this.flash - dt);
  }
  postUpdate(dt) {
    this.t += dt;
    for (const st of this.stations) st.actor.update(dt);
    this.updatePieces(dt);
  }

  updatePieces(dt) {
    for (const st of this.stations) {
      for (const pc of st.pieces) {
        if (pc.dz > 0 || pc.vz) {
          pc.vz += 2200 * dt; pc.dz -= pc.vz * dt;
          if (pc.dz <= 0) { pc.dz = 0; const v = pc.vz; pc.vz = 0; if (v > 200) this.onLand(st, pc); }
        } else if (pc.dz < 0) pc.dz = Math.min(0, pc.dz + 400 * dt);
        if (pc.bump > 0) pc.bump = Math.max(0, pc.bump - dt);
      }
      // moat water seeps in
      let newWater = false;
      for (const c of st.moat.values()) {
        c.age += dt;
        const f = clamp((c.age - 0.5) / 1.2, 0, 1);
        if (f > 0 && c.fill === 0) newWater = true;
        c.fill = Math.max(c.fill, f);
      }
      st.waterT -= dt;
      if (newWater && st.waterT <= 0) { st.waterT = 0.9; snd('sc-water', 'water', { vol: 0.35 }); }
      st.wet = Math.max(0, st.wet - dt * 0.08);
    }
  }

  updateBuild(dt) {
    this.timeLeft = Math.max(0, this.timeLeft - dt);   // waits at 0 for the "Time's up!" question
    this.crabT -= dt;
    const maxCrabs = this.n <= 2 ? 2 : 3;
    if (this.crabT <= 0) { this.crabT = rand(7, 12); if (this.crabs.length < maxCrabs) this.spawnCrab(); }
    for (const st of this.stations) {
      const c = st.p.ctrl, a = st.actor;
      if (st.p.isAI) this.updateAI(st, dt);
      st.toolPop = Math.max(0, st.toolPop - dt); st.stylePop = Math.max(0, st.stylePop - dt);
      st.cheerCD -= dt; st.waveCD -= dt; st.readyT += dt;
      if (st.ready) {
        if (c.pressed('b')) this.setReady(st, false);
        st.digging = false;
        this.followActor(st, dt, true);
        a.update(dt);
        continue;
      }
      // cursor
      const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
      const mag = Math.hypot(mx, my);
      st.hold = mag > 0.15 ? st.hold + dt : 0;
      const sp = (st.p.isAI ? 560 : 640) * (0.4 + 0.6 * clamp(st.hold / 0.5, 0, 1)) / Math.max(0.8, st.k);
      st.cur.x = clamp(st.cur.x + (mx * sp + c.rx * 150) * dt, st.gx0 - 10, st.gx1 + 10);
      st.cur.y = clamp(st.cur.y + (my * sp + c.ry * 150) * dt, st.gy0 - HEAD + 30, st.gy1 + 4);
      if (st.clearAsk) { this.updateClearAsk(st); st.digging = false; this.followActor(st, dt, false); a.update(dt); continue; }
      // LB / RB: tools (the last one is Done) · X or the d-pad: the style
      if (pad) {
        const ts = (c.pressed('right') || c.pressed('down') ? 1 : 0) - (c.pressed('left') || c.pressed('up') ? 1 : 0);
        if (ts) this.stepStyle(st, ts);
      }
      if (c.pressed('rb')) this.stepTool(st, 1);
      if (c.pressed('lb')) this.stepTool(st, -1);
      if (c.pressed('x')) this.stepStyle(st, 1);
      // Y: smooth it all away, after a question (Go back is the default); nothing built yet: nothing to ask
      if (c.pressed('y')) {
        if (st.pieces.length || st.moat.size) { if (st.held) this.drop(st); st.clearAsk = askOpen(); sfx('select'); continue; }
        if (!st.p.isAI) sfx('blip');
      }
      // hover
      st.hover = st.held ? null : this.pieceAt(st, st.cur.x, st.cur.y);
      st.hoverCrab = null;
      const cs = this.toScreen(st, st.cur.x, st.cur.y);
      for (const cr of this.crabs) if (Math.hypot(cr.x - cs.x, cr.y - 18 * st.k - cs.y) < 34 * st.k) st.hoverCrab = cr;
      const tool = TOOLS[st.tool].id;
      if (c.pressed('a')) this.pressA(st);
      if (c.pressed('b')) this.pressB(st);
      // digging
      st.digging = false;
      if (tool === 'moat' && c.held('a') && !st.held) {
        st.digging = true;
        st.digT -= dt;
        const n = this.dig(st, clamp(st.cur.x, st.gx0 + 14, st.gx1 - 14), clamp(st.cur.y, st.gy0 + 12, st.gy1 - 10));
        if (n && st.digT <= 0) {
          st.digT = 0.2;
          snd('sc-dig', 'td-dig', { vol: this.n > 4 ? 0.3 : 0.45 });
          particles.burst(cs.x, cs.y, { type: 'dust', count: 5, colors: [SAND_D, SAND, SAND_DD], speed: [80, 200], angle: -Math.PI / 2, spread: 1 });
        }
      }
      if (st.held) {
        const aim = this.aimFor(st, st.held.type, st.held.style);
        st.held.x = aim.x; st.held.y = aim.y; st.held.z = aim.z;
      }
      st.aim = !st.held && tool !== 'hand' && tool !== 'moat' && tool !== 'done' && !(st.hover && !this.stackOK(st.hover, tool)) ? this.aimFor(st, tool, st.styles[tool]) : null;
      this.followActor(st, dt, false);
      if (st.digging) { if (a.pose !== 'dig' && !a._once) a.setPose('dig'); } else if (a.pose === 'dig') a.setPose('idle');
      a.update(dt);
    }
    const allReady = this.stations.every((s) => s.ready && s.readyT > 0.8);
    const humansReady = this.humans && this.stations.every((s) => s.p.isAI || (s.ready && s.readyT > 0.8));
    if (allReady || humansReady) this.startFinale();
  }

  /** The character walks over to stand beside the hand. */
  followActor(st, dt, idle) {
    const a = st.actor, k = st.k;
    let tx, ty;
    if (idle) { tx = this.castleCenter(st) + st.side * 150; ty = 60; }
    else {
      const gy = st.held ? st.held.y : st.hover ? st.hover.y : clamp(st.cur.y, st.gy0 + 10, st.gy1 - 4);
      const gx = st.cur.x;
      const off = 62 + (st.hover ? foot(st.hover).hw * 0.6 : 0);
      if (gx + st.side * off > st.gx1 + 30 || gx + st.side * off < st.gx0 - 30) st.side *= -1;
      tx = gx + st.side * off; ty = gy + 8;
    }
    tx = clamp(tx, st.gx0 - 30, st.gx1 + 30); ty = clamp(ty, st.gy0 + 6, st.gy1 + 6);
    const T = this.toScreen(st, tx, ty);
    const dx = T.x - a.x, dy = T.y - a.y, d = Math.hypot(dx, dy);
    const max = 420 * k;
    const v = d > 6 ? Math.min(max, d * 5) : 0;
    const vx = d > 0 ? (dx / d) * v : 0, vy = d > 0 ? (dy / d) * v : 0;
    a.x += vx * dt; a.y += vy * dt;
    if (st.digging || a._once) { a.speed = 0; } else a.moveAnim(vx, vy, max);
    if (v < 20 && !idle) { const cs = this.toScreen(st, st.cur.x, 0); a.facing = cs.x > a.x ? 1 : -1; }
  }

  // --- finale -----------------------------------------------------------------------------------------------
  startFinale() {
    if (this.finale) return;
    this.phase = 'finale';
    this.finale = { stage: 'wave', t: 0, tour: -1, cheese: 0, shot: false };
    for (const st of this.stations) {
      if (st.held) this.drop(st);
      st.ready = true; st.hover = null; st.aim = null; st.digging = false;
      if (st.p.isAI) { st.p.ctrl.move(0, 0); st.p.ctrl.hold('a', false); }
      st.actor.setPose('idle');
      st.splashed = false; st.gifted = false;
    }
    this.banner = { text: 'Here comes a gentle wave!', t: 0 };
    sfx('whoosh');
  }

  updateFinale(dt) {
    const F = this.finale;
    F.t += dt;
    if (this.banner) this.banner.t += dt;
    for (const st of this.stations) { st.cheerCD -= dt; st.waveCD -= dt; }
    if (F.stage === 'wave') {
      const t = F.t;
      if (t > 0.9 && !F.whoosh) { F.whoosh = true; snd('sc-wave', 'td-wave', { vol: 0.8 }); }
      if (t < 1) this.waveY = SHORE;
      else if (t < 3.6) this.waveY = lerp(SHORE, H + 60, ease.outCubic((t - 1) / 2.6));
      else if (t < 6.2) this.waveY = lerp(H + 60, SHORE, ease.inOutQuad((t - 3.6) / 2.6));
      else this.waveY = SHORE;
      const rising = t < 3.6;
      for (const st of this.stations) {
        const a = st.actor;
        if (rising && !st.splashed && this.waveY > st.oy + st.gy0 * st.k) {
          st.splashed = true; st.wet = 1;
          for (const c of st.moat.values()) { c.fill = 1; c.brim = 1; }
          const s = this.toScreen(st, 0, 0);
          particles.burst(s.x, s.y, { type: 'drop', count: 10, colors: ['#7fe3e0', '#ffffff', '#3fc6e0'], speed: [120, 300] });
        }
        if (rising && !st.feetWet && this.waveY > a.y) {
          st.feetWet = true;
          a.playOnce('surprised', 0.5, 'idle'); st.jvz = 520 * st.k;
          sfx('splash', { vol: 0.4 });
          particles.burst(a.x, a.y, { type: 'drop', count: 12, colors: ['#7fe3e0', '#ffffff'], speed: [150, 320], angle: -Math.PI / 2, spread: 1.1 });
          st.giggleAt = t + 0.6;
        }
        if (st.giggleAt && t >= st.giggleAt) { st.giggleAt = 0; a.playOnce('giggle', 1.2, 'idle'); if (!st.p.isAI) a.say('Splash!', 1, 'laugh'); }
        if (!rising && !st.gifted && t > 4.9) { st.gifted = true; this.seaGift(st); }
      }
      if (t > 3.8 && !F.crabs) { F.crabs = true; for (let i = 0; i < Math.min(3, 1 + Math.floor(this.n / 3)); i++) this.spawnCrab({ x: rand(200, W - 200), y: rand(WET + 60, H - 80), quiet: i > 0 }); }
      if (t > 6.6) { F.stage = 'sunset'; F.t = 0; this.banner = { text: 'Sunset castle tour!', t: 0 }; snd('sc-sunset', 'magic', { vol: 0.7 }); }
    } else if (F.stage === 'sunset') {
      this.sunsetK = ease.inOutQuad(clamp(F.t / 3.5, 0, 1));
      const per = this.n <= 2 ? 3.4 : this.n <= 4 ? 2.7 : 2.1;
      const t0 = 2.6;
      const idx = F.t < t0 ? -1 : Math.floor((F.t - t0) / per);
      const cam = this.api.camera;
      if (idx !== F.tour && idx < this.n && idx >= 0) {
        F.tour = idx; F.tourT = 0;
        const st = this.stations[idx];
        const zoom = Math.min(cam.maxZoom || 2, 0.8 * W / (st.GW * st.k), 0.6 * H / ((st.GD + HEAD) * st.k), 1.7);
        if (zoom > 1.04) cam.follow(st.ox, st.oy - (HEAD / 2) * st.k + 40, zoom, 3.2);
        else cam.follow(W / 2, H / 2, 1, 3);
        this.tourShine(st);
      } else if (idx >= this.n && F.tour !== 'group') {
        F.tour = 'group'; cam.follow(W / 2, H / 2, 1, 3);
        F.stage = 'photo'; F.t = 0; this.banner = { text: 'Sunset photo! Strike a pose!', t: 0 };
      }
      if (F.tourT !== undefined) F.tourT += dt;
    } else if (F.stage === 'photo') {
      this.sunsetK = 1;
      if (!F.shot && F.t > 4.6) {
        F.shot = true; this.flash = 0.6;
        snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.4);
        for (const st of this.stations) { const a = st.actor; particles.burst(a.x, a.y - a.height, { type: 'star', count: 6 }); }
      }
      if (F.shot && F.t > 6.4 && !this.finished) this.finishGame();
    }
    // characters: free to wander their patch and pose
    for (const st of this.stations) this.finaleMove(st, dt);
  }
  tourShine(st) {
    const s = this.toScreen(st, this.castleCenter(st), -60);
    particles.burst(s.x, s.y, { type: 'sparkle', count: 18, colors: ['#fff', '#ffd23f', '#ff9ec4'], speed: [100, 300] });
    particles.burst(s.x, s.y - 40, { type: 'star', count: 8 });
    sfx('sparkle'); sfx('yay', { vol: 0.5 });
    const a = st.actor;
    a.playOnce(pick(['strike3', 'cheer', 'pose-twirl']), 1.2, 'idle');
    a.emote('hearts', 2);
    for (const pc of st.pieces) if (pc.type === 'flag') pc.bump = 0.3;
  }
  seaGift(st) {
    for (let tries = 0; tries < 12; tries++) {
      const x = rand(st.gx0 + 30, st.gx1 - 30), y = rand(st.gy0 + 60, st.gy1 - 16);
      if (this.pieceAt(st, x, y) || this.underMold(st, x, y)) continue;
      const pc = this.build(st, chance(0.5) ? 'star' : 'shell', randInt(0, 2), { on: null, x, y, z: 0 }, { quiet: true });
      if (!pc) return;
      pc.dz = 30;
      const s = this.toScreen(st, x, y);
      particles.burst(s.x, s.y - 20, { type: 'sparkle', count: 12, colors: ['#fff', '#7fe3e0', '#ffd23f'] });
      particles.popText(s.x, s.y - 50 * st.k, 'Sea gift!', '#3fc6e0', this.n > 4 ? 30 : 40);
      return;
    }
  }
  finaleMove(st, dt) {
    const c = st.p.ctrl, a = st.actor, k = st.k;
    st.poseCD -= dt;
    let { x: mx, y: my } = photoMove(c);
    let jump = c.pressed('a'), pose = photoPosePressed(c);
    const F = this.finale;
    if (st.p.isAI) {
      st.aiT = (st.aiT ?? rand(0.5, 1.5)) - dt;
      if (st.aiT <= 0) {
        st.aiT = rand(0.8, 1.8);
        st.aiM = chance(0.35) ? [rand(-0.7, 0.7), rand(-0.4, 0.4)] : [0, 0];
        if (F.stage !== 'wave') { if (chance(0.25)) jump = true; else if (chance(0.55)) pose = randomPhotoPose(); }
      }
      [mx, my] = st.aiM || [0, 0];
    }
    if (F.stage === 'wave' && F.t < 6) { mx = 0; my = 0; jump = false; pose = null; }
    const sp = 300 * k;
    const l = this.toLocal(st, a.x + mx * sp * dt, a.y + my * sp * dt);
    const p2 = this.toScreen(st, clamp(l.x, st.gx0 - 20, st.gx1 + 20), clamp(l.y, st.gy0 + 6, st.gy1 + 6));
    const vx = (p2.x - a.x) / Math.max(dt, 1e-3), vy = (p2.y - a.y) / Math.max(dt, 1e-3);
    a.x = p2.x; a.y = p2.y;
    if (!a._once) a.moveAnim(vx, vy, sp);
    if (jump && st.jz <= 0) { st.jvz = 560 * k; sfx('jump', { vol: 0.4 }); a.playOnce('jump', 0.5, 'idle'); }
    if (st.jvz || st.jz > 0) {
      st.jz += st.jvz * dt; st.jvz -= 1900 * k * dt;
      if (st.jz <= 0) { st.jz = 0; st.jvz = 0; a.squash(0.18); }
    }
    a.z = st.jz;
    if (pose && st.poseCD <= 0 && !(F.stage === 'photo' && F.shot)) { st.poseCD = 0.35; strikePhotoPose(a, pose); }
    a.update(dt);
  }

  stats(st) {
    let molds = 0, decos = 0, tallest = 0, flags = 0;
    for (const pc of st.pieces) {
      if (DEFS[pc.type].kind === 'mold') molds++; else decos++;
      if (pc.type === 'flag') flags++;
      tallest = Math.max(tallest, this.level(pc));
    }
    const parts = [];
    if (molds) parts.push(`${molds} castle piece${molds === 1 ? '' : 's'}`);
    if (st.moat.size >= 6) parts.push('a moat');
    if (decos) parts.push(`${decos} treasure${decos === 1 ? '' : 's'}`);
    if (tallest >= 3 && parts.length < 3) parts.push(`${tallest} high`);
    if (!parts.length) parts.push('A sandy start!');
    return { text: parts.slice(0, 3).join(' · '), molds, decos, tallest, flags };
  }
  finishGame() {
    if (this.finished) return;
    this.finished = true;
    snd('applause', 'cheer');
    this.api.finishTogether({ stats: this.stations.map((st) => this.stats(st).text), title: 'Beautiful castles!', focus: { x: W / 2, y: 640, zoom: 1.05 } });
  }
  onDone() {
    if (!this.finale) { this.startFinale(); return; }
    if (!this.finished) this.finishGame();
  }
  destroy() {}

  // =========================================================================================
  // Drawing (world)
  draw(g) {
    drawBackdrop(g, this.sunsetK);
    drawSun(g, this.t, this.sunsetK);
    drawShore(g, this.t, this.sunsetK);
    for (const st of this.stations) this.drawGround(g, st);
    if (this.finale) drawWave(g, this.waveY, this.t, 0.9);
    // everything that stands on the sand, back to front
    const list = [];
    for (const st of this.stations) {
      for (const pc of st.pieces) list.push({ y: st.oy + pc.sy * st.k, st, pc });
      if (st.held) list.push({ y: st.oy + (st.held.y + 0.3) * st.k + 0.01, st, pc: st.held, held: true });
      list.push({ y: st.actor.y, st, actor: true });
    }
    for (const c of this.crabs) list.push({ y: c.y, crab: c });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e.crab) this.drawCrab(g, e.crab);
      else if (e.actor) e.st.actor.draw(g, { ring: e.st.p.color });
      else this.drawPlaced(g, e.st, e.pc, e.held);
    }
    for (const st of this.stations) if (this.phase === 'build' && !st.ready) this.drawCursor(g, st);
    if (this.sunsetK > 0.01) {
      g.save(); g.globalAlpha = this.sunsetK * 0.07; g.fillStyle = '#ff7a59'; g.fillRect(0, SHORE, W, H - SHORE); g.restore();
    }
  }

  drawGround(g, st) {
    const k = st.k;
    g.save();
    g.translate(st.ox, st.oy); g.scale(k, k);
    const x0 = st.gx0, y0 = st.gy0, w = st.GW, h = st.GD;
    // smoothed patch of sand with a dashed rope border in the player's colour
    ui.roundRect(g, x0, y0, w, h, 28);
    g.fillStyle = this.sunsetK > 0.5 ? 'rgba(255,214,170,0.35)' : 'rgba(255,240,205,0.5)'; g.fill();
    if (st.wet > 0) { g.fillStyle = `rgba(150,105,55,${st.wet * 0.3})`; g.fill(); }
    g.setLineDash([16, 12]); g.lineWidth = 5; g.strokeStyle = st.p.color; g.globalAlpha = 0.8; g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    // corner stakes
    for (const [sx, sy] of [[x0 + 10, y0 + 10], [x0 + w - 10, y0 + 10], [x0 + 10, y0 + h - 10], [x0 + w - 10, y0 + h - 10]]) {
      g.fillStyle = '#c98a4b'; g.beginPath(); g.rect(sx - 3, sy - 16, 6, 18); g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
      g.fillStyle = st.p.color; g.beginPath(); g.arc(sx, sy - 18, 5, 0, TAU); g.fill(); g.stroke();
    }
    // moat
    this.drawMoat(g, st);
    for (const pc of st.pieces) drawPieceShadow(g, pc);
    g.restore();
  }

  drawMoat(g, st) {
    if (!st.moat.size) return;
    const cells = [...st.moat.values()];
    g.fillStyle = '#c99a55';
    g.beginPath(); for (const c of cells) { g.moveTo(c.x + 15, c.y); g.ellipse(c.x, c.y, 15, 12, 0, 0, TAU); } g.fill();
    g.fillStyle = '#a77a42';
    g.beginPath(); for (const c of cells) { g.moveTo(c.x + 12, c.y); g.ellipse(c.x, c.y + 1, 12, 9, 0, 0, TAU); } g.fill();
    // water: grows in each cell as it fills
    const sunset = this.sunsetK;
    g.fillStyle = sunset > 0.5 ? '#ff9f9a' : '#5fcff0';
    g.beginPath();
    for (const c of cells) { if (c.fill <= 0) continue; const r = 11 * c.fill + (c.brim ? 1.5 : 0); g.moveTo(c.x + r, c.y + 1); g.ellipse(c.x, c.y + 1, r, r * 0.78, 0, 0, TAU); }
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (const c of cells) {
      if (c.fill < 0.8) continue;
      const tw = Math.sin(this.t * 2.2 + c.wob * 3);
      if (tw > 0.55) { g.beginPath(); g.ellipse(c.x - 3, c.y - 1, 4 * tw, 1.6, 0, 0, TAU); g.fill(); }
    }
  }

  drawPlaced(g, st, pc, held) {
    const k = st.k;
    g.save();
    g.translate(st.ox, st.oy); g.scale(k, k);
    if (held) {
      // carried: lifted and bobbing, with a ground shadow at the landing spot
      const f = foot(pc);
      g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(pc.x, pc.y - pc.z, f.hw + 4, f.hd + 4, 0, 0, TAU); g.fill();
      const lift = 26 + Math.sin(this.t * 6) * 5;
      drawPiece(g, { ...pc, z: pc.z + lift }, this.t, { alpha: 0.92 });
    } else {
      drawPiece(g, { ...pc, z: pc.z + (pc.dz || 0) }, this.t, { wet: st.wet });
      if (st.hover === pc && this.phase === 'build') {
        const [x0, x1, y0, y1] = silhouette({ ...pc, z: pc.z + (pc.dz || 0) });
        g.save(); g.globalAlpha = 0.6 + 0.3 * Math.sin(this.t * 8);
        g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeStyle = st.p.color;
        ui.roundRect(g, x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8, 14); g.stroke();
        g.restore();
      }
    }
    g.restore();
  }

  drawCrab(g, c) {
    g.save();
    g.translate(c.x, c.y);
    const k = this.k;
    g.fillStyle = 'rgba(120,80,40,0.22)'; g.beginPath(); g.ellipse(0, 2, 24 * k, 7 * k, 0, 0, TAU); g.fill();
    if (c.swim) {
      g.save(); g.beginPath(); g.rect(-60 * k, -80 * k, 120 * k, 76 * k); g.clip();
      drawCrab(g, this.t, { walk: c.walk, happy: c.happy, look: c.look, swim: true, scale: k });
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2.5 * k;
      const rr = 26 + Math.sin(this.t * 5) * 3;
      g.beginPath(); g.ellipse(0, -4 * k, rr * k, rr * 0.3 * k, 0, 0, TAU); g.stroke();
    } else drawCrab(g, this.t, { walk: c.walk, happy: c.happy, look: c.look, scale: k });
    if (c.state === 'look' && c.stateT > 0.4) {
      g.save(); g.translate(0, -66 * k - Math.sin(c.stateT * 4) * 4); g.scale(k, k); drawHeartShape(g, 24, '#ff6f9e'); g.restore();
    }
    g.restore();
  }

  drawCursor(g, st) {
    const k = st.k, tool = TOOLS[st.tool].id;
    const cs = this.toScreen(st, st.cur.x, st.cur.y);
    // ghost of what A would build, with a dashed drop line
    if (st.aim) {
      const aim = st.aim, style = st.styles[tool];
      g.save(); g.translate(st.ox, st.oy); g.scale(k, k);
      const ghost = { type: tool, style, x: aim.x, y: aim.y, z: aim.z, seed: 7 };
      const f = foot(ghost);
      g.fillStyle = st.p.color; g.globalAlpha = 0.28;
      g.beginPath(); g.ellipse(aim.x, aim.y - aim.z, f.hw + 4, f.hd + 4, 0, 0, TAU); g.fill();
      g.globalAlpha = 1;
      drawPiece(g, ghost, this.t, { alpha: 0.38 + 0.08 * Math.sin(this.t * 5) });
      g.restore();
    }
    const sz = clamp(64 * k, 40, 72);
    g.save();
    if (tool === 'moat' && !st.held) {
      // the spade digs at the hand
      g.save(); g.translate(cs.x, cs.y); g.globalAlpha = 0.5; g.fillStyle = st.p.color;
      g.beginPath(); g.ellipse(0, 0, 18 * k, 13 * k, 0, 0, TAU); g.fill(); g.restore();
      const wob = st.digging ? Math.sin(this.t * 30) * 0.3 : 0;
      g.translate(cs.x + sz * 0.25, cs.y - sz * 0.45); g.rotate(wob);
      drawToolIcon(g, 'moat', 0, 0, sz, this.t);
      g.restore();
    } else {
      g.beginPath(); g.arc(cs.x, cs.y, sz * 0.5, 0, TAU);
      g.fillStyle = st.held ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.8)'; g.fill();
      g.lineWidth = 5; g.strokeStyle = st.p.color; g.setLineDash(st.held ? [9, 7] : []); g.stroke(); g.setLineDash([]);
      if (!st.held && tool === 'done') drawDoneTab(g, cs.x - sz * 0.32, cs.y - sz * 0.32, sz * 0.64, sz * 0.64, { sel: true, label: false });
      else if (!st.held) drawToolIcon(g, tool, cs.x, cs.y, sz * 0.82, this.t, st.styles[tool]);
      g.restore();
    }
    if (this.humans > 1 || st.p.isAI) ui.text(g, st.p.tag, cs.x, cs.y - sz * 0.5 - 14, { size: 20, color: st.p.color, strokeWidth: 4 });
    // what A / B would do right here
    if (!st.p.isAI) {
      let tip = null;
      if (st.held) tip = [['a', 'Put down'], ['b', 'Take away']];
      else if (tool === 'done') tip = [['a', "I'm ready!"]];
      else if (st.hoverCrab && (!st.hover || tool === 'hand')) tip = [['a', 'Tickle!']];
      else if (st.hover) tip = tool === 'hand' || tool === 'moat' || !this.stackOK(st.hover, tool) ? [['a', 'Pick up'], ['b', 'Take away']] : [['a', 'Stack!'], ['b', 'Take away']];
      if (tip && tool === 'moat' && !st.held && st.hover) tip = [['b', 'Take away']];
      if (tip) {
        const fs = clamp(26 * k + 4, 18, 28), gs = fs * 1.15;
        let w = 14;
        for (const [, l] of tip) w += gs + 6 + ui.measure(g, l, fs, 800) + 12;
        const bx = clamp(cs.x - w / 2, st.r.x + 6, st.r.x + st.r.w - w - 6);
        const by = Math.max(st.r.y + 4, cs.y - sz * 0.5 - 40 - gs * 1.6);
        ui.panel(g, bx, by, w, gs * 1.6, { r: gs * 0.8, fill: 'rgba(255,255,255,0.94)', lineWidth: 3, shadow: false });
        let tx = bx + 10;
        for (const [b, l] of tip) {
          ui.glyph(g, b, tx + gs / 2, by + gs * 0.8, gs); tx += gs + 6;
          ui.text(g, l, tx, by + gs * 0.8 + 1, { size: fs, color: NAVY, stroke: false, align: 'left', weight: 800 });
          tx += ui.measure(g, l, fs, 800) + 12;
        }
      }
    }
  }

  // =========================================================================================
  // HUD (screen space)
  drawHUD(g) {
    // title
    g.save(); g.translate(W / 2, 50);
    const title = this.phase === 'build' ? 'Sandcastle Beach' : this.finale.stage === 'wave' ? 'Splash!' : 'Sunset Showcase';
    const tw = Math.max(520, ui.measure(g, title, 50, 800) + 120);
    ui.panel(g, -tw / 2, -38, tw, 76, { r: 38, fill: this.sunsetK > 0.5 ? '#ff8a6b' : '#3fb6e8' });
    ui.text(g, title, 0, 2, { size: 50, weight: 800 });
    g.restore();
    if (this.phase === 'build') {
      this.drawClock(g);
      const pad = this.players.some((p) => !p.isAI && p.ctrl.kind === 'pad');
      ui.hints(g, [['stick', 'Hand'], ['lb', '/ RB Tools'], [pad ? 'dpad' : 'x', 'Style'], ['a', 'Build'], ['b', 'Take away'], ['y', 'Clear']], W / 2, 122, { size: 30, gap: 26 });
      for (const st of this.stations) this.drawStrip(g, st);
      for (const st of this.stations) if (st.clearAsk) drawAsk(g, { x: st.r.x, y: st.r.y, w: st.r.w, h: st.r.h - st.sh - 4 }, st.clearAsk, { title: 'Smooth it all away?', yes: 'Clear', color: '#e8a33d' });
    } else {
      this.drawFinaleHUD(g);
    }
    if (this.flash > 0) { g.save(); g.globalAlpha = this.flash; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  }

  /** The sunset clock itself is the play scene's (api.limit); this is just its warning. */
  drawClock(g) {
    if (Math.ceil(this.timeLeft) <= 10) ui.text(g, 'Almost sunset!', W - 150, 116, { size: 28, color: '#ffd23f' });
  }

  drawStrip(g, st) {
    const { r, sh, p } = st;
    const y = r.y + r.h - sh / 2 - 2;
    const small = this.n > 4;
    // tag chip
    const tagW = small ? 54 : 70, tagH = small ? 34 : 42;
    let x = r.x + 8;
    ui.panel(g, x, y - tagH / 2, tagW, tagH, { r: tagH / 2, fill: p.color, lineWidth: 3, shadow: false });
    ui.text(g, p.tag, x + tagW / 2, y + 1, { size: tagH * 0.55, strokeWidth: 4, shadow: false });
    x += tagW + 8;
    if (st.ready) {
      const w = r.x + r.w - 8 - x;
      ui.panel(g, x, y - tagH / 2, w, tagH, { r: tagH / 2, fill: '#36d17a', lineWidth: 3, shadow: false });
      ui.text(g, st.p.isAI ? 'Ready!' : 'Ready!  B: keep building', x + w / 2, y + 1, { size: tagH * 0.55, strokeWidth: 4, maxWidth: w - 16 });
      return;
    }
    // tool slots
    const avail = r.x + r.w - 8 - x;
    const s = Math.min(sh - 12, avail / (TOOLS.length + 0.4) - 4);
    const gap = 4;
    const total = TOOLS.length * (s + gap) - gap;
    let sx = x + (avail - total) / 2;
    TOOLS.forEach((tl, ti) => {
      const sel = ti === st.tool;
      const cx = sx + s / 2, cy = y;
      const k2 = sel ? 1.08 + st.toolPop * 0.6 : 1;
      if (tl.id === 'done') drawDoneTab(g, cx - s / 2, cy - s / 2, s, s, { sel, bump: st.toolPop * 0.6, label: false });
      else {
        g.save(); g.translate(cx, cy); g.scale(k2, k2);
        ui.panel(g, -s / 2, -s / 2, s, s, { r: s * 0.26, fill: sel ? '#ffd23f' : 'rgba(255,255,255,0.88)', lineWidth: sel ? 4 : 2, stroke: sel ? NAVY : 'rgba(36,22,63,0.35)', shadow: false });
        drawToolIcon(g, tl.id, 0, 0, s * 0.82, this.t, st.styles[tl.id] || 0);
        g.restore();
      }
      sx += s + gap;
    });
    // name (and style) of the selected tool, in a bubble above its slot
    const tl = TOOLS[st.tool], d = DEFS[tl.id];
    const label = tl.id === 'done' ? "All done? A: I'm ready!" : d && d.styles.length > 1 ? `${tl.name}: ${d.styles[st.styles[tl.id]]}` : tl.name;
    const fs = small ? 20 : 26;
    const lw = ui.measure(g, label, fs, 800) + 26;
    const slotX = x + (avail - total) / 2 + st.tool * (s + gap) + s / 2;
    const bx = clamp(slotX - lw / 2, r.x + 6, r.x + r.w - lw - 6), by = y - s / 2 - fs * 1.5 - 6;
    const pk = 1 + st.stylePop * 0.5;
    g.save(); g.translate(bx + lw / 2, by + fs * 0.75); g.scale(pk, pk);
    ui.panel(g, -lw / 2, -fs * 0.75, lw, fs * 1.5, { r: fs * 0.75, fill: '#ffffff', lineWidth: 3, shadow: false });
    ui.text(g, label, 0, 1, { size: fs, color: NAVY, stroke: false, weight: 800 });
    g.restore();
  }

  drawFinaleHUD(g) {
    const F = this.finale;
    if (this.banner && this.banner.t < 3.2) {
      const b = this.banner, p = ease.outBack(clamp(b.t / 0.4, 0, 1));
      const a = clamp((3.2 - b.t) / 0.4, 0, 1);
      g.save(); g.globalAlpha = a; g.translate(W / 2, 150); g.scale(p, p); g.rotate(-0.02);
      const bw = ui.measure(g, b.text, 52, 800) + 90;
      ui.panel(g, -bw / 2, -42, bw, 84, { r: 42, fill: '#9b5cff' });
      ui.text(g, b.text, 0, 2, { size: 52, weight: 800 });
      g.restore();
    }
    if (F.stage === 'sunset' && typeof F.tour === 'number' && F.tour >= 0) {
      const st = this.stations[F.tour];
      const S = this.stats(st);
      const p = ease.outBack(clamp(F.tourT / 0.45, 0, 1));
      const w = 760, h = 150, x = W / 2, y = H - 110;
      g.save(); g.translate(x, y); g.scale(p, p); g.rotate(-0.015);
      ui.panel(g, -w / 2, -h / 2, w, h, { r: 34, fill: '#fff6ea', stroke: st.p.color, lineWidth: 8 });
      drawPortrait(g, st.p, -w / 2 + 80, 0, 56, { ring: st.p.color, ringWidth: 6, expr: 'happy' });
      ui.text(g, st.name, -w / 2 + 160, -26, { size: 50, color: st.p.color, align: 'left', weight: 800, maxWidth: w - 210 });
      ui.text(g, S.text, -w / 2 + 162, 36, { size: 32, color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: w - 210 });
      ui.text(g, st.p.tag, w / 2 - 40, -h / 2 + 4, { size: 30, color: '#fff', strokeWidth: 6 });
      g.restore();
    }
    if (F.stage === 'photo' && !F.shot) {
      const left = 4.6 - F.t;
      if (left < 3) {
        const nn = Math.ceil(left);
        const sc = 1 + (nn - left) * 0.5;
        g.save(); g.translate(W / 2, H / 2 - 40); g.scale(sc, sc); g.globalAlpha = clamp(left - Math.floor(left) + 0.2, 0, 1);
        ui.text(g, String(nn), 0, 0, { size: 180, color: '#ffd23f', strokeWidth: 26, weight: 800 });
        g.restore();
      }
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
        ui.hints(g, r1, W / 2, H - 92, { size: 32, gap: 24 });
        ui.hints(g, r2, W / 2, H - 44, { size: 32, gap: 24 });
      }
    }
    if (F.stage === 'photo' && F.shot) {
      // polaroid frame around the whole beach
      const p = clamp((F.t - 4.6) / 0.4, 0, 1);
      g.save(); g.globalAlpha = p;
      g.lineWidth = 40; g.strokeStyle = '#fffaf2'; g.strokeRect(20, 20, W - 40, H - 40);
      g.lineWidth = 6; g.strokeStyle = NAVY; g.strokeRect(0 + 40, 40, W - 80, H - 80);
      ui.text(g, 'Sunset at Sandcastle Beach', W / 2, H - 70, { size: 48, color: '#ff8a6b', weight: 800 });
      g.restore();
    }
  }
}

function ai_on(st, step) {
  const pc = st.ai.pieceOf[step.on];
  return pc && st.pieces.includes(pc) ? pc : null;
}
