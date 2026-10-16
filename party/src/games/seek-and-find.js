// Hide & Seek Picnic (Play Studio, cooperative I-spy). A busy scene hides
// creatures, treats and toys - and one of the players' own characters -
// behind bushes, trees, baskets and toys. The picture list along the bottom
// shows what to find (no reading needed). Everyone steers a magnifying glass
// (with a little zoom bubble) and presses A to spot things; finds sparkle and
// fly to the list. Wrong spots just get a friendly "hmm?" wobble. Y shows a
// hint ripple (3 per round), X makes the glass bigger, LB/RB zoom. Three
// scenes (meadow, toy shop, starry forest), then everyone waves from their
// hiding spots. Hiding spots, items and mirroring are random every time.
//
// CPUs look around slowly and only sometimes spot something (and never
// something a human's glass is already near), so the humans make most finds.
// With no humans (auto) they search properly so a round still ends.
import { W, H, view } from '../engine/canvas.js';
import { input } from '../engine/input.js';
import { Actor, drawPortrait } from '../engine/sprites.js';
import * as ui from '../engine/ui.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, hasSound } from '../engine/audio.js';
import { aiProfile, reactionTime } from '../engine/ai.js';
import { clamp, lerp, damp, rand, randInt, pick, chance, shuffle, ease, TAU, dist, later } from '../engine/util.js';
import { drawSparkleShape, drawStarShape, drawEmote } from '../engine/emotes.js';
import { THINGS, drawThing, thingWidth, SYNTH_FALLBACK } from './seek-and-find/things.js';
import { SCENES, buildScene } from './seek-and-find/scenes.js';
import { drawOccluder, occluderBox } from './seek-and-find/painters.js';

const NAVY = '#24163f';
// Resolution of the cached scene layers: the screen's own (capped at 1.5x)
// so the backdrop stays sharp on high-DPI screens; 1x elsewhere, where a
// scaled full-screen blit would cost a lot on software-rendered canvases.
const cacheScale = () => clamp(Math.round((view.scale || 1) * 4) / 4, 1, 1.5);
const MS = 0.5;            // resolution of the visibility mask
const PLAY = { x0: 50, y0: 128, x1: 1870, y1: 890 };   // where hidden things may show
const LEGEND = { x: 14, y: 912, w: 452, h: 156 };
const STRIP_Y = 918, STRIP_H = 150, CARD_W = 138, CARD_H = 124, CARD_GAP = 14;
const ZOOMS = [1.4, 1.75, 2.2];
const HINTS = 3;
const MAX_SPEED = 920;

const snd = (key, fallback, o) => { if (hasSound(key)) sfx(key, o); else if (fallback) sfx(fallback, o); };
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }

export const meta = {
  id: 'seek-and-find',
  title: 'Hide & Seek Picnic',
  category: 'studio',
  type: 'I spy · Together',
  goal: 'Find everything in the picture list! Move your magnifying glass and spot them.',
  controls: [['stick', 'Move your glass'], ['a', 'Spot it!'], ['y', 'Hint'], ['x', 'Big glass'], ['rb', 'Zoom']],
  infoAt: [62, 138],   // corner "i": under the round icons (the bottom-left holds the legend)
  tips: ['Look behind bushes, trees and toys!', 'Watch closely: hiding friends wiggle and blink.', 'Stuck? Press Y for a hint ripple.'],
  music: 'cozy',
  duration: '3-5 min',
  minPlayers: 1,
  maxPlayers: 8,
  countdown: false,
  drawIcon(g, x, y, w, h, t) {
    const sky = g.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, '#8fd8ff'); sky.addColorStop(0.55, '#e6f8ff'); sky.addColorStop(0.56, '#8fd86a'); sky.addColorStop(1, '#5cb845');
    g.fillStyle = sky; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    // blanket
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + w * 0.08, y + h * 0.78); g.lineTo(x + w * 0.5, y + h * 0.78); g.lineTo(x + w * 0.56, y + h); g.lineTo(x, y + h); g.fill();
    g.fillStyle = 'rgba(255,77,109,0.55)'; for (let i = 0; i < 5; i++) g.fillRect(x + i * w * 0.11, y + h * 0.78, w * 0.055, h * 0.22);
    // a bunny peeking over a bush
    const bx = x + w * 0.32, by = y + h * 0.72;
    drawThing(g, 'bunny', bx, by - h * 0.18, h * 0.42, t, { seed: 1 });
    g.fillStyle = '#4fae47'; g.strokeStyle = NAVY; g.lineWidth = Math.max(3, h * 0.03);
    g.beginPath(); for (const [cx, cy, r] of [[-0.12, 0, 0.11], [0, -0.05, 0.13], [0.12, 0, 0.11]]) { g.moveTo(bx + cx * w + r * h, by + cy * h); g.arc(bx + cx * w, by + cy * h, r * h, 0, TAU); }
    g.stroke(); g.fill();
    drawThing(g, 'ladybug', x + w * 0.16, y + h * 0.88, h * 0.12, t, { seed: 2 });
    // the magnifying glass
    const mx = x + w * 0.66 + Math.sin(t * 0.9) * w * 0.05, my = y + h * 0.42 + Math.cos(t * 1.1) * h * 0.04, r = h * 0.24;
    g.save(); g.translate(mx, my); g.rotate(0.75);
    g.fillStyle = NAVY; ui.roundRect(g, r * 0.9, -h * 0.05, r * 1.25, h * 0.1, h * 0.05); g.fill();
    g.fillStyle = '#ff6fb1'; ui.roundRect(g, r * 1.0, -h * 0.035, r * 1.1, h * 0.07, h * 0.035); g.fill();
    g.restore();
    g.fillStyle = 'rgba(220,245,255,0.55)'; g.beginPath(); g.arc(mx, my, r, 0, TAU); g.fill();
    drawThing(g, 'goldcupcake', mx, my + r * 0.05, r * 1.15, t, { seed: 3 });
    g.lineWidth = h * 0.05; g.strokeStyle = NAVY; g.stroke(); g.lineWidth = h * 0.03; g.strokeStyle = '#ffd23f'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(mx - r * 0.35, my - r * 0.4, r * 0.18, 0, TAU); g.fill();
    g.restore();
    for (let i = 0; i < 4; i++) {
      g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
      g.translate(x + w * (0.12 + i * 0.27), y + h * (0.15 + (i % 2) * 0.12)); drawSparkleShape(g, h * 0.08, '#ffffff'); g.restore();
    }
  },
};

const SCENE_ICON = ['sun', 'block', 'moon'];

export class Game {
  constructor(api) {
    this.api = api;
    this.players = api.players;
    this.n = this.players.length;
    this.t = 0;
    this.solo = this.n === 1;
    this.lensR = this.n > 4 ? 82 : 100;
    this.seekers = this.players.map((p, i) => {
      const k = this.n === 1 ? 0.5 : i / (this.n - 1);
      return {
        p, i, x: lerp(560, 1360, k), y: 500 + (i % 2) * 90, vx: 0, vy: 0, big: false, zoom: 1, bigK: 0,
        cool: 0, wobble: 0, hmm: 0, finds: 0, roundFinds: 0, bump: 0, glint: 0,
        ai: { mode: 'wander', tx: rand(300, 1600), ty: rand(200, 800), t: rand(0.5, 1.5), notice: rand(0.5, 1.5), item: null, wait: 0 },
      };
    });
    this.humanSeekers = this.seekers.filter((s) => !s.p.isAI);
    this.pointerSeeker = this.humanSeekers[0] || null;
    this.cheer = this.players.map((p) => {
      const a = new Actor(p, { scale: 1 });
      a.scale = 128 / a.char.members[0].h * (a.char.members.length > 1 ? 0.9 : 1);
      return a;
    });
    this.cs = cacheScale();
    this.bgC = makeCanvas(W * this.cs, H * this.cs);
    this.fgC = makeCanvas(W * this.cs, H * this.cs);
    this.maskC = makeCanvas(W * MS, H * MS);
    this.tmpC = makeCanvas(64, 64);
    this.round = 0;
    this.rounds = SCENES.length;
    this.finished = false;
    this.flyers = [];
    this.startRound(0);
  }

