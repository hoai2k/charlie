// Sprite Workbench: view every sprite frame as the game draws it, with its
// landmarks and outfit items, adjust them, and download the edits as JSON
// (README.md). It uses the game's own engine modules, so frames, landmarks
// and outfit placement are exactly what the game computes.
import { loadSprites, ensureSpriteSet, getSpriteSet, getBaseImage, frameBodyHeight, indexedSpriteSets, getImageQuality } from '../src/engine/sprites.js';
import { loadArt } from '../src/engine/art.js';
import { CATS, PALETTE, outfitItem, outfitAnchors, baseAttach, drawOutfit, drawOutfitItem } from '../src/engine/outfits.js';
import { setOutfitFit, outfitFit, adjustSlot } from '../src/engine/outfit-fit.js';
import { OUTFIT_FIT } from '../src/data/outfit-fit.js';
import { ALL_ENTRIES } from '../src/data/characters.js';
import { Session, parseEdits, formatEdits, lmKey, itemKey, POINTS, SLOTS, IDENTITY, samePt } from './edits.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return e;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r4 = (v) => Math.round(v * 10000) / 10000;
const DEG = 180 / Math.PI;
const fmt = (v, d = 3) => (Number.isFinite(v) ? (+v.toFixed(d)).toString() : '–');
const fmtPt = (p) => (p ? `${fmt(p[0], 1)}, ${fmt(p[1], 1)}` : 'none');

// ---------------------------------------------------------------------------
// Constants

const LM = {
  anchor: { color: '#ff3b6b', label: 'feet', desc: 'Foot anchor: the ground point (frame pixels).' },
  head: { color: '#ffc400', label: 'head', desc: 'Top-centre of the skull, where a hat brim rests.' },
  eyes: { color: '#2f9bff', label: 'eyes', desc: 'Between the eyes (bridge of the nose).' },
  neck: { color: '#a463ff', label: 'neck', desc: 'Base of the neck / collar line, where a necklace hangs.' },
  back: { color: '#20b26a', label: 'back', desc: 'Between the shoulder blades, where wings or a cape attach.' },
  hand: { color: '#ff7a1a', label: 'hand', desc: 'Grip point of the forward hand (quadrupeds: the mouth).' },
  // body map (tools/sprites/bodymap.py measures these; an edit becomes a reviewed override)
  belly: { color: '#0050ff', label: 'belly', desc: 'Middle of the torso (body map: stuck-on items attach to the nearest part).' },
  tail: { color: '#222222', label: 'tail', desc: 'Middle of the tail (body map).' },
  earFront: { color: '#ff40ff', label: 'ear F', desc: 'The ear further in the facing direction (body map).' },
  earBack: { color: '#a040ff', label: 'ear B', desc: 'The other ear (body map).' },
  footFront: { color: '#e0e0e0', label: 'foot F', desc: 'The forward foot / front paws on the ground (body map).' },
  footBack: { color: '#808080', label: 'foot B', desc: 'The back foot / hind paws (body map).' },
};
const SLOT_COLOR = { head: '#ffc400', face: '#2f9bff', neck: '#a463ff', back: '#20b26a', hand: '#ff7a1a', aura: '#ff5fc8' };
// Items are hit-tested topmost first (the front layer order of drawOutfit, reversed).
const HIT_ORDER = ['hand', 'head', 'face', 'neck', 'back', 'aura'];
const BACKDROPS = [
  { name: 'Checker' }, { name: 'Light', color: '#f4f1fa' }, { name: 'Dark', color: '#1b1030' }, { name: 'Green', color: '#00b140' }, { name: 'Sky', color: '#bfe9ff' },
];
const SCOPES = [
  { id: 'frame', label: 'This frame' }, { id: 'pose', label: 'All frames of pose' }, { id: 'set', label: 'Whole set' },
];
const SESSION_KEY = 'party.workbench.session.v1';
const UI_KEY = 'party.workbench.ui.v1';
const coarse = matchMedia('(pointer: coarse)').matches;
const HANDLE_R = coarse ? 10 : 7;
const HIT_R = coarse ? 24 : 12;

// ---------------------------------------------------------------------------
// Sets: every sprite set, with the member definition the game uses for it.

const SETS = [];
for (const entry of ALL_ENTRIES) {
  entry.members.forEach((def, member) => {
    if (!SETS.some((s) => s.asset === def.asset)) SETS.push({ asset: def.asset, def, entry, member, npc: !!entry.npc });
  });
}
const setInfo = (asset) => SETS.find((s) => s.asset === asset);

// ---------------------------------------------------------------------------
// State

const st = {
  asset: null, pose: null, fi: 0,
  facing: 1, backdrop: 0, showLm: true, showOutfit: true, ghosts: true,
  Z: 2, panX: 0, panY: 0,
  playing: false, clock: 0, frameClock: 0,
  outfit: {},          // slot -> { id, colour }
  sel: null,           // { kind: 'lm', point } | { kind: 'item', slot }
  scope: 'frame', anyItem: false,
  hover: null,         // frame px under the pointer
  editsHere: false,
};
let artReady = false;
const stale = new Set();   // landmark keys whose `from` differs from the current sprites.json

const BASE_FIT = new Map(OUTFIT_FIT.map((e) => [itemKey(normEntry(e)), normEntry(e)]));
function normEntry(e) {
  const pose = e.pose ?? '*';
  return { set: e.set, pose, frame: pose === '*' ? '*' : e.frame ?? '*', slot: e.slot, item: e.item ?? '*', dx: e.dx ?? 0, dy: e.dy ?? 0, rot: e.rot ?? 0, scale: e.scale ?? 1, ...(e.src ? { src: e.src } : {}) };
}

const session = new Session(onSessionChange);

// ---------------------------------------------------------------------------
// Engine sync: landmark edits are written into the loaded frame records and
// item fits into the outfit-fit table, so the engine draws them like the game would.

/** The sprites.json value of a landmark (same precedence as the engine: frame, pose, set anchor). */
function originalPoint(set, pose, index, point) {
  const def = set.manifest.poses[pose];
  if (!def || typeof def !== 'object') return null;
  const raw = (def.frames || [])[index];
  const fo = typeof raw === 'string' ? { src: raw } : Array.isArray(raw) ? { rect: raw } : raw || {};
  const v = fo[point] || def[point] || (point === 'anchor' ? set.manifest.anchor : null);
  return Array.isArray(v) ? [v[0], v[1]] : null;
}
function framesOf(set, pose, index) {
  const sp = set.poses[pose];
  return sp ? sp.frames.filter((f) => f.pose === pose && f.index === index) : [];
}
function syncLandmark(key) {
  const [asset, pose, idx, point] = key.split('|');
  const set = getSpriteSet(asset);
  if (!set) return;
  const e = session.get('landmarks', key), index = +idx;
  const v = e ? e.to : originalPoint(set, pose, index, point);
  for (const f of framesOf(set, pose, index)) f[point] = v ? [v[0], v[1]] : v;
}
/** After a set loads: apply this session's landmark edits to it and flag stale ones. */
function syncSet(asset) {
  const set = getSpriteSet(asset);
  if (!set) return;
  for (const e of session.entries('landmarks')) {
    if (e.set !== asset) continue;
    const k = lmKey(e);
    syncLandmark(k);
    const orig = originalPoint(set, e.pose, e.frame, e.point);
    if (!samePt(orig, e.from)) stale.add(k); else stale.delete(k);
  }
}
function mergedFit() {
  const m = new Map(BASE_FIT);
  for (const e of session.entries('items')) m.set(itemKey(e), e);
  return m;
}
function syncFit() { setOutfitFit([...mergedFit().values()]); }

function onSessionChange(changes, reason) {
  let items = false;
  for (const c of changes) {
    if (c.kind === 'landmarks') { syncLandmark(c.key); stale.delete(c.key); }
    else items = true;
  }
  if (items) syncFit();
  invalidate();
  renderInspector();
  if (reason !== 'live') { autosave(); renderEdits(); markDirty(); renderHistory(); }
}

// ---------------------------------------------------------------------------
// The current view: frame, scales and attachment info (as Actor._attachInfo builds it).

