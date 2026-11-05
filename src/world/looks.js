import { SUN } from './plan.js';

// World clock states. These values never depend on a validation camera or its heading.
// inferred: radiance, weather and grading are fitted to the generated references, rather
// than historical measurements. Morning direction is prescribed by the art bible.
const MORNING_SKY = {
  uZenith: [0.02, 0.11, 0.24], uSkyFalloff: 5.0, uSkyAureole: [0.18, 0.45, 3.0],
  uGround: [0.065, 0.075, 0.09], uEnvScale: 0.9, uEnvBlue: 0.4, uEnvSat: 0.65,
  uCloudCover: 0.25, uCloudScale: 1.3, uCloudBase: 2300, uCloudThick: 1000,
  uCloudSigma: 0.012, uCloudBright: 3.0, uCloudAmbient: 0.55, uCloudErode: 0.0,
  uCirrus: [0, 7500, 0.6], uSunDiskMode: 0,
};
const MORNING_ATMO = {
  uHaze: [0.000035, 1600, 0], uHazeLow: [0.000045, 160], uHazeFar: [0.7, 2500],
  uMist: [0.000035, 18, 0], uHazeColor: [0.9, 0.85, 0.82],
  uMistColor: [0.95, 1.02, 1.1], uExtinction: [0.85, 1.0, 1.2], uMie: [0.7, 0.65, 0.45],
};
const MORNING_GRADE = {
  uExposure: 0.6, uAutoExpo: 0.0, uContrast: 1.72, uToe: 0.9,
  uWhiteBalance: [1.0, 1.0, 1.0], uLift: [0.03, 0.036, 0.05],
  uShadowTint: [-0.005, 0.0, 0.012], uHighTint: [0.012, 0.004, -0.008],
  uSaturation: 0.94, uShadowSat: 0.05, uVibrance: 0.05, uHighSat: 0.1,
  // inferred: keep moving and accumulated frames on the same tone curve; local
  // contrast previously switched on only after movement stopped.
  uLtmFine: 0, uLtmMid: 0, uLtmLarge: 0, uLtmBase: 0, uLtmSky: 0,
  uVignette: [0.12, 0.85], uBloom: 0.025, uGrain: 0.008, uSharpen: 0.16,
  uLensGlare: 0.18, uLensRays: 0.06, uLensGhost: 0, uAutoLevels: 0,
  uHueShift: [0, 0, 0, 0, 0, 0, 0, 0], uHueSat: [1, 1, 1, 1, 1, 1, 1, 0.85],
  uHueLum: [0, 0, 0, 0, 0, 0, 0, 0], uShoulder: [0.8, 0.96],
};

// inferred: W7 daylight calibration. A shared, image-metered luminance curve
// opens deep shadows without the old raised black floor. Its targets apply to
// the entire world, independently of camera identity and render quality.
const DAY_CONTRAST = {
  uExposure: 0.65, uAutoExpo: 0.9, uAutoKey: 0.2,
  uContrast: 1.9, uPivot: 0.5, uToe: 1.1,
  uLift: [0.008, 0.008, 0.009], uShadowTint: [0, 0, 0],
  uHighlights: 0, uShoulder: [0.9, 1.0],
  uBloom: 0.015, uLensGlare: 0.1, uLensRays: 0.03,
  uAutoLevels: 1, uLevelTarget: [10, 33, 108, 201.2, 238],
};

