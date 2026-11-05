// Baseline the existing painted test route, including its first displayed frame.
import fs from 'node:fs';
import { launchBrowser, observeErrors } from '../browser.mjs';
import { startServer } from '../serve.mjs';
const server = await startServer(0);
let browser;
try {
  browser = await launchBrowser({ width: 640, height: 360 });
  const page = await browser.newPage(), clean = observeErrors(page);
  await page.evaluateOnNewDocument(() => {
    let engine;
    Object.defineProperty(window, 'engine', { get: () => engine, set(value) {
      engine = value;
      const render = value.renderInteractive.bind(value);
      value.renderInteractive = (...args) => {
        const result = render(...args);
        if (!window.__FIRST_FRAME) {
          value.renderer.getContext().finish();
          window.__FIRST_FRAME = performance.now();
        }
        return result;
      };
    }});
  });
  await page.goto(`http://127.0.0.1:${server.port}/index.html?test=paint_xuande&w=640&h=360&tier=high`, { waitUntil: 'load' });
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 900000 });
  clean();
  const report = await page.evaluate(() => ({ ...window.__STATS, firstFrameMs: Math.round(window.__FIRST_FRAME), gpu: window.__GPU_INFO }));
  fs.writeFileSync('out/U1/before-profile.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  if (browser) await browser.close();
  await server.close();
}
