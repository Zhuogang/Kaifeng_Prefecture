import {installPaintOutput} from '../paint/materials.js';
import {paintedSky,paintedWater} from '../paint/atmosphere.js';
import {paintPlayback} from '../paint/playback.js';
import {composeXuande} from '../paint/xuande.js';
// inferred: low avenue viewpoint, 4 m dolly and slight eastward pan separate
// foreground blossom, red rails and the Song platform along the composed path.
export function paintView(fraction=0,time=0){return {pos:[-3+fraction*.55,7+fraction*.1,75-fraction*4],target:[-.4+fraction*.8,9.8,-2],fov:45,time,near:.15,far:900};}
export async function build(engine){
 installPaintOutput(engine);const time={value:engine.time};engine.onUpdate(t=>{time.value=t;});
 const sky=await paintedSky(engine,{backdrop:'bd2',shiftU:0,heightOffset:35});const reflection=composeXuande(engine,time);reflection.add(sky.clone());
 paintedWater(engine,time,reflection,{width:1536,height:864,distortion:.26,bounds:[-28.5,-2,-14.4,85],river:false});
 paintPlayback(engine,paintView);
}
export async function test(engine){await build(engine);return {views:engine.registry.paint.views};}
