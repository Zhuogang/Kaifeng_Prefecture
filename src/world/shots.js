import { VALIDATION } from './plan.js';

// Validation cameras only. Only the application entry point reads this list.
export const SHOTS = [
  { id: 1, ...VALIDATION.eye },
  { id: 2, ...VALIDATION.aerial },
  // inferred: T6 validation framings; architecture never reads this file.
  { id: 5, pos: [42, -0.8, 410.5], target: [0, 2.6, 383.5], fov: 54, near: 0.1 },
  { id: 6, pos: [21.7, -0.95, 392.0], target: [26.2, -0.50, 387.4], fov: 53, near: 0.1 },
];

import { XUANDE_VIEWS } from './plan.js';
// T4 replaces the T0 calibration framing, retaining the aerial inspection camera.
Object.assign(SHOTS.find(shot => shot.id === 1), XUANDE_VIEWS.front);
SHOTS.push({ id: 3, ...XUANDE_VIEWS.roof });
