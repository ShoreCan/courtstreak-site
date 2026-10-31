# Crossover paired-frame test 03

This test keeps the CROSS 02 possession correction and changes how live crossover observations are captured. The existing ball and body models now run on one captured image for every crossover pass. A separate WASM body worker and the intervening ball-frame refresh are disabled for this drill. WebGPU is used when available through the existing detector provider; the existing sequential compatibility path remains available otherwise.

This removes inter-model frame skew by construction. It does not establish faster end-to-end processing or real-dribble accuracy. The existing minimum processing-speed check must pass before Go. A device that cannot process the paired models fast enough must not be represented as ready. Camera framing, both wrists, floor and held-ball lock remain required. The pound observation policy is unchanged.

The evidence file records the observation policy (`PAIRED 01`), body provider, pose inference time, body source-video time and `poseFrameSkewSeconds`. Processing age and frame skew are separate: a slow pair can have zero skew while returning late. Capture timestamps are never reassigned to make inference appear faster.

The crossover test makes the original recording available for saving immediately after it finishes. Count-overlay rendering is optional through Create counted video. The inline replay still shows the synchronized rep counter. This reduces work before the source video can be saved; it is not a claim that the earlier refresh/recording loss was diagnosed or fixed. No video is retained across page refreshes or uploaded automatically.

Browser validation ran 18 real paired-model calls on six archived crossover images. All returned a body and both wrists; no between-model image refresh occurred. That browser used WASM, so this is an execution smoke test rather than an iPhone WebGPU speed comparison. The diagnostic report is retained separately. Synthetic tests verify image identity during delayed inference, zero-skew export, the processing-speed gate and unchanged pound scheduling.

For the next iPhone trial, confirm the heading says CROSSOVER TEST 03, use Safari and keep the phone still. Hold the ball in either hand until Go. Start with ten deliberate transfers, each direction counted once, and hold until Time. Save the original video first, then Session details → Save test details. If setup never reaches the countdown, save setup details rather than repeatedly recording attempts.

This is a test candidate. Physical iPhone WebGPU throughput, video saving and crossover accuracy remain to be validated.
