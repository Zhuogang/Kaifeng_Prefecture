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

export function buildWillow({ seed = 'willow', height = 9, rng = new RNG(seed) } = {}) {
  const wood = color('#796f54'), leaf = color('#8c9c39'), h = height;
  const trunk = [V(),V(-0.035*h,0.12*h,0.02*h),V(-0.02*h,0.28*h,-0.02*h),V(0.035*h,0.43*h,0.01*h),V(0.015*h,0.51*h,0)];
  const boughs = [], whips = [];
  for (let j = 0; j < 10; j++) {
    const a = j * TAU / 10 + rng.range(-0.22,0.22), reach = rng.range(0.23,0.39) * h;
    const start = trunk[3 + j % 2].clone();
    const tip = V(Math.cos(a)*reach, h*rng.range(0.77,0.96),Math.sin(a)*reach);
    const middle = mix(start,tip,0.55).add(V(0,h*0.09,0));
    boughs.push([start,middle,tip]);
    for (let k = 0; k < 22; k++) {
      const t = rng.range(0.25,1), base = mix(middle,tip,t), angle = a + rng.range(-1.25,1.25);
      const reach2 = h * rng.range(0.07,0.18), drop = h * rng.range(0.27,0.62);
      const path = [];
      for (let s = 0; s <= 8; s++) {
        const u = s / 8;
        path.push(base.clone().add(V(Math.cos(angle)*reach2*(1-Math.exp(-4*u)), h*0.08*Math.sin(u*Math.PI)-drop*u*u, Math.sin(angle)*reach2*(1-Math.exp(-4*u)))));
      }
      whips.push({ path, random: rng.random() });
    }
  }
  const gs = [new Geometry(), new Geometry(), new Geometry()];
  for (let l = 0; l < 2; l++) {
    const g = gs[l], r = rng.fork('willow-lod'+l);
    g.tube(trunk,[0.07,0.047,0.045,0.053,0.06].map(v=>v*h),wood,{ sides:l?7:16,gnarl:1,smooth:l?2:5 });
    for (let j=0;j<7;j++) {
      const a=j*TAU/7;
      g.tube([V(Math.cos(a)*h*0.13,0.015,Math.sin(a)*h*0.13), V(Math.cos(a)*h*0.045,h*0.045,Math.sin(a)*h*0.045),trunk[0].clone().add(V(0,h*0.1,0))], [h*0.009,h*0.025,h*0.035],wood,{sides:l?4:7,gnarl:0.8});
    }
    boughs.forEach((p,j)=>{
      g.tube(p,[h*0.035,h*0.021,h*0.004],wood,{sides:l?5:9,gnarl:0.8});
      if (!l) g.ellipsoid(p[0],V(h*0.055,h*0.047,h*0.05),wood,{detail:1,kind:0});
    });
    whips.forEach(({path,random},j)=>{
      if (l && j%3) return;
      g.tube(path, path.map((_,i)=>h*(0.0019-0.00165*i/8)), tint(wood,r), {sides:l?3:4,sway:1});
      const count = l?10:32;
      for(let k=0;k<count;k++) {
        const t=(k+0.3)/count*7.7, i=Math.floor(t), p=mix(path[i],path[i+1],t-i);
        const a=k*2.4+random*TAU;
        g.leaf(p,h*(l?0.043:0.025)*r.range(0.8,1.25),h*(l?0.012:0.0055),V(Math.cos(a)*0.55,-1,Math.sin(a)*0.55),tint(leaf,r),0.2+0.8*t/8,a);
      }
    });
  }
  const far=gs[2];
  far.tube([trunk[0],trunk[3]],[h*0.055,h*0.04],wood,{sides:4});
  // Opaque, three-dimensional hanging lobes; no camera-facing billboards or alpha holes.
  for(let j=0;j<4;j++) {
    const a=j*TAU/4;
    far.ellipsoid(V(Math.cos(a)*h*0.2,h*0.58,Math.sin(a)*h*0.2),V(h*0.22,h*0.37,h*0.22),leaf,{sway:0.6});
  }
  return result(gs,h,'willow');
}

