import * as ort from 'onnxruntime-web/wasm';
import {DetectorInput} from './detectorInput.mjs';
import {decodeOutput} from './detectorOutput.mjs';

let session,input,tensor;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      ort.env.wasm.numThreads=1;
      ort.env.wasm.proxy=false;
      ort.env.wasm.wasmPaths=new URL('ai/runtime/',data.base).href;
      const size=data.manifest.pose.size;
      session=await ort.InferenceSession.create(new URL(`ai/models/${data.manifest.pose.file}`,data.base).href,
        {executionProviders:['wasm'],graphOptimizationLevel:'all'});
      input=new DetectorInput(size,()=>new OffscreenCanvas(size,size));
      tensor=new ort.Tensor('float32',input.data,[1,3,size,size]);
      const outputs=await session.run({[session.inputNames[0]]:tensor});
      for(const output of Object.values(outputs))output.dispose?.();
      self.postMessage({type:'ready'});return;
    }
    if(data.type!=='pose')return;
    const start=performance.now();let outputs;
    try{
      const prepared=input.prepare(data.image,[0,0,data.image.width,data.image.height]);
      const preparedAt=performance.now();
      outputs=await session.run({[session.inputNames[0]]:tensor});
      const inferredAt=performance.now();
      const person=decodeOutput(outputs[session.outputNames[0]],'pose',prepared.transform);
      self.postMessage({type:'pose',id:data.id,generation:data.generation,capturedAt:data.capturedAt,
        sourceVideoTime:data.sourceVideoTime,person,ms:performance.now()-start,
        timings:{preprocessMs:preparedAt-start,inferenceMs:inferredAt-preparedAt,decodeMs:performance.now()-inferredAt}});
    }finally{data.image.close();if(outputs)for(const output of Object.values(outputs))output.dispose?.();}
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
