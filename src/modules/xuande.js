import * as THREE from 'three';
import { XUANDE as P, XUANDE_VIEWS, YUJIE } from '../world/plan.js';
import { GeometryBatch, meshStats } from '../yingzao/geometry.js';
import { buildHall } from '../yingzao/hall.js';
import { roofOrnaments, chazi } from '../yingzao/ornament.js';
import { timberMaterial } from '../materials/timber.js';
import { masonryMaterial } from '../materials/masonry.js';
import { forecourtMaterial } from '../materials/forecourt.js';
import { pavingMaterial } from '../materials/paving.js';
import { plasterMaterial } from '../materials/plaster.js';
import { metalMaterial } from '../materials/metal.js';
import { tileMaterial } from '../materials/tile.js';
import { paintMaterial } from '../yingzao/paint.js';
import { addFrieze } from '../yingzao/relief.js';
import { surfaceMaterial } from '../materials/shared.js';
import { addCranes } from './cranes.js';

const matrix = (position, angle = 0) => new THREE.Matrix4().makeRotationY(angle).setPosition(...position);
const rect = (x0,x1,z0,z1) => [[x0,z0],[x1,z0],[x1,z1],[x0,z1]];

// Eight corners define battered masonry, including straight tapering gate reveals.
function block(batch, bottom, top, y0, y1) {
  const pos = [...bottom.map(([x,z]) => [x,y0,z]), ...top.map(([x,z]) => [x,y1,z])];
  const faces = [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
  const v=[], idx=[];
  for (const face of faces) {
    const offset=v.length/3; for(const k of face)v.push(...pos[k]);
    idx.push(offset,offset+2,offset+1,offset,offset+3,offset+2);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  g.setIndex(idx);g.computeVertexNormals();batch.add(g);g.dispose();
}

function platform(batch, p, openings = null) {
  const [x,,z]=p.center, w=p.width/2,d=p.depth/2, h=p.height,b=p.batter;
  const corners=(y,l=-w,r=w)=>rect(x+l+(l===-w?b*y:0),x+r-(r===w?b*y:0),z-d+b*y,z+d-b*y);
  if(!openings) { block(batch,corners(0),corners(h),0,h);return; }
  let left=-w;
  for(let i=0;i<=openings.centers.length;i++) {
    const right=i===openings.centers.length?w:openings.centers[i]-openings.width/2;
    const topLeft=i===0?left:left-(openings.width-openings.topWidth)/2;
    const topRight=i===openings.centers.length?right:right+(openings.width-openings.topWidth)/2;
    block(batch,corners(0,left,right),corners(openings.height,topLeft,topRight),0,openings.height);
    left=i===openings.centers.length?w:openings.centers[i]+openings.width/2;
  }
  block(batch,corners(openings.height),corners(h),openings.height,h);
}

function railing(batch,path,height=1.15,detail=true) {
  // inferred: vermilion 勾阑 with 望柱, two rails, open 华版 and small 云栱 below the handrail.
  for(let k=1;k<path.length;k++) {
    const a=new THREE.Vector3(...path[k-1]),b=new THREE.Vector3(...path[k]),length=a.distanceTo(b),n=Math.ceil(length/(detail?2.184:4.368));
    const direction=b.clone().sub(a).normalize();
    for(let i=0;i<n;i++) {
      const p=a.clone().lerp(b,i/n),q=a.clone().lerp(b,(i+1)/n);
      for(const h of (detail?[0.16,0.68,1.04]:[0.16,1.04]))batch.beam(p.clone().add(new THREE.Vector3(0,h,0)).toArray(),q.clone().add(new THREE.Vector3(0,h,0)).toArray(),0.105,0.095);
      if(detail)for(let j=1;j<5;j++) {
        const v=p.clone().lerp(q,j/5);batch.beam([v.x,v.y+0.18,v.z],[v.x,v.y+0.68,v.z],0.055);
      }
      for(const t of [0,...(i===n-1?[1]:[])]) {
        const v=p.clone().lerp(q,t);batch.beam(v.toArray(),[v.x,v.y+height,v.z],0.16);
        batch.box([v.x,v.y+height-0.04,v.z],[0.23,0.08,0.23]);
        batch.beam([v.x,v.y+height,v.z],[v.x,v.y+height+0.12,v.z],0.17,0.17,detail?8:4);
      }
      const center=p.clone().lerp(q,0.5);
      if(detail)for(const sign of [-1,1])batch.beam(center.clone().addScaledVector(direction,sign*0.30).add(new THREE.Vector3(0,0.88,0)).toArray(),[center.x,center.y+0.73,center.z],0.075);
    }
  }
}

const centreDoor = P.doors.centers[Math.floor(P.doors.centers.length/2)];
const passageHalfWidth = P.doors.topWidth/2-0.25;
const passageBack = P.platform.center[2]-P.platform.depth/2;
const passageFront = P.platform.center[2]+P.platform.depth/2;
// inferred: six-millimetre clearance above the avenue's millimetric stone relief; the passage falls gently
// to the palace's existing apron datum. Dimensions derive from the shared plan, not a camera.
const forecourtY = YUJIE.surfaceY+0.006;
const forecourtEnd=P.forecourt.center[2]+P.forecourt.depth/2;
const fenceInner=Math.min(...P.fences.flatMap(path=>path.map(p=>Math.abs(p[0]))));
// inferred: an opening three doorway widths wide admits the processional approach within the enclosure.
const fencePaths=P.fences.map(path=>path.map(([x,,z])=>[Math.abs(x)===fenceInner?Math.sign(x)*P.doors.width*1.5:x,forecourtY,z]));
function passageY(z) {
  const t=THREE.MathUtils.clamp((passageFront-z)/P.platform.depth,0,1);
  return THREE.MathUtils.lerp(forecourtY,P.forecourt.center[1]+0.06,t);
}

function doors(batches, lod) {
  const p=P.doors,base=forecourtY+0.035,h=p.height-base-0.12;
  for(const x of p.centers) {
    const open=x===centreDoor,half=open?p.topWidth/2-0.13:p.width/2-0.035;
    for(const sign of [-1,1]) {
      const wood=new GeometryBatch(),gold=new GeometryBatch(),iron=new GeometryBatch();
      const n=lod===0?6:1;
      // inferred: each central leaf swings inward by a quarter turn, lying along its jamb.
      // Closed leaves keep their paired six-board construction and nine rows of gilt studs.
      for(let i=0;i<n;i++)wood.box([-sign*(i+0.5)*half/n,h/2,0],[half/n-0.009,h,0.20]);
      for(const y of [0.17,h*0.33,h*0.67,h-0.17])wood.box([-sign*half/2,y,-0.14],[half,0.16,0.16]);
      if(lod===0) {
        for(let row=0;row<9;row++)for(let col=0;col<4;col++) {
          const g=new THREE.SphereGeometry(1,12,8);g.scale(0.064,0.064,0.039);
          g.translate(-sign*(0.24+col*(half-0.48)/3),0.24+row*(h-0.48)/8,0.14);gold.add(g);g.dispose();
        }
        const u=-sign*(half-0.25),y=h*0.47;
        const ring=new THREE.TorusGeometry(0.135,0.025,6,18);ring.translate(u,y-0.1,0.22);gold.add(ring);ring.dispose();
        iron.box([u,y,0.14],[0.23,0.30,0.035]);
      }
      const m=matrix([x+sign*half,base,-p.recess],open?-sign*Math.PI/2:0);
      for(const [batch,target]of [[wood,batches.door],[gold,batches.gold],[iron,batches.iron]])if(batch.indices.length){const g=batch.geometry();target.add(g,m);g.dispose();}
    }
    batches.door.box([x,p.height+0.16,-0.67],[p.width+0.8,0.38,0.65]);
  }
}

function passage(batches,lod) {
  // Flat timber lintels and a complete lining follow 清明上河图's gate. The plank sizes,
  // frame spacing and 0.12 m lining thickness are inferred, rather than measured remains.
  const top=P.doors.height-0.15,span=P.doors.topWidth-0.2,depth=P.platform.depth;
  const floor=new THREE.PlaneGeometry(span,depth,1,8);floor.rotateX(-Math.PI/2);
  const a=floor.attributes.position;
  for(let i=0;i<a.count;i++){const z=a.getZ(i)+P.platform.center[2];a.setXYZ(i,a.getX(i)+centreDoor,passageY(z),z);}
  floor.computeVertexNormals();batches.forecourt.add(floor);floor.dispose();
  batches.passage.box([centreDoor,top,P.platform.center[2]],[span,0.18,depth]);
  const retreat=(P.doors.width-P.doors.topWidth)/2;
  for(const sign of [-1,1]) {
    const bottomX=centreDoor+sign*(P.doors.width/2-0.08),topX=centreDoor+sign*(P.doors.width/2-retreat-0.08);
    block(batches.passage,rect(bottomX-0.06,bottomX+0.06,passageBack,passageFront),
      rect(topX-0.06,topX+0.06,passageBack,passageFront),passageY(passageFront),top);
  }
  if(lod<2)for(let z=passageFront-0.6;z>passageBack;z-=3.0) {
    for(const sign of [-1,1])batches.passage.beam([centreDoor+sign*(span/2-0.06),passageY(z),z],
      [centreDoor+sign*(span/2-0.06),top-0.16,z],0.18,0.22);
    batches.passage.box([centreDoor,top-0.17,z],[span,0.24,0.28]);
  }
}

function wall(batches, lod) {
  const p=P.wall,edge=Math.max(...P.wingPlatforms.map(w=>Math.abs(w.center[0])+w.width/2));
  const limits=[-p.extent,p.gates[0]-p.gateWidth/2,p.gates[0]+p.gateWidth/2,-edge,
    edge,p.gates[1]-p.gateWidth/2,p.gates[1]+p.gateWidth/2,p.extent];
  for(let i=0;i<limits.length;i+=2) {
    const a=limits[i],b=limits[i+1];
    batches.masonry.box([(a+b)/2,p.height/2,p.centerZ],[b-a,p.height,p.depth]);
    batches.lime.box([(a+b)/2,p.height-0.08,p.centerZ],[b-a,0.16,p.depth+0.2]);
    if(lod<2)batches.ridge.box([(a+b)/2,p.height+0.12,p.centerZ],[b-a,0.22,p.depth+0.36]);
  }
  for(const x of p.gates) {
    batches.door.box([x,3.15,p.centerZ],[p.gateWidth,6.3,0.22]);
    batches.masonry.box([x,6.75,p.centerZ],[p.gateWidth,0.9,p.depth]);
    batches.door.box([x,6.4,p.centerZ+p.depth/2],[p.gateWidth+0.6,0.32,0.5]);
    batches.ridge.box([x,p.height+0.12,p.centerZ],[p.gateWidth,0.22,p.depth+0.36]);
  }
}

function structure(mats,lod) {
  const group=new THREE.Group();group.name=`xuande-masonry-LOD${lod}`;
  const batches=Object.fromEntries(Object.keys(mats).map(k=>[k,new GeometryBatch()]));
  platform(batches.masonry,P.platform,P.doors);
  for(const p of P.wingPlatforms)platform(batches.masonry,p);
  for(const p of [P.platform,...P.wingPlatforms]) {
    batches.paving.box([p.center[0],p.height+0.018,p.center[2]],[p.width-p.batter*p.height*2,0.035,p.depth-p.batter*p.height*2]);
    // inferred: stone cap and lime course crown the battered platform.
    batches.lime.box([p.center[0],p.height-0.17,p.center[2]],[p.width-1.6,0.3,p.depth-1.6]);
  }
  doors(batches,lod);passage(batches,lod);wall(batches,lod);
  if(lod<2) {
    const rail=path=>railing(batches.timber,path,1.15,lod===0);
    const main=P.platform, inset=main.batter*main.height+0.2;
    const halfW=main.width/2-inset, front=main.center[2]+main.depth/2-inset, rear=main.center[2]-main.depth/2+inset;
    rail([[-halfW,12.05,front],[halfW,12.05,front]]);
    rail([[-halfW,12.05,rear],[halfW,12.05,rear]]);
    for(const p of P.wingPlatforms) {
      const sign=Math.sign(p.center[0]),inner=p.center[0]-sign*(p.width/2-inset),outer=p.center[0]+sign*(p.width/2-inset);
      const forward=p.center[2]+p.depth/2-inset,back=p.center[2]-p.depth/2+inset;
      const stair=P.stairs.find(s=>Math.sign(s.x)===sign),outward=stair.x+sign*(stair.width/2-0.13);
      rail([[inner,12.05,front],[inner,12.05,forward],[outer,12.05,forward],[outer,12.05,stair.z]]);
      rail([[outer,12.05,stair.z-18],[outer,12.05,back]]);
      rail([[outer,12.05,stair.z-18],[outward,12.05,stair.z-18],[outward,12.05,stair.z]]);
    }
    for(const stair of P.stairs) {
      const steps=Math.ceil(stair.rise/0.16);
      for(let i=0;i<steps;i++) {
        const h=stair.rise*(i+1)/steps,z=stair.z+stair.run*(1-(i+0.5)/steps);
        batches.masonry.box([stair.x,h/2,z],[stair.width,h,stair.run/steps]);
      }
      for(const sign of [-1,1])rail([[stair.x+sign*(stair.width/2-0.13),0.1,stair.z+stair.run],[stair.x+sign*(stair.width/2-0.13),12,stair.z]]);
      batches.paving.box([stair.x,12.02,stair.z-9],[stair.width,0.04,18]);
      // inferred: a timber landing bridges the stair head to the wing walk, supported at two bays.
      for(const z of [stair.z-4,stair.z-14]) {
        batches.timber.beam([stair.x,0,z],[stair.x,11.8,z],0.42,0.42,8);
        batches.timber.box([stair.x,11.84,z],[stair.width,0.28,0.28]);
      }
    }
    const fr=P.frieze;
    for(const p of [P.platform,...P.wingPlatforms])for(const sign of [-1,1]) {
      const z=p.center[2]+sign*(p.depth/2-p.batter*fr.centerY);
      batches.reliefBed.box([p.center[0],fr.centerY,z],[p.width-2,fr.height,0.10]);
      for(const y of [fr.centerY-fr.height/2,fr.centerY+fr.height/2])batches.carving.box([p.center[0],y,z+sign*0.04],[p.width-1.8,0.12,0.20]);
    }
  }
  addFrieze(group,[P.platform,...P.wingPlatforms],P.frieze,mats.carving,lod);
  for(const [name,batch]of Object.entries(batches))if(batch.indices.length)group.add(batch.mesh(mats[name],name));
  return group;
}

function materials(engine) {
  return {
    passage:timberMaterial(engine,{baseY:forecourtY,color:0x705342,grainAxis:[0,0,1],wear:0.8}),
    timber:timberMaterial(engine,{baseY:12,wear:0.8}),door:timberMaterial(engine,{baseY:0,wear:0.85,variation:3}),
    window:timberMaterial(engine,{variant:'unpainted',color:0x40372c,wear:0.6,baseY:12}),
    bracket:paintMaterial(engine,{style:'wucai',wear:0.8}),
    masonry:masonryMaterial(engine,{topY:12,batter:0.08,variation:11,coursePeriod:2.496,courseHeight:0.156}),
    lime:plasterMaterial(engine,{wear:0.5}),plaster:plasterMaterial(engine,{baseY:12,variation:8}),
    paving:pavingMaterial(engine,{ruts:0,drains:0,variation:4}),
    forecourt:forecourtMaterial(engine,{variation:4}),
    reliefBed:surfaceMaterial(engine,'frieze-recess',{variation:19},`
      float n=t2Fbm(cgP*1.2+t2Variation);
      t2Albedo=mix(vec3(0.125,0.12,0.105),vec3(0.21,0.20,0.17),n);t2Rough=0.96;t2Height=(n-0.5)*0.002;
    `),
    carving:surfaceMaterial(engine,'carved-warm-grey-stone',{variation:17},`
      float n=t2Fbm(cgP*3.0+t2Variation);
      t2Albedo=mix(vec3(0.19,0.185,0.165),vec3(0.34,0.325,0.28),n);
      t2Rough=0.94;t2Height=(n-0.5)*0.003;
      float groove=step(5.5,vReliefKind);
      t2Albedo*=mix(1.0,0.48,groove);t2Occlusion=mix(0.92,0.55,groove);
      t2Height+=(n-0.5)*0.001;
    `,{vertexHead:'attribute float memberType; varying float vReliefKind;',
      vertexPre:'vReliefKind=memberType;',head:'varying float vReliefKind;',attributes:{memberType:[0]}}),
    gold:metalMaterial(engine,{wear:0.7}),iron:metalMaterial(engine,{variant:'iron'}),
    tile:tileMaterial(engine,{wear:0.7}),ridge:tileMaterial(engine,{ribbed:false,wear:0.8}),
  };
}

// Merge static members by material; keep every repeating bracket, motif and fence instanced.
// This is an all-world construction pass, independent of validation cameras.
function bakeComplex(source) {
  source.updateMatrixWorld(true);
  const lod=new THREE.LOD();lod.name='xuande-complex';
  for(let level=0;level<3;level++) {
    const batches=new Map(),instances=new Map(),group=new THREE.Group();
    const visit=o=>{
      if(o.isLOD){visit(o.levels[Math.min(level,o.levels.length-1)].object);return;}
      if(o.isMesh) {
        if(o.isInstancedMesh) {
          const g=o.geometry;g.computeBoundingBox();
          const key=o.material.uuid+':'+(g.userData.batchKey??[o.name,g.attributes.position.count,g.boundingBox.min.toArray(),g.boundingBox.max.toArray()].join(':'));
          if(!instances.has(key))instances.set(key,{geometry:g,material:o.material,name:o.name,matrices:[]});
          const entry=instances.get(key),m=new THREE.Matrix4();
          for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);entry.matrices.push(o.matrixWorld.clone().multiply(m));}
        } else {
          const key=o.material.uuid;if(!batches.has(key))batches.set(key,{batch:new GeometryBatch(),material:o.material,name:o.name,cast:false});
          const e=batches.get(key);e.batch.add(o.geometry,o.matrixWorld);e.cast ||= o.castShadow;
        }
      }
      for(const child of o.children)visit(child);
    };
    visit(source);
    for(const {batch,material,name,cast}of batches.values()){const m=batch.mesh(material,name);m.castShadow=cast;group.add(m);}
    for(const e of instances.values()) {
      const mesh=new THREE.InstancedMesh(e.geometry,e.material,e.matrices.length);mesh.name=e.name;
      e.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;
      mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
    }
    group.userData.stats=meshStats(group);lod.addLevel(group,[0,230,600][level]);
  }
  return lod;
}

