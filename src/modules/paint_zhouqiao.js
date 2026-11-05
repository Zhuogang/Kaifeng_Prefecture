import {paintPlayback} from '../paint/playback.js';
import { installPaintOutput } from '../paint/materials.js';
import { paintedSky, paintedWater } from '../paint/atmosphere.js';
import {CAMERA,WATER,BACKDROP} from '../paint/composition.js';
import { compose } from '../paint/scene.js';

// inferred: wider sideways travel and a .6 m rise; the falling target keeps
// the entire near boat below the bridge even at the upward look corner.
export function paintView(fraction = 0, time = 0) {
  return { pos: CAMERA.pos.map((v,i)=>v+fraction*CAMERA.travel[i]),
    target:CAMERA.target.map((v,i)=>v+fraction*(i===0?.4+CAMERA.pan:i===1?-2.7:0)), fov:CAMERA.fov, time, near: .15, far: 900 };
}

export async function build(engine) {
  installPaintOutput(engine);
  const time = { value: engine.time };
  engine.onUpdate(t => { time.value = t;time.windTime?.value.set(Math.sin(t*.55),Math.cos(t*.55),Math.sin(t*.43),Math.cos(t*.43)); });
  const backdrop = await paintedSky(engine,BACKDROP);
  const reflectionScene = compose(engine, time, paintView);
  reflectionScene.add(backdrop.clone());
  paintedWater(engine,time,reflectionScene,WATER);
  // inferred: 50 seconds preserves the former dolly's gentle travel speed.
  paintPlayback(engine,paintView,50);
}

export async function test(engine) {
  await build(engine);
  return { views: engine.registry.paint.views };
}
