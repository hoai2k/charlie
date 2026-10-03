import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [], fails = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => fails.push(r.url()));
page.on('response', (r) => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); });
await page.goto('http://localhost:8450/party/?scene=audio');
await page.waitForTimeout(1500);
await page.mouse.click(400, 300);
const res = await page.evaluate(async () => {
  const a = await import('./src/engine/audio.js');
  a.unlockAudio();
  const out = {};
  for (const name of ['dance', 'menu', 'chill']) {
    const b = await a.music.preload(name);
    a.music.play(name, { restart: true });
    const m = a.music;
    const ctx = m.fileSrc ? m.fileSrc.context : null;
    const t0 = ctx.currentTime;
    await new Promise((r) => setTimeout(r, 1200));
    out[name] = { decoded: !!b, duration: b && b.duration, sampleRate: b && b.sampleRate, file: !!m.fileSrc,
      loopStart: m.fileSrc && m.fileSrc.loopStart, loopEnd: m.fileSrc && m.fileSrc.loopEnd,
      startMinusPlay: m.start - t0, beatAfter1_2s: m.beat(), bpm: m.bpm, ctxState: ctx.state };
    m.stop(0.05);
  }
  return out;
});
console.log(JSON.stringify({ res, errors, fails }, null, 1));
await browser.close();
