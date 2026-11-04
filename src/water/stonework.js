import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// inferred: 12–24 mm chipped arrises, shallow tool scars and uneven dressed faces.
// Structural dimensions and the bridge's original arrangement are preserved.
export function addStoneBlock(batch,center,size,seed=0) {
  const radius=Math.min(0.022,Math.min(...size)*0.13);
  const g=new RoundedBoxGeometry(...size,1,radius),p=g.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const edge=Math.max(Math.abs(x)/(size[0]/2),Math.abs(y)/(size[1]/2),Math.abs(z)/(size[2]/2));
    const chip=(Math.sin(x*41.7+y*83.1+z*56.3+seed*11.7)*Math.sin(x*93.1-y*37.3+seed))*0.003*edge;
    p.setXYZ(i,x+Math.sign(x)*chip,y+Math.sign(y)*chip,z+Math.sign(z)*chip);
  }
  g.computeVertexNormals();batch.add(g,new THREE.Matrix4().makeTranslation(...center));g.dispose();
}

// A shaft and its capital share a single chamfered profile. This removes their hidden
// touching faces and avoids spending rounded-box subdivisions on flat stone faces.
export function addStonePier(batch,x,z,base,top,seed=0) {
  const rings=[[base,.62,.68],[top-.015,.62,.68],[top,.94,.95],[top+.165,.94,.95],[top+.18,.91,.92]];
  const p=[],idx=[];
  for(const [y,w,d] of rings) {
    const bevel=.018,outline=[[-w/2+bevel,-d/2],[w/2-bevel,-d/2],[w/2,-d/2+bevel],[w/2,d/2-bevel],
      [w/2-bevel,d/2],[-w/2+bevel,d/2],[-w/2,d/2-bevel],[-w/2,-d/2+bevel]];
    for(const [xx,zz] of outline){const chip=Math.sin(xx*37.3+zz*61.7+y*7.1+seed)*.002;p.push(x+xx+Math.sign(xx)*chip,y,z+zz+Math.sign(zz)*chip);}
  }
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<8;i++){
    const a=j*8+i,b=j*8+(i+1)%8,c=a+8,d=b+8;idx.push(a,c,b,b,c,d);
  }
  for(let i=1;i<7;i++){idx.push(0,i,i+1);const offset=(rings.length-1)*8;idx.push(offset,offset+i+1,offset+i);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);
  const flat=g.toNonIndexed();flat.computeVertexNormals();batch.add(flat);flat.dispose();g.dispose();
}
