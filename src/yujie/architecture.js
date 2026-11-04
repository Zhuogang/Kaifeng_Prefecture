import * as THREE from 'three';
import { YUJIE as P } from '../world/plan.js';
import { buildHall } from '../yingzao/hall.js';
import { hallTestSpec } from '../modules/hall.js';
import { chazi } from '../yingzao/ornament.js';
import { GeometryBatch } from '../yingzao/geometry.js';
import { timberMaterial } from '../materials/timber.js';
import { tileMaterial } from '../materials/tile.js';
import { plasterMaterial } from '../materials/plaster.js';
import { pavingMaterial } from '../materials/paving.js';
import { bake, matrix, instanceLods } from './instances.js';
import { reaches, subtractGaps, northEnd, southEnd, northShoulder, southShoulder } from './layout.js';

export function buildCorridors(engine) {
  const timber = timberMaterial(engine, { wear: 0.86 }), tile = tileMaterial(engine, { variant: 'grey' });
  const floor = pavingMaterial(engine, { ruts: 0, drains: 0 });
  const plaster = plasterMaterial(engine, { baseY: P.surfaceY, wear: 0.88 });
  // inferred: stable bay-group pigment/glaze variation in addition to world-space weathering.
  for (const material of [timber, tile, plaster]) {
    const compile = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      compile(shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
        'diffuseColor.rgb *= mix(vec3(.83,.86,.88),vec3(1.10,1.04,.98),cgSeed);\n#include <roughnessmap_fragment>');
    };
    material.userData.shaderKey += ':yujie-bay-wear';
  }
  const spec = { ...hallTestSpec('corridor'), columnHeight: P.corridor.columnHeight,
    // inferred: outer walls protect the corridor; occasional lattice openings break the long plaster wall.
    bayFill: { north: 'open', south: Array.from({ length: P.corridor.bays }, (_, i) => i % 4 === 1 ? 'lattice' : 'wall'),
      east: 'open', west: 'open' } };
  const hall = buildHall(spec, engine, { timber, bracket: timber, tile, ridge: tile, stone: floor, plaster });
  const entries = [], modules = [];
  const localLength = hall.layout.width;
  for (const sign of [-1, 1]) for (const [a, b] of reaches)
    for (const [start, end] of subtractGaps(a, b, P.crossStreets, P.fenceGap)) {
      const count = Math.ceil((end - start) / localLength), length = (end - start) / count;
      for (let i = 0; i < count; i++) {
        const x = sign * P.corridor.centerX, z = start + (i + 0.5) * length, yaw = sign * Math.PI / 2;
        const scale = length / localLength;
        const m = matrix([x, P.surfaceY, z], yaw, [scale, 1, 1]); entries.push({ matrix: m });
        modules.push({ x, start: start + i * length, end: start + (i + 1) * length });
        for (const obstacle of hall.footprint.obstacles) {
          const point = new THREE.Vector3(obstacle.x, 0, obstacle.z).applyMatrix4(m);
          if (obstacle.type === 'circle') engine.footprints.addCircle(point.x, point.z, obstacle.radius, 'yujie:column');
          else engine.footprints.addRect(point.x, point.z, obstacle.hw * scale, obstacle.hd,
            obstacle.rotation + yaw, 'yujie:corridor-wall');
        }
      }
    }
  // inferred: close timber at 28 m, merged structure to 140 m, then complete roof/wall silhouettes.
  const group = instanceLods(engine, 'yujie:corridors', [bake(hall.lod0), bake(hall.lod1), bake(hall.lod2)], entries, [28, 140]);
  console.log('[yujie] corridor prototype ' + JSON.stringify(hall.stats));
  return { group, modules, floorY: P.surfaceY + spec.platform.height };
}

function fenceLevels(engine, variant) {
  const publicModel = chazi(engine, { path: [[0, 0, 0], [2, 0, 0]], variant });
  const detail = bake(publicModel.lod0);
  const material = detail[0].material;
  const middle = new GeometryBatch(), far = new GeometryBatch();
  // inferred: beyond 42/160 m, merge pickets into the enduring rail/post silhouette.
  for (const batch of [middle, far]) {
    for (const y of [0.315, 0.84]) batch.box([1, y, 0], [2, 0.095, 0.095]);
    batch.box([0, 0.525, 0], [0.12, 1.05, 0.12]);
  }
  for (let i = 1; i < 4; i++) middle.box([i * 0.5, 0.5, 0], [0.047, 0.735, 0.047]);
  return [detail, [{ material, geometry: middle.geometry() }], [{ material, geometry: far.geometry() }]];
}

export function buildFences(engine) {
  const result = [];
  for (const [variant, x] of [['vermilion', P.section.bank], ['black', P.section.blackFence]]) {
    const entries = [];
    const segment = (a, b) => {
      const distance = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.ceil(distance / 2);
      const yaw = -Math.atan2(b[2] - a[2], b[0] - a[0]);
      for (let i = 0; i < n; i++) {
        const t = i / n, p = a.map((v, k) => v + (b[k] - v) * t);
        entries.push({ matrix: matrix(p, yaw, [distance / n / 2, 1, 1]) });
      }
      engine.footprints.addPath([[a[0], a[2]], [b[0], b[2]]], 0.09, 'yujie:fence:' + variant);
    };
    for (const sign of [-1, 1]) {
      for (const [a, b] of reaches) for (const [start, end] of subtractGaps(a, b, P.crossings, P.fenceGap))
        segment([sign * x, P.surfaceY, start], [sign * x, P.surfaceY, end]);
      if (variant === 'black') {
        segment([sign * x, P.surfaceY, northShoulder], [sign * P.bridgeHalfWidth, P.bridge.north[1], northEnd]);
        segment([sign * P.bridgeHalfWidth, P.bridge.south[1], southEnd], [sign * x, P.surfaceY, southShoulder]);
      }
    }
    result.push(instanceLods(engine, 'yujie:' + variant + '-chazi', fenceLevels(engine, variant), entries, [42, 160]));
  }
  return result;
}
