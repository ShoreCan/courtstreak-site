import test from 'node:test';
import assert from 'node:assert/strict';
import {runDetectionPass} from '../src/lib/ai/detectionPass.mjs';
import {safeTrackerReturn} from '../src/lib/trackerReturn.mjs';

const frame = pixels => ({width: 1280, height: 720, pixels});
const result = value => ({value, timings: {preprocessMs: 1, inferenceMs: 2, decodeMs: 1}});
const deferred = () => {let resolve;const promise = new Promise(r => {resolve = r;});return {promise,resolve};};

test('the live candidate link survives login within the existing protected route', () => {
  const link='/lab/drill/right-hand-pound/session?mode=iphone-fresh-frame-test';
  assert.equal(safeTrackerReturn(link),link);
  assert.equal(safeTrackerReturn('https://example.com'+link),null);
  assert.equal(safeTrackerReturn(link+'&mode=iphone-vision-test'),null);
});

test('a live pose pass detects the newest camera pixels after pose completes', async () => {
  const pose = deferred(), original = frame('before bounce'), latest = frame('after bounce');
  const seen = [];
  const pending = runDetectionPass({frame:original,roi:[0,0,1280,720],withPose:true,
    runPose:source=>{seen.push(['pose',source.pixels]);return pose.promise;},
    refreshBallFrame:()=>{seen.push(['refresh']);return {frame:latest,capturedAt:10.2,sourceVideoTime:2.2};},
    runBall:async source=>{seen.push(['ball',source.pixels]);return result([source.pixels]);}});
  assert.deepEqual(seen,[['pose','before bounce']]);
  pose.resolve(result({rightWrist:[400,300]}));
  const output = await pending;
  assert.deepEqual(seen,[['pose','before bounce'],['refresh'],['ball','after bounce']]);
  assert.deepEqual(output.balls,['after bounce']);
  assert.deepEqual(output.person,{rightWrist:[400,300]});
  assert.equal(output.capturedAt,10.2);
  assert.equal(output.sourceVideoTime,2.2);
});

test('full pass timing includes slow pose; fresh ball pixels do not conceal a stall', async () => {
  let ms=1000;
  const output=await runDetectionPass({frame:frame('old'),roi:[0,0,1280,720],withPose:true,clock:()=>ms,
    runPose:async()=>{ms+=550;return result({});},
    refreshBallFrame:()=>({frame:frame('new'),capturedAt:ms/1000,sourceVideoTime:2}),
    runBall:async()=>{ms+=70;return result([]);}});
  assert.equal(output.ms,620);
  assert.equal(output.capturedAt,1.55);
  assert.ok(output.ms>500);
});

test('saved-input diagnostics retain their exact frozen frame, crop and result shape', async () => {
  const original=frame('frozen'),roi=[30,40,500,700],seen=[];
  let ms=0;
  const output=await runDetectionPass({frame:original,roi,withPose:true,clock:()=>ms++,
    runPose:async source=>{assert.equal(source,original);seen.push('pose');return result({keypoints:17});},
    runBall:async(source,crop)=>{assert.equal(source,original);assert.equal(crop,roi);seen.push('ball');return result([{score:.9}]);}});
  assert.deepEqual(seen,['pose','ball']);
  assert.deepEqual(output,{person:{keypoints:17},balls:[{score:.9}],ms:1,
    timings:{pose:result().timings,ball:result().timings}});
});

test('ball-only passes never wait for pose or request a second camera frame', async () => {
  const original=frame('ball');
  const output=await runDetectionPass({frame:original,roi:[0,0,1280,720],withPose:false,
    runPose:()=>assert.fail('unexpected pose'),refreshBallFrame:()=>assert.fail('unexpected refresh'),
    runBall:async source=>{assert.equal(source,original);return result([]);}});
  assert.equal(output.person,undefined);
  assert.equal(output.timings.pose,null);
  assert.equal(output.ballFrameRefreshed,undefined);
});

test('camera stop or rotation during a pose pass cancels before ball inference', async () => {
  const pose=deferred();let current=true;
  const pending=runDetectionPass({frame:frame('before rotation'),roi:[0,0,1280,720],withPose:true,
    runPose:()=>pose.promise,
    refreshBallFrame:()=>current?{frame:frame('after'),capturedAt:1,sourceVideoTime:1}:null,
    runBall:()=>assert.fail('cancelled camera must not infer a ball')});
  current=false;pose.resolve(result({}));
  assert.deepEqual(await pending,{cancelled:true});
});

test('an unchanged decoded video frame retains the original capture timestamp', async () => {
  const original=frame('same');
  const output=await runDetectionPass({frame:original,roi:[0,0,1280,720],withPose:true,
    runPose:async()=>result({}),refreshBallFrame:()=>undefined,
    runBall:async source=>{assert.equal(source,original);return result([]);}});
  assert.equal(output.ballFrameRefreshed,undefined);
  assert.equal(output.capturedAt,undefined);
});

test('framing changes on the same canvas cannot silently reuse an incompatible crop', async () => {
  const source=frame('same canvas');
  await assert.rejects(runDetectionPass({frame:source,roi:[0,0,1280,720],withPose:true,
    runPose:async()=>result({}),
    refreshBallFrame:()=>{source.width=720;source.height=1280;return {frame:source,capturedAt:1,sourceVideoTime:1};},
    runBall:()=>assert.fail('wrong crop')}),/framing changed/);
});

test('pose failure aborts the pass instead of producing an unvalidated ball result', async () => {
  await assert.rejects(runDetectionPass({frame:frame('x'),roi:[0,0,1280,720],withPose:true,
    runPose:async()=>{throw new Error('device lost');},
    refreshBallFrame:()=>assert.fail('unexpected refresh'),
    runBall:()=>assert.fail('unexpected ball')}),/device lost/);
});
