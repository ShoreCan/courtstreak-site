import test from 'node:test';
import assert from 'node:assert/strict';
import { RoundEvidence, replayStart } from '../src/lib/ai/roundEvidence.mjs';
const frame=(extra={})=>({capturedAt:10,sourceVideoTime:5,inputPhase:'active',phase:'active',roi:[0,0,1280,720],balls:[],person:null,selected:null,ms:50,fps:20,counterFrame:1,proposedCount:0,count:0,...extra});

test('rep markers use the bounce time, retaining separate confirmation timing',()=>{
  const evidence=new RoundEvidence();
  evidence.record(frame({capturedAt:12,confirmed:[{count:1,event_timestamp_exact:1.25,event_time_seconds:1.25,event_frame:20,validation_path:'clean_full_pound'}]}));
  const result=evidence.export({startedAt:10,displayedCount:1});
  assert.equal(result.countedReps[0].time,1.25);
  assert.equal(result.countedReps[0].confirmedElapsed,2);
  assert.equal(result.frames[0].elapsed,2);
});

test('a missing selected ball stays missing even when detector proposals exist',()=>{
  const evidence=new RoundEvidence();evidence.record(frame({balls:[{box:[1,2,3,4],score:.8}]}));
  const result=evidence.export({startedAt:10});
  assert.equal(result.frames[0].selected,null);
  assert.equal(result.frames[0].balls.length,1);
  assert.equal(result.countedReps.length,0);
});

test('evidence retains detection values when caller objects are reused',()=>{
  const ball={box:[1,2,3,4],score:.8},proposal={event_frame:2,event_time_seconds:.2};
  const evidence=new RoundEvidence();evidence.record(frame({balls:[ball],selected:ball,proposals:[proposal]}));
  ball.box[0]=99;proposal.event_time_seconds=99;
  assert.equal(evidence.frames[0].selected.box[0],1);
  assert.equal(evidence.proposals[0].event_time_seconds,.2);
});

test('long setup is bounded and discarded frame records are reported',()=>{
  const evidence=new RoundEvidence(2);
  for(let i=0;i<4;i++)evidence.record(frame({capturedAt:10+i}));
  const result=evidence.export({startedAt:10});
  assert.equal(result.frames.length,2);assert.equal(result.droppedFrameRecords,2);
  assert.deepEqual(result.frames.map(item=>item.frameId),[3,4]);
});

test('replay seeks slightly before the rep and remains within a playable clip',()=>{
  assert.equal(replayStart(2),1.65);assert.equal(replayStart(.1),0);
  assert.equal(replayStart(25,20),19.99);assert.equal(replayStart(NaN,20),0);
});

test('separate ball and pose timing records retain their values after the caller reuses them',()=>{
  const timings={pose:{preprocessMs:3,inferenceMs:180,decodeMs:2},ball:{preprocessMs:2,inferenceMs:40,decodeMs:1}};
  const evidence=new RoundEvidence();evidence.record(frame({timings}));
  timings.pose.inferenceMs=999;timings.ball.preprocessMs=999;
  const result=evidence.export({});
  assert.equal(result.frames[0].detectorTimings.pose.inferenceMs,180);
  assert.equal(result.frames[0].detectorTimings.ball.preprocessMs,2);
});

test('active cadence counts distinct camera frames within the clocked round', () => {
  const evidence = new RoundEvidence();
  const samples = [
    { capturedAt: 10, inputPhase: 'countdown', sourceVideoFrameNumber: 1 },
    { capturedAt: 10.03, sourceVideoFrameNumber: 2 },
    { capturedAt: 10.05, sourceVideoFrameNumber: 2 },
    { capturedAt: 10.11, sourceVideoFrameNumber: 4 },
    { capturedAt: 10.19 },
    { capturedAt: 10.28, phase: 'review', sourceVideoFrameNumber: 6 },
    { capturedAt: 10.29, sourceVideoFrameNumber: 7 },
  ];
  for (const sample of samples) evidence.record(frame(sample));
  const cadence = evidence.activeCameraCadence(10, .29);
  assert.equal(cadence.samples, 2);
  assert.ok(Math.abs(cadence.hz - 12.5) < 1e-9);
  assert.ok(Math.abs(cadence.maxGapSeconds - .08) < 1e-9);
});

test('live-work timings are snapshotted independently of the historical decision clock', () => {
  const evidence = new RoundEvidence();
  const passWorkMs = {capture: 2, identity: 1, counter: 3, detectorToPublish: 4, publish: .1};
  evidence.record(frame({decisionCompletedAt: 10.02, passWorkMs}));
  passWorkMs.counter = 999;
  const [saved] = evidence.export({startedAt: 10}).frames;
  assert.equal(saved.decisionCompletedAt, 10.02);
  assert.equal(saved.passWorkMs.counter, 3);
  assert.ok(Number.isFinite(saved.passWorkMs.evidence));
  assert.doesNotThrow(() => new RoundEvidence(0).record(frame({passWorkMs})));
});

test('identical adjacent detections are diagnostic and leave camera cadence and scoring evidence intact', () => {
  const evidence = new RoundEvidence();
  const balls = [{box: [1, 2, 3, 4], score: .8}];
  for (const row of [
    {capturedAt: 10, sourceVideoFrameNumber: 10, balls},
    {capturedAt: 10.02, sourceVideoFrameNumber: 11, balls},
    {capturedAt: 10.04, sourceVideoFrameNumber: 12, balls, roi: [2, 0, 1280, 720]},
    {capturedAt: 10.10, sourceVideoFrameNumber: 13, balls},
    {capturedAt: 10.12, sourceVideoFrameNumber: 13, balls},
    {capturedAt: 10.14, sourceVideoFrameNumber: 14},
  ]) evidence.record(frame(row));
  assert.deepEqual(evidence.activeDetectorRepeats(10, 1), {samples: 6, adjacentMatches: 1});
  assert.equal(evidence.activeCameraCadence(10, 1).samples, 5);
  assert.equal(evidence.frames.length, 6);
});
