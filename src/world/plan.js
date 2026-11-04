// Metres; +X east, -Z north. All world placement is defined here.
export const SUN = {
  azimuth: 120, elevation: 25, evidence: 'inferred',
  source: 'ART_BIBLE.md: low morning sun from the south-east',
};

export function dirFromAzEl(azimuth, elevation) {
  const az = azimuth * Math.PI / 180, el = elevation * Math.PI / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
}

export const GROUND = {
  // inferred: 60 km square, exponentially spaced grid, and broad sub-metre silt relief.
  center: [0, 0, 0], halfExtent: 30000, segments: 256, gridScale: 40,
  relief: 0.5, wavelength: 700,
  evidence: 'inferred', source: 'T0: plain extending at least 20 km with relief within ±0.5 m',
};

export const BOX = {
  // inferred: the brief gives the base position and width × depth × height.
  base: [0, 0, -40], size: [20, 10, 20],
  evidence: 'inferred', source: 'T0 lighting and walk-collision calibration box',
};

export const VALIDATION = {
  // inferred: validation viewpoints only; no scene content depends on these positions.
  eye: { pos: [0, 1.6, 15], target: [0, 1.6, -40], fov: 60, near: 0.1 },
  aerial: { pos: [100, 150, 220], target: [0, 0, -40], fov: 60, near: 0.1 },
  evidence: 'inferred', source: 'T0: south eye-level and 150 m aerial views',
};
