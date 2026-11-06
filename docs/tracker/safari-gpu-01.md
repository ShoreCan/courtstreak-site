# Camera Test 22: Safari GPU candidate

6 November 2026. Website candidate only. This source has not been published,
and neither live iPhone FPS nor live counting improvement has been measured.
The native Swift/Core ML app is a separate, saved prototype requiring Apple
build/runtime checks. It does not accelerate the Safari website.

## What changed

- New Test22 routes for right-hand pounds and crossovers. The familiar Test20
  camera setup, user Start, five-second countdown and recording flow are retained.
  Test20 remains the default and has an explicit fallback link on Test22 errors.
- Same pinned 512px ball and 640px body models, crop, Canvas resize and rounded
  letterbox. The resized RGBA canvas is copied to a GPU texture; a compute kernel
  converts it to the model's planar float input. Per-pass CPU getImageData and JS
  RGB conversion are removed from this candidate, not all preprocessing/copying.
- Reusable GPU input/output and staging buffers. Body processing is independent
  of the ball loop with one admitted job per model and no stale-input queue.
  ORT session submission is serialized; subsequent GPU readback may overlap.
  Both models share the physical GPU; no speedup is guaranteed.
- Pose readback normally copies 58,384 bytes instead of 1,881,600. The same .18
  score threshold and existing decoding/NMS remain. Original anchor order is
  restored before stable sorting. More than 256 admitted anchors triggers a full
  readback, never silent truncation.
- A weak, implausibly elongated partial-object proposal can no longer become the
  ball in an active Test22 round. Strong and plausible weak candidates retain their
  original scores. The stricter pound motion rule applies only after three recent
  observations separated by at most 80ms, avoiding extrapolation across sparse
  phone inputs. Crossover weak-motion rules otherwise remain unchanged.
- Ball rings become uncertain after 80ms and disappear after 150ms. Body overlays
  expire after 300ms. An independent timer clears stale overlays while inference
  waits. This removes misleading stale graphics; it does not recover unseen frames.
- Body/ball capture and completion times, provider, execution and policy revisions
  are recorded. Only recent causal body results are used (300ms age limit; active
  crossover capture skew at most 120ms).
- Explicit catalog sequence/prerequisite guidance carried forward from the saved
  native/catalog work. Unvalidated combos and shooting recognition are not enabled.
  These rules are guidance and engine definitions, not proof of visual recognition.

## Verified results and limits

JavaScript regression suite and new GPU lifecycle/admission, crop, compaction,
pose freshness and evidence-configuration checks passed. Production build passed.
See the package verification record for the exact test total and source commit.

The actual WGSL kernels executed successfully on llvmpipe (CPU software GPU):
maximum input normalization difference 5.960464477539063e-08; pose anchors 20,
401 and 7955 retained with identical values. This checks kernel calculations,
not Safari Canvas/ORT prediction parity, hardware throughput or browser support.

Replays below use the same original cached model observations and previously
reviewed reference contacts, one-to-one matching at the unchanged 0.18s tolerance.
No new model inference, live scheduling or latency simulation was performed.

| Clip / input | Baseline matched | Test22 matched | Baseline misses / unmatched | Test22 misses / unmatched |
| --- | ---: | ---: | ---: | ---: |
| 11 / original sparse phone packets | 11/20 | 18/20 | 9 / 0 | 2 / 1 |
| 23 / original sparse phone packets | 23/30 | 23/30 | 7 / 0 | 7 / 0 |
| 11 / cached every-frame packets | 20/20 | 20/20 | 0 / 1 | 0 / 0 |
| 23 / cached every-frame packets | 30/30 | 30/30 | 0 / 0 | 0 / 0 |

Clip11's floor is partly clipped, so reference turning times are approximate.
The sparse candidate total is 19, of which 18 match; its additional 15.503s event
is outside the fixed tolerance. Do not describe that result as 19 correct reps.
The dense baseline extra around 4.998s is removed. Dense results do not establish
achievable phone cadence or perfect live accuracy. Sparse Clip23 still misses 7.

Three archived crossover trials preserve existing totals 19, 29 and 46. They use
the original diagnostic pre-roll and same-frame body poses. The fastest trial's
event objects change despite the same total. No new ground-truth accuracy review
or live independent-pose validation was completed for these trials.

Browser QA verified both new routes, drill navigation and the saved-video
comparison page. The cloud browser has no front camera, so live Start, countdown,
recording, GPU model parity and physical-device throughput remain unverified.

## Next useful check

After the publish script reports successful deployment, use the saved-video GPU
comparison on the actual iPhone, then a Test22 round with original video and test
details saved. The comparison runs sixteen identical frame pairs in alternating
order and reports output parity plus median/p95 paired-pass time. It explicitly
does not call those times live FPS or counted-rep accuracy. A real camera trial
must measure fresh observations, age/skew, recording load and missed/extra events.

The front-camera request still targets 30 camera frames/second. The earlier
reviewed live rounds processed roughly 9.5–9.7 tracking observations/second.
The current candidate has no measured new phone FPS; 30 fresh observations/s is
a target, not an achieved result. No Ball AI private model or counting algorithm
was obtained or used. Keep the default camera unchanged until device evidence
supports promoting the candidate.

## Recovery and publication

The recoverable package includes the exact source bundle, this report, verification
record, raw replay outputs, and the self-contained publish script. Publication
uses a temporary checkout and a normal fast-forward push. It verifies checksums,
commit/tree identity and the current main branch. It never force-pushes or changes
the user's existing selected branch or working files. GitHub Actions must pass
the tracker tests and production build before Pages deployment. A successful push
alone does not mean the camera URL is ready.
