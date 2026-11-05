import * as THREE from 'three';
import {Geometry,V} from '../flora/geometry.js';
import {barkRelief} from './bark.js';
import {crownLobe} from './foliage.js';

// inferred: parameterised pollarded willow, growth-following roots and botanical
// leaf/clump dimensions. Leaves stay within 25 degrees of their strand.
  export function willowGeometry(rng, {height, hero=false, trunkPoints, branches=[]}) {
    const wood = new Geometry(), leaves = new Geometry();
    const h = height, trunk = hero ? trunkPoints.map(p=>V(...p)) :
      [V(),V(-.2,h*.16,0),V(.3,h*.33,0),V(.1,h*.46,0)];
    wood.tube(hero?[V(0,-.24,0),V(.01,.40,-.08),...trunk.slice(1)]:trunk, hero ? [1.65,1.35,1.02,.85,.61,.25] : [h * .052, h * .04, h * .035, h * .018], new THREE.Color('#635c50'), { sides: 10, gnarl: .6, smooth: 4 });
    if(hero){
      // Remove the stuck-on burls. Preserve their random draws so the accepted
      // crown and every leaf retain their positions.
      for(let j=0;j<11;j++){
        rng.range(.10,.74);rng.range(.17,.30);rng.range(.28,.60);rng.range(.12,.22);
      }
      wood.tube([trunk[1],V(-.8,6.8,-1.5),V(-1.3,13,-3.0)],[.68,.43,.15],new THREE.Color('#69442b'),{sides:12,gnarl:.7,smooth:5});
      // inferred: buttressed roots spread over the quay and turn into the ground.
      for(let i=0;i<4;i++){
        const a=i*2.399,tip=V(Math.cos(a)*rng.range(1.65,2.20),-.20,Math.sin(a)*rng.range(1.5,2.05));
        wood.tube([V(Math.cos(a)*.65,.38,Math.sin(a)*.65),V(tip.x*.64,.05,tip.z*.64),tip],[.42,.24,.025],new THREE.Color('#654327'),{sides:7,gnarl:.45,smooth:3});
      }
    }
    if(hero)for(let i=0;i<3;i++){
      const a=.6+i*2.15,tip=V(Math.cos(a)*2.05,-.18,Math.sin(a)*1.95);
      wood.tube([V(Math.cos(a)*.8,.30,Math.sin(a)*.8),V(tip.x*.68,.03,tip.z*.68),tip],[.32,.19,.025],new THREE.Color('#554735'),{sides:7,gnarl:.25,smooth:3});
    }
    for (let j = 0; j < (hero ? branches.length : 16); j++) {
      const angle=j*2.399,start=trunk[hero?branches[j].from:2];
      const tip=hero?V(...branches[j].tip):V(Math.cos(angle)*h*rng.range(.25,.43),h*rng.range(.66,.90),Math.sin(angle)*h*rng.range(.24,.40));
      if(!hero)tip.y=h*(.89-.27*Math.pow(Math.hypot(tip.x,tip.z)/(h*.50),2)+rng.range(-.045,.045));
      const mid = start.clone().lerp(tip, .55).add(V(0, h * .06, 0));
      wood.tube([start, mid, tip], [hero ? .26 : h * .016, hero ? .12 : h * .008, .018], new THREE.Color('#696551'), { sides: 6, gnarl: .4, smooth: 3 });
      const family=hero?['#c9c56a','#8fa04e','#4d6b3a','#8fa04e','#c9c56a'][j%5]:rng.pick(['#bec06a','#8fa04e','#c9c56a','#617c3d']);
      const clusterLength=hero?branches[j].length:h*rng.range(.57,.80);
      for (let k = 0; k < (hero ? rng.int(58,70) : 23); k++) {
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
        const count=hero?rng.int(34,44):rng.int(25,33);
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
          // inferred: 1.5x wider near spears; omit every eighth instead of piling
          // more alpha layers into the same whips. Preserve random draw order.
          const width=length*rng.range(.14,.23)*(hero?1.5:1.35),roll=hero?-Math.PI/2+rng.range(-.8,.8):a;
          const pigment=c.clone().multiplyScalar(hero?(.78+.22*clumpShade):1);
          if((s+j+k)%8!==0)leaves.leaf(p,length,width,direction,pigment,t*.65,roll,83);
          for(let v=first;v<leaves.canopy.length;v++)leaves.canopy[v]=clumpShade;

        }
      }
    }
    if(!hero){
      // inferred: a low domed interior is closed geometry; fewer wider
      // exterior whips give it a drooping fringe and leave the trunk visible.
      for(let j=0;j<29;j++){
        const a=j*2.399,r=h*(j===0?0:rng.range(.08,.27));
        const center=V(Math.cos(a)*r,h*(.70-.38*Math.pow(r/(h*.48),2)+rng.range(-.035,.035)),Math.sin(a)*r);
        crownLobe(leaves,center,V(h*.125,h*.145,h*.125),new THREE.Color(rng.pick(['#879849','#a4ab57','#748944','#b0b360'])),j,{kind:84,sway:.05});
      }
    }

    // inferred: small radial chips use the same elongated plate field as the
    // fragment material, with no extra silhouette meshes.
    if(hero)for(let i=0;i<wood.p.length/3;i++){
      const relief=(barkRelief(wood.uv[i*2],wood.uv[i*2+1])-.5)*.10;
      for(let k=0;k<3;k++)wood.p[i*3+k]+=wood.n[i*3+k]*relief;
    }
    const bark=wood.build();if(hero)bark.computeVertexNormals();
    return {wood:bark,leaves:leaves.build()};
  }
