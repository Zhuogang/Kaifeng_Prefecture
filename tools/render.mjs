// Headless GPU render harness.
//
// Examples:
//   node tools/render.mjs --shot 3                       → out/shot3.png (+ out/shot3_cmp.png side-by-side with refs/generated/ref3.png)
//   node tools/render.mjs --shot 1,2,3,4,5,6,7,8,9 --quality high --spp 16
//   node tools/render.mjs --test ground --view 0 --out out/test_ground.png
//   node tools/render.mjs --shot 5 --params "debug=normals&sunEl=25"
//
// Options:
//   --shot <ids>      comma list of shot ids (see src/world/shots.js), or "all"
//   --test <module>   render a module in isolation (src/modules/<module>.js) inside the neutral test scene
//   --view <n>        which test view (module's test(engine).views[n])
//   --quality <q>     preview | high | ultra   (default: preview)
//   --spp <n>         accumulated samples per pixel (default from quality)
//   --w --h           output size (default 1672x941 = reference size)
//   --out <file>      output png path (single shot/test only)
//   --params <qs>     extra URL query params passed to the page
//   --nocompare       skip writing the side-by-side comparison image
//   --timeout <sec>   page timeout (default 900)
//
// A GPU lock (out/.gpu.lock) serialises renders across concurrent processes/agents.
import { launchBrowser, observeErrors } from './browser.mjs';
import { SHOTS } from '../src/world/shots.js';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}
const args = parseArgs(process.argv);
const quality = args.quality || 'preview';
const W = Number(args.w || 1672), H = Number(args.h || 941);
const timeoutMs = Number(args.timeout || 900) * 1000;

// ---------------------------------------------------------------- GPU lock
const LOCK_SLOTS = Number(process.env.GPU_SLOTS || 2);
let LOCK = path.join(OUT, '.gpu.lock.0');
const LOCK_STALE_MS = 20 * 60 * 1000;
async function acquireLock() {
  const t0 = Date.now();
  let warned = false;
  for (;;) {
    let gotIt = false;
    for (let s = 0; s < LOCK_SLOTS && !gotIt; s++) {
      const p = path.join(OUT, '.gpu.lock.' + s);
      try {
        const fd = fs.openSync(p, 'wx');
        fs.writeSync(fd, JSON.stringify({ pid: process.pid, time: Date.now(), args: process.argv.slice(2).join(' ') }));
        fs.closeSync(fd);
        LOCK = p; gotIt = true;
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        try {
          const st = fs.statSync(p);
          let pidAlive = true;
          try { const info = JSON.parse(fs.readFileSync(p, 'utf8')); process.kill(info.pid, 0); } catch { pidAlive = false; }
          if (!pidAlive || Date.now() - st.mtimeMs > LOCK_STALE_MS) fs.rmSync(p, { force: true });
        } catch { /* raced */ }
      }
    }
    if (gotIt) return;
    {
      if (!warned) { console.log('[render] waiting for GPU lock...'); warned = true; }
      if (Date.now() - t0 > 60 * 60 * 1000) throw new Error('GPU lock wait timeout');
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}
function releaseLock() {
  try {
    const info = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
    if (info.pid === process.pid) fs.rmSync(LOCK, { force: true });
  } catch { /* ignore */ }
}
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(130); });

// ---------------------------------------------------------------- compare image
function writeCompare(refPng, renderPng, outPng) {
  if (!fs.existsSync(refPng)) return;
  try {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', refPng, '-i', renderPng, '-filter_complex',
      '[0]scale=-2:540[a];[1]scale=-2:540[b];[a][b]hstack', outPng]);
  } catch (e) { console.log('[render] compare skipped:', e.code === 'ENOENT' ? 'ffmpeg unavailable' : e.message); }
}

