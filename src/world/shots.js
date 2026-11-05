import { VALIDATION } from './plan.js';

// Validation cameras only. Only the application entry point reads this list.
export const SHOTS = [
  { id: 1, ...VALIDATION.eye },
  { id: 2, pos: [151, 2.6, 830], target: [40, 1, 790], fov: 42, near: 0.1 },
  // inferred: W2B: low river view; near-normal carving view at 5 m from its backing.
  // Validation cameras only; architecture never reads this file.
  { id: 5, pos: [42, -1.35, 410.1], target: [0, 2.4, 390], fov: 54, near: 0.1 },
  { id: 6, pos: [26.25, -1.1, 392.86], target: [26.25, -0.85, 387.86], fov: 60, near: 0.1 },
];

import { XUANDE_VIEWS } from './plan.js';
// T4 replaces the T0 calibration framing, retaining the aerial inspection camera.
Object.assign(SHOTS.find(shot => shot.id === 1), XUANDE_VIEWS.front);
// inferred: W2F, closer below-ridge inspection keeps both perched cranes in frame.
SHOTS.push({ id: 3, pos: [0, 26, 16], target: [0, 39, -12], fov: 54, near: 0.1 });

import { PALACE_VIEWS } from './plan.js';
SHOTS.push({ id: 8, ...PALACE_VIEWS.front });

import { YUJIE_VIEWS } from './plan.js';
Object.assign(SHOTS.find(shot => shot.id === 2), YUJIE_VIEWS.avenue);
SHOTS.push({ id: 7, ...YUJIE_VIEWS.corridor });

import { CITY_VIEWS } from './plan.js';
SHOTS.push({ id: 4, pos: [175, 120, 190], target: [0, 12, -110], fov: 48, near: 0.1 }, { id: 9, ...CITY_VIEWS.gallery });

// inferred: W1 item 5, lower and closer five-door inspection; both forward towers may crop out.
Object.assign(SHOTS.find(shot => shot.id === 1), {pos:[-3,2.45,104],target:[0,13.6,-8],fov:23,near:0.1});

// inferred: W2A/ref7, eye-height inside the gallery, with the nearest column
// cropped at the left and less wide-angle stretching of the panelled back wall.
Object.assign(SHOTS.find(shot => shot.id === 7), {
  pos:[-152,2.75,218],target:[-152,3,340],fov:60,near:.05,
});