  // ---------------------------------------------------------------- rounds
  startRound(r) {
    this.round = r;
    const def = SCENES[r];
    this.layout = buildScene(def, chance(0.5), randInt(1, 9999));
    this.renderLayers();
    this.buildMask();
    this.items = [];
    this.cards = [];
    this.placed = [];
    for (const d of this.layout.decoys) this.placed.push({ x: d.x, y: d.y, r: d.h * 0.6 });
    this.planCards(def);
    this.placeAll();
    this.layoutCards();
    this.phase = 'intro'; this.phaseT = 0;
    this.hintsLeft = HINTS; this.hint = null;
    this.lastFindT = this.t; this.lastHumanFindT = this.t; this.autoHintT = 0;
    this.cpuFinds = 0;
    this.celebs = [];
    this.flyers = [];
    for (const s of this.seekers) { s.roundFinds = 0; s.cool = 0; s.ai.mode = 'wander'; s.ai.item = null; }
    sfx('whoosh');
  }

  /** Bake the static back (sky, ground, insides of baskets) and front (occluders) layers. */
  renderLayers() {
    for (const [c, layer] of [[this.bgC, 'back'], [this.fgC, 'front']]) {
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
      g.setTransform(this.cs, 0, 0, this.cs, 0, 0);
      if (layer === 'back') this.layout.paintBg(g);
      for (const oc of this.layout.occ) drawOccluder(g, oc, layer);
    }
  }

