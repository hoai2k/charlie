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
    try {
      const body = await readFile(file);
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      // Byte ranges, as GitHub Pages serves them, so songs can be seeked.
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (range) {
        const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
        res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${body.length}`, 'content-length': end - start + 1 }).end(body.subarray(start, end + 1));
      } else res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes' }).end(body);
    }
    catch (error) { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/americangirldollrace/`;
  browser = await playwright.chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) errors.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => { window.RACE_TEST_SILENT = true; });
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
// (On Cloud Kingdom the floor's gaps are taken out unless the test wants
// them, so nobody set down for a test lands in one.)
const onTrack = (key, { gaps = false } = {}) => page.evaluate(async ([key, gaps]) => {
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
  if (state.cloudFloor && !gaps) state.cloudFloor.gaps = [];
}, [key, gaps]);

test('the page loads silently with no errors or missing files', { skip: skip() }, async () => {
  assert.deepEqual(errors, []);
  assert.ok(await page.evaluate(() => {const before=JSON.stringify(localStorage);GameAudio.setMuted(false);return GameAudio.isMuted && JSON.stringify(localStorage)===before;}));
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
  for (const [track, monster] of [['farm', 'troll'], ['space', 'robot'], ['autumn', 'scarecrow'], ['wizard', 'skeleton'], ['toyroom', 'tintroll'], ['beach', 'sandtroll'], ['candy', 'candytroll'], ['clouds', 'cloudtroll']]) {
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
      state.powerups = [makePowerup('emp', 8100, a.y + 54)];
      // The Farm's rooster waves take a moment to reach whoever they hit.
      let self = false, other = false;
      for (let i = 0; i < 120; i++) { update(1 / 60); self ||= a.frozenTimer > 0; other ||= b.frozenTimer > 0; }
      return { self, other };
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

test('Amanda runs off after five pushes, and fights a troll left with her', { skip: skip() }, async () => {
  await onTrack('town');
  const r = await page.evaluate(() => {
    const setup = () => {
      startRace('two'); state.running = false; state.obstacles = []; state.powerups = []; state.monsters = [];
      const fence = { x: 8500, y: PATH_TOP + 60, hitW: HURDLE_HIT_W, hitH: HURDLE_HIT_H, amandaHazard: true, amandaState: 'sitting', amandaTimer: 0, amandaReveal: 0, amandaCooldown: 0, amandaFacing: -1, amandaTarget: null };
      state.obstacles = [fence]; state.amandaCaught = fence;
      const [a, b] = state.racers; a.x = 8400; a.y = PATH_TOP + 60 + 18 - 54; b.x = 1000; b.ai = false;
      keys.clear(); keys.add('KeyD'); for (let i = 0; i < 20 && !state.amandaAlly; i++) update(1 / 60); keys.clear();
      state.obstacles = []; return [a, b, state.amandaAlly];
    };
    let [a, b, ally] = setup();
    for (let n = 0; n < 5; n++) { b.x = ally.x - 50; b.y = ally.y; b.facing = 1; b.pushedTargets.clear(); performPushAttack(b); for (let i = 0; i < 50; i++) update(1 / 60); }
    for (let i = 0; i < 1200 && state.amandaAlly; i++) update(1 / 60);
    const ranOff = !state.amandaAlly;
    [a, b, ally] = setup();
    a.x = 13000; ally.x = 8600; ally.y = PATH_TOP + 90; ally.z = 0;
    const m = spawnMonster(8900, ally.y, { active: true, riding: false }); m.x = 8900; m.y = ally.y; m.riding = false; m.state = 'walk'; state.monsters = [m];
    let grabbed = false, knocked = false;
    for (let i = 0; i < 60 * 12; i++) { a.x = 13000; update(1 / 60); grabbed ||= ally.grabbedBy === m; knocked ||= m.state === 'fall'; }
    return { ranOff, grabbed, knocked };
  });
  assert.deepEqual(r, { ranOff: true, grabbed: true, knocked: true });
});

test('a unicorn picks up power-ups but keeps her unicorn, and her rainbow leaves the horn', { skip: skip() }, async () => {
  await onTrack('farm');
  const r = await page.evaluate(() => {
    const a = state.racers[0]; a.horseType = 'unicorn'; a.horseTimer = 12;
    state.powerups = [makePowerup('boost', a.x, a.y + 54)]; update(1 / 60);
    const boosted = a.speedBoostTimer > 0;
    const swapped = applyPowerup(a, makePowerup('horse', a.x, a.y + 54));
    a.unicornBeamCooldown = 0; fireRainbowBeam(a);
    const beam = state.rainbowBeams.at(-1); const horn = unicornHornPoint(a);
    return { boosted, swapped, mount: a.horseType, gap: Math.hypot(beam.x1 - horn.x, beam.y - horn.y) };
  });
  assert.deepEqual(r, { boosted: true, swapped: false, mount: 'unicorn', gap: 0 });
});

test('pogo pickups show the red pogo stick on every track', { skip: skip() }, async () => {
  for (const track of ['town', 'candy', 'festival', 'farm']) {
    await onTrack(track);
    const same = await page.evaluate(async () => {
      for (let i = 0; i < 50 && !images[trackArtKey(POGO_ICON_TRACK, 'powerups')]; i++) await new Promise(r => setTimeout(r, 100));
      const sheet = pickupLook('jump', { pogo: true }).sheet;
      return Boolean(sheet) && sheet === images[trackArtKey(POGO_ICON_TRACK, 'powerups')];
    });
    assert.ok(same, `${track}: pogo icon`);
  }
});

test('the pause screen shows its corner buttons', { skip: skip() }, async () => {
  await page.evaluate(() => { startRace('two'); state.running = true; togglePause(); });
  for (const id of ['#pauseSoundButton', '#pauseSettingsButton']) assert.ok(await page.isVisible(id), id);
  await page.evaluate(() => togglePause());
  assert.deepEqual(errors, []);
});

test('storm troll casts one bolt after windup, hits in either direction, and fully dissipates', { skip: skip() }, async () => {
  await onTrack('clouds');
  const result = await page.evaluate(async () => {
    await Promise.all([loadArtOnce('cloudtroll_lightning','assets/cloudtroll_lightning.webp'),loadArtOnce('cloudtroll_bolt','assets/cloudtroll_bolt.webp')]);
    const hits=[];
    for (const facing of [-1,1]) {
      const a=state.racers[0];a.x=8400+facing*300;a.y=PATH_TOP+80;a.z=0;a.horseTimer=0;a.fallBackTimer=0;a.grabbedBy=null;
      const m=spawnMonster(8400,a.y,{active:true,riding:false});m.x=8400;m.state='lightning';m.facing=facing;m.lightningTime=0;m.lightningReleased=false;state.monsters=[m];state.monsterBolts=[];
      updateMonsterLightning(m,.44);if(state.monsterBolts.length)throw Error('released before windup');
      updateMonsterLightning(m,.02);const once=state.monsterBolts.length;updateMonsterLightning(m,.1);
      if(once!==1||state.monsterBolts.length!==1)throw Error('bolt release duplicated');
      drawMonster(m);for(let i=0;i<60;i++)updateMonsterBolts(1/60);hits.push(a.fallBackTimer>0);
      for(let n=0;n<5;n++){applyMonsterKnockback(m,1);updateMonsters(.56);}
      const ground=m.state;updateMonsters(1.1);if(ground!=='ground'||m.state!=='sleeping')throw Error('defeat state');
      const canvas=document.createElement('canvas');canvas.width=1254;canvas.height=1672;const c=canvas.getContext('2d');c.drawImage(images.cloudtroll,0,0);
      if(c.getImageData(836,1254,418,418).data.some((v,i)=>i%4===3&&v))throw Error('final cloud cell not empty');
      drawMonster(m);
    }
    return hits;
  });
  assert.deepEqual(result,[true,true]);
  assert.deepEqual(errors,[]);
});

test('Candy Troll goes down to a candy pile with no burst of sweets (they fly when the pile is run into)', { skip: skip() }, async () => {
  await onTrack('candy');
  const burst = await page.evaluate(async () => {
    await loadArtOnce('candy_particles','assets/candy_particles.webp');
    const a=state.racers[0],m=spawnMonster(8400,a.y,{active:true,riding:false});m.x=8400;state.monsters=[m];state.particles=[];
    for(let n=0;n<5;n++){applyMonsterKnockback(m,1);updateMonsters(.56);}
    drawParticles();
    return {ground:m.state,count:state.particles.filter(p=>p.kind==='candy'&&p.spriteIndex>=0&&p.spriteIndex<8).length};
  });
  assert.deepEqual(burst,{ground:'ground',count:0});
});

test('Moon Base gives a rover with nine calibrated rider frames in either direction', { skip: skip() }, async () => {
  await onTrack('space');
  const seats=await page.evaluate(async () => {
    await loadArtOnce('moon_buggy','assets/moon_buggy_sprites.webp');
    const a=state.racers[0],random=Math.random;
    let pickup;
    try {Math.random=()=>.99;pickup=makePowerup('horse',a.x,a.y+54);} finally {Math.random=random;}
    if(pickup.horseType!=='moon_buggy')throw Error('Moon Base base mount is not rover');
    applyPowerup(a,pickup);if(a.horseType!=='moon_buggy')throw Error('rover pickup failed');
    const result=[];
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const cal=getMountFrameCalibration('moon_buggy',row,col);result.push([cal.seatX,cal.seatY,cal.groundShift]);
      for(const facing of [-1,1]){a.facing=facing;a.moving=row===1;a.frame=col;a.jumpFrame=col;a.z=row===2?40:0;a.vy=[500,0,-500][col];drawRacer(a);}
    }
    return result;
  });
  const meta=JSON.parse(await readFile(path.join(repo,'americangirldollrace/tools/mounts/moon-buggy/calibration.json'),'utf8'));
  assert.deepEqual(seats,meta.frames.map(f=>[...f.seat,0]));
  assert.deepEqual(errors,[]);
});

test('in the menu settings, left/right change a setting and A closes it', { skip: skip() }, async () => {
  await page.evaluate(() => { state.running = false; startPanel.classList.remove('hidden'); Lobby.showSelect(); });
  const key = async code => { await page.keyboard.down(code); await page.keyboard.up(code); };
  const open = () => page.evaluate(() => !document.querySelector('#lbSettings').classList.contains('off'));
  await key('KeyR');
  assert.ok(await open(), 'Y opens settings');
  await key('KeyS');
  const before = await page.evaluate(() => state.difficulty);
  await key('KeyD');
  const after = await page.evaluate(() => state.difficulty);
  assert.notEqual(after, before, 'right changes the difficulty');
  await key('Space');
  assert.equal(await open(), false, 'A closes settings');
  assert.equal(await page.evaluate(() => state.difficulty), after, 'A leaves the setting alone');
  assert.deepEqual(errors, []);
});

test('a troll steps round a hurdle, stops when you get away and chases again when you come back', { skip: skip() }, async () => {
  await onTrack('farm');
  const r = await page.evaluate(() => {
    const a = state.racers[0];
    const o = { x: 8300, y: a.y + 36, w: 54, h: 58, hitW: 54, hitH: 32, kind: 'hurdle' }; state.obstacles = [o];
    const m = spawnMonster(8100, a.y, { active: true, riding: false }); m.riding = false; m.x = 8100; m.y = a.y; m.state = 'walk'; state.monsters = [m];
    a.x = 8700; let grabbed = false;
    for (let i = 0; i < 600 && !grabbed; i++) { a.x = 8700; a.z = 0; update(1 / 60); grabbed = Boolean(a.grabbedBy); }
    startRace('two'); state.running = false; state.obstacles = []; state.powerups = [];
    const b = state.racers[0]; b.x = 8100 + MONSTER_SIGHT_RANGE + 400; state.racers[1].x = b.x + 50; b.y = PATH_TOP + 90;
    const t = spawnMonster(8100, b.y, { active: true, riding: false }); t.riding = false; t.x = 8100; t.y = b.y; t.state = 'walk'; state.monsters = [t];
    for (let i = 0; i < 60; i++) update(1 / 60);
    const paused = { state: t.state, moved: Math.abs(t.x - 8100) };
    b.x = 8100 + 600; state.racers[1].x = b.x + 50;
    for (let i = 0; i < 30; i++) update(1 / 60);
    return { grabbed, paused, resumed: { state: t.state, moved: t.x - 8100 } };
  });
  assert.equal(r.grabbed, true, 'gets round the hurdle to the doll');
  assert.deepEqual(r.paused, { state: 'idle', moved: 0 });
  assert.equal(r.resumed.state, 'walk');
  assert.ok(r.resumed.moved > 20, `chases again (${r.resumed.moved})`);
});

test('a throw on the run carries her speed and goes further (not bubbles)', { skip: skip() }, async () => {
  const distances = {};
  for (const track of ['farm', 'fairy']) {
    await onTrack(track);
    distances[track] = await page.evaluate(() => ['standing', 'running'].map(how => {
      startRace('two'); state.running = false; state.obstacles = []; state.powerups = []; state.monsters = [];
      const [a, b] = state.racers; a.x = 8100; a.y = PATH_TOP + 90; a.facing = 1; b.x = 1000;
      a.speed = how === 'running' ? PLAYER_RUN_SPEED : 0; a.snowballs = 1; launchSnowball(a);
      const q = state.projectiles[0]; const startX = q.x;
      while (state.projectiles.includes(q)) { q.x += q.vx / 60; q.distance += Math.abs(q.vx) / 60; if (q.distance >= q.range) break; }
      return { reach: Math.round(q.x - startX), vx: q.vx };
    }));
  }
  const [stand, run] = distances.farm;
  assert.ok(run.reach > stand.reach * 1.2, `farm: running throw goes further (${stand.reach} -> ${run.reach})`);
  assert.equal(distances.fairy[0].vx, distances.fairy[1].vx, 'bubbles keep their own speed');
});

test('Amanda runs after her player a moment behind and stands beside her when she stops', { skip: skip() }, async () => {
  await onTrack('town');
  const r = await page.evaluate(() => {
    const a = state.racers[0]; state.amandaAlly = null;
    joinAmanda({ x: a.x - 100, y: a.y + 36, amandaState: 'sitting' }, a);
    for (let i = 0; i < 60; i++) update(1 / 60);
    keys.clear(); keys.add('KeyD');
    let still = 0, gap = 0;
    for (let i = 0; i < 150; i++) { update(1 / 60); if (i > 60) { still += state.amandaAlly.moving ? 0 : 1; gap = a.x - state.amandaAlly.x; } }
    keys.clear();
    for (let i = 0; i < 120; i++) update(1 / 60);
    return { still, gap: Math.round(gap), stopGap: Math.round(a.x - state.amandaAlly.x), stopped: !state.amandaAlly.moving };
  });
  assert.equal(r.still, 0, 'running pose the whole way');
  assert.ok(r.gap > 120 && r.gap < 220, `trails a moment behind (${r.gap})`);
  assert.ok(r.stopGap > 40 && r.stopGap < 70, `stands beside her (${r.stopGap})`);
  assert.equal(r.stopped, true);
});

test('rover hops as it drives, tilts in the air and squashes on landing with its rider; pickup stays smaller', { skip: skip() }, async () => {
  await onTrack('space');
  const r = await page.evaluate(async () => {
    for (let i = 0; i < 50 && !images.moon_buggy; i++) await new Promise(r => setTimeout(r, 100)); // its sheet may still be loading
    const a = state.racers[0]; a.horseType='moon_buggy'; a.horseTimer=30; a.z=0; a.moving=true; a.facing=1;
    a.x=19*Math.PI/2; const drive=roverMotion(a,1);
    a.moving=false; const parked=roverMotion(a,1);
    a.z=60; a.vy=500; const up=roverMotion(a,1); a.facing=-1; const mirror=roverMotion(a,1); a.vy=-500; const down=roverMotion(a,1);
    a.facing=1; a.z=0; a.vy=0; a.roverLandTimer=ROVER_LANDING_TIME*0.5; const landing=roverMotion(a,1); a.roverLandTimer=0;
    const calls=[]; const draw=ctx.drawImage.bind(ctx);
    ctx.drawImage=(...args)=>{if(args[0]===images.moon_buggy) calls.push(args[7]);return draw(...args);};
    state.camera = a.x - 300; // both on screen (an off-screen pickup isn't drawn)
    try { drawPowerup({type:'horse',horseType:'moon_buggy',x:a.x,y:a.y+58},0); drawRacer(a); } finally {ctx.drawImage=draw;}
    return {drive,parked,up,mirror,down,landing,widths:calls};
  });
  assert.ok(r.drive.bob<-2&&r.drive.bob>-15, `it hops over bumps (${r.drive.bob})`);
  assert.ok(r.landing.bob>8, `it squashes down on landing (${r.landing.bob})`);
  assert.deepEqual(r.parked,{bob:0,tilt:0});
  assert.ok(r.up.tilt<0&&r.down.tilt<0); assert.equal(r.up.tilt,-r.mirror.tilt);
  assert.equal(r.widths.length,2,JSON.stringify(r.widths)); assert.ok(r.widths[0]<r.widths[1]*0.7,`pickup ${r.widths[0]} < mounted ${r.widths[1]}`);
  assert.deepEqual(errors,[]);
});

test('walking into a candy pile scatters the sweets off the screen and she cheers; a cloud troll puffs away', { skip: skip() }, async () => {
  await onTrack('candy');
  const candy = await page.evaluate(async () => {
    const a = state.racers[0]; a.x = 8000; a.y = PATH_TOP + 90;
    const m = spawnMonster(8300, a.y, { active: true, riding: false }); m.riding = false; m.x = 8300; m.y = a.y; m.state = 'walk'; state.monsters = [m];
    m.knockedBacks = MONSTER_SLEEP_KNOCKBACKS - 1; applyMonsterKnockback(m, 1);
    for (let i = 0; i < 150; i++) { a.x = 8000; update(1 / 60); }
    await new Promise(r => setTimeout(r, 300)); // her cheer pose loads while the pile lies there
    const pile = m.state; state.particles = [];
    keys.clear(); keys.add('KeyD');
    let cheering = false, lowest = 0, cheerX = 0, cheerMoved = 0;
    for (let i = 0; i < 160; i++) {
      update(1 / 60);
      if (a.celebrateTimer > 0 && !cheering) cheerX = a.x;
      if (a.celebrateTimer > 0) cheerMoved = a.x - cheerX;
      cheering ||= a.celebrateTimer > 0;
      if (a.celebrateTimer > 0) drawScene(0);
      for (const p of state.particles) if (p.kind === 'candy' && p.fallThrough) lowest = Math.min(lowest, p.z);
    }
    keys.clear();
    return { pile, scattered: Boolean(m.scattered), cheering, cheerArt: Boolean(getCheerImage(a)), offScreen: lowest < -(H - PATH_TOP), moved: a.x > 8300, runsOn: cheerMoved > 40 };
  });
  assert.deepEqual(candy, { pile: 'sleeping', scattered: true, cheering: true, cheerArt: true, offScreen: true, moved: true, runsOn: true });
  await onTrack('clouds');
  const cloud = await page.evaluate(() => {
    const a = state.racers[0];
    const m = spawnMonster(8300, a.y, { active: true, riding: false }); m.riding = false; m.x = 8300; m.y = a.y; m.state = 'walk'; state.monsters = [m]; state.particles = [];
    m.knockedBacks = MONSTER_SLEEP_KNOCKBACKS - 1; applyMonsterKnockback(m, 1);
    for (let i = 0; i < 45; i++) update(1 / 60);
    return { state: m.state, wisps: state.particles.filter(p => p.kind === 'puff').length };
  });
  assert.equal(cloud.state, 'ground');
  assert.ok(cloud.wisps >= 10, `wisps: ${cloud.wisps}`);
  const sounds = await page.evaluate(() => ['storm_lightning', 'cloud_dissipate', 'candy_celebrate'].filter(n => !window.AUDIO_MANIFEST.sfx[n]));
  assert.deepEqual(sounds, [], 'its sounds exist');
  assert.deepEqual(errors, []);
});

test('lightning EMPs show the original icon and shock; the others play their own effect and leave you dizzy', { skip: skip() }, async () => {
  const seen = {};
  for (const track of ['clouds', 'space', 'winter', 'festival', 'candy', 'farm', 'town', 'castles', 'autumn', 'woods']) {
    await onTrack(track);
    seen[track] = await page.evaluate(async () => {
      for (let i = 0; i < 50 && !getTrackArt('powerups'); i++) await new Promise(r => setTimeout(r, 100));
      const [a, b] = state.racers; b.x = a.x + 400; b.y = a.y + 20;
      state.powerups = [makePowerup('emp', a.x, a.y + 54)]; state.powerups[0].dropTimer = 99;
      update(1 / 60);
      const style = state.empArcs[0]?.style;
      let dizzy = false;
      for (let i = 0; i < 140; i++) { update(1 / 60); drawScene(0); dizzy ||= Boolean(b.empDizzy); } // the rooster hops about a while
      return { style, icon: pickupLook('emp').sheet ? 'own' : 'original', hit: dizzy ? 'dizzy' : 'shocked', done: state.empArcs.length === 0 };
    });
  }
  for (const track of ['clouds', 'winter']) assert.deepEqual(seen[track], { style: 'lightning', icon: 'original', hit: 'shocked', done: true }, track);
  // Moon Base's laser bolts shock, from its own laser-gun trigger.
  assert.deepEqual(seen.space, { style: 'laser', icon: 'own', hit: 'shocked', done: true }, 'space');
  const styles = { festival: 'firework', candy: 'poprocks', farm: 'rooster', town: 'bell', castles: 'gong', autumn: 'crows', woods: 'acorns' };
  for (const [track, style] of Object.entries(styles)) assert.deepEqual(seen[track], { style, icon: 'own', hit: 'dizzy', done: true }, track);
  assert.deepEqual(errors, []);
});

test('an EMP stuns each target when its effect reaches them: lightning at once, the others a moment later', { skip: skip() }, async () => {
  const when = {};
  for (const track of ['clouds', 'festival', 'farm', 'autumn', 'space']) {
    await onTrack(track);
    when[track] = await page.evaluate(async () => {
      for (let i = 0; i < 50 && !getTrackArt('powerups'); i++) await new Promise(r => setTimeout(r, 100));
      const [a, b] = state.racers; b.x = a.x + 500; b.y = a.y;
      state.powerups = [makePowerup('emp', a.x, a.y + 54)]; state.powerups[0].dropTimer = 99;
      for (let i = 1; i <= 90; i++) { update(1 / 60); if (b.frozenTimer > 0) return i; }
      return null;
    });
  }
  assert.equal(when.clouds, 1, 'lightning is instant');
  // (A sound wave stuns once it has passed right through.)
  for (const track of ['festival', 'farm', 'autumn', 'space']) assert.ok(when[track] > 5 && when[track] < 90, `${track} lands after ${when[track]} frames`);
});

test('Farm rooster uses all three delivered crowing cells, popping up on its trigger, in either direction', { skip: skip() }, async () => {
  await onTrack('farm');
  const r = await page.evaluate(async () => {
    for(let i=0;i<50&&!getSharedArt('rooster_crow');i++) await new Promise(r=>setTimeout(r,100));
    const sheet=getSharedArt('rooster_crow'),a=state.racers[0];
    const frames=[],facing=[],spots=[]; const draw=ctx.drawImage.bind(ctx),scale=ctx.scale.bind(ctx);
    ctx.drawImage=(...v)=>{if(v[0]===sheet) frames.push([v[1],v[3],v[4],v[7],v[8]]);return draw(...v);};
    ctx.scale=(x,y)=>{facing.push(x);return scale(x,y);};
    try {for(const dir of [1,-1]) {a.facing=dir; for(const t of [.4,.55,.7]) {
      const arc={source:a,style:'rooster',t}; const from={x:a.x,y:a.y}; spots.push(roosterSpot(arc,from));drawCrowingRooster(arc,from);
    }}} finally {ctx.drawImage=draw;ctx.scale=scale;}
    return {size:sheet&&[sheet.width,sheet.height],frames,facing,spots,x:a.x};
  });
  assert.deepEqual(r.size,[768,256]);
  assert.deepEqual(r.frames.map(f=>f[0]),[0,256,512,0,256,512]);
  for(const f of r.frames) assert.deepEqual(f.slice(1),[256,256,96,96]);
  assert.deepEqual(r.facing,[1,1,1,-1,-1,-1]);
  assert.ok(r.spots.every(p=>p.x===r.x)); // on the trigger (here at her x)
  assert.deepEqual(errors,[]);
});

test('a song picks up where it was left when its board comes round again', { skip: skip() }, async () => {
  const r = await page.evaluate(async () => {
    const wait = el => new Promise(r => el.readyState >= 1 ? r() : el.addEventListener('loadedmetadata', r, { once: true }));
    songPositions.clear(); // earlier tests have played these songs
    setBackground('farm'); syncBackgroundMusic(); await wait(music);
    music.currentTime = 42; await new Promise(r => setTimeout(r, 100));
    setBackground('town'); await wait(music); const town = Boolean(music.resumePending);
    setBackground('farm'); await wait(music); await new Promise(r => setTimeout(r, 200));
    const back = Boolean(music.resumePending);
    return { town, back, at: Math.round(music.currentTime) };
  });
  // Town's song starts fresh; the Farm's comes back at 42 s, flagged to fade in.
  assert.deepEqual(r, { town: false, back: true, at: 42 });
});

test('the workbench runs: any player, still targets, every power-up and mount drops in, a troll grabs and throws', { skip: skip() }, async () => {
  const bench = await browser.newPage({ viewport: { width: 1500, height: 820 } });
  const benchErrors = [];
  bench.on('pageerror', e => benchErrors.push(String(e.stack || e)));
  await bench.goto(base + 'workbench/');
  await bench.waitForFunction(() => document.querySelectorAll('#mounts .tile').length > 0, null, { timeout: 30000 });
  const frame = bench.frames().find(f => f.url().includes('index.html'));
  const r = await frame.evaluate(async () => {
    const tick = n => { for (let i = 0; i < n; i++) update(1 / 60); };
    Bench.setup('festival');
    Bench.addTarget({ kind: 'doll', key: 'juliette' });
    Bench.addTarget({ kind: 'troll', key: 'cloudtroll' });
    for (const kind of ['spring', 'pogo', 'boost', 'emp', 'oil', 'snowball', ...Bench.MOUNT_TYPES]) { Bench.drop(kind); tick(5); }
    tick(60);
    // A troll player grabs the doll in front of it and throws her.
    Bench.setup('farm');
    Bench.setPlayer({ kind: 'troll', key: 'troll', name: 'Troll' });
    Bench.addTarget({ kind: 'doll', key: 'juliette' });
    const [troll, doll] = state.racers;
    troll.x = doll.x - 110; troll.facing = 1; troll.pushCooldown = 0;
    keys.add('KeyF'); tick(2); keys.delete('KeyF');
    let held = false;
    for (let i = 0; i < 80; i++) { tick(1); held ||= doll.grabbedBy === troll; }
    return { running: state.running, held, thrown: !doll.grabbedBy && Math.abs(doll.x - troll.x) > 150, still: doll.dummy };
  });
  // Y (R): a cloud troll player throws lightning that knocks a target down.
  const zap = await frame.evaluate(async () => {
    await Promise.all([loadArtOnce('cloudtroll_lightning', 'assets/cloudtroll_lightning.webp'), loadArtOnce('cloudtroll_bolt', 'assets/cloudtroll_bolt.webp')]);
    Bench.setup('farm');
    Bench.setPlayer({ kind: 'troll', key: 'cloudtroll', name: 'Cloud troll' });
    Bench.addTarget({ kind: 'doll', key: 'juliette' });
    const [troll, doll] = state.racers;
    doll.x = troll.x + 350; doll.y = troll.y; troll.facing = 1;
    keys.add('KeyR'); update(1 / 60); keys.delete('KeyR');
    let hit = false;
    for (let i = 0; i < 90; i++) { update(1 / 60); drawScene(0); hit ||= doll.fallBackTimer > 0; }
    return hit;
  });
  assert.equal(zap, true, 'the cloud troll\'s lightning hits');
  // Dragging: a tile let go over the scene adds it there; dragged out, gone.
  const tileBox = async name => { for (const t of await bench.$$('#players .tile, #mounts .tile')) if ((await t.innerText()).trim() === name) return t.boundingBox(); };
  const sceneBox = await (await bench.$('#game')).boundingBox();
  const dragTo = async (from, to) => {
    await bench.mouse.move(from.x, from.y); await bench.mouse.down();
    for (let i = 1; i <= 8; i++) await bench.mouse.move(from.x + (to.x - from.x) * i / 8, from.y + (to.y - from.y) * i / 8);
    await bench.mouse.up();
  };
  const lily = await tileBox('Lily');
  const spot = { x: sceneBox.x + sceneBox.width * 0.6, y: sceneBox.y + sceneBox.height * 0.75 };
  await dragTo({ x: lily.x + 30, y: lily.y + 30 }, spot);
  const pony = await tileBox('Pony');
  await dragTo({ x: pony.x + 30, y: pony.y + 30 }, { x: spot.x - 120, y: spot.y });
  const added = await frame.evaluate(() => ({ lily: state.racers.some(r => r.name === 'Lily' && r.dummy), pony: state.powerups.some(q => q.horseType === 'pony') }));
  await dragTo({ x: spot.x, y: spot.y - 10 }, { x: 5, y: 300 }); // Lily out of the scene
  const removed = await frame.evaluate(() => !state.racers.some(r => r.name === 'Lily'));
  await bench.close();
  assert.deepEqual(r, { running: true, held: true, thrown: true, still: true });
  assert.deepEqual({ ...added, removed }, { lily: true, pony: true, removed: true });
  assert.deepEqual(benchErrors, []);
});

test('Horse Show: a troll knocked off leaves his skeleton horse to ride; it bowls everyone over except magic mounts', { skip: skip() }, async () => {
  await onTrack('horseshow');
  const r = await page.evaluate(async () => {
    for (let i = 0; i < 50 && !images.skeleton_horse; i++) await new Promise(r => setTimeout(r, 100));
    const [a, b] = state.racers;
    a.x = 9000; a.y = PATH_TOP + 90; a.horseType = 'horse'; a.horseTimer = Infinity; a.facing = 1;
    b.x = 12000; b.ai = false;
    const m = spawnMonster(9300, a.y, { active: true, riding: true }); m.x = 9300; m.y = a.y; m.riding = true; m.state = 'walk'; state.monsters = [m];
    applyMonsterKnockback(m, 1, { unhorse: true });
    const loose = state.powerups.find(q => q.loose && q.horseType === 'skeleton_horse');
    const swapped = Boolean(loose) && applyPowerup(a, loose) && a.horseType === 'skeleton_horse';
    state.monsters = [];
    // Run into a girl on a plain horse: she's knocked off.
    const runInto = (horseType) => {
      b.x = a.x + 60; b.y = a.y; b.z = 0; b.horseType = horseType; b.horseTimer = 30; b.fallBackTimer = 0; b.grabbedBy = null;
      a.speed = HORSE_RUN_SPEED; a.mountBumpCooldown = 0; a.fallBackTimer = 0;
      bumpWithSkeletonHorses();
      return { other: isMounted(b) ? b.horseType : 'off', me: isMounted(a) ? a.horseType : 'off' };
    };
    const horse = runInto('horse');
    a.horseType = 'skeleton_horse'; a.horseTimer = 12;
    const unicorn = runInto('unicorn');
    return { loose: Boolean(loose), swapped, horse, unicorn };
  });
  assert.deepEqual(r, { loose: true, swapped: true, horse: { other: 'off', me: 'skeleton_horse' }, unicorn: { other: 'off', me: 'off' } });
});

test('a thrown apple bounces off whoever it hits and stays on the ground until stepped on', { skip: skip() }, async () => {
  await onTrack('farm');
  const r = await page.evaluate(() => {
    const [a, b] = state.racers;
    a.x = 8100; a.y = PATH_TOP + 90; a.facing = 1; b.x = 8350; b.y = a.y; b.ai = false; b.horseTimer = 0;
    state.thrownLeftovers = []; a.snowballs = 1; launchSnowball(a);
    let hit = false;
    for (let i = 0; i < 12 && !hit; i++) { update(1 / 60); hit ||= b.fallBackTimer > 0; }
    a.x = 7000; // the thrower steps aside
    for (let i = 0; i < 40; i++) update(1 / 60);
    const apple = state.thrownLeftovers.find(t => t.kind === 'roll');
    const clear = Math.abs(apple.x - b.x) > 60; // landed clear of who it hit
    b.x = 6000; // out of the way
    for (let i = 0; i < 400; i++) update(1 / 60);
    const stays = state.thrownLeftovers.includes(apple) && !apple.squished;
    a.x = apple.x; a.y = apple.groundY - 54; a.z = 0;
    update(1 / 60);
    const squished = apple.squished;
    for (let i = 0; i < 60; i++) update(1 / 60);
    return { hit, bounced: Boolean(apple) && apple.x < 8350, clear, stays, squished, gone: !state.thrownLeftovers.includes(apple) };
  });
  assert.deepEqual(r, { hit: true, bounced: true, clear: true, stays: true, squished: true, gone: true });
});

test('Pumpkin Patch uses the CROWS trigger and four-frame crow art, mirrored along its flight', { skip: skip() }, async () => {
  await onTrack('autumn');
  const r=await page.evaluate(async()=>{
    for(let i=0;i<50&&!getSharedArt('crow');i++) await new Promise(r=>setTimeout(r,100));
    const sheet=getSharedArt('crow'),frames=[],directions=[];
    const draw=ctx.drawImage.bind(ctx),scale=ctx.scale.bind(ctx),clock=performance.now.bind(performance);let tick=0;
    performance.now=()=>tick;
    ctx.drawImage=(...a)=>{if(a[0]===sheet)frames.push([a[1],a[3],a[4],a[7],a[8]]);return draw(...a);};
    ctx.scale=(x,y)=>{directions.push(x);return scale(x,y);};
    try {for(const dir of [1,-1])for(tick=0;tick<280;tick+=70)drawCrow(300,300,dir,0,1);}
    finally {ctx.drawImage=draw;ctx.scale=scale;performance.now=clock;}
    const [a,b]=state.racers;b.x=a.x+300;b.y=a.y;state.monsters=[];applyPowerup(a,'emp');
    for(let i=0;i<60;i++){update(1/60);drawScene(0);}
    return {label:pickupLook('emp').label,size:sheet&&[sheet.width,sheet.height],frames,directions,dizzy:b.empDizzy};
  });
  assert.equal(r.label,'CROWS');assert.deepEqual(r.size,[512,128]);
  assert.deepEqual(r.frames.map(f=>f[0]),[0,128,256,384,0,128,256,384]);
  for(const f of r.frames)assert.deepEqual(f.slice(1),[128,128,64,64]);
  assert.deepEqual(r.directions,[1,1,1,1,-1,-1,-1,-1]);assert.equal(r.dizzy,true);assert.deepEqual(errors,[]);
});

test('Cloud Kingdom: a bumpy cloud floor with gaps; walk into one and fall, jump it and carry on, back after a fall', { skip: skip() }, async () => {
  await onTrack('clouds', { gaps: true });
  const r = await page.evaluate(() => {
    const floor = state.cloudFloor;
    const gap = floor.gaps[1];
    const lifts = []; for (let x = 2000; x < 5000; x += 50) lifts.push(groundLift(x));
    const steps = lifts.slice(1).map((l, i) => Math.abs(l - lifts[i]));
    const [a, b] = state.racers; state.obstacles = []; state.monsters = [];
    const run = jump => {
      a.x = gap.start - 300; a.y = PATH_TOP + 90; a.z = 0; a.vy = 0; a.cloudFalling = false; a.facing = 1; a.landingTimer = 0; a.jumpStarted = false;
      b.x = a.x - 200;
      keys.clear(); keys.add('KeyD');
      let pressed = 0, fell = false, back = false, runningOff = false;
      for (let i = 0; i < 200; i++) {
        if (pressed && pressed++ > 4) keys.delete('Space');
        if (jump && !pressed && gap.start - a.x < 40) { keys.add('Space'); pressed = 1; }
        update(1 / 60);
        if (a.cloudFalling && !fell) { fell = true; runningOff = a.moving && a.speed > 100; }
        if (fell && !a.cloudFalling) { back = a.x < gap.start && a.z === 0; break; }
      }
      keys.clear();
      return { fell, back, past: a.x > gap.end, runningOff };
    };
    return {
      gaps: floor.gaps.length > 2, narrow: gap.end - gap.start < 160,
      gentle: Math.max(...steps) < 14, bumpy: Math.max(...lifts) - Math.min(...lifts) > 10,
      walk: run(false), jump: run(true)
    };
  });
  assert.deepEqual(r, { gaps: true, narrow: true, gentle: true, bumpy: true,
    walk: { fell: true, back: true, past: false, runningOff: true }, jump: { fell: false, back: false, past: true, runningOff: false } });
});

test('Cloud floor art uses all six cells at varied widths and keeps open jumping gaps', { skip: skip() }, async () => {
  await onTrack('clouds', { gaps: true });
  const r=await page.evaluate(async()=>{
    for(let i=0;i<50&&!getTrackArt('floor');i++)await new Promise(r=>setTimeout(r,100));
    const art=getTrackArt('floor'),calls=[];const draw=ctx.drawImage.bind(ctx);
    ctx.drawImage=(...a)=>{if(a[0]===art)calls.push(a.slice(1));return draw(...a);};
    try {for(let n=0;n<6;n++)drawCloudFloorArt(art,{variant:n,x:8000+n*500,w:n%2?670:430,h:n*5});}
    finally {ctx.drawImage=draw;}
    const gap=state.cloudFloor.gaps[0];state.camera=gap.start-250;drawScene(0);
    return {size:art&&[art.width,art.height],calls,gap:gap.end-gap.start,min:CLOUD_GAP_MIN,max:CLOUD_GAP_MAX,hasGap:!!cloudGapAt((gap.start+gap.end)/2)};
  });
  assert.deepEqual(r.size,[2304,640]);assert.equal(r.calls.length,6);
  r.calls.forEach((c,n)=>{assert.deepEqual(c.slice(0,4),[n%3*768,Math.floor(n/3)*320,768,320]);assert.equal(c[6],n%2?670:430);assert.equal(c[7],320);});
  assert.ok(r.gap>=r.min&&r.gap<=r.max,`gap ${r.gap}`);assert.equal(r.hasGap,true);assert.deepEqual(errors,[]);
});

test('moon boots are drawn over both feet in every pose, knocked back and riding too (not the jump pose with its own boots)', { skip: skip() }, async () => {
  await onTrack('space');
  const r = await page.evaluate(() => {
    const a = state.racers[0];
    const count = (sheet, row, col) => {
      let boots = 0;
      const original = window.drawMoonBootStandIn;
      window.drawMoonBootStandIn = (...args) => { boots += 1; return original(...args); };
      const art = getSharedArt('moon_boot');
      const draw = ctx.drawImage.bind(ctx);
      ctx.drawImage = (...args) => { if (art && args[0] === art) boots += 1; return draw(...args); };
      try { drawRacerBody(a, sheet, col * FRAME, row * FRAME, 300, 200, FRAME * 0.45, FRAME * 0.45, 1, 400); }
      finally { window.drawMoonBootStandIn = original; ctx.drawImage = draw; }
      return boots;
    };
    a.moonBootsTimer = 0;
    const off = count(a.sheet, 0, 0);
    a.moonBootsTimer = 5;
    const standing = count(a.sheet, 0, 0);
    const running = count(a.sheet, 1, 1);
    const knocked = count(a.sheet, 3, 2);
    const actions = getActionSheet(a);
    const jump = actions ? count(actions, 2, 2) : 0;
    // Riding: the boots stay on in the saddle.
    let riding = 0;
    const art = getSharedArt('moon_boot'), draw = ctx.drawImage.bind(ctx), original = window.drawMoonBootStandIn;
    window.drawMoonBootStandIn = (...args) => { riding += 1; return original(...args); };
    ctx.drawImage = (...args) => { if (art && args[0] === art) riding += 1; return draw(...args); };
    try { a.horseType = 'horse'; a.horseTimer = 20; drawRacer(a); } finally { ctx.drawImage = draw; window.drawMoonBootStandIn = original; a.horseTimer = 0; }
    return { off, standing, running, knocked, jump, riding, dolls: Object.keys(window.DOLL_FEET || {}).length };
  });
  assert.deepEqual({ ...r, dolls: r.dolls > 10 }, { off: 0, standing: 2, running: 2, knocked: 2, jump: 0, riding: 2, dolls: true });
});

test('on the clouds a doll bounces as she runs and sinks in a little standing still', { skip: skip() }, async () => {
  await onTrack('clouds');
  const r = await page.evaluate(() => {
    const a = state.racers[0]; a.x = 3000; a.y = PATH_TOP + 100;
    keys.clear(); keys.add('KeyD');
    const running = [];
    for (let i = 0; i < 40; i++) { update(1 / 60); running.push(cloudFootingOffset(a)); }
    keys.clear();
    for (let i = 0; i < 60; i++) update(1 / 60);
    return { bounces: Math.min(...running) < -4, sunk: cloudFootingOffset(a) > 6 };
  });
  assert.deepEqual(r, { bounces: true, sunk: true });
});

test('Cloud Kingdom: riders fall through gaps too, but a pegasus rider can fly back up', { skip: skip() }, async () => {
  await onTrack('clouds', { gaps: true });
  const r = await page.evaluate(() => {
    const gap = state.cloudFloor.gaps[1];
    const [a, b] = state.racers; state.obstacles = []; state.monsters = []; b.x = 1000;
    const ride = (horseType, rescue) => {
      Object.assign(a, { x: gap.start - 200, y: PATH_TOP + 90, z: 0, vy: 0, cloudFalling: false, cloudRescued: false, facing: 1, landingTimer: 0, jumpStarted: false, horseType, horseTimer: 30 });
      keys.clear(); keys.add('KeyD');
      let fell = false, flewBack = false, lowest = 0;
      for (let i = 0; i < 160; i++) {
        if (rescue && a.cloudFalling && a.z < -40) keys.add('Space');
        update(1 / 60);
        fell ||= a.cloudFalling;
        lowest = Math.min(lowest, a.z);
        if (fell && !a.cloudFalling && a.z >= 0 && a.x > gap.start) { flewBack = a.x > gap.end || a.z > 0; break; }
        if (fell && !a.cloudFalling) break;
      }
      keys.clear();
      return { fell, flewBack, mounted: isMounted(a) };
    };
    return { horse: ride('horse', false), pegasus: ride('pegasus', true) };
  });
  assert.deepEqual(r.horse, { fell: true, flewBack: false, mounted: true });
  assert.equal(r.pegasus.fell, true);
  assert.equal(r.pegasus.flewBack, true, 'a pegasus flies back up out of the gap');
});
