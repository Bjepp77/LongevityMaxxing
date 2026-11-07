// VO2max detail must flag ages outside 40-49 as estimated (only the median is source-checked there).
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
const detail = (age) => L.scoreHistory([{ ...base, age }]).zones.z5.detail;

test('VO2max detail says estimated outside 40-49', () => {
  for (const age of [25, 39, 50, 72]) assert.match(detail(age), /estimated/i, 'age ' + age);
});
test('VO2max detail has no estimated note inside 40-49', () => {
  for (const age of [40, 44, 49]) assert.doesNotMatch(detail(age), /estimated/i, 'age ' + age);
});