  /** Alpha of the front layer (plus the HUD) at mask resolution: what hides things. */
  buildMask() {
    const c = this.maskC, g = c.getContext('2d', { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.drawImage(this.fgC, 0, 0, c.width, c.height);
    this.mask = g.getImageData(0, 0, c.width, c.height).data;
    this.maskW = c.width; this.maskH = c.height;
  }

  planCards(def) {
    const pool = def.pool;
    const nCards = this.solo ? 5 : 6;
    const cards = [];
    const used = new Set();
    // 1. a "find 3" card
    const countId = pick(pool.count);
    used.add(countId);
    cards.push({ id: countId, need: 3, variant: randInt(0, 2) });
    // 2. one of the players' own characters, peeking out somewhere
    const order = [...this.humanSeekers, ...this.seekers.filter((s) => s.p.isAI)].map((s) => s.p);
    const friend = order[this.round % order.length];
    cards.push({ id: 'friend', who: friend, need: 1 });
    // 3. sometimes an NPC friend too
    const npcs = pool.npc.filter((id) => !(id === 'fellowfox' && this.players.some((p) => p.charId === 'felicity')));
    if (npcs.length && chance(0.55)) cards.push({ id: 'friend', who: pick(npcs), need: 1 });
    // 4. single things
    for (const id of shuffle(pool.single.slice())) {
      if (cards.length >= nCards) break;
      if (used.has(id)) continue;
      used.add(id);
      cards.push({ id, need: 1, variant: randInt(0, 2) });
    }
    this.cards = cards.map((c, i) => ({ ...c, i, got: 0, shown: 0, bump: 0, pop: 0, glow: 0, done: false, x: 0, y: 0 }));
  }

  placeAll() {
    // Big things (friends) first: they need the big spots.
    const queue = [];
    for (const c of this.cards) for (let k = 0; k < c.need; k++) queue.push({ card: c, k });
    queue.sort((a, b) => (b.card.id === 'friend') - (a.card.id === 'friend') || (b.card.need - a.card.need));
    for (const q of queue) {
      const it = this.makeItem(q.card, q.k);
      if (!this.placeItem(it)) {
        q.card.need--;          // nowhere good to hide it: the card asks for one fewer
        continue;
      }
      this.items.push(it);
    }
    this.cards = this.cards.filter((c) => c.need > 0);
    this.cards.forEach((c, i) => { c.i = i; });
  }

  makeItem(card, k) {
    if (card.id === 'friend') {
      const who = card.who;
      const actor = new Actor(who, { scale: 1 });
      const lead = actor.char.members[0];
      const group = actor.char.members.length > 1;
      actor.scale = (group ? 92 : 104) / lead.h;
      actor.setPose('crouch');
      return { kind: 'friend', id: 'friend', card, actor, h: actor.height, w: Math.max(actor.width, actor.height * 0.5), seed: rand(10), where: ['peek', 'ground'] };
    }
    const th = THINGS[card.id];
    const variant = card.variant || 0;   // the card shows the same colour
    const h = th.h * rand(0.92, 1.08);
    return { kind: 'thing', id: card.id, card, h, w: thingWidth(card.id, h, variant), variant, seed: rand(10), where: th.where };
  }

  /** Pick a hiding spot for `it` and slide it until the right amount shows. */
  placeItem(it) {
    const size = it.kind === 'friend' ? it.h * 0.9 : it.h;
    const big = it.kind === 'friend';
    let cands = this.layout.spots.filter((sp) => !sp.used && sp.size >= size && sp.tags.some((tg) => it.where.includes(tg))
      && sp.x > PLAY.x0 + 30 && sp.x < PLAY.x1 - 30 && sp.y > PLAY.y0 + 20 && sp.y < PLAY.y1 - 20
      && !(big && sp.layer === 'top'));
    const r0 = Math.max(it.w, it.h) * 0.5;
    const spread = (sp) => this.placed.reduce((m, o) => Math.min(m, dist(sp.x, sp.y, o.x, o.y) - o.r - r0), 1e9);
    cands = shuffle(cands).map((sp) => ({ sp, d: spread(sp) })).filter((c) => c.d > -r0 * 0.2);
    cands.sort((a, b) => b.d - a.d);
    // Prefer spread-out spots, but keep some randomness.
    const top = cands.slice(0, Math.max(3, Math.ceil(cands.length * 0.45)));
    const tries = shuffle(top).concat(cands.slice(top.length));
    for (const { sp } of tries) {
      const want = big ? rand(0.36, 0.52) : it.h < 36 ? rand(0.6, 0.82) : rand(0.45, 0.66);
      const res = this.solve(it, sp, want);
      if (!res) continue;
      it.x = res.x; it.y = res.y; it.vis = res.vis; it.layer = sp.layer; it.spot = sp;
      sp.used = true;
      // neighbouring spots of the same occluder would crowd it
      for (const o of this.layout.spots) if (o !== sp && o.oc && o.oc === sp.oc && dist(o.x, o.y, sp.x, sp.y) < 90) o.used = true;
      this.placed.push({ x: it.x, y: it.y, r: r0 });
      if (it.kind === 'friend') {
        it.actor.x = it.x; it.actor.y = it.y + it.h / 2; it.actor.facing = sp.dx < 0 ? -1 : sp.dx > 0 ? 1 : (chance(0.5) ? 1 : -1); it.actor.snap();
      }
      return true;
    }
    return false;
  }

  solve(it, sp, want) {
    if (sp.layer === 'top' || sp.t <= 0) {
      if (sp.x - it.w / 2 < PLAY.x0 || sp.x + it.w / 2 > PLAY.x1 || sp.y - it.h / 2 < PLAY.y0 || sp.y > PLAY.y1) return null;
      const v = this.measure(it, sp.x, sp.y);
      if (sp.layer !== 'top' && v.frac < 0.3) return null;
      return { x: sp.x, y: sp.y, vis: sp.layer === 'top' ? { ...v, frac: 1 } : v };
    }
    // Never slide out of the play area (or under the HUD).
    const inside = (x, y) => x - it.w / 2 >= PLAY.x0 && x + it.w / 2 <= PLAY.x1 && y - it.h / 2 >= PLAY.y0 && y + it.h * 0.3 <= PLAY.y1;
    let kMax = 1;
    while (kMax > 0 && !inside(sp.x + sp.dx * sp.t * kMax, sp.y + sp.dy * sp.t * kMax)) kMax -= 0.125;
    if (kMax <= 0 && !inside(sp.x, sp.y)) return null;
    const at = (k) => ({ x: sp.x + sp.dx * sp.t * k * kMax, y: sp.y + sp.dy * sp.t * k * kMax });
    let p0 = at(0), v0 = this.measure(it, p0.x, p0.y);
    if (v0.frac >= want) {
      if (v0.frac < want + 0.15) return { ...p0, vis: v0 };
      // Too easy where it starts: tuck it further in (backwards along the reveal direction).
      let best = v0.frac <= 0.92 ? { ...p0, vis: v0 } : null;
      const back = (k) => ({ x: sp.x - sp.dx * sp.t * k, y: sp.y - sp.dy * sp.t * k });
      let lo = 0, hi = 1;
      for (let i = 0; i < 5; i++) {
        const mid = (lo + hi) / 2, p = back(mid);
        if (!inside(p.x, p.y)) { hi = mid; continue; }
        const v = this.measure(it, p.x, p.y);
        if (v.frac < want) hi = mid; else { lo = mid; best = { ...p, vis: v }; }
      }
      return best;
    }
    const p1 = at(1), v1 = this.measure(it, p1.x, p1.y);
    if (v1.frac < want * 0.7) return v1.frac > 0.3 ? { ...p1, vis: v1 } : null;
    if (v1.frac < want) return { ...p1, vis: v1 };
    let lo = 0, hi = 1, best = { ...p1, vis: v1 };
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2, p = at(mid), v = this.measure(it, p.x, p.y);
      if (v.frac < want) lo = mid; else { hi = mid; best = { ...p, vis: v }; }
    }
    return best;
  }

  /** How much of `it` at (x, y) shows past the front layer: fraction, centroid, radius. */
  measure(it, x, y) {
    const pad = 1.4;
    const bw = Math.ceil(it.w * pad * MS) + 4, bh = Math.ceil(it.h * pad * MS) + 4;
    const bx = Math.floor(x * MS - bw / 2), by = Math.floor(y * MS - bh / 2);
    const c = this.tmpC;
    if (c.width < bw || c.height < bh) { c.width = Math.max(c.width, bw); c.height = Math.max(c.height, bh); }
    const g = c.getContext('2d', { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.setTransform(MS, 0, 0, MS, -bx, -by);
    this.drawItem(g, it, 0, { at: [x, y], still: true });
    const data = g.getImageData(0, 0, bw, bh).data;
    let total = 0, vis = 0, sx = 0, sy = 0;
    const M = this.mask, mw = this.maskW, mh = this.maskH;
    for (let j = 0; j < bh; j++) {
      const my = by + j;
      for (let i = 0; i < bw; i++) {
        if (data[(j * bw + i) * 4 + 3] < 110) continue;
        total++;
        const mx = bx + i;
        if (mx < 0 || my < 0 || mx >= mw || my >= mh) continue;
        if (M[(my * mw + mx) * 4 + 3] >= 128) continue;
        vis++; sx += mx; sy += my;
      }
    }
    if (!total) return { frac: 0, cx: x, cy: y, r: 10 };
    return { frac: vis / total, cx: vis ? (sx / vis + 0.5) / MS : x, cy: vis ? (sy / vis + 0.5) / MS : y, r: Math.sqrt(vis / Math.PI) / MS };
  }

  layoutCards() {
    const n = this.cards.length;
    const total = n * CARD_W + (n - 1) * CARD_GAP;
    const x0 = 960 - total / 2;
    this.strip = { x: x0 - 22, y: STRIP_Y, w: total + 44, h: STRIP_H };
    this.cards.forEach((c, i) => { c.x = x0 + i * (CARD_W + CARD_GAP) + CARD_W / 2; c.y = STRIP_Y + STRIP_H / 2 + 2; });
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    this.t += dt; this.phaseT += dt;
    const ph = this.phase;
    if (ph === 'intro' && this.phaseT > 1.9) { this.phase = 'seek'; this.phaseT = 0; }
    if (ph === 'seek') this.updateSeek(dt);
    if (ph === 'found' || ph === 'wipe') this.foundT = (this.foundT || 0) + dt;
    if (ph === 'found') {
      this.updateCelebs(dt);
      const last = this.round >= this.rounds - 1;
      if (last && this.phaseT > 5.2) this.finishGame();
      else if (!last && this.phaseT > 4.2) { this.phase = 'wipe'; this.phaseT = 0; sfx('whoosh'); }
    }
    if (ph === 'wipe') {
      this.updateCelebs(dt);
      if (this.phaseT > 0.55 && !this.wiped) { this.wiped = true; this.startRound(this.round + 1); this.phase = 'wipe-in'; this.phaseT = 0; }
    }
    if (this.phase === 'wipe-in' && this.phaseT > 0.55) { this.phase = 'intro'; this.phaseT = 0; this.wiped = false; }
    this.updateLenses(dt);
    this.updateItems(dt);
    this.updateFlyers(dt);
    for (const c of this.cards) { c.bump = Math.max(0, c.bump - dt * 3); c.glow = Math.max(0, c.glow - dt); c.pop = Math.min(1, c.pop + dt * 3); }
    if (this.hint) { this.hint.t += dt; if (this.hint.t > this.hint.dur || this.hint.item.found) this.hint = null; }
  }

  postUpdate(dt) {
    this.t += dt; this.phaseT += dt;
    this.updateCelebs(dt);
    this.updateItems(dt);
    this.updateFlyers(dt);
  }

  updateSeek(dt) {
    // Everything found: a short beat for the last one to land, then celebrate.
    if (this.items.every((i) => i.found)) {
      this.allFoundT = (this.allFoundT || 0) + dt;
      if (this.allFoundT > 0.9) { this.allFoundT = 0; this.roundDone(); return; }
    }
    // Pointer / touch: P1's glass follows the mouse; a click or tap spots right there.
    const ps = this.pointerSeeker, ptr = input.pointer;
    if (ps) {
      const hb = ui.clickedHint();
      if (hb) this.legendAction(ps, hb);
      else if (ptr.pressed && this.inScene(ptr.x, ptr.y)) { ps.x = ptr.x; ps.y = ptr.y; ps.vx = ps.vy = 0; this.spot(ps); }
      else if (ptr.moved && ptr.seen && this.inScene(ptr.x, ptr.y)) { ps.x = ptr.x; ps.y = ptr.y; ps.vx = ps.vy = 0; }
    }
    for (const s of this.seekers) {
      const c = s.p.ctrl;
      if (s.p.isAI) this.ai(s, dt);
      if (c.pressed('a')) this.spot(s);
      if (c.pressed('y')) this.useHint(s);
      if (c.pressed('x')) { s.big = !s.big; sfx(s.big ? 'grow' : 'shrink', { vol: 0.6 }); }
      if (c.pressed('rb')) this.setZoom(s, 1);
      if (c.pressed('lb')) this.setZoom(s, -1);
    }
    // Nobody has found anything for a while: a free little twinkle on something.
    if (this.t - this.lastFindT > 22) {
      this.autoHintT -= dt;
      if (this.autoHintT <= 0) {
        this.autoHintT = 3.2;
        const left = this.items.filter((it) => !it.found);
        if (left.length) {
          const it = pick(left);
          particles.burst(it.vis.cx, it.vis.cy, { type: 'sparkle', count: 5, colors: ['#ffffff', '#fff6a8'], speed: [20, 70] });
          it.card.glow = 0.8;
        }
      }
    }
  }

  legendAction(s, b) {
    if (b === 'y') this.useHint(s);
    else if (b === 'x') { s.big = !s.big; sfx(s.big ? 'grow' : 'shrink', { vol: 0.6 }); }
    else if (b === 'rb') this.setZoom(s, 1);
    else if (b === 'lb') this.setZoom(s, -1);
  }

  setZoom(s, d) {
    const z = clamp(s.zoom + d, 0, ZOOMS.length - 1);
    if (z === s.zoom) { s.wobble = 0.4; return; }
    s.zoom = z; sfx('swap', { vol: 0.7 });
  }

  inScene(x, y) {
    if (y < 100 || y > 1060) return false;
    if (x > LEGEND.x && x < LEGEND.x + LEGEND.w && y > LEGEND.y) return false;
    const st = this.strip;
    if (st && x > st.x && x < st.x + st.w && y > st.y) return false;
    return true;
  }

  updateLenses(dt) {
    for (const s of this.seekers) {
      const c = s.p.ctrl;
      s.cool = Math.max(0, s.cool - dt);
      s.wobble = Math.max(0, s.wobble - dt * 1.6);
      s.hmm = Math.max(0, s.hmm - dt);
      s.bump = Math.max(0, s.bump - dt * 2.5);
      s.glint = Math.max(0, s.glint - dt * 1.5);
      s.bigK = damp(s.bigK, s.big ? 1 : 0, 10, dt);
      const canMove = this.phase === 'seek' || this.phase === 'intro';
      const k = canMove ? Math.min(1, Math.hypot(c.x, c.y)) : 0;
      const sp = MAX_SPEED * (0.22 * k + 0.78 * k * k) * (1 - s.bigK * 0.1);
      const m = Math.hypot(c.x, c.y) || 1;
      const tvx = (c.x / m) * sp, tvy = (c.y / m) * sp;
      s.vx = damp(s.vx, tvx, 14, dt); s.vy = damp(s.vy, tvy, 14, dt);
      s.x = clamp(s.x + s.vx * dt, 40, W - 40);
      s.y = clamp(s.y + s.vy * dt, 110, 1040);
    }
  }

  /** A press of A: is something on the list right under the glass? */
  spot(s) {
    if (this.phase !== 'seek' || s.cool > 0) return;
    let best = null, bd = 1e9;
    for (const it of this.items) {
      if (it.found) continue;
      const d = dist(s.x, s.y, it.vis.cx, it.vis.cy);
      const reach = Math.max(58, it.vis.r + 40) * (1 + s.bigK * 0.2);
      if (d < reach && d < bd) { best = it; bd = d; }
    }
    if (best) { this.found(best, s); return; }
    // A friendly "hmm?" - nothing there.
    s.cool = 0.6; s.wobble = 1; s.hmm = 1.1;
    snd('rubber-bounce', 'bounce', { vol: 0.45 });
    s.p.ctrl.rumble(0.2, 80);
    for (const d of this.layout.decoys) if (dist(s.x, s.y, d.x, d.y) < d.h) d.wig = 1;
  }

  found(it, s) {
    it.found = true; it.finder = s;
    s.finds++; s.roundFinds++; s.bump = 1; s.glint = 1;
    if (s.p.isAI) this.cpuFinds++; else this.lastHumanFindT = this.t;
    this.lastFindT = this.t; this.autoHintT = 0;
    s.cool = 0.25;
    const card = it.card;
    card.got++;
    const th = THINGS[it.id];
    const x = it.vis.cx, y = it.vis.cy;
    particles.burst(x, y, { type: 'sparkle', count: 14, colors: ['#ffffff', '#fff6a8', s.p.color] });
    particles.burst(x, y, { type: 'star', count: 8, colors: ['#ffd23f', '#ffffff', s.p.color] });
    particles.ring(x, y, '#ffffff', 120, 0.4);
    s.p.ctrl.rumble(0.45, 140);
    if (it.kind === 'friend') {
      const a = it.actor;
      const oc = it.spot.oc;
      const toY = oc ? Math.min(PLAY.y1 + 20, oc.y + 16) : it.y + it.h / 2 + 10;
      const toX = clamp(it.x + (it.spot.dx || 0) * 50, 120, W - 120);
      it.out = { t: 0, fx: a.x, fy: a.y, tx: toX, ty: toY };
      a.setPose('idle'); a.playOnce('surprised', 0.45, 'wave');
      a.say(pick(['You found me!', 'Peekaboo!', 'Hee hee!']), 1.8, 'laugh');
      sfx('yay');
      card.shown++; card.bump = 1;
      later(() => sfx('star'), 200);
    } else {
      snd(th.sound, SYNTH_FALLBACK[th.sound] || 'correct');
      later(() => sfx('sparkle'), 90);
      const slot = card.got - 1;
      this.flyers.push({ id: it.id, variant: it.variant, seed: it.seed, fx: x, fy: y, h: it.h, card, slot, t: -0.18, dur: 0.7 });
    }
    if (it.kind !== 'friend') particles.popText(x, y - it.h * 0.6 - 10, s.p.isAI ? 'Found it!' : `${s.p.tag} found it!`, s.p.color, 34);
    if (card.got >= card.need) card.done = true;
  }

  useHint(s) {
    if (this.phase !== 'seek') return;
    if (this.hint) { s.wobble = 0.5; return; }
    if (this.hintsLeft <= 0) { sfx('back'); s.wobble = 0.7; return; }
    const left = this.items.filter((it) => !it.found);
    if (!left.length) return;
    // The thing furthest from every glass (the one nobody is looking at).
    left.sort((a, b) => this.nearestLens(b) - this.nearestLens(a));
    const it = chance(0.7) ? left[0] : pick(left);
    this.hintsLeft--;
    const a = rand(TAU), off = rand(10, 40);
    this.hint = { item: it, x: it.vis.cx + Math.cos(a) * off, y: it.vis.cy + Math.sin(a) * off, t: 0, dur: 4 };
    it.card.glow = 4; it.card.bump = 1;
    sfx('magic'); later(() => snd('wing-twinkle', 'sparkle', { vol: 0.7 }), 160);
  }

  nearestLens(it) { return this.seekers.reduce((m, s) => Math.min(m, dist(s.x, s.y, it.vis.cx, it.vis.cy)), 1e9); }

  roundDone() {
    if (this.phase !== 'seek') return;
    this.phase = 'found'; this.phaseT = 0;
    sfx('fanfare'); later(() => snd('applause', 'cheer'), 300);
    particles.confettiRain(W, 140);
    fx.flash('#ffffff', 0.15);
    // Everyone pops up from a hiding spot and waves.
    this.foundT = 0;
    const HIDES = ['bush', 'rock', 'basket', 'chest', 'presents', 'bigteddy', 'drum', 'fern', 'log'];
    const spots = shuffle(this.layout.occ.filter((oc) => {
      const [x0, y0, x1, y1] = occluderBox(oc);
      return HIDES.includes(oc.type) && y1 - y0 > 60 && (x0 + x1) / 2 > 140 && (x0 + x1) / 2 < W - 140 && y1 < 960 && y1 > 420;
    }));
    const used = [];
    this.celebs = this.cheer.map((a, i) => {
      let oc = spots.find((o) => !used.includes(o) && used.every((u) => Math.abs(u.x - o.x) > 200))
        || spots.find((o) => !used.includes(o)) || spots[i % Math.max(1, spots.length)];
      if (!oc) oc = { x: 300 + i * 200, y: 860, s: 1, type: 'bush', flip: 1 };
      used.push(oc);
      const [, y0, , y1] = occluderBox(oc);
      a.x = oc.x + rand(-20, 20); a.y = y1 - 4; a.facing = a.x < W / 2 ? 1 : -1; a.snap();
      // Rise until head and shoulders show over the top, feet still tucked behind it.
      const occH = (oc.type === 'chest' ? 0.55 : 1) * (y1 - y0);
      const zTop = clamp(occH - a.height * 0.4, 0, occH * 0.35);
      a.z = -a.height; a.setPose('wave');
      return { a, oc, base: y1 - 2, zTop, delay: 0.25 + i * 0.18, t: 0, p: this.players[i] };
    });
    for (const it of this.items) if (it.kind === 'friend' && it.out) it.actor.playOnce('celebrate', 2, 'wave');
  }

  updateCelebs(dt) {
    for (const c of this.celebs) {
      c.t += dt;
      const u = clamp((c.t - c.delay) / 0.45, 0, 1);
      c.a.z = lerp(-c.a.height * 1.05, c.zTop, ease.outBack(u));
      if (u > 0 && !c.popped) {
        c.popped = true;
        sfx('pop', { vol: 0.7 });
        c.a.emote('heart', 1.5);
        particles.burst(c.a.x, c.base - c.zTop - c.a.height * 0.6, { type: 'confetti', count: 10 });
      }
      c.a.update(dt);
    }
  }

  updateItems(dt) {
    for (const d of this.layout.decoys) d.wig = Math.max(0, (d.wig || 0) - dt * 1.5);
    for (const it of this.items) {
      if (it.kind !== 'friend') continue;
      const a = it.actor;
      if (it.out) {
        const o = it.out; o.t += dt;
        const u = clamp(o.t / 0.5, 0, 1);
        a.x = lerp(o.fx, o.tx, ease.outQuad(u)); a.y = lerp(o.fy, o.ty, u);
        a.z = Math.sin(u * Math.PI) * 70;
        if (u >= 1 && !o.landed) { o.landed = true; a.z = 0; a.squash(0.3); sfx('land', { vol: 0.5 }); }
      } else if (Math.random() < dt * 0.25 && !a._once) a.playOnce('look-around', 1.2, 'crouch');
      a.update(dt);
    }
  }

  updateFlyers(dt) {
    for (const f of this.flyers) {
      f.t += dt;
      if (f.t >= f.dur && !f.done) {
        f.done = true;
        f.card.shown++; f.card.bump = 1;
        sfx('collect', { step: f.card.shown * 2 });
        particles.burst(f.card.x, f.card.y - 10, { type: 'star', count: 8, colors: ['#ffd23f', '#ffffff'] });
        if (f.card.shown >= f.card.need) { later(() => sfx('star'), 120); particles.ring(f.card.x, f.card.y, '#7fe08a', 110, 0.45); }
      }
    }
    this.flyers = this.flyers.filter((f) => !f.done);
  }

  // ---------------------------------------------------------------- CPU
  ai(s, dt) {
    const p = s.p, c = p.ctrl, A = s.ai, lvl = clamp(p.aiLevel ?? 0, 0, 2), prof = aiProfile(p);
    const humans = this.humanSeekers.length > 0;
    const steerTo = (tx, ty, fast) => {
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      if (d < 6) { c.move(0, 0); return d; }
      const k = clamp(d / 160, 0.2, (fast ? 0.85 : 0.55) * prof.speed);
      const wob = Math.sin(this.t * 1.7 + s.i) * prof.aimError * 0.5;
      const a = Math.atan2(dy, dx) + wob;
      c.move(Math.cos(a) * k, Math.sin(a) * k);
      return d;
    };
    if (A.mode === 'go') {
      if (!A.item || A.item.found) { A.mode = 'wander'; A.t = rand(0.6, 1.4); return; }
      const d = steerTo(A.tx, A.ty, !humans);
      if (d < 14) {
        c.move(0, 0);
        A.wait -= dt;
        if (A.wait <= 0) { c.press('a'); A.mode = 'wander'; A.t = rand(1.2, 2.6); A.notice = rand(1, 2); }
      }
      return;
    }
    if (A.mode === 'oops') {
      const d = steerTo(A.tx, A.ty, false);
      if (d < 14) { c.move(0, 0); A.wait -= dt; if (A.wait <= 0) { c.press('a'); A.mode = 'wander'; A.t = rand(1, 2); } }
      return;
    }
    // Wander and look around, pausing now and then like someone peering at the picture.
    A.t -= dt;
    if (A.pause > 0) { A.pause -= dt; c.move(0, 0); }
    else {
      const d = steerTo(A.tx, A.ty, false);
      if (d < 30 || A.t <= 0) {
        A.pause = rand(0.4, 1.4);
        A.tx = clamp(s.x + rand(-520, 520), PLAY.x0 + 60, PLAY.x1 - 60); A.ty = clamp(s.y + rand(-300, 300), PLAY.y0 + 40, PLAY.y1 - 40);
        A.t = rand(2, 4);
      }
    }
    if (this.phase !== 'seek') return;
    A.notice -= dt;
    if (A.notice > 0) return;
    A.notice = 0.5;
    const left = this.items.filter((it) => !it.found);
    if (!left.length) return;
    const total = this.items.length;
    const stuck = this.t - this.lastHumanFindT > 35;
    if (humans && this.cpuFinds >= Math.ceil(total * 0.25) && !stuck) return;   // leave the rest for the kids
    const R = humans ? 240 : 430;
    const cands = left.filter((it) => dist(s.x, s.y, it.vis.cx, it.vis.cy) < R
      && !this.humanSeekers.some((h) => dist(h.x, h.y, it.vis.cx, it.vis.cy) < 260)
      // a kid's own hidden character is theirs to find
      && (stuck || !(it.kind === 'friend' && it.card.who && typeof it.card.who === 'object' && !it.card.who.isAI)));
    const rate = humans ? [0.05, 0.08, 0.12][lvl] * (stuck ? 2 : 1) : [0.22, 0.3, 0.4][lvl];
    if (cands.length && chance(rate)) {
      cands.sort((a, b) => dist(s.x, s.y, a.vis.cx, a.vis.cy) - dist(s.x, s.y, b.vis.cx, b.vis.cy));
      const it = cands[0];
      A.mode = 'go'; A.item = it;
      const err = prof.aimError * 30;
      A.tx = it.vis.cx + rand(-err, err); A.ty = it.vis.cy + rand(-err, err);
      A.wait = reactionTime(p);
    } else if (!humans && this.hint && chance(0.3)) {
      A.mode = 'go'; A.item = this.hint.item; A.tx = this.hint.item.vis.cx; A.ty = this.hint.item.vis.cy; A.wait = reactionTime(p);
    } else if (chance(prof.mistake * 0.12)) {
      // Oops: peers at a bush that has nothing behind it.
      const oc = pick(this.layout.occ);
      const [x0, y0, x1, y1] = occluderBox(oc);
      A.mode = 'oops'; A.tx = clamp((x0 + x1) / 2, PLAY.x0 + 40, PLAY.x1 - 40); A.ty = clamp(y0 + 20, PLAY.y0 + 20, PLAY.y1 - 20); A.wait = rand(0.3, 0.6);
    }
  }

  // ---------------------------------------------------------------- finish
  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const finds = this.seekers.map((s) => s.finds);
    // with kids playing, only a kid can be the Showstopper
    const elig = this.humanSeekers.length ? this.seekers.map((s, i) => (s.p.isAI ? -1 : finds[i])) : finds;
    const best = Math.max(...elig);
    const tops = elig.filter((f) => f === best).length;
    const highlight = this.n > 1 && best > 0 && tops === 1 ? elig.indexOf(best) : null;
    this.api.finish({
      showcase: true, highlight,
      stats: finds.map((f) => `${f} find${f === 1 ? '' : 's'}`),
      title: this.solo ? 'Super Seeker!' : 'Super Seekers!',
    });
  }

  onDone() { this.finishGame(); }

  // ---------------------------------------------------------------- drawing
  drawItem(g, it, t, o = {}) {
    const [x, y] = o.at || [it.x, it.y];
    if (it.kind === 'friend') {
      const a = it.actor;
      if (o.at) { const ox = a.x, oy = a.y; a.x = x; a.y = y + it.h / 2; a.snap(); a.draw(g, { shadow: false, emotes: false }); a.x = ox; a.y = oy; a.snap(); }
      else a.draw(g, { shadow: !!it.out, emotes: !!it.out });
      return;
    }
    drawThing(g, it.id, x, y, it.h, t, { seed: it.seed, variant: it.variant, still: o.still, mask: o.still });
  }

  /** The scene (optionally only `r`, a region, for the zoom bubbles). */
  drawWorld(g, r) {
    const t = this.t;
    if (r) {
      const sx = clamp(r.x, 0, W), sy = clamp(r.y, 0, H), ex = clamp(r.x + r.w, 0, W), ey = clamp(r.y + r.h, 0, H);
      if (ex - sx > 1 && ey - sy > 1) g.drawImage(this.bgC, sx * this.cs, sy * this.cs, (ex - sx) * this.cs, (ey - sy) * this.cs, sx, sy, ex - sx, ey - sy);
    } else g.drawImage(this.bgC, 0, 0, W, H);
    this.layout.ambient(g, t);
    const near = (x, y, m) => !r || (x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m);
    for (const d of this.layout.decoys) {
      if (!near(d.x, d.y, d.h)) continue;
      g.save(); g.translate(d.x, d.y); g.rotate(Math.sin(t * 30) * 0.12 * (d.wig || 0));
      drawThing(g, d.id, 0, 0, d.h, t, { seed: d.seed, still: true });
      g.restore();
    }
    for (const it of this.items) if (!it.found && it.layer !== 'top' && near(it.x, it.y, it.h)) this.drawItem(g, it, t);
    for (const c of this.celebs) if (c.t > c.delay && near(c.a.x, c.base - c.a.height, c.a.height * 1.6)) {
      g.save(); g.beginPath(); g.rect(0, 0, W, c.base); g.clip(); c.a.draw(g, { shadow: false }); g.restore();
    }
    if (r) {
      const sx = clamp(r.x, 0, W), sy = clamp(r.y, 0, H), ex = clamp(r.x + r.w, 0, W), ey = clamp(r.y + r.h, 0, H);
      if (ex - sx > 1 && ey - sy > 1) g.drawImage(this.fgC, sx * this.cs, sy * this.cs, (ex - sx) * this.cs, (ey - sy) * this.cs, sx, sy, ex - sx, ey - sy);
    } else g.drawImage(this.fgC, 0, 0, W, H);
    for (const it of this.items) if (!it.found && it.layer === 'top' && near(it.x, it.y, it.h)) this.drawItem(g, it, t);
    for (const it of this.items) if (it.found && it.kind === 'friend' && near(it.actor.x, it.actor.y - it.h / 2, it.h * 1.5)) this.drawItem(g, it, t);
  }

  draw(g) {
    this.drawWorld(g, null);
    this.drawHint(g);
    // CPU glasses under the humans'
    const order = this.seekers.slice().sort((a, b) => (b.p.isAI - a.p.isAI) || (b.i - a.i));
    if (this.phase === 'seek' || this.phase === 'intro') for (const s of order) this.drawLens(g, s);
    this.drawHUD2(g);
    this.drawFlyers(g);
    this.drawBanners(g);
  }

  drawHint(g) {
    const h = this.hint;
    if (!h) return;
    const k = Math.min(1, h.t / 0.3) * Math.min(1, (h.dur - h.t) / 0.6);
    g.save();
    const gl = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, 120);
    gl.addColorStop(0, `rgba(255,246,168,${0.35 * k})`); gl.addColorStop(1, 'rgba(255,246,168,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(h.x, h.y, 120, 0, TAU); g.fill();
    for (let i = 0; i < 3; i++) {
      const u = ((h.t * 0.8 + i / 3) % 1);
      g.globalAlpha = k * (1 - u) * 0.9;
      g.lineWidth = 6 * (1 - u) + 2; g.strokeStyle = '#ffffff';
      g.beginPath(); g.ellipse(h.x, h.y, 30 + u * 130, (30 + u * 130) * 0.8, 0, 0, TAU); g.stroke();
    }
    g.restore();
  }

  drawLens(g, s) {
    const p = s.p, t = this.t;
    const R = this.lensR * (1 + s.bigK * 0.65);
    const z = ZOOMS[s.zoom] * (1 + s.bigK * 0.1);
    const wob = s.wobble > 0 ? Math.sin(s.wobble * 26) * 0.2 * s.wobble : 0;
    const x = s.x, y = s.y;
    // magnified view
    g.save();
    g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip();
    g.fillStyle = '#ffffff'; g.fillRect(x - R, y - R, R * 2, R * 2);
    g.translate(x, y); g.scale(z, z); g.translate(-x, -y);
    this.drawWorld(g, { x: x - R / z, y: y - R / z, w: (2 * R) / z, h: (2 * R) / z });
    g.restore();
    g.save();
    g.translate(x, y); g.rotate(wob);
    // glass sheen
    const sh = g.createRadialGradient(-R * 0.4, -R * 0.45, 2, 0, 0, R);
    sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.45, 'rgba(255,255,255,0.05)'); sh.addColorStop(1, 'rgba(160,220,255,0.18)');
    g.fillStyle = sh; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    if (s.cool > 0.3) { g.fillStyle = 'rgba(36,22,63,0.12)'; g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, R * 0.78, Math.PI * 1.1, Math.PI * 1.4); g.stroke();
    // handle (down-right)
    g.save(); g.rotate(0.78);
    g.fillStyle = NAVY; ui.roundRect(g, R + 2, -15, 86, 30, 15); g.fill();
    g.fillStyle = p.color; ui.roundRect(g, R + 8, -10, 74, 20, 10); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; ui.roundRect(g, R + 14, -7, 40, 6, 3); g.fill();
    g.restore();
    // rim
    g.lineWidth = 18; g.strokeStyle = NAVY; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.lineWidth = 11; g.strokeStyle = p.color; g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(0, 0, R + 2, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
    if (s.glint > 0) { g.globalAlpha = s.glint; g.lineWidth = 6; g.strokeStyle = '#fff6a8'; g.beginPath(); g.arc(0, 0, R + 10 + (1 - s.glint) * 30, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    // aim dot
    g.save(); g.globalAlpha = 0.75; drawSparkleShape(g, 22, '#ffffff'); g.restore();
    g.lineWidth = 2; g.strokeStyle = 'rgba(36,22,63,0.5)'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.stroke();
    g.restore();
    // tag at the end of the handle
    const hx = x + Math.cos(0.78) * (R + 96), hy = y + Math.sin(0.78) * (R + 96);
    const label = p.isAI ? 'CPU' : p.tag;
    g.save(); g.translate(hx, hy + Math.sin(t * 3 + s.i) * 2);
    const tw = ui.measure(g, label, 22, 800) + 20;
    g.fillStyle = p.color; g.strokeStyle = NAVY; g.lineWidth = 4; ui.roundRect(g, -tw / 2, -16, tw, 32, 14); g.fill(); g.stroke();
    ui.text(g, label, 0, 1, { size: 22, color: '#fff', strokeWidth: 5, shadow: false, weight: 800 });
    g.restore();
    if (s.hmm > 0) drawEmote(g, 'question', x + R * 0.75, y - R * 0.85, 52, 1.1 - s.hmm);
  }

  drawFlyers(g) {
    for (const f of this.flyers) {
      if (f.t < 0) {
        // a quick happy pop in place before flying off
        const k = 1 + Math.sin((f.t + 0.18) / 0.18 * Math.PI) * 0.35;
        drawThing(g, f.id, f.fx, f.fy, f.h * k, this.t, { seed: f.seed, variant: f.variant });
        continue;
      }
      const u = ease.inOutQuad(clamp(f.t / f.dur, 0, 1));
      const [tx, ty, th] = this.slotPos(f.card, f.slot);
      const x = lerp(f.fx, tx, u), y = lerp(f.fy, ty, u) - Math.sin(u * Math.PI) * 160;
      const h = lerp(f.h * 1.3, th, u);
      g.save(); g.translate(x, y); g.rotate(Math.sin(u * Math.PI) * 0.5);
      drawThing(g, f.id, 0, 0, h, this.t, { seed: f.seed, variant: f.variant });
      g.restore();
      if (Math.random() < 0.6) particles.trail(x, y, { type: 'sparkle', colors: ['#ffffff', '#ffe066'] });
    }
  }

  /** Where a found thing lands on its card: [x, y, size]. */
  slotPos(c, k) {
    if (c.need === 1) return [c.x, c.y - 4, 74];
    const sw = 38, x0 = c.x - (c.need - 1) * sw / 2;
    return [x0 + k * sw, c.y + 38, 30];
  }

  drawHUD2(g) {
    this.drawChips(g);
    this.drawRounds(g);
    this.drawStrip(g);
    this.drawLegend(g);
  }

  drawChips(g) {
    const n = this.n;
    const cw = n > 4 ? 150 : 176, gap = 12;
    const total = n * cw + (n - 1) * gap;
    let x = W / 2 - total / 2;
    const y = 14;
    for (const s of this.seekers) {
      const p = s.p, b = 1 + s.bump * 0.18;
      g.save(); g.translate(x + cw / 2, y + 34); g.scale(b, b);
      ui.panel(g, -cw / 2, -32, cw, 64, { r: 32, fill: '#ffffff', stroke: p.color, lineWidth: 5 });
      drawPortrait(g, p, -cw / 2 + 32, 0, 24, { expr: s.bump > 0.2 ? 'happy' : 'neutral' });
      ui.text(g, p.isAI ? 'CPU' : p.tag, -cw / 2 + 62, -13, { size: 17, color: p.color, align: 'left', strokeWidth: 4, weight: 800 });
      // magnifier mini icon + count
      g.save(); g.translate(-cw / 2 + 72, 13); g.lineWidth = 3; g.strokeStyle = NAVY;
      g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fillStyle = '#dff4ff'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(6, 6); g.lineTo(12, 12); g.lineWidth = 4; g.stroke(); g.restore();
      ui.text(g, String(s.finds), cw / 2 - 18, 8, { size: n > 4 ? 32 : 38, color: NAVY, align: 'right', stroke: false, weight: 800 });
      g.restore();
      x += cw + gap;
    }
  }

  drawRounds(g) {
    ui.panel(g, 10, 12, 66 * this.rounds + 10, 72, { r: 36, fill: 'rgba(255,255,255,0.75)', stroke: false, shadow: false });
    for (let i = 0; i < this.rounds; i++) {
      const cur = i === this.round, done = i < this.round || (cur && (this.phase === 'found' || this.phase === 'wipe'));
      const x = 46 + i * 66, y = 48, r = cur ? 28 : 22;
      g.save(); g.translate(x, y);
      g.beginPath(); g.arc(0, 0, r, 0, TAU);
      g.fillStyle = done ? '#fff3b8' : cur ? '#ffffff' : '#ece6f5'; g.fill();
      g.lineWidth = cur ? 5 : 3.5; g.strokeStyle = NAVY; g.stroke();
      const k = r / 28;
      g.scale(k, k);
      drawSceneIcon(g, SCENE_ICON[i]);
      g.restore();
      if (done) { g.save(); g.translate(x + r * 0.7, y + r * 0.7); drawStarShape(g, 22, '#ffd23f'); g.restore(); }
    }
  }

  drawStrip(g) {
    const st = this.strip;
    const k = this.phase === 'intro' ? ease.outBack(clamp(this.phaseT / 0.5, 0, 1)) : 1;
    g.save(); g.translate(0, (1 - k) * 200);
    ui.panel(g, st.x, st.y, st.w, st.h, { r: 30, fill: 'rgba(255,248,236,0.95)', stroke: NAVY, lineWidth: 5 });
    for (const c of this.cards) {
      const delay = this.phase === 'intro' ? c.i * 0.16 + 0.25 : -1;
      if (this.phase === 'intro' && this.phaseT < delay) continue;
      if (this.phase === 'intro' && !c.introSfx) { c.introSfx = true; sfx('collect', { step: c.i * 2, vol: 0.7 }); }
      const pk = this.phase === 'intro' ? ease.outBack(clamp((this.phaseT - delay) / 0.3, 0, 1)) : 1;
      this.drawCard(g, c, pk);
    }
    g.restore();
  }

  drawCard(g, c, pk) {
    const t = this.t, done = c.shown >= c.need;
    const sc = pk * (1 + c.bump * 0.12 + (c.glow > 0 ? Math.sin(t * 8) * 0.04 : 0));
    g.save(); g.translate(c.x, c.y); g.scale(sc, sc);
    if (c.glow > 0) {
      g.save(); g.globalAlpha = Math.min(1, c.glow) * (0.6 + 0.4 * Math.sin(t * 8));
      g.fillStyle = '#fff6a8'; ui.roundRect(g, -CARD_W / 2 - 9, -CARD_H / 2 - 9, CARD_W + 18, CARD_H + 18, 26); g.fill(); g.restore();
    }
    ui.panel(g, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, { r: 20, fill: done ? '#d4f7d8' : '#ffffff', stroke: done ? '#36d17a' : NAVY, lineWidth: done ? 6 : 4, shadow: false });
    const multi = c.need > 1;
    const ph = multi ? 58 : 80, py = multi ? -18 : -2;
    g.save();
    if (done) g.globalAlpha = 0.95;
    if (c.id === 'friend') {
      drawPortrait(g, c.who, 0, py, 40, { expr: done ? 'happy' : 'neutral', ring: done ? '#36d17a' : '#ffffff', ringWidth: 4 });
      if (!done) { g.save(); g.translate(30, 30); drawEmote(g, 'question', 0, 0, 34, t); g.restore(); }
    } else {
      drawThing(g, c.id, 0, py, ph, t * 0.6, { seed: c.i, variant: c.variant });
      const owner = THINGS[c.id].owner;
      if (owner) drawPortrait(g, owner, CARD_W / 2 - 24, -CARD_H / 2 + 24, 18);
    }
    g.restore();
    if (multi) {
      // little slots that fill up as each one is found
      for (let k = 0; k < c.need; k++) {
        const [sx, sy] = this.slotPos({ ...c, x: 0, y: 0 }, k);
        g.beginPath(); g.arc(sx, sy, 16, 0, TAU);
        g.fillStyle = k < c.shown ? '#fff6a8' : 'rgba(36,22,63,0.08)'; g.fill();
        g.lineWidth = 2.5; g.strokeStyle = 'rgba(36,22,63,0.45)'; g.setLineDash(k < c.shown ? [] : [5, 4]); g.stroke(); g.setLineDash([]);
        if (k < c.shown) drawThing(g, c.id, sx, sy, 26, t, { seed: k, variant: c.variant });
      }
    }
    if (done) {
      g.save(); g.translate(CARD_W / 2 - 14, -CARD_H / 2 + 14);
      g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fillStyle = '#36d17a'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = NAVY; g.stroke();
      g.beginPath(); g.moveTo(-8, 0); g.lineTo(-2, 7); g.lineTo(9, -7); g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
      g.restore();
    }
    g.restore();
  }

  drawLegend(g) {
    const L = LEGEND;
    ui.panel(g, L.x, L.y, L.w, L.h, { r: 24, fill: 'rgba(36,22,63,0.78)', stroke: '#ffffff', lineWidth: 4 });
    const c1 = L.x + 22, c2 = L.x + 238, r1 = L.y + 34, r2 = L.y + 80, r3 = L.y + 124;
    const opt = { size: 32, align: 'left', color: '#ffffff' };
    ui.hints(g, [['stick', 'Look']], c1, r1, opt);
    ui.hints(g, [['a', 'Spot!']], c2, r1, opt);
    ui.hints(g, [['y', 'Hint']], c1, r2, opt);
    for (let i = 0; i < HINTS; i++) {
      g.save(); g.translate(c1 + 130 + i * 24, r2); g.globalAlpha = i < this.hintsLeft ? 1 : 0.25;
      drawStarShape(g, 22, '#ffd23f'); g.restore();
    }
    ui.hints(g, [['x', 'Big glass']], c2, r2, opt);
    ui.hints(g, [['lb', ''], ['rb', 'Zoom']], c1, r3, { ...opt, gap: 10 });
  }

  drawBanners(g) {
    const ph = this.phase;
    if (ph === 'intro') {
      const def = SCENES[this.round];
      const a = clamp((1.9 - this.phaseT) / 0.3, 0, 1);
      g.save(); g.globalAlpha = a;
      ui.banner(g, def.name, this.phaseT, { size: 110, y: 430, color: '#ffe066' });
      if (this.phaseT > 0.35) ui.banner(g, `Round ${this.round + 1} of ${this.rounds}`, this.phaseT - 0.35, { size: 48, y: 530, color: '#ffffff', strokeWidth: 12 });
      g.restore();
    }
    if (ph === 'found' || ph === 'wipe') {
      const last = this.round >= this.rounds - 1;
      const str = last ? (this.solo ? 'You found it all!' : 'We found it all!') : (this.solo ? 'You found everything!' : 'We found everything!');
      const ft = this.foundT || 0;
      ui.banner(g, str, ft, { size: 100, y: 300, color: '#ffe066' });
      if (last && ft > 1.2) {
        for (let i = 0; i < 3; i++) {
          const pt = clamp((ft - 1.2 - i * 0.3) / 0.3, 0, 1);
          if (pt <= 0) continue;
          if (!this['st' + i]) { this['st' + i] = true; sfx('collect', { step: i * 4 }); }
          g.save(); g.translate(W / 2 + (i - 1) * 130, 430); g.scale(ease.outBack(pt), ease.outBack(pt)); g.rotate(Math.sin(this.t * 2 + i) * 0.1);
          drawStarShape(g, 100, '#ffd23f'); g.restore();
        }
      }
    }
    // iris wipe between scenes
    if (ph === 'wipe' || ph === 'wipe-in') {
      const u = ph === 'wipe' ? clamp(this.phaseT / 0.55, 0, 1) : 1 - clamp(this.phaseT / 0.55, 0, 1);
      const r = (1 - ease.inOutQuad(u)) * 1150;
      g.save(); g.fillStyle = '#fff3e0';
      g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H / 2, Math.max(0.1, r), 0, TAU, true); g.fill('evenodd');
      g.lineWidth = 10; g.strokeStyle = NAVY; g.beginPath(); g.arc(W / 2, H / 2, Math.max(0.1, r), 0, TAU); if (r > 2) g.stroke();
      g.restore();
    }
  }
}

function drawSceneIcon(g, kind) {
  g.lineWidth = 3; g.strokeStyle = NAVY;
  if (kind === 'sun') {
    g.strokeStyle = '#ffb703'; g.lineWidth = 4;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.beginPath(); g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = NAVY; g.stroke();
  } else if (kind === 'block') {
    g.beginPath(); g.rect(-13, -13, 26, 26); g.fillStyle = '#ff6b8b'; g.fill(); g.stroke();
    g.save(); starPath(g, 9); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 2; g.stroke(); g.restore();
  } else {
    g.save(); g.beginPath(); g.arc(-2, 0, 15, 0, TAU); g.arc(6, -5, 13, 0, TAU, true); g.fillStyle = '#ffe680'; g.fill('evenodd'); g.lineWidth = 2.5; g.stroke(); g.restore();
    g.save(); g.translate(10, 8); drawStarShape(g, 10, '#ffffff'); g.restore();
  }
}
function starPath(g, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); }
