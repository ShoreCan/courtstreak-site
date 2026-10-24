# COUNT 06: earlier confirmation of clear pounds

COUNT 06 keeps LOCK 05 and the original eight-future-observation minimum. It can evaluate a clear, fully observed floor turn before COUNT 05's half-second wait has elapsed. Early proposals must be clean full pounds and already satisfy the control validator's return-amplitude thresholds. Uncertain turns retain the original longer window. Ball identity, amplitude, floor, hand, knee, deadline and mishandle validation thresholds are unchanged. This does not increase camera FPS or add a detector model.

The experimental `iphone-fresh-frame-test` route selects COUNT 06 at initialization and countdown reset. The ordinary `iphone-vision-test` route remains COUNT 03. Both use a shared revision-aware counter factory. Saved-video counter replay now resolves COUNT 03/04/05/06 from the saved revision; unknown revisions are explicitly unavailable rather than silently using COUNT 03. Missing accepted-event logs are reported as unavailable comparisons, rather than being treated as empty ground truth.

## Offline results

All 1,173 Node tests pass: 708 previous checks, 12 replay-parity checks and 453 early-confirmation checks. The new checks cover known synthetic bounce contacts across speed, sampling rate, size, phase and noise; holds; restarts; mixed cadence; missing data; absent pose; missing hand return; above-knee motion; vanished balls; and deadlines.

Across eight saved detection/pose traces, COUNT 06 / LOCK 05 preserves every accepted contact timestamp and validation path from COUNT 05 / LOCK 05. This preserves known weaknesses too: the older partial fast trace still produces 11 accepted events. Preserving a total does not establish real-video accuracy.

For `oct22-count05-fast25`, both versions accept all 25 independently reviewed contact windows. Median captured-frame confirmation delay falls from 540 ms to 439 ms (101 ms, about 19%). The 95th percentile falls from 626.8 ms to 527.8 ms. These are cached-input replay measurements, not new physical-phone measurements or screen-paint timing. Other traces improve less, and one does not improve.

The saved COUNT 05 / LOCK 04 inputs reproduce 24 accepted events. LOCK 05 recovers the previously missed contact; COUNT 06 retains that correction. The compact fast fixture omits its accepted-event log, so its replay cannot claim exact equality against that missing log.

## Reproduce

```bash
node --test tests/*.test.mjs
node scripts/audit-tracker.mjs tests/fixtures/ball-lock/oct22-count05-fast25.json
npm run build
```

To audit all eight existing fixtures, omit the JSON argument. To inspect another saved attempt, pass its test-details JSON path. This reads detections and poses already saved in that file; it does not rerun the ball model on original video pixels or train a model.

## Phone check

After a successful Mac build and deployment, open the experimental route:

`/courtstreak-site/lab/drill/right-hand-pound/session?mode=iphone-fresh-frame-test`

Confirm COUNT 06 and LOCK 05 are shown before testing. Perform one short slow, normal and maximum-speed attempt; save each original recording and matching test details. Include holds or transfers in a separate attempt to check false counts. Actual iPhone/iPad testing and a new production build have not been performed in this workspace. Do not infer support for other drills or readiness for paid launch from these results.