function current() {
  const set = getSpriteSet(st.asset), sp = set && set.poses[st.pose];
  if (!sp || !sp.frames.length) return null;
  const fr = sp.frames[clamp(st.fi, 0, sp.frames.length - 1)];
  const si = setInfo(st.asset), def = si.def;
  const anchor = fr.anchor || set.anchor;
  const a0 = originalPoint(set, fr.pose, fr.index, 'anchor') || anchor;
  const bodyH = frameBodyHeight(sp, fr, set.bodyHeight);
  const pxScale = def.h / bodyH;
  const imgFlip = (sp.facing ?? set.facing) === -1 ? -1 : 1;
  const flipX = st.facing * imgFlip;
  const v = { set, sp, fr, si, def, anchor, a0, bodyH, pxScale, imgFlip, flipX, s: st.Z * pxScale };
  v.info = attachInfo(v);
  v.A = outfitAnchors(def, v.info);
  v.items = placements(v);
  return v;
}
function attachInfo({ def, sp, fr, anchor, pxScale, imgFlip, si }) {
  const h = def.h;
  const base = getBaseImage(def.asset);
  const aspect = base ? base.width / base.height : 0.6;
  let head = { x: (def.face[0] - aspect / 2) * h * imgFlip, y: -(def.top ?? 1) * h };
  let hand = { x: 0.28 * h, y: -0.5 * h };
  const [, fcy, frr] = def.face;
  let eyes = { x: head.x, y: -(1 - fcy) * h };
  let neck = { x: head.x, y: -(1 - Math.min(0.95, fcy + frr * 0.95)) * h };
  let back = { x: -0.12 * h, y: -0.58 * h };
  const conv = (pt) => ({ x: (pt[0] - anchor[0]) * pxScale * imgFlip, y: (pt[1] - anchor[1]) * pxScale });
  if (fr.head) head = conv(fr.head);
  if (fr.hand) hand = conv(fr.hand);
  if (fr.eyes) eyes = conv(fr.eyes);
  if (fr.neck) neck = conv(fr.neck);
  if (fr.back) back = conv(fr.back);
  return { h, w: aspect * h, head, hand, eyes, neck, back, headAngle: fr.headAngle || 0, pose: st.pose, facing: st.facing, member: si.member, frame: fr };
}
/** Where each worn item sits: base (computed attach point) and adjusted (with the fit table). */
function placements(v) {
  const out = {};
  for (const slot of SLOTS) {
    const w = st.outfit[slot], item = w && outfitItem(w.id);
    if (!item) continue;
    const b = baseAttach(v.def, v.info, slot, item);
    const base = { x: b.x, y: b.y, rot: b.rot, S: b.scale, box: b.box || null, quad: !!b.sideCape };
    const adj = outfitFit(st.asset, v.fr, slot, item.id);
    const at = adjustSlot(base, adj);
    if (adj && base.box) at.box = { w: base.box.w * adj.scale, h: base.box.h * adj.scale };
    let hidden = null;
    if (slot === 'face' && v.A.faceHidden) hidden = 'Face items hide on this frame (no eyes: turned away).';
    if (slot === 'aura' && v.info.member !== 0) hidden = 'Auras draw once per character, on the group leader only.';
    out[slot] = { slot, item, colour: w.colour, base, at, hidden };
  }
  return out;
}

// Coordinates: frame px <-> screen (CSS px) <-> forward space (game px at scale 1, origin at the feet).
const view = { W: 0, H: 0, dpr: 1 };
const center = () => ({ x: view.W / 2 + st.panX, y: view.H * 0.55 + st.panY });
function frameToScreen(v, fx, fy) { const c = center(); return { x: c.x + v.s * v.flipX * (fx - v.a0[0]), y: c.y + v.s * (fy - v.a0[1]) }; }
function screenToFrame(v, x, y) { const c = center(); return { x: v.a0[0] + (x - c.x) / (v.s * v.flipX), y: v.a0[1] + (y - c.y) / v.s }; }
function fwdToFrame(v, p) { return { x: v.anchor[0] + p.x * v.imgFlip / v.pxScale, y: v.anchor[1] + p.y / v.pxScale }; }
function frameToFwd(v, p) { return { x: (p.x - v.anchor[0]) * v.pxScale * v.imgFlip, y: (p.y - v.anchor[1]) * v.pxScale }; }
const fwdToScreen = (v, p) => { const f = fwdToFrame(v, p); return frameToScreen(v, f.x, f.y); };
const screenToFwd = (v, x, y) => frameToFwd(v, screenToFrame(v, x, y));

// ---------------------------------------------------------------------------
// Drawing

const canvas = $('view');
const g = canvas.getContext('2d');
const hitCanvas = document.createElement('canvas');
const hg = hitCanvas.getContext('2d', { willReadFrequently: true });
let checker = null;
let needsDraw = true;
const invalidate = () => { needsDraw = true; };

function resize() {
  const r = canvas.getBoundingClientRect();
  view.W = Math.max(1, r.width); view.H = Math.max(1, r.height); view.dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(view.W * view.dpr); canvas.height = Math.round(view.H * view.dpr);
  invalidate();
}
function checkerPattern() {
  if (checker) return checker;
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#e4e0ec'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8);
  checker = g.createPattern(c, 'repeat');
  return checker;
}
/** Put a context into frame-pixel space (origin at the frame's top-left). */
function frameTransform(c, v, k = view.dpr) {
  const ce = center();
  c.setTransform(k * v.s * v.flipX, 0, 0, k * v.s, k * (ce.x - v.s * v.flipX * v.a0[0]), k * (ce.y - v.s * v.a0[1]));
}
/** From frame space into the attachment's forward space. */
function toForward(c, v) { c.translate(v.anchor[0], v.anchor[1]); c.scale(v.imgFlip / v.pxScale, 1 / v.pxScale); }
const outfitList = () => SLOTS.map((s) => st.outfit[s]).filter((w) => w && outfitItem(w.id));
const animT = () => (st.playing ? st.clock : 0);

