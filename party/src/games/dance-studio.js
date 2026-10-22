// Dance Studio (Play Studio). Every player makes up a dance at their own
// rehearsal station: drop move cards (Arms Up, Twirl, Star Jump, Hip Bump...)
// onto an 8-count timeline (one card = one beat; a mini stage plays it back
// on the beat), then pick the music, the stage lights and a backdrop.
// The show: the curtains open on a big stage with a mirror ball and a shiny
// mirror floor, and for every player in turn the WHOLE group performs that
// player's dance together to that player's music, lights and backdrop
// ("5, 6, 7, 8!"). Ends with a free dance (stick moves, A jumps, every other
// button is a photo pose) and a "Freeze!" photo. No losers.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, music, audioRunning, hasSound } from '../engine/audio.js';
import { aiProfile } from '../engine/ai.js';
import { playerName } from '../state.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { photoPosePressed, photoMove, strikePhotoPose, randomPhotoPose, photoPoseHints } from '../engine/photo-poses.js';
import {
  NAVY, MOVES, MOVE, MUSIC, LIGHTS, STAGES, rgba, mix,
  drawBackdrop, drawFloor, drawLights, drawCurtains, drawMirrorBall, drawMovePicto, drawStudio, drawThumb,
} from './dance-studio/stage.js';

export const meta = {
  id: 'dance-studio',
  title: 'Dance Studio',
  category: 'studio',
  type: 'Make a dance · Everyone wins',
  goal: 'Make up your own dance, pick the music, lights and stage, then put on a show together!',
  controls: [['stick', 'Pick a beat (1 to 8)'], ['dpad', 'Pick a dance move'], ['a', 'Put the move in, or pick one up to move it'], ['b', 'Take a move out'], ['lb', 'Steps: moves, music, lights, stage (LB / RB)'], ['y', 'Surprise me!']],
  tips: ['Every card is one beat. Fill all 8 beats!', 'In the show everybody dances YOUR dance together.', 'Free dance at the end: every button is a pose!'],
  music: 'dance',
  duration: 'about 3 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  flyIn: false,
  drawIcon,
};

const TABS = [
  { id: 'moves', name: 'Moves' },
  { id: 'music', name: 'Music' },
  { id: 'lights', name: 'Lights' },
  { id: 'stage', name: 'Stage' },
  { id: 'done', name: 'Done' },
];
const TAB = Object.fromEntries(TABS.map((t, i) => [t.id, i]));
const OPT_COLS = 2;             // music / lights / stage: 2 x 3 cards
const SETUP_TIME = 150;         // gentle clock for the making part (seconds)
const FLOOR_Y = 760;            // show: stage floor top
const SWITCH_T = 1.7;           // show: seconds to change over to the next dancer's routine
const BOW_T = 1.9;              // show: bows + applause after a routine
const FREE_T = 9;               // show: free dance (ends with 3-2-1 Freeze!)
const PHOTO_T = 3.2;            // show: the photo on screen before the results
const FINALE_WORDS = ['Wow!', 'Yay!', 'Encore!', 'Bravo!', 'Woo-hoo!', 'So cool!'];
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const mod = (a, n) => ((a % n) + n) % n;

// Move sounds (new real sounds fall back to synth names).
function moveSound(m, vol = 0.45) {
  switch (m.sound) {
    case 'clap': snd('ds-clap', 'pop', { vol }); break;
    case 'boing': snd('boing', 'bounce', { vol }); break;
    case 'sparkle': snd('ds-twirl', 'sparkle', { vol }); break;
    case 'whoosh': snd('ds-slide', 'whoosh', { vol }); break;
    default: sfx(m.sound, { vol });
  }
}

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

function layoutStation(r) {
  const pad = Math.round(clamp(r.w * 0.022, 8, 16));
  const tabH = Math.round(clamp(r.h * 0.085, 38, 62));
  const hintH = Math.round(clamp(r.h * 0.07, 30, 50));
  const tlH = Math.round(clamp(r.h * 0.19, 78, 150));
  const midY = r.y + tabH + pad * 1.5, midH = r.h - tabH - tlH - hintH - pad * 3.5;
  const pvW = Math.round((r.w - pad * 3) * 0.47);
  return {
    pad, tabH, hintH, tlH,
    preview: { x: r.x + pad, y: midY, w: pvW, h: midH },
    palette: { x: r.x + pad * 2 + pvW, y: midY, w: r.w - pad * 3 - pvW, h: midH },
    timeline: { x: r.x + pad, y: midY + midH + pad, w: r.w - pad * 2, h: tlH },
    hintY: r.y + r.h - hintH / 2 - pad * 0.3,
  };
}

/** A believable 8-count for CPUs and "Surprise me!". */
function makeChoreo() {
  const pool = shuffle(MOVES.map((_, i) => i));
  const [a, b, c, d] = pool;
  const finish = pick([MOVE.tada, MOVE.star, MOVE.bow, MOVE.twirl, MOVE.peace]);
  const pats = [
    [a, b, a, b, c, d, c, finish],
    [a, a, b, b, c, c, d, finish],
    [a, b, c, d, a, b, c, finish],
    [a, b, c, a, b, c, d, finish],
    [a, c, b, c, a, c, d, finish],
  ];
  return pick(pats).slice();
}

// =============================================================================
// A dancing character: an Actor plus the motion each move adds on its beat
// (hops, twirls, slides, hip bumps, wobbles) and a mirrored reflection.
class Dancer {
  constructor(actor) {
    this.a = actor;
    this.hx = actor.x; this.hy = actor.y;   // home (feet) position
    this.mv = null; this.u = 0; this.dur = 0.5;
    this.rot = 0; this.dx = 0;
    this.baseFacing = 1; this.slideDir = 1; this.slideAmp = 80;
  }
  /** Do move index m (null = groove) for one beat of `dur` seconds. */
  perform(m, dur) {
    const a = this.a;
    this.dur = Math.max(0.2, dur); this.u = 0;
    if (m === null || m === undefined) { this.mv = 'groove'; if (!a._once || a.pose === 'dance') a.playOnce('dance', this.dur * 0.95, 'idle'); return; }
    const M = MOVES[m];
    this.mv = M;
    a.facing = this.baseFacing;
    a.playOnce(M.pose, this.dur * (M.id === 'bow' ? 1.2 : 0.95), 'idle');
    a.squash(M.squash || -0.1);
    if (M.slide) this.slideDir = -this.slideDir;
  }
  update(dt) {
    const a = this.a;
    let z = 0; this.rot = 0; this.dx = 0;
    if (this.mv) {
      this.u += dt / this.dur;
      const k = Math.min(1, this.u), s = Math.sin(k * Math.PI), M = this.mv;
      if (M === 'groove') z = Math.abs(Math.sin(k * TAU)) * a.height * 0.03;
      else {
        if (M.hop) z = s * a.height * M.hop;
        if (M.float) z = s * a.height * 0.16;
        if (M.slide) this.dx = s * this.slideAmp * this.slideDir * this.baseFacing;
        if (M.shift) { this.dx = s * this.slideAmp * 0.18 * this.baseFacing; this.rot = -s * 0.14 * this.baseFacing; }
        if (M.lean) this.rot += s * M.lean * this.baseFacing;
        if (M.wobble) this.rot += Math.sin(k * TAU * 2) * M.wobble;
        if (M.spin) a.facing = k > 0.15 && k < 0.65 ? -this.baseFacing : this.baseFacing;
      }
      if (this.u >= 1) { this.mv = null; a.facing = this.baseFacing; }
    }
    a.x = this.hx + this.dx; a.y = this.hy; a.z = z + (this.extraZ || 0);
    a.update(dt);
  }
  draw(g, opts) {
    const a = this.a;
    if (!this.rot) { a.draw(g, opts); return; }
    g.save(); g.translate(a.x, a.y); g.rotate(this.rot); g.translate(-a.x, -a.y);
    a.draw(g, opts);
    g.restore();
  }
  /** Mirror-floor reflection, clipped to the floor below floorY. */
  drawReflection(g, floorY, clipRect, alpha = 0.26) {
    const a = this.a;
    g.save();
    g.beginPath(); g.rect(clipRect.x, floorY, clipRect.w, clipRect.y + clipRect.h - floorY); g.clip();
    g.translate(0, 2 * a.y); g.scale(1, -1);
    g.translate(a.x, a.y); g.rotate(-this.rot); g.translate(-a.x, -a.y);
    a.draw(g, { shadow: false, emotes: false, alpha });
    g.restore();
  }
}

