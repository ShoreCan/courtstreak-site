# Crossover camera test 01

Route: `/courtstreak-site/tracker-tests/crossovers/`. This is a standalone camera pilot. It does not write XP, scores, memberships or videos to the backend. The approved public release remains the base; this branch adds a private test.

One rep is one controlled hand-to-hand transfer through a floor bounce. Right to left is one rep, and left to right is the next. Starting with either hand is allowed. Midline crossings alone, airborne passes, same-hand pounds, loose double bounces and unverified receipts do not count.

The existing camera, mirrored detector input, ball identity, fresh-frame handling, body refresh, countdown, watchdog, timer, recording and video save pipeline is shared with the pound tracker. Crossover setup additionally requires both wrists. Full body, feet, floor, a held ball, a calibrated identity and adequate tracking speed must pass before Go. The active search covers both hands. The default pound configuration is preserved.

The crossover counter requires observed downward movement, a floor turn near the detected feet and opposite-wrist receipt with correlated hand control or the receiving hand's downward redirect. Ball-scaled noise thresholds are used; no knee-height apex is required. Floor and hand contact are estimates from camera observations, not direct physical contact sensors. Missing observations can prevent a rep from being verified. Real iPhone accuracy is unmeasured until recorded trials are reviewed.

## First iPhone trial

1. Open the private test directly in Safari and sign in to the same ChatGPT account if asked. Put the phone on stable support, preferably landscape. Keep your head, both wrists, feet, ball and floor visible. Enable the front camera and hold the ball in either hand until Go.
2. Make 10 deliberate clean crossovers, counting each change of hand once. Hold the ball for the rest of the 20-second round. Let the final review finish.
3. Save the video to your device and open Session details → Save test details. Keep the matching pair and note your actual count, starting hand, phone model and whether any crossover was mishandled. Video stays on the device unless you choose to share it.

After the deliberate round, try a separate normal-speed round. Test a no-bounce pass or loose-ball case separately so the baseline has a known count.

The details file includes build provenance, detector observations and timings, selected ball, physical wrist positions, handoff state, rejection reasons, floor/receipt times and displayed-count timing. Rep replay begins at the release so the whole transfer can be reviewed. To replay the exact saved counter inputs offline:

```
node scripts/replay-crossovers.mjs /path/to/CourtStreak-crossovers-test-details.json
```

Dropped frame records are reported. Offline replay checks counting decisions on saved detector observations; it does not re-run detection on the video or establish real-world accuracy.
