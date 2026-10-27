# CHECK 08 candidate: recover from unavailable export workers

## Reproduced problem

CHECK 07 rejects a counted export if the worker constructor throws, the worker
script fails to load, or its codec capability checks fail despite the same codec
being usable on the page. The main-thread exporter already exists, but only a
missing worker API triggered that path. In a browser test with the retained
native 20-second recording, blocking worker construction reproduces a
SecurityError before any output. This is an injected compatibility failure;
the supplied iPhone logs do not identify it as the cause of their export wait.

## Change

The client terminates an unusable worker before trying the same full-quality
exporter on the page once. It handles unavailable/blocked worker startup,
script-loading errors before frame progress, message-start failures, and explicit
decoder/encoder/rendering capability failures. Capability errors are distinct
from invalid frame data or other encoder errors. No lowered bitrate, frame
skipping, codec/model upgrade or simultaneous worker/page export is introduced.

The page path retains its cooperative UI yields. Abort is checked before creating
a worker and before entering the fallback. Abort during fallback rejects promptly;
the encoder receives the same abort signal for cleanup. Detached/late worker
messages cannot launch another export, change progress or replace the result.
A worker failure after frame progress and ordinary data/encoding errors remain
explicit failures, rather than repeating an expensive export. An unsuccessful
page fallback also reports failure and leaves the original available.

Successful fallback metadata records workerFallbackReason alongside SHARE 04's
executionContext and pipeline timings. The ordinary worker path remains active
when supported. Counting, readiness, body inference and replay are unchanged.

## Offline validation

- All 1,735 tests and the production build pass. The built worker exports all
  600 source frames normally and explicitly requests a fallback when its AVC
  capability is disabled.
- Eleven client lifecycle tests cover blocked startup, script failure, explicit
  codec fallback, message failure, duplicate messages, early/active/fallback
  cancellation, successful workers, failed page encoding and no repeat after
  worker progress. Existing exporter tests cover sample timing/disposal and
  page yielding.
- An actual browser export of the native 20-rep source succeeds with blocked
  construction, an intentionally crashing startup script, and a worker with AVC
  encoding support disabled. Each output reports 600 source/encoded camera
  frames, one two-second card, H.264, 720x1490 and 22 seconds. All play and seek
  at 1, 9, 19.9 and 21.9 seconds. The ordinary case remains in the worker.
  Page timer callbacks continue during fallback; this is not a device power test.
- The same browser test cancels a running page fallback after 20% progress and
  receives AbortError instead of a completed clip. The original remains present.
- Independent FFprobe inspection checks output dimensions, all 601 samples and
  full duration. All 600 camera presentation timestamps match the native source.
- All six supplied JSON rounds reproduce their accepted counts, accepted event
  times, selected balls and requested crops: 19, 19, 20, 25, 30 and partial 31.
  This retained-input check does not run a new detector or repair missing camera
  observations. In particular, the known missed-rep log still reproduces 19;
  its gap-recovery evidence remains covered by the CHECK 05 fixture.

These changes do not claim faster iPhone export, a resolved 49-second wait,
improved live count accuracy or physical Apple-device validation. CHECK 07 is
the deployed baseline until this candidate is applied and deployed.
