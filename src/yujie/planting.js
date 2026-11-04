import * as THREE from 'three';
import { YUJIE as P } from '../world/plan.js';
import { buildBlossom } from '../flora/trees.js';
import { buildLotus, instancePetals } from '../flora/groundcover.js';
import { floraMaterials } from '../flora/materials.js';
import { matrix, instanceLods } from './instances.js';
import { reaches } from './layout.js';

export function buildPlanting(engine) {
  const materials = floraMaterials(engine), rng = engine.rng('yujie:planting');
  const treeEntries = [], lotusEntries = [], petals = Object.fromEntries(P.planting.species.map(s => [s, []]));
  for (const sign of [-1, 1]) for (const [start, end] of reaches) {
    for (let z = start + P.planting.spacing / 2, i = 0; z < end - 3; z += P.planting.spacing, i++) {
      const pz = z + rng.range(-P.planting.jitter, P.planting.jitter);
      if (P.crossings.some(c => Math.abs(pz - c) < P.fenceGap / 2 + 2)) continue;
      const x = sign * (P.planting.centerX + rng.range(-0.8, 0.8)), species = P.planting.species[i % 4];
      const scale = rng.range(0.83, 1.13);
      treeEntries.push({ species, matrix: matrix([x, P.surfaceY, pz], rng.range(0, Math.PI * 2), [scale * rng.range(0.85, 1.1), scale, scale]) });
      engine.footprints.addCircle(x, pz, P.planting.height * scale * 0.035, 'yujie:tree');
      // inferred: sparse windblown petals in each crown's drip line and along the adjacent canal edge.
      for (let k = 0; k < 36; k++) {
        const [dx, dz] = rng.disk(); petals[species].push([x + dx * 2.6, P.surfaceY + 0.008, pz + dz * 2.6]);
      }
      for (let k = 0; k < 8; k++) petals[species].push([sign * rng.range(39, 41.5), P.waterY + 0.009, pz + rng.range(-3, 3)]);
    }
    // inferred: irregular loose lotus colonies with open water between, no late-spring flowers.
    for (let z = start + 2; z < end - 2; z += 2.6) {
      if (P.crossings.some(c => Math.abs(z - c) < P.crossingWidth)) continue;
      const cluster = rng.random() < 0.38 ? 1 : 3;
      for (let k = 0; k < cluster; k++) {
        const scale = rng.range(0.65, 1.15);
        lotusEntries.push({ matrix: matrix([sign * rng.range(P.section.road + 1, P.section.canal - 1),
          P.waterY + 0.018, z + rng.range(-1.1, 1.1)], rng.range(0, Math.PI * 2), [scale, scale, scale]) });
      }
    }
  }
  // A shared vertex-coloured model lets all four species share draws; their public
  // botanical models retain different flowers, bark and crown shapes.
  const treeGroups = [];
  for (const species of P.planting.species) {
    const model = buildBlossom({ species, height: P.planting.height, rng: engine.rng('yujie:model:' + species) });
    // inferred: fine individual blossoms only within 7 m; aggregated sprays to 115 m.
    treeGroups.push(instanceLods(engine, 'yujie:trees:' + species,
      [model.lod0, model.lod1, model.lod2].map(geometry => [{ geometry, material: materials.surface }]),
      treeEntries.filter(t => t.species === species), [7, 115], { depth: materials.depth, flora: true }));
    instancePetals(engine, petals[species], { species, materials });
  }
  const lotus = buildLotus({ rng: engine.rng('yujie:lotus') });
  // inferred: at long range retain the public leaf's notched outer rim as a triangle fan.
  // The five interior rings only describe centimetre relief, invisible beyond 80 m.
  const farLeaf = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(lotus.lod2.attributes)) {
    const values = [], rimStart = attribute.count - 17;
    for (const i of [0, ...Array.from({ length: 17 }, (_, j) => rimStart + j)])
      for (let k = 0; k < attribute.itemSize; k++) values.push(attribute.array[i * attribute.itemSize + k]);
    farLeaf.setAttribute(name, new THREE.Float32BufferAttribute(values, attribute.itemSize));
  }
  farLeaf.setIndex(Array.from({ length: 16 }, (_, i) => [0, i + 2, i + 1]).flat());
  const leaves = instanceLods(engine, 'yujie:lotus', [lotus.lod0, lotus.lod1, farLeaf].map(geometry =>
    [{ geometry, material: materials.surface }]), lotusEntries, [18, 80], { depth: materials.depth, flora: true, shadow: false });
  return { treeGroups, leaves, trees: treeEntries.length, lotus: lotusEntries.length };
}
