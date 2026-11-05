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

export const YUJIE_WIDTH = 312; // text: 二百余步, at five 尺 per 步; one width constant.
export const YUJIE = {
  width: YUJIE_WIDTH, start: 0, end: 1300,
  evidence: 'text', source: '东京梦华录 卷一 御街; ART_BIBLE cross-section',
  section: { road: 30, canal: 42, bank: 52, blackFence: YUJIE_WIDTH / 2 - 8, edge: YUJIE_WIDTH / 2,
    evidence: 'inferred', source: 'ART_BIBLE: inferred allocation within the textual 312 m avenue' },
  // inferred: pavement and water clear T4's solid forecourt apron; canal water is below the coping.
  surfaceY: 0.85, waterY: 0.70, copingHeight: 0.24, crossingWidth: 6, fenceGap: 8,
  crossStreets: [170, 360, 560, 760, 960, 1160],
  crossings: [170, 560, 760, 960, 1160],
  approachLength: 40,
  paving: { roadTracks: [8.4, 21.6], laneTrack: 91, axleHalf: 0.72, roadDrainInset: 0.8, laneDrainOffset: 1.4,
    evidence: 'inferred', source: 'T5: traffic wear, axle spacing and covered drainage locations reconstructed for ground detail' },
  bridge: ZHOUQIAO.deckEnds, bridgeHalfWidth: ZHOUQIAO.dimensions.width / 2,
  corridor: { centerX: YUJIE_WIDTH / 2 - 4, bay: 3.2, bays: 10, columnHeight: 3.1,
    evidence: 'inferred', source: 'T1 corridor model; outer wall and occasional lattice bays inferred' },
  planting: { centerX: 46.8, spacing: 8.8, jitter: 1.7, height: 6,
    species: ['peach', 'plum', 'pear', 'apricot'],
    evidence: 'text', source: '御街: 近岸植桃李梨杏，杂花相间; exact spacing and dimensions inferred' },
  nanxun: { position: [0, 0, 4200], evidence: 'inferred', source: 'ART_BIBLE: 七八里 full avenue, later slices' },
};

// inferred: T5 inspection cameras; all placements above exist independently of these views.
export const YUJIE_VIEWS = {
  avenue: { pos: [-146, 8, 225], target: [30, -12, 310], fov: 30, near: 0.05 },
  corridor: { pos: [-151.2, 2.75, 218], target: [-151.2, 3.0, 340], fov: 72, near: 0.05 },
  road: { pos: [12, 2.45, 260], target: [6, 2.45, 50], fov: 65, near: 0.05 },
  aerial: { pos: [225, 200, 700], target: [0, 0.85, 575], fov: 66, near: 0.1 },
  canal: { pos: [28.3, 2.45, 242], target: [42, 0.8, 210], fov: 66, near: 0.05 },
  funnel: { pos: [70, 35, 332], target: [0, 0.4, 400], fov: 66, near: 0.05 },
  evidence: 'inferred', source: 'T5: ref2/ref7 framings plus road, 200 m aerial, canal and bridge inspection',
};

