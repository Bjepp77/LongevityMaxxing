// Unit tests for the pure scoring/target/program core embedded in index.html (<script id="lmx-core">).
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const core = html.match(/<script id="lmx-core">([\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(core, ctx);
const L = ctx.LMX;

const base = { date: '2026-11-07', age: 44, sex: 'M', bw: 84, level: 'intermediate', jumpCm: 220, lift: 'trapbar', liftKg: 140, liftReps: 5,
  hangS: 75, gripKg: 50, anaMode: 'run400', anaS: 72, pushups: 30, vo2Mode: 'row2k', row2kS: 435, fiveKS: 1500, z2Min: 90, flags: {}, sls: {} };

test('FRIEND 40-49 median maps to P50 and P90 row to 90', () => {
  assert.equal(Math.round(L.vo2Percentile(37.8, 45, 'M')), 50);
  assert.equal(Math.round(L.vo2Percentile(52.1, 45, 'M')), 90);
  assert.equal(Math.round(L.vo2Percentile(26.7, 42, 'F')), 50);
});
test('VO2 formulas invert cleanly', () => {
  const v = L.vo2FromRow2k(435, 84, 'M');
  assert.ok(Math.abs(L.row2kFromVo2(v, 84, 'M') - 435) < 1e-6);
  assert.ok(Math.abs(L.vo2FromCooper(2400) - 42.36) < 0.01);
});
test('time parsing', () => {
  assert.equal(L.parseTime('7:15'), 435); assert.equal(L.parseTime('1:05:00'), 3900); assert.equal(L.parseTime('abc'), null);
  assert.equal(L.fmtTime(435), '7:15'); assert.equal(L.fmtTime(3900), '1:05:00');
});
test('noise gate', () => {
  assert.equal(L.classifyChange('vo2', 40, 41), 'noise');
  assert.equal(L.classifyChange('vo2', 40, 41.6), 'improved');
  assert.equal(L.classifyChange('fiveK', 1500, 1460), 'improved');   // -2.7% time
  assert.equal(L.classifyChange('fiveK', 1500, 1480), 'noise');
  assert.equal(L.classifyChange('grip', 50, 55), 'noise');
  assert.equal(L.classifyChange('pushups', 30, 29), 'declined');
});
test('own-baseline zones start at 50 and gain 10 per confirmed improvement', () => {
  const h = [base, { ...base, date: '2026-12-01', jumpCm: 222 }, { ...base, date: '2027-01-01', jumpCm: 240 }];
  assert.equal(L.baselineScore(h.slice(0, 1), 'jump').score, 50);
  assert.equal(L.baselineScore(h.slice(0, 2), 'jump').score, 50);   // +2 cm is within ±7%
  assert.equal(L.baselineScore(h, 'jump').score, 60);
});
test('scoring returns 7 zones, composite and two weakest', () => {
  const s = L.scoreHistory([base]);
  for (const id of ['power', 'ana', 'vo2', 'thr']) assert.ok(s.zones[id].score > 0, id);
  for (const id of ['sprint', 'aer', 'hike']) assert.equal(s.zones[id].score, null, id + ' has no data in a v1 assessment');
  assert.ok(s.pillar.score > 0);
  assert.ok(s.composite > 0 && s.composite < 100);
  assert.equal(s.weakest.length, 2);
});
test('block targets are gated by noise', () => {
  const t = L.blockTargets([base], 12, null), by = (m) => t.items.find((i) => i.metric === m);
  assert.equal(by('jump').shown, false);              // 4.5% < 7%
  assert.equal(by('e1rm').shown, false);              // intermediate 4.5% < 10%
  assert.equal(by('repPR').target, 8);
  assert.equal(by('vo2').shown, true);                // first block 2.5%*3 of ~48 -> +3.6
  assert.ok(by('vo2').target < 435);
  assert.equal(by('grip').shown, false);
  assert.equal(by('z2min').target, 150);
  const novice = L.blockTargets([{ ...base, level: 'novice' }], 12, null);
  assert.equal(novice.items.find((i) => i.metric === 'e1rm').shown, true);
});
test('detraining lowers baselines but not stored results', () => {
  assert.ok(Math.abs(L.vo2DetrainLoss(21) - 0.07) < 1e-9);
  assert.equal(L.vo2DetrainLoss(100), 0.16);
  assert.equal(L.strengthDetrainLoss(28), 0);
  const eff = L.effectiveBaseline(base, { start: '2026-11-10', end: '2026-12-15' });
  assert.equal(eff.days, 35);
  assert.ok(eff.vo2 < L.vo2FromRow2k(435, 84, 'M'));
  assert.equal(L.effectiveBaseline(base, { start: '2026-10-01', end: '2026-10-20' }).days, 0);
});
test('program: 12 weeks, deload every 4th, weakest zones get +1 session', () => {
  const p = L.generateProgram([base], ['aer', 'thr'], '2026-11-07', null);
  assert.equal(p.weeks.length, 12);
  assert.deepEqual(p.weeks.map((w) => w.deload).filter(Boolean).length, 3);
  assert.ok(p.weeks[3].deload && p.weeks[7].deload && p.weeks[11].deload);
  const ids = p.template.flat();
  assert.ok(ids.includes('aerB') && ids.includes('lt'));
  const count = (w, type) => w.days.flatMap((d) => d.sessions).filter((s) => s.type === type).length;
  assert.equal(count(p.weeks[0], 'z2'), 2);
  assert.equal(count(p.weeks[0], 'strength'), 2);
  assert.equal(count(p.weeks[0], 'vo2'), 1);
  assert.equal(count(p.weeks[0], 'stability'), 7);
  // deload: VO2 session drops from 4 to 3 reps
  const vo2Dose = (w) => w.days.flatMap((d) => d.sessions).find((s) => s.id === 'vo2').dose[0];
  assert.match(vo2Dose(p.weeks[0]), /^4 ×/); assert.match(vo2Dose(p.weeks[3]), /^3 ×/);
  // power never shares a day with endurance without a separation note
  for (const w of p.weeks) for (const d of w.days) {
    const types = d.sessions.map((s) => s.type);
    if (types.includes('power') && (types.includes('z2') || types.includes('vo2') || types.includes('lt')))
      assert.ok(d.sessions.find((s) => s.type === 'power').notes.some((n) => /3 h/.test(n)));
  }
  const day0 = L.programDay(p, '2026-11-07');
  assert.equal(day0.day.sessions[0].id, 'strengthA');
  assert.match(day0.day.sessions[0].dose[0], /kg/);
  assert.equal(L.programDay(p, '2027-02-01').outside, true);
});
test('strength weak zone adds a third strength session', () => {
  const p = L.generateProgram([base], ['pillar', 'vo2'], '2026-11-07', null);
  const ids = p.template.flat();
  assert.ok(ids.includes('strengthC') && ids.includes('vo2B'));
});
