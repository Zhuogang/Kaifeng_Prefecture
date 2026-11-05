import * as THREE from 'three';
import {buildHall} from '../yingzao/hall.js';
import {bracketGeometry} from '../yingzao/brackets.js';
import {chiwei} from '../yingzao/ornament.js';

// Source-based Song roof/bracket construction; inferred pigment, tower hall
// proportions and LOD selection are parameters shared with later painted scenes.
export function paintedHalls(engine,batches,reflected,{timberColor='#bd6236',ornamentHeight=1.8,heroSpec={},smallSpec={},palette={},smallOrnamentScale=1}={}){
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
    const placement = new THREE.Matrix4().makeScale(scale, scale, scale); placement.setPosition(...pos);
    const visibleHall=distant?h.lod2:h.lod1;
    visibleHall.updateMatrixWorld(true);
    visibleHall.traverse(o => {
      if (!o.isMesh) return;
      const k = o.material.name;
      batches[matFamily[k]].add(o.geometry, placement.clone().multiply(o.matrixWorld), matColor[k],k==='window'?.72:1,0,k==='tile'?13:null);
    });
    h.lod2.updateMatrixWorld(true);
    h.lod2.traverse(o=>{
      if(o.isMesh){const k=o.material.name;reflected[matFamily[k]].add(o.geometry,placement.clone().multiply(o.matrixWorld),matColor[k],k==='window'?.72:1,0,k==='tile'?13:null);}
    });
    if (hero) for (const s of h.layout.sets) {
      const g = bracketGeometry(h.layout.spec, s.kind);
      const m = new THREE.Matrix4().makeRotationY(s.angle); m.setPosition(s.x, s.y, s.z);
      timber.add(g, placement.clone().multiply(m), palette.bracket||'#bb805f', .82);g.dispose();
    }
    if(specOverride?.ornaments!==false)for (const a of h.anchors.chiwei) {
      const m = new THREE.Matrix4().makeRotationY(a.rotation+Math.PI/2);if(!hero)m.scale(new THREE.Vector3().setScalar(smallOrnamentScale));m.setPosition(...a.position);
      roof.add(ornaments.lod1, placement.clone().multiply(m), '#858e88');
    }
  }

  const dispose=()=>{
    for(const m of Object.values(tempMaterials))m.dispose();
    for(const h of hallTemplates.values())for(const group of [h.lod0,h.lod1,h.lod2])group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)o.geometry.dispose();});
    ornaments.lod0.dispose();ornaments.lod1.dispose();
  };
  return {hall,dispose};
}
