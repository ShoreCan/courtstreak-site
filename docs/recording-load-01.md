# RECORDING CHECK 01 — native recording load, fixed detector inputs

Status: prepared; actual iPhone camera/WebGPU/recording comparison has NOT been executed on the development host. No live tracker change is enabled.
Baseline published source: 99c25f934d15c04bf048d0ebc7604a6c82ad9f62; tree 2b673fda4d9871fbd29308fe2ac62a041e89f031. Live COUNT 03 / CAMERA 02 / PACE 01, unchanged weights, preprocessing, detector, recorder, selector, hand/knee checks, counter and watchdogs.

## Previous experiment closed

The supplied iPhone POSE CHECK 01 completed 48 trials / 144 measured model calls. Both alternative paths matched all 48 current raw/decoded outputs per path. Total time was 2183 ms current, 2077 ms fixed GPU I/O and 2048 ms fixed GPU I/O plus capture requested. Average calls were 45.48, 43.27 and 42.67 ms. The largest reduction was 6.18% (2.81 ms per pose call), below the predeclared 10% requirement. Decision REVISE: leave live processing unchanged. No live FPS or rep accuracy was measured. The report was independently checked for schedule balance, timing sums, stable and distinct image outputs, and output comparisons.

## Specific remaining question

Does recording the native front-camera stream materially increase the unchanged full detector's latency? The old five-rep live log assigned 90.27% of 88 active inter-sample intervals to detector processing. That run changed both recording state and detector crop at Go. It cannot attribute the slowdown to recording. This new comparison keeps saved pixels, crops, model settings and pose flags fixed while toggling recording.

## Frozen protocol

Twelve images: every other case from the existing 24-frame PROFILE 01 schedule, fixed before this comparison. IDs 279,287,294,302,310,317,325,333,340,348,356,363; four pose-inclusive and eight ball-only. Nearest decoded export PTS is retained (earlier frame on ties), with lossless PNG hash and whole-pack hash. Recorded ball crop [403,318,1119,2276]. Both models run sequentially through the unchanged loadDetector / legacy input path. No capture or GPU I/O candidate is enabled. The normal 0.18-second live pose clock is not run; its sampled flags are frozen to prevent a scheduling confound.

The camera uses exactly the live getUserMedia constraints: native front camera, audio false, width ideal 1280, height ideal 720, frameRate ideal 30. Preview remains running in every block. Recording uses the unchanged DrillRecording class and native camera stream, not a canvas stream. No camera positioning gate, dribbling or new training attempt is required. This records the current scene temporarily, which may have less motion/complexity than dribbling. A small effect cannot rule out a motion-dependent recording problem.

Three saved-image warmups precede four measured blocks: OFF, ON, ON, OFF. Each block settles for 1000 ms, runs 12 cases, and verifies camera/recorder state before and after calls. First pair uses forward case order; second pair reverses it. This yields 48 detector calls, 24 ON/OFF comparisons and two opposite-order condition pairs. ON blocks must produce nonzero recording bytes. Blobs/chunks are discarded; only sizes, MIME strings and duration metadata enter reports. MIME equality checks reported formats, not independently inspected encoder codecs.

Predeclared evidence signal: recording increases summed source-restoration + detector latency by at least 15% overall and in each opposite-order pair. Report ball-only and pose-inclusive costs separately. Require matching detector proposals/poses under existing 0.1-pixel and 1e-5-score tolerances, unchanged camera dimensions, same reported recording format and valid recorder states. This is an indicator for further review, not an automatically accepted live change or a guarantee of causation. Invalid comparisons do not establish the bottleneck.

Source image restoration and detector preprocessing/model calls/ordinary decoder are timed. Frame pacing, state snapshots, recorder start/stop and 1s settle intervals are excluded from processing latency. Restored pixel hashes are computed on a separate canvas before measurement; PNG identity plus fixed restoration operations are held constant during calls. Every ON/OFF output is also compared. Browser resizing/interpolation may differ from the preparation host; the report retains that browser's hashes. The compressed counted export is not original live camera input.

## Scope and validation

This is a full-detector workload check under real native-camera/recording load. It is NOT a replay of the complete live tracker: no ball-identity selection state, rep counter, setup/countdown, React tracker overlay or watchdog runs. It does not measure live tracking FPS, real-dribble accuracy, full-round completion or all-movement support. No claim is made that recorded videos train the model. No new model, dependency, API service or workflow is added.

Available-host checks: all 12 source images inspected; actual CPU/WASM execution of 12 ball + 4 pose model calls on these inputs, all outputs finite; 97 Node tests and production build. No WebGPU/camera environment is available here, and browser QA is unavailable. Existing court-hero.jpg build warning remains. Actual native iPhone execution is pending. Do not enable a live change until measured evidence supports it.

The diagnostic is lazy-loaded only for /lab/drill/right-hand-pound/session?mode=recording-load and remains behind the existing membership gate. The exact allowlisted mode is retained through login. Ordinary live session code and recording remain unchanged. Private video, PNGs, input pack and reports are excluded from the source patch/public repository.
