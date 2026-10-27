import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import config from '../../assets/claudia-v2/config.js';
import { featureRect, registeredMouth, drawRegisteredFace, registeredFeatureEntries, EYE_CLOSED_THRESHOLD, RIGHT_EYE_CLOSED_THRESHOLD } from '../../effect/registered-face.js';
import { renderDollsEffect } from '../../effect/render.js';
import { createDemoPuppetState } from '../../src/core/puppet-state.js';
const spec = JSON.parse(fs.readFileSync(new URL('./claudia.json', import.meta.url)));

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
    assert.ok(Math.abs(width * pose.neckWidth / body.size[0] - spec.bodyHeightPerHead / 9) < 1e-9);
    assert.ok(pose.size[1] < pose.fullSourceHeight * .65, 'Export torso art, not the full doll');
  }
});

test('eye fitting uses pupil anchors and the heart origin stays inside the hand gap', () => {
  const report = JSON.parse(fs.readFileSync(new URL('./claudia-report.json', import.meta.url)));
  assert.deepEqual(config.layout.parts, report.headAnchors.eyes);
  assert.ok(config.layout.parts.rightEye.x < .635, 'Right pupil is left of its eye-patch centre');
  const heart = report.poses.find(pose => pose.pose === 6);
  const action = config.layout.bodyPoses.pose_6.poseAction;
  assert.ok(Math.abs(action.x * heart.size[0] - heart.actionAnchor[0]) < 1e-9);
  assert.ok(Math.abs(action.y * heart.size[1] - heart.actionAnchor[1]) < 1e-9);
  assert.ok(action.y > .24 && action.y < .32, 'Heart anchor must use the cropped torso coordinates');
  assert.deepEqual(config.interactions.kiss.origin, {x: .538, y: .657});
});

