# LOCK 03 — keep a foreground ball out of an oversized background veto

Prepared October 22, 2026 against published commit
795c4c55a886b4d7d00bf508f0e0bc1997d33678 (LOCK 02 + dependency cleanup).

## What failed

The new iPhone slow trial contains 17 visually reviewed right-hand pounds;
LOCK 02 displayed 14. The missing fifth, fifteenth and seventeenth bounces
never became proposals. Their selections were absent for runs of six, six
and seven observations, beyond the counter's unchanged five-point bridge.
Genuine ball detections existed within those runs.

The background filter compared each ball proposal to remembered objects. Its
exclusion radius was the maximum of 28 pixels, 65% of the remembered object's
diameter, and 65% of the NEW candidate's diameter. Thus a large foreground
basketball enlarged the forbidden region around a smaller object such as a
shoe. At the fifth missed bounce, a high-confidence basketball of about 225
pixels was rejected near remembered detections of about 115 and 63 pixels.
LOCK 02 protects hand continuity, so it could not help near the floor.

## Narrow correction

In the existing experimental fresh-frame mode's active/review tracking only,
use max(28, remembered-object diameter * .65) for the remembered object's
exclusion zone. The moving basketball no longer changes that radius. Keep
the same .65 factor, 28px minimum, background observation requirement,
background-learning code, hand continuity, motion and size guards. A proposal
inside the actual remembered object's zone is still rejected.

Setup/countdown and the default nonexperimental route retain their existing
behavior. Model weights, inference, crop calculation, five-point gap bridge,
bounce counter, hand/knee validation and timing rules are unchanged. No extra
model call or new dependency is added. The camera-lab header and evidence
identify LOCK 03, with COUNT 03 / CAMERA 02 / FRAME 01 retained.

An earlier broader radius/size exemption was rejected during development: it
could recover 17 slow reps but make the medium trial count 21. A repeated
ascending-frame position could then look like another peak. That separate
counter edge case was investigated but is NOT changed by this patch; the
narrower object-sized radius preserves the medium result without a counter
change. Do not install or infer a released counter fix from that experiment.

## Replay evidence

Six distinct traces contain 4,210 observations. Every new LOCK 02 source log
reproduces its original ball selections with the baseline configuration.
The candidate's crop rectangles remain identical to the recorded rectangles
in every trace; the check uses cached detections and body poses, not newly
run video inference. Phase transitions and watchdogs are not re-executed.

| Trace | LOCK 02 replay | LOCK 03 replay | Assessment |
| --- | ---: | ---: | --- |
| Oct 22 slow, displayed 14 | 14 | 17 | All 17 reviewed video contacts matched once |
| Oct 22 medium, displayed 20 | 20 | 20 | All 20 reviewed video contacts matched once |
| Oct 20 incomplete, displayed 21 | 20 | 20 | Complete LOCK 02 accepted-event sequence preserved |
| Oct 19 incomplete, displayed 20 | 20 | 20 | Complete LOCK 02 accepted-event sequence preserved |
| Oct 19 finished, displayed 19 | 20 | 20 | Complete existing COUNT 03 event sequence preserved |
| Older fast partial, displayed 5 | 4 | 11 | Eleven distinct reviewed video contacts matched; still misses bounces |

The older five-rep export contains many real fast bounces, rather than only
five attempted bounces. Its log has four accepted events and an additional
unlogged displayed count, as documented in the earlier work. The reviewed
video contains approximately 20 bounce cycles; the 11 replay events match
distinct video-contact windows, not duplicate matches to a single bounce.
The partial compressed export's timestamp alignment is imprecise, so these
windows are approximate (up to .22 seconds), not precise exposure-time
ground truth. This trace does not establish general fast-dribble accuracy.

Approximate contact windows in the new slow/medium clips were checked against
their source video. Automated orange-pixel image inspection helped locate
review frames only; it is not used by the live tracker, does not train a
model and is not substituted for video review. Matching windows guards
against equal totals hiding a missed bounce plus an extra count. It does not
establish exact count latency or general accuracy.

The old 19-to-20 replay difference is already present in COUNT 03. The old
21-to-20 difference is already present in LOCK 02. Neither is a new LOCK 03
gain. The older fast trace still undercounts and remains an unresolved case.

## Verification and limits

137 automated checks pass, including the original 121 and sixteen added
checks for the new traces, background-object rejection, calibration/jump
guards, countdown behavior and zero counts from stationary background
proposals. The production build passes with the existing court-hero.jpg
warning. Counter and control-validator source below the identity selector
was compared byte for byte with the published baseline and is unchanged.

This is a candidate for a physical-device check, not proof of live accuracy,
speed improvements or support for other movements. No physical camera was
operated here. Testing and tuning used the supplied trials; they are not an
independent holdout evaluation. More unseen backgrounds and devices still
need validation. The live patch adds no video uploads, score saving, XP,
Circle writes, membership changes or SQL migrations.

## Install and next device check

The included installer checks every target hash before changing any file,
creates a rollback ZIP, and refuses to overwrite other edits. Install in
Downloads/CourtStreak-Tracker-Lock-02-Review, run tests and build, then inspect
the output before committing/publishing. Installation alone does not update
the live iPhone website.

After publication and a successful deployment, use
`/lab/drill/right-hand-pound/session?mode=iphone-fresh-frame-test` and confirm
LOCK 03. Do one slow round with a manual count, stay at the setup distance
until the timer and review finish, and save the original video and matching
decision log. Review that result before more filming or any default-route
promotion. Responsiveness is a separate remaining investigation.
