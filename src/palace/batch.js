import * as THREE from 'three';
import { GeometryBatch } from '../yingzao/geometry.js';

const compatibleGeometries=new WeakMap();
function compatible(geometry) {
  if(geometry.index&&geometry.attributes.memberUV&&geometry.attributes.tileCoord)return geometry;
  if(!compatibleGeometries.has(geometry)) {
    // Public ornaments use non-indexed buffers, while hall members use indexed buffers with
    // construction attributes. Normalize each unique profile once before a material batch.
    const batch=new GeometryBatch();batch.add(geometry);
    compatibleGeometries.set(geometry,batch.geometry());
  }
  return compatibleGeometries.get(geometry);
}

// One draw per shared material for static fabric; repeated brackets/rail panels stay instanced.
export function bake(source, name) {
  source.updateMatrixWorld(true);
  const batches = new Map(), repeated = new Map(), regular = new Map(), group = new THREE.Group();
  group.name = name;
  source.traverse(o => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh) {
      const g = o.geometry;
      g.computeBoundingBox();
      const key = [o.material.uuid, o.name, g.attributes.position.count,
        ...g.boundingBox.min.toArray(), ...g.boundingBox.max.toArray()].join(':');
      if (!repeated.has(key)) repeated.set(key, { geometry: g, material: o.material, name: o.name, matrices: [] });
      const entry = repeated.get(key), matrix = new THREE.Matrix4();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, matrix);
        entry.matrices.push(o.matrixWorld.clone().multiply(matrix));
      }
    } else {
      const key=o.material.uuid+':'+o.geometry.uuid;
      if(!regular.has(key))regular.set(key,[]);
      regular.get(key).push(o);
    }
  });
  // Repeated halls/galleries share vertex buffers and instance transforms. Singleton material
  // batches (notably the hero hall) already arrive merged from buildHall: do not copy their vertices.
  const singleByMaterial=new Map();
  for(const objects of regular.values()) {
    const o=objects[0];
    if(objects.length>1)repeated.set(o.material.uuid+':'+o.geometry.uuid,{
      geometry:o.geometry,material:o.material,name:o.name,
      matrices:objects.map(object=>object.matrixWorld.clone()),
    });
    else {
      if(!singleByMaterial.has(o.material))singleByMaterial.set(o.material,[]);
      singleByMaterial.get(o.material).push(o);
    }
  }
  for(const [material,objects]of singleByMaterial) {
    if(objects.length===1) {
      const mesh=objects[0].clone();mesh.matrix.copy(objects[0].matrixWorld);mesh.matrixAutoUpdate=false;
      group.add(mesh);
    } else {
      const batch=new GeometryBatch();
      for(const o of objects)batch.add(o.geometry,o.matrixWorld);
      batches.set(material,batch);
    }
  }
  for (const [material, batch] of batches) group.add(batch.mesh(material, material.name));
  const byMaterial=new Map();
  for(const e of repeated.values()) {
    if(!byMaterial.has(e.material))byMaterial.set(e.material,[]);
    byMaterial.get(e.material).push(e);
  }
  for(const [material,sourceEntries]of byMaterial) {
    const entries=sourceEntries.map(e=>({...e,geometry:compatible(e.geometry)}));
    const vertices=entries.reduce((sum,e)=>sum+e.geometry.attributes.position.count,0);
    const indices=entries.reduce((sum,e)=>sum+(e.geometry.index?.count??e.geometry.attributes.position.count),0);
    const count=entries.reduce((sum,e)=>sum+e.matrices.length,0);
    const mesh=new THREE.BatchedMesh(count,vertices,indices,material);
    mesh.name='palace-shared:'+material.name;mesh.sortObjects=false;
    for(const e of entries) {
      const id=mesh.addGeometry(e.geometry);
      for(const matrix of e.matrices)mesh.setMatrixAt(mesh.addInstance(id),matrix);
    }
    mesh.userData.palaceInstances=entries;
    mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  group.userData.stats = palaceStats(group);
  return group;
}

export function palaceStats(group) {
  let triangles=0,calls=0;
  group.traverse(o=>{
    if(!o.isMesh)return;
    calls++;
    if(o.isBatchedMesh)for(const e of o.userData.palaceInstances)
      triangles+=(e.geometry.index?.count??e.geometry.attributes.position.count)/3*e.matrices.length;
    else triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);
  });
  return{triangles,calls};
}

// Height alone must not switch an entire district to an almost flat silhouette.
// The same ground-distance policy applies to every moving or still camera.
export class PlanarLOD extends THREE.LOD {
  update(camera) {
    this.getWorldPosition(_origin);camera.getWorldPosition(_eye);
    const spatial=_eye.distanceTo(_origin)/(camera.zoom||1);
    _eye.y=_origin.y;
    const distance=_eye.distanceTo(_origin)/(camera.zoom||1);
    let active=0;
    for(let i=1;i<this.levels.length;i++)if((i===1?spatial:distance)>=this.levels[i].distance)active=i;
    this.levels.forEach((entry,i)=>{entry.object.visible=i===active;});
    this._currentLevel=active;
  }
}
const _origin=new THREE.Vector3(),_eye=new THREE.Vector3();

// Far buildings keep the curved roof beds and ridges of LOD1 over the enclosed LOD2 body.
export function roofVolume(model, mats) {
  const result=new THREE.Group();
  for(const child of model.lod2.children)if(child.material!==mats.tile&&child.material!==mats.ridge)result.add(child.clone());
  for(const child of model.lod1.children)if(!child.isInstancedMesh&&(child.material===mats.tile||child.material===mats.ridge))result.add(child.clone());
  return result;
}

export function placed(object, entry) {
  const group = new THREE.Group();
  group.position.set(...entry.position);
  group.rotation.y = entry.rotation ?? 0;
  group.add(object);
  return group;
}

// Full visible timber gets the same building's merged silhouette in preview shadow passes.
export function previewShadowProxy(visible, simplified) {
  const proxy = new THREE.Group();
  proxy.name = 'palace-preview-shadow-proxy';
  const material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  // Silhouette roofs have no soffit: both sides must occlude light, as a solid roof would.
  material.shadowSide = THREE.DoubleSide;
  material.userData.noPatch = true;
  const batch = new GeometryBatch();
  simplified.updateMatrixWorld(true);
  for (const original of simplified.children) {
    // Bracket paint does not change the overall silhouette; timber bearing bands remain.
    if (original.material.name.startsWith('paint-')) continue;
    if(original.isBatchedMesh)for(const e of original.userData.palaceInstances)
      for(const matrix of e.matrices)batch.add(e.geometry,original.matrixWorld.clone().multiply(matrix));
    else if (original.isInstancedMesh) {
      const matrix = new THREE.Matrix4();
      for (let i=0;i<original.count;i++) {
        original.getMatrixAt(i,matrix);
        batch.add(original.geometry,original.matrixWorld.clone().multiply(matrix));
      }
    } else batch.add(original.geometry, original.matrixWorld);
  }
  const mesh=batch.mesh(material,'palace-shadow-silhouette');
  mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  mesh.receiveShadow=false;proxy.add(mesh);
  visible.traverse(o => { if (o.isMesh) o.castShadow = false; });
  visible.add(proxy);
}
