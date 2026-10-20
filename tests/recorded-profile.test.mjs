import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfileEvidence, profileSamples, profileVideoGeometry, compareProfileOutputs, runRecordedProfile, replayProfileCounter, seekProfileFrame } from '../src/lib/ai/recordedProfile.mjs';

function evidence(){return {schema:'courtstreak-round-evidence-v1',drillKey:'right-hand-pound',frameSize:[1280,2276],videoRevision:'VIDEO 01',trackerRevision:'COUNT 03',phase:'interrupted',displayedCount:0,displayedCountTimeline:[{time:9.9,count:0}],countedReps:[],frames:Array.from({length:32},(_,i)=>({frameId:i+1,capturedAt:10+i*.3,elapsed:i*.3,inputPhase:'active',roi:[400,318,1118,2276],poseUpdated:i%4===0,counterFrame:i+1,selected:null,person:null}))};}
const shape={contentDuration:9.9};
const capture=async s=>({frame:{id:s.frameId},actualTime:s.time,preparationMs:3});
function detector(onCall=()=>{},different=false){const calls=[];return {provider:'test-double',liveInputMode:'legacy',modelManifest:{version:1},calls,async detect(frame,roi,withPose,options){calls.push({frame,roi:[...roi],withPose,mode:options.inputMode});onCall(calls.length);const reuse=options.inputMode==='reuse';return {ms:withPose?40:15,timings:{ball:{preprocessMs:reuse?1:2,inferenceMs:10,decodeMs:1},pose:withPose?{preprocessMs:reuse?2:3,inferenceMs:20,decodeMs:2}:null},balls:[{box:[different&&reuse?1.3:1,2,3,4],score:.8}],person:withPose?{box:[10,20,30,40],score:.9,xy:[[15,25]],confidence:[.95]}:null};}};}

