import * as THREE from 'three';
import { GeometryBatch, profilePrism } from './geometry.js';
import { fen, GONG_FEN } from './rules.js';

// inferred: vertical assembly uses 21 分 arms plus 10 分 blocks per jump; 12 分 替木 crowns the set.
export const bracketHeight = (s) => (12 + s.tiao * 31 + 15 + 10 + 12) * fen(s.caiGrade);

function gong(length, height, petals, petalLength, shadowProxy=false) {
  // inferred: shadow-only silhouettes preserve bearing sizes with fewer rolled-end facets.
  if(shadowProxy)return profilePrism([[-length/2,height],[length/2,height],[length/2,9],[length/2-12,0],[-length/2+12,0],[-length/2,9]],10);
  // 卷四: upper six 分 remain; the lower nine 分 are removed in four/five 卷杀 facets.
  const bottom = [], shoulder = length / 2 - petals * petalLength;
  for (let i = 0; i <= petals; i++) bottom.push([shoulder + i * petalLength, 9 * (i / petals) ** 1.65]);
  return profilePrism([[-length / 2, height], [length / 2, height], ...bottom.slice().reverse(),
    ...bottom.map(([x, y]) => [-x, y])], 10);
}

function douBlock(batch, x, y, z, side, height, large = false, shadowProxy=false) {
  if(shadowProxy){batch.box([x,y+height/2,z],[side,height,side],0,2);return;}
  // 卷四: sloping 欹, flat middle, and a cross socket with four separate ears.
  const bevel = large ? 4 : 2, ear = large ? 8 : 4, slope = large ? 8 : 4;
  const g = new THREE.CylinderGeometry(side / Math.SQRT2, (side - bevel * 2) / Math.SQRT2, slope, 4);
  g.rotateY(Math.PI / 4); g.translate(x, y + slope / 2, z); batch.add(g, undefined, { type: 2, size: [side, height] }); g.dispose();
  batch.box([x, y + (slope + height - ear) / 2, z], [side, height - ear - slope, side], 0, 2);
  // inferred: small sockets are treated as filled by their crossing arms; omit buried ear/socket faces.
  if (!large) {
    batch.box([x,y+height-ear/2,z],[side,ear,side],0,2);
    return;
  }
  const w = (side - 10) / 2;
  for (const a of [-1, 1]) for (const b of [-1, 1])
    batch.box([x + a * (5 + w / 2), y + height - ear / 2, z + b * (5 + w / 2)], [w, ear, w], 0, 2);
}

const bracketCache = new Map();
export function bracketGeometry(spec, kind) {
  const key = [spec.caiGrade,spec.tiao,spec.ang,spec.enclosedBrackets,spec.shadowProxy,kind].join(':');
  if (bracketCache.has(key)) return bracketCache.get(key);

  const body = new GeometryBatch(), branch = new GeometryBatch();
  const dou=(...args)=>douBlock(...args,spec.shadowProxy);
  const corner = kind === 'zhuanjiao', single = kind === 'bujian';
  dou(body, 0, 0, 0, corner ? 36 : 32, 20, true);
  const arm = (name, y, z, along = false, height = 15, stretch = 1) => {
    const g = gong(GONG_FEN[name], height, name === 'ling' ? 5 : 4, name === 'nidao' ? 3.5 : name === 'man' ? 3 : 4, spec.shadowProxy);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(0, y, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), along ? Math.PI / 2 : 0),
      new THREE.Vector3(stretch, 1, 1));
    branch.add(g, m, { type: 1, size: [GONG_FEN[name], height] }); g.dispose();
  };
  arm('nidao', 12, 0);
  for (let i = 0; i < spec.tiao; i++) {
    const y = 12 + i * 31, z = i * 30;
    const useAng = spec.ang && i >= (spec.tiao >= 4 ? 2 : 1);
    if (useAng) {
      // 卷四 下昂: timber continues into the roof, with a 23 分 downward nose beyond its bearing.
      // inferred: inner tail length is two jumps; its slope follows the assembled support levels.
      const g = profilePrism([[-60, 52], [30, 21], [53, -4], [53, -6], [30, 6], [-60, 37]], 10);
      const m = new THREE.Matrix4().makeRotationY(-Math.PI / 2); m.setPosition(0, y, z);
      branch.add(g, m, { type: 3, size: [113, 58] }); g.dispose();
    } else arm('huagong', y, z, true, single ? 15 : 21);
    // The closed hall's 栱眼壁/ceiling encloses the inward half of each set.
    if (i > 0 && !spec.enclosedBrackets) arm('huagong', y, -z, true, single ? 15 : 21);
    for (const sign of (spec.enclosedBrackets ? [1] : [-1, 1])) {
      const zz = sign * (i + 1) * 30;
      dou(branch, 0, y + 21, zz, 18, 10, false);
      if (i < spec.tiao - 1) {
        arm('guazi', y + 27, zz);
        for (const x of [-23, 23]) dou(branch, x, y + 42, zz, 16, 10, false);
        arm('man', y + 48, zz);
        for (const x of [-38, 38]) dou(branch, x, y + 63, zz, 16, 10, false);
      }
    }
  }
  const top = 12 + spec.tiao * 31;
  for (const sign of (spec.enclosedBrackets ? [1] : [-1, 1])) {
    const z = sign * spec.tiao * 30;
    arm('ling', top, z);
    for (const x of [-28, 28]) dou(branch, x, top + 15, z, 16, 10, false);
    branch.box([0, top + 31, z], [104, 12, 10]); // 卷五 令栱上替木
    const g = profilePrism([[-25, 21], [20, 21], [25, 15], [25, 10], [20, 2], [-25, 0]], 10);
    const m = new THREE.Matrix4().makeRotationY(Math.PI / 2); m.setPosition(0, top - 6, z);
    branch.add(g, m); g.dispose();
  }
  const bg = branch.geometry(); body.add(bg);
  if (corner) {
    body.add(bg, new THREE.Matrix4().makeRotationY(Math.PI / 2));
    const diagonal = new THREE.Matrix4().makeRotationY(Math.PI / 4);
    diagonal.scale(new THREE.Vector3(1, 1, Math.SQRT2)); body.add(bg, diagonal);
  }
  bg.dispose();
  const g = body.geometry(); g.scale(fen(spec.caiGrade), fen(spec.caiGrade), fen(spec.caiGrade));
  const sizes = g.attributes.memberSize;
  for (let i = 0; i < sizes.array.length; i++) sizes.array[i] *= fen(spec.caiGrade);
  g.userData.batchKey='puzuo:'+key;
  bracketCache.set(key,g);return g;
}

export function addBrackets(group, layout, material) {
  for (const kind of ['zhutou', 'bujian', 'zhuanjiao']) {
    const sets = layout.sets.filter((s) => s.kind === kind);
    if (!sets.length) continue;
    const geometry=bracketGeometry(layout.spec,kind);
    geometry.userData.shadowGeometry=bracketGeometry({...layout.spec,shadowProxy:true},kind);
    const mesh = new THREE.InstancedMesh(geometry, material, sets.length);
    mesh.name = `铺作-${kind}`;
    sets.forEach((s, i) => {
      const m = new THREE.Matrix4().makeRotationY(s.angle); m.setPosition(s.x, s.y, s.z); mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = mesh.receiveShadow = true;
    mesh.computeBoundingSphere(); group.add(mesh);
  }
}
