// Gate: walking to a pose must render the same image as placing the camera there directly.
// Catches stale shadows or atmosphere state after interactive movement. Lead-owned.
import { PNG } from 'pngjs';
import { startServer } from '../../tools/serve.mjs';
import { launchBrowser } from '../../tools/browser.mjs';
const server = await startServer(0), browser = await launchBrowser({ width: 640, height: 360 });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/?quality=preview&w=640&h=360`, { waitUntil: 'load' });
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 120000 });
  const [a, b] = await page.evaluate(() => {
    const e = window.engine, cam = e.camera;
    window.__explore.step(2.5, new Set(['w', 'a']));
    e.renderInteractive(true); const moved = e.canvas.toDataURL('image/png');
    const p = cam.position.toArray(), m = cam.matrixWorld.elements;
    const target = [p[0] - m[8] * 10, p[1] - m[9] * 10, p[2] - m[10] * 10];
    e.applyShot({ id: 'direct', pos: p, target, fov: cam.fov, near: cam.near });
    e.renderInteractive(true); return [moved, e.canvas.toDataURL('image/png')];
  });
  const dec = (u) => PNG.sync.read(Buffer.from(u.split(',')[1], 'base64')).data;
  const A = dec(a), B = dec(b); let max = 0, sum = 0, bad = 0;
  for (let i = 0; i < A.length; i += 4) for (let c = 0; c < 3; c++) { const d = Math.abs(A[i + c] - B[i + c]); max = Math.max(max, d); sum += d; if (d > 8) bad++; }
  console.log(`max channel diff ${max}, mean ${(sum / (A.length * 0.75)).toFixed(3)}, channels over 8: ${bad}`);
  if (bad > A.length * 0.001) { console.error('FAILED: moved camera differs from direct placement'); process.exitCode = 1; } else console.log('PASS');
} finally { await browser.close(); await server.close(); }
