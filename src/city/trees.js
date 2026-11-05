import * as THREE from 'three';
import { instancePalaceTrees } from '../flora/instances.js';

/** Public flora geometry, wind and cutouts with city-distance batching. */
export function cityTrees(engine,positions) {
  const flora=instancePalaceTrees(engine,positions,{species:'huai',height:13,seed:'T8-courtyard-fields',collision:false});
  flora.meshes[0].geometry.dispose();flora.meshes[0].geometry=flora.meshes[1].geometry.clone();
  flora.stats.lodTriangles[0]=flora.stats.lodTriangles[1];
  // inferred: beyond 120 m the public canopy cards need only their four corners,
  // not a subdivided surface. Preserve every card's extent, UV cutout and wind;
  // roofs hide the omitted trunk. This keeps the full-city view inside T8's budget.
  const far=flora.meshes[2].geometry,{aFlora:kind,aOrigin:origin,uv}=far.attributes,cards=new Map(),canopy=[];
  for(let i=0;i<kind.count;i++)if(kind.getX(i)>.5) {
    const u=uv.getX(i),v=uv.getY(i);if((u!==0&&u!==1)||(v!==0&&v!==1))continue;
    const key=[origin.getX(i),origin.getY(i),origin.getZ(i),kind.getX(i),kind.getZ(i)].join(':');
    if(!cards.has(key))cards.set(key,[]);cards.get(key)[u+v*2]=i;
  }
  for(const [a,b,c,d]of cards.values())if([a,b,c,d].every(Number.isInteger))canopy.push(a,b,c,b,d,c);
  far.setIndex(canopy);far.userData.triangles=flora.stats.lodTriangles[2]=canopy.length/3;
  for(const m of flora.meshes){m.castShadow=false;m.userData.castShadow=false;}
  const geometry=flora.model.lod2.clone();
  geometry.setAttribute('iFlora',new THREE.InstancedBufferAttribute(new Float32Array(positions.length*4),4).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});material.userData.noPatch=true;
  const proxy=new THREE.InstancedMesh(geometry,material,positions.length);
  proxy.name='city-tree-shadow-crowns';proxy.castShadow=true;proxy.receiveShadow=false;proxy.customDepthMaterial=flora.meshes[0].customDepthMaterial;
  proxy.instanceMatrix.setUsage(THREE.DynamicDrawUsage);flora.group.add(proxy);
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),9);let last=[];
  function update() {
    const camera=engine.camera,view=[...camera.position.toArray(),...camera.quaternion.toArray(),camera.fov,camera.aspect];
    if(view.every((v,i)=>v===last[i]))return;last=view;
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const counts=[0,0,0];let shadows=0;
    for(const item of flora.items) {
      const distance=item.p.distanceTo(camera.position);
      if(distance<180) {
        proxy.setMatrixAt(shadows,item.matrix);geometry.attributes.iFlora.set(item.variation,shadows*4);shadows++;
      }
      sphere.center.copy(item.p);sphere.center.y+=7;if(!frustum.intersectsSphere(sphere))continue;
      // inferred: background courtyard trees use the public middle/far models.
      const l=distance<40?0:distance<120?1:2,k=counts[l]++,m=flora.meshes[l];
      m.setMatrixAt(k,item.matrix);m.setColorAt(k,item.tint);m.geometry.attributes.iFlora.set(item.variation,k*4);
    }
    flora.meshes.forEach((m,l)=>{
      m.count=counts[l];m.visible=m.count>0;m.instanceMatrix.needsUpdate=true;
      if(m.instanceColor)m.instanceColor.needsUpdate=true;m.geometry.attributes.iFlora.needsUpdate=true;if(m.count)m.computeBoundingSphere();
    });
    proxy.count=shadows;proxy.visible=shadows>0;proxy.instanceMatrix.needsUpdate=true;geometry.attributes.iFlora.needsUpdate=true;if(shadows)proxy.computeBoundingSphere();
    Object.assign(flora.stats,{counts,shadowInstances:shadows,shadowTriangles:shadows*geometry.index.count/3,
      triangles:counts.reduce((sum,n,l)=>sum+n*flora.stats.lodTriangles[l],0),calls:counts.filter(Boolean).length});
  }
  flora.group.updateMatrixWorld=function(force){update();THREE.Group.prototype.updateMatrixWorld.call(this,force);};
  update();return {...flora,update,shadowProxy:proxy};
}
