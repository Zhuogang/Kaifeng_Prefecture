import {installPaintOutput} from '../paint/materials.js';
import {paintedSky,paintedWater} from '../paint/atmosphere.js';
import {paintPlayback} from '../paint/playback.js';
import {composeXuande} from '../paint/xuande.js';
// inferred: low avenue viewpoint, wider eastward dolly and slight pan separate
// foreground blossom, red rails and the Song platform along the composed path.
export function paintView(fraction=0,time=0){return {pos:[-3+fraction*4.5,7+fraction*.6,75-fraction*5],target:[-.4+fraction*.8,9.8,-2],fov:45,time,near:.15,far:900};}
export async function build(engine){
 installPaintOutput(engine);const time={value:engine.time};engine.onUpdate(t=>{time.value=t;time.windTime?.value.set(Math.sin(t*.55),Math.cos(t*.55),Math.sin(t*.43),Math.cos(t*.43));});
 const sky=await paintedSky(engine,{backdrop:'bd2',shiftU:0,heightOffset:35});const reflection=composeXuande(engine,time,paintView);reflection.add(sky.clone());
 paintedWater(engine,time,reflection,{distortion:.26,bounds:[-28.5,-2,-14.4,85],river:false});
 // inferred: 80 seconds per round trip preserves the old dolly speed over
 // the longer 6.75 m path (formerly about 4.04 m in 48 seconds).
 paintPlayback(engine,paintView,80);
}
export async function test(engine){await build(engine);return {views:engine.registry.paint.views};}
