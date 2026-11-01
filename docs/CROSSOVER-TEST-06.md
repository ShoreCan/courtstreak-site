# Crossover Test 06 — Start on your time

Base: Test05, ec61c085880cbffc8777af09c316042e2b47b542.

Opening the AI tracker requests its front-camera preview automatically. Safari
still controls permission; if it requires a tap or access was denied, an explicit
Allow camera button offers a retry. CourtStreak does not record permission in
local storage or change browser settings.

The preview waits indefinitely for Start. It performs no ball/body detection
and shows no position commands before that tap. Start begins position checks
when models are ready, followed by the existing five-second countdown. The
mandatory ten-second placement timer is removed. Phones keep Start within the
compact preview layout; the full camera picture uses contain rather than crop.

A healthy camera preview is reused between completed rounds; recording still
starts only at Go and stops at Time. The result screen identifies the retained
camera and offers Turn camera off. Backgrounding, leaving the tracker, an
explicit stop or a camera failure releases it. A track ending after completion
does not replace the saved result with an error. Pre-Go backgrounding resumes
to the preview and requires Start again. Pending camera requests share one
promise, and streams granted after cancellation are closed.

The CROSS03 counting correction, model weights, readiness thresholds and rep
rules are unchanged. This release improves setup control and camera lifecycle;
it does not establish improved live crossover accuracy.

Validation: 1,915 tests passed, including camera reuse, request deduplication,
pending-request cancellation, permission retry and reacquisition of ended tracks.
Synthetic browser checks cover automatic preview, zero detection before Start,
immediate checks after Start, denied-permission recovery, and release on exit.
Production build and browser results are in the separate release receipt.
Physical iPhone Safari validation remains pending.
