import * as THREE from 'three';
import { PALACE as P, PALACE_VIEWS } from '../world/plan.js';
import { buildHall } from '../yingzao/hall.js';
import { roofOrnaments } from '../yingzao/ornament.js';
import { GeometryBatch, meshStats } from '../yingzao/geometry.js';
import { instancePalaceTrees } from '../flora/instances.js';
import { timberMaterial } from '../materials/timber.js';
import { tileMaterial } from '../materials/tile.js';
import { plasterMaterial } from '../materials/plaster.js';
import { stoneMaterial } from '../materials/stone.js';
import { pavingMaterial } from '../materials/paving.js';
import { masonryMaterial } from '../materials/masonry.js';
import { paintMaterial } from '../yingzao/paint.js';
import { surfaceMaterial } from '../materials/shared.js';
import { bake, placed, previewShadowProxy, PlanarLOD, roofVolume } from '../palace/batch.js';
import { terrace, terraceGround, terraceCollision } from '../palace/stonework.js';
import { courtStone, courtMist } from '../palace/surfaces.js';

function materials(engine) {
  // inferred: surface wear and deterministic material variation for a maintained palace in use.
  return {
    timber: timberMaterial(engine, { baseY: P.groundY, wear: 0.8, variation: 27 }),
    bracket: paintMaterial(engine, { style: 'wucai', wear: 0.7, variation: 27 }),
    stone: stoneMaterial(engine, { joints: 1, polished: 0.2, wear: 0.7, variation: 27, tint: 0xd7e3ef }),
    plaster: plasterMaterial(engine, { baseY: P.groundY, wear: 0.8, variation: 27 }),
    tile: tileMaterial(engine, { wear: 0.35, variation: 27, tint: 0xb8ddd4 }),
    ridge: tileMaterial(engine, { ribbed: false, wear: 0.35, variation: 27, tint: 0xb8ddd4 }),
  };
}

const hallCaches=new WeakMap();
function hall(engine, entry, mats, fill = {}) {
  const spec = { ...entry, klass: 'diange', roof: 'wudian', tile: 'tongwa', rafterDiameter: 0.156,
    platform: { height: 0, margin: 0 }, interior: false, windowJambs: true,
    jiaPerSlope: 5, bayFill: { south: 'lattice', north: 'wall', east: 'wall', west: 'wall' }, ...fill };
  const {position,rotation,name,evidence,source,...geometrySpec}=spec;
  if(!hallCaches.has(engine))hallCaches.set(engine,new Map());
  const cache=hallCaches.get(engine),key=JSON.stringify(geometrySpec);
  if(!cache.has(key))cache.set(key,buildHall(geometrySpec,engine,mats));
  const model=cache.get(key),result={...model,lod0:model.lod0.clone(),lod1:model.lod1.clone(),lod2:model.lod2.clone()};
  result.entry = entry;
  return result;
}

function addOrnaments(engine, model, mats, height) {
  const ornaments = roofOrnaments(engine, model.anchors, { height });
  for (const key of ['lod0', 'lod1']) {
    ornaments[key].traverse(o => { if (o.isMesh) o.material = mats.ridge; });
    model[key].add(ornaments[key]);
  }
}

function hallCollision(fp, model, entry) {
  const angle=entry.rotation??0, c=Math.cos(angle),s=Math.sin(angle);
  for(const o of model.footprint.obstacles) {
    const x=entry.position[0]+o.x*c+o.z*s, z=entry.position[2]-o.x*s+o.z*c;
    if(o.type==='circle')fp.addCircle(x,z,o.radius,'palace-column');
    else fp.addRect(x,z,o.hw,o.hd,o.rotation+angle,'palace-infill');
  }
}

