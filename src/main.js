import { createEngine } from './core/engine.js';
import { getQuality } from './core/quality.js';
import { Explore } from './core/explore.js';
import { LoadingScreen, loadWorld, installModuleCulling } from './core/loader.js';
import { TierController, TIERS } from './core/tiers.js';
import { EvidenceView } from './core/evidence.js';
import { SHOTS } from './world/shots.js';
import { installTimePresets, TIME_NAMES } from './world/looks.js';

const P = new URLSearchParams(location.search);
const loading = new LoadingScreen();
let contextLost = false;

async function boot() {
  const interactive = (P.get('mode') || 'interactive') === 'interactive';
  const quality = getQuality(P.get('quality') || 'preview');
  const tier = P.get('tier');
  if (tier && tier !== 'auto' && !TIERS[tier]) throw new Error(`Unknown tier: ${tier}. Use low, medium, high or auto.`);
  if (interactive || tier) Object.assign(quality, TIERS[tier] || TIERS.medium);
  if (P.has('spp')) quality.spp = Number(P.get('spp'));
  const width = Number(P.get('w')) || (interactive ? innerWidth : 1672);
  const height = Number(P.get('h')) || (interactive ? innerHeight : 941);
  if (interactive) document.body.classList.add('interactive');
  const t0 = performance.now();
  await loading.show('开城 · Opening the city', 0, 1, 'Preparing light and sky');
  const te = performance.now();
  const engine = await createEngine({ width, height, quality, params: P });
  const engineMs = Math.round(performance.now() - te);
  engine.canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true;
    window.__READY = false;
    const error = new Error('The graphics context was lost. Reload this page to reopen the city; try ?tier=low if it happens again.');
    window.__RENDER_ERROR = error.message; loading.fail(error);
  });
  installTimePresets(engine, P.get('time') || 'morning');
  window.engine = engine;
  let testShot, delivery = { timings: [], total: 4 };
  if (P.has('test')) {
    const name = P.get('test');
    if (!/^[a-z][a-z0-9_-]*$/.test(name)) throw new Error('invalid module name');
    await loading.show(name, 1, 4, 'Building the module');
    const mod = await import(`./modules/${name}.js`);
    const result = await mod.test(engine);
    const view = Number(P.get('view') || 0);
    if (!result?.views?.[view]) throw new Error(`no view ${view} in ${name}`);
    testShot = { id: `test-${name}-${view}`, ...result.views[view] };
  } else {
    delivery = await loadWorld(engine, loading);
    installModuleCulling(engine, delivery.roots);
  }
  await loading.show('光影 · Preparing light', delivery.total - 2, delivery.total, 'Materials and atmospheric light');
  const tp = performance.now();
  engine.prepareScene();
  const prepareMs = Math.round(performance.now() - tp);
  const buildMs = Math.round(performance.now() - t0);
  window.__STATS = { buildMs, engineMs, prepareMs,
    moduleBuildMs: delivery.timings.reduce((sum, m) => sum + m.buildMs, 0), modules: delivery.timings };
  console.log(`[main] world built in ${buildMs} ms`);

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
  const tv = performance.now();
  engine.applyShot(testShot || shotById(P.get('shot') || 1));
  window.__STATS.initialViewMs = Math.round(performance.now() - tv);
  let tiers;
  if (interactive || tier) tiers = new TierController(engine, { tier, width, height });
  window.__delivery = {
    tier: () => tiers?.status() || null,
    setTier: name => {
      if (!tiers) throw new Error('Tier control requires interactive mode or ?tier=');
      return tiers.set(name);
    },
    modules: () => delivery.timings,
    culling: () => engine.registry.delivery?.culling || [],
  };
  await loading.show('成像 · Preparing the view', delivery.total - 1, delivery.total, 'Compiling materials');
  const tc = performance.now();
  await engine.renderer.compileAsync(engine.scene, engine.camera);
  const compileMs = Math.round(performance.now() - tc);
  console.log(`[main] shaders compiled in ${compileMs} ms`);
  engine.evidence = new EvidenceView(engine);
  if (P.get('evidence') === '1') engine.evidence.setEnabled(true);
  await loading.show('东京梦华 · Ready', delivery.total, delivery.total, 'The city is ready');
  if (interactive) startInteractive(engine, tiers);
  if (contextLost) return;
  window.__STATS = { ...window.__STATS, compileMs, readyMs: Math.round(performance.now() - t0) };
  console.log(`[main] ${interactive ? 'interactive' : 'ready'} in ${window.__STATS.readyMs} ms`);
  loading.finish();
  window.__READY = true;
}

function startInteractive(engine, tiers) {
  const controls = new Explore(engine);
  addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)) return;
    if (event.code === 'KeyT') {
      event.preventDefault();
      engine.setTimePreset(TIME_NAMES[(TIME_NAMES.indexOf(engine.timePreset) + 1) % TIME_NAMES.length]);
    } else if (event.code === 'KeyR') { event.preventDefault(); tiers.cycle(); }
  });
  addEventListener('resize', () => tiers.resize(Number(P.get('w')) || innerWidth, Number(P.get('h')) || innerHeight));
  addEventListener('visibilitychange', () => { previous = undefined; tiers.policy.reset(); });
  window.__explore = {
    step: (dtSeconds, keys) => controls.step(dtSeconds, keys),
    position: () => controls.position(), mode: () => controls.mode(), setMode: (mode) => controls.setMode(mode),
  };
  const hud = document.createElement('div');
  hud.id = 'hud'; document.body.appendChild(hud);
  showControlsHint();
  let previous, previousRendered = false;
  const loop = (now) => {
    if (contextLost) return;
    const frameMs = previous === undefined ? 0 : now - previous;
    const dt = Math.min(frameMs / 1000, 0.1);
    previous = now;
    tiers.observe(frameMs, previousRendered);
    controls.step(dt, controls.keys);
    let moving = controls.consumeMovement();
    if (P.get('animate') === '1') { engine.setTime(engine.time + dt); moving = true; }
    previousRendered = moving || engine._accFrames === undefined || engine._accFrames < 64;
    engine.renderInteractive(moving);
    const p = engine.camera.position, info = engine.renderer.info.render;
    hud.textContent = `${controls.mode()} · ${engine.timePreset} · ${tiers.name}${tiers.automatic ? ' (auto)' : ''} · samples ${engine._accFrames}\n` +
      `position ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)} m\n` +
      `calls ${info.calls} · triangles ${info.triangles.toLocaleString('en-US')}`;
    requestAnimationFrame(loop);
  };
  engine.renderInteractive(true);
  requestAnimationFrame(loop);
}

function showControlsHint() {
  try { if (localStorage.getItem('kaifeng:controls-dismissed')) return; } catch { /* storage can be disabled */ }
  const hint = document.getElementById('controls-hint');
  if (!hint) return;
  hint.hidden = false;
  hint.querySelector('button').addEventListener('click', () => {
    hint.hidden = true;
    try { localStorage.setItem('kaifeng:controls-dismissed', '1'); } catch { /* dismissal still works */ }
  });
}

boot().catch((error) => {
  window.__RENDER_ERROR = error.stack || error.message || String(error);
  loading.fail(error);
  console.error(window.__RENDER_ERROR);
});