// =============================================================================
export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'make';
    this.phaseT = 0;
    this.setupLeft = SETUP_TIME;
    this.cpuOnly = this.players.every((p) => p.isAI);
    const rects = stationRects(this.n);
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i]));
    sfx('magic'); snd('jingle/round', null, { vol: 0.7 });
  }

  makeStation(p, i, r) {
    const L = layoutStation(r);
    const a = new Actor(p, { facing: 1 });
    const d = new Dancer(a);
    const st = {
      p, i, r, L, actor: a, dancer: d,
      slots: Array(8).fill(null), cur: 0, sel: randInt(0, MOVES.length - 1), tab: 0,
      music: randInt(0, MUSIC.length - 1), light: randInt(0, LIGHTS.length - 1), stage: randInt(0, STAGES.length - 1),
      held: null, ready: false, readyT: 0, autoNext: false, autoNextT: -1,
      pvBeat: 0, pvOff: 0, pvLast: -1, pvPulse: 0,
      slotBump: Array(8).fill(0), palBump: 0, tabBump: 0, cheerCD: 0, nudge: 0, hintT: 0,
      stick: { dir: 0, t: 0 }, ai: null, aiStick: 0, wooCD: 0, woos: 0,
    };
    // move palette: 4 x 4 cards, or 8 x 2 when the space is wide and short
    const R = L.palette, lab = clamp(R.h * 0.13, 22, 54);
    const cell = (cols) => Math.min(R.w / cols, (R.h - lab) / (MOVES.length / cols));
    st.cols = cell(8) > cell(4) * 1.05 ? 8 : 4;
    this.placeStationActor(st);
    if (p.isAI) this.planAI(st);
    return st;
  }

  placeStationActor(st) {
    const pv = st.L.preview, a = st.actor, d = st.dancer;
    a.scale = 1;
    const w1 = Math.max(1, a.width);
    a.scale = Math.min((pv.h * 0.56) / a.leader.h, (pv.w * 0.55) / w1);
    d.hx = pv.x + pv.w / 2; d.hy = pv.y + pv.h * 0.86;
    d.slideAmp = Math.min(pv.w * 0.18, 90);
    a.x = d.hx; a.y = d.hy; a.snap();
  }

  // --- making the dance ---------------------------------------------------------
  filled(st) { return st.slots.filter((s) => s !== null).length; }

  placeMove(st) {
    const m = st.sel, j = st.cur;
    st.slots[j] = m; st.slotBump[j] = 0.35;
    const M = MOVES[m];
    moveSound(M, 0.5);
    sfx('stamp', { vol: 0.35 });
    const c = this.slotCenter(st, j);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 8, colors: [M.color, '#ffffff'] });
    this.previewNow(st, j);
    if (st.cur < 7) st.cur++;
    if (this.filled(st) === 8) {
      if (!st.autoNext) { st.autoNext = true; st.autoNextT = 0.9; }
      st.actor.say('My dance!', 1.2, st.p.isAI ? null : 'yay');
      particles.burst(st.L.timeline.x + st.L.timeline.w / 2, st.L.timeline.y + st.L.timeline.h / 2, { type: 'confetti', count: 22, speed: [160, 420] });
      sfx('sparkle');
    }
  }

  pickUp(st) {
    const j = st.cur;
    st.held = { m: st.slots[j], from: j };
    st.slots[j] = null;
    sfx('pop', { vol: 0.5 }); st.slotBump[j] = 0.2;
  }

  dropHeld(st) {
    const h = st.held; if (!h) return;
    const j = st.cur, other = st.slots[j];
    st.slots[j] = h.m;
    if (other !== null && h.from !== j) st.slots[h.from] = other;   // swap places
    st.held = null; st.slotBump[j] = 0.35;
    if (other !== null && h.from !== j) st.slotBump[h.from] = 0.35;
    sfx('whoosh', { vol: 0.4 }); sfx('stamp', { vol: 0.3 });
    this.previewNow(st, j);
  }

  removeAt(st, j) {
    const m = st.held ? st.held.m : st.slots[j];
    if (st.held) st.held = null; else st.slots[j] = null;
    const c = this.slotCenter(st, j);
    sfx('back');
    particles.burst(c.x, c.y, { type: 'smoke', count: 7, speed: [40, 130] });
    if (m !== null) particles.burst(c.x, c.y, { type: 'sparkle', count: 4, colors: [MOVES[m].color] });
  }

  /** The preview dancer does slot j right now, and the loop carries on from there. */
  previewNow(st, j) {
    const bpm = MUSIC[st.music].bpm, delta = j - mod(Math.floor(st.pvBeat), 8);
    st.pvOff += delta; st.pvBeat += delta;
    st.pvLast = Math.floor(st.pvBeat);
    st.dancer.perform(st.slots[j], 60 / bpm);
    st.pvPulse = 1;
  }

  setTab(st, i) {
    i = clamp(i, 0, TABS.length - 1);
    if (i === st.tab) return;
    if (st.held) { this.dropHeld(st); }
    st.tab = i; st.tabBump = 0.2; sfx('move');
  }

  changeOption(st, dx, dy) {
    const tab = TABS[st.tab].id, list = tab === 'music' ? MUSIC : tab === 'lights' ? LIGHTS : STAGES;
    const key = tab === 'music' ? 'music' : tab === 'lights' ? 'light' : 'stage';
    const cur = st[key], rows = Math.ceil(list.length / OPT_COLS);
    let col = cur % OPT_COLS, row = Math.floor(cur / OPT_COLS);
    if (dx) col = mod(col + dx, OPT_COLS);
    if (dy) row = mod(row + dy, rows);
    const ni = Math.min(list.length - 1, row * OPT_COLS + col);
    if (ni === cur) return;
    st[key] = ni; st.palBump = 0.18;
    sfx('swap', { vol: 0.6 });
    const pv = st.L.preview;
    particles.burst(pv.x + pv.w / 2, pv.y + pv.h * 0.3, { type: 'sparkle', count: 8, colors: [list[ni].color || list[ni].colors?.[0] || '#fff', '#ffffff'] });
    if (st.cheerCD <= 0) { st.actor.playOnce('cheer', 0.4, 'idle'); st.cheerCD = 0.8; }
    // let humans hear the song they just picked
    if (key === 'music' && !st.p.isAI) music.play(MUSIC[ni].id, { fadeIn: 0.4 });
  }

  stepPalette(st, step) {
    st.sel = mod(st.sel + step, MOVES.length); st.palBump = 0.12; sfx('move', { vol: 0.5 });
  }

  surprise(st) {
    st.slots = makeChoreo(); st.held = null;
    st.music = randInt(0, MUSIC.length - 1); st.light = randInt(0, LIGHTS.length - 1); st.stage = randInt(0, STAGES.length - 1);
    st.slotBump = st.slotBump.map(() => 0.4); st.autoNext = true;
    sfx('magic'); sfx('bigpop', { vol: 0.6 });
    const pv = st.L.preview;
    particles.burst(pv.x + pv.w / 2, pv.y + pv.h / 2, { type: 'star', count: 12 });
    particles.burst(pv.x + pv.w / 2, pv.y + pv.h / 2, { type: 'confetti', count: 20 });
    st.actor.playOnce('ready', 0.6, 'idle'); st.actor.say('Ta-da!', 1, st.p.isAI ? null : 'woo');
    if (!st.p.isAI) music.play(MUSIC[st.music].id, { fadeIn: 0.4 });
  }

  setReady(st, on) {
    st.ready = on; st.readyT = 0;
    if (on) {
      // empty beats are fine (they groove), but a dance needs at least one move
      if (this.filled(st) === 0) st.slots = makeChoreo();
      sfx('ready'); st.actor.playOnce('ready', 0.6, 'idle'); st.actor.squash(-0.25);
      const pv = st.L.preview;
      particles.burst(pv.x + pv.w / 2, pv.y + pv.h * 0.5, { type: 'confetti', count: 26, speed: [200, 500] });
      st.actor.say('Ready!', 1.3, st.p.isAI ? null : 'ready');
    } else sfx('back');
  }

  /** Pads: the stick alone steps along the timeline (with repeat). */
  stickStep(st, dt) {
    const c = st.p.ctrl, v = c.sx, dir = v > 0.5 ? 1 : v < -0.5 ? -1 : 0, s = st.stick;
    if (dir !== s.dir) { s.dir = dir; s.t = 0; return dir; }
    if (!dir) return 0;
    s.t += dt;
    if (s.t > 0.36) { s.t -= 0.13; return dir; }
    return 0;
  }

  updateStationInput(st, dt) {
    const c = st.p.ctrl;
    if (st.ready) { if (c.pressed('b')) this.setReady(st, false); return; }
    const tabStep = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
    if (tabStep) { this.setTab(st, st.tab + tabStep); return; }
    if (c.pressed('y')) { this.surprise(st); return; }
    const tab = TABS[st.tab].id, pad = c.kind === 'pad';
    if (tab === 'moves') {
      // where on the 8-count: the stick (pads) or left/right (keyboard, CPU)
      const step = pad ? this.stickStep(st, dt) : c.nav.x;
      if (step) { st.cur = clamp(st.cur + step, 0, 7); sfx('blip', { vol: 0.5 }); }
      // which move: the d-pad grid (pads) or up/down through the cards
      if (pad) {
        const dx = (c.pressed('right') ? 1 : 0) - (c.pressed('left') ? 1 : 0);
        const dy = (c.pressed('down') ? 1 : 0) - (c.pressed('up') ? 1 : 0);
        if (dx || dy) {
          const C = st.cols, col = mod((st.sel % C) + dx, C), row = mod(Math.floor(st.sel / C) + dy, MOVES.length / C);
          st.sel = row * C + col; st.palBump = 0.12; sfx('move', { vol: 0.5 });
        }
      } else if (c.nav.y) this.stepPalette(st, c.nav.y);
      if (c.pressed('a')) {
        if (st.held) this.dropHeld(st);
        else if (st.slots[st.cur] === null) this.placeMove(st);
        else this.pickUp(st);
      } else if (c.pressed('b')) {
        if (st.held || st.slots[st.cur] !== null) this.removeAt(st, st.cur);
        else { sfx('blip'); st.hintT = 1.2; }
      } else if (c.pressed('x')) {
        // X: try the move under the cursor (or the picked card) on the mini stage
        const m = st.slots[st.cur] ?? st.sel;
        st.dancer.perform(m, 60 / MUSIC[st.music].bpm); moveSound(MOVES[m], 0.4);
      }
      return;
    }
    if (tab === 'done') {
      if (c.pressed('a')) this.setReady(st, true);
      else if (c.pressed('b')) this.setTab(st, st.tab - 1);
      return;
    }
    if (c.nav.x || c.nav.y) this.changeOption(st, c.nav.x, c.nav.y);
    if (c.pressed('a')) { this.setTab(st, st.tab + 1); sfx('select'); }
    else if (c.pressed('b')) this.setTab(st, st.tab - 1);
  }

  updatePreview(st, dt) {
    const bpm = MUSIC[st.music].bpm;
    // in step with the song when it's this station's song that is playing
    if (audioRunning() && music.name === MUSIC[st.music].id && music.song) st.pvBase = music.beat();
    else st.pvBase = (st.pvBase || 0) + (dt * bpm) / 60;
    st.pvBeat = st.pvBase + st.pvOff;
    const b = Math.floor(st.pvBeat);
    if (b !== st.pvLast) {
      st.pvLast = b;
      const j = mod(b, 8);
      if (!st.dancer.mv || st.dancer.u > 0.9) st.dancer.perform(st.slots[j], 60 / bpm);
      st.pvPulse = 1;
    }
    st.pvPulse = Math.max(0, st.pvPulse - dt * 3);
    st.dancer.update(dt);
  }

  // --- CPU choreographers ---------------------------------------------------------
  planAI(st) {
    st.ai = {
      plan: makeChoreo(), music: randInt(0, MUSIC.length - 1), light: randInt(0, LIGHTS.length - 1), stage: randInt(0, STAGES.length - 1),
      t: rand(1.0, 2.2), surprise: chance(0.12), changedMind: false,
    };
  }

  updateAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai;
    if (st.aiStick > 0) { st.aiStick -= dt; if (st.aiStick <= 0) c.move(0, 0); }
    if (st.ready) return;
    ai.t -= dt;
    if (ai.t > 0) return;
    const hurry = !this.cpuOnly && this.stations.every((s) => s.ready || s.p.isAI);
    ai.t = rand(0.2, 0.42) / aiProfile(st.p).speed * (hurry ? 0.5 : 1);
    const tap = (x, y) => { c.move(x, y); st.aiStick = 0.05; };
    if (ai.surprise && !ai.didSurprise) { ai.didSurprise = true; c.press('y'); ai.t = 1.6; ai.plan = null; return; }
    const tab = TABS[st.tab].id;
    switch (tab) {
      case 'moves': {
        if (!ai.plan) { c.press('rb'); break; }
        const j = ai.plan.findIndex((m, k) => st.slots[k] !== m);
        if (j < 0) { c.press('rb'); ai.t += rand(0.4, 0.9); break; }
        if (st.cur !== j) { tap(Math.sign(j - st.cur), 0); break; }
        if (st.slots[j] !== null) { c.press('b'); break; }
        const want = ai.plan[j];
        if (st.sel !== want) {
          const fwd = mod(want - st.sel, MOVES.length);
          tap(0, fwd <= MOVES.length / 2 ? 1 : -1); ai.t *= 0.6;
          break;
        }
        c.press('a');
        // now and then a CPU tries a move on the mini stage first, or thinks
        if (chance(0.12)) { ai.t += rand(0.5, 1.0); st.actor.emote('question', 0.8); }
        break;
      }
      case 'music': case 'lights': case 'stage': {
        const key = tab === 'music' ? 'music' : tab === 'lights' ? 'light' : 'stage';
        const want = ai.plan === null ? st[key] : ai[key], cur = st[key];
        if (cur === want) { c.press('a'); ai.t += rand(0.3, 0.8); break; }
        const dr = Math.floor(want / OPT_COLS) - Math.floor(cur / OPT_COLS), dc = (want % OPT_COLS) - (cur % OPT_COLS);
        if (dr) tap(0, Math.sign(dr)); else tap(Math.sign(dc), 0);
        ai.t += rand(0.1, 0.35);
        break;
      }
      case 'done': c.press('a'); break;
      default: break;
    }
  }

  // --- main update ----------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.phase === 'make') this.updateMake(dt);
    else this.updateShow(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    if (this.phase === 'make') for (const st of this.stations) st.dancer.update(dt);
    else for (const st of this.stations) st.dancer.update(dt);
  }

  updateMake(dt) {
    const cam = this.api.camera;
    if (cam) cam.follow(W / 2, H / 2, 1, 8);
    if (!this.cpuOnly) this.setupLeft -= dt;
    for (const st of this.stations) {
      if (st.p.isAI) this.updateAI(st, dt);
      st.palBump = Math.max(0, st.palBump - dt); st.tabBump = Math.max(0, st.tabBump - dt);
      st.hintT = Math.max(0, st.hintT - dt); st.cheerCD -= dt; st.readyT += dt;
      for (let j = 0; j < 8; j++) st.slotBump[j] = Math.max(0, st.slotBump[j] - dt);
      this.updateStationInput(st, dt);
      if (st.autoNextT > 0) {
        st.autoNextT -= dt;
        if (st.autoNextT <= 0 && st.tab === TAB.moves && !st.held) { this.setTab(st, TAB.music); sfx('select'); }
      }
      this.updatePreview(st, dt);
    }
    const allReady = this.stations.every((s) => s.ready && s.readyT > 0.7);
    if (allReady || this.setupLeft <= 0) this.startShow();
  }

  // =================================================================================
  // The show
  startShow() {
    if (this.phase !== 'make') return;
    this.phase = 'show'; this.phaseT = 0;
    for (const st of this.stations) {
      st.held = null;
      if (this.filled(st) === 0) st.slots = makeChoreo();
      st.ready = true;
      if (st.p.isAI) st.p.ctrl.reset?.();
    }
    // routine order: player order (P1 first)
    this.order = this.stations.slice();
    this.reps = this.n <= 3 ? 2 : 1;
    this.seg = -1;
    this.stage = { sub: 'intro', t: 0, curtain: 0, ballY: -120, pulse: 0, beat: 0, power: 0.4 };
    this.backdrop = { cur: this.order[0].stage, prev: null, fade: 1 };
    this.lightIdx = this.order[0].light;
    this.clock = { key: null, bpm: 120, own: 0, origin: 0, last: -99 };
    // everyone onto the stage
    for (const st of this.stations) {
      const a = st.actor, d = st.dancer;
      a.say(null); a.clearEmotes();
      d.mv = null; d.rot = 0; d.dx = 0;
      a.setPose('idle');
    }
    this.layoutShow(this.order[0], true);
    music.stop(0.6);
    sfx('drumroll');
    snd('crowd-ooh', null, { vol: 0.5 });
  }

  /** Positions for a routine: its choreographer front and centre, everyone else in a mirrored back row. */
  layoutShow(lead, snap = false) {
    const n = this.n, back = this.order.filter((s) => s !== lead);
    const frontH = n === 1 ? 430 : n <= 3 ? 360 : 320;
    const set = (st, x, y, th, maxW, facing) => {
      const a = st.actor, d = st.dancer;
      const s0 = a.scale; a.scale = 1; const w1 = Math.max(1, a.width); a.scale = s0;
      st.showTo = { x, y, scale: Math.min(th / a.leader.h, maxW / w1) };
      d.baseFacing = facing;
      if (snap) { d.hx = x; d.hy = y; a.scale = st.showTo.scale; a.facing = facing; a.x = x; a.y = y; a.snap(); }
      d.slideAmp = Math.min(110, maxW * 0.35);
    };
    set(lead, W / 2, 905, frontH, 520, 1);
    const k = back.length;
    if (!k) return;
    const left = Math.ceil(k / 2);
    // keep the back row clear of a wide choreographer (the trio, Felicity + Fellowfox)
    const la = lead.actor, s0 = la.scale; la.scale = lead.showTo.scale; const leadHalf = la.width / 2; la.scale = s0;
    const gap = Math.max(n <= 3 ? 330 : 250, leadHalf + (n <= 3 ? 150 : 90));
    const sp = Math.min(300, (W / 2 - 300 - gap) / Math.max(1, left - 0.5));
    const th = n <= 3 ? 300 : n <= 5 ? 260 : 230;
    back.forEach((st, j) => {
      const onLeft = j < left, idx = onLeft ? left - 1 - j : j - left;
      const x = onLeft ? W / 2 - gap - idx * sp : W / 2 + gap + idx * sp;
      // mirrored formation: the left side faces in, the right side faces in
      set(st, x, 796 + (idx % 2) * (k > 4 ? 62 : 36), th, sp * (k > 4 ? 1.7 : 1.35) + (k === 1 ? 200 : 0), onLeft ? 1 : -1);
    });
  }

  get lead() { return this.order[Math.max(0, this.seg)]; }

  beginSegment(i) {
    this.seg = i;
    const st = this.order[i], S = this.stage;
    S.sub = 'switch'; S.t = 0; S.power = 0.25;
    this.backdrop = { cur: st.stage, prev: this.backdrop.cur, fade: 0 };
    this.lightIdx = st.light;
    this.layoutShow(st);
    const key = MUSIC[st.music].id, bpm = MUSIC[st.music].bpm;
    music.play(key, { fadeIn: 0.5 });
    this.clock = { key, bpm, own: 0, origin: 0, last: -99 };
    sfx('whoosh'); sfx('magic', { vol: 0.6 });
    this.bannerT = 0;
  }

  /** Beats since the routine's "1" (negative during the count-in). */
  segBeat(dt) {
    const c = this.clock;
    c.own += (dt * c.bpm) / 60;
    if (audioRunning() && music.name === c.key && music.song) c.own = music.beat();
    return c.own - c.origin;
  }

  updateShow(dt) {
    const S = this.stage, cam = this.api.camera;
    S.t += dt;
    S.pulse = Math.max(0, S.pulse - dt * 2.5);
    this.backdrop.fade = Math.min(1, this.backdrop.fade + dt * 1.6);
    if (this.bannerT !== undefined) this.bannerT += dt;
    const beat = this.segBeat(dt);
    S.beat = beat;
    // dancers walk to their spots
    for (const st of this.stations) {
      const d = st.dancer, a = st.actor, to = st.showTo;
      if (!to) continue;
      const dist = Math.hypot(to.x - d.hx, to.y - d.hy);
      d.hx = damp(d.hx, to.x, 4.5, dt); d.hy = damp(d.hy, to.y, 4.5, dt);
      a.scale = damp(a.scale, to.scale, 4.5, dt);
      const walking = S.sub !== 'free' || st.freeX === null;
      if (dist > 14 && !a._once && walking) { a.setPose('walk'); a.facing = to.x > d.hx ? 1 : -1; }
      else if (a.pose === 'walk' && walking) { a.setPose('idle'); a.facing = d.baseFacing; }
      st.wooCD = Math.max(0, st.wooCD - dt);
    }
    switch (S.sub) {
      case 'intro': {
        S.curtain = clamp((S.t - 0.6) / 1.6, 0, 1);
        S.ballY = lerp(-120, 175, ease.outBack(clamp((S.t - 0.3) / 1.4, 0, 1)));
        S.power = lerp(0.3, 1, S.curtain);
        if (S.t > 0.6 && S.t - dt <= 0.6) { snd('ds-curtain', 'whoosh'); snd('applause', 'cheer', { vol: 0.6 }); }
        if (S.t >= 2.6) this.beginSegment(0);
        break;
      }
      case 'switch': {
        S.power = Math.min(1, S.power + dt * 0.9);
        if (S.t >= SWITCH_T) {
          // the count-in starts on the next whole beat
          const c = this.clock;
          c.origin = Math.ceil(c.own + 0.05) + 4; c.last = -99;
          S.sub = 'count'; S.t = 0;
          const lead = this.lead;
          lead.actor.say(pick(['My dance!', 'Watch this!', 'Ready?', 'Here we go!']), 1.2, lead.p.isAI ? null : 'ready');
          for (const st of this.stations) { st.actor.setPose('idle'); st.actor.facing = st.dancer.baseFacing; }
        }
        break;
      }
      case 'count': {
        const b = Math.floor(beat);
        if (b !== this.clock.last && b >= -4 && b < 0) {
          this.clock.last = b;
          sfx(b === -1 ? 'tock' : 'tick', { vol: 0.7 });
          S.pulse = 0.6;
          for (const st of this.stations) { st.actor.squash(0.12); if (b === -1) st.actor.playOnce('ready', 0.45, 'idle'); }
        }
        if (beat >= 0) { S.sub = 'dance'; S.t = 0; this.clock.last = -1; }
        this.updateWoo(dt);
        break;
      }
      case 'dance': {
        const total = 8 * this.reps, b = Math.floor(beat);
        if (b !== this.clock.last && b >= 0 && b < total) {
          this.clock.last = b;
          this.onBeat(b);
        }
        if (beat >= total) this.endRoutine();
        this.updateWoo(dt);
        break;
      }
      case 'bow': {
        if (S.t >= BOW_T) {
          if (this.seg + 1 < this.order.length) this.beginSegment(this.seg + 1);
          else this.startFree();
        }
        this.updateWoo(dt);
        break;
      }
      case 'free': this.updateFree(dt); break;
      case 'photo': {
        this.photoT += dt;
        if (this.photoT >= PHOTO_T && !this.finished) this.finishGame();
        break;
      }
      default: break;
    }
    for (const st of this.stations) st.dancer.update(dt);
    if (cam && !cam.punchState) cam.follow(W / 2, H / 2, 1, 3);
  }

  onBeat(b) {
    const lead = this.lead, j = b % 8, m = lead.slots[j], bpm = this.clock.bpm, dur = 60 / bpm;
    const S = this.stage;
    S.pulse = 1;
    for (const st of this.stations) st.dancer.perform(m, dur);
    const a = lead.actor, cam = this.api.camera;
    if (m !== null) {
      const M = MOVES[m];
      moveSound(M, 0.5);
      particles.burst(a.x, a.y - a.height * 0.6, { type: 'sparkle', count: 10, colors: [M.color, '#ffffff'], speed: [120, 320] });
      if (M.hop || M.spin) particles.burst(a.x, a.y, { type: 'star', count: 6, speed: [150, 360] });
      if (M.id === 'clap') for (const st of this.stations) { const h = st.actor.anchor('hand'); particles.burst(h.x, h.y, { type: 'spark', count: 3, colors: ['#fff6a8'] }); }
    } else sfx('tick', { vol: 0.25 });
    if (b === 0 && cam) cam.punch(a.x, a.y - a.height * 0.55, 1.14, 0.5);
    if (j === 7) {
      particles.burst(W / 2, 200, { type: 'confetti', count: 30, speed: [200, 520] });
      sfx('sparkle');
    }
    lead.beatsShown = (lead.beatsShown || 0) + 1;
  }

  endRoutine() {
    const S = this.stage, lead = this.lead, cam = this.api.camera;
    S.sub = 'bow'; S.t = 0;
    particles.confettiRain(W, 90);
    snd('applause', 'cheer', { vol: 0.8 }); sfx('fanfare', { vol: 0.6 });
    fx.flash('#ffffff', 0.12);
    for (const st of this.stations) {
      if (st === lead) { st.actor.playOnce('bow', 1.0, 'celebrate'); }
      else st.actor.playOnce('clap', 1.4, 'idle');
    }
    lead.actor.say(pick(['Thank you!', 'Ta-da!', 'Yay!', 'I did it!']), 1.5, lead.p.isAI ? null : 'yay');
    const a = lead.actor;
    particles.burst(a.x, a.y - a.height * 0.6, { type: 'heart', count: 12, speed: [150, 380] });
    if (cam) cam.punch(a.x, a.y - a.height * 0.5, 1.12, 0.9);
  }

  /** During the show any button cheers your dancer on: sparkles + a little woo. */
  updateWoo(dt) {
    for (const st of this.stations) {
      const c = st.p.ctrl;
      let go = !st.p.isAI && (c.pressed('a') || c.pressed('x') || c.pressed('b') || c.pressed('y'));
      if (st.p.isAI && chance(dt * 0.25)) go = true;
      if (!go || st.wooCD > 0) continue;
      st.wooCD = 0.45; st.woos++;
      const a = st.actor;
      const top = a.anchor('head');
      particles.burst(top.x, top.y, { type: pick(['heart', 'sparkle', 'star', 'note']), count: 6, colors: [st.p.color, '#ffffff', '#fff6a8'], speed: [100, 260] });
      if (!st.p.isAI) { particles.popText(top.x, top.y - 30, pick(['Woo!', 'Yay!', '♪']), st.p.color, 40); sfx('pop', { vol: 0.35 }); }
    }
  }

  // --- free dance + Freeze! photo ---------------------------------------------------
  startFree() {
    const S = this.stage;
    S.sub = 'free'; S.t = 0; S.power = 1;
    // the most picked song
    const votes = new Map();
    for (const st of this.stations) votes.set(st.music, (votes.get(st.music) || 0) + 1);
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const key = MUSIC[best].id;
    music.play(key, { fadeIn: 0.3 });
    this.clock = { key, bpm: MUSIC[best].bpm, own: this.clock.own, origin: 0, last: -99 };
    this.lightIdx = LIGHTS.findIndex((l) => l.id === 'rainbow');
    this.freeLight = true;
    // one big row across the stage
    const n = this.n, sp = Math.min(330, 1300 / n);
    this.order.forEach((st, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * sp;
      const a = st.actor, s0 = a.scale; a.scale = 1; const w1 = Math.max(1, a.width); a.scale = s0;
      st.showTo = { x, y: 880, scale: Math.min((n <= 3 ? 340 : n <= 5 ? 290 : 250) / a.leader.h, (sp * 0.95) / w1) };
      st.hop = { h: 0, v: 0 }; st.poseCD = 0; st.aiT = rand(0.2, 0.8); st.freeX = null;
      st.dancer.baseFacing = x < W / 2 ? 1 : -1;
      st.actor.setPose('dance');
    });
    sfx('fanfare', { vol: 0.5 }); sfx('magic');
    particles.confettiRain(W, 70);
    this.bannerT = 0;
  }

  updateFree(dt) {
    const S = this.stage;
    for (const st of this.stations) this.freeMove(st, dt);
    for (const d of [3, 2, 1]) if (S.t >= FREE_T - d && S.t - dt < FREE_T - d) sfx(d === 1 ? 'tock' : 'tick');
    if (Math.floor(S.beat) !== this.clock.last) { this.clock.last = Math.floor(S.beat); S.pulse = 0.8; }
    if (S.t >= FREE_T) this.freeze();
  }

  /** Free dance: the stick moves, A jumps, every other button strikes a pose. */
  freeMove(st, dt) {
    const a = st.actor, c = st.p.ctrl, hop = st.hop, d = st.dancer, to = st.showTo;
    st.poseCD = Math.max(0, st.poseCD - dt);
    if (st.freeX === null) { if (Math.abs(d.hx - to.x) < 20) st.freeX = to.x; else return; }
    let mx = photoMove(c).x, jump = c.pressed('a'), pose = photoPosePressed(c);
    if (st.p.isAI) {
      st.aiT -= dt;
      if (st.aiT <= 0) { st.aiT = rand(0.45, 1.1); st.aiMx = chance(0.35) ? rand(-0.7, 0.7) : 0; if (chance(0.35)) jump = true; else if (chance(0.7)) pose = randomPhotoPose(); }
      mx = st.aiMx || 0;
      if (Math.abs(st.freeX - to.x) > 160) mx = Math.sign(to.x - st.freeX) * 0.6;
    }
    st.freeX = clamp(st.freeX + mx * 560 * dt, 260, W - 260);
    to.x = st.freeX; d.hx = st.freeX;
    if (Math.abs(mx) > 0.2) { d.baseFacing = mx > 0 ? 1 : -1; a.facing = d.baseFacing; }
    if (jump && hop.h <= 0) { hop.v = 980; snd('boing', 'jump', { vol: 0.35 }); a.squash(-0.25); }
    hop.v -= 2800 * dt; hop.h = Math.max(0, hop.h + hop.v * dt);
    if (hop.h <= 0 && hop.v < 0) { if (hop.v < -200) a.squash(0.2); hop.v = 0; }
    d.mv = null;
    if (pose && st.poseCD <= 0) {
      st.poseCD = 0.35;
      strikePhotoPose(a, pose, { onBump: (who) => this.bumpNeighbours(st, who) });
    }
    if (!a._once) a.setPose(hop.h > 0 ? 'jump' : Math.abs(mx) > 0.2 ? 'walk' : 'dance');
    d.extraZ = hop.h * (a.scale / (to.scale || 1));
  }

  bumpNeighbours(st, a) {
    for (const o of this.stations) {
      if (o === st || !o.hop) continue;
      const b = o.actor, dx = b.x - a.x;
      if (Math.abs(dx) < (a.width + b.width) * 0.45) {
        o.freeX = clamp((o.freeX ?? b.x) + Math.sign(dx || 1) * 70, 260, W - 260);
        b.playOnce('surprised', 0.8, 'dance'); b.squash(0.2); o.hop.v = Math.max(o.hop.v, 300);
      }
    }
    snd('boing', 'bounce', { vol: 0.4 });
  }

  freeze() {
    const S = this.stage;
    S.sub = 'photo'; S.t = 0; this.photoT = 0;
    music.stop(0.15);
    for (const st of this.stations) { if (st.hop) st.hop.h = 0; st.dancer.extraZ = 0; }
    this.photo = this.snapshot();
    fx.flash('#ffffff', 0.45);
    if (hasSound('camera-flash')) sfx('camera-flash', { vol: 0.7 }); else sfx('shutter');
    sfx('fanfare'); snd('applause', 'cheer');
    particles.confettiRain(W, 140);
    this.stations.forEach((st, i) => { st.actor.playOnce(i % 2 ? 'photo' : 'strike3', 1.2, 'celebrate'); });
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
    const stats = this.stations.map((st) => {
      const counts = new Map();
      for (const m of st.slots) if (m !== null) counts.set(m, (counts.get(m) || 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!top) return STAGES[st.stage].name;
      if (counts.size >= 6) return `${counts.size} different moves!`;
      return `${MOVES[top[0]].name} ×${top[1]} · ${STAGES[st.stage].name}`;
    });
    this.api.finish({ showcase: true, highlight: null, stats, title: 'What a show!', focus: { x: W / 2, y: 700 } });
  }

  onDone() {
    if (this.phase === 'make') { this.startShow(); return; }
    const S = this.stage;
    if (S.sub === 'free' || S.sub === 'photo') { if (S.sub === 'free') this.freeze(); else this.finishGame(); return; }
    this.startFree();
  }

  destroy() {}

  // =================================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'make') this.drawMake(g);
    else this.drawShow(g, false);
  }

  drawHUD(g) {
    if (this.phase === 'make') this.drawMakeHUD(g);
    else this.drawShowHUD(g);
  }

  // --- making -------------------------------------------------------------------------
  drawMake(g) {
    drawStudio(g, W, H, this.t);
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawMakeHUD(g) {
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -330, -40, 660, 80, { r: 40, fill: '#9b5cff' });
    ui.text(g, 'Dance Studio', 0, 2, { size: 52, weight: 800 });
    g.restore();
    // little dancing note pals by the title
    for (const s of [-1, 1]) {
      g.save(); g.translate(W / 2 + s * 400, 56 + Math.sin(this.t * 6 + s) * 6); g.rotate(Math.sin(this.t * 3) * 0.2 * s);
      g.fillStyle = s < 0 ? '#ff6fb1' : '#3fa7ff'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.ellipse(-8, 14, 15, 11, -0.4, 0, TAU); g.fill(); g.stroke();
      g.fillRect(4, -26, 7, 40); g.strokeRect(4, -26, 7, 40);
      g.beginPath(); g.moveTo(11, -26); g.quadraticCurveTo(30, -16, 24, -2); g.lineWidth = 6; g.strokeStyle = g.fillStyle; g.stroke();
      g.restore();
    }
    if (this.n <= 2) {
      ui.hints(g, [['lb', ''], ['rb', 'Steps']], 230, 56, { size: 34 });
      ui.hints(g, [['y', 'Surprise!']], W - 210, 56, { size: 34 });
    }
    if (!this.cpuOnly && this.setupLeft < 40) {
      const x = this.n <= 2 ? W / 2 + 520 : W / 2 + 470;
      ui.timer(g, Math.max(0, this.setupLeft), x, 56);
    }
  }

  drawStation(g, st) {
    const { r, L, p } = st;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26);
    g.fillStyle = mix(p.color, '#ffffff', 0.84); g.fill();
    g.save(); g.clip();
    // soft polka dots
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let y = r.y + 20; y < r.y + r.h; y += 46) for (let x = r.x + ((y / 46) % 2 ? 23 : 0); x < r.x + r.w; x += 46) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
    g.restore();
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke();
    g.restore();
    this.drawTabs(g, st);
    this.drawPreview(g, st);
    const tab = TABS[st.tab].id;
    if (tab === 'moves') this.drawMovePalette(g, st);
    else if (tab === 'done') this.drawDonePanel(g, st);
    else this.drawOptions(g, st, tab);
    this.drawTimeline(g, st);
    this.drawStationHints(g, st);
    if (st.ready) this.drawReady(g, st);
  }

  drawTabs(g, st) {
    const { r, L } = st, n = this.n;
    const gs = clamp(L.tabH * 0.62, 24, 40);
    const x0 = r.x + 14 + gs * 0.9, x1 = r.x + r.w - 14 - gs * 0.9;
    const tw = (x1 - x0) / TABS.length;
    ui.glyph(g, 'lb', r.x + 10 + gs * 0.7, r.y + 10 + L.tabH / 2, gs * 0.85);
    ui.glyph(g, 'rb', r.x + r.w - 10 - gs * 0.7, r.y + 10 + L.tabH / 2, gs * 0.85);
    TABS.forEach((tab, ti) => {
      const sel = ti === st.tab, done = ti < st.tab || (ti === 0 && this.filled(st) === 8);
      const bx = x0 + ti * tw + 3, bw = tw - 6, by = r.y + 10 + (sel ? 0 : 5), bh = L.tabH - (sel ? 0 : 6);
      const kk = sel ? 1 + st.tabBump * 0.8 : 1;
      g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(kk, kk);
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 14, fill: sel ? st.p.color : mix(st.p.color, '#ffffff', 0.55), lineWidth: sel ? 5 : 3, shadow: sel });
      ui.text(g, tab.name, 0, 1, { size: clamp(bh * 0.42, 15, 28), color: sel ? '#ffffff' : NAVY, stroke: sel ? NAVY : false, strokeWidth: 5, weight: 800, maxWidth: bw - 10 });
      if (done && !sel) { g.beginPath(); g.arc(bw / 2 - 7, -bh / 2 + 7, n > 4 ? 4 : 6, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
      g.restore();
    });
  }

  drawPreview(g, st) {
    const pv = st.L.preview, t = this.t;
    const light = LIGHTS[st.light], floorY = pv.y + pv.h * 0.74;
    g.save();
    ui.roundRect(g, pv.x, pv.y, pv.w, pv.h, 18); g.clip();
    drawBackdrop(g, STAGES[st.stage].id, pv.x, pv.y, pv.w, floorY - pv.y, t);
    drawLights(g, light, pv.x, pv.y, pv.w, floorY - pv.y, t, st.pvBeat, st.pvPulse * 0.6, 1);
    drawFloor(g, pv.x, floorY, pv.w, pv.y + pv.h - floorY, light, t);
    if (light.specks) drawMirrorBall(g, pv.x + pv.w / 2, pv.y + pv.h * 0.12, Math.min(pv.w, pv.h) * 0.07, t);
    st.dancer.drawReflection(g, floorY, pv);
    st.dancer.draw(g, { ring: st.p.color });
    drawCurtains(g, pv.x, pv.y, pv.w, pv.h, 1, t);
    // name chip
    const cs = clamp(pv.h * 0.12, 24, 40);
    drawPortrait(g, st.p, pv.x + cs * 0.75 + 4, pv.y + cs * 0.75 + 4, cs * 0.7, { ring: st.p.color });
    if (this.t < 4 || this.n <= 2) ui.text(g, st.p.tag, pv.x + cs * 1.6 + 6, pv.y + cs * 0.75 + 4, { size: cs * 0.62, align: 'left', color: st.p.color, strokeWidth: 5 });
    // beat light: which count is playing
    const j = mod(Math.floor(st.pvBeat), 8);
    ui.text(g, String(j + 1), pv.x + pv.w - cs * 0.9, pv.y + cs * 0.8, { size: cs * (0.9 + st.pvPulse * 0.25), color: '#fff6a8' });
    g.restore();
    g.save(); ui.roundRect(g, pv.x, pv.y, pv.w, pv.h, 18); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke(); g.restore();
    if (this.t < 3.5 && !st.p.isAI) ui.playerTag(g, st.p, st.actor.x, st.actor.y - st.actor.height - 12);
  }

  /** Card grid helper: cell rects for `count` items in `cols` columns in rect R (below a label row). */
  grid(R, count, cols, labelH) {
    const rows = Math.ceil(count / cols);
    const cw = R.w / cols, ch = (R.h - labelH) / rows;
    return { cw, ch, rows, cell: (i) => ({ x: R.x + (i % cols) * cw, y: R.y + labelH + Math.floor(i / cols) * ch, w: cw, h: ch }) };
  }

  drawMovePalette(g, st) {
    const R = st.L.palette, labelH = clamp(R.h * 0.13, 22, 54);
    const G = this.grid(R, MOVES.length, st.cols, labelH);
    const sel = MOVES[st.sel];
    ui.text(g, sel.name, R.x + R.w / 2, R.y + labelH * 0.45, { size: labelH * 0.72 * (1 + st.palBump), color: sel.color, maxWidth: R.w - 10 });
    MOVES.forEach((M, i) => {
      const c = G.cell(i), s = Math.min(c.w, c.h) - 6, on = i === st.sel;
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      g.save(); g.translate(cx, cy);
      const k = on ? 1.08 + st.palBump * 0.6 : 1;
      g.scale(k, k);
      g.fillStyle = on ? '#ffffff' : '#fff8ec'; g.strokeStyle = on ? st.p.color : NAVY; g.lineWidth = on ? 5 : 2.5;
      ui.roundRect(g, -s / 2, -s / 2, s, s, s * 0.18); g.fill(); g.stroke();
      if (on) { g.lineWidth = 2; g.strokeStyle = NAVY; ui.roundRect(g, -s / 2 - 3, -s / 2 - 3, s + 6, s + 6, s * 0.2); g.stroke(); }
      g.fillStyle = rgba(M.color, 0.3); ui.roundRect(g, -s / 2 + s * 0.07, -s / 2 + s * 0.07, s * 0.86, s * 0.86, s * 0.13); g.fill();
      drawMovePicto(g, M, 0, 0, s * 0.92, this.t, on);
      g.restore();
    });
  }

  drawOptions(g, st, tab) {
    const R = st.L.palette, labelH = clamp(R.h * 0.13, 22, 54);
    const list = tab === 'music' ? MUSIC : tab === 'lights' ? LIGHTS : STAGES;
    const cur = tab === 'music' ? st.music : tab === 'lights' ? st.light : st.stage;
    const title = tab === 'music' ? 'Pick the music' : tab === 'lights' ? 'Pick the lights' : 'Pick a stage';
    ui.text(g, title, R.x + R.w / 2, R.y + labelH * 0.45, { size: labelH * 0.62, color: '#ffffff', maxWidth: R.w - 10 });
    const G = this.grid(R, list.length, OPT_COLS, labelH);
    list.forEach((o, i) => {
      const c = G.cell(i), on = i === cur;
      const w = c.w - 8, h = c.h - 8;
      g.save(); g.translate(c.x + c.w / 2, c.y + c.h / 2);
      const k = on ? 1.05 + st.palBump * 0.5 : 1; g.scale(k, k);
      g.save(); ui.roundRect(g, -w / 2, -h / 2, w, h, 14); g.clip();
      const ih = h - Math.max(16, h * 0.28);
      if (tab === 'stage') drawBackdrop(g, o.id, -w / 2, -h / 2, w, ih, this.t);
      else if (tab === 'lights') { g.fillStyle = '#2a1840'; g.fillRect(-w / 2, -h / 2, w, ih); drawLights(g, o, -w / 2, -h / 2, w, ih, this.t, this.t * 2, 0, 1.4); }
      else this.drawMusicIcon(g, o, -w / 2, -h / 2, w, ih, on);
      g.fillStyle = on ? st.p.color : '#fff8ec'; g.fillRect(-w / 2, -h / 2 + ih, w, h - ih);
      g.restore();
      ui.text(g, o.name, 0, -h / 2 + ih + (h - ih) / 2, { size: clamp((h - ih) * 0.62, 12, 26), color: on ? '#ffffff' : NAVY, stroke: on ? NAVY : false, strokeWidth: 4, weight: 800, maxWidth: w - 8 });
      g.lineWidth = on ? 5 : 2.5; g.strokeStyle = on ? NAVY : 'rgba(36,22,63,0.6)'; ui.roundRect(g, -w / 2, -h / 2, w, h, 14); g.stroke();
      g.restore();
    });
  }

  drawMusicIcon(g, o, x, y, w, h, on) {
    g.fillStyle = mix(o.color, '#ffffff', 0.55); g.fillRect(x, y, w, h);
    const bars = 7, bw = w / (bars * 1.6);
    const beat = this.t * o.bpm / 60;
    for (let i = 0; i < bars; i++) {
      const v = on ? 0.35 + 0.6 * Math.abs(Math.sin(beat * Math.PI + i * 0.9)) : 0.25 + 0.2 * Math.abs(Math.sin(i * 1.7));
      const bh = h * 0.8 * v;
      g.fillStyle = o.color; g.strokeStyle = NAVY; g.lineWidth = 2;
      ui.roundRect(g, x + (i + 0.3) * bw * 1.6, y + h - bh - h * 0.08, bw, bh, bw * 0.4); g.fill(); g.stroke();
    }
    // a note
    const s = Math.min(w, h) * 0.32, nx = x + w * 0.78, ny = y + h * 0.36 + (on ? Math.sin(beat * Math.PI) * 4 : 0);
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(nx - s * 0.2, ny + s * 0.35, s * 0.24, s * 0.18, -0.4, 0, TAU); g.fill(); g.stroke();
    g.fillRect(nx, ny - s * 0.5, s * 0.1, s * 0.85); g.strokeRect(nx, ny - s * 0.5, s * 0.1, s * 0.85);
  }

  drawDonePanel(g, st) {
    const R = st.L.palette;
    const lines = [
      ['Music', MUSIC[st.music].name, MUSIC[st.music].color],
      ['Lights', LIGHTS[st.light].name, LIGHTS[st.light].colors[0]],
      ['Stage', STAGES[st.stage].name, STAGES[st.stage].color],
    ];
    const size = clamp(R.h * 0.075, 14, 32);
    ui.text(g, 'All set?', R.x + R.w / 2, R.y + size * 1.1, { size: size * 1.4, color: '#ffd23f' });
    lines.forEach(([k, v, c], i) => {
      const y = R.y + size * 3 + i * size * 1.6;
      if (R.w < 330) { ui.text(g, v, R.x + R.w / 2, y, { size, color: c, maxWidth: R.w - 12 }); return; }
      ui.text(g, k, R.x + R.w * 0.08, y, { size, align: 'left', color: NAVY, stroke: false, weight: 700 });
      ui.text(g, v, R.x + R.w * 0.95, y, { size, align: 'right', color: c, maxWidth: R.w * 0.6 });
    });
    const by = R.y + R.h - size * 1.6;
    g.save(); g.translate(R.x + R.w / 2, by); const k = 1 + Math.sin(this.t * 5) * 0.04; g.scale(k, k);
    ui.panel(g, -R.w * 0.38, -size * 1.1, R.w * 0.76, size * 2.2, { r: size, fill: '#36d17a' });
    ui.glyph(g, 'a', -R.w * 0.38 + size * 1.4, 0, size * 1.4);
    ui.text(g, 'Ready!', size * 0.8, 0, { size: size * 1.2, maxWidth: R.w * 0.45 });
    g.restore();
  }

  slotRect(st, j) {
    const T = st.L.timeline, gap = Math.max(4, T.w * 0.012);
    const sw = (T.w - gap * 7) / 8, numH = clamp(T.h * 0.22, 14, 30);
    const s = Math.min(sw, T.h - numH - 6);
    const x = T.x + j * (sw + gap) + (sw - s) / 2;
    return { x, y: T.y + numH, w: s, h: s, numY: T.y + numH * 0.5, cx: x + s / 2, cy: T.y + numH + s / 2 };
  }
  slotCenter(st, j) { const r = this.slotRect(st, j); return { x: r.cx, y: r.cy }; }

  drawTimeline(g, st) {
    const T = st.L.timeline;
    g.save();
    ui.roundRect(g, T.x - 4, T.y - 4, T.w + 8, T.h + 8, 16); g.fillStyle = 'rgba(36,22,63,0.82)'; g.fill();
    g.restore();
    const playing = mod(Math.floor(st.pvBeat), 8);
    const editing = TABS[st.tab].id === 'moves' && !st.ready;
    for (let j = 0; j < 8; j++) {
      const R = this.slotRect(st, j), m = st.slots[j], b = st.slotBump[j];
      const k = 1 + b * 0.6 + (j === playing ? st.pvPulse * 0.08 : 0);
      ui.text(g, String(j + 1), R.cx, R.numY, { size: R.y - T.y - 2, color: j === playing ? '#fff6a8' : '#cdbff0', stroke: false, weight: 800 });
      g.save(); g.translate(R.cx, R.cy); g.scale(k, k);
      if (m === null) {
        g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
        ui.roundRect(g, -R.w / 2 + 2, -R.h / 2 + 2, R.w - 4, R.h - 4, R.w * 0.16); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.beginPath(); g.arc(0, 0, R.w * 0.08, 0, TAU); g.fill();
      } else {
        const M = MOVES[m];
        g.fillStyle = '#fff8ec'; g.strokeStyle = NAVY; g.lineWidth = 2.5;
        ui.roundRect(g, -R.w / 2, -R.h / 2, R.w, R.h, R.w * 0.16); g.fill(); g.stroke();
        g.fillStyle = rgba(M.color, 0.4); ui.roundRect(g, -R.w / 2 + 3, -R.h / 2 + 3, R.w - 6, R.h - 6, R.w * 0.13); g.fill();
        drawMovePicto(g, M, 0, 0, R.w * 0.92, this.t, j === playing);
      }
      if (j === playing) { g.strokeStyle = '#fff6a8'; g.lineWidth = 3; ui.roundRect(g, -R.w / 2 - 3, -R.h / 2 - 3, R.w + 6, R.h + 6, R.w * 0.18); g.stroke(); }
      g.restore();
    }
    if (editing) {
      const R = this.slotRect(st, st.cur);
      const bob = Math.sin(this.t * 8) * 3;
      g.save();
      g.strokeStyle = NAVY; g.lineWidth = 9; ui.roundRect(g, R.x - 6, R.y - 6, R.w + 12, R.h + 12, R.w * 0.2); g.stroke();
      g.strokeStyle = st.p.color; g.lineWidth = 5; g.stroke();
      // the carried card floats above the cursor
      if (st.held) {
        const M = MOVES[st.held.m], s = R.w * 0.95;
        g.translate(R.cx, R.y - s * 0.32 + bob); g.rotate(Math.sin(this.t * 6) * 0.08);
        g.fillStyle = '#ffffff'; g.strokeStyle = st.p.color; g.lineWidth = 4;
        ui.roundRect(g, -s / 2, -s / 2, s, s, s * 0.16); g.fill(); g.stroke();
        drawMovePicto(g, M, 0, 0, s * 0.9, this.t, true);
      } else {
        // a little pointer
        g.fillStyle = st.p.color; g.strokeStyle = NAVY; g.lineWidth = 3;
        g.beginPath(); g.moveTo(R.cx - 10, R.y + R.h + 14 + bob); g.lineTo(R.cx + 10, R.y + R.h + 14 + bob); g.lineTo(R.cx, R.y + R.h + 4 + bob); g.closePath(); g.fill(); g.stroke();
      }
      g.restore();
    }
  }

  drawStationHints(g, st) {
    const { r, L } = st, n = this.n;
    if (st.ready) return;
    const tab = TABS[st.tab].id, small = n > 4, mid = n > 2;
    let list;
    if (tab === 'moves') {
      if (st.held) list = [['a', 'Put here'], ['b', 'Take out']];
      else if (this.filled(st) === 8) list = small ? [['a', 'Pick up'], ['rb', 'Next']] : [['a', 'Pick up'], ['b', 'Take out'], ['rb', 'Next step']];
      else if (small) list = [['dpad', 'Move'], ['a', 'Put in']];
      else list = [['stick', 'Beat'], ['dpad', 'Move'], ['a', 'Put in'], ['b', 'Out']].concat(mid ? [] : [['x', 'Try it']]);
    } else if (tab === 'done') list = [['a', 'Ready!'], ['b', 'Back']];
    else list = small ? [['dpad', 'Pick'], ['a', 'OK']] : [['dpad', 'Pick'], ['a', 'OK'], ['b', 'Back']];
    const size = small ? 26 : mid ? 30 : 36;
    ui.hints(g, list, r.x + r.w / 2, L.hintY, { size, gap: small ? 16 : 26 });
    if (st.hintT > 0) ui.text(g, 'Pick a beat with a card on it!', r.x + r.w / 2, L.timeline.y - 16, { size: small ? 18 : 24, color: '#ffd23f', maxWidth: r.w - 20 });
  }

  drawReady(g, st) {
    const { r } = st;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26); g.fillStyle = 'rgba(36,22,63,0.28)'; g.fill();
    const s = clamp(r.h * 0.1, 30, 80), pv = st.L.preview;
    g.translate(pv.x + pv.w / 2, pv.y + pv.h * 0.3);
    const k = st.readyT < 0.35 ? ease.outBack(st.readyT / 0.35) : 1;
    g.scale(k, k); g.rotate(-0.06);
    const bw = Math.min(s * 5.2, pv.w * 0.95);
    ui.panel(g, -bw / 2, -s * 0.75, bw, s * 1.5, { r: s * 0.6, fill: '#36d17a' });
    ui.text(g, 'Ready!', 0, 2, { size: s * 0.95, maxWidth: bw - 20 });
    g.restore();
    if (!st.p.isAI) ui.hints(g, [['b', 'Change']], r.x + r.w / 2, st.L.hintY, { size: this.n > 4 ? 26 : 32 });
    else ui.text(g, 'Waiting for friends...', r.x + r.w / 2, st.L.hintY, { size: this.n > 4 ? 20 : 26, color: '#fff' });
  }

  // --- the show -----------------------------------------------------------------------
  drawShow(g, forPhoto) {
    const S = this.stage, t = this.t;
    const light = LIGHTS[this.lightIdx] || LIGHTS[0];
    const B = this.backdrop;
    const stageH = FLOOR_Y;
    if (B.prev !== null && B.fade < 1) drawBackdrop(g, STAGES[B.prev].id, 0, 0, W, stageH, t);
    g.save(); g.globalAlpha = B.prev === null ? 1 : B.fade;
    drawBackdrop(g, STAGES[B.cur].id, 0, 0, W, stageH, t);
    g.restore();
    // dim the stage while the lights are low
    const power = S.power;
    if (power < 1) { g.fillStyle = `rgba(20,10,40,${(1 - power) * 0.55})`; g.fillRect(0, 0, W, H); }
    drawLights(g, light, 0, 0, W, H * 0.95, t, S.beat, S.pulse, power);
    if (S.sub === 'free') {
      const disco = LIGHTS.find((l) => l.id === 'disco');
      drawLights(g, disco, 200, 0, W - 400, H * 0.9, t, S.beat + 1, S.pulse * 0.5, 0.7);
    }
    drawFloor(g, 0, FLOOR_Y, W, H - FLOOR_Y, light, t);
    const all = { x: 0, y: 0, w: W, h: H };
    const sorted = this.stations.slice().sort((a, b) => a.actor.y - b.actor.y);
    for (const st of sorted) st.dancer.drawReflection(g, FLOOR_Y, all, 0.24);
    // spotlight pool on the routine's choreographer
    if (this.seg >= 0 && S.sub !== 'free' && S.sub !== 'photo') {
      const a = this.lead.actor;
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(a.x, a.y, 10, a.x, a.y, 260);
      gr.addColorStop(0, 'rgba(255,246,200,0.38)'); gr.addColorStop(1, 'rgba(255,246,200,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(a.x, a.y, 260, 70, 0, 0, TAU); g.fill();
      const cone = g.createLinearGradient(0, 0, 0, a.y);
      cone.addColorStop(0, 'rgba(255,246,200,0.02)'); cone.addColorStop(1, 'rgba(255,246,200,0.16)');
      g.fillStyle = cone; g.beginPath(); g.moveTo(a.x - 40, 0); g.lineTo(a.x + 40, 0); g.lineTo(a.x + 220, a.y); g.lineTo(a.x - 220, a.y); g.closePath(); g.fill();
      g.restore();
    }
    for (const st of sorted) {
      const isLead = this.seg >= 0 && st === this.lead && S.sub !== 'free' && S.sub !== 'photo';
      st.dancer.draw(g, { ring: st.p.color, emotes: !forPhoto });
      if (isLead && !forPhoto) this.drawCrownSparkle(g, st);
    }
    drawMirrorBall(g, W / 2, S.ballY, 66, t, S.pulse);
    drawCurtains(g, 0, 0, W, H, S.curtain ?? 1, t);
  }

  drawCrownSparkle(g, st) {
    const a = st.actor, head = a.anchor('head');
    g.save(); g.translate(head.x, head.y - 26 + Math.sin(this.t * 5) * 4);
    const s = 1 + this.stage.pulse * 0.25; g.scale(s, s);
    g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 3;
    g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 17, ang = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  drawShowHUD(g) {
    const S = this.stage, t = this.t;
    if (S.sub === 'intro') {
      if (S.t > 0.8) ui.banner(g, 'Showtime!', S.t - 0.8, { y: 330, size: 150, color: '#ffd23f' });
      if (S.t > 1.4) this.drawTags(g, 40);
      return;
    }
    if (S.sub === 'switch' || S.sub === 'count' || S.sub === 'dance' || S.sub === 'bow') {
      this.drawRoutineCard(g);
      this.drawStrip(g);
    }
    if (S.sub === 'count') {
      const b = Math.floor(S.beat);
      if (b >= -4 && b < 0) {
        const f = S.beat - b, label = ['5', '6', '7', '8!'][b + 4];
        g.save(); g.translate(W / 2, 430); g.scale(1.25 - f * 0.25, 1.25 - f * 0.25); g.globalAlpha = 1 - f * 0.5;
        ui.text(g, label, 0, 0, { size: 170, color: b === -1 ? '#ff6fb1' : '#ffffff', strokeWidth: 14 });
        g.restore();
      }
    }
    if (S.sub === 'bow' && S.t < 1.6) ui.banner(g, pick2(FINALE_WORDS, this.seg), S.t, { y: 360, size: 130, color: '#ffd23f' });
    // show-time hints for humans
    if (S.sub === 'count' || S.sub === 'dance' || S.sub === 'bow') {
      if (this.stations.some((s) => !s.p.isAI)) ui.hints(g, [['a', 'Woo!']], W - 170, H - 40, { size: 34 });
    }
    if (S.sub === 'free') {
      if (S.t < 2.2) ui.banner(g, 'Free dance!', S.t, { y: 300, size: 140, color: '#ff6fb1' });
      if (S.t > FREE_T - 3) {
        const n = Math.ceil(FREE_T - S.t), f = 1 - (FREE_T - S.t - (n - 1));
        g.save(); g.translate(W / 2, 330); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6;
        ui.text(g, String(n), 0, 0, { size: 200, color: '#ffd23f', strokeWidth: 12 }); g.restore();
      }
      if (S.t < 3) this.drawTags(g, 40);
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        const [r1, r2] = photoPoseHints(humans.some((s) => s.p.ctrl.kind === 'pad'));
        ui.hints(g, r1, W / 2, H - 104, { size: 36 }); ui.hints(g, r2, W / 2, H - 50, { size: 36 });
      }
    }
    if (S.sub === 'photo') this.drawPhoto(g);
    void t;
  }

  /** P1/P2 tags over the human players' dancers (screen space). */
  drawTags(g, up) {
    const cam = this.api.camera;
    for (const st of this.stations) {
      if (st.p.isAI) continue;
      const a = st.actor, x = a.x, y = a.y - a.z - a.height - up;
      const p = cam ? cam.toScreen(x, y) : { x, y };
      ui.playerTag(g, st.p, p.x, p.y);
    }
  }

  /** "<Name>'s dance" card at the top. */
  drawRoutineCard(g) {
    const S = this.stage, st = this.lead, bt = this.bannerT || 0;
    const k = bt < 0.4 ? ease.outBack(bt / 0.4) : 1;
    const big = S.sub === 'switch';
    g.save(); g.translate(big ? W / 2 : 470, big ? 310 : 152); g.scale(k * (big ? 1 : 0.68), k * (big ? 1 : 0.68));
    const w = 760, h = 120;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 60, fill: st.p.color, lineWidth: 7 });
    drawPortrait(g, st.p, -w / 2 + 62, 0, 50, { ring: '#ffffff' });
    ui.fitText(g, `${playerName(st.p)}'s dance!`, 34, -4, { size: 54, maxWidth: w - 170, color: '#ffffff' });
    g.restore();
    if (big) {
      const info = `${MUSIC[st.music].name}  ·  ${LIGHTS[st.light].name}  ·  ${STAGES[st.stage].name}`;
      ui.text(g, info, W / 2, 402, { size: 36, color: '#fff6a8', maxWidth: 1100 });
    }
  }

  /** The routine's 8 cards along the bottom, the current beat lit up. */
  drawStrip(g) {
    const S = this.stage, st = this.lead;
    const s = 96, gap = 14, total = 8 * s + 7 * gap, x0 = W / 2 - total / 2, y = H - 66;
    const cur = S.sub === 'dance' ? mod(Math.floor(S.beat), 8) : -1;
    const frac = S.sub === 'dance' ? S.beat - Math.floor(S.beat) : 0;
    g.save();
    ui.roundRect(g, x0 - 16, y - s / 2 - 14, total + 32, s + 28, 26); g.fillStyle = 'rgba(36,22,63,0.78)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = st.p.color; g.stroke();
    g.restore();
    for (let j = 0; j < 8; j++) {
      const m = st.slots[j], cx = x0 + j * (s + gap) + s / 2;
      const on = j === cur, k = on ? 1.18 - frac * 0.12 : 1;
      g.save(); g.translate(cx, y - (on ? 12 : 0)); g.scale(k, k);
      g.fillStyle = on ? '#ffffff' : '#fff8ec'; g.strokeStyle = on ? st.p.color : NAVY; g.lineWidth = on ? 6 : 3;
      ui.roundRect(g, -s / 2, -s / 2, s, s, 18); g.fill(); g.stroke();
      if (m !== null) {
        const M = MOVES[m];
        g.fillStyle = rgba(M.color, on ? 0.5 : 0.3); ui.roundRect(g, -s / 2 + 5, -s / 2 + 5, s - 10, s - 10, 14); g.fill();
        drawMovePicto(g, M, 0, 0, s * 0.9, this.t, on);
      } else {
        g.fillStyle = rgba('#9b5cff', 0.15); ui.roundRect(g, -s / 2 + 5, -s / 2 + 5, s - 10, s - 10, 14); g.fill();
        ui.text(g, '♪', 0, 0, { size: 48, color: '#c49bff', stroke: false });
      }
      ui.text(g, String(j + 1), -s / 2 + 14, -s / 2 + 14, { size: 22, color: on ? st.p.color : '#9a8fb8', strokeWidth: 4 });
      g.restore();
    }
    if (cur >= 0) {
      const m = st.slots[cur];
      const name = m === null ? 'Groove!' : MOVES[m].name;
      g.save(); g.translate(470, 228); const k = 1 + (1 - Math.min(1, frac * 3)) * 0.15; g.scale(k, k);
      ui.text(g, name, 0, 0, { size: 50, color: m === null ? '#c49bff' : MOVES[m].color });
      g.restore();
    }
  }

  drawPhoto(g) {
    const pt = this.photoT || 0;
    g.save(); g.fillStyle = `rgba(36,22,63,${0.45 * clamp(pt / 0.4, 0, 1)})`; g.fillRect(0, 0, W, H); g.restore();
    const pop = pt < 0.45 ? ease.outBack(pt / 0.45) : 1;
    g.save(); g.translate(W / 2, H / 2 - 20); g.scale(pop, pop); g.rotate(-0.035);
    const w = 1180, h = 664;
    g.fillStyle = '#ffffff'; g.strokeStyle = NAVY; g.lineWidth = 6;
    ui.roundRect(g, -w / 2 - 26, -h / 2 - 26, w + 52, h + 120, 16); g.fill(); g.stroke();
    if (this.photo) g.drawImage(this.photo, -w / 2, -h / 2, w, h);
    else { g.fillStyle = '#2b2370'; g.fillRect(-w / 2, -h / 2, w, h); }
    g.lineWidth = 3; g.strokeRect(-w / 2, -h / 2, w, h);
    ui.text(g, 'Freeze!', 0, h / 2 + 50, { size: 64, color: '#ff6fb1' });
    g.restore();
  }
}

function pick2(arr, i) { return arr[mod(i * 7 + 3, arr.length)]; }

function drawIcon(g, x, y, w, h, t) {
  drawThumb(g, x, y, w, h, t || 0);
}
