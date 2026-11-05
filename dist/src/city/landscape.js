import * as THREE from 'three';
import { proceduralMaterial } from '../core/materials.js';
import { CITY, BIANHE } from '../world/plan.js';
import { GeometryBatch } from '../yingzao/geometry.js';

// Cut only the extension; T6's bank, reflection, water level and central kilometre
// remain authoritative. Actual terrain triangles are clipped, including shadows.
export function extendRiver(engine) {
  const ground=engine.registry.ground, r=BIANHE, end=CITY.outerExtent;
  if(ground) {
    const old=ground.geometry,p=old.attributes.position,index=old.index?.array,out=[];
    const emit=poly=>{for(let i=1;i<poly.length-1;i++)for(const v of [poly[0],poly[i],poly[i+1]])out.push(...v);};
    const clip=(poly,axis,value,sign)=>{
      const inside=[],outside=[];
      for(let i=0;i<poly.length;i++) {
        const a=poly[i],b=poly[(i+1)%poly.length],da=(a[axis]-value)*sign,db=(b[axis]-value)*sign;
        (da>=0?inside:outside).push(a);
        if((da>=0)!==(db>=0)) { const t=da/(da-db),v=a.map((n,k)=>n+(b[k]-n)*t);inside.push(v);outside.push(v); }
      }
      return [inside,outside];
    };
    for(let i=0;i<(index?.length??p.count);i+=3) {
      let remaining=[[0,1,2].map(j=>{const k=index?index[i+j]:i+j;return [p.getX(k),p.getY(k),p.getZ(k)];})];
      for(const sign of [-1,1]) {
        const a=sign<0?-end:r.halfLength,b=sign<0?-r.halfLength:end,next=[];
        for(let poly of remaining) {
          for(const plane of [[0,a,1],[0,b,-1],[2,r.center[2]-r.width/2,1],[2,r.center[2]+r.width/2,-1]]) {
            const [inside,outside]=clip(poly,...plane);if(outside.length>=3)next.push(outside);poly=inside;if(poly.length<3)break;
          }
        }
        remaining=next;
      }
      remaining.forEach(emit);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));g.computeVertexNormals();
    ground.geometry=g;old.dispose();
  }
  const waterBatch=new GeometryBatch(),banks=new GeometryBatch();
  for(const sign of [-1,1]) {
    const length=end-r.halfLength,x=sign*(r.halfLength+end)/2;
    const g=new THREE.PlaneGeometry(length,r.width);g.rotateX(-Math.PI/2);g.translate(x,r.waterY,r.center[2]);waterBatch.add(g);g.dispose();
    for(const bank of [-1,1])banks.box([x,(r.bankY+r.bedY)/2,r.center[2]+bank*(r.width/2+.5)],[length,r.bankY-r.bedY,1]);
    engine.footprints.addRect(x,r.center[2],length/2,r.width/2,0,'city-river');
  }
  // inferred: same silt-green body albedo as T6, with environment reflection at far distance.
  const material=proceduralMaterial({name:'far-bianhe-water',type:'physical',
    params:{roughness:.17,ior:1.333},color:'diffuseColor.rgb=vec3(.047,.064,.025)*(0.90+0.20*cgVnoise2(cgP.xz*.38));'});
  const water=waterBatch.mesh(material,'far-bianhe');engine.add(water,{castShadow:false});
  const bankMaterial=engine.registry.bianhe?.group.children.find(m=>m.name==='dressed-bank-courses')?.material;
  const bank=banks.mesh(bankMaterial||proceduralMaterial({params:{color:0x636960,roughness:.94}}),'far-bianhe-banks');
  engine.add(bank,{castShadow:false});
  const previous=engine.groundHeight?.bind(engine)||(()=>0);
  engine.groundHeight=(x,z)=>Math.abs(x)>r.halfLength&&Math.abs(x)<end&&Math.abs(z-r.center[2])<r.width/2?r.bedY:previous(x,z);
  return {water,bank};
}

export function farmland(engine) {
  const batch=new GeometryBatch(),inner=CITY.outerExtent,outer=CITY.farmlandExtent;
  // inferred: a flat mosaic of strips, ditches and cultivated plots beyond the suburbs.
  for(const sign of [-1,1]) {
    const width=outer-inner,center=sign*(outer+inner)/2;
    for(const [x,z,w,d] of [[center,0,width,outer*2],[0,center,inner*2,width]]) {
      const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);g.translate(x,.52,z);batch.add(g);g.dispose();
    }
  }
  const material=proceduralMaterial({name:'farmland-patches',params:{roughness:.98},color:`
    vec2 q=cgP.xz+vec2(23.0*sin(cgP.z*.0017),18.0*sin(cgP.x*.0013));
    vec2 cell=floor(q/vec2(165.0,86.0)),f=fract(q/vec2(165.0,86.0));
    float seed=cgHash12(cell),edge=min(min(f.x,1.0-f.x)*165.0,min(f.y,1.0-f.y)*86.0);
    diffuseColor.rgb=mix(vec3(.15,.13,.067),vec3(.12,.18,.065),seed);
    diffuseColor.rgb*=mix(.58,1.0,smoothstep(.5,2.2,edge));
    float lines=sin(q.y*6.283/1.7),fp=fwidth(q.y);
    diffuseColor.rgb*=1.0+.06*lines*(1.0-smoothstep(.3,2.0,fp));
  `});
  const mesh=batch.mesh(material,'fields-to-horizon');engine.add(mesh,{castShadow:false});return mesh;
}

export function cityGround(engine) {
  const p=CITY,r=BIANHE,palace=p.palaceReservation;
  // inferred: a raised, flat urban dirt/brick grade; it clears the plain's ±0.5 m
  // relief, while the existing palace, avenue, quays and river retain their own grade.
  const material=proceduralMaterial({name:'urban-lanes-and-courts',params:{roughness:.97},color:`
    if(abs(cgP.x)<${p.avenueHalfWidth.toFixed(2)} && cgP.z>=0.0 && cgP.z<=${p.south.toFixed(2)})discard;
    if(abs(cgP.x)<${palace.halfWidth.toFixed(2)} && cgP.z>=${palace.north.toFixed(2)} && cgP.z<=${palace.south.toFixed(2)})discard;
    if(abs(cgP.z-${r.center[2].toFixed(2)})<${(r.width/2+r.quayWidth).toFixed(2)})discard;
    float dirt=cgVnoise2(cgP.xz*.06);
    float inner=1.0-smoothstep(1300.0,1550.0,max(abs(cgP.x),abs(cgP.z)));
    diffuseColor.rgb=mix(vec3(.10,.12,.06),vec3(.115,.107,.087),inner)*(.82+.32*dirt);
  `});
  const geometry=new THREE.PlaneGeometry(p.outerExtent*2,p.outerExtent*2);geometry.rotateX(-Math.PI/2);
  geometry.translate(0,p.surfaceY,0);const mesh=new THREE.Mesh(geometry,material);mesh.name='urban-grade';engine.add(mesh,{castShadow:false});
  const previous=engine.groundHeight?.bind(engine)||(()=>0);
  engine.groundHeight=(x,z)=> {
    const avenue=Math.abs(x)<p.avenueHalfWidth&&z>=0&&z<=p.south;
    const pal=Math.abs(x)<palace.halfWidth&&z>=palace.north&&z<=palace.south;
    if(!avenue&&!pal&&Math.abs(x)<p.outerExtent&&Math.abs(z)<p.outerExtent&&Math.abs(z-r.center[2])>r.width/2+r.quayWidth)return p.surfaceY;
    return previous(x,z);
  };
  return mesh;
}
