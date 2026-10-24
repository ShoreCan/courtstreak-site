# LOCK 07: recover a strong observed ball at the visible feet

## Reviewed failure

The October 24 maximum-speed attempt contains 15 controlled right-hand pounds at approximately 2.17, 2.53, 2.90, 3.30, 3.70, 4.07, 4.47, 4.87, 5.23, 5.63, 6.03, 6.43, 6.83, 7.23 and 7.63 seconds in the original camera video. Timing tolerances account for camera-recording startup and 30 fps source sampling. The full evidence retains all 1,079 input records with no discarded prefix. COUNT 06 / LOCK 06 replay reproduces every recorded ball selection, crop and the four accepted event timestamps exactly.

At elapsed 2.213 seconds the detector already supplies a strong ball proposal (confidence 0.82) near the feet, but a 131 ms capture gap produces a displacement larger than the tracker's speed envelope permits. The tracker discards that observation and loses the first floor contact. A later, shallower turn at 2.310 seconds becomes a bounce proposal but fails return-amplitude validation. The counter nevertheless retains that provisional peak as its separation reference, blocking ten following genuine contacts until the ball returns sufficiently high. Only the final four are accepted.

A diagnostic change to peak separation recovers 14/15 using the existing selections. That counting change is **not included** here. LOCK 07 addresses the initiating identity failure; with the actual first floor observation retained, the false intermediate proposal does not arise in this trace. The broader provisional-peak dependency remains a known issue if another identity failure creates a similar false proposal.

## Targeted correction

The opt-in `floorContinuity` path considers only an existing detector proposal. It requires calibrated identity, a recent observed descent, a capture gap of 80–180 ms, confidence at least 0.75, matching size, a narrow horizontal continuation, a bounded vertical displacement, two confidently visible ankles and a candidate within a bounded region around their height. Two eligible candidates cause refusal. It cannot invent a ball position, bypass a similarly sized remembered background object, count a bounce itself or relax any control-validation threshold.

The experimental live tracker enables the option at initialization and every machine reset. Evidence identifies **COUNT 06 / LOCK 07**. COUNT 06's bounce, interpolation, knee, hand, deadline and mishandle rules are unchanged. The ordinary route keeps the option disabled. Cached-input replay accepts the same explicit option.

## Validation and limits

- New fast trace: 15 proposals, 15 accepted contacts, one per reviewed bounce; all four previous accepted contacts retained. Only frame selections 665 and 666 change. Crops remain identical, so the replay consumes the same supplied detector inputs.
- Eight earlier complete logs plus today's successful slow and normal logs: accepted timestamps, validation paths, proposal totals, selections and crops unchanged. Preserving older behavior also preserves known older errors.
- Unit and regression checks cover holds, ascent, timing/size/spatial limits, confidence, ambiguity, uncertain ankles, invalid data and missing hand control. A selected ball with no verified hand return still earns zero accepted reps.
- These are cached-detection and pose replays, not fresh model inference on the original video and not a new live device result. The original video supplies independent bounce review.
- No changes to model weights, camera processing speed, subscription access or unrelated drills. No claim of overall maximum-speed reliability, device parity or pilot readiness.

## Install and verify

Use the package installer in the existing project, then run:

```bash
node --test tests/*.test.mjs
npm run build
```

The installer checks exact pre-update file hashes, backs up changes, supports rollback and does not commit or deploy. After deployment, confirm **COUNT 06 / LOCK 07** before a short maximum-speed check. Do not record another attempt before the update is deployed.
