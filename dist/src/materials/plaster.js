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
    // inferred: old lime and renewed limewash overlap; this is a layer change, not only grain.
    float limewash=smoothstep(0.38,0.62,patchTone);
    t2Albedo = mix(vec3(0.22,0.205,0.18),vec3(0.68,0.66,0.615),limewash);
    t2Albedo *= 0.95+mottle*0.10;
    vec2 size=max(vLimeSize,vec2(0.001)),faceUV=clamp(vLimeUV,0.0,1.0);
    float mapped=step(0.000001,length(dFdx(vLimeUV))+length(dFdy(vLimeUV)));
    float topDirt=1.0-smoothstep(0.015,0.18,(1.0-faceUV.y)*size.y);
    float sideDirt=1.0-smoothstep(0.01,0.09,min(faceUV.x,1.0-faceUV.x)*size.x);
    float bottomDirt=1.0-smoothstep(0.015,0.10,faceUV.y*size.y);
    // inferred: frame joints collect dust on raised pavilions independently of the world ground datum.
    float frameDirt=max(topDirt*0.25,max(sideDirt*0.14,bottomDirt*0.12))*mapped*t2Wear*(0.6+streak*0.8);
    t2Albedo = mix(t2Albedo,vec3(0.215,0.205,0.18),clamp(dirt*0.45+rain*0.45+frameDirt,0.0,0.7));
    t2Rough = 0.91+rain*0.06;
    t2Height = (mottle-0.5)*0.0015+(patchTone-0.5)*0.0003;
  `, { extraNoise: engine.quality.detail>=1 ? 0 : 1,
    vertexHead:'attribute vec2 memberUV,memberSize;varying vec2 vLimeUV,vLimeSize;',
    vertexPre:'vLimeUV=memberUV;vLimeSize=memberSize;',
    head:'varying vec2 vLimeUV,vLimeSize;',attributes:{memberUV:[0.5,0.5],memberSize:[1,1]} });
}
