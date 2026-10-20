# PROFILE 01: measure the live detector on a saved clip, on the phone

The live target is a complete 20-second round with reviewed fast-dribble
counts and no extras during held-ball negatives. Offline counter matches or
lower setup friction do not establish that target. Today's recordings are
sufficient for the next processing experiment; no further filming is needed.

## Execution order

1. Run the saved-video processing diagnostic on the same iPhone and browser.
2. Identify the measured expensive stage; change that stage alone and repeat
   the identical-frame comparison before deciding to keep a runtime change.
3. Recheck startup and counting together after runtime evidence supports the
   candidate. Ultimately verify full live rounds and false-count negatives.

CAMERA 02's offline setup/memory candidate remains separate. This diagnostic
is built directly on the currently published COUNT 03 / PACE 01 source:
`850e140a57bde88b7c031bef47142e42e03f08e6`, tree
`0e95cc3da1884fb251e64146383489945869c07c`.

## What this update does

An additional explicit camera-lab mode accepts a saved video and matching
CourtStreak test-details JSON. It uses the same `loadDetector`, existing ONNX
sessions, model manifest, execution provider, confidence thresholds, decoder
and crop geometry as live tracking. Its default input preparation remains the
published allocating/resize implementation. Reused input storage is selected
only for the paired diagnostic calls. No new dependency or service is added.

Live setup, PACE 01 scheduling, ball selection, COUNT 03, wrist/knee control,
recording, countdown and stop guards remain byte-for-byte unchanged. This
update is diagnostic tooling, not a claim of better live counting or speed.
Only the explicit `mode=recorded-profile` route opens the new interface.

## Protocol

- Require the video and frame log from the same attempt. Validate frame
  dimensions, active samples, crop bounds and video aspect/duration. Shape
  checks help catch mismatches but cannot prove file identity; save SHA-256
  fingerprints for both chosen files in the report.
- For VIDEO 01 counted exports, map the complete picture region using the
  existing layout and exclude the two-second score card. Originals use the
  whole picture. Format detection also works when Photos renames a file.
- Restore the recorded 1280px-wide frame and mirror once, as the live input
  does. Compression/rescaling cannot restore the original detector pixels.
- Select 24 uniformly spaced active-log frame indices (fewer if the log has
  fewer samples). Use each sample's recorded crop and pose flag. The schedule
  is fixed for both variants, not chosen according to their detection results.
- Warm both input paths, then freeze one decoded canvas for each comparison.
  Run legacy/reuse or reuse/legacy in alternating order, on the same sessions.
- Retain per-stage preprocessing, model-run and decoding timings, model boxes,
  scores/keypoints, requested/element times, sample IDs, crop and pair order.
  Seeking/decoding/snapshot time is recorded separately from detector time.
- Output parity uses predefined 0.1px coordinate and 1e-5 score tolerances,
  including person keypoints/confidences and the complete kept ball proposals.
  A failed parity check prevents marking the timing comparison usable.
- Report distributions for ball-only and pose-inclusive calls, not a claimed
  live FPS. The model-run stage includes tensor setup, provider submission/wait
  and output transfer, not GPU kernel time alone.
- Cancellation, backgrounding, decoding failures or incomplete timings do not
  produce a completed or partial-success report. Detector resources release
  after pending work returns. Double taps cannot start concurrent runs.

The page requests no camera, records nothing, uploads no video, saves no XP and
posts no training results. It reads files selected by the user and downloads
a numeric JSON report only when the user taps Save processing details.

## Counter check

The same `GapAwareBounceCounter` and `PoundControlValidator` separately replay
the selected balls and poses already saved in the JSON. This is a cached-input
consistency check, not counting new model outputs from the decoded video.

The five-count log reproduces 4 fully logged confirmations and explicitly
reports 1 displayed event missing from the old terminal frame. It does not
invent that event. The 20-count log reproduces all 20. The earlier BG FIX 01
19-count log gives the already established COUNT 03 offline result of 20;
that revision difference is reported, not hidden as a match to the old phone.

## Validation actually executed

- All 70 tests and the Vite production build pass. Existing unresolved
  `court-hero.jpg` warning remains. Browser/iPhone execution was unavailable.
- Actual five-count video/log geometry and all 24 sample specifications were
  validated. The schedule includes 8 pose-inclusive pairs.
- On the actual saved video, 32 model-input comparisons checked 28,704,768
  Float32 values plus transforms between the published and reuse paths; every
  value matches using the installed Linux native-canvas implementation.
- Actual three-log cached counter replays produce the results described above.
- Tests verify identical snapshots/crops/pose flags, balanced pair order,
  score-card exclusion, bad-file rejection, output-parity failure, cancellation,
  background invalidation, decoding failures and delayed frame-data readiness.
- Timing orchestration tests use test doubles; their artificial durations are
  not device performance measurements. No phone profile has been executed yet.

## Device step and decision

After deployment, open the diagnostic on the iPhone:

`/lab/drill/right-hand-pound/session?mode=recorded-profile`

Choose today's five-rep counted video and its five-rep test-details JSON. Tap
Run saved-video check, keep the page visible, then Save processing details.
Send `CourtStreak-recorded-profile-01.json` for analysis. This requires no new
dribbling attempt. Installation uses the guarded Mac publisher included with
the review package; it publishes from the existing authenticated repository.

KEEP the diagnostic for gathering device evidence. Do not declare the reuse
candidate or setup update a live success yet. Before another counting change,
review the phone's per-stage distributions, paired output parity and variance.
A tiny or inconsistent improvement does not justify claiming the lag is fixed.

Saved-video inference excludes live camera/recording contention, original
capture cadence and thermal history. A good diagnostic result must eventually
be followed by a short, controlled live verification when the user is ready.
Other dribble movements still need their own reviewed evaluation evidence.
