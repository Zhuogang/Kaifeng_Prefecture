import * as THREE from 'three';
import { YUJIE as P } from '../world/plan.js';
import { proceduralMaterial } from '../core/materials.js';
import { masonryMaterial } from '../materials/masonry.js';
import { stoneMaterial } from '../materials/stone.js';
import { pavingMaterial } from '../materials/paving.js';
import { RiverReflection } from '../water/reflection.js';
import { GeometryBatch } from '../yingzao/geometry.js';
import { reaches, subtractGaps } from './layout.js';

export function buildCanals(engine) {
  const lining = new GeometryBatch(), coping = new GeometryBatch(), bridges = new GeometryBatch();
  const surfaces = new GeometryBatch(), width = P.section.canal - P.section.road;
  for (const sign of [-1, 1]) for (const [start, end] of reaches) {
    const cx = sign * (P.section.canal + P.section.road) / 2, z = (start + end) / 2, length = end - start;
    for (const edge of [P.section.road, P.section.canal]) {
      lining.box([sign * edge, P.surfaceY - 0.48, z], [0.42, 0.96, length]);
      for (const [a, b] of subtractGaps(start, end, P.crossings, P.crossingWidth))
        coping.box([sign * edge, P.surfaceY + P.copingHeight / 2, (a + b) / 2], [0.58, P.copingHeight, b - a]);
    }
    for (const endZ of [start, end]) {
      lining.box([cx, P.surfaceY - 0.48, endZ], [width, 0.96, 0.42]);
      coping.box([cx, P.surfaceY + P.copingHeight / 2, endZ], [width, P.copingHeight, 0.58]);
    }
    const plane = new THREE.PlaneGeometry(width - 0.42, length).rotateX(-Math.PI / 2).translate(cx, P.waterY, z);
    surfaces.add(plane); plane.dispose();
    for (const [a, b] of subtractGaps(start, end, P.crossings, P.crossingWidth))
      engine.footprints.addRect(cx, (a + b) / 2, width / 2 + 0.29, (b - a) / 2, 0, 'yujie:canal');
    for (const crossZ of P.crossings.filter(v => v > start && v < end)) {
      bridges.box([cx, P.surfaceY - 0.07, crossZ], [width + 0.8, 0.14, P.crossingWidth]);
      for (const side of [-1, 1]) {
        coping.box([cx, P.surfaceY + 0.15, crossZ + side * P.crossingWidth / 2], [width + 0.8, 0.3, 0.22]);
        engine.footprints.addRect(cx, crossZ + side * P.crossingWidth / 2, width / 2 + 0.4, 0.11, 0, 'yujie:crossing-parapet');
      }
    }
  }
  const wall = lining.mesh(masonryMaterial(engine, { topY: P.surfaceY, waterline: P.waterY }), 'yujie:brick-canal-lining');
  const cap = coping.mesh(stoneMaterial(engine, { waterline: P.waterY }), 'yujie:canal-coping');
  const crossings = bridges.mesh(pavingMaterial(engine, { ruts: 0, drains: 0 }), 'yujie:canal-crossings');
  engine.add(wall); engine.add(cap); engine.add(crossings);
  const reflection = new RiverReflection(engine, P.waterY); reflection.register(wall); reflection.register(cap);
  const time = { value: engine.time };
  // inferred: shallow silt-green water; sky and masonry reflect through the public water reflection API.
  const material = proceduralMaterial({ name: 'yujie:silt-canal-water', type: 'physical',
    params: { color: 0xffffff, roughness: 0.16, metalness: 0, ior: 1.333 },
    uniforms: { ...reflection.uniforms, canalTime: time },
    head: `uniform float canalTime,riverReflectionOn; uniform sampler2D riverReflection;
      uniform mat4 riverReflectionMatrix; vec3 canalNormal;`,
    color: `diffuseColor.rgb=mix(vec3(0.045,0.069,0.029),vec3(0.11,0.12,0.065),cgVnoise2(cgP.xz*0.5));`,
    normal: `float w=1.0-smoothstep(0.1,0.7,length(fwidth(cgP.xz)));
      canalNormal=normalize(vec3(sin(cgP.x*9.0+cgP.z*3.0+canalTime*.4)*.018*w,1.0,cos(cgP.z*11.0+canalTime*.2)*.012*w));
      cgBump=canalNormal-vec3(0,1,0);`,
  });
  const compile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      vec4 rp=riverReflectionMatrix*vec4(cgP,1.0);
      vec3 reflectionColor=texture2D(riverReflection,rp.xy/rp.w+canalNormal.xz*.025).rgb;
      float fresnel=.0204+.9796*pow(1.0-clamp(dot(canalNormal,cgV),0.0,1.0),5.0);
      reflectedLight.indirectSpecular=mix(reflectedLight.indirectSpecular,reflectionColor*fresnel,riverReflectionOn);`);
  };
  material.userData.shaderKey += ':canal-planar';
  const water = surfaces.mesh(material, 'yujie:canal-water');
  water.onBeforeRender = (renderer, scene, camera) => reflection.update(renderer, camera);
  engine.onUpdate(t => { time.value = t; }); engine.add(water, { castShadow: false });
  return { water, reflection };
}
