// Character sprite system.
//
// Every character member has base art (assets/characters/<asset>.webp, a
// single neutral pose) and may have a generated sprite set
// (assets/sprites/<asset>/sprites.json + frames; see image-requests.md).
//
// Minigames never deal with images directly. They create an Actor for a
// party entry and ask for *poses*; the Actor plays the sprite set's frames
// for that pose when they exist, and otherwise animates the base art
// procedurally (squash, hop, tilt, tint) and adds vector emotes, so the game
// is fully playable before any sprites are generated.
//
//   const a = new Actor('felicity', { scale: 1 });
//   a.x = 400; a.y = 800;          // ground/foot point in logical px
//   a.z = 0;                       // height above the ground (jumps)
//   a.facing = 1;                  // 1 right, -1 left
//   a.setPose('walk');             // see POSES below
//   a.playOnce('action', 0.35);    // one-shot pose, then back to the previous pose
//   a.squash(0.25); a.flash('#fff'); a.tint('#ff66cc', 0.3); a.emote('heart', 1.2);
//   a.say('Yay!', 1.5);            // speech bubble (characters never talk out loud)
//   a.update(dt); a.draw(g, { ring: '#ff4d6d' });
//
// Attachments (crowns, hats, wands, carried presents) ride the pose motion:
//   const h = a.attach((g, info) => { g.drawImage(crown, info.head.x - 30, info.head.y - 40, 60, 40); });
//   a.detach(h);
// The callback draws in "forward space": origin at the member's feet, +x is
// the direction the character faces, -y is up, units are screen px. info has
// { h, w, head, hand, eyes, neck, back (each {x, y}), headAngle, pose, facing }.
// Sprite sets can supply per-pose/per-frame head, hand, eyes, neck, back
// points and headAngle so attachments track the art.

import { CHARACTERS, ALL_ASSETS, charById } from '../data/characters.js';
import { drawEmote } from './emotes.js';
import { voice } from './audio.js';
import { clamp, damp, TAU } from './util.js';
import { recolorFrame } from './recolor.js';
import { rulesFor, variantPalette, MASK_SETS, PORTRAIT_SAFE } from '../data/variants.js';

// ---------------------------------------------------------------------------
// Pose vocabulary. `fallback` lists poses to try, in order, when a sprite set
// lacks a pose. `loop` false poses are one-shots (they hold their last frame).
// `auto` emotes are added on top in every mode; `autoFallback` emotes only
// when the base art is used (they stand in for facial expressions).
export const POSES = {
  idle:      { loop: true,  fallback: [], desc: 'Standing, breathing, blinking. Default pose.' },
  walk:      { loop: true,  fallback: ['run'], desc: 'Moving at normal speed (top-down or side view).' },
  run:       { loop: true,  fallback: ['walk'], desc: 'Moving fast, leaning forward.' },
  jump:      { loop: false, fallback: ['fall', 'cheer'], desc: 'Takeoff and rising in the air.' },
  fall:      { loop: false, fallback: ['jump'], desc: 'Coming down / airborne, arms out.' },
  land:      { loop: false, fallback: ['idle'], desc: 'Landing squash, recovers to idle.' },
  celebrate: { loop: true,  fallback: ['cheer', 'dance'], auto: 'sparkle', autoFallback: 'hearts', desc: 'Big happy victory celebration (winning).' },
  cheer:     { loop: false, fallback: ['celebrate'], autoFallback: 'star', desc: 'Small happy fist-pump/hop (scored a point).' },
  pout:      { loop: true,  fallback: ['sad'], auto: 'rain', autoFallback: 'tear', desc: 'Sad pout (lost). Crossed arms, lip out, slumped.' },
  sad:       { loop: true,  fallback: ['pout'], autoFallback: 'tear', desc: 'Disappointed / teary.' },
  hurt:      { loop: false, fallback: ['dizzy', 'surprised'], desc: 'Got bonked or hit; recoils.' },
  dizzy:     { loop: true,  fallback: ['hurt'], auto: 'dizzy', desc: 'Stunned with stars circling.' },
  surprised: { loop: false, fallback: ['hurt'], autoFallback: 'exclaim', desc: 'Startled jump, eyes wide.' },
  think:     { loop: true,  fallback: ['idle'], autoFallback: 'question', desc: 'Pondering / waiting for a decision.' },
  wave:      { loop: true,  fallback: ['cheer'], desc: 'Friendly hello wave (character select).' },
  ready:     { loop: false, fallback: ['cheer', 'wave'], autoFallback: 'sparkle', desc: 'Confident "I\'m ready!" pose when locked in.' },
  action:    { loop: false, fallback: ['cheer'], desc: 'Generic quick action: grab, tap, swing, throw, pump.' },
  throw:     { loop: false, fallback: ['action'], desc: 'Throwing something forward.' },
  push:      { loop: false, fallback: ['action'], desc: 'Shove / bump forward.' },
  carry:     { loop: true,  fallback: ['walk'], desc: 'Walking while holding something overhead.' },
  dance:     { loop: true,  fallback: ['celebrate'], auto: 'note', desc: 'Dancing on the beat.' },
  paint:     { loop: true,  fallback: ['action'], desc: 'Painting / crafting with a brush.' },
  sleep:     { loop: true,  fallback: ['idle'], auto: 'zzz', desc: 'Sleeping (Troll naps).' },
  // Added for the minigames (image-requests.md §4.3).
  cast:      { loop: false, fallback: ['throw', 'action'], proc: 'action', desc: 'Wand/spell thrust forward (wand in hand).' },
  clap:      { loop: true,  fallback: ['wave', 'cheer'], proc: 'clap', desc: 'Spectator clapping / looping cheer.' },
  eat:       { loop: false, fallback: ['action'], proc: 'eat', autoFallback: 'heart', desc: 'Taste / munch with happy cheeks.' },
  ride:      { loop: true,  fallback: ['fall', 'jump'], proc: 'ride', desc: 'Riding a broom, leaning forward.' },
  bow:       { loop: false, fallback: ['wave'], proc: 'bow', desc: 'Bow or curtsy.' },
  strike1:   { loop: false, fallback: ['ready', 'cheer'], proc: 'strike', desc: 'Runway pose 1: hand on hip.' },
  strike2:   { loop: false, fallback: ['ready', 'cheer'], proc: 'strike', desc: 'Runway pose 2: peace sign by the face.' },
  strike3:   { loop: false, fallback: ['ready', 'cheer'], proc: 'strike', desc: 'Runway pose 3: arms-up star.' },
  'dance-up':   { loop: false, fallback: ['dance'], proc: 'dance-up', desc: 'Dance move: arms straight up.' },
  'dance-down': { loop: false, fallback: ['dance'], proc: 'dance-down', desc: 'Dance move: crouch, hands on knees.' },
  'dance-side': { loop: false, fallback: ['dance'], proc: 'dance-side', desc: 'Dance move: point and lean forward-side.' },
  'dance-star': { loop: false, fallback: ['celebrate'], proc: 'ready', desc: 'Dance move: jump into a star shape.' },
  shake:     { loop: false, fallback: ['dizzy'], proc: 'shake', desc: 'Wet-dog shake (pets after a bath).' },
  stir:      { loop: true,  fallback: ['paint'], proc: 'paint', desc: 'Stirring a cauldron with a big spoon.' },
  // NPC poses (Glimmer, Shadow Imps, Professor Hoot, Troll).
  talk:      { loop: true,  fallback: ['idle'], proc: 'talk', desc: 'NPC talking to camera.' },
  present:   { loop: true,  fallback: ['wave'], proc: 'wave', desc: 'NPC "ta-da!" presenting to the side.' },
  point:     { loop: false, fallback: ['present', 'action'], proc: 'action', desc: 'NPC points forward.' },
  laugh:     { loop: true,  fallback: ['cheer'], proc: 'clap', autoFallback: 'happy', desc: 'Giggle / belly laugh.' },
  poof:      { loop: false, fallback: ['surprised'], proc: 'surprised', desc: 'Shadow Imp banished in a puff.' },
  hoot:      { loop: false, fallback: ['surprised'], proc: 'surprised', desc: 'Professor Hoot hoots.' },
  lantern:   { loop: false, fallback: ['action'], proc: 'action', desc: 'Professor Hoot raises the lantern.' },
  windup:    { loop: false, fallback: ['action'], proc: 'windup', desc: 'Troll winds up a ground-pound (telegraph).' },
  slam:      { loop: false, fallback: ['land'], proc: 'land', desc: 'Troll ground-pound impact.' },
  grab:      { loop: false, fallback: ['action'], proc: 'action', desc: 'Troll grabs forward.' },
  exit:      { loop: true,  fallback: ['walk'], proc: 'walk', desc: 'NPC leaving the scene.' },
  // Optional actions: authored pilot frames; safe expressive fallbacks elsewhere.
  'look-around': { loop: true, fallback: ['think'], proc: 'look-around', desc: 'Curious scouting and looking for a friend.' },
  'high-five': { loop: false, fallback: ['wave', 'cheer'], proc: 'high-five', desc: 'Open-palm friendly team high-five (paw tap for pets).' },
  crouch:    { loop: true, fallback: ['land'], proc: 'crouch', desc: 'Low playful hiding or obstacle duck.' },
  dash:      { loop: false, fallback: ['run'], proc: 'dash', desc: 'Quick forward burst; game code controls travel and collision.' },
  'hip-bump': { loop: false, fallback: ['idle'], proc: 'hip-bump', desc: 'Hip-first bump: side-on, hip swung out toward the target, arms up, cheeky grin.' },
  knockback: { loop: true, fallback: ['balance', 'hurt'], proc: 'knockback', desc: 'Bumped: skidding backward, leaning back, arms windmilling, teetering.' },
  catch:     { loop: false, fallback: ['carry', 'action'], proc: 'catch', desc: 'Receive a present or pickup with a soft recoil.' },
  'wave-goodbye': { loop: false, fallback: ['wave'], proc: 'wave', desc: 'Warm farewell while turning to leave.' },
  // Round-2 wish poses requested by the minigames (image-requests.md). Games
  // ask for these names directly; until a character has frames for one, the
  // fallback chain picks the closest pose that character does have.
  swim:        { loop: true,  fallback: ['walk'], proc: 'swim', desc: 'Treading water, head and shoulders up, paddling.' },
  balance:     { loop: true,  fallback: ['surprised', 'crouch'], proc: 'balance', desc: 'Arms-out wobble on something unsteady.' },
  'splat-throw': { loop: false, fallback: ['throw'], proc: 'action', desc: 'Underhand lob of a paint balloon.' },
  'wand-up':   { loop: true,  fallback: ['ready', 'cast'], proc: 'wand-up', desc: 'Wand held high, trembling with anticipation.' },
  'broom-rise':  { loop: true, fallback: ['ride'], proc: 'ride', desc: 'On a broom, leaning forward, hair streaming.' },
  'broom-glide': { loop: true, fallback: ['ride'], proc: 'ride', desc: 'On a broom, upright and relaxed.' },
  'broom-zapped': { loop: false, fallback: ['hurt'], proc: 'hurt', desc: 'Frizzy hair, startled, tipped on the broom.' },
  count:       { loop: true,  fallback: ['think'], proc: 'talk', desc: 'Pointing a finger and counting along.' },
  'look-up':   { loop: true,  fallback: ['look-around', 'think'], proc: 'look-around', desc: 'Head tilted back watching the sky.' },
  crowned:     { loop: true,  fallback: ['walk'], proc: 'walk', desc: 'Proud royal strut, chin up (crown attached by code).' },
  sit:         { loop: true,  fallback: ['crouch', 'idle'], proc: 'crouch', desc: 'Sitting, legs dangling.' },
  tumble:      { loop: false, fallback: ['fall'], proc: 'fall', desc: 'Tumbling off an edge.' },
  'hold-present': { loop: true, fallback: ['carry'], proc: 'carry', desc: 'Box held overhead, nervous.' },
  toss:        { loop: false, fallback: ['throw'], proc: 'action', desc: 'Two-handed underhand toss.' },
  'catch-present': { loop: false, fallback: ['catch', 'surprised'], proc: 'catch', desc: 'Startled catch.' },
  sooty:       { loop: true,  fallback: ['dizzy'], auto: 'dizzy', proc: 'dizzy', desc: 'Dizzy with a soot-smudged face.' },
  drink:       { loop: false, fallback: ['eat'], proc: 'eat', desc: 'Sipping from a potion bottle.' },
  float:       { loop: true,  fallback: ['celebrate'], proc: 'float', desc: 'Arms out, drifting.' },
  hiccup:      { loop: false, fallback: ['surprised'], proc: 'surprised', desc: 'A jolt with puffed cheeks.' },
  giggle:      { loop: true,  fallback: ['laugh', 'cheer'], proc: 'clap', desc: 'Hand over mouth, laughing.' },
  'stomp-giant': { loop: true, fallback: ['ready', 'cheer'], proc: 'strike', desc: 'Proud wide stance.' },
  'squeak-tiny': { loop: false, fallback: ['surprised'], proc: 'surprised', desc: 'Surprised little hop.' },
  flip:        { loop: false, fallback: ['action'], proc: 'action', desc: 'Reaching out to flip a card.' },
  blow:        { loop: false, fallback: ['action'], proc: 'action', desc: 'Cheeks puffed, blowing out candles.' },
  'shake-sprinkles': { loop: true, fallback: ['paint'], proc: 'paint', desc: 'Shaking a sprinkle jar.' },
  'pose-twirl': { loop: false, fallback: ['strike3', 'ready'], proc: 'ready', desc: 'Runway dress twirl.' },
  photo:       { loop: true,  fallback: ['strike2', 'cheer'], proc: 'strike', desc: 'Peace sign facing the camera.' },
  sing:        { loop: true,  fallback: ['dance'], proc: 'dance', desc: 'Holding a mic and singing.' },
  water:       { loop: false, fallback: ['action'], proc: 'action', desc: 'Tilting a watering can.' },
  'catch-toy': { loop: false, fallback: ['jump', 'catch'], proc: 'cheer', desc: 'Leap to catch a toy.' },
};
export const POSE_NAMES = Object.keys(POSES);

