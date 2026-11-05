import * as THREE from 'three';
import { CITY } from '../world/plan.js';
import { buildHall } from '../yingzao/hall.js';
import { GeometryBatch } from '../yingzao/geometry.js';
import { colorGeometry, packedGeometry, mergePacked, disposeHall } from './batch.js';

// inferred: the text locates the named institutions but gives no compound plans.
// Six linked courts per institution use the shared hall rules at real bay sizes.
export function officeLayout() {
  return CITY.offices.map((office,index)=>{
    const buildings=[],courts=[],p=CITY.officeFabric;
    for(let row=0;row<p.rows.length;row++)for(let col=0;col<p.columns.length;col++) {
      const x=p.columns[col],z=p.rows[row]*office.halfDepth/p.referenceHalfDepth,principal=col===1&&row===0;
      const add=(kind,dx,dz,yaw=0)=>buildings.push({kind,position:[x+dx,0,z+dz],yaw});
      add(principal?'principal':'hall',0,-p.northOffset);
      add('gate',0,p.southOffset);
      for(const sign of [-1,1])add('range',sign*p.wingOffset,p.wingZ,Math.PI/2);
      courts.push({position:[x+p.treeOffset[0]*(index%2?1:-1),0,z+p.treeOffset[1]],principal});
    }
    return {...office,buildings,courts};
  });
}

export function buildOffices(engine,material,blocks) {
  const p=CITY.officeFabric,layouts=officeLayout(),group=new THREE.Group(),prototypes={};
  group.name='avenue-office-compounds';
  for(const [kind,spec]of Object.entries(CITY.officeModels)) {
    const hall=buildHall(spec,engine),middle=new THREE.Group();
    // Preserve the shared curved roof bed and the inexpensive ridge; buried
    // frames use LOD2, rather than stretching a tiny hall over a large empty yard.
    for(const m of hall.lod2.children)if(m.name!=='tile')middle.add(m.clone());
    for(const m of hall.lod1.children)if(m.name==='tile')middle.add(m.clone());
    prototypes[kind]=[packedGeometry(hall.lod1),packedGeometry(middle),packedGeometry(hall.lod2)];
    disposeHall(hall);
  }
  const shadowMatrices=[],stats={compounds:layouts.length,buildings:0,roofArea:0,lods:[]},trees=[];
  for(const office of layouts) {
    const lod=new THREE.LOD();lod.name=office.name;lod.position.set(office.position[0],p.surfaceY,office.position[2]);
    const surfaces=new GeometryBatch(),walls=new GeometryBatch();
    // inferred: small coursed courts are connected by central passages and side
    // galleries. The surrounding avenue and the 180 m cross street stay open.
    surfaces.box([0,.025,0],[office.halfWidth*2,.05,office.halfDepth*2]);
    for(const sign of [-1,1])walls.box([sign*office.halfWidth,1.1,0],[.36,2.2,office.halfDepth*2]);
    walls.box([0,1.1,-office.halfDepth],[office.halfWidth*2,2.2,.36]);
    for(const sign of [-1,1])walls.box([sign*(office.halfWidth+p.entranceWidth/2)/2,1.1,office.halfDepth],
      [office.halfWidth-p.entranceWidth/2,2.2,.36]);
    const floor=surfaces.geometry(),wall=walls.geometry();
    // inferred: neutral cool-grey dressed court stone, warmed by the lighting.
    const finishes=[colorGeometry(floor,new THREE.Color().setRGB(.235,.25,.27),4),colorGeometry(wall,new THREE.Color().setRGB(.39,.38,.33))];floor.dispose();wall.dispose();
    const finish=mergePacked(finishes);
    for(let level=0;level<3;level++) {
      const models=Object.values(prototypes).map(levels=>levels[level]),geometries=[...models,finish];
      const mesh=new THREE.BatchedMesh(office.buildings.length+1,
        geometries.reduce((n,g)=>n+g.attributes.position.count,0),geometries.reduce((n,g)=>n+g.index.count,0),material);
      mesh.sortObjects=false;mesh.perObjectFrustumCulled=false;
      const ids=Object.fromEntries(Object.keys(prototypes).map((kind,i)=>[kind,mesh.addGeometry(models[i])]));
      const entries=[];let triangles=finish.index.count/3;
      for(const building of office.buildings) {
        const [x,y,z]=building.position,m=new THREE.Matrix4().makeRotationY(building.yaw);m.setPosition(x,y,z);
        mesh.setMatrixAt(mesh.addInstance(ids[building.kind]),m);entries.push(m);
        triangles+=prototypes[building.kind][level].index.count/3;
      }
      mesh.addInstance(mesh.addGeometry(finish));mesh.computeBoundingSphere();
      mesh.name='city-offices-LOD'+level;mesh.castShadow=false;mesh.userData.castShadow=false;
      mesh.userData.cityTriangles=triangles;mesh.userData.cityOfficeMatrices=entries;
      lod.addLevel(mesh,p.lodDistances[level]);
    }
    finish.dispose();group.add(lod);stats.lods.push(lod.levels.map(l=>l.object.userData.cityTriangles));
    // inferred: inexpensive hulls occupy the enclosed roof volume. Their small
    // setback keeps long rectangular proxy shadows inside the actual eave line.
    for(const building of office.buildings) {
      const g=prototypes[building.kind][2];g.computeBoundingBox();const b=g.boundingBox,size=b.getSize(new THREE.Vector3());
      const [x,,z]=building.position,h=b.max.y;
      shadowMatrices.push(new THREE.Matrix4().compose(new THREE.Vector3(office.position[0]+x,p.surfaceY+h/2,office.position[2]+z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),building.yaw),new THREE.Vector3(size.x*.90,h,size.z*.88)));
      stats.roofArea+=size.x*size.z;stats.buildings++;
    }
    // inferred: three mature huai form a small grove inside each open court.
    for(const c of office.courts)for(const [dx,dz]of [[0,0],[-3,3],[3,4]])
      trees.push([office.position[0]+c.position[0]+dx,p.surfaceY+.05,office.position[2]+c.position[2]+dz]);
    engine.footprints.addRect(office.position[0],office.position[2],office.halfWidth,office.halfDepth,0,'city-office:'+office.name);
  }
  for(const models of Object.values(prototypes))models.forEach(g=>g.dispose());
  // Existing low walls around common-house blocks share one static batch.
  const walls=new GeometryBatch();
  for(const b of blocks)if(!b.outer) {
    const y=CITY.surfaceY+.7;
    for(const sign of [-1,1])walls.box([b.x+sign*b.hw,y,b.z],[.24,1.4,b.hd*2]);
    walls.box([b.x,y,b.z-b.hd],[b.hw*2,1.4,.24]);
    for(const sign of [-1,1])walls.box([b.x+sign*(b.hw+1.2)/2,y,b.z+b.hd],[b.hw-1.2,1.4,.24]);
  }
  const raw=walls.geometry(),geometry=colorGeometry(raw,new THREE.Color().setRGB(.18,.19,.18));raw.dispose();
  const blockWalls=new THREE.Mesh(geometry,material);blockWalls.castShadow=false;blockWalls.userData.castShadow=false;group.add(blockWalls);
  engine.add(group,{castShadow:false});
  const shadow=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}),shadowMatrices.length);
  shadow.name='office-shadow-hulls';shadowMatrices.forEach((m,i)=>shadow.setMatrixAt(i,m));shadow.instanceMatrix.needsUpdate=true;shadow.computeBoundingSphere();
  engine.add(shadow,{receiveShadow:false});
  console.log('[city-offices] '+JSON.stringify(stats));
  return {group,shadow,trees,layouts,stats};
}
