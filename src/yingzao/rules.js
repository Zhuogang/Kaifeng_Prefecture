// 《营造法式》卷四、卷五. Module 分 and ordinary length 分 are distinct units.
export const CHI = 0.312;
export const CAI_GRADES = Object.freeze([[9, 6], [8.25, 5.5], [7.5, 5], [7.2, 4.8],
  [6.6, 4.4], [6, 4], [5.25, 3.5], [4.5, 3]].map(([guangCun, houCun]) => Object.freeze({ guangCun, houCun })));
export const QI_GUANG_FEN = 6, QI_HOU_FEN = 4, ZUCAI_FEN = 21;
export const TIAO_MAX_FEN = 30, TIAO_TOTAL_MAX_FEN = 150;
export const GONG_FEN = Object.freeze({ huagong: 72, nidao: 62, guazi: 62, ling: 72, man: 92 });
export const LUDOU_FEN = Object.freeze({ side: 32, cornerSide: 36, height: 20 });

export function fen(grade) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 8) throw new RangeError('caiGrade must be 1…8');
  return CAI_GRADES[grade - 1].guangCun * CHI / 150;
}
export function shengqi(bays) {
  // inferred: interpolate for even bay counts and continue the stated progression beyond thirteen.
  return Math.max(0, bays - 1) * 0.1 * CHI;
}
export function cejiao(lengthM, face) {
  if (!['front', 'side'].includes(face)) throw new RangeError('unknown column face');
  return lengthM * (face === 'front' ? 0.01 : 0.008);
}
export function columnDiameterFen(klass) {
  const range = { diange: [42, 45], tingtang: [36, 36], yuwu: [21, 30] }[klass];
  if (!range) throw new RangeError('unknown column class');
  return { min: range[0], max: range[1] };
}
export const laneFen = (hasBujian) => ({ guang: 30, hou: hasBujian ? 20 : 15 });
export function eaveOut(rafterDiameterM) {
  // inferred: choose the midpoint (4.25 尺) of the source's 4…4.5 尺 range at five 寸.
  const t = Math.max(0, Math.min(1, (rafterDiameterM / (CHI / 10) - 3) / 2));
  return (3.5 + 0.75 * t) * CHI;
}
export const feiziOut = (out) => 0.6 * out;
export function wingOut(bays) {
  if (bays <= 3) return (4 + (bays - 1) / 2) * CHI / 10;
  if (bays <= 5) return (5 + bays - 3) * CHI / 10;
  return (7 + (bays - 5) / 2) * CHI / 10;
}
export function juHeight(depthM, roofClass) {
  const ratio = { diange: 1 / 3, tongwa_tingtang: 1.08 / 4, tongwa_langwu: 1.05 / 4,
    banwa_tingtang: 1.05 / 4, banwa_langwu: 1.03 / 4 }[roofClass];
  if (ratio === undefined) throw new RangeError('unknown roof class');
  return depthM * ratio;
}
export const zheDrops = (H, n) => Array.from({ length: n }, (_, i) => H / 10 / 2 ** i);
export function zheProfile(halfDepth, H, n) {
  if (!(halfDepth > 0) || !Number.isInteger(n) || n < 1) throw new RangeError('invalid roof section');
  const p = [{ x: 0, y: H }];
  for (let i = 1; i < n; i++) {
    const prev = p.at(-1), x = halfDepth * i / n;
    p.push({ x, y: prev.y * (halfDepth - x) / (halfDepth - prev.x) - H / 10 / 2 ** (i - 1) });
  }
  p.push({ x: halfDepth, y: 0 });
  return p;
}
export function puzuoName(tiao) {
  const name = ['四铺作', '五铺作', '六铺作', '七铺作', '八铺作'][tiao - 1];
  if (!name) throw new RangeError('tiao must be 1…5');
  return name;
}
export function bujianCount(bay) {
  if (!['dangxin', 'ci', 'shao'].includes(bay)) throw new RangeError('unknown bay class');
  return bay === 'dangxin' ? 2 : 1;
}
