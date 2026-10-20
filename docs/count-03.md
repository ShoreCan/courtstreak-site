# COUNT 03 — recover a floor contact skipped between processed frames

Decision: **KEEP as a bounded camera-lab candidate for a device retest.** This is one counter correction supported by an exact replay of an actual phone trace. It does not establish general accuracy or parity across devices/movements.

Starting publication: `771b2f6c3ba7b10b5f6bf2e6421884af876be395`, source tree `1ffd32e3ac28580080dd8dc8d84fba56aee25a31` (CONTROL 02 / VIDEO 01). The candidate header becomes COUNT 03 / VIDEO 01; diagnostic metadata retains CONTROL 02 for the physical-hand correction and identifies COUNT 03 as the tracker revision. The baseline-source metadata is updated to the actual starting publication.

## Exact cause on the development clip

The source video was manually reviewed before examining the phone log: 20 real right-hand bounces, later held-ball movements, and a displayed final count of 19. The unmodified counter reproduces the phone's 19 accepted events and its two above-knee rejections exactly, using all 522 counter updates from the saved 1,038 inference records. The phone log SHA-256 is `6aa3338f0a20dca3d5a99e7b7ddaac3800ea90bb8a66bd708d9fc2c73033931c`.

The twelfth physical bounce generated no proposal. At elapsed 5.979s the selected ball center was y=1678.23; the next captured input was at 6.070s, y=1638.21, after a 91ms interval. The adjacent sample intervals were 30ms and 35ms. The detector had a selected ball in every nearby processed frame; none captured the lowest part of this bounce. This is a sampling-gap miss, rather than an event rejected by the hand or above-knee checks. No alternative proposal was selected during this segment.

The observed down/rise extents were 1.417/1.468 ball diameters, short of the existing clean-bounce requirements. The established floor center was y=1846.56, based on 11 earlier controlled contacts. The nearest observed point was too high for the existing floor-anchor tolerance. The counter only reconstructed null detections; it did not recognize a longer interval between two valid detections.

## The scoped change

Extend the existing floor-anchored route to a longer capture interval, with these prerequisites:

- An established, stable floor reference from at least six existing clean controlled contacts.
- Four actual observed samples bracketing the interval, showing measured downward and upward segments. Reconstructed samples cannot supply these segments.
- An interval no longer than 150ms and longer than 1.5 times both adjacent intervals.
- The intersection of those segments lies strictly inside the interval and within the unchanged floor-position tolerance (0.45 ball diameters).
- All existing size, observed-fraction, movement, right-hand return, body-position and above-knee checks still pass.

The added contact is explicitly marked `sampling_gap_contact.kind=estimated_between_observed_frames`. Raw detections and selected ball positions remain unchanged. This is an estimate of an unobserved turnaround, not direct visual proof of floor contact. There is no assumed rep cadence, target-count adjustment or forced increment.

For this bounce the intersection is y=1794.03 at 6.002821s, within the existing floor tolerance. The candidate adds only that event, preserving the timestamps of all 19 existing accepted events. Both held-ball proposals at 16.923s and 17.656s retain `rejected_above_knee`.

## Controlled results

| Evidence | Before | COUNT 03 | Scope |
|---|---:|---:|---|
| Current phone trace, 20 reviewed bounces | 19 matched, 1 missed | 20 matched, 0 missed | Development; manual contact bracket + 0.10s, one-to-one matching |
| Current held-ball segment | 0 extra counts | 0 extra counts | Both actual fake proposals rejected |
| Preserved 30-bounce reference | 30 matched, 0 extra | 30 matched, 0 extra | Evaluation; existing 0.18s tolerance; processed-frame recording |
| Earlier phone clip, all 600 recorded frames | 20 matched, 0 held-ball extras | Unchanged | Evaluation; cached offline detector observations, not phone frame cadence |
| Earlier phone clip, 15/s schedule | 20 total, 18 within strict timing tolerance | Unchanged | Two late real-cycle events remain outside tolerance |
| Earlier phone clip, 10/s schedule | 5 matched of 20 | Unchanged | Severe low-rate misses remain unresolved |
| Ten archived traces | 70 accepted events | Same 70, no additions/removals | Incomplete labels; retention does not establish accuracy |

Development and evaluation inputs remain separate in the evidence package. No model inference was rerun for this counter comparison. Both versions use identical saved detections, selected balls, pose coordinates, frame selection and timestamps. Detector-proposal recall, localization and inference speed were not measured or improved by this change.

All 48 automated checks pass (38 existing plus 10 sampling-gap checks), and the production build passes. The pre-existing court-hero.jpg warning remains. New checks cover both sides of the gap, shallow uniform motion, overly long gaps, absent/unstable floor calibration, incompatible estimated height, above-knee motion, missing hand evidence and reconstructed input samples.

Detector weights/configuration, preprocessing, confidence thresholds, crop selection, ball selection, pose mapping, setup/countdown, validation rules, recording and video export are unchanged. The counter path and its version/diagnostic label are the only runtime changes. No dependency, new model, API or paid service is added; no offline Mac-pilot engine is integrated.

## Practical limits and next experiment

The additional event comes from the development clip, so its 20/20 replay is not an independent accuracy estimate. Evaluation cases show no regression in the checked data. Extrapolated floor contact can still be wrong on unseen trajectories, camera movement or near-floor fake movements; those are not proven safe by the above-knee negatives. Missing early bounces before floor calibration, severe undersampling and other dribble movements remain unresolved. The remaining frame-based lookahead/expiry behavior is unchanged. No new actual iPhone/iPad/Mac run has been performed by this environment.

Next: publish this candidate, confirm COUNT 03 / VIDEO 01 on the same phone, repeat one 20-fast-dribble round followed by above-knee held-ball dips, and save its counted video plus matching test-details JSON. Compare actual missed and false events against this frozen test. The target is 20 real reps and zero fake additions; it is a test target, not a guarantee. Camera-lab results still do not award XP or alter Circle standings.
