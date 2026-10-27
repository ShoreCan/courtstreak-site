# CHECK 06: synchronize the replay counter and retain brief setup recovery

## Supplied CHECK 05 evidence

The player reported 30 physical reps. The matching JSON has 30 accepted events,
zero rejected events, no discarded frame records, and a finished 20-second round.
Replaying its saved inputs reproduces all 1,422 ball selections/crops and all 30
accepted events. This is retained-input parity, not new physical camera inference.
The exported MOV visibly advances the burned-in count and ends at 30. Its uploaded
copy is 464x960 HEVC with 660 frames; the app metadata reports a 720x1490 AVC
export preserving all 600 native 720x1280 camera frames plus the final card.
The upload is not treated as the original export's byte-identical resolution.

The log records 49,245 ms of MP4 preparation. This revision fixes the immediate
review display; it does not claim to reduce that device's MP4 encoding time.
The full-quality, timestamp-preserving SHARE 03 exporter remains unchanged.

## Replay repair

In CHECK 05 the native recording could become ready at Time, before the result
panel mounted after post-round validation. The parent's effect depended only on
the recording URL/status. It saw no player, returned, and did not run again when
the panel appeared. Rep buttons still sought through their current ref, while
the unconnected visual counter stayed at zero.

CountedReplay now owns the player and subscribes after its element mounts.
The counter reads the saved acceptance timeline during playback and paused seeks,
using native media events when video-frame callbacks are unavailable. It only
emits changed counts and removes listeners/callbacks on unmount. Detection never
runs during replay. Preparing/completing an MP4 leaves the player source, selected
rep and playhead intact.

The counter sits above the full camera picture. Tapping a rep highlights it,
labels the selection, and brings the player into view. Markers retain the existing
350 ms pre-bounce lead-in. The running number changes at the recorded acceptance
time; it is not forced to the selected rep before the return was accepted. Playback
completion explicitly shows the final validated count, including post-round
confirmation. Evidence identifies the review as REPLAY 03.

## Countdown repair

The saved countdown attempts reset at frames 495 and 685. Each combined a ball
recheck with a brief wait for fresh body data; the body refresh shortened the
ongoing 1.5-second detector recovery window to the 0.65-second framing window.
Both attempts reset when valid framing returned.

CAMERA 04 explicitly marks a queued body refresh. Like ball reacquisition, it
pauses progress and allows up to 1.5 seconds to recover. It never advances the
clock or permits Go without fresh, valid checks. The existing 750 ms body-data
limit is unchanged. Observed framing loss, inadequate speed and a 650 ms gap
without new camera observations retain their previous checks. Long detector loss
still resets setup. COUNT 08 / LOCK 09 / FRAME 02 counting and inference are unchanged.

## Verification

- All 1,721 tracker/unit tests pass, including the two recorded countdown resets,
  paused seeks, acceptance timing, old-browser media events and listener cleanup.
- Actual browser session with synthetic detections/native recording: 20 accepted
  reps previously displayed zero at playback time 8.5 s; the repair displays the
  expected 8. Rep 9 selection, subsequent count 9, ordinary playback, export
  completion without rewind, and final count all pass.
- The supplied 30-rep video/timeline were also exercised with the new player:
  reps 1, 9, 20 and 30 display correctly in portrait and landscape, with frame
  callbacks enabled and disabled. All 30 saved acceptance transitions pass unit
  replay. The browser video fixture is cropped/reencoded from the supplied MOV;
  this validates replay display, not a new tracker accuracy or export-speed claim.
- The two earlier countdown attempts retain progress in the saved-check replay;
  invalid observations never advance it. Fresh checks are still required at Go.
- Physical Safari validation of the new display/countdown behavior remains to be
  performed after deployment. The successful 30-rep trial remains the baseline;
  no additional filming was required to reproduce or test these corrections.
