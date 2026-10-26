# CHECK 02 — experimental tracker repair

Baseline: `43708e1d7936df79a9836712475c36de66a351fc` (CHECK 01). Candidate: **COUNT 08 / LOCK 09 / FRAME 01 / INPUT 02 / CHECK 02**. The recorded-video processing check is PROFILE 02.

This is a development candidate for the camera lab. It improves specific failures; it does not establish production readiness, reliable completion on the iPhone, or general tracking accuracy. Some visible dribbles remain uncounted.

## Changes

**Detector execution:** one reusable canvas, channel buffer and CPU Tensor per model replaces per-pass channel allocations and alternating 512/640 canvas resizes. Passes cannot overlap and overwrite an input still being read. Shutdown waits for pending inference, disposes outputs/inputs and releases both sessions. A retry waits for the prior pass. The legacy preparation remains explicitly available to paired diagnostics.

The 20-count log contains 385 active ball passes and 64 pose passes, corresponding to approximately **1,455 MiB of cumulative channel-buffer allocations** in the old preparation. The reusable channel storage is approximately **7.7 MiB** for the two models. These figures describe this application allocation only, not total memory, retained memory, GPU allocations or a measured speedup. Pixel-read buffers and runtime-internal allocations still exist.

**COUNT 08:** clean turns can be evaluated after the existing three-sample return core instead of always waiting for eight future observations. The time-window and clean-amplitude/control requirements still apply. Low-pound proposals wait for the full half-second window, preventing an unfinished high return from being frozen prematurely as a low pound. Return separation measures the valley against the larger adjacent peak, so a rejected shallow proposal does not permanently suppress a subsequent deeper contact. Historical COUNT 03–07 behavior remains available for exact replay.

**LOCK 09 / PROPOSALS 02:** the decoder can retain emitted sports-ball proposals down to `.0001` during calibrated active/review tracking. Setup and countdown keep the `.008` acquisition policy. The weak continuation path requires established ownership, the normal size/motion/background gates and a narrow calibrated lane. Ordinary eligible detections take priority. Multiple eligible weak boxes are rejected as ambiguous. Weak boxes cannot acquire/calibrate ownership or train background memory. Their original neural scores are preserved; confidence is not inflated. This policy is provisional development behavior, not calibrated detection confidence or independent generalization proof.

**Replay and export:** counted-video rendering runs after an explicit “Add rep counter to video” action. The original recording is available immediately. This removes automatic encoding of discarded attempts; no thermal-cause claim is made. An interrupted result shows the stop reason beside its partial score. Saved evidence records the proposal threshold, input revision and detector resource summary. Processing reports use actual build provenance instead of older hard-coded commit IDs.

## Validation

- **1,689 Node checks pass**, including historical replay, low pounds, scale/cadence variations, held balls, transfers, missing control, above-knee motion, deadlines, weak-proposal ambiguity, input ownership, failures and cleanup.
- The production build passes with the locked dependencies.
- The reusable preparation is checked against legacy preparation on actual frozen pictures with the same crops and models. The paired report records input bytes, decoded-output equality, provider and its limits; this is not a phone-speed measurement.
- Configured replay reproduces the saved CHECK 01 selections and accepted events for the three recent logs. Old COUNT 07/LOCK 08 results do not silently become current-mode results.

### Fresh-inference development comparison

Both ball and body models run on decoded source frames. Crops evolve from each tracker's state. The four recent attempts use their saved setup/countdown prefix. Other originals acquire from their initial pictures. Pose runs periodically on the decoded picture. No artificial terminal observations are appended.

| Source | Previous rules, same offline inputs | Candidate |
| --- | ---: | ---: |
| Original recording independently reviewed as 15 dribbles | 15 | 15 |
| Saved 0-count partial export | 0 | 5 |
| Saved 3-count partial export | 5 | 5 |
| Saved 20-count completed export | 16 | 19 |

The export rows are deliberately **not** comparisons with their live displayed totals. The count-overlay videos have compressed pixels, fewer/different frames and different pose timing. The original 15-event recording retains all 15 event timestamps in the paired dense run. The recent partial clip still has missed cycles, and the completed export still misses one of its 20 visually reviewed cycles.

Six older originals were also executed as paired development stress cases. Their initialization is not the live readiness/countdown flow, and some contain other dribble motions. Their totals are not right-hand-pound accuracy labels or an independent holdout. They are retained with the research checkpoint for regression investigation.

The same newly inferred original-video frame/crop pairs were also sampled at uniform 10/20/30 Hz schedules with three starting phases, retaining actual frame timestamps and deduplicating repeated nearest frames. At 10 Hz the previous/candidate totals were **2/11**, **12/12** and **12/12** by phase; at 20 and 30 Hz both retained 15 in all tested phases. Candidate events matched distinct dense-reference event windows. Those reference timestamps are software events in a separately reviewed 15-dribble video, not independent physical contact annotations. Low-rate misses remain.

## Limits and next verification

The offline runtime is ONNX Runtime Web 1.22 WASM with four threads on Node and `@napi-rs/canvas`. Live iPhone execution uses Safari and WebGPU or single-thread WASM. This review does not measure repeated live-round completion, live recording contention, heat, GPU scheduling or device parity. It does not establish why the earlier inference time increased. The speed/stall and ball-loss interruptions remain active.

Model weights, live frame timestamp semantics and the hand/floor/control thresholds were not retuned. Existing background-memory behavior still has known failure cases; broad removal previously regressed controls. More detector/floor evidence and untouched sessions/players are needed before a public accuracy claim. These development examples must not be reclassified as holdouts.

After installing, the existing `mode=recorded-profile` screen can compare processing of a saved video and matching JSON on the phone, with no new dribbling or filming. That check isolates preparation costs; it does not establish live camera/encoder performance. A later controlled camera round is still needed for live completion verification.

## Installation and publication

The separate Repair 02 package checks exact before/after source hashes, prerequisites, model/runtime bytes and dependency lockfile; it backs up changed files and refuses conflicting edits. Its publisher fetches main, requires local HEAD to match the fetched main commit, runs the real tracker suite/build, commits only the reviewed files and pushes without force. It preserves unrelated staged and working changes. The deploy workflow also runs the tracker tests.

GitHub integration write access was rejected with HTTP 403. No deployment from this workspace is claimed. Confirm CHECK 02, COUNT 08 and LOCK 09 after the user's successful publication and deployment.
