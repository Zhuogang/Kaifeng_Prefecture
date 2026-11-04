// Metres; +X east, -Z north. All world placement is defined here.
export const SUN = {
  azimuth: 120, elevation: 25, evidence: 'inferred',
  source: 'ART_BIBLE.md: low morning sun from the south-east',
};

export function dirFromAzEl(azimuth, elevation) {
  const az = azimuth * Math.PI / 180, el = elevation * Math.PI / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
}

export const GROUND = {
  // inferred: 60 km square, exponentially spaced grid, and broad sub-metre silt relief.
  center: [0, 0, 0], halfExtent: 30000, segments: 256, gridScale: 40,
  relief: 0.5, wavelength: 700,
  evidence: 'inferred', source: 'T0: plain extending at least 20 km with relief within ±0.5 m',
};

export const BOX = {
  // inferred: the brief gives the base position and width × depth × height.
  base: [0, 0, -40], size: [20, 10, 20],
  evidence: 'inferred', source: 'T0 lighting and walk-collision calibration box',
};

export const VALIDATION = {
  // inferred: validation viewpoints only; no scene content depends on these positions.
  eye: { pos: [0, 1.6, 15], target: [0, 1.6, -40], fov: 60, near: 0.1 },
  aerial: { pos: [100, 150, 220], target: [0, 0, -40], fov: 60, near: 0.1 },
  evidence: 'inferred', source: 'T0: south eye-level and 150 m aerial views',
};

// T6: keep surveyed dimensions separate from the inferred reconstruction and placement.
export const ZHOUQIAO = {
  center: [0, 0, 400], evidence: 'inferred',
  source: 'ART_BIBLE: weak secondary position, approximately 400 m south of 宣德楼',
  dimensions: { span: 25, width: 30, evidence: 'excavated', source: 'ART_BIBLE: Song abutments and deck' },
  // inferred: water datum, 0.28 m camber, deck thickness, pier grid and bank approach lengths.
  endY: 0.35, camber: 0.28, deckThickness: 0.48, pavingThickness: 0.048, pierSpacing: 2.5, approach: 12,
  deckEnds: { north: [0, 0.398, 387.5], south: [0, 0.398, 412.5],
    evidence: 'inferred', source: 'T6: finished paving endpoints derived from crossing centre, span and inferred deck datum' },
  quetowers: { positions: [[-20, 0.1, 380], [20, 0.1, 380]],
    evidence: 'inferred', source: 'T6: exact offsets inferred; 东京梦华录 卷一 河道 locates twin 阙 on north bank east/west' },
  // inferred: modest three-bay single-eave towers; no measured elevations survive here.
  towerSpec: { frontBays: [2.2, 2.6, 2.2], sideBays: [2.3, 2.3], caiGrade: 6,
    klass: 'tingtang', tiao: 1, columnHeight: 4.2, roof: 'wudian', eaves: 1,
    tile: 'tongwa', platform: { height: 1.1, margin: 0.65 },
    bayFill: { south: ['lattice', 'open', 'lattice'], north: 'wall', east: 'wall', west: 'wall' } },
};

export const BIANHE = {
  center: [0, 0, 400], width: 25, halfLength: 1000,
  evidence: 'inferred', source: 'ART_BIBLE and T6: east–west river, 25 m at bridge, one kilometre each side',
  // inferred: river level 3 m below bank; bed, coping, quay, relief depth and boat berths.
  waterY: -3, bedY: -5.2, bankY: 0.1, quayWidth: 8,
  carvedWalls: { height: 3.3, groupLength: 7.5, length: 30,
    evidence: 'excavated', source: 'ART_BIBLE: one 海马 and two cranes per approximately 7.5 m group' },
  boats: [ { position: [-28, -3, 407.5], yaw: 0.15, length: 7.2, width: 2.1 },
    { position: [-39, -3, 391], yaw: -0.12, length: 8.4, width: 2.3 },
    { position: [34, -3, 408.5], yaw: 0.08, length: 6.8, width: 1.9 } ],
};

export const WILLOWS = {
  // inferred: later flora placement, clear of bridge approaches, quays and tower foundations.
  positions: [-900, -600, -300, -120, -68, -48, 48, 68, 120, 300, 600, 900]
    .flatMap(x => [[x, 0.1, 378.5], [x + 5, 0.1, 421.5]]),
  evidence: 'inferred', source: 'T6: bank willow reservations; ART_BIBLE and 清明上河图: willows on both banks',
};

