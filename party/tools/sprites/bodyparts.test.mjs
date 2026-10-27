// Body map: things stuck on the nearest body part ride every frame and pose
// (src/engine/bodyparts.js, Actor.placeOnBody / bodySpot / anchor).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BODY_PARTS, nearestPart, partFrame, placeOnBody, bodySpot, moveOnBody } from '../../src/engine/bodyparts.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const frameA = { h: 100, parts: { head: { x: 10, y: -95 }, eyes: { x: 14, y: -80 }, neck: { x: 8, y: -65 }, belly: { x: 0, y: -40 }, tail: { x: -40, y: -50 }, earFront: { x: 20, y: -100 }, hand: { x: 30, y: -50 } } };

test('a placed spot sits exactly where it was put, on the nearest part', () => {
  const pt = { x: 23, y: -104 };
  assert.equal(nearestPart(frameA, pt).part, 'earFront');
  const spot = placeOnBody(frameA, pt, { rot: 0.3 });
  assert.equal(spot.part, 'earFront');
  assert.deepEqual(JSON.parse(JSON.stringify(spot)), spot);   // plain JSON (saved looks)
  const at = bodySpot(frameA, spot);
  assert.ok(near(at.x, 23) && near(at.y, -104) && near(at.rot, 0.3));
  // offsets are in body heights: the same spot on a twice-as-tall member scales with it
  const big = { h: 200, parts: Object.fromEntries(Object.entries(frameA.parts).map(([k, p]) => [k, { x: p.x * 2, y: p.y * 2 }])) };
  const b = bodySpot(big, spot);
  assert.ok(near(b.x, 46) && near(b.y, -208));
  assert.equal(placeOnBody(frameA, { x: -38, y: -48 }).part, 'tail');
  assert.equal(placeOnBody(frameA, { x: 0, y: 0 }, { parts: ['head'] }).part, 'head');
  assert.equal(placeOnBody({ h: 100, parts: {} }, { x: 0, y: 0 }), null);
});

test('the spot follows its part when it moves and turns (with a dead zone for wobble)', () => {
  const spot = placeOnBody(frameA, { x: -40, y: -60 });   // 10 px above the tail point
  assert.equal(spot.part, 'tail');
  // next frame: the tail swung up 90 degrees about the belly and moved
  const swung = { h: 100, parts: { ...frameA.parts, tail: { x: 0, y: -90 } } };
  const a0 = partFrame(frameA, 'tail').a, a1 = partFrame(swung, 'tail').a;
  const at = bodySpot(swung, spot), turn = a1 - a0 - Math.sign(a1 - a0) * 0.08;
  // the offset (0, -10) turned with the tail
  assert.ok(near(at.x, 0 + 10 * Math.sin(turn), 1e-6) && near(at.y, -90 - 10 * Math.cos(turn), 1e-6), JSON.stringify(at));
  assert.ok(near(at.rot, turn));
  // a tiny wobble of the axis doesn't turn it at all
  const wobble = { h: 100, parts: { ...frameA.parts, tail: { x: -40, y: -51.5 } } };
  assert.equal(bodySpot(wobble, spot).rot, 0);
});

test('a frame that hides the part uses the nearest fallback, measured when placed', () => {
  const spot = placeOnBody(frameA, { x: 22, y: -98 });
  assert.equal(spot.part, 'earFront');
  assert.ok(spot.alt.some((s) => s.part === 'head'));
  // ear turned away, the whole head moved 5 px right: the bow keeps its place on the head
  const moved = { h: 100, parts: Object.fromEntries(Object.entries(frameA.parts).filter(([k]) => k !== 'earFront').map(([k, p]) => [k, { x: p.x + 5, y: p.y }])) };
  const at = bodySpot(moved, spot);
  assert.equal(at.part, 'head');
  assert.ok(near(at.x, 27) && near(at.y, -98));
  // dragging re-places it on whatever part is nearest now
  assert.equal(moveOnBody(frameA, spot, { x: 1, y: -41 }).part, 'belly');
  assert.ok(BODY_PARTS.includes('footFront') && BODY_PARTS.includes('earBack'));
});

