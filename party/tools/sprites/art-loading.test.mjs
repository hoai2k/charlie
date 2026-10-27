import assert from 'node:assert/strict';
import { loadArt, art } from '../../src/engine/art.js';

const entries = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`test/${i}`, `${i}.webp`]));
entries['test/alias'] = '0.webp';
entries['test/missing'] = 'missing.webp';
globalThis.fetch = async () => ({ ok: true, json: async () => ({ images: entries }) });
const attempts = new Map();
let active = 0, peak = 0;
globalThis.Image = class {
  set src(path) {
    path = path.split('?')[0];
    const n = (attempts.get(path) || 0) + 1;
    attempts.set(path, n);
    peak = Math.max(peak, ++active);
    setTimeout(() => {
      active--;
      if (path.endsWith('/missing.webp') || (path.endsWith('/1.webp') && n === 1)) this.onerror();
      else this.onload();
    }, 1);
  }
};
const warnings = [];
const originalWarn = console.warn;
try {
  console.warn = (...args) => warnings.push(args);
  await loadArt();
} finally {
  console.warn = originalWarn;
}
assert.ok(peak <= 6, `Unexpected concurrent requests: ${peak}`);
assert.equal(attempts.get('assets/art/0.webp'), 1, 'Aliases share one request');
assert.equal(art('test/0'), art('test/alias'), 'Aliases share the decoded image');
assert.equal(attempts.get('assets/art/1.webp'), 2, 'Transient failure retried');
assert.ok(art('test/1'), 'Recovered image registered');
assert.equal(art('test/missing'), null, 'Missing art retains procedural fallback');
assert.equal(warnings.length, 1, 'Warn only after both attempts fail');
for (let i = 0; i < 15; i++) assert.ok(art(`test/${i}`), `Missing ${i}`);
console.log('Art loading concurrency, aliases, retry and fallback tests passed.');
