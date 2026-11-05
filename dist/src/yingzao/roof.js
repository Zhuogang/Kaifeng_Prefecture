import * as THREE from 'three';
import { GeometryBatch, profilePrism } from './geometry.js';
import { bracketHeight } from './brackets.js';
import { CHI, fen, shengqi } from './rules.js';

const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export function roofModel(layout, ring = null) {
  const s = layout.spec, f = fen(s.caiGrade), b = layout.liaoyanSpan / 2;
  const kind = ring ? 'wudian' : s.roof;
  // inferred: 悬山 gable overhang is 0.6 m beyond the side bearing line.
  const a = layout.width / 2 + layout.projection + (kind === 'xuanshan' ? (s.gableOverhang ?? 0.6) : 0);
  // inferred: 九脊 gables occupy the upper 62% of the slope; the lower portion is hipped.
  const hipStart = kind === 'xieshan' ? 0.62 : 0;
  const r = kind === 'xuanshan' ? a : Math.max(0, a - b * (1 - hipStart));
  const tEnd = 1 + (layout.eave.out + layout.eave.feizi) / b;
  const tRafter = 1 + layout.eave.out / b;
  const tStart = ring ? ring.innerHalfDepth / b : 0;
  const baseY = s.platform.height + s.columnHeight + bracketHeight(s) + 15 * f;
  const section = layout.section;
  const sectionY = (t) => {
    const q = t * b;
    if (ring) {
      // 卷五: 副阶 二分中举一分 (rise = half its horizontal run).
      return (b - q) * 0.5;
    }
    for (let i = 1; i < section.length; i++) if (q <= section[i].x) {
      const p = section[i - 1], n = section[i]; return lerp(p.y, n.y, (q - p.x) / (n.x - p.x));
    }
    const last = section.at(-2), slope = last.y / (b - last.x);
    const d = q - b;
    // inferred: continue the final 举折 tangent through the exposed 椽, flatten across the 飞子.
    const fly = Math.max(0, d - layout.eave.out);
    return -slope * d + slope * fly * fly / (2 * layout.eave.feizi);
  };
  // inferred: painted elevations suggest vertical wing rise six times the specified horizontal growth.
  // Spread that rise continuously across the elevation, as in jinci_side and 瑞鹤图.
  const wingRise = layout.eave.wing * 6;
  const rise = shengqi(s.frontBays.length);
  const wingStart = Math.max(0, 1 - (s.frontBays[0] * 1.5 + layout.projection) / (a + layout.eave.out));
  const point = (side, u, t, offset = 0) => {
    const growth = layout.eave.wing * smooth(wingStart, 1, Math.abs(u)) * smooth(0.65, tEnd, t);
    const q = b * t + growth;
    const width = kind === 'xuanshan' ? a : r + Math.max(0, b * (t - hipStart)) + growth;
    const y = baseY + sectionY(t) + (rise * u * u + wingRise * Math.pow(Math.abs(u), 2.4)) * (t / tEnd) ** 2 + offset;
    if (side === 'south') return [u * width, y, q];
    if (side === 'north') return [-u * width, y, -q];
    if (side === 'east') return [width, y, -u * q];
    return [-width, y, u * q];
  };
  const sides = kind === 'xuanshan' ? ['south', 'north'] : ['south', 'north', 'east', 'west'];
  const rows = (side, lod) => {
    const start = Math.max(tStart, (side === 'east' || side === 'west') ? hipStart : 0);
    const ts = [start];
    for (let i = 1; i <= s.jiaPerSlope; i++) if (i / s.jiaPerSlope > start) ts.push(i / s.jiaPerSlope);
    if (hipStart > start && !ts.includes(hipStart)) ts.push(hipStart);
    if (lod < 2) ts.push(tRafter);
    ts.push(tEnd); ts.sort((x, y) => x - y);
    return ts;
  };
  return { layout, kind, a, b, r, baseY, tStart, tEnd, tRafter, hipStart, point, sides, rows, sectionY, ring };
}