function previewShadows(complex,engine) {
  if(engine.quality.detail>=1)return;
  // Preview uses the same building's LOD1 for shadow silhouettes. Full visible LOD0 is retained.
  // High stills keep every tile and socket in their shadow passes.
  const proxy=new THREE.Group();proxy.name='preview-shadow-casters';
  const invisible=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  invisible.userData.noPatch=true;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  for(const original of complex.levels[1].object.children) {
    if(!original.castShadow)continue;
    const m=original.clone();m.material=invisible;m.customDepthMaterial=depth;m.receiveShadow=false;proxy.add(m);
  }
  for(const original of complex.levels[0].object.children) {
    const geometry=original.geometry?.userData.shadowGeometry;
    if(geometry){
      const m=original.clone();m.geometry=geometry;m.material=invisible;m.customDepthMaterial=depth;
      m.castShadow=true;m.receiveShadow=false;m.computeBoundingSphere();proxy.add(m);
    }
    original.castShadow=false;
  }
  complex.levels[0].object.add(proxy);
}

function registerCollision(engine,halls) {
  const fp=engine.footprints;
  // Retire only the calibration box's occupancy, preserving other agents' registrations.
  fp.items=fp.items.filter(item=>item.tag!=='calibration-box');
  for(const [key,items]of fp.grid)fp.grid.set(key,items.filter(item=>item.tag!=='calibration-box'));
  const edge=(a,b,tag='xuande-edge')=>fp.addPath([a,b],0.12,tag);
  const p=P.platform,half=p.width/2;
  let left=-half;
  for(const x of [...P.doors.centers,half+P.doors.width/2]) {
    const right=x-P.doors.width/2;
    edge([left,0],[right,0],'xuande-pier');left=x+P.doors.width/2;
  }
  // inferred: height-blind occupancy closes passage mouths, leaving the walk above the recessed leaves clear.
  for(const x of P.doors.centers)if(x!==centreDoor)fp.addRect(x,-P.platform.batter*P.doors.height,P.doors.width/2,0.14,0,'xuande-closed-passage');
  for(const sign of [-1,1])fp.addRect(centreDoor+sign*(P.doors.topWidth/2-0.13),
    -P.doors.recess-(P.doors.topWidth/2-0.13)/2,0.18,(P.doors.topWidth/2-0.13)/2,0,'xuande-open-leaf');
  const back=p.center[2]-p.depth/2+0.96;
  for(const z of [back,-0.96])for(const [a,b]of [[-half,centreDoor-passageHalfWidth],[centreDoor+passageHalfWidth,half]])edge([a,z],[b,z]);
  for(const sign of [-1,1])edge([centreDoor+sign*(passageHalfWidth+0.20),passageBack],
    [centreDoor+sign*(passageHalfWidth+0.20),passageFront],'xuande-passage-jamb');
  for(const w of P.wingPlatforms) {
    const sign=Math.sign(w.center[0]),stair=P.stairs.find(s=>Math.sign(s.x)===sign);
    const inner=w.center[0]-sign*(w.width/2-1.16),outer=w.center[0]+sign*(w.width/2-1.16);
    const front=w.center[2]+w.depth/2-1.16,rear=w.center[2]-w.depth/2+1.16;
    edge([inner,0],[inner,front]);edge([inner,front],[outer,front]);edge([outer,front],[outer,stair.z]);
    edge([outer,stair.z-18],[outer,rear]);edge([inner,rear],[outer,rear]);
    const out=stair.x+sign*(stair.width/2-0.13);
    edge([outer,stair.z-18],[out,stair.z-18]);edge([out,stair.z-18],[out,stair.z]);
    for(const x of [stair.x-stair.width/2,stair.x+stair.width/2])edge([x,stair.z],[x,stair.z+stair.run]);
  }
  for(const path of fencePaths)fp.addPath(path.map(p=>[p[0],p[2]]),0.08,'xuande-chazi');
  for(const sign of [-1,1])fp.addRect(sign*(P.wall.extent+60)/2,P.wall.centerZ,(P.wall.extent-60)/2,P.wall.depth/2,0,'palace-wall');
  for(const {hall,entry}of halls)for(const obstacle of hall.footprint.obstacles) {
    const point=new THREE.Vector3(obstacle.x,0,obstacle.z).applyMatrix4(matrix(entry.position,entry.rotation??0));
    if(obstacle.type==='circle')fp.addCircle(point.x,point.z,obstacle.radius,'xuande-column');
    else {
      const angle=obstacle.rotation+(entry.rotation??0),c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
      const hx=c*obstacle.hw+s*obstacle.hd,hz=s*obstacle.hw+c*obstacle.hd;
      // Upper-hall infill is above this open tunnel, not a ground-level obstruction.
      if(point.z+hz>passageBack&&point.z-hz<passageFront&&point.x-hx<centreDoor+passageHalfWidth&&point.x+hx>centreDoor-passageHalfWidth) {
        for(const [a,b]of [[point.x-hx,Math.min(point.x+hx,centreDoor-passageHalfWidth)],
          [Math.max(point.x-hx,centreDoor+passageHalfWidth),point.x+hx]])if(b>a)fp.addRect((a+b)/2,point.z,(b-a)/2,hz,0,'xuande-infill');
      } else fp.addRect(point.x,point.z,obstacle.hw,obstacle.hd,angle,'xuande-infill');
    }
  }
}

