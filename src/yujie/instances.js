import * as THREE from 'three';
import { GeometryBatch } from '../yingzao/geometry.js';

export function matrix(position, yaw = 0, scale = [1, 1, 1]) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...position),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(...scale));
}

/** Bake a public generator's local instances, preserving its material attributes. */
export function bake(root) {
  root.updateMatrixWorld(true);
  const batches = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    if (!batches.has(o.material)) batches.set(o.material, new GeometryBatch());
    for (let i = 0; i < (o.isInstancedMesh ? o.count : 1); i++) {
      const local = new THREE.Matrix4();
      if (o.isInstancedMesh) o.getMatrixAt(i, local);
      batches.get(o.material).add(o.geometry, o.matrixWorld.clone().multiply(local));
    }
  });
  return [...batches].map(([material, batch]) => ({ material, geometry: batch.geometry() }));
}

/** Compact instances before scene traversal, so shadows see the same LOD as the camera.
 * Thresholds are physical distances, independent of any validation framing.
 */
export function instanceLods(engine, name, levels, entries, distances, { depth, flora = false, shadow = true } = {}) {
  const group = new THREE.Group(); group.name = name;
  const rng = engine.rng(name + ':wear');
  const items = entries.map(entry => ({ ...entry,
    position: new THREE.Vector3().setFromMatrixPosition(entry.matrix),
    tint: new THREE.Color().setRGB(rng.range(0.79, 1.06), rng.range(0.81, 1.04), rng.range(0.79, 1.03)),
    phase: rng.range(0, Math.PI * 2), warp: rng.range(-1, 1),
  }));
  const meshes = levels.map((parts, l) => parts.map(({ material, geometry }) => {
    const g = geometry.clone();
    if (flora) g.setAttribute('iFlora', new THREE.InstancedBufferAttribute(new Float32Array(items.length * 4), 4));
    const mesh = new THREE.InstancedMesh(g, material, items.length);
    mesh.name = name + ':LOD' + l; mesh.count = 0; mesh.customDepthMaterial = depth;
    // inferred: subpixel distant silhouettes receive shadows; shadow casting stops at the far LOD.
    mesh.userData.castShadow = shadow && l < 2; mesh.castShadow = shadow && l < 2;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(mesh); return mesh;
  }));
  let last = [];
  const update = () => {
    const p = engine.camera.position;
    if (p.x === last[0] && p.y === last[1] && p.z === last[2]) return;
    last = p.toArray(); const counts = levels.map(() => 0);
    for (const item of items) {
      const d = item.position.distanceTo(p);
      const l = d < distances[0] ? 0 : d < distances[1] ? 1 : 2, k = counts[l]++;
      for (const mesh of meshes[l]) {
        mesh.setMatrixAt(k, item.matrix); mesh.setColorAt(k, item.tint);
        if (flora) mesh.geometry.attributes.iFlora.set([item.phase, 1, item.warp, 1], k * 4);
      }
    }
    meshes.forEach((parts, l) => parts.forEach(mesh => {
      mesh.count = counts[l]; mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (flora) mesh.geometry.attributes.iFlora.needsUpdate = true;
      if (mesh.count) mesh.computeBoundingSphere();
    }));
    group.userData.counts = counts;
  };
  group.updateMatrixWorld = function(force) { update(); THREE.Group.prototype.updateMatrixWorld.call(this, force); };
  engine.add(group, { castShadow: shadow }); update();
  return group;
}