function surface(model, side, lod, offset) {
  const rows = model.rows(side, lod), n = lod === 2 ? 2 : lod === 1 ? 12 : 28;
  const pos = [], uv = [], idx = [], tiles = [];
  for (const t of rows) for (let j = 0; j <= n; j++) {
    const u = j / n * 2 - 1, p = model.point(side, u, t, offset);
    pos.push(...p);
    // Tile coordinates in metres, with each face measured along its eave and slope.
    const along = side === 'south' || side === 'north' ? p[0] : p[2];
    uv.push(along, t * model.b);
    const edge = model.point(side, 1, t), halfWidth = Math.abs(side === 'south' || side === 'north' ? edge[0] : edge[2]);
    const uphill = (model.tEnd - t) * model.b;
    tiles.push(along / 0.26, t * model.b / 0.35, Math.min((1 - Math.abs(u)) * halfWidth, uphill), uphill);
  }
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < n; j++) {
    const a = i * (n + 1) + j, b = a + 1, c = a + n + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('tileCoord', new THREE.Float32BufferAttribute(tiles, 4));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

function strip(batch, points, radius, segments = 6, half = false, column = 0) {
  const ps = [], uv = [], idx = [];
  let distance = 0;
  for (let i = 0; i < points.length; i++) {
    const p = new THREE.Vector3(...points[i]);
    if (i) distance += p.distanceTo(new THREE.Vector3(...points[i - 1]));
    const tangent = new THREE.Vector3(...points[Math.min(i + 1, points.length - 1)])
      .sub(new THREE.Vector3(...points[Math.max(i - 1, 0)])).normalize();
    const across = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    const normal = new THREE.Vector3().crossVectors(across, tangent).normalize();
    for (let j = 0; j <= segments; j++) {
      const angle = j / segments * (half ? Math.PI : Math.PI * 2);
      const v = p.clone().addScaledVector(across, Math.cos(angle) * radius).addScaledVector(normal, Math.sin(angle) * radius);
      ps.push(v.x, v.y, v.z); uv.push(j / segments * radius * Math.PI, distance);
    }
  }
  for (let i = 0; i < points.length - 1; i++) for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j, b = a + 1, c = a + segments + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const tiles = [];
  for (let i = 0; i < uv.length; i += 2) {
    const uphill = distance - uv[i + 1];
    tiles.push(column + uv[i] / 0.26, uv[i + 1] / 0.35, Math.min(uphill, uv[i + 1]), uphill);
  }
  g.setAttribute('tileCoord', new THREE.Float32BufferAttribute(tiles, 4));
  batch.add(g); g.dispose();
}

export function buildRoof(model, lod, batches, anchors) {
  const { tile, timber, ridge } = batches, { point, layout, tEnd, tStart, tRafter, sides, r, b } = model;
  const f = fen(layout.spec.caiGrade), diameter = layout.spec.rafterDiameter;
  for (const side of sides) {
    // inferred: tile bed +0.10 m, soffit -0.12 m and rafter centres -0.23 m relative to the roof datum.
    const top = surface(model, side, lod, 0.10); tile.add(top); top.dispose();
    if (lod < 2) {
      const underside = surface(model, side, lod, -0.12);
      // The soffit faces down. It closes the roof from below and supplies its solid back-face shadow.
      const index=underside.index.array,normals=underside.attributes.normal;
      for(let i=0;i<index.length;i+=3){const b=index[i+1];index[i+1]=index[i+2];index[i+2]=b;}
      for(let i=0;i<normals.count;i++)normals.setXYZ(i,-normals.getX(i),-normals.getY(i),-normals.getZ(i));
      timber.add(underside); underside.dispose();
      const ts = model.rows(side, lod), n = lod === 0 ? 28 : 12;
      for (let j = 0; j < n; j++) {
        const u0 = j / n * 2 - 1, u1 = (j + 1) / n * 2 - 1;
        // 大小连檐 / 燕颔版: continuous boards exactly following the rising eave.
        timber.beam(point(side, u0, tRafter, -0.16), point(side, u1, tRafter, -0.16), 15 * f, 10 * f);
        timber.beam(point(side, u0, tEnd, -0.01), point(side, u1, tEnd, -0.01), 9 * f, 4 * f);
      }
      if (lod === 0) {
        const edgeA = point(side, -1, tEnd), edgeB = point(side, 1, tEnd);
        const span = Math.hypot(edgeA[0] - edgeB[0], edgeA[2] - edgeB[2]);
        // 卷五: 殿阁 9…9.5 寸, 副阶 8.5…9 寸, 廊屋 7.5…8 寸 between rafters.
        const spacing = (model.ring ? 8.75 : layout.spec.klass === 'diange' ? 9.25 : layout.spec.klass === 'yuwu' ? 7.75 : 8.25) * CHI / 10;
        const count = Math.ceil(span / spacing);
        for (let j = 0; j <= count; j++) {
          const u = j / count * 2 - 1;
          // Closed halls hide the inward rafters behind their walls. Open halls retain the whole slope.
          const breaks = layout.spec.enclosedBrackets
            ? [0.75, ...ts.filter((t) => t > 0.75 && t < tRafter), tRafter]
            : [...ts.filter((t) => t < tRafter), tRafter];
          for (let i = 0; i < breaks.length - 1; i++) timber.beam(point(side, u, breaks[i], -0.23), point(side, u, breaks[i + 1], -0.23), diameter, diameter, 5, false);
          // 飞子: 8/10 × 7/10 of the rafter diameter; overlaps the common rafter at the heel.
          timber.beam(point(side, u, 1 + layout.eave.out * 0.6 / b, -0.13), point(side, u, tEnd, -0.09), diameter * 0.8, diameter * 0.7);
        }
        // inferred: tile centres 0.26 m apart; cover tiles have 0.065 m radii, 0.35 m laps.
        const tileCount = Math.ceil(span / 0.26), tileStart = ts[0];
        for (let j = 0; j <= tileCount; j++) {
          const u = j / tileCount * 2 - 1;
          if (layout.spec.tile === 'tongwa') {
            const points = [];
            // Keep tile runs parallel on each face, clipping them at the hips instead of fanning them from the ridge.
            const coordinate = u * span / 2;
            const halfWidth = (t) => {
              const p = point(side, 1, t); return Math.abs(side === 'south' || side === 'north' ? p[0] : p[2]);
            };
            let lo = tileStart, hi = tEnd;
            if (halfWidth(lo) < Math.abs(coordinate)) {
              for (let k = 0; k < 18; k++) { const mid = (lo + hi) / 2; if (halfWidth(mid) < Math.abs(coordinate)) lo = mid; else hi = mid; }
              lo = hi;
            }
            const breaks = [lo, ...ts.filter((t) => t > lo)];
            for (let k = 0; k < breaks.length - 1; k++) {
              const t=breaks[k];
              points.push(point(side,coordinate/Math.max(0.0001,halfWidth(t)),t,0.13));
            }
            points.push(point(side, u, tEnd, 0.13));
            if (points.length > 1) strip(tile, points, 0.085, 4, true, j);
          }
          const p = point(side, u, tEnd, 0.09), inside = point(side, u, tEnd - 0.012, 0.09);
          const out = new THREE.Vector3(...p).sub(new THREE.Vector3(...inside)).normalize();
          const end = new THREE.Vector3(...p).addScaledVector(out, 0.055);
          tile.beam(p, end.toArray(), 0.15, 0.15, 8); // 瓦当 caps
          if (j < tileCount) {
            const drip = point(side, (j + 0.5) / tileCount * 2 - 1, tEnd, 0.02);
            const g = profilePrism([[-0.07, 0.055], [0.07, 0.055], [0.07, -0.025], [0, -0.1], [-0.07, -0.025]], 0.045);
            const m = new THREE.Matrix4().makeRotationY({ south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[side]);
            m.setPosition(...drip); tile.add(g, m); g.dispose();
          }
          // inferred: 狼牙版 is represented by 0.12 m teeth under the row of tile caps.
          timber.box([p[0], p[1] - 0.12, p[2]], [0.12, 0.12, 0.12]);
        }
        // Purlins follow the same section as the roof, ending on the hip beams.
        for (const t of ts.filter((t) => t <= 1)) for (let j = 0; j < 12; j++)
          timber.beam(point(side, j / 6 - 1, t, -0.38), point(side, (j + 1) / 6 - 1, t, -0.38), 18 * f, 18 * f, 8);
      }
    }
  }
  const ridgePath = (path, main = false) => {
    const courses = lod === 2 ? 1 : main ? 4 : 3;
    for (let c = 0; c < courses; c++) for (let i = 0; i < path.length - 1; i++) {
      // inferred: course thickness 0.11 m and diminishing widths; source specifies stacked ridges, not this section.
      const y = lod === 2 ? 0.26 : 0.17 + c * 0.11;
      const a = path[i].map((v, k) => v + (k === 1 ? y : 0)), b = path[i + 1].map((v, k) => v + (k === 1 ? y : 0));
      ridge.beam(a, b, (main ? 0.50 : 0.34) - c * 0.045, lod === 2 ? 0.38 : 0.11);
    }
  };
  if (!model.ring) {
    const y = model.baseY + model.sectionY(0);
    ridgePath([[-r, y, 0], [r, y, 0]], true);
    anchors.chiwei.push({ position: [-r, y + 0.61, 0], rotation: -Math.PI / 2 }, { position: [r, y + 0.61, 0], rotation: Math.PI / 2 });
  }
  if (model.kind !== 'xuanshan') {
    for (const side of ['south', 'north']) for (const u of [-1, 1]) {
      const rows = model.rows(side, lod), path = rows.map((t) => point(side, u, t));
      if (lod < 2) {
        ridgePath(path);
        for (let i = 0; i < path.length - 1; i++) timber.beam(path[i].map((v, k) => v - (k === 1 ? 0.36 : 0)),
          path[i + 1].map((v, k) => v - (k === 1 ? 0.36 : 0)), 21 * f, 24 * f); // 角梁
      }
      const p = point(side, u, tEnd - 0.045, 0.48);
      anchors.chuishou.push({ position: p, rotation: Math.atan2(p[0], p[2]) });
    }
  }
  if (model.kind === 'xieshan' || model.kind === 'xuanshan') {
    // Close the gable above the hipped skirt, leaving the roof overhang intact.
    // inferred: gable boarding is 0.16 m thick and recessed 0.3 m behind the barge course.
    const end = model.kind === 'xieshan' ? model.hipStart : 1;
    const rows = model.rows('south', lod).filter((t) => t <= end);
    if (!rows.includes(end)) rows.push(end);
    const polygon = [[-end * b, model.baseY + model.sectionY(end) - 0.2], ...rows.slice().reverse().map((t) => [-t * b, model.baseY + model.sectionY(t) - 0.14]),
      ...rows.slice(1).map((t) => [t * b, model.baseY + model.sectionY(t) - 0.14])];
    for (const sign of [-1, 1]) {
      const g = profilePrism(polygon, 0.16); g.rotateY(Math.PI / 2); g.translate(sign * (r - 0.3), 0, 0); timber.add(g); g.dispose();
      if (lod < 2) {
        const path = [...rows.slice().reverse().map((t) => point('north', -sign, t)), ...rows.slice(1).map((t) => point('south', sign, t))];
        ridgePath(path);
      }
    }
  }
}
