// Cake Bakery (Play Studio). Every player builds and decorates their own cake
// at a split-screen station: shape, layers, flavors, frosting + style,
// drizzle, then free decorating with a cursor (Decorate starts on None; X adds
// or shakes, sprinkles are little physics bits that land and stick, A is Done).
// Finale: candles are lit and everyone sings Happy Birthday while walking and
// jumping about (stick / A); X right by the candle blows it out (cutting the
// song short), after the song X mashes count from anywhere. Then the feast:
// bites come from where each eater stands, and jumping on the cake eats where
// she lands (through a layer, she drops to the one below).
import { W, H } from '../engine/canvas.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles, RAINBOW } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, sfxLoop, voice, music, hasSound, stopAllLoops } from '../engine/audio.js';
import { art } from '../engine/art.js';
import { aiProfile, steer } from '../engine/ai.js';
import { clamp, lerp, rand, randInt, pick, chance, shuffle, ease, TAU } from '../engine/util.js';
import { drawSparkleShape, drawHeartShape, drawStarShape } from '../engine/emotes.js';
import {
  NAVY, KY, SHAPES, FLAVORS, FROSTINGS, STYLES, DRIZZLES, DECOS, DECO, CANDY,
  newCake, layerGeom, topLayer, faceRange, landing, drawBody,
  makeDeco, sprinkle, drawDecoShape, drawSprinkles, drawDecoIcon, drawShaker,
  decoDef, isSpray, isCandle, candleTop, DECO_BOX, BITE_COL, biteCol, biteColX, layerAt, colHasCake,
} from './cake-bakery/cake.js';
import { askOpen, askUpdate, drawAsk, drawDoneTab, drawDoneCard } from '../engine/studio-ui.js';
import { meta } from './cake-bakery.meta.js';

export { meta };

const TABS = [
  { id: 'shape', name: 'Shape' },
  { id: 'layers', name: 'Layers' },
  { id: 'flavor', name: 'Flavors' },
  { id: 'frost', name: 'Frosting' },
  { id: 'drizzle', name: 'Drizzle' },
  { id: 'deco', name: 'Decorate' },
  { id: 'done', name: 'Done' },
];
const TAB = Object.fromEntries(TABS.map((t, i) => [t.id, i]));
const RATINGS = ['Yummy!', 'Delicious!', 'Best cake ever!', 'Sooo sweet!', '10 out of 10!', 'Magical!', 'Scrumptious!', 'Mmm-mmm!'];
const MAX_SPRINKLES = 520;
// Pick-up box per placed topping (cake-local): [half width, height above its base].
const ITEM_BOX = DECO_BOX;
// What CPU bakers and Surprise reach for.
const TOP_RING = ['cherry', 'strawberry', 'star', 'macaron', 'chocdrop', 'pearls', 'flower'];
const SIDE_BITS = ['star', 'gummy', 'butterfly', 'bow', 'pearls', 'macaron', 'heart', 'chocdrop'];
const CENTERPIECES = ['crown', 'rainbow', 'shootingstar', 'fairy', 'lollipop', 'candycane', 'cupcake', 'unicorn'];
const SPRAYS = ['sprinkles', 'sprinkles', 'starsprinkles', 'dots'];
const CANDLES = ['candle', 'candle', 'swirlcandle'];
// Decorate's list: None first (the default, so A just moves on), then every topping.
const PICKS = [{ id: 'none', name: 'None' }, ...DECOS];
const PICK = Object.fromEntries(PICKS.map((d, i) => [d.id, i]));
const pickId = (st) => PICKS[st.decoSel].id;
const snd = (key, fallback) => (hasSound(key) ? sfx(key) : fallback && sfx(fallback));

