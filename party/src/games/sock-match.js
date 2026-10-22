// Silly Sock Match (Molly Party) - laundry day! The basket bursts a fountain
// of silly socks onto the lawn. Grab a sock (A) and run it to its twin: the
// pair spin-dances and rockets up to the laundry line. Two friends holding
// twins can high-five them together. A cheeky puppy zooms around stealing
// socks - catch him and he drops it. When the line is full, every pair does
// a dance and flies off into the sky. Cooperative: everyone shares the line.
//
// Art hooks (all optional, procedural fallbacks ship today): bg/sock-match,
// thumb/sock-match, prop/sock-<pattern> (stripes dots hearts stars googly
// rainbow zigzag flowers checks paws), prop/sock-puppy[-run|-bow],
// prop/sock-basket, prop/clothespin.
// Sounds with synth fallbacks: sock-pickup, sock-match, sock-rocket,
// sock-pin, sock-basket-burst, sock-puppy-yip, sock-puppy-grab, sock-flyoff.
import { W, H } from '../engine/canvas.js';
import { easySteer } from '../engine/easy.js';
import { Actor } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { sfx, voice } from '../engine/audio.js';
import { fx } from '../engine/fx.js';
import { aiProfile, reactionTime, Brain, steer } from '../engine/ai.js';
import { bodyRadius, spread } from '../engine/crowd.js';
import { clamp, rand, pick, chance, shuffle, TAU, ease } from '../engine/util.js';
import { art } from '../engine/art.js';
import { PATTERNS, PAT_COLOR, drawSock, drawPuppy, drawBasket, drawLine, drawPin, drawYard, lineY, LINE } from './sock-match/draw.js';

export const meta = {
  id: 'sock-match',
  title: 'Silly Sock Match',
  category: 'molly',
  type: 'Team',
  goal: 'Find each silly sock its twin and hang the pairs on the line!',
  controls: [['stick', 'Run'], ['a', 'Grab a sock']],
  tips: ['Carry a sock to the one that looks the same.', 'The puppy steals socks! Run into him and he drops it.', 'Holding twins with a friend? Run together for a high-five!'],
  // Molly Easy: you walk by yourself to a sock, A grabs it, then you carry it to its twin
  goalEasy: 'Press A to go grab a sock. You carry it to its twin all by yourself!',
  controlsEasy: [['a', 'Grab a sock / catch the puppy'], ['stick', 'Move with either stick if you like']],
  tipsEasy: ['Press A: you walk to the nearest sock and grab it.', 'Want a different sock? Walk over with the stick, then press A!', 'The puppy has a sock? Press A when he runs by!'],
  music: 'bouncy',
  duration: '60 sec',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: true,
  drawIcon(g, x, y, w, h, t = 0) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const s = w / 400;
    g.translate(x, y); g.scale(s, s);
    const hh = h / s;
    const grd = g.createLinearGradient(0, 0, 0, hh);
    grd.addColorStop(0, '#8fd0ff'); grd.addColorStop(0.6, '#d8f1ff'); grd.addColorStop(0.6, '#8ad873'); grd.addColorStop(1, '#5fc65a');
    g.fillStyle = grd; g.fillRect(0, 0, 400, hh);
    g.strokeStyle = '#24163f'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 40); g.quadraticCurveTo(200, 80, 400, 40); g.stroke();
    ['stripes', 'googly', 'hearts', 'dots', 'rainbow'].forEach((p, i) => {
      const px = 40 + i * 80, py = 52 + Math.sin((px / 400) * Math.PI) * 18;
      g.save(); g.translate(px, py + 30); g.rotate(Math.sin(t * 3 + i) * 0.12); drawSock(g, p, 0.42, t, i % 2 === 1); g.restore();
    });
    // dancing pair
    for (const k of [-1, 1]) { g.save(); g.translate(230 + k * 26, hh * 0.58 + Math.sin(t * 8 + k) * 8); g.rotate(k * 0.3 + Math.sin(t * 6) * 0.2); drawSock(g, 'stars', 0.5, t, k > 0); g.restore(); }
    g.save(); g.translate(110, hh * 0.95); g.scale(0.62, 0.62); drawPuppy(g, 'run', 1, t, 'stripes'); g.restore();
    g.restore();
  },
};

// --- tuning -----------------------------------------------------------------
const DURATION = 60;
const STORM_AT = 15;
const FIELD = { x0: 170, x1: 1590, y0: 620, y1: 950 };     // where socks land
const FLOOR = { x0: 100, x1: W - 100, y0: 600, y1: 990 };   // where players run
const BASKET = { x: 1745, y: 1040 };
// prop/sock-basket (360x260 art px, drawn 260 wide bottom-centred): top of the front
// rope rim, left to right; socks bursting out start behind it
const BASKET_RIM = [[0, 60], [20, 62], [60, 68], [100, 76], [140, 80], [180, 81], [220, 80], [260, 76], [300, 68], [340, 62], [360, 60]];
const MAX_SPEED = 660;
const ACCEL = 4400;
const REACH = 105;           // grab distance
const MATCH_R = 125;         // auto-match: hold a sock close to its twin
const FIVE_R = 175;          // two friends holding twins
const SLOTS = 12;            // pairs on the line before the big fly-off
const CPU_CAP = [0.6, 0.72, 0.85];   // CPUs stay gentler than the other shelves

const snd = (k, fb, o = {}) => sfx(k, { ...o, fallback: fb });
let sockSerial = 0;

