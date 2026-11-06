import {paintPlayback} from '../paint/playback.js';
import { installPaintOutput } from '../paint/materials.js';
import { paintedSky, paintedWater } from '../paint/atmosphere.js';
import {VIEWS,WATER,BACKDROP} from '../paint/composition.js';
import { compose } from '../paint/scene.js';
import {createSunlight,bakeSunlight,installContactAO} from '../paint/sunlight.js';

// inferred: wider sideways travel and a .6 m rise; the falling target keeps
// the entire near boat below the bridge even at the upward look corner.
export function paintView(fraction = 0, time = 0) {
  return VIEWS[0].viewAt(fraction,time);
}

export async function build(engine) {
  installPaintOutput(engine,{profile:'zhouqiao'});
  const time = { value: engine.time, viewIndex:{value:0} };
  createSunlight(engine,time);
  installContactAO(engine,time);
  engine.registry.paint.lightTime=time;
  engine.onUpdate(t => { time.value = t;time.windTime?.value.set(Math.sin(t*.55),Math.cos(t*.55),Math.sin(t*.43),Math.cos(t*.43)); });
  const backdrop = await paintedSky(engine,{...BACKDROP,arc:145*Math.PI/180});
  const reflectionScene = compose(engine, time, paintView);
  bakeSunlight(engine,time);
  reflectionScene.add(backdrop.clone());
  paintedWater(engine,time,reflectionScene,WATER);
  // inferred: 50 seconds preserves the former dolly's gentle travel speed.
  paintPlayback(engine,paintView,50);
  const paint=engine.registry.paint;
  const select=index=>{
    if(paint.currentView===index)return;
    time.viewIndex.value=index;paint.currentView=index;
    for(const mesh of paint.viewDressing??[]){
      const views=mesh.userData.paintView;mesh.visible=Array.isArray(views)?views.includes(index):views===index;
    }
    const uniforms=paint.reflection.water.material.uniforms;
    if(index<3||index===6){uniforms.markAcross.value.set(1,0);uniforms.markDepth.value.set(0,1);uniforms.markOffset.value.set(0,0);}
    else{
      const {pos,target}=VIEWS[index].viewAt(),dx=target[0]-pos[0],dz=target[2]-pos[2],length=Math.hypot(dx,dz),x=dx/length,z=dz/length;
      uniforms.markAcross.value.set(-z,x);uniforms.markDepth.value.set(-x,-z);
      uniforms.markOffset.value.set(z*pos[0]-x*pos[2],16+x*pos[0]+z*pos[2]);
    }
    paint.reflection.fresh=true;
  };
  paint.viewSet=VIEWS.map((view,index)=>({...view,viewAt:(fraction=0,t=0)=>{
    select(index);return {...view.viewAt(fraction,t),paintViewIndex:index};
  }}));
  paint.views.push(...paint.viewSet.slice(1).map(v=>v.viewAt(0)));
  const apply=engine.applyShot.bind(engine);
  engine.applyShot=shot=>{select(shot.paintViewIndex??0);return apply(shot);};
  select(0);
}

export async function test(engine) {
  await build(engine);
  return { views: engine.registry.paint.views };
}
