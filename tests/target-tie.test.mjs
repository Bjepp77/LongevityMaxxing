// v2.1 oracle (nit from lead walk-through 2026-11-07): a block target shows a number only when the
// expected change BEATS the test's MDC (docs/SPEC.md v2.1 (f)). Ties go to trend-only, and the gate
// uses the unrounded target so 2-dp display rounding cannot tip a tie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const core = html.match(/<script id="lmx-core">([\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(core, ctx);
const L = ctx.LMX;
const backup = JSON.parse(readFileSync(new URL('../fixtures/backup-schema1.json', import.meta.url), 'utf8'));
const base = { ...backup.data.assessments[1] };
const sprint = (a, w) => L.blockTargets([a], w, null).items.find((i) => i.zone === 'sprint');

test('sprint 12-week target: 3% change vs 3% video noise is a tie -> trend only', () => {
  for (const s of [9.2, 8.2, 7.5, 10.37]) {
    const t = sprint({ ...base, sprintS: s, sprintTiming: 'video' }, 12);
    assert.ok(t, 'sprint target exists for ' + s);
    assert.equal(t.shown, false, 'sprintS ' + s + ' video, 12 wk: tie must be trend-only');
  }
});

test('sprint 8-week target stays trend-only; hand timing stays trend-only', () => {
  assert.equal(sprint({ ...base, sprintS: 9.2, sprintTiming: 'video' }, 8).shown, false);
  assert.equal(sprint({ ...base, sprintS: 9.2, sprintTiming: 'hand' }, 12).shown, false);
});

test('a change that clearly beats the gate is still shown (vo2 first block)', () => {
  const t = L.blockTargets([base], 12, null).items.find((i) => i.metric === 'vo2');
  assert.equal(t.shown, true);
});
