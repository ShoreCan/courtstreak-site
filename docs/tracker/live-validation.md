# Live tracker validation

## Athlete proportions

Apply this policy to every current and future drill. Eligibility and scoring have no player-height, torso-width, wingspan, fixed-stance-width, or minimum bounce-height requirement. A drill can require its named motion and a controlled receive. A camera drill can require the relevant landmarks, ball, and floor to be visible.

Use the athlete's observed landmarks and the tracked ball to locate the movement. Keep distance thresholds about observation uncertainty and control. Avoid global body proportions as substitutes for either. Instructions can suggest a comfortable starting position with room for the ball.

Before enabling automatic scoring for a drill, test it across different player heights, torso widths, arm lengths, and comfortable stances. Check both sides when the drill uses both hands. Include low controlled bounces, passes without ground contact, mishandles, and adjacent moves that should not count. Confirm the expected individual reps from video and check precision, recall, and scoring latency on held-out live rounds. Tests for existing camera drills can reuse the controlled movement fixtures with independent changes to body and wrist landmarks.

## Between the Legs GPU ordering trial

Test 05 starts with ball-first submission on the normal Between the Legs lab route. Add `?gpu-order=pose-first` and reload for the comparison. Ball-first queues the ball result copy before the next pose upload, and pose can start while the ball buffer is mapped. Both modes use the same models, refresh policy, CPU scheduling, recording, and scoring rules. The saved evidence records `gpuSubmissionOrder`.

On the same iPhone, alternate control and trial rounds in the same placement, with recording enabled in both. Start each pair at similar device conditions. Compare unique tracking FPS, p90 and longest frame gaps, ball GPU map wait, and wrist age at the receive. Match confirmed reps to the videos and check misses, false positives, and capture-to-confirmation delay. Use `passWorkMs` to check camera copying, ball selection, counting, evidence capture, and UI submission separately. The count commit timeline records when React applies the count to the screen, before browser paint.

If readback stalls persist in both modes, use the recording-load diagnostic to measure recording contention. Compare early and late rounds on the same device and note temperature and other active apps. The tracker already uses a compact GPU readback. Measure the cost of the compacting shader and the map separately before considering a smaller output or a different model. A smaller payload, cooler device, or higher camera capture rate needs its own live validation against the same scoring checks.

## Between the Legs Test 06 GPU compaction

The default Test 06 route requests the paired ball-output compaction shader. The
existing ball and pose models, pose schedule, camera crop, thresholds, and Test 06
counting rules are shared by the two modes. At startup, the tracker runs both
shaders on the same warm detector output and compares the result word for word.
The new shader is selected only if the device reports no validation error and
the outputs match. The saved details report the active `ballProcessingRevision`
and the result of the startup comparison in `ballCompactionTrial`.

Add `?gpu-compact=baseline` to the same route and reload to use the previous
shader with the same scoring rules. Alternate baseline and candidate on the same
iPhone with the same camera placement and recording settings. Compare active
frame cadence, p90 and maximum gap, GPU map wait, wrist age at the receive, and
verified reps. Group ball timing by `posePendingWhenQueued` to see whether a pose
job was already outstanding when a ball pass was requested. Map wait can include
GPU execution, output preparation and queue contention.

Safari reported advancing presentation IDs with media time fixed at zero in
both original Test 05 logs. `activeDetectorRepeats` records adjacent identical
nonempty proposal lists from different presentation IDs within 30 ms at the same
crop. Use this along with presentation cadence. It is a repeat indicator rather
than a pixel-level camera measurement and has no effect on counting or scheduling.

## Between the Legs Test 07 body and wrist readback

Body landmarks and both wrists are outputs of the same pose inference. Test 07
keeps the existing model, confidence threshold, and pose refresh schedule. Its
normal pose copy and mapping range holds 32 detected anchors (7,312 bytes). If it
contains more anchors, the current inference is recovered from the existing
larger compact buffer. The detector keeps the larger range for the rest of the
camera session. If the compact buffer also overflows, the full head is available.
The order of anchors and pose decoding are shared by both paths.

To isolate one GPU change at a time, use the same Test 07 route and camera
placement. Keep recording enabled and alternate the two modes on the same
iPhone. Use `?gpu-pose-readback=baseline` for the old pose range, or
`?gpu-compact=baseline` for the old ball-output shader. The modes can be
combined with the two query parameters. The scoring rules are shared.

The evidence records camera capture and canvas staging separately from input
upload submission, model request time, output map wait, output processing and
count publication. `inputUploadSubmitMs` and `runtimeCallMs` measure the host
calls. Asynchronous GPU completion can show up later in `gpuMapWaitMs`. The pose
timings also report copied bytes, candidate count and any overflow. Evaluate
readback waits and gaps around the individual floor and catch events before
using average FPS as the comparison. If long waits remain in both modes, use
the recording-load diagnostic to check encoder contention on that iPhone.

A background-rejected floor candidate can provide a scale reference after
observed motion confirms the rise along the same path. Opposite-hand control
and between-the-legs geometry remain required. High-confidence rejects at the
receiving wrist can be reconsidered after an observed floor turn. Replay alone
cannot recover contact or control missing from the saved observations.

## Between the Legs Test 11 iPhone validation

Use the regular Between the Legs lab route with recording and the outline
enabled first. Film the low angle that previously produced 14 counts and a
fast round from the angle that previously produced 25. Keep both wrists, the
ball and the bounce area in view. Save each original video and its matching
JSON. Mark every controlled transfer on the footage so misses, false counts,
and late counts can be identified individually.

Test 11 only bridges a short gap in leg observations when a real ball turn
and the leg geometry on both sides of the gap support it. An isolated,
very low confidence jump immediately after a verified turn may be ignored.
A rep still requires observed opposite-hand control. Test setup continues
to check fresh camera evidence. The active loop stops recomputing setup
readiness once the round starts.

If long gaps persist, compare matched runs on the same phone with and
without recording. Open the same route with `?tracking-recording=off` for
the second condition. Keep the outline on. The score and JSON remain
available in either condition. A recording-off round has no in-app review
clip. The JSON records whether recording was requested and whether it
started. For a separate comparison, `?tracking-overlay=off` disables the
outline during the active round only. Change one setting at a time.

Compare processed tracking rate and camera presentation cadence, the
90th-percentile and longest gaps between tracking samples, the ball GPU
map wait with and without a pose request already outstanding, and wrist
freshness at the catch. The GPU map wait includes queued work and execution.
Confirm gains on additional live rounds. A 30 FPS result can still miss
reps if an individual gap spans a bounce or catch.
