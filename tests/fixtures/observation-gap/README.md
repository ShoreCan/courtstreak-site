# Supplied CHECK 04 moderate round

`moderate-pose-gap.json` retains counter inputs from the supplied CHECK 04 JSON:
20 physical dribbles reported by the player, 19 accepted, one proposal rejected
as `rejected_above_knee`. The affected floor bounce falls in the approximately
224 ms interval between ball observations at elapsed 3.896 and 4.120 seconds.

The reduced fixture contains chronological counter measurements and deduplicated
recorded body poses. `additional` contains five actual ball-model observations
from the camera picture in the supplied counted video, at approximately 3.967,
4.000, 4.033, 4.066 and 4.100 seconds. The original model selected the low floor
ball near y=1861 at 4.033 seconds. Video-to-JSON alignment is approximate to a
frame; the video was supplied as a resized/reencoded counted MOV.

The regression first reproduces 19 using the original measurements. Inserting
those additional observations, with the existing recorded body context, recovers
the seventh physical bounce and preserves all 19 previously accepted event
times. COUNT 08 floor and control thresholds are unchanged. This establishes the
counter consequence of the missing observations. It is not a complete live
camera replay, a measurement of the new worker's body cadence, or proof that an
iPhone will observe all five frames in a future round.
