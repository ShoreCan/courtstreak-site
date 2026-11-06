import test from 'node:test';
import assert from 'node:assert/strict';
import {partialBallDecision} from '../src/lib/ai/partialBallGuard.mjs';
import {hasFreshMotionWindow} from '../src/lib/ai/observedBallIdentity.mjs';
import {overlayFreshness,nextOverlayExpiry,safariConfiguration,safariObservationPolicy} from '../src/lib/ai/safariPolicy.mjs';
import {createSessionTrackingState} from '../src/lib/ai/sessionTracking.mjs';
import {configurationForEvidence} from '../src/lib/ai/trackerConfiguration.mjs';
import {createGpuPoseClient} from '../src/lib/ai/gpuPoseClient.mjs';
import {unpackPoseCompact,POSE_COMPACT_BYTES,POSE_CAPACITY} from '../src/lib/ai/gpuDetectorExecution.mjs';

test('partial-object filtering retains plausible weak ball proposals and never raises their score',()=>{
  const plausible={box:[0,0,40,40],score:.004};
  assert.equal(partialBallDecision(plausible).allowed,true); assert.equal(plausible.score,.004);
  assert.equal(partialBallDecision({box:[0,0,90,10],score:.009}).reason,'uncertain_partial_object');
  assert.equal(partialBallDecision({box:[0,0,90,10],score:.4}).allowed,true);
  assert.equal(partialBallDecision({box:[0,0,NaN,10],score:.2}).reason,'invalid_geometry');
});
test('motion fitting needs three recent increasing observations and no sparse or future timestamps',()=>{
  assert.equal(hasFreshMotionWindow([{at:1},{at:1.033},{at:1.067}],1.1),true);
  for(const [samples,now] of [[[{at:1},{at:1.1},{at:1.2}],1.21],[[{at:1},{at:1.03}],1.04],[[{at:1},{at:1.03},{at:1.06}],1.2],[[{at:1},{at:1.03},{at:1.06}],1.05]])
    assert.equal(hasFreshMotionWindow(samples,now),false);
});
test('candidate policies are isolated, recordable, and retain exact replay configuration',()=>{
  const base=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true}).configuration;
  const config=safariConfiguration(base,'right-hand-pound');
  assert.equal(base.identityOptions.partialObjectGuard,undefined);
  const data={trackerRevision:config.counterRevision,ballIdentityRevision:config.identityRevision,liveFrameRevision:config.liveFrameRevision,trackerConfiguration:config};
  assert.deepEqual(configurationForEvidence(data),config);
  assert.throws(()=>configurationForEvidence({...data,trackerConfiguration:{...config,shapePolicyRevision:'SHAPE 99'}}),/Unsupported/);
  assert.equal(safariObservationPolicy('stationary-crossover').maxActivePoseSkew,.12);
});
test('stale overlays expire independently of a detector completing another pass',()=>{
  assert.deepEqual(overlayFreshness(10,10,10.05),{ballVisible:true,ballUncertain:false,poseVisible:true});
  assert.equal(overlayFreshness(10,10,10.09).ballUncertain,true);
  assert.equal(overlayFreshness(10,10,10.16).ballVisible,false);
  assert.equal(overlayFreshness(10,10,10.31).poseVisible,false);
  assert.equal(overlayFreshness(undefined,undefined,10).ballVisible,false);
  assert.equal(nextOverlayExpiry(10,10,10.16),10.301);
  assert.equal(nextOverlayExpiry(10,10,10.4),null);
});
test('pose client snapshots immediately, admits one job, and drops the prior generation',async()=>{
  let resolve,called=false;
  const client=createGpuPoseClient({runPose:source=>{called=source.image?.width===720;return new Promise(r=>{resolve=r;});}});
  assert.equal(client.request({width:720,height:1280},{capturedAt:1,sourceVideoTime:2,coordinateSize:{width:1280,height:2276}}),true);
  assert.equal(called,true); assert.equal(client.busy,true);
  assert.equal(client.request({},{}),false);
  client.reset(); resolve({value:{id:1},timings:{preprocessMs:1,inferenceMs:2,decodeMs:3}});
  await client.idle(); await Promise.resolve(); assert.equal(client.latest,null);
  client.close(); assert.equal(client.request({},{}),false);
});
test('pose client reports failed inference instead of supplying an old person',async()=>{
  const client=createGpuPoseClient({runPose:()=>Promise.reject(new Error('device lost'))});
  client.request({width:10,height:10},{capturedAt:1,sourceVideoTime:1}); await client.idle();
  assert.equal(client.error.message,'device lost');assert.equal(client.latest,null);client.close();
});
test('compact output restores stable anchor order and signals overflow for full readback',()=>{
  const bytes=new ArrayBuffer(POSE_COMPACT_BYTES),words=new Uint32Array(bytes),floats=new Float32Array(bytes);
  words[0]=2; words[1]=401; words[58]=20;
  for(let c=0;c<56;c++){floats[2+c]=c+.5;floats[59+c]=c+.25;}
  const out=unpackPoseCompact(bytes);assert.deepEqual(out.dims,[1,56,2]);
  assert.equal(out.data[0],.25);assert.equal(out.data[1],.5);assert.equal(out.data[110],55.25);
  words[0]=POSE_CAPACITY+1; assert.equal(unpackPoseCompact(bytes),null);
});
