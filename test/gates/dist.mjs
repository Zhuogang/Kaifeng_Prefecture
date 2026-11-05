// Gate: the built static site works the way a visitor gets it, from a sub-path, with no node_modules. Lead-owned.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { launchBrowser } from '../../tools/browser.mjs';
const ROOT = path.resolve('dist'), SUB = '/some/sub/path/';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.bin': 'application/octet-stream', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const bad = [];
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (!u.startsWith(SUB)) { bad.push('outside sub-path: ' + u); r.writeHead(404); return r.end(); }
  let f = path.join(ROOT, u.slice(SUB.length) || 'index.html'); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { bad.push('missing: ' + u); r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
});
await new Promise((res) => srv.listen(0, '127.0.0.1', res));
const browser = await launchBrowser({ width: 640, height: 360 }); let code = 0;
const fail = (m) => { console.error('FAIL ' + m); code = 1; }, pass = (m) => console.log('PASS ' + m);
try {
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${srv.address().port}${SUB}?world=1&quality=preview&w=640&h=360`, { waitUntil: 'load', timeout: 600000 });
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 600000 });
  const err = await page.evaluate(() => window.__RENDER_ERROR); if (err) fail('render error: ' + err); else pass(`interactive in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const walked = await page.evaluate(() => { const a = window.__explore.position(); window.__explore.step(1, new Set(['w'])); const b = window.__explore.position(); return Math.hypot(a[0] - b[0], a[2] - b[2]); });
  walked > 3 ? pass('walking works') : fail('walking moved ' + walked);
  const shot = async () => page.evaluate(() => { window.engine.renderInteractive(true); return window.engine.canvas.toDataURL('image/png').length; });
  const base = await shot();
  await page.keyboard.press('KeyT'); await new Promise((r) => setTimeout(r, 400)); const timed = await shot();
  timed !== base ? pass('T changes the time of day') : fail('T changed nothing');
  await page.keyboard.press('KeyT'); await page.keyboard.press('KeyT'); await new Promise((r) => setTimeout(r, 400));
  await page.keyboard.press('KeyV'); await new Promise((r) => setTimeout(r, 400)); const evid = await shot();
  evid !== base ? pass('V changes to the evidence view') : fail('V changed nothing');
  const legend = await page.evaluate(() => document.body.innerText.toLowerCase());
  /excavated|发掘/.test(legend) ? pass('evidence legend is on the page') : fail('no evidence legend text');
  await page.keyboard.press('KeyV'); await new Promise((r) => setTimeout(r, 400));
  const usesModules = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('node_modules')).length);
  usesModules === 0 ? pass('nothing loads from node_modules') : fail(usesModules + ' requests to node_modules');
  bad.length ? fail(bad.slice(0, 5).join('; ')) : pass('every request stayed inside the sub-path and was found');
  errs.length ? fail('page errors: ' + errs.slice(0, 3).join(' | ').slice(0, 400)) : pass('no page errors');
} finally { await browser.close(); srv.close(); }
process.exitCode = code;
