// Dance Studio (Play Studio). Set the scene, practise the moves, then all
// dance together in real time.
//
// Setup: every player has a rehearsal station. LB / RB step through Stage,
// Music, Lights (one of them "None") and Done; the stick (or d-pad) picks a
// card. Each dance button does its move right there on the mini stage (no
// walking here; it is for trying moves out): X Disco, A Star Jump, B Hula,
// Y Twirl, LT Cartwheel, RT Can-can, shown in the panel at the bottom. A also
// does its move, except on Done, where it is "I'm ready!" (B undoes ready).
// LB / RB are the categories here, so their two moves (Splits, Moonwalk) are
// show-only.
//
// The show: the curtains open on a big stage with a mirror ball and a mirror
// floor, and everyone dances at once: the stick walks about the stage and
// every dance button (now LB / RB too) does its move live. Each player's
// stage, music and lights take a turn; moves on the beat sparkle and get the
// crowd cheering (no scores). It ends with a 3-2-1 "Freeze!" photo, which
// stays up as the gallery screen. No losers.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait, getSpriteSet, POSES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, music, audioRunning, hasSound } from '../engine/audio.js';
import { aiProfile } from '../engine/ai.js';
import { playerName } from '../state.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, ease, TAU } from '../engine/util.js';
import { photoMove } from '../engine/photo-poses.js';
import {
  NAVY, DANCES, MUSIC, LIGHTS, STAGES, rgba, mix,
  drawBackdrop, drawFloor, drawLights, drawCurtains, drawMirrorBall, drawMovePicto, drawStudio, drawNoneIcon,
} from './dance-studio/stage.js';

import { drawDoneTab } from '../engine/studio-ui.js';
import { meta } from './dance-studio.meta.js';

export { meta };

const TABS = [
  { id: 'stage', name: 'Stage' },
  { id: 'music', name: 'Music' },
  { id: 'lights', name: 'Lights' },
  { id: 'done', name: 'Done' },
];
const OPT_COLS = 2;             // stage / music / lights: 2 columns of cards
const SETUP_TIME = 150;         // gentle clock for the making part (seconds)
const FLOOR_Y = 760;            // show: stage floor top
const STAGE_Y0 = 800, STAGE_Y1 = 930, STAGE_X0 = 250, STAGE_X1 = W - 250;   // show: where dancers can walk
const FREEZE_COUNT = 3;         // show: the 3-2-1 before the Freeze! photo (seconds)
const PHOTO_T = 3.2;            // show: the photo on screen before the gallery
const SETUP_DANCES = DANCES.map((d, i) => i).filter((i) => !DANCES[i].show);   // LB / RB are the categories in the setup
const SHOW_DANCES = DANCES.map((d, i) => i);
const CHEERS = ['On the beat!', 'Woo!', 'Yeah!', 'So cool!', 'Groovy!'];
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));
const mod = (a, n) => ((a % n) + n) % n;

function moveSound(m, vol = 0.45) {
  switch (m.sound) {
    case 'boing': snd('boing', 'bounce', { vol }); break;
    case 'sparkle': snd('ds-twirl', 'sparkle', { vol }); break;
    case 'whoosh': snd('ds-slide', 'whoosh', { vol }); break;
    default: sfx(m.sound, { vol });
  }
}

/** The best pose this character has for a move: the first in the list its sprite set has
 *  (so new dance-* art is picked up the moment it lands), else the first the engine knows. */
function pickPose(actor, list) {
  const set = getSpriteSet(actor.leader.asset);
  if (set) { for (const p of list) if (set.poses[p]) return p; }
  for (const p of list) if (POSES[p]) return p;
  return list[list.length - 1];
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
  const padH = Math.round(clamp(r.h * 0.22, 92, 190));
  const midY = r.y + tabH + pad * 1.5, midH = r.h - tabH - padH - hintH - pad * 3.5;
  const pvW = Math.round((r.w - pad * 3) * 0.47);
  return {
    pad, tabH, hintH, padH,
    preview: { x: r.x + pad, y: midY, w: pvW, h: midH },
    palette: { x: r.x + pad * 2 + pvW, y: midY, w: r.w - pad * 3 - pvW, h: midH },
    dancePad: { x: r.x + pad, y: midY + midH + pad, w: r.w - pad * 2, h: padH },
    hintY: r.y + r.h - hintH / 2 - pad * 0.3,
  };
}

