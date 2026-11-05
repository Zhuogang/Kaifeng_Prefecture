import * as THREE from 'three';
import { CITY, CITY_VIEWS } from '../world/plan.js';
import { buildHall } from '../yingzao/hall.js';
import { GeometryBatch } from '../yingzao/geometry.js';
import { cityTrees } from '../city/trees.js';
import { cityLights } from '../city/lights.js';
import { cityLayout } from '../city/layout.js';
import { instanceHouses } from '../city/houses.js';
import { cityMaterial, packedGeometry, mergePacked, colorGeometry, disposeHall } from '../city/batch.js';
import { extendRiver, farmland, cityGround } from '../city/landscape.js';

function offices(engine,material,blocks) {
  const parts=[],shadowBatch=new GeometryBatch();
  const hall=buildHall(CITY.officeSpec,engine),model=packedGeometry(hall.lod1,{green:true});
  disposeHall(hall);
  for(const o of CITY.offices) {
    const [x,,z]=o.position,ground=CITY.surfaceY;
    // inferred: a principal hall, lower side ranges and entrance house around a plain court.
    for(const [dx,dz,sx,sy,sz,yaw] of [[0,-23,1,1,1,0],[-30,0,1,.72,.8,Math.PI/2],[30,0,1,.72,.8,Math.PI/2],[0,27,.65,.65,.7,0]]) {
      const m=new THREE.Matrix4().compose(new THREE.Vector3(x+dx,ground,z+dz),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(sx,sy,sz));
      parts.push(model.clone().applyMatrix4(m));
      shadowBatch.box([x+dx,ground+3*sy,z+dz],[22*sx,6*sy,7*sz],yaw);
    }
    engine.footprints.addRect(x,z,o.halfWidth,o.halfDepth,0,'city-office:'+o.name);
  }
  // inferred: low grey compound walls define the irregular lanes. Interrupt the
  // south face for an entrance; block collision deliberately excludes these yards.
  const walls=new GeometryBatch();
  for(const b of blocks)if(!b.outer) {
    const y=CITY.surfaceY+.7;
    for(const sign of [-1,1])walls.box([b.x+sign*b.hw,y,b.z],[.24,1.4,b.hd*2]);
    walls.box([b.x,y,b.z-b.hd],[b.hw*2,1.4,.24]);
    for(const sign of [-1,1])walls.box([b.x+sign*(b.hw+1.2)/2,y,b.z+b.hd],[b.hw-1.2,1.4,.24]);
  }
  const wallGeometry=walls.geometry();parts.push(colorGeometry(wallGeometry,new THREE.Color().setRGB(.18,.19,.18)));wallGeometry.dispose();
  model.dispose();const mesh=new THREE.Mesh(mergePacked(parts),material);mesh.name='avenue-offices-and-compounds';engine.add(mesh,{castShadow:false});
  const shadow=shadowBatch.mesh(new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}),'office-shadow-hulls');engine.add(shadow,{receiveShadow:false});
  return {mesh,shadow};
}

export async function build(engine) {
  if(engine.registry.city)return engine.registry.city;
  const t0=performance.now(),material=cityMaterial(engine),layout=cityLayout(engine);
  const houses=instanceHouses(engine,layout.houses,material),officeResult=offices(engine,material,layout.blocks),office=officeResult.mesh,officeShadow=officeResult.shadow;
  for(const b of layout.blocks)if(!b.outer)engine.footprints.addRect(b.x,b.z,b.hw,b.hd,0,'city-block');
  const trees=[...layout.trees],rng=engine.rng('T8-field-tree-lines');
  // inferred: distant rows of 槐 at field divisions. No camera-relative dressing.
  for(let i=0;i<280;i++) {
    const sign=i%2?1:-1,across=rng.range(-CITY.farmlandExtent*.8,CITY.farmlandExtent*.8);
    const edge=sign*(CITY.outerExtent+250+Math.floor(i/70)*1500);
    const [x,z]=i%4<2?[edge,across]:[across,edge];trees.push([x,.52,z]);
  }
  const flora=cityTrees(engine,trees);
  const river=extendRiver(engine),fields=farmland(engine),ground=cityGround(engine),lights=cityLights(engine,layout,material);
  const result={...houses,office,officeShadow,flora,river,fields,ground,lights,layout,material,buildMs:Math.round(performance.now()-t0)};
  engine.registry.city=result;
  console.log('[city] '+JSON.stringify({buildMs:result.buildMs,blocks:layout.blocks.length,houses:layout.houses.length,trees:trees.length,lods:houses.stats}));
  return result;
}

export async function test(engine) {
  await (await import('./ground.js')).build(engine);
  await build(engine);await (await import('./walls.js')).build(engine);await (await import('./tieta.js')).build(engine);
  return {views:[CITY_VIEWS.aerial,CITY_VIEWS.gallery,CITY_VIEWS.avenue,CITY_VIEWS.roofs]};
}