// ---------------------------------------------------------------------------
// Asset loading

const baseImages = new Map();   // asset -> HTMLImageElement
const spriteSets = new Map();   // asset -> { manifest, poses: { name: {frames:[{img,rect,anchor,dur}], fps, loop, motion} }, portraits }
const params = new URLSearchParams(location.search);
let forceFallback = params.has('nosprites');
export function setForceFallback(v) { forceFallback = v; }
export function isForceFallback() { return forceFallback; }

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { console.warn('Missing image', src); resolve(null); };
    img.src = src;
  });
}

// Image quality: 'optimized' (default) draws the downscaled copies in
// assets/sprites-opt/ (tools/sprites/optimize.py); 'full' draws the originals.
// Coordinates always come from the original sprites.json; optimized frames are
// simply drawn at the original frame size.
const QUALITY_KEY = 'party.imageQuality';
let imageQuality = (() => {
  const q = params.get('quality');
  if (q === 'full' || q === 'optimized') return q;
  try { return localStorage.getItem(QUALITY_KEY) === 'full' ? 'full' : 'optimized'; } catch (e) { return 'optimized'; }
})();
let optIndex = {};
export function getImageQuality() { return imageQuality; }
/** Switch quality; loaded sets are dropped and reload on demand. */
export function setImageQuality(q) {
  q = q === 'full' ? 'full' : 'optimized';
  if (q === imageQuality) return;
  imageQuality = q;
  try { localStorage.setItem(QUALITY_KEY, q); } catch (e) { /* private mode */ }
  spriteSets.clear(); setLoads.clear(); tintCache.clear();
}

// Poses loaded with the set; the rest load the first time a game asks for
// them (a game uses ~6-12 of a character's 60-75 poses). Until a lazy pose
// is ready the character shows its idle frames.
const CORE_POSES = new Set(['idle', 'walk', 'run', 'celebrate', 'pout', 'cheer', 'sad', 'hurt', 'dizzy', 'ready', 'wave', 'surprised', 'think']);

