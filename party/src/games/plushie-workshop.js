// Plushie Workshop (Play Studio, everyone wins). Every player has a station on
// a sewing-workshop table and makes a plushie. It's a design game, so the steps (the
// category tabs, LB / RB; the last tab is Done) are not a progression: on every step but
// Dress, A does the step's action exactly like X and you stay on the step (on Dress, A puts
// the row's item on and moves on to the next row). B undoes one thing.
//   1 Body   - d-pad left / right: the body; up / down: the fabric. A / X: a squeeze.
//   2 Stuff  - hold (or tap) A or X to puff stuffing in: the flat empty skin plumps up
//              to fluffy, with a squeak when it's full (then A / X squeeze it).
//   3 Sew    - the needle is the cursor (left or right stick; WASD on a keyboard);
//              the piece in hand is drawn exactly where it will land, under the
//              needle's point. D-pad up / down: Eyes, Nose, Mouth, Hearts, Patches;
//              left / right (or LT / RT, which walk every piece): which one. A / X
//              sews it on: the needle dips in and out round its edge, the thread
//              goes on stitch by stitch and the piece pops into place (~0.7 s; a press
//              meanwhile waits its turn, the stick waits). A face piece replaces the
//              old one, then the next face row comes up. B unpicks the newest one.
//   4 Dress  - left stick / d-pad up / down: Head, Neck, Hug, Back; left / right: try
//              things on (X: the next one; LT / RT walk every item). The right stick moves
//              the current row's item, each within its own limits (data.js moveRule: head
//              things on the head or ears, neck things by the neck, hug things round the
//              tummy and paws, back things behind the shoulders); each item keeps its own
//              spot. A puts it on and goes on to the next row (Back wraps round to Head).
//              Keyboard (no right stick): WASD moves the current item while it can move;
//              X or 1 / 3 then pick, A goes on. Hug: something held in the plush's paws.
//   5 Name   - d-pad: pick a name idea; A / X: new ideas (the name generator).
// On Done, A = "my plushie is ready" (B: not yet). The clock (always shown) asks
// "Hug time!" at 0: Go! (default) or Stay in the workshop (+1 min).
// Finale: every character hugs their plushie (the 'cuddle' pose, the plush at the
// chest) as hearts float up; players walk about with the stick and A jumps, still
// hugging (CPUs wander), then the plushies hop onto a toy shelf with name tags: the
// gallery ending.
//
// Drawing of the plushie itself: plushie-workshop/plush.js; data: data.js.
import { playerName } from '../state.js';
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { drawDoneTab, drawDoneCard } from '../engine/studio-ui.js';
import { NAVY, CW, CH, F, BODIES, FABRICS, FABRIC_IDX, SEW_ROWS, SEW_IDX, MAX_PIECES, DRESS_ROWS, DRESS_IDX, SEW_T, moveRule, posKey, nameIdeas } from './plushie-workshop/data.js';
import { drawPlush, drawPiece, drawClothes, drawFluff, drawNeedle, onPlush, pieceRadius, stitchPath, toScreen, heartPath, starPath, mix, drawSwatch, clearPlushCaches } from './plushie-workshop/plush.js';
import { meta } from './plushie-workshop.meta.js';

export { meta };

const TABS = [
  { id: 'body', name: 'Body' }, { id: 'stuff', name: 'Stuff' }, { id: 'sew', name: 'Sew' },
  { id: 'dress', name: 'Dress' }, { id: 'name', name: 'Name' },
];
const DONE = TABS.length;
const T = Object.fromEntries(TABS.map((t, i) => [t.id, i]));
const WORK_TIME = 240, WORK_MORE = 60;
const HUG_T = 5.6, HUG_T_PLAY = 11;   // the hugs (longer with people walking about), then the toy shelf
// The toy shelf remembers the plushies made on this device (people's only, not the CPUs'):
// the newest SHELF_MAX, the oldest bumped off; they're already sitting there next time.
const SHELF_KEY = 'charlie-party-plushie-shelf', SHELF_MAX = 12;   // (two boards of 6)
const snd = (k, fb, o) => (hasSound(k) ? sfx(k, o) : fb && sfx(fb, o));

/** A finished plushie as plain data for the shelf memory. */
function packPlush(P, color) {
  const pos = {};
  P.dress.forEach((idx, row) => { const o = P.pos && P.pos[posKey(row, idx)]; if (idx && o) pos[posKey(row, idx)] = { dx: Math.round(o.dx), dy: Math.round(o.dy) }; });
  return {
    body: BODIES[P.body].id, fabric: FABRICS[P.fabric].id, name: String(P.name || '').slice(0, 20), color,
    pieces: P.pieces.map((pc) => [pc.row, pc.i, Math.round(pc.x), Math.round(pc.y)]), dress: [...P.dress], pos,
  };
}

/** Back from storage (checked: anything odd is dropped rather than drawn). */
function unpackPlush(d) {
  if (!d || typeof d !== 'object') return null;
  const body = BODIES.findIndex((b) => b.id === d.body), fabric = FABRIC_IDX[d.fabric];
  if (body < 0 || fabric == null) return null;
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const pieces = (Array.isArray(d.pieces) ? d.pieces : []).slice(0, MAX_PIECES + 3)
    .filter((q) => Array.isArray(q) && q.every(num) && SEW_ROWS[q[0]] && q[1] >= 0 && q[1] < SEW_ROWS[q[0]].items.length)
    .map(([row, i, x, y]) => ({ row, i, x: clamp(x, 0, CW), y: clamp(y, 0, CH), st: 9 }));
  const dress = DRESS_ROWS.map((R, row) => { const v = Array.isArray(d.dress) ? d.dress[row] : 0; return Number.isInteger(v) && v >= 0 && v < R.items.length ? v : 0; });
  const pos = {};
  for (const [k, o] of Object.entries(d.pos && typeof d.pos === 'object' ? d.pos : {})) {
    const [row, idx] = k.split(':').map(Number), rule = moveRule(row, idx);
    if (rule && dress[row] === idx && o && num(o.dx) && num(o.dy)) pos[k] = { dx: clamp(o.dx, rule.lim[0], rule.lim[1]), dy: clamp(o.dy, rule.lim[2], rule.lim[3]) };
  }
  const color = typeof d.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(d.color) ? d.color : '#ff6fb1';
  const name = typeof d.name === 'string' && d.name ? d.name.slice(0, 20) : 'Snuggles';
  return { body, fabric, puff: 1, pieces, dress, pos, name, color };
}

function loadShelf() {
  try {
    const list = JSON.parse(localStorage.getItem(SHELF_KEY) || '[]');
    return Array.isArray(list) ? list.slice(-SHELF_MAX) : [];
  } catch (e) { return []; }   // storage blocked or garbled
}
function saveShelf(list) {
  try { localStorage.setItem(SHELF_KEY, JSON.stringify(list.slice(-SHELF_MAX))); } catch (e) { /* storage blocked or full */ }
}

