import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tileMaterial } from '../materials/tile.js';
import { timberMaterial } from '../materials/timber.js';
import { stoneMaterial } from '../materials/stone.js';
import { metalMaterial } from '../materials/metal.js';

const CHI = 0.312;
// inferred: all ornament profiles, relief motifs, fence dimensions and stud spacing below
// reconstruct the paintings; only goulan dimensions explicitly cited from 卷三 are prescriptive.
// Geometry generators return {lod0,lod1} BufferGeometry; assembled generators return Groups.
// Local anchors: base at y=0, front +Z; chiwei curves inward toward +X. Units: metres.
const v3 = (p) => new THREE.Vector3(...p);
function merge(parts) {
  const flat=parts.map(g => { const n=g.index ? g.toNonIndexed() : g; const c=n.clone();
    for(const k of Object.keys(c.attributes)) if(!['position','normal','uv'].includes(k)) c.deleteAttribute(k);
    if(!c.attributes.uv) c.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(c.attributes.position.count*2),2));
    if(n!==g) n.dispose(); return c; });
  const g=mergeGeometries(flat,false); flat.forEach(x=>x.dispose()); parts.forEach(x=>x.dispose());
  g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function ball(x,y,z,sx,sy,sz,detail) {
  return new THREE.SphereGeometry(1,detail ? 24 : 10,detail ? 16 : 7).scale(sx,sy,sz).translate(x,y,z);
}
function tube(points,r,detail,closed=false) {
  const curve=new THREE.CatmullRomCurve3(points.map(v3),closed,'centripetal');
  return new THREE.TubeGeometry(curve,Math.max(8,points.length*(detail ? 2 : 1)),r,detail ? 8 : 4,closed);
}
function extrude(shape,depth,detail,bevel=0.015) {
  return new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:detail ? 28 : 8,
    bevelEnabled:true,bevelSegments:detail ? 3 : 1,bevelSize:bevel,bevelThickness:bevel}).translate(0,0,-depth/2);
}
function box(w,h,d,detail=true) {
  const s=new THREE.Shape(); s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();
  return extrude(s,d,detail,Math.min(0.008,w/10,h/10,d/10));
}
function pair(build) { return {lod0:build(true),lod1:build(false)}; }
function inside(p,polygon) {
  let yes=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a.y>p[1])!==(b.y>p[1]) && p[0]<(b.x-a.x)*(p[1]-a.y)/(b.y-a.y)+a.x) yes=!yes;
  } return yes;
}

export function juquezi({height=0.24}={}) {
  return pair(detail=>merge([
    tube([[0,0,0],[0,0.12,0],[0,0.24,0]],0.014,detail),
    tube([[-0.1,0.24,0],[-0.09,0.14,0],[0,0.12,0],[0.09,0.14,0],[0.1,0.24,0]],0.013,detail),
  ]).scale(height/0.24,height/0.24,height/0.24));
}

/** Upright concave fin, relief on BOTH faces, integral 拒鹊子. No head or open jaw. */
export function chiwei({height=1.8}={}) {
  return pair(detail=>{
    const s=new THREE.Shape();s.moveTo(-0.40,0.0);s.lineTo(0.62,0.0);
    s.bezierCurveTo(0.59,0.17,0.22,0.24,0.12,0.47);
    s.bezierCurveTo(-0.08,0.85,0.03,1.26,0.47,1.48);
    s.bezierCurveTo(0.58,1.53,0.58,1.61,0.48,1.62);
    s.bezierCurveTo(-0.15,1.62,-0.38,1.38,-0.40,0.85);
    s.bezierCurveTo(-0.43,0.52,-0.47,0.24,-0.40,0.0);s.closePath();
    const parts=[extrude(s,0.25,detail,0.025)];
    const outline=s.getPoints(detail ? 18 : 5);
    for(const side of [-1,1]) {
      parts.push(tube(outline.map(p=>[p.x,p.y,side*0.145]),0.024,detail,true));
      if(detail) {
        for(let row=0;row<12;row++) for(let col=0;col<8;col++) {
          const x=-0.32+col*0.12+(row%2)*0.06, y=0.12+row*0.115;
          const pts=[];
          for(let k=0;k<=8;k++) {const a=Math.PI*k/8;pts.push([x+0.052*Math.cos(a),y-0.065*Math.sin(a),side*0.145]);}
          if(pts.every(p=>inside(p,outline))) parts.push(tube(pts,0.009,true));
        }
        // Raised curling stems crossing the scale field, as in 瑞鹤图's incised scrolls.
        for(const [cx,cy,r] of [[-0.16,0.44,0.13],[-0.18,0.84,0.12],[-0.1,1.23,0.13]]) {
          const pts=[];for(let i=0;i<35;i++){const t=i/34,a=t*Math.PI*3.3,rad=r*(1-t*0.83);
            pts.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad,side*0.16]);}
          parts.push(tube(pts,0.018,true));
        }
      }
    }
    const fork=juquezi();parts.push((detail ? fork.lod0 : fork.lod1).translate(0.43,1.61,0));
    (detail ? fork.lod1 : fork.lod0).dispose();
    parts.push(box(1.08,0.10,0.38,detail).translate(0.08,0.04,0));
    return merge(parts).scale(height/1.85,height/1.85,height/1.85);
  });
}

