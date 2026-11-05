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

import { PALACE_VIEWS } from './plan.js';
SHOTS.push({ id: 8, ...PALACE_VIEWS.front });

import { YUJIE_VIEWS } from './plan.js';
Object.assign(SHOTS.find(shot => shot.id === 2), YUJIE_VIEWS.avenue);
SHOTS.push({ id: 7, ...YUJIE_VIEWS.corridor });

import { CITY_VIEWS } from './plan.js';
SHOTS.push({ id: 4, ...CITY_VIEWS.aerial }, { id: 9, ...CITY_VIEWS.gallery });

// inferred: W1 item 5, lower and closer five-door inspection; both forward towers may crop out.
Object.assign(SHOTS.find(shot => shot.id === 1), {pos:[-3,2.45,104],target:[0,13.6,-8],fov:23,near:0.1});
