// Dance Along (Sister Party; id opposite-ballet, which used to be Opposite Ballet).
// Madame Papillon, the prim butterfly-fairy ballet teacher, leads a dance class on
// the flower stage. Everyone dances about the floor however they like (the stick
// walks them; every button is a dance move, the same eight moves as Dance Studio:
// A star jump, B hula, X disco, Y twirl, LT cartwheel, RT can-can, LB splits, RB
// moonwalk). Every few bars Madame calls a move - a big picture card, the button
// to press and her own demo of it: doing that move while it's called earns
// butterflies (more on the beat, more on a golden call). Any other move is just
// as welcome: cheers, sparkles, a "New move!" butterfly the first time, and
// Madame enjoying it - never a "wrong" sound.
// Sister Easy: A does whatever move Madame is calling (so mashing A follows her
// every time and scores); the other buttons still do their own moves; the stick
// is optional. Halfway she sneezes her wig off in a butterfly storm (gift
// butterflies for everyone); the last stretch is a free-dance finale where any
// move counts; then a bow. No losers: it ends on the stage (gallery ending) with
// everyone's stars, the top scorer crowned Star Dancer.
import { W, H } from '../engine/canvas.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound, music, audioRunning } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { art, drawArt } from '../engine/art.js';
import { outfitItem } from '../engine/outfits.js';
import { aiProfile } from '../engine/ai.js';
import { easyPrompt } from '../engine/easy.js';
import { Dancer } from '../engine/dance.js';
import { playerName } from '../state.js';
import { clamp, lerp, damp, rand, pick, chance, TAU, ease, later, showstopper } from '../engine/util.js';
import { DANCES, drawMovePicto } from './dance-studio/stage.js';
import {
  NAVY, BFLY, drawButterfly, drawPetal, drawTeacher, drawTiara, drawImp, drawTutu, wantsTutu, drawStageBg,
} from './opposite-ballet/art.js';
import { drawShock } from '../engine/fluster.js';
import { meta } from './opposite-ballet.meta.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const PLAY_TIME = 72;          // seconds of dancing, then the bow
const STORM_AT = 34;           // Madame sneezes her wig off in a butterfly storm
const FINALE_AT = 60;          // free-dance finale: any move counts
const FINALE_CAP = 4;          // butterflies a dancer can earn in the finale
const BOW_LEN = 3.6;
const CALL_BEATS = 8;          // a call lasts two bars...
const GRACE = 0.9;             // ...and still counts this long into the next one
const MAX_FLOCK = 14;          // butterflies drawn per dancer (the score keeps counting)
const TEACHER = { x: 960, y: 700, h: 370 };
const CARD = { x: 1430, y: 330, s: 290 };
const HINT = { x: 420, y: 330 };
const FLOOR = { x0: 150, x1: W - 150, y0: 750, y1: 1000 };
const MOVE = Object.fromEntries(DANCES.map((m) => [m.id, m]));
const FACE = ['star', 'hula', 'disco', 'twirl'];              // A B X Y: the calls from the start
const EXTRA = ['cartwheel', 'cancan', 'splits', 'moonwalk'];  // triggers / bumpers: later, now and then (Medium)
// Madame's demo of each move with the art she has (her own dance art, requested as
// prop/oballet-teacher-<id>, is used the moment it lands), plus the motion that sells it.
const TEACH = {
  disco: { pose: 'side', lean: -0.12 },
  star: { pose: 'up', hop: 0.16, art: 'starfish' },
  hula: { pose: 'silly', sway: 0.12 },
  twirl: { pose: 'twirl', hop: 0.04 },
  cartwheel: { pose: 'up', spin: true },
  cancan: { pose: 'side', kick: true },
  splits: { pose: 'plie', drop: 0.05 },
  moonwalk: { pose: 'side', glide: true },
};
const MOVE_NOTE = { disco: [72, 76, 79, 76], star: [72, 79, 84], hula: [67, 72, 67, 72], twirl: [72, 76, 79, 84], cartwheel: [60, 67, 72, 79], cancan: [79, 76, 79, 84], splits: [84, 79, 72, 60], moonwalk: [72, 70, 67, 65] };
const PRAISE = ['Très bien!', 'Magnifique!', 'Bravo!', 'Wonderful!', 'Oh là là, lovely!'];
const LIKE = ['Ooh, très chic!', 'How fancy!', 'Oh, I like that!', 'Lovely moves!', 'So graceful!'];
const CHEERS = ['Woo!', 'Pretty!', 'Wow!', 'Fancy!', 'So cool!', 'Yay!', 'Ooh!'];

const callName = (M) => (M.name.endsWith('!') ? M.name : M.name + '!');

function moveSound(M, vol = 0.45) {
  switch (M.sound) {
    case 'boing': snd('boing', 'bounce', { vol }); break;
    case 'sparkle': snd('ds-twirl', 'sparkle', { vol }); break;
    case 'whoosh': snd('ds-slide', 'whoosh', { vol }); break;
    default: sfx(M.sound, { vol });
  }
}

/** A move's card picture: Dance Studio's move pictograms (the twirl's is a pirouette). */
function drawCallPicto(g, M, x, y, s, t) {
  drawMovePicto(g, M, x, y, s, t, true);
}

