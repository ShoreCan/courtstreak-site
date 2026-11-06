# CourtStreak Test22: counting-rule audit and repair decisions

6 November 2026, America/Chicago. Deployed baseline:
`6500db5d8208f1cd8693feef835afae19110ab5c`. Audit source is on the separate local
branch `codex/rule-audit-20261106`; its commit is included in the checkpoint.
No live policy was changed or deployed in this audit. The tracker is not ready
for trusted customer scoring. No new live accuracy or FPS is claimed.

## Ownership and the actual rules

The detector supplies estimated ball boxes and body keypoints from pretrained
models. CourtStreak's authored code selects a ball, tests a movement, and awards
or rejects a rep. Those last rules are our implementation choices. They were
intended to reject false objects, held-ball jitter, airborne passes and lost
control. They can also reject valid movements when their measurements or timing
assumptions do not fit the phone input.

| Rule in deployed Test22 | Actual restriction | Risk / correction to pursue |
| --- | --- | --- |
| Primary full-pound motion | Observed descent at least 1.6 ball diameters; the validator also requires return amplitude of at least 1.5 diameters | Measured travel is an evidence filter, but effectively becomes a minimum-motion rule. Replace blanket travel requirements with verified floor/contact/return evidence for low dribbles. |
| Low-pound exception | At least 0.6 diameters descent and rise, two observed samples on each side of the bottom, hand control before and after | Still excludes sufficiently low or sparsely sampled movement. Validate a sequence-based alternative against low real bounces and held/airborne controls. |
| Low-pound floor position | Sampled bottom center within 0.3 diameters of learned floor, or within an ankle-based region | A gap can miss the true bottom while hands and full motion are visible. Use bounded sampling uncertainty and calibrated floor evidence; a broad spatial relaxation admitted false events. |
| Gap-recovered pound | Descent and rise each at least 1.25 diameters, plus hand/body checks | A return of 1.209 diameters fails despite close wrist proximity. A smaller constant alone is not a complete validation method. |
| Existing floor-gap reconstruction | Four real measured samples, a gap at most 150ms, incoming/outgoing segments intersecting within the gap and within 0.45 diameters of a stable floor reference | The 150ms bound excludes actual phone gaps. An opt-in bound of at most 300ms recovers one reviewed event while keeping the other evidence checks. |
| Crossover continuity | Abandon an active flight after more than 250ms without an acceptable observation | A processing pause or rejected size estimate can erase a valid transfer. A blanket 350ms allowance was not a solution: it lost existing events. Reacquisition must preserve release/floor/receipt identity. |
| Pound recovery continuity | Reset after more than 280ms without a usable observation, or after a 1.6s flight | Treat missing evidence separately from physical mishandling; retain bounded state only when subsequent observations can verify the same cycle. |
| Crossover receipt | Ball close to a distinguishable receiving wrist, then compatible observations 40–200ms apart or a downward redirect within 250ms | Sparse or mismatched wrist observations can prevent proof of control. Test synchronized receipt evidence instead of merely widening the distances and deadlines. |
| Pound validator expiry | Unconfirmed proposal expires after 14 updates | The same number of updates lasts different amounts of real time at different processing rates. Use explicit cycle/time evidence and report which check failed. |
| Duplicate suppression | Floor-event times within 160ms merge into one ledger event | Prevents double awards across the two pound counters, but a rejection in one counter does not automatically mean a rep was missed. Associate evidence by cycle and audit duplicates before loosening. |
| Ball identity and geometry | Confidence, shape, box-size consistency, motion, ambiguity and background-memory checks | These reject candidate boxes, not known real reps. Label actual ball locations before deciding which filters to adjust. |

There is no business requirement for a minimum bounce height. Nevertheless,
some current numerical motion checks effectively impose one. Calling the
low-pound exception sufficient was not justified for all dribble heights.

The 50ms processing value is not a rule saying “reject this rep if processing
takes more than 50ms.” It admits or skips an optional second floor-view detector
pass. The 150/250/280ms intervals and the spatial/control rules above are separate.

