import * as THREE from 'three';
import { buildHall } from '../yingzao/hall.js';
import { CITY } from '../world/plan.js';
import { mergePacked, disposeHall } from './batch.js';
import { houseBody, houseRoof } from './roof.js';

export function instanceHouses(engine,entries,material) {
  const hall=buildHall(CITY.houseSpec,engine);
  // inferred: roofs dominate beyond 1.1 km; their hidden facade polygons disappear.
  // The same world-space ranges are used for every camera, including free flight.
  const geometries=[0,1,2,3].map(l=>l===3?houseRoof(hall,l):mergePacked([houseBody(hall,l),houseRoof(hall,l)]));
  disposeHall(hall);
  const group=new THREE.Group();group.name='city-house-districts';
  const meshes=geometries.map((g,l)=>{
    g.setAttribute('cityStorey',new THREE.InstancedBufferAttribute(new Float32Array(entries.length),1).setUsage(THREE.DynamicDrawUsage));
    const m=new THREE.InstancedMesh(g,material,entries.length);m.name='city-houses-LOD'+(l+1);m.castShadow=false;m.userData.castShadow=false;m.count=0;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(m);return m;
  });
  const hullGeometry=new THREE.BoxGeometry(14,4,6);hullGeometry.translate(0,2,0);
  hullGeometry.setIndex([...hullGeometry.index.array.slice(0,18),...hullGeometry.index.array.slice(24)]);
  const hull=new THREE.InstancedMesh(hullGeometry,new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}),entries.length);
  hull.name='city-house-shadow-hulls';hull.castShadow=true;hull.receiveShadow=false;hull.count=0;hull.userData.receiveShadow=false;group.add(hull);
  const q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),position=new THREE.Vector3(),scale=new THREE.Vector3();
  const items=entries.map(e=>({...e,matrix:new THREE.Matrix4().compose(position.fromArray(e.position),q.setFromAxisAngle(up,e.yaw),scale.fromArray(e.scale)),
    shadowMatrix:new THREE.Matrix4().compose(position.fromArray(e.position),q.setFromAxisAngle(up,e.yaw),scale.set(e.scale[0],e.scale[1]*(1+e.storey/4),e.scale[2])),
    color:new THREE.Color().setRGB(e.tint,e.tint,e.tint)}));
  const stats={instances:entries.length,counts:[0,0,0,0],shadowInstances:0,triangles:0};let last=[];
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),28);
  const update=()=>{
    material.userData.updateCityTime();const camera=engine.camera.position;
    const view=[...camera.toArray(),...engine.camera.quaternion.toArray(),engine.camera.fov,engine.camera.aspect];
    if(view.every((v,i)=>v===last[i]))return;last=view;
    const counts=[0,0,0,0];let shadows=0;
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(engine.camera.projectionMatrix,engine.camera.matrixWorldInverse));
    const high=engine.quality.detail>=1,near=high?55:30,middle=high?280:145;
    for(const e of items) {
      const distance=Math.hypot(e.position[0]-camera.x,e.position[1]-camera.y,e.position[2]-camera.z);
      if(distance<850)hull.setMatrixAt(shadows++,e.shadowMatrix);
      sphere.center.fromArray(e.position);if(!frustum.intersectsSphere(sphere))continue;
      const l=distance<near?0:distance<middle?1:distance<1100?2:3,k=counts[l]++;
      meshes[l].setMatrixAt(k,e.matrix);meshes[l].setColorAt(k,e.color);meshes[l].geometry.attributes.cityStorey.setX(k,e.storey);
    }
    for(let l=0;l<meshes.length;l++) {
      const m=meshes[l];m.count=counts[l];m.visible=counts[l]>0;m.instanceMatrix.needsUpdate=true;
      if(m.instanceColor)m.instanceColor.needsUpdate=true;m.geometry.attributes.cityStorey.needsUpdate=true;if(m.count)m.computeBoundingSphere();
    }
    hull.count=shadows;hull.instanceMatrix.needsUpdate=true;if(shadows)hull.computeBoundingSphere();
    Object.assign(stats,{counts,shadowInstances:shadows});stats.triangles=counts.reduce((s,n,l)=>s+n*geometries[l].index.count/3,0);
  };
  group.updateMatrixWorld=function(force){update();THREE.Group.prototype.updateMatrixWorld.call(this,force);};
  update();engine.add(group);return {group,meshes,hull,stats,items};
}
