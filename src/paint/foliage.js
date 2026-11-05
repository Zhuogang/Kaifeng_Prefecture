import * as THREE from 'three';
import {Geometry,V} from '../flora/geometry.js';

// inferred: closed, softly lobed crowns replace stacked cutout cards. Their
// curved normals and quiet olive/tan loads describe volume without overdraw.
export function crownLobe(g,center,size,color,seed=0,{kind=84,sway=.04,detail=1}={}){
 const ico=new THREE.IcosahedronGeometry(1,detail),p=ico.attributes.position;
 const c=color.isColor?color:new THREE.Color(color),unique=new Map(),indices=[];
 // Share the sphere's curved vertices; non-indexed triangle copies multiply
 // vertex work in both the main scene and the reflection for no visual gain.
 for(let i=0;i<p.count;i++){
  const u=V().fromBufferAttribute(p,i),key=u.toArray().map(v=>v.toFixed(5)).join(',');
  if(unique.has(key)){indices.push(unique.get(key));continue;}
  const bump=1+.065*Math.sin(u.x*11+u.z*7+seed)*Math.sin(u.y*9-u.z*5+seed*2);
  const point=u.clone().multiply(size).multiplyScalar(bump).add(center),normal=u.clone().divide(size).normalize();
  const load=.91+.09*(u.y+1)/2+.035*Math.sin(u.x*6+u.z*8+seed);
  const index=g.vertex(point,normal,c.clone().multiplyScalar(load),kind,sway,[0,0],center,0,.94);unique.set(key,index);indices.push(index);
 }
 for(let i=0;i<indices.length;i+=3)g.tri(indices[i],indices[i+1],indices[i+2]);
 ico.dispose();
}

// inferred: a few overlapping round broadleaf lobes, a quiet forked trunk,
// and warm atmospheric layers stand in for the target's distant garden trees.
export function broadleafGeometry(rng,{height=8,distant=true}={}){
 const wood=new Geometry(),leaves=new Geometry(),h=height;
 wood.tube([V(),V(.1,h*.36,0),V(-.1,h*.64,0)],[h*.035,h*.024,h*.009],new THREE.Color('#756b54'),{sides:5,smooth:1,kind:90});
 for(let i=0;i<11;i++){
  const a=i*2.399,r=i===0?0:h*rng.range(.10,.24),center=V(Math.cos(a)*r,h*(.61-.07*(r/h)+rng.range(-.10,.10)),Math.sin(a)*r);
  crownLobe(leaves,center,V(h*rng.range(.14,.21),h*rng.range(.17,.24),h*rng.range(.14,.21)),new THREE.Color(rng.pick(['#a2a071','#b2a17a','#8e976f','#a8a77f'])),i+r,{kind:distant?85:84,detail:1});
 }
 return {wood:wood.build(),leaves:leaves.build()};
}
