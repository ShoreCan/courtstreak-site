// Isolated diagnostic. The live tracker does not import this module.
import { decodeOutput } from './iphoneDetector.mjs';
import { compareProfileOutputs } from './recordedProfile.mjs';

export const POSE_CHECK_REVISION='POSE CHECK 01';
export const POSE_BASELINE='3407cc6eae02cbb4be06dd3d2db9d816b44d3cb1';
export const POSE_MODEL_SHA='f0fe983de02d0dfb734c52ca21c539bffdcc9c76a86dc5457e16c262d84e6022';
export const POSE_INPUT_IDS=[290,294,298,302,306,310,363,367];
export const POSE_MODES=['current','gpuIo','capture'];
export const POSE_ORDERS=[['current','gpuIo','capture'],['gpuIo','capture','current'],['capture','current','gpuIo'],['capture','gpuIo','current'],['gpuIo','current','capture'],['current','capture','gpuIo']];
export const POSE_CRITERIA={coordinates:.1,scores:1e-5,rawAbsolute:1e-4,rawRelative:1e-5,minGainPercent:10,maxP95RegressionPercent:0};
const inputDims=[1,3,640,640],outputDims=[1,56,8400],inputLength=3*640*640,outputLength=56*8400;
const abort=()=>new DOMException('Pose check cancelled.','AbortError');
const active=(signal,isActive)=>{if(signal?.aborted||!isActive())throw abort();};
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}

export async function readPoseInputs(pack){
  if(pack?.schema!=='courtstreak-pose-inputs-v1'||pack.baselineCommit!==POSE_BASELINE||pack.modelSha256!==POSE_MODEL_SHA||pack.size!==640||pack.samples?.length!==8)throw new Error('Choose CourtStreak-pose-check-inputs.json prepared for POSE CHECK 01.');
  if(pack.sourceVideoSha256!=='da12257452a24ba7965ee28fdf133bd7c00733c589726cf881af162c336d8fa6'||pack.sourceEvidenceSha256!=='1efa01d44f416030d6b30e6a59d207fb117a6a0b06bc6fe3063477daab3d859a')throw new Error('The input pack does not match the frozen attempt.');
  const samples=[];
  for(let i=0;i<8;i++){
    const s=pack.samples[i],t=s.transform;
    if(s.frameId!==POSE_INPUT_IDS[i]||!Number.isFinite(s.decodedPts)||!Number.isInteger(s.decodedFrameIndex)||s.decodedFrameIndex<0||typeof s.rgbBase64!=='string'||s.rgbBase64.length!==inputLength*4/3||!t||!['x','y','scale','px','py'].every(k=>Number.isFinite(t[k]))||t.scale<=0)throw new Error('The frozen pose input is invalid.');
    const binary=atob(s.rgbBase64),rgb=Uint8Array.from(binary,c=>c.charCodeAt(0));
    if(rgb.length!==inputLength||await sha256(rgb)!==s.rgbSha256)throw new Error(`Input pixels failed verification for frame ${s.frameId}.`);
    const data=new Float32Array(inputLength),n=640*640;
    for(let p=0;p<n;p++){data[p]=rgb[p*3]/255;data[n+p]=rgb[p*3+1]/255;data[n*2+p]=rgb[p*3+2]/255;}
    if(await sha256(data.buffer)!==s.float32Sha256)throw new Error(`Model input failed verification for frame ${s.frameId}.`);
    samples.push({frameId:s.frameId,recordedElapsed:s.recordedElapsed,decodedPts:s.decodedPts,decodedFrameIndex:s.decodedFrameIndex,rgbSha256:s.rgbSha256,float32Sha256:s.float32Sha256,transform:{...t},data});
  }
  return samples;
}

