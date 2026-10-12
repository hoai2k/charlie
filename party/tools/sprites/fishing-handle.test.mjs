import assert from 'node:assert/strict';
globalThis.location = { search: '' };
const { drawRod } = await import('../../src/games/fishing-frenzy/art.js');
const { loadArt } = await import('../../src/engine/art.js');
const images = [], bends = [];
const g = new Proxy({}, { get: (_, key) => key === 'drawImage'
  ? (...args) => images.push(args)
  : key === 'quadraticCurveTo' ? (...args) => bends.push(args) : () => {} });
drawRod(g, 100, 100, 300, 100, 20, '#ff6fb1');
assert.equal(images.length, 0); // procedural fallback remains usable
globalThis.fetch = async () => ({ ok: true, json: async () => ({ images: { 'prop/fishing-rod': 'handle.webp' } }) });
globalThis.Image = class { set src(_) { queueMicrotask(() => this.onload()); } };
await loadArt();
bends.length = 0;
drawRod(g, 100, 100, 300, 100, 20, '#ff6fb1');
assert.equal(images.length, 2); // butt-cap slice + cork-front-and-reel slice
assert.ok(bends.some(([x, y, tx, ty]) => x === 200 && y === 120 && tx === 300 && ty === 100));
for (const [, , , sw, sh, , , dw, dh] of images) assert.ok(Math.abs(dw / sw - dh / sh) < 1e-9); // undistorted
const front = images[1];
assert.ok(Math.abs(front[5] + front[7]) < 1e-9); // reel end at the grip; the shaft bends on from there
console.log('Generated fishing handle and bending-shaft fallback checks passed.');
