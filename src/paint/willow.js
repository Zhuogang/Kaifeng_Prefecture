import * as THREE from 'three';
import {Geometry,V} from '../flora/geometry.js';

// inferred: parameterised pollarded willow, growth-following roots and botanical
// leaf/clump dimensions. Leaves stay within 25 degrees of their strand.
  export function willowGeometry(rng, {height, hero=false, trunkPoints, branches=[]}) {
    const wood = new Geometry(), leaves = new Geometry();
    const h = height, trunk = hero ? trunkPoints.map(p=>V(...p)) :
      [V(), V(-.2, h * .24, 0), V(.3, h * .48, 0), V(.1, h * .62, 0)];
    wood.tube(trunk, hero ? [1.15,1.02,.85,.61,.25] : [h * .052, h * .04, h * .035, h * .018], new THREE.Color('#635c50'), { sides: 10, gnarl: .6, smooth: 4 });
    if(hero){
      for(let j=0;j<15;j++){
        const angle=j*2.399,points=trunk.map((p,i)=>{
          const axis=trunk[Math.min(i+1,4)].clone().sub(trunk[Math.max(0,i-1)]).normalize();
          const outward=V(Math.cos(angle+i*.23),0,Math.sin(angle+i*.23));
          outward.addScaledVector(axis,-outward.dot(axis)).normalize();
          return p.clone().addScaledVector(outward,[1.12,1.01,.85,.60,.23][i]*rng.range(.93,1.05));
        });
        wood.tube(points,[.075,.07,.06,.035,.012],new THREE.Color('#6c5945'),{sides:5,gnarl:.7,smooth:4});
      }

      wood.tube([trunk[1],V(-.8,6.8,-1.5),V(-1.3,13,-3.0)],[.68,.43,.15],new THREE.Color('#69442b'),{sides:12,gnarl:.7,smooth:5});
      // inferred: buttressed roots spread over the quay and turn into the ground.
      for(let i=0;i<9;i++){
        const a=i*2.399,tip=V(Math.cos(a)*rng.range(1.3,2.2),-.12,Math.sin(a)*rng.range(1.3,2));
        wood.tube([V(0,1.0,0),V(tip.x*.45,.22,tip.z*.45),tip],[.34,.25,.035],new THREE.Color('#654327'),{sides:7,gnarl:.45,smooth:3});
      }
    }
    for (let j = 0; j < (hero ? branches.length : 12); j++) {
      const angle=j*2.399,start=trunk[hero?branches[j].from:2];
      const tip=hero?V(...branches[j].tip):V(Math.cos(angle)*h*.35,h*rng.range(.68,.98),Math.sin(angle)*h*.29);
      const mid = start.clone().lerp(tip, .55).add(V(0, h * .06, 0));
      wood.tube([start, mid, tip], [hero ? .26 : h * .016, hero ? .12 : h * .008, .018], new THREE.Color('#696551'), { sides: 6, gnarl: .4, smooth: 3 });
      const family=hero?branches[j].color:rng.pick(['#adb55f','#879249','#c1b65e','#667b53']);
      const clusterLength=hero?branches[j].length:h*rng.range(.25,.47);
      for (let k = 0; k < (hero ? rng.int(28,40) : 24); k++) {
        const base = mid.clone().lerp(tip,rng.range(hero?.70:.05,1)).add(V(rng.range(-.7, .7), rng.range(-.4, .6), rng.range(-.8, .8)));
        const length=clusterLength*rng.range(.78,1.16),yaw=rng.range(0,Math.PI*2);
        const path = Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          return base.clone().add(V(Math.cos(yaw) * .7 * Math.sin(t * 1.8), -length * t + .3 * Math.sin(t * Math.PI), Math.sin(yaw) * .5 * t));
        });
        const c=new THREE.Color(family).multiplyScalar(rng.range(.88,1.09));
        leaves.curtain(path,rng.range(.008,.018),yaw,c,{sway:1,ao:.96,random:rng.random()});
        const count=hero?rng.int(20,30):rng.int(25,36);
        for (let s = 1; s < count; s++) {
          if(rng.chance(.26))continue;
          const t=(s+rng.range(-.38,.38))/count,index=Math.min(7,Math.floor(t*8)),p=path[index].clone().lerp(path[index+1],t*8-index);
          const a=yaw+rng.range(-.6,.6),side=rng.chance(.5)?1:-1;
          const tangent=path[index+1].clone().sub(path[index]).normalize();
          const lateral=V(Math.cos(a),0,Math.sin(a)).addScaledVector(tangent,-V(Math.cos(a),0,Math.sin(a)).dot(tangent)).normalize();
          const direction=tangent.clone().addScaledVector(lateral,side*rng.range(.18,.43));
          p.addScaledVector(lateral,rng.range(-.035,.035));
          const taper=.58+.42*Math.sin(t*Math.PI),length=rng.range(hero?.36:.42,hero?.76:.80)*taper;
          leaves.leaf(p,length,length*rng.range(.14,.23),direction,c,t,hero?-Math.PI/2+rng.range(-.8,.8):a,1);

        }
      }
    }
    return {wood:wood.build(),leaves:leaves.build()};
  }
