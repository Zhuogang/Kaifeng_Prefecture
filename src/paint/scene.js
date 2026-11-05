import * as THREE from 'three';
import {stoneBlocks,chippedPost} from './stonework.js';
import {willowGeometry} from './willow.js';
import { PaintBatch } from './batch.js';
import { paintMaterial } from './materials.js';
import {paintedHalls} from './halls.js';
import { goulan } from '../yingzao/ornament.js';
import { Geometry, V } from '../flora/geometry.js';
import { buildBoats } from '../water/boats.js';
import { BOAT, TOWERS, BRIDGE, QUAY, MOORING, HERO_WILLOW, MID_HALLS, WILLOWS } from './composition.js';

// inferred: all placements, dimensions, palettes, brush scales and botanical forms
// here compose c2 rather than reconstruct a surveyed location. The low stone beam
// bridge, Song hall rules, structural brackets and ridge ornaments reuse the sources.
export function compose(engine, time) {
  const rng = engine.rng('P0-painted-zhouqiao');
  const families = ['stone', 'plaster', 'timber', 'roof', 'bark', 'leaf'];
  const batches = Object.fromEntries(families.map(k => [k, new PaintBatch()]));
  const reflected = Object.fromEntries(families.map(k => [k, new PaintBatch()]));
  const { stone, timber, plaster, roof, bark, leaf } = batches;
  const block=stoneBlocks(stone,reflected.stone,rng);
  const timberColor='#c98257';
  const halls=paintedHalls(engine,batches,reflected,{timberColor}),hall=halls.hall;

  // Closely set bluestone columns below a low, nearly level bridge. No arches.
  const bridgePoint=([x,y,z])=>[x,y+BRIDGE.fall*x,z+BRIDGE.skew*x+BRIDGE.offset];
  for (let x = BRIDGE.start; x <= BRIDGE.end; x += 2.6) for (const z of [-17.0, -22.5]) {
    const stretch=1+BRIDGE.fall*x/3;
    // inferred: one continuous stone shaft per member of each paired bent.
    // Quiet course marks belong to its surface, rather than alternating cubes.
    block([x,1.43*stretch,z+BRIDGE.skew*x+BRIDGE.offset],[1.22,3.10*stretch,1.04],.94);
    block(bridgePoint([x, 2.9, z]), [1.2, .28, 1.1], .86);
  }
  for (let x = BRIDGE.start-1; x < BRIDGE.end; x += 1.35) {
    const camber = .18 * Math.max(0, 1 - (x / 30) ** 2);
    block(bridgePoint([x, 3.18 + camber, -19.6]), [1.34, .48, 6.6], .92);
    block(bridgePoint([x, 3.52 + camber, -19.6]), [1.34, .18, 6.9],1,0,true);
  }
  function railing(x0, x1, z, y, spacing = 2.65, detailed = false) {
    const railBlock=detailed?(p,s,ao=1)=>reflected.stone.box(bridgePoint(p),s,'#c6b89d',ao):block;
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
      const rails=goulan(engine,{path:[bridgePoint([x0,y,z]),bridgePoint([x1,y,z])]});
      rails.lod1.updateMatrixWorld(true);
      rails.lod1.traverse(o=>{
        if(!o.isMesh)return;
        for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
          const m=new THREE.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(i,m);
          stone.add(o.geometry,o.matrixWorld.clone().multiply(m),o.name==='wangzhu'?'#c0b5a3':'#b7ad9c');
        }
      });
      for(const lod of [rails.lod0,rails.lod1])lod.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
    }
  }
  railing(BRIDGE.start-1, BRIDGE.end, -16.15, 3.64,2.65,true);
  railing(BRIDGE.start-1, BRIDGE.end, -23, 3.64,2.65,true);

  // Far bank stone courses and its warm upper promenade.
  plaster.box([0, 1.5, -48], [170, 3.0, 24], '#c5ad87');
  reflected.plaster.box([0, 1.5, -48], [170, 3.0, 24], '#c5ad87');
  for (let row = 0; row < 5; row++) for (let i = 0; i < 62; i++) {
    const x = -80 + i * 2.65 + (row % 2) * 1.325;
    block([x, .4 + row * .66, -30.2+BRIDGE.skew*x], [2.61, .64, 1.1], row === 0 ? .68 : 1);
  }


  function tower(x, z, scale) {
    const m = new THREE.Matrix4().makeScale(scale, scale, scale); m.setPosition(x, 3.6, z);
    const box = (batch, p, s, c, ao = 1) => {
      const g = new THREE.BoxGeometry(...s); g.translate(...p); batch.add(g, m, c, ao);
      const family=Object.keys(batches).find(k=>batches[k]===batch);reflected[family].add(g,m,c,ao);g.dispose();
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
    hall([x, 3.6 + 6.35 * scale, z], scale, true);
    // Open balcony: broad structural accents instead of miniature balusters.
    for (const dz of [-4.0, 4.0]) {
      box(timber, [0, 7.45, dz], [13.5, .17, .19], '#cc8756');
      box(timber, [0, 6.75, dz], [13.5, .14, .18], '#d79360');
      for (let xx = -6.5; xx <= 6.5; xx += .85) box(timber, [xx, 7.04, dz], [.12, .85, .13], '#b66c45');
    }
  }
  for(const t of TOWERS)tower(...t);
  for(const [x,z,scale]of MID_HALLS)
    hall([x, 3.5, z], scale);
  // inferred: layered low roofs fill the interval between the painted skyline
  // and the landmark towers; their silhouettes remain real parallax geometry.
  const distanceRng=engine.rng('P1-mid-distance');
  for(let layer=0;layer<3;layer++)for(let i=0;i<9;i++){
    hall([-58+i*14+distanceRng.range(-3,3),3.8+layer*.5,-42-layer*17-distanceRng.range(0,6)],distanceRng.range(.42,.78),false,true);
  }

  // inferred: the foreground coping follows c2's diagonal, while the older
  // retaining wall behind the trunk runs into the near end of the bridge.
  const quayYaw=Math.atan(QUAY.slope), step=.68, quayLength=step/Math.cos(quayYaw);
  for(let iz=0;iz<48;iz++){
    const z=-13+iz*step,edge=QUAY.intercept+QUAY.slope*z;
    for(let row=0;row<2;row++)block([edge-.14,.34+row*.62,z],[.75,.60,quayLength-.025],row?1:.70,quayYaw);
    block([edge,1.40,z],[.66,.21,quayLength-.02],1,quayYaw,true);
  }
  for(let ix=0;ix<24;ix++){
    const inset=.67+ix*.65;
    for(let z=-13+(ix%2)*.3;z<25;){
      const length=rng.range(.5,.8),dz=length*Math.cos(quayYaw),center=z+dz*.5;
      const edge=QUAY.intercept+QUAY.slope*center;
      block([edge-inset*Math.cos(quayYaw),1.20,center+inset*Math.sin(quayYaw)],
        [rng.range(.61,.64),.19,length-.012],.95,quayYaw,false,'#96928c');
      z+=dz;
    }
  }
  for(let iz=0;iz<12;iz++){
    const z=-17+iz*1.12;
    for(let row=0;row<3;row++)block([-14.0,.33+row*.62,z],[1.0,.61,1.10],row?.96:.65);
    block([-14.0,2.0,z],[1.15,.22,1.11],1,0,true);
  }
  // Source-based post/rail cadence, with a quieter strip below its coping.
  for(let i=0;i<7;i++){
    const z=-17+i*1.96;
    block([-14.0,2.55,z],[.24,1.0,.25]);
    if(i<6){block([-14.0,2.85,z+.98],[.17,.15,1.96]);block([-14.0,2.28,z+.98],[.18,.16,1.96],.8);}
  }

  // Reuse the continuous plank hull and rope geometry, then repaint it in the
  // same world-anchored language. Its helper's small berth is omitted here.
  const boat = buildBoats(engine, { center: [0, 0, 0], width: 26, waterY: 0,
    boats: [BOAT] });
  boat.updateMatrixWorld(true);
  boat.traverse(o => {
    if (o.name === 'solid-plank-hulls') {timber.add(o.geometry,o.matrixWorld,'#92704c',.85);reflected.timber.add(o.geometry,o.matrixWorld,'#92704c',.85);}
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
  timber.add(liner,boatMatrix,'#3e3326',.65);reflected.timber.add(liner,boatMatrix,'#3e3326',.65);liner.dispose();
  const [mx,my,mz]=MOORING.position;
  const post=chippedPost({...MOORING,rng});
  const postMatrix=new THREE.Matrix4().makeTranslation(mx,my,mz);
  stone.add(post,postMatrix,'#b7aa96',.9);reflected.stone.add(post,postMatrix,'#b7aa96',.9);post.dispose();
  const tieX = -BOAT.length * .37, tieZ = BOAT.width * .36;
  const tie = V(BOAT.position[0] + Math.cos(BOAT.yaw)*tieX + Math.sin(BOAT.yaw)*tieZ,
    .52, BOAT.position[2] - Math.sin(BOAT.yaw)*tieX + Math.cos(BOAT.yaw)*tieZ);
  // inferred: two irregular hemp turns hug the chipped post before the sag.
  const wrap=[];
  for(let i=0;i<=80;i++){
    const a=i/80*Math.PI*4.3,r=MOORING.width*.55/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));
    wrap.push(V(mx+Math.cos(a)*r,my+.60+i/80*.12,mz+Math.sin(a)*r));
  }
  const wrapG=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wrap),96,.033,5,false);
  timber.add(wrapG,undefined,'#a58c59');wrapG.dispose();
  const ropeStart=V(mx+.3,my+.70,mz-.12),sag=ropeStart.clone().lerp(tie,.5);sag.y=.62;
  const rope=new THREE.CatmullRomCurve3([ropeStart,sag,tie]);
  const ropeG = new THREE.TubeGeometry(rope, 20, .047, 5, false);
  timber.add(ropeG, undefined, '#bfaa72'); ropeG.dispose();

  function addWillow(x,z,height,hero=false){
    const rng=engine.rng(`P2-willow-${x}-${z}`),place=new THREE.Matrix4().makeTranslation(x,hero?HERO_WILLOW.position[1]:3.7,z);
    const g=willowGeometry(rng,{height,hero,trunkPoints:HERO_WILLOW.trunk,branches:HERO_WILLOW.branches});
    bark.add(g.wood,place);leaf.add(g.leaves,place);reflected.bark.add(g.wood,place);
    if(!hero){
      const crown=new Geometry();
      for(let j=0;j<9;j++){
        const a=j*2.399;crown.ellipsoid(V(Math.cos(a)*height*.19,height*(.58+.06*Math.sin(j)),Math.sin(a)*height*.19),
          V(height*.16,height*.27,height*.16),new THREE.Color(j%2?'#829267':'#a6a76c'),{sway:.2});
      }
      const cg=crown.build();reflected.leaf.add(cg,place);cg.dispose();
    }
    g.wood.dispose();g.leaves.dispose();
  }
  addWillow(HERO_WILLOW.position[0],HERO_WILLOW.position[2],HERO_WILLOW.height,true);
  for(const [x,z,h]of WILLOWS) addWillow(x, z, h);
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

  for (const k of families) engine.add(batches[k].mesh(paintMaterial(time, k), 'paint-' + k), { castShadow: false, receiveShadow: false });
  const reflectionScene=new THREE.Scene();
  for(const k of families){const material=paintMaterial(time,k);material.alphaToCoverage=false;reflectionScene.add(reflected[k].mesh(material,'reflection-'+k));}
  halls.dispose();
  return reflectionScene;
}
