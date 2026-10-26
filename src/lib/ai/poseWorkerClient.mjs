export const POSE_EXECUTION_REVISION = 'POSE WORKER 01';
export function poseForFrame(person,capturedAt,frameCapturedAt,completedAt,maxAge=.75){
  return person&&Number.isFinite(capturedAt)&&capturedAt<=frameCapturedAt&&
    completedAt>=capturedAt&&completedAt-capturedAt<maxAge?person:null;
}

// One independent body job at a time. The ball loop never awaits this job.
// Every result retains the snapshot's capture time and orientation generation.
export async function createPoseWorker({ base, manifest,
  createWorker = () => new Worker(new URL('./pose.worker.mjs', import.meta.url), { type: 'module' }),
  bitmap = frame => createImageBitmap(frame), clock = () => performance.now() / 1000 }) {
  const worker = createWorker();
  let busy=false, latest=null, error=null, closed=false, generation=0, id=0, job=null, jobTimer;
  let readyResolve,readyReject;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const readyTimer=setTimeout(()=>readyReject(new Error('Body worker initialization timed out.')),30000);
  const settle=()=>{clearTimeout(jobTimer);busy=false;job?.resolve();job=null;};
  const fail=message=>{clearTimeout(readyTimer);error=new Error(message);worker.terminate();readyReject(error);settle();};
  worker.onerror=()=>fail('The independent body detector stopped.');
  worker.onmessage=({data})=>{
    if(closed)return;
    if(data.type==='ready'){clearTimeout(readyTimer);readyResolve();}
    else if(data.type==='error')fail(data.message);
    else if(data.type==='pose'){
      if(data.id!==job?.id)return;
      if(data.generation===generation)latest={...data,completedAt:clock()};
      settle();
    }
  };
  worker.postMessage({type:'init',base,manifest});
  try{await ready;}catch(e){clearTimeout(readyTimer);worker.terminate();throw e;}
  return {
    revision:POSE_EXECUTION_REVISION,
    get busy(){return busy;},get latest(){return latest;},get error(){return error;},
    request(frame,{capturedAt,sourceVideoTime}){
      if(busy||closed||error)return false;
      busy=true;const currentGeneration=generation,currentId=++id;
      job={id:currentId};job.promise=new Promise(resolve=>{job.resolve=resolve;});
      jobTimer=setTimeout(()=>fail('Body tracking took too long to return a fresh result.'),3000);
      Promise.resolve(bitmap(frame)).then(image=>{
        if(closed||error||currentGeneration!==generation){image.close?.();settle();return;}
        worker.postMessage({type:'pose',id:currentId,generation:currentGeneration,capturedAt,sourceVideoTime,image},[image]);
      }).catch(e=>fail(e.message));
      return true;
    },
    reset(){generation++;latest=null;},
    idle(){return job?.promise??Promise.resolve();},
    close(){closed=true;clearTimeout(readyTimer);settle();latest=null;worker.terminate();},
  };
}
