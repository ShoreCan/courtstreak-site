# CHECK 04: preserve the recording and export source frames faithfully

## Evidence from the October 26 rounds

CHECK 03 produced two finished 20-second attempts displaying 19 and 25 reps.
The fastest attempt was interrupted at elapsed 15.195 seconds, showing 31 reps.
Its recorded trigger was the rolling tracking frame rate falling below 8 FPS
(final observation: 7.425 FPS). The detector still selected the ball on the final
observation. Ball-model time rose from roughly 27 ms to 73 ms and pose-model time
from roughly 70 ms to 192 ms near the end. These logs establish the throughput
loss and interruption trigger, not its underlying thermal, power or contention
cause. Counted exports were 464 by 960 and roughly 12–14 FPS. The originals from
these rounds were not supplied, so the export cannot be blamed for every missing
frame in those files.

## Recording lifecycle

Reliability stops still freeze the partial count. When an active native camera
recording is healthy, the remaining recording continues until its original
20-second deadline without running detector inference. The camera view labels
the frozen count as partial. Manual stop, backgrounding, camera loss and rotation
still stop the recording immediately. The result remains incomplete: a longer
video never upgrades the count to a validated full-round score. JSON includes
the counting-stop time, recording deadline time and interruption reason.

## Share video

The live UI now uses an offline, backpressured WebCodecs export through pinned
Mediabunny 1.62.1. Each original presentation frame is decoded and submitted to
an H.264 MP4 encoder with its media timestamp/duration; no animation-frame screen
recording or real-time canvas capture is used. Source frames are not upsampled.
Graphics remain outside the complete camera picture, preserving hands, ball and
floor. Encoder processing may take longer instead of skipping source frames.
The existing two-second final card stays separate from the 20-second recording.

Export starts after tracking/camera stop. It uses a dedicated worker where the
needed codec APIs are available and the same offline encoder on the main thread
when worker codec APIs are unavailable. Encoding/decoding failure leaves the
original recording available and provides a visible error, rather than silently
substituting a degraded counted export. Export metadata reports resolution,
source/encoded frame counts, source timing and requested bitrate.

Native recording prefers an explicit H.264 MP4 codec. In Chromium testing,
generic MP4 selected VP9 with a level-00 codec string that HTML video played but
WebCodecs rejected. Explicit H.264 produced a source that the offline decoder
accepted. Existing native recording fallbacks remain.

## Validation and limits

- 1,704 tracker/unit tests pass, including encoder backpressure, variable source
  timestamps, cancellation, unavailable codecs, full-picture layout and recording
  deadlines. Counter/model/identity rules remain COUNT 08 / LOCK 09.
- Actual browser worker export: all 600 original 30-FPS frames preserved from a
  20-second reference, plus 60 end-card frames. MP4: 720 x 1490, 30 FPS, 22 seconds.
- FFmpeg inspection confirmed H.264, frame count, dimensions and duration. Visual
  inspection confirmed that the original picture remains fully visible.
- Actual browser UI with a simulated slow detector: partial-count state shown,
  native recording retained until 20 seconds, counted export completed at
  approximately 22.006 seconds including the final card.
- Physical Safari/iPhone/iPad export remains to be verified. This does not
  establish improved maximum-speed counting, identify a thermal cause, recover
  frames absent from old exports, or guarantee identical hardware throughput.
