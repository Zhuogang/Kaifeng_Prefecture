import * as THREE from 'three';
import { GeometryBatch } from '../yingzao/geometry.js';
import { proceduralMaterial } from '../core/materials.js';
import { stoneMaterial } from '../materials/stone.js';
import { addStoneBlock } from './stonework.js';

// inferred: open, flat-bottomed, four-strake timber hulls drawn from 清明上河图.
// Strakes are continuous solid planks; slim internal ribs do not form the hull skin.
function ribbon(batch,lower,upper,thickness,size) {
  const n=lower.length,p=[],uv=[],idx=[];
  for(let side=0;side<2;side++)for(let i=0;i<n;i++)for(const a of [lower[i],upper[i]]) {
    const sign=Math.sign(a[2]);p.push(a[0],a[1],a[2]-side*thickness*sign);uv.push(i/(n-1),a===lower[i]?0:1);
  }
  const add=(a,b,c,d)=>idx.push(a,b,c,b,d,c);
  for(let i=0;i<n-1;i++) {
    const a=i*2,b=a+2,k=n*2;
    add(a,a+1,b,b+1);add(a+k,b+k,a+1+k,b+1+k);
    add(a,b,a+k,b+k);add(a+1,a+1+k,b+1,b+1+k);
  }
  add(0,n*2,1,n*2+1);add((n-1)*2,(n-1)*2+1,(n-1)*2+n*2,(n-1)*2+n*2+1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  batch.add(g,undefined,{size});g.dispose();
}

export function buildBoats(engine,river) {
  const wood=new GeometryBatch(),rope=new GeometryBatch(),stone=new GeometryBatch();
  for(const [number,boat] of river.boats.entries()) {
    const [cx,cy,cz]=boat.position,L=boat.length,W=boat.width;
    const local=new GeometryBatch(),placement=new THREE.Matrix4().makeRotationY(boat.yaw);placement.setPosition(cx,cy,cz);
    const half=s=>W/2*(1-.72*Math.abs(s)**3),sheer=s=>.18*Math.abs(s)**3;
    const hull=(s,t,side)=>[s*L/2,-.24+sheer(s)+t*.69,side*half(s)*(.57+.43*t)];
    const samples=40;
    for(const side of [-1,1])for(let plank=0;plank<4;plank++) {
      const lower=[],upper=[],t0=plank/4+.005,t1=(plank+1)/4-.005;
      for(let i=0;i<=samples;i++){const s=-1+i/samples*2;lower.push(hull(s,t0,side));upper.push(hull(s,t1,side));}
      ribbon(local,lower,upper,.038,[L,.17]);
    }
    // Closed longitudinal bottom boards and thick end transoms.
    for(let j=0;j<6;j++) {
      const a=[],b=[];
      for(let i=0;i<=samples;i++) {
        const s=-1+i/samples*2,z0=half(s)*.57*(-1+2*j/6),z1=half(s)*.57*(-1+2*(j+1)/6);
        a.push([s*L/2,-.24+sheer(s),z0+.003]);b.push([s*L/2,-.24+sheer(s),z1-.003]);
      }
      // A solid shallow prism per strip; the end seams remain visible from inside.
      for(let i=0;i<samples;i++){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a[i],...a[i+1],...b[i],...b[i+1]],3));g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();local.add(g,undefined,{size:[L,W/6]});g.dispose();}
    }
    for(const s of [-1,1])for(let j=0;j<4;j++) {
      const y=-.24+sheer(s)+(j+.5)/4*.69,width=half(s)*2*(.57+.43*(j+.5)/4);
      local.box([s*(L/2-.035),y,0],[.075,.69/4-.008,width]);
    }
    // Continuous gunwales, seven slim ribs, and four broad transverse seats.
    for(const side of [-1,1])for(let i=0;i<samples;i++)local.beam(hull(-1+i/samples*2,1,side),hull(-1+(i+1)/samples*2,1,side),.075,.08);
    for(let i=-3;i<=3;i++) {
      const s=i/4,x=s*L/2,base=-.18+sheer(s),floor=half(s)*.53;
      local.beam([x,base,-floor],[x,base,floor],.046,.060);
      for(const side of [-1,1])local.beam([x,base,side*floor],[x,.38+sheer(s),side*half(s)*.94],.046,.060);
    }
    for(const s of [-.63,-.22,.22,.63])local.box([s*L/2,.27+sheer(s),0],[.25,.068,half(s)*1.78]);
    const hullGeometry=local.geometry();wood.add(hullGeometry,placement);hullGeometry.dispose();
    // A low mooring block projecting from each bank provides a real stone bollard,
    // beside the berth rather than a rope pulled three metres up the retaining wall.
    const side=Math.sign(cz-river.center[2]),bank=river.center[2]+side*(river.width/2-.95),bx=cx-L*.42;
    addStoneBlock(stone,[bx,cy+.02,bank],[1.35,.48,1.9],number+8);
    addStoneBlock(stone,[bx,cy+.56,bank-side*.35],[.32,.72,.32],number+21);
    addStoneBlock(stone,[bx,cy+.95,bank-side*.35],[.40,.16,.40],number+71);
    const tie=new THREE.Vector3(bx,cy+.76,bank-side*.35),boatTie=new THREE.Vector3(-L*.37,.42,half(-.74)*side).applyMatrix4(placement);
    const middle=boatTie.clone().lerp(tie,.5);middle.y-=.15;
    const curve=new THREE.CatmullRomCurve3([boatTie,middle,tie]);
    const tube=new THREE.TubeGeometry(curve,24,.020,6,false);rope.add(tube);tube.dispose();
    const coil=new THREE.TorusGeometry(.215,.022,6,28);coil.rotateX(Math.PI/2);coil.translate(bx,cy+.80,bank-side*.35);rope.add(coil);coil.dispose();
  }
  const material=proceduralMaterial({name:'river-boat-weathered-planks',params:{roughness:.82,side:THREE.DoubleSide},
    vertexHead:'attribute vec2 memberUV,memberSize; varying vec2 boatUV;',vertexPre:'boatUV=memberUV*memberSize;',head:'varying vec2 boatUV;',
    color:`float grain=cgVnoise2(boatUV*vec2(1.7,135.0));float streak=cgVnoise2(boatUV*vec2(.4,22.0));
      float aged=cgVnoise3(cgP*2.7);float wet=1.0-smoothstep(${river.waterY.toFixed(2)},${(river.waterY+.4).toFixed(2)},cgP.y);
      diffuseColor.rgb=mix(vec3(.085,.055,.027),vec3(.25,.17,.082),streak)*(0.85+grain*.28)*(0.8+aged*.30)*(1.0-wet*.45);`,
    normal:`float g=cgVnoise2(boatUV*vec2(1.7,100.0));cgBump=vec3(0.0,(g-.5)*.055,0.0);`});
  material.defaultAttributeValues={memberUV:[0,0],memberSize:[1,1]};
  const hemp=proceduralMaterial({name:'river-hemp-rope',params:{color:0x817052,roughness:1},color:'diffuseColor.rgb*=.8+.25*cgVnoise3(cgP*95.0);'});
  const group=new THREE.Group();group.name='moored-plank-boats';
  const ropes=rope.mesh(hemp,'hemp-moorings');ropes.castShadow=false;ropes.userData.castShadow=false;ropes.userData.reflectionSkip=true;
  group.add(wood.mesh(material,'solid-plank-hulls'),ropes,stone.mesh(stoneMaterial(engine,{waterline:river.waterY,polished:.15,wear:.9}),'stone-mooring-bollards'));
  engine.add(group);return group;
}
