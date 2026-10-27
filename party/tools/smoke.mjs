// Smoke test: play games all-CPU to the end in headless Chromium and report any that
// crash, log console errors or never finish. Run it after changing game code:
//
//   node party/tools/smoke.mjs                      every shelf game (Party, Play Studio, Sister)
//   node party/tools/smoke.mjs crown-keeper bed-bounce --players 4
//   node party/tools/smoke.mjs --molly medium --jobs 3 --port 8123 [--no-serve]
//
// Each game runs with ?game=<id>&players=N&auto=1&skipintro=1&speed=3 and passes once it
// reaches the results screen (or is back on the menu after it). Exit code 1 if any fail.
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try { ({ chromium } = await import('playwright')); } catch (e) {
  const g = execSync('npm root -g').toString().trim();
  ({ chromium } = (await import(path.join(g, 'playwright/index.js'))).default);
}

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flags = new Set(['--no-serve']);
const valued = new Set(['--port', '--players', '--jobs', '--molly', '--timeout']);
const ids = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
const port = parseInt(opt('port', '8123'), 10);
const players = parseInt(opt('players', '8'), 10);
const jobs = parseInt(opt('jobs', '3'), 10);
const molly = opt('molly', null);
const limit = parseInt(opt('timeout', '240'), 10) * 1000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = `http://localhost:${port}/party/`;

let server = null;
if (!args.includes('--no-serve')) {
  server = spawn('npx', ['http-server', root, '-p', String(port), '-s', '-c-1'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
}
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function listGames() {
  const page = await browser.newPage();
  await page.goto(base, { timeout: 180000 });
  const list = await page.evaluate(async () => {
    const m = await import('./src/games/index.js');
    return [...m.PARTY_GAMES, ...m.STUDIO_GAMES, ...m.MOLLY_GAMES].map((g) => g.id);
  });
  await page.close();
  return [...new Set(list)];
}

async function run(id) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  const q = `?game=${id}&players=${players}&auto=1&skipintro=1&speed=3${molly ? '&molly=' + molly : ''}`;
  let scene = '?';
  const t0 = Date.now();
  try {
    await page.goto(base + q, { timeout: 180000 });
    while (Date.now() - t0 < limit) {
      await page.waitForTimeout(3000);
      scene = await page.evaluate(() => window.party?.scenes?.current?.constructor?.name || '?');
      if (/Results|GameSelect|Trophy/.test(scene)) break;
    }
  } catch (e) { errors.push(e.message.split('\n')[0]); }
  await page.close();
  const ok = /Results|GameSelect|Trophy/.test(scene) && !errors.length;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  (${Math.round((Date.now() - t0) / 1000)} s, ended on ${scene})${errors.length ? '  ' + errors.slice(0, 3).join(' | ') : ''}`);
  return ok;
}

const list = ids.length ? ids : await listGames();
let failed = 0, next = 0;
await Promise.all(Array.from({ length: Math.min(jobs, list.length) }, async () => {
  while (next < list.length) { if (!(await run(list[next++]))) failed++; }
}));
console.log(`${list.length - failed}/${list.length} games passed`);
await browser.close();
if (server) server.kill();
process.exit(failed ? 1 : 0);
