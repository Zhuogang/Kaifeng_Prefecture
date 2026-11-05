// Frame cost of each painted scene through the real scroll route, in software.
// Usage: node test/gates/perf.mjs [--out file.json] [--frames 12] [--fraction .5] [--scenes 0,1]
//
// llvmpipe is not the client's GPU. This compares versions of this project, nothing more.
// Two framebuffer sizes split the cost: `pixels` scales with resolution, `fixed` doesn't.
// llvmpipe shades vertices on one thread and pixels on many, so `fixed` is overstated
// against a real GPU. Run it with nothing else using the CPU.
import fs from 'node:fs';
import { launchBrowser, observeErrors } from '../../tools/browser.mjs';
import { startServer } from '../../tools/serve.mjs';

const option = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const frames = +option('frames', 12), fraction = +option('fraction', .5), out = option('out');
const scenes = option('scenes', '0,1').split(',').map(Number);
// The floor of the adaptive ratio: every version of the scroll settles here in software, so runs compare.
const RATIO = .75, SIZES = [[1280, 720], [320, 180]];
const server = await startServer(0), results = {};
let failed = false;

async function measure(browser, scene, [width, height]) {
  const page = await browser.newPage(), clean = observeErrors(page);
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.port}/index.html?scene=${scene}&ratio=${RATIO}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__scroll && window.__scroll.ready()', { timeout: 300000 });
  await page.waitForFunction(ratio => window.__scroll.status().pixelRatio <= ratio, { timeout: 120000 }, RATIO);
  const report = await page.evaluate(async (frames, fraction) => {
    window.__scroll.scrub(fraction);
    const tick = () => new Promise(requestAnimationFrame);
    for (let i = 0; i < 3; i++) await tick(); // Let the resize and any queued work drain.
    const start = performance.now();
    for (let i = 0; i < frames; i++) { window.__scroll.scrub(fraction); await tick(); }
    const status = window.__scroll.status();
    return { ms: (performance.now() - start) / frames, calls: status.calls, triangles: status.triangles, pixelRatio: status.pixelRatio };
  }, frames, fraction);
  clean();
  await page.close();
  return report;
}

try {
  const browser = await launchBrowser({ width: 1280, height: 720 });
  try {
    for (const scene of scenes) {
      const [large, small] = [await measure(browser, scene, SIZES[0]), await measure(browser, scene, SIZES[1])];
      const areaLarge = SIZES[0][0] * SIZES[0][1], areaSmall = SIZES[1][0] * SIZES[1][1];
      const pixels = Math.max(0, (large.ms - small.ms) * areaLarge / (areaLarge - areaSmall));
      results[scene] = { ms: +large.ms.toFixed(1), pixels: +pixels.toFixed(1), fixed: +(large.ms - pixels).toFixed(1), calls: large.calls, triangles: large.triangles, pixelRatio: large.pixelRatio };
      console.log(`scene ${scene}: ${results[scene].ms} ms at 960x540 (${results[scene].pixels} per-pixel, ${results[scene].fixed} fixed), ${large.calls} calls, ${large.triangles.toLocaleString('en-US')} triangles`);
    }
  } finally { await browser.close(); }
} catch (error) { failed = true; console.error(error); }
await server.close();
if (out) fs.writeFileSync(out, JSON.stringify({ frames, fraction, results }, null, 2) + '\n');
process.exit(failed ? 1 : 0);
