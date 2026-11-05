import * as THREE from 'three';
import * as PLAN from '../world/plan.js';
import { proceduralMaterial } from '../core/materials.js';
import { floraMaterials } from '../flora/materials.js';
import { instanceTrees } from '../flora/instances.js';
import { instanceLotus, instanceGrass, instancePetals } from '../flora/groundcover.js';
import { addCranes, build as buildCranes } from './cranes.js';

export { buildWillow, buildBlossom, buildPalaceTree } from '../flora/trees.js';
export { buildLotus, buildGrass } from '../flora/groundcover.js';
export { instanceTrees, instanceWillows, instanceBlossoms, instancePalaceTrees } from '../flora/instances.js';
export { instanceLotus, instanceGrass, instancePetals } from '../flora/groundcover.js';

// inferred: soft river reflections use the same trees' distant silhouettes,
// split into bark and canopy. The reflection baker keeps standard attributes only.
function bankReflection(engine,batches) {
  const reflection=engine.registry.riverReflection;
  if(!reflection)return null;
  const group=new THREE.Group();group.name='bank-willow-reflection-silhouettes';
  for(const tree of batches)for(const wood of [true,false]) {
    const source=tree.model.lod2,kind=source.attributes.aFlora,indices=[];
    for(let i=0;i<source.index.count;i+=3) {
      const a=source.index.getX(i);
      if((kind.getX(a)<0.5)===wood)indices.push(a,source.index.getX(i+1),source.index.getX(i+2));
    }
    const geometry=source.clone();geometry.setIndex(indices);
    const material=proceduralMaterial({name:wood?'willow-reflection-bark':'willow-reflection-canopy',params:{color:wood?0x756b53:0x819268,roughness:0.92}});
    const mesh=new THREE.InstancedMesh(geometry,material,tree.items.length);
    tree.items.forEach((item,i)=>mesh.setMatrixAt(i,item.matrix));group.add(mesh);
  }
  reflection.register(group);return group;
}

// inferred: use the reserved bank rows as anchors, bringing roots onto each
// quay. Keep the bridge approaches and tower foundations open, and
// interpolate long gaps into a continuous river planting at at most eight quay
// widths. These world-space offsets apply along both banks, in every view.
function bankPlanting() {
  const river=PLAN.BIANHE,bridge=PLAN.ZHOUQIAO;
  const positions=[];
  for(const south of [false,true])for(const east of [false,true]) {
    // inferred: the north bank needs extra room around its twin towers; the
    // south row can approach the crossing beside the narrower bridge landing.
    const clearance=bridge.dimensions.width/2+river.quayWidth*(south?1.5:2)+(south?1.5:4);
    const row=(PLAN.WILLOWS?.positions??[])
      .filter(p=>(p[2]>river.center[2])===south && (p[0]>river.center[0])===east)
      .map(p=>[river.center[0]+(east?1:-1)*Math.max(clearance,Math.abs(p[0]-river.center[0])-river.quayWidth*(south?3:2)),
        river.bankY,river.center[2]+(south?1:-1)*(river.width/2+river.quayWidth*(south?0.30:0.55))])
      .sort((a,b)=>a[0]-b[0]);
    row.forEach((p,i)=>{
      if(i) {
        const previous=row[i-1],steps=Math.ceil((p[0]-previous[0])/(river.quayWidth*8));
        for(let k=1;k<steps;k++)positions.push([THREE.MathUtils.lerp(previous[0],p[0],k/steps),p[1],p[2]]);
      }
      positions.push(p);
    });
  }
  return positions;
}

