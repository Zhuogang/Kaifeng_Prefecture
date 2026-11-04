import * as THREE from 'three';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const mix = (a, b, t) => a.clone().lerp(b, t);
export const TAU = Math.PI * 2;

// One vertex layout for wood, leaves and petals keeps each tree in a single draw.
// kind: 0 bark, 1 leaf, 2 blossom, 3 lotus, 4 bird, 5 willow card,
// 6 blossom card, 7 huai card, 8 bai card; sway is independent of height.
export class Geometry {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.data = []; this.origin = []; this.canopy = []; this.index = []; }
  vertex(p, n, color, kind = 0, sway = 0, uv = [0, 0], origin = p, random = 0, ao = 1) {
    const i = this.p.length / 3;
    this.p.push(...p); this.n.push(...n); this.c.push(color.r, color.g, color.b);
    this.uv.push(...uv); this.data.push(kind, sway, random); this.origin.push(...origin); this.canopy.push(ao);
    return i;
  }
  tri(a, b, c) { this.index.push(a, b, c); }
  // inferred: fixed world-oriented cards with curved crown normals; never face the camera.
  card(center, width, height, normal, color, {kind=6, sway=0.4, roll=0, random=0, ao=1}={}) {
    const n=normal.clone().normalize(), u=n.clone().cross(Math.abs(n.y)>0.9?V(1,0,0):V(0,1,0)).normalize().applyAxisAngle(n,roll), v=n.clone().cross(u);
    const rows=[];
    for(let j=0;j<3;j++) {
      const row=[];
      for(let i=0;i<3;i++) {
        const x=i-1,y=j-1,p=center.clone().addScaledVector(u,x*width*0.5).addScaledVector(v,y*height*0.5);
        const bent=n.clone().multiplyScalar(0.7).addScaledVector(u,x*0.55).addScaledVector(v,y*0.55).normalize();
        row.push(this.vertex(p,bent,color,kind,sway,[i/2,j/2],center,random,ao));
      }
      rows.push(row);
    }
    for(let j=0;j<2;j++) for(let i=0;i<2;i++) {
      this.tri(rows[j][i],rows[j][i+1],rows[j+1][i]);this.tri(rows[j][i+1],rows[j+1][i+1],rows[j+1][i]);
    }
  }
  curtain(path, width, yaw, color, {sway=1, random=0, ao=1, normal=null, kind=5}={}) {
    const across=V(Math.cos(yaw),0,Math.sin(yaw)), n=normal??across.clone().cross(V(0,1,0));
    const rows=path.map((p,j)=>[-1,1].map(side=>this.vertex(p.clone().addScaledVector(across,side*width*0.5*(1-0.35*j/(path.length-1))),n,color,kind,sway*j/(path.length-1),[(side+1)/2,1-j/(path.length-1)],path[0],random,ao)));
    for(let j=1;j<rows.length;j++) {
      this.tri(rows[j-1][0],rows[j][0],rows[j-1][1]);this.tri(rows[j-1][1],rows[j][0],rows[j][1]);
    }
  }
  tube(points, radii, color, { sides = 7, gnarl = 0, sway = 0, kind = 0, smooth = 2 } = {}) {
    if (points.length > 2 && smooth > 1) {
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const count = (points.length - 1) * smooth, oldRadii = radii;
      radii = Array.from({ length: count + 1 }, (_, i) => {
        const t = i / smooth, j = Math.min(oldRadii.length - 2, Math.floor(t));
        return THREE.MathUtils.lerp(oldRadii[j], oldRadii[j + 1], t - j);
      });
      points = curve.getPoints(count);
    }
    let along = 0;
    const rows = [];
    let basis;
    points.forEach((p, j) => {
      const tangent = points[Math.min(j + 1, points.length - 1)].clone().sub(points[Math.max(0, j - 1)]).normalize();
      if (!basis) basis = Math.abs(tangent.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
      basis.addScaledVector(tangent, -basis.dot(tangent)).normalize();
      const cross = tangent.clone().cross(basis).normalize(), row = [];
      if (j) along += p.distanceTo(points[j - 1]);
      for (let k = 0; k <= sides; k++) {
        const a = TAU * k / sides, n = basis.clone().multiplyScalar(Math.cos(a)).addScaledVector(cross, Math.sin(a));
        const r = radii[j] * (1 + gnarl * (0.17 * Math.sin(5 * a + along * 2) + 0.12 * Math.cos(3 * a - along)));
        row.push(this.vertex(p.clone().addScaledVector(n, r), n, color, kind, sway * j / (points.length - 1), [a * radii[0], along]));
      }
      rows.push(row);
    });
    for (let j = 1; j < rows.length; j++) for (let k = 0; k < sides; k++) {
      this.tri(rows[j - 1][k], rows[j - 1][k + 1], rows[j][k]);
      this.tri(rows[j - 1][k + 1], rows[j][k + 1], rows[j][k]);
    }
    const j = points.length - 1, n = points[j].clone().sub(points[j - 1]).normalize();
    const top = this.vertex(points[j], n, color, kind, sway);
    for (let k = 0; k < sides; k++) this.tri(rows[j][k], rows[j][k + 1], top);
  }
  leaf(p, length, width, direction, color, sway = 0, roll = 0, kind = 1, random = 0) {
    const d = direction.clone().normalize();
    const s = d.clone().cross(Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)).normalize().applyAxisAngle(d, roll);
    const n = s.clone().cross(d).normalize();
    const outline = [[0,0],[0.48,0.3],[0.44,0.68],[0,1],[-0.44,0.68],[-0.48,0.3]];
    const ids = outline.map(([x,y]) => this.vertex(p.clone().addScaledVector(d,length*y).addScaledVector(s,width*x), n, color, kind, sway, [x+0.5,y], p, random));
    for(let i=1;i<ids.length-1;i++) this.tri(ids[0],ids[i],ids[i+1]);
  }
  feather(p, length, width, direction, color, flap = 0) {
    const d = direction.clone().normalize(), side = d.clone().cross(V(0,1,0)).normalize();
    const n = side.clone().cross(d).normalize();
    const center = this.vertex(p.clone().addScaledVector(d,length*0.5).addScaledVector(n,width*0.2), n, color, 4, flap, [0.5,0.5],p,1);
    const outline = [[0,0],[-0.44,0.17],[-0.5,0.72],[-0.34,0.93],[0,1],[0.34,0.93],[0.5,0.72],[0.44,0.17]];
    const ids = outline.map(([x,y]) => this.vertex(p.clone().addScaledVector(d,y*length).addScaledVector(side,x*width), n.clone().addScaledVector(side,x*0.8).normalize(), color, 4, flap, [x+0.5,y],p,1));
    for(let i=0;i<ids.length;i++) this.tri(center,ids[i],ids[(i+1)%ids.length]);
  }
  flower(p, radius, normal, color, sway, random, petals = 5) {
    const n = normal.clone().normalize(), u = n.clone().cross(Math.abs(n.y) > 0.9 ? V(1,0,0) : V(0,1,0)).normalize(), v = n.clone().cross(u);
    // inferred: a two-triangle analytic five-petal cutout permits dense, genuinely
    // tiny flowers without exceeding the per-tree geometry budget.
    if(petals<0) {
      const ids=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>this.vertex(p.clone().addScaledVector(u,x*radius).addScaledVector(v,y*radius),n,color,2.2,sway,[(x+1)/2,(y+1)/2],p,random));
      this.tri(ids[0],ids[1],ids[2]);this.tri(ids[0],ids[2],ids[3]);return;
    }
    const center = this.vertex(p, n, color, 2, sway, [0.5,0.5], p, random), ring = [];
    const segments = petals === 0 ? 5 : petals * 2;
    for (let i = 0; i < segments; i++) {
      const a = i * TAU / segments, r = radius * (petals === 0 ? 1 : i % 2 ? 0.65 : 1);
      ring.push(this.vertex(p.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).addScaledVector(n, radius * 0.12), n, color, 2, sway, [0.5 + Math.cos(a) * r / radius * 0.5, 0.5 + Math.sin(a) * r / radius * 0.5], p, random));
    }
    for (let i = 0; i < ring.length; i++) this.tri(center, ring[i], ring[(i + 1) % ring.length]);
  }
  ellipsoid(center, size, color, { detail = 0, kind = 1, sway = 0, rotation = null } = {}) {
    const g = detail < 0 ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
    const start = this.p.length / 3;
    for (let i = 0; i < p.count; i++) {
      const q = V().fromBufferAttribute(p, i), n = q.clone().divide(size).normalize();
      q.multiply(size);
      if (rotation) { q.applyQuaternion(rotation); n.applyQuaternion(rotation); }
      this.vertex(q.add(center), n, color, kind, sway, [0,0], center);
    }
    for (let i = 0; i < p.count; i += 3) this.tri(start + i, start + i + 1, start + i + 2);
    g.dispose();
  }
  build() {
    const g = new THREE.BufferGeometry();
    for (const [name, data, size] of [['position',this.p,3],['normal',this.n,3],['color',this.c,3],['uv',this.uv,2],['aFlora',this.data,3],['aOrigin',this.origin,3],['aCanopy',this.canopy,1]]) g.setAttribute(name, new THREE.Float32BufferAttribute(data, size));
    g.setIndex(this.index); g.computeBoundingBox(); g.computeBoundingSphere();
    // inferred: reserve the maximum shader wind displacement for conservative culling.
    if (g.boundingSphere) g.boundingSphere.radius += 0.65;
    g.userData.triangles = this.index.length / 3;
    return g;
  }
}
