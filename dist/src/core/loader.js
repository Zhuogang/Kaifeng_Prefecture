import * as THREE from 'three';

// A frame followed by a task lets the browser paint before a synchronous generator starts.
export const yieldToBrowser = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

export class LoadingScreen {
  constructor() {
    this.element = document.getElementById('loading');
    this.progress = document.getElementById('load-progress');
    this.label = document.getElementById('load-label');
    this.detail = document.getElementById('load-detail');
    this.started = performance.now();
  }
  async show(label, completed, total, detail = '') {
    if (this.label) this.label.textContent = label;
    if (this.progress) { this.progress.max = total; this.progress.value = completed; }
    if (this.detail) this.detail.textContent = detail || `${completed} / ${total} · preparing the city`;
    await yieldToBrowser();
  }
  finish() { if (this.element) this.element.hidden = true; }
  fail(error) {
    if (this.element) this.element.hidden = false;
    if (this.label) this.label.textContent = 'The city could not open';
    if (this.detail) this.detail.textContent = error.message || String(error);
    if (this.progress) this.progress.hidden = true;
  }
}

const LABELS = {
  ground: '黄河平原 · The plain', bianhe: '汴河 · River and stone banks',
  zhouqiao: '州桥 · The stone bridge', xuande: '宣德楼 · Palace gate',
  palace: '大庆殿 · Palace courts', yujie: '御街 · Imperial avenue',
  city: '坊巷 · City districts', walls: '城垣 · City walls', tieta: '铁塔 · Iron Pagoda',
};

/** Shares the world's authoritative module order; module failures remain visible to the harness. */
export async function loadWorld(engine, screen) {
  const { MODULE_ORDER } = await import('../world/index.js');
  // Long generators can opt into finer slices without depending on this UI module.
  engine.yieldToBrowser = yieldToBrowser;
  const timings = [], roots = [];
  const total = MODULE_ORDER.length + 3;
  for (const name of MODULE_ORDER) {
    await screen.show(LABELS[name] || name, timings.length + 1, total,
      `${name} · ${timings.length} / ${MODULE_ORDER.length} districts complete`);
    const before = new Set(engine.scene.children), start = performance.now();
    const mod = await import(`../modules/${name}.js`);
    await mod.build(engine);
    const buildMs = Math.round(performance.now() - start);
    const root = new THREE.Group(); root.name = `module:${name}`;
    root.userData.module = name;
    for (const child of [...engine.scene.children]) if (!before.has(child)) root.add(child);
    engine.scene.add(root); roots.push(root);
    timings.push({ name, buildMs });
    console.log(`[world] ${name} built in ${buildMs} ms`);
  }
  engine.registry.delivery = { roots, timings };
  return { roots, timings, total };
}

/** Cull whole module roots conservatively, keeping anything that can cast into a shadow cascade.
 * Bounds are rebuilt from current instance spheres after module update hooks, including hidden LODs.
 * This deliberately keeps large district batches; their owners must split them for finer culling.
 */
export function installModuleCulling(engine, roots) {
  const sceneUpdate = engine.scene.updateMatrixWorld;
  const view = new THREE.Frustum(), projection = new THREE.Matrix4();
  const box = new THREE.Box3(), part = new THREE.Box3(), sphere = new THREE.Sphere();
  const shadows = [];
  engine.scene.updateMatrixWorld = function(force) {
    sceneUpdate.call(this, force);
    engine.camera.updateMatrixWorld(true);
    view.setFromProjectionMatrix(projection.multiplyMatrices(engine.camera.projectionMatrix, engine.camera.matrixWorldInverse));
    const lights = engine.lighting.csm.lights;
    lights.forEach((light, i) => {
      light.shadow.updateMatrices(light);
      shadows[i] = light.shadow.getFrustum();
    });
    const shadowViews = shadows.slice(0, lights.length), stats = [];
    for (const root of roots) {
      box.makeEmpty(); let unbounded = false;
      root.traverse(o => {
        if (!o.geometry) return;
        if (!o.frustumCulled) { unbounded = true; return; }
        if (o.isInstancedMesh) {
          if (!o.count) return;
          if (!o.boundingSphere) o.computeBoundingSphere();
          sphere.copy(o.boundingSphere).applyMatrix4(o.matrixWorld);
          sphere.getBoundingBox(part);
        } else {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        }
        box.union(part);
      });
      // inferred: tier distances limit small outlying modules; kilometre-scale districts keep their horizon.
      const range = engine.quality.moduleDistance ?? Infinity;
      const inRange = box.distanceToPoint(engine.camera.position) <= range;
      root.visible = unbounded || box.isEmpty() || (inRange &&
        (view.intersectsBox(box) || shadowViews.some(f => f.intersectsBox(box))));
      stats.push({ name: root.userData.module, visible: root.visible });
    }
    engine.registry.delivery.culling = stats;
  };
}
