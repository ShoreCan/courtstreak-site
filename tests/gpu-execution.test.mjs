import test from 'node:test';
import assert from 'node:assert/strict';
import {createGpuDetectorExecution,POSE_COMPACT_BYTES,POSE_REDUCED_COPY_BYTES} from '../src/lib/ai/gpuDetectorExecution.mjs';
import {BALL_COMPACT_BYTES, BALL_HEAD_TILES} from '../src/lib/ai/ballHeadCompact.mjs';
import {GpuDetectorInput} from '../src/lib/ai/gpuDetectorInput.mjs';
import {DetectorInput} from '../src/lib/ai/detectorInput.mjs';

test('GPU input preserves native-coordinate crop and letterbox while avoiding CPU pixel readback',()=>{
  const calls=[],canvas=()=>({width:0,height:0,getContext(){return {fillRect(){},drawImage(...args){calls.push(args);},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)};}};}});
  let copies=0,submits=0;
  const device={createTexture(){return {createView(){return {};},destroy(){}};},
    createComputePipeline(){return {getBindGroupLayout(){return {};}};},createShaderModule(){return {};},createBindGroup(){return {};},
    createCommandEncoder(){return {beginComputePass(){return {setPipeline(){},setBindGroup(){},dispatchWorkgroups(){},end(){}};},finish(){return {};}};},
    queue:{copyExternalImageToTexture(){copies++;},submit(){submits++;}}};
  const gpu=new GpuDetectorInput({device,size:8,buffer:{},createCanvas:canvas,usage:{TEXTURE_BINDING:1,COPY_DST:2,RENDER_ATTACHMENT:4}});
  gpu.context.getImageData=()=>{throw new Error('CPU readback is forbidden on this path');};
  const source={image:{width:720,height:1280},width:1280,height:2276},roi=[160,200,1000,2100];
  const actual=gpu.prepare(source,roi),expected=new DetectorInput(8,canvas).prepare(source,roi);
  assert.deepEqual(actual.transform,expected.transform);assert.deepEqual(calls[0],calls[1]);
  assert.equal(copies,1);assert.equal(submits,1);gpu.release();
});

