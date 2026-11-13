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

function rejectedFloorTransfer(reason, {sameHand = false, airborne = false, missingAscent = false,
 missingReceipt = false, primarySeesFloor = false, competingFloor = false, stationaryDecoy = false, deadline = 20} = {}) {
 const counter = createCrossoverCounter('CROSS 15');
 const points = [
  [-.05, 840, 350], [.02, 830, 365], [.10, 780, 505], [.17, 640, airborne ? 490 : 630],
  [.22, sameHand ? 690 : 590, 585], [.28, sameHand ? 750 : 530, 514],
  [.35, sameHand ? 840 : 440, 365], [.41, sameHand ? 840 : 440, 350],
  [.48, sameHand ? 840 : 440, 350],
 ];
 for (const [time, x, y] of points) {
  const pose = person();
  if (missingReceipt && time >= .35) pose.confidence[9] = 0;
  const onFloor = time === .17;
  const balls = stationaryDecoy ? [ball(640, 630)]
   : onFloor ? [ball(x, y), ...(competingFloor ? [ball(x + 22, y)] : [])] : [];
  const observations = {balls, decisions: balls.map((_, candidateIndex) => ({reason, candidateIndex}))};
  const skipsAscent = missingAscent && time > .17 && time < .35;
  const measurement = (onFloor && !primarySeesFloor) || skipsAscent ? null
   : [x, stationaryDecoy ? Math.min(y, 425) : y, 60];
  counter.update([], measurement, pose, time, deadline, observations);
 }
 return counter.confirmed;
}

test('a rejected crossover floor box can supply proof without replacing the owned ball track', () => {
 for (const reason of ['jump_from_last', 'background_memory', 'prediction_envelope']) {
  const events = rejectedFloorTransfer(reason);
  assert.equal(events.length, 1, reason);
  assert.equal(events[0].floor_contact_time_seconds, .17);
  assert.deepEqual(events[0].evidence_sources, ['rejected_floor_candidate']);
 }
 assert.equal(rejectedFloorTransfer('background_memory', {primarySeesFloor: true}).length, 1);
});

test('a rejected floor box without an independent return stays uncounted', () => {
 for (const options of [{sameHand: true}, {airborne: true}, {missingAscent: true}, {missingReceipt: true},
  {competingFloor: true}, {stationaryDecoy: true}, {deadline: .16}]) {
  assert.deepEqual(rejectedFloorTransfer('background_memory', options), [], JSON.stringify(options));
 }
});

function pixelCrossover({intermediate=true, sameHand=false, airborne=false, missingWrist=false, includeModelFloor=false}={}){
 const counter=createCrossoverCounter('CROSS 16');
 const samples=[
  [-.05,840,350],[.02,830,365],[.10,780,505],
  [.22,590,550],[.28,530,500],[.35,440,390],[.41,440,350],[.48,440,350],[1.12,440,350]
 ];
 if(includeModelFloor)samples.splice(3,0,[.17,640,630]);
 for(const [time,x,y] of samples){
  const pose=person();
  if(missingWrist)pose.confidence[9]=0;
  const bounce=ball(640,airborne?450:630).box;
  const receives=time>=.22;
  const measurement=[receives&&sameHand?1280-x:x,y,60];
  const observations=time===.22&&!includeModelFloor?{
   floorPixelBridge:intermediate?{intermediate:[{offset:-.05,box:bounce}]}:{evidence:{box:bounce}}
  }:undefined;
  counter.update([],measurement,pose,time,20,observations);
 }
 return counter.confirmed;
}

test('crossover recovery can use a camera frame between detector passes for the floor turn',()=>{
 const events=pixelCrossover();
 assert.equal(events.length,1);
 assert.equal(events[0].from_hand,'right');
 assert.equal(events[0].to_hand,'left');
 assert.ok(Math.abs(events[0].floor_contact_time_seconds-.17)<1e-9);
 assert.deepEqual(events[0].evidence_sources,['observed_floor_pixels']);
 assert.equal(pixelCrossover({intermediate:false}).length,1);
});

test('crossover floor pixels cannot award an airborne or same-hand return, replace a wrist, or count twice',()=>{
 for(const options of [{sameHand:true},{airborne:true},{missingWrist:true}]){
  assert.deepEqual(pixelCrossover(options),[],JSON.stringify(options));
 }
 assert.equal(pixelCrossover({includeModelFloor:true}).length,1);
});

test('an observed inward redirect can confirm a quick opposite-hand receipt',()=>{
 const samples=[
  [-.05,840,350],[.02,830,365],[.10,780,505],[.17,640,630],
  [.25,475,420],[.29,418,368],[.35,460,400]
 ];
 const run=(revision,redirectX)=>{
  const counter=createCrossoverCounter(revision);
  for(const [time,x,y] of samples){
   const pose=person();
   if(time===.25)pose.xy[9]=[475,420];
   counter.update([],[time===.35?redirectX:x,y,60],pose,time,20);
  }
  return counter.confirmed;
 };
 assert.deepEqual(run('CROSS 15',460),[]);
 assert.equal(run('CROSS 16',460)[0]?.control_evidence,'observed_inward_redirect');
 assert.deepEqual(run('CROSS 16',392),[]);
});
