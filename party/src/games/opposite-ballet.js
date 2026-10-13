// Opposite Ballet (Molly Party) - the cheeky flip of Butterfly Ballet.
// Madame Papillon, a VERY serious butterfly-fairy ballet teacher, shows a move
// on a big picture card... and a cheeky imp flips the card round to the
// OPPOSITE move, which is what everybody does: arms up <-> plié down, step
// left <-> step right, twirl (A) <-> stand still like a statue. Every correct
// opposite is a silly flamboyant pose with butterflies and giggles, and Madame
// gets more and more flustered (antennae droop, her tiara pops off, she stamps
// her foot, her tutu sproings). Each time the class gets her, she stops for a
// proper hoity-toity reaction - arms folded with her nose in the air, or a
// wagging finger - while the dancers laugh. Every few moves a golden "copy me for real!"
// card shoos the imp away: copy her properly. Halfway, all the butterflies
// make her sneeze her wig off (scandalised: "Mon dieu!"). At the end she gives up, laughs and does the
// silliest dance of all with everyone. Nobody loses: wrong moves are just a
// wobble, and quick, cheeky players (who know the opposite before the flip)
// get double butterflies.
import { W, H } from '../engine/canvas.js';
import { Actor, POSES } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { drawArt } from '../engine/art.js';
import { outfitItem } from '../engine/outfits.js';
import { clamp, lerp, rand, pick, chance, TAU, ease, placementsFromScores, later } from '../engine/util.js';
import {
  NAVY, BFLY, drawButterfly, drawPetal, drawTeacher, drawTiara, drawImp, drawFlipArrow, drawMovePicto, drawTutu, wantsTutu, drawStageBg,
} from './opposite-ballet/art.js';
import { nextKind, drawShock, drawSteam, drawWag } from './opposite-ballet/fluster.js';

const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

const PLAY_TIME = 57;          // seconds of dancing, then the bow
const STORM_AT = 28;           // Madame sneezes her wig off in a butterfly storm
const GIVEUP_AT = 48;          // she gives up: silly freestyle for everyone
const BOW_LEN = 3.4;
const MOVES = ['up', 'down', 'left', 'right', 'twirl', 'statue'];
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left', twirl: 'statue', statue: 'twirl' };
const TEACH = { up: 'up', down: 'plie', left: 'side', right: 'side', twirl: 'twirl', statue: 'statue' };
const MOVE_POSE = { up: 'dance-up', down: 'dance-down', left: 'dance-side', right: 'dance-side', twirl: 'pose-twirl', statue: 'balance' };
const MOVE_NOTE = { up: [76, 79, 84], down: [72, 67, 60], left: [72, 76, 72], right: [72, 76, 72], twirl: [72, 76, 79, 84], statue: [72, 72] };
const MOVE_COL = { up: '#6fd0ff', down: '#ffd23f', left: '#6fe3b4', right: '#6fe3b4', twirl: '#ff7ac6', statue: '#b8a6e0' };
const MOVE_TIME = 0.6;         // how long a dancer's move animation lasts
const MAX_FLOCK = 14;          // butterflies drawn per dancer (score keeps counting)
const TEACHER = { x: 960, y: 478, h: 330 };
const CARD = { x: 1480, y: 300, s: 300 };
const HINT = { x: 440, y: 300 };
// the requested `silly-pose` once it exists, else the existing ta-da
const SILLY = POSES['silly-pose'] ? 'silly-pose' : 'strike3';
const HUFFS = ['Non non non!', 'Mon dieu!', 'Hmph!', 'Oh là là!', 'Zut!', 'Sacrebleu!'];

/** Beat length (seconds) at time t: generous at first, brisker later. */
const beatLen = (t) => (t < STORM_AT ? lerp(3.5, 2.7, t / STORM_AT) : lerp(2.7, 2.2, clamp((t - STORM_AT) / (GIVEUP_AT - STORM_AT), 0, 1)));

/** Stick / A hint for the answer move, drawn in a circle. */
function drawAnswerHint(g, move, x, y, size, t) {
  if (move === 'twirl') { ui.glyph(g, 'a', x, y, size, { pulse: true }); return; }
  if (move === 'statue') {
    // hands off! a stick with a big friendly "stop" ring
    ui.glyph(g, 'stick', x, y, size * 0.9);
    g.save(); g.translate(x, y); g.strokeStyle = '#ff5a7a'; g.lineWidth = size * 0.1; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, size * 0.66, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(-size * 0.46, -size * 0.46); g.lineTo(size * 0.46, size * 0.46); g.stroke();
    g.restore();
    return;
  }
  ui.glyph(g, 'stick', x, y, size);
  const push = (Math.sin(t * 8) * 0.5 + 0.5) * size * 0.18;
  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[move];
  g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx)); g.translate(size * 0.62 + push, 0);
  g.fillStyle = '#ffd23f'; g.strokeStyle = NAVY; g.lineWidth = size * 0.06; g.lineJoin = 'round';
  const a = size * 0.36;
  g.beginPath(); g.moveTo(a, 0); g.lineTo(0, -a * 0.8); g.lineTo(0, -a * 0.35); g.lineTo(-a * 0.8, -a * 0.35); g.lineTo(-a * 0.8, a * 0.35); g.lineTo(0, a * 0.35); g.lineTo(0, a * 0.8); g.closePath();
  g.fill(); g.stroke(); g.restore();
}

