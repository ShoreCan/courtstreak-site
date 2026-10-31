# CROSS 02 counter candidate — not released

The first CROSS 01 iPhone trial selected a ball in 300/326 active observations, but provided only 37 fresh body updates over 20 seconds. Available body/wrist snapshots had a median age of 528ms. Ball inference increased from a median 21ms in the first five seconds to 66ms in the final ten seconds. Setup, one countdown and the full round completed. A matching video is unavailable, so the actual rep count and accuracy cannot be scored.

Five earlier crossover recordings were replayed using the pinned model files and the shared JavaScript counting/identity code. Desktop ONNX Runtime CPU 1.22.0 and Pillow bilinear input preparation were used for a diagnostic model rerun. Recordings are exported 15fps footage with legacy HUD/rings, and playback time differs from original wall time. Fresh-pose and illustrative delayed-pose comparisons are diagnostic ablations, not physical iPhone benchmarks or accuracy scores.

The candidate fixes three independent counting decisions:

* Keep the releasing hand when the free wrist becomes nearer during descent. A floor bounce and controlled opposite-hand receipt must prove the transfer.
* Verify control before rejecting a same-hand return. Brief source-wrist proximity on the way up is insufficient to establish possession.
* Evaluate an observed receiving-hand redirect before rejecting a second floor approach. A low, quick legitimate transfer can already be launching its next bounce.

The old CROSS 01 behavior remains explicitly selectable for exact historical replay. The uploaded trial's confirmed and rejected events match its original source. Its saved inputs still yield four reps under CROSS 02: the counting changes do not solve the phone's missing/delayed wrist evidence.

Tests cover both starting hands, continuous low transfers at 10/15/30fps, misleading free-wrist proximity, actual same-hand pounds, no-bounce passes, tracking gaps, loose double bounces, missing feet/wrists, deadline handling and historical replay. The default pound configuration, camera readiness, pose execution and ball identity remain unchanged.

The next device experiment must improve and measure body/wrist capture-to-result timing together with ball throughput, using the existing clips as a regression set. Merely loosening wrist/floor checks or asking the player to stand taller is not an acceptable correction. Faster synchronized model observations, or independently validated image-based wrist tracking, need evaluation before another crossover release. Neither the cause of GPU slowdown nor physical-device accuracy is established by these files.

No live deployment is included in this diagnostic candidate.
