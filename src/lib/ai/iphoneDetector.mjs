import { createDetectorExecution } from './detectorExecution.mjs';
export {iou,decodeOutput} from './detectorOutput.mjs';
import {decodeOutput} from './detectorOutput.mjs';
import {createPoseWorker} from './poseWorkerClient.mjs';
export async function loadDetector(base,onProgress,{inputMode='reuse',asyncPose=false}={}){
 const ort=await import('onnxruntime-web/webgpu');
 ort.env.wasm.numThreads=1; // GitHub Pages does not provide cross-origin isolation.
 ort.env.wasm.wasmPaths=new URL(`${base}ai/runtime/`,location.href).href;
 const manifestResponse=await fetch(`${base}ai/models/manifest.json`,{cache:'no-cache'});
 if(!manifestResponse.ok)throw new Error('The ball and body models have not been published. Run the model export step and publish public/ai.');
 const manifest=await manifestResponse.json();
 if(manifest.version!==1||!manifest.ball||!manifest.pose)throw new Error('Detector files do not match this tracker version.');
 let provider=navigator.gpu?'webgpu':'wasm',ball,pose,poseWorker=null;
 const create=async()=>{
  onProgress('Loading ball detector…');ball=await ort.InferenceSession.create(`${base}ai/models/${manifest.ball.file}`,{executionProviders:[provider],graphOptimizationLevel:'all'});
  // Two CPU inference loops can compete for the same limited compute budget.
  // Keep the sequential compatibility path when ball inference needs WASM.
  if(asyncPose&&provider==='webgpu'&&typeof Worker==='function'&&typeof createImageBitmap==='function'){
   try{onProgress('Preparing independent body tracking…');poseWorker=await createPoseWorker({base:new URL(base,location.href).href,manifest});}
   catch{onProgress('Loading the compatible body detector…');}
  }
  if(!poseWorker){onProgress('Loading body and wrist detector…');pose=await ort.InferenceSession.create(`${base}ai/models/${manifest.pose.file}`,{executionProviders:[provider],graphOptimizationLevel:'all'});}
  // Verify execution as well as model loading before presenting a working detector.
  for(const [session,size] of [[ball,manifest.ball.size],...(pose?[[pose,manifest.pose.size]]:[])]){
   const input=new ort.Tensor('float32',new Float32Array(3*size*size),[1,3,size,size]);
   try{const outputs=await session.run({[session.inputNames[0]]:input});for(const value of Object.values(outputs))value.dispose?.();}finally{input.dispose?.();}
  }
 };
 try{await create();}catch(error){await ball?.release();await pose?.release();poseWorker?.close();ball=pose=poseWorker=null;if(provider==='wasm')throw error;provider='wasm';try{await create();}catch(failure){await ball?.release();await pose?.release();throw failure;}}
 const execution=createDetectorExecution({ort,manifest,sessions:pose?{ball,pose}:{ball},decodeOutput,defaultInputMode:inputMode});
 const idle=execution.idle.bind(execution),close=execution.close.bind(execution);
 if(poseWorker){execution.idle=async()=>{await Promise.all([idle(),poseWorker.idle()]);};execution.close=async()=>{poseWorker.close();await close();};}
 return Object.assign(execution,{provider,modelManifest:manifest,poseWorker,poseMode:poseWorker?'independent-wasm-worker':'sequential'});
}