async function loadSpriteSet(asset) {
  const dir = `assets/sprites/${asset}/`;
  const res = await fetch(dir + 'sprites.json', { cache: 'no-cache' });
  if (!res.ok) return null;
  const m = await res.json();
  if (!(Number.isFinite(m.bodyHeight) && m.bodyHeight > 0)) throw new Error('bodyHeight must be positive');
  const opt = imageQuality === 'optimized' ? optIndex[asset] : null;
  const imgDir = opt ? `assets/sprites-opt/${asset}/` : dir;
  const k = opt ? opt.scale || 1 : 1;
  const imgCache = new Map();
  const getImg = (file) => {
    if (!imgCache.has(file)) imgCache.set(file, loadImage(imgDir + file));
    return imgCache.get(file);
  };
  // Optimized frame missing (copy not rebuilt yet)? Use the original instead.
  const getFrameImg = (file) => getImg(file).then((img) => (img || !opt ? { img, k } : loadImage(dir + file).then((o) => ({ img: o, k: 1 }))));
  const atlas = m.atlas ? await loadImage(dir + m.atlas) : null; // atlases are never optimized
  const set = { manifest: m, poses: {}, portraits: {}, anchor: m.anchor, bodyHeight: m.bodyHeight, facing: m.facing ?? 0, quality: opt ? 'optimized' : 'full' };
  const aliases = [];
  const eager = [];
  for (const [name, def] of Object.entries(m.poses || {})) {
    if (typeof def === 'string') { aliases.push([name, { alias: def }]); continue; }
    if (def.alias) { aliases.push([name, def]); continue; }
    const frames = [];
    for (const f of def.frames || []) {
      // Frame forms: "file.webp" | [x,y,w,h] (atlas) | {src|rect, anchor?, dur?}
      const fo = typeof f === 'string' ? { src: f } : Array.isArray(f) ? { rect: f } : f;
      if (!fo.src && !atlas) continue;
      const rect = fo.rect || null;
      if (rect && (rect.length !== 4 || !rect.every(Number.isFinite) || rect[0] < 0 || rect[1] < 0 || rect[2] <= 0 || rect[3] <= 0 || rect[0] + rect[2] > atlas.width || rect[1] + rect[3] > atlas.height)) {
        console.warn('Invalid sprite rect', asset, name, rect); continue;
      }
      const anchor = fo.anchor || def.anchor || m.anchor;
      if (!anchor || anchor.length !== 2 || !anchor.every(Number.isFinite)) { console.warn('Invalid sprite anchor', asset, name); continue; }
      const fr = {
        img: fo.src ? null : atlas, src: fo.src || null, k: fo.src ? k : 1, w: 0, h: 0, failed: false, loading: null,
        rect, anchor, dur: Number.isFinite(fo.dur) && fo.dur > 0 ? fo.dur : null,
        head: fo.head || def.head || null, hand: fo.hand || def.hand || null,
        eyes: fo.eyes || def.eyes || null, neck: fo.neck || def.neck || null, back: fo.back || def.back || null,
        headAngle: fo.headAngle ?? def.headAngle ?? 0,
      };
      if (fr.src) fr.load = () => fr.loading || (fr.loading = getFrameImg(fr.src).then(({ img, k: fk }) => {
        if (!img) { fr.failed = true; return; }
        fr.k = fk; fr.img = img; fr.w = (img.naturalWidth || img.width) / fk; fr.h = (img.naturalHeight || img.height) / fk;
      }));
      frames.push(fr);
    }
    if (frames.length) {
      set.poses[name] = {
        frames, fps: Number.isFinite(def.fps) && def.fps > 0 ? def.fps : 8, loop: def.loop ?? POSES[name]?.loop ?? true,
        motion: clamp(def.motion ?? 0.25, 0, 1), holdLast: def.holdLast ?? true,
        facing: def.facing ?? m.facing ?? 0,
        bodyHeight: def.bodyHeight || m.bodyHeight,
      };
      if (CORE_POSES.has(name)) eager.push(set.poses[name]);
    }
  }
  // Resolve chains independently of manifest order; cycles stay unresolved.
  let pending = aliases;
  while (pending.length) {
    const next = [];
    for (const [name, def] of pending) {
      const target = set.poses[def.alias];
      if (target) set.poses[name] = { ...target, fps: def.fps > 0 ? def.fps : target.fps, loop: def.loop ?? POSES[name]?.loop ?? target.loop, motion: clamp(def.motion ?? target.motion, 0, 1), facing: def.facing ?? target.facing, holdLast: def.holdLast ?? target.holdLast };
      else next.push([name, def]);
    }
    if (next.length === pending.length) { console.warn('Unresolved sprite aliases', asset, next.map(([name]) => name)); break; }
    pending = next;
  }
  await Promise.all(eager.map(loadPose));
  for (const [expr, file] of Object.entries(m.portraits || {})) {
    const img = (await getFrameImg(file)).img;
    if (img) set.portraits[expr] = img;
  }
  return set;
}

function loadPose(sp) { return Promise.all(sp.frames.map((f) => (f.load ? f.load() : null))); }
const poseReady = (sp) => sp.frames.every((f) => f.img || f.failed) && !sp.frames.some((f) => f.failed);
/**
 * The pose to actually draw: `sp` once its frames are loaded, otherwise start
 * loading it and use the set's idle frames (or null = base art) meanwhile.
 */
export function usablePose(set, sp) {
  if (!sp) return null;
  if (poseReady(sp)) return sp;
  loadPose(sp);
  const idle = set && set.poses.idle;
  return idle && poseReady(idle) ? idle : null;
}

// ---------------------------------------------------------------------------
// Colour variants (data/variants.js) so several players can pick the same
// character. Variant 0 is the canonical art; 1..n are palette remaps baked once
// per (frame, variant) into a canvas cached on the frame record (fr.variants),
// so drawing costs the same as the original, and releasing a set or switching
// picture quality frees them. Baking runs under a per-animation-frame time
// budget; a pose whose recoloured frames aren't ready yet shows the recoloured
// idle pose meanwhile. If a canvas can't be read (file://), the canonical art
// is drawn instead.
const BAKE_BUDGET_MS = 8;
let bakeStamp = 0, bakeLeft = BAKE_BUDGET_MS;
function takeBakeBudget(force) {
  const now = performance.now();
  if (now - bakeStamp > 12) { bakeStamp = now; bakeLeft = BAKE_BUDGET_MS; } // a new animation frame
  return force || bakeLeft > 0;
}
/** Region mask for a frame (masks/<frame>.webp); null while loading, false if missing. */
function frameMask(fr, asset) {
  if (fr.mask === undefined) {
    fr.mask = null;
    loadImage(`assets/sprites/${asset}/masks/${fr.src}`).then((img) => { fr.mask = img || false; });
  }
  return fr.mask;
}
/** Recoloured canvas for frame fr in variant v, or null when not ready (force: bake now). */
function variantImg(fr, sp, asset, charId, v, force = false) {
  if (!v || !fr.img) return fr.img;
  const vs = fr.variants || (fr.variants = new Map());
  const done = vs.get(v);
  if (done) return done;
  const rules = rulesFor(charId, asset, v);
  if (!rules.length || fr.rect) { vs.set(v, fr.img); return fr.img; }
  const mask = MASK_SETS.has(asset) && rules.some((r) => r.mask) ? frameMask(fr, asset) : false;
  if (mask === null || !takeBakeBudget(force)) return null;
  const k = fr.k || 1, sc = (pt) => (pt ? [pt[0] * k, pt[1] * k] : null);
  const land = { eyes: sc(fr.eyes), neck: sc(fr.neck), head: sc(fr.head), anchor: sc(fr.anchor), bodyH: (sp.bodyHeight || 1) * k, k };
  const t0 = performance.now();
  let out;
  try { out = recolorFrame(fr.img, null, rules, land, mask || null); } catch (e) { out = fr.img; } // unreadable canvas
  bakeLeft -= performance.now() - t0;
  vs.set(v, out);
  return out;
}
const variantReady = (sp, asset, charId, v, force) => sp.frames.every((f) => variantImg(f, sp, asset, charId, v, force));

/** Bake a character's core poses for a variant in the background (e.g. during the how-to screen). */
export function prebakeVariant(charId, v) {
  if (!v) return;
  const ch = charById(charId);
  if (!ch) return;
  Promise.all(ch.members.map((m) => ensureSpriteSet(m.asset))).then(() => {
    const jobs = [];
    for (const m of ch.members) {
      const set = spriteSets.get(m.asset);
      if (!set) continue;
      for (const name of CORE_POSES) { const sp = set.poses[name]; if (sp) for (const f of sp.frames) jobs.push([f, sp, m.asset]); }
    }
    const step = () => {
      const t0 = performance.now();
      while (jobs.length && performance.now() - t0 < BAKE_BUDGET_MS) {
        const [f, sp, asset] = jobs.shift();
        if (f.img) variantImg(f, sp, asset, charId, v, true);
      }
      if (jobs.length) setTimeout(step, 16);
    };
    setTimeout(step, 0);
  });
}

