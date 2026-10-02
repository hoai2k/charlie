// Royal Fashion Show (Play Studio). Phase 1: every player dresses their
// character at a split-screen dressing-room station (LB/RB category tabs,
// up/down item, X color, Y surprise, A ready). Phase 2: models strut down the
// runway one group at a time while the crowd flashes cameras; A strikes a
// pose. Finale: a group photo, confetti, and everyone gets a star.
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound, host } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { drawSparkleShape } from '../engine/emotes.js';
import { charById } from '../data/characters.js';
import { CATS, CAT, PALETTE, NAVY, drawItemIcon, heartPath, starAt } from './fashion-show/items.js';

export const meta = {
  id: 'fashion-show',
  title: 'Royal Fashion Show',
  category: 'studio',
  type: 'Dress up · Everyone wins',
  goal: 'Dress up like royalty, then strut down the runway and strike your best poses!',
  controls: [['lb', 'Pick a spot (head, face, wings...)'], ['stick', 'Up/down: try on items'], ['x', 'Change color'], ['y', 'Surprise me!'], ['a', 'Ready! / Strike a pose']],
  tips: ['Wings and capes go on your back, wands and balloons in your hand.', 'On the runway, press A to pose for the cameras!', 'Press B if you want to change your outfit again.'],
  music: 'chill',
  duration: 'about 2 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  drawIcon,
};

const COMPLIMENTS = ['Fabulous!', 'Gorgeous!', 'So royal!', 'Sparkly!', 'Wow!', 'Stunning!', 'Magical!', 'Lovely!', 'Dazzling!', 'Super cute!'];
const POSE_SET = ['strike1', 'strike2', 'strike3', 'ready', 'cheer'];
/** Recorded sound if it exists, else the synth stand-in. */
const snd = (key, fallback) => (hasSound(key) ? sfx(key) : fallback && sfx(fallback));

// Runway geometry (logical px).
const RW = { backY: 492, frontY: 1080, backHW: 150, frontHW: 540, startY: 505, stopY: 905 };
const hwAt = (y) => lerp(RW.backHW, RW.frontHW, (y - RW.backY) / (RW.frontY - RW.backY));
const WALK = 2.6, POSE = 4.6, EXIT = 1.5;

function hex(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; }
const popK = (t) => (t < 0.4 ? 0.25 + ease.outBack(t / 0.4) * 0.75 : 1);

