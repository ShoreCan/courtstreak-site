# November 2 phone-session review

## What is verified

The public GitHub source checked on November 2 is Test 05, commit
`ec61c085880cbffc8777af09c316042e2b47b542`. It still includes the mandatory
10-second placement buffer. The previously prepared preview/Start and camera
reuse changes had not been published.

Visual review of the new recordings finds 20 completed crossover transfers and
35 right-hand pounds. The saved phone results are 14 and 33 respectively.
The crossover attachment is original footage. The pound attachment is a counted
export; diagnostics crop the graphic bands using the existing export layout,
so its pixels have already been encoded and scaled.

Both matching JSON attachments failed to arrive. Direct recovery of the new
references returned not found; exact-title search did not resolve matching
current copies. No phone JSON was read or used. Exact phone model cadence,
provider, pose delay, setup resets, and rejection decisions remain unverified.

## Startup and playback correction

This branch retains the published Test 05 counting rules and model bytes.
It includes the previously completed Start-button/camera-reuse change and:

- Camera preview waits for Start, with no mandatory ten-second buffer or early
  wrist prompts. Position checks precede a single five-second countdown.
- Countdown interruptions preserve elapsed progress. Only fresh, passing checks
  permit Go; unobserved camera time never advances the countdown.
- The verified ball calibration is retained through small countdown adjustments.
- Camera failure/orientation changes still require a new check. The existing
  bounded setup failure/recovery screen remains.
- Both drills offer the original recording first. Counted-video encoding is an
  explicit option rather than automatic work after every pound round.
- Camera Test 09 is visible for both drills; saved details include SESSION 09
  and COUNTDOWN 01, making future version comparisons explicit.

1,920 automated tracker checks and the production build passed. Focused tests
cover a one-second landmark dip, retained digits, explicit reset, missed camera
time, invalid prerequisites at Go, and calibration preservation. Physical
Safari behavior and the complete setup duration need device verification.

## Recorded-video diagnostic

A separate analysis checkout used the published counting/identity rules on new
paired native CPU model outputs. Calibration uses the stationary opening 1.25
seconds of each saved round; it does not reproduce the unrecorded setup.

| Drill | Visual reference | Saved phone result | Coarse desktop replay | Dense desktop replay |
| --- | ---: | ---: | ---: | ---: |
| Right-hand pound | 35 | 33 | 29 | 35 |
| Crossovers | 20 | 14 | 17 | 19 |

The target source sampling rates were 10 and 30 observations/sec; variable source
frame timing produces approximately 9 and 23/sec in these runs. Exact cadence is
reported in the review receipt. These runs use the same model bytes and counter
rules; only the observation schedule changes. They demonstrate sensitivity to
missed critical observations, not a measured phone-speed improvement.

The coarse pound run has no selected ball near 9.74 and 17.05 seconds at visible
floor approaches. Other proposals are rejected by control checks. The coarse
crossover run includes a same-hand-return rejection and a tracking-gap rejection.
The phone JSON is needed to determine which of these mechanisms affected the
actual sessions.

A tighter portrait crop was also tested. Crossovers fell from 17 to 12 and pounds
rose from 29 to 30. It is rejected and excluded from this startup branch.

Native CPU/Pillow preprocessing and paired fresh poses differ from Safari and
from the pound drill's asynchronous pose schedule. Counts from this replay must
not be presented as a reproduction of the exact phone session.

## Release state

Local, reviewable correction only; not published. No unvalidated counting change
is included. Recover the phone JSONs (a ZIP is an alternative upload format),
replay their exact observations, and verify the published build on the next
physical-device test before calling the tracker reliable.
