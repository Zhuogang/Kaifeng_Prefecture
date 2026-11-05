import * as THREE from 'three';
import { installPaintOutput } from '../paint/materials.js';
import { paintedSky, paintedWater } from '../paint/atmosphere.js';
import { compose } from '../paint/scene.js';

// inferred: a six metre composed dolly, matching c2's low riverside viewpoint.
export function paintView(fraction = 0, time = 0) {
  return { pos: [-.5 + fraction * 1.2, 5.1 - fraction * .8, 22 - fraction * Math.sqrt(36 - 1.44)],
    target: [4.2 + fraction * .8, 2.7 - fraction * .8, -27], fov: 45, time, near: .15, far: 900 };
}

export async function build(engine) {
  installPaintOutput(engine);
  const time = { value: engine.time };
  engine.onUpdate(t => { time.value = t; });
  const backdrop = await paintedSky(engine);
  const reflectionScene = compose(engine, time);
  reflectionScene.add(backdrop.clone());
  paintedWater(engine, time, reflectionScene);
  engine.registry.paint.views = [paintView(), ...Array.from({ length: 8 }, (_, i) => paintView(i / 7, i * 2))];
  if (engine.params.get('drift') === '1') {
    const render = engine.renderInteractive.bind(engine);
    // This module owns the playback loop. Suppress the page's generic navigation
    // draw so an interactive URL still has exactly one moving sample per frame.
    let previous;
    const target = new THREE.Vector3();
    const moveCamera=()=>{
      const fraction = .5 - .5 * Math.cos(engine.time * Math.PI / 24), view = paintView(fraction);
      engine.camera.position.set(...view.pos);
      engine.camera.lookAt(target.set(...view.target));
      engine.camera.updateMatrixWorld(true);
    };
    // The page's walking controls also run each frame. Restore the authored
    // camera after their update, while leaving drawing to the playback loop.
    engine.renderInteractive = moveCamera;
    const loop = now => {
      if (window.__READY) {
        const dt = previous === undefined ? 0 : Math.min((now - previous) / 1000, .1);
        engine.setTime(engine.time + dt);
        moveCamera();
        render(true);
      }
      previous = now; requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

export async function test(engine) {
  await build(engine);
  return { views: engine.registry.paint.views };
}
