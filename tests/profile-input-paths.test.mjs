import test from 'node:test';
import assert from 'node:assert/strict';
import { DetectorInput, LegacyDetectorInput } from '../src/lib/ai/detectorInput.mjs';
function canvas(){const c={width:0,height:0,getContext:()=>ctx};const ctx={fillRect(){},drawImage(){},getImageData(x,y,w,h){return {data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>(i*17+3)%256)};}};return c;}
test('legacy and reused inputs produce identical channel values and crop transforms',()=>{
 const legacy=new LegacyDetectorInput(canvas),a=new DetectorInput(4,canvas),b=new DetectorInput(6,canvas);
 for(let i=0;i<20;i++)for(const [size,p] of [[4,a],[6,b]]){const roi=i%2?[3,5,40,67]:[0,0,1280,2276],x=legacy.prepare({},size,roi),y=p.prepare({},roi);assert.deepEqual(y.transform,x.transform);assert.deepEqual(y.data,x.data);}
});
test('the baseline allocates per pass while each reuse path retains separate storage',()=>{
 const old=new LegacyDetectorInput(canvas),a=old.prepare({},4,[0,0,4,4]),b=old.prepare({},4,[0,0,4,4]);assert.notEqual(a.data,b.data);
 const p=new DetectorInput(4,canvas),x=p.prepare({},[0,0,4,4]),y=p.prepare({},[0,0,4,4]);assert.equal(x.data,y.data);
});
