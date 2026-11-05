import * as THREE from 'three';
import { surfaceMaterial } from './shared.js';

/** grainAxis is a WORLD-space fallback; stamped member coordinates align grain with each timber. */
export function timberMaterial(engine, o = {}) {
  return surfaceMaterial(engine, `timber-${o.variant ?? 'vermilion'}`, o, /* glsl */`
    float h = max(0.0, cgP.y - t2BaseY);
    float macro = t2Fbm(cgP * vec3(1.8,0.32,1.8) + t2Variation);
    vec3 crossGrain = cgP - t2GrainAxis * dot(cgP, t2GrainAxis);
    float grain;
    float mapped=length(dFdx(vT4WoodUV))+length(dFdy(vT4WoodUV));
    if(mapped>0.000001) {
      // inferred: slow variation along a board and narrow fibres across it, in physical metres.
      bool vertical=vT4WoodSize.y>vT4WoodSize.x;
      float along=vertical?vT4WoodUV.y*vT4WoodSize.y:vT4WoodUV.x*vT4WoodSize.x;
      float across=vertical?vT4WoodUV.x*vT4WoodSize.x:vT4WoodUV.y*vT4WoodSize.y;
      grain=t2Noise(vec3(along*1.4,across*55.0,t2Variation+cgSeed*37.0));
    }else grain=t2Noise(crossGrain*55.0+t2GrainAxis*dot(cgP,t2GrainAxis)*1.8+t2Variation);
    float footHeight=vT4WoodKind>3.5&&vT4WoodKind<4.5?vT4WoodUV.y*vT4WoodSize.y:h;
    float base = 1.0 - smoothstep(0.0, 1.15, footHeight);
    float chips = smoothstep(0.56,0.60, grain*0.25 + macro*0.75) * t2Wear * (0.5+0.5*base);
    float crack = (1.0-smoothstep(0.12,0.20,grain))*base*t2Wear;
    float faded = ${o.variant === 'unpainted' ? '0.0' : 'max(cgN.z,0.0) * smoothstep(0.1,3.5,h) * t2Wear'};
    t2Albedo = mix(t2TimberColor, vec3(0.29,0.115,0.065), faded*0.38);
    // inferred: broad rain streaks and sun fading vary over metres, fine grain remains millimetric.
    float rain=t2Noise(cgP*vec3(4.0,0.18,4.0)+t2Variation+9.0);
    t2Albedo *= (0.48+macro*1.02)*(0.84+rain*0.32);
    float edge=min(min(vT4WoodUV.x,1.0-vT4WoodUV.x),min(vT4WoodUV.y,1.0-vT4WoodUV.y));
    float joint=(1.0-smoothstep(0.0,0.028+fwidth(edge),edge))*(1.0-smoothstep(0.05,0.25,length(fwidth(vT4WoodUV))));
    t2Albedo*=1.0-joint*0.18;
    t2Albedo = mix(t2Albedo, vec3(0.19,0.13,0.065)*(0.6+grain), chips);
    t2Albedo *= 1.0 - crack*0.6 - vT2Cavity*0.28;
    t2Rough = 0.47 + t2Wear*0.25 + chips*0.16;
    t2Height = (grain-0.5)*0.0009 - chips*0.0015 - crack*0.002;
    t2Occlusion = 1.0 - vT2Cavity*0.4-joint*0.15;
  `, {
    uniforms: { t2TimberColor: { value: new THREE.Color(o.color ?? (o.variant === 'black' ? 0x242622 : 0x873c2b)) },
      t2GrainAxis: { value: new THREE.Vector3(...(o.grainAxis ?? [0,1,0])).normalize() } },
    vertexHead: 'attribute float cavity; attribute vec2 memberUV,memberSize; attribute float memberType; varying float vT2Cavity,vT4WoodKind; varying vec2 vT4WoodUV,vT4WoodSize;', vertexPre: 'vT2Cavity = cavity; vT4WoodUV=memberUV; vT4WoodSize=memberSize; vT4WoodKind=memberType;',
    head: 'uniform vec3 t2TimberColor, t2GrainAxis; varying float vT2Cavity,vT4WoodKind; varying vec2 vT4WoodUV,vT4WoodSize;', attributes: { cavity: [0], memberUV:[0.5,0.5],memberSize:[1,0.25],memberType:[0] }, extraNoise: 2,
  });
}
