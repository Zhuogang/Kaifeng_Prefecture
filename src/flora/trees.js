import * as THREE from 'three';
import { RNG } from '../core/rng.js';
import { Geometry, V, mix, TAU } from './geometry.js';

// inferred: botanical dimensions, branching, albedos and leaf/flower counts below are
// procedural interpretations of T3 and the named paintings, not measured historical trees.
export const BLOSSOMS = {
  peach: { color: '#e99cae', bark: '#746454', spread: 0.43, flower: 0.032, upright: 0.1 },
  plum: { color: '#d889a4', bark: '#635a51', spread: 0.39, flower: 0.027, upright: 0.04 },
  pear: { color: '#f2eee0', bark: '#756b59', spread: 0.35, flower: 0.031, upright: 0.2 },
  apricot: { color: '#f4e5da', bark: '#79634e', spread: 0.45, flower: 0.03, upright: 0.02 },
};
const color = (s) => new THREE.Color(s);
const tint = (c, r) => c.clone().multiplyScalar(r.range(0.76, 1.15));
const point = (r, p, spread) => p.clone().add(V(...r.sphere()).multiplyScalar(r.range(0, spread)));
const result = (gs, height, species) => ({ lod0: gs[0].build(), lod1: gs[1].build(), lod2: gs[2].build(), height, species });

export function buildWillow({ seed = 'willow', height = 9, crownWidth = 1, rng = new RNG(seed) } = {}) {
  const wood = color('#796f54'), leaf = color('#9cae82'), h = height;
  const trunk = [V(),V(-0.035*h,0.12*h,0.02*h),V(-0.02*h,0.28*h,-0.02*h),V(0.035*h,0.43*h,0.01*h),V(0.015*h,0.51*h,0)];
  const boughs = [], whips = [];
  // inferred: pollard shoots arch outward and split into separate pendant whips.
  // Their lengths, attachment heights and curvature vary before any LOD is built.
  for (let j=0;j<14;j++) {
    const a=j*2.399+rng.range(-0.28,0.28),reach=h*rng.range(0.19,0.40);
    const start=mix(trunk[2],trunk[4],rng.range(0.35,1));
    const tip=V(Math.cos(a)*reach*crownWidth,h*(1.12-0.7*reach/h)*rng.range(0.88,1.04),Math.sin(a)*reach*crownWidth);
    const middle=mix(start,tip,0.55).add(V(h*rng.range(-0.03,0.03),h*0.065,h*rng.range(-0.03,0.03)));
    boughs.push([start,middle,tip]);
    for(let k=0;k<220;k++) {
      const base=mix(middle,tip,rng.range(0.05,1)).add(V(rng.range(-0.045,0.045)*h,rng.range(-0.025,0.04)*h,rng.range(-0.045,0.045)*h));
      const angle=a+rng.range(-1.7,1.7),out=h*rng.range(0.015,0.11)*Math.sqrt(crownWidth),drop=h*rng.range(0.20,0.65),curve=rng.range(0.7,1.6);
      const path=Array.from({length:6},(_,i)=>{
        const t=i/5,reach=out*(1-Math.exp(-4*t));
        return base.clone().add(V(Math.cos(angle)*reach+Math.sin(t*4.7)*h*0.007,h*0.035*Math.sin(t*Math.PI)-drop*t**curve,Math.sin(angle)*reach+Math.sin(t*3.9)*h*0.005));
      });
      whips.push({path,random:rng.random(),width:h*rng.range(0.012,0.025),yaw:rng.range(0,TAU)});
    }
  }
  const gs=[new Geometry(),new Geometry(),new Geometry()];
  for(let l=0;l<2;l++) {
    const g=gs[l],r=rng.fork('willow-lod'+l);
    g.tube(trunk,[0.07,0.047,0.045,0.053,0.049].map(v=>v*h),wood,{sides:l?7:16,gnarl:0.45,smooth:l?2:5});
    for(let j=0;j<7;j++) {
      const a=j*TAU/7;
      g.tube([V(Math.cos(a)*h*0.13,0.015,Math.sin(a)*h*0.13),V(Math.cos(a)*h*0.045,h*0.045,Math.sin(a)*h*0.045),trunk[0].clone().add(V(0,h*0.1,0))],[h*0.009,h*0.025,h*0.035],wood,{sides:l?4:7,gnarl:0.4});
    }
    boughs.forEach(p=>g.tube(p,[h*0.019,h*0.008,h*0.0012],wood,{sides:l?4:8,gnarl:0.4}));
    whips.forEach(({path,random,width,yaw},j)=>{
      // inferred: thin middle-distance whips by another eighth to keep the
      // fully planted river within the world budget; close geometry is intact.
      if(l && (j%2 || j%16===0))return;
      const normal=V(path[0].x,h*0.14,path[0].z).normalize(),ao=0.65+0.3*random,leafTint=tint(leaf,r);
      g.curtain(path,width,yaw,leafTint,{sway:0.85,random,ao,normal,kind:l?5.2:5});
      if(!l && j%6===0)g.curtain(path,width,yaw+Math.PI/2,leafTint,{sway:0.85,random,ao,normal,kind:5});
      if(!l)for(let k=0;k<2;k++) {
        const t=r.range(0.08,0.92),i=Math.min(4,Math.floor(t*5)),q=mix(path[i],path[i+1],t*5-i),a=yaw+(k?1:-1)*1.2;
        g.blade(q,h*r.range(0.008,0.014),h*0.002,V(Math.cos(a)*0.7,-0.65,Math.sin(a)*0.7),leafTint,0.85*t,a);
      }
    });
  }
  const far=gs[2];far.tube([trunk[0],trunk[3]],[h*0.055,h*0.04],wood,{sides:4});
  for(let j=0;j<4;j++) {
    const a=j*2.399;
    far.ellipsoid(V(Math.cos(a)*h*0.19*crownWidth,h*(0.57+0.035*Math.sin(j)),Math.sin(a)*h*0.19*crownWidth),V(h*0.23*crownWidth,h*(0.29+j*0.015),h*0.23*crownWidth),leaf,{sway:0.3});
  }
  return result(gs,h,'willow');
}

