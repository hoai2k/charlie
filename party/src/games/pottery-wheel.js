// Pottery Wheel (Play Studio). Every player gets a potter's wheel at a
// split-screen station:
//   1. Shape: hold A to press the shaping stick into the spinning clay. The
//      clay keeps its volume, so squeezing it in makes it grow taller, and
//      grabbing the rim pulls it up (or squashes it down). B smooths, X adds
//      handles, Y morphs into a surprise shape. The pot names itself live.
//   2. Fire: the kiln pops up around the pot; mash A to puff the bellows,
//      then the doors burst open and the clay colour is revealed.
//   3. Paint: the pot turns slowly. Glaze dips, stripes, a brush (hold A and
//      the wheel paints a ring), dots and stickers, all wrapped on the 3D pot.
// Finale: every pot goes up on the gallery shelf, gets a ribbon, and
// everyone poses for a photo.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait, POSES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, sfxLoop, hasSound } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { playerName } from '../state.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  NAVY, KY, N, WET, CLAYS, PAINTS, GOLD, RAINBOW_I, STICKERS, PRESETS, PRESET_NAMES, HMAX,
  newPot, volumeOf, radiusAt, maxRadius, presetProfile, shapeClay, smooth, potName,
  ringPoint, surfaceAt, drawPot, drawSticker, mix,
} from './pottery-wheel/pot.js';

export const meta = {
  id: 'pottery-wheel',
  title: 'Pottery Wheel',
  category: 'studio',
  type: 'Shape, bake & paint · Everyone wins',
  goal: 'Shape a spinning lump of clay into a vase, bowl or cup, bake it in the kiln, then paint it!',
  controls: [
    ['stick', 'Move your tool'],
    ['a', 'Hold to shape the clay, or paint'],
    ['b', 'Smooth the clay / take paint off'],
    ['x', 'Handles / next paint tool'],
    ['y', 'Surprise shape / next colour'],
    ['rb', 'Next step: bake it, then Done!'],
  ],
  infoAt: 'tl',   // the bottom-left of each station holds its player tag and hints
  tips: [
    'Squeeze the clay in and it grows taller! Grab the top edge to pull it up.',
    'Mash A at the kiln to puff the fire hotter.',
    'Hold A with the brush or dots and the wheel paints all the way round!',
  ],
  music: 'chill',
  duration: 'about 3 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  drawIcon,
};

const TOOLS = [
  { id: 'glaze', name: 'Glaze dip', verb: 'Dip!' },
  { id: 'band', name: 'Stripe', verb: 'Stripe!' },
  { id: 'brush', name: 'Brush', verb: 'Paint' },
  { id: 'dots', name: 'Dots', verb: 'Dot!' },
  { id: 'sticker', name: 'Stickers', verb: 'Stick!' },
];
const TOOL = Object.fromEntries(TOOLS.map((t, i) => [t.id, i]));
const STEPS = [['shape', 'Shape'], ['fire', 'Bake'], ['paint', 'Paint']];
const SHAPE_SPIN = 9, PAINT_SPIN = 0.9, FAST_SPIN = 2.6;
const CUR_SPEED = 430;
const MAX_STROKE_PTS = 900, MAX_DOTS = 160, MAX_STICKERS = 40;
const CHEESE_TIME = 4.5;
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
    base: { x: ca.x + ca.w * 0.6, y: floorY - 140 * k },
    list: { x: r.x + r.w - listW - 10, y: r.y + tabH + 10, w: listW, h: r.h - tabH - hintH - 22 },
    charFoot: { x: ca.x + ca.w * 0.15, y: floorY + 2 },
    charH: ca.h * 0.46, charW: ca.w * 0.26,
  };
}

export class Game {
  constructor(api) {
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
      confirm: null, ready: false, readyT: 0, fire: null,
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
    const mx = c.x, my = c.y;
    cur.x = clamp(cur.x + mx * CUR_SPEED * dt, -260, 260);
    cur.y = clamp(cur.y - my * CUR_SPEED * dt, -20, HMAX + 40);
    if (c.pressed('rb')) { st.confirm = { t: 0 }; sfx('select'); a.setPose('idle'); return; }
    if (c.pressed('x')) {
      pot.handles = (pot.handles + 1) % 3;
      sfx(pot.handles ? 'pop' : 'back');
      const s = this.toScreen(st, maxRadius(pot) + 30, pot.h * 0.5);
      particles.burst(s.x, s.y, { type: 'sparkle', count: 8, colors: ['#fff', st.p.color] });
      st.potBump = 0.25; this.cheer(st);
    }
    if (c.pressed('y')) { this.surpriseShape(st); return; }
    const tx = Math.abs(cur.x), ty = cur.y;
    st.shaping = false; st.sponging = false;
    if (c.held('a')) {
      const work = shapeClay(pot, tx, ty, dt, { pressed: c.pressed('a') });
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
      if (c.pressed('a')) {
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
    const tool = TOOLS[st.tool].id;
    // the turntable slows to a stop while you hold or aim at a sticker, and whirs faster while you paint rings
    const fast = c.held('a') && !st.held && (tool === 'brush' || tool === 'dots');
    const target = st.held || st.hover || st.confirm ? 0 : fast ? FAST_SPIN : PAINT_SPIN;
    st.spin = damp(st.spin, target, 6, dt);
    st.phi += st.spin * dt;
    if (st.confirm) { this.updateConfirm(st, dt); return; }
    const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    cur.x = clamp(cur.x + mx * CUR_SPEED * dt, -260, 260);
    cur.y = clamp(cur.y - my * CUR_SPEED * dt, -30, HMAX + 30);
    if (c.pressed('rb')) { st.confirm = { t: 0 }; sfx('select'); st.stroke = null; a.setPose('idle'); return; }
    const toolStep = (c.pressed('x') ? 1 : 0) + (pad ? (c.pressed('down') ? 1 : 0) - (c.pressed('up') ? 1 : 0) : 0);
    if (toolStep && !st.held) { st.tool = (st.tool + toolStep + TOOLS.length) % TOOLS.length; st.listBump = 0.15; sfx('move'); st.stroke = null; }
    const colStep = (c.pressed('y') ? 1 : 0) + (pad ? (c.pressed('right') ? 1 : 0) - (c.pressed('left') ? 1 : 0) : 0);
    if (colStep && !st.held) {
      if (TOOLS[st.tool].id === 'sticker') { st.sticker = (st.sticker + colStep + STICKERS.length) % STICKERS.length; sfx('stamp', { vol: 0.5 }); }
      else { st.color = (st.color + colStep + PAINTS.length) % PAINTS.length; sfx('collect', { step: st.color }); }
      st.listBump = 0.15; st.stroke = null;
    }
    const surf = surfaceAt(pot, cur.x, cur.y);
    // carrying a sticker or dot: it rides the cursor; A sticks it back on, B takes it off
    if (st.held) {
      st.hover = null;
      if (c.pressed('a')) {
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
    if (st.hover && grabby && c.pressed('a')) {
      st.held = st.hover; st.held.held = true; st.hover = null;
      sfx('pop'); a.squash(0.1);
      return;
    }
    const col = PAINTS[st.color];
    if (tool === 'glaze' && c.pressed('a')) {
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
    } else if (tool === 'band' && c.pressed('a')) {
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
      if (c.held('a') && surf) {
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
      if (surf && (c.pressed('a') || (c.held('a') && st.dotT <= 0)) && pot.dots.length < MAX_DOTS) {
        st.dotT = 0.17;
        const d = { th: surf.a - st.phi, u: surf.u, c: col.rainbow ? pick(RAINBOW) : col.c, s: rand(7, 10) };
        pot.dots.push(d); this.addHistory(st, 'dot', d);
        snd('pottery-dab', 'pop', { vol: 0.35 });
        if (c.pressed('a')) a.playOnce('paint', 0.3, 'idle');
      } else if (c.pressed('a') && !surf) sfx('blip');
    } else if (tool === 'sticker' && c.pressed('a')) {
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
    const painting = c.held('a') && (tool === 'brush' || tool === 'dots') && surf;
    if (painting) { if (a.pose !== 'paint' && !a._once) a.setPose('paint'); } else if (a.pose === 'paint') a.setPose('idle');
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
    } else { st.step = 'paint'; sfx('back'); a.setPose('idle'); if (st.p.isAI) this.planPaint(st); }
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
      if (st.fire.stage === 'bake' && ai.mashT <= 0) { c.press('a'); ai.mashT = 1 / (aiProfile(st.p).mashRate * rand(0.6, 1.0)); }
      return;
    }
    if (st.confirm) { ai.wait = (ai.wait ?? 0) - dt; if (ai.wait <= 0) { c.press('a'); ai.wait = 0.5; } return; }
    if (ai.wait > 0) { ai.wait -= dt; c.move(0, 0); c.hold('a', false); return; }
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
        c.hold('a', false);
        if (d < 22) { ai.engaged = true; }
        return;
      }
      c.hold('a', true);
      // the stick traces the plan; the clay eases toward it too, so CPU pots come out shapely
      const tg = ai.target, ease_ = 1 - Math.exp(-0.9 * dt);
      for (let i = 0; i < N; i++) pot.r[i] = lerp(pot.r[i], tg.r[i], ease_);
      pot.h = lerp(pot.h, tg.h, ease_);
      pot.vol = volumeOf(pot.r, pot.h);
      ai.u += ai.dir * ai.speed * dt / this.pace();
      if (ai.u > 0.97) { ai.dir = -1; ai.pass++; }
      else if (ai.u < 0.03) { ai.dir = 1; ai.pass++; }
      if (ai.pass >= ai.passes) { c.hold('a', false); c.move(0, 0); ai.wait = rand(0.4, 0.9) * this.pace(); }
      return;
    }
    c.hold('a', false); c.move(0, 0);
    const want = ai.target.handles || (chance(0.002) ? 1 : 0);
    if (pot.handles !== want && !ai.didSurprise) { c.press('x'); ai.wait = rand(0.35, 0.7) * this.pace(); return; }
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
    if (!task) { c.hold('a', false); c.move(0, 0); c.press('rb'); ai.wait = 0.6; return; }
    // pick the tool, then the colour / sticker
    if (TOOLS[st.tool].id !== task.tool) { c.press('x'); ai.wait = rand(0.15, 0.3) * this.pace(); return; }
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
      c.hold('a', true);
      c.move(0, task.wave ? Math.sin(this.t * 5) * 0.35 : 0);
      if (ai.holdT <= 0) { c.hold('a', false); c.move(0, 0); ai.ti++; ai.wait = rand(0.4, 0.9) * this.pace(); }
      return;
    }
    const d = steer(st.p, cur.x, -cur.y, tx, -ty, { arrive: 50 });
    if (d < 14) {
      c.move(0, 0);
      if (task.hold) { ai.holdT = task.hold; c.hold('a', true); }
      else { c.press('a'); ai.ti++; ai.wait = rand(0.35, 0.8) * this.pace() / aiProfile(st.p).speed; }
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
    for (const st of this.stations) {
      st.stepT += dt; st.readyT += dt;
      st.nameBump = Math.max(0, st.nameBump - dt); st.potBump = Math.max(0, st.potBump - dt); st.listBump = Math.max(0, st.listBump - dt);
      st.cheerCD -= dt; st.helpT += dt;
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
    else if (this.phaseT > 420) this.onDone();   // backstop: a very long session ends in the show
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
    const stats = this.stations.map((st) => `${potName(st.pot)} · ${st.award || 'Lovely!'}`);
    this.api.finish({ showcase: true, highlight: null, stats, title: 'Masterpieces!' });
  }

  onDone() {
    if (this.phase === 'make') {
      for (const st of this.stations) {
        st.confirm = null; st.morph = null;
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

  // ======================================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'show') { this.drawShow(g); return; }
    this.drawStudioBack(g);
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawStudioBack(g) {
    const bg = art('bg/pottery-wheel');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#fbe9d7'); gr.addColorStop(1, '#f3d2b8');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // whitewashed bricks
      g.strokeStyle = 'rgba(190,140,110,0.25)'; g.lineWidth = 3;
      for (let y = 0, row = 0; y < H; y += 44, row++) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
        for (let x = (row % 2) * 60; x < W; x += 120) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 44); g.stroke(); }
      }
    }
    // title
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -330, -40, 660, 80, { r: 40, fill: '#e98a5c' });
    ui.text(g, 'Pottery Wheel', 0, 2, { size: 52, weight: 800 });
    g.restore();
    this.drawMiniPot(g, W / 2 - 390, 66, 0.9, '#4fb8ff');
    this.drawMiniPot(g, W / 2 + 390, 66, 0.9, '#ff7ac6');
  }

  drawMiniPot(g, x, y, s, c) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
    g.fillStyle = c;
    g.beginPath(); g.moveTo(-12, -34); g.quadraticCurveTo(-34, 0, -18, 26); g.lineTo(18, 26); g.quadraticCurveTo(34, 0, 12, -34); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(-28, -2, 56, 8); g.strokeRect(-28, -2, 56, 0);
    g.beginPath(); g.ellipse(0, -34, 14, 5, 0, 0, TAU); g.fillStyle = mix(c, NAVY, 0.4); g.fill(); g.stroke();
    g.restore();
  }

