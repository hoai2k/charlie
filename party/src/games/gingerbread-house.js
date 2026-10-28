// Gingerbread House (Play Studio). Every player builds a gingerbread house at their own
// station on the kitchen table, in three steps (LB / RB; the last tab is Done):
//   Build  - pick a shape (cottage, tall house, castle) and press X to drop each piece into
//            place (it lands with a squish of icing glue). A drops the rest and goes on.
//   Icing  - hold X to pipe: the bag snaps to the nearest roof edge / window / door and, with
//            the stick let go, the icing runs along that edge by itself. A pipes the edge
//            under the bag (if X didn't pipe yet) and goes on. B undoes one stroke.
//   Candy  - the D-pad (keyboard: LT / RT) picks a candy, the stick moves the hand, X sticks one
//            on and stays (hold X: sprinkles), A sticks one on (unless X did) and goes on.
//            The candy in the hand is drawn exactly where it will stick. B takes one off.
// Finale: night falls, everyone's house moves into a snowy gingerbread village, the windows
// light up, a gingerbread person peeks out of each door and the players walk about the
// village (A jumps, X nibbles a candy off your own house). It ends on the village (gallery).
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { sfx, music, hasSound } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { drawDoneTab, drawDoneCard } from '../engine/studio-ui.js';
import {
  NAVY, SHAPES, ICINGS, CANDIES, CANDY, BOARD_W, CANDY_S, onHouse, landing, nearestEdge, newIcing, icingColor,
  drawHouse, drawGlow, drawCandy, drawShapeIcon, drawGingerPerson, sprinkleColor,
} from './gingerbread-house/house.js';
import { meta } from './gingerbread-house.meta.js';

export { meta };

const TABS = [
  { id: 'build', name: 'Build' },
  { id: 'icing', name: 'Icing' },
  { id: 'candy', name: 'Candy' },
  { id: 'done', name: 'Done' },
];
const TAB = Object.fromEntries(TABS.map((t, i) => [t.id, i]));
const BUILD_TIME = 240, BUILD_MORE = 60;   // the studio clock (shown all along): Go! = the village
const DROP_H = 300, GRAV = 2600;           // pieces fall into place from above (house units)
const CURSOR_SP = 560, PIPE_SPEED = 230, SNAP_R = 34;
const MAX_CANDY = 90, MAX_SPRINKLES = 700, MAX_DOTS = 400;
const VILLAGE_FRONT = 880, VILLAGE_BACK = 640;
const snd = (key, fallback, o) => (hasSound(key) ? sfx(key, o) : fallback && sfx(fallback, o));
const STEP_LEN = 7;   // icing sample spacing (house.js STEP)