test('generated patches stay on the face and cover what they replace', () => {
  const report = JSON.parse(fs.readFileSync(new URL('./claudia-report.json', import.meta.url)));
  // Every mouth comes through the same face fit, so mouths cannot drift apart.
  for (const name of spec.expressions.filter(name => name !== spec.atlasReference)) {
    assert.ok(report.registration[name].face.inliers >= 8, name);
    assert.ok(report.registration[name].face.medianErrorPx <= 2, name);
  }
  for (const fit of ['mouthFit', 'leftEyeFit', 'rightEyeFit']) assert.ok(report[fit].medianErrorPx <= 2, fit);
  const chinY = spec.mouthSearchBox[3];
  for (const [name, feature] of Object.entries(config.sprites.features)) {
    if (name.startsWith('mouth_')) {
      // No full-width rectangles reaching the jaw line (the old box patches did).
      assert.ok(feature.box[2] - feature.box[0] < .3, name);
      assert.ok(feature.box[3] <= chinY + .02, name);
    }
  }
  // Closed lids must fully cover the open eye: each lid patch contains its eye box.
  for (const [side, box] of [['left', spec.eyeBoxes[0]], ['right', spec.eyeBoxes[1]]]) {
    const lid = config.sprites.features[`blink_${side}`].box;
    assert.ok(lid[0] <= box[0] && lid[1] <= box[1] + .01 && lid[2] >= box[2] && lid[3] >= box[3], side);
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
  assert.deepEqual(calls, ['master', 'mouth_smile', 'blink_left', 'brow_left', 'brow_right']);
});

test('closed lids are solid once the eye counts as closed, like the legacy dolls', () => {
  const images = Object.fromEntries(Object.keys(config.sprites.features).map(key => [`feature_${key}`, {key}]));
  images.reference = {key: 'master'};
  const lids = (left, right) => {
    const drawn = [];
    const ctx = {globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {},
      drawImage(image) { if (image.key?.startsWith('blink_')) drawn.push([image.key, this.globalAlpha]); }};
    drawRegisteredFace(ctx, {config, images}, {leftEyeClosed: left, rightEyeClosed: right}, {x: 0, y: 0, width: 300, height: 300}, 'mouth_closed', null);
    return drawn;
  };
  // Typical live scores for a closed eye are well below 1; the lid must still be opaque.
  assert.deepEqual(lids(EYE_CLOSED_THRESHOLD + .01, RIGHT_EYE_CLOSED_THRESHOLD + .01), [['blink_left', 1], ['blink_right', 1]]);
  assert.deepEqual(lids(EYE_CLOSED_THRESHOLD - .01, RIGHT_EYE_CLOSED_THRESHOLD - .01), []);
});

test('production rendering shares one head and keeps effects on lips/hands through tilt and AR fitting', async () => {
  const previousImage = globalThis.Image;
  const loads = [];
  const requestedUrls = [];
  globalThis.Image = class {
    set src(url) {
      this.url = new URL(url).pathname; loads.push(this.url); requestedUrls.push(url);
      const meta = Object.values(config.sprites.body).find(sprite => this.url.endsWith(sprite.file));
      const feature = Object.values(config.sprites.features).find(sprite => this.url.endsWith(sprite.file));
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
    assert.ok(requestedUrls.filter(url => url.includes('/claudia-v2/')).every(url => new URL(url).searchParams.get('v') === config.assetRevision));
    assert.ok(requestedUrls.filter(url => url.includes('/effects/')).every(url => !new URL(url).search));
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

    const bubble = renderDollsEffect({character: 'claudia', gameConfig: {enable_kiss_gesture: true, kiss_bubble_hold_ms: 0}});
    const heart = renderDollsEffect({character: 'claudia', gameConfig: {enable_hand_tracking: true, enable_kiss_gesture: false, hand_pose_action_hold_ms: 0}});
    await new Promise(setImmediate);
    let matrix = [1, 0, 0, 1, 0, 0];
    const stack = [], draws = [];
    const spy = {
      globalAlpha: 1,
      save() {stack.push({matrix: [...matrix], alpha: this.globalAlpha});},
      restore() {const saved = stack.pop(); matrix = saved.matrix; this.globalAlpha = saved.alpha;},
      translate(x, y) {matrix[4] += matrix[0]*x+matrix[2]*y; matrix[5] += matrix[1]*x+matrix[3]*y;},
      rotate(angle) {
        const [a, b, c, d] = matrix, co = Math.cos(angle), si = Math.sin(angle);
        matrix[0] = a*co+c*si; matrix[1] = b*co+d*si;
        matrix[2] = c*co-a*si; matrix[3] = d*co-b*si;
      },
      scale(x, y) {matrix[0]*=x; matrix[1]*=x; matrix[2]*=y; matrix[3]*=y;},
      drawImage(image, x, y, width, height) {draws.push({image, x, y, width, height, matrix: [...matrix]});}
    };
    const point = (draw, u, v) => {
      const x = draw.x+u*draw.width, y = draw.y+v*draw.height, m = draw.matrix;
      return {x: m[0]*x+m[2]*y+m[4], y: m[1]*x+m[3]*y+m[5]};
    };
    const close = (a, b) => assert.ok(Math.hypot(a.x-b.x, a.y-b.y) < 1e-7, JSON.stringify({a, b}));
    const tracked = structuredClone(state);
    for (const key of Object.keys(tracked.face.expressions)) tracked.face.expressions[key] = 0;
    tracked.face.tracked = true;
    tracked.face.eyes = {left: {x: .46, y: .3}, right: {x: .54, y: .3}, center: {x: .5, y: .3}, distance: .08};
    tracked.face.expressions.mouthPucker = .9;
    let now = 0;
    const viewports = [[1280, 720], [390, 844]].flatMap(([width, height]) =>
      ['dolls-game', 'dolls-ar'].map(stage => ({width, height, stage})));
    for (const {width, height, stage} of viewports) {
      for (const tilt of [0, .25, -.25]) {
        tracked.face.rotation = tilt; draws.length = 0;
        bubble.render(spy, tracked, {width, height, sourceWidth: width, sourceHeight: height, now: now+=100, stage, mode: 'demo', trackingMode: 'face'});
        const head = draws.find(draw => draw.image.url.endsWith('/claudia-v2/head.webp'));
        const bubbleDraw = draws.find(draw => draw.image.url.endsWith('/effects/kiss_bubble.webp'));
        assert.ok(head && bubbleDraw);
        const lips = point(head, .538, .657);
        close(point(bubbleDraw, .5, .5), {x: lips.x, y: lips.y-head.width*.04});
        if (stage === 'dolls-ar') {
          const left = point(head, config.layout.parts.leftEye.x, config.layout.parts.leftEye.y);
          const right = point(head, config.layout.parts.rightEye.x, config.layout.parts.rightEye.y);
          close({x: (left.x+right.x)/2, y: (left.y+right.y)/2}, {x: width*.5, y: height*.3});
          assert.ok(Math.abs(Math.hypot(left.x-right.x, left.y-right.y)-width*.08) < 1e-7);
        }
      }
    }
    tracked.face.expressions.mouthPucker = 0;
    tracked.hands = ['Left', 'Right'].map((label, i) => ({label, landmarks: [{x: i ? .56 : .44, y: .6, z: 0}]}));
    draws.length = 0;
    heart.render(spy, tracked, {width: 1280, height: 720, now: 100, stage: 'dolls-game', mode: 'demo', trackingMode: 'face-hands'});
    const body = draws.find(draw => draw.image.url.endsWith('/claudia-v2/pose_6.webp'));
    const emittedHeart = draws.find(draw => draw.image.url.endsWith('/effects/kiss_heart.webp'));
    assert.ok(body && emittedHeart);
    const report = JSON.parse(fs.readFileSync(new URL('./claudia-report.json', import.meta.url)));
    const pose = report.poses.find(pose => pose.pose === 6);
    close(point(body, pose.actionAnchor[0]/pose.size[0], pose.actionAnchor[1]/pose.size[1]), point(emittedHeart, .5, .5));
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
  }
});
