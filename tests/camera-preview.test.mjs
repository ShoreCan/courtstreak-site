import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraPreview} from '../src/lib/ai/cameraPreview.mjs';
const fake=()=>{const track={readyState:'live',enabled:true,stops:0,stop(){this.stops++;this.readyState='ended';}};return {track,getVideoTracks:()=>[track],getTracks:()=>[track]};};

test('several rounds reuse the same healthy camera without another permission request',async()=>{
 let requests=0;const stream=fake(),preview=new CameraPreview(()=>{requests++;return Promise.resolve(stream);});
 for(let round=0;round<4;round++){assert.equal(await preview.acquire(),stream);assert.equal(preview.available,true);}
 assert.equal(requests,1);assert.equal(stream.track.stops,0);
 preview.release();assert.equal(stream.track.stops,1);assert.equal(preview.available,false);
});
test('overlapping automatic and manual opens share one pending browser request',async()=>{
 let resolve,requests=0;const stream=fake(),preview=new CameraPreview(()=>{requests++;return new Promise(r=>{resolve=r;});});
 const a=preview.acquire(),b=preview.acquire();assert.equal(a,b);resolve(stream);assert.equal(await a,await b);assert.equal(requests,1);
});
test('leaving while permission is pending closes a late camera and cannot replace a new preview',async()=>{
 let resolve;const old=fake(),fresh=fake();let requests=0;
 const preview=new CameraPreview(()=>++requests===1?new Promise(r=>{resolve=r;}):Promise.resolve(fresh));
 const pending=preview.acquire(),aborted=assert.rejects(pending,{name:'AbortError'});
 preview.release();assert.equal(await preview.acquire(),fresh);resolve(old);await aborted;
 assert.equal(old.track.stops,1);assert.equal(fresh.track.stops,0);assert.equal(preview.stream,fresh);
});
test('a rejected permission request is retryable after a user tap',async()=>{
 let requests=0;const stream=fake(),preview=new CameraPreview(()=>{if(++requests===1)throw Object.assign(new Error('Permission needed'),{name:'NotAllowedError'});return Promise.resolve(stream);});
 await assert.rejects(preview.acquire(),{name:'NotAllowedError'});assert.equal(preview.available,false);
 assert.equal(await preview.acquire(),stream);assert.equal(requests,2);
});
test('a revoked or stopped camera is reacquired rather than reusing dead tracks',async()=>{
 const old=fake(),fresh=fake();let requests=0;const preview=new CameraPreview(()=>Promise.resolve(++requests===1?old:fresh));
 await preview.acquire();old.track.readyState='ended';assert.equal(preview.available,false);
 assert.equal(await preview.acquire(),fresh);assert.equal(requests,2);
});
