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
    vec2 blockUV=laid/size; blockUV.x+=mod(course,2.0)*.5;
    vec2 blockID=floor(blockUV), local=fract(blockUV);
    // Filter the continuous metre coordinates, never the discontinuous course
    // offset/hash. Otherwise adjacent rows acquire broad moiré bands at a distance.
    vec2 pixel=max(fwidth(pavement.xy),vec2(.00001));
    vec2 d=local*size;
    float joint=${brick ? '0.0035' : '0.004'};
    vec2 lower=clamp((min(d+pixel*.5,vec2(joint))-max(d-pixel*.5,vec2(-joint)))/pixel,0.0,1.0);
    vec2 upper=clamp((min(d-size+pixel*.5,vec2(joint))-max(d-size-pixel*.5,vec2(-joint)))/pixel,0.0,1.0);
    vec2 jointAxis=clamp(lower+upper,0.0,1.0);
    float cellVisible=1.0-smoothstep(.70,1.8,max(pixel.x/size.x,pixel.y/size.y));
    float mortar=1.0-(1.0-jointAxis.x)*(1.0-jointAxis.y);
    float meanJoint=1.0-(1.0-2.0*joint/size.x)*(1.0-2.0*joint/size.y);
    float edge=min(min(d.x,size.x-d.x),min(d.y,size.y-d.y));
    vec4 bond=vec4(mix(meanJoint,mortar,cellVisible),mix(.5,cgHash12(blockID+t2Variation),cellVisible),edge,cellVisible);
    float mottle = t2Fbm(cgP*18.0+t2Variation,0.7);
    float rough = 0.5;
    if (t2Footprint(cgP) < 0.008) rough = t2Noise(cgP*65.0+t2Variation);
    float repair = step(0.91,cgHash12(floor(pavement.xy/vec2(2.808,1.872))+t2Variation));
    repair = mix(0.09,repair,t2Visible(max(fwidth(pavement.x),fwidth(pavement.y))/1.872));
    float rutWear=smoothstep(.25,.75,cgVnoise2(vec2(pavement.y*.18,abs(pavement.x)*.2)));
    float rut = t2Line(pavement.z,0.065)*t2Ruts*rutWear;
    float drain = t2Line(pavement.w,0.055)*t2Drains;
    // inferred: muted, dark fired brick / blue-grey stone. Narrow pigment differences
    // let aggregate, broken edges and wear carry the detail instead of a checkerboard.
    vec3 a = ${brick ? 'vec3(0.018,0.028,0.040)' : 'vec3(0.035,0.052,0.070)'};
    vec3 b = ${brick ? 'vec3(0.065,0.088,0.110)' : 'vec3(0.085,0.115,0.145)'};
    t2Albedo = mix(a,b,bond.y)*(.88+.24*mottle)*(0.94+0.12*rough);
    t2Albedo = mix(t2Albedo,t2Albedo*vec3(1.12,1.08,0.98),repair*0.6);
    float breakage=cgHash12(blockID+vec2(82.3,7.1));
    float split=(local.x*.75+local.y*.37-.45+.012*sin(local.y*23.0+breakage*6.283))*min(size.x,size.y);
    float fracture=t2Line(split,.0012)*step(.88,breakage)*bond.w;
    t2Albedo*=1.0-fracture*.55;
    t2Albedo = mix(t2Albedo,vec3(.019,.022,.021),bond.x*.82);
    t2Albedo *= 1.0-rut*0.13-drain*0.65;
    // inferred: a broad, lightly polished traffic strip surrounding shallow ruts,
    // rather than a long mirror-bright line on otherwise dry brick.
    float traffic=exp(-pow(pavement.z/.55,2.0))*t2Ruts;
    t2Albedo*=1.0-traffic*.05;
    t2Rough = ${brick ? '.96-traffic*.02' : '.89-traffic*.07-rut*.03'}+bond.x*0.04;
    float tool = t2Wave((pavement.x+pavement.y*0.3)*170.0);
    float rutRelief=exp(-pow(pavement.z/0.10,2.0))*t2Ruts*rutWear;
    float drainRelief=(1.0-smoothstep(0.025,0.09,abs(pavement.w)))*t2Drains;
    // inferred: only millimetric surface relief. The broad filtered joint bump
    // previously swelled across an entire brick and read as undulating terrain.
    float bumpVisible=1.0-smoothstep(.008,.035,t2Footprint(cgP));
    t2Height = (mottle-0.5)*0.0015+(rough-0.5)*0.0006 + tool*0.0002*(1.0-rut)-fracture*.0015
      -.003*(1.0-smoothstep(0.0,.012,bond.z))*bumpVisible
      -(rutRelief*0.002+drainRelief*0.012)*t2Visible(t2Footprint(cgP)*12.0);
    t2Occlusion = 1.0-bond.x*0.15-drain*0.35;
  `, { head: `uniform float t2Ruts,t2Drains;\n${o.layout ?? DEFAULT_PAVING_LAYOUT}`,
    uniforms: { t2Ruts: { value: o.ruts ?? 1 }, t2Drains: { value: o.drains ?? 1 } }, extraNoise: 1 });
  // The 65/m aggregate is close-only; the extra wear sample only affects rut lines.
  material.userData.shaderCost.closeOnlyNoise += 1;
  return material;
}