// ---------------------------------------------------------------- main
async function main() {
  const server = await startServer(0);
  let browser;
  const t0 = Date.now();
  try {
    await acquireLock();
    browser = await launchBrowser({ width: W, height: H, timeout: timeoutMs });
    const page = await browser.newPage();
    const assertClean = observeErrors(page);
    page.on('console', (m) => {
      const t = m.text();
      if (t.includes('[vite]')) return;
      console.log(`[page:${m.type()}] ${t}`);
    });
    page.on('pageerror', (e) => console.log('[page:error]', e.message, e.stack || ''));
    page.on('requestfailed', (r) => console.log('[page:reqfail]', r.url(), r.failure()?.errorText));

    const qs = new URLSearchParams(args.params || '');
    qs.set('quality', quality);
    qs.set('w', String(W)); qs.set('h', String(H));
    qs.set('mode', 'still');
    if (args.spp) qs.set('spp', String(args.spp));

    let jobs = [];
    if (args.test) {
      qs.set('test', args.test);
      if (args.view !== undefined) qs.set('view', String(args.view));
      const out = args.out ? path.resolve(args.out) : path.join(OUT, `test_${args.test}${args.view !== undefined ? '_v' + args.view : ''}.png`);
      jobs.push({ kind: 'test', out });
    } else {
      let ids = String(args.shot || '1');
      if (ids === 'all') ids = SHOTS.map((s) => s.id).join(',');
      for (const id of ids.split(',')) {
        const out = args.out && !ids.includes(',') ? path.resolve(args.out) : path.join(OUT, `shot${id}.png`);
        jobs.push({ kind: 'shot', id, out });
      }
      qs.set('shot', jobs[0].id);
    }

    const url = `http://127.0.0.1:${server.port}/index.html?${qs.toString()}`;
    console.log('[render] loading', url);
    await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
    await page.waitForFunction('window.__READY === true || !!window.__RENDER_ERROR', { timeout: timeoutMs, polling: 250 });
    const err0 = await page.evaluate(() => window.__RENDER_ERROR || null);
    if (err0) throw new Error('page error: ' + err0);
    const gpu = await page.evaluate(() => window.__GPU_INFO || '?');
    assertClean();
    console.log('[render] GPU:', gpu, `| build ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    for (const job of jobs) {
      const t1 = Date.now();
      const dataUrl = await page.evaluate(async (job) => {
        if (job.kind === 'shot') return await window.__renderShot(job.id);
        return await window.__renderTest();
      }, job);
      assertClean();
      const stats = await page.evaluate(() => window.__STATS);
      console.log('[render] stats', JSON.stringify(stats));
      if (!dataUrl || !dataUrl.startsWith('data:image/png')) throw new Error('no image returned for ' + JSON.stringify(job));
      fs.mkdirSync(path.dirname(job.out), { recursive: true });
      fs.writeFileSync(job.out, Buffer.from(dataUrl.split(',')[1], 'base64'));
      console.log(`[render] wrote ${path.relative(ROOT, job.out)} in ${((Date.now() - t1) / 1000).toFixed(1)}s`);
      if (job.kind === 'shot' && !args.nocompare) {
        const cmp = job.out.replace(/\.png$/i, '_cmp.png');
        writeCompare(path.join(ROOT, 'refs', 'generated', `ref${job.id}.png`), job.out, cmp);
        if (fs.existsSync(cmp)) console.log(`[render] compare ${path.relative(ROOT, cmp)}`);
      }
    }
  } finally {
    const tc = Date.now();
    if (browser) await Promise.race([browser.close().catch(() => {}), new Promise((res) => setTimeout(res, 1500))]);
    try { browser?.process()?.kill('SIGKILL'); } catch {}
    console.log('[render] browser closed in', ((Date.now() - tc) / 1000).toFixed(1) + 's');
    await server.close();
    releaseLock();
    console.log(`[render] total ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}

main().catch((e) => { console.error('[render] FAILED:', e.message); releaseLock(); process.exit(1); });
