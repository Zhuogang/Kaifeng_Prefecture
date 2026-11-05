import * as THREE from 'three';
import { NOISE_GLSL } from '../core/glsl.js';
import { ATMO } from '../core/atmosphere.js';

// A world-space volume represented by three perpendicular families of depth-tested slices.
// Each family's optical step is spacing*abs(ray.normal); over a ray their weights sum to
// ray.x²+ray.y²+ray.z² = 1. No depth-texture feedback or camera-facing fog cards are needed.
export function buildCourtMist(engine, court) {
  const bottom=court.center[1],height=4.8;
  const lo=new THREE.Vector3(court.center[0]-court.width/2,bottom,court.center[2]-court.depth/2);
  const hi=new THREE.Vector3(court.center[0]+court.width/2,bottom+height,court.center[2]+court.depth/2);
  const time={value:engine.time},stepData=[],matrices=[];
  const matrix=(p,scale,rotation)=>new THREE.Matrix4().compose(new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));
  // inferred: 4 m horizontal quadrature, 0.3 m vertical quadrature, and a 1 m humidity scale height.
  for(const axis of ['x','z','y']) {
    const length=hi[axis]-lo[axis],n=Math.ceil(length/(axis==='y'?.3:4)),step=length/n;
    for(let i=0;i<n;i++) {
      const coordinate=lo[axis]+(i+.5)*step;
      const p=[court.center[0],bottom+height/2,court.center[2]];
      if(axis==='x') {p[0]=coordinate;matrices.push(matrix(p,[court.depth,height,1],[0,Math.PI/2,0]));}
      else if(axis==='z'){p[2]=coordinate;matrices.push(matrix(p,[court.width,height,1],[0,0,0]));}
      else {p[1]=coordinate;matrices.push(matrix(p,[court.width,court.depth,1],[-Math.PI/2,0,0]));}
      stepData.push(step);
    }
  }
  const geometry=new THREE.PlaneGeometry(1,1);
  geometry.setAttribute('mistStep',new THREE.InstancedBufferAttribute(new Float32Array(stepData),1));
  const material=new THREE.ShaderMaterial({
    name:'palace-ground-mist',transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uMin:{value:lo},uMax:{value:hi},uTime:time,uMistColor:ATMO.uMistColor,
      uSunColor:ATMO.uSunColor,uSunDir:ATMO.uSunDir},
    vertexShader:`attribute float mistStep;varying vec3 vWorld,vPlaneNormal;varying float vStep;
      void main(){vec4 p=instanceMatrix*vec4(position,1.0);vWorld=(modelMatrix*p).xyz;
        vPlaneNormal=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);vStep=mistStep;
        gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
    fragmentShader:`precision highp float;varying vec3 vWorld,vPlaneNormal;varying float vStep;
      uniform vec3 uMin,uMax,uMistColor,uSunColor,uSunDir;uniform float uTime;
      ${NOISE_GLSL}
      void main(){
        vec2 edge=min(vWorld.xz-uMin.xz,uMax.xz-vWorld.xz);
        float boundary=smoothstep(0.0,12.0,min(edge.x,edge.y));
        float humidity=exp(-max(0.0,vWorld.y-uMin.y));
        float top=1.0-smoothstep(3.5,4.8,vWorld.y-uMin.y);
        float noise=cgVnoise3(vec3(vWorld.x*.055,vWorld.y*.13,vWorld.z*.055)+vec3(uTime*.015,0,0));
        // inferred: sparse drifting banks over cool, damp court flags; optical density is per metre.
        float density=.03*(.2+.8*smoothstep(.2,.75,noise))*humidity*top*boundary;
        vec3 ray=normalize(vWorld-cameraPosition);
        float opacity=1.0-exp(-density*vStep*abs(dot(ray,vPlaneNormal)));
        if(opacity<.00001)discard;
        // Constant live-lit scattering colour makes layer ordering immaterial.
        vec3 scatter=uMistColor*.95+uSunColor*max(0.0,uSunDir.y)*.25;
        gl_FragColor=vec4(scatter,opacity);
      }`,
  });
  material.forceSinglePass=true; // Each quad has no interior; one double-sided pass is sufficient.
  material.userData.noPatch=true;
  const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);mesh.name='palace-ground-mist-volume';
  matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  mesh.renderOrder=20;engine.add(mesh,{castShadow:false,receiveShadow:false});
  engine.onUpdate(t=>{time.value=t;});
  return mesh;
}
