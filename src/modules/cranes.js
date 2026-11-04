import * as THREE from 'three';
import * as PLAN from '../world/plan.js';
import { proceduralMaterial } from '../core/materials.js';
import { Geometry, V, TAU } from '../flora/geometry.js';

// inferred: 2.1 m spread, 2 m beak-to-trailing-toe length, 1.45 m standing
// height, and feather proportions. Markings follow ruihe_bright.jpg / ref3.png.
export function buildCrane({perched=false,far=false}={}) {
  const g=new Geometry(),white=new THREE.Color('#eee9db'),black=new THREE.Color('#292d2a'),red=new THREE.Color('#b82520'),beak=new THREE.Color('#838170');
  const bodyY=perched?0.83:0;
  const sphere=(p,s,c,detail=far?0:3)=>g.ellipsoid(p,s,c,{detail,kind:4});
  const tube=(p,r,c,sides=far?4:10)=>g.tube(p,r,c,{sides,kind:4,smooth:far?2:4});
  sphere(V(0,bodyY,0),V(0.155,0.18,0.32),white);
  const neck=perched?[V(0,0.94,-0.18),V(0,1.05,-0.31),V(0,1.26,-0.22),V(0,1.36,-0.28)]:[V(0,0.04,-0.26),V(0,0.01,-0.48),V(0,0.09,-0.68),V(0,0.10,-0.82)];
  tube(neck,[0.07,0.045,0.036,0.04],black);
  const head=neck[3].clone();sphere(head,V(0.057,0.061,0.095),white);
  sphere(head.clone().add(V(0,0.047,-0.008)),V(0.04,0.022,0.05),red);
  tube([head.clone().add(V(0,0,-0.065)),head.clone().add(V(0,-0.012,-0.25))],[0.026,0.001],beak);
  for(const side of [-1,1]) {
    if(!far) sphere(head.clone().add(V(side*0.049,0.012,-0.026)),V(0.008,0.009,0.009),black,0);
    const legs=perched?[V(side*0.055,0.74,0.09),V(side*0.06,0.39,0.12),V(side*0.065,0.035,0.06)]:[V(side*0.06,-0.08,0.2),V(side*0.065,-0.10,0.58),V(side*0.07,-0.08,0.98)];
    tube(legs,[0.017,0.012,0.009],black,far?3:5);
    for(let toe=0;toe<(far?1:3);toe++) {
      const end=legs[2].clone().add(V((toe-1)*0.04,perched?-0.02:0,perched?-0.12:0.1));
      tube([legs[2],end],[0.009,0.002],black,3);
    }
    if(perched) {
      sphere(V(side*0.13,0.84,0.02),V(0.055,0.14,0.24),white);
      for(let i=0;i<(far?3:8);i++) g.feather(V(side*0.15,0.83,0.02+i*0.025),0.32,0.065,V(side*0.07,-0.55,1),i>2?black:white);
    } else {
      // Shoulder, wrist, fingers: layered feathers leave real gaps at the wing tips.
      const verts=[V(side*0.12,0.055,-0.15),V(side*0.45,0.06,-0.27),V(side*0.79,0.055,-0.16),V(side*0.96,0.05,0.07),V(side*0.61,0.05,0.27),V(side*0.15,0.05,0.20)];
      const ids=verts.map(p=>g.vertex(p,V(0,1,0),white,4,1));
      for(let i=1;i<5;i++) g.tri(ids[0],ids[i],ids[i+1]);
      const count=far?6:14;
      for(let i=0;i<count;i++) {
        const t=i/(count-1),x=0.24+0.62*t;
        const start=V(side*x,0.015,-0.04+0.11*t);
        const direction=V(side*(0.13+0.8*t*t),-0.045,1-0.45*t).normalize();
        g.feather(start,0.36+0.07*Math.sin(t*Math.PI),far?0.13:0.087,direction,i>3?black:white,1);
        if(!far) g.feather(start.clone().add(V(0,0.018,-0.07)),0.23,0.075,direction,white.clone().multiplyScalar(0.89+0.1*t),1);
      }
    }
  }
  for(let i=0;i<(far?2:6);i++) g.feather(V((i-2.5)*0.028,bodyY+0.03,0.22),0.23,0.055,V(0,-0.15,1),white);
  return g.build();
}

