# CONTROL 02: physical hand labels and above-knee false-rep rejection

Decision: **KEEP as an offline candidate for a controlled live trial.** No claim of verified iPhone accuracy or all-movement support. The public starting source is `675ee9a7a8b983ad7a54aaa98e6b5229c4dc05a2` (CAMERA 01), tree `8ac7e5029c83b6c0e720d66485a721229ec79eb2`.

## Source evidence

The user supplied `CourtStreak-right-hand-pound-15-reps.mov`, a complete 19.99-second saved camera round. It contains 600 timestamped frames, a 1280x720 HEVC track with -90-degree display rotation, and a displayed image of 720x1280. All 600 source frames were inspected in chronological contact sheets. There are 20 real floor approaches with rebound and hand return, around 3.09 through 11.04 seconds. Subsequent arm raises and dips keep the ball off the floor. No further real rep should be awarded.

The filename and the user's shared summary report 15 reps on the iPhone. The recording has no count overlay or processed-frame log. The exact live selections and count-event timing cannot be reconstructed from the saved camera video.

## Controlled replay

The exact published ball and pose model files and detector settings were preserved. The replay honors display rotation, mirrors input as the browser does, and uses the existing adaptive crop. “Native” means every saved frame, not a full-image detector change. The first two seconds of held footage initialize identity because the original pre-Go tracker state was not saved.

OpenCV image resizing, CPU ONNX execution, saved HEVC pixels, and deterministic sampling differ from Safari's live Canvas/device pipeline. The replay is a separate experiment, not a reproduction of the phone's 15. Three schedules were selected before running: all 600 frames, every second frame, and every third frame. A schedule was not chosen to match the phone's result. Within each schedule, all four counter conditions use identical detector outputs, selected balls, poses, and crop records.

Matching uses the manually marked reference times and a fixed 0.10-second tolerance. Individual floor-contact instants have frame uncertainty. Counts outside that tolerance are reported separately from clear false counts during the held-ball interval.

| Schedule | Current count | Current events matched within 0.10s | Current held-ball false counts | Candidate count | Candidate events matched within 0.10s | Candidate held-ball false counts |
|---|---:|---:|---:|---:|---:|---:|
| 600 saved frames, about 30/sec | 21 | 20 | 1 | 20 | 20 | 0 |
| Every second frame, about 15/sec | 21 | 18 | 3 | 20 | 18 | 0 |
| Every third frame, about 10/sec | 8 | 5 | 3 | 5 | 5 | 0 |

At 15/sec the candidate accepts two additional cycles at 7.805 and 9.465 seconds. They follow the reviewed real bounces numbered 12 and 16, but their proposed bounce timestamps exceed the fixed timing tolerance. Do not silently count these as strict matches. They occur in the real-dribble interval, not in the held-ball negative interval. The 10/sec run still misses most fast real reps; a smaller final count is not evidence of improved recall.

## Changes and isolation

1. **Restore original physical side labels after mirrored pose inference.** The camera image and its coordinates remain mirrored. Only the left/right COCO keypoint labels are remapped. The previous right-wrist lookup followed the other wrist in the recorded scene. Five source moments were compared with unmirrored inference: the median right-wrist discrepancy fell from about 293 to 31 canonical pixels after mapping. Ultralytics documents the COCO-17 keypoint ordering and mirror pairs at https://docs.ultralytics.com/datasets/pose/.
2. **Reject a bounce proposal whose estimated ball bottom remains above both confidently visible knees at the proposal's bounce frame.** The validator buffers knee observations and uses the event frame, not a later confirmation pose. It keeps the previous behavior if the required knee evidence is missing or uncertain. This is a necessary-position veto, not direct proof of ground contact. It does not establish rejection of every possible fake, especially below-knee fakes.

The knee veto alone removes held-ball false counts without removing any previously accepted real event in these three replays. Side mapping alone can recover hand-return evidence and also accepts additional fake motions. The combined condition is therefore tested explicitly; side mapping is not presented as sufficient fake-rep protection.

Ball detection, weights, model heads, confidence thresholds, NMS, image resolution, ball identity rules, ROI feedback, bounce proposal logic, hand-distance thresholds, and body-offset thresholds are unchanged. The physical-side mapping preserves the two-wrist set: selections and ROIs remain exactly identical on all 1,100 replay observations. No offline Mac-pilot engine, dependency, service, XP award, or Circle-feed posting is added.

## Regression and application checks

- The knee veto preserves all 30 matched events in the older 30-rep reference using its existing 0.18-second matching tolerance. That reference was reviewed from a processed recording and is not independent raw-camera truth. The original pose convention is preserved for this regression; it tests the veto, not the new browser mirror adaptation.
- The veto retains all 70 baseline accepted events across 4,549 fixed archived observations from ten separate clips. Their full-clip labels are incomplete, so event retention is not a full accuracy percentage. These clips were not used to select a new detector or threshold.
- 26 automated application checks pass, including event-frame knee lookup, uncertain-pose fallback, mirror mapping, setup grace, recording lifecycle, and replay evidence.
- The production build passes. Its pre-existing unresolved hero-image warning remains unrelated.

The application validator matches the tested experimental candidate byte for byte. The model and detector files are unchanged. The prepared update also includes the previously prepared rep replay markers and test export so the next phone trial can retain actual processed-frame evidence.

## Remaining limitation and next live check

The 10/sec replay's misses remain unresolved, and no exact phone-processing log exists for this attempt. There is no supported physical iPhone/browser-control surface in this execution environment. Device speed, Safari video seeking/saving, and accuracy with the combined update remain to be checked live.

After publication, confirm **CONTROL 02**, repeat 20 fast real right-hand dribbles followed by above-knee held-ball fake motions, then hold until the round ends. Save the replay and **Help check this count → Save test details** before leaving or starting another round. The target is 20 true reps and zero false reps. Use that phone log to replay the actual processed observations and isolate any remaining sampling, detection, or counting failure. Other movements and devices require their own validation.
