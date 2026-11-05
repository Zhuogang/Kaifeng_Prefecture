import { YUJIE as P, XUANDE } from '../world/plan.js';

export const northEnd = P.bridge.north[2], southEnd = P.bridge.south[2];
export const northShoulder = northEnd - P.approachLength, southShoulder = southEnd + P.approachLength;
export const reaches = [[P.start, northShoulder], [southShoulder, P.end]];
// inferred: end the planted/fenced cross-section half a gate gap clear of the
// outermost existing 宣德楼 forecourt fence, rather than burying it in the wings.
export const plazaEnd = Math.max(...XUANDE.wingPlatforms.map(p => p.center[2] + p.depth / 2),
  ...XUANDE.fences.flatMap(path => path.map(p => p[2]))) + P.fenceGap / 2;
export const rowReaches = [[plazaEnd, northShoulder], [southShoulder, P.end]];

export function onXuandeStructure(x, z) {
  return [XUANDE.platform, ...XUANDE.wingPlatforms].some(p =>
    Math.abs(x - p.center[0]) <= p.width / 2 && Math.abs(z - p.center[2]) <= p.depth / 2) ||
    XUANDE.stairs.some(s => Math.abs(x - s.x) <= s.width / 2 && z >= s.z - 18 && z <= s.z + s.run);
}

export function pavingLayoutGLSL(brick = false) {
  const f = value => value.toFixed(4);
  const [a, b] = P.paving.roadTracks;
  return `vec4 pavingLayout(vec3 p) {
    float across=abs(p.x);
    float wheel=${brick ? `abs(across-${f(P.paving.laneTrack)})` : `min(abs(across-${f(a)}),abs(across-${f(b)}))`}-${f(P.paving.axleHalf)};
    float drain=across-${f(brick ? P.section.bank + P.paving.laneDrainOffset : P.section.road - P.paving.roadDrainInset)};
    if(across>${f(P.section.blackFence)}) { wheel=100000.0; drain=100000.0; }
    return vec4(p.x,p.z,wheel,drain);
  }`;
}

export function subtractGaps(start, end, centers, width) {
  const result = []; let cursor = start;
  for (const z of centers) {
    if (z + width / 2 <= start || z - width / 2 >= end) continue;
    const a = Math.max(start, z - width / 2), b = Math.min(end, z + width / 2);
    if (a > cursor) result.push([cursor, a]); cursor = Math.max(cursor, b);
  }
  if (cursor < end) result.push([cursor, end]); return result;
}

export function surfaceY(z) {
  if (z >= northShoulder && z <= northEnd)
    return P.surfaceY + (P.bridge.north[1] - P.surfaceY) * (z - northShoulder) / P.approachLength;
  if (z >= southEnd && z <= southShoulder)
    return P.bridge.south[1] + (P.surfaceY - P.bridge.south[1]) * (z - southEnd) / P.approachLength;
  return P.surfaceY;
}

export function halfWidth(z) {
  if (z >= northShoulder && z <= northEnd)
    return P.width / 2 + (P.bridgeHalfWidth - P.width / 2) * (z - northShoulder) / P.approachLength;
  if (z >= southEnd && z <= southShoulder)
    return P.bridgeHalfWidth + (P.width / 2 - P.bridgeHalfWidth) * (z - southEnd) / P.approachLength;
  return P.width / 2;
}
