# LongevityMaxxing

Raise the whole curve.

LongevityMaxxing is a single-page fitness tracker built around one idea from the "forever athlete" model: fitness is a curve of effort against duration, from a one-second broad jump to a six-hour hike, and the goal is to raise the whole curve, not one end of it. Your total capacity is the area under that curve.

## The seven zones
| Zone | Test | What it stands for |
|---|---|---|
| Explosive power | standing broad jump | the first second |
| Absolute strength | 5-rep trap-bar deadlift (+ dead hang for grip) | the first ten seconds |
| Anaerobic capacity | 400 m run or 500 m row, all out | one to two minutes |
| Muscular endurance | push-ups to failure | a few minutes |
| VO2max | 2K row or 12-minute run | seven to twelve minutes |
| Lactate threshold | 5K time trial | twenty to thirty minutes |
| Cardiovascular endurance | weekly zone-2 minutes and a long effort | hours |

Plus a daily ten-minute stability block that is practised, not scored.

## How it works
1. Test each zone. Where population norms exist (VO2max, grip, push-ups) you get an age- and sex-matched percentile; elsewhere you score against your own baseline.
2. See the curve, your composite score, and the zones that sag.
3. Get block targets for the next 8 to 12 weeks. Targets are gated by each test's measurement noise, so the app never calls noise progress and never invents a per-workout VO2max number.
4. Generate a 12-week program (three 4-week blocks with deloads) that gives the weakest zones extra sessions, keeps power work away from endurance work, and turns each block target into today's session dose.
5. Log sessions. Everything lives in your browser (localStorage); nothing is uploaded.

## Evidence
Pillars, norms, improvement rates and noise thresholds come from a cited research pass (cardiorespiratory fitness, grip and lower-body strength cohorts; interval-training, strength and detraining literature; concurrent-training meta-analyses). Fitness measures here are associated with longer life; the app does not claim they cause it. See `docs/SPEC.md`.

## Lineage
Spun off the SwoleQuest engine (session logging, timers, progression, charts). New content, new theme, new storage keys (`lmx.*`).

## Status
v1 in progress. Built on Colossus; hosting will move to GitHub when the owner decides.