/** Preload base art and any generated sprite sets. */
export async function loadSprites(onProgress = () => {}) {
  let done = 0;
  const total = ALL_ASSETS.length + 1;
  const tick = () => onProgress(++done / total);
  await Promise.all(ALL_ASSETS.map(async (a) => {
    const img = await loadImage(`assets/characters/${a}.webp`);
    if (img) baseImages.set(a, img);
    tick();
  }));
  // assets/sprites/index.json lists the assets that have sprite sets, so we
  // don't spray 404s for characters that aren't generated yet. Sets load on
  // demand (ensureSpriteSet) - a fully animated character decodes to tens of
  // MB, so only characters that actually appear are loaded.
  try {
    const res = await fetch('assets/sprites/index.json', { cache: 'no-cache' });
    if (res.ok) {
      const idx = await res.json();
      for (const a of idx.sets || []) indexedSets.add(a);
    }
    const o = await fetch('assets/sprites-opt/index.json', { cache: 'no-cache' });
    if (o.ok) optIndex = (await o.json()).sets || {};
  } catch (e) { /* no sprite index yet */ }
  tick();
}

const indexedSets = new Set();
const setLoads = new Map();   // asset -> Promise
/** Start loading an asset's sprite set if it has one (safe to call often). */
export function ensureSpriteSet(asset) {
  if (!indexedSets.has(asset)) return Promise.resolve(null);
  if (!setLoads.has(asset)) {
    setLoads.set(asset, loadSpriteSet(asset).then((s) => { if (s) spriteSets.set(asset, s); return s; })
      .catch((e) => { console.warn('Sprite set failed', asset, e); return null; }));
  }
  return setLoads.get(asset);
}
/** Load the sprite sets for these party entries (e.g. the party, before play). */
export function preloadCharacters(charIds) {
  return Promise.all(charIds.flatMap((id) => (charById(id)?.members || []).map((m) => ensureSpriteSet(m.asset))));
}
export const indexedSpriteSets = () => [...indexedSets];
/**
 * Drop loaded sets except these party entries' (call when the party changes).
 * NPC sets reload on demand when a game shows them again.
 */
export function releaseSpriteSets(keepCharIds = []) {
  const keep = new Set(keepCharIds.flatMap((id) => (charById(id)?.members || []).map((m) => m.asset)));
  for (const a of [...setLoads.keys()]) if (!keep.has(a)) { setLoads.delete(a); spriteSets.delete(a); }
  tintCache.clear();
}

export const getBaseImage = (asset) => baseImages.get(asset);
export const getSpriteSet = (asset) => (forceFallback ? null : spriteSets.get(asset));
export const loadedSpriteSets = () => [...spriteSets.keys()];

// Tinted silhouettes for hit flashes and the sad blue wash.
// Bounded: each entry is a full-size canvas, so keep only the most recent.
const TINT_MAX = 24;
const tintCache = new Map();   // img -> Map(color -> canvas), insertion order = age
let tintCount = 0;
function tinted(img, color) {
  let byColor = tintCache.get(img);
  if (byColor) { tintCache.delete(img); tintCache.set(img, byColor); } // mark recent
  else { byColor = new Map(); tintCache.set(img, byColor); }
  let c = byColor.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    byColor.set(color, c); tintCount++;
    while (tintCount > TINT_MAX && tintCache.size > 1) {
      const [oldImg, oldMap] = tintCache.entries().next().value;
      tintCount -= oldMap.size; tintCache.delete(oldImg);
    }
  }
  return c;
}

