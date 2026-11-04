import * as THREE from 'three';
import { surfaceMaterial } from './shared.js';

/** tileCoord vec4: continuous column/row coordinates (one unit per tile), distance
 * to nearest roof boundary in metres, distance uphill from the eave in metres.
 * Attribute mapping follows the roof; weathering noise remains in world space.
 * Set ribbed:false on sculpted ornaments; use geometry for the actual roof rib silhouette.
 */
export function tileMaterial(engine, o = {}) {
  const variant = o.variant ?? 'green';
  if (!['green', 'grey', 'jianbian'].includes(variant)) throw new Error('Unknown tile variant: ' + variant);
  return surfaceMaterial(engine, `tile-${variant}`, o, /* glsl */`
    vec4 tc = vT2Tile;
    float grain = t2Fbm(cgP * 1.6 + t2Variation);
    float resolved = t2Visible(max(fwidth(tc.x), fwidth(tc.y)));
    float id = mix(0.5, cgHash12(floor(tc.xy) + t2Variation), resolved);
    float green = ${variant === 'green' ? '1.0' : variant === 'grey' ? '0.0' : '1.0 - smoothstep(t2Edging - 0.03, t2Edging + 0.03 + fwidth(tc.z), tc.z)'};
    vec3 glaze = mix(vec3(0.048,0.071,0.060), vec3(0.105,0.132,0.105), id);
    vec3 clay = mix(vec3(0.10,0.115,0.12), vec3(0.17,0.18,0.175), id);
    t2Albedo = mix(clay, glaze, green) * (0.83 + 0.34 * grain);
    float trough = (0.5 - 0.5 * t2Wave(tc.x * 6.2831853 + 1.5707963)) * t2Ribbed;
    float seam = t2Line(min(fract(tc.y), 1.0-fract(tc.y)), 0.025) * resolved;
    float exposure = mix(0.45+max(cgN.y,0.0)*0.5,1.0-smoothstep(0.0,2.5,tc.w),t2Ribbed);
    float dirt = exposure * t2Wear;
    float lichen = smoothstep(0.49, 0.66, grain) * dirt;
    t2Albedo *= 1.0 - 0.34 * trough - 0.38 * seam - 0.10 * dirt;
    // inferred: lime dust and worn glaze lighten the eave courses, with irregular runoff.
    float eaveWear=(1.0-smoothstep(0.12,1.8,tc.w))*(0.45+grain*0.55)*t2Ribbed;
    t2Albedo=mix(t2Albedo,vec3(0.22,0.218,0.16),eaveWear*t2Wear*0.65);
    t2Albedo = mix(t2Albedo, vec3(0.23,0.21,0.13), lichen * 0.8);
    // inferred: exposed clay and lime speckling collect in irregular patches across several tile laps.
    float glazeLoss=smoothstep(0.54,0.72,grain)*t2Wear;
    t2Albedo=mix(t2Albedo,vec3(0.145,0.134,0.092),glazeLoss*0.65);
    t2Rough = mix(0.82, 0.24 + 0.16*id, green) + dirt*0.13+eaveWear*0.13 + lichen*0.2;
    t2Height = (grain-0.5)*0.001 - trough*0.007*resolved
      +t2JointRelief(min(fract(tc.y),1.0-fract(tc.y))*0.30,0.002,cgP)*resolved;
    t2Occlusion = 1.0 - 0.13*trough - seam*0.15;
  `, {
    physical: true, params: { clearcoat: variant === 'grey' ? 0.0 : 0.3, clearcoatRoughness: 0.28 },
    uniforms: { t2Edging: { value: o.edgingWidth ?? 0.6 }, t2Ribbed: { value: o.ribbed === false ? 0 : 1 } },
    vertexHead: 'attribute vec4 tileCoord; varying vec4 vT2Tile;', vertexPre: 'vT2Tile = tileCoord;',
    head: 'varying vec4 vT2Tile; uniform float t2Edging, t2Ribbed;',
    attributes: { tileCoord: [0.5,0.5,0,10] },
  });
}

/** Explicit adapter for generators: mapping receives local position and vertex index. */
export function setTileCoordinates(geometry, mapping) {
  const p = geometry.getAttribute('position'), a = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) a.set(mapping(p.getX(i), p.getY(i), p.getZ(i), i), i*4);
  geometry.setAttribute('tileCoord', new THREE.BufferAttribute(a, 4));
  return geometry;
}
