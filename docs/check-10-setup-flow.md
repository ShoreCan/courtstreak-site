# CHECK 10 · STUDIO 04

The iPhone walkthrough exposed a confusing setup experience and an unclear
illustration. No video or JSON was retained from that attempt, so its exact
counting failure cannot be reconstructed. This release addresses reproducible
setup problems and a pre-Go timing inconsistency; a new physical iPhone trial
is still needed to confirm the reported failure is resolved.

## Changes

- Replace the disconnected animated ball with a labelled three-step diagram:
  right hand, floor bounce, controlled return to the same hand. A configured
  player video remains optional and falls back to the diagram if it fails.
- Show the camera as soon as permission is granted, before model preparation
  finishes. Commit the visible preview before starting playback; keep video
  and canvas mounted across preparation, setup, countdown and training.
- Show one instruction with frame → ball → ready progress. Hide changing
  landmark diagnostics behind Camera check details. Brief detector flicker
  does not immediately change the displayed instruction; raw fresh checks
  still gate countdown and Go without display smoothing.
- Start ball calibration once body/wrist/floor framing is established, so
  samples collected while approaching the phone do not dominate final setup.
  Brief body-refresh gaps retain calibration; sustained framing loss re-arms it.
- Confirm the right hand before arming this right-hand drill, while allowing
  initial ball acquisition in either hand. Actual rep validation is unchanged.
- Shorten the final position confirmation from 2.25 seconds to 0.9 seconds.
  Required body, wrist, feet, ball ownership, calibration, tracking speed and
  fresh pose evidence remain in place. The five-second countdown is retained.
- Rebase both counter samples and the control validator's hand-history times
  when countdown pauses or Go completes after capture. Previously only the
  counter samples moved, leaving two different time origins.
- Provide retry and manual-timer options after 12 seconds of blocked setup.
  Save setup details before Go, on camera errors, and after an aborted setup.
  Details stay on the device unless the player chooses to share them.
- Remove the jittering body rectangle, retain the detected-ball outline, and
  compact the phone setup screen so the camera and instruction stay together.
- Limit routine React camera updates to five per second. Confirmed count,
  countdown digit and phase changes still publish immediately. Initialize the
  tracking state once per mount rather than constructing unused state on each
  render. No additional inference, model, dependency or runtime theme work.

## Verification and limits

The tracker suite includes saved slow, moderate and fast input regressions,
the earlier shortened fast trial, and new setup/Go cases. New tests cover
right-hand readiness, calibration after approaching the camera, instruction
flicker, specific ball-edge guidance, pauses before Go, shared hand-history
timestamps, and first/final controlled reps using COUNT 08.

Browser review uses sample footage for the phone, desktop and landscape
layouts, guide, countdown, recovery controls and replay. An attempted
scripted native-stream controller check was limited by very low capture
cadence in cloud Chrome; it verified blocked-setup guidance, not a successful
live counting round. The temporary harness is not shipped. Neither this
review nor cached-input replays validate physical iPhone camera accuracy.

COUNT 08, LOCK 10, FRAME 02, pose scheduling/freshness, detector execution,
rep criteria, native recording, counted MP4 export and replay logic are
unchanged. No SQL migration or new account setting is required.

## Install

This patch is incremental from deployed STUDIO 03 (`3aaa1dd`). Apply only
`CourtStreak-CHECK-10-setup.patch` to the current main branch; do not reapply
earlier Studio patches.

```bash
cd ~/Downloads/CourtStreak-Tracker-Lock-02-Review &&
git fetch origin main &&
git switch -c "deploy/check-10-setup-$(date +%Y%m%d-%H%M%S)" origin/main &&
git am --3way "$HOME/Downloads/CourtStreak-CHECK-10-setup.patch" &&
npm run test:tracker &&
npm run build &&
git push origin HEAD:main
```

After deployment, Build details should read CHECK 10 · STUDIO 04. First try
one moderate 20-second right-hand round with the phone on stable floor-level
support. Check that the camera becomes visible during preparation, the
instructions settle, the countdown runs 5 → 4 → 3 → 2 → 1 → Go, and the live
and replay counts agree. If setup stalls, save Camera check details even if
the round never starts; a video is not required for those diagnostics.

## Setup references

HomeCourt's ball-handling guidance emphasizes a visible body and floor;
Dribbleup separates floor-level phone placement from finding the ball. These
are interaction references, not implementations or accuracy benchmarks.

- https://help.homecourt.ai/hc/en-us/articles/9344135747987-My-dribbles-movements-are-not-being-detected-well-in-HomeCourt
- https://help.dribbleup.com/en/articles/9940747-smart-basketball-setup-use
