import test from 'node:test';import assert from 'node:assert/strict';
import {observeReplayCounter} from '../src/lib/ai/replayCounter.mjs';
import fs from 'node:fs';
const changes=[{time:0,count:0},{time:1.2,count:1},{time:2.3,count:2},{time:8.4,count:9}];
class Player extends EventTarget{
 currentTime=0;callbacks=new Map();nextId=0;cancelled=[];
 requestVideoFrameCallback(fn){const id=++this.nextId;this.callbacks.set(id,fn);return id;}
 cancelVideoFrameCallback(id){this.callbacks.delete(id);this.cancelled.push(id);}
 event(type,time){this.currentTime=time;this.dispatchEvent(new Event(type));}
 frame(time){this.currentTime=time;const[id,fn]=this.callbacks.entries().next().value;this.callbacks.delete(id);fn();}
}
test('a player mounted after its recording/timeline is ready initializes and tracks nonzero counts',()=>{
 const p=new Player();p.currentTime=8.5;const seen=[],stop=observeReplayCounter(p,changes,n=>seen.push(n));
 assert.deepEqual(seen,[9]);p.event('seeking',1.5);assert.deepEqual(seen,[9,1]);p.frame(2.4);assert.deepEqual(seen,[9,1,2]);stop();
});
test('a rep jump retains acceptance timing rather than setting the count to the clicked future rep',()=>{
 const p=new Player(),seen=[],stop=observeReplayCounter(p,changes,n=>seen.push(n));
 p.event('seeked',8.1);assert.equal(seen.at(-1),2);p.frame(8.4);assert.equal(seen.at(-1),9);stop();
});
test('paused seeks and older browsers synchronize without frame callbacks or polling timers',()=>{
 const p=new Player();p.requestVideoFrameCallback=undefined;const seen=[],stop=observeReplayCounter(p,changes,n=>seen.push(n));
 p.event('loadedmetadata',0);p.event('seeked',2.5);p.event('pause',2.5);p.event('timeupdate',8.6);
 assert.deepEqual(seen,[0,2,9]);assert.equal(p.callbacks.size,0);stop();
});
test('unchanged camera frames/events never produce redundant counter updates',()=>{
 const p=new Player(),seen=[],stop=observeReplayCounter(p,changes,n=>seen.push(n));
 for(let i=0;i<50;i++){p.frame(.5);p.event('timeupdate',.5);}
 assert.deepEqual(seen,[0]);assert.equal(p.callbacks.size,1);stop();
});
test('unmount/source replacement removes listeners and invalidates queued callbacks',()=>{
 const p=new Player(),seen=[],stop=observeReplayCounter(p,changes,n=>seen.push(n));
 const oldCallback=[...p.callbacks.values()][0];stop();p.event('seeked',8.5);oldCallback();
 assert.deepEqual(seen,[0]);assert.equal(p.callbacks.size,0);assert.equal(p.cancelled.length,1);
 const next=[],stopNext=observeReplayCounter(p,changes,n=>next.push(n));assert.deepEqual(next,[9]);stopNext();
});
test('the supplied successful 30-rep timeline displays every accepted count at its saved timestamp',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('./fixtures/replay/check05-30-reps.json',import.meta.url)));
 const p=new Player(),seen=[],stop=observeReplayCounter(p,d.changes,n=>seen.push(n));
 for(const change of d.changes)p.event('seeked',change.time+.00001);
 assert.deepEqual(seen,Array.from({length:31},(_,n)=>n));assert.equal(seen.at(-1),d.finalCount);stop();
});
