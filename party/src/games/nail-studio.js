// Sparkle Nails (Play Studio). Everyone runs a nail-salon table (split
// stations). A client (any roster character or friendly NPC) peeks over the
// table and rests a big cartoon hand, or a paw for animal clients, on a
// cushion. Four steps, each at the player's own pace (Y = next step, and a
// gentle clock moves you on): 1 Polish (hold A on a nail to paint it, X paints
// all five), 2 Designs (glitter, stripes, dots, hearts, stars, tips, rainbow
// tips), 3 Gems & stickers (A sticks one on; A on a placed one picks it up to
// move it; B takes it off), 4 Dry (hold A to blow the little fan over the wet
// nails). Finale: a nail gallery with every hand on a pedestal, a spotlight
// on each, then a "Say cheese!" photo with the shared pose buttons.
import { playerName } from '../state.js';
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { art, drawArt } from '../engine/art.js';
import { aiProfile, reactionTime, steer } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { CHARACTERS } from '../data/characters.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  NAVY, POLISH, TOOLS, TOOL_NAME, ITEMS, ITEM_SIZE, mix, handStyle, geom, toNail, fromNail, nailAt, onHand,
  drawHandBase, drawNail, drawSticker, drawBottle, drawToolIcon, drawBrush, drawPen, drawTweezers, drawFan,
  drawSparkleShape, drawStarShape, drawHeartShape,
} from './nail-studio/hand.js';

import { meta } from './nail-studio.meta.js';

export { meta };

// --- station design (local units; each station is scaled by k) -------------------
const SW = 860, SH = 600;
const TABLE_Y = 215;
const CUST = { x: 104, y: 336, h: 236, maxW: 186 };
const CHAR = { x: 100, y: 588, h: 196, maxW: 166 };
const HAND = { x: 446, y: 236, s: 0.96 };
const TRAY = { x: 196, y: 486, w: 488, h: 104 };
const PANEL = { x: 694, y: 14, w: 152, h: 572 };
const BOX = { x0: 190, x1: 688, y0: 26, y1: 476 };
const STEPS = [
  { id: 'polish', n: 'Polish', time: 45 },
  { id: 'art', n: 'Designs', time: 50 },
  { id: 'gems', n: 'Gems', time: 45 },
  { id: 'dry', n: 'Dry', time: 25 },
];
const CLIENTS = [...CHARACTERS.map((c) => c.id), 'glimmer', 'professor-hoot', 'fellowfox'];
const MAX_GEMS = 16;
const CHEESE_TIME = 6;

