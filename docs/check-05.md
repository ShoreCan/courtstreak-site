# CHECK 05: continuous ball observations and immediate replay

## Counting change

The supplied CHECK 04 round reported 20 physical reps and accepted 19. One
candidate used an incomplete bounce path above the knees after a roughly 224 ms
ball-observation gap during a body pass. Actual ball-model inference on the
supplied video found the low floor ball inside that gap. The regression fixture
reproduces 19 and recovers 20 when these additional ball positions are inserted,
without changing floor, knee, hand-control, timing or ball-identity thresholds.
The fixture documents its approximate video alignment and counter-only scope.

When ball inference uses WebGPU, FRAME 02 schedules body inference in an
independent, single-thread WASM worker and no longer awaits body inference.
The same pose model, model input size, decoder and physical-side mapping remain.
The worker reuses its input canvas, Float32 input and tensor. Only one body job
can exist at a time; it accepts no backlog. Each completed result, including a
missing person, leaves the normal 180 ms resting interval before the next job.
The original sequential body path remains the compatibility fallback when worker
initialization is unavailable or ball inference needs CPU/WASM. GPU execution
failure closes the independent worker before starting the CPU fallback, so two
CPU model loops do not compete. Historical diagnostic execution remains sequential.
The live sequential fallback also keeps the resting interval after a missing
person result, rather than repeatedly running the body model without that pause.

Body results retain their snapshot capture time and orientation generation.
Future or >=750 ms old body data cannot supply the current frame's control
checks. A framing reset invalidates old orientation results. A failed or >3 s
body job terminates its worker. In an active drill, two seconds without usable
body/wrist information produces an explicit partial result and preserves the
remaining native recording, as CHECK 04 does for slow/lost ball tracking.
Setup waits for fresh body information rather than directing a player to move
based on outdated detections. JSON records body mode, capture time and model cost.

This arrangement prevents a body job from synchronously blocking the ball loop;
it does not create extra processing capacity. The independent runtime uses
memory and CPU. Inference must still meet the existing setup/speed requirements.
No battery, thermal or maximum-speed improvement is asserted without device data.

## Replay change

The native recording is playable immediately with an HTML counter synchronized
to the saved acceptance timeline. Rep-marker navigation works while the MP4 is
being prepared. Completing the export leaves that player's source and playhead
unchanged. The counter is outside the picture; the shareable MP4 still burns the
counter into its bands and includes the final result card.

The counted MP4 starts only after tracking/camera stop and pending detector work
settles. A new round aborts the previous export. SHARE 03 removes an intermediate
decoded-frame canvas copy by drawing VideoSample objects directly. Two small
typography bands are cached between their changes; the camera picture is still
rendered for every source frame. Decoder samples are closed after use. Encoding
still awaits capacity, preserves original timestamps and frames, uses the same
H.264 quality/bitrate policy and retains the original on failure. Export metadata
now includes actual preparation time. Worker APIs retain the main-thread codec
fallback. There is no reduced frame rate or resolution to make export faster.

## Validation and limits

- 1,711 tracker/unit tests pass, including the new observation-gap fixture,
  independent scheduling, orientation invalidation, failure cleanup, freshness,
  sample disposal and the existing false-positive/counting regressions.
- Browser UI test: at least five ball observations during each simulated 220 ms
  body job; native replay plays while MP4 preparation is pending and its source
  does not change on export completion. Prolonged stale-body handling is tested
  separately against the same UI and native recording lifecycle.
- Actual production worker bundle loads the published pose ONNX on WASM and
  returns 17 keypoints with the supplied snapshot timestamp. Real video-model
  inference also observes the missing floor ball. These are model executions,
  not fabricated detections or a changed score.
- Browser loader tests verify GPU/CPU provider selection and worker termination
  before CPU fallback when the GPU smoke run fails.
- Alternating browser exports of the same 600-frame, 720x1280 reference retain
  every source frame at 720x1490 with two seconds of final card. Baseline/candidate
  medians were 3218.6/2982.1 ms (about 7% faster on this host); individual pairs
  vary. The cached renderer matched baseline pixels at nine sampled timestamps.
- An exploratory CPU-only concurrent replay on this headless host managed about 4.4 ball
  observations per second and frequently lacked fresh body data. It is below
  the existing 10 FPS setup requirement and does not establish counting parity.
  This is why the release retains sequential CPU execution. Worker separation
  cannot make an underpowered provider reliable.
- No physical Safari/iPhone/Mac/iPad performance, battery or temperature result
  is available for this revision. Start with one counted moderate 20-rep iPhone
  trial after deployment, confirm CHECK 05, compare the video and JSON, and record
  MP4 preparation time. Faster or repeated rounds come after that comparison.
  The change does not guarantee zero missed or extra reps in future trials.
