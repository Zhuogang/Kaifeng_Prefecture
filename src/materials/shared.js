import * as THREE from 'three';
import { proceduralMaterial } from '../core/materials.js';

// inferred: linear pigment values, weathering amplitudes and spatial frequencies in these
// families are visual reconstructions, not measured Song samples. All lengths are metres.
export const SURFACE_GLSL = /* glsl */`
uniform float t2Variation, t2Wear, t2BaseY;
uniform vec3 t2Tint;
vec3 t2Albedo; float t2Rough, t2Metal, t2Height, t2Occlusion;
float t2Footprint(vec3 p) { return max(length(dFdx(p)), length(dFdy(p))); }
float t2Visible(float footprint) { return 1.0 - smoothstep(0.12, 0.48, footprint); }
float t2Noise(vec3 p) {
  float w = t2Visible(t2Footprint(p));
  if (w < 0.001) return 0.5;
  return mix(0.5, cgVnoise3(p), w);
}
float t2Fbm(vec3 p, float gain) {
  float sum = 0.0, weight = 0.0, a = 0.5;
  for (int i = 0; i < T2_OCTAVES; i++) {
    sum += a * t2Noise(p); weight += a;
    p = p * 2.03 + vec3(5.3, 1.7, 9.2); a *= gain;
  }
  return sum / weight;
}
float t2Fbm(vec3 p) { return t2Fbm(p,0.5); }
float t2Line(float d, float width) {
  float aa = max(fwidth(d), 0.00001);
  return clamp((min(d+aa*0.5,width)-max(d-aa*0.5,-width))/aa,0.0,1.0);
}
float t2Wave(float phase) { return sin(phase) * t2Visible(fwidth(phase) / 2.0); }
// Running bond. Joints and per-block values converge to their area means below a pixel.
// return: mortar, stable block hash, distance to joint in metres, resolved-cell weight.
vec4 t2Bond(vec2 p, vec2 size, float joint, float variation) {
  vec2 q = p / size;
  float row = floor(q.y); q.x += mod(row, 2.0) * 0.5;
  vec2 id = floor(q), f = fract(q);
  vec2 d = min(f, 1.0-f) * size;
  float edge = min(d.x, d.y);
  float visible = 1.0-smoothstep(0.65,2.0,max(fwidth(p.x / size.x),fwidth(p.y / size.y)));
  float meanJoint = clamp(joint * 2.0 * (1.0/size.x + 1.0/size.y), 0.0, 1.0);
  // inferred: irregular dressed edges; analytic waves avoid another noise octave.
  float chip = 0.0025 * (t2Wave(p.x*83.0+p.y*57.0) + t2Wave(p.x*137.0-p.y*61.0));
  edge = max(0.0,edge+chip);
  float mask = 1.0 - smoothstep(joint, joint + max(fwidth(edge), 0.0015), edge);
  return vec4(mix(meanJoint, mask, visible), mix(0.5, cgHash12(id + variation), visible), edge, visible);
}
float t2JointRelief(float edge, float depth, vec3 p) {
  float fp=t2Footprint(p);
  // Bump must span several pixels, independently of the much finer colour joint.
  float width=max(0.025,fp*3.0);
  return -depth*(1.0-smoothstep(0.0,width,edge))*t2Visible(fp*8.0);
}
// Mikkelsen surface-gradient bump: metres of relief, valid on rotated/instanced geometry.
vec3 t2Bump(vec3 p, vec3 n, float h) {
  vec3 dx = dFdx(p), dy = dFdy(p);
  vec3 r1 = cross(dy, n), r2 = cross(n, dx);
  float det = dot(dx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(max(abs(det), 1e-9) * n - grad) - n;
}
vec2 t2WallUV(vec3 p, vec3 n) {
  if (abs(n.y) > 0.75) return p.xz;
  return vec2(abs(n.x) > abs(n.z) ? p.z : p.x, p.y);
}
`;

/** All families take (engine, options). variation is a stable numeric building seed.
 * Attribute defaults allow plain meshes; generators should supply documented attributes.
 * shaderCost excludes engine lighting, atmosphere and the standard BRDF/environment LUTs.
 */
export function surfaceMaterial(engine, name, o, body, extras = {}) {
  const octaves = engine.quality.detail >= 1 ? 4 : 3;
  const mat = proceduralMaterial({
    name, type: extras.physical ? 'physical' : 'standard',
    params: { roughness: 0.8, ...extras.params },
    uniforms: {
      t2Variation: { value: o.variation ?? 0 }, t2Wear: { value: o.wear ?? 0.65 },
      t2BaseY: { value: o.baseY ?? 0 }, t2Tint: { value: new THREE.Color(o.tint ?? 0xffffff) },
      ...extras.uniforms,
    },
    vertexHead: extras.vertexHead, vertexPre: extras.vertexPre,
    head: `#define T2_OCTAVES ${octaves}\n${SURFACE_GLSL}\n${extras.head || ''}`,
    color: `
      t2Albedo = vec3(0.2); t2Rough = 0.8; t2Metal = 0.0; t2Height = 0.0; t2Occlusion = 1.0;
      ${body}
      // inferred: millimetre aggregate / pigment flakes visible only at walking distance.
      // These evaluations disappear before the distant five-octave budget applies.
      float microFootprint=t2Footprint(cgP);
      float microWeight=1.0-smoothstep(0.002,0.008,microFootprint);
      if(microWeight>0.001) {
        float micro=t2Noise(cgP*110.0+t2Variation+17.3);
        ${octaves === 4 ? 'micro=mix(micro,t2Noise(cgP*190.0+t2Variation+31.7),0.35);' : ''}
        t2Albedo*=1.0+(micro-0.5)*1.1*microWeight;
        t2Rough+=(micro-0.5)*0.16*microWeight;
        t2Height+=(micro-0.5)*0.00035*t2Visible(microFootprint*330.0);
      }
      diffuseColor.rgb = max(vec3(0.0), t2Albedo * t2Tint);
    `,
    roughness: 'roughnessFactor = clamp(t2Rough, 0.12, 1.0);',
    metalness: 'metalnessFactor = t2Metal;',
    normal: 'cgBump = t2Bump(cgP, cgN, t2Height);',
    ao: 'cgAO = t2Occlusion;',
  });
  mat.defaultAttributeValues = { color: [1,1,1], uv: [0,0], uv1: [0,0], ...extras.attributes };
  mat.userData.shaderCost = { textureLookups: 0, baseNoiseOctaves: octaves,
    extraFilteredNoise: extras.extraNoise ?? 0, closeOnlyNoise: octaves === 4 ? 2 : 1,
    distantMaxOctaves: octaves + (extras.extraNoise ?? 0) };
  return mat;
}
