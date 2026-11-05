import { surfaceMaterial } from './shared.js';

export function metalMaterial(engine, o = {}) {
  const iron = o.variant === 'iron';
  return surfaceMaterial(engine, iron ? 'dark-iron' : 'tarnished-gilt', o, /* glsl */`
    float mottle = t2Fbm(cgP*20.0+t2Variation);
    float tarnish = smoothstep(0.42,0.72,mottle)*t2Wear;
    t2Albedo = ${iron ? 'mix(vec3(0.05,0.055,0.06),vec3(0.10,0.065,0.035),tarnish)' : 'mix(vec3(0.67,0.40,0.10),vec3(0.19,0.14,0.055),tarnish)'};
    t2Metal = 0.92-tarnish*0.35;
    t2Rough = ${iron ? '0.56' : '0.30'}+tarnish*0.28;
    t2Height = (mottle-0.5)*0.0003;
  `);
}
