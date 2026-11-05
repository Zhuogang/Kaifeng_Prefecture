import * as THREE from 'three';

// inferred: quiet warm stone palette, tiny construction variation and chipped
// post corners. Shared construction helpers accept another scene's dimensions.
export function stoneBlocks(stone,reflected,rng,{palette=['#cbb997','#c8b694','#cebc9a','#c9b795'],copingColor='#c7b99f'}={}){
  return (p,s,ao=1,yaw=0,coping=false,pigmentOverride)=>{
    const pos=p.map(v=>v+rng.range(-.018,.018)),pigment=rng.pick(palette),angle=yaw+rng.range(-.007,.007);
    const color=pigmentOverride||(coping?new THREE.Color(copingColor).multiplyScalar(rng.range(.88,1.06)):pigment);
    stone.box(pos,s,color,ao,angle,coping||s[1]>.3);reflected.box(pos,s,color,ao,angle);
  };
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
