import * as THREE from 'three';
import { hallLayout } from './layout.js';
import { fen, columnDiameterFen, laneFen } from './rules.js';
import { GeometryBatch, meshStats, profilePrism } from './geometry.js';
import { addBrackets, bracketHeight } from './brackets.js';
import { timberMaterial } from '../materials/timber.js';
import { paintMaterial } from './paint.js';
import { tileMaterial } from '../materials/tile.js';
import { masonryMaterial } from '../materials/masonry.js';
import { plasterMaterial } from '../materials/plaster.js';
import { roofModel, buildRoof } from './roof.js';

/** Shared procedural families keep hall inspection and assembled buildings on the same surfaces. */
export function defaultHallMaterials(spec = {}, engine = {quality:{detail:0.5}}) {
  engine = engine?.quality ? engine : {quality:{detail:0.5}};
  const tile = spec.tile === 'banwa' ? 'grey' : 'green';
  return {timber:timberMaterial(engine), bracket:paintMaterial(engine,{style:'wucai'}),
    stone:masonryMaterial(engine), plaster:plasterMaterial(engine),
    tile:tileMaterial(engine,{variant:tile}), ridge:tileMaterial(engine,{variant:tile,ribbed:false})};
}

function columnGeometry(column, radius, f, segments) {
  const h = column.topY - column.baseY, foot = 0.22 + 10 * f;
  // 卷五 梭柱: unchanged lower/middle thirds; upper third contracts four 分 per side in three steps.
  const heights = [foot, h / 3, h * 2 / 3, h * 7 / 9, h * 8 / 9, h];
  const radii = [radius, radius, radius, radius - 4 * f / 3, radius - 8 * f / 3, radius - 4 * f];
  const g = new THREE.LatheGeometry(heights.map((y, i) => new THREE.Vector2(radii[i], y)), segments);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / h;
    p.setXYZ(i, p.getX(i) + column.x + (column.headX - column.x) * t,
      p.getY(i) + column.baseY, p.getZ(i) + column.z + (column.headZ - column.z) * t);
  }
  g.computeVertexNormals(); return g;
}

