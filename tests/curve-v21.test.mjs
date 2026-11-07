// v2.1 oracle: forever-athlete curve, Strength pillar, composite weights, migration, targets, program (docs/SPEC.md "v2.1").
// BEFORE values were produced by the v2 core (main 9b40269) over fixtures/backup-schema1.json.
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
const backup = JSON.parse(readFileSync(new URL('../fixtures/backup-schema1.json', import.meta.url), 'utf8'));
const hist = backup.data.assessments;
const BEFORE = [{ thr: 50, ana: 50, vo2: 81.16197183098588, power: 50 }, { thr: 60, ana: 60, vo2: 84.93460764587523, power: 50 }];
const base = { ...hist[1] };

test('seven forever-athlete zones in order, pillar beside the curve, composite weights', () => {
  assert.deepEqual([...L.ZONES.map((z) => z.id)], ['power', 'sprint', 'ana', 'vo2', 'thr', 'aer', 'hike']);
  assert.deepEqual([...L.ZONES.map((z) => z.n)], [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(L.PILLAR.id, 'pillar');
  assert.deepEqual({ ...L.WEIGHTS }, { power: 1, sprint: 1, ana: 1, vo2: 3, thr: 1, aer: 1, hike: 0, pillar: 2 });
  assert.equal(fn('zoneName')('pillar'), 'Strength pillar');
  assert.equal(L.SCHEMA_VERSION, 2);
});
test('regression: power, ana, vo2 and thr scores identical to v2 for every stored assessment', () => {
  hist.forEach((_, i) => {
    const s = L.scoreHistory(hist.slice(0, i + 1));
    assert.equal(s.zones.thr.score, BEFORE[i].thr, 'thr #' + i);
    assert.equal(s.zones.ana.score, BEFORE[i].ana, 'ana #' + i);
    assert.equal(s.zones.vo2.score, BEFORE[i].vo2, 'vo2 #' + i);
    assert.equal(s.zones.power.score, BEFORE[i].power, 'power #' + i);
    for (const id of ['sprint', 'aer', 'hike']) assert.equal(s.zones[id].score, null, id + ' no data');
  });
  const s = L.scoreHistory(hist);
  assert.match(s.zones.thr.secondary, /^age-graded \d+\.\d%$/); assert.match(s.zones.ana.secondary, /^age-graded \d+\.\d%$/);
});
test('sprint and aer: the score IS the age-graded %, labelled, no mapping', () => {
  const s = L.scoreHistory([{ ...base, sprintS: 8.2, sprintTiming: 'video', aerMode: '10k', aerS: 3000 }]);
  near(s.zones.sprint.score, 80.757, 0.01); assert.equal(s.zones.sprint.score, L.ageGrade('60m', 'M', 44, 8.2).pct);
  near(s.zones.aer.score, 56.555, 0.01); assert.equal(s.zones.aer.converted, false);
  assert.equal(s.zones.sprint.label, 'age-graded %, not a percentile'); assert.equal(s.zones.aer.label, 'age-graded %, not a percentile');
  assert.match(s.zones.sprint.detail, /video-timed/);
  assert.match(L.scoreHistory([{ ...base, sprintS: 8.2, sprintTiming: 'hand' }]).zones.sprint.detail, /hand-timed, ±0\.2 s/);
  const half = L.scoreHistory([{ ...base, aerMode: 'half', aerS: 6000, age: 55 }]).zones.aer;
  near(half.score, 67.898, 0.01);
  const hour = L.scoreHistory([{ ...base, aerMode: '60min', aerM: 14000 }]).zones.aer;
  assert.equal(hour.converted, true); assert.match(hour.detail, /converted/);
  assert.equal(hour.score, L.ageGrade('10km', 'M', 44, L.tenKFromHour(14000).seconds).pct);
});
test('hike: observed only, own-baseline trend, weight 0 (never moves composite or weakest)', () => {
  const plain = L.scoreHistory([base]);
  const hike = { km: 12, ascentM: 900, loadKg: 0, movingS: 19500 };   // ratio 0.72: below guidebook pace
  const withHike = L.scoreHistory([{ ...base, hike }]);
  assert.equal(withHike.zones.hike.score, 50); assert.equal(withHike.zones.hike.observed, true);
  assert.equal(withHike.zones.hike.label, 'observed effort, no published norms');
  assert.match(withHike.zones.hike.detail, /below guidebook pace/);
  assert.equal(withHike.composite, plain.composite);
  assert.ok(!withHike.weakest.includes('hike'));
  const better = L.scoreHistory([{ ...base, hike }, { ...base, date: '2026-12-01', hike: { ...hike, movingS: 14040 } }]);
  assert.equal(better.zones.hike.score, 60);                         // ratio 0.72 -> 1.0 beats the 10% noise
  assert.equal(L.scoreHistory([{ ...base, hike: { km: 6, ascentM: 400, loadKg: 0, movingS: 5400 } }]).zones.hike.score, null);
});
test('Strength pillar = mean of est. 1RM band, grip + hang, push-up percentile; composite weights applied', () => {
  const s = L.scoreHistory([base]);
  const p = fn('pillarScore')(base);
  near(p.score, (p.strength.score + p.grip + p.pushups) / 3, 1e-9);
  assert.equal(s.pillar.score, p.score); assert.match(s.pillar.detail, /push-ups/);
  const z = s.zones, want = (z.power.score + z.ana.score + 3 * z.vo2.score + z.thr.score + 2 * p.score) / 8;
  near(s.composite, want, 1e-9);
  assert.equal(L.scoreHistory([{ age: 44, sex: 'M', bw: 84, date: '2026-11-07', pushups: 30 }]).weakest[0], 'pillar');
});
test('migration: schema-1 backup -> schema 2, program marked stale, assessments untouched, idempotent', () => {
  assert.equal(fn('needsMigration')(backup.data), true);
  const m = fn('migrateState')(backup.data);
  assert.equal(m.schema, 2); assert.equal(m.program.stale, true);
  assert.equal(JSON.stringify(m.assessments), JSON.stringify(backup.data.assessments)); assert.equal(JSON.stringify(m.log), JSON.stringify(backup.data.log));
  assert.equal(backup.data.schema, undefined, 'input not mutated');
  assert.equal(L.needsMigration(m), false); assert.equal(JSON.stringify(L.migrateState(m)), JSON.stringify(m));
  const fresh = L.generateProgram(hist, L.scoreHistory(hist).weakest, '2026-11-07', null);
  assert.equal(fresh.curveVersion, 2);
  assert.equal(L.migrateState({ program: fresh }).program.stale, undefined);
});
test('block targets: sprint gated by timing noise, aer by 2%, hike is a habit target; zone ids valid', () => {
  const t = (a) => L.blockTargets([a], 12, null).items;
  const video = t({ ...base, sprintS: 8.2, sprintTiming: 'video' }).find((i) => i.zone === 'sprint');
  assert.equal(video.target, 7.95); assert.equal(video.shown, true);                 // -3% vs 3% video noise
  assert.equal(t({ ...base, sprintS: 8.2, sprintTiming: 'hand' }).find((i) => i.zone === 'sprint').shown, false);   // inside 5% hand noise
  const aer = t({ ...base, aerMode: '10k', aerS: 3000 }).find((i) => i.zone === 'aer');
  assert.equal(aer.target, 2910); assert.equal(aer.shown, true);
  const hk = t({ ...base, hike: { km: 12, ascentM: 900, loadKg: 0, movingS: 12600 } }).find((i) => i.zone === 'hike');
  assert.equal(hk.current, 210); assert.equal(hk.target, 240); assert.equal(hk.shown, true);
  const ok = new Set([...L.ZONES.map((z) => z.id), 'pillar', 'behaviour']);
  for (const i of t({ ...base, sprintS: 8.2, aerMode: '10k', aerS: 3000 })) assert.ok(ok.has(i.zone), i.zone);
  const tc = L.targetCurve(L.scoreHistory([base]), L.blockTargets([base], 12, null));
  assert.deepEqual([...Object.keys(tc)].sort(), ['aer', 'ana', 'hike', 'power', 'sprint', 'thr', 'vo2']);
});
test('program: sprintB / aerB for weak zones, long hike replaces the long zone-2 session in week 2 of each block', () => {
  const p = L.generateProgram([{ ...base, sprintS: 8.2, aerMode: '10k', aerS: 3000 }], ['sprint', 'aer'], '2026-11-07', null);
  const ids = p.template.flat();
  assert.ok(ids.includes('sprintB') && ids.includes('aerB'));
  const sessions = (w) => p.weeks[w].days.flatMap((d) => d.sessions.map((s) => s.id));
  for (const w of [1, 5, 9]) { assert.ok(sessions(w).includes('hike'), 'week ' + (w + 1)); assert.ok(!sessions(w).includes('z2long')); }
  for (const w of [0, 2, 4]) { assert.ok(sessions(w).includes('z2long')); assert.ok(!sessions(w).includes('hike')); }
  const hikeDose = p.weeks[1].days.flatMap((d) => d.sessions).find((s) => s.id === 'hike').dose.join(' ');
  assert.match(hikeDose, /Pack ≤ 10% of bodyweight \(≤ 8 kg\)/);
  const sb = p.weeks[0].days.flatMap((d) => d.sessions).find((s) => s.id === 'sprintB');
  assert.ok(sb.notes.some((n) => /3 h/.test(n)));
  const pillar = L.generateProgram([base], ['pillar', 'vo2'], '2026-11-07', null).template.flat();
  assert.ok(pillar.includes('strengthC'));
});
