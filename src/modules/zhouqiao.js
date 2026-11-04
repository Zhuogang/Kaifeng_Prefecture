import * as THREE from 'three';
import { ZHOUQIAO, BIANHE } from '../world/plan.js';
import { GeometryBatch, meshStats } from '../yingzao/geometry.js';
import { buildHall } from '../yingzao/hall.js';
import { stoneMaterial } from '../materials/stone.js';
import { proceduralMaterial } from '../core/materials.js';
import { masonryMaterial } from '../materials/masonry.js';
import { timberMaterial } from '../materials/timber.js';
import { plasterMaterial } from '../materials/plaster.js';
import { tileMaterial } from '../materials/tile.js';
import { paintMaterial } from '../yingzao/paint.js';
import { roofOrnaments } from '../yingzao/ornament.js';
import { addStonePier } from '../water/stonework.js';
import { build as buildRiver } from './bianhe.js';

export function deckHeight(z) {
  const p=ZHOUQIAO,t=Math.abs(z-p.center[2])/(p.dimensions.span/2);
  return p.endY+p.camber*Math.max(0,1-t*t);
}

// inferred: plain rectangular 望柱, 华版 and cloud brackets, reconstructed in stone
// rather than Qing marble. The 4 尺 rail height follows 营造法式 卷三.
function balustrade(batch,points) {
  const H=4*0.312;
  for(let i=0;i<points.length;i++) {
    const p=points[i];batch.box([p[0],p[1]+H/2,p[2]],[0.25,H,0.25]);
    batch.box([p[0],p[1]+H+0.015,p[2]],[0.33,0.13,0.33]);
    if(!i)continue;
    const a=points[i-1],b=p;
    for(const [y,w,d] of [[0.16,0.18,0.25],[0.97,0.14,0.17]])batch.beam([a[0],a[1]+y,a[2]],[b[0],b[1]+y,b[2]],w,d);
    batch.beam([a[0],a[1]+0.45,a[2]],[b[0],b[1]+0.45,b[2]],0.47,0.10);
    // Cloud-shaped corbels beneath the upper rail, at each upright.
    for(const t of [0.16,0.84]){
      const x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t,y=a[1]+(b[1]-a[1])*t;
      batch.beam([x,y+0.68,z],[x,y+0.91,z],0.18,0.16,8);
    }
  }
}

