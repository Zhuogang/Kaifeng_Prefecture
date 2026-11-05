import * as THREE from 'three';
import { surfaceMaterial } from './shared.js';

/** baseY/topY are world heights. batter is inward horizontal retreat per metre height.
 * Courses remain horizontal, with their vertical spacing measured along the battered face.
 */
export function masonryMaterial(engine, o = {}) {
  return surfaceMaterial(engine, 'masonry', o, /* glsl */`
    vec2 uv = t2WallUV(cgP,cgN);
    float h = cgP.y-t2BaseY;
    uv.y = h * sqrt(1.0+t2Batter*t2Batter);
    float stone = 1.0 - step(t2CourseHeight, mod(max(h,0.0),t2CoursePeriod));
    vec2 block = mix(t2BrickSize, vec2(0.936,0.1872),stone);
    vec4 bond = t2Bond(uv, block, 0.0025, t2Variation);
    float mottle = t2Fbm(cgP*vec3(0.35,0.22,0.35)+t2Variation,0.62);
    float runoff = t2Noise(vec3(uv.x*3.4, h*0.25, t2Variation));
    float damp = (1.0-smoothstep(0.0,1.4,h))*(0.5+runoff)*t2Wear;
    float salt = smoothstep(0.53,0.72,mottle) * (1.0-smoothstep(0.3,1.3,h))*t2Wear;
    vec3 brick = mix(vec3(0.105,0.108,0.102),vec3(0.265,0.25,0.225),bond.y);
    t2Albedo = mix(brick,vec3(0.145,0.16,0.168)*(0.8+bond.y*0.4),stone);
    t2Albedo = mix(t2Albedo,vec3(0.115,0.107,0.087),bond.x*0.8);
    // inferred: broad rain-washed patches and darker north-facing damp over fine brickwork.
    float rain=t2Noise(vec3(uv.x*0.7,h*0.12,t2Variation+12.0));
    float north=max(-cgN.z,0.0)*t2Wear;
    // inferred: mixed firing and occasional repairs give courses structure at facade scale.
    float repairField=cgHash12(floor(uv/vec2(1.64,0.64))+t2Variation+21.0);
    float repair=smoothstep(0.91,0.99,repairField);
    t2Albedo=mix(t2Albedo,t2Albedo*vec3(1.20,1.14,1.03),repair*0.5);
    t2Albedo *= (0.49+mottle*0.96)*(1.0-damp*0.56)*(0.78+rain*0.38);
    t2Albedo=mix(t2Albedo,t2Albedo*vec3(0.66,0.77,0.65),north*(1.0-smoothstep(0.0,3.5,h))*0.32);
    t2Albedo = mix(t2Albedo,vec3(0.48,0.465,0.40),salt*0.65);
    float lime = smoothstep(t2TopY-t2LimeWidth-0.01,t2TopY-t2LimeWidth+0.01,cgP.y);
    t2Albedo = mix(t2Albedo,vec3(0.63,0.60,0.51)*(0.8+mottle*0.25),lime);
    t2Rough = 0.88-damp*0.18;
    t2Height = (mottle-0.5)*0.002 + t2JointRelief(bond.z,0.0045,cgP)*bond.w;
    t2Occlusion = 1.0-bond.x*0.16;
  `, { uniforms: {
    t2BrickSize: { value: new THREE.Vector2(...(o.brickSize ?? [0.41,0.08])) },
    t2TopY: { value: o.topY ?? 12 }, t2Batter: { value: o.batter ?? 0 },
    t2LimeWidth: { value: o.limeWidth ?? 0.18 },
    t2CourseHeight: { value: o.courseHeight ?? 0.1872 }, t2CoursePeriod: { value: o.coursePeriod ?? 1.872 },
  }, head: 'uniform vec2 t2BrickSize; uniform float t2TopY,t2Batter,t2LimeWidth,t2CourseHeight,t2CoursePeriod;', extraNoise: 2 });
}
