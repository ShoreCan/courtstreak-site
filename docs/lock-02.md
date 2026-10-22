# LOCK 02 — preserve a hand-owned ball through background overlap

Prepared October 21, 2026. Source baseline: b6cd94718a28a0b3c5668a642fdadda0679006e5.

## Finding

The uploaded ZIP is an older checkout at a14d020. The current GitHub source and
the latest saved FRAME 01 phone log were used instead. No files in the user's
older working checkout were changed.

All 890 ball selections in the latest log reproduce exactly with the default
selector. Its background memory sometimes rejects a genuine tracked ball for
one observation; the existing hand reacquisition accepts it on the next pass.
The resulting missing input near 6.865 seconds produces an artificial
gap-recovery event dated 6.840 seconds, immediately after the contact dated
6.695 seconds. Visual inspection of the matching exported video shows the
ball returning to the hand, rather than another floor bounce at that time.

The final interruption has a different cause. The video shows the player
walking toward the camera before the 20-second timer finishes. Around 17.599
seconds the ball exceeds the calibrated 1.68 size ratio; it reaches about
3.46 times the setup diameter by the last input. The size limit is retained.
This update does not claim to eliminate that interruption.

## Change

In the opt-in fresh-frame camera route only, background memory may no longer
veto a continuous nearby hand-owned ball when:

- There has been no missed observation.
- Its apparent diameter changes by at most 20% from the last selected ball.
- Its center stays within half the last diameter (minimum 28 pixels).
- A visible wrist satisfies the existing hand-reacquisition distance.

The existing calibrated-size, motion and lane checks still run. Reacquisition,
counter rules, hand-return validation, knee checks, models, image processing,
timers, recording and speed cutoffs remain as before. There is no extra model
call. The default camera route and default selector do not enable the option.

Candidate URL after eventual deployment:
`/lab/drill/right-hand-pound/session?mode=iphone-fresh-frame-test`

Candidate header and saved details now identify LOCK 02 alongside FRAME 01.
Recorded source metadata identifies the actual baseline commit.

## Evidence

Four distinct logs contain 2,745 observations. Three uploaded five-rep JSON
files have identical contents and are one trial, not three independent tests.
The included fixtures retain the numeric inputs needed for deterministic
selection, crop and counter replay. They do not include video or account data.

| Saved display | Observations | Default replay | LOCK 02 replay |
| --- | ---: | ---: | ---: |
| 21, incomplete | 890 | 21 | 20 |
| 20, incomplete | 450 | 20 | 20 |
| 19, complete, older counter revision | 1,038 | 20 | 20 |
| 5, incomplete, missing final logged event | 367 | 4 | 4 |

The 19-to-20 difference already exists with COUNT 03; it is not a gain from
LOCK 02. The five-rep display includes an event absent from its saved frame
log, so four replay events must not be presented as a measured lost rep.

On the latest trace, selected observations increase from 738 to 762. No
previously selected observation becomes null. One overlapping detection of
the same ball changes, and all replay crop rectangles remain identical. The
only accepted event removed is the artificial 6.840-second recovery. No
additional accepted event is added, and all other accepted event times and
paths in that trace remain unchanged. The other three traces have identical
ball selections and accepted event sequences before and after.

Validation: 121 automated tests pass, including four saved-input replay checks,
negative background/size/visibility tests, held-ball zero-count checks and the
existing 106 tests. Production build passes with the existing unresolved
`court-hero.jpg` warning.

## Limits and next check

This is a tested candidate, not a validated live release. Replay uses cached
ball detections and body poses, not new inference on video pixels. Crops match
for these fixtures, but changed timing and live detector behavior remain
unmeasured. No new physical iPhone, iPad or Mac test was performed; no speed or
general accuracy gain is claimed. This is not model training or a universal
false-count fix. Broader mishandles, obscured balls and backgrounds need more
existing-video evaluation and later device checks.

When filming is possible, use the opt-in route, confirm LOCK 02, perform the
known-count normal/fast trial, then hold the ball at the setup distance until
the timer and review finish. Compare actual bounces to accepted events and
watch for false held-ball counts. Do not promote the option to the default
solely because software tests pass.

No SQL, account-role, membership, XP, leaderboard or public deployment change
is included. The installer uses source hashes and creates a rollback ZIP.
