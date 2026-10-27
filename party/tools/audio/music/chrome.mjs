// node chrome.mjs file1.mp3 ... : decode each in Chromium (44.1k and 48k contexts) and dump PCM.
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const files = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('http://audio.test/**', async (route) => {
  const u = new URL(route.request().url());
  if (u.pathname.startsWith('/upload/')) {
    fs.writeFileSync(path.join('chrome', decodeURIComponent(u.pathname.slice(8))), route.request().postDataBuffer());
    return route.fulfill({ status: 200, body: 'ok' });
  }
  if (u.pathname === '/') return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>t</body></html>' });
  const f = decodeURIComponent(u.pathname.slice(1));
  return route.fulfill({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync(f) });
});
await page.goto('http://audio.test/');
const out = {};
for (const f of files) {
  out[f] = await page.evaluate(async (f) => {
    const ab = await (await fetch('http://audio.test/' + encodeURIComponent(f))).arrayBuffer();
    const res = {};
    for (const sr of [44100, 48000]) {
      const ctx = new OfflineAudioContext(2, 1, sr);
      try {
        const b = await ctx.decodeAudioData(ab.slice(0));
        res[sr] = { length: b.length, duration: b.duration, sampleRate: b.sampleRate, channels: b.numberOfChannels };
        if (sr === 44100) {
          const inter = new Float32Array(b.length * 2);
          const c0 = b.getChannelData(0), c1 = b.getChannelData(1);
          for (let i = 0; i < b.length; i++) { inter[2 * i] = c0[i]; inter[2 * i + 1] = c1[i]; }
          const name = f.split('/').pop().replace('.mp3', '.f32');
          await fetch('http://audio.test/upload/' + encodeURIComponent(name), { method: 'POST', body: inter.buffer });
        }
      } catch (e) { res[sr] = { error: String(e) }; }
    }
    return res;
  }, f);
}
console.log(JSON.stringify({ results: out, errors }, null, 1));
await browser.close();
