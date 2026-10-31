# Crossover setup test 04

Test 03's attached device evidence records 108.45 seconds in setup before its five-second countdown. Approximately 40.77 seconds were blocked by the processing-speed gate while position checks passed. Repositioning the phone cannot fix that blocker. The saved video begins at Go; it cannot establish everything that happened during setup.

## Change

- Large, high-contrast instructions over the camera: step back, move closer, center yourself, show both wrists/feet/ball, and tilt the phone up/down. The existing 450ms instruction debounce prevents single-frame flicker from switching the command. Speed checks, body refreshes and confirmation say HOLD POSITION.
- A 30-second budget covers setup and countdown, including automatic readiness resets. Expiry stops the camera before Go, reports the latest blocker, preserves diagnostic details and offers retry or a working public 20-second timer. Model preparation has a separate 45-second budget. These are usability limits, not a guarantee that every phone will pass setup.
- Crossovers freeze the camera at its native resolution and crop directly into each model input. Decoded geometry stays in the original 1280-wide coordinate space. The body and ball still use the same frozen image on every pass. This removes the intermediate 1280×2276 image and overlay for a 720×1280 portrait camera.
- The next paired pass can use a newly delivered camera frame without an unnecessary display-refresh wait. A video-frame callback (or decoded frame count fallback) identifies new images; interpolated video.currentTime is never used as a frame number. Evidence includes source frame numbers and the timing mode.
- The shared setup interface accepts stable angled support near the floor when framing passes. It does not prescribe a fixed phone height. Camera-position, body/ball freshness, ball ownership, lock, speed and control requirements remain enforced.

## Count diagnosis and limits

The attached Test 03 JSON exactly replays its eight counts with CROSS 02. Median usable pose age is approximately 93ms and recorded body/ball frame skew is zero: pairing resolved the earlier large wrist lag in this attempt. Paired throughput was only about 10fps, close to the existing readiness gate.

The early selected-ball trace briefly follows a stationary background object while the real ball moves. A later early transfer is discarded after a large selected-box size change. Those are detector/identity problems that a new positioning message alone cannot solve. CROSS 02 counting and identity rules are retained in this setup release; it does not claim recovered reps or proven accuracy. No floor bounce, opposite-hand receipt or rep is invented to improve a total.

## Verification

- Tracker regression suite: 1,896 passed.
- Production build: required before release packaging.
- Local Chromium layout checks: 24 combinations of 320/390/592/1024-wide frames, portrait/dark and landscape/light, with STEP BACK, SHOW BOTH WRISTS and HOLD POSITION; no page-wide or cue overflow.
- Actual pinned models ran sequentially on three saved video images using both old upscaled and native inputs (12 model invocations). Both wrists and a body were found in all six paired passes, and candidate counts were preserved (2, 3, 1). See the aggregate QA JSON. Browser WASM preparation was lower for the native images; this small check is neither an iPhone speed benchmark nor a rep-accuracy evaluation.
- Local flow checks use an explicitly synthetic canvas camera and synthetic detector. The QA-only HTTP harness mocks the HTTPS application guard; production retains that guard. A simulated slow phone stopped at 30.08 seconds with zero reps, no countdown, native capture metadata, and a downloadable setup JSON. The public timer completed countdown → 20 seconds → Time without login.
- The final callback-timed synthetic source delivered about one presentation callback per second in this cloud browser. It correctly failed readiness and stopped at the limit; saved source-frame numbers were unique. A healthy device’s Go transition is covered by the clock/readiness regression scenarios, but was not confirmed by that final browser run. This is a material browser verification limit, not proof of iPhone performance.

Physical iPhone Safari confirmation is still required for setup feel, low camera angles, device throughput, counting accuracy and saving video. Do not treat the unit-test total, a simulated run or visibility percentage as a count-accuracy score.

The updater uses an isolated checkout, verifies the exact release and tree, and performs a normal fast-forward push only from Test 03 (32bf81d). If main has changed, it stops without replacing newer work. No user footage, diagnostics, synthetic camera, private QA page or security-guard mock is in the release bundle.
