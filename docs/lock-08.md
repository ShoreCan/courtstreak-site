# LOCK 08: retain observed fast floor turns

## New live test

The October 24 COUNT 06 / LOCK 07 recording contains 35 reviewed right-hand pounds; the live result is 33. The supplied counted-video export has 300 frames and does not contain the exact original live input pixels. Its floor turns were reviewed independently from the displayed count. The JSON retains all 839 detector/pose input records with no dropped prefix. LOCK 07 replay reproduces every selection, crop, 34 bounce proposals and all 33 accepted timestamps exactly.

The empty reviewed contact windows are bounces 14 and 28 (approximately 7.6 and 13.8 seconds in the export). During the active round, saved captures average approximately 20.4 observations/second, with a maximum gap of 271 ms. The median capture-to-confirmation delay is 493 ms and the maximum is 733 ms. These are log measurements, not screen-paint latency or the camera's native frame rate.

## Causes and correction

Both misses already have strong detector proposals. At elapsed 7.450 seconds, confidence is 0.958. The last selected observation was ascending toward the hand; its prior interval was 170 ms, so LOCK 07's short descending-continuation conditions refuse the next floor turn. At 13.732 and 13.760 seconds the proposals have confidence 0.943 and 0.958, but remembered background records near the floor veto the observed ball. The resulting partial trajectory generates a proposal at 13.701 that fails the above-knee safeguard. The player's actual floor bounce should be recovered rather than disabling that safeguard.

The opt-in `turnContinuity` option adds two bounded proofs:

1. A strong observed return near the feet can follow an observed ascent ending near the right wrist, provided recent selected-ball history contains a matching floor position and size. This path requires confidence at least 0.9, calibrated lane/size, a bounded capture gap, confidently visible feet and hand, and one unambiguous candidate.
2. Two strong, distinct detector proposals may establish substantial downward motion near the feet. Both require confidence at least 0.9, tight size/lane agreement, a short interval and bounded displacement. This measured motion can cross a remembered object of comparable size. Stationary corroboration cannot enable that bypass; substantially larger background objects retain their veto.

No new ball positions or model predictions are invented. The option only selects existing proposals. Live experimental initialization and all machine resets enable the same option tested in replay. This identity correction was tested with COUNT 06; the combined package also includes COUNT 07's separate controlled-low-pound path, documented in count-07.md. Its live evidence identifies **COUNT 07 / LOCK 08**. The ordinary tracker route leaves both new options disabled. LOCK 08 itself does not alter the counter or control thresholds.

## Results and limitations

- New round: 35 proposals and 35 accepted events, exactly one in each reviewed contact window. The two added floor contacts occur at capture elapsed 7.450 and 13.760 seconds. Five existing contacts shift by 67–96 ms within their original windows; none are lost. No counts are added during the held-ball ending.
- Under COUNT 06, eleven earlier complete logs retain all accepted timestamps, paths and proposal totals, including the successful slow, normal, earlier 15-bounce fast attempt and the older 25-contact fast trace. Under COUNT 07, those logs retain all accepted timestamps and paths; additional low proposals may be rejected without changing scores. Known old errors remain preserved.
- Safeguard checks include holds, absent control, uncertain feet or wrist, ambiguity, insufficient history, stale or reversed timing, mismatched size/lane/floor position, stationary corroboration and larger remembered objects. A selected ball without a verifiable hand return earns no accepted reps.
- This is cached-detection/pose validation plus independent video review. There has been no model training, fresh inference on the original source video or physical iPhone/iPad validation of LOCK 08. Neither update increases camera processing speed; live confirmation timing still needs verification.
- The previously documented provisional-peak dependency in COUNT 06 remains a separate known weakness. This identity correction prevents the reviewed floor detections from being discarded; it does not establish general accuracy across drills, devices, players or environments.

## Install and check

Use the package installer in the current LOCK 07 checkout, then run `node --test tests/*.test.mjs` and `npm run build`. The installer verifies exact prior hashes, creates a rollback backup and does not commit or deploy. After deployment, confirm COUNT 07 / LOCK 08 before another phone check. No new filming is needed before deployment.
