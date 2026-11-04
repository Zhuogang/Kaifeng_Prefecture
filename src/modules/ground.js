import * as THREE from 'three';
import { proceduralMaterial } from '../core/materials.js';
import { GROUND, BOX, VALIDATION } from '../world/plan.js';

export async function build(engine) {
  const rng = engine.rng('ground-relief');
  const phase = rng.random() * Math.PI * 2;
  const n = GROUND.segments, axis = new Float32Array(n + 1);
  const positions = new Float32Array((n + 1) ** 2 * 3), indices = [];
  for (let i = 0; i <= n; i++) {
    const u = 2 * i / n - 1;
    axis[i] = Math.sign(u) * GROUND.gridScale * Math.expm1(Math.abs(u) * Math.log1p(GROUND.halfExtent / GROUND.gridScale));
  }
  const height = (x, z) => {
    // inferred: flatten the calibration box's footing; the rest stays within ±0.5 m.
    const distance = Math.max(Math.abs(x - BOX.base[0]) - BOX.size[0] / 2,
      Math.abs(z - BOX.base[2]) - BOX.size[2] / 2, 0);
    const blend = THREE.MathUtils.smoothstep(distance, 0, 30);
    const k = 2 * Math.PI / GROUND.wavelength;
    return GROUND.relief * blend * (0.65 * Math.sin(x * k) * Math.cos(z * k + phase)
      + 0.35 * Math.sin(z * k * 0.43));
  };
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const p = (j * (n + 1) + i) * 3;
    positions.set([axis[i], height(axis[i], axis[j]), axis[j]], p);
    if (i < n && j < n) {
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Query the actual triangles, so eye height agrees with the rendered surface at every LOD distance.
  const cell = (v) => {
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (axis[m] <= v) lo = m; else hi = m; }
    return lo;
  };
  engine.groundHeight = (x, z) => {
    const i = cell(x), j = cell(z);
    const u = THREE.MathUtils.clamp((x - axis[i]) / (axis[i + 1] - axis[i]), 0, 1);
    const v = THREE.MathUtils.clamp((z - axis[j]) / (axis[j + 1] - axis[j]), 0, 1);
    const at = (ix, iz) => positions[(iz * (n + 1) + ix) * 3 + 1];
    return u + v <= 1
      ? at(i, j) * (1 - u - v) + at(i + 1, j) * u + at(i, j + 1) * v
      : at(i + 1, j + 1) * (u + v - 1) + at(i, j + 1) * (1 - u) + at(i + 1, j) * (1 - v);
  };
  const material = proceduralMaterial({
    name: 'silt-and-grass', params: { roughness: 0.96 },
    // inferred: subdued linear silt/grass albedos, broad patches and filtered soil grain.
    color: `
      float field = cgVfbm2(cgP.xz * 0.008, 4);
      float grain = cgVnoise2(cgP.xz * 7.0);
      float filterWidth = max(length(dFdx(cgP.xz)), length(dFdy(cgP.xz)));
      grain = mix(grain, 0.5, smoothstep(0.03, 0.25, filterWidth));
      diffuseColor.rgb = mix(vec3(0.19, 0.14, 0.085), vec3(0.075, 0.105, 0.042), smoothstep(0.33, 0.68, field));
      diffuseColor.rgb *= 0.92 + grain * 0.16;
    `,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.name = 'plain';
  engine.add(ground, { castShadow: false });

  const box = new THREE.Mesh(new THREE.BoxGeometry(...BOX.size), proceduralMaterial({
    // inferred: neutral warm-grey matte calibration surface, without architectural dressing.
    name: 'calibration-box', params: { color: 0xaaa398, roughness: 0.9 },
  }));
  box.position.set(BOX.base[0], BOX.base[1] + BOX.size[1] / 2, BOX.base[2]);
  box.name = 'calibration-box';
  engine.add(box);
  engine.footprints.addRect(BOX.base[0], BOX.base[2], BOX.size[0] / 2, BOX.size[2] / 2, 0, box.name);
  engine.registry.ground = ground;
  engine.registry.calibrationBox = box;
}

export async function test(engine) {
  await build(engine);
  const eye = VALIDATION.eye;
  return { views: [
    { ...eye, pos: [eye.pos[0], engine.groundHeight(eye.pos[0], eye.pos[2]) + 1.6, eye.pos[2]] },
    VALIDATION.aerial,
  ] };
}
