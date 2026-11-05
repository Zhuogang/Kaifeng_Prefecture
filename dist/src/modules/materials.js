import * as THREE from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { tileMaterial } from '../materials/tile.js';
import { timberMaterial } from '../materials/timber.js';
import { masonryMaterial } from '../materials/masonry.js';
import { stoneMaterial } from '../materials/stone.js';
import { pavingMaterial } from '../materials/paving.js';
import { plasterMaterial } from '../materials/plaster.js';
import { metalMaterial } from '../materials/metal.js';
import { paintMaterial,setMemberAttributes } from '../yingzao/paint.js';
import { chiwei,juquezi,chuishou,dunshou,wadang,dishui,doorStuds,goulan,chazi,ornamentTriangles } from '../yingzao/ornament.js';

// inferred: this isolated diagnostic yard is not world placement. All fixtures are permanent;
// no geometry/material reads the chosen test view. Dimensions and arrangement are inferred.
function block(engine,size,position,material) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);engine.add(mesh);return mesh;
}
function display(engine,geometry,material,position,name) {
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);engine.add(mesh);return mesh;
}
function roofCoupon(width=1.4,height=1.9) {
  // Geometric 筒瓦 ribs keep their silhouette; the attribute supplies seams and edging.
  const nx=112,ny=24,p=[],indices=[],uv=[],tc=[];
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++) {
    const x=(i/nx-0.5)*width,y=j/ny*height;
    const rib=Math.pow(Math.max(0,Math.cos((x+width/2)/0.20*Math.PI*2)),0.7)*0.045;
    p.push(x,y,rib);uv.push(i/nx,j/ny);
    tc.push((x+width/2)/0.20,y/0.30,Math.min(x+width/2,width/2-x,y,height-y),y);
    if(i<nx&&j<ny){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,b,c,b,d,c);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('tileCoord',new THREE.Float32BufferAttribute(tc,4));
  g.setIndex(indices);g.computeVertexNormals();return g;
}
function sampleGong(length,height,depth) {
  // inferred: isolated rolled-end paint coupon, not a replacement for T1 construction.
  const s=new THREE.Shape();s.moveTo(-length/2,height/2);s.lineTo(length/2,height/2);
  s.lineTo(length/2,height*0.1);s.bezierCurveTo(length*0.43,-height*0.05,length*0.36,-height*0.48,length*0.22,-height/2);
  s.lineTo(-length*0.22,-height/2);s.bezierCurveTo(-length*0.36,-height*0.48,-length*0.43,-height*0.05,-length/2,height*0.1);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:3,bevelSize:0.006,bevelThickness:0.006,curveSegments:16}).translate(0,0,-depth/2);
  const edge=s.getPoints(50);
  const subdivided = new TessellateModifier(0.06, 7).modify(g);
  g.dispose();
  return setMemberAttributes(subdivided,{type:'gong',size:[length,height],
    uvAt:(x,y)=>[x/length+0.5,y/height+0.5],
    edgeAt:(x,y)=>{
      let distance=Infinity;
      for(let i=1;i<edge.length;i++) {
        const a=edge[i-1],b=edge[i],dx=b.x-a.x,dy=b.y-a.y;
        const t=THREE.MathUtils.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
        distance=Math.min(distance,Math.hypot(x-a.x-dx*t,y-a.y-dy*t));
      }return distance;
    }});
}

/** build registers the material kit only; district modules decide all world placement. */
export async function build(engine) {
  engine.registry.materials={tile:tileMaterial,timber:timberMaterial,masonry:masonryMaterial,stone:stoneMaterial,
    paving:pavingMaterial,plaster:plasterMaterial,metal:metalMaterial,paint:paintMaterial};
}

