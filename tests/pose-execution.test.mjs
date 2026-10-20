import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoseExecutor, comparePoseRaw, validatePoseOutput, runPoseCheck, summarizePoseTrials, readPoseInputs, POSE_MODES, POSE_INPUT_IDS } from '../src/lib/ai/poseExecution.mjs';
import { safeTrackerReturn } from '../src/lib/trackerReturn.mjs';

const input=new Float32Array(3*640*640),raw=new Float32Array(56*8400);
raw[4*8400]=.9;raw[0]=320;raw[8400]=320;raw[2*8400]=180;raw[3*8400]=400;
const samples=POSE_INPUT_IDS.map(frameId=>({frameId,data:input,transform:{x:0,y:0,px:140,py:0,scale:640/2276}}));
function harness({mismatch=false,onCall=()=>{},durations={current:100,gpuIo:80,capture:70}}={}){
  let now=0;const calls=[],different=raw.slice();different[0]+=1;
  const executors=Object.fromEntries(POSE_MODES.map(mode=>[mode,{async run(data){calls.push({mode,data});onCall(calls.length);now+=durations[mode];return {raw:mismatch&&mode==='capture'?different:raw,dims:[1,56,8400],timings:{cpuInputToOutputMs:durations[mode]}};}}]));
  return {executors,calls,clock:()=>now};
}
test('the complete design balances case, block and all three execution positions',async()=>{
  const h=harness(),r=await runPoseCheck({...h,samples});
  assert.equal(h.calls.length,153);assert.equal(r.trials.length,48);assert.equal(r.warmup.length,9);
  assert.equal(r.summary.comparisons.capture.decision,'KEEP');assert.equal(r.summary.comparisons.gpuIo.decision,'KEEP');
  for(const block of [0,1])for(const id of POSE_INPUT_IDS)for(const mode of POSE_MODES){
    const rows=r.trials.filter(t=>t.block===block&&t.frameId===id);assert.equal(rows.length,3);assert.deepEqual(rows.map(t=>t.order.indexOf(mode)).sort(),[0,1,2]);
  }
  for(let i=9;i<h.calls.length;i+=3){assert.equal(h.calls[i].data,h.calls[i+1].data);assert.equal(h.calls[i].data,h.calls[i+2].data);}
  assert.equal(r.summary.liveCountingAccuracyMeasured,false);assert.equal(r.summary.liveFpsMeasured,false);
  assert.ok(r.trials.every(t=>!('data' in t)&&!('raw' in t.variants.current)));
});
test('output differences prevent accepting a faster execution option',async()=>{
  const r=await runPoseCheck({...harness({mismatch:true}),samples});
  assert.equal(r.summary.comparisons.capture.decision,'REVERT');assert.equal(r.summary.comparisons.capture.allOutputsMatch,false);
});
test('a favorable total cannot hide a slower order group or p95 regression',async()=>{
  const r=await runPoseCheck({...harness(),samples});
  const rows=structuredClone(r.trials);
  rows[0].variants.capture.ms=1200;
  const s=summarizePoseTrials(rows);assert.equal(s.comparisons.capture.decision,'REVISE');
  assert.ok(s.comparisons.capture.orders[0].timeChangePercent>0);
  assert.throws(()=>summarizePoseTrials(rows.slice(0,47)),/partial/);
});
test('cancellation after a model call cannot produce completed results',async()=>{
  const c=new AbortController(),h=harness({onCall:n=>{if(n===11)c.abort();}});
  await assert.rejects(runPoseCheck({...h,samples,signal:c.signal}),{name:'AbortError'});assert.equal(h.calls.length,11);
});
test('backgrounding, invalid output and execution failure stop the experiment',async()=>{
  let visible=true;const h=harness({onCall:n=>{if(n===2)visible=false;}});
  await assert.rejects(runPoseCheck({...h,samples,isActive:()=>visible}),{name:'AbortError'});
  const bad=harness();bad.executors.capture.run=async()=>{throw new Error('unsupported capture');};
  await assert.rejects(runPoseCheck({...bad,samples}),/unsupported capture/);
  const nan=raw.slice();nan[2]=NaN;assert.throws(()=>validatePoseOutput({raw:nan,dims:[1,56,8400]}),/non-finite/);
  assert.throws(()=>validatePoseOutput({raw,dims:[1,8400,56]}),/dimensions/);
  assert.equal(comparePoseRaw(raw,nan).matches,false);assert.equal(comparePoseRaw(raw,raw).matches,true);
});
test('a different evidence pack or sample schedule cannot silently replace the benchmark',async()=>{
  await assert.rejects(readPoseInputs({schema:'other'}),/prepared/);
  await assert.rejects(runPoseCheck({...harness(),samples:samples.slice(1)}),/schedule/);
});

