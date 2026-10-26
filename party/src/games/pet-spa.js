// Pet Spa (Play Studio): every player gets an animal friend at their own spa
// station. The pet arrives muddy and sad; scrub, rinse, towel, brush, add
// bows and give a treat until the happiness meter fills and the pet
// celebrates. X (held) uses the tool: the sponge scrubs, the shower rinses,
// the towel dries, the brush fluffs; a tap of X puts a bow on / moves one,
// or gives a treat (staying on Treat for more). A means "this step is done,
// go on" (on Treat it gives a treat as it goes on): when the step is
// finished A moves to the next step's tool (all done: Done), and when it
// isn't, the pet says what's left ("Fox still needs more rinsing! (hold X to
// rinse)") and nothing moves on. Bows are optional, so A there just goes on.
// LB / RB pick the tool; the last one is Done, where A says "my pet is ready"
// (B: not yet). D-pad up / down or LT / RT pick a bow. B cuddles; on Bows
// B takes off the bow under the hand, else undoes the newest one (a cuddle
// only when there are no bows). Once every pet is
// ready: a pet parade on a little stage.
//
// Pets are drawn with the normal Actor system. Mud, suds, water drops and
// accessories are drawn in the pet's *image space* through an attachment, so
// they ride every bounce and squash (and the mud is masked to the pet's own
// silhouette).
//
// Drawing lives in pet-spa/draw.js (SpaView, which Game extends); shared data in pet-spa/data.js.
import { W, H } from '../engine/canvas.js';
import { Actor, getBaseImage } from '../engine/sprites.js';
import { particles } from '../engine/particles.js';
import { fx } from '../engine/fx.js';
import { sfx, voice, hasSound } from '../engine/audio.js';
import { aiProfile, reactionTime, steer } from '../engine/ai.js';
import { clamp, damp, rand, randInt, pick, chance, shuffle, TAU, later, showstopper } from '../engine/util.js';
import { SPRAY_LEN, TOOLS, TOOL_IDX, ACCESSORIES } from './pet-spa/data.js';
import { SpaView } from './pet-spa/draw.js';
import { meta } from './pet-spa.meta.js';


/** Play a recorded sound when it exists, else a synth stand-in. */
function snd(key, fallback, opts) { if (hasSound(key)) sfx(key, opts); else if (fallback) sfx(fallback, opts); }
// The spa clock (Play Studio, shown all along): at 0 it asks "Time's up!"
// (Keep playing = +1 min, All done = every pet is made show-ready for the parade).
const SPA_TIME = 180, SPA_MORE = 60;
const NEARLY_T = 1.5;
const WATER_REACH = 440;    // how far the shower's drops fall (screen px; particles aren't station-scaled)
const DONE = TOOLS.length;  // the last tool slot: "Done" (A there = my pet is ready for the parade)       // a step with only a tiny bit left finishes itself after this long

// ---------------------------------------------------------------------------
// Pets. Fellowfox normally follows Felicity, so it gets a one-member entry
// built here (same base art, no game-wide data change needed).
const PETS = [
  { id: 'fox', name: 'Fox', char: 'fox' },
  { id: 'fellowfox', name: 'Fellowfox', char: 'fellowfox' },
  { id: 'cotton-candy', name: 'Cotton Candy', char: 'cotton-candy' },
  { id: 'unicorn', name: 'Unicorn', char: 'unicorn' },
  { id: 'hotdog', name: 'Hotdog', char: 'hotdog' },
];

function makePetActor(def) { return new Actor(def.char); }

// Alpha mask of a pet's base art (quarter resolution) for "is the cursor on
// the pet?" tests and for placing mud on the body.
const maskCache = new Map();
function petMask(asset) {
  if (maskCache.has(asset)) return maskCache.get(asset);
  const img = getBaseImage(asset);
  const iw = img ? img.width : 400, ih = img ? img.height : 400, D = 4;
  const mw = Math.ceil(iw / D), mh = Math.ceil(ih / D);
  const a = new Uint8Array(mw * mh);
  let ok = false;
  if (img) {
    try {
      const c = document.createElement('canvas'); c.width = mw; c.height = mh;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, mw, mh);
      const d = x.getImageData(0, 0, mw, mh).data;
      for (let i = 0; i < mw * mh; i++) a[i] = d[i * 4 + 3];
      ok = true;
    } catch (e) { ok = false; }
  }
  if (!ok) { // ellipse fallback
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const nx = (x / mw - 0.5) / 0.45, ny = (y / mh - 0.55) / 0.42;
      a[y * mw + x] = nx * nx + ny * ny < 1 ? 255 : 0;
    }
  }
  const pts = [];
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (a[y * mw + x] > 200) pts.push([(x + 0.5) * D, (y + 0.5) * D]);
  const m = {
    iw, ih, img, pts,
    at(ix, iy) {
      const x = Math.floor(ix / D), y = Math.floor(iy / D);
      if (x < 0 || y < 0 || x >= mw || y >= mh) return 0;
      return a[y * mw + x];
    },
    near(ix, iy, r) { // any opaque pixel within r (image px)
      for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) {
        if (this.at(ix + dx, iy + dy) > 120) return true;
      }
      return false;
    },
  };
  maskCache.set(asset, m);
  return m;
}

// (tools and accessories: pet-spa/data.js; their drawing: pet-spa/draw.js)

export { meta };

export class Game extends SpaView {
  constructor(api) {
    super();
    this.api = api;
    this.players = api.players;
    this.t = 0;
    this.phase = 'spa';      // spa -> parade
    this.phaseT = 0;
    this.allDoneT = 0;
    this.spaLeft = SPA_TIME;
    api.limit(() => (this.phase === 'spa' ? this.spaLeft : null), {
      showAt: Infinity, x: W / 2 + 480, y: 54,
      timeUp: { more: () => { this.spaLeft += SPA_MORE; }, done: () => this.startParade() },
    });
    this.finished = false;
    this.bubbles = Array.from({ length: 24 }, () => ({ x: rand(W), y: rand(H), r: rand(6, 22), sp: rand(20, 60), ph: rand(TAU) }));
    this.flying = [];        // treats and squeaky ducks in flight (screen space)
    const n = this.players.length;
    this.layoutStations(n);
    // Assign pets: all five before repeats, avoiding a player's own character.
    const order = shuffle(PETS);
    const count = new Map();
    this.stations = this.players.map((p, i) => {
      const uses = (d) => count.get(d.id) || 0;
      const cands = order.filter((d) => d.char !== p.charId);
      const def = cands.reduce((best, d) => (uses(d) < uses(best) ? d : best), cands[0]);
      count.set(def.id, uses(def) + 1);
      return this.makeStation(p, i, def);
    });
    this.banner = { text: 'Bath time!', t: 0 };
    sfx('magic');
  }

