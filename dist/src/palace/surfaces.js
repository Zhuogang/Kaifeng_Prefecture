import * as THREE from 'three';
import { surfaceMaterial } from '../materials/shared.js';

export function courtStone(engine, { service = false } = {}) {
  return surfaceMaterial(engine,service?'palace-service-stone':'palace-coursed-flags',{variation:27},`
    // 卷三 壓闌石: three 尺 by two 尺. Applying this size to court flags is inferred.
    vec2 size=${service?'vec2(0.468,0.312)':'vec2(0.936,0.624)'};
    vec2 p=cgP.xz;
    float course=floor(p.y/size.y);
    vec2 laid=p+vec2(mod(course,2.0)*size.x*.5,0.0);
    vec2 id=floor(laid/size), f=fract(laid/size);
    float edge=min(min(f.x,1.0-f.x)*size.x,min(f.y,1.0-f.y)*size.y);
    float resolved=1.0-smoothstep(.7,1.8,max(fwidth(p.x/size.x),fwidth(p.y/size.y)));
    float grain=t2Fbm(cgP*3.1+27.0);
    float block=mix(.5,cgHash12(id+27.0),resolved);
    float chips=(t2Wave(p.x*63.0+p.y*97.0)+t2Wave(p.x*137.0-p.y*33.0))*.001;
    float joint=1.0-smoothstep(.003,.006+fwidth(edge),edge+chips);
    joint=mix(.025,joint,resolved);
    // inferred: maintained blue-grey flags, gentle pigment variation, rain-darkened joints,
    // and broad foot-polished approaches to the three stairways; no cart ruts in the court.
    float approach=min(abs(p.x),min(abs(p.x-24.0),abs(p.x+24.0)));
    float polish=(1.0-smoothstep(1.4,4.0,approach))*(.7+grain*.3);
    float wet=smoothstep(.48,.66,t2Noise(vec3(p.x*.09,0.0,p.y*.09)+13.0))*.25;
    t2Albedo=mix(vec3(.18,.205,.225),vec3(.27,.29,.30),block)*(.88+grain*.24);
    t2Albedo=mix(t2Albedo,t2Albedo*vec3(1.04,1.03,1.0),polish*.35);
    t2Albedo*=1.0-wet*.20;
    t2Albedo=mix(t2Albedo,vec3(.085,.095,.10),joint*.72);
    t2Rough=.82-polish*.24-wet*.18;
    float crack=t2Line((f.x*.8+f.y*.35-.54)*size.y,.0014)*step(.94,cgHash12(id+61.0))*resolved;
    t2Albedo*=1.0-crack*.27;
    t2Height=t2JointRelief(max(0.0,edge+chips),.004,cgP)*resolved+(grain-.5)*.002-crack*.001;
    t2Occlusion=1.0-joint*.10;
  `);
}

// A bounded, low humidity layer, integrated along each camera-to-surface ray. This is world
// space atmosphere on the palace's own surfaces; it follows neither shot IDs nor camera headings.
export function courtMist(engine, court) {
  const time={value:engine.time};engine.onUpdate(t=>{time.value=t;});
  const lower=new THREE.Vector3(court.center[0]-court.width/2,court.center[1],court.center[2]-court.depth/2);
  const upper=new THREE.Vector3(court.center[0]+court.width/2,court.center[1]+4,court.center[2]+court.depth/2);
  return material=>{
    if(material.userData.palaceMist)return material;
    material.userData.palaceMist=true;
    const before=material.onBeforeCompile;
    material.onBeforeCompile=(shader,renderer)=>{
      before?.call(material,shader,renderer);
      Object.assign(shader.uniforms,{uPalaceMistMin:{value:lower},uPalaceMistMax:{value:upper},uPalaceMistTime:time});
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        uniform vec3 uPalaceMistMin,uPalaceMistMax;uniform float uPalaceMistTime;`)
        .replace('#include <fog_fragment>',`
        #ifdef USE_FOG
          vec3 palaceDelta=vAtmoWorldPos-cameraPosition;
          float palaceDistance=length(palaceDelta);
          vec3 palaceRay=palaceDelta/max(palaceDistance,.001);
          vec3 palaceA=(uPalaceMistMin-cameraPosition)/(palaceRay+vec3(.000001));
          vec3 palaceB=(uPalaceMistMax-cameraPosition)/(palaceRay+vec3(.000001));
          vec3 palaceLo=min(palaceA,palaceB),palaceHi=max(palaceA,palaceB);
          float palaceEnter=max(0.0,max(palaceLo.x,max(palaceLo.y,palaceLo.z)));
          float palaceLeave=min(palaceDistance,min(palaceHi.x,min(palaceHi.y,palaceHi.z)));
          if(palaceLeave>palaceEnter) {
            // inferred: thin late-spring ground mist, a 1.2 m scale height with slowly drifting wisps.
            float palaceOD=0.0,palaceStep=(palaceLeave-palaceEnter)/4.0;
            for(int mi=0;mi<4;mi++) {
              vec3 q=cameraPosition+palaceRay*(palaceEnter+(float(mi)+.5)*palaceStep);
              float w=.65+.35*cgVnoise3(vec3(q.x*.045,q.y*.17,q.z*.045)+vec3(uPalaceMistTime*.015,0,0));
              palaceOD+=exp(-max(0.0,q.y-uPalaceMistMin.y)/1.2)*w*palaceStep*.002;
            }
            vec3 palaceScatter=vec3(.42,.48,.56)+uSunColor*.10*max(0.0,uSunDir.y);
            gl_FragColor.rgb=mix(gl_FragColor.rgb,palaceScatter,1.0-exp(-palaceOD));
          }
        #endif
        #include <fog_fragment>`);
    };
    material.userData.shaderKey=(material.userData.shaderKey??'')+':palace-ground-mist';
    material.customProgramCacheKey=()=>material.userData.shaderKey;
    return material;
  };
}
