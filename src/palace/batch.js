import * as THREE from 'three';
import { GeometryBatch, meshStats } from '../yingzao/geometry.js';

// One draw per shared material for static fabric; repeated brackets/rail panels stay instanced.
export function bake(source, name) {
  source.updateMatrixWorld(true);
  const batches = new Map(), repeated = new Map(), group = new THREE.Group();
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
      if (!batches.has(o.material)) batches.set(o.material, new GeometryBatch());
      batches.get(o.material).add(o.geometry, o.matrixWorld);
    }
  });
  for (const [material, batch] of batches) group.add(batch.mesh(material, material.name));
  for (const e of repeated.values()) {
    const mesh = new THREE.InstancedMesh(e.geometry, e.material, e.matrices.length);
    mesh.name = e.name;
    e.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.userData.stats = meshStats(group);
  return group;
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
    if (original.isInstancedMesh) {
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
