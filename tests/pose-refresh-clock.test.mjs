import test from 'node:test';
import assert from 'node:assert/strict';
import { PoseRefreshClock } from '../src/lib/ai/poseRefreshClock.mjs';

test('acquire a person immediately, including after a missing pose result', () => {
  const clock = new PoseRefreshClock();
  assert.equal(clock.shouldRun(0, false), true);
  clock.completed(.2);
  assert.equal(clock.shouldRun(.201, false), true);
  assert.equal(clock.shouldRun(.201, true), false);
});

test('a slow pose pass leaves ball-only slots instead of immediately repeating', () => {
  for (const duration of [.18, .20, .49]) {
    const clock = new PoseRefreshClock(), start = 10, completed = start + duration;
    assert.equal(clock.shouldRun(start, true), true);
    clock.completed(completed);
    for (const delay of [.001, .05, .10, .179]) {
      assert.equal(clock.shouldRun(completed + delay, true), false, `${duration}s pass, ${delay}s later`);
    }
    assert.equal(clock.shouldRun(completed + .18, true), true);
  }
});

test('ball-only frames do not postpone the next body and wrist refresh', () => {
  const clock = new PoseRefreshClock();
  clock.completed(1);
  for (const time of [1.02, 1.06, 1.10, 1.16]) assert.equal(clock.shouldRun(time, true), false);
  assert.equal(clock.shouldRun(1.18, true), true);
  clock.completed(1.38);
  assert.equal(clock.shouldRun(1.50, true), false);
  assert.equal(clock.shouldRun(1.56, true), true);
});

// This is a deterministic scheduling model, not detector execution or a claim
// about live device speed. 50ms ball-only / 200ms pose-inclusive work reflects
// the slowdown in the phone evidence; each pass still includes ball detection.
function simulate({ legacy = false, ballMs = 50, poseMs = 200 }) {
  const clock = new PoseRefreshClock(), rows = [];
  let captured = 0, lastPoseCapture = -Infinity;
  while (captured < 22) {
    const pose = legacy ? captured - lastPoseCapture >= .18 : clock.shouldRun(captured, true);
    const completed = captured + (pose ? poseMs : ballMs) / 1000;
    if (pose) { lastPoseCapture = captured; clock.completed(completed); }
    rows.push({ captured, completed, pose, poseAge: completed - lastPoseCapture });
    captured = completed + .002;
  }
  const final = rows.at(-1).completed, window = rows.filter(r => final - r.completed < 3);
  return { rows, fps: (window.length - 1) / (final - window[0].completed) };
}

test('observed slow-pass costs no longer monopolize ball tracking in a sustained timing model', () => {
  const baseline = simulate({ legacy: true }), candidate = simulate({});
  assert.ok(baseline.fps < 8);
  assert.ok(candidate.fps >= 10);
  assert.ok(baseline.rows.slice(-20).every(r => r.pose));
  assert.ok(candidate.rows.some(r => !r.pose));
  for (let i = 1; i < candidate.rows.length; i++) {
    assert.equal(candidate.rows[i].pose && candidate.rows[i - 1].pose, false);
  }
});

test('pose age still includes processing time and remains bounded in the observed timing model', () => {
  const { rows } = simulate({});
  assert.ok(rows.filter(r => r.pose).every(r => r.poseAge >= .199));
  assert.ok(Math.max(...rows.map(r => r.poseAge)) < .45);
});

test('scheduling does not make genuinely inadequate throughput satisfy the existing speed cutoff', () => {
  const severe = simulate({ ballMs: 150, poseMs: 450 });
  assert.ok(severe.fps < 8);
});
