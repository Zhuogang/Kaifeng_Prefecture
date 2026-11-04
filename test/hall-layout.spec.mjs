// Gate test for src/yingzao/layout.js. Lead-owned: do not edit.
// Hand-derived from 《营造法式》 for a 7 × 4 bay 殿 with 五铺作 (two 跳), grade 2 材.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hallLayout } from '../src/yingzao/layout.js';
import * as Y from '../src/yingzao/rules.js';

const near = (got, want, eps = 1e-6, msg = '') =>
  assert.ok(Math.abs(got - want) <= eps, `${msg} expected ${want}, got ${got}`);

const CHI = Y.CHI;
const spec = {
  frontBays: [4, 4, 4.5, 5, 4.5, 4, 4],
  sideBays: [3.5, 4, 4, 3.5],
  caiGrade: 2, klass: 'diange', tiao: 2, rafterDiameter: 0.156, jiaPerSlope: 4, columnHeight: 6,
};
const L = hallLayout(spec);
const per = L.columns.filter((c) => c.perimeter);
const corners = per.filter((c) => c.corner);

test('footprint is centred on the origin', () => {
  near(Math.min(...per.map((c) => c.x)), -15, 1e-9, 'west');
  near(Math.max(...per.map((c) => c.x)), 15, 1e-9, 'east');
  near(Math.min(...per.map((c) => c.z)), -7.5, 1e-9, 'north');
  near(Math.max(...per.map((c) => c.z)), 7.5, 1e-9, 'south');
});

test('perimeter columns: one at every grid point on the edge', () => {
  assert.equal(per.length, 2 * (7 + 4));
  assert.equal(corners.length, 4);
});

test('生起: corners stand 0.6 尺 above the central 平柱 on a 7-bay hall', () => {
  const south = per.filter((c) => Math.abs(c.z - 7.5) < 1e-9).sort((a, b) => a.x - b.x);
  assert.equal(south.length, 8);
  const pingzhu = south[3].topY;
  near(south[4].topY, pingzhu, 1e-9, 'the two 平柱 are level');
  near(pingzhu, spec.columnHeight, 1e-9, '平柱 keeps the specified height');
  near(south[0].topY - pingzhu, 0.6 * CHI, 1e-9, 'corner');
  near(south[7].topY - pingzhu, 0.6 * CHI, 1e-9, 'corner');
  for (let i = 4; i < 7; i++) assert.ok(south[i + 1].topY > south[i].topY, 'rises outward');
});

test('生起 applies to the side elevations too, with their corners shared', () => {
  const east = per.filter((c) => Math.abs(c.x - 15) < 1e-9).sort((a, b) => a.z - b.z);
  assert.equal(east.length, 5);
  near(east[0].topY - spec.columnHeight, 0.6 * CHI, 1e-9, 'shared corner');
  assert.ok(east[2].topY < east[0].topY, 'the middle of the side stands lower than the corners');
});

test('侧脚: heads lean inward, 1% across the front, 0.8% across the side', () => {
  const c = corners.find((k) => k.x > 0 && k.z > 0);
  const len = c.topY - c.baseY;
  near(c.x - c.headX, 0.01 * len, 1e-9, 'corner lean along x');
  near(c.z - c.headZ, 0.008 * len, 1e-9, 'corner lean along z');
  const front = per.find((k) => !k.corner && Math.abs(k.z - 7.5) < 1e-9 && k.x > 0);
  const flen = front.topY - front.baseY;
  near(front.x - front.headX, 0.01 * flen, 1e-9, 'front column leans toward the centre along x');
  near(front.headZ, front.z, 1e-9, 'front column does not lean along z');
  const side = per.find((k) => !k.corner && Math.abs(k.x - 15) < 1e-9 && k.z > 0);
  const slen = side.topY - side.baseY;
  near(side.z - side.headZ, 0.008 * slen, 1e-9, 'side column leans toward the centre along z');
  near(side.headX, side.x, 1e-9, 'side column does not lean along x');
});

test('铺作 counts: 4 转角, 18 柱头, and 补间 by bay', () => {
  const kinds = (k) => L.sets.filter((s) => s.kind === k);
  assert.equal(kinds('zhuanjiao').length, 4);
  assert.equal(kinds('zhutou').length, 18);
  // Front and back: 2 in the 当心间, 1 in each of 6 other bays. Sides: 1 in each of 4 bays.
  assert.equal(kinds('bujian').length, 2 * (2 + 6) + 2 * 4);
  const midBay = kinds('bujian').filter((s) => s.side === 'south' && Math.abs(s.x) < 2.5);
  assert.equal(midBay.length, 2, 'two sets in the 当心间');
});

test('铺作 sits at the head of each column, on the leaned position', () => {
  const south = L.sets.filter((s) => s.kind === 'zhutou' && s.side === 'south');
  for (const s of south) {
    const col = per.find((c) => Math.abs(c.headX - s.x) < 1e-6 && Math.abs(c.headZ - s.z) < 1e-6);
    assert.ok(col, `no column head under set at ${s.x}, ${s.z}`);
    near(s.y, col.topY, 1e-6, 'set rests on the column head');
  }
});

test('举: ridge height from the 橑檐方 span, two 跳 of 30 分 each side', () => {
  const fen = Y.fen(2);
  near(L.liaoyanSpan, 15 + 2 * 2 * 30 * fen, 1e-9, 'D');
  near(L.ridgeRise, (15 + 2 * 2 * 30 * fen) / 3, 1e-9, 'H = D / 3 for 殿阁');
});

test('折: the roof section is the rules.js profile', () => {
  const p = Y.zheProfile(L.liaoyanSpan / 2, L.ridgeRise, 4);
  assert.equal(L.section.length, p.length);
  p.forEach((q, i) => { near(L.section[i].x, q.x, 1e-9, `x${i}`); near(L.section[i].y, q.y, 1e-9, `y${i}`); });
});

test('檐: rafter 0.156 m is 5 寸, so 檐出 is 4 to 4.5 尺, plus 飞子 at 0.6', () => {
  assert.ok(L.eave.out >= 4 * CHI - 1e-9 && L.eave.out <= 4.5 * CHI + 1e-9, `檐出 ${L.eave.out}`);
  near(L.eave.feizi, 0.6 * L.eave.out, 1e-9, '飞子');
  assert.ok(L.eave.wing >= 7 * (CHI / 10) - 1e-9, '翼角生出 is at least the 5-bay value, 7 寸');
});

test('layout is deterministic and needs no three.js', async () => {
  assert.deepEqual(hallLayout(spec), L);
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../src/yingzao/layout.js', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"]three/.test(src), 'must not import three');
});
