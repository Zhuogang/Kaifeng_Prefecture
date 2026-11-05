import * as THREE from 'three';
import {Geometry,V} from '../flora/geometry.js';
import {barkRelief} from './bark.js';
// inferred: peach/plum-like branching and pigment clusters compose c1; five
// rounded petals, small leaves, and irregular lit clumps replace spherical crowns.
function flower(g,p,r,normal,color,rng,hero){
 if(hero&&g.reflectionProxy&&g.reflectionIndex++%7===0)g.reflectionProxy.flower(p,r*1.2,normal,color,.10,0,0);
 if(!hero){g.flower(p,r,normal,color,.12,rng.random(),5);return;}
 if(hero&&rng.chance(.14))r*=1.65;
 const n=normal.clone().normalize(),u=n.clone().cross(Math.abs(n.y)>.9?V(1,0,0):V(0,1,0)).normalize(),v=n.clone().cross(u),roll=rng.range(0,6.283);
 for(let k=0;k<5;k++){
  const a=k*Math.PI*2/5+roll,d=u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v,Math.sin(a)),side=n.clone().cross(d),center=p.clone().addScaledVector(d,r*.50);
  const shade=color.clone().multiplyScalar(rng.range(.89,1.10)),mid=g.vertex(center,n,shade.clone().lerp(new THREE.Color('#c56d85'),.16),2,.13,[.5,.5],p),ring=[];
  for(let j=0;j<8;j++){const b=j/8*Math.PI*2,q=center.clone().addScaledVector(d,Math.cos(b)*r*.53).addScaledVector(side,Math.sin(b)*r*.38).addScaledVector(n,Math.sin(b)*r*.06);ring.push(g.vertex(q,n.clone().addScaledVector(d,Math.cos(b)*.18).addScaledVector(side,Math.sin(b)*.28).normalize(),shade,2,.13,[.5+.45*Math.cos(b),.5+.45*Math.sin(b)],p));}
  for(let j=0;j<8;j++)g.tri(mid,ring[j],ring[(j+1)%8]);
 }
 const core=new THREE.Color('#c99a4e');g.flower(p.clone().addScaledVector(n,.008),r*.13,n,core,.13,0,0);
}
export function blossomGeometry(rng,{height=7,hero=false,white=false}={}){
 const wood=new Geometry(),bloom=new Geometry(),h=height;
 if(hero){bloom.reflectionProxy=new Geometry();bloom.reflectionIndex=0;}
 const trunk=hero?[V(-1,-1,0),V(-.5,h*.21,-.6),V(1.3,h*.43,-1.6),V(6.2,h*.65,-2.1),V(13.2,h*.80,-2.8),V(21.2,h*.84,-3.2)]:[V(),V(.16,h*.18,0),V(-.2,h*.32,-.2),V(.2,h*.47,0)];
 wood.tube(trunk,hero?[1.95,1.65,1.14,.75,.40,.06]:[h*.034,h*.027,h*.019,h*.008],new THREE.Color('#48423c'),{sides:hero?16:8,gnarl:hero?.35:.75,smooth:5});
 const colors=white?['#f1dbc0','#f3e2ca','#dbb4a9','#fff0d3']:['#ed9d9f','#f8bab0','#db7e92','#f5c6b4'];
 for(let i=0;i<(hero?38:15);i++){
  const a=i*2.399,from=hero?trunk[Math.min(5,1+i%5)]:trunk[1].clone().lerp(trunk[3],(i%5)/5),r=h*rng.range(.25,.48);
  const tip=hero?from.clone().add(V(rng.range(-2.2,3.0),rng.range(-.2,2.4),rng.range(-1.8,1.8))):V(Math.cos(a)*r,h*(.70+.17*Math.sin(i*1.7))-Math.pow(r/h,2)*h*.28,Math.sin(a)*r*.70);
  const mid=from.clone().lerp(tip,.6).add(V(.1,.6,0));wood.tube([from,mid,tip],[hero?.14:h*.02,hero?.075:h*.010,.012],new THREE.Color('#52453e'),{sides:6,gnarl:.6,smooth:3});
  for(let j=0;j<(hero?9:5);j++){
   const base=mid.clone().lerp(tip,rng.range(.25,1)),end=base.clone().add(V(rng.range(-.65,.65),rng.range(.1,.9),rng.range(-.65,.65)));
   wood.tube([base,end],[.027,.005],new THREE.Color('#483b39'),{sides:4,smooth:1});
   for(let k=0;k<(hero?12:8);k++){
    const p=end.clone().add(V(...rng.sphere()).multiplyScalar(rng.range(.06,hero?.72:.76)));
    const color=new THREE.Color(rng.pick(colors)).lerp(new THREE.Color(white?'#b59a9d':'#a65370'),hero?(p.y<end.y?.30:.08):(p.y<end.y?.36:.08)).multiplyScalar(.91+.13*THREE.MathUtils.clamp((p.y/h-.35)/.6,0,1));
    const normal=V(rng.range(-.75,.75),rng.range(-.2,.8),rng.range(.3,1)).normalize();
    flower(bloom,p,hero?rng.range(.22,.37):rng.range(.14,.25),normal,color,rng,hero);
    if(k===0&&(!hero||rng.chance(.45)))bloom.leaf(p,hero?.36:.20,hero?.17:.10,V(.3,.5,.1),new THREE.Color('#6e8261'),.1,a,1);
   }
  }
 }
 if(hero)for(const [i,tip]of [V(1,h*1.00,-1),V(7,h*1.06,-1.6),V(15,h*1.05,-2),V(21,h*.95,-2.5)].entries()){
  const start=trunk[Math.min(4,i+1)],mid=start.clone().lerp(tip,.55).add(V(-.8,1.0,0));
  // inferred: short twigs stay inside the blossom; omit the long bare sky wires.
  wood.tube([mid.clone().lerp(tip,.65),tip],[.055,.008],new THREE.Color('#56443c'),{sides:5,gnarl:.3,smooth:3});
  for(let j=0;j<7;j++){const center=mid.clone().lerp(tip,j/6);for(let k=0;k<20;k++){const p=center.clone().add(V(...rng.sphere()).multiplyScalar(rng.range(.3,1.05)));flower(bloom,p,rng.range(.24,.40),V(rng.range(-.6,.6),rng.range(-.2,.7),1),new THREE.Color(rng.pick(colors)),rng,true);}}
 }
 if(hero)for(const [i,center]of [V(2,19,0),V(5,21,-1),V(9,22,-1.5),V(12,20,-1)].entries()){
  wood.tube([center.clone().add(V(-.55,-.35,.1)),center],[.045,.006],new THREE.Color('#56443c'),{sides:4,smooth:2});
  for(let k=0;k<150;k++){const p=center.clone().add(V(...rng.sphere()).multiplyScalar(rng.range(.25,2.0)));flower(bloom,p,rng.range(.25,.41),V(rng.range(-.6,.6),rng.range(-.2,.6),1),new THREE.Color(rng.pick(colors)),rng,true);}
 }
 if(hero)for(let j=0;j<16;j++){
  const f=j/15*(trunk.length-2)+1,index=Math.min(trunk.length-2,Math.floor(f)),center=trunk[index].clone().lerp(trunk[index+1],f-index).add(V(rng.range(-.8,.8),rng.range(.2,1.8),rng.range(-1,1)));
  for(let k=0;k<38;k++){const p=center.clone().add(V(...rng.sphere()).multiplyScalar(rng.range(.2,1.15)));flower(bloom,p,rng.range(.24,.40),V(rng.range(-.6,.6),rng.range(-.1,.7),1),new THREE.Color(rng.pick(colors)),rng,true);}
 }
 if(hero)for(let i=0;i<wood.p.length/3;i++){
  const relief=(barkRelief(wood.uv[i*2],wood.uv[i*2+1])-.5)*.10;
  for(let k=0;k<3;k++)wood.p[i*3+k]+=wood.n[i*3+k]*relief;
 }
 const bark=wood.build();if(hero)bark.computeVertexNormals();
 return {wood:bark,flowers:bloom.build(),reflectionFlowers:hero?bloom.reflectionProxy.build():null};
}
export function scatteredPetals(rng,{count=220,x=[-7,14],z=[2,67],scale=1}={}){
 const g=new Geometry();for(let i=0;i<count;i++){const p=V(rng.range(...x),.075,rng.range(...z));g.leaf(p,rng.range(.065,.16)*scale,rng.range(.05,.12)*scale,V(Math.cos(i),0,Math.sin(i)),new THREE.Color(rng.pick(['#efadae','#f6c5b6','#d9959c'])),0,0,2);}
 return g.build();
}