/** Split-screen station rects: 1 = big centre, 2 = halves, 3-4 = quadrants, 5-8 = 4 x 2. */
function stationRects(n) {
  const top = 108, bottom = 1068, left = 14, right = W - 14, gap = 14;
  if (n === 1) return [{ x: 260, y: top, w: 1400, h: bottom - top }];
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
  const listW = Math.round(r.w * (n === 1 ? 0.3 : 0.38));
  const ca = { x: r.x, y: r.y + tabH + 14, w: r.w - listW - 12, h: r.h - tabH - hintH - 26 };
  const tableY = ca.y + ca.h * 0.86;
  const size = Math.min(ca.h * 0.78, ca.w * 0.9);
  return {
    tabH, hintH, listW, ca, tableY, size,
    list: { x: r.x + r.w - listW - 10, y: ca.y, w: listW, h: ca.h - 2 },
    seat: { x: ca.x + ca.w * 0.5, y: tableY + size * 0.02 },
  };
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'work';     // work -> hug -> shelf
    this.phaseT = 0;
    this.finished = false;
    this.workLeft = WORK_TIME;
    this.cpuOnly = this.players.every((p) => p.isAI);
    api.limit(() => (this.phase === 'work' ? this.workLeft : null), {
      showAt: Infinity, x: W / 2 + 560, y: 56,
      timeUp: { goal: true, title: 'Hug time!', goLabel: 'Go!', moreLabel: 'Stay in the workshop', more: () => { this.workLeft += WORK_MORE; }, done: () => this.startFinale() },
    });
    const rects = stationRects(this.n);
    const bodies = shuffle(BODIES.map((_, i) => i));
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i], bodies[i % bodies.length]));
    this.hearts = [];
    this.dots = Array.from({ length: 34 }, (_, i) => ({ x: (i * 397) % W, y: 110 + ((i * 223) % 950), r: 3 + (i % 4) * 2, ph: i * 0.7 }));
    sfx('magic');
  }

  makeStation(p, i, r, body) {
    const L = layoutStation(r, this.n);
    const st = {
      p, i, r, L, tab: 0, ready: false, readyT: 0, tabBump: 0, listBump: 0,
      plush: { body, fabric: FABRIC_IDX[BODIES[body].fabric], puff: 0, pieces: [], dress: [0, 0, 0, 0], pos: {}, name: null },
      sewRow: 0, sewItem: SEW_ROWS.map(() => 0), dressRow: 0, undo: [], sewAnim: null, sewQ: false, moving: null, kbArmed: false,
      names: [], nameIdx: 0, named: false,
      cur: { x: F.cx, y: F.eyeY },
      wob: 0, shift: 0, full: false, fluff: [], fluffT: 0, crankT: 0, squeakT: 0,
      nudge: null, ai: null, aiStick: 0,
    };
    st.names = nameIdeas(BODIES[body].id, this.usedNames());
    if (p.isAI) this.planAI(st);
    return st;
  }

  usedNames() { return new Set((this.stations || []).map((s) => s.plush.name).filter(Boolean)); }

  // =========================================================================
  // Steps
  setTab(st, tab) {
    tab = (tab + DONE + 1) % (DONE + 1);
    if (st.tab === tab) return;
    st.tab = tab; st.tabBump = 0.18; st.nudge = null; sfx('move');
    if (tab === T.sew) this.aimRow(st);
    if (tab === T.name && !st.plush.name) st.plush.name = st.names[st.nameIdx];
  }

  say(st, text, dur = 2.4, pre = null, post = null) { st.nudge = { text, pre, post, t: 0, dur }; }

  /** The plushie's seat on screen (it slides right on Stuff, to make room for the stuffer). */
  seatPos(st) { return { x: st.L.seat.x + st.shift * st.L.ca.w * 0.16, y: st.L.seat.y }; }
  plushScreen(st, fx0, fy0) { const s = this.seatPos(st); return toScreen(s.x, s.y, fx0, fy0, st.L.size, st.plush.puff); }

  confirmSpark(st) {
    const c = this.plushScreen(st, F.cx, 330);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 10, colors: ['#ffffff', '#fff6a8', st.p.color] });
    st.wob = Math.max(st.wob, 0.6);
  }

  // --- undo (B): one thing back, on the step it was done on ------------------------
  pushUndo(st, fn) { st.undo.push({ tab: st.tab, fn }); if (st.undo.length > 60) st.undo.shift(); }
  undoOne(st, empty) {
    let k = st.undo.length - 1;
    while (k >= 0 && st.undo[k].tab !== st.tab) k--;
    if (k < 0) { sfx('blip'); if (empty) this.say(st, empty, 1.8); return false; }
    const [u] = st.undo.splice(k, 1);
    u.fn(); sfx('back'); st.wob = Math.max(st.wob, 0.5); st.listBump = 0.15;
    return true;
  }

  /** A / X where the step has nothing else to do: a squeezy squeak. */
  squeeze(st) {
    if (st.squeakT > 0) return;
    snd('tiny-squeak', 'pop'); st.wob = 1; st.squeakT = 0.3;
    const h = this.plushScreen(st, F.cx, 150);
    particles.burst(h.x, h.y, { type: 'heart', count: 2 });
  }

  // --- 1 Body ---------------------------------------------------------------
  setBody(st, body, fabric) {
    const P = st.plush;
    if (body !== P.body) {
      P.body = body;
      if (!st.named) { st.names = nameIdeas(BODIES[P.body].id, this.usedNames()); st.nameIdx = 0; if (P.name) P.name = st.names[0]; }
      this.fitDress(st);
    }
    P.fabric = fabric;
  }

  updateBody(st, c) {
    const P = st.plush, dx = c.nav.x, dy = dx ? 0 : c.nav.y;
    if (dx || dy) {
      const was = [P.body, P.fabric];
      this.pushUndo(st, () => this.setBody(st, was[0], was[1]));
      if (dx) { this.setBody(st, (P.body + dx + BODIES.length) % BODIES.length, P.fabric); sfx('swap'); }
      else { this.setBody(st, P.body, (P.fabric + dy + FABRICS.length) % FABRICS.length); sfx('collect', { step: P.fabric % 12 }); }
      st.wob = 0.8; st.listBump = 0.15;
      const s = this.plushScreen(st, F.cx, 300);
      particles.burst(s.x, s.y, { type: 'sparkle', count: 6, colors: ['#ffffff', FABRICS[P.fabric].c] });
    }
    if (c.pressed('a') || c.pressed('x')) this.squeeze(st);
    else if (c.pressed('b')) this.undoOne(st, 'Pick a body and a fabric!');
  }

  // --- 2 Stuff ----------------------------------------------------------------
  puff(st, amt, burst) {
    const P = st.plush, before = P.puff;
    P.puff = Math.min(1, P.puff + amt);
    if (burst) this.spawnFluff(st, 2);
    st.wob = Math.max(st.wob, burst ? 0.7 : 0.25);
    if (before < 1 && P.puff >= 1) this.fullUp(st);
  }

  fullUp(st) {
    if (st.full) return;
    st.full = true;
    snd('squeak', 'pop'); sfx('sparkle');
    st.wob = 1.2; st.squeakT = 0.5;
    const c = this.plushScreen(st, F.cx, 300);
    particles.burst(c.x, c.y, { type: 'sparkle', count: 18, colors: ['#ffffff', '#fff6a8', '#ffc8f0'] });
    particles.popText(c.x, c.y - st.L.size * 0.35, 'So fluffy!', st.p.color, clamp(st.L.size * 0.13, 28, 54));
    st.nudge = null;
  }

  spawnFluff(st, n = 1) {
    for (let k = 0; k < n; k++) {
      st.fluff.push({ t: 0, life: rand(0.45, 0.7), r: rand(0.035, 0.06) * st.L.size, rot: rand(TAU), spin: rand(-6, 6),
        tx: F.cx + rand(-60, 60), ty: rand(300, 470), arc: rand(0.12, 0.3) });
    }
  }

  nozzle(st) {
    const s = this.seatPos(st), k = st.L.size / CH;
    // The generated machine's foot support is y370, 70 source pixels below
    // its outlet. Keep it on the table at the same scale used by drawStuffer.
    const y = art('prop/plushie-stuffer') ? st.L.tableY - 70 * k * 0.56 * 0.9 : s.y - 84 * k;
    return { x: s.x - 230 * k, y, k: k * 0.56 };
  }

  /** Stuff: A and X are the same (hold to puff stuffing in, tap for a puff; full: a squeak). */
  updateStuff(st, c, dt) {
    const P = st.plush;
    if (c.held('x') || c.held('a')) {
      st.crankT += dt * 8;
      if (P.puff < 1) this.puff(st, 0.38 * dt, false);
      st.fluffT -= dt;
      if (st.fluffT <= 0) {
        st.fluffT = 0.11; this.spawnFluff(st);
        if (P.puff < 1) sfx('pump', { vol: 0.35 });
      }
    }
    if (c.pressed('x') || c.pressed('a')) {
      if (P.puff < 1) { this.puff(st, 0.06, true); sfx('pop', { vol: 0.5 }); }
      else if (st.squeakT <= 0) { this.squeeze(st); this.spawnFluff(st); }
    }
    if (c.pressed('b')) { sfx('blip'); this.say(st, P.puff < 1 ? 'Stuff it full!' : 'So fluffy!', 1.6, P.puff < 1 ? 'hold' : null, 'to stuff'); }
  }

  // --- 3 Sew -------------------------------------------------------------------
  /** Put the needle on the row's spot when that row has nothing sewn yet. */
  aimRow(st) {
    const R = SEW_ROWS[st.sewRow];
    const has = st.plush.pieces.some((pc) => (R.face ? pc.row === st.sewRow : !SEW_ROWS[pc.row].face));
    if (!has) { const a = R.at(); st.cur.x = a.x; st.cur.y = a.y; }
  }

  stepSewItem(st, d, cross) {
    const R = SEW_ROWS[st.sewRow];
    let i = st.sewItem[st.sewRow] + d;
    if (cross && (i < 0 || i >= R.items.length)) {   // LT / RT walk on into the next row
      st.sewRow = (st.sewRow + Math.sign(d) + SEW_ROWS.length) % SEW_ROWS.length;
      i = d > 0 ? 0 : SEW_ROWS[st.sewRow].items.length - 1;
      st.sewItem[st.sewRow] = i; if (!st.sewAnim) this.aimRow(st);
    } else st.sewItem[st.sewRow] = (i + R.items.length) % R.items.length;
    st.listBump = 0.15; sfx('swap');
  }

  /** Sew the piece in hand on at the needle: the needle goes round its edge (sewAnim), then it pops into place. */
  stitch(st) {
    const P = st.plush, row = st.sewRow, R = SEW_ROWS[row];
    if (!onPlush(P.body, st.cur.x, st.cur.y)) { sfx('blip'); this.say(st, 'Point the needle at your plushie!', 1.8); return false; }
    const old = R.face ? P.pieces.filter((pc) => pc.row === row) : [];
    if (!R.face && P.pieces.length >= MAX_PIECES) { sfx('blip'); this.say(st, 'So many! B unpicks one.', 1.8); return false; }
    const pc = { row, i: st.sewItem[row], x: st.cur.x, y: st.cur.y, st: 0, sew: SEW_T, replaced: old };
    P.pieces = P.pieces.filter((q) => !old.includes(q));
    P.pieces.push(pc);
    st.sewAnim = { pc, t: 0, path: stitchPath(row, pc.x, pc.y), done: 0 };
    snd('bead-zip', 'tick', { vol: 0.45 });
    if (R.face) {   // on to the next face row (its spot comes up under the needle once it's sewn)
      st.sewRow = row + 1; this.aimRow(st);
      if (st.sewRow === SEW_IDX.heart && !P.pieces.some((q) => !SEW_ROWS[q.row].face)) { const a = SEW_ROWS[st.sewRow].at(); st.cur.x = a.x; st.cur.y = a.y; }
    }
    return true;
  }

  /** The needle's trip round the piece: a stitch tick each time it dips in; the pop at the end. */
  tickSew(st, dt) {
    const A = st.sewAnim;
    if (!A) return;
    A.t += dt;
    const n = A.path.pts.length - 1, done = Math.min(n, Math.floor((A.t / SEW_T) * n + 0.0001));
    while (A.done < done) { A.done++; if (!A.path.jump.has(A.done - 1)) sfx('tick', { vol: 0.35 }); }
    if (A.t >= SEW_T) {
      st.sewAnim = null;
      const pc = A.pc;
      st.wob = Math.max(st.wob, 0.45);
      sfx('stamp'); snd('pop', null, { vol: 0.5 });
      const s = this.plushScreen(st, pc.x, pc.y);
      particles.burst(s.x, s.y, { type: 'sparkle', count: 8, colors: ['#ffffff', '#ff8ec4', '#fff6a8'] });
      if (pc.row === SEW_IDX.eyes) { const h = this.plushScreen(st, F.cx, F.eyeY); particles.burst(h.x, h.y - 20, { type: 'heart', count: 3 }); }
      if (st.sewQ) { st.sewQ = false; this.stitch(st); }
    }
  }

  /** Where the needle's point is while it sews (frame px) and how high it's lifted (0..1). */
  sewNeedle(st) {
    const A = st.sewAnim, pts = A.path.pts, n = pts.length - 1;
    const u = clamp(A.t / SEW_T, 0, 1) * n, k = Math.min(n - 1, Math.floor(u)), f = u - k;
    const a = pts[k], b = pts[k + 1], e = ease.inOutQuad(f);
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), lift: Math.sin(f * Math.PI) * (A.path.jump.has(k) ? 1.6 : 1) };
  }

  unpick(st) {
    const P = st.plush;
    if (st.sewAnim) {   // B while sewing: that piece comes off again (and what it replaced goes back)
      const pc = st.sewAnim.pc; st.sewAnim = null; st.sewQ = false;
      P.pieces = P.pieces.filter((q) => q !== pc);
      for (const q of pc.replaced || []) P.pieces.push(q);
      sfx('back');
      st.sewRow = pc.row; st.sewItem[pc.row] = pc.i; st.cur.x = pc.x; st.cur.y = pc.y;
      return true;
    }
    const pc = P.pieces.pop();
    if (!pc) return false;
    for (const q of pc.replaced || []) { q.st = 9; P.pieces.push(q); }   // the face piece it replaced comes back
    sfx('back'); sfx('pop', { vol: 0.4 });
    const s = this.plushScreen(st, pc.x, pc.y);
    particles.burst(s.x, s.y, { type: 'spark', count: 6, colors: ['#ffffff', '#ff8ec4'] });
    st.sewRow = pc.row; st.sewItem[pc.row] = pc.i; st.cur.x = pc.x; st.cur.y = pc.y;
    return true;
  }

  updateSew(st, c, dt) {
    const pad = c.kind !== 'kb';   // (CPUs use the pad's controls)
    // the needle: left or right stick on a pad (the d-pad picks pieces), WASD on a keyboard;
    // it's busy while it sews a piece on (the stick waits)
    let mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    if (pad && Math.hypot(c.rx, c.ry) > Math.hypot(mx, my)) { mx = c.rx; my = c.ry; }
    if (!st.sewAnim && Math.hypot(mx, my) > 0.15) {
      const sp = 430;
      st.cur.x = clamp(st.cur.x + mx * sp * dt, 24, CW - 24);
      st.cur.y = clamp(st.cur.y + my * sp * dt, 12, CH - 14);
    }
    if (pad) {
      const dy = (c.pressed('down') ? 1 : 0) - (c.pressed('up') ? 1 : 0);
      if (dy) { st.sewRow = (st.sewRow + dy + SEW_ROWS.length) % SEW_ROWS.length; if (!st.sewAnim) this.aimRow(st); st.listBump = 0.15; sfx('move'); }
      const dx = (c.pressed('right') ? 1 : 0) - (c.pressed('left') ? 1 : 0);
      if (dx) this.stepSewItem(st, dx, false);
    }
    const dt2 = (c.pressed('rt') ? 1 : 0) - (c.pressed('lt') ? 1 : 0);
    if (dt2) this.stepSewItem(st, dt2, true);
    // A and X both sew (a press while the needle is busy waits for it)
    if (c.pressed('x') || c.pressed('a')) { if (st.sewAnim) st.sewQ = true; else this.stitch(st); }
    else if (c.pressed('b')) { if (!this.unpick(st)) { sfx('blip'); this.say(st, 'Nothing to unpick!', 1.6); } }
  }

  // --- 4 Dress -------------------------------------------------------------------
  // Up / down (left stick or d-pad): the row; left / right: try things on. The right stick moves
  // the current row's item only (each item keeps its own spot: P.pos, data.js moveRule). A puts
  // it on and goes on to the next row (from Back round to Head again); X tries the next one on.
  /** The rule for moving the current row's worn item (null: it stays put). */
  moveRuleNow(st) { return moveRule(st.dressRow, st.plush.dress[st.dressRow]); }

  /** Is (x, y) a good spot for this item (inside its box; head items on the head or ears)? */
  spotOk(st, rule, x, y) {
    const [x0, x1, y0, y1] = rule.lim, dx = x - rule.home.x, dy = y - rule.home.y;
    if (dx < x0 || dx > x1 || dy < y0 || dy > y1) return false;
    if (rule.y && (y < rule.y[0] || y > rule.y[1])) return false;
    return !rule.on || onPlush(st.plush.body, x, y + (rule.onDY || 0));
  }

  /** Keep a worn item on the plush (a new body or item): back towards its home, then the head's middle. */
  fitItem(st, row) {
    const P = st.plush, idx = P.dress[row], rule = moveRule(row, idx);
    if (!rule || !rule.on) return;
    const key = posKey(row, idx), o = P.pos[key] || { dx: 0, dy: 0 }, h = rule.home;
    if (this.spotOk(st, rule, h.x + o.dx, h.y + o.dy)) return;
    const tries = [];
    for (let k = 1; k <= 12; k++) tries.push({ dx: o.dx * (1 - k / 12), dy: o.dy * (1 - k / 12) });
    for (let k = 1; k <= 12; k++) tries.push({ dx: (F.cx - h.x) * k / 12, dy: (F.head.y - 40 - h.y) * k / 12 });
    const ok = tries.find((q) => this.spotOk(st, rule, h.x + q.dx, h.y + q.dy));
    if (ok && (ok.dx || ok.dy)) P.pos[key] = { dx: ok.dx, dy: ok.dy };
    else delete P.pos[key];
  }
  fitDress(st) { for (let row = 0; row < DRESS_ROWS.length; row++) this.fitItem(st, row); }

  /** Move the current row's item (right stick; WASD on a keyboard), sliding along its edge rather than stopping dead. */
  moveItem(st, mx, my, dt) {
    const P = st.plush, row = st.dressRow, idx = P.dress[row], rule = moveRule(row, idx);
    if (!rule || Math.hypot(mx, my) <= 0.2) { st.moving = null; return; }
    const key = posKey(row, idx);
    if (st.moving !== key) {   // one undo per push of the stick
      st.moving = key;
      this.fitItem(st, row);
      const was = P.pos[key] ? { ...P.pos[key] } : null;
      this.pushUndo(st, () => { if (was) P.pos[key] = was; else delete P.pos[key]; });
    }
    const o = P.pos[key] || { dx: 0, dy: 0 }, h = rule.home, sp = 300 * dt;
    const x = h.x + o.dx, y = h.y + o.dy, nx = x + mx * sp, ny = y + my * sp;
    let to = null;
    if (this.spotOk(st, rule, nx, ny)) to = [nx, ny];
    else if (this.spotOk(st, rule, nx, y)) to = [nx, y];
    else if (this.spotOk(st, rule, x, ny)) to = [x, ny];
    if (to) P.pos[key] = { dx: to[0] - h.x, dy: to[1] - h.y };
    st.moveT = (st.moveT || 0) + dt;
    if (st.moveT > 0.12) { st.moveT = 0; const q = P.pos[key] || o, s = this.plushScreen(st, h.x + q.dx, h.y + q.dy); particles.burst(s.x, s.y, { type: 'sparkle', count: 1, colors: ['#ffffff', '#fff6a8'] }); }
  }

  /** Where the row's item is (frame px), for sparkles. */
  dressSpot(st, row) {
    const idx = st.plush.dress[row], rule = moveRule(row, idx);
    if (!rule) return { x: F.cx, y: [F.headTop + 10, F.neck.y, F.tummy.y, F.back.y][row] };
    const o = st.plush.pos[posKey(row, idx)] || { dx: 0, dy: 0 };
    return { x: rule.home.x + o.dx, y: rule.home.y + o.dy };
  }

  setDress(st, row, item) {
    const d = st.plush.dress, was = d[row];
    if (was === item) return;
    this.pushUndo(st, () => { d[row] = was; this.fitItem(st, row); });
    d[row] = item; st.moving = null;
    this.fitItem(st, row);
    st.listBump = 0.15; st.wob = 0.6;
    const sp = this.dressSpot(st, row), s = this.plushScreen(st, sp.x, sp.y);
    if (item) { sfx('swap'); particles.burst(s.x, s.y, { type: 'sparkle', count: 8, colors: ['#ffffff', '#ffc8f0', '#fff6a8'] }); }
    else { sfx('whoosh'); particles.burst(s.x, s.y, { type: 'dust', count: 5 }); }
  }

  stepDress(st, d, cross) {
    let row = st.dressRow, i = st.plush.dress[row] + d;
    const len = DRESS_ROWS[row].items.length;
    if (cross && (i < 0 || i >= len)) {   // LT / RT walk on into the next row
      row = st.dressRow = (row + Math.sign(d) + DRESS_ROWS.length) % DRESS_ROWS.length;
      i = d > 0 ? 0 : DRESS_ROWS[row].items.length - 1;
    }
    this.setDress(st, row, (i + DRESS_ROWS[row].items.length) % DRESS_ROWS[row].items.length);
  }

  dressRowTo(st, row) {
    st.dressRow = (row + DRESS_ROWS.length) % DRESS_ROWS.length;
    st.moving = null; st.listBump = 0.15; sfx('move');
  }

  /** A: what's on this row stays on (a little sparkle), and on to the next row (Back wraps round to Head). */
  putOn(st) {
    const row = st.dressRow;
    if (st.plush.dress[row]) {
      const sp = this.dressSpot(st, row), s = this.plushScreen(st, sp.x, sp.y);
      particles.burst(s.x, s.y, { type: 'sparkle', count: 10, colors: ['#ffffff', '#fff6a8', st.p.color] });
      sfx('collect', { step: row * 2 }); st.wob = Math.max(st.wob, 0.5);
    }
    this.dressRowTo(st, row + 1);
  }

  /** Keyboard (no right stick): WASD moves the current row's item while it can move; X or 1 / 3 then pick, A goes on. */
  kbMove(st, c) { return c.kind === 'kb' && !!this.moveRuleNow(st); }

  updateDress(st, c, dt) {
    if (this.kbMove(st, c)) {
      // (a key still down from picking the item doesn't push it: let go first)
      if (!st.kbArmed) { st.kbArmed = Math.hypot(c.x, c.y) < 0.2; st.moving = null; }
      else this.moveItem(st, c.x, c.y, dt);
    } else {
      st.kbArmed = false;
      this.moveItem(st, c.rx, c.ry, dt);   // the right stick: the current row's item, nothing else
      if (c.nav.y) this.dressRowTo(st, st.dressRow + c.nav.y);
      else if (c.nav.x) this.stepDress(st, c.nav.x, false);
    }
    const t2 = (c.pressed('rt') ? 1 : 0) - (c.pressed('lt') ? 1 : 0);
    if (t2) this.stepDress(st, t2, true);
    if (c.pressed('a')) this.putOn(st);
    else if (c.pressed('x')) this.stepDress(st, 1, false);   // try the next one on
    else if (c.pressed('b')) this.undoOne(st, 'Try things on!');
  }

  // --- 5 Name ----------------------------------------------------------------------
  setNames(st, names, idx) { const P = st.plush; st.names = names; st.nameIdx = idx; P.name = names[idx]; }

  updateName(st, c) {
    const P = st.plush;
    const d = c.nav.x || c.nav.y;
    if (d) {
      const was = [st.names, st.nameIdx, st.named];
      this.pushUndo(st, () => { this.setNames(st, was[0], was[1]); st.named = was[2]; });
      this.setNames(st, st.names, (st.nameIdx + d + st.names.length) % st.names.length);
      st.named = true; st.listBump = 0.15; sfx('move');
    }
    if (c.pressed('x') || c.pressed('a')) {   // new name ideas
      const was = [st.names, st.nameIdx, st.named];
      this.pushUndo(st, () => { this.setNames(st, was[0], was[1]); st.named = was[2]; });
      const used = this.usedNames(); used.delete(P.name);
      this.setNames(st, nameIdeas(BODIES[P.body].id, used), 0); st.named = true;
      st.listBump = 0.3; sfx('magic'); st.wob = 0.8;
      const s = this.plushScreen(st, F.cx, 80);
      particles.burst(s.x, s.y, { type: 'star', count: 8 });
      particles.popText(s.x, s.y, P.name + '!', st.p.color, clamp(st.L.size * 0.1, 24, 46));
    } else if (c.pressed('b')) this.undoOne(st, 'Pick a name!');
  }

  setReady(st, on) {
    st.ready = on; st.readyT = 0;
    if (!on) { sfx('back'); return; }
    if (!st.plush.name) st.plush.name = st.names[st.nameIdx];
    sfx('ready'); st.wob = 1.2;
    const s = this.plushScreen(st, F.cx, 300);
    particles.burst(s.x, s.y, { type: 'confetti', count: 26, speed: [200, 480] });
  }

  // =========================================================================
  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.phase === 'work') this.updateWork(dt);
    else this.updateFinale(dt);
  }

  updateWork(dt) {
    this.workLeft = Math.max(0, this.workLeft - dt);
    for (const st of this.stations) {
      const c = st.p.ctrl;
      if (st.p.isAI) this.updateAI(st, dt);
      this.tickStation(st, dt);
      if (st.ready) { st.readyT += dt; if (c.pressed('b')) this.setReady(st, false); continue; }
      const step = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
      if (step) { this.setTab(st, st.tab + step); continue; }
      switch (st.tab) {
        case T.body: this.updateBody(st, c); break;
        case T.stuff: this.updateStuff(st, c, dt); break;
        case T.sew: this.updateSew(st, c, dt); break;
        case T.dress: this.updateDress(st, c, dt); break;
        case T.name: this.updateName(st, c); break;
        default:
          if (c.pressed('a')) this.setReady(st, true);
          else if (c.pressed('b')) this.setTab(st, T.name);
      }
    }
    if (this.stations.every((s) => s.ready && s.readyT > 0.8)) this.startFinale();
  }

  tickStation(st, dt) {
    st.tabBump = Math.max(0, st.tabBump - dt); st.listBump = Math.max(0, st.listBump - dt);
    st.wob = Math.max(0, st.wob - dt * 2.2);
    st.shift += ((st.tab === T.stuff && !st.ready ? 1 : 0) - st.shift) * Math.min(1, dt * 8); st.squeakT -= dt;
    this.tickSew(st, dt);
    for (const pc of st.plush.pieces) pc.st = (pc.st ?? 9) + dt;
    for (const f of st.fluff) f.t += dt;
    st.fluff = st.fluff.filter((f) => f.t < f.life);
    if (st.nudge) { st.nudge.t += dt; if (st.nudge.t > st.nudge.dur) st.nudge = null; }
  }

  // =========================================================================
  // CPU players: a plan, then one button press at a time (the same controls)
  planAI(st) {
    const pl = {
      body: randInt(0, BODIES.length - 1), fabric: randInt(0, FABRICS.length - 1),
      sew: [], dress: [], names: randInt(0, 3), newNames: chance(0.35), tap: chance(0.3),
    };
    for (const id of ['eyes', 'nose', 'mouth']) { const row = SEW_IDX[id], a = SEW_ROWS[row].at(); pl.sew.push({ row, i: randInt(0, 7), x: a.x + rand(-6, 6), y: a.y + rand(-6, 6) }); }
    const spots = shuffle([[256, 425], [205, 455], [310, 400], [256, 120], [185, 395], [330, 470]]);
    for (let k = randInt(1, 3); k > 0; k--) { const [x, y] = spots.pop(); pl.sew.push({ row: chance(0.5) ? SEW_IDX.heart : SEW_IDX.patch, i: randInt(0, 7), x: x + rand(-8, 8), y: y + rand(-8, 8) }); }
    for (const row of shuffle([0, 1, 2, 3]).slice(0, randInt(1, 3)).sort()) pl.dress.push({ row, item: randInt(1, DRESS_ROWS[row].items.length - 1), mv: chance(0.6) ? [rand(-1, 1), rand(-0.7, 0.5)] : null });
    st.ai = { plan: pl, t: rand(0.8, 1.6), sewK: 0, dressK: 0, browsed: 0, renamed: false };
  }

  updateAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai, pl = ai.plan, P = st.plush;
    if (st.aiStick > 0) { st.aiStick -= dt; if (st.aiStick <= 0) { c.move(0, 0); c.aim(0, 0); } }
    if (st.ready) return;
    const hurry = !this.cpuOnly && this.stations.every((s) => s.ready || s.p.isAI);
    // stuffing and the needle are continuous; everything else is a press now and then
    if (st.tab === T.stuff && !pl.tap) c.hold('x', P.puff < 1);
    else c.hold('x', false);
    if (st.tab === T.sew) {
      const goal = pl.sew[ai.sewK];
      if (goal && st.sewRow === goal.row && st.sewItem[goal.row] === goal.i) {
        const dx = goal.x - st.cur.x, dy = goal.y - st.cur.y, d = Math.hypot(dx, dy);
        if (d > 5) { const k = clamp(d / 60, 0.25, 0.9); c.move(dx / d * k, dy / d * k); st.aiStick = 0; return; }
        c.move(0, 0);
      }
    }
    ai.t -= dt;
    if (ai.t > 0) return;
    ai.t = rand(0.25, 0.55) / aiProfile(st.p).speed * (hurry ? 0.4 : 1);
    // A design game: each step's A / X does its thing and stays, so a CPU moves on with RB when it's happy
    switch (st.tab) {
      case T.body:
        if (P.body !== pl.body) c.press('right');
        else if (P.fabric !== pl.fabric) c.press('down');
        else if (!ai.squeezed) { ai.squeezed = true; c.press('a'); }
        else c.press('rb');
        break;
      case T.stuff:
        if (pl.tap && P.puff < 1) c.press(chance(0.5) ? 'a' : 'x');
        else if (P.puff >= 1) { c.press('rb'); ai.t += 0.4; }
        break;
      case T.sew: {
        if (st.sewAnim) break;
        const goal = pl.sew[ai.sewK];
        if (!goal) { c.press('rb'); break; }
        if (st.sewRow !== goal.row) { c.press(goal.row > st.sewRow ? 'down' : 'up'); break; }
        if (st.sewItem[goal.row] !== goal.i) { c.press(chance(0.25) ? 'rt' : 'right'); break; }
        if (Math.hypot(goal.x - st.cur.x, goal.y - st.cur.y) <= 5) { c.press(chance(0.5) ? 'a' : 'x'); ai.sewK++; ai.t += rand(0.4, 0.9); }
        break;
      }
      case T.dress: {
        const goal = pl.dress[ai.dressK];
        if (!goal) { c.press('rb'); break; }
        if (st.dressRow !== goal.row) c.press(goal.row > st.dressRow ? 'down' : 'up');
        else if (P.dress[goal.row] !== goal.item) c.press(chance(0.3) ? 'x' : 'right');
        else if (goal.mv && this.moveRuleNow(st) && !goal.moved) {   // move it about a bit (the right stick)
          goal.moved = true; c.aim(goal.mv[0], goal.mv[1]); st.aiStick = rand(0.2, 0.45); ai.t += st.aiStick + 0.1;
        } else { ai.dressK++; c.press('a'); }   // put it on, on to the next row
        break;
      }
      case T.name:
        if (pl.newNames && !ai.renamed) { ai.renamed = true; c.press(chance(0.5) ? 'a' : 'x'); ai.t += 0.6; }
        else if (ai.browsed < pl.names) { ai.browsed++; c.press('right'); }
        else c.press('rb');
        break;
      default: c.press('a');
    }
  }

  // =========================================================================
  // Finale: hugs, then the toy shelf
  /** Time's up / All done: every plushie is finished off with a little workshop magic. */
  finishOff(st) {
    const P = st.plush;
    if (P.puff < 1) { P.puff = 1; st.full = true; }
    const has = (id) => P.pieces.some((pc) => SEW_ROWS[pc.row].id === id);
    for (const pc of P.pieces) pc.st = 9;
    if (!has('eyes')) P.pieces.push({ row: SEW_IDX.eyes, i: 0, x: F.cx, y: F.eyeY, st: 9 });
    if (!has('nose')) P.pieces.push({ row: SEW_IDX.nose, i: [0, 1, 2, 4, 5, 6][P.body] ?? 0, x: F.nose.x, y: F.nose.y, st: 9 });
    if (!has('mouth')) P.pieces.push({ row: SEW_IDX.mouth, i: 0, x: F.mouth.x, y: F.mouth.y, st: 9 });
    if (!P.name) P.name = st.names[st.nameIdx];
  }

  startFinale() {
    if (this.phase !== 'work') return;
    this.phase = 'hug'; this.phaseT = 0;
    for (const p of this.players) if (p.isAI) { p.ctrl.hold('x', false); p.ctrl.move(0, 0); p.ctrl.aim(0, 0); }
    const n = this.n, spacing = Math.min(340, (W - 160) / n);
    const targetH = n <= 3 ? 500 : n <= 5 ? 360 : 270;
    this.stations.forEach((st, i) => {
      st.sewAnim = null; st.sewQ = false;
      this.finishOff(st);
      st.ready = true;
      const a = new Actor(st.p, { x: W / 2 + (i - (n - 1) / 2) * spacing, y: 930, facing: 1 });
      a.scale = Math.min(targetH / a.leader.h, (spacing * 0.9) / Math.max(1, a.width / a.scale));
      a.snap(); a.setPose('cuddle');
      a.attach((g, info) => this.drawHugged(g, st, info));
      st.actor = a; st.hugT = rand(0, 1);
      st.walk = { vz: 0, ph: 0, aiT: rand(0.6, 1.4), aiM: 0, home: a.x, range: Math.max(90, spacing * 0.7) };
    });
    sfx('aww'); snd('crowd-aww', null, { vol: 0.5 });
    fx.flash('#ffffff', 0.2);
  }

  /** The plushie held to the chest (attachment, forward space: in front of the arms). */
  drawHugged(g, st, info) {
    if (this.phase !== 'hug') return;
    const h = info.h, size = h * 0.58, k = size / CH;
    const top = info.neck.y - h * 0.02;
    const seatY = top + (F.seat - F.headTop) * k;
    const x = info.neck.x * 0.55 + info.hand.x * 0.45;
    const sq = 1 + Math.sin(this.t * 5 + st.i) * 0.04;
    g.save(); g.translate(x, seatY); g.scale(1 / sq, sq);
    drawPlush(g, st.plush, 0, 0, size, { t: this.t, tilt: -0.12 });
    g.restore();
  }

  /**
   * Shelf spots for n new plushies and m older ones: one board up to 4, else both (the front,
   * lower board first for the new ones; the older ones fill the top board, then any room left
   * below, at the ends of a row: the new ones in the middle).
   */
  shelfLayout(n, m) {
    const T = n + m, rows = T <= 4 ? [{ y: 760, cnt: T }] : [{ y: 760, cnt: T - Math.floor(T / 2) }, { y: 430, cnt: Math.floor(T / 2) }];
    const news = [], olds = [];
    let nl = n;
    for (const R of rows) { R.n = Math.min(nl, R.cnt); R.m = R.cnt - R.n; nl -= R.n; }   // new ones in front first
    for (const R of rows) {
      const sp = 1260 / R.cnt;
      const size = rows.length === 1 ? (R.cnt === 1 ? 420 : 330) : Math.min(280, sp * 1.1);
      const left = Math.floor(R.m / 2), spot = (k) => ({ x: 330 + sp * (k + 0.5), y: R.y, size, tagW: Math.min(220, sp * 0.8) });
      for (let k = 0; k < R.cnt; k++) {
        if (k < left || k >= left + R.n) olds.push({ ...spot(k), size: size * 0.86, tagW: Math.min(220, sp * 0.8) * 0.86 });
        else news.push(spot(k));
      }
    }
    return { news, olds };
  }

  startShelf() {
    if (this.phase === 'shelf') return;
    this.phase = 'shelf'; this.phaseT = 0;
    // the shelf memory: earlier plushies (this device) sit there already; people's new ones join it
    const stored = loadShelf(), room = Math.max(0, SHELF_MAX - this.n);
    const olds = room ? stored.map(unpackPlush).filter(Boolean).slice(-room) : [];
    if (!this.cpuOnly) {
      const mine = this.stations.filter((st) => !st.p.isAI).map((st) => packPlush(st.plush, st.p.color));
      saveShelf([...stored, ...mine]);
    }
    const { news, olds: oldSpots } = this.shelfLayout(this.n, olds.length);
    this.oldShelf = olds.map((P, k) => ({ P, ...oldSpots[k] }));
    this.stations.forEach((st, i) => {
      const s = news[i];
      const a = st.actor;
      st.fly = { fromX: a ? a.x : s.x, fromY: H + 260, x: s.x, y: s.y, size: s.size, tagW: s.tagW, at: 0.35 + i * 0.28, landed: false, landT: 0 };
    });
    this.shelfEnd = 0.35 + this.n * 0.28 + 1.6;
    sfx('whoosh'); fx.flash('#ffffff', 0.25);
  }

  updateFinale(dt) {
    if (this.phase === 'hug') {
      for (const st of this.stations) {
        const a = st.actor;
        st.hugT += dt;
        const moving = this.hugWalk(st, dt);
        if (st.hugT > 1.6 && !moving && a.z <= 0) { st.hugT = rand(-0.4, 0); a.playOnce('cuddle', 1.2, 'cuddle'); a.squash(0.12); }
        if (chance(dt * 1.6)) this.addHeart(a.x + rand(-40, 40), a.y - a.z - a.height * 0.6, st.p.color);
        a.update(dt);
      }
      // keep everyone a little apart (no one walks through a friend and their plush)
      const as = this.stations.map((st) => st.actor);
      for (let i = 0; i < as.length; i++) for (let j = i + 1; j < as.length; j++) {
        const p = as[i], q = as[j], gap = Math.max(200, (p.height + q.height) * 0.42), d = q.x - p.x;   // wide enough for the name tags
        if (Math.abs(d) < gap) {
          const push = (gap - Math.abs(d)) * Math.min(1, dt * 10) * 0.5 * (d >= 0 ? 1 : -1);
          p.x = clamp(p.x - push, 70, W - 70); q.x = clamp(q.x + push, 70, W - 70);
        }
      }
      if (this.phaseT > 0.4 && !this.hugCheer) { this.hugCheer = true; sfx('giggle'); }
      if (this.phaseT > (this.cpuOnly ? HUG_T : HUG_T_PLAY)) this.startShelf();
    } else if (this.phase === 'shelf') {
      for (const st of this.stations) {
        const f = st.fly;
        if (!f.landed && this.phaseT >= f.at + 0.55) {
          f.landed = true; f.landT = 0; st.wob = 1;
          snd('squeak', 'pop', { vol: 0.6 }); sfx('collect', { step: st.i * 2 });
          particles.burst(f.x, f.y - f.size * 0.4, { type: 'sparkle', count: 10, colors: ['#ffffff', st.p.color, '#fff6a8'] });
        }
        if (f.landed) f.landT += dt;
      }
      if (this.phaseT > this.shelfEnd && !this.finished) this.finishGame();
    }
    for (const st of this.stations) { st.wob = Math.max(0, st.wob - dt * 2); for (const pc of st.plush.pieces) pc.st = 9; }
    this.updateHearts(dt);
  }

  /**
   * Big hugs: the stick walks you about and A jumps, still hugging your plushie (the cuddle
   * pose throughout, with a little waddle as you go; the plush stays at the chest). CPUs wander.
   */
  hugWalk(st, dt) {
    const a = st.actor, c = st.p.ctrl, w = st.walk;
    if (!w || this.phaseT < 0.6) return false;
    let mx = Math.abs(c.x) > 0.2 ? c.x : 0, jump = c.pressed('a');
    if (st.p.isAI) {
      w.aiT -= dt;
      if (w.aiT <= 0) {
        w.aiT = rand(0.7, 1.6);
        w.aiM = chance(0.5) ? rand(-0.7, 0.7) : 0;
        if (chance(0.3)) jump = true;
      }
      mx = w.aiM;
      if (Math.abs(a.x - w.home) > w.range) mx = Math.sign(w.home - a.x) * 0.6;
    }
    const sp = 330 * clamp(a.scale * a.leader.h / 400, 0.6, 1.2);
    a.x = clamp(a.x + mx * sp * dt, 70, W - 70);
    if (Math.abs(mx) > 0.15) a.facing = mx > 0 ? 1 : -1;   // turns at once (no paper flip)
    w.jz = w.jz || 0;
    if (jump && w.jz <= 0) { w.vz = 820; sfx('jump', { vol: 0.4 }); a.squash(-0.2); }
    if (w.jz > 0 || w.vz > 0) {
      w.vz -= 2600 * dt; w.jz = Math.max(0, w.jz + w.vz * dt);
      if (w.jz <= 0) { if (w.vz < -300) a.squash(0.16); w.vz = 0; }
    }
    // the waddle: little hops in the hug as you go
    if (Math.abs(mx) > 0.15 && w.jz <= 0) { w.ph += dt * 9 * Math.abs(mx); w.hop = Math.abs(Math.sin(w.ph)) * 12 * a.scale * a.leader.h / 400; }
    else w.hop = Math.max(0, (w.hop || 0) - dt * 200);
    a.z = w.jz + w.hop;
    if (a.pose !== 'cuddle' && !a._once) a.setPose('cuddle');
    return Math.abs(mx) > 0.15 || w.jz > 0;
  }

  addHeart(x, y, color) {
    this.hearts.push({ x, y, vy: rand(-110, -70), s: rand(12, 24), t: 0, life: rand(1.6, 2.4), ph: rand(TAU), c: pick(['#ff5c8a', '#ff9ec8', color, '#ff6fd0']) });
  }
  updateHearts(dt) {
    for (const h of this.hearts) { h.t += dt; h.y += h.vy * dt; h.x += Math.sin(h.t * 3 + h.ph) * 30 * dt; }
    this.hearts = this.hearts.filter((h) => h.t < h.life);
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((st) => `${st.plush.name} the ${BODIES[st.plush.body].name}`);
    this.api.finish({ gallery: true, showcase: true, highlight: null, stats });
  }

  onDone() {
    if (this.phase === 'work') this.startFinale();
    else if (this.phase === 'hug') this.startShelf();
    else this.finishGame();
  }

  destroy() {
    clearPlushCaches();
  }

  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    for (const st of this.stations) { st.wob = Math.max(0, st.wob - dt * 2); if (st.fly && st.fly.landed) st.fly.landT += dt; }
    if (chance(dt * 1.5)) { const st = pick(this.stations); if (st.fly) particles.burst(st.fly.x + rand(-60, 60), st.fly.y - st.fly.size * rand(0.3, 0.8), { type: 'sparkle', count: 2, colors: ['#ffffff', '#fff6a8'] }); }
    this.updateHearts(dt);
  }

  // =========================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'work') this.drawWorkshop(g);
    else if (this.phase === 'hug') this.drawHug(g);
    else this.drawShelf(g);
  }

  drawWorkshop(g) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffe3cf'); gr.addColorStop(1, '#ffd2e4');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.45; g.fillStyle = '#ffffff';
    for (const d of this.dots) { g.fill(heartPath(new Path2D(), d.x, d.y, d.r * (1.2 + 0.2 * Math.sin(this.t * 2 + d.ph)))); }
    g.restore();
    g.save(); g.translate(W / 2, 54);
    ui.panel(g, -400, -40, 800, 80, { r: 40, fill: '#ff8ec4' });
    ui.text(g, 'Plushie Workshop', 0, 2, { size: 52, weight: 800 });
    g.restore();
    if (this.n <= 2) ui.hints(g, [['lb', ''], ['rb', 'Steps']], 250, 54, { size: 34 });
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawRoom(g, st) {
    const { r, L } = st;
    const bg = art('bg/plushie-workshop');
    if (bg) {
      // The table and plush anchors use the authored 1920 x 1080 frame,
      // including when the loader supplies a smaller runtime image.
      const s = L.seat, k = Math.max((L.tableY - r.y) / 780, (r.y + r.h - L.tableY) / 300, 2 * Math.max(r.x + r.w - s.x, s.x - r.x) / 1920);
      g.drawImage(bg, s.x - 960 * k, L.tableY - 780 * k, 1920 * k, 1080 * k);
      return;
    }
    const wg = g.createLinearGradient(0, r.y, 0, L.tableY);
    wg.addColorStop(0, mix(st.p.color, '#ffffff', 0.86)); wg.addColorStop(1, mix(st.p.color, '#ffffff', 0.7));
    g.fillStyle = wg; g.fillRect(r.x, r.y, r.w, L.tableY - r.y);
    // pegboard with thread spools, and bunting
    const u = clamp(L.size / 300, 0.55, 1.6);
    g.save(); g.globalAlpha = 0.5; g.fillStyle = '#ffffff';
    for (let yy = r.y + L.tabH + 30 * u; yy < L.tableY - 20; yy += 34 * u) for (let xx = r.x + 16 * u; xx < r.x + r.w; xx += 34 * u) { g.beginPath(); g.arc(xx, yy, 2.5 * u, 0, TAU); g.fill(); }
    g.restore();
    const spools = ['#ff6f91', '#ffd23f', '#5dc3ff', '#9b7bff', '#5ddc8a', '#ff9f43'];
    for (let k = 0; k < 6; k++) {
      const side = k < 3 ? 0 : 1, j = k % 3;
      const x = side ? L.ca.x + L.ca.w - 40 * u - j * 34 * u : L.ca.x + 36 * u + j * 34 * u, y = L.ca.y + 50 * u + (j % 2) * 30 * u;
      g.fillStyle = '#e8c48f'; g.fillRect(x - 13 * u, y - 22 * u, 26 * u, 6 * u); g.fillRect(x - 13 * u, y + 16 * u, 26 * u, 6 * u);
      g.fillStyle = spools[k]; g.fillRect(x - 10 * u, y - 16 * u, 20 * u, 32 * u);
      g.strokeStyle = NAVY; g.lineWidth = 2; g.strokeRect(x - 10 * u, y - 16 * u, 20 * u, 32 * u);
    }
    for (let k = 0; k < 12; k++) {
      const x0 = r.x + (k / 12) * r.w, x1 = x0 + r.w / 12, yb = r.y + L.tabH + 12;
      g.fillStyle = spools[k % 6]; g.beginPath(); g.moveTo(x0 + 3, yb); g.lineTo(x1 - 3, yb); g.lineTo((x0 + x1) / 2, yb + 22 * u); g.closePath(); g.fill();
    }
    // the table
    const tg = g.createLinearGradient(0, L.tableY, 0, r.y + r.h);
    tg.addColorStop(0, '#e9b97a'); tg.addColorStop(1, '#c98d52');
    g.fillStyle = tg; g.fillRect(r.x, L.tableY, r.w, r.y + r.h - L.tableY);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(r.x, L.tableY, r.w, 5);
    g.strokeStyle = 'rgba(120,70,30,0.25)'; g.lineWidth = 2;
    for (let k = 1; k < 4; k++) { const yy = L.tableY + k * (r.y + r.h - L.tableY) / 4; g.beginPath(); g.moveTo(r.x, yy); g.lineTo(r.x + r.w, yy); g.stroke(); }
    // measuring tape along the front
    const ty = L.tableY + (r.y + r.h - L.tableY) * 0.55;
    g.fillStyle = '#ffe66b'; g.fillRect(r.x, ty, r.w, 12 * u);
    g.fillStyle = NAVY; for (let xx = r.x; xx < r.x + r.w; xx += 12 * u) g.fillRect(xx, ty, 2, (xx / (12 * u)) % 5 < 1 ? 8 * u : 4 * u);
  }

  drawStuffer(g, st) {
    const nz = this.nozzle(st), k = nz.k;
    const img = art('prop/plushie-stuffer');
    const crank = Math.sin(st.crankT) * 0.5;
    if (img) {
      const s = 384 * k * 0.9;
      // The authored nozzle faces left; the station puts its tank on the
      // plushie's left, so mirror about the outlet without moving the puffs.
      g.save(); g.translate(nz.x, nz.y); g.scale(-1, 1);
      g.drawImage(img, -40 * s / 384, -300 * s / 384, s, s);
      g.restore(); return;
    }
    g.save(); g.translate(nz.x, nz.y); g.scale(k, k);
    // tank, dome, crank, nozzle (the tip is at 0, 0; the table is about 150 below it)
    g.lineWidth = 6; g.strokeStyle = NAVY; g.lineJoin = 'round'; g.lineCap = 'round';
    const tx = -200, ty = 30;
    g.fillStyle = '#ff8ec4'; for (const dx of [-45, 45]) { g.beginPath(); g.ellipse(tx + dx, ty + 112, 24, 13, 0, 0, TAU); g.fill(); g.stroke(); }
    // the hose
    const hose = new Path2D(); hose.moveTo(tx + 70, ty + 30); hose.quadraticCurveTo(-60, ty + 50, -8, 4);
    g.lineWidth = 30; g.stroke(hose); g.lineWidth = 20; g.strokeStyle = '#c6a6ff'; g.stroke(hose);
    g.lineWidth = 6; g.strokeStyle = NAVY;
    g.fillStyle = '#ffb3d6'; g.beginPath(); g.ellipse(tx, ty, 82, 96, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(tx - 34, ty - 30, 18, 40, 0.2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(220,240,255,0.9)'; g.beginPath(); g.arc(tx, ty - 80, 62, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    drawFluff(g, tx - 22, ty - 106, 28, 0.3); drawFluff(g, tx + 20, ty - 100, 24, 1.4); drawFluff(g, tx, ty - 124, 20, 2.1);
    g.save(); g.translate(tx - 82, ty); g.rotate(crank); g.fillStyle = '#ffd23f'; g.fillRect(-6, -50, 12, 50); g.strokeRect(-6, -50, 12, 50);
    g.beginPath(); g.arc(0, -50, 14, 0, TAU); g.fill(); g.stroke(); g.restore();
    g.fillStyle = '#c6a6ff'; g.beginPath(); g.ellipse(-6, 2, 14, 18, -0.6, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }

  drawStation(g, st) {
    const { r, L, p } = st;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26); g.clip();
    this.drawRoom(g, st);
    const s = this.seatPos(st);
    // a soft shadow under the plushie
    g.fillStyle = 'rgba(36,22,63,0.18)'; g.beginPath(); g.ellipse(s.x, s.y - 4, L.size * 0.3 * (1.1 - 0.1 * st.plush.puff), L.size * 0.04, 0, 0, TAU); g.fill();
    if (st.shift > 0.05) { g.save(); g.globalAlpha = Math.min(1, st.shift * 1.5); this.drawStuffer(g, st); g.restore(); }
    const sewing = st.tab === T.sew && !st.ready;
    drawPlush(g, st.plush, s.x, s.y, L.size, {
      t: this.t + st.i, wob: st.wob,
      extra: sewing && !st.sewAnim ? (gg) => {   // the piece in hand, exactly where A / X will sew it
        const on = onPlush(st.plush.body, st.cur.x, st.cur.y);
        drawPiece(gg, st.sewRow, st.sewItem[st.sewRow], st.cur.x, st.cur.y, { alpha: on ? 0.85 : 0.45 });
      } : null,
    });
    // stuffing on its way in
    if (st.fluff.length) {
      const nz = this.nozzle(st);
      for (const f of st.fluff) {
        const q = f.t / f.life, e = ease.outCubic(Math.min(1, q * 1.15));
        const to = this.plushScreen(st, f.tx, f.ty);
        const x = lerp(nz.x, to.x, e), y = lerp(nz.y, to.y, e) - Math.sin(e * Math.PI) * L.size * f.arc;
        drawFluff(g, x, y, f.r * (1 - q * 0.5), f.rot + f.spin * f.t, q > 0.8 ? (1 - q) / 0.2 : 1);
      }
    }
    if (sewing || st.sewAnim) {
      const ns = clamp(L.size * 0.32, 60, 150);
      if (st.sewAnim) {   // the needle dips in and out round the piece's edge
        const q = this.sewNeedle(st), n = this.plushScreen(st, q.x, q.y);
        drawNeedle(g, n.x, n.y, ns, q.lift * ns * 0.16);
      } else { const n = this.plushScreen(st, st.cur.x, st.cur.y); drawNeedle(g, n.x, n.y, ns, 0); }
    }
    if (st.nudge) this.drawNudge(g, st);
    if (st.plush.name && (st.tab >= T.name)) { const tw = clamp(L.size * 0.42, 100, 220); this.drawNameTag(g, L.ca.x + tw / 2 + 14, L.tableY + (r.y + r.h - L.tableY) * 0.25, tw, st.plush.name, st.p.color); }
    g.restore();
    g.save(); ui.roundRect(g, r.x, r.y, r.w, r.h, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke(); g.restore();
    this.drawTabs(g, st);
    if (st.ready) this.drawReady(g, st);
    else this.drawList(g, st);
    this.drawHints(g, st);
  }

  drawNudge(g, st) {
    const N = st.nudge, L = st.L, s = this.seatPos(st);
    const a = Math.min(1, N.t / 0.15) * Math.min(1, (N.dur - N.t) / 0.3);
    const sz = clamp(L.size * 0.075, 18, 34);
    const y = s.y - L.size * 0.9;
    g.save(); g.globalAlpha = a;
    const tw = ui.measure(g, N.text, sz) + (N.pre ? sz * 4.4 : 0) + 40;
    const w = Math.min(tw, L.ca.w - 16), x = clamp(s.x, L.ca.x + w / 2 + 8, L.ca.x + L.ca.w - w / 2 - 8);
    ui.panel(g, x - w / 2, y - sz * 0.9, w, sz * 1.8, { r: sz * 0.9, fill: '#ffffff', lineWidth: 4, shadow: false });
    if (N.pre) {
      ui.text(g, N.text, x - sz * 2.1, y + 1, { size: sz, color: NAVY, stroke: false, maxWidth: w - sz * 4.6 });
      const gx = x + w / 2 - sz * 3.9;
      ui.glyph(g, N.pre === 'hold' ? 'a' : N.pre, gx + sz * 0.6, y, sz * 1.1);
      ui.text(g, N.pre === 'hold' ? 'hold' : N.post, gx + sz * 1.3, y + 1, { size: sz * 0.8, color: NAVY, stroke: false, align: 'left', maxWidth: sz * 2.4 });
    } else ui.text(g, N.text, x, y + 1, { size: sz, color: NAVY, stroke: false, maxWidth: w - 20 });
    g.restore();
  }

  drawNameTag(g, x, y, w, name, color) {
    const h = w * 0.42;
    const img = art('prop/plushie-tag');
    g.save(); g.translate(x, y); g.rotate(-0.04);
    if (img) g.drawImage(img, -w / 2, -h / 2, w, h);
    else {
      ui.panel(g, -w / 2, -h / 2, w, h, { r: h * 0.25, fill: '#fff8e8', lineWidth: 4, shadow: false });
      g.save(); g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255,111,177,0.7)'; g.lineWidth = 2; ui.roundRect(g, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, h * 0.2); g.stroke(); g.restore();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-w / 2 + h * 0.3, 0, h * 0.11, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      g.strokeStyle = '#ff6fb1'; g.lineWidth = 4; g.beginPath(); g.moveTo(-w / 2 + h * 0.3, 0); g.quadraticCurveTo(-w / 2 - h * 0.2, -h * 0.3, -w / 2 - h * 0.1, -h * 0.6); g.stroke();
    }
    ui.text(g, name, h * 0.18, 2, { size: h * 0.42, color, strokeWidth: Math.max(3, h * 0.08), maxWidth: w - h * 0.75 });
    g.restore();
  }

  // --- tabs, lists, hints ------------------------------------------------------
  drawTabIcon(g, id, x, y, s, st) {
    g.save(); g.translate(x, y);
    if (id === 'body') {
      drawPlush(g, { ...st.plush, puff: 1, dress: [0, 0, 0, 0], pieces: [{ row: 0, i: 0, x: F.cx, y: F.eyeY }] }, 0, s * 0.5, s * 1.05, { t: this.t });
    } else if (id === 'stuff') { drawFluff(g, -s * 0.12, s * 0.05, s * 0.3, 0.2); drawFluff(g, s * 0.16, -s * 0.12, s * 0.24, 1.3); }
    else if (id === 'sew') drawNeedle(g, -s * 0.28, s * 0.3, s * 0.85, 0);
    else if (id === 'dress') { g.scale(s / 150, s / 150); g.translate(-322, -104); drawClothes(g, 0, 1, this.t); }
    else if (id === 'name') { g.rotate(-0.12); ui.panel(g, -s * 0.42, -s * 0.2, s * 0.84, s * 0.4, { r: s * 0.1, fill: '#fff8e8', lineWidth: 3, shadow: false }); g.fillStyle = '#ff6fb1'; g.beginPath(); g.arc(-s * 0.3, 0, s * 0.06, 0, TAU); g.fill(); g.fillStyle = NAVY; g.fillRect(-s * 0.18, -s * 0.04, s * 0.48, s * 0.08); }
    g.restore();
  }

  drawTabs(g, st) {
    const { r, L } = st;
    const gs = clamp(L.tabH * 0.55, 30, 44);
    const x0 = r.x + 14 + gs * 0.8, x1 = r.x + r.w - 14 - gs * 0.8;
    const tw = (x1 - x0) / (DONE + 1);
    ui.glyph(g, 'lb', r.x + 10 + gs * 0.6, r.y + 10 + L.tabH / 2, gs * 0.9);
    ui.glyph(g, 'rb', r.x + r.w - 10 - gs * 0.6, r.y + 10 + L.tabH / 2, gs * 0.9);
    TABS.forEach((tab, ti) => {
      const sel = ti === st.tab;
      const bx = x0 + ti * tw + 4, bw = tw - 8, by = r.y + 10 + (sel ? 0 : 6), bh = L.tabH - (sel ? 0 : 8);
      const k = sel ? 1 + st.tabBump * 0.8 : 1;
      g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(k, k);
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 16, fill: sel ? '#ffffff' : mix(st.p.color, '#ffffff', 0.5), lineWidth: sel ? 5 : 3, shadow: sel });
      const labeled = sel && bh > 64 && bw > 104;
      const isz = Math.min(bh * (labeled ? 0.62 : 0.78), bw * 0.7);
      this.drawTabIcon(g, tab.id, 0, labeled ? -bh * 0.12 : 0, isz, st);
      if (labeled) ui.text(g, tab.name, 0, bh * 0.32, { size: bh * 0.22, color: NAVY, stroke: false, weight: 800 });
      ui.text(g, String(ti + 1), -bw / 2 + 11, -bh / 2 + 12, { size: 16, color: NAVY, stroke: false, weight: 800 });
      g.restore();
    });
    const sel = st.tab === DONE, bx = x0 + DONE * tw + 4, bw = tw - 8;
    drawDoneTab(g, bx, r.y + 10 + (sel ? 0 : 6), bw, L.tabH - (sel ? 0 : 8), { sel, bump: st.tabBump });
  }

  /**
   * A list panel of rows (up / down); the selected row opens into a little
   * carousel (left / right): the previous, this and the next item.
   */
  drawRows(g, st, title, rows, sel) {
    const lr = st.L.list;
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.9)', lineWidth: 4, shadow: false });
    const headH = clamp(lr.h * 0.085, 24, 46);
    ui.text(g, title, lr.x + lr.w / 2, lr.y + headH * 0.62, { size: headH * 0.72, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 20 });
    const areaY = lr.y + headH + 4, areaH = lr.h - headH - 10;
    const isOn = (ri) => (Array.isArray(sel) ? sel.includes(ri) : ri === sel);
    const big = 2.6, nOn = rows.filter((_, ri) => isOn(ri)).length, unit = areaH / (rows.length + nOn * (big - 1));
    let y = areaY;
    rows.forEach((row, ri) => {
      const on = isOn(ri), h = unit * (on ? big : 1);
      const bw = lr.w - 14, bx = lr.x + 7;
      const bump = on ? st.listBump * 0.4 : 0;
      g.save(); g.translate(bx + bw / 2, y + h / 2); g.scale(1 + bump * 0.3, 1 + bump * 0.3);
      ui.panel(g, -bw / 2, -h / 2 + 2, bw, h - 4, { r: 12, fill: on ? '#fff3b0' : '#ffffff', lineWidth: on ? 4 : 2, stroke: on ? NAVY : 'rgba(36,22,63,0.25)', shadow: false });
      if (!on) {
        const isz = Math.min(h * 0.8, 44);
        row.icon(g, row.cur, -bw / 2 + isz * 0.6 + 4, 0, isz);
        ui.text(g, row.label, -bw / 2 + isz * 1.3 + 8, 1, { size: clamp(h * 0.38, 13, 24), color: NAVY, stroke: false, align: 'left', weight: 800, maxWidth: bw - isz * 1.3 - 14 });
      } else {
        const lab = clamp(h * 0.15, 13, 24);
        ui.text(g, row.label, 0, -h / 2 + lab * 0.85, { size: lab, color: NAVY, stroke: false, weight: 800 });
        const isz = Math.min(h * 0.52, bw * 0.34), cy = -h * 0.04;
        const n = row.count;
        if (n > 1) for (const d of [-1, 1]) {
          g.save(); g.globalAlpha = 0.45;
          row.icon(g, (row.cur + d + n) % n, d * bw * 0.31, cy, isz * 0.55);
          g.restore();
        }
        g.save(); g.translate(0, cy); const pk = 1 + st.listBump * 0.8; g.scale(pk, pk);
        row.icon(g, row.cur, 0, 0, isz);
        g.restore();
        g.fillStyle = NAVY;
        if (row.vertical) for (const d of [-1, 1]) { const ax = bw / 2 - 16, ay = cy + d * 8; g.beginPath(); g.moveTo(ax - 9, ay); g.lineTo(ax + 9, ay); g.lineTo(ax, ay + d * 10); g.fill(); }   // (up / down)
        else for (const d of [-1, 1]) { const ax = d * (bw / 2 - 10); g.beginPath(); g.moveTo(ax, cy - 9); g.lineTo(ax + d * 9, cy); g.lineTo(ax, cy + 9); g.fill(); }
        ui.text(g, row.name, 0, h / 2 - lab * 1.0, { size: lab, color: NAVY, stroke: false, weight: 700, maxWidth: bw - 16 });
      }
      g.restore();
      y += h;
    });
  }

  iconPlush(st, bodyIdx, fabricIdx) {
    return (g, _i, x, y, s) => drawPlush(g, { body: bodyIdx ?? _i, fabric: fabricIdx ?? _i, puff: 1, dress: [0, 0, 0, 0], pieces: [{ row: 0, i: 0, x: F.cx, y: F.eyeY }, { row: 1, i: 3, x: F.nose.x, y: F.nose.y }] }, x, y + s * 0.5, s * 1.08, { t: this.t });
  }

  swatch(g, i, x, y, s) { drawSwatch(g, FABRICS[i], x, y, s * 0.42); }

  pieceIcon(row) {
    return (g, i, x, y, s) => {
      const R = SEW_ROWS[row], span = R.id === 'eyes' ? 170 : R.id === 'mouth' ? 110 : R.size * 1.25;
      g.save(); g.translate(x, y); const k = s / span; g.scale(k, k);
      drawPiece(g, row, i, 0, 0);
      g.restore();
    };
  }

  clothesIcon(row) {
    return (g, i, x, y, s) => {
      const it = DRESS_ROWS[row].items[i];
      if (!i) { g.save(); g.strokeStyle = 'rgba(36,22,63,0.4)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, s * 0.3, 0, TAU); g.moveTo(x - s * 0.2, y + s * 0.2); g.lineTo(x + s * 0.2, y - s * 0.2); g.stroke(); g.restore(); return; }
      let cx = F.cx, cy, w;
      if (it.atlas) { w = 260; cy = F.neck.y + 40; }
      else if (it.flare) { w = 560; cy = 430; }
      else if (it.grip) { const [gx, gy] = it.paws[0]; cx = gx + it.box[2] * 0.35; cy = gy - it.box[2] * (it.box[2] > 120 ? 1.05 : 0.75); w = Math.max(200, it.box[2] * 2.4); }
      else { [cx, cy, w] = it.box; if (it.bottom != null) cy = it.bottom - w * 0.35; else if (it.top != null) cy = it.top + w * 0.45; }
      g.save(); g.translate(x, y); const k = s / (w * 1.05); g.scale(k, k); g.translate(-cx, -cy);
      drawClothes(g, row, i, this.t);
      g.restore();
    };
  }

  drawList(g, st) {
    const P = st.plush;
    if (st.tab === DONE) { drawDoneCard(g, st.L.list, st.p.color); return; }
    if (st.tab === T.body) {
      this.drawRows(g, st, 'Pick a plushie', [
        { label: 'Body  ◀ ▶', cur: P.body, count: BODIES.length, name: BODIES[P.body].name, icon: (gg, i, x, y, s) => this.iconPlush(st, i, P.fabric)(gg, i, x, y, s) },
        { label: 'Fabric  ▲ ▼', cur: P.fabric, count: FABRICS.length, name: FABRICS[P.fabric].name, icon: (gg, i, x, y, s) => this.swatch(gg, i, x, y, s), vertical: true },
      ], [0, 1]);
    } else if (st.tab === T.stuff) this.drawStuffPanel(g, st);
    else if (st.tab === T.sew) {
      this.drawRows(g, st, 'Sew it on', SEW_ROWS.map((R, ri) => ({ label: R.name, cur: st.sewItem[ri], count: R.items.length, name: R.items[st.sewItem[ri]], icon: this.pieceIcon(ri) })), st.sewRow);
    } else if (st.tab === T.dress) {
      this.drawRows(g, st, 'Dress up', DRESS_ROWS.map((R, ri) => ({ label: R.name, cur: P.dress[ri], count: R.items.length, name: R.items[P.dress[ri]].name, icon: this.clothesIcon(ri) })), st.dressRow);
    } else if (st.tab === T.name) this.drawNamePanel(g, st);
  }

  drawStuffPanel(g, st) {
    const lr = st.L.list, P = st.plush;
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.9)', lineWidth: 4, shadow: false });
    const headH = clamp(lr.h * 0.085, 24, 46);
    ui.text(g, 'Fluffy meter', lr.x + lr.w / 2, lr.y + headH * 0.62, { size: headH * 0.72, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 20 });
    const bw = Math.min(lr.w * 0.34, 90), bx = lr.x + lr.w / 2 - bw / 2, by = lr.y + headH + 14, bh = lr.h - headH - 30 - Math.min(90, lr.h * 0.22);
    ui.panel(g, bx, by, bw, bh, { r: bw / 2, fill: '#f1ecfa', lineWidth: 4, shadow: false });
    const fh = (bh - 10) * P.puff;
    if (fh > 2) {
      g.save(); ui.roundRect(g, bx + 5, by + bh - 5 - fh, bw - 10, fh, (bw - 10) / 2); g.clip();
      g.fillStyle = '#ffffff'; g.fillRect(bx, by, bw, bh);
      for (let k = 0; k < 10; k++) drawFluff(g, bx + bw * (0.3 + 0.4 * ((k * 37) % 10) / 10), by + bh - 10 - k * (bh / 10), bw * 0.3, k);
      g.restore();
    }
    const fs = clamp(lr.w * 0.1, 16, 30);
    const msg = st.full ? 'So fluffy!' : P.puff > 0.5 ? 'Nearly!' : 'Flat...';
    ui.text(g, msg, lr.x + lr.w / 2, by + bh + fs * 0.95, { size: fs, color: st.full ? '#36d17a' : NAVY, stroke: false, weight: 800 });
    ui.hints(g, [['a', st.full ? 'Squeeze!' : 'Hold!']], lr.x + lr.w / 2, by + bh + fs * 2.4, { size: fs * 1.1 });
  }

  drawNamePanel(g, st) {
    const lr = st.L.list;
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.9)', lineWidth: 4, shadow: false });
    const headH = clamp(lr.h * 0.085, 24, 46);
    ui.text(g, 'Name it', lr.x + lr.w / 2, lr.y + headH * 0.62, { size: headH * 0.72, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 20 });
    const foot = clamp(lr.h * 0.12, 30, 64);
    const areaY = lr.y + headH + 6, areaH = lr.h - headH - foot - 10;
    const n = st.names.length, rh = areaH / n;
    st.names.forEach((nm, i) => {
      const on = i === st.nameIdx, y = areaY + i * rh, bw = lr.w - 16;
      const k = on ? 1 + st.listBump * 0.3 : 1;
      g.save(); g.translate(lr.x + lr.w / 2, y + rh / 2); g.scale(k, k);
      ui.panel(g, -bw / 2, -rh / 2 + 2, bw, rh - 4, { r: 12, fill: on ? '#fff3b0' : '#ffffff', lineWidth: on ? 4 : 2, stroke: on ? NAVY : 'rgba(36,22,63,0.25)', shadow: false });
      if (on) { g.fillStyle = '#ff6fb1'; g.fill(heartPath(new Path2D(), -bw / 2 + rh * 0.35, 0, rh * 0.16)); }
      ui.text(g, nm, on ? rh * 0.2 : 0, 1, { size: clamp(rh * 0.45, 14, 32), color: on ? st.p.color : NAVY, stroke: on ? NAVY : false, strokeWidth: 4, weight: 800, maxWidth: bw - rh * 1.3 });
      g.restore();
    });
    ui.hints(g, [['a', 'New ideas']], lr.x + lr.w / 2, lr.y + lr.h - foot / 2, { size: clamp(foot * 0.55, 18, 32) });
  }

  drawReady(g, st) {
    const lr = st.L.list;
    g.save();
    ui.roundRect(g, lr.x, lr.y, lr.w, lr.h, 22); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
    const cx = lr.x + lr.w / 2, cy = lr.y + lr.h * 0.36;
    const sc = ease.outBack(Math.min(1, st.readyT / 0.3));
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

  drawHints(g, st) {
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
    const c0 = p.ctrl, pad = c0.kind === 'pad';
    let items;
    if (st.ready) items = [['b', 'Not yet']];
    else if (st.tab === T.body) items = [['dpad', wide ? '◀▶ Body  ▲▼ Fabric' : ''], ['a', 'Squeeze'], ['b', wide ? 'Undo' : '']];
    else if (st.tab === T.stuff) items = [['a', st.full ? 'Squeeze' : wide ? 'Hold: stuff it!' : 'Stuff']];
    else if (st.tab === T.sew) items = pad ? [['stick', wide ? 'Needle' : ''], ['dpad', wide ? 'Pick' : ''], ['a', 'Sew it on'], ['b', wide ? 'Unpick' : '']]
      : [['stick', wide ? 'Needle' : ''], ['lt', ''], ['rt', wide ? 'Pick' : ''], ['a', 'Sew it on'], ['b', wide ? 'Unpick' : '']];
    else if (st.tab === T.dress) {
      const mv = !!this.moveRuleNow(st), on = 'Put it on → next';
      items = this.kbMove(st, c0) ? [['stick', wide ? 'Move it' : ''], ['x', wide ? 'Try on' : ''], ['a', on], ['b', wide ? 'Undo' : '']]
        : [['dpad', wide ? '▲▼ Spot  ◀▶ Try on' : ''], ...(mv ? [['rstick', wide ? 'Move it' : '']] : []), ['a', on], ['b', wide ? 'Undo' : '']];
    } else if (st.tab === T.name) items = [['dpad', wide ? 'Pick' : ''], ['a', 'New ideas'], ['b', wide ? 'Undo' : '']];
    else items = [['lb', wide ? 'Change something' : ''], ['a', "I'm ready!"]];
    const avail = r.x + r.w - 16 - x, lab = sz * 0.62;
    let need = 0;
    for (const [, l] of items) need += sz + 8 + (l ? ui.measure(g, l, lab) + 18 : 12);
    const k = Math.min(1, avail / need);
    x += Math.max(0, (avail - need * k) / 2);
    g.save(); g.translate(x, y); g.scale(k, k); x = 0;
    for (const [b, l] of items) {
      ui.glyph(g, b, x + sz / 2, 0, sz, { pulse: b === 'a' && st.tab === DONE && !st.ready });
      x += sz + 6;
      if (l) { ui.text(g, l, x, 2, { size: lab, color: '#fff', align: 'left', strokeWidth: 5 }); x += ui.measure(g, l, lab) + 18; } else x += 12;
    }
    g.restore();
  }

  // --- finale drawing ------------------------------------------------------------
  drawCozyRoom(g) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffe0ef'); gr.addColorStop(1, '#ffc9de');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.5; g.fillStyle = '#ffffff';
    for (const d of this.dots) g.fill(heartPath(new Path2D(), d.x, d.y, d.r * 2 * (1 + 0.15 * Math.sin(this.t * 2 + d.ph))));
    g.restore();
    g.fillStyle = '#f2b38a'; g.fillRect(0, 900, W, H - 900);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(0, 900, W, 6);
    g.fillStyle = '#ff9ec8'; g.beginPath(); g.ellipse(W / 2, 960, 820, 80, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(W / 2, 960, 700, 56, 0, 0, TAU); g.fill();
  }

  drawHug(g) {
    this.drawCozyRoom(g);
    g.save(); g.translate(W / 2, 92);
    const k = ease.outBack(Math.min(1, this.phaseT / 0.5));
    g.scale(k, k);
    ui.panel(g, -330, -46, 660, 92, { r: 46, fill: '#ff6fb1' });
    ui.text(g, 'Big hugs!', 0, 2, { size: 62, weight: 800 });
    g.restore();
    const list = [...this.stations].sort((a, b) => a.actor.y - b.actor.y);
    for (const st of list) {
      st.actor.draw(g, { ring: st.p.color });
      const tagW = Math.min(220, (W - 160) / this.n * 0.8);
      this.drawNameTag(g, st.actor.x, 1000, tagW, st.plush.name, st.p.color);
    }
    this.drawHearts(g);
    if (!this.cpuOnly && this.phaseT > 0.6) ui.hints(g, [['stick', 'Walk'], ['a', 'Jump']], W / 2, 172, { size: 34 });
  }

  drawHearts(g) {
    for (const h of this.hearts) {
      const a = Math.min(1, h.t / 0.2) * Math.min(1, (h.life - h.t) / 0.5);
      const p = heartPath(new Path2D(), h.x, h.y, h.s);
      g.save(); g.globalAlpha = a; g.fillStyle = h.c; g.fill(p); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke(p); g.restore();
    }
  }

  drawShelfRoom(g) {
    const bg = art('bg/plushie-shelf');
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#d9f5ea'); gr.addColorStop(1, '#bfeedd');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.55; g.fillStyle = '#ffffff';
    for (const d of this.dots) g.fill(starPath(new Path2D(), d.x, d.y, d.r * 1.6));
    g.restore();
    // the bookcase
    const L = 150, R = W - 150;
    g.fillStyle = '#fff3df'; g.fillRect(L, 150, R - L, 690);
    g.lineWidth = 6; g.strokeStyle = NAVY;
    g.fillStyle = '#f6e2c4';
    for (const x of [L - 40, R]) { g.fillRect(x, 140, 40, 760); g.strokeRect(x, 140, 40, 760); }
    g.fillRect(L - 50, 120, R - L + 100, 40); g.strokeRect(L - 50, 120, R - L + 100, 40);
    for (const y of [430, 760]) {
      g.fillStyle = '#e9c99c'; g.fillRect(L - 10, y, R - L + 20, 42); g.strokeRect(L - 10, y, R - L + 20, 42);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(L - 10, y + 4, R - L + 20, 6);
    }
    // a few toys at the far ends
    const books = ['#ff8ec4', '#7fbfff', '#ffd23f', '#93e3bf'];
    books.forEach((c, i) => { g.fillStyle = c; g.fillRect(L + 20 + i * 30, 430 - 120 + i * 6, 26, 120 - i * 6); g.lineWidth = 3; g.strokeRect(L + 20 + i * 30, 430 - 120 + i * 6, 26, 120 - i * 6); });
    g.fillStyle = '#ff6f91'; g.fillRect(R - 120, 760 - 70, 70, 70); g.strokeRect(R - 120, 760 - 70, 70, 70);
    g.fillStyle = '#ffd23f'; g.fill(starPath(new Path2D(), R - 85, 725, 24)); g.lineWidth = 3; g.stroke(starPath(new Path2D(), R - 85, 725, 24));
    g.fillStyle = '#f2b38a'; g.fillRect(0, 900, W, H - 900);
    g.lineWidth = 4; g.strokeStyle = 'rgba(120,70,30,0.3)'; g.beginPath(); g.moveTo(0, 900); g.lineTo(W, 900); g.stroke();
  }

  drawShelf(g) {
    this.drawShelfRoom(g);
    g.save(); g.translate(W / 2, 84);
    ui.panel(g, -380, -46, 760, 92, { r: 46, fill: '#ff6fb1' });
    ui.text(g, 'Our Toy Shelf!', 0, 2, { size: 60, weight: 800 });
    g.restore();
    const olds = this.oldShelf || [];
    olds.forEach((o, k) => drawPlush(g, o.P, o.x, o.y, o.size, { t: this.t + k * 0.7, tilt: Math.sin(this.t * 2 + k * 1.3) * 0.02 }));   // already sitting there
    for (const st of this.stations) {
      const f = st.fly;
      if (!f) continue;
      const q = clamp((this.phaseT - f.at) / 0.55, 0, 1);
      if (q <= 0) continue;
      let x = f.x, y = f.y;
      if (!f.landed) { const e = ease.outCubic(q); x = lerp(f.fromX, f.x, e); y = lerp(f.fromY, f.y, e) - Math.sin(e * Math.PI) * 260; }
      const bob = f.landed ? Math.sin(this.t * 2 + st.i) * 0.02 : 0;
      drawPlush(g, st.plush, x, y, f.size, { t: this.t + st.i, wob: st.wob, tilt: bob });
    }
    for (const o of olds) this.drawNameTag(g, o.x, o.y + 52 * o.size / 330, o.tagW, o.P.name, o.P.color);
    for (const st of this.stations) {   // the name tags on top (the row below may reach up past a shelf's lip)
      const f = st.fly;
      if (f && f.landed) {
        const tk = ease.outBack(Math.min(1, f.landT / 0.4));
        g.save(); g.translate(f.x, f.y + 52); g.scale(tk, tk);
        this.drawNameTag(g, 0, 0, f.tagW, st.plush.name, st.p.color);
        g.restore();
      }
    }
    this.drawHearts(g);
  }
}
