import * as THREE from 'three';
import { proceduralMaterial } from '../core/materials.js';
import { foliageAtlas } from './atlas.js';

// inferred: bark fissure scales, leaf/flower shading, roughness, and wind amplitudes
// are procedural appearance choices, not measurements from the historical sources.
const HEAD = /* glsl */`
attribute vec3 aFlora;
attribute vec3 aOrigin;
attribute float aCanopy;
varying float vCanopy;
#ifdef USE_INSTANCING
attribute vec4 iFlora;
#endif
uniform float uFloraTime;
varying vec3 vFlora;
varying vec2 vFloraUV;
`;
const DEFORM = /* glsl */`
vFlora = aFlora; vFloraUV = uv; vCanopy = aCanopy;
vec4 inst = vec4(0.0, 1.0, 0.0, 1.0);
#ifdef USE_INSTANCING
inst = iFlora;
#endif
// Shape variation is fixed per instance; never depends on the camera or active view.
transformed.x += sin(position.y * 0.71) * inst.z * position.y * 0.035;
if ((aFlora.x > 1.5 && aFlora.x < 2.5) || (aFlora.x > 5.5 && aFlora.x < 6.5)) {
  transformed = mix(aOrigin, transformed, step(aFlora.z, inst.y));
}
float phase = inst.x + aOrigin.x * 0.4 + aOrigin.z * 0.3;
float wind = aFlora.y * aFlora.y;
transformed.xz += wind * vec2(0.23 * sin(uFloraTime * 0.85 + phase) + 0.07 * sin(uFloraTime * 1.9 + phase), 0.13 * cos(uFloraTime * 0.63 + phase));
`;

