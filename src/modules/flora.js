import * as THREE from 'three';
import * as PLAN from '../world/plan.js';
import { proceduralMaterial } from '../core/materials.js';
import { floraMaterials } from '../flora/materials.js';
import { instanceTrees } from '../flora/instances.js';
import { instanceLotus, instanceGrass, instancePetals } from '../flora/groundcover.js';
import { addCranes } from './cranes.js';

export { buildWillow, buildBlossom, buildPalaceTree } from '../flora/trees.js';
export { buildLotus, buildGrass } from '../flora/groundcover.js';
export { instanceTrees, instanceWillows, instanceBlossoms, instancePalaceTrees } from '../flora/instances.js';
export { instanceLotus, instanceGrass, instancePetals } from '../flora/groundcover.js';

/** World integration consumes only plan.js placement; no invented city coordinates here.
 * Optional FLORA={trees:[{species,positions,seed,height}],lotus:[positions],
 * grass:[positions],petals:[{species,positions}]}.
 */
// inferred: FLORA integration schema for lead-supplied placements; no default city coordinates.
export async function build(engine) {
  const plan=PLAN.FLORA,materials=floraMaterials(engine),trees=[];
  if(plan) {
    for(const row of plan.trees??[]) trees.push(instanceTrees(engine,row.species,row.positions,{...row,materials}));
    if(plan.lotus?.length) instanceLotus(engine,plan.lotus,{materials});
    if(plan.grass?.length) instanceGrass(engine,plan.grass,{materials});
    for(const scatter of plan.petals??[]) instancePetals(engine,scatter.positions,{species:scatter.species,materials});
  }
  engine.registry.flora={trees,pending:plan?null:'plan.js FLORA placements not yet supplied'};
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
  const views=[
    {pos:[0,3,12],target:[0,4.5,0],fov:56},
    {pos:[1000,4,60],target:[1000,4,0],fov:50},
    {pos:[2000,3,15],target:[2000,3.2,0],fov:62},
    {pos:[3016,5,-150],target:[3000,3,150],fov:35},
    {pos:[4000,4,25],target:[4000,6,0],fov:56},
    {pos:[5000,2.2,3.3],target:[5000,0,0],fov:62,near:0.05},
    {pos:[1.2,1.6,1.6],target:[0,6.1,0],fov:78,near:0.05},
    {pos:[6005,8,12],target:[6000,20,0],fov:35,near:0.1},
  ];
  engine.registry.flora={trees,views,cranes};
  console.log('[flora] geometry budgets '+JSON.stringify(trees.map(t=>({species:t.stats.species,lodTriangles:t.stats.lodTriangles}))));
  return {views};
}
