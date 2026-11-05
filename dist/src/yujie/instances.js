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
 * distances may also return thresholds per entry (e.g. the two orchard rows).
 */
export function instanceLods(engine, name, levels, entries, distances, { depth, flora = false, shadow = true, shadowLevels } = {}) {
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
    g.computeBoundingBox();
    mesh.name = name + ':LOD' + l; mesh.count = 0; mesh.customDepthMaterial = depth;
    // inferred: subpixel distant silhouettes receive shadows; shadow casting stops at the far LOD.
    mesh.userData.castShadow = shadow && l < 2 && !shadowLevels; mesh.castShadow = mesh.userData.castShadow;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(mesh); return mesh;
  }));
  if (shadowLevels && shadow) {
    // inferred: retain the same model's branch/roof silhouette in shadow passes,
    // avoiding millions of subpixel flower/socket triangles in preview shadows.
    const invisible = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    invisible.userData.noPatch = true; invisible.shadowSide = THREE.DoubleSide;
    shadowLevels.forEach((parts,l) => parts.forEach(geometry => {
      const g=geometry.clone();
      if (flora) g.setAttribute('iFlora',new THREE.InstancedBufferAttribute(new Float32Array(items.length*4),4));
      const mesh=new THREE.InstancedMesh(g,invisible,items.length);
      mesh.name=name+':shadow-LOD'+l; mesh.count=0; mesh.customDepthMaterial=depth;
      mesh.castShadow=true; mesh.receiveShadow=false;
      mesh.userData.castShadow=true; mesh.userData.receiveShadow=false;
      mesh.userData.yujieShadowProxy=true;
      group.add(mesh); meshes[l].push(mesh);
    }));
  }
  // Cull individual visible instances, rather than drawing every tree in an
  // avenue-length batch. Offscreen shadow proxies remain: their shadows may enter
  // the view. Geometry LOD still depends only on physical distance.
  const bounds=levels.map(parts=>{
    const box=new THREE.Box3();
    for(const part of parts) { part.geometry.computeBoundingBox(); box.union(part.geometry.boundingBox); }
    const sphere=box.getBoundingSphere(new THREE.Sphere());
    // inferred: bounded wind/branch warp from the public flora vertex deformation.
    if(flora) sphere.radius+=.4;
    return sphere;
  });
  let last = [];
  const frustum=new THREE.Frustum(), projection=new THREE.Matrix4(), sphere=new THREE.Sphere();
  const update = () => {
    const p = engine.camera.position;
    const key=[...engine.camera.matrixWorldInverse.elements,...engine.camera.projectionMatrix.elements];
    if(key.every((v,i)=>v===last[i]))return;
    last=key; const counts = levels.map(() => 0), shadowCounts=levels.map(()=>0);
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(engine.camera.projectionMatrix,engine.camera.matrixWorldInverse));
    for (const item of items) {
      const d = item.position.distanceTo(p);
      const limits=typeof distances==='function'?distances(item):distances;
      const l = d < limits[0] ? 0 : d < limits[1] ? 1 : 2;
      sphere.copy(bounds[l]).applyMatrix4(item.matrix);
      const castsWithoutProxy=shadow && !shadowLevels && l<2;
      const visible=levels[l].length>0 && (castsWithoutProxy || frustum.intersectsSphere(sphere));
      const k=visible?counts[l]++:0, sk=shadowCounts[l]++;
      for (const mesh of meshes[l]) {
        const proxy=mesh.userData.yujieShadowProxy;
        if(!proxy && !visible)continue;
        const index=proxy?sk:k;
        mesh.setMatrixAt(index, item.matrix);
        if(!proxy) mesh.setColorAt(index, item.tint);
        if (flora) mesh.geometry.attributes.iFlora.set([item.phase, 1, item.warp, 1], index * 4);
      }
    }
    meshes.forEach((parts, l) => parts.forEach(mesh => {
      mesh.count = mesh.userData.yujieShadowProxy?shadowCounts[l]:counts[l]; mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (flora) mesh.geometry.attributes.iFlora.needsUpdate = true;
      if (mesh.count) mesh.computeBoundingSphere();
    }));
    group.userData.counts = counts;
    group.userData.shadowCounts = shadowCounts;
  };
  group.updateMatrixWorld = function(force) { update(); THREE.Group.prototype.updateMatrixWorld.call(this, force); };
  engine.add(group, { castShadow: shadow }); update();
  return group;
}
