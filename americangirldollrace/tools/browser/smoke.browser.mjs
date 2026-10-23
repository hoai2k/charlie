// Browser smoke tests for the race: loads the real game in headless Chromium
// and checks what changes most often break. Needs Playwright with a Chromium:
//
//   node --test americangirldollrace/tools/browser/smoke.browser.mjs
//
// It serves the repo itself on a free port (no other server needed). Each
// check drives the game directly (startRace, update, applyPowerup...) rather
// than through the menus, so it's quick and doesn't depend on timing.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
function loadPlaywright() {
  for (const from of [import.meta.url, '/opt/node-tools/node_modules/']) {
    try { return createRequire(from)('playwright'); } catch (error) { /* try the next */ }
  }
  return null;
}
const playwright = loadPlaywright();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

let server, browser, page, base;
const errors = [];

before(async () => {
  if (!playwright) return;
  server = http.createServer(async (req, res) => {
    const file = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(repo)) { res.writeHead(403).end(); return; }
    try { res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(await readFile(file)); }
    catch (error) { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/americangirldollrace/`;
  browser = await playwright.chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(base);
  await page.waitForFunction(() => typeof startRace === 'function' && typeof BACKGROUNDS !== 'undefined', null, { timeout: 30000 });
  await page.waitForTimeout(1500);
});

after(async () => {
  await browser?.close();
  server?.close();
});

const skip = () => (playwright ? false : 'Playwright is not installed');
// Switch track and wait for its art (and its monster's sheet) to load.
const onTrack = key => page.evaluate(async key => {
  setBackground(key);
  for (let i = 0; i < 60; i++) {
    const theme = getTrackTheme();
    const monsterReady = !theme.monster || !window.MONSTERS?.[theme.monster] || images[theme.monster];
    if ((!theme.art?.length || getTrackArt(theme.art[0])) && monsterReady) break;
    await new Promise(r => setTimeout(r, 100));
  }
  startRace('two'); state.running = false; startPanel.classList.add('hidden');
  state.obstacles = []; state.powerups = []; state.monsters = []; state.cameraZoom = 1;
  const [a, b] = state.racers; a.x = 8100; a.y = PATH_TOP + 90; a.z = 0; a.facing = 1; b.x = 1000; b.ai = false;
}, key);

test('the page loads with no errors or missing files', { skip: skip() }, () => {
  assert.deepEqual(errors, []);
});

test('every track races for a few seconds with no errors', { skip: skip() }, async () => {
  const keys = await page.evaluate(() => BACKGROUNDS.map(b => b.key));
  assert.ok(keys.length >= 15);
  for (const key of keys) {
    const moved = await page.evaluate(async key => {
      setBackground(key); await new Promise(r => setTimeout(r, 300));
      startRace('two'); startPanel.classList.add('hidden'); state.racers[1].ai = true;
      const x0 = state.racers[0].x; keys.clear(); keys.add('KeyD');
      for (let i = 0; i < 240; i++) { if (i % 40 === 0) keys.add('Space'); if (i % 40 === 4) keys.delete('Space'); update(1 / 60); if (i % 4 === 0) drawScene(1 / 60); }
      keys.clear(); state.running = false;
      return state.racers[0].x - x0;
    }, key);
    assert.ok(moved > 500, `${key}: player only moved ${Math.round(moved)}px`);
  }
  assert.deepEqual(errors, []);
});

test("each track's monster walks in, grabs, lifts and throws a doll held in its hands", { skip: skip() }, async () => {
  for (const [track, monster] of [['farm', 'troll'], ['space', 'robot'], ['autumn', 'scarecrow'], ['wizard', 'skeleton'], ['toyroom', 'tintroll'], ['beach', 'sandtroll']]) {
    await onTrack(track);
    const r = await page.evaluate(() => {
      const a = state.racers[0];
      const m = spawnMonster(8400, a.y, { active: true, riding: false }); m.x = 8400; m.y = a.y; m.riding = false; m.state = 'walk'; state.monsters = [m];
      const seen = new Set(); let handGap = null;
      for (let i = 0; i < 400; i++) {
        state.camera = a.x - 500; update(1 / 60); seen.add(m.state);
        if (m.state === 'grab' && handGap === null) {
          const hand = monsterDef().grabHands[0]; const scale = monsterScale(m);
          handGap = Math.abs(a.x - (m.x + (hand[0] - SPRITE_ANCHOR_X) * scale * m.facing));
        }
        if (seen.has('throw') && !a.grabbedBy && a.z === 0) break;
      }
      return { key: getTrackMonsterKey() || 'troll', states: [...seen], handGap, landed: !a.grabbedBy && a.z === 0 };
    });
    assert.equal(r.key, monster, `${track} uses ${monster}`);
    for (const s of ['grab', 'lift', 'throw']) assert.ok(r.states.includes(s), `${monster}: ${s}`);
    assert.ok(r.handGap !== null && r.handGap < 2, `${monster}: doll held at its hand`);
    assert.ok(r.landed, `${monster}: thrown doll lands`);
  }
});

test('every pickup kind applies, with its name', { skip: skip() }, async () => {
  for (const track of ['farm', 'town', 'beach', 'space', 'wizard', 'toyroom']) {
    await onTrack(track);
    const names = await page.evaluate(() => ['jump', 'boost', 'emp', 'oil', 'snowball', 'horse'].map(type => {
      const r = state.racers[0];
      Object.assign(r, { highJumpStacks: [], highJumpTimer: 0, rideToys: [], moonBootsTimer: 0, speedBoostStacks: [], speedBoostTimer: 0, oilTimer: 0, empTimer: 0, horseTimer: 0, spellAim: null, surfTimer: 0 });
      r.powerupMessage = '';
      const taken = applyPowerup(r, makePowerup(type, r.x, r.y + 54));
      return taken && r.powerupMessage ? r.powerupMessage : `${type} not applied`;
    }));
    for (const name of names) assert.ok(!/not applied/.test(name), `${track}: ${name}`);
  }
});

test('an EMP reaches a screen width, and backfires with nobody in range', { skip: skip() }, async () => {
  await onTrack('farm');
  const r = await page.evaluate(() => {
    const run = dx => {
      startRace('two'); state.running = false; state.obstacles = []; state.monsters = [];
      const [a, b] = state.racers; a.x = 8100; a.y = PATH_TOP + 90; b.x = 8100 + dx; b.y = PATH_TOP + 110;
      state.powerups = [makePowerup('emp', 8100, a.y + 54)]; update(1 / 60);
      return { self: a.frozenTimer > 0, other: b.frozenTimer > 0 };
    };
    return { near: run(1100), far: run(1500) };
  });
  assert.deepEqual(r.near, { self: false, other: true });
  assert.deepEqual(r.far, { self: true, other: false });
});

test('trolls pull riders off horses but a running unicorn bowls them over', { skip: skip() }, async () => {
  await onTrack('farm');
  const r = await page.evaluate(() => {
    const run = (mount, running) => {
      startRace('two'); state.running = false; state.obstacles = []; state.powerups = [];
      const [a, b] = state.racers; b.x = 1000; a.x = 8100; a.y = PATH_TOP + 90; a.z = 0; a.facing = 1; a.horseType = mount; a.horseTimer = 12;
      const m = spawnMonster(8300, a.y, { active: true, riding: false }); m.x = 8300; m.y = a.y; m.riding = false; m.state = 'walk'; state.monsters = [m];
      keys.clear(); if (running) keys.add('KeyD');
      let grabbed = false, knocked = false;
      for (let i = 0; i < 60; i++) { update(1 / 60); grabbed ||= Boolean(a.grabbedBy); knocked ||= m.state === 'fall'; }
      keys.clear();
      return { grabbed, knocked, left: state.powerups.filter(q => q.loose).map(q => q.horseType).join() };
    };
    return { horse: run('horse', true), unicornRunning: run('unicorn', true), unicornStanding: run('unicorn', false) };
  });
  assert.deepEqual(r.horse, { grabbed: true, knocked: false, left: 'horse' });
  assert.equal(r.unicornRunning.knocked, true);
  assert.equal(r.unicornRunning.grabbed, false);
  assert.deepEqual(r.unicornStanding, { grabbed: true, knocked: false, left: 'unicorn' });
});

test('the spell book casts the way the player aims', { skip: skip() }, async () => {
  await onTrack('wizard');
  const r = await page.evaluate(() => {
    const cast = key => {
      startRace('two'); state.running = false; state.obstacles = []; state.powerups = []; state.monsters = [];
      const [a, b] = state.racers; a.x = 8150; a.y = PATH_TOP + 90; b.x = 8000; b.y = PATH_TOP + 110; b.ai = false;
      const m = spawnMonster(8500, a.y, { active: true }); m.x = 8500; m.y = a.y; m.state = 'walk'; state.monsters = [m];
      keys.clear(); if (key) keys.add(key);
      applyPowerup(a, 'jump');
      for (let i = 0; i < 120 && !state.spells.length; i++) { m.x = 8500 + (a.x - 8150); update(1 / 60); }
      keys.clear();
      const t = state.spells[0]?.target; return t === b ? 'racer behind' : t === m ? 'monster ahead' : String(t);
    };
    return { right: cast('KeyD'), left: cast('KeyA'), none: cast(null) };
  });
  assert.deepEqual(r, { right: 'monster ahead', left: 'racer behind', none: 'racer behind' });
});

test('wind-up cars drive toward the closest character, else forward; no EMPs on the Toy Room', { skip: skip() }, async () => {
  await onTrack('toyroom');
  const r = await page.evaluate(() => {
    let emps = 0; for (let i = 0; i < 5; i++) { startRace('two'); emps += state.powerups.filter(q => q.type === 'emp').length; }
    const run = bx => { startRace('two'); state.running = false; state.obstacles = []; state.powerups = []; state.monsters = []; state.windupCars = [];
      const [a, b] = state.racers; a.x = 8100; a.y = PATH_TOP + 90; b.x = bx; applyPowerup(a, 'boost'); return state.windupCars[0]?.dir; };
    return { emps, alone: run(1000), behind: run(7700), ahead: run(8600) };
  });
  assert.deepEqual(r, { emps: 0, alone: 1, behind: -1, ahead: 1 });
});

test('a tagged Amanda follows her player and pushes a troll away', { skip: skip() }, async () => {
  await onTrack('town');
  const r = await page.evaluate(() => {
    const fence = { x: 8500, y: PATH_TOP + 60, hitW: HURDLE_HIT_W, hitH: HURDLE_HIT_H, amandaHazard: true, amandaState: 'sitting', amandaTimer: 0, amandaReveal: 0, amandaCooldown: 0, amandaFacing: -1, amandaTarget: null };
    state.obstacles = [fence]; state.amandaCaught = fence;
    const [a] = state.racers; a.x = 8400; a.y = PATH_TOP + 60 + 18 - 54;
    keys.clear(); keys.add('KeyD'); for (let i = 0; i < 20 && !state.amandaAlly; i++) update(1 / 60); keys.clear();
    const tagged = Boolean(state.amandaAlly);
    a.x = 9500; for (let i = 0; i < 240; i++) update(1 / 60);
    const gap = Math.abs(a.x - state.amandaAlly.x);
    const m = spawnMonster(a.x + 220, a.y, { active: true, riding: false }); m.x = a.x + 220; m.y = a.y; m.riding = false; m.state = 'walk'; state.monsters = [m];
    let pushed = false; for (let i = 0; i < 180; i++) { update(1 / 60); pushed ||= m.state === 'fall'; }
    return { tagged, following: gap < 140, pushed };
  });
  assert.deepEqual(r, { tagged: true, following: true, pushed: true });
});

test('a missed throw comes down: splash, melting snow, a pop in the air, or a roll', { skip: skip() }, async () => {
  for (const [track, leftover, lands] of [['town', '', true], ['winter', 'snow', true], ['fairy', '', false], ['farm', 'roll', true]]) {
    await onTrack(track);
    const r = await page.evaluate(() => {
      const a = state.racers[0]; a.snowballs = 1; launchSnowball(a);
      let lowest = Infinity, kinds = '';
      for (let i = 0; i < 90; i++) {
        update(1 / 60);
        const q = state.projectiles[0];
        if (q) lowest = Math.min(lowest, q.groundY - (q.drawY - q.z * 0.28 * (q.height ?? 1)));
        if (!kinds && state.thrownLeftovers.length) kinds = state.thrownLeftovers.map(t => t.kind).join();
      }
      return { lowest, kinds };
    });
    assert.equal(r.kinds, leftover, `${track}: what's left`);
    assert.equal(r.lowest < 40, lands, `${track}: comes down to the ground (${Math.round(r.lowest)}px)`);
  }
});

test('no EMPs on Beach or Wizard School, no horses on the Beach, and surfing knocks trolls down', { skip: skip() }, async () => {
  await onTrack('beach');
  const r = await page.evaluate(() => {
    let banned = 0; for (let i = 0; i < 5; i++) { startRace('two'); banned += state.powerups.filter(q => q.type === 'emp' || (q.type === 'horse' && !q.loose)).length; }
    setBackground('wizard'); for (let i = 0; i < 5; i++) { startRace('two'); banned += state.powerups.filter(q => q.type === 'emp').length; }
    setBackground('beach');
    startRace('two'); state.running = false; state.obstacles = []; state.powerups = [];
    const [a, b] = state.racers; b.x = 1000; a.x = 8100; a.y = PATH_TOP + 90; a.z = 0;
    const m = spawnMonster(8400, a.y, { active: true, riding: false }); m.x = 8400; m.y = a.y; m.riding = false; m.state = 'walk'; state.monsters = [m];
    applyPowerup(a, 'boost');
    let knocked = false, grabbed = false; for (let i = 0; i < 60; i++) { update(1 / 60); knocked ||= m.state === 'fall'; grabbed ||= Boolean(a.grabbedBy); }
    return { banned, knocked, grabbed };
  });
  assert.deepEqual(r, { banned: 0, knocked: true, grabbed: false });
});

test('the pause screen shows its corner buttons', { skip: skip() }, async () => {
  await page.evaluate(() => { startRace('two'); state.running = true; togglePause(); });
  for (const id of ['#pauseSoundButton', '#pauseSettingsButton']) assert.ok(await page.isVisible(id), id);
  await page.evaluate(() => togglePause());
  assert.deepEqual(errors, []);
});
