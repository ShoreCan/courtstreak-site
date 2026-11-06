import {GpuDetectorInput} from './gpuDetectorInput.mjs';
import {decodeOutput} from './detectorOutput.mjs';
import {runDetectionPass} from './detectionPass.mjs';
import {ORDINARY_BALL_SCORE} from './ballProposalPolicy.mjs';

export const GPU_EXECUTION_REVISION = 'SAFARI GPU 01';
export const POSE_CAPACITY = 256;
export const POSE_COMPACT_BYTES = Math.ceil((4 + POSE_CAPACITY * 57 * 4) / 16) * 16;
export const POSE_COMPACT_SHADER = `
struct Compact { count: atomic<u32>, words: array<u32> }
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: Compact;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= 8400u) { return; }
  let score = input[4u * 8400u + index];
  if (!(score >= 0.18 && score <= 3.402823e38)) { return; }
  let slot = atomicAdd(&output.count, 1u);
  if (slot >= 256u) { return; }
  output.words[slot * 57u] = index;
  for (var c = 0u; c < 56u; c++) {
    output.words[slot * 57u + c + 1u] = bitcast<u32>(input[c * 8400u + index]);
  }
}`;

// Restore the original anchor order before the existing stable sort/NMS.
// If more than capacity anchors pass, the caller must read the full tensor.
export function unpackPoseCompact(bytes) {
  const words = new Uint32Array(bytes), count = words[0];
  if (count > POSE_CAPACITY) return null;
  const floats = new Float32Array(bytes), order = Array.from({length: count}, (_, i) => i)
    .sort((a, b) => words[1 + a * 57] - words[1 + b * 57]);
  const data = new Float32Array(56 * count);
  for (let i = 0; i < count; i++) for (let c = 0; c < 56; c++) data[c * count + i] = floats[2 + order[i] * 57 + c];
  return {data, dims: [1, 56, count]};
}