/** Split-screen station rects: 1 = big center, 2 = halves, 3-4 = quadrants, 5-8 = 4x2 grid. */
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
  const tabH = Math.round(clamp(r.h * 0.1, 46, 84));
  const hintH = Math.round(clamp(r.h * 0.075, 36, 62));
  const listW = Math.round(r.w * (n === 1 ? 0.3 : 0.35));
  const ca = { x: r.x, y: r.y + tabH + 14, w: r.w - listW - 12, h: r.h - tabH - hintH - 26 };
  return {
    tabH, hintH, listW, ca,
    list: { x: r.x + r.w - listW - 10, y: r.y + tabH + 14, w: listW, h: r.h - tabH - hintH - 28 },
    foot: { x: ca.x + ca.w / 2, y: ca.y + ca.h * 0.95 },
    charH: ca.h * 0.64, charW: ca.w * 0.78,
  };
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'dress';
    this.phaseT = 0;
    this.flashes = [];
    this.curtain = 0;
    this.lastCheer = -9;
    this.cpuOnly = this.players.every((p) => p.isAI);
    const rects = stationRects(this.n);
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i]));
    this.crowd = this.buildCrowd();
    this.bgDots = Array.from({ length: 40 }, (_, i) => ({ x: (i * 397) % W, y: 120 + ((i * 223) % 940), r: 3 + (i % 4) * 2, p: i * 0.7 }));
    sfx('magic');
  }

  // --- setup ---------------------------------------------------------------
  makeStation(p, i, r) {
    const L = layoutStation(r, this.n);
    const a = new Actor(p.charId, { x: L.foot.x, y: L.foot.y, facing: 1 });
    a.scale = Math.min(L.charH / a.leader.h, L.charW / Math.max(1, a.width));
    a.snap();
    const st = {
      p, i, r, L, actor: a, baseScale: a.scale,
      outfit: CATS.map((c) => ({ item: 0, colors: c.items.map((it) => it.color ?? 0) })),
      pop: CATS.map(() => 9), tab: 0, ready: false, readyT: 0, poses: 0, poseCD: 0, poseIdx: 0, tabBump: 0, listBump: 0,
      ai: null, aiStick: 0,
    };
    a.char.members.forEach((def, mi) => {
      a.attach((g, info) => this.drawWorn(g, st, def, info, true), { member: mi, behind: true });
      a.attach((g, info) => this.drawWorn(g, st, def, info, false), { member: mi });
    });
    if (p.isAI) this.planAI(st);
    return st;
  }

  buildCrowd() {
    const list = [];
    const shades = ['#2a1748', '#341d58', '#3f2366', '#2f1a4f', '#46286f'];
    for (let r = 0; r < 6; r++) {
      const y = 600 + r * 92, size = 30 + (y - 600) * 0.085;
      const edge = hwAt(y) + 34 + size * 0.9;
      for (const side of [-1, 1]) {
        for (let x = W / 2 + side * edge, k = 0; side < 0 ? x > -size : x < W + size; x += side * size * 1.85, k++) {
          list.push({ x: x + rand(-8, 8), y: y + rand(-6, 6), size: size * rand(0.9, 1.1), c: pick(shades), ph: rand(TAU), phone: chance(0.22), jump: 0, jv: 0, side });
        }
      }
    }
    return list.sort((a, b) => a.y - b.y);
  }

  // --- worn items (actor attachments) -----------------------------------------
  drawWorn(g, st, def, info, behind) {
    const t = this.t + st.i * 0.37;
    const h = info.h;
    const faceW = clamp(def.face[2] * h * 2, h * 0.2, h * 0.5);
    const headW = faceW * 1.08;
    const hx = info.head.x, hy = info.head.y;
    const fy = hy + ((def.top ?? 1) - (1 - def.face[1])) * h;
    const eyes = info.eyes || { x: hx, y: fy };
    const neck = info.neck || { x: hx, y: fy + faceW * 0.5 };
    // Front-facing art: center wings/capes on the body (the engine default leans backward for side views).
    let back = info.back || { x: -0.12 * h, y: -h * 0.58 };
    if (def.facing === 0 && Math.abs(back.x + 0.12 * h) < 0.5) back = { x: hx * 0.25, y: back.y };
    const tilt = info.headAngle || 0;
    const put = (ci, x, y, S, which) => {
      const o = st.outfit[ci], it = CATS[ci].items[o.item];
      const fn = which === 'behind' ? it.behind : it.draw;
      if (!fn) return;
      const col = PALETTE[o.colors[o.item]];
      g.save(); g.translate(x, y);
      if (tilt && (ci === CAT.head || ci === CAT.face)) g.rotate(tilt);
      const k = popK(st.pop[ci]); g.scale(k, k);
      fn(g, S, col, t);
      g.restore();
    };
    if (behind) {
      put(CAT.aura, 0, -h * 0.5, h, 'behind');
      put(CAT.back, back.x, back.y, h, 'draw');
    } else {
      put(CAT.neck, neck.x, neck.y, faceW, 'draw');
      put(CAT.face, eyes.x, eyes.y, faceW, 'draw');
      put(CAT.head, hx, hy + headW * 0.1, headW, 'draw');
      put(CAT.hand, info.hand.x, info.hand.y, h, 'draw');
      put(CAT.aura, 0, -h * 0.5, h, 'draw');
    }
  }

  itemWorldPos(st, ci) {
    const a = st.actor;
    if (ci === CAT.head || ci === CAT.face) { const p = a.anchor('head'); return { x: p.x, y: p.y + (ci === CAT.face ? a.height * 0.12 : 0) }; }
    if (ci === CAT.hand) return a.anchor('hand');
    return a.anchor('center');
  }

  // --- dressing room ---------------------------------------------------------
  changeItem(st, dir) {
    const ci = st.tab, o = st.outfit[ci], len = CATS[ci].items.length;
    o.item = (o.item + dir + len) % len;
    st.pop[ci] = 0; st.listBump = 0.15;
    const pos = this.itemWorldPos(st, ci);
    const it = CATS[ci].items[o.item];
    if (!it.draw) { sfx('whoosh'); particles.burst(pos.x, pos.y, { type: 'dust', count: 6 }); return; }
    const col = PALETTE[o.colors[o.item]];
    sfx('swap');
    particles.burst(pos.x, pos.y, { type: 'sparkle', count: 8, colors: col.rainbow ? RAINBOW : [col.c, '#fff'] });
    st.actor.playOnce('cheer', 0.45, 'idle'); st.actor.squash(0.15);
  }

  cycleColor(st) {
    const ci = st.tab, o = st.outfit[ci], it = CATS[ci].items[o.item];
    if (!it.draw) { sfx('blip'); st.listBump = 0.1; return; }
    o.colors[o.item] = (o.colors[o.item] + 1) % PALETTE.length;
    st.pop[ci] = 0.15;
    const col = PALETTE[o.colors[o.item]];
    const pos = this.itemWorldPos(st, ci);
    sfx('collect', { step: o.colors[o.item] });
    particles.burst(pos.x, pos.y, { type: 'drop', count: 10, colors: col.rainbow ? RAINBOW : [col.c, col.l], speed: [120, 300] });
    particles.burst(pos.x, pos.y, { type: 'sparkle', count: 4, colors: ['#fff'] });
    st.actor.squash(0.12);
  }

  surprise(st) {
    const theme = shuffle([0, 1, 2, 3, 4, 5, 7]).slice(0, 2);
    CATS.forEach((c, ci) => {
      const o = st.outfit[ci];
      const want = ci === CAT.face ? 0.55 : ci === CAT.aura ? 0.65 : 0.85;
      o.item = chance(want) ? randInt(1, c.items.length - 1) : 0;
      if (o.item) o.colors[o.item] = chance(0.7) ? pick(theme) : (c.items[o.item].color ?? 0);
      st.pop[ci] = -rand(0, 0.25);
    });
    const a = st.actor, c = a.anchor('center');
    sfx('magic'); sfx('bigpop');
    particles.burst(c.x, c.y, { type: 'smoke', count: 14, speed: [80, 260] });
    particles.burst(c.x, c.y, { type: 'star', count: 12 });
    particles.burst(c.x, c.y, { type: 'sparkle', count: 14, colors: ['#fff', '#fff6a8'] });
    a.playOnce('ready', 0.6, 'idle'); a.squash(-0.3);
  }

  setReady(st, on) {
    st.ready = on; st.readyT = 0;
    const a = st.actor;
    if (on) {
      sfx('ready'); a.playOnce('ready', 0.6, 'wave'); a.squash(-0.25);
      const c = a.anchor('head');
      particles.burst(c.x, c.y, { type: 'confetti', count: 26, speed: [200, 500] });
      if (!st.p.isAI) voice(st.p.charId, 'yay');
    } else { sfx('back'); a.setPose('idle'); }
  }

  planAI(st) {
    const theme = shuffle([0, 1, 2, 3, 4, 5, 7]).slice(0, 2);
    const cats = shuffle([0, 1, 2, 3, 4, 5]).slice(0, randInt(4, 5)).sort((a, b) => a - b);
    const plan = cats.map((ci) => {
      const item = randInt(1, CATS[ci].items.length - 1);
      return { ci, item, color: chance(0.55) ? pick(theme) : (CATS[ci].items[item].color ?? 0) };
    });
    st.ai = { plan, step: 0, t: rand(1.0, 2.2), surprise: chance(0.3), didSurprise: false };
  }

  updateAIDress(st, dt) {
    const c = st.p.ctrl, ai = st.ai;
    if (st.aiStick > 0) { st.aiStick -= dt; if (st.aiStick <= 0) c.move(0, 0); }
    if (st.ready) return;
    ai.t -= dt;
    if (ai.t > 0) return;
    const hurry = this.stations.every((s) => s.ready || s.p.isAI) && !this.cpuOnly;
    const slow = aiProfile(st.p).speed;
    ai.t = rand(0.28, 0.6) / slow * (hurry ? 0.45 : 1);
    if (ai.surprise && !ai.didSurprise && ai.step === 0) { ai.didSurprise = true; c.press('y'); ai.t += 1.2; return; }
    const goal = ai.plan[ai.step];
    if (!goal) { c.press('a'); return; }
    if (st.tab !== goal.ci) { c.press(goal.ci > st.tab ? 'rb' : 'lb'); return; }
    const o = st.outfit[goal.ci];
    if (o.item !== goal.item) { c.move(0, goal.item > o.item ? 1 : -1); st.aiStick = 0.05; return; }
    if (o.colors[o.item] !== goal.color) { c.press('x'); return; }
    ai.step++; ai.t += rand(0.5, 1.2) * (hurry ? 0.4 : 1);
    if (chance(0.5)) st.actor.emote('heart', 1);
  }

  updateDress(dt) {
    for (const st of this.stations) {
      const c = st.p.ctrl, a = st.actor;
      if (st.p.isAI) this.updateAIDress(st, dt);
      st.pop = st.pop.map((v) => v + dt);
      st.tabBump = Math.max(0, st.tabBump - dt); st.listBump = Math.max(0, st.listBump - dt);
      st.readyT += dt;
      a.update(dt);
      if (st.ready) { if (c.pressed('b')) this.setReady(st, false); continue; }
      const step = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0) + c.nav.x;
      if (step) { st.tab = (st.tab + Math.sign(step) + CATS.length) % CATS.length; st.tabBump = 0.18; sfx('move'); }
      if (c.nav.y) this.changeItem(st, c.nav.y);
      if (c.pressed('x')) this.cycleColor(st);
      if (c.pressed('y')) this.surprise(st);
      if (c.pressed('a')) this.setReady(st, true);
    }
    if (this.stations.every((s) => s.ready && s.readyT > 0.5)) this.startShowtime();
  }

  // --- transitions -------------------------------------------------------------
  startShowtime() {
    this.phase = 'showtime'; this.phaseT = 0;
    sfx('whoosh'); sfx('drumroll');
  }

  updateShowtime(dt) {
    // Curtains close (0..0.6), banner, then open on the runway (1.6..2.2).
    const t = this.phaseT;
    this.curtain = t < 0.6 ? ease.outQuad(t / 0.6) : t < 1.6 ? 1 : 1 - ease.inOutQuad(Math.min(1, (t - 1.6) / 0.6));
    if (t >= 1.6 && !this.runwayReady) { this.runwayReady = true; this.setupRunway(); sfx('fanfare'); }
    if (t >= 2.2) { this.phase = 'runway'; this.phaseT = 0; this.curtain = 0; this.nextGroup(); }
    for (const st of this.stations) st.actor.update(dt);
  }

  setupRunway() {
    const n = this.n;
    const k = n <= 3 ? 1 : n <= 6 ? 2 : 3;
    const count = Math.ceil(n / k);
    this.groups = Array.from({ length: count }, () => []);
    this.stations.forEach((st, i) => this.groups[Math.floor((i * count) / n)].push(st));
    this.gi = -1;
    this.walkedCount = 0;
    for (const st of this.stations) {
      const a = st.actor;
      a.visible = false; a.alpha = 1; a.facing = 1; a.setPose('idle'); a.clearEmotes();
      st.rw = { state: 'wait' };
    }
  }

  nextGroup() {
    this.gi++;
    if (this.gi >= this.groups.length) { this.startFinale(); return; }
    this.group = this.groups[this.gi];
    this.groupT = 0;
    const k = this.group.length;
    this.group.forEach((st, j) => {
      st.rw = { state: 'walk', lane: j - (k - 1) / 2, k };
      const a = st.actor; a.visible = true; a.alpha = 0;
      this.placeOnRunway(st, RW.startY);
      a.snap();
    });
    sfx('whoosh');
  }

  modelHeight(k, y) {
    const base = k === 1 ? 410 : k === 2 ? 350 : 280;
    return lerp(165, base, clamp((y - RW.startY) / (RW.stopY - RW.startY), 0, 1));
  }

  placeOnRunway(st, y) {
    const a = st.actor, { lane, k } = st.rw;
    const th = this.modelHeight(k, y);
    a.scale = Math.min(th / a.leader.h, (k === 1 ? 600 : k === 2 ? 380 : 270) * (th / this.modelHeight(k, RW.stopY)) / Math.max(1, a.width / a.scale));
    a.x = W / 2 + lane * Math.min(hwAt(y) * (k === 3 ? 0.72 : 0.6), k === 3 ? 270 : 240);
    a.y = y;
  }

  sideSpot(idx) {
    const side = idx % 2 ? 1 : -1, slot = Math.floor(idx / 2);
    return { x: W / 2 + side * (300 + slot * 125), y: 482, side };
  }

  strikePose(st) {
    st.poses++; st.poseCD = 0.3;
    const a = st.actor;
    st.poseIdx = (st.poseIdx + 1 + randInt(0, 2)) % POSE_SET.length;
    a.playOnce(POSE_SET[st.poseIdx], 0.75, 'idle'); a.squash(0.22); a.flash('#fff6d0', 0.07);
    a.facing = chance(0.5) ? 1 : -1;
    sfx('shutter');
    if (this.t - this.lastCheer > 1.1) { this.lastCheer = this.t; snd('crowd-ooh', 'cheer'); }
    const head = a.anchor('head');
    particles.burst(head.x, head.y + a.height * 0.2, { type: 'heart', count: 5, speed: [120, 300] });
    particles.burst(head.x, head.y + a.height * 0.3, { type: 'sparkle', count: 6, colors: ['#fff', '#fff6a8'] });
    particles.popText(a.x, head.y - 40, pick(COMPLIMENTS), st.p.color, 46);
    for (let i = 0; i < 4; i++) this.cameraFlash(a.x);
    for (const m of this.crowd) if (chance(0.25) && m.jump <= 0) m.jv = rand(160, 260);
    if (st.poses % 4 === 0 && !st.p.isAI) voice(st.p.charId, 'woo');
  }

  cameraFlash(nearX) {
    const pool = this.crowd.filter((m) => nearX === undefined || Math.abs(m.x - nearX) < 700);
    const m = pick(pool.length ? pool : this.crowd);
    if (!m) return;
    this.flashes.push({ x: m.x + rand(-10, 10), y: m.y - m.size * (m.phone ? 2.0 : 1.4), t: 0, life: rand(0.18, 0.3), size: m.size * rand(1.2, 1.8) });
  }

  updateCrowd(dt) {
    for (const m of this.crowd) {
      if (m.jv || m.jump > 0) { m.jump += m.jv * dt; m.jv -= 1400 * dt; if (m.jump <= 0) { m.jump = 0; m.jv = 0; } }
    }
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter((f) => f.t < f.life);
    if (chance(dt * (this.phase === 'runway' ? 1.6 : 0.8))) this.cameraFlash();
  }

  updateRunway(dt) {
    this.groupT += dt;
    const t = this.groupT;
    this.updateCrowd(dt);
    for (const st of this.stations) {
      const a = st.actor, rw = st.rw, c = st.p.ctrl;
      st.poseCD -= dt;
      if (rw.state === 'walk') {
        const u = Math.min(1, t / WALK);
        this.placeOnRunway(st, lerp(RW.startY, RW.stopY, u));
        a.alpha = Math.min(1, t / 0.35);
        a.setPose('walk'); a.speed = 0.55;
        if (c.pressed('a') && st.poseCD <= 0 && u > 0.15) this.strikePose(st);
        if (u >= 1) {
          rw.state = 'pose'; a.setPose('idle'); a.playOnce(pick(['strike1', 'strike2', 'strike3']), 0.7, 'idle'); a.facing = 1;
          snd('applause', 'cheer'); for (let i = 0; i < 6; i++) this.cameraFlash(a.x);
          for (const m of this.crowd) if (chance(0.5)) m.jv = rand(160, 280);
          rw.aiT = rand(0.4, 0.9);
        }
      } else if (rw.state === 'pose') {
        if (st.p.isAI) {
          rw.aiT -= dt;
          if (rw.aiT <= 0) { c.press('a'); rw.aiT = rand(0.55, 1.1) / aiProfile(st.p).speed; }
        }
        if (c.pressed('a') && st.poseCD <= 0) this.strikePose(st);
        if (t >= WALK + POSE) {
          rw.state = 'exit'; rw.from = { x: a.x, y: a.y, s: a.scale };
          rw.spot = this.sideSpot(this.walkedCount++);
          a.setPose('walk');
        }
      } else if (rw.state === 'exit') {
        const u = clamp((t - WALK - POSE) / EXIT, 0, 1), e = ease.inOutQuad(u);
        const tx = rw.spot.x, ty = rw.spot.y;
        a.x = lerp(rw.from.x, tx, e); a.y = lerp(rw.from.y, ty, e);
        a.scale = lerp(rw.from.s, 150 / a.leader.h, e);
        a.facing = tx > rw.from.x ? 1 : -1;
        a.setPose('walk'); a.speed = 0.6;
        if (u >= 1) { rw.state = 'side'; a.setPose('idle'); a.facing = -rw.spot.side; }
      } else if (rw.state === 'side') {
        // Already walked: cheer on friends (A = cheer).
        if (c.pressed('a') && st.poseCD <= 0) { st.poseCD = 0.5; a.playOnce('cheer', 0.5, 'idle'); particles.burst(a.x, a.y - a.height, { type: 'heart', count: 2 }); }
        if (this.group && this.group[0].rw.state === 'pose') { if (a.pose !== 'clap' && !a._once) a.setPose('clap'); } else if (a.pose === 'clap') a.setPose('idle');
        if (st.p.isAI && chance(dt * 0.25)) a.playOnce(pick(['cheer', 'wave']), 0.6);
      }
      a.update(dt);
    }
    if (t >= WALK + POSE + EXIT + 0.05) this.nextGroup();
  }

  // --- finale ------------------------------------------------------------------
  startFinale() {
    if (this.phase === 'finale') return;
    if (!this.groups) this.setupRunway();
    this.phase = 'finale'; this.phaseT = 0; this.curtain = 0;
    this.photoTaken = false; this.cheeseSaid = false;
    const n = this.n;
    const rows = n >= 6 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
    let idx = 0;
    const spots = [];
    rows.forEach((count, r) => {
      const y = rows.length === 1 ? 900 : r === 0 ? 960 : 770;
      const th = rows.length === 1 ? (n <= 2 ? 400 : n <= 4 ? 330 : 280) : r === 0 ? 270 : 230;
      const sp = Math.min(380, 1440 / count);
      for (let k = 0; k < count; k++) spots.push({ x: W / 2 + (k - (count - 1) / 2) * sp + (r ? sp / 2 * (count === rows[0] ? 1 : 0) : 0), y, th, sp });
      idx += count;
    });
    // Back row first in the list draws behind; stations map in order to front row first.
    this.stations.forEach((st, i) => {
      const a = st.actor, sp = spots[i];
      st.fin = { from: { x: a.visible ? a.x : W / 2 + rand(-200, 200), y: a.visible ? a.y : RW.startY, s: a.visible ? a.scale : 160 / a.leader.h }, to: sp };
      st.fin.toScale = Math.min(sp.th / a.leader.h, (sp.sp * 0.95) / Math.max(1, a.width / a.scale));
      a.visible = true; a.alpha = 1; a.setPose('walk');
      if (!st.rw) st.rw = {};
      st.rw.state = 'finale';
    });
  }

  updateFinale(dt) {
    const t = this.phaseT;
    this.updateCrowd(dt);
    for (const st of this.stations) {
      const a = st.actor, f = st.fin;
      if (t < 1.6) {
        const e = ease.inOutQuad(Math.min(1, t / 1.5));
        a.x = lerp(f.from.x, f.to.x, e); a.y = lerp(f.from.y, f.to.y, e); a.scale = lerp(f.from.s, f.toScale, e);
        a.facing = f.to.x >= f.from.x ? 1 : -1; a.setPose(e < 1 ? 'walk' : 'idle');
      } else if (!this.cheeseSaid) { a.setPose('wave'); a.facing = 1; }
      a.update(dt);
    }
    if (t >= 1.6 && !this.cheeseSaid) { this.cheeseSaid = true; sfx('giggle'); }
    if (t >= 2.4 && t - dt < 2.4) sfx('tick');
    if (t >= 2.9 && t - dt < 2.9) sfx('tick');
    if (t >= 3.4 && t - dt < 3.4) sfx('tock');
    if (t >= 3.6 && !this.photoTaken) {
      this.photoTaken = true;
      fx.flash('#ffffff', 0.45); sfx('shutter'); sfx('fanfare'); snd('applause', 'cheer');
      particles.confettiRain(W, 160);
      this.stations.forEach((st, i) => st.actor.playOnce(i % 2 ? 'bow' : 'strike3', 0.8, 'celebrate'));
      for (const m of this.crowd) m.jv = rand(180, 300);
    }
    if (this.photoTaken && chance(dt * 3)) this.cameraFlash();
    if (t >= 8.2 && !this.finished) this.finishGame();
  }

  finishGame() {
    this.finished = true;
    const poses = this.stations.map((s) => s.poses);
    const max = Math.max(...poses);
    const top = poses.filter((v) => v === max).length;
    this.api.finish({
      showcase: true,
      highlight: max > 0 && top === 1 ? poses.indexOf(max) : null,
      stats: poses.map((v) => `${v} pose${v === 1 ? '' : 's'}`),
      title: 'Gorgeous!',
    });
  }

  onDone() {
    if (this.phase === 'finale') { if (this.phaseT < 3.6) this.phaseT = 3.55; else this.finishGame(); return; }
    this.startFinale();
  }

  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.phase === 'dress') this.updateDress(dt);
    else if (this.phase === 'showtime') this.updateShowtime(dt);
    else if (this.phase === 'runway') this.updateRunway(dt);
    else if (this.phase === 'finale') this.updateFinale(dt);
    this.updateCamera();
  }

  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    for (const st of this.stations) st.actor.update(dt);
    this.updateCrowd(dt);
  }

  // =========================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'dress' || (this.phase === 'showtime' && !this.runwayReady)) this.drawDressing(g);
    else this.drawRunway(g);
  }

  /** Screen-space layer (the runway is drawn through the host's camera). */
  drawHUD(g) {
    if (this.phase === 'runway' || this.phase === 'finale') this.drawRunwayHUD(g);
    if (this.curtain > 0) this.drawCurtains(g, this.curtain);
    if (this.phase === 'showtime' && this.phaseT > 0.5 && this.phaseT < 2.0) ui.banner(g, 'Showtime!', this.phaseT - 0.5, { size: 180, color: '#ffd23f' });
  }

  updateCamera() {
    const cam = this.api.camera;
    if (!cam) return;
    if (this.phase === 'runway' && this.group) {
      const st0 = this.group[0];
      if (st0.rw.state === 'pose') {
        const xs = this.group.map((s) => s.actor.x), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const top = Math.min(...this.group.map((s) => s.actor.y - s.actor.height));
        cam.follow(cx, (top + RW.stopY) / 2 + 40, this.group.length === 1 ? 1.25 : 1.12, 2.2);
      } else cam.follow(W / 2, H / 2, 1, 2.5);
    } else cam.follow(W / 2, H / 2, 1, 3);
  }

  drawDressing(g) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#f6d7ff'); gr.addColorStop(1, '#ffd9ec');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.5;
    for (const d of this.bgDots) { g.fillStyle = '#fff'; starAt(g, d.x, d.y, d.r * (1 + 0.2 * Math.sin(this.t * 2 + d.p)), d.p); g.fill(); }
    g.restore();
    // side drapes (visible when the stations don't fill the screen)
    for (const side of [-1, 1]) {
      g.save(); g.translate(side < 0 ? 0 : W, 0); g.scale(side < 0 ? 1 : -1, 1);
      const cg = g.createLinearGradient(0, 0, 140, 0); cg.addColorStop(0, '#c2185b'); cg.addColorStop(1, '#ff6fa8');
      g.fillStyle = cg;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(150, 0); g.quadraticCurveTo(90, 500, 160, H); g.lineTo(0, H); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,0,60,0.35)'; g.lineWidth = 6;
      for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(k * 36, 0); g.quadraticCurveTo(k * 30, 500, k * 38, H); g.stroke(); }
      g.restore();
    }
    // title ribbon
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -420, -40, 840, 80, { r: 40, fill: '#9b5cff' });
    ui.text(g, 'Royal Dressing Room', 0, 2, { size: 52, weight: 800 });
    g.restore();
    this.drawCrownIcon(g, W / 2 - 470, 58, 30, '#ffd23f');
    this.drawCrownIcon(g, W / 2 + 470, 58, 30, '#ffd23f');
    if (this.n <= 2) {
      ui.hints(g, [['lb', ''], ['rb', 'Pick a spot']], 230, 56, { size: 34 });
      ui.hints(g, [['y', 'Surprise!']], W - 210, 56, { size: 34 });
    }
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawCrownIcon(g, x, y, s, color) {
    g.save(); g.translate(x, y);
    g.beginPath(); g.moveTo(-s, s * 0.5); g.lineTo(-s, -s * 0.4); g.lineTo(-s * 0.5, 0); g.lineTo(0, -s * 0.7); g.lineTo(s * 0.5, 0); g.lineTo(s, -s * 0.4); g.lineTo(s, s * 0.5); g.closePath();
    g.fillStyle = color; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.stroke();
    g.beginPath(); g.arc(0, s * 0.1, s * 0.15, 0, TAU); g.fillStyle = '#ff4d6d'; g.fill(); g.stroke();
    g.restore();
  }

  drawStation(g, st) {
    const { r, L, p } = st;
    const t = this.t;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26); g.clip();
    // wall
    const wg = g.createLinearGradient(0, r.y, 0, r.y + r.h);
    wg.addColorStop(0, mix(p.color, '#ffffff', 0.84)); wg.addColorStop(1, mix(p.color, '#ffffff', 0.68));
    g.fillStyle = wg; g.fillRect(r.x, r.y, r.w, r.h);
    // wallpaper hearts
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#ffffff';
    const step = clamp(r.h * 0.09, 40, 80);
    for (let yy = r.y + step * 0.5, row = 0; yy < r.y + r.h; yy += step, row++) {
      for (let xx = r.x + (row % 2 ? step / 2 : 0); xx < r.x + r.w; xx += step) { heartPath(g, xx, yy, step * 0.22); g.fill(); }
    }
    g.restore();
    // mirror behind the character
    const ca = L.ca, mx = L.foot.x, my = ca.y + ca.h * 0.44, mrx = Math.min(ca.w * 0.36, ca.h * 0.32), mry = ca.h * 0.42;
    const vanity = art('prop/vanity-mirror');
    if (vanity) g.drawImage(vanity, mx - mrx * 1.25, my - mry * 1.15, mrx * 2.5, mry * 2.3);
    else {
      g.beginPath(); g.ellipse(mx, my, mrx + 16, mry + 16, 0, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke();
      const mg = g.createLinearGradient(mx - mrx, my - mry, mx + mrx, my + mry);
      mg.addColorStop(0, '#e9f8ff'); mg.addColorStop(0.5, '#cdeeff'); mg.addColorStop(1, '#f2e6ff');
      g.beginPath(); g.ellipse(mx, my, mrx, mry, 0, 0, TAU); g.fillStyle = mg; g.fill(); g.lineWidth = 4; g.stroke();
      g.save(); g.clip(); g.globalAlpha = 0.5; g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(mx - mrx, my - mry * 0.2); g.lineTo(mx - mrx * 0.2, my - mry); g.lineTo(mx, my - mry); g.lineTo(mx - mrx, my + mry * 0.1); g.fill();
      g.restore();
      const bulbs = 14;
      for (let k = 0; k < bulbs; k++) {
        const a = (k / bulbs) * TAU;
        const bx = mx + Math.cos(a) * (mrx + 16), by = my + Math.sin(a) * (mry + 16);
        const on = 0.6 + 0.4 * Math.sin(t * 3 + k);
        g.beginPath(); g.arc(bx, by, clamp(r.h * 0.012, 5, 10), 0, TAU);
        g.fillStyle = `rgba(255,250,210,${on})`; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke();
      }
    }
    // floor + pedestal
    const fy = L.foot.y - ca.h * 0.06;
    g.fillStyle = mix(p.color, '#ffffff', 0.45); g.fillRect(r.x, fy, r.w, r.y + r.h - fy);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(r.x, fy, r.w, 6);
    const pr = Math.min(ca.w * 0.34, 260);
    g.beginPath(); g.ellipse(L.foot.x, L.foot.y + 6, pr, pr * 0.22, 0, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.ellipse(L.foot.x, L.foot.y, pr * 0.92, pr * 0.18, 0, 0, TAU); g.fillStyle = '#fff4fb'; g.fill();
    // the model
    st.actor.draw(g, { ring: p.color });
    g.restore();

    // frame
    g.save(); ui.roundRect(g, r.x, r.y, r.w, r.h, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke(); g.restore();

    this.drawTabs(g, st);
    this.drawList(g, st);
    this.drawStationHints(g, st);
    if (st.ready) this.drawReady(g, st);
  }

  drawTabs(g, st) {
    const { r, L } = st;
    const gs = clamp(L.tabH * 0.55, 30, 44);
    const x0 = r.x + 14 + gs * 0.8, x1 = r.x + r.w - 14 - gs * 0.8;
    const tw = (x1 - x0) / CATS.length;
    ui.glyph(g, 'lb', r.x + 10 + gs * 0.6, r.y + 10 + L.tabH / 2, gs * 0.9);
    ui.glyph(g, 'rb', r.x + r.w - 10 - gs * 0.6, r.y + 10 + L.tabH / 2, gs * 0.9);
    CATS.forEach((cat, ci) => {
      const sel = ci === st.tab;
      const bx = x0 + ci * tw + 4, bw = tw - 8, by = r.y + 10 + (sel ? 0 : 6), bh = L.tabH - (sel ? 0 : 8);
      const k = sel ? 1 + st.tabBump * 0.8 : 1;
      g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(k, k);
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 16, fill: sel ? '#ffffff' : mix(st.p.color, '#ffffff', 0.5), lineWidth: sel ? 5 : 3, shadow: sel });
      const worn = st.outfit[ci].item;
      const labeled = sel && bh > 64 && bw > 110;
      const isz = Math.min(bh * (labeled ? 0.95 : 1.15), bw * 0.62);
      drawItemIcon(g, ci, worn || cat.tabItem, worn ? st.outfit[ci].colors[worn] : null, 0, labeled ? -bh * 0.1 : bh * 0.04, isz, this.t);
      if (worn) { g.beginPath(); g.arc(bw / 2 - 9, -bh / 2 + 9, 6, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
      if (labeled) ui.text(g, cat.name, 0, bh * 0.34, { size: bh * 0.24, color: NAVY, stroke: false, weight: 800 });
      g.restore();
    });
  }

  drawList(g, st) {
    const { L } = st, lr = L.list;
    const ci = st.tab, cat = CATS[ci], o = st.outfit[ci];
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.86)', lineWidth: 4, shadow: false });
    const headH = clamp(lr.h * 0.09, 26, 50);
    ui.text(g, cat.name, lr.x + lr.w / 2, lr.y + headH * 0.62, { size: headH * 0.7, color: st.p.color, strokeWidth: 5 });
    const items = cat.items;
    const areaY = lr.y + headH + 6, areaH = lr.h - headH - 14;
    const vis = Math.min(items.length, Math.max(3, Math.floor(areaH / 64)));
    const slotH = areaH / vis;
    let first = clamp(o.item - Math.floor(vis / 2), 0, items.length - vis);
    const named = lr.w >= 200;
    for (let k = 0; k < vis; k++) {
      const ii = first + k, it = items[ii], sel = ii === o.item;
      const sy = areaY + k * slotH;
      const bump = sel ? st.listBump * 0.6 : 0;
      g.save(); g.translate(lr.x + lr.w / 2, sy + slotH / 2); g.scale(1 + bump, 1 + bump);
      const bw = lr.w - 16, bh = slotH - 6;
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 14, fill: sel ? '#ffd23f' : '#ffffff', lineWidth: sel ? 4 : 2, stroke: sel ? NAVY : 'rgba(36,22,63,0.25)', shadow: false });
      const isz = Math.min(bh * 0.9, named ? bh * 0.9 : bw * 0.8);
      const ix = named ? -bw / 2 + isz / 2 + 6 : 0;
      drawItemIcon(g, ci, ii, o.colors[ii], ix, 0, isz, this.t);
      if (named) ui.text(g, it.name, ix + isz / 2 + 8, 2, { size: clamp(bh * 0.3, 18, 30), color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: bw - isz - 26 });
      if (sel && it.draw) {
        const col = PALETTE[o.colors[ii]];
        const dr = clamp(bh * 0.13, 7, 13), dx = bw / 2 - dr - 8, dy = named ? 0 : bh / 2 - dr - 4;
        g.beginPath(); g.arc(dx, dy, dr, 0, TAU);
        g.fillStyle = col.rainbow ? (() => { const gg = g.createLinearGradient(dx - dr, 0, dx + dr, 0); RAINBOW.forEach((c, i2) => gg.addColorStop(i2 / 6, c)); return gg; })() : col.c;
        g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      }
      g.restore();
    }
    // scroll arrows
    g.fillStyle = NAVY;
    if (first > 0) { g.beginPath(); g.moveTo(lr.x + lr.w / 2 - 12, areaY + 2); g.lineTo(lr.x + lr.w / 2 + 12, areaY + 2); g.lineTo(lr.x + lr.w / 2, areaY - 10); g.fill(); }
    if (first + vis < items.length) { const yb = areaY + areaH; g.beginPath(); g.moveTo(lr.x + lr.w / 2 - 12, yb - 2); g.lineTo(lr.x + lr.w / 2 + 12, yb - 2); g.lineTo(lr.x + lr.w / 2, yb + 10); g.fill(); }
  }

  drawStationHints(g, st) {
    const { r, L, p } = st;
    const y = r.y + r.h - L.hintH / 2 - 8;
    const sz = clamp(L.hintH * 0.72, 26, 42);
    const wide = r.w > 700;
    let x = r.x + 16;
    // player tag
    const tw = clamp(sz * 2, 56, 84);
    ui.panel(g, x, y - sz * 0.5, tw, sz, { r: sz / 2, fill: p.color, lineWidth: 3, shadow: false });
    ui.text(g, p.tag, x + tw / 2, y + 1, { size: sz * 0.55, strokeWidth: 4, shadow: false });
    x += tw + 12;
    if (wide) drawPortrait(g, p.charId, x + sz * 0.55, y, sz * 0.55, { ring: p.color, ringWidth: 3 }), x += sz * 1.4;
    const o = st.outfit[st.tab], col = PALETTE[o.colors[o.item]];
    const items = [['x', wide ? 'Color' : ''], ['y', wide ? 'Surprise!' : ''], ['a', 'Ready!']];
    const avail = r.x + r.w - 16 - x;
    const lab = sz * 0.62;
    let need = 0;
    for (const [, l] of items) need += sz + 8 + (l ? ui.measure(g, l, lab) + 18 : 18);
    const k = Math.min(1, avail / need);
    x += Math.max(0, (avail - need * k) / 2);
    g.save(); g.translate(x, y); g.scale(k, k); x = 0;
    for (const [b, l] of items) {
      ui.glyph(g, b, x + sz / 2, 0, sz, { pulse: b === 'a' && !st.ready && st.outfit.some((oo) => oo.item) });
      x += sz + 6;
      if (b === 'x' && CATS[st.tab].items[o.item].draw) {
        g.beginPath(); g.arc(x + sz * 0.3, 0, sz * 0.3, 0, TAU);
        if (col.rainbow) { const gg = g.createLinearGradient(x, 0, x + sz * 0.6, 0); RAINBOW.forEach((c, i2) => gg.addColorStop(i2 / 6, c)); g.fillStyle = gg; } else g.fillStyle = col.c;
        g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(); x += sz * 0.7;
      }
      if (l) { ui.text(g, l, x, 2, { size: lab, color: '#fff', align: 'left', strokeWidth: 5 }); x += ui.measure(g, l, lab) + 18; } else x += 12;
    }
    g.restore();
  }

  drawReady(g, st) {
    const { L } = st, lr = L.list;
    g.save();
    ui.roundRect(g, lr.x, lr.y, lr.w, lr.h, 22); g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
    const cx = lr.x + lr.w / 2, cy = lr.y + lr.h * 0.36;
    const p = Math.min(1, st.readyT / 0.3), sc = ease.outBack(p);
    g.translate(cx, cy); g.rotate(-0.12); g.scale(sc, sc);
    const w = Math.min(lr.w * 0.95, 300), h = w * 0.36;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: h / 2, fill: '#36d17a', lineWidth: 5 });
    ui.text(g, 'Ready!', 0, 2, { size: h * 0.55, weight: 800 });
    g.restore();
    const waiting = this.stations.filter((s) => !s.ready).length;
    const sz = clamp(lr.w * 0.09, 16, 28);
    if (waiting) ui.text(g, waiting === 1 ? 'Waiting for 1 friend...' : `Waiting for ${waiting} friends...`, cx, cy + lr.h * 0.26, { size: sz, color: NAVY, stroke: false, maxWidth: lr.w - 20 });
    if (!st.p.isAI) ui.hints(g, [['b', 'Change']], cx, cy + lr.h * 0.42, { size: sz * 1.3 });
  }

  drawCurtains(g, k) {
    for (const side of [-1, 1]) {
      g.save();
      const w = (W / 2 + 40) * k;
      g.translate(side < 0 ? w - W / 2 - 40 : W - w, 0);
      const cg = g.createLinearGradient(0, 0, W / 2 + 40, 0);
      for (let i = 0; i <= 10; i++) cg.addColorStop(i / 10, i % 2 ? '#b0124f' : '#e8337a');
      g.fillStyle = cg; g.fillRect(0, 0, W / 2 + 40, H);
      g.fillStyle = '#ffd23f'; g.fillRect(side < 0 ? W / 2 + 22 : 0, 0, 18, H);
      g.restore();
    }
    g.fillStyle = '#7a0c3a'; g.fillRect(0, 0, W, 70 * k);
  }

  // --- runway scene -----------------------------------------------------------
  drawRunway(g) {
    const t = this.t;
    const bg = art('bg/fashion-show');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else this.drawHall(g, t);
    const models = this.stations.filter((s) => s.actor.visible);
    const side = models.filter((s) => s.rw && s.rw.state === 'side').sort((a, b) => a.actor.y - b.actor.y);
    for (const st of side) st.actor.draw(g, { ring: st.p.color });
    // spotlights on the current models
    const lit = this.phase === 'runway' ? (this.group || []) : this.photoTaken ? [] : models;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const st of lit) {
      const a = st.actor;
      for (const sx of [-1, 1]) {
        const ox = W / 2 + sx * 760, oy = -60, tx = a.x, ty = a.y;
        const wB = Math.max(90, a.width * 0.75);
        const sg = g.createLinearGradient(ox, oy, tx, ty);
        sg.addColorStop(0, 'rgba(255,246,200,0.0)'); sg.addColorStop(1, 'rgba(255,246,200,0.22)');
        g.fillStyle = sg;
        g.beginPath(); g.moveTo(ox - 14, oy); g.lineTo(ox + 14, oy); g.lineTo(tx + wB, ty); g.lineTo(tx - wB, ty); g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(255,246,200,0.18)'; g.beginPath(); g.ellipse(a.x, a.y, Math.max(100, a.width * 0.7), Math.max(28, a.width * 0.16), 0, 0, TAU); g.fill();
    }
    g.restore();
    const front = models.filter((s) => !s.rw || s.rw.state !== 'side').sort((a, b) => a.actor.y - b.actor.y);
    if (this.phase === 'finale') this.drawCrowd(g);
    for (const st of front) {
      st.actor.draw(g, { ring: st.p.color });
      if (this.phase === 'runway' && (st.rw.state === 'walk' || st.rw.state === 'pose')) {
        const head = st.actor.anchor('head');
        ui.playerTag(g, st.p, st.actor.x, head.y - 60);
        if (st.rw.state === 'pose' && !st.p.isAI) ui.glyph(g, 'a', st.actor.x + 64, head.y - 80, 52, { pulse: true });
      }
    }
    if (this.phase !== 'finale') this.drawCrowd(g);
    for (const f of this.flashes) {
      const k = 1 - f.t / f.life;
      g.save(); g.translate(f.x, f.y); g.globalAlpha = k;
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, f.size);
      rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, f.size, 0, TAU); g.fill();
      drawSparkleShape(g, f.size * 0.9 * (0.6 + k * 0.4), '#ffffff');
      g.restore();
    }
  }

  drawRunwayHUD(g) {
    if (this.phase === 'runway' || (this.phase === 'finale' && !this.photoTaken)) {
      ui.scoreboard(g, this.players, this.stations.map((s) => s.poses), { y: 14, format: (v) => `${v} pose${v === 1 ? '' : 's'}` });
    }
    if (this.phase === 'runway' && this.group) {
      const st0 = this.group[0];
      if (st0.rw.state === 'pose') {
        const anyHuman = this.group.some((s) => !s.p.isAI);
        const left = Math.max(0, WALK + POSE - this.groupT);
        const msg = anyHuman ? 'Strike a pose! Press A!' : 'Strike a pose!';
        ui.text(g, msg, W / 2, 1040, { size: 52, color: '#ffd23f', weight: 800 });
        ui.bar(g, W / 2 - 200, 990, 400, 18, left / POSE, '#ff7ac6');
      } else if (st0.rw.state === 'walk') {
        const names = this.group.map((s) => charById(s.p.charId).name).join(' & ');
        ui.text(g, names, W / 2, 1040, { size: 50, color: '#fff', weight: 800, maxWidth: 1100 });
      }
    }
    if (this.phase === 'finale') this.drawPhoto(g);
  }

  drawHall(g, t) {
    // back wall
    const wg = g.createLinearGradient(0, 0, 0, H);
    wg.addColorStop(0, '#2a1450'); wg.addColorStop(0.45, '#5a2a8a'); wg.addColorStop(1, '#2a1450');
    g.fillStyle = wg; g.fillRect(0, 0, W, H);
    // twinkle lights on the wall
    for (let i = 0; i < 46; i++) {
      const x = (i * 211) % W, y = 60 + ((i * 97) % 380);
      g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i);
      g.fillStyle = i % 3 ? '#ffe9a8' : '#ffb3e6';
      g.beginPath(); g.arc(x, y, 3 + (i % 3), 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // curtain behind the stage
    const cx0 = 380, cx1 = W - 380, cy0 = 150, cy1 = 445;
    const cg = g.createLinearGradient(cx0, 0, cx1, 0);
    for (let i = 0; i <= 24; i++) cg.addColorStop(i / 24, i % 2 ? '#a3124a' : '#d92a6e');
    g.fillStyle = cg; g.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    // center gap glow
    const gg = g.createLinearGradient(W / 2 - 90, 0, W / 2 + 90, 0);
    gg.addColorStop(0, 'rgba(255,220,240,0)'); gg.addColorStop(0.5, 'rgba(255,230,250,0.55)'); gg.addColorStop(1, 'rgba(255,220,240,0)');
    g.fillStyle = gg; g.fillRect(W / 2 - 90, cy0 + 40, 180, cy1 - cy0 - 40);
    // valance
    g.fillStyle = '#7a0c3a';
    g.beginPath(); g.moveTo(cx0 - 20, cy0 - 10);
    g.lineTo(cx1 + 20, cy0 - 10);
    for (let k = 0; k <= 12; k++) { const x = cx1 + 20 - k * ((cx1 - cx0 + 40) / 12); g.quadraticCurveTo(x + (cx1 - cx0 + 40) / 24, cy0 + 70, x, cy0 + 40); }
    g.closePath(); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.stroke();
    // sign
    g.save(); g.translate(W / 2, 168);
    ui.panel(g, -380, -46, 760, 92, { r: 46, fill: '#ffd23f' });
    ui.text(g, 'Royal Fashion Show', 0, 4, { size: 58, color: '#ff4d8b', weight: 800, strokeWidth: 10 });
    g.restore();
    this.drawCrownIcon(g, W / 2, 106, 30, '#ffd23f');
    // stage platform
    g.fillStyle = '#ffb3d9'; g.fillRect(240, 430, W - 480, 62);
    g.fillStyle = '#e07fb4'; g.fillRect(240, 492, W - 480, 26);
    g.strokeStyle = NAVY; g.lineWidth = 4; g.strokeRect(240, 430, W - 480, 88);
    for (let k = 0; k < 22; k++) {
      const x = 260 + k * ((W - 520) / 21);
      g.fillStyle = (Math.floor(t * 3) + k) % 2 ? '#fff6c0' : '#ffd23f';
      g.beginPath(); g.arc(x, 505, 6, 0, TAU); g.fill();
    }
    // runway
    const y0 = RW.backY, y1 = RW.frontY;
    g.beginPath(); g.moveTo(W / 2 - RW.backHW, y0); g.lineTo(W / 2 + RW.backHW, y0); g.lineTo(W / 2 + RW.frontHW, y1); g.lineTo(W / 2 - RW.frontHW, y1); g.closePath();
    const rg = g.createLinearGradient(0, y0, 0, y1); rg.addColorStop(0, '#ff8fc7'); rg.addColorStop(1, '#ff4d9a');
    g.fillStyle = rg; g.fill();
    g.save(); g.clip();
    g.globalAlpha = 0.18; g.fillStyle = '#fff';
    for (let k = 0; k < 12; k++) { const u = ((k / 12) + (t * 0.02)) % 1, y = lerp(y0, y1, u * u); g.fillRect(0, y, W, 4 + u * 10); }
    g.restore();
    g.lineWidth = 12; g.strokeStyle = '#ffd23f';
    g.beginPath(); g.moveTo(W / 2 - RW.backHW, y0); g.lineTo(W / 2 - RW.frontHW, y1); g.moveTo(W / 2 + RW.backHW, y0); g.lineTo(W / 2 + RW.frontHW, y1); g.stroke();
    for (let k = 0; k < 12; k++) {
      const u = k / 11, y = lerp(y0, y1, u * u * 0.95 + u * 0.05);
      const hw = hwAt(y);
      for (const sx of [-1, 1]) {
        const on = (Math.floor(t * 4) + k) % 3 !== 0;
        g.fillStyle = on ? '#fffbe0' : '#ffb84d';
        g.beginPath(); g.arc(W / 2 + sx * (hw + 2), y, 4 + u * 7, 0, TAU); g.fill();
      }
    }
  }

  drawCrowd(g) {
    for (const m of this.crowd) {
      const s = m.size, bob = Math.sin(this.t * 3 + m.ph) * 2 + m.jump;
      g.save(); g.translate(m.x, m.y - bob);
      g.fillStyle = m.c;
      g.beginPath(); g.ellipse(0, 0, s * 0.92, s * 0.62, 0, Math.PI, TAU); g.lineTo(s * 0.92, s * 0.6); g.lineTo(-s * 0.92, s * 0.6); g.closePath(); g.fill();
      g.beginPath(); g.arc(0, -s * 0.9, s * 0.48, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,150,220,0.45)'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, -s * 0.9, s * 0.48, Math.PI * 1.1, Math.PI * 1.75); g.stroke();
      if (m.phone) {
        const px = m.side * -s * 0.35;
        g.fillStyle = m.c; g.fillRect(px - s * 0.08, -s * 1.5, s * 0.16, s * 0.6);
        g.fillStyle = '#25163f'; ui.roundRect(g, px - s * 0.18, -s * 2.1, s * 0.36, s * 0.56, s * 0.06); g.fill();
        g.fillStyle = 'rgba(180,230,255,0.85)'; g.fillRect(px - s * 0.13, -s * 2.04, s * 0.26, s * 0.42);
      }
      g.restore();
    }
  }

  drawPhoto(g) {
    const t = this.phaseT;
    if (!this.photoTaken) {
      // viewfinder brackets
      const a = Math.min(1, Math.max(0, (t - 1.2) / 0.4));
      if (a <= 0) return;
      g.save(); g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 10; g.lineCap = 'round';
      const x0 = 150, y0 = 130, x1 = W - 150, y1 = H - 40, L = 90;
      for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        g.beginPath(); g.moveTo(x + dx * L, y); g.lineTo(x, y); g.lineTo(x, y + dy * L); g.stroke();
      }
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(x0 + 50, y0 + 50, 14 * (0.7 + 0.3 * Math.sin(t * 8)), 0, TAU); g.fill();
      g.restore();
      if (t > 1.6) ui.banner(g, 'Say cheese!', t - 1.6, { y: 380, size: 120, color: '#fff' });
      return;
    }
    const p = Math.min(1, (t - 3.6) / 0.5);
    // dim outside the frame
    const fx0 = 120, fy0 = 120, fx1 = W - 120, fy1 = H - 26;
    g.save(); g.fillStyle = `rgba(36,22,63,${0.55 * p})`;
    g.beginPath(); g.rect(0, 0, W, H); g.rect(fx0, fy0, fx1 - fx0, fy1 - fy0); g.fill('evenodd');
    g.restore();
    // gold frame
    g.save(); g.globalAlpha = p;
    g.lineWidth = 34; g.strokeStyle = '#ffd23f'; g.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    g.lineWidth = 6; g.strokeStyle = NAVY; g.strokeRect(fx0 - 17, fy0 - 17, fx1 - fx0 + 34, fy1 - fy0 + 34); g.strokeRect(fx0 + 17, fy0 + 17, fx1 - fx0 - 34, fy1 - fy0 - 34);
    g.fillStyle = '#ff7ac6';
    for (const [x, y] of [[fx0, fy0], [fx1, fy0], [fx0, fy1], [fx1, fy1]]) { heartPath(g, x, y + 6, 46); g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke(); }
    g.restore();
    // title ribbon
    const s = ease.outBack(Math.min(1, (t - 3.7) / 0.5));
    if (s > 0) {
      g.save(); g.translate(W / 2, 118); g.scale(s, s);
      g.fillStyle = '#c2185b';
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 430, -30); g.lineTo(sx * 540, -30); g.lineTo(sx * 500, 10); g.lineTo(sx * 540, 50); g.lineTo(sx * 430, 50); g.closePath(); g.fill(); g.lineWidth = 5; g.strokeStyle = NAVY; g.stroke(); }
      ui.panel(g, -460, -52, 920, 104, { r: 30, fill: '#ff4d9a' });
      ui.text(g, 'Royal Fashion Show', 0, 2, { size: 70, color: '#fff', weight: 800 });
      this.drawCrownIcon(g, 0, -78, 34, '#ffd23f');
      g.restore();
      ui.text(g, '★ Superstars! ★', W / 2, H - 70, { size: 46, color: '#ffd23f', alpha: Math.min(1, (t - 4.2) / 0.4) });
    }
  }
}

