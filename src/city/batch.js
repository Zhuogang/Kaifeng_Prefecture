import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { proceduralMaterial } from '../core/materials.js';

// inferred: distant city surfaces share one filtered shader, so each hall's six
// material batches can be drawn together. Hero masonry uses the shared families.
const PALETTE = { timber: [0.09, 0.048, 0.027], bracket: [0.15, 0.078, 0.037],
  plaster: [0.46, 0.44, 0.39], stone: [0.18, 0.19, 0.18], tile: [0.12, 0.135, 0.145], ridge: [0.10, 0.115, 0.12] };

export function packedGeometry(group, { green = false } = {}) {
  group.updateMatrixWorld(true);
  const parts = [];
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const n = g.attributes.position.count, roof = ['tile', 'ridge'].includes(mesh.name);
    const c = green && roof ? [0.055, 0.105, 0.075] : PALETTE[mesh.name] || PALETTE.stone;
    const colors = new Float32Array(n * 3), kinds = new Float32Array(n);
    for (let i = 0; i < n; i++) { colors.set(c, i * 3); kinds[i] = roof ? 2 : mesh.name === 'plaster' ? 1 : 0; }
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('cityKind', new THREE.BufferAttribute(kinds, 1));
    g.clearGroups(); parts.push(g);
  });
  const merged = mergeGeometries(parts); parts.forEach(g => g.dispose());
  merged.computeBoundingSphere(); return merged;
}

export function colorGeometry(geometry, color, kind = 0) {
  const g = geometry.clone(), c = new THREE.Color(color), n = g.attributes.position.count;
  if (!g.index) g.setIndex(Array.from({length:n},(_,i)=>i));
  const colors = new Float32Array(n * 3), kinds = new Float32Array(n);
  for (let i = 0; i < n; i++) { colors.set(c.toArray(), i * 3); kinds[i] = kind; }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.setAttribute('cityKind', new THREE.BufferAttribute(kinds, 1));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'cityKind'].includes(key)) g.deleteAttribute(key);
  return g;
}

export function cityMaterial(engine) {
  const dusk = { value: 0 };
  const material = proceduralMaterial({ name: 'batched-city-surfaces',
    params: { vertexColors: true, roughness: 0.88 }, uniforms: { cityDusk: dusk },
    vertexHead: `attribute float cityKind; varying float vCityKind; varying vec2 vCityUV;
      #ifdef USE_INSTANCING
      attribute float cityStorey;
      #endif`,
    vertexPre: `vCityKind=cityKind; vCityUV=uv;
      #ifdef USE_INSTANCING
      // inferred: a second storey raises the roof without stretching its pitch.
      if(cityKind>1.5 || position.y>3.80) transformed.y+=cityStorey;
      else transformed.y*=1.0+cityStorey/3.80;
      if(cityKind>0.5 && cityKind<1.5 && cityStorey>1.0) vCityUV.y*=2.0;
      #endif`,
    head: `varying float vCityKind; varying vec2 vCityUV; uniform float cityDusk;
      float cityWindow(vec2 uv) {
        float y=fract(uv.y);
        float mask=step(.26,uv.x)*step(uv.x,.74)*step(.38,y)*step(y,.78);
        // inferred: unresolved windows converge to their 19.2% wall area, avoiding
        // sparkling single pixels as distant roofs change LOD or the camera moves.
        float footprint=max(length(dFdx(uv)),length(dFdy(uv)));
        return mix(mask,.192,smoothstep(.08,.45,footprint));
      }`,
    color: `
      float grain=cgVnoise3(cgP*0.31);
      diffuseColor.rgb*=0.86+0.28*grain;
      if(vCityKind>1.5 && vCityKind<2.5) {
        // inferred: 4% thatch, with a small warm/cool grey tile variation.
        diffuseColor.rgb*=mix(vec3(.93,.97,1.02),vec3(1.08,1.01,.94),cgSeed);
        float straw=step(0.96,cgSeed);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.23,0.17,0.087),straw);
        float fp=max(length(dFdx(vCityUV)),length(dFdy(vCityUV)));
        float ribs=sin(vCityUV.x*24.17)*sin(vCityUV.y*17.95);
        diffuseColor.rgb*=1.0+0.1*ribs*(1.0-smoothstep(0.025,0.18,fp));
      }
      if(vCityKind>0.5 && vCityKind<1.5) {
        float y=fract(vCityUV.y);
        float window=cityWindow(vCityUV);
        diffuseColor.rgb*=1.0-0.72*window;
        diffuseColor.rgb*=mix(.35,1.0,smoothstep(.0,.035,y));
      }
    `,
    emissive: `
      if(vCityKind>2.5) totalEmissiveRadiance+=vec3(12.0,3.0,.42)*cityDusk;
      if(vCityKind>0.5 && vCityKind<1.5) {
        float window=cityWindow(vCityUV);
        float bars=mix(step(.14,fract(vCityUV.x*23.0)),.86,smoothstep(.2,1.0,fwidth(vCityUV.x*23.0)));
        totalEmissiveRadiance+=vec3(2.4,.65,.1)*window*bars*cityDusk*step(.65,cgSeed);
      }
    `,
  });
  material.userData.updateCityTime = () => { dusk.value = engine.timePreset === 'bluehour' ? 1 : 0; };
  return material;
}

/** Pack transformed parts without retaining temporary hall objects/materials. */
export function mergePacked(parts) {
  const g = mergeGeometries(parts); parts.forEach(p => p.dispose()); g.computeBoundingSphere(); return g;
}

export function disposeHall(hall) {
  const materials = new Set();
  for (const group of [hall.lod0, hall.lod1, hall.lod2]) group.traverse(o => {
    if (o.isMesh) { o.geometry.dispose(); materials.add(o.material); }
  });
  for (const material of materials) material.dispose();
}
