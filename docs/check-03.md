# CHECK 03: iPhone setup recovery and counted replay saving

The October 26 floor-supported iPhone attempt finished with 20 accepted reps on
CHECK 02 / COUNT 08 / LOCK 09. Its original video has no counter; the saved JSON
contains the live display timeline. Replaying its cached detections reproduces
all 1,663 selected/unselected decisions, requested crops and 20 accepted events.
This supports this particular moderate-speed round, not maximum-speed accuracy.

Before Go, the log contains five countdown restarts. Lost ball proposals and
unstable calibration can invalidate setup even with valid body framing. The old
paused message does not distinguish these from framing loss.

CAMERA 03 retains positioning/countdown progress through up to 1.5 seconds of
ball-lock interruption while body/wrist/floor checks and tracking speed remain
valid. Countdown time does not advance without valid current observations. The
0.65-second timeout remains for missing observations, lost framing or speed
failure. No change is made to ball selection, rep validation or COUNT 08 / LOCK 09.
The status identifies ball rechecking separately from measured framing failures.
Floor-level setup tips explain phone tilt and the need to include head, feet,
ball and floor space.

The reduced cached-readiness fixture covers each observed countdown segment and
the observations immediately following its original restart. Three of the five
restart windows retain progress with the new timeout. The other two still reset
for persistent calibration loss or lost framing. This is a cached-clock test;
new camera inference, device FPS and physical iPhone behavior are not simulated.

After the original round recording is ready and tracking has stopped, the UI now
prepares the existing counted-video export automatically. The primary save/share
buttons wait for it. Export failure provides a retry and an explicitly labeled
original-video choice; an uncounted original is never silently used as the
default. Video count changes continue to use display acceptance times, not
estimated earlier bounce times. The original recording remains available.

Validation: 1,695 tracker tests passed and production build passed. Includes
short/long ball-lock interruptions, stricter framing failures, missing frames,
recorded countdown windows, original counter replays and video export tests.
Physical iPhone countdown/export verification remains outstanding.
