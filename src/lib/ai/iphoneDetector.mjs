import { geometry } from './poundCore.mjs';
import { DetectorInput, LegacyDetectorInput } from './detectorInput.mjs';
import { runDetectionPass } from './detectionPass.mjs';
export function iou(a,b){const x=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0])),y=Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));return x*y/Math.max(1,(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-x*y);}
export function decodeOutput(output,kind,transform){
 const {data,dims}=output;const rows=[];const [,,last]=dims;
 const mapBox=b=>[(b[0]-transform.px)/transform.scale+transform.x,(b[1]-transform.py)/transform.scale+transform.y,(b[2]-transform.px)/transform.scale+transform.x,(b[3]-transform.py)/transform.scale+transform.y];
 if(dims.length!==3||dims[0]!==1)throw new Error('Unsupported detector output. Re-export the supplied models.');
 const channels=kind==='pose'?56:84;
 if(dims[1]===channels){
  const n=last,at=(c,i)=>data[c*n+i];
  for(let i=0;i<n;i++){
   const score=at(kind==='pose'?4:36,i); // COCO sports ball = class 32, offset 4.
   if(!Number.isFinite(score)||score<(kind==='pose'?.18:.008))continue;
   if(kind==='ball'){let best=0,bestScore=at(4,i);for(let k=1;k<80;k++){if(at(4+k,i)>bestScore){best=k;bestScore=at(4+k,i);}}if(best!==32)continue;}
   const cx=at(0,i),cy=at(1,i),w=at(2,i),h=at(3,i);
   const r={box:mapBox([cx-w/2,cy-h/2,cx+w/2,cy+h/2]),score};
   if(kind==='pose'){r.xy=[];r.confidence=[];for(let k=0;k<17;k++){r.xy.push([(at(5+k*3,i)-transform.px)/transform.scale+transform.x,(at(6+k*3,i)-transform.py)/transform.scale+transform.y]);r.confidence.push(at(7+k*3,i));}}
   if(r.box.every(Number.isFinite)&&r.box[2]>r.box[0]&&r.box[3]>r.box[1])rows.push(r);
  }
 }else if(kind==='ball'&&last===6){
  for(let i=0;i<dims[1];i++){const j=i*6;if(Math.round(data[j+5])!==32||!Number.isFinite(data[j+4])||data[j+4]<.008)continue;const box=mapBox(Array.from(data.slice(j,j+4)));if(box.every(Number.isFinite)&&box[2]>box[0]&&box[3]>box[1])rows.push({box,score:data[j+4]});}
 }else throw new Error(`Unexpected ${kind} model output: ${dims.join(' × ')}. Re-export using the supplied script.`);
 rows.sort((a,b)=>b.score-a.score);const kept=[];
 for(const r of rows){if(kept.every(k=>iou(r.box,k.box)<.7))kept.push(r);if(kept.length>=50)break;}
 return kind==='pose'?kept.sort((a,b)=>geometry(b).diameter-geometry(a).diameter)[0]||null:kept;
}
export async function loadDetector(base,onProgress){
 const ort=await import('onnxruntime-web/webgpu');
 ort.env.wasm.numThreads=1; // GitHub Pages does not provide cross-origin isolation.
 ort.env.wasm.wasmPaths=new URL(`${base}ai/runtime/`,location.href).href;
 const manifestResponse=await fetch(`${base}ai/models/manifest.json`,{cache:'no-cache'});
 if(!manifestResponse.ok)throw new Error('The ball and body models have not been published. Run the model export step and publish public/ai.');
 const manifest=await manifestResponse.json();
 if(manifest.version!==1||!manifest.ball||!manifest.pose)throw new Error('Detector files do not match this tracker version.');
 let provider=navigator.gpu?'webgpu':'wasm',ball,pose;
 const create=async()=>{
  onProgress('Loading ball detector…');ball=await ort.InferenceSession.create(`${base}ai/models/${manifest.ball.file}`,{executionProviders:[provider],graphOptimizationLevel:'all'});
  onProgress('Loading body and wrist detector…');pose=await ort.InferenceSession.create(`${base}ai/models/${manifest.pose.file}`,{executionProviders:[provider],graphOptimizationLevel:'all'});
  // Verify execution as well as model loading before presenting a working detector.
  for(const [session,size] of [[ball,manifest.ball.size],[pose,manifest.pose.size]]){
   const input=new ort.Tensor('float32',new Float32Array(3*size*size),[1,3,size,size]);
   try{const outputs=await session.run({[session.inputNames[0]]:input});for(const value of Object.values(outputs))value.dispose?.();}finally{input.dispose?.();}
  }
 };
 try{await create();}catch(error){await ball?.release();await pose?.release();ball=pose=null;if(provider==='wasm')throw error;provider='wasm';try{await create();}catch(failure){await ball?.release();await pose?.release();throw failure;}}
 const legacyInput=new LegacyDetectorInput();let inputs=null;
 async function run(session,source,size,kind,roi,inputMode){
  const began=performance.now(),{data,transform}=inputMode==='reuse'?inputs[kind].prepare(source,roi):legacyInput.prepare(source,size,roi),prepared=performance.now();
  const input=new ort.Tensor('float32',data,[1,3,size,size]);let outputs;
  try{outputs=await session.run({[session.inputNames[0]]:input});const inferred=performance.now(),value=decodeOutput(outputs[session.outputNames[0]],kind,transform);return {value,timings:{preprocessMs:prepared-began,inferenceMs:inferred-prepared,decodeMs:performance.now()-inferred}};}
  finally{input.dispose?.();if(outputs)for(const value of Object.values(outputs))value.dispose?.();}
 }
 return {provider,modelManifest:manifest,liveInputMode:'legacy',async detect(frame,roi,withPose,{inputMode='legacy',refreshBallFrame}={}){if(!['legacy','reuse'].includes(inputMode))throw new Error('Unknown diagnostic input mode.');if(inputMode==='reuse'&&!inputs)inputs={ball:new DetectorInput(manifest.ball.size),pose:new DetectorInput(manifest.pose.size)};return runDetectionPass({frame,roi,withPose,refreshBallFrame,runPose:source=>run(pose,source,manifest.pose.size,'pose',[0,0,source.width,source.height],inputMode),runBall:(source,crop)=>run(ball,source,manifest.ball.size,'ball',crop,inputMode)});},async close(){await ball.release();await pose.release();}};
}
