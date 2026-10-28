import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../../src/games/gopher-garden.js', import.meta.url), 'utf8')
  .replace(/^import .*\n/gm, '').replace(/^export \{[^}]*\};?\n/gm, '')
  .replace(/export (const|class|function) /g, '$1 ');
const context = {
  W: 1920, H: 1080, TAU: Math.PI * 2, Math,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  depthScale: () => 1,
};
vm.runInNewContext(source + '\nthis.Game = Game;', context);
const { moleRise, moleLook, moleArtKey, Game } = context;
const has = () => true;
const mole = { kind: 'gopher', phase: 'up', t: 0.5, seed: 0, mood: 'up', blink: 1 };

test('mole emergence is monotone, holds a low peek and finishes at full height', () => {
  let previous = 0;
  for (let t = -0.1; t <= 1; t += 0.001) {
    const rise = moleRise(t);
    assert.ok(rise >= previous && rise <= 1);
    previous = rise;
  }
  assert.equal(moleRise(0), 0);
  assert.equal(moleRise(0.16), 0.52);
  assert.equal(moleRise(0.29), 0.52);
  assert.equal(moleRise(0.6), 1);
});

test('each scan holds and returns to neutral before the opposite glance', () => {
  for (const seed of [0, 4]) {
    const first = moleLook(0.5, seed), second = moleLook(1.4, seed);
    assert.notEqual(first, second);
    for (const t of [0.31, 0.5, 0.84]) assert.equal(moleLook(t, seed), first);
    for (const t of [0, 0.29, 0.86, 1.14, 1.76, 2.69]) assert.equal(moleLook(t, seed), 'neutral');
  }
});

test('bonked and tease expressions take precedence over scans and optional blink', () => {
  assert.equal(moleArtKey({ ...mole, phase: 'bonked', blink: -0.05 }, has), 'prop/gopher-bonked');
  assert.equal(moleArtKey({ ...mole, phase: 'sink', mood: 'bonked' }, has), 'prop/gopher-bonked');
  assert.equal(moleArtKey({ ...mole, phase: 'bonked', mood: 'bonked' }, () => false), 'prop/gopher-bonked');
  assert.equal(moleArtKey({ ...mole, phase: 'tease', blink: -0.05 }, has), 'prop/gopher-up-2');
  assert.equal(moleArtKey({ ...mole, blink: -0.05 }, has), 'prop/gopher-blink');
  assert.equal(moleArtKey(mole, (key) => key === 'prop/gopher-up'), 'prop/gopher-up');
  assert.equal(moleArtKey(mole, has), 'prop/gopher-peek-left');
});

test('rise keeps existing bop eligibility and bonked moles cannot score twice', () => {
  const hittable = (c) => Game.prototype.hittable(c);
  assert.equal(hittable({ ...mole, phase: 'rise', rise: 0.2 }), true);
  assert.equal(hittable({ ...mole, phase: 'rise', rise: 0.52 }), true);
  assert.equal(hittable({ ...mole, phase: 'bonked' }), false);
  assert.equal(hittable({ ...mole, phase: 'sink' }), false);
  for (const kind of ['fairy', 'troll']) assert.equal(hittable({ kind, phase: 'rise', rise: 0.2 }), true);
});

test('authored low peek uses visible content height while procedural travel is preserved', () => {
  const c = { ...mole, h: { x: 200, y: 500 }, sq: 0, wob: 0, rise: 0.52 };
  const scene = { opening: () => ({ cy: 100 }), t: 0 };
  const translations = [];
  const g = { save() {}, restore() {}, translate: (x, y) => translations.push([x, y]), rotate() {}, scale() {} };
  context.art = () => ({});
  context.drawArt = () => true;
  Game.prototype.drawGopherAt.call(scene, g, c);
  const authoredTop = translations[0][1] - 150 * 1.07 * 206 / 320;
  assert.ok(authoredTop < 100 - 35, 'the peeking head clears the hole by at least 35 pixels');
  context.art = () => null;
  context.drawArt = () => false;
  context.drawGopher = () => {};
  Game.prototype.drawGopherAt.call(scene, g, c);
  assert.equal(translations[1][1], 114 + 0.48 * 150 * 1.35);
});
