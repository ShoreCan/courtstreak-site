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
