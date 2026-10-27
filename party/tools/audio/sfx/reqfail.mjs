import { execSync } from 'node:child_process'; import path from 'node:path';
const g = execSync('npm root -g').toString().trim();
const { chromium } = (await import(path.join(g, 'playwright/index.js'))).default;
const browser = await chromium.launch(); const page = await browser.newPage();
page.on('requestfailed', (r) => console.log('FAILED', r.url(), r.failure()?.errorText));
await page.goto('http://localhost:8450/party/?scene=audio'); await page.waitForTimeout(2500);
await browser.close();