function courtPaving(engine, mist) {
  const batch=new GeometryBatch();
  // inferred: continuous service paving seven centimetres below court flags; its foundation
  // extends below the plain's relief so enclosure walls and court trees have solid ground.
  const e=P.extent,top=P.groundY-0.04;
  const base=new THREE.Mesh(new THREE.BoxGeometry(e.east-e.west,top+P.groundY,e.south-e.north),
    mist(courtStone(engine,{service:true})));
  base.name='palace-service-ground';
  base.position.set((e.east+e.west)/2,(top-P.groundY)/2,(e.south+e.north)/2);
  engine.add(base,{castShadow:false});
  // inferred: a continuous raised datum joins the rear of 宣德楼 to the gate and court.
  for(const p of [P.court,P.rearApron,...P.innerCourts])batch.box(p.center,[p.width,0.06,p.depth]);
  const paving=mist(courtStone(engine));
  const mesh=batch.mesh(paving,'palace-plain-courts');mesh.castShadow=false;
  mesh.userData.castShadow=false;engine.add(mesh);
  return mesh;
}

function innerFabric(engine, mats, gallery) {
  const levels=[new THREE.Group(),new THREE.Group(),new THREE.Group()];
  const plaster=new GeometryBatch(),brick=new GeometryBatch(),tile=new GeometryBatch();
  // inferred: low 3.2 m court partitions, 5.2 m perimeter, and masonry splash courses.
  const addWall=(a,b,height=3.2)=>{
    const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);
    brick.box([x,0.28,z],[length,2*P.groundY+0.56,0.7],angle);
    plaster.box([x,P.groundY+(height+0.56)/2,z],[length,height-0.56,0.58],angle);
    tile.box([x,P.groundY+height+0.08,z],[length,0.20,0.92],angle);
    engine.footprints.addPath([a,b],0.35,'palace-inner-wall');
  };
  const e=P.extent;
  addWall([e.west,0],[e.west,e.north],5.2);addWall([e.west,e.north],[e.east,e.north],5.2);
  addWall([e.east,e.north],[e.east,0],5.2);
  for(const court of P.innerCourts) {
    const [x,,z]=court.center,w=court.width/2,d=court.depth/2;
    for(const side of [-1,1]) {
      // inferred: plain enclosure walls, with 8 m side openings into service lanes.
      addWall([x+side*w,z-d],[x+side*w,z-4]);addWall([x+side*w,z+4],[x+side*w,z+d]);
      const n=Math.floor((court.width-12)/36);
      for(let i=0;i<n;i++) {
        const entry={position:[x+(i-(n-1)/2)*36,P.groundY,z+side*(d-3.2)],rotation:side>0?Math.PI:0};
        levels.forEach((g,l)=>g.add(placed(l===0?gallery.lod1.clone():l===1?gallery.far.clone():gallery.lod2.clone(),entry)));
      }
    }
  }
  for(const entry of P.innerHalls) {
    const model=hall(engine,{
      ...entry,frontBays:Array(entry.bays).fill(entry.bayWidth),sideBays:Array(3).fill(entry.depth/3),
      caiGrade:entry.bays===9?1:entry.bays===7?2:3,tiao:entry.eaves===2?3:2,
    },mats);
    // The four named ceremonial halls retain LOD1 roofs over walls and from the air.
    // Lesser 宫署 and galleries use silhouettes outside the inner district.
    const far=roofVolume(model,mats);
    levels.forEach((g,l)=>g.add(placed(l===0?model.lod1.clone():l===1?far:model.lod2.clone(),entry)));
    engine.footprints.addRect(entry.position[0],entry.position[2],model.footprint.hw,model.footprint.hd,0,'palace-inner-hall');
  }
  const walls=new THREE.Group();
  walls.add(plaster.mesh(mats.plaster,'palace-white-walls'));
  walls.add(brick.mesh(masonryMaterial(engine,{topY:3.88,wear:0.8,variation:27}),'palace-wall-footings'));
  walls.add(tile.mesh(mats.ridge,'palace-wall-coping'));
  levels.forEach(g=>g.add(walls.clone()));
  const lod=new PlanarLOD();lod.name='palace-inner-courts';lod.position.set(...P.innerCenter.position);
  const bakedLevels=levels.map((g,l)=>bake(g,'palace-inner-LOD'+(l+1)));
  if(engine.quality.detail<1)for(const visible of bakedLevels.slice(0,2))previewShadowProxy(visible,bakedLevels[2]);
  bakedLevels.slice(0,2).forEach((baked,l)=>{
    // Baked geometry is in world coordinates; the LOD pivot sets only its distance origin.
    // inferred: only the inner district's nearest 60 m keeps merged timber; distant roofs are silhouettes.
    baked.position.copy(lod.position).negate();lod.addLevel(baked,[0,60][l]);
  });
  return lod;
}

