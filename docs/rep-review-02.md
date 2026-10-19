# Rep replay and test evidence 02

Starting public source: `675ee9a7a8b983ad7a54aaa98e6b5229c4dc05a2`, tree `8ac7e5029c83b6c0e720d66485a721229ec79eb2`. The CAMERA 01 deployment finished successfully on 2026-10-19 at 17:07:10 UTC.

## Reported live outcomes

- The earlier screenshot shows 20 counted reps and 98% selected-ball coverage; the user reported 20 actual slow-to-medium right-hand dribbles.
- The user subsequently reported 20/20 at a faster pace with 85% coverage.
- At maximum pace, the user estimates that the counter reached 14 after 20 real dribbles, then rose by two during two fake motions that did not take the ball below the knee, ending at 16. The intermediate 14 is approximate. The source video and per-frame phone log for this attempt have not been provided, so the individual missed and false events have not been visually verified.

These are different conditions. Coverage records selected-ball frames, not rep accuracy. The same 85% can accompany either correct or incorrect counts.

## Focused counter diagnostic

Run `node scripts/diagnose-counter-limits.mjs`.

The unchanged counter accepts two synthetic above-knee dips as two reps despite zero modeled floor contacts. Ball bottom reaches at most y=470; both modeled knees are y=500 and ankles y=650. This demonstrates a counter limitation: the clean/gap paths can pass based on motion and hand control without requiring floor approach. It does not reproduce the user's actual footage or establish that this was the exact path for those two counts.

A separate synthetic trajectory of 20 fast full-depth cycles is counted as 20 at each of 10, 15, 20, 30, and 60 samples/sec when every ball measurement is supplied. That diagnostic does not explain the phone's missed fast reps. Actual detector loss, observation timing, selection, and validator decisions need the saved clip and matching evidence.

## Add-on

The replay now offers numbered buttons to seek just before each counted bounce. Markers use the event's bounce time rather than the later count-confirmation time; native recording/encoding latency can still affect exact visual alignment. The markers indicate tracker decisions, not verified labels.

The optional Save test details button exports source-video frame times, detector proposals and confidence, the selected ball, body keypoints, inference time, processing rate, counter proposals, counted-rep times, rejected/pending events, crop coordinates, and source/revision information. The file contains no camera pixels and is never uploaded automatically. The full video remains a separate save/share action.

Records are bounded at 2,400 frames. Long setup can discard older records; the export explicitly reports the number discarded. JSON serialization happens only when the user saves the details. No model, detector, ball selection, counter, validator, score, XP, or Circle-feed behavior is changed. This update collects evidence; it does not claim to fix fast-dribble misses or fake-rep acceptance.

## Validation and next experiment

18 focused automated checks pass: the original 13 setup/recording checks plus five for event-time markers, missing selections, preserved diagnostic data, bounded memory, and replay seeking. The production build passes. Physical-device recording, seeking, and combined instrumentation overhead still need a live check; this environment has no supported browser-control skill or iPhone camera.

Inspect an existing saved fast attempt first if available. Otherwise record one test with 20 fast real right-hand dribbles, followed by a short hold, then two above-knee fake motions without bouncing, then hold until the timer ends. Save video and matching details. Manually locate the 20 true bounces and two fake motions before changing scoring. The target is 20 real events and zero fake events, while retaining the successful slow/medium trials. No additional model or broad redesign is justified by these results.