// inferred: 宣德楼 dimensions reconstruct the text and paintings, not a surveyed foundation.
export const XUANDE = {
  evidence: 'inferred', source: 'ART_BIBLE: 12 m platform, 7 bays, ~120 m wide, 阙 projecting ~60 m',
  platform: { center: [0, 0, -12], width: 88, depth: 24, height: 12, batter: 0.08 },
  hall: { position: [0, 12, -12], frontBays: [7.2, 7.8, 8.4, 9.2, 8.4, 7.8, 7.2], sideBays: [3.5, 4, 4, 3.5],
    columnHeight: 6.8, caiGrade: 2, tiao: 4 },
  wings: [-1, 1].map(sign => ({ position: [sign * 51, 12, 17], rotation: Math.PI / 2,
    frontBays: [6, 6, 6, 6, 6, 6, 6], sideBays: [3, 3], columnHeight: 4.2, caiGrade: 4, tiao: 2 })),
  elbows: [-1, 1].map(sign => ({ position: [sign * 40, 12, -12], rotation: 0,
    frontBays: [4.5, 5, 4.5], sideBays: [3, 3], columnHeight: 4.2, caiGrade: 4, tiao: 2 })),
  towers: [-1, 1].map(sign => ({ position: [sign * 51, 12, 51], rotation: 0,
    frontBays: [3.6, 4.2, 3.6], sideBays: [4, 4], columnHeight: 6.2, caiGrade: 3, tiao: 3 })),
  wingPlatforms: [-1, 1].map(sign => ({ center: [sign * 51, 0, 18], width: 18, depth: 84, height: 12, batter: 0.08 })),
  doors: { centers: [-32, -16, 0, 16, 32], width: 5.6, topWidth: 5.1, height: 7.2, recess: 1.9,
    evidence: 'text', source: '东京梦华录卷一: 列五门，门皆金钉朱漆; widths inferred from excavated 景龙门' },
  frieze: { height: 2.05, centerY: 9.65, evidence: 'text', source: '壁皆砖石间甃，镌镂龙凤飞云之状' },
  wall: { centerZ: 0, height: 7.2, depth: 3.2, extent: 350, gates: [-105, 105], gateWidth: 5.6,
    evidence: 'inferred', source: 'ART_BIBLE palace south wall, 左掖门 and 右掖门; dimensions inferred' },
  forecourt: { center: [0, 0.65, 60], width: 312, depth: 240, evidence: 'inferred', source: 'T4 forecourt; T5 extends 御街' },
  stairs: [-1, 1].map(sign => ({ x: sign * 61, z: -3, width: 6, run: 24, rise: 12 })),
  fences: [[[-70, 0.68, 80], [-15, 0.68, 80]], [[15, 0.68, 80], [70, 0.68, 80]],
    [[-70, 0.68, 80], [-70, 0.68, 7]], [[70, 0.68, 80], [70, 0.68, 7]]],
};

// inferred: independent inspection cameras; no world generator consumes these.
export const XUANDE_VIEWS = {
  front: { pos: [2, 5.5, 175], target: [0, 14.5, 0], fov: 29, near: 0.1 },
  roof: { pos: [0, 19, 53], target: [0, 39, -12], fov: 37, near: 0.1 },
  side: { pos: [112, 26, 84], target: [20, 13, 9], fov: 57, near: 0.1 },
  rear: { pos: [-70, 24, -99], target: [0, 15, -8], fov: 57, near: 0.1 },
  door: { pos: [1.1, 2.25, 0.3], target: [0, 3.3, -1.9], fov: 76, near: 0.05 },
  terrace: { pos: [18.5, 13.64, -2.3], target: [-16, 18.8, -5], fov: 71, near: 0.05 },
  aerial: { pos: [114, 114, 145], target: [0, 10, 6], fov: 57, near: 0.1 },
  evidence: 'inferred', source: 'T4 reference framings and all-angle inspection',
};

// inferred: the forecourt lies above the plain's sub-metre silt relief. Inspection
// framings follow the references; full dimensions and bird sizes remain physical.
for (const entry of [XUANDE.platform, XUANDE.hall, ...XUANDE.wings, ...XUANDE.elbows,
  ...XUANDE.towers, ...XUANDE.wingPlatforms, ...XUANDE.stairs]) {
  entry.evidence = 'inferred'; entry.source = XUANDE.source;
}