/** Plant reserved banks and reuse court planting already built by their owners. */
export async function build(engine) {
  if(engine.registry.flora?.built)return engine.registry.flora;
  const materials=floraMaterials(engine),trees=[],banks=bankPlanting();
  // inferred: old willows beside the bridge have taller, wider crowns than
  // distant bank trees, with branches extending naturally above the river.
  // Roots follow the reserved rows with the quay offsets above.
  for(const near of [true,false])for(const south of [false,true]) {
    const positions=banks.filter(p=>(Math.abs(p[0]-PLAN.BIANHE.center[0])<100)===near && (p[2]>PLAN.BIANHE.center[2])===south);
    if(positions.length)trees.push(instanceTrees(engine,'willow',positions,{seed:`bianhe:${south?'south':'north'}:${near?'old':'row'}`,height:near?14:11,crownWidth:near?1.85:1,materials}));
  }
  const palace=engine.registry.palace?.trees;
  if(!palace && PLAN.PALACE?.trees)for(const species of ['huai','bai']) {
    const positions=PLAN.PALACE.trees[species];
    if(positions?.length)trees.push(instanceTrees(engine,species,positions,{seed:'palace:'+species,height:species==='huai'?11:13,materials}));
  }
  const plan=PLAN.FLORA;
  if(plan) {
    for(const row of plan.trees??[])trees.push(instanceTrees(engine,row.species,row.positions,{...row,materials}));
    if(plan.lotus?.length)instanceLotus(engine,plan.lotus,{materials});
    if(plan.grass?.length)instanceGrass(engine,plan.grass,{materials});
    for(const scatter of plan.petals??[])instancePetals(engine,scatter.positions,{species:scatter.species,materials});
  }
  const cranes=await buildCranes(engine),city=engine.registry.city?.flora;
  const reflectedBanks=bankReflection(engine,trees.filter(t=>t.stats.species==='willow'));
  const palaceTrees=palace??trees.filter(t=>['huai','bai'].includes(t.stats.species));
  const summary={bankWillows:banks.length,bankBatches:trees.filter(t=>t.stats.species==='willow').length,
    palaceTrees:palaceTrees.reduce((sum,t)=>sum+t.stats.instances,0),cityTrees:city?.stats?.instances??0,cranes:cranes?.group?.userData.cranes?.count??0};
  engine.registry.flora={built:true,trees,materials,cranes,reflection:reflectedBanks,courts:{palace:palaceTrees,city},summary};
  console.log('[flora] '+JSON.stringify(summary));
  return engine.registry.flora;
}

