// Focused regression tests for frame timing and the legacy Actor API.
import assert from 'node:assert/strict';
globalThis.location = { search: '' };
const { Actor, pickFrame, poseDuration, resolvePose, loadSprites, getSpriteSet } = await import('../../src/engine/sprites.js');
const frames = [{ id: 'a', dur: .1 }, { id: 'b', dur: .2 }, { id: 'c' }];
const pose = { frames, fps: 10, loop: true };
assert.equal(poseDuration(pose), .4);
assert.equal(pickFrame(pose, -.1).id, 'a');
assert.equal(pickFrame(pose, .11).id, 'b');
assert.equal(pickFrame(pose, .35).id, 'c');
assert.equal(pickFrame(pose, .41).id, 'a');
assert.equal(pickFrame({ ...pose, loop: false }, 50).id, 'c');
assert.equal(pickFrame({ ...pose, frames: [{ id: 0 }, { id: 1 }] }, .15).id, 1);
assert.equal(pickFrame({ ...pose, frames: [{ id: 0 }, { id: 1 }] }, .21).id, 0);
const idle = { ...pose }, walk = { ...pose };
assert.equal(resolvePose({ poses: { idle, walk } }, 'carry'), walk);
assert.equal(resolvePose({ poses: { idle } }, 'run'), idle); // cyclic walk/run fallback terminates

// Simulated image/network boundary; exercises the actual production loader.
globalThis.Image = class {
  constructor() { this.width = 100; this.height = 120; }
  set src(_) { queueMicrotask(() => this.onload()); }
};
const manifest = { bodyHeight: 100, anchor: [50, 120], facing: 1, poses: {
  run: { alias: 'jog', fps: 12 }, jog: 'walk',
  idle: { frames: ['idle.webp'], fps: 5 },
  walk: { frames: ['a.webp', 'b.webp'], fps: 4 },
  throw: { frames: [{ src: 'a.webp', dur: .1 }, { src: 'b.webp', dur: .3 }], loop: false, facing: -1 },
} };
globalThis.fetch = async (url) => ({ ok: true, json: async () => url.endsWith('index.json') ? { sets: ['felicity'] } : manifest });
await loadSprites();
const set = getSpriteSet('felicity');
assert.equal(set.poses.run.frames, set.poses.walk.frames);
assert.equal(set.poses.run.fps, 12);
assert.equal(set.poses.throw.facing, -1);
const actor = new Actor('felicity');
actor.setPose('walk').playOnce('throw');
assert.equal(actor._once.duration, .4);
actor.update(.1);
actor.setPose('run'); // changes return pose without interrupting an action
assert.equal(actor.currentPose, 'throw');
actor.update(.31);
assert.equal(actor.currentPose, 'run');
assert.ok(Math.abs(actor.poseTime - .01) < .00001);
actor.playOnce('throw', .2);
assert.equal(actor._once.duration, .2);
console.log('Sprite runtime timing, alias, fallback and one-shot regression tests passed.');
// Entire one-shot must fit an explicit gameplay duration, including final frame.
const drawn = [];
const g = new Proxy({}, { get: (target, prop) => prop in target ? target[prop] : (...args) => { if (prop === 'drawImage') drawn.push(args[0]); } });
actor.playOnce('throw', .2);
actor.update(.08); // source time=.16, already inside frame 2 (.1..4)
actor.draw(g, { shadow: false, emotes: false });
assert.equal(drawn[0], set.poses.throw.frames[1].img);
// Sprite landmarks respect per-pose facing and current frame timing.
set.poses.throw.frames[1].hand = [70, 60];
actor.snap();
assert.deepEqual(actor.anchor('hand'), { x: actor.x - 20 * 178 / 100, y: actor.y - 60 * 178 / 100 });
console.log('Draw timing and sprite landmark tests passed.');
