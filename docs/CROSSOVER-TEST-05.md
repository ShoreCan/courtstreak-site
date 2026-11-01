# Crossover Test 05

Base: Test 04 (`76bba06035cf287c63815630f65e72c6f8b83017`).

A brief inconsistent ball-size observation after a proven floor turn previously
discarded the whole transfer. CROSS 03 ignores that observation within the
existing 250ms gap limit. It cannot establish a floor bounce or hand receipt.
Missing floor evidence, same-hand returns, air passes, sustained tracking loss
and late receipts still do not count. Model weights and thresholds are unchanged.

The camera first opens in a user-controlled placement stage. “Phone is set”
starts a separate ten-second interval, with no detection passes or wrist prompts.
Position checks begin only after that interval and model loading. Instructions
are calmer and persist briefly to reduce flicker. The existing five-second
countdown follows valid setup. A short processing dip pauses its place; sustained
loss still resets it and Go still requires fresh framing, ball lock and 10fps.
Failed pre-Go attempts from this page session are summarized in a downloaded
JSON report, without camera pixels or automatic uploads.

Three recorded-video studies found dense counter improvements of 11→17, 14→17
and 29→32. The third required a separately reviewed pre-roll reference; its
unassisted calibration failed. At a newly inferred 10fps cadence, the valid
reference comparisons remained 10→10, 16→16 and 18→18. A broader recovery
prototype was rejected because it lost a rep in the second 10fps study. These
are diagnostic comparisons, not proof of better live phone accuracy. Fast ball
identity, calibration robustness and paired processing throughput need more work.

Validation: 1,910 automated tests passed; 24 portrait-ratio setup layouts at
320/390/592/1024px in light/dark themes had no horizontal page overflow. Synthetic
browser flow verified zero detection calls before placement was armed and at
the beginning of settling; detection began afterward. This does not validate
physical iPhone camera performance. Production build verification is recorded in
the separate release receipt. Private recordings and diagnostic poses are not
included in the repository or deployment.
