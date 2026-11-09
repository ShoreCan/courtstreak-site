# Test23 setup ball-detection dropouts

Problem: isolated missing-ball observations during otherwise verified setup pause both the current and following countdown intervals. At 15, 20 and 30 observations/sec, one missing detection every fifth observation stretches five seconds to 8.2–8.27 seconds.

Test23 now bridges less than 250 ms since the last fully verified view, only while fresh body, required hand, floor, calibrated ball lock and processing readiness remain present. A visible rejected ball, framing loss, processing/lock loss, initial unverified view or sustained detection loss cannot use this bridge. Go still requires a fresh complete valid view; a camera gap of 650 ms or more contributes no elapsed time. This affects live setup and countdown in both Test23 drill routes. Ball selection, green-circle drawing and rep acceptance rules are unchanged.

Historical routes retain SETUP CLOCK 02 / COUNTDOWN 01. Test23 evidence and Build details now report SETUP CLOCK 03 / COUNTDOWN 02. Saved-counter replay chooses the recorded countdown revision, preserving historical timing.

Validation: ten new controlled regression tests cover both hand modes at 15/20/30 Hz, initial and sustained loss, wrong-hand and visible unowned balls, body/hand/floor loss, processing and lock loss, camera gaps, new attempts and final Go proof. Controlled flicker countdowns finish in 5–5.3 seconds. Full tracker suite: 2,129 passed. Production build passed (existing chunk-size notice).

Limits: no new kitchen video or diagnostic packet was supplied; this reproduces a general setup failure class, not a verified diagnosis of that session. No physical iPhone latency or improved rep accuracy is claimed. The green overlay displays selected ball identity; drawing it does not strengthen detection.

Publication: GitHub connector create-tree returned HTTP 403 Resource not accessible by integration. A checksum-verified publisher carries this exact source and refuses to overwrite diverged main. Deployment must succeed before expecting COUNTDOWN 02 on the phone.
