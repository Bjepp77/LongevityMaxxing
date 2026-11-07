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

---

# v2 — "Import your log, get a provisional placement" (2026-11-07)

**Frame.** LongevityMaxxing is a measurement layer on top of whatever program a person already runs, not a replacement for it. v2 lets a user import the log they already keep and get an honest, provisional placement on the curve on day 1, plus a list of the zones they must go and test. Research basis: run f49dc812 (28 sources; numbered citations below match that report).

**Honesty rule.** A proxy is noisier than a field test (its error band is wider than one block's expected gain). So a proxy **places** you; it never sets targets. Proxies are computed from `lmx.import.*` only. `scoreHistory`, `blockTargets`, `targetCurve`, `generateProgram` and the noise-gated change labels read real assessments only and never see import data. The composite never includes a proxy.

## Formats (client-side only; FileReader in the browser; nothing is uploaded)
| Format | Columns used | Notes |
|---|---|---|
| Strong app CSV [16][24] (one row per set) | Date, Exercise Name, Set Order, Weight, Reps (+ optional `Weight Unit`) | Delimiter auto-detected (`,` or `;`). Number parsing accepts comma decimals (`102,5`) and thousands separators. Unit per row from `Weight Unit` (`kg`/`lb`/`lbs`), else from the header (`Weight (kg)` / `Weight (lbs)`), else the unit the user picks on the import screen (default kg, shown as an assumption). 1 lb = 0.45359237 kg. Rows with no date, no exercise, a non-numeric weight/reps, reps ≤ 0, or `Set Order` = rest timer are skipped and counted. |
| Strava bulk export `activities.csv` [25] | Activity Date, Activity Name, Activity Type, Elapsed Time, Moving Time, Distance, Elevation Gain, Average Heart Rate, Workout Type (if present) | Account language must be English. The export has two `Distance` columns: the first in km, the second in metres; the last one is used. With a single `Distance` column, values > 500 are metres, otherwise km. Dates parsed from `Oct 3, 2026, 7:15:22 AM` or ISO. Types `Run`, `Trail Run`, `Virtual Run` → run efforts; `Hike`, `Walk` → hikes (observed, never maximal); everything else counted only. |

**Storage.** Only derived summaries are kept, in `lmx.import.strong`, `lmx.import.strava` and `lmx.import.meta`. The raw file text is discarded after parsing (localStorage is ~5 MB). Strong summary: best e1RM per mapped lift with its source set, set counts, date range, unit note, unmapped-exercise bucket. Strava summary: run efforts (date, distance m, time s, race flag) from 1.2 km to 21.3 km within the last 52 weeks (most recent 400 at most), counts, hike summary (count, longest duration, total elevation).

**Exercise mapping (fixed list).** trap-bar deadlift, deadlift, back squat, bench press, overhead press, barbell row. Names are lower-cased and matched against an alias list (e.g. `Squat (Barbell)`, `Back Squat`, `Trap Bar Deadlift`, `Hex Bar Deadlift`, `Overhead Press (Barbell)`, `Strict Press`). Anything else goes to the **unmapped** bucket, shown to the user with its set count. Dumbbell/machine variants stay unmapped on purpose (not comparable to v1's bands).

## Proxy estimates (three zones + the strength pillar)
Efforts used for zones: run efforts within the **last 16 weeks** of today. Effort time = elapsed time for a race-tagged activity, else moving time (elapsed if moving is missing). Race-tagged = Strava `Workout Type` = 1, or the name matches `race`, `parkrun`, `marathon`, `half`.

| Zone (v1 id) | Method | Inputs / window | Band (label X) | Placement score |
|---|---|---|---|---|
| z6 Threshold (10–20 min) | **Critical speed** [1][2]: least-squares fit D = CS·t + D′ over the best efforts. Best efforts = the upper envelope (an effort is dropped if another effort lasted at least as long at a faster average speed). | ≥ 3 envelope efforts lasting 2–20 min, longest ≥ 2 × shortest, fitted CS > 0 and D′ ≥ 0; else "not enough data". Shown as CS pace and the equivalent 5K = (5000 − D′)/CS. | ±8% [1][2]. CS runs slightly faster than lactate threshold [21]. | FRIEND percentile of the Daniels–Gilbert VDOT of that 5K |
| z7 60-minute aerobic | **Riegel** [3]: T2 = T1 × (D2/D1)^1.06, solved for distance: D60 = D1 × (3600/T1)^(1/1.06). | Efforts 5 km – 21.1 km. If any is race-tagged, the best race is used; else the best effort (largest D60). | ±5% if the source is a race-tagged activity, else ±11% [3][4] | FRIEND percentile of the VDOT of D60 in 60 min |
| z5 VO2max (2–5 min) | Riegel-scale the best 1.5–5 km effort to the v1 12-min Cooper test: D12 = D1 × (720/T1)^(1/1.06); VO2 = (D12 − 504.9)/44.73 (v1 formula). | Efforts 1.5–5 km; best = largest D12. | ±20% on VO2 [5][6] (shown as a VO2 range and a percentile range) | FRIEND percentile of the VO2 estimate |
| Strength pillar (not a zone placement) | **Epley** e1RM = w × (1 + reps/30) [7][23] | Strong sets with 1–10 reps only; best per mapped lift; all dates | shown with "±10%"; deadlift tends to be underestimated [7] | none — e1RM is shown per lift; strength stays a must-test zone |

Daniels–Gilbert VDOT (used only to put z6/z7 proxies on a common percentile scale so the weakest proxy can be found): v = m/min, t = min; VO2 = −4.60 + 0.182258 v + 0.000104 v²; %max = 0.8 + 0.1894393 e^(−0.012778 t) + 0.2989558 e^(−0.1932605 t); VDOT = VO2 / %max. Percentiles need age and sex; without them the raw estimate is shown and the placement says "add age and sex".

**Label (every proxy value):** "Estimated from your log, ±X%, provisional until tested". Proxy points are drawn hollow and dashed on the curve and are never joined to the real-score line.

**Replacement.** A zone's proxy is hidden — outright, no averaging — once any real assessment gives that zone a score: z5 (2K row or 12-min run), z6 (5K), z7 (weekly zone-2 minutes). The label disappears with it.

**Must-test zones.** v1's curve has no 10 s sprint or multi-hour hike zone, so the four zones with no validated log proxy are z1 broad jump [10][11][18], z2 strength + grip (e1RM is shown but the 5-rep test, dead hang and grip still need doing), z3 400 m / 500 m row [20], z4 push-ups. Each shows "Not estimable from a log: test this". Order: nearest on the curve to the **weakest proxied zone** first (ties → the shorter-duration zone first). The weakest proxied zone itself gets a separate "confirm this estimate with a real test" note. Manual entry stays the only path for these in v2. A logged hike is shown as observed, not maximal, and places nothing.

**Assessment form change (needed for v2).** Individual field tests are optional; at least one test is required. This lets a user enter one real test (e.g. a 5K) to replace one proxy.

**Measurement flags (no analytics, no server).** `lmx.import.meta` = { used, firstImportAt, firstRealTestAfterImport: { date, savedAt } | null }. It is set on the first import and when the first real assessment is saved after it, and is included in the export/import backup JSON so the owner can measure "your log places you, tests confirm" himself.

## Out of scope for v2 → v2.1+ (research effort ranking)
1. Hevy CSV — low effort; headers unconfirmed.
2. Garmin FIT — medium; `@garmin/fitsdk` runs in the browser [26]; per-second data, best for CS.
3. Apple Health XML — high; 200 MB–1+ GB, needs streaming parse in a Web Worker [17].
4. TrainingPeaks — not researched.
Also out: wearable sync, accounts, backend. Open product question: realign the curve to the forever-athlete zones (10 s sprint, multi-hour hike).

## v2 acceptance
Fixtures `fixtures/strong-sample.csv` (kg, lb and a comma-decimal row) and `fixtures/strava-sample.csv` (1.5 km, 5 km, 10 km runs, a 21.1 km race, a hike). On staging: import both → three provisional placements with bands and labels, e1RM per lift, unmapped bucket, four "test this" prompts in order → block targets identical with and without the import (no targets at all from an import alone) → enter one real 5K → threshold proxy replaced, label gone → reload persists → localStorage holds no raw CSV text. `npm test` covers both parsers (units, comma decimals, bad rows), critical speed, Riegel and Epley against hand-computed values.

## v2 sources (from run f49dc812)
[1] PMC7664951 · [2] thieme 10.1055/s-0035-1549958 · [3] PMC5000509 · [4] PMC11534629 · [5] PMC9213394 · [6] PMC12080799 · [7] arXiv 2603.17495 · [10] BJSM 38/3/285 · [11] coachsci.sdsu.edu vol103/hasson · [16] help.hevyapp.com 38001424401943 · [17] aihealthexport.com apple-health-xml-format · [18] PMC11867321 · [20] lida.sport-iat.de 4092468 · [21] sponet 4097852 · [23] efyc.fahce.unlp.edu.ar 12634 · [24] forum.intervals.icu 5531 · [25] docs.ropensci.org Athlytics load_local_activities · [26] npm @garmin/fitsdk. Daniels & Gilbert, *Oxygen Power* (1979) for VDOT.

---

# v2.1 — Forever-athlete curve (APPROVED 2026-11-07 with three changes, folded in below)

Owner decisions (2026-11-07): realign the curve to the forever-athlete zones as its own change, accepting that v1/v2 history is re-scored; weakest-first test order unchanged until this lands; import order Hevy CSV → Garmin FIT → Apple Health. Research basis: run f49dc812 ("R" below: §Per-zone proxies, §Showing a proxy baseline honestly, §Import formats, §Where auto-estimates backfire, §Limitations).

## (a) The seven zones (short & hard → long & easy)
| # | id | Zone | Field test | Scoring basis | Evidence tier |
|---|---|---|---|---|---|
| 1 | power | ~1 s explosive power | standing broad jump, best of 3 (cm) | own baseline + reference 203/165 cm (unchanged from v1) | emerging |
| 2 | sprint | 10 s max speed | **60 m from a standing start**, best of 2, full rest (s) | curve score = WMA 2023 age-graded % itself (60 m) | emerging |
| 3 | ana | 60 s anaerobic | 400 m run all-out (s); 500 m row stays as a variant | **unchanged v1 own-baseline score**; WMA 2023 age-grade % (400 m run only) shown as a secondary readout | weak |
| 4 | vo2 | 2–5 min VO2max | 2K row or 12-min run (unchanged) | FRIEND percentile (unchanged) | strongest |
| 5 | thr | 10–20 min threshold | 5K time trial (unchanged) | **unchanged v1 own-baseline score**; road age-grade % (5 km) shown as a secondary readout | moderate |
| 6 | aer | 60 min aerobic | 10K or half-marathon race/time trial, or distance in a 60-min hard run | curve score = road age-graded % itself (10 km / half; a 60-min distance is converted to a 10K time with Riegel and tagged "converted") | moderate |
| 7 | hike | multi-hour endurance | a hard hike or ruck ≥ 2 h: distance, ascent, pack load, moving time | **observed-only**: own-baseline trend of the Naismith ratio, composite weight 0 — no validated norms | none |

Why 60 m: a standing 60 m lasts 7–11 s for adults, so it is the 10 s zone, it is an official WMA event (age factors exist), and it needs only a measured straight. A flying 30 m needs two timers and a run-in, so it is listed as a later option, not v2.1.

**Push-ups and grip — recommendation: keep them, off the curve, in a "Strength pillar" that still counts in the composite.** Reason: grip has the strongest mortality evidence in the whole app (v1 tier "strong") and strength is a pillar in the R report ("feeds the strength pillar, not a zone"); dropping them would throw away the best-evidenced measure, while forcing them onto a duration curve is wrong. Pillar = est. 1RM / bodyweight (lifter bands, unchanged), grip + dead hang (unchanged), push-ups (Cooper percentile, unchanged) → one pillar score = mean of the parts present. Alternatives rejected: drop entirely (loses grip evidence); keep as unscored extras (pillar would then not move the composite, which undervalues strength).

## (b) Norms and honest limits for the new scoring
- **Scoring bases of existing zones do not change.** power, ana, vo2 and thr keep their v1 scores exactly. Age-graded % for the 400 m run and the 5K is a secondary readout next to the score ("age-graded 61%"), never the score.
- **sprint and aer: the curve score IS the age-graded %** (0–100, clamped 1–99), labelled "age-graded %, not a percentile". No mapping between age-grade and percentile scales is invented. Age-graded % = 100 × age-standard ÷ your time, with age-standard = open standard ÷ age factor.
- **Data (embedded; ages 30–90 single-year, M/F; under 30 uses factor 1.0; over 90 shows "outside the published table").**
  - 60 m and 400 m: [WMA 2023 Appendix B](https://world-masters-athletics.org/wp-content/uploads/2023/02/2023-WMA-Appendix-B.pdf) one-year age factors (e.g. M44 60 m 0.9574, 400 m 0.9269; F44 60 m 0.9686, 400 m 0.9157). Appendix B gives factors, not open standards, so the open standard = senior world record (60 m M 6.34 s, W 6.92 s; 400 m M 43.03 s, W 47.60 s) — an assumption, stated in the app's notes; WMA's own calculator may differ by a fraction of a point.
  - 5 km, 10 km, half: USATF MLDR 2025 road tables by Alan Jones (CC0, github.com/AlanLyttonJones/Age-Grade-Tables, `2025 Files/MaleRoadStd2025.xlsx` / `FemaleRoadStd2025.xlsx`): open standards M 769 / 1584 / 3451 s, W 834 / 1726 / 3772 s; e.g. M44 factors 0.9195 / 0.9336 / 0.9327.
  - Standard bands (WMA/BMAF convention): 60% local, 70% regional, 80% national, 90% world class.
- **Sprint timing error.** Hand/phone stopwatch timing over a 30 m sprint is off by ~2% and needs a ≥ 5% change to exceed measurement error ([J Kinesiol Exerc Sci 2022](https://doaj.org/article/e85ade5f8b4b4189b692e04549fd216e)); timers differ by 0.19 ± 0.14 s per trial ([Haugen & Buchheit review](https://athleticswaikatobayofplenty.org.nz/wp-content/uploads/2020/05/haugen-buchheit-sprint-monitoring-sports-med-review-in-press.pdf)). So: protocol = phone on a tripod at the finish filming slow-motion, start on your own first movement, time from first movement to torso crossing by frame count (the app gives a frame-count helper); stopwatch allowed but flagged "hand-timed, ±0.2 s". MDC 5% (hand) / 3% (video). Smartphone timing apps are unvalidated (same sources) — say so.
- **Hike: no validated norms (R §Per-zone: "No validated equation… Must test; observed, not maximal").** Rule, labelled "observed effort, no published norms":
  - Naismith expected time T_N = distance_km / 5 km/h + ascent_m / 600 m/h (Naismith 1892), plus 10% per 10% bodyweight of pack load (a convention, not validated — say so).
  - Ratio = T_N / your moving time. Pass bands: ≥ 1.0 "at or above guidebook pace", 0.8–1.0 "steady", < 0.8 "below guidebook pace".
  - Curve position = own-baseline score of the ratio (first hike = 50, ±10 per change beyond MDC 10%), drawn as a hollow, dashed "observed" point; it is never joined to the scored line.
  - **Composite weight 0**: the hike never moves the composite or the weakest-zone ranking.
  - Requires ≥ 2 h moving time and (≥ 300 m ascent or ≥ 10 kg load), else "too short to count".
  - Cannot claim: a percentile, a fitness level, a longevity association, or comparability across terrain or weather. Body mass, absolute VO2max and load matter more than relative VO2max for hiking (R [22], preprint) — shown as a note.

## (c) History re-score and one-time migration
Stored assessments keep their raw fields; scoring is recomputed, nothing is overwritten.
| Stored field | New home |
|---|---|
| jumpCm | power |
| anaS (+ anaMode) | ana (400 m → age-grade; 500 m row → own baseline) |
| row2kS / cooperM | vo2 |
| fiveKS | thr |
| liftKg/liftReps/lift, gripKg, hangS, pushups | Strength pillar |
| z2Min, longPace | no zone — kept as the weekly zone-2 behaviour target in the program (shown on the program page) |
| — | sprint, aer, hike: "no data — test this" |
New fields: sprintS, sprintTiming (video|hand), aerMode (10k|half|60min), aerS / aerM, hike {km, ascentM, loadKg, movingS, date}.
**Composite:** evidence-weighted mean over present items: vo2 ×3, Strength pillar ×2, power / sprint / ana / thr / aer ×1, **hike ×0** (observed-only: drawn hollow with its label and own-baseline trend, never in the composite or weakest-zone ranking). Composites from before and after the migration are not comparable; history shows a "curve v2.1" divider and does not label the jump as improved/declined.
**Migration (once):** on first load with `lmx.schema` absent or < 2, show a blocking card: "The curve changed. Download a backup first" [Download backup] [Continue]. Continue is enabled only after the backup download fires (or an explicit "skip backup" link with confirm). Then set `lmx.schema = 2`. The stored program (built on old zone ids) is kept but marked "built on the old curve — regenerate"; v2 import proxies map z5→vo2, z6→thr, z7→aer. Backup import accepts schema 1 and 2 files (schema 1 files trigger the same migration).

## (d) Block targets and program (noise gate unchanged: a number only when expected change > MDC)
- sprint: expected −1%/4 wk for 8–12 wk then flat; MDC 5% hand / 3% video → usually "trend only" (correct: phone timing can't see one block's gain).
- ana / thr / aer: as v1 rates (ana −0.75%/4 wk, thr and aer −1%/4 wk), MDC 2%; targets shown in raw time, age-grade shown alongside.
- hike: behaviour target, not a performance number: one long hike/ruck every 2–4 weeks, +15 min per block up to 4 h, load ≤ 10% bodyweight; performance shown as trend only (MDC 10%).
- Program: the power day keeps sprints (6 × 20–40 m, full rest); weak-zone extras: `sprintB` (accelerations 4 × 20 m + flying 3 × 30 m, ≥ 3 min rest, its own day or ≥ 3 h from endurance), `aerB` (60-min steady-hard run at 10K-pace + 8–12%), `hike` (replaces z2long on week 2 of each block). Strength pillar weak → existing strengthC. Rest/endurance separation rules unchanged.

## (e) Import order (v2.1+, from R §Import formats)
1. **Hevy CSV** — low effort, maps to the same e1RM pipeline; headers unconfirmed by R → get a real export before coding.
2. **Garmin FIT** — medium; `@garmin/fitsdk` runs in the browser [26]; must be vendored into index.html (no CDN), so check its size first; gives per-second data → real best efforts for critical speed and 60 m/400 m splits (still labelled proxies).
3. **Apple Health XML** — high; 200 MB–1 GB+, needs a streaming parse in a Web Worker [17]; defer until FIT ships.
TrainingPeaks stays unresearched.

## (f) v2.1 acceptance
Fixtures: `fixtures/backup-schema1.json` (a v2 backup with two assessments incl. 400 m, 5K, grip, push-ups, z2Min and a program) and `fixtures/agegrade-cases.json` (≥ 10 cases: 60 m, 400 m, 5K, 10K, half, M/F, ages 35–75).
Unit tests: age-grade % for every case matches a hand computation from the embedded published factors within 0.05 pt (the lead spot-checks 3 cases against an online WMA calculator at acceptance and reports any gap); **regression: every stored assessment in backup-schema1.json has identical thr and ana scores before and after the migration**; sprint and aer scores equal their age-graded % exactly; Naismith ratio and the hike "too short" rule; the re-score mapping table above field by field; composite weights; schema-1 backup → migrated scores with sprint/aer/hike = no data; noise gate for sprint (hand vs video MDC); program contains sprintB/aerB/hike when those zones are weakest. Existing v1/v2 tests updated only where zone ids change (each change listed in the commit).
Staging walk-through (browser smoke, clicks named in SMOKE-OK): restore `backup-schema1.json` → migration card blocks → Download backup fires → Continue → curve shows 7 new zones, 3 "no data", Strength pillar card with grip + push-ups → enter a 60 m (video) + a hike → scores and "observed effort, no published norms" label appear → block targets show sprint as trend-only → generate program → reload persists → export shows schema 2.
