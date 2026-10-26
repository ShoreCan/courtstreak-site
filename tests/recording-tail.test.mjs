import test from 'node:test';import assert from 'node:assert/strict';
import {recordingTailSeconds} from '../src/lib/ai/recordingTail.mjs';
const state={phase:'active',started:22.755,now:37.95,duration:20,recorderState:'recording'};
test('the recorded 15.195-second tracking cutoff retains the remaining camera video until the original deadline',()=>{
 assert.ok(Math.abs(recordingTailSeconds(state)-4.805)<1e-8);
});
test('stopped, paused, unavailable or already completed recordings never restart or extend the round',()=>{
 for(const recorderState of ['inactive','paused',undefined])assert.equal(recordingTailSeconds({...state,recorderState}),0);
 for(const phase of ['setup','countdown','review','finished','interrupted','recording-only'])assert.equal(recordingTailSeconds({...state,phase}),0);
 assert.equal(recordingTailSeconds({...state,now:state.started+20}),0);
 assert.equal(recordingTailSeconds({...state,now:state.started+25}),0);
});
test('invalid clocks cannot preserve a recording',()=>{
 for(const key of ['started','now'])for(const value of [null,undefined,NaN,Infinity])assert.equal(recordingTailSeconds({...state,[key]:value}),0);
});