test('Actor: spots ride frames, poses and facing; anchor() knows every part', async () => {
  globalThis.location = { search: '' };
  globalThis.Image = class { constructor() { this.width = 100; this.height = 120; } set src(u) { queueMicrotask(() => this.onload()); } };
  const fr = (dx, extra = {}) => ({ src: `f${dx}.webp`, anchor: [50, 120], head: [50 + dx, 10], eyes: [55 + dx, 25], neck: [50 + dx, 40], back: [40, 50], hand: [70, 60], belly: [50, 70], tail: [10, 60], earFront: [60 + dx, 5], footFront: [60, 118], footBack: [40, 118], ...extra });
  const manifest = { bodyHeight: 120, anchor: [50, 120], facing: 1, poses: {
    idle: { frames: [fr(0)], fps: 5 },
    walk: { frames: [fr(20, { earFront: null })], fps: 4 },
  } };
  globalThis.fetch = async (url) => ({ ok: true, json: async () => (url.endsWith('index.json') ? { sets: ['fox'] } : manifest) });
  const { Actor, loadSprites, ensureSpriteSet } = await import('../../src/engine/sprites.js');
  await loadSprites();
  await ensureSpriteSet('fox');
  const a = new Actor('fox');
  a.x = 500; a.y = 800; a.snap();
  const h = a.members[0].def.h, k = h / 120;   // frame px -> screen px
  const ear = a.anchor('earFront');
  assert.ok(near(ear.x, 500 + 10 * k) && near(ear.y, 800 - 115 * k), JSON.stringify(ear));
  const belly = a.anchor('belly');
  assert.ok(near(belly.x, 500) && near(belly.y, 800 - 50 * k));
  // a bow just above the ear
  const spot = a.placeOnBody(ear.x, ear.y - 4);
  assert.equal(spot.part, 'earFront');
  let w = a.bodySpot(spot);
  assert.ok(near(w.x, ear.x, 1e-6) && near(w.y, ear.y - 4, 1e-6));
  // walking frame: the head moved 20 px forward and the ear is hidden -> follows the head
  a.setPose('walk');
  w = a.bodySpot(spot);
  assert.equal(w.part, 'head');
  assert.ok(near(w.x, ear.x + 20 * k, 1e-6), `${w.x} vs ${ear.x + 20 * k}`);
  // facing left mirrors it about the feet
  a.facing = -1; a.snap();
  const m = a.bodySpot(spot);
  assert.ok(near(m.x, 500 - (w.x - 500), 1e-6) && near(m.y, w.y, 1e-6));
  // jumping lifts it with the body
  a.z = 30;
  assert.ok(near(a.bodySpot(spot).y, w.y - 30, 1e-6));
  // the attachment info a draw callback gets carries the parts too
  const info = a.bodyInfo();
  for (const p of ['head', 'belly', 'tail', 'footFront', 'footBack']) assert.ok(info.parts[p], p);
  assert.equal(info.parts.earFront, undefined);
});

test('every indexed sprite frame has a body map that lies on the art', () => {
  const root = new URL('../../assets/sprites/', import.meta.url);
  const sets = JSON.parse(readFileSync(new URL('index.json', root))).sets;
  let frames = 0;
  for (const s of sets) {
    const m = JSON.parse(readFileSync(new URL(`${s}/sprites.json`, root)));
    assert.ok(m.bodyMap, `${s}: no body map (run python3 party/tools/sprites/bodymap.py)`);
    for (const def of Object.values(m.poses)) {
      if (typeof def === 'string' || def.alias) continue;
      for (const f of def.frames) {
        frames++;
        assert.ok(Array.isArray(f.belly), `${s} ${f.src}: no belly`);
        for (const p of ['belly', 'tail', 'earFront', 'earBack', 'footFront', 'footBack']) {
          if (f[p] === undefined) continue;
          assert.ok(Array.isArray(f[p]) && f[p].length === 2 && f[p].every(Number.isInteger), `${s} ${f.src} ${p}`);
        }
      }
    }
  }
  assert.ok(frames > 2000, `${frames} frames`);
});
