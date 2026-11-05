import * as THREE from 'three';

// D3's shared recipe. q and size are metres; finish controls joint strength,
// inter-stone contrast, internal wash strength, and joint wandering. Frequencies
// and tiny edge wear are inferred; the restricted value range follows the brief.
export const PAINTED_STONE_GLSL = /* glsl */`
vec3 paintedStone(vec3 base,vec2 q,vec2 size,vec4 finish,vec2 jointWidths){
  float wander=noise(q*.7)-.5;
  float course=floor(q.y/size.y+wander*finish.w);
  vec2 p=vec2(q.x/size.x+hash21(vec2(course,3.))*.7+(noise(q*1.3)-.5)*finish.w,
              q.y/size.y+wander*finish.w);
  vec2 id=floor(p),f=fract(p);
  float h=hash21(id+course),h2=hash21(id+course+7.);
  float d=min(min(f.x,1.-f.x)*size.x,min(f.y,1.-f.y)*size.y);
  float width=mix(jointWidths.x,jointWidths.y,noise(q*5.));
  float aa=max(fwidth(d)*1.5,.01);
  float resolved=1.-smoothstep(.45,1.25,max(fwidth(p.x),fwidth(p.y)));
  float joint=(1.-smoothstep(width,width+aa,d))*resolved;
  float tone=1.+(h-.5)*finish.y*resolved;
  float coarse=noise(q*1.1+h*40.)-.5,fine=noise(q*3.7+h*90.)-.5;
  float fineFade=1.-smoothstep(.6,1.4,max(length(dFdx(q*3.7)),length(dFdy(q*3.7))));
  tone*=1.+coarse*finish.z*.62+fine*finish.z*.38*fineFade;
  vec3 mineral=mix(vec3(1.03,1.,.96),vec3(.96,.98,1.04),noise(q*.9+h2*30.));
  float microFade=1.-smoothstep(.55,1.3,max(length(dFdx(q*8.3)),length(dFdy(q*8.3))));
  float mineralDab=noise(q*vec2(7.1,8.3)+h2*19.)-.5;
  mineral*=vec3(1.)+vec3(.10,.025,-.13)*mineralDab*microFade;
  // inferred: soft granulated deposits inside the stone, stronger than the
  // small difference between stones, with no sharp coloured fleck overlay.
  float deposit=smoothstep(.25,.75,noise(q*vec2(5.5,7.8)+h*11.))-.5;
  float depositPatch=.40+.60*smoothstep(.30,.75,noise(q*.7+h2*4.));
  tone*=1.+deposit*finish.z*.35*microFade*depositPatch;
  float worn=(1.-smoothstep(.035,.13,d))*noise(q*vec2(2.3,3.1)+h2)*resolved;
  vec3 stone=base*tone*mineral*(1.+worn*.055*min(1.,finish.x*2.));
  return mix(stone,stone*vec3(.42,.38,.36),joint*finish.x);
}
vec3 paintedStone(vec3 base,vec2 q,vec2 size,vec4 finish){return paintedStone(base,q,size,finish,vec2(.012,.040));}
`;

// inferred: broad flat faces meet narrow chipped arrises, rather than inflated
// rounded cubes. This section is shared by coping, rails and stacked bollards.
export function beveledBox(size,bevel=.035,seed=0){
  const [w,h,d]=size,b=Math.min(bevel,w*.16,h*.22,d*.16),p=[],idx=[];
  for(const [y,inset]of [[-h/2,b],[-h/2+b,0],[h/2-b,0],[h/2,b]]){
    const x=w/2-inset,z=d/2-inset;
    const c=Array.from({length:4},(_,i)=>Math.min(b*(.82+.18*(1+Math.sin(seed*3.1+i*7.7))),x*.35,z*.35));
    for(const [xx,zz]of [[-x,-z+c[0]],[-x+c[0],-z],[x-c[1],-z],[x,-z+c[1]],[x,z-c[2]],[x-c[2],z],[-x+c[3],z],[-x,z-c[3]]])p.push(xx,y,zz);
  }
  for(let row=0;row<3;row++)for(let i=0;i<8;i++){
    const a=row*8+i,b=row*8+(i+1)%8;idx.push(a,a+8,b,b,a+8,b+8);
  }
  for(let i=1;i<7;i++)idx.push(0,i,i+1,24,25+i,24+i);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();
  const uv=[],paint=[],pos=flat.attributes.position,n=flat.attributes.normal;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const a=Math.abs(n.getY(i))>.65?[x+w/2,z+d/2,w,d]:Math.abs(n.getX(i))>.65?[z+d/2,y+h/2,d,h]:[x+w/2,y+h/2,w,h];
    paint.push(a[0],a[1]);uv.push(a[0]/a[2],a[1]/a[3]);
  }
  flat.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));flat.setAttribute('paintUV',new THREE.Float32BufferAttribute(paint,2));return flat;
}

