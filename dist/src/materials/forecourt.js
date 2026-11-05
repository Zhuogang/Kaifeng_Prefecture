import { surfaceMaterial } from './shared.js';

/** Gate-forecourt bluestone. The avenue keeps its own paving family and traffic layout. */
export function forecourtMaterial(engine,o={}) {
  return surfaceMaterial(engine,'xuande-dressed-forecourt',o,/* glsl */`
    // inferred: 0.62 x 0.46 m hand-dressed stones, warm mineral dust and shallow worn joints.
    vec2 p=cgP.xz;
    vec4 bond=t2Bond(p,vec2(0.62,0.46),0.003,t2Variation);
    float wear=t2Fbm(cgP*vec3(1.7,0.4,1.7)+t2Variation);
    float dust=t2Noise(cgP*0.15+t2Variation+11.0);
    t2Albedo=mix(vec3(0.18,0.183,0.172),vec3(0.265,0.25,0.216),bond.y);
    t2Albedo*=0.77+wear*0.40;
    t2Albedo=mix(t2Albedo,vec3(0.24,0.208,0.159),dust*0.14);
    t2Albedo=mix(t2Albedo,vec3(0.085,0.079,0.063),bond.x*0.62);
    t2Rough=0.79+bond.x*0.14-wear*0.06;
    t2Height=(wear-0.5)*0.0008+t2JointRelief(bond.z,0.0015,cgP)*bond.w;
    t2Occlusion=1.0-bond.x*0.18;
  `,{extraNoise:1});
}