function frame(layout, lod, batches, collision, { fill = true, lowOuter = false } = {}) {
  const { spec: s } = layout, f = fen(s.caiGrade), radius = columnDiameterFen(s.klass).max * f / 2;
  const { timber, stone, bracket, plaster } = batches;
  for (const c of layout.columns) {
    if (lod === 2) {
      if (!lowOuter || !c.perimeter) continue;
      // inferred: four-sided columns at LOD2; hidden end caps are omitted to stay below 500 triangles.
      timber.beam([c.x, c.baseY, c.z], [c.headX, c.topY, c.headZ], radius * 2, radius * 2, 4, false);
    } else {
      const g = columnGeometry(c, radius, f, lod === 0 ? 16 : 8);
      timber.add(g, undefined, { type: 4, size: [Math.PI * radius * 2, c.topY - c.baseY] }); g.dispose();
      // inferred: stone plinth 0.22 m high; 櫍 follows the source's +3 分 per side and 10 分 thickness.
      stone.beam([c.x, c.baseY, c.z], [c.x, c.baseY + 0.22, c.z], (radius + 6 * f) * 2, 0, 12);
      timber.beam([c.x, c.baseY + 0.22, c.z], [c.x, c.baseY + 0.22 + 10 * f, c.z], (radius + 3 * f) * 2, 0, 12);
    }
    if (lod === 0) collision.push({ type: 'circle', x: c.x, z: c.z, radius: radius + 6 * f, tag: 'column' });
  }
  if (lod < 2) for (const edge of layout.edges) {
    const { a, b, side } = edge, lane = laneFen(s.hasBujian);
    timber.beam([a.headX, a.topY - lane.guang * f / 2, a.headZ], [b.headX, b.topY - lane.guang * f / 2, b.headZ], lane.hou * f, lane.guang * f);
    // inferred: 普拍方 occupies the top 15 分 below the bracket datum, width 32 分.
    timber.beam([a.headX, a.topY - 7.5 * f, a.headZ], [b.headX, b.topY - 7.5 * f, b.headZ], 32 * f, 15 * f);
    const dx = side === 'east' ? 1 : side === 'west' ? -1 : 0, dz = side === 'south' ? 1 : side === 'north' ? -1 : 0;
    // inferred: 栱眼壁 closes the bearing band behind the exposed brackets; no daylight gap through the hall.
    const bh = bracketHeight(s);
    timber.beam([a.headX-dx*0.14,a.topY+bh*0.5,a.headZ-dz*0.14],
      [b.headX-dx*0.14,b.topY+bh*0.5,b.headZ-dz*0.14],0.16,bh);
    const ly = bracketHeight(s) + 7.5 * f;
    timber.beam([a.headX + dx * layout.projection, a.topY + ly, a.headZ + dz * layout.projection],
      [b.headX + dx * layout.projection, b.topY + ly, b.headZ + dz * layout.projection], 10 * f, 15 * f);
    if (lod === 1) {
      const y = bracketHeight(s) * 0.55;
      bracket.beam([a.headX + dx * layout.projection * 0.45, a.topY + y, a.headZ + dz * layout.projection * 0.45],
        [b.headX + dx * layout.projection * 0.45, b.topY + y, b.headZ + dz * layout.projection * 0.45], layout.projection, bracketHeight(s) * 0.62);
    }
  }
  if (lod === 0 && fill) {
    // 卷五: exposed transverse beams, diminishing raised beam tiers, and ridge posts.
    // inferred: tiers span each supplied front grid line; their exact joinery awaits measured building surveys.
    const roof = roofModel(layout);
    for (const x of layout.xs) {
      const y = s.platform.height + s.columnHeight + 0.42;
      timber.beam([x, y, -layout.depth / 2], [x, y, layout.depth / 2], 25 * f, 42 * f);
      for (let i = 1; i < s.jiaPerSlope; i++) {
        const t = 1 - i / s.jiaPerSlope, half = roof.b * t, yy = roof.baseY + roof.sectionY(t) - 0.7;
        if (s.roof !== 'xuanshan' && Math.abs(x) > roof.r + Math.max(0, roof.b * (t - roof.hipStart)) - 0.25) continue;
        timber.beam([x, yy, -half], [x, yy, half], 20 * f, 35 * f);
        const below = i === 1 ? y + 21 * f : roof.baseY + roof.sectionY(t + 1 / s.jiaPerSlope) - 0.4;
        for (const z of [-half, half]) if (yy > below) timber.beam([x, below, z], [x, yy, z], 18 * f);
      }
    }
  }
  if (fill) for (const edge of layout.edges) {
    const type = bayFill(s, edge.side, edge.bay);
    if (type === 'open') continue;
    const a = edge.a, b = edge.b, x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    const span = Math.hypot(a.x - b.x, a.z - b.z) - radius * 2, h = s.columnHeight - 0.55;
    const angle = edge.side === 'east' || edge.side === 'west' ? Math.PI / 2 : 0;
    const local = (u, y, v = 0) => [x + u * Math.cos(angle) + v * Math.sin(angle), s.platform.height + y, z - u * Math.sin(angle) + v * Math.cos(angle)];
    const rect = (batch, u, y, width, height, depth = 0.15) => batch.box(local(u, y), [width, height, depth], angle);
    if (lod === 2) {
      const g = new THREE.PlaneGeometry(span + radius * 2, h);
      g.rotateY({ south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 }[edge.side]);
      g.translate(x, s.platform.height + h / 2, z);
      (type === 'wall' ? plaster : timber).add(g); g.dispose();
    } else if (type === 'wall') rect(plaster, 0, h / 2, span, h, 0.28);
    else {
      // inferred: six leaves per doorway, a solid lower panel and open rectangular lattice above.
      const bottom = type === 'door' ? 1.05 : 1.4;
      // inferred: plaster jambs frame lattice windows behind the colonnade on hero elevations.
      const opening = type === 'lattice' && s.windowJambs ? span * 0.58 : span;
      if (opening < span) for (const sign of [-1,1])
        rect(plaster,sign*(span+opening)/4,(h+bottom)/2,(span-opening)/2,h-bottom,0.22);

      rect(type === 'door' ? timber : plaster, 0, bottom / 2, span, bottom, 0.20);
      rect(timber, 0, h - 0.09, span, 0.18, 0.22);
      if (lod < 2) {
        for (let i = 0; i <= 6; i++) rect(timber, -opening / 2 + i * opening / 6, h / 2, 0.075, h, 0.20);
        rect(timber, 0, bottom, span, 0.13, 0.20);
        if (lod === 0) {
          for (let i = 0; i <= Math.ceil(opening / 0.18); i++) rect(timber, -opening / 2 + i * opening / Math.ceil(opening / 0.18), (h + bottom) / 2, 0.028, h - bottom);
          for (let y = bottom + 0.26; y < h; y += 0.26) rect(timber, 0, y, opening, 0.025);
        }
      } else rect(timber, 0, (h + bottom) / 2, span, h - bottom, 0.12);
    }
    if (lod === 0) collision.push({ type: 'rect', x, z, hw: span / 2, hd: 0.14, rotation: angle, tag: type });
  }
}