  drawStation(g, st) {
    const { r, L, p } = st, k = L.k;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26); g.clip();
    const bg = art('bg/pottery-wheel-station');
    if (bg) g.drawImage(bg, r.x, r.y, r.w, r.h);
    else this.drawStationWall(g, st);
    this.drawFloor(g, st);
    const pot = st.pot, b = L.base;
    if (st.step === 'fire') this.drawKilnScene(g, st);
    else {
      this.drawWheel(g, b.x, L.floorY, k, st.phi, st.step === 'shape' ? 1 : 0.4);
      st.actor.draw(g, { ring: p.color });
      if (st.step !== 'shape' && !st.ready && TOOLS[st.tool].id === 'glaze') this.drawGlazeGuide(g, st, true);
      const bump = st.potBump;
      const sx = 1 + Math.sin(bump * 30) * bump * 0.25;
      g.save(); g.translate(b.x, b.y); g.scale(sx, 2 - sx); g.translate(-b.x, -b.y);
      drawPot(g, pot, { x: b.x, y: b.y, k, phi: st.phi, wet: !pot.fired, t: this.t, still: st.step === 'shape' });
      g.restore();
      if (st.step === 'paint' && !st.ready) {
        if (TOOLS[st.tool].id === 'glaze') this.drawGlazeGuide(g, st, false);
        if (TOOLS[st.tool].id === 'band') this.drawBandGuide(g, st);
        if (st.hover) this.drawHover(g, st);
      }
    }
    if (st.step === 'fire') { /* actor drawn inside the kiln scene */ }
    if (st.step === 'shape' && !st.morph && !st.confirm) this.drawShapeCursor(g, st);
    if (st.step === 'paint' && !st.confirm) this.drawPaintCursor(g, st);
    g.restore();
    g.save(); ui.roundRect(g, r.x, r.y, r.w, r.h, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke(); g.restore();
    this.drawSteps(g, st);
    this.drawSide(g, st);
    this.drawStationHints(g, st);
    if (st.confirm) this.drawConfirm(g, st);
    if (st.ready) this.drawReady(g, st);
    if (st.step === 'shape' && !st.p.isAI && st.shapeT < 1.5 && st.helpT > 1) this.drawHelp(g, st);
  }

