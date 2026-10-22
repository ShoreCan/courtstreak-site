import test from 'node:test';
import assert from 'node:assert/strict';
import {timedBallContinuation} from '../src/lib/ai/ballTiming.mjs';
import {BallIdentityTracker} from '../src/lib/ai/poundCore.mjs';
const ball=(x=705,y=1250,d=100,score=.9)=>({box:[x-d/2,y-d/2,x+d/2,y+d/2],score});
const history=()=>[1000,900,780,700,720,770,820,880].map((y,i)=>({at:i*.03,center:[700,y],diameter:100}));
test('a delayed observation may continue the one size-consistent ball in its observed lane',()=>assert.equal(timedBallContinuation([ball()],history(),.41,100)?.index,0));
test('ordinary cadence does not enable a gap exception',()=>assert.equal(timedBallContinuation([ball()],history(),.24,100),null));
test('a quarter-second boundary is bounded and a longer gap is rejected',()=>{
 assert.ok(timedBallContinuation([ball()],history(),.46,100));assert.equal(timedBallContinuation([ball()],history(),.461,100),null);
});
test('a missing timestamp cannot enable the exception',()=>{for(const time of [null,undefined,NaN,Infinity])assert.equal(timedBallContinuation([ball()],history(),time,100),null);});
test('an observation before the last capture cannot enable recovery',()=>assert.equal(timedBallContinuation([ball()],history(),.1,100),null));
test('uncalibrated size or insufficient measured history does not enable recovery',()=>{
 assert.equal(timedBallContinuation([ball()],history(),.41,null),null);assert.equal(timedBallContinuation([ball()],history().slice(-7),.41,100),null);
});
test('a stationary ball does not establish a directional continuation',()=>assert.equal(timedBallContinuation([ball()],history().map(s=>({...s,center:[700,880]})),.41,100),null));
test('return in the opposite direction cannot be invented across the gap',()=>assert.equal(timedBallContinuation([ball(705,850)],history(),.41,100),null));
test('a new object away from the observed lane is rejected',()=>assert.equal(timedBallContinuation([ball(800)],history(),.41,100),null));
test('even a fast history cannot bypass the fixed spatial cap',()=>assert.equal(timedBallContinuation([ball(705,1400)],history(),.41,100),null));
test('weak detector evidence cannot bypass background or jump safeguards',()=>assert.equal(timedBallContinuation([ball(705,1250,100,.19)],history(),.41,100),null));
test('nonfinite or malformed detector proposals cannot enable recovery',()=>{
 for(const c of [ball(705,1250,100,NaN),{box:[1,2,NaN,4],score:.9},{box:[10,10,0,0],score:.9}])assert.equal(timedBallContinuation([c],history(),.41,100),null);
});
test('a differently sized object cannot take over the track',()=>{
 for(const d of [70,135,180])assert.equal(timedBallContinuation([ball(705,1250,d)],history(),.41,100),null);
});
test('two plausible detector proposals leave identity unresolved',()=>assert.equal(timedBallContinuation([ball(),ball(710,1260)],history(),.41,100),null));
test('long unobserved intervals do not train the speed envelope',()=>assert.equal(timedBallContinuation([ball()],history().map((s,i)=>({...s,at:i*.2})),1.6,100),null));
function tracker(bgSize=40){
 const t=new BallIdentityTracker({handContinuity:true,objectBackgroundRadius:true,timedContinuity:true});
 t.samples=history();t.last=[700,880];t.diameter=100;t.velocity=[0,50];t.diameters=Array(12).fill(100);t.lanes=Array(12).fill(700);
 t.background=[{center:[705,1250],diameter:bgSize,observations:20}];return t;
}
test('a measured continuation can pass a smaller background object after a short delay',()=>assert.ok(tracker().select([ball()],null,'drill',1280,1800,.41)));
test('an equally sized remembered object is still protected by the veto',()=>assert.equal(tracker(100).select([ball()],null,'drill',1280,1800,.41),null));
test('setup countdown does not gain the active continuity exception',()=>assert.equal(tracker().select([ball()],null,'countdown',1280,1800,.41),null));
test('a new track cannot enable temporal recovery without camera timestamps',()=>assert.equal(tracker().select([ball()],null,'drill',1280,1800),null));