function draw() {
  needsDraw = false;
  const { W, H, dpr } = view;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bd = BACKDROPS[st.backdrop];
  g.fillStyle = bd.color || checkerPattern();
  g.fillRect(0, 0, W, H);
  const v = current();
  updateHud(v);
  if (!v) {
    g.fillStyle = '#6b6382'; g.font = '16px system-ui'; g.textAlign = 'center';
    g.fillText('Loading…', W / 2, H / 2);
    return;
  }
  const { fr } = v;
  // ground and target-height guides (game h above the feet)
  const feet = frameToScreen(v, v.anchor[0], v.anchor[1]), top = frameToScreen(v, v.anchor[0], v.anchor[1] - v.bodyH);
  g.save();
  g.lineWidth = 1; g.strokeStyle = bd.color === '#1b1030' ? '#ffffff55' : '#24163f44';
  g.setLineDash([6, 6]);
  g.beginPath(); g.moveTo(0, Math.round(feet.y) + 0.5); g.lineTo(W, Math.round(feet.y) + 0.5); g.stroke();
  g.beginPath(); g.moveTo(feet.x - 60, Math.round(top.y) + 0.5); g.lineTo(feet.x + 60, Math.round(top.y) + 0.5); g.stroke();
  g.restore();

  const outfit = outfitList(), t = animT();
  frameTransform(g, v);
  g.imageSmoothingEnabled = v.s < 6;
  if (st.showOutfit && outfit.length) { g.save(); toForward(g, v); drawOutfit(g, v.def, v.info, outfit, { layer: 'back', t }); g.restore(); }
  if (fr.img) {
    const sw = fr.rect ? fr.rect[2] : fr.w, sh = fr.rect ? fr.rect[3] : fr.h;
    if (fr.rect) g.drawImage(fr.img, fr.rect[0], fr.rect[1], sw, sh, 0, 0, sw, sh);
    else g.drawImage(fr.img, 0, 0, sw, sh);
    if (v.s >= 10) drawPixelGrid(v, sw, sh);
  }
  if (st.showOutfit && outfit.length) { g.save(); toForward(g, v); drawOutfit(g, v.def, v.info, outfit, { layer: 'front', t }); g.restore(); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = true;
  if (st.showLm) drawLandmarks(v);
  if (st.showOutfit) drawItemHandles(v);
}

function drawPixelGrid(v, w, h) {
  // faint pixel grid when zoomed far in (landmarks snap to whole pixels)
  const p0 = screenToFrame(v, 0, 0), p1 = screenToFrame(v, view.W, view.H);
  const x0 = Math.max(0, Math.floor(Math.min(p0.x, p1.x))), x1 = Math.min(w, Math.ceil(Math.max(p0.x, p1.x)));
  const y0 = Math.max(0, Math.floor(p0.y)), y1 = Math.min(h, Math.ceil(p1.y));
  g.save();
  g.lineWidth = 1 / v.s; g.strokeStyle = 'rgba(36,22,63,0.12)';
  g.beginPath();
  for (let x = x0; x <= x1; x++) { g.moveTo(x, y0); g.lineTo(x, y1); }
  for (let y = y0; y <= y1; y++) { g.moveTo(x0, y); g.lineTo(x1, y); }
  g.stroke();
  g.restore();
}

function dot(x, y, r, fill, stroke = '#fff', lw = 2) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
function label(text, x, y, color) {
  g.font = '600 12px system-ui, sans-serif';
  const w = g.measureText(text).width + 8;
  g.fillStyle = 'rgba(255,255,255,0.88)'; g.beginPath(); g.roundRect(x, y - 9, w, 18, 4); g.fill();
  g.fillStyle = color; g.fillText(text, x + 4, y + 4);
}

function drawLandmarks(v) {
  const { set, fr } = v;
  g.save();
  g.textAlign = 'left';
  for (const point of POINTS) {
    const p = fr[point];
    if (!p) continue;
    const key = lmKey({ set: st.asset, pose: fr.pose, frame: fr.index, point });
    const s = frameToScreen(v, p[0] + 0.5 * 0, p[1]);
    const orig = originalPoint(set, fr.pose, fr.index, point);
    const edited = session.get('landmarks', key) && !samePt(orig, p);
    const color = LM[point].color, selected = st.sel && st.sel.kind === 'lm' && st.sel.point === point;
    if (edited && st.ghosts && orig) {
      const o = frameToScreen(v, orig[0], orig[1]);
      g.setLineDash([4, 4]); g.lineWidth = 1.5; g.strokeStyle = color;
      g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(s.x, s.y); g.stroke(); g.setLineDash([]);
      g.globalAlpha = 0.55; dot(o.x, o.y, HANDLE_R - 2, null, color, 2); g.globalAlpha = 1;
    }
    if (point === 'anchor') {
      g.lineWidth = 2; g.strokeStyle = color;
      g.beginPath(); g.moveTo(s.x - 14, s.y); g.lineTo(s.x + 14, s.y); g.moveTo(s.x, s.y - 14); g.lineTo(s.x, s.y + 6); g.stroke();
    }
    if (selected) dot(s.x, s.y, HANDLE_R + 5, null, color, 2);
    dot(s.x, s.y, HANDLE_R, color, edited ? '#24163f' : '#fff', 2);
    label(LM[point].label + (edited ? ' *' : ''), s.x + HANDLE_R + 4, s.y - HANDLE_R - 4, '#24163f');
  }
  g.restore();
}

function drawItemHandles(v) {
  g.save();
  for (const slot of SLOTS) {
    const p = v.items[slot];
    if (!p) continue;
    const selected = st.sel && st.sel.kind === 'item' && st.sel.slot === slot;
    const color = SLOT_COLOR[slot];
    const a = fwdToScreen(v, p.at);
    if (selected) {
      // computed attach point (before the fit adjustment) and the offset to the adjusted one
      const b = fwdToScreen(v, p.base);
      g.lineWidth = 1.5; g.strokeStyle = color; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(a.x, a.y); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.moveTo(b.x - 8, b.y); g.lineTo(b.x + 8, b.y); g.moveTo(b.x, b.y - 8); g.lineTo(b.x, b.y + 8);
      g.lineWidth = 2; g.strokeStyle = '#24163f'; g.stroke();
      const hs = itemHandles(v, p);
      g.lineWidth = 2; g.strokeStyle = color;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(hs.rot.x, hs.rot.y); g.moveTo(a.x, a.y); g.lineTo(hs.scale.x, hs.scale.y); g.stroke();
      g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 4;
      dot(hs.rot.x, hs.rot.y, HANDLE_R + 1, '#fff', color, 3);
      g.fillStyle = '#fff'; g.strokeStyle = color; g.lineWidth = 3;
      g.beginPath(); g.rect(hs.scale.x - HANDLE_R, hs.scale.y - HANDLE_R, HANDLE_R * 2, HANDLE_R * 2); g.fill(); g.stroke();
      g.shadowBlur = 0;
      label('rotate', hs.rot.x + HANDLE_R + 4, hs.rot.y, '#24163f');
      label('scale', hs.scale.x + HANDLE_R + 4, hs.scale.y, '#24163f');
    }
    // the item's (adjusted) attach point: a diamond
    const r = selected ? HANDLE_R + 1 : HANDLE_R - 2;
    g.save(); g.translate(a.x, a.y); g.rotate(Math.PI / 4);
    g.globalAlpha = p.hidden ? 0.4 : 1;
    g.fillStyle = color; g.strokeStyle = selected ? '#24163f' : '#fff'; g.lineWidth = 2;
    g.beginPath(); g.rect(-r, -r, r * 2, r * 2); g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
}
/** Screen positions of the rotate (round) and scale (square) handles of an item. */
function itemHandles(v, p) {
  const L = clamp(p.at.S * st.Z * 0.75, 64, 200) / st.Z, r = p.at.rot;   // outside the item, in game px
  const up = { x: p.at.x + Math.sin(r) * L, y: p.at.y - Math.cos(r) * L };
  const side = { x: p.at.x + Math.cos(r) * L * 0.8, y: p.at.y + Math.sin(r) * L * 0.8 };
  return { rot: fwdToScreen(v, up), scale: fwdToScreen(v, side), rotFwd: up, scaleFwd: side };
}

/** Is the item drawn at this screen point? (draws it alone and reads the pixel) */
function itemAt(v, slot, x, y) {
  const p = v.items[slot];
  if (!p || p.hidden) return false;
  if (hitCanvas.width !== Math.ceil(view.W) || hitCanvas.height !== Math.ceil(view.H)) { hitCanvas.width = Math.ceil(view.W); hitCanvas.height = Math.ceil(view.H); }
  hg.setTransform(1, 0, 0, 1, 0, 0);
  hg.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
  frameTransform(hg, v, 1);
  toForward(hg, v);
  hg.translate(p.at.x, p.at.y);
  if (p.at.rot) hg.rotate(p.at.rot);
  if (p.base.quad) { hg.beginPath(); hg.ellipse(0, p.at.S * 0.3, p.at.S * 0.5, p.at.S * 0.4, 0, 0, Math.PI * 2); hg.fill(); }
  else {
    drawOutfitItem(hg, p.item, p.colour, p.at.S, animT(), { layer: 'front', box: p.at.box });
    if (slot !== 'aura') drawOutfitItem(hg, p.item, p.colour, p.at.S, animT(), { layer: 'back', box: p.at.box });
  }
  const px = Math.floor(x), py = Math.floor(y);
  if (px < 0 || py < 0 || px >= hitCanvas.width || py >= hitCanvas.height) return false;
  return hg.getImageData(px, py, 1, 1).data[3] > 24;
}

/** What is under a screen point: a handle, landmark, item or nothing. */
function hitTest(v, x, y) {
  const near = (p, r = HIT_R) => Math.hypot(p.x - x, p.y - y) <= r;
  if (st.showOutfit && st.sel && st.sel.kind === 'item' && v.items[st.sel.slot]) {
    const p = v.items[st.sel.slot], hs = itemHandles(v, p);
    if (near(hs.rot)) return { kind: 'rotate', slot: p.slot };
    if (near(hs.scale)) return { kind: 'scale', slot: p.slot };
  }
  if (st.showLm) {
    let best = null, bd = HIT_R;
    for (const point of POINTS) {
      const p = v.fr[point];
      if (!p) continue;
      const s = frameToScreen(v, p[0], p[1]), d = Math.hypot(s.x - x, s.y - y);
      if (d <= bd) { best = point; bd = d; }
    }
    if (best) return { kind: 'lm', point: best };
  }
  if (st.showOutfit) {
    for (const slot of HIT_ORDER) if (v.items[slot] && near(fwdToScreen(v, v.items[slot].at))) return { kind: 'item', slot };
    for (const slot of HIT_ORDER) if (slot !== 'aura' && itemAt(v, slot, x, y)) return { kind: 'item', slot };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Editing

function lmTarget(v, point) { return { set: st.asset, pose: v.fr.pose, frame: v.fr.index, point }; }
function setLandmark(v, point, to) {
  const t = lmTarget(v, point), key = lmKey(t), from = originalPoint(v.set, t.pose, t.frame, point);
  to = [Math.round(to[0]), Math.round(to[1])];
  if (samePt(from, to)) session.set('landmarks', key, undefined);
  else session.set('landmarks', key, { ...t, src: v.fr.src || null, from, to });
}
function itemTarget(v, slot) {
  const p = v.items[slot];
  const pose = st.scope === 'set' ? '*' : v.fr.pose, frame = st.scope === 'frame' ? v.fr.index : '*';
  const t = { set: st.asset, pose, frame, slot, item: st.anyItem ? '*' : p.item.id };
  if (st.scope === 'frame' && v.fr.src) t.src = v.fr.src;
  return t;
}
const level = (e) => (e.pose === '*' ? 0 : e.frame === '*' ? 2 : 4) + (e.item === '*' ? 0 : 1);
/** The fit entry that applies to a slot/item on a frame (most specific match), or null. */
function effectiveEntry(fr, slot, itemId) {
  let best = null;
  for (const e of mergedFit().values()) {
    if (e.set !== st.asset || e.slot !== slot) continue;
    if (e.item !== '*' && e.item !== itemId) continue;
    if (e.pose !== '*' && e.pose !== fr.pose) continue;
    if (e.frame !== '*' && e.frame !== fr.index) continue;
    if (!best || level(e) > level(best)) best = e;
  }
  return best;
}
/** The fit value at the edit target: its own entry, else what the frame inherits. */
function valueAt(v, t) {
  const own = mergedFit().get(itemKey(t));
  const e = own || effectiveEntry(v.fr, t.slot, v.items[t.slot].item.id);
  return e ? { dx: e.dx, dy: e.dy, rot: e.rot, scale: e.scale } : { ...IDENTITY };
}
function setItemValue(t, val) {
  session.set('items', itemKey(t), { ...t, dx: r4(val.dx), dy: r4(val.dy), rot: r4(val.rot), scale: r4(Math.max(0.05, val.scale)) });
}
function resetSelection(v) {
  if (!st.sel) return;
  if (st.sel.kind === 'lm') {
    session.begin('Reset ' + st.sel.point);
    session.set('landmarks', lmKey(lmTarget(v, st.sel.point)), undefined);
    session.commit();
    return;
  }
  const p = v.items[st.sel.slot];
  if (!p) return;
  const t = itemTarget(v, p.slot), key = itemKey(t);
  session.begin('Reset ' + p.item.name);
  if (session.get('items', key)) session.set('items', key, undefined);
  if (mergedFit().get(key)) setItemValue(t, IDENTITY);   // the checked-in table has one: override it with no change
  session.commit();
}
function nudge(v, dxs, dys) {
  // dxs, dys: screen direction, in frame pixels
  if (!st.sel) return;
  const dfx = dxs * v.flipX, dfy = dys;
  if (st.sel.kind === 'lm') {
    const p = v.fr[st.sel.point];
    if (!p) return;
    session.begin('Nudge ' + st.sel.point, 'nudge-lm-' + st.sel.point);
    setLandmark(v, st.sel.point, [p[0] + dfx, p[1] + dfy]);
    session.commit();
  } else {
    const p = v.items[st.sel.slot];
    if (!p) return;
    const t = itemTarget(v, p.slot), val = valueAt(v, t);
    const f = { x: dfx * v.pxScale * v.imgFlip, y: dfy * v.pxScale };
    const l = rotate(f, -p.base.rot);
    session.begin('Nudge ' + p.item.name, 'nudge-item-' + itemKey(t));
    setItemValue(t, { ...val, dx: val.dx + l.x / p.base.S, dy: val.dy + l.y / p.base.S });
    session.commit();
  }
}
function rotateItem(v, deg) {
  const p = st.sel && st.sel.kind === 'item' && v.items[st.sel.slot];
  if (!p) return;
  const t = itemTarget(v, p.slot), val = valueAt(v, t);
  session.begin('Rotate ' + p.item.name, 'rot-' + itemKey(t));
  setItemValue(t, { ...val, rot: val.rot + deg * st.facing });   // ] turns clockwise on screen either way
  session.commit();
}
function scaleItem(v, k) {
  const p = st.sel && st.sel.kind === 'item' && v.items[st.sel.slot];
  if (!p) return;
  const t = itemTarget(v, p.slot), val = valueAt(v, t);
  session.begin('Scale ' + p.item.name, 'scale-' + itemKey(t));
  setItemValue(t, { ...val, scale: val.scale * k });
  session.commit();
}
const rotate = (p, a) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

// ---------------------------------------------------------------------------
// Pointer: drag handles, pan, pinch

const pointers = new Map();
let drag = null;   // { kind, ... }
let spaceDown = false, spaceUsed = false;

function canvasPoint(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

canvas.addEventListener('pointerdown', (e) => {
  canvas.focus({ preventScroll: true });
  const p = canvasPoint(e);
  pointers.set(e.pointerId, p);
  canvas.setPointerCapture(e.pointerId);
  if (pointers.size === 2) {
    // second finger: pinch zoom (finish a drag the first finger started)
    if (drag && drag.edit) session.commit();
    const [a, b] = [...pointers.values()];
    drag = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, Z0: st.Z, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, pan0: { x: st.panX, y: st.panY } };
    return;
  }
  if (pointers.size > 2) return;
  const v = current();
  if (!v) return;
  if (spaceDown || e.button === 1 || e.button === 2) { drag = { kind: 'pan', start: p, pan0: { x: st.panX, y: st.panY }, moved: false }; spaceUsed = true; setCursor('grabbing'); return; }
  const hit = hitTest(v, p.x, p.y);
  if (hit && st.playing) setPlaying(false);
  if (!hit) { drag = { kind: 'pan', start: p, pan0: { x: st.panX, y: st.panY }, moved: false, deselect: true }; setCursor('grabbing'); return; }
  if (hit.kind === 'lm') {
    select({ kind: 'lm', point: hit.point });
    session.begin('Move ' + hit.point);
    drag = { kind: 'lm', point: hit.point, edit: true, start: screenToFrame(v, p.x, p.y), orig: [...v.fr[hit.point]] };
  } else {
    select({ kind: 'item', slot: hit.slot });
    const pl = v.items[hit.slot], t = itemTarget(v, hit.slot), val = valueAt(v, t);
    const fwd = screenToFwd(v, p.x, p.y);
    const label = { item: 'Move ', rotate: 'Rotate ', scale: 'Scale ' }[hit.kind] + pl.item.name;
    session.begin(label);
    drag = { kind: hit.kind, slot: hit.slot, edit: true, t, val, start: fwd, at: { ...pl.at }, base: pl.base };
    if (hit.kind === 'rotate') drag.a0 = Math.atan2(fwd.y - pl.at.y, fwd.x - pl.at.x);
    if (hit.kind === 'scale') drag.d0 = Math.hypot(fwd.x - pl.at.x, fwd.y - pl.at.y) || 1;
  }
  setCursor('move');
});

canvas.addEventListener('pointermove', (e) => {
  const p = canvasPoint(e);
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
  const v = current();
  if (v) { const f = screenToFrame(v, p.x, p.y); st.hover = [f.x, f.y]; }
  if (!drag) {
    if (v && e.pointerType === 'mouse') { const hit = hitTest(v, p.x, p.y); setCursor(spaceDown ? 'grab' : hit ? 'move' : 'grab'); }
    updateHud(v);
    return;
  }
  if (drag.kind === 'pinch') {
    const [a, b] = [...pointers.values()];
    if (!b) return;
    const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    st.panX = drag.pan0.x; st.panY = drag.pan0.y;
    zoomAt(drag.m0.x, drag.m0.y, clamp(drag.Z0 * d / drag.d0, 0.2, 40) / st.Z, false);
    st.panX += m.x - drag.m0.x; st.panY += m.y - drag.m0.y;
    invalidate();
    return;
  }
  if (drag.kind === 'pan') {
    const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
    if (Math.hypot(dx, dy) > 3) drag.moved = true;
    st.panX = drag.pan0.x + dx; st.panY = drag.pan0.y + dy;
    invalidate();
    return;
  }
  if (!v) return;
  if (drag.kind === 'lm') {
    const f = screenToFrame(v, p.x, p.y);
    setLandmark(v, drag.point, [drag.orig[0] + (f.x - drag.start.x), drag.orig[1] + (f.y - drag.start.y)]);
    return;
  }
  const fwd = screenToFwd(v, p.x, p.y);
  if (drag.kind === 'item') {
    const l = rotate({ x: fwd.x - drag.start.x, y: fwd.y - drag.start.y }, -drag.base.rot);
    setItemValue(drag.t, { ...drag.val, dx: drag.val.dx + l.x / drag.base.S, dy: drag.val.dy + l.y / drag.base.S });
  } else if (drag.kind === 'rotate') {
    const a = Math.atan2(fwd.y - drag.at.y, fwd.x - drag.at.x);
    let rot = drag.val.rot + (a - drag.a0) * DEG;
    rot = ((rot + 540) % 360) - 180;
    if (e.shiftKey) rot = Math.round(rot / 15) * 15; else rot = Math.round(rot * 10) / 10;
    setItemValue(drag.t, { ...drag.val, rot });
  } else if (drag.kind === 'scale') {
    const d = Math.hypot(fwd.x - drag.at.x, fwd.y - drag.at.y);
    let scale = drag.val.scale * d / drag.d0;
    scale = e.shiftKey ? Math.round(scale * 10) / 10 : Math.round(scale * 100) / 100;
    setItemValue(drag.t, { ...drag.val, scale: clamp(scale, 0.1, 5) });
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (!drag) return;
  if (drag.kind === 'pinch') { if (pointers.size < 2) drag = null; return; }
  if (drag.edit) session.commit();
  if (drag.kind === 'pan' && drag.deselect && !drag.moved) select(null);
  drag = null;
  setCursor('grab');
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', (e) => { if (drag && drag.edit) session.cancel(); drag = null; pointers.delete(e.pointerId); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerleave', () => { st.hover = null; updateHud(current()); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  if (e.ctrlKey || e.metaKey || e.deltaMode !== 0 || Math.abs(e.deltaX) < 1) {
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)));
  } else { st.panX -= e.deltaX; st.panY -= e.deltaY; invalidate(); }
}, { passive: false });
function setCursor(c) { canvas.className = c; }

function zoomAt(x, y, k, redraw = true) {
  const v = current();
  const Z = clamp(st.Z * k, 0.2, 40);
  if (!v) { st.Z = Z; return; }
  const c = center(), wx = (x - c.x) / st.Z, wy = (y - c.y) / st.Z;
  st.Z = Z;
  const nc = { x: x - wx * Z, y: y - wy * Z };
  st.panX = nc.x - view.W / 2; st.panY = nc.y - view.H * 0.55;
  if (redraw) { invalidate(); saveUi(); }
}
function zoomBy(k) { zoomAt(view.W / 2, view.H / 2, k); }
/** Fit the whole frame (plus room for hats) into the view. */
function fit() {
  const v = current();
  if (!v) return;
  const w = (v.fr.rect ? v.fr.rect[2] : v.fr.w) || v.bodyH, h = (v.fr.rect ? v.fr.rect[3] : v.fr.h) || v.bodyH;
  st.Z = clamp(Math.min(view.W * 0.8 / (w * v.pxScale), view.H * 0.78 / (h * v.pxScale)), 0.2, 40);
  const s = st.Z * v.pxScale;
  st.panX = -s * v.flipX * (w / 2 - v.a0[0]);
  st.panY = -(view.H * 0.55 - view.H / 2) - s * (h / 2 - v.a0[1]) + view.H * 0.02;
  invalidate(); saveUi();
}
function gameSize() { const v = current(); zoomAt(view.W / 2, view.H / 2, 1 / st.Z); if (v) invalidate(); }

// ---------------------------------------------------------------------------
// Selection, browsing and playback

function select(sel) { st.sel = sel; renderInspector(); invalidate(); }
function selectables(v) {
  const list = [];
  if (st.showLm) for (const p of POINTS) if (v.fr[p]) list.push({ kind: 'lm', point: p });
  if (st.showOutfit) for (const s of SLOTS) if (v.items[s]) list.push({ kind: 'item', slot: s });
  return list;
}
function cycleSelection(dir) {
  const v = current();
  if (!v) return;
  const list = selectables(v);
  if (!list.length) return;
  const i = list.findIndex((s) => st.sel && s.kind === st.sel.kind && (s.point || s.slot) === (st.sel.point || st.sel.slot));
  select(list[(i + dir + list.length) % list.length]);
}

let loadToken = 0;
async function selectSet(asset, { pose = null, fi = 0, keepView = false } = {}) {
  const token = ++loadToken;
  st.asset = asset;
  $('set').value = asset;
  invalidate();
  const set = await ensureSpriteSet(asset);
  if (token !== loadToken) return;
  if (!set) { status(`No sprite set for ${asset}`); return; }
  syncSet(asset);
  renderPoseOptions();
  const name = pose && set.poses[pose] ? pose : set.poses.idle ? 'idle' : Object.keys(set.poses)[0];
  await selectPose(name, { fi, keepView });
  renderEdits();
}
async function selectPose(name, { fi = 0, keepView = true } = {}) {
  const set = getSpriteSet(st.asset);
  if (!set || !set.poses[name]) return;
  const token = ++loadToken;
  st.pose = name;
  $('pose').value = name;
  const sp = set.poses[name];
  st.fi = clamp(fi, 0, sp.frames.length - 1);
  st.frameClock = 0;
  await Promise.all(sp.frames.map((f) => (f.load ? f.load() : null)));
  if (token !== loadToken) return;
  if (!keepView || !viewReady) { viewReady = true; fit(); }
  renderStrip();
  renderInspector();
  invalidate();
  saveUi();
}
let viewReady = false;
function setFrame(i) {
  const set = getSpriteSet(st.asset), sp = set && set.poses[st.pose];
  if (!sp) return;
  st.fi = (i + sp.frames.length) % sp.frames.length;
  st.frameClock = 0;
  markStrip();
  renderInspector();
  invalidate();
  saveUi();
}
function stepPose(dir) {
  const opts = [...$('pose').options].map((o) => o.value);
  const i = opts.indexOf(st.pose);
  selectPose(opts[(i + dir + opts.length) % opts.length], { fi: 0 });
}
function setPlaying(on) {
  st.playing = on;
  $('play').textContent = on ? 'Pause' : 'Play';
  $('play').setAttribute('aria-pressed', on ? 'true' : 'false');
  if (!on) st.clock = 0;
  invalidate();
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (st.playing) {
    st.clock += dt;
    const set = getSpriteSet(st.asset), sp = set && set.poses[st.pose];
    if (sp && sp.frames.length > 1) {
      st.frameClock += dt;
      const fr = sp.frames[st.fi], d = fr.dur || 1 / sp.fps;
      if (st.frameClock >= d) { st.frameClock -= d; st.fi = (st.fi + 1) % sp.frames.length; markStrip(); renderInspector(); }
    }
    needsDraw = true;
  }
  if (needsDraw) draw();
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Panels

function renderSetOptions() {
  const sel = $('set');
  sel.textContent = '';
  const have = new Set(indexedSpriteSets());
  const counts = editCounts();
  const groups = [['Playable characters', SETS.filter((s) => !s.npc)], ['NPCs and pets', SETS.filter((s) => s.npc)]];
  for (const [name, list] of groups) {
    const og = el('optgroup', { label: name });
    for (const s of list) {
      if (!have.has(s.asset)) continue;
      const n = counts.sets.get(s.asset) || 0;
      const who = s.entry.members.length > 1 ? `${s.entry.name}: ${s.asset}` : s.entry.name;
      og.append(el('option', { value: s.asset }, `${n ? '● ' : ''}${who}${n ? ` (${n})` : ''}`));
    }
    if (og.children.length) sel.append(og);
  }
  if (st.asset) sel.value = st.asset;
}
function renderPoseOptions() {
  const set = getSpriteSet(st.asset), sel = $('pose');
  sel.textContent = '';
  if (!set) return;
  const counts = editCounts();
  for (const [name, def] of Object.entries(set.manifest.poses || {})) {
    if (!set.poses[name]) continue;
    const alias = typeof def === 'string' ? def : def.alias;
    const real = set.poses[name].frames[0]?.pose || name;
    const n = counts.poses.get(`${st.asset}|${real}`) || 0;
    const text = `${n ? '● ' : ''}${name}${alias ? ` = ${real}` : ''} (${set.poses[name].frames.length})`;
    sel.append(el('option', { value: name }, text));
  }
  if (st.pose) sel.value = st.pose;
}
/** Edit counts per set, per pose and per frame (for dirty markers). */
function editCounts() {
  const sets = new Map(), poses = new Map(), frames = new Map(), posewide = new Set();
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (const e of session.entries('landmarks')) {
    bump(sets, e.set); bump(poses, `${e.set}|${e.pose}`); bump(frames, `${e.set}|${e.pose}|${e.frame}`);
  }
  for (const e of session.entries('items')) {
    bump(sets, e.set);
    if (e.pose !== '*') bump(poses, `${e.set}|${e.pose}`);
    if (e.frame !== '*') bump(frames, `${e.set}|${e.pose}|${e.frame}`);
    else posewide.add(`${e.set}|${e.pose}`);
  }
  return { sets, poses, frames, posewide };
}

const thumbs = [];
function renderStrip() {
  const strip = $('strip');
  strip.textContent = '';
  thumbs.length = 0;
  const set = getSpriteSet(st.asset), sp = set && set.poses[st.pose];
  if (!sp) return;
  sp.frames.forEach((fr, i) => {
    const c = el('canvas');
    const w = fr.rect ? fr.rect[2] : fr.w, h = fr.rect ? fr.rect[3] : fr.h;
    const H = 68, k = Math.min(H / (h || 1), 110 / (w || 1)), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(w * k * dpr)); c.height = Math.round(H * dpr);
    c.style.height = H + 'px'; c.style.width = Math.max(1, Math.round(w * k)) + 'px';
    const x = c.getContext('2d');
    if (fr.img) {
      x.setTransform(k * dpr, 0, 0, k * dpr, 0, (H - h * k) / 2 * dpr);
      if (fr.rect) x.drawImage(fr.img, fr.rect[0], fr.rect[1], w, h, 0, 0, w, h); else x.drawImage(fr.img, 0, 0, w, h);
    }
    const b = el('button', { class: 'thumb', title: `${fr.pose} frame ${fr.index}${fr.src ? ' · ' + fr.src : ''}${fr.dur ? ` · ${fr.dur}s` : ''}`, onclick: () => { setPlaying(false); setFrame(i); } },
      c, el('span', { class: 'n' }, `${fr.index}`));
    thumbs.push(b);
    strip.append(b);
  });
  markStrip();
}
function markStrip() {
  const set = getSpriteSet(st.asset), sp = set && set.poses[st.pose];
  if (!sp) return;
  const counts = editCounts();
  thumbs.forEach((b, i) => {
    const fr = sp.frames[i];
    b.classList.toggle('on', i === st.fi);
    b.classList.toggle('dirty', !!fr && (counts.frames.has(`${st.asset}|${fr.pose}|${fr.index}`)));
    if (i === st.fi && st.playing === false) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}
function markDirty() {
  const count = session.count, badge = $('edit-count');
  badge.textContent = count; badge.classList.toggle('dirty', count > 0);
  renderSetOptions(); renderPoseOptions(); markStrip();
}
function renderHistory() {
  $('undo').disabled = !session.undoStack.length;
  $('redo').disabled = !session.redoStack.length;
  $('undo').title = session.undoStack.length ? `Undo ${session.undoStack[session.undoStack.length - 1].label} (Ctrl/Cmd+Z)` : 'Nothing to undo';
  $('redo').title = session.redoStack.length ? `Redo ${session.redoStack[session.redoStack.length - 1].label} (Ctrl/Cmd+Shift+Z)` : 'Nothing to redo';
}

function renderOutfitPanel() {
  const box = $('outfit');
  box.textContent = '';
  CATS.forEach((cat) => {
    const w = st.outfit[cat.id];
    const itemSel = el('select', { 'aria-label': cat.name + ' item', onchange: (e) => {
      const id = e.target.value;
      if (!id) delete st.outfit[cat.id];
      else { const it = outfitItem(id); st.outfit[cat.id] = { id, colour: it.color ?? 0 }; }
      afterOutfitChange(cat.id);
    } });
    itemSel.append(el('option', { value: '' }, 'None'));
    for (const it of cat.items) if (it.id) itemSel.append(el('option', { value: it.id }, it.name + (it.art ? ' ◆' : '')));
    itemSel.value = w ? w.id : '';
    const colSel = el('select', { 'aria-label': cat.name + ' colour', disabled: !w, onchange: (e) => { st.outfit[cat.id].colour = +e.target.value; afterOutfitChange(cat.id); } });
    PALETTE.forEach((p, i) => {
      const it = w && outfitItem(w.id), hasArt = it && it.art && it.art.colors[i];
      colSel.append(el('option', { value: i }, p.name + (hasArt ? ' ◆' : '')));
    });
    if (w) colSel.value = w.colour;
    box.append(
      el('label', {}, el('button', { class: 'sel', title: 'Select this item', disabled: !w, onclick: () => select({ kind: 'item', slot: cat.id }) }, cat.name)),
      itemSel, colSel,
    );
  });
  box.append(el('p', { class: 'muted small', style: 'grid-column: 1 / -1; margin: 2px 0 0' },
    '◆ has painted art for that colour (others use the vector drawing).', artReady ? '' : ' Loading item art…'));
}
function afterOutfitChange(slot) {
  renderOutfitPanel();
  if (slot && st.outfit[slot]) select({ kind: 'item', slot });
  else if (st.sel && st.sel.kind === 'item' && !st.outfit[st.sel.slot]) select(null);
  invalidate(); saveUi();
}
function randomOutfit() {
  st.outfit = {};
  for (const cat of CATS) {
    if (Math.random() < (cat.id === 'aura' ? 0.35 : 0.7)) {
      const items = cat.items.filter((i) => i.id);
      const it = items[Math.floor(Math.random() * items.length)];
      const arts = it.art ? Object.keys(it.art.colors).map(Number) : [];
      const colour = arts.length && Math.random() < 0.7 ? arts[Math.floor(Math.random() * arts.length)] : Math.floor(Math.random() * PALETTE.length);
      st.outfit[cat.id] = { id: it.id, colour };
    }
  }
  if (!Object.keys(st.outfit).length) st.outfit.head = { id: 'crown', colour: 1 };
  afterOutfitChange(null);
}

function numField(labelText, value, onChange, { step = 1, title = '' } = {}) {
  const input = el('input', { type: 'number', step, value: fmt(value, 4), title });
  input.addEventListener('change', () => {
    const n = parseFloat(input.value);
    input.blur();
    if (Number.isFinite(n)) onChange(n); else renderInspector();
  });
  input.addEventListener('keydown', (e) => e.stopPropagation());
  return el('label', { class: 'field' }, labelText, input);
}

function renderInspector() {
  const box = $('inspector');
  if (!box) return;
  // don't rebuild under a field being typed in
  if (box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' && drag == null && document.activeElement.type === 'number') return;
  box.textContent = '';
  const v = current();
  if (!v) { box.append(el('p', { class: 'muted' }, 'Loading…')); return; }
  const sel = st.sel;
  if (sel && sel.kind === 'lm' && v.fr[sel.point] !== undefined) box.append(landmarkInspector(v, sel.point));
  else if (sel && sel.kind === 'item' && v.items[sel.slot]) box.append(itemInspector(v, v.items[sel.slot]));
  else box.append(el('p', { class: 'muted small' }, 'Click a landmark or an item in the viewer (or below) to select it. Tab cycles through them.'));

  // pick lists
  const lmList = el('ul', { class: 'pick-list' });
  for (const point of POINTS) {
    const p = v.fr[point], key = lmKey(lmTarget(v, point));
    lmList.append(el('li', {}, el('button', { class: session.get('landmarks', key) ? 'edited' : '', disabled: !p, title: LM[point].desc, onclick: () => select({ kind: 'lm', point }) },
      el('span', { class: 'swatch', style: `background:${LM[point].color}` }), LM[point].label, el('small', {}, p ? `${p[0]},${p[1]}` : 'none'))));
  }
  box.append(el('div', { class: 'muted small', style: 'margin-top:8px' }, 'Landmarks'), lmList);
  const worn = SLOTS.filter((s) => v.items[s]);
  if (worn.length) {
    const itList = el('ul', { class: 'pick-list' });
    for (const s of worn) {
      const p = v.items[s], e = effectiveEntry(v.fr, s, p.item.id);
      itList.append(el('li', {}, el('button', { class: e ? 'edited' : '', onclick: () => select({ kind: 'item', slot: s }) },
        el('span', { class: 'swatch', style: `background:${SLOT_COLOR[s]}` }), p.item.name)));
    }
    box.append(el('div', { class: 'muted small' }, 'Items'), itList);
  }
}

function nudgePad(v) {
  const b = (txt, title, fn) => el('button', { title, onclick: fn }, txt);
  return el('div', { class: 'row buttons' },
    b('←', 'Nudge left 1 px (Shift+click 10)', (e) => nudge(v, e.shiftKey ? -10 : -1, 0)),
    b('→', 'Nudge right 1 px', (e) => nudge(v, e.shiftKey ? 10 : 1, 0)),
    b('↑', 'Nudge up 1 px', (e) => nudge(v, 0, e.shiftKey ? -10 : -1)),
    b('↓', 'Nudge down 1 px', (e) => nudge(v, 0, e.shiftKey ? 10 : 1)),
    el('button', { class: 'danger', onclick: () => resetSelection(v) }, 'Reset'));
}

function landmarkInspector(v, point) {
  const p = v.fr[point], orig = originalPoint(v.set, v.fr.pose, v.fr.index, point);
  const key = lmKey(lmTarget(v, point)), edit = session.get('landmarks', key);
  const wrap = el('div');
  wrap.append(el('h3', {}, el('span', { class: 'swatch', style: `background:${LM[point].color}` }), `${LM[point].label} `, el('span', { class: 'muted small' }, point === 'anchor' ? '(anchor)' : '')));
  wrap.append(el('p', { class: 'muted small', style: 'margin:2px 0 6px' }, LM[point].desc));
  if (!p) { wrap.append(el('p', { class: 'muted' }, 'Not set on this frame (back view).')); return wrap; }
  wrap.append(el('div', { class: 'grid2' },
    numField('x (frame px)', p[0], (n) => { session.begin('Set ' + point); setLandmark(v, point, [n, p[1]]); session.commit(); }),
    numField('y (frame px)', p[1], (n) => { session.begin('Set ' + point); setLandmark(v, point, [p[0], n]); session.commit(); })));
  wrap.append(el('p', { class: 'small' + (stale.has(key) ? ' warn' : ' muted'), style: 'margin:6px 0' },
    `Original ${fmtPt(orig)}`, edit ? ` · moved ${fmt(p[0] - orig[0], 1)}, ${fmt(p[1] - orig[1], 1)}` : '',
    stale.has(key) ? ` · the edit was made against ${fmtPt(edit.from)}: sprites.json changed since` : ''));
  wrap.append(nudgePad(v));
  wrap.append(el('p', { class: 'muted small' }, `${v.fr.pose} frame ${v.fr.index}${v.fr.src ? ` (${v.fr.src})` : ''}.`,
    st.pose !== v.fr.pose ? ` Pose "${st.pose}" is an alias: edits go to "${v.fr.pose}".` : ''));
  return wrap;
}

function itemInspector(v, p) {
  const t = itemTarget(v, p.slot), val = valueAt(v, t), own = mergedFit().get(itemKey(t));
  const eff = effectiveEntry(v.fr, p.slot, p.item.id);
  const wrap = el('div');
  wrap.append(el('h3', {}, el('span', { class: 'swatch', style: `background:${SLOT_COLOR[p.slot]}` }), p.item.name,
    el('span', { class: 'muted small' }, `${p.slot} · ${PALETTE[p.colour]?.name || ''}${p.item.art && p.item.art.colors[p.colour] ? ' · art' : ' · vector'}`)));
  if (p.hidden) wrap.append(el('p', { class: 'warn small' }, p.hidden));
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Apply to' });
  SCOPES.forEach((s, i) => seg.append(el('button', { 'aria-pressed': st.scope === s.id ? 'true' : 'false', title: `${s.label} (${i + 1})`, onclick: () => { st.scope = s.id; renderInspector(); saveUi(); } }, s.label)));
  wrap.append(el('div', { class: 'field', style: 'margin:6px 0' }, 'Apply adjustments to', seg));
  const any = el('input', { type: 'checkbox', checked: st.anyItem, onchange: (e) => { st.anyItem = e.target.checked; renderInspector(); saveUi(); } });
  wrap.append(el('label', { class: 'check small' }, any, `Any item in the ${p.slot} slot (not just ${p.item.name})`));
  const set = (k) => (n) => { session.begin(`Set ${k} of ${p.item.name}`); setItemValue(t, { ...val, [k]: n }); session.commit(); };
  wrap.append(el('div', { class: 'grid4', style: 'margin-top:6px' },
    numField('dx (S)', val.dx, set('dx'), { step: 0.01, title: 'Offset along the slot\'s x axis, in units of the slot size S' }),
    numField('dy (S)', val.dy, set('dy'), { step: 0.01, title: 'Offset along the slot\'s y axis (down), in S' }),
    numField('rot (°)', val.rot, set('rot'), { step: 1 }),
    numField('scale', val.scale, set('scale'), { step: 0.01 })));
  const b = (txt, title, fn) => el('button', { title, onclick: fn }, txt);
  wrap.append(el('div', { class: 'row buttons' },
    b('⟲', 'Rotate −1° ([; Shift 10°)', (e) => rotateItem(v, e.shiftKey ? -10 : -1)),
    b('⟳', 'Rotate +1° (]; Shift 10°)', (e) => rotateItem(v, e.shiftKey ? 10 : 1)),
    b('−', 'Smaller 1% (;)', (e) => scaleItem(v, e.shiftKey ? 1 / 1.1 : 1 / 1.01)),
    b('+', 'Bigger 1% (\')', (e) => scaleItem(v, e.shiftKey ? 1.1 : 1.01))));
  wrap.append(nudgePad(v));
  const where = !own ? (eff ? `Inherited from ${describeScope(eff)}.` : 'No adjustment yet.') : `Editing ${describeScope(t)}${session.get('items', itemKey(t)) ? '' : ' (checked-in value)'}.`;
  wrap.append(el('p', { class: 'muted small', style: 'margin:4px 0' }, where));
  if (eff && level(eff) > level(t)) wrap.append(el('p', { class: 'warn small' }, `This frame has a more specific fit (${describeScope(eff)}), so changes at this scope don't show here.`));
  const bf = fwdToFrame(v, p.base);
  wrap.append(el('p', { class: 'muted small', style: 'margin:4px 0; font-family: ui-monospace, monospace' },
    `attach  fwd ${fmt(p.base.x, 1)}, ${fmt(p.base.y, 1)}  frame ${fmt(bf.x, 1)}, ${fmt(bf.y, 1)}`, el('br'),
    `slot rot ${fmt(p.base.rot * DEG, 1)}°  S ${fmt(p.base.S, 1)} px`, el('br'),
    `drawn   fwd ${fmt(p.at.x, 1)}, ${fmt(p.at.y, 1)}  rot ${fmt(p.at.rot * DEG, 1)}°  S ${fmt(p.at.S, 1)}`));
  return wrap;
}
function describeScope(e) {
  const what = e.item === '*' ? `any ${e.slot} item` : e.item;
  if (e.pose === '*') return `the whole set (${what})`;
  if (e.frame === '*') return `all frames of ${e.pose} (${what})`;
  return `${e.pose} frame ${e.frame} (${what})`;
}

function renderEdits() {
  const list = $('edits');
  list.textContent = '';
  const v = current();
  const here = (e) => v && e.set === st.asset && e.pose === v.fr.pose && e.frame === v.fr.index;
  const rows = [
    ...session.entries('landmarks').map((e) => ({ kind: 'landmarks', e, key: lmKey(e) })),
    ...session.entries('items').map((e) => ({ kind: 'items', e, key: itemKey(e) })),
  ].filter((r) => !st.editsHere || r.e.set === st.asset)
    .sort((a, b) => (a.e.set + a.e.pose).localeCompare(b.e.set + b.e.pose) || String(a.e.frame).localeCompare(String(b.e.frame), undefined, { numeric: true }));
  if (!rows.length) { list.append(el('li', { class: 'empty' }, 'No edits yet. Drag a landmark or an item.')); return; }
  for (const r of rows) {
    const e = r.e;
    let what;
    if (r.kind === 'landmarks') {
      what = el('span', { class: 'what' }, el('b', {}, `${e.set} · ${e.pose} #${e.frame} · ${LM[e.point].label}`), ' ',
        el('code', {}, `${fmtPt(e.from)} → ${fmtPt(e.to)}`), stale.has(r.key) ? el('span', { class: 'warn' }, ' (sprites.json changed)') : '');
    } else {
      const where = e.pose === '*' ? 'whole set' : e.frame === '*' ? `${e.pose} (all)` : `${e.pose} #${e.frame}`;
      what = el('span', { class: 'what' }, el('b', {}, `${e.set} · ${where} · ${e.slot}: ${e.item === '*' ? 'any' : e.item}`), ' ',
        el('code', {}, `dx ${fmt(e.dx)} dy ${fmt(e.dy)} rot ${fmt(e.rot, 1)}° ×${fmt(e.scale)}`));
    }
    const li = el('li', { class: here(e) ? 'here' : '', title: 'Show this edit', onclick: () => jumpTo(r) }, what,
      el('button', { title: 'Delete this edit', 'aria-label': 'Delete edit', onclick: (ev) => { ev.stopPropagation(); session.begin('Delete edit'); session.set(r.kind, r.key, undefined); session.commit(); } }, '×'));
    list.append(li);
  }
}
async function jumpTo(r) {
  const e = r.e;
  const set = await ensureSpriteSet(e.set);
  if (!set) return;
  const pose = e.pose === '*' ? (st.asset === e.set ? st.pose : 'idle') : e.pose;
  let fi = 0;
  if (e.frame !== '*' && set.poses[pose]) fi = Math.max(0, set.poses[pose].frames.findIndex((f) => f.index === e.frame));
  else if (e.pose === '*' && st.asset === e.set) fi = st.fi;
  if (st.asset !== e.set) await selectSet(e.set, { pose, fi });
  else if (st.pose !== pose) await selectPose(pose, { fi });
  else setFrame(fi);
  if (r.kind === 'landmarks') { st.showLm = true; syncToggles(); select({ kind: 'lm', point: e.point }); }
  else {
    if (!st.outfit[e.slot] || (e.item !== '*' && st.outfit[e.slot].id !== e.item)) {
      const it = e.item !== '*' ? outfitItem(e.item) : null;
      if (it) { st.outfit[e.slot] = { id: it.id, colour: it.color ?? 0 }; renderOutfitPanel(); }
    }
    st.scope = e.pose === '*' ? 'set' : e.frame === '*' ? 'pose' : 'frame';
    st.anyItem = e.item === '*';
    st.showOutfit = true; syncToggles();
    select(st.outfit[e.slot] ? { kind: 'item', slot: e.slot } : null);
  }
}

let hudText = '';
function updateHud(v) {
  let t = 'Loading…';
  if (v) {
    const alias = st.pose !== v.fr.pose ? ` (= ${v.fr.pose})` : '';
    t = `${st.asset} · ${st.pose}${alias} · frame ${v.fr.index} (${st.fi + 1}/${v.sp.frames.length})${v.fr.src ? ' · ' + v.fr.src : ''}`
      + `\nbodyHeight ${fmt(v.bodyH, 1)} → h ${v.def.h} px · art faces ${v.imgFlip < 0 ? 'left' : 'right'} · zoom ${fmt(st.Z, 2)}× · ${getImageQuality()}`;
    if (st.hover) t += `\npointer ${Math.floor(st.hover[0])}, ${Math.floor(st.hover[1])}`;
  }
  if (t !== hudText) { hudText = t; $('hud').textContent = t; }
}
let statusTimer = 0;
function status(msg) {
  const s = $('status');
  s.textContent = msg; s.classList.add('show');
  clearTimeout(statusTimer); statusTimer = setTimeout(() => s.classList.remove('show'), 2200);
}
function syncToggles() {
  $('toggle-lm').setAttribute('aria-pressed', st.showLm ? 'true' : 'false');
  $('toggle-outfit').setAttribute('aria-pressed', st.showOutfit ? 'true' : 'false');
  $('flip').setAttribute('aria-pressed', st.facing < 0 ? 'true' : 'false');
  $('flip').innerHTML = st.facing < 0 ? '&larr; Facing' : 'Facing &rarr;';
  $('backdrop').textContent = BACKDROPS[st.backdrop].name;
  $('edits-here').checked = st.editsHere;
  invalidate();
}

// ---------------------------------------------------------------------------
// Files and persistence

function exportData() { return session.toJSON({ app: 'party/workbench', quality: getImageQuality() }); }
function download() {
  if (session.tx) session.commit();
  const data = exportData();
  if (!data.landmarks.length && !data.items.length) { status('Nothing to download yet'); return; }
  const d = new Date(), pad = (n) => String(n).padStart(2, '0');
  const name = `workbench-edits-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  const blob = new Blob([formatEdits(data)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  status(`Downloaded ${name} (${data.landmarks.length} landmark, ${data.items.length} item edits)`);
}
/** Load parsed entries into the session (one undoable step); replace drops the current edits first. */
function loadEntries(parsed, { replace, label = 'Load edits', undoable = true }) {
  session.begin(label);
  if (replace) {
    for (const e of session.entries('landmarks')) session.set('landmarks', lmKey(e), undefined);
    for (const e of session.entries('items')) session.set('items', itemKey(e), undefined);
  }
  for (const e of parsed.landmarks) session.set('landmarks', lmKey(e), e);
  for (const e of parsed.items) session.set('items', itemKey(e), e);
  session.commit();
  if (!undoable) { session.undoStack = []; session.redoStack = []; renderHistory(); }
  for (const s of new Set(parsed.landmarks.map((e) => e.set))) syncSet(s);
  renderEdits(); renderInspector(); invalidate();
}
async function loadFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { alert(`Could not read ${file.name}: ${e.message}`); return; }
  const parsed = parseEdits(data);
  if (!parsed.landmarks.length && !parsed.items.length) { alert(`No edits loaded from ${file.name}.\n${parsed.errors.join('\n')}`); return; }
  let replace = true;
  if (session.count) replace = confirm(`Replace the current ${session.count} edits with the ${parsed.landmarks.length + parsed.items.length} in ${file.name}?\n\nOK replaces them, Cancel adds the file's edits to them.`);
  loadEntries(parsed, { replace, label: 'Load ' + file.name });
  status(`Loaded ${parsed.landmarks.length} landmark and ${parsed.items.length} item edits`);
  if (parsed.errors.length) alert(`Some entries were skipped:\n${parsed.errors.join('\n')}`);
}

let saveTimer = 0;
function autosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      if (session.count) localStorage.setItem(SESSION_KEY, JSON.stringify(exportData()));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* storage blocked: edits live until the tab closes */ }
  }, 250);
}
function saveUi() {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ asset: st.asset, pose: st.pose, fi: st.fi, facing: st.facing, backdrop: st.backdrop, showLm: st.showLm, showOutfit: st.showOutfit, ghosts: st.ghosts, outfit: st.outfit, scope: st.scope, anyItem: st.anyItem, editsHere: st.editsHere }));
  } catch (e) { /* ignore */ }
}
function loadUi() {
  try { return JSON.parse(localStorage.getItem(UI_KEY) || 'null'); } catch (e) { return null; }
}
function offerRestore() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { saved = null; }
  if (!saved) return;
  const parsed = parseEdits(saved);
  const n = parsed.landmarks.length + parsed.items.length;
  if (!n) return;
  const when = saved.saved ? new Date(saved.saved).toLocaleString() : 'earlier';
  $('restore-text').textContent = `You have ${n} unsaved edit${n === 1 ? '' : 's'} from ${when} in this browser.`;
  $('restore').hidden = false;
  $('restore-yes').onclick = () => { $('restore').hidden = true; loadEntries(parsed, { replace: true, label: 'Restore session', undoable: false }); status(`Restored ${n} edits`); };
  $('restore-no').onclick = () => {
    $('restore').hidden = true;
    if (!session.count) { try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } }
  };
}