// inferred: close quay blocks have small missing chips along their arrises,
// with broad dressed faces between them. Extra edge samples are confined to
// the kerb and mooring blocks; the shared masonry geometry remains unchanged.
export function chippedQuayBlock(size,seed=0){
  const [w,h,d]=size,b=Math.min(.035,h*.12),outline=[[-w/2,-d/2+b],[-w/2+b,-d/2],[w/2-b,-d/2],[w/2,-d/2+b],[w/2,d/2-b],[w/2-b,d/2],[-w/2+b,d/2],[-w/2,d/2-b]],ring=[];
  for(let i=0;i<outline.length;i++){
    const a=outline[i],z=outline[(i+1)%outline.length],steps=Math.max(1,Math.ceil(Math.hypot(z[0]-a[0],z[1]-a[1])/.22));
    for(let j=0;j<steps;j++)ring.push([THREE.MathUtils.lerp(a[0],z[0],j/steps),THREE.MathUtils.lerp(a[1],z[1],j/steps)]);
  }
  const p=[],indices=[],count=ring.length;
  for(let row=0;row<4;row++)for(const [x,z]of ring){
    const chip=.008+.024*(.5+.5*Math.sin(x*53.7+z*41.3+seed*7.1+row*2.9));
    const inset=row===0||row===3?b+chip:chip*.20;
    p.push(x-Math.sign(x)*inset*Math.pow(Math.abs(x)/(w/2),6),
      [-h/2,-h/2+b,h/2-b,h/2][row]-(row===3?chip*.45:0),
      z-Math.sign(z)*inset*Math.pow(Math.abs(z)/(d/2),6));
  }
  for(let row=0;row<3;row++)for(let i=0;i<count;i++){
    const a=row*count+i,z=row*count+(i+1)%count;indices.push(a,a+count,z,z,a+count,z+count);
  }
  p.push(0,-h/2,0,0,h/2,0);
  for(let i=0;i<count;i++)indices.push(count*4,i,(i+1)%count,count*4+1,count*3+(i+1)%count,count*3+i);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();
  const uv=[],pos=flat.attributes.position,n=flat.attributes.normal;
  for(let i=0;i<pos.count;i++)uv.push(Math.abs(n.getY(i))>.65?pos.getX(i):Math.abs(n.getX(i))>.65?pos.getZ(i):pos.getX(i),Math.abs(n.getY(i))>.65?pos.getZ(i):pos.getY(i));
  flat.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return flat;
}

// inferred: quiet warm stone palette, tiny construction variation and chipped
// post corners. Shared construction helpers accept another scene's dimensions.
export function stoneBlocks(stone,reflected,rng,{palette=['#cbb997','#c8b694','#cebc9a','#c9b795'],copingColor='#c7b99f'}={}){
  const sample=(p,s,ao=1,yaw=0,coping=false,pigmentOverride)=>{
    const pos=p.map(v=>v+rng.range(-.018,.018)),pigment=rng.pick(palette),angle=yaw+rng.range(-.007,.007);
    const color=pigmentOverride||(coping?new THREE.Color(copingColor).multiplyScalar(rng.range(.88,1.06)):pigment);
    return {pos,color,angle};
  };
  const block=(p,s,ao=1,yaw=0,coping=false,pigmentOverride,paintKind=null)=>{
    const {pos,color,angle}=sample(p,s,ao,yaw,coping,pigmentOverride);
    stone.box(pos,s,color,ao,angle,coping||s[1]>.3||paintKind===37,paintKind);reflected.box(pos,s,color,ao,angle,false,paintKind);
  };
  block.sample=sample;return block;
}

// inferred: shallow irregular arrises along a continuous shaft soften its
// outline. Courses remain in the recipe so their joints do not become gaps.
export function pierShaft(seed=0){
  const ring=[[-.5,-.44],[-.44,-.5],[.44,-.5],[.5,-.44],[.5,.44],[.44,.5],[-.44,.5],[-.5,.44]];
  const p=[],uv=[],index=[];
  for(let row=0;row<7;row++)for(let i=0;i<ring.length;i++){
    const [x,z]=ring[i],chip=1-.012*(1+Math.sin(i*19.1+row*3.7+seed*7.3));
    p.push(x*chip,row/6-.5,z*chip);uv.push(i/8,row/6);
  }
  for(let row=0;row<6;row++)for(let i=0;i<8;i++){const a=row*8+i,b=row*8+(i+1)%8;index.push(a,b,a+8,b,b+8,a+8);}
  for(let i=1;i<7;i++)index.push(48,48+i,49+i,0,i+1,i);
  for(let i=0;i<index.length;i+=3){const b=index[i+1];index[i+1]=index[i+2];index[i+2]=b;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;
}

export function chippedPost({width,height,rng}){
  const ring=[[-.5,-.37],[-.37,-.5],[.37,-.5],[.5,-.37],[.5,.37],[.37,.5],[-.37,.5],[-.5,.37]];
  const points=[],uv=[],indices=[];
  for(let row=0;row<3;row++)for(const [x,z]of ring){
    const inset=row===2?.84:1;
    points.push(x*width*inset+rng.range(-.018,.018),row===0?0:height*(row===1?.90:1)+rng.range(-.025,.015),z*width*inset+rng.range(-.018,.018));
    uv.push(x*width,row===0?0:height*(row===1?.90:1));
  }
  for(let row=0;row<2;row++)for(let i=0;i<8;i++){const a=row*8+i,b=row*8+(i+1)%8;indices.push(a,b,a+8,b,b+8,a+8);}
  for(let i=1;i<7;i++)indices.push(16,16+i,17+i,0,i+1,i);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
  const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;
}