/** Small crouching ridge guardian. Modelled as a modest animal, not a Qing ridge-end dragon. */
function guardian(detail,scale=1) {
  const parts=[ball(0,0.18,0,0.18,0.16,0.10,detail),ball(0.13,0.32,0,0.09,0.10,0.085,detail),
    ball(0.20,0.30,0,0.05,0.035,0.065,detail),box(0.42,0.06,0.24,detail).translate(0,0.03,0)];
  for(const z of [-0.065,0.065]) {
    parts.push(ball(0.10,0.11,z,0.045,0.095,0.038,detail),ball(-0.11,0.09,z,0.06,0.06,0.04,detail));
    parts.push(ball(0.10,0.41,z*0.7,0.028,0.05,0.024,detail));
    if(detail)parts.push(ball(0.19,0.34,z,0.015,0.012,0.009,true));
  }
  parts.push(tube([[-0.15,0.16,0],[-0.24,0.19,0],[-0.24,0.29,0],[-0.18,0.31,0]],0.025,detail));
  return merge(parts).scale(scale,scale,scale);
}
export function chuishou({height=0.62}={}) { return pair(detail=>guardian(detail,height/0.46)); }
/** One figure; use an InstancedMesh for the deliberately modest row (default test has three). */
export function dunshou({height=0.35}={}) { return pair(detail=>guardian(detail,height/0.46)); }

export function wadang({radius=0.105}={}) {
  return pair(detail=>{
    const parts=[new THREE.CylinderGeometry(radius,radius,0.055,detail ? 48 : 14).rotateX(Math.PI/2)];
    parts.push(new THREE.TorusGeometry(radius*0.84,radius*0.07,detail ? 8 : 4,detail ? 48 : 14).translate(0,0,0.031));
    if(detail) for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      parts.push(new THREE.SphereGeometry(1,12,8).scale(radius*0.12,radius*0.27,0.012)
        .rotateZ(a-Math.PI/2).translate(Math.cos(a)*radius*0.43,Math.sin(a)*radius*0.43,0.034));
    }
    parts.push(ball(0,0,0.04,radius*0.16,radius*0.16,0.014,detail));
    return merge(parts);
  });
}
export function dishui({width=0.21}={}) {
  return pair(detail=>{
    const s=new THREE.Shape();s.moveTo(-0.105,0.05);s.lineTo(0.105,0.05);
    s.quadraticCurveTo(0.10,-0.03,0,-0.15);s.quadraticCurveTo(-0.1,-0.03,-0.105,0.05);
    const parts=[extrude(s,0.035,detail,0.005)];
    parts.push(tube([[-0.08,0.025,0.025],[0,-0.11,0.025],[0.08,0.025,0.025]],0.009,detail));
    if(detail) for(const side of [-1,1])parts.push(tube([[0,-0.08,0.026],[side*0.045,-0.015,0.026],[0,0.02,0.026]],0.007,true));
    return merge(parts).scale(width/0.21,width/0.21,width/0.21);
  });
}

function instances(geometry,material,matrices,name) {
  const m=new THREE.InstancedMesh(geometry,material,matrices.length);m.name=name;
  matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.instanceMatrix.needsUpdate=true;
  m.computeBoundingBox();m.computeBoundingSphere();return m;
}
function transform(position=[0,0,0],rotation=0,scale=[1,1,1]) {
  return new THREE.Matrix4().compose(v3(position),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rotation),v3(scale));
}

