# Camera Test23 — Tracking Repair 01

6 November 2026. Candidate branch: `codex/tracking-repair-20261106`.

This candidate fixes specific failures demonstrated by the Test22 recordings.
It is not a customer reliability certification, a new trained detector, or a
measured live-iPhone speed improvement. Existing Test20/22 routes retain their
counting and observation policies.

## Changes

| Observed cause | Implemented correction | Evidence and limit |
| --- | --- | --- |
| Ball pixels are captured before waiting behind a body-model submission. | In the GPU candidate, capture and preprocess ball pixels when the shared submission queue admits the ball job. Record the actual capture time and ROI. | Mocked GPU tests check delayed admission, cancellation and orientation changes. Actual Apple GPU runtime remains to be checked. |
| Body requests compete with ball work even between hand receipts. | During a round, request body refresh near the hands or at a bounded interval, with only one pending request. Keep the existing 80 ms setup request interval. | Scheduling tests pass. This changes work admission, not model size; a live FPS gain is unmeasured. |
| Old wrist positions can falsely suggest a receiving hand. | During counting, mask wrists older than 120 ms relative to the ball capture; retain a body/feet anchor up to 300 ms. Never invent wrist coordinates. | Applying the guard to these saved observations preserves the candidate's three recovered events and all original accepted events. Future scheduling produces different inputs and requires a phone test. |
| Short controlled pounds fail fixed minimum-travel and torso-region gates. | COUNT09 adds a path using measured pre-Go movement noise, observed down/up motion, floor evidence and right-hand control before and after contact. Its hand proof can be outside the torso region. | Synthetic low contacts at 15/20/30 Hz pass; held, airborne, wrong-hand, ambiguous-hand and post-bounce jitter controls do not add reps. Floor/hand proof is still required. |
| A 174 ms sampling interval hides an already learned floor contact. | Permit a bounded floor estimate across intervals up to 300 ms, using four real observations and existing floor, size, motion and control checks. Label it as estimated between observations. | Recovers the outdoor event at 14.342 s. This does not interpolate invented detector frames or accept arbitrary gaps. |
| A short gap after a crossover floor observation resets a valid transfer. | CROSS12 preserves the unchanged CROSS11 primary counter and adds an isolated, bounded receipt check for the same observed floor and opposite hand. Deduplicate the same contact. | Adds the 12.124 s floor event while preserving every original accepted event. A direct global gap relaxation was rejected because it changed other events. |
| Proposal expiry depends on processing frequency; missing proof is called a mishandle. | COUNT09 uses a half-second proposal expiry and records the failed checks for unverified proposals. | Lack of tracking proof is not treated as proof of a player error. |
| Inference timing includes waiting for another model. | Export queue wait, runtime-call duration and readback/decode time separately for both models. | Runtime-call duration is not a pure GPU-kernel timing measurement. |

## Exact saved-input comparison

`scripts/diagnostics/check-tracking-repair.mjs PRIVATE_INPUT_DIRECTORY OUTPUT_DIRECTORY`
reproduces the original Test22 count timeline and accepted records before
comparing the candidate counters and wrist guard. Original selected balls,
poses and capture/decision clocks are retained. The detector and ball identity
selection are not rerun by this comparison.

| Recording | Original count | Candidate count | Original accepted events preserved |
| --- | ---: | ---: | ---: |
| Indoor right-hand pound | 18 | 19 | 18/18 |
| Outdoor right-hand pound | 33 | 34 | 33/33 |
| Outdoor crossovers | 27 | 28 | 27/27 |

The three added sequences were visually reviewed in the matching recordings:
indoor floor event 8.832 s; outdoor estimated floor event 14.342 s; crossover
floor 12.124 s with receiving-hand evidence at 12.472 s. Video/log alignment is
approximate. These displayed counts are not independently established complete
ground-truth totals. No full-session recall or precision percentage is claimed.

## Tested and rejected

The same ball model ran in local-only browser WebAssembly on 24 paired frames
decoded from the original recordings. A tighter wrist-to-floor crop improved
some outdoor/crossover detections but worsened multiple indoor frames. It is
kept as a diagnostic function and is not used by the live candidate. Model
scores do not establish accuracy, and desktop WebAssembly time is not iPhone
WebGPU throughput.

Broad floor tolerances and broad amplitude relaxations were also rejected:
earlier negative controls counted airborne movements. Removing proof gates to
increase totals would conceal failures.

## Validation and remaining work

- 2,050 JavaScript checks pass; production build passes.
- COUNT09/CROSS12 and fresh GPU capture have focused positive and negative checks.
- Both Test23 drill routes render and link to one another in the local browser.
- Private recordings and diagnostic packets are ignored and excluded from the production build.
- A real front camera and Apple GPU are unavailable in this environment.
- No new live FPS, latency, thermal, recording, missed-rep or extra-rep rate has been measured.
- Blurred/occluded balls, incorrect boxes, wrist accuracy and new environments remain detector-quality limits. The model weights are unchanged.
- Shooting, additional combo recognition and a compiled native iOS app are outside this repair.

Before promoting this candidate to customer scoring, compare synchronized
original video and exported evidence on physical iPhones, at slow/medium/fast
pace in both orientations. Measure missed and extra events against independent
video labels, capture intervals, ball/pose ages, queue wait, sustained thermal
behavior and recording overhead. An increase in count alone is insufficient.

The separate experimental routes are `/tracker-tests/test23`,
`/tracker-tests/right-hand-pound-test23` and `/tracker-tests/crossovers-test23`.
Preparing or downloading this source does not update the hosted phone camera.
