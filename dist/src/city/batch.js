import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { proceduralMaterial } from '../core/materials.js';

// inferred: distant city surfaces share one filtered shader, so each hall's six
// material batches can be drawn together. Hero masonry uses the shared families.
const PALETTE = { timber: [0.09, 0.048, 0.027], bracket: [0.15, 0.078, 0.037],
  plaster: [0.46, 0.44, 0.39], stone: [0.18, 0.19, 0.18], tile: [0.115, 0.145, 0.17], ridge: [0.10, 0.125, 0.145] };

export function packedGeometry(group, { green = false } = {}) {
  group.updateMatrixWorld(true);
  const parts = [];
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const n = g.attributes.position.count, roof = ['tile', 'ridge'].includes(mesh.name);
    // Public hall roof UVs are metres; the city shader consumes tile periods.
    if(roof&&g.attributes.uv)for(let i=0;i<n;i++) {
      const uv=g.attributes.uv;uv.setXY(i,uv.getX(i)/.26,uv.getY(i)/.35);
    }
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
    vertexHead: `attribute float cityKind; varying float vCityKind; varying vec2 vCityUV; varying vec2 vCityTileUV;
      #ifdef USE_INSTANCING
      attribute float cityStorey;
      #endif`,
    vertexPre: `vCityKind=cityKind; vCityUV=uv; vCityTileUV=uv;
      #ifdef USE_INSTANCING
      vCityTileUV*=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[2].xyz));
      // inferred: a second storey raises the roof without stretching its pitch.
      if(cityKind>1.5 || position.y>3.80) transformed.y+=cityStorey;
      else transformed.y*=1.0+cityStorey/3.80;
      if(cityKind>0.5 && cityKind<1.5 && cityStorey>1.0) vCityUV.y*=2.0;
      #endif`,
    head: `varying float vCityKind; varying vec2 vCityUV; varying vec2 vCityTileUV; uniform float cityDusk;
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
      if(vCityKind>3.5) {
        // inferred: coursed grey court paving, filtered to its area-average
        // mortar fraction once individual joints are smaller than a pixel.
        vec2 q=cgP.xz/vec2(.75,.45);q.x+=mod(floor(q.y),2.0)*.5;
        vec2 edge=min(fract(q),1.0-fract(q)),aa=max(fwidth(q),vec2(.0001));
        vec2 joint=1.0-smoothstep(vec2(.018)-aa,vec2(.018)+aa,edge);
        float mortar=mix(max(joint.x,joint.y),.071,smoothstep(.2,.9,max(aa.x,aa.y)));
        diffuseColor.rgb*=1.0-.32*mortar;
      }
      if(vCityKind>1.5 && vCityKind<2.5) {
        // inferred: cool grey fired tile, with low-saturation batch variation; 4% thatch.
        diffuseColor.rgb*=mix(vec3(.96,.98,1.0),vec3(1.04,1.02,1.0),cgSeed);
        float straw=step(0.96,cgSeed);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.23,0.17,0.087),straw);
        // inferred: 0.26 x 0.35 m common tile spacing. The old 24-radian
        // frequency made centimetre-sized noise which vanished even nearby.
        vec2 fp=fwidth(vCityTileUV);
        vec2 detail=1.0-smoothstep(vec2(.25),vec2(1.0),fp);
        float ribs=cos(vCityTileUV.x*6.2831853);
        float courses=cos(vCityTileUV.y*6.2831853);
        diffuseColor.rgb*=1.0+.13*ribs*detail.x+.10*courses*detail.y;
      }
      if(vCityKind>0.5 && vCityKind<1.5) {
        float y=fract(vCityUV.y);
        float window=cityWindow(vCityUV);
        diffuseColor.rgb*=1.0-0.72*window;
        diffuseColor.rgb*=mix(.35,1.0,smoothstep(.0,.035,y));
      }
    `,
    emissive: `
      // inferred: unresolved alleys and roofs retain diffuse sky fill instead of
      // closing to black. This is a small material radiance floor, not new fog;
      // direct sun and the true pitched normals still provide the main contrast.
      float farFill=smoothstep(180.0,900.0,length(cameraPosition-cgP));
      vec3 skyFill=mix(vec3(.10,.14,.20)*farFill,vec3(.055,.085,.15),cityDusk);
      if(vCityKind<2.5 || vCityKind>3.5) totalEmissiveRadiance+=diffuseColor.rgb*skyFill;
      if(vCityKind>2.5 && vCityKind<3.5) totalEmissiveRadiance+=vec3(12.0,3.0,.42)*cityDusk;
      if(vCityKind>0.5 && vCityKind<1.5) {
        float window=cityWindow(vCityUV);
        float bars=mix(step(.14,fract(vCityUV.x*23.0)),.86,smoothstep(.2,1.0,fwidth(vCityUV.x*23.0)));
        float occupied=cgSeed;
        #ifndef USE_INSTANCING
        // inferred: occupied office bays follow fixed room-sized world cells.
        occupied=cgHash12(floor(cgP.xz/8.0));
        #endif
        totalEmissiveRadiance+=vec3(2.4,.65,.1)*window*bars*cityDusk*step(.65,occupied);
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