function fixture({poseCandidates=0,reducedPoseReadback=false,block=false,fail=false,freshAtAdmission=false,singleBallReadback=false,compactBallReadback=false,orderedGpuSubmission=false,holdBallMap=false,pairedCompaction='match',clock}={}){
  const buffers=[],tensors=[],copies=[],releases=[],prepares=[],preparedSources=[],compactions=[],gpuOrder=[];
  let releaseBallMap;
  const ballMap=holdBallMap?new Promise(resolve=>{releaseBallMap=resolve;}):null;
  let release,active=0,maxActive=0;
  const held=block?new Promise(r=>{release=r;}):Promise.resolve();
  const device={
    createBuffer({size}){const b={size,bytes:new ArrayBuffer(size),destroyed:false,mapped:false,
      destroy(){this.destroyed=true;},async mapAsync(){if(holdBallMap&&size===7200)await ballMap;this.mapped=true;},getMappedRange(offset=0,size=this.size){return this.bytes.slice(offset,offset+size);},unmap(){this.mapped=false;}};buffers.push(b);return b;},
    createComputePipeline({compute}){return {entryPoint:compute.entryPoint,paired:compute.module.code.includes('fn loadAnchor'),getBindGroupLayout(){return {};}};},
    createShaderModule({code}){return {code};},pushErrorScope(){},async popErrorScope(){return null;},createBindGroup({entries}){return entries;},
    createCommandEncoder(){const tasks=[];return {beginComputePass(){
      let pipeline, entries;
      return {setPipeline(value){pipeline=value;},setBindGroup(_, value){entries=value;},dispatchWorkgroups(groups){
        if (pipeline.entryPoint === 'main') tasks.push(() => {
          const bytes = entries[1].resource.buffer.bytes;
          new Uint32Array(bytes)[0] = poseCandidates;
          if (poseCandidates) {
            // One valid person and other deliberately below-threshold rows.
            new Float32Array(bytes).set([300, 350, 100, 150, .8], 2);
          }
        });
        if (pipeline.entryPoint !== 'main') compactions.push([pipeline.entryPoint, groups]);
        if (pipeline.entryPoint === 'copyTopRows') tasks.push(() => {
          const output = new Uint8Array(entries[2].resource.buffer.bytes);
          // The fixture's head is already ordered, with the ball in row zero.
          if (!pipeline.paired || pairedCompaction === 'match') {
            output.set(new Uint8Array(entries[0].resource.buffer.bytes, 0, output.length));
          }
        });
      },end(){}};
    },
      clearBuffer(buffer,offset=0,size=buffer.size-offset){tasks.push(()=>new Uint8Array(buffer.bytes,offset,size).fill(0));},
    copyBufferToBuffer(a,ai,b,bi,size){copies.push(size);tasks.push(()=>{gpuOrder.push('copy-'+size);new Uint8Array(b.bytes,bi,size).set(new Uint8Array(a.bytes,ai,size));});},finish(){return tasks;}};},
    queue:{submit(commands){for(const tasks of commands)for(const task of tasks)task();}},
  };
  const ort={env:{webgpu:{device}},Tensor:{fromGpuBuffer(buffer,options){const t={buffer,...options,disposed:false,dispose(){this.disposed=true;}};tensors.push(t);return t;}}};
  const manifest={ball:{size:512,output_shape:singleBallReadback?[1,5376,84]:[1,300,6]},pose:{size:640,output_shape:[1,56,8400]}};
  const sessions=Object.fromEntries(['ball','pose'].map(kind=>[kind,{inputNames:['input'],outputNames:['output'],async run(feeds,fetches){
    gpuOrder.push(kind+'-run');active++;maxActive=Math.max(maxActive,active);try{await held;if(fail)throw new Error('prediction failed');
      if(kind==='ball'){
        const output=new Float32Array(fetches.output.buffer.bytes);
        output.set(singleBallReadback?[100,100,150,150]:[100,100,150,150,.9,32]);
        if(singleBallReadback)output[36]=.9;
      }
      return fetches;
    }finally{active--;}
  },async release(){releases.push(kind);}}]));
  const usage={STORAGE:1,COPY_DST:2,COPY_SRC:4,MAP_READ:8},mapMode={READ:1};
  const execution=createGpuDetectorExecution({ort,manifest,sessions,device,usage,mapMode,freshAtAdmission,singleBallReadback,compactBallReadback,orderedGpuSubmission,reducedPoseReadback,...(clock?{clock}:{}),
    createInput:({size})=>({stage(source){prepares.push(size);preparedSources.push(source);return {transform:{x:0,y:0,scale:1,px:0,py:0}};},
      upload(){gpuOrder.push('upload-'+size);},prepare(source){const prepared=this.stage(source);this.upload();return prepared;},release(){}})});
  return {execution,buffers,tensors,copies,releases,prepares,preparedSources,compactions,gpuOrder,release,releaseBallMap,get maxActive(){return maxActive;}};
}
test('GPU execution reuses fixed tensors, retains detections and releases all resources',async()=>{
  const f=fixture(),frame={width:640,height:640};
  const one=await f.execution.detect(frame,[0,0,640,640],true);
  const two=await f.execution.detect(frame,[0,0,640,640],true);
  assert.deepEqual(one.balls,two.balls);assert.equal(two.balls.length,1);assert.equal(two.person,null);
  assert.equal(f.tensors.length,4);assert.equal(f.copies.filter(n=>n===POSE_COMPACT_BYTES).length,2);
  await f.execution.close();assert.ok(f.buffers.every(b=>b.destroyed&&!b.mapped));assert.ok(f.tensors.every(t=>t.disposed));assert.equal(f.releases.length,2);
});
test('GPU model submission is serialized and concurrent ball admission is rejected',async()=>{
  const f=fixture({block:true}),frame={width:640,height:640};
  const pose=f.execution.runPose(frame),ball=f.execution.detect(frame,[0,0,640,640],false);
  assert.deepEqual(f.prepares,[640,512]);
  await assert.rejects(f.execution.detect(frame,[0,0,640,640],false),/busy/);
  const closing=f.execution.close();assert.equal(f.releases.length,0);f.release();
  await Promise.all([pose,ball,closing]);assert.equal(f.maxActive,1);assert.equal(f.releases.length,2);
});
test('pose compaction overflow reads every anchor instead of silently truncating',async()=>{
  const f=fixture({poseCandidates:257});await f.execution.runPose({width:640,height:640});
  assert.ok(f.copies.includes(56*8400*4));await f.execution.close();
});
test('failed predictions clear admission and resources still close',async()=>{
  const f=fixture({fail:true});await assert.rejects(f.execution.detect({width:640,height:640},[0,0,640,640],false),/prediction failed/);
  await assert.rejects(f.execution.detect({width:640,height:640},[0,0,640,640],false),/prediction failed/);
  await f.execution.close();assert.ok(f.buffers.every(b=>b.destroyed));
});