function gpuDouble({failBuffer=false,runWait=null}={}){
  const events=[],buffers=[],runBindings=[],options=[];let tensorDisposals=0;
  const device={createBuffer({size}){if(failBuffer&&buffers.length===1)throw new Error('allocation failed');const b={storage:new ArrayBuffer(size),destroy(){events.push('destroy');},async mapAsync(){events.push('map');},getMappedRange(){return b.storage;},unmap(){events.push('unmap');}};buffers.push(b);return b;},
    queue:{writeBuffer(b,offset,data){new Float32Array(b.storage).set(data);},submit(commands){for(const command of commands)command();}},
    createCommandEncoder(){let copy;return {copyBufferToBuffer(from,fo,to,toff,size){copy=()=>new Uint8Array(to.storage,toff,size).set(new Uint8Array(from.storage,fo,size));},finish(){return copy;}};}};
  class Tensor{constructor(type,data,dims){this.type=type;this.data=data;this.dims=dims;}dispose(){tensorDisposals++;}static fromGpuBuffer(buffer,{dims}){return {gpuBuffer:buffer,dims,getData(){throw new Error('must not download a fixed tensor');},dispose(){throw new Error('must not dispose a fixed GPU binding');}};}}
  const session={inputNames:['images'],outputNames:['output0'],async run(feeds,fetches){runBindings.push({feeds,fetches});if(runWait)await runWait;const dest=fetches?.output0;if(dest){new Float32Array(dest.gpuBuffer.storage)[0]=new Float32Array(feeds.images.gpuBuffer.storage)[0];return fetches;}return {output0:{data:raw,dims:[1,56,8400],location:'cpu',dispose(){tensorDisposals++;}}};},async release(){events.push('release');}};
  const ort={Tensor,env:{webgpu:{device}},InferenceSession:{async create(model,opts){options.push(opts);return session;}}};
  return {ort,device,usage:{STORAGE:1,COPY_DST:2,COPY_SRC:4,MAP_READ:8},mapMode:{READ:1},events,buffers,runBindings,options,get tensorDisposals(){return tensorDisposals;}};
}
test('graph capture retains fixed bindings across changing inputs and reads each fresh output',async()=>{
  const g=gpuDouble(),e=await createPoseExecutor({...g,model:new Uint8Array(1),mode:'capture'}),data=input.slice();
  data[0]=11;assert.equal((await e.run(data)).raw[0],11);data[0]=23;assert.equal((await e.run(data)).raw[0],23);
  assert.equal(g.runBindings[0].feeds.images,g.runBindings[1].feeds.images);assert.equal(g.runBindings[0].fetches.output0,g.runBindings[1].fetches.output0);
  assert.equal(g.options[0].enableGraphCapture,true);assert.equal(g.options[0].preferredOutputLocation,'gpu-buffer');
  await e.close();await e.close();assert.deepEqual(g.events.slice(-4),['release','destroy','destroy','destroy']);
  assert.equal(g.tensorDisposals,0);await assert.rejects(e.run(data),/closed/);
});
test('the control is CPU I/O on WebGPU; buffer-only mode explicitly disables capture',async()=>{
  const a=gpuDouble(),b=gpuDouble();const current=await createPoseExecutor({...a,mode:'current'}),io=await createPoseExecutor({...b,mode:'gpuIo'});
  await current.run(input);assert.deepEqual(a.options[0],{executionProviders:['webgpu'],graphOptimizationLevel:'all'});assert.equal(a.tensorDisposals,2);
  assert.equal(b.options[0].enableGraphCapture,false);await current.close();await io.close();
});
test('allocation failure and an in-flight close release sessions before owned buffers',async()=>{
  const fail=gpuDouble({failBuffer:true});await assert.rejects(createPoseExecutor({...fail,mode:'capture'}),/allocation failed/);assert.deepEqual(fail.events,['release','destroy']);
  let finish;const wait=new Promise(resolve=>finish=resolve),g=gpuDouble({runWait:wait}),e=await createPoseExecutor({...g,mode:'capture'});
  const running=e.run(input),closing=e.close();assert.equal(g.events.length,0);await assert.rejects(e.run(input),/busy or closed/);
  finish();await running;await closing;assert.equal(g.events.indexOf('release')<g.events.indexOf('destroy'),true);
});
test('login returns only to an allowlisted local tracker mode, preserving the membership gate',()=>{
  const path='/lab/drill/right-hand-pound/session';
  for(const mode of ['pose-execution','recorded-profile','iphone-vision-test'])assert.equal(safeTrackerReturn(path+'?mode='+mode),path+'?mode='+mode);
  for(const value of ['https://evil.test'+path+'?mode=pose-execution','//evil.test'+path+'?mode=pose-execution',path+'?mode=ai-test',path+'?mode=pose-execution&mode=recorded-profile',path+'evil?mode=pose-execution',path+'?mode=pose-execution\\evil',null])assert.equal(safeTrackerReturn(value),null);
  assert.equal(safeTrackerReturn(path+'?mode=pose-execution&next=https://evil.test#x'),path+'?mode=pose-execution');
});
