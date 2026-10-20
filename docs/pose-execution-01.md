# POSE CHECK 01 — isolated recorded-input experiment

Status: prepared and locally validated; actual WebGPU comparison NOT executed.
Baseline: 3407cc6eae02cbb4be06dd3d2db9d816b44d3cb1, tree 075e391e68d614ac1dee1334e6f48936509f6800.
Live versions remain COUNT 03 / CAMERA 02 / PACE 01. This diagnostic does not enable an optimization in live tracking.

The prior two iPhone PROFILE 01 runs did not establish a repeatable benefit from input-buffer reuse. In the second report, model-call stages occupied 1,854 of 2,221 measured baseline milliseconds (83.5%). These stages include execution-provider work, waits and output transfer; they are not GPU kernel time alone. This experiment therefore compares model execution without changing image size, weights or tracker rules.

The route `?mode=pose-execution` runs the existing pose model through ONNX Runtime 1.22.0 with three variants: current CPU input/output on WebGPU; fixed GPU input/output with capture explicitly off; identical fixed buffers with capture requested. The GPU-buffer control separates buffer handling from the capture option. No fallback is reported as WebGPU success. An unsupported option, invalid output, GPU error or cancellation produces stopped-check details, not a completed timing result.

Use the private input pack generated from the existing five-rep partial counted export. Nothing containing video or frame pixels belongs in this public repository. Its eight frame IDs are 290, 294, 298, 302, 306, 310, 363 and 367, taken unchanged from the pose-updated PROFILE 01 sample schedule. The exact decoded export PTS, RGB and Float32 input hashes are retained in the pack and report. A hash of the complete pack is checked before running. All three variants receive the same frozen Float32 inputs. Saved-image restoration and preprocessing are shared and excluded from timing. Native canvas interpolation differs from Safari's possible implementation; these are new frozen inputs, not a reproduction of the old browser seeks or original live predictions.

Each variant warms three times. Six permutations, eight inputs per permutation and two blocks produce 48 paired trials / 144 measured calls. Within each block every input sees each variant once in each of the three execution positions. Initialization and warmup times are recorded separately. Measured time includes input handling, model execution, completion/readback and ordinary pose decoding. The fixed-buffer completion/readback stage includes unfinished GPU work and must not be described as copy time alone. Raw comparisons and finite-value validation occur outside timing.

Predeclared criteria: every raw output finite with shape [1,56,8400]; elementwise absolute difference <= 1e-4 + 1e-5 * abs(reference); decoded box/keypoint coordinates within 0.1 source-image pixel, scores within 1e-5. All paired outputs must match. A candidate needs >=10% lower summed time overall, in each block and in all six order strata, with no p95 regression overall or in either block. KEEP qualifies only for a later live trial; REVISE denotes insufficient/reliably absent timing evidence; REVERT denotes output mismatch. It never establishes live rep-count accuracy.

The experiment uses three coexisting pose sessions; live memory and camera/encoder contention differ. There is no internal runtime replay trace. The report measures the requested public option, not the runtime's internal command sequence.

The existing login gate now retains the exact allowlisted tracker mode through password login, fixing the observed redirect-to-dashboard issue. Membership checks and invite handling remain in place. Other return paths and external redirects are not newly accepted.

Validation completed on the execution host: 90 Node tests passed; Vite production build passed; actual unchanged-model CPU/WASM inference on all eight private inputs returned finite outputs with a person detection. Source frames and resulting pose overlays were visually inspected. These checks do not execute graph capture, prove Safari UI behavior, or measure iPhone speed. The host has no WebGPU and browser QA is unavailable. Existing court-hero.jpg build warning remains.

Protected source is unchanged: live detector/preprocessing, ball weights, pose weights, counter, ball selection, hand/knee rules, setup, pose schedule and watchdogs. No dependency or workflow changes. Live integration is pending actual device evidence; no further tracker experiment is selected here.

Primary API references: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html and https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html . Installed 1.22.0 source was also checked for fixed-buffer ownership and graph-capture requirements.
