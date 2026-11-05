import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';
import { SKY } from './sky.js';

// inferred: performance policy for a 30 fps target, to be calibrated on a physical laptop.
// Geometry density stays fixed across live transitions: changing tiers never rebuilds the city.
export const TIERS = Object.freeze({
  low: Object.freeze({ resolutionScale: 0.6, shadowMapSize: 1024, shadowMaxFar: 280, cascades: 2,
    ao: false, cloudSteps: 8, lodScale: 0.35, minimumLod: 1, moduleDistance: 3200 }),
  medium: Object.freeze({ resolutionScale: 0.8, shadowMapSize: 1536, shadowMaxFar: 900, cascades: 3,
    ao: true, aoSamples: 8, aoSettleSamples: 16, cloudSteps: 12, lodScale: 0.65, minimumLod: 0, moduleDistance: 6000 }),
  high: Object.freeze({ resolutionScale: 1, shadowMapSize: 2048, shadowMaxFar: 1600, cascades: 4,
    ao: true, aoSamples: 12, aoSettleSamples: 24, cloudSteps: 24, lodScale: 1, minimumLod: 0, moduleDistance: 12000 }),
});
export const TIER_NAMES = Object.keys(TIERS);

/** Separate policy from rendering so measured windows and hysteresis can be verified without WebGL. */
export class TierPolicy {
  constructor(name = 'medium') { this.name = name; this.reset(); }
  reset() { this.samples = []; this.elapsed = 0; this.fastWindows = 0; this.cooldown = 0; }
  observe(frameMs) {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return null;
    // Do not use idle, converged frames, hidden tabs or the first shader-compilation frames.
    this.cooldown = Math.max(0, this.cooldown - frameMs);
    this.samples.push(frameMs); this.elapsed += frameMs;
    if (this.elapsed < 3000 || this.samples.length < 4) return null;
    const sorted = this.samples.slice().sort((a, b) => a - b);
    const p75 = sorted[Math.floor((sorted.length - 1) * 0.75)];
    this.samples = []; this.elapsed = 0;
    if (this.cooldown) return null;
    const index = TIER_NAMES.indexOf(this.name);
    if (p75 > 38 && index > 0) {
      this.fastWindows = 0; this.cooldown = 10000;
      return this.name = TIER_NAMES[index - 1];
    }
    this.fastWindows = p75 < 24 ? this.fastWindows + 1 : 0;
    if (this.fastWindows >= 3 && index < TIER_NAMES.length - 1) {
      this.fastWindows = 0; this.cooldown = 10000;
      return this.name = TIER_NAMES[index + 1];
    }
    return null;
  }
}

export class TierController {
  constructor(engine, { tier, width, height } = {}) {
    if (tier && tier !== 'auto' && !TIERS[tier]) throw new Error(`Unknown tier: ${tier}`);
    this.engine = engine; this.width = width || engine.width; this.height = height || engine.height;
    this.policy = new TierPolicy(TIERS[tier] ? tier : 'medium');
    this.automatic = !tier || tier === 'auto'; this.name = this.policy.name;
    this.baseDistances = new WeakMap(); this.originalUpdates = new WeakMap();
    this.warmup = 2;
    this.apply(this.name);
  }
  apply(name) {
    const config = TIERS[name];
    if (!config) throw new Error(`Unknown tier: ${name}`);
    const e = this.engine, old = e.lighting.csm;
    this.name = name; this.policy.name = name;
    Object.assign(e.quality, config, { tier: name });
    if (old.cascades !== config.cascades || old.shadowMapSize !== config.shadowMapSize) {
      const light = old.lights[0];
      const csm = new CSM({ camera: e.camera, parent: e.scene, maxFar: config.shadowMaxFar,
        cascades: config.cascades, shadowMapSize: config.shadowMapSize,
        mode: old.mode, lightDirection: old.lightDirection.clone(), lightIntensity: light.intensity,
        lightNear: old.lightNear, lightFar: old.lightFar, lightMargin: old.lightMargin, shadowBias: old.shadowBias });
      csm.fade = old.fade;
      csm.lights.forEach(l => { l.color.copy(light.color); l.shadow.normalBias = light.shadow.normalBias; });
      old.remove(); old.lights.forEach(l => l.shadow.dispose()); old.dispose();
      e.lighting.csm = csm;
      const materials = new Set();
      e.scene.traverse(o => {
        for (const mat of (Array.isArray(o.material) ? o.material : [o.material])) {
          if (mat?.defines?.USE_CSM !== undefined) materials.add(mat);
        }
      });
      for (const mat of materials) { mat.defines.CSM_CASCADES = config.cascades; mat.needsUpdate = true; }
    }
    e.lighting.csm.maxFar = config.shadowMaxFar;
    e.lighting.refreshCSM();
    SKY.uCloudSteps.value = config.cloudSteps;
    // applyShot restores defaults; retain the active tier when validation changes camera.
    if (e._defaults) e._defaults.SKY.uCloudSteps = config.cloudSteps;
    e.scene.traverse(o => {
      if (!o.isLOD) return;
      if (!this.baseDistances.has(o)) {
        this.baseDistances.set(o, o.levels.map(l => l.distance));
        this.originalUpdates.set(o, o.update);
        const controller = this;
        o.update = function(camera) {
          controller.originalUpdates.get(this).call(this, camera);
          const min = Math.min(TIERS[controller.name].minimumLod, this.levels.length - 1);
          if (this._currentLevel < min) {
            this.levels.forEach((level, i) => { level.object.visible = i === min; });
            this._currentLevel = min;
          }
        };
      }
      o.levels.forEach((l, i) => { l.distance = this.baseDistances.get(o)[i] * config.lodScale; });
    });
    this.resize(this.width, this.height);
    this.warmup = 2;
    e._accFrames = undefined;
    console.log(`[tier] ${name} (${this.automatic ? 'auto' : 'manual'})`);
  }
  resize(width, height) {
    this.width = width; this.height = height;
    const e = this.engine, scale = TIERS[this.name].resolutionScale;
    e.width = Math.max(1, Math.round(width * scale)); e.height = Math.max(1, Math.round(height * scale));
    e.renderer.setSize(e.width, e.height, false); e.pipeline.setSize(e.width, e.height);
    e.camera.aspect = width / height; e.camera.updateProjectionMatrix();
    e.lighting.refreshCSM(); e._accFrames = undefined;
  }
  set(tier) {
    if (tier !== 'auto' && !TIERS[tier]) throw new Error(`Unknown tier: ${tier}`);
    this.automatic = tier === 'auto'; this.policy.reset();
    this.apply(this.automatic ? this.name : tier);
    return this.status();
  }
  cycle() {
    const choices = ['auto', ...TIER_NAMES];
    return this.set(choices[(choices.indexOf(this.automatic ? 'auto' : this.name) + 1) % choices.length]);
  }
  observe(frameMs, rendered) {
    if (!this.automatic || !rendered || document.hidden) return;
    if (this.warmup > 0) { this.warmup--; return; }
    const next = this.policy.observe(frameMs);
    if (next) this.apply(next);
  }
  status() { return { name: this.name, automatic: this.automatic, ...TIERS[this.name] }; }
}
