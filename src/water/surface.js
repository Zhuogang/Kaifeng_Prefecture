import * as THREE from 'three';
import { proceduralMaterial } from '../core/materials.js';
import { ZHOUQIAO } from '../world/plan.js';
import { RiverReflection } from './reflection.js';

/** Calm, optically thick silty water, with a cached low-resolution planar reflection
 * of the same world, Fresnel, and deterministic ripple normals. */
export function createRiverSurface(engine, river) {
  // inferred: optical coefficients, ripple wavelengths, slopes and roughness are visual reconstruction.
  const time={value:engine.time},reflection=new RiverReflection(engine,river.waterY);
  reflection.bounds=new THREE.Box3(new THREE.Vector3(-river.halfLength,river.waterY-.01,river.center[2]-river.width/2),new THREE.Vector3(river.halfLength,river.waterY+.01,river.center[2]+river.width/2));
  const boatCuts=river.boats.map(b=>`{
    vec2 delta=cgP.xz-vec2(${b.position[0].toFixed(4)},${b.position[2].toFixed(4)});
    float s=(delta.x*${Math.cos(b.yaw).toFixed(6)}-delta.y*${Math.sin(b.yaw).toFixed(6)})/${(b.length/2).toFixed(4)};
    float across=delta.x*${Math.sin(b.yaw).toFixed(6)}+delta.y*${Math.cos(b.yaw).toFixed(6)};
    if(abs(s)<0.985 && abs(across)<${(b.width/2).toFixed(4)}*(1.0-0.72*pow(abs(s),3.0))-0.035)discard;
  }`).join('\n');
  const mat=proceduralMaterial({ name:'bianhe-silt-water',type:'physical',
    params:{roughness:0.17,metalness:0,ior:1.333,color:0xffffff},
    uniforms:{...reflection.uniforms,riverTime:time,riverCentre:{value:river.center[2]},riverHalfWidth:{value:river.width/2},riverBridge:{value:new THREE.Vector4(ZHOUQIAO.dimensions.width/2,ZHOUQIAO.center[2],ZHOUQIAO.dimensions.span/2,ZHOUQIAO.pierSpacing)}},
    head:`uniform float riverTime,riverCentre,riverHalfWidth,riverReflectionOn;
      uniform sampler2D riverReflection;uniform mat4 riverReflectionMatrix;uniform vec2 riverReflectionPixel;
      vec3 riverNormal;uniform vec4 riverBridge;
      float riverContact(vec3 p) {
        float d=max(0.0,riverHalfWidth-abs(p.z-riverCentre)-0.40);
        if(abs(p.x)<=riverBridge.x+.35&&abs(p.z-riverBridge.y)<=riverBridge.z+.35) {
          vec2 grid=mod(vec2(p.x+riverBridge.x,p.z-riverBridge.y+riverBridge.z)+riverBridge.w*.5,riverBridge.w)-riverBridge.w*.5;
          float pier=length(max(abs(grid)-vec2(.31,.34),vec2(0.0)));
          d=min(d,pier);
        }
        return exp(-d*4.0);
      }
      vec3 riverPlanar(vec3 p) {
        vec4 projected=riverReflectionMatrix*vec4(p,1.0);vec2 uv=projected.xy/projected.w;
        uv+=riverNormal.xz*0.060;
        vec2 pixel=riverReflectionPixel*0.65;
        // inferred: unresolved capillary waves spread the reflected radiance over
        // a roughness cone. Preserve the reflection's mean energy, soften its
        // dark/light stripes; the actual stone is never sampled through this filter.
        vec3 resolved=(textureLod(riverReflection,uv+pixel,0.8).rgb
          +textureLod(riverReflection,uv-pixel,0.8).rgb)*0.5;
        vec3 scattered=textureLod(riverReflection,uv,2.5).rgb;
        return mix(resolved,scattered,0.35);
      }`,
    color:`${boatCuts} float edge=riverHalfWidth-abs(cgP.z-riverCentre);
      float depth=2.2*(1.0-exp(-max(edge,0.0)*1.8));
      // inferred: suspended sediment varies along slow east-west currents; these
      // optical coefficients are independent of lighting, exposure and viewpoint.
      vec2 flow=cgP.xz-vec2(riverTime*.03,0.0);
      float silt=cgVfbm2(flow*vec2(.045,.16),3);
      vec3 bed=vec3(0.12,0.103,0.052),body=mix(vec3(.043,.059,.031),vec3(.081,.071,.038),smoothstep(.28,.72,silt));
      vec3 trans=exp(-mix(vec3(1.9,1.35,2.5),vec3(2.5,1.8,2.6),silt)*depth);
      diffuseColor.rgb=mix(body,bed,trans)*(0.94+0.12*cgVnoise2(cgP.xz*.38))*(1.0-riverContact(cgP)*.55);`,
    normal:`vec2 q=cgP.xz*vec2(2.4,9.0)+vec2(riverTime*0.07,riverTime*0.02);
      float fp=max(length(dFdx(q)),length(dFdy(q)));
      float h=(cgVnoise2(q)-0.5)*0.003*(1.0-smoothstep(0.4,1.5,fp));
      h+=(cgVnoise2(q*2.7+vec2(19.3,6.7))-0.5)*0.0007*(1.0-smoothstep(0.3,1.0,fp*2.7));
      // inferred: two low capillary wave trains with an east-west component.
      // Cross-river noise alone barely perturbs reflection/Fresnel along the current.
      float waveA=dot(cgP.xz,vec2(14.0,1.8))+riverTime*.8;
      float waveB=dot(cgP.xz,vec2(25.0,-4.0))-riverTime*1.1;
      h+=sin(waveA)*.0045*(1.0-smoothstep(1.0,3.0,fwidth(waveA)));
      h+=sin(waveB)*.0018*(1.0-smoothstep(1.0,3.0,fwidth(waveB)));
      vec3 dx=dFdx(cgP),dy=dFdy(cgP),n=vec3(0,1,0),r1=cross(dy,n),r2=cross(n,dx);
      float det=dot(dx,r1);vec3 grad=sign(det)*(dFdx(h)*r1+dFdy(h)*r2);
      riverNormal=normalize(max(abs(det),1e-9)*n-grad);cgBump=riverNormal-n;`,
    roughness:'roughnessFactor=0.085+0.07*smoothstep(0.05,0.7,length(fwidth(cgP.xz)));',
  });
  const compile=mat.onBeforeCompile;
  mat.onBeforeCompile=(shader,renderer)=>{
    compile(shader,renderer);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
      float fresnel=0.0204+0.9796*pow(1.0-clamp(dot(normalize(riverNormal),cgV),0.0,1.0),5.0);
      reflectedLight.indirectSpecular=mix(reflectedLight.indirectSpecular,riverPlanar(cgP)*fresnel*(1.0-riverContact(cgP)*.50),riverReflectionOn);`);
  };
  mat.userData.shaderKey+=':planar-river';mat.customProgramCacheKey=()=>mat.userData.shaderKey;
  const g=new THREE.PlaneGeometry(river.halfLength*2,river.width,256,12).rotateX(-Math.PI/2);
  g.translate(river.center[0],river.waterY,river.center[2]);
  const mesh=new THREE.Mesh(g,mat);mesh.name='bianhe-water';
  mesh.onBeforeRender=(renderer,scene,camera)=>reflection.update(renderer,camera);
  mesh.userData.reflection=reflection;engine.registry.riverReflection=reflection;
  engine.add(mesh,{castShadow:false});engine.onUpdate(t=>{time.value=t;});
  return mesh;
}