// User-owned fixed GPU buffers remain alive until session.release() completes.
// Readback is explicit: Tensor.getData() would change the fixed tensor's location.
export async function createPoseExecutor({ort,model,mode,device,usage=globalThis.GPUBufferUsage,mapMode=globalThis.GPUMapMode,clock=()=>performance.now()}){
  if(!POSE_MODES.includes(mode))throw new Error('Unknown pose execution variant.');
  let session,inputBuffer,outputBuffer,staging,inputTensor,outputTensor,pending=null,closing=false,closePromise;
  const buffers=[];
  const destroy=()=>{for(const b of buffers)b.destroy();};
  try{
    session=await ort.InferenceSession.create(model,{executionProviders:['webgpu'],graphOptimizationLevel:'all',...(mode==='current'?{}:{preferredOutputLocation:'gpu-buffer',enableGraphCapture:mode==='capture'})});
    if(session.inputNames.length!==1||session.outputNames.length!==1)throw new Error('Unexpected pose model bindings.');
    if(mode!=='current'){
      device??=ort.env.webgpu.device;
      if(!device||!usage||!mapMode)throw new Error('Fixed GPU buffers are unavailable on this device.');
      const buffer=(size,flags)=>{const b=device.createBuffer({size,usage:flags});buffers.push(b);return b;};
      inputBuffer=buffer(inputLength*4,usage.STORAGE|usage.COPY_DST);
      outputBuffer=buffer(outputLength*4,usage.STORAGE|usage.COPY_SRC|usage.COPY_DST);
      staging=buffer(outputLength*4,usage.MAP_READ|usage.COPY_DST);
      inputTensor=ort.Tensor.fromGpuBuffer(inputBuffer,{dataType:'float32',dims:inputDims});
      outputTensor=ort.Tensor.fromGpuBuffer(outputBuffer,{dataType:'float32',dims:outputDims});
    }
  }catch(error){try{await session?.release();}finally{destroy();}throw error;}
  async function execute(data){
    const began=clock();let input,outputs;
    try{
      let raw,dims,submitted,ready;
      if(mode==='current'){
        input=new ort.Tensor('float32',data,inputDims);
        outputs=await session.run({[session.inputNames[0]]:input});
        const out=outputs[session.outputNames[0]];
        if(out.location!=='cpu'&&out.location!==undefined)throw new Error('Current pose path did not return CPU output.');
        raw=out.data;dims=out.dims;ready=clock();submitted=null;
      }else{
        device.queue.writeBuffer(inputBuffer,0,data);
        await session.run({[session.inputNames[0]]:inputTensor},{[session.outputNames[0]]:outputTensor});
        submitted=clock();
        const encoder=device.createCommandEncoder();encoder.copyBufferToBuffer(outputBuffer,0,staging,0,outputLength*4);device.queue.submit([encoder.finish()]);
        await staging.mapAsync(mapMode.READ);
        try{raw=new Float32Array(staging.getMappedRange().slice(0));}finally{staging.unmap();}
        dims=outputDims;ready=clock();
      }
      return {raw,dims:[...dims],timings:{cpuInputToOutputMs:ready-began,submitMs:submitted===null?null:submitted-began,completionAndReadbackMs:submitted===null?null:ready-submitted}};
    }finally{input?.dispose?.();if(outputs)for(const v of Object.values(outputs))v.dispose?.();}
  }
  return {mode,async run(data){
    if(closing||pending)throw new Error('The pose executor is busy or closed.');
    if(!(data instanceof Float32Array)||data.length!==inputLength)throw new Error('Unexpected pose input dimensions.');
    pending=execute(data);try{return await pending;}finally{pending=null;}
  },close(){
    if(!closePromise){closing=true;closePromise=(async()=>{try{await pending;}catch{}try{await session.release();}finally{destroy();}})();}
    return closePromise;
  }};
}

export function validatePoseOutput(out){
  if(JSON.stringify(out.dims)!==JSON.stringify(outputDims)||!(out.raw instanceof Float32Array)||out.raw.length!==outputLength)throw new Error('Pose output dimensions changed.');
  for(const x of out.raw)if(!Number.isFinite(x))throw new Error('Pose output contains a non-finite value.');
}
export function comparePoseRaw(a,b){
  if(a.length!==b.length)return {matches:false,maxAbsoluteDifference:null,violations:Math.max(a.length,b.length)};
  let maxAbsoluteDifference=0,violations=0;
  for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(!Number.isFinite(d)||d>POSE_CRITERIA.rawAbsolute+POSE_CRITERIA.rawRelative*Math.abs(a[i]))violations++;maxAbsoluteDifference=Math.max(maxAbsoluteDifference,d);}
  return {matches:violations===0,maxAbsoluteDifference,violations};
}
const distribution=xs=>{const a=[...xs].sort((x,y)=>x-y);return {n:a.length,total:xs.reduce((a,b)=>a+b,0),median:a[Math.round((a.length-1)*.5)],p95:a[Math.round((a.length-1)*.95)]};};
export function summarizePoseTrials(trials){
  if(trials.length!==48)throw new Error('A partial pose comparison cannot produce a completed result.');
  const variants=Object.fromEntries(POSE_MODES.map(m=>[m,distribution(trials.map(t=>t.variants[m].ms))]));
  const comparisons={};
  for(const mode of ['gpuIo','capture']){
    const stats=rows=>{const a=distribution(rows.map(t=>t.variants.current.ms)),b=distribution(rows.map(t=>t.variants[mode].ms));return {n:rows.length,timeChangePercent:100*(b.total-a.total)/a.total,p95ChangePercent:100*(b.p95-a.p95)/a.p95};};
    const blocks=[0,1].map(block=>stats(trials.filter(t=>t.block===block)));
    const orders=POSE_ORDERS.map(order=>({...stats(trials.filter(t=>t.order.join(',')===order.join(','))),order}));
    const overall=stats(trials),allOutputsMatch=trials.every(t=>t.comparisons[mode].matches);
    const repeatableGain=allOutputsMatch&&[overall,...blocks,...orders].every(s=>s.timeChangePercent<=-POSE_CRITERIA.minGainPercent)&&[overall,...blocks].every(s=>s.p95ChangePercent<=POSE_CRITERIA.maxP95RegressionPercent);
    comparisons[mode]={...overall,blocks,orders,allOutputsMatch,repeatableGain,decision:!allOutputsMatch?'REVERT':repeatableGain?'KEEP':'REVISE'};
  }
  const io=variants.gpuIo.total,capture=variants.capture.total;
  return {trials:trials.length,measuredModelCalls:trials.length*3,variants,comparisons,captureVsGpuIoTimeChangePercent:100*(capture-io)/io,decisionScope:'Saved-input pose execution only. KEEP qualifies a candidate for a later live trial, not a live release.',liveFpsMeasured:false,liveCountingAccuracyMeasured:false};
}