  drawStationWall(g, st) {
    const { r, L, p } = st;
    g.fillStyle = mix(p.color, '#fff8ef', 0.84); g.fillRect(r.x, r.y, r.w, r.h);
    // tile strip
    const ty = L.floorY - L.ca.h * 0.36;
    g.fillStyle = mix(p.color, '#ffffff', 0.62); g.fillRect(r.x, ty, r.w, L.floorY - ty);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3;
    const tile = clamp(L.ca.h * 0.07, 22, 52);
    for (let x = r.x; x < r.x + r.w; x += tile) { g.beginPath(); g.moveTo(x, ty); g.lineTo(x, L.floorY); g.stroke(); }
    for (let y = ty; y < L.floorY; y += tile) { g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke(); }
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(r.x, ty); g.lineTo(r.x + r.w, ty); g.stroke();
    // a little shelf with tiny pots, high on the left
    const k = L.k;
    const sx = L.ca.x + 24, sy = L.ca.y + L.ca.h * 0.2, sw = Math.min(L.ca.w * 0.32, 300 * k + 60);
    g.fillStyle = '#d99a6c'; ui.roundRect(g, sx, sy, sw, 12 * k + 6, 4); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    const cols = ['#ff9fd0', '#7fd3ff', '#ffd23f'];
    for (let i = 0; i < 3; i++) {
      const x = sx + sw * (0.2 + i * 0.3), s = clamp(k * 0.8, 0.35, 1.1);
      g.save(); g.translate(x, sy); g.scale(s, s);
      g.fillStyle = cols[(i + st.i) % 3]; g.lineWidth = 3; g.strokeStyle = NAVY;
      g.beginPath();
      if (i === 0) { g.moveTo(-10, -44); g.quadraticCurveTo(-30, -20, -14, 0); g.lineTo(14, 0); g.quadraticCurveTo(30, -20, 10, -44); }
      else if (i === 1) { g.moveTo(-26, -24); g.quadraticCurveTo(-22, 0, 0, 0); g.quadraticCurveTo(22, 0, 26, -24); }
      else { g.moveTo(-14, -34); g.lineTo(-16, 0); g.lineTo(16, 0); g.lineTo(14, -34); }
      g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    // pegboard of clay tools (upper right of the work area)
    const px = L.ca.x + L.ca.w * 0.72, py = L.ca.y + 14, pw = L.ca.w * 0.25, ph = L.ca.h * 0.2;
    if (pw > 60) {
      g.fillStyle = '#f1d6a8'; ui.roundRect(g, px, py, pw, ph, 8); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      g.fillStyle = 'rgba(36,22,63,0.2)';
      for (let x = px + 12; x < px + pw - 6; x += 18) for (let y = py + 12; y < py + ph - 6; y += 18) { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
      const u = ph / 100;
      g.lineWidth = 3; g.strokeStyle = NAVY;
      g.fillStyle = '#e8b878'; ui.roundRect(g, px + pw * 0.15, py + 20 * u, 12 * u, 60 * u, 6 * u); g.fill(); g.stroke();
      g.fillStyle = '#ffd23f'; ui.roundRect(g, px + pw * 0.38, py + 30 * u, 34 * u, 26 * u, 8 * u); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(px + pw * 0.72, py + 18 * u); g.lineTo(px + pw * 0.72, py + 82 * u); g.moveTo(px + pw * 0.86, py + 18 * u); g.lineTo(px + pw * 0.86, py + 82 * u); g.stroke();
      g.beginPath(); g.moveTo(px + pw * 0.72, py + 50 * u); g.quadraticCurveTo(px + pw * 0.79, py + 60 * u, px + pw * 0.86, py + 50 * u); g.strokeStyle = '#9aa0b8'; g.stroke();
    }
  }

  drawFloor(g, st) {
    const { r, L } = st;
    const fy = L.floorY - 24 * L.k;
    g.fillStyle = '#e2a874'; g.fillRect(r.x, fy, r.w, r.y + r.h - fy);
    g.strokeStyle = 'rgba(120,70,40,0.25)'; g.lineWidth = 2;
    const ph = clamp(26 * L.k, 12, 30);
    for (let y = fy + ph, row = 0; y < r.y + r.h; y += ph, row++) {
      g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke();
      for (let x = r.x + (row % 2) * 70; x < r.x + r.w; x += 140) { g.beginPath(); g.moveTo(x, y - ph); g.lineTo(x, y); g.stroke(); }
    }
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(r.x, fy); g.lineTo(r.x + r.w, fy); g.stroke();
  }

  /** The potter's wheel, feet on the floor at fy; its head is centred 140 units up. */
  drawWheel(g, x, fy, k, phi, spin) {
    if (drawArt(g, 'prop/pottery-wheel', x, fy, 520 * k, 260 * k, { anchor: 'bottom' })) { this.drawWheelStreaks(g, x, fy - 140 * k, k, phi, spin); return; }
    const hy = fy - 140 * k;
    g.save(); g.lineJoin = 'round'; g.lineWidth = Math.max(2.5, 4 * k); g.strokeStyle = NAVY;
    // pedal and cord
    g.fillStyle = '#b8bfd8'; ui.roundRect(g, x + 200 * k, fy - 22 * k, 60 * k, 20 * k, 6 * k); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x + 150 * k, fy - 40 * k); g.quadraticCurveTo(x + 190 * k, fy - 4 * k, x + 205 * k, fy - 14 * k); g.stroke();
    // body
    g.fillStyle = '#7fdcc0';
    g.beginPath(); g.moveTo(x - 120 * k, hy + 26 * k); g.lineTo(x + 120 * k, hy + 26 * k); g.lineTo(x + 150 * k, fy - 10 * k); g.quadraticCurveTo(x, fy + 4 * k, x - 150 * k, fy - 10 * k); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, x - 100 * k, hy + 40 * k, 30 * k, 70 * k, 12 * k); g.fill();
    // splash pan
    g.fillStyle = '#5cc4a6'; g.beginPath(); g.ellipse(x, hy + 22 * k, 232 * k, 54 * k, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#3f9e86'; g.beginPath(); g.ellipse(x, hy + 14 * k, 210 * k, 44 * k, 0, 0, TAU); g.fill();
    // head
    g.fillStyle = '#8f9cc4'; g.beginPath(); g.ellipse(x, hy + 10 * k, 190 * k, 42 * k, 0, 0, Math.PI); g.lineTo(x - 190 * k, hy); g.fill(); g.stroke();
    g.fillStyle = '#b7c2e6'; g.beginPath(); g.ellipse(x, hy, 190 * k, 42 * k, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
    this.drawWheelStreaks(g, x, hy, k, phi, spin);
  }

  drawWheelStreaks(g, x, hy, k, phi, spin) {
    g.save(); g.lineCap = 'round';
    g.strokeStyle = `rgba(255,255,255,${0.35 + 0.25 * spin})`; g.lineWidth = Math.max(2, 4 * k);
    for (let i = 0; i < 4; i++) {
      const a0 = phi * (spin > 0.5 ? 1 : 1.5) + (i * TAU) / 4;
      g.beginPath(); g.ellipse(x, hy, 160 * k, 34 * k, 0, a0, a0 + 0.4 + spin * 0.6); g.stroke();
    }
    g.restore();
  }

  // --- the kiln -----------------------------------------------------------------------
  drawKilnScene(g, st) {
    const F = st.fire, L = st.L, pot = st.pot;
    const k = this.kilnK(st);
    const kx = L.base.x, fy = L.floorY;
    const s = k * F.kiln;
    const wob = F.stage === 'ding' ? Math.sin(this.t * 60) * 6 * k * F.shake : 0;
    st.actor.draw(g, { ring: st.p.color });
    // the wheel steps back while the kiln is up
    if (F.kiln < 0.98) { g.save(); g.globalAlpha = 1 - F.kiln; this.drawWheel(g, kx, fy, L.k, st.phi, 0); g.restore(); }
    // pot placement: from the wheel head down onto the kiln floor, shrunk to fit the door
    const fit = Math.min(1, 440 / (2 * maxRadius(pot) + pot.handles * 90), 400 / (pot.h + 20));
    const pk = lerp(L.k, k * fit, F.sink);
    const py = lerp(L.base.y, fy - 80 * k, F.sink);
    const glow = F.stage === 'open' ? F.glow : F.stage === 'out' ? 0 : F.heat * 0.6;
    if (F.kiln > 0.02) {
      g.save(); g.translate(kx + wob, fy); g.scale(F.kiln, F.kiln); g.translate(-kx, -fy);
      this.drawKilnBack(g, kx, fy, k, F);
      g.restore();
    }
    const hot = F.stage === 'open' ? clamp(F.glow, 0, 1) : 0;
    drawPot(g, pot, { x: kx + wob, y: py, k: pk, phi: st.phi, wet: !pot.fired, t: this.t, glow: pot.fired ? hot : F.stage === 'bake' || F.stage === 'ding' ? glow * 0.5 : 0, still: true });
    if (F.kiln > 0.02) {
      g.save(); g.translate(kx + wob, fy); g.scale(F.kiln, F.kiln); g.translate(-kx, -fy);
      this.drawKilnFront(g, kx, fy, k, F);
      g.restore();
    }
    void s;
  }

  /** The kiln (with its chimney) must fit under the step strip. */
  kilnK(st) { return Math.min(st.L.k, (st.L.floorY - st.L.ca.y + 4) / 690); }

  archPath(g, x, fy, k) {
    g.beginPath();
    g.moveTo(x - 240 * k, fy - 80 * k);
    g.lineTo(x - 240 * k, fy - 268 * k);
    g.arc(x, fy - 268 * k, 240 * k, Math.PI, 0);
    g.lineTo(x + 240 * k, fy - 80 * k);
    g.closePath();
  }

  drawKilnBack(g, x, fy, k, F) {
    this.archPath(g, x, fy, k);
    const gr = g.createRadialGradient(x, fy - 160 * k, 20 * k, x, fy - 260 * k, 320 * k);
    const h = clamp(F.heat, 0, 1);
    gr.addColorStop(0, mix('#5a2a3a', '#ffb347', h)); gr.addColorStop(1, mix('#2a1530', '#c8452a', h));
    g.fillStyle = gr; g.fill();
    // inner floor shelf
    g.fillStyle = mix('#6b4a5a', '#ff9a52', h * 0.6);
    g.fillRect(x - 240 * k, fy - 96 * k, 480 * k, 16 * k);
  }

  drawKilnFront(g, x, fy, k, F) {
    const h = clamp(F.heat, 0, 1);
    // warm glow around the kiln
    if (h > 0.05) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gl = g.createRadialGradient(x, fy - 280 * k, 50 * k, x, fy - 280 * k, 420 * k);
      gl.addColorStop(0, `rgba(255,150,60,${0.35 * h})`); gl.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = gl; g.fillRect(x - 450 * k, fy - 720 * k, 900 * k, 760 * k); g.restore();
    }
    const doorsDrawn = () => this.drawKilnDoors(g, x, fy, k, F, h);
    if (drawArt(g, 'prop/pottery-kiln', x, fy, 640 * k, 620 * k, { anchor: 'bottom' })) { doorsDrawn(); this.drawFlames(g, x, fy, k, F, h); return; }
    g.save(); g.lineJoin = 'round';
    // chimney
    g.fillStyle = '#b84c37'; g.lineWidth = Math.max(2.5, 4 * k); g.strokeStyle = NAVY;
    ui.roundRect(g, x + 150 * k, fy - 660 * k, 64 * k, 130 * k, 6 * k); g.fill(); g.stroke();
    g.fillStyle = '#8c3a2c'; ui.roundRect(g, x + 142 * k, fy - 672 * k, 80 * k, 22 * k, 6 * k); g.fill(); g.stroke();
    // dome with the door hole (even-odd)
    g.beginPath();
    g.moveTo(x - 310 * k, fy - 30 * k); g.lineTo(x - 310 * k, fy - 300 * k);
    g.arc(x, fy - 300 * k, 310 * k, Math.PI, 0); g.lineTo(x + 310 * k, fy - 30 * k); g.closePath();
    g.moveTo(x - 240 * k, fy - 80 * k); g.lineTo(x + 240 * k, fy - 80 * k); g.lineTo(x + 240 * k, fy - 268 * k);
    g.arc(x, fy - 268 * k, 240 * k, 0, Math.PI, true); g.closePath();
    const br = g.createLinearGradient(x - 310 * k, 0, x + 310 * k, 0);
    br.addColorStop(0, '#c4553c'); br.addColorStop(0.4, '#ec7a54'); br.addColorStop(1, '#b44a34');
    g.fillStyle = br; g.fill('evenodd');
    // bricks
    g.save(); g.clip('evenodd');
    g.strokeStyle = 'rgba(110,40,30,0.45)'; g.lineWidth = Math.max(1.5, 3 * k);
    const bh = 40 * k;
    for (let y = fy - 30 * k, row = 0; y > fy - 620 * k; y -= bh, row++) {
      g.beginPath(); g.moveTo(x - 320 * k, y); g.lineTo(x + 320 * k, y); g.stroke();
      for (let xx = x - 320 * k + (row % 2) * 40 * k; xx < x + 320 * k; xx += 80 * k) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y - bh); g.stroke(); }
    }
    if (h > 0.05) { g.fillStyle = `rgba(255,170,80,${0.3 * h})`; g.fillRect(x - 320 * k, fy - 640 * k, 640 * k, 640 * k); }
    g.restore();
    g.lineWidth = Math.max(2.5, 5 * k); g.strokeStyle = NAVY; g.stroke();
    // arch trim
    g.lineWidth = 14 * k; g.strokeStyle = '#8c3a2c';
    g.beginPath(); g.moveTo(x - 247 * k, fy - 80 * k); g.lineTo(x - 247 * k, fy - 268 * k); g.arc(x, fy - 268 * k, 247 * k, Math.PI, 0); g.lineTo(x + 247 * k, fy - 80 * k); g.stroke();
    // stone base with the fire grate
    g.fillStyle = '#b9a9cf'; g.lineWidth = Math.max(2.5, 4 * k); g.strokeStyle = NAVY;
    ui.roundRect(g, x - 330 * k, fy - 42 * k, 660 * k, 44 * k, 10 * k); g.fill(); g.stroke();
    g.fillStyle = mix('#2a1530', '#ff7a2a', h * 0.8); ui.roundRect(g, x - 120 * k, fy - 74 * k, 240 * k, 26 * k, 8 * k); g.fill(); g.stroke();
    // vents
    for (const sx of [-1, 1]) { g.fillStyle = mix('#3a2040', '#ffb347', h); g.beginPath(); g.arc(x + sx * 275 * k, fy - 360 * k, 14 * k, 0, TAU); g.fill(); g.stroke(); }
    g.restore();
    doorsDrawn();
    this.drawFlames(g, x, fy, k, F, h);
  }

  drawKilnDoors(g, x, fy, k, F, h) {
    const d = F.doors;
    if (d <= 0.01) return;
    for (const side of [-1, 1]) {
      g.save();
      this.archPath(g, x, fy, k); g.clip();
      const hx = x + side * 240 * k, w = 240 * k * d;
      g.translate(hx, 0); g.scale(-side, 1);
      // door leaf from the hinge (0) to w
      if (!drawArt(g, 'prop/pottery-kiln-door', w / 2, fy - 80 * k, w, 520 * k, { anchor: 'bottom', fit: 'stretch' })) {
        g.fillStyle = '#6b4a8f'; g.fillRect(0, fy - 560 * k, w, 480 * k);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(w * 0.1, fy - 540 * k, w * 0.15, 440 * k);
        g.lineWidth = Math.max(2, 4 * k); g.strokeStyle = NAVY; g.strokeRect(0, fy - 560 * k, w, 480 * k);
        g.fillStyle = '#c8b6e8';
        for (const yy of [140, 250, 360]) for (const xx of [0.18, 0.82]) { g.beginPath(); g.arc(w * xx, fy - yy * k, 5 * k, 0, TAU); g.fill(); }
        // porthole
        g.fillStyle = mix('#3a2040', '#ffb347', h); g.beginPath(); g.ellipse(w * 0.55, fy - 400 * k, 34 * k * d, 34 * k, 0, 0, TAU); g.fill(); g.stroke();
        // handle
        g.fillStyle = '#ffd23f'; ui.roundRect(g, w - 26 * k * d, fy - 290 * k, 14 * k * d, 60 * k, 6 * k * d); g.fill(); g.stroke();
      }
      g.restore();
    }
  }

  drawFlames(g, x, fy, k, F, h) {
    const n = 5, inten = clamp(h * 0.8 + F.flare * 0.5, 0.15, 1.3);
    g.save();
    for (let i = 0; i < n; i++) {
      const fx0 = x + (i - (n - 1) / 2) * 42 * k;
      const fh = (30 + 40 * inten) * k * (0.8 + 0.2 * Math.sin(this.t * 14 + i * 1.7));
      const by = fy - 50 * k;
      g.fillStyle = i % 2 ? '#ff9f1c' : '#ffd23f';
      g.beginPath(); g.moveTo(fx0 - 14 * k, by); g.quadraticCurveTo(fx0 - 16 * k, by - fh * 0.6, fx0 + Math.sin(this.t * 9 + i) * 6 * k, by - fh); g.quadraticCurveTo(fx0 + 16 * k, by - fh * 0.6, fx0 + 14 * k, by); g.closePath(); g.fill();
      g.lineWidth = Math.max(1.5, 2.5 * k); g.strokeStyle = '#e8452c'; g.stroke();
    }
    g.restore();
  }

  // --- cursors and guides --------------------------------------------------------------
  drawShapeCursor(g, st) {
    const pot = st.pot, cur = st.cursor, k = st.L.k, c = st.p.ctrl;
    const sc = this.toScreen(st, cur.x, cur.y);
    const side = cur.x >= 0 ? 1 : -1;
    const tx = Math.abs(cur.x), ty = cur.y;
    const u = ty / pot.h;
    const R = radiusAt(pot, u);
    const touching = pot.grabTop || (u >= -0.1 && u <= 1.1 && tx - R < 60);
    // contact dot on the clay wall
    if (touching && !pot.grabTop && u >= 0 && u <= 1) {
      const w = this.toScreen(st, side * R, ty);
      g.save(); g.globalAlpha = 0.55 + 0.3 * Math.sin(this.t * 8);
      g.beginPath(); g.arc(w.x, w.y, 9 * k + 4, 0, TAU); g.fillStyle = st.p.color; g.fill();
      g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); g.restore();
    }
    if (pot.grabTop) {
      const t = this.toScreen(st, 0, pot.h);
      g.save(); g.setLineDash([8, 8]); g.lineWidth = 4; g.strokeStyle = st.p.color;
      g.beginPath(); g.ellipse(t.x, t.y, pot.r[N - 1] * k + 12, pot.r[N - 1] * KY * k + 6, 0, 0, TAU); g.stroke(); g.restore();
    }
    const held = c.held('a'), sponge = c.held('b');
    g.save(); g.translate(sc.x, sc.y);
    g.globalAlpha = touching || held || sponge ? 1 : 0.65;
    const sz = clamp(130 * k, 60, 150);
    if (sponge) {
      if (!drawArt(g, 'prop/pottery-sponge', 0, 0, sz * 0.5, sz * 0.5)) {
        g.rotate(Math.sin(this.t * 20) * 0.15);
        g.fillStyle = '#ffd23f'; ui.roundRect(g, -sz * 0.22, -sz * 0.15, sz * 0.44, sz * 0.3, sz * 0.08); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        g.fillStyle = 'rgba(200,140,20,0.6)';
        for (const [a, b] of [[-0.1, -0.05], [0.08, 0.04], [-0.02, 0.07], [0.12, -0.07]]) { g.beginPath(); g.arc(a * sz, b * sz, sz * 0.025, 0, TAU); g.fill(); }
      }
    } else {
      g.scale(side, 1);
      g.rotate(0.45 + (held ? Math.sin(this.t * 30) * 0.04 : 0));
      if (!drawArt(g, 'prop/pottery-rib', 0, 0, sz * 0.38, sz, { anchor: 'bottom' })) {
        g.lineJoin = 'round';
        g.fillStyle = '#f0c98c'; g.lineWidth = 3; g.strokeStyle = NAVY;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-sz * 0.14, -sz * 0.08, -sz * 0.08, -sz * 0.5); g.lineTo(-sz * 0.05, -sz * 0.95); g.quadraticCurveTo(0, -sz * 1.02, sz * 0.05, -sz * 0.95); g.lineTo(sz * 0.08, -sz * 0.5); g.quadraticCurveTo(sz * 0.14, -sz * 0.08, 0, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-sz * 0.03, -sz * 0.5, sz * 0.02, sz * 0.3, 0, 0, TAU); g.fill();
        g.fillStyle = mix(st.p.color, '#ffffff', 0.2); g.beginPath(); g.arc(0, -sz * 0.85, sz * 0.035, 0, TAU); g.fill(); g.stroke();
      }
    }
    g.restore();
    if (held && touching) {
      // squish lines
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6 + Math.sin(this.t * 20 + i) * 0.1; g.beginPath(); g.moveTo(sc.x + side * Math.cos(a) * 18, sc.y + Math.sin(a) * 18); g.lineTo(sc.x + side * Math.cos(a) * 30, sc.y + Math.sin(a) * 30); g.stroke(); }
      g.restore();
    }
    if (this.humans > 1 || st.p.isAI) ui.text(g, st.p.tag, sc.x, sc.y + 30, { size: 20, color: st.p.color, strokeWidth: 4 });
  }

  drawPaintCursor(g, st) {
    const cur = st.cursor, k = st.L.k, tool = TOOLS[st.tool].id;
    const sc = this.toScreen(st, cur.x, cur.y);
    const sz = clamp(120 * k, 56, 140);
    g.save(); g.translate(sc.x, sc.y);
    if (tool !== 'glaze' && !surfaceAt(st.pot, cur.x, cur.y)) g.globalAlpha = 0.55;   // off the pot
    if (st.held) {
      const it = st.held;
      g.save(); g.scale(k, k);
      if (it.kind) { g.rotate(it.rot || 0); drawSticker(g, it.kind, it.s * 1.1, this.t); }
      else { g.fillStyle = it.c; g.beginPath(); g.arc(0, 0, it.s * 1.1, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
      g.restore();
      g.beginPath(); g.arc(0, 0, 34 * k + 12, 0, TAU); g.lineWidth = 4; g.setLineDash([8, 6]); g.strokeStyle = st.p.color; g.stroke(); g.setLineDash([]);
    } else if (tool === 'sticker') {
      g.globalAlpha = 0.85;
      g.save(); g.scale(k, k); drawSticker(g, STICKERS[st.sticker], 44, this.t); g.restore();
      g.globalAlpha = 1;
      g.beginPath(); g.arc(0, 0, 30 * k + 10, 0, TAU); g.lineWidth = 3; g.strokeStyle = st.p.color; g.stroke();
    } else if (tool === 'glaze') {
      // a glaze jug, tipped
      const s = sz / 100;
      g.scale(s, s); g.rotate(-0.5);
      g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round';
      g.fillStyle = '#fff8ef'; g.beginPath(); g.moveTo(-22, -10); g.lineTo(-26, -58); g.lineTo(26, -58); g.lineTo(22, -10); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = this.colorFill(g, st.color, -26, 26); g.fillRect(-24, -52, 48, 14);
      g.beginPath(); g.moveTo(-26, -58); g.lineTo(-38, -66); g.lineTo(-22, -54); g.stroke();
      g.beginPath(); g.arc(30, -36, 12, -1.4, 1.4); g.stroke();
      // a drip
      g.fillStyle = PAINTS[st.color].rainbow ? RAINBOW[Math.floor(this.t * 4) % 7] : PAINTS[st.color].c;
      g.beginPath(); g.arc(-38, -58 + ((this.t * 60) % 30), 5, 0, TAU); g.fill();
    } else {
      // brush (also for stripes and dots)
      g.rotate(0.45);
      if (!drawArt(g, 'prop/pottery-brush', 0, 0, sz * 0.36, sz, { anchor: 'bottom' })) {
        g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = NAVY;
        g.fillStyle = '#ff9fd0'; ui.roundRect(g, -sz * 0.05, -sz * 1.0, sz * 0.1, sz * 0.6, sz * 0.05); g.fill(); g.stroke();
        g.fillStyle = '#c9cfe0'; g.fillRect(-sz * 0.06, -sz * 0.44, sz * 0.12, sz * 0.12); g.strokeRect(-sz * 0.06, -sz * 0.44, sz * 0.12, sz * 0.12);
        g.fillStyle = '#fff3d6'; g.beginPath(); g.moveTo(-sz * 0.06, -sz * 0.32); g.quadraticCurveTo(-sz * 0.07, -sz * 0.08, 0, 0); g.quadraticCurveTo(sz * 0.07, -sz * 0.08, sz * 0.06, -sz * 0.32); g.closePath(); g.fill(); g.stroke();
      }
      g.fillStyle = this.colorFill(g, st.color, -10, 10);
      g.beginPath(); g.ellipse(0, -sz * 0.08, sz * 0.055, sz * 0.09, 0, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
    }
    g.restore();
    if (this.humans > 1 || st.p.isAI) ui.text(g, st.p.tag, sc.x, sc.y + 34, { size: 20, color: st.p.color, strokeWidth: 4 });
    // hint bubble over a sticker or dot
    const tip = st.held ? [['a', 'Stick'], ['b', 'Take off']] : st.hover ? (tool === 'sticker' || tool === 'dots' ? [['a', 'Move'], ['b', 'Take off']] : [['b', 'Take off']]) : null;
    if (tip && !st.p.isAI) {
      const L = st.L, fs = clamp(26 * k + 6, 18, 28), gsz = fs * 1.15;
      let w = 14;
      for (const [, l] of tip) w += gsz + 6 + ui.measure(g, l, fs, 800) + 12;
      const bx = clamp(sc.x - w / 2, L.ca.x + 8, L.ca.x + L.ca.w - w - 8);
      const by = Math.max(L.ca.y + 4, sc.y - 60 * k - 40 - gsz * 1.6);
      ui.panel(g, bx, by, w, gsz * 1.6, { r: gsz * 0.8, fill: 'rgba(255,255,255,0.94)', lineWidth: 3, shadow: false });
      let tx = bx + 10;
      for (const [b, l] of tip) {
        ui.glyph(g, b, tx + gsz / 2, by + gsz * 0.8, gsz); tx += gsz + 6;
        ui.text(g, l, tx, by + gsz * 0.8 + 1, { size: fs, color: NAVY, stroke: false, align: 'left', weight: 800 }); tx += ui.measure(g, l, fs, 800) + 12;
      }
    }
  }

  colorFill(g, ci, x0, x1) {
    const p = PAINTS[ci];
    if (!p.rainbow) return p.c;
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    RAINBOW.forEach((c, i) => gr.addColorStop(i / (RAINBOW.length - 1), c));
    return gr;
  }

  /** Dashed ring around the pot where a dip would reach (back half before the pot, front half after). */
  drawGlazeGuide(g, st, back) {
    const pot = st.pot, cur = st.cursor, k = st.L.k, b = st.L.base;
    const surf = surfaceAt(pot, cur.x, cur.y);
    let u = surf ? surf.u : clamp(cur.y / pot.h, 0, 0.92);
    if (u < 0.04) u = 0;
    const R = radiusAt(pot, u) + 6;
    const y = b.y - u * pot.h * k;
    g.save(); g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeStyle = PAINTS[st.color].rainbow ? '#ff7ac6' : PAINTS[st.color].c;
    g.beginPath(); g.ellipse(b.x, y, R * k, R * KY * k, 0, back ? Math.PI : 0, back ? TAU : Math.PI); g.stroke();
    if (!back) { g.lineWidth = 2; g.strokeStyle = NAVY; g.globalAlpha = 0.5; g.stroke(); }
    g.restore();
  }

  drawBandGuide(g, st) {
    const pot = st.pot, cur = st.cursor, k = st.L.k, b = st.L.base;
    const surf = surfaceAt(pot, cur.x, cur.y);
    if (!surf) return;
    const R = radiusAt(pot, surf.u);
    g.save(); g.setLineDash([8, 8]); g.lineWidth = 3; g.globalAlpha = 0.7 + 0.3 * Math.sin(this.t * 6);
    g.strokeStyle = PAINTS[st.color].rainbow ? '#ff7ac6' : PAINTS[st.color].c;
    g.beginPath(); g.ellipse(b.x, b.y - surf.u * pot.h * k, R * k, R * KY * k, 0, 0, Math.PI); g.stroke();
    g.restore();
  }

  drawHover(g, st) {
    const it = st.hover, s = this.itemScreen(st, it), k = st.L.k;
    const rr = (it.kind ? it.s * 0.6 : it.s) * k + 10;
    g.save(); g.globalAlpha = 0.6 + 0.3 * Math.sin(this.t * 8);
    g.beginPath(); g.arc(s.x, s.y, rr, 0, TAU); g.lineWidth = 4; g.setLineDash([8, 6]); g.strokeStyle = st.p.color; g.stroke();
    g.restore();
  }

  // --- station UI -------------------------------------------------------------------------
  drawSteps(g, st) {
    const { r, L } = st;
    const y = r.y + 10, h = L.tabH - 8;
    const actW = clamp(r.w * 0.34, 130, 300);
    const pillsW = r.w - actW - 40;
    const pw = pillsW / 3;
    const cur = st.step === 'ready' ? 3 : STEPS.findIndex(([id]) => id === st.step);
    STEPS.forEach(([id, name], i) => {
      const sel = i === cur, done = i < cur;
      const bx = r.x + 14 + i * pw + 3, bw = pw - 6;
      const kk = sel ? 1 + st.listBump * 0.5 : 1;
      g.save(); g.translate(bx + bw / 2, y + h / 2); g.scale(kk, kk);
      ui.panel(g, -bw / 2, -h / 2 + (sel ? 0 : 4), bw, h - (sel ? 0 : 8), { r: 14, fill: sel ? '#ffffff' : done ? mix(st.p.color, '#ffffff', 0.35) : mix(st.p.color, '#ffffff', 0.65), lineWidth: sel ? 4 : 3, shadow: sel });
      const fs = clamp(h * 0.42, 15, 30);
      ui.text(g, `${i + 1} ${name}`, 0, 1, { size: fs, color: sel ? NAVY : '#fff', stroke: sel ? false : NAVY, strokeWidth: 4, weight: 800, maxWidth: bw - 24 });
      if (done) { g.beginPath(); g.arc(bw / 2 - 9, -h / 2 + 10, 7, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
      g.restore();
    });
    // the "next step" button
    let label = null;
    if (st.step === 'shape') label = 'Bake it!';
    else if (st.step === 'paint') label = 'Done!';
    if (label) {
      const bx = r.x + r.w - actW - 14, bw = actW;
      const ready = st.step === 'shape' ? st.shapeT > 3 || st.morph === null && st.lastPreset : st.history.length > 2;
      const pk = ready ? 1 + Math.sin(this.t * 5) * 0.04 : 1;
      g.save(); g.translate(bx + bw / 2, y + h / 2); g.scale(pk, pk);
      ui.panel(g, -bw / 2, -h / 2, bw, h, { r: h / 2, fill: st.step === 'shape' ? '#ff9f5a' : '#36d17a', lineWidth: 4, shadow: false });
      const gs = h * 0.72;
      ui.glyph(g, 'rb', -bw / 2 + gs * 0.75, 0, gs);
      ui.text(g, label, gs * 0.6, 1, { size: clamp(h * 0.46, 15, 32), weight: 800, maxWidth: bw - gs * 1.6 - 10 });
      g.restore();
    }
  }

  drawSide(g, st) {
    const lr = st.L.list;
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.88)', lineWidth: 4, shadow: false });
    if (st.ready) return;
    if (st.step === 'shape') this.drawShapeSide(g, st, lr);
    else if (st.step === 'fire') this.drawFireSide(g, st, lr);
    else this.drawPaintSide(g, st, lr);
  }

  drawShapeSide(g, st, lr) {
    const cx = lr.x + lr.w / 2;
    const fs = clamp(lr.w * 0.1, 15, 30);
    ui.text(g, "It's a...", cx, lr.y + fs * 1.1, { size: fs, color: NAVY, stroke: false, weight: 700 });
    const nb = 1 + st.nameBump * 0.8;
    g.save(); g.translate(cx, lr.y + fs * 2.6); g.scale(nb, nb); g.rotate(-0.04);
    ui.text(g, `${st.name}!`, 0, 0, { size: clamp(lr.w * 0.17, 22, 54), color: st.p.color, strokeWidth: 6, weight: 800, maxWidth: lr.w - 16 });
    g.restore();
    // silhouette of the pot
    const pot = st.pot, sy = lr.y + fs * 3.8, sh = lr.h * 0.3;
    const s = Math.min(sh / (HMAX + 20), (lr.w * 0.8) / 380);
    g.save(); g.translate(cx, sy + sh);
    g.fillStyle = mix(st.p.color, '#ffffff', 0.6); g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-pot.r[0] * s, 0);
    for (let i = 0; i < N; i++) g.lineTo(-pot.r[i] * s, -(i / (N - 1)) * pot.h * s);
    for (let i = N - 1; i >= 0; i--) g.lineTo(pot.r[i] * s, -(i / (N - 1)) * pot.h * s);
    g.closePath(); g.fill(); g.stroke();
    g.restore();
    // option rows
    const rows = [['x', `Handles: ${st.pot.handles}`], ['y', 'Surprise!'], ['b', 'Smooth']];
    const rh = clamp((lr.y + lr.h - (sy + sh + 16)) / 3.2, 26, 60);
    let y = sy + sh + 14 + rh / 2;
    const gs = rh * 0.7, lfs = clamp(rh * 0.42, 14, 26);
    for (const [b, l] of rows) {
      ui.panel(g, lr.x + 8, y - rh / 2 + 2, lr.w - 16, rh - 4, { r: rh / 2, fill: '#ffffff', lineWidth: 2, stroke: 'rgba(36,22,63,0.25)', shadow: false });
      ui.glyph(g, b, lr.x + 14 + gs / 2, y, gs);
      ui.text(g, l, lr.x + 22 + gs, y + 1, { size: lfs, color: NAVY, stroke: false, align: 'left', weight: 800, maxWidth: lr.w - gs - 36 });
      y += rh;
    }
  }

  drawFireSide(g, st, lr) {
    const F = st.fire, cx = lr.x + lr.w / 2;
    const fs = clamp(lr.w * 0.12, 16, 36);
    const title = F.stage === 'open' || F.stage === 'out' ? 'Ta-da!' : F.stage === 'ding' ? 'Ding!' : 'Baking...';
    ui.text(g, title, cx, lr.y + fs * 1.1, { size: fs, color: '#ff7a2a', strokeWidth: 5, weight: 800, maxWidth: lr.w - 16 });
    // thermometer
    const tw = clamp(lr.w * 0.18, 22, 56), th = lr.h * 0.52;
    const tx = cx - tw / 2, ty = lr.y + fs * 2.1;
    g.save(); g.lineWidth = 4; g.strokeStyle = NAVY;
    ui.roundRect(g, tx, ty, tw, th, tw / 2); g.fillStyle = '#fff'; g.fill(); g.stroke();
    const fh = (th - tw * 0.5) * clamp(F.heat, 0, 1);
    const gr = g.createLinearGradient(0, ty + th, 0, ty);
    gr.addColorStop(0, '#ffd23f'); gr.addColorStop(0.6, '#ff9f1c'); gr.addColorStop(1, '#ff4d5e');
    ui.roundRect(g, tx + 5, ty + th - fh - 5, tw - 10, fh, (tw - 10) / 2); g.fillStyle = gr; if (fh > 2) g.fill();
    g.beginPath(); g.arc(cx, ty + th + tw * 0.3, tw * 0.75, 0, TAU); g.fillStyle = F.heat > 0.02 ? '#ff7a2a' : '#ffd23f'; g.fill(); g.stroke();
    g.restore();
    if (F.stage === 'bake' && !st.p.isAI) {
      const gy = ty + th + tw * 1.6 + 30;
      ui.glyph(g, 'a', cx, Math.min(gy, lr.y + lr.h - 70), clamp(lr.w * 0.2, 34, 70), { pulse: true });
      ui.text(g, 'Mash!', cx, Math.min(gy, lr.y + lr.h - 70) + clamp(lr.w * 0.2, 34, 70) * 0.75, { size: clamp(lr.w * 0.1, 15, 30), color: NAVY, stroke: false, weight: 800 });
    } else if (F.stage === 'open' || F.stage === 'out') {
      ui.text(g, st.pot.clay?.name || '', cx, lr.y + lr.h - 40, { size: clamp(lr.w * 0.09, 14, 28), color: NAVY, stroke: false, weight: 800, maxWidth: lr.w - 16 });
    }
  }

  drawPaintSide(g, st, lr) {
    const headH = clamp(lr.h * 0.08, 22, 44);
    const toolsH = lr.h * 0.5;
    const tool = TOOLS[st.tool].id;
    ui.text(g, 'Tools', lr.x + lr.w / 2, lr.y + headH * 0.6, { size: headH * 0.66, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 16 });
    const rh = (toolsH - headH) / TOOLS.length;
    const named = lr.w >= 150;
    TOOLS.forEach((T, i) => {
      const sel = i === st.tool, y = lr.y + headH + 4 + i * rh;
      const bump = sel ? st.listBump * 0.6 : 0;
      g.save(); g.translate(lr.x + lr.w / 2, y + rh / 2); g.scale(1 + bump, 1 + bump);
      const bw = lr.w - 16, bh = rh - 5;
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 12, fill: sel ? '#ffd23f' : '#ffffff', lineWidth: sel ? 4 : 2, stroke: sel ? NAVY : 'rgba(36,22,63,0.25)', shadow: false });
      const isz = Math.min(bh * 0.9, named ? bh : bw * 0.7);
      const ix = named ? -bw / 2 + isz / 2 + 6 : 0;
      this.toolIcon(g, T.id, ix, 0, isz, st);
      if (named) ui.text(g, T.name, ix + isz / 2 + 6, 1, { size: clamp(bh * 0.36, 13, 28), color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: bw - isz - 18 });
      g.restore();
    });
    // palette / sticker grid
    const py = lr.y + toolsH + 6, ph = lr.h - toolsH - 12;
    const items = tool === 'sticker' ? STICKERS.length : PAINTS.length;
    const cols = lr.w > 200 ? 4 : 3, rowsN = Math.ceil(items / cols);
    const cw = (lr.w - 16) / cols, chh = Math.min(cw, ph / rowsN);
    for (let i = 0; i < items; i++) {
      const cx = lr.x + 8 + (i % cols + 0.5) * cw, cy = py + (Math.floor(i / cols) + 0.5) * chh;
      const sel = tool === 'sticker' ? i === st.sticker : i === st.color;
      const rr = Math.min(cw, chh) * 0.36 * (sel ? 1.12 + st.listBump : 1);
      if (sel) { g.beginPath(); g.arc(cx, cy, rr + 7, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
      if (tool === 'sticker') { g.save(); g.translate(cx, cy); drawSticker(g, STICKERS[i], rr * 2, this.t); g.restore(); }
      else {
        g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.fillStyle = this.colorFill(g, i, cx - rr, cx + rr); g.fill();
        g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(cx - rr * 0.3, cy - rr * 0.3, rr * 0.25, 0, TAU); g.fill();
        if (PAINTS[i].shine) { g.save(); g.translate(cx + rr * 0.4, cy - rr * 0.5); g.fillStyle = '#fff'; g.beginPath(); for (let j = 0; j < 8; j++) { const a = (j * Math.PI) / 4, q = j % 2 ? rr * 0.1 : rr * 0.32; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); g.restore(); }
      }
    }
  }

  toolIcon(g, id, x, y, sz, st) {
    g.save(); g.translate(x, y); const s = sz / 50; g.scale(s, s);
    g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
    const col = PAINTS[st.color].rainbow ? '#ff7ac6' : PAINTS[st.color].c;
    switch (id) {
      case 'glaze':
        g.fillStyle = '#fff8ef'; g.beginPath(); g.moveTo(-14, -16); g.lineTo(14, -16); g.lineTo(11, 16); g.lineTo(-11, 16); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = col; g.beginPath(); g.moveTo(-13, -8); g.lineTo(13, -8); g.lineTo(11, 16); g.lineTo(-11, 16); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.arc(-6, -8, 3, 0, Math.PI); g.arc(4, -8, 4, 0, Math.PI); g.fill();
        break;
      case 'band':
        g.fillStyle = '#e3895a'; g.beginPath(); g.moveTo(-10, -18); g.quadraticCurveTo(-22, 0, -12, 18); g.lineTo(12, 18); g.quadraticCurveTo(22, 0, 10, -18); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = col; g.fillRect(-17, -4, 34, 8); g.strokeRect(-17, -4, 34, 8);
        break;
      case 'brush':
        g.rotate(0.6); g.fillStyle = '#ff9fd0'; ui.roundRect(g, -3, -22, 6, 26, 3); g.fill(); g.stroke();
        g.fillStyle = col; g.beginPath(); g.moveTo(-5, 4); g.quadraticCurveTo(0, 22, 5, 4); g.closePath(); g.fill(); g.stroke();
        break;
      case 'dots':
        g.fillStyle = col; for (const [a, b] of [[-10, -8], [8, -10], [0, 4], [-12, 12], [12, 12]]) { g.beginPath(); g.arc(a, b, 5, 0, TAU); g.fill(); g.stroke(); }
        break;
      case 'sticker': drawSticker(g, STICKERS[st.sticker], 36, this.t); break;
      default: break;
    }
    g.restore();
  }

  drawStationHints(g, st) {
    const { r, L, p } = st;
    const y = r.y + r.h - L.hintH / 2 - 8;
    const sz = clamp(L.hintH * 0.72, 26, 42);
    const wide = r.w > 700;
    let x = r.x + 16;
    const tw = clamp(sz * 2, 56, 84);
    ui.panel(g, x, y - sz * 0.5, tw, sz, { r: sz / 2, fill: p.color, lineWidth: 3, shadow: false });
    ui.text(g, p.tag, x + tw / 2, y + 1, { size: sz * 0.55, strokeWidth: 4, shadow: false });
    x += tw + 12;
    if (wide) { drawPortrait(g, p, x + sz * 0.55, y, sz * 0.55, { ring: p.color, ringWidth: 3 }); x += sz * 1.4; }
    const pad = p.ctrl.kind === 'pad';
    let items;
    if (st.ready) items = st.p.isAI ? [] : [['b', 'Change']];
    else if (st.confirm) items = [['a', 'Yes!'], ['b', 'Not yet']];
    else if (st.step === 'shape') items = [['stick', 'Move'], ['a', 'Hold: shape'], ['b', 'Smooth'], ['x', 'Handles'], ['y', 'Surprise!']];
    else if (st.step === 'fire') items = st.fire.stage === 'bake' ? [['a', 'Puff the fire!']] : [];
    else {
      const tool = TOOLS[st.tool];
      if (st.held) items = [['stick', 'Move'], ['a', 'Stick'], ['b', 'Take off']];
      else items = [['stick', 'Move'], ['a', st.hover && (tool.id === 'sticker' || tool.id === 'dots') ? 'Move' : tool.verb], [pad ? 'dpad' : 'x', 'Tool'], [pad ? 'dpad' : 'y', tool.id === 'sticker' ? 'Sticker' : 'Colour'], ['b', st.hover ? 'Take off' : 'Undo']];
    }
    if (!items.length) return;
    if (!wide && items.length > 3) items = items.map(([b, l]) => [b, l === 'Surprise!' || l === 'Handles' ? '' : l]);
    const avail = r.x + r.w - 16 - x, lab = sz * 0.62;
    let need = 0;
    for (const [, l] of items) need += sz + 6 + (l ? ui.measure(g, l, lab) + 18 : 12);
    const kk = Math.min(1, avail / need);
    x += Math.max(0, (avail - need * kk) / 2);
    g.save(); g.translate(x, y); g.scale(kk, kk); x = 0;
    for (const [b, l] of items) {
      ui.glyph(g, b, x + sz / 2, 0, sz, { pulse: b === 'a' && (st.confirm || st.step === 'fire') });
      x += sz + 6;
      if (l) { ui.text(g, l, x, 2, { size: lab, color: '#fff', align: 'left', strokeWidth: 5 }); x += ui.measure(g, l, lab) + 18; } else x += 12;
    }
    g.restore();
  }

  drawConfirm(g, st) {
    const ca = st.L.ca;
    const w = Math.min(ca.w * 0.9, 460), h = Math.min(ca.h * 0.42, 220);
    const p = ease.outBack(clamp(st.confirm.t / 0.25, 0, 1));
    g.save(); g.translate(ca.x + ca.w / 2, ca.y + ca.h * 0.36); g.scale(p, p);
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 26, fill: '#fff8ec', stroke: NAVY, lineWidth: 5 });
    ui.text(g, st.step === 'shape' ? 'Bake it in the kiln?' : 'All done painting?', 0, -h * 0.2, { size: clamp(w * 0.08, 18, 38), color: NAVY, stroke: false, weight: 800, maxWidth: w - 30 });
    ui.hints(g, [['a', 'Yes!'], ['b', 'Not yet']], 0, h * 0.2, { size: clamp(h * 0.2, 24, 42) });
    g.restore();
  }

  drawReady(g, st) {
    const lr = st.L.list;
    g.save();
    ui.roundRect(g, lr.x, lr.y, lr.w, lr.h, 22); g.fillStyle = 'rgba(255,255,255,0.98)'; g.fill();
    const cx = lr.x + lr.w / 2, cy = lr.y + lr.h * 0.3;
    const p = Math.min(1, st.readyT / 0.3), sc = ease.outBack(p);
    g.translate(cx, cy); g.rotate(-0.12); g.scale(sc, sc);
    const w = Math.min(lr.w * 0.95, 300), h = w * 0.36;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: h / 2, fill: '#36d17a', lineWidth: 5 });
    ui.text(g, 'Ready!', 0, 2, { size: h * 0.55, weight: 800 });
    g.restore();
    const fs = clamp(lr.w * 0.1, 15, 30);
    ui.text(g, `${potName(st.pot)}!`, cx, lr.y + lr.h * 0.5, { size: fs * 1.2, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 16 });
    const waiting = this.stations.filter((s) => !s.ready).length;
    const sz = clamp(lr.w * 0.08, 14, 26);
    if (waiting) ui.text(g, waiting === 1 ? 'Waiting for 1 potter...' : `Waiting for ${waiting} potters...`, cx, lr.y + lr.h * 0.66, { size: sz, color: NAVY, stroke: false, maxWidth: lr.w - 16 });
    if (!st.p.isAI) ui.hints(g, [['b', 'Change']], cx, lr.y + lr.h * 0.82, { size: sz * 1.3 });
  }

  drawHelp(g, st) {
    const b = st.L.base, k = st.L.k;
    const y = b.y - st.pot.h * k - 70 * k - 20;
    const fs = clamp(34 * k, 18, 36);
    const msg = 'Hold A on the clay!';
    const w = ui.measure(g, msg, fs, 800) + fs * 2.4;
    const bob = Math.sin(this.t * 4) * 4;
    g.save(); g.translate(b.x, y + bob);
    ui.panel(g, -w / 2, -fs * 0.9, w, fs * 1.8, { r: fs * 0.9, fill: '#fff8ec', lineWidth: 3, shadow: false });
    ui.glyph(g, 'a', -w / 2 + fs * 1.05, 0, fs * 1.3, { pulse: true });
    ui.text(g, msg, fs * 0.6, 1, { size: fs, color: NAVY, stroke: false, weight: 800 });
    g.restore();
  }

  // --- showcase drawing ---------------------------------------------------------------------
  drawShow(g) {
    const t = this.phaseT;
    const bg = art('bg/pottery-wheel-gallery');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else this.drawGallery(g);
    // shelves
    for (const sy of this.show.shelves) this.drawShelf(g, sy);
    // spotlight
    const spotI = this.stations.findIndex((s) => s.spotT >= 0 && s.spotT < this.spotGap);
    if (spotI >= 0 && !this.cheese) {
      const s = this.stations[spotI].slot, u = this.stations[spotI].spotT;
      const life = Math.min(clamp(u / 0.2, 0, 1), clamp((this.spotGap - u) / 0.25, 0, 1));
      g.save(); g.globalAlpha = 0.35 * life; g.fillStyle = '#fff6c8';
      g.beginPath(); g.moveTo(s.x - 40, 0); g.lineTo(s.x + 40, 0); g.lineTo(s.x + 230 * s.k + 60, s.y + 10); g.lineTo(s.x - 230 * s.k - 60, s.y + 10); g.closePath(); g.fill();
      g.restore();
    }
    // pots
    this.stations.forEach((st, i) => {
      if (st.popT < 0) return;
      const s = st.slot;
      const pop = ease.outBack(clamp(st.popT / 0.35, 0, 1));
      const spot = st.spotT >= 0 && st.spotT < this.spotGap ? Math.sin(clamp(st.spotT / this.spotGap, 0, 1) * Math.PI) : 0;
      const kk = s.k * pop * (1 + spot * 0.15);
      const phi = this.t * (0.6 + spot * 2) + i * 1.3;
      g.save(); g.globalAlpha = 0.3; g.fillStyle = NAVY;
      g.beginPath(); g.ellipse(s.x, s.y + 4, maxRadius(st.pot) * kk * 1.05, 14 * pop, 0, 0, TAU); g.fill(); g.restore();
      drawPot(g, st.pot, { x: s.x, y: s.y, k: kk, phi, t: this.t });
      // ribbon + plaque on the shelf edge
      if (st.spotT >= 0) this.drawAward(g, st, clamp(st.spotT / 0.3, 0, 1));
      else this.drawPlaque(g, st, s.x, s.y + 30, pop, false);
    });
    // potters on the floor
    const order = this.stations.slice().sort((a, b) => a.showActor.y - b.showActor.y);
    for (const st of order) st.showActor.draw(g, { ring: st.p.color });
    this.drawShowHUD(g, t);
  }

  drawGallery(g) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#efe2ff'); gr.addColorStop(1, '#e2d0fb');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // soft wall pattern
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#ffffff';
    for (let y = 30; y < 900; y += 70) for (let x = (y / 70) % 2 ? 35 : 0; x < W; x += 70) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
    g.restore();
    // ceiling track with spotlights
    g.fillStyle = '#5b4a7a'; g.fillRect(0, 0, W, 16);
    for (const x of [W * 0.25, W * 0.75]) { g.fillStyle = '#3a2d55'; ui.roundRect(g, x - 26, 8, 52, 40, 10); g.fill(); g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(x, 48, 20, 6, 0, 0, TAU); g.fill(); }
    // wainscot
    g.fillStyle = '#d4bff4'; g.fillRect(0, 860, W, 70);
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 860); g.lineTo(W, 860); g.stroke();
    // floor
    g.fillStyle = '#e6ad78'; g.fillRect(0, 930, W, H - 930);
    g.strokeStyle = 'rgba(120,70,40,0.25)'; g.lineWidth = 2;
    for (let y = 960, row = 0; y < H; y += 30, row++) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (row % 2) * 90; x < W; x += 180) { g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x, y); g.stroke(); } }
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 930); g.lineTo(W, 930); g.stroke();
    // plants in the corners
    for (const [x, f] of [[70, 1], [W - 70, -1]]) {
      g.save(); g.translate(x, 930); g.scale(f, 1);
      g.fillStyle = '#5ddc6a'; g.strokeStyle = NAVY; g.lineWidth = 3;
      for (const [a, l] of [[-0.5, 120], [-0.15, 150], [0.25, 130], [0.6, 100]]) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -l / 2 - 40, 18, l / 2, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
      g.fillStyle = '#e3895a'; g.beginPath(); g.moveTo(-40, -70); g.lineTo(40, -70); g.lineTo(30, 0); g.lineTo(-30, 0); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }

  drawShelf(g, y) {
    if (drawArt(g, 'prop/pottery-shelf', W / 2, y - 40 + 80, 1760, 160, { fit: 'stretch' })) return;
    g.save(); g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = 4;
    // brackets
    for (const x of [260, W - 260]) {
      g.fillStyle = '#7a5a8a'; g.beginPath(); g.moveTo(x - 10, y + 30); g.lineTo(x + 10, y + 30); g.lineTo(x + 10, y + 110); g.quadraticCurveTo(x - 50, y + 60, x - 10, y + 30); g.closePath(); g.fill(); g.stroke();
    }
    g.fillStyle = '#d99a62'; ui.roundRect(g, 80, y - 6, W - 160, 22, 8); g.fill(); g.stroke();
    g.fillStyle = '#b97a48'; ui.roundRect(g, 80, y + 12, W - 160, 22, 6); g.fill(); g.stroke();
    g.restore();
  }

  drawPlaque(g, st, x, y, a = 1, big = false) {
    const w = big ? 220 : 120, h = big ? 40 : 30;
    g.save(); g.globalAlpha *= a;
    ui.panel(g, x - w / 2, y - h / 2, w, h, { r: h / 2, fill: st.p.color, lineWidth: 3, shadow: false });
    ui.text(g, st.p.tag, x, y + 1, { size: h * 0.6, strokeWidth: 4, maxWidth: w - 12 });
    g.restore();
  }

  drawAward(g, st, p) {
    const s = st.slot, sc = ease.outBack(p);
    const rows = this.show.rows;
    const x = s.x, y = s.y + (rows === 1 ? 52 : 44);
    g.save(); g.translate(x, y); g.scale(sc, sc);
    // rosette hanging off the shelf edge
    const R = rows === 1 ? 30 : 24;
    g.save(); g.translate(-(rows === 1 ? 150 : 108), 6);
    if (!drawArt(g, 'prop/pottery-rosette', 0, R * 0.9, R * 2.6, R * 3.4)) {
      g.fillStyle = st.p.color; g.strokeStyle = NAVY; g.lineWidth = 3;
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 4, 0); g.lineTo(sx * 16, R * 1.8); g.lineTo(sx * 8, R * 1.5); g.lineTo(sx * 2, R * 1.9); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle = '#ffd23f'; g.beginPath();
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, q = i % 2 ? R : R * 0.82; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff8ec'; g.beginPath(); g.arc(0, 0, R * 0.55, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = st.p.color; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? R * 0.18 : R * 0.42; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill();
    }
    g.restore();
    const w = rows === 1 ? 250 : 180, h = rows === 1 ? 50 : 40;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 12, fill: '#fff8ec', stroke: st.p.color, lineWidth: 5, shadow: true });
    ui.text(g, st.award, 0, -1, { size: h * 0.46, color: NAVY, stroke: false, weight: 800, maxWidth: w - 16 });
    ui.text(g, st.p.tag, w / 2 - 4, -h / 2 - 2, { size: h * 0.36, color: st.p.color, strokeWidth: 4 });
    g.restore();
  }

  drawShowHUD(g, t) {
    if (!this.cheese && t < this.spotStart + 0.2) ui.banner(g, 'Pottery Show!', t, { y: 110, size: 100, color: '#ff9f5a' });
    const ch = this.cheeseAt, shot = ch + CHEESE_TIME;
    if (!this.photoTaken && this.cheese) {
      if (t < shot - 3) ui.banner(g, 'Say cheese!', t - ch, { y: 110, size: 100, color: '#fff' });
      else { const n = Math.ceil(shot - t), f = 1 - (shot - t - (n - 1)); g.save(); g.translate(W / 2, 110); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(Math.max(1, n)), 0, 0, { size: 170, color: '#ffd23f', strokeWidth: 12 }); g.restore(); }
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
        g.save(); g.fillStyle = 'rgba(36,22,63,0.45)'; ui.roundRect(g, W / 2 - 720, H - 140, 1440, 128, 30); g.fill(); g.restore();
        ui.hints(g, r1, W / 2, H - 104, { size: 34 }); ui.hints(g, r2, W / 2, H - 48, { size: 34 });
      }
    }
    if (this.photoTaken) {
      const pt = t - shot;
      if (pt < 2.2) ui.banner(g, 'Masterpieces!', pt, { y: 110, size: 100, color: '#ffd23f' });
    }
  }
}

