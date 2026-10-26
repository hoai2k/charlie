// Pottery Wheel (Play Studio). Every player gets a potter's wheel at a
// split-screen station:
//   1. Shape: hold X to press the shaping stick into the spinning clay. The
//      clay keeps its volume, so squeezing it in makes it grow taller, and
//      grabbing the rim pulls it up (or squashes it down). B smooths, RT / LT add
//      or take off handles, Y morphs into a surprise shape (shaped clay asks
//      first). A (or RB): "Bake it?" (A yes; before any shaping A says "Hold X").
//      The pot names itself live.
//   2. Fire: the kiln pops up around the pot; mash A (or X) to puff the bellows,
//      then the doors burst open and the clay colour is revealed.
//   3. Paint: the pot turns slowly. Glaze dips, stripes, a brush (hold X and
//      the wheel paints a ring), dots and stickers, all wrapped on the 3D pot.
//      X uses the tool, A goes on to the next tool, LB / RB pick the tool (the
//      last one is Done: A there = ready), Y (d-pad left / right) the colour /
//      sticker, B undoes.
//   (A confirms / moves on, X is the action: the owner's button rule.)
// Finale: every pot goes up on the gallery shelf, gets a ribbon, and
// everyone poses for a photo.
import { W } from '../engine/canvas.js';
import { Actor, POSES } from '../engine/sprites.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, sfxLoop, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { playerName } from '../state.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose } from '../engine/photo-poses.js';
import {
  KY, N, WET, CLAYS, PAINTS, GOLD, RAINBOW_I, STICKERS, PRESETS, PRESET_NAMES, HMAX,
  newPot, volumeOf, radiusAt, maxRadius, presetProfile, shapeClay, smooth, potName,
  ringPoint, surfaceAt, mix,
} from './pottery-wheel/pot.js';

import { PotteryDrawing, TOOLS, CHEESE_TIME } from './pottery-wheel/draw.js';
import { askOpen, askUpdate } from '../engine/studio-ui.js';
import { meta } from './pottery-wheel.meta.js';

export { meta };

const TOOL = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));
const DONE = TOOLS.length;   // the paint tool after Stickers: "Done" (A there = my pot is ready)
const SHAPE_SPIN = 9, PAINT_SPIN = 0.9, FAST_SPIN = 2.6;
const CUR_SPEED = 430;
const MAX_STROKE_PTS = 900, MAX_DOTS = 160, MAX_STICKERS = 40;
const FALLBACK_AWARDS = ['Masterpiece!', 'So pretty!', 'Super cute!', 'Gorgeous!', 'Fancy!', 'Lovely!', 'Wow-wee!', 'Beautiful!'];
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const MOLD = POSES.mold ? 'mold' : 'stir';

function stationRects(n) {
  const top = 112, bottom = 1068, left = 14, right = W - 14, gap = 14;
  if (n === 1) return [{ x: 300, y: top, w: 1320, h: bottom - top }];
  const cols = n === 2 ? 2 : n <= 4 ? 2 : 4, rows = n === 2 ? 1 : 2;
  const w = (right - left - gap * (cols - 1)) / cols, h = (bottom - top - gap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const inRow = Math.min(cols, n - row * cols);
    const ox = ((cols - inRow) * (w + gap)) / 2;
    return { x: left + ox + col * (w + gap), y: top + row * (h + gap), w, h };
  });
}

function layoutStation(r, n) {
  const tabH = Math.round(clamp(r.h * 0.085, 42, 74));
  const hintH = Math.round(clamp(r.h * 0.07, 34, 58));
  const listW = Math.round(r.w * (n === 1 ? 0.24 : n > 4 ? 0.27 : 0.27));
  const ca = { x: r.x, y: r.y + tabH + 10, w: r.w - listW - 10, h: r.h - tabH - hintH - 20 };
  const k = Math.min(ca.h / 610, (ca.w * 0.62) / 480);
  const floorY = ca.y + ca.h - 4;
  return {
    tabH, hintH, listW, ca, k, floorY,
    base: { x: ca.x + ca.w * 0.6, y: floorY - (art('prop/pottery-wheel') ? 140.5 : 140) * k },
    list: { x: r.x + r.w - listW - 10, y: r.y + tabH + 10, w: listW, h: r.h - tabH - hintH - 22 },
    charFoot: { x: ca.x + ca.w * 0.15, y: floorY + 2 },
    charH: ca.h * 0.46, charW: ca.w * 0.26,
  };
}

const MAKE_TIME = 240;   // the Play Studio clock (seconds), then "Time's up!" asks

