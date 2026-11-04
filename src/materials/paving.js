import { surfaceMaterial } from './shared.js';

/** layout is a GLSL function definition: vec4 pavingLayout(vec3 worldPosition).
 * Returns (courseX metres, courseY metres, signed distance to nearest cart rut metres,
 * signed distance to drain centre metres). Thus T5 can bend/rotate courses and paths.
 * All distances stay in world units; use a large distance to disable a feature.
 */
export const DEFAULT_PAVING_LAYOUT = /* glsl */`
vec4 pavingLayout(vec3 p) { return vec4(p.x,p.z,abs(p.x)-0.72,abs(p.x)-4.5); }
`;
export function pavingMaterial(engine, o = {}) {
  const brick = o.variant === 'brick';
  return surfaceMaterial(engine, `paving-${brick ? 'brick' : 'bluestone'}`, o, /* glsl */`
    vec4 pavement = pavingLayout(cgP);
    vec2 size = ${brick ? 'vec2(0.36,0.18)' : 'vec2(0.936,0.624)'};
    vec4 bond = t2Bond(pavement.xy,size,0.008,t2Variation);
    float mottle = t2Fbm(cgP*18.0+t2Variation,0.7);
    float rough = t2Noise(cgP*65.0+t2Variation);
    float repair = step(0.91,cgHash12(floor(pavement.xy/vec2(2.808,1.872))+t2Variation));
    repair = mix(0.09,repair,t2Visible(max(fwidth(pavement.x),fwidth(pavement.y))/1.872));
    float rut = t2Line(pavement.z,0.065)*t2Ruts;
    float drain = t2Line(pavement.w,0.055)*t2Drains;
    vec3 a = ${brick ? 'vec3(0.16,0.135,0.105)' : 'vec3(0.105,0.128,0.145)'};
    vec3 b = ${brick ? 'vec3(0.29,0.24,0.18)' : 'vec3(0.24,0.25,0.25)'};
    t2Albedo = mix(a,b,bond.y)*(0.45+1.1*mottle)*(0.80+0.4*rough);
    t2Albedo = mix(t2Albedo,t2Albedo*vec3(1.12,1.08,0.98),repair*0.6);
    t2Albedo = mix(t2Albedo,vec3(0.075,0.066,0.049),bond.x*0.75);
    t2Albedo *= 1.0-rut*0.13-drain*0.65;
    t2Rough = 0.86-rut*0.34+bond.x*0.08;
    float tool = t2Wave((pavement.x+pavement.y*0.3)*170.0);
    float rutRelief=exp(-pow(pavement.z/0.10,2.0))*t2Ruts;
    float drainRelief=(1.0-smoothstep(0.025,0.09,abs(pavement.w)))*t2Drains;
    t2Height = (mottle-0.5)*0.0025+(rough-0.5)*0.0006 + tool*0.0002*(1.0-rut)
      +t2JointRelief(bond.z,0.006,cgP)*bond.w
      -(rutRelief*0.005+drainRelief*0.012)*t2Visible(t2Footprint(cgP)*12.0);
    t2Occlusion = 1.0-bond.x*0.15-drain*0.35;
  `, { head: `uniform float t2Ruts,t2Drains;\n${o.layout ?? DEFAULT_PAVING_LAYOUT}`,
    uniforms: { t2Ruts: { value: o.ruts ?? 1 }, t2Drains: { value: o.drains ?? 1 } }, extraNoise: 1 });
}
