import test from 'node:test';
import assert from 'node:assert/strict';
import { DINO, dinoHeadTop, fitDinoHead } from '../src/games/dino-dig/art.js';

test('crowned high hops stay within the viewport without moving the resting platform', () => {
  assert.equal(DINO.k, 0.8);
  assert.equal(DINO.y, 462);
  // The sneeze camera punch raises the world-space top edge to about 75 px.
  for (const minY of [12, 75]) for (const head of ['duck', 'skull']) for (let i = 0; i < 240; i++) {
    const beat = i * Math.PI / 30, k = 2.54;
    const pose = {
      bob: Math.abs(Math.sin(beat)) * 18 * k, hop: 120,
      sway: Math.sin(beat / 2) * 0.06 * k,
      neck: Math.sin(beat / 2 + 1) * 0.16 * k,
      head: Math.sin(beat + 0.5) * 0.12 * k,
      legs: [0.5, -0.5, -0.55, 0.55], tail: 0.6, lean: 0,
    };
    const fitted = fitDinoHead(pose, head, true, minY);
    assert.ok(dinoHeadTop(fitted, head, true) >= minY - 1e-8);
    assert.equal(fitted.tail, pose.tail);
    assert.deepEqual(fitted.legs, pose.legs);
  }
});

test('safe resting poses keep their original motion and anchors', () => {
  const pose = { bob: 0, hop: 0, neck: 0, head: 0, sway: 0, lean: 0, tail: 0.2, legs: [0, 0, 0, 0] };
  assert.equal(fitDinoHead(pose, 'duck', true, 12), pose);
});
