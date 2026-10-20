# CAMERA 02: preserve valid setup progress

The camera could repeatedly lose setup progress during a normal adjustment
while the same held basketball, body, right wrist and feet remained visible.
This update preserves that progress and replaces the maximum body-width limit
with checks that the head, body, torso, wrist and feet actually fit in view.
The ball can be held in either visible hand during setup; this remains a
right-hand pound counting test after Go.

The positioning requirement remains 2.25 seconds, followed by the five-second
countdown. The existing 650 ms visibility grace, speed readiness, confirmed
ball identity and pose-freshness checks remain. Partial/cropped body, missing
feet/right wrist, an unowned ball, slow processing and actual ball loss still
block starting. Small held-ball/body shifts retain progress.

The screen says CAMERA 02 with COUNT 03. PACE 01 scheduling, all counting,
physical-hand, knee-height, detector and round-interruption rules are unchanged.
Test details include the existing per-stage detector timings and the frame
that triggers a stall, slow-rate or ball-loss interruption; this prevents the
last accepted rep from disappearing from the evidence log.

## Validation

Cached setup replays reproduce the prior check decisions, ball selection and
Go times before comparing the candidate:

| Trace | Prior Go | Candidate Go | Movement resets before / after |
| --- | ---: | ---: | ---: |
| Earlier trace | 33.117 s | 33.117 s | 0 / 0 |
| Interrupted 20-count trace | 15.425 s | 12.652 s | 2 / 0 |
| Interrupted five-count trace | 18.616 s | 15.416 s | 2 / 0 |

All pre-Go frame-validity decisions are the same on these three traces. The
time differences come from retaining valid progress. These are fixed-input,
counterfactual setup replays; they do not measure actual earlier live starts,
better counting or newly accepted camera positions. Wider framing, either-hand
setup, normal movement and invalid framing have separate synthetic tests.

All cached per-frame counter proposals and confirmations are unchanged on
the three traces, including rejection decisions. The original counter,
validator and selector source files are unchanged. Existing and added tests
and the production build pass. No new dependency is added. New browser/live
camera execution has not been performed for this setup candidate.

## Processing experiment decision

The two user-executed iPhone PROFILE 01 runs match the detector paths exactly
on all 48 within-run pairs. Buffer reuse reduced aggregate measured time by
10.0% in the first run but only 1.6% in the repeat. Both runs show dependence
on order and no total-time improvement over their final 12 pairs (the repeat
is slightly slower). Consistent useful speed improvement is not established.

The published legacy input mode is retained. Neither model, input resolution,
thresholds, decoding nor inference scheduling changes. The buffered input path
remains available only in the existing diagnostic. No lag or counting-accuracy
improvement is claimed by this update.

Requested seek times match between reports, but 11 of 24 returned detection
sets differ across runs. Exact decoded presentation timestamps were not
available. The comparisons within each frozen pair remain valid; these
reports are not exact pixel-identical reruns across sessions.

Next runtime experiment: isolate the model-call time from input/output transfer
on verified frozen inputs, preserving both model weights and image settings.
The current model-run measurement includes provider submission, wait and
output transfer. More repetitions of the present buffer experiment are not
requested. A later live check must separately verify setup, full 20-second
completion, real dribble events and fake-rep rejection. No more filming tonight.

Baseline: `0ffc20ab06d27e39e69ae24ec4a0aa280be41a49`, tree
`298a0f91ea80270d8dbb2e8fde3132efb11d5d88`.
