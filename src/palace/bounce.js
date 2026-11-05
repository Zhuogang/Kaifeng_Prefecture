import * as THREE from 'three';
import { SUN } from '../core/lighting.js';
import { COURT_STONE_MEAN } from './surfaces.js';

// inferred: a single diffuse bounce from the sunlit flagstones into the shaded timber.
// Sky IBL has no local ground bounce. The horizontal diffuse emitter's hemisphere view
// factor is (1-normal.y)/2; its radiance follows the actual sun and stone reflectance.
// This is an unoccluded, finite-court approximation, not another light or emissive paint.
export function courtBounce(engine, material, court) {
  const irradiance={value:new THREE.Vector3()},bounds={value:new THREE.Vector4(
    court.center[0]-court.width/2,court.center[2]-court.depth/2,
    court.center[0]+court.width/2,court.center[2]+court.depth/2)};
  const update=()=>irradiance.value.set(SUN.color.r,SUN.color.g,SUN.color.b)
    .multiplyScalar(SUN.intensity*Math.max(0,SUN.dir.y));
  update();engine.onUpdate(update);
  Object.assign(material.userData.cgUniforms,{palaceGroundSun:irradiance,palaceCourtBounds:bounds});
  const compile=material.onBeforeCompile;
  material.onBeforeCompile=(shader,renderer)=>{
    compile(shader,renderer);
    shader.uniforms.palaceGroundSun=irradiance;shader.uniforms.palaceCourtBounds=bounds;
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform vec3 palaceGroundSun;uniform vec4 palaceCourtBounds;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`
      #include <lights_fragment_end>
      {
        vec2 courtEdge=min(cgP.xz-palaceCourtBounds.xy,palaceCourtBounds.zw-cgP.xz);
        float finiteCourt=smoothstep(0.0,12.0,min(courtEdge.x,courtEdge.y));
        float groundView=clamp((1.0-cgN.y)*0.5,0.0,1.0)*finiteCourt;
        reflectedLight.indirectDiffuse+=diffuseColor.rgb*RECIPROCAL_PI*
          palaceGroundSun*vec3(${COURT_STONE_MEAN.join(',')})*groundView;
      }`);
  };
  material.userData.shaderKey+=':palace-court-bounce';
  material.customProgramCacheKey=()=>material.userData.shaderKey;
  return material;
}
