// Dream Aquarium (Play Studio): design a fish tank together, fill it with
// fish you name yourself, then put on a glowing night show.
//
// Everyone shares one big tank and has a hand cursor in their colour (left
// stick; the right stick nudges it finely). LB / RB step through the categories:
//   plants, castles, shells, bubblers, night lights, fish, sand colours, Tap
//   (the glass) and, last, Done. X (or the D-pad left/right) picks the next thing.
//   LT/RT (D-pad up/down on a controller) picks its colour (or recolours what you hold).
//   A  place it / pick up what you point at / put it down again;
//      on Tap: tap the glass (gently! fish come to look; tap too hard and they hide);
//      on Done: I'm ready for the show (B: not yet after all)
//   B  remove what you point at (fish wave and swim away)
//   Y  sprinkle fish food
// A new fish gets a name card: left/right picks a name, A chooses it.
// Fish swim with personality (see aquarium/fish.js) and play by themselves:
// loop-de-loops, bubble rides, peekaboo through castle doors, chases, kisses.
// The moon button on the lid turns the lights off (glowing lights, glowing
// jellyfish). Every kid ready on Done (or the gentle timer, or the pause menu) starts the
// night show: lights out one by one, close-up photos of everyone's favourite
// fish, then a group photo with the shared photo poses.
//
// CPUs are helpers: with humans around they add a few things and a fish, feed
// now and then, and never touch the humans' things. Alone they build a whole
// tank and put on the show themselves.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait, drawSpeech } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { input } from '../engine/input.js';
import { aiProfile, steer } from '../engine/ai.js';
import { playerName } from '../state.js';
import { clamp, lerp, damp, rand, pick, chance, shuffle, ease, TAU, later } from '../engine/util.js';
import { drawStarShape, drawSparkleShape, drawHeartShape } from '../engine/emotes.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  NAVY, WATER, LID, BASE_Y0, BASE_Y1, SWITCH, SWITCH_HIT, SANDS, shade, depthOfY, yOfDepth, decorScale, fishScale,
  sandSwatch, glow, glowSprite, drawRoom, drawWaterBack, drawSurface, drawSand, drawTankFront, drawSwitch, drawTitle, drawNightShade, drawLidLights,
} from './aquarium/tank.js';
import { DECOR, drawDecor, drawDecorGlow, decorLights, decorBox, drawDecorIcon, decorDoor, decorOut } from './aquarium/decor.js';
import {
  KINDS, makeFish, nameChoices, fishRange, bandY, wanderTarget, steerTo, integrate, emote, drawFish, drawFishGlowBits, fishGlowColor, drawFishIcon,
} from './aquarium/fish.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

// --- palette ------------------------------------------------------------------------
const GROUPS = {
  sand: { name: 'Sand', color: '#e8b04a' }, plants: { name: 'Plants', color: '#36c46a' }, castles: { name: 'Castles', color: '#9b6cff' },
  shells: { name: 'Shells', color: '#ff7aa8' }, bubblers: { name: 'Bubblers', color: '#3fa7ff' }, lights: { name: 'Lights', color: '#ffb020' },
  fish: { name: 'Fish', color: '#ff7a3c' },
};
const GROUP_ORDER = ['plants', 'castles', 'shells', 'bubblers', 'lights', 'fish', 'sand'];
const PALETTE = [
  ...GROUP_ORDER.filter((g) => g !== 'sand' && g !== 'fish').flatMap((grp) => DECOR.filter((d) => d.group === grp).map((d) => ({ kind: 'decor', def: d, group: grp, name: d.name, key: d.id, ncol: d.colors.length }))),
  ...KINDS.map((k) => ({ kind: 'fish', def: k, group: 'fish', name: k.name, key: k.id, ncol: k.colors.length })),
  ...SANDS.map((s, i) => ({ kind: 'sand', idx: i, group: 'sand', name: s.name, key: 'sand' + i, ncol: 1 })),
];
const PAL_INDEX = Object.fromEntries(PALETTE.map((e, i) => [e.key, i]));
const GROUP_START = GROUP_ORDER.map((grp) => PALETTE.findIndex((e) => e.group === grp));
const GROUP_END = GROUP_ORDER.map((grp) => PALETTE.length - [...PALETTE].reverse().findIndex((e) => e.group === grp));
// Categories (LB / RB): the groups, then "Tap" (A taps the glass) and last "Done".
const TAP_TAB = GROUP_ORDER.length, DONE = TAP_TAB + 1, NTABS = DONE + 1;
const groupOf = (idx) => GROUP_ORDER.indexOf(PALETTE[idx].group);
const tabName = (tab) => (tab === DONE ? 'Done' : tab === TAP_TAB ? 'Tap' : GROUPS[GROUP_ORDER[tab]].name);
const MAX_DECOR = 50, MAX_FISH = 26;

// --- screen layout --------------------------------------------------------------------
const BAR = { y: 950, h: 124 };
// The build clock is the play scene's own timer (api.limit) at CLOCK; its "+1 min" button sits beside it.
const CLOCK = { x: 1764, y: 162 };
const CLOCK_PLUS = { x: 1852, y: 132, w: 56, h: 60 };
const LEGEND = { x: 14, y: 14, w: 250 };
const LEGEND_ROWS = [[['stick'], 'Move'], [['lb', 'rb'], 'Category'], [['x'], 'Next'], [['lt', 'rt'], 'Colour'], [['a'], 'Place'], [['b'], 'Remove'], [['y'], 'Feed']];
const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const inTank = (x, y) => x >= WATER.x0 - 10 && x <= WATER.x1 + 10 && y >= LID.y1 && y <= WATER.y1 + 4;
const BUILD_TIME = 180, CPU_TIME = 58;
const LINEUP = 1.0, CHEESE_TIME = 6, PHOTO_PIN = 2.4, PHOTO_FLY = 0.8;
const PIN = { x: 960, y: 96, w: 250, rot: 0.04 };
const ROW_Y = 1052;

import { drawDoneTab } from '../engine/studio-ui.js';
import { meta } from './aquarium.meta.js';

export { meta };

