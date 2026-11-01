# Recorded crossover diagnostics

These scripts run private, local recordings through the pinned CourtStreak ball
and pose models, then the production geometry, ball identity, ROI and counter.
They do not upload recordings. Keep footage, extracted frames and JSON outside
this repository.

Requirements: Python 3 with NumPy, Pillow and `onnxruntime==1.22.0`; Node; ffmpeg
and ffprobe. An isolated ONNX installation can be selected with
`COURTSTREAK_ORT_PATH`. Model SHA-256 hashes are checked against the manifest.

Generate decoded source-frame timestamps (honors edit lists):

```sh
ffprobe -v error -select_streams v:0 -show_entries frame=best_effort_timestamp_time -of json /path/clip.mov > /path/frames.json
python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); json.dump([float(f["best_effort_timestamp_time"]) for f in d["frames"]],open(sys.argv[2],"w"))' /path/frames.json /path/times.json
node scripts/diagnostics/replay-crossover-video.mjs /path/clip.mov /path/times.json /path/trial.json all
```

Modes: `all` processes every source frame without pacing; `10fps` reruns both
models at a source cadence of approximately 10fps with independent ROI feedback;
`realtime` follows this desktop's wall clock and drops frames when processing
falls behind. The driver explicitly selects the published **CROSS 02** baseline.
For a counting-rule comparison, replay the saved measurements and poses through
`createCrossoverCounter('CROSS 02')` and `createCrossoverCounter('CROSS 03')`.
Compare the same observations; do not treat a changed default as the baseline.

The first two seconds supply distinct observed hand-reference samples. This is
a diagnostic warmup, not a successful production setup/countdown. An optional
fifth argument supplies a separately reviewed pre-roll calibration; label that
assistance explicitly. Failed calibration results are diagnostic only.

Native CPU ONNX and Pillow bilinear resizing differ from browser Canvas and
Safari providers. Browser spot checks found differences in weak proposals.
Neither dense nor 10fps replay is a live iPhone benchmark. Desktop paced trials
below the production 10fps readiness threshold do not qualify for Go. Report
full study windows separately from the standard 20-second subset.
