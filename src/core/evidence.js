import * as THREE from 'three';
import { GROUND, BOX, ZHOUQIAO, BIANHE, XUANDE, YUJIE, PALACE, CITY, CITY_WALLS, TIETA, WILLOWS } from '../world/plan.js';

// inferred: categorical display colours and tint strength are UI choices, not historic colours.
export const EVIDENCE = {
  excavated: { label: '考古 / 实存 · Excavated / extant', color: '#43bce8' },
  text: { label: '文献 · Text', color: '#f3a340' },
  painting: { label: '图像 · Painting', color: '#cf7edf' },
  inferred: { label: '推定 · Inferred', color: '#7e8996' },
};

const wing = { evidence: 'text', source: '《东京梦华录》卷一 大内：曲尺朵楼，朱栏彩槛；形制见 ART_BIBLE.md，尺寸与布局推定', label: '宣德楼 · 朵楼' };
const roof = { evidence: 'painting', source: 'ART_BIBLE.md：《瑞鹤图》的琉璃瓦、鸱尾与拒鹊子；屋顶尺寸推定', label: '宣德楼 · 屋顶与鸱尾' };
const metadata = (entry, label) => ({ evidence: entry.evidence, source: entry.source, label });
const modules = {
  ground: metadata(GROUND, '黄河平原'), bianhe: metadata(BIANHE, '汴河'),
  zhouqiao: metadata(ZHOUQIAO, '州桥 · 位置'), xuande: metadata(XUANDE, '宣德楼 · 重建'),
  yujie: metadata(YUJIE, '御街 · 宽度与次序'), palace: metadata(PALACE, '宫城 · 布局'),
  city: metadata(CITY, '坊巷 · 街区'), walls: metadata(CITY_WALLS, '城垣 · 重建'),
  tieta: metadata(TIETA.dimensions, '铁塔 · 实存'), flora: metadata(WILLOWS, '植被 · 布置'),
};

function tag(object, data, regions = []) {
  if (!object) return;
  Object.assign(object.userData, { evidence: data.evidence, evidenceSource: data.source,
    evidenceLabel: data.label, evidenceRegions: regions });
}

function readTag(object, point) {
  const data = object.userData;
  // Later regions take precedence, just as in the tint shader.
  const region = point && data.evidenceRegions?.findLast(r =>
    point.x >= r.min[0] && point.y >= r.min[1] && point.z >= r.min[2] &&
    point.x <= r.max[0] && point.y <= r.max[1] && point.z <= r.max[2]);
  return region || { evidence: data.evidence, source: data.evidenceSource, label: data.evidenceLabel };
}

