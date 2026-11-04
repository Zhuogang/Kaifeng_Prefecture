import * as THREE from 'three';
import { RNG } from '../core/rng.js';
import { Geometry, V, TAU } from './geometry.js';
import { floraMaterials } from './materials.js';
import { BLOSSOMS } from './trees.js';

// inferred: lotus diameter 0.45–1.0 m, upturned rim and a narrow radial notch.
// All three LODs keep real geometry, so the underside and water-level silhouette work.
export function buildLotus({seed='lotus',radius=0.42,rng=new RNG(seed)}={}) {
  const hue=new THREE.Color('#617f34').multiplyScalar(rng.range(0.9,1.1));
  const levels=[48,24,12].map(segments=>{
    const g=new Geometry(), center=g.vertex(V(0,0.012,0),V(0,1,0),hue,3,0,[0,0]),rings=[];
    for(let j=1;j<=3;j++) {
      const ring=[],r=j/3;
      for(let i=0;i<=segments;i++) {
        const a=0.075+i/segments*(TAU-0.15), edge=1+0.018*Math.sin(a*9)+0.012*Math.cos(a*13);
        const y=0.012+radius*(0.075*r**4+0.018*Math.sin(a*7)*r*r);
        ring.push(g.vertex(V(Math.cos(a)*radius*r*edge,y,Math.sin(a)*radius*r*edge),V(-Math.cos(a)*0.24*r**3,1,-Math.sin(a)*0.24*r**3).normalize(),hue,3,0,[Math.cos(a)*r,Math.sin(a)*r]));
      }
      rings.push(ring);
    }
    for(let i=0;i<segments;i++) {
      g.tri(center,rings[0][i+1],rings[0][i]);
      for(let j=1;j<3;j++) {
        g.tri(rings[j-1][i],rings[j-1][i+1],rings[j][i]);
        g.tri(rings[j-1][i+1],rings[j][i+1],rings[j][i]);
      }
    }
    return g.build();
  });
  return {lod0:levels[0],lod1:levels[1],lod2:levels[2]};
}

// inferred: short mixed grass blades and basal broad weeds; no measured species claim.
export function buildGrass({seed='grass',height=0.2,rng=new RNG(seed)}={}) {
  const levels=[13,6,3].map(count=>{
    const g=new Geometry();
    for(let i=0;i<count;i++) {
      const a=rng.range(0,TAU),h=height*rng.range(0.5,1.2);
      const base=V(Math.cos(a)*0.035,0,Math.sin(a)*0.035);
      g.leaf(base,h,height*0.05,V(Math.cos(a)*0.4,1,Math.sin(a)*0.4),new THREE.Color('#697440').multiplyScalar(rng.range(0.7,1.2)),0.25,a);
      if(i%4===0) g.leaf(base,height*0.35,height*0.15,V(Math.cos(a),0.45,Math.sin(a)),new THREE.Color('#687b39'),0.15,a);
    }
    return g.build();
  });
  return {lod0:levels[0],lod1:levels[1],lod2:levels[2]};
}

function scatter(engine,geometry,positions,{seed,materials=floraMaterials(engine),tilt=0,scale=[0.75,1.25],shadow=true}={}) {
  const rng=engine.rng('flora-scatter:'+seed),g=geometry.clone();
  const data=new THREE.InstancedBufferAttribute(new Float32Array(positions.length*4),4);g.setAttribute('iFlora',data);
  const mesh=new THREE.InstancedMesh(g,materials.surface,positions.length),matrix=new THREE.Matrix4();
  positions.forEach((entry,i)=>{
    const o=Array.isArray(entry)?{position:entry}:entry,p=new THREE.Vector3(...o.position),s=o.scale??rng.range(...scale);
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(o.tilt?.[0]??rng.range(-tilt,tilt),o.yaw??rng.range(0,TAU),o.tilt?.[1]??rng.range(-tilt,tilt)));
    matrix.compose(p,q,V(s,s,s));mesh.setMatrixAt(i,matrix);
    mesh.setColorAt(i,new THREE.Color().setRGB(rng.range(0.86,1.08),rng.range(0.9,1.08),rng.range(0.85,1.05)));
    data.set([o.phase??rng.range(0,TAU),1,0,1],i*4);
  });
  mesh.name=seed;mesh.customDepthMaterial=materials.depth;
  engine.add(mesh,{castShadow:shadow});mesh.computeBoundingSphere();
  return mesh;
}
export function instanceLotus(engine,positions,options={}) {
  const model=buildLotus({...options,rng:engine.rng('lotus-model:'+ (options.seed??'lotus'))});
  const mesh=scatter(engine,engine.quality.detail>=1?model.lod0:model.lod1,positions,{seed:'lotus',tilt:0.035,...options});
  return {mesh,model};
}
export function instanceGrass(engine,positions,options={}) {
  const model=buildGrass({...options,rng:engine.rng('grass-model:'+(options.seed??'grass'))});
  return {mesh:scatter(engine,model.lod0,positions,{seed:'grass',...options}),model};
}

/** Petals on supplied ground/water positions. Passing surfaces keeps water height owned by the caller. */
export function instancePetals(engine,positions,{species='peach',...options}={}) {
  const g=new Geometry();
  g.leaf(V(),0.025,0.018,V(1,0,0),new THREE.Color(BLOSSOMS[species]?.color??'#eee4d9'),0,0,2);
  return scatter(engine,g.build(),positions,{seed:'petals:'+species,scale:[0.7,1.3],shadow:false,...options});
}