test('sampling is fixed, uniform, bounded to camera content and retains recorded crops/pose flags',()=>{
 const a=profileSamples(evidence(),9.9),b=profileSamples(evidence(),9.9);
 assert.deepEqual(a,b);assert.equal(a.length,24);assert.equal(a[0].frameId,1);assert.equal(a.at(-1).frameId,32);
 assert.ok(a.every(x=>x.time<9.9));assert.ok(a.some(x=>x.withPose));assert.ok(a.some(x=>!x.withPose));
 assert.deepEqual(a[0].roi,[400,318,1118,2276]);
});
test('wrong drill, dimensions, missing active frames and invalid crops are rejected',()=>{
 for(const mutate of [d=>d.drillKey='crossover',d=>d.frameSize=[640,480],d=>d.frames=[],d=>d.frames[1].roi=[-1,0,100,200]]){const d=evidence();mutate(d);assert.throws(()=>validateProfileEvidence(d));}
});
test('counted video excludes its score card and maps the complete camera region',()=>{
 const x=profileVideoGeometry(evidence(),{width:464,height:960,duration:11.9,counted:true});
 assert.ok(Math.abs(x.contentDuration-9.9)<1e-8);assert.equal(x.sourceRect[2],464);
 assert.ok(x.sourceRect[1]>49&&x.sourceRect[1]<51);assert.ok(x.sourceRect[1]+x.sourceRect[3]<876);
 const y=profileVideoGeometry(evidence(),{width:464,height:826,duration:9.9,counted:false});assert.deepEqual(y.sourceRect,[0,0,464,826]);
});
test('mismatched video format or attempt duration cannot produce a misleading comparison',()=>{
 assert.throws(()=>profileVideoGeometry(evidence(),{width:464,height:960,duration:11.9,counted:false}));
 assert.throws(()=>profileVideoGeometry(evidence(),{width:464,height:960,duration:22,counted:true}));
});
test('paired calls use one identical frozen frame, crop and pose setting and balance order',async()=>{
 const d=detector(),report=await runRecordedProfile({detector:d,evidence:evidence(),geometry:shape,capture});
 assert.equal(d.calls.length,50);assert.equal(report.summary.pairs,24);assert.equal(report.summary.allOutputsMatch,true);
 for(let i=0;i<24;i++){const a=d.calls[2+i*2],b=d.calls[3+i*2];assert.equal(a.frame,b.frame);assert.deepEqual(a.roi,b.roi);assert.equal(a.withPose,b.withPose);assert.deepEqual([a.mode,b.mode],i%2?['reuse','legacy']:['legacy','reuse']);}
 assert.equal(report.summary.liveFpsMeasured,false);assert.equal(report.summary.liveCountingAccuracyMeasured,false);
 assert.equal(report.summary.variants.legacy.totalMs.n,24);
});
test('mismatched outputs invalidate a performance recommendation',async()=>{
 const report=await runRecordedProfile({detector:detector(()=>{},true),evidence:evidence(),geometry:shape,capture});
 assert.equal(report.summary.allOutputsMatch,false);assert.equal(report.summary.performanceComparisonUsable,false);
});
test('output comparison preserves predefined coordinate/score tolerances and rejects NaN',()=>{
 const a={balls:[{box:[1,2,3,4],score:.8}]},b=structuredClone(a);b.balls[0].box[0]+=.05;
 assert.equal(compareProfileOutputs(a,b).matches,true);b.balls[0].score+=.001;assert.equal(compareProfileOutputs(a,b).matches,false);
 b.balls[0].score=NaN;assert.equal(compareProfileOutputs(a,b).matches,false);
});
test('cancellation during inference cannot return a completed or partial success report',async()=>{
 const c=new AbortController(),d=detector(n=>{if(n===3)c.abort();});
 await assert.rejects(runRecordedProfile({detector:d,evidence:evidence(),geometry:shape,capture,signal:c.signal}),{name:'AbortError'});assert.equal(d.calls.length,3);
});
test('backgrounding invalidates the run even without an abort event',async()=>{
 let visible=true;const d=detector(n=>{if(n===4)visible=false;});
 await assert.rejects(runRecordedProfile({detector:d,evidence:evidence(),geometry:shape,capture,isActive:()=>visible}),{name:'AbortError'});
});
test('capture/decode failure does not fabricate detector timing results',async()=>{
 const d=detector();await assert.rejects(runRecordedProfile({detector:d,evidence:evidence(),geometry:shape,capture:async()=>{throw new Error('decode failed');}}),/decode failed/);assert.equal(d.calls.length,0);
});
test('missing detector timing breakdown fails the check',async()=>{
 const d=detector();const detect=d.detect;d.detect=async(...args)=>({...await detect(...args),timings:null});
 await assert.rejects(runRecordedProfile({detector:d,evidence:evidence(),geometry:shape,capture}),/timing breakdown/);
});
test('cached-input counter comparison reports missing terminal confirmations without inventing them',()=>{
 const d=evidence();d.displayedCount=1;const r=replayProfileCounter(d);
 assert.equal(r.accepted,0);assert.equal(r.matchesRecordedAcceptedEvents,true);assert.equal(r.unrecordedDisplayedEvents,1);
 d.droppedFrameRecords=1;assert.equal(replayProfileCounter(d).available,false);
});
class Video extends EventTarget {
 readyState=4;current=0;paused=false;
 get currentTime(){return this.current;}
 set currentTime(t){this.current=t;queueMicrotask(()=>this.dispatchEvent(new Event('seeked')));}
 pause(){this.paused=true;}
}
test('seeking a paused source resolves a decoded frame and honors cancellation',async()=>{
 const v=new Video();assert.equal(await seekProfileFrame(v,2),2);assert.equal(v.paused,true);
 const c=new AbortController();c.abort();await assert.rejects(seekProfileFrame(v,3,c.signal),{name:'AbortError'});
});
test('a seek that completes before frame data is available waits for the decoded data event',async()=>{
 class Delayed extends Video {
  readyState=1;seeking=false;
  get currentTime(){return this.current;}
  set currentTime(t){this.current=t;this.seeking=true;queueMicrotask(()=>{this.seeking=false;this.dispatchEvent(new Event('seeked'));queueMicrotask(()=>{this.readyState=4;this.dispatchEvent(new Event('loadeddata'));});});}
 }
 const v=new Delayed();assert.equal(await seekProfileFrame(v,2),2);assert.equal(v.readyState,4);
});
