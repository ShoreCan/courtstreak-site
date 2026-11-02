# November 2 second-crossover correction

This review follows the original November 2 session review. The local shared
counter is now CROSS 04; the crossover camera badge is Test 10. It is unpublished.
The pound counter and detector/identity settings are unchanged.

## Exact failure

The original dense native diagnostic lost the second crossover. At source time
2.601667s, the held/releasing ball diameter was 165.84 pixels. At 2.668333s the
selected partial box measured 107.64 pixels: about 0.649 of the release size,
just below the existing 0.65 lower size bound. CROSS 03 discarded the flight
because no floor turn had yet been established. It therefore could not count
the later observed floor turn at 2.735s and opposite-hand receipt at 2.901667s.

This is a counter-state failure, not proof that the phone missed for the same
reason. The matching phone JSONs remain unavailable.

## Shared correction

CROSS 04 treats an out-of-size measurement as missing during descent as well as
after a verified floor turn. It does not use that measurement as a floor sample,
receipt, or new motion anchor. The existing 250ms observation gap and the required
observed floor turn and opposite-hand control remain unchanged.

A broader cached comparison exposed an additional consequence: carrying a flight
across an unseen bounce can leave the wrong releasing hand attached to the next
rep. CROSS 04 therefore reacquires verified opposite-hand possession without
awarding a rep when the floor turn was never observed. The following crossover
must establish its own bounce. This preserves the previously counted event in
the older IMG_1765 baseline that the initial candidate lost.

Historical CROSS 01–03 retain their prior behavior. The live session factory and
recorded-evidence replay import the same versioned counter. The correction is in
the production source, not a separate diagnostic-only counting rule.

## Evidence and limits

On identical cached dense observations of today's crossover recording:

- CROSS 03: 19; CROSS 04: 20. Only the second rep is added.
- The second receipt is timestamped 2.901667s and confirmed at 2.970s, after
  observed hand control. The comparison video advances at confirmation time.
- No floor bounce is reconstructed or inferred from the skipped partial box.
- The coarse cached replay remains 17/20. Counter recovery does not supply
  missing model observations or establish faster on-device inference.

Seven other cached comparisons retain every previously confirmed floor event.
Two older IMG_1764 observation sets each add one distinct crossover. Supporting
frame review of the earlier counted recording shows the corresponding real
floor contacts near source 7.10s and 11.20s. That older recording has a baked-in
diagnostic HUD; it is supporting evidence rather than a clean new device trial.

The pound replay still counts 35/35. Its appearance warrants further work:
six confirmations occur about 0.47–0.51s after the estimated floor timestamp,
while the median is about 0.13s. There are no multiple-event emission frames,
but some successive confirmations occur about 0.10s apart. These are measured
desktop-replay timings; a floor timestamp is not a hand-receipt timestamp.
The numerical total alone does not demonstrate clean real-time behavior.

1,934 automated tracker tests and the production build passed. Focused tests
include the actual second-rep wrist/ankle measurements, pre-floor outliers,
unseen floor turns, missing-observation limits, deadline enforcement, passes,
same-hand pounds, missing feet, and reacquisition before the next valid rep.

## Next test

Use the exact shared browser detector, coordinate convention, tracker configuration,
and observation schedule for a device replay and live camera comparison. Compare
each rep's release, bounce, receipt and confirmation time, alongside captured-frame
cadence and pose age. Do not compare only final totals. The matching phone JSONs
are needed to diagnose the two actual phone sessions. Physical Safari throughput,
the complete startup flow, and live accuracy remain unverified.
