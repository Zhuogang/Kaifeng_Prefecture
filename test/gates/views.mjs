// Gate: 州桥's authored views, through the real scroll page. Lead-owned.
//   node test/gates/views.mjs --baseline   records the approved view 1 and 宣德楼 in out/V0/
//   node test/gates/views.mjs [out-dir]    checks every view; contact sheets go to out-dir (default out/V1)
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { launchBrowser, observeErrors } from '../../tools/browser.mjs';
import { startServer } from '../../tools/serve.mjs';
const W = 1280, H = 720, CELL = 4, FRACTIONS = [0, .5, 1], BASE = 'out/V0';
const CORNERS = [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const baselineMode = process.argv[2] === '--baseline', OUT = baselineMode ? BASE : (process.argv[2] || 'out/V1');
fs.mkdirSync(OUT, { recursive: true });
const server = await startServer(0), browser = await launchBrowser({ width: W, height: H });
let code = 0;
const fail = m => { console.error('FAIL ' + m); code = 1; }, pass = m => console.log('PASS ' + m), check = (ok, m) => ok ? pass(m) : fail(m);
const wait = ms => new Promise(r => setTimeout(r, ms));
const url = q => `http://127.0.0.1:${server.port}/index.html?${q}`;
const STOP = () => {
  const raf = requestAnimationFrame.bind(window), ids = [];
  window.requestAnimationFrame = fn => { const id = raf(fn); ids.push(id); return id; };
  window.__stopRAF = () => { ids.forEach(cancelAnimationFrame); window.requestAnimationFrame = () => 0; };
};
const openStill = async query => {
  const page = await browser.newPage(), clean = observeErrors(page);
  await page.evaluateOnNewDocument(STOP);
  await page.goto(url(query), { timeout: 120000 });
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 300000 });
  const error = await page.evaluate(() => window.__RENDER_ERROR);
  if (error) throw new Error(error);
  await page.evaluate(() => window.__stopRAF());
  return { page, clean };
};
// One frame from view `index` (null: the scene's only path) at fraction f and a look corner.
const shoot = async (page, index, f, corner) => {
  const r = await page.evaluate(async (index, f, corner) => {
    const { paintCamera, LOOK_YAW, LOOK_PITCH } = await import('./src/paint/playback.js');
    const e = window.engine, paint = e.registry.paint, viewAt = index === null ? (paint.viewSet?.[0].viewAt ?? paint.viewAt) : paint.viewSet[index].viewAt;
    e.setTime(0); paintCamera(e, viewAt, f, corner[0] * LOOK_YAW, corner[1] * LOOK_PITCH);
    const data = await e.renderStill(1), info = e.renderer.info.render;
    return { data, calls: info.calls, triangles: info.triangles };
  }, index, f, corner);
  return { ...r, bytes: Buffer.from(r.data.split(',')[1], 'base64') };
};
const nearBlack = p => { let n = 0; for (let i = 0; i < p.data.length; i += 4) if (p.data[i] <= 6 && p.data[i + 1] <= 6 && p.data[i + 2] <= 6) n++; return n / (p.width * p.height) * 100; };
const compare = (a, b, limit) => { let n = 0; for (let i = 0; i < a.data.length; i += 4) { const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])); if (d > limit) n++; } return n / (a.width * a.height) * 100; };
const shrink = (p, x0, y0, sheet) => { const w = p.width / CELL | 0, h = p.height / CELL | 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let s = 0; for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) s += p.data[((y * CELL + j) * p.width + x * CELL + i) * 4 + c]; sheet.data[((y0 + y) * sheet.width + x0 + x) * 4 + c] = s / (CELL * CELL); sheet.data[((y0 + y) * sheet.width + x0 + x) * 4 + 3] = 255; } };
try {
  if (baselineMode) {
    for (const scene of [0, 1]) {
      const { page, clean } = await openStill(`scene=${scene}&ratio=1`);
      for (const f of FRACTIONS) { fs.writeFileSync(`${BASE}/scene${scene}-f${f}.png`, (await shoot(page, null, f, [0, 0])).bytes); clean(); }
      await page.close();
    }
    console.log(`baseline written to ${BASE}`);
  } else {
    // 宣德楼 stays as approved. 州桥's look is being changed on the client's request, so it's judged by eye.
    for (const [scene, limit, share] of [[0, 2, .05]]) {
      const { page, clean } = await openStill(`scene=${scene}&ratio=1`);
      for (const f of FRACTIONS) {
        const now = PNG.sync.read((await shoot(page, null, f, [0, 0])).bytes), before = PNG.sync.read(fs.readFileSync(`${BASE}/scene${scene}-f${f}.png`)), changed = compare(now, before, limit);
        check(changed <= share, `scene ${scene} at fraction ${f} matches its baseline: ${changed.toFixed(3)}% of pixels differ by more than ${limit} (limit ${share}%)`);
        clean();
      }
      if (scene === 0) {
        const n = await page.evaluate(() => window.__scroll.views().length);
        check(n === 1, `宣德楼 has one view, reports ${n}`);
      }
      await page.close();
    }
    // Every view, at every fraction and look corner: no holes, within budget.
    const { page, clean } = await openStill('scene=1&ratio=1');
    const views = await page.evaluate(() => window.engine.registry.paint.viewSet.map(v => { const a = v.viewAt(0), b = v.viewAt(1); return { name: v.name, gloss: v.gloss, roundTrip: v.roundTrip, travel: Math.hypot(...a.pos.map((c, i) => c - b.pos[i])) }; }));
    check(views.length === 7, `州桥 has 7 views: ${views.map(v => v.name).join(' ')}`);
    for (const [index, v] of views.entries()) {
      const speed = v.travel / (v.roundTrip / 2);
      check(v.travel > .2 && speed <= .2, `${v.name} drifts gently: ${v.travel.toFixed(2)} m at ${speed.toFixed(3)} m/s`);
      const sheet = new PNG({ width: (W / CELL | 0) * CORNERS.length, height: (H / CELL | 0) * FRACTIONS.length });
      let worst = 0, maxCalls = 0, maxTriangles = 0;
      for (const [row, f] of FRACTIONS.entries()) for (const [col, corner] of CORNERS.entries()) {
        const r = await shoot(page, index, f, corner), p = PNG.sync.read(r.bytes);
        clean(); worst = Math.max(worst, nearBlack(p)); maxCalls = Math.max(maxCalls, r.calls); maxTriangles = Math.max(maxTriangles, r.triangles);
        shrink(p, col * (W / CELL | 0), row * (H / CELL | 0), sheet);
        if (f === 0 && col === 0) fs.writeFileSync(`${OUT}/view${index + 1}.png`, r.bytes);
        if (f === 1 && col === 0) fs.writeFileSync(`${OUT}/view${index + 1}-end.png`, r.bytes);
      }
      fs.writeFileSync(`${OUT}/view${index + 1}-sheet.png`, PNG.sync.write(sheet));
      check(worst <= .05, `${v.name} has no holes: worst frame ${worst.toFixed(3)}% near-black`);
      check(maxCalls <= 50 && maxTriangles <= 1.6e6, `${v.name} is within budget: ${maxCalls} calls, ${maxTriangles} triangles`);
    }
    await page.close();
    // The controls, live.
    const live = await browser.newPage(), errors = [];
    live.on('pageerror', e => errors.push(e.message)); live.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
    await live.goto(url('scene=1&view=6'), { timeout: 120000 });
    await live.waitForFunction('window.__scroll?.ready()', { timeout: 300000 });
    await wait(1500);
    check(await live.evaluate(() => window.__scroll.status().view) === 5, '?view=6 opens the sixth view');
    await live.evaluate(() => { window.__sameDocument = true; });
    const onPath = () => live.evaluate(() => { const s = window.__scroll, v = window.engine.registry.paint.viewSet[s.status().view].viewAt(s.fraction()), c = window.engine.camera.position; return Math.hypot(c.x - v.pos[0], c.y - v.pos[1], c.z - v.pos[2]); });
    for (const key of ['1', '2', '3', '4', '5', '6', '7']) {
      await live.keyboard.press('Digit' + key); await wait(2500);
      const now = await live.evaluate(() => window.__scroll.status());
      check(now.view === +key - 1 && await onPath() < .5, `key ${key} moves to view ${key}: ${views[+key - 1]?.name}`);
      check(now.calls <= 50 && now.triangles <= 1.6e6, `view ${key} live: ${now.calls} calls, ${now.triangles} triangles`);
    }
    const buttons = await live.evaluate(() => [...document.querySelectorAll('[data-view]')].filter(b => b.offsetParent).map(b => b.textContent));
    check(buttons.length === 7, `the on-screen list shows 7 views: ${buttons.join(' | ')}`);
    await live.evaluate(() => document.querySelector('[data-view="2"]').click()); await wait(2500);
    check(await live.evaluate(() => window.__scroll.status().view) === 2, 'clicking the list changes view');
    check(await live.evaluate(() => { const f = document.getElementById('scroll-fade'); return !f || f.hidden || getComputedStyle(f).opacity === '0'; }), 'the fade has cleared');
    check(await live.evaluate(() => window.__sameDocument === true), 'changing view does not reload the page');
    const held = await live.evaluate(() => window.__scroll.fraction()); await wait(9000);
    check(await live.evaluate(() => window.__scroll.fraction()) !== held, 'the new view drifts');
    await live.goto(url('scene=0'), { timeout: 120000 });
    await live.waitForFunction('window.__scroll?.ready()', { timeout: 300000 }); await wait(1000);
    await live.keyboard.press('Digit3'); await wait(500);
    check(await live.evaluate(() => window.__scroll.status().view) === 0, 'number keys do nothing on 宣德楼');
    check(await live.evaluate(() => ![...document.querySelectorAll('[data-view]')].some(b => b.offsetParent)), '宣德楼 shows no view list');
    check(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ')}`);
    await live.close();
  }
} catch (e) { fail(e.stack || e.message); } finally { await browser.close(); await server.close(); }
process.exit(code);
