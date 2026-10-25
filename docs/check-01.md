# CHECK 01: next-test software preflight

Prepared October 25, 2026, from main commit `2d84a0e889aab9efe46c348b687aad702cafd23b`.

## Scope and decision

This is a controlled camera-test build using **COUNT 07 / LOCK 08 / FRAME 01 / CHECK 01**. It fixes version selection and diagnostic/release problems. The ball/pose weights, trajectory thresholds, bounce logic and control acceptance rules are unchanged. The unvalidated confirmed-anchor counter experiment is excluded.

Software preflight passes; dependable paid-release accuracy remains unestablished. The newest saved round still returns 36 accepted events against the earlier 40-bounce review. This package does not claim to recover those four misses. Do not present it as a measured accuracy improvement, a trained model, or a completed iPhone/iPad/Mac validation.

## Changes

- Both camera URL modes resolve to the current experimental tracker. The normal drill-page AI button uses the same canonical URL. COUNT 03 remains available for explicit historical diagnostics, with no public camera entry selecting it.
- Live initialization and countdown reset use one version-aware state/counter factory. Frozen settings are also resolved explicitly by the replay tool; missing or contradictory identity settings are reported as unavailable rather than guessed.
- Each saved frame can include the selector's candidate index, selected/rejected/not-selected status, and first rejection reason. The round retains raw proposals, poses, crop, timestamps, proposed events, confirmed events, rejected and pending events. These records are software decisions, not independent physical truth.
- Saved details include the actual Git head when known, dirty-working-tree status, source-file fingerprints, build time, model manifest, browser/provider and camera-start settings. A source snapshot without Git reports an unknown commit. Build-time model bytes must match their manifest hashes. The manifest is not a claim that browser runtime bytes or physical-device numerics have been separately verified.
- The new pattern-audit command separates absent proposals, detections without selection, rejection reasons, accepted paths, display/event discrepancies and capture intervals. It reports historical and current cached-input results separately and marks incompatible crops as requiring new inference.
- Deployment runs the tracker test suite before the build/artifact. Pull requests also run validation; deployment is restricted to main and excludes pull-request events. Repository branch-protection settings were not changed.

## Executed checks

- Entire Node suite: **1,443 passing**. This includes the existing counting, low-pound, stationary-ball, unbounced-transfer, missing-control, timing, deadline, interruption and export checks plus configuration, provenance and diagnostic-parity checks. These are software checks, not 1,443 live basketball trials.
- Clean locked dependencies installed. Production build succeeds with Vite **8.3.5** and Node **24.22.1**. CI remains configured for Node 20; a hosted run after publication is required to confirm that environment. The existing unresolved `court-hero.jpg` build warning remains unrelated to the tracker.
- Diagnostics enabled versus disabled retain the same accepted times, paths, proposal totals, selection changes and crops across twelve complete existing fixture logs.
- Five complete private supplied logs reproduce all **4,932** historical selection decisions, zero crop mismatches and their saved accepted timestamps. Under current settings their accepted totals remain **15, 15, 15, 35, 36**. No private recordings or new private fixtures are included in this patch or its publication list.
- Build fingerprints identify changed source and uncommitted changes; corrupt/mismatched model bytes stop the build. Unknown counter/identity revisions and conflicting saved flags are rejected. Historical recordings with discarded initial inputs cannot claim exact replay.
- The patch installer is checked for dry-run behavior, exact file guards, idempotent installation, rollback and refusal of conflicting changes. The publishing wrapper is checked in a disposable repository/local remote so it can preserve unrelated working and staged changes while publishing only its file list.

## Not completed here

A native browser rehearsal with a synthetic camera/detector was attempted. The local browser binary download failed, and the separate available cloud browser could not reach the localhost test server. No browser-rehearsal success is claimed. Physical camera behavior, Safari execution, actual device latency, heat and camera/recording contention require the controlled iPhone test. No live deployment was performed from this workspace.

The four newest missed contacts, older sampling sensitivity and uncertainty after missing floor observations remain accuracy work. In particular, recurring background-memory vetoes should be evaluated against source-aligned ball/contact labels and successful controls; logging a rejection does not prove it was wrong. Do not relax control checks merely to increase totals.

## Next device check

After publication and a successful hosted workflow, open Right-Hand Pound and its AI camera option. Confirm **COUNT 07**, **LOCK 08** and **CHECK 01** before recording. The previous `iphone-vision-test` link is a compatible alias for this same current test.

Use one 20-second right-hand-pound attempt with a natural stance and visible body, ball, feet and floor space. Do not change your rebound height to satisfy the tracker. Retain the **original recording** and matching **test-details JSON** from that same attempt; a reduced counted-video export is optional. The original is needed for pixel-level investigation. Review physical contacts independently from the displayed number. No extra random recordings are requested.

The round records locally. No video uploads automatically, and this camera test does not change XP, streaks or Circle standings.

## Reproduction

```bash
npm run test:tracker
npm run build
node scripts/replay-ball-lock.mjs /path/to/test-details.json
node scripts/audit-round-patterns.mjs /path/to/first-details.json /path/to/second-details.json
```

The audit commands execute saved observations, not the neural detector on newly decoded video. A nonzero replay/audit exit status indicates unavailable or incompatible comparison evidence; do not treat its counts as a successful full-pipeline validation.

## Development log CHECK-01

Problem: the main AI button selected an older engine, export source identity was stale, replay defaults were not the current configuration, saved selection reasons were absent, and deployment did not run regression tests.

Change: align entry points and factories; add honest source/configuration identity and decision logging; provide repeatable JSON comparison; require software tests before deployment. Previous results and historical algorithms are preserved. No counting-accuracy gain is claimed.

Remaining: physical-browser/device checks, hosted CI after publication, independently labeled current event evaluation, untouched generalization evidence, and a validated fix for the latest four misses. The next accuracy investigation remains the loss of ball evidence near fast floor turns, with detector absence separated from identity rejection and downstream acceptance.
