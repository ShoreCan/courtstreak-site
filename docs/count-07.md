# COUNT 07: controlled low pounds from a natural stance

## Requirement

A controlled right-hand floor bounce should not require an upright stance or a high rebound. The user reports needing a second attempt to obtain the improved 33-count result, and suspects the first attempt's lower, faster returns were being rejected. That first attempt was not supplied, so its cause is unverified. The supplied later recording contains 35 reviewed bounces; LOCK 08's identity changes recover its two known tracking misses separately from this counting change.

COUNT 06 normally requires 1.5 ball diameters of return travel and a return/descent ratio before a clean proposal can validate. Its repeated-peak separation gate also requires approximately 1.2 diameters of intervening return. Those fixed limits can reject a controlled low pound. Existing tests with small synthetic floor-to-hand motions demonstrate the failure without changing the detector.

## New controlled-low path

COUNT 07 retains the historical clean, gap-recovered and floor-anchored behavior. It adds an opt-in `controlled_low_pound` proposal when there are fully observed downward and upward segments, enough local samples on each side of the turn, stable ball size, and at least 0.6 diameters of local travel in each direction. This new path does not use reconstructed observations as proof. It still retains the counter's original eight-future-observation minimum.

Acceptance requires floor-region evidence at the event time plus close right-hand ownership both before and after the turn, within that specific motion's time window. The floor evidence is either an established controlled floor reference or a bounded region around two confidently visible ankles. An ankle-based region is a framing proxy, not a new semantic floor-surface detector. Hand and body-distance checks are required; the existing above-knee and deadline checks remain. No wrist-to-hip or upright-body requirement is added.

The first low rep can validate using the visible-foot region: high-bounce warmup is not required. Accepted low contacts can establish the ordinary floor reference. Known-floor short returns also use a matching smaller separation gate, avoiding a higher-rise requirement after calibration. A low proposal does not become the counter's preceding-contact reference until control validation accepts it; rejected low candidates cannot suppress subsequent valid contacts.

Live initialization and countdown reset share `createPoundCounter` and `createPoundValidator` for their selected revision. Exact saved-input replay uses those same revision factories. Historical COUNT 03–06 replays keep their historical rules. The ordinary nonexperimental tracker remains COUNT 03. The experimental page identifies **COUNT 07 / LOCK 08**.

## Validation

- Combined suite: 1,415 tests pass. The low-pound suite has 110 checks, including eight known contacts from the first rep at 20/24/30 samples per second, periods 0.28/0.4/0.65 seconds, three camera scales and return heights of 0.8/1.0/1.25 ball diameters.
- Synthetic crouched and upright poses both validate controlled returns. Held balls, small held-ball jitter, shallow airborne movement outside the floor region, right-hand transfers without right-hand control, missing floor evidence and late control recovery are checked separately. Reacquiring control on a later bounce cannot retroactively validate an earlier low return. Deadlines remain enforced.
- The supplied 35-bounce recording remains 35/35 under the combined counter and identity update. Twelve complete saved logs retain their accepted timestamps and paths compared with COUNT 06 running the same identity selection, including the older partial trace. Additional rejected low proposals do not change accepted scores.
- A synthetic saved COUNT 07 round reproduces the live counter/validator accepted events exactly.

## Limits

These low-height checks are synthetic observations with known contacts and poses. They are not a new live recording from the user or a complete detector evaluation on a new low-dribble video. Neither the first unsuccessful attempt nor its test details were supplied. The old successful video's review and the cached logs do not establish accuracy for every low stance, player, environment or device. Ball, hand and floor evidence still need to be visible and resolvable; arbitrarily small or unobserved motion cannot be verified by lowering an unlimited threshold.

Camera processing gaps are not repaired here. COUNT 06's broader dependency on unaccepted ordinary proposals remains a known issue separate from the new low-path acceptance bookkeeping. Do not claim general maximum-speed reliability or pilot readiness from this update alone. After deployment, use one natural low-stance right-hand-pound check to assess the combined live behavior and save the original video with matching JSON.
