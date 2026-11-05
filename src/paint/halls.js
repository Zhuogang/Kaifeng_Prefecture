import * as THREE from 'three';
import {buildHall} from '../yingzao/hall.js';
import {bracketGeometry} from '../yingzao/brackets.js';
import {bracketHeight} from '../yingzao/brackets.js';
import {chiwei} from '../yingzao/ornament.js';
import {roofModel} from '../yingzao/roof.js';
import {CHI,fen,laneFen} from '../yingzao/rules.js';
import {profilePrism} from '../yingzao/geometry.js';
import {PaintInstances} from './batch.js';
import {paintMaterial} from './materials.js';

// Source-based Song roof/bracket construction; inferred pigment, tower hall
// proportions and LOD selection are parameters shared with later painted scenes.
export function paintedHalls(engine,batches,reflected,{time,profile='zhouqiao',timberColor='#bd6236',ornamentHeight=1.8,heroSpec={},smallSpec={},palette={},smallOrnamentScale=1,heroPaint=null,smallPaint=null,tileProfile=false,ornamentProfile='source'}={}){
  const {timber,roof}=batches;
  const tempMaterials = Object.fromEntries(['timber', 'bracket', 'stone', 'plaster', 'window', 'tile', 'ridge'].map(k => {
    const mat = new THREE.MeshBasicMaterial(); mat.name = k; return [k, mat];
  }));
  const matFamily = { timber: 'timber', bracket: 'timber', stone: 'stone', plaster: 'plaster', window: 'timber', tile: 'roof', ridge: 'roof' };
  const matColor = { timber: timberColor, bracket: '#bd805c', stone: '#c8b9a0', plaster: '#94735f', window: '#766c64', tile: '#74848a', ridge: '#939a8c',...palette };
  const ornaments = chiwei({height:ornamentHeight}); // Includes its source-model 拒鹊子.
  const hallTemplates=new Map();
  const bracketInstances=new Map();
  const capSource=new THREE.CircleGeometry(.075,6),rafterSource=new THREE.BoxGeometry();
  const caps=new PaintInstances(capSource,51),rafters=new PaintInstances(rafterSource,43);
  capSource.dispose();rafterSource.dispose();

  function hall(pos, scale = 1, hero = false, distant = false,specOverride=null) {
    const key=JSON.stringify([hero,specOverride]);
    if(!hallTemplates.has(key))hallTemplates.set(key,buildHall({ frontBays: hero ? [3.8, 4.6, 3.8] : [3.2, 3.8, 3.2], sideBays: [3.3, 3.3],
      columnHeight: hero ? 3.1 : 3.6, roof: 'wudian', klass: 'diange', caiGrade: hero ? 3 : 5,
      tiao: 2, bayFill: hero ? 'lattice' : 'wall', enclosedBrackets: true, ...(hero?heroSpec:smallSpec),...specOverride,materials: tempMaterials }, engine, tempMaterials));
    const h=hallTemplates.get(key);
    const paintShape=hero?heroPaint:(!distant&&!specOverride?smallPaint:null);
    const roofDatum=h.layout.spec.columnHeight+bracketHeight(h.layout.spec)+.25;
    const model=roofModel(h.layout),f=fen(h.layout.spec.caiGrade);
    // inferred: 76 parallel cover rows across the hero's front match c1-hall;
    // the smaller halls retain the source generator's .26 m tile pitch.
    const end=model.point('south',1,model.tEnd),pitch=heroPaint&&hero?Math.abs(end[0])*2/76:.26;
    const shapeGeometry=(g,k)=>{
      if(!paintShape&&k!=='tile')return g;
      const copy=g.clone(),p=copy.attributes.position;
      if(k==='tile'){
        const tiles=copy.attributes.tileCoord,uv=[];
        for(let i=0;i<p.count;i++)uv.push(tiles.getX(i)*.26/pitch,tiles.getW(i));
        copy.setAttribute('paintUV',new THREE.Float32BufferAttribute(uv,2));
      }
      for(let i=0;i<p.count;i++)if(paintShape&&p.getY(i)>roofDatum-.4)p.setY(i,roofDatum+(p.getY(i)-roofDatum)*(paintShape.roofStretch||1));
      // inferred: stout paint-only columns retain the source lean/taper and
      // grid; ridge cross-sections grow without moving their authored paths.
      const types=copy.attributes.memberType;
      for(let i=0;i<p.count;i++){
        if(k==='ridge'&&paintShape){
          const n=copy.attributes.normal;p.setXYZ(i,p.getX(i)+n.getX(i)*.045,p.getY(i)+n.getY(i)*.045,p.getZ(i)+n.getZ(i)*.045);
        }
        if(types?.getX(i)===4&&paintShape){
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
      const g=shapeGeometry(o.geometry,k);batches[matFamily[k]].add(g, placement.clone().multiply(o.matrixWorld),heroPaint&&hero&&k==='bracket'?'#593d34':matColor[k],k==='window'?.72:1,0,k==='tile'?50:k==='ridge'?57:k==='window'?46:k==='timber'?(paintShape?33:47):(k==='bracket'&&paintShape?26:null));if(g!==o.geometry)g.dispose();
    });
    h.lod2.updateMatrixWorld(true);
    h.lod2.traverse(o=>{
      if(o.isMesh){const k=o.material.name;const g=shapeGeometry(o.geometry,k);reflected[matFamily[k]].add(g,placement.clone().multiply(o.matrixWorld),matColor[k],k==='window'?.72:1,0,k==='tile'?50:k==='ridge'?57:(k==='timber'&&paintShape?33:k==='bracket'&&paintShape?26:null));if(g!==o.geometry)g.dispose();}
    });
    if (!distant) for (const s of h.layout.sets) {
      if(!hero&&!paintShape&&s.side==='north'&&s.kind!=='zhuanjiao')continue;
      const feature=hero&&!!heroPaint&&s.side==='south'&&s.kind==='zhutou';
      const g = bracketGeometry(!hero?{...h.layout.spec,shadowProxy:true}:h.layout.spec, s.kind);
      const m = new THREE.Matrix4().makeRotationY(s.angle); m.setPosition(s.x, s.y, s.z);
      // inferred: paint-only feature scale. Main structural clusters dominate
      // the facade; the source's smaller bujian sets sit behind them.
      if(heroPaint){const size=feature?heroPaint.bracketScale:(s.kind==='bujian'?[.75,.80,.75]:[1,1,1]);m.scale(new THREE.Vector3(...size));if(s.kind==='bujian')m.elements[14]-=.55;}
      const key=g.userData.batchKey;
      if(!bracketInstances.has(key)){
        const detail=g.clone(),part=detail.attributes.memberType,size=detail.attributes.memberSize,tags=[];
        for(let i=0;i<part.count;i++)tags.push(part.getX(i)===2?41:part.getX(i)===3?42:
          part.getX(i)===1&&Math.abs(size.getX(i)/f-62)<.1?44:
          part.getX(i)===1&&Math.abs(size.getY(i)/f-21)<.1?45:40);
        detail.setAttribute('paintPart',new THREE.Float32BufferAttribute(tags,1));
        bracketInstances.set(key,new PaintInstances(detail,40));detail.dispose();
      }
      const pigment=new THREE.Color(palette.bracket||'#bb805f');if(s.kind==='bujian')pigment.multiplyScalar(1.08);
      bracketInstances.get(key).add(placement.clone().multiply(m),pigment);
      if(s.kind==='bujian'){
        // inferred: a light inverted-V bearing strut beneath each smaller set.
        const tip=[s.x,s.y+.02,s.z],axis=s.side==='east'||s.side==='west'?[0,1]:[1,0];
        for(const sign of [-1,1]){
          const foot=[s.x+axis[0]*sign*18*f,s.y-22*f,s.z+axis[1]*sign*18*f];
          const beam=new THREE.BoxGeometry(7*f,Math.hypot(18*f,24*f),7*f);
          const a=new THREE.Vector3(...foot),b=new THREE.Vector3(...tip);
          const mm=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize()),new THREE.Vector3(1,1,1));
          timber.add(beam,placement.clone().multiply(mm),timberColor,.80,0,43);beam.dispose();
        }
      }
    }
    if(!distant){
      const point=(side,u,t,offset=0)=>{
        const p=model.point(side,u,t,offset);
        if(paintShape&&p[1]>roofDatum-.4)p[1]=roofDatum+(p[1]-roofDatum)*(paintShape.roofStretch||1);
        return new THREE.Vector3(...p);
      };
      for(const side of model.sides){
        // inferred: the north eave ends are hidden behind the roofs along both
        // authored south-side paths. Surface tile rows still cover every face.
        if(side==='north')continue;
        const a=point(side,-1,model.tEnd),b=point(side,1,model.tEnd),span=a.distanceTo(b),count=Math.ceil(span/pitch);
        const angle={south:0,north:Math.PI,east:Math.PI/2,west:-Math.PI/2}[side];
        for(let j=0;j<=count;j++){
          const p=point(side,j/count*2-1,model.tEnd,.105);
          const m=new THREE.Matrix4().compose(p,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),new THREE.Vector3(1,1,1));
          caps.add(placement.clone().multiply(m),'#74848a');
        }
        // 卷五: 殿阁 9–9.5 寸, 廊屋 7.5–8 寸 between rafter centres.
        const spacing=(h.layout.spec.klass==='diange'?9.25:h.layout.spec.klass==='yuwu'?7.75:8.25)*CHI/10;
        const n=Math.ceil(span/spacing),diameter=h.layout.spec.rafterDiameter;
        for(let j=0;j<=n;j++){
          const u=j/n*2-1,a=point(side,u,model.tEnd-.10,-.22),b=point(side,u,model.tEnd,-.22),d=b.clone().sub(a);
          const m=new THREE.Matrix4().compose(a.add(b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()),new THREE.Vector3(diameter*.8,d.length(),diameter*.7));
          rafters.add(placement.clone().multiply(m),timberColor);
        }
      }
      if(model.kind!=='xuanshan')for(const side of ['south','north'])for(const u of [-1,1])for(let j=0;j<3;j++){
        // inferred: small plain ridge nubs, following c1-hall rather than Qing animals.
        const p=point(side,u,model.tEnd-.035-j*.055,.48),nub=new THREE.BoxGeometry(.10,.16,.15);
        batches.roof.add(nub,placement.clone().multiply(new THREE.Matrix4().makeTranslation(...p)),matColor.ridge,1,0,51);nub.dispose();
      }
      // Flat corbels connect the two existing source-sized ties to the columns.
      const lane=laneFen(h.layout.spec.hasBujian),corbel=profilePrism([[0,0],[34*f,0],[34*f,-5*f],[21*f,-13*f],[0,-13*f]],10*f);
      for(const c of h.layout.columns.filter(c=>c.perimeter))for(const sign of [-1,1]){
        const angle=c.j===0||c.j===h.layout.zs.length-1?0:Math.PI/2;
        const m=new THREE.Matrix4().makeRotationY(angle+(sign<0?Math.PI:0));m.setPosition(c.headX,c.topY-lane.guang*f,c.headZ);
        timber.add(corbel,placement.clone().multiply(m),timberColor,.85,0,43);
      }corbel.dispose();
      if(hero||paintShape){
        const z=-h.layout.depth*.28,height=h.layout.spec.columnHeight-.30;
        for(let i=0;i<h.layout.xs.length-1;i++){
          const left=h.layout.xs[i],right=h.layout.xs[i+1],width=right-left-.12;
          const g=new THREE.BoxGeometry(width,height,.10),size=[];
          for(let j=0;j<g.attributes.position.count;j++)size.push(width,height);
          g.setAttribute('memberSize',new THREE.Float32BufferAttribute(size,2));
          const m=new THREE.Matrix4().makeTranslation((left+right)/2,.15+height/2,z);
          timber.add(g,placement.clone().multiply(m),matColor.window,.90,0,46);g.dispose();
          // inferred: raised jambs and a low panel rail catch light in front of
          // the recessed door faces instead of painting an empty dark box.
          for(const dx of [-width/2+.035,width/2-.035]){
            const frame=new THREE.BoxGeometry(.07,height,.10),mm=new THREE.Matrix4().makeTranslation((left+right)/2+dx,.15+height/2,z+.10);
            timber.add(frame,placement.clone().multiply(mm),timberColor,.85,0,43);frame.dispose();
          }
          const rail=new THREE.BoxGeometry(width,.075,.10),rm=new THREE.Matrix4().makeTranslation((left+right)/2,1.2,z+.10);
          timber.add(rail,placement.clone().multiply(rm),timberColor,.85,0,43);rail.dispose();
        }
        // inferred: a pale projecting slab below the existing gallery rails.
        const cap=new THREE.BoxGeometry(h.layout.width+1.6,.13,.38),m=new THREE.Matrix4().makeTranslation(0,-.02,h.layout.depth/2+.45);
        batches.stone.add(cap,placement.clone().multiply(m),'#c8b9a0');cap.dispose();
      }
      if(specOverride?.roof==='xuanshan'){
        // inferred: the open connecting galleries have the same two-bar rail
        // and raised posts as the existing terraces, above a pale stone edge.
        const width=h.layout.width,z=h.layout.depth/2+.25;
        for(const y of [.28,.83]){
          const g=new THREE.BoxGeometry(width,.10,.10),m=new THREE.Matrix4().makeTranslation(0,y,z);
          timber.add(g,placement.clone().multiply(m),timberColor,1,0,43);g.dispose();
        }
        for(let x=-width/2;x<=width/2;x+=1.35){
          const g=new THREE.BoxGeometry(.13,1.08,.14),m=new THREE.Matrix4().makeTranslation(x,.54,z);
          timber.add(g,placement.clone().multiply(m),timberColor,1,0,43);g.dispose();
        }
        const g=new THREE.BoxGeometry(width+.2,.13,.34),m=new THREE.Matrix4().makeTranslation(0,-.08,z);
        batches.stone.add(g,placement.clone().multiply(m),'#c8b9a0');g.dispose();
      }
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
    for(const [key,instances]of bracketInstances){const mesh=instances.mesh(paintMaterial(time,'timber',{profile}),'hall-brackets-'+key);if(mesh)engine.add(mesh,{castShadow:false,receiveShadow:false});}
    for(const [instances,family,name]of [[caps,'roof','hall-drip-tiles'],[rafters,'timber','hall-rafter-ends']]){
      const mesh=instances.mesh(paintMaterial(time,family,{profile}),name);if(mesh)engine.add(mesh,{castShadow:false,receiveShadow:false});
    }
    for(const m of Object.values(tempMaterials))m.dispose();
    for(const h of hallTemplates.values())for(const group of [h.lod0,h.lod1,h.lod2])group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)o.geometry.dispose();});
    ornaments.lod0.dispose();ornaments.lod1.dispose();
  };
  return {hall,dispose};
}
