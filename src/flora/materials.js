import * as THREE from 'three';
import { proceduralMaterial } from '../core/materials.js';

// inferred: bark fissure scales, leaf/flower shading, roughness, and wind amplitudes
// are procedural appearance choices, not measurements from the historical sources.
const HEAD = /* glsl */`
attribute vec3 aFlora;
attribute vec3 aOrigin;
#ifdef USE_INSTANCING
attribute vec4 iFlora;
#endif
uniform float uFloraTime;
varying vec3 vFlora;
varying vec2 vFloraUV;
`;
const DEFORM = /* glsl */`
vFlora = aFlora; vFloraUV = uv;
vec4 inst = vec4(0.0, 1.0, 0.0, 1.0);
#ifdef USE_INSTANCING
inst = iFlora;
#endif
// Shape variation is fixed per instance; never depends on the camera or active view.
transformed.x += sin(position.y * 0.71) * inst.z * position.y * 0.035;
if (aFlora.x > 1.5 && aFlora.x < 2.5) {
  transformed = mix(aOrigin, transformed, step(aFlora.z, inst.y));
}
float phase = inst.x + aOrigin.x * 0.4 + aOrigin.z * 0.3;
float wind = aFlora.y * aFlora.y;
transformed.xz += wind * vec2(0.23 * sin(uFloraTime * 0.85 + phase) + 0.07 * sin(uFloraTime * 1.9 + phase), 0.13 * cos(uFloraTime * 0.63 + phase));
`;

export function floraMaterials(engine) {
  const time = { value: engine.time ?? 0 };
  engine.onUpdate((t) => { time.value = t; });
  const surface = proceduralMaterial({
    name: 'flora-wood-leaves-blossoms',
    params: { color: 0xffffff, roughness: 0.82, side: THREE.DoubleSide, vertexColors: true },
    uniforms: { uFloraTime: time }, vertexHead: HEAD, vertexPre: DEFORM,
    head: 'varying vec3 vFlora; varying vec2 vFloraUV;',
    color: /* glsl */`
      if (vFlora.x < 0.5) {
        vec2 b = vFloraUV;
        float fiber = cgVnoise2(vec2(b.x * 35.0 + 2.0 * sin(b.y * 1.7), b.y * 3.0));
        float plate = cgVnoise2(vec2(b.x * 9.0, b.y * 1.8));
        float filtering = smoothstep(0.035, 0.2, max(length(dFdx(b)), length(dFdy(b))));
        vec3 cells = cgVoronoi2(b * vec2(20.0,2.6));
        float crack = smoothstep(0.025,0.16,cells.y-cells.x);
        float relief = mix((0.60 + 0.7 * fiber * plate) * mix(0.4,1.1,crack), 0.7, filtering);
        diffuseColor.rgb *= relief;
        float lichen = smoothstep(0.65, 0.83, cgVnoise3(cgO * 5.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.23,0.25,0.15), lichen * 0.3);
      } else if (vFlora.x < 1.5) {
        float vein = 1.0 - smoothstep(0.008, 0.055 + fwidth(vFloraUV.x), abs(vFloraUV.x - 0.5));
        diffuseColor.rgb *= 0.91 + 0.15 * vFloraUV.y + 0.1 * vein;
      } else if (vFlora.x < 2.5) {
        float center = 1.0 - smoothstep(0.055, 0.12 + fwidth(vFloraUV.x), length(vFloraUV - 0.5));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32,0.18,0.025), center * 0.8);
      } else if (vFlora.x < 3.5) {
        float a = atan(vFloraUV.y, vFloraUV.x), r = length(vFloraUV);
        float vein = pow(0.5 + 0.5 * cos(a * 18.0 + sin(r * 4.0) * 0.2), 18.0);
        float fade = 1.0 - smoothstep(0.015, 0.09, length(fwidth(vFloraUV)));
        diffuseColor.rgb *= 0.88 + 0.13 * r + 0.13 * vein * fade;
      }
    `,
    roughness: 'if (vFlora.x > 2.5 && vFlora.x < 3.5) roughnessFactor = 0.48;',
    normal: /* glsl */`
      if (vFlora.x < 0.5) {
        vec3 cells = cgVoronoi2(vFloraUV * vec2(20.0,2.6));
        float h = smoothstep(0.025,0.16,cells.y-cells.x) + cgVnoise2(vFloraUV * vec2(35.0,3.0)) * 0.4;
        vec3 q0 = dFdx(cgP), q1 = dFdy(cgP), r0 = cross(q1,cgN), r1 = cross(cgN,q0);
        float det = dot(q0,r0);
        vec3 grad = sign(det) * (dFdx(h)*r0 + dFdy(h)*r1);
        cgBump = (normalize(abs(det)*cgN - 0.01*grad) - cgN) * step(1e-9,abs(det));
      }
    `,
    // inferred: small diffuse transmission/bounce approximation for thin foliage, no baked sun.
    emissive: 'if (vFlora.x > 0.5 && vFlora.x < 3.5) totalEmissiveRadiance += diffuseColor.rgb * 0.09;',
  });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  depth.userData.shaderKey = 'flora-wind-depth-v1';
  depth.onBeforeCompile = (shader) => {
    shader.uniforms.uFloraTime = time;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + HEAD).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + DEFORM);
  };
  depth.customProgramCacheKey = () => depth.userData.shaderKey;
  return { surface, depth, time };
}