test('fresh admission snapshots ball pixels after the body queue wait and reports the actual capture',async()=>{
 let time=0,captured=false;const f=fixture({block:true,freshAtAdmission:true,clock:()=>time});
 const old={width:640,height:640,id:'old'},fresh={width:640,height:640,id:'fresh'};
 const pose=f.execution.runPose(old),ball=f.execution.detect(old,[0,0,640,640],false,{refreshBallFrame:()=>{
  captured=true;return {frame:fresh,capturedAt:.05,sourceVideoTime:1.05,roi:[10,20,600,620]};
 }});
 assert.equal(captured,false);assert.deepEqual(f.prepares,[640]);
 await Promise.resolve();time=50;f.release();const result=await ball;await pose;
 assert.equal(f.preparedSources.at(-1),fresh);assert.equal(result.capturedAt,.05);assert.deepEqual(result.actualROI,[10,20,600,620]);
 assert.equal(result.timings.ball.queueWaitMs,50);assert.equal(result.timings.ball.runtimeCallMs,0);
 assert.equal(result.timings.ball.inferenceMs,result.timings.ball.queueWaitMs+result.timings.ball.runtimeCallMs);
 await f.execution.close();
});
test('cancelled admission does not run a stale ball frame',async()=>{
 const f=fixture({freshAtAdmission:true});
 const result=await f.execution.detect({width:640,height:640},[0,0,640,640],false,{refreshBallFrame:()=>null});
 assert.equal(result.cancelled,true);assert.deepEqual(f.prepares,[]);await f.execution.close();
});
test('orientation changes at GPU admission fail instead of attaching new timestamps to the old image',async()=>{
 const f=fixture({freshAtAdmission:true});
 await assert.rejects(f.execution.detect({width:640,height:640},[0,0,640,640],false,{refreshBallFrame:()=>({frame:{width:640,height:360},capturedAt:1,sourceVideoTime:1})}),/changed orientation/);
 await f.execution.close();assert.ok(f.buffers.every(b=>b.destroyed));
});

test('single-readback GPU execution decodes the same sports ball and unmaps its fixed buffer',async()=>{
  const original=fixture(),candidate=fixture({singleBallReadback:true});
  const frame={width:640,height:640};
  const before=await original.execution.detect(frame,[0,0,640,640],false);
  const after=await candidate.execution.detect(frame,[0,0,640,640],false);
  assert.deepEqual(after.balls,before.balls);
  assert.deepEqual(candidate.copies,[5376*84*4]);
  assert.equal(candidate.execution.ballProcessingRevision,'BALL READBACK 01');
  await Promise.all([original.execution.close(),candidate.execution.close()]);
  assert.ok(candidate.buffers.every(b=>b.destroyed&&!b.mapped));
});

test('compact readback runs both GPU stages and maps only the retained ball rows', async () => {
  const original = fixture({singleBallReadback: true});
  const compact = fixture({singleBallReadback: true, compactBallReadback: true});
  const frame = {width: 640, height: 640};
  const roi = [0, 0, 640, 640];
  const before = await original.execution.detect(frame, roi, false);
  const after = await compact.execution.detect(frame, roi, false);
  assert.deepEqual(after.balls, before.balls);
  assert.deepEqual(compact.compactions, [['sortTiles', BALL_HEAD_TILES], ['copyTopRows', BALL_HEAD_TILES]]);
  assert.deepEqual(compact.copies, [BALL_COMPACT_BYTES]);
  assert.equal(after.timings.ball.ballReadbackBytes, BALL_COMPACT_BYTES);
  assert.ok(Number.isFinite(after.timings.ball.gpuMapWaitMs));
  assert.ok(Number.isFinite(after.timings.ball.ballOutputProcessingMs));
  assert.equal(compact.execution.ballProcessingRevision, 'BALL READBACK 02');
  await Promise.all([original.execution.close(), compact.execution.close()]);
  assert.ok(compact.buffers.every(buffer => buffer.destroyed && !buffer.mapped));
});

test('ball-first queues the ball copy ahead of the pose upload without blocking on the map', async () => {
  const f=fixture({freshAtAdmission:true,orderedGpuSubmission:true,holdBallMap:true});
  const frame={width:640,height:640};
  const ball=f.execution.detect(frame,[0,0,640,640],false,{refreshBallFrame:()=>undefined});
  const pose=f.execution.runPose(frame);
  assert.deepEqual(f.prepares,[640]);
  assert.deepEqual(f.gpuOrder,[]);
  try {
    await pose;
    assert.deepEqual(f.gpuOrder,['upload-512','ball-run','copy-7200','upload-640','pose-run','copy-'+POSE_COMPACT_BYTES]);
  } finally {
    f.releaseBallMap();
    await ball;
    await f.execution.close();
  }
});