export function buildBlossom({ seed = 'blossom', species = 'peach', height = 6, rng = new RNG(seed) } = {}) {
  const sp=BLOSSOMS[species];
  if(!sp) throw new Error('Unknown blossom species: '+species);
  const h=height, wood=color(sp.bark), petal=color(sp.color), green=color('#839447');
  const trunk=[V(),V(h*0.02,h*0.18,0),V(-h*0.025,h*0.35,h*0.015)];
  const branches=[], twigs=[];
  for(let j=0;j<7;j++) {
    const a=j*2.399+rng.range(-0.25,0.25), reach=h*sp.spread*rng.range(0.65,1);
    const tip=V(Math.cos(a)*reach,h*rng.range(0.57,0.80),Math.sin(a)*reach);
    const mid=mix(trunk[2],tip,0.5).add(V(0,-h*0.06,0));
    branches.push([trunk[2],mid,tip]);
    for(let k=0;k<7;k++) {
      const t=(k+1)/8, base=mix(mid,tip,t), angle=a+rng.range(-1.3,1.3);
      const end=base.clone().add(V(Math.cos(angle)*h*rng.range(0.07,0.17),h*rng.range(0.08,0.18+sp.upright),Math.sin(angle)*h*rng.range(0.07,0.17)));
      twigs.push([base,mix(base,end,0.5).add(V(0,h*0.018,0)),end]);
    }
  }
  const gs=[new Geometry(),new Geometry(),new Geometry()];
  for(let l=0;l<2;l++) {
    const g=gs[l], r=rng.fork('blossoms-lod'+l);
    g.tube(trunk,[h*0.037,h*0.027,h*0.023],wood,{sides:l?5:10,gnarl:0.75});
    branches.forEach(p=>g.tube(p,[h*0.021,h*0.012,h*0.0025],wood,{sides:l?3:7,gnarl:0.4}));
    twigs.forEach((p,j)=>{
      if (!l || j%2===0) g.tube(p,[h*0.005,h*0.0025,h*0.0005],wood,{sides:l?3:4,sway:0.25});
      const count=l?2:160;
      for(let k=0;k<count;k++) {
        const t=r.range(0.18,1), q=point(r,mix(p[0],p[2],t),h*(l?0.025:0.032));
        g.flower(q, l?h*0.038:sp.flower*r.range(1.05,1.6),V(...r.sphere()),tint(petal,r),0.3+t*0.2,r.random(),l?3:0);
        if(!l && k%19===0) g.leaf(q,h*0.022,h*0.007,V(...r.sphere()),green,0.4,r.range(0,TAU));
      }
    });
  }
  const g=gs[2];
  g.tube([trunk[0],trunk[2]],[h*0.035,h*0.018],wood,{sides:4});
  for(let j=0;j<7;j++) {
    const p=branches[j][2];
    if(j%3===0) g.tube([trunk[2],p],[h*0.014,h*0.002],wood,{sides:3});
    g.ellipsoid(p.clone().add(V(0,h*0.07,0)),V(h*0.13,h*0.16,h*0.12),petal,{detail:-1,sway:0.2});
  }
  return result(gs,h,species);
}

export function buildPalaceTree({ seed = 'palace-tree', species = 'huai', height = species==='bai'?13:10, rng = new RNG(seed) } = {}) {
  if(!['huai','bai'].includes(species)) throw new Error('Unknown palace tree: '+species);
  const bai=species==='bai', h=height, wood=color(bai?'#776651':'#6f6754'), green=color(bai?'#3c5036':'#73854a');
  const trunk=[V(),V(-h*0.035,h*0.2,0),V(h*0.025,h*0.43,h*0.018),V(-h*0.03,h*0.67,-h*0.015),V(h*0.01,h*0.9,0)];
  const branches=[];
  for(let j=0;j<18;j++) {
    const a=j*2.399, t=j/18, start=bai?mix(trunk[1],trunk[4],t):trunk[1+j%3];
    const reach=h*(bai?0.25*(1-t)+0.035:0.28)*rng.range(0.75,1.25);
    const end=V(Math.cos(a)*reach,start.y+h*(bai?0.07:0.16),Math.sin(a)*reach);
    branches.push([start,mix(start,end,0.5).add(V(0,-0.035*h,0)),end]);
  }
  const gs=[new Geometry(),new Geometry(),new Geometry()];
  for(let l=0;l<2;l++) {
    const g=gs[l],r=rng.fork(species+l);
    g.tube(trunk,[0.045,0.033,0.028,0.017,0.002].map(v=>v*h),wood,{sides:l?6:12,gnarl:1});
    branches.forEach((p,j)=>{
      g.tube(p,[h*0.016,h*0.01,h*0.0015],wood,{sides:l?4:7,gnarl:0.7});
      if(l) {
        g.ellipsoid(p[2],V(h*(bai?0.10:0.17),h*(bai?0.045:0.13),h*(bai?0.09:0.16)),tint(green,r),{detail:1,sway:0.35});
      } else {
        for(let k=0;k<(bai?230:650);k++) {
          const q=point(r,p[2],h*(bai?0.105:0.16));
          const d=V(...r.sphere());
          if(bai) {
            // Flattened branching scale-leaf sprays, never a Mediterranean cypress cone.
            for(let n=0;n<3;n++) g.leaf(q.clone().addScaledVector(d,n*h*0.005),h*0.025,h*0.007,d.clone().add(V(n*0.3,0,0)),tint(green,r),0.45,j);
          } else g.leaf(q,h*0.022,h*0.01,d,tint(green,r),0.45,j);
        }
      }
    });
  }
  gs[2].tube([trunk[0],trunk[3]],[h*0.04,h*0.014],wood,{sides:4});
  for(let j=0;j<4;j++) {
    const p=bai?V(Math.sin(j*2.4)*h*0.06,h*(0.4+j*0.16),Math.cos(j*2.4)*h*0.06):V(Math.cos(j*TAU/4)*h*0.16,h*0.66,Math.sin(j*TAU/4)*h*0.16);
    gs[2].ellipsoid(p,V(h*(bai?0.19-j*0.035:0.24),h*(bai?0.16:0.23),h*(bai?0.17-j*0.03:0.24)),green,{sway:0.25});
  }
  return result(gs,h,species);
}