export class Game {
  constructor(api) {
    this.api = api;
    this.easy = !!api.easy;   // Molly Easy: humans walk by themselves, A grabs
    this.players = api.players;
    const n = this.players.length;
    this.n = n;
    this.t = 0; this.time = 0;
    this.timeLeft = DURATION;
    this.done = false;
    this.storm = false; this.stormT = 0;
    this.scale = n <= 4 ? 1 : n <= 6 ? 0.9 : 0.82;
    this.pairsPerWave = n <= 2 ? 6 : n <= 4 ? 7 : 8;
    this.socks = [];
    this.line = [];           // pairs on the line: { pat, slot, t }
    this.flyers = [];         // pairs flying off into the sky
    this.total = 0;           // pairs matched by everyone
    this.waves = 0;
    this.basketSq = 0;
    this.waveCheckT = 0;
    this.bannerT = -9; this.bannerText = '';
    this.puppy = { x: 300, y: 820, vx: 0, vy: 0, dir: 1, state: 'roam', st: 0, tx: 600, ty: 800, sock: null, stealT: rand(5, 7), yipT: 0 };
    this.ents = this.players.map((p, i) => {
      const x = n === 1 ? W / 2 : 260 + ((W - 620) * i) / (n - 1);
      const y = 640 + (i % 2) * 60;
      const a = new Actor(p, { scale: this.scale, x, y });
      a.facing = x < W / 2 ? 1 : -1; a.snap();
      return { p, a, i, x, y, vx: 0, vy: 0, held: null, heldT: 0, score: 0, cool: 0, bumpT: 0, brain: new Brain(p), plan: null,
        auto: this.easy && !p.isAI ? { ix: 0, iy: 0, sock: null, t: 0 } : null };
    });
    this.burst(this.pairsPerWave, true);
  }

  // ------------------------------------------------------------------ socks
  /** The basket shoots `pairs` pairs of socks onto the lawn. */
  burst(pairs, instant = false) {
    this.waves++;
    const onGround = new Set(this.socks.filter((s) => s.state !== 'gone').map((s) => s.pat));
    let pats = shuffle(PATTERNS.filter((p) => !onGround.has(p)));
    if (pats.length < pairs) pats = pats.concat(shuffle(PATTERNS.filter((p) => onGround.has(p))));
    pats = pats.slice(0, pairs);
    const list = [];
    for (const pat of pats) for (const k of [0, 1]) list.push({ pat, flip: k === 1 });
    shuffle(list).forEach((o, i) => {
      const spot = this.freeSpot();
      const s = {
        id: sockSerial++, pat: o.pat, flip: o.flip, state: instant ? 'ground' : 'fly', x: instant ? spot.x : BASKET.x - 20, y: instant ? spot.y : BASKET.y - 140,
        sx: BASKET.x - 20, sy: BASKET.y - 140, tx: spot.x, ty: spot.y, ft: -i * 0.06, fdur: rand(0.7, 0.95), rot: rand(-0.35, 0.35), spin: rand(-12, 12), sq: 0, wob: rand(TAU), by: null,
      };
      this.socks.push(s);
    });
    if (!instant) {
      this.basketSq = 0.6;
      snd('sock-basket-burst', 'bigpop', { vol: 0.8 }); sfx('whoosh');
      particles.burst(BASKET.x, BASKET.y - 160, { type: 'confetti', count: 30, speed: [300, 700] });
      fx.shake(8, 0.25);
    }
  }

  freeSpot() {
    let best = null, bd = -1;
    for (let k = 0; k < 24; k++) {
      const x = rand(FIELD.x0, FIELD.x1), y = rand(FIELD.y0, FIELD.y1);
      let d = 1e9;
      for (const s of this.socks) if (s.state === 'ground' || s.state === 'fly') d = Math.min(d, Math.hypot(s.tx - x, (s.ty - y) * 1.4));
      for (const e of this.ents || []) d = Math.min(d, Math.hypot(e.x - x, (e.y - y) * 1.4) + 40);
      if (d > bd) { bd = d; best = { x, y }; }
      if (d > 220) break;
    }
    return best;
  }

  // ------------------------------------------------------------------ update
  preUpdate(dt) {
    this.t += dt;
    for (const e of this.ents) { e.a.moveAnim(0, 0, 1); e.a.update(dt); }
    this.updatePuppy(dt, true);
  }

  update(dt) {
    this.t += dt; this.time += dt;
    this.timeLeft = Math.max(0, DURATION - this.time);
    if (!this.storm && this.timeLeft <= STORM_AT) this.startStorm();
    if (this.storm) this.stormT += dt;
    this.basketSq *= Math.exp(-5 * dt);
    for (const e of this.ents) {
      if (e.p.isAI && !this.done) this.aiThink(e, dt);
      if (e.auto) this.easyThink(e, dt);
      this.movePlayer(e, dt);
    }
    this.separate(dt);
    this.updateSocks(dt);
    this.updatePuppy(dt, false);
    if (!this.done) this.checkMatches();
    for (const e of this.ents) { e.a.x = e.x; e.a.y = e.y; e.a.update(dt); }
    // basket refills when the lawn is clear
    if (!this.done) {
      const left = this.socks.some((s) => s.state === 'ground' || s.state === 'fly' || s.state === 'held' || s.state === 'puppy');
      if (!left) {
        this.waveCheckT += dt;
        if (this.waveCheckT > 0.7) { this.waveCheckT = 0; this.burst(this.storm ? this.pairsPerWave + 1 : this.pairsPerWave); this.banner('More socks!'); }
      } else this.waveCheckT = 0;
    }
    if (!this.done && this.timeLeft <= 0) this.finish();
  }

  postUpdate(dt) {
    this.t += dt;
    this.updateSocks(dt);
    this.updatePuppy(dt, true);
    for (const e of this.ents) e.a.update(dt);
  }

