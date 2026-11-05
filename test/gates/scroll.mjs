// Gate: the painted scroll as a visitor gets it, from a sub-path of a static copy of dist/. Lead-owned.
// Usage, from the repo root: node test/gates/scroll.mjs [site-root, default dist]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { launchBrowser } from '../../tools/browser.mjs';
const ROOT = path.resolve(process.argv[2] || 'dist'), SUB = '/some/sub/path/', LIMIT = 300000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css' };
const bad = [], requested = [];
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  requested.push(u);
  if (!u.startsWith(SUB)) { bad.push('outside sub-path: ' + u); r.writeHead(404); return r.end(); }
  const f = path.join(ROOT, u.slice(SUB.length) || 'index.html');
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { if (!u.endsWith('favicon.ico')) bad.push('missing: ' + u); r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
});
await new Promise((res) => server.listen(0, '127.0.0.1', res));
const base = `http://127.0.0.1:${server.address().port}${SUB}`;
const browser = await launchBrowser({ width: 960, height: 540 }); let code = 0;
const fail = (m) => { console.error('FAIL ' + m); code = 1; }, pass = (m) => console.log('PASS ' + m), check = (ok, m) => ok ? pass(m) : fail(m);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  const sceneReady = (i) => page.waitForFunction((n) => window.__scroll?.ready() && window.__scroll.scene() === n, { timeout: LIMIT }, i);
  const text = () => page.evaluate(() => document.body.innerText);

  let t0 = Date.now();
  await page.goto(base, { waitUntil: 'load', timeout: LIMIT });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('开卷') && b.offsetParent && !b.disabled), { timeout: LIMIT });
  pass(`opening is ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  check((await text()).includes('梦') && (await text()).includes('東京夢華錄'), 'opening shows the title and the source');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('开卷')).click());
  await sceneReady(0); pass('开卷 opens scene 0');

  await page.waitForFunction(() => window.__scroll.captionsVisible(), { timeout: 60000 });
  check((await text()).includes('門皆金釘朱漆'), 'scene 0 caption is the source text');
  await page.keyboard.press('KeyC'); await wait(300);
  check(!(await page.evaluate(() => window.__scroll.captionsVisible())), 'C hides captions');
  await page.keyboard.press('KeyC'); await wait(300);
  check(await page.evaluate(() => window.__scroll.captionsVisible()), 'C shows captions again');

  const pos = () => page.evaluate(() => window.engine.camera.position.toArray());
  await page.evaluate(() => window.__scroll.scrub(0)); await wait(1500); const near = await pos();
  await page.evaluate(() => window.__scroll.scrub(1)); await wait(1500); const far = await pos();
  const travel = Math.hypot(...near.map((v, i) => v - far[i]));
  check(travel >= 3, `scrubbing moves the camera along the path, ${travel.toFixed(2)} m`);
  check(Math.abs(await page.evaluate(() => window.__scroll.fraction()) - 1) < .02, 'fraction follows the scrub');
  await page.evaluate(() => window.__scroll.scrub(.5)); const held = await page.evaluate(() => window.__scroll.fraction());
  await wait(9000); const later = await page.evaluate(() => window.__scroll.fraction());
  check(Math.abs(later - held) > .001, `drift resumes after input, ${held.toFixed(3)} to ${later.toFixed(3)}`);

  await page.keyboard.press('KeyP'); await wait(1500);
  check(/fps/i.test(await text()), 'P shows the frame-rate readout');
  const status = await page.evaluate(() => window.__scroll.status());
  check([status.frameMs, status.fps, status.pixelRatio, status.calls, status.triangles].every((v) => Number.isFinite(v) && v > 0), `status reports real numbers: ${JSON.stringify(status)}`);
  check(status.calls <= 50 && status.triangles <= 1.6e6, 'scene 0 is within budget');

  await page.keyboard.press('ArrowLeft'); await wait(1500);
  check(await page.evaluate(() => window.__scroll.scene()) === 0, '← does nothing on the first scene');
  await page.keyboard.press('ArrowRight'); await sceneReady(1); pass('→ moves to scene 1');
  await page.waitForFunction(() => window.__scroll.captionsVisible(), { timeout: 60000 });
  check((await text()).includes('正對於大內御街'), 'scene 1 caption is the source text');
  const status1 = await page.evaluate(() => window.__scroll.status());
  check(status1.calls <= 50 && status1.triangles <= 1.6e6, `scene 1 is within budget: ${status1.calls} calls, ${status1.triangles} triangles`);
  await page.keyboard.press('ArrowRight'); await wait(1500);
  check(await page.evaluate(() => window.__scroll.scene()) === 1, '→ does nothing on the last scene');
  await page.keyboard.press('ArrowLeft'); await sceneReady(0); pass('← returns to scene 0');

  await page.goto(base + '?scene=1', { waitUntil: 'load', timeout: LIMIT }); await sceneReady(1);
  check(!(await text()).includes('开卷'), '?scene=1 opens directly, without the opening');

  const used = requested.filter((u) => /node_modules|\/refs\/|\/docs\/|\/test\//.test(u));
  check(!used.length, `no source-tree requests ${used.slice(0, 3).join(' ')}`);
  check(requested.some((u) => u.endsWith('bd1.jpg')) && requested.some((u) => u.endsWith('bd2.jpg')), 'both backdrops load');

  await page.goto(base + '?world=1&quality=preview&w=640&h=360', { waitUntil: 'load', timeout: LIMIT });
  await page.waitForFunction(() => window.__READY || window.__RENDER_ERROR, { timeout: 600000 });
  const worldError = await page.evaluate(() => window.__RENDER_ERROR);
  check(!worldError && await page.evaluate(() => !!window.__explore), `?world=1 still opens the old world ${worldError || ''}`);

  check(!bad.length, `every request stayed inside the sub-path and was found ${bad.slice(0, 4).join('; ')}`);
  check(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ').slice(0, 400)}`);
} catch (error) { fail(error.message); } finally { await browser.close(); server.close(); }
process.exitCode = code;
