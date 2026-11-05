import * as THREE from 'three';

const box = new THREE.BoxGeometry(1, 1, 1);
const up = new THREE.Vector3(0, 1, 0);
const cylinders = new Map();
function cylinder(sides, capped) {
  const key = `${sides}:${capped}`;
  if (!cylinders.has(key)) cylinders.set(key, new THREE.CylinderGeometry(1, 1, 1, sides, 1, !capped));
  return cylinders.get(key);
}

// Bake by material, keeping local UVs and normals. No runtime mesh per timber/tile.
export class GeometryBatch {
  constructor() {
    this.positions = []; this.normals = []; this.uvs = []; this.indices = [];
    // Shared material adapters: keep construction coordinates when geometry is merged or instanced.
    this.attributes = { memberUV: [], memberSize: [], memberType: [], memberEdge: [], tileCoord: [] };
  }
  add(geometry, matrix = new THREE.Matrix4(), member = {}) {
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
    const offset = this.positions.length / 3, normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(matrix); this.positions.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize(); this.normals.push(v.x, v.y, v.z);
      this.uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      const tex = uv ? [uv.getX(i), uv.getY(i)] : [0.5, 0.5];
      const defaults = { memberUV: member.uvAt ? member.uvAt(p.getX(i), p.getY(i), p.getZ(i), i) : tex,
        memberSize: member.sizeAt ? member.sizeAt(i) : member.size || [1, 0.25], memberType: [member.type || 0], memberEdge: [-1],
        tileCoord: [tex[0] / 0.26, tex[1] / 0.35, 0, 0] };
      for (const [key, data] of Object.entries(this.attributes)) {
        const source = geometry.getAttribute(key);
        if (source) for (let k = 0; k < source.itemSize; k++) data.push(source.array[i * source.itemSize + k]);
        else data.push(...defaults[key]);
      }
    }
    if (geometry.index) for (const idx of geometry.index.array) this.indices.push(offset + idx);
    else for (let i = 0; i < p.count; i++) this.indices.push(offset + i);
  }
  box(center, size, angle = 0, type = 0) {
    this.add(box, new THREE.Matrix4().compose(new THREE.Vector3(...center),
      new THREE.Quaternion().setFromAxisAngle(up, angle), new THREE.Vector3(...size)), { type,
      sizeAt: i => Math.abs(box.attributes.normal.getX(i)) > 0.5 ? [size[2],size[1]] :
        Math.abs(box.attributes.normal.getY(i)) > 0.5 ? [size[0],size[2]] : [size[0],size[1]] });
  }
  beam(a, b, width, depth = width, round = 0, capped = true) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), delta = vb.clone().sub(va);
    const direction = delta.clone().normalize(), across = new THREE.Vector3().crossVectors(direction, up);
    const q = across.lengthSq() < 1e-8 ? new THREE.Quaternion().setFromUnitVectors(up, direction)
      : new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across.normalize(), direction,
        new THREE.Vector3().crossVectors(across, direction).normalize()));
    const g=round ? cylinder(round, capped) : box;
    this.add(g, new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q,
      new THREE.Vector3(round ? width / 2 : width, delta.length(), round ? width / 2 : depth)),
      round ? {sizeAt:i=>Math.abs(g.attributes.normal.getY(i))>0.5 ? [width,width] : [Math.PI*width,delta.length()]} : {
        sizeAt: i => Math.abs(g.attributes.normal.getY(i)) > 0.5 ? [width,depth] :
          [delta.length(),Math.abs(g.attributes.normal.getX(i)) > 0.5 ? depth : width],
        uvAt: (x,y,z,i) => Math.abs(g.attributes.normal.getY(i)) > 0.5 ? [x+0.5,z+0.5] :
          [y+0.5,(Math.abs(g.attributes.normal.getX(i)) > 0.5 ? z : x)+0.5] });
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    const sizes = { memberUV: 2, memberSize: 2, memberType: 1, memberEdge: 1, tileCoord: 4 };
    for (const [key, data] of Object.entries(this.attributes)) g.setAttribute(key, new THREE.Float32BufferAttribute(data, sizes[key]));
    g.setIndex(this.indices); g.computeBoundingSphere();
    return g;
  }
  mesh(material, name) {
    const m = new THREE.Mesh(this.geometry(), material); m.name = name;
    m.castShadow = true; m.receiveShadow = true; return m;
  }
}

// Extruded side profile, points in local X/Y; depth along Z.
export function profilePrism(points, depth) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  g.computeBoundingBox();
  const b = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv, normal=g.attributes.normal;
  const width=b.max.x-b.min.x,height=b.max.y-b.min.y,segments=[];
  let perimeter=0;
  for(let j=0;j<points.length;j++) {
    const a=points[j],b=points[(j+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length>1e-8){segments.push({a,dx,dy,length,start:perimeter});perimeter+=length;}
  }
  const sizes=new Float32Array(p.count*2);
  for (let i = 0; i < p.count; i++) {
    const x=p.getX(i),y=p.getY(i);
    if(Math.abs(normal.getZ(i))>0.5) {
      // Keep affine face coordinates: warping every contour vertex to the UV border
      // would collapse triangles made from three curved-boundary vertices.
      uv.setXY(i,(x-b.min.x)/Math.max(0.001,width),
        (y-b.min.y)/Math.max(0.001,height));
      sizes.set([width,height],i*2);
    } else {
      // Unwrap the narrow extrusion sides by perimeter and depth. X/Y projection collapsed
      // their UV area to zero, making the paint shader classify whole faces as edge bands.
      let best=Infinity,u=0;
      for(const s of segments){
        const t=Math.max(0,Math.min(1,((x-s.a[0])*s.dx+(y-s.a[1])*s.dy)/(s.length*s.length)));
        const distance=Math.hypot(x-s.a[0]-t*s.dx,y-s.a[1]-t*s.dy);
        // A corner has two candidates: choose the segment tangent to this particular face.
        const alignment=Math.abs(normal.getX(i)*s.dx+normal.getY(i)*s.dy)/s.length;
        const score=distance+alignment;
        if(score<best){best=score;u=(s.start+t*s.length)/perimeter;}
      }
      uv.setXY(i,u,(p.getZ(i)+depth/2)/depth);sizes.set([perimeter,depth],i*2);
    }
  }
  g.setAttribute('memberSize',new THREE.BufferAttribute(sizes,2));
  return g;
}

export function meshStats(group) {
  let triangles = 0, calls = 0;
  group.traverse((o) => {
    if (!o.isMesh) return;
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
    calls += Math.max(1, o.geometry.groups.length && Array.isArray(o.material) ? o.geometry.groups.length : 1);
  });
  return { triangles, calls };
}