  startStorm() {
    this.storm = true; this.stormT = 0;
    sfx('whistle'); fx.flash('#ffffff', 0.2);
    this.burst(4);
    this.banner('Sock storm!');
  }

  banner(text) { this.bannerText = text; this.bannerT = this.t; }

  updateSocks(dt) {
    for (const s of this.socks) {
      s.sq *= Math.exp(-7 * dt);
      if (s.state === 'fly') {
        s.ft += dt;
        if (s.ft < 0) continue;
        const k = clamp(s.ft / s.fdur, 0, 1);
        s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k - Math.sin(k * Math.PI) * 420;
        s.rot += s.spin * dt;
        if (k >= 1) { s.state = 'ground'; s.x = s.tx; s.y = s.ty; s.rot = rand(-0.35, 0.35); s.sq = 0.5; if (Math.random() < 0.4) sfx('land', { vol: 0.3 }); particles.burst(s.x, s.y, { type: 'dust', count: 3, color: '#fff' }); }
      } else if (s.state === 'held') {
        const e = s.by; s.x = e.x; s.y = e.y;
      } else if (s.state === 'puppy') {
        s.x = this.puppy.x; s.y = this.puppy.y;
      } else if (s.state === 'dance') {
        s.dt += dt;
        const k = s.dt;
        const ang = k * 9 + (s.side > 0 ? Math.PI : 0);
        s.x = s.cx + Math.cos(ang) * 46; s.y = s.cy - Math.abs(Math.sin(k * 10)) * 40 + Math.sin(ang) * 10;
        s.rot = Math.sin(k * 14) * 0.5;
        if (k >= 0.75) {
          s.state = 'rocket'; s.rt = 0; s.rx0 = s.x; s.ry0 = s.y - 60;
          if (s.side > 0) snd('sock-rocket', 'whoosh', { vol: 0.6, rate: 1.2 });
        }
      } else if (s.state === 'rocket') {
        s.rt += dt;
        const k = clamp(s.rt / 0.55, 0, 1), e2 = ease.inOutQuad(k);
        const tx = s.slotX + s.side * 30, ty = lineY(s.slotX) + 52;
        s.x = s.rx0 + (tx - s.rx0) * e2; s.y = s.ry0 + (ty - s.ry0) * e2 - Math.sin(k * Math.PI) * 140;
        s.rot = (1 - k) * TAU * 1.5 * s.side;
        if (Math.random() < dt * 40) particles.burst(s.x, s.y + 40, { type: 'sparkle', count: 1, colors: RAINBOW, speed: [10, 60] });
        if (k >= 1) { s.state = 'gone'; if (s.side > 0) this.pinPair(s); }
      }
    }
    this.socks = this.socks.filter((s) => s.state !== 'gone');
    for (const f of this.flyers) { f.t += dt; }
    this.flyers = this.flyers.filter((f) => f.t < 2.2);
  }

  pinPair(s) {
    this.line.push({ pat: s.pat, slot: s.slot, t: this.t });
    snd('sock-pin', 'pop', { vol: 0.5 });
    particles.burst(s.slotX, lineY(s.slotX) + 40, { type: 'star', count: 8, colors: [PAT_COLOR[s.pat], '#fff', '#ffd23f'] });
    if (this.line.length >= SLOTS) this.flyOff();
  }

  /** Line full: every pair dances and flies off into the sky. */
  flyOff() {
    for (const p of this.line) this.flyers.push({ pat: p.pat, x: this.slotX(p.slot), t: 0, d: rand(0, 0.5) });
    this.line = [];
    snd('sock-flyoff', 'cheer', { vol: 0.8 }); sfx('fanfare', { vol: 0.5 });
    fx.shake(10, 0.35); fx.flash('#fff', 0.15);
    particles.confettiRain(W, 120);
    this.banner('Wheee!');
    for (const e of this.ents) { e.a.playOnce('celebrate', 1); }
  }

  slotX(i) { return LINE.x0 + 90 + (i + 0.5) * ((LINE.x1 - LINE.x0 - 180) / SLOTS); }
  nextSlot() {
    const used = new Set(this.line.map((p) => p.slot));
    for (const s of this.socks) if (s.state === 'dance' || s.state === 'rocket') used.add(s.slot);
    for (let i = 0; i < SLOTS; i++) if (!used.has(i)) return i;
    return SLOTS - 1;
  }

  // ------------------------------------------------------------------ players
  movePlayer(e, dt) {
    const p = e.p, a = e.a, c = p.ctrl;
    e.cool = Math.max(0, e.cool - dt); e.bumpT = Math.max(0, e.bumpT - dt);
    if (e.held) e.heldT += dt;
    const ix = this.done ? 0 : e.auto ? e.auto.ix : c.x, iy = this.done ? 0 : e.auto ? e.auto.iy : c.y;
    const m = Math.hypot(ix, iy), k = m > 1 ? 1 / m : 1;
    const cap = p.isAI ? CPU_CAP[clamp(p.aiLevel ?? 0, 0, 2)] : e.auto ? (e.auto.manual ? 0.9 : 0.7) : 1;
    const tx = ix * k * MAX_SPEED * cap, ty = iy * k * MAX_SPEED * 0.85 * cap;
    const step = ACCEL * dt;
    e.vx += clamp(tx - e.vx, -step, step); e.vy += clamp(ty - e.vy, -step, step);
    e.x = clamp(e.x + e.vx * dt, FLOOR.x0, FLOOR.x1);
    e.y = clamp(e.y + e.vy * dt, FLOOR.y0, FLOOR.y1);
    if (!this.done && c.pressed('a') && e.cool <= 0) this.action(e);
    if (!a._once && !this.done) {
      const sp = Math.hypot(e.vx, e.vy);
      if (e.held && sp > 40) { a.setPose('carry'); if (Math.abs(e.vx) > 4) a.facing = e.vx > 0 ? 1 : -1; a.speed = clamp(sp / MAX_SPEED, 0, 1); }
      else a.moveAnim(e.vx, e.vy, MAX_SPEED, { run: sp > 420 });
    }
  }

