// P2's focused visual validation. Uses the same browser/server as tools/render.mjs;
// approved backdrop, motion and pass budgets; no test changes. Run from the repository root.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { launchBrowser, observeErrors } from '../browser.mjs';
import { startServer } from '../serve.mjs';

const out = path.resolve('out/P2');
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let lock;
for (;;) {
  for (let i = 0; i < Number(process.env.GPU_SLOTS || 2); i++) {
    const candidate = path.resolve(`out/.gpu.lock.${i}`);
    try {
      const fd = fs.openSync(candidate, 'wx');
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, args: 'P2 capture' })); fs.closeSync(fd);
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
const server = await startServer(0);
let browser;
try {
  browser = await launchBrowser({ width: 1920, height: 1080 });
  const page = await browser.newPage(), clean = observeErrors(page);
  const metrics = { gpu: null, views: [], warnings: [] };
  page.on('console', message => { if (message.type() === 'warning') metrics.warnings.push(message.text()); });
  const url = `http://127.0.0.1:${server.port}/index.html?test=paint_zhouqiao&view=0&mode=still&quality=high&w=1920&h=1080&spp=4`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 900000 });
  const error = await page.evaluate(() => window.__RENDER_ERROR);
  if (error) throw new Error(error);
  clean();
  metrics.gpu = await page.evaluate(() => window.__GPU_INFO);
  console.log('[P2] ready:', metrics.gpu);
  const save = (name, data) => {
    const buffer = Buffer.from(data.split(',')[1], 'base64');
    fs.writeFileSync(path.join(out, name), buffer); return buffer;
  };
  const capture = async (view, spp, name) => {
    const start = performance.now();
    const { image, stats } = await page.evaluate(async (index, samples) => {
      engine.applyShot({ id: `P2-${index}`, ...engine.registry.paint.views[index] });
      const image = await engine.renderStill(samples);
      const reflection=engine.registry.paint.reflection;
      return { image, stats: {...window.__STATS,reflection:{...reflection.lastStats,width:reflection.width,height:reflection.height}} };
    }, view, spp);
    clean();
    const buffer = save(name, image);
    metrics.views.push({ view, name, ...stats, wallMs: Math.round(performance.now() - start) });
    console.log('[P2]', name, JSON.stringify(stats));
    return buffer;
  };
  await capture(0, 4, 'view0.png');
  const before = await capture(0, 1, 'single.png');
  for (let i = 1; i <= 8; i++) await capture(i, 1, `view${i}.png`);
  const after = await capture(0, 1, 'repeat.png');
  const digest = b => createHash('sha256').update(b).digest('hex');
  metrics.determinism = { identical: before.equals(after), before: digest(before), after: digest(after) };
  if (!metrics.determinism.identical) throw new Error('P2 repeated frame differs');

  metrics.passTiming = await page.evaluate(async () => {
    engine.applyShot({ id: 'P2-profile', ...engine.registry.paint.views[0] });
    const renderer = engine.renderer, gl = renderer.getContext(), pipeline=engine.pipeline;
    const samples = { reflection:[], scene: [], accumulation: [], glowDown:[], glowBlur:[], output: [] };
    const reflection=engine.registry.paint.reflection,water=reflection.water,hook=water.onBeforeRender;
    const wait = async sync => {
      let status;
      do {
        status = gl.clientWaitSync(sync, 0, 0);
        if(status===gl.WAIT_FAILED)throw new Error('P2 timing fence failed');
        if(status===gl.TIMEOUT_EXPIRED)await new Promise(resolve=>setTimeout(resolve,2));
      } while(status===gl.TIMEOUT_EXPIRED);
      gl.deleteSync(sync);
    };
    engine.renderInteractive(true);
    const warm = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0); gl.flush(); await wait(warm);
    // Submit each real pass separately so Chromium cannot batch all three fence
    // completions into one polling interval. Includes 2 ms fence polling overhead.
    const measure=async(key,draw)=>{
      const start=performance.now(); draw();
      const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0); gl.flush(); await wait(sync);
      samples[key].push(performance.now()-start);
    };
    try{for(let i=0;i<5;i++){
      await measure('reflection',()=>hook.call(water,renderer,engine.scene,engine.camera));
      water.onBeforeRender=()=>{};
      await measure('scene',()=>{
        renderer.setRenderTarget(pipeline.sceneRT); renderer.clear(true,true,false);
        renderer.render(engine.scene,engine.camera);
      });
      await measure('accumulation',()=>{
        const uniforms=pipeline.copyMat.uniforms, dst=1-pipeline.accIndex;
        uniforms.uAO.value=0; uniforms.uNearFar.value.set(engine.camera.near,engine.camera.far);
        uniforms.tNew.value=pipeline.sceneRT.texture;
        uniforms.tPrev.value=pipeline.acc[pipeline.accIndex].texture; uniforms.uW.value=1;
        pipeline.quad.material=pipeline.copyMat;
        renderer.setRenderTarget(pipeline.acc[dst]); pipeline.quad.render(renderer);
        pipeline.accIndex=dst; pipeline.count=1;
      });
      await measure('glowDown',()=>engine.registry.paint.outputStages.downsample());
      await measure('glowBlur',()=>engine.registry.paint.outputStages.soften());
      await measure('output',()=>engine.registry.paint.outputStages.output(null));
    }}finally{water.onBeforeRender=hook;}
    const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
    return { device: 'llvmpipe, fenced wall time; not a Radeon 780M benchmark',
      passes: engine.registry.paint.passes,reflectionSize:[reflection.width,reflection.height],glowSize:[engine.registry.paint.wash[0].width,engine.registry.paint.wash[0].height],
      milliseconds: Object.fromEntries(Object.entries(samples).map(([key, values]) => [key, { mean: +mean(values).toFixed(2), samples: values.map(x => +x.toFixed(2)) }])) };
  });

  const sheet = new PNG({ width: 3840, height: 1080 });
  for (let i = 1; i <= 8; i++) {
    const frame = PNG.sync.read(fs.readFileSync(path.join(out, `view${i}.png`)));
    const ox = ((i - 1) % 4) * 960, oy = Math.floor((i - 1) / 4) * 540;
    for (let y = 0; y < 540; y++) for (let x = 0; x < 960; x++) for (let c = 0; c < 4; c++) {
      let value = 0;
      for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) value += frame.data[((y * 2 + yy) * 1920 + x * 2 + xx) * 4 + c];
      sheet.data[((y + oy) * 3840 + x + ox) * 4 + c] = Math.round(value / 4);
    }
  }
  fs.writeFileSync(path.join(out, 'motion.png'), PNG.sync.write(sheet));

  // Exercise the module's real page playback, independently of the still captures.
  await page.goto(url.replace('w=1920&h=1080', 'w=640&h=360').replace('mode=still','mode=interactive') + '&tier=high&drift=1', { waitUntil: 'load' });
  await page.waitForFunction('window.__READY || window.__RENDER_ERROR', { timeout: 900000 });
  await page.waitForFunction('window.engine?.time > .4', { timeout: 60000 });
  metrics.drift = await page.evaluate(async () => {
    const {paintView}=await import('/src/modules/paint_zhouqiao.js');
    const fraction=.5-.5*Math.cos(engine.time*Math.PI/24), expected=paintView(fraction).pos;
    const position=engine.camera.position.toArray();
    return { time: engine.time, position, cameraError:Math.max(...position.map((v,i)=>Math.abs(v-expected[i]))),
      ao:engine.quality.ao, samplesPerFrame: engine.pipeline.count, passes: engine.registry.paint.passes,reflection:engine.registry.paint.reflection.lastStats,
      calls: engine.renderer.info.render.calls, triangles: engine.renderer.info.render.triangles };
  });
  if(metrics.drift.cameraError>1e-6 || metrics.drift.ao || metrics.drift.samplesPerFrame!==1)
    throw new Error('P2 interactive playback changed the authored camera or pass budget');
  if(metrics.views.some(v=>v.calls>40||v.triangles>1200000)||metrics.drift.calls>40||metrics.drift.triangles>1200000)
    throw new Error('P2 exceeds its moving frame budget, including reflection');
  save('drift.png', await page.evaluate(() => engine.canvas.toDataURL('image/png')));
  clean();
  fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  console.log('[P2] deterministic:', metrics.determinism.identical, 'passes:', JSON.stringify(metrics.passTiming), 'drift:', JSON.stringify(metrics.drift));
} finally {
  if (browser) {
    await Promise.race([browser.close().catch(() => {}), sleep(1500)]);
    try { browser.process()?.kill('SIGKILL'); } catch { /* already closed */ }
  }
  await server.close(); unlock();
}
