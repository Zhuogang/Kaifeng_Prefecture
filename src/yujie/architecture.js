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
import { paintMaterial } from '../yingzao/paint.js';
import { bracketGeometry, bracketHeight } from '../yingzao/brackets.js';
import { addCorridorPanels } from './corridor-panels.js';
import { bake, matrix, instanceLods } from './instances.js';
import { reaches, rowReaches, subtractGaps, northEnd, southEnd, northShoulder, southShoulder } from './layout.js';

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
  // inferred: this official 御廊 uses structural 五铺作 (two jumps), rather than
  // the one-jump small-corridor laboratory model. All arm/block dimensions and
  // the matching roof bearing height remain generated from 营造法式.
  const spec = { ...hallTestSpec('corridor'), tiao: 2, columnHeight: P.corridor.columnHeight, bayFill: 'open' };
  const hall = buildHall(spec, engine, { timber, bracket: timber, tile, ridge: tile, stone: floor, plaster });
  // Keep real public 铺作 independently instanced: selecting the shell LOD by a
  // 32 m module centre previously hid the brackets on nearby corridor bays.
  for(const lod of [hall.lod0,hall.lod1,hall.lod2])
    for(const child of [...lod.children]) if(child.name.startsWith('铺作-') || child.name==='bracket') lod.remove(child);
  // The public frame installs a solid 栱眼壁 on open elevations too. On this
  // gallery's open north face it hides the actual inward bracket arms. Remove
  // only that 0.16 m bearing board, identified by its source member section.
  for(const lod of [hall.lod0,hall.lod1]) {
    const g=lod.children.find(o=>o.name==='timber').geometry;
    const p=g.attributes.position, size=g.attributes.memberSize, keep=[];
    for(let i=0;i<g.index.count;i+=3) {
      const tri=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
      const board=tri.every(v=>Math.abs(size.getY(v)-bracketHeight(hall.layout.spec))<.00001 &&
        Math.abs(p.getZ(v)-(-hall.layout.depth/2+.14))<.11);
      if(!board) keep.push(...tri);
    }
    g.setIndex(keep);
  }
  addCorridorPanels(hall,{timber,plaster});
  const entries = [], modules = [];
  const localLength = hall.layout.width;
  for (const sign of [-1, 1]) for (const [a, b] of reaches)
    for (const [start, end] of subtractGaps(a, b, P.crossStreets, P.fenceGap)) {
      const count = Math.ceil((end - start) / localLength), length = (end - start) / count;
      for (let i = 0; i < count; i++) {
        const x = sign * P.corridor.centerX, z = start + (i + 0.5) * length, yaw = sign * Math.PI / 2;
        const scale = length / localLength;
        const m = matrix([x, P.surfaceY, z], yaw, [scale, 1, 1]); entries.push({ matrix: m, yaw });
        modules.push({ x, start: start + i * length, end: start + (i + 1) * length });
        for (const obstacle of hall.footprint.obstacles) {
          const point = new THREE.Vector3(obstacle.x, 0, obstacle.z).applyMatrix4(m);
          if (obstacle.type === 'circle') engine.footprints.addCircle(point.x, point.z, obstacle.radius, 'yujie:column');
          else engine.footprints.addRect(point.x, point.z, obstacle.hw * scale, obstacle.hd,
            obstacle.rotation + yaw, 'yujie:corridor-wall');
        }
        // Closed outer panels/doors; cross-street openings are supplied by the
        // interrupted module runs and remain free of both geometry and collision.
        const back=new THREE.Vector3(0,0,hall.layout.depth/2).applyMatrix4(m);
        engine.footprints.addRect(back.x,back.z,localLength*scale/2,.15,yaw,'yujie:corridor-wall');
      }
    }
  // inferred: close timber at 28 m, merged structure to 140 m, then complete roof/wall silhouettes.
  const levels=[bake(hall.lod0),bake(hall.lod1),bake(hall.lod2)];
  const shadowBatch=new GeometryBatch();
  for(const part of levels[1]) shadowBatch.add(part.geometry);
  const shadowGeometry=shadowBatch.geometry();
  const group = instanceLods(engine, 'yujie:corridors', levels, entries, [28, 140],
    {shadowLevels:[[shadowGeometry],[shadowGeometry],[]]});
  // inferred: subdued 碾玉装 on the official gallery's large structural brackets,
  // kept distinct from vermilion columns so the actual rolled arms read below the eaves.
  const paint=paintMaterial(engine,{style:'nianyu',wear:.86,tint:new THREE.Color().setRGB(1.6,1.65,1.35)}), brackets=[];
  for(const kind of ['zhutou','bujian','zhuanjiao']) {
    const sets=[];
    for(const entry of entries) for(const set of hall.layout.sets.filter(s=>s.kind===kind)) {
      const position=new THREE.Vector3(set.x,set.y,set.z).applyMatrix4(entry.matrix);
      // Fit set positions to the gallery run without scaling the prescribed
      // 材 sections or 72/62/92 分 arms themselves.
      sets.push({matrix:matrix(position.toArray(),entry.yaw+set.angle)});
    }
    const detail=bracketGeometry(hall.layout.spec,kind), proxy=bracketGeometry({...hall.layout.spec,shadowProxy:true},kind);
    brackets.push(instanceLods(engine,'yujie:puzuo:'+kind,
      [[{geometry:detail,material:paint}],[{geometry:proxy,material:paint}],[]],sets,[80,140],
      // inferred: preview bearing/roof shadows are supplied by the shell's
      // merged structural proxy; stills additionally shadow each rolled arm.
      {shadow:engine.quality.detail>=1,shadowLevels:[[proxy],[proxy],[]]}));
  }
  console.log('[yujie] corridor shells '+JSON.stringify(levels.map(parts=>parts.reduce((sum,p)=>sum+(p.geometry.index?.count??p.geometry.attributes.position.count)/3,0))));
  return { group, brackets, modules, floorY: P.surfaceY + spec.platform.height };
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
      for (const [a, b] of rowReaches) for (const [start, end] of subtractGaps(a, b, P.crossings, P.fenceGap))
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
