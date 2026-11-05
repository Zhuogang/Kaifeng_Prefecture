import { createEngine } from '../core/engine.js';
import { getQuality } from '../core/quality.js';
import { paintCamera, LOOK_YAW, LOOK_PITCH } from '../paint/playback.js';
import { ScrollQuality } from './quality.js';

// inferred: paper/ink colours and caption anchors in index.html,
// four-per-second pointer easing and the scrub gains
// below are experience design choices rather than historical reconstructions.
// inferred: the U1b slip dimensions, inner-rule treatment and ink (#302a20)
// compose a title slip; its paper matches the opening at the specified 94%.
const SCENES = ['paint_xuande', 'paint_zhouqiao'];
const TEXT = [
  { name: '宣德樓', lines: [
    ['大內正門宣德樓列五門，門皆金釘朱漆。', "The palace's main gate, Xuande Tower, has five doors, all vermilion lacquer with gold nails."],
    ['近岸植桃李梨杏，雜花相間，春夏之間，望之如繡。', 'Peach, plum, pear and apricot were planted along the banks, their blossoms mingled. In spring and summer it looked like embroidery.'],
  ] },
  { name: '州橋', lines: [
    ['州橋（正名天漢橋），正對於大內御街。', 'Zhou Bridge, properly Tianhan Bridge, faces straight up the palace avenue.'],
    ['橋下密排石柱，蓋車駕御路也。', 'Stone columns stand close-set beneath it, for this is the imperial carriage road.'],
  ] },
];
const $ = id => document.getElementById(id);
const clamp = f => Math.max(0, Math.min(1, f));

