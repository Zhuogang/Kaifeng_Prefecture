import * as THREE from 'three';
import { CITY } from '../world/plan.js';
import { roofModel } from '../yingzao/roof.js';
import { colorGeometry, mergePacked, packedGeometry } from './batch.js';

// Use the shared 举折 section. The former distant envelope sampled only raised
// corners, erasing the pitched centre of the roof. Common houses have an inferred
// restrained 0.12 m corner rise, rather than the hall model's monumental wings.
export function houseRoof(hall,level) {
  const model=roofModel(hall.layout),f=CITY.fabric,pos=[],uv=[],indices=[];
  const rows=level===0?[0,.5,1,model.tEnd]:level===1?[0,1,model.tEnd]:[0,model.tEnd];
  const us=level<3?[-1,0,1]:[-1,1];
  for(const side of [-1,1]) {
    const start=pos.length/3;
    for(const t of rows)for(const u of us) {
      const z=model.b*t,y=model.baseY+model.sectionY(t)+f.cornerLift*u*u*(t/model.tEnd)**2;
      pos.push(side*u*f.roofHalfWidth,y+.10,side*z);uv.push(side*u*f.roofHalfWidth/.26,z/.35);
    }
    for(let row=0;row<rows.length-1;row++)for(let j=0;j<us.length-1;j++) {
      const a=start+row*us.length+j,b=a+1,c=a+us.length,d=c+1;
      indices.push(a,c,b,b,c,d);
    }
  }
  if(level<3) {
    // inferred: a modest grey capped ridge survives the middle-distance LOD.
    // Its two lit/shadow faces join the real roof; no screen-space ridge lines.
    const y=model.baseY+model.sectionY(0)+.10;
    for(const side of [-1,1]) {
      const start=pos.length/3;
      for(const [x,dy,z] of [[-f.roofHalfWidth,0,side*.14],[f.roofHalfWidth,0,side*.14],[-f.roofHalfWidth,.18,0],[f.roofHalfWidth,.18,0]]) {
        pos.push(x,y+dy,z);uv.push(x/.26,Math.abs(z)/.35);
      }
      for(const i of side>0?[0,1,2,1,3,2]:[0,2,1,1,2,3])indices.push(start+i);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const roof=colorGeometry(g,new THREE.Color().setRGB(.12,.135,.145),2);g.dispose();return roof;
}

export function houseBody(hall,level) {
  const model=roofModel(hall.layout),parts=[];
  if(level<2) {
    // The shared hall still supplies the LOD1/LOD2 columns, infill and plinths.
    // Only its roof is replaced by the inexpensive common-house roof above.
    const source=level===0?hall.lod1:hall.lod2,body=new THREE.Group();
    for(const mesh of source.children) {
      if(['tile','ridge'].includes(mesh.name))continue;
      const copy=mesh.clone();copy.geometry=mesh.geometry.clone();
      if(mesh.name==='timber'||mesh.name==='bracket') {
        const g=copy.geometry,p=g.attributes.position,old=g.index.array,out=[];
        for(let i=0;i<old.length;i+=3) {
          const a=old[i],b=old[i+1],c=old[i+2];
          const x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3,y=(p.getY(a)+p.getY(b)+p.getY(c))/3;
          if(Math.abs(x)<=hall.layout.width/2+.15&&Math.abs(z)<=hall.layout.depth/2+.15&&y<model.baseY-.10)out.push(a,b,c);
        }g.setIndex(out);
      }
      body.add(copy);
    }
    parts.push(packedGeometry(body));body.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  } else {
    const body=new THREE.BoxGeometry(hall.layout.width,model.baseY-.16,hall.layout.depth);
    body.translate(0,(model.baseY-.16)/2,0);body.setIndex([...body.index.array.slice(0,12),...body.index.array.slice(24)]);
    parts.push(colorGeometry(body,new THREE.Color().setRGB(.33,.32,.29),1));body.dispose();
  }
  const w=hall.layout.width/2,d=hall.layout.depth/2,y=model.baseY-.16,p=[];
  for(const sign of [-1,1]) {
    const points=[[sign*w,y,-d],[sign*w,model.baseY+model.sectionY(0)+.05,0],[sign*w,y,d]];
    for(const i of sign<0?[0,2,1]:[0,1,2])p.push(...points[i]);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();
  parts.push(colorGeometry(g,new THREE.Color().setRGB(.33,.32,.29),1));g.dispose();return mergePacked(parts);
}
