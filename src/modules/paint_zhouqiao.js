import {paintPlayback} from '../paint/playback.js';
import { installPaintOutput } from '../paint/materials.js';
import { paintedSky, paintedWater } from '../paint/atmosphere.js';
import {CAMERA,WATER,BACKDROP} from '../paint/composition.js';
import { compose } from '../paint/scene.js';

// inferred: a 3.6 metre composed dolly, matching c2's low riverside viewpoint.
export function paintView(fraction = 0, time = 0) {
  return { pos: CAMERA.pos.map((v,i)=>v+fraction*CAMERA.travel[i]),
    target:CAMERA.target.map((v,i)=>v+fraction*(i===0?.4+CAMERA.pan:i===1?-.4:0)), fov:CAMERA.fov, time, near: .15, far: 900 };
}

export async function build(engine) {
  installPaintOutput(engine);
  const time = { value: engine.time };
  engine.onUpdate(t => { time.value = t; });
  const backdrop = await paintedSky(engine,BACKDROP);
  const reflectionScene = compose(engine, time);
  reflectionScene.add(backdrop.clone());
  paintedWater(engine,time,reflectionScene,WATER);
  paintPlayback(engine,paintView);
}

export async function test(engine) {
  await build(engine);
  return { views: engine.registry.paint.views };
}
