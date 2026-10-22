# COUNT 04 / LOCK 04 — separate the extra count from the missed bounce

Prepared October 22, 2026 against published LOCK 03 source commit
26f0c806823671138be9b2f21f6a8b9fbee6d189.

## Observed problem

The new video contains 15 reviewed real bounces. Its LOCK 03 log accepted 15
events, but they are not a correct event-by-event match. The first real
bounce was counted at 1.922 seconds and a repeated rising position was
counted again at 2.052 seconds. The real bounce near 7.9 seconds was missed.
The display therefore had one extra count and one miss that canceled.

The log does not show an accepted count being subtracted. The baseline replay
reproduces all 758 selected/null ball decisions, the crop rectangles, and
the 15 accepted events before changing the algorithm.

### Duplicate

After the first bounce the measured center rose from about y=1845 to 1660
and then 1574. Two consecutive inputs repeated y=1574 before the next input
rose to about 1496. The old local-maximum check allowed equality to the
immediately preceding point; its wider amplitude/rearm windows still
contained the first bounce. It therefore proposed the rising plateau as
another bounce and the hand-return check accepted it.

COUNT 04 checks the last distinct approach position within the existing
window. Repetition on an ascent is not a new down-to-up turn. A genuine flat
floor turn preceded by descent can still count once. No cooldown or minimum
rep interval is added; real rapid cycles remain countable. Other amplitude,
floor, hand, knee, deadline and mishandle checks are retained.

### Miss

Between inputs at 7.686 and 7.894 seconds, capture timestamps were separated
by .208 seconds. The live ball model returned a size-consistent proposal of
about 182 pixels at [822,1814], near a small remembered object of about 96
pixels. It was rejected by background memory. Its roughly 598-pixel movement
from the last selected position would also exceed the fixed 457-pixel jump
guard. The next return proposal was also outside that fixed guard. A later
above-knee position was selected instead, producing a proposal correctly
rejected by the knee validator. The knee safeguard is not the bug and is not
removed.

LOCK 04 adds a bounded temporal continuation for a delayed observation. It
selects an existing detector proposal; it creates no synthetic ball point.
The candidate must be unique, have confidence at least .2, match setup/last
ball scale, remain within the measured lane, continue the recent vertical
direction, and fit a recent observed-speed envelope. At least eight measured
positions and six valid short intervals/speed pairs are required. The speed
envelope uses at most 32 selected positions, allows one ball diameter of
center uncertainty, and is capped at 4.5 setup diameters. The delay must exceed
both 80ms and 1.5 times median observed cadence, and must not exceed 250ms.
For that candidate only, the jump/vertical envelope can account for the
elapsed time. Background overlap is bypassed only for remembered objects
smaller than 75% of the candidate diameter; an equally sized background
object still blocks it. Normal cadence, ambiguity, weak evidence, large
scale/lateral changes and longer gaps retain the old checks.

This is a conservative, evidence-supported candidate, not a proof that all
camera motion or overlapping background objects are resolved. The bounded
policy was selected using these trials, so this is not holdout validation.

## Independent replay checks

| Condition on new 15-bounce trace | Accepted events | Interpretation |
| --- | ---: | --- |
| Published LOCK 03 / COUNT 03 | 15 | Extra first count plus missed middle bounce |
| Directional peak check only | 14 | Extra count removed; real middle miss still present |
| Temporal continuation only | 16 | Real middle bounce recovered; old extra still present |
| Combined candidate | 15 | One event matched to each reviewed video contact |

The combined sequence begins 1.922, 3.108, 4.199, 5.485, 6.623, **7.894**,
9.154, 10.362, 11.649, 12.969, 14.301, 15.603, 17.053, 18.398 and 19.570
seconds. The spurious 2.052 event is absent. Reviewed video contact times are
approximate (up to .22 seconds), not exact exposure timestamps. Event windows
match one-to-one so an equal total cannot hide another canceling pair.

Seven distinct cached traces contain 4,968 observations. Other LOCK 03 replay
totals remain 17 (earlier slow), 20 (medium), 20, 20, 20 (older traces), and
11 (older partial fast trace). Event ordering is retained with bounded shifts
to better observed ball positions; three older 20-event sequences are
unchanged. Crops remain identical to the saved crops in every trace.
The older fast trace still undercounts. No universal accuracy or speed
improvement is claimed.

## Validation and scope

170 automated checks pass, including the original 137, source-trace
reproduction and independent corrections, genuine flat-bottom and rapid
cycles, stationary positions/backgrounds, short/long gaps, ambiguity, low
confidence, invalid outputs, size/lane limits and countdown preservation.
Production build passes; the existing court-hero.jpg warning remains.

Only the experimental `mode=iphone-fresh-frame-test` camera route enables
both options. It displays COUNT 04 / CAMERA 02 / FRAME 01 / LOCK 04. Default
counter/identity options retain their prior behavior. Setup and countdown
eligibility are unchanged. The existing stall/FPS interruptions remain; no
camera performance cutoff is relaxed. No model, inference configuration,
dependency, recording UI, account-role, membership, XP, leaderboard or SQL
change is included. No automatic score save is added.

These are cached-input tests using the supplied detections and poses, plus
source-video review. No new pixel inference, capture cadence, watchdog phase
transition or physical-device execution was performed here. The extra small
history calculation has not been timed on the phone. Actual live response,
unseen backgrounds, other users/devices/movements and fast-dribble accuracy
remain unverified. A successful new known-count live round is the next check.

## Use

Install in Downloads/CourtStreak-Tracker-Lock-02-Review with the hash-guarded
installer, run checks/build, inspect the output and publish separately.
After deployment, reopen the exact experimental URL, verify COUNT 04 and
LOCK 04, do one slow manually counted round, hold position through review,
and save the video plus matching decision log. Review the actual event
sequence before expanding filming or promoting to the default route.
