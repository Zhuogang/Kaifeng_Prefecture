import * as THREE from 'three';

// A canopy card is a plane. Keep its four corners, UVs, colour and cutout rather than
// four coplanar quads. The close public LOD0 retains the full wind subdivision.
function cardCorners(geometry) {
  const kind=geometry.attributes.aFlora,origin=geometry.attributes.aOrigin,uv=geometry.attributes.uv;
  const cards=new Map(),indices=[],source=geometry.index.array;
  for(let i=0;i<source.length;i+=3)
    if(kind.getX(source[i])<4.5)indices.push(source[i],source[i+1],source[i+2]);
  for(let i=0;i<kind.count;i++)if(kind.getX(i)>4.5) {
    const u=uv.getX(i),v=uv.getY(i);
    if((u!==0&&u!==1)||(v!==0&&v!==1))continue;
    const key=[origin.getX(i),origin.getY(i),origin.getZ(i),kind.getX(i),kind.getZ(i)].join(':');
    if(!cards.has(key))cards.set(key,[]);cards.get(key)[u+v*2]=i;
  }
  for(const [a,b,c,d]of cards.values())if([a,b,c,d].every(Number.isInteger))indices.push(a,b,c,b,d,c);
  geometry.setIndex(indices);return geometry;
}

// Preview keeps the public crown cards, with simpler middle-distance tessellation and
// crown/trunk shadow silhouettes. Every near LOD0 and still-quality tree stays unchanged.
export function preparePreviewTrees(engine, flora) {
  if(engine.quality.detail>=1)return;
  const old=flora.meshes[1].geometry,middle=cardCorners(old.clone());
  flora.meshes[1].geometry=middle;flora.stats.lodTriangles[1]=middle.index.count/3;old.dispose();
  const geometry=cardCorners(flora.model.lod2.clone()),count=flora.items.length;
  geometry.setAttribute('iFlora',new THREE.InstancedBufferAttribute(new Float32Array(count*4),4));
  const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:THREE.DoubleSide});
  material.userData.noPatch=true;
  const shadow=new THREE.InstancedMesh(geometry,material,count);
  shadow.name='palace-tree-shadow-crowns';shadow.castShadow=true;shadow.receiveShadow=false;
  shadow.customDepthMaterial=flora.meshes[2].customDepthMaterial;
  flora.items.forEach((item,i)=>{
    shadow.setMatrixAt(i,item.matrix);geometry.attributes.iFlora.set(item.variation,i*4);
  });
  shadow.instanceMatrix.needsUpdate=true;shadow.computeBoundingSphere();
  for(const mesh of flora.meshes){mesh.castShadow=false;mesh.userData.castShadow=false;}
  flora.group.add(shadow);
}
