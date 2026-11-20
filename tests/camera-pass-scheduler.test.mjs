import test from 'node:test';
import assert from 'node:assert/strict';
import {createCameraPassScheduler} from '../src/lib/ai/cameraPassScheduler.mjs';

function harness(){let next=0;const paint=new Map(),task=new Map();
 return {paint,task,s:createCameraPassScheduler({requestPaint:f=>{paint.set(++next,f);return next;},cancelPaint:id=>paint.delete(id),queueTask:f=>{task.set(++next,f);return next;},cancelTask:id=>task.delete(id)})};
}
test('new paired frames yield to a task; unchanged video waits for paint',()=>{
 const h=harness();let calls=0;h.s.schedule(()=>calls++,{paired:true,freshVideo:true});
 assert.equal(h.task.size,1);assert.equal(h.paint.size,0);[...h.task.values()][0]();assert.equal(calls,1);
 h.task.clear();h.s.schedule(()=>calls++,{paired:true,freshVideo:false});assert.equal(h.paint.size,1);assert.equal(h.task.size,0);
});
test('cancellation removes either pending dispatch, and the pound path keeps paint scheduling',()=>{
 const h=harness(),fn=()=>{throw new Error('must not run');};
 h.s.schedule(fn,{paired:true,freshVideo:true});h.s.cancel();assert.equal(h.task.size,0);
 h.s.schedule(fn,{freshVideo:true});assert.equal(h.paint.size,1);h.s.cancel();assert.equal(h.paint.size,0);
 h.s.schedule(fn,{paired:true,freshVideo:true});h.s.schedule(fn);assert.equal(h.task.size,0);assert.equal(h.paint.size,1);
 h.s.cancel();
});
test('paired inference can wait directly for a delivered video frame without polling paint',()=>{
 const h=harness();let wake,cancelled=0,calls=0;
 h.s.schedule(()=>calls++,{paired:true,waitForVideoFrame:ready=>{wake=ready;return()=>cancelled++;}});
 assert.equal(h.paint.size+h.task.size,0);wake();assert.equal(h.task.size,0);assert.equal(calls,1);
 h.task.clear();h.s.schedule(()=>calls++,{paired:true,waitForVideoFrame:ready=>{wake=ready;return()=>cancelled++;}});h.s.cancel();assert.equal(cancelled,1);
});

test('fresh-frame message delivery ignores cancelled work and reopens after cleanup',()=>{
 const messages=[];
 const ports=[];
 const scheduler=createCameraPassScheduler({requestPaint:()=>{},cancelPaint:()=>{},
  queueTask:()=>assert.fail('fresh frames use the task message'),cancelTask:()=>{},
  useMessageQueue:true,createChannel(){
   const port1={close(){this.closed=true;}};
   const port2={close(){this.closed=true;},postMessage(data){messages.push(()=>port1.onmessage({data}));}};
   ports.push(port1,port2);
   return {port1,port2};
  }});
 const fresh={paired:true,freshVideo:true};
 let calls=0;
 scheduler.schedule(()=>assert.fail('stale task ran'),fresh);
 scheduler.schedule(()=>calls++,fresh);
 messages.shift()();messages.shift()();
 assert.equal(calls,1);
 scheduler.schedule(()=>assert.fail('disposed task ran'),fresh);
 scheduler.dispose();
 assert.ok(ports.every(port=>port.closed));
 messages.shift()();
 scheduler.schedule(()=>calls++,fresh);
 messages.shift()();
 assert.equal(calls,2);
 scheduler.dispose();
});
