import { VALIDATION } from './plan.js';

// Validation cameras only. Only the application entry point reads this list.
export const SHOTS = [
  { id: 1, ...VALIDATION.eye },
  { id: 2, ...VALIDATION.aerial },
];
