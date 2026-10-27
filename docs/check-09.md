# CHECK 09 candidate: retain the observed fast floor ball

## New saved-video evidence

The shortened October 26 fast trial displayed 31 reps before tracking stopped at
15.195 s. Ordered visual inspection of its saved camera frames identifies 37
completed dribble cycles before the result card; the last completes its return
by approximately 15.02 s. Some floor contacts are bracketed between sparse frames,
so these are reviewed cycles rather than exact contact timestamps. A new descent
at the end has no recorded completed return and is not included. Footage after
the cutoff was not supplied and cannot be counted.

Fresh inference using the published ball and pose models reproduces 36 accepted
cycles with LOCK 09. At 12.813333 s the model returns a .967386-score basketball
near the visible feet. Background memory rejects it near a smaller remembered
object. With the live .0001 proposal threshold, the selector chooses a .000103
box near the body instead. The missed floor sample prevents the 32nd cycle from
being confirmed. This is a selection problem, not a need to lower rep thresholds.

## Change: LOCK 10

The existing floor-continuation proof gains an opt-in path for a 60–80 ms interval
between observed balls. It requires an already calibrated, uninterrupted track,
two strong preceding detections, measured downward motion, consistent ball size,
a tightly bounded displacement and horizontal position, both visible feet, and
one unambiguous floor proposal with score >= .9. It can cross only a remembered
object smaller than 75% of the ball. Comparable/larger objects retain their veto.

This path only exempts that small-object background veto. It does not widen the
ordinary jump/prediction envelope, invent ball coordinates or bypass the other
identity gates. The normal floor and controlled-return validation still decides
whether the rep counts. Existing low pounds retain their counting rules; the
new motion bounds are an additional identity proof, not a minimum dribble height.

COUNT 08, FRAME 02, model files/input sizes, proposal thresholds, pose scheduling
and replay/export behavior remain unchanged. No additional inference or frame
queue is introduced. The tracker retains confidence with its existing bounded
32-observation history. Historical LOCK 02–09 configurations remain reproducible.

## Comparison

Six uploaded videos were decoded for fresh ball/pose inference. Analysis copies
preserve every original presentation timestamp and frame count; FFprobe verifies
zero timestamp differences after conversion. Source frame counts, including
result cards where present: 213, 278, 299, 660, 600 and 660.

| Source label | Original display | Fresh LOCK 09 | Candidate LOCK 10 |
| --- | ---: | ---: | ---: |
| Shortened fast 31 | 31 | 36 | 37 |
| Faster 25 | 25 | 25 | 25 |
| Earlier 19 (`test-details 2`) | 19 | 20 | 20 |
| Successful 30 | 30 | 30 | 30 |
| Native original 20 | 20 | 20 | 20 |
| Missed-rep 19 (`test-details 3`) | 19 | 20 | 20 |

The cohort audit uses the ordinary .008 output cutoff; the critical fast clip is
also rerun with the exact .0001 live continuation cutoff. Both fast comparisons
are 36 -> 37 with exactly one changed selection and zero changed requested crops.
The other five fresh-video selections/counts are unchanged by the candidate.
All 36 prior fast confirmations are retained. The new confirmation uses the
already detected floor ball at 12.813333 s and the same control validator.

The difference between the original 31 and offline 36 is not attributed to this
new rule: offline processing reads every available video frame without the old
live throughput failure. The isolated new tracking gain is one reviewed bounce.

Separately, replaying all six original JSON logs under the candidate preserves
their original selections, crops and accepted event times, including the partial
31. No rep is fabricated where those old observations lack the needed floor ball.

## Verification and limits

All 1,761 tests and the production build pass.

The new regression fixture contains fresh fast-video detections at the live
proposal cutoff, poses, and an original pre-Go state snapshot. It verifies the
36 -> 37 correction, one selection change, preserved prior events and identical
crops. Adversarial tests cover missing/stale approach evidence, weak/ambiguous
proposals, stationary/upward motion, size/lateral/displacement changes, unavailable
feet, setup/countdown, interrupted tracks, comparable background objects and the
unchanged ordinary prediction envelope.

These are offline evidence checks. The uploaded counted videos are compressed
464x960 copies, not original camera pixels. H.264 analysis conversion adds another
encoding step; timestamps are preserved, not lossless pixels. Pose inference uses
a deterministic 250 ms media-time schedule, seeded from original calibration,
rather than the live independent-worker schedule. No real-time frames are skipped
for processing cost and no live watchdog is exercised. Native 20 source rotation
is applied before analysis. The result does not establish Apple-device maximum
speed, power use or a physical-device zero-miss guarantee.

CHECK 08 remains the deployed baseline until this candidate is applied/deployed.
