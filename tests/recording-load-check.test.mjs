import test from 'node:test';
import assert from 'node:assert/strict';
import { runRecordingLoadCheck, summarizeRecordingBlocks, validateRecordingInputs, settleRecordingLoad, createRecordingLoad, RECORDING_INPUT_IDS } from '../src/lib/ai/recordingLoadCheck.mjs';
import { safeTrackerReturn } from '../src/lib/trackerReturn.mjs';

const samples=RECORDING_INPUT_IDS.map((frameId,i)=>({frameId,withPose:[2,3,4,11].includes(i),roi:[403,318,1119,2276],decodedPts:i*.7,pngSha256:'b'.repeat(64)}));
function harness({effect=1.3,changed=false,onCall=()=>{},noBytes=false}={}){
 let now=0,recording=false,calls=0;const events=[],frames=new Map(samples.map(s=>[s.frameId,{}]));
 const load={async begin(on){events.push(on?'ON':'OFF');recording=on;},snapshot(){return {cameraLive:true,width:720,height:1280,recording};},async end(){events.push('stop');recording=false;return {bytes:noBytes?0:100,mimeType:'video/mp4'};}};
 const detector={provider:'webgpu',liveInputMode:'legacy',modelManifest:{version:1},async detect(frame,roi,withPose){onCall(++calls);const ms=(withPose?150:50)*(recording?effect:1);now+=ms;return {ms,timings:{ball:{preprocessMs:2,inferenceMs:40,decodeMs:1},pose:withPose?{preprocessMs:3,inferenceMs:90,decodeMs:1}:null},balls:[{box:[changed&&recording?1:0,0,10,10],score:.9}],person:null};}};
 return {events,load,detector,samples,capture:async s=>({frame:frames.get(s.frameId),ms:0,pixelSha256:s.pngSha256}),settle:async()=>{},clock:()=>now,get calls(){return calls;}};
}
test('OFF/ON then ON/OFF runs identical crops, frozen pixels and pose schedules with both live models',async()=>{
 const h=harness(),r=await runRecordingLoadCheck(h);assert.equal(h.calls,51);assert.equal(r.completed,true);assert.equal(r.summary.allOutputsMatch,true);assert.equal(r.summary.recordingCostSignal,true);
 assert.deepEqual(h.events,['OFF','stop','ON','stop','ON','stop','OFF','stop']);assert.ok(Math.abs(r.summary.overallTimeIncreasePercent.all-30)<1e-8);
 assert.equal(r.summary.variants.off.ballOnly.n,16);assert.equal(r.summary.variants.on.poseInclusive.n,8);assert.equal(r.summary.liveCountingAccuracyMeasured,false);
 assert.deepEqual(r.blocks[0].rows.map(x=>x.frameId),RECORDING_INPUT_IDS);assert.deepEqual(r.blocks[2].rows.map(x=>x.frameId),[...RECORDING_INPUT_IDS].reverse());
});
test('a small effect or a favorable pooled total cannot establish the recording bottleneck',async()=>{
 const r=await runRecordingLoadCheck(harness({effect:1.04}));assert.equal(r.summary.recordingCostSignal,false);
 const q=await runRecordingLoadCheck(harness());const b=structuredClone(q.blocks);for(const row of b[2].rows)row.processingMs*=.5;
 assert.equal(summarizeRecordingBlocks(b).recordingCostSignal,false);assert.throws(()=>summarizeRecordingBlocks(b.slice(0,3)),/partial/);
});
test('output, pixel or camera changes invalidate comparison conclusions',async()=>{
 const r=await runRecordingLoadCheck(harness({changed:true}));assert.equal(r.summary.allOutputsMatch,false);assert.equal(r.summary.comparisonUsable,false);
 const clean=await runRecordingLoadCheck(harness()),b=structuredClone(clean.blocks);b[1].rows[0].pixelSha256='c'.repeat(64);assert.throws(()=>summarizeRecordingBlocks(b),/source input/);
 const c=structuredClone(clean.blocks);c[2].after.width=1280;assert.equal(summarizeRecordingBlocks(c).comparisonUsable,false);
});
test('failed recording, incorrect provider, cancellation and backgrounding do not return completed reports',async()=>{
 await assert.rejects(runRecordingLoadCheck(harness({noBytes:true})),/valid video bytes/);
 const wrong=harness();wrong.detector.provider='wasm';await assert.rejects(runRecordingLoadCheck(wrong),/unchanged WebGPU/);
 const abort=new AbortController(),h=harness({onCall:n=>{if(n===17)abort.abort();}});await assert.rejects(runRecordingLoadCheck({...h,signal:abort.signal}),{name:'AbortError'});assert.equal(h.events.at(-1),'stop');
 let active=true;const bg=harness({onCall:n=>{if(n===16)active=false;}});await assert.rejects(runRecordingLoadCheck({...bg,isActive:()=>active}),{name:'AbortError'});assert.equal(bg.events.at(-1),'stop');
});
test('model failure stops the active recording load; cancelled settling is not a timing result',async()=>{
 const h=harness({onCall:n=>{if(n===16)throw new Error('model failed');}});await assert.rejects(runRecordingLoadCheck(h),/model failed/);assert.equal(h.events.at(-1),'stop');
 const abort=new AbortController();abort.abort();await assert.rejects(settleRecordingLoad(1000,abort.signal),{name:'AbortError'});
});
test('the previous pose/profile file and changed crop schedule cannot replace the full workload',()=>{
 assert.throws(()=>validateRecordingInputs({schema:'courtstreak-pose-inputs-v1'}),/recording-check/);
 const p={schema:'courtstreak-recording-inputs-v1',sourceVideoSha256:'da12257452a24ba7965ee28fdf133bd7c00733c589726cf881af162c336d8fa6',frameSize:[1280,2276],sourceRect:[0,50,464,824],samples:samples.map(s=>({...s,pngBase64:'abc'}))};assert.equal(validateRecordingInputs(p).length,12);p.samples[0].roi=[0,0,1280,2276];assert.throws(()=>validateRecordingInputs(p),/crop/);
 assert.equal(safeTrackerReturn('/lab/drill/right-hand-pound/session?mode=recording-load'),'/lab/drill/right-hand-pound/session?mode=recording-load');
});
test('the native recorder reports its selected codec, verifies real bytes and releases temporary blobs without stopping camera tracks',async()=>{
 let cameraStopped=false;
 class Recorder{static isTypeSupported(){return true;}constructor(stream,{mimeType}){this.state='inactive';this.mimeType=mimeType;}start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob(['real bytes'],{type:this.mimeType})});this.onstop();});}}
 const track={readyState:'live',enabled:true,muted:false,getSettings:()=>({width:720,height:1280,frameRate:30}),stop(){cameraStopped=true;}};
 const load=createRecordingLoad({getVideoTracks:()=>[track]},{Recorder});await load.begin(false);assert.equal(load.snapshot().recording,false);assert.equal(await load.end(),null);
 await load.begin(true);assert.equal(load.snapshot().recording,true);const result=await load.end();assert.equal(result.bytes,10);assert.equal(result.mimeType,'video/mp4;codecs=avc1.42001f');assert.equal(cameraStopped,false);assert.deepEqual(await load.end(),result);
 await load.begin(true);await load.end();assert.equal(load.snapshot().recording,false);
});
