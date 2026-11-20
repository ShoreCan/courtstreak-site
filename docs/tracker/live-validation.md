# Live tracker validation

## Athlete proportions

Apply this policy to every current and future drill. Eligibility and scoring have no player-height, torso-width, wingspan, fixed-stance-width, or minimum bounce-height requirement. A drill can require its named motion and a controlled receive. A camera drill can require the relevant landmarks, ball, and floor to be visible.

Use the athlete's observed landmarks and the tracked ball to locate the movement. Keep distance thresholds about observation uncertainty and control. Avoid global body proportions as substitutes for either. Instructions can suggest a comfortable starting position with room for the ball.

Before enabling automatic scoring for a drill, test it across different player heights, torso widths, arm lengths, and comfortable stances. Check both sides when the drill uses both hands. Include low controlled bounces, passes without ground contact, mishandles, and adjacent moves that should not count. Confirm the expected individual reps from video and check precision, recall, and scoring latency on held-out live rounds. Tests for existing camera drills can reuse the controlled movement fixtures with independent changes to body and wrist landmarks.

## Between the Legs GPU ordering trial

Test 05 starts with ball-first submission on the normal Between the Legs lab route. Add `?gpu-order=pose-first` and reload for the comparison. Ball-first queues the ball result copy before the next pose upload, and pose can start while the ball buffer is mapped. Both modes use the same models, refresh policy, CPU scheduling, recording, and scoring rules. The saved evidence records `gpuSubmissionOrder`.

On the same iPhone, alternate control and trial rounds in the same placement, with recording enabled in both. Start each pair at similar device conditions. Compare unique tracking FPS, p90 and longest frame gaps, ball GPU map wait, and wrist age at the receive. Match confirmed reps to the videos and check misses, false positives, and capture-to-confirmation delay. Use `passWorkMs` to check camera copying, ball selection, counting, evidence capture, and UI submission separately. The count commit timeline records when React applies the count to the screen, before browser paint.

If readback stalls persist in both modes, use the recording-load diagnostic to measure recording contention. Compare early and late rounds on the same device and note temperature and other active apps. The tracker already uses a compact GPU readback. Measure the cost of the compacting shader and the map separately before considering a smaller output or a different model. A smaller payload, cooler device, or higher camera capture rate needs its own live validation against the same scoring checks.