export async function build(engine) {
  if(engine.registry.zhouqiao)return engine.registry.zhouqiao;
  const p=ZHOUQIAO,r=BIANHE,z=p.center[2],half=p.dimensions.span/2,w=p.dimensions.width;
  const group=new THREE.Group();group.name='zhouqiao-flat-stone-bridge';
  const structure=new GeometryBatch(),paving=new GeometryBatch(),rails=new GeometryBatch();
  // Slightly cambered slabs over a dense rectangular grid of bluestone columns.
  for(let j=0;j<=10;j++)for(let i=0;i<=12;i++) {
    const x=-w/2+i*p.pierSpacing,zz=z-half+j*p.pierSpacing,top=deckHeight(zz)-p.deckThickness-0.35;
    addStonePier(structure,x,zz,r.bedY,top,i+j*13);
  }
  for(let j=0;j<=10;j++) {
    const zz=z-half+j*p.pierSpacing,y=deckHeight(zz)-p.deckThickness;
    structure.box([0,y-0.17,zz],[w+0.48,0.34,0.78]);
  }
  const sections=50;
  for(let j=0;j<sections;j++) {
    const a=z-half+j*p.dimensions.span/sections,b=a+p.dimensions.span/sections;
    const y=deckHeight((a+b)/2);
    structure.box([0,y-p.deckThickness/2,(a+b)/2],[w,p.deckThickness,b-a+0.002]);
  }
  // Real square bluestone pavers, with fine open joints and subtly rounded dressed edges
  // supplied by their material. Each course conforms to the same continuous deck function.
  // inferred: 0.75 m square stones and 7 mm joints; the source specifies square paving only.
  for(let i=0;i<40;i++)for(let j=0;j<34;j++) {
    const x=-w/2+(i+0.5)*w/40,zz=z-half+(j+0.5)*p.dimensions.span/34;
    paving.box([x,deckHeight(zz)+p.pavingThickness/2,zz],[w/40-0.007,p.pavingThickness,p.dimensions.span/34-0.007]);
  }
  for(const side of [-1,1]) {
    const zz=z+side*half;
    const g=new THREE.PlaneGeometry(w,p.approach,40,16).rotateX(-Math.PI/2),pos=g.attributes.position;
    for(let i=0;i<pos.count;i++) {
      const t=(pos.getZ(i)+p.approach/2)/p.approach;
      const x=pos.getX(i),endZ=zz+side*p.approach;
      const endY=engine.groundHeight?.(x,endZ)??r.bankY;
      pos.setXYZ(i,x,p.endY+p.pavingThickness+(endY-p.endY-p.pavingThickness)*t,zz+side*t*p.approach);
    }
    if(side<0)g.setIndex(Array.from(g.index.array).map((_,i,a)=>a[i%3===1?i+1:i%3===2?i-1:i]));
    g.computeVertexNormals();paving.add(g);g.dispose();
  }
  for(const side of [-1,1]) {
    const points=Array.from({length:13},(_,i)=>{const zz=z-half+i*p.dimensions.span/12;return [side*(w/2-0.10),deckHeight(zz)+0.06,zz];});
    balustrade(rails,points);
  }
  for(const side of [-1,1])for(const sign of [-1,1]) {
    const points=Array.from({length:16},(_,i)=>[sign*(w/2+i*2),0.45,z+side*(half+0.40)]);
    balustrade(rails,points);
  }
  const stone=stoneMaterial(engine,{tint:0xb9bcb7,waterline:r.waterY,polished:0.3,wear:0.9});
  group.add(structure.mesh(stone,'stone-columns-and-beams'),rails.mesh(stone,'stone-goulan'));
  const deckMesh=paving.mesh(stoneMaterial(engine,{waterline:r.waterY,polished:0.8,wear:0.7}),'square-cambered-paving');
  deckMesh.castShadow=false;deckMesh.userData.castShadow=false;group.add(deckMesh);
  engine.add(group);
  const halls=[];
  const mats={timber:timberMaterial(engine),bracket:paintMaterial(engine,{style:'danfen'}),stone:masonryMaterial(engine,{topY:1.1}),
    plaster:plasterMaterial(engine),tile:tileMaterial(engine,{variant:'green'}),ridge:tileMaterial(engine,{variant:'green',ribbed:false})};
  const hall=buildHall(p.towerSpec,engine,mats);
  const ornaments=roofOrnaments(engine,hall.anchors,{height:0.85});
  hall.lod0.add(engine.quality.detail>=1?ornaments.lod0:ornaments.lod1);
  if(engine.quality.detail>=1)hall.lod1.add(ornaments.lod1);
  const pairLOD=new THREE.LOD();pairLOD.name='twin-north-bank-que';
  pairLOD.position.set(0,p.quetowers.positions[0][1],p.quetowers.positions[0][2]);
  const sources=[hall.lod0,hall.lod1,hall.lod2];
  const shadow=new GeometryBatch();
  for(let level=0;level<3;level++) {
    const batches=new Map(),source=sources[level],built=new THREE.Group();source.updateMatrixWorld(true);
    source.traverse(o=>{
      if(!o.isMesh)return;
      if(!batches.has(o.material))batches.set(o.material,new GeometryBatch());
      for(const position of p.quetowers.positions) {
        const placement=new THREE.Matrix4().makeTranslation(position[0],position[1]-pairLOD.position.y,position[2]-pairLOD.position.z);
        const world=placement.multiply(o.matrixWorld);
        for(let i=0;i<(o.isInstancedMesh?o.count:1);i++) {
          const instance=new THREE.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(i,instance);
          const matrix=world.clone().multiply(instance);
          batches.get(o.material).add(o.geometry,matrix);
          if(level===2)shadow.add(o.geometry,matrix);
        }
      }
    });
    for(const [material,batch] of batches){const mesh=batch.mesh(material,'paired-que-'+material.name);mesh.castShadow=false;mesh.userData.castShadow=false;built.add(mesh);}
    pairLOD.addLevel(built,[0,90,300][level]);
  }
  // inferred: inexpensive complete silhouette shadow hull, independent of the active camera.
  // Detailed timber and tile retain lighting; their thousands of internal faces need no shadow draws.
  const shadowMaterial=proceduralMaterial({name:'que-shadow-hull',params:{colorWrite:false,depthWrite:false}});
  pairLOD.add(shadow.mesh(shadowMaterial,'que-shadow-hulls'));engine.add(pairLOD);engine.onUpdate(()=>pairLOD.update(engine.camera));
  for(const position of p.quetowers.positions) {
    for(const c of hall.footprint.obstacles) {
      if(c.type==='circle')engine.footprints.addCircle(c.x+position[0],c.z+position[2],c.radius,'que-column');
      else engine.footprints.addRect(c.x+position[0],c.z+position[2],c.hw,c.hd,c.rotation,'que-wall');
    }
    halls.push({hall,lod:pairLOD,position});
  }
  const previous=engine.groundHeight?.bind(engine)||(()=>0);
  engine.groundHeight=(x,zz)=>{
    if(Math.abs(x)<=w/2&&Math.abs(zz-z)<=half)return deckHeight(zz)+p.pavingThickness;
    const d=Math.abs(zz-z)-half;
    if(Math.abs(x)<=w/2&&d>=0&&d<=p.approach) {
      const endZ=z+Math.sign(zz-z)*(half+p.approach);
      return p.endY+p.pavingThickness+(previous(x,endZ)-p.endY-p.pavingThickness)*d/p.approach;
    }
    for(const {hall,position} of halls){
      const dx=Math.abs(x-position[0]),dz=Math.abs(zz-position[2]),f=hall.footprint,steps=Math.ceil(f.platformHeight/0.16);
      if(dx<=f.hw&&dz<=f.hd)return position[1]+f.platformHeight;
      if(dx<=p.towerSpec.frontBays[1]/2&&dz>f.hd&&dz<f.hd+steps*0.32)
        return position[1]+f.platformHeight*(steps-Math.floor((dz-f.hd)/0.32))/steps;
    }
    return previous(x,zz);
  };
  // Continuous rail collision excludes the deck's open north/south entrances.
  for(const side of [-1,1])engine.footprints.addRect(side*(w/2-0.1),z,0.16,half,0,'bridge-goulan');
  for(const side of [-1,1])for(const sign of [-1,1])engine.footprints.addRect(sign*(w/2+r.carvedWalls.length/2),z+side*(half+0.4),r.carvedWalls.length/2,0.16,0,'bank-goulan');
  engine.registry.riverReflection?.register(group);engine.registry.riverReflection?.register(pairLOD);
  const result={group,halls,deckEnds:p.deckEnds,deckHeight};engine.registry.zhouqiao=result;
  console.log('[zhouqiao] bridge '+JSON.stringify(meshStats(group))+' towers '+JSON.stringify(halls.map(h=>h.hall.stats)));
  return result;
}

export async function test(engine) {
  await buildRiver(engine);await build(engine);
  return {views:[
    {pos:[-37,-0.8,410],target:[0,2.1,389],fov:63,near:0.1},
    {pos:[23.4,-1.15,392.5],target:[29.3,-1.05,387.4],fov:63,near:0.1},
    {pos:[0,deckHeight(409)+1.648,409],target:[0,2,375],fov:65,near:0.1},
    {pos:[26.25,-1.25,389.14],target:[26.25,-1.25,387.14],fov:70,near:0.05},
    {pos:[52,25,440],target:[0,-0.5,400],fov:62,near:0.1},
  ]};
}
