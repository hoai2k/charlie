import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import config from '../../assets/claudia-v2/config.js';
import { featureRect, registeredMouth, drawRegisteredFace, registeredFeatureEntries } from '../../effect/registered-face.js';
import { renderDollsEffect } from '../../effect/render.js';
import { createDemoPuppetState } from '../../src/core/puppet-state.js';

test('every expression shares the same fixed head image and geometry', () => {
  const heads = [...Object.values(config.sprites.faces), ...Object.values(config.sprites.talking)];
  for (const head of heads) assert.deepEqual(head, config.sprites.faces.reference);
  assert.equal(heads[0].file, 'assets/claudia-v2/head.webp');
  for (const group of Object.values(config.sprites)) {
    for (const sprite of Object.values(group)) assert.ok(fs.existsSync(new URL(`../../${sprite.file}`, import.meta.url)), sprite.file);
  }
});

test('all registered states pass the alignment quality gate', () => {
  const report = JSON.parse(fs.readFileSync(new URL('./claudia-report.json', import.meta.url)));
  assert.equal(Object.keys(report.registration).length, 8);
  for (const state of Object.values(report.registration)) {
    assert.ok(state.inliers >= 8);
    assert.ok(state.medianErrorPx <= 2);
  }
  assert.equal(report.poses.length, 6);
  for (const pose of report.poses) {
    assert.ok(pose.neckWidth >= 20 && pose.neckWidth <= 100);
    const body = config.sprites.body[`pose_${pose.pose}`];
    const layout = config.layout.bodyPoses[`pose_${pose.pose}`];
    const width = config.layout.body.heightPerHead * body.size[0] / body.size[1] * layout.scale;
    // At any head size, all six body's neck widths agree to numeric precision.
    assert.ok(Math.abs(width * pose.neckWidth / body.size[0] - 1.4 / 9) < 1e-9);
  }
});

test('patches follow head position and scale without per-expression offsets', () => {
  const rect = featureRect([.2, .4, .6, .5], {x: -100, y: -200, width: 500, height: 500});
  for (const [key, expected] of Object.entries({x: 0, y: 0, width: 200, height: 50})) {
    assert.ok(Math.abs(rect[key] - expected) < 1e-9);
  }
});

test('head states and mouth patches cannot overwrite one another during loading', () => {
  const entries = [...Object.entries(config.sprites.faces), ...registeredFeatureEntries(config)];
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
  const assets = Object.fromEntries(entries);
  assert.equal(assets.mouth_smile.file, 'assets/claudia-v2/head.webp');
  assert.equal(assets.feature_mouth_smile.file, 'assets/claudia-v2/mouth_smile.webp');
});

test('speech cannot cover intentional tongue, frown, or laughter', () => {
  for (const mouth of ['mouth_tongue', 'mouth_frown', 'expression_laugh']) {
    assert.equal(registeredMouth(config, mouth, 'talking_mouth_medium_open'), config.registeredFace.mouths[mouth]);
  }
  assert.equal(registeredMouth(config, 'mouth_closed', 'talking_mouth_pucker'), 'mouth_pucker');
  assert.equal(registeredMouth(config, 'mouth_closed', null), null);
});

test('blink, brow and mouth rendering never swaps the base head', () => {
  const calls = [];
  const images = Object.fromEntries(Object.keys(config.sprites.features).map(key => [`feature_${key}`, {key}]));
  images.reference = {key: 'master'};
  const ctx = {globalAlpha: 1, drawImage: image => calls.push(image.key), save() {}, restore() {}, translate() {}, rotate() {}};
  drawRegisteredFace(ctx, {config, images}, {leftEyeClosed: 1, rightEyeClosed: 0, browRaise: 1},
    {x: 0, y: 0, width: 300, height: 300}, 'mouth_smile', null);
  assert.deepEqual(calls, ['master', 'mouth_smile', 'blink_left', 'blink_right', 'brow_left', 'brow_right']);
});

test('production loader decodes the head once and expression changes preserve its drawn bounds', async () => {
  const previousImage = globalThis.Image;
  const loads = [];
  globalThis.Image = class {
    set src(url) {
      this.url = url; loads.push(url);
      const meta = Object.values(config.sprites.body).find(sprite => url.endsWith(sprite.file));
      const feature = Object.values(config.sprites.features).find(sprite => url.endsWith(sprite.file));
      this.naturalWidth = meta?.size[0] ?? (feature ? Math.round((feature.box[2]-feature.box[0])*640) : 640);
      this.naturalHeight = meta?.size[1] ?? (feature ? Math.round((feature.box[3]-feature.box[1])*640) : 640);
      queueMicrotask(() => this.onload());
    }
  };
  try {
    const effect = renderDollsEffect({character: 'claudia', gameConfig: {enable_kiss_gesture: false}});
    await new Promise(setImmediate);
    assert.equal(effect.getDebugState().ready, true);
    assert.equal(loads.filter(url => url.endsWith('/claudia-v2/head.webp')).length, 1);
    assert.equal(loads.filter(url => url.endsWith('/claudia-v2/mouth_smile.webp')).length, 1);
    const heads = [];
    const ctx = {globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {},
      drawImage(image, ...rect) { if (image.url.endsWith('/claudia-v2/head.webp')) heads.push(rect); }};
    const state = createDemoPuppetState(0);
    for (const key of Object.keys(state.face.expressions)) state.face.expressions[key] = 0;
    state.hands = [];
    const viewport = {width: 390, height: 844, now: 0, stage: 'dolls-game', mode: 'demo', trackingMode: 'face'};
    effect.render(ctx, state, viewport);
    state.face.expressions.smile = .8;
    effect.render(ctx, state, {...viewport, now: 100});
    assert.equal(effect.getDebugState().activeMouth, 'mouth_smile');
    assert.equal(heads.length, 2);
    assert.deepEqual(heads[0], heads[1]);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});