// ---------------------------------------------------------------------------
// Keyboard

function isTyping(e) {
  const t = e.target;
  if (!t || !t.tagName) return false;
  return (t.tagName === 'INPUT' && t.type !== 'checkbox') || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
}
const onControl = (e) => e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT');
window.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key;
  if (mod && (key === 'z' || key === 'Z')) { if (isTyping(e)) return; e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
  if (mod && (key === 'y' || key === 'Y')) { if (isTyping(e)) return; e.preventDefault(); doRedo(); return; }
  if (mod && (key === 's' || key === 'S')) { e.preventDefault(); download(); return; }
  if (!$('help-dlg').hidden) { if (key === 'Escape' || key === '?') { e.preventDefault(); showHelp(false); } return; }
  if (isTyping(e) || mod || e.altKey) return;
  const v = current();
  const step = e.shiftKey ? 10 : 1;
  switch (key) {
    case '?': showHelp(true); break;
    case ' ':
      if (onControl(e)) return;   // Space presses the focused button
      if (!e.repeat) { spaceDown = true; spaceUsed = false; setCursor('grab'); }
      break;
    case 'ArrowLeft': if (st.sel && v) nudge(v, -step, 0); else setFrame(st.fi - 1); break;
    case 'ArrowRight': if (st.sel && v) nudge(v, step, 0); else setFrame(st.fi + 1); break;
    case 'ArrowUp': if (st.sel && v) nudge(v, 0, -step); else stepPose(-1); break;
    case 'ArrowDown': if (st.sel && v) nudge(v, 0, step); else stepPose(1); break;
    case ',': case '<': setPlaying(false); setFrame(st.fi - 1); break;
    case '.': case '>': setPlaying(false); setFrame(st.fi + 1); break;
    case '[': case '{': if (v) rotateItem(v, -step); break;
    case ']': case '}': if (v) rotateItem(v, step); break;
    case ';': case ':': if (v) scaleItem(v, e.shiftKey ? 1 / 1.1 : 1 / 1.01); break;
    case "'": case '"': if (v) scaleItem(v, e.shiftKey ? 1.1 : 1.01); break;
    case 'Tab': if (e.target !== canvas && e.target !== document.body) return; cycleSelection(e.shiftKey ? -1 : 1); break;
    case 'Escape': select(null); break;
    case 'Delete': case 'Backspace': if (v) resetSelection(v); break;
    case '+': case '=': zoomBy(1.25); break;
    case '-': case '_': zoomBy(0.8); break;
    case 'f': case 'F': fit(); break;
    case '0': gameSize(); break;
    case '1': case '2': case '3': st.scope = SCOPES[+key - 1].id; renderInspector(); status('Item scope: ' + SCOPES[+key - 1].label); saveUi(); break;
    case 'm': case 'M': toggleFlip(); break;
    case 'b': case 'B': st.backdrop = (st.backdrop + 1) % BACKDROPS.length; syncToggles(); saveUi(); break;
    case 'l': case 'L': st.showLm = !st.showLm; syncToggles(); saveUi(); break;
    case 'o': case 'O': st.showOutfit = !st.showOutfit; syncToggles(); saveUi(); break;
    case 'g': case 'G': st.ghosts = !st.ghosts; status(st.ghosts ? 'Original positions shown' : 'Original positions hidden'); invalidate(); saveUi(); break;
    case 'r': case 'R': randomOutfit(); break;
    case 'p': case 'P': setPlaying(!st.playing); break;
    default: return;
  }
  e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ') {
    const was = spaceDown;
    spaceDown = false;
    if (was && !spaceUsed && !isTyping(e) && $('help-dlg').hidden) setPlaying(!st.playing);
    setCursor('grab');
  }
});
function doUndo() { const s = session.undo(); status(s ? 'Undid ' + s.label : 'Nothing to undo'); }
function doRedo() { const s = session.redo(); status(s ? 'Redid ' + s.label : 'Nothing to redo'); }
function toggleFlip() {
  st.facing = -st.facing;   // mirrors about the feet, which stay put
  syncToggles(); renderInspector(); saveUi();
}
function showHelp(on) { $('help-dlg').hidden = !on; if (on) $('help-close').focus(); else canvas.focus(); }

