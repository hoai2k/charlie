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
globalThis.Image = class { constructor() { this.width = 256; this.height = 64; } set src(_) { queueMicrotask(() => this.onload()); } };
await loadArt();
bends.length = 0;
drawRod(g, 100, 100, 300, 100, 20, '#ff6fb1');
assert.equal(images.length, 1); // compact handle is drawn whole
assert.ok(bends.some(([x, y, tx, ty]) => x === 200 && y === 120 && tx === 300 && ty === 100));
const [image, x, y, width, height] = images[0];
assert.equal(images[0].length, 5); // no source slices omit cork pixels
assert.ok(Math.abs(width / image.width - height / image.height) < 1e-9);
assert.ok(Math.abs(x + width) < 1e-9); // shaft starts at the grip
console.log('Generated fishing handle and bending-shaft fallback checks passed.');