export function floraMaterials(engine) {
  const time = { value: engine.time ?? 0 }, atlas = {value:foliageAtlas(engine.rng('flora-atlas'))};
  engine.onUpdate((t) => { time.value = t; });
  const surface = proceduralMaterial({
    name: 'flora-wood-leaves-blossoms',
    params: { color: 0xffffff, roughness: 0.82, side: THREE.DoubleSide, vertexColors: true },
    uniforms: { uFloraTime: time, uFoliageAtlas:atlas }, vertexHead: HEAD, vertexPre: DEFORM,
    head: 'varying vec3 vFlora; varying vec2 vFloraUV; varying float vCanopy; uniform sampler2D uFoliageAtlas;',
    color: /* glsl */`
      if (vFlora.x > 4.5) {
        float tile = floor(vFlora.x - 5.0 + 0.1);
        vec2 tileUV = (clamp(vec2(vFloraUV.x,1.0-vFloraUV.y),0.003,0.997) + vec2(mod(tile,2.0),floor(tile/2.0))) * 0.5;
        vec4 spray = texture2D(uFoliageAtlas,tileUV);
        // inferred: willow cutout thresholds retain subpixel whips across LODs;
        // the choice follows geometric LOD, not a named view.
        float cutoff=vFlora.x<5.5?(vFlora.x>5.1?0.26:0.24):0.376;
        float alpha=spray.a;
        if(vFlora.x<5.5) {
          float top=(1.0-vFloraUV.y)-0.15*abs(vFloraUV.x*2.0-1.0);
          alpha*=smoothstep(0.0,0.18,top)*smoothstep(0.0,0.12,min(vFloraUV.x,1.0-vFloraUV.x));
        }
        if(alpha < cutoff) discard;
        diffuseColor.rgb *= spray.rgb * (0.78 + 0.35*vCanopy) * (0.88+0.24*vFlora.z);
      } else if (vFlora.x < 0.5) {
        vec2 b = vFloraUV;
        float fiber = cgVnoise2(vec2(b.x * 35.0 + 2.0 * sin(b.y * 1.7), b.y * 3.0));
        float plate = cgVnoise2(vec2(b.x * 9.0, b.y * 1.8));
        float filtering = smoothstep(0.035, 0.2, max(length(dFdx(b)), length(dFdy(b))));
        vec3 cells = cgVoronoi2((b+vec2(cgVnoise2(b*1.4)*0.08,0.0)) * vec2(24.0,1.8));
        float crack = smoothstep(0.025,0.16,cells.y-cells.x);
        float relief = mix((0.79 + 0.24 * fiber + 0.12 * plate) * mix(0.76,1.0,crack), 0.91, filtering);
        diffuseColor.rgb *= relief;
        float lichen = smoothstep(0.65, 0.83, cgVnoise3(cgO * 5.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.23,0.25,0.15), lichen * 0.3);
      } else if (vFlora.x < 1.5) {
        float vein = 1.0 - smoothstep(0.008, 0.055 + fwidth(vFloraUV.x), abs(vFloraUV.x - 0.5));
        diffuseColor.rgb *= 0.91 + 0.15 * vFloraUV.y + 0.1 * vein;
      } else if (vFlora.x < 2.5) {
        if(vFlora.x>2.1) {
          vec2 q=(vFloraUV-0.5)*2.0;
          float edge=0.77+0.2*cos(atan(q.y,q.x)*5.0);
          if(length(q)>edge) discard;
        }
        float center = 1.0 - smoothstep(0.055, 0.12 + fwidth(vFloraUV.x), length(vFloraUV - 0.5));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32,0.18,0.025), center * 0.8);
      } else if (vFlora.x < 3.5) {
        float a = atan(vFloraUV.y, vFloraUV.x), r = length(vFloraUV);
        float vein = pow(0.5 + 0.5 * cos(a * 18.0 + sin(r * 4.0) * 0.2), 18.0);
        float fade = 1.0 - smoothstep(0.015, 0.09, length(fwidth(vFloraUV)));
        diffuseColor.rgb *= 0.94 + 0.055 * r + 0.038 * vein * fade;
      }
    `,
    roughness: 'if (vFlora.x > 2.5 && vFlora.x < 3.5) roughnessFactor = 0.48;',
    normal: /* glsl */`
      if(vFlora.x>4.5) normal=normalize(vNormal);
      if (vFlora.x < 0.5) {
        vec3 cells = cgVoronoi2((vFloraUV+vec2(cgVnoise2(vFloraUV*1.4)*0.08,0.0)) * vec2(24.0,1.8));
        float h = smoothstep(0.025,0.16,cells.y-cells.x) + cgVnoise2(vFloraUV * vec2(35.0,3.0)) * 0.4;
        vec3 q0 = dFdx(cgP), q1 = dFdy(cgP), r0 = cross(q1,cgN), r1 = cross(cgN,q0);
        float det = dot(q0,r0);
        vec3 grad = sign(det) * (dFdx(h)*r0 + dFdy(h)*r1);
        cgBump = (normalize(abs(det)*cgN - 0.004*grad) - cgN) * step(1e-9,abs(det));
      }
    `,
    // inferred: small diffuse transmission/bounce approximation for thin foliage, no baked sun.
    ao: 'if(vFlora.x>4.5) { cgAO=mix(0.48,1.0,vCanopy); reflectedLight.indirectSpecular*=0.3; }',
    emissive: `
      if (vFlora.x > 4.5 || (vFlora.x>0.5 && vFlora.x<2.5)) {
        totalEmissiveRadiance += diffuseColor.rgb * (vFlora.x<5.5?0.16:0.07);
        #ifdef USE_FOG
        float back=pow(max(dot(-cgV,uSunDir),0.0),4.0);
        float edge=1.0-abs(dot(cgN,cgV));
        totalEmissiveRadiance += diffuseColor.rgb*uSunColor*back*(0.15+0.5*edge)*vCanopy*0.32;
        #endif
      }
    `,
  });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  depth.userData.shaderKey = 'flora-wind-cutout-depth-v2';
  depth.onBeforeCompile = (shader) => {
    shader.uniforms.uFloraTime = time;shader.uniforms.uFoliageAtlas=atlas;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + HEAD).replace('#include <begin_vertex>', '#include <begin_vertex>\n{\n' + DEFORM + '\n}');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n varying vec3 vFlora; varying vec2 vFloraUV; uniform sampler2D uFoliageAtlas;').replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
      if(vFlora.x>2.1 && vFlora.x<2.5) {
        vec2 q=(vFloraUV-0.5)*2.0;
        float edge=0.77+0.2*cos(atan(q.y,q.x)*5.0);
        if(length(q)>edge) discard;
      }
      if(vFlora.x>4.5) {
        float tile=floor(vFlora.x-5.0+0.1);
        vec2 tileUV=(clamp(vec2(vFloraUV.x,1.0-vFloraUV.y),0.003,0.997)+vec2(mod(tile,2.0),floor(tile/2.0)))*0.5;
        float cutoff=vFlora.x<5.5?(vFlora.x>5.1?0.26:0.24):0.376;
        float alpha=texture2D(uFoliageAtlas,tileUV).a;
        if(vFlora.x<5.5) {
          float top=(1.0-vFloraUV.y)-0.15*abs(vFloraUV.x*2.0-1.0);
          alpha*=smoothstep(0.0,0.18,top)*smoothstep(0.0,0.12,min(vFloraUV.x,1.0-vFloraUV.x));
        }
        if(alpha<cutoff) discard;
      }
    `);
  };
  depth.customProgramCacheKey = () => depth.userData.shaderKey;
  const lotusContact=lotusContactMaterial();
  return { surface, depth, time, lotusContact };
}

export function lotusContactMaterial() {
  return proceduralMaterial({
    name:'lotus-contact-penumbra',params:{color:0x26382e,transparent:true,depthWrite:false,roughness:1,side:THREE.DoubleSide},
    vertexHead:'varying vec2 vContactUV;',vertexPre:'vContactUV=uv;',head:'varying vec2 vContactUV;',
    color:'diffuseColor.a=(1.0-smoothstep(0.72,1.0,length(vContactUV*2.0-1.0)))*0.2;',
  });
}
