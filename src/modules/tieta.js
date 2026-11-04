import * as THREE from 'three';
import { TIETA as P } from '../world/plan.js';
import { GeometryBatch } from '../yingzao/geometry.js';
import { masonryMaterial } from '../materials/masonry.js';

export async function build(engine) {
  if(engine.registry.tieta)return engine.registry.tieta;
  const b=new GeometryBatch(),p=P.profile,[x,,z]=P.position,ground=engine.groundHeight?.(x,z)??0;
  // inferred: the exact radius/taper and storey profiles reconstruct a slender
  // masonry tower. Only octagon / 13 tiers / 55.88 m total are measured here.
  const ring=(r0,r1,y0,y1)=>{
    const g=new THREE.CylinderGeometry(r1,r0,y1-y0,P.sides,1,false);g.rotateY(Math.PI/8);g.translate(x,ground+(y0+y1)/2,z);b.add(g);g.dispose();
  };
  ring(p.baseRadius+.6,p.baseRadius+.6,0,p.baseHeight);
  let y=p.baseHeight;
  for(let i=0;i<P.storeys;i++) {
    const h=i===0?p.firstStorey:p.storey,r=THREE.MathUtils.lerp(p.baseRadius,p.topRadius,i/(P.storeys-1));
    ring(r,r-.10,y,y+h-.85);
    // inferred: glazed-brick imitation timber corbels on each octagonal facet.
    // The extant tower's moulded figure panels are represented only by surface relief.
    for(let face=0;face<8;face++)for(const offset of [-.48,0,.48]) {
      const a=face*Math.PI/4+Math.PI/4,radial=r*Math.cos(Math.PI/8),tangent=offset*r*.5;
      const cx=x+Math.sin(a)*radial+Math.cos(a)*tangent,cz=z+Math.cos(a)*radial-Math.sin(a)*tangent;
      b.box([cx,ground+y+h-.99,cz],[.18,.24,.38],a);
      b.box([cx+Math.sin(a)*.16,ground+y+h-.83,cz+Math.cos(a)*.16],[.44,.14,.48],a);
    }
    // Brick corbel courses, broad octagonal eaves and a gently sloping upper roof.
    for(let j=0;j<4;j++)ring(r-.1+j*.15,r+.05+j*.15,y+h-.85+j*.11,y+h-.74+j*.11);
    ring(r+.5,r+p.eaveProjection,y+h-.41,y+h-.27);
    ring(r+p.eaveProjection,r-.18,y+h-.27,y+h+.28);
    ring(r-.18,r-.18,y+h+.28,y+h+.39);
    y+=h;
  }
  // Finial stays within the measured overall height; seven diminishing metal/brick rings.
  const top=P.height,root=y+.39;
  ring(1.45,.48,root,root+2);
  ring(.32,.10,root+2,top);
  for(let i=0;i<7;i++) {
    const yy=root+2.2+i*(top-root-2.6)/7,r=.72*(1-i*.085);
    ring(r*.45,r,yy,yy+.12);ring(r,r*.45,yy+.12,yy+.30);
  }
  const material=masonryMaterial(engine,{tint:0x805132,brickSize:[.31,.12],limeWidth:.0015,coursePeriod:1000,topY:P.height,wear:.78});
  // inferred: dark recessed openings and sculpted-panel register rhythm, without extra draw calls.
  const baseCompile=material.onBeforeCompile;
  material.onBeforeCompile=function(shader,renderer){
    baseCompile.call(this,shader,renderer);
    shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`
      vec2 towerDelta=cgP.xz-vec2(${x.toFixed(2)},${z.toFixed(2)});
      float panel=fract(atan(towerDelta.y,towerDelta.x)/0.78539816339+0.5);
      float towerY=cgP.y-${ground.toFixed(4)};
      float levelY=towerY<5.6?towerY-.6:mod(towerY-5.6,3.5);
      float niche=step(.38,panel)*step(panel,.62)*step(.8,levelY)*step(levelY,2.15)*step(towerY,47.0);
      diffuseColor.rgb*=1.0-.85*niche;
      // inferred: shallow repeated relief panels, rather than fabricated figurative sculptures.
      float relief=sin(panel*25.1327)*sin(levelY*19.0);
      diffuseColor.rgb*=1.0+.08*relief*(1.0-niche);
      roughnessFactor=.34+.18*cgVnoise3(cgP*.4);
      #include <metalnessmap_fragment>
    `);
  };
  material.userData.shaderKey+='|tieta-niches-v1';
  material.customProgramCacheKey=()=>material.userData.shaderKey;
  const mesh=b.mesh(material,'kaibaosi-iron-pagoda');engine.add(mesh);
  engine.footprints.addCircle(x,z,p.baseRadius+.6,'tieta');
  const result={mesh,storeys:P.storeys,height:P.height,plan:P};engine.registry.tieta=result;return result;
}

export async function test(engine) {
  await (await import('./ground.js')).build(engine);await build(engine);
  const [x,,z]=P.position;
  return {views:[{pos:[x+125,12,z+155],target:[x,27,z],fov:27,near:.1},
    {pos:[x-550,85,z+650],target:[x,27,z],fov:42,near:.1}]};
}