/** Attach sources after construction so shared world modules and their batching stay untouched. */
function tagWorld(engine) {
  const r = engine.registry;
  for (const root of engine.scene.children) {
    const data = modules[root.userData.module];
    if (data) root.traverse(o => tag(o, data));
  }
  // Registry roots also support isolated module inspections, without consulting a camera.
  for (const [object, data] of [
    [r.ground, modules.ground], [r.calibrationBox, metadata(BOX, '校准块')],
    [r.bianhe?.group, modules.bianhe], [r.bianhe?.water, modules.bianhe], [r.bianhe?.boats, modules.bianhe],
    [r.xuande?.root, modules.xuande], [r.palace?.root, modules.palace],
    [r.city?.group, modules.city], [r.city?.office, modules.city],
    [r.cityWalls?.shell, modules.walls], [r.cityWalls?.timber, modules.walls],
    [r.tieta?.mesh, modules.tieta],
  ]) object?.traverse(o => tag(o, data));
  for (const root of engine.scene.children) if (root.name.startsWith('yujie')) root.traverse(o => tag(o, modules.yujie));

  r.zhouqiao?.group.traverse(o => tag(o, metadata(ZHOUQIAO.dimensions, '州桥 · 石柱、石梁与桥面')));
  for (const { lod } of r.zhouqiao?.halls || []) lod.traverse(o => tag(o, metadata(ZHOUQIAO.quetowers, '州桥 · 北岸两阙位置')));
  r.bianhe?.group.traverse(o => {
    if (o.name.startsWith('carved-wall-LOD')) tag(o, metadata(BIANHE.carvedWalls, '州桥 · 海马、双鹤与飞云石壁'));
  });
  // Xuande is baked by material across the entire complex. Regions retain those batches
  // while distinguishing textual wings and doors from inferred masonry and painted roofs.
  // inferred: part-selection bounds and margins identify batches; they add no architecture.
  const tagXuande = o => {
    if (!o.isMesh) return;
    const halfHall = XUANDE.hall.frontBays.reduce((a, b) => a + b, 0) / 2;
    const outer = Math.max(...XUANDE.wingPlatforms.map(p => Math.abs(p.center[0]) + p.width / 2));
    const north = Math.min(...XUANDE.wingPlatforms.map(p => p.center[2] - p.depth / 2));
    const south = Math.max(...XUANDE.wingPlatforms.map(p => p.center[2] + p.depth / 2));
    const regions = [-1, 1].map(sign => ({ ...wing,
      min: [sign < 0 ? -outer : halfHall, XUANDE.platform.height, north],
      max: [sign < 0 ? -halfHall : outer, Infinity, south] }));
    if (['door', 'gold', 'iron'].includes(o.name)) regions.push({ ...metadata(XUANDE.doors, '宣德楼 · 五门'),
      min: [XUANDE.doors.centers[0] - XUANDE.doors.width / 2, 0, -XUANDE.doors.recess - XUANDE.doors.width],
      max: [XUANDE.doors.centers.at(-1) + XUANDE.doors.width / 2, XUANDE.doors.height + 0.5, 0] });
    if (['tile', 'ridge', 'chiwei', 'chuishou'].includes(o.name)) regions.push({ ...roof,
      min: [-Infinity, XUANDE.platform.height, -Infinity], max: [Infinity, Infinity, Infinity] });
    const base = ['tile', 'chiwei', 'chuishou'].includes(o.name) ? roof
      : ['gold', 'iron'].includes(o.name) ? metadata(XUANDE.doors, '宣德楼 · 五门') : modules.xuande;
    tag(o, base, regions);
  };
  r.xuande?.root.traverse(tagXuande);
  const picking = { sources: [], excluded: new Set() };
  if (r.xuande) {
    // The builder retains its per-building LOD1 sources. Use those for picking:
    // the rendered complex's merged material bounds span several unrelated halls.
    // These objects stay outside the scene and never add a draw call.
    r.xuande.root.traverse(o => picking.excluded.add(o));
    const addSource = object => { if (object.isMesh && object.material.colorWrite !== false)
      picking.sources.push({ object, visibleRoot: r.xuande.root }); };
    const platform = r.xuande.platform.levels[1].object;
    platform.traverse(tagXuande); platform.traverse(addSource);
    for (const { hall, entry } of r.xuande.halls) hall.lod1.traverse(o => {
      if (!o.isMesh) return;
      tag(o, ['tile', 'ridge', 'chiwei', 'chuishou'].includes(o.name) ? roof : entry === XUANDE.hall ? modules.xuande : wing);
      addSource(o);
    });
  }
  return picking;
}

const number = n => Number.isFinite(n) ? String(Number(n.toFixed(5))) : (n < 0 ? '-1e20' : '1e20');
const vec = v => `vec3(${v.map(n => `${number(n)}${Number.isInteger(n) && Number.isFinite(n) ? '.0' : ''}`).join(',')})`;
const colour = kind => vec(new THREE.Color(EVIDENCE[kind].color).toArray());