// T7. The text names buildings and relationships; no measured palace plan survives here.
const palaceSource = 'T7 reconstruction; 东京梦华录卷一 大内: 大庆殿、庭设两楼、左右长庆门 and named inner halls';
const palaceEntry = entry => ({ evidence: 'inferred', source: palaceSource, ...entry });
export const PALACE = palaceEntry({
  extent: { west: -350, east: 350, north: -650, south: -24 },
  groundY: 0.68,
  innerCenter: palaceEntry({ position: [0, 0, -470] }),
  court: palaceEntry({ center: [0, 0.68, -219], width: 272, depth: 262 }),
  rearApron: palaceEntry({ center: [0, 0.68, -56], width: 272, depth: 64 }),
  hall: palaceEntry({ name: '大庆殿', position: [0, 3.8, -320],
    frontBays: [7.2, 7.8, 8.4, 9, 9.6, 9, 8.4, 7.8, 7.2], sideBays: [6, 6, 6, 6],
    columnHeight: 10.2, caiGrade: 1, tiao: 4, eaves: 2 }),
  // inferred: two stacked five-尺 stages; each stage's courses and stairs follow 卷三.
  terraces: [
    palaceEntry({ center: [0, 0.68, -320], width: 108, depth: 64, height: 1.56, stairs: [-24, 0, 24], stairWidth: 9.6 }),
    palaceEntry({ center: [0, 2.24, -320], width: 98, depth: 52, height: 1.56, stairs: [-24, 0, 24], stairWidth: 9.6 }),
  ],
  gate: palaceEntry({ name: '大庆门', position: [0, 0.68, -90], frontBays: [5.4, 6, 7.2, 6, 5.4],
    sideBays: [4, 4], columnHeight: 5.8, caiGrade: 3, tiao: 2, eaves: 1 }),
  towers: [-1, 1].map(sign => palaceEntry({ name: '刻漏楼', position: [sign * 66, 2.24, -310],
    frontBays: [3.2, 3.8, 3.2], sideBays: [3.6, 3.6], columnHeight: 6.1, caiGrade: 4, tiao: 2, eaves: 1 })),
  towerBases: [-1, 1].map(sign => palaceEntry({ center: [sign * 66, 0.68, -310],
    width: 16, depth: 14, height: 1.56, stairs: [sign * 66], stairWidth: 3.8 })),
  sideGates: [-1, 1].map(sign => palaceEntry({ name: sign < 0 ? '右长庆门' : '左长庆门',
    position: [sign * 134, 0.68, -218], rotation: Math.PI / 2,
    frontBays: [4.2, 5.6, 4.2], sideBays: [3.2], columnHeight: 4.8, caiGrade: 5, tiao: 1, eaves: 1 })),
  // inferred: segmented gallery placement preserves a 14 m opening at each transverse gate.
  galleries: [
    ...[-1, 1].flatMap(sign => [-121, -159, -195, -240, -276, -314, -350].map(z =>
      palaceEntry({ position: [sign * 134, 0.68, z], rotation: -sign * Math.PI / 2, bays: z === -195 || z === -240 ? 5 : 6 }))),
    ...[-1, 1].flatMap(sign => [38, 74, 110].map(x => palaceEntry({ position: [sign * x, 0.68, -90], rotation: Math.PI, bays: 6 }))),
    ...[-1, 1].flatMap(sign => [70, 106].map(x => palaceEntry({ position: [sign * x, 0.68, -358], bays: 6 }))),
  ],
  innerHalls: [
    palaceEntry({ name: '文德殿', position: [-106, 0.68, -426], bays: 7, bayWidth: 6.2, depth: 18, columnHeight: 6.6, eaves: 1 }),
    palaceEntry({ name: '紫宸殿', position: [72, 0.68, -476], bays: 9, bayWidth: 6.4, depth: 23, columnHeight: 7.8, eaves: 2 }),
    palaceEntry({ name: '垂拱殿', position: [-116, 0.68, -552], bays: 7, bayWidth: 5.6, depth: 16, columnHeight: 5.8, eaves: 1 }),
    palaceEntry({ name: '皇仪殿', position: [128, 0.68, -593], bays: 7, bayWidth: 6, depth: 20, columnHeight: 6.4, eaves: 1 }),
    ...[-1, 1].flatMap(sign => [145, 235, 325, 415, 505, 595].map((z, i) =>
      palaceEntry({ name: '宫署', position: [sign * (i % 2 ? 256 : 234), 0.68, -z],
        bays: 5, bayWidth: 5.2, depth: 12, columnHeight: 4.6, eaves: 1 }))),
  ],
  innerCourts: [
    ...[-1, 1].flatMap(sign => [175, 265, 355, 445, 535, 625].map(z =>
      palaceEntry({ center: [sign * 243, 0.68, -z], width: 190, depth: z === 625 ? 50 : 86 }))),
    palaceEntry({ center: [-86, 0.68, -436], width: 150, depth: 140 }),
    palaceEntry({ center: [86, 0.68, -486], width: 160, depth: 150 }),
    palaceEntry({ center: [-86, 0.68, -574], width: 150, depth: 128 }),
    palaceEntry({ center: [86, 0.68, -616], width: 160, depth: 60 }),
  ],
  trees: {
    huai: [-1, 1].flatMap(sign => [-126, -334, -395, -459, -529, -603].map(z => [sign * 113, 0.71, z]))
      .concat([-1, 1].flatMap(sign => [-170, -270, -370, -470, -570].map(z => [sign * 300, 0.71, z]))),
    bai: [-1, 1].flatMap(sign => [-302, -345, -433, -565].map(z => [sign * 62, 0.71, z])),
    evidence: 'inferred', source: 'ART_BIBLE: 槐 and 柏 in palace courts; exact planting inferred',
  },
});

export const PALACE_VIEWS = {
  // inferred: ref8-like frontal inspection inside the vast court, plus an eye-height long view.
  front: { pos: [0, 2.31, -240], target: [0, 12.5, -320], fov: 58, near: 0.1 },
  court: { pos: [8, 2.31, -115], target: [0, 9, -320], fov: 65, near: 0.1 },
  aerial: { pos: [85, 130, 90], target: [0, 12, -250], fov: 46, near: 0.1 },
  terrace: { pos: [32, 5.43, -291], target: [0, 10, -307], fov: 66, near: 0.05 },
  rear: { pos: [-70, 22, -382], target: [0, 12, -320], fov: 64, near: 0.1 },
  gate: { pos: [0, 2.31, -46], target: [0, 3, -146], fov: 66, near: 0.1 },
  evidence: 'inferred', source: 'T7 validation framings; generators never consume these',
};

