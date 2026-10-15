import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const freshArt = (suffix) => import(new URL(`../../src/engine/art.js?groups-test=${suffix}`, import.meta.url));
const flush = () => new Promise((resolve) => setImmediate(resolve));

// Exercise the real loader, including concurrent groups and aliases across owners.
const entries = { 'legacy/common': 'common.webp', 'thumb/a': 'thumb-a.webp', 'thumb/b': 'thumb-b.webp',
  'bg/a-alias': 'common.webp', 'prop/shared': 'shared.webp', 'prop/a-missing': 'missing.webp' };
for (let i = 0; i < 8; i++) { entries[`prop/a-${i}`] = `a${i}.webp`; entries[`prop/b-${i}`] = `b${i}.webp`; }
const groupA = ['thumb/a', 'bg/a-alias', 'prop/shared', 'prop/a-missing', ...Array.from({ length: 8 }, (_, i) => `prop/a-${i}`)];
const groupB = ['thumb/b', 'prop/shared', ...Array.from({ length: 8 }, (_, i) => `prop/b-${i}`)];
globalThis.fetch = async () => ({ ok: true, json: async () => ({ images: entries, groups: { a: groupA, b: groupB } }) });
const attempts = new Map();
let active = 0, peak = 0;
globalThis.Image = class {
  set src(path) {
    const file = path.split('?')[0];
    attempts.set(file, (attempts.get(file) || 0) + 1);
    peak = Math.max(peak, ++active);
    setTimeout(() => { active--; file.endsWith('/missing.webp') ? this.onerror() : this.onload(); }, 1);
  }
};
const warnings = [], originalWarn = console.warn;
console.warn = (...args) => warnings.push(args);
try {
  const art = await freshArt('loader');
  await art.loadArt();
  assert.ok(art.hasArtGroup('a'));
  assert.ok(art.art('thumb/a') && art.art('legacy/common'));
  assert.equal(art.art('prop/a-0'), null, 'Boot excludes grouped props');
  assert.equal(art.art('bg/a-alias'), null, 'Boot does not register grouped aliases');
  assert.equal(attempts.has('assets/art/a0.webp'), false, 'Boot makes no grouped image request');
  await Promise.all([art.ensureGameArt('a'), art.ensureGameArt('b')]);
  assert.ok(peak <= 6, `Concurrent groups exceeded six requests: ${peak}`);
  assert.equal(attempts.get('assets/art/shared.webp'), 1, 'Concurrent groups share a file request');
  assert.equal(art.art('bg/a-alias'), art.art('legacy/common'), 'Group reuses the common decoded alias');
  assert.equal(attempts.get('assets/art/common.webp'), 1);
  assert.equal(art.art('prop/a-missing'), null, 'Failed image keeps its procedural fallback');
  assert.equal(attempts.get('assets/art/missing.webp'), 2, 'Failed image gets one retry');
  art.releaseGameArt('a');
  assert.equal(art.art('prop/a-0'), null);
  assert.ok(art.art('prop/shared'), 'Other active group retains its shared key');
  assert.ok(art.art('thumb/a') && art.art('legacy/common'), 'Release retains boot art');
  art.releaseGameArt('b');
  assert.equal(art.art('prop/shared'), null);
  assert.equal(art.art('prop/b-0'), null);
  await art.ensureGameArt('a');
  assert.equal(attempts.get('assets/art/a0.webp'), 2, 'Released files decode again on reload');
  assert.equal(attempts.get('assets/art/common.webp'), 1, 'Common alias stays decoded');
  art.releaseGameArt('a');
  await art.loadArt({ only: (key) => key === 'prop/b-3' });
  assert.ok(art.art('prop/b-3'), 'Explicit workbench predicate includes grouped art');
  assert.equal(art.art('prop/b-0'), null, 'Explicit predicate loads only matching keys');
  await art.ensureGameArt('b');
  art.releaseGameArt('b');
  assert.ok(art.art('prop/b-3'), 'Explicitly loaded tool art remains owned by that caller');
  assert.equal(art.art('prop/b-0'), null);
  assert.equal(warnings.length, 2, 'Warn only after both attempts fail on each group load');

  // Load the real PlayScene with small dependency stubs, and use the real art
  // loader with manually completed images to expose lifecycle races.
  const sceneEntries = { 'thumb/studio': 'studio-thumb.webp', 'bg/studio': 'studio.webp',
    'bg/studio-b': 'studio-b.webp', 'bg/bad': 'bad.webp' };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ images: sceneEntries,
    groups: { studio: ['thumb/studio', 'bg/studio'], 'studio-b': ['bg/studio-b'], bad: ['bg/bad'] } }) });
  let manual = false;
  const pending = [];
  globalThis.Image = class {
    set src(path) {
      this.path = path;
      if (manual) pending.push(this);
      else queueMicrotask(() => this.onload());
    }
  };
  const sceneArt = await freshArt('scene');
  await sceneArt.loadArt();
  manual = true;
  const constructed = [], destroyed = [], text = [], music = [];
  const meta = (id) => ({ id, title: id, category: 'studio', countdown: id === 'legacy', module: { Game: class {
    constructor(api) { constructed.push({ id: api.meta.id, image: sceneArt.art(`bg/${api.meta.id}`), time: api.time }); }
    update() {}
    preUpdate() {}
    draw() {}
    destroy() { destroyed.push(id); }
  } } });
  const noop = () => {};
  globalThis.__playArtTest = { art: sceneArt, session: { players: [], cpuLevel: 1 },
    input: { humans: () => [], anyHumanPressed: () => false, pointer: {} }, corner: {}, gameById: meta,
    music: { play: (...args) => music.push(args), menu: noop },
    text: (...args) => text.push(args), noop };
  const dataModule = (code) => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  const stubs = {
    '../engine/util.js': 'export const cancelLater = globalThis.__playArtTest.noop;',
    '../engine/canvas.js': 'export const W=1920,H=1080;',
    '../engine/input.js': 'export const input=globalThis.__playArtTest.input;',
    '../engine/audio.js': 'const t=globalThis.__playArtTest; export const music=t.music; export const sfx=t.noop,host=t.noop,stopAllLoops=t.noop,duckLoops=t.noop,setMuted=t.noop; export const isMuted=()=>false;',
    '../engine/particles.js': 'export const particles={clear(){},draw(){}};',
    '../engine/fx.js': 'export const fx={flash(){}};',
    '../engine/ui.js': 'const t=globalThis.__playArtTest; export const sky=t.noop,text=t.text,countdown=t.noop;',
    '../state.js': 'export const session=globalThis.__playArtTest.session; export const sitOut=()=>{}; export const mollyEasy=()=>false;',
    '../games/index.js': 'export const gameById=globalThis.__playArtTest.gameById;',
    '../engine/camera.js': 'export class Camera {flyIn(){} update(){} tickPunch(){}}',
    '../engine/corner.js': 'export const corner=globalThis.__playArtTest.corner;',
    '../engine/art.js': 'const a=globalThis.__playArtTest.art; export const hasArtGroup=a.hasArtGroup,ensureGameArt=a.ensureGameArt,releaseGameArt=a.releaseGameArt;',
  };
  const source = await readFile(new URL('../../src/scenes/play.js', import.meta.url), 'utf8');
  const isolated = source.replace(/from '([^']+)'/g, (match, path) => {
    assert.ok(stubs[path], `Missing test dependency ${path}`);
    return `from '${dataModule(stubs[path])}'`;
  });
  const { PlayScene } = await import(dataModule(isolated));
  const scene = new PlayScene();
  const complete = async (file, fail = false) => {
    const i = pending.findIndex((img) => img.path.split('?')[0].endsWith('/' + file));
    assert.ok(i >= 0, `No pending image ${file}`);
    const [img] = pending.splice(i, 1);
    fail ? img.onerror() : img.onload();
    await flush();
  };
  scene.enter({ gameId: 'studio' });
  assert.equal(scene.state, 'loading');
  scene.update(5, true);
  scene.draw({});
  assert.equal(scene.t, 0, 'Loading does not advance countdown');
  assert.equal(scene.playTime, 0, 'Loading does not advance game time');
  assert.equal(constructed.length, 0);
  assert.equal(music.length, 0, 'Game music waits for its constructor');
  assert.ok(text.some((args) => args[1] === 'Loading…'));
  await flush();
  await complete('studio.webp');
  assert.equal(constructed.length, 1);
  assert.ok(constructed[0].image, 'Art is ready when constructor bakes its canvas');
  assert.equal(scene.state, 'play');
  scene.exit();
  assert.deepEqual(destroyed, ['studio']);
  assert.equal(sceneArt.art('bg/studio'), null);
  assert.ok(sceneArt.art('thumb/studio'));

  scene.enter({ gameId: 'studio' });
  scene.exit();
  await flush();
  assert.equal(constructed.length, 1, 'Exit before the first microtask cancels construction');
  assert.equal(pending.length, 0, 'Immediate exit prevents requests and abandoned ownership');

  scene.enter({ gameId: 'studio' });
  await flush();
  scene.exit();
  await complete('studio.webp');
  assert.equal(constructed.length, 1, 'Exit invalidates the waiting constructor');
  assert.equal(sceneArt.art('bg/studio'), null, 'Canceled request cannot restore released art');

  scene.enter({ gameId: 'studio' });
  await flush();
  scene.enter({ gameId: 'studio-b' });
  await flush();
  await complete('studio.webp');
  assert.equal(constructed.length, 1, 'Reused scene ignores the previous load');
  await complete('studio-b.webp');
  assert.equal(constructed.at(-1).id, 'studio-b');
  scene.exit();

  scene.enter({ gameId: 'studio' });
  await flush();
  scene.exit();
  scene.enter({ gameId: 'studio' });
  await flush();
  assert.equal(pending.filter((img) => img.path.endsWith('/studio.webp')).length, 1, 'Restart shares unfinished file request');
  await complete('studio.webp');
  assert.equal(constructed.length, 3, 'Same-game restart constructs only the newest entry');
  assert.ok(constructed.at(-1).image, 'Restart retains the new owner’s decoded image');
  scene.exit();

  scene.enter({ gameId: 'studio' });
  scene.enter({ gameId: 'studio-b' });
  await flush();
  assert.equal(pending.some((img) => img.path.endsWith('/studio.webp')), false, 'Immediate reuse cancels the old owner before requesting files');
  await complete('studio-b.webp');
  assert.equal(constructed.length, 4);
  assert.equal(constructed.at(-1).id, 'studio-b');
  scene.exit();

  scene.enter({ gameId: 'bad' });
  await flush();
  await complete('bad.webp', true);
  await complete('bad.webp', true);
  assert.equal(constructed.at(-1).id, 'bad');
  assert.equal(constructed.at(-1).image, null, 'Failed art still permits procedural game construction');
  assert.equal(scene.state, 'play');
  scene.exit();
  const beforeLegacy = constructed.length;
  scene.enter({ gameId: 'legacy' });
  assert.equal(constructed.length, beforeLegacy + 1, 'Legacy games retain synchronous construction');
  assert.equal(scene.state, 'countdown');
  scene.exit();

  const queueEntries = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`bg/canceled-${i}`, `canceled${i}.webp`]));
  queueEntries['bg/next'] = 'next.webp';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ images: queueEntries,
    groups: { canceled: Object.keys(queueEntries).filter((key) => key !== 'bg/next'), next: ['bg/next'] } }) });
  const queueArt = await freshArt('queue');
  await queueArt.loadArt();
  const canceled = queueArt.ensureGameArt('canceled');
  await flush();
  assert.equal(pending.length, 6);
  queueArt.releaseGameArt('canceled');
  const next = queueArt.ensureGameArt('next');
  await flush();
  await complete('canceled0.webp');
  assert.ok(pending.some((img) => img.path.endsWith('/next.webp')), 'Next game is not blocked by canceled queued requests');
  assert.equal(pending.some((img) => /canceled[6-9]\.webp$/.test(img.path)), false);
  for (let i = 1; i < 6; i++) await complete(`canceled${i}.webp`);
  await complete('next.webp');
  await Promise.all([canceled, next]);
  assert.equal(queueArt.art('bg/canceled-0'), null);
  assert.ok(queueArt.art('bg/next'));
  queueArt.releaseGameArt('next');
} finally {
  console.warn = originalWarn;
  delete globalThis.__playArtTest;
}
console.log('Grouped art boot/filter/alias/release/reload/fallback and PlayScene readiness/cancellation/reuse tests passed.');
