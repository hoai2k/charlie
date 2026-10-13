import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const available = new Set();
const source = fs.readFileSync(new URL('../../src/games/ladybug-spots.js', import.meta.url), 'utf8')
  .replace(/^import .*\n/gm, '').replace(/export (const|class) /g, '$1 ');
const calls = [];
const sandbox = {
  W: 1920, H: 1080, TAU: Math.PI * 2, Math,
  art: (key) => available.has(key) ? {} : null,
  drawArt: (_g, key) => { if (!available.has(key)) return false; calls.push(['image', key]); return true; },
  clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)),
};
vm.runInNewContext(source + '\nthis.Game = Game; this.drawCritter = drawCritter;', sandbox);
const scene = { t: 0.7, critterScale: () => 1 };
const position = (c, i) => sandbox.Game.prototype.slotPos.call(scene, c, i);
const base = { x: 960, y: 560, hop: 9, facing: 1, sq: 0, flap: 0, n: 5, face: 'happy' };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const fallback = position({ ...base, kind: 'ladybug' }, 0);
close(fallback.x, 960 - 16 - 0.55 * 96);
close(fallback.y, 560 - 0.42 * 74 - 9);

for (const kind of ['ladybug', 'bee', 'butterfly']) available.add('prop/' + kind);
const g = new Proxy({}, { get: (_o, key) => (...args) => calls.push([key, ...args]) });
for (const kind of ['ladybug', 'bee', 'butterfly']) {
  calls.length = 0;
  sandbox.drawCritter(g, { ...base, kind, want: 'pink', flap: 1 }, scene.t);
  assert.equal(calls.filter(([k]) => k === 'image').length, 1);
  assert.equal(calls.some(([k]) => k === 'ellipse' || k === 'fill'), false,
    'Generated creatures retain only their authored faces and wings');
}
// Source landmarks transform with facing and body squash, rather than drifting
// to the procedural body centre. The same points drive incoming/counting dots.
for (const kind of ['ladybug', 'bee']) for (const facing of [-1, 1]) for (const sq of [-0.6, 0, 0.8]) {
  const p = position({ ...base, kind, facing, sq, n: 1 }, 0);
  const [sx, sy] = kind === 'bee' ? [225, 177] : [170, 213];
  close(p.x, base.x + (sx - 256) * 300 / 512 * facing * (1 + sq * 0.25));
  close(p.y, base.y + (sy - 224) * 262 / 448 * (1 - sq * 0.25) - base.hop);
}
for (const flap of [0, 1]) {
  const c = { ...base, kind: 'butterfly', n: 2, flap };
  const left = position(c, 0), right = position(c, 1);
  const scale = flap ? 0.55 + Math.sin(scene.t * 22) * 0.45 : 0.92 + Math.sin(scene.t * 3) * 0.08;
  close(left.x, base.x + (140 - 320) * 360 / 640 * scale);
  close(right.x, base.x + (500 - 320) * 360 / 640 * scale);
  close(left.y, base.y + (140 - 224) * 252 / 448 - 20 - base.hop);
}
const rainbow = position({ ...base, kind: 'rainbow', n: 2 }, 0);
close(rainbow.x, base.x - 95);
close(rainbow.y, base.y - 52 - base.hop);
console.log('Ladybug generated-art overlays and fallback geometry passed');
