import test from 'node:test';
import assert from 'node:assert/strict';
import {createQualityCountedVideo} from '../src/lib/ai/createQualityCountedVideo.mjs';

function harness({constructionError=false,postError=false}={}){
 const controller=new AbortController(),log={created:0,terminated:0,encoded:0,progress:[]};
 const worker={terminate(){log.terminated++;},postMessage(data){log.data=data;if(postError)throw new Error('worker message failed');}};
 const options={blob:new Blob(['original']),changes:[{time:0,count:0}],finalCount:30,completed:true,signal:controller.signal,onProgress:p=>log.progress.push(p)};
 const dependencies={createWorker(){log.created++;if(constructionError)throw new Error('worker blocked');return worker;},async encode(received){log.encoded++;assert.equal(received,options);return{blob:new Blob(['counted']),exportInfo:{sourceFrames:600,executionContext:'main-thread'}};}};
 return{controller,log,worker,options,dependencies};
}

test('a worker blocked at construction uses the same full-quality exporter once',async()=>{
 const h=harness({constructionError:true}),r=await createQualityCountedVideo(h.options,h.dependencies);
 assert.equal(h.log.encoded,1);assert.equal(r.exportInfo.sourceFrames,600);assert.equal(r.exportInfo.workerFallbackReason,'worker-start');
});
test('a worker load failure releases it before starting the main-thread fallback',async()=>{
 const h=harness(),pending=createQualityCountedVideo(h.options,h.dependencies);
 h.worker.onerror(new Event('error'));const r=await pending;
 assert.equal(h.log.terminated,1);assert.equal(h.log.encoded,1);assert.equal(r.exportInfo.workerFallbackReason,'worker-load');
});
test('a worker without the requested codec can use the page codec without changing the recording or count timeline',async()=>{
 const h=harness(),pending=createQualityCountedVideo(h.options,h.dependencies);
 h.worker.onmessage({data:{type:'fallback',reason:'worker-codec-unavailable'}});const r=await pending;
 assert.equal(h.log.data.blob,h.options.blob);assert.deepEqual(h.log.data.changes,h.options.changes);
 assert.equal(h.log.encoded,1);assert.equal(h.log.terminated,1);assert.equal(r.exportInfo.workerFallbackReason,'worker-codec-unavailable');
});
test('a message-start failure terminates the worker before one fallback',async()=>{
 const h=harness({postError:true}),r=await createQualityCountedVideo(h.options,h.dependencies);
 assert.equal(h.log.encoded,1);assert.equal(h.log.terminated,1);assert.equal(r.exportInfo.workerFallbackReason,'worker-message');
});
test('late duplicate worker messages cannot start another export or alter progress',async()=>{
 const h=harness(),pending=createQualityCountedVideo(h.options,h.dependencies),message=h.worker.onmessage;
 message({data:{type:'fallback'}});message({data:{type:'fallback'}});message({data:{type:'progress',progress:.8}});
 await pending;assert.equal(h.log.encoded,1);assert.deepEqual(h.log.progress,[]);
});
test('cancelled work never constructs a worker or starts a fallback',async()=>{
 const h=harness();h.controller.abort();
 await assert.rejects(createQualityCountedVideo(h.options,h.dependencies),{name:'AbortError'});
 assert.equal(h.log.created,0);assert.equal(h.log.encoded,0);
});
test('cancelling an active worker rejects once and ignores a queued fallback',async()=>{
 const h=harness(),pending=createQualityCountedVideo(h.options,h.dependencies),message=h.worker.onmessage;
 h.controller.abort();message({data:{type:'fallback'}});
 await assert.rejects(pending,{name:'AbortError'});assert.equal(h.log.encoded,0);assert.equal(h.log.terminated,1);
});
test('an encoder/data error and worker failure after progress never silently repeat expensive export work',async()=>{
 for(const mode of['data-error','crash','late-fallback']){
  const h=harness(),pending=createQualityCountedVideo(h.options,h.dependencies);
  if(mode!=='data-error'){
   h.worker.onmessage({data:{type:'progress',progress:.4}});
   if(mode==='crash')h.worker.onerror(new Event('error'));
   else h.worker.onmessage({data:{type:'fallback'}});
  }
  else h.worker.onmessage({data:{type:'error',message:'Invalid camera frame timing'}});
  await assert.rejects(pending,mode!=='data-error'?/could not run/:/Invalid camera frame timing/);
  assert.equal(h.log.encoded,0);assert.equal(h.log.terminated,1);
 }
});
test('an ordinary successful worker stays in the worker and preserves its metadata',async()=>{
 const h=harness(),pending=createQualityCountedVideo(h.options,h.dependencies),result={blob:h.options.blob,exportInfo:{executionContext:'worker'}};
 h.worker.onmessage({data:{type:'result',result}});assert.equal(await pending,result);assert.equal(h.log.encoded,0);assert.equal(h.log.terminated,1);
});
test('unavailable workers use the page once and a page encoder failure leaves the original untouched',async()=>{
 const h=harness();h.dependencies.createWorker=()=>null;
 h.dependencies.encode=async()=>{h.log.encoded++;throw new Error('Page codec unavailable');};
 await assert.rejects(createQualityCountedVideo(h.options,h.dependencies),/Page codec unavailable/);
 assert.equal(h.log.encoded,1);assert.equal(await h.options.blob.text(),'original');
});
test('cancellation while the fallback is running rejects promptly and ignores its late completion',async()=>{
 const h=harness({constructionError:true});let complete;
 h.dependencies.encode=()=>new Promise(resolve=>{complete=resolve;});
 const pending=createQualityCountedVideo(h.options,h.dependencies);
 await Promise.resolve();h.controller.abort();await assert.rejects(pending,{name:'AbortError'});
 complete({blob:new Blob(['late']),exportInfo:{}});await Promise.resolve();
 assert.deepEqual(h.log.progress,[]);assert.equal(await h.options.blob.text(),'original');
});