// Player-colour outline for duplicate picks whose recolour is subtle
// (variants.js WEAK_VARIANTS): a small silhouette per (image, colour), drawn
// at 8 offsets behind the art. Kept small (it's only an outline) and weakly
// keyed so it goes away with its frame.
const GLOW_H = 160;
const glowCache = new WeakMap();   // img -> Map(color -> canvas)
function glowSilhouette(img, color) {
  let byColor = glowCache.get(img);
  if (!byColor) { byColor = new Map(); glowCache.set(img, byColor); }
  let c = byColor.get(color);
  if (!c) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, s = Math.min(1, GLOW_H / h);
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    byColor.set(color, c);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Procedural motion. Returns offsets applied around the foot point.
//   lift: px up, rot: radians (positive leans toward facing), sx/sy: scale,
//   dx: px toward facing, tint: [color, alpha] | null

const MOTION_FREQ = { walk: 2.4, trot: 3.2, glide: 1.4, bounce: 2.2, clunk: 2.6, hop: 2.8, stomp: 1.6 };

function procedural(pose, t, style, speed, allowMirror = true) { // allowMirror: base art may face the other way on dance beats (never a squashed "paper" spin)
  const o = { lift: 0, rot: 0, sx: 1, sy: 1, dx: 0, tint: null, shadowScale: 1 };
  const breathe = Math.sin(t * TAU * 0.8);
  const floaty = style === 'glide';
  if (floaty) { o.lift = 10 + Math.sin(t * 2.4) * 5; o.rot = Math.sin(t * 2.4) * 0.03; }

  const gait = (rate) => {
    const f = MOTION_FREQ[style] * rate;
    const ph = t * f;
    switch (style) {
      case 'bounce': case 'hop': {
        const p = ph % 1, h = style === 'bounce' ? 30 : 20;
        o.lift = Math.sin(p * Math.PI) * h;
        const sq = p < 0.12 ? 1 - p / 0.12 : p > 0.9 ? (p - 0.9) / 0.1 : 0;
        o.sy = 1 - 0.14 * sq + 0.06 * Math.sin(p * Math.PI); o.sx = 1 + 0.12 * sq;
        o.rot = Math.sin(ph * TAU * 0.5) * 0.05; break;
      }
      case 'glide':
        o.lift = 16 + Math.sin(ph * TAU) * 7; o.rot = 0.06 + Math.sin(ph * TAU) * 0.08; break;
      case 'clunk':
        o.lift = Math.abs(Math.sin(ph * Math.PI)) * 7;
        o.rot = (Math.sin(ph * Math.PI) > 0 ? 1 : -1) * 0.07; o.sy = 1 - Math.abs(Math.cos(ph * Math.PI)) * 0.04; break;
      case 'stomp':
        o.lift = Math.abs(Math.sin(ph * Math.PI)) * 6; o.rot = Math.sin(ph * Math.PI) * 0.06;
        o.sy = 1 - Math.pow(Math.abs(Math.cos(ph * Math.PI)), 6) * 0.06; break;
      case 'trot':
        o.lift = Math.abs(Math.sin(ph * Math.PI)) * 9; o.rot = 0.03 + Math.sin(ph * TAU) * 0.03; break;
      default: // walk
        o.lift = Math.abs(Math.sin(ph * Math.PI)) * 11; o.rot = Math.sin(ph * Math.PI) * 0.06;
        o.sy = 1 + Math.abs(Math.sin(ph * Math.PI)) * 0.02;
    }
  };

  switch (pose) {
    case 'idle': case 'think':
      if (!floaty) { o.sy = 1 + breathe * 0.018; o.sx = 1 - breathe * 0.01; }
      if (pose === 'think') o.rot += Math.sin(t * 1.3) * 0.06;
      break;
    case 'walk': case 'carry': gait(0.6 + 0.6 * speed); break;
    case 'run': gait(1.1 + 0.6 * speed); o.rot += 0.12; break;
    case 'jump': o.sy = 1.12; o.sx = 0.9; o.rot += 0.05; break;
    case 'fall': o.sy = 1.04; o.sx = 0.97; o.rot -= 0.04; break;
    case 'land': { const k = Math.max(0, 1 - t / 0.25); o.sy = 1 - 0.2 * k; o.sx = 1 + 0.18 * k; break; }
    case 'celebrate': {
      const p = (t / 0.52) % 1;
      o.lift += Math.sin(p * Math.PI) * 46;
      const sq = p < 0.12 ? 1 - p / 0.12 : 0;
      o.sy = 1 - 0.16 * sq + 0.1 * Math.sin(p * Math.PI); o.sx = 1 + 0.14 * sq - 0.05 * Math.sin(p * Math.PI);
      o.rot = Math.sin(t * 5) * 0.12;
      break;
    }
    case 'cheer': {
      const p = Math.min(1, t / 0.45);
      o.lift += Math.sin(p * Math.PI) * 30; o.sy = 1 + Math.sin(p * Math.PI) * 0.1; o.sx = 1 - Math.sin(p * Math.PI) * 0.05;
      o.rot = Math.sin(t * 14) * 0.08 * (1 - p);
      break;
    }
    case 'dance': {
      const b = t * 2.2;
      o.lift += Math.abs(Math.sin(b * Math.PI)) * 18; o.rot = Math.sin(b * Math.PI) * 0.16;
      o.sy = 1 - Math.pow(Math.abs(Math.cos(b * Math.PI)), 4) * 0.1; o.sx = allowMirror ? (Math.floor(b / 2) % 2 ? -1 : 1) : 1;
      break;
    }
    case 'pout': case 'sad':
      o.sy = 0.93 + Math.sin(t * 1.4) * 0.01; o.sx = 1.04; o.rot = -0.1 + Math.sin(t * 1.1) * 0.03;
      o.tint = ['#3a5bd0', 0.16]; break;
    case 'hurt': {
      const k = Math.max(0, 1 - t / 0.5);
      o.dx = Math.sin(t * 70) * 7 * k - 10 * k; o.rot = -0.25 * k; o.sy = 1 - 0.1 * k; o.sx = 1 + 0.08 * k;
      o.tint = ['#ff3355', 0.5 * k]; break;
    }
    case 'dizzy': o.rot = Math.sin(t * 5) * 0.14; o.sx = 1 + Math.sin(t * 10) * 0.03; break;
    case 'surprised': {
      const k = Math.max(0, 1 - t / 0.35);
      o.lift += Math.sin(Math.min(1, t / 0.3) * Math.PI) * 22; o.sy = 1 + 0.16 * k; o.sx = 1 - 0.1 * k; break;
    }
    case 'wave': o.rot = Math.sin(t * 7) * 0.09; o.lift += Math.abs(Math.sin(t * 3.5)) * 6; break;
    case 'ready': {
      const p = Math.min(1, t / 0.5);
      o.lift += Math.sin(p * Math.PI) * 34; o.sy = 1 + Math.sin(p * Math.PI) * 0.1;
      break;
    }
    case 'action': case 'throw': case 'push': case 'paint': {
      const cyc = pose === 'paint' ? (t % 0.6) : t;
      if (cyc < 0.08) { const k = cyc / 0.08; o.sx = 1 + 0.12 * k; o.sy = 1 - 0.1 * k; o.dx = -8 * k; o.rot = -0.08 * k; }
      else { const k = Math.max(0, 1 - (cyc - 0.08) / 0.25); o.sx = 1 - 0.06 * k; o.sy = 1 + 0.08 * k; o.dx = 16 * k; o.rot = 0.16 * k; }
      break;
    }
    case 'sleep': o.sy = 0.95 + breathe * 0.025; o.rot = -0.05; break;
    case 'clap': { const p = (t * 2.4) % 1; o.lift += Math.sin(p * Math.PI) * 10; o.sy = 1 + Math.sin(p * Math.PI) * 0.05; o.rot = Math.sin(t * 9) * 0.04; break; }
    case 'eat': { const c = Math.abs(Math.sin(t * 14)); o.sy = 1 - c * 0.06; o.sx = 1 + c * 0.05; break; }
    case 'ride': o.rot = 0.14 + Math.sin(t * 3) * 0.04; o.lift += Math.sin(t * 2.2) * 4; break;
    case 'bow': { const k = Math.sin(Math.min(1, t / 0.7) * Math.PI); o.rot = 0.35 * k; o.sy = 1 - 0.06 * k; o.dx = 6 * k; break; }
    case 'strike': { const k = Math.min(1, t / 0.15); o.sy = 1 + 0.12 * (1 - k) + 0.03; o.sx = 1 - 0.06 * (1 - k); o.rot = -0.12 * k; o.lift += 8 * (1 - k); break; }
    case 'dance-up': { const k = Math.max(0, 1 - t / 0.4); o.sy = 1 + 0.14 * k; o.sx = 1 - 0.08 * k; o.lift += 16 * k; break; }
    case 'dance-down': { const k = Math.max(0, 1 - t / 0.4); o.sy = 1 - 0.16 * k; o.sx = 1 + 0.12 * k; break; }
    case 'dance-side': { const k = Math.max(0, 1 - t / 0.4); o.rot = 0.22 * k; o.dx = 14 * k; break; }
    case 'shake': { const k = Math.max(0, 1 - t / 0.7); o.rot = Math.sin(t * 50) * 0.18 * k; o.sx = 1 + Math.sin(t * 50) * 0.05 * k; break; }
    case 'talk': o.sy = 1 + Math.abs(Math.sin(t * 9)) * 0.025; o.rot = Math.sin(t * 2) * 0.04; break;
    case 'windup': { const k = Math.min(1, t / 0.6); o.sy = 1 - 0.12 * k; o.sx = 1 + 0.1 * k; o.dx = -10 * k; o.rot = -0.1 * k + Math.sin(t * 40) * 0.02 * k; break; }
    case 'look-around': o.rot = Math.sin(t * 1.8) * .06; o.dx = Math.sin(t * .9) * 3; break;
    case 'high-five': { const k = Math.sin(Math.min(1, t / .45) * Math.PI); o.dx = 9 * k; o.lift += 5 * k; o.rot = .06 * k; break; }
    case 'crouch': o.sy = .96 + breathe * .012; o.sx = 1.035; break;
    case 'swim': o.lift = Math.sin(t * 3.2) * 4 - 6; o.rot = Math.sin(t * 2.4) * 0.06; break;
    case 'balance': o.rot = Math.sin(t * 7) * 0.12; o.dx = Math.sin(t * 7) * 3; break;
    case 'wand-up': o.sy = 1.03 + Math.sin(t * 30) * 0.006; o.dx = Math.sin(t * 40) * 0.8; break;
    case 'float': o.lift += 18 + Math.sin(t * 2) * 8; o.rot = Math.sin(t * 1.6) * 0.08; break;
    // Snap into a forward lunge and hold it for as long as the pose plays.
    case 'dash': { const k = Math.min(1, t / .07); o.rot = .2 * k; o.sx = 1 + .1 * k; o.sy = 1 - .06 * k; o.dx = 12 * k; break; }
    // Hip leads toward facing: upper body leans away, hips pushed out, with a
    // quick extra pop at the start (replayed on contact).
    case 'hip-bump': {
      const k = Math.min(1, t / .07), pop = Math.sin(Math.min(1, t / .14) * Math.PI);
      o.rot = -(.32 + .1 * pop) * k; o.dx = (18 + 10 * pop) * k; o.sy = 1 - .04 * k; o.sx = 1 + .05 * k;
      o.lift += 6 * pop; break;
    }
    // Pushed backward: big lean away from facing, then a teetering wobble.
    case 'knockback': {
      const k = Math.min(1, t / .06), w = Math.exp(-t * 3);
      o.rot = -(.36 + Math.sin(t * 18) * .1 * w) * k; o.dx = -14 * k; o.sy = 1 - .05 * k; o.sx = 1 + .04 * k;
      o.lift += Math.abs(Math.sin(t * 18)) * 5 * w;
      o.tint = ['#ff3355', .45 * Math.max(0, 1 - t / .25)]; break;
    }
    case 'catch': { const k = Math.sin(Math.min(1, t / .35) * Math.PI); o.dx = -7 * k; o.sy = 1 - .07 * k; o.rot = -.06 * k; break; }
    default: break;
  }
  return o;
}

// ---------------------------------------------------------------------------

export function resolvePose(set, name) {
  if (!set) return null;
  if (set.poses[name]) return set.poses[name];
  const seen = new Set([name]);
  const queue = [...(POSES[name]?.fallback || [])];
  while (queue.length) {
    const n = queue.shift();
    if (seen.has(n)) continue;
    seen.add(n);
    if (set.poses[n]) return set.poses[n];
    queue.push(...(POSES[n]?.fallback || []));
  }
  return set.poses.idle || null;
}

let actorSerial = 0;

export class Actor {
  /**
   * @param {string|object} who  party entry id from data/characters.js (or 'troll'),
   *                             or a player (uses its charId, colour variant and glow)
   * @param {object} opts    { scale = 1, x, y, load = true (false: don't fetch the sprite set; use it only if already loaded),
   *                           variant (colour scheme, 0 = canonical), glow (outline colour) }
   */
  constructor(who, opts = {}) {
    const player = who && typeof who === 'object' ? who : null;
    this.char = charById(player ? player.charId : who) || CHARACTERS[0];
    this.charId = this.char.id;
    this.variant = opts.variant ?? player?.variant ?? 0;
    this.glow = opts.glow ?? player?.glow ?? null;
    this.scale = opts.scale ?? 1;
    this.x = opts.x ?? 0; this.y = opts.y ?? 0; this.z = 0;
    this.facing = opts.facing ?? 1;
    this._facingSmooth = this.facing;
    this.speed = 0;             // 0..1 animation speed hint for walk/run
    this.pose = 'idle';
    this.poseTime = Math.random() * 3;
    this._once = null;          // { pose, left, then }
    this._spring = { v: 0, p: 0 }; // squash spring: p > 0 squashed (wide), < 0 stretched
    this._flash = { color: '#fff', t: 0, dur: 0 };
    this.emotes = [];           // { kind, t, dur }
    this.alpha = 1;
    this.visible = true;
    this.time = 0;
    this.seed = (actorSerial++ * 0.37) % 1;
    this._autoEmoteT = 0;
    this._history = [];         // leader trail for followers
    this.attachments = [];      // { fn, member, behind }
    if (opts.load !== false) for (const m of this.char.members) ensureSpriteSet(m.asset);
    this.members = this.char.members.map((m, i) => ({
      def: m, i, x: this.x + m.dx * this.facing * this.scale, y: this.y + m.dy * this.scale, facing: this.facing,
      phase: i * 0.21,
    }));
  }

  get leader() { return this.char.members[0]; }
  /** Approximate on-screen height of the leader (px). */
  get height() { return this.leader.h * this.scale; }
  /** Approximate width of the whole formation (px). */
  get width() {
    let lo = 0, hi = 0;
    for (const m of this.char.members) {
      const img = baseImages.get(m.asset);
      const w = img ? (img.width / img.height) * m.h : m.h * 0.6;
      lo = Math.min(lo, m.dx - w / 2); hi = Math.max(hi, m.dx + w / 2);
    }
    return (hi - lo) * this.scale;
  }
  /** Collision radius suggestion for top-down games. */
  get radius() { return Math.max(34, Math.min(this.width, this.height) * 0.36); }

  setPose(name, { restart = false } = {}) {
    if (this._once) { this._once.then = name; return this; }
    if (name !== this.pose || restart) { this.pose = name; this.poseTime = 0; }
    return this;
  }
  /** Play a pose for `dur` seconds, then return to the pose that was active (or `then`). */
  playOnce(name, dur = null, then = null) {
    const back = then || (this._once ? this._once.then : this.pose);
    const sp = getSpriteSet(this.leader.asset)?.poses[name];
    const duration = Number.isFinite(dur) && dur > 0 ? dur : (sp ? poseDuration(sp) : 0.5);
    this._once = { pose: name, left: duration, duration, then: back };
    this.pose = name; this.poseTime = 0;
    return this;
  }
  get currentPose() { return this.pose; }
  squash(amount = 0.25) { this._spring.v += amount * 14; return this; }
  flash(color = '#ffffff', dur = 0.15) { this._flash = { color, t: dur, dur }; return this; }
  /** Persistent color wash (e.g. a potion effect); tint(null) clears it. */
  tint(color, alpha = 0.35) { this._tint = color ? { color, alpha } : null; return this; }
  emote(kind, dur = 1.2) {
    this.emotes = this.emotes.filter((e) => e.kind !== kind);
    this.emotes.push({ kind, t: 0, dur });
    return this;
  }
  clearEmotes() { this.emotes = []; return this; }

  /**
   * Speech bubble above the head. Characters never say words out loud: the
   * bubble launches with a non-word voice sound (giggle, yip, beep...).
   * a.say('Yay!', 1.5, 'yay')   kind: hello ready yay aww ouch woo laugh gasp, or null for silent
   * a.say(null) clears.
   */
  say(text, dur = 1.6, kind = 'laugh') {
    this.speech = text ? { text, t: 0, dur } : null;
    if (text && kind) voice(this.charId, kind);
    return this;
  }

  /** Draw something attached to a member (see header). Returns a handle for detach(). */
  attach(fn, { member = 0, behind = false } = {}) {
    const h = { fn, member, behind };
    this.attachments.push(h);
    return h;
  }
  detach(h) { this.attachments = this.attachments.filter((a) => a !== h); }

  /**
   * World position of an anchor ('head' top-of-head, 'hand', 'feet', 'center')
   * on the leader, ignoring squash/tilt. Handy for placing props and emotes.
   */
  anchor(name = 'head') {
    const m = this.members[0], d = m.def, h = d.h * this.scale;
    const { set, sp, t } = this._spriteState(m, this.pose);
    if (sp) {
      const fr = pickFrame(sp, t), point = fr[name];
      if (point) {
        const a = fr.anchor || set.anchor, scale = h / (sp.bodyHeight || set.bodyHeight);
        const flip = (sp.facing ?? set.facing) === -1 ? -1 : 1;
        return { x: m.x + (point[0] - a[0]) * scale * flip * m.facing, y: m.y - this.z + (point[1] - a[1]) * scale };
      }
    }
    const img = baseImages.get(d.asset);
    const aspect = img ? img.width / img.height : 0.6;
    const artDir = d.facing === -1 ? -1 : 1;
    const headDx = (d.face[0] - aspect / 2) * h * artDir;
    switch (name) {
      case 'head': return { x: m.x + headDx * m.facing, y: m.y - this.z - (d.top ?? 1) * h };
      case 'hand': return { x: m.x + 0.28 * h * m.facing, y: m.y - this.z - 0.5 * h };
      case 'eyes': return { x: m.x + headDx * m.facing, y: m.y - this.z - (1 - d.face[1]) * h };
      case 'center': return { x: m.x, y: m.y - this.z - 0.5 * h };
      default: return { x: m.x, y: m.y - this.z };
    }
  }

  /** Convenience for movers: sets facing, speed hint and walk/idle pose from a velocity. */
  moveAnim(vx, vy, maxSpeed, { run = false } = {}) {
    const sp = Math.hypot(vx, vy);
    if (Math.abs(vx) > 4) this.facing = vx > 0 ? 1 : -1;
    this.speed = clamp(sp / (maxSpeed || 1), 0, 1);
    if (!this._once) this.setPose(sp > maxSpeed * 0.08 ? (run ? 'run' : 'walk') : 'idle');
    return this;
  }

  /** Teleport followers to their formation slots (after placing the actor). */
  snap() {
    this._history = [];
    this._facingSmooth = this.facing;
    for (const m of this.members) {
      m.x = this.x + m.def.dx * this.facing * this.scale; m.y = this.y + m.def.dy * this.scale; m.facing = this.facing;
    }
    return this;
  }

  update(dt) {
    this.time += dt;
    this.poseTime += dt;
    if (this._once) {
      this._once.left -= dt;
      if (this._once.left <= 0) { const n = this._once.then, overshoot = -this._once.left; this._once = null; this.pose = n; this.poseTime = overshoot; }
    }
    // Squash spring.
    const s = this._spring;
    s.v += (-s.p * 260 - s.v * 16) * dt; s.p += s.v * dt;
    if (this._flash.t > 0) this._flash.t -= dt;
    for (const e of this.emotes) e.t += dt;
    if (this.speech) { this.speech.t += dt; if (this.speech.t > this.speech.dur) this.speech = null; }
    this.emotes = this.emotes.filter((e) => e.dur <= 0 || e.t < e.dur);
    this._facingSmooth = damp(this._facingSmooth, this.facing, 10, dt);

    // Auto emotes (rain cloud on pout, sparkles on celebrate...).
    const pd = POSES[this.pose] || {};
    const lset = getSpriteSet(this.leader.asset);
    const usingSprites = !!(lset && lset.poses[this.pose]);
    const auto = pd.auto || (!usingSprites ? pd.autoFallback : null);
    if (auto && !this.emotes.some((e) => e.kind === auto)) this.emotes.push({ kind: auto, t: 0, dur: 0, auto: true });
    this.emotes = this.emotes.filter((e) => !e.auto || e.kind === auto);

    // Followers trail the leader's path.
    this._history.push({ x: this.x, y: this.y, t: this.time });
    while (this._history.length > 2 && this._history[1].t < this.time - 0.6) this._history.shift();
    for (const m of this.members) {
      const lag = m.def.follow;
      let px = this.x, py = this.y;
      if (lag > 0) {
        const target = this.time - lag;
        for (let i = this._history.length - 1; i >= 0; i--) {
          if (this._history[i].t <= target) { px = this._history[i].x; py = this._history[i].y; break; }
          if (i === 0) { px = this._history[0].x; py = this._history[0].y; }
        }
      }
      const tx = px + m.def.dx * this._facingSmooth * this.scale;
      const ty = py + m.def.dy * this.scale;
      if (lag > 0) {
        if (Math.hypot(tx - m.x, ty - m.y) > 600 * this.scale) { m.x = tx; m.y = ty; }
        m.x = damp(m.x, tx, 14, dt); m.y = damp(m.y, ty, 14, dt);
        const mvx = tx - m.x;
        m.facing = Math.abs(mvx) > 3 ? Math.sign(mvx) : this.facing;
      } else { m.x = tx; m.y = ty; m.facing = this.facing; }
    }
  }

  /**
   * Draw at the actor's position. Options:
   *   shadow (default true), ring: color for a player ring under the feet,
   *   alpha, scale (extra multiplier), emotes (default true), pose (override)
   */
  draw(g, opts = {}) {
    if (!this.visible) return;
    const sc = this.scale * (opts.scale ?? 1);
    const alpha = this.alpha * (opts.alpha ?? 1);
    if (alpha <= 0) return;
    const order = this.members.slice().sort((a, b) => a.y - b.y);
    if (opts.shadow !== false) {
      for (const m of order) this._drawShadow(g, m, sc, alpha);
    }
    if (opts.ring) this._drawRing(g, opts.ring, sc, alpha);
    for (const m of order) this._drawMember(g, m, sc, alpha, opts.pose || this.pose);
    if (this.speech && opts.emotes !== false) {
      const top = this.y - this.z - this.height * (opts.scale ?? 1) - (this.emotes.length ? 86 : 30);
      drawSpeech(g, this.speech.text, this.x, top, Math.max(0.75, Math.min(1.25, sc)), this.speech.t, this.speech.dur, alpha);
    }
    if (opts.emotes !== false && this.emotes.length) {
      const top = this.y - this.z - this.height * (opts.scale ?? 1) - 26;
      const size = 44 * Math.max(0.7, Math.min(1.3, sc));
      this.emotes.forEach((e, i) => drawEmote(g, e.kind, this.x + (i - (this.emotes.length - 1) / 2) * size * 1.2, top, size, e.t));
    }
  }

  _memberSize(m) {
    const img = baseImages.get(m.def.asset);
    return img ? { w: (img.width / img.height) * m.def.h, h: m.def.h } : { w: m.def.h * 0.6, h: m.def.h };
  }

  _drawShadow(g, m, sc, alpha) {
    const { w } = this._memberSize(m);
    const zs = Math.max(0.4, 1 - this.z / 300);
    g.save();
    g.globalAlpha = 0.22 * alpha * zs;
    g.fillStyle = '#1b1030';
    g.beginPath();
    g.ellipse(m.x, m.y, Math.max(18, w * 0.36) * sc * zs, Math.max(6, w * 0.08) * sc * zs, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  _drawRing(g, color, sc, alpha) {
    const r = Math.max(46, this.width * 0.42) * (sc / this.scale);
    g.save();
    g.globalAlpha = alpha;
    g.lineWidth = 6;
    g.strokeStyle = color;
    g.beginPath(); g.ellipse(this.x, this.y + 2, r, r * 0.3, 0, 0, TAU); g.stroke();
    g.globalAlpha = alpha * 0.25; g.fillStyle = color; g.fill();
    g.restore();
  }

  _spriteState(m, pose) {
    const set = getSpriteSet(m.def.asset);
    let sp = set ? resolvePose(set, pose) : null;
    // Followers vary their looping phase but start one-shots at frame zero.
    let t = this.poseTime + (m.i && (POSES[pose]?.loop ?? sp?.loop) ? m.phase : 0);
    if (this._once && pose === this._once.pose && sp) t = this.poseTime / this._once.duration * poseDuration(sp);
    if (sp && !sp.loop && !sp.holdLast && t >= poseDuration(sp)) sp = set.poses.idle || sp;
    sp = usablePose(set, sp);
    // Colour variant: draw a pose once its recoloured frames exist; meanwhile
    // the recoloured idle (baked now: it's 1-3 frames), else the base art.
    if (sp && this.variant && !variantReady(sp, m.def.asset, this.charId, this.variant, false)) {
      const idle = set.poses.idle;
      sp = idle && usablePose(set, idle) === idle && variantReady(idle, m.def.asset, this.charId, this.variant, true) ? idle : null;
    }
    return { set, sp, t };
  }

  _drawMember(g, m, sc, alpha, pose) {
    const def = m.def;
    const { set, sp, t } = this._spriteState(m, pose);
    const motionW = sp ? sp.motion : 1;
    const o = procedural(POSES[pose]?.proc || pose, this.poseTime + (m.i && POSES[pose]?.loop ? m.phase : 0) + this.seed * (pose === 'idle' ? 3 : 0), def.motion, this.speed, !sp);

    // Blend procedural motion toward neutral when sprite frames carry the
    // animation. A pose that fell back to a different pose's frames keeps the
    // full procedural motion so it still reads (e.g. celebrate on idle frames).
    const k = sp && set.poses[pose] !== sp ? Math.max(motionW, 0.9) : motionW;
    const lift = o.lift * k, rot = o.rot * k, dx = o.dx * k;
    let sx = 1 + (o.sx - 1) * (sp ? Math.min(1, k) : 1);
    let sy = 1 + (o.sy - 1) * k;
    const sq = clamp(this._spring.p, -0.5, 0.6);
    sx *= 1 + sq * 0.5; sy *= 1 - sq * 0.5;

    const face = m.facing;
    let img, rect = null, anchor, bodyH, artFacing;
    if (sp) {
      const fr = pickFrame(sp, t);
      img = fr.img; rect = fr.rect; anchor = fr.anchor || set.anchor;
      if (this.variant) img = variantImg(fr, sp, def.asset, this.charId, this.variant, true) || fr.img;
      bodyH = sp.bodyHeight || set.bodyHeight; artFacing = sp.facing ?? set.facing;
    } else {
      img = baseImages.get(def.asset);
      if (!img) return;
      anchor = [img.width / 2, img.height]; bodyH = img.height; artFacing = def.facing;
    }
    const pxScale = (def.h * sc) / bodyH;
    // Forward space: +x = facing direction. The art itself is mirrored only
    // when it was drawn looking left.
    const imgFlip = artFacing === -1 ? -1 : 1;
    // Frames carry their original size (optimized copies are smaller images).
    const fr0 = sp ? pickFrame(sp, t) : null;
    const sw = rect ? rect[2] : fr0 ? fr0.w : img.width, sh = rect ? rect[3] : fr0 ? fr0.h : img.height;
    const atts = this.attachments.length ? this.attachments.filter((a) => a.member === m.i) : null;

    g.save();
    g.globalAlpha = alpha;
    g.translate(m.x + dx * face * sc, m.y - (this.z + lift * sc));
    g.rotate(rot * face);
    g.scale(sx * face, sy);
    let info = null;
    if (atts && atts.length) {
      info = this._attachInfo(m, def, sc, pxScale, imgFlip, sp, img, anchor, pose, t);
      for (const a of atts) if (a.behind) { g.save(); a.fn(g, info); g.restore(); }
    }
    g.save();
    g.scale(imgFlip * pxScale, pxScale);
    const ox = -anchor[0], oy = -anchor[1];
    const drawIt = (src) => {
      if (rect) g.drawImage(src, rect[0], rect[1], sw, sh, ox, oy, sw, sh);
      else g.drawImage(src, ox, oy, sw, sh);
    };
    if (this.glow) {
      const gs = glowSilhouette(img, this.glow), d = 3.2 / pxScale;
      for (let a = 0; a < 8; a++) { const ang = a * TAU / 8; g.save(); g.translate(Math.cos(ang) * d, Math.sin(ang) * d); g.drawImage(gs, ox, oy, sw, sh); g.restore(); }
    }
    drawIt(img);
    if (o.tint && o.tint[1] > 0.01) { g.globalAlpha = alpha * o.tint[1] * (sp ? 0.5 : 1); drawIt(tinted(img, o.tint[0])); }
    if (this._tint && this._tint.alpha > 0.01) { g.globalAlpha = alpha * this._tint.alpha; drawIt(tinted(img, this._tint.color)); }
    if (this._flash.t > 0) { g.globalAlpha = alpha * (this._flash.t / this._flash.dur); drawIt(tinted(img, this._flash.color)); }
    g.restore();
    if (info) { g.globalAlpha = alpha; for (const a of atts) if (!a.behind) { g.save(); a.fn(g, info); g.restore(); } }
    g.restore();
  }

  _attachInfo(m, def, sc, pxScale, imgFlip, sp, img, anchor, pose, t) {
    const h = def.h * sc;
    const base = baseImages.get(def.asset);
    const aspect = base ? base.width / base.height : 0.6;
    let head = { x: (def.face[0] - aspect / 2) * h * imgFlip, y: -(def.top ?? 1) * h };
    let hand = { x: 0.28 * h, y: -0.5 * h };
    const [, fcy, fr] = def.face;
    let eyes = { x: head.x, y: -(1 - fcy) * h };
    let neck = { x: head.x, y: -(1 - Math.min(0.95, fcy + fr * 0.95)) * h };
    let back = { x: -0.12 * h, y: -0.58 * h };
    if (sp) {
      // Sprite frames may carry their own anchor points (frame pixels).
      const fr = pickFrame(sp, t);
      const conv = (pt) => ({ x: (pt[0] - anchor[0]) * pxScale * imgFlip, y: (pt[1] - anchor[1]) * pxScale });
      if (fr.head) head = conv(fr.head);
      if (fr.hand) hand = conv(fr.hand);
      if (fr.eyes) eyes = conv(fr.eyes);
      if (fr.neck) neck = conv(fr.neck);
      if (fr.back) back = conv(fr.back);
    }
    return { h, w: aspect * h, head, hand, eyes, neck, back, headAngle: fr0Angle(sp, t), pose, facing: m.facing, member: m.i };
  }
}

/** Per-frame head tilt (radians) from the sprite set, 0 for base art. */
function fr0Angle(sp, t) { return sp ? pickFrame(sp, t).headAngle || 0 : 0; }

export function poseDuration(sp) { return sp.frames.reduce((total, fr) => total + (fr.dur || 1 / sp.fps), 0); }

/**
 * Rounded speech bubble whose tail points at (x, y). tail: 'down' (bubble
 * above the point) or 'left' (bubble to the right of the point).
 */
export function drawSpeech(g, text, x, y, scale = 1, t = 1, dur = 0, alpha = 1, tail = 'down') {
  const pop = Math.min(1, t / 0.15), fade = dur ? Math.min(1, (dur - t) / 0.2) : 1;
  const k = (0.6 + 0.4 * pop) * scale;
  g.save();
  g.globalAlpha = alpha * Math.max(0, fade);
  g.translate(x, y); g.scale(k, k);
  g.font = '700 30px Fredoka, "Baloo 2", system-ui, sans-serif';
  const w = Math.max(70, g.measureText(text).width + 36), h = 52, r = 22;
  const x0 = tail === 'left' ? 18 : -w / 2, y0 = tail === 'left' ? -h / 2 : -h - 14;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#24163f'; g.lineWidth = 4; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x0 + r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + h, r); g.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  if (tail === 'left') {
    g.arcTo(x0, y0 + h, x0, y0, r); g.lineTo(x0, 10); g.lineTo(0, 0); g.lineTo(x0, -10);
  } else {
    g.lineTo(10, y0 + h); g.lineTo(0, 0); g.lineTo(-10, y0 + h);
    g.arcTo(x0, y0 + h, x0, y0, r);
  }
  g.arcTo(x0, y0, x0 + w, y0, r); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#24163f'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x0 + w / 2, y0 + h / 2 + 1);
  g.restore();
}

export function pickFrame(sp, t) {
  t = Math.max(0, Number.isFinite(t) ? t : 0);
  const n = sp.frames.length;
  if (n === 1) return sp.frames[0];
  // Per-frame durations if given, otherwise uniform fps.
  if (sp.frames.some((f) => f.dur)) {
    const durs = sp.frames.map((f) => f.dur || 1 / sp.fps);
    const total = durs.reduce((a, b) => a + b, 0);
    let tt = sp.loop ? t % total : Math.min(t, total - 1e-4);
    for (let i = 0; i < n; i++) { if (tt < durs[i]) return sp.frames[i]; tt -= durs[i]; }
    return sp.frames[n - 1];
  }
  let i = Math.floor(t * sp.fps);
  i = sp.loop ? i % n : Math.min(i, n - 1);
  return sp.frames[i];
}

// ---------------------------------------------------------------------------
// Portraits (HUD chips, character select, results).

/**
 * Draw a round portrait of a party entry centered at (x, y) with radius r.
 * who: a character id, or a player (shows its colour variant).
 * expr: neutral | happy | sad | surprised | determined (uses sprite-set
 * portraits when available, else crops the base art's face).
 */
const portraitVariants = new WeakMap();   // portrait img -> Map(variant -> canvas)
export function drawPortrait(g, who, x, y, r, { expr = 'neutral', bg = null, ring = null, ringWidth = 6, gray = false, variant = null } = {}) {
  const player = who && typeof who === 'object' ? who : null;
  const charId = player ? player.charId : who;
  const v = variant ?? player?.variant ?? 0;
  const ch = charById(charId);
  if (!ch) return;
  const m = ch.members[0];
  ensureSpriteSet(m.asset);
  g.save();
  g.beginPath(); g.arc(x, y, r, 0, TAU);
  g.fillStyle = bg || ch.color; g.fill();
  g.save();
  g.clip();
  const set = getSpriteSet(m.asset);
  let pimg = set && (set.portraits[expr] || set.portraits.neutral);
  const pal = variantPalette(ch.id, v);
  // Variant portraits: recoloured where the rules need no landmarks (others
  // would change eye colour), plus a swatch badge either way (drawn below).
  if (pimg && pal && PORTRAIT_SAFE.has(ch.id)) {
    let byV = portraitVariants.get(pimg);
    if (!byV) { byV = new Map(); portraitVariants.set(pimg, byV); }
    if (!byV.has(v)) {
      const rules = rulesFor(ch.id, m.asset, v).map((q) => ({ ...q, protect: [], below: null, above: null, mask: 0 }));
      let c = pimg;
      try { c = rules.length ? recolorFrame(pimg, null, rules, {}, null) : pimg; } catch (e) { /* unreadable */ }
      byV.set(v, c);
    }
    pimg = byV.get(v);
  }
  if (pimg) {
    const s = (2 * r) / Math.min(pimg.width, pimg.height);
    g.drawImage(pimg, x - (pimg.width * s) / 2, y - (pimg.height * s) / 2, pimg.width * s, pimg.height * s);
  } else {
    const img = baseImages.get(m.asset);
    if (img) {
      const [fx, fy, fr] = m.face;
      const s = r / (fr * img.height) * 0.95;
      let dy = 0, rot = 0;
      if (expr === 'happy') dy = -r * 0.06;
      if (expr === 'sad') { dy = r * 0.08; rot = -0.12; }
      g.translate(x, y + dy); g.rotate(rot);
      g.drawImage(img, -fx * img.height * s, -fy * img.height * s, img.width * s, img.height * s);
      if (expr === 'sad') { g.globalAlpha = 0.2; g.drawImage(tinted(img, '#3a5bd0'), -fx * img.height * s, -fy * img.height * s, img.width * s, img.height * s); }
    }
  }
  if (gray) { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#888'; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.restore();
  if (ring) { g.lineWidth = ringWidth; g.strokeStyle = ring; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
  g.lineWidth = 3; g.strokeStyle = '#24163f'; g.beginPath(); g.arc(x, y, r + (ring ? ringWidth / 2 : 0), 0, TAU); g.stroke();
  if (pal && r >= 14) {
    const br = Math.max(6, r * 0.3), bx = x + r * 0.72, by = y + r * 0.72;
    g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fillStyle = pal.swatch; g.fill();
    g.lineWidth = Math.max(2, br * 0.3); g.strokeStyle = '#24163f'; g.stroke();
  }
  g.restore();
}