// --- menu / how-to thumbnail --------------------------------------------------
function drawIcon(g, x, y, w, h, t) {
  g.save();
  const s = Math.min(w / 860, h / 520);
  const bg = g.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, '#3a1a6a'); bg.addColorStop(1, '#8a3fb0');
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  // curtain
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#a3124a' : '#d92a6e'; g.fillRect(x + (i / 16) * w, y, w / 16 + 1, h * 0.38); }
  g.fillStyle = '#7a0c3a'; g.fillRect(x, y, w, h * 0.06);
  // runway
  const cx = x + w / 2;
  g.beginPath(); g.moveTo(cx - w * 0.1, y + h * 0.38); g.lineTo(cx + w * 0.1, y + h * 0.38); g.lineTo(cx + w * 0.34, y + h); g.lineTo(cx - w * 0.34, y + h); g.closePath();
  g.fillStyle = '#ff6fb1'; g.fill(); g.lineWidth = 8 * s; g.strokeStyle = '#ffd23f'; g.stroke();
  // spotlights
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,246,200,0.16)';
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * w * 0.45, y); g.lineTo(cx + sx * w * 0.02 + 90 * s, y + h * 0.8); g.lineTo(cx + sx * w * 0.02 - 90 * s, y + h * 0.8); g.closePath(); g.fill(); }
  g.restore();
  // crowd silhouettes
  g.fillStyle = '#2a1748';
  for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) {
    const px = cx + sx * (w * 0.3 + i * 52 * s), py = y + h * 0.86 + (i % 2) * 18 * s;
    g.beginPath(); g.arc(px, py - 34 * s, 22 * s, 0, TAU); g.fill(); g.beginPath(); g.ellipse(px, py + 10 * s, 36 * s, 26 * s, 0, Math.PI, TAU); g.fill();
  }
  // star model: portrait with crown + heart shades + wings
  const pr = 120 * s, py = y + h * 0.52;
  g.save(); g.translate(cx, py);
  const flap = Math.sin(t * 6) * 0.1;
  for (const sx of [-1, 1]) {
    g.save(); g.scale(sx, 1); g.rotate(-flap); g.globalAlpha = 0.85;
    g.fillStyle = '#9fe6ff'; g.beginPath(); g.ellipse(pr * 1.15, -pr * 0.35, pr * 0.75, pr * 0.42, -0.5, 0, TAU); g.fill();
    g.lineWidth = 5 * s; g.strokeStyle = NAVY; g.stroke();
    g.beginPath(); g.ellipse(pr * 0.95, pr * 0.4, pr * 0.48, pr * 0.28, 0.5, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
  drawPortrait(g, 'princess-amber', cx, py, pr, { ring: '#ffd23f', ringWidth: 8 * s, expr: 'happy' });
  g.save(); g.translate(cx, py - pr * 0.92);
  CATS[0].items[1].draw(g, pr * 1.2, PALETTE[1], t);
  g.restore();
  // camera flashes + sparkles
  for (let i = 0; i < 6; i++) {
    const k = (t * 1.3 + i * 0.37) % 1;
    g.save(); g.translate(x + w * ((i * 0.29 + 0.1) % 1), y + h * (0.7 + (i % 3) * 0.08)); g.globalAlpha = Math.max(0, 1 - k * 2.5);
    drawSparkleShape(g, 50 * s, '#ffffff'); g.restore();
  }
  for (let i = 0; i < 5; i++) {
    const u = (t * 0.4 + i / 5) % 1;
    g.save(); g.globalAlpha = Math.sin(u * Math.PI);
    heartPath(g, cx + Math.sin(i * 2 + t) * pr * 1.6, py + pr - u * pr * 2.4, 34 * s); g.fillStyle = '#ff7ac6'; g.fill(); g.lineWidth = 3 * s; g.strokeStyle = NAVY; g.stroke();
    g.restore();
  }
  g.restore();
}