export class Game extends PotteryDrawing {
  constructor(api) {
    super();
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'make';
    this.phaseT = 0;
    this.cpuOnly = this.players.every((p) => p.isAI);
    this.humans = this.players.filter((p) => !p.isAI).length;
    const rects = stationRects(this.n);
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i]));
    this.hum = null;
    // The Play Studio clock: 4 minutes of making (drawn by the play scene the whole time). At 0 it
    // asks "Time's up!": Keep playing adds a minute, All done goes to the gallery (as the pause
    // menu's "All done!"). Like api.studioClock, but it stops when the show starts.
    this.makeLeft = MAKE_TIME;
    api.limit(() => (this.phase === 'make' ? this.makeLeft : null), {
      showAt: Infinity, x: W - 130, y: 56,
      timeUp: { more: () => { this.makeLeft += 60; }, done: () => this.onDone() },
    });
    snd('pottery-plop', 'splat', { vol: 0.6 });
  }

  makeStation(p, i, r) {
    const L = layoutStation(r, this.n);
    const a = new Actor(p, { x: L.charFoot.x, y: L.charFoot.y, facing: 1 });
    a.scale = Math.min(L.charH / a.leader.h, L.charW / Math.max(1, a.width / a.scale));
    a.snap();
    const st = {
      p, i, r, L, actor: a, pot: newPot(),
      step: 'shape', stepT: 0, cursor: { x: 170, y: 90 }, phi: rand(TAU), spin: SHAPE_SPIN,
      tool: TOOL.glaze, color: 0, sticker: 0, history: [], held: null, hover: null, stroke: null, dotT: 0,
      confirm: null, ask: null, ready: false, readyT: 0, fire: null,
      name: '', nameCand: '', nameCandT: 0, nameBump: 0, potBump: 0, listBump: 0, cheerCD: 0,
      shapeT: 0, workT: 0, sndT: 0, morph: null, award: null, ai: null, helpT: 0,
    };
    st.name = 'Lump';
    if (p.isAI) this.planShape(st);
    return st;
  }

  // --- helpers ----------------------------------------------------------------------
  /** Screen position of a point in pot units (x from the axis, y = height). */
  toScreen(st, x, y) { const k = st.L.k, b = st.L.base; return { x: b.x + x * k, y: b.y - y * k }; }
  cheer(st, say = null) {
    const a = st.actor;
    if (st.cheerCD > 0) return;
    st.cheerCD = 1.1;
    a.playOnce('cheer', 0.5, 'idle'); a.squash(0.12);
    if (say) a.say(say, 1.1, null);
  }
  potTop(st) { return this.toScreen(st, 0, st.pot.h + 20); }

  // --- step 1: shaping ----------------------------------------------------------------
  updateShape(st, dt) {
    const c = st.p.ctrl, pot = st.pot, a = st.actor, cur = st.cursor;
    st.phi += dt * SHAPE_SPIN;
    if (st.morph) {
      const M = st.morph;
      M.t += dt;
      const e = ease.inOutQuad(clamp(M.t / 0.7, 0, 1));
      for (let i = 0; i < N; i++) pot.r[i] = lerp(M.from[i], M.to.r[i], e);
      pot.h = lerp(M.fromH, M.to.h, e);
      if (M.t >= 0.7) { pot.vol = volumeOf(pot.r, pot.h); pot.handles = M.to.handles; st.morph = null; }
      return;
    }
    if (st.confirm) { this.updateConfirm(st, dt); return; }
    if (st.ask) { this.updateAsk(st); return; }
    const mx = c.x, my = c.y;
    cur.x = clamp(cur.x + mx * CUR_SPEED * dt, -260, 260);
    cur.y = clamp(cur.y - my * CUR_SPEED * dt, -20, HMAX + 40);
    if (c.pressed('rb')) { st.confirm = { t: 0 }; sfx('select'); a.setPose('idle'); return; }
    if (c.pressed('a')) {
      // A: this shape's done - "Bake it?" (until the clay has been shaped: how to shape it)
      if (st.shapeT < 0.6 && !st.lastPreset && !st.p.isAI) { st.hint = { text: 'Hold X to shape the clay!', t: 2.2 }; sfx('blip'); }
      else { st.confirm = { t: 0 }; sfx('select'); a.setPose('idle'); }
      return;
    }
    const hStep = (c.pressed('rt') ? 1 : 0) - (c.pressed('lt') ? 1 : 0);
    if (hStep) {
      pot.handles = (pot.handles + hStep + 3) % 3;
      sfx(pot.handles ? 'pop' : 'back');
      const s = this.toScreen(st, maxRadius(pot) + 30, pot.h * 0.5);
      particles.burst(s.x, s.y, { type: 'sparkle', count: 8, colors: ['#fff', st.p.color] });
      st.potBump = 0.25; this.cheer(st);
    }
    if (c.pressed('y')) {
      // Y: a surprise shape! (shaped clay asks first, Go back is the default)
      if ((st.shapeT > 0.3 || st.lastPreset || pot.handles) && !st.p.isAI) { st.ask = askOpen(); sfx('select'); a.setPose('idle'); } else this.surpriseShape(st);
      return;
    }
    const tx = Math.abs(cur.x), ty = cur.y;
    st.shaping = false; st.sponging = false;
    if (c.held('x')) {
      st.hint = null;
      const work = shapeClay(pot, tx, ty, dt, { pressed: c.pressed('x') });
      if (work > 0.03) {
        st.shaping = true; st.shapeT += dt;
        st.sndT -= dt;
        if (st.sndT <= 0) { st.sndT = rand(0.22, 0.34); snd('pottery-squish', 'brush', { vol: clamp(0.25 + work * 0.2, 0.25, 0.6) }); }
        // wet slip flicks off the spinning clay
        if (chance(clamp(work * 0.25, 0.05, 0.5) * dt * 30)) {
          const side = cur.x >= 0 ? 1 : -1;
          const R = radiusAt(pot, ty / pot.h);
          const s = this.toScreen(st, side * Math.min(R, tx), clamp(ty, 0, pot.h));
          particles.burst(s.x, s.y, { type: 'drop', count: 2, colors: ['#a8775a', '#c39274'], angle: side > 0 ? -0.5 : -Math.PI + 0.5, spread: 0.6, speed: [120, 280], size: [4, 8] });
        }
      }
      if (pot.grabTop) st.shaping = true;
    } else pot.grabTop = false;
    if (c.held('b')) {
      st.sponging = true;
      smooth(pot, tx, ty, dt, 3, 70);
      st.sndT -= dt;
      if (st.sndT <= 0) { st.sndT = 0.32; snd('scrub', 'brush', { vol: 0.3 }); }
      if (chance(dt * 8)) { const s = this.toScreen(st, cur.x, ty); particles.burst(s.x, s.y, { type: 'bubble', count: 1, colors: ['#fff'] }); }
    }
    if (st.shaping || st.sponging) { if (a.pose !== MOLD && !a._once) a.setPose(MOLD); } else if (a.pose === MOLD) a.setPose('idle');
    this.checkName(st, dt);
  }

  checkName(st, dt) {
    if (st.shapeT < 0.6 && !st.lastPreset) return;
    const nm = potName(st.pot);
    if (nm === st.name) { st.nameCand = ''; return; }
    if (nm !== st.nameCand) { st.nameCand = nm; st.nameCandT = 0; return; }
    st.nameCandT += dt;
    if (st.nameCandT < 0.45) return;
    st.name = nm; st.nameCand = ''; st.nameBump = 0.4;
    sfx('sparkle', { vol: 0.5 });
    const top = this.potTop(st);
    particles.popText(top.x, top.y - 20, `${nm}!`, st.p.color, clamp(64 * st.L.k, 30, 64));
    particles.burst(top.x, top.y, { type: 'sparkle', count: 8, colors: ['#fff', '#fff6a8'] });
    this.cheer(st);
  }

  surpriseShape(st) {
    const pot = st.pot;
    let name = pick(PRESET_NAMES);
    if (st.lastPreset === name) name = pick(PRESET_NAMES);
    st.lastPreset = name;
    const to = presetProfile(name, pot.vol, 0.04);
    st.morph = { t: 0, from: pot.r.slice(), fromH: pot.h, to };
    pot.grabTop = false;
    sfx('magic'); snd('pottery-plop', 'splat', { vol: 0.5 });
    const b = this.toScreen(st, 0, pot.h * 0.5);
    particles.burst(b.x, b.y, { type: 'smoke', count: 10, speed: [60, 200] });
    particles.burst(b.x, b.y, { type: 'star', count: 8 });
    st.actor.playOnce('surprised', 0.5, 'idle');
  }

  /** Y on shaped clay: "Swap for a surprise?" - Go back (the default) or Surprise!. */
  updateAsk(st) {
    const q = st.ask, sel = q.sel, r = askUpdate(st.p.ctrl, q);
    if (q.sel !== sel) sfx('move');
    if (!r) return;
    st.ask = null;
    if (r === 'yes') this.surpriseShape(st); else sfx('back');
  }

  updateConfirm(st, dt) {
    const c = st.p.ctrl;
    st.confirm.t += dt;
    if (st.confirm.t < 0.15) return;
    if (c.pressed('a') || c.pressed('rb')) {
      st.confirm = null;
      if (st.step === 'shape') this.startFire(st);
      else if (st.step === 'paint') this.setReady(st, true);
    } else if (c.pressed('b')) { st.confirm = null; sfx('back'); }
  }

  // --- step 2: the kiln --------------------------------------------------------------
  startFire(st) {
    st.step = 'fire'; st.stepT = 0; st.confirm = null;
    st.pot.grabTop = false; st.morph = null;
    st.fire = { stage: 'in', t: 0, heat: 0, kiln: 0, doors: 0, sink: 0, glow: 0, shake: 0, flare: 0, smokeT: 0 };
    st.actor.setPose('idle'); st.actor.playOnce('ready', 0.5, 'idle');
    sfx('whoosh');
    const b = this.toScreen(st, 0, st.pot.h * 0.5);
    particles.burst(b.x, b.y, { type: 'smoke', count: 12, speed: [80, 260] });
    st.actor.say('Bake it!', 1.1, st.p.isAI ? null : 'woo');
  }

  updateFire(st, dt) {
    const F = st.fire, c = st.p.ctrl, a = st.actor, k = this.kilnK(st);
    F.t += dt; st.phi += dt * 0.5;
    F.flare = Math.max(0, F.flare - dt * 2.5);
    const kx = st.L.base.x, fy = st.L.floorY;
    if (F.stage === 'in') {
      F.kiln = ease.outBack(clamp(F.t / 0.45, 0, 1));
      F.sink = ease.inOutQuad(clamp((F.t - 0.15) / 0.45, 0, 1));
      F.doors = ease.inOutQuad(clamp((F.t - 0.65) / 0.3, 0, 1));
      if (F.t >= 0.95) { F.stage = 'bake'; F.t = 0; snd('pottery-kiln-door', 'land', { vol: 0.8 }); st.potBump = 0; }
    } else if (F.stage === 'bake') {
      F.heat = Math.min(1, F.heat + dt / 7.5);
      if (c.pressed('a') || c.pressed('x')) {
        F.heat = Math.min(1, F.heat + 0.065);
        F.flare = 1;
        a.playOnce('pump', 0.28, 'idle'); a.squash(0.1);
        snd('pottery-bellows', 'pump', { vol: 0.45 });
        particles.burst(kx, fy - 60 * k, { type: 'spark', count: 6, colors: ['#ffd23f', '#ff9f1c', '#fff'], angle: -Math.PI / 2, spread: 1.0, speed: [150, 380] });
      }
      F.glow = F.heat;
      F.smokeT -= dt;
      if (F.smokeT <= 0) { F.smokeT = lerp(0.6, 0.18, F.heat); particles.burst(kx + 180 * k, fy - 650 * k, { type: 'smoke', count: 1, speed: [30, 80], angle: -Math.PI / 2, spread: 0.4, colors: ['#eee'] }); }
      if (F.heat >= 1) { F.stage = 'ding'; F.t = 0; snd('pottery-ding', 'roller-ding', { vol: 0.8 }); particles.popText(kx, fy - 560 * k, 'Ding!', '#ffd23f', clamp(70 * k, 34, 70)); }
    } else if (F.stage === 'ding') {
      F.shake = 1 - F.t / 0.6;
      if (F.t >= 0.6) this.revealPot(st);
    } else if (F.stage === 'open') {
      F.doors = 1 - ease.outQuad(clamp(F.t / 0.22, 0, 1));
      F.glow = Math.max(0, 1 - F.t / 1.4);
      F.heat = Math.max(0, 1 - F.t / 1.6);
      if (F.t > 0.5 && !F.cheered) { F.cheered = true; a.playOnce('cheer', 0.7, 'idle'); }
      if (F.t >= 2.5) { F.stage = 'out'; F.t = 0; sfx('whoosh'); }
    } else if (F.stage === 'out') {
      F.kiln = 1 - ease.inQuad(clamp(F.t / 0.4, 0, 1));
      F.sink = 1 - ease.inOutQuad(clamp(F.t / 0.45, 0, 1));
      if (F.t >= 0.5) this.startPaint(st);
    }
  }

  revealPot(st) {
    const F = st.fire, pot = st.pot, a = st.actor, k = this.kilnK(st);
    F.stage = 'open'; F.t = 0; F.shake = 0;
    pot.fired = true;
    pot.clay = pick(CLAYS);
    const kx = st.L.base.x, fy = st.L.floorY;
    snd('pottery-reveal', 'magic'); sfx('bigpop', { vol: 0.6 });
    particles.burst(kx, fy - 300 * k, { type: 'smoke', count: 18, speed: [120, 360] });
    particles.burst(kx, fy - 300 * k, { type: 'star', count: 14, speed: [200, 480] });
    particles.burst(kx, fy - 300 * k, { type: 'sparkle', count: 12, colors: ['#fff', '#fff6a8', pot.clay.c] });
    particles.popText(kx, fy - 600 * k, pot.clay.name, mix(pot.clay.c, '#ff6fb1', 0.35), clamp(64 * k, 30, 64));
    a.playOnce('surprised', 0.5, 'idle'); a.emote('exclaim', 1);
    a.say(pick(['Ooh!', 'Wow!', 'Ta-da!']), 1.2, st.p.isAI ? null : 'gasp');
    st.p.ctrl.rumble?.(0.5, 160);
  }

  // --- step 3: painting --------------------------------------------------------------
  startPaint(st) {
    st.step = 'paint'; st.stepT = 0; st.fire = null; st.spin = PAINT_SPIN;
    st.cursor.x = 0; st.cursor.y = st.pot.h * 0.4;
    st.actor.setPose('idle');
    if (st.p.isAI) this.planPaint(st);
  }

  /** The placed dot or sticker under the cursor (front-facing only), or null. */
  itemAt(st) {
    const pot = st.pot, cur = st.cursor;
    let best = null, bd = Infinity;
    const test = (it, rad) => {
      if (it.held) return;
      const a = it.th + st.phi;
      if (Math.cos(a) < 0.3) return;
      const p = ringPoint(pot, it.u, a);
      const d = Math.hypot(p.x - cur.x, p.y - cur.y);
      if (d < rad && d < bd) { bd = d; best = it; }
    };
    for (const s of pot.stickers) test(s, s.s * 0.6 + 8);
    for (const d of pot.dots) test(d, d.s + 4);
    return best;
  }

  addHistory(st, kind, obj) { st.history.push({ kind, obj }); }
  removeObj(st, kind, obj) {
    const pot = st.pot;
    const arr = { layer: pot.layers, stripe: pot.stripes, stroke: pot.strokes, dot: pot.dots, sticker: pot.stickers }[kind];
    const i = arr.indexOf(obj);
    if (i >= 0) arr.splice(i, 1);
    st.history = st.history.filter((h) => h.obj !== obj);
  }
  undo(st) {
    const h = st.history.pop();
    if (!h) { sfx('blip'); return; }
    this.removeObj(st, h.kind, h.obj);
    sfx('back');
    const b = this.toScreen(st, 0, st.pot.h * 0.5);
    particles.burst(b.x, b.y, { type: 'bubble', count: 6, colors: ['#fff', '#bfe9ff'] });
  }
  removeItem(st, it) {
    const kind = st.pot.stickers.includes(it) ? 'sticker' : 'dot';
    const s = this.itemScreen(st, it);
    this.removeObj(st, kind, it);
    if (st.held === it) st.held = null;
    sfx('back');
    particles.burst(s.x, s.y, { type: 'smoke', count: 5, speed: [30, 110] });
    particles.burst(s.x, s.y, { type: 'sparkle', count: 4, colors: ['#fff'] });
  }
  itemScreen(st, it) {
    if (it.held) return this.toScreen(st, st.cursor.x, st.cursor.y);
    const p = ringPoint(st.pot, it.u, it.th + st.phi);
    return this.toScreen(st, p.x, p.y);
  }

  updatePaint(st, dt) {
    const c = st.p.ctrl, pot = st.pot, a = st.actor, cur = st.cursor, k = st.L.k;
    for (const Lr of pot.layers) if ((Lr.reveal ?? 1) < 1) Lr.reveal = Math.min(1, Lr.reveal + dt * 2.2);
    const tool = TOOLS[st.tool]?.id || 'done';
    // the turntable slows to a stop while you hold or aim at a sticker, and whirs faster while you paint rings
    const fast = c.held('x') && !st.held && (tool === 'brush' || tool === 'dots');
    const target = st.held || st.hover || st.confirm ? 0 : fast ? FAST_SPIN : PAINT_SPIN;
    st.spin = damp(st.spin, target, 6, dt);
    st.phi += st.spin * dt;
    const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    cur.x = clamp(cur.x + mx * CUR_SPEED * dt, -260, 260);
    cur.y = clamp(cur.y - my * CUR_SPEED * dt, -30, HMAX + 30);
    // LB / RB (d-pad up / down): the tools, the last one is Done (A there: ready) · Y (d-pad left / right):
    // the colour or sticker · X: paint · A: on to the next tool · B: take off / undo
    const NT = TOOLS.length + 1;
    const toolStep = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0) + (pad ? (c.pressed('down') ? 1 : 0) - (c.pressed('up') ? 1 : 0) : 0);
    if (toolStep && !st.held) { st.tool = (st.tool + toolStep + NT) % NT; st.listBump = 0.15; sfx('move'); st.stroke = null; return; }
    if (st.tool === DONE) {
      st.hover = null;
      if (c.pressed('a')) this.setReady(st, true);
      else if (c.pressed('b')) { st.tool = DONE - 1; st.listBump = 0.15; sfx('back'); }
      if (a.pose === 'paint') a.setPose('idle');
      return;
    }
    if (c.pressed('a') && !st.held && !st.p.isAI) { this.nextPaintTool(st); return; }
    if (c.pressed('x')) { st.usedX = true; st.hint = null; }
    const colStep = (c.pressed('y') ? 1 : 0) + (pad ? (c.pressed('right') ? 1 : 0) - (c.pressed('left') ? 1 : 0) : 0);
    if (colStep && !st.held) {
      if (TOOLS[st.tool].id === 'sticker') { st.sticker = (st.sticker + colStep + STICKERS.length) % STICKERS.length; sfx('stamp', { vol: 0.5 }); }
      else { st.color = (st.color + colStep + PAINTS.length) % PAINTS.length; sfx('collect', { step: st.color }); }
      st.listBump = 0.15; st.stroke = null;
    }
    const surf = surfaceAt(pot, cur.x, cur.y);
    // carrying a sticker or dot: it rides the cursor; X sticks it back on, B takes it off
    if (st.held) {
      st.hover = null;
      if (c.pressed('x')) {
        if (surf) {
          const it = st.held; it.held = false; it.th = surf.a - st.phi; it.u = surf.u; st.held = null;
          snd('pottery-sticker', 'stamp', { vol: 0.6 }); a.playOnce('action', 0.3, 'idle');
          const s = this.itemScreen(st, it);
          particles.burst(s.x, s.y, { type: 'sparkle', count: 6, colors: ['#fff', st.p.color] });
        } else sfx('error', { vol: 0.4 });
      } else if (c.pressed('b')) this.removeItem(st, st.held);
      return;
    }
    st.hover = st.p.isAI ? null : this.itemAt(st);
    if (c.pressed('b')) {
      if (st.hover) { this.removeItem(st, st.hover); st.hover = null; } else this.undo(st);
      return;
    }
    const grabby = tool === 'sticker' || tool === 'dots';
    if (st.hover && grabby && c.pressed('x')) {
      st.held = st.hover; st.held.held = true; st.hover = null;
      sfx('pop'); a.squash(0.1);
      return;
    }
    const col = PAINTS[st.color];
    if (tool === 'glaze' && c.pressed('x')) {
      const u0 = surf ? surf.u : clamp(cur.y / pot.h, 0, 0.92);
      const L = { u0: u0 < 0.04 ? 0 : u0, color: st.color, reveal: 0, seed: rand(TAU) };
      pot.layers.push(L); this.addHistory(st, 'layer', L);
      if (pot.layers.length > 8) { const old = pot.layers.shift(); st.history = st.history.filter((h) => h.obj !== old); }
      snd('pottery-glaze', 'splash', { vol: 0.55 });
      a.playOnce('action', 0.4, 'idle');
      const top = this.potTop(st);
      particles.burst(top.x, top.y, { type: 'drop', count: 12, colors: [col.c, '#ffffff'], speed: [120, 320] });
      if (col.shine) particles.burst(top.x, top.y + 40 * k, { type: 'sparkle', count: 10, colors: ['#fff6a8', '#fff'] });
      st.potBump = 0.25; this.cheer(st);
    } else if (tool === 'band' && c.pressed('x')) {
      const u = surf ? surf.u : cur.y / pot.h;
      if (u < -0.02 || u > 1.02) { sfx('blip'); return; }
      const sObj = { u: clamp(u, 0, 1), w: clamp(20 / pot.h, 0.03, 0.2), color: st.color };
      pot.stripes.push(sObj); this.addHistory(st, 'stripe', sObj);
      if (pot.stripes.length > 30) { const old = pot.stripes.shift(); st.history = st.history.filter((h) => h.obj !== old); }
      sfx('swap'); snd('pottery-swish', 'whoosh', { vol: 0.4 });
      a.playOnce('paint', 0.4, 'idle');
      const s = this.toScreen(st, 0, sObj.u * pot.h);
      particles.burst(s.x, s.y, { type: 'sparkle', count: 8, colors: [col.c, '#fff'] });
      this.cheer(st);
    } else if (tool === 'brush') {
      if (c.held('x') && surf) {
        const th = surf.a - st.phi;
        if (!st.stroke || st.stroke.pts.length >= MAX_STROKE_PTS * 2) {
          st.stroke = { color: st.color, w: 9, pts: [th, surf.u] };
          pot.strokes.push(st.stroke); this.addHistory(st, 'stroke', st.stroke);
          if (pot.strokes.length > 60) { const old = pot.strokes.shift(); st.history = st.history.filter((h) => h.obj !== old); }
        } else {
          const p = st.stroke.pts, n = p.length;
          if (Math.abs(th - p[n - 2]) > 0.035 || Math.abs(surf.u - p[n - 1]) > 0.006) p.push(th, surf.u);
        }
        st.sndT -= dt;
        if (st.sndT <= 0) { st.sndT = 0.16; sfx('brush', { vol: 0.3 }); }
        if (col.shine && chance(dt * 12)) { const s = this.toScreen(st, cur.x, cur.y); particles.trail(s.x, s.y, { type: 'sparkle', colors: ['#fff6a8', '#fff'] }); }
      } else st.stroke = null;
    } else if (tool === 'dots') {
      st.dotT -= dt;
      if (surf && (c.pressed('x') || (c.held('x') && st.dotT <= 0)) && pot.dots.length < MAX_DOTS) {
        st.dotT = 0.17;
        const d = { th: surf.a - st.phi, u: surf.u, c: col.rainbow ? pick(RAINBOW) : col.c, s: rand(7, 10) };
        pot.dots.push(d); this.addHistory(st, 'dot', d);
        snd('pottery-dab', 'pop', { vol: 0.35 });
        if (c.pressed('x')) a.playOnce('paint', 0.3, 'idle');
      } else if (c.pressed('x') && !surf) sfx('blip');
    } else if (tool === 'sticker' && c.pressed('x')) {
      if (!surf) { sfx('blip'); return; }
      if (pot.stickers.length >= MAX_STICKERS) { sfx('error', { vol: 0.4 }); return; }
      const s = { th: surf.a - st.phi, u: surf.u, kind: STICKERS[st.sticker], s: 44, rot: rand(-0.3, 0.3) };
      pot.stickers.push(s); this.addHistory(st, 'sticker', s);
      snd('pottery-sticker', 'stamp', { vol: 0.6 });
      a.playOnce('action', 0.3, 'idle');
      const sc = this.toScreen(st, cur.x, cur.y);
      particles.burst(sc.x, sc.y, { type: 'sparkle', count: 7, colors: ['#fff', '#fff6a8'] });
      if (pot.stickers.length % 3 === 1) this.cheer(st);
    }
    const painting = c.held('x') && (tool === 'brush' || tool === 'dots') && surf;
    if (painting) { if (a.pose !== 'paint' && !a._once) a.setPose('paint'); } else if (a.pose === 'paint') a.setPose('idle');
  }

  /** A on a paint tool: on to the next one (after Stickers: Done). Until X has been used, it says how. */
  nextPaintTool(st) {
    const id = TOOLS[st.tool].id;
    if (!st.usedX) {
      const how = { glaze: 'Press X to dip it!', band: 'Press X for a stripe!', sticker: 'Press X to stick one on!' }[id] || 'Hold X to paint!';
      st.hint = { text: how, t: 2.2 }; st.listBump = 0.15; sfx('blip');
      return;
    }
    st.tool = Math.min(DONE, st.tool + 1); st.listBump = 0.15; st.stroke = null; sfx('move');
  }

  setReady(st, on) {
    st.ready = on; st.readyT = 0;
    const a = st.actor;
    if (on) {
      st.step = 'ready'; st.held = null; st.hover = null; st.stroke = null;
      sfx('ready'); a.playOnce('ready', 0.6, 'idle'); a.squash(-0.25);
      const top = this.potTop(st);
      particles.burst(top.x, top.y, { type: 'confetti', count: 24, speed: [200, 480] });
      a.say('Done!', 1.2, st.p.isAI ? null : 'ready');
    } else { st.step = 'paint'; st.tool = DONE; sfx('back'); a.setPose('idle'); if (st.p.isAI) this.planPaint(st); }
  }

  // --- CPU potters ---------------------------------------------------------------------
  pace() { return this.cpuOnly ? 1 : this.stations.every((s) => s.p.isAI || s.ready) ? 0.5 : 1.5; }

  planShape(st) {
    const prof = aiProfile(st.p);
    const name = pick(PRESET_NAMES);
    const jitter = [0.12, 0.07, 0.04][clamp(st.p.aiLevel ?? 0, 0, 2)];
    st.ai = {
      mode: 'shape', name, target: presetProfile(name, st.pot.vol, jitter),
      passes: randInt(2, 3), pass: 0, dir: 1, u: 0.02, engaged: false,
      speed: rand(0.22, 0.3) * prof.speed, wait: rand(0.8, 1.8), surprise: chance(0.12), t: 0,
    };
  }

  updateAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai;
    if (!ai || st.ready) return;
    if (st.step === 'fire') {
      ai.mashT = (ai.mashT ?? 0.5) - dt;
      if (st.fire.stage === 'bake' && ai.mashT <= 0) { c.press('x'); ai.mashT = 1 / (aiProfile(st.p).mashRate * rand(0.6, 1.0)); }
      return;
    }
    if (st.confirm) { ai.wait = (ai.wait ?? 0) - dt; if (ai.wait <= 0) { c.press('a'); ai.wait = 0.5; } return; }
    if (ai.wait > 0) { ai.wait -= dt; c.move(0, 0); c.hold('x', false); return; }
    if (st.step === 'shape') this.aiShape(st, dt);
    else if (st.step === 'paint') this.aiPaint(st, dt);
  }

  aiShape(st, dt) {
    const c = st.p.ctrl, ai = st.ai, pot = st.pot, cur = st.cursor;
    if (st.morph) return;
    if (ai.surprise && !ai.didSurprise) { ai.didSurprise = true; c.press('y'); ai.wait = 1.3 * this.pace(); ai.pass = ai.passes; return; }
    if (ai.pass < ai.passes) {
      const u = clamp(ai.u, 0, 1);
      const R = radiusAt({ r: ai.target.r }, u);
      const tx = R - 6, ty = u * pot.h;
      const d = steer(st.p, cur.x, -cur.y, tx, -ty, { arrive: 45 });
      if (!ai.engaged) {
        c.hold('x', false);
        if (d < 22) { ai.engaged = true; }
        return;
      }
      c.hold('x', true);
      // the stick traces the plan; the clay eases toward it too, so CPU pots come out shapely
      const tg = ai.target, ease_ = 1 - Math.exp(-0.9 * dt);
      for (let i = 0; i < N; i++) pot.r[i] = lerp(pot.r[i], tg.r[i], ease_);
      pot.h = lerp(pot.h, tg.h, ease_);
      pot.vol = volumeOf(pot.r, pot.h);
      ai.u += ai.dir * ai.speed * dt / this.pace();
      if (ai.u > 0.97) { ai.dir = -1; ai.pass++; }
      else if (ai.u < 0.03) { ai.dir = 1; ai.pass++; }
      if (ai.pass >= ai.passes) { c.hold('x', false); c.move(0, 0); ai.wait = rand(0.4, 0.9) * this.pace(); }
      return;
    }
    c.hold('x', false); c.move(0, 0);
    const want = ai.target.handles || (chance(0.002) ? 1 : 0);
    if (pot.handles !== want && !ai.didSurprise) { c.press('rt'); ai.wait = rand(0.35, 0.7) * this.pace(); return; }
    c.press('rb'); ai.wait = rand(0.5, 0.9) * this.pace();
  }

  planPaint(st) {
    const pot = st.pot, tasks = [];
    const nc = PAINTS.length;
    const fav = randInt(0, nc - 2), fav2 = (fav + randInt(2, 6)) % (nc - 1);
    tasks.push({ tool: 'glaze', color: fav, y: -20, x: rand(-40, 40) });
    if (chance(0.55)) tasks.push({ tool: 'glaze', color: fav2, y: pot.h * rand(0.45, 0.75), x: rand(-30, 30) });
    if (chance(0.7)) for (let i = randInt(1, 3); i > 0; i--) tasks.push({ tool: 'band', color: chance(0.15) ? RAINBOW_I : randInt(0, nc - 2), u: rand(0.12, 0.92) });
    if (chance(0.5)) tasks.push({ tool: 'brush', color: chance(0.2) ? GOLD : randInt(0, nc - 1), u: rand(0.2, 0.85), hold: rand(2.4, 3.2), wave: chance(0.6) });
    if (chance(0.5)) tasks.push({ tool: 'dots', color: randInt(0, nc - 1), u: rand(0.2, 0.85), hold: rand(2.2, 2.9) });
    const nst = randInt(1, 4);
    const sk = randInt(0, STICKERS.length - 1);
    for (let i = 0; i < nst; i++) tasks.push({ tool: 'sticker', sticker: chance(0.6) ? sk : randInt(0, STICKERS.length - 1), u: rand(0.25, 0.8), xf: rand(-0.55, 0.55) });
    const level = st.p.aiLevel ?? 0;
    st.ai = { mode: 'paint', tasks: level === 0 ? tasks.slice(0, Math.max(3, tasks.length - 1)) : tasks, ti: 0, holdT: 0, wait: rand(0.6, 1.2) * this.pace() };
  }

  aiPaint(st, dt) {
    const c = st.p.ctrl, ai = st.ai, pot = st.pot, cur = st.cursor;
    const task = ai.tasks[ai.ti];
    if (!task) { c.hold('x', false); c.move(0, 0); c.press(st.tool === DONE ? 'a' : 'rb'); ai.wait = 0.5; return; }   // RB to Done, then A
    // pick the tool (RB / LB the short way round), then the colour / sticker (Y)
    if (TOOLS[st.tool]?.id !== task.tool) {
      const NT = TOOLS.length + 1, fwd = (TOOL[task.tool] - st.tool + NT) % NT;
      c.press(fwd <= NT / 2 ? 'rb' : 'lb'); ai.wait = rand(0.15, 0.3) * this.pace(); return;
    }
    if (task.tool === 'sticker' ? st.sticker !== task.sticker : st.color !== task.color) { c.press('y'); ai.wait = rand(0.1, 0.22) * this.pace(); return; }
    let tx, ty;
    if (task.y !== undefined) { tx = task.x; ty = task.y; }
    else {
      const R = radiusAt(pot, task.u);
      tx = (task.xf ?? rand(-0.08, 0.08)) * R; ty = task.u * pot.h - R * KY * 0.95;
      if (task.tx === undefined) task.tx = tx;
      tx = task.tx;
    }
    if (ai.holdT > 0) {
      ai.holdT -= dt;
      c.hold('x', true);
      c.move(0, task.wave ? Math.sin(this.t * 5) * 0.35 : 0);
      if (ai.holdT <= 0) { c.hold('x', false); c.move(0, 0); ai.ti++; ai.wait = rand(0.4, 0.9) * this.pace(); }
      return;
    }
    const d = steer(st.p, cur.x, -cur.y, tx, -ty, { arrive: 50 });
    if (d < 14) {
      c.move(0, 0);
      if (task.hold) { ai.holdT = task.hold; c.hold('x', true); }
      else { c.press('x'); ai.ti++; ai.wait = rand(0.35, 0.8) * this.pace() / aiProfile(st.p).speed; }
    }
  }

  // --- main update ------------------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.phase === 'make') this.updateMake(dt);
    else this.updateShow(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    if (this.phase === 'show') for (const st of this.stations) st.showActor?.update(dt);
  }

  updateMake(dt) {
    this.makeLeft = Math.max(0, this.makeLeft - dt);   // waits at 0 for the "Time's up!" question
    for (const st of this.stations) {
      st.stepT += dt; st.readyT += dt;
      st.nameBump = Math.max(0, st.nameBump - dt); st.potBump = Math.max(0, st.potBump - dt); st.listBump = Math.max(0, st.listBump - dt);
      st.cheerCD -= dt; st.helpT += dt;
      if (st.hint && ((st.hint.t -= dt) <= 0 || st.step === 'ready')) st.hint = null;
      if (st.p.isAI) this.updateAI(st, dt);
      st.actor.update(dt);
      if (st.step === 'shape') this.updateShape(st, dt);
      else if (st.step === 'fire') this.updateFire(st, dt);
      else if (st.step === 'paint') this.updatePaint(st, dt);
      else if (st.step === 'ready') {
        st.phi += dt * PAINT_SPIN;
        for (const Lr of st.pot.layers) if ((Lr.reveal ?? 1) < 1) Lr.reveal = Math.min(1, Lr.reveal + dt * 2.2);
        if (st.p.ctrl.pressed('b') && !st.p.isAI) this.setReady(st, false);
      }
    }
    const shaping = this.stations.some((s) => s.step === 'shape');
    if (shaping && !this.hum) this.hum = sfxLoop('pottery-wheel-hum', { vol: this.n > 4 ? 0.3 : 0.4 });
    else if (!shaping && this.hum) { this.hum.stop(); this.hum = null; }
    if (this.stations.every((s) => s.ready && s.readyT > 0.8)) this.startShow();
  }

  // --- finale: the gallery shelf ---------------------------------------------------------
  startShow() {
    if (this.phase === 'show') return;
    if (this.hum) { this.hum.stop(); this.hum = null; }
    this.phase = 'show'; this.phaseT = 0;
    const n = this.n;
    const rows = n <= 4 ? 1 : 2, perRow = Math.ceil(n / rows);
    const slotW = 1700 / perRow;
    this.show = { rows, perRow, shelves: rows === 1 ? [640] : [440, 770] };
    this.awards = this.assignAwards();
    this.stations.forEach((st, i) => {
      const pot = st.pot;
      st.ready = true; st.held = null; st.hover = null; st.confirm = null; st.stroke = null;
      if (!pot.fired) { pot.fired = true; pot.clay = pick(CLAYS); }
      for (const Lr of pot.layers) Lr.reveal = 1;
      for (const d of [...pot.dots, ...pot.stickers]) d.held = false;
      const row = rows === 1 ? 0 : i < perRow ? 0 : 1;
      const j = row === 0 ? i : i - perRow;
      const inRow = row === 0 ? Math.min(perRow, n) : n - perRow;
      const ox = (perRow - inRow) * slotW / 2;
      const w = 2 * maxRadius(pot) + pot.handles * 90;
      const ks = Math.min(rows === 1 ? 1.3 : 0.75, (slotW * 0.78) / Math.max(200, w), (rows === 1 ? 400 : 265) / (pot.h + 30));
      st.slot = { x: 110 + ox + (j + 0.5) * slotW, y: this.show.shelves[row], k: ks, row };
      st.award = this.awards[i];
      // the potter stands on the gallery floor
      const floor = rows === 1 ? 1010 : 1045;
      const ax = rows === 1 ? st.slot.x : 200 + ((i + 0.5) / n) * (W - 400);
      const a = new Actor(st.p, { x: ax, y: floor, facing: ax < W / 2 ? 1 : -1 });
      const tH = rows === 1 ? 230 : 175, maxW = (rows === 1 ? slotW : (W - 400) / n) * 0.85;
      a.scale = Math.min(tH / a.leader.h, maxW / Math.max(1, a.width / a.scale));
      a.snap();
      st.showActor = a; st.home = { x: ax, y: floor };
      st.popT = -1; st.spotT = -1;
    });
    const gap = n <= 4 ? 1.7 : 1.2;
    this.popAt = (i) => 0.6 + i * 0.22;
    this.spotStart = this.popAt(n) + 0.5;
    this.spotGap = gap;
    this.cheeseAt = this.spotStart + n * gap + 0.4;
    sfx('whoosh'); sfx('magic');
    snd('crowd-ooh', null, { vol: 0.4 });
  }

  assignAwards() {
    const S = this.stations;
    if (S.length === 1) return ['Masterpiece!'];
    const colours = (pot) => new Set([...pot.layers.map((l) => l.color), ...pot.stripes.map((s) => s.color), ...pot.strokes.map((s) => s.color), ...pot.dots.map((d) => d.c)]).size;
    const AW = [
      ['Tallest!', (p) => p.h],
      ['Widest!', (p) => maxRadius(p)],
      ['Most stickers!', (p) => p.stickers.length],
      ['Dottiest!', (p) => p.dots.length],
      ['Stripiest!', (p) => p.stripes.length + p.strokes.length * 0.5],
      ['Most colourful!', (p) => colours(p)],
      ['Handiest handles!', (p) => p.handles],
      ['Shiniest!', (p) => p.layers.filter((l) => l.color === GOLD).length + p.strokes.filter((l) => l.color === GOLD).length],
      ['Rainbow magic!', (p) => p.layers.concat(p.stripes, p.strokes).filter((l) => l.color === RAINBOW_I).length],
    ];
    const out = new Array(S.length).fill(null);
    const used = new Set();
    const cands = [];
    for (const [name, f] of AW) {
      const vals = S.map((s) => f(s.pot));
      const best = Math.max(...vals);
      if (best <= 0) continue;
      const tops = vals.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
      if (tops.length === 1) cands.push({ name, i: tops[0], score: rand(0.5, 1) });
    }
    cands.sort((a, b) => b.score - a.score);
    for (const c of cands) if (!out[c.i] && !used.has(c.name)) { out[c.i] = c.name; used.add(c.name); }
    const fb = shuffle(FALLBACK_AWARDS.slice());
    for (let i = 0; i < out.length; i++) if (!out[i]) out[i] = fb.pop() || 'Wonderful!';
    return out;
  }

  updateShow(dt) {
    const t = this.phaseT, n = this.n;
    for (let i = 0; i < n; i++) {
      const st = this.stations[i];
      const at = this.popAt(i);
      if (t >= at && t - dt < at) {
        st.popT = 0;
        snd('pottery-clink', 'pop', { vol: 0.6 });
        const s = st.slot;
        particles.burst(s.x, s.y - 40, { type: 'sparkle', count: 8, colors: ['#fff', st.p.color] });
      }
      if (st.popT >= 0) st.popT += dt;
      const sAt = this.spotStart + i * this.spotGap;
      if (t >= sAt && t - dt < sAt) {
        st.spotT = 0;
        const s = st.slot, a = st.showActor;
        sfx('star'); sfx('sparkle', { vol: 0.6 });
        snd('crowd-ooh', null, { vol: 0.35 });
        particles.burst(s.x, s.y - st.pot.h * s.k * 0.6, { type: 'star', count: 10, speed: [150, 380] });
        a.playOnce('cheer', 0.8, 'celebrate'); a.squash(-0.2);
        a.say(st.award, 1.4, null);
      }
      if (st.spotT >= 0) st.spotT += dt;
    }
    const ch = this.cheeseAt;
    if (t >= ch && !this.cheese) { this.cheese = true; sfx('giggle'); for (const st of this.stations) { st.showActor.setPose('wave'); st.hop = { h: 0, v: 0 }; st.poseCD = 0; } }
    if (this.cheese && !this.photoTaken) for (const st of this.stations) this.cheeseMove(st, dt);
    const shot = ch + CHEESE_TIME;
    for (const d of [3, 2, 1]) if (t >= shot - d && t - dt < shot - d) sfx(d === 1 ? 'tock' : 'tick');
    if (t >= shot && !this.photoTaken) {
      this.photoTaken = true;
      fx.flash('#ffffff', 0.45);
      if (hasSound('camera-flash')) sfx('camera-flash', { vol: 0.7 }); else sfx('shutter');
      sfx('fanfare'); snd('applause', 'cheer');
      particles.confettiRain(W, 140);
      this.stations.forEach((st, i) => { st.hop = null; st.showActor.y = st.home.y; st.showActor.playOnce(i % 2 ? 'photo' : 'strike3', 1.0, 'celebrate'); });
    }
    if (this.photoTaken && t > shot + 2.4) this.finishGame();
    for (const st of this.stations) st.showActor.update(dt);
  }

  cheeseMove(st, dt) {
    const a = st.showActor, c = st.p.ctrl, hop = st.hop, base = st.home;
    st.poseCD = Math.max(0, st.poseCD - dt);
    let mx = photoMove(c).x, jump = c.pressed('a'), pose = photoPosePressed(c);
    if (st.p.isAI) {
      st.aiT = (st.aiT ?? rand(0.2, 0.8)) - dt;
      if (st.aiT <= 0) { st.aiT = rand(0.5, 1.3); st.aiMx = chance(0.35) ? rand(-0.7, 0.7) : 0; if (chance(0.3)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      mx = st.aiMx || 0;
      if (Math.abs(a.x - base.x) > 90) mx = Math.sign(base.x - a.x) * 0.6;
    }
    a.x = clamp(a.x + mx * 520 * dt, 140, W - 140);
    if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1;
    if (jump && hop.h <= 0) { hop.v = 950; sfx('boing', { vol: 0.35 }); a.squash(-0.25); }
    hop.v -= 2800 * dt; hop.h = Math.max(0, hop.h + hop.v * dt);
    if (hop.h <= 0 && hop.v < 0) { if (hop.v < -200) a.squash(0.2); hop.v = 0; }
    a.y = base.y - hop.h * a.scale;
    if (pose && st.poseCD <= 0) { st.poseCD = 0.35; strikePhotoPose(a, pose, { onBump: (who) => this.bumpNeighbours(st, who) }); }
    if (!a._once) a.setPose(hop.h > 0 ? 'jump' : Math.abs(mx) > 0.2 ? 'walk' : 'idle');
  }

  bumpNeighbours(st, a) {
    for (const o of this.stations) {
      if (o === st || !o.hop) continue;
      const b = o.showActor, dx = b.x - a.x;
      if (Math.abs(dx) < (a.width + b.width) * 0.45) { b.x = clamp(b.x + Math.sign(dx || 1) * 70, 140, W - 140); b.playOnce('surprised', 0.8, 'idle'); b.squash(0.2); o.hop.v = Math.max(o.hop.v, 300); }
    }
    sfx('boing', { vol: 0.4 });
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    // 5+ podiums are narrow: the award alone keeps the labels apart
    const stats = this.stations.map((st) => (this.n > 4 ? st.award || 'Lovely!' : `${potName(st.pot)} · ${st.award || 'Lovely!'}`));
    this.api.finishTogether({ stats, title: 'Masterpieces!' });
  }

  onDone() {
    if (this.phase === 'make') {
      for (const st of this.stations) {
        st.confirm = null; st.morph = null; st.ask = null;
        if (!st.pot.fired) { st.pot.fired = true; st.pot.clay = pick(CLAYS); }
        if (!st.ready) { st.ready = true; st.step = 'ready'; }
      }
      this.startShow();
      return;
    }
    if (!this.photoTaken) this.phaseT = Math.max(this.phaseT, this.cheeseAt + CHEESE_TIME - 0.5);
    else this.finishGame();
  }

  destroy() { if (this.hum) { this.hum.stop(); this.hum = null; } }
}

