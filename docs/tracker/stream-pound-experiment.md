# Streaming pound experiment — unreleased

The separately routed Test 21 right-hand-pound mode experiments with independent
body inference and native camera ball capture. Published Test 20 and crossover
scheduling remain available. This is not a production accuracy claim.

Changes being evaluated:

- Process the ball without awaiting every full-body pass when an independent
  body worker is available. Retain capture times and reject stale body inputs.
- Use presented-frame identity when Safari reports zero video media time.
- Preserve native portrait pixels and canonical coordinates during frame refresh.
- Reject uncertain partial objects and physically inconsistent weak jumps.
- Keep the existing optional floor view within the measured processing budget.
- Mark a completed round finished when the post-buzzer review loses tracking;
  never add a count to repair its label.

The saved-frame experiment is not a device timing simulation. Replaying sparse
captured inputs can regress with the stricter identity filter; the filter must
not replace the published configuration alone. The independent body worker can
also be too slow to meet the age limit. Do not promote this mode on the strength
of a complete-video replay or a passing synthetic worker check.

Before release, require causal full-session testing on the target Safari device,
observation availability within the configured age limit, measured ball-loop
throughput under recording load, and event-level regression review across
lighting, backgrounds, movement speeds, occlusion, and negative examples.

Use `scripts/diagnostics/replay-observed-pound.mjs` to reproduce identity/counter
experiments from private saved inputs. Never check private video or pose logs
into the public repository. `tests/browser/live-pound-worker.html` checks model
execution on a blank canvas, not tracking accuracy.
