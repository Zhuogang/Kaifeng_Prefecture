// Quality presets. Modules must scale their density/resolution with these numbers so the
// interactive preview stays usable on an integrated GPU while offline renders go all out.
export const QUALITY = {
  preview: {
    name: 'preview', spp: 1, msaa: 4,
    shadowMapSize: 2048, cascades: 3, shadowMaxFar: 1400, softShadows: true,
    terrainRes: 0.5,      // multiplier on terrain mesh resolution
    density: 0.45,        // vegetation / city / props instance density multiplier
    detail: 0.5,          // geometric detail multiplier (segments, sculpt resolution)
    // AO costs one half-resolution pass; its bilateral compose shares accumulation.
    // inferred: extra samples and soft sun shadows are accumulated only after stopping.
    // inferred: stronger contact darkening at both moving and settled sample counts.
    cloudSteps: 16, bloom: true, settleLtm: true, ao: true, aoSamples: 12, aoSettleSamples: 24, aoStrength: 0.9,
  },
  high: {
    name: 'high', spp: 12, msaa: 4,
    shadowMapSize: 4096, cascades: 4, shadowMaxFar: 2400, softShadows: true,
    terrainRes: 1.0, density: 1.0, detail: 1.0,
    cloudSteps: 32, bloom: true, ao: true, aoSamples: 24, aoSettleSamples: 32, aoStrength: 0.9,
  },
  ultra: {
    name: 'ultra', spp: 48, msaa: 4,
    shadowMapSize: 4096, cascades: 4, shadowMaxFar: 3200, softShadows: true,
    terrainRes: 1.0, density: 1.0, detail: 1.0,
    cloudSteps: 64, bloom: true, ao: true, aoSamples: 32, aoSettleSamples: 32, aoStrength: 0.9,
  },
};

export function getQuality(name) { return { ...(QUALITY[name] || QUALITY.preview) }; }
