import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeQualityCountedVideo} from '../src/lib/ai/qualityCountedVideo.mjs';
import {shareVideoLayout} from '../src/lib/ai/videoCountOverlay.mjs';

function environment({supported=true,times=[10,10.04,10.11],abortAt=null,abortOnCard=false}={}){
 const log={added:[],closed:0,disposed:0,cancelled:0,finalized:0,active:0,maxActive:0,words:[],sampleClosed:0};const controller=new AbortController();
 const canvas={width:720,height:1280,getContext:()=>({save(){},restore(){},translate(){},fillRect(){},drawImage(){},fillText(word){log.words.push(String(word));}})};
 const track={canDecode:async()=>true,getDisplayWidth:async()=>720,getDisplayHeight:async()=>1280,computeDuration:async()=>.15};
 class Input{async getPrimaryVideoTrack(){return track;}dispose(){log.disposed++;}}
 class VideoSampleSink{async *samples(){for(const [i,timestamp]of times.entries()){if(i===abortAt)controller.abort();yield{timestamp,duration:.04,draw(ctx,...args){ctx.drawImage(canvas,...args);},close(){log.sampleClosed++;}};}}}
 class CanvasSource{async add(time,duration){log.active++;log.maxActive=Math.max(log.maxActive,log.active);if(abortOnCard&&duration===2)controller.abort();await new Promise(resolve=>setTimeout(resolve,1));log.added.push([time,duration]);log.active--;}close(){log.closed++;}}
 class Output{constructor({target}){this.target=target;}addVideoTrack(){}async start(){}async cancel(){log.cancelled++;}async finalize(){log.finalized++;this.target.buffer=new ArrayBuffer(4);}}
 const media={Input,VideoSampleSink,CanvasSource,Output,BlobSource:class{},Mp4OutputFormat:class{},BufferTarget:class{},Quality:class{},ALL_FORMATS:[],canEncodeVideo:async()=>supported};
 return{log,options:{blob:new Blob(['source']),changes:[{time:0,count:0},{time:.05,count:1}],finalCount:1,completed:true,media,createCanvas:()=>canvas,signal:controller.signal,yieldControl:async()=>{}}};
}

test('offline export awaits encoder capacity and preserves every source timestamp, including variable frame spacing',async()=>{
 const {log,options}=environment(),r=await encodeQualityCountedVideo(options);
 assert.equal(log.maxActive,1);assert.equal(r.exportInfo.sourceFrames,3);assert.equal(r.exportInfo.encodedSourceFrames,3);
 for(const [i,t]of [0,.04,.11].entries())assert.ok(Math.abs(log.added[i][0]-t)<1e-8);
 assert.equal(r.width,720);assert.equal(r.height,1490);assert.equal(r.blob.type,'video/mp4');assert.equal(log.disposed,1);assert.equal(log.cancelled,0);
 assert.equal(log.sampleClosed,3);
 assert.ok(log.words.includes('ROUND COMPLETE'));
 assert.equal(log.added.length,4);assert.ok(Math.abs(log.added.at(-1)[0]-.15)<1e-8);assert.equal(log.added.at(-1)[1],2);
 assert.equal(r.exportInfo.resultCardFrames,1);assert.equal(r.exportInfo.encodedFrames,4);
 for(const ms of Object.values(r.exportInfo.stageTimingsMs))assert.ok(Number.isFinite(ms)&&ms>=0);
 assert.ok(Math.abs(log.added.at(-1)[0]+log.added.at(-1)[1]-(.15+2))<1e-8);
});
test('the independent worker avoids UI timer pauses while retaining encoder backpressure and every camera frame',async()=>{
 const times=Array.from({length:17},(_,i)=>10+i/30),{log,options}=environment({times});let yielded=0;
 const r=await encodeQualityCountedVideo({...options,executionContext:'worker',yieldControl:async()=>{yielded++;}});
 assert.equal(yielded,0);assert.equal(log.maxActive,1);assert.equal(r.exportInfo.encodedSourceFrames,17);assert.equal(log.added.length,18);
 assert.equal(r.exportInfo.executionContext,'worker');assert.equal(r.exportInfo.stageTimingsMs.cooperativeYieldWait,0);
});
test('the main-thread fallback keeps its cooperative yield interval for page responsiveness',async()=>{
 const times=Array.from({length:17},(_,i)=>10+i/30),{log,options}=environment({times});let yielded=0;
 await encodeQualityCountedVideo({...options,yieldControl:async()=>{yielded++;}});
 assert.equal(yielded,2);assert.equal(log.maxActive,1);assert.equal(log.sampleClosed,17);
});
test('unsupported high-quality encoding preserves the original and fails explicitly',async()=>{
 const {log,options}=environment({supported:false});await assert.rejects(encodeQualityCountedVideo(options),/High-quality MP4 export is unavailable/);
 assert.equal(log.added.length,0);assert.equal(log.disposed,1);assert.equal(await options.blob.text(),'source');
});
test('cancellation ends the partial output and disposes the input',async()=>{
 const {log,options}=environment({abortAt:1});await assert.rejects(encodeQualityCountedVideo(options),{name:'AbortError'});
 assert.equal(log.added.length,1);assert.ok(log.cancelled>=1);assert.equal(log.disposed,1);
});
test('cancelling during the held result card skips finalization and releases source frames',async()=>{
 const {log,options}=environment({abortOnCard:true});await assert.rejects(encodeQualityCountedVideo(options),{name:'AbortError'});
 assert.equal(log.finalized,0);assert.ok(log.cancelled>=1);assert.equal(log.sampleClosed,3);assert.equal(log.disposed,1);
});
test('zero decoded frames cannot be reported as a successful export',async()=>{
 const {options}=environment({times:[]});await assert.rejects(encodeQualityCountedVideo(options),/no decodable frames/);
});
test('share layout preserves the full source picture without cropping, enlarging or covering hands and floor',()=>{
 for(const [w,h]of[[720,1280],[1280,720],[464,826]]){
  const r=shareVideoLayout(w,h);assert.equal(r.picture.width,w);assert.equal(r.picture.height,h);assert.equal(r.width,w);assert.equal(r.height,h+r.top+r.bottom);
 }
});
