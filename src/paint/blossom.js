import * as THREE from 'three';
import {Geometry,V} from '../flora/geometry.js';
// inferred: peach/plum-like branching and pigment clusters compose c1; five
// rounded petals, small leaves, and irregular lit clumps replace spherical crowns.
function flower(g,p,r,normal,color,rng,hero){
 if(!hero){g.flower(p,r,normal,color,.12,rng.random(),5);return;}
 const n=normal.clone().normalize(),u=n.clone().cross(Math.abs(n.y)>.9?V(1,0,0):V(0,1,0)).normalize(),v=n.clone().cross(u),roll=rng.range(0,6.283);
 for(let k=0;k<5;k++){
  const a=k*Math.PI*2/5+roll,d=u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v,Math.sin(a)),side=n.clone().cross(d),center=p.clone().addScaledVector(d,r*.50);
  const shade=color.clone().multiplyScalar(rng.range(.89,1.10)),mid=g.vertex(center,n,shade,2,.13,[.5,.5],p),ring=[];
  for(let j=0;j<8;j++){const b=j/8*Math.PI*2,q=center.clone().addScaledVector(d,Math.cos(b)*r*.53).addScaledVector(side,Math.sin(b)*r*.38).addScaledVector(n,Math.sin(b)*r*.06);ring.push(g.vertex(q,n,shade,2,.13,[.5+.45*Math.cos(b),.5+.45*Math.sin(b)],p));}
  for(let j=0;j<8;j++)g.tri(mid,ring[j],ring[(j+1)%8]);
 }
 const core=new THREE.Color('#c99a4e');g.flower(p.clone().addScaledVector(n,.008),r*.13,n,core,.13,0,0);
}
export function blossomGeometry(rng,{height=7,hero=false,white=false}={}){
 const wood=new Geometry(),bloom=new Geometry(),h=height;
 const trunk=hero?[V(-1,-1,0),V(-.5,h*.21,-.6),V(1.3,h*.43,-1.6),V(6.2,h*.65,-2.1),V(13.2,h*.80,-2.8),V(21.2,h*.84,-3.2)]:[V(),V(.16,h*.28,0),V(-.4,h*.49,-.2),V(.2,h*.63,0)];
 wood.tube(trunk,hero?[1.6,1.4,1.05,.75,.40,.06]:[h*.07,h*.055,h*.035,h*.014],new THREE.Color('#48423c'),{sides:hero?12:8,gnarl:.75,smooth:5});
 const colors=white?['#f1dbc0','#f3e2ca','#dbb4a9','#fff0d3']:['#ed9d9f','#f8bab0','#db7e92','#f5c6b4'];
 for(let i=0;i<(hero?38:15);i++){
  const a=i*2.399,from=hero?trunk[Math.min(5,1+i%5)]:trunk[2],r=h*rng.range(.25,.48);
  const tip=hero?from.clone().add(V(rng.range(-2.2,3.0),rng.range(-.2,2.4),rng.range(-1.8,1.8))):V(Math.cos(a)*r,h*(.70+.17*Math.sin(i*1.7))-Math.pow(r/h,2)*h*.28,Math.sin(a)*r*.70);
  const mid=from.clone().lerp(tip,.6).add(V(.1,.6,0));wood.tube([from,mid,tip],[hero?.14:h*.02,hero?.075:h*.010,.012],new THREE.Color('#52453e'),{sides:6,gnarl:.6,smooth:3});
  for(let j=0;j<(hero?9:5);j++){
   const base=mid.clone().lerp(tip,rng.range(.25,1)),end=base.clone().add(V(rng.range(-.65,.65),rng.range(.1,.9),rng.range(-.65,.65)));
   wood.tube([base,end],[.027,.005],new THREE.Color('#483b39'),{sides:4,smooth:1});
   for(let k=0;k<(hero?12:11);k++){
    const p=end.clone().add(V(...rng.sphere()).multiplyScalar(rng.range(.06,hero?.72:.76)));
    const color=new THREE.Color(rng.pick(colors)).multiplyScalar(.83+.22*THREE.MathUtils.clamp((p.y/h-.35)/.6,0,1));
    const normal=V(rng.range(-.75,.75),rng.range(-.2,.8),rng.range(.3,1)).normalize();
    flower(bloom,p,hero?rng.range(.22,.37):rng.range(.16,.30),normal,color,rng,hero);
    if(k===0)bloom.leaf(p,.20,.10,V(.3,.5,.1),new THREE.Color('#6e8261'),.1,a,1);
   }
  }
 }
 if(hero)for(const [i,tip]of [V(1,h*1.00,-1),V(7,h*1.06,-1.6),V(15,h*1.05,-2),V(21,h*.95,-2.5)].entries()){
  const start=trunk[Math.min(4,i+1)],mid=start.clone().lerp(tip,.55).add(V(-.8,1.0,0));wood.tube([start,start.clone().lerp(mid,.6).add(V(.55,.25,.15)),mid,mid.clone().lerp(tip,.65).add(V(-.5,.2,0)),tip],[.22,.17,.12,.05,.012],new THREE.Color('#494039'),{sides:6,gnarl:.8,smooth:4});
  for(let j=0;j<7;j++){const center=mid.clone().lerp(tip,j/6);for(let k=0;k<20;k++){const p=center.clone().add(V(...rng.sphere()).multiplyScalar(rng.range(.3,1.05)));flower(bloom,p,rng.range(.24,.40),V(rng.range(-.6,.6),rng.range(-.2,.7),1),new THREE.Color(rng.pick(colors)),rng,true);}}
 }
 if(hero)for(const [i,center]of [V(2,19,0),V(5,21,-1),V(9,22,-1.5),V(12,20,-1)].entries()){
  const from=trunk[2+i%2],mid=from.clone().lerp(center,.55).add(V(-1,.7,.2));wood.tube([from,mid,center],[.12,.065,.008],new THREE.Color('#4d423b'),{sides:5,gnarl:.7,smooth:4});
  for(let k=0;k<150;k++){const p=center.clone().add(V(...rng.sphere()).multiplyScalar(rng.range(.25,2.0)));flower(bloom,p,rng.range(.25,.41),V(rng.range(-.6,.6),rng.range(-.2,.6),1),new THREE.Color(rng.pick(colors)),rng,true);}
 }
 if(hero)for(let j=0;j<16;j++){
  const f=j/15*(trunk.length-2)+1,index=Math.min(trunk.length-2,Math.floor(f)),center=trunk[index].clone().lerp(trunk[index+1],f-index).add(V(rng.range(-.8,.8),rng.range(.2,1.8),rng.range(-1,1)));
  for(let k=0;k<38;k++){const p=center.clone().add(V(...rng.sphere()).multiplyScalar(rng.range(.2,1.15)));flower(bloom,p,rng.range(.24,.40),V(rng.range(-.6,.6),rng.range(-.1,.7),1),new THREE.Color(rng.pick(colors)),rng,true);}
 }
 return {wood:wood.build(),flowers:bloom.build()};
}
export function scatteredPetals(rng,{count=220,x=[-7,14],z=[2,67],scale=1}={}){
 const g=new Geometry();for(let i=0;i<count;i++){const p=V(rng.range(...x),.075,rng.range(...z));g.leaf(p,rng.range(.065,.16)*scale,rng.range(.05,.12)*scale,V(Math.cos(i),0,Math.sin(i)),new THREE.Color(rng.pick(['#efadae','#f6c5b6','#d9959c'])),0,0,2);}
 return g.build();
}
