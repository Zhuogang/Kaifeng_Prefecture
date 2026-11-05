import * as THREE from 'three';
import { GeometryBatch, profilePrism } from './geometry.js';

// inferred: low-relief dragon, phoenix and flying-cloud drawings reconstruct the text's
// subject matter and jinming's raised stonework. They are not traced archaeological panels.
// A motif is eight metres wide, centred at the origin, facing +Z; all detail is real geometry.
function ribbon(batch, points, radius, depth, detail) {
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y,z=0])=>new THREE.Vector3(x,y,z)));
  const n=Math.max(5,Math.ceil(points.length*(detail?0.65:0.35))), sides=detail?3:2, pos=[],idx=[];
  for(let i=0;i<=n;i++) {
    const p=curve.getPoint(i/n),t=curve.getTangent(i/n),a=new THREE.Vector3(-t.y,t.x,0).normalize();
    for(let j=0;j<=sides;j++) {
      const angle=Math.PI*j/sides, v=p.clone().addScaledVector(a,Math.cos(angle)*radius);
      v.z+=Math.sin(angle)*depth;pos.push(...v.toArray());
    }
  }
  for(let i=0;i<n;i++)for(let j=0;j<sides;j++) {
    const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,a+1,b,a+1,b+1,b);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();batch.add(g);g.dispose();
}
function silhouette(batch,points,depth) {const g=profilePrism(points,depth);g.translate(0,0,depth/2);batch.add(g);g.dispose();}
function cloud(batch,x,y,scale,detail) {
  const pts=[];
  for(let k=0;k<=18;k++) {const t=k/18,a=t*Math.PI*3.3,r=scale*(1-t*0.78);pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}
  ribbon(batch,pts,0.027,0.055,detail);
  ribbon(batch,[[x-scale,y-0.02],[x-scale*1.45,y-scale*0.5],[x-scale*2.4,y-scale*0.6]],0.03,0.06,detail);
}
export function reliefMotif(kind='dragon',detail=true) {
  const b=new GeometryBatch();
  if(kind==='dragon') {
    const path=[];for(let i=0;i<=20;i++){const t=i/20;path.push([-2.75+t*5.25,Math.sin(t*Math.PI*3.3)*0.48]);}
    ribbon(b,path,0.23,0.20,detail);
    silhouette(b,[[2.35,0.25],[2.63,0.44],[2.95,0.35],[3.12,0.14],[2.86,0.12],[3.03,-0.02],[2.68,-0.1],[2.47,0.06]],0.13);
    ribbon(b,[[2.51,0.39],[2.45,0.66],[2.64,0.82],[2.80,0.72]],0.045,0.08,detail);
    ribbon(b,[[2.65,0.41],[2.83,0.58],[2.87,0.77]],0.036,0.06,detail);
    ribbon(b,[[2.93,0.14],[3.15,0.08],[3.38,0.22],[3.52,0.14]],0.022,0.06,detail);
    for(const x of [-1.55,0.65])for(const sign of [-1,1]) {
      const y=Math.sin((x+2.75)/5.25*Math.PI*3.3)*0.48;
      ribbon(b,[[x,y],[x+0.35,y+sign*0.23],[x+0.18,sign*0.70],[x+0.47,sign*0.77]],0.085,0.14,detail);
      for(let j=0;j<3;j++)ribbon(b,[[x+0.4,sign*0.73],[x+0.57+j*0.12,sign*(0.80-j*0.08)]],0.018,0.06,detail);
    }
    if(detail)for(let i=0;i<24;i++) {
      const t=(i+0.5)/24,x=-2.65+t*4.9,y=Math.sin(t*Math.PI*3.3)*0.48;
      ribbon(b,[[x-0.045,y-0.10,0.13],[x+0.03,y,0.155],[x-0.045,y+0.10,0.13]],0.012,0.022,false);
    }
  } else {
    ribbon(b,[[-1.2,-0.1],[-0.45,-0.28],[0.24,0.02],[0.78,0.38],[1.08,0.27]],0.12,0.13,detail);
    silhouette(b,[[0.75,0.40],[0.88,0.54],[1.09,0.46],[1.32,0.33],[1.07,0.28]],0.13);
    for(const sign of [-1,1])for(let k=0;k<6;k++) {
      const t=k/5;
      ribbon(b,[[-0.38,-0.05],[-0.5+sign*0.55,0.30],[sign*(0.7+t*1.15),0.73-t*0.09]],0.085,0.12,detail);
    }
    for(let k=0;k<5;k++)ribbon(b,[[-0.6,-0.15],[-1.1-k*0.25,-0.35-k*0.08],[-2.6-k*0.12,-0.1+k*0.23],[-3.2,-0.3+k*0.20]],0.075,0.11,detail);
    for(const x of [0.02,0.36])ribbon(b,[[x,-0.02],[x-0.15,-0.53],[x+0.12,-0.66]],0.025,0.06,detail);
  }
  for(const [x,y,r]of [[-3.1,0.48,0.21],[-1.8,-0.6,0.17],[0.15,0.68,0.18],[1.55,-0.53,0.23],[3.25,0.63,0.18]])cloud(b,x,y,r,detail);
  return b.geometry();
}

export function addFrieze(group,platforms,frieze,material,lod) {
  if(lod===2)return;
  const entries=[[],[]];
  const shear=new THREE.Matrix4().set(1,0,0,0,0,1,0,0,0,-0.08,1,0,0,0,0,1);
  for(const p of platforms) {
    const halfW=p.width/2-p.batter*frieze.centerY,halfD=p.depth/2-p.batter*frieze.centerY;
    for(const [angle,span,dx,dz]of [[0,halfW*2,0,halfD],[Math.PI,halfW*2,0,-halfD],[Math.PI/2,halfD*2,halfW,0],[-Math.PI/2,halfD*2,-halfW,0]]) {
      const n=Math.max(1,Math.round(span/8)),length=(span-0.4)/n;
      const base=new THREE.Matrix4().makeRotationY(angle).setPosition(p.center[0]+dx,frieze.centerY,p.center[2]+dz);
      for(let i=0;i<n;i++) {
        const m=base.clone().multiply(new THREE.Matrix4().makeTranslation(-span/2+(i+0.5)*span/n,0,0.10)).multiply(shear).scale(new THREE.Vector3(length/8,frieze.height/2.05,1));
        entries[i%2].push(m);
      }
    }
  }
  for(let i=0;i<2;i++) {
    const mesh=new THREE.InstancedMesh(reliefMotif(i?'phoenix':'dragon',lod===0),material,entries[i].length);
    entries[i].forEach((m,j)=>mesh.setMatrixAt(j,m));mesh.instanceMatrix.needsUpdate=true;
    mesh.name=i?'stone-phoenix-and-clouds':'stone-dragon-and-clouds';mesh.castShadow=mesh.receiveShadow=true;
    mesh.computeBoundingSphere();group.add(mesh);
  }
}
