# CHECK 07 candidate: reduce counted-export work and measure its stages

The supplied CHECK 05 30-rep round recorded 49,245 ms of counted MP4 preparation.
It supplied no per-stage export timings, so it does not identify decoding,
rendering, encoder throughput, timer throttling, memory pressure or temperature
as the cause. No further live recording is required to prepare this candidate.

## Export changes

- Every original camera frame still uses its original presentation timestamp and
  duration. The picture dimensions, full-frame layout, bitrate policy, H.264
  quality mode and accepted-count timeline remain unchanged.
- The final graphic was rendered once, then encoded about 60 times at 30 FPS.
  SHARE 04 encodes one static picture with a two-second duration. A 600-frame
  camera clip therefore has 601 encoded samples rather than 660. The camera
  portion still contains all 600 frames at its original 30 FPS; the file's overall
  average frame rate is lower because the static card has one long sample.
  This is variable-duration MP4 timing, not discarded action footage.
- A worker no longer adds a UI timer pause after every eight camera frames.
  Decoder iteration and every encoder submission still await capacity. The
  main-thread compatibility fallback retains those pauses for page interaction.
- The fully covered output canvas requests an opaque surface instead of retaining
  an unused alpha channel. Count/ball detection never runs during export.
- Export metadata records the execution context and elapsed initialization,
  sample-read wait, rendering, encoder-submit wait, explicit yield wait, final
  card and finalization stages. These are elapsed pipeline groups, not isolated
  hardware utilization, thermal or battery measurements.

The pinned Mediabunny API accepts explicit sample durations and requires awaiting
encoder/writer backpressure ([CanvasSource](https://mediabunny.dev/api/CanvasSource)).
The retained WebCodecs quality mode requires preserving submitted frames
([WebCodecs latency mode](https://www.w3.org/TR/webcodecs/#enumdef-latencymode)).
No library update or forced hardware/software codec preference is introduced.

## Offline verification

- All 1,724 tests and the production build pass. A built export worker returns
  SHARE 04, all 600 camera frames, one held result frame and zero UI-yield wait.
- Alternating worker exports of the same native 20-second, 600-frame reference,
  after a warm-up for each version: six baseline and six candidate samples.
  Median preparation including worker startup was 2989.25 ms / 2929.55 ms,
  approximately 2% lower here; mean 2972.53 ms / 2908.42 ms. Some pairs regressed,
  so this is a small, variable host result rather than a proven iPhone speed gain.
- Both outputs are H.264 at 720x1490 with the same 5,364,000 bps requested bitrate
  policy. FFprobe verifies all 600 camera timestamps match between versions.
  The candidate's last sample begins at 20 s, lasts exactly 2 s, and the MP4 is 22 s.
- Actual HTML video playback from 19.9 s to the end took approximately 2.101 s and
  ended at 22 s, confirming that the still card remains visible for its duration.
- Camera-region SSIM against the same decoded native source was 0.984284 baseline
  and 0.984287 candidate in this run. Encoded files are not byte-identical; the
  measured camera quality is effectively the same here, not a lossless claim.
- The main page continued receiving timer heartbeats while the worker exported.
  Unit coverage checks source timestamp preservation, single held-card duration,
  worker backpressure, fallback UI yields, cancellation during camera/card work,
  and source-frame disposal.

Counting, body inference, countdowns and immediate replay use the existing CHECK
06 implementation. Apple-device export/playback performance remains unverified
for this candidate. The 49-second iPhone wait is not claimed to be solved. A saved
preview uses the earlier native 20-rep recording and its matching acceptance
timeline; it is an offline reference, not a new 30-rep or live-camera trial.