export function buildBlossom({ seed = 'blossom', species = 'peach', height = 6, rng = new RNG(seed) } = {}) {
  const sp=BLOSSOMS[species];
  if(!sp) throw new Error('Unknown blossom species: '+species);
  const h=height, wood=color(sp.bark), petal=color(sp.color);
  const trunk=[V(),V(h*0.02,h*0.18,0),V(-h*0.025,h*0.35,h*0.015)];
  const branches=[], sprays=[];
  // inferred: five woody orders, with flower-bearing one-year shoots throughout
  // the outer crown rather than flowers collected only at scaffold tips.
  function grow(start,dir,length,radius,depth) {
    const end=start.clone().addScaledVector(dir,length),mid=mix(start,end,0.48).add(V(rng.range(-0.025,0.025)*h,-0.018*h,rng.range(-0.025,0.025)*h));
    const branch={path:[start,mid,end],radius,depth};branches.push(branch);
    if(depth>=2) sprays.push({p:mix(mid,end,0.65),dir,depth,random:rng.random()});
    if(depth===4)return;
    const yaw=Math.atan2(dir.z,dir.x);
    for(let k=0;k<(depth===0?3:2);k++) {
      const a=yaw+(k%2?1:-1)*rng.range(0.45,1.2);
      const d=V(Math.cos(a)*rng.range(0.5,0.9),rng.range(0.4,1.0)+sp.upright,Math.sin(a)*rng.range(0.5,0.9)).normalize();
      grow(mix(mid,end,rng.range(0.45,0.98)),d,length*rng.range(0.54,0.72),radius*0.47,depth+1);
    }
  }
  for(let j=0;j<7;j++) {
    const a=j*2.399+rng.range(-0.3,0.3);
    grow(trunk[2].clone(),V(Math.cos(a),rng.range(0.6,1.1),Math.sin(a)).normalize(),h*sp.spread*rng.range(0.65,0.9),h*0.018,0);
  }
  const gs=[new Geometry(),new Geometry(),new Geometry()];
  for(let l=0;l<2;l++) {
    const g=gs[l],r=rng.fork('blossoms-lod'+l);
    g.tube(trunk,[h*0.034,h*0.024,h*0.019],wood,{sides:l?5:11,gnarl:0.35,smooth:l?1:3});
    for(const b of branches) {
      if(l && b.depth>0)continue;
      g.tube(b.path,[b.radius,b.radius*0.6,b.radius*0.19],wood,{sides:l?3:b.depth<2?6:3,smooth:l?1:2,sway:b.depth*0.06,gnarl:0.2});
    }
    sprays.forEach(s=>{
      if(l && s.depth!==3)return;
      if(l) {
        for(let k=0;k<2;k++) {
          const q=point(r,s.p,h*0.012),size=h*0.20*r.range(0.85,1.2);
          g.card(q,size,size*1.06,V(...r.sphere()),tint(petal,r),{kind:6,roll:r.range(0,TAU),sway:0.3,random:s.random,ao:0.68+r.random()*0.3});
        }
      } else {
        // inferred: individual tiny flowers occupy all five branching orders at
        // walking distance; the middle/far LODs aggregate them into alpha sprays.
        g.card(s.p,h*0.10,h*0.105,V(...r.sphere()),petal,{kind:6,roll:r.range(0,TAU),sway:0.3,random:s.random,ao:0.85});
        for(let k=0;k<76;k++) {
          const d=V(...r.sphere()),q=s.p.clone().addScaledVector(d,h*r.range(0.006,0.065));
          g.flower(q,sp.flower*r.range(0.7,1.1),d,tint(petal,r),0.3,s.random,-1);
          if(k%40===0)g.leaf(q,h*0.012,h*0.004,V(...r.sphere()),color('#9ba67d'),0.3,r.range(0,TAU));
        }
      }
    });
  }
  const g=gs[2];
  g.tube([trunk[0],trunk[2]],[h*0.032,h*0.017],wood,{sides:4});
  for(let j=0;j<10;j++) {
    const a=j*2.399,p=V(Math.cos(a)*h*0.23,h*(0.62+0.11*Math.sin(j*1.8)),Math.sin(a)*h*0.23);
    g.card(p,h*0.55,h*0.42,V(Math.cos(a),0.1,Math.sin(a)),petal,{kind:6,sway:0.2,random:j/10,ao:0.85});
  }
  return result(gs,h,species);
}