export function doorStuds(engine,{width=2.4,height=3.0,rows=8,columns=4,variation=0}={}) {
  const wood=timberMaterial(engine,{variation}),gold=metalMaterial(engine,{variation}),iron=metalMaterial(engine,{variant:'iron',variation});
  return pair(detail=>{
    const group=new THREE.Group();group.name='studded-door';
    const half=width/2,boards=[];
    for(let i=0;i<6;i++) boards.push(box(half/6-0.004,height,0.075,detail).translate(-half/2+(i+0.5)*half/6,height/2,0));
    for(const y of [0.14,height*0.38,height*0.7,height-0.14]) for(const side of [-1,1])
      boards.push(box(half,0.12,0.055,detail).translate(0,y,side*0.061));
    for(const x of [-half/2+0.055,half/2-0.055]) boards.push(box(0.10,height,0.06,detail).translate(x,height/2,0.065));
    group.add(instances(merge(boards),wood,[-1,1].map(s=>transform([s*(half/2+0.004),0,0])),'door-leaves'));
    const studs=[];
    for(const side of [-1,1])for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)
      studs.push(transform([side*half/2-half*0.38+x*half*0.76/(Math.max(1,columns-1)),0.24+y*(height-0.48)/Math.max(1,rows-1),0.10]));
    group.add(instances(ball(0,0,0,0.038,0.038,0.027,detail),gold,studs,'gold-studs'));
    const mounts=[],rings=[];
    for(const side of [-1,1]){mounts.push(transform([side*0.16,height*0.47,0.12]));rings.push(transform([side*0.16,height*0.47-0.07,0.16]));}
    group.add(instances(box(0.11,0.17,0.025,detail),iron,mounts,'handle-plates'));
    group.add(instances(new THREE.TorusGeometry(0.065,0.012,detail ? 10 : 4,detail ? 32 : 10),iron,rings,'door-rings'));
    return group;
  });
}

function pathSpans(path,maxLength) {
  if(!path || path.length<2)throw new Error('A path needs at least two points');
  const spans=[],posts=[];
  for(let k=1;k<path.length;k++) {
    const a=v3(path[k-1]),b=v3(path[k]),delta=b.clone().sub(a);
    const length=Math.hypot(delta.x,delta.z);if(length<1e-6)continue;
    const n=Math.ceil(length/maxLength);
    for(let i=0;i<n;i++) {
      const p=a.clone().lerp(b,i/n),q=a.clone().lerp(b,(i+1)/n);
      const d=q.clone().sub(p),horizontal=Math.hypot(d.x,d.z);
      // 卷三: keep the full vertical rail height on ramps, with upright post joints.
      const matrix=new THREE.Matrix4().set(d.x/horizontal,0,-d.z/horizontal,p.x,
        d.y/horizontal,1,0,p.y,d.z/horizontal,0,d.x/horizontal,p.z,0,0,0,1);
      spans.push({matrix,length:d.length(),horizontal});posts.push(p);
    }
  }
  const last=v3(path[path.length-1]);
  if(!posts.length || last.distanceTo(posts[0])>1e-6)posts.push(last);
  return {spans,posts};
}

/** 卷三 重台鉤闌: each panel 4 尺 high × 7 尺 long; members scaled by height in 尺.
 * Path samples are [x,y,z]; panels follow slopes. Post caps here are inferred lotus buds
 * (painting-readable, not Qing dragon/cloud finials); optional lion finials use the text.
 */
export function goulan(engine,{path=[[0,0,0],[4.368,0,0]],height=4*CHI,variation=0,lionFinials=false}={}) {
  const material=stoneMaterial(engine,{variation,polished:0.15});
  const countHeight=height/CHI,nominalLength=7*CHI;
  const {spans,posts}=pathSpans(path,nominalLength);
  return pair(detail=>{
    const group=new THREE.Group();group.name='goulan';
    const parts=[];
    // Dimensions per 尺 of total rail height from 卷三.
    const rail=0.08*CHI*countHeight,lipH=0.18*CHI*countHeight,lipD=0.06*CHI*countHeight;
    const waistH=0.10*CHI*countHeight,waistD=0.09*CHI*countHeight,footH=0.18*CHI*countHeight,footD=0.16*CHI*countHeight;
    for(const [y,h,d] of [[height-rail/2,rail,rail],[height*0.68,lipH,lipD],[height*0.37,waistH,waistD],[footH/2,footH,footD]])
      parts.push(box(nominalLength,h,d,detail).translate(nominalLength/2,y,0));
    const panelDepth=0.03*CHI*countHeight;
    for(const [y,h] of [[height*0.52,0.19*CHI*countHeight],[height*0.235,0.15*CHI*countHeight]]) {
      parts.push(box(nominalLength-0.32,h,panelDepth,detail).translate(nominalLength/2,y,0));
      if(detail)for(const side of [-1,1])for(let i=0;i<5;i++) {
        const pts=[];for(let j=0;j<=32;j++){const a=j/32*Math.PI*2,r=0.065+0.017*Math.cos(6*a);
          pts.push([0.38+i*0.35+Math.cos(a)*r,y+Math.sin(a)*r,side*(panelDepth/2+0.006)]);}
        parts.push(tube(pts,0.009,true,true));
      }
    }
    const cloud=new THREE.Shape();cloud.moveTo(-0.17,0);cloud.bezierCurveTo(-0.17,0.06,-0.09,0.03,-0.07,0.09);
    cloud.quadraticCurveTo(0,0.12,0.07,0.09);cloud.bezierCurveTo(0.09,0.03,0.17,0.06,0.17,0);cloud.lineTo(0.04,-0.045);cloud.lineTo(-0.04,-0.045);cloud.closePath();
    for(const x of [nominalLength*0.25,nominalLength*0.75]) {
      parts.push(box(0.02*CHI*countHeight,height*0.22,0.01*CHI*countHeight,detail).translate(x,height*0.82,0));
      parts.push(extrude(cloud,0.08*CHI*countHeight,detail,0.006)
        .scale((0.27*CHI*countHeight)/0.34,(0.135*CHI*countHeight)/0.165,1).translate(x,height-rail-0.07,0));
    }
    group.add(instances(merge(parts),material,spans.map(s=>s.matrix.clone().multiply(new THREE.Matrix4().makeScale(s.horizontal/nominalLength,1,1))),'rail-panels'));
    const postHeight=height*1.3,diameter=CHI;
    const pp=[new THREE.CylinderGeometry(diameter/2,diameter/2,postHeight,8).translate(0,postHeight/2,0),
      box(diameter*1.35,0.075,diameter*1.35,detail).translate(0,0.055,0)];
    if(lionFinials)pp.push(guardian(detail,CHI*1.5/0.46).translate(0,postHeight,0));
    else pp.push(ball(0,postHeight+0.07,0,diameter*0.49,0.105,diameter*0.49,detail));
    group.add(instances(merge(pp),material,posts.map(p=>transform(p.toArray())),'wangzhu'));
    return group;
  });
}

