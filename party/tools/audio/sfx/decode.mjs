import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const g = execSync('npm root -g').toString().trim();
const { chromium } = (await import(path.join(g, 'playwright/index.js'))).default;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const bad = [], cons = [];
page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') cons.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => cons.push('pageerror: ' + e.message));
await page.goto('http://localhost:8450/party/?scene=audio', { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.mouse.click(200, 200); await page.keyboard.press('Space'); await page.waitForTimeout(1500);
const res = await page.evaluate(async () => {
  const m = await (await fetch('assets/audio/manifest.json', { cache: 'no-store' })).json();
  const ctx = new AudioContext();
  const files = Object.values(m.sfx).flatMap((v) => (Array.isArray(v) ? v : [v]));
  const out = { n: files.length, failed: [], durs: {}, http: [] };
  for (const f of files) {
    try {
      const r = await fetch('assets/audio/' + f, { cache: 'no-store' });
      if (!r.ok) { out.http.push(r.status + ' ' + f); continue; }
      const b = await ctx.decodeAudioData(await r.arrayBuffer()); out.durs[f] = [+b.duration.toFixed(3), b.sampleRate, b.numberOfChannels];
    } catch (e) { out.failed.push(f + ' ' + e.message); }
  }
  return out;
});
const shot = '/tmp/claude-0/-home-user-charlie/d9e11baa-4571-5c8e-89eb-f20e313d6ff3/scratchpad/sfx2/audio-scene.png';
await page.screenshot({ path: shot });
console.log('files', res.n, 'decoded', Object.keys(res.durs).length, 'failed', JSON.stringify(res.failed), 'http', JSON.stringify(res.http));
console.log('404s/4xx during page', JSON.stringify(bad));
console.log('console errors/warnings', JSON.stringify(cons));
fs.writeFileSync('/tmp/claude-0/-home-user-charlie/d9e11baa-4571-5c8e-89eb-f20e313d6ff3/scratchpad/sfx2/browser_durs.json', JSON.stringify(res.durs, null, 1));
await browser.close();
