import * as THREE from 'three';
import { surfaceMaterial } from './shared.js';

/** grainAxis is a WORLD-space unit direction; cavity attribute is 0..1 recess depth. */
export function timberMaterial(engine, o = {}) {
  return surfaceMaterial(engine, `timber-${o.variant ?? 'vermilion'}`, o, /* glsl */`
    float h = max(0.0, cgP.y - t2BaseY);
    float macro = t2Fbm(cgP * 8.0 + t2Variation);
    vec3 crossGrain = cgP - t2GrainAxis * dot(cgP, t2GrainAxis);
    float grain = t2Noise(crossGrain * 55.0 + t2GrainAxis * dot(cgP,t2GrainAxis)*1.8 + t2Variation);
    float base = 1.0 - smoothstep(0.0, 1.15, h);
    float chips = smoothstep(0.56,0.60, grain*0.25 + macro*0.75) * t2Wear * (0.5+0.5*base);
    float crack = (1.0-smoothstep(0.12,0.20,grain))*base*t2Wear;
    float faded = max(cgN.z,0.0) * smoothstep(0.1,3.5,h) * t2Wear;
    t2Albedo = mix(t2TimberColor, vec3(0.29,0.115,0.065), faded*0.38);
    t2Albedo *= 0.6 + macro*0.8;
    t2Albedo = mix(t2Albedo, vec3(0.19,0.13,0.065)*(0.6+grain), chips);
    t2Albedo *= 1.0 - crack*0.6 - vT2Cavity*0.28;
    t2Rough = 0.47 + t2Wear*0.25 + chips*0.16;
    t2Height = (grain-0.5)*0.0009 - chips*0.0015 - crack*0.002;
    t2Occlusion = 1.0 - vT2Cavity*0.4;
  `, {
    uniforms: { t2TimberColor: { value: new THREE.Color(o.color ?? (o.variant === 'black' ? 0x242622 : 0x943b28)) },
      t2GrainAxis: { value: new THREE.Vector3(...(o.grainAxis ?? [0,1,0])).normalize() } },
    vertexHead: 'attribute float cavity; varying float vT2Cavity;', vertexPre: 'vT2Cavity = cavity;',
    head: 'uniform vec3 t2TimberColor, t2GrainAxis; varying float vT2Cavity;', attributes: { cavity: [0] }, extraNoise: 1,
  });
}
