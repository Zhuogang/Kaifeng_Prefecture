/* Reflection camera adaptation from athenaion.
MIT License

Copyright (c) 2026 Leon Lin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import * as THREE from 'three';
import { GeometryBatch } from '../yingzao/geometry.js';
import { ATMO } from '../core/atmosphere.js';
import { SKY } from '../core/sky.js';
import { SUN } from '../core/lighting.js';

// Adapted from athenaion's MIT planar reflection camera. The reflected scene contains
// baked LOD1 architecture and hulls, never the full city or any shadow-rendering pass.
export class RiverReflection {
  constructor(engine,level) {
    this.engine=engine;this.level=level;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera();
    // inferred: 320 px preview / 512 px high reflection, intentionally softly filtered.
    const width=engine.quality.detail>=1?512:320,height=Math.round(width*engine.height/engine.width);
    this.target=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,colorSpace:THREE.LinearSRGBColorSpace,
      minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:true,depthBuffer:true,stencilBuffer:false});
    this.target.texture.name='bianhe-planar-reflection';
    this.uniforms={riverReflection:{value:this.target.texture},riverReflectionMatrix:{value:new THREE.Matrix4()},riverReflectionOn:{value:0},riverReflectionPixel:{value:new THREE.Vector2(1/width,1/height)}};
    this.sun=new THREE.DirectionalLight();this.scene.add(this.sun,this.sun.target);
    this.sky=engine.sky.clone();this.sky.castShadow=false;this.scene.add(this.sky);
    this.sources=[];this.dirty=true;this.materials=new Map();this.geometry=new THREE.Group();this.scene.add(this.geometry);
    this.key='';this.renders=0;this.lastStats={calls:0,triangles:0};
  }
  register(root){this.sources.push(root);this.dirty=true;}
  reflectionMaterial(source) {
    if(this.materials.has(source))return this.materials.get(source);
    const material=source.clone();material.onBeforeCompile=source.onBeforeCompile;
    material.defaultAttributeValues=source.defaultAttributeValues;
    material.defines={...source.defines};
    for(const key of ['USE_CSM','CSM_CASCADES','CSM_FADE'])delete material.defines[key];
    material.customProgramCacheKey=()=>`${source.userData.shaderKey||source.type}:river-reflection-no-shadows`;
    material.needsUpdate=true;this.materials.set(source,material);return material;
  }
  bake() {
    const batches=new Map();
    const visit=o=>{
      if(o.userData.reflectionSkip)return;
      if(o.isLOD){visit(o.levels[Math.min(1,o.levels.length-1)].object);return;}
      if(o.isMesh&&o.material?.colorWrite!==false) {
        const material=o.userData.reflectionMaterial||o.material;
        if(!batches.has(material))batches.set(material,new GeometryBatch());
        for(let i=0;i<(o.isInstancedMesh?o.count:1);i++) {
          const local=new THREE.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(i,local);
          batches.get(material).add(o.geometry,o.matrixWorld.clone().multiply(local));
        }
      }
      for(const child of o.children)visit(child);
    };
    for(const source of this.sources){source.updateWorldMatrix(true,true);visit(source);}
    for(const child of [...this.geometry.children]){child.geometry.dispose();this.geometry.remove(child);}
    for(const [material,batch] of batches) {
      const mesh=batch.mesh(this.reflectionMaterial(material),'reflection-LOD1');mesh.castShadow=false;mesh.receiveShadow=false;this.geometry.add(mesh);
    }
    this.dirty=false;
  }
  update(renderer,camera) {
    if(this.inPass||camera.position.y<this.level+0.025)return;
    if(this.bounds) {
      const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      if(!frustum.intersectsBox(this.bounds))return;
    }
    const key=[...camera.matrixWorld.elements,...camera.projectionMatrix.elements.slice(0,6),this.engine.time,
      SUN.intensity,...SUN.color.toArray(),...SUN.dir.toArray()].map(v=>Math.round(v*10000)).join(',');
    if(key===this.key&&!this.dirty)return;
    this.inPass=true;
    if(this.dirty)this.bake();
    const normal=new THREE.Vector3(0,1,0),vc=this.camera;
    const position=new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld),target=position.clone().add(camera.getWorldDirection(new THREE.Vector3()));
    position.y=2*this.level-position.y;target.y=2*this.level-target.y;
    vc.position.copy(position);vc.up.set(0,1,0).transformDirection(camera.matrixWorld).reflect(normal);vc.lookAt(target);
    vc.near=camera.near;vc.far=camera.far;vc.updateMatrixWorld(true);vc.projectionMatrix.copy(camera.projectionMatrix);
    vc.projectionMatrix.elements[8]=vc.projectionMatrix.elements[9]=0;
    vc.projectionMatrix.elements[0]/=1.12;vc.projectionMatrix.elements[5]/=1.12;
    const clip=new THREE.Plane(normal,-this.level).applyMatrix4(vc.matrixWorldInverse);
    const c=new THREE.Vector4(clip.normal.x,clip.normal.y,clip.normal.z,clip.constant),P=vc.projectionMatrix.elements;
    const q=new THREE.Vector4((Math.sign(c.x)+P[8])/P[0],(Math.sign(c.y)+P[9])/P[5],-1,(1+P[10])/P[14]);
    c.multiplyScalar(2/c.dot(q));P[2]=c.x;P[6]=c.y;P[10]=c.z+1-0.01;P[14]=c.w;
    vc.projectionMatrixInverse.copy(vc.projectionMatrix).invert();
    this.uniforms.riverReflectionMatrix.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
    this.scene.environment=this.engine.scene.environment;
    this.sun.color.copy(SUN.color);this.sun.intensity=SUN.intensity;this.sun.position.copy(SUN.dir).multiplyScalar(1000);this.sun.target.position.set(0,0,0);
    const old={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),
      shadows:renderer.shadowMap.enabled,xr:renderer.xr.enabled,atmo:ATMO.uAtmoEnabled.value,disk:SKY.uSunDisk?.value,
      viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest()};
    const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles;
    try {
      renderer.shadowMap.enabled=false;renderer.xr.enabled=false;ATMO.uAtmoEnabled.value=0;
      if(SKY.uSunDisk)SKY.uSunDisk.value=0;
      renderer.setRenderTarget(this.target);renderer.setScissorTest(false);renderer.clear(true,true,false);renderer.render(this.scene,vc);
      this.lastStats={calls:renderer.info.render.calls-calls,triangles:renderer.info.render.triangles-triangles};
      this.uniforms.riverReflectionOn.value=1;this.key=key;this.renders++;
    } finally {
      renderer.setRenderTarget(old.target,old.face,old.mip);renderer.setViewport(old.viewport);renderer.setScissor(old.scissor);renderer.setScissorTest(old.scissorTest);
      renderer.shadowMap.enabled=old.shadows;renderer.xr.enabled=old.xr;ATMO.uAtmoEnabled.value=old.atmo;
      if(SKY.uSunDisk)SKY.uSunDisk.value=old.disk;this.inPass=false;
    }
  }
}
