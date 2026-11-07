// v2 acceptance oracle: log import parsers + proxy equations in <script id="lmx-core"> (docs/SPEC.md "v2").
// Expected values are hand-computed (see the comments); fixtures live in fixtures/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const core = html.match(/<script id="lmx-core">([\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(core, ctx);
const L = ctx.LMX;
const fx = (n) => readFileSync(new URL('../fixtures/' + n, import.meta.url), 'utf8');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' got ' + a + ' want ' + b + ' ±' + tol);
const AS_OF = '2026-11-07', PROFILE = { age: 44, sex: 'M' };
const fn = (name) => { assert.equal(typeof L[name], 'function', 'LMX.' + name + ' is exported'); return L[name]; };

test('Epley e1RM = w x (1 + reps/30)', () => {
  near(L.e1rm(100, 5), 116.6667, 1e-3);
  near(L.e1rm(120, 5), 140, 1e-9);
});
test('Riegel T2 = T1 x (D2/D1)^1.06 and its inverse', () => {
  near(fn('riegelTime')(1200, 5000, 10000), 2501.918, 1e-2);            // 1200 * 2^1.06
  near(fn('riegelDistance')(1200, 5000, 3600), 14095.63, 1e-1);          // 5000 * 3^(1/1.06)
  near(L.riegelDistance(L.riegelTime(1500, 5000, 21100), 5000, L.riegelTime(1500, 5000, 21100)), 5000, 1e-6);
});
test('Daniels VDOT of a 20:00 5K is ~49.8', () => { near(fn('vdot')(5000, 1200), 49.81, 0.02); });
test('critical speed = least-squares slope of distance vs time', () => {
  const r = fn('criticalSpeed')([{ m: 1500, s: 345 }, { m: 3000, s: 700 }, { m: 5000, s: 1190 }].map((e) => ({ ...e, date: AS_OF })));
  assert.equal(r.ok, true);
  near(r.cs, 4.138314, 1e-5); near(r.dPrime, 83.6226, 1e-3); near(r.fiveKS, 1188.015, 1e-2);
});
test('critical speed needs 3 envelope efforts of 2-20 min', () => {
  const two = L.criticalSpeed([{ m: 1500, s: 345, date: AS_OF }, { m: 5000, s: 1190, date: AS_OF }]);
  assert.equal(two.ok, false); assert.match(two.reason, /not enough data/);
  // a slow 3 km (dominated by the faster, longer 5 km) is dropped from the envelope
  const slow = L.criticalSpeed([{ m: 1500, s: 345 }, { m: 3000, s: 900 }, { m: 5000, s: 1190 }].map((e) => ({ ...e, date: AS_OF })));
  assert.equal(slow.ok, false);
  const tooLong = L.criticalSpeed([{ m: 5000, s: 1300 }, { m: 10000, s: 2600 }, { m: 3000, s: 1250 }].map((e) => ({ ...e, date: AS_OF })));
  assert.equal(tooLong.ok, false);
});
test('number parsing: comma decimals and thousands separators', () => {
  const p = fn('parseNum');
  assert.equal(p('102,5'), 102.5); assert.equal(p('102.5'), 102.5); assert.equal(p('1.234,5'), 1234.5);
  assert.equal(p('1,234.5'), 1234.5); assert.equal(p('1,234'), 1234); assert.equal(p('heavy'), null); assert.equal(p(''), null);
});
test('date parsing: ISO and Strava English dates', () => {
  const d = fn('parseDate');
  assert.equal(d('2026-10-01 07:30:00'), '2026-10-01'); assert.equal(d('Oct 3, 2026, 7:15:22 AM'), '2026-10-03'); assert.equal(d('nonsense'), null);
});
test('Strong fixture: kg + lb rows, comma decimal, >10-rep and bad rows', () => {
  const s = fn('parseStrong')(fx('strong-sample.csv'), {});
  assert.equal(s.sets, 8); assert.equal(s.skipped, 1);                    // "heavy" row skipped, rest timer ignored
  assert.deepEqual({ ...s.units }, { kg: 6, lb: 2 });
  near(s.lifts.squat.e1rm, 140, 1e-6); assert.equal(s.lifts.squat.reps, 5);           // 120 x 5 beats 125 x 3 (137.5)
  near(s.lifts.bench.e1rm, 225 * 0.45359237 * (1 + 5 / 30), 1e-6);                    // 119.068 kg from lb
  near(s.lifts.trapbar.e1rm, 162.5 * (1 + 5 / 30), 1e-6);                             // "162,5" kg; the 12-rep set is excluded
  assert.equal(s.lifts.trapbar.sets, 2);
  near(s.lifts.ohp.e1rm, 135 * 0.45359237 * (1 + 5 / 30), 1e-6);
  assert.deepEqual([...s.unmapped.map((u) => u.name)], ['Bicep Curl (Dumbbell)', 'Face Pull (Cable)']);
  assert.equal(s.unitAssumed, null);
});
test('Strong: semicolon delimiter, unit from header, fallback unit flagged', () => {
  const semi = 'Date;Exercise Name;Set Order;Weight (lbs);Reps\n2026-10-01 07:30:00;Deadlift (Barbell);1;315,0;3\n';
  const a = L.parseStrong(semi, {});
  near(a.lifts.deadlift.e1rm, 315 * 0.45359237 * 1.1, 1e-6); assert.equal(a.unitAssumed, null);
  const bare = 'Date,Exercise Name,Set Order,Weight,Reps\n2026-10-01,Squat (Barbell),1,100,5\n';
  const b = L.parseStrong(bare, { unit: 'lb' });
  near(b.lifts.squat.e1rm, 100 * 0.45359237 * (1 + 5 / 30), 1e-6); assert.equal(b.unitAssumed, 'lb');
  assert.throws(() => L.parseStrong('foo,bar\n1,2\n', {}), /Strong/);
});
test('Strava fixture: two Distance columns, types, bad row, no raw text kept', () => {
  const s = fn('parseStrava')(fx('strava-sample.csv'), AS_OF);
  assert.deepEqual({ ...s.counts }, { rows: 9, runs: 6, hikes: 1, other: 1, skipped: 1 });
  assert.equal(s.hikes.count, 1); assert.equal(s.hikes.longestS, 12600); assert.equal(s.hikes.elevM, 950);
  const half = s.efforts.find((e) => e.m === 21100);
  assert.equal(half.race, true); assert.equal(half.s, 5760);               // race: elapsed time
  assert.equal(s.efforts.find((e) => e.m === 5000 && e.s < 1500).s, 1190); // training: moving time
  const json = JSON.stringify(s);
  for (const raw of ['Activity ID', 'Ridge hike', 'Track 1500 hard', 'Commute ride']) assert.ok(!json.includes(raw), 'summary leaks ' + raw);
  assert.throws(() => L.parseStrava('a,b\n1,2\n', AS_OF), /Strava/);
});
test('proxy estimates from the Strava fixture (hand-computed)', () => {
  const p = fn('proxyEstimates')(L.parseStrava(fx('strava-sample.csv'), AS_OF), PROFILE, AS_OF);
  assert.equal(p.thr.ok, true); near(p.thr.cs, 4.138314, 1e-5); near(p.thr.fiveKS, 1188.015, 1e-2); assert.equal(p.thr.band, 0.08);
  assert.equal(p.aer.ok, true); assert.equal(p.aer.race, true); near(p.aer.d60, 13543.05, 0.1); assert.equal(p.aer.band, 0.05);
  assert.equal(p.vo2.ok, true); near(p.vo2.vo2, 58.296, 1e-2); assert.equal(p.vo2.band, 0.2);   // 5 km/1190 s -> 3112.5 m in 12 min
  near(p.vo2.vo2Lo, 58.296 * 0.8, 1e-2); near(p.vo2.vo2Hi, 58.296 * 1.2, 1e-2);
  for (const z of ['vo2', 'thr', 'aer']) {
    assert.match(p[z].label, /^Estimated from your log, ±\d+%, provisional until tested$/);
    assert.ok(p[z].pct > 0 && p[z].pct < 100, z + ' placement percentile');
  }
  assert.match(p.thr.label, /±8%/); assert.match(p.aer.label, /±5%/); assert.match(p.vo2.label, /±20%/);
});
test('proxies need recent data and fall back to an 11% band without a race', () => {
  const s = L.parseStrava(fx('strava-sample.csv'), AS_OF);
  const late = L.proxyEstimates(s, PROFILE, '2027-06-01');                  // > 16 weeks later
  for (const z of ['vo2', 'thr', 'aer']) { assert.equal(late[z].ok, false); assert.match(late[z].reason, /not enough data/); }
  const noRace = { ...s, efforts: s.efforts.filter((e) => !e.race) };
  const p = L.proxyEstimates(noRace, PROFILE, AS_OF);
  assert.equal(p.aer.band, 0.11); near(p.aer.d60, 5000 * Math.pow(3600 / 1190, 1 / 1.06), 0.1);
  assert.equal(L.proxyEstimates(s, {}, AS_OF).vo2.pct, null);                 // no age/sex -> no percentile
});
test('a real test replaces the proxy outright; must-test order', () => {
  const p = L.proxyEstimates(L.parseStrava(fx('strava-sample.csv'), AS_OF), PROFILE, AS_OF);
  assert.deepEqual([...Object.keys(fn('activeProxies')(p, []))].sort(), ['aer', 'thr', 'vo2']);
  const after = L.activeProxies(p, [{ date: AS_OF, age: 44, sex: 'M', bw: 84, fiveKS: 1500 }]);
  assert.deepEqual([...Object.keys(after)].sort(), ['aer', 'vo2']);
  assert.equal(fn('weakestProxy')({ vo2: { pct: 70 }, thr: { pct: 40 }, aer: { pct: 55 } }), 'thr');
  assert.deepEqual([...fn('mustTestOrder')('vo2')], ['ana', 'sprint', 'power', 'hike']);
  assert.deepEqual([...L.mustTestOrder('aer')], ['hike', 'ana', 'sprint', 'power']);
  assert.deepEqual([...L.mustTestOrder(null)], ['power', 'sprint', 'ana', 'hike']);
});
test('proxies never feed block targets', () => {
  const a = { date: AS_OF, age: 44, sex: 'M', bw: 84, level: 'intermediate', fiveKS: 1500, flags: {}, sls: {} };
  const before = JSON.stringify(L.blockTargets([a], 12, null));
  L.proxyEstimates(L.parseStrava(fx('strava-sample.csv'), AS_OF), PROFILE, AS_OF);
  assert.equal(JSON.stringify(L.blockTargets([a], 12, null)), before);
  assert.equal(L.blockTargets.length, 3, 'blockTargets takes (history, weeks, layoff) only');
});
