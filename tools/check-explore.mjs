// Exercise the real controller and footprint registry in the browser, without a wall-clock input source.
import assert from 'node:assert/strict';
import { startServer } from './serve.mjs';
import { launchBrowser, observeErrors } from './browser.mjs';

const start = performance.now();
const server = await startServer(0);
let browser;
try {
  browser = await launchBrowser({ width: 480, height: 270 });
  const page = await browser.newPage();
  const assertClean = observeErrors(page);
  await page.goto(`http://127.0.0.1:${server.port}/?quality=preview&w=480&h=270`, { waitUntil: 'load' });
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 120000 });
  const error = await page.evaluate(() => window.__RENDER_ERROR);
  if (error) throw new Error(error);
  const result = await page.evaluate(() => {
    const driver = window.__explore, engine = window.engine, rows = [];
    const check = (name, condition, detail) => {
      rows.push({ name, passed: !!condition, detail });
      if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
    };
    const pos = () => driver.position();
    const step = (dt, ...keys) => driver.step(dt, new Set(keys));
    const onGround = () => Math.abs(pos()[1] - engine.groundHeight(pos()[0], pos()[2]) - 1.6) < 0.01;
    check('starts in walk mode', driver.mode() === 'walk' && onGround(), pos());
    const initial = pos();
    step(1, 'w');
    check('north at 4 m/s', Math.abs(initial[2] - pos()[2] - 4) < 1e-6, pos());
    check('no wall-clock movement', (step(0, 'w'), Math.abs(initial[2] - pos()[2] - 4) < 1e-6), pos());
    const footprint = engine.footprints.items.find((it) => it.tag === 'calibration-box');
    check('box registered', !!footprint, footprint);
    let clear = true, grounded = true;
    for (let i = 0; i < 160; i++) {
      step(0.1, 'KeyW');
      clear &&= engine.footprints.isFree(pos()[0], pos()[2], 0.3);
      grounded &&= onGround();
    }
    const face = footprint.z + footprint.hd + 0.3;
    check('never enters box; stops at face plus radius', clear && Math.abs(pos()[2] - face) < 1e-5, pos());
    check('eye follows terrain during walk', grounded, pos());
    const atWall = pos();
    step(1, 'w', 'd');
    check('slides along wall', pos()[0] > atWall[0] + 2 && Math.abs(pos()[2] - face) < 1e-5 && onGround(), pos());
    step(4, 'w', 'Shift');
    check('large boosted step cannot tunnel', engine.footprints.isFree(pos()[0], pos()[2], 0.3) && Math.abs(pos()[2] - face) < 1e-5, pos());
    const beforeBoost = pos();
    step(1, 's', 'ShiftLeft');
    check('Shift multiplies speed by five', Math.abs(pos()[2] - beforeBoost[2] - 20) < 1e-6 && onGround(), pos());
    const before = pos();
    step(0, 'f'); step(0, 'f');
    check('F toggles once while held', driver.mode() === 'fly', driver.mode());
    step(1, 'e');
    check('fly leaves ground at 40 m/s', Math.abs(pos()[1] - before[1] - 40) < 1e-6, pos());
    step(0.5, 'q');
    check('Q descends in fly mode', Math.abs(pos()[1] - before[1] - 20) < 1e-6, pos());
    driver.setMode('walk');
    check('return to walk snaps to ground', onGround(), pos());
    engine.renderInteractive(true);
    engine.renderInteractive(false);
    check('still camera accumulates', engine._accFrames === 2, engine._accFrames);
    step(0.1, 's');
    engine.renderInteractive(false);
    check('movement restarts accumulation', engine._accFrames === 1, engine._accFrames);
    return { rows, stats: { calls: engine.renderer.info.render.calls, triangles: engine.renderer.info.render.triangles } };
  });
  assertClean();
  assert(result.rows.every((row) => row.passed));
  for (const row of result.rows) console.log(`PASS ${row.name}: ${JSON.stringify(row.detail)}`);
  console.log(`[explore] ${result.rows.length} checks passed in ${((performance.now() - start) / 1000).toFixed(2)}s; ${JSON.stringify(result.stats)}`);
} catch (error) {
  console.error('[explore] FAILED:', error.stack || error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await server.close();
}
