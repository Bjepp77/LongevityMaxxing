// v2.1 oracle: age-grade data + hike rule in <script id="lmx-core"> (docs/SPEC.md "v2.1" (b)).
// Factor spot values are copied from the published sources; cases are hand-computed in fixtures/agegrade-cases.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const core = html.match(/<script id="lmx-core">([\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(core, ctx);
const L = ctx.LMX;
const fn = (name) => { assert.equal(typeof L[name], 'function', 'LMX.' + name + ' is exported'); return L[name]; };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' got ' + a + ' want ' + b + ' ±' + tol);
const cases = JSON.parse(readFileSync(new URL('../fixtures/agegrade-cases.json', import.meta.url), 'utf8'));

test('published factor spot values (WMA 2023 Appendix B; USATF MLDR 2025 road)', () => {
  const g = fn('ageGrade');
  const spot = [['60m', 'M', 44, 0.9574], ['400m', 'M', 44, 0.9269], ['60m', 'F', 44, 0.9686], ['400m', 'F', 44, 0.9157],
    ['60m', 'M', 70, 0.8228], ['400m', 'F', 70, 0.7084], ['60m', 'M', 90, 0.6696], ['5km', 'M', 44, 0.9195], ['10km', 'M', 44, 0.9336],
    ['half', 'M', 44, 0.9327], ['5km', 'F', 44, 0.9172], ['10km', 'F', 44, 0.9356], ['half', 'F', 70, 0.6683], ['5km', 'M', 70, 0.7353]];
  for (const [ev, sex, age, f] of spot) assert.equal(g(ev, sex, age, 100).factor, f, ev + ' ' + sex + age);
  assert.equal(L.AGE_GRADE_FACTORS['60m'].M.length, 61);
  assert.equal(L.AGE_GRADE_OPEN['5km'].M, 769); assert.equal(L.AGE_GRADE_OPEN['half'].F, 3772); assert.equal(L.AGE_GRADE_OPEN['60m'].M, 6.34);
});
test('age-graded % = 100 x (open / factor) / time, hand-computed cases', () => {
  assert.ok(cases.length >= 10);
  for (const c of cases) {
    const r = L.ageGrade(c.event, c.sex, c.age, c.seconds);
    assert.equal(r.ok, true); assert.equal(r.factor, c.factor, JSON.stringify(c));
    near(r.pct, c.pct, 0.05, JSON.stringify(c));
    assert.equal(r.label, 'age-graded %, not a percentile');
  }
});
test('age-grade edges: under 30 uses 1.0, over 90 is outside the table, bad input is null', () => {
  assert.equal(L.ageGrade('60m', 'M', 25, 8).factor, 1);
  const old = L.ageGrade('60m', 'M', 91, 12); assert.equal(old.ok, false); assert.match(old.reason, /outside the published table/);
  assert.equal(L.ageGrade('60m', 'X', 44, 8), null); assert.equal(L.ageGrade('100m', 'M', 44, 12), null); assert.equal(L.ageGrade('60m', 'M', 44, 0), null);
});
test('60-minute distance converts to a 10K time with Riegel, tagged converted', () => {
  const r = fn('tenKFromHour')(14000);
  near(r.seconds, 2520.0362, 1e-3); assert.equal(r.converted, true);   // 3600 x (10000/14000)^1.06
});
test('sprint MDC: video 3%, hand 5%', () => {
  assert.equal(fn('sprintMdc')('video'), 0.03); assert.equal(L.sprintMdc('hand'), 0.05); assert.equal(L.sprintMdc(undefined), 0.05);
});
test('hike: Naismith ratio, load rule, bands, too-short rule', () => {
  near(fn('naismithSeconds')(12, 900, 0, 80), 14040, 1e-6);            // 12/5 + 900/600 = 3.9 h
  near(L.naismithSeconds(12, 900, 8, 80), 15444, 1e-6);                // +10% for 10% bodyweight
  const h = fn('hikeRatio')({ km: 12, ascentM: 900, loadKg: 0, movingS: 12600 }, 80);
  assert.equal(h.ok, true); near(h.ratio, 14040 / 12600, 1e-9); assert.equal(h.band, 'at or above guidebook pace');
  assert.equal(h.label, 'observed effort, no published norms');
  assert.equal(L.hikeRatio({ km: 12, ascentM: 900, loadKg: 0, movingS: 15600 }, 80).band, 'steady');      // 0.9
  assert.equal(L.hikeRatio({ km: 12, ascentM: 900, loadKg: 0, movingS: 19500 }, 80).band, 'below guidebook pace'); // 0.72
  const short = L.hikeRatio({ km: 6, ascentM: 400, loadKg: 0, movingS: 5400 }, 80);
  assert.equal(short.ok, false); assert.match(short.reason, /too short to count/);
  assert.equal(L.hikeRatio({ km: 15, ascentM: 50, loadKg: 0, movingS: 10800 }, 80).ok, false);          // flat, no pack
  assert.equal(L.hikeRatio({ km: 15, ascentM: 50, loadKg: 12, movingS: 10800 }, 80).ok, true);          // flat with a 12 kg pack
});
