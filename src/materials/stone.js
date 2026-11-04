import { surfaceMaterial } from './shared.js';

export function stoneMaterial(engine, o = {}) {
  return surfaceMaterial(engine, 'bluestone', o, /* glsl */`
    float mottle = t2Fbm(cgP*30.0+t2Variation,0.72);
    float stain = t2Noise(cgP*0.7+t2Variation);
    vec2 uv = t2WallUV(cgP,cgN);
    float tool = t2Wave((uv.x+uv.y*0.36)*190.0 + mottle*3.0);
    float polish = max(cgN.y,0.0)*t2Polished;
    float wet = 1.0-smoothstep(t2Waterline-0.1,t2Waterline+0.2,cgP.y);
    float north = 0.4+max(-cgN.z,0.0)*0.6;
    float algae = wet*north*t2Wear*(0.5+mottle*0.5);
    t2Albedo = mix(vec3(0.08,0.10,0.12),vec3(0.25,0.27,0.28),mottle)*(0.78+stain*0.44);
    t2Albedo *= 1.0+tool*0.045*(1.0-polish);
    t2Albedo = mix(t2Albedo,vec3(0.045,0.067,0.029),algae*0.7)*(1.0-wet*0.32);
    t2Rough = 0.85-polish*0.38-wet*0.25;
    t2Height = ((mottle-0.5)*0.0015 + tool*0.00025)*(1.0-polish*0.75);
  `, { uniforms: { t2Waterline: { value: o.waterline ?? -10000 }, t2Polished: { value: o.polished ?? 0.65 } },
    head: 'uniform float t2Waterline,t2Polished;', extraNoise:1 });
}