// Fixed input/output tensors and staging buffers, one job per model. Session
// submission is serialized (ORT's shared dispatch state); GPU readback can overlap.
export function createGpuDetectorExecution({ort, manifest, sessions, device = ort.env.webgpu.device,
  usage = globalThis.GPUBufferUsage, mapMode = globalThis.GPUMapMode,
  createInput = options => new GpuDetectorInput(options), clock = () => performance.now(), freshAtAdmission = false}) {
  if (!device || !usage || !mapMode) throw new Error('GPU acceleration is unavailable on this device.');
  const resources = {}, buffers = [], pending = new Set();
  let dispatch = Promise.resolve(), ballPending = false, closing = false, closePromise;
  const buffer = (size, flags) => {
    const b = device.createBuffer({size: Math.ceil(size / 16) * 16, usage: flags}); buffers.push(b); return b;
  };
  try {
    for (const kind of Object.keys(sessions)) {
      const model = manifest[kind], dims = model.output_shape;
      if (JSON.stringify(dims) !== JSON.stringify(kind === 'pose' ? [1, 56, 8400] : [1, 300, 6]))
        throw new Error('The GPU candidate requires the pinned detector output shapes.');
      const size = model.size, bytes = dims.reduce((a, b) => a * b, 4);
      const inputBuffer = buffer(3 * size * size * 4, usage.STORAGE | usage.COPY_DST);
      const outputBuffer = buffer(bytes, usage.STORAGE | usage.COPY_SRC | usage.COPY_DST);
      const r = resources[kind] = {bytes, outputBuffer, busy: false};
      r.inputTensor = ort.Tensor.fromGpuBuffer(inputBuffer, {dataType: 'float32', dims: [1, 3, size, size]});
      r.outputTensor = ort.Tensor.fromGpuBuffer(outputBuffer, {dataType: 'float32', dims});
      r.input = createInput({device, size, buffer: inputBuffer});
      if (kind === 'pose') {
        r.compact = buffer(POSE_COMPACT_BYTES, usage.STORAGE | usage.COPY_SRC | usage.COPY_DST);
        r.staging = buffer(POSE_COMPACT_BYTES, usage.MAP_READ | usage.COPY_DST);
        r.fullStaging = buffer(bytes, usage.MAP_READ | usage.COPY_DST);
        r.pipeline = device.createComputePipeline({layout: 'auto',
          compute: {module: device.createShaderModule({code: POSE_COMPACT_SHADER}), entryPoint: 'main'}});
        r.bind = device.createBindGroup({layout: r.pipeline.getBindGroupLayout(0), entries: [
          {binding: 0, resource: {buffer: outputBuffer}}, {binding: 1, resource: {buffer: r.compact}}]});
      } else r.staging = buffer(bytes, usage.MAP_READ | usage.COPY_DST);
    }
  } catch (e) {
    for (const r of Object.values(resources)) { r.input?.release(); r.inputTensor?.dispose?.(); r.outputTensor?.dispose?.(); }
    for (const b of buffers) b.destroy(); throw e;
  }
  async function read(buffer, size) {
    await buffer.mapAsync(mapMode.READ);
    try { return buffer.getMappedRange(0, size).slice(0); } finally { buffer.unmap(); }
  }
  function run(kind, source, roi, minimumBallScore = ORDINARY_BALL_SCORE, captureAtAdmission) {
    if (closing) throw new Error('The GPU detector has been closed.');
    const r = resources[kind], session = sessions[kind], began = clock();
    if (!r || r.busy) throw new Error('A GPU model pass is already in progress.');
    r.busy = true;
    let prepared,preparedAt,admittedAt,runtimeAt,capture=null,cancelled=false;
    const queuedAt=clock();
    if(!captureAtAdmission){
      try { prepared=r.input.prepare(source,roi);preparedAt=clock(); } catch(e){r.busy=false;throw e;}
    }
    const submitted = dispatch.then(async()=>{
      admittedAt=clock();
      if(captureAtAdmission){
        const next=captureAtAdmission();
        if(next===null){cancelled=true;return;}
        if(next!==undefined){
          if(!next.frame||!Number.isFinite(next.capturedAt)||!Number.isFinite(next.sourceVideoTime)||
            next.frame.width!==source.width||next.frame.height!==source.height)throw new Error('The admitted camera frame is invalid or changed orientation.');
          source=next.frame;roi=next.roi??roi;
          capture={capturedAt:next.capturedAt,sourceVideoTime:next.sourceVideoTime,roi:[...roi]};
        }
        prepared=r.input.prepare(source,roi);preparedAt=clock();
      }
      runtimeAt=clock();
      return session.run({[session.inputNames[0]]:r.inputTensor},{[session.outputNames[0]]:r.outputTensor});
    });
    dispatch=submitted.then(()=>{},()=>{});
    const job=(async()=>{
      await submitted;
      if(cancelled)return {cancelled:true};
      const inferredAt=clock(),encoder=device.createCommandEncoder();
      if(kind==='pose'){
        device.queue.writeBuffer(r.compact,0,new Uint32Array([0]));
        const pass=encoder.beginComputePass();pass.setPipeline(r.pipeline);pass.setBindGroup(0,r.bind);
        pass.dispatchWorkgroups(Math.ceil(8400/64));pass.end();
        encoder.copyBufferToBuffer(r.compact,0,r.staging,0,POSE_COMPACT_BYTES);
      }else encoder.copyBufferToBuffer(r.outputBuffer,0,r.staging,0,r.bytes);
      device.queue.submit([encoder.finish()]);
      let output;
      if(kind==='pose'){
        output=unpackPoseCompact(await read(r.staging,POSE_COMPACT_BYTES));
        if(!output){
          const full=device.createCommandEncoder();full.copyBufferToBuffer(r.outputBuffer,0,r.fullStaging,0,r.bytes);
          device.queue.submit([full.finish()]);
          output={data:new Float32Array(await read(r.fullStaging,r.bytes)),dims:manifest.pose.output_shape};
        }
      }else output={data:new Float32Array(await read(r.staging,r.bytes)),dims:manifest.ball.output_shape};
      const value=decodeOutput(output,kind,prepared.transform,{minimumBallScore}),done=clock();
      const preprocessMs=captureAtAdmission?preparedAt-admittedAt:preparedAt-began;
      const queueWaitMs=admittedAt-(captureAtAdmission?queuedAt:preparedAt),runtimeCallMs=inferredAt-runtimeAt;
      return {value,timings:{preprocessMs,inferenceMs:queueWaitMs+runtimeCallMs,decodeMs:done-inferredAt,
        queueWaitMs,runtimeCallMs,readbackDecodeMs:done-inferredAt},...(capture?{capture}:{} )};
    })();
    pending.add(job);
    job.then(()=>{r.busy=false;pending.delete(job);},()=>{r.busy=false;pending.delete(job);});
    return job;
  }
  const execution = {
    liveInputMode: 'gpu-stream', inputRevision: freshAtAdmission?'SAFARI GPU 02':GPU_EXECUTION_REVISION,
    // This call copies the source into GPU input synchronously before returning.
    runPose(source) { return run('pose', source, [0, 0, source.width, source.height]); },
    async detect(frame, roi, withPose, {minimumBallScore = ORDINARY_BALL_SCORE, refreshBallFrame} = {}) {
      if (ballPending || closing) throw new Error('The GPU detector is busy or closed.');
      if (!Number.isFinite(minimumBallScore) || minimumBallScore < 0 || minimumBallScore > 1) throw new Error('Invalid ball proposal threshold.');
      ballPending = true;
      try {
        const result = await runDetectionPass({frame, roi, withPose, refreshBallFrame:freshAtAdmission?undefined:refreshBallFrame, clock,
          runPose: source => execution.runPose(source), runBall: (source, crop) => run('ball', source, crop, minimumBallScore, freshAtAdmission?refreshBallFrame:undefined)});
        return {...result, ballProposalMinimumScore: minimumBallScore};
      } finally { ballPending = false; }
    },
    async idle() { while (pending.size) await Promise.allSettled([...pending]); },
    close() {
      if (!closePromise) {
        closing = true;
        closePromise = (async () => {
          await execution.idle();
          for (const r of Object.values(resources)) { r.input.release(); r.inputTensor.dispose?.(); r.outputTensor.dispose?.(); }
          for (const b of buffers) b.destroy();
          const released = await Promise.allSettled(Object.values(sessions).map(s => s.release()));
          const failed = released.find(r => r.status === 'rejected'); if (failed) throw failed.reason;
        })();
      }
      return closePromise;
    },
  };
  return execution;
}
