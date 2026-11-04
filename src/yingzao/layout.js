import * as Y from './rules.js';

export function normalizeSpec(input = {}) {
  // inferred: reusable small-hall defaults; callers provide measured plans where known.
  const s = { frontBays: [3.6, 4.2, 3.6], sideBays: [3.6, 3.6], caiGrade: 3,
    klass: 'tingtang', tiao: 2, rafterDiameter: 0.125, jiaPerSlope: 4, columnHeight: 4.6,
    roof: 'xieshan', eaves: 1, interior: false, tile: 'tongwa', hasBujian: true, ang: true, ...input };
  s.platform = { height: 0, margin: 1.2, ...input.platform };
  for (const key of ['frontBays', 'sideBays']) {
    if (!Array.isArray(s[key]) || !s[key].length || s[key].some((v) => !Number.isFinite(v) || v <= 0))
      throw new RangeError(`${key} must contain positive bay widths in metres`);
  }
  Y.fen(s.caiGrade); Y.puzuoName(s.tiao); Y.columnDiameterFen(s.klass);
  if (!['wudian', 'xieshan', 'xuanshan'].includes(s.roof)) throw new RangeError('unknown roof type');
  if (![1, 2].includes(s.eaves)) throw new RangeError('eaves must be 1 or 2');
  if (!['tongwa', 'banwa'].includes(s.tile)) throw new RangeError('unknown tile type');
  if (!(s.columnHeight > 0) || s.platform.height < 0 || s.platform.margin < 0) throw new RangeError('invalid hall height/platform');
  return s;
}

function grid(bays) {
  const out = [-bays.reduce((a, b) => a + b, 0) / 2];
  for (const b of bays) out.push(out.at(-1) + b);
  return out;
}

export function hallLayout(input) {
  const spec = normalizeSpec(input), xs = grid(spec.frontBays), zs = grid(spec.sideBays);
  const nx = xs.length - 1, nz = zs.length - 1, rise = Y.shengqi(nx), baseY = spec.platform.height;
  // inferred: equal increments by column rank on each elevation, sharing the corner rise.
  const riseAt = (i, n) => rise * Math.abs(i - Math.max(Math.floor(n / 2), Math.min(Math.ceil(n / 2), i))) / Math.max(1, Math.floor(n / 2));
  const columns = [], byGrid = new Map();
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const front = j === 0 || j === nz, side = i === 0 || i === nx, perimeter = front || side;
    if (!perimeter && !spec.interior) continue;
    const x = xs[i], z = zs[j], topY = baseY + spec.columnHeight + (front ? riseAt(i, nx) : side ? riseAt(j, nz) : 0);
    const len = topY - baseY;
    const c = { x, z, baseY, topY, headX: x - (front ? Math.sign(x) * Y.cejiao(len, 'front') : 0),
      headZ: z - (side ? Math.sign(z) * Y.cejiao(len, 'side') : 0), perimeter, corner: front && side, i, j };
    columns.push(c); byGrid.set(`${i},${j}`, c);
  }
  const sets = [];
  for (const c of columns.filter((c) => c.perimeter)) {
    const side = c.j === nz ? 'south' : c.j === 0 ? 'north' : c.i === nx ? 'east' : 'west';
    sets.push({ kind: c.corner ? 'zhuanjiao' : 'zhutou', side, x: c.headX, y: c.topY, z: c.headZ,
      // A corner's local +Z is one face normal; local +X is the other face normal.
      angle: c.corner ? (c.z > 0 ? (c.x > 0 ? 0 : -Math.PI / 2) : (c.x < 0 ? Math.PI : Math.PI / 2))
        : { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 }[side] });
  }
  const sides = [ ['south', nx, (i) => byGrid.get(`${i},${nz}`)], ['north', nx, (i) => byGrid.get(`${i},0`)],
    ['east', nz, (i) => byGrid.get(`${nx},${i}`)], ['west', nz, (i) => byGrid.get(`0,${i}`)] ];
  const edges = [];
  for (const [side, n, get] of sides) for (let i = 0; i < n; i++) {
    const a = get(i), b = get(i + 1);
    edges.push({ a, b, side, bay: i });
    const central = (side === 'south' || side === 'north') && n % 2 === 1 && i === Math.floor(n / 2);
    const count = spec.hasBujian ? Y.bujianCount(central ? 'dangxin' : 'ci') : 0;
    for (let k = 1; k <= count; k++) {
      const t = k / (count + 1), mix = (u, v) => u + (v - u) * t;
      sets.push({ kind: 'bujian', side, x: mix(a.headX, b.headX), y: mix(a.topY, b.topY), z: mix(a.headZ, b.headZ),
        angle: { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 }[side] });
    }
  }
  const width = xs.at(-1) * 2, depth = zs.at(-1) * 2, projection = spec.tiao * Y.TIAO_MAX_FEN * Y.fen(spec.caiGrade);
  const liaoyanSpan = depth + 2 * projection;
  const roofClass = spec.roofClass || (spec.klass === 'diange' ? 'diange' : `${spec.tile}_${spec.klass === 'yuwu' ? 'langwu' : 'tingtang'}`);
  const ridgeRise = Y.juHeight(liaoyanSpan, roofClass), out = Y.eaveOut(spec.rafterDiameter);
  return { spec, width, depth, xs, zs, columns, sets, edges, projection, liaoyanSpan, ridgeRise,
    section: Y.zheProfile(liaoyanSpan / 2, ridgeRise, spec.jiaPerSlope),
    eave: { out, feizi: Y.feiziOut(out), wing: Y.wingOut(nx) } };
}