// =============================================================================
// A dancing character: an Actor plus the motion each move adds (hops, twirls,
// cartwheels, kicks, hula sways, splits, moonwalks) and a mirrored reflection.
// canTravel: in the show a cartwheel / moonwalk really carries you along
// (within minX..maxX); in the setup it is done on the spot.
class Dancer {
  constructor(actor) {
    this.a = actor;
    this.hx = actor.x; this.hy = actor.y;   // home (feet) position
    this.mv = null; this.u = 0; this.dur = 0.5; this.dir = 1;
    this.rot = 0; this.dx = 0; this.z = 0; this.ksx = 1; this.ksy = 1; this.pivot = 0;
    this.baseFacing = 1; this.side = 1; this.lastId = null;
    this.canTravel = false; this.minX = 0; this.maxX = W;
  }
  get busy() { return !!this.mv; }
  /** Do dance i for its beats at `beatDur` seconds a beat. */
  perform(i, beatDur) {
    const a = this.a, M = DANCES[i];
    this.side = M.mirror && this.lastId === M.id ? -this.side : 1;
    this.lastId = M.id;
    this.mv = M; this.u = 0;
    this.dur = Math.max(0.45, M.beats * beatDur);
    this.dir = this.baseFacing * this.side;
    a.facing = this.dir;
    this.pose = pickPose(a, M.poses);
    a.playOnce(this.pose, this.dur * 0.97, 'idle');
    a.squash(M.drop ? 0.3 : -0.15);
  }
  update(dt, beat = 0) {
    const a = this.a;
    let z = 0; this.rot = 0; this.dx = 0; this.ksx = 1; this.ksy = 1; this.pivot = 0;
    const M = this.mv;
    if (M) {
      this.u += dt / this.dur;
      const k = Math.min(1, this.u), s = Math.sin(k * Math.PI), h = a.height, d = this.dir;
      if (M.hop) z = s * h * M.hop;
      if (M.lean) this.rot += s * M.lean * d;
      if (M.roll && this.pose !== M.poses[0]) {
        // stand-in cartwheel: a whole turn about the middle, upside down halfway
        // (the dance-cartwheel art is upside down itself, so it isn't turned)
        this.rot = ease.inOutQuad(k) * TAU * d; this.pivot = 0.5; z = s * h * 0.12;
      }
      if (M.travel) {
        if (this.canTravel) this.hx = clamp(this.hx + (d * M.travel * dt) / this.dur, this.minX, this.maxX);
        else this.dx = s * Math.min(40, h * 0.25) * d;
      }
      if (M.glide) {
        // moonwalk: facing forward, sliding backward
        if (this.canTravel) this.hx = clamp(this.hx - (d * M.glide * dt) / this.dur, this.minX, this.maxX);
        else this.dx = -s * Math.min(36, h * 0.22) * d;
        this.rot -= s * 0.1 * d;
      }
      if (M.kick) {
        // two kicks: one leg then the other (the art mirrors halfway)
        a.facing = k < 0.5 ? d : -d;
        const kk = Math.abs(Math.sin(k * TAU));
        z = kk * h * 0.07; this.rot += Math.sin(k * TAU) * 0.08;
      }
      if (M.sway) { const w = Math.sin(k * TAU * 2); this.rot += w * M.sway; this.dx += w * h * 0.06; }
      if (M.drop) {
        const e = k < 0.15 ? ease.outBack(k / 0.15) : k > 0.85 ? (1 - k) / 0.15 : 1;
        this.ksx = 1 + 0.22 * e; this.ksy = 1 - 0.2 * e;
      }
      if (this.u >= 1) { this.mv = null; a.facing = this.baseFacing; }
    } else {
      // a little groove on the beat between moves
      z = Math.abs(Math.sin(beat * Math.PI)) * a.height * 0.025;
    }
    this.z = z;
    a.x = this.hx + this.dx; a.y = this.hy; a.z = z + (this.extraZ || 0);
    a.update(dt);
  }
  /** The move's rotation / stretch, about the feet or (cartwheel) the middle. */
  transform(g) {
    const a = this.a;
    if (!this.rot && this.ksx === 1 && this.ksy === 1) return;
    const py = a.y - a.z - a.height * this.pivot;
    g.translate(a.x, py); g.rotate(this.rot); g.scale(this.ksx, this.ksy); g.translate(-a.x, -py);
  }
  draw(g, opts = {}) {
    const a = this.a;
    if (!this.rot && this.ksx === 1 && this.ksy === 1) { a.draw(g, opts); return; }
    // the ring stays flat on the floor while the body turns
    if (opts.ring) a._drawRing(g, opts.ring, a.scale, opts.alpha ?? 1);
    g.save(); this.transform(g); a.draw(g, { ...opts, ring: null, shadow: false }); g.restore();
  }
  /** Mirror-floor reflection, clipped to the floor below floorY. */
  drawReflection(g, floorY, clipRect, alpha = 0.26) {
    const a = this.a;
    g.save();
    g.beginPath(); g.rect(clipRect.x, floorY, clipRect.w, clipRect.y + clipRect.h - floorY); g.clip();
    g.translate(0, 2 * a.y); g.scale(1, -1);
    this.transform(g);
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
    // The gentle making clock (the play scene draws its last 40 s). At 0 it asks the goal question:
    // Go! (the default) starts the show, the stay choice adds a minute.
    api.limit(() => (this.phase === 'make' && !this.cpuOnly ? Math.max(0, this.setupLeft) : null), {
      showAt: 40, x: this.n <= 2 ? W / 2 + 520 : W / 2 + 470, y: 56,
      timeUp: { goal: true, title: 'Showtime!', goLabel: 'Go!', moreLabel: 'A little more practice', more: () => { this.setupLeft = Math.max(0, this.setupLeft) + 60; }, done: () => this.startShow() },
    });
    sfx('magic'); snd('jingle/round', null, { vol: 0.7 });
  }

