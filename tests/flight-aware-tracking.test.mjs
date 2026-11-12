import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrossoverCounter } from '../src/lib/ai/crossoverCounter.mjs';
import { flightPoseDecision, repairObservationPolicy, repairPoseNeeded } from '../src/lib/ai/repairPolicy.mjs';
import { ball, person } from './helpers/crossover-scenarios.mjs';

const policy = repairObservationPolicy('stationary-crossover');
const lowStance = person(510);
const liveInput = {
 person: lowStance, poseAt: 1, lastRequestedAt: 1, now: 1.15, ballAt: 1.12,
 ball: ball(440, 595), previousBall: { ball: ball(440, 550), at: 1.08 },
 poseSeconds: .06, phase: 'active', policy, drillKey: 'stationary-crossover',
};

test('an optional pose request gives way to ball processing near the floor', () => {
 assert.equal(repairPoseNeeded(liveInput), true);
 assert.equal(flightPoseDecision(liveInput), 'protect_floor');
 assert.equal(flightPoseDecision({ ...liveInput, now: 1.23 }), 'routine');
});

test('a rising ball can request fresh wrist evidence before the ordinary pose interval', () => {
 const rise = {
  ...liveInput, now: 1.10, ballAt: 1.08, ball: ball(470, 600),
  previousBall: { ball: ball(505, 634), at: 1.04 },
 };
 assert.equal(repairPoseNeeded(rise), false);
 assert.equal(flightPoseDecision(rise), 'anticipate_receipt');
 assert.equal(flightPoseDecision({ ...rise, drillKey: 'right-hand-pound' }), null);
 assert.equal(flightPoseDecision({ ...rise, lastRequestedAt: 1.06 }), null);
 assert.equal(flightPoseDecision({ ...rise, previousBall: null }), 'protect_floor');
});

const fastTransfer = [
 [-.1, 840, 350], [0, 840, 350], [.06, 805, 420], [.12, 720, 555],
 [.18, 640, 655], [.24, 540, 550], [.30, 470, 430], [.36, 440, 350],
 [.43, 485, 420, 450, 390], [.49, 550, 540, 535, 510],
 [.52, 590, 625, 575, 600], [.56, 640, 638, 620, 615],
 [.61, 760, 542], [.67, 815, 425], [.73, 840, 350], [.8, 840, 350],
];
function runTransfer(revision, { noSecondFloor = false, noSecondReceipt = false, firstReturnsToSameHand = false, deadline = 20 } = {}) {
 const counter = createCrossoverCounter(revision);
 for (const [time, x, y, leftX, leftY] of fastTransfer) {
  const pose = person();
  pose.xy[15][1] = pose.xy[16][1] = 700;
  if (leftX) pose.xy[9] = [leftX, leftY];
  if (noSecondReceipt && time > .56) pose.confidence[10] = 0;
  const centerY = noSecondFloor && time > .43 ? Math.min(y, 550) : y;
  const centerX = firstReturnsToSameHand && time < .18 ? 1280 - x : x;
  counter.update([], [centerX, centerY, 60], pose, time, deadline);
 }
 return counter.confirmed;
}

test('a verified receipt anchors the next cycle even when the wrist follows its descent', () => {
 assert.deepEqual(runTransfer('CROSS 12').map(e => e.floor_contact_time_seconds), [.18]);
 const reps = runTransfer('CROSS 13');
 assert.deepEqual(reps.map(e => [e.from_hand, e.floor_contact_time_seconds]), [['right', .18], ['left', .56]]);
 assert.equal(reps[1].release_time_seconds, reps[0].event_timestamp_exact);
});

test('the carried receipt still requires a separate observed floor and controlled return within the round rules', () => {
 for (const options of [{ noSecondFloor: true }, { noSecondReceipt: true }, { deadline: .42 }]) {
  assert.deepEqual(runTransfer('CROSS 13', options).map(e => e.floor_contact_time_seconds), [.18]);
 }
});

test('a rejected same-hand bounce cannot block the following independently verified crossover', () => {
 const options = { firstReturnsToSameHand: true };
 assert.deepEqual(runTransfer('CROSS 13', options), []);
 const reps = runTransfer('CROSS 14', options);
 assert.deepEqual(reps.map(e => [e.from_hand, e.floor_contact_time_seconds]), [['left', .56]]);
 for (const missing of [{ noSecondFloor: true }, { noSecondReceipt: true }, { deadline: .42 }]) {
  assert.deepEqual(runTransfer('CROSS 14', { ...options, ...missing }), []);
 }
});