export async function test(engine) {
  await build(engine);
  const materials={
    green:tileMaterial(engine),grey:tileMaterial(engine,{variant:'grey'}),
    jianbian:tileMaterial(engine,{variant:'jianbian',edgingWidth:0.26}),
    timber:timberMaterial(engine),masonry:masonryMaterial(engine,{topY:2.25,baseY:0.15,batter:0.12}),
    stone:stoneMaterial(engine,{waterline:0.65,polished:0.2}),
    plaster:plasterMaterial(engine,{baseY:0.15}),gold:metalMaterial(engine),iron:metalMaterial(engine,{variant:'iron'}),
    paving:pavingMaterial(engine),brick:pavingMaterial(engine,{variant:'brick'}),
  };
  const neutral=stoneMaterial(engine,{wear:0.12,polished:0.0,tint:0xc6bba9});
  // The long ground coupon exposes distant filtering at a grazing angle.
  block(engine,[1200,0.10,1200],[0,-0.15,0],neutral);
  block(engine,[32,0.12,560],[0,-0.07,0],materials.paving);
  block(engine,[10,0.125,560],[21,-0.07,0],materials.brick);
  const keys=['green','grey','jianbian','timber','masonry','stone','plaster','gold','iron','paving','brick'];
  keys.forEach((name,i)=>{
    const x=(i-5)*1.55;
    block(engine,[1.48,0.15,0.72],[x,0.075,0],neutral);
    if(i<3) {
      block(engine,[1.4,1.9,0.10],[x,1.1,-0.04],materials.grey);
      display(engine,roofCoupon(),materials[name],[x,0.15,0.04],name);
    } else if(name==='timber') {
      display(engine,new THREE.CylinderGeometry(0.26,0.3,2.1,64,12),materials[name],[x,1.2,0],name);
      block(engine,[1.35,0.27,0.35],[x,2.15,0],materials[name]);
    } else {
      const geo=new THREE.BoxGeometry(1.4,2.1,0.45,1,12,1);
      if(name==='masonry') {const p=geo.attributes.position;for(let k=0;k<p.count;k++)p.setZ(k,p.getZ(k)-Math.sign(p.getZ(k))*(p.getY(k)+1.05)*0.10);geo.computeVertexNormals();}
      const couponMaterial = ['paving','brick'].includes(name)
        ? pavingMaterial(engine,{variant:name==='brick' ? 'brick' : 'bluestone',
          layout:'vec4 pavingLayout(vec3 p) { return vec4(p.x,p.y,10000.0,10000.0); }'})
        : materials[name];
      display(engine,geo,couponMaterial,[x,1.2,0],name);
    }
  });
  // Repeat complete courses over broad walls; stable numeric variation differs per wall.
  block(engine,[25,4,0.6],[-22,2,-40],masonryMaterial(engine,{topY:4,variation:13}));
  block(engine,[25,4,0.6],[10,2,-40],plasterMaterial(engine,{variation:19}));

  const glaze=tileMaterial(engine,{ribbed:false,wear:0.5}),report={};
  const shapes={chiwei:chiwei(),juquezi:juquezi(),chuishou:chuishou(),dunshou:dunshou(),wadang:wadang(),dishui:dishui()};
  for(const [name,pair] of Object.entries(shapes))report[name]={lod0:ornamentTriangles(pair.lod0),lod1:ornamentTriangles(pair.lod1)};
  block(engine,[1.35,1.45,0.8],[0,0.725,-12],neutral);
  display(engine,shapes.chiwei.lod0,glaze,[0,1.45,-12],'chiwei');
  block(engine,[1.7,0.45,0.75],[-2.1,0.225,-12],neutral);
  display(engine,shapes.chuishou.lod0,glaze,[-2.6,0.45,-12],'chuishou');
  const animals=new THREE.InstancedMesh(shapes.dunshou.lod0,glaze,3);
  for(let i=0;i<3;i++)animals.setMatrixAt(i,new THREE.Matrix4().makeTranslation(-2.1+i*0.35,0.45,-12));engine.add(animals);
  display(engine,shapes.juquezi.lod0,materials.gold,[-1.5,0.65,-12],'juquezi');
  for(const [name,x] of [['wadang',-2.5],['dishui',-2.0]])display(engine,shapes[name].lod0,glaze,[x,0.24,-11.61],name);
  const assemblies={
    door:doorStuds(engine,{width:1.8,height:2.5}),
    goulan:goulan(engine,{path:[[-5,0,-12],[-3.2,0,-12],[-3.2,0.25,-14.2]]}),
    chazi:chazi(engine,{path:[[-3,0,-16],[0,0,-16]]}),
    blackChazi:chazi(engine,{path:[[1,0,-16],[4,0,-16]],variant:'black'}),
  };
  assemblies.door.lod0.position.set(2.2,0,-12);assemblies.door.lod1.position.copy(assemblies.door.lod0.position);
  for(const [name,pair] of Object.entries(assemblies)) {
    report[name]={lod0:ornamentTriangles(pair.lod0),lod1:ornamentTriangles(pair.lod1)};engine.add(pair.lod0);
  }
  // All LOD1 ornaments are present as a second row, so compilation/rendering exercises both.
  for(const [name,pair] of Object.entries(shapes)) {
    const i=Object.keys(shapes).indexOf(name);display(engine,pair.lod1,glaze,[-3+i*1.2,0,-18],name+'-lod1');
  }
  for(const pair of Object.values(assemblies)) {pair.lod1.position.z-=7;engine.add(pair.lod1);}

  const paintCosts={};
  for(const [i,style] of ['wucai','nianyu','danfen'].entries()) {
    const material=paintMaterial(engine,{style,wear:0.8,variation:i*7});paintCosts[style]=material.userData.shaderCost;
    const group=new THREE.Group();group.position.set((i-1)*3.1,0,-28);
    const column=new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.24,1.1,48),materials.timber);column.position.y=0.55;group.add(column);
    for(let level=0;level<3;level++) {
      const w=1.1+level*0.35,h=0.24;
      const mesh=new THREE.Mesh(sampleGong(w,h,0.25),material);mesh.position.y=1.2+level*0.33;group.add(mesh);
      const dou=new THREE.Mesh(setMemberAttributes(new THREE.BoxGeometry(0.28,0.14,0.33),{type:'dou',size:[0.28,0.14]}),material);
      dou.position.y=1.4+level*0.33;group.add(dou);
    }
    const beam=new THREE.Mesh(setMemberAttributes(new THREE.BoxGeometry(2.7,0.38,0.35,24,6,1),{type:'beam',size:[2.7,0.38]}),material);
    beam.position.y=2.3;group.add(beam);engine.add(group);
  }
  console.log('[T2] ornament triangles '+JSON.stringify(report));
  console.log('[T2] shader costs '+JSON.stringify({...Object.fromEntries(Object.entries(materials).map(([k,m])=>[k,m.userData.shaderCost])),...paintCosts}));
  engine.registry.materialValidation={report,materials};
  engine.groundHeight=()=>0;
  return {views:[
    {pos:[0,3.0,8],target:[0,1.0,0],fov:80},
    {pos:[-1.6,1.5,2.25],target:[-1.5,1.15,0.2],fov:65},
    {pos:[0,1.6,200],target:[0,1.4,0],fov:38},
    {pos:[0,2.1,-8],target:[0,1.45,-12],fov:72},
    {pos:[0,0.7,0],target:[0,2.45,-12],fov:14},
    {pos:[0,2.1,-20],target:[0,1.6,-28],fov:44},
    // Additional distance/offset validation, with exactly the same complete yard.
    {pos:[0,1.6,500],target:[0,1.4,0],fov:38},
    {pos:[0.05,1.6,200.05],target:[0.05,1.4,0.05],fov:38},
  ]};
}
