import { surfaceMaterial } from './shared.js';

export function plasterMaterial(engine, o = {}) {
  return surfaceMaterial(engine,'lime-plaster',o, /* glsl */`
    float h = max(cgP.y-t2BaseY,0.0);
    // inferred: metre-scale lime repairs survive the wide view; fine trowel grain does not.
    vec3 repairP=cgP*vec3(0.55,0.38,0.55)+t2Variation;
    float patchTone=(t2Noise(repairP)+0.5*t2Noise(repairP*2.03+vec3(5.3,1.7,9.2)))/1.5;
    float mottle = t2Noise(cgP*5.0+t2Variation+17.0);
    vec2 uv = t2WallUV(cgP,cgN);
    float streak = t2Noise(vec3(uv.x*2.4,uv.y*0.25,t2Variation));
    float dirt = (1.0-smoothstep(0.0,0.95,h))*(0.45+patchTone)*t2Wear;
    float rain = smoothstep(0.38,0.75,streak)*t2Wear*(0.3+0.7*smoothstep(0.5,3.0,h));
    t2Albedo = mix(vec3(0.39,0.39,0.385),vec3(0.67,0.66,0.645),smoothstep(0.22,0.78,patchTone));
    t2Albedo *= 0.95+mottle*0.10;
    t2Albedo = mix(t2Albedo,vec3(0.245,0.24,0.23),clamp(dirt*0.55+rain*0.32,0.0,0.8));
    t2Rough = 0.94;
    t2Height = (mottle-0.5)*0.0015+(patchTone-0.5)*0.0003;
  `, { extraNoise: engine.quality.detail>=1 ? 0 : 1 });
}
