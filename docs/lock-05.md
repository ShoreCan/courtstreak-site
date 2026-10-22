# LOCK 05: preserve a strong observed ball over a smaller background object

Baseline: deployed COUNT 05 / LOCK 04, commit `710d456294c833e865793b4ec8dd7c2ab5104483`.

## Observed failure

The Oct 22 COUNT 05 recording was reported as 25 physical dribbles and displayed 24. The complete numeric replay reproduces 24 accepted events from 25 proposals, with every recorded ball selection matching (970/970). Nothing was discarded from the log.

The missing event follows the twentieth accepted bounce and is the twenty-first reviewed video contact, around 9.6 seconds. At frame 679 / 9.621 seconds, the model supplied a confidence-0.951 ball candidate centered near `[832, 1882]`, diameter 192.4 pixels. The previous selected center, 38 ms earlier, was near `[832, 1697]`, diameter 193.1. It was rejected because it overlapped a remembered background object centered near `[807, 1858]`, diameter 58.8. Its location is near the player's feet; the numeric log does not label its physical identity.

The existing timed-gap exception did not apply to this normal 38 ms interval. Without the floor observation, interpolation and the later rise yielded a weaker proposal at 9.654 seconds: descent 1.244 ball diameters, below the existing recovered-bounce validation minimum 1.25. That proposal was eventually rejected as a mishandle despite a visible return to the hand. This diagnosis does not require lowering that threshold.

## Change

The experimental ball tracker can preserve one high-confidence, size-consistent observed continuation across a *much smaller* remembered background object. Requirements:

- Existing owned track, no intervening misses, at least eight prior selected observations.
- A finite positive observation interval of at most 100 ms.
- Existing meaningful vertical velocity, and movement in that direction.
- Detector confidence at least 0.5; valid finite box and score.
- Diameter within 80–120% of the last observed ball; the original calibration-size gates still apply.
- Lateral movement within half a diameter (28 px minimum), total movement within 1.25 diameters, and meaningful vertical movement of at least 0.35 diameter.
- Exactly one eligible candidate. Two plausible candidates do not establish identity.
- Background object diameter strictly below 75% of candidate diameter.

All ordinary size, lane, jump and scoring checks still run. Ball-sized background objects retain their veto. Setup/countdown and ordinary tracking defaults do not enable the exception. The experimental component enables it and logs COUNT 05 / LOCK 05. Samples are observed model outputs; no new ball position is invented.

No counting, floor, amplitude, hand-return, knee, timer, camera, model, subscription, SQL, XP or role behavior was changed. The existing COUNT 05 time window remains unchanged.

## Validation

**708 automated checks pass**, including all 671 preceding checks plus 28 helper/integration checks and nine replay checks. Production build passes.

- Latest recording: 24 → 25 accepted events, with one event per 25 reviewed contact windows and the recovered contact at 9.621 seconds.
- Recorded crop decisions still match; frame 679 is restored.
- Previous seven distinct traces retain counts 20, 20, 20, 11, 15, 20 and 17. Some newly preserved detections move event timestamps; ordered shifts remain below 0.22 seconds, rather than requiring exact timing equality.
- Prior tests cover slow, medium and fast synthetic cycles, scale and sample-rate variation, holds, missing observations, hand return and deadlines.
- New helper tests reject stale/missing timestamps, reacquisition, weak/nonfinite confidence, opposite motion, lateral jumps, wrong size, stationary noise, ambiguous balls and ball-sized background objects.

The video contact-sheet frame search used an orange mask only to locate frames for visual review. It is not the live tracker and was not used to generate runtime scores or train the model. Contact times are approximate review windows (±0.22 seconds), not exact exposure synchronization. The first twenty and final four events were checked in order as well as the missing middle contact. The video also shows the existing delayed live acceptance display; the patch does not backdate that display.

## Limits

This is an offline replay on cached model detections and poses, coupled with video review. New live phone accuracy, performance and unseen users/backgrounds have not been measured. This recording is now a development regression, not an independent holdout. The older partial fast trace still undercounts at 11; this patch is not a complete fast-dribble solution.

Selecting a candidate on most frames is not proof that each selection is correct or that every floor turn was captured. Ambiguous or missing evidence must not be resolved by forcing the user's reported total.

## Reproduce

```sh
node --test tests/*.test.mjs
npm run build
node scripts/replay-ball-lock.mjs tests/fixtures/ball-lock/oct22-count05-fast25.json
```

The replay CLI compares deployed LOCK 04 settings with LOCK 05 using the same saved inputs.
