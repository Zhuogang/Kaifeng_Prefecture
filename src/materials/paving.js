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
  const material = surfaceMaterial(engine, `paving-${brick ? 'brick' : 'bluestone'}`, o, /* glsl */`
    vec4 pavement = pavingLayout(cgP);
    // inferred: fine lane brick and hand-dressed bluestone; variable course offsets
    // avoid an endlessly repeated half-bond without stretching their physical sizes.
    vec2 size = ${brick ? 'vec2(0.36,0.18)' : 'vec2(0.624,0.468)'};
    float course=floor(pavement.y/size.y);
    vec2 laid=pavement.xy+vec2((cgHash12(vec2(course,17.1))-0.5)*size.x*.38,0.0);
    vec4 bond = t2Bond(laid,size,${brick ? '0.003' : '0.004'},t2Variation);
    float mottle = t2Fbm(cgP*18.0+t2Variation,0.7);
    float rough = 0.5;
    if (t2Footprint(cgP) < 0.008) rough = t2Noise(cgP*65.0+t2Variation);
    float repair = step(0.91,cgHash12(floor(pavement.xy/vec2(2.808,1.872))+t2Variation));
    repair = mix(0.09,repair,t2Visible(max(fwidth(pavement.x),fwidth(pavement.y))/1.872));
    float rut = t2Line(pavement.z,0.065)*t2Ruts;
    float drain = t2Line(pavement.w,0.055)*t2Drains;
    // inferred: muted, dark fired brick / blue-grey stone. Narrow pigment differences
    // let aggregate, broken edges and wear carry the detail instead of a checkerboard.
    vec3 a = ${brick ? 'vec3(0.055,0.068,0.074)' : 'vec3(0.065,0.085,0.100)'};
    vec3 b = ${brick ? 'vec3(0.105,0.115,0.117)' : 'vec3(0.115,0.140,0.155)'};
    t2Albedo = mix(a,b,0.2+0.6*bond.y)*(0.50+mottle)*(0.94+0.12*rough);
    t2Albedo = mix(t2Albedo,t2Albedo*vec3(1.12,1.08,0.98),repair*0.6);
    // inferred: broad run-off, traffic polish and local replacement fields remain
    // visible after individual joints filter out at hundreds of metres.
    float district=t2Noise(vec3(cgP.x*.11,0.0,cgP.z*.14)+t2Variation);
    t2Albedo *= .76+district*.48;
    vec2 blockUV=laid/size; blockUV.x+=mod(course,2.0)*.5;
    vec2 blockID=floor(blockUV), local=fract(blockUV);
    float breakage=cgHash12(blockID+vec2(82.3,7.1));
    float split=(local.x*.75+local.y*.37-.45+.012*sin(local.y*23.0+breakage*6.283))*min(size.x,size.y);
    float fracture=t2Line(split,.0012)*step(.88,breakage)*bond.w;
    t2Albedo*=1.0-fracture*.55;
    t2Albedo = mix(t2Albedo,vec3(0.075,0.066,0.049),bond.x*0.50);
    t2Albedo *= 1.0-rut*0.13-drain*0.65;
    t2Rough = 0.86-rut*0.20+bond.x*0.08;
    float tool = t2Wave((pavement.x+pavement.y*0.3)*170.0);
    float rutRelief=exp(-pow(pavement.z/0.10,2.0))*t2Ruts;
    float drainRelief=(1.0-smoothstep(0.025,0.09,abs(pavement.w)))*t2Drains;
    t2Height = (mottle-0.5)*0.006+(rough-0.5)*0.0006 + tool*0.0002*(1.0-rut)-fracture*.0015
      +t2JointRelief(bond.z,0.004,cgP)*bond.w
      -(rutRelief*0.005+drainRelief*0.012)*t2Visible(t2Footprint(cgP)*12.0);
    t2Occlusion = 1.0-bond.x*0.15-drain*0.35;
  `, { head: `uniform float t2Ruts,t2Drains;\n${o.layout ?? DEFAULT_PAVING_LAYOUT}`,
    uniforms: { t2Ruts: { value: o.ruts ?? 1 }, t2Drains: { value: o.drains ?? 1 } }, extraNoise: 1 });
  // The 65/m aggregate is close-only; the one distant extra evaluation is district wear.
  material.userData.shaderCost.closeOnlyNoise += 1;
  return material;
}
