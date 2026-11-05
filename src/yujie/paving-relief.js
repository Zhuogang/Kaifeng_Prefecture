import * as THREE from 'three';
import { YUJIE as P } from '../world/plan.js';
import { pavingMaterial, PAVING_BRICK_SIZE, PAVING_STONE_SIZE, PAVING_ROW_JITTER } from '../materials/paving.js';
import { reaches, plazaEnd, onXuandeStructure, pavingLayoutGLSL } from './layout.js';

const fract = x => x - Math.floor(x);
// Same stable cell hash as cgHash12, so near geometry agrees with the procedural bond.
function hash(x, y) {
  let a = fract(x * .1031), b = fract(y * .1031), c = a;
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d; return fract((a + b) * c);
}

function dressedTop() {
  const g = new THREE.BufferGeometry(), positions = [], indices = [];
  // inferred: a millimetric worn bevel; the hidden bottom is already the paved surface.
  for (const [y, inset] of [[0, 0], [1, .018]])
    for (const [x, z] of [[-1, -1], [-1, 1], [1, 1], [1, -1]]) positions.push(x * (.5 - inset), y * .003, z * (.5 - inset));
  indices.push(4, 5, 6, 4, 6, 7);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; indices.push(i, j, j + 4, i, j + 4, i + 4); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices);
  const flat = g.toNonIndexed(); flat.computeVertexNormals(); g.dispose(); return flat;
}

/** Distance LOD for the same infinite mathematical bond used in paving.js. These
 * stones have fixed world identities; only their millimetric geometric relief
 * converges to the shader surface away from any moving camera.
 */
export function addPavingRelief(engine) {
  const group = new THREE.Group(); group.name = 'yujie:walking-paving-relief';
  const geometry = dressedTop(), matrix = new THREE.Matrix4();
  const meshes = [false, true].map(brick => {
    const mesh = new THREE.InstancedMesh(geometry, pavingMaterial(engine, {
      variant: brick ? 'brick' : 'bluestone', layout: pavingLayoutGLSL(brick), ruts: 1, drains: 1,
    }), 3000);
    mesh.count = 0; group.add(mesh); return mesh;
  });
  let last = [];
  const update = () => {
    const p = engine.camera.position;
    if (p.x === last[0] && p.y === last[1] && p.z === last[2]) return;
    last = p.toArray();
    meshes.forEach((mesh, kind) => {
      let count = 0; const [sx,sz] = kind ? PAVING_BRICK_SIZE : PAVING_STONE_SIZE, radius = 6;
      if (p.y - engine.groundHeight(p.x, p.z) < 8) {
        const u=kind?p.z:p.x, v=kind?p.x:p.z;
        const row0 = Math.floor((v - radius) / sz), row1 = Math.ceil((v + radius) / sz);
        const cell0 = Math.floor((u - radius) / sx) - 1, cell1 = Math.ceil((u + radius) / sx) + 1;
        for (let row = row0; row <= row1; row++) for (let cell = cell0; cell <= cell1; cell++) {
          const offset = (hash(row, 17.1) - .5) * sx * PAVING_ROW_JITTER;
          const cu=(cell+.5-((row%2+2)%2)*.5)*sx-offset, cv=(row+.5)*sz;
          const x=kind?cv:cu, z=kind?cu:cv;
          const d = Math.hypot(x - p.x, z - p.z);
          if (d >= radius || !reaches.some(([a,b]) => z >= a && z <= b) || Math.abs(x) > P.section.edge) continue;
          if (onXuandeStructure(x,z)) continue;
          if (z >= plazaEnd && Math.abs(x) > P.section.road && Math.abs(x) < P.section.bank) continue;
          const corridor = engine.registry.yujie.corridors.modules.some(m => Math.abs(x - m.x) < 2.25 && z > m.start && z < m.end);
          const brick = z >= plazaEnd && Math.abs(x) > P.section.bank && !corridor;
          if (brick !== !!kind) continue;
          const fade = 1 - THREE.MathUtils.smoothstep(d, 3, radius), h = (.001 + hash(cell, row) * .003) * fade;
          matrix.makeScale((kind?sz:sx)-.007, h/.003, (kind?sx:sz)-.007); matrix.setPosition(x, engine.groundHeight(x,z) + .0002, z);
          mesh.setMatrixAt(count++, matrix);
        }
      }
      mesh.count = count; mesh.visible = count > 0; mesh.instanceMatrix.needsUpdate = true;
      if (count) mesh.computeBoundingSphere();
    });
  };
  group.updateMatrixWorld = function(force) { update(); THREE.Group.prototype.updateMatrixWorld.call(this, force); };
  engine.add(group, { castShadow: false }); return group;
}