// --- menu / how-to thumbnail ------------------------------------------------------------
let iconPot = null;
function demoPot() {
  if (iconPot) return iconPot;
  const p = newPot();
  const pr = presetProfile('vase', p.vol, 0);
  p.r = pr.r; p.h = pr.h; p.fired = true; p.clay = CLAYS[1];
  p.layers = [{ u0: 0, color: 5, reveal: 1, seed: 1 }, { u0: 0.62, color: 0, reveal: 1, seed: 2 }];
  p.stripes = [{ u: 0.22, w: 0.06, color: 3 }, { u: 0.5, w: 0.05, color: 8 }];
  p.stickers = [{ th: 0, u: 0.36, kind: 'heart', s: 44, rot: -0.2 }, { th: 1.3, u: 0.38, kind: 'star', s: 40, rot: 0.2 }, { th: -1.4, u: 0.34, kind: 'flower', s: 40, rot: 0 }, { th: 2.8, u: 0.36, kind: 'butterfly', s: 44, rot: 0.1 }];
  p.dots = Array.from({ length: 10 }, (_, i) => ({ th: (i / 10) * TAU, u: 0.8, c: '#fffaf2', s: 7 }));
  iconPot = p;
  return p;
}

function drawIcon(g, x, y, w, h, t) {
  const thumb = art('thumb/pottery-wheel');
  if (thumb) { g.drawImage(thumb, x, y, w, h); return; }
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  const s = Math.min(w / 860, h / 520);
  const bg = g.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, '#ffe7d3'); bg.addColorStop(1, '#ffcfb0');
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(190,120,90,0.25)'; g.lineWidth = 2;
  for (let yy = y, row = 0; yy < y + h * 0.8; yy += 36 * s, row++) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); for (let xx = x + (row % 2) * 50 * s; xx < x + w; xx += 100 * s) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 36 * s); g.stroke(); } }
  g.fillStyle = '#e2a874'; g.fillRect(x, y + h * 0.82, w, h * 0.18);
  g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + h * 0.82); g.lineTo(x + w, y + h * 0.82); g.stroke();
  // little kiln glowing at the right
  const kx = x + w * 0.83, fy = y + h * 0.84, kk = 0.38 * s;
  g.save(); g.lineJoin = 'round';
  g.fillStyle = '#e8704e'; g.strokeStyle = NAVY; g.lineWidth = 3;
  g.beginPath(); g.moveTo(kx - 300 * kk, fy); g.lineTo(kx - 300 * kk, fy - 300 * kk); g.arc(kx, fy - 300 * kk, 300 * kk, Math.PI, 0); g.lineTo(kx + 300 * kk, fy); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(kx - 150 * kk, fy - 40 * kk); g.lineTo(kx - 150 * kk, fy - 250 * kk); g.arc(kx, fy - 250 * kk, 150 * kk, Math.PI, 0); g.lineTo(kx + 150 * kk, fy - 40 * kk); g.closePath(); g.fill(); g.stroke();
  for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#ff9f1c' : '#ffd23f'; const fx0 = kx + (i - 1) * 50 * kk, fh = (90 + Math.sin(t * 10 + i) * 20) * kk; g.beginPath(); g.moveTo(fx0 - 22 * kk, fy - 40 * kk); g.quadraticCurveTo(fx0, fy - 40 * kk - fh * 1.4, fx0 + 22 * kk, fy - 40 * kk); g.fill(); }
  g.restore();
  // wheel + pot
  const wx = x + w * 0.45, k = 0.82 * s;
  const fake = { L: { k } };
  void fake;
  const hy = fy - 140 * k;
  g.save(); g.lineWidth = 3; g.strokeStyle = NAVY;
  g.fillStyle = '#7fdcc0'; g.beginPath(); g.moveTo(wx - 120 * k, hy + 26 * k); g.lineTo(wx + 120 * k, hy + 26 * k); g.lineTo(wx + 150 * k, fy - 6 * k); g.lineTo(wx - 150 * k, fy - 6 * k); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#5cc4a6'; g.beginPath(); g.ellipse(wx, hy + 20 * k, 230 * k, 52 * k, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#b7c2e6'; g.beginPath(); g.ellipse(wx, hy, 190 * k, 42 * k, 0, 0, TAU); g.fill(); g.stroke();
  g.restore();
  drawPot(g, demoPot(), { x: wx, y: hy, k: k * 0.95, phi: t * 0.8, t });
  // sparkles
  for (let i = 0; i < 5; i++) {
    const u = (t * 0.4 + i / 5) % 1;
    g.save(); g.globalAlpha = Math.sin(u * Math.PI); g.translate(x + w * (0.3 + i * 0.08), y + h * (0.5 - u * 0.35));
    g.fillStyle = '#fff'; g.beginPath(); for (let j = 0; j < 8; j++) { const a = (j * Math.PI) / 4, q = j % 2 ? 4 * s : 14 * s; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill();
    g.restore();
  }
  drawPortrait(g, 'cotton-candy', x + w * 0.15, y + h * 0.6, 80 * s, { ring: '#ff7ac6', ringWidth: 7 * s, expr: 'happy' });
  g.restore();
}