// ---------------------------------------------------------------------------
// Wire up and boot

function wire() {
  $('set').addEventListener('change', (e) => { select(null); selectSet(e.target.value, { pose: st.pose }); });
  $('pose').addEventListener('change', (e) => selectPose(e.target.value, { fi: 0 }));
  $('prev').onclick = () => { setPlaying(false); setFrame(st.fi - 1); };
  $('next').onclick = () => { setPlaying(false); setFrame(st.fi + 1); };
  $('play').onclick = () => setPlaying(!st.playing);
  $('zoom-in').onclick = () => zoomBy(1.25);
  $('zoom-out').onclick = () => zoomBy(0.8);
  $('zoom-fit').onclick = fit;
  $('zoom-1').onclick = gameSize;
  $('flip').onclick = toggleFlip;
  $('backdrop').onclick = () => { st.backdrop = (st.backdrop + 1) % BACKDROPS.length; syncToggles(); saveUi(); };
  $('toggle-lm').onclick = () => { st.showLm = !st.showLm; syncToggles(); saveUi(); };
  $('toggle-outfit').onclick = () => { st.showOutfit = !st.showOutfit; syncToggles(); saveUi(); };
  $('undo').onclick = doUndo;
  $('redo').onclick = doRedo;
  $('download').onclick = download;
  $('load').onclick = () => $('load-file').click();
  $('load-file').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) loadFile(f); });
  $('help').onclick = () => showHelp(true);
  $('help-close').onclick = () => showHelp(false);
  $('help-dlg').addEventListener('click', (e) => { if (e.target === $('help-dlg')) showHelp(false); });
  $('outfit-random').onclick = randomOutfit;
  $('outfit-clear').onclick = () => { st.outfit = {}; afterOutfitChange(null); };
  $('edits-here').addEventListener('change', (e) => { st.editsHere = e.target.checked; renderEdits(); saveUi(); });
  $('edits-clear').onclick = () => {
    if (!session.count || !confirm(`Remove all ${session.count} edits? (Undo brings them back.)`)) return;
    loadEntries({ landmarks: [], items: [] }, { replace: true, label: 'Clear all edits' });
  };
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('beforeunload', () => { if (session.tx) session.commit(); });
}

