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

// Select source members without changing the source hall or its other LODs.
function members(geometry,columns){
  const types=geometry.attributes.memberType,index=geometry.index?.array;
  const accept=typeof columns==='function'?columns:i=>(types.getX(i)===4)===columns;
  const chosen=[],map=new Map(),indices=[];
  for(let i=0;i<(index?.length??types.count);i+=3){
    const a=index?index[i]:i;if(!accept(a))continue;
    for(let j=0;j<3;j++){
      const old=index?index[i+j]:i+j;
      if(!map.has(old)){map.set(old,chosen.length);chosen.push(old);}indices.push(map.get(old));
    }
  }
  const result=new THREE.BufferGeometry();
  for(const [name,attribute]of Object.entries(geometry.attributes)){
    const data=[];for(const i of chosen)for(let j=0;j<attribute.itemSize;j++)data.push(attribute.array[i*attribute.itemSize+j]);
    result.setAttribute(name,new THREE.Float32BufferAttribute(data,attribute.itemSize));
  }
  result.setIndex(indices);return result;
}

// Source-based Song roof/bracket construction; inferred pigment, tower hall
// proportions and LOD selection are parameters shared with later painted scenes.
export function paintedHalls(engine,batches,reflected,{time,view0,profile='zhouqiao',timberColor='#bd6236',ornamentHeight=1.8,heroSpec={},smallSpec={},palette={},smallOrnamentScale=1,heroPaint=null,smallPaint=null,tileProfile=false,ornamentProfile='source'}={}){
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
  if(profile==='zhouqiao'||profile==='xuande'){
    const uv=capSource.attributes.uv;
    capSource.setAttribute('paintDetail',new THREE.Float32BufferAttribute(Array.from({length:uv.count},(_,i)=>[uv.getX(i),uv.getY(i),2,0]).flat(),4));
  }
  const caps=new PaintInstances(capSource,51),rafters=new PaintInstances(rafterSource,43);
  capSource.dispose();rafterSource.dispose();
  const camera=new THREE.PerspectiveCamera(view0.fov,1920/1080,.15,900);
  camera.position.fromArray(view0.pos);camera.lookAt(...view0.target);camera.updateMatrixWorld();

  function hall(pos, scale = 1, hero = false, distant = false,specOverride=null) {
    const key=JSON.stringify([hero,specOverride]);
    if(!hallTemplates.has(key))hallTemplates.set(key,buildHall({ frontBays: hero ? [3.8, 4.6, 3.8] : [3.2, 3.8, 3.2], sideBays: [3.3, 3.3],
      columnHeight: hero ? 3.1 : 3.6, roof: 'wudian', klass: 'diange', caiGrade: hero ? 3 : 5,
      tiao: 2, bayFill: hero ? 'lattice' : 'wall', enclosedBrackets: true, ...(hero?heroSpec:smallSpec),...specOverride,materials: tempMaterials }, engine, tempMaterials));
    const h=hallTemplates.get(key);
    const paintShape=hero?heroPaint:(!distant&&!specOverride?smallPaint:null);
    const roofDatum=h.layout.spec.columnHeight+bracketHeight(h.layout.spec)+.25;
    const model=roofModel(h.layout),f=fen(h.layout.spec.caiGrade),bh=bracketHeight(h.layout.spec);
    const placement = new THREE.Matrix4().makeScale(scale, scale, scale); placement.setPosition(...pos);
    const end=model.point('south',1,model.tEnd),left=new THREE.Vector3(...model.point('south',-1,model.tEnd)).applyMatrix4(placement).project(camera);
    const right=new THREE.Vector3(...end).applyMatrix4(placement).project(camera),pixels=Math.abs(right.x-left.x)*960;
    // D2b: authored once from view 0, never changed by the moving camera. The
    // main hall has 60 rows, towers 40; inferred: smaller roofs use a 5 px rhythm,
    // with a hard floor of 3 px per row at the client's 1920x1080 resolution.
    const rows=Math.max(1,Math.min(hero?(profile==='xuande'?60:40):Math.round(pixels/5),Math.floor(pixels/3)));
    const pitch=Math.abs(end[0])*2/rows;
    // inferred: lower the frame while its roof and upper bearing datum stay
    // fixed. The main band grows to the brief's .95 of the column height.
    // inferred: .60 on the narrow pavilions keeps their sets proportional to
    // their smaller bays rather than stretching their two-tier corner fans.
    const frameRatio=hero?.95:.60;
    const frameDrop=paintShape?Math.max(0,(h.layout.spec.columnHeight*frameRatio-bh)/(1+frameRatio)):0;
    const ridgePaths=[[[-model.r,model.baseY+model.sectionY(0),0],[model.r,model.baseY+model.sectionY(0),0]]];
    if(model.kind!=='xuanshan')for(const side of ['south','north'])for(const u of [-1,1])ridgePaths.push(model.rows(side,1).map(t=>model.point(side,u,t)));
    const shapeGeometry=(g,k)=>{
      if(!paintShape&&k!=='tile'&&k!=='ridge')return k==='timber'?g.clone():g;
      const copy=g.clone(),p=copy.attributes.position;
      if(k==='tile'){
        const tiles=copy.attributes.tileCoord,uv=[],detail=[];
        for(let i=0;i<p.count;i++){
          uv.push(tiles.getX(i)*.26/pitch,tiles.getW(i));
          detail.push(tiles.getX(i)*.26/pitch+rows*.5,tiles.getY(i),tiles.getZ(i),tiles.getW(i));
        }
        copy.setAttribute('paintUV',new THREE.Float32BufferAttribute(uv,2));
        copy.setAttribute('paintDetail',new THREE.Float32BufferAttribute(detail,4));
      }
      // inferred: stout paint-only columns retain the source lean/taper and
      // grid; ridge cross-sections grow without moving their authored paths.
      const types=copy.attributes.memberType,ridgeDetail=[];
      for(let i=0;i<p.count;i++){
        if(k==='ridge'){
          // inferred: keep every ridge path, thicken its existing stacked
          // section 1.7x vertically and 1.35x across, anchored to the tile bed.
          const v=new THREE.Vector3().fromBufferAttribute(p,i);let distance=Infinity,nearest;
          for(const path of ridgePaths)for(let j=1;j<path.length;j++){
            const a=new THREE.Vector3(...path[j-1]),b=new THREE.Vector3(...path[j]),d=b.clone().sub(a);
            const t=THREE.MathUtils.clamp(((v.x-a.x)*d.x+(v.z-a.z)*d.z)/Math.max(.0001,d.x*d.x+d.z*d.z),0,1),q=a.addScaledVector(d,t);
            const score=(v.x-q.x)**2+(v.z-q.z)**2;if(score<distance){distance=score;nearest=q;}
          }
          p.setXYZ(i,nearest.x+(v.x-nearest.x)*1.35,nearest.y+.115+(v.y-nearest.y-.115)*1.7,nearest.z+(v.z-nearest.z)*1.35);
          if(profile==='zhouqiao'){
            // inferred: taper the stacked hip courses together over their
            // last .65 m. A vertex morph leaves accepted views 5/6 intact.
            const tipDistance=Math.min(...ridgePaths.slice(1).map(path=>Math.hypot(v.x-path.at(-1)[0],v.z-path.at(-1)[2])));
            // Retain four percent of the section between courses so the
            // tapered faces never become coplanar under camera drift.
            const t=THREE.MathUtils.smoothstep(tipDistance,.05,.65),drop=Math.max(0,p.getY(i)-nearest.y-.22)*.96*(1-t);
            ridgeDetail.push(0,-drop,0,2);
          }
        }
        if(types?.getX(i)===4&&paintShape){
          const y=p.getY(i);let nearest,dist=Infinity;
          for(const c of h.layout.columns){const d=(p.getX(i)-c.x)**2+(p.getZ(i)-c.z)**2;if(d<dist){dist=d;nearest=c;}}
          const c=nearest,t=(y-c.baseY)/(c.topY-c.baseY),x=c.x+(c.headX-c.x)*t,z=c.z+(c.headZ-c.z)*t;
          p.setX(i,x+(p.getX(i)-x)*1.25);p.setZ(i,z+(p.getZ(i)-z)*1.25);
          p.setY(i,y-frameDrop*t);
        }else if(k==='timber'&&frameDrop&&p.getY(i)>h.layout.spec.columnHeight-35*f&&p.getY(i)<h.layout.spec.columnHeight+.3&&Math.abs(p.getX(i))<h.layout.width/2+.3&&Math.abs(p.getZ(i))<h.layout.depth/2+.3){
          p.setY(i,p.getY(i)-frameDrop);
        }
        if(paintShape&&types?.getX(i)!==4&&p.getY(i)>roofDatum-.4)p.setY(i,roofDatum+(p.getY(i)-roofDatum)*(paintShape.roofStretch||1));
      }
      if(k==='ridge'&&profile==='zhouqiao')copy.setAttribute('paintDetail',new THREE.Float32BufferAttribute(ridgeDetail,4));
      copy.computeVertexNormals();return copy;
    };
    const visibleHall=distant?h.lod2:h.lod1;
    visibleHall.updateMatrixWorld(true);
    visibleHall.traverse(o => {
      if (!o.isMesh) return;
      const k = o.material.name;
      const source=k==='timber'&&!distant?members(o.geometry,false):o.geometry;
      const g=shapeGeometry(source,k);
      if((profile==='zhouqiao'||profile==='xuande')&&k==='timber'&&g.attributes.tileCoord){
        const old=g.attributes.paintPart,part=Array.from({length:g.attributes.position.count},(_,i)=>old?.getX(i)??(paintShape?34:0));
        const index=g.index?.array,count=index?.length??g.attributes.position.count;
        // A categorical material tag must agree across each triangle,
        // including the zero-uphill vertices on the final eave row.
        for(let j=0;j<count;j+=3){
          const tri=[0,1,2].map(k=>index?index[j+k]:j+k);
          if(tri.some(i=>g.attributes.tileCoord.getW(i)>.0001&&g.attributes.normal.getY(i)<.1))
            for(const i of tri)part[i]=101;
        }
        g.setAttribute('paintPart',new THREE.Float32BufferAttribute(part,1));
      }
      batches[matFamily[k]].add(g, placement.clone().multiply(o.matrixWorld),heroPaint&&hero&&k==='bracket'?'#593d34':matColor[k],k==='window'?.72:1,0,k==='tile'?50:k==='ridge'?57:k==='window'?46:k==='timber'?(paintShape?33:47):(profile==='zhouqiao'||profile==='xuande')&&k==='bracket'?100:profile==='zhouqiao'&&hero&&k==='plaster'?103:(k==='bracket'&&paintShape?26:null));if(g!==source)g.dispose();if(source!==o.geometry)source.dispose();
    });
    if(!distant){
      // Real sixteen-sided source 梭柱, with their smooth radial normals;
      // replace only the eight-sided LOD1 columns, preserving the rest of it.
      const source=members(h.lod0.children.find(o=>o.material?.name==='timber').geometry,true),g=shapeGeometry(source,'timber');
      timber.add(g,placement,matColor.timber,1,0,paintShape?33:47);if(g!==source)g.dispose();source.dispose();
    }
    h.lod2.updateMatrixWorld(true);
    h.lod2.traverse(o=>{
      if(o.isMesh){const k=o.material.name;const g=shapeGeometry(o.geometry,k);reflected[matFamily[k]].add(g,placement.clone().multiply(o.matrixWorld),matColor[k],k==='window'?.72:1,0,k==='tile'?50:k==='ridge'?57:(k==='timber'&&paintShape?33:k==='bracket'&&paintShape?26:null));if(g!==o.geometry)g.dispose();}
    });
    if (!distant) for (const s of h.layout.sets) {
      if(!hero&&!paintShape&&s.side==='north'&&s.kind!=='zhuanjiao')continue;
      const source = bracketGeometry(!hero?{...h.layout.spec,shadowProxy:true}:h.layout.spec, s.kind);
      // D2b: the smaller palace set is one source 栌枓 on its V bearing,
      // rather than another complete multi-tier pyramid between the columns.
      const bearing=paintShape&&s.kind==='bujian';
      const g=bearing?members(source,i=>source.attributes.memberType.getX(i)===2&&source.attributes.position.getY(i)<20*f+.001):source;
      const m = new THREE.Matrix4().makeRotationY(s.angle); m.setPosition(s.x, s.y-frameDrop, s.z);
      // inferred: paint-only feature scale. Main structural clusters dominate
      // the facade; the source's smaller bujian sets sit behind them.
      if(paintShape){
        const bay=(s.side==='south'||s.side==='north'?h.layout.width/h.layout.spec.frontBays.length:h.layout.depth/h.layout.spec.sideBays.length);
        const width=bay*.60/(104*f),height=(bh+frameDrop)/bh,small=s.kind==='bujian',bearingScale=bay*.60/(3*32*f);
        m.scale(small?new THREE.Vector3(bearingScale,bearingScale,bearingScale):new THREE.Vector3(width,height,1));
        if(small){m.elements[12]+=Math.sin(s.angle)*.35;m.elements[14]+=Math.cos(s.angle)*.35;m.elements[13]+=.40;}
      }
      const key=source.userData.batchKey+(bearing?':bearing':'');
      if(!bracketInstances.has(key)){
        const detail=g.clone(),part=detail.attributes.memberType,size=detail.attributes.memberSize,tags=[];
        for(let i=0;i<part.count;i++)tags.push(part.getX(i)===2?41:part.getX(i)===3?42:
          part.getX(i)===1&&Math.abs(size.getX(i)/f-62)<.1?44:
          part.getX(i)===1&&Math.abs(size.getY(i)/f-21)<.1?45:40);
        detail.setAttribute('paintPart',new THREE.Float32BufferAttribute(tags,1));
        if(profile==='zhouqiao'||profile==='xuande'){
          const uv=detail.attributes.memberUV||detail.attributes.uv,info=[];
          for(let i=0;i<part.count;i++)info.push(uv.getX(i),uv.getY(i),size.getX(i),detail.attributes.position.getY(i)/bh);
          detail.setAttribute('paintDetail',new THREE.Float32BufferAttribute(info,4));
        }
        bracketInstances.set(key,new PaintInstances(detail,40));detail.dispose();
      }
      const pigment=new THREE.Color(palette.bracket||'#bb805f');if(s.kind==='bujian')pigment.multiplyScalar(1.08);
      bracketInstances.get(key).add(placement.clone().multiply(m),pigment);
      if(g!==source)g.dispose();
      if(s.kind==='bujian'){
        // inferred: a light inverted-V bearing strut beneath each smaller set.
        const xx=s.x+(bearing?Math.sin(s.angle)*.35:0),zz=s.z+(bearing?Math.cos(s.angle)*.35:0);
        const tip=[xx,s.y-frameDrop+(bearing?.40:.02),zz],axis=s.side==='east'||s.side==='west'?[0,1]:[1,0];
        for(const sign of [-1,1]){
          const foot=[xx+axis[0]*sign*18*f,s.y-frameDrop+(bearing?.02:-22*f),zz+axis[1]*sign*18*f];
          const a=new THREE.Vector3(...foot),b=new THREE.Vector3(...tip);
          const beam=new THREE.BoxGeometry(7*f,a.distanceTo(b),7*f);
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
        const p=point(side,u,model.tEnd-.035-j*.055,.77),nub=new THREE.BoxGeometry(.20,.27,.19);
        if(profile==='zhouqiao'){
          // These three inferred plain blocks caused the stepped silhouette.
          // Keep their accepted geometry for views 5/6 and the depth proxy.
          const info=new Float32Array(nub.attributes.position.count*4);
          for(let i=0;i<nub.attributes.position.count;i++)info[i*4+3]=3;
          nub.setAttribute('paintDetail',new THREE.Float32BufferAttribute(info,4));
        }
        batches.roof.add(nub,placement.clone().multiply(new THREE.Matrix4().makeTranslation(...p)),matColor.ridge,1,0,51);nub.dispose();
      }
      // Flat corbels connect the two existing source-sized ties to the columns.
      const lane=laneFen(h.layout.spec.hasBujian),corbel=profilePrism([[0,0],[34*f,0],[34*f,-5*f],[21*f,-13*f],[0,-13*f]],10*f);
      for(const c of h.layout.columns.filter(c=>c.perimeter))for(const sign of [-1,1]){
        const angle=c.j===0||c.j===h.layout.zs.length-1?0:Math.PI/2;
        const m=new THREE.Matrix4().makeRotationY(angle+(sign<0?Math.PI:0));m.setPosition(c.headX,c.topY-frameDrop-lane.guang*f,c.headZ);
        timber.add(corbel,placement.clone().multiply(m),timberColor,.85,0,43);
      }corbel.dispose();
      if(hero||paintShape){
        const z=-h.layout.depth*.28,height=h.layout.spec.columnHeight-frameDrop-.30;
        for(let i=0;i<h.layout.xs.length-1;i++){
          const left=h.layout.xs[i],right=h.layout.xs[i+1],width=right-left-.12;
          const g=new THREE.BoxGeometry(width,height,.10),size=[];
          for(let j=0;j<g.attributes.position.count;j++)size.push(width,height);
          g.setAttribute('memberSize',new THREE.Float32BufferAttribute(size,2));
          const m=new THREE.Matrix4().makeTranslation((left+right)/2,.15+height/2,z);
          timber.add(g,placement.clone().multiply(m),matColor.window,.90,0,profile==='xuande'?58:46);g.dispose();
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