  makeStation(p, i, r) {
    const L = layoutStation(r);
    const a = new Actor(p, { facing: 1 });
    const d = new Dancer(a);
    const st = {
      p, i, r, L, actor: a, dancer: d, tab: 0,
      // lights start on a colour (None is there to pick)
      stage: randInt(0, STAGES.length - 1), music: randInt(0, MUSIC.length - 1), light: randInt(1, LIGHTS.length - 1),
      ready: false, readyT: 0, palBump: 0, tabBump: 0, hintT: 0, hintMsg: '', cheerCD: 0,
      tileBump: {}, pvBeat: 0, pvPulse: 0, pvLast: -1, ai: null, aiStick: 0,
      counts: {}, onBeats: 0, wooCD: 0,
    };
    this.placeStationActor(st);
    if (p.isAI) this.planAI(st);
    return st;
  }

  placeStationActor(st) {
    const pv = st.L.preview, a = st.actor, d = st.dancer;
    a.scale = 1;
    const w1 = Math.max(1, a.width);
    a.scale = Math.min((pv.h * 0.5) / a.leader.h, (pv.w * 0.5) / w1);
    d.hx = pv.x + pv.w / 2; d.hy = pv.y + pv.h * 0.86;
    a.x = d.hx; a.y = d.hy; a.snap();
  }

  // --- setup ----------------------------------------------------------------------
  listFor(tab) { return tab === 'music' ? MUSIC : tab === 'lights' ? LIGHTS : STAGES; }
  keyFor(tab) { return tab === 'music' ? 'music' : tab === 'lights' ? 'light' : 'stage'; }

  setTab(st, i) {
    i = clamp(i, 0, TABS.length - 1);
    if (i === st.tab) return;
    st.tab = i; st.tabBump = 0.2; sfx('move');
  }

  changeOption(st, dx, dy) {
    const tab = TABS[st.tab].id, list = this.listFor(tab), key = this.keyFor(tab);
    const cur = st[key], rows = Math.ceil(list.length / OPT_COLS);
    let col = cur % OPT_COLS, row = Math.floor(cur / OPT_COLS);
    if (dx) col = mod(col + dx, OPT_COLS);
    if (dy) row = mod(row + dy, rows);
    const ni = Math.min(list.length - 1, row * OPT_COLS + col);
    if (ni === cur) return;
    this.setOption(st, key, list, ni);
  }

  setOption(st, key, list, ni) {
    st[key] = ni; st.palBump = 0.18;
    sfx('swap', { vol: 0.6 });
    const pv = st.L.preview, o = list[ni];
    particles.burst(pv.x + pv.w / 2, pv.y + pv.h * 0.3, { type: o.none ? 'smoke' : 'sparkle', count: 8, colors: [o.color || o.colors?.[0] || '#fff', '#ffffff'] });
    if (st.cheerCD <= 0 && !st.dancer.busy) { st.actor.playOnce('cheer', 0.4, 'idle'); st.cheerCD = 0.8; }
    // let humans hear the song they just picked
    if (key === 'music' && !st.p.isAI) music.play(MUSIC[ni].id, { fadeIn: 0.4 });
  }

  setReady(st, on) {
    st.ready = on; st.readyT = 0;
    if (on) {
      sfx('ready'); st.actor.playOnce('ready', 0.6, 'idle'); st.actor.squash(-0.25);
      const pv = st.L.preview;
      particles.burst(pv.x + pv.w / 2, pv.y + pv.h * 0.5, { type: 'confetti', count: 26, speed: [200, 500] });
      st.actor.say('Ready!', 1.3, st.p.isAI ? null : 'ready');
    } else sfx('back');
  }

  /** A dance button in the setup: the move right there on the mini stage. */
  practise(st, i) {
    const M = DANCES[i];
    st.dancer.perform(i, 60 / MUSIC[st.music].bpm);
    moveSound(M, st.p.isAI ? 0.25 : 0.45);
    st.tileBump[M.btn] = 0.3;
    const a = st.actor;
    particles.burst(a.x, a.y - a.height * 0.6, { type: 'sparkle', count: 6, colors: [M.color, '#ffffff'], speed: [80, 220] });
    st.counts[M.id] = (st.counts[M.id] || 0) + 1;
  }

  updateStationInput(st) {
    const c = st.p.ctrl, tab = TABS[st.tab].id;
    if (st.ready) {
      if (c.pressed('b')) { this.setReady(st, false); return; }
      // waiting friends can keep practising
      for (const i of SETUP_DANCES) if (DANCES[i].btn !== 'b' && c.pressed(DANCES[i].btn)) { this.practise(st, i); break; }
      return;
    }
    const tabStep = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
    if (tabStep) { this.setTab(st, st.tab + tabStep); return; }
    // A on Done: I'm ready! Everywhere else A (and X, B, Y, LT, RT) is a dance move.
    if (tab === 'done' && c.pressed('a')) { this.setReady(st, true); return; }
    for (const i of SETUP_DANCES) if (c.pressed(DANCES[i].btn)) { this.practise(st, i); break; }
    if (tab !== 'done' && (c.nav.x || c.nav.y)) this.changeOption(st, c.nav.x, c.nav.y);
  }

  updatePreview(st, dt) {
    const bpm = MUSIC[st.music].bpm;
    // in step with the song when it's this station's song that is playing
    if (audioRunning() && music.name === MUSIC[st.music].id && music.song) st.pvBeat = music.beat();
    else st.pvBeat += (dt * bpm) / 60;
    const b = Math.floor(st.pvBeat);
    if (b !== st.pvLast) { st.pvLast = b; st.pvPulse = 1; }
    st.pvPulse = Math.max(0, st.pvPulse - dt * 3);
  }

