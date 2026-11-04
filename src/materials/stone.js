import { surfaceMaterial } from './shared.js';
import * as THREE from 'three';
import { ATMO } from '../core/atmosphere.js';

export function stoneMaterial(engine, o = {}) {
  return surfaceMaterial(engine, 'bluestone', o, /* glsl */`
    float mottle = t2Fbm(cgP*vec3(8.0,11.0,8.0)+t2Variation,0.65);
    float stain = t2Noise(cgP*0.7+t2Variation);
    float runoff=t2Noise(vec3((cgP.x+cgP.z)*3.7,cgP.y*0.32,t2Variation+7.3));
    vec2 uv = t2WallUV(cgP,cgN);
    float tool = t2Wave((uv.x+uv.y*0.36)*190.0 + mottle*3.0);
    float polish = max(cgN.y,0.0)*t2Polished;
    float wet = 1.0-smoothstep(t2Waterline-0.1,t2Waterline+0.2,cgP.y);
    float north = 0.4+max(-cgN.z,0.0)*0.6;
    // inferred: capillary splash zone, mineral crust and north-face algae above the waterline.
    float splash = (1.0-smoothstep(t2Waterline+0.10,t2Waterline+0.85,cgP.y))
      *(0.35+stain*0.65)*t2Wear;
    float algae = max(wet,splash)*north*t2Wear*(0.5+mottle*0.5);
    t2Albedo = mix(vec3(0.08,0.10,0.12),vec3(0.25,0.27,0.28),mottle)*(0.78+stain*0.44);
    t2Albedo *= 1.0+tool*0.045*(1.0-polish);
    // inferred: rain dissolves lime and darkens narrow vertical channels below coping.
    float rain=smoothstep(0.52,0.70,runoff)*t2Wear;
    t2Albedo*=1.0-rain*0.38;
    t2Albedo = mix(t2Albedo,vec3(0.045,0.067,0.029),algae*0.7)*(1.0-wet*0.32);
    // inferred: large mineral blooms, granular weathering and relief recess staining.
    float bloom = smoothstep(0.50,0.68,stain)*t2Wear;
    t2Albedo = mix(t2Albedo,vec3(0.39,0.365,0.29),bloom*0.42*(1.0-wet));
    float crust=smoothstep(0.46,0.63,mottle)*(0.22+stain*0.78)*t2Wear;
    t2Albedo=mix(t2Albedo,vec3(0.42,0.395,0.33),crust*0.44*(1.0-splash));
    t2Albedo*=1.0-splash*0.35;
    vec4 bond = t2Bond(uv, t6BlockSize,0.005,t2Variation);
    t2Albedo *= mix(1.0,0.65+bond.y*0.42,t6Joints);
    float joint = bond.x*t6Joints*(1.0-max(cgN.y,0.0));
    t2Albedo *= (1.0-joint*0.35)*(1.0-vT6Cavity*0.62);
    t2Occlusion = 1.0-vT6Cavity*0.60-joint*0.14;
    t2Rough = 0.85-polish*0.38-wet*0.25;
    t2Height = ((mottle-0.5)*0.0015 + tool*0.00025)*(1.0-polish*0.75)
      +t2JointRelief(bond.z,0.004,cgP)*bond.w*t6Joints*(1.0-max(cgN.y,0.0));
  `, { uniforms: { t2Waterline: { value: o.waterline ?? -10000 }, t2Polished: { value: o.polished ?? 0.65 },
      t6Joints: { value: o.joints ?? 0 }, t6BlockSize: { value: o.blockSize ?? [0.936,0.468] } },
    vertexHead: 'attribute float stoneCavity; varying float vT6Cavity;', vertexPre: 'vT6Cavity=stoneCavity;',
    head: 'uniform float t2Waterline,t2Polished,t6Joints; uniform vec2 t6BlockSize; varying float vT6Cavity;',
    attributes: { stoneCavity: [0] }, extraNoise:1 });
}

/** Directional self-shadowing of the generated relief field. This follows the live sun,
 * while the geometric horizon occlusion remains independent of illumination. */
export function carvedStoneMaterial(engine, o, field) {
  const mat=stoneMaterial(engine,o);
  const texture=new THREE.DataTexture(field.data,field.width,field.height,THREE.RedFormat,THREE.UnsignedByteType);
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  const normalTexture=new THREE.DataTexture(field.normals,field.width,field.height,THREE.RGBAFormat,THREE.UnsignedByteType);
  normalTexture.minFilter=THREE.LinearMipmapLinearFilter;normalTexture.magFilter=THREE.LinearFilter;
  normalTexture.generateMipmaps=true;normalTexture.needsUpdate=true;
  const previous=mat.onBeforeCompile;
  mat.onBeforeCompile=(shader,renderer)=>{
    previous(shader,renderer);
    shader.uniforms.t6Relief={value:texture};shader.uniforms.t6ReliefNormal={value:normalTexture};shader.uniforms.t6ReliefSun=ATMO.uSunDir;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform vec3 t6ReliefSun; varying vec3 vT6ReliefSun; varying vec3 vT6AxisX,vT6AxisY,vT6AxisZ;`)
      .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
        mat3 t6Basis=mat3(modelMatrix);
        #ifdef USE_INSTANCING
          t6Basis=t6Basis*mat3(instanceMatrix);
        #endif
        vT6ReliefSun=transpose(t6Basis)*t6ReliefSun;
        vT6AxisX=normalize(t6Basis[0]);vT6AxisY=normalize(t6Basis[1]);vT6AxisZ=normalize(t6Basis[2]);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D t6Relief,t6ReliefNormal; varying vec3 vT6ReliefSun; varying vec3 vT6AxisX,vT6AxisY,vT6AxisZ;
      float t6ReliefShadow(vec3 p) {
        if(vT6ReliefSun.z<=0.02)return 1.0;
        float visibility=1.0;
        p.z=max(p.z,texture2D(t6Relief,p.xy/vec2(7.5,2.84)).r*.40+.016);
        for(int i=1;i<=12;i++) {
          vec3 q=p+normalize(vT6ReliefSun)*float(i)*0.055;
          vec2 uv=q.xy/vec2(7.5,2.84);
          if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0)break;
          float h=texture2D(t6Relief,uv).r*0.40+0.012;
          visibility=min(visibility,smoothstep(-0.008,0.028,q.z-h));
        }
        return mix(0.12,1.0,visibility);
      }`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        float t6BlockTone=texture2D(t6ReliefNormal,vCgObjPos.xy/vec2(7.5,2.84)).a;
        diffuseColor.rgb*=mix(0.75,1.18,t6BlockTone);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 t6UV=vCgObjPos.xy/vec2(7.5,2.84);
        vec3 t6Detail=texture2D(t6ReliefNormal,t6UV).xyz*2.0-1.0;
        vec3 t6WorldNormal=vT6AxisX*t6Detail.x+vT6AxisY*t6Detail.y+vT6AxisZ*t6Detail.z;
        normal=normalize((viewMatrix*vec4(t6WorldNormal,0.0)).xyz);`)
      .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
        float t6Visibility=t6ReliefShadow(vCgObjPos);
        reflectedLight.directDiffuse*=t6Visibility;reflectedLight.directSpecular*=t6Visibility;`);
  };
  mat.userData.shaderKey+=':relief-atlas-v2';
  mat.customProgramCacheKey=()=>mat.userData.shaderKey;
  mat.userData.shaderCost={...mat.userData.shaderCost,textureLookups:15,reliefShadowSteps:12};
  return mat;
}
