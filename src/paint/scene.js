import * as THREE from 'three';
import {stoneBlocks,beveledBox,pierShaft,chippedQuayBlock} from './stonework.js';
import {willowGeometry} from './willow.js';
import {broadleafGeometry} from './foliage.js';
import { PaintBatch } from './batch.js';
import { paintMaterial } from './materials.js';
import { paintVisibility } from './visibility.js';
import {paintedHalls} from './halls.js';
import { goulan } from '../yingzao/ornament.js';
import { Geometry, V } from '../flora/geometry.js';
import { buildBoats } from '../water/boats.js';
import { BOAT, TOWERS, BRIDGE, QUAY, MOORING, HERO_WILLOW, MID_HALLS, WILLOWS, VIEWS } from './composition.js';

// inferred: all placements, dimensions, palettes, brush scales and botanical forms
// here compose c2 rather than reconstruct a surveyed location. The low stone beam
// bridge, Song hall rules, structural brackets and ridge ornaments reuse the sources.
export function compose(engine, time, viewAt) {
  // One conservative union per scene, independent of the selected view.
  const paths=VIEWS.map(v=>v.viewAt);
  const keep=paintVisibility(engine,paths),keepReflection=paintVisibility(engine,paths,{reflection:true});
  const rng = engine.rng('P0-painted-zhouqiao');
  const families = ['stone', 'plaster', 'timber', 'roof', 'bark', 'leaf'];
  const batches = Object.fromEntries(families.map(k => [k, new PaintBatch()]));
  const reflected = Object.fromEntries(families.map(k => [k, new PaintBatch()]));
  const { stone, timber, plaster, roof, bark, leaf } = batches;
  const block=stoneBlocks(stone,reflected.stone,rng);
  const timberColor='#c98257';
  const halls=paintedHalls(engine,batches,reflected,{timberColor,time,view0:viewAt(0,0)}),hall=halls.hall;

  // Closely set bluestone columns below a low, nearly level bridge. No arches.
  const camber=x=>.18*Math.max(0,1-(x/30)**2),deckRise=x=>BRIDGE.fall*x+camber(x);
  const bridgePoint=([x,y,z])=>[x,y+deckRise(x),z+BRIDGE.skew*x+BRIDGE.offset];
  // Every vertex follows one sweep. Previously each level block was merely
  // lifted at its centre, leaving visible steps along the falling deck.
  const drape=(geometry,matrix=new THREE.Matrix4())=>{
    const g=geometry.clone(),p=g.attributes.position,v=new THREE.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(matrix);p.setXYZ(i,...bridgePoint(v.toArray()));}
    g.computeVertexNormals();return g;
  };
  const masonryRng=engine.rng('D2b-masonry-values');
  // D3: the brief's grey-cream base; almost all variation lives in its wash.
  const masonryColor=()=>new THREE.Color('#cdbd9f').multiplyScalar(masonryRng.range(.99,1.01));
  const masonry=(p,s,ao=1,yaw=0,coping=false,kind=60,follow=false)=>{
    const {pos,angle}=block.sample(p,s,ao,yaw,coping),pigment=masonryColor();
    const source=beveledBox(s,coping?.028:.025),m=new THREE.Matrix4().makeRotationY(follow?yaw:angle);m.setPosition(...(follow?p:pos));
    const g=follow?drape(source,m):source.clone().applyMatrix4(m);
    stone.add(g,undefined,pigment,ao,0,kind);reflected.stone.add(g,undefined,pigment,ao,0,kind);g.dispose();source.dispose();
  };
  const pierRng=engine.rng('D2-pier-courses'),shafts=Array.from({length:4},(_,i)=>pierShaft(i));
  for (let x = BRIDGE.start; x <= BRIDGE.end; x += 2.6) for (const z of [-17.0, -22.5]) {
    const stretch=1+BRIDGE.fall*x/3;
    // Keep the existing scene RNG stream: new masonry has its own seed, so
    // the approved quay, foliage and distant placements retain their values.
    const original=block.sample([x,1.43*stretch,z+BRIDGE.skew*x+BRIDGE.offset],[1.22,3.10*stretch,1.04],.94);
    // inferred: the rear member is narrower and staggered, exposing paired
    // shafts rather than a continuous tan band.
    const rear=z< -20,xx=x+(rear?.80:0),width=rear?.56:1.10,h=3.10+deckRise(xx);
    const p=[xx+original.pos[0]-x,h/2-.12,z+BRIDGE.skew*xx+BRIDGE.offset],size=[width,h,1.04],color=masonryColor();
    const m=new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),original.angle),new THREE.Vector3(...size));
    // One softly broken shaft; the shared recipe supplies wandering courses,
    // avoiding both black physical gaps and hard reflected colour stripes.
    stone.add(shafts[pierRng.int(0,3)],m,color,.94,0,52);reflected.stone.box(p,size,color,.94,original.angle,false,52);
    // inferred: capital tops sit in the deck shadow; rounded arrises soften their square silhouette.
    masonry([xx,2.9,z],[rear?.75:1.2,.28,1.1],.86,0,false,37,true);
  }
  shafts.forEach(g=>g.dispose());
  for (let x = BRIDGE.start-1; x < BRIDGE.end; x += 1.35) {
    masonry([x,3.18,-19.6],[1.34,.48,6.6],.92,0,false,61,true);
    masonry([x,3.52,-19.6],[1.34,.18,6.9],1,0,true,62,true);
  }
  for(let x=BRIDGE.start-1;x<BRIDGE.end;x+=2.65)for(const z of [-16.14,-23.05]){
    const length=Math.min(2.65,BRIDGE.end-x);
    // inferred: a projecting upper cornice over a narrow recessed shadow joint
    // makes the existing two deck-beam courses legible at river level.
    for(const [y,h,depth,kind]of [[3.65,.12,.34,53],[3.43,.055,.20,56]]){
      const source=beveledBox([length-.012,h,depth],.012),m=new THREE.Matrix4().makeTranslation(x+length/2,y,z),g=drape(source,m),pigment=masonryColor();
      stone.add(g,undefined,pigment,1,0,kind);reflected.stone.add(g,undefined,pigment,1,0,kind);g.dispose();source.dispose();
    }
  }
  function railing(x0, x1, z, y, spacing = 2.65, detailed = false) {
    const railBlock=detailed?(p,s,ao=1)=>reflected.stone.box(bridgePoint(p),s,'#c6b89d',ao,0,false,64):block;
    for (let x = x0; x <= x1; x += spacing) {
      railBlock([x, y + .55, z], [.24, 1.1, .25]);
      railBlock([x, y + 1.11, z], [.33, .14, .34]);
      if (x + spacing <= x1 + .1) {
        railBlock([x + spacing / 2, y + .85, z], [spacing, .15, .16]);
        railBlock([x + spacing / 2, y + .19, z], [spacing, .15, .18], .82);
        for (const dx of [.75, 1.85]) railBlock([x + dx, y + .49, z], [.12, .52, .13], .9);
      }
    }
    if(detailed){
      const rails=goulan(engine,{path:[[x0,y,z],[x1,y,z]]});
      rails.lod1.updateMatrixWorld(true);
      // inferred: square ashlar jackets and flat caps enclose the source posts,
      // retaining their cadence and small plain finials above the two rail bars.
      const postHeight=4*.312*1.3;
      const square=beveledBox([.32,postHeight,.32],.025).translate(0,postHeight/2,0);
      const cap=beveledBox([.43,.12,.43],.025).translate(0,postHeight+.04,0);
      rails.lod1.traverse(o=>{
        if(!o.isMesh)return;
        for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
          const m=new THREE.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(i,m);
          const world=o.matrixWorld.clone().multiply(m);
          const pigment=masonryColor();
          const g=drape(o.geometry,world);stone.add(g,undefined,pigment,1,0,64);g.dispose();
          if(o.name==='wangzhu')for(const source of [square,cap]){
            const kind=source===cap?63:64,g=drape(source,world);stone.add(g,undefined,pigment,1,0,kind);reflected.stone.add(g,undefined,pigment,1,0,kind);g.dispose();
          }
        }
      });
      square.dispose();cap.dispose();
      for(const lod of [rails.lod0,rails.lod1])lod.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
      for(let x=x0;x<x1;x+=7*.312){
        const width=Math.min(7*.312,x1-x)-.34;if(width<=0)continue;
        const source=beveledBox([width,.47,.12],.018),m=new THREE.Matrix4().makeTranslation(x+width/2+.17,y+.56,z),g=drape(source,m);
        const pigment=masonryColor();stone.add(g,undefined,pigment,1,0,54);reflected.stone.add(g,undefined,pigment,1,0,54);g.dispose();source.dispose();
      }
    }
  }
  railing(BRIDGE.start-1, BRIDGE.end, -16.15, 3.64,2.65,true);
  railing(BRIDGE.start-1, BRIDGE.end, -23, 3.64,2.65,true);

  // Far bank stone courses and its warm upper promenade.
  // inferred: a low bank recessed behind the span exposes the intervening
  // water. Keep the full-height promenade to either side of this sightline.
  // inferred: the right quay meets the front of the bridge instead of leaving
  // an exposed pale strip between its recessed face and the bridge end.
  for(const [x,width,height,z,depth]of [[-54.5,61,3,-42.8,24],[60.5,49,3,-38.65,32.3],[6,60,.9,-72,24]]){
    const g=new THREE.BoxGeometry(width,height,depth),p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const xx=p.getX(i)+x;p.setXYZ(i,xx,p.getY(i)+height/2,p.getZ(i)+z+(height>1?BRIDGE.skew*xx:0));
    }
    // inferred: the full-height body follows the ashlar's slanted bank line,
    // keeping the right-hand courses in front of the promenade volume.
    g.computeVertexNormals();plaster.add(g,undefined,'#c5ad87',1,0,66);reflected.plaster.add(g,undefined,'#c5ad87',1,0,66);g.dispose();
  }
  for (let row = 0; row < 5; row++) for (let i = 0; i < 62; i++) {
    const x = -80 + i * 2.65 + (row % 2) * 1.325;
    const underSpan=x>BRIDGE.start-3&&x<BRIDGE.end+3;
    const right=x>=BRIDGE.end+3,bankZ=right?-22.1:-30.2;
    masonry([x, underSpan?.10+row*.18:.4+row*.66, (underSpan?-60:bankZ)+BRIDGE.skew*x], [2.61,underSpan?.16:.64,1.1], row===0?.68:1,0,false,65);
  }
  // inferred: coursed stone continues around the bridge end to the water;
  // a narrow projecting coping covers the promenade's front edge.
  const bankJoin=BRIDGE.end+1.3;
  masonry([bankJoin,1.65,-22.1+BRIDGE.skew*bankJoin],[2.6,3.3,1.1],1,0,false,65);
  for(let x=BRIDGE.end+1.33;x<85;x+=2.65)masonry([x,3.43,-22.1+BRIDGE.skew*x],[2.63,.22,1.28],1,0,true,63);


  function tower(x, z, scale) {
    const m = new THREE.Matrix4().makeScale(scale, scale, scale); m.setPosition(x, 3.6, z);
    const box = (batch, p, s, c, ao = 1) => {
      const g = new THREE.BoxGeometry(...s); g.translate(...p); batch.add(g,m,c,ao,0,batch===plaster?11:null);
      const family=Object.keys(batches).find(k=>batches[k]===batch);reflected[family].add(g,m,c,ao,0,batch===plaster?11:null);g.dispose();
    };
    for (const sign of [-1, 1]) {
      box(stone, [sign * 4.8, .25, 0], [3.1, .5, 7.8], '#c6bba5');
      box(plaster,[sign*4.75,3,0],[3.0,5.7,6.5],'#dfbb88');
      // inferred: a deep, flat-lintelled passage with warm reflected light.
      box(plaster,[sign*3.23,2.65,-1.1],[.12,5.25,4.6],'#7c573b',.86);
      for (const dz of [-3.5, 3.5]) box(timber, [sign * 3.65, 3.1, dz], [.65, 6.2, .7], timberColor);
      box(timber, [sign * 6.1, 3.1, 3.5], [.5, 6.2, .55], '#a85437');
    }
    box(timber, [0, 6.1, 0], [13, .66, 7.8], '#b56c44');
    box(timber,[0,5.55,-.3],[6.4,.35,6.7],'#523c2f',.62);
    box(timber, [0, 5.6, 3.45], [7.4, .48, .8], '#a96748', .85);
    // inferred: larger ashlar facing and a tall flat timber reveal frame retain
    // the approved tan base and vermilion posts while giving the doorway depth.
    const facingRng=engine.rng(`D2-tower-facing-${x}-${z}`);
    for(const sign of [-1,1])for(let row=0;row<8;row++)for(let col=0;col<3;col++){
      const center=[sign*(3.78+col*.95),.64+(row+.5)*.63,3.31];
      const g=new THREE.BoxGeometry(.93,.61,.13),mm=new THREE.Matrix4().makeTranslation(...center);
      const pigment=new THREE.Color('#d0b18a').multiplyScalar(facingRng.range(.96,1.04));
      stone.add(g,m.clone().multiply(mm),pigment,1,0,55);g.dispose();
    }
    for(const sign of [-1,1])box(timber,[sign*3.12,2.78,3.42],[.20,5.50,.38],'#523c2f',.8);
    box(timber,[0,5.48,3.42],[6.44,.24,.38],'#523c2f',.8);
    hall([x, 3.6 + 6.35 * scale, z], scale, true);
    // Open balcony: broad structural accents instead of miniature balusters.
    for (const dz of [-4.0, 4.0]) {
      box(timber, [0, 7.45, dz], [13.5, .17, .19], '#cc8756');
      box(timber, [0, 6.75, dz], [13.5, .14, .18], '#d79360');
      for (let xx = -6.5; xx <= 6.5; xx += .85){
        box(timber, [xx, 7.08, dz], [.12, 1.05, .13], '#b66c45');
        box(timber,[xx,7.65,dz],[.20,.10,.21],'#c48458');
      }
    }
  }
  for(const t of TOWERS)tower(...t);
  for(const [x,z,scale]of MID_HALLS)
    hall([x, 3.5, z], scale);
  // inferred: three additional source-built halls form a layered cluster
  // left of the towers; the nearer two retain actual filtered tile rows.
  for(const [x,y,z,scale]of [[-30,5.2,-38,.73],[-17,6.2,-50,.70],[-3,5.5,-61,.67]])hall([x,y,z],scale,false,z< -55);
  // inferred: layered low roofs fill the interval between the painted skyline
  // and the landmark towers; their silhouettes remain real parallax geometry.
  const distanceRng=engine.rng('P1-mid-distance');
  for(let layer=0;layer<3;layer++)for(let i=0;i<9;i++){
    hall([-58+i*14+distanceRng.range(-3,3),3.8+layer*.5,-42-layer*17-distanceRng.range(0,6)],distanceRng.range(.42,.78),false,true);
  }

  // inferred: the foreground coping follows c2's diagonal, while the older
  // retaining wall behind the trunk runs into the near end of the bridge.
  const quayYaw=Math.atan(QUAY.slope),cq=Math.cos(quayYaw),sq=Math.sin(quayYaw),nearRng=engine.rng('D3-quay-stones');
  const nearStone=(p,s,kind=74,yaw=0)=>{
    const seed=p[0]*11+p[2]*17,g=kind===73||kind===75?chippedQuayBlock(s,seed):beveledBox(s,.04,seed),m=new THREE.Matrix4().makeRotationY(yaw);m.setPosition(...p);
    const color=new THREE.Color('#cdbd9f').multiplyScalar(nearRng.range(.98,1.02));
    stone.add(g,m,color,1,0,kind);reflected.stone.add(g,m,color,1,0,kind);g.dispose();
  };
  const long=38/cq,center=6/cq;
  nearStone([QUAY.intercept+sq*center-cq*.14,.64,cq*center+sq*.14],[.75,1.28,long],74,quayYaw);
  // One flat bed, with large painted slab joints; the former small paving
  // boxes added geometry while their short repeated edges dominated the view.
  nearStone([QUAY.intercept+sq*center-cq*8,1.20,cq*center+sq*8],[16,.19,long],70,quayYaw);
  for(let v=-13/cq;v<25/cq;v+=1.18)nearStone([QUAY.intercept+sq*v,1.43,cq*v],[.76,.32,1.15],73,quayYaw);
  for(let iz=0;iz<12;iz++){
    const z=-17+iz*1.12;
    if(iz===0)nearStone([-14,.94,-10.8],[1.0,1.88,13.5],74);
    nearStone([-14.0,2.0,z],[1.15,.28,1.10],73);
  }
  // Source-based post/rail cadence, with a quieter strip below its coping.
  for(let i=0;i<7;i++){
    const z=-17+i*1.96;
    nearStone([-14.0,2.55,z],[.24,1.0,.25],64);
    nearStone([-14.0,3.10,z],[.34,.12,.35],63);
    if(i<6){nearStone([-14.0,2.85,z+.98],[.17,.15,1.96],64);nearStone([-14.0,2.28,z+.98],[.18,.16,1.96],64);}
  }

  // Reuse the continuous plank hull and rope geometry, then repaint it in the
  // same world-anchored language. Its helper's small berth is omitted here.
  const boat = buildBoats(engine, { center: [0, 0, 0], width: 26, waterY: 0,
    boats: [BOAT] });
  boat.updateMatrixWorld(true);
  boat.traverse(o => {
    if (o.name === 'solid-plank-hulls') {timber.add(o.geometry,o.matrixWorld,'#756a59',.80,0,9);reflected.timber.add(o.geometry,o.matrixWorld,'#756a59',.80,0,9);}
  });
  engine.scene.remove(boat);
  boat.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  // inferred: a dark watertight liner behind the separated bottom boards keeps
  // the distant sky from appearing as bright pinholes through their seams.
  const lining=new THREE.Shape();
  for(const side of [-1,1])for(let i=0;i<=32;i++){
    const s=side<0?-1+i/16:1-i/16;
    const x=s*BOAT.length/2,z=side*BOAT.width*.5*(1-.72*Math.abs(s)**3)*.60;
    if(side<0&&i===0)lining.moveTo(x,z);else lining.lineTo(x,z);
  }
  lining.closePath();
  const liner=new THREE.ShapeGeometry(lining).rotateX(-Math.PI/2).translate(0,-.265,0);
  const boatMatrix=new THREE.Matrix4().makeRotationY(BOAT.yaw);boatMatrix.setPosition(...BOAT.position);
  timber.add(liner,boatMatrix,'#3e3326',.65,0,9);reflected.timber.add(liner,boatMatrix,'#3e3326',.65,0,9);liner.dispose();
  // inferred: thicker weathered thwarts and curved ribs cover the source's
  // very slim members, while preserving the accepted hull and berth placement.
  for(const s of [-.63,-.22,.22,.63]){
    const width=BOAT.width*(1-.72*Math.abs(s)**3)*.89;
    const seat=new THREE.BoxGeometry(.30,.145,width).translate(s*BOAT.length/2,.27+.18*Math.abs(s)**3,0);
    timber.add(seat,boatMatrix,'#82715a',.85,0,78);reflected.timber.add(seat,boatMatrix,'#82715a',.85,0,78);seat.dispose();
  }
  // inferred: a worn, gently rounded lip catches the same warm dapple as the
  // hull, with continuous strakes retained below it.
  for(const side of [-1,1])for(let j=0;j<40;j++){
    const point=s=>V(s*BOAT.length/2,.47+.18*Math.abs(s)**3,side*BOAT.width*.5*(1-.72*Math.abs(s)**3));
    const a=point(-1+j/20),b=point(-1+(j+1)/20),d=b.clone().sub(a);
    const g=beveledBox([.11,d.length()+.012,.10],.018),m=new THREE.Matrix4().compose(a.add(b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()),V(1,1,1));
    timber.add(g,boatMatrix.clone().multiply(m),'#9c8059',.9,0,77);reflected.timber.add(g,boatMatrix.clone().multiply(m),'#9c8059',.9,0,77);g.dispose();
  }
  const ribs=new Geometry();
  for(let i=-3;i<=3;i++)for(const side of [-1,1]){
    const s=i/4,x=s*BOAT.length/2,w=BOAT.width*.5*(1-.72*Math.abs(s)**3),y=.18*Math.abs(s)**3;
    ribs.tube([V(x,-.18+y,0),V(x,-.15+y,side*w*.55),V(x,.38+y,side*w*.94)],
      [.055,.06,.04],new THREE.Color('#77634e'),{sides:5,smooth:2});
  }
  const ribGeometry=ribs.build();timber.add(ribGeometry,boatMatrix,'#ffffff',.76,0,78);reflected.timber.add(ribGeometry,boatMatrix,'#ffffff',.76,0,78);ribGeometry.dispose();
  const [mx,my,mz]=MOORING.position;
  for(const [y,h]of [[.215,.63],[.845,.61]])nearStone([mx,my+y,mz],[MOORING.width,h,MOORING.width],75);
  const tieX = -BOAT.length * .37, tieZ = BOAT.width * .36;
  const tie = V(BOAT.position[0] + Math.cos(BOAT.yaw)*tieX + Math.sin(BOAT.yaw)*tieZ,
    .52, BOAT.position[2] - Math.sin(BOAT.yaw)*tieX + Math.cos(BOAT.yaw)*tieZ);
  // inferred: two irregular hemp turns hug the chipped post before the sag.
  const wrap=[];
  for(let i=0;i<=80;i++){
    const a=i/80*Math.PI*4.3,r=MOORING.width*.55/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));
    wrap.push(V(mx+Math.cos(a)*r,my+.60+i/80*.12,mz+Math.sin(a)*r));
  }
  // inferred: three actual hemp strands twist around one transported centre
  // curve; its pitch is large enough to remain legible in the near crop.
  const cord=(curve,radius,steps)=>{
    const g=new Geometry(),points=curve.getPoints(steps),frame=curve.computeFrenetFrames(steps,false),length=curve.getLength();
    for(let strand=0;strand<3;strand++){
      const path=points.map((p,i)=>{const a=i/steps*length/.16*Math.PI*2+strand*Math.PI*2/3;return p.clone().addScaledVector(frame.normals[i],Math.cos(a)*radius*.48).addScaledVector(frame.binormals[i],Math.sin(a)*radius*.48);});
      g.tube(path,path.map(()=>radius*.48),new THREE.Color(['#9d8b67','#b19d75','#8e7b59'][strand]),{sides:5,smooth:1});
    }
    const geometry=g.build();timber.add(geometry,undefined,'#ffffff',1,0,76);geometry.dispose();
  };
  cord(new THREE.CatmullRomCurve3(wrap),.044,144);
  const ropeStart=V(mx+.3,my+.70,mz-.12),sag=ropeStart.clone().lerp(tie,.5);sag.y=.62;
  const rope=new THREE.CatmullRomCurve3([ropeStart,sag,tie]);
  cord(rope,.058,128);

  const relocationRanges=new Map(),heroRanges=new Map();
  function addWillow(x,z,height,hero=false,move=false){
    const rng=engine.rng(`P2-willow-${x}-${z}`),place=new THREE.Matrix4().makeTranslation(x,hero?HERO_WILLOW.position[1]:3.7,z);
    const starts=move||hero?new Map([bark,leaf,reflected.bark,reflected.leaf].map(b=>[b,b.p.length/3])):null;
    const g=willowGeometry(rng,{height,hero,trunkPoints:HERO_WILLOW.trunk,branches:HERO_WILLOW.branches});
    bark.add(g.wood,place);leaf.add(g.leaves,place);reflected.bark.add(g.wood,place);
    if(!hero){
      const crown=new Geometry();
      for(let j=0;j<9;j++){
        const a=j*2.399;crown.ellipsoid(V(Math.cos(a)*height*.19,height*(.48+.06*Math.sin(j)),Math.sin(a)*height*.19),
          V(height*.20,height*.40,height*.20),new THREE.Color(j%2?'#829267':'#a6a76c'),{sway:.2});
      }
      const cg=crown.build();reflected.leaf.add(cg,place);cg.dispose();
    }
    if(move)for(const [batch,start]of starts)relocationRanges.set(batch,[start,batch.p.length/3]);
    if(hero)for(const [batch,start]of starts)heroRanges.set(batch,[start,batch.p.length/3]);
    g.wood.dispose();g.leaves.dispose();
  }
  addWillow(HERO_WILLOW.position[0],HERO_WILLOW.position[2],HERO_WILLOW.height,true);
  for(const [i,[x,z,h]]of WILLOWS.entries()) addWillow(x,z,h,false,i===2);
  for(let i=0;i<30;i++){
    const x=-66+i*4.8+distanceRng.range(-2,2),z=-48-distanceRng.range(0,37),h=distanceRng.range(4,9);
    const wood=new Geometry(),crown=new Geometry(),place=new THREE.Matrix4().makeTranslation(x,4,z);
    wood.tube([V(),V(.1,h*.55,0)],[h*.038,h*.016],new THREE.Color('#79775f'),{sides:5,smooth:1});
    for(let j=0;j<7;j++){
      const a=j*2.399,center=V(Math.cos(a)*h*.18,h*(.63+.10*Math.sin(j)),Math.sin(a)*h*.18);
      const color=new THREE.Color(distanceRng.pick(['#a5a77c','#929d7c','#b4af7d','#879d8b']));
      crown.ellipsoid(center,V(h*.22,h*.24,h*.20),color,{kind:3});
      for(let k=0;k<16;k++)crown.leaf(center.clone().add(V(...distanceRng.sphere()).multiplyScalar(h*.2)),h*.055,h*.016,V(distanceRng.range(-.4,.4),-1,.2),color,.2,a);
    }
    const wg=wood.build(),lg=crown.build();bark.add(wg,place);leaf.add(lg,place);reflected.bark.add(wg,place);reflected.leaf.add(lg,place);wg.dispose();lg.dispose();
  }

  // inferred: round tan/olive broadleaf crowns sit between the new roofs,
  // in two warm atmospheric layers rather than another willow curtain.
  for(const [i,p]of [[-34,4,-46,8.5],[-23,4,-53,10],[-12,4,-61,9],[-4,4,-69,11],[-40,4,-65,12],[-28,4,-78,13]].entries()){
    const g=broadleafGeometry(engine.rng(`D4-river-grove-${i}`),{height:p[3]}),m=new THREE.Matrix4().makeTranslation(...p.slice(0,3));
    bark.add(g.wood,m);leaf.add(g.leaves,m);reflected.leaf.add(g.leaves,m);g.wood.dispose();g.leaves.dispose();
  }

  // inferred: small composed additions, one merged call per affected view.
  // They never enter the mirror scene or the approved opening view.
  const dressing=(batch,index,name)=>{
    const mesh=batch.mesh(paintMaterial(time,'stone'),name);mesh.userData.paintView=index;mesh.visible=false;
    (engine.registry.paint.viewDressing??=[]).push(mesh);engine.add(mesh,{castShadow:false,receiveShadow:false});
  };
  const below=new PaintBatch();
  for(let x=-19;x<34;x+=2.6){
    const g=drape(beveledBox([.43,.30,6.5],.035),new THREE.Matrix4().makeTranslation(x,2.78,-19.6));
    below.add(g,undefined,'#a39880',1,0,92);g.dispose();
  }
  // Broad foundation piers carry each visible tower's masonry to the water.
  for(const [x,z,s]of TOWERS)for(const sign of [-1,1])
    below.box([x+sign*4.8*s,1.75,z],[3.1*s,3.6,7.8*s],'#b4a488',1,0,true,65);
  dressing(below,5,'view6-cross-beams-and-tower-foundations');
  const treeBank=new PaintBatch();
  // The displaced root terminates on an ashlar ledge and two water piles.
  treeBank.box([18.71,3.35,-33.37],[3,.34,2.6],'#b4a488',1,0,true,65);
  for(const x of [17.85,19.57])treeBank.box([x,1.58,-33.37],[.65,3.16,1.8],'#a99e85',1,0,true,52);
  dressing(treeBank,3,'view4-willow-bearing');

  const above=new PaintBatch(),extraBatches=Object.fromEntries(families.map(k=>[k,above]));
  const unused=Object.fromEntries(families.map(k=>[k,new PaintBatch()]));
  const extraHalls=paintedHalls(engine,extraBatches,unused,{time,view0:viewAt(0),timberColor});
  for(const [x,z,s]of [[55,-37,.56],[68,-48,.64],[48,-54,.53]])extraHalls.hall([x,3.5,z],s,false,true);
  extraHalls.dispose();
  for(const [i,[x,z,h]]of [[52,-41,8],[63,-35,7],[77,-53,10],[43,-48,9]].entries()){
    const g=broadleafGeometry(engine.rng(`V1-above-grove-${i}`),{height:h}),m=new THREE.Matrix4().makeTranslation(x,3,z);
    // Shared material: quiet crown shading has a dedicated tag in this batch.
    g.leaves.setAttribute('paintPart',new THREE.Float32BufferAttribute(new Float32Array(g.leaves.attributes.position.count).fill(95),1));
    above.add(g.wood,m);above.add(g.leaves,m);g.wood.dispose();g.leaves.dispose();
  }
  // Sparse drooping whips cover the exposed distal half of the hero limb.
  const whips=new Geometry(),whipRng=engine.rng('V1-hero-limb-whips');
  const limbStart=V(...HERO_WILLOW.trunk[4]),limbTip=V(...HERO_WILLOW.branches.at(-1).tip);
  const limbMid=limbStart.clone().lerp(limbTip,.55).add(V(0,HERO_WILLOW.height*.06,0));
  const limb=new THREE.CatmullRomCurve3([limbStart,limbMid,limbTip]);
  for(let i=0;i<52;i++){
    const t=whipRng.range(.02,.99),base=limb.getPoint(t).add(V(whipRng.range(-.06,.06),whipRng.range(-.03,.03),whipRng.range(-.08,.08)));
    const length=whipRng.range(2.2,4.6),yaw=whipRng.range(-1,1),path=Array.from({length:7},(_,j)=>base.clone().add(V(Math.sin(j/6*2+yaw)*j/6*.40,-length*j/6,j/6*.24)));
    const pigment=new THREE.Color(whipRng.pick(['#a7a563','#8c995f','#b5ad67']));
    whips.curtain(path,.008,yaw,pigment,{sway:.6,ao:.85,kind:95});
    for(let j=1;j<35;j++){
      const f=(j+whipRng.range(-.3,.3))/35*6,k=Math.min(5,Math.floor(f)),p=path[k].clone().lerp(path[k+1],f-k);
      whips.leaf(p,whipRng.range(.25,.43),whipRng.range(.08,.13),V(j%2?.22:-.22,-1,.08),pigment,.3,-Math.PI/2+whipRng.range(-.8,.8),95);
    }
  }
  const wg=whips.build();above.add(wg,new THREE.Matrix4().makeTranslation(...HERO_WILLOW.position));wg.dispose();
  dressing(above,6,'view7-roofs-grove-and-limb-whips');

  // inferred: a lower, broken bank and an overlapping distance grove keep
  // the east horizon quiet. The same cheap trunk/crowns/sparse leaves used
  // above replace the far willows; low lobes close the sky below the crowns.
  const bank=new PaintBatch(),bankMirror=new PaintBatch();
  const bankRng=engine.rng('V1c-distance-bank');
  for(const batch of [bank,bankMirror]){
    batch.box([74,.69,-20],[20,1.38,250],'#b7aa8e',1,0,false,0);
  }
  for(let z=-145;z<105;){
    const length=Math.min(105-z,bankRng.range(11,19)),h=bankRng.range(1.10,1.65);
    for(const batch of [bank,bankMirror]){
      batch.box([65,h/2,z+length/2],[2,h,length],'#bdb298',1,0,false,65);
      batch.box([64.9,h+.04,z+length/2],[2.3,.12,length-.02],'#cdbb9b',1,0,false,63);
    }
    z+=length;
  }
  const bankHalls=paintedHalls(engine,Object.fromEntries(families.map(k=>[k,bank])),
    Object.fromEntries(families.map(k=>[k,bankMirror])),{time,view0:VIEWS[4].viewAt(),timberColor});
  // inferred: unevenly spaced roofs of different sizes sit down into the
  // treeline, so that only their upper slopes rise above the crowns.
  const bankRoofs=[[78,-65,.9],[80,-14,1.1],[83,-4,.8],[79,30,.95]];
  for(const [x,z,s]of bankRoofs)bankHalls.hall([x,1.40,z],s,false,true);
  bankHalls.dispose();
  for(let z=-145;z<106;z+=bankRng.range(3.2,4.8)){
    const x=bankRng.range(67,73),wood=new Geometry(),crown=new Geometry(),h=bankRng.range(5.5,8.5);
    const place=new THREE.Matrix4().makeTranslation(x,1.38,z);
    wood.tube([V(),V(.1,h*.55,0)],[h*.038,h*.016],new THREE.Color('#79775f'),{sides:5,smooth:1});
    for(let j=0;j<7;j++){
      const a=j*2.399,low=j<2,center=V(Math.cos(a)*h*.18,h*(low?.23:.63+.10*Math.sin(j)),Math.sin(a)*h*.18);
      const color=new THREE.Color(bankRng.pick(['#a5a77c','#929d7c','#b4af7d','#879d8b']));
      crown.ellipsoid(center,low?V(Math.max(h*.22,2.4),h*.26,Math.max(h*.20,2.8)):V(h*.22,h*.24,h*.20),color,{kind:3,detail:1});
      for(let k=0;k<16;k++)crown.leaf(center.clone().add(V(...bankRng.sphere()).multiplyScalar(h*.2)),h*.055,h*.016,V(bankRng.range(-.4,.4),-1,.2),color,.2,a);
    }
    const wg=wood.build(),lg=crown.build(),part=lg.attributes.aFlora;
    lg.setAttribute('paintPart',new THREE.Float32BufferAttribute(Array.from({length:part.count},(_,i)=>part.getX(i)===3?98:96),1));
    for(const batch of [bank,bankMirror]){batch.add(wg,place);batch.add(lg,place);}
    wg.dispose();lg.dispose();
  }
  const bankMeshes=[bank,bankMirror].map((batch,i)=>{
    const material=paintMaterial(time,'stone',{bank:true});material.alphaToCoverage=i===0;
    const mesh=batch.mesh(material,'views45-river-bank'+(i?'-reflection':''));mesh.userData.paintView=[3,4];mesh.visible=false;
    engine.registry.paint.viewDressing.push(mesh);return mesh;
  });
  engine.add(bankMeshes[0],{castShadow:false,receiveShadow:false});

  const relocate=(mesh,batch)=>{
    if(relocationRanges.has(batch)){
      // Wind phase is already expanded into paintWind. Reuse its unused
      // source channel for this tag without another per-vertex attribute.
      const [start,end]=relocationRanges.get(batch),data=mesh.geometry.attributes.paintData;
      for(let i=0;i<data.count;i++)data.setZ(i,i>=start&&i<end?1:0);
    }
    if(heroRanges.has(batch)){
      const [start,end]=heroRanges.get(batch),data=mesh.geometry.attributes.paintData;
      for(let i=start;i<end;i++)data.setZ(i,-1);
    }
    return mesh;
  };
  for (const k of families) engine.add(keep(relocate(batches[k].mesh(paintMaterial(time, k), 'paint-' + k),batches[k])), { castShadow: false, receiveShadow: false });
  const reflectionScene=new THREE.Scene();
  reflectionScene.add(bankMeshes[1]);
  for(const k of families){const material=paintMaterial(time,k,{reflection:true});material.alphaToCoverage=false;reflectionScene.add(keepReflection(relocate(reflected[k].mesh(material,'reflection-'+k),reflected[k])));}
  halls.dispose();
  return reflectionScene;
}
