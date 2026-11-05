import { VALIDATION } from './plan.js';

// Validation cameras only. Only the application entry point reads this list.
export const SHOTS = [
  { id: 1, ...VALIDATION.eye },
  { id: 2, pos: [128, 2.6, 860], target: [24, 1, 802], fov: 44, near: 0.1 },
  // inferred: W2B: low river view; near-normal carving view at 5 m from its backing.
  // Validation cameras only; architecture never reads this file.
  { id: 5, pos: [42, -1.35, 410.1], target: [0, 2.4, 390], fov: 54, near: 0.1 },
  { id: 6, pos: [26.25, -1.1, 392.86], target: [26.25, -0.85, 387.86], fov: 60, near: 0.1 },
];

import { XUANDE_VIEWS } from './plan.js';
// T4 replaces the T0 calibration framing, retaining the aerial inspection camera.
Object.assign(SHOTS.find(shot => shot.id === 1), XUANDE_VIEWS.front);
// inferred: W4F, below-eave framing retains the roof, both perches and flock headroom.
SHOTS.push({ id: 3, pos: [0, 21, 22], target: [0, 35, -12], fov: 68, near: 0.1 });

import { PALACE_VIEWS } from './plan.js';
SHOTS.push({ id: 8, ...PALACE_VIEWS.front });

import { YUJIE_VIEWS } from './plan.js';
SHOTS.push({ id: 7, pos: [-151, 3.0, 610], target: [-148, 4.6, 640], fov: 72, near: 0.05 });

import { CITY_VIEWS } from './plan.js';
SHOTS.push({ id: 4, pos: [175, 120, 190], target: [0, 12, -110], fov: 48, near: 0.1 }, { id: 9, ...CITY_VIEWS.gallery });

// inferred: W1 item 5, lower and closer five-door inspection; both forward towers may crop out.
Object.assign(SHOTS.find(shot => shot.id === 1), {pos:[-3,2.45,104],target:[0,13.6,-8],fov:23,near:0.1});
