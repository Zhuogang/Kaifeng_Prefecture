import { createEngine } from './core/engine.js';
import { getQuality } from './core/quality.js';
import { Explore } from './core/explore.js';
import { SHOTS } from './world/shots.js';

const P = new URLSearchParams(location.search);

async function boot() {
  const interactive = (P.get('mode') || 'interactive') === 'interactive';
  const quality = getQuality(P.get('quality') || 'preview');
  if (P.has('spp')) quality.spp = Number(P.get('spp'));
  const width = Number(P.get('w')) || (interactive ? innerWidth : 1672);
  const height = Number(P.get('h')) || (interactive ? innerHeight : 941);
  if (interactive) document.body.classList.add('interactive');
  const t0 = performance.now();
  const engine = await createEngine({ width, height, quality, params: P });
  window.engine = engine;
  let testShot;
  if (P.has('test')) {
    const name = P.get('test');
    if (!/^[a-z][a-z0-9_-]*$/.test(name)) throw new Error('invalid module name');
    const mod = await import(`./modules/${name}.js`);
    const result = await mod.test(engine);
    const view = Number(P.get('view') || 0);
    if (!result?.views?.[view]) throw new Error(`no view ${view} in ${name}`);
    testShot = { id: `test-${name}-${view}`, ...result.views[view] };
  } else {
    const { buildWorld } = await import('./world/index.js');
    await buildWorld(engine);
  }
  engine.prepareScene();
  const buildMs = Math.round(performance.now() - t0);
  window.__STATS = { buildMs };
  console.log(`[main] world built in ${buildMs} ms`);
  document.getElementById('loading')?.remove();

  const shotById = (id) => {
    const shot = SHOTS.find((s) => String(s.id) === String(id));
    if (!shot) throw new Error('unknown shot ' + id);
    return shot;
  };
  window.__SHOTS = SHOTS;
  window.__renderShotObj = async (shot, spp) => {
    engine.applyShot(shot);
    return engine.renderStill(spp ?? quality.spp);
  };
  window.__renderShot = (id) => window.__renderShotObj(shotById(id));
  window.__renderTest = () => {
    if (!testShot) throw new Error('no module test requested');
    return window.__renderShotObj(testShot);
  };
  engine.applyShot(testShot || shotById(P.get('shot') || 1));
  const tc = performance.now();
  await engine.renderer.compileAsync(engine.scene, engine.camera);
  console.log(`[main] shaders compiled in ${Math.round(performance.now() - tc)} ms`);
  if (interactive) startInteractive(engine);
  window.__READY = true;
}

function startInteractive(engine) {
  const controls = new Explore(engine);
  window.__explore = {
    step: (dtSeconds, keys) => controls.step(dtSeconds, keys),
    position: () => controls.position(), mode: () => controls.mode(), setMode: (mode) => controls.setMode(mode),
  };
  const hud = document.createElement('div');
  hud.id = 'hud'; document.body.appendChild(hud);
  let previous;
  const loop = (now) => {
    const dt = previous === undefined ? 0 : Math.min((now - previous) / 1000, 0.1);
    previous = now;
    controls.step(dt, controls.keys);
    let moving = controls.consumeMovement();
    if (P.get('animate') === '1') { engine.setTime(engine.time + dt); moving = true; }
    engine.renderInteractive(moving);
    const p = engine.camera.position, info = engine.renderer.info.render;
    hud.textContent = `${controls.mode()} · ${engine.quality.name} · samples ${engine._accFrames}\n` +
      `position ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)} m\n` +
      `calls ${info.calls} · triangles ${info.triangles.toLocaleString('en-US')}\n` +
      'click to look · WASD move · F walk/fly · E/Q up/down · Shift 5× · Esc release';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((error) => {
  window.__RENDER_ERROR = error.stack || error.message || String(error);
  console.error(window.__RENDER_ERROR);
});