function bayFill(spec, side, index) {
  const fill = spec.bayFill ?? spec.fill ?? 'open';
  const value = typeof fill === 'string' ? fill : Array.isArray(fill) ? fill[index] :
    typeof fill[side] === 'string' ? fill[side] : fill[side]?.[index];
  if (value === undefined) return 'open';
  if (!['open', 'wall', 'door', 'lattice'].includes(value)) throw new RangeError('unknown bay fill');
  return value;
}

function surroundLayout(layout) {
  const s = layout.spec;
  // inferred: 副阶 is 3.4 m deep with columns 3.2 m below the main frame, keeping both roof bands structural.
  const depth = s.surroundDepth ?? 3.4;
  const expand = (bays) => bays.map((v, i) => v + (i === 0 ? depth : 0) + (i === bays.length - 1 ? depth : 0));
  return hallLayout({ ...s, frontBays: expand(s.frontBays), sideBays: expand(s.sideBays),
    columnHeight: s.surroundColumnHeight ?? Math.max(2.5, s.columnHeight - 3.2), interior: false, bayFill: 'open', roof: 'wudian', eaves: 1 });
}

/**
 * Pure geometry construction: does not add to the scene or change visibility for a validation camera.
 * materials may be supplied as spec.materials or as the third argument.
 * anchors are in hall-local metres; rotations are yaw in radians, +Z outward at zero.
 */
export function buildHall(spec, engine, materials = spec.materials) {
  const layout = hallLayout(spec), s = layout.spec, lower = s.eaves === 2 ? surroundLayout(layout) : null;
  const mats = { ...defaultHallMaterials(s, engine), ...materials }, outer = lower || layout;
  const margin = s.platform.margin, width = outer.width + 2 * margin, depth = outer.depth + 2 * margin;
  const footprint = { type: 'rect', x: 0, z: 0, hw: width / 2, hd: depth / 2, rotation: 0,
    platformHeight: s.platform.height, obstacles: [] };
  const anchors = { chiwei: [], chuishou: [] }, groups = [];
  for (let lod = 0; lod <= 2; lod++) {
    const group = new THREE.Group(); group.name = `hall-LOD${lod}`;
    const batches = Object.fromEntries(Object.keys(mats).map((k) => [k, new GeometryBatch()]));
    if (s.platform.height > 0) {
      batches.stone.box([0, s.platform.height / 2, 0], [width, s.platform.height, depth]);
      if (lod < 2) {
        // inferred: simplified rectangular terrace with a 0.16 m cap projecting 0.11 m per side.
        batches.stone.box([0, s.platform.height - 0.08, 0], [width + 0.22, 0.16, depth + 0.22]);
        // inferred: front/back stairs have 0.16 m risers, 0.32 m treads, one central bay wide.
        const steps = Math.ceil(s.platform.height / 0.16), stairWidth = s.frontBays[Math.floor(s.frontBays.length / 2)];
        for (const sign of [-1, 1]) for (let i = 0; i < steps; i++) {
          const h = s.platform.height * (i + 1) / steps;
          batches.stone.box([0, h / 2, sign * (depth / 2 + (steps - i - 0.5) * 0.32)], [stairWidth, h, 0.32]);
        }
      }
    }
    frame(layout, lod, batches, footprint.obstacles, { lowOuter: !lower });
    if (lower) frame(lower, lod, batches, footprint.obstacles, { fill: false, lowOuter: true });
    if (lod === 0) {
      addBrackets(group, layout, mats.bracket);
      if (lower) addBrackets(group, lower, mats.bracket);
    }
    const localAnchors = { chiwei: [], chuishou: [] };
    buildRoof(roofModel(layout), lod, batches, localAnchors);
    if (lower) buildRoof(roofModel(lower, { innerHalfDepth: layout.depth / 2 - 0.12 }), lod, batches, localAnchors);
    if (lod === 0) Object.assign(anchors, localAnchors);
    for (const [name, batch] of Object.entries(batches)) if (batch.indices.length) group.add(batch.mesh(mats[name], name));
    group.userData.stats = meshStats(group); groups.push(group);
  }
  return { lod0: groups[0], lod1: groups[1], lod2: groups[2], footprint, anchors, layout,
    surround: lower, materials: mats, stats: groups.map((g) => g.userData.stats) };
}
