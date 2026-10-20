# FRAME 01: refresh ball pixels after a body-model pass

This is an opt-in change to the existing live camera tracker, not another
saved-file diagnostic. It is available at
`/lab/drill/right-hand-pound/session?mode=iphone-fresh-frame-test`.
The ordinary `iphone-vision-test` link retains the frozen-frame baseline.
The candidate shows COUNT 03 / CAMERA 02 / FRAME 01 and survives login.

## Behavior

Previously, a camera image was captured, processed by the body model, then
processed by the ball model. Body inference could take substantial time while
the ball model was still waiting to analyze that older image.

FRAME 01 reads the current camera image again after the body model finishes,
if the video has advanced. Ball detection and counter timestamps then use
that newer capture. The body's original capture time is retained for its age
and the existing setup freshness check. Unchanged video pixels retain their
original capture time. Camera stop, route change, background interruption and
orientation changes cancel the in-flight result instead of counting it.

This does not make the body model faster, run the models concurrently, remove
the long interval between ball updates, or add observations of bounces that
occur entirely within that interval. A mixed-time body/ball pair can change
hand validation, so accuracy must be checked on the device. Recapturing has a
small additional cost that has not been measured on the iPhone.

The entire detection pass still counts toward the 350ms setup-speed gate and
500ms active-stall cutoff. FPS uses completed passes as before. Existing
8-FPS interruption, 750ms setup-pose freshness, ball-lock rules, countdown,
counter, knee/wrist validation, recording, weights and dependencies remain.
No speed cutoff or counting threshold is relaxed. No video is uploaded.

## Available checks

- 106 automated tests and production build pass, including camera cancellation,
  unchanged video, frozen diagnostic compatibility and full-pass stall timing.
- Actual CPU/WASM model execution on 12 saved images: all 12 same-pixel output
  pairs match; three additional changed-image cases return the ball output
  of the replacement image and the pose output of the original image.
- The earlier cached-input counter replay still reproduces its four logged
  accepted events and one rejection. Its saved display of five contains an
  unlogged final event; no additional event or accuracy claim is inferred.
- The existing unresolved `court-hero.jpg` build warning remains.

These checks establish code behavior and detector compatibility. They do not
measure live iPhone speed, setup smoothness, mishandle rejection or true rep
accuracy, and do not establish the candidate as better than the baseline.
The development host has no iPhone camera/WebGPU execution environment.

## Bounded next device check

Use the live candidate link on iPhone. After the countdown, perform ten
right-hand pounds at normal speed and ten faster ones, then hold the ball
until the round finishes. Note the count after each group, whether held-ball
movement adds any count, and whether the round completes without slowdown.
This initial check does not cover all mishandles, speeds or devices. Do not
promote the candidate to the default on the basis of software tests alone.

No old videos, JSON input files or transfers are required to run this camera
check. Compare exact bounce events and non-bounce segments before claiming
an accuracy gain. If the candidate does not help, retain the baseline and
investigate the remaining body-processing/update gaps.