export async function runPoseCheck({executors,samples,signal,isActive=()=>true,onProgress=()=>{},clock=()=>performance.now()}){
  const guard=()=>active(signal,isActive),trials=[],warmup=[];
  if(samples.length!==8||samples.some((s,i)=>s.frameId!==POSE_INPUT_IDS[i]))throw new Error('The frozen sample schedule changed.');
  guard();
  for(const mode of POSE_MODES){
    // Three untimed model calls allow initial execution/capture/replay preparation.
    for(let i=0;i<3;i++){guard();onProgress({stage:'warmup',mode,completed:0,total:48});const began=clock(),out=await executors[mode].run(samples[0].data);guard();validatePoseOutput(out);warmup.push({mode,call:i+1,ms:clock()-began});}
  }
  for(let orderIndex=0;orderIndex<6;orderIndex++){
    const order=POSE_ORDERS[orderIndex],sequence=orderIndex%2?[...samples].reverse():samples;
    for(const sample of sequence){
      guard();const outputs={},variants={};
      for(const mode of order){
        guard();const began=clock(),out=await executors[mode].run(sample.data);guard();
        const decoded=decodeOutput({data:out.raw,dims:out.dims},'pose',sample.transform),ended=clock();
        validatePoseOutput(out);
        if(!Number.isFinite(ended-began)||ended<=began)throw new Error('Invalid pose timing measurement.');
        outputs[mode]=out;variants[mode]={ms:ended-began,timings:out.timings,person:decoded};
      }
      const comparisons={};
      for(const mode of ['gpuIo','capture']){const raw=comparePoseRaw(outputs.current.raw,outputs[mode].raw),decoded=compareProfileOutputs({balls:[],person:variants.current.person},{balls:[],person:variants[mode].person});comparisons[mode]={matches:raw.matches&&decoded.matches,raw,decoded};}
      const {data,...identity}=sample;
      trials.push({...identity,block:Math.floor(orderIndex/3),order:[...order],variants,comparisons});
      onProgress({stage:'measuring',completed:trials.length,total:48});
    }
  }
  guard();return {schema:'courtstreak-pose-execution-v1',revision:POSE_CHECK_REVISION,completed:true,baselineCommit:POSE_BASELINE,modelSha256:POSE_MODEL_SHA,provider:'webgpu',protocol:{inputDims,outputDims,criteria:POSE_CRITERIA,frozenInputs:true,warmupCallsPerVariant:3,orders:POSE_ORDERS,blocks:2,preprocessingIncluded:false},warmup,trials,summary:summarizePoseTrials(trials),limitations:['No ball detector, ball selection, counter, live camera or video encoder ran. This does not measure real-dribble accuracy, full-round completion or live FPS.','All variants receive the same verified CHW Float32 input; shared file decoding and preprocessing are excluded.','GPU-buffer timings include input upload, model submission, GPU completion wait, output readback and ordinary pose decoding. Completion-and-readback timing includes unfinished GPU work; it is not pure copy time.','Three separate pose sessions coexist for balanced ordering. Memory pressure and camera/encoder contention will differ in a live tracker.','Graph capture is requested through the existing ONNX Runtime 1.22.0 API. No internal GPU replay trace is collected; this is a public-option comparison, not proof of the runtime internal command sequence.','Warming and all raw-output comparisons are outside measured calls; every accepted measured call returns CPU-readable output.']};
}
