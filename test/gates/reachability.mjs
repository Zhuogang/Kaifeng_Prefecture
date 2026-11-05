// Gate: a visitor can actually walk the whole axis. Flood-fills the real footprints, stepping only where
// height changes gently, then checks each landmark is reachable. Lead-owned. Run after world modules change.
import { startServer } from '../../tools/serve.mjs';
import { launchBrowser } from '../../tools/browser.mjs';
const server = await startServer(0), browser = await launchBrowser({ width: 320, height: 180 });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/?world=1&quality=preview&w=320&h=180`, { waitUntil: 'load', timeout: 600000 });
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 600000 });
  const out = await page.evaluate(() => {
    const e = window.engine, fp = e.footprints, h = e.groundHeight, STEP = 0.5, MAXRISE = 0.45;
    const x0 = -240, x1 = 240, z0 = -420, z1 = 1320, nx = Math.ceil((x1 - x0) / STEP), nz = Math.ceil((z1 - z0) / STEP);
    const seen = new Uint8Array(nx * nz), id = (i, j) => j * nx + i, walkable = (x, z) => fp.isFree(x, z, 0.3);
    const cell = (x, z) => [Math.round((x - x0) / STEP), Math.round((z - z0) / STEP)];
    // Start on the open lane just north of 朱雀门.
    let start = null; for (const x of [100, 90, 80, 70, 110, 60, 40, 20, 0]) { const [i, j] = cell(x, 1280); if (walkable(x, 1280)) { start = [i, j]; break; } }
    if (!start) return { error: 'no free start near (x, 1280)' };
    const q = new Int32Array(nx * nz); let a = 0, b = 0; q[b++] = id(...start); seen[id(...start)] = 1;
    while (a < b) {
      const c = q[a++], i = c % nx, j = (c - i) / nx, x = x0 + i * STEP, z = z0 + j * STEP, hc = h(x, z);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
        const n = id(ni, nj); if (seen[n]) continue;
        const X = x0 + ni * STEP, Z = z0 + nj * STEP;
        if (!walkable(X, Z) || Math.abs(h(X, Z) - hc) > MAXRISE) continue;
        seen[n] = 1; q[b++] = n;
      }
    }
    // Reached if any cell within 6 m of the landmark was flooded.
    const near = (x, z, r = 6) => { for (let dz = -r; dz <= r; dz += STEP) for (let dx = -r; dx <= r; dx += STEP) { const [i, j] = cell(x + dx, z + dz); if (i >= 0 && j >= 0 && i < nx && j < nz && seen[id(i, j)]) return true; } return false; };
    const marks = { 'avenue centre road, south of the bridge': [0, 900], 'east lane under the 御廊': [140, 800], '州桥 south end': [0, 425], '州桥 deck': [0, 400], '州桥 north end': [0, 375], 'avenue north of the bridge': [0, 200], '宣德楼 forecourt': [0, 25], 'through the gate, north side': [0, -20], '大庆门': [0, -180], '大庆殿 court': [0, -260], '大庆殿 terrace front': [0, -300] };
    return { flooded: b, start: [x0 + start[0] * STEP, z0 + start[1] * STEP], marks: Object.fromEntries(Object.entries(marks).map(([k, [x, z]]) => [k, near(x, z)])) };
  });
  if (out.error) { console.error('FAILED:', out.error); process.exitCode = 1; }
  else {
    console.log(`flooded ${out.flooded} cells from ${out.start}`);
    for (const [k, v] of Object.entries(out.marks)) { console.log(`${v ? 'PASS' : 'FAIL'} ${k}`); if (!v) process.exitCode = 1; }
  }
} finally { await browser.close(); await server.close(); }
