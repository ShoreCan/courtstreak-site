# Camera setup and round review 01

Starting public version: `6995ad2d34e954dc82268aeab626f3c40b68fcfb` (BG FIX 01).

## Evidence and scope

On 2026-10-19, the user reported completing 20 slow-to-medium right-hand dribbles on an iPhone and receiving a count of 20. `IMG_1993.png` shows 20 detected reps and 98% ball tracking coverage. The screenshot is not a video verification of each rep, and ball coverage is not counting accuracy. This establishes one successful, user-checked run in that condition, not accuracy across speeds, movements, or devices.

The user reported repeated countdown restarts. The existing component resets immediately after any invalid position, speed, or ball-lock check. The screenshot contains no frame-level readiness log, so the specific check that flickered on the phone is unknown.

## Changes

- A 0.65-second grace interval pauses readiness progress and the countdown through brief detection flicker. Valid observations advance the clock; invalid observations do not. Sustained loss or a gap in observations requires a new setup. Go requires current valid position, ball lock, and speed checks. The grace interval is a trial setting, not a measured optimum.
- Keep pre-Go measurement timestamps aligned when a countdown pauses. Detector selection, active-round timestamps, bounce logic, hand control validation, and scoring rules retain their starting implementation.
- Record the existing camera stream locally from Go until the 20-second training timer ends. A separate stop timer also stops recording independently of inference completion. The existing two-second counter review remains unchanged and is not part of the recording. Recording failure leaves the counter available and shows video as unavailable.
- Replace the empty end-screen camera placeholder with a score card and native video replay controls. Add device save, an explicit download fallback, native video sharing, and the existing text-summary sharing component. On compatible phones, saving opens the native share sheet so the user can select an available save destination.
- A retry or unmount discards an unsaved clip and revokes its object URL. A stopped round can have a partial clip and is labeled incomplete.

No detector, model, preprocessing, proposal filtering, ball-selection, bounce-counter, or hand-validation changes. No Mac-pilot integration, dependency, paid service, backend change, XP award, or leaderboard posting. Native sharing does not upload to the in-app Circle feed. The prior 20-rep run cannot be recovered as a replay because that version did not record it.

## Validation

`node --test tests/camera-readiness.test.mjs tests/drill-recording.test.mjs`

13 checks cover short flicker, sustained loss, stale observations, the Go boundary, preserved position progress, pre-Go timestamp alignment, codec fallback, final video data, canceled recordings, missing recording support, recorder errors, and empty clips.

`npm run build` validates the production bundle. An existing unresolved hero-image warning is outside this change.

Unchanged files (SHA-256):

- `src/lib/ai/poundCore.mjs`: `2bb26bdae41146ef0054829c32d084286d994c60edc897e8f897983384dc3d29`
- `src/lib/ai/iphoneDetector.mjs`: `0969ff09d06bd9efcdf3fc5016b5bee18912ab7f6c7c148c33d8e8bec7fd8231`
- `public/ai/models/manifest.json`: `9b54cf390e00c6763e41dadb1f0e0edc399e2087d3f91d6c5613d50fa3bb9fe5`

This environment has no supported browser-control skill or physical iPhone camera. The checks use simulated readiness and recorder inputs; they do not verify Safari encoding, playback, save-sheet options, visual layout, or the combined recording/inference speed on an iPhone.

## Next live check

After publication, confirm BG FIX 01 and CAMERA 01. Repeat 20 slow-to-medium right-hand dribbles, then hold still until the round finishes. Check countdown behavior, count, extra counts while holding, replay playback, and saving the video. This repeats the successful condition with recording enabled before expanding to faster dribbles or other movements.
