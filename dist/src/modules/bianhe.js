import * as THREE from 'three';
import { proceduralMaterial } from '../core/materials.js';
import { BIANHE, ZHOUQIAO } from '../world/plan.js';
import { GeometryBatch, meshStats } from '../yingzao/geometry.js';
import { stoneMaterial, carvedStoneMaterial } from '../materials/stone.js';
import { pavingMaterial } from '../materials/paving.js';
import { createRiverSurface } from '../water/surface.js';
import { buildBoats } from '../water/boats.js';
import { reliefGeometry } from '../water/carvings.js';

// Cut the actual terrain triangles, preserving their original interpolated heights outside
// the river. Shader-only holes would leave shadow casters and a hidden walkable surface.
function cutGround(engine) {
  const ground=engine.registry.ground;if(!ground||ground.userData.bianheCut)return;
  const old=ground.geometry,p=old.attributes.position,indices=old.index?.array;
  const out=[];
  const lo=BIANHE.center[2]-BIANHE.width/2,hi=lo+BIANHE.width,L=BIANHE.halfLength;
  const planes=[[0,-L,1],[0,L,-1],[2,lo,1],[2,hi,-1]];
  function split(poly,axis,value,sign) {
    const yes=[],no=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],da=(a[axis]-value)*sign,db=(b[axis]-value)*sign;
      (da>=0?yes:no).push(a);
      if((da>=0)!==(db>=0)){const t=da/(da-db),v=a.map((x,k)=>x+(b[k]-x)*t);yes.push(v);no.push(v);}
    }
    return [yes,no];
  }
  const emit=poly=>{for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]])out.push(...v);};
  for(let i=0;i<(indices?.length??p.count);i+=3){
    let polygon=[0,1,2].map(j=>{const k=indices?indices[i+j]:i+j;return [p.getX(k),p.getY(k),p.getZ(k)];});
    const xs=polygon.map(v=>v[0]),zs=polygon.map(v=>v[2]);
    if(Math.max(...xs)<=-L||Math.min(...xs)>=L||Math.max(...zs)<=lo||Math.min(...zs)>=hi){emit(polygon);continue;}
    for(const plane of planes){const [inside,outside]=split(polygon,...plane);emit(outside);polygon=inside;if(!polygon.length)break;}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));g.computeVertexNormals();
  ground.geometry=g;old.dispose();ground.userData.bianheCut=true;
}