export async function build(engine) {
  const start=performance.now(),stages={};let last=start;
  const checkpoint=name=>{const now=performance.now();stages[name]=Math.round(now-last);last=now;};
  const mats=materials(engine),mist=courtMist(engine,P.court),root=new THREE.Group();root.name='大庆殿与宫城';
  Object.values(mats).forEach(mist);
  const models=[];
  const main=hall(engine,P.hall,mats,{
    // inferred: a deeper 副阶 gives the lower structural roof a readable slope from the court.
    surroundDepth: 5.8, surroundColumnHeight: 5.2, enclosedBrackets: true,
    bayFill:{south:['lattice','lattice','lattice','door','door','door','lattice','lattice','lattice'],
      north:'wall',east:'lattice',west:'lattice'},
  });
  addOrnaments(engine,main,mats,2.2);models.push(main);
  const hero=new PlanarLOD();hero.name='大庆殿';hero.position.set(...P.hall.position);
  const mainLevels=[main.lod0,main.lod1,main.lod2].map((g,i)=>bake(g,'daqing-hall-LOD'+i));
  if(engine.quality.detail<1) {
    // Preserve the curved LOD1 roof beds; columns and infill use their silhouette geometry.
    const shadow=new THREE.Group();
    for(const mesh of mainLevels[1].children)if(!mesh.isInstancedMesh&&mesh.material===mats.tile)shadow.add(mesh.clone());
    for(const mesh of mainLevels[2].children)if(mesh.material!==mats.tile)shadow.add(mesh.clone());
    previewShadowProxy(mainLevels[0],shadow);
  }
  // inferred: full timber inside 150 m; merged bearing bands to 600 m, silhouette beyond.
  mainLevels.forEach((g,i)=>hero.addLevel(g,[0,150,1400][i]));root.add(hero);
  hallCollision(engine.footprints,main,P.hall);
  checkpoint('hero');

  const court=new THREE.Group(),shadowCourt=new THREE.Group();court.name='palace-court-fabric';
  for(const entry of [...P.terraces,...P.towerBases]) {
    court.add(await terrace(engine,entry,mats.stone,mats.stone));
    shadowCourt.add(await terrace(engine,entry,mats.stone,mats.stone,{rails:false}));
    terraceCollision(engine.footprints,entry);
  }
  checkpoint('terraces');
  const gateFill={south:['wall','open','open','open','wall'],north:['wall','open','open','open','wall'],east:'wall',west:'wall'};
  const gateway=hall(engine,P.gate,mats,{bayFill:gateFill});
  addOrnaments(engine,gateway,mats,1.1);
  court.add(placed(gateway.lod1,P.gate));hallCollision(engine.footprints,gateway,P.gate);models.push(gateway);
  shadowCourt.add(placed(gateway.lod2,P.gate));
  for(const entry of P.sideGates) {
    const model=hall(engine,entry,mats,{bayFill:{south:['wall','open','wall'],north:['wall','open','wall'],east:'wall',west:'wall'}});
    court.add(placed(model.lod1,entry));hallCollision(engine.footprints,model,entry);models.push(model);
    shadowCourt.add(placed(model.lod2,entry));
  }
  for(const entry of P.towers) {
    const model=hall(engine,entry,mats,{bayFill:'open'});
    addOrnaments(engine,model,mats,1.1);
    // inferred: an open lower measuring pavilion and a light timber upper deck, without bells.
    const deck=new GeometryBatch();
    deck.box([0,3.3,0],[10.8,0.24,8]);
    for(const sign of [-1,1]) {
      deck.box([0,4.1,sign*3.7],[10.6,0.11,0.11]);
      deck.box([sign*5.1,4.1,0],[0.11,0.11,7.4]);
      for(let i=0;i<9;i++)deck.box([(i-4)*1.24,3.75,sign*3.7],[0.085,0.8,0.085]);
    }
    model.lod1.add(deck.mesh(mats.timber,'measuring-tower-deck'));
    court.add(placed(model.lod1,entry));hallCollision(engine.footprints,model,entry);models.push(model);
    shadowCourt.add(placed(model.lod2,entry));
  }
  const galleryModels=new Map();
  // inferred: 6 m gallery bays, 3.2 m clear depth, low six-grade open timber corridors.
  const gallery=bays=>{
    if(!galleryModels.has(bays)) galleryModels.set(bays,hall(engine,{
      frontBays:Array(bays).fill(6),sideBays:[3.2],columnHeight:3.5,caiGrade:6,tiao:1,eaves:1,
    },mats,{klass:'yuwu',roof:'xuanshan',roofClass:'tongwa_langwu',bayFill:{south:'open',north:'wall',east:'open',west:'open'}}));
    const model=galleryModels.get(bays);model.far??=roofVolume(model,mats);return model;
  };
  for(const entry of P.galleries) {
    const model=gallery(entry.bays);
    court.add(placed(model.lod1.clone(),entry));hallCollision(engine.footprints,model,entry);
    shadowCourt.add(placed(model.far.clone(),entry));
  }
  const courtMesh=bake(court,'palace-court-merged');
  const courtLow=bake(shadowCourt,'palace-court-silhouette');
  if(engine.quality.detail<1)previewShadowProxy(courtMesh,courtLow);
  const courtLOD=new PlanarLOD();courtLOD.name='palace-court';courtLOD.position.set(...P.court.center);
  // inferred: merged court architecture within 180 m of its centre; outer silhouette beyond.
  for(const [i,g]of [courtMesh,courtLow].entries()) {
    g.position.copy(courtLOD.position).negate();courtLOD.addLevel(g,[0,180][i]);
  }
  root.add(courtLOD);
  checkpoint('court');
  root.add(innerFabric(engine,mats,gallery(6)));
  checkpoint('inner');
  // Preserve simplified shadows and the non-casting paving through Engine.add's traversal.
  root.traverse(o=>{if(o.isMesh){o.userData.castShadow=o.castShadow;o.userData.receiveShadow=o.receiveShadow;}});
  engine.add(root);
  const paving=courtPaving(engine,mist);
  const previous=engine.groundHeight??(()=>0);
  engine.groundHeight=(x,z)=>{
    for(const entry of [...P.terraces].reverse().concat(P.towerBases)) {
      const y=terraceGround(entry,x,z);if(y!==null)return y;
    }
    for(const p of [P.court,P.rearApron,...P.innerCourts])
      if(Math.abs(x-p.center[0])<=p.width/2&&Math.abs(z-p.center[2])<=p.depth/2)return p.center[1]+0.03;
    if(x>=P.extent.west&&x<=P.extent.east&&z>=P.extent.north&&z<=P.extent.south)return P.groundY-0.04;
    return previous(x,z);
  };
  const trees=['huai','bai'].map(species=>instancePalaceTrees(engine,P.trees[species],{species,seed:'T7:'+species,height:species==='huai'?11:13}));
  for(const tree of trees)tree.meshes.forEach(mesh=>mist(mesh.material));
  checkpoint('pavingTrees');
  engine.registry.palace={root,hero,courtLOD,models,paving,trees,stats:mainLevels.map(meshStats),stages};
  console.log('[palace] stages ms '+JSON.stringify({...stages,total:Math.round(performance.now()-start),hallPrototypes:hallCaches.get(engine).size}));
  console.log('[palace] main hall LOD geometry '+JSON.stringify(engine.registry.palace.stats));
  console.log('[palace] court '+JSON.stringify(meshStats(courtMesh)));
  return engine.registry.palace;
}

export async function test(engine) {
  await build(engine);
  // inferred: neutral surrounding silt for isolated inspections, below the palace's paving datum.
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),surfaceMaterial(engine,'palace-test-silt',{},`
    float n=t2Fbm(cgP*0.05);t2Albedo=mix(vec3(0.09,0.083,0.065),vec3(0.16,0.145,0.11),n);t2Rough=0.96;
  `));
  ground.rotation.x=-Math.PI/2;ground.position.set(P.court.center[0],P.groundY-0.08,P.court.center[2]);
  engine.add(ground,{castShadow:false});
  return {views:['front','court','aerial','terrace','rear','gate'].map(key=>PALACE_VIEWS[key])};
}
