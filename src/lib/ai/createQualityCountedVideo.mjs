import { encodeQualityCountedVideo } from './qualityCountedVideo.mjs';
const abortError = () => new DOMException('Video preparation cancelled.', 'AbortError');

function createExportWorker(){
  if(typeof Worker!=='function'||typeof OffscreenCanvas!=='function')return null;
  return new Worker(new URL('./countedVideo.worker.mjs',import.meta.url),{type:'module'});
}

export function createQualityCountedVideo(options,{createWorker=createExportWorker,encode=encodeQualityCountedVideo}={}) {
  // Codec work is lazy-loaded and runs only after tracking has stopped. A
  // startup/capability failure can use the same encoder on the page, once.
  return new Promise((resolve, reject) => {
    let worker=null,settled=false,workerActive=true,progressReceived=false;
    const stopWorker=()=>{if(worker){worker.onmessage=worker.onerror=null;worker.terminate();worker=null;}};
    const finish=(error,result)=>{
      if(settled)return;settled=true;workerActive=false;stopWorker();
      options.signal?.removeEventListener('abort',abort);
      if(error)reject(error);else resolve(result);
    };
    const abort=()=>finish(abortError());
    const fallback=reason=>{
      if(settled||!workerActive)return;workerActive=false;stopWorker();
      if(options.signal?.aborted){abort();return;}
      Promise.resolve().then(()=>{if(options.signal?.aborted)throw abortError();return encode(options);}).then(
        result=>finish(null,{...result,exportInfo:{...result.exportInfo,workerFallbackReason:reason}}),
        error=>finish(error));
    };
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort', abort, { once: true });
    try{worker=createWorker();}catch{fallback('worker-start');return;}
    if(!worker){fallback('worker-unavailable');return;}
    worker.onmessage = ({ data }) => {
      if(settled||!workerActive)return;
      if (data.type === 'progress') {progressReceived=true;options.onProgress?.(data.progress);}
      else if (data.type === 'fallback') {
        if(progressReceived)finish(new Error('High-quality video preparation could not run. Your original video is still available.'));
        else fallback(data.reason??'worker-api-unavailable');
      }
      else if (data.type === 'result') finish(null,data.result);
      else if (data.type === 'error') finish(new Error(data.message));
    };
    worker.onerror=()=>{
      if(settled||!workerActive)return;
      // Do not repeat an expensive export that has already produced frames.
      if(!progressReceived)fallback('worker-load');
      else finish(new Error('High-quality video preparation could not run. Your original video is still available.'));
    };
    const { blob, changes, finalCount, completed, duration } = options;
    try{worker.postMessage({ blob, changes, finalCount, completed, duration });}
    catch{fallback('worker-message');}
  });
}