export const TIME_PRESETS = {
  morning: {
    // inferred: stronger golden direct light against reduced, neutral-cool fill.
    // Sun position remains the art bible's south-east morning direction.
    sun: { azimuth: SUN.azimuth, elevation: SUN.elevation, color: [1.0, 0.68, 0.4], intensity: 20 },
    sky: { ...MORNING_SKY,
      // inferred: preserve the visible blue zenith while reducing and
      // desaturating IBL; shaded stone should not inherit the sky's blue cast.
      uZenith: [0.27, 0.39, 0.63], uSkyFalloff: 4.0,
      uSkyLower: [1.4, 1.65, 2.1], uSkyHorizonWidth: 0.06,
      uGround: [0.18, 0.17, 0.16], uEnvScale: 0.6, uEnvBlue: 0.05, uEnvSat: 0.15,
      // inferred: optically thinner, softly sunlit low cumulus; the high veil
      // darkened the bright lower sky into broad grey smudges.
      uCloudCover: 0.26, uCloudScale: 4.0, uCloudBase: 2300, uCloudThick: 800,
      uCloudSigma: 0.004, uCloudBright: 4.0, uCloudAmbient: 1.2, uCloudErode: 0.6,
      uCloudClearRadius: 12500,
      uCirrus: [0, 7500, 0.6],
    },
    atmo: { ...MORNING_ATMO, uHazeColor: [1.2, 1.05, 0.94] },
    grade: { ...MORNING_GRADE, ...DAY_CONTRAST,
      uHighTint: [0.008, 0.003, -0.004], uShadowSat: 0,
      uAgxPunch: 1.0, uSaturation: 0.96, uSharpen: 0.2 },
  },
  sunset: {
    sun: { azimuth: 255, elevation: 8, color: [1.0, 0.67, 0.4], intensity: 10 },
    // inferred: a pale blue-to-peach evening sky, with the same city-wide
    // clearing and reduced, nearly neutral ground bounce as morning.
    sky: { ...MORNING_SKY, uZenith: [0.15, 0.23, 0.34], uSkyFalloff: 3.5,
      uSkyLower: [0.8, 0.85, 1.0], uSkyHorizonWidth: 0.09,
      uSkyAureole: [0.35, 0.7, 4], uGround: [0.18, 0.17, 0.16],
      uEnvScale: 0.6, uEnvBlue: 0.05, uEnvSat: 0.15,
      uCloudCover: 0.26, uCloudScale: 4.0, uCloudBase: 2300, uCloudThick: 800,
      uCloudSigma: 0.004, uCloudBright: 4.0, uCloudAmbient: 0.6, uCloudErode: 0.6,
      uCloudClearRadius: 12500 },
    atmo: { ...MORNING_ATMO, uHazeColor: [0.85, 0.72, 0.62], uMistColor: [0.66, 0.59, 0.6],
      uMie: [0.72, 1.1, 0.5] },
    grade: { ...MORNING_GRADE, ...DAY_CONTRAST, uSaturation: 0.96 },
  },
  bluehour: {
    sun: { azimuth: 275, elevation: -4, color: [1, 0.35, 0.16], intensity: 0 },
    // inferred: clear blue-hour air with thin high ice clouds, rather than an
    // unlit, opaque cumulus layer. The warm horizon is world-wide afterglow.
    sky: { ...MORNING_SKY, uZenith: [0.012, 0.03, 0.12], uSkyFalloff: 3.5,
      uSkyLower: [0.12, 0.18, 0.36], uSkyHorizonWidth: 0.08,
      uSkyAureole: [0.06, 0.0, 0.0], uTwilight: [1.4, 0.38, 0.07], uTwilightSpread: 1,
      uSunDisk: 0, uGround: [0.018, 0.024, 0.045], uCirrus: [0.06, 8000, 0.6],
      uEnvScale: 2.0, uEnvBlue: 0.1, uCloudCover: 0 },
    atmo: { ...MORNING_ATMO, uHazeColor: [0.12, 0.09, 0.12], uMistColor: [0.06, 0.08, 0.14],
      uMie: [0.68, 0.1, 0] },
    grade: { ...MORNING_GRADE, uExposure: 1.35, uContrast: 1.3,
      uLift: [0.012, 0.014, 0.022], uSaturation: 1.0 },
  },
};
export const TIME_NAMES = Object.freeze(Object.keys(TIME_PRESETS));

// Retained for the engine's existing override interface; no camera-dependent looks.
export const LOOKS = {};

/** Install the world-clock part of applyShot at the application boundary. */
export function installTimePresets(engine, initial = 'morning') {
  if (!TIME_PRESETS[initial]) throw new Error('unknown time preset ' + initial);
  engine.timePreset = initial;
  const applyShot = engine.applyShot.bind(engine);
  let source;
  engine.applyShot = (input) => {
    const name = typeof input.time === 'string' ? input.time : engine.timePreset;
    const preset = TIME_PRESETS[name];
    if (!preset) throw new Error('unknown time preset ' + name);
    source = { ...input };
    const shot = { ...input };
    for (const key of ['sun', 'sky', 'atmo', 'grade']) shot[key] = { ...preset[key], ...input[key] };
    // Numeric time remains the deterministic animation clock; strings select world lighting.
    if (typeof shot.time === 'string') shot.time = engine.time;
    engine.timePreset = name;
    applyShot(shot);
  };
  engine.setTimePreset = (name) => {
    const cam = engine.camera, target = cam.position.clone().add(cam.getWorldDirection(cam.position.clone()));
    engine.applyShot({ ...source, time: name, pos: cam.position.toArray(), target: target.toArray(),
      fov: cam.fov, near: cam.near, far: cam.far });
    return engine.timePreset;
  };
}