  layoutStations(n) {
    const top = 104, bottom = H - 16, gap = 18;
    const rows = n <= 4 ? 1 : 2;
    const perRow = rows === 1 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const cols = perRow[0];
    const sh = (bottom - top - gap * (rows - 1)) / rows;
    let sw = (W - 32 - gap * (cols - 1)) / cols;
    if (n === 1) sw = 1180;
    if (n === 2) sw = Math.min(sw, 900);
    this.rects = [];
    perRow.forEach((cnt, r) => {
      const total = cnt * sw + (cnt - 1) * gap;
      for (let c = 0; c < cnt; c++) this.rects.push({ x: (W - total) / 2 + c * (sw + gap), y: top + r * (sh + gap), w: sw, h: sh });
    });
  }

  makeStation(p, i, def) {
    const r = this.rects[i];
    const compact = r.h < 600;
    const s = {
      p, i, r, compact,
      headerH: compact ? 74 : 96,
      toolH: compact ? 62 : 84,
      k: Math.min(1.25, Math.max(0.6, Math.min(r.w / 460, r.h / 700))),
      cursor: { x: 0, y: 0, px: 0, py: 0, speed: 0 },
      tool: 0, accIdx: randInt(0, ACCESSORIES.length - 1),
      held: null, hover: null, accPop: 0,   // bow being moved / bow under the hand
      done: false, doneT: 0, ready: false, readyT: 0, happy: 0, happyTarget: 0, care: 0,
      treats: 0, cuddles: 0, toys: 0,
      shakeT: 0, jumpT: -1, useT: 0, sfxT: 0, giggleT: 2, cooldown: 0, sparkleT: 0, dripT: 0,
      events: {}, toolPop: 0,
      ai: p.isAI ? { t: rand(0.6, 1.4), target: null, distract: rand(4, 9), idleT: 0 } : null,
    };
    // Pedestal and characters.
    s.ped = { x: r.x + r.w * 0.57, y: r.y + r.h - s.toolH - (compact ? 26 : r.h * 0.12) };
    s.char = new Actor(p, { x: r.x + r.w * (r.w < 520 ? 0.15 : 0.14), y: s.ped.y + (compact ? 6 : r.h * 0.07) });
    const ch = s.char;
    ch.scale = clamp((r.h * (compact ? 0.3 : 0.26)) / ch.leader.h, 0.38, 1.4);
    ch.facing = 1;
    // Keep wide characters and followers (Fellowfox, the KPop trio) inside
    // their own station instead of spilling into the neighbor's.
    let left = 0;
    for (const m of ch.char.members) {
      const img = getBaseImage(m.asset);
      const w = img ? (img.width / img.height) * m.h : m.h * 0.6;
      left = Math.max(left, (w / 2 - m.dx) * ch.scale);
    }
    ch.x = Math.max(ch.x, r.x + left + 10);
    ch.snap();
    this.rebuildPet(s, def);
    s.cursor.x = s.cursor.px = s.ped.x + r.w * 0.05;
    s.cursor.y = s.cursor.py = s.ped.y - s.pet.height * 0.55;
    return s;
  }

  rebuildPet(s, def) {
    s.def = def;
    const pet = makePetActor(def);
    const r = s.r;
    const maxH = (s.ped.y - (r.y + s.headerH + 34)) * 0.95;
    const maxW = r.w * (r.w < 520 ? 0.62 : 0.56);
    const w1 = pet.width / pet.scale;
    pet.scale = Math.min(maxH / pet.leader.h, maxW / w1, 3.2);
    pet.x = s.ped.x; pet.y = s.ped.y; pet.facing = 1;
    pet.snap();
    pet.setPose('sad');
    s.pet = pet;
    s.mask = petMask(pet.leader.asset);
    this.makeMud(s);
    s.suds = []; s.sudsPeak = 0; s.wet = 0; s.wasWet = false; s.fluff = 0; s.acc = [];
    s.events = {};
    if (!s.mudCanvas) { s.mudCanvas = document.createElement('canvas'); }
    // Half resolution is plenty for soft mud and much cheaper to redraw.
    s.mudCanvas.width = Math.ceil(s.mask.iw / 2); s.mudCanvas.height = Math.ceil(s.mask.ih / 2);
    s.mudDirty = true;
    pet.attach((g, info) => this.drawPetOverlay(g, info, s));
  }

  makeMud(s) {
    const m = s.mask;
    const cand = m.pts.filter(([x, y]) => y > m.ih * 0.18 && y < m.ih * 0.94);
    const blobs = [];
    const want = 14;
    let tries = 0;
    while (blobs.length < want && tries++ < 600 && cand.length) {
      const [x, y] = pick(cand);
      const minD = m.ih * 0.13;
      if (blobs.some((b) => Math.hypot(b.x - x, b.y - y) < minD)) continue;
      blobs.push({
        x, y, r: m.ih * rand(0.07, 0.11), amt: 1,
        shape: Array.from({ length: 9 }, () => rand(0.75, 1.2)),
        dots: Array.from({ length: 4 }, () => [rand(-1.4, 1.4), rand(-1.4, 1.4), rand(0.12, 0.25)]),
        rot: rand(TAU),
      });
    }
    s.mud = blobs;
    s.mudStart = blobs.length;
  }

  // ---- geometry helpers ---------------------------------------------------
  petPx(s) { return (s.pet.leader.h * s.pet.scale) / s.mask.ih; }
  imgFlip(s) { return s.pet.leader.facing === -1 ? -1 : 1; }
  toImage(s, x, y) {
    const k = this.petPx(s), f = s.pet.facing * this.imgFlip(s);
    return { x: (x - s.pet.x) / (f * k) + s.mask.iw / 2, y: (y - (s.pet.y - s.pet.z)) / k + s.mask.ih };
  }
  toScreen(s, ix, iy) {
    const k = this.petPx(s), f = s.pet.facing * this.imgFlip(s);
    return { x: s.pet.x + (ix - s.mask.iw / 2) * f * k, y: s.pet.y - s.pet.z + (iy - s.mask.ih) * k };
  }
  onPet(s, x, y, slack = 10) {
    const p = this.toImage(s, x, y);
    return s.mask.near(p.x, p.y, slack / this.petPx(s));
  }

  // ---- progress -------------------------------------------------------------
  mudLeft(s) { return s.mud.reduce((a, b) => a + b.amt, 0) / Math.max(1, s.mudStart); }
  sudsTotal(s) { return s.suds.reduce((a, b) => a + b.amt, 0); }
  parts(s) {
    const clean = 1 - this.mudLeft(s);
    const suds = this.sudsTotal(s);
    // showered clean before any soap: the rinse counts as done (no suds to wash off)
    const rinse = s.sudsPeak > 0 ? clean * clamp(1 - suds / Math.max(1, s.sudsPeak * 0.6), 0, 1) : (s.wasWet ? clean : 0);
    const dry = s.wasWet ? clamp(1 - s.wet, 0, 1) : 0;
    return { clean, rinse, dry, fluff: s.fluff, bow: s.acc.length ? 1 : 0, treat: s.treats ? 1 : 0, suds };
  }
  happiness(s) {
    const q = this.parts(s);
    return 0.3 * q.clean + 0.15 * q.rinse + 0.15 * q.dry + 0.15 * q.fluff + 0.125 * q.bow + 0.125 * q.treat;
  }
  /**
   * Is this step finished, so A may go on? The same checks nextTool uses:
   * the mud is off, the suds are rinsed off (once wet), the pet is dry, the
   * fur is fluffed, a treat was given. Bows are optional (always finished).
   */
  canGoOn(s, id) {
    switch (id) {
      case 'sponge': return this.mudLeft(s) <= 0.015;
      case 'shower': return s.wasWet && this.sudsTotal(s) <= 0.15;
      case 'towel': return s.wet <= 0.01;
      case 'brush': return s.fluff >= 0.99;
      default: return true;   // bows (optional) and the treat (A gives one as it goes on)
    }
  }