test('cancelled ball admission releases the following pose submission', async () => {
  const f=fixture({freshAtAdmission:true,orderedGpuSubmission:true});
  const frame={width:640,height:640};
  const ball=f.execution.detect(frame,[0,0,640,640],false,{refreshBallFrame:()=>null});
  const pose=f.execution.runPose(frame);
  assert.equal((await ball).cancelled,true);
  await pose;
  assert.deepEqual(f.gpuOrder,['upload-640','pose-run','copy-'+POSE_COMPACT_BYTES]);
  await f.execution.close();
});

test('paired compaction activates only when it reads identical output on the same warm head', async () => {
  const source = {width: 640, height: 640};
  const roi = [0, 0, 640, 640];
  for (const [fixtureMode, result, revision] of [
    ['match', 'verified', 'BALL READBACK 03'],
    ['no-write', 'output-mismatch', 'BALL READBACK 02'],
  ]) {
    const {execution} = fixture({singleBallReadback: true, compactBallReadback: true, pairedCompaction: fixtureMode});
    try {
      const warm = await execution.detect(source, roi, false);
      assert.equal(await execution.verifyPairedBallCompaction(), result);
      assert.equal(execution.ballProcessingRevision, revision);
      assert.deepEqual((await execution.detect(source, roi, false)).balls, warm.balls);
    } finally {
      await execution.close();
    }
  }
});

test('ball timings identify a pose already pending before the ball is queued', async () => {
  const {execution} = fixture({orderedGpuSubmission: true, freshAtAdmission: true});
  const frame = {width: 640, height: 640};
  const roi = [0, 0, 640, 640];
  try {
    const pose = execution.runPose(frame);
    const afterPose = await execution.detect(frame, roi, false, {refreshBallFrame: () => undefined});
    await pose;
    assert.equal(afterPose.timings.ball.posePendingWhenQueued, true);
    const ballFirst = execution.detect(frame, roi, false, {refreshBallFrame: () => undefined});
    const laterPose = execution.runPose(frame);
    assert.equal((await ballFirst).timings.ball.posePendingWhenQueued, false);
    await laterPose;
  } finally {
    await execution.close();
  }
});

test('paired sort stages cover every lane once and retain the descending score and ascending index order', () => {
  for (let group = 0; group < BALL_HEAD_TILES; group++) {
    const size = 128;
    const rows = Array.from({length: size}, (_, i) => ({
      index: group * size + i,
      score: (i * 11 + (i % 7) * group) % 19,
    }));
    const order = (a, b) => b.score - a.score || a.index - b.index;
    const expected = [...rows].sort(order);
    for (let width = 2; width <= size; width *= 2) {
      for (let stride = width / 2; stride >= 1; stride /= 2) {
        const covered = new Set();
        for (let lane = 0; lane < size / 2; lane++) {
          const lo = Math.floor(lane / stride) * (stride * 2) + lane % stride;
          const hi = lo + stride;
          assert.equal(covered.has(lo) || covered.has(hi), false);
          covered.add(lo);
          covered.add(hi);
          if ((order(rows[lo], rows[hi]) < 0) !== ((lo & width) === 0)) {
            [rows[lo], rows[hi]] = [rows[hi], rows[lo]];
          }
        }
        assert.equal(covered.size, size);
      }
    }
    assert.deepEqual(rows, expected);
  }
});

test('the reduced pose copy preserves body and wrist output and promotes capacity after overflow', async () => {
  const baseline = fixture({poseCandidates: 10});
  const reduced = fixture({poseCandidates: 10, reducedPoseReadback: true});
  const overflow = fixture({poseCandidates: 35, reducedPoseReadback: true});
  const frame = {width: 640, height: 640};
  try {
    const before = await baseline.execution.runPose(frame);
    const after = await reduced.execution.runPose(frame);
    assert.ok(before.value);
    assert.deepEqual(after.value, before.value);
    assert.equal(after.timings.poseCandidates, 10);
    assert.equal(after.timings.poseReadbackBytes, POSE_REDUCED_COPY_BYTES);
    assert.equal(after.timings.poseCompactOverflow, false);
    assert.deepEqual(reduced.copies, [POSE_REDUCED_COPY_BYTES]);

    const restored = await overflow.execution.runPose(frame);
    assert.deepEqual(restored.value, before.value);
    assert.equal(restored.timings.poseCompactOverflow, true);
    assert.equal(restored.timings.poseCandidates, 35);
    assert.deepEqual(overflow.copies, [POSE_REDUCED_COPY_BYTES, POSE_COMPACT_BYTES]);
    assert.equal((await overflow.execution.runPose(frame)).timings.poseReadbackBytes, POSE_COMPACT_BYTES);
    assert.deepEqual(overflow.copies, [POSE_REDUCED_COPY_BYTES, POSE_COMPACT_BYTES, POSE_COMPACT_BYTES]);
  } finally {
    await Promise.all([baseline, reduced, overflow].map(f => f.execution.close()));
  }
});
