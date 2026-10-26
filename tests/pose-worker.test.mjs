import test from 'node:test';import assert from 'node:assert/strict';
import{createPoseWorker}from'../src/lib/ai/poseWorkerClient.mjs';
import{runDetectionPass}from'../src/lib/ai/detectionPass.mjs';
class FakeWorker{
 constructor(){FakeWorker.last=this;this.sent=[];this.terminated=false;}
 postMessage(data){this.sent.push(data);if(data.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready'}}));}
 reply(data){this.onmessage({data});}terminate(){this.terminated=true;}
}
const result=value=>({value,timings:{preprocessMs:1,inferenceMs:2,decodeMs:1}});
async function client(){let closed=0;const c=await createPoseWorker({base:'https://example.invalid/',manifest:{},createWorker:()=>new FakeWorker(),bitmap:async()=>({close(){closed++;}}),clock:()=>10.2});return{c,w:FakeWorker.last,closed:()=>closed};}
test('a pending body inference does not block ball observations or create a body-job backlog',async()=>{
 const{c,w}=await client();assert.equal(c.request({},{capturedAt:10,sourceVideoTime:2}),true);assert.equal(c.request({},{capturedAt:10.03,sourceVideoTime:2.03}),false);
 await Promise.resolve();assert.equal(c.busy,true);
 const b=await runDetectionPass({frame:{width:1280,height:2276},roi:[0,0,1280,2276],withPose:false,runPose:()=>assert.fail('body must not be awaited'),runBall:async()=>result(['floor ball'])});
 assert.deepEqual(b.balls,['floor ball']);assert.equal(c.latest,null);assert.equal(c.busy,true);
 const q=w.sent.find(x=>x.type==='pose');w.reply({...q,type:'pose',image:undefined,person:{score:.9},ms:200});
 await c.idle();assert.equal(c.latest.capturedAt,10);assert.equal(c.latest.completedAt,10.2);assert.equal(c.busy,false);c.close();
});
test('orientation reset discards the old body result and waits for a new snapshot',async()=>{
 const{c,w}=await client();c.request({},{capturedAt:10,sourceVideoTime:2});await Promise.resolve();const old=w.sent.at(-1);c.reset();
 w.reply({...old,type:'pose',person:{old:true}});assert.equal(c.latest,null);
 c.request({},{capturedAt:11,sourceVideoTime:3});await Promise.resolve();const current=w.sent.at(-1);
 w.reply({...old,type:'pose',person:{old:true}});assert.equal(c.latest,null);assert.equal(c.busy,true);
 w.reply({...current,type:'pose',person:{new:true}});assert.equal(c.latest.person.new,true);c.close();
});
test('worker failure stops new body jobs, resolves waiters and remains explicit',async()=>{
 const{c,w}=await client();c.request({},{capturedAt:10,sourceVideoTime:2});await Promise.resolve();
 w.reply({type:'error',message:'device error'});await c.idle();assert.match(c.error.message,/device error/);assert.equal(c.request({},{capturedAt:11,sourceVideoTime:3}),false);assert.equal(w.terminated,true);c.close();
});
test('closing before snapshot creation releases the snapshot without posting more work',async()=>{
 let finish,closed=0;const c=await createPoseWorker({base:'https://example.invalid/',manifest:{},createWorker:()=>new FakeWorker(),bitmap:()=>new Promise(r=>finish=r)});const w=FakeWorker.last;
 c.request({},{capturedAt:1,sourceVideoTime:1});c.close();finish({close(){closed++;}});await Promise.resolve();assert.equal(closed,1);assert.equal(w.sent.filter(x=>x.type==='pose').length,0);
});

test('stale, missing and future body information cannot validate a ball frame',async()=>{
 const{poseForFrame}=await import('../src/lib/ai/poseWorkerClient.mjs');const p={body:true};
 assert.equal(poseForFrame(p,10,10.1,10.2),p);
 for(const capturedAt of[9,11,NaN,Infinity,-Infinity])assert.equal(poseForFrame(p,capturedAt,10.1,10.2),null);
 assert.equal(poseForFrame(null,10,10.1,10.2),null);
 assert.equal(poseForFrame(p,10,10.1,9.9),null);
});
