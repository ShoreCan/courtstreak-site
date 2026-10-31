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