function tintMaterial(original, data) {
  // Material.copy serialises userData. Live reflection uniforms contain render-target
  // textures, so copy the rendering properties through a view with empty userData.
  const template = Object.create(original); template.userData = {};
  const material = new original.constructor().copy(template);
  material.defines = { ...original.defines };
  // clone() does not retain compile callbacks, custom default attributes, or live uniforms.
  // Keep the originals' animation, CSM and procedural hooks, including their shared uniforms.
  material.userData = { ...original.userData, noPatch: true };
  material.defaultAttributeValues = original.defaultAttributeValues;
  const regions = data.evidenceRegions || [];
  const choose = regions.map(r => `if (all(greaterThanEqual(vEvidencePosition, ${vec(r.min)})) &&
    all(lessThanEqual(vEvidencePosition, ${vec(r.max)}))) evidenceColour = ${colour(r.evidence)};`).join('\n');
  material.onBeforeCompile = (shader, renderer) => {
    original.onBeforeCompile.call(original, shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vEvidencePosition;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 evidencePosition = vec4(transformed, 1.0);
        #ifdef USE_BATCHING
          evidencePosition = batchingMatrix * evidencePosition;
        #endif
        #ifdef USE_INSTANCING
          evidencePosition = instanceMatrix * evidencePosition;
        #endif
        vEvidencePosition = (modelMatrix * evidencePosition).xyz;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEvidencePosition;')
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        vec3 evidenceColour = ${colour(data.evidence)};
        ${choose}
        float evidenceShade = 0.65 + 0.35 * clamp(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, evidenceColour * evidenceShade, 0.9);`);
  };
  const key = `${original.customProgramCacheKey()}|evidence:${data.evidence}:${choose}`;
  material.customProgramCacheKey = () => key;
  return material;
}

/** Optional material view: no renderer hooks, added meshes, or shader changes while off. */
export class EvidenceView {
  constructor(engine) {
    this.engine = engine;
    this.enabled = false;
    this.originals = new Map();
    this.materials = new Map();
    this.raycaster = new THREE.Raycaster();
    this.box = new THREE.Box3(); this.point = new THREE.Vector3();
    this.matrix = new THREE.Matrix4();
    this.lastPose = '';
    this.picking = tagWorld(engine);
    this.panel = document.getElementById('evidence-panel');
    this.source = document.getElementById('evidence-source');
    this.button = document.getElementById('evidence-toggle');
    const legend = document.getElementById('evidence-key');
    if (legend) for (const { label, color } of Object.values(EVIDENCE)) {
      const item = document.createElement('li'), swatch = document.createElement('span');
      swatch.style.backgroundColor = color; swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, document.createTextNode(label)); legend.appendChild(item);
    }
    this.button?.addEventListener('click', () => this.toggle());
    document.getElementById('evidence-close')?.addEventListener('click', () => this.setEnabled(false));
    addEventListener('keydown', event => {
      if (event.code !== 'KeyV' || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName) || event.target?.isContentEditable) return;
      event.preventDefault(); this.toggle();
    });
    // inferred: poll at most 3 Hz, only after the camera changes and only while enabled.
    // AABB broad phase plus a fixed triangle budget avoids full-city raycasts.
    this.timer = null;
  }

  toggle() { return this.setEnabled(!this.enabled); }

  setEnabled(enabled) {
    enabled = Boolean(enabled);
    if (enabled === this.enabled) return enabled;
    if (enabled) {
      // Constant vertex attributes are GL context state, not VAO state. Different
      // shader variants can assign different locations to procedural defaults.
      // Preserve these too, or cached normal-view VAOs can inherit tinted-view
      // defaults on instanced fences and roof ornaments after restoration.
      const gl = this.engine.renderer.getContext();
      this.attributeDefaults = Array.from({ length: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) },
        (_, i) => new Float32Array(gl.getVertexAttrib(i, gl.CURRENT_VERTEX_ATTRIB)));
      this.engine.scene.traverse(object => {
        if (!object.isMesh || !EVIDENCE[object.userData.evidence] || object.userData.noPatch) return;
        const originals = Array.isArray(object.material) ? object.material : [object.material];
        if (originals.every(m => m.colorWrite === false || m.isShaderMaterial)) return;
        this.originals.set(object, object.material);
        const tinted = originals.map(original => {
          if (original.colorWrite === false || original.isShaderMaterial) return original;
          const signature = `${object.userData.evidence}:${JSON.stringify(object.userData.evidenceRegions)}`;
          if (!this.materials.has(original)) this.materials.set(original, new Map());
          const variants = this.materials.get(original);
          if (!variants.has(signature)) variants.set(signature, tintMaterial(original, object.userData));
          return variants.get(signature);
        });
        object.material = Array.isArray(object.material) ? tinted : tinted[0];
      });
      this.pickObjects = [...this.originals.keys()].filter(o => !this.picking.excluded.has(o))
        .map(object => ({ object })).concat(this.picking.sources);
      this.pickClusters = new WeakMap();
    } else {
      for (const [object, original] of this.originals) {
        object.material = original;
        // Tier changes visit the currently installed materials. Keep the restored
        // originals consistent if quality changed while the evidence view was on.
        for (const material of Array.isArray(original) ? original : [original]) {
          if (material.defines?.USE_CSM !== undefined && material.defines.CSM_CASCADES !== this.engine.quality.cascades) {
            material.defines.CSM_CASCADES = this.engine.quality.cascades; material.needsUpdate = true;
          }
        }
      }
      this.originals.clear();
      // Release optional programs, including any clones used only by this view.
      for (const variants of this.materials.values()) for (const material of variants.values()) material.dispose();
      this.materials.clear();
      const gl = this.engine.renderer.getContext();
      this.attributeDefaults.forEach((value, i) => gl.vertexAttrib4fv(i, value));
      this.attributeDefaults = null;
      this.pickObjects = null;
      this.pickClusters = null;
      this.selected = null;
    }
    this.enabled = enabled;
    this.engine._accFrames = undefined;
    this.lastPose = '';
    if (this.panel) this.panel.hidden = !enabled;
    this.button?.setAttribute('aria-pressed', String(enabled));
    if (this.button) this.button.textContent = enabled ? 'V · 正常视图 / Normal view' : 'V · 证据 / Evidence';
    clearInterval(this.timer); this.timer = null;
    if (enabled) { this.selectCentre(); this.timer = setInterval(() => this.selectCentre(), 350); }
    else if (this.source) this.source.textContent = '';
    return enabled;
  }

  selectCentre() {
    if (!this.enabled) return null;
    const camera = this.engine.camera;
    camera.updateMatrixWorld(true);
    const pose = [...camera.matrixWorld.elements, camera.fov, this.engine.time].join(',');
    if (pose === this.lastPose) return this.selected;
    this.lastPose = pose;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const ray = this.raycaster.ray, candidates = [];
    for (const { object, visibleRoot } of this.pickObjects) {
      let visible = true;
      for (let parent = visibleRoot || object; parent; parent = parent.parent) if (!parent.visible) { visible = false; break; }
      if (!visible || (object.isInstancedMesh && !object.count)) continue;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      if (object.isInstancedMesh) {
        // Do not raycast a giant instance batch. Test its current per-instance bounds instead.
        // A sparse world-space grid or triangle BVH is unnecessary for these bounded queries.
        if (!object.boundingSphere) object.computeBoundingSphere();
        const sphere = object.boundingSphere.clone().applyMatrix4(object.matrixWorld);
        if (!ray.intersectsSphere(sphere)) continue;
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, this.matrix); this.matrix.premultiply(object.matrixWorld);
          this.box.copy(object.geometry.boundingBox).applyMatrix4(this.matrix);
          if (ray.intersectBox(this.box, this.point)) candidates.push({ object,
            distance: this.box.containsPoint(ray.origin) ? 0 : this.point.distanceTo(ray.origin), instance: i });
        }
      } else {
        this.box.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
        if (ray.intersectBox(this.box, this.point)) candidates.push({ object,
          distance: this.box.containsPoint(ray.origin) ? 0 : this.point.distanceTo(ray.origin) });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    let selected = null, best = Infinity, triangles = 0;
    // inferred: at most 60,000 triangle tests over the nearest sixteen broad-phase hits.
    // Bounds alone must never select empty space inside a merged city-wide batch.
    for (const candidate of candidates.slice(0, 16)) {
      if (candidate.distance > best) break;
      const object = candidate.object, geometry = object.geometry;
      const cost = (geometry.index?.count || geometry.attributes.position.count) / 3;
      let point, distance;
      if (triangles + cost <= 60000) {
        triangles += cost;
        // Mesh.raycast on one instance only, sharing geometry/material without scene insertion.
        const proxy = new THREE.Mesh(geometry, object.material);
        proxy.matrixWorld.copy(object.matrixWorld);
        if (candidate.instance !== undefined) {
          object.getMatrixAt(candidate.instance, this.matrix); proxy.matrixWorld.multiply(this.matrix);
        }
        const hits = []; proxy.raycast(this.raycaster, hits);
        if (!hits.length) continue;
        hits.sort((a, b) => a.distance - b.distance);
        point = hits[0].point; distance = hits[0].distance;
      } else {
        const hit = this.intersectClusters(object, candidate.instance, 60000 - triangles);
        triangles += hit.tests;
        if (!hit.point) continue;
        point = hit.point; distance = point.distanceTo(ray.origin);
      }
      if (distance < best) { best = distance; selected = readTag(object, point); }
    }
    this.selected = selected;
    if (this.source) this.source.textContent = selected
      ? `${selected.label} · ${EVIDENCE[selected.evidence].label} — ${selected.source}`
      : '望向城中建筑以查看来源 · Look at a city feature to see its source';
    return selected;
  }

  intersectClusters(object, instance, budget) {
    if (budget <= 0) return { point: null, tests: 0 };
    const geometry = object.geometry, positions = geometry.attributes.position, index = geometry.index;
    const count = index?.count || positions.count, vertex = i => index ? index.getX(i) : i;
    // Consecutive construction triangles are spatially local. Cache small cluster
    // bounds on demand instead of scanning every face of a merged roof or wall.
    // inferred: 128 triangles per cluster is a picking performance choice.
    const stride = 128 * 3;
    let bounds = this.pickClusters.get(geometry);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    if (!bounds) {
      bounds = new Float32Array(Math.ceil(count / stride) * 6);
      for (let start = 0, cluster = 0; start < count; start += stride, cluster += 6) {
        this.box.makeEmpty();
        for (let i = start; i < Math.min(count, start + stride); i++)
          this.box.expandByPoint(a.fromBufferAttribute(positions, vertex(i)));
        this.box.min.toArray(bounds, cluster); this.box.max.toArray(bounds, cluster + 3);
      }
      this.pickClusters.set(geometry, bounds);
    }
    const matrix = object.matrixWorld.clone();
    if (instance !== undefined) { object.getMatrixAt(instance, this.matrix); matrix.multiply(this.matrix); }
    const local = this.raycaster.ray.clone().applyMatrix4(matrix.clone().invert());
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const result = { point: null, tests: 0 };
    let nearest = Infinity;
    const point = new THREE.Vector3();
    for (let cluster = 0; cluster < bounds.length; cluster += 6) {
      this.box.min.fromArray(bounds, cluster); this.box.max.fromArray(bounds, cluster + 3);
      if (!local.intersectsBox(this.box)) continue;
      const start = cluster / 6 * stride;
      for (let i = start; i < Math.min(count, start + stride); i += 3) {
        if (result.tests >= budget) return result;
        result.tests++;
        a.fromBufferAttribute(positions, vertex(i)); b.fromBufferAttribute(positions, vertex(i + 1)); c.fromBufferAttribute(positions, vertex(i + 2));
        const hit = material.side === THREE.BackSide ? local.intersectTriangle(c, b, a, true, point)
          : local.intersectTriangle(a, b, c, material.side !== THREE.DoubleSide, point);
        if (!hit) continue;
        const distance = local.origin.distanceToSquared(point);
        if (distance < nearest) { nearest = distance; result.point = point.clone().applyMatrix4(matrix); }
      }
    }
    return result;
  }
}
