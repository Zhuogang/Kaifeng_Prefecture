import * as THREE from 'three';
import {buildHall} from '../yingzao/hall.js';
import {bracketGeometry} from '../yingzao/brackets.js';
import {bracketHeight} from '../yingzao/brackets.js';
import {chiwei} from '../yingzao/ornament.js';

// Source-based Song roof/bracket construction; inferred pigment, tower hall
// proportions and LOD selection are parameters shared with later painted scenes.
export function paintedHalls(engine,batches,reflected,{timberColor='#bd6236',ornamentHeight=1.8,heroSpec={},smallSpec={},palette={},smallOrnamentScale=1,heroPaint=null,smallPaint=null,tileProfile=false,ornamentProfile='source'}={}){
  const {timber,roof}=batches;
  const tempMaterials = Object.fromEntries(['timber', 'bracket', 'stone', 'plaster', 'window', 'tile', 'ridge'].map(k => {
    const mat = new THREE.MeshBasicMaterial(); mat.name = k; return [k, mat];
  }));
  const matFamily = { timber: 'timber', bracket: 'timber', stone: 'stone', plaster: 'plaster', window: 'timber', tile: 'roof', ridge: 'roof' };
  const matColor = { timber: timberColor, bracket: '#bd805c', stone: '#c8b9a0', plaster: '#94735f', window: '#766c64', tile: '#74848a', ridge: '#939a8c',...palette };
  const ornaments = chiwei({height:ornamentHeight}); // Includes its source-model 拒鹊子.
  const hallTemplates=new Map();

  function hall(pos, scale = 1, hero = false, distant = false,specOverride=null) {
    const key=JSON.stringify([hero,specOverride]);
    if(!hallTemplates.has(key))hallTemplates.set(key,buildHall({ frontBays: hero ? [3.8, 4.6, 3.8] : [3.2, 3.8, 3.2], sideBays: [3.3, 3.3],
      columnHeight: hero ? 3.1 : 3.6, roof: 'wudian', klass: 'diange', caiGrade: hero ? 3 : 5,
      tiao: 2, bayFill: hero ? 'lattice' : 'wall', enclosedBrackets: true, ...(hero?heroSpec:smallSpec),...specOverride,materials: tempMaterials }, engine, tempMaterials));
    const h=hallTemplates.get(key);
    const paintShape=hero?heroPaint:(!distant&&!specOverride?smallPaint:null);
    const roofDatum=h.layout.spec.columnHeight+bracketHeight(h.layout.spec)+.25;
    const shapeGeometry=(g,k)=>{
      if(!paintShape)return g;
      const copy=g.clone(),p=copy.attributes.position;
      for(let i=0;i<p.count;i++)if(p.getY(i)>roofDatum-.4)p.setY(i,roofDatum+(p.getY(i)-roofDatum)*(paintShape.roofStretch||1));
      // inferred: stout paint-only columns retain the source lean/taper and
      // grid; ridge cross-sections grow without moving their authored paths.
      const types=copy.attributes.memberType;
      for(let i=0;i<p.count;i++){
        if(k==='ridge'){
          const n=copy.attributes.normal;p.setXYZ(i,p.getX(i)+n.getX(i)*.045,p.getY(i)+n.getY(i)*.045,p.getZ(i)+n.getZ(i)*.045);
        }
        if(types?.getX(i)===4){
          const y=p.getY(i);let nearest,dist=Infinity;
          for(const c of h.layout.columns){const d=(p.getX(i)-c.x)**2+(p.getZ(i)-c.z)**2;if(d<dist){dist=d;nearest=c;}}
          const c=nearest,t=(y-c.baseY)/(c.topY-c.baseY),x=c.x+(c.headX-c.x)*t,z=c.z+(c.headZ-c.z)*t;
          p.setX(i,x+(p.getX(i)-x)*1.25);p.setZ(i,z+(p.getZ(i)-z)*1.25);
        }
      }
      copy.computeVertexNormals();return copy;
    };
    const placement = new THREE.Matrix4().makeScale(scale, scale, scale); placement.setPosition(...pos);
    const visibleHall=distant?h.lod2:h.lod1;
    visibleHall.updateMatrixWorld(true);
    visibleHall.traverse(o => {
      if (!o.isMesh) return;
      const k = o.material.name;
      const g=shapeGeometry(o.geometry,k);batches[matFamily[k]].add(g, placement.clone().multiply(o.matrixWorld),heroPaint&&hero&&k==='bracket'?'#593d34':matColor[k],k==='window'?.72:1,0,k==='tile'?(tileProfile?30:13):(k==='timber'&&paintShape?33:k==='bracket'&&paintShape?26:null));if(g!==o.geometry)g.dispose();
    });
    h.lod2.updateMatrixWorld(true);
    h.lod2.traverse(o=>{
      if(o.isMesh){const k=o.material.name;const g=shapeGeometry(o.geometry,k);reflected[matFamily[k]].add(g,placement.clone().multiply(o.matrixWorld),matColor[k],k==='window'?.72:1,0,k==='tile'?(tileProfile?30:13):(k==='timber'&&paintShape?33:k==='bracket'&&paintShape?26:null));if(g!==o.geometry)g.dispose();}
    });
    if (hero||paintShape) for (const s of h.layout.sets) {
      const feature=hero&&!!heroPaint&&s.side==='south'&&s.kind==='zhutou';
      const g = bracketGeometry(!hero?{...h.layout.spec,shadowProxy:true}:h.layout.spec, s.kind);
      const m = new THREE.Matrix4().makeRotationY(s.angle); m.setPosition(s.x, s.y, s.z);
      // inferred: paint-only feature scale. Main structural clusters dominate
      // the facade; the source's smaller bujian sets sit behind them.
      if(heroPaint){const size=feature?heroPaint.bracketScale:(s.kind==='bujian'?[.75,.80,.75]:[1,1,1]);m.scale(new THREE.Vector3(...size));if(s.kind==='bujian')m.elements[14]-=.55;}
      timber.add(g, placement.clone().multiply(m), palette.bracket||'#bb805f', .82,0,heroPaint?(feature?25:26):null);
    }
    if(specOverride?.ornaments!==false)for (const a of h.anchors.chiwei) {
      const m = new THREE.Matrix4().makeRotationY(a.rotation+Math.PI/2);if(!hero)m.scale(new THREE.Vector3().setScalar(smallOrnamentScale));m.setPosition(a.position[0],paintShape?roofDatum+(a.position[1]-roofDatum)*(paintShape.roofStretch||1):a.position[1],a.position[2]);
      const ornament=ornamentProfile==='fishTail'&&hero?ornaments.lod0:ornaments.lod1;
      roof.add(ornament,placement.clone().multiply(m),'#858e88',1,0,ornamentProfile==='fishTail'?31:null);
      if(ornamentProfile==='fishTail'){
        // inferred: a broad upright dorsal membrane, following the source
        // fin profile and keeping its original fork-shaped juquezi above it.
        const f=new THREE.Shape();f.moveTo(.04,.42);f.lineTo(.46,.63);f.quadraticCurveTo(.56,1.11,.72,1.51);f.lineTo(.50,1.65);f.lineTo(.06,1.42);f.lineTo(-.18,1.08);f.closePath();
        const fin=new THREE.ExtrudeGeometry(f,{depth:.40,steps:1,curveSegments:6,bevelEnabled:true,bevelSegments:1,bevelSize:.018,bevelThickness:.018}).translate(0,0,-.20).scale(ornamentHeight/1.95,ornamentHeight/1.95,ornamentHeight/1.95);
        roof.add(fin,placement.clone().multiply(m),'#858e88',1,0,31);fin.dispose();
      }
    }
  }

  const dispose=()=>{
    for(const m of Object.values(tempMaterials))m.dispose();
    for(const h of hallTemplates.values())for(const group of [h.lod0,h.lod1,h.lod2])group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)o.geometry.dispose();});
    ornaments.lod0.dispose();ornaments.lod1.dispose();
  };
  return {hall,dispose};
}
