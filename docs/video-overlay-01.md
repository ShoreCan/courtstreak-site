# Saved-video rep counter — VIDEO 01

Starting source: published CONTROL 02 commit `5f8a314c469dd84ec6deb9cc7e097ad0c0b06e9d`, tree `9e60b0ba14d1bd3b379b64fcba263b1e38df32c1`.

Saved/shared clips include CourtStreak branding, the accepted-rep counter, seconds remaining, and a two-second final result card. Counts change at the live display-publication time, rather than the earlier estimated bounce time. The final card includes any rep accepted during the existing post-round review. Incomplete attempts have partial-count labels.

The complete, unmirrored camera picture stays between added top/bottom bands. The picture is bounded to a 720-pixel short side and 1280-pixel long side, using even pixel dimensions; bands change the output aspect ratio. The original camera file remains separately available, unchanged.

Only count changes are logged during training. After tracking/review stops, the original recording plays once into a 2D canvas which the existing browser MediaRecorder encodes. A 20-second source plus two-second card takes roughly 22 seconds to prepare. The page shows progress, supports cancellation/retry, and preserves the original on errors or backgrounding. Navigating away/starting another round cancels the export and releases its own capture tracks.

The camera recording module, positioning rules, detector, weights, physical-hand correction, ball selection, bounce logic, and hand-proximity checks remain unchanged. No additional detector pass, dependency, model, paid service, or server upload is added. VIDEO 01 improves presentation and diagnostic evidence; it does not itself improve measured dribble-count accuracy.

The optional test-details JSON includes the recording-clock anchor and displayed-count timeline. The anchor is sampled immediately before requesting recorder start; a small device-dependent encoder/first-frame offset can remain. Timing is not claimed frame-exact until checked on the phone. The prior 15-count upload had no live timeline, so its exact phone decisions cannot be reconstructed.

Validation: 38 automated checks (26 retained, 12 overlay/export checks), production build, and inspection of the production drawing code rendered on extracted source pixels before the interruption, including portrait, landscape, final-card and three-digit layouts. Sample visual counts were illustrative, not recovered phone results. The existing court-hero.jpg build warning remains. Browser-interface doubles test timing, codec fallback, cleanup, errors, stalls, cancellation and backgrounding; they do not establish actual Safari encoding/save/share behavior.

An actual iPhone/iPad and supported browser QA are unavailable in this environment. The next device check is necessary: confirm CONTROL 02 / VIDEO 01; complete a right-hand pound round; keep the page visible until the counted video is ready; save it to Photos/Files and play outside CourtStreak. Check embedded graphics, count increments, intact framing and final-card agreement with the app. Save/upload its matching test-details JSON. Device equivalence and other dribble movements remain unvalidated.

API references: [WebKit MediaRecorder](https://webkit.org/blog/11353/mediarecorder-api/), [W3C canvas captureStream](https://w3c.github.io/mediacapture-fromelement/), [W3C recording](https://www.w3.org/TR/mediastream-recording/). Runtime feature/codec checks and original-video fallback remain necessary.