// Happy Birthday (public domain melody): [midi, beats]
const SONG = [
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
  [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
  [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 2.5],
];
const BEAT = 0.3;
// The baking clock (Play Studio, shown all along): at 0 it asks "Time's up!"
// (Keep baking = +1 min, All done = everyone's cake is ready: on to the candles).
const BAKE_TIME = 180, BAKE_MORE = 60;
const JINGLE_BEAT = 60 / 112;   // jingle/happy-birthday is the same tune at 112 BPM (13.9 s)
const BASS = { 0: 48, 6: 43, 12: 48, 19: 53, 22: 48 };
// The finale's kitchen: walking, jumping (cake-local units) and the feast's clock.
const WALK = 430, GRAV = 3000, JUMP_V = Math.sqrt(2 * GRAV * 250), STEP_UP = 30, PLATE_R = 232;
const FEAST_TIME = 40, FEAST_MORE = 20, FEAST_CPU = 8;

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
  const listW = Math.round(r.w * (n === 1 ? 0.28 : n > 4 ? 0.29 : 0.33));
  const ca = { x: r.x, y: r.y + tabH + 14, w: r.w - listW - 12, h: r.h - tabH - hintH - 26 };
  const k = Math.min(ca.h / 580, (ca.w * 0.66) / 560);
  const stand = { x: ca.x + ca.w * 0.62, y: ca.y + ca.h - 100 * k };
  return {
    tabH, hintH, listW, ca, k, stand,
    counterY: stand.y + 94 * k,
    list: { x: r.x + r.w - listW - 10, y: r.y + tabH + 14, w: listW, h: r.h - tabH - hintH - 28 },
    charFoot: { x: ca.x + ca.w * 0.15, y: stand.y + 94 * k + 4 },
    charH: ca.h * 0.5, charW: ca.w * 0.28,
  };
}

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.phase = 'bake';
    this.phaseT = 0;
    this.cpuOnly = this.players.every((p) => p.isAI);
    this.bakeLeft = BAKE_TIME;
    api.limit(() => (this.phase === 'bake' ? this.bakeLeft : null), {
      showAt: Infinity, x: W / 2 + 530, y: 56,
      timeUp: { more: () => { this.bakeLeft += BAKE_MORE; }, done: () => this.startFinale(), moreLabel: 'Keep baking!' },
    });
    // the feast's clock: Time's up asks Keep eating! / All done (all-CPU: just done)
    api.limit(() => (this.finale?.stage === 'feast' && !this.finished ? this.finale.feastLeft : null), {
      showAt: Infinity, x: W / 2 + 530, y: 56,
      timeUp: { more: () => { this.finale.feastLeft += FEAST_MORE; }, done: () => { if (!this.finished) this.finishGame(); }, moreLabel: 'Keep eating!' },
    });
    const rects = stationRects(this.n);
    this.stations = this.players.map((p, i) => this.makeStation(p, i, rects[i]));
    this.bunting = Array.from({ length: 30 }, (_, i) => RAINBOW[i % RAINBOW.length]);
    sfx('magic');
  }

  makeStation(p, i, r) {
    const L = layoutStation(r, this.n);
    const a = new Actor(p, { x: L.charFoot.x, y: L.charFoot.y, facing: 1 });
    a.scale = Math.min(L.charH / a.leader.h, L.charW / Math.max(1, a.width));
    a.snap();
    const cake = newCake();
    cake.flavors = [randInt(0, 6), randInt(0, 6), randInt(0, 6)];
    const st = {
      p, i, r, L, actor: a, cake, tab: 0, layerSel: 0, decoSel: 0,
      cursor: { x: 0, y: -330 }, ready: false, readyT: 0, history: [], shaking: null, shakeT: 0, ask: null,
      cakeBump: 0, listBump: 0, tabBump: 0, cheerCD: 0, ai: null, aiStick: 0,
      sprinkles: [], items: [], blow: 0, blowNeed: 8, out: false, rating: null, bites: 0,
    };
    // things the baker holds ride the hand landmark of the current frame
    a.attach((g, info) => this.drawHeld(g, st, info));
    if (p.isAI) this.planAI(st);
    return st;
  }

  /** Attachment (forward space, origin at the feet): the sprinkle shaker while shaking, a bite of cake while tasting. */
  drawHeld(g, st, info) {
    const { hand, h } = info;
    if (info.pose === 'shake-sprinkles') {
      const kind = pickId(st);
      // gripped near its base at the hand point (a muzzle's or the cake's
      // hand point too), cap tipped forward-down over the cake, rattling
      g.translate(hand.x, hand.y);
      g.rotate(2.25 + Math.sin(this.t * 32) * 0.3);
      const k = (h * 0.26) / 60; g.scale(k, k);
      g.translate(0, -12);
      drawShaker(g, isSpray(kind) ? kind : 'sprinkles');
    } else if (info.pose === 'eat' && this.finale && st.bites > 0) {
      // a bite of this cake at the mouth, just under the eyes landmark (eat
      // frames hold the hands there; the cake's hand point is on its top)
      const c = st.cake, u = h / 200, fr = FROSTINGS[c.frosting];
      g.translate(info.eyes.x + h * 0.04, info.eyes.y + h * 0.08); g.rotate(-0.2); g.scale(u, u);
      g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round';
      g.fillStyle = FLAVORS[c.flavors[st.biteLayer ?? c.layers - 1] ?? 0].c;
      g.beginPath(); g.moveTo(-14, -8); g.lineTo(14, -8); g.lineTo(12, 12); g.lineTo(-12, 12); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = fr.rainbow ? '#ffd6ef' : fr.c;
      ui.roundRect(g, -15, -16, 30, 10, 5); g.fill(); g.stroke();
      g.fillStyle = '#e8213f'; g.beginPath(); g.arc(3, -20, 5, 0, TAU); g.fill(); g.lineWidth = 2; g.stroke();
    }
  }

  // --- cake edits -----------------------------------------------------------------
  bump(st, big = false) {
    st.cakeBump = big ? 0.35 : 0.2;
    if (st.cheerCD <= 0) { st.actor.playOnce('cheer', 0.45, 'idle'); st.cheerCD = 0.9; }
    st.actor.squash(0.12);
  }
  cakeTop(st) {
    const T = topLayer(st.cake), k = st.L.k;
    return { x: st.L.stand.x, y: st.L.stand.y + T.yt * k };
  }
  geometryChanged(st) {
    st.cake.version++;
    // Everything on top hops to the new surface; things that don't fit tumble off.
    for (const d of [...st.sprinkles, ...st.items]) this.reland(st, d);
  }
  reland(st, d) {
    const c = st.cake;
    if (d.surface === 'top' || d.surface === 'plate') {
      let ty = null, surf = 'plate';
      for (let i = c.layers - 1; i >= 0; i--) {
        const fr = faceRange(c, i, d.x);
        if (fr) { ty = lerp(fr[0], fr[1], d.depth ?? 0.5); surf = 'top'; break; }
      }
      if (ty === null) { const ld = landing(c, d.x, 200); ty = ld.y; surf = ld.surface; }
      if (DECOS[DECO[d.kind]]?.topOnly && surf !== 'top') { const ld = landing(c, d.x, -999, { topOnly: true }); d.x = ld.x; ty = ld.y; surf = 'top'; }
      d.surface = surf; d.ty = ty;
    } else if (d.surface === 'side') {
      const ld = landing(c, d.x, d.y);
      d.surface = ld.surface; d.ty = ld.surface === 'side' ? d.y : ld.y;
    } else return;
    if (Math.abs(d.ty - d.y) > 1) {
      d.state = 'fall';
      d.vy = d.ty < d.y ? -Math.sqrt(2 * 1800 * (d.y - d.ty + 30)) : -120;
    }
  }

  changeOption(st, dir) {
    const c = st.cake;
    switch (TABS[st.tab].id) {
      case 'shape': c.shape = (c.shape + dir + SHAPES.length) % SHAPES.length; this.geometryChanged(st); break;
      case 'layers': c.layers = clamp(c.layers + dir, 1, 3); st.layerSel = Math.min(st.layerSel, c.layers - 1); this.geometryChanged(st); break;
      case 'flavor': c.flavors[st.layerSel] = (c.flavors[st.layerSel] + dir + FLAVORS.length) % FLAVORS.length; c.version++; break;
      case 'frost': c.frosting = (c.frosting + dir + FROSTINGS.length) % FROSTINGS.length; c.version++; break;
      case 'drizzle': c.drizzle = (c.drizzle + dir + DRIZZLES.length) % DRIZZLES.length; c.version++; break;
      default: return;
    }
    st.listBump = 0.15;
    sfx('swap');
    this.bump(st);
    const top = this.cakeTop(st);
    const col = this.tabColor(st);
    particles.burst(top.x, top.y, { type: 'sparkle', count: 8, colors: [col, '#fff'] });
  }

  tabColor(st) {
    const c = st.cake;
    switch (TABS[st.tab].id) {
      case 'flavor': return FLAVORS[c.flavors[st.layerSel]].c;
      case 'frost': return FROSTINGS[c.frosting].c;
      case 'drizzle': return DRIZZLES[c.drizzle].c || '#ffffff';
      default: return '#ffd23f';
    }
  }

  /** X: the next item in this step's list (the next topping while decorating). */
  xAction(st) {
    switch (TABS[st.tab].id) {
      case 'shape': case 'layers': case 'flavor': case 'frost': case 'drizzle': this.changeOption(st, 1); break;
      default: sfx('blip');
    }
  }

  /** Stick left / right: which layer gets the flavor, or the frosting's style. */
  sideAction(st, dir) {
    const c = st.cake;
    switch (TABS[st.tab].id) {
      case 'flavor': st.layerSel = (st.layerSel + dir + c.layers) % c.layers; sfx('move'); st.listBump = 0.12; break;
      case 'frost': c.style = (c.style + dir + STYLES.length) % STYLES.length; c.version++; sfx('splat'); this.bump(st); break;
      default: break;
    }
  }

  // --- decorations ---------------------------------------------------------------
  addItem(st, kind, lx, ly, { group = null, drop = 0 } = {}) {
    const c = st.cake, def = DECOS[DECO[kind]];
    if (kind === 'topper') {
      const old = st.items.filter((d) => d.kind === 'topper');
      st.items = st.items.filter((d) => d.kind !== 'topper');
      for (const h of st.history) for (let j = h.length - 1; j >= 0; j--) if (old.includes(h[j])) h.splice(j, 1);
    }
    const d = makeDeco(kind, lx, ly, { depth: 0.5 });
    this.settle(st, d, lx, ly, drop);
    if (def?.colors) d.color = pick(def.colors);
    if (kind === 'star') d.rot = rand(-0.4, 0.4);
    st.items.push(d);
    if (group) group.push(d);
    return d;
  }

  // Drop item d from hand position (lx, ly): it falls onto whatever is below.
  settle(st, d, lx, ly, drop = 0) {
    const c = st.cake, def = DECOS[DECO[d.kind]];
    const ld = landing(c, lx, ly, { topOnly: !!def?.topOnly });
    d.x = ld.x; d.y = Math.min(ly, ld.y) - drop; d.ty = ld.y; d.surface = ld.surface; d.depth = 0.5;
    if (ld.surface === 'top') { const fr = faceRange(c, ld.layer, ld.x); if (fr) d.depth = clamp((ld.y - fr[0]) / Math.max(1, fr[1] - fr[0]), 0, 1); }
    d.vy = 0; d.state = 'fall';
  }

  // --- moving / removing placed toppings (sprinkles are a spray and stay put) ---
  /** The placed topping under the hand (cake-local), nearest first, or null. */
  itemAt(st) {
    const cur = st.cursor;
    let best = null, bd = Infinity;
    for (const d of st.items) {
      if (d.state !== 'stuck') continue;
      const [hw, h] = ITEM_BOX[d.kind] || [24, 50];
      const cy = d.y - h / 2;
      const dx = Math.abs(cur.x - d.x), dy = Math.abs(cur.y - cy);
      if (dx > hw + 14 || dy > h / 2 + 16) continue;
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }
  grab(st, d) {
    st.held = d; d.state = 'held'; d.surface = 'held'; d.vy = 0; d.lit = false;
    this.followHand(st);
    sfx('pop'); st.actor.squash(0.1);
    const k = st.L.k, s = st.L.stand;
    particles.burst(s.x + d.x * k, s.y + (d.y - 20) * k, { type: 'sparkle', count: 6, colors: ['#fff', st.p.color] });
  }
  followHand(st) {
    const d = st.held; if (!d) return;
    const h = (ITEM_BOX[d.kind] || [24, 50])[1];
    d.x = st.cursor.x; d.y = st.cursor.y + h * 0.45;
  }
  dropHeld(st) {
    const d = st.held; if (!d) return;
    st.held = null;
    this.settle(st, d, st.cursor.x, st.cursor.y);
    sfx('whoosh');
  }
  removeItem(st, d) {
    if (st.held === d) st.held = null;
    st.items = st.items.filter((x) => x !== d);
    for (const h of st.history) for (let j = h.length - 1; j >= 0; j--) if (h[j] === d) h.splice(j, 1);
    st.history = st.history.filter((h) => h.length);
    const k = st.L.k, s = st.L.stand;
    sfx('back');
    particles.burst(s.x + d.x * k, s.y + (d.y - 20) * k, { type: 'smoke', count: 7, speed: [40, 130] });
    particles.burst(s.x + d.x * k, s.y + (d.y - 20) * k, { type: 'sparkle', count: 5, colors: ['#fff'] });
  }
  stepDeco(st, dir) {
    st.decoSel = (st.decoSel + dir + PICKS.length) % PICKS.length; sfx('move'); st.listBump = 0.15;
    if (st.shaking) st.shaking = null;
  }

  addSprinkles(st, lx, ly, count, group, spread = 26, shape = 'line') {
    const c = st.cake;
    for (let j = 0; j < count; j++) {
      const x = lx + rand(-spread, spread);
      const ld = landing(c, x, ly + rand(-6, 6), { jitterDepth: true });
      const s = sprinkle(x, ly + rand(-8, 8), shape);
      s.ty = ld.surface === 'side' ? s.y + rand(0, 8) : ld.y; s.surface = ld.surface;
      if (ld.surface === 'top') { const fr = faceRange(c, ld.layer, x); if (fr) s.depth = clamp((ld.y - fr[0]) / Math.max(1, fr[1] - fr[0]), 0, 1); }
      st.sprinkles.push(s);
      if (group) group.push(s);
    }
    if (st.sprinkles.length > MAX_SPRINKLES) st.sprinkles.splice(0, st.sprinkles.length - MAX_SPRINKLES);
  }

  undo(st) {
    const h = st.history.pop();
    if (!h || !h.length) { sfx('blip'); return; }
    const set = new Set(h);
    const k = st.L.k, s = st.L.stand;
    let cx = 0, cy = 0;
    for (const d of h) { cx += d.x; cy += d.y; }
    cx /= h.length; cy /= h.length;
    st.items = st.items.filter((d) => !set.has(d));
    st.sprinkles = st.sprinkles.filter((d) => !set.has(d));
    sfx('back');
    particles.burst(s.x + cx * k, s.y + cy * k, { type: 'smoke', count: 6, speed: [40, 120] });
  }

  updateDecos(st, dt) {
    const step = (d) => {
      if (d.state !== 'fall') return true;
      d.vy += 1800 * dt; d.y += d.vy * dt;
      if (d.vx) { d.x += d.vx * dt; d.vx *= Math.exp(-6 * dt); }
      if (d.rot !== undefined && d.spin) d.rot += d.spin * dt;
      if (d.vy > 0 && d.y >= d.ty) {
        d.y = d.ty;
        if (d.surface === 'floor') { d.state = 'gone'; return false; }
        if (d.vy > 500 && d.kind !== 'sprinkle') { d.vy = -d.vy * 0.25; return true; }
        d.state = 'stuck'; d.vy = 0;
        if (d.kind === 'sprinkle') d.spin = 0;
        else this.onLand(st, d);
      }
      return true;
    };
    st.sprinkles = st.sprinkles.filter(step);
    st.items = st.items.filter(step);
  }

  onLand(st, d) {
    const k = st.L.k, s = st.L.stand;
    const x = s.x + d.x * k, y = s.y + d.y * k;
    sfx('pop');
    particles.burst(x, y - 10 * k, { type: 'sparkle', count: 5, colors: ['#fff', '#fff6a8'] });
    if (!this.finale) this.bump(st);
  }

  updateCursor(st, dt) {
    const c = st.p.ctrl, cur = st.cursor;
    const sp = 640;
    // The stick moves the hand; the d-pad (pads) or LT / RT picks the topping; X adds it
    // (held: shakes a spray); A is Done with decorating (handled by the caller).
    const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    cur.x = clamp(cur.x + (mx * sp + c.rx * 180) * dt, -300, 300);
    cur.y = clamp(cur.y + (my * sp + c.ry * 180) * dt, -600, 100);
    let step = (c.pressed('rt') ? 1 : 0) - (c.pressed('lt') ? 1 : 0);
    if (pad) step += (c.pressed('down') || c.pressed('right') ? 1 : 0) - (c.pressed('up') || c.pressed('left') ? 1 : 0);
    if (step) this.stepDeco(st, Math.sign(step));
    const kind = pickId(st);
    // Carrying a placed topping: it rides on the hand; X puts it down, B takes it off.
    if (st.held) {
      this.followHand(st);
      if (c.pressed('x')) this.dropHeld(st);
      else if (c.pressed('b')) this.removeItem(st, st.held);
      st.hover = null;
      return;
    }
    const canGrab = !st.p.isAI;
    st.hover = canGrab ? this.itemAt(st) : null;
    if (st.hover && c.pressed('b')) { this.removeItem(st, st.hover); st.hover = null; return; }
    const spray = decoDef(kind)?.spray;
    if (st.hover && !spray && c.pressed('x')) { this.grab(st, st.hover); st.hover = null; return; }
    if (spray) {
      if (c.pressed('x')) {
        st.shaking = []; st.history.push(st.shaking); st.shakeT = 0;
        this.addSprinkles(st, cur.x, cur.y, 12, st.shaking, 26, spray); sfx('brush');
      } else if (c.held('x') && st.shaking) {
        st.shakeT += dt;
        if (st.shakeT > 0.07) { st.shakeT = 0; this.addSprinkles(st, cur.x, cur.y, 4, st.shaking, 26, spray); }
        if (Math.floor(this.t * 7) !== Math.floor((this.t - dt) * 7)) sfx('brush');
      }
      if (c.released('x') && st.shaking) { if (st.shaking.length > 20) this.bump(st); st.shaking = null; }
    } else if (c.pressed('x')) {
      if (kind === 'none') { sfx('blip'); st.listBump = 0.15; }   // nothing picked: the list wiggles
      else {
        const grp = [];
        this.addItem(st, kind, cur.x, cur.y, { group: grp });
        st.history.push(grp);
        sfx('whoosh');
      }
    }
    if (c.pressed('b')) this.undo(st);
  }

  surprise(st) {
    const c = st.cake;
    c.shape = randInt(0, SHAPES.length - 1);
    c.layers = pick([2, 2, 3, 3, 1]);
    const nf = FLAVORS.length - 1;
    c.flavors = [randInt(0, nf), randInt(0, nf), randInt(0, nf)];
    c.frosting = randInt(0, FROSTINGS.length - 1); c.style = randInt(0, STYLES.length - 1);
    c.drizzle = chance(0.7) ? randInt(1, DRIZZLES.length - 1) : 0;
    c.version++;
    st.items = []; st.sprinkles = []; st.history = []; st.held = null; st.hover = null;
    const grp = [];
    const T = topLayer(c), ti = c.layers - 1;
    // sprinkles rain
    const spray = decoDef(pick(SPRAYS)).spray;
    for (let j = 0; j < 4; j++) this.addSprinkles(st, rand(-0.3, 0.3) * T.w, T.yt - rand(150, 320), 14, grp, 50, spray);
    // berries (or macarons, pearls...) around the rim of the top
    const berry = pick(TOP_RING);
    const nb = randInt(4, 6);
    for (let j = 0; j < nb; j++) {
      const a = (j / nb) * TAU + 0.3;
      const x = Math.cos(a) * T.w * 0.33;
      const fr = faceRange(c, ti, x);
      if (!fr) continue;
      const y = lerp(fr[0], fr[1], 0.5 + Math.sin(a) * 0.35);
      const d = this.addItem(st, berry, x, y, { group: grp, drop: rand(200, 420) });
      d.vy = rand(-100, 0);
    }
    const nc = randInt(2, 5), ck = pick(CANDLES);
    for (let j = 0; j < nc; j++) {
      const x = (j - (nc - 1) / 2) * Math.min(40, T.w * 0.5 / nc);
      const fr = faceRange(c, ti, x) || [T.yt, T.yt];
      this.addItem(st, ck, x, lerp(fr[0], fr[1], 0.45 + (j % 2) * 0.12), { group: grp, drop: rand(300, 500) });
    }
    if (chance(0.5)) this.addItem(st, 'topper', T.w * 0.18, T.yt, { group: grp, drop: 520 });
    else if (chance(0.7)) this.addItem(st, pick(CENTERPIECES), -T.w * 0.2, T.yt, { group: grp, drop: 520 });
    const B = layerGeom(c, 0);
    const ns = randInt(3, 5), sk = pick(SIDE_BITS);
    for (let j = 0; j < ns; j++) {
      const x = (j - (ns - 1) / 2) * (B.w * 0.62 / ns);
      const fr = faceRange(c, 0, x);
      if (!fr) continue;
      this.addItem(st, sk, x, fr[1] + B.h * 0.45, { group: grp, drop: 0 });
    }
    st.history.push(grp);
    const top = this.cakeTop(st);
    sfx('magic'); sfx('bigpop');
    particles.burst(top.x, top.y, { type: 'smoke', count: 14, speed: [80, 240] });
    particles.burst(top.x, top.y, { type: 'star', count: 12 });
    st.actor.playOnce('ready', 0.6, 'idle'); st.cakeBump = 0.4;
  }

  setReady(st, on) {
    st.ready = on; st.readyT = 0;
    const a = st.actor;
    if (on) {
      sfx('ready'); a.playOnce('ready', 0.6, 'wave'); a.squash(-0.25);
      const top = this.cakeTop(st);
      particles.burst(top.x, top.y, { type: 'confetti', count: 26, speed: [200, 500] });
      a.say('Done!', 1.3, 'ready');
    } else { sfx('back'); a.setPose('idle'); }
  }

  // --- CPU bakers ------------------------------------------------------------------
  planAI(st) {
    const shape = randInt(0, SHAPES.length - 1), layers = pick([2, 2, 3, 3, 1]), nf = FLAVORS.length - 1;
    const plan = {
      shape, layers, flavors: [randInt(0, nf), randInt(0, nf), randInt(0, nf)],
      frosting: randInt(0, FROSTINGS.length - 1), style: randInt(0, STYLES.length - 1), drizzle: chance(0.65) ? randInt(1, DRIZZLES.length - 1) : 0,
      decos: null, surprise: chance(0.25),
    };
    st.ai = { plan, t: rand(0.8, 1.8), di: 0, holdT: 0, mode: 'tick' };
  }

  buildDecoPlan(st) {
    const c = st.cake, T = topLayer(c), B = layerGeom(c, 0);
    const list = [];
    const above = T.yt - 70;
    const ns = randInt(1, 2);
    for (let j = 0; j < ns; j++) list.push({ kind: pick(SPRAYS), x: rand(-0.25, 0.1) * T.w, y: above - rand(0, 40), hold: rand(0.5, 0.9), dx: rand(70, 120) });
    const berry = pick(TOP_RING);
    const nb = randInt(2, 4);
    for (let j = 0; j < nb; j++) { const a = (j / nb) * TAU + rand(0.5); list.push({ kind: berry, x: Math.cos(a) * T.w * 0.3, y: T.yt + Math.sin(a) * T.w * KY * 0.25 }); }
    const nc = randInt(1, 4);
    const ck = pick(CANDLES);
    for (let j = 0; j < nc; j++) list.push({ kind: ck, x: (j - (nc - 1) / 2) * 34, y: T.yt });
    if (chance(0.5)) list.push({ kind: pick(SIDE_BITS), x: rand(-0.3, 0.3) * B.w, y: B.yb - B.h * 0.4 + B.w * KY * 0.35 });
    if (chance(0.45)) list.push({ kind: pick(CENTERPIECES), x: rand(-0.3, -0.15) * T.w, y: T.yt });
    if (chance(0.5)) list.push({ kind: 'topper', x: rand(0, 0.15) * T.w, y: T.yt });
    return list;
  }

  updateAI(st, dt) {
    const c = st.p.ctrl, ai = st.ai, plan = ai.plan, cake = st.cake;
    if (st.aiStick > 0) { st.aiStick -= dt; if (st.aiStick <= 0) c.move(0, 0); }
    if (st.ready) return;
    const tab = TABS[st.tab].id;
    // Free decorating is continuous: steer the hand, then tap/hold A.
    if (tab === 'deco' && ai.decos && ai.mode === 'move') {
      const goal = ai.decos[ai.di];
      if (!goal) { ai.mode = 'tick'; c.move(0, 0); return; }
      if (pickId(st) !== goal.kind) { ai.mode = 'tick'; c.move(0, 0); return; }
      if (ai.holdT > 0) {
        ai.holdT -= dt; c.hold('x', true); c.move(0.25 * Math.sign(goal.dx), 0);
        if (ai.holdT <= 0) { c.hold('x', false); c.move(0, 0); ai.di++; ai.mode = 'tick'; ai.t = rand(0.5, 1.0); }
        return;
      }
      const d = steer(st.p, st.cursor.x, st.cursor.y, goal.x, goal.y, { arrive: 70 });
      if (d < 18) {
        c.move(0, 0);
        if (isSpray(goal.kind)) { c.hold('x', true); ai.holdT = goal.hold; }
        else { c.press('x'); ai.di++; ai.mode = 'tick'; ai.t = rand(0.45, 0.9) / aiProfile(st.p).speed; }
      }
      return;
    }
    ai.t -= dt;
    if (ai.t > 0) return;
    const hurry = !this.cpuOnly && this.stations.every((s) => s.ready || s.p.isAI);
    ai.t = rand(0.28, 0.58) / aiProfile(st.p).speed * (hurry ? 0.5 : 1);
    if (plan.surprise && !ai.didSurprise) { ai.didSurprise = true; c.press('y'); ai.t = 1.4; ai.skipToDeco = true; return; }
    const tap = (dir) => { c.move(0, dir); st.aiStick = 0.05; };
    const next = () => c.press('rb');
    if (ai.skipToDeco && st.tab < TAB.deco) { next(); return; }
    switch (tab) {
      case 'shape': if (cake.shape !== plan.shape) tap(plan.shape > cake.shape ? 1 : -1); else next(); break;
      case 'layers': if (cake.layers !== plan.layers) tap(plan.layers > cake.layers ? 1 : -1); else next(); break;
      case 'flavor': {
        const want = plan.flavors[st.layerSel];
        if (cake.flavors[st.layerSel] !== want) tap(want > cake.flavors[st.layerSel] ? 1 : -1);
        else if (cake.flavors.slice(0, cake.layers).some((f, i) => f !== plan.flavors[i])) { c.move(1, 0); st.aiStick = 0.05; }   // the next layer
        else next();
        break;
      }
      case 'frost':
        if (cake.frosting !== plan.frosting) tap(plan.frosting > cake.frosting ? 1 : -1);
        else if (cake.style !== plan.style) { c.move(1, 0); st.aiStick = 0.05; }   // the next style
        else next();
        break;
      case 'drizzle': if (cake.drizzle !== plan.drizzle) tap(plan.drizzle > cake.drizzle ? 1 : -1); else next(); break;
      case 'deco': {
        if (!ai.decos) { ai.decos = this.buildDecoPlan(st); if (ai.skipToDeco) ai.decos = ai.decos.slice(0, 2); ai.di = 0; }
        const goal = ai.decos[ai.di];
        if (!goal) { next(); break; }
        if (pickId(st) !== goal.kind) {
          // step the short way round the (long) topping list
          const fwd = (PICK[goal.kind] - st.decoSel + PICKS.length) % PICKS.length;
          this.stepDeco(st, fwd <= PICKS.length / 2 ? 1 : -1);
          ai.t *= 0.6;
          break;
        }
        ai.mode = 'move';
        break;
      }
      case 'done': c.press('a'); break;
      default: break;
    }
  }

  // --- main update --------------------------------------------------------------
  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.phase === 'bake') this.updateBake(dt);
    else this.updateFinale(dt);
  }

  // The gallery (after the game ends): the kitchen stays live - walk about and keep eating.
  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    if (!this.finale) { for (const st of this.stations) { st.actor.update(dt); this.updateDecos(st, dt); } return; }
    for (const st of this.stations) {
      this.updateDecos(st, dt);
      st.cakeBump = Math.max(0, st.cakeBump - dt);
      for (const d of st.items) if (isCandle(d.kind) && d.lit) d.flame = Math.max(0, (d.flame || 0) - dt * 6);
    }
    this.updatePeople(dt, true);
  }

  updateBake(dt) {
    this.bakeLeft = Math.max(0, this.bakeLeft - dt);
    for (const st of this.stations) {
      const c = st.p.ctrl, a = st.actor;
      if (st.p.isAI) this.updateAI(st, dt);
      st.cakeBump = Math.max(0, st.cakeBump - dt); st.listBump = Math.max(0, st.listBump - dt); st.tabBump = Math.max(0, st.tabBump - dt);
      st.cheerCD -= dt; st.readyT += dt;
      this.updateDecos(st, dt);
      a.update(dt);
      if (st.ready) { if (c.pressed('b')) this.setReady(st, false); continue; }
      if (st.ask) {   // "Swap for a surprise?": Go back (the default) or Surprise!
        const sel = st.ask.sel, r = askUpdate(c, st.ask);
        if (st.ask.sel !== sel) sfx('move');
        if (r) { st.ask = null; if (r === 'yes') this.surprise(st); else sfx('back'); }
        continue;
      }
      // LB / RB: steps (the last one is Done) · A: keep it and go on (on Done: ready) ·
      // stick up/down or X: the next choice (decorating: X adds / shakes, d-pad or LT / RT picks) · B: back / undo · Y: surprise me!
      const tabStep = (c.pressed('rb') ? 1 : 0) - (c.pressed('lb') ? 1 : 0);
      if (tabStep) {
        st.tab = (st.tab + tabStep + TABS.length) % TABS.length; st.tabBump = 0.18; sfx('move');
        if (st.shaking) st.shaking = null;
        this.dropHeld(st); st.hover = null;
        continue;
      }
      const tab = TABS[st.tab].id;
      if (c.pressed('y')) {
        // Y: surprise me! (a decorated cake asks first, Go back is the default)
        if ((st.items.length || st.sprinkles.length) && !st.p.isAI) { this.dropHeld(st); st.ask = askOpen(); sfx('select'); } else this.surprise(st);
        continue;
      }
      if (tab === 'deco') {
        if (c.pressed('a')) {   // A: done decorating, on to the next step (a carried topping is put down)
          this.dropHeld(st); st.hover = null;
          if (st.shaking) st.shaking = null;
          if (a.pose === 'shake-sprinkles') a.setPose('idle');
          st.tab++; st.tabBump = 0.18; sfx('select');
          continue;
        }
        this.updateCursor(st, dt);
        const kind = pickId(st);
        a.facing = 1;
        if (c.held('x') && isSpray(kind)) { if (a.pose !== 'shake-sprinkles' && !a._once) a.setPose('shake-sprinkles'); } else if (a.pose === 'shake-sprinkles') a.setPose('idle');
        continue;
      }
      if (tab === 'done') {
        if (c.pressed('a')) this.setReady(st, true);
        if (c.pressed('b')) { st.tab--; sfx('back'); }
        continue;
      }
      if (c.nav.y) this.changeOption(st, c.nav.y);
      if (c.nav.x) this.sideAction(st, c.nav.x);
      if (c.pressed('x')) this.xAction(st);
      if (c.pressed('a')) { st.tab++; st.tabBump = 0.18; sfx('select'); }
      if (c.pressed('b') && st.tab > 0) { st.tab--; sfx('back'); }
    }
    for (const st of this.stations) this.shakeSound(st);
    if (this.stations.every((s) => s.ready && s.readyT > 0.6)) this.startFinale();
  }

  // sprinkle-jar rattle loop while A is held on the sprinkles
  shakeSound(st) {
    const on = !this.finale && !st.ready && !!st.shaking && st.p.ctrl.held('x') && TABS[st.tab].id === 'deco' && isSpray(pickId(st));
    if (on && !st.shakeLoop) st.shakeLoop = sfxLoop('sprinkle-shake', { vol: this.n > 4 ? 0.6 : 0.85 });
    else if (!on && st.shakeLoop) { st.shakeLoop.stop(); st.shakeLoop = null; }
  }

  // --- finale: candles, song, blow, feast ---------------------------------------
  // All through the finale everyone can walk (stick) and jump (A) about their kitchen,
  // even onto the cake. X blows: right up close to a candle it goes out at once (cutting
  // the song short); after the song, X presses from anywhere count until it's out. Then
  // the feast: X takes a bite from whatever cake is in reach (the side she stands at, or
  // under her feet), and jumping onto the cake takes a big bite where she lands; eat
  // through a layer and she drops to the one below.
  startFinale() {
    if (this.finale) return;
    this.phase = 'finale'; this.phaseT = 0;
    for (const st of this.stations) this.shakeSound(st);
    this.finale = { stage: 'light', litQueue: [], song: { i: 0, t: 0 }, blowT: 0, feastT: 0, feastLeft: this.cpuOnly ? FEAST_CPU : FEAST_TIME };
    for (const st of this.stations) {
      st.ready = true; this.dropHeld(st); st.hover = null;
      st.actor.setPose('idle'); st.actor.facing = 1;
      c_release(st.p);
      if (!st.items.some((d) => isCandle(d.kind))) {
        const T = topLayer(st.cake), fr = faceRange(st.cake, st.cake.layers - 1, 0) || [T.yt, T.yt];
        this.addItem(st, 'candle', 0, lerp(fr[0], fr[1], 0.5), { drop: 400 });
      }
      for (const d of st.items) if (isCandle(d.kind)) { d.lit = false; d.flame = 0; this.finale.litQueue.push([st, d]); }
      st.blowNeed = Math.min(14, 6 + st.items.filter((d) => isCandle(d.kind)).length);
      // walking about: feet in cake-local units
      const s = st.L.stand, k = st.L.k, a = st.actor;
      st.mv = { x: (a.x - s.x) / k, y: (a.y - s.y) / k, vy: 0, air: false, jumped: false, layer: -1, fallFrom: 0, vx: 0 };
      st.counterY = st.mv.y;
      st.minX = (st.L.ca.x + a.width * 0.35 - s.x) / k;
      st.maxX = (st.L.ca.x + st.L.ca.w - a.width * 0.3 - s.x) / k;
      st.restPose = 'idle';
      st.cake.eaten = [0, 1, 2].map(() => new Uint8Array(BITE_COL.n));
      st.cakeCols = 0;
      for (let i = 0; i < st.cake.layers; i++) for (let j = 0; j < BITE_COL.n; j++) if (colHasCake(st.cake, i, j)) st.cakeCols++;
      st.bites = 0; st.eatenCols = 0;
      st.fai = null;
    }
    this.finale.litQueue = shuffle(this.finale.litQueue);
    sfx('whoosh');
  }

  // --- moving about the kitchen (cake-local units, +y down) ----------------------------
  body(st) { const a = st.actor, k = st.L.k; return { hw: (a.width * 0.3) / k, h: a.height / k }; }
  /** The surface she'd land on at x, falling from feet height y: a layer top, the stand's plate or the counter. */
  groundAt(st, x, y) {
    const c = st.cake;
    let best = st.counterY, layer = -1;
    const cand = (gy, l) => { if (gy >= y - STEP_UP && gy < best) { best = gy; layer = l; } };
    for (let i = 0; i < c.layers; i++) if (layerAt(c, i, x)) { const fr = faceRange(c, i, x); cand((fr[0] + fr[1]) / 2, i); }
    if (Math.abs(x) < PLATE_R) cand(-4, -2);
    return { y: best, layer };
  }
  /** Is cake in the way of a body standing with feet at (x, y)? */
  blocked(st, x, y) {
    const c = st.cake, { h } = this.body(st), top = y - h * 0.75, bot = y - STEP_UP;
    for (let i = 0; i < c.layers; i++) {
      if (!layerAt(c, i, x)) continue;
      const L = layerGeom(c, i);
      if (top < L.yb && bot > L.yt) return true;
    }
    return false;
  }

  /** jump: A jumps. autoHop (the gallery, where A leaves the game): walking into cake hops up it. */
  moveStation(st, dt, { jump = true, autoHop = false } = {}) {
    const m = st.mv, c = st.p.ctrl, a = st.actor, k = st.L.k, s = st.L.stand, { hw } = this.body(st);
    const mx = Math.abs(c.x) > 0.25 ? Math.sign(c.x) * Math.min(1, Math.abs(c.x) * 1.2) : 0;
    let vx = mx * WALK, hop = false;
    if (vx) {
      const dir = Math.sign(vx), nx = clamp(m.x + vx * dt, st.minX, st.maxX);
      // walk on unless cake is in the way (someone already inside cake can always walk out)
      if (!this.blocked(st, nx + dir * hw, m.y) || this.blocked(st, m.x, m.y)) m.x = nx;
      else { vx = 0; hop = autoHop; }
      a.facing = dir;
    }
    m.vx = vx;
    if (!m.air && (jump && c.pressed('a') || hop)) {
      m.vy = -JUMP_V; m.air = true; m.jumped = !hop; m.fallFrom = m.y;
      sfx('jump'); a.squash(-0.22);
    }
    m.vy += GRAV * dt;
    const ny = m.y + m.vy * dt, gr = this.groundAt(st, m.x, m.y);
    if (m.vy >= 0 && ny >= gr.y) {
      const was = m.air, fell = gr.y - m.fallFrom;
      m.y = gr.y; m.vy = 0; m.air = false; m.layer = gr.layer;
      if (was) this.land(st, gr, fell);
    } else {
      if (!m.air) m.fallFrom = m.y;
      m.y = ny; m.air = true;
    }
    a.x = s.x + m.x * k; a.y = s.y + m.y * k;
    if (m.air) { if (!a._once && a.pose !== 'jump') a.setPose('jump'); }
    else if (vx) a.moveAnim(vx * k, 0, WALK * k);
    else if (!a._once && a.pose !== st.restPose) a.setPose(st.restPose);
  }

  land(st, gr, fell) {
    const m = st.mv, a = st.actor;
    if (fell > 30) {
      a.squash(0.22); sfx('land', 'pop');
      particles.burst(a.x, a.y, { type: 'dust', count: 5, speed: [40, 140] });
    }
    // a jump onto the cake in the feast: a big bite right where she lands
    if (m.jumped && gr.layer >= 0 && this.finale?.stage === 'feast') this.chomp(st, gr.layer, m.x, 1);
    m.jumped = false;
  }

  /** X in the feast: the nearest cake in reach (her side of it, or under her feet). */
  bite(st) {
    const m = st.mv, a = st.actor, c = st.cake, { hw, h } = this.body(st);
    const reach = hw + 55, mouth = m.y - h * 0.78;
    let best = null;
    for (let i = c.layers - 1; i >= 0; i--) {
      const L = layerGeom(c, i);
      if (L.yb < m.y - h - 20 || L.yt > m.y + 150) continue;   // above her head / far below her feet
      for (const d of [a.facing, -a.facing]) {
        for (let r = 0; r <= reach; r += 6) {
          const x = m.x + d * r;
          if (!layerAt(c, i, x)) continue;
          const score = r + Math.abs((L.yt + L.yb) / 2 - mouth) * 0.3 + (d !== a.facing ? 30 : 0);
          if (!best || score < best.score) best = { i, x, score, d: r > 4 ? d : a.facing };
          break;
        }
      }
    }
    if (!best) {   // nothing in reach: a chomp at the air
      a.playOnce('eat', 0.4, st.restPose); sfx('blip');
      return false;
    }
    a.facing = best.d;
    return this.chomp(st, best.i, best.x, 0);
  }

  /** Eat column(s) of layer i around x (and whatever toppings sit there). */
  chomp(st, i, x, spread) {
    const c = st.cake, a = st.actor, k = st.L.k, s = st.L.stand, j0 = biteCol(x);
    let n = 0, xa = Infinity, xb = -Infinity;
    for (let j = j0 - spread; j <= j0 + spread; j++) {
      if (j < 0 || j >= BITE_COL.n || c.eaten[i][j] || !colHasCake(c, i, j)) continue;
      c.eaten[i][j] = 1; n++;
      xa = Math.min(xa, biteColX(j) - BITE_COL.w / 2); xb = Math.max(xb, biteColX(j) + BITE_COL.w / 2);
    }
    if (!n) return false;
    c.version++;
    st.bites++; st.eatenCols += n; st.biteLayer = i;
    // toppings and sprinkles on that bit of the layer are eaten with it
    const L = layerGeom(c, i), y0 = L.yt - L.w * KY * 0.55 - 8, y1 = L.yb + L.w * KY * 0.55;
    const gone = (d) => d.x >= xa - 6 && d.x <= xb + 6 && d.y >= y0 && d.y <= y1;
    st.items = st.items.filter((d) => !gone(d));
    st.sprinkles = st.sprinkles.filter((d) => !gone(d));
    a.playOnce('eat', 0.45, st.restPose); a.squash(0.18);
    sfx('munch'); st.cakeBump = Math.max(st.cakeBump, 0.12 + spread * 0.08);
    const fl = FLAVORS[c.flavors[i] ?? 0];
    particles.burst(s.x + ((xa + xb) / 2) * k, s.y + (L.yt + L.yb) / 2 * k, { type: 'shard', count: 6 + spread * 6, colors: [fl.c, FROSTINGS[c.frosting].c], speed: [120, 280] });
    if (spread) particles.popText(a.x, a.y - a.height * 1.1, 'CHOMP!', st.p.color, 46);
    if (st.bites >= 3 && !st.rating) this.giveRating(st);
    return true;
  }

  giveRating(st) {
    const a = st.actor;
    st.rating = { text: pick(RATINGS), t: 0 };
    a.emote('hearts', 2.5);
    const head = a.anchor('head');
    particles.burst(head.x, head.y, { type: 'heart', count: 14, speed: [150, 380] });
    sfx('star');
    a.say(pick(['Yum!', 'Mmm!', 'Yummy!']), 1.2, 'yay');
  }

  /** The lit candle she's right up close to (on the cake by it, or right beside it), or null. */
  nearCandle(st) {
    const m = st.mv, a = st.actor, { hw, h } = this.body(st);
    const mx = m.x + a.facing * hw * 0.3, my = m.y - h * 0.75;
    let best = null, bd = Infinity;
    for (const d of st.items) {
      if (!isCandle(d.kind) || !d.lit || d.out || d.state !== 'stuck') continue;
      const fy = d.y - candleTop(d.kind);
      const dx = Math.abs(d.x - mx) / (hw + 75), dy = Math.abs(fy - my) / 125;
      const dd = dx * dx + dy * dy;
      if (dd < 1 && dd < bd) { bd = dd; best = d; }
    }
    return best;
  }

  updateFinale(dt) {
    const F = this.finale, t = this.phaseT;
    for (const st of this.stations) {
      this.updateDecos(st, dt);
      st.cakeBump = Math.max(0, st.cakeBump - dt);
      for (const d of st.items) if (isCandle(d.kind) && d.lit) d.flame = Math.min(d.out ? 0 : 1, (d.flame || 0) + dt * 4) - (d.out ? dt * 6 : 0);
    }
    if (F.stage === 'light') {
      if (t > 0.9) {
        F.lightT = (F.lightT || 0) - dt;
        if (F.lightT <= 0 && F.litQueue.length) {
          const [st, d] = F.litQueue.shift();
          d.lit = true; F.lightT = Math.max(0.05, 0.9 / (F.litQueue.length + 3));
          const k = st.L.k, s = st.L.stand;
          particles.burst(s.x + d.x * k, s.y + (d.y - candleTop(d.kind)) * k, { type: 'spark', count: 8, colors: ['#ffd23f', '#ff9f1c', '#fff'] });
          sfx('pop');
        }
        if (!F.litQueue.length && (F.lightT ?? 0) <= -0.5) {
          // the recorded song plays once instead of the synth notes; the note clock below keeps its time
          F.stage = 'song'; F.song = { i: 0, t: 0.2, jingle: hasSound('jingle/happy-birthday') }; music.stop(0.4);
          // now and then a CPU wanders up to her candle and blows it out early
          const cpus = this.stations.filter((s) => s.p.isAI);
          F.cpuBlower = cpus.length && chance(0.3) ? pick(cpus) : null;
          F.cpuBlowAt = randInt(10, SONG.length - 4);
          for (const st of this.stations) st.restPose = 'clap';
        }
      }
    } else if (F.stage === 'song') {
      F.song.t -= dt;
      if (F.song.t <= 0) {
        const [m, b] = SONG[F.song.i];
        if (F.song.jingle) { if (F.song.i === 0) sfx('jingle/happy-birthday', { vol: 0.9 }); }
        else {
          sfx('note', { midi: m, dur: Math.min(0.5, b * BEAT * 0.95), vol: 0.3, wave: 'triangle', force: true });
          if (BASS[F.song.i] !== undefined) sfx('note', { midi: BASS[F.song.i], dur: 1.2, vol: 0.18, wave: 'sine', force: true });
        }
        F.song.t += b * (F.song.jingle ? JINGLE_BEAT : BEAT);
        F.song.i++;
        for (const st of this.stations) {
          const a = st.actor;
          if (F.song.i === 1 && !a._once && !st.mv.air && !st.mv.vx) a.setPose('clap');
          if (chance(0.5)) particles.burst(a.x, a.y - a.height * 1.05, { type: 'note', count: 1, colors: [st.p.color, '#fff'] });
        }
        if (F.song.i >= SONG.length) this.startBlow();
      }
    } else if (F.stage === 'blow') {
      F.blowT += dt;
      if (F.blowT > 7.5) for (const st of this.stations) if (!st.out) { st.blow = st.blowNeed; this.puff(st); }
      if (this.stations.every((s) => s.out) && !F.allOutT) F.allOutT = F.blowT;
      if (F.allOutT && F.blowT - F.allOutT > 1.2) {
        F.stage = 'feast'; F.feastT = 0; music.play('bouncy');
        for (const st of this.stations) st.restPose = 'idle';
      }
    } else if (F.stage === 'feast') {
      F.feastT += dt;
      F.feastLeft = Math.max(0, F.feastLeft - dt);
      // every cake (nearly) eaten up: done
      if (!F.eatenT && this.stations.every((s) => s.eatenCols >= s.cakeCols * 0.85)) F.eatenT = F.feastT;
      if (F.eatenT && F.feastT - F.eatenT > 2 && !this.finished) this.finishGame();
    }
    this.updatePeople(dt, false);
  }

  startBlow() {
    const F = this.finale;
    F.stage = 'blow'; F.blowT = 0;
    sfx('drumroll');
    for (const st of this.stations) { st.restPose = 'idle'; if (st.actor.pose === 'clap') st.actor.setPose('idle'); st.ai2 = rand(0.3, 0.7); }
  }

  /** Walking, jumping, blowing and eating, for everyone (CPUs pick their moves first). */
  updatePeople(dt, ended) {
    const F = this.finale;
    for (const st of this.stations) {
      const c = st.p.ctrl;
      if (st.p.isAI) this.finaleAI(st, dt, ended);
      // in the gallery A leaves the game, so no jumping there
      this.moveStation(st, dt, { jump: !ended, autoHop: ended });
      if (c.pressed('x')) {
        if (F.stage === 'feast') this.bite(st);
        else if ((F.stage === 'song' || F.stage === 'blow') && !st.out) {
          if (this.nearCandle(st)) {   // right up close: out in one big puff
            st.blow = Math.max(st.blow, st.blowNeed - 1); this.puff(st);
            if (F.stage === 'song') this.endSongEarly();
          } else if (F.stage === 'blow' && F.blowT > 0.3) this.puff(st);
          else if (F.stage === 'song' && !st.p.isAI && (st.closerT ?? 0) <= 0) {
            st.closerT = 1.2; sfx('blip');
            particles.popText(st.actor.x, st.actor.y - st.actor.height * 1.15, 'Go up close!', st.p.color, 34);
          }
        }
      }
      st.closerT = (st.closerT ?? 0) - dt;
      if (st.rating) st.rating.t += dt;
      st.actor.update(dt);
    }
  }

  /** Someone blew out her candle during the song: it stops, everyone's candles go out, then the feast. */
  endSongEarly() {
    stopAllLoops();   // the recorded song is a long one-shot, tracked with the loops
    this.startBlow();
    for (const st of this.stations) if (!st.out) { st.blow = st.blowNeed; this.puff(st); }
  }

  // CPUs in the finale: wander about; maybe one blows her candle out during the song;
  // mash X after it; then walk up to the cake, hop on it, and eat.
  finaleAI(st, dt, ended) {
    const F = this.finale, c = st.p.ctrl, m = st.mv, sp = aiProfile(st.p).speed;
    const ai = st.fai || (st.fai = { tx: null, t: 0, cd: 0, chew: 0, mode: 'wander' });
    ai.t -= dt; ai.cd -= dt;
    if (F.stage === 'blow' && !st.out) {
      c.move(0, 0);
      if (F.blowT > 0.6) { st.ai2 -= dt; if (st.ai2 <= 0) { c.press('x'); st.ai2 = rand(0.2, 0.42) / sp; } }
      return;
    }
    const L0 = layerGeom(st.cake, 0), side = m.x < 0 ? -1 : 1;
    const outside = () => { const lo = Math.max(st.minX, -(L0.w / 2 + 300)), hi = Math.min(st.maxX, L0.w / 2 + 300); return side < 0 ? rand(lo, -L0.w / 2 - 40) : rand(L0.w / 2 + 40, hi); };
    const candle = F.stage === 'song' && F.cpuBlower === st && F.song.i >= F.cpuBlowAt && !st.out
      ? st.items.find((d) => isCandle(d.kind) && d.lit && !d.out) : null;
    if (candle) {
      if (ai.mode !== 'candle') { ai.mode = 'candle'; ai.t = 6; }
      ai.tx = candle.x;
      if (this.nearCandle(st) && ai.cd <= 0) { c.press('x'); ai.cd = 0.3; c.move(0, 0); return; }
    } else if (ai.tx == null || ai.t <= 0 || ai.mode === 'candle') {
      // a new plan
      ai.chew = 0;
      if (F.stage !== 'feast' || ended && chance(0.5)) { ai.mode = 'wander'; ai.tx = outside(); ai.t = rand(1.5, 3.5); }
      else if (chance(0.45)) {   // hop up on the cake and eat where she lands
        const cols = [];
        for (let j = 0; j < BITE_COL.n; j++) for (let i = 0; i < st.cake.layers; i++) if (!st.cake.eaten[i][j] && colHasCake(st.cake, i, j)) { cols.push(biteColX(j)); break; }
        ai.mode = 'top'; ai.tx = cols.length ? pick(cols) : outside(); ai.chew = randInt(1, 3); ai.t = 4;
      } else { ai.mode = 'side'; ai.tx = side * 20; ai.chew = randInt(2, 4); ai.t = 4; }
    }
    const dx = ai.tx - m.x, dir = Math.sign(dx);
    const ahead = !m.air && Math.abs(dx) > 12 && this.blocked(st, m.x + dir * (this.body(st).hw + 10), m.y);
    let arrived = Math.abs(dx) < 12 && !m.air;
    if (ahead && ai.mode === 'side') arrived = true;   // at the cake's side
    if (arrived) {
      c.move(0, 0);
      if (ai.chew > 0 && ai.cd <= 0 && F.stage === 'feast') { c.press('x'); ai.chew--; ai.cd = rand(0.35, 0.6) / sp; }
      else if (ai.chew <= 0 && ai.mode !== 'wander' && ai.t > 0.8) ai.t = rand(0.3, 0.8);
      return;
    }
    c.move(dir * (Math.abs(dx) < 40 ? 0.6 : 1), 0);
    if (ahead && !ended && ai.cd <= 0) { c.press('a'); ai.cd = 0.25; }   // cake in the way: hop up
  }

  puff(st) {
    const a = st.actor, k = st.L.k, s = st.L.stand;
    st.blow++;
    a.playOnce('blow', 0.25, st.restPose);
    // mouth: just under the eyes landmark of the blow frame
    const eyes = a.anchor('eyes');
    const mouth = { x: eyes.x + a.height * 0.03 * a.facing, y: eyes.y + a.height * 0.06 };
    const my = mouth.y;
    sfx('whoosh');
    const top = this.cakeTop(st);
    const ang = Math.atan2(top.y - 30 * k - my, top.x - mouth.x);
    particles.burst(mouth.x, my, { type: 'bubble', count: 4, angle: ang, spread: 0.25, speed: [300, 520], life: [0.35, 0.55] });
    particles.burst(mouth.x, my, { type: 'dust', count: 3, angle: ang, spread: 0.2, speed: [260, 420] });
    const candles = st.items.filter((d) => isCandle(d.kind) && !d.out);
    const frac = st.blow / st.blowNeed;
    for (const d of candles) {
      d.flame = Math.max(0.2, 1 - frac) * rand(0.6, 1);
      if (frac >= 1 || chance(frac * 0.35)) {
        d.out = true;
        particles.burst(s.x + d.x * k, s.y + (d.y - candleTop(d.kind) - 6) * k, { type: 'smoke', count: 4, speed: [20, 70] });
      }
    }
    if (frac >= 1 || st.items.every((d) => !isCandle(d.kind) || d.out)) {
      st.out = true;
      for (const d of st.items) if (isCandle(d.kind) && !d.out) { d.out = true; particles.burst(s.x + d.x * k, s.y + (d.y - candleTop(d.kind) - 6) * k, { type: 'smoke', count: 5, speed: [20, 70] }); }
      sfx('candle-blow'); sfx('yay'); a.playOnce('cheer', 0.6, st.restPose);
      particles.burst(top.x, top.y - 60 * k, { type: 'confetti', count: 24, speed: [200, 480] });
      particles.popText(top.x, top.y - 120 * k, 'Yay!', st.p.color, 56);
      a.say('Whoosh!', 1, st.p.isAI ? null : 'woo');
    }
  }

  finishGame() {
    this.finished = true;
    const F = this.finale;
    if (F && F.stage !== 'feast') {   // ended early (pause menu): candles out, on to the eating
      F.stage = 'feast'; F.feastT = 0;
      for (const st of this.stations) { st.out = true; st.restPose = 'idle'; for (const d of st.items) if (isCandle(d.kind)) d.out = true; }
    }
    for (const st of this.stations) if (!st.rating) this.giveRating(st);
    const stats = this.stations.map((st) => {
      const c = st.cake;
      return `${SHAPES[c.shape].name} · ${c.layers} layer${c.layers > 1 ? 's' : ''}`;
    });
    snd('applause', 'cheer');
    this.api.finishTogether({ stats, title: 'Delicious!' });
  }

  destroy() { for (const st of this.stations) if (st.shakeLoop) st.shakeLoop.stop(); }

  onDone() {
    if (!this.finale) { this.startFinale(); return; }
    if (!this.finished) this.finishGame();
  }

  // =========================================================================
  // Drawing
  draw(g) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffe3f1'); gr.addColorStop(1, '#ffd0e4');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.45; g.fillStyle = '#ffffff';
    for (let y = 0; y < H; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < W; x += 60) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
    g.restore();
    // title
    g.save(); g.translate(W / 2, 56);
    ui.panel(g, -340, -40, 680, 80, { r: 40, fill: '#ff6fb1' });
    ui.text(g, this.finale ? 'Happy Birthday!' : 'Cake Bakery', 0, 2, { size: 52, weight: 800 });
    g.restore();
    this.drawMiniCake(g, W / 2 - 400, 60, 0.9);
    this.drawMiniCake(g, W / 2 + 400, 60, 0.9);
    if (this.n <= 2 && !this.finale) {
      ui.hints(g, [['lb', ''], ['rb', 'Steps']], 210, 56, { size: 34 });
      ui.hints(g, [['y', 'Surprise!']], W - 210, 56, { size: 34 });
    }
    for (const st of this.stations) this.drawStation(g, st);
    if (this.finale) this.drawFinaleOverlay(g);
  }

  drawMiniCake(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.lineWidth = 4; g.strokeStyle = NAVY;
    g.fillStyle = '#fff0c4'; ui.roundRect(g, -34, -6, 68, 30, 8); g.fill(); g.stroke();
    g.fillStyle = '#ff9fd0'; ui.roundRect(g, -34, -12, 68, 14, 7); g.fill(); g.stroke();
    g.fillStyle = '#fffaf2'; g.fillRect(-4, -36, 8, 24); g.strokeRect(-4, -36, 8, 24);
    g.fillStyle = '#ffb02e'; g.beginPath(); g.ellipse(0, -44, 5, 9 + Math.sin(this.t * 20) * 1.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8213f'; g.beginPath(); g.arc(-20, -14, 6, 0, TAU); g.arc(20, -14, 6, 0, TAU); g.fill();
    g.restore();
  }

  drawStation(g, st) {
    const { r, L, p } = st;
    g.save();
    ui.roundRect(g, r.x, r.y, r.w, r.h, 26); g.clip();
    // kitchen wall with tiles
    const bg = art('bg/cake-bakery');
    if (bg) g.drawImage(bg, r.x, r.y, r.w, r.h * 1.0);
    else {
      g.fillStyle = mix(p.color, '#ffffff', 0.82); g.fillRect(r.x, r.y, r.w, r.h);
      const tile = clamp(r.h * 0.07, 28, 60);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
      for (let x = r.x; x < r.x + r.w; x += tile) { g.beginPath(); g.moveTo(x, r.y); g.lineTo(x, L.counterY); g.stroke(); }
      for (let y = r.y; y < L.counterY; y += tile) { g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke(); }
      // bunting
      const by = L.ca.y + 6, n = Math.ceil(L.ca.w / 46);
      g.beginPath(); g.moveTo(L.ca.x, by); g.quadraticCurveTo(L.ca.x + L.ca.w / 2, by + 26, L.ca.x + L.ca.w, by); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, x = L.ca.x + u * L.ca.w, y = by + Math.sin(u * Math.PI) * 13;
        const fs = clamp(r.h * 0.025, 10, 20);
        g.beginPath(); g.moveTo(x - fs, y); g.lineTo(x + fs, y); g.lineTo(x, y + fs * 1.6); g.closePath();
        g.fillStyle = this.bunting[(i + st.i) % this.bunting.length]; g.fill(); g.lineWidth = 2; g.stroke();
      }
    }
    // counter
    const cy = L.counterY;
    g.fillStyle = '#f2b98b'; g.fillRect(r.x, cy - 8, r.w, 18);
    g.fillStyle = mix(p.color, '#ffffff', 0.55); g.fillRect(r.x, cy + 10, r.w, r.y + r.h - cy);
    g.fillStyle = 'rgba(255,255,255,0.4)';
    for (let x = r.x + 20; x < r.x + r.w; x += 44) for (let y = cy + 30; y < r.y + r.h; y += 40) { g.beginPath(); g.arc(x + ((y / 40) % 2) * 22, y, 6, 0, TAU); g.fill(); }
    g.strokeStyle = NAVY; g.lineWidth = 3; g.beginPath(); g.moveTo(r.x, cy - 8); g.lineTo(r.x + r.w, cy - 8); g.moveTo(r.x, cy + 10); g.lineTo(r.x + r.w, cy + 10); g.stroke();

    // the cake
    this.drawCake(g, st);
    st.actor.draw(g, { ring: p.color });
    if (this.finale) this.drawBlowPrompt(g, st);
    if (st.rating) this.drawRating(g, st);
    if (!st.ready && TABS[st.tab].id === 'deco') this.drawCursor(g, st);
    g.restore();

    g.save(); ui.roundRect(g, r.x, r.y, r.w, r.h, 26);
    g.lineWidth = 10; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = 6; g.strokeStyle = p.color; g.stroke(); g.restore();

    if (!this.finale) {
      this.drawTabs(g, st);
      this.drawList(g, st);
      this.drawStationHints(g, st);
      if (st.ask) drawAsk(g, st.L.list, st.ask, { title: 'Swap for a surprise?', yes: 'Surprise!' });
      if (st.ready) this.drawReady(g, st);
    } else {
      this.drawFinaleSide(g, st);
      if (!st.p.isAI && !this.api.ended()) this.drawStationHints(g, st, this.finaleHints(st));
    }
  }

  finaleHints(st) {
    const F = this.finale;
    if (F.stage === 'feast' || st.out) return [['stick', 'Move'], ['a', 'Jump'], ['x', 'Bite!']];
    if (F.stage === 'blow') return [['x', 'Blow!'], ['stick', 'Move'], ['a', 'Jump']];
    return [['stick', 'Move'], ['a', 'Jump'], ['x', 'Blow (up close!)']];
  }

  /** "X Blow!" over her candle while it's lit (bright and bouncing once she's close enough). */
  drawBlowPrompt(g, st) {
    const F = this.finale;
    if (st.p.isAI || st.out || !(F.stage === 'song' || F.stage === 'blow')) return;
    let d = null;
    for (const c of st.items) if (isCandle(c.kind) && c.lit && !c.out && (!d || c.y - candleTop(c.kind) < d.y - candleTop(d.kind))) d = c;
    if (!d) return;
    const k = st.L.k, s = st.L.stand;
    const near = !!this.nearCandle(st) || F.stage === 'blow';
    const fs = clamp(30 * k + 8, 20, 32), gsz = fs * 1.2, label = 'Blow!';
    const w = gsz + 10 + ui.measure(g, label, fs, 800) + 22, h = gsz * 1.5;
    const bob = near ? Math.sin(this.t * 9) * 5 : 0;
    const x = clamp(s.x + d.x * k, st.L.ca.x + w / 2 + 6, st.L.ca.x + st.L.ca.w - w / 2 - 6);
    const y = s.y + (d.y - candleTop(d.kind)) * k - 46 * k - h / 2 - 14 + bob;
    g.save(); g.globalAlpha = near ? 1 : 0.8;
    ui.panel(g, x - w / 2, y - h / 2, w, h, { r: h / 2, fill: near ? '#ffd23f' : 'rgba(255,255,255,0.92)', lineWidth: 3, shadow: false });
    g.beginPath(); g.moveTo(x - 9, y + h / 2 - 1); g.lineTo(x + 9, y + h / 2 - 1); g.lineTo(x, y + h / 2 + 11); g.closePath();
    g.fillStyle = near ? '#ffd23f' : 'rgba(255,255,255,0.92)'; g.fill();
    ui.glyph(g, 'x', x - w / 2 + 8 + gsz / 2, y, gsz, { pulse: near });
    ui.text(g, label, x - w / 2 + 14 + gsz, y + 1, { size: fs, color: NAVY, stroke: false, align: 'left', weight: 800 });
    g.restore();
  }

  drawCake(g, st) {
    const { L } = st, k = L.k, s = L.stand;
    const b = st.cakeBump;
    const sx = 1 + Math.sin(b * 30) * b * 0.25, sy = 1 - Math.sin(b * 30) * b * 0.2;
    g.save();
    g.translate(s.x, s.y + 90 * k); g.scale(sx, sy); g.translate(-s.x, -s.y - 90 * k);
    drawBody(g, st.cake, s.x, s.y, k);
    // flavor tab: point at the selected layer
    if (!this.finale && TABS[st.tab].id === 'flavor' && !st.ready) {
      const Lg = layerGeom(st.cake, st.layerSel);
      const ax = s.x - (Lg.w / 2 + 34) * k, ay = s.y + (Lg.yb - Lg.h / 2) * k;
      const bob = Math.sin(this.t * 8) * 6;
      g.save(); g.translate(ax + bob, ay);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-26, -16); g.lineTo(-26, 16); g.closePath();
      g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 4; g.strokeStyle = NAVY; g.stroke();
      g.restore();
    }
    g.save(); g.translate(s.x, s.y); g.scale(k, k);
    drawSprinkles(g, st.sprinkles);
    const items = st.items.slice().sort((a, b2) => (a === st.held) - (b2 === st.held) || a.y - b2.y);
    const hv = !this.finale && !st.ready && TABS[st.tab].id === 'deco' ? st.hover : null;
    if (hv) {
      // soft glow under the topping the hand is over
      const [hw, h] = ITEM_BOX[hv.kind] || [24, 50];
      g.save(); g.globalAlpha = 0.55 + 0.25 * Math.sin(this.t * 8);
      g.beginPath(); g.ellipse(hv.x, hv.y - h / 2, hw + 14, h / 2 + 12, 0, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); g.lineWidth = 5; g.setLineDash([10, 8]); g.strokeStyle = st.p.color; g.stroke();
      g.restore();
    }
    for (const d of items) drawDecoShape(g, d, this.t, { lit: !!d.lit, flame: d.flame ?? 1, charId: st.p, ring: st.p.color });
    g.restore();
    g.restore();
  }

  drawCursor(g, st) {
    const { L } = st, k = L.k, s = L.stand, cur = st.cursor;
    const held = st.held;
    const kind = held ? held.kind : pickId(st), def = DECOS[DECO[kind]];
    const x = s.x + cur.x * k, y = s.y + cur.y * k;
    if (!def) {   // None picked: just the hand (it can still pick up a topping with X)
      const sz = clamp(70 * k, 34, 70);
      g.save(); g.globalAlpha = 0.8;
      g.beginPath(); g.arc(x, y, sz * 0.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
      g.lineWidth = 5; g.strokeStyle = st.p.color; g.stroke();
      g.restore();
      if (st.hover) this.drawHandTip(g, st, x, y, sz, [['x', 'Move'], ['b', 'Take off']]);
      return;
    }
    // landing guide
    const ld = landing(st.cake, cur.x, cur.y, { topOnly: !!def.topOnly });
    const lx = s.x + ld.x * k, ly = s.y + ld.y * k;
    g.save();
    if (ld.surface !== 'floor') {
      g.setLineDash([6, 8]); g.lineWidth = 3; g.strokeStyle = 'rgba(36,22,63,0.45)';
      g.beginPath(); g.moveTo(x, y + 16); g.lineTo(lx, ly); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.ellipse(lx, ly, 16 * k + 6, 6 * k + 3, 0, 0, TAU); g.fillStyle = st.p.color; g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
    }
    const shakeX = isSpray(kind) && st.p.ctrl.held('x') ? Math.sin(this.t * 50) * 6 : 0;
    const sz = clamp(70 * k, 34, 70);
    if (held) {
      // the carried topping is drawn on the cake; the hand is just a ring around it
      g.beginPath(); g.arc(x, y, sz * 0.62, 0, TAU); g.lineWidth = 5; g.setLineDash([9, 7]); g.strokeStyle = st.p.color; g.stroke(); g.setLineDash([]);
    } else {
      g.beginPath(); g.arc(x + shakeX, y, sz * 0.62, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
      g.lineWidth = 5; g.strokeStyle = st.p.color; g.stroke();
      drawDecoIcon(g, kind, x + shakeX, y - 2, sz * 0.9, this.t);
    }
    if (this.players.filter((pp) => !pp.isAI).length > 1 || st.p.isAI) ui.text(g, st.p.tag, x, y - sz * 0.62 - 14, { size: 20, color: st.p.color, strokeWidth: 4 });
    // little hint bubble next to the hand when it is over (or carrying) a topping
    const tip = held ? [['x', 'Put down'], ['b', 'Take off']] : st.hover ? (isSpray(kind) ? [['b', 'Take off']] : [['x', 'Move'], ['b', 'Take off']]) : null;
    g.restore();
    if (tip) this.drawHandTip(g, st, x, y, sz, tip);
  }

  /** A little hint bubble above the hand. */
  drawHandTip(g, st, x, y, sz, tip) {
    const { L } = st, k = L.k;
    g.save();
    const fs = clamp(28 * k + 6, 18, 28), gsz = fs * 1.15;
    let w = 14;
    for (const [, l] of tip) w += gsz + 6 + ui.measure(g, l, fs, 800) + 12;
    // centred above the hand (and its player tag), kept inside the cake area
    const bx = clamp(x - w / 2, L.ca.x + 8, L.ca.x + L.ca.w - w - 8);
    const by = Math.max(L.ca.y + 4, y - sz * 0.62 - 34 - gsz * 1.6);
    ui.panel(g, bx, by, w, gsz * 1.6, { r: gsz * 0.8, fill: 'rgba(255,255,255,0.94)', lineWidth: 3, shadow: false });
    let tx = bx + 10;
    for (const [b, l] of tip) {
      ui.glyph(g, b, tx + gsz / 2, by + gsz * 0.8, gsz);
      tx += gsz + 6;
      ui.text(g, l, tx, by + gsz * 0.8 + 1, { size: fs, color: NAVY, stroke: false, align: 'left', weight: 800 });
      tx += ui.measure(g, l, fs, 800) + 12;
    }
    g.restore();
  }

  tabIcon(g, id, cx, cy, s) {
    g.save(); g.translate(cx, cy); g.scale(s / 40, s / 40);
    g.lineWidth = 3; g.strokeStyle = NAVY; g.lineJoin = 'round';
    switch (id) {
      case 'shape': g.fillStyle = '#ff7ac6'; g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-26, -4, -12, -24, 0, -10); g.bezierCurveTo(12, -24, 26, -4, 0, 14); g.fill(); g.stroke(); break;
      case 'layers': ['#ffaccd', '#fff0c4', '#9a6440'].forEach((c, i) => { g.fillStyle = c; ui.roundRect(g, -16 + i * 2, -16 + i * 11, 32 - i * 4, 10, 4); g.fill(); g.stroke(); }); break;
      case 'flavor': g.fillStyle = '#9a6440'; g.beginPath(); g.moveTo(-16, -6); g.lineTo(16, -6); g.lineTo(0, 18); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ffaccd'; g.beginPath(); g.arc(0, -8, 13, Math.PI, 0); g.fill(); g.stroke(); break;
      case 'frost': g.fillStyle = '#ff9fd0'; g.beginPath(); g.ellipse(0, 8, 16, 8, 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, -2, 11, 6, 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-5, -6); g.quadraticCurveTo(0, -20, 4, -8); g.fill(); g.stroke(); break;
      case 'drizzle': g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = '#5a321c'; g.beginPath(); g.moveTo(-16, -8); g.quadraticCurveTo(-8, -16, 0, -8); g.quadraticCurveTo(8, 0, 16, -8); g.stroke(); g.beginPath(); g.moveTo(-4, -8); g.lineTo(-4, 12); g.moveTo(10, -6); g.lineTo(10, 4); g.stroke(); break;
      case 'deco': drawDecoIcon(g, 'cherry', 0, -2, 44, this.t); break;
      case 'done': g.fillStyle = '#36d17a'; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fill(); g.stroke(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(-8, 0); g.lineTo(-2, 7); g.lineTo(9, -7); g.stroke(); break;
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
      const sel = ti === st.tab, doneTab = ti < st.tab;
      const bx = x0 + ti * tw + 3, bw = tw - 6, by = r.y + 10 + (sel ? 0 : 6), bh = L.tabH - (sel ? 0 : 8);
      if (tab.id === 'done') { drawDoneTab(g, bx, by, bw, bh, { sel, bump: st.tabBump }); return; }
      const kk = sel ? 1 + st.tabBump * 0.8 : 1;
      g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(kk, kk);
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 14, fill: sel ? '#ffffff' : mix(st.p.color, '#ffffff', 0.5), lineWidth: sel ? 5 : 3, shadow: sel });
      const labeled = sel && bh > 64 && bw > 100;
      this.tabIcon(g, tab.id, 0, labeled ? -bh * 0.12 : 0, Math.min(bh * (labeled ? 0.55 : 0.68), bw * 0.6));
      if (labeled) ui.text(g, tab.name, 0, bh * 0.3, { size: bh * 0.22, color: NAVY, stroke: false, weight: 800, maxWidth: bw - 8 });
      if (doneTab) { g.beginPath(); g.arc(bw / 2 - 8, -bh / 2 + 8, 5, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 2; g.strokeStyle = NAVY; g.stroke(); }
      g.restore();
    });
  }

  listItems(st) {
    const c = st.cake;
    switch (TABS[st.tab].id) {
      case 'shape': return { sel: c.shape, items: SHAPES.map((s, i) => ({ name: s.name, icon: (g, x, y, sz) => this.shapeIcon(g, i, x, y, sz) })) };
      case 'layers': return { sel: c.layers - 1, items: [1, 2, 3].map((n) => ({ name: `${n} Layer${n > 1 ? 's' : ''}`, icon: (g, x, y, sz) => this.layersIcon(g, n, x, y, sz) })) };
      case 'flavor': return { sel: c.flavors[st.layerSel], items: FLAVORS.map((f) => ({ name: f.name, icon: (g, x, y, sz) => this.swatch(g, f, x, y, sz) })) };
      case 'frost': return { sel: c.frosting, items: FROSTINGS.map((f) => ({ name: f.name, icon: (g, x, y, sz) => this.swirlIcon(g, f, x, y, sz) })) };
      case 'drizzle': return { sel: c.drizzle, items: DRIZZLES.map((d) => ({ name: d.name, icon: (g, x, y, sz) => this.drizzleIcon(g, d, x, y, sz) })) };
      case 'deco': return { sel: st.decoSel, items: PICKS.map((d) => ({ name: d.name, icon: (g, x, y, sz) => (d.id === 'none' ? this.drizzleIcon(g, DRIZZLES[0], x, y, sz) : drawDecoIcon(g, d.id, x, y, sz * 0.9, this.t)) })) };
      default: return null;
    }
  }

  shapeIcon(g, i, x, y, sz) {
    const sh = SHAPES[i];
    g.save(); g.translate(x, y);
    const w = sz * (sh.tower ? 0.5 : 0.72), h = sz * (sh.tower ? 0.5 : 0.28);
    for (let yy = h / 2; yy >= -h / 2; yy -= 2) {
      g.beginPath(); sh.poly.forEach(([px, py], j) => { const X = px * w, Y = yy + py * w * KY; j ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath();
      g.fillStyle = yy < -h / 2 + 3 ? '#ff9fd0' : '#fff0c4'; g.fill();
    }
    g.beginPath(); sh.poly.forEach(([px, py], j) => { const X = px * w, Y = -h / 2 + py * w * KY; j ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath();
    g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
    g.restore();
  }
  layersIcon(g, n, x, y, sz) {
    g.save(); g.translate(x, y); g.lineWidth = 2.5; g.strokeStyle = NAVY;
    const lh = sz * 0.18;
    for (let i = 0; i < n; i++) {
      const w = sz * (0.7 - i * 0.13), yy = sz * 0.3 - (i + 1) * lh;
      g.fillStyle = ['#fff0c4', '#ffaccd', '#9a6440'][i]; ui.roundRect(g, -w / 2, yy, w, lh, 4); g.fill(); g.stroke();
    }
    g.restore();
  }
  swatch(g, f, x, y, sz) {
    g.beginPath(); g.arc(x, y, sz * 0.32, 0, TAU);
    if (f.rainbow) { const gg = g.createLinearGradient(x - sz * 0.32, 0, x + sz * 0.32, 0); RAINBOW.forEach((c, i) => gg.addColorStop(i / 6, c)); g.fillStyle = gg; } else g.fillStyle = f.c;
    g.fill(); g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x - sz * 0.1, y - sz * 0.1, sz * 0.08, 0, TAU); g.fill();
  }
  swirlIcon(g, f, x, y, sz) {
    const fill = f.rainbow ? (() => { const gg = g.createLinearGradient(x - sz * 0.3, 0, x + sz * 0.3, 0); RAINBOW.forEach((c, i) => gg.addColorStop(i / 6, c)); return gg; })() : f.c;
    g.save(); g.translate(x, y); g.fillStyle = fill; g.lineWidth = 2.5; g.strokeStyle = NAVY;
    g.beginPath(); g.ellipse(0, sz * 0.18, sz * 0.32, sz * 0.14, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, 0, sz * 0.22, sz * 0.12, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-sz * 0.08, -sz * 0.06); g.quadraticCurveTo(0, -sz * 0.36, sz * 0.06, -sz * 0.08); g.fill(); g.stroke();
    g.restore();
  }
  drizzleIcon(g, d, x, y, sz) {
    if (!d.c) {
      g.save(); g.translate(x, y); g.setLineDash([sz * 0.08, sz * 0.07]); g.beginPath(); g.arc(0, 0, sz * 0.28, 0, TAU);
      g.lineWidth = 2.5; g.strokeStyle = 'rgba(36,22,63,0.4)'; g.stroke(); g.restore(); return;
    }
    g.save(); g.translate(x, y); g.lineCap = 'round';
    g.beginPath(); g.moveTo(-sz * 0.32, -sz * 0.05); g.quadraticCurveTo(-sz * 0.16, -sz * 0.25, 0, -sz * 0.05); g.quadraticCurveTo(sz * 0.16, sz * 0.15, sz * 0.32, -sz * 0.05);
    g.moveTo(-sz * 0.08, -sz * 0.12); g.lineTo(-sz * 0.08, sz * 0.22);
    g.lineWidth = sz * 0.16; g.strokeStyle = NAVY; g.stroke();
    g.lineWidth = sz * 0.1; g.strokeStyle = d.rainbow ? (() => { const gg = g.createLinearGradient(-sz * 0.3, 0, sz * 0.3, 0); RAINBOW.forEach((c, i) => gg.addColorStop(i / 6, c)); return gg; })() : d.c; g.stroke();
    g.restore();
  }

  drawList(g, st) {
    const lr = st.L.list;
    const tab = TABS[st.tab];
    if (tab.id === 'done') { drawDoneCard(g, lr, st.p.color, { title: 'Cake done?' }); return; }
    ui.panel(g, lr.x, lr.y, lr.w, lr.h, { r: 22, fill: 'rgba(255,255,255,0.88)', lineWidth: 4, shadow: false });
    const headH = clamp(lr.h * 0.09, 26, 50);
    let title = tab.name;
    if (tab.id === 'flavor') title = st.cake.layers > 1 ? `Layer ${st.layerSel + 1} of ${st.cake.layers}` : 'Flavor';
    ui.text(g, title, lr.x + lr.w / 2, lr.y + headH * 0.62, { size: headH * 0.7, color: st.p.color, strokeWidth: 5, maxWidth: lr.w - 16 });
    const L = this.listItems(st);
    const footH = ['flavor', 'frost', 'deco'].includes(tab.id) ? clamp(lr.h * 0.09, 28, 48) : 0;
    const areaY = lr.y + headH + 6, areaH = lr.h - headH - 14 - footH;
    const vis = Math.min(L.items.length, Math.max(3, Math.floor(areaH / 62)));
    const slotH = areaH / vis;
    const first = clamp(L.sel - Math.floor(vis / 2), 0, L.items.length - vis);
    const named = lr.w >= 190;
    for (let k = 0; k < vis; k++) {
      const ii = first + k, it = L.items[ii], sel = ii === L.sel;
      const sy = areaY + k * slotH;
      const bump = sel ? st.listBump * 0.6 : 0;
      g.save(); g.translate(lr.x + lr.w / 2, sy + slotH / 2); g.scale(1 + bump, 1 + bump);
      const bw = lr.w - 16, bh = slotH - 6;
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 14, fill: sel ? '#ffd23f' : '#ffffff', lineWidth: sel ? 4 : 2, stroke: sel ? NAVY : 'rgba(36,22,63,0.25)', shadow: false });
      const isz = Math.min(bh * 0.92, named ? bh : bw * 0.8);
      const ix = named ? -bw / 2 + isz / 2 + 6 : 0;
      it.icon(g, ix, 0, isz);
      if (named) ui.text(g, it.name, ix + isz / 2 + 8, 2, { size: clamp(bh * 0.3, 16, 30), color: NAVY, stroke: false, align: 'left', weight: 700, maxWidth: bw - isz - 20 });
      g.restore();
    }
    g.fillStyle = NAVY;
    const ax = lr.x + lr.w / 2;
    if (first > 0) { g.beginPath(); g.moveTo(ax - 12, areaY + 2); g.lineTo(ax + 12, areaY + 2); g.lineTo(ax, areaY - 10); g.fill(); }
    if (first + vis < L.items.length) { const yb = areaY + areaH; g.beginPath(); g.moveTo(ax - 12, yb - 2); g.lineTo(ax + 12, yb - 2); g.lineTo(ax, yb + 10); g.fill(); }
    if (footH) {
      const fy = lr.y + lr.h - footH / 2 - 6, fs = footH * 0.62;
      const label = tab.id === 'flavor' ? '◀ ▶ Layer' : tab.id === 'frost' ? `◀ ▶ ${STYLES[st.cake.style]}` : 'Topping';
      ui.glyph(g, tab.id === 'deco' ? (st.p.ctrl.kind === 'pad' ? 'dpad' : 'rt') : 'stick', lr.x + 16 + fs / 2, fy, fs);
      ui.text(g, label, lr.x + 26 + fs, fy + 1, { size: fs * 0.72, color: NAVY, stroke: false, align: 'left', weight: 800, maxWidth: lr.w - fs - 40 });
    }
  }

  drawStationHints(g, st, finaleItems = null) {
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
    const tab = finaleItems ? 'finale' : TABS[st.tab].id;
    let items = finaleItems;
    const pad = p.ctrl.kind === 'pad';
    if (finaleItems) { /* the finale's controls */ } else if (tab === 'deco') {
      const kind = pickId(st);
      if (st.held) items = [['stick', 'Move'], ['x', 'Put down'], ['b', 'Take off']];
      else {
        items = [[pad ? 'dpad' : 'rt', 'Topping']];
        if (kind !== 'none') items.unshift(['stick', 'Move'], ['x', isSpray(kind) ? 'Shake!' : st.hover ? 'Pick up' : 'Add']);
        else if (st.hover) items.unshift(['x', 'Pick up']);
        items.push(['a', 'Done']);
        if (st.hover || st.history.length) items.push(['b', st.hover ? 'Take off' : 'Undo']);
      }
    } else if (tab === 'done') items = [['lb', 'Change'], ['a', "I'm ready!"]];
    else items = [[pad ? 'dpad' : 'stick', 'Pick'], ['x', 'Next'], ['a', 'OK!']];
    if (tab !== 'done' && tab !== 'finale') items.push(['y', wide ? 'Surprise!' : '']);
    const avail = r.x + r.w - 16 - x, lab = sz * 0.62;
    let need = 0;
    for (const [, l] of items) need += sz + 6 + (l ? ui.measure(g, l, lab) + 18 : 12);
    const k = Math.min(1, avail / need);
    x += Math.max(0, (avail - need * k) / 2);
    g.save(); g.translate(x, y); g.scale(k, k); x = 0;
    for (const [b, l] of items) {
      ui.glyph(g, b, x + sz / 2, 0, sz, { pulse: b === 'a' && tab === 'done' || b === 'x' && tab === 'finale' && this.finale?.stage === 'blow' });
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
    const p = Math.min(1, st.readyT / 0.3), sc = ease.outBack(p);
    g.translate(cx, cy); g.rotate(-0.12); g.scale(sc, sc);
    const w = Math.min(lr.w * 0.95, 300), h = w * 0.36;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: h / 2, fill: '#36d17a', lineWidth: 5 });
    ui.text(g, 'Ready!', 0, 2, { size: h * 0.55, weight: 800 });
    g.restore();
    const waiting = this.stations.filter((s) => !s.ready).length;
    const sz = clamp(lr.w * 0.09, 16, 28);
    if (waiting) ui.text(g, waiting === 1 ? 'Waiting for 1 baker...' : `Waiting for ${waiting} bakers...`, cx, cy + lr.h * 0.26, { size: sz, color: NAVY, stroke: false, maxWidth: lr.w - 20 });
    if (!st.p.isAI) ui.hints(g, [['b', 'Change']], cx, cy + lr.h * 0.42, { size: sz * 1.3 });
  }

  drawRating(g, st) {
    const lr = st.L.list;
    const p = clamp(st.rating.t / 0.4, 0, 1), sc = ease.outBack(p);
    const cx = lr.x + lr.w / 2, cy = lr.y + lr.h * 0.42;
    g.save(); g.translate(cx, cy); g.rotate(-0.06 + Math.sin(this.t * 2 + st.i) * 0.03); g.scale(sc, sc);
    const w = Math.min(lr.w * 0.96, 330), h = w * 0.62;
    ui.panel(g, -w / 2, -h / 2, w, h, { r: 26, fill: '#fff8ec', stroke: st.p.color, lineWidth: 7 });
    ui.stars(g, 5, 0, -h * 0.2, w * 0.12, { wobble: true });
    ui.text(g, st.rating.text, 0, h * 0.18, { size: w * 0.13, color: '#ff6fb1', weight: 800, maxWidth: w - 24 });
    g.restore();
  }

  drawFinaleSide(g, st) {
    // Big tag + whatever the finale needs at the side of each station.
    const lr = st.L.list;
    const F = this.finale;
    const cx = lr.x + lr.w / 2;
    if (!st.rating) {
      drawPortrait(g, st.p, cx, lr.y + lr.h * 0.3, Math.min(lr.w * 0.28, 90), { ring: st.p.color, ringWidth: 7, expr: 'happy' });
      ui.text(g, st.p.tag, cx, lr.y + lr.h * 0.3 + Math.min(lr.w * 0.28, 90) + 26, { size: 34, color: st.p.color, strokeWidth: 6 });
      if (F.stage === 'blow' && !st.out) {
        const frac = st.blow / st.blowNeed;
        ui.bar(g, cx - lr.w * 0.38, lr.y + lr.h * 0.66, lr.w * 0.76, 22, frac, '#7fd3ff');
        if (!st.p.isAI) ui.glyph(g, 'x', cx, lr.y + lr.h * 0.8, clamp(lr.w * 0.18, 34, 64), { pulse: true });
      } else if (F.stage === 'song' && !st.out && !st.p.isAI) {
        const fs = clamp(lr.w * 0.09, 18, 30);
        ui.text(g, 'Go up close', cx, lr.y + lr.h * 0.68, { size: fs, color: NAVY, stroke: false, weight: 800, maxWidth: lr.w - 16 });
        ui.hints(g, [['x', 'Blow!']], cx, lr.y + lr.h * 0.68 + fs * 1.8, { size: fs * 1.3 });
      } else if (st.out && F.stage !== 'feast') {
        ui.text(g, 'Poof!', cx, lr.y + lr.h * 0.72, { size: clamp(lr.w * 0.14, 24, 48), color: '#ffd23f' });
      }
    }
  }

  drawFinaleOverlay(g) {
    const F = this.finale, t = this.phaseT;
    const dim = F.stage === 'feast' ? Math.max(0, 0.32 - F.feastT * 0.3) : Math.min(0.32, t * 0.5);
    if (dim > 0.01) {
      g.save(); g.fillStyle = `rgba(30,10,60,${dim})`; g.fillRect(0, 0, W, H);
      // candle glows punch through the dark
      g.globalCompositeOperation = 'lighter';
      for (const st of this.stations) {
        const k = st.L.k, s = st.L.stand;
        for (const d of st.items) {
          if (!isCandle(d.kind) || !d.lit || d.out) continue;
          const x = s.x + d.x * k, y = s.y + (d.y - candleTop(d.kind) - 8) * k;
          const rr = 90 * k * (d.flame ?? 1);
          const gl = g.createRadialGradient(x, y, 1, x, y, rr);
          gl.addColorStop(0, `rgba(255,200,110,${dim * 1.1})`); gl.addColorStop(1, 'rgba(255,180,80,0)');
          g.fillStyle = gl; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
        }
      }
      g.restore();
    }
    let msg = null;
    if (F.stage === 'light') msg = 'Lighting the candles...';
    else if (F.stage === 'song') msg = '♪ Happy Birthday to you! ♪';
    else if (F.stage === 'blow') msg = this.players.some((p) => !p.isAI) ? 'Make a wish! Mash X to blow!' : 'Make a wish and blow!';
    else if (F.stage === 'feast' && F.feastT < 2.5 && !this.api.ended()) msg = 'Dig in!';
    if (msg) {
      const bw = ui.measure(g, msg, 54) + 90;
      g.save(); g.translate(W / 2, this.n === 1 ? 170 : H / 2); g.rotate(-0.02);
      ui.panel(g, -bw / 2, -44, bw, 88, { r: 44, fill: '#9b5cff' });
      ui.text(g, msg, 0, 2, { size: 54, weight: 800, color: '#fff' });
      // at 7.5 s a little magic puff blows out any candles still lit: show it coming
      const left = 7.5 - F.blowT;
      if (F.stage === 'blow' && left < 3 && left > 0 && this.stations.some((st) => !st.out)) {
        g.save(); g.translate(bw / 2 + 56, 0); g.rotate(0.02);
        g.fillStyle = '#fff8ec'; g.strokeStyle = NAVY; g.lineWidth = 5;
        g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.fill(); g.stroke();
        g.strokeStyle = '#9b5cff'; g.lineWidth = 8; g.lineCap = 'round';
        g.beginPath(); g.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + TAU * (left / 3)); g.stroke();
        ui.text(g, String(Math.ceil(left)), 0, 2, { size: 38, color: NAVY, stroke: false, weight: 800 });
        g.restore();
      }
      g.restore();
    }
  }
}

function c_release(p) { if (p.isAI) { p.ctrl.move(0, 0); p.ctrl.hold('a', false); } }