export async function test(engine) {
  // inferred: isolated laboratory layout, not city coordinates. Every fixture exists
  // for every view; cameras only observe it, never choose or change scene content.
  const materials=floraMaterials(engine),trees=[];
  const add=(species,positions,options={})=>{const t=instanceTrees(engine,species,positions,{materials,collision:false,...options});trees.push(t);return t;};
  add('willow',[[0,0,0]],{seed:'hero-willow',height:9});
  add('willow',Array.from({length:14},(_,i)=>[1000+(i-6.5)*10,0,0]),{seed:'willow-row',height:9});
  const species=['peach','plum','pear','apricot'];
  species.forEach((sp,i)=>add(sp,[[2000+(i-1.5)*6,0,0]],{seed:'blossom-'+sp,height:6}));
  const row=Array.from({length:100},(_,i)=>[3000,0,i*8]);
  for(let k=0;k<2;k++) add(k?'pear':'peach',row.filter((_,i)=>i%2===k),{seed:'avenue-'+k,height:6});
  add('huai',[[3994,0,0]],{seed:'court-huai',height:10});
  add('bai',[[4006,0,0]],{seed:'court-bai',height:13});
  const rng=engine.rng('flora-test-scatter'),lotus=[];
  for(let i=0;i<500 && lotus.length<28;i++) {
    const p=[5000+rng.range(-2.8,2.8),0.035+rng.range(0,0.008),rng.range(-2.8,2.8)];
    if(lotus.every(q=>Math.hypot(p[0]-q[0],p[2]-q[2])>0.75)) lotus.push(p);
  }
  instanceLotus(engine,lotus,{materials});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(7,7),proceduralMaterial({
    name:'flora-test-water',params:{color:0x596e5e,roughness:0.22,metalness:0.12},
    uniforms:{uFloraTime:materials.time},head:'uniform float uFloraTime;',
    normal:'cgBump = vec3(sin(cgP.x*18.0+uFloraTime*0.4)*0.025,0.0,cos(cgP.z*21.0-uFloraTime*0.3)*0.025);',
  }));
  water.rotation.x=-Math.PI/2;water.position.set(5000,0.03,0);engine.add(water,{castShadow:false});
  instancePetals(engine,Array.from({length:60},()=>[5000+rng.range(-3.3,3.3),0.04,rng.range(-3.3,3.3)]),{materials});
  // Sparse rooted weeds along actual joints in the test paving, plus willow root weeds.
  const weeds=[];
  for(let i=0;i<100;i++) {
    const [x,z]=rng.disk();weeds.push([x*3,0.005,z*3]);
  }
  for(let i=0;i<50;i++) weeds.push([2000+Math.round(rng.range(-12,12)/0.8)*0.8,0.005,rng.range(-3,3)]);
  instanceGrass(engine,weeds,{materials});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(18000,18000),proceduralMaterial({
    name:'flora-test-plain',params:{roughness:0.96},
    color:/* glsl */`
      float n = cgVnoise2(cgP.xz * 0.7);
      diffuseColor.rgb=mix(vec3(0.105,0.09,0.06),vec3(0.17,0.15,0.10),n);
      if(cgP.x>1984.0 && cgP.x<2016.0 && abs(cgP.z)<5.0) {
        vec2 cell=abs(fract(cgP.xz/vec2(0.8,0.6))-0.5);
        float joint=smoothstep(0.47-fwidth(cell.x),0.49,max(cell.x,cell.y));
        diffuseColor.rgb=mix(vec3(0.19,0.2,0.18)*(0.9+0.16*n),vec3(0.065),joint);
      }
    `,
  }));
  ground.rotation.x=-Math.PI/2;ground.position.set(3000,-0.005,0);engine.add(ground,{castShadow:false});
  const cranes=addCranes(engine,{center:[6000,0,0],radius:10,height:20,perches:[[5993,8,0],[6007,8,0]]});
  // Neutral test perches make toe contact inspectable; these are not roof ornaments.
  const perchMaterial=proceduralMaterial({name:'crane-test-perch',params:{color:0x716956,roughness:0.9}});
  for(const x of [5993,6007]) {
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.2,8,8),perchMaterial);post.position.set(x,4,0);engine.add(post);
  }
  const bird=cranes.positions.slice(0,18).reduce((outer,p)=>Math.hypot(p.x-6000,p.z)>Math.hypot(outer.x-6000,outer.z)?p:outer).clone();
  const birdViewOffset=new THREE.Vector3(bird.x-6000,-2,bird.z).normalize().multiplyScalar(15);
  const views=[
    {pos:[0,3,12],target:[0,4.5,0],fov:56},
    {pos:[1000,4,60],target:[1000,4,0],fov:50},
    {pos:[2000,3,15],target:[2000,3.2,0],fov:62},
    {pos:[3016,5,-150],target:[3000,3,150],fov:35},
    {pos:[4000,4,25],target:[4000,6,0],fov:56},
    {pos:[5000,2.2,3.3],target:[5000,0,0],fov:62,near:0.05},
    {pos:[1.2,1.6,1.6],target:[0,6.1,0],fov:78,near:0.05},
    {pos:[6005,8,12],target:[6000,20,0],fov:35,near:0.1},
    // inferred: a side/underside anatomy inspection, exactly 15 m from an
    // existing flying crane. The same twenty fixtures exist in every view.
    {pos:bird.clone().add(birdViewOffset).toArray(),target:bird.toArray(),fov:24,near:0.1,time:engine.time},
    {pos:[0,3,-12],target:[0,4.5,0],fov:56,near:0.1},
    {pos:[6007,8.85,13],target:[5993,8.85,0],fov:18,near:0.1},
  ];
  engine.registry.flora={trees,views,cranes};
  console.log('[flora] geometry budgets '+JSON.stringify(trees.map(t=>({species:t.stats.species,lodTriangles:t.stats.lodTriangles}))));
  return {views};
}
