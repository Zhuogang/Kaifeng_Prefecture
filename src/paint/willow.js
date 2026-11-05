import * as THREE from 'three';
import {Geometry,V} from '../flora/geometry.js';

// inferred: parameterised pollarded willow, growth-following roots and botanical
// leaf/clump dimensions. Leaves stay within 25 degrees of their strand.
  export function willowGeometry(rng, {height, hero=false, trunkPoints, branches=[]}) {
    const wood = new Geometry(), leaves = new Geometry();
    const h = height, trunk = hero ? trunkPoints.map(p=>V(...p)) :
      [V(),V(-.2,h*.16,0),V(.3,h*.33,0),V(.1,h*.46,0)];
    wood.tube(trunk, hero ? [1.15,1.02,.85,.61,.25] : [h * .052, h * .04, h * .035, h * .018], new THREE.Color('#635c50'), { sides: 10, gnarl: .6, smooth: 4 });
    if(hero){
      // inferred: irregular burls and interrupted ridges break the trunk's
      // contour without the old evenly spaced, full-length comb of tubes.
      for(let j=0;j<11;j++){
        const f=rng.range(.10,.74),segment=Math.min(3,Math.floor(f*4)),t=f*4-segment;
        const center=trunk[segment].clone().lerp(trunk[segment+1],t),axis=trunk[segment+1].clone().sub(trunk[segment]).normalize();
        const a=j*2.399,out=V(Math.cos(a),0,Math.sin(a));out.addScaledVector(axis,-out.dot(axis)).normalize();
        const radius=THREE.MathUtils.lerp([1.15,1.02,.85,.61][segment],[1.02,.85,.61,.25][segment],t);
        center.addScaledVector(out,radius*.88);
        const rotation=new THREE.Quaternion().setFromUnitVectors(V(0,1,0),axis);
        wood.ellipsoid(center,V(rng.range(.17,.30),rng.range(.28,.60),rng.range(.12,.22)),new THREE.Color('#68452c'),{detail:1,rotation});
        if(j<5){
          const begin=center.clone().addScaledVector(axis,-.45),end=center.clone().addScaledVector(axis,.65).addScaledVector(out,-.12);
          wood.tube([begin,center.clone().addScaledVector(out,.12),end],[.12,.16,.035],new THREE.Color('#65452b'),{sides:7,gnarl:.8,smooth:3});
        }
      }

      wood.tube([trunk[1],V(-.8,6.8,-1.5),V(-1.3,13,-3.0)],[.68,.43,.15],new THREE.Color('#69442b'),{sides:12,gnarl:.7,smooth:5});
      // inferred: buttressed roots spread over the quay and turn into the ground.
      for(let i=0;i<4;i++){
        const a=i*2.399,tip=V(Math.cos(a)*rng.range(1.15,1.65),-.12,Math.sin(a)*rng.range(1.1,1.55));
        wood.tube([V(Math.cos(a)*.55,.42,Math.sin(a)*.55),V(tip.x*.65,.10,tip.z*.65),tip],[.27,.17,.025],new THREE.Color('#654327'),{sides:7,gnarl:.45,smooth:3});
      }
    }
    for (let j = 0; j < (hero ? branches.length : 20); j++) {
      const angle=j*2.399,start=trunk[hero?branches[j].from:2];
      const tip=hero?V(...branches[j].tip):V(Math.cos(angle)*h*rng.range(.25,.43),h*rng.range(.66,.90),Math.sin(angle)*h*rng.range(.24,.40));
      if(!hero)tip.y=h*(.89-.27*Math.pow(Math.hypot(tip.x,tip.z)/(h*.50),2)+rng.range(-.045,.045));
      const mid = start.clone().lerp(tip, .55).add(V(0, h * .06, 0));
      wood.tube([start, mid, tip], [hero ? .26 : h * .016, hero ? .12 : h * .008, .018], new THREE.Color('#696551'), { sides: 6, gnarl: .4, smooth: 3 });
      const family=hero?branches[j].color:rng.pick(['#adb55f','#879249','#c1b65e','#667b53']);
      const clusterLength=hero?branches[j].length:h*rng.range(.57,.80);
      for (let k = 0; k < (hero ? rng.int(58,70) : 32); k++) {
        const base = mid.clone().lerp(tip,rng.range(hero?.70:.55,hero?1:1.08)).add(V(rng.range(-.7, .7), rng.range(-.4, .6), rng.range(-.8, .8)));
        const lengthVariation=rng.range(.78,1.16),end=hero?0:h*THREE.MathUtils.clamp(.15+.23*Math.pow(Math.hypot(base.x,base.z)/(h*.45),1.5)+rng.range(-.12,.12),.10,.57);
        // inferred: the mid-distance crown hangs down around its short trunk,
        // instead of stopping halfway up and exposing a palm-like bare pole.
        const length=hero?clusterLength*lengthVariation:Math.max(h*.25,base.y-end),yaw=rng.range(0,Math.PI*2);
        const path = Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          return base.clone().add(V(Math.cos(yaw) * .7 * Math.sin(t * 1.8), -length * t + .3 * Math.sin(t * Math.PI), Math.sin(yaw) * .5 * t));
        });
        const c=new THREE.Color(family).multiplyScalar(rng.range(.88,1.09));
        const clumpShade=hero?.68+.32*THREE.MathUtils.clamp((base.z-tip.z+.8)/1.6,0,1):.65+.35*THREE.MathUtils.clamp(base.y/h,0,1);
        leaves.curtain(path,rng.range(.008,.018),yaw,c,{sway:1,ao:clumpShade,random:rng.random()});
        const count=hero?rng.int(34,44):rng.int(32,42);
        for (let s = 1; s < count; s++) {
          if(rng.chance(hero?.26:.15))continue;
          const t=(s+rng.range(-.38,.38))/count,index=Math.min(7,Math.floor(t*8)),p=path[index].clone().lerp(path[index+1],t*8-index);
          const a=yaw+rng.range(-.6,.6),side=rng.chance(.5)?1:-1;
          const tangent=path[index+1].clone().sub(path[index]).normalize();
          const lateral=V(Math.cos(a),0,Math.sin(a)).addScaledVector(tangent,-V(Math.cos(a),0,Math.sin(a)).dot(tangent)).normalize();
          const direction=tangent.clone().addScaledVector(lateral,side*rng.range(.18,.43));
          p.addScaledVector(lateral,rng.range(-.035,.035));
          const taper=.58+.42*Math.sin(t*Math.PI),length=rng.range(hero?.216:.35,hero?.456:.66)*taper;
          const first=leaves.canopy.length;
          leaves.leaf(p,length,length*rng.range(.14,.23),direction,c,t,hero?-Math.PI/2+rng.range(-.8,.8):a,1);
          for(let v=first;v<leaves.canopy.length;v++)leaves.canopy[v]=clumpShade;

        }
      }
    }
    if(!hero){
      // inferred: a soft rounded inner crown connects the hanging clumps all
      // the way down the short trunk; individual whips dress its outer surface.
      for(let j=0;j<144;j++){
        const a=j*2.399,r=h*rng.range(.08,.29),center=V(Math.cos(a)*r,h*(.75-.29*Math.pow(r/(h*.32),2)+rng.range(-.035,.035)),Math.sin(a)*r);
        const size=V(h*rng.range(.045,.085),h*rng.range(.085,.145),h*rng.range(.045,.085));
        const color=new THREE.Color(rng.pick(['#738349','#8c984f','#9fa457','#657a4b']));
        leaves.ellipsoid(center,size,color,{detail:0,kind:12,sway:.10});
      }
    }
    return {wood:wood.build(),leaves:leaves.build()};
  }
