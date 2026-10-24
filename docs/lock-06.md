# LOCK 06: corroborated recovery of the observed descending ball

## Evidence

The October 24 COUNT 06 / LOCK 05 phone attempt shows 15 reviewed visible bounces and displays 13 accepted reps. The first contact near 1.92 seconds and sixth near 7.57 seconds were missed. In both places the raw detector supplied ball-sized candidates near the floor that identity tracking rejected. Around the first miss there is a 274 ms capture gap; across the active round the largest observed capture gap is 292 ms. Around the sixth miss there are missing/weak proposals before the near-floor candidates. This recording does not establish that slow cadence alone caused the misses.

The first miss subsequently produced an above-knee false turn at 2.193 seconds, which the control validator rejected. There are 14 proposals, 13 accepted reps, one rejected proposal and no pending proposals. It is incorrect to describe this as two valid bounce proposals rejected by the rep validator.

## Correction

LOCK 06 keeps COUNT 06 and adds an experimental identity-recovery option. A single distant detection cannot establish recovery. Two consecutive existing detector proposals must corroborate the same calibrated, descending ball, within strict limits on elapsed time, size, lane, direction, displacement and confidence. An ambiguous pair cannot establish recovery. The option cannot bypass similarly sized remembered background objects. Upon recovery, velocity comes from the two observed proposals, rather than treating the entire unobserved displacement as one frame of motion.

No detector output is invented. The existing bounded counter interpolation, floor, knee, amplitude, hand-return, deadline and mishandle checks remain unchanged. The experimental live initialization enables the same recovery option exercised in replay. The ordinary live route remains unchanged. New evidence metadata retains COUNT 06 and identifies LOCK 06.

## Verification and limits

All 1,206 Node tests pass. The added checks cover first-contact recovery, ambiguity, small background objects, large objects, spatial/temporal caps, holds, direction, uncertain/weak corroboration, malformed data and clock values. Eight earlier saved traces retain every accepted timestamp and validation path.

The new attempt retains every one of its prior 13 accepted events and gains contacts at 1.920 and 7.566 seconds: 15 proposals and 15 accepted events, with one event per reviewed contact window. Four recorded selections change: frames 2152, 2153, 2154 and 2259.

The evidence log discarded 146 initial setup frames after a long setup. All 544 counter inputs are retained in order. Counter-only replay exactly reproduces the saved 13 accepted timestamps. Identity replay starts from retained setup, not the unknown complete original identity state; its baseline nevertheless reproduces all 426 active/review selections and all recorded accepted events. The regression helper explicitly labels this limitation and the standard exact-replay checker still refuses dropped-prefix logs. These are cached-detection measurements, not fresh model inference or a physical-phone test of LOCK 06.

Known earlier weaknesses remain: for example the older partial fast trace stays at 11 accepted reps. This is a targeted correction, not a claim of general accuracy across drills, devices, players or environments. A Mac build and a new short phone check are required before treating LOCK 06 as live-validated.

## Install and check

After installing the package:

```bash
node --test tests/*.test.mjs
npm run build
```

To inspect just this correction's tests:

```bash
node --test tests/corroborated-continuity.test.mjs tests/lock06-replay.test.mjs
```

The package creates backups, refuses conflicting local edits and does not commit or deploy. Once deployed, use the experimental `iphone-fresh-frame-test` route and confirm COUNT 06 / LOCK 06. Start with one slow round; save the original video and matching test details. No additional recording is needed before installation and deployment.
