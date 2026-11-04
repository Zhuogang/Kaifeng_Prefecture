// Gate test for src/yingzao/rules.js. Lead-owned: do not edit.
// Values are hand-derived from 《营造法式》 卷四 and 卷五 (docs/sources/), not from the implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from '../src/yingzao/rules.js';

const near = (got, want, eps = 1e-6, msg = '') =>
  assert.ok(Math.abs(got - want) <= eps, `${msg} expected ${want}, got ${got}`);

const CHI = Y.CHI;
const CUN = CHI / 10;

test('宋尺 is the agreed constant', () => {
  near(CHI, 0.312, 1e-9);
});

test('八等材: 广 and 厚 in 寸', () => {
  const want = [[9, 6], [8.25, 5.5], [7.5, 5], [7.2, 4.8], [6.6, 4.4], [6, 4], [5.25, 3.5], [4.5, 3]];
  assert.equal(Y.CAI_GRADES.length, 8);
  want.forEach(([g, h], i) => {
    near(Y.CAI_GRADES[i].guangCun, g, 1e-9, `grade ${i + 1} 广`);
    near(Y.CAI_GRADES[i].houCun, h, 1e-9, `grade ${i + 1} 厚`);
  });
});

test('分: one 材 is 15 分 high and 10 分 thick at every grade', () => {
  for (let g = 1; g <= 8; g++) {
    const c = Y.CAI_GRADES[g - 1];
    near(Y.fen(g), (c.guangCun * CUN) / 15, 1e-9, `grade ${g} from 广`);
    near(Y.fen(g), (c.houCun * CUN) / 10, 1e-9, `grade ${g} from 厚`);
  }
  near(Y.fen(1), 0.6 * CUN, 1e-9, 'grade 1');
});

test('栔 and 足材 in 分', () => {
  assert.equal(Y.QI_GUANG_FEN, 6);
  assert.equal(Y.QI_HOU_FEN, 4);
  assert.equal(Y.ZUCAI_FEN, 21);
});

test('生起 by bay count, in metres', () => {
  const want = { 13: 1.2, 11: 1.0, 9: 0.8, 7: 0.6, 5: 0.4, 3: 0.2 };
  for (const [bays, chi] of Object.entries(want)) near(Y.shengqi(Number(bays)), chi * CHI, 1e-9, `${bays} 间`);
});

test('侧脚: 1% on front faces, 0.8% on side faces', () => {
  near(Y.cejiao(10 * CHI, 'front'), 0.1 * CHI, 1e-9, 'front');
  near(Y.cejiao(10 * CHI, 'side'), 0.08 * CHI, 1e-9, 'side');
});

test('柱径 ranges in 分', () => {
  assert.deepEqual(Y.columnDiameterFen('diange'), { min: 42, max: 45 });
  assert.deepEqual(Y.columnDiameterFen('tingtang'), { min: 36, max: 36 });
  assert.deepEqual(Y.columnDiameterFen('yuwu'), { min: 21, max: 30 });
});

test('阑额 in 分, with and without 补间', () => {
  assert.deepEqual(Y.laneFen(true), { guang: 30, hou: 20 });
  assert.deepEqual(Y.laneFen(false), { guang: 30, hou: 15 });
});

test('檐出 from 椽径, 飞子, and 翼角生出', () => {
  near(Y.eaveOut(3 * CUN), 3.5 * CHI, 1e-9, '椽径三寸');
  const e5 = Y.eaveOut(5 * CUN);
  assert.ok(e5 >= 4 * CHI - 1e-9 && e5 <= 4.5 * CHI + 1e-9, `椽径五寸 gave ${e5}`);
  near(Y.feiziOut(1 * CHI), 0.6 * CHI, 1e-9, '飞子');
  near(Y.wingOut(1), 4 * CUN, 1e-9, '一间');
  near(Y.wingOut(3), 5 * CUN, 1e-9, '三间');
  near(Y.wingOut(5), 7 * CUN, 1e-9, '五间');
});

test('举: ridge height by roof class', () => {
  near(Y.juHeight(30, 'diange'), 10, 1e-9, '殿阁');
  near(Y.juHeight(40, 'tongwa_tingtang'), 10.8, 1e-9, '筒瓦厅堂');
  near(Y.juHeight(40, 'tongwa_langwu'), 10.5, 1e-9, '筒瓦廊屋');
  near(Y.juHeight(40, 'banwa_tingtang'), 10.5, 1e-9, '瓪瓦厅堂');
  near(Y.juHeight(40, 'banwa_langwu'), 10.3, 1e-9, '瓪瓦廊屋');
});

test('折: the text\'s own example, H = 2 丈', () => {
  const d = Y.zheDrops(20, 4);
  assert.equal(d.length, 4);
  [2, 1, 0.5, 0.25].forEach((w, i) => near(d[i], w, 1e-9, `drop ${i + 1}`));
});

test('折: hand-computed profile, half depth 16, H 8, four 架', () => {
  // P0 = (0, 8). Line to (16, 0) at x = 4 gives 6.0, minus 0.8 = 5.2.
  // Line from (4, 5.2) to (16, 0) at x = 8 gives 3.466667, minus 0.4 = 3.066667.
  // Line from (8, 3.066667) to (16, 0) at x = 12 gives 1.533333, minus 0.2 = 1.333333.
  const p = Y.zheProfile(16, 8, 4);
  const want = [[0, 8], [4, 5.2], [8, 3.0666667], [12, 1.3333333], [16, 0]];
  assert.equal(p.length, 5);
  want.forEach(([x, y], i) => {
    near(p[i].x, x, 1e-6, `x${i}`);
    near(p[i].y, y, 1e-6, `y${i}`);
  });
});

test('折: the roof is concave, steepest at the ridge', () => {
  const p = Y.zheProfile(12, 4, 6);
  let last = Infinity;
  for (let i = 1; i < p.length; i++) {
    const slope = (p[i - 1].y - p[i].y) / (p[i].x - p[i - 1].x);
    assert.ok(slope < last, `slope must fall toward the eave, segment ${i}: ${slope} after ${last}`);
    last = slope;
  }
  near(p[0].y, 4, 1e-9);
  near(p.at(-1).y, 0, 1e-9);
});

test('铺作 names, limits and 补间 counts', () => {
  assert.equal(Y.puzuoName(1), '四铺作');
  assert.equal(Y.puzuoName(2), '五铺作');
  assert.equal(Y.puzuoName(3), '六铺作');
  assert.equal(Y.puzuoName(4), '七铺作');
  assert.equal(Y.puzuoName(5), '八铺作');
  assert.equal(Y.TIAO_MAX_FEN, 30);
  assert.equal(Y.TIAO_TOTAL_MAX_FEN, 150);
  assert.equal(Y.bujianCount('dangxin'), 2);
  assert.equal(Y.bujianCount('ci'), 1);
  assert.equal(Y.bujianCount('shao'), 1);
});

test('栱 and 栌枓 sizes in 分', () => {
  assert.deepEqual(Y.GONG_FEN, { huagong: 72, nidao: 62, guazi: 62, ling: 72, man: 92 });
  assert.deepEqual(Y.LUDOU_FEN, { side: 32, cornerSide: 36, height: 20 });
});

test('rules.js is pure: no three.js and no DOM', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../src/yingzao/rules.js', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"]three/.test(src), 'must not import three');
  assert.ok(!/\b(window|document|Math\.random|Date)\b/.test(src), 'must not touch window, document, Math.random or Date');
});