export { meta };

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.easy = !!api.easy;     // Sister Easy: A dances the called move; the other buttons are their own moves
    const n = this.players.length;
    this.n = n;
    this.t = 0;          // animation clock
    this.time = 0;       // seconds since GO
    this.done = false;
    this.phase = 'class';  // class | finale | bow | end
    api.limit(() => (this.phase === 'bow' || this.phase === 'end' ? null : Math.max(0, PLAY_TIME - this.time)), { showAt: Infinity, x: W / 2, y: 58 });
    this.scores = this.players.map(() => 0);
    this.copied = this.players.map(() => 0);
    this.petals = [];
    this.swarm = [];
    this.stormT = -1;
    this.banner = null;  // { text, t, color, y, size }
    this.clock = { own: 0, last: -1 };
    this.beat = 0; this.pulse = 0;
    this.call = null;    // { M, golden, t, len, n }
    this.prev = null;    // the call before, still counting for GRACE s
    this.callN = 0;
    this.lastId = null;
    this.demo = null;    // Madame's demo: { M, t, dur, side }
    this.sproingT = 0;
    this.react = null; this.reactT = 0;
    this.say = null;     // { text, t, dur }
    this.likeCD = 0;
    this.tiara = null;   // { x, y, vx, vy, rot, orbit }
    this.wig = null;     // { x, y, vx, vy, rot, back }
    this.wigOff = false;
    this.classStreak = 0;
    this.imp = { show: 0 };
    this.star = null;    // the Star Dancer at the end (index), or null
    // start in a loose line across the floor (two staggered rows for more than 4)
    const two = n > 4, base = n <= 2 ? 1.25 : n <= 4 ? 1.1 : 0.94;
    const backN = two ? Math.ceil(n / 2) : n;
    this.dancers = this.players.map((p, i) => {
      const back = two && i < backN, row = two && !back ? i - backN : i, rowN = back || !two ? backN : n - backN;
      const span = Math.min(1300, Math.max(0, rowN - 1) * 430);
      const x = W / 2 + (rowN > 1 ? (row / (rowN - 1) - 0.5) * span : 0) + (two ? (back ? -90 : 90) : 0);
      const y = two ? (back ? 820 : 950) : 900;
      const a = new Actor(p, { scale: base, x, y, outfit: this.balletLook(p, i) });
      const minH = 130 * base;
      if (a.height < minH) a.scale *= minH / a.height;   // tiny avatars (fairies) stay readable
      const d = new Dancer(a);
      d.canTravel = true; d.minX = FLOOR.x0; d.maxX = FLOOR.x1;
      d.hx = x; d.hy = y;
      d.baseFacing = x < W / 2 ? 1 : -1; a.facing = d.baseFacing;
      a.x = x; a.y = y; a.snap();
      if (wantsTutu(p.charId)) {
        const col = BFLY[i % 4];
        a.char.members.forEach((def, mi) => a.attach((g, info) => drawTutu(g, def, info, col, this.t + i), { member: mi }));
      }
      return {
        p, i, a, d, baseScale: a.scale / this.depthK(y), flock: [], streak: 0, glowT: 0, popCD: 0,
        gotN: -1, tried: new Set(), queued: null, finalePts: 0,
        ai: p.isAI ? { wander: { t: rand(0.3, 1.2), x, y }, nextMove: rand(1.5, 3.5), plan: null } : null,
      };
    });
    // little fairies next to tall Charlie characters: nobody under 72% of the tallest dancer
    const tallest = Math.max(...this.dancers.map((d) => d.a.height));
    for (const d of this.dancers) {
      if (d.a.height < tallest * 0.72) { const k = (tallest * 0.72) / d.a.height; d.a.scale *= k; d.baseScale *= k; }
    }
    this.byIndex = [...this.dancers];
  }

  depthK(y) { return lerp(0.86, 1.08, clamp((y - FLOOR.y0) / (FLOOR.y1 - FLOOR.y0), 0, 1)); }

  /** The player's own look plus ballet wings and a crown on any free slot. */
  balletLook(p, i) {
    const look = (p.outfit || []).slice();
    const has = (slot) => look.some((e) => outfitItem(e.id)?.slot === slot);
    const wings = ['butterfly-wings', 'fairy-wings', 'petal-wings', 'butterfly-wings'][i % 4];
    if (!has('back') && outfitItem(wings)) look.push({ id: wings, colour: [0, 3, 2, 4, 1, 5, 7, 6][i % 8] });
    const crown = i % 2 ? 'flower-crown' : 'tiara';
    if (!has('head') && outfitItem(crown)) look.push({ id: crown, colour: [6, 0, 1, 2, 6, 4, 3, 0][i % 8] });
    return look;
  }

  // --- the music clock ----------------------------------------------------------
  get bpm() { return audioRunning() && music.song ? music.bpm : 120; }
  get beatLen() { return 60 / this.bpm; }
  tickBeat(dt) {
    const c = this.clock;
    c.own += (dt * this.bpm) / 60;
    if (audioRunning() && music.song) c.own = music.beat();
    this.beat = c.own;
    const b = Math.floor(c.own);
    if (b !== c.last) { c.last = b; this.pulse = 1; this.onBeat(b); }
    this.pulse = Math.max(0, this.pulse - dt * 3);
  }
  /** How far off the beat a move is (0 = right on it, 0.5 = between). */
  offBeat() { return Math.abs(this.beat - Math.round(this.beat)); }

  onBeat(b) {
    if (this.phase === 'finale') {
      if (b % 4 === 0) particles.burst(rand(300, W - 300), 160, { type: 'confetti', count: 14, speed: [160, 420] });
      if (b % 2 === 0) this.startDemo(pick(DANCES));
    }
    // Madame keeps dancing the called move on the beat, so it's always there to copy
    if (this.phase === 'class' && this.call && !this.demo && !this.reactT) this.startDemo(this.call.M);
  }

  // --- calls -------------------------------------------------------------------
  nextCall() {
    const k = this.callN;
    let M;
    const intro = ['star', 'twirl', 'hula'];
    if (k < intro.length) M = MOVE[intro[k]];
    else {
      const pool = this.easy || this.time > 25 && chance(0.3) ? (this.easy ? [...FACE, ...EXTRA] : EXTRA) : FACE;
      do { M = MOVE[pick(pool)]; } while (M.id === this.lastId);
    }
    const golden = k >= 4 && k % 5 === 4;
    this.lastId = M.id;
    this.prev = this.call;
    if (this.prev) this.prev.endAt = this.time;
    this.callN++;
    this.call = { M, golden, t: 0, len: (k === 0 ? CALL_BEATS + 2 : CALL_BEATS) * this.beatLen, n: k };
    (MOVE_NOTE[M.id] || [72, 76, 79]).forEach((m, i) => later(() => sfx('note', { midi: m, vol: 0.32 }), i * 80));
    snd('bb-cue', 'magic', { vol: 0.4 });
    particles.burst(CARD.x, CARD.y, { type: 'sparkle', count: 12, colors: [M.color, '#fff'], speed: [80, 260] });
    this.teacherSay(callName(M), 1.3);
    this.startDemo(M);
    if (golden) {
      snd('ob-golden', 'golden-chime', { vol: 0.6 });
      particles.burst(CARD.x, CARD.y, { type: 'star', count: 22, colors: ['#ffd23f', '#fff3b0', '#fff'], speed: [150, 420] });
      fx.flash('#fff3b0', 0.12);
      this.banner = { text: 'Golden move!', t: 0, color: '#ffd23f', y: 560, size: 100 };
    } else if (k === 0) this.banner = { text: 'Dance with me!', t: 0, color: '#ff7ac6', y: 560, size: 110 };
    for (const d of this.dancers) if (d.ai) d.ai.plan = this.planAI(d, this.call);
  }

  /** CPUs follow some calls (keener on harder settings), after a little look. */
  planAI(d, call) {
    const lvl = clamp(d.p.aiLevel ?? 0, 0, 2);
    if (!chance([0.55, 0.7, 0.85][lvl])) return null;
    return { at: rand(...[[1.0, 3.0], [0.7, 2.2], [0.45, 1.5]][lvl]), M: call.M };
  }

  endCall(c) {
    const followed = this.dancers.filter((d) => d.gotN === c.n).length;
    for (const d of this.dancers) if (d.gotN !== c.n) d.streak = 0;
    if (followed && followed >= this.n / 2) {
      this.classStreak++;
      if (!this.reactT) this.teacherSay(pick(PRAISE), 1.1);
      this.sproingT = 1;
      if (this.classStreak === 3 && !this.tiara) this.popTiara();
    } else this.classStreak = 0;
  }

  teacherSay(text, dur = 1.4) { this.say = { text, t: 0, dur }; }

  startDemo(M) { this.demo = { M, t: 0, dur: Math.max(1.0, M.beats * this.beatLen * 1.6), side: this.lastDemo === M && M.mirror ? -this.demoSide : 1 }; this.lastDemo = M; this.demoSide = this.demo.side; }

  popTiara() {
    this.tiara = { x: TEACHER.x + 6, y: TEACHER.y - TEACHER.h * 0.92, vx: 260, vy: -900, rot: 0, orbit: -1 };
    snd('ob-tiara', 'pop', { vol: 0.5 });
    particles.burst(this.tiara.x, this.tiara.y, { type: 'sparkle', count: 14, colors: ['#ffd23f', '#fff'], speed: [100, 300] });
    this.teacherSay('Oh! Such dancing!', 1.4);
    this.banner = { text: 'Her tiara popped off!', t: 0, color: '#ffd23f', y: 560, size: 86 };
  }

  // --- moves -------------------------------------------------------------------
  /** Buttons are moves; the stick (either stick, optional in Easy) dances you about the floor. */
  readInput(d) {
    const c = d.p.ctrl;
    let M = null;
    for (const m of DANCES) if (c.pressed(m.btn)) { M = m; break; }
    if (M && this.easy && M.btn === 'a') {
      // Easy: A dances whatever Madame is calling (or, between calls / in the finale, a star jump or a surprise)
      M = this.call && this.phase === 'class' ? this.call.M : this.phase === 'finale' ? pick(DANCES) : MOVE.star;
    }
    if (M) this.tryMove(d, M);
    let x = c.x, y = c.y;
    if (Math.hypot(x, y) < 0.25 && c.kind === 'pad') { x = c.sx || 0; y = c.sy || 0; }
    return { x: Math.abs(x) > 0.2 ? x : 0, y: Math.abs(y) > 0.2 ? y : 0 };
  }

  /** A press mid-move is kept for when the move is far enough along (mashing stays smooth). */
  tryMove(d, M) {
    if (this.phase === 'bow' || this.phase === 'end') return;
    if (d.d.busy && d.d.u < 0.55) { d.queued = M; return; }
    d.queued = null;
    this.danceMove(d, M);
  }

  danceMove(d, M) {
    const a = d.a, cpu = d.p.isAI;
    d.d.perform(M, this.beatLen);
    moveSound(M, cpu ? 0.22 : 0.45);
    const top = { x: a.x, y: a.y - a.height * 0.75 };
    const onBeat = this.offBeat() < 0.2;
    if (this.phase === 'finale') {
      if (d.finalePts < FINALE_CAP) { d.finalePts++; this.award(d, 1, M, onBeat ? 'On the beat! +1' : '+1'); }
      else this.cheer(d, M, onBeat);
      return;
    }
    if (this.phase !== 'class') return;
    // the called move (or the one just before, a moment into the next call)
    const c = this.call, p = this.prev;
    let hit = null;
    if (c && c.M === M && d.gotN !== c.n) hit = c;
    else if (p && p.M === M && d.gotN !== p.n && this.time - (p.endAt ?? 0) < GRACE && d.gotN < p.n) hit = p;
    if (hit) {
      d.gotN = hit.n;
      this.copied[d.i]++;
      d.tried.add(M.id);
      const pts = (hit.golden ? 3 : 2) + (onBeat ? 1 : 0);
      this.award(d, pts, M, hit.golden ? `Golden! +${pts}` : onBeat ? `On the beat! +${pts}` : `Yes! +${pts}`);
      d.streak++;
      if (d.streak % 3 === 0) this.streakParty(d);
      return;
    }
    if (!d.tried.has(M.id)) {
      // trying a new move is lovely too
      d.tried.add(M.id);
      this.award(d, 1, M, 'New move! +1');
      if (!cpu) this.like(M);
      return;
    }
    this.cheer(d, M, onBeat);
    if (!cpu && chance(0.3)) this.like(M);
  }

  /** Any move at all: sparkles and a happy word (never a "wrong"). */
  cheer(d, M, onBeat) {
    const a = d.a, top = { x: a.x, y: a.y - a.height * 0.75 };
    particles.burst(top.x, top.y, { type: pick(['star', 'sparkle', 'note']), count: onBeat ? 10 : 6, colors: [M.color, d.p.color, '#ffffff'], speed: [100, 300] });
    if (d.popCD <= 0) { particles.popText(top.x, top.y - 60, pick(CHEERS), M.color, 40); d.popCD = 1.1; }
  }

  /** Madame enjoys a move of your own (now and then). */
  like(M) {
    if (this.likeCD > 0 || this.reactT) return;
    this.likeCD = 4;
    this.teacherSay(M.id === 'cartwheel' ? 'A cartwheel! Ooh!' : M.id === 'moonwalk' ? 'Ooh, so smooth!' : pick(LIKE), 1.3);
    this.sproingT = 0.6;
  }

  streakParty(d) {
    const a = d.a;
    particles.burst(a.x, a.y - a.height * 0.6, { type: 'confetti', count: 30, speed: [200, 520] });
    particles.ring(a.x, a.y - a.height * 0.5, '#ffd23f', 220, 0.5);
    particles.popText(a.x, a.y - a.height - 120, 'Super streak!', '#ffd23f', 52);
    a.emote('hearts', 1.2);
    snd('bb-wow', 'star', { vol: 0.5 });
    if (!d.p.isAI) voice(d.p.charId, 'yay');
  }

  award(d, n, M, label) {
    const a = d.a, top = a.y - a.z - a.height;
    this.scores[d.i] += n;
    for (let k = 0; k < n; k++) this.addButterfly(d, k);
    d.glowT = 0.5;
    particles.burst(a.x, top + a.height * 0.4, { type: 'sparkle', count: n > 1 ? 16 : 8, colors: [M.color, '#fff', d.p.color], speed: [80, 300] });
    particles.popText(a.x, top - 40, label, n > 1 ? '#ff7ac6' : d.p.color, n > 1 ? 48 : 42);
    d.popCD = 0.8;
    snd('bb-flutter', 'sparkle', { vol: 0.4 });
    sfx('collect', { step: Math.min(12, d.streak + n), vol: 0.32 });
  }

  addButterfly(d, k = 0, from = null) {
    if (d.flock.length >= MAX_FLOCK) { d.flock[(this.scores[d.i] + k) % MAX_FLOCK].col = pick(BFLY); return; }
    const src = from || { x: TEACHER.x + rand(-60, 60), y: TEACHER.y - 220 };
    d.flock.push({
      col: pick(BFLY), ang: rand(TAU), spd: rand(1.4, 2.4) * (chance(0.5) ? 1 : -1), r: rand(0.5, 0.8), yo: rand(0.2, 0.95),
      ph: rand(TAU), sx: src.x, sy: src.y, arrive: 0, delay: k * 0.12, s: rand(46, 62),
    });
  }

  // --- update ------------------------------------------------------------------
  preUpdate(dt) {
    this.t += dt;
    for (const d of this.dancers) d.d.update(dt, 0);
  }

  update(dt) {
    this.t += dt;
    this.time += dt;
    this.tickBeat(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.8) this.banner = null; }
    if (this.say) { this.say.t += dt; if (this.say.t > this.say.dur) this.say = null; }
    this.likeCD = Math.max(0, this.likeCD - dt);
    this.updateMadame(dt);
    if (this.phase === 'class') this.updateClass(dt);
    else if (this.phase === 'finale') this.updateFinale(dt);
    else this.updateBow(dt);
    this.updateDancers(dt, this.phase === 'class' || this.phase === 'finale');
    this.updateSwarm(dt);
    this.updatePetals(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    this.beat += dt * 2;
    this.updateMadame(dt);
    this.updateDancers(dt, false);
    this.updatePetals(dt);
    this.updateSwarm(dt);
    if (this.phase === 'end' && Math.random() < dt * 1.5) particles.burst(rand(200, W - 200), rand(150, 400), { type: 'star', count: 6, colors: RAINBOW, speed: [80, 200] });
  }

  updateMadame(dt) {
    this.sproingT = Math.max(0, this.sproingT - dt * 1.4);
    this.reactT = Math.max(0, this.reactT - dt);
    if (this.reactT <= 0) this.react = null;
    if (this.demo) { this.demo.t += dt; if (this.demo.t >= this.demo.dur) this.demo = null; }
    const want = this.phase === 'finale' || (this.phase === 'bow' && this.bowT < 2) ? 1 : 0;
    this.imp.show = clamp(this.imp.show + (want ? dt * 5 : -dt * 4), 0, 1);
    // flying tiara: up, then it orbits round her head
    const ti = this.tiara;
    if (ti) {
      if (ti.orbit < 0) {
        ti.vy += 1700 * dt; ti.x += ti.vx * dt; ti.y += ti.vy * dt; ti.rot += dt * 14;
        if (ti.vy > 0 && ti.y > TEACHER.y - TEACHER.h * 1.18) { ti.orbit = 0; snd('ob-sproing', 'boing', { vol: 0.35 }); }
      } else {
        ti.orbit += dt;
        const a = ti.orbit * 3.2, cx = TEACHER.x, cy = TEACHER.y - TEACHER.h * 1.08 + Math.sin(this.t * 2.4) * 10;
        ti.x = lerp(ti.x, cx + Math.cos(a) * 70, 1 - Math.exp(-6 * dt)); ti.y = lerp(ti.y, cy + Math.sin(a) * 16, 1 - Math.exp(-6 * dt)); ti.rot = Math.sin(a) * 0.5;
        if (Math.random() < dt * 6) particles.trail(ti.x, ti.y, { type: 'sparkle', colors: ['#ffd23f', '#fff'], size: [6, 10], speed: [10, 40], life: [0.3, 0.5] });
      }
    }
    // flying wig (the sneeze)
    const wg = this.wig;
    if (wg) {
      wg.t += dt;
      if (!wg.back) {
        wg.vy += 900 * dt; wg.x += wg.vx * dt; wg.y += wg.vy * dt; wg.rot += dt * 9;
        if (wg.y > 760) { wg.y = 760; wg.vy = -Math.abs(wg.vy) * 0.55; wg.vx *= 0.7; if (Math.abs(wg.vy) > 60) snd('ob-sproing', 'boing', { vol: 0.3 }); }
        if (wg.t > 2.6) { wg.back = true; wg.bt = 0; wg.fx = wg.x; wg.fy = wg.y; }
      } else {
        wg.bt += dt / 0.5;
        const k = ease.inOutQuad(clamp(wg.bt, 0, 1));
        wg.x = lerp(wg.fx, TEACHER.x, k); wg.y = lerp(wg.fy, TEACHER.y - TEACHER.h * 0.85, k) - Math.sin(k * Math.PI) * 200; wg.rot *= 0.9;
        if (wg.bt >= 1) {
          this.wig = null; this.wigOff = false;
          snd('ob-wig', 'pop', { vol: 0.5 }); this.sproingT = 1; this.teacherSay('Hmph! Where were we?', 1.2);
          particles.burst(TEACHER.x, TEACHER.y - TEACHER.h * 0.85, { type: 'star', count: 8, colors: ['#b98bff', '#fff'] });
        }
      }
    }
  }

  updateClass(dt) {
    const c = this.call;
    if (!c) { if (this.time > 1.2) this.nextCall(); }
    else {
      c.t += dt;
      if (c.t >= c.len) {
        this.endCall(c);
        if (this.time + 3 < FINALE_AT) this.nextCall();
        else { this.prev = c; c.endAt = this.time; this.call = null; }
      }
    }
    if (this.stormT < 0 && this.time >= STORM_AT) this.startStorm();
    if (this.time >= FINALE_AT && !this.call) this.startFinale();
  }

  /** Halfway: Madame sneezes her wig off in a butterfly storm; gift butterflies for everyone. */
  startStorm() {
    this.stormT = 0;
    this.banner = { text: 'Ah... CHOO!', t: 0, color: '#6fd0ff', y: 560, size: 130 };
    snd('ob-sneeze', 'pt-honk', { vol: 0.6 });
    snd('bb-swarm', 'magic', { vol: 0.55 });
    fx.shake(10, 0.3); fx.flash('#ffffff', 0.15);
    this.teacherSay('Ah... CHOO!', 1.2);
    later(() => { if (this.phase !== 'class') return; this.react = 'shock'; this.reactT = 1.1; this.teacherSay('Mon dieu! My wig!', 1.3); snd('ob-gasp', 'crowd-gasp', { vol: 0.45 }); }, 550);
    this.wigOff = true;
    this.wig = { x: TEACHER.x, y: TEACHER.y - TEACHER.h * 0.85, vx: chance(0.5) ? 520 : -520, vy: -1100, rot: 0, t: 0, back: false };
    snd('ob-wig', 'whoosh', { vol: 0.5 });
    for (let i = 0; i < 70; i++) {
      this.swarm.push({ x: -100 - rand(900), y: rand(180, 900), vy: rand(-40, 40), vx: rand(650, 950), col: pick(BFLY), s: rand(34, 60), ph: rand(TAU) });
    }
    for (const d of this.dancers) { d.giftT = 0.4 + (d.d.hx / W) * 0.9; if (!d.d.busy) d.a.playOnce('laugh', 1.0, 'idle'); }
  }

  giveGift(d) {
    this.scores[d.i] += 2;
    this.addButterfly(d, 0, { x: d.a.x - 300, y: d.a.y - 400 }); this.addButterfly(d, 1, { x: d.a.x - 300, y: d.a.y - 360 });
    particles.popText(d.a.x, d.a.y - d.a.height - 40, '+2', '#6fd0ff', 46);
    d.a.emote('exclaim', 0.6);
    sfx('collect', { step: 6, vol: 0.3 });
  }

  startFinale() {
    this.phase = 'finale'; this.call = null; this.prev = null;
    this.teacherSay('Everybody, any move you like!', 1.8);
    this.banner = { text: 'Free dance!', t: 0, color: '#ff7ac6', y: 560, size: 140 };
    snd('bb-freestyle', 'fanfare', { vol: 0.5 });
    fx.flash('#fff0fa', 0.2);
    particles.confettiRain(W, 70);
    for (const d of this.dancers) d.finalePts = 0;
  }

  updateFinale() {
    if (Math.random() < 0.06) particles.burst(TEACHER.x + rand(-140, 140), TEACHER.y - rand(60, 300), { type: 'note', count: 1, colors: RAINBOW, speed: [60, 160] });
    if (this.time >= PLAY_TIME) this.startBow();
  }

  startBow() {
    this.phase = 'bow'; this.bowT = 0; this.demo = null;
    this.banner = { text: 'Bravo!', t: 0, color: '#ffd23f', y: 560, size: 140 };
    snd('applause', 'cheer', { vol: 0.6 });
    sfx('fanfare', { vol: 0.5 });
    fx.flash('#fff', 0.25);
    this.teacherSay('Bravo, my darlings!', 1.6);
    for (let i = 0; i < 160; i++) this.petals.push(this.newPetal(rand(-900, -20)));
    // the curtain call: everyone steps into one line (clear of the stars bar at the bottom)
    const line = [...this.dancers].sort((a, b) => a.d.hx - b.d.hx);
    const span = Math.min(1560, (this.n - 1) * 440);
    line.forEach((d, k) => {
      d.d.stop(); d.queued = null;
      d.to = { x: W / 2 + (this.n > 1 ? (k / (this.n - 1) - 0.5) * span : 0), y: this.n > 4 && k % 2 ? 840 : 890 };
      if (d.p.isAI) d.p.ctrl.move(0, 0);
    });
    const kids = this.players.some((p) => !p.isAI);
    this.star = this.n > 1 ? showstopper(this.players, this.scores) : null;
    if (!kids) this.star = null;
  }

  newPetal(y) {
    return { x: rand(W), y, vx: rand(-40, 40), vy: rand(120, 260), rot: rand(TAU), spin: rand(-4, 4), s: rand(20, 36), c: pick(['#ff9fcf', '#ffc4e6', '#ff7ac6', '#fff0f8', '#ffd0a8']), ph: rand(TAU) };
  }

  updateBow(dt) {
    if (this.phase !== 'bow') return;
    this.bowT += dt;
    if (this.bowT > 0.9 && !this.bowed) {
      this.bowed = true;
      for (const d of this.dancers) d.a.setPose('bow');
    }
    if (this.bowT > 2.2 && !this.bowed2) {
      this.bowed2 = true;
      for (const d of this.dancers) d.a.setPose(d.i === this.star ? 'celebrate' : chance(0.5) ? 'celebrate' : 'laugh');
      particles.confettiRain(W, 80);
      if (this.star != null) {
        const s = this.byIndex[this.star];
        particles.burst(s.a.x, s.a.y - s.a.height * 0.6, { type: 'star', count: 26, colors: ['#ffd23f', '#fff3b0', '#fff'], speed: [150, 420] });
      }
    }
    if (this.bowT > BOW_LEN && !this.done) this.finish();
  }

  updateDancers(dt, live) {
    for (const d of this.dancers) {
      const a = d.a, D = d.d;
      d.popCD = Math.max(0, d.popCD - dt);
      d.glowT = Math.max(0, d.glowT - dt);
      if (d.giftT > 0) { d.giftT -= dt; if (d.giftT <= 0) this.giveGift(d); }
      let mx = 0, my = 0;
      if (live) {
        if (d.ai) ({ x: mx, y: my } = this.updateAI(d, dt));
        else ({ x: mx, y: my } = this.readInput(d));
        if (d.queued && (!D.busy || D.u >= 0.55)) { const M = d.queued; d.queued = null; this.danceMove(d, M); }
      } else if (d.to) {
        // walking into the curtain-call line
        const ex = d.to.x - D.hx, ey = d.to.y - D.hy, dist = Math.hypot(ex, ey);
        if (dist > 12 && this.bowT < 0.9) { mx = ex / dist; my = ey / dist * 1.6; } else if (this.bowT >= 0.9) { D.hx = damp(D.hx, d.to.x, 12, dt); D.hy = damp(D.hy, d.to.y, 12, dt); }
      }
      const slow = D.busy ? 0.45 : 1;
      D.hx = clamp(D.hx + mx * 520 * slow * dt, FLOOR.x0, FLOOR.x1);
      D.hy = clamp(D.hy + my * 300 * slow * dt, FLOOR.y0, FLOOR.y1);
      a.scale = damp(a.scale, d.baseScale * this.depthK(D.hy), 10, dt);
      const moving = Math.hypot(mx, my) > 0.15;
      if (moving && Math.abs(mx) > 0.15 && !D.busy) { D.baseFacing = mx > 0 ? 1 : -1; a.facing = D.baseFacing; }
      if (!D.busy && !a._once && (live || (d.to && this.bowT < 0.9))) a.setPose(moving ? 'walk' : 'idle');
      D.update(dt, this.beat);
      if (D.busy && Math.random() < dt * 20) particles.trail(a.x + rand(-30, 30), a.y - a.z - rand(0, a.height), { type: 'sparkle', colors: [D.mv.color, '#fff'], size: [6, 12], speed: [10, 60], life: [0.3, 0.6] });
      for (const b of d.flock) {
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.arrive = Math.min(1, b.arrive + dt * 1.6);
        b.ang += b.spd * dt * (this.phase === 'bow' || this.phase === 'end' ? 1.8 : 1);
      }
    }
  }

  /** CPUs wander about the floor, follow some calls, and throw in moves of their own. */
  updateAI(d, dt) {
    const ai = d.ai, D = d.d, w = ai.wander;
    w.t -= dt;
    if (w.t <= 0) {
      w.t = rand(1.2, 3.4);
      if (chance(0.6)) { w.x = clamp(D.hx + rand(-380, 380), FLOOR.x0 + 40, FLOOR.x1 - 40); w.y = rand(FLOOR.y0 + 10, FLOOR.y1 - 10); }
    }
    let mx = 0, my = 0;
    const ex = w.x - D.hx, ey = w.y - D.hy, dist = Math.hypot(ex, ey);
    if (dist > 24) { mx = (ex / dist) * 0.6; my = (ey / dist) * 0.6; }
    if (ai.plan && this.call && this.call.M === ai.plan.M && this.call.t >= ai.plan.at) { ai.plan = null; this.tryMove(d, this.call.M); }
    ai.nextMove -= dt;
    if (ai.nextMove <= 0) {
      ai.nextMove = rand(1.6, 3.6) / clamp(aiProfile(d.p).speed, 0.6, 1.4);
      if (chance(this.phase === 'finale' ? 0.9 : 0.45)) this.tryMove(d, pick(DANCES));
    }
    return { x: mx, y: my };
  }

  updateSwarm(dt) {
    if (this.stormT >= 0) this.stormT += dt;
    for (const s of this.swarm) { s.x += s.vx * dt; s.y += (s.vy + Math.sin(this.t * 5 + s.ph) * 120) * dt; }
    this.swarm = this.swarm.filter((s) => s.x < W + 120);
  }

  updatePetals(dt) {
    for (const p of this.petals) {
      p.x += (p.vx + Math.sin(this.t * 2 + p.ph) * 50) * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
    }
    this.petals = this.petals.filter((p) => p.y < H + 40);
  }

  finish() {
    this.done = true;
    this.phase = 'end';
    const star = this.star;
    // no losers: everyone gets a star; the Star Dancer (top scorer) gets a second one
    this.api.finish({
      showcase: true, highlight: star,
      title: star != null ? `${playerName(this.players[star])} is the Star Dancer!` : 'Bravo, everyone!',
      stats: this.scores.map((s, i) => `${s} butterflies · ${this.copied[i]} moves copied`),
      focus: { x: W / 2, y: 700, zoom: 1.05 },
    });
  }

  destroy() {}

  // --- draw --------------------------------------------------------------------
  draw(g) {
    drawStageBg(g, this.t, this.phase === 'class' ? 0 : 1);
    // a soft beat glow on the floor
    if (this.phase !== 'end') {
      g.save(); g.globalAlpha = 0.12 * this.pulse; g.fillStyle = '#fff3fb';
      g.beginPath(); g.ellipse(W / 2, 880, 900, 190, 0, 0, TAU); g.fill(); g.restore();
    }
    if (this.star != null && this.phase !== 'class') this.drawSpotlight(g, this.byIndex[this.star]);
    this.drawMadame(g);
    this.drawCard(g);
    const order = [...this.dancers].sort((a, b) => a.d.hy - b.d.hy);
    for (const d of order) this.drawFlock(g, d, false);
    for (const d of order) {
      if (d.glowT > 0) {
        g.save(); g.globalAlpha = d.glowT * 1.2; g.fillStyle = d.p.color;
        g.beginPath(); g.ellipse(d.a.x, d.a.y, 90 * d.a.scale, 24 * d.a.scale, 0, 0, TAU); g.fill(); g.restore();
      }
      d.d.draw(g, { ring: d.p.color });
      this.drawFlock(g, d, true);
    }
    for (const d of order) {
      const a = d.a, top = a.y - a.z - a.height - 26 - (a.emotes.length ? 50 : 0);
      if (this.phase !== 'end' && (this.time < 6 || this.n > 1)) ui.playerTag(g, d.p, a.x, top);
      if (this.call && d.gotN === this.call.n) this.drawCheck(g, a.x + 56, top - 20, d.p.color);
      else if (this.easy && !d.p.isAI && this.phase === 'class' && this.call && this.call.t > 0.4) easyPrompt(g, d.p, { child: { x: a.x, y: a.y - a.z - a.height } });
      if (this.star === d.i && this.phase !== 'class' && this.phase !== 'finale' && (this.bowT > 2.2 || this.phase === 'end')) this.drawStarBadge(g, a.x, a.y - a.height - 30);
    }
    for (const s of this.swarm) drawButterfly(g, s.x, s.y, s.s, s.col, Math.sin(this.t * 16 + s.ph), 0.9 + Math.sin(this.t * 4 + s.ph) * 0.2);
    for (const p of this.petals) drawPetal(g, p.x, p.y, p.s, p.rot, p.c);
  }

  drawSpotlight(g, d) {
    const k = this.phase === 'end' ? 1 : clamp((this.bowT - 2.2) / 0.5, 0, 1);
    if (k <= 0) return;
    const x = d.a.x, y = d.a.y;
    g.save(); g.globalAlpha = 0.35 * k;
    const gr = g.createLinearGradient(x, 0, x, y);
    gr.addColorStop(0, 'rgba(255,248,200,0)'); gr.addColorStop(1, 'rgba(255,248,200,0.95)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 60, 0); g.lineTo(x + 60, 0); g.lineTo(x + 190, y); g.lineTo(x - 190, y); g.closePath(); g.fill();
    g.globalAlpha = 0.5 * k; g.fillStyle = '#fff8c8';
    g.beginPath(); g.ellipse(x, y, 190, 44, 0, 0, TAU); g.fill();
    g.restore();
  }

  /** The Star Dancer's badge: a big gold star with a little crown. */
  drawStarBadge(g, x, y) {
    const bob = Math.sin(this.t * 4) * 8, s = 64;
    g.save(); g.translate(x, y - 40 + bob); g.rotate(Math.sin(this.t * 2) * 0.08);
    g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke();
    g.restore();
    drawTiara(g, x, y - 40 + bob - s * 0.95, 56, Math.sin(this.t * 2) * 0.1);
    ui.text(g, 'Star Dancer!', x, y + 34 + bob, { size: 40, color: '#ffd23f' });
  }

  /** Madame: the called move as her example (her art and some motion), else a little groove. */
  drawMadame(g) {
    let pose = null, k = 0, side = 1, dx = 0, z = 0, rot = 0, artKey = null, sy = 1;
    const dm = this.demo;
    if (this.phase === 'bow' || this.phase === 'end') { pose = 'bow'; k = this.phase === 'end' ? 0.5 : clamp(this.bowT / 1.1, 0, 1) * 0.5 + 0.25; }
    else if (dm) {
      const T = TEACH[dm.M.id], u = clamp(dm.t / dm.dur, 0, 1), s = Math.sin(u * Math.PI), h = TEACHER.h;
      pose = T.pose; k = T.pose === 'side' || T.pose === 'plie' || T.pose === 'up' ? clamp(u * 1.6, 0, 0.5) : u; side = dm.side;
      artKey = 'prop/oballet-teacher-' + (T.art || dm.M.id);
      const own = !!art(artKey);   // her own art for the move: no stand-in offsets (plie dip, side step)
      if (own) { pose = dm.M.id; k = u; }
      if (T.hop) z = s * h * T.hop;
      if (T.lean) rot = s * T.lean * side;
      if (T.spin) { rot = ease.inOutQuad(u) * TAU * side; z = s * h * 0.1; }
      if (T.kick) side = u < 0.5 ? side : -side;
      if (T.sway) { const w = Math.sin(u * TAU * 2); rot += w * T.sway; dx += w * h * 0.06; }
      if (T.glide) dx = -s * h * 0.25 * side;   // moonwalk: sliding back while facing forward
      if (T.drop && !own) { z = -s * h * T.drop; sy = 1 - s * 0.06; }
    } else if (this.phase !== 'bow') z = Math.abs(Math.sin(this.beat * Math.PI)) * 8;   // a little groove on the beat
    const R = this.react;
    if (R) { pose = null; artKey = null; rot = 0; }
    const x = TEACHER.x + dx, y = TEACHER.y - z, h = TEACHER.h;
    g.save();
    if (rot || sy !== 1) { const py = y - h * (TEACH[dm?.M.id]?.spin ? 0.5 : 0); g.translate(x, py); g.rotate(rot); g.scale(1, sy); g.translate(-x, -py); }
    drawTeacher(g, x, y, h, this.t, pose, k, side, {
      react: R, artKey, fluster: 0, sproing: this.sproingT,
      wigOff: this.wigOff, tiaraOff: !!this.tiara, laugh: this.phase === 'finale' || this.phase === 'bow' || this.phase === 'end' || (this.stormT >= 0 && this.stormT < 1),
    });
    g.restore();
    const c = this.call;
    if (c && c.t < 0.9) {
      const q = c.t / 0.9;
      g.save(); g.globalAlpha = 1 - q; g.strokeStyle = c.golden ? '#ffd23f' : c.M.color; g.lineWidth = 10;
      g.beginPath(); g.arc(TEACHER.x, TEACHER.y - TEACHER.h * 0.55, 120 + q * 160, 0, TAU); g.stroke(); g.restore();
    }
    if (R === 'shock') {
      const hx = TEACHER.x, hy = TEACHER.y - TEACHER.h * 0.84, q = clamp(1.1 - this.reactT, 0, 0.15) / 0.15;
      drawShock(g, hx, hy, TEACHER.h * 0.2, this.t, q);
    }
    if (this.tiara) drawTiara(g, this.tiara.x, this.tiara.y, 50, this.tiara.rot);
    if (this.wig) {
      g.save(); g.translate(this.wig.x, this.wig.y); g.rotate(this.wig.rot);
      g.fillStyle = '#b98bff'; g.strokeStyle = NAVY; g.lineWidth = 4;
      g.beginPath(); g.arc(0, 6, 30, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, -22, 17, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
    // speech bubble
    if (this.say) {
      const s = this.say, sk = ease.outBack(clamp(s.t / 0.25, 0, 1)), a = clamp((s.dur - s.t) / 0.25, 0, 1);
      g.save(); g.font = `800 40px ${ui.FONT}`;
      const w = Math.max(160, g.measureText(s.text).width + 50);
      const bx = Math.max(HINT.x + 140 + w / 2, TEACHER.x - 90 - w / 2), by = TEACHER.y - TEACHER.h + 20;   // clear of the big button
      g.globalAlpha = a; g.translate(bx, by); g.scale(sk, sk);
      ui.panel(g, -w / 2, -38, w, 76, { r: 34, fill: '#fff', lineWidth: 5 });
      g.fillStyle = '#fff'; g.strokeStyle = NAVY; g.lineWidth = 5;
      g.beginPath(); g.moveTo(w * 0.5 - 4, -16); g.lineTo(w * 0.5 + 44, -4); g.lineTo(w * 0.5 - 4, 14); g.fill(); g.stroke();
      g.fillRect(w * 0.5 - 12, -12, 12, 22);
      ui.text(g, s.text, 0, 2, { size: 40, color: NAVY, stroke: false });
      g.restore();
    }
  }

  drawFlock(g, d, front) {
    const a = d.a, cx = a.x, cy = a.y - a.z;
    for (const b of d.flock) {
      if (b.delay > 0) continue;
      const depth = Math.sin(b.ang);
      if ((depth >= 0) !== front) continue;
      const rx = a.height * b.r + 30, px = cx + Math.cos(b.ang) * rx, py = cy - a.height * b.yo + depth * 26 + Math.sin(this.t * 3 + b.ph) * 12;
      const k = ease.outCubic(b.arrive);
      const x = lerp(b.sx, px, k), y = lerp(b.sy, py, k) - Math.sin(k * Math.PI) * 120;
      drawButterfly(g, x, y, b.s * (0.85 + depth * 0.15) * Math.min(1.2, a.scale), b.col, Math.sin(this.t * 15 + b.ph), Math.cos(b.ang) * 0.4 * Math.sign(b.spd));
    }
  }

  drawCheck(g, x, y, color) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#fff'; g.strokeStyle = color; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#36b583'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(-2, 8); g.lineTo(11, -8); g.stroke();
    g.restore();
  }

  /** The call card (the move's picture and name) and the big button to press. */
  drawCard(g) {
    const c = this.call, finale = this.phase === 'finale';
    if (!c && !finale) return;
    const s = CARD.s;
    const pop = c ? ease.outBack(clamp(c.t / 0.3, 0, 1)) : 1;
    const wob = Math.sin(this.t * 5) * 0.03, beatK = 1 + this.pulse * 0.03;
    g.save(); g.translate(CARD.x, CARD.y); g.scale(pop * beatK, pop * beatK); g.rotate(wob);
    if (finale) {
      ui.panel(g, -s / 2, -s / 2, s, s + 50, { r: 40, fill: '#fff', stroke: '#ff7ac6', lineWidth: 10 });
      ['disco', 'star', 'hula', 'twirl'].forEach((id, k) => drawCallPicto(g, MOVE[id], (k % 2 - 0.5) * s * 0.46, (Math.floor(k / 2) - 0.5) * s * 0.46 - 6, s * 0.4, this.t + k));
      ui.text(g, 'Any move!', 0, s / 2 + 8, { size: 38, color: '#ff7ac6', stroke: false });
    } else {
      const M = c.M;
      if (c.golden) {
        if (!drawArt(g, 'prop/oballet-card-gold', 0, 18, s + 40, s + 90, { fit: 'stretch' })) {
          const gg = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
          gg.addColorStop(0, '#fff3b0'); gg.addColorStop(0.5, '#ffd23f'); gg.addColorStop(1, '#ff9f1c');
          ui.panel(g, -s / 2, -s / 2, s, s + 50, { r: 40, fill: gg, lineWidth: 8 });
          ui.panel(g, -s / 2 + 22, -s / 2 + 22, s - 44, s + 6, { r: 28, fill: '#fffaf0', shadow: false, lineWidth: 4 });
        }
        if (Math.random() < 0.35) particles.trail(CARD.x + rand(-s / 2, s / 2), CARD.y + rand(-s / 2, s / 2), { type: 'sparkle', colors: ['#ffd23f', '#fff'], size: [8, 16], speed: [10, 50], life: [0.4, 0.8] });
      } else ui.panel(g, -s / 2, -s / 2, s, s + 50, { r: 40, fill: '#fff', stroke: M.color, lineWidth: 10 });
      drawCallPicto(g, M, 0, -14, s * 0.72, this.t);
      ui.text(g, callName(M), 0, s / 2 + 6, { size: 42, color: M.color, stroke: NAVY, maxWidth: s - 30 });
      // time ring: how long Madame keeps calling it
      const left = 1 - clamp(c.t / c.len, 0, 1);
      g.lineCap = 'round'; g.lineWidth = 12; g.strokeStyle = NAVY; g.globalAlpha = 0.25;
      g.beginPath(); g.arc(s * 0.5 - 6, -s * 0.5 + 6, 30, 0, TAU); g.stroke(); g.globalAlpha = 1;
      g.strokeStyle = c.golden ? '#ff9f1c' : M.color;
      g.beginPath(); g.arc(s * 0.5 - 6, -s * 0.5 + 6, 30, -Math.PI / 2, -Math.PI / 2 + TAU * left); g.stroke();
    }
    g.restore();
    this.drawImpAt(g);
    // the big button to press, on the other side of Madame
    g.save(); g.translate(HINT.x, HINT.y); g.scale(pop, pop);
    const col = finale ? '#ff7ac6' : c.golden ? '#ffd23f' : c.M.color;
    ui.panel(g, -130, -130, 260, 260, { r: 130, fill: 'rgba(255,255,255,0.9)', stroke: col, lineWidth: 8 });
    const k = 1 + Math.abs(Math.sin(this.beat * Math.PI)) * 0.12;
    if (finale) {
      const btns = this.easy ? ['a'] : ['a', 'b', 'x', 'y'];   // Easy: A is all you need (any button counts)
      g.save(); g.scale(k, k); ui.glyph(g, btns[Math.floor(this.beat) % btns.length], 0, 0, 120, { pulse: this.easy }); g.restore();
    } else if (this.easy) {
      // Easy: A does the called move; its own button is there too (small) for those who like it
      g.save(); g.scale(k, k); ui.glyph(g, 'a', 0, c.M.btn === 'a' ? 0 : -18, 128, { pulse: true }); g.restore();
      if (c.M.btn !== 'a') { ui.text(g, 'or', -34, 86, { size: 28, color: NAVY, stroke: false }); ui.glyph(g, c.M.btn, 30, 86, 46); }
    } else {
      g.save(); g.scale(k, k); ui.glyph(g, c.M.btn, 0, 0, 132, { pulse: true }); g.restore();
    }
    g.restore();
  }

  /** In the finale and the bow the cheeky imp pops up beside the card and dances too. */
  drawImpAt(g) {
    const im = this.imp;
    if (im.show <= 0.01) return;
    const s = CARD.s, k = ease.outBack(im.show);
    const x = CARD.x - s * 0.62, y = CARD.y + s * 0.5 + 30 - Math.abs(Math.sin(this.beat * Math.PI)) * 50;
    const flip = Math.floor(this.beat / 2) % 2 ? 1 : -1;
    g.save(); g.globalAlpha = clamp(im.show * 1.5, 0, 1);
    drawImp(g, x, y, 150 * (0.6 + 0.4 * k), this.t, 'peek', flip);
    g.restore();
  }

  drawHUD(g) {
    if (this.api.ended?.()) return;
    ui.scoreboard(g, this.players, this.scores, { y: 18, avoidCenter: true, format: (v) => String(v) });
    if (this.banner) {
      const k = this.banner.t;
      g.save(); g.globalAlpha = clamp((1.8 - k) / 0.4, 0, 1);
      ui.banner(g, this.banner.text, k, { y: this.banner.y || 560, size: this.banner.size || 130, color: this.banner.color });
      g.restore();
    }
  }
}