export async function bootScroll(params) {
  const started = performance.now(), scene = params.get('scene') === '1' ? 1 : 0;
  const direct = params.has('scene'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.body.classList.add('interactive', 'scroll');
  document.body.dataset.scrollScene = String(scene);
  $('loading').hidden = true;
  $('scroll-opening').hidden = direct;
  $('scroll-ui').hidden = true;
  const cover = $('scroll-cover'), opening = $('scroll-opening');
  let ready = false, active = false, lost = false, leaving = false, fraction = 0;
  const requestedRatio=Number(params.get('ratio'));
  const qualityControl=new ScrollQuality(Math.min(devicePixelRatio || 1,2),
    params.has('ratio')&&Number.isFinite(requestedRatio)&&requestedRatio>0?requestedRatio:null);
  let ratio = qualityControl.ratio, frameMs = 0, calls = 0, triangles = 0, gpu = null;
  let engine, previous, raf, lastInput = -Infinity, elapsed = 0, captionOverride = null, captionLine = -1;
  let phase = 0, yaw = 0, pitch = 0, wantedYaw = 0, wantedPitch = 0;
  let drag = null;
  let hintDismissed = false;
  try { hintDismissed = sessionStorage.getItem('kaifeng:scroll-hint-dismissed') === '1'; } catch { /* dismissal still works in this document */ }
  const hint = $('scroll-hint');
  hint.classList.toggle('dismissed', hintDismissed);
  hint.setAttribute('aria-hidden', String(hintDismissed));
  const dismissHint = () => {
    if (!active || hintDismissed) return;
    hintDismissed = true; hint.classList.add('dismissed'); hint.setAttribute('aria-hidden', 'true');
    try { sessionStorage.setItem('kaifeng:scroll-hint-dismissed', '1'); } catch { /* dismissal still works in this document */ }
  };
  const status = () => ({ frameMs, fps: frameMs ? 1000 / frameMs : 0, pixelRatio: ratio, calls, triangles,
    qualityLevel:qualityControl.level, reflectionSize:engine?.registry.paint?.reflection ?
      [engine.registry.paint.reflection.width,engine.registry.paint.reflection.height] : [0,0], gpu });
  const visibleCaption = () => active && !leaving && (captionOverride ?? (elapsed >= 2 && elapsed < 12 || elapsed >= 14 && elapsed < 24));
  const fail = message => {
    lost = true; ready = false; active = false; window.__READY = false;
    window.__RENDER_ERROR = message;
    cancelAnimationFrame(raf);
    $('scroll-error').textContent = message; $('scroll-error').hidden = false;
    $('scroll-opening').hidden = true; $('scroll-ui').hidden = true;
    cover.style.transition = 'none'; cover.style.transform = 'translateX(0)';
  };
  window.__scrollFail = fail;
  const scrub = value => {
    if (!Number.isFinite(value)) return fraction;
    fraction = clamp(value); phase = Math.acos(1 - 2 * fraction);
    lastInput = performance.now();
    return fraction;
  };
  const navigate = destination => {
    if (!ready || !active || leaving || destination < 0 || destination >= SCENES.length) return;
    leaving = true; $('scroll-ui').classList.add('leaving');
    // Both sides of a full document navigation are covered before scene building.
    cover.style.transition = 'none'; cover.style.transform = 'translateX(-110%)';
    void cover.offsetWidth;
    cover.style.transition = ''; cover.style.transform = 'translateX(0)';
    const url = new URL(location.href); url.searchParams.set('scene', destination);
    let navigated = false;
    const go = () => { if (!navigated) { navigated = true; location.assign(url.href); } };
    cover.addEventListener('transitionend', go, { once: true });
    setTimeout(go, 1100);
  };
  window.__scroll = { scene: () => scene, ready: () => ready, fraction: () => fraction,
    scrub, next: () => navigate(scene + 1), prev: () => navigate(scene - 1), captionsVisible: visibleCaption, status };
  const progress = message => { $('scroll-progress').textContent = message; $('scroll-cover-status').textContent = message; };
  progress('展纸 · Preparing the scroll');
  const quality = getQuality('preview');
  quality.ao = false; quality.bloom = false;
  const engineStart = performance.now();
  engine = await createEngine({ width: innerWidth, height: innerHeight, quality, params, painted: true });
  engine.scroll = true; window.engine = engine;
  const context=engine.renderer.getContext(),debug=context.getExtension('WEBGL_debug_renderer_info');
  gpu=debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
  const engineMs = Math.round(performance.now() - engineStart);
  engine.canvas.setAttribute('aria-label', TEXT[scene].name + ' · Drag or scroll to drift along the scene');
  engine.canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); fail('The graphics context was lost. Reload this page to reopen the scroll.');
  });
  const resize = () => {
    engine.width = Math.max(1, Math.round(innerWidth * ratio));
    engine.height = Math.max(1, Math.round(innerHeight * ratio));
    engine.renderer.setSize(engine.width, engine.height, false);
    engine.pipeline.setSize(engine.width, engine.height);
    engine.camera.aspect = innerWidth / innerHeight; engine.camera.updateProjectionMatrix();
    engine.registry.paint?.reflection?.resize();
    engine._accFrames = undefined;
  };
  resize();
  progress('入画 · Preparing ' + TEXT[scene].name);
  const moduleStart = performance.now(), mod = await import(`../modules/${SCENES[scene]}.js`);
  await mod.build(engine);
  const moduleBuildMs = Math.round(performance.now() - moduleStart), prepareStart = performance.now();
  engine.prepareScene();
  const prepareMs = Math.round(performance.now() - prepareStart);
  engine.applyShot({ id: 'scroll-' + scene, ...mod.paintView(0) });
  const buildMs = Math.round(performance.now() - started), compileStart = performance.now();
  window.__STATS = { buildMs, engineMs, moduleBuildMs, prepareMs, modules: [{ name: SCENES[scene], buildMs: moduleBuildMs }] };
  progress('成像 · Preparing light');
  await engine.renderer.compileAsync(engine.scene, engine.camera);
  const compileMs = Math.round(performance.now() - compileStart), firstStart = performance.now();
  engine.renderInteractive(true);
  // A fence measures the completed first frame, including post and reflection
  // programs which compileAsync cannot see. Yield while the software GPU works.
  const gl = engine.renderer.getContext(), sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  if (sync) {
    while (!lost && gl.clientWaitSync(sync, 0, 0) === gl.TIMEOUT_EXPIRED) await new Promise(resolve => setTimeout(resolve, 10));
    gl.deleteSync(sync);
  }
  if (lost) return;
  calls = engine.renderer.info.render.calls; triangles = engine.renderer.info.render.triangles;
  window.__STATS = { ...window.__STATS, compileMs, firstRenderMs: Math.round(performance.now() - firstStart),
    firstFrameMs: Math.round(performance.now()), readyMs: Math.round(performance.now() - started), calls, triangles, pixelRatio: ratio };
  console.log('[scroll] ready', JSON.stringify(window.__STATS));
  ready = true; window.__READY = true;
  progress('画卷已备 · Ready'); $('scroll-open').hidden = false;
  $('scroll-prev').hidden = scene === 0; $('scroll-next').hidden = scene === 1;
  $('scroll-position').textContent = scene === 0 ? '一' : '二';
  $('scroll-position').setAttribute('aria-label', `${TEXT[scene].name} · ${scene + 1} of 2`);

  const begin = () => {
    if (active || !ready) return;
    active = true; elapsed = 0; previous = undefined;
    opening.classList.add('opened'); opening.inert = true;
    $('scroll-ui').hidden = false; $('scroll-cover-status').hidden = true;
    cover.style.transform = 'translateX(110%)';
    setTimeout(() => { opening.hidden = true; }, 1000);
    raf = requestAnimationFrame(loop);
  };
  const updateCaption = () => {
    const line = elapsed < 13 ? 0 : 1;
    if (line !== captionLine) {
      captionLine = line; $('scroll-caption-name').textContent = TEXT[scene].name;
      $('scroll-caption-line').textContent = TEXT[scene].lines[line][0];
      $('scroll-caption-gloss').textContent = TEXT[scene].lines[line][1];
    }
    $('scroll-caption').classList.toggle('visible', visibleCaption());
    $('scroll-caption').setAttribute('aria-hidden', String(!visibleCaption()));
  };
  const loop = now => {
    if (lost || document.hidden) { previous = undefined; return; }
    const delta = previous === undefined ? 0 : now - previous, dt = Math.min(delta / 1000, .1);
    previous = now;
    if (delta > 0) {
      frameMs = frameMs ? frameMs * .9 + delta * .1 : delta;
      if (qualityControl.update(delta,now)) {
        const reflection=engine.registry.paint.reflection;
        reflection.interval=qualityControl.reflectionInterval;
        reflection.scale=qualityControl.reflectionScale;
        ratio=qualityControl.ratio;resize();
      }
    }
    elapsed += delta / 1000;
    if (elapsed >= 8) dismissHint();
    if (!reduced.matches && !drag && now - lastInput >= 4000 && !leaving) {
      phase += dt * Math.PI * 2 / engine.registry.paint.roundTrip; fraction = .5 - .5 * Math.cos(phase);
    }
    const ease = 1 - Math.exp(-dt * 4);
    yaw += (wantedYaw - yaw) * ease; pitch += (wantedPitch - pitch) * ease;
    if (!leaving) engine.setTime(engine.time + dt);
    paintCamera(engine, engine.registry.paint.viewAt, fraction, yaw, pitch);
    engine.renderInteractive(true);
    const info = engine.renderer.info.render; calls = info.calls; triangles = info.triangles;
    updateCaption();
    const report=status();
    $('scroll-performance').textContent = `${frameMs.toFixed(1)} ms · ${report.fps.toFixed(1)} FPS\n${calls} calls · ${triangles.toLocaleString('en-US')} triangles\nPixel ratio ${ratio.toFixed(2)}\nQuality ${report.qualityLevel} · reflection ${report.reflectionSize.join('×')}\nGPU ${gpu??'unavailable'}`;
    raf = requestAnimationFrame(loop);
  };
  $('scroll-open').addEventListener('click', begin);
  $('scroll-prev').addEventListener('click', () => navigate(scene - 1));
  $('scroll-next').addEventListener('click', () => navigate(scene + 1));
  addEventListener('resize', resize);
  for (const type of ['pointerdown', 'pointermove', 'wheel', 'keydown'])
    addEventListener(type, dismissHint, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf); previous = undefined; qualityControl.resetWindow();
    if (!document.hidden && active && !lost) raf = requestAnimationFrame(loop);
  });
  addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'ArrowLeft') { event.preventDefault(); navigate(scene - 1); }
    if (event.code === 'ArrowRight') { event.preventDefault(); navigate(scene + 1); }
    if (event.code === 'KeyC') { captionOverride = !visibleCaption(); updateCaption(); }
    if (event.code === 'KeyP') $('scroll-performance').hidden = !$('scroll-performance').hidden;
  });
  engine.canvas.style.touchAction = 'none';
  engine.canvas.addEventListener('pointerdown', event => {
    if (!active || leaving) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, fraction };
    engine.canvas.setPointerCapture(event.pointerId); lastInput = performance.now();
  });
  engine.canvas.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) {
      const horizontal = event.clientX - drag.x, vertical = event.clientY - drag.y;
      scrub(drag.fraction + (Math.abs(horizontal) >= Math.abs(vertical) ? horizontal / innerWidth : -vertical / innerHeight));
    } else if (event.pointerType !== 'touch') {
      wantedYaw = -(event.clientX / innerWidth * 2 - 1) * LOOK_YAW;
      wantedPitch = -(event.clientY / innerHeight * 2 - 1) * LOOK_PITCH;
    }
  });
  const release = () => { if (drag) lastInput = performance.now(); drag = null; };
  engine.canvas.addEventListener('pointerup', release);
  engine.canvas.addEventListener('pointercancel', release);
  engine.canvas.addEventListener('lostpointercapture', release);
  engine.canvas.addEventListener('pointerleave', () => { wantedYaw = 0; wantedPitch = 0; });
  engine.canvas.addEventListener('wheel', event => {
    event.preventDefault(); if (active && !leaving) scrub(fraction + (event.deltaY || event.deltaX) * (event.deltaMode === 1 ? .008 : event.deltaMode === 2 ? .3 : .0005));
  }, { passive: false });
  if (direct) begin();
}
