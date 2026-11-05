// Focused layout evidence after CSS edits; use scroll-check.mjs for the journey.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { launchBrowser, observeErrors } from '../browser.mjs';
import { startServer } from '../serve.mjs';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let lock;
for (;;) {
  for (let i = 0; i < Number(process.env.GPU_SLOTS || 2); i++) {
    const candidate = path.resolve(`out/.gpu.lock.${i}`);
    try {
      const fd = fs.openSync(candidate, 'wx');
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, args: 'U1 scroll views' })); fs.closeSync(fd);
      lock = candidate; break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try { process.kill(JSON.parse(fs.readFileSync(candidate)).pid, 0); }
      catch { fs.rmSync(candidate, { force: true }); }
    }
  }
  if (lock) break;
  await sleep(1000);
}
const unlock = () => { if (lock) fs.rmSync(lock, { force: true }); };
process.on('exit', unlock); process.on('SIGINT', () => { unlock(); process.exit(130); });
const server = await startServer(0, path.resolve('dist'));
let browser;
const report = [];
try {
  browser = await launchBrowser({ width: 960, height: 540 });
  const page = await browser.newPage(), clean = observeErrors(page);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const shot = name => page.screenshot({ path: `out/U1/${name}.png` });
  for (const phone of [false, true]) {
    await page.setViewport(phone ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 960, height: 540 });
    for (const scene of [0, 1]) {
      await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}`, { waitUntil: 'load' });
      await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 120000 });
      assert(!await page.evaluate(() => window.__RENDER_ERROR));
      await page.waitForFunction('__scroll.captionsVisible()', { timeout: 30000 }); await sleep(1300);
      await shot(phone ? `phone-scene${scene}` : `scene${scene}-caption`);
      if (phone) {
        await page.keyboard.press('KeyP'); await shot(`phone-performance${scene}`);
        const bounds = await page.evaluate(() => {
          const box = id => { const b = document.getElementById(id).getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
          return { caption: box('scroll-caption'), perf: box('scroll-performance'), control: box(__scroll.scene() ? 'scroll-prev' : 'scroll-next'), width: innerWidth };
        });
        assert(bounds.perf.bottom < bounds.caption.top, 'phone performance and caption overlap');
        assert(bounds.caption.bottom < bounds.control.top && bounds.caption.left >= 0 && bounds.caption.right <= bounds.width, 'phone caption and control bounds');
        report.push({ scene, bounds }); await page.keyboard.press('KeyP');
      }
      await page.waitForFunction('document.getElementById("scroll-caption-line").textContent.startsWith(__scroll.scene() ? "橋下" : "近岸") && __scroll.captionsVisible()', { timeout: 30000 });
      await sleep(1300); await shot(phone ? `phone-scene${scene}-caption2` : `scene${scene}-caption2`);
      clean();
    }
  }
  fs.writeFileSync('out/U1/scroll-views.json', JSON.stringify(report, null, 2) + '\n');
  console.log('PASS final desktop and phone captions, both lines; phone P readout bounds', JSON.stringify(report));
} finally {
  if (browser) { await Promise.race([browser.close().catch(() => {}), sleep(1500)]); try { browser.process()?.kill('SIGKILL'); } catch {} }
  await server.close(); unlock();
}