function hex(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; }

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
  const listW = Math.round(r.w * (n === 1 ? 0.24 : n > 4 ? 0.29 : 0.3));
  const ca = { x: r.x, y: r.y + tabH + 14, w: r.w - listW - 12, h: r.h - tabH - hintH - 26 };
  const k = Math.min(ca.h / 540, (ca.w * 0.74) / 560);
  const stand = { x: ca.x + ca.w * 0.6, y: ca.y + ca.h - 40 * k };
  return {
    tabH, hintH, listW, ca, k, stand,
    tableY: stand.y - 26 * k,
    list: { x: r.x + r.w - listW - 10, y: r.y + tabH + 14, w: listW, h: r.h - tabH - hintH - 28 },
    charFoot: { x: ca.x + Math.max(ca.w * 0.1, 50), y: stand.y + 14 * k },
    charH: ca.h * 0.42, charW: ca.w * 0.2,
  };
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'build';
    this.cpuOnly = this.players.every((p) => p.isAI);
    this.buildLeft = BUILD_TIME;
    // the studio clock: at 0 the goal question (Go! = everyone's house goes to the village, the
    // default; Keep decorating = +1 min)
    api.limit(() => (this.phase === 'build' ? this.buildLeft : null), {
      showAt: Infinity, x: W / 2 + 530, y: 56,
      timeUp: { goal: true, title: 'Time for the village!', goLabel: 'Go!', moreLabel: 'Keep decorating', more: () => { this.buildLeft += BUILD_MORE; }, done: () => this.startFinale() },
    });
    const rects = stationRects(this.n);
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i]));
    this.flakes = Array.from({ length: 140 }, () => ({ x: rand(W), y: rand(H), s: rand(2, 6), v: rand(30, 90), ph: rand(TAU) }));
    this.stars = Array.from({ length: 80 }, () => ({ x: rand(W), y: rand(20, 520), s: rand(1.5, 4), ph: rand(TAU) }));
    this.banner = { text: 'Build a gingerbread house!', t: 0 };
    sfx('magic');
  }

  makeStation(p, i, r) {
    const L = layoutStation(r, this.n);
    const a = new Actor(p, { x: L.charFoot.x, y: L.charFoot.y, facing: 1 });
    a.scale = Math.min(L.charH / a.leader.h, L.charW / Math.max(1, a.width / a.scale));
    a.snap();
    const st = {
      p, i, r, L, actor: a, tab: 0, icingSel: 0, candySel: 0, didAct: false,
      cursor: { x: 0, y: -250 }, ready: false, readyT: 0, history: [], pipe: null, hover: null,
      listBump: 0, tabBump: 0, cheerCD: 0, aiStick: 0, ai: null, candyCount: 0, squishT: 0,
      H: null, icings: SHAPES.map((s) => newIcing(s)), dv: [], wait: [], nibbles: 0,
    };
    st.H = { shape: 0, built: 0, drop: [], seamT: [], icing: st.icings[0], dots: [], sprinkles: [], candies: [], lit: 0, doorOpen: 0, person: null, wobble: 0 };
    if (p.isAI) this.planAI(st);
    return st;
  }

  shape(st) { return SHAPES[st.H.shape]; }
  toScreen(st, x, y) { const { k, stand } = st.L; return { x: stand.x + x * k, y: stand.y + y * k }; }

  cheer(st) {
    if (st.cheerCD > 0) return;
    st.actor.playOnce(chance(0.5) ? 'cheer' : 'clap', 0.5, 'idle'); st.cheerCD = 1.4;
  }

  // --- build ------------------------------------------------------------------------------
  setShape(st, dir) {
    const Hs = st.H, old = Hs.shape;
    Hs.shape = (Hs.shape + dir + SHAPES.length) % SHAPES.length;
    if (Hs.shape === old) return;
    Hs.icing = st.icings[Hs.shape];
    Hs.built = Math.min(Hs.built, SHAPES[Hs.shape].pieces.length);
    Hs.drop = []; Hs.seamT = []; st.dv = []; st.wait = [];
    this.resettle(st);
    st.listBump = 0.15; sfx('swap');
    const s = this.toScreen(st, 0, -200);
    particles.burst(s.x, s.y, { type: 'sparkle', count: 10, colors: ['#fff', '#ffd23f', st.p.color] });
  }

  /** Drop the next piece (delay: seconds before it starts falling). */
  placePiece(st, delay = 0) {
    const Hs = st.H, shape = this.shape(st);
    if (Hs.built >= shape.pieces.length) return false;
    const i = Hs.built++;
    Hs.drop[i] = -DROP_H; st.dv[i] = 0; st.wait[i] = delay; Hs.seamT[i] = 0;
    if (!delay) sfx('whoosh', { vol: 0.5 });
    return true;
  }
  /** A: every piece still missing drops in, one after another. */
  completeBuild(st, quick = false) {
    let d = 0;
    while (this.placePiece(st, d)) d += quick ? 0.05 : 0.22;
  }
  updatePieces(st, dt) {
    const Hs = st.H;
    for (let i = 0; i < Hs.built; i++) {
      if (Hs.seamT[i] !== undefined && Hs.seamT[i] < 1 && !Hs.drop[i]) Hs.seamT[i] += dt;
      if (!Hs.drop[i]) continue;
      if (st.wait[i] > 0) { st.wait[i] -= dt; if (st.wait[i] <= 0) sfx('whoosh', { vol: 0.4 }); continue; }
      st.dv[i] += GRAV * dt; Hs.drop[i] += st.dv[i] * dt;
      if (Hs.drop[i] >= 0) { Hs.drop[i] = 0; this.pieceLanded(st, i); }
    }
    Hs.wobble = Math.max(0, Hs.wobble - dt);
  }
  pieceLanded(st, i) {
    const pc = this.shape(st).pieces[i];
    snd('snow-thud', 'pop', { vol: 0.6 }); snd('topping-squish', null, { vol: 0.4 });
    st.H.seamT[i] = 0; st.H.wobble = Math.max(st.H.wobble, 0.18);
    const [[x0, y0], [x1, y1]] = pc.seam || [[pc.bb.x0, pc.bb.y1], [pc.bb.x1, pc.bb.y1]];
    for (let j = 0; j < 4; j++) {
      const u = (j + 0.5) / 4, s = this.toScreen(st, lerp(x0, x1, u), lerp(y0, y1, u));
      particles.burst(s.x, s.y, { type: 'sparkle', count: 2, colors: ['#ffffff', '#fff3d6'] });
    }
    if (!this.finale) { st.actor.playOnce('action', 0.3, 'idle'); if (i === this.shape(st).pieces.length - 1) { this.cheer(st); sfx('star', { vol: 0.5 }); } }
  }
  /** B on Build: the last piece comes off again. */
  removePiece(st) {
    const Hs = st.H;
    if (!Hs.built) { sfx('blip'); return; }
    Hs.built--;
    Hs.drop[Hs.built] = 0; Hs.seamT[Hs.built] = undefined;
    const pc = this.shape(st).pieces[Hs.built], s = this.toScreen(st, (pc.bb.x0 + pc.bb.x1) / 2, (pc.bb.y0 + pc.bb.y1) / 2);
    particles.burst(s.x, s.y, { type: 'dust', count: 8, speed: [40, 140] });
    sfx('back');
    this.resettle(st);
  }
  /** Things no longer on the house (shape changed, a piece came off) drop to the board. */
  resettle(st) {
    const Hs = st.H, shape = this.shape(st);
    for (const c of Hs.candies) if (!onHouse(shape, Hs.built, c.x, c.y) && c.y < 10) c.fall = { vy: 0, ty: 10 + rand(0, 8) };
    for (const s of Hs.sprinkles) if (!onHouse(shape, Hs.built, s.x, s.y) && s.y < 10) s.fall = { vy: 0, ty: rand(4, 26) };
    Hs.dots = Hs.dots.filter((d) => onHouse(shape, Hs.built, d.x, d.y));
  }
  updateFalls(st, dt) {
    for (const list of [st.H.candies, st.H.sprinkles]) for (const c of list) {
      if (!c.fall) continue;
      c.fall.vy += 1800 * dt; c.y += c.fall.vy * dt;
      if (c.y >= c.fall.ty) { c.y = c.fall.ty; c.fall = null; }
    }
  }

  // --- icing ------------------------------------------------------------------------------
  iceCell(st, entry, ei, j) {
    const arr = st.H.icing[ei], k = st.icingSel + 1;
    if (j < 0 || j >= arr.length || arr[j] === k) return 0;
    entry.cells.push([ei, j, arr[j]]); arr[j] = k;
    return 1;
  }
  iceRange(st, entry, ei, a, b) {
    let n = 0;
    for (let j = Math.min(a, b); j <= Math.max(a, b); j++) n += this.iceCell(st, entry, ei, j);
    return n;
  }
  edgePoint(st, ei, u) { const pts = this.shape(st).edges[ei].pts; const j = clamp(Math.round(u), 0, pts.length - 1); return { x: pts[j][0], y: pts[j][1] }; }
  /** Which way the icing runs from sample j: with the stick, else toward the un-iced side. */
  pipeDir(st, ei, j, mx, my) {
    const e = this.shape(st).edges[ei], pts = e.pts, arr = st.H.icing[ei], k = st.icingSel + 1;
    const a = pts[Math.max(0, j - 1)], b = pts[Math.min(pts.length - 1, j + 1)];
    const dot = (b[0] - a[0]) * mx + (b[1] - a[1]) * my;
    if (Math.abs(dot) > 0.5) return Math.sign(dot);
    const fwd = j + 1 < arr.length && arr[j + 1] !== k, back = j > 0 && arr[j - 1] !== k;
    if (fwd && back && !e.closed) return j < (arr.length - 1) / 2 ? 1 : -1;   // the longer way
    if (fwd) return 1;
    if (j > 0 && arr[j - 1] !== k) return -1;
    return 1;
  }
  startPipe(st) {
    st.pipe = { entry: { t: 'ice', shape: st.H.shape, cells: [], dots: [] }, snap: null, last: null, run: 0 };
    st.didAct = true;
  }
  endPipe(st) {
    const P = st.pipe; st.pipe = null;
    if (!P) return;
    if (P.entry.cells.length || P.entry.dots.length) {
      st.history.push(P.entry);
      if (P.entry.cells.length > 20) this.cheer(st);
    }
  }
  updatePipe(st, dt, mx, my) {
    const P = st.pipe, Hs = st.H, shape = this.shape(st), cur = st.cursor;
    let added = 0;
    const idle = Math.hypot(mx, my) < 0.2;
    if (idle && P.snap) {
      // hands off the stick: the icing runs along the edge by itself
      // (an open edge stops at its end; a window loop goes once round)
      const ei = P.snap.e, e = shape.edges[ei], last = e.pts.length - 1, dir = P.snap.dir;
      if (P.run < last) {
        const du = (dir * PIPE_SPEED * dt) / STEP_LEN;
        let u1 = P.snap.u + du;
        if (e.closed) { u1 = ((u1 % last) + last) % last; P.run += Math.abs(du); }
        else { u1 = clamp(u1, 0, last); P.run = (u1 === 0 && dir < 0) || (u1 === last && dir > 0) ? last : P.run + Math.abs(du); }
        let j = Math.round(P.snap.u) % (e.closed ? last : last + 1);
        const jt = Math.round(u1) % (e.closed ? last : last + 1);
        const ice = (jj) => { added += this.iceCell(st, P.entry, ei, jj); if (e.closed && jj === 0) added += this.iceCell(st, P.entry, ei, last); };
        ice(j);
        for (let guard = 0; j !== jt && guard <= last; guard++) { j = e.closed ? (j + dir + last) % last : clamp(j + dir, 0, last); ice(j); }
        P.snap.u = u1;
      }
      const pt = this.edgePoint(st, P.snap.e, P.snap.u); cur.x = pt.x; cur.y = pt.y;
    } else {
      const ne = nearestEdge(shape, Hs.built, cur.x, cur.y, SNAP_R);
      if (ne) {
        if (P.snap && P.snap.e === ne.e) {
          const pj = Math.round(P.snap.u);
          added += this.iceRange(st, P.entry, ne.e, pj, ne.j);
          if (ne.j !== pj) P.snap.dir = Math.sign(ne.j - pj);
          P.snap.u = ne.j;
        } else {
          P.snap = { e: ne.e, u: ne.j, dir: this.pipeDir(st, ne.e, ne.j, mx, my) };
          P.run = 0;
          added += this.iceCell(st, P.entry, ne.e, ne.j);
        }
      } else {
        P.snap = null;
        // off the edges: dots of icing wherever it touches the house
        if (onHouse(shape, Hs.built, cur.x, cur.y) && (!P.last || Math.hypot(cur.x - P.last.x, cur.y - P.last.y) > 9) && Hs.dots.length < MAX_DOTS) {
          const d = { x: cur.x, y: cur.y, k: st.icingSel, j: Hs.dots.length };
          Hs.dots.push(d); P.entry.dots.push(d); P.last = { x: cur.x, y: cur.y }; added++;
        }
      }
    }
    st.squishT -= dt;
    if (added && st.squishT <= 0) { snd('topping-squish', 'pop', { vol: 0.22 }); st.squishT = 0.22; }
  }
  /** A on Icing (X hasn't piped yet this time): the whole edge under the bag. */
  iceWholeEdge(st) {
    const shape = this.shape(st), ne = nearestEdge(shape, st.H.built, st.cursor.x, st.cursor.y, SNAP_R * 1.6);
    if (!ne) return false;
    const entry = { t: 'ice', shape: st.H.shape, cells: [], dots: [] };
    this.iceRange(st, entry, ne.e, 0, shape.edges[ne.e].pts.length - 1);
    if (entry.cells.length) { st.history.push(entry); snd('topping-squish', 'pop', { vol: 0.4 }); }
    return true;
  }

  // --- candy ------------------------------------------------------------------------------
  candyKind(st) { return CANDIES[st.candySel].id; }
  addCandy(st, kind, x, y, group) {
    const Hs = st.H, ld = landing(this.shape(st), Hs.built, x, y);
    const c = { kind, x: ld.x, y: ld.y, v: st.candyCount, flip: kind === 'cane' && st.candyCount % 2 === 1 };
    st.candyCount++;
    Hs.candies.push(c); group.push(c);
    if (Hs.candies.length > MAX_CANDY) {
      const old = Hs.candies.shift();
      for (const h of st.history) if (h.items) h.items = h.items.filter((d) => d !== old);
    }
    const s = this.toScreen(st, c.x, c.y);
    particles.burst(s.x, s.y, { type: 'sparkle', count: 5, colors: ['#fff', st.p.color, '#ffd23f'] });
    return c;
  }
  addSprinkles(st, x, y, count, group) {
    const Hs = st.H, shape = this.shape(st);
    for (let j = 0; j < count; j++) {
      const ld = landing(shape, Hs.built, x + rand(-18, 18), y + rand(-14, 14));
      const s = { x: ld.x, y: ld.y, rot: rand(TAU), c: sprinkleColor() };
      Hs.sprinkles.push(s); group.push(s);
    }
    if (Hs.sprinkles.length > MAX_SPRINKLES) Hs.sprinkles.splice(0, Hs.sprinkles.length - MAX_SPRINKLES);
  }
  /** X (or A): one of the picked candy where the hand is. */
  putCandy(st) {
    const kind = this.candyKind(st);
    if (CANDIES[st.candySel].spray) {
      const grp = []; this.addSprinkles(st, st.cursor.x, st.cursor.y, 14, grp);
      st.history.push({ t: 'spr', items: grp }); sfx('brush');
      return grp;
    }
    const grp = []; this.addCandy(st, kind, st.cursor.x, st.cursor.y, grp);
    st.history.push({ t: 'candy', items: grp });
    snd('tot-candy', 'pop', { vol: 0.55 });
    st.actor.playOnce('action', 0.3, 'idle');
    if (chance(0.25)) this.cheer(st);
    return grp;
  }
  candyAt(st) {
    const cur = st.cursor, list = st.H.candies;
    for (let j = list.length - 1; j >= 0; j--) {
      const c = list[j], def = CANDIES[CANDY[c.kind]];
      if (Math.hypot(cur.x - c.x, cur.y - c.y) < def.r * CANDY_S + 6) return c;
    }
    return null;
  }
  removeCandy(st, c) {
    st.H.candies = st.H.candies.filter((d) => d !== c);
    for (const h of st.history) if (h.items) h.items = h.items.filter((d) => d !== c);
    st.history = st.history.filter((h) => !h.items || h.items.length);
    const s = this.toScreen(st, c.x, c.y);
    particles.burst(s.x, s.y, { type: 'smoke', count: 6, speed: [40, 120] });
    sfx('back');
  }

  undo(st) {
    const h = st.history.pop();
    if (!h) { sfx('blip'); return; }
    const Hs = st.H;
    if (h.t === 'ice') {
      const arrs = st.icings[h.shape];
      for (let j = h.cells.length - 1; j >= 0; j--) { const [ei, jj, prev] = h.cells[j]; arrs[ei][jj] = prev; }
      const set = new Set(h.dots); Hs.dots = Hs.dots.filter((d) => !set.has(d));
    } else if (h.t === 'candy') { const set = new Set(h.items); Hs.candies = Hs.candies.filter((d) => !set.has(d)); }
    else if (h.t === 'spr') { const set = new Set(h.items); Hs.sprinkles = Hs.sprinkles.filter((d) => !set.has(d)); }
    const s = this.toScreen(st, st.cursor.x, st.cursor.y);
    particles.burst(s.x, s.y, { type: 'smoke', count: 5, speed: [40, 110] });
    sfx('back');
  }

  // --- tabs and ready -------------------------------------------------------------------------
  setTab(st, tab) {
    if (st.pipe) this.endPipe(st);
    st.tab = (tab + TABS.length) % TABS.length; st.tabBump = 0.18; st.didAct = false; st.hover = null;
    const id = TABS[st.tab].id;
    if (id === 'icing' || id === 'candy') this.completeBuild(st, false);
    if (id === 'icing' && st.cursor.y > -60) { st.cursor.x = 0; st.cursor.y = this.shape(st).top + 40; }
  }
  setReady(st, on) {
    st.ready = on; st.readyT = 0;
    const a = st.actor;
    if (on) {
      if (st.pipe) this.endPipe(st);
      this.completeBuild(st, true);
      sfx('ready'); a.playOnce('ready', 0.6, 'wave'); a.squash(-0.25);
      const s = this.toScreen(st, 0, -220);
      particles.burst(s.x, s.y, { type: 'confetti', count: 24, speed: [200, 480] });
      a.say('Done!', 1.3, 'ready');
    } else { sfx('back'); a.setPose('idle'); }
  }

  // --- CPU builders -----------------------------------------------------------------------------
  planAI(st) {
    st.ai = { shape: randInt(0, SHAPES.length - 1), t: rand(0.8, 1.6), edges: null, ei: 0, candies: null, ci: 0, mode: 'tick', holdT: 0 };
  }
  buildIcingPlan(st) {
    const shape = this.shape(st), out = [];
    const roofs = shape.edges.map((e, i) => i).filter((i) => shape.edges[i].roof);
    const holes = shuffle(shape.edges.map((e, i) => i).filter((i) => shape.edges[i].hole));
    const k1 = pick([0, 1, 1, 2, 3, 7]), k2 = pick([0, 2, 3, 4, 5]);
    for (const e of roofs) out.push({ e, k: k1 });
    for (const e of holes.slice(0, randInt(1, 3))) out.push({ e, k: k2 });
    return out;
  }
  buildCandyPlan(st) {
    const shape = this.shape(st), out = [], built = st.H.built;
    const roofKind = pick(['gumdrop', 'gumdrop', 'peppermint', 'button']);
    for (const e of shape.edges.filter((x) => x.roof)) {
      for (let j = 3; j < e.pts.length - 2; j += randInt(6, 9)) {
        const [x, y] = e.pts[j];
        if (onHouse(shape, built, x, y + 22)) out.push({ kind: roofKind, x, y: y + 22 });
      }
    }
    const door = shape.door?.h;
    if (door && chance(0.8)) { out.push({ kind: 'cane', x: door.x - 18, y: door.y + door.h * 0.55 }); out.push({ kind: 'cane', x: door.x + door.w + 18, y: door.y + door.h * 0.55 }); }
    const extra = randInt(2, 5);
    for (let tries = 0; tries < 60 && out.length < 40 && extra > out.filter((o) => o.extra).length; tries++) {
      const x = rand(-200, 200), y = rand(shape.top, -10);
      if (onHouse(shape, built, x, y)) out.push({ kind: pick(['heart', 'gumdrop', 'lolli', 'peppermint', 'button']), x, y, extra: true });
    }
    if (chance(0.5)) out.push({ kind: 'sprinkles', x: rand(-60, 60), y: rand(-160, -60), hold: rand(0.4, 0.8) });
    return out.slice(0, 18);
  }
  updateAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai, Hs = st.H;
    if (st.aiStick > 0) { st.aiStick -= dt; if (st.aiStick <= 0) c.move(0, 0); }
    if (st.ready) return;
    const tab = TABS[st.tab].id, sp = aiProfile(st.p).speed;
    // steering the bag / hand is continuous
    if (ai.mode === 'move' || ai.mode === 'pipe' || ai.mode === 'shake') {
      const goal = ai.goal;
      if (ai.mode === 'pipe') {
        c.move(0, 0); ai.holdT -= dt;
        const arr = Hs.icing[goal.e], done = arr.every((v) => v === goal.k + 1);
        if (done || ai.holdT <= 0) { c.hold('x', false); ai.mode = 'tick'; ai.ei++; ai.t = rand(0.3, 0.7) / sp; }
        return;
      }
      if (ai.mode === 'shake') {
        ai.holdT -= dt; c.move(Math.sin(this.t * 6) * 0.4, 0);
        if (ai.holdT <= 0) { c.hold('x', false); c.move(0, 0); ai.mode = 'tick'; ai.ci++; ai.t = rand(0.3, 0.6) / sp; }
        return;
      }
      const d = steer(st.p, st.cursor.x, st.cursor.y, goal.x, goal.y, { arrive: 60 });
      if (d < 6) {
        c.move(0, 0);
        if (tab === 'icing') { c.hold('x', true); ai.mode = 'pipe'; ai.holdT = 2 + this.shape(st).edges[goal.e].pts.length * STEP_LEN / PIPE_SPEED; }
        else if (goal.hold) { c.hold('x', true); ai.mode = 'shake'; ai.holdT = goal.hold; }
        else { c.press('x'); ai.mode = 'tick'; ai.ci++; ai.t = rand(0.3, 0.7) / sp; }
      }
      return;
    }
    ai.t -= dt;
    if (ai.t > 0) return;
    const hurry = !this.cpuOnly && this.stations.every((s) => s.ready || s.p.isAI);
    ai.t = rand(0.3, 0.6) / sp * (hurry ? 0.5 : 1);
    switch (tab) {
      case 'build': {
        if (Hs.shape !== ai.shape && Hs.built === 0) { c.move(0, 1); st.aiStick = 0.05; break; }
        if (Hs.built < this.shape(st).pieces.length) { c.press(chance(0.85) ? 'x' : 'a'); ai.t = rand(0.5, 0.9) / sp; break; }
        c.press('a'); break;
      }
      case 'icing': {
        if (!ai.edges) { ai.edges = this.buildIcingPlan(st); ai.ei = 0; }
        const g = ai.edges[ai.ei];
        if (!g) { c.press('rb'); break; }
        if (st.icingSel !== g.k) { c.press('rt'); ai.t *= 0.5; break; }
        const pts = this.shape(st).edges[g.e].pts, j = Math.min(2, pts.length - 1);
        ai.goal = { e: g.e, k: g.k, x: pts[j][0], y: pts[j][1] }; ai.mode = 'move';
        break;
      }
      case 'candy': {
        if (!ai.candies) { ai.candies = this.buildCandyPlan(st); ai.ci = 0; }
        const g = ai.candies[ai.ci];
        if (!g) { c.press('a'); break; }
        const want = CANDY[g.kind];
        if (st.candySel !== want) { c.press('rt'); ai.t *= 0.5; break; }
        ai.goal = g; ai.mode = 'move';
        break;
      }
      case 'done': c.press('a'); break;
      default: break;
    }
  }

  // --- main update -------------------------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.4) this.banner = null; }
    if (this.phase === 'build') this.updateBuild(dt);
    else this.updateFinale(dt, false);
  }
  postUpdate(dt) {
    this.t += dt;
    if (this.phase === 'finale') this.updateFinale(dt, true);
    else for (const st of this.stations) st.actor.update(dt);
  }

  updateBuild(dt) {
    this.buildLeft = Math.max(0, this.buildLeft - dt);
    for (const st of this.stations) {
      const c = st.p.ctrl, a = st.actor;
      if (st.p.isAI) this.updateAI(st, dt);
      st.listBump = Math.max(0, st.listBump - dt); st.tabBump = Math.max(0, st.tabBump - dt);
      st.cheerCD -= dt; st.readyT += dt;
      this.updatePieces(st, dt);
      this.updateFalls(st, dt);
      a.update(dt);
      if (st.ready) { if (c.pressed('b')) this.setReady(st, false); continue; }
      // LB / RB: the steps (the last one is Done)
      const tabStep = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
      if (tabStep) { this.setTab(st, st.tab + tabStep); sfx('move'); continue; }
      const tab = TABS[st.tab].id;
      if (tab === 'build') this.updateBuildTab(st);
      else if (tab === 'icing') this.updateIcingTab(st, dt);
      else if (tab === 'candy') this.updateCandyTab(st, dt);
      else {
        if (c.pressed('a')) this.setReady(st, true);
        else if (c.pressed('b')) { this.setTab(st, TAB.candy); sfx('back'); }
      }
    }
    if (this.stations.every((s) => s.ready && s.readyT > 0.7)) this.startFinale();
  }

  updateBuildTab(st) {
    const c = st.p.ctrl, Hs = st.H, n = this.shape(st).pieces.length;
    if (c.nav.y) this.setShape(st, c.nav.y);
    if (c.pressed('x')) {
      if (!this.placePiece(st)) {   // all up: give it a wiggle - it holds!
        Hs.wobble = 0.5; snd('boing', 'pop', { vol: 0.4 });
        const s = this.toScreen(st, 0, this.shape(st).top - 30);
        particles.popText(s.x, s.y, 'Sturdy!', st.p.color, 34);
      }
    } else if (c.pressed('a')) {
      if (Hs.built < n) this.completeBuild(st);
      this.setTab(st, TAB.icing); sfx('select');
    } else if (c.pressed('b')) this.removePiece(st);
  }

  /** The stick (pads: left stick only; the D-pad picks) and the right stick move the bag / hand. */
  moveCursor(st, dt) {
    const c = st.p.ctrl, cur = st.cursor, pad = c.kind === 'pad';
    const mx = (pad ? c.sx : c.x) + c.rx, my = (pad ? c.sy : c.y) + c.ry;
    cur.x = clamp(cur.x + clamp(mx, -1, 1) * CURSOR_SP * dt, -(BOARD_W / 2), BOARD_W / 2);
    cur.y = clamp(cur.y + clamp(my, -1, 1) * CURSOR_SP * dt, -480, 26);
    return [mx, my];
  }
  /** D-pad (pads) or LT / RT: the next / previous item in the list. */
  listStep(st) {
    const c = st.p.ctrl, pad = c.kind === 'pad';
    let step = (c.pressed('rt') ? 1 : 0) - (c.pressed('lt') ? 1 : 0);
    if (pad) step += (c.pressed('down') || c.pressed('right') ? 1 : 0) - (c.pressed('up') || c.pressed('left') ? 1 : 0);
    return Math.sign(step);
  }

  updateIcingTab(st, dt) {
    const c = st.p.ctrl;
    const step = this.listStep(st);
    if (step) { st.icingSel = (st.icingSel + step + ICINGS.length) % ICINGS.length; st.listBump = 0.15; sfx('move'); if (st.pipe) this.endPipe(st); }
    const pad = c.kind === 'pad';
    const mx = (pad ? c.sx : c.x) + c.rx, my = (pad ? c.sy : c.y) + c.ry;
    if (!(st.pipe && st.pipe.snap && Math.hypot(mx, my) < 0.2)) this.moveCursor(st, dt);
    if (c.pressed('x')) this.startPipe(st);
    if (st.pipe) {
      if (c.held('x')) this.updatePipe(st, dt, mx, my);
      else this.endPipe(st);
    }
    if (c.pressed('a')) {
      if (st.pipe) this.endPipe(st);
      if (!st.didAct) this.iceWholeEdge(st);
      this.setTab(st, TAB.candy); sfx('select');
    } else if (c.pressed('b') && !st.pipe) this.undo(st);
  }

  updateCandyTab(st, dt) {
    const c = st.p.ctrl;
    const step = this.listStep(st);
    if (step) { st.candySel = (st.candySel + step + CANDIES.length) % CANDIES.length; st.listBump = 0.15; sfx('move'); st.shake = null; }
    this.moveCursor(st, dt);
    const spray = CANDIES[st.candySel].spray;
    st.hover = st.p.isAI ? null : this.candyAt(st);
    if (c.pressed('x')) {
      st.didAct = true;
      const grp = this.putCandy(st);
      if (spray) { st.shake = grp; st.shakeT = 0; }
    } else if (spray && st.shake && c.held('x')) {
      st.shakeT += dt;
      if (st.shakeT > 0.07) { st.shakeT = 0; this.addSprinkles(st, st.cursor.x, st.cursor.y, 4, st.shake); }
      if (Math.floor(this.t * 7) !== Math.floor((this.t - dt) * 7)) sfx('brush', { vol: 0.5 });
    }
    if (!c.held('x')) st.shake = null;
    if (c.pressed('a')) {
      if (!st.didAct) this.putCandy(st);
      st.shake = null;
      this.setTab(st, TAB.done); sfx('select');
    } else if (c.pressed('b')) {
      if (st.hover) { this.removeCandy(st, st.hover); st.hover = null; } else this.undo(st);
    }
  }

  // --- the finale: the gingerbread village at night -------------------------------------------------
  startFinale() {
    if (this.phase === 'finale') return;
    this.phase = 'finale'; this.ft = 0; this.stage = 'dusk';
    this.banner = { text: 'Night falls...', t: 0 };
    music.stop(0.6);
    snd('night-crickets', null, { vol: 0.3 });
    const n = this.n, rows = n <= 4 ? [[...Array(n).keys()]] : [[...Array(Math.floor(n / 2)).keys()], [...Array(n).keys()].slice(Math.floor(n / 2))];
    const front = rows[rows.length - 1].length;
    const slotF = Math.min(n === 1 ? 900 : n === 2 ? 820 : 600, (W - 160) / front);
    const sF = Math.min(n <= 2 ? 1.15 : 0.95, (slotF * 0.74) / BOARD_W);
    this.village = [];
    rows.forEach((row, ri) => {
      const back = rows.length > 1 && ri === 0;
      const slot = back ? Math.min(560, (W - 360) / row.length) : slotF, s = back ? sF * 0.78 : sF, gy = back ? VILLAGE_BACK : VILLAGE_FRONT;
      row.forEach((idx, j) => {
        const st = this.stations[idx];
        const x = W / 2 + (j - (row.length - 1) / 2) * slot + (back ? slot * 0.3 : 0);
        st.v = { x, y: gy, s, slot, back, lightAt: 1.8 + idx * Math.min(0.35, 2.4 / n), vz: 0, aiT: rand(0.5, 1.5), aiM: 0, nibCD: 0 };
        this.village.push(st);
      });
    });
    for (const st of this.stations) {
      if (st.pipe) this.endPipe(st);
      st.ready = true; st.hover = null; st.shake = null;
      this.completeBuild(st, true);
      for (let i = 0; i < st.H.built; i++) { st.H.drop[i] = 0; st.H.seamT[i] = 1; }
      for (const c of [...st.H.candies, ...st.H.sprinkles]) if (c.fall) { c.y = c.fall.ty; c.fall = null; }
      if (st.p.isAI) { st.p.ctrl.move(0, 0); st.p.ctrl.hold('x', false); }
      const a = st.actor, V = st.v;
      st.baseScale = st.baseScale || a.scale;
      a.scale = Math.min((300 * V.s) / a.leader.h, (V.slot * 0.3) / Math.max(1, a.width / a.scale));
      V.home = V.x - V.slot * 0.36;
      a.x = V.home; a.y = V.y + 8; a.z = 0; a.facing = 1; a.snap(); a.setPose('idle');
    }
    this.lightsDone = Math.max(...this.stations.map((s) => s.v.lightAt)) + 1.2;
    this.endAt = this.lightsDone + (this.cpuOnly ? 2.5 : 7);
  }

  updateFinale(dt, ended) {
    this.ft += dt;
    const t = this.ft;
    for (const f of this.flakes) { f.y += f.v * dt; f.x += Math.sin(this.t + f.ph) * 14 * dt; if (f.y > H + 10) { f.y = -10; f.x = rand(W); } }
    for (const st of this.stations) {
      const V = st.v, Hs = st.H;
      if (t >= V.lightAt && Hs.lit < 1) {
        if (!Hs.lit) { snd('cs-candle-light', 'pop', { vol: 0.5 }); const s = this.vScreen(st, 0, -150); particles.burst(s.x, s.y, { type: 'sparkle', count: 10, colors: ['#ffd23f', '#fff3c4'] }); }
        Hs.lit = Math.min(1, Hs.lit + dt / 0.9);
      }
      if (t >= V.lightAt + 1.1 && !Hs.doorOpen) { Hs.doorOpen = 1; Hs.person = { up: 0, t: 0 }; snd('tot-door', 'pop', { vol: 0.45 }); }
      if (Hs.person) { Hs.person.t += dt; Hs.person.up = Math.min(1, Hs.person.up + dt / 0.5); }
      this.updateFalls(st, dt);
      this.walk(st, dt, ended);
      st.actor.update(dt);
    }
    if (this.stage === 'dusk' && t >= this.lightsDone) {
      this.stage = 'village'; music.play('chill');
      this.banner = { text: 'Welcome to Gingerbread Village!', t: 0 };
      sfx('magic');
    }
    if (!ended && !this.finished && t >= this.endAt) this.finishGame();
  }

  /** Village screen position of a house-local point. */
  vScreen(st, x, y) { const V = st.v; return { x: V.x + x * V.s, y: V.y + y * V.s }; }

  /** In the village: the stick walks along your row, A jumps (not in the gallery: A leaves), X nibbles. */
  walk(st, dt, ended) {
    if (this.ft < 1.4) return;
    const V = st.v, a = st.actor, c = st.p.ctrl;
    let mx = Math.abs(c.x) > 0.2 ? c.x : 0, jump = !ended && c.pressed('a'), nib = c.pressed('x');
    if (st.p.isAI) {
      V.aiT -= dt;
      if (V.aiT <= 0) {
        V.aiT = rand(0.8, 1.8);
        V.aiM = chance(0.45) ? rand(-0.8, 0.8) : 0;
        if (!ended && chance(0.25)) jump = true;
        if (st.nibbles < 2 && chance(0.3)) nib = true;   // a CPU tastes a candy or two, never eats its house bare
      }
      mx = V.aiM;
      if (Math.abs(a.x - V.x) > V.slot * 0.45) mx = Math.sign(V.x - a.x) * 0.7;
    }
    const sp = 360 * Math.max(0.6, V.s);
    a.x = clamp(a.x + mx * sp * dt, 40, W - 40);
    if (jump && a.z <= 0) { V.vz = 760; sfx('jump', { vol: 0.4 }); a.squash(-0.22); }
    V.vz -= 2600 * dt; a.z = Math.max(0, a.z + V.vz * dt);
    if (a.z <= 0 && V.vz < 0) { if (V.vz < -200) a.squash(0.18); V.vz = 0; }
    V.nibCD = Math.max(0, V.nibCD - dt);
    if (nib && V.nibCD <= 0) { V.nibCD = 0.35; this.nibble(st); }
    if (Math.abs(mx) > 0.15) a.facing = mx > 0 ? 1 : -1;
    if (a.z > 0) { if (!a._once && a.pose !== 'jump') a.setPose('jump'); }
    else if (Math.abs(mx) > 0.15) a.moveAnim(mx * sp, 0, sp);
    else if (!a._once && (a.pose === 'walk' || a.pose === 'jump' || a.pose === 'run')) a.setPose('idle');
  }

  /** X in the village: nibble the candy on your own house nearest your mouth (if it's in reach). */
  nibble(st) {
    const a = st.actor, V = st.v, Hs = st.H;
    const mouthY = a.y - a.z - a.height * 0.75;
    let best = null, bd = Infinity;
    for (const c of Hs.candies) {
      const s = this.vScreen(st, c.x, c.y);
      const dx = Math.abs(s.x - a.x), dy = Math.abs(s.y - mouthY);
      if (dx > 90 * Math.max(0.6, V.s) + a.width * 0.3 || dy > a.height * 0.6) continue;
      const d = dx + dy * 0.6;
      if (d < bd) { bd = d; best = c; }
    }
    a.playOnce('eat', 0.4, 'idle');
    if (!best) { sfx('blip', { vol: 0.5 }); return; }
    Hs.candies = Hs.candies.filter((c) => c !== best);
    st.nibbles++;
    const s = this.vScreen(st, best.x, best.y);
    a.facing = s.x >= a.x ? 1 : -1;
    snd('munch', 'pop', { vol: 0.6 });
    particles.burst(s.x, s.y, { type: 'shard', count: 7, colors: ['#c98345', '#ffffff', '#ff6fb1'], speed: [100, 240] });
    particles.popText(a.x, a.y - a.z - a.height * 1.1, pick(['Nom!', 'Yum!', 'Crunch!']), st.p.color, 34);
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const stats = this.stations.map((st) => {
      const n = st.H.candies.length + st.nibbles;
      return `${this.shape(st).name} · ${n} sweet${n === 1 ? '' : 's'}`;
    });
    snd('applause', 'cheer');
    this.api.finishTogether({ stats, title: 'Sweet as can be!' });
  }

  onDone() {
    if (this.phase !== 'finale') { this.startFinale(); return; }
    this.finishGame();
  }

  // ======================================================================================
  // Drawing
  draw(g) {
    if (this.phase === 'finale') {
      const fade = clamp(this.ft / 1.2, 0, 1);
      if (fade < 1) this.drawBuild(g);
      g.save(); g.globalAlpha = fade; this.drawVillage(g); g.restore();
    } else this.drawBuild(g);
    if (this.banner && !this.api.ended()) ui.banner(g, this.banner.text, this.banner.t, { size: this.phase === 'finale' ? 90 : 110, y: this.phase === 'finale' ? 200 : H / 2, color: '#ffffff' });
  }

  drawBuild(g) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#fbe3c8'); gr.addColorStop(1, '#f3c9a4');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#ffffff';
    for (let y = 0; y < H; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < W; x += 64) { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
    g.restore();
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -360, -40, 720, 80, { r: 40, fill: '#c98345' });
    ui.text(g, 'Gingerbread House', 0, 2, { size: 52, weight: 800 });
    g.restore();
    drawGingerPerson(g, W / 2 - 410, 96, 80, this.t);
    drawGingerPerson(g, W / 2 + 410, 96, 80, this.t + 1);
    if (this.n <= 2) ui.hints(g, [['lb', ''], ['rb', 'Steps']], 210, 56, { size: 34 });
    for (const st of this.stations) this.drawStation(g, st);
  }

  drawStation(g, st) {
    const { r, L, p } = st;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26); g.clip();
    this.drawKitchen(g, st);
    // the house
    g.save(); g.translate(L.stand.x, L.stand.y); g.scale(L.k, L.k);
    const tab = TABS[st.tab].id;
    drawHouse(g, st.H, { t: this.t, ghost: !st.ready && tab === 'build' ? st.H.built : -1 });
    if (!st.ready && tab === 'candy' && st.hover) {
      const c = st.hover, rr = CANDIES[CANDY[c.kind]].r * CANDY_S + 8;
      g.save(); g.globalAlpha = 0.6 + 0.3 * Math.sin(this.t * 8); g.setLineDash([7, 6]); g.lineWidth = 3;
      g.strokeStyle = p.color; g.beginPath(); g.arc(c.x, c.y, rr, 0, TAU); g.stroke(); g.restore();
    }
    g.restore();
    if (this.phase === 'build') st.actor.draw(g, { ring: p.color });
    if (!st.ready && (tab === 'icing' || tab === 'candy')) this.drawCursor(g, st, tab);
    if (!st.ready && tab === 'build') this.drawBuildPrompt(g, st);
    g.restore();
    g.save(); ui.roundRect(g, r.x, r.y, r.w, r.h, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke(); g.restore();
    this.drawTabs(g, st);
    this.drawList(g, st);
    this.drawStationHints(g, st);
    if (st.ready) this.drawReady(g, st);
  }

  drawKitchen(g, st) {
    const { r, L, p } = st;
    const bg = art('bg/gingerbread-house');
    if (bg) {
      // These anchors use the 1920x1080 authored canvas, independent of a
      // compact runtime image's pixel dimensions. Image y760 is the table edge.
      const s = Math.max(r.w / 1920, (L.tableY - r.y) / 760, (r.y + r.h - L.tableY) / (1080 - 760));
      const dw = 1920 * s, dh = 1080 * s;
      g.drawImage(bg, r.x + (r.w - dw) / 2, L.tableY - 760 * s, dw, dh);
      return;
    }
    g.fillStyle = mix(p.color, '#fff4e6', 0.84); g.fillRect(r.x, r.y, r.w, L.tableY - r.y);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    for (let x = r.x + 20; x < r.x + r.w; x += 56) g.fillRect(x, r.y, 18, L.tableY - r.y);
    // a frosty window
    const ww = clamp(r.w * 0.16, 70, 200), wh = ww * 0.8, wx = L.ca.x + 24, wy = L.ca.y + 16;
    g.fillStyle = '#bcdcff'; ui.roundRect(g, wx, wy, ww, wh, 10); g.fill();
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(wx + ((i * 37 + this.t * 12) % ww), wy + ((i * 53 + this.t * 30) % wh), 2.5, 0, TAU); g.fill(); }
    g.lineWidth = 6; g.strokeStyle = '#fffaf2'; g.strokeRect(wx, wy, ww, wh);
    g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
    g.lineWidth = 3; g.strokeStyle = NAVY; g.strokeRect(wx - 3, wy - 3, ww + 6, wh + 6);
    // the checked tablecloth
    const ty = L.tableY;
    g.fillStyle = '#ffffff'; g.fillRect(r.x, ty, r.w, r.y + r.h - ty);
    const cs = clamp(r.h * 0.05, 18, 40);
    g.fillStyle = 'rgba(232,33,63,0.55)';
    for (let y = ty, row = 0; y < r.y + r.h; y += cs, row++) for (let x = r.x + (row % 2) * cs; x < r.x + r.w; x += cs * 2) g.fillRect(x, y, cs, cs);
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(r.x, ty); g.lineTo(r.x + r.w, ty); g.stroke();
  }

  /** Build: "X Place" over the next piece's spot (or the finished house). */
  drawBuildPrompt(g, st) {
    if (st.p.isAI) return;
    const shape = this.shape(st), n = shape.pieces.length, k = st.L.k;
    const label = st.H.built < n ? `${shape.pieces[st.H.built].name} ${st.H.built + 1}/${n}` : 'Wiggle it!';
    const s = this.toScreen(st, 0, shape.top - 46);
    const fs = clamp(30 * k + 6, 18, 32), gsz = fs * 1.2;
    const w = gsz + 10 + ui.measure(g, label, fs, 800) + 22, h = gsz * 1.5, bob = Math.sin(this.t * 6) * 4;
    const x = clamp(s.x, st.L.ca.x + w / 2 + 6, st.L.ca.x + st.L.ca.w - w / 2 - 6), y = Math.max(st.L.ca.y + h / 2 + 4, s.y) + bob;
    ui.panel(g, x - w / 2, y - h / 2, w, h, { r: h / 2, fill: '#ffd23f', lineWidth: 3, shadow: false });
    ui.glyph(g, 'x', x - w / 2 + 8 + gsz / 2, y, gsz, { pulse: true });
    ui.text(g, label, x - w / 2 + 14 + gsz, y + 1, { size: fs, color: NAVY, stroke: false, align: 'left', weight: 800 });
  }

  drawCursor(g, st, tab) {
    const { L } = st, k = L.k, cur = st.cursor, s = this.toScreen(st, cur.x, cur.y);
    if (tab === 'icing') {
      // the piping bag, its nozzle tip on the icing spot
      const shape = this.shape(st), ne = nearestEdge(shape, st.H.built, cur.x, cur.y, SNAP_R);
      if (ne && !st.pipe) {
        const pt = shape.edges[ne.e].pts[ne.j], q = this.toScreen(st, pt[0], pt[1]);
        g.save(); g.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 8); g.beginPath(); g.arc(q.x, q.y, 9 * k + 4, 0, TAU);
        g.lineWidth = 3; g.strokeStyle = st.p.color; g.stroke(); g.restore();
      }
      const sz = clamp(64 * k, 36, 80);
      g.save(); g.translate(s.x, s.y); g.rotate(-0.6 + (st.pipe ? Math.sin(this.t * 30) * 0.04 : 0));
      g.lineJoin = 'round';
      g.fillStyle = '#c9ced8'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-sz * 0.09, -sz * 0.2); g.lineTo(sz * 0.09, -sz * 0.2); g.closePath(); g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
      const squeeze = st.pipe ? 0.9 + Math.sin(this.t * 18) * 0.05 : 1;
      g.beginPath(); g.moveTo(-sz * 0.1, -sz * 0.18); g.quadraticCurveTo(-sz * 0.4 * squeeze, -sz * 0.75, -sz * 0.22, -sz); g.lineTo(sz * 0.22, -sz); g.quadraticCurveTo(sz * 0.4 * squeeze, -sz * 0.75, sz * 0.1, -sz * 0.18); g.closePath();
      g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3; g.stroke();
      g.save(); g.clip(); g.fillStyle = icingColor(st.icingSel, Math.floor(this.t * 6)); g.fillRect(-sz, -sz * 0.6, sz * 2, sz * 0.5); g.restore();
      g.beginPath(); g.moveTo(-sz * 0.4, -sz * 1.02); g.lineTo(sz * 0.4, -sz * 1.02); g.lineWidth = 6; g.strokeStyle = st.p.color; g.stroke();
      g.restore();
      if (this.players.filter((pp) => !pp.isAI).length > 1 || st.p.isAI) ui.text(g, st.p.tag, s.x + sz * 0.4, s.y - sz * 1.05, { size: 20, color: st.p.color, strokeWidth: 4 });
      return;
    }
    // candy: the candy in the hand is drawn exactly where it will stick
    const kind = this.candyKind(st), def = CANDIES[st.candySel];
    const ld = landing(this.shape(st), st.H.built, cur.x, cur.y), l = this.toScreen(st, ld.x, ld.y);
    const sz = clamp(70 * k, 34, 70);
    g.save();
    if (Math.abs(ld.y - cur.y) > 2) {
      g.setLineDash([6, 8]); g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.45)';
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(l.x, l.y); g.stroke(); g.setLineDash([]);
    }
    g.beginPath(); g.arc(s.x, s.y, sz * 0.55, 0, TAU); g.lineWidth = 4; g.strokeStyle = st.p.color; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
    g.translate(st.L.stand.x, st.L.stand.y); g.scale(k, k);
    if (def.spray) drawCandy(g, kind, cur.x, cur.y + (st.shake ? Math.sin(this.t * 50) * 3 : 0), 0, false);
    else drawCandy(g, kind, ld.x, ld.y, st.candyCount, kind === 'cane' && st.candyCount % 2 === 1);
    g.restore();
    if (this.players.filter((pp) => !pp.isAI).length > 1 || st.p.isAI) ui.text(g, st.p.tag, s.x, s.y - sz * 0.55 - 14, { size: 20, color: st.p.color, strokeWidth: 4 });
  }

  tabIcon(g, id, cx, cy, s) {
    g.save(); g.translate(cx, cy); g.scale(s / 40, s / 40);
    g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round';
    switch (id) {
      case 'build': g.fillStyle = '#c98345'; g.beginPath(); g.moveTo(-14, 16); g.lineTo(14, 16); g.lineTo(14, -2); g.lineTo(0, -16); g.lineTo(-14, -2); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#6b3a1f'; g.fillRect(-4, 4, 8, 12); break;
      case 'icing': g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, 18); g.lineTo(-12, -14); g.lineTo(12, -14); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ff8fc8'; g.fillRect(-11, -12, 22, 8); g.strokeRect(-11, -12, 22, 8); break;
      case 'candy': drawCandy(g, 'gumdrop', 0, 0, 0, false, 1.1); break;
      default: break;
    }
    g.restore();
  }

  drawTabs(g, st) {
    const { r, L } = st;
    const gs = clamp(L.tabH * 0.55, 30, 44);
    const x0 = r.x + 14 + gs * 0.8, x1 = r.x + r.w - 14 - gs * 0.8;
    const tw = (x1 - x0) / TABS.length;
    ui.glyph(g, 'lb', r.x + 10 + gs * 0.6, r.y + 10 + L.tabH / 2, gs * 0.9);
    ui.glyph(g, 'rb', r.x + r.w - 10 - gs * 0.6, r.y + 10 + L.tabH / 2, gs * 0.9);
    TABS.forEach((tab, ti) => {
      const sel = ti === st.tab;
      const bx = x0 + ti * tw + 3, bw = tw - 6, by = r.y + 10 + (sel ? 0 : 6), bh = L.tabH - (sel ? 0 : 8);
      if (tab.id === 'done') { drawDoneTab(g, bx, by, bw, bh, { sel, bump: st.tabBump }); return; }
      const kk = sel ? 1 + st.tabBump * 0.8 : 1;
      g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(kk, kk);
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 14, fill: sel ? '#ffffff' : mix(st.p.color, '#ffffff', 0.5), lineWidth: sel ? 5 : 3, shadow: sel });
      const labeled = bh > 54 && bw > 100;
      const isz = Math.min(bh * (labeled ? 0.6 : 0.68), bw * 0.4);
      this.tabIcon(g, tab.id, labeled ? -bw * 0.22 : 0, 0, isz);
      if (labeled) ui.text(g, tab.name, bw * 0.12, 2, { size: bh * 0.3, color: NAVY, stroke: false, weight: 800, maxWidth: bw * 0.55 });
      g.restore();
    });
  }

  listItems(st) {
    switch (TABS[st.tab].id) {
      case 'build': return { title: 'House', sel: st.H.shape, items: SHAPES.map((s, i) => ({ name: s.name, icon: (g, x, y, sz) => drawShapeIcon(g, i, x, y, sz) })) };
      case 'icing': return { title: 'Icing', sel: st.icingSel, items: ICINGS.map((ic, i) => ({ name: ic.name, icon: (g, x, y, sz) => this.icingIcon(g, i, x, y, sz) })) };
      case 'candy': return { title: 'Candy', sel: st.candySel, items: CANDIES.map((c, i) => ({ name: c.name, icon: (g, x, y, sz) => { g.save(); g.translate(x, y); const sc = sz / 46; g.scale(sc, sc); drawCandy(g, c.id, 0, c.id === 'lolli' ? 10 : 0, i, false, 1); g.restore(); } })) };
      default: return null;
    }
  }
  icingIcon(g, i, x, y, sz) {
    const ic = ICINGS[i];
    g.save(); g.translate(x, y); g.lineCap = 'round';
    if (ic.style === 'dots') {
      for (let j = -1; j <= 1; j++) { g.beginPath(); g.arc(j * sz * 0.22, 0, sz * 0.1, 0, TAU); g.fillStyle = ic.c; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
    } else {
      const path = () => { g.beginPath(); g.moveTo(-sz * 0.32, sz * 0.05); g.quadraticCurveTo(-sz * 0.16, -sz * 0.18, 0, sz * 0.02); g.quadraticCurveTo(sz * 0.16, sz * 0.2, sz * 0.32, -sz * 0.05); };
      path(); g.lineWidth = sz * 0.2; g.strokeStyle = NAVY; g.stroke();
      path(); g.lineWidth = sz * 0.13;
      if (ic.rainbow) { const gg = g.createLinearGradient(-sz * 0.3, 0, sz * 0.3, 0); ['#ff6fb1', '#ffd23f', '#7ee08a', '#5fb8ff', '#c9a7ff'].forEach((c, j) => gg.addColorStop(j / 4, c)); g.strokeStyle = gg; } else g.strokeStyle = ic.c;
      g.stroke();
      if (ic.style === 'drips') { g.fillStyle = ic.c; g.strokeStyle = NAVY; g.lineWidth = 2; for (const dx of [-0.16, 0.14]) { g.beginPath(); g.ellipse(dx * sz, sz * 0.16, sz * 0.05, sz * 0.1, 0, 0, TAU); g.fill(); g.stroke(); } }
    }
    g.restore();
  }

  drawList(g, st) {
    const lr = st.L.list, tab = TABS[st.tab];
    if (tab.id === 'done') { drawDoneCard(g, lr, st.p.color, { title: 'House done?' }); return; }
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.9)', lineWidth: 4, shadow: false });
    const L = this.listItems(st);
    const headH = clamp(lr.h * 0.09, 26, 50);
    ui.text(g, L.title, lr.x + lr.w / 2, lr.y + headH * 0.62, { size: headH * 0.7, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 16 });
    const footH = clamp(lr.h * 0.09, 28, 48);
    const areaY = lr.y + headH + 6, areaH = lr.h - headH - 14 - footH;
    const vis = Math.min(L.items.length, Math.max(3, Math.floor(areaH / 62)));
    const slotH = areaH / vis;
    const first = clamp(L.sel - Math.floor(vis / 2), 0, L.items.length - vis);
    const named = lr.w >= 190;
    for (let k = 0; k < vis; k++) {
      const ii = first + k, it = L.items[ii], sel = ii === L.sel, sy = areaY + k * slotH, bump = sel ? st.listBump * 0.6 : 0;
      g.save(); g.translate(lr.x + lr.w / 2, sy + slotH / 2); g.scale(1 + bump, 1 + bump);
      const bw = lr.w - 16, bh = slotH - 6;
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 14, fill: sel ? '#ffd23f' : '#ffffff', lineWidth: sel ? 4 : 2, stroke: sel ? NAVY : 'rgba(36,22,63,0.25)', shadow: false });
      const isz = Math.min(bh * 0.92, named ? bw * 0.4 : bw * 0.8);
      const ix = named ? -bw / 2 + isz / 2 + 6 : 0;
      it.icon(g, ix, 0, isz);
      if (named) ui.text(g, it.name, ix + isz / 2 + 8, 2, { size: clamp(bh * 0.3, 16, 30), color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: bw - isz - 20 });
      g.restore();
    }
    g.fillStyle = NAVY;
    const ax = lr.x + lr.w / 2;
    if (first > 0) { g.beginPath(); g.moveTo(ax - 12, areaY + 2); g.lineTo(ax + 12, areaY + 2); g.lineTo(ax, areaY - 10); g.fill(); }
    if (first + vis < L.items.length) { const yb = areaY + areaH; g.beginPath(); g.moveTo(ax - 12, yb - 2); g.lineTo(ax + 12, yb - 2); g.lineTo(ax, yb + 10); g.fill(); }
    const fy = lr.y + lr.h - footH / 2 - 6, fs = footH * 0.62, pad = st.p.ctrl.kind === 'pad';
    const glyph = tab.id === 'build' ? (pad ? 'dpad' : 'stick') : pad ? 'dpad' : 'rt';
    ui.glyph(g, glyph, lr.x + 16 + fs / 2, fy, fs);
    ui.text(g, tab.id === 'build' ? 'Shape' : tab.id === 'icing' ? 'Icing' : 'Candy', lr.x + 26 + fs, fy + 1, { size: fs * 0.72, color: NAVY, stroke: false, align: 'left', weight: 800, maxWidth: lr.w - fs - 40 });
  }

  drawStationHints(g, st) {
    const { r, L, p } = st;
    const y = r.y + r.h - L.hintH / 2 - 8, sz = clamp(L.hintH * 0.72, 26, 42), wide = r.w > 700;
    let x = r.x + 16;
    const tw = clamp(sz * 2, 56, 84);
    ui.panel(g, x, y - sz * 0.5, tw, sz, { r: sz / 2, fill: p.color, lineWidth: 3, shadow: false });
    ui.text(g, p.tag, x + tw / 2, y + 1, { size: sz * 0.55, strokeWidth: 4, shadow: false });
    x += tw + 12;
    if (wide) { drawPortrait(g, p, x + sz * 0.55, y, sz * 0.55, { ring: p.color, ringWidth: 3 }); x += sz * 1.4; }
    const tab = TABS[st.tab].id, pad = p.ctrl.kind === 'pad';
    let items;
    if (st.ready) items = [['b', 'Change']];
    else if (tab === 'build') items = st.H.built < this.shape(st).pieces.length ? [['x', 'Place'], [pad ? 'dpad' : 'stick', 'Shape'], ['a', 'Build it all'], ['b', 'Take off']] : [['x', 'Wiggle'], ['a', 'OK!'], ['b', 'Take off']];
    else if (tab === 'icing') items = [['stick', 'Move'], ['x', 'Hold: pipe'], [pad ? 'dpad' : 'rt', 'Icing'], ['a', 'OK!'], ['b', 'Undo']];
    else if (tab === 'candy') items = [['stick', 'Move'], ['x', CANDIES[st.candySel].spray ? 'Shake!' : 'Stick on'], [pad ? 'dpad' : 'rt', 'Candy'], ['a', 'OK!'], ['b', st.hover ? 'Take off' : 'Undo']];
    else items = [['lb', 'Change'], ['a', "I'm ready!"]];
    const avail = r.x + r.w - 16 - x, lab = sz * 0.62;
    let need = 0;
    for (const [, l] of items) need += sz + 6 + (l ? ui.measure(g, l, lab) + 18 : 12);
    const k = Math.min(1, avail / need);
    x += Math.max(0, (avail - need * k) / 2);
    g.save(); g.translate(x, y); g.scale(k, k); x = 0;
    for (const [b, l] of items) {
      ui.glyph(g, b, x + sz / 2, 0, sz, { pulse: b === 'a' && tab === 'done' });
      x += sz + 6;
      if (l) { ui.text(g, l, x, 2, { size: lab, color: '#fff', align: 'left', strokeWidth: 5 }); x += ui.measure(g, l, lab) + 18; } else x += 12;
    }
    g.restore();
  }

  drawReady(g, st) {
    const lr = st.L.list;
    g.save();
    ui.roundRect(g, lr.x, lr.y, lr.w, lr.h, 22); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
    const cx = lr.x + lr.w / 2, cy = lr.y + lr.h * 0.36;
    const sc = ease.outBack(Math.min(1, st.readyT / 0.3));
    g.translate(cx, cy); g.rotate(-0.12); g.scale(sc, sc);
    const w = Math.min(lr.w * 0.95, 300), h = w * 0.36;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: h / 2, fill: '#36d17a', lineWidth: 5 });
    ui.text(g, 'Ready!', 0, 2, { size: h * 0.55, weight: 800 });
    g.restore();
    const waiting = this.stations.filter((s) => !s.ready).length, sz = clamp(lr.w * 0.09, 16, 28);
    if (waiting) ui.text(g, waiting === 1 ? 'Waiting for 1 baker...' : `Waiting for ${waiting} bakers...`, cx, cy + lr.h * 0.26, { size: sz, color: NAVY, stroke: false, maxWidth: lr.w - 20 });
  }

  // --- the village ------------------------------------------------------------------------------
  drawVillage(g) {
    const bg = art('bg/gingerbread-house-night');
    if (bg) g.drawImage(bg, 0, 0, W, H);
    else this.drawNight(g);
    // back row, then front row; each row's walkers in front of its houses
    const rows = [this.village.filter((s) => s.v.back), this.village.filter((s) => !s.v.back)];
    for (const row of rows) {
      if (!row.length) continue;
      for (const st of row) {
        const V = st.v;
        g.save(); g.translate(V.x, V.y); g.scale(V.s, V.s);
        // a soft shadow and snow drifts at the base
        g.fillStyle = 'rgba(40,40,90,0.25)'; g.beginPath(); g.ellipse(0, 26, BOARD_W * 0.55, 22, 0, 0, TAU); g.fill();
        drawHouse(g, st.H, { t: this.t });
        drawGlow(g, st.H, 1);
        g.restore();
        // name tag
        ui.text(g, st.p.tag, V.x + V.slot * 0.3, V.y + 50 * V.s, { size: 24, color: st.p.color, strokeWidth: 5 });
      }
      for (const st of row) st.actor.draw(g, { ring: st.p.color });
    }
    // snow falling over everything
    g.fillStyle = '#ffffff';
    for (const f of this.flakes) { g.globalAlpha = 0.8; g.beginPath(); g.arc(f.x, f.y, f.s, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    if (!this.api.ended() && this.ft > 1.4) this.drawVillageHints(g);
  }

  drawNight(g) {
    const sky = g.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#0d1240'); sky.addColorStop(1, '#4a2f7a');
    g.fillStyle = sky; g.fillRect(0, 0, W, 660);
    for (const s of this.stars) { g.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 2 + s.ph); g.fillStyle = '#fff8d8'; g.beginPath(); g.arc(s.x, s.y, s.s, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    const mg = g.createRadialGradient(1580, 170, 10, 1580, 170, 170);
    mg.addColorStop(0, 'rgba(255,250,220,0.5)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(1580, 170, 170, 0, TAU); g.fill();
    g.fillStyle = '#fff8e0'; g.beginPath(); g.arc(1580, 170, 70, 0, TAU); g.fill();
    // hills and pines far away
    g.fillStyle = '#c9d4f2';
    g.beginPath(); g.moveTo(0, 600); for (let x = 0; x <= W; x += 40) g.lineTo(x, 560 + Math.sin(x * 0.004) * 40 + Math.sin(x * 0.011) * 14); g.lineTo(W, 700); g.lineTo(0, 700); g.closePath(); g.fill();
    g.fillStyle = '#3b4f7a';
    for (let i = 0; i < 26; i++) { const x = (i * 83 + 40) % W, y = 590 + Math.sin(x * 0.004) * 30, h = 40 + (i % 3) * 14; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x - h * 0.35, y); g.lineTo(x + h * 0.35, y); g.closePath(); g.fill(); }
    // the snowy village square
    const sn = g.createLinearGradient(0, 620, 0, H);
    sn.addColorStop(0, '#dfe7fb'); sn.addColorStop(1, '#f7f9ff');
    g.fillStyle = sn; g.fillRect(0, 620, W, H - 620);
    g.strokeStyle = 'rgba(160,175,220,0.5)'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(200 + i * 330, 980 - (i % 2) * 60, 140, 14, 0, 0, TAU); g.stroke(); }
  }

  drawVillageHints(g) {
    const kids = this.players.filter((p) => !p.isAI);
    if (!kids.length) return;
    ui.hints(g, [['stick', 'Walk'], ['a', 'Jump'], ['x', 'Nibble!']], W / 2, H - 40, { size: 36 });
  }
}
