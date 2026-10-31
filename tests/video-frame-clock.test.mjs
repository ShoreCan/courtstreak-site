import test from 'node:test';
import assert from 'node:assert/strict';
import {VideoFrameClock} from '../src/lib/ai/videoFrameClock.mjs';

test('advancing media time alone cannot manufacture another camera image',()=>{
 const callbacks=new Map(),cancelled=[];let next=0;
 const video={currentTime:1,requestVideoFrameCallback:fn=>{callbacks.set(++next,fn);return next;},cancelVideoFrameCallback:id=>cancelled.push(id)};
 const c=new VideoFrameClock();c.start(video);assert.equal(c.hasNew(null),false);
 callbacks.get(1)(100,{presentedFrames:20,mediaTime:1});
 assert.deepEqual(c.read(),{serial:20,sourceVideoTime:1});assert.equal(c.hasNew(19),true);
 video.currentTime=1.01;assert.equal(c.hasNew(20),false);video.currentTime=1.02;assert.equal(c.hasNew(20),false);
 callbacks.get(2)(133,{presentedFrames:21,mediaTime:1.033});assert.equal(c.hasNew(20),true);
 c.stop();assert.equal(c.read(),null);assert.deepEqual(cancelled,[3]);
 callbacks.get(3)(166,{presentedFrames:22,mediaTime:1.066});assert.equal(c.read(),null);assert.equal(callbacks.size,3);
});
test('a reused video element cannot accept callbacks from an older camera attempt',()=>{
 const callbacks=[];const v={requestVideoFrameCallback:fn=>{callbacks.push(fn);return callbacks.length;},cancelVideoFrameCallback(){}};
 const c=new VideoFrameClock();c.start(v);const old=callbacks[0];c.start(v);
 old(100,{presentedFrames:1,mediaTime:5});assert.equal(c.read(),null);
 callbacks[1](100,{presentedFrames:5,mediaTime:10});assert.equal(c.read().serial,5);
});
test('a delivered frame wakes one pending detector pass, and cancellation prevents a late wake',()=>{
 const callbacks=[];const v={requestVideoFrameCallback:fn=>{callbacks.push(fn);return callbacks.length;},cancelVideoFrameCallback(){}};
 const c=new VideoFrameClock();c.start(v);let wakes=0;c.waitForNext(1,()=>wakes++);
 callbacks[0](100,{presentedFrames:1,mediaTime:1});assert.equal(wakes,0);
 callbacks[1](133,{presentedFrames:2,mediaTime:1.033});assert.equal(wakes,1);
 callbacks[2](166,{presentedFrames:3,mediaTime:1.066});assert.equal(wakes,1);
 const cancel=c.waitForNext(3,()=>wakes++);cancel();callbacks[3](199,{presentedFrames:4,mediaTime:1.099});assert.equal(wakes,1);
});
test('compatibility mode uses a decoded image count, and unsupported browsers get an explicit error',()=>{
 let total=0;const video={currentTime:1,getVideoPlaybackQuality:()=>({totalVideoFrames:total})},c=new VideoFrameClock();c.start(video);
 assert.equal(c.read(),null);total=2;assert.equal(c.hasNew(1),true);video.currentTime+=.001;assert.equal(c.hasNew(2),false);
 assert.throws(()=>c.start({}),/cannot confirm fresh camera frames/);
});