export const meta = {
  id: 'opposite-ballet',
  title: 'Opposite Ballet',
  category: 'molly',
  type: 'Do the opposite',
  goal: 'Madame shows a move... do the OPPOSITE and make her flustered!',
  controls: [['stick', 'Up = arms up, down = plié, left / right = step'], ['a', 'Twirl']],
  tips: ['The cheeky imp flips the card to show the opposite: up is down, left is right!', 'She twirls? Stand still like a statue. She stands still? Twirl!', 'A golden card means copy her for real!'],
  music: 'dance',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    if (drawArt(g, 'thumb/opposite-ballet', x + w / 2, y + h / 2, w, h, { fit: 'cover' })) return;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, '#c9b2ff'); gr.addColorStop(0.6, '#ffc8e4'); gr.addColorStop(1, '#ff9fd0');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = '#ffd6ec'; g.strokeStyle = NAVY; g.lineWidth = Math.max(2, h * 0.012);
    g.beginPath(); g.ellipse(x + w / 2, y + h * 0.92, w * 0.46, h * 0.14, 0, 0, TAU); g.fill(); g.stroke();
    // flustered Madame doing "up", her tiara flying, and a cheeky imp with the flip arrow
    drawTeacher(g, x + w * 0.38, y + h * 0.97, h * 0.66, t, 'up', 0.5, 1, { fluster: 0.8, tiaraOff: true, sproing: 0.5 + 0.5 * Math.sin(t * 3) });
    drawTiara(g, x + w * 0.38 + Math.cos(t * 4) * w * 0.08, y + h * 0.14 + Math.sin(t * 4) * h * 0.03, h * 0.1, t * 6);
    drawImp(g, x + w * 0.78, y + h * 0.66 + Math.abs(Math.sin(t * 5)) * -h * 0.05, h * 0.36, t, 'flip', -1);
    drawFlipArrow(g, x + w * 0.62, y + h * 0.3, h * 0.26, Math.sin(t * 2) * 0.4);
    g.save(); g.translate(x + w * 0.8, y + h * 0.25); g.rotate(Math.sin(t * 3) * 0.1);
    ui.panel(g, -h * 0.13, -h * 0.13, h * 0.26, h * 0.26, { r: h * 0.04, fill: '#fff', stroke: '#ffd23f', lineWidth: Math.max(2, h * 0.012), shadow: false });
    drawMovePicto(g, 'down', 0, 0, h * 0.22, t);
    g.restore();
    for (let i = 0; i < 6; i++) {
      const a = t * 1.6 + i * TAU / 6;
      drawButterfly(g, x + w * 0.5 + Math.cos(a) * w * 0.42, y + h * 0.55 + Math.sin(a) * h * 0.32, h * 0.12, BFLY[i % 4], Math.sin(t * 14 + i), Math.sin(a) * 0.3);
    }
    g.restore();
  },
};

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0;          // animation clock
    this.time = 0;       // seconds since GO
    this.done = false;
    this.phase = 'dance';  // dance | silly | bow
    this.scores = this.players.map(() => 0);
    this.cheeky = this.players.map(() => 0);
    this.petals = [];
    this.swarm = [];
    this.stormT = -1;
    this.banner = null;  // { text, t, color, y }
    // Madame's mood
    this.fluster = 0; this.flusterShow = 0;
    this.stampT = 0; this.sproingT = 0; this.laughT = 0;
    this.react = null; this.reactT = 0; this.lastReact = 'scold';   // 'huff' | 'scold' | 'shock' pose
    this.gap = 0;        // a short pause after a huff so it reads before the next card
    this.say = null;     // { text, t, dur }
    this.tiara = null;   // { x, y, vx, vy, rot, orbit }
    this.wig = null;     // { x, y, vx, vy, rot, back }
    this.wigOff = false; this.wigAskew = false;
    this.imp = { show: 0, pose: 'peek', y: 0, t: 0 };
    this.sinceGolden = 0;
    // layout: one row up to 4, two staggered rows for more
    const two = n > 4, sc = n <= 2 ? 1.35 : n <= 4 ? 1.2 : 1.0;
    const backN = two ? Math.ceil(n / 2) : n;
    this.dancers = this.players.map((p, i) => {
      const back = two && i < backN, row = two && !back ? i - backN : i, rowN = back || !two ? backN : n - backN;
      const span = two ? 1300 : Math.min(1300, (n - 1) * 520);
      const sp = rowN > 1 ? span / (rowN - 1 + (two ? 0.5 : 0)) : 0;
      const x = W / 2 + (row - (rowN - 1) / 2) * sp + (two ? (back ? -sp / 4 : sp / 4) : 0);
      const y = two ? (back ? 840 : 1010) : 990;
      const a = new Actor(p, { scale: sc * (two && back ? 0.92 : 1), x, y, outfit: this.balletLook(p, i) });
      const minH = 125 * a.scale;
      if (a.height < minH) a.scale *= minH / a.height;   // tiny avatars (fairies) stay readable
      a.snap();
      a.facing = x < W / 2 ? 1 : -1;
      if (wantsTutu(p.charId)) {
        const col = BFLY[i % 4];
        a.char.members.forEach((def, mi) => a.attach((g, info) => drawTutu(g, def, info, col, this.t + i), { member: mi }));
      }
      return {
        p, i, a, hx: x, hy: y, move: null, mt: 0, dir: 1, cool: 0, prevDir: null,
        got: false, moved: false, fail: false, flock: [], streak: 0, ai: null, glowT: 0, sillyT: 0, stoneK: 0,
      };
    });
    this.dancers.sort((a, b) => a.hy - b.hy);
    this.byIndex = [...this.dancers].sort((a, b) => a.i - b.i);
    this.beat = null;
    this.lastMove = null;
    this.beatN = 0;
  }

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

  // --- beats -------------------------------------------------------------------
  nextBeat() {
    const intro = ['up', 'right', 'statue'];
    const isIntro = this.beatN < intro.length;
    let move, golden = false;
    if (isIntro) move = intro[this.beatN];
    else {
      golden = this.beatN >= 6 && (this.sinceGolden >= 4 && chance(0.55) || this.sinceGolden >= 6);
      const pool = golden ? ['up', 'down', 'left', 'right', 'twirl'] : MOVES;
      do { move = pick(pool); } while (move === this.lastMove || (move === 'statue' && chance(0.4)));
    }
    this.sinceGolden = golden ? 0 : this.sinceGolden + 1;
    this.lastMove = move;
    this.beatN++;
    const len = isIntro ? 4.6 : beatLen(this.time) + (golden ? 0.2 : 0);
    const flipAt = isIntro ? 1.35 : clamp(len * 0.36, 0.8, 1.1);
    const ans = golden ? move : OPP[move];
    this.beat = { move, ans, golden, intro: isIntro, t: 0, len, flipAt, flipped: false, early: false };
    for (const d of this.dancers) {
      d.got = false; d.moved = false; d.fail = false; d.stoneK = 0;
      d.ai = d.p.isAI ? this.planAI(d, this.beat) : null;
    }
    MOVE_NOTE[move].forEach((m, k) => later(() => sfx('note', { midi: m, vol: 0.32 }), k * 70));
    snd('bb-cue', 'magic', { vol: 0.4 });
    particles.burst(CARD.x, CARD.y, { type: 'sparkle', count: 10, colors: [MOVE_COL[move], '#fff'], speed: [80, 260] });
    if (golden) {
      snd('ob-golden', 'golden-chime', { vol: 0.6 });
      particles.burst(CARD.x, CARD.y, { type: 'star', count: 22, colors: ['#ffd23f', '#fff3b0', '#fff'], speed: [150, 420] });
      fx.flash('#fff3b0', 0.12);
      this.banner = { text: 'Copy me!', t: 0, color: '#ffd23f', y: 640, size: 110 };
      this.imp = { show: 0, pose: 'shoo', t: 0 };
      this.teacherSay(pick(['For real!', 'Like this!', 'Watch me!']), 1.3);
    } else {
      this.imp = { show: 0, pose: 'peek', t: 0 };
      if (isIntro && this.beatN === 1) this.teacherSay('Like this!', 1.2);
    }
  }

  planAI(d, b) {
    const lvl = clamp(d.p.aiLevel ?? 0, 0, 2);
    const [ok, lo, hi, oops, early] = [[0.72, 0.45, 1.3, 0.22, 0.05], [0.82, 0.35, 0.95, 0.13, 0.15], [0.9, 0.25, 0.7, 0.07, 0.3]][lvl];
    const plan = [];
    if (b.golden) {
      if (chance(oops)) plan.push({ at: rand(0.4, 0.9), move: OPP[b.move] });
      if (chance(ok)) plan.push({ at: rand(0.6, 1.0) + rand(lo, hi) * 0.8, move: b.move });
    } else if (b.ans === 'statue') {
      if (chance(oops * 1.3)) plan.push({ at: rand(0.3, b.flipAt + 0.6), move: b.move });
    } else {
      if (chance(oops)) plan.push({ at: rand(0.35, b.flipAt - 0.05), move: b.move });
      if (!plan.length && chance(early)) plan.push({ at: rand(0.45, b.flipAt - 0.05), move: b.ans });
      else if (chance(ok)) plan.push({ at: b.flipAt + rand(lo, hi), move: b.ans });
    }
    plan.sort((x, y) => x.at - y.at);
    return { plan };
  }

  teacherSay(text, dur = 1.4) { this.say = { text, t: 0, dur }; }

  flipCard() {
    const b = this.beat;
    b.flipped = true;
    snd('ob-flip', 'card-flip', { vol: 0.6 });
    snd('ob-imp-giggle', 'giggle', { vol: 0.55 });
    particles.burst(CARD.x, CARD.y, { type: 'star', count: 14, colors: RAINBOW, speed: [120, 380] });
    if (b.intro) {
      this.banner = { text: 'Opposite!', t: 0, color: '#ff7ac6', y: 640, size: 140 };
      fx.shake(6, 0.2);
    }
  }

  // --- moves -------------------------------------------------------------------
  readInput(d) {
    const c = d.p.ctrl;
    let dir = null;
    const m = Math.hypot(c.x, c.y);
    if (m > 0.55) dir = Math.abs(c.y) >= Math.abs(c.x) ? (c.y < 0 ? 'up' : 'down') : (c.x < 0 ? 'left' : 'right');
    if (c.pressed('a')) this.doMove(d, 'twirl');
    else if (dir && dir !== d.prevDir) this.doMove(d, dir);
    d.prevDir = dir;
  }

  doMove(d, move) {
    if (d.cool > 0 || this.phase === 'bow') return;
    const a = d.a;
    d.move = move; d.mt = 0; d.dir = move === 'left' ? -1 : 1; d.cool = 0.3;
    a.playOnce(MOVE_POSE[move], MOVE_TIME, 'idle');
    if (move === 'left' || move === 'right') { a.facing = d.dir; snd('ds-slide', 'whoosh', { vol: 0.3 }); }
    if (move === 'twirl') snd('ds-twirl', 'whoosh', { vol: 0.35 });
    if (move === 'down') a.squash(0.35);
    if (move === 'up') a.squash(-0.3);
    if (this.phase === 'silly') { this.award(d, 1, false, move, null); return; }
    const b = this.beat;
    if (!b || d.got || d.fail || b.t < 0.2) return;
    d.moved = true;
    if (b.ans === 'statue') {
      // she twirled: you were meant to stand still like a statue!
      d.fail = true;
      this.wobble(d, true);
      return;
    }
    if (move === b.ans) {
      d.got = true;
      const quick = !b.golden && (!b.flipped || b.t - b.flipAt < 0.55);
      const pts = b.golden || quick ? 2 : 1;
      this.award(d, pts, quick, move, b.golden ? 'Golden! +2' : quick ? 'Cheeky! +2' : '+1');
      if (!b.golden) d.sillyT = MOVE_TIME * 0.9;
      d.streak++;
      if (d.streak > 0 && d.streak % 5 === 0) {
        particles.ring(a.x, a.y - a.height * 0.5, '#ffd23f', 220, 0.5);
        particles.popText(a.x, a.y - a.height - 110, 'Super!', '#ffd23f', 56);
        a.emote('hearts', 1.2);
        snd('bb-wow', 'star', { vol: 0.5 });
      }
    } else {
      this.wobble(d, !b.golden && move === b.move);
      d.cool = 0.45;
    }
  }

  /** A funny wobble, no penalty. copied = did what Madame did (she looks smug). */
  wobble(d, copied) {
    const a = d.a;
    d.wobbleT = 0.28;
    a.emote('question', 0.9);
    snd('ob-oops', 'boing', { vol: 0.4 });
    particles.burst(a.x, a.y - a.height * 0.3, { type: 'star', count: 4, colors: ['#ffd23f', '#fff'], speed: [80, 180] });
    if (copied && this.imp.show > 0.3 && chance(0.6)) snd('ob-imp-giggle', 'giggle', { vol: 0.35 });
  }

  award(d, n, quick, move, label) {
    const a = d.a, top = a.y - a.z - a.height;
    this.scores[d.i] += n;
    if (quick) this.cheeky[d.i]++;
    for (let k = 0; k < n; k++) this.addButterfly(d, k);
    d.glowT = 0.5;
    particles.burst(a.x, top + a.height * 0.4, { type: 'sparkle', count: n > 1 ? 14 : 8, colors: [MOVE_COL[move], '#fff', d.p.color], speed: [80, 300] });
    particles.popText(a.x, top - 40, label || '+' + n, n > 1 ? '#ff7ac6' : d.p.color, n > 1 ? 50 : 44);
    snd('bb-flutter', 'sparkle', { vol: 0.4 });
    sfx('collect', { step: Math.min(12, d.streak), vol: 0.32 });
    if (quick && chance(0.35)) a.emote('heart', 0.8);
  }

  addButterfly(d, k = 0, from = null) {
    if (d.flock.length >= MAX_FLOCK) { d.flock[(this.scores[d.i] + k) % MAX_FLOCK].col = pick(BFLY); return; }
    const src = from || { x: TEACHER.x + rand(-60, 60), y: TEACHER.y - 200 };
    d.flock.push({
      col: pick(BFLY), ang: rand(TAU), spd: rand(1.4, 2.4) * (chance(0.5) ? 1 : -1), r: rand(0.5, 0.8), yo: rand(0.2, 0.95),
      ph: rand(TAU), sx: src.x, sy: src.y, arrive: 0, delay: k * 0.12, s: rand(48, 66),
    });
  }

  /** End of a beat: score the statues, then Madame reacts. */
  endBeat(b) {
    let right = 0;
    for (const d of this.dancers) {
      if (b.ans === 'statue' && !d.moved) {
        d.got = true;
        this.award(d, 2, false, 'statue', 'Statue! +2');
        d.a.playOnce('balance', 0.7, 'idle'); d.a.flash('#ffffff', 0.2);
        snd('ob-statue', 'stamp', { vol: 0.4 });
      }
      if (d.got) right++; else d.streak = 0;
      d.a.tint(null); d.stoneK = 0;
    }
    const frac = right / this.n;
    if (b.golden) {
      if (frac >= 0.5) { this.teacherSay(pick(['Très bien!', 'Merci!', 'Parfait!']), 1.1); this.fluster = Math.max(0, this.fluster - 0.04); }
      else this.huff();
    } else if (frac >= 0.5) this.huff();
    else { this.teacherSay(pick(['Hmm!', 'Très bien...?']), 1.0); }
  }

  /** Madame gets more flustered: stamp, sproing, huff. */
  huff() {
    this.fluster = Math.min(1, this.fluster + 0.075);
    // a proper reaction pose (and a pause to show it), while the class laughs
    this.react = nextKind(this.lastReact, ['huff', 'scold']); this.lastReact = this.react; this.reactT = 0.75;
    this.gap = 0.6;
    let v = 0;
    for (const d of this.dancers) {
      if (!d.got) continue;
      later(() => { if (this.phase === 'dance' && !d.a._once) d.a.playOnce('laugh', 0.6, 'idle'); if (v++ < 2) voice(d.p.charId, 'laugh'); }, 260 + rand(0, 200));
    }
    this.stampT = 0.01; this.sproingT = 1;
    this.teacherSay(pick(HUFFS), 1.2);
    later(() => { snd('ob-stamp', 'stomp', { vol: 0.5 }); fx.shake(5, 0.15); particles.burst(TEACHER.x + 20, TEACHER.y - 10, { type: 'dust', count: 10, colors: ['#ffe3f1', '#fff'], speed: [80, 220] }); }, 180);
    snd('ob-sproing', 'boing', { vol: 0.45 });
    snd('ob-huff', 'squeak', { vol: 0.35 });
    if (this.fluster > 0.25 && Math.random() < 0.6) particles.burst(TEACHER.x, TEACHER.y - TEACHER.h * 0.95, { type: 'smoke', count: 5, colors: ['#ffffff', '#ffd6ec'], speed: [60, 160] });
    if (this.fluster >= 0.42 && !this.tiara) this.popTiara();
  }

  popTiara() {
    this.tiara = { x: TEACHER.x + 6, y: TEACHER.y - TEACHER.h * 0.92, vx: 260, vy: -900, rot: 0, orbit: -1 };
    snd('ob-tiara', 'pop', { vol: 0.5 });
    particles.burst(this.tiara.x, this.tiara.y, { type: 'sparkle', count: 14, colors: ['#ffd23f', '#fff'], speed: [100, 300] });
    this.banner = { text: 'Oh no, her tiara!', t: 0, color: '#ffd23f', y: 640, size: 90 };
  }

  // --- update ------------------------------------------------------------------
  preUpdate(dt) {
    this.t += dt;
    for (const d of this.dancers) d.a.update(dt);
  }

  update(dt) {
    this.t += dt;
    this.time += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.8) this.banner = null; }
    if (this.say) { this.say.t += dt; if (this.say.t > this.say.dur) this.say = null; }
    this.updateMadame(dt);
    if (this.phase === 'dance') this.updateDance(dt);
    else if (this.phase === 'silly') this.updateSilly(dt);
    else this.updateBow(dt);
    this.updateDancers(dt);
    this.updateSwarm(dt);
    this.updatePetals(dt);
  }

  postUpdate(dt) {
    this.t += dt;
    this.updateMadame(dt);
    this.updateDancers(dt);
    this.updatePetals(dt);
    this.updateSwarm(dt);
  }

  updateMadame(dt) {
    this.flusterShow = lerp(this.flusterShow, this.fluster, 1 - Math.exp(-4 * dt));
    if (this.stampT > 0) { this.stampT += dt / 0.55; if (this.stampT >= 1) this.stampT = 0; }
    this.sproingT = Math.max(0, this.sproingT - dt * 1.4);
    this.laughT = Math.max(0, this.laughT - dt);
    this.reactT = Math.max(0, this.reactT - dt);
    if (this.reactT <= 0) this.react = null;
    // imp
    const im = this.imp, b = this.beat;
    im.t += dt;
    let want = 0;
    if (b && this.phase === 'dance') {
      if (b.golden) want = b.t < 1.1 ? 1 : 0;
      else want = b.t > b.flipAt - 0.55 && b.t < b.flipAt + 0.75 ? 1 : 0;
    }
    if (this.phase === 'silly' || (this.phase === 'bow' && this.bowT < 2)) want = 1;
    im.show = clamp(im.show + (want ? dt * 5 : -dt * 4), 0, 1);
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
    // flying wig
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
          this.wig = null; this.wigOff = false; this.wigAskew = true;
          snd('ob-wig', 'pop', { vol: 0.5 }); this.sproingT = 1; this.teacherSay('Hmph!', 1);
          particles.burst(TEACHER.x, TEACHER.y - TEACHER.h * 0.85, { type: 'star', count: 8, colors: ['#b98bff', '#fff'] });
        }
      }
    }
  }

  updateDance(dt) {
    this.gap = Math.max(0, this.gap - dt);
    if (!this.beat && this.gap <= 0 && this.time + 1.2 < GIVEUP_AT) this.nextBeat();
    const b = this.beat;
    if (b) this.updateBeat(b, dt);
    if (this.stormT < 0 && this.time >= STORM_AT && !this.beat?.golden) this.startStorm();
    // CPU players
    for (const d of this.dancers) {
      if (!d.p.isAI) continue;
      const c = d.p.ctrl;
      if (d.ai && this.beat) {
        const nx = d.ai.plan[0];
        if (nx && this.beat.t >= nx.at) {
          d.ai.plan.shift();
          this.aiDo(d, nx.move);
        }
      }
      if (d.aiRelease > 0) { d.aiRelease -= dt; if (d.aiRelease <= 0) c.move(0, 0); }
    }
    for (const d of this.dancers) this.readInput(d);
    if (!this.beat && this.time >= GIVEUP_AT - 1.2) this.startSilly();
  }

  updateBeat(b, dt) {
    b.t += dt;
    if (!b.golden && !b.flipped && b.t >= b.flipAt) this.flipCard();
    if (b.golden && !b.shooed && b.t > 0.55) {
      b.shooed = true;
      snd('ob-shoo', 'whoosh', { vol: 0.45 });
      particles.burst(CARD.x - 160, CARD.y + 150, { type: 'star', count: 8, colors: ['#ffd23f', '#fff'] });
    }
    // statue beats: still dancers slowly turn to stone (a nice clear "yes, keep still!")
    if (b.ans === 'statue' && b.flipped) {
      for (const d of this.dancers) if (!d.moved) { d.stoneK = Math.min(0.55, d.stoneK + dt * 0.5); d.a.tint('#cfc6dd', d.stoneK); }
    }
    // everyone got it: move on fast (momentum!)
    if (!b.early && b.ans !== 'statue' && b.flipped && b.t > b.flipAt + 0.3 && this.dancers.every((d) => d.got)) { b.early = true; b.len = Math.min(b.len, b.t + 0.45); }
    if (b.t >= b.len) {
      this.endBeat(b);
      this.beat = null;
      if (this.gap <= 0 && this.time + 1.2 < GIVEUP_AT) this.nextBeat();
    }
  }

  aiDo(d, move) {
    const c = d.p.ctrl;
    if (move === 'twirl') c.press('a');
    else if (move !== 'statue') {
      c.move(move === 'left' ? -1 : move === 'right' ? 1 : 0, move === 'up' ? -1 : move === 'down' ? 1 : 0);
      d.aiRelease = 0.14;
    }
  }

  startStorm() {
    this.stormT = 0;
    this.banner = { text: 'Ah... CHOO!', t: 0, color: '#6fd0ff', y: 640, size: 130 };
    snd('ob-sneeze', 'pt-honk', { vol: 0.6 });
    snd('bb-swarm', 'magic', { vol: 0.55 });
    fx.shake(12, 0.35); fx.flash('#ffffff', 0.15);
    this.api.camera && this.api.camera.punch(TEACHER.x, TEACHER.y - 160, 1.12, 0.5);
    this.teacherSay('Ah... CHOO!', 1.2);
    later(() => { if (this.phase !== 'dance') return; this.react = 'shock'; this.reactT = 1.1; this.teacherSay('Mon dieu! My wig!', 1.3); snd('ob-gasp', 'crowd-gasp', { vol: 0.45 }); }, 550);
    this.wigOff = true;
    this.wig = { x: TEACHER.x, y: TEACHER.y - TEACHER.h * 0.85, vx: rand(-1, 1) > 0 ? 520 : -520, vy: -1100, rot: 0, t: 0, back: false };
    snd('ob-wig', 'whoosh', { vol: 0.5 });
    for (let i = 0; i < 70; i++) {
      this.swarm.push({ x: -100 - rand(900), y: rand(180, 900), vy: rand(-40, 40), vx: rand(650, 950), col: pick(BFLY), s: rand(34, 60), ph: rand(TAU) });
    }
    // two gift butterflies for everyone, dropping out of the swarm, and a giggle
    for (const d of this.dancers) { d.giftT = 0.4 + (d.hx / W) * 0.9; d.a.playOnce('laugh', 1.0, 'idle'); }
  }

  giveGift(d) {
    this.scores[d.i] += 2;
    this.addButterfly(d, 0, { x: d.a.x - 300, y: d.a.y - 400 }); this.addButterfly(d, 1, { x: d.a.x - 300, y: d.a.y - 360 });
    particles.popText(d.a.x, d.a.y - d.a.height - 40, '+2', '#6fd0ff', 46);
    d.a.emote('exclaim', 0.6);
    sfx('collect', { step: 6, vol: 0.3 });
  }

  startSilly() {
    this.phase = 'silly'; this.sillyT = 0; this.beat = null;
    this.fluster = 1;
    this.teacherSay('Oh là là... I give up!', 1.8);
    this.laughT = 99;
    this.banner = { text: 'Silly dance!', t: 0, color: '#ff7ac6', y: 640, size: 140 };
    snd('ob-giveup', 'pt-slide-whistle', { vol: 0.6 });
    snd('bb-freestyle', 'fanfare', { vol: 0.5 });
    fx.flash('#fff0fa', 0.2); fx.shake(8, 0.3);
    particles.confettiRain(W, 70);
    if (!this.tiara) this.popTiara();
    for (const d of this.dancers) { d.a.tint(null); d.a.playOnce('laugh', 0.8, 'idle'); }
  }

  updateSilly(dt) {
    this.sillyT += dt;
    if (Math.random() < dt * 4) particles.burst(TEACHER.x + rand(-140, 140), TEACHER.y - rand(60, 300), { type: 'note', count: 1, colors: RAINBOW, speed: [60, 160] });
    for (const d of this.dancers) {
      if (!d.p.isAI) continue;
      const c = d.p.ctrl;
      d.freeT = (d.freeT ?? rand(0.2, 0.5)) - dt;
      if (d.freeT <= 0) {
        const lvl = clamp(d.p.aiLevel ?? 0, 0, 2);
        d.freeT = rand(...[[0.6, 1.0], [0.5, 0.8], [0.42, 0.65]][lvl]);
        this.aiDo(d, pick(['up', 'down', 'left', 'right', 'twirl']));
      }
      if (d.aiRelease > 0) { d.aiRelease -= dt; if (d.aiRelease <= 0) c.move(0, 0); }
    }
    for (const d of this.dancers) this.readInput(d);
    if (this.time >= PLAY_TIME) this.startBow();
  }

  startBow() {
    this.phase = 'bow'; this.bowT = 0; this.beat = null;
    this.banner = { text: 'Bravo!', t: 0, color: '#ffd23f', y: 640, size: 140 };
    for (const d of this.dancers) { d.a.setPose('bow'); d.move = null; d.p.isAI && d.p.ctrl.move(0, 0); }
    snd('applause', 'cheer', { vol: 0.6 });
    sfx('fanfare', { vol: 0.5 });
    fx.flash('#fff', 0.25);
    this.teacherSay('Bravo!', 1.4);
    for (let i = 0; i < 160; i++) this.petals.push(this.newPetal(rand(-900, -20)));
  }

  newPetal(y) {
    return { x: rand(W), y, vx: rand(-40, 40), vy: rand(120, 260), rot: rand(TAU), spin: rand(-4, 4), s: rand(20, 36), c: pick(['#ff9fcf', '#ffc4e6', '#ff7ac6', '#fff0f8', '#ffd0a8']), ph: rand(TAU) };
  }

  updateBow(dt) {
    this.bowT += dt;
    if (this.bowT > 1.1 && !this.bowed2) {
      this.bowed2 = true;
      for (const d of this.dancers) d.a.setPose(chance(0.5) ? 'celebrate' : 'laugh');
      particles.confettiRain(W, 80);
      fx.slowmo(0.6, 0.5);
    }
    if (this.bowT > BOW_LEN && !this.done) this.finish();
  }

  updateDancers(dt) {
    for (const d of this.dancers) {
      const a = d.a;
      d.cool = Math.max(0, d.cool - dt);
      if (d.giftT > 0) { d.giftT -= dt; if (d.giftT <= 0) this.giveGift(d); }
      if (d.wobbleT > 0) { d.wobbleT -= dt; if (d.wobbleT <= 0) a.playOnce('balance', 0.5, 'idle'); }
      if (d.sillyT > 0) {
        d.sillyT -= dt;
        if (d.sillyT <= 0 && this.phase !== 'bow') {
          a.playOnce(SILLY, 0.55, 'idle'); a.squash(0.25);
          snd('ob-silly', 'boing', { vol: 0.25 });
          if (chance(0.3)) a.emote('happy', 0.8);
        }
      }
      d.glowT = Math.max(0, d.glowT - dt);
      let ox = 0, z = 0;
      if (d.move) {
        d.mt += dt;
        const k = clamp(d.mt / MOVE_TIME, 0, 1), s = Math.sin(k * Math.PI);
        if (d.move === 'left' || d.move === 'right') ox = d.dir * 80 * s;
        if (d.move === 'up') z = 46 * s;
        if (d.move === 'twirl') { const flip = Math.floor(d.mt / 0.075) % 2; a.facing = flip ? -1 : 1; z = 14 * s; }
        if (k >= 1) { d.move = null; a.facing = d.hx < W / 2 ? 1 : -1; }
        if (d.move && Math.random() < dt * 30) particles.trail(a.x + rand(-30, 30), a.y - rand(0, a.height), { type: 'sparkle', colors: [MOVE_COL[d.move], '#fff'], size: [6, 12], speed: [10, 60], life: [0.3, 0.6] });
      }
      a.x = d.hx + ox; a.y = d.hy; a.z = z;
      a.update(dt);
      for (const b of d.flock) {
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.arrive = Math.min(1, b.arrive + dt * 1.6);
        b.ang += b.spd * dt * (this.phase === 'bow' ? 1.8 : 1);
      }
    }
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
    const top = Math.max(...this.scores);
    // gentle: dancers within a few butterflies of each other share a place
    const placements = placementsFromScores(this.scores.map((v) => Math.floor((v + 4 - (top % 5)) / 5)));
    const best = this.byIndex[this.scores.indexOf(top)];
    this.api.finish({
      placements,
      stats: this.scores.map((s, i) => `${s} butterflies${this.cheeky[i] ? ` · ${this.cheeky[i]} cheeky` : ''}`),
      focus: { x: best.a.x, y: best.a.y - best.a.height * 0.5 },
    });
  }

  // --- draw --------------------------------------------------------------------
  draw(g) {
    drawStageBg(g, this.t, this.phase === 'dance' ? 0 : 1);
    this.drawMadame(g);
    this.drawCard(g);
    // dancers (back row first) with their flocks
    for (const d of this.dancers) this.drawFlock(g, d, false);
    for (const d of this.dancers) {
      if (d.glowT > 0) {
        g.save(); g.globalAlpha = d.glowT * 1.2; g.fillStyle = d.p.color;
        g.beginPath(); g.ellipse(d.a.x, d.a.y, 90 * d.a.scale, 24 * d.a.scale, 0, 0, TAU); g.fill(); g.restore();
      }
      d.a.draw(g, { ring: d.p.color });
      this.drawFlock(g, d, true);
    }
    for (const d of this.dancers) {
      const a = d.a, top = a.y - a.z - a.height - 26 - (a.emotes.length ? 50 : 0);
      if (this.time < 5 || this.n > 1) ui.playerTag(g, d.p, a.x, top);
      if (d.got && this.beat) this.drawCheck(g, a.x + 50, top - 20, d.p.color);
    }
    for (const s of this.swarm) drawButterfly(g, s.x, s.y, s.s, s.col, Math.sin(this.t * 16 + s.ph), 0.9 + Math.sin(this.t * 4 + s.ph) * 0.2);
    for (const p of this.petals) drawPetal(g, p.x, p.y, p.s, p.rot, p.c);
  }

  drawMadame(g) {
    const b = this.beat;
    let tm = null, tk = 0, side = 1;
    if (this.phase === 'bow') { tm = 'bow'; tk = clamp(this.bowT / 1.1, 0, 1) * 0.5 + 0.25; }
    else if (this.phase === 'silly') { tm = 'silly'; tk = 0.5; }
    else if (b) { tm = TEACH[b.move]; tk = tm === 'statue' ? 0.5 : clamp(b.t / 0.95, 0, 1); side = b.move === 'left' ? -1 : 1; }
    const R = this.phase === 'dance' ? this.react : null;
    if (R) tm = null;   // she stops to react
    drawTeacher(g, TEACHER.x, TEACHER.y, TEACHER.h, this.t, tm, tk, side, {
      react: R,
      fluster: this.phase === 'dance' ? this.flusterShow : 0.3, stamp: this.stampT, sproing: this.sproingT,
      wigOff: this.wigOff, tiaraOff: !!this.tiara, laugh: this.phase !== 'dance' || (this.stormT >= 0 && this.stormT < 1),
    });
    // the askew wig after the sneeze: a little crooked tilt line
    if (this.wigAskew && !this.wigOff && this.phase === 'dance') {
      g.save(); g.globalAlpha = 0.9; g.fillStyle = '#b98bff'; g.strokeStyle = NAVY; g.lineWidth = 3;
      g.translate(TEACHER.x + 26, TEACHER.y - TEACHER.h * 0.95 + Math.sin(this.t * 2.4) * 10); g.rotate(0.5);
      g.beginPath(); g.ellipse(0, 0, 12, 7, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
    }
    if (b && b.t < 0.9) {
      const k = b.t / 0.9;
      g.save(); g.globalAlpha = 1 - k; g.strokeStyle = b.golden ? '#ffd23f' : MOVE_COL[b.move]; g.lineWidth = 10;
      g.beginPath(); g.arc(TEACHER.x, TEACHER.y - TEACHER.h * 0.55, 120 + k * 160, 0, TAU); g.stroke(); g.restore();
    }
    if (R) {
      // code-drawn extras (they stand in for the reaction art until it lands)
      const hx = TEACHER.x, hy = TEACHER.y - TEACHER.h * 0.84, k = clamp((R === 'shock' ? 1.1 : 0.75) - this.reactT, 0, 0.15) / 0.15;
      if (R === 'shock') drawShock(g, hx, hy, TEACHER.h * 0.2, this.t, k);
      else if (R === 'huff') drawSteam(g, hx, hy - 10, TEACHER.h * 0.17, this.t);
      else drawWag(g, hx - TEACHER.h * 0.26, hy + TEACHER.h * 0.12, TEACHER.h / 300, this.t, -1);
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
      const s = this.say, k = ease.outBack(clamp(s.t / 0.25, 0, 1)), a = clamp((s.dur - s.t) / 0.25, 0, 1);
      const bx = TEACHER.x - 250, by = TEACHER.y - TEACHER.h + 40;
      g.save(); g.globalAlpha = a; g.translate(bx, by); g.scale(k, k);
      g.font = `800 40px ${ui.FONT}`;
      const w = Math.max(160, g.measureText(s.text).width + 50);
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
      drawButterfly(g, x, y, b.s * (0.85 + depth * 0.15) * a.scale, b.col, Math.sin(this.t * 15 + b.ph), Math.cos(b.ang) * 0.4 * Math.sign(b.spd));
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

  drawCard(g) {
    const b = this.beat;
    const silly = this.phase === 'silly';
    const s = CARD.s;
    if (b || silly) {
      const pop = b ? ease.outBack(clamp(b.t / 0.3, 0, 1)) : 1;
      // flip: squash x through zero, swapping faces at the middle
      let fk = 1, back = false;
      if (b && !b.golden) {
        const u = clamp((b.t - b.flipAt) / 0.4, 0, 1);
        fk = Math.abs(Math.cos(u * Math.PI)); back = u >= 0.5;
        if (b.t < b.flipAt) fk = 1;
      }
      const wob = Math.sin(this.t * 5) * 0.03;
      g.save(); g.translate(CARD.x, CARD.y); g.scale(pop * Math.max(0.04, fk), pop); g.rotate(wob);
      if (silly) {
        ui.panel(g, -s / 2, -s / 2, s, s, { r: 40, fill: '#fff', stroke: '#ff7ac6', lineWidth: 10 });
        ['up', 'down', 'left', 'twirl'].forEach((m, k) => drawMovePicto(g, m, (k % 2 - 0.5) * s * 0.46, (Math.floor(k / 2) - 0.5) * s * 0.46, s * 0.4, this.t + k));
      } else if (b.golden) {
        // the golden "copy me for real" card
        if (!drawArt(g, 'prop/oballet-card-gold', 0, 0, s, s)) {
          const gg = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
          gg.addColorStop(0, '#fff3b0'); gg.addColorStop(0.5, '#ffd23f'); gg.addColorStop(1, '#ff9f1c');
          ui.panel(g, -s / 2, -s / 2, s, s, { r: 40, fill: gg, lineWidth: 8 });
          ui.panel(g, -s / 2 + 22, -s / 2 + 22, s - 44, s - 44, { r: 28, fill: '#fffaf0', shadow: false, lineWidth: 4 });
        }
        drawMovePicto(g, b.move, 0, 0, s * 0.72, this.t);
        if (Math.random() < 0.35) particles.trail(CARD.x + rand(-s / 2, s / 2), CARD.y + rand(-s / 2, s / 2), { type: 'sparkle', colors: ['#ffd23f', '#fff'], size: [8, 16], speed: [10, 50], life: [0.4, 0.8] });
      } else if (!back) {
        ui.panel(g, -s / 2, -s / 2, s, s, { r: 40, fill: '#fff', stroke: MOVE_COL[b.move], lineWidth: 10 });
        drawMovePicto(g, b.move, 0, 0, s * 0.72, this.t);
      } else {
        // the cheeky flipped side: rainbow frame, the opposite move, flip badge
        const rg = g.createLinearGradient(-s / 2, 0, s / 2, 0);
        RAINBOW.forEach((c, i) => rg.addColorStop(i / (RAINBOW.length - 1), c));
        ui.panel(g, -s / 2, -s / 2, s, s, { r: 40, fill: rg, lineWidth: 8 });
        ui.panel(g, -s / 2 + 18, -s / 2 + 18, s - 36, s - 36, { r: 28, fill: '#fff', shadow: false, lineWidth: 4 });
        drawMovePicto(g, b.ans, 0, 0, s * 0.72, this.t);
        // little picture of what Madame did, top-left, with the swirl arrow
        g.save(); g.translate(-s * 0.5, -s * 0.5);
        ui.panel(g, -46, -46, 92, 92, { r: 20, fill: '#fff', stroke: MOVE_COL[b.move], lineWidth: 5, shadow: false });
        drawMovePicto(g, b.move, 0, 0, 72, this.t);
        g.restore();
        drawFlipArrow(g, s * 0.5, -s * 0.5, 96, Math.sin(this.t * 4) * 0.4);
      }
      if (b && !silly) {
        // time ring
        const left = 1 - clamp(b.t / b.len, 0, 1);
        g.strokeStyle = NAVY; g.lineWidth = 12; g.lineCap = 'round'; g.globalAlpha = 0.25;
        g.beginPath(); g.arc(s * 0.5 - 6, s * 0.5 - 6, 30, 0, TAU); g.stroke(); g.globalAlpha = 1;
        g.strokeStyle = left < 0.3 ? '#ff4d6d' : b.golden ? '#ff9f1c' : MOVE_COL[b.ans];
        g.beginPath(); g.arc(s * 0.5 - 6, s * 0.5 - 6, 30, -Math.PI / 2, -Math.PI / 2 + TAU * left); g.stroke();
      }
      g.restore();
      // the imp
      this.drawImpAt(g, b);
      // big control hint on the left
      g.save(); g.translate(HINT.x, HINT.y); g.scale(pop, pop);
      const showAns = silly || b.golden || b.flipped;
      const col = silly ? '#ff7ac6' : b.golden ? '#ffd23f' : showAns ? MOVE_COL[b.ans] : '#d9cfe9';
      ui.panel(g, -130, -130, 260, 260, { r: 130, fill: 'rgba(255,255,255,0.88)', stroke: col, lineWidth: 8 });
      if (silly) drawAnswerHint(g, ['up', 'left', 'down', 'right', 'twirl'][Math.floor(this.t * 2) % 5], 0, 0, 110, this.t);
      else if (showAns) drawAnswerHint(g, b.ans, 0, 0, 110, this.t);
      else {
        // before the flip: a spinning swirl arrow and a big "?" (think: what's the opposite?)
        drawFlipArrow(g, 0, 0, 170, this.t * 3);
        ui.text(g, '?', 0, 6, { size: 110, color: '#b98bff' });
      }
      g.restore();
    }
  }

  drawImpAt(g, b) {
    const im = this.imp;
    if (im.show <= 0.01) return;
    const s = CARD.s, k = ease.outBack(im.show);
    let x = CARD.x - s * 0.5 - 30, y = CARD.y + s * 0.5 + 40 - k * 80, pose = 'peek', flip = 1, scale = 150;
    if (this.phase === 'silly' || this.phase === 'bow') {
      // the imp dances too
      x = CARD.x - s * 0.62; y = CARD.y + s * 0.42 - Math.abs(Math.sin(this.t * 7)) * 50; flip = Math.sin(this.t * 3) > 0 ? 1 : -1;
    } else if (b && b.golden) {
      // shooed away: tumbles off the card
      pose = 'shoo';
      const u = clamp((b.t - 0.55) / 0.6, 0, 1);
      x += u * -220; y += -Math.sin(u * Math.PI) * 160 + u * 200;
    } else if (b) {
      const u = clamp((b.t - b.flipAt + 0.15) / 0.45, 0, 1);
      if (u > 0) { pose = 'flip'; x += Math.sin(u * Math.PI) * 120; y -= Math.sin(u * Math.PI) * 180; }
      if (b.intro) scale = 190;
    }
    g.save(); g.globalAlpha = clamp(im.show * 1.5, 0, 1);
    drawImp(g, x, y, scale * (0.6 + 0.4 * k), this.t, pose, flip);
    g.restore();
  }

  drawHUD(g) {
    ui.scoreboard(g, this.players, this.scores, { y: 18, avoidCenter: true, format: (v) => String(v) });
    ui.timer(g, Math.max(0, PLAY_TIME - this.time), W / 2, 58);
    if (this.banner) {
      const k = this.banner.t;
      g.save(); g.globalAlpha = clamp((1.8 - k) / 0.4, 0, 1);
      ui.banner(g, this.banner.text, k, { y: this.banner.y || 600, size: this.banner.size || 130, color: this.banner.color });
      g.restore();
    }
  }
}