/** Line/path-following low vermilion or black 杈子. Joined rails and forked uprights. */
export function chazi(engine,{path=[[0,0,0],[6,0,0]],height=1.05,variant='vermilion',variation=0}={}) {
  const mat=timberMaterial(engine,{variant,variation});
  const {spans,posts}=pathSpans(path,2.0);
  return pair(detail=>{
    const group=new THREE.Group();group.name='chazi-'+variant;
    const spanParts=[box(2,0.095,0.095,detail).translate(1,height*0.3,0),box(2,0.095,0.095,detail).translate(1,height*0.8,0)];
    for(let i=1;i<8;i++)spanParts.push(box(0.047,height*0.7,0.047,detail).translate(i*0.25,height*0.48,0));
    group.add(instances(merge(spanParts),mat,spans.map(s=>s.matrix.clone().multiply(new THREE.Matrix4().makeScale(s.horizontal/2,1,1))),'fence-bays'));
    const post=[box(0.12,height,0.12,detail).translate(0,height/2,0),box(0.17,0.06,0.17,detail).translate(0,height*0.85,0)];
    for(const sign of [-1,1])post.push(box(0.05,0.23,0.055,detail).rotateZ(sign*0.42).translate(sign*0.045,height-0.02,0));
    group.add(instances(merge(post),mat,posts.map(p=>transform(p.toArray())),'forked-posts'));
    return group;
  });
}

/** Anchor adapter for T1. Anchors are [x,y,z] or {position:[x,y,z], rotation:yaw}.
 * T1's yaw points +Z outward: +PI/2 turns a fin inward, -PI/2 turns a guardian outward.
 * An explicit Euler [rx,ry,rz] instead rotates the native geometry axes directly.
 * Returns two groups; callers attach each to the corresponding hall LOD.
 */
export function roofOrnaments(engine,anchors,{height=1.8,variation=0}={}) {
  const result={lod0:new THREE.Group(),lod1:new THREE.Group()};
  const material=tileMaterial(engine,{variation,ribbed:false});
  for(const [name,factory] of [['chiwei',()=>chiwei({height})],['chuishou',()=>chuishou()]]) {
    const entries=anchors[name] ?? [];if(!entries.length)continue;
    const geometries=factory();
    const matrices=entries.map(a=>{
      const position=Array.isArray(a) ? a : a.position;
      if(!position)throw new Error('Ornament anchor requires position');
      const rotation=typeof a.rotation === 'number'
        ? [0,a.rotation+(name==='chiwei' ? Math.PI/2 : -Math.PI/2),0] : (a.rotation ?? [0,0,0]);
      const m=new THREE.Matrix4();m.compose(v3(position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));return m;
    });
    for(const lod of ['lod0','lod1'])result[lod].add(instances(geometries[lod],material,matrices,name));
  }
  return result;
}

export function ornamentTriangles(object) {
  if(object.isBufferGeometry)return (object.index?.count ?? object.attributes.position.count)/3;
  let count=0;object.traverse(o=>{if(o.isMesh)count+=ornamentTriangles(o.geometry)*(o.isInstancedMesh ? o.count : 1);});return count;
}