// inferred: ground petals are small curled cups, with a darker fold and a
// peach-lit rim. Their soft contact shadows share one transparent draw.
export function groundPetals(rng,{count,x,z,scale=1}={}){
 const petals=new Geometry(),shadows=new Geometry();
 for(let i=0;i<count;i++){
  const p=V(rng.range(...x),.025,rng.range(...z)),a=rng.range(0,Math.PI*2),length=rng.range(.14,.24)*scale,width=length*rng.range(.55,.82);
  const d=V(Math.cos(a),0,Math.sin(a)),s=V(-d.z,0,d.x),color=new THREE.Color(rng.pick(['#efadae','#f6c5b6','#d9959c'])),rows=[];
  for(let j=0;j<=5;j++){
   const t=j/5,w=Math.pow(Math.sin(t*Math.PI),.65)*width/2,row=[];
   for(const side of [-1,0,1]){
    const q=p.clone().addScaledVector(d,(t-.5)*length).addScaledVector(s,side*w);
    q.y+=length*(.04*Math.sin(t*Math.PI)+.20*t*t*t+.10*side*side*Math.sin(t*Math.PI));
    const pigment=color.clone().lerp(new THREE.Color(side===0?'#bb7889':'#ffe0c5'),side===0?.18:.28+t*.12);
    row.push(petals.vertex(q,V(0,1,0),pigment,81,0,[(side+1)/2,t]));
   }rows.push(row);
  }
  for(let j=1;j<rows.length;j++)for(let k=0;k<2;k++){
   petals.tri(rows[j-1][k],rows[j][k],rows[j-1][k+1]);petals.tri(rows[j-1][k+1],rows[j][k],rows[j][k+1]);
  }
  const ids=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>shadows.vertex(V(p.x+d.x*u*length*.58+s.x*v*width*.62,.012,p.z+d.z*u*length*.58+s.z*v*width*.62),V(0,1,0),new THREE.Color('#514753'),80,0,[(u+1)/2,(v+1)/2]));
  shadows.tri(ids[0],ids[2],ids[1]);shadows.tri(ids[0],ids[3],ids[2]);
 }
 const g=petals.build();g.computeVertexNormals();return {petals:g,shadows:shadows.build()};
}