export async function build(engine) {
  const mats=materials(engine),root=new THREE.Group();root.name='宣德楼';
  const lod=new THREE.LOD();lod.name='xuande-platform';
  // inferred: distance thresholds retain full detail across the whole forecourt.
  for(let i=0;i<3;i++)lod.addLevel(structure(mats,i),[0,230,600][i]);root.add(lod);
  const halls=[];
  for(const entry of [P.hall,...P.elbows,...P.wings,...P.towers]) {
    const spec={...entry,klass:'diange',roof:'wudian',eaves:1,tile:'tongwa',rafterDiameter:0.156,jiaPerSlope:5,
      platform:{height:0,margin:0},interior:false,enclosedBrackets:true,windowJambs:true,bayFill:{south:'lattice',north:'wall',east:'wall',west:'wall'}};
    const hall=buildHall(spec,engine,{timber:mats.timber,bracket:mats.bracket,stone:mats.masonry,plaster:mats.plaster,window:mats.window,tile:mats.tile,ridge:mats.ridge});
    const ornaments=roofOrnaments(engine,hall.anchors,{height:entry===P.hall?2.6:1.5});
    for(const group of [ornaments.lod0,ornaments.lod1])group.traverse(o=>{if(o.isMesh)o.material=mats.ridge;});
    hall.lod0.add(ornaments.lod0);hall.lod1.add(ornaments.lod1);
    const l=new THREE.LOD();l.name='xuande-timber';l.position.set(...entry.position);l.rotation.y=entry.rotation??0;
    l.addLevel(hall.lod0,0);l.addLevel(hall.lod1,230);l.addLevel(hall.lod2,600);root.add(l);halls.push({hall,lod:l,entry});
  }
  const apron=new THREE.Mesh(new THREE.BoxGeometry(P.forecourt.width,0.06,P.forecourt.depth),mats.paving);
  apron.name='xuande-forecourt';apron.position.set(...P.forecourt.center);apron.castShadow=false;root.add(apron);
  // A laid stone court meets the avenue at the existing vermilion enclosure. Its thin finish
  // clears the avenue paving, leaving the two canals and planted banks open at their plan widths.
  const end=forecourtEnd;
  for(const [x0,x1]of [[-YUJIE.section.edge,-YUJIE.section.bank],[-YUJIE.section.road,YUJIE.section.road],[YUJIE.section.bank,YUJIE.section.edge]]) {
    const laid=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,0.035,end-passageFront),mats.forecourt);
    laid.position.set((x0+x1)/2,forecourtY-0.0175,(end+passageFront)/2);laid.castShadow=false;
    laid.name='xuande-laid-forecourt';root.add(laid);
  }
  for(const path of fencePaths) {
    const fence=chazi(engine,{path});
    for(const group of [fence.lod0,fence.lod1])group.traverse(o=>{if(o.isMesh)o.material=mats.door;});
    const l=new THREE.LOD();l.addLevel(fence.lod0,0);l.addLevel(fence.lod1,230);root.add(l);
  }
  // Replace the T0 calibration object once real architecture occupies its ground.
  if(engine.registry.calibrationBox)engine.registry.calibrationBox.visible=false;
  const complex=bakeComplex(root);previewShadows(complex,engine);
  // Engine.add honours explicit per-mesh flags through userData.
  complex.traverse(o=>{if(o.isMesh){o.userData.castShadow=o.castShadow;o.userData.receiveShadow=o.receiveShadow;}});
  engine.add(complex);
  registerCollision(engine,halls);
  const previous=engine.groundHeight??(()=>0);
  engine.groundHeight=(x,z)=>{
    if(Math.abs(x-centreDoor)<passageHalfWidth&&z>=passageBack&&z<=passageFront)return passageY(z);
    for(const p of [P.platform,...P.wingPlatforms])if(Math.abs(x-p.center[0])<p.width/2-p.batter*p.height&&Math.abs(z-p.center[2])<p.depth/2-p.batter*p.height)return p.height+0.035;
    for(const s of P.stairs){
      if(Math.abs(x-s.x)<s.width/2&&z>=s.z-18&&z<=s.z)return s.rise+0.04;
      if(Math.abs(x-s.x)<s.width/2&&z>=s.z&&z<=s.z+s.run)return Math.max(P.forecourt.center[1]+0.03,s.rise*(1-Math.floor((z-s.z)/(s.run/Math.ceil(s.rise/0.16)))/Math.ceil(s.rise/0.16)));
    }
    if(z>=passageFront&&z<=forecourtEnd&&(Math.abs(x)<YUJIE.section.road||Math.abs(x)>YUJIE.section.bank)&&Math.abs(x)<=YUJIE.section.edge)return forecourtY;
    if(Math.abs(x-P.forecourt.center[0])<=P.forecourt.width/2&&Math.abs(z-P.forecourt.center[2])<=P.forecourt.depth/2)return P.forecourt.center[1]+0.03;
    return previous(x,z);
  };
  const main=halls[0];
  const perches=main.hall.anchors.chiwei.map(a=>new THREE.Vector3(...a.position).add(new THREE.Vector3(0,2.30,0)).applyMatrix4(matrix(P.hall.position)).toArray());
  // inferred: flock orbits 27 m above the hall base, on a 27 m radius; perches derive from the ridge.
  addCranes(engine,{center:P.hall.position,radius:27,height:27,perches});
  const stats=complex.levels.map(l=>meshStats(l.object));
  engine.registry.xuande={root:complex,halls,platform:lod,stats};
  console.log('[xuande] complex geometry '+JSON.stringify(stats));
  return engine.registry.xuande;
}

export async function test(engine) {
  await build(engine);
  // inferred: neutral flat surroundings for isolated inspections outside the paved forecourt.
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),surfaceMaterial(engine,'xuande-test-silt',{},`
    float n=t2Fbm(cgP*0.04);t2Albedo=mix(vec3(0.085,0.077,0.058),vec3(0.16,0.14,0.10),n);t2Rough=0.96;
  `));
  ground.rotation.x=-Math.PI/2;ground.position.y=-0.03;engine.add(ground,{castShadow:false});
  return {views:['front','roof','side','rear','door','terrace','aerial'].map(key=>XUANDE_VIEWS[key])};
}