// inferred: T8 city reconstruction. Bounds, streets, lot patterns and the named
// offices' exact offsets are not surveyed; names and relative placement are text.
export const CITY = {
  east: 1400, north: -1300, south: 1300, outerExtent: 4000, farmlandExtent: 14000,
  avenueHalfWidth: YUJIE_WIDTH / 2, surfaceY: .56, palaceReservation: {halfWidth: 370, north: -710, south: 90},
  crossStreets: [180, 400, 610, 810, 1010, 1210], templeRadius: 64,
  // inferred: W1 packed courtyard morphology; coverage is measured from the roof
  // rectangles, not increased by shrinking the 312 m avenue or palace reservation.
  fabric: {courtWidth:24, courtDepth:27, outerCourtWidth:29, outerCourtDepth:31,
    lane:3.4, roofFraction:.95, northDepth:.30, southDepth:.24, wingDepth:.27,
    roofHalfWidth:7.8808, roofHalfDepth:4.3164, cornerLift:.12},
  evidence: 'inferred', source: 'T8: inner city approximately x ±1400, z ±1300, outer city to 4 km; ART_BIBLE avenue/palace reservations',
  offices: [
    {name:'明堂颁朔布政府',position:[-228,0,112],halfWidth:48,halfDepth:46},
    {name:'秘书省',position:[228,0,112],halfWidth:48,halfDepth:46},
    {name:'景灵西宫',position:[-235,0,272],halfWidth:55,halfDepth:55},
    {name:'景灵东宫',position:[235,0,272],halfWidth:55,halfDepth:55},
  ].map(o=>({...o,evidence:'inferred',source:'ART_BIBLE: named offices opposite 掖门 and along avenue; exact compound footprints inferred'})),
  houseSpec: {frontBays:[2.8,2.8,2.8,2.8,2.8],sideBays:[4.2],caiGrade:8,klass:'yuwu',tiao:1,
    columnHeight:2.9,roof:'xuanshan',tile:'banwa',jiaPerSlope:2,platform:{height:.18,margin:.3},
    bayFill:{south:'lattice',north:'wall',east:'wall',west:'wall'}},
  officeSpec: {frontBays:[4.2,4.6,5,4.6,4.2],sideBays:[3.5,3.5],caiGrade:5,klass:'tingtang',tiao:2,
    columnHeight:5.2,roof:'wudian',tile:'banwa',platform:{height:.8,margin:1.1},
    bayFill:{south:'lattice',north:'wall',east:'wall',west:'wall'}},
};
export const CITY_WALLS = {
  evidence:'inferred',source:'东京梦华录 卷一 旧京城: named gates; T8: reconstructed inner-city enclosure and flat-lintel 朱雀门',
  halfWidth:1400,north:-1300,south:1300,height:7.2,depth:6,batter:.08,
  southGates:[-820,0,820],northGates:[-700,0,700],sideGates:[-720,-150,720],gateWidth:6,
  zhuque:{position:[0,0,1300],width:54,depth:22,height:9,batter:.075,
    openings:[{x:-17,width:4,topWidth:3.6,height:5.4},{x:0,width:7,topWidth:6.3,height:6.2},{x:17,width:4,topWidth:3.6,height:5.4}],
    hallSpec:{frontBays:[4.5,5,5.5,5,4.5],sideBays:[4,4],caiGrade:4,klass:'diange',tiao:2,
      columnHeight:5.8,roof:'wudian',tile:'banwa',platform:{height:0,margin:.5},
      bayFill:{south:'lattice',north:'lattice',east:'wall',west:'wall'}}},
};
export const TIETA = {
  position:[1150,0,-1050],height:55.88,storeys:13,sides:8,
  evidence:'inferred',source:'T8: approximate north-east site at (1150,-1050); exact placement inferred',
  dimensions:{height:55.88,storeys:13,sides:8,evidence:'excavated',source:'ART_BIBLE: extant 开宝寺塔, begun 1049, octagonal thirteen-storey brown glazed brick tower, 55.88 m'},
  profile:{baseRadius:4.8,topRadius:2.1,baseHeight:.6,firstStorey:5,storey:3.5,eaveProjection:.86},
};
export const CITY_VIEWS = {
  aerial:{pos:[150,300,300],target:[180,20,-350],fov:75,near:.5},
  gallery:{pos:[47.4,30,25],target:[-70,1,630],fov:75,near:.1,time:'bluehour'},
  avenue:{pos:[-120,YUJIE.surfaceY+1.6,690],target:[270,7,820],fov:62,near:.1},
  roofs:{pos:[630,200,780],target:[270,0,180],fov:57,near:.1},
  evidence:'inferred',source:'T8: 300 m aerial and gallery validation framings; no content consumes these cameras',
};
