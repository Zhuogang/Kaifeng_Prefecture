import * as THREE from 'three';
import { CITY_WALLS as P, BIANHE } from '../world/plan.js';
import { GeometryBatch } from '../yingzao/geometry.js';
import { buildHall } from '../yingzao/hall.js';
import { masonryMaterial } from '../materials/masonry.js';
import { cityMaterial, packedGeometry, mergePacked, colorGeometry, disposeHall } from '../city/batch.js';
import { batteredBlock, gatePlatform } from '../city/masonry.js';

export async function build(engine) {
  if(engine.registry.cityWalls)return engine.registry.cityWalls;
  const blocks=new GeometryBatch(),trim=new GeometryBatch(),gate=P.zhuque;
  gatePlatform(blocks,gate);
  const segments=[];
  function wall(a,b,axis,fixed,gates) {
    let start=a;
    const exclusions=gates.map(g=>[g-P.gateWidth/2,g+P.gateWidth/2]);
    if(axis==='x'&&fixed===P.south)exclusions.push([-gate.width/2,gate.width/2]);
    if(axis==='z')exclusions.push([BIANHE.center[2]-BIANHE.width/2,BIANHE.center[2]+BIANHE.width/2]);
    exclusions.sort((u,v)=>u[0]-v[0]);
    for(const [lo,hi] of [...exclusions,[b,b]]) {
      if(lo>start)segments.push({a:start,b:lo,axis,fixed});start=Math.max(start,hi);
    }
    // Modest flat-lintel secondary gates, with no invented arched vaults.
    for(const g of gates) {
      if(axis==='x'&&fixed===P.south&&g===0)continue;
      const center=axis==='x'?[g,6.2,fixed]:[fixed,6.2,g],size=axis==='x'?[P.gateWidth,2,P.depth]:[P.depth,2,P.gateWidth];
      blocks.box(center,size);
      trim.box(axis==='x'?[g,5.25,fixed]:[fixed,5.25,g],axis==='x'?[P.gateWidth+.5,.3,P.depth+.2]:[P.depth+.2,.3,P.gateWidth+.5]);
    }
  }
  wall(-P.halfWidth,P.halfWidth,'x',P.south,P.southGates);
  wall(-P.halfWidth,P.halfWidth,'x',P.north,P.northGates);
  for(const sign of [-1,1])wall(P.north,P.south,'z',sign*P.halfWidth,P.sideGates);
  for(const s of segments) {
    const center=(s.a+s.b)/2,length=s.b-s.a,across=s.axis==='x';
    const x0=across?s.a:s.fixed-P.depth/2,x1=across?s.b:s.fixed+P.depth/2;
    const z0=across?s.fixed-P.depth/2:s.a,z1=across?s.fixed+P.depth/2:s.b;
    // inferred: 7.2 m wall, 6 m base, modest battered section and 3.12 m merlon rhythm.
    batteredBlock(blocks,x0,x1,z0,z1,0,P.height,0,P.batter*P.height);
    trim.box(across?[center,P.height-.1,s.fixed]:[s.fixed,P.height-.1,center],across?[length,.2,P.depth-1]:[P.depth-1,.2,length]);
    for(let k=s.a+1.56;k<s.b;k+=3.12)for(const side of [-1,1]) {
      blocks.box(across?[k,P.height+.48,s.fixed+side*(P.depth/2-.8)]:[s.fixed+side*(P.depth/2-.8),P.height+.48,k],
        across?[1.55,.96,.55]:[.55,.96,1.55]);
    }
    engine.footprints.addRect(across?center:s.fixed,across?s.fixed:center,across?length/2:P.depth/2,across?P.depth/2:length/2,0,'inner-city-wall');
  }
  const hall=buildHall(gate.hallSpec,engine),parts=[];
  const g=packedGeometry(hall.lod1);g.translate(...[gate.position[0],gate.height,gate.position[2]]);parts.push(g);disposeHall(hall);
  for(const o of gate.openings) {
    // inferred: exposed structural timber lintels front and rear, solid side doors, central through passage.
    for(const side of [-1,1])trim.box([o.x,o.height+.16,gate.position[2]+side*(gate.depth/2-gate.batter*o.height)],[o.topWidth+.7,.38,.45]);
    if(o.x!==0)trim.box([o.x,o.height/2,gate.position[2]],[o.width-.15,o.height,.25]);
  }
  // A simple parapet/rail encloses the top; paired stair flights ascend outside the passages.
  for(const side of [-1,1]) {
    const z=gate.position[2]+side*(gate.depth/2-1);
    for(const y of [gate.height+.35,gate.height+1.1])trim.box([0,y,z],[gate.width-2,.13,.13]);
    for(let x=-gate.width/2+1;x<gate.width/2;x+=2.184)trim.box([x,gate.height+.6,z],[.16,1.2,.16]);
    const x=side*(gate.width/2+3);
    for(let i=0;i<45;i++)blocks.box([x,(i+1)*.1,gate.position[2]-15+i*.32],[4,(i+1)*.2,.32]);
  }
  const trimG=trim.geometry();parts.push(colorGeometry(trimG,new THREE.Color().setRGB(.22,.075,.035)));trimG.dispose();
  const mat=cityMaterial(engine),timber=new THREE.Mesh(mergePacked(parts),mat);timber.name='zhuque-hall-and-wall-caps';
  const masonry=masonryMaterial(engine,{topY:P.height,wear:.9,batter:P.batter});
  const compile=masonry.onBeforeCompile;
  masonry.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.fragmentShader=shader.fragmentShader.replace('float lime = smoothstep(t2TopY-t2LimeWidth-0.01,t2TopY-t2LimeWidth+0.01,cgP.y);',`
      float wallTopY=abs(cgP.x)<${(gate.width/2+.01).toFixed(3)}&&abs(cgP.z-${gate.position[2].toFixed(2)})<${(gate.depth/2+.01).toFixed(3)}?${gate.height.toFixed(2)}:t2TopY;
      float lime=smoothstep(wallTopY-t2LimeWidth-.01,wallTopY-t2LimeWidth+.01,cgP.y);`);
  };
  masonry.userData.shaderKey+='|zhuque-lime-datum';masonry.customProgramCacheKey=()=>masonry.userData.shaderKey;
  const shell=blocks.mesh(masonry,'inner-city-battered-masonry');
  engine.add(shell);engine.add(timber);
  for(const o of gate.openings) {
    if(o.x!==0)engine.footprints.addRect(o.x,gate.position[2],o.width/2,.2,0,'zhuque-door');
  }
  // Collision follows the piers, allowing walkers through the central flat-lintel passage.
  const spans=[-gate.width/2,...gate.openings.flatMap(o=>[o.x-o.width/2,o.x+o.width/2]),gate.width/2];
  for(let i=0;i<spans.length;i+=2)engine.footprints.addRect((spans[i]+spans[i+1])/2,gate.position[2],(spans[i+1]-spans[i])/2,gate.depth/2,0,'zhuque-pier');
  const result={shell,timber,segments,plan:P};engine.registry.cityWalls=result;return result;
}

export async function test(engine) {
  await (await import('./ground.js')).build(engine);await build(engine);
  return {views:[{pos:[70,24,1510],target:[0,13,1300],fov:39,near:.1},
    {pos:[-80,9,1010],target:[0,12,1300],fov:43,near:.1},
    {pos:[0,2,1325],target:[0,3,1290],fov:65,near:.1}]};
}