// =============================================================================
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.humans = this.players.filter((p) => !p.isAI).length;
    this.t = 0; this.phase = 'build'; this.phaseT = 0;
    this.decor = []; this.fish = []; this.bubbles = []; this.flakes = []; this.taps = [];
    this.serial = 0;
    this.sand = 0; this.sandFx = null;
    this.night = false; this.nightK = 0; this.switchUsed = false; this.switchBump = -9;
    this.timeLeft = this.humans ? BUILD_TIME : CPU_TIME + (this.n <= 2 ? 16 : 0);
    this.toast = null; this.banner = null;
    this.photos = []; this.bigPhoto = null; this.finished = false;
    this.playT = 4; this.bubbleSnd = 0; this.reactT = 0;
    this.stations = this.players.map((p, i) => this.makeStation(p, i));
    // At 0 the play scene asks "Time's up!": Keep playing adds a minute (as the "+1 min" button
    // does), All done starts the night show. With no kids playing it just starts the show.
    api.limit(() => (this.phase === 'build' ? Math.max(0, this.timeLeft) : null), {
      showAt: Infinity, x: CLOCK.x, y: CLOCK.y,
      timeUp: { more: () => this.addTime(60), done: () => this.startShow() },
    });
    this.layoutPanels();
    this.layoutActors();
    this.cpuNight = !this.humans && chance(0.5) ? rand(20, 34) : -1;
    sfx('water');
  }

  makeStation(p, i) {
    const st = {
      p, i, cur: { x: 560 + (i % 4) * 260, y: 420 + Math.floor(i / 4) * 140 }, hold: 0,
      sel: (GROUP_START[i % 6] + Math.floor(i / 6)) % PALETTE.length, scroll: 0, rep: { dir: 0, t: 0 }, colorOf: {},
      tab: i % 6, selIn: [...GROUP_START], ready: false, tabPop: 0,
      held: null, hover: null, naming: null, click: false, cool: 0, feedCool: 0, tapHeat: 0, selPop: 0, colPop: 0, reactT: 0,
      stats: { decor: 0, fish: 0, fed: 0, taps: 0 },
      ai: p.isAI ? { cmds: [], wait: 0, idle: rand(1, 2.4) + i * 0.35, decor: 0, fish: 0, extra: 0 } : null,
    };
    st.selIn[st.tab] = st.sel;
    st.scroll = st.sel - GROUP_START[st.tab];
    st.actor = new Actor(p, { facing: 1 });
    return st;
  }

  layoutPanels() {
    const n = this.n, gap = 10, w = (W - 20 - gap * (n - 1)) / n;
    this.stations.forEach((st, i) => { st.panel = { x: 10 + i * (w + gap), y: BAR.y, w, h: BAR.h }; });
  }

  /** Characters watch from the floor on both sides of the tank while it is built. */
  layoutActors() {
    const sides = [[], []];
    this.stations.forEach((st, i) => sides[i % 2].push(st));
    sides.forEach((list, side) => {
      const m = list.length;
      list.forEach((st, j) => {
        const a = st.actor;
        const row = m <= 2 ? 0 : (j < 2 ? 0 : 1), perRow = m <= 2 ? m : 2, col = j % 2;
        const th = m <= 2 ? (m === 1 ? 220 : 180) : 150;
        a.scale = 1;
        a.scale = Math.min(th / a.leader.h, (perRow === 1 ? 220 : 116) / Math.max(1, a.width));
        const xs = perRow === 1 ? [140] : [76, 196];
        const x = xs[col] ?? 140;
        a.x = side === 0 ? x : W - x;
        a.y = row === 0 ? 934 : 770;
        a.facing = side === 0 ? 1 : -1;
        a.snap();
        st.home = { x: a.x, y: a.y, s: a.scale, facing: a.facing };
      });
    });
  }

  get env() { return { t: this.t, night: this.nightK }; }
  usedNames() { return new Set(this.fish.map((f) => f.name).filter(Boolean)); }

  // ===========================================================================
  // Decor
  placement(d, cx, cy) {
    const y = clamp(cy, BASE_Y0, BASE_Y1), dd = depthOfY(y), s = decorScale(dd);
    const half = (d.w / 2) * s * 0.8;
    return { x: clamp(cx, WATER.x0 + half, WATER.x1 - half), y, d: dd, s };
  }

  addDecor(d, pl, st, color, fromY = null) {
    const it = {
      id: ++this.serial, def: d, color, x: pl.x, y: pl.y, d: pl.d, s: pl.s, owner: st ? st.i : -1, born: this.t, bump: this.t, seed: Math.random(),
      heldBy: null, sink: fromY !== null ? Math.max(0, pl.y - fromY) : 0, open: 0, openT: 0, clamOpen: 1, bubT: rand(1, 3), lit: 0, litAt: 0,
    };
    this.decor.push(it);
    const c = this.decorCenter(it);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 10, speed: [100, 300], colors: ['#ffffff', '#bff6ff', '#fff6a8'] });
    if (!it.sink) this.landDecor(it);
    sfx('pop'); snd('aq-plop', 'fish-plop', { vol: 0.5 });
    if (st) {
      st.stats.decor++;
      st.actor.playOnce('cheer', 0.5);
      if (chance(0.3)) particles.popText(c.x, c.y - d.h * it.s * 0.5, pick(['Pretty!', 'Ooh!', 'So cute!', 'Splashy!', 'Lovely!']), st.p.color, 40);
    }
    if (d.anemone) for (const f of this.fish) if (f.kind.id === 'clownfish' && !(f.home && this.decor.includes(f.home))) { f.home = it; emote(f, 'heart', 1.4); }
    if (d.bubbler === 'chest') it.bubT = 1.4;
    if (d.lights && this.nightK > 0.5) sfx('sparkle');
    return it;
  }

  landDecor(it) {
    it.bump = this.t;
    particles.burst(it.x, it.y - 6, { type: 'dust', count: 7, speed: [60, 180], colors: [SANDS[this.sand].base] });
    for (let k = 0; k < 5; k++) this.addBubble(it.x + rand(-30, 30) * it.s, it.y - rand(10, 40), rand(3, 6), it.d);
  }

  decorCenter(it) { return { x: it.x, y: it.y - it.sink - it.def.h * it.s * 0.5 }; }
  decorRect(it) {
    const b = decorBox(it.def), s = it.s, pad = it.def.small ? 14 : 0;
    return { x0: it.x + b.x0 * s * 0.8 - pad, x1: it.x + b.x1 * s * 0.8 + pad, y0: it.y - it.sink + b.y0 * s * 0.92 - pad, y1: it.y - it.sink + b.y1 * s + pad };
  }

  removeDecor(it, st = null) {
    if (!this.decor.includes(it)) return;
    if (it.heldBy != null) { const h = this.stations[it.heldBy]; if (h && h.held && h.held.obj === it) h.held = null; }
    this.decor = this.decor.filter((x) => x !== it);
    for (const s2 of this.stations) if (s2.hover && s2.hover.obj === it) s2.hover = null;
    for (const f of this.fish) { if (f.home === it) f.home = null; if (f.play && f.play.item === it) this.endPlay(f); }
    const c = this.decorCenter(it);
    particles.burst(c.x, c.y, { type: 'bubble', count: 14, speed: [80, 260], colors: ['#ffffff', '#bff6ff'] });
    particles.burst(c.x, c.y, { type: 'star', count: 5, speed: [120, 260] });
    sfx('pop'); sfx('whoosh', { vol: 0.5 });
    if (st) st.actor.playOnce('action', 0.35);
  }

  // ===========================================================================
  // Fish
  addFish(kind, color, x, y, st) {
    const f = makeFish(kind, color, clamp(x, WATER.x0 + 60, WATER.x1 - 60), clamp(y, WATER.y0 + 50, WATER.y1 - 120), st ? st.i : -1, this.t);
    f.id = ++this.serial;
    const [top, bottom] = fishRange(f); f.y = clamp(f.y, top, bottom);
    wanderTarget(f, this);
    f.vx = f.dir * kind.speed * 0.6;
    if (kind.id === 'clownfish') f.home = this.decor.find((d) => d.def.anemone) || null;
    this.fish.push(f);
    particles.burst(f.x, f.y, { type: 'bubble', count: 16, speed: [80, 280], colors: ['#ffffff', '#bff6ff'] });
    particles.ring(f.x, f.y, st ? st.p.color : '#ffffff', 90, 0.35);
    snd('aq-splash', 'fish-plop'); sfx('bubble');
    if (st) {
      st.stats.fish++;
      st.actor.playOnce('cheer', 0.6); st.actor.emote('heart', 1.2);
      f.naming = true;
      st.naming = { fish: f, names: nameChoices(kind, this.usedNames()), idx: 0, t: 0, aiT: rand(0.9, 2.2) };
      sfx('select');
    } else f.name = nameChoices(kind, this.usedNames())[0];
    return f;
  }

  fishName(f) { return f.name || '???'; }

  /** Speech bubble; characters at the left edge get one that opens to the right (stays on screen). */
  say(st, text, dur = 1.4, kind = 'yay') {
    const a = st.actor;
    if (a.x < 330 || a.x > W - 330) { st.bubble = { text, t: 0, dur }; a.say(null); if (kind) voice(a.charId, kind); }
    else { st.bubble = null; a.say(text, dur, kind); }
  }

  confirmName(st) {
    const N = st.naming; if (!N) return;
    const f = N.fish;
    f.name = N.names[N.idx]; f.naming = false; f.showName = 3; f.happy = 1.2;
    st.naming = null;
    emote(f, 'heart', 1.5);
    particles.burst(f.x, f.y - 30, { type: 'heart', count: 6, colors: [st.p.color, '#ff8fc8', '#ffffff'] });
    particles.popText(f.x, f.y - 70 * fishScale(f.fd), f.name + '!', st.p.color, 46);
    snd('aq-name', 'star');
    st.actor.playOnce('celebrate', 0.8);
    if (st.reactT <= 0) { this.say(st, f.name + '!', 1.4, 'yay'); st.reactT = 2.5; }
    f.state = 'play'; f.play = { kind: 'loop', t: 0, cx: f.x, cy: f.y - 50, a0: Math.PI / 2 };
  }

  removeFish(f, st = null) {
    if (f.state === 'leave') return;
    if (f.held != null) { const h = this.stations[f.held]; if (h && h.held && h.held.obj === f) h.held = null; f.held = null; }
    for (const s2 of this.stations) if (s2.naming && s2.naming.fish === f) { s2.naming = null; }
    f.state = 'leave'; f.naming = false; f.play = null;
    emote(f, 'heart', 2);
    if (!f.name) f.name = 'Fishy';
    particles.popText(f.x, f.y - 60, 'Bye bye!', '#ffffff', 38);
    sfx('whoosh', { vol: 0.5 });
    if (st) st.actor.playOnce('wave', 0.8);
  }

  hitFish(x, y) {
    let best = null, bd = 1e9;
    for (const f of this.fish) {
      if (f.state === 'leave' || f.held != null || f.hidden > 0) continue;
      const s = fishScale(f.fd), r = Math.max(f.kind.w, f.kind.h) * 0.42 * s + 10;
      const pts = [[f.x, f.y], ...(f.mates || []).map((m) => [m.x, m.y])];
      for (const [px, py] of pts) { const d = Math.hypot(px - x, py - y); if (d < r && d < bd) { bd = d; best = f; } }
    }
    return best;
  }
  hitDecor(x, y) {
    const list = this.decor.filter((it) => it.heldBy == null).sort((a, b) => b.d - a.d);
    for (const it of list) { const r = this.decorRect(it); if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return it; }
    return null;
  }

  // ===========================================================================
  // Bubbles, food and taps
  addBubble(x, y, r, d = 0.5) { if (this.bubbles.length < 320) this.bubbles.push({ x, y, r, vy: rand(90, 150) + r * 4, ph: rand(TAU), d }); }

  updateBubbles(dt) {
    for (const it of this.decor) {
      const d = it.def;
      if (d.id === 'clam') { it.openT = (it.openT || rand(4, 8)) - dt; if (it.openT <= 0) { it.openT = rand(5, 9); it.clamTarget = it.clamTarget === 0 ? 1 : 0; } it.clamOpen = damp(it.clamOpen, it.clamTarget ?? 1, 5, dt); }
      if (!d.bubbler || it.heldBy != null || it.sink > 0) continue;
      const tx = it.x, ty = it.y + d.top * it.s;
      it.bubT -= dt;
      if (d.bubbler === 'stream') {
        if (it.bubT <= 0) { it.bubT = rand(0.07, 0.14); this.addBubble(tx + rand(-8, 8) * it.s, ty, rand(3, 7) * it.s, it.d); }
      } else if (d.bubbler === 'puff') {
        if (it.bubT <= 0) { it.bubT = rand(2, 3.2); for (let k = 0; k < 7; k++) later(() => this.addBubble(tx + rand(-6, 6), ty, rand(5, 10) * it.s, it.d), k * 70); this.bubbleSound(0.35); }
      } else if (d.bubbler === 'volcano') {
        if (chance(dt * 4)) this.addBubble(tx + rand(-14, 14) * it.s, ty, rand(3, 6) * it.s, it.d);
        if (it.bubT <= 0) {
          it.bubT = rand(5, 8); it.bump = this.t;
          for (let k = 0; k < 16; k++) this.addBubble(tx + rand(-20, 20) * it.s, ty - rand(0, 30), rand(5, 13) * it.s, it.d);
          particles.burst(tx, ty, { type: 'spark', count: 8, colors: [d.colors[it.color % d.colors.length].a, '#ffd23f'], speed: [100, 260] });
          snd('aq-volcano', 'bubble', { vol: 0.6 }); fx.shake(2, 0.15);
        }
      } else if (d.bubbler === 'chest') {
        if (it.bubT <= 0 && !(it.open > 0)) {
          it.bubT = rand(7, 11); it.open = 0.01; it.openHold = 1.6;
          for (let k = 0; k < 18; k++) this.addBubble(tx + rand(-30, 30) * it.s, ty - rand(0, 20), rand(5, 12) * it.s, it.d);
          particles.burst(tx, ty, { type: 'sparkle', count: 10, colors: ['#ffd23f', '#ffffff', '#ff8fc8'] });
          snd('aq-chest', 'td-chest-open', { vol: 0.6 });
          // nearby fish come to look
          for (const f of this.fish) if (f.state === 'swim' && Math.hypot(f.x - tx, f.y - ty) < 500 && chance(f.kind.curious)) this.lookAt(f, tx, ty - 40, 2.2, 'exclaim');
        }
      }
      if (it.open > 0) {
        if (it.openHold > 0) { it.open = Math.min(1, it.open + dt * 4); it.openHold -= dt; }
        else { it.open -= dt * 3; if (it.open <= 0) { it.open = 0; snd('aq-chest-close', 'tock', { vol: 0.4 }); } }
      }
    }
    for (const b of this.bubbles) {
      b.ph += dt * 5;
      b.y -= b.vy * dt; b.x += Math.sin(b.ph) * 22 * dt;
      if (b.y <= WATER.y0 + 4) { b.gone = true; if (chance(0.15)) particles.burst(b.x, WATER.y0, { type: 'spark', count: 2, colors: ['#ffffff'], speed: [40, 90] }); }
    }
    this.bubbles = this.bubbles.filter((b) => !b.gone);
  }
  bubbleSound(vol = 0.3) { if (this.bubbleSnd <= 0) { this.bubbleSnd = 0.35; sfx('bubble', { vol }); } }

  feed(st) {
    if (st.feedCool > 0) return;
    const { x, y } = st.cur;
    if (!inTank(x, y) && !(x > WATER.x0 && x < WATER.x1 && y > 0 && y < WATER.y0)) { sfx('blip'); return; }
    st.feedCool = 0.4;
    const fx0 = clamp(x, WATER.x0 + 30, WATER.x1 - 30), fy0 = clamp(y, WATER.y0 + 8, BASE_Y0 - 40);
    const cols = ['#ff9f1c', '#ffd23f', '#ff6fb1', '#5ddc6a', '#c98a4b'];
    for (let k = 0; k < 5; k++) this.flakes.push({ x: fx0 + rand(-26, 26), y: fy0 + rand(-6, 6), vx: rand(-20, 20), vy: rand(30, 60), ph: rand(TAU), color: pick(cols), owner: st.i, t: 0, landed: false, rot: rand(TAU) });
    if (this.flakes.length > 120) this.flakes.splice(0, this.flakes.length - 120);
    snd('aq-feed', 'sprinkle-shake', { vol: 0.6 });
    st.shake = 0.4;
    st.actor.playOnce('toss', 0.5);
    for (const f of this.fish) if (chance(0.6)) f.hungryAt = this.t + rand(0.1, 0.6);
  }

  updateFlakes(dt) {
    for (const k of this.flakes) {
      k.t += dt; k.ph += dt * 3;
      if (!k.landed) {
        k.vy = damp(k.vy, 48, 2, dt); k.vx = damp(k.vx, 0, 2, dt);
        k.x += (k.vx + Math.sin(k.ph) * 18) * dt; k.y += k.vy * dt; k.rot += dt * 2;
        if (k.y >= BASE_Y0 + 20) { k.landed = true; k.y = BASE_Y0 + 20; }
      }
      if (k.t > 14) k.gone = true;
    }
    this.flakes = this.flakes.filter((k) => !k.gone);
  }

  tap(st) {
    const { x, y } = st.cur;
    if (!inTank(x, y)) { sfx('blip'); return; }
    st.tapHeat += 1;
    st.stats.taps++;
    this.taps.push({ x, y, t: 0, color: st.p.color });
    snd('aq-tap', 'tock', { vol: 0.9 }); later(() => sfx('tick', { vol: 0.5 }), 90);
    st.actor.playOnce('point', 0.5);
    if (st.tapHeat > 3.3) {
      // too hard: everyone dashes off to hide
      st.tapHeat = 2;
      particles.popText(x, y - 50, 'Gently!', '#ff6fb1', 50);
      snd('aq-scared', 'fish-scare', { vol: 0.6 });
      if (st.reactT <= 0) { this.say(st, 'Shh! Gently!', 1.6, null); st.reactT = 2.5; }
      for (const f of this.fish) {
        if (f.held != null || f.naming || f.state === 'leave') continue;
        if (Math.hypot(f.x - x, f.y - y) < 700) { this.flee(f, x, y, 0.8); f.afterFlee = 'hide'; if (f.kind.id === 'puffer') f.puffT = 4; emote(f, 'exclaim', 1); }
      }
      return;
    }
    for (const f of this.fish) {
      if (f.held != null || f.naming || f.state === 'leave' || f.hidden > 0) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < 260) { this.flee(f, x, y, 0.35); if (f.kind.id === 'puffer') { f.puffT = 2.6; f.bump = this.t; } }
      if (d < 750 && chance(f.kind.curious)) { f.afterFlee = d < 260 ? 'look' : null; f.lookX = x + rand(-50, 50); f.lookY = clamp(y, WATER.y0 + 60, BASE_Y0 - 30); if (d >= 260) this.lookAt(f, f.lookX, f.lookY, 2.6, 'question'); }
    }
  }

  // ===========================================================================
  // Fish behaviour
  flee(f, x, y, dur) {
    if (f.state === 'held' || f.naming) return;
    f.state = 'flee'; f.st = dur; f.play = null; f.afterFlee = null; f.holdPlant = null;
    const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1;
    f.vx = dx / d * f.kind.speed * 2.6 + rand(-40, 40); f.vy = dy / d * f.kind.speed * 1.8;
    f.tfd = clamp(f.fd - 0.25, 0.02, 1);
  }
  lookAt(f, x, y, dur, em) {
    if (f.state === 'held' || f.naming || f.state === 'leave') return;
    f.state = 'look'; f.st = dur; f.tx = x - (f.x < x ? 70 : -70); f.ty = y; f.lookX = x; f.lookY = y; f.tfd = 0.97; f.play = null;
    if (em) emote(f, em, 1.2);
  }
  endPlay(f) { f.play = null; f.state = 'swim'; f.hidden = 0; wanderTarget(f, this); }

  updateFishAll(dt) {
    const show = this.phase === 'show';
    for (const f of this.fish) {
      f.st -= dt;
      if (f.showName > 0) f.showName -= dt;
      if (f.happy > 0) f.happy -= dt;
      if (f.hidden > 0) { f.hidden -= dt; if (f.hidden <= 0) this.popOut(f); continue; }
      const k = f.kind;
      // hunger: find the nearest flake
      if (!show && f.full < 4 && (f.state === 'swim' || f.state === 'look') && this.flakes.length && f.hungryAt !== undefined && this.t >= f.hungryAt) {
        let best = null, bd = 650;
        for (const fl of this.flakes) { if (fl.target && fl.target !== f && fl.target.food === fl && fl.target.state === 'eat' && this.fish.includes(fl.target)) continue; const d = Math.hypot(fl.x - f.x, fl.y - f.y); if (d < bd) { bd = d; best = fl; } }
        if (best) { f.state = 'eat'; f.food = best; best.target = f; emote(f, 'exclaim', 0.8); }
        f.hungryAt = this.t + rand(0.4, 0.9);
      }
      switch (f.state) {
        case 'held': {
          const st = this.stations[f.held];
          if (!st) { f.state = 'swim'; f.held = null; break; }
          const tx = clamp(st.cur.x, WATER.x0 + 50, WATER.x1 - 50), ty = clamp(st.cur.y, WATER.y0 + 40, BASE_Y1 - 60);
          const px = f.x;
          f.x = damp(f.x, tx, 14, dt); f.y = damp(f.y, ty, 14, dt);
          f.vx = (f.x - px) / Math.max(dt, 1e-3) * 0.3; f.vy = 0; f.tfd = 1;
          if (Math.abs(f.x - px) > 0.5) f.dir = f.x > px ? 1 : -1;
          integrate(f, 0, this); f.wig += dt * 10; f.face = damp(f.face, f.dir, 10, dt); f.fd = damp(f.fd, 1, 4, dt);
          continue;
        }
        case 'leave': {
          steerTo(f, f.x + f.dir * 60, WATER.y0 - 60, k.speed * 2.2 + 80, dt, 40, 4);
          f.x += f.vx * dt; f.y += f.vy * dt; f.wig += dt * 16; f.face = damp(f.face, f.dir, 6, dt);
          if (k.jelly) f.pulse += dt;
          if (f.mates) for (const m of f.mates) { m.x = damp(m.x, f.x + m.ox * f.face, 5, dt); m.y = damp(m.y, f.y + m.oy, 5, dt); }
          if (f.y < WATER.y0 + 4) { f.gone = true; particles.burst(f.x, WATER.y0, { type: 'drop', count: 12, colors: ['#bff6ff', '#ffffff'], speed: [120, 300], angle: -Math.PI / 2, spread: 0.8 }); snd('aq-splash', 'fish-plop', { vol: 0.6 }); }
          continue;
        }
        case 'eat': {
          const fl = f.food;
          if (!fl || fl.gone) { f.state = 'swim'; f.food = null; wanderTarget(f, this); break; }
          const s = fishScale(f.fd);
          const mx = f.x + f.dir * k.w * 0.4 * s;
          f.tfd = 0.6;
          steerTo(f, fl.x - f.dir * k.w * 0.4 * s, fl.y, k.speed * 1.5 + 40, dt, 30, 5);
          if (Math.hypot(mx - fl.x, f.y - fl.y) < 26 * s + 8 || Math.hypot(f.x - fl.x, f.y - fl.y) < 22) this.eat(f, fl);
          break;
        }
        case 'flee': {
          f.vx = damp(f.vx, 0, 1.2, dt); f.vy = damp(f.vy, 0, 1.2, dt);
          if (f.st <= 0) {
            const nxt = f.afterFlee; f.afterFlee = null;
            if (nxt === 'hide' && this.hideSpot(f)) break;
            if (nxt === 'look') { this.lookAt(f, f.lookX, f.lookY, 2.4, 'question'); break; }
            f.state = 'swim'; wanderTarget(f, this);
          }
          break;
        }
        case 'look': {
          const d = steerTo(f, f.tx, f.ty, k.speed * 1.2 + 30, dt, 70, 3);
          if (d < 30) { f.dir = f.lookX > f.x ? 1 : -1; if (!f.looked) { f.looked = true; emote(f, chance(0.5) ? 'heart' : 'happy', 1.3); if (chance(0.5)) this.blowBubbles(f, 2); } }
          if (f.st <= 0) { f.looked = false; f.state = 'swim'; wanderTarget(f, this); }
          break;
        }
        case 'hide': {
          const d = steerTo(f, f.tx, f.ty, k.speed * 1.6 + 40, dt, 50, 4);
          if (d < 20 && f.hideItem && this.decor.includes(f.hideItem)) f.tfd = clamp(f.hideItem.d - 0.06, 0, 1);
          if (f.st <= 0) { f.state = 'swim'; wanderTarget(f, this); if (chance(0.5)) emote(f, 'dots', 1); }
          break;
        }
        case 'play': this.updatePlay(f, dt); break;
        case 'pose': {
          const d = steerTo(f, f.tx, f.ty + Math.sin(this.t * 2 + f.seed * 9) * 6, k.speed * 1.5 + 60, dt, 60, 3);
          f.tfd = f.poseD ?? 0.95;
          if (d < 30) f.dir = f.tx < 960 ? 1 : -1;
          break;
        }
        default: this.updateSwim(f, dt);
      }
      integrate(f, dt, this);
    }
    this.fish = this.fish.filter((f) => !f.gone);
  }

  updateSwim(f, dt) {
    const k = f.kind;
    if (k.id === 'seahorse' && f.holdPlant) {
      const p = f.holdPlant;
      if (!this.decor.includes(p) || p.heldBy != null || f.st <= 0) { f.holdPlant = null; wanderTarget(f, this); }
      else { f.tx = p.x + f.holdOx * p.s + Math.sin(this.t * 1.3 + p.seed * 9) * 8; f.ty = p.y - f.holdH * p.s; f.tfd = clamp(p.d + 0.04, 0, 1); steerTo(f, f.tx, f.ty, k.speed, dt, 40, 3); return; }
    }
    const d = steerTo(f, f.tx, f.ty, k.speed * (f.fullT > 0 ? 0.8 : 1), dt, k.jelly ? 200 : 90, k.jelly ? 0.8 : 2.2);
    if (d < 24 || f.st <= 0) {
      f.st = rand(4, 8);
      if (k.id === 'seahorse' && chance(0.55)) {
        const plants = this.decor.filter((it) => it.def.plant && it.heldBy == null);
        if (plants.length) { const p = pick(plants); f.holdPlant = p; f.holdOx = rand(-0.25, 0.25) * p.def.w; f.holdH = rand(0.35, 0.7) * p.def.h; f.st = rand(6, 11); return; }
      }
      wanderTarget(f, this);
      if (k.id === 'puffer' && chance(0.12)) { f.puffT = 1.6; f.bump = this.t; }
      if (chance(0.08)) this.blowBubbles(f, 3);
    }
  }

  eat(f, fl) {
    fl.gone = true; f.food = null;
    f.full++; f.fed++; f.happy = 0.6; f.bump = this.t;
    const st = this.stations[fl.owner];
    if (st) st.stats.fed++;
    snd('aq-munch', 'fish-nibble', { vol: 0.5 });
    particles.burst(f.x + f.dir * 30, f.y, { type: 'heart', count: 2, speed: [40, 100], colors: ['#ff8fc8', '#ffffff'] });
    if (f.full >= 4) {
      f.fullT = 25; emote(f, 'heart', 1.6);
      particles.popText(f.x, f.y - 60, 'Yum!', '#ffd23f', 40);
      f.state = 'play'; f.play = { kind: 'loop', t: 0, cx: f.x, cy: f.y - 50, a0: Math.PI / 2 };
      sfx('collect', { step: 4 });
      const own = this.stations[f.owner];
      if (own && own.reactT <= 0) { own.actor.playOnce('giggle', 0.8); own.actor.emote('happy', 1.2); own.reactT = 2; }
    } else { f.state = 'swim'; f.hungryAt = this.t + rand(0.1, 0.4); }
  }

  blowBubbles(f, n) {
    const s = fishScale(f.fd);
    for (let k = 0; k < n; k++) later(() => { if (!this.finished && !f.gone) this.addBubble(f.x + f.dir * f.kind.w * 0.45 * s, f.y - 4, rand(4, 8), f.fd); }, k * 160);
    this.bubbleSound(0.25);
  }

  hideSpot(f) {
    const spots = this.decor.filter((it) => it.def.hide && it.heldBy == null);
    if (!spots.length) return false;
    const it = spots.reduce((a, b) => (Math.hypot(a.x - f.x, a.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? a : b));
    f.state = 'hide'; f.st = rand(2.5, 4); f.hideItem = it;
    f.tx = it.x + rand(-0.25, 0.25) * it.def.w * it.s; f.ty = it.y - it.def.h * it.s * rand(0.3, 0.6);
    return true;
  }

  popOut(f) {
    const P = f.play, it = P && P.item;
    const out = it && decorOut(it.def, it);
    if (it && this.decor.includes(it) && out) {
      f.x = it.x + out.x * it.s; f.y = it.y + out.y * it.s; f.fd = f.tfd = clamp(it.d + 0.05, 0, 1);
    }
    f.vx = f.dir * f.kind.speed; f.vy = -30;
    if (f.mates) for (const m of f.mates) { m.x = f.x; m.y = f.y; }
    particles.burst(f.x, f.y, { type: 'sparkle', count: 8, colors: ['#ffffff', '#fff6a8'] });
    if (chance(0.5)) particles.popText(f.x, f.y - 50, 'Peekaboo!', '#ffffff', 36);
    sfx('pop', { vol: 0.4 });
    emote(f, 'happy', 1.2);
    this.endPlay(f);
    this.cheerFor(f, 0.4);
  }

  /** A character (the fish's owner, or anyone) reacts to a fish playing. */
  cheerFor(f, p = 0.3) {
    if (this.reactT > 0 || !chance(p)) return;
    const st = this.stations[f.owner] || pick(this.stations);
    if (!st || st.reactT > 0 || this.phase !== 'build') return;
    this.reactT = 2.5; st.reactT = 3;
    st.actor.playOnce(pick(['cheer', 'point', 'giggle']), 0.8);
    if (chance(0.5)) this.say(st, pick(['Wheee!', 'Look!', 'So cute!', `Go, ${this.fishName(f)}!`]), 1.4, chance(0.5) ? 'laugh' : 'woo');
    else st.actor.emote(pick(['heart', 'happy', 'star']), 1.2);
  }

  // --- play director ---------------------------------------------------------------------
  updateDirector(dt) {
    this.playT -= dt;
    if (this.playT > 0) return;
    const free = this.fish.filter((f) => f.state === 'swim' && !f.naming && f.held == null && !f.holdPlant);
    this.playT = rand(2.2, 4.5) * clamp(6 / Math.max(1, this.fish.length), 0.45, 1.4);
    if (!free.length) return;
    const f = pick(free), k = f.kind;
    const opts = [['loop', 2]];
    const bub = this.decor.filter((it) => it.def.bubbler && it.heldBy == null && it.sink <= 0);
    const thru = this.decor.filter((it) => (it.def.door || it.def.through) && it.heldBy == null && it.sink <= 0);
    const anem = this.decor.filter((it) => it.def.anemone && it.heldBy == null);
    if (bub.length && !k.jelly) opts.push(['ride', 3]);
    if (thru.length && !k.jelly && !k.upright) opts.push(['through', 3.5]);
    if (free.length > 1 && !k.jelly) opts.push(['chase', 2], ['kiss', 1.2]);
    opts.push(['bubbles', 1]);
    if (k.id === 'clownfish' && anem.length) opts.push(['snuggle', 3]);
    if (k.id === 'puffer') opts.push(['puff', 2]);
    if (k.id === 'betta') opts.push(['twirl', 2]);
    let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), kind = 'loop';
    for (const [o, w] of opts) { r -= w; if (r <= 0) { kind = o; break; } }
    const P = { kind, t: 0 };
    if (kind === 'loop' || kind === 'twirl') { P.cx = f.x; P.cy = Math.max(f.y - 50, WATER.y0 + 110); P.a0 = Math.PI / 2; }
    else if (kind === 'ride') { P.item = pick(bub); P.stage = 0; }
    else if (kind === 'through') {
      P.item = pick(thru); P.stage = 0;
      if (P.item.def.through) { P.side = f.x < P.item.x ? -1 : 1; }
    } else if (kind === 'chase' || kind === 'kiss') {
      const others = free.filter((o) => o !== f && !o.kind.jelly);
      if (!others.length) return;
      const o = others.reduce((a, b) => (Math.hypot(a.x - f.x, a.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? a : b));
      P.other = o;
      if (kind === 'kiss') { P.mx = (f.x + o.x) / 2; P.my = clamp((f.y + o.y) / 2, WATER.y0 + 120, BASE_Y0 - 80); o.state = 'play'; o.play = { kind: 'kissee', t: 0, other: f, mx: P.mx, my: P.my }; }
      else { o.state = 'play'; o.play = { kind: 'chased', t: 0, other: f }; emote(o, 'exclaim', 0.8); o.tx = clamp(o.x + rand(-500, 500), WATER.x0 + 80, WATER.x1 - 80); o.ty = bandY(o, rand(0.1, 0.9)); }
    } else if (kind === 'snuggle') { P.item = pick(anem); }
    f.state = 'play'; f.play = P;
  }

  updatePlay(f, dt) {
    const P = f.play, k = f.kind;
    if (!P) { this.endPlay(f); return; }
    P.t += dt;
    switch (P.kind) {
      case 'loop': case 'twirl': {
        const dur = P.kind === 'loop' ? 1.5 : 2.2, R = P.kind === 'loop' ? 55 : 0;
        const a = P.a0 + (P.t / dur) * TAU * (P.kind === 'loop' ? 1 : 2);
        if (P.kind === 'loop') {
          const tx = P.cx + Math.cos(a) * R * (f.dir >= 0 ? 1 : -1), ty = P.cy + Math.sin(a) * R;
          f.vx = (tx - f.x) / Math.max(dt, 1e-3) * 0.5; f.vy = (ty - f.y) / Math.max(dt, 1e-3) * 0.5;
        } else { f.vx = damp(f.vx, 0, 4, dt); f.vy = damp(f.vy, Math.sin(P.t * 6) * 30, 4, dt); f.dir = Math.sin(P.t * 7) > 0 ? 1 : -1; if (!P.sparkled) { P.sparkled = true; particles.burst(f.x, f.y, { type: 'sparkle', count: 8 }); sfx('sparkle', { vol: 0.3 }); } }
        if (P.t > 0.3 && !P.popped) { P.popped = true; if (chance(0.35)) particles.popText(f.x, f.y - 50, P.kind === 'loop' ? 'Wheee!' : 'Ta-da!', '#ffffff', 34); this.cheerFor(f, 0.25); }
        if (P.t > dur) this.endPlay(f);
        break;
      }
      case 'ride': {
        const it = P.item;
        if (!this.decor.includes(it) || it.heldBy != null) { this.endPlay(f); break; }
        const bx = it.x, by = it.y + it.def.top * it.s;
        if (P.stage === 0) {
          f.tfd = clamp(it.d + 0.03, 0, 1);
          const d = steerTo(f, bx, by - 50, k.speed * 1.4 + 40, dt, 40, 4);
          if (d < 34 || P.t > 6) { P.stage = 1; P.t = 0; emote(f, 'happy', 1.4); sfx('bubble', { vol: 0.4 }); for (let i = 0; i < 6; i++) this.addBubble(bx + rand(-10, 10), by, rand(5, 9), it.d); }
        } else {
          f.vx = damp(f.vx, Math.sin(P.t * 5) * 70, 4, dt); f.vy = damp(f.vy, -170, 4, dt);
          f.dir = Math.sin(P.t * 5) > 0 ? 1 : -1;
          if (chance(dt * 12)) this.addBubble(f.x + rand(-16, 16), f.y + 20, rand(4, 8), f.fd);
          if (P.t > 0.4 && !P.popped) { P.popped = true; particles.popText(f.x, f.y - 50, 'Wheee!', '#ffffff', 36); this.cheerFor(f, 0.5); }
          if (f.y <= fishRange(f)[0] + 6 || P.t > 4) { emote(f, 'star', 1); this.endPlay(f); }
        }
        break;
      }
      case 'through': {
        const it = P.item;
        if (!this.decor.includes(it) || it.heldBy != null) { this.endPlay(f); break; }
        const d0 = it.def;
        if (d0.door) {
          const door = decorDoor(d0, it), dx = it.x + door.x * it.s, dy = it.y + door.y * it.s;
          f.tfd = clamp(it.d + 0.04, 0, 1);
          const d = steerTo(f, dx, dy, k.speed * 1.3 + 30, dt, 40, 4);
          if (d < 28 || P.t > 7) {
            f.hidden = rand(0.8, 1.3); f.vx = 0; f.vy = 0;
            particles.burst(dx, dy, { type: 'bubble', count: 5, colors: ['#ffffff'], speed: [40, 120] });
            sfx('swap', { vol: 0.35 });
          }
        } else {
          // swim through the arch's opening, just behind it
          const oy = it.y + d0.through.y * it.s, hw = d0.through.hw * it.s;
          if (P.stage === 0) {
            f.tfd = clamp(it.d - 0.03, 0, 1);
            const d = steerTo(f, it.x + P.side * (hw + 90), oy, k.speed * 1.2 + 30, dt, 40, 4);
            if (d < 30 || P.t > 6) { P.stage = 1; P.t = 0; }
          } else {
            f.tfd = clamp(it.d - 0.03, 0, 1);
            const d = steerTo(f, it.x - P.side * (hw + 110), oy, k.speed * 1.5 + 40, dt, 30, 4);
            if (P.t > 0.6 && !P.popped) { P.popped = true; this.cheerFor(f, 0.4); if (chance(0.4)) particles.popText(f.x, oy - 80, 'Swoosh!', '#ffffff', 32); }
            if (d < 30 || P.t > 5) { emote(f, 'happy', 1); this.endPlay(f); }
          }
        }
        break;
      }
      case 'chase': {
        const o = P.other;
        if (!o || o.gone || !this.fish.includes(o) || o.state !== 'play') { this.endPlay(f); break; }
        steerTo(f, o.x - o.dir * 40, o.y, k.speed * 1.5 + 50, dt, 30, 3);
        if (chance(dt * 1.5)) emote(f, 'note', 1);
        if (P.t > 0.5 && !P.popped) { P.popped = true; this.cheerFor(f, 0.3); }
        if (P.t > 3.5) { this.endPlay(f); if (o.play && o.play.other === f) this.endPlay(o); }
        break;
      }
      case 'chased': {
        const d = steerTo(f, f.tx, f.ty, k.speed * 1.5 + 50, dt, 30, 3);
        if (d < 40) { f.tx = clamp(f.x + rand(-500, 500), WATER.x0 + 80, WATER.x1 - 80); f.ty = bandY(f, rand(0.1, 0.9)); }
        if (P.t > 4) this.endPlay(f);
        break;
      }
      case 'kiss': case 'kissee': {
        const o = P.other;
        if (!o || o.gone || !this.fish.includes(o) || o.state !== 'play') { this.endPlay(f); break; }
        const side = f.x < o.x ? -1 : 1, s = fishScale(f.fd);
        f.tfd = 0.85;
        const d = steerTo(f, P.mx + side * f.kind.w * 0.42 * s, P.my, k.speed * 1.2 + 30, dt, 50, 3);
        if (d < 14) f.dir = -side;
        if (P.kind === 'kiss' && !P.kissed && d < 16 && Math.abs(o.x - (P.mx - side * o.kind.w * 0.42 * fishScale(o.fd))) < 18) {
          P.kissed = true; P.t = 0;
          particles.burst(P.mx, P.my - 10, { type: 'heart', count: 8, colors: ['#ff6fb1', '#ff8fc8', '#ffffff'] });
          snd('aq-kiss', 'bubble'); emote(f, 'heart', 1.4); emote(o, 'heart', 1.4);
          this.cheerFor(f, 0.6);
        }
        if ((P.kissed && P.t > 1.2) || P.t > 6) { this.endPlay(f); if (o.play && o.play.other === f) this.endPlay(o); }
        break;
      }
      case 'snuggle': {
        const it = P.item;
        if (!this.decor.includes(it) || it.heldBy != null) { this.endPlay(f); break; }
        f.tfd = clamp(it.d + 0.02, 0, 1);
        steerTo(f, it.x + Math.sin(P.t * 1.5) * 40 * it.s, it.y - 95 * it.s, k.speed, dt, 40, 3);
        if (P.t > 1.2 && !P.em) { P.em = true; emote(f, 'zzz', 2.5); }
        if (P.t > 5) this.endPlay(f);
        break;
      }
      case 'puff': {
        f.vx = damp(f.vx, 0, 3, dt); f.vy = damp(f.vy, 0, 3, dt);
        if (!P.puffed) { P.puffed = true; f.puffT = 2; f.bump = this.t; snd('aq-puff', 'grow', { vol: 0.35 }); this.cheerFor(f, 0.4); }
        if (P.t > 2.6) this.endPlay(f);
        break;
      }
      case 'bubbles': {
        f.vx = damp(f.vx, 0, 3, dt); f.vy = damp(f.vy, 0, 3, dt);
        if (!P.blown) { P.blown = true; this.blowBubbles(f, 4); }
        if (P.t > 1.4) this.endPlay(f);
        break;
      }
      default: this.endPlay(f);
    }
  }

  // ===========================================================================
  // Update
  update(dt) {
    this.t += dt; this.phaseT += dt;
    this.nightK = damp(this.nightK, this.night ? 1 : 0, 3, dt);
    this.bubbleSnd -= dt; this.reactT -= dt;
    if (this.sandFx) { this.sandFx.t += dt * 1.6; if (this.sandFx.t >= 1) this.sandFx = null; }
    if (this.toast) { this.toast.t += dt; if (this.toast.t > 2) this.toast = null; }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.4) this.banner = null; }
    for (const tp of this.taps) tp.t += dt;
    this.taps = this.taps.filter((tp) => tp.t < 0.8);
    for (const it of this.decor) {
      if (it.sink > 0 && it.heldBy == null) { it.sink = Math.max(0, it.sink - dt * (180 + it.sink * 2.2)); if (it.sink <= 0) { this.landDecor(it); sfx('land', { vol: 0.5 }); } }
      const litWant = this.night && (this.phase !== 'show' || this.phaseT > it.litAt) ? 1 : 0;
      if (litWant && it.lit < 0.05 && this.phase === 'show' && it.def.lights) { const c = this.decorCenter(it); particles.burst(c.x, c.y, { type: 'sparkle', count: 6, colors: ['#ffffff', '#fff6a8'] }); if (this.bubbleSnd <= 0) { sfx('sparkle', { vol: 0.35 }); this.bubbleSnd = 0.12; } }
      it.lit = damp(it.lit, litWant, 5, dt);
    }
    for (const st of this.stations) {
      st.reactT -= dt; st.selPop = Math.max(0, st.selPop - dt * 4); st.colPop = Math.max(0, st.colPop - dt * 4);
      if (st.bubble) { st.bubble.t += dt; if (st.bubble.t > st.bubble.dur) st.bubble = null; }
      st.feedCool -= dt; st.tapHeat = Math.max(0, st.tapHeat - dt * 0.9); st.shake = Math.max(0, (st.shake || 0) - dt);
    }
    this.updateBubbles(dt);
    this.updateFlakes(dt);
    this.updateFishAll(dt);
    if (this.phase === 'build') { this.updateDirector(dt); this.updateBuild(dt); }
    else if (this.phase === 'show') { if (this.groupT < 0) this.updateDirector(dt); this.updateShow(dt); }
    for (const st of this.stations) st.actor.update(dt);
  }

  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    this.nightK = damp(this.nightK, this.night ? 1 : 0, 3, dt);
    this.updateBubbles(dt);
    for (const f of this.fish) if (f.state !== 'held') integrate(f, dt, this);
    for (const st of this.stations) st.actor.update(dt);
  }

  updateBuild(dt) {
    this.timeLeft = Math.max(0, this.timeLeft - dt);   // waits at 0 for the "Time's up!" question
    // Mouse / touch drives the first human's hand.
    const ptr = input.pointer;
    const mouseSt = this.stations.find((s) => !s.p.isAI);
    for (const st of this.stations) st.click = false;
    if (mouseSt && ptr.seen) {
      if (ptr.moved) { mouseSt.cur.x = clamp(ptr.x, 4, W - 4); mouseSt.cur.y = clamp(ptr.y, 4, H - 4); }
      if (ptr.pressed) { mouseSt.cur.x = ptr.x; mouseSt.cur.y = ptr.y; mouseSt.click = true; }
    }
    for (const st of this.stations) {
      if (st.p.isAI) this.updateAI(st, dt);
      this.updateStation(st, dt);
      if (this.phase !== 'build') return;
    }
    if (!this.humans) {
      if (this.cpuNight > 0 && this.phaseT > this.cpuNight) { this.cpuNight = -1; const s0 = this.stations[this.stations.length - 1]; s0.ai.cmds.unshift({ t: 'goto', x: SWITCH.x, y: SWITCH.y }, { t: 'a' }); }
      // each CPU goes to Done (RB) and presses A when its part is finished (see updateAI)
    }
    // Every kid ready on Done (CPUs alone: every CPU) starts the night show.
    const kids = this.stations.filter((s) => (this.humans ? !s.p.isAI : true));
    if (kids.every((s) => s.ready)) { this.doneT = (this.doneT || 0) + dt; if (this.doneT > (this.humans ? 0.6 : 2)) this.startShow(); }
    else this.doneT = 0;
  }

  addTime(s) {
    this.timeLeft = Math.min(599, Math.max(0, this.timeLeft) + s);
    sfx('collect', { step: 6 }); sfx('star');
    particles.popText(CLOCK.x, CLOCK.y + 64, '+1 min', '#36d17a', 36);
    this.clockBump = this.t;
  }

  updateStation(st, dt) {
    const c = st.p.ctrl, isPad = c.kind === 'pad';
    if (st.naming) { this.updateNaming(st, dt); return; }
    // --- hand (stick; on controllers the D-pad makes the item and colour choices)
    const mx = isPad ? c.sx : c.x, my = isPad ? c.sy : c.y;
    const mag = Math.hypot(mx, my);
    st.hold = mag > 0.15 ? st.hold + dt : 0;
    const sp = 1150 * (0.35 + 0.65 * clamp(st.hold / 0.6, 0, 1));
    st.cur.x = clamp(st.cur.x + (mx * sp + c.rx * 200) * dt, 4, W - 4);
    st.cur.y = clamp(st.cur.y + (my * sp + c.ry * 200) * dt, 4, H - 4);
    const { x, y } = st.cur;
    st.cool -= dt;
    if (st.tab < TAP_TAB) { const a = GROUP_START[st.tab]; st.scroll = this.smoothScroll(st.scroll, st.sel - a, dt, GROUP_END[st.tab] - a); }
    st.tabPop = Math.max(0, st.tabPop - dt * 4);
    // --- ready for the show (on Done): B = not yet after all
    if (st.ready) {
      st.hover = null;
      if (c.pressed('b') || (st.click && inRect(st.panel, x, y))) this.setReady(st, false);
      return;
    }
    // --- categories: LB / RB (the last one is Done)
    const step = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
    if (step) this.stepTab(st, step);
    // --- things: X (or the D-pad left/right, with hold-repeat); colours: LT / RT (D-pad up/down)
    const dir = (isPad && c.held('right')) ? 1 : (isPad && c.held('left')) ? -1 : 0;
    if (dir !== st.rep.dir) { st.rep.dir = dir; st.rep.t = 0; if (dir) this.browse(st, dir); }
    else if (dir) { st.rep.t += dt; if (st.rep.t > 0.42) { st.rep.t -= 0.13; this.browse(st, dir); } }
    if (c.pressed('x')) this.browse(st, 1);
    if (c.pressed('rt') || (isPad && c.pressed('down'))) this.cycleColor(st, 1);
    if (c.pressed('lt') || (isPad && c.pressed('up'))) this.cycleColor(st, -1);
    // --- held things follow the hand
    if (st.held && st.held.type === 'decor') {
      const it = st.held.obj, pl = this.placement(it.def, x, y);
      it.x = pl.x; it.y = pl.y; it.d = pl.d; it.s = pl.s; it.sink = 0;
    }
    st.hover = null;
    if (!st.held && inTank(x, y)) {
      const f = this.hitFish(x, y);
      if (f && !f.naming) st.hover = { type: 'fish', obj: f };
      else { const it = this.hitDecor(x, y); if (it) st.hover = { type: 'decor', obj: it }; }
    }
    if (c.pressed('a') && st.tab === DONE && !st.held) this.setReady(st, true);
    else if (c.pressed('a') || st.click) this.pressA(st);
    if (c.pressed('b')) this.pressB(st);
    if (c.pressed('y')) {
      // keyboards have no spare colour keys (the arrows layout's LT / RT sit on the numpad), so there
      // Y recolours what the hand carries, or the bar's pick when the hand is down on the item bar
      if (c.kind === 'kb' && (st.held || y >= BAR.y - 6)) this.cycleColor(st, 1);
      else this.feed(st);
    }
  }

  updateNaming(st, dt) {
    const N = st.naming, c = st.p.ctrl, isPad = c.kind === 'pad';
    N.t += dt;
    if (!this.fish.includes(N.fish) || N.fish.state === 'leave') { st.naming = null; return; }
    if (st.p.isAI) {
      N.aiT -= dt;
      if (N.aiT <= 0) {
        if (chance(0.55) && (N.browsed || 0) < 3) { N.browsed = (N.browsed || 0) + 1; N.idx = (N.idx + 1) % N.names.length; N.pop = 1; N.aiT = rand(0.35, 0.8); }
        else this.confirmName(st);
      }
      return;
    }
    const sx = isPad ? c.sx : c.x;
    const dir = (c.held('rb') || c.held('right') || sx > 0.5) ? 1 : (c.held('lb') || c.held('left') || sx < -0.5) ? -1 : 0;
    if (dir !== st.rep.dir) { st.rep.dir = dir; st.rep.t = 0; if (dir) this.browseName(st, dir); }
    else if (dir) { st.rep.t += dt; if (st.rep.t > 0.45) { st.rep.t -= 0.25; this.browseName(st, dir); } }
    N.pop = Math.max(0, (N.pop || 0) - dt * 4);
    if (st.click) {
      const r = this.nameCard(st);
      if (inRect(r, st.cur.x, st.cur.y)) {
        if (st.cur.x < r.x + 60) this.browseName(st, -1);
        else if (st.cur.x > r.x + r.w - 60) this.browseName(st, 1);
        else this.confirmName(st);
        return;
      }
      this.confirmName(st); return;
    }
    if ((c.pressed('a') || c.pressed('b')) && N.t > 0.15) { this.confirmName(st); return; }
    if (N.t > 14) this.confirmName(st);
  }
  browseName(st, dir) {
    const N = st.naming; N.idx = (N.idx + dir + N.names.length) % N.names.length; N.pop = 1; N.t = Math.min(N.t, 8);
    sfx('move', { vol: 0.7 });
  }

  smoothScroll(cur, target, dt, N) {
    let d = target - cur;
    if (d > N / 2) cur += N; else if (d < -N / 2) cur -= N;
    d = target - cur;
    return Math.abs(d) < 0.01 ? target : cur + d * (1 - Math.exp(-16 * dt));
  }

  /** X / D-pad: the next (or previous) thing in this category. */
  browse(st, dir) {
    if (st.tab >= TAP_TAB) { if (!st.p.isAI && st.tab === TAP_TAB) sfx('blip'); return; }
    const g = st.tab, a = GROUP_START[g], n = GROUP_END[g] - a;
    st.sel = a + ((st.sel - a + dir + n) % n);
    st.selIn[g] = st.sel; st.selPop = 1;
    if (!st.p.isAI) sfx('move', { vol: 0.7 });
  }

  /** LB / RB: the next / previous category; the last one is "Done". */
  stepTab(st, dir) { this.setTab(st, (st.tab + dir + NTABS) % NTABS); }
  setTab(st, tab) {
    st.tab = tab; st.tabPop = 1;
    if (tab < TAP_TAB) { st.sel = st.selIn[tab]; st.selPop = 1; st.scroll = st.sel - GROUP_START[tab]; }
    if (!st.p.isAI) sfx('move');
  }

  /** On Done, A: ready for the show (B: not yet). Every kid ready starts it. */
  setReady(st, on) {
    if (st.ready === on) return;
    if (on && st.held) this.drop(st);
    st.ready = on;
    const a = st.actor;
    if (on) {
      sfx('ready'); a.playOnce('cheer', 0.6); a.squash(-0.25); this.say(st, 'Ready!', 1.3, 'ready');
      particles.burst(st.cur.x, st.cur.y, { type: 'confetti', count: 18, speed: [160, 420] });
      const kids = this.stations.filter((s) => !s.p.isAI), n = kids.filter((s) => s.ready).length;
      if (this.humans > 1 && n < kids.length) particles.popText(W - 220, 150, `Ready ${n}/${kids.length}!`, st.p.color, 38);
    } else { sfx('back'); a.setPose('idle'); }
  }

  previewColor(st, e) {
    if (e.ncol <= 1) return 0;
    return st.colorOf[e.key] ?? (st.i + e.key.length) % e.ncol;
  }

  cycleColor(st, dir) {
    if (st.held) {
      const o = st.held.obj, n = st.held.type === 'decor' ? o.def.colors.length : o.kind.colors.length;
      if (n <= 1) { sfx('blip'); return; }
      o.color = (o.color + dir + n) % n; o.bump = this.t;
      const col = st.held.type === 'decor' ? o.def.colors[o.color].c : o.kind.colors[o.color].c;
      const c = st.held.type === 'decor' ? this.decorCenter(o) : { x: o.x, y: o.y };
      particles.burst(c.x, c.y, { type: 'drop', count: 10, speed: [100, 260], colors: [col, '#ffffff'] });
      sfx('brush'); sfx('swap', { vol: 0.5 });
      return;
    }
    const e = PALETTE[st.sel];
    if (e.ncol <= 1) { if (!st.p.isAI) sfx('blip'); return; }
    st.colorOf[e.key] = (this.previewColor(st, e) + dir + e.ncol) % e.ncol;
    st.colPop = 1;
    if (!st.p.isAI) sfx('swap', { vol: 0.6 });
  }

  pressA(st) {
    const { x, y } = st.cur;
    if (st.held) { this.drop(st); return; }
    if (inRect(CLOCK_PLUS, x, y) && !st.p.isAI) { this.addTime(60); return; }
    if (inRect(SWITCH_HIT, x, y)) { this.toggleNight(st); return; }
    if (y >= BAR.y - 6) { this.panelClick(st, x, y); return; }
    if (!st.p.isAI && x >= LEGEND.x && x <= LEGEND.x + LEGEND.w && y >= LEGEND.y && y <= LEGEND.y + LEGEND_ROWS.length * 50 + 24) {
      const b = LEGEND_ROWS[clamp(Math.floor((y - LEGEND.y - 12) / 50), 0, LEGEND_ROWS.length - 1)][0][0];
      if (b === 'lb') this.stepTab(st, 1); else if (b === 'x') this.browse(st, 1); else if (b === 'lt') this.cycleColor(st, 1); else sfx('blip');
      return;
    }
    if (st.tab === TAP_TAB) { this.tap(st); return; }
    if (st.tab === DONE) { sfx('blip'); return; }
    if (st.hover && (!st.p.isAI || st.hover.obj.owner === st.i)) { this.grab(st, st.hover); return; }
    this.placeSelected(st);
  }

  panelClick(st, x, y) {
    const P = st.panel;
    if (!inRect(P, x, y)) { sfx('blip'); return; }
    const L = this.panelLayout(st);
    if (Math.hypot(x - L.catX, y - L.catY) < 40) { this.stepTab(st, 1); return; }   // the category button
    if (st.tab === DONE) { this.setReady(st, true); return; }
    if (st.tab === TAP_TAB) { this.toast = { text: 'Point at the glass and press A!', t: 0 }; sfx('blip'); return; }
    if (y > P.y + P.h - 30) { this.cycleColor(st, 1); return; }
    if (x < L.c0 + (L.c1 - L.c0) * 0.3) this.browse(st, -1); else if (x > L.c0 + (L.c1 - L.c0) * 0.7) this.browse(st, 1); else this.placeHint(st);
  }
  placeHint(st) { this.toast = { text: 'Point into the tank and press A!', t: 0 }; sfx('blip'); }

  placeSelected(st) {
    const e = PALETTE[st.sel], { x, y } = st.cur;
    if (!inTank(x, y)) { sfx('blip'); return; }
    if (e.kind === 'sand') {
      if (st.p.isAI && this.humans) { sfx('blip'); return; }
      this.setSand(e.idx, st); return;
    }
    if (e.kind === 'decor') {
      if (this.decor.length >= MAX_DECOR) { this.toast = { text: 'The tank is full! Remove something with B.', t: 0 }; sfx('blip'); return; }
      const d = e.def, pl = this.placement(d, x, y);
      this.addDecor(d, pl, st, this.previewColor(st, e), y);
      st.cool = 0.12;
      return;
    }
    if (this.fish.filter((f) => f.state !== 'leave').length >= MAX_FISH) { this.toast = { text: 'So many fish! Say bye to one with B.', t: 0 }; sfx('blip'); return; }
    this.addFish(e.def, this.previewColor(st, e), x, y, st);
  }

  setSand(idx, st) {
    if (idx === this.sand) { sfx('blip'); return; }
    this.sandFx = { from: this.sand, t: 0 };
    this.sand = idx;
    sfx('magic'); snd('aq-sand', 'brush');
    for (let k = 0; k < 12; k++) particles.burst(rand(WATER.x0, WATER.x1), rand(BASE_Y0, BASE_Y1), { type: 'sparkle', count: 1, colors: SANDS[idx].specks });
    if (st) st.actor.playOnce('cheer', 0.5);
  }

  grab(st, h) {
    if (h.type === 'decor') {
      const it = h.obj; if (it.heldBy != null) { sfx('blip'); return; }
      it.heldBy = st.i; it.sink = 0;
      for (const f of this.fish) { if (f.holdPlant === it) f.holdPlant = null; if (f.play && f.play.item === it) this.endPlay(f); }
      for (let k = 0; k < 6; k++) this.addBubble(it.x + rand(-30, 30) * it.s, it.y - 10, rand(3, 7), it.d);
    } else {
      const f = h.obj; if (f.held != null) { sfx('blip'); return; }
      f.held = st.i; f.state = 'held'; f.play = null; f.holdPlant = null; f.hidden = 0;
      emote(f, 'happy', 1.2); f.showName = 2;
      snd('aq-wiggle', 'squeak', { vol: 0.4 });
    }
    st.held = h; st.hover = null;
    sfx('bubble'); sfx('swap', { vol: 0.6 });
    st.actor.playOnce('action', 0.35);
  }

  drop(st) {
    const h = st.held; if (!h) return;
    st.held = null;
    if (h.type === 'decor') {
      const it = h.obj; it.heldBy = null; it.bump = this.t;
      this.landDecor(it); sfx('land'); sfx('pop', { vol: 0.5 });
    } else {
      const f = h.obj; f.held = null; f.state = 'play'; f.play = { kind: 'loop', t: 0, cx: f.x, cy: f.y - 40, a0: Math.PI / 2 };
      f.happy = 1; emote(f, 'heart', 1.2);
      particles.burst(f.x, f.y, { type: 'bubble', count: 8, colors: ['#ffffff'], speed: [60, 160] });
      sfx('bubble');
    }
  }


  /** Another kid's fish or decoration: you may move it, but only its owner can take it away. */
  othersThing(st, obj) {
    const o = this.stations[obj.owner];
    return !st.p.isAI && o && o !== st && !o.p.isAI;
  }
  notYours(st, obj) {
    const o = this.stations[obj.owner];
    particles.popText(st.cur.x, st.cur.y - 50, `${o.p.tag}'s!`, o.p.color, 40);
    sfx('blip');
  }

  pressB(st) {
    if (st.held && this.othersThing(st, st.held.obj)) { const obj = st.held.obj; this.drop(st); this.notYours(st, obj); return; }
    if (st.held) {
      const h = st.held; st.held = null;
      if (h.type === 'decor') { h.obj.heldBy = null; this.removeDecor(h.obj, st); }
      else { h.obj.held = null; this.removeFish(h.obj, st); }
      return;
    }
    const h = st.hover;
    if (h && this.othersThing(st, h.obj)) { this.notYours(st, h.obj); return; }
    if (h && (!st.p.isAI || h.obj.owner === st.i)) {
      if (h.type === 'decor') this.removeDecor(h.obj, st); else this.removeFish(h.obj, st);
      return;
    }
    sfx('blip');
  }

  toggleNight(st) {
    this.night = !this.night;
    this.switchUsed = true; this.switchBump = this.t;
    sfx('flip'); sfx(this.night ? 'magic' : 'sparkle');
    particles.burst(SWITCH.x, SWITCH.y, { type: 'sparkle', count: 10, colors: ['#ffffff', '#fff6a8'] });
    for (const s2 of this.stations) { s2.actor.playOnce('surprised', 0.4); s2.actor.emote(this.night ? 'star' : 'sparkle', 1.2); }
    if (this.night) later(() => { if (!this.finished && this.night) { const s2 = pick(this.stations); this.say(s2, 'Ooh, glowy!', 1.3, 'gasp'); } }, 600);
  }

  // --- CPU helpers ------------------------------------------------------------------------------
  cpuCap(st, what) {
    const lvl = st.p.aiLevel || 0;
    if (this.humans) return what === 'decor' ? 2 + lvl : 1 + (lvl > 0 ? 1 : 0);
    return what === 'decor' ? clamp(Math.round(16 / this.n), 3, 11) : clamp(Math.round(11 / this.n), 2, 6);
  }

  updateAI(st, dt) {
    const c = st.p.ctrl, A = st.ai, prof = aiProfile(st.p);
    if (st.naming) { c.move(0, 0); return; }
    if (A.wait > 0) { A.wait -= dt; c.move(0, 0); return; }
    if (st.ready) return;
    if (!A.cmds.length) {
      c.move(0, 0);
      A.idle -= dt;
      if (A.idle > 0) return;
      A.cmds = this.planFor(st);
      // CPUs alone, their part finished: on to Done (RB) and A
      if (!A.cmds.length && !this.humans && A.decor >= this.cpuCap(st, 'decor') && A.fish >= this.cpuCap(st, 'fish') && this.phaseT > 12 && this.cpuNight < 0) A.cmds = [{ t: 'done' }];
      A.idle = this.humans ? rand(6, 11) / prof.speed : rand(0.3, 0.8);
      if (!A.cmds.length) A.idle = this.humans ? 5 : rand(1.5, 3);
      return;
    }
    const cmd = A.cmds[0];
    const done = (w = 0.15) => { A.cmds.shift(); A.wait = w / prof.speed; };
    switch (cmd.t) {
      case 'sel': {   // RB / LB to the thing's category, then X to the thing
        const gi = groupOf(cmd.v);
        if (st.sel === cmd.v && st.tab === gi) { done(0.2); break; }
        if (st.tab !== gi) { const r = (gi - st.tab + NTABS) % NTABS; c.press(r <= NTABS / 2 ? 'rb' : 'lb'); }
        else c.press('x');
        A.wait = (this.humans ? rand(0.09, 0.15) : rand(0.05, 0.08)) / prof.speed;
        break;
      }
      case 'tab': {   // RB / LB to a category (the Tap one, or Done)
        if (st.tab === cmd.v) { done(0.1); break; }
        const r = (cmd.v - st.tab + NTABS) % NTABS; c.press(r <= NTABS / 2 ? 'rb' : 'lb');
        A.wait = rand(0.1, 0.18) / prof.speed;
        break;
      }
      case 'done':   // RB to Done, then A
        if (st.held) { c.press('a'); A.wait = 0.3; break; }
        if (st.tab !== DONE) { c.press('rb'); A.wait = rand(0.12, 0.2) / prof.speed; break; }
        c.press('a'); done(0.3);
        break;
      case 'col': {
        const e = PALETTE[st.sel];
        if (e.ncol <= 1 || this.previewColor(st, e) === cmd.v) { done(0.15); break; }
        c.press('rt'); A.wait = rand(0.15, 0.25) / prof.speed;
        break;
      }
      case 'goto': {
        const d = steer(st.p, st.cur.x, st.cur.y, cmd.x, cmd.y, { arrive: 130, wobble: false });
        cmd.t2 = (cmd.t2 || 0) + dt;
        if (d < 12 || cmd.t2 > 4) { c.move(0, 0); done(0.25); }
        break;
      }
      case 'gotofish': {
        const f = cmd.f;
        if (!this.fish.includes(f)) { A.cmds = []; break; }
        const d = steer(st.p, st.cur.x, st.cur.y, f.x, f.y - 160, { arrive: 130, wobble: false });
        cmd.t2 = (cmd.t2 || 0) + dt;
        if (d < 30 || cmd.t2 > 4) { c.move(0, 0); done(0.2); }
        break;
      }
      case 'a': {
        if (cmd.count) { const e = PALETTE[st.sel]; if (e.kind === 'decor') A.decor++; else if (e.kind === 'fish') A.fish++; }
        st.hover = null;   // CPUs place; they never grab by accident
        if (cmd.count || cmd.raw) this.placeSelected(st); else c.press('a');
        done(0.5); break;
      }
      case 'y': c.press('y'); done(0.5); break;
      case 'tap': c.press('a'); done(0.9); break;   // on the Tap category
      default: done();
    }
  }

  planFor(st) {
    const A = st.ai, cmds = [];
    // Alone (CPUs only): one CPU picks the sand first.
    if (!this.humans && st.i === 0 && !A.sand && chance(0.85)) {
      A.sand = true;
      const idx = 1 + Math.floor(Math.random() * (SANDS.length - 1));
      cmds.push({ t: 'sel', v: PAL_INDEX['sand' + idx] }, { t: 'goto', x: rand(600, 1300), y: rand(500, 800) }, { t: 'a', raw: true });
      return cmds;
    }
    const r = Math.random();
    const fishList = this.fish.filter((f) => f.state !== 'leave');
    if (fishList.length && r < (this.humans ? 0.25 : 0.14) && (A.extra < (this.humans ? 4 : 3))) {
      A.extra++;
      const f = pick(fishList);
      cmds.push({ t: 'gotofish', f }, { t: 'y' });
      if (chance(0.4)) cmds.push({ t: 'y' });
      return cmds;
    }
    if (fishList.length && r < (this.humans ? 0.32 : 0.2) && A.extra < 4) {
      A.extra++;
      const f = pick(fishList);
      cmds.push({ t: 'tab', v: TAP_TAB }, { t: 'goto', x: clamp(f.x + rand(-120, 120), WATER.x0 + 60, WATER.x1 - 60), y: clamp(f.y + rand(-60, 60), WATER.y0 + 60, 700) }, { t: 'tap' });
      return cmds;
    }
    const decorLeft = A.decor < this.cpuCap(st, 'decor'), fishLeft = A.fish < this.cpuCap(st, 'fish');
    if (!decorLeft && !fishLeft) return cmds;
    const wantFish = fishLeft && (!decorLeft || chance(this.decor.length > 4 ? 0.45 : 0.15));
    if (wantFish) {
      if (this.fish.length >= MAX_FISH) { A.fish = 99; return cmds; }
      const have = (k) => this.fish.filter((f) => f.kind === k).length;
      const wts = KINDS.map((k) => k.cpu * (have(k) ? 0.4 / have(k) : 1) * (k.id === 'clownfish' && this.decor.some((d) => d.def.anemone) ? 2 : 1));
      const k = KINDS[this.weighted(wts)];
      const x = rand(WATER.x0 + 120, WATER.x1 - 120), y = rand(WATER.y0 + 120, 640);
      if (this.nearHuman(x, y)) return cmds;
      cmds.push({ t: 'sel', v: PAL_INDEX[k.id] }, { t: 'col', v: Math.floor(Math.random() * k.colors.length) }, { t: 'goto', x, y }, { t: 'a', count: true });
      return cmds;
    }
    if (this.decor.length >= MAX_DECOR) { A.decor = 99; return cmds; }
    const have = (d) => this.decor.filter((i) => i.def === d).length;
    const wts = DECOR.map((d) => {
      let w = d.cpu * (have(d) ? 0.3 / have(d) : 1);
      if (d.group === 'plants' && this.decor.filter((i) => i.def.group === 'plants').length < 3) w *= 2;
      if (d.id === 'castle' && have(d)) w *= 0.2;
      if (d.bubbler && !this.decor.some((i) => i.def.bubbler)) w *= 2;
      return w;
    });
    const d = DECOR[this.weighted(wts)];
    const spot = this.findDecorSpot(d);
    if (!spot) return cmds;
    cmds.push({ t: 'sel', v: PAL_INDEX[d.id] }, { t: 'col', v: Math.floor(Math.random() * d.colors.length) }, { t: 'goto', x: spot.x, y: spot.y }, { t: 'a', count: true });
    return cmds;
  }

  weighted(wts) {
    let k = Math.random() * wts.reduce((a, b) => a + b, 0);
    for (let i = 0; i < wts.length; i++) { k -= wts[i]; if (k <= 0) return i; }
    return 0;
  }
  nearHuman(x, y) { return this.stations.some((h) => !h.p.isAI && Math.hypot(h.cur.x - x, h.cur.y - y) < 230); }

  findDecorSpot(d) {
    for (let k = 0; k < 50; k++) {
      const dd = d.h > 200 ? rand(0, 0.45) : d.small ? rand(0.45, 1) : rand(0.1, 0.9);
      const y = yOfDepth(dd), s = decorScale(dd);
      const half = d.w / 2 * s * 0.8;
      const x = rand(WATER.x0 + half + 10, WATER.x1 - half - 10);
      const clash = this.decor.some((i) => Math.abs(i.x - x) < (i.def.w * i.s + d.w * s) * 0.36 && Math.abs(i.y - y) < 46);
      if (clash || this.nearHuman(x, y)) continue;
      return { x, y };
    }
    return null;
  }

  // ===========================================================================
  // Night show
  startShow() {
    if (this.phase !== 'build') return;
    this.phase = 'show'; this.phaseT = 0;
    for (const st of this.stations) {
      if (st.naming) this.confirmName(st);
      if (st.held) this.drop(st);
      st.hover = null;
      if (st.p.isAI) { st.p.ctrl.move(0, 0); st.p.ctrl.hold('a', false); st.ai.cmds = []; }
    }
    this.night = true;
    // the lights come on one by one, left to right
    const lights = this.decor.filter((it) => it.def.lights).sort((a, b) => a.x - b.x);
    lights.forEach((it, i) => { it.litAt = 1.2 + i * Math.min(0.22, 2.4 / Math.max(1, lights.length)); });
    for (const it of this.decor) if (!it.def.lights) it.litAt = 1;
    this.banner = { text: 'Night show!', t: 0 };
    sfx('flip'); sfx('magic'); snd('applause', 'cheer');
    // characters walk to the front of the tank
    const n = this.n, sp = Math.min(230, 1560 / n);
    this.stations.forEach((st, i) => {
      const a = st.actor;
      a.scale = 1;
      const base = Math.min((n > 5 ? 130 : 150) / a.leader.h, (n > 5 ? 150 : 180) / Math.max(1, a.width));
      st.show = { x: 960 + (i - (n - 1) / 2) * sp, y: ROW_Y - (i % 2) * (n > 5 ? 10 : 0), base, state: 'walk', vz: 0, poseCD: 0 };
    });
    // close-ups: everyone's favourite fish (up to 4), plus a few more for small groups
    const shots = [];
    for (const st of this.stations) {
      if (shots.length >= 4) break;
      const fav = this.fish.find((f) => f.owner === st.i && f.state !== 'leave');
      if (fav) shots.push({ fish: fav, st });
    }
    const extra = shuffle(this.fish.filter((f) => f.state !== 'leave' && !shots.some((s) => s.fish === f)));
    while (shots.length < Math.min(3, this.fish.length) && extra.length) shots.push({ fish: extra.shift(), st: null });
    if (shots.length < 2) {
      const glowy = shuffle(this.decor.filter((it) => it.def.lights || it.def.group === 'castles'));
      for (const it of glowy.slice(0, 2 - shots.length)) shots.push({ item: it, st: this.stations[it.owner] || null });
    }
    this.shots = shots;
    this.shotIdx = -1; this.shotT = 0; this.groupT = -1;
  }

  updateShow(dt) {
    const t = this.phaseT;
    for (const st of this.stations) {
      const S = st.show, a = st.actor;
      if (!S) continue;
      if (S.state === 'walk') {
        const dx = S.x - a.x, dy = S.y - a.y, d = Math.hypot(dx, dy), sp = 520;
        a.scale = damp(a.scale, S.base, 4, dt);
        if (d < sp * dt + 1) { a.x = S.x; a.y = S.y; S.state = 'watch'; a.facing = a.x < 960 ? 1 : -1; a.setPose('idle'); }
        else { a.x += dx / d * sp * dt; a.y += dy / d * sp * dt; a.moveAnim(dx / d * sp, dy / d * sp, sp); }
      } else if (S.state === 'watch') {
        a.scale = damp(a.scale, S.base, 4, dt);
        if (chance(dt * 0.25) && !a._once) a.playOnce(pick(['cheer', 'wave', 'point', 'dance', 'clap']), 1.2);
      } else if (S.state === 'cheese') {
        if (!this.bigPhoto) this.cheeseMove(st, dt);
        else { S.vz -= 2800 * dt; a.z = Math.max(0, a.z + S.vz * dt); if (a.z <= 0) S.vz = 0; }
      }
    }
    const cam = this.api.camera;
    if (t < 2.6) return;
    if (this.shotIdx < 0) { this.shotIdx = 0; this.shotT = 0; }
    this.shotT += dt;
    if (this.shotIdx < this.shots.length) {
      const shot = this.shots[this.shotIdx];
      const alive = shot.fish ? this.fish.includes(shot.fish) : this.decor.includes(shot.item);
      if (!alive) { this.shotIdx++; this.shotT = 0; return; }
      let fx0, fy;
      if (shot.fish) { const f = shot.fish; fx0 = f.x; fy = f.y; if (!shot.held) { shot.held = true; f.state = 'look'; f.st = 2.2; f.tx = f.x; f.ty = f.y; f.lookX = f.x + 1; f.lookY = f.y; f.tfd = 0.98; f.play = null; f.hidden = 0; f.showName = 2.2; } }
      else { const c = this.decorCenter(shot.item); fx0 = c.x; fy = c.y; }
      const zoom = Math.min(1.9, cam.maxZoom);
      cam.follow(clamp(fx0, W / (2 * zoom), W - W / (2 * zoom)), clamp(fy, H / (2 * zoom), H - H / (2 * zoom)), zoom, 4);
      if (this.shotT > 0.5 && !shot.cheered) {
        shot.cheered = true;
        if (shot.fish) { emote(shot.fish, 'heart', 1.4); shot.fish.happy = 1.5; if (shot.fish.kind.id === 'puffer') shot.fish.puffT = 1.2; }
        if (shot.st) { shot.st.actor.playOnce('cheer', 1); if (shot.fish) shot.st.actor.say(this.fishName(shot.fish) + '!', 1.4, 'yay'); }
      }
      if (this.shotT > 1.35 && !shot.snapped) { shot.snapped = true; this.snap(fx0, fy, shot); }
      if (this.shotT > 2.1) { this.shotIdx++; this.shotT = 0; }
    } else if (this.groupT < 0) {
      this.groupT = 0;
      cam.follow(W / 2, H / 2, 1, 3);
      this.banner = { text: 'Group photo!', t: 0 };
      // fish line up in the middle of the tank, characters strike poses in front
      const live = this.fish.filter((f) => f.state !== 'leave');
      const cols = Math.min(7, Math.max(3, Math.ceil(Math.sqrt(live.length * 2)))), rows = Math.ceil(live.length / cols);
      live.forEach((f, i) => {
        const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, live.length - r * cols);
        f.state = 'pose'; f.play = null; f.hidden = 0; f.holdPlant = null; f.food = null;
        f.tx = 960 + (c - (inRow - 1) / 2) * Math.min(190, 1100 / cols) + (r % 2) * 40;
        f.ty = lerp(330, 640, rows <= 1 ? 0.5 : r / (rows - 1)); f.poseD = 0.9 - r * 0.05;
      });
      for (const st of this.stations) { const S = st.show; S.state = 'cheese'; S.vz = 0; st.actor.z = 0; st.actor.x = S.x; st.actor.y = S.y; st.actor.scale = S.base; st.actor.facing = S.x < 960 ? 1 : -1; st.actor.setPose('wave'); }
    } else {
      const g0 = this.groupT;
      this.groupT += dt;
      if (g0 < LINEUP && this.groupT >= LINEUP) { this.banner = { text: 'Say cheese!', t: 0 }; sfx('giggle'); }
      const shot = LINEUP + CHEESE_TIME;
      for (const d of [3, 2, 1]) if (g0 < shot - d && this.groupT >= shot - d) sfx(d === 1 ? 'tock' : 'tick');
      if (this.groupT >= shot && !this.bigPhoto) {
        this.banner = null;
        for (const f of this.fish) { emote(f, 'heart', 1.5); f.happy = 2; }
        this.bigPhoto = { img: this.renderPhoto(W / 2, 600, 1.1, 1040, 585), t: 0 };
        snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.45);
        later(() => { if (!this.finished) { particles.confettiRain(W, 150); snd('applause', 'cheer'); sfx('yay'); } }, 350);
      }
      if (this.bigPhoto) {
        const before = this.bigPhoto.t;
        this.bigPhoto.t += dt;
        if (before < PHOTO_PIN + PHOTO_FLY && this.bigPhoto.t >= PHOTO_PIN + PHOTO_FLY) { sfx('pop'); particles.burst(PIN.x, PIN.y + 60, { type: 'sparkle', count: 10, colors: ['#fff', '#ffd23f'] }); }
        if (this.bigPhoto.t > PHOTO_PIN + PHOTO_FLY + 1.6 || (this.bigPhoto.t > 1.5 && this.players.some((p) => !p.isAI && p.ctrl.pressed('a')))) this.finishGame();
      }
    }
    for (const ph of this.photos) ph.t += dt;
    if (t > 60) this.finishGame();
  }

  /** "Say cheese!": stick moves along the front, A jumps, every other button strikes a pose. */
  cheeseMove(st, dt) {
    const S = st.show, a = st.actor, c = st.p.ctrl;
    S.poseCD = Math.max(0, S.poseCD - dt);
    let { x: mx, y: my } = photoMove(c), jump = c.pressed('a'), pose = photoPosePressed(c);
    if (st.p.isAI) {
      S.aiT = (S.aiT ?? rand(0.2, 0.8)) - dt;
      if (S.aiT <= 0) { S.aiT = rand(0.5, 1.3); S.aiM = chance(0.4) ? [rand(-0.8, 0.8), rand(-0.5, 0.5)] : [0, 0]; if (chance(0.35)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      [mx, my] = S.aiM || [0, 0];
      if (Math.abs(a.x - S.x) > 110) mx = Math.sign(S.x - a.x) * 0.6;
    }
    const d = Math.hypot(mx, my); if (d > 1) { mx /= d; my /= d; }
    const sp = 460;
    a.y = clamp(a.y + my * sp * 0.4 * dt, ROW_Y - 40, ROW_Y + 16);
    a.x = clamp(a.x + mx * sp * dt, 90, W - 90);
    if (jump && a.z <= 0) { S.vz = 980; snd('boing', 'jump', { vol: 0.35 }); a.squash(-0.25); }
    S.vz -= 2800 * dt; a.z = Math.max(0, a.z + S.vz * dt);
    if (a.z <= 0 && S.vz < 0) { if (S.vz < -200) a.squash(0.2); S.vz = 0; }
    if (pose && S.poseCD <= 0) { S.poseCD = 0.35; strikePhotoPose(a, pose, { onBump: (who) => this.bumpNeighbours(st, who) }); }
    if (a.z > 0) { if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1; if (!a._once) a.setPose('jump'); }
    else a.moveAnim(mx * sp, my * sp, sp);
  }

  bumpNeighbours(st, a) {
    for (const o of this.stations) {
      if (o === st || !o.show || o.show.state !== 'cheese') continue;
      const b = o.actor, dx = b.x - a.x;
      if (Math.abs(dx) < (a.width + b.width) * 0.45 && Math.abs(b.y - a.y) < 60) {
        b.x = clamp(b.x + Math.sign(dx || 1) * 70, 90, W - 90);
        b.playOnce('surprised', 0.8, 'idle'); b.squash(0.2); o.show.vz = Math.max(o.show.vz, 300);
      }
    }
    sfx('boing', { vol: 0.4 });
  }

  snap(cx, cy, shot) {
    const img = this.renderPhoto(cx, cy, 3, 384, 240);
    const slots = [[160, 300, -0.1], [W - 160, 300, 0.09], [160, 640, 0.07], [W - 160, 640, -0.08]];
    const k = this.photos.length % 4;
    const caption = shot.fish ? this.fishName(shot.fish) : shot.item.def.name;
    const sub = shot.fish ? 'the ' + shot.fish.kind.name.replace(/s$/, '') : '';
    this.photos.push({ img, x: slots[k][0], y: slots[k][1], rot: slots[k][2], t: 0, caption, sub, color: shot.st ? shot.st.p.color : '#36c6d3' });
    snd('camera-flash', 'shutter'); fx.flash('#ffffff', 0.3);
  }

  renderPhoto(cx, cy, zoom, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const k = w / (W / zoom);
    g.setTransform(k, 0, 0, k, w / 2 - cx * k, h / 2 - cy * k);
    const nk = this.nightK;
    this.nightK = nk * 0.55;   // the flash lights the tank up a little
    try { this.drawWorld(g, { photo: true }); } catch (e) { console.warn(e); }
    this.nightK = nk;
    return c;
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((st) => {
      const s = st.stats, parts = [];
      const named = this.fish.filter((f) => f.owner === st.i && f.state !== 'leave');
      if (named.length === 1) parts.push(named[0].name);
      else if (s.fish) parts.push(`${s.fish} fish`);
      if (s.decor) parts.push(`${s.decor} decoration${s.decor === 1 ? '' : 's'}`);
      if (s.fed) parts.push(`${s.fed} snack${s.fed === 1 ? '' : 's'}`);
      return (this.n > 4 ? parts.slice(0, 1) : parts.slice(0, 2)).join(' · ') || 'Fish friend!';
    });
    this.api.finishTogether({ stats, title: 'Dreamy aquarium!', focus: { x: W / 2, y: H / 2, zoom: 1.08 } });
  }

  onDone() {
    if (this.phase === 'build') this.startShow();
    else if (this.groupT >= LINEUP && !this.bigPhoto) this.groupT = Math.max(this.groupT, LINEUP + CHEESE_TIME - 0.5);
    else this.finishGame();
  }

  // ===========================================================================
  // Drawing
  draw(g) { this.drawWorld(g); }

  drawWorld(g, o = {}) {
    const env = this.env;
    drawRoom(g);
    drawTitle(g);
    drawWaterBack(g, this.t);
    drawSand(g, this.sand, this.sandFx ? this.sandFx.from : null, this.sandFx ? ease.inOutQuad(this.sandFx.t) : 1);
    g.save();
    g.beginPath(); g.rect(WATER.x0, WATER.y0 - 30, WATER.x1 - WATER.x0, WATER.y1 - WATER.y0 + 30); g.clip();
    const order = [];
    for (const it of this.decor) if (it.heldBy == null) order.push({ key: it.d, it });
    for (const f of this.fish) order.push({ key: f.state === 'held' ? 2 : f.fd, f });
    order.sort((a, b) => a.key - b.key);
    for (const e of order) {
      if (e.it) this.drawOneDecor(g, e.it, env);
      else drawFish(g, e.f, env, o);
    }
    this.drawFlakes(g);
    this.drawBubbles(g);
    g.restore();
    drawSurface(g, this.t);
    drawTankFront(g, this.t, this.nightK);
    this.drawNight(g, order, env);
    if (this.nightK > 0.01) drawLidLights(g, this.t, this.nightK);
    if (this.phase === 'build') drawSwitch(g, this.t, this.night, clamp(1 - (this.t - this.switchBump) / 0.3, 0, 1), !this.switchUsed);
    for (const tp of this.taps) {
      const p = tp.t / 0.8;
      g.save(); g.globalAlpha = 1 - p; g.strokeStyle = '#ffffff'; g.lineWidth = 5 * (1 - p) + 1;
      for (const k of [0, 0.25]) { const r = 12 + (p + k) * 70; g.beginPath(); g.arc(tp.x, tp.y, r, 0, TAU); g.stroke(); }
      g.restore();
    }
    // characters
    const acts = this.stations.slice().sort((a, b) => a.actor.y - b.actor.y);
    for (const st of acts) st.actor.draw(g, { ring: o.photo ? null : st.p.color });
    if (!o.photo) {
      for (const st of acts) {
        if (!st.bubble) continue;
        const a = st.actor, y = a.y - a.z - a.height * 0.8;
        if (a.x < W / 2) drawSpeech(g, st.bubble.text, a.x + a.width * 0.25, y, 1, st.bubble.t, st.bubble.dur, 1, 'left');
        else {
          g.save(); g.font = '700 30px Fredoka, "Baloo 2", system-ui, sans-serif'; const w = Math.max(70, g.measureText(st.bubble.text).width + 36); g.restore();
          drawSpeech(g, st.bubble.text, Math.min(a.x, W - w / 2 - 12), a.y - a.z - a.height - 6, 1, st.bubble.t, st.bubble.dur, 1);
        }
      }
    }
  }

  drawOneDecor(g, it, env, alpha = 1, lift = 0) {
    const d = it.def, s = it.s;
    const age = this.t - it.born, pop = age < 0.35 ? ease.outBack(clamp(age / 0.35, 0, 1)) : 1;
    const b = this.t - it.bump, sq = b >= 0 && b < 0.7 ? Math.sin(b * 22) * Math.exp(-b * 7) * 0.16 : 0;
    const y = it.y - it.sink - lift;
    if (alpha === 1 && !it.sink && !lift) {
      g.save(); g.globalAlpha = 0.16; g.fillStyle = NAVY;
      g.beginPath(); g.ellipse(it.x, it.y + 2, d.w * 0.4 * s, Math.max(5, 10 * s), 0, 0, TAU); g.fill(); g.restore();
    }
    g.save();
    g.globalAlpha *= alpha;
    g.translate(it.x, y);
    if (it.sink > 0) g.rotate(Math.sin(this.t * 6 + it.seed * 9) * 0.08);
    g.scale(s * pop * (1 + sq), s * pop * (1 - sq));
    drawDecor(g, d, it, env);
    g.restore();
  }

  drawBubbles(g) {
    g.save(); g.lineWidth = 2.2; g.strokeStyle = 'rgba(255,255,255,0.85)';
    for (const b of this.bubbles) {
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU);
      g.fillStyle = 'rgba(220,250,255,0.25)'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(1, b.r * 0.25), 0, TAU); g.fill();
    }
    g.restore();
  }

  drawFlakes(g) {
    for (const k of this.flakes) {
      g.save(); g.translate(k.x, k.y); g.rotate(k.rot);
      g.globalAlpha = k.t > 12 ? clamp((14 - k.t) / 2, 0, 1) : 1;
      g.fillStyle = k.color; g.beginPath(); g.moveTo(-6, -3); g.lineTo(5, -5); g.lineTo(6, 3); g.lineTo(-4, 5); g.closePath(); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = NAVY; g.stroke();
      g.restore();
    }
  }

  drawNight(g, order, env) {
    const k = this.nightK;
    if (k < 0.01) return;
    drawNightShade(g, k);
    g.save();
    g.beginPath(); g.rect(WATER.x0, WATER.y0 - 20, WATER.x1 - WATER.x0, WATER.y1 - WATER.y0 + 20); g.clip();
    g.globalCompositeOperation = 'screen';
    for (const e of order) {
      if (e.it) {
        const it = e.it; if (it.lit < 0.02) continue;
        for (const [lx, ly, r, c] of decorLights(it.def, it)) {
          const flick = 1 + Math.sin(this.t * 6 + it.seed * 20) * 0.03;
          glow(g, c, it.x + lx * it.s, it.y - it.sink + ly * it.s, r * it.s * flick, k * it.lit * 0.85);
        }
      } else if (e.f.hidden <= 0) {
        const c = fishGlowColor(e.f), s = fishScale(e.f.fd);
        if (c) { glow(g, c, e.f.x, e.f.y, (e.f.kind.jelly ? 120 : 60) * s, k * 0.8); if (e.f.mates) for (const m of e.f.mates) glow(g, c, m.x, m.y, 50 * s, k * 0.7); }
        else glow(g, '#9fd8ff', e.f.x, e.f.y, 70 * s, k * 0.18);
      }
    }
    for (const b of this.bubbles) if (b.r > 6) glow(g, '#bfe8ff', b.x, b.y, b.r * 3, k * 0.25);
    g.restore();
    g.save();
    g.beginPath(); g.rect(WATER.x0, WATER.y0 - 20, WATER.x1 - WATER.x0, WATER.y1 - WATER.y0 + 20); g.clip();
    for (const e of order) {
      if (e.it) {
        const it = e.it; if (it.lit < 0.02) continue;
        g.save(); g.translate(it.x, it.y - it.sink); g.scale(it.s, it.s);
        drawDecorGlow(g, it.def, it, { t: this.t, night: k * it.lit });
        g.restore();
      } else drawFishGlowBits(g, e.f, { t: this.t, night: k });
    }
    if (SANDS[this.sand].glitter) {
      for (let i = 0; i < 26; i++) {
        const x = WATER.x0 + 30 + ((i * 197) % (WATER.x1 - WATER.x0 - 60)), y = BASE_Y0 + 10 + ((i * 53) % 120);
        g.save(); g.globalAlpha = k * (0.5 + 0.5 * Math.sin(this.t * 2 + i)); g.translate(x, y); drawSparkleShape(g, 12, '#ffe680'); g.restore();
      }
    }
    g.restore();
  }

  // ===========================================================================
  // HUD (screen space)
  drawHUD(g) {
    if (this.phase === 'build') {
      this.drawHeld(g);
      this.drawNameTags(g);
      this.drawLegend(g);
      this.drawTopRight(g);
      for (const st of this.stations) this.drawPanel(g, st);
      for (const st of this.stations) if (st.naming && !st.p.isAI) this.drawNameCard(g, st);
      for (const st of this.stations) this.drawCursor(g, st);
    } else this.drawNameTags(g);
    for (const ph of this.photos) this.drawPolaroid(g, ph);
    if (this.phase === 'show') this.drawCheeseHUD(g);
    if (this.bigPhoto) this.drawBigPhoto(g);
    if (this.banner) ui.banner(g, this.banner.text, this.banner.t, { size: 110, y: this.phase === 'show' ? 300 : H / 2 - 60, color: '#7fe8ff' });
    if (this.toast) {
      const a = Math.min(1, (2 - this.toast.t) / 0.3);
      g.save(); g.globalAlpha = clamp(a, 0, 1);
      ui.panel(g, W / 2 - 420, 470, 840, 90, { r: 45, fill: '#fff8ec' });
      ui.text(g, this.toast.text, W / 2, 516, { size: 36, color: NAVY, stroke: false, weight: 800, maxWidth: 800 });
      g.restore();
    }
  }

  /** Held decorations float with the hand; placement ghosts for human hands. */
  drawHeld(g) {
    const env = this.env;
    for (const st of this.stations) {
      if (st.held && st.held.type === 'decor') {
        const it = st.held.obj, lift = 24 + Math.sin(this.t * 6) * 5;
        g.save(); g.globalAlpha = 0.22; g.fillStyle = NAVY; g.beginPath(); g.ellipse(it.x, it.y + 2, it.def.w * 0.4 * it.s, 10 * it.s, 0, 0, TAU); g.fill(); g.restore();
        this.drawOneDecor(g, it, env, 1, lift);
        continue;
      }
      if (st.held || st.hover || st.p.isAI || st.naming || !inTank(st.cur.x, st.cur.y)) continue;
      const e = PALETTE[st.sel];
      if (e.kind === 'decor') {
        const d = e.def, pl = this.placement(d, st.cur.x, st.cur.y);
        const ghost = { def: d, color: this.previewColor(st, e), x: pl.x, y: pl.y, d: pl.d, s: pl.s, sink: 0, seed: 0.5, born: -9, bump: -9, open: 0 };
        g.save(); g.globalAlpha = 0.55; g.strokeStyle = st.p.color; g.lineWidth = 4; g.setLineDash([10, 8]);
        g.beginPath(); g.ellipse(pl.x, pl.y, Math.max(30, d.w * 0.42 * pl.s), Math.max(10, 13 * pl.s), 0, 0, TAU); g.stroke(); g.setLineDash([]);
        if (st.cur.y < pl.y - 40) { g.beginPath(); g.moveTo(st.cur.x, st.cur.y + 30); g.lineTo(pl.x, pl.y - d.h * pl.s - 10); g.lineWidth = 3; g.setLineDash([6, 10]); g.stroke(); g.setLineDash([]); }
        g.restore();
        this.drawOneDecor(g, ghost, env, 0.5 + Math.sin(this.t * 5) * 0.08);
      }
    }
  }

  drawNameTags(g) {
    const tagged = new Set();
    for (const st of this.stations) if (st.hover && st.hover.type === 'fish' && !st.p.isAI) tagged.add(st.hover.obj);
    for (const f of this.fish) {
      if (f.hidden > 0 || f.state === 'leave') continue;
      const naming = this.stations.find((s) => s.naming && s.naming.fish === f);
      if (!(f.showName > 0 || tagged.has(f) || naming)) continue;
      const name = naming ? naming.naming.names[naming.naming.idx] : this.fishName(f);
      const own = this.stations[f.owner];
      const s = fishScale(f.fd), y = f.y - (f.kind.h * 0.5 + 30) * s - (f.emote ? 40 : 0);
      g.save(); g.font = `800 26px Fredoka, system-ui, sans-serif`;
      const w = g.measureText(name).width + 34;
      g.restore();
      const a = f.showName > 0 && f.showName < 0.4 && !naming && !tagged.has(f) ? f.showName / 0.4 : 1;
      g.save(); g.globalAlpha = a;
      ui.panel(g, f.x - w / 2, y - 20, w, 40, { r: 20, fill: '#ffffff', stroke: own ? own.p.color : NAVY, lineWidth: 4, shadow: false });
      ui.text(g, name, f.x, y + 1, { size: 26, color: NAVY, stroke: false, weight: 800 });
      g.restore();
    }
  }

  drawLegend(g) {
    const solo = this.humans === 1 ? this.stations.find((s) => !s.p.isAI) : null;
    let aLabel = 'Place';
    if (solo) aLabel = solo.held ? 'Put down' : solo.tab === DONE ? "I'm ready!" : solo.tab === TAP_TAB ? 'Tap glass' : solo.hover ? 'Pick up' : PALETTE[solo.sel].kind === 'sand' ? 'Pour sand' : 'Place';
    const rows = LEGEND_ROWS.map(([b, label]) => [b, label === 'Place' ? aLabel : label]);
    const rh = 50, h = rows.length * rh + 24;
    ui.panel(g, LEGEND.x, LEGEND.y, LEGEND.w, h, { r: 24, fill: 'rgba(255,248,236,0.94)', lineWidth: 5 });
    rows.forEach(([btns, label], i) => {
      const y = LEGEND.y + 12 + rh / 2 + i * rh;
      let x = LEGEND.x + 32;
      for (const b of btns) { ui.glyph(g, b, x, y, 34); x += b.length === 2 ? 48 : 44; }
      const lx = Math.max(x, LEGEND.x + 82);
      ui.text(g, label, lx, y + 1, { size: 27, color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: LEGEND.x + LEGEND.w - lx - 10 });
    });
  }

  drawTopRight(g) {
    const p = CLOCK_PLUS, phot = this.stations.some((st) => !st.p.isAI && inRect(p, st.cur.x, st.cur.y));
    const bump = this.clockBump !== undefined ? clamp(1 - (this.t - this.clockBump) / 0.4, 0, 1) : 0;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    g.beginPath(); g.arc(px, py, (phot ? 23 : 20) * (1 + bump * 0.2), 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    ui.text(g, '+', px, py - 1, { size: 36, weight: 800 });
    const kids = this.stations.filter((s) => !s.p.isAI);
    if (this.humans > 1 && kids.some((s) => s.ready)) {
      // who's ready for the show (Done + A): a dot per kid, filled once that kid is ready
      const gap = 30, w = 130 + kids.length * gap, x = W - w - 20, y = 30;
      ui.panel(g, x, y, w, 56, { r: 28, fill: '#fff8ec', lineWidth: 4 });
      ui.text(g, 'Ready', x + 66, y + 29, { size: 28, color: NAVY, stroke: false, weight: 800 });
      kids.forEach((s, k) => {
        g.beginPath(); g.arc(x + 136 + k * gap, y + 28, 10, 0, TAU);
        g.fillStyle = s.ready ? s.p.color : 'rgba(36,22,63,0.15)'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      });
    }
  }

  panelLayout(st) {
    const P = st.panel, wide = P.w >= 380;
    const x0 = wide ? P.x + 84 : P.x + 12;
    const catX = x0 + 34, catY = P.y + P.h / 2 + 2;
    const glyphW = P.w >= 300 ? 30 : 0;
    const c0 = x0 + 76, c1 = P.x + P.w - 12 - glyphW;
    return { wide, catX, catY, c0, c1, mid: (c0 + c1) / 2, glyphW };
  }

  drawPanel(g, st) {
    const P = st.panel, p = st.p, L = this.panelLayout(st), { wide, glyphW, c0, c1, mid } = L;
    ui.panel(g, P.x, P.y, P.w, P.h, { r: 22, fill: '#fff8ec', stroke: p.color, lineWidth: 6 });
    if (wide) {
      drawPortrait(g, p, P.x + 44, P.y + 50, 30, { ring: p.color, ringWidth: 4, expr: 'happy' });
      ui.text(g, p.tag, P.x + 44, P.y + P.h - 20, { size: 22, color: p.color, strokeWidth: 4 });
    }
    // category button (LB / RB; the last category is Done)
    const tab = st.tab;
    if (tab === DONE) drawDoneTab(g, L.catX - 32, L.catY - 32, 64, 64, { sel: true, bump: st.tabPop * 0.15, label: false });
    else {
      const k = 1 + st.tabPop * 0.2, grp = tab < TAP_TAB ? GROUPS[GROUP_ORDER[tab]] : null;
      g.save(); g.translate(L.catX, L.catY); g.scale(k, k);
      g.beginPath(); g.arc(0, 0, 32, 0, TAU); g.fillStyle = grp ? '#ffffff' : '#bfefff'; g.fill(); g.lineWidth = 5; g.strokeStyle = grp ? grp.color : NAVY; g.stroke();
      if (grp) this.drawEntryIcon(g, PALETTE[GROUP_START[tab]], 0, 0, 42, st);
      else this.drawTapIcon(g, 0, 0, 40, p.color);
      g.restore();
    }
    for (let k = 0; k < NTABS; k++) {
      g.beginPath(); g.arc(L.catX + (k - (NTABS - 1) / 2) * 7, P.y + P.h - 9, k === tab ? 3.6 : 2.2, 0, TAU);
      g.fillStyle = k === DONE ? '#36d17a' : k === tab ? NAVY : 'rgba(36,22,63,0.3)'; g.fill();
    }
    if (glyphW) { ui.glyph(g, 'lb', L.catX - 30, L.catY + 30, 20); ui.glyph(g, 'rb', L.catX + 30, L.catY + 30, 20); }
    ui.text(g, tabName(tab), L.catX, P.y + 14, { size: 19, color: NAVY, stroke: false, weight: 800, maxWidth: 110 });
    const cw = c1 - c0 + glyphW;
    if (st.ready) {
      ui.panel(g, c0, P.y + 10, cw, P.h - 20, { r: 18, fill: '#d6f7e3', lineWidth: 3, shadow: false });
      ui.text(g, 'Ready!', c0 + cw / 2, P.y + P.h * 0.36, { size: clamp(cw * 0.14, 20, 34), color: '#1f9d55', strokeWidth: 4, maxWidth: cw - 12 });
      ui.hints(g, [['b', cw > 200 ? 'Not yet' : '']], c0 + cw / 2, P.y + P.h * 0.7, { size: 26 });
      return;
    }
    if (tab === DONE) {
      ui.panel(g, c0, P.y + 10, cw, P.h - 20, { r: 18, fill: 'rgba(255,255,255,0.9)', lineWidth: 3, shadow: false });
      ui.text(g, 'All done?', c0 + cw / 2, P.y + 36, { size: clamp(cw * 0.1, 18, 28), color: p.color, strokeWidth: 4, maxWidth: cw - 12 });
      ui.hints(g, [['a', cw > 160 ? "I'm ready!" : '']], c0 + cw / 2, P.y + 80, { size: clamp(cw * 0.1, 22, 32) });
      return;
    }
    if (tab === TAP_TAB) {
      ui.text(g, 'Tap the glass', c0 + cw / 2, P.y + 34, { size: 24, color: NAVY, stroke: false, weight: 800, maxWidth: cw - 8 });
      ui.hints(g, [['a', cw > 200 ? 'Tap (gently!)' : '']], c0 + cw / 2, P.y + 80, { size: 28 });
      return;
    }
    // carousel: the things in this category (X / D-pad: next)
    const ss = 64, gap = 10, slotY = P.y + 60;
    if (glyphW) ui.glyph(g, 'x', c1 + 16, slotY, 24);
    const ga = GROUP_START[tab], N = GROUP_END[tab] - ga;
    g.save(); g.beginPath(); g.rect(c0, P.y + 4, c1 - c0, P.h - 8); g.clip();
    const base = Math.round(st.scroll), frac = st.scroll - base, step = ss + gap;
    const half = Math.min(Math.ceil((c1 - c0) / step / 2) + 1, Math.floor((N - 1) / 2));
    for (let k = -half; k <= half; k++) {
      const idx = ga + ((((base + k) % N) + N) % N), e = PALETTE[idx];
      const x = mid + (k - frac) * step;
      const sel = idx === st.sel, z = sel ? 1 + st.selPop * 0.15 : 0.86, s = ss * z;
      g.save(); g.translate(x, slotY);
      ui.roundRect(g, -s / 2, -s / 2, s, s, 14);
      g.fillStyle = sel ? '#fff3b0' : '#ffffff'; g.fill();
      g.lineWidth = sel ? 5 : 3; g.strokeStyle = sel ? NAVY : GROUPS[e.group].color; g.stroke();
      this.drawEntryIcon(g, e, 0, 0, s * 0.8, st);
      g.fillStyle = GROUPS[e.group].color; ui.roundRect(g, -s * 0.3, s / 2 - 6, s * 0.6, 7, 3); g.fill();
      g.restore();
    }
    g.restore();
    const e = PALETTE[st.sel];
    ui.text(g, e.name, mid, P.y + 17, { size: 21, color: NAVY, stroke: false, weight: 800, maxWidth: c1 - c0 + glyphW * 2 });
    // colour dots under the selected slot
    if (e.ncol > 1) {
      const cols = e.kind === 'decor' ? e.def.colors : e.def.colors, cur = this.previewColor(st, e);
      const dw = 22, tot = cols.length * dw;
      const dy = P.y + P.h - 14;
      if (glyphW) { ui.glyph(g, 'lt', mid - tot / 2 - 26, dy, 20); ui.glyph(g, 'rt', mid + tot / 2 + 26, dy, 20); }
      cols.forEach((cc, i) => {
        const x = mid - tot / 2 + dw / 2 + i * dw, r = i === cur ? 9 + st.colPop * 3 : 6;
        g.beginPath(); g.arc(x, dy, r, 0, TAU); g.fillStyle = cc.c; g.fill(); g.lineWidth = i === cur ? 3 : 2; g.strokeStyle = NAVY; g.stroke();
      });
    }
  }

  /** The Tap category: a knocking knuckle with little ripples. */
  drawTapIcon(g, x, y, s, color) {
    g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
    g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round';
    ui.roundRect(g, -14, -6, 26, 22, 9); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    for (const fx2 of [-9, -1, 7]) { g.beginPath(); g.arc(fx2, -6, 4, Math.PI, 0); g.stroke(); }
    ui.roundRect(g, -12, 14, 22, 8, 3); g.fillStyle = color; g.fill(); g.stroke();
    g.strokeStyle = '#3fa7ff'; g.lineWidth = 2.5;
    for (const r of [8, 14]) { g.beginPath(); g.arc(14, -12, r, -1.2, 0.2); g.stroke(); }
    g.restore();
  }

  drawEntryIcon(g, e, x, y, size, st) {
    if (e.kind === 'decor') { drawDecorIcon(g, e.def, x, y, size, this.previewColor(st, e), { t: this.t, night: 0 }); return; }
    if (e.kind === 'fish') { drawFishIcon(g, e.def, x, y, size, this.previewColor(st, e), this.t); return; }
    const img = sandSwatch(e.idx);
    g.save(); ui.roundRect(g, x - size / 2, y - size / 2, size, size, 10); g.clip();
    g.drawImage(img, x - size / 2, y - size / 2, size, size);
    g.restore();
    ui.roundRect(g, x - size / 2, y - size / 2, size, size, 10); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    if (this.sand === e.idx) { g.beginPath(); g.arc(x + size * 0.34, y - size * 0.34, size * 0.17, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 2.5; g.stroke(); }
  }

  nameCard(st) {
    const P = st.panel, w = clamp(P.w, 380, 560), h = 150;
    return { x: clamp(P.x + P.w / 2 - w / 2, 10, W - w - 10), y: BAR.y - h - 12, w, h };
  }

  drawNameCard(g, st) {
    const N = st.naming, r = this.nameCard(st), sc = ease.outBack(clamp(N.t / 0.3, 0, 1));
    g.save(); g.translate(r.x + r.w / 2, r.y + r.h); g.scale(sc, sc); g.translate(-(r.x + r.w / 2), -(r.y + r.h));
    ui.panel(g, r.x, r.y, r.w, r.h, { r: 26, fill: '#fff8ec', stroke: st.p.color, lineWidth: 6 });
    ui.text(g, `Name your ${N.fish.kind.name.replace(/s$/, '').toLowerCase()}!`, r.x + r.w / 2, r.y + 28, { size: 26, color: NAVY, stroke: false, weight: 800, maxWidth: r.w - 30 });
    const name = N.names[N.idx], pz = 1 + (N.pop || 0) * 0.15;
    g.save(); g.translate(r.x + r.w / 2, r.y + 74); g.scale(pz, pz);
    ui.text(g, name, 0, 0, { size: 44, color: st.p.color, weight: 800, strokeWidth: 7, maxWidth: r.w - 140 });
    g.restore();
    for (const s of [-1, 1]) {
      const ax = r.x + r.w / 2 + s * (r.w / 2 - 38), ay = r.y + 74;
      g.beginPath(); g.moveTo(ax + s * 14, ay); g.lineTo(ax - s * 10, ay - 16); g.lineTo(ax - s * 10, ay + 16); g.closePath();
      g.fillStyle = st.p.color; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
    }
    ui.hints(g, [[st.p.ctrl.kind === 'pad' ? 'dpad' : 'stick', 'Names'], ['a', 'Choose']], r.x + r.w / 2, r.y + r.h - 26, { size: 28, color: '#ffffff' });
    g.restore();
  }

  drawCursor(g, st) {
    const { x, y } = st.cur, p = st.p;
    const hv = st.hover;
    if (hv && !st.held && !st.p.isAI) {
      let r;
      if (hv.type === 'decor') r = this.decorRect(hv.obj);
      else { const f = hv.obj, s = fishScale(f.fd), hw = f.kind.w * 0.5 * s + 6, hh = f.kind.h * 0.5 * s + 6; r = { x0: f.x - hw, x1: f.x + hw, y0: f.y - hh, y1: f.y + hh }; }
      const pad = 8, L = 20;
      g.save(); g.lineWidth = 5; g.strokeStyle = p.color; g.globalAlpha = 0.75 + Math.sin(this.t * 8) * 0.25; g.lineCap = 'round';
      for (const [cx, cy, sx, sy] of [[r.x0 - pad, r.y0 - pad, 1, 1], [r.x1 + pad, r.y0 - pad, -1, 1], [r.x0 - pad, r.y1 + pad, 1, -1], [r.x1 + pad, r.y1 + pad, -1, -1]]) {
        g.beginPath(); g.moveTo(cx + sx * L, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * L); g.stroke();
      }
      g.restore();
    }
    if (st.naming && !st.p.isAI) return;
    if (st.shake > 0) {
      // the food shaker
      g.save(); g.translate(x + 6, y - 10); g.rotate(-0.6 + Math.sin(st.shake * 40) * 0.3);
      ui.roundRect(g, -14, -34, 28, 44, 8); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      ui.roundRect(g, -16, 6, 32, 12, 4); g.fillStyle = '#ff6fb1'; g.fill(); g.stroke();
      g.fillStyle = NAVY; for (const dx of [-6, 0, 6]) { g.beginPath(); g.arc(dx, 15, 1.8, 0, TAU); g.fill(); }
      g.restore();
    } else {
      const kind = st.held ? 'grab' : hv ? 'open' : 'point';
      this.drawGlove(g, x, y, p.color, kind, 1);
      if (!st.held && !hv && inTank(x, y)) {
        g.save(); g.translate(x - 22, y + 8); g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(-5, 0); g.lineTo(5, 0); g.moveTo(0, -5); g.lineTo(0, 5); g.stroke(); g.restore();
      }
    }
    ui.text(g, p.tag, x + 30, y - 14, { size: 22, color: p.color, strokeWidth: 5 });
  }

  /** Cartoon glove; the fingertip of 'point' is at (x, y). */
  drawGlove(g, x, y, color, kind = 'point', s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.3);
    g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = NAVY;
    const W2 = '#ffffff';
    if (kind === 'point') {
      ui.roundRect(g, -7, 0, 14, 34, 7); g.fillStyle = W2; g.fill(); g.stroke();
      ui.roundRect(g, -17, 22, 36, 34, 13); g.fill(); g.stroke();
      for (const fx2 of [-6, 4]) { g.beginPath(); g.arc(fx2 + 4, 24, 6, Math.PI, 0); g.stroke(); }
      g.beginPath(); g.ellipse(-18, 38, 7, 11, 0.5, 0, TAU); g.fill(); g.stroke();
      ui.roundRect(g, -16, 52, 34, 13, 5); g.fillStyle = color; g.fill(); g.stroke();
    } else if (kind === 'grab') {
      ui.roundRect(g, -18, 4, 38, 34, 15); g.fillStyle = W2; g.fill(); g.stroke();
      for (const fx2 of [-10, 0, 10]) { g.beginPath(); g.arc(fx2 + 1, 8, 5.5, Math.PI, 0); g.stroke(); }
      ui.roundRect(g, -16, 36, 34, 13, 5); g.fillStyle = color; g.fill(); g.stroke();
    } else {
      for (const [fx2, fl] of [[-12, 16], [-4, 22], [5, 21], [13, 15]]) { ui.roundRect(g, fx2 - 4, -fl + 10, 9, fl + 6, 4.5); g.fillStyle = W2; g.fill(); g.stroke(); }
      ui.roundRect(g, -18, 8, 38, 30, 13); g.fillStyle = W2; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(-20, 22, 6, 11, 0.6, 0, TAU); g.fill(); g.stroke();
      ui.roundRect(g, -16, 34, 34, 13, 5); g.fillStyle = color; g.fill(); g.stroke();
    }
    g.restore();
  }

  drawPolaroid(g, ph) {
    const t = ph.t, p = ease.outBack(clamp(t / 0.5, 0, 1));
    const x = lerp(W / 2, ph.x, p), y = lerp(H / 2, ph.y, p), sc = lerp(1.6, 1, p);
    const w = 270, h = 236;
    g.save(); g.translate(x, y); g.rotate(ph.rot * p); g.scale(sc, sc);
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 8, fill: '#ffffff', lineWidth: 4 });
    g.drawImage(ph.img, -w / 2 + 12, -h / 2 + 12, w - 24, (w - 24) * 0.625);
    g.strokeStyle = NAVY; g.lineWidth = 2; g.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, (w - 24) * 0.625);
    ui.text(g, ph.caption, 0, h / 2 - (ph.sub ? 46 : 30), { size: 28, color: ph.color, strokeWidth: 5, maxWidth: w - 30 });
    if (ph.sub) ui.text(g, ph.sub, 0, h / 2 - 16, { size: 18, color: NAVY, stroke: false, weight: 700 });
    g.fillStyle = 'rgba(190,240,255,0.9)'; g.save(); g.translate(0, -h / 2); g.rotate(-0.05); g.fillRect(-34, -10, 68, 20); g.restore();
    g.restore();
  }

  drawCheeseHUD(g) {
    const t = this.groupT, shot = LINEUP + CHEESE_TIME;
    if (t < LINEUP || this.bigPhoto) return;
    if (t >= shot - 3) { const n = Math.ceil(shot - t), f = 1 - (shot - t - (n - 1)); g.save(); g.translate(W / 2, 260); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(n), 0, 0, { size: 200, color: '#ffd23f', strokeWidth: 12 }); g.restore(); }
    const humans = this.stations.filter((s) => !s.p.isAI);
    if (!humans.length) return;
    const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
    ui.hints(g, r1, W / 2, 790, { size: 32 }); ui.hints(g, r2, W / 2, 840, { size: 32 });
  }

  drawBigPhoto(g) {
    const B = this.bigPhoto, t = B.t, p = ease.outBack(clamp(t / 0.6, 0, 1));
    const k = ease.inOutQuad(clamp((t - PHOTO_PIN) / PHOTO_FLY, 0, 1));
    g.save(); g.fillStyle = `rgba(16,12,58,${0.5 * clamp(t / 0.4, 0, 1) * (1 - k)})`; g.fillRect(0, 0, W, H); g.restore();
    const w = 1120, h = 820, sc = p * lerp(1, PIN.w / w, k);
    g.save(); g.translate(lerp(W / 2, PIN.x, k), lerp(H / 2 + 10, PIN.y + h * sc / 2 - 20, k)); g.rotate(lerp(-0.03 * p, PIN.rot, k)); g.scale(sc, sc);
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 10, fill: '#ffffff', lineWidth: 6 });
    g.drawImage(B.img, -w / 2 + 40, -h / 2 + 40, 1040, 585);
    g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(-w / 2 + 40, -h / 2 + 40, 1040, 585);
    ui.text(g, 'Our Dream Aquarium', 0, h / 2 - 118, { size: 64, color: '#36c6d3', weight: 800 });
    const names = this.players.map((pl) => playerName(pl)).join(', ');
    ui.text(g, names, 0, h / 2 - 54, { size: 30, color: NAVY, stroke: false, maxWidth: w - 120 });
    if (k < 1) for (const [sx, sy] of [[-1, -1], [1, -1]]) { g.save(); g.translate(sx * (w / 2 - 30), sy * (h / 2 - 4)); g.rotate(sx * 0.6); g.fillStyle = 'rgba(190,240,255,0.9)'; g.fillRect(-50, -14, 100, 28); g.restore(); }
    else { g.beginPath(); g.arc(0, -h / 2 + 14, 40, 0, TAU); g.fillStyle = '#36c6d3'; g.fill(); g.lineWidth = 12; g.strokeStyle = NAVY; g.stroke(); g.beginPath(); g.arc(-12, -h / 2 + 2, 12, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); }
    g.restore();
  }
}
