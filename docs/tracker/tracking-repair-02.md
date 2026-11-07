# Live tracking audit: repair 02

6 November 2026, America/Chicago. Experimental Camera Test23 uses COUNT10,
CROSS12 and TRACKING REPAIR02. Test20/22 and earlier counter revisions retain
their original policies. This audit continues repair01 rather than replacing
its GPU capture, timing and bounded crossover corrections.

## What this audit establishes

All 1,547 saved observation records in the three current Test22 packets were
processed. Their original per-frame counts and all 78 accepted event records
reproduce exactly. The combined repair preserves those events and the three
previously reviewed recoveries: indoor pounds 18 to 19; outdoor pounds 33 to 34;
crossovers 27 to 28. These are saved-input counts, not independent ground-truth
totals, recall scores or measurements of a newly running phone camera.

Original video regions corresponding to every remaining primary rejection and
the three recoveries were inspected. Video/log alignment is approximate.
Held-ball indoor proposals were correctly rejected. Some outdoor/crossover
regions contain real movements whose floor or receipt proof is missing from
the detector packets. A rejected proposal is not automatically an additional
missed rep: another counter may already have awarded the same contact.

## Corrections that generalize beyond one clip

| Failure pattern | Live correction | Related cases checked |
| --- | --- | --- |
| Countdown repositioning becomes a permanent movement threshold | COUNT10 calibrates from the last half-second of observed pre-Go samples, requiring at least five samples spanning 250 ms. It freezes during counting. | Repositioning and warmups at 15/20/30 Hz; retained detector jitter; countdown pauses and clock shifts. |
| Large airborne motion satisfies full-pound amplitude rules | Full and gap pound paths require projected feet/floor evidence before a peak can teach the floor reference. | True and airborne full motions across three rates and three travel distances; original accepted contacts preserved. |
| A later cycle supplies evidence for an earlier failed receipt | The shared hand guard bounds the first ascent/return and detects distinguishable opposite-hand control. Ambiguous hands cannot supply full-pound right-hand proof. | Wrong release and wrong receipt followed by seven valid cycles at 15/20/30 Hz; full and low ambiguous-hand cases. |
| Recovery filters erase evidence contradicting a right-hand rep | The recovery guard consumes the same selected-ball observations even when its right-hand candidate filter discards that ball. Rejected recovery geometry cannot erase a left-hand receipt. | The combined live identity, primary validator, recovery counter and ledger reject the same invalid cycle. |
| Countdown pauses shift one counter's clock but not another's | The candidate shifts the recovery held-ball time, last-update time and guard context with the primary counter and noise calibration. | The next observation is processed after a pause, then eight valid cycles still count; historical revisions retain exact old timelines. |
| Revision-labelled diagnostics silently omit new options | Cached identity checks forward the live identity options; revision-labelled counters use the live factories. | Partial-object filtering and live/cached parity on generated positive and negative sequences. |
| New evidence cannot be rechecked or is mislabelled | Exact session replay supports Test22/Test23, verifies pound configuration labels and recovery options, and retains floor-evidence/calibration provenance. | All three transformed Test23 schema roundtrips reproduce their count timelines and accepted records. These are not newly recorded phone inputs. |

The floor check is a 2D proxy with uncertainty, not a floor-plane sensor.
Its learned-floor and feet lower-band allowance is 0.45 ball diameters. A
stricter 0.25-diameter candidate discarded existing accepted contacts and was
rejected. The allowance does not impose a minimum dribble height. Very small
airborne motion within projection/model uncertainty remains a limitation.

The hand guard does not invent unseen wrists. Missing proof remains unverified;
observed wrong-hand control has a different diagnostic reason. A single nearby
wrist is still weaker evidence than independently labelled physical control.

## Live code path audited

| Stage | Files / responsibility |
| --- | --- |
| Start, pauses, Go and review | `IPhonePoundTest.jsx`, placement, camera preview, readiness/countdown clocks, setup guidance, session completion |
| Fresh camera input | Frame capture, video-frame clock, camera pass scheduler, detector input and GPU input |
| Model execution | iPhone detector, CPU/GPU execution, GPU pose client, pose worker, output decoder |
| Ball identity | Pound core, observed identity, partial-object guard, proposal policy, timing/continuation policies, session ROI |
| Count decisions | Pound core and hand evidence, crossover primary/shadow receipt, controlled recovery, shared event ledger |
| Reproducibility | Tracker configuration/build provenance, round evidence, saved replay, recorded profile, cached identity checks |
| Recording/export boundary | Native recording, recording tail, counted export/replay flow; encoder contention still needs a phone measurement |

No additional model calls, model weights or live crop were added by repair02.
The tighter crop rejected by repair01 remains diagnostic-only. Existing tests
also cover historical saved fixtures, device-coordinate transforms, deadlines,
duplicate suppression, cancelled work, orientation changes and recording flow.
Historical fixtures are not newly annotated full-pipeline phone trials.

## Remaining evidence gaps

- Outdoor movement around 9.58 seconds still lacks accepted floor proof in the
  saved packet. It is visible in the video; loosening the floor rule would not
  repair the missing observation. Other outdoor rejected proposals require
  cycle/ledger association rather than being added to a total automatically.
- Several crossover gaps remain outside the bounded same-floor receipt repair
  or lack observed floor evidence. An unrestricted gap increase previously
  replaced accepted events and was rejected.
- Fresh-at-admission GPU capture and selective pose scheduling are implemented
  in the live candidate. Their Apple-GPU capture cadence, receipt freshness,
  sustained heat and recording cost are not measured here.
- The detector is unchanged. Blur, occlusion, wrong boxes, an inaccurate wrist,
  a moving camera, multiple people and new floor/camera geometries can still
  remove or corrupt the evidence needed to score correctly.
- A complete independent event-by-event ground-truth annotation of all three
  sessions has not been established. More detections do not establish accuracy.

Before customer scoring, compare actual iPhone Test22/Test23 front-camera
sessions against independent video labels at multiple speeds, views and
orientations. Examine missed and extra events, queue/runtime/readback timings,
capture gaps, wrist age, recording load and sustained performance. This audit
does not certify every unobserved future condition or a customer-ready tracker.

## Reuse rather than repeat

The private checkpoint retains hashes and identities of the source packets and
videos, exact comparison JSON, per-event review indices/images, test/build
results and the committed source bundle. Use the recorded revision and a changed
source hash to select checks. Rerun model/frame experiments only for changed
inputs, an identified detection/localization question, or a new failure.

The phone routes remain `/tracker-tests/test23`,
`/tracker-tests/right-hand-pound-test23`, and `/tracker-tests/crossovers-test23`.
The source-write integration returned GitHub 403. Preparing the checkpoint or
downloading its publisher does not deploy the phone tracker.
