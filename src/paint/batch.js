import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const cube = new THREE.BoxGeometry();
// inferred: a few deterministically chipped arris profiles keep coping
// edges and wear varied while all stones still merge into the same draw.
const stoneCubes=Array.from({length:4},(_,seed)=>{
  const g=new RoundedBoxGeometry(1,1,1,1,.025+seed*.006),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),edge=[x,y,z].filter(v=>Math.abs(v)>.44).length;
    if(edge>1){const chip=.016*(1+Math.sin(x*117+y*83+z*137+seed*7.3));p.setXYZ(i,x*(1-chip),y*(1-chip),z*(1-chip));}
  }
  g.computeVertexNormals();return g;
});
const up = new THREE.Vector3(0, 1, 0);

// A single draw per paint family; construction coordinates survive merging.
export class PaintBatch {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.data = []; this.wind = []; this.kind = []; this.detail = []; this.idx = []; }
  add(g, matrix = new THREE.Matrix4(), color = '#ffffff', ao = 1, sway = 0, paintKind = null) {
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.paintUV || g.attributes.memberUV || g.attributes.uv;
    const tile=g.attributes.tileCoord;
    const size = g.attributes.memberSize, colors = g.attributes.color, data = g.attributes.aFlora;
    const origin = g.attributes.aOrigin, canopy = g.attributes.aCanopy;
    const detail=g.attributes.paintDetail,faceUV=g.attributes.memberUV||g.attributes.uv;
    const c = color?.isColor ? color : new THREE.Color(color);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix),basis=new THREE.Matrix3().setFromMatrix4(matrix),v = new THREE.Vector3();
    const start = this.p.length / 3;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(matrix); this.p.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize(); this.n.push(v.x, v.y, v.z);
      this.c.push(c.r * (colors ? colors.getX(i) : 1), c.g * (colors ? colors.getY(i) : 1), c.b * (colors ? colors.getZ(i) : 1));
      if(g.attributes.paintUV)this.uv.push(uv.getX(i),uv.getY(i));
      else if(paintKind===30&&tile)this.uv.push(tile.getX(i)*.26,tile.getY(i)*.35);
      else this.uv.push((uv?.getX(i) || 0) * (size?.getX(i) || 1), (uv?.getY(i) || 0) * (size?.getY(i) || 1));
      // W3 keeps the source tile coordinates or the member's unscaled face
      // coordinates alongside the accepted material UVs.
      if(detail&&paintKind===57&&detail.getW(i)>1.5){
        // Morph displacements follow the hall placement's scale/rotation.
        v.set(detail.getX(i),detail.getY(i),detail.getZ(i)).applyMatrix3(basis);
        this.detail.push(v.x,v.y,v.z,detail.getW(i));
      }else this.detail.push(detail?.getX(i)??faceUV?.getX(i)??0,detail?.getY(i)??faceUV?.getY(i)??0,
        detail?.getZ(i)??size?.getX(i)??0,detail?.getW(i)??size?.getY(i)??0);
      // inferred: vertex AO and branch flex replace a noisy screen-space occlusion pass.
      this.data.push(ao * (canopy?.getX(i) ?? 1), data ? data.getY(i) : sway,
        origin ? origin.getX(i) + origin.getZ(i) : p.getX(i) * .17 + p.getZ(i) * .31);
      const flex=this.data.at(-2),phase=this.data.at(-1);
      // sin(time + phase) expanded once on the CPU: the same flex, without
      // two transcendental evaluations at every vertex of every frame.
      this.wind.push(Math.cos(phase*.6)*.075*flex,Math.sin(phase*.6)*.075*flex,
        Math.cos(phase*.5)*.045*flex,Math.sin(phase*.5)*.045*flex);
      const member=g.attributes.memberType?.getX(i);
      const tag=paintKind===33&&g.attributes.memberType?(member===4?33:34):paintKind===47?(member===4?47:0):
        paintKind===40?(member===2?41:member===3?42:40):paintKind;
      this.kind.push(g.attributes.paintPart?.getX(i) ?? tag ?? data?.getX(i) ?? 0);
    }
    if (g.index) for (const i of g.index.array) this.idx.push(start + i);
    else for (let i = 0; i < p.count; i++) this.idx.push(start + i);
  }
  box(center, size, color, ao = 1, yaw = 0, chipped = false, paintKind = null) {
    this.add(chipped ? stoneCubes[Math.abs(Math.floor(center[0]*7+center[2]*3))%stoneCubes.length] : cube, new THREE.Matrix4().compose(new THREE.Vector3(...center),
      new THREE.Quaternion().setFromAxisAngle(up, yaw), new THREE.Vector3(...size)), color, ao,0,paintKind);
  }
  beam(a, b, width, depth, color, ao = 1) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    this.add(cube, new THREE.Matrix4().compose(va.add(vb).multiplyScalar(.5),
      new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()), new THREE.Vector3(width, d.length(), depth)), color, ao);
  }
  mesh(material, name) {
    const g = new THREE.BufferGeometry();
    for (const [key, array, size] of [['position', this.p, 3], ['normal', this.n, 3], ['color', this.c, 3], ['uv', this.uv, 2], ['paintData', this.data, 3], ['paintWind',this.wind,4], ['paintKind', this.kind, 1], ['paintDetail',this.detail,4]])
      g.setAttribute(key, new THREE.Float32BufferAttribute(array, size));
    g.setIndex(this.idx); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, material); mesh.name = name; mesh.userData.noPatch = true;
    return mesh;
  }
}

// Repeated eave caps and rafter ends share geometry and one draw per family.
export class PaintInstances {
  constructor(geometry,kind){
    const batch=new PaintBatch();batch.add(geometry,undefined,'#ffffff',1,0,kind);
    this.geometry=batch.mesh(null,'template').geometry;this.matrices=[];this.colors=[];
  }
  add(matrix,color){this.matrices.push(matrix.clone());this.colors.push(new THREE.Color(color));}
  mesh(material,name){
    if(!this.matrices.length){this.geometry.dispose();material.dispose();return null;}
    const mesh=new THREE.InstancedMesh(this.geometry,material,this.matrices.length);
    this.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,this.colors[i]);});
    mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
    mesh.name=name;mesh.userData.noPatch=true;return mesh;
  }
}