  /**
   * Where A goes from the current tool: the next suggested step, else Done.
   * Bows are optional, so A never sends her back to them from Bows or Treat,
   * and from Treat (where A gives a treat on the way) it never stays on Treat.
   */
  goOnTool(s) {
    let nt = this.nextTool(s);
    if (nt === 'bow' && s.tool >= TOOL_IDX.bow) nt = s.treats || s.tool === TOOL_IDX.treat ? null : 'treat';
    if (nt === 'treat' && s.tool === TOOL_IDX.treat) nt = null;
    return nt ? TOOL_IDX[nt] : DONE;
  }

  /** A on an unfinished step: the pet says what's left, with the X hint. */
  nudge(s, id) {
    const name = s.def.name;
    const N = {
      sponge: [`${name} still needs more scrubbing!`, 'hold', 'to scrub'],
      shower: [`${name} still needs more rinsing!`, 'hold', 'to rinse'],
      towel: [`${name} still needs drying!`, 'hold', 'to dry'],
      brush: [`${name} still needs brushing!`, 'hold', 'to brush'],
    }[id];
    if (!N) return;
    s.pet.say(null);
    s.nudge = { text: N[0], pre: N[1], post: N[2], t: 0, dur: 3 };
    s.pet.squash(0.12); s.pet.emote('question', 1);
    sfx('blip');
  }

  nextTool(s) {
    const q = this.parts(s);
    if (q.clean < 0.985) return 'sponge';
    if (q.suds > 0.15 || !s.wasWet) return 'shower';
    if (s.wet > 0.01) return 'towel';
    if (s.fluff < 0.99) return 'brush';
    if (!s.acc.length) return 'bow';
    if (!s.treats) return 'treat';
    return null;
  }