  separate(dt) {
    // push apart by the drawn sprite size (the old radius let 6 of 8 stand in one blob)
    spread(this.ents, { radius: (e) => bodyRadius(e.a) * 0.85, yScale: 1.6, strength: Math.min(1, dt * 12), bounds: FLOOR });
  }

  nearestSock(e, filter = null) {
    let best = null, bd = REACH;
    for (const s of this.socks) {
      if (s.state !== 'ground' || (filter && !filter(s))) continue;
      const d = Math.hypot(s.x - e.x, (s.y - e.y) * 1.3);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  /** Molly Easy: what A does right now ('puppy' | 'grab' | null). */
  easyAction(e) {
    const pp = this.puppy;
    if (pp.sock && Math.hypot(pp.x - e.x, (pp.y - e.y) * 1.3) < 210) return 'puppy';
    if (!e.held && this.nearestSock(e)) return 'grab';
    return null;
  }

  action(e) {
    if (e.auto) {
      // Molly Easy: never swap the carried sock by accident; A grabs or catches the puppy
      const act = this.easyAction(e);
      if (act === 'puppy') return this.catchPuppy(e);
      if (act === 'grab') return this.grab(e, this.nearestSock(e));
      e.cool = 0.15;
      // A with nothing in reach: walk to the nearest sock (from here) and grab it; carrying, walk to its twin
      if (!e.auto.pushing) {
        e._ezSteer = 0; e.auto.manual = false;
        if (!e.held) { e.auto.sock = this.easyPick(e, false); e.auto.t = 3; e.auto.go = !!e.auto.sock; }
        if (e.auto.sock || e.held) return;
      }
      e.a.playOnce('look-around', 0.35);
      return;
    }
    const s = this.nearestSock(e);
    if (!s) {
      // tag the puppy if he is close
      if (this.puppy.sock && Math.hypot(this.puppy.x - e.x, (this.puppy.y - e.y) * 1.3) < 170) return this.catchPuppy(e);
      e.a.playOnce('look-around', 0.35); e.cool = 0.15;
      return;
    }
    if (e.held) {
      if (s.pat === e.held.pat) return this.match(e, e.held, s);
      // swap: drop the one in hand
      const old = e.held;
      old.state = 'ground'; old.x = e.x + (e.a.facing > 0 ? -60 : 60); old.y = clamp(e.y + 10, FIELD.y0, FLOOR.y1); old.by = null; old.sq = 0.4; old.rot = rand(-0.4, 0.4);
      sfx('boing', { vol: 0.4, fallback: 'bounce' });
    }
    this.grab(e, s);
  }

  grab(e, s) {
    s.state = 'held'; s.by = e; e.held = s; e.heldT = 0; e.cool = 0.15;
    e.a.playOnce('catch', 0.3); e.a.squash(0.25);
    snd('sock-pickup', 'collect', { vol: 0.6, step: 3 });
    particles.burst(s.x, s.y - 40, { type: 'spark', count: 7, colors: [PAT_COLOR[s.pat], '#fff'], speed: [100, 220] });
    if (!e.p.isAI) e.p.ctrl.rumble(0.2, 50);
  }

  checkMatches() {
    for (const e of this.ents) {
      const h = e.held;
      if (!h) continue;
      // carried close to a twin on the lawn
      const twin = this.nearestSock(e, (s) => s.pat === h.pat);
      if (twin && Math.hypot(twin.x - e.x, (twin.y - e.y) * 1.3) < MATCH_R) { this.match(e, h, twin); continue; }
      // a friend holding the twin: high-five!
      for (const o of this.ents) {
        if (o === e || !o.held || o.held.pat !== h.pat) continue;
        if (Math.hypot(o.x - e.x, (o.y - e.y) * 1.3) < FIVE_R) { this.match(e, h, o.held, o); break; }
      }
    }
  }

  match(e, a, b, friend = null) {
    const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 90;
    const slot = this.nextSlot();
    for (const [s, side] of [[a, -1], [b, 1]]) {
      if (s.by && s.by.held === s) s.by.held = null;
      s.by = null; s.state = 'dance'; s.dt = 0; s.cx = cx; s.cy = cy; s.side = side; s.slot = slot; s.slotX = this.slotX(slot);
    }
    this.total++;
    const who = friend ? [e, friend] : [e];
    for (const w of who) {
      w.score++; w.cool = 0.2;
      w.a.playOnce(friend ? 'high-five' : 'cheer', 0.6); w.a.squash(0.3); w.a.emote('heart', 0.9);
      particles.popText(w.x, w.y - w.a.height - 70, '+1', PAT_COLOR[a.pat], 54);
      if (!w.p.isAI) w.p.ctrl.rumble(0.45, 110);
    }
    if (friend) {
      e.a.facing = friend.x > e.x ? 1 : -1; friend.a.facing = -e.a.facing;
      sfx('ac-clap', { fallback: 'pop' }); particles.burst(cx, cy + 20, { type: 'star', count: 16, colors: ['#ffd23f', '#fff'] });
      particles.popText(cx, cy - 70, 'High five!', '#ffd23f', 50);
      fx.shake(6, 0.2);
    }
    snd('sock-match', 'match-chime', { vol: 0.8 }); sfx('giggle', { vol: 0.45 });
    particles.burst(cx, cy, { type: 'confetti', count: 22, speed: [200, 480] });
    particles.ring(cx, cy, PAT_COLOR[a.pat], 140, 0.4);
    if (chance(0.4)) voice(e.p.charId, 'yay');
  }

  // ------------------------------------------------------------------ puppy
  updatePuppy(dt, idle) {
    const pp = this.puppy;
    pp.st += dt; pp.yipT -= dt;
    let speed = 0;
    if (pp.state === 'roam') {
      speed = 520;
      if (Math.hypot(pp.tx - pp.x, pp.ty - pp.y) < 40) { pp.tx = rand(FLOOR.x0 + 60, FLOOR.x1 - 200); pp.ty = rand(FLOOR.y0 + 20, FLOOR.y1 - 20); }
      if (!idle && !this.done) {
        pp.stealT -= dt;
        if (pp.stealT <= 0) {
          const cands = this.socks.filter((s) => s.state === 'ground');
          if (cands.length >= 3) { pp.target = pick(cands); pp.state = 'hunt'; pp.st = 0; this.yip(); }
          else pp.stealT = 2;
        }
      }
    } else if (pp.state === 'hunt') {
      speed = 600;
      const s = pp.target;
      if (!s || s.state !== 'ground') { pp.state = 'roam'; pp.stealT = rand(1.5, 3); }
      else {
        pp.tx = s.x; pp.ty = s.y;
        if (Math.hypot(s.x - pp.x, s.y - pp.y) < 50) {
          s.state = 'puppy'; s.by = null; pp.sock = s; pp.state = 'zoom'; pp.st = 0; pp.zoomA = rand(TAU);
          snd('sock-puppy-grab', 'squeak', { vol: 0.7 }); this.yip();
          particles.burst(pp.x, pp.y - 60, { type: 'dust', count: 6, color: '#fff' });
        }
      }
    } else if (pp.state === 'zoom') {
      // zoomies: big loops across the lawn with the sock flopping
      speed = 470;
      pp.zoomA += dt * 2.2;
      pp.tx = clamp(W * 0.45 + Math.cos(pp.zoomA) * 620, FLOOR.x0 + 40, FLOOR.x1 - 40);
      pp.ty = clamp(800 + Math.sin(pp.zoomA * 2) * 150, FLOOR.y0 + 20, FLOOR.y1 - 20);
      if (pp.st > 4.5 || this.done) this.puppyDrop(null);
      else for (const e of this.ents) if (Math.hypot(e.x - pp.x, (e.y - pp.y) * 1.3) < 95) { this.catchPuppy(e); break; }
    } else if (pp.state === 'bow') {
      speed = 0;
      if (pp.st > 1.1) { pp.state = 'roam'; pp.stealT = this.storm ? rand(3, 5) : rand(5.5, 8); }
    }
    // steer
    const dx = pp.tx - pp.x, dy = pp.ty - pp.y, d = Math.hypot(dx, dy) || 1;
    const tvx = speed ? (dx / d) * speed * Math.min(1, d / 60) : 0, tvy = speed ? (dy / d) * speed * Math.min(1, d / 60) : 0;
    pp.vx += (tvx - pp.vx) * Math.min(1, dt * 6); pp.vy += (tvy - pp.vy) * Math.min(1, dt * 6);
    pp.x = clamp(pp.x + pp.vx * dt, FLOOR.x0, FLOOR.x1); pp.y = clamp(pp.y + pp.vy * dt, FLOOR.y0, FLOOR.y1);
    if (Math.abs(pp.vx) > 30) pp.dir = pp.vx > 0 ? 1 : -1;
    // zooming past people makes them hop
    if (!idle && Math.hypot(pp.vx, pp.vy) > 300) {
      for (const e of this.ents) {
        if (e.bumpT > 0 || pp.state === 'zoom') continue;
        if (Math.hypot(e.x - pp.x, (e.y - pp.y) * 1.3) < 80) { e.bumpT = 2.5; e.a.playOnce('surprised', 0.35); e.a.squash(0.3); sfx('tiny-squeak', { vol: 0.4, fallback: 'pop' }); }
      }
    }
    if (Math.hypot(pp.vx, pp.vy) > 200 && Math.random() < dt * 12) particles.burst(pp.x - pp.dir * 40, pp.y, { type: 'dust', count: 1, color: '#fff', speed: [20, 60], size: [8, 14] });
  }

  yip() { if (this.puppy.yipT > 0) return; this.puppy.yipT = 0.6; snd('sock-puppy-yip', 'squeak', { vol: 0.6, rate: rand(1.1, 1.3) }); }

  catchPuppy(e) {
    const pp = this.puppy;
    if (!pp.sock) return;
    this.puppyDrop(e);
    e.score++;
    e.a.playOnce('cheer', 0.6); e.a.emote('heart', 1);
    particles.popText(e.x, e.y - e.a.height - 70, '+1', '#ffd23f', 54);
    particles.burst(pp.x, pp.y - 70, { type: 'heart', count: 10, colors: ['#ff6fb1', '#fff'] });
    sfx('giggle', { vol: 0.6 }); fx.shake(5, 0.15);
    if (!e.p.isAI) e.p.ctrl.rumble(0.4, 100);
  }

  puppyDrop(by) {
    const pp = this.puppy, s = pp.sock;
    if (s) { s.state = 'ground'; s.x = clamp(pp.x + pp.dir * 50, FIELD.x0, FIELD.x1 + 100); s.y = clamp(pp.y + 10, FIELD.y0, FLOOR.y1 - 10); s.rot = rand(-0.5, 0.5); s.sq = 0.6; }
    pp.sock = null; pp.state = 'bow'; pp.st = 0; pp.vx *= 0.2; pp.vy *= 0.2;
    this.yip();
    sfx('boing', { vol: 0.4, fallback: 'bounce' });
  }

  // ------------------------------------------------------------- Molly Easy
  /** Easy (A only): walk this human to a sock (or, carrying one, to its twin). */
  easyThink(e, dt) {
    const au = e.auto;
    au.ix = 0; au.iy = 0;
    if (this.done) return;
    // the stick steers while it's pushed (and a moment after); then the autopilot picks up from here
    const st = easySteer(e, e.p.ctrl, dt);
    au.manual = st.manual; au.pushing = st.pushing;
    if (st.manual) { au.ix = st.x; au.iy = st.y; if (st.pushing) { au.sock = null; au.go = false; } return; }
    let tx = null, ty = null, arrive = 8;
    if (e.held) {
      const pat = e.held.pat;
      let best = null, bd = 1e9;
      for (const s of this.socks) if (s.state === 'ground' && s.pat === pat) { const d = Math.hypot(s.x - e.x, s.y - e.y); if (d < bd) { bd = d; best = s; } }
      const friend = this.ents.find((o) => o !== e && o.held && o.held.pat === pat);
      if (friend && Math.hypot(friend.x - e.x, friend.y - e.y) < bd) { tx = friend.x; ty = friend.y; arrive = 60; }
      else if (best) { tx = best.x; ty = best.y; }
      else if (this.puppy.sock && this.puppy.sock.pat === pat) { tx = this.puppy.x; ty = this.puppy.y; }
    } else {
      au.t -= dt;
      const cur = au.sock;
      if (!cur || cur.state !== 'ground' || au.t <= 0) {
        au.t = 2;
        if (!au.go || !cur || cur.state !== 'ground') { au.sock = this.easyPick(e, true); au.go = false; }
      }
      if (au.sock) {
        tx = au.sock.x + (e.i % 2 ? 20 : -20); ty = au.sock.y + 6;
        // A sent us here: grab it on arrival
        if (au.go && this.nearestSock(e) === au.sock && e.cool <= 0) { au.go = false; this.grab(e, au.sock); return; }
      }
    }
    if (tx === null) return;
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < arrive) return;
    const k = clamp(d / 90, 0, 1);
    au.ix = (dx / d) * k; au.iy = (dy / d) * k;
  }

  /** Easy: the sock to walk to - the nearest from where the kid is now (`share`: avoid others' picks, twins first). */
  easyPick(e, share) {
    const cur = e.auto.sock;
    const taken = new Set(share ? this.ents.filter((o) => o !== e).map((o) => (o.auto ? o.auto.sock : o.plan && o.plan.sock)).filter(Boolean) : []);
    let free = this.socks.filter((s) => s.state === 'ground' && !taken.has(s));
    if (!free.length) free = this.socks.filter((s) => s.state === 'ground');
    const wanted = share ? free.filter((s) => this.ents.some((o) => o.held && o.held.pat === s.pat)) : [];
    const pool = wanted.length ? wanted : free;
    let best = null, bd = 1e9;
    for (const s of pool) { const d = Math.hypot(s.x - e.x, s.y - e.y) + (share && s === cur ? -150 : 0); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  // ---------------------------------------------------------------------- AI
  aiThink(e, dt) {
    const p = e.p, c = p.ctrl, prof = aiProfile(p);
    if (e.brain.ready(dt)) {
      e.brain.wait(reactionTime(p) + [rand(0.35, 0.8), rand(0.15, 0.4), rand(0, 0.15)][clamp(p.aiLevel ?? 0, 0, 2)]);
      const pp = this.puppy;
      const dPup = Math.hypot(pp.x - e.x, pp.y - e.y);
      if (chance(prof.mistake * 0.4)) e.plan = { wander: true, x: rand(FLOOR.x0 + 100, FLOOR.x1 - 100), y: rand(FLOOR.y0, FLOOR.y1), t: rand(0.5, 1) };
      else if (pp.sock && dPup < 420 && chance(0.5) && !this.ents.some((o) => o !== e && o.plan && o.plan.puppy)) e.plan = { puppy: true };
      else if (e.held) {
        const pat = e.held.pat;
        const twins = this.socks.filter((s) => s.state === 'ground' && s.pat === pat);
        const friend = this.ents.find((o) => o !== e && o.held && o.held.pat === pat);
        let best = null, bd = 1e9;
        for (const s of twins) { const d = Math.hypot(s.x - e.x, s.y - e.y); if (d < bd) { bd = d; best = s; } }
        if (friend && Math.hypot(friend.x - e.x, friend.y - e.y) < bd) e.plan = { friend };
        else if (best) e.plan = { sock: best };
        else e.plan = pp.sock && pp.sock.pat === pat ? { puppy: true } : null;
      } else {
        const free = this.socks.filter((s) => s.state === 'ground' && !this.ents.some((o) => o !== e && ((o.plan && o.plan.sock === s) || (o.auto && o.auto.sock === s))));
        if (free.length) {
          // prefer a sock whose twin someone else is already carrying, else the closest
          const wanted = free.filter((s) => this.ents.some((o) => o.held && o.held.pat === s.pat));
          const pool = wanted.length && chance(0.6) ? wanted : free;
          let best = pool[0], bd = 1e9;
          for (const s of pool) {
            let d = Math.hypot(s.x - e.x, s.y - e.y) * rand(0.8, 1.2);
            // someone else is much closer to it: leave it to them and spread out
            if (this.ents.some((o) => o !== e && Math.hypot(s.x - o.x, s.y - o.y) < d * 0.6)) d *= 2.5;
            if (d < bd) { bd = d; best = s; }
          }
          if (chance(prof.mistake)) best = pick(free);
          e.plan = { sock: best, grab: true };
        } else e.plan = null;
      }
    }
    const pl = e.plan;
    if (!pl) { c.move(0, 0); return; }
    if (pl.wander) { pl.t -= dt; if (pl.t <= 0) e.plan = null; if (steer(p, e.x, e.y, pl.x, pl.y, { arrive: 60 }) < 30) c.move(0, 0); return; }
    if (pl.puppy) {
      if (!this.puppy.sock) { e.plan = null; c.move(0, 0); return; }
      steer(p, e.x, e.y, this.puppy.x, this.puppy.y, { arrive: 30 });
      return;
    }
    if (pl.friend) {
      if (!e.held || !pl.friend.held) { e.plan = null; return; }
      steer(p, e.x, e.y, pl.friend.x, pl.friend.y, { arrive: 60 });
      return;
    }
    if (pl.sock) {
      const s = pl.sock;
      if (s.state !== 'ground') { e.plan = null; c.move(0, 0); return; }
      const d = steer(p, e.x, e.y, s.x, s.y, { arrive: 70 });
      if (pl.grab && d < REACH * 0.8 && e.cool <= 0) { c.press('a'); e.plan = null; }
      else if (d < 15) c.move(0, 0);
    }
  }

  // ------------------------------------------------------------------ finish
  finish() {
    this.done = true;
    // one shared washing line: everybody wins together, the team total is the headline
    const scores = this.ents.map((e) => e.score), tot = this.total;   // e.score: pairs each player helped hang
    this.ents.forEach((e) => { e.a.clearEmotes(); e.a.setPose('celebrate'); });
    this.api.finish({
      placements: this.ents.map(() => 1), showcase: true, highlight: null,
      title: `${tot} pair${tot === 1 ? '' : 's'} together!`,
      stats: scores.map((s) => (s ? 'Sock helper!' : 'Cheer squad!')),   // no per-player counts to compare
      focus: { x: W / 2, y: 500 },
    });
  }

  // -------------------------------------------------------------------- draw
  draw(g) {
    const t = this.t;
    drawYard(g, t);
    if (this.storm) { g.save(); g.globalAlpha = 0.05 + 0.03 * Math.sin(t * 8); g.fillStyle = '#9fdcff'; g.fillRect(0, 0, W, H); g.restore(); }
    this.drawFlyers(g);
    drawLine(g);
    for (const p of this.line) {
      const x = this.slotX(p.slot), y = lineY(x);
      const sway = Math.sin(t * 2.4 + p.slot) * 0.08;
      const pop = clamp((t - p.t) / 0.25, 0, 1);
      for (const side of [-1, 1]) {
        g.save(); g.translate(x + side * 30, y); g.rotate(sway + side * 0.05); g.translate(0, 52 * pop); g.scale(0.72, 0.72); drawSock(g, p.pat, 1, t, side > 0); g.restore();
        drawPin(g, x + side * 30, y - 2);
      }
    }
    // world: socks, players, puppy sorted by y
    const items = [];
    for (const s of this.socks) if (s.state === 'ground') items.push({ y: s.y, d: () => this.drawGroundSock(g, s) });
    for (const e of this.ents) items.push({ y: e.y, d: () => this.drawPlayer(g, e) });
    const pp = this.puppy;
    items.push({ y: pp.y, d: () => { g.save(); g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(pp.x, pp.y + 4, 80, 16, 0, 0, TAU); g.fill(); g.restore(); g.save(); g.translate(pp.x, pp.y); drawPuppy(g, pp.state === 'bow' ? 'bow' : Math.hypot(pp.vx, pp.vy) > 60 ? 'run' : 'stand', pp.dir, t, pp.sock ? pp.sock.pat : null); g.restore(); } });
    items.push({ y: BASKET.y, d: () => drawBasket(g, BASKET.x, BASKET.y, this.basketSq * Math.sin(t * 30), t) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();
    // airborne socks on top (bursting ones come up out of the basket, behind its front rim)
    const bsq = this.basketSq * Math.sin(t * 30);
    for (const s of this.socks) {
      if (s.state === 'fly' && s.ft >= 0) {
        g.save();
        if (art('prop/sock-basket') && s.ft < s.fdur * 0.5) {
          const k = 260 / 360, sx = 1 + bsq * 0.25, sy = 1 - bsq * 0.25;
          g.beginPath(); g.rect(0, 0, W, H);
          BASKET_RIM.forEach(([ax, ay], i) => { const px = BASKET.x + (ax - 180) * k * sx, py = BASKET.y + (ay - 260) * k * sy; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
          g.lineTo(BASKET.x + 130 * sx, BASKET.y + 4); g.lineTo(BASKET.x - 130 * sx, BASKET.y + 4); g.closePath();
          g.clip('evenodd');
        }
        g.translate(s.x, s.y); g.rotate(s.rot); drawSock(g, s.pat, 0.85, t, s.flip); g.restore();
      }
      if (s.state === 'dance' || s.state === 'rocket') { g.save(); g.translate(s.x, s.y); g.rotate(s.rot); drawSock(g, s.pat, s.state === 'dance' ? 1 : 0.85, t, s.side > 0); g.restore(); }
    }
    // the puppy's "catch me" hint
    if (pp.sock) {
      g.save(); g.translate(pp.x, pp.y - 190 + Math.sin(t * 10) * 8);
      ui.text(g, '!', 0, 0, { size: 60, color: '#ffd23f' });
      g.restore();
    }
    for (const e of this.ents) {
      const head = e.y - e.a.height - (e.held ? 150 : 30);
      if (this.time < 4 || !e.p.isAI) ui.playerTag(g, e.p, e.x, head);
    }
    if (this.easy && !this.done) this.drawEasyHints(g);
  }

  /** Molly Easy: a bouncing arrow over the sock you're walking to, a big A when A works. */
  drawEasyHints(g) {
    const t = this.t;
    for (const e of this.ents) {
      if (!e.auto) continue;
      const act = this.easyAction(e);
      if (act === 'puppy') { ui.glyph(g, 'a', this.puppy.x, this.puppy.y - 260 + Math.sin(t * 9) * 6, 84, { pulse: true }); continue; }
      if (act === 'grab') {
        // beside the sock, on the far side from the kid, so it never covers their head or tag
        const s = this.nearestSock(e), off = e.a.height * 0.3 + 60;
        let side = s.x >= e.x ? 1 : -1;
        if (e.x + side * off > W - 60 || e.x + side * off < 60) side = -side;
        const gx = side > 0 ? Math.max(s.x, e.x + off) : Math.min(s.x, e.x - off);
        ui.glyph(g, 'a', gx, s.y - 190 + Math.sin(t * 9) * 6, 84, { pulse: true }); continue;
      }
      const s = !e.held && e.auto.sock;
      if (!s || s.state !== 'ground') continue;
      g.save(); g.translate(s.x, s.y - 175 + Math.sin(t * 7 + e.i) * 10);
      g.fillStyle = e.p.color; g.strokeStyle = '#24163f'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, 24); g.lineTo(-24, -6); g.lineTo(-10, -6); g.lineTo(-10, -30); g.lineTo(10, -30); g.lineTo(10, -6); g.lineTo(24, -6); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }

  drawGroundSock(g, s) {
    const t = this.t;
    // twins of what a human is holding glow (after a moment) so little ones can find them
    let glow = null;
    for (const e of this.ents) if (e.held && e.held.pat === s.pat && (e.heldT > 1.2 || e.auto) && !e.p.isAI) glow = e.p.color;
    g.save();
    g.fillStyle = 'rgba(36,22,63,0.16)'; g.beginPath(); g.ellipse(s.x, s.y + 4, 48, 12, 0, 0, TAU); g.fill();
    if (glow) {
      const k = 0.5 + Math.sin(t * 10) * 0.3;
      g.globalAlpha = k; g.strokeStyle = glow; g.lineWidth = 8; g.beginPath(); g.ellipse(s.x, s.y + 4, 62, 18, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
    }
    const wig = Math.sin(t * 3 + s.wob) * 0.06 + (glow ? Math.sin(t * 16) * 0.12 : 0);
    g.translate(s.x, s.y - 4); g.rotate(s.rot + wig); g.scale(1 + s.sq * 0.3, 1 - s.sq * 0.3);
    g.translate(0, -56);
    drawSock(g, s.pat, 0.8, t, s.flip);
    g.restore();
  }

  drawPlayer(g, e) {
    e.a.draw(g, { ring: e.p.color });
    if (e.held) {
      const bob = Math.sin(this.t * 10 + e.i) * 5;
      g.save(); g.translate(e.x + e.a.facing * 6, e.y - e.a.height - 70 + bob); g.rotate(Math.sin(this.t * 6 + e.i) * 0.2);
      drawSock(g, e.held.pat, 0.8, this.t, e.held.flip); g.restore();
    }
  }

  drawFlyers(g) {
    const t = this.t;
    for (const f of this.flyers) {
      const k = clamp((f.t - f.d) / 1.6, 0, 1);
      if (k <= 0) continue;
      const y = lineY(f.x) + 52 - ease.inOutQuad(k) * 700;
      for (const side of [-1, 1]) {
        g.save(); g.translate(f.x + side * (30 + Math.sin(f.t * 8) * 20), y + Math.sin(f.t * 10 + side) * 12); g.rotate(Math.sin(f.t * 9) * 0.5 * side); g.scale(0.72, 0.72); drawSock(g, f.pat, 1, t, side > 0); g.restore();
      }
      if (Math.random() < 0.3) particles.burst(f.x, y + 70, { type: 'sparkle', count: 1, colors: RAINBOW, speed: [10, 50] });
    }
  }

  drawHUD(g) {
    ui.timer(g, this.timeLeft);
    // co-op: no per-player numbers to compare, just a heart once you've helped (the team count is below)
    ui.scoreboard(g, this.players, this.ents.map((e) => e.score), { y: 18, avoidCenter: true, format: (v) => (v ? '♥' : '') });
    // shared count: a sock-pair badge under the timer
    g.save(); g.translate(W / 2, 150);
    ui.panel(g, -90, -34, 180, 68, { r: 34, fill: '#ffffff', stroke: '#24163f', lineWidth: 5 });
    g.save(); g.translate(-46, 0); g.rotate(-0.2); drawSock(g, 'rainbow', 0.36, this.t); g.restore();
    g.save(); g.translate(-26, 2); g.rotate(0.2); drawSock(g, 'rainbow', 0.36, this.t, true); g.restore();
    ui.text(g, String(this.total), 30, 2, { size: 46, color: '#24163f', stroke: false, weight: 800 });
    g.restore();
    const bt = this.t - this.bannerT;
    if (bt < 1.6) {
      g.save(); g.globalAlpha = clamp(1.6 - bt, 0, 1);
      ui.banner(g, this.bannerText, bt, { y: 470, size: 130, color: this.bannerText === 'Sock storm!' ? '#5fb8ff' : '#ff6fb1' });
      g.restore();
    }
  }
}
