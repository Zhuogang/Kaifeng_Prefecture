import * as THREE from 'three';
import { floraMaterials } from './materials.js';
import { buildWillow, buildBlossom, buildPalaceTree, BLOSSOMS } from './trees.js';
import { instancePetals } from './groundcover.js';

/** Scatter one species. Entries are [x,y,z] or {position, scale, yaw, tint,
 * width, density, phase, tilt:[x,z]}. World callers supply plan.js positions.
 * LOD is distance-based in every camera, including moving explore cameras.
 */
export function instanceTrees(engine, species, positions, { seed = species, height, crownWidth, collision = true, petals = true, materials = floraMaterials(engine) } = {}) {
  // inferred: bounded size/width/tint/phase variation and a small branch-shape warp.
  const rng=engine.rng('flora:'+seed);
  const builder=species==='willow'?buildWillow:BLOSSOMS[species]?buildBlossom:buildPalaceTree;
  const model=builder({seed,species,height,crownWidth,rng:engine.rng('flora-model:'+seed)});
  const n=positions.length, group=new THREE.Group();
  group.name='flora:'+species;
  const items=positions.map((entry,i)=>{
    const o=Array.isArray(entry)?{position:entry}:entry;
    if(!o.position || o.position.length!==3 || !o.position.every(Number.isFinite)) throw new Error('Flora position must be [x,y,z]');
    const scale=o.scale??rng.range(0.88,1.12), width=o.width??rng.range(0.84,1.15), yaw=o.yaw??rng.range(0,Math.PI*2);
    const p=new THREE.Vector3(...o.position), q=new THREE.Quaternion().setFromEuler(new THREE.Euler(o.tilt?.[0]??0,yaw,o.tilt?.[1]??0));
    const matrix=new THREE.Matrix4().compose(p,q,new THREE.Vector3(scale*width,scale,scale*width));
    const tint=o.tint?new THREE.Color(...o.tint):new THREE.Color().setRGB(rng.range(0.88,1.08),rng.range(0.9,1.06),rng.range(0.88,1.04));
    if(collision) engine.footprints?.addCircle(p.x,p.z,model.height*scale*(species==='willow'?0.065:0.035),'flora:'+species+':'+i);
    return {p,matrix,tint,variation:[o.phase??rng.range(0,Math.PI*2),o.density??rng.range(0.78,1),rng.range(-1,1),scale]};
  });
  const meshes=[model.lod0,model.lod1,model.lod2].map((base,l)=>{
    const geometry=base.clone();
    geometry.setAttribute('iFlora',new THREE.InstancedBufferAttribute(new Float32Array(n*4),4).setUsage(THREE.DynamicDrawUsage));
    const mesh=new THREE.InstancedMesh(geometry,materials.surface,n);
    mesh.name=species+':lod'+l;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.customDepthMaterial=materials.depth;
    mesh.count=0;
    group.add(mesh);
    return mesh;
  });
  const counts=[0,0,0];
  const stats={species,instances:n,lodTriangles:[model.lod0,model.lod1,model.lod2].map(g=>g.userData.triangles),counts,triangles:0,calls:0};
  let last=[];
  const update=()=>{
    const p=engine.camera.position;
    if(last[0]===p.x && last[1]===p.y && last[2]===p.z) return;
    last=[p.x,p.y,p.z]; counts.fill(0);
    // inferred: LOD thresholds 36/230 m at preview, 52/320 m in still quality.
    const detail=engine.quality.detail??0.5, near=detail>=1?52:36, far=detail>=1?320:230;
    for(const item of items) {
      const d=item.p.distanceTo(p), l=d<near?0:d<far?1:2, k=counts[l]++, m=meshes[l];
      m.setMatrixAt(k,item.matrix); m.setColorAt(k,item.tint);
      m.geometry.attributes.iFlora.set(item.variation,k*4);
    }
    meshes.forEach((m,l)=>{
      m.count=counts[l]; m.visible=m.count>0;
      m.instanceMatrix.needsUpdate=true;
      if(m.instanceColor) m.instanceColor.needsUpdate=true;
      m.geometry.attributes.iFlora.needsUpdate=true;
      if(m.count) m.computeBoundingSphere();
    });
    stats.triangles=counts.reduce((sum,count,l)=>sum+count*stats.lodTriangles[l],0);
    stats.calls=counts.filter(Boolean).length;
  };
  // Scene matrix updates happen BEFORE shadow traversal and render-list construction.
  // No onBeforeRender sentinel, so there is no frame of stale LODs or stale shadows.
  group.updateMatrixWorld=function(force){update();THREE.Group.prototype.updateMatrixWorld.call(this,force);};
  group.userData.flora=stats;
  engine.add(group);
  let petalScatter = null;
  if (BLOSSOMS[species] && petals && n) {
    // inferred: sparse fallen petals within the crown's drip line, on the caller's ground.
    const fallen = [], count = Math.round(96 * (engine.quality.density ?? 0.45));
    for (const item of items) for (let i = 0; i < count; i++) {
      const [dx, dz] = rng.disk(), radius = model.height * item.variation[3] * 0.48;
      const x = item.p.x + dx * radius, z = item.p.z + dz * radius;
      fallen.push([x, (engine.groundHeight?.(x,z) ?? item.p.y) + 0.008, z]);
    }
    petalScatter = instancePetals(engine, fallen, { species, seed: 'petals:' + seed, materials });
    stats.petalTriangles = fallen.length * petalScatter.geometry.userData.triangles;
    stats.petalCalls = fallen.length ? 1 : 0;
  }
  update();
  return {group,model,items,meshes,stats,update,petalScatter};
}

export const instanceWillows=(engine,positions,options)=>instanceTrees(engine,'willow',positions,options);
export const instanceBlossoms=(engine,positions,{species='peach',...options}={})=>instanceTrees(engine,species,positions,options);
export const instancePalaceTrees=(engine,positions,{species='huai',...options}={})=>instanceTrees(engine,species,positions,options);
