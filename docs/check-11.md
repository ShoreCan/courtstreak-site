# CHECK 11 — smoother camera setup

Incremental fix from live CHECK 10 / STUDIO 04 (`7abf3ce`). The unpublished
Studio 05/06 redesign is excluded. The existing page layout remains STUDIO 04.

## Reproduced problem

The supplied successful 20-rep trial waited 86.512 seconds from the first setup
frame to Go. Its countdown began after 69.808 seconds and took 16.704 seconds.
Body-worker refreshes accounted for approximately 42 seconds of setup observations.
The saved movie contains the active round, not the setup, so lighting during setup
cannot be assessed from that movie.

Independent body results took about 395ms at the median. The existing pose age
limit and worker rest interval periodically produced refreshing-body observations.
Treating every such frame as a countdown pause stretched the clock. The same
refresh cues also kept interrupting the instruction debounce, preventing stable
framing directions from appearing promptly.

## Changes

- A setup-only clock bridges at most 650ms after a fully verified position while
  the selected ball, calibrated identity and throughput remain healthy.
- Bridging advances time only. Setup confirmation and Go still require fresh,
  valid body/wrist, right-hand and ball evidence. Observed framing failures,
  missing balls, lost calibration and slow throughput stop bridging immediately.
- A refresh cannot extend the existing 1.5-second body recovery window. Camera
  gaps and fresh setup/reset/rotation clear progress as before.
- The last digit waits for fresh verification. Expected Go time and all pre-Go
  counter/hand context move together; no pre-Go sample can become a positive-time
  rep while waiting for the final check.
- Normal queued refreshes no longer overwrite useful instructions or continually
  reset their debounce. Confirmed new framing problems still replace the cue.
- Future JSON exports include setup timing decisions, speed/lock readiness and
  the setup-clock revision to distinguish user positioning from processing delays.

No extra inference calls, faster worker schedule, model changes, pose age
relaxation, counting criteria, camera recording or video export changes.

## Validation and limits

- Full tracker suite: 1,783 passed; seven new regressions cover asynchronous
  refresh cadence, all blocking prerequisites, stale/failing body work, camera
  gaps, resets, pre-Go timestamps and stable guidance.
- Exact replay of the supplied recorded trajectory reproduced all 1,290 ball
  selections and crop requests, all 20 accepted reps and their event times.
- Starting from the recorded countdown, the new clock reached verified Go in
  5.567 seconds on the same saved observations, compared with 16.704 seconds.
- Separate replay of the setup prefix reached first position confirmation much
  earlier. These comparisons cannot be added to predict a new complete round:
  an earlier countdown changes player behavior and later detector crops.
- Production build and exact patch application are checked during packaging.

Saved observations are not a new live camera/model run. An iPhone setup test is
still required after deployment. Raw uploaded trial files are not in this patch.

## Apply on the Mac

Download `CourtStreak-CHECK-11-startup.patch` into Downloads, then run:

```bash
cd ~/Downloads/CourtStreak-Tracker-Lock-02-Review &&
git fetch origin main &&
git switch -c "deploy/check-11-$(date +%Y%m%d-%H%M%S)" origin/main &&
git am --3way "$HOME/Downloads/CourtStreak-CHECK-11-startup.patch" &&
npm run test:tracker &&
npm run build &&
git push origin HEAD:main
```

Apply only this CHECK 11 patch, without either redesign patch. Build details
should show CHECK 11 · STUDIO 04 after deployment.