## Exact baseline before changing any rule

`replay-rule-audit.mjs` freezes the original selected balls and causal body
observations, then reconstructs countdown pauses, Go timing, counters, and event
formatting. It isolates counting rules; it does not rerun or validate detector
selection, pixels, model latency, or new requested crops.

All per-frame count updates and all 78 accepted rep records reproduce exactly:
18 indoor pounds, 33 outdoor pounds, and 27 crossovers. Invalid clocks and missing
countdown readiness are rejected. An altered displayed total is detected. This
avoids evaluating a different pre-Go timeline by mistake.

## Three specific false rejections

Original video sequences around these events show floor bounces and controlled
returns. Subframe alignment between recording and monotonic evidence time is
not established; these are approximate corresponding regions, not a complete
session ground-truth annotation.

| Clip / proposal time | Gates that passed | Gates that failed | Relevant largest local capture gap |
| --- | --- | --- | ---: |
| Indoor pound / 8.832s | Observed local movement, right-hand control before, right-hand control after | Sampled bottom 0.649 diameters above learned floor (limit 0.3); ankle-region alternative also failed | 239ms |
| Outdoor pound / 9.580s | Observed local movement, right-hand control before, right-hand control after | Sampled bottom 0.950 diameters above learned floor; ankle-region alternative also failed | 230ms |
| Outdoor pound / 14.327s | Observed local movement, right-hand control before, right-hand control after | Sampled bottom 0.666 diameters above learned floor; ankle-region alternative also failed | 174ms |

All were eventually labelled `rejected_mishandle`. That label does not describe
the actual failed check: these cases lacked accepted floor proof, despite hand
proof passing. Rejection evidence needs distinct “unverified floor,” “unverified
receipt,” “observation gap,” and physically observed loss-of-control categories.

Another outdoor proposal at 13.272s failed the recovered-return threshold:
1.209 diameters against 1.25. The second pound path had already awarded a nearby
floor event at 13.198s. Therefore accepting that proposal does not necessarily
add another legitimate rep; the shared ledger matters.

## Controlled rule changes, including failed candidates

Same phone packets, poses and measured observation times; no model inference.
These are detection totals, not new ground-truth accuracy scores.

| Experiment | Indoor | Outdoor | Crossovers | Decision |
| --- | ---: | ---: | ---: | --- |
| Deployed baseline | 18 | 33 | 27 | Reproduced exactly |
| Recovered-motion minimum 1.25 → 1.15 diameters | 18 | 34 | — | More detections alone does not justify release |
| Learned low-floor tolerance 0.3 → 1.0 diameters | 19 | 35 | — | Recovered reviewed movement but allows excessive floor uncertainty |
| Both broad pound relaxations | 19 | 36 | — | Rejected: false counts in a non-bounce control |
| Crossover tracking-gap limit 250 → 350ms | — | — | 27 | Rejected: four added event times and four previously accepted events lost |
| Crossover receipt window 200 → 300ms | — | — | 27 | No gain on these inputs |
| Crossover upper size ratio 1.5 → 1.8 | — | — | 27 | No gain on these inputs |
| Existing known-floor reconstruction, gap cap 150 → 300ms only | 18 | 34 | 27 | Narrow opt-in candidate; incomplete repair |

The broad pound relaxation was tested with explicit synthetic ground geometry:
ground/feet y=640px, ball diameter 80px, true floor center y=600px. After eight real
bounces, eight hand-controlled airborne movements had lowest center y=520px
(ball bottom 560px, 80px above ground). The baseline counted zero airborne
movements; the broad relaxed candidate counted all eight at 15, 20 and 30 input
updates/s. Held-ball controls stayed at zero. These are intentionally synthetic
counterexamples, not claimed video or phone accuracy results.

The narrower gap candidate kept zero airborne counts in those controls, including
additional gapped airborne cases. It retained the current floor reference,
observed-segment intersection, hand-return and deadline checks. This limited test
coverage is not a universal reliability guarantee.

## The one targeted correction implemented in source

