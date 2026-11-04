import { surfaceMaterial } from './shared.js';

export function plasterMaterial(engine, o = {}) {
  return surfaceMaterial(engine,'lime-plaster',o, /* glsl */`
    float h = max(cgP.y-t2BaseY,0.0);
    float mottle = t2Fbm(cgP*5.0+t2Variation);
    vec2 uv = t2WallUV(cgP,cgN);
    float streak = t2Noise(vec3(uv.x*10.0,uv.y*0.35,t2Variation));
    float dirt = (1.0-smoothstep(0.0,0.95,h))*(0.45+mottle)*t2Wear;
    float rain = smoothstep(0.52,0.8,streak)*t2Wear*(0.3+0.7*smoothstep(0.5,3.0,h));
    t2Albedo = mix(vec3(0.50,0.47,0.40),vec3(0.76,0.72,0.63),mottle);
    t2Albedo = mix(t2Albedo,vec3(0.20,0.185,0.15),clamp(dirt*0.65+rain*0.28,0.0,0.8));
    t2Rough = 0.94;
    t2Height = (mottle-0.5)*0.004;
  `, { extraNoise: 1 });
}
