import * as THREE from 'three';
import { surfaceMaterial } from './shared.js';

/** grainAxis is a WORLD-space fallback; stamped member coordinates align grain with each timber. */
export function timberMaterial(engine, o = {}) {
  return surfaceMaterial(engine, `timber-${o.variant ?? 'vermilion'}`, o, /* glsl */`
    float h = max(0.0, cgP.y - t2BaseY);
    // inferred: metre-scale chalking survives the forecourt view; fine fibres alone cannot.
    vec3 ageP=cgP*vec3(0.55,0.24,0.55)+t2Variation;
    float macro=(t2Noise(ageP)+0.5*t2Noise(ageP*2.03+vec3(5.3,1.7,9.2)))/1.5;
    vec3 crossGrain = cgP - t2GrainAxis * dot(cgP, t2GrainAxis);
    float grain;
    float along=dot(cgP,t2GrainAxis),across=length(crossGrain),memberLength=1.0;
    float mapped=length(dFdx(vT4WoodUV))+length(dFdy(vT4WoodUV));
    if(mapped>0.000001) {
      // inferred: slow variation along a board and narrow fibres across it, in physical metres.
      bool vertical=vT4WoodSize.y>vT4WoodSize.x;
      along=vertical?vT4WoodUV.y*vT4WoodSize.y:vT4WoodUV.x*vT4WoodSize.x;
      across=vertical?vT4WoodUV.x*vT4WoodSize.x:vT4WoodUV.y*vT4WoodSize.y;
      memberLength=vertical?vT4WoodSize.y:vT4WoodSize.x;
      grain=t2Noise(vec3(along*1.4,across*55.0,t2Variation+cgSeed*37.0));
    }else grain=t2Noise(crossGrain*55.0+t2GrainAxis*dot(cgP,t2GrainAxis)*1.8+t2Variation);
    float footHeight=vT4WoodKind>3.5&&vT4WoodKind<4.5?vT4WoodUV.y*vT4WoodSize.y:h;
    float base = 1.0 - smoothstep(0.0, 1.15, footHeight);
    float chips = smoothstep(0.56,0.69,grain*0.35+macro*0.65)*t2Wear*(0.45+0.55*base);
    float crack = (1.0-smoothstep(0.12,0.20,grain))*base*t2Wear;
    float painted=${['unpainted','black'].includes(o.variant) ? '0.0' : '1.0'};
    // inferred: faded cinnabar exposes a dull, chalk-rich layer in broad irregular patches.
    float faded=smoothstep(0.34,0.66,macro)*t2Wear*(0.65+0.35*max(cgN.z,0.0))*painted;
    vec3 washed=mix(t2TimberColor,vec3(0.26,0.19,0.14),0.85);
    t2Albedo = mix(t2TimberColor,washed,faded);
    // inferred: broad rain streaks and sun fading vary over metres, fine grain remains millimetric.
    float rain=t2Noise(cgP*vec3(4.0,0.18,4.0)+t2Variation+9.0);
    t2Albedo *= (0.52+macro*0.96)*(0.82+rain*0.36);
    vec2 edges=min(vT4WoodUV,1.0-vT4WoodUV)*vT4WoodSize;
    float edge=min(edges.x,edges.y);
    // inferred: millimetric arris abrasion, rather than a broad dark UV border. Columns
    // have a wrapped seam, not a physical edge, so only their foot/cavity wear applies.
    float mappedEdge=mapped>0.000001&&!(vT4WoodKind>3.5&&vT4WoodKind<4.5)?1.0:0.0;
    float joint=(1.0-smoothstep(0.001,0.009+fwidth(edge),edge))*mappedEdge;
    // inferred: ends meet columns, caps and sockets, collecting dirt rather than uniform paint grime.
    float endDistance=max(0.0,min(along,memberLength-along));
    float endDirt=(1.0-smoothstep(0.025,0.19,endDistance))*step(0.000001,mapped);
    float dirt=max(endDirt*0.52,base*0.22)*t2Wear*(0.6+rain*0.4);
    t2Albedo*=1.0-dirt-joint*0.10;
    t2Albedo = mix(t2Albedo, vec3(0.19,0.13,0.085)*(0.8+grain*0.4), max(chips,joint*t2Wear*0.65));
    t2Albedo *= 1.0 - crack*0.6 - vT2Cavity*0.28;
    t2Rough = 0.49 + t2Wear*0.20 + chips*0.13+faded*0.10;
    t2Height = (grain-0.5)*0.0009 - chips*0.0015 - crack*0.002;
    t2Occlusion = 1.0 - vT2Cavity*0.4-endDirt*0.12-joint*0.08;
  `, {
    uniforms: { t2TimberColor: { value: new THREE.Color(o.color ?? (o.variant === 'black' ? 0x242622 : 0x875442)) },
      t2GrainAxis: { value: new THREE.Vector3(...(o.grainAxis ?? [0,1,0])).normalize() } },
    vertexHead: 'attribute float cavity; attribute vec2 memberUV,memberSize; attribute float memberType; varying float vT2Cavity,vT4WoodKind; varying vec2 vT4WoodUV,vT4WoodSize;', vertexPre: 'vT2Cavity = cavity; vT4WoodUV=memberUV; vT4WoodSize=memberSize; vT4WoodKind=memberType;',
    head: 'uniform vec3 t2TimberColor, t2GrainAxis; varying float vT2Cavity,vT4WoodKind; varying vec2 vT4WoodUV,vT4WoodSize;', attributes: { cavity: [0], memberUV:[0.5,0.5],memberSize:[1,0.25],memberType:[0] }, extraNoise: engine.quality.detail>=1 ? 0 : 1,
  });
}
