import * as THREE from 'three';
import { buildHall } from '../yingzao/hall.js';
import { proceduralMaterial } from '../core/materials.js';

export function hallTestSpec(variant = 'hero') {
  // inferred: validation bay widths, column heights, fill plans and camera positions are design choices, not surveyed halls.
  if (variant === 'small') return { frontBays: [3.6, 4.2, 3.6], sideBays: [3.6, 3.6], caiGrade: 3, klass: 'tingtang',
    tiao: 2, columnHeight: 4.6, roof: 'xieshan', eaves: 1, interior: true, tile: 'tongwa', platform: { height: 0.6, margin: 1.5 },
    bayFill: { south: ['lattice', 'door', 'lattice'], north: 'wall', east: 'wall', west: 'wall' } };
  if (variant === 'corridor') return { frontBays: Array(10).fill(3.2), sideBays: [3.4], caiGrade: 6, klass: 'yuwu',
    tiao: 1, columnHeight: 3.1, roof: 'xuanshan', eaves: 1, tile: 'banwa', platform: { height: 0.3, margin: 0.6 }, bayFill: 'open' };
  return { frontBays: [4, 4, 4.5, 5, 4.5, 4, 4], sideBays: [3.5, 4, 4, 3.5], caiGrade: 2, klass: 'diange',
    tiao: 3, columnHeight: 7.6, rafterDiameter: 0.156, jiaPerSlope: 4, roof: 'wudian', eaves: 2, interior: true,
    platform: { height: 2, margin: 2.2 }, tile: 'tongwa',
    bayFill: { south: ['wall', 'lattice', 'door', 'door', 'door', 'lattice', 'wall'], north: 'wall', east: 'wall', west: 'wall' } };
}

export async function build(engine) {
  const variant = engine.params?.get('hall') || 'hero', spec = hallTestSpec(variant);
  const hall = buildHall(spec, engine), lod = new THREE.LOD(); lod.name = 'yingzao-hall';
  // inferred: physical distance thresholds; the test views never select geometry directly.
  lod.addLevel(hall.lod0, 0); lod.addLevel(hall.lod1, 100); lod.addLevel(hall.lod2, 350);
  engine.add(lod);
  engine.onUpdate(() => lod.update(engine.camera));
  for (const c of hall.footprint.obstacles) {
    if (c.type === 'circle') engine.footprints.addCircle(c.x, c.z, c.radius, c.tag);
    else engine.footprints.addRect(c.x, c.z, c.hw, c.hd, c.rotation, c.tag);
  }
  const { hw, hd, platformHeight } = hall.footprint;
  engine.groundHeight = (x, z) => {
    if (Math.abs(x) <= hw && Math.abs(z) <= hd) return platformHeight;
    const steps = Math.ceil(platformHeight / 0.16), distance = Math.abs(z) - hd;
    const sw = spec.frontBays[Math.floor(spec.frontBays.length / 2)] / 2;
    if (Math.abs(x) <= sw && distance >= 0 && distance < steps * 0.32)
      return platformHeight * (steps - Math.floor(distance / 0.32)) / steps;
    return 0;
  };
  engine.registry.hall = hall; engine.registry.hallLOD = lod;
  console.log('[hall] geometry budgets ' + JSON.stringify(hall.stats));
  return hall;
}

export async function test(engine) {
  const hall = await build(engine);
  // inferred: a neutral flat inspection apron, with no reference artwork or camera-specific dressing.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), proceduralMaterial({ name: 'hall-test-apron',
    params: { color: 0x8b8472, roughness: 0.96 },
    color: 'diffuseColor.rgb *= 0.92 + 0.12 * cgVnoise2(cgP.xz * 0.25);' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.025; engine.add(ground, { castShadow: false });
  const outer = hall.surround || hall.layout, base = hall.layout.spec.platform.height;
  const x = outer.width / 2, z = outer.depth / 2, top = base + outer.spec.columnHeight;
  const scale = Math.max(0.5, outer.width / 36.8), targetY = base + hall.layout.spec.columnHeight * 0.7;
  const views = [
    { pos: [28 * scale, 14 * scale, 32 * scale], target: [0, targetY, 0], fov: 62 },
    { pos: [0, 8 * scale, 60 * scale], target: [0, targetY, 0], fov: 42 },
    { pos: [outer.xs[2] + 1.6, base + 1.6, z + 1.6], target: [outer.xs[2], top + 1.0, z], fov: 73 },
    { pos: [x + 5, top - 0.8, z + 5], target: [x, top + 1.9, z], fov: 60 },
    { pos: [45 * scale, 56 * scale, 40 * scale], target: [0, targetY, 0], fov: 44 },
    { pos: [90, 32, 116], target: [0, targetY, 0], fov: 23 },
    { pos: [300, 95, 400], target: [0, targetY, 0], fov: 15 },
  ];
  engine.registry.hallViews = views;
  return { views };
}
