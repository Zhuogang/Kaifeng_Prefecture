import * as THREE from 'three';
import { PaintBatch } from './batch.js';
import { paintMaterial } from './materials.js';
import { buildHall } from '../yingzao/hall.js';
import { bracketGeometry } from '../yingzao/brackets.js';
import { chiwei, goulan } from '../yingzao/ornament.js';
import { Geometry, V } from '../flora/geometry.js';
import { buildBoats } from '../water/boats.js';
import { BOAT, TOWERS, BRIDGE } from './composition.js';

// inferred: all placements, dimensions, palettes, brush scales and botanical forms
// here compose c2 rather than reconstruct a surveyed location. The low stone beam
// bridge, Song hall rules, structural brackets and ridge ornaments reuse the sources.
export function compose(engine, time) {
  const rng = engine.rng('P0-painted-zhouqiao');
  const families = ['stone', 'plaster', 'timber', 'roof', 'bark', 'leaf'];
  const batches = Object.fromEntries(families.map(k => [k, new PaintBatch()]));
  const reflected = Object.fromEntries(families.map(k => [k, new PaintBatch()]));
  const { stone, timber, plaster, roof, bark, leaf } = batches;
  const stoneColors = ['#ceb997', '#c0ac95', '#d9c09b', '#b3aab3', '#c5b29b', '#a3a1a3'];
  const block = (p, s, ao = 1, yaw = 0, coping = false) => {
    const pos=p.map(v=>v+rng.range(-.018,.018)),pigment=rng.pick(stoneColors),angle=yaw+rng.range(-.007,.007),color=coping?'#e2cfad':pigment;
    stone.box(pos,s,color,ao,angle,true);
    reflected.stone.box(pos,s,color,ao,angle);
  };
  const timberColor = '#bd6236';
  const tempMaterials = Object.fromEntries(['timber', 'bracket', 'stone', 'plaster', 'window', 'tile', 'ridge'].map(k => {
    const mat = new THREE.MeshBasicMaterial(); mat.name = k; return [k, mat];
  }));
  const matFamily = { timber: 'timber', bracket: 'timber', stone: 'stone', plaster: 'plaster', window: 'timber', tile: 'roof', ridge: 'roof' };
  const matColor = { timber: timberColor, bracket: '#b76b41', stone: '#c8b9a0', plaster: '#94735f', window: '#534953', tile: '#74848a', ridge: '#939a8c' };
  const ornaments = chiwei({ height: 1.35 }); // Includes its source-model 拒鹊子.
  const hallTemplates=new Map();

  function hall(pos, scale = 1, hero = false, distant = false) {
    if(!hallTemplates.has(hero))hallTemplates.set(hero,buildHall({ frontBays: hero ? [3.8, 4.6, 3.8] : [3.2, 3.8, 3.2], sideBays: [3.3, 3.3],
      columnHeight: hero ? 3.1 : 3.6, roof: 'wudian', klass: 'diange', caiGrade: hero ? 3 : 5,
      tiao: 2, bayFill: hero ? 'lattice' : 'wall', enclosedBrackets: true, materials: tempMaterials }, engine, tempMaterials));
    const h=hallTemplates.get(hero);
    const placement = new THREE.Matrix4().makeScale(scale, scale, scale); placement.setPosition(...pos);
    const visibleHall=distant?h.lod2:h.lod1;
    visibleHall.updateMatrixWorld(true);
    visibleHall.traverse(o => {
      if (!o.isMesh) return;
      const k = o.material.name;
      batches[matFamily[k]].add(o.geometry, placement.clone().multiply(o.matrixWorld), matColor[k], k === 'window' ? .57 : 1);
    });
    h.lod2.updateMatrixWorld(true);
    h.lod2.traverse(o=>{
      if(o.isMesh){const k=o.material.name;reflected[matFamily[k]].add(o.geometry,placement.clone().multiply(o.matrixWorld),matColor[k],k==='window'?.57:1);}
    });
    if (hero) for (const s of h.layout.sets) {
      const g = bracketGeometry(h.layout.spec, s.kind);
      const m = new THREE.Matrix4().makeRotationY(s.angle); m.setPosition(s.x, s.y, s.z);
      timber.add(g, placement.clone().multiply(m), '#bd714b', .82);
    }
    for (const a of h.anchors.chiwei) {
      const m = new THREE.Matrix4().makeRotationY(a.rotation); m.setPosition(...a.position);
      roof.add(ornaments.lod1, placement.clone().multiply(m), '#858e88');
    }
  }

  // Closely set bluestone columns below a low, nearly level bridge. No arches.
  const bridgePoint=([x,y,z])=>[x,y+BRIDGE.fall*x,z+BRIDGE.skew*x];
  for (let x = -26; x <= 29; x += 2.6) for (const z of [-17.0, -22.5]) {
    const stretch=1+BRIDGE.fall*x/3;
    for (let y = .35; y < 3; y += .65) block([x+rng.range(-.025,.025),y*stretch,z+BRIDGE.skew*x],[.73,.615*stretch,.90],y<.8?.67:.95);
    block(bridgePoint([x, 2.9, z]), [1.2, .28, 1.1], .86);
  }
  for (let x = -27; x < 30; x += 1.35) {
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
          stone.add(o.geometry,o.matrixWorld.clone().multiply(m),o.name==='wangzhu'?'#d4c5aa':'#d1c2a6');
        }
      });
      for(const lod of [rails.lod0,rails.lod1])lod.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
    }
  }
  railing(-27, 30, -16.15, 3.64,2.65,true);
  railing(-27, 30, -23, 3.64,2.65,true);

  // Far bank stone courses and its warm upper promenade.
  plaster.box([0, 2.85, -32], [170, 5.4, 16], '#d3bd94');
  reflected.plaster.box([0, 2.85, -32], [170, 5.4, 16], '#d3bd94');
  for (let row = 0; row < 5; row++) for (let i = 0; i < 62; i++) {
    const x = -80 + i * 2.65 + (row % 2) * 1.325;
    block([x, .4 + row * .66, -24.1], [2.61, .64, 1.1], row === 0 ? .68 : 1);
  }
  railing(-70, 70, -24.05, 3.5, 3.4);

  function tower(x, z, scale) {
    const m = new THREE.Matrix4().makeScale(scale, scale, scale); m.setPosition(x, 3.6, z);
    const box = (batch, p, s, c, ao = 1) => {
      const g = new THREE.BoxGeometry(...s); g.translate(...p); batch.add(g, m, c, ao);
      const family=Object.keys(batches).find(k=>batches[k]===batch);reflected[family].add(g,m,c,ao);g.dispose();
    };
    for (const sign of [-1, 1]) {
      box(stone, [sign * 4.8, .25, 0], [3.1, .5, 7.8], '#c6bba5');
      box(plaster, [sign * 4.9, 3, 0], [2.2, 5.7, 6.5], '#e6c493');
      for (const dz of [-3.5, 3.5]) box(timber, [sign * 3.65, 3.1, dz], [.65, 6.2, .7], timberColor);
      box(timber, [sign * 6.1, 3.1, 3.5], [.5, 6.2, .55], '#a85437');
    }
    box(timber, [0, 6.1, 0], [13, .66, 7.8], '#b56c44');
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
  for (const [x, z, scale] of [[-23, -42, .7], [-12, -41, .7], [9, -43, .5], [32, -40, .75], [-42, -53, .8], [3, -61, .8], [40, -63, .8]])
    hall([x, 3.5, z], scale);
  hall([36.8, 3.5, -25], .40);
  // inferred: layered low roofs fill the interval between the painted skyline
  // and the landmark towers; their silhouettes remain real parallax geometry.
  const distanceRng=engine.rng('P1-mid-distance');
  for(let layer=0;layer<3;layer++)for(let i=0;i<9;i++){
    hall([-58+i*14+distanceRng.range(-3,3),3.8+layer*.5,-42-layer*17-distanceRng.range(0,6)],distanceRng.range(.42,.78),false,true);
  }

  // Near quay recedes diagonally, with broad irregular paving and a low lip.
  const quayYaw = Math.atan(.70 / 1.6), quayLength = Math.hypot(.70, 1.6);
  for (let iz = 0; iz < 22; iz++) {
    const z = -13 + iz * 1.6, edge = -13.5 + iz * .70;
    for (let row = 0; row < 2; row++) block([edge - .15, .36 + row * .62, z], [.85, .60, quayLength - .015], row ? 1 : .7, quayYaw);
    block([edge, 1.40, z], [1.05, .19, quayLength - .01], 1, quayYaw);
    for (let ix = 0; ix < 9; ix++) {
      const inset = .9 + ix * 1.4;
      block([edge - inset * Math.cos(quayYaw), 1.21, z + inset * Math.sin(quayYaw)], [1.39, .2, quayLength - .01], .85, quayYaw);
    }
  }
  for (let i = 0; i < 7; i++) {
    const z = -12 + i * 2, x = -13.6 + (z + 13) / 1.6 * .70;
    block([x, 1.96, z], [.37, 1.05, .38]);
    if (i < 6) block([x + .42, 2.32, z + 1], [.19, .17, 2.18], 1, quayYaw);
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
  block([-6.4, 2.0, 7.8], [.6, 1.3, .65]);
  block([-6.4, 2.7, 7.8], [.7, .13, .75]);
  const tieX = -BOAT.length * .37, tieZ = BOAT.width * .36;
  const tie = V(BOAT.position[0] + Math.cos(BOAT.yaw)*tieX + Math.sin(BOAT.yaw)*tieZ,
    .52, BOAT.position[2] - Math.sin(BOAT.yaw)*tieX + Math.cos(BOAT.yaw)*tieZ);
  const rope = new THREE.CatmullRomCurve3([V(-6.4,2.3,7.8),V(-5.7,1.9,6.1),V(-5.3,1.48,4.7),tie]);
  const ropeG = new THREE.TubeGeometry(rope, 20, .047, 5, false);
  timber.add(ropeG, undefined, '#bfaa72'); ropeG.dispose();

  function addWillow(x, z, height, hero = false) {
    const rng = engine.rng(`P0-willow-${x}-${z}`);
    const wood = new Geometry(), leaves = new Geometry();
    const place = new THREE.Matrix4().makeTranslation(x, hero ? 1.28 : 3.7, z);
    const h = height, trunk = hero ? [V(0, 0, 0), V(1.0, 3.1, 0), V(2.3, 5.3, -.5), V(6.4, 8.4, -.8), V(12, 11.5, -1.8)] :
      [V(), V(-.2, h * .24, 0), V(.3, h * .48, 0), V(.1, h * .62, 0)];
    wood.tube(trunk, hero ? [1.45, 1.22, .88, .59, .24] : [h * .052, h * .04, h * .035, h * .018], new THREE.Color('#635c50'), { sides: 10, gnarl: .6, smooth: 4 });
    if(hero)wood.tube([trunk[1],V(-2,6,-1),V(-3,13,-1.8)],[.65,.45,.20],new THREE.Color('#62605c'),{sides:9,gnarl:.6,smooth:4});
    for (let j = 0; j < (hero ? 18 : 12); j++) {
      const angle = j * 2.399, start = trunk[hero ? Math.min(3, 1 + j % 3) : 2];
      const tip = hero ? V(start.x + rng.range(-5, 12), start.y + rng.range(1, 5), rng.range(-3, 2)) :
        V(Math.cos(angle) * h * .35, h * rng.range(.68, .98), Math.sin(angle) * h * .29);
      const mid = start.clone().lerp(tip, .55).add(V(0, h * .06, 0));
      wood.tube([start, mid, tip], [hero ? .26 : h * .016, hero ? .12 : h * .008, .018], new THREE.Color('#696551'), { sides: 6, gnarl: .4, smooth: 3 });
      for (let k = 0; k < (hero ? 36 : 18); k++) {
        const base = mid.clone().lerp(tip, rng.range(.05, 1)).add(V(rng.range(-.7, .7), rng.range(-.4, .6), rng.range(-.8, .8)));
        const length = rng.range(hero ? 2.0 : h * .19, hero ? (base.x>7?3.5:6.2) : h * .56), yaw = rng.range(0, Math.PI * 2);
        const path = Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          return base.clone().add(V(Math.cos(yaw) * .7 * Math.sin(t * 1.8), -length * t + .3 * Math.sin(t * Math.PI), Math.sin(yaw) * .5 * t));
        });
        const c = new THREE.Color(rng.pick(['#7b926b', '#a3ad69', '#bfc06e', '#648c7e', '#96a76e', '#c9bf72']));
        leaves.curtain(path, rng.range(hero?.025:.045,hero?.05:.09), yaw, c, { sway:1,ao:rng.range(.82,1),random:rng.random() });
        const count=hero?56:46;
        for (let s = 1; s < count; s++) {
          if(rng.chance(.07))continue;
          const t=(s+rng.range(-.38,.38))/count,index=Math.min(7,Math.floor(t*8)),p=path[index].clone().lerp(path[index+1],t*8-index);
          const a=yaw+rng.range(-.6,.6),side=s%2?1:-1;
          leaves.leaf(p,rng.range(hero?.22:.30,hero?.43:.58),rng.range(hero?.04:.065,hero?.085:.13),V(side*Math.cos(a)*rng.range(.35,.8),rng.range(-1.,-.55),side*Math.sin(a)*.6),c,t,a,1);
        }
      }
    }
    const wg = wood.build(), lg = leaves.build();
    bark.add(wg, place); leaf.add(lg, place);reflected.bark.add(wg,place);
    if(!hero){
      const crown=new Geometry();
      for(let j=0;j<9;j++){
        const a=j*2.399;
        crown.ellipsoid(V(Math.cos(a)*h*.19,h*(.58+.06*Math.sin(j)),Math.sin(a)*h*.19),V(h*.16,h*.27,h*.16),new THREE.Color(j%2?'#829267':'#a6a76c'),{sway:.2});
      }
      const cg=crown.build();reflected.leaf.add(cg,place);cg.dispose();
    }
    wg.dispose(); lg.dispose();
  }
  addWillow(-10.7, 5.5, 17, true);
  for (const [x, z, h] of [[-22, -28, 10], [-12, -32, 8], [16.5, -27, 9], [38, -30, 11], [-37, -43, 11], [4, -48, 8], [45, -44, 12]]) addWillow(x, z, h);
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
  for (const m of Object.values(tempMaterials)) m.dispose();
  for(const h of hallTemplates.values())for(const group of [h.lod0,h.lod1,h.lod2])group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)o.geometry.dispose();});
  ornaments.lod0.dispose(); ornaments.lod1.dispose();
  return reflectionScene;
}
