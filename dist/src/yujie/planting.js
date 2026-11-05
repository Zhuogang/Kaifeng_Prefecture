import * as THREE from 'three';
import { YUJIE as P, YUJIE_GALLERY_PLANTING as G } from '../world/plan.js';
import { buildBlossom } from '../flora/trees.js';
import { buildLotus, instancePetals } from '../flora/groundcover.js';
import { floraMaterials } from '../flora/materials.js';
import { matrix, instanceLods } from './instances.js';
import { rowReaches } from './layout.js';

export function buildPlanting(engine) {
  const materials = floraMaterials(engine), rng = engine.rng('yujie:planting');
  const treeEntries = [], lotusEntries = [], petals = Object.fromEntries(P.planting.species.map(s => [s, []]));
  // inferred: W2's denser mixed orchard uses roughly four-fifths of the
  // original plan interval, with interlocking crowns rather than isolated tufts.
  const spacing=P.planting.spacing*.78, jitter=Math.min(P.planting.jitter,spacing*.13);
  for (const sign of [-1, 1]) for (const [start, end] of rowReaches) {
    for (let z = start + spacing / 2, i = 0; z < end - 3; z += spacing, i++) {
      const pz = z + rng.range(-jitter,jitter);
      if (P.crossings.some(c => Math.abs(pz - c) < P.fenceGap / 2 + 2)) continue;
      const x = sign * (P.planting.centerX + rng.range(-0.8, 0.8)), species = P.planting.species[i % 4];
      const scale = rng.range(0.88, 1.13), width=rng.range(1.10,1.32);
      treeEntries.push({ species, matrix: matrix([x, P.surfaceY, pz], rng.range(0, Math.PI * 2), [scale*width, scale, scale*width]) });
      engine.footprints.addCircle(x, pz, P.planting.height * scale * 0.035, 'yujie:tree');
      // inferred: sparse windblown petals in each crown's drip line and along the adjacent canal edge.
      for (let k = 0; k < 36; k++) {
        const [dx, dz] = rng.disk(); petals[species].push([x + dx * 2.6, P.surfaceY + 0.008, pz + dz * 2.6]);
      }
      for (let k = 0; k < 8; k++) petals[species].push([sign * rng.range(39, 41.5), P.waterY + 0.009, pz + rng.range(-3, 3)]);
    }
    // inferred: irregular loose lotus colonies with open water between, no late-spring flowers.
    for (let z = start + 2; z < end - 2; z += 2.6) {
      if (P.crossings.some(c => Math.abs(z - c) < P.crossingWidth)) continue;
      const cluster = rng.random() < 0.38 ? 1 : 3;
      for (let k = 0; k < cluster; k++) {
        const scale = rng.range(0.65, 1.15);
        lotusEntries.push({ matrix: matrix([sign * rng.range(P.section.road + 1, P.section.canal - 1),
          P.waterY + 0.018, z + rng.range(-1.1, 1.1)], rng.range(0, Math.PI * 2), [scale, scale, scale]) });
      }
    }
  }
  // inferred: additional blossom rows on the public-lane side of BOTH galleries,
  // rather than relocating the sourced canal orchard across the 96 m lane.
  // Independent randomness preserves every existing canal tree and lotus colony.
  const galleryRng=engine.rng('yujie:gallery-planting');
  let galleryTrees=0;
  for(const sign of [-1,1]) for(const [start,end] of rowReaches)
    for(let z=start+G.spacing/2,i=0;z<end-3;z+=G.spacing,i++) {
      const pz=z+galleryRng.range(-.6,.6);
      if(P.crossStreets.some(c=>Math.abs(pz-c)<P.fenceGap/2+P.planting.height*.4))continue;
      const x=sign*(G.centerX+galleryRng.range(-.25,.25)),species=P.planting.species[i%4];
      // inferred: modest crown widths keep boughs clear of the deep gallery eave.
      const scale=galleryRng.range(.92,1.06),width=galleryRng.range(.95,1.07);
      treeEntries.push({species,gallery:true,matrix:matrix([x,P.surfaceY,pz],galleryRng.range(0,Math.PI*2),[scale*width,scale,scale*width])});
      engine.footprints.addCircle(x,pz,P.planting.height*scale*.035,'yujie:tree');
      galleryTrees++;
      for(let k=0;k<24;k++) {
        const [dx,dz]=galleryRng.disk();petals[species].push([x+dx*2.4,P.surfaceY+.008,pz+dz*2.4]);
      }
    }
  // A shared vertex-coloured model lets all four species share draws; their public
  // botanical models retain different flowers, bark and crown shapes.
  const treeGroups = []; let shadowModel;
  // inferred: the additional gallery row converges to its crown silhouette at
  // 140 m, like the gallery shells; the canal orchard keeps W2's 320 m
  // middle LOD. Both retain LOD0 to 80 m. This bounds the extra row's cost when walking the opposite canal bank.
  const canalLod=[80,320],galleryLod=[80,140];
  for (const species of P.planting.species) {
    const model = buildBlossom({ species, height: P.planting.height, rng: engine.rng('yujie:model:' + species) });
    shadowModel ??= model;
    // W1: retain the best available botanical mesh through at least 80 metres.
    treeGroups.push(instanceLods(engine, 'yujie:trees:' + species,
      [model.lod0, model.lod1, model.lod2].map(geometry => [{ geometry, material: materials.surface }]),
      treeEntries.filter(t => t.species === species), item=>item.gallery?galleryLod:canalLod,
      { depth: materials.depth, flora: true, shadow: false }));
    instancePetals(engine, petals[species], { species, materials });
  }
  // inferred: one shared public blossom silhouette supplies the four species'
  // shadow canopy; full visible flowers stay at LOD0 through 80 m. The sparse
  // far silhouette suffices for preview shadows; stills retain LOD1 branchwork.
  const shadowMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  shadowMaterial.userData.noPatch=true; shadowMaterial.shadowSide=THREE.DoubleSide;
  const shadowGeometry=engine.quality.detail>=1?shadowModel.lod1:shadowModel.lod2;
  const treeShadows=instanceLods(engine,'yujie:blossom-shadows',
    [[{geometry:shadowGeometry,material:shadowMaterial}],[],[]],treeEntries,[180,180],
    {depth:materials.depth,flora:true});
  treeShadows.traverse(o=>{if(o.isMesh)o.receiveShadow=false;});
  const lotus = buildLotus({ rng: engine.rng('yujie:lotus') });
  // inferred: at long range retain the public leaf's notched outer rim as a triangle fan.
  // The five interior rings only describe centimetre relief, invisible beyond 80 m.
  const farLeaf = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(lotus.lod2.attributes)) {
    const values = [], rimStart = attribute.count - 17;
    for (const i of [0, ...Array.from({ length: 17 }, (_, j) => rimStart + j)])
      for (let k = 0; k < attribute.itemSize; k++) values.push(attribute.array[i * attribute.itemSize + k]);
    farLeaf.setAttribute(name, new THREE.Float32BufferAttribute(values, attribute.itemSize));
  }
  farLeaf.setIndex(Array.from({ length: 16 }, (_, i) => [0, i + 2, i + 1]).flat());
  const leaves = instanceLods(engine, 'yujie:lotus', [lotus.lod0, lotus.lod1, farLeaf].map(geometry =>
    [{ geometry, material: materials.surface }]), lotusEntries, [18, 80], { depth: materials.depth, flora: true, shadow: false });
  return { treeGroups, treeShadows, leaves, trees: treeEntries.length, galleryTrees, lotus: lotusEntries.length };
}