export async function build(engine) {
  if(engine.registry.bianhe)return engine.registry.bianhe;
  cutGround(engine);
  const r=BIANHE,z=r.center[2],half=r.width/2,deck=ZHOUQIAO.dimensions.width/2;
  const group=new THREE.Group();group.name='bianhe-banks';
  const blocks=new GeometryBatch(),paving=new GeometryBatch();
  // inferred: dressed 1.25 × 0.47 m courses, coping dimensions and a modest 8 m quay.
  for(const side of [-1,1]) {
    const bank=z+side*half;
    blocks.box([0,(r.bankY+r.bedY)/2,bank+side*0.48],[r.halfLength*2,r.bankY-r.bedY,0.96]);
    paving.box([0,r.bankY-0.15,bank+side*r.quayWidth/2],[r.halfLength*2,0.30,r.quayWidth]);
    for(const sign of [-1,1]) {
      const a=sign*deck,b=sign*(deck+r.carvedWalls.length),cx=(a+b)/2;
      // Backing wall top is 0.3 m, giving the excavated 3.3 m exposed height above water.
      blocks.box([cx,-1.35,bank+side*0.15],[r.carvedWalls.length,3.3,0.9]);
      for(let i=0;i<24;i++) {
        const x=sign*(deck+(i+0.5)*1.25);
        blocks.box([x,0.34,bank-side*0.05],[1.235,0.22,1.22]);
        blocks.box([x,r.waterY+0.14,bank-side*0.03],[1.235,0.30,1.10]);
      }
    }
  }
  // The bed is physical geometry; opaque water represents its high optical depth.
  blocks.box([0,r.bedY-0.12,z],[r.halfLength*2,0.24,r.width]);
  const stone=stoneMaterial(engine,{tint:0xb7b9ae,waterline:r.waterY,polished:0.15,wear:0.95,joints:1,blockSize:[1.25,0.47]});
  const quayMesh=paving.mesh(pavingMaterial(engine,{ruts:0,drains:0}),'bank-quays');
  quayMesh.castShadow=false;quayMesh.userData.castShadow=false;quayMesh.userData.reflectionSkip=true;
  group.add(blocks.mesh(stone,'dressed-bank-courses'),quayMesh);
  const detailed=reliefGeometry(engine.quality.detail>=1?360:216,engine.quality.detail>=1?144:88);
  const medium=reliefGeometry(112,44),distant=reliefGeometry(64,26);
  const carvingMat=carvedStoneMaterial(engine,{tint:0xb7b9ae,waterline:r.waterY,polished:0,wear:0.88,joints:0,blockSize:[1.25,0.47]},detailed.userData.heightField);
  const shadowGeometry=reliefGeometry(32,12),shadowMaterial=proceduralMaterial({name:'relief-shadow-only',params:{colorWrite:false,depthWrite:false}});
  const reliefShadow=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,16);let shadowIndex=0;
  reliefShadow.name='carved-wall-shadow-hulls';
  const placements=[];
  const carvingMeshes=[detailed,medium,distant].map((g,k)=>{
    const mesh=new THREE.InstancedMesh(g,carvingMat,16);mesh.name='carved-wall-LOD'+k;
    mesh.castShadow=false;mesh.userData.castShadow=false;mesh.userData.reflectionSkip=true;
    mesh.count=0;group.add(mesh);return mesh;
  });
  for(const side of [-1,1])for(const sign of [-1,1])for(let i=0;i<4;i++) {
    const start=sign<0?-deck-r.carvedWalls.length+i*7.5:deck+i*7.5;
    const position=new THREE.Vector3(side<0?start:start+7.5,r.waterY+0.26,z+side*(half-0.36));
    const matrix=new THREE.Matrix4().makeRotationY(side>0?Math.PI:0);matrix.setPosition(position);
    const centre=new THREE.Vector3(3.75,1.42,0).applyMatrix4(matrix);
    placements.push({matrix,centre});reliefShadow.setMatrixAt(shadowIndex++,matrix);
  }
  const updateCarvings=()=>{
    const counts=[0,0,0];
    for(const {matrix,centre} of placements){const distance=centre.distanceTo(engine.camera.position),level=distance<22?0:distance<80?1:2;
      carvingMeshes[level].setMatrixAt(counts[level]++,matrix);}
    carvingMeshes.forEach((mesh,k)=>{mesh.count=counts[k];mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();});
  };
  updateCarvings();engine.onUpdate(updateCarvings);
  group.add(reliefShadow);
  engine.add(group);const water=createRiverSurface(engine,r),boats=buildBoats(engine,r);
  const previous=engine.groundHeight?.bind(engine)||(()=>0);
  engine.groundHeight=(x,zz)=>{
    const distance=Math.abs(zz-z);
    if(Math.abs(x)<=r.halfLength&&distance<half)return r.bedY;
    if(Math.abs(x)<=r.halfLength&&distance<=half+r.quayWidth)return r.bankY;
    return previous(x,zz);
  };
  // River exclusion is split around the crossing; bridge module supplies its continuous deck.
  for(const sign of [-1,1]){
    const a=sign*deck,b=sign*r.halfLength;
    engine.footprints.addRect((a+b)/2,z,Math.abs(b-a)/2,half,0,'bianhe-water');
  }
  engine.registry.riverReflection.register(group);engine.registry.riverReflection.register(boats);
  const result={group,water,boats,plan:r};engine.registry.bianhe=result;
  console.log('[bianhe] bank geometry '+JSON.stringify(meshStats(group)));
  return result;
}

export async function test(engine) {
  if(engine.params?.get('study')==='relief') {
    const g=reliefGeometry(320,128),material=carvedStoneMaterial(engine,{polished:0,wear:0.8},g.userData.heightField);
    const backing=new THREE.Mesh(new THREE.BoxGeometry(7.5,2.84,0.35),stoneMaterial(engine,{polished:0}));
    backing.position.set(3.75,1.42,-0.175);engine.add(backing);
    const mesh=new THREE.Mesh(g,material);engine.add(mesh);
    return {views:[
      {pos:[3.75,1.42,4.8],target:[3.75,1.42,0],fov:48,near:0.05},
      {pos:[3.75,1.42,2],target:[3.75,1.42,0],fov:70,near:0.05},
      {pos:[1.2,1.6,3.8],target:[3.75,1.42,0],fov:65,near:0.05},
    ]};
  }
  await build(engine);
  return {views:[
    {pos:[-37,-0.8,410],target:[0,2.1,389],fov:63,near:0.1},
    {pos:[23.4,-1.15,392.5],target:[29.3,-1.05,387.4],fov:63,near:0.1},
    // Two metres normal to the relief face, enough to inspect its true sculptural depth.
    {pos:[26.25,-1.25,389.14],target:[26.25,-1.25,387.14],fov:70,near:0.05},
  ]};
}