  // --- CPU set dressers -----------------------------------------------------------
  planAI(st) {
    st.ai = {
      stage: randInt(0, STAGES.length - 1), music: randInt(0, MUSIC.length - 1),
      light: chance(0.1) ? 0 : randInt(1, LIGHTS.length - 1),
      t: rand(0.8, 1.8), tries: randInt(2, 5),
    };
  }

  updateAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai;
    if (st.aiStick > 0) { st.aiStick -= dt; if (st.aiStick <= 0) c.move(0, 0); }
    if (st.ready) return;
    ai.t -= dt;
    if (ai.t > 0) return;
    const hurry = !this.cpuOnly && this.stations.every((s) => s.ready || s.p.isAI);
    ai.t = rand(0.25, 0.5) / aiProfile(st.p).speed * (hurry ? 0.5 : 1);
    const tap = (x, y) => { c.move(x, y); st.aiStick = 0.05; };
    const tab = TABS[st.tab].id;
    // now and then a CPU tries a move out on its mini stage
    if (tab !== 'done' && ai.tries > 0 && !st.dancer.busy && chance(0.3)) {
      ai.tries--; c.press(DANCES[pick(SETUP_DANCES)].btn); ai.t += rand(0.4, 0.9); return;
    }
    if (tab === 'done') { c.press('a'); return; }
    const key = this.keyFor(tab), want = ai[key], cur = st[key];
    if (cur === want) { c.press('rb'); ai.t += rand(0.3, 0.7); return; }
    const dr = Math.floor(want / OPT_COLS) - Math.floor(cur / OPT_COLS), dc = (want % OPT_COLS) - (cur % OPT_COLS);
    if (dr) tap(0, Math.sign(dr)); else tap(Math.sign(dc), 0);
    ai.t += rand(0.1, 0.3);
  }

  // --- main update ----------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.phase === 'make') this.updateMake(dt);
    else this.updateShow(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    for (const st of this.stations) st.dancer.update(dt, 0);
  }

  updateMake(dt) {
    const cam = this.api.camera;
    if (cam) cam.follow(W / 2, H / 2, 1, 8);
    if (!this.cpuOnly) this.setupLeft = Math.max(0, this.setupLeft - dt);   // waits at 0 for "Time's up!"
    for (const st of this.stations) {
      if (st.p.isAI) this.updateAI(st, dt);
      st.palBump = Math.max(0, st.palBump - dt); st.tabBump = Math.max(0, st.tabBump - dt);
      st.hintT = Math.max(0, st.hintT - dt); st.cheerCD -= dt; st.readyT += dt;
      for (const k in st.tileBump) st.tileBump[k] = Math.max(0, st.tileBump[k] - dt);
      this.updateStationInput(st);
      this.updatePreview(st, dt);
      // the setup is for trying moves: the dancer stays on her spot
      st.dancer.update(dt, st.pvBeat);
    }
    const allReady = this.stations.every((s) => s.ready && s.readyT > 0.7);
    if (allReady) this.startShow();
  }

  // =================================================================================
  // The show: everyone dances at once, each player's stage / music / lights in turn.
  startShow() {
    if (this.phase !== 'make') return;
    this.phase = 'show'; this.phaseT = 0;
    const n = this.n;
    this.order = this.stations.slice();
    this.segBeats = n === 1 ? 80 : n === 2 ? 48 : n <= 4 ? 32 : 16;
    this.seg = -1;
    this.stage = { sub: 'intro', t: 0, curtain: 0, ballY: -120, pulse: 0, beat: 0, power: 0.4, hype: 0 };
    this.backdrop = { cur: this.order[0].stage, prev: null, fade: 1 };
    this.lightIdx = this.order[0].light;
    this.clock = { key: null, bpm: 120, own: 0, last: -99 };
    // everyone in a row across the stage
    const sp = Math.min(330, (STAGE_X1 - STAGE_X0) / Math.max(1, n));
    this.stations.forEach((st, k) => {
      const a = st.actor, d = st.dancer;
      a.say(null); a.clearEmotes();
      d.mv = null; d.rot = 0; d.dx = 0; d.extraZ = 0;
      a.setPose('idle');
      const s0 = a.scale; a.scale = 1; const w1 = Math.max(1, a.width); a.scale = s0;
      st.baseScale = Math.min((n <= 3 ? 330 : n <= 5 ? 280 : 240) / a.leader.h, (sp * 1.1) / w1);
      d.hx = W / 2 + (k - (n - 1) / 2) * sp; d.hy = 870 + (k % 2) * (n > 4 ? 50 : 0);
      d.baseFacing = d.hx < W / 2 ? 1 : -1; a.facing = d.baseFacing;
      d.canTravel = true; d.minX = STAGE_X0; d.maxX = STAGE_X1;
      a.scale = this.depthScale(st, d.hy); a.x = d.hx; a.y = d.hy; a.snap();
      st.ready = true; st.tileBump = {}; st.wooCD = 0;
      st.wander = { x: d.hx, y: d.hy, t: rand(0.5, 2) };
      if (st.p.isAI) { st.p.ctrl.reset?.(); st.p.ctrl.move?.(0, 0); }
    });
    music.stop(0.6);
    sfx('drumroll');
    snd('crowd-ooh', null, { vol: 0.5 });
  }

  /** Further back on the stage = a little smaller. */
  depthScale(st, y) { return st.baseScale * lerp(0.86, 1.08, clamp((y - STAGE_Y0) / (STAGE_Y1 - STAGE_Y0), 0, 1)); }

  get owner() { return this.order[Math.max(0, this.seg)]; }

  beginSegment(i) {
    this.seg = i;
    const st = this.order[i], S = this.stage;
    S.sub = 'dance'; S.segT = 0; S.power = Math.max(S.power, 0.5);
    if (i > 0 || this.backdrop.cur !== st.stage) this.backdrop = { cur: st.stage, prev: this.backdrop.cur, fade: 0 };
    this.lightIdx = st.light;
    const key = MUSIC[st.music].id, bpm = MUSIC[st.music].bpm;
    music.play(key, { fadeIn: 0.5 });
    this.clock = { key, bpm, own: 0, last: -1 };
    this.segLen = (this.segBeats * 60) / bpm;
    sfx('whoosh'); if (i > 0) sfx('magic', { vol: 0.5 });
    this.bannerT = 0;
    const a = st.actor;
    a.say(pick(['My stage!', 'My song!', "Let's dance!", 'Here we go!']), 1.2, st.p.isAI ? null : 'ready');
    particles.burst(a.x, a.y - a.height * 0.6, { type: 'star', count: 10, speed: [150, 360] });
  }

  /** Beats into this song. */
  beatNow(dt) {
    const c = this.clock;
    c.own += (dt * c.bpm) / 60;
    if (audioRunning() && music.name === c.key && music.song) c.own = music.beat();
    return c.own;
  }

  updateShow(dt) {
    const S = this.stage, cam = this.api.camera;
    S.t += dt;
    S.pulse = Math.max(0, S.pulse - dt * 2.5);
    this.backdrop.fade = Math.min(1, this.backdrop.fade + dt * 1.6);
    if (this.bannerT !== undefined) this.bannerT += dt;
    const beat = this.beatNow(dt);
    S.beat = beat;
    switch (S.sub) {
      case 'intro': {
        S.curtain = clamp((S.t - 0.6) / 1.6, 0, 1);
        S.ballY = lerp(-120, 175, ease.outBack(clamp((S.t - 0.3) / 1.4, 0, 1)));
        S.power = lerp(0.3, 1, S.curtain);
        if (S.t > 0.6 && S.t - dt <= 0.6) { snd('ds-curtain', 'whoosh'); snd('applause', 'cheer', { vol: 0.6 }); }
        if (S.t >= 2.6) this.beginSegment(0);
        for (const st of this.stations) { this.updateStageDancer(st, dt, false); st.dancer.update(dt, beat); }
        break;
      }
      case 'dance': {
        S.power = Math.min(1, S.power + dt * 0.9);
        S.segT += dt;
        const b = Math.floor(beat);
        if (b !== this.clock.last) { this.clock.last = b; S.pulse = 0.7; this.onShowBeat(b); }
        for (const st of this.stations) { this.updateStageDancer(st, dt, true); st.dancer.update(dt, beat); }
        const last = this.seg + 1 >= this.order.length;
        if (last) {
          const left = this.segLen - S.segT;
          for (let d = FREEZE_COUNT; d >= 1; d--) if (left <= d && left + dt > d) sfx(d === 1 ? 'tock' : 'tick');
        }
        if (S.segT >= this.segLen) { if (last) this.freeze(); else this.beginSegment(this.seg + 1); }
        break;
      }
      case 'photo': {
        this.photoT += dt;
        for (const st of this.stations) st.dancer.update(dt, 0);
        if (this.photoT >= PHOTO_T && !this.finished) this.finishGame();
        break;
      }
      default: break;
    }
    if (cam && !cam.punchState) cam.follow(W / 2, H / 2, 1, 3);
  }

  /** CPUs dance on the beat (now and then), and the stage pulses. */
  onShowBeat(b) {
    for (const st of this.stations) {
      if (!st.p.isAI || st.dancer.busy) continue;
      const keen = 0.32 * clamp(aiProfile(st.p).speed, 0.6, 1.4);
      if (chance(keen)) this.danceMove(st, pick(SHOW_DANCES), true);
    }
    if (b % 8 === 0 && b > 0) particles.burst(W / 2, 200, { type: 'confetti', count: 16, speed: [160, 420] });
  }

  /** The stick walks a dancer about the stage (CPUs wander); dance buttons do moves. */
  updateStageDancer(st, dt, live) {
    const a = st.actor, d = st.dancer, c = st.p.ctrl;
    st.wooCD = Math.max(0, st.wooCD - dt);
    for (const k in st.tileBump) st.tileBump[k] = Math.max(0, st.tileBump[k] - dt);
    let mx = 0, my = 0;
    if (live) {
      if (st.p.isAI) {
        const w = st.wander;
        w.t -= dt;
        if (w.t <= 0) {
          w.t = rand(1.2, 3.2);
          if (chance(0.6)) { w.x = clamp(d.hx + rand(-380, 380), STAGE_X0 + 40, STAGE_X1 - 40); w.y = rand(STAGE_Y0 + 10, STAGE_Y1 - 10); }
        }
        const ex = w.x - d.hx, ey = w.y - d.hy, dist = Math.hypot(ex, ey);
        if (dist > 24) { mx = (ex / dist) * 0.6; my = (ey / dist) * 0.6; }
      } else {
        const m = photoMove(c);
        mx = Math.abs(m.x) > 0.2 ? m.x : 0; my = Math.abs(m.y) > 0.2 ? m.y : 0;
        for (const i of SHOW_DANCES) if (c.pressed(DANCES[i].btn)) { this.danceMove(st, i, false); break; }
      }
    }
    const slow = d.busy ? 0.45 : 1;
    d.hx = clamp(d.hx + mx * 540 * slow * dt, STAGE_X0, STAGE_X1);
    d.hy = clamp(d.hy + my * 300 * slow * dt, STAGE_Y0, STAGE_Y1);
    a.scale = damp(a.scale, this.depthScale(st, d.hy), 10, dt);
    const moving = Math.hypot(mx, my) > 0.15;
    if (moving && Math.abs(mx) > 0.15 && !d.busy) { d.baseFacing = mx > 0 ? 1 : -1; a.facing = d.baseFacing; }
    if (!d.busy && !a._once) a.setPose(moving ? 'walk' : 'idle');
    st.moving = moving;
  }

  /** A move in the show: sparkles, and on the beat a bigger burst and the crowd cheering. */
  danceMove(st, i, cpu) {
    const M = DANCES[i], d = st.dancer, a = st.actor, S = this.stage;
    d.perform(i, 60 / this.clock.bpm);
    moveSound(M, cpu ? 0.22 : 0.45);
    st.tileBump[M.btn] = 0.3;
    st.counts[M.id] = (st.counts[M.id] || 0) + 1;
    const off = Math.abs(S.beat - Math.round(S.beat));
    const top = { x: a.x, y: a.y - a.height * 0.7 };
    if (off < 0.2 || cpu) {
      st.onBeats++;
      S.hype += cpu ? 0.5 : 1;
      particles.burst(top.x, top.y, { type: pick(['star', 'sparkle', 'note']), count: 10, colors: [M.color, st.p.color, '#ffffff'], speed: [140, 360] });
      if (!cpu && st.wooCD <= 0) { particles.popText(top.x, top.y - 50, pick(CHEERS), M.color, 40); st.wooCD = 1.2; }
      if (S.hype >= 8) {
        S.hype = 0; S.pulse = 1;
        snd('applause', 'cheer', { vol: 0.45 });
        particles.burst(W / 2, 180, { type: 'confetti', count: 24, speed: [200, 480] });
      }
    } else particles.burst(top.x, top.y, { type: 'sparkle', count: 5, colors: [M.color, '#ffffff'], speed: [80, 200] });
  }

  // --- Freeze! photo ----------------------------------------------------------------
  freeze() {
    const S = this.stage;
    if (S.sub === 'photo') return;
    S.sub = 'photo'; S.t = 0; this.photoT = 0;
    music.stop(0.15);
    for (const st of this.stations) { st.dancer.extraZ = 0; }
    this.photo = this.snapshot();
    fx.flash('#ffffff', 0.45);
    if (hasSound('camera-flash')) sfx('camera-flash', { vol: 0.7 }); else sfx('shutter');
    sfx('fanfare'); snd('applause', 'cheer');
    particles.confettiRain(W, 140);
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
      const top = Object.entries(st.counts).sort((a, b) => b[1] - a[1])[0];
      const where = STAGES[st.stage].name;
      if (!top) return where;
      const M = DANCES.find((m) => m.id === top[0]);
      return `${M.name} ×${top[1]} · ${where}`;
    });
    this.api.finishTogether({ stats, title: 'What a show!', focus: { x: W / 2, y: 700 } });
  }

  onDone() {
    if (this.phase === 'make') { this.startShow(); return; }
    if (this.stage.sub === 'photo') this.finishGame(); else this.freeze();
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

  // --- setup ------------------------------------------------------------------------
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
    if (this.n <= 2) ui.hints(g, [['lb', ''], ['rb', 'Steps']], 230, 56, { size: 34 });
  }

  drawStation(g, st) {
    const { r, p } = st;
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
    if (tab === 'done') this.drawDonePanel(g, st);
    else this.drawOptions(g, st, tab);
    this.drawDancePad(g, st.L.dancePad, st, SETUP_DANCES, { done: tab === 'done' && !st.ready });
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
      const sel = ti === st.tab, done = ti < st.tab;
      const bx = x0 + ti * tw + 3, bw = tw - 6, by = r.y + 10 + (sel ? 0 : 5), bh = L.tabH - (sel ? 0 : 6);
      if (tab.id === 'done') { drawDoneTab(g, bx, by, bw, bh, { sel, bump: st.tabBump }); return; }
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
    // the move's name while it plays
    const M = st.dancer.mv;
    if (M) ui.text(g, M.name, pv.x + pv.w / 2, pv.y + pv.h * 0.2, { size: cs * (0.95 + Math.max(0, 0.3 - st.dancer.u) * 0.8), color: M.color, maxWidth: pv.w - 20 });
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

  drawOptions(g, st, tab) {
    const R = st.L.palette, labelH = clamp(R.h * 0.12, 22, 50);
    const list = this.listFor(tab), cur = st[this.keyFor(tab)];
    const title = tab === 'music' ? 'Pick the music' : tab === 'lights' ? 'Pick the lights' : 'Pick a stage';
    ui.text(g, title, R.x + R.w / 2, R.y + labelH * 0.45, { size: labelH * 0.62, color: '#ffffff', maxWidth: R.w - 10 });
    const G = this.grid(R, list.length, OPT_COLS, labelH);
    list.forEach((o, i) => {
      const c = G.cell(i), on = i === cur;
      const w = c.w - 8, h = c.h - 8;
      g.save(); g.translate(c.x + c.w / 2, c.y + c.h / 2);
      const k = on ? 1.05 + st.palBump * 0.5 : 1; g.scale(k, k);
      g.save(); ui.roundRect(g, -w / 2, -h / 2, w, h, 14); g.clip();
      const ih = h - Math.max(16, h * 0.3);
      if (tab === 'stage') drawBackdrop(g, o.id, -w / 2, -h / 2, w, ih, this.t);
      else if (tab === 'lights') {
        g.fillStyle = '#2a1840'; g.fillRect(-w / 2, -h / 2, w, ih);
        if (o.none) drawNoneIcon(g, 0, -h / 2 + ih / 2, Math.min(w, ih) * 1.1);
        else drawLights(g, o, -w / 2, -h / 2, w, ih, this.t, this.t * 2, 0, 1.4);
      } else this.drawMusicIcon(g, o, -w / 2, -h / 2, w, ih, on);
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
    const light = LIGHTS[st.light];
    const lines = [
      ['Stage', STAGES[st.stage].name, STAGES[st.stage].color],
      ['Music', MUSIC[st.music].name, MUSIC[st.music].color],
      ['Lights', light.name, light.none ? '#9a8fb8' : light.colors[0]],
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

  /** The dance buttons: one tile per button with its move's picture and name; lit while it plays.
   *  done: on the Done tab the A tile says "Ready!" instead. */
  drawDancePad(g, R, st, list, { done = false, glass = false } = {}) {
    const n = list.length, gap = Math.max(4, R.w * 0.012);
    g.save();
    ui.roundRect(g, R.x - 4, R.y - 4, R.w + 8, R.h + 8, 16); g.fillStyle = glass ? 'rgba(36,22,63,0.7)' : 'rgba(36,22,63,0.82)'; g.fill();
    if (glass) { g.lineWidth = 4; g.strokeStyle = st.p.color; g.stroke(); }
    g.restore();
    const tw = Math.min((R.w - gap * (n + 1)) / n, R.h * 1.05), x0 = R.x + (R.w - (tw * n + gap * (n - 1))) / 2;
    const nameH = clamp(tw * 0.2, 12, 24), th = Math.min(R.h - 8, tw + nameH);
    const playing = st.dancer.mv;
    list.forEach((i, k) => {
      const M = DANCES[i], x = x0 + k * (tw + gap), y = R.y + (R.h - th) / 2;
      const on = playing === M, bump = st.tileBump[M.btn] || 0, ready = done && M.btn === 'a';
      const s = Math.min(tw, th - nameH);
      g.save(); g.translate(x + tw / 2, y + s / 2);
      const kk = 1 + bump * 0.5; g.scale(kk, kk);
      g.fillStyle = on ? '#ffffff' : '#fff8ec'; g.strokeStyle = on ? st.p.color : NAVY; g.lineWidth = on ? 5 : 2.5;
      ui.roundRect(g, -s / 2, -s / 2, s, s, s * 0.16); g.fill(); g.stroke();
      if (ready) {
        g.fillStyle = '#36d17a'; ui.roundRect(g, -s / 2 + 4, -s / 2 + 4, s - 8, s - 8, s * 0.13); g.fill();
        ui.text(g, 'Ready!', 0, s * 0.08, { size: s * 0.22, maxWidth: s - 10 });
      } else {
        g.fillStyle = rgba(M.color, on ? 0.5 : 0.3); ui.roundRect(g, -s / 2 + 4, -s / 2 + 4, s - 8, s - 8, s * 0.13); g.fill();
        drawMovePicto(g, M, 0, s * 0.06, s * 0.82, this.t, on);
      }
      g.restore();
      ui.glyph(g, M.btn, x + s * 0.17 + (tw - s) / 2, y + s * 0.17, clamp(s * 0.3, 18, 40));
      ui.text(g, ready ? "I'm ready" : M.name, x + tw / 2, y + s + nameH * 0.55, { size: nameH, color: on ? '#fff6a8' : '#ffffff', strokeWidth: 4, maxWidth: tw + gap - 2 });
    });
  }

  drawStationHints(g, st) {
    const { r, L } = st, n = this.n;
    if (st.ready) return;
    const tab = TABS[st.tab].id, small = n > 4, mid = n > 2;
    let list;
    if (tab === 'done') list = [['a', "I'm ready!"], ['lb', 'Back']];
    else list = small ? [['stick', 'Pick'], ['rb', 'Next']] : [['stick', 'Pick'], ['rb', 'Next'], ['x', 'Buttons: dance!']];
    const size = small ? 26 : mid ? 30 : 36;
    ui.hints(g, list, r.x + r.w / 2, L.hintY, { size, gap: small ? 16 : 26 });
    if (st.hintT > 0) ui.text(g, st.hintMsg, r.x + r.w / 2, L.dancePad.y - 16, { size: small ? 18 : 24, color: '#ffd23f', maxWidth: r.w - 20 });
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
    if (B.prev !== null && B.fade < 1) drawBackdrop(g, STAGES[B.prev].id, 0, 0, W, FLOOR_Y, t);
    g.save(); g.globalAlpha = B.prev === null ? 1 : B.fade;
    drawBackdrop(g, STAGES[B.cur].id, 0, 0, W, FLOOR_Y, t);
    g.restore();
    // dim the stage while the lights are low
    const power = S.power;
    if (power < 1) { g.fillStyle = `rgba(20,10,40,${(1 - power) * 0.55})`; g.fillRect(0, 0, W, H); }
    drawLights(g, light, 0, 0, W, H * 0.95, t, S.beat, S.pulse, power);
    drawFloor(g, 0, FLOOR_Y, W, H - FLOOR_Y, light, t);
    const all = { x: 0, y: 0, w: W, h: H };
    const sorted = this.stations.slice().sort((a, b) => a.actor.y - b.actor.y);
    for (const st of sorted) st.dancer.drawReflection(g, FLOOR_Y, all, 0.22);
    for (const st of sorted) {
      st.dancer.draw(g, { ring: st.p.color, emotes: !forPhoto });
      if (!forPhoto && this.seg >= 0 && st === this.owner && S.sub === 'dance' && this.n > 1) this.drawCrownSparkle(g, st);
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
    const S = this.stage;
    if (S.sub === 'intro') {
      if (S.t > 0.8) ui.banner(g, 'Showtime!', S.t - 0.8, { y: 330, size: 150, color: '#ffd23f' });
      if (S.t > 1.4) this.drawTags(g, 40);
      return;
    }
    if (S.sub === 'dance') {
      this.drawStageCard(g);
      this.drawProgress(g);
      if (S.segT < 3 && this.seg === 0) this.drawTags(g, 40);
      if (this.seg === 0 && S.segT > 0.6 && S.segT < 2.6) ui.banner(g, "Let's dance!", S.segT - 0.6, { y: 420, size: 120, color: '#ff6fb1' });
      // every human's dance buttons along the bottom
      const humans = this.stations.filter((s) => !s.p.isAI);
      if (humans.length) {
        const st = humans[0], w = Math.min(1100, W - 120), h = 104;
        const R = { x: W / 2 - w / 2, y: H - h - 18, w, h };
        this.drawDancePad(g, R, st, SHOW_DANCES, { glass: true });
        ui.hints(g, [['stick', 'Move']], R.x - 4, R.y - 28, { size: 30, align: 'left' });
      }
      const last = this.seg + 1 >= this.order.length, left = this.segLen - S.segT;
      if (last && left <= FREEZE_COUNT) {
        const nn = Math.max(1, Math.ceil(left)), f = 1 - (left - (nn - 1));
        g.save(); g.translate(W / 2, 360); g.scale(1 + f * 0.4, 1 + f * 0.4); g.globalAlpha = 1 - f * 0.6;
        ui.text(g, String(nn), 0, 0, { size: 200, color: '#ffd23f', strokeWidth: 12 }); g.restore();
        ui.text(g, 'Get ready to freeze!', W / 2, 500, { size: 54, color: '#ff6fb1' });
      }
    }
    if (S.sub === 'photo') this.drawPhoto(g);
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

  /** "<Name>'s stage!": big when it changes over, then small in the corner. */
  drawStageCard(g) {
    const st = this.owner, bt = this.bannerT || 0;
    const k = bt < 0.4 ? ease.outBack(bt / 0.4) : 1;
    const big = bt < 2.2;
    g.save(); g.translate(big ? W / 2 : 400, big ? 300 : 150); g.scale(k * (big ? 1 : 0.6), k * (big ? 1 : 0.6));
    const w = 760, h = 120;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 60, fill: st.p.color, lineWidth: 7 });
    drawPortrait(g, st.p, -w / 2 + 62, 0, 50, { ring: '#ffffff' });
    ui.fitText(g, this.n === 1 ? 'Your show!' : `${playerName(st.p)}'s stage!`, 34, -4, { size: 54, maxWidth: w - 170, color: '#ffffff' });
    g.restore();
    if (big) {
      const L = LIGHTS[st.light];
      const info = `${STAGES[st.stage].name}  ·  ${MUSIC[st.music].name}  ·  ${L.none ? 'No lights' : L.name}`;
      ui.text(g, info, W / 2, 392, { size: 36, color: '#fff6a8', maxWidth: 1100 });
    }
  }

  /** How far through the show we are: one bead per player's song. */
  drawProgress(g) {
    const S = this.stage, n = this.order.length, w = Math.min(560, 140 * n), x0 = W - 140 - w, y = 150;
    g.save();
    ui.roundRect(g, x0 - 14, y - 22, w + 28, 44, 22); g.fillStyle = 'rgba(36,22,63,0.7)'; g.fill();
    const sw = w / n;
    this.order.forEach((st, i) => {
      const f = i < this.seg ? 1 : i > this.seg ? 0 : clamp(S.segT / this.segLen, 0, 1);
      ui.roundRect(g, x0 + i * sw + 3, y - 9, sw - 6, 18, 9); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fill();
      if (f > 0) { ui.roundRect(g, x0 + i * sw + 3, y - 9, Math.max(18, (sw - 6) * f), 18, 9); g.fillStyle = st.p.color; g.fill(); }
    });
    g.restore();
    ui.text(g, '♪', x0 - 40, y, { size: 40, color: '#fff6a8' });
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
