import test from 'node:test';
import assert from 'node:assert/strict';
import { DrillRecording, recordingExtension } from '../src/lib/ai/drillRecording.mjs';

class FakeRecorder {
  static isTypeSupported(type){return type==='video/mp4';}
  constructor(stream,options={}){this.stream=stream;this.mimeType=options.mimeType||'video/webm';this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['video'],{type:this.mimeType})});this.onstop?.();}
}

test('records the existing stream and emits a correctly typed file only after stop', () => {
  const stream={camera:true};let blob=null;
  const recording=new DrillRecording({Recorder:FakeRecorder,onReady:value=>blob=value});
  assert.equal(recording.start(stream),true);
  assert.equal(recording.recorder.stream,stream);
  assert.equal(blob,null);
  recording.stop();
  assert.equal(blob.type,'video/mp4');assert.equal(blob.size,5);
  assert.equal(recordingExtension(blob.type),'mp4');
});

test('rejecting a supported codec falls back to the browser default', () => {
  class DefaultOnly extends FakeRecorder { start(){if(this.mimeType==='video/mp4')throw new Error('unsupported');super.start();} }
  let blob=null;
  const recording=new DrillRecording({Recorder:DefaultOnly,onReady:value=>blob=value});
  assert.equal(recording.start({}),true);recording.stop();
  assert.equal(blob.type,'video/webm');assert.equal(recordingExtension(blob.type),'webm');
});

test('does not request recording until start and does not stop camera tracks', () => {
  let constructed=0,trackStops=0;
  class Observed extends FakeRecorder {constructor(...args){super(...args);constructed++;}}
  const stream={getTracks:()=>[{stop:()=>trackStops++}]};
  const recording=new DrillRecording({Recorder:Observed});
  assert.equal(constructed,0);recording.start(stream);assert.equal(constructed,1);
  recording.stop();recording.stop();assert.equal(trackStops,0);
});

test('retry or unmount discards the old recording without publishing a stale clip', () => {
  let ready=0;const recording=new DrillRecording({Recorder:FakeRecorder,onReady:()=>ready++});
  recording.start({});recording.cancel();assert.equal(ready,0);
});

test('missing MediaRecorder reports video unavailable without throwing', () => {
  let unavailable=0;const recording=new DrillRecording({Recorder:null,onUnavailable:()=>unavailable++});
  assert.equal(recording.start({}),false);assert.equal(unavailable,1);recording.stop();
});

test('recording errors do not emit a misleading playable video', () => {
  let ready=0,unavailable=0;
  const recording=new DrillRecording({Recorder:FakeRecorder,onReady:()=>ready++,onUnavailable:()=>unavailable++});
  recording.start({});recording.recorder.onerror();recording.stop();
  assert.equal(ready,0);assert.equal(unavailable,1);
});

test('empty recording does not create an unusable replay', () => {
  class Empty extends FakeRecorder {stop(){this.state='inactive';this.onstop?.();}}
  let unavailable=0;const recording=new DrillRecording({Recorder:Empty,onUnavailable:()=>unavailable++});
  recording.start({});recording.stop();assert.equal(unavailable,1);
});