  // ---- update -----------------------------------------------------------------
  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.2) this.banner = null; }
    for (const b of this.bubbles) { b.y -= b.sp * dt; b.x += Math.sin(this.t + b.ph) * 10 * dt; if (b.y < -30) { b.y = H + 30; b.x = rand(W); } }
    this.updateFlying(dt);
    if (this.phase === 'spa') {
      this.spaLeft = Math.max(0, this.spaLeft - dt);
      for (const s of this.stations) this.updateStation(s, dt);
      const all = this.stations.every((s) => s.ready);
      if (all) {
        this.allDoneT += dt;
        if (this.allDoneT > 3) this.startParade();
      }
    } else if (this.phase === 'parade') {
      this.updateParade(dt);
    }
  }

  updateFlying(dt) {
    for (const f of this.flying) {
      f.t += dt;
      const p = Math.min(1, f.t / f.dur);
      if (f.done) continue;
      if (p >= 1) { f.done = true; f.onLand && f.onLand(); }
    }
    this.flying = this.flying.filter((f) => !f.done);
  }

  updateStation(s, dt) {
    const p = s.p, c = p.ctrl, r = s.r, pet = s.pet;
    if (p.isAI) this.ai(s, dt);
    // Cursor
    const sp = 820 * s.k;
    const cur = s.cursor;
    // On a gamepad only the stick moves the hand; the d-pad picks tools
    // (left / right, like the tool bar) and bows (up / down).
    const pad = c.kind === 'pad', mx = pad ? c.sx : c.x, my = pad ? c.sy : c.y;
    cur.px = cur.x; cur.py = cur.y;
    cur.x = clamp(cur.x + mx * sp * dt, r.x + 30, r.x + r.w - 30);
    cur.y = clamp(cur.y + my * sp * dt, r.y + s.headerH + 10, r.y + r.h - s.toolH - 10);
    cur.speed = damp(cur.speed, Math.hypot(cur.x - cur.px, cur.y - cur.py) / Math.max(dt, 1e-3), 12, dt);
    const motion = 1 + Math.min(1, cur.speed / (420 * s.k)) * 0.7;

    // LB / RB (d-pad left / right): tools, the last one is Done (A there: my pet is ready) ·
    // X: use the tool (hold) / bows and treats (tap) · A: this step is done, go on (not done
    // yet: the pet says what's left) · d-pad up / down, LT / RT: bows ·
    // B: cuddle / take a bow off (once ready: not yet) · Y: squeaky duck
    const N = TOOLS.length + 1;
    const toolStep = (c.pressed('rb') || (pad && c.pressed('right')) ? 1 : 0) - (c.pressed('lb') || (pad && c.pressed('left')) ? 1 : 0);
    if (toolStep) this.setTool(s, (s.tool + toolStep + N) % N);
    const bowStep = ((pad && c.pressed('down')) || c.pressed('rt') ? 1 : 0) - ((pad && c.pressed('up')) || c.pressed('lt') ? 1 : 0);
    if (bowStep || (pad && (c.pressed('up') || c.pressed('down')))) {
      // Bow picker: jump to the Bows tool, or step through the bows when there.
      if (s.tool !== TOOL_IDX.bow) this.setTool(s, TOOL_IDX.bow);
      else if (bowStep) this.cycleAccessory(s, bowStep);
    }
    if (s.nudge) { s.nudge.t += dt; if (s.nudge.t > s.nudge.dur || s.tool === DONE) s.nudge = null; }
    const onDone = s.tool === DONE;   // (A that just went on to Done doesn't also say "ready")
    if (!s.ready && s.tool !== DONE && !toolStep && c.pressed('a')) {
      const id = TOOLS[s.tool].id;
      if (this.canGoOn(s, id)) {
        s.nudge = null;
        if (id === 'treat' && s.cooldown <= 0) this.giveTreat(s);   // A on Treat: one more treat, then on
        this.setTool(s, this.goOnTool(s));
      }
      else this.nudge(s, id);
    }
    let readyB = false;
    if (s.ready && (c.pressed('b') || s.tool !== DONE)) { readyB = c.pressed('b'); this.setReady(s, false); }
    else if (!s.ready && onDone && s.tool === DONE && c.pressed('a')) this.setReady(s, true);
    if (s.ready) s.readyT += dt;
    s.toolPop = Math.max(0, s.toolPop - dt * 3);
    s.cooldown -= dt; s.sfxT -= dt; s.giggleT -= dt; s.sparkleT -= dt;
    s.accPop = Math.max(0, s.accPop - dt * 3);

    const tool = s.tool === DONE ? 'done' : TOOLS[s.tool].id;
    const hold = c.held('x'), tap = c.pressed('x');
    s.using = hold && tool !== 'done';
    if (hold && s.nudge && tool !== 'bow') s.nudge = null;   // she's on it
    const on = this.onPet(s, cur.x, cur.y, 14 * s.k);
    const ip = this.toImage(s, cur.x, cur.y);
    // Placed bows can be picked up again with the Bows tool: X on a bow moves
    // it (it follows the hand, X again drops it), B on a bow takes it off.
    if (s.held && (tool !== 'bow' || !s.acc.includes(s.held))) this.dropHeld(s, on, ip);
    if (s.held) { s.held.x = ip.x; s.held.y = ip.y; }
    s.hover = tool === 'bow' && !s.held && !p.isAI ? this.accAt(s, ip.x, ip.y) : null;
    let bowB = false;
    // B on Bows: take off the bow under the hand, else undo the newest one (no bows: a cuddle)
    if (tool === 'bow' && c.pressed('b') && (s.held || s.hover || s.acc.length)) { this.removeAccessory(s, s.held || s.hover || this.newestAccessory(s)); bowB = true; }
    if (!bowB && !readyB && c.pressed('b') && s.cooldown <= 0) this.cuddle(s);
    if (c.pressed('y') && s.cooldown <= 0) this.squeaky(s);
    const px = this.petPx(s);
    let brushing = false;

    if (hold && tool === 'sponge') {
      const rad = (52 * s.k) / px;
      let any = false;
      for (const b of s.mud) {
        if (b.amt <= 0) continue;
        const d = Math.hypot(b.x - ip.x, b.y - ip.y);
        if (d < rad + b.r * 0.8) {
          const before = b.amt;
          b.amt = Math.max(0, b.amt - 0.5 * motion * dt);
          any = true; s.mudDirty = true;
          if (before > 0 && b.amt <= 0) this.blobCleaned(s, b);
        }
      }
      if (on) {
        s.useT += dt;
        if (s.useT > 0.07) { s.useT = 0; this.addSuds(s, ip.x + rand(-30, 30) / px * s.k, ip.y + rand(-24, 24) / px * s.k); }
        if (s.sfxT <= 0) { if (hasSound('scrub')) { sfx('scrub', { vol: 0.6 }); s.sfxT = 0.25; } else { sfx('bubble'); s.sfxT = 0.13; } }
        if (chance(dt * 10)) particles.burst(cur.x, cur.y, { type: 'bubble', count: 1, speed: [40, 120], size: [5, 12] });
        if (any && s.giggleT <= 0) { s.giggleT = rand(1.8, 3); pet.squash(0.12); if (this.mudLeft(s) < 0.6) sfx('giggle'); }
      }
      if (this.mudLeft(s) <= 0.015) this.allClean(s);
    } else if (hold && tool === 'shower') {
      // The water falls straight down from the shower head and rinses
      // everything it falls on (sprayAt: as far as the drops go, in a fan
      // that widens as it falls - wider is slower, so held close it rinses
      // fast, held high it covers more).
      let hx = cur.x, hy = cur.y + 30 * s.k, reach = 0;
      for (let d = 30 * s.k; d <= Math.max(SPRAY_LEN * s.k, WATER_REACH); d += 10 * s.k) {
        if (this.onPet(s, cur.x, cur.y + d, 12 * s.k)) { hy = cur.y + d + 18 * s.k; reach = d; break; }
      }
      if (chance(dt * 40)) particles.burst(cur.x + rand(-14, 14) * s.k, cur.y + 16 * s.k, { type: 'drop', count: 1, angle: Math.PI / 2, spread: 0.25, speed: [260, 420], colors: ['#5cc8ff', '#8fe0ff', '#ffffff'], size: [4, 8] });
      if (s.sfxT <= 0) { if (hasSound('shower')) { sfx('shower', { vol: 0.8 }); s.sfxT = 0.42; } else { sfx('water'); s.sfxT = 0.22; } }
      let hit = false;
      for (const u of s.suds) {
        const sp2 = this.toScreen(s, u.x, u.y), f = this.sprayAt(s, sp2.x, sp2.y, u.r * px * 0.5);
        if (f > 0) {
          hit = true;
          const before = u.amt;
          u.amt = Math.max(0, u.amt - 1.0 * f * dt);
          if (before > 0.05 && u.amt <= 0.05 && chance(0.5)) particles.burst(sp2.x, sp2.y, { type: 'bubble', count: 3, size: [6, 12] });
        }
      }
      s.suds = s.suds.filter((u) => u.amt > 0.02);
      // a little rinse helps the last bits of mud too
      for (const b of s.mud) {
        if (b.amt <= 0) continue;
        const sp2 = this.toScreen(s, b.x, b.y), f = this.sprayAt(s, sp2.x, sp2.y, b.r * px * 0.5);
        if (f > 0) { b.amt = Math.max(0, b.amt - 0.25 * f * dt); s.mudDirty = true; hit = true; }
      }
      if (hit || reach > 0 || this.onPet(s, hx, hy, 30 * s.k)) {
        if (!s.wasWet) { s.wasWet = true; pet.playOnce('surprised', 0.4); pet.say(pick(['Brrr!', 'Splish!', 'Eek, wet!']), 1.2, 'gasp'); }
        s.wet = Math.min(1, s.wet + 0.45 * dt);
      }
      if (this.parts(s).clean > 0.98 && s.sudsPeak > 0 && this.sudsTotal(s) <= 0.15) this.allRinsed(s);
    } else if (hold && tool === 'towel') {
      if (on && s.wet > 0) {
        s.wet = Math.max(0, s.wet - 0.3 * motion * dt);
        if (s.sfxT <= 0) { snd('towel', 'brush'); s.sfxT = hasSound('towel') ? 0.4 : 0.16; }
        if (chance(dt * 10)) particles.burst(cur.x, cur.y, { type: 'drop', count: 2, colors: ['#8fe0ff'], speed: [80, 200], size: [3, 6] });
        if (s.wet <= 0 && s.wasWet) this.shakeOff(s);
      } else if (on && s.sfxT <= 0) { sfx('brush'); s.sfxT = 0.3; }
    } else if (hold && tool === 'brush') {
      if (on) {
        brushing = true;
        const before = s.fluff;
        s.fluff = Math.min(1, s.fluff + (s.wet > 0.3 ? 0.12 : 0.22) * motion * dt);
        if (s.sfxT <= 0) { sfx('brush'); s.sfxT = 0.14; }
        if (s.sparkleT <= 0) { s.sparkleT = 0.09; particles.burst(cur.x + rand(-20, 20), cur.y + rand(-20, 20), { type: 'sparkle', count: 1, colors: ['#ffffff', '#fff6a8', '#ffc8f0'] }); }
        if (before < 1 && s.fluff >= 1) this.allShiny(s);
      }
    } else if (tap && tool === 'bow') {
      if (s.held) this.dropHeld(s, on, ip);
      else if (s.hover) this.pickUpAccessory(s, s.hover);
      else if (on) this.placeAccessory(s, ip.x, ip.y);
      else { sfx('blip'); particles.burst(cur.x, cur.y, { type: 'spark', count: 4, colors: ['#ffffff'] }); }
    } else if (tap && tool === 'treat' && s.cooldown <= 0) {
      this.giveTreat(s);
    }

    // Drying shake droplets & wet drips
    if (s.shakeT > 0) {
      s.shakeT -= dt;
      if (chance(dt * 14)) {
        const c2 = pet.anchor('center'), side = chance(0.5) ? 1 : -1;
        particles.burst(c2.x + side * pet.width * 0.3, c2.y + rand(-30, 30), { type: 'drop', count: 3, angle: side > 0 ? -0.2 : Math.PI + 0.2, spread: 0.7, speed: [200, 420], colors: ['#5cc8ff', '#ffffff'], size: [4, 8] });
      }
    }
    if (s.wet > 0.15) {
      s.dripT -= dt;
      if (s.dripT <= 0) {
        s.dripT = rand(0.08, 0.25) / s.wet;
        const [ix, iy] = pick(s.mask.pts);
        const sp2 = this.toScreen(s, ix, iy);
        particles.burst(sp2.x, sp2.y, { type: 'drop', count: 1, angle: Math.PI / 2, spread: 0.1, speed: [40, 90], colors: ['#8fe0ff'], size: [3, 6] });
      }
    }
    // Squeaky duck jump
    if (s.jumpT >= 0) {
      s.jumpT += dt;
      const jp = s.jumpT / 0.6;
      pet.z = jp < 1 ? Math.sin(jp * Math.PI) * 90 * s.k : 0;
      if (jp >= 1) { s.jumpT = -1; pet.z = 0; pet.squash(0.3); sfx('land'); }
    }

    this.finishNearlyDone(s, dt);

    // Mood poses
    if (brushing) pet.setPose('dance');
    else if (s.done) pet.setPose(s.doneT < 2.4 ? 'celebrate' : 'idle');
    else if (this.mudLeft(s) > 0.5) pet.setPose('sad');
    else pet.setPose('idle');

    // Happiness meter
    s.happyTarget = this.happiness(s);
    s.happy = damp(s.happy, s.happyTarget, 4, dt);
    if (!s.done && s.happyTarget >= 0.995) this.petDone(s);
    if (s.done) {
      s.doneT += dt;
      if (chance(dt * 0.3)) pet.emote('heart', 1.2);
      if (chance(dt * 0.25)) s.char.playOnce('cheer', 0.5);
    }
    s.char.setPose(s.done ? (s.doneT < 2.4 ? 'celebrate' : 'idle') : 'idle');
    s.mudT = (s.mudT || 0) - dt;
    if (s.mudDirty && s.mudT <= 0) { this.renderMud(s); s.mudT = 0.06; }
    pet.update(dt);
    s.char.update(dt);
  }

  /**
   * How hard the shower's water hits screen point (x, y), with `slack` px of
   * give: 0 outside the spray cone that drawCursor draws, else 1 near the
   * head easing down to 0.45 at the bottom of the spray.
   */
  /**
   * How strongly the shower rinses at (x, y): everywhere the water falls below the head
   * (as far as the drops go), in a fan that widens as it falls. Wider = slower, so the same
   * water spread over more pet: hold it close to rinse fast, higher to cover more.
   */
  sprayAt(s, x, y, slack = 0) {
    const c = s.cursor, size = 74 * s.k, top = -size * 0.25;
    const reach = Math.max(SPRAY_LEN * s.k, WATER_REACH);   // the drops fall about this far (screen px)
    const dy = y - c.y;
    if (dy < top - slack || dy > reach + slack) return 0;
    const half = (d) => size * 0.28 + Math.max(0, d - top) * 0.22;
    if (Math.abs(x - c.x) > half(dy) + slack) return 0;
    return clamp(half(60 * s.k) / half(dy), 0.2, 1);   // full strength just below the head
  }

  rumble(p, a, ms) { try { p.ctrl.rumble && p.ctrl.rumble(a, ms); } catch (e) { /* ignore */ } }

  setTool(s, i) {
    if (s.tool === i) { s.toolPop = 0.6; return; }
    s.tool = i; s.toolPop = 1; sfx('swap');
  }

  /** A on Done: this pet is ready for the parade (B, or a tool again: not yet). */
  setReady(s, on) {
    s.ready = on; s.readyT = 0;
    if (!on) { sfx('back'); return; }
    sfx('ready');
    const c = s.pet.anchor('center');
    particles.burst(c.x, c.y, { type: 'confetti', count: 26 });
    s.char.playOnce('cheer', 0.6); s.pet.emote('heart', 1.2);
    s.pet.say(pick(['Ready!', 'Parade time?', 'Yay!']), 1.4, null);
  }

  blobCleaned(s, b) {
    const sp2 = this.toScreen(s, b.x, b.y);
    particles.burst(sp2.x, sp2.y, { type: 'sparkle', count: 5, colors: ['#ffffff', '#fff6a8'] });
    particles.burst(sp2.x, sp2.y, { type: 'bubble', count: 4, size: [6, 14] });
    s.events.blobs = (s.events.blobs || 0) + 1;
    sfx('collect', { step: Math.min(12, s.events.blobs) });
  }

  addSuds(s, x, y) {
    if (s.mask.at(x, y) < 60) return;
    const near = s.suds.find((u) => Math.hypot(u.x - x, u.y - y) < s.mask.ih * 0.05);
    if (near) { near.amt = Math.min(1.4, near.amt + 0.25); }
    else if (s.suds.length < 44) s.suds.push({ x, y, r: s.mask.ih * rand(0.035, 0.06), amt: 0.6, ph: rand(TAU) });
    else { const u = pick(s.suds); u.amt = Math.min(1.4, u.amt + 0.2); }
    s.sudsPeak = Math.max(s.sudsPeak, this.sudsTotal(s));
  }

  // ---- step finishers (also used when a step is nearly done) -----------------
  allClean(s) {
    if (s.events.clean) return;
    s.events.clean = true;
    for (const b of s.mud) b.amt = 0; s.mudDirty = true;
    const pet = s.pet, head = pet.anchor('center');
    particles.burst(head.x, head.y, { type: 'sparkle', count: 18, colors: ['#ffffff', '#fff6a8', '#bff3ff'] });
    particles.popText(head.x, head.y - 40, 'Squeaky clean!', '#7fd3ff', 44 * s.k);
    sfx('correct'); pet.playOnce('surprised', 0.4, 'idle'); pet.emote('sparkle', 1.2);
    s.char.playOnce('cheer', 0.5); this.rumble(s.p, 0.3, 80);
  }

  allRinsed(s) {
    // the last few bubbles pop
    for (const u of s.suds) { const sp = this.toScreen(s, u.x, u.y); particles.burst(sp.x, sp.y, { type: 'bubble', count: 2, size: [6, 12] }); }
    s.suds = [];
    if (s.events.rinse) return;
    s.events.rinse = true;
    const cpt = s.pet.anchor('center');
    particles.popText(cpt.x, cpt.y - 40, 'All rinsed!', '#5cc8ff', 42 * s.k);
    sfx('splash'); s.char.playOnce('cheer', 0.5);
  }

  allShiny(s) {
    s.fluff = 1;
    const cpt = s.pet.anchor('center');
    particles.burst(cpt.x, cpt.y, { type: 'star', count: 14 });
    particles.popText(cpt.x, cpt.y - 50, 'So shiny!', '#ffd23f', 44 * s.k);
    sfx('sparkle'); sfx('star'); s.char.playOnce('cheer', 0.5);
  }

  /**
   * Mostly done is good enough: when a step only has a tiny bit left (a speck
   * of mud, a few bubbles, a damp patch, nearly full shine) for NEARLY_T
   * seconds, it finishes by itself, so nobody hunts for an invisible bubble.
   */
  finishNearlyDone(s, dt) {
    const q = this.parts(s), n = s.nearly || (s.nearly = {});
    const tick = (id, nearly, finish) => {
      n[id] = nearly ? (n[id] || 0) + dt : 0;
      if (n[id] >= NEARLY_T) { n[id] = 0; finish(); }
    };
    tick('sponge', q.clean < 0.985 && q.clean >= 0.95, () => this.allClean(s));
    tick('shower', s.wasWet && q.clean >= 0.985 && s.suds.length > 0 && q.rinse >= 0.85, () => this.allRinsed(s));
    tick('towel', s.wasWet && this.stepDone(s, 'shower') && s.wet > 0 && s.wet <= 0.15, () => { s.wet = 0; this.shakeOff(s); });
    tick('brush', s.fluff < 1 && s.fluff >= 0.9, () => this.allShiny(s));
  }

  shakeOff(s) {
    if (s.events.dry) return;
    s.events.dry = true;
    s.shakeT = 1.0;
    const pet = s.pet, c = pet.anchor('center');
    pet.playOnce('shake', 0.9, 'idle');
    for (const side of [-1, 1]) particles.burst(c.x + side * 30, c.y, { type: 'drop', count: 18, angle: side > 0 ? -0.3 : Math.PI + 0.3, spread: 0.9, speed: [260, 560], colors: ['#5cc8ff', '#8fe0ff', '#ffffff'], size: [4, 9] });
    sfx('splash'); snd('pet-shake', 'whoosh');
    particles.popText(c.x, c.y - 60, 'Fluffy dry!', '#ff9ecf', 44 * s.k);
    s.char.playOnce('surprised', 0.4, 'idle');
    later(() => { if (!this.finished) s.char.playOnce('cheer', 0.5); }, 450);
    this.rumble(s.p, 0.4, 150);
  }

  placeAccessory(s, ix, iy) {
    const a = ACCESSORIES[s.accIdx % ACCESSORIES.length];
    s.accSeq = (s.accSeq || 0) + 1;
    s.acc.push({ x: ix, y: iy, kind: a.kind, color: a.color, rot: rand(-0.35, 0.35), t: 0, n: s.accSeq });
    if (s.acc.length > 7) s.acc.splice(s.acc.findIndex((b) => b !== s.held), 1);
    s.accIdx = (s.accIdx + 1) % ACCESSORIES.length;
    const cur = s.cursor;
    particles.burst(cur.x, cur.y, { type: 'sparkle', count: 8 });
    particles.burst(cur.x, cur.y, { type: 'heart', count: 2 });
    sfx('stamp'); sfx('sparkle');
    s.pet.playOnce('cheer', 0.45); s.pet.emote('heart', 1);
    s.care++;
    if (s.acc.length === 1) particles.popText(cur.x, cur.y - 40, 'So cute!', '#ff6fb1', 42 * s.k);
  }

  cycleAccessory(s, d) {
    s.accIdx = (s.accIdx + d + ACCESSORIES.length) % ACCESSORIES.length;
    s.accPop = 1; s.toolPop = Math.max(s.toolPop, 0.4); sfx('swap');
  }

  /** The placed accessory under image point (ix, iy), nearest first (or null). */
  accAt(s, ix, iy) {
    const rad = s.mask.ih * 0.085;
    let best = null, bd = rad;
    for (const a of s.acc) {
      const d = Math.hypot(a.x - ix, a.y - iy);
      if (d <= bd) { bd = d; best = a; }
    }
    return best;
  }

  /** The most recently placed bow (B's undo on Bows). */
  newestAccessory(s) { return s.acc.reduce((best, a) => (!best || a.n > best.n ? a : best), null); }

  pickUpAccessory(s, a) {
    s.held = a; s.hover = null; a.home = { x: a.x, y: a.y };
    // carry it on top of the others
    s.acc.splice(s.acc.indexOf(a), 1); s.acc.push(a);
    sfx('pop'); this.rumble(s.p, 0.15, 40);
  }

  /** Let go of the bow being moved: it sticks where the hand is, or (off the pet) goes back to where it was. */
  dropHeld(s, on, ip) {
    const a = s.held;
    s.held = null;
    if (!a || !s.acc.includes(a)) return;
    if (on) { a.x = ip.x; a.y = ip.y; } else if (a.home) { a.x = a.home.x; a.y = a.home.y; }
    a.t = 0;   // little pop as it lands
    particles.burst(s.cursor.x, s.cursor.y, { type: 'sparkle', count: 6 });
    sfx('stamp');
    s.pet.emote('heart', 0.8);
  }

  removeAccessory(s, a) {
    const i = s.acc.indexOf(a);
    if (i < 0) return;
    s.acc.splice(i, 1);
    if (s.held === a) s.held = null;
    if (s.hover === a) s.hover = null;
    const sp2 = this.toScreen(s, a.x, a.y);
    particles.burst(sp2.x, sp2.y, { type: 'spark', count: 8, colors: [a.color, '#ffffff'] });
    sfx('pop');
  }

  giveTreat(s) {
    s.cooldown = 0.9;
    const pet = s.pet, head = pet.anchor('head');
    const from = { x: s.cursor.x, y: s.cursor.y };
    const to = { x: head.x + pet.facing * 10, y: head.y + pet.height * 0.18 };
    sfx('whoosh');
    this.flying.push({
      kind: 'treat', from, to, t: 0, dur: 0.38, arc: 80 * s.k, s: 40 * s.k,
      onLand: () => {
        s.treats++; s.care += 2;
        pet.playOnce('eat', 0.8); pet.squash(0.25); pet.emote('hearts', 1.6);
        sfx('munch'); later(() => sfx('munch', { force: true }), 260);
        particles.burst(to.x, to.y, { type: 'heart', count: 7 });
        particles.burst(to.x, to.y, { type: 'spark', count: 6, colors: ['#e0a060', '#ff9ecf'] });
        particles.popText(to.x, to.y - 50, s.treats === 1 ? 'Yummy!' : pick(['Nom nom!', 'Yum!', 'Crunch!']), '#ffb067', 42 * s.k);
        s.char.playOnce('cheer', 0.5);
      },
    });
  }

  cuddle(s) {
    s.cooldown = 0.35; s.cuddles++; s.care++;
    const c = s.pet.anchor('center');
    s.pet.squash(0.3); s.pet.emote('heart', 1);
    particles.burst(c.x, c.y - 10, { type: 'heart', count: 4 });
    sfx('giggle');
    s.char.playOnce('cheer', 0.4);
  }

  squeaky(s) {
    if (s.jumpT >= 0) return;
    s.cooldown = 0.8; s.toys++; s.care++;
    const pet = s.pet, head = pet.anchor('head');
    snd('squeak', 'bubble'); sfx('pop');
    this.flying.push({
      kind: 'duck', from: { x: s.cursor.x, y: s.cursor.y }, to: { x: head.x, y: head.y - 80 * s.k }, t: 0, dur: 0.45, arc: 140 * s.k, s: 36 * s.k,
      onLand: () => {
        particles.burst(head.x, head.y - 80 * s.k, { type: 'star', count: 6 });
        snd('squeak', 'bounce');
      },
    });
    later(() => {
      if (this.finished) return;
      s.jumpT = 0; pet.playOnce('cheer', 0.6); voice(s.def.char || 'fox', 'woo');
    }, 180);
  }

  petDone(s) {
    s.done = true; s.doneT = 0;
    const pet = s.pet, c = pet.anchor('center');
    particles.burst(c.x, c.y, { type: 'confetti', count: 60 });
    particles.burst(c.x, c.y, { type: 'heart', count: 12 });
    particles.ring(c.x, c.y, '#ff6fb1', 260 * s.k);
    particles.popText(c.x, s.r.y + s.headerH + 60, 'Happy pet!', '#ff6fb1', 64 * s.k);
    sfx('fanfare'); sfx('yay');
    fx.flash('#fff6fb', 0.2); fx.shake(6, 0.2);
    pet.playOnce('celebrate', 2.4, 'idle');
    s.char.playOnce('celebrate', 2.4, 'idle');
    voice(s.p.charId, 'yay');
    pet.say(pick(['So fluffy!', 'I feel sparkly!', 'Thank you!', 'Best bath ever!']), 2.2, null);
    this.rumble(s.p, 0.6, 250);
  }

  // ---- CPU ---------------------------------------------------------------------
  ai(s, dt) {
    const p = s.p, c = p.ctrl, A = s.ai, prof = aiProfile(p);
    const cur = s.cursor;
    A.t -= dt;
    A.distract -= dt;
    if (s.ready) { c.move(0, 0); c.hold('x', false); return; }
    if (A.goDone) {   // A goes on to Done (RB when a step's left), then A: ready
      c.move(0, 0); c.hold('x', false);
      if (A.t <= 0) { c.press(s.tool === DONE || (this.canGoOn(s, TOOLS[s.tool].id) && this.goOnTool(s) === DONE) ? 'a' : 'rb'); A.t = reactionTime(p) * 0.7; }
      return;
    }
    // Little distractions: cuddles and squeaky ducks (easier CPUs dawdle more).
    if (A.distract <= 0 && !s.done) {
      A.distract = rand(5, 10) * (1 + (p.aiLevel || 0) * 0.6);
      A.idleT = rand(0.6, 1.4) * (1 - (p.aiLevel || 0) * 0.3);
      c.hold('x', false); c.move(0, 0);
      c.press(chance(0.5) && s.tool !== TOOL_IDX.bow ? 'b' : 'y');   // (B on Bows would undo a bow)
    }
    if (A.idleT > 0) { A.idleT -= dt; c.move(0, 0); c.hold('x', false); return; }

    let want = this.nextTool(s);
    if (want !== A.lastWant) {
      // Admire the work for a moment after each finished step.
      if (A.lastWant !== undefined) { A.idleT = rand(0.8, 1.8) * (1 - (p.aiLevel || 0) * 0.3); A.lastWant = want; c.hold('x', false); c.move(0, 0); return; }
      A.lastWant = want;
    }
    if (!want) {
      // Free play once happy: a cuddle or a squeaky duck or two, then Done.
      if (A.t > 0) { c.move(0, 0); c.hold('x', false); return; }
      A.t = rand(1.5, 3.5);
      A.extra = (A.extra ?? randInt(1, 3)) - 1;
      if (A.extra > 0) c.press(pick(['b', 'y', 'b'])); else A.goDone = true;
      return;
    }
    const wi = TOOL_IDX[want], N = TOOLS.length + 1;
    if (s.tool !== wi) {
      c.hold('x', false);
      if (A.t <= 0) {
        // the step is done: A goes on to the next one (else LB / RB along)
        const fwd = (wi - s.tool + N) % N;
        const goOn = s.tool !== DONE && this.canGoOn(s, TOOLS[s.tool].id) && this.goOnTool(s) === wi;
        c.press(goOn ? 'a' : fwd <= N / 2 ? 'rb' : 'lb');
        A.t = reactionTime(p) * 0.7;
      }
      c.move(0, 0);
      return;
    }
    // Choose a target point (screen space).
    const pickBody = (yMin = 0.25, yMax = 0.9) => {
      const m = s.mask;
      const cand = m.pts.filter(([, y]) => y > m.ih * yMin && y < m.ih * yMax);
      const [ix, iy] = pick(cand.length ? cand : m.pts);
      return { ix, iy };
    };
    let tgt = A.target;
    const valid = tgt && tgt.tool === want && (!tgt.until || !tgt.until());
    if (!valid) {
      tgt = null;
      if (want === 'sponge') {
        const b = s.mud.filter((m) => m.amt > 0).sort((a, b2) => b2.amt - a.amt)[0];
        if (b) tgt = { tool: want, ix: b.x, iy: b.y, until: () => b.amt <= 0 };
      } else if (want === 'shower') {
        const u = s.suds.slice().sort((a, b2) => b2.amt - a.amt)[0];
        if (u && this.sudsTotal(s) > 0.15) tgt = { tool: want, ix: u.x, iy: u.y - s.mask.ih * 0.1, until: () => u.amt <= 0.05 };
        else { const q = pickBody(0.3, 0.6); tgt = { tool: want, ix: q.ix, iy: q.iy - s.mask.ih * 0.1, life: 1.2 }; }
      } else if (want === 'towel' || want === 'brush') {
        const q = pickBody(); tgt = { tool: want, ix: q.ix, iy: q.iy, life: rand(0.5, 0.9) };
      } else if (want === 'bow') {
        const q = pickBody(0.05, 0.55); tgt = { tool: want, ix: q.ix, iy: q.iy, tap: true };
      } else if (want === 'treat') {
        tgt = { tool: want, head: true, tap: true };
      }
      if (tgt) tgt.age = 0;
      A.target = tgt;
    }
    if (!tgt) { c.move(0, 0); c.hold('x', false); return; }
    tgt.age += dt;
    let tx, ty;
    if (tgt.head) { const h2 = s.pet.anchor('head'); tx = h2.x - 40 * s.pet.facing * s.k; ty = h2.y + 40 * s.k; }
    else { const sp2 = this.toScreen(s, tgt.ix, tgt.iy); tx = sp2.x; ty = sp2.y; }
    // Easier CPUs scrub with a lazy circular wiggle.
    const wig = 26 * s.k;
    tx += Math.cos(this.t * 5 + p.index) * wig; ty += Math.sin(this.t * 6 + p.index) * wig * 0.6;
    const d = steer(p, cur.x, cur.y, tx, ty, { arrive: 70 * s.k });
    const close = d < 60 * s.k;
    if (tgt.tap) {
      c.hold('x', false);
      if (close && A.t <= 0) { c.press('x'); A.t = reactionTime(p) + 0.4; A.target = null; }
    } else {
      c.hold('x', close || (d < 120 * s.k && s.using));
      if (tgt.life !== undefined && close) { tgt.life -= dt; if (tgt.life <= 0) A.target = null; }
      if (tgt.age > 6) A.target = null;
    }
    if (prof.speed < 0.85 && chance(dt * 0.4)) c.hold('x', false);
  }

  // ---- parade --------------------------------------------------------------------
  startParade() {
    if (this.phase === 'parade') return;
    this.phase = 'parade'; this.phaseT = 0;
    for (const p of this.players) if (p.isAI) { p.ctrl.hold('x', false); p.ctrl.move(0, 0); }
    const n = this.stations.length;
    const targetH = n <= 3 ? 320 : n <= 5 ? 250 : 190;
    const spacing = Math.min(360, 1640 / n);
    this.stations.forEach((s, i) => {
      const pet = s.pet;
      pet.scale = targetH / pet.leader.h;
      const w1 = pet.width / pet.scale;
      pet.scale = Math.min(pet.scale, (spacing * 0.95) / w1);
      pet.facing = 1; pet.z = 0;
      pet.x = -200 - i * 260; pet.y = 752; pet.snap();
      pet.setPose('walk');
      s.shakeT = 0; s.jumpT = -1; s.held = null; s.hover = null;
      s.paradeX = W / 2 + (i - (n - 1) / 2) * spacing;
      s.arrived = false;
      // Every pet is show-ready for the parade (a little spa magic).
      s.wet = 0; s.suds = [];
      if (s.mud.some((bb) => bb.amt > 0)) { for (const bb of s.mud) bb.amt = 0; this.renderMud(s); }
      if (s.fluff < 1) s.fluff = 1;
      const ch = s.char;
      const aud = Math.min(250, (W - 160) / n);
      ch.scale = n > 5 ? 0.72 : 0.92; ch.x = W / 2 + (i - (n - 1) / 2) * aud; ch.y = 1066; ch.facing = 1; ch.snap();
      ch.setPose('clap');
    });
    this.banner = { text: 'Pet Parade!', t: 0 };
    sfx('fanfare'); snd('applause', 'cheer');
    // Camera: start close on the stage entrance, then pull back as the pets line up.
    const cam = this.api.camera;
    if (cam) { cam.x = 620; cam.y = 640; cam.zoom = 1.25; cam.follow(760, 640, 1.2, 1.4); }
  }

  updateParade(dt) {
    const t = this.phaseT;
    const cam = this.api.camera;
    if (cam) {
      const lead = this.stations.reduce((mx, s) => Math.max(mx, s.pet.x), -Infinity);
      if (t < 3.4) cam.follow(clamp(lead, 600, W - 600), 640, 1.2, 1.6);
      else cam.follow(W / 2, H / 2, 1, 1.2);
    }
    this.stations.forEach((s, i) => {
      const pet = s.pet;
      if (!s.arrived) {
        if (t > 0.4 + i * 0.25) {
          const dx = s.paradeX - pet.x;
          const v = Math.sign(dx) * Math.min(Math.abs(dx) / dt, 620);
          pet.x += v * dt;
          pet.moveAnim(v, 0, 620);
          if (Math.abs(dx) < 2) {
            s.arrived = true; pet.x = s.paradeX; pet.facing = i < this.stations.length / 2 ? 1 : -1;
            pet.playOnce('bow', 0.7, 'celebrate');
            particles.burst(pet.x, pet.y - pet.height * 0.6, { type: 'sparkle', count: 12 });
            sfx('collect', { step: i * 2 });
          }
        }
      } else if (chance(dt * 0.4)) pet.emote('heart', 1);
      pet.update(dt);
      const ch = s.char;
      if (chance(dt * 0.8)) ch.playOnce(pick(['cheer', 'cheer', 'wave']), 0.6, 'clap');
      ch.update(dt);
    });
    if (t > 3.6 && !this.paradeConfetti) {
      this.paradeConfetti = true;
      particles.confettiRain(W, 160); sfx('yay'); snd('applause', 'cheer');
      fx.flash('#ffffff', 0.15);
    }
    if (t > 3.6 && chance(dt * 2.5)) {
      const x = rand(200, W - 200), y = rand(180, 420);
      particles.burst(x, y, { type: pick(['star', 'heart', 'sparkle']), count: 10 });
    }
    if (t > 8.5) this.finishGame();
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;
    const cares = this.stations.map((s) => s.care + s.acc.length * 2 + s.treats * 2 + (s.done ? 10 : 0));
    const highlight = this.players.length > 1 ? showstopper(this.players, cares) : null;
    const stats = this.stations.map((s) => {
      const bits = [];
      if (s.acc.length) bits.push(`${s.acc.length} bow${s.acc.length > 1 ? 's' : ''}`);
      if (s.treats) bits.push(`${s.treats} treat${s.treats > 1 ? 's' : ''}`);
      return `${s.def.name}${bits.length ? ' · ' + bits.join(', ') : ''}`;
    });
    const hs = highlight !== null ? this.stations[highlight] : null;
    const focus = this.phase === 'parade' ? (hs ? { x: hs.pet.x, y: hs.pet.y - hs.pet.height * 0.5, zoom: 1.3 } : { x: W / 2, y: 640, zoom: 1.15 }) : undefined;
    this.api.finish({ showcase: true, highlight, stats, title: 'So Sparkly!', focus });
  }

  postUpdate(dt) {
    this.t += dt;
    for (const s of this.stations) { s.pet.update(dt); s.char.update(dt); }
  }

  onDone() {
    if (this.phase === 'spa') {
      // Make every pet presentable for the show.
      this.startParade();
    } else this.finishGame();
  }

  stepDone(s, id) {
    const q = this.parts(s);
    switch (id) {
      case 'sponge': return q.clean >= 0.985;
      case 'shower': return s.wasWet && q.rinse >= 0.97;
      case 'towel': return s.wasWet && s.wet <= 0;
      case 'brush': return s.fluff >= 1;
      case 'bow': return s.acc.length > 0;
      case 'treat': return s.treats > 0;
      default: return false;
    }
  }
}