/** Recorded sound if it exists, else the synth stand-in. */
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Station positions: try every column count, keep the biggest scale. */
function layoutStations(n) {
  const top = 108, bottom = H - 10, left = 12, right = W - 12, gap = 14;
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

const newNail = () => ({ color: null, under: null, cover: 0, art: null, glitter: null, wet: 0, pop: 0, auto: null });
const handToLocal = (x, y) => ({ x: HAND.x + x * HAND.s, y: HAND.y + y * HAND.s });
const localToHand = (x, y) => ({ x: (x - HAND.x) / HAND.s, y: (y - HAND.y) / HAND.s });

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'intro'; this.phaseT = 0;
    this.allDoneT = 0;
    this.finished = false;
    const rects = layoutStations(this.n);
    const pool = shuffle(CLIENTS.slice());
    this.stations = this.players.map((p, i) => {
      // every client different where possible, never the player's own character
      let id = pool.find((c) => c !== p.charId);
      const idx = pool.indexOf(id); if (idx >= 0) pool.splice(idx, 1);
      if (!id) id = pick(CLIENTS.filter((c) => c !== p.charId));
      return this.makeStation(p, i, rects[i], id);
    });
    // Each step has a gentle clock (the ring on the step list shows how much is left);
    // its last seconds are counted down by the play scene, over the station's step list.
    for (const st of this.stations) {
      api.limit(() => (this.phase === 'play' && st.mode === 'work' ? Math.max(0, STEPS[st.step].time - st.stepT) : null),
        { x: st.ox + (PANEL.x + PANEL.w / 2) * st.k, y: st.oy + Math.max(44, 70 * st.k) });
    }
    this.sideRoom = Math.min(...rects.map((r) => r.x)) > 240;
    this.bulbs = Array.from({ length: 22 }, (_, i) => ({ x: 40 + i * 88, c: RAINBOW[i % RAINBOW.length] }));
    sfx('magic'); snd('jingle/round', null, { vol: 0.7 });
  }

  // --- setup -----------------------------------------------------------------------
  makeStation(p, i, r, clientId) {
    const a = new Actor(p, { x: CHAR.x, y: CHAR.y, facing: 1 });
    a.scale = Math.min(CHAR.h / a.leader.h, CHAR.maxW / Math.max(1, a.width / a.scale));
    a.snap();
    const c = new Actor(clientId, { x: -150, y: CUST.y, facing: 1, load: false });
    c.scale = Math.min(CUST.h / c.leader.h, CUST.maxW / Math.max(1, c.width / c.scale));
    c.y = Math.min(CUST.y, TABLE_Y + c.height * 0.4);
    c.snap(); c.setPose('walk');
    const st = {
      p, i, ox: r.x, oy: r.y, k: r.k, actor: a, baseScale: a.scale, clientId, client: c,
      style: handStyle(clientId, c.char.color || '#ff6fb1'),
      nails: Array.from({ length: 5 }, newNail), gems: [],
      mode: 'arrive', step: 0, stepT: 0, idleT: 0, appear: 0, doneT: 0,
      cur: { x: 560, y: 300, hold: 0 }, color: randInt(0, 6), artColor: 7, tool: 1, item: 0,
      held: null, hoverGem: null, hoverNail: -1, onHand: false,
      fanSpin: 0, fanV: 0, sfxT: 0, reactT: 0, wig: 0, pickPop: 0, toolPop: 0, nextBump: 0, nextPulse: 0,
      painting: false, tip: null,
      stats: { coats: 0, designs: 0, glitter: 0, gems: 0, colors: new Set() },
      ai: { t: rand(0.6, 1.4), tasks: [], planned: -1, cur: null },
    };
    return st;
  }

  toScreen(st, x, y) { return { x: st.ox + x * st.k, y: st.oy + y * st.k }; }
  handScreen(st, hx, hy) { const l = handToLocal(hx, hy); return this.toScreen(st, l.x, l.y); }

  // --- phases ------------------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    const P = this.phase;
    if (P === 'intro') {
      if (this.phaseT >= 2.4) {
        this.phase = 'play'; this.phaseT = 0;
        for (const st of this.stations) { st.mode = 'work'; st.stepT = 0; }
      }
    } else if (P === 'play') {
      if (this.stations.every((s) => s.mode === 'done')) {
        this.allDoneT += dt;
        if (this.allDoneT > 2.6) this.startShow();
      }
    } else if (P === 'show') {
      this.updateShow(dt);
    }
    if (this.phase !== 'show') for (const st of this.stations) this.updateStation(st, dt);
    if (this.api.camera && this.phase !== 'show') this.api.camera.follow(W / 2, H / 2, 1, 6);
  }

  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    for (const st of this.stations) { st.actor.update(dt); st.client.update(dt); }
  }

  onDone() {
    if (this.phase === 'show') {
      if (!this.photoTaken) this.phaseT = Math.max(this.phaseT, this.cheeseAt + CHEESE_TIME - 0.5);
      else this.finishGame();
      return;
    }
    this.startShow();
  }

  // --- one station -------------------------------------------------------------------
  updateStation(st, dt) {
    const p = st.p, c = p.ctrl, a = st.actor, cl = st.client;
    st.reactT -= dt; st.sfxT -= dt;
    st.pickPop = Math.max(0, st.pickPop - dt * 3); st.toolPop = Math.max(0, st.toolPop - dt * 3);
    st.nextBump = Math.max(0, st.nextBump - dt); st.nextPulse = Math.max(0, st.nextPulse - dt); st.wig = Math.max(0, st.wig - dt * 0.8);
    if (st.tip) { st.tip.t += dt; if (st.tip.t > st.tip.dur) st.tip = null; }
    this.updateClient(st, dt);
    a.update(dt); cl.update(dt);
    // hand slides onto the cushion once the client has arrived
    if (st.clientIn) st.appear = Math.min(1, st.appear + dt * 2.4);
    for (const n of st.nails) {
      n.pop = Math.max(0, n.pop - dt * 3);
      if (n.art) n.art.t += dt;
      if (n.glitter) n.glitter.t += dt;
    }
    for (const g of st.gems) g.t += dt;
    this.updateAutoPaint(st, dt);
    if (st.mode === 'arrive') return;
    if (p.isAI && st.mode === 'work') this.ai(st, dt);

    // cursor (on a gamepad only the stick moves it; the d-pad makes the choices)
    const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    const mag = Math.hypot(mx, my);
    st.cur.hold = mag > 0.15 ? st.cur.hold + dt : 0;
    const sp = 820 * (0.35 + 0.65 * clamp(st.cur.hold / 0.5, 0, 1));
    st.cur.x = clamp(st.cur.x + mx * sp * dt, BOX.x0, BOX.x1);
    st.cur.y = clamp(st.cur.y + my * sp * dt, BOX.y0, BOX.y1);
    const hp = localToHand(st.cur.x, st.cur.y);
    const G = geom(st.style);
    st.hp = hp; st.G = G;
    st.hoverNail = nailAt(G, hp.x, hp.y, 10);
    st.onHand = onHand(st.style, G, hp.x, hp.y, 4);
    if (mag > 0.2 || c.pressed('a')) st.idleT = 0; else st.idleT += dt;

    if (st.mode === 'done') {
      st.doneT += dt;
      st.painting = false;
      if (c.pressed('a')) this.admire(st);
      if (chance(dt * 0.25)) cl.emote(pick(['heart', 'sparkle', 'hearts']), 1.2);
      if (a.pose === 'paint') a.setPose('idle');
      return;
    }

    st.stepT += dt;
    const step = STEPS[st.step].id;
    const left = (c.pressed('lb') ? 1 : 0) + (pad && c.pressed('left') ? 1 : 0);
    const right = (c.pressed('rb') ? 1 : 0) + (pad && c.pressed('right') ? 1 : 0);
    const up = pad && c.pressed('up') ? 1 : 0, down = pad && c.pressed('down') ? 1 : 0;
    st.painting = false;
    if (step === 'polish') {
      if (left || right) this.pickColor(st, right - left);
      if (up || down) this.pickColor(st, down - up);
      if (c.pressed('x')) this.paintAll(st);
      if (c.held('a') && st.hoverNail >= 0) this.paintNail(st, st.hoverNail, dt);
      if (c.pressed('b')) this.wipe(st);
    } else if (step === 'art') {
      if (left || right) this.pickArtColor(st, right - left);
      if (c.pressed('x') || down) this.pickTool(st, 1);
      if (up) this.pickTool(st, -1);
      if (c.pressed('a')) this.decorate(st);
      if (c.pressed('b')) this.cleanArt(st);
    } else if (step === 'gems') {
      if (left || right || up || down || c.pressed('x')) this.pickItem(st, right - left + down - up + (c.pressed('x') ? 1 : 0) || 1);
      if (st.held) { st.held.hx = hp.x; st.held.hy = hp.y; }
      st.hoverGem = st.held ? null : this.gemAt(st, hp.x, hp.y);
      if (c.pressed('a')) this.gemA(st);
      if (c.pressed('b')) this.gemB(st);
    } else if (step === 'dry') {
      this.updateDry(st, dt, c.held('a'));
    }
    if (step !== 'dry') { st.fanV = Math.max(0, st.fanV - dt * 2); st.fanSpin += st.fanV * dt * 30; }
    if (st.mode === 'work' && c.pressed('y')) this.nextStep(st, false);
    if (st.mode !== 'work') return;   // (finished this frame)
    // the gentle clock moves everyone along
    if (st.stepT >= STEPS[st.step].time) this.nextStep(st, true);
    if (st.mode !== 'work') return;
    // a little nudge for humans who stop for a long time
    if (!p.isAI && st.idleT > 12 && !st.tip) { st.idleT = 4; this.tipFor(st); }
    // the manicurist's pose
    if (st.painting || (step === 'dry' && c.held('a'))) { if (!a._once && a.pose !== 'paint') a.setPose('paint'); }
    else if (a.pose === 'paint') a.setPose('idle');
  }

  updateClient(st, dt) {
    const cl = st.client;
    if (!st.clientIn) {
      const v = 380;
      cl.x = Math.min(CUST.x, cl.x + v * dt);
      cl.moveAnim(v, 0, v);
      if (cl.x >= CUST.x) {
        st.clientIn = true; cl.setPose('idle'); cl.facing = 1;
        cl.playOnce('wave', 0.9, 'idle'); cl.emote('heart', 1.2);
      }
    }
  }

  /** Client chatter as pop-text (a speech bubble would be cut off by the station's top edge). */
  clientSay(st, text, size = 34) {
    const q = this.toScreen(st, CUST.x + 30, 96);
    particles.popText(q.x, q.y, text, '#ff6fb1', size * Math.max(0.75, st.k));
  }

  react(st, kind, force = false) {
    if (!force && st.reactT > 0) return;
    const cl = st.client;
    st.reactT = rand(1.2, 2.2);
    switch (kind) {
      case 'paint': cl.emote(pick(['heart', 'sparkle']), 1.1); cl.squash(0.12); if (chance(0.3)) this.clientSay(st, pick(['Ooh!', 'Pretty!', 'I love it!'])); break;
      case 'art': cl.playOnce('cheer', 0.5, 'idle'); cl.emote('sparkle', 1); if (chance(0.4)) this.clientSay(st, pick(['So cute!', 'Wow!', 'Yay!'])); break;
      case 'gem': cl.playOnce('surprised', 0.45, 'idle'); cl.emote('star', 1); break;
      case 'wipe': cl.playOnce('think', 0.6, 'idle'); break;
      case 'blow': cl.playOnce('laugh', 0.8, 'idle'); if (chance(0.35)) this.clientSay(st, pick(['Whee!', 'Tickles!', 'Breezy!'])); break;
      case 'step': cl.playOnce('cheer', 0.6, 'idle'); cl.emote('heart', 1); break;
      default: break;
    }
  }

  tipFor(st) {
    const step = STEPS[st.step].id;
    const msg = step === 'polish' ? (this.anyPainted(st) ? 'Y = next step!' : 'Hold A on a nail!')
      : step === 'art' ? 'A on a nail, then Y!'
        : step === 'gems' ? 'A sticks a gem on!'
          : 'Hold A by wet nails!';
    st.tip = { text: msg, t: 0, dur: 3.2 };
    st.nextPulse = 3;
  }

  anyPainted(st) { return st.nails.some((n) => n.color != null && n.cover >= 0.5) || st.nails.some((n) => n.auto); }

  // --- choices ---------------------------------------------------------------------
  pickColor(st, d) {
    st.color = (st.color + d + POLISH.length) % POLISH.length;
    st.pickPop = 1;
    snd('nail-bottle-clink', 'tick', { vol: st.p.isAI ? 0.25 : 0.7 });
  }
  pickArtColor(st, d) {
    st.artColor = (st.artColor + d + POLISH.length) % POLISH.length;
    st.pickPop = 1;
    snd('nail-bottle-clink', 'tick', { vol: st.p.isAI ? 0.25 : 0.7 });
  }
  pickTool(st, d) {
    st.tool = (st.tool + d + TOOLS.length) % TOOLS.length;
    st.toolPop = 1;
    if (!st.p.isAI) sfx('swap', { vol: 0.6 });
  }
  pickItem(st, d) {
    st.item = (st.item + Math.sign(d) + ITEMS.length) % ITEMS.length;
    st.pickPop = 1;
    if (!st.p.isAI) sfx('select', { vol: 0.5 });
  }

  // --- step 1: polish ------------------------------------------------------------------
  startCoat(n, color) {
    if (n.color === color && n.cover > 0) return;
    if (n.color != null && n.cover >= 0.6) n.under = n.color;
    n.color = color; n.cover = 0;
  }

  paintNail(st, i, dt, rate = 2.4) {
    const n = st.nails[i];
    st.painting = true;
    if (n.color === st.color && n.cover >= 1) {
      if (chance(dt * 6)) { const s = this.nailScreen(st, i); particles.trail(s.x + rand(-8, 8), s.y + rand(-8, 8), { type: 'sparkle', colors: ['#fff'], size: [6, 10] }); }
      return;
    }
    if (n.auto) n.auto = null;
    this.startCoat(n, st.color);
    n.cover = Math.min(1, n.cover + dt * rate);
    if (st.sfxT <= 0) { snd('nail-brush', 'brush', { vol: st.p.isAI ? 0.3 : 0.7 }); st.sfxT = 0.14; }
    if (chance(dt * 12)) { const s = this.nailScreen(st, i); particles.trail(s.x + rand(-10, 10), s.y + rand(-6, 10), { type: 'drop', colors: [POLISH[st.color].c], size: [3, 6], speed: [40, 120] }); }
    if (n.cover >= 1) this.coatDone(st, i);
  }

  coatDone(st, i) {
    const n = st.nails[i];
    n.cover = 1; n.pop = 1; n.under = null;
    st.stats.coats++; st.stats.colors.add(n.color);
    const s = this.nailScreen(st, i);
    sfx('collect', { step: Math.min(10, st.nails.filter((q) => q.color != null && q.cover >= 1).length * 2), vol: st.p.isAI ? 0.35 : 0.8 });
    particles.burst(s.x, s.y, { type: 'sparkle', count: 5, colors: ['#ffffff', mix(POLISH[n.color].c, '#ffffff', 0.4)], speed: [60, 180] });
    if (st.nails.every((q) => q.color != null && q.cover >= 1) && !st.allPainted) {
      st.allPainted = true;
      particles.popText(s.x, s.y - 50 * st.k, 'All painted!', POLISH[st.color].c === '#ffffff' ? '#ff6fb1' : POLISH[st.color].c, 46 * Math.max(0.7, st.k));
      st.actor.playOnce('cheer', 0.6, 'idle');
      this.react(st, 'step', true);
      st.nextPulse = 3;
    } else this.react(st, 'paint');
  }

  paintAll(st) {
    let any = false;
    st.nails.forEach((n, i) => {
      if (n.color === st.color && n.cover >= 1) return;
      n.auto = { delay: 0.12 * i + 0.05, color: st.color };
      any = true;
    });
    if (!any) { sfx('blip'); return; }
    sfx('magic', { vol: st.p.isAI ? 0.4 : 0.8 });
    st.actor.playOnce('action', 0.4, 'idle');
    const c = this.handScreen(st, 0, -60);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 10, colors: ['#ffffff', POLISH[st.color].c], speed: [100, 300] });
  }

  updateAutoPaint(st, dt) {
    st.nails.forEach((n, i) => {
      const au = n.auto;
      if (!au) return;
      au.delay -= dt;
      if (au.delay > 0) return;
      this.startCoat(n, au.color);
      n.cover = Math.min(1, n.cover + dt * 3.6);
      if (!au.sfx) { au.sfx = true; snd('nail-brush', 'brush', { vol: st.p.isAI ? 0.25 : 0.6 }); }
      if (n.cover >= 1) { n.auto = null; this.coatDone(st, i); }
    });
  }

  wipe(st) {
    const i = st.hoverNail;
    const n = i >= 0 ? st.nails[i] : null;
    if (!n || (n.color == null && !n.auto)) { sfx('blip', { vol: 0.5 }); return; }
    Object.assign(n, newNail());
    st.allPainted = false;
    const s = this.nailScreen(st, i);
    particles.burst(s.x, s.y, { type: 'smoke', count: 5, colors: ['#ffffff', '#ffe0f0'], speed: [30, 90], size: [16, 30] });
    snd('nail-wipe', 'brush', { vol: 0.7 }); sfx('back', { vol: 0.5 });
    this.react(st, 'wipe');
  }

  // --- step 2: designs -------------------------------------------------------------------
  decorate(st) {
    const i = st.hoverNail;
    if (i < 0) { sfx('blip', { vol: 0.5 }); const c = this.toScreen(st, st.cur.x, st.cur.y); particles.burst(c.x, c.y, { type: 'spark', count: 4, colors: ['#ffffff'] }); return; }
    const n = st.nails[i], tool = TOOLS[st.tool].id, color = POLISH[st.artColor].c;
    const seed = randInt(1, 1e6);
    if (tool === 'glitter') { n.glitter = { color, t: 0, seed }; st.stats.glitter++; snd('nail-glitter', 'sparkle', { vol: st.p.isAI ? 0.35 : 0.8 }); }
    else { n.art = { tool, color, t: 0, seed }; st.stats.designs++; snd('nail-pattern', 'stamp', { vol: st.p.isAI ? 0.35 : 0.8 }); }
    n.pop = 1;
    const s = this.nailScreen(st, i);
    particles.burst(s.x, s.y, { type: tool === 'hearts' ? 'heart' : tool === 'stars' || tool === 'rainbow' ? 'star' : 'sparkle', count: 6, colors: tool === 'rainbow' ? RAINBOW : [color, '#ffffff'], speed: [80, 220], size: [8, 16] });
    st.actor.playOnce('action', 0.3, 'idle');
    this.react(st, 'art');
  }

  cleanArt(st) {
    const i = st.hoverNail;
    const n = i >= 0 ? st.nails[i] : null;
    if (!n || (!n.art && !n.glitter)) { sfx('blip', { vol: 0.5 }); return; }
    n.art = null; n.glitter = null; n.pop = 0.6;
    const s = this.nailScreen(st, i);
    particles.burst(s.x, s.y, { type: 'smoke', count: 4, colors: ['#ffffff'], speed: [30, 90], size: [14, 26] });
    snd('nail-wipe', 'brush', { vol: 0.6 }); sfx('back', { vol: 0.5 });
    this.react(st, 'wipe');
  }

  // --- step 3: gems and stickers ---------------------------------------------------------
  gemPos(st, gm, G) {
    if (gm === st.held) return { x: gm.hx, y: gm.hy, rot: gm.rot };
    if (gm.nail >= 0) { const n = G.nails[gm.nail], q = fromNail(n, gm.u, gm.v); return { x: q.x, y: q.y, rot: gm.rot + n.rot }; }
    return { x: gm.x, y: gm.y, rot: gm.rot };
  }

  gemAt(st, x, y) {
    let best = null, bd = 28;
    for (const gm of st.gems) {
      const q = this.gemPos(st, gm, st.G);
      const d = Math.hypot(q.x - x, q.y - y);
      if (d <= bd) { bd = d; best = gm; }
    }
    return best;
  }

  /** Stick gem `gm` at hand point (x, y): on a nail it rides that nail. */
  setGemAt(st, gm, x, y) {
    const i = nailAt(st.G, x, y, 6);
    if (i >= 0) { const q = toNail(st.G.nails[i], x, y); gm.nail = i; gm.u = q.u; gm.v = q.v; }
    else { gm.nail = -1; gm.x = x; gm.y = y; }
  }

  gemA(st) {
    const hp = st.hp, c = this.toScreen(st, st.cur.x, st.cur.y);
    if (st.held) {
      const gm = st.held; st.held = null;
      if (st.onHand) this.setGemAt(st, gm, hp.x, hp.y);
      else if (gm.home) Object.assign(gm, gm.home);
      gm.t = 0;
      snd('nail-gem-click', 'pop', { vol: 0.6 });
      particles.burst(c.x, c.y, { type: 'sparkle', count: 6, colors: ['#ffffff', '#fff6a8'], speed: [60, 160] });
      return;
    }
    if (st.hoverGem) {
      const gm = st.hoverGem;
      gm.home = { nail: gm.nail, u: gm.u, v: gm.v, x: gm.x, y: gm.y };
      st.held = gm; gm.hx = hp.x; gm.hy = hp.y;
      st.gems.splice(st.gems.indexOf(gm), 1); st.gems.push(gm);
      sfx('pop', { vol: 0.5 });
      return;
    }
    if (!st.onHand) { sfx('blip', { vol: 0.5 }); particles.burst(c.x, c.y, { type: 'spark', count: 4, colors: ['#ffffff'] }); return; }
    if (st.gems.length >= MAX_GEMS) { sfx('blip'); st.tip = { text: 'So much bling!', t: 0, dur: 1.6 }; return; }
    const it = ITEMS[st.item];
    const gm = { id: it.id, rot: rand(-0.3, 0.3), t: 0 };
    this.setGemAt(st, gm, hp.x, hp.y);
    st.gems.push(gm);
    st.stats.gems++;
    snd('nail-gem-click', 'pop', { vol: st.p.isAI ? 0.35 : 0.8 }); sfx('sparkle', { vol: 0.35 });
    particles.burst(c.x, c.y, { type: 'sparkle', count: 8, colors: ['#ffffff', it.c], speed: [80, 220] });
    if (st.gems.length === 1) particles.popText(c.x, c.y - 40 * st.k, 'Bling!', '#ff6fb1', 44 * Math.max(0.7, st.k));
    st.actor.playOnce('action', 0.3, 'idle');
    this.react(st, 'gem');
  }

  gemB(st) {
    const gm = st.held || st.hoverGem;
    if (!gm) { sfx('blip', { vol: 0.5 }); return; }
    const q = this.gemPos(st, gm, st.G), s = this.handScreen(st, q.x, q.y);
    st.gems.splice(st.gems.indexOf(gm), 1);
    if (st.held === gm) st.held = null;
    st.hoverGem = null;
    st.stats.gems = Math.max(0, st.stats.gems - 1);
    particles.burst(s.x, s.y, { type: 'spark', count: 8, colors: [ITEMS.find((it) => it.id === gm.id)?.c || '#fff', '#ffffff'] });
    sfx('pop', { vol: 0.6 }); sfx('back', { vol: 0.4 });
  }

  // --- step 4: dry -------------------------------------------------------------------------
  updateDry(st, dt, blowing) {
    st.fanV = blowing ? Math.min(1, st.fanV + dt * 4) : Math.max(0, st.fanV - dt * 2);
    st.fanSpin += (0.3 + st.fanV) * dt * 30;
    if (!blowing) return;
    const hp = st.hp, hub = this.toScreen(st, st.cur.x, st.cur.y);
    if (st.sfxT <= 0) { snd('nail-fan', 'whoosh', { vol: st.p.isAI ? 0.2 : 0.45 }); st.sfxT = 0.32; }
    if (chance(dt * 18)) particles.trail(hub.x + rand(-30, 30) * st.k, hub.y - 40 * st.k, { type: 'dust', colors: ['#ffffff', '#e6f7ff'], angle: -Math.PI / 2, spread: 0.5, speed: [120, 260], size: [8, 16] });
    let any = false;
    st.G.nails.forEach((n, i) => {
      const s = st.nails[i];
      if (s.wet <= 0) return;
      // the fan blows upward: nails above and near the fan dry fastest
      const dx = n.x - hp.x, dy = n.y - hp.y, d = Math.hypot(dx, dy * (dy < 0 ? 0.7 : 1.4));
      if (d > 190) return;
      any = true;
      s.wet = Math.max(0, s.wet - dt * 1.25 * (1 - d / 240));
      if (chance(dt * 8)) { const q = this.nailScreen(st, i); particles.trail(q.x + rand(-8, 8), q.y, { type: 'sparkle', colors: ['#ffffff', '#c8f0ff'], size: [6, 12] }); }
      if (s.wet <= 0) this.nailDry(st, i);
    });
    if (any) this.react(st, 'blow');
  }

  nailDry(st, i) {
    const s = st.nails[i]; s.wet = 0; s.pop = 1;
    const q = this.nailScreen(st, i);
    const left = st.nails.filter((n) => n.wet > 0).length;
    snd('nail-dry-ding', 'correct', { vol: st.p.isAI ? 0.3 : 0.7 });
    particles.burst(q.x, q.y, { type: 'sparkle', count: 8, colors: ['#ffffff', '#fff6a8'], speed: [80, 220] });
    if (!st.p.isAI || this.n <= 2) particles.popText(q.x, q.y - 30 * st.k, 'Dry!', '#4fb8ff', 34 * Math.max(0.7, st.k));
    if (left === 0) this.stationDone(st);
  }

  startDry(st) {
    let wet = 0;
    for (const n of st.nails) { n.wet = n.color != null || n.art || n.glitter ? 1 : 0; if (n.wet) wet++; }
    if (!wet) this.stationDone(st);
  }

  /** Clock ran out on the dry step (or the show starts): a little magic finishes it. */
  magicDry(st) {
    for (let i = 0; i < 5; i++) if (st.nails[i].wet > 0) { st.nails[i].wet = 0; st.nails[i].pop = 1; }
    const c = this.handScreen(st, 0, -60);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 16, colors: ['#ffffff', '#fff6a8', '#c8f0ff'], speed: [120, 320] });
    sfx('magic', { vol: 0.6 });
    this.stationDone(st);
  }

  stationDone(st) {
    if (st.mode === 'done') return;
    st.mode = 'done'; st.doneT = 0; st.step = STEPS.length; st.held = null; st.fanV = 0; st.wig = 1;
    const c = this.handScreen(st, 0, -40);
    particles.burst(c.x, c.y, { type: 'confetti', count: 30 });
    particles.burst(c.x, c.y, { type: 'sparkle', count: 14, colors: ['#ffffff', '#fff6a8', '#ffc4e6'], speed: [120, 360] });
    particles.ring(c.x, c.y, st.p.color, 220 * st.k);
    particles.popText(c.x, c.y - 120 * st.k, pick(['Gorgeous!', 'Sparkly!', 'So pretty!', 'Fabulous!']), '#ff6fb1', 60 * Math.max(0.7, st.k));
    snd('nail-all-done', 'star', { vol: st.p.isAI ? 0.5 : 0.9 }); sfx('yay', { vol: st.p.isAI ? 0.4 : 0.8 });
    if (!st.p.isAI) { fx.shake(5, 0.2); voice(st.p.charId, 'yay'); try { st.p.ctrl.rumble(0.5, 200); } catch (e) { /* ignore */ } }
    st.actor.playOnce('celebrate', 1.6, 'idle');
    st.client.playOnce('celebrate', 1.8, 'idle');
    this.clientSay(st, pick(['I love it!', 'So sparkly!', 'Thank you!', 'Wow, look!']), 44);
    st.client.emote('hearts', 1.8);
  }

  admire(st) {
    if (st.reactT > 0) return;
    st.reactT = 0.7; st.wig = 1;
    st.client.playOnce(pick(['cheer', 'laugh', 'present']), 0.7, 'idle'); st.client.emote('heart', 1);
    const c = this.handScreen(st, 0, -80);
    particles.burst(c.x, c.y, { type: 'heart', count: 3 });
    sfx('giggle', { vol: 0.5 });
  }

  // --- steps ---------------------------------------------------------------------------------
  nextStep(st, auto) {
    if (st.mode !== 'work') return;
    const step = STEPS[st.step].id;
    if (!auto && step === 'polish' && !this.anyPainted(st)) {
      st.nextBump = 0.4; sfx('blip'); st.tip = { text: 'Paint a nail first!', t: 0, dur: 1.8 }; return;
    }
    if (step === 'dry') { if (auto) this.magicDry(st); else { st.nextBump = 0.4; sfx('blip'); st.tip = { text: 'Blow on the wet nails!', t: 0, dur: 1.8 }; } return; }
    if (step === 'gems' && st.held) { const gm = st.held; st.held = null; if (gm.home) Object.assign(gm, gm.home); }
    if (step === 'polish') for (const n of st.nails) if (n.auto) { n.auto = null; n.cover = Math.max(n.cover, 1); }
    st.step++; st.stepT = 0; st.idleT = 0; st.tip = null; st.nextPulse = 0;
    sfx('swap', { vol: st.p.isAI ? 0.3 : 0.7 }); sfx('sparkle', { vol: st.p.isAI ? 0.2 : 0.5 });
    if (auto && !st.p.isAI) particles.popText(this.toScreen(st, 440, 60).x, this.toScreen(st, 440, 60).y, `${STEPS[st.step].n}!`, '#ff6fb1', 50 * Math.max(0.7, st.k));
    st.actor.playOnce('cheer', 0.5, 'idle');
    this.react(st, 'step', true);
    if (STEPS[st.step].id === 'dry') this.startDry(st);
  }

  // --- CPU ----------------------------------------------------------------------------------
  planFor(st) {
    const A = st.ai, step = STEPS[st.step].id, T = [];
    const lvl = st.p.aiLevel || 0;
    if (step === 'polish') {
      const c0 = randInt(0, 8);
      let c1 = randInt(0, 8); if (c1 === c0) c1 = (c0 + 3) % 9;
      const scheme = pick(['one', 'one', 'two', 'rainbow', 'accent']);
      const cols = scheme === 'one' ? [c0, c0, c0, c0, c0]
        : scheme === 'two' ? [c0, c1, c0, c1, c0]
          : scheme === 'accent' ? [c0, c0, c0, c1, c0]
            : shuffle([0, 1, 2, 3, 4, 5, 6, 8]).slice(0, 5);
      if (scheme === 'one' && chance(0.55)) T.push({ k: 'color', v: c0 }, { k: 'all' }, { k: 'wait', t: 1.4 });
      else {
        const order = [1, 2, 3, 4, 0];
        // group by colour so the CPU isn't switching bottles all the time
        const byCol = [...new Set(order.map((i) => cols[i]))];
        for (const c of byCol) { T.push({ k: 'color', v: c }); for (const i of order) if (cols[i] === c) T.push({ k: 'paint', nail: i }); }
      }
    } else if (step === 'art') {
      const tools = ['stripes', 'dots', 'hearts', 'stars', 'tips', 'rainbow'];
      const main = pick(tools), ti = TOOLS.findIndex((t) => t.id === main);
      const used = new Set(st.nails.map((n) => n.color));
      let ac = pick([7, 7, 8, 0, 3, 5, 9].filter((c) => !used.has(c))); if (ac === undefined) ac = 7;
      const nails = shuffle([0, 1, 2, 3, 4]).slice(0, randInt(2, 5)).sort((a, b) => ((a + 4) % 5) - ((b + 4) % 5));
      T.push({ k: 'tool', v: ti }, { k: 'acolor', v: ac });
      for (const i of nails) T.push({ k: 'tap', nail: i });
      if (chance(0.55)) {
        const gl = shuffle([0, 1, 2, 3, 4]).slice(0, randInt(1, 2));
        T.push({ k: 'tool', v: 0 }, { k: 'acolor', v: pick([8, 7, 0, 6]) });
        for (const i of gl) T.push({ k: 'tap', nail: i });
      }
    } else if (step === 'gems') {
      const count = randInt(2, 5 + lvl);
      const kinds = shuffle(ITEMS.map((_, i) => i)).slice(0, randInt(1, 3));
      const G = geom(st.style);
      for (let k = 0; k < count; k++) {
        const it = pick(kinds);
        let spot = null;
        for (let tries = 0; tries < 12 && !spot; tries++) {
          let x, y;
          if (chance(0.78)) { const n = pick(G.nails), q = fromNail(n, rand(-0.15, 0.15) * n.w, rand(0, 0.25) * n.h); x = q.x; y = q.y; }
          else if (st.style.kind === 'paw') { x = rand(-70, 70); y = rand(40, 140); }
          else { x = rand(-80, 80); y = rand(10, 140); }
          const near = st.gems.some((gm) => { const q = this.gemPos(st, gm, G); return Math.hypot(q.x - x, q.y - y) < 36; })
            || T.some((tk) => tk.k === 'gem' && Math.hypot(tk.x - x, tk.y - y) < 36);
          if (!near) spot = { x, y };
        }
        if (spot) T.push({ k: 'item', v: it }, { k: 'gem', x: spot.x, y: spot.y });
      }
      if (chance(0.3)) T.push({ k: 'move' });
    } else if (step === 'dry') {
      T.push({ k: 'dry' });
    }
    if (step !== 'dry') T.push({ k: 'wait', t: rand(0.5, 1.3) }, { k: 'next' });
    A.tasks = T; A.cur = null; A.planned = st.step;
  }

  ai(st, dt) {
    const p = st.p, c = p.ctrl, A = st.ai, prof = aiProfile(p);
    c.move(0, 0);
    if (A.planned !== st.step) { c.hold('a', false); this.planFor(st); A.t = Math.max(A.t, rand(0.5, 1.1)); }
    A.t -= dt;
    if (A.t > 0) { c.hold('a', false); return; }
    if (!A.cur) {
      A.cur = A.tasks.shift() || null;
      if (!A.cur) { c.hold('a', false); return; }
      A.cur.age = 0;
      // easier CPUs dawdle and admire between jobs
      if (chance(0.12 * (2 - Math.min(2, p.aiLevel || 0)))) { A.t = rand(0.5, 1.4); return; }
    }
    const tk = A.cur;
    tk.age += dt;
    const done = (wait = reactionTime(p) * 0.6) => { A.cur = null; A.t = wait; c.hold('a', false); };
    const go = (lx, ly, arrive = 46) => steer(p, st.cur.x, st.cur.y, lx, ly, { arrive });
    const nailLocal = (i, dv = 0) => { const n = geom(st.style).nails[i], q = fromNail(n, 0, dv * n.h); return handToLocal(q.x, q.y); };
    if (tk.age > 9) { done(0.3); return; }   // never get stuck
    switch (tk.k) {
      case 'wait': if (tk.age >= tk.t) done(0); break;
      case 'next': c.press('y'); done(0.5); break;
      case 'all': c.press('x'); done(0.4); break;
      case 'color': case 'acolor': {
        const curV = tk.k === 'color' ? st.color : st.artColor;
        if (curV === tk.v) { done(rand(0.2, 0.5)); break; }
        const fwd = (tk.v - curV + POLISH.length) % POLISH.length;
        c.press(fwd <= POLISH.length / 2 ? 'rb' : 'lb'); A.t = rand(0.12, 0.25) / prof.speed;
        break;
      }
      case 'tool': {
        if (st.tool === tk.v) { done(rand(0.2, 0.5)); break; }
        c.press('x'); A.t = rand(0.14, 0.28) / prof.speed;
        break;
      }
      case 'item': {
        if (st.item === tk.v) { done(rand(0.15, 0.4)); break; }
        c.press('rb'); A.t = rand(0.1, 0.22) / prof.speed;
        break;
      }
      case 'paint': {
        const n = st.nails[tk.nail];
        if (n.color === st.color && n.cover >= 1) { done(); break; }
        const q = nailLocal(tk.nail, 0.1);
        const d = go(q.x, q.y);
        c.hold('a', d < 16 || (d < 30 && c.held('a')));
        break;
      }
      case 'tap': {
        const q = nailLocal(tk.nail, rand(-0.02, 0.02));
        const d = go(q.x, q.y, 40);
        if (d < 12) { c.press('a'); done(); }
        break;
      }
      case 'gem': {
        const q = handToLocal(tk.x, tk.y);
        const d = go(q.x, q.y, 40);
        if (d < 8) {
          if (st.hoverGem) { tk.x += rand(-30, 30); tk.y += rand(-20, 20); break; }
          c.press('a'); done();
        }
        break;
      }
      case 'move': {
        if (!tk.gm) {
          if (!st.gems.length) { done(0); break; }
          tk.gm = pick(st.gems);
          const G = geom(st.style), n = pick(G.nails), to = fromNail(n, 0, 0.12 * n.h);
          tk.to = to;
        }
        if (!st.gems.includes(tk.gm)) { done(0); break; }
        if (st.held !== tk.gm) {
          const p0 = this.gemPos(st, tk.gm, st.G), q = handToLocal(p0.x, p0.y);
          const d = go(q.x, q.y, 40);
          if (d < 7 && st.hoverGem === tk.gm) { c.press('a'); A.t = 0.3; }
        } else {
          const q = handToLocal(tk.to.x, tk.to.y);
          const d = go(q.x, q.y, 40);
          if (d < 8) { c.press('a'); done(); }
        }
        break;
      }
      case 'dry': {
        const wet = st.nails.map((n, i) => [n, i]).filter(([n]) => n.wet > 0);
        if (!wet.length) { done(); break; }
        if (tk.nail === undefined || st.nails[tk.nail].wet <= 0) tk.nail = wet[0][1];
        tk.age = 0;
        const q = nailLocal(tk.nail, 0.9);
        const d = go(q.x, q.y + 10, 60);
        c.hold('a', d < 70);
        break;
      }
      default: done(0);
    }
  }

  // --- showcase ------------------------------------------------------------------------------
  startShow() {
    if (this.phase === 'show') return;
    this.phase = 'show'; this.phaseT = 0; this.cheese = false; this.photoTaken = false; this.photoT = 0;
    for (const p of this.players) if (p.isAI) { p.ctrl.hold('a', false); p.ctrl.move(0, 0); }
    // everyone is show-ready (a little salon magic for unfinished hands)
    for (const st of this.stations) {
      if (!st.nails.some((n) => n.color != null)) { const c = randInt(0, 8); for (const n of st.nails) { n.color = c; n.cover = 1; } }
      for (const n of st.nails) { n.auto = null; if (n.color != null) n.cover = 1; n.wet = 0; }
      if (st.held) { const gm = st.held; st.held = null; if (gm.home) Object.assign(gm, gm.home); }
      st.mode = 'done';
      st.design = this.designName(st);
    }
    const n = this.n;
    const rows = n <= 4 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    this.slots = [];
    rows.forEach((count, r) => {
      const two = rows.length === 2;
      const floor = two ? (r === 0 ? 650 : 1010) : 975;
      // (keep clear of the curtains at both sides)
      const slotW = Math.min(two ? 420 : 560, (W - (two ? 340 : 300)) / (count + (two ? 0.5 : 0)));
      const hs = two ? Math.min(0.5, slotW / 640) : Math.min(0.92, slotW / 560);
      for (let k = 0; k < count; k++) {
        const x = W / 2 + (k - (count - 1) / 2) * slotW + (two && r === 0 ? -slotW * 0.25 : two ? slotW * 0.25 : 0);
        this.slots.push({ x, floor, slotW, hs, row: r });
      }
    });
    this.stations.forEach((st, i) => {
      const sl = this.slots[i], a = st.actor;
      st.slot = sl;
      sl.ped = { w: 250 * sl.hs, h: 300 * sl.hs };
      sl.handX = sl.x - sl.slotW * 0.1;
      sl.handY = sl.floor - sl.ped.h - 172 * sl.hs;
      const th = 430 * sl.hs;
      a.scale = Math.min(th / a.leader.h, (sl.slotW * 0.36) / Math.max(1, a.width / a.scale));
      a.x = sl.x + sl.slotW * 0.33; a.y = sl.floor - 6; a.facing = -1; a.z = 0; a.snap();
      a.clearEmotes?.(); a.say(null); a.setPose('idle');
      st.homeX = a.x; st.hop = null; st.spotT = undefined; st.wig = 0;
    });
    this.showOrder = this.stations.slice().sort((a, b) => a.slot.floor - b.slot.floor);
    this.spotGap = n <= 2 ? 2.0 : n <= 4 ? 1.6 : 1.15;
    this.spotStart = 1.6;
    this.cheeseAt = this.spotStart + n * this.spotGap + 0.5;
    sfx('whoosh'); sfx('magic'); snd('applause', 'cheer', { vol: 0.5 });
  }

  designName(st) {
    const counts = new Map();
    for (const n of st.nails) if (n.color != null) counts.set(n.color, (counts.get(n.color) || 0) + 1);
    const colors = [...counts.keys()];
    let col = colors.length >= 4 ? 'Rainbow' : POLISH[[...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0].n;
    const tools = new Map();
    for (const n of st.nails) if (n.art) tools.set(n.art.tool, (tools.get(n.art.tool) || 0) + 1);
    const top = [...tools.entries()].sort((a, b) => b[1] - a[1])[0];
    const glit = st.nails.some((n) => n.glitter);
    let feat = top ? TOOL_NAME[top[0]] : glit ? 'Sparkle' : st.gems.length >= 3 ? 'Bling' : 'Shine';
    if (col === 'Rainbow' && feat === 'Rainbow Tips') return 'Rainbow Tips';
    if (top && glit && feat.split(' ').length === 1) feat = `Sparkle ${feat}`;
    return `${col} ${feat}`;
  }

  updateShow(dt) {
    const t = this.phaseT, cam = this.api.camera;
    for (const st of this.stations) {
      if (st.spotT !== undefined) st.spotT += dt;
      st.wig = Math.max(0, st.wig - dt * 0.7);
      st.actor.update(dt);
    }
    for (let i = 0; i < this.n; i++) {
      const at = this.spotStart + i * this.spotGap;
      if (t >= at && t - dt < at) {
        const st = this.stations[i], sl = st.slot, a = st.actor;
        st.spotT = 0; st.wig = 1;
        a.playOnce(pick(['present', 'cheer', 'pose-twirl']), 1.0, 'idle'); a.squash(-0.2);
        sfx('magic', { vol: 0.7 }); sfx('sparkle');
        snd('crowd-ooh', null, { vol: 0.5 });
        particles.burst(sl.handX, sl.handY - 80 * sl.hs, { type: 'sparkle', count: 16, colors: ['#ffffff', '#fff6a8', '#ffc4e6'], speed: [120, 320] });
        particles.burst(sl.handX, sl.handY - 80 * sl.hs, { type: 'star', count: 6 });
        if (cam) cam.punch(sl.handX, sl.handY, 1.12, this.spotGap * 0.55);
      }
    }
    if (t >= this.cheeseAt && !this.cheese) {
      this.cheese = true; sfx('giggle');
      for (const st of this.stations) { st.hop = { h: 0, v: 0 }; st.poseCD = 0; st.actor.setPose('wave'); }
    }
    if (this.cheese && !this.photoTaken) for (const st of this.stations) this.cheeseMove(st, dt);
    const shot = this.cheeseAt + CHEESE_TIME;
    for (const d of [3, 2, 1]) if (t >= shot - d && t - dt < shot - d) sfx(d === 1 ? 'tock' : 'tick');
    if (t >= shot && !this.photoTaken) {
      this.photoTaken = true; this.photoT = 0;
      fx.flash('#ffffff', 0.45);
      snd('camera-flash', 'shutter', { vol: 0.7 });
      sfx('fanfare'); snd('applause', 'cheer');
      particles.confettiRain(W, 140);
      this.stations.forEach((st, i) => { st.hop = null; st.actor.y = st.slot.floor - 6; st.wig = 1; st.actor.playOnce(i % 2 ? 'photo' : 'strike3', 1.0, 'celebrate'); });
    }
    if (this.photoTaken) { this.photoT += dt; if (this.photoT > 3.2) this.finishGame(); }
    if (cam && !cam.punchState) cam.follow(W / 2, H / 2, 1, 3);
  }

  cheeseMove(st, dt) {
    const a = st.actor, c = st.p.ctrl, hop = st.hop, sl = st.slot;
    st.poseCD = Math.max(0, st.poseCD - dt);
    let mx = photoMove(c).x, jump = c.pressed('a'), pose = photoPosePressed(c);
    if (st.p.isAI) {
      st.aiT = (st.aiT ?? rand(0.2, 0.8)) - dt;
      if (st.aiT <= 0) { st.aiT = rand(0.5, 1.3); st.aiMx = chance(0.35) ? rand(-0.7, 0.7) : 0; if (chance(0.3)) jump = true; else if (chance(0.6)) pose = randomPhotoPose(); }
      mx = st.aiMx || 0;
      if (Math.abs(a.x - st.homeX) > sl.slotW * 0.2) mx = Math.sign(st.homeX - a.x) * 0.6;
    }
    a.x = clamp(a.x + mx * 480 * dt, sl.x - sl.slotW * 0.48, sl.x + sl.slotW * 0.48);
    if (Math.abs(mx) > 0.2) a.facing = mx > 0 ? 1 : -1;
    if (jump && hop.h <= 0) { hop.v = 900; sfx('boing', { vol: 0.35 }); a.squash(-0.25); }
    hop.v -= 2800 * dt; hop.h = Math.max(0, hop.h + hop.v * dt);
    if (hop.h <= 0 && hop.v < 0) { if (hop.v < -200) a.squash(0.2); hop.v = 0; }
    a.y = sl.floor - 6 - hop.h * sl.hs * 1.6;
    if (pose && st.poseCD <= 0) { st.poseCD = 0.35; strikePhotoPose(a, pose, { onBump: () => this.bump(st) }); }
    if (!a._once) a.setPose(hop.h > 0 ? 'jump' : Math.abs(mx) > 0.2 ? 'walk' : 'idle');
  }

  bump(st) {
    for (const o of this.stations) {
      if (o === st || !o.hop || o.slot.row !== st.slot.row) continue;
      const dx = o.actor.x - st.actor.x;
      if (Math.abs(dx) < (o.actor.width + st.actor.width) * 0.45) { o.actor.x += Math.sign(dx || 1) * 50; o.actor.playOnce('surprised', 0.8, 'idle'); o.hop.v = Math.max(o.hop.v, 300); }
    }
    sfx('boing', { vol: 0.4 });
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((s) => (s.gems.length && this.n <= 4 ? `${s.design || this.designName(s)} · ${plural(s.gems.length, 'gem')}` : s.design || this.designName(s)));
    // everyone wins: no showstopper (like the other studio games)
    const focus = this.phase === 'show' ? { x: W / 2, y: 640, zoom: 1.1 } : undefined;
    this.api.finishTogether({ stats, title: 'Gorgeous!', focus });
  }

  // --- helpers ------------------------------------------------------------------------------
  nailScreen(st, i) {
    const n = (st.G || geom(st.style)).nails[i];
    return this.handScreen(st, n.x, n.y);
  }

  // ===========================================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'show') { this.drawShow(g); return; }
    this.drawSalon(g);
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawHUD(g) {
    const P = this.phase, t = this.phaseT;
    if (P !== 'show') {
      this.drawTopBar(g);
      if (P === 'intro') {
        ui.banner(g, 'Salon is open!', t, { size: 150, color: '#ff7ac6' });
        ui.text(g, 'Polish, sparkle, gems, dry!', W / 2, H / 2 + 120, { size: 58, color: '#fff', alpha: clamp((t - 0.3) / 0.3, 0, 1) });
      } else if (P === 'play' && this.allDoneT > 0) {
        ui.banner(g, 'Show time!', this.allDoneT, { size: 140, color: '#ffd23f' });
      }
      return;
    }
    // showcase HUD
    if (t < this.spotStart + 0.4) ui.banner(g, 'Nail Gallery!', t, { y: 150, size: 120, color: '#ff7ac6' });
    const cam = this.api.camera;
    for (const st of this.stations) {
      if (st.spotT === undefined || st.spotT > this.spotGap * 0.95 || this.cheese) continue;
      const u = st.spotT, life = Math.min(clamp(u / 0.2, 0, 1), clamp((this.spotGap * 0.95 - u) / 0.25, 0, 1));
      const sl = st.slot;
      const pos = cam ? cam.toScreen(sl.handX, sl.handY - 230 * sl.hs) : { x: sl.handX, y: sl.handY - 230 * sl.hs };
      g.save(); g.globalAlpha = life; g.translate(clamp(pos.x, 300, W - 300), clamp(pos.y, 120, H - 200)); const s = ease.outBack(life); g.scale(s, s);
      ui.panel(g, -250, -56, 500, 112, { r: 56, fill: '#ffffff', stroke: st.p.color, lineWidth: 8 });
      drawPortrait(g, st.p, -196, 0, 40, { expr: 'happy', ring: st.p.color });
      ui.text(g, st.design, 26, -14, { size: 40, color: '#ff6fb1', maxWidth: 400, strokeWidth: 7 });
      ui.text(g, playerName(st.p), 26, 30, { size: 28, color: NAVY, stroke: false, maxWidth: 400 });
      g.restore();
    }
    const ch = this.cheeseAt, shot = ch + CHEESE_TIME;
    if (!this.photoTaken && this.cheese) {
      if (t < shot - 3) ui.banner(g, 'Say cheese!', t - ch, { y: 160, size: 120, color: '#fff' });
      else { const n = Math.ceil(shot - t), f = 1 - (shot - t - (n - 1)); g.save(); g.translate(W / 2, 170); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6; ui.text(g, String(n), 0, 0, { size: 180, color: '#ffd23f', strokeWidth: 12 }); g.restore(); }
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
        g.save(); g.fillStyle = 'rgba(36,22,63,0.35)'; ui.roundRect(g, W / 2 - 700, H - 146, 1400, 132, 30); g.fill(); g.restore();
        ui.hints(g, r1, W / 2, H - 112, { size: 34 }); ui.hints(g, r2, W / 2, H - 52, { size: 34 });
      }
    }
    if (this.photoTaken) {
      const s = ease.outBack(clamp(this.photoT / 0.5, 0, 1));
      g.save(); g.translate(W / 2, 110); g.scale(s, s); g.rotate(-0.03);
      ui.panel(g, -420, -54, 840, 108, { r: 54, fill: '#ff7ac6' });
      ui.text(g, 'Gorgeous nails!', 0, 4, { size: 70, weight: 800 });
      for (const sx of [-1, 1]) { g.save(); g.translate(sx * 460, 0); g.rotate(this.t * 2 * sx); drawStarShape(g, 70, '#ffd23f'); g.restore(); }
      g.restore();
    }
  }

  drawTopBar(g) {
    g.save();
    const gr = g.createLinearGradient(0, 0, 0, 102);
    gr.addColorStop(0, '#fff3fa'); gr.addColorStop(1, '#ffe0f0');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 94);
    for (let x = W; x >= 0; x -= 48) g.quadraticCurveTo(x - 24, 110, x - 48, 94);
    g.closePath(); g.fill();
    g.lineWidth = 4; g.strokeStyle = 'rgba(36,22,63,0.25)'; g.stroke();
    g.restore();
    // player chips: portrait, tag, the step they're on and four step pips
    const n = this.n, title = n <= 3;
    const x0 = title ? 520 : 24, avail = W - x0 - 24;
    const cw = Math.min(250, (avail - (n - 1) * 12) / n);
    const tot = n * cw + (n - 1) * 12;
    let x = x0 + (avail - tot) / 2;
    if (title) {
      ui.text(g, 'Sparkle Nails', 40, 50, { size: 50, color: '#ff6fb1', align: 'left', strokeWidth: 9, maxWidth: 440 });
    }
    this.stations.forEach((s) => {
      const p = s.p, y = 10;
      ui.panel(g, x, y, cw, 76, { r: 38, fill: '#ffffff', stroke: p.color, lineWidth: 6 });
      drawPortrait(g, p, x + 38, y + 38, 29, { expr: s.mode === 'done' ? 'happy' : 'neutral', ring: null });
      ui.text(g, p.tag, x + 78, y + 22, { size: 20, color: p.color, align: 'left', strokeWidth: 4 });
      const label = s.mode === 'done' ? 'Done!' : s.mode === 'arrive' ? 'Hello!' : STEPS[s.step].n;
      ui.text(g, label, x + 78, y + 50, { size: 28, color: NAVY, align: 'left', stroke: false, weight: 800, maxWidth: cw - 150 + 60 });
      for (let k = 0; k < 4; k++) {
        const px = x + cw - 22 - (3 - k) * 15, py = y + 22;
        g.beginPath(); g.arc(px, py, 5.5, 0, TAU);
        g.fillStyle = k < s.step || s.mode === 'done' ? '#ff6fb1' : k === s.step ? '#ffd23f' : '#ffffff'; g.fill();
        g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      }
      x += cw + 12;
    });
  }

  drawSalon(g) {
    const bg = art('bg/nail-studio');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#f3e4ff'); gr.addColorStop(1, '#ffe2f0');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // tiny hearts wallpaper
    g.save(); g.globalAlpha = 0.35;
    for (let y = 140, row = 0; y < H; y += 90, row++) for (let x = (row % 2) * 60; x < W; x += 120) { g.save(); g.translate(x, y); drawHeartShape(g, 18, '#ffffff'); g.restore(); }
    g.restore();
    // bulb lights
    g.beginPath(); g.moveTo(0, 120);
    for (const b of this.bulbs) g.quadraticCurveTo(b.x - 44, 150, b.x, 124);
    g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.4)'; g.stroke();
    this.bulbs.forEach((b, i) => {
      g.beginPath(); g.arc(b.x, 136, 10, 0, TAU);
      g.fillStyle = b.c; g.globalAlpha = 0.65 + 0.35 * Math.sin(this.t * 3 + i); g.fill(); g.globalAlpha = 1;
      g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    });
    if (this.sideRoom) {
      for (const side of [0, 1]) {
        const x0 = side ? W - 240 : 20;
        for (let s = 0; s < 3; s++) {
          const y = 360 + s * 230;
          g.fillStyle = '#ffffff'; g.fillRect(x0, y, 220, 16); g.fillStyle = '#e7c9f0'; g.fillRect(x0, y + 16, 220, 7);
          for (let j = 0; j < 5; j++) { const pc = POLISH[(side * 5 + s * 2 + j) % POLISH.length]; drawBottle(g, pc.c, x0 + 26 + j * 42, y, 56, { shimmer: pc.shimmer }); }
        }
      }
    }
    g.fillStyle = '#ffd0e6'; g.fillRect(0, H - 36, W, 36);
    g.fillStyle = '#ffffff';
    for (let x = 0; x < W; x += 72) g.fillRect(x, H - 36, 36, 18), g.fillRect(x + 36, H - 18, 36, 18);
  }

  drawStation(g, st) {
    const { p, k } = st;
    g.save();
    g.translate(st.ox, st.oy); g.scale(k, k);
    g.save();
    ui.roundRect(g, 0, 0, SW, SH, 26); g.clip();
    this.drawRoom(g, st);
    this.drawHandArea(g, st);
    this.drawTray(g, st);
    this.drawPanel(g, st);
    // the manicurist (the player's character)
    const a = st.actor;
    g.fillStyle = mix(p.color, '#ffffff', 0.55);
    g.beginPath(); g.ellipse(CHAR.x, CHAR.y, 74, 18, 0, 0, TAU); g.fill();
    a.draw(g, { ring: p.color });
    if (this.phase === 'intro' || (this.phase === 'play' && this.phaseT < 4)) ui.playerTag(g, p, CHAR.x, CHAR.y - a.height - 16);
    this.drawCursor(g, st);
    if (st.tip) this.drawTip(g, st);
    g.restore();
    // frame
    ui.roundRect(g, 0, 0, SW, SH, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke();
    g.restore();
  }

  drawRoom(g, st) {
    const p = st.p;
    const room = art('bg/nail-studio-station');
    if (room) g.drawImage(room, 0, 0, SW, SH);
    else {
      const wg = g.createLinearGradient(0, 0, 0, TABLE_Y);
      wg.addColorStop(0, mix(p.color, '#ffffff', 0.86)); wg.addColorStop(1, mix(p.color, '#ffffff', 0.74));
      g.fillStyle = wg; g.fillRect(0, 0, SW, TABLE_Y);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let y = 18, row = 0; y < TABLE_Y; y += 34, row++) for (let x = (row % 2) * 17; x < SW; x += 34) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
      // a round mirror on the wall
      g.beginPath(); g.arc(250, 92, 52, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.arc(250, 92, 40, 0, TAU); g.fillStyle = '#dff4ff'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(236, 78, 8, 16, 0.6, 0, TAU); g.fill();
    }
    // client behind the table
    g.save(); g.beginPath(); g.rect(0, 0, SW, TABLE_Y + 2); g.clip();
    st.client.draw(g, { shadow: false });
    g.restore();
    if (!room) {
      const cg = g.createLinearGradient(0, TABLE_Y, 0, SH);
      cg.addColorStop(0, '#ffe6f1'); cg.addColorStop(1, '#ffd2e6');
      g.fillStyle = cg; g.fillRect(0, TABLE_Y, SW, SH - TABLE_Y);
      // marble veins
      g.strokeStyle = 'rgba(200,150,190,0.35)'; g.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const y = TABLE_Y + 60 + i * 62; g.beginPath(); g.moveTo(-20, y); g.bezierCurveTo(200, y - 40, 420, y + 50, SW + 20, y - 10); g.stroke(); }
      g.fillStyle = '#ffffff'; g.fillRect(0, TABLE_Y - 2, SW, 14);
      g.fillStyle = 'rgba(36,22,63,0.15)'; g.fillRect(0, TABLE_Y + 12, SW, 4);
    }
    // a few bottles and a towel on the table (left)
    g.fillStyle = '#bfefff'; ui.roundRect(g, 18, 268, 150, 46, 12); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(18, 284, 150, 6);
    for (let j = 0; j < 3; j++) { const pc = POLISH[(st.i * 3 + j * 4) % POLISH.length]; drawBottle(g, pc.c, 40 + j * 52, 266, 48, { shimmer: pc.shimmer }); }
  }

  drawHandArea(g, st) {
    const e = ease.outBack(clamp(st.appear, 0, 1));
    // cushion
    const cx = HAND.x, cy = HAND.y + 150 * HAND.s;
    if (!drawArt(g, 'prop/nail-cushion', cx, cy + 10, 420 * HAND.s, 210 * HAND.s)) {
      g.beginPath(); g.ellipse(cx, cy + 22, 212, 66, 0, 0, TAU); g.fillStyle = 'rgba(36,22,63,0.15)'; g.fill();
      g.beginPath(); g.ellipse(cx, cy, 206, 62, 0, 0, TAU); g.fillStyle = '#ff9fcf'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.ellipse(cx, cy - 6, 186, 46, 0, 0, TAU); g.fillStyle = '#ffc2e2'; g.fill();
      g.beginPath(); g.ellipse(cx, cy + 2, 206, 62, 0, 0.15, Math.PI - 0.15); g.lineWidth = 4; g.strokeStyle = '#ffd23f'; g.stroke();
    }
    if (st.appear <= 0) return;
    const G = geom(st.style, st.wig, this.t);
    g.save();
    g.translate(HAND.x, HAND.y + (1 - e) * 120); g.scale(HAND.s, HAND.s);
    g.globalAlpha = clamp(st.appear * 2, 0, 1);
    drawHandBase(g, st.style, G);
    const showHover = st.mode === 'work' && (STEPS[st.step].id === 'polish' || STEPS[st.step].id === 'art');
    G.nails.forEach((n, i) => drawNail(g, n, st.nails[i], this.t, { hover: showHover && i === st.hoverNail }));
    // gems (held one last, a bit bigger)
    for (const gm of st.gems) {
      const q = this.gemPos(st, gm, G);
      const pop = gm.t < 0.25 ? 1 + Math.sin((gm.t / 0.25) * Math.PI) * 0.35 : 1;
      const big = gm === st.held ? 1.25 : gm === st.hoverGem ? 1.12 : 1;
      if (gm === st.held) { g.beginPath(); g.ellipse(q.x + 6, q.y + 14, 16, 7, 0, 0, TAU); g.fillStyle = 'rgba(36,22,63,0.2)'; g.fill(); }
      drawSticker(g, gm.id, q.x, q.y - (gm === st.held ? 10 : 0), ITEM_SIZE * pop * big, q.rot, this.t);
      if (gm === st.hoverGem) { g.save(); g.setLineDash([6, 5]); g.lineDashOffset = -this.t * 30; g.beginPath(); g.arc(q.x, q.y, ITEM_SIZE * 0.7, 0, TAU); g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.stroke(); g.restore(); }
    }
    // a twinkle now and then on finished nails
    if (st.mode === 'done') {
      G.nails.forEach((n, i) => {
        const tw = Math.sin(this.t * 3 + i * 1.9);
        if (tw > 0.6) { g.save(); g.translate(n.x + n.w * 0.2, n.y - n.h * 0.3); g.globalAlpha = (tw - 0.6) / 0.4; drawSparkleShape(g, 26, '#ffffff'); g.restore(); }
      });
    }
    g.restore();
  }

  drawTray(g, st) {
    const T = TRAY, step = st.mode === 'done' ? 'done' : STEPS[st.step].id, t = this.t;
    g.save();
    ui.roundRect(g, T.x, T.y, T.w, T.h, 22);
    g.fillStyle = 'rgba(255,255,255,0.88)'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    if (step === 'polish') {
      const sw = (T.w - 20) / POLISH.length;
      POLISH.forEach((pc, i) => {
        const x = T.x + 10 + sw * (i + 0.5), sel = i === st.color;
        const lift = sel ? 8 + st.pickPop * 8 : 0;
        if (sel) { ui.roundRect(g, x - sw / 2 + 2, T.y + 8, sw - 4, T.h - 16, 14); g.fillStyle = mix(st.p.color, '#ffffff', 0.6); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
        drawBottle(g, pc.c, x, T.y + T.h - 18 - lift, sel ? 66 : 56, { shimmer: pc.shimmer });
      });
      ui.text(g, POLISH[st.color].n, T.x + T.w / 2, T.y - 16, { size: 26, color: POLISH[st.color].c === '#ffffff' ? '#ffffff' : POLISH[st.color].c, strokeWidth: 6 });
    } else if (step === 'art') {
      const tw = (T.w - 20) / TOOLS.length, color = POLISH[st.artColor].c;
      TOOLS.forEach((tl, i) => {
        const x = T.x + 10 + tw * (i + 0.5), y = T.y + 30, sel = i === st.tool;
        if (sel) { ui.roundRect(g, x - tw / 2 + 3, T.y + 5, tw - 6, 52, 12); g.fillStyle = mix(st.p.color, '#ffffff', 0.6); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
        drawToolIcon(g, tl.id, color, x, y, sel ? 54 + st.toolPop * 10 : 44, t);
      });
      const cw = (T.w - 40) / POLISH.length, dim = TOOLS[st.tool].id === 'rainbow';
      POLISH.forEach((pc, i) => {
        const x = T.x + 20 + cw * (i + 0.5), y = T.y + 82, sel = i === st.artColor;
        g.globalAlpha = dim ? 0.35 : 1;
        g.beginPath(); g.arc(x, y, sel ? 14 + st.pickPop * 3 : 11, 0, TAU); g.fillStyle = pc.c; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        if (sel) { g.beginPath(); g.arc(x, y, 19, 0, TAU); g.lineWidth = 3; g.strokeStyle = st.p.color; g.stroke(); }
        g.globalAlpha = 1;
      });
      ui.text(g, TOOLS[st.tool].n, T.x + T.w / 2, T.y - 16, { size: 26, color: '#ff6fb1', strokeWidth: 6 });
    } else if (step === 'gems') {
      const iw = (T.w - 20) / ITEMS.length;
      ITEMS.forEach((it, i) => {
        const x = T.x + 10 + iw * (i + 0.5), y = T.y + T.h / 2, sel = i === st.item;
        if (sel) { ui.roundRect(g, x - iw / 2 + 2, T.y + 10, iw - 4, T.h - 20, 14); g.fillStyle = mix(st.p.color, '#ffffff', 0.6); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); }
        drawSticker(g, it.id, x, y - (sel ? 4 + st.pickPop * 6 : 0), sel ? 46 : 36, 0, t);
      });
      ui.text(g, `${ITEMS[st.item].n}  ·  ${st.gems.length}/${MAX_GEMS}`, T.x + T.w / 2, T.y - 16, { size: 24, color: '#ff6fb1', strokeWidth: 6 });
    } else if (step === 'dry') {
      drawFan(g, T.x + 60, T.y + 44, 74, st.fanSpin, st.fanV);
      const wet = st.nails.filter((n) => n.wet > 0).length;
      ui.text(g, wet ? 'Blow on the wet nails!' : 'All dry!', T.x + 280, T.y + 34, { size: 30, color: '#4fb8ff', strokeWidth: 6, maxWidth: 360 });
      for (let i = 0; i < 5; i++) {
        const n = st.nails[i], x = T.x + 170 + i * 56, y = T.y + 76;
        if (n.wet > 0) {
          g.beginPath(); g.moveTo(x, y - 16); g.quadraticCurveTo(x + 13, y + 2, x, y + 12); g.quadraticCurveTo(x - 13, y + 2, x, y - 16);
          g.fillStyle = '#8fe0ff'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
        } else { g.save(); g.translate(x, y); drawSparkleShape(g, 30, '#ffd23f'); g.restore(); }
      }
    } else {
      ui.text(g, 'All done!', T.x + T.w / 2, T.y + T.h / 2, { size: 44, color: '#ff6fb1', strokeWidth: 8 });
      for (const sx of [-1, 1]) { g.save(); g.translate(T.x + T.w / 2 + sx * 150, T.y + T.h / 2); g.rotate(Math.sin(t * 3) * 0.3); drawHeartShape(g, 34, '#ff6fb1'); g.restore(); }
    }
    g.restore();
  }

  drawPanel(g, st) {
    const P = PANEL, p = st.p, t = this.t;
    ui.roundRect(g, P.x, P.y, P.w, P.h, 20);
    g.fillStyle = 'rgba(255,255,255,0.86)'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    // the four steps
    STEPS.forEach((s, i) => {
      const y = P.y + 44 + i * 60, x = P.x + 34;
      const cur = st.mode === 'work' && i === st.step, done = i < st.step || st.mode === 'done';
      if (cur) { ui.roundRect(g, P.x + 6, y - 26, P.w - 12, 52, 26); g.fillStyle = mix(p.color, '#ffffff', 0.55); g.fill(); }
      g.beginPath(); g.arc(x, y, 20, 0, TAU);
      g.fillStyle = done ? '#ff6fb1' : cur ? '#ffd23f' : '#ffffff'; g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      if (cur) {
        const left = 1 - clamp(st.stepT / s.time, 0, 1);
        g.beginPath(); g.arc(x, y, 25, -Math.PI / 2, -Math.PI / 2 + TAU * left); g.lineWidth = 5; g.strokeStyle = left < 0.2 ? '#ff4d6d' : p.color; g.stroke();
      }
      if (done) { g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x - 2, y + 8); g.lineTo(x + 10, y - 8); g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.stroke(); }
      else ui.text(g, String(i + 1), x, y + 1, { size: 24, color: NAVY, stroke: false, weight: 800 });
      ui.text(g, s.n, x + 30, y + 1, { size: 26, color: cur ? NAVY : 'rgba(36,22,63,0.6)', align: 'left', stroke: false, weight: 700, maxWidth: P.w - 70 });
    });
    // hints for humans
    const step = st.mode === 'done' ? 'done' : STEPS[st.step].id;
    if (!p.isAI) {
      const pad = p.ctrl.kind === 'pad';
      const pickG = pad ? 'dpad' : 'rb';
      const list = step === 'polish' ? [['stick', 'Move'], ['a', 'Paint'], [pickG, 'Colour'], ['x', 'All 5'], ['b', 'Wipe']]
        : step === 'art' ? [['a', 'Decorate'], [pad ? 'dpad' : 'x', 'Design'], [pickG, 'Colour'], ['b', 'Clean']]
          : step === 'gems' ? [['a', 'Stick / move'], [pickG, 'Gem'], ['b', 'Take off']]
            : step === 'dry' ? [['a', 'Hold: blow']]
              : [['a', 'Admire']];
      list.forEach(([b, label], i) => {
        const y = P.y + 300 + i * 38;
        ui.glyph(g, b, P.x + 26, y, 28);
        ui.text(g, label, P.x + 48, y + 1, { size: 21, color: NAVY, align: 'left', stroke: false, weight: 700, maxWidth: P.w - 56 });
      });
    } else if (st.mode === 'work') {
      ui.text(g, 'CPU', P.x + P.w / 2, P.y + 330, { size: 26, color: p.color, strokeWidth: 5 });
      const dots = '.'.repeat(1 + Math.floor(t * 2.5) % 3);
      ui.text(g, `busy${dots}`, P.x + P.w / 2, P.y + 366, { size: 22, color: NAVY, stroke: false });
    }
    // Next button
    const by = P.y + P.h - 70, bx = P.x + 10, bw = P.w - 20, bh = 58;
    if (st.mode === 'done') {
      ui.roundRect(g, bx, by, bw, bh, 29); g.fillStyle = '#ff6fb1'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      ui.text(g, 'Done!', bx + bw / 2, by + bh / 2 + 1, { size: 30, strokeWidth: 6 });
    } else if (step === 'dry') {
      const wetSum = st.nails.reduce((s2, n) => s2 + n.wet, 0), wetMax = Math.max(1, st.nails.filter((n) => n.color != null || n.art || n.glitter).length);
      ui.bar(g, bx, by + 12, bw, 34, 1 - wetSum / wetMax, '#8fe0ff');
      ui.text(g, 'Drying', bx + bw / 2, by - 6, { size: 20, color: NAVY, stroke: false });
    } else {
      const ready = step !== 'polish' || this.anyPainted(st);
      const pulse = (st.nextPulse > 0 || (ready && st.stepT > 8 && step !== 'polish')) ? 1 + Math.sin(t * 8) * 0.05 : 1;
      const shake = st.nextBump > 0 ? Math.sin(st.nextBump * 50) * 6 : 0;
      g.save(); g.translate(bx + bw / 2 + shake, by + bh / 2); g.scale(pulse, pulse);
      ui.roundRect(g, -bw / 2, -bh / 2, bw, bh, 29); g.fillStyle = ready ? '#ffd23f' : '#e9e2f2'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      ui.glyph(g, 'y', -bw / 2 + 28, 0, 34);
      ui.text(g, 'Next', 18, 1, { size: 28, color: NAVY, stroke: false, weight: 800 });
      g.restore();
    }
  }

  drawCursor(g, st) {
    if (st.mode === 'arrive') return;
    const { x, y } = st.cur, t = this.t, step = st.mode === 'done' ? 'done' : STEPS[st.step].id;
    g.save();
    // player-coloured ring at the tip so everyone can find their brush
    g.beginPath(); g.arc(x, y, 14, 0, TAU); g.lineWidth = 5; g.strokeStyle = st.p.color; g.stroke();
    g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
    if (step === 'polish') drawBrush(g, POLISH[st.color].c, x, y, 90, -0.45 + (st.painting ? Math.sin(t * 22) * 0.12 : 0));
    else if (step === 'art') {
      const tool = TOOLS[st.tool].id;
      drawPen(g, tool === 'rainbow' ? RAINBOW[Math.floor(t * 6) % RAINBOW.length] : POLISH[st.artColor].c, x, y, 86, -0.45);
      drawToolIcon(g, tool, POLISH[st.artColor].c, x + 46, y + 30, 34, t);
    } else if (step === 'gems') {
      if (st.held) drawTweezers(g, x + 4, y - 4, 80, 0);
      else {
        drawTweezers(g, x, y, 80, 1);
        g.globalAlpha = 0.85; drawSticker(g, ITEMS[st.item].id, x + 40, y + 28, 30, 0, t); g.globalAlpha = 1;
      }
    } else if (step === 'dry') {
      drawFan(g, x, y + 20, 116, st.fanSpin, st.fanV);
      if (st.fanV > 0.3) {
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const ph = (t * 3 + i / 3) % 1, yy = y - 30 - ph * 90, xx = x + (i - 1) * 26;
          g.globalAlpha = (1 - ph) * st.fanV;
          g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + 12, yy - 14, xx, yy - 28); g.stroke();
        }
        g.globalAlpha = 1;
      }
    } else {
      g.save(); g.translate(x, y); drawHeartShape(g, 34, st.p.color); g.restore();
    }
    g.restore();
  }

  drawTip(g, st) {
    const tp = st.tip, s = ease.outBack(clamp(tp.t / 0.25, 0, 1)), a = clamp((tp.dur - tp.t) / 0.3, 0, 1);
    g.save(); g.globalAlpha = a; g.translate(446, 30); g.scale(s, s);
    ui.panel(g, -170, -24, 340, 50, { r: 25, fill: '#fffbe6', stroke: st.p.color, lineWidth: 4, shadow: false });
    ui.text(g, tp.text, 0, 2, { size: 26, color: NAVY, stroke: false, maxWidth: 320 });
    g.restore();
  }

  // --- the gallery --------------------------------------------------------------------------
  drawShow(g) {
    const t = this.t;
    const bg = art('bg/nail-studio-show');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#e9d6ff'); gr.addColorStop(0.62, '#f6dcff'); gr.addColorStop(0.63, '#ffb3d9'); gr.addColorStop(1, '#ff9fcf');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(200 + i * 300, 330 + (i % 2) * 60, 120, 90, 0, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.18)';
      for (let x = -40; x < W; x += 120) { g.beginPath(); g.moveTo(x, H * 0.63); g.lineTo(x + 60, H * 0.63); g.lineTo(x + 220, H); g.lineTo(x + 100, H); g.closePath(); g.fill(); }
      // curtains
      for (const side of [0, 1]) {
        g.save(); if (side) { g.translate(W, 0); g.scale(-1, 1); }
        g.beginPath(); g.moveTo(0, 0); g.lineTo(190, 0); g.quadraticCurveTo(120, 500, 170, H); g.lineTo(0, H); g.closePath();
        g.fillStyle = '#e8559b'; g.fill(); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
        g.strokeStyle = 'rgba(36,22,63,0.25)'; g.lineWidth = 4;
        for (const x of [50, 100, 145]) { g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x - 30, 500, x, H); g.stroke(); }
        g.restore();
      }
      // valance
      g.fillStyle = '#e8559b'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 60);
      for (let x = W; x > 0; x -= 120) g.quadraticCurveTo(x - 60, 120, x - 120, 60);
      g.closePath(); g.fill(); g.lineWidth = 6; g.strokeStyle = NAVY; g.stroke();
      for (let x = 60; x < W; x += 120) { g.beginPath(); g.arc(x, 92, 9, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 3; g.stroke(); }
    }
    // spotlight beam on the hand being shown
    const sp = this.stations.find((s) => s.spotT !== undefined && s.spotT < this.spotGap && !this.cheese);
    if (sp) {
      const sl = sp.slot, w0 = 40, w1 = sl.slotW * 0.42;
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,246,200,0.22)';
      g.beginPath(); g.moveTo(sl.handX - w0, 0); g.lineTo(sl.handX + w0, 0); g.lineTo(sl.handX + w1, sl.floor); g.lineTo(sl.handX - w1, sl.floor); g.closePath(); g.fill();
      g.restore();
    }
    for (const st of this.showOrder) this.drawExhibit(g, st, t);
  }

  drawExhibit(g, st, t) {
    const sl = st.slot, hs = sl.hs;
    const appear = clamp((this.phaseT - 0.2 - this.stations.indexOf(st) * 0.1) / 0.5, 0, 1), e = ease.outBack(appear);
    if (appear <= 0) return;
    const pw = sl.ped.w, ph = sl.ped.h, px = sl.handX, top = sl.floor - ph;
    g.save();
    g.translate(px, sl.floor); g.scale(1, e); g.translate(-px, -sl.floor);
    // shadow
    g.beginPath(); g.ellipse(px, sl.floor, pw * 0.7, pw * 0.14, 0, 0, TAU); g.fillStyle = 'rgba(36,22,63,0.2)'; g.fill();
    if (!drawArt(g, 'prop/nail-pedestal', px, sl.floor, pw * 1.6, ph * 1.3, { anchor: 'bottom' })) {
      g.lineJoin = 'round'; g.strokeStyle = NAVY; g.lineWidth = Math.max(3, 6 * hs);
      g.fillStyle = '#ffffff'; ui.roundRect(g, px - pw * 0.6, sl.floor - ph * 0.14, pw * 1.2, ph * 0.14, 8 * hs); g.fill(); g.stroke();
      g.fillStyle = '#fff6fb'; g.fillRect(px - pw * 0.42, top + ph * 0.1, pw * 0.84, ph * 0.78); g.strokeRect(px - pw * 0.42, top + ph * 0.1, pw * 0.84, ph * 0.78);
      g.fillStyle = '#ffd23f'; for (const yy of [top + ph * 0.18, top + ph * 0.8]) { g.fillRect(px - pw * 0.42, yy, pw * 0.84, ph * 0.04); }
      g.fillStyle = '#ffffff'; ui.roundRect(g, px - pw * 0.56, top, pw * 1.12, ph * 0.12, 8 * hs); g.fill(); g.stroke();
    }
    // client portrait badge on the column
    drawPortrait(g, st.clientId, px, top + ph * 0.5, Math.max(18, 44 * hs), { expr: 'happy', ring: st.p.color, ringWidth: Math.max(3, 6 * hs) });
    g.restore();
    // cushion + hand
    g.save();
    g.translate(px, top); g.scale(e, e); g.translate(-px, -top);
    if (!drawArt(g, 'prop/nail-cushion', px, top - 18 * hs, 380 * hs, 190 * hs)) {
      g.beginPath(); g.ellipse(px, top - 12 * hs, 180 * hs, 46 * hs, 0, 0, TAU); g.fillStyle = '#ff9fcf'; g.fill(); g.lineWidth = Math.max(3, 5 * hs); g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.ellipse(px, top - 18 * hs, 160 * hs, 32 * hs, 0, 0, TAU); g.fillStyle = '#ffc2e2'; g.fill();
    }
    const bob = st.spotT !== undefined && st.spotT < 1 ? Math.sin(st.spotT * Math.PI) * 18 * hs : 0;
    const G = geom(st.style, st.wig, t);
    g.translate(px, sl.handY - bob); g.scale(hs, hs);
    drawHandBase(g, st.style, G, { wrist: false });
    G.nails.forEach((n, i) => drawNail(g, n, st.nails[i], t, { line: 5 }));
    for (const gm of st.gems) { const q = this.gemPos(st, gm, G); drawSticker(g, gm.id, q.x, q.y, ITEM_SIZE, q.rot, t); }
    G.nails.forEach((n, i) => {
      const tw = Math.sin(t * 3 + i * 1.9 + st.i);
      if (tw > 0.7) { g.save(); g.translate(n.x + n.w * 0.2, n.y - n.h * 0.3); g.globalAlpha = (tw - 0.7) / 0.3; drawSparkleShape(g, 30, '#ffffff'); g.restore(); }
    });
    g.restore();
    // the artist
    if (appear >= 1) st.actor.draw(g, { ring: st.p.color });
  }
}
