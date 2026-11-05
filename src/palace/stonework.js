import * as THREE from 'three';
import { GeometryBatch } from '../yingzao/geometry.js';
import { goulan } from '../yingzao/ornament.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const CHI = 0.312;
const simplifiedRails=new Map(),modifier=new SimplifyModifier();
let railTemplate;

function template(engine) {
  if(!railTemplate) {
    const model=goulan(engine,{path:[[0,0,0],[7*CHI,0,0]]});
    railTemplate=model.lod1;
    model.lod0.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  }
  return railTemplate;
}

async function railPaths(engine,paths,material) {
  const panels=[],posts=[],unit=template(engine),root=new THREE.Group();
  for(const path of paths) {
    for(let k=1;k<path.length;k++) {
      const a=new THREE.Vector3(...path[k-1]),b=new THREE.Vector3(...path[k]);
      const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/(7*CHI));
      for(let i=0;i<n;i++) {
        const p=a.clone().lerp(b,i/n),q=a.clone().lerp(b,(i+1)/n),d=q.clone().sub(p),horizontal=Math.hypot(d.x,d.z);
        panels.push(new THREE.Matrix4().set(d.x/(7*CHI),0,-d.z/horizontal,p.x,
          d.y/(7*CHI),1,0,p.y,d.z/(7*CHI),0,d.x/horizontal,p.z,0,0,0,1));
        posts.push(new THREE.Matrix4().makeTranslation(p.x,p.y,p.z));
      }
    }
    const a=path[0],b=path.at(-1);
    if(new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b))>1e-6)posts.push(new THREE.Matrix4().makeTranslation(...b));
  }
  for(const source of unit.children) {
    const geometry=engine.quality.detail<1?await previewRail(source.geometry,source.name):source.geometry;
    const matrices=source.name==='rail-panels'?panels:posts;
    const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);mesh.name=source.name;
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;
    mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
  }
  return root;
}

async function previewRail(geometry,name) {
  if(!simplifiedRails.has(name))simplifiedRails.set(name,(async()=>{
    // inferred: preview collapses half the bevel facets on the public goulan output.
    // World-space stone uses no UV seams. Keep each remaining face flat and the full members intact.
    const source=geometry.clone();source.deleteAttribute('normal');source.deleteAttribute('uv');
    const welded=mergeVertices(source);
    const reduced=await modifier.modify(welded,Math.floor(welded.attributes.position.count*0.5));
    const result=reduced.toNonIndexed();result.computeVertexNormals();result.computeBoundingSphere();
    source.dispose();welded.dispose();reduced.dispose();return result;
  })());
  return simplifiedRails.get(name);
}

export async function terrace(engine, entry, material, railMaterial, { rails = true } = {}) {
  const root = new THREE.Group(), stone = new GeometryBatch();
  root.name = '殿阶基';
  const [x, y, z] = entry.center, { width: w, depth: d, height: h } = entry;
  // 卷三: five-尺 stage, five-寸 exposed moulding courses, one-尺 waist.
  // inferred: symmetric seven-course profile; plain 壸门 recesses, without invented dragon panels.
  const profile = [1, 0.96, 0.92, 0.88, 0.92, 0.96, 1];
  const heights = [0.156, 0.156, 0.312, 0.312, 0.312, 0.156, 0.156];
  let yy = y;
  profile.forEach((s, i) => {
    stone.box([x, yy + heights[i] / 2, z], [w - (1-s)*4, heights[i], d - (1-s)*4]);
    yy += heights[i];
  });
  for (const side of [-1, 1]) {
    const n = Math.ceil(w / (3 * CHI));
    for (let i = 0; i <= n; i++) stone.box([x-w/2+i*w/n, y+0.78, z+side*(d/2-0.20)], [0.13,0.312,0.18]);
  }
  const front = z + d/2, run = h * 2, topY = y + h;
  const paths = [];
  let left = x - w/2 + 0.16;
  for (const center of entry.stairs) {
    const a = center-entry.stairWidth/2-0.20, b = center+entry.stairWidth/2+0.20;
    paths.push([[left,topY,front-0.16],[a,topY,front-0.16]]);
    left = b;
    // 卷三: two five-寸 risers per 尺 of height, each tread one 尺 deep.
    const steps = Math.round(h/(CHI/2));
    for (let i=0;i<steps;i++) {
      const rise=(i+1)*CHI/2;
      stone.box([center,y+rise/2,front+run-(i+0.5)*CHI],[entry.stairWidth,rise,CHI]);
    }
    for (const sign of [-1,1]) {
      const xx=center+sign*(entry.stairWidth/2+0.18);
      paths.push([[xx,y,front+run],[xx,topY,front]]);
    }
  }
  paths.push([[left,topY,front-0.16],[x+w/2-0.16,topY,front-0.16],
    [x+w/2-0.16,topY,z-d/2+0.16],[x-w/2+0.16,topY,z-d/2+0.16],
    [x-w/2+0.16,topY,front-0.16]]);
  root.add(stone.mesh(material, 'palace-stage-stone'));
  // Shared public API supplies 望柱, 云栱 and 华版; use its simplified relief for this large complex.
  if (rails) root.add(await railPaths(engine,paths,railMaterial));
  return root;
}

export function terraceGround(entry, x, z) {
  const [cx,y,cz]=entry.center, front=cz+entry.depth/2;
  if (Math.abs(x-cx)<=entry.width/2 && Math.abs(z-cz)<=entry.depth/2) return y+entry.height;
  for(const sx of entry.stairs) if(Math.abs(x-sx)<=entry.stairWidth/2 && z>=front && z<=front+entry.height*2) {
    const steps=Math.round(entry.height/(CHI/2));
    return y+Math.min(steps,Math.floor((front+entry.height*2-z)/CHI)+1)*CHI/2;
  }
  return null;
}

export function terraceCollision(fp, entry) {
  const [x,,z]=entry.center, front=z+entry.depth/2, w=entry.width/2, d=entry.depth/2;
  const edge=(a,b)=>fp.addPath([a,b],0.17,'palace-terrace-edge');
  edge([x-w,front],[x-w,z-d]);edge([x-w,z-d],[x+w,z-d]);edge([x+w,z-d],[x+w,front]);
  let left=x-w;
  for(const sx of entry.stairs) {
    edge([left,front],[sx-entry.stairWidth/2,front]);
    left=sx+entry.stairWidth/2;
    for(const sign of [-1,1])edge([sx+sign*entry.stairWidth/2,front],[sx+sign*entry.stairWidth/2,front+entry.height*2]);
  }
  edge([left,front],[x+w,front]);
}
