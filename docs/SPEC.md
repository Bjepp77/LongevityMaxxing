# LongevityMaxxing — v1 product spec (2026-11-06)

## What it is
A single-page, offline-friendly fitness tracker (one `index.html`, localStorage, GitHub Pages — same delivery model as SwoleQuest) that scores the user on a **seven-zone fitness curve** (intensity vs. duration), shows where the curve sags, sets **block targets** every 8–12 weeks, and generates a **12-week program** aimed at the weakest zones. Single user (owner), manual entry, no device sync. Clean, modern theme (not pixel-RPG). `<meta name="robots" content="noindex">`.

## The curve (from the source reel: "raise the whole curve; capacity = area under the curve")
| # | Zone (short/hard → long/easy) | Field test | Metric | Norms | Evidence tier |
|---|---|---|---|---|---|
| 1 | Explosive power | standing broad jump, best of 3 | cm | own-baseline; reference 203 cm M / 165 cm F | emerging |
| 2 | Absolute strength | 5-rep trap-bar deadlift (or back squat) | est. 1RM = w×(1+reps/30), ÷ bodyweight; plus rep-PR ladder | community bands (label as such) | moderate |
| 2b | Grip (folded into zone 2) | dead hang seconds + dynamometer kg if available | s, kg | dead hang target 120 s M / 90 s F at 40s, −10–15 s per decade; grip "weak" <32 kg M / <19 kg F | strong (grip) |
| 3 | Anaerobic capacity | 400 m run or 500 m row, all-out | seconds | own-baseline only | none |
| 4 | Muscular endurance | push-ups to failure | reps | 40–49 M P25/50/75 = 11/14/19; F = 8/11/14 (same protocol only) | weak |
| 5 | VO2max | 2K row (VO2max = (10.7−0.9T)×1000/kg M; (10.26−0.93T)×1000/kg F; T minutes) or 12-min run (VO2max = (m−504.9)/44.73) | mL/kg/min + raw time/distance | FRIEND 40–49 M P10/25/50/75/90/95 = 26.8/31.9/37.8/45.0/52.1/55.6; F = 18.8/22.1/26.7/32.4/38.4/41.7 (ship the full 20–79 table if obtainable, else these rows ± interpolation) | strongest |
| 6 | Lactate threshold | 5K time trial | seconds | own-baseline (age-grade optional later) | none separate |
| 7 | Cardiovascular endurance | weekly zone-2 minutes + a long effort pace (60–90 min at talk-test pace) | min/week, pace | target 150–200+ min/week | lever |
Daily, unscored: 10-minute stability block (single-leg stand 30 s eyes open / 15 s closed as a quarterly pass/fail).

## Scoring
- Each zone → 0–100: percentile where norms exist (zone 5, 4, 2b), band position for zone 2, own-baseline progress (first test = 50, +10 per confirmed improvement above MDC) for zones 1, 3, 6, 7.
- Composite "area under the curve" = evidence-weighted mean (weights: zone 5 ×3, zone 2/2b ×2, others ×1). Show the curve as a 7-point line chart plus a dotted "target curve".
- **Noise gate:** a change is only labelled "improved/declined" when it exceeds the test's minimal detectable change: VO2max est. ±1.5 mL/kg/min (lab CV 2–4%); grip ±6 kg; est. 1RM ±10% (prefer rep-PRs, which are exact); broad jump ±7%; push-ups/reps exact; times ±2%. Otherwise show "within noise".
- Log context flags at each test: sleep <6 h, caffeine, heat, time of day.

## Block targets (8–12-week cycles)
Expected gain per 4 weeks for a trained adult: VO2max 2–3% first block then ~1%; strength novice 3–5%, intermediate 1–2%, advanced ≤1%; grip 0–1%; power 1–2% for 8–12 weeks then flat; endurance reps: rep-PR ladder. Block target = current × (1 + rate × blocks), rounded to the raw test unit (metres, seconds, reps, kg). Never show a per-workout VO2max number. Detraining after a layoff: VO2max −2.3%/week for 3 weeks then plateau at −16%; strength no loss ≤4 weeks then accelerating — apply to stored baselines, don't reset.

## Program generator (12 weeks = 3 × 4-week blocks, deload week 4 of each)
Weekly template: 2–3 strength sessions (3–5 lifts × 3–5 reps × 3–5 sets at ~80–85%), 1 VO2max session (4 × 4 min hard / 4 min easy), 2–3 zone-2 sessions (45–60 min, total 150–200+ min), 1 power/anaerobic session (jumps + sprints), muscular-endurance finisher on a strength day, 10 min stability daily. Rules: power/sprint work ≥3 h from endurance work, ideally its own day; weakest two zones get +1 session each; deload = −40% volume. Per-session dose derives from the block target: interval pace from last 2K/12-min result (+5–8% of test pace), strength loads from the rep-PR ladder, zone-2 minutes from the weekly target.

## Reuse from SwoleQuest
Keep: session logger, timers, progression/deload detection, charts, localStorage persistence, export/import. Replace: all content, names, theme, program data. New keys under `lmx.*`; never read `swolequest.*` keys.

## Copy rules
"Associated with longer life", never "causes". Evidence tier badge on each zone. "Elite" labelled aspirational above the 90th percentile.

## v1 acceptance
Open the live URL → enter seven tests → see curve, composite, weakest zones, block targets → generate 12-week program → open today's session with its dose → log it → reload and data persists. Smoke-tested in a browser before hand-off.