export function buildPalaceTree({ seed = 'palace-tree', species = 'huai', height = species==='bai'?13:10, rng = new RNG(seed) } = {}) {
  if(!['huai','bai'].includes(species)) throw new Error('Unknown palace tree: '+species);
  const bai=species==='bai', h=height, wood=color(bai?'#776651':'#6f6754'), green=color(bai?'#899580':'#b2bd95');
  const trunk=[V(),V(-h*0.035,h*0.2,0),V(h*0.025,h*0.43,h*0.018),V(-h*0.03,h*0.67,-h*0.015),V(h*0.01,h*0.9,0)];
  const branches=[];
  for(let j=0;j<18;j++) {
    const a=j*2.399, t=j/18, start=bai?mix(trunk[1],trunk[4],t):mix(trunk[1],trunk[2],rng.range(0.65,1));
    const reach=h*(bai?0.25*(1-t)+0.035:0.28)*rng.range(0.75,1.25);
    const end=V(Math.cos(a)*reach,bai?start.y+h*0.07:h*rng.range(0.57,0.82),Math.sin(a)*reach);
    branches.push([start,mix(start,end,0.5).add(V(0,-0.035*h,0)),end]);
  }
  const gs=[new Geometry(),new Geometry(),new Geometry()];
  for(let l=0;l<2;l++) {
    const g=gs[l],r=rng.fork(species+l);
    g.tube(trunk,[0.045,0.033,0.028,0.017,0.002].map(v=>v*h),wood,{sides:l?6:12,gnarl:1});
    branches.forEach((p,j)=>{
      g.tube(p,[h*0.016,h*0.01,h*0.0015],wood,{sides:l?4:7,gnarl:0.7});
      const radius=h*(bai?0.11:0.13)*r.range(0.8,1.15),count=l?12:54;
      for(let k=0;k<count;k++) {
        const d=V(...r.sphere()),q=p[2].clone().addScaledVector(d,radius*r.range(0.35,1));
        if(bai)q.y=p[2].y+(q.y-p[2].y)*0.42;
        const n=d.clone().add(V(0,0.35,0)).normalize(),size=radius*r.range(bai?0.85:0.9,bai?1.5:1.65);
        g.card(q,size,size*(bai?0.7:1.05),n,tint(green,r),{kind:bai?8:7,roll:r.range(0,TAU),sway:0.35,random:r.random(),ao:0.48+0.5*q.distanceTo(p[2])/radius});
        if(!l && k%6===0) {
          g.tube([mix(p[1],p[2],0.7),q],[h*0.004,h*0.0005],wood,{sides:3,smooth:1,sway:0.2});
          if(!bai)for(let n=0;n<8;n++)g.leaf(point(r,q,h*0.045),h*0.012,h*0.005,V(...r.sphere()),tint(green,r),0.45,j);
        }
      }
    });
  }
  gs[2].tube([trunk[0],trunk[3]],[h*0.04,h*0.014],wood,{sides:4});
  for(let j=0;j<10;j++) {
    const a=j*2.399,p=bai?V(Math.sin(a)*h*0.06,h*(0.35+j*0.055),Math.cos(a)*h*0.06):V(Math.cos(a)*h*0.17,h*(0.54+0.13*Math.sin(j*1.7)),Math.sin(a)*h*0.17);
    gs[2].card(p,h*(bai?0.38-j*0.018:0.5),h*(bai?0.3:0.45),V(Math.cos(a),0.1,Math.sin(a)),green,{kind:bai?8:7,sway:0.25,random:j/10,ao:0.8});
  }
  return result(gs,h,species);
}