const VERT=/* glsl */`
attribute vec3 aFlora;
attribute vec4 iCrane;
uniform float uCraneTime;
`;
// inferred: 0.75 Hz wing beat with a small raised resting angle.
const FLAP=/* glsl */`
float phase = uCraneTime * 6.28318530718 * 0.75 + iCrane.x;
float angle = (0.56 * sin(phase) + 0.12) * sign(position.x) * aFlora.y;
float ca=cos(angle), sa=sin(angle);
vec2 wing = transformed.xy - vec2(sign(position.x)*0.13,0.04);
transformed.xy = mat2(ca,sa,-sa,ca)*wing + vec2(sign(position.x)*0.13,0.04);
`;
function craneMaterials(engine) {
  const time={value:engine.time??0};engine.onUpdate(t=>{time.value=t;});
  const material=proceduralMaterial({
    name:'red-crowned-cranes',params:{vertexColors:true,roughness:0.84,side:THREE.DoubleSide},
    uniforms:{uCraneTime:time},vertexHead:VERT,
    vertexPre:FLAP+/* glsl */`
      vec3 birdNormal = objectNormal;
      birdNormal.xy=mat2(ca,sa,-sa,ca)*birdNormal.xy;
      #ifdef USE_INSTANCING
      birdNormal = mat3(instanceMatrix)*birdNormal;
      #endif
      vNormal=normalize(normalMatrix*birdNormal);
    `,
    color:'diffuseColor.rgb *= 0.94 + 0.06 * cgVnoise3(cgO * 70.0);',
  });
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
  depth.userData.shaderKey='cranes-flapping-depth-v1';depth.customProgramCacheKey=()=>depth.userData.shaderKey;
  depth.onBeforeCompile=shader=>{
    shader.uniforms.uCraneTime=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+VERT).replace('#include <begin_vertex>','#include <begin_vertex>\n'+FLAP);
  };
  return {material,depth};
}

/** Twenty birds: eighteen wheeling and two at supplied anchors (feet at anchor y).
 * center=[x,y,z], height above center.y; perches=[ [x,y,z], [x,y,z] ] or
 * [{position:[x,y,z],yaw},...]. Paths and wing phases repeat every 120 seconds.
 */
export function addCranes(engine,{center,radius,height,perches}) {
  if(!center || !Number.isFinite(radius) || radius<=0 || !Number.isFinite(height) || perches?.length!==2) throw new Error('Cranes require center, positive radius, height and exactly two perch anchors');
  const rng=engine.rng('crane-flock'),group=new THREE.Group();group.name='twenty-red-crowned-cranes';
  const {material,depth}=craneMaterials(engine),meshes=[];
  for(const perched of [false,true]) for(const far of [false,true]) {
    const geometry=buildCrane({perched,far});
    geometry.setAttribute('iCrane',new THREE.InstancedBufferAttribute(new Float32Array(20*4),4));
    const mesh=new THREE.InstancedMesh(geometry,material,20);mesh.count=0;
    mesh.name=`cranes:${perched?'perched':'flying'}:${far?'far':'near'}`;mesh.customDepthMaterial=depth;
    meshes.push(mesh);group.add(mesh);
  }
  // inferred: loose elliptical orbits with harmonic height variation and small banking.
  const flight=Array.from({length:18},(_,i)=>({phase:i/18*TAU+rng.range(-0.07,0.07),r:radius*rng.range(0.25,1.13),lift:rng.range(-1.5,1.5),wing:rng.range(0,TAU),size:rng.range(0.95,1.04)}));
  const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  const positions=Array.from({length:20},()=>V());
  let last='';
  const update=()=>{
    const t=((engine.time??0)%120+120)%120,cam=engine.camera.position,key=[t,cam.x,cam.y,cam.z].join(':');
    if(key===last)return;last=key;
    const counts=[0,0,0,0];
    for(let i=0;i<20;i++) {
      let yaw,bank=0,size=1,phase=0;
      const p=positions[i];
      if(i<18) {
        const f=flight[i],a=f.phase+t/120*TAU;
        p.set(center[0]+Math.cos(a)*f.r,center[1]+height+f.lift+Math.sin(a*2)*1.2,center[2]+Math.sin(a)*f.r*0.78);
        yaw=Math.atan2(Math.sin(a),-0.78*Math.cos(a));bank=0.13*Math.sin(a+0.5);size=f.size;phase=f.wing;
      } else {
        const anchor=perches[i-18];p.fromArray(Array.isArray(anchor)?anchor:anchor.position);yaw=anchor.yaw??(i===18?0.4:-0.4);
      }
      const l=(i<18?0:2)+(p.distanceTo(cam)>100?1:0),mesh=meshes[l],k=counts[l]++;
      q.setFromEuler(new THREE.Euler(0,yaw,bank));matrix.compose(p,q,V(size,size,size));mesh.setMatrixAt(k,matrix);
      mesh.geometry.attributes.iCrane.set([phase,0,0,0],k*4);
    }
    meshes.forEach((m,l)=>{m.count=counts[l];m.visible=m.count>0;m.instanceMatrix.needsUpdate=true;m.geometry.attributes.iCrane.needsUpdate=true;if(m.count)m.computeBoundingSphere();});
    group.userData.cranes={count:20,flying:18,perched:2,counts,triangles:meshes.reduce((s,m)=>s+m.count*m.geometry.userData.triangles,0)};
  };
  group.updateMatrixWorld=function(force){update();THREE.Group.prototype.updateMatrixWorld.call(this,force);};
  engine.onUpdate(update);engine.add(group);update();
  const api={group,meshes,positions,update};engine.registry.cranes=api;return api;
}
// inferred: optional CRANES plan adapter; the placement/anchors remain lead-owned.
export async function build(engine) {
  if(PLAN.CRANES) return addCranes(engine,PLAN.CRANES);
  engine.registry.cranes={pending:'plan.js CRANES center/radius/height/perches not yet supplied'};
}
export async function test(engine) {
  const {test}=await import('./flora.js');return test(engine);
}
