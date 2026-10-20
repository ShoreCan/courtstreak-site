# PACE 01: space out body and wrist checks after slow inference

The COUNT 03 iPhone round reached 20 detected reps, then interrupted with
`Tracking became too slow to count reliably. This attempt is incomplete.`
The saved video still shows 9 seconds remaining. This is a throughput stop,
not a 20-rep target. It is not a completed successful round.

## Evidence and cause

- Starting live commit: `ba01ef0bf9d64f4b0a393e9c9d3a9d1cb9223d6a`.
- Starting source tree: `ec8c5b0d07e169ff3a180a702abd269815a6aab2`.
- Phone JSON SHA-256: `9f777c81935f3cb7dbb24ff683d6f4a3d9fc85f2363f0b37a04e74a6e1adebc9`.
- 450 recorded inference frames; 189 active updates, 187 with a selected ball.
  Ball coverage is availability of a selection, not counting accuracy.
- Last logged frame: 11.265s captured time, 8.114 tracking FPS, 20 accepted
  events, no rejected or pending events. The interrupting frame is not logged
  because the existing guard returns before evidence recording. Its exact FPS
  is unavailable; the exported message identifies the below-8-FPS guard.
- After 10s, 7 of 8 recorded passes included pose. Pose-inclusive work rose to
  roughly 172–209ms; recent ball-only passes took 50–70ms.
- The old scheduler waits 180ms from the pose's **capture**. A pose-inclusive
  pass taking at least 180ms consumes that interval, so another pose can run
  immediately. This amplifies load when processing slows. The original reason
  the device slowed (thermal state, GPU contention, etc.) is not established.

## Change

Wait the same 180ms **after a pose-inclusive pass completes** before requesting
another, while a person is retained. Intermediate frames still run ball
detection. If no person is retained, request pose immediately for reacquisition.
Keep the original capture timestamp for pose age and positioning checks; do
not present an old pose as newly captured. Add PACE 01 to the camera-lab badge
and test-details metadata.

Models, weights, preprocessing, confidence thresholds, crop, ball selection,
COUNT 03 bounce counter, physical hand mapping, wrist/knee validation, setup
rules, 20-second duration, recording and saved-video overlay are unchanged.
The 8-FPS cutoff, stall checks and ball-loss cutoff are unchanged.

## Validation

All 54 tests and the Vite production build pass. The existing unresolved
`court-hero.jpg` build warning remains.

Replaying the same cached ball and pose inputs gives identical proposals,
accepted events and rejected events before and after this change:

| Saved evidence | Counter updates | COUNT 03 before | PACE 01 candidate |
| --- | ---: | ---: | ---: |
| Current interrupted 20-rep phone log | 276 | 20 accepted, 0 rejected | Identical |
| Earlier 19-rep phone log, replayed with COUNT 03 | 522 | 20 accepted, 2 rejected | Identical |

The earlier phone actually displayed 19 on its earlier revision. Its 20 here
is the already established COUNT 03 offline replay, not a new phone result.
These fixed-input replays do not test changed live pose sampling.

Deterministic scheduling models reproduce pose saturation and exercise the
candidate. These are **simulations, not detector runs or device benchmarks**:

| Assumed per-pass costs, plus scheduling overhead | Original modeled FPS | Candidate modeled FPS |
| --- | ---: | ---: |
| Ball 50ms, pose-inclusive 200ms, overhead 2ms | 4.95 | 12.44 |
| Ball 70ms, pose-inclusive 209ms, overhead 2ms | 4.74 | 9.37 |
| Ball 70ms, pose-inclusive 209ms, overhead 17ms | 4.42 | 7.50 |
| Ball 150ms, pose-inclusive 450ms, overhead 17ms | 2.14 | 3.15 |

Each scenario assumes constant costs for 22 seconds and measures its final
3-second window using the existing FPS formula. The first two use observed
late-pass latency ranges and a small inter-pass delay; the latter two test
extra overhead and severe slowdown. The candidate still fails the speed
cutoff in those latter scenarios. An initial expectation that the 17ms
overhead case would clear 8 FPS was disproven; no cutoff was relaxed.

## Decision and next verification

KEEP for the next bounded iPhone camera-lab test. This fixes the scheduling
feedback mechanism but does not prove that every phone can finish a round.
Pose updates are deliberately less frequent, so changed live wrist/knee
freshness and counting accuracy need actual device verification. Browser and
iPhone execution were unavailable in the build environment.

After publishing and confirming COUNT 03 / PACE 01, perform the same 20 fast
right-hand pounds, then hold the ball until the timer finishes. If time
remains, include the previously used above-knee held-ball dips. Save the video
and matching test-details JSON. Success requires a full timed round, reviewed
real-rep matches and no extra counts during the negative segment. Do not treat
completion alone, coverage, or fewer accepted attempts as accuracy improvement.