async function boot() {
  wire();
  resize();
  const ui = loadUi();
  if (ui) {
    Object.assign(st, {
      facing: ui.facing === -1 ? -1 : 1, backdrop: clamp(ui.backdrop | 0, 0, BACKDROPS.length - 1),
      showLm: ui.showLm !== false, showOutfit: ui.showOutfit !== false, ghosts: ui.ghosts !== false,
      scope: SCOPES.some((s) => s.id === ui.scope) ? ui.scope : 'frame', anyItem: !!ui.anyItem, editsHere: !!ui.editsHere,
    });
    if (ui.outfit && typeof ui.outfit === 'object') for (const [slot, w] of Object.entries(ui.outfit)) if (SLOTS.includes(slot) && w && outfitItem(w.id)) st.outfit[slot] = { id: w.id, colour: clamp(w.colour | 0, 0, PALETTE.length - 1) };
  } else st.outfit = { head: { id: 'crown', colour: 1 } };
  syncToggles();
  renderOutfitPanel();
  renderHistory();
  requestAnimationFrame(tick);
  loadArt({ only: (k) => k.startsWith('prop/') }).then(() => { artReady = true; renderOutfitPanel(); invalidate(); });
  await loadSprites();
  syncFit();
  renderSetOptions();
  renderEdits();
  offerRestore();
  const have = indexedSpriteSets();
  const asset = ui && have.includes(ui.asset) ? ui.asset : have.includes('felicity') ? 'felicity' : have[0];
  await selectSet(asset, { pose: ui && ui.asset === asset ? ui.pose : 'idle', fi: ui && ui.asset === asset ? ui.fi | 0 : 0 });
  canvas.focus({ preventScroll: true });
  window.workbench = { st, session, current, selectSet, selectPose, setFrame, exportData, select, fit };   // for tests and the console
}
boot();
