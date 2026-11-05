import * as THREE from 'three';

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

// inferred: eight-sided chamfered ashlar has a flat lit front and narrow shaded
// arrises. Twenty-eight triangles suffice for the bridge's middle-distance blocks.
export function pierCourse(seed=0){
  const ring=[[-.5,-.44],[-.44,-.5],[.44,-.5],[.5,-.44],[.5,.44],[.44,.5],[-.44,.5],[-.5,.44]];
  const p=[],uv=[],index=[];
  for(let row=0;row<2;row++)for(let i=0;i<ring.length;i++){
    const [x,z]=ring[i],chip=1-.006*(1+Math.sin(i*19.1+seed*7.3));
    p.push(x*chip,row-.5,z*chip);uv.push(i/8,row);
  }
  for(let i=0;i<8;i++){const j=(i+1)%8;index.push(i,j,i+8,j,j+8,i+8);}
  for(let i=1;i<7;i++)index.push(8,8+i,9+i,0,i+1,i);
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
