import assert from 'node:assert/strict';

globalThis.location = { search: '?quality=optimized' };
globalThis.Image = class {
  set src(url) {
    if (url.includes('sprites-opt/') && url.includes('jump.webp')) {
      queueMicrotask(() => this.onerror());
      return;
    }
    const size = url.includes('walk.webp') ? [75, 90]
      : url.includes('jump.webp') ? [200, 240] : [80, 96];
    [this.width, this.height] = size;
    queueMicrotask(() => this.onload());
  }
};
const manifest = {
  bodyHeight: 100, anchor: [50, 120], facing: 1,
  poses: {
    idle: { frames: ['idle.webp'] },
    walk: { frames: [{ src: 'walk.webp', anchor: [75, 180], hand: [100, 60], bodyHeight: 120 }] },
    jump: { frames: [{ src: 'jump.webp', anchor: [100, 240], bodyHeight: 200 }] },
  },
};
globalThis.fetch = async url => ({ ok: true, json: async () =>
  url.includes('sprites-opt/index.json') ? { sets: { felicity: {
    scale: .8, source: 'fixture', frameScales: { 'walk.webp': .5, 'jump.webp': .25 },
  } } } : url.endsWith('index.json') ? { sets: ['felicity'] } : manifest,
});
const { loadSprites, ensureSpriteSet, getSpriteSet, Actor } = await import('../../src/engine/sprites.js');
await loadSprites();
await ensureSpriteSet('felicity');
const set = getSpriteSet('felicity');
const idle = set.poses.idle.frames[0], walk = set.poses.walk.frames[0];
assert.equal(idle.k, .8); // Old optimizer indexes retain their global scale.
assert.deepEqual([idle.w, idle.h], [100, 120]);
assert.equal(walk.k, .5);
assert.deepEqual([walk.w, walk.h], [150, 180]);
assert.equal(walk.bodyHeight, 120);
const actor = new Actor('felicity');
actor.setPose('walk'); actor.snap();
const hand = actor.anchor('hand');
assert.ok(Math.abs(hand.x - actor.x - 25 * actor.height / 120) < 1e-8);
assert.ok(Math.abs(hand.y - actor.y + 120 * actor.height / 120) < 1e-8);
const jump = set.poses.jump.frames[0];
await jump.load();
assert.equal(jump.k, 1); // A missing optimized frame uses original coordinates.
assert.deepEqual([jump.w, jump.h], [200, 240]);
console.log('Per-file optimized scale, legacy fallback, landmarks and full-frame fallback passed.');