`GapAwareBounceCounter` now accepts an optional `maxFloorSamplingGapSeconds`,
validated between 0.15 and 0.30 seconds. The default remains 0.15. Live factories
and configuration still use that default; the prototype is not enabled on the
live site and has no new camera route.

The 0.30s opt-in recovers the outdoor bounce at approximately 14.342s from a
174ms gap. The incoming and outgoing measured segments still have to intersect
near the established floor, and the original return-control validator still has
to accept the event. Its contact time is explicitly marked
`estimated_between_observed_frames`. No detector sample is invented.

On the three saved-phone streams it preserves every previously accepted event
and adds this one visible bounce: 18 → 18, 33 → 34, 27 → 27. Thirteen historical
saved-selection counter comparisons retain identical accepted event lists. Those
historical comparisons do not reconstruct their original countdown schemas or
establish independent accuracy. The remaining reviewed misses are unresolved.

2,014 repository checks and the production build passed. New focused checks
cover opt-in quarter-second gaps, floor agreement, observed segments, missing
hand proof, missing calibration, and the 300ms upper bound. These checks verify
the implementation and its limits, not live performance or customer readiness.

## Other causes and logical solutions

| Cause | Evidence status | Engineering response |
| --- | --- | --- |
| Shared ball/body workload and late observations | Source shares a serialized submission queue and physical GPU; phone logs show 15–17 active observations/s and gaps up to 267ms. Runtime-step timing includes queue waiting. | Measure queue wait, runtime call and readback separately. Evaluate ball-priority scheduling and lighter targeted body/wrist work while preserving fresh receipt evidence. Reordering alone is not proven to reach 30Hz. |
| Small ball in a padded model input | In both pound clips the median valid crop occupied about 36.6% of the square model input; selected ball diameter was roughly 48–49 model pixels. Crossovers: about 53% and 42px. Accuracy impact not isolated. | Evaluate a hand-to-floor crop with motion margins and full-view reacquisition when needed. The same 512px model still costs a model call; improved crop efficiency is not automatically a speed gain. |
| Low movement and sparse timing | A synthetic matrix of eight intended low pounds with 0.4-diameter travel scored zero in all 36 tested combinations, including 30Hz. Fast 0.2s cycles at 15Hz scored one of eight at 0.8-diameter travel. Uniform 15Hz at slower periods did pass. | Replace implicit drill-height and fixed-sample assumptions with verified floor-to-hand cycle evidence. Test very low, fast and irregularly sampled movement separately from jitter and airborne passes. These synthetic results do not establish the cause of every recorded miss. |
| Incorrect or partial ball selection | Proposal filters and selection losses are present, but each rejected box has not been independently labelled as the true ball. | Label the real ball around failures. Correct association or train/replace localization only where measured evidence requires it; do not disable ambiguity/background checks wholesale. |
| Wrist/ball timing mismatch or keypoint error | Saved causal poses can be from a different capture moment. A detected body does not prove wrist accuracy. Physical error has not been measured per event. | Compare ball and wrist capture times at receipts; validate synchronized or locally tracked wrist observations. Widening the hand-distance limit can award uncontrolled returns. |
| Floor projection and changing player/ball scale | The counter uses feet and learned ball-center samples as floor proxies; neither directly measures the actual floor plane. Specific floor-proof failures are established above. | Preserve a reliable floor/contact reference with uncertainty tied to scale, view and sampling; avoid learning a new floor from an unverified event. |
| Deadline and duplicate suppression | Relevant to the full system; not established as the cause of the reviewed middle-of-round failures. | Associate source release, floor and receiving hand per cycle. Review buzzer finishes separately and prevent both missing the last valid cycle and double-awarding two detectors' proof of one bounce. |

## What is not finished

The audit establishes that authored rules contribute to real rejections, alongside
missing timely observations. It does not establish complete true/missed/extra
totals for these recordings, fix every rejection, train a detector, or validate
new live performance. The broad relaxation is deliberately not offered as an
update. The narrower correction is preserved for further event-level validation
before a live release. No new recording is needed to continue that offline work.
