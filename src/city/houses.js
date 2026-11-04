import * as THREE from 'three';
import { buildHall } from '../yingzao/hall.js';
import { roofModel } from '../yingzao/roof.js';
import { CITY } from '../world/plan.js';
import { packedGeometry, colorGeometry, mergePacked, disposeHall } from './batch.js';

// inferred: a 20-triangle distant envelope preserves the shared hall's ridge,
// concave slope midpoint, eave extent and wall height after fine joinery disappears.
function envelope(hall, distant=false) {
  const roof=roofModel(hall.layout),p=[],uv=[];
  const triangle=(a,b,c)=>{p.push(...a,...b,...c);uv.push(0,0,1,0,1,1);};
  for(const side of ['north','south'])for(const [lo,hi] of (distant?[[0,roof.tEnd]]:[[0,.55],[.55,roof.tEnd]])) {
    const a=roof.point(side,-1,lo,.1),b=roof.point(side,1,lo,.1),c=roof.point(side,-1,hi,.1),d=roof.point(side,1,hi,.1);
    triangle(a,c,b);triangle(b,c,d);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  const top=colorGeometry(g,new THREE.Color().setRGB(.075,.085,.09),2);g.dispose();
  const body=new THREE.BoxGeometry(hall.layout.width,roof.baseY-.16,hall.layout.depth);
  body.translate(0,(roof.baseY-.16)/2,0);
  // inferred: beyond 1.8 km, retain ridge/eave silhouettes with one slope panel.
  // Roofs close the wall tops, and the buried underside needs no polygons.
  if(distant)body.setIndex([...body.index.array.slice(0,12),...body.index.array.slice(24)]);
  const walls=colorGeometry(body,new THREE.Color().setRGB(.36,.33,.28),1);body.dispose();
  return mergePacked([top,walls]);
}

function gables(hall) {
  const roof=roofModel(hall.layout),w=hall.layout.width/2,d=hall.layout.depth/2,y=roof.baseY-.16,p=[];
  // inferred: plaster closes the exposed gables under the common roof section.
  for(const sign of [-1,1]) {
    const points=[[sign*w,y,-d],[sign*w,roof.baseY+roof.sectionY(0)+.05,0],[sign*w,y,d]];
    for(const i of sign<0?[0,2,1]:[0,1,2])p.push(...points[i]);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();
  const painted=colorGeometry(g,new THREE.Color().setRGB(.36,.35,.32),1);g.dispose();return painted;
}

export function instanceHouses(engine, entries, material) {
  const hall=buildHall(CITY.houseSpec,engine), geometries=[packedGeometry(hall.lod1),packedGeometry(hall.lod2),envelope(hall),envelope(hall,true)].map(g=>mergePacked([g,gables(hall)]));
  disposeHall(hall);
  const group=new THREE.Group();group.name='city-house-districts';
  const meshes=geometries.map((g,l)=>{
    const mesh=new THREE.InstancedMesh(g,material,entries.length);mesh.name='city-houses-LOD'+(l+1);
    mesh.castShadow=false;mesh.userData.castShadow=false;mesh.count=0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(mesh);return mesh;
  });
  // Shadow hulls stay simple at all distances; full LOD1 shadows cost far too much.
  const hullGeometry=new THREE.BoxGeometry(9,4,6);hullGeometry.translate(0,2,0);
  hullGeometry.setIndex([...hullGeometry.index.array.slice(0,18),...hullGeometry.index.array.slice(24)]);
  const hull=new THREE.InstancedMesh(hullGeometry,new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}),entries.length);
  hull.name='city-house-shadow-hulls';hull.castShadow=true;hull.receiveShadow=false;hull.count=0;
  hull.userData.receiveShadow=false;group.add(hull);
  const q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),position=new THREE.Vector3(),scale=new THREE.Vector3();
  const items=entries.map(e=>({ ...e, matrix:new THREE.Matrix4().compose(position.fromArray(e.position),q.setFromAxisAngle(up,e.yaw),scale.fromArray(e.scale)),
    color:new THREE.Color().setRGB(e.tint,e.tint*(e.outer?.98:1),e.tint*.96)}));
  const stats={instances:entries.length,counts:[0,0,0,0],shadowInstances:0,triangles:0};let last=[];
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),20);
  const update=()=>{
    material.userData.updateCityTime();
    const camera=engine.camera.position;
    const view=[...camera.toArray(),...engine.camera.quaternion.toArray(),engine.camera.fov,engine.camera.aspect];
    if(view.every((v,i)=>v===last[i]))return;
    last=view;const counts=[0,0,0,0];let shadows=0;
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(engine.camera.projectionMatrix,engine.camera.matrixWorldInverse));
    const high=engine.quality.detail>=1, near=high?100:65, middle=high?850:540;
    for(const e of items) {
      const distance=Math.hypot(e.position[0]-camera.x,e.position[1]-camera.y,e.position[2]-camera.z);
      if(distance<1250)hull.setMatrixAt(shadows++,e.matrix);
      sphere.center.fromArray(e.position);
      if(!frustum.intersectsSphere(sphere))continue;
      const l=distance<near?0:distance<middle?1:distance<1800?2:3,k=counts[l]++;
      meshes[l].setMatrixAt(k,e.matrix);meshes[l].setColorAt(k,e.color);
    }
    for(let l=0;l<meshes.length;l++) {
      const mesh=meshes[l];mesh.count=counts[l];mesh.visible=counts[l]>0;
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
    }
    hull.count=shadows;hull.instanceMatrix.needsUpdate=true;hull.computeBoundingSphere();
    Object.assign(stats,{counts,shadowInstances:shadows});
    stats.triangles=counts.reduce((s,n,l)=>s+n*(geometries[l].index?.count??geometries[l].attributes.position.count)/3,0);
  };
  group.updateMatrixWorld=function(force){update();THREE.Group.prototype.updateMatrixWorld.call(this,force);};
  update();engine.add(group);return {group,meshes,hull,stats};
}
