import * as THREE from 'three';
import {Geometry,V} from '../flora/geometry.js';
import {barkRelief} from './bark.js';

// inferred: parameterised pollarded willow, growth-following roots and botanical
// leaf/clump dimensions. Leaves stay within 25 degrees of their strand.
  export function willowGeometry(rng, {height, hero=false, trunkPoints, branches=[], distant=false,repairRng=null,pigmentRng:detailPigments=null}) {
    const wood = new Geometry(), leaves = new Geometry();
    const limbs=[],whips=[];
    const tube=(points,radii,color,options)=>{
      const start=wood.p.length/3;wood.tube(points,radii,color,options);
      if(hero)limbs.push({start,end:wood.p.length/3,points,radii,options});
    };
    const h = height, trunk = hero ? trunkPoints.map(p=>V(...p)) :
      [V(),V(-.2,h*.16,0),V(.3,h*.33,0),V(.1,h*.46,0)];
    tube(hero?[V(0,-.24,0),V(.01,.40,-.08),...trunk.slice(1)]:trunk, hero ? [1.65,1.35,1.02,.85,.61,.25] : [h * .052, h * .04, h * .035, h * .018], new THREE.Color('#635c50'), { sides: 10, gnarl: .6, smooth: 4 });
    if(hero){
      // Remove the stuck-on burls. Preserve their random draws so the accepted
      // crown and every leaf retain their positions.
      for(let j=0;j<11;j++){
        rng.range(.10,.74);rng.range(.17,.30);rng.range(.28,.60);rng.range(.12,.22);
      }
      tube([trunk[1],V(-.8,6.8,-1.5),V(-1.3,13,-3.0)],[.68,.43,.15],new THREE.Color('#69442b'),{sides:12,gnarl:.7,smooth:5});
      // inferred: buttressed roots spread over the quay and turn into the ground.
      for(let i=0;i<4;i++){
        const a=i*2.399,tip=V(Math.cos(a)*rng.range(1.65,2.20),-.20,Math.sin(a)*rng.range(1.5,2.05));
        tube([V(Math.cos(a)*.65,.38,Math.sin(a)*.65),V(tip.x*.64,.05,tip.z*.64),tip],[.42,.24,.025],new THREE.Color('#654327'),{sides:7,gnarl:.45,smooth:3});
      }
    }
    if(hero)for(let i=0;i<3;i++){
      const a=.6+i*2.15,tip=V(Math.cos(a)*2.05,-.18,Math.sin(a)*1.95);
      tube([V(Math.cos(a)*.8,.30,Math.sin(a)*.8),V(tip.x*.68,.03,tip.z*.68),tip],[.32,.19,.025],new THREE.Color('#554735'),{sides:7,gnarl:.25,smooth:3});
    }
    // inferred: a separate pigment stream interleaves dark and lit whips
    // throughout the crown, instead of assigning one value to a whole branch.
    const pigmentRng=rng.fork('D4b-whip-values');
    // W2b: independent pigment/air streams leave all accepted branch and
    // leaf positions, wind and the ground's depth proxy deterministic.
    const leafPigments=pigmentRng.fork('W2b-leaf-pigments'),air=leafPigments.fork('W2b-strand-gaps');
    // inferred: the brief's 15/40/30/15 mix, with a small exposure bias.
    const nearPalette=['#c4b359','#90965b','#99a588','#526e63'];
    // inferred: distant-bank willows keep the same drooping construction with
    // fewer whips and leaves; the accepted trees retain their original counts.
    const fineBranches=[];
    for (let j = 0; j < (hero ? branches.length : 20); j++) {
      const angle=j*2.399,start=trunk[hero?branches[j].from:2];
      const tip=hero?V(...branches[j].tip):V(Math.cos(angle)*h*rng.range(.25,.43),h*rng.range(.66,.90),Math.sin(angle)*h*rng.range(.24,.40));
      if(!hero)tip.y=h*(.89-.27*Math.pow(Math.hypot(tip.x,tip.z)/(h*.50),2)+rng.range(-.045,.045));
      const mid = start.clone().lerp(tip, .55).add(V(0, h * .06, 0));
      const branchStart=wood.p.length/3;
      tube([start, mid, tip], [hero ? .26 : h * .016, hero ? .12 : h * .008, .018], new THREE.Color('#696551'), { sides: 6, gnarl: .4, smooth: 3 });
      if(!hero)fineBranches.push([branchStart,wood.p.length/3]);
      const family=hero?branches[j].color:rng.pick(['#adb55f','#879249','#c1b65e','#667b53']);
      const clusterLength=hero?branches[j].length:h*rng.range(.57,.80);
      // inferred: lobe/whip pigment choices use a separate labelled stream.
      const lobe=detailPigments?.random()??0;
      for (let k = 0; k < (hero ? rng.int(68,80) : distant?18:28); k++) {
        const whipStart=leaves.p.length/3;
        const base = mid.clone().lerp(tip,rng.range(hero?.70:.55,hero?1:1.08)).add(V(rng.range(-.7, .7), rng.range(-.4, .6), rng.range(-.8, .8)));
        const lengthVariation=rng.range(.78,1.16),end=hero?0:h*THREE.MathUtils.clamp(.15+.23*Math.pow(Math.hypot(base.x,base.z)/(h*.45),1.5)+rng.range(-.12,.12),.10,.57);
        // inferred: the mid-distance crown hangs down around its short trunk,
        // instead of stopping halfway up and exposing a palm-like bare pole.
        const length=hero?clusterLength*lengthVariation:Math.max(h*.25,base.y-end),yaw=rng.range(0,Math.PI*2);
        const path = Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          return base.clone().add(V(Math.cos(yaw) * .7 * Math.sin(t * 1.8), -length * t + .3 * Math.sin(t * Math.PI), Math.sin(yaw) * .5 * t));
        });
        const c=new THREE.Color(hero?pigmentRng.pick(['#b7b267','#a6a36c','#8d9a68','#65764f','#c0b459']):family).multiplyScalar(rng.range(.88,1.09));
        const clumpShade=hero?.68+.32*THREE.MathUtils.clamp((base.z-tip.z+.8)/1.6,0,1):.65+.35*THREE.MathUtils.clamp(base.y/h,0,1);
        // inferred: one in five whole mid-distance whips opens a view through
        // the crown. Hidden leaves retain the accepted stone's depth proxy.
        const open=!hero&&air.chance(.20);
        const strand=new THREE.Color(hero?c:leafPigments.pick(['#bfc486','#b6bb77','#c7c58b','#a4b280']));
        leaves.curtain(path,rng.range(.008,.018),yaw,hero?c:strand,{sway:1,ao:clumpShade,random:rng.random(),kind:hero?5:open?97:93});
        const count=hero?rng.int(34,44):distant?rng.int(22,28):rng.int(32,42);
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
          // D4b: retain D4's wide spears and restore the omitted leaves.
          // The full crown consists of whips and leaf strokes, with dark gaps.
          const width=length*rng.range(.14,.23)*(hero?1.5:1.35),roll=hero?-Math.PI/2+rng.range(-.8,.8):a;
          const exposure=(clumpShade-.84)*.18;
          const pick=THREE.MathUtils.clamp(leafPigments.random()-exposure,0,.9999);
          const pigment=hero?new THREE.Color(nearPalette[pick<.15?0:pick<.55?1:pick<.85?2:3]):strand.clone();
          pigment.multiplyScalar(leafPigments.range(.94,1.06));
          if(hero)leaves.leaf(p,length,width,direction,pigment,t*.65,roll,83);
          // inferred: a two-triangle lance is sufficient at the tower trees'
          // distance, keeping the dense fringe without redundant vertices.
          else{leaves.blade(p,length,width,direction,pigment,t*.65,roll);for(let v=first;v<leaves.canopy.length;v++)leaves.data[v*3]=open?94:91;}
          for(let v=first;v<leaves.canopy.length;v++)leaves.canopy[v]=clumpShade;

        }
        if(!hero&&detailPigments)whips.push([whipStart,leaves.p.length/3,1+.90*(lobe*.45+detailPigments.random()*.55)]);
      }
    }
    // D4b: no solid inner dome. The rounded outline and all visible crown
    // surfaces come from the branching arrangement of the drooping whips.

    // inferred: small radial chips use the same elongated plate field as the
    // fragment material, with no extra silhouette meshes.
    if(hero)for(let i=0;i<wood.p.length/3;i++){
      const relief=(barkRelief(wood.uv[i*2],wood.uv[i*2+1])-.5)*.10;
      for(let k=0;k<3;k++)wood.p[i*3+k]+=wood.n[i*3+k]*relief;
    }
    // W2b: radial growth normals carry the round form. Relief moves the
    // silhouette but must not turn each little chip into a lighting plane.
    const bark=wood.build(),foliage=leaves.build(),woodDetail=new Float32Array(wood.p.length/3*4),leafDetail=[];
    // W3 omits bare fine shoots from the visible crown, while keeping the
    // accepted views and static shadow proxy. No leaf positions/RNG change.
    for(const [start,end]of fineBranches)for(let i=start;i<end;i++)woodDetail[i*4+2]=1;
    if(hero&&repairRng)for(const {start,end,points,radii,options}of limbs){
      // inferred: reuse the existing paintDetail vertex morph, as on W3's
      // ridges. Old source positions remain for the mirror, bake and views 5/6.
      // Radius varies six percent, centre by less than six (brief max eight).
      const curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),steps=(points.length-1)*options.smooth,phase=repairRng.range(0,Math.PI*2);
      for(let i=start;i<end;i++){
        const ring=Math.min(steps,Math.floor((i-start)/(options.sides+1))),t=ring/steps,j=Math.min(radii.length-2,Math.floor(ring/options.smooth)),r=THREE.MathUtils.lerp(radii[j],radii[j+1],ring/options.smooth-j);
        const center=curve.getPoint(t),p=V(...wood.p.slice(i*3,i*3+3));
        const delta=p.sub(center).multiplyScalar(.06*Math.sin(t*19+phase)).add(V(.035*r*Math.sin(t*17+phase),.03*r*Math.cos(t*21+phase),.035*r*Math.sin(t*15+phase)));
        // w>2.5 selects the fine bark; its fraction carries the limb's base radius.
        woodDetail.set([delta.x,delta.y,delta.z,3+radii[0]/4],i*4);
      }
    }
    bark.setAttribute('paintDetail',new THREE.Float32BufferAttribute(woodDetail,4));
    for(let i=0;i<leaves.p.length/3;i++)leafDetail.push(leaves.p[i*3]/h,leaves.p[i*3+1]/h,leaves.p[i*3+2]/h,hero?0:1);
    for(const [start,end,pigment]of whips)for(let i=start;i<end;i++)leafDetail[i*4+3]=pigment;
    foliage.setAttribute('paintDetail',new THREE.Float32BufferAttribute(leafDetail,4));
    return {wood:bark,leaves:foliage};
  }
