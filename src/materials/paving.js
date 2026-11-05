import { surfaceMaterial } from './shared.js';
import { CHI } from '../yingzao/rules.js';

// 卷十五: 行廊条砖长一尺二寸、广六寸. Inferred: use this
// ordinary manufactured brick size for the avenue lanes as well.
export const PAVING_BRICK_SIZE = [1.2*CHI, 0.6*CHI];
export const PAVING_STONE_SIZE = [0.624, 0.468];
// inferred: small course-setting errors, shared by geometric and shader LODs.
export const PAVING_ROW_JITTER = 0.10;

const BOND_FILTER = /* glsl */`
// Integral of a periodic joint, evaluated over the pixel's extent on ONE axis.
// A grazing pixel may cover many transverse rows while still resolving the
// lengthwise seams. Never use the worst axis to erase both directions.
float pavingJoint(float p,float period,float halfWidth,float footprint) {
  float duty=2.0*halfWidth/period;
  float a=(p+halfWidth-footprint*.5)/period;
  float b=(p+halfWidth+footprint*.5)/period;
  float integralA=floor(a)*duty+min(fract(a),duty);
  float integralB=floor(b)*duty+min(fract(b),duty);
  return clamp((integralB-integralA)*period/footprint,0.0,1.0);
}
float pavingOffset(float row,float width) {
  return (cgHash12(vec2(row,17.1))-.5)*width*${PAVING_ROW_JITTER.toFixed(4)};
}
`;

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
    vec2 size = vec2(${(brick ? PAVING_BRICK_SIZE : PAVING_STONE_SIZE).map(v=>v.toFixed(4)).join(',')});
    float course=floor(pavement.y/size.y);
    vec2 laid=pavement.xy+vec2(pavingOffset(course,size.x),0.0);
    vec2 blockUV=laid/size; blockUV.x+=mod(course,2.0)*.5;
    vec2 blockID=floor(blockUV), local=fract(blockUV);
    // Filter the continuous metre coordinates, never the discontinuous course
    // offset/hash. Otherwise adjacent rows acquire broad moiré bands at a distance.
    vec2 pixel=max(fwidth(pavement.xy),vec2(.00001));
    vec2 d=local*size;
    // inferred: weathered outdoor mortar, with a 10 mm lane joint including
    // its worn arrises; the underlying brick dimensions remain source-sized.
    float joint=${brick ? '0.005' : '0.004'};
    float rowBlur=smoothstep(.6,1.6,pixel.y/size.y);
    float jointX=pavingJoint(laid.x+mod(course,2.0)*size.x*.5,size.x,joint,pixel.x);
    // Average the two running-bond parities when transverse courses are below
    // pixel height. Their longitudinal seams still resolve independently.
    float jointXMean=.5*(pavingJoint(pavement.x,size.x,joint,pixel.x)+
      pavingJoint(pavement.x+size.x*.5,size.x,joint,pixel.x));
    jointX=mix(jointX,jointXMean,rowBlur);
    float jointY=pavingJoint(pavement.y,size.y,joint,pixel.y);
    float mortar=1.0-(1.0-jointX)*(1.0-jointY);
    float colBlur=smoothstep(.6,1.6,pixel.x/size.x);
    float cellVisible=(1.0-rowBlur)*(1.0-colBlur);
    // Pigment hashes have a known mean. Sparse samples of many crossed bricks
    // alias into metre-scale clouds. Average unresolved cell detail; retain only
    // the small firing-lot variation where the actual course still resolves.
    // A small firing-lot difference belongs to each actual course, not to a
    // metre-scale noise field. Keep it while that row still resolves, even if
    // several brick lengths are integrated into one grazing pixel.
    float courseColour=.5+(cgHash12(vec2(course,42.7)+t2Variation)-.5)*.25;
    float cellColour=mix(.5,mix(courseColour,cgHash12(blockID+t2Variation),1.0-colBlur),1.0-rowBlur);
    float edge=min(min(d.x,size.x-d.x),min(d.y,size.y-d.y));
    vec4 bond=vec4(mortar,cellColour,edge,cellVisible);
    float mottle = t2Fbm(cgP*18.0+t2Variation,0.7);
    float rough = 0.5;
    if (t2Footprint(cgP) < 0.008) rough = t2Noise(cgP*65.0+t2Variation);
    // inferred: re-laid rectangular repairs, bounded by actual brick courses.
    // One independently placed repair per 32 x 48 brick area; no broad noise
    // field. Filtering the rectangle preserves its shape after bricks merge.
    vec2 repairGrid=vec2(32.0,48.0), repairID=floor(blockID/repairGrid);
    float repairSeed=cgHash12(repairID+vec2(31.7,8.3)+t2Variation);
    vec2 repairCells=floor(mix(vec2(8.0),vec2(20.0),vec2(repairSeed,cgHash12(repairID+19.4))));
    vec2 repairOrigin=floor(vec2(cgHash12(repairID+7.1),cgHash12(repairID+11.3))*(repairGrid-repairCells-4.0))+2.0;
    // Resolve entire replacement bricks nearby; integrate the rectangular area
    // in continuous metre coordinates when the individual cells cease to resolve.
    vec2 repairPosition=mix(pavement.xy,(blockID+.5)*size,cellVisible);
    vec2 repairP=repairPosition-(repairID*repairGrid+repairOrigin+repairCells*.5)*size;
    vec2 repairHalf=repairCells*size*.5;
    vec2 repairCoverage=clamp((min(repairP+pixel*.5,repairHalf)-max(repairP-pixel*.5,-repairHalf))/pixel,0.0,1.0);
    float repair=repairCoverage.x*repairCoverage.y*step(.38,repairSeed)*t2Repairs;
    // The tracks keep their axial shape at distance. Fine surface abrasion may
    // disappear into its mean without breaking the avenue into noisy ridges.
    float rut = t2Line(pavement.z,0.085)*t2Ruts;
    float drain = t2Line(pavement.w,0.055)*t2Drains;
    // inferred: muted, dark fired brick / blue-grey stone. Pigment differences
    // belong to individual bricks and courses, never to broad colour/noise fields.
    vec3 a = ${brick ? 'vec3(0.040,0.048,0.060)' : 'vec3(0.035,0.052,0.070)'};
    vec3 b = ${brick ? 'vec3(0.120,0.145,0.175)' : 'vec3(0.085,0.115,0.145)'};
    t2Albedo = mix(a,b,bond.y)*(.88+.24*mottle)*(0.94+0.12*rough);
    t2Albedo *= mix(vec3(1.0),vec3(1.25,1.22,1.17),repair);
    float breakage=cgHash12(blockID+vec2(82.3,7.1));
    float split=(local.x*.75+local.y*.37-.45+.012*sin(local.y*23.0+breakage*6.283))*min(size.x,size.y);
    float fracture=t2Line(split,.0012)*step(.88,breakage)*bond.w;
    t2Albedo*=1.0-fracture*.55;
    // inferred: traffic rounds brick arrises, exposes cooler fired faces and
    // presses dust into the edges of wheel tracks. Gutters collect a narrow damp
    // margin. These metre-wide bands describe use, rather than terrain height.
    float traffic=exp(-pow(pavement.z/.85,2.0))*t2Ruts;
    float trackEdge=exp(-pow((abs(pavement.z)-1.15)/.32,2.0))*t2Ruts;
    float drainDamp=exp(-pow(pavement.w/.38,2.0))*t2Drains;
    t2Albedo = mix(t2Albedo,vec3(.008,.011,.013),bond.x*(.90-traffic*.25));
    t2Albedo *= (1.0-rut*.18-drain*.65-trackEdge*.13-drainDamp*.22);
    t2Albedo *= mix(vec3(1.0),vec3(.88,.96,1.03),traffic);
    t2Rough = ${brick ? '.96-traffic*.14' : '.89-traffic*.12-rut*.03'}+bond.x*.04-drainDamp*.09;
    float tool = t2Wave((pavement.x+pavement.y*0.3)*170.0);
    float rutRelief=exp(-pow(pavement.z/0.10,2.0))*t2Ruts;
    float drainRelief=(1.0-smoothstep(0.025,0.09,abs(pavement.w)))*t2Drains;
    // inferred: only millimetric surface relief. The broad filtered joint bump
    // previously swelled across an entire brick and read as undulating terrain.
    float bumpVisible=1.0-smoothstep(.008,.035,t2Footprint(cgP));
    t2Height = (mottle-0.5)*0.0015+(rough-0.5)*0.0006 + tool*0.0002*(1.0-rut)-fracture*.0015
      -.003*(1.0-smoothstep(0.0,.012,bond.z))*bumpVisible
      -(rutRelief*0.002+drainRelief*0.012)*t2Visible(t2Footprint(cgP)*12.0);
    t2Occlusion = 1.0-bond.x*0.15-drain*0.35;
  `, { head: `uniform float t2Ruts,t2Drains,t2Repairs;\n${BOND_FILTER}\n${o.layout ?? DEFAULT_PAVING_LAYOUT}`,
    uniforms: { t2Ruts: { value: o.ruts ?? 1 }, t2Drains: { value: o.drains ?? 1 }, t2Repairs: { value: o.repairs ?? 0 } } });
  // The 65/m aggregate is close-only; repairs and track shapes need no noise octaves.
  material.userData.shaderCost.closeOnlyNoise += 1;
  return material;
}
