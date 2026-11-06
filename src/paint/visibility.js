import * as THREE from 'three';
import {LOOK_YAW,LOOK_PITCH} from './playback.js';

// inferred: two degrees of angular guard, half a metre for wind and camera
// interpolation, nine path samples, and 10% horizontal resize guard. Culling
// uses the union for the entire path, never the current frame's camera.
export function paintVisibility(engine, viewAt, {reflection=false,waterBounds=null}={}) {
  const paths=Array.isArray(viewAt)?viewAt:[viewAt];
  let aspect, volumes;
  const meshes=[];
  (engine.registry.paint.culling??=[]).push({reflection,meshes});
  const updateVolumes=()=>{
    aspect=engine.camera.aspect;
    volumes=paths.flatMap(viewAt=>Array.from({length:9},(_,i)=>{
      const view=viewAt(i/8),camera=new THREE.PerspectiveCamera();
      const v=Math.tan(view.fov*Math.PI/360)+Math.tan(LOOK_PITCH+Math.PI/90);
      const h=Math.tan(view.fov*Math.PI/360)*aspect*1.1+Math.tan(LOOK_YAW+Math.PI/90);
      camera.projectionMatrix.makePerspective(-h*.1,h*.1,v*.1,-v*.1,.1,view.far);
      camera.position.set(...view.pos);
      const target=new THREE.Vector3(...view.target);
      if(reflection){camera.position.y*=-1;target.y*=-1;camera.up.set(0,-1,0);}
      camera.lookAt(target);camera.updateMatrixWorld(true);
      return {camera,frustum:new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse))};
    }));
  };
  updateVolumes();
  const sphere=new THREE.Sphere(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const visible=()=>volumes.some(({camera,frustum})=>{
    if(!frustum.intersectsSphere(sphere))return false;
    if(!reflection||!waterBounds||sphere.center.y<=sphere.radius)return true;
    const p=sphere.center,r=sphere.radius,eye=camera.position;
    let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
    for(const x of [p.x-r,p.x+r])for(const y of [p.y-r,p.y+r])for(const z of [p.z-r,p.z+r]){
      const t=-eye.y/(y-eye.y),wx=eye.x+(x-eye.x)*t,wz=eye.z+(z-eye.z)*t;
      x0=Math.min(x0,wx);x1=Math.max(x1,wx);z0=Math.min(z0,wz);z1=Math.max(z1,wz);
    }
    // inferred: three metres beyond the water conservatively cover ripple
    // displacement, blur reach and camera interpolation.
    return x1>=waterBounds[0]-3&&x0<=waterBounds[2]+3&&z1>=waterBounds[1]-3&&z0<=waterBounds[3]+3;
  });
  const compact=source=>{
    const p=source.attributes.position,indices=source.index.array,kept=[];
    for(let i=0;i<indices.length;i+=3){
      a.fromBufferAttribute(p,indices[i]);b.fromBufferAttribute(p,indices[i+1]);c.fromBufferAttribute(p,indices[i+2]);
      sphere.center.copy(a).add(b).add(c).multiplyScalar(1/3);
      sphere.radius=Math.sqrt(Math.max(sphere.center.distanceToSquared(a),sphere.center.distanceToSquared(b),sphere.center.distanceToSquared(c)))+.5;
      if((!reflection||sphere.center.y+sphere.radius>=0)&&visible())kept.push(indices[i],indices[i+1],indices[i+2]);
    }
    const remap=new Int32Array(p.count).fill(-1),used=[];
    for(let i=0;i<kept.length;i++){
      const old=kept[i];if(remap[old]<0){remap[old]=used.length;used.push(old);}kept[i]=remap[old];
    }
    const g=new THREE.BufferGeometry();
    for(const [name,attribute]of Object.entries(source.attributes)){
      const size=attribute.itemSize,array=new attribute.array.constructor(used.length*size);
      for(let i=0;i<used.length;i++)for(let j=0;j<size;j++)array[i*size+j]=attribute.array[used[i]*size+j];
      g.setAttribute(name,new THREE.BufferAttribute(array,size,attribute.normalized));
    }
    g.setIndex(kept);g.computeBoundingSphere();return g;
  };
  engine.onUpdate(()=>{
    if(engine.camera.aspect===aspect)return;
    updateVolumes();
    for(const {mesh,source}of meshes){mesh.geometry.dispose();mesh.geometry=compact(source);}
  });
  return mesh=>{
    const source=mesh.geometry;mesh.geometry=compact(source);meshes.push({mesh,source});
    mesh.userData.trianglesBefore=source.index.count/3;
    return mesh;
  };
}

