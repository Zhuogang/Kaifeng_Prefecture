// U1 delivery check. Build first; serves dist exclusively beneath a nested prefix.
// All evidence stays in out/U1/. Optional --legacy checks the old world as well.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { launchBrowser, observeErrors } from '../browser.mjs';

const out = path.resolve('out/U1'), root = path.resolve('dist'), prefix = '/painted/kaifeng/';
const started = performance.now();
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], scenes: [], requests: [], warnings: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let lock;
for (;;) {
  for (let i = 0; i < Number(process.env.GPU_SLOTS || 2); i++) {
    const candidate = path.resolve(`out/.gpu.lock.${i}`);
    try {
      const fd = fs.openSync(candidate, 'wx');
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, args: 'U1 scroll check' })); fs.closeSync(fd);
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
process.on('exit', unlock);
process.on('SIGINT', () => { unlock(); process.exit(130); });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.bin': 'application/octet-stream', '.css': 'text/css' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
  const file = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
  if (!pathname.startsWith(prefix) || !file.startsWith(root + path.sep)) {
    report.requests.push({ pathname, status: 403 }); response.writeHead(403); response.end(); return;
  }
  fs.readFile(file, (error, data) => {
    report.requests.push({ pathname, status: error ? 404 : 200 });
    response.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    response.end(error ? 'Not found' : data);
  });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}${prefix}index.html`;
let browser;
try {
  browser = await launchBrowser({ width: 960, height: 540 });
  const page = await browser.newPage(), clean = observeErrors(page);
  page.on('console', message => { if (message.type() === 'warn' || message.type() === 'warning') report.warnings.push(message.text()); });
  const check = (condition, name) => { assert(condition, name); report.checks.push(name); console.log('PASS', name); };
  const waitReady = async () => {
    await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 900000 });
    const error = await page.evaluate(() => window.__RENDER_ERROR); assert(!error, error); clean();
  };
  const shot = name => page.screenshot({ path: path.join(out, name + '.png') });
  const state = () => page.evaluate(() => ({ ...window.__STATS, status: window.__scroll.status(), scene: window.__scroll.scene(), timeOrigin: performance.timeOrigin }));
  const caption = async name => {
    await page.waitForFunction('window.__scroll.captionsVisible()', { timeout: 30000 });
    await sleep(1300); await shot(name);
  };
  await page.goto(base, { waitUntil: 'load' }); await waitReady();
  report.gpu = await page.evaluate(() => window.__GPU_INFO);
  check(await page.$eval('#scroll-open', el => !el.hidden), 'opening waits for first completed scene frame');
  await shot('opening');
  report.scenes.push(await state());
  await page.click('#scroll-open');
  await caption('scene0-caption');
  check(await page.evaluate(() => __scroll.scene() === 0 && __scroll.fraction() > 0), 'opening enters scene 0 with drift');
  await page.evaluate(() => __scroll.scrub(.7)); await sleep(200);
  check(await page.evaluate(() => Math.abs(__scroll.fraction() - .7) < .001), 'scrub interface pauses drift');
  await page.mouse.move(420, 350); await page.mouse.wheel({ deltaY: 100 }); await sleep(300);
  check(await page.evaluate(() => __scroll.fraction() > .73), 'wheel scrubs along path');
  await page.mouse.move(300, 330); await page.mouse.down(); await page.mouse.move(480, 330, { steps: 5 }); await page.mouse.up();
  check(await page.evaluate(() => __scroll.fraction() > .9), 'pointer drag scrubs along path');
  await page.keyboard.press('KeyP'); await sleep(200); await shot('performance');
  check(await page.$eval('#scroll-performance', el => !el.hidden && /FPS/.test(el.textContent) && /triangles/.test(el.textContent)), 'P exposes readable frame, draw and ratio metrics');
  await page.keyboard.press('KeyP');
  await page.keyboard.press('KeyC'); check(!await page.evaluate(() => __scroll.captionsVisible()), 'C hides caption');
  await page.keyboard.press('KeyC'); check(await page.evaluate(() => __scroll.captionsVisible()), 'C restores caption');
  const origin0 = await page.evaluate(() => performance.timeOrigin);
  // Sample the real sweep's middle pose without racing screenshot readback
  // against document destruction on a software GPU. Navigation is tested below.
  await page.evaluate(() => {
    const cover = document.getElementById('scroll-cover');
    cover.style.transition = 'none'; cover.style.transform = 'translateX(-50%)';
  });
  await shot('transition');
  await page.evaluate(() => __scroll.next());
  await page.waitForFunction('window.__scroll?.scene() === 1 && window.__scroll.ready() || window.__RENDER_ERROR', { timeout: 120000 });
  await waitReady();
  check(await page.evaluate(origin => performance.timeOrigin !== origin, origin0), 'next uses a full page navigation');
  await caption('scene1-caption'); report.scenes.push(await state());
  await page.waitForFunction('document.getElementById("scroll-caption-line").textContent === "橋下密排石柱，蓋車駕御路也。" && __scroll.captionsVisible()', { timeout: 30000 });
  await sleep(1300); await shot('scene1-caption2');
  check(true, 'second caption follows the first');
  const origin1 = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() => __scroll.prev());
  await page.waitForFunction('window.__scroll?.scene() === 0 && window.__scroll.ready() || window.__RENDER_ERROR', { timeout: 120000 });
  await waitReady();
  check(await page.evaluate(origin => performance.timeOrigin !== origin, origin1), 'prev returns through a full page navigation');
  await page.evaluate(() => __scroll.scrub(.5));
  await sleep(4600);
  check(await page.evaluate(() => __scroll.fraction() > .5), 'drift resumes four seconds after scrubbing');
  // Headless-shell keeps its pages visible even with another page foregrounded.
  // Deliver the browser visibility signal explicitly and count real renders.
  const pausedTime = await page.evaluate(() => {
    window.__u1Frames = 0;
    const render = engine.renderInteractive.bind(engine);
    engine.renderInteractive = (...args) => { window.__u1Frames++; return render(...args); };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    return engine.time;
  });
  await sleep(500);
  check(await page.evaluate(time => engine.time === time && window.__u1Frames === 0, pausedTime), 'hidden visibility signal pauses rendering and engine time');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(800);
  check(await page.evaluate(time => engine.time > time, pausedTime), 'rendering resumes when the tab returns');

  // The same delivered page at phone width, with reduced-motion and touch input.
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  for (const scene of [0, 1]) {
    await page.goto(base + '?scene=' + scene, { waitUntil: 'load' }); await waitReady();
    await caption('phone-scene' + scene);
    check(await page.evaluate(() => __scroll.fraction() === 0), 'reduced-motion scene ' + scene + ' has no drift');
    check(await page.evaluate(() => {
      const caption = document.getElementById('scroll-caption').getBoundingClientRect();
      const edge = document.getElementById(__scroll.scene() ? 'scroll-prev' : 'scroll-next').getBoundingClientRect();
      return caption.left >= 0 && caption.right <= innerWidth && caption.bottom < edge.top && document.documentElement.scrollWidth === innerWidth;
    }), 'phone scene ' + scene + ' caption and controls fit without collision');
    check(await page.evaluate(() => __scroll.status().pixelRatio <= 1.5 && __scroll.status().pixelRatio >= .75), 'pixel ratio stays within the required range');
    const cdp = await page.createCDPSession();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 80, y: 570 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 220, y: 570 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    check(await page.evaluate(() => __scroll.fraction() > .3), 'touch scrubs reduced-motion scene ' + scene);
    report.scenes.push(await state());
  }
  await page.setViewport({ width: 640, height: 360 });
  await page.emulateMediaFeatures([]);
  await page.goto(base + '?test=paint_xuande&mode=still&w=640&h=360&spp=1', { waitUntil: 'load' }); await waitReady();
  const image = await page.evaluate(() => __renderTest()); clean();
  const buffer = Buffer.from(image.split(',')[1], 'base64'); fs.writeFileSync(path.join(out, 'after-test.png'), buffer);
  report.legacyTest = await page.evaluate(() => window.__STATS);
  check(await page.evaluate(() => !window.__scroll && !document.documentElement.hasAttribute('data-scroll')), '?test= retains legacy route');
  if (fs.existsSync(path.join(out, 'before-test.png'))) {
    const hash = b => createHash('sha256').update(b).digest('hex');
    report.stillHashes = { before: hash(fs.readFileSync(path.join(out, 'before-test.png'))), after: hash(buffer) };
    report.stillHashes.initialIdentical = report.stillHashes.before === report.stillHashes.after;
    console.log('Initial still baseline identical:', report.stillHashes.initialIdentical);
  }
  // Other agents own the painted scene and may change it during U1. Re-run the
  // original U1-owned code against the exact same delivered scene as a control.
  const control = await browser.newPage(), controlClean = observeErrors(control);
  const originals = new Map(['src/main.js', 'src/core/engine.js', 'src/paint/playback.js'].map(file =>
    [prefix + file, execFileSync('git', ['show', 'HEAD:' + file], { encoding: 'utf8' })]));
  await control.setRequestInterception(true);
  control.on('request', request => {
    const original = originals.get(new URL(request.url()).pathname);
    if (original !== undefined) request.respond({ status: 200, contentType: 'text/javascript', body: original });
    else request.continue();
  });
  await control.goto(base + '?test=paint_xuande&mode=still&w=640&h=360&spp=1', { waitUntil: 'load' });
  await control.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 120000 });
  const originalImage = await control.evaluate(() => __renderTest()); controlClean();
  const originalBuffer = Buffer.from(originalImage.split(',')[1], 'base64');
  fs.writeFileSync(path.join(out, 'original-code-test.png'), originalBuffer);
  check(buffer.equals(originalBuffer), 'legacy still is byte-identical with original U1 code against the same scene');
  await control.close();
  if (process.argv.includes('--legacy')) {
    await page.goto(base + '?world=1&w=640&h=360&tier=low', { waitUntil: 'load' }); await waitReady();
    check(await page.evaluate(() => {
      const before = __explore.position(); __explore.step(1, new Set(['w'])); const after = __explore.position();
      return !window.__scroll && Math.hypot(before[0] - after[0], before[2] - after[2]) > 3;
    }), '?world=1 retains walkable world');
    report.world = await page.evaluate(() => window.__STATS); await shot('world');
  }
  // Context loss and unavailable WebGL each provide a plain recovery message.
  await page.goto(base + '?scene=0', { waitUntil: 'load' }); await waitReady();
  await page.evaluate(() => engine.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction('!document.getElementById("scroll-error").hidden');
  check(await page.$eval('#scroll-error', el => /context was lost/.test(el.textContent)), 'context loss shows a plain message');
  clean();
  const noGL = await browser.newPage(), noGLClean = observeErrors(noGL);
  await noGL.evaluateOnNewDocument(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' ? null : original.call(this, type, ...args); };
  });
  await noGL.goto(base, { waitUntil: 'load' });
  check(await noGL.$eval('#scroll-error', el => !el.hidden && /WebGL2 is unavailable/.test(el.textContent)), 'unavailable WebGL2 shows a plain message');
  noGLClean(); await noGL.close();
  check(report.requests.every(r => r.status === 200 && !/node_modules|\/refs\//.test(r.pathname)), 'all assets resolve within the dist sub-path without node_modules');
  for (const backdrop of ['bd1', 'bd2']) {
    check(report.requests.some(r => r.pathname.endsWith('/' + backdrop + '.jpg')), backdrop + ' loads from delivery');
    check(fs.readFileSync('assets/backdrops/' + backdrop + '.jpg').equals(fs.readFileSync('dist/assets/backdrops/' + backdrop + '.jpg')), backdrop + ' delivery matches source');
  }
  console.log('PASS no console or page errors');
  report.checks.push('no console or page errors');
} catch (error) {
  report.failure = error.stack; process.exitCode = 1; console.error(error);
} finally {
  report.totalMs = Math.round(performance.now() - started);
  fs.writeFileSync(path.join(out, 'scroll-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checks: report.checks.length, totalMs: report.totalMs,
    scenes: report.scenes.map(({ scene, buildMs, firstFrameMs, status }) => ({ scene, buildMs, firstFrameMs, ...status })), failure: report.failure }));
  if (browser) {
    await Promise.race([browser.close().catch(() => {}), sleep(1500)]);
    try { browser.process()?.kill('SIGKILL'); } catch { /* closed */ }
  }
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections?.(); }); unlock();
}
