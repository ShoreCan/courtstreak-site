# COUNT 05 / LOCK 04: checks across dribble speeds

This experimental update follows COUNT 04 / LOCK 04. It does not replace the ball model or claim that fast-dribble tracking is solved.

## Verified fixes

1. Fixed-frame motion windows could contain too little of a slow bounce at higher sampling rates. A synthetic eight-bounce sequence with a 1.6-second cycle at 30 FPS produced zero proposals under COUNT 04. COUNT 05 produces eight.
2. The compact `[1, N, 6]` detector-output decoder admitted `NaN` and positive-infinite confidence. Two new rejection tests failed before the guard and pass afterward. This was discovered with injected malformed output; it was not observed in a user's recording.

The experimental counter retains the original eight-frame minimum and additionally waits for 0.5 seconds of captured motion before evaluating a possible bounce. Its motion window expands to include samples within 0.5 seconds on each side; it never shrinks the original window. This preserves low-rate behavior and uses more measured evidence for slower bounces at higher rates. Amplitude, rearming, floor, hand-return, knee, deadline and ball-identity gates remain unchanged. No ball position is invented by this new window logic; pre-existing bounded gap interpolation remains unchanged.

The experimental iPhone entry point enables this option both at initialization and countdown reset. The ordinary counter path keeps the default option disabled. The finite-confidence decoder guard applies to both paths and leaves valid scores unchanged. The UI and saved metadata show COUNT 05 / LOCK 04 in the experimental route.

## Validation

The full Node suite contains **671 checks**, all passing: the original 170 plus 501 added checks.

- 300 combinations of known synthetic bounce cycles: 10/15/20/24/30 observations per second; 0.25/0.4/0.8/1.6/2 seconds per bounce; three spatial scales; two sampling phases; clean and noisy positions.
- 45 scenarios covering holds, restart after a two-second pause, mixed speeds and irregular cadence.
- 20 missing-observation scenarios checking that surviving events map to distinct known contacts. These deliberately do not require recovery where evidence has been removed.
- Seven saved-trace comparisons require identical accepted event times and validation paths before and after the time-window change, not just identical totals.
- One explicit before/after slow-motion failure reproduction.
- 110 integrated counter-and-validator checks: controlled returns, absent poses, absent hand returns, above-knee motion, vanished balls, and deadlines.
- 18 detector-decoding checks: invalid scores/boxes, wrong classes, camera-crop coordinate mapping, overlapping duplicate proposals, and separate balls.

Synthetic contact timing uses the known cycle centers. With injected positional noise, a small bounded timing tolerance is allowed (10% of the cycle plus 1.6 sample intervals); tests require one ordered event per cycle, not exact noiseless timestamps. This is not video annotation or a physical-camera measurement.

The seven saved traces retain 20, 20, 20, 11, 15, 20 and 17 accepted events. Every accepted timestamp and path is unchanged. Their recorded crop decisions also match. The 15-, 17- and newest 20-contact reviewed recordings retain their previous video-matched result through this equality check. The older partial fast trace remains an **undercount at 11**.

Production build passes. No new packages, models, database changes or deployment steps are part of installation.

## Responsiveness

Proposal evaluation waits for at least 0.5 seconds after a candidate contact, and at least eight future observations. At 30 FPS this adds roughly 0.23 seconds compared with the original eight-frame delay; hand-return confirmation may add further time. Synthetic tests bound proposal delays; no iPhone processing-latency claim has been measured. The existing two-second end-of-round review remains unchanged.

## Remaining fast-recording weakness

Replaying the older partial fast trace with the current identity options selected a candidate on 88 of 89 active observations. There were 11 proposals and 11 accepted events, with no pending or rejected proposals at the end. Therefore hand-return rejection is not the immediate reason for the remaining misses in that replay.

Some observed turns are too shallow to establish the floor bounce under the existing safeguards. For example, the observed interval from 4.636 to 4.878 seconds spans approximately 242 ms, and the latter ball center is around y=1482 rather than the approximately y=1760–1800 centers seen at several accepted contacts. Selection coverage does not prove that the camera captured each bottom turn or even that each selected candidate is correct. The present replay alone cannot disambiguate every missed contact, so the floor/amplitude thresholds were not loosened to force a target total.

Model detections and poses in saved-trace checks are cached. No new detector execution over original video pixels, model training, live iPhone/iPad test, independent holdout evaluation or accuracy guarantee has been performed. The new counter behavior has only been validated offline. Do not market AI counting as reliable across all speeds on the strength of these tests.

## Reproduce

```sh
node --test tests/*.test.mjs
npm run build
node scripts/replay-ball-lock.mjs tests/fixtures/ball-lock/oct22-lock03-slow15.json
```

The replay command compares COUNT 04 counter settings with COUNT 05 settings using the same saved model outputs. Never infer a video's true bounce count from its filename or its displayed counter total.
