import * as THREE from 'three';
import { instancePalaceTrees } from '../flora/instances.js';

/** Background urban trees, using the public flora geometry, wind and cutout APIs. */
export function cityTrees(engine,positions) {
  const flora=instancePalaceTrees(engine,positions,{species:'huai',height:11,seed:'T8-courtyard-fields',collision:false});
  // inferred: these are background courtyard/field trees. Public LOD1 is ample
  // at the nearest tier; the public porous LOD2 crown supplies their shadows.
  flora.meshes[0].geometry.dispose();flora.meshes[0].geometry=flora.meshes[1].geometry.clone();
  flora.stats.lodTriangles[0]=flora.stats.lodTriangles[1];
  for(const mesh of flora.meshes){mesh.castShadow=false;mesh.userData.castShadow=false;}
  const geometry=flora.model.lod2.clone();
  geometry.setAttribute('iFlora',new THREE.InstancedBufferAttribute(new Float32Array(positions.length*4),4).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});material.userData.noPatch=true;
  const proxy=new THREE.InstancedMesh(geometry,material,positions.length);
  proxy.name='city-tree-shadow-crowns';proxy.castShadow=true;proxy.receiveShadow=false;
  proxy.customDepthMaterial=flora.meshes[0].customDepthMaterial;
  proxy.instanceMatrix.setUsage(THREE.DynamicDrawUsage);flora.group.add(proxy);
  const matrix=new THREE.Matrix4();let last=[];
  function update() {
    flora.update();const camera=engine.camera.position,position=camera.toArray();
    if(position.every((v,i)=>v===last[i]))return;
    last=position;let count=0;
    for(const source of flora.meshes.slice(0,2))for(let i=0;i<source.count;i++) {
      source.getMatrixAt(i,matrix);proxy.setMatrixAt(count,matrix);
      const variation=source.geometry.attributes.iFlora;
      geometry.attributes.iFlora.set(variation.array.subarray(i*4,i*4+4),count*4);count++;
    }
    proxy.count=count;proxy.visible=count>0;proxy.instanceMatrix.needsUpdate=true;
    geometry.attributes.iFlora.needsUpdate=true;if(count)proxy.computeBoundingSphere();
    flora.stats.shadowInstances=count;flora.stats.shadowTriangles=count*flora.stats.lodTriangles[2];
  }
  flora.group.updateMatrixWorld=function(force){update();THREE.Group.prototype.updateMatrixWorld.call(this,force);};
  update();return {...flora,shadowProxy:proxy};
}
