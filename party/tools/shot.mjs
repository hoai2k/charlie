// Headless test helper: loads a Charlie Party URL, optionally feeds keys,
// saves screenshots and prints console errors.
//
//   node party/tools/shot.mjs "?scene=sprites" out.png [--wait 2000] [--keys "Space,500,ArrowRight"] [--shots 3 --every 1500] [--port 8123]
//
// Serves the repo root itself (via http-server on --port) unless --no-serve.
// --keys: comma list; numbers are waits in ms, anything else is a key code
// pressed briefly (e.g. Space, Enter, KeyD, ArrowLeft). "hold:KeyD:800" holds.
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Use a local playwright if installed, else the global one.
let chromium;
try { ({ chromium } = await import('playwright')); } catch (e) {
  const g = execSync('npm root -g').toString().trim();
  ({ chromium } = (await import(path.join(g, 'playwright/index.js'))).default);
}

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const query = args[0] || '';
const out = args[1] || 'shot.png';
const port = parseInt(opt('port', '8123'), 10);
const wait = parseInt(opt('wait', '2500'), 10);
const shots = parseInt(opt('shots', '1'), 10);
const every = parseInt(opt('every', '1500'), 10);
const keys = opt('keys', '');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let server = null;
if (!args.includes('--no-serve')) {
  server = spawn('npx', ['http-server', root, '-p', String(port), '-s', '-c-1'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
await page.goto(`http://localhost:${port}/party/${query}`);
await page.waitForTimeout(wait);
for (const k of keys.split(',').filter(Boolean)) {
  if (/^\d+$/.test(k)) await page.waitForTimeout(parseInt(k, 10));
  else if (k.startsWith('hold:')) { const [, code, ms] = k.split(':'); await page.keyboard.down(code); await page.waitForTimeout(parseInt(ms, 10)); await page.keyboard.up(code); }
  else { await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k); }
}
for (let i = 0; i < shots; i++) {
  const file = shots > 1 ? out.replace(/\.png$/, `-${i}.png`) : out;
  await page.screenshot({ path: file });
  if (i < shots - 1) await page.waitForTimeout(every);
}
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
if (server) server.kill();
process.exit(0);
