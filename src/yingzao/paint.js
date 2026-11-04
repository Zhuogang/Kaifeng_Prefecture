import * as THREE from 'three';
import { surfaceMaterial } from '../materials/shared.js';

export const MEMBER_TYPES = Object.freeze({ beam: 0, gong: 1, dou: 2, ang: 3, column: 4 });

/** Composable proceduralMaterial hook inputs, also consumed by paintMaterial below.
 * memberUV: normalized coordinates across a member face, memberSize: its size in metres,
 * memberType: MEMBER_TYPES enum, memberEdge: distance to the actual rolled/cut edge in
 * metres (negative = use rectangular UV boundary). Supply these per vertex when merging.
 * Source: 营造法式卷十四, 五彩遍裝 / 碾玉裝 / 丹粉刷飾; no Qing pattern vocabulary.
 */
export function paintHook(style = 'wucai') {
  if (!['wucai','nianyu','danfen'].includes(style)) throw new Error('Unknown paint style: '+style);
  return {
    vertexHead: `attribute vec2 memberUV, memberSize; attribute float memberType, memberEdge;
      varying vec2 vT2MemberUV,vT2MemberSize; varying float vT2MemberType,vT2MemberEdge;`,
    vertexPre: `vT2MemberUV=memberUV; vT2MemberSize=memberSize;
      vT2MemberType=memberType; vT2MemberEdge=memberEdge;`,
    head: `varying vec2 vT2MemberUV,vT2MemberSize; varying float vT2MemberType,vT2MemberEdge;`,
    attributes: { memberUV:[0.5,0.5],memberSize:[1,0.25],memberType:[0],memberEdge:[-1] },
    body: /* glsl */`
      vec2 uv = vT2MemberUV, size = max(vT2MemberSize,vec2(0.001));
      vec2 edges = min(uv,1.0-uv)*size;
      float edge = vT2MemberEdge >= 0.0 ? vT2MemberEdge : min(edges.x,edges.y);
      float aa = max(fwidth(edge),0.0005);
      float member = vT2MemberType;
      // inferred: floral spacing / pigment values; stylised lotus and scrolling leaves.
      float mottle = t2Fbm(cgP*3.0+t2Variation);
      float flakes = t2Noise(cgP*47.0+t2Variation);
      float wear = smoothstep(0.44,0.65,mottle*0.55+flakes*0.45)*t2Wear;
      vec3 red=vec3(0.27,0.065,0.032), blue=vec3(0.035,0.105,0.14), green=vec3(0.045,0.15,0.105);
      vec3 chalk=vec3(0.59,0.54,0.40), ochre=vec3(0.38,0.245,0.09);
      float band = (member < 0.5 ? 0.20 : 0.10) * size.y;
      float gradient = smoothstep(0.0,band,edge);
      vec3 border = mix(blue,chalk,pow(gradient,1.8)*0.75);
      float inner = smoothstep(band-aa,band+aa,edge);
      float pigment = mod(floor(uv.x*3.0),2.0);
      vec3 field = ${style === 'wucai' ? 'mix(red,green,pigment*0.7)' : style === 'nianyu' ? 'mix(blue,green,smoothstep(0.0,0.5,uv.y))' : 'red'};
      t2Albedo = mix(border,field,inner);
      ${style === 'danfen' ? `
        // 卷十四: 1/8 member height, bounded by 五分..一寸 (0.0156..0.0312 m).
        float whiteWidth = clamp(size.y/8.0,0.0156,0.0312);
        float white = 1.0-smoothstep(whiteWidth-aa,whiteWidth+aa,
          vT2MemberEdge >= 0.0 ? vT2MemberEdge : uv.y*size.y);
        t2Albedo = mix(red,chalk,white);
        t2Albedo = mix(t2Albedo,ochre,max(-cgN.y,0.0)*0.6);
      ` : `
        float units = max(1.0,floor(size.x/0.48));
        vec2 flower = vec2(fract(uv.x*units)-0.5,(uv.y-0.5)*1.1);
        float angle = atan(flower.y,flower.x);
        float radius = length(flower);
        float petal = 0.17+0.065*cos(angle*6.0);
        float line = t2Line(radius-petal,0.018);
        float core = 1.0-smoothstep(0.035,0.06,radius);
        float vine = t2Line(uv.y-0.5-0.16*sin(uv.x*units*6.2831853),0.012);
        float detail = t2Visible(max(fwidth(uv.x*units),fwidth(uv.y))*3.0);
        float floral = max(line,core)*inner*detail;
        float leaf = vine*inner*detail*0.6;
        // Beams carry flowers, dou use fourfold medallions; gong/ang keep rolled edges readable.
        float medallion = t2Line(radius-(0.21+0.045*cos(angle*4.0)),0.024)*inner*detail;
        floral = mix(floral,medallion,step(1.5,member)*(1.0-step(2.5,member)));
        vec3 flowerInk = ${style === 'wucai' ? 'mix(ochre,chalk,0.45)' : 'mix(green,chalk,0.35)'};
        t2Albedo = mix(t2Albedo,flowerInk,max(floral,leaf)*0.9);
        float paleLine=t2Line(edge-band,0.0025);
        t2Albedo=mix(t2Albedo,chalk,paleLine*0.6);
      `}
      t2Albedo *= 0.82+mottle*0.32;
      t2Albedo = mix(t2Albedo,vec3(0.17,0.105,0.055)*(0.7+flakes*0.6),wear);
      t2Rough=0.75+wear*0.17;
      t2Height=(flakes-0.5)*0.0007-wear*0.0012;
    `,
  };
}

export function paintMaterial(engine, o = {}) {
  const hook = paintHook(o.style ?? 'wucai');
  return surfaceMaterial(engine,`paint-${o.style ?? 'wucai'}`,o,hook.body,{ ...hook, extraNoise:1 });
}

/** Supply face mapping from construction geometry; default uses its existing face UVs.
 * edgeAt optionally computes real silhouette-edge distance for shaped gong/ang members.
 */
export function setMemberAttributes(geometry, { type='beam', size=[1,0.25], uvAt, edgeAt } = {}) {
  const p=geometry.attributes.position, uv=geometry.attributes.uv;
  const uvs=new Float32Array(p.count*2), sizes=new Float32Array(p.count*2);
  const types=new Float32Array(p.count), edges=new Float32Array(p.count);
  for(let i=0;i<p.count;i++) {
    const v=[p.getX(i),p.getY(i),p.getZ(i)];
    uvs.set(uvAt ? uvAt(...v,i) : uv ? [uv.getX(i),uv.getY(i)] : [0.5,0.5],i*2);
    sizes.set(size,i*2); types[i]=typeof type === 'number' ? type : MEMBER_TYPES[type];
    edges[i]=edgeAt ? edgeAt(...v,i) : -1;
  }
  geometry.setAttribute('memberUV',new THREE.BufferAttribute(uvs,2));
  geometry.setAttribute('memberSize',new THREE.BufferAttribute(sizes,2));
  geometry.setAttribute('memberType',new THREE.BufferAttribute(types,1));
  geometry.setAttribute('memberEdge',new THREE.BufferAttribute(edges,1));
  return geometry;
}
