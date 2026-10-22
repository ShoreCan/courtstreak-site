import test from 'node:test';
import assert from 'node:assert/strict';
import {BallIdentityTracker,GapAwareBounceCounter,PoundControlValidator,geometry} from '../src/lib/ai/poundCore.mjs';

const ball=(x=600,y=400,d=80)=>({box:[x-d/2,y-d/2,x+d/2,y+d/2],score:.9});
function person(x=600,y=400){return {box:[350,50,850,700],confidence:Array(17).fill(.95),xy:Array.from({length:17},()=>[x,y])};}
function tracker(enabled=true){
 const t=new BallIdentityTracker({handContinuity:enabled});
 t.last=[600,400];t.diameter=80;t.diameters=Array(12).fill(80);t.lanes=Array(12).fill(600);
 t.background=[{center:[600,400],diameter:80,observations:5}];
 return t;
}
test('candidate keeps a stationary hand-owned ball across repeated background overlap',()=>{
 const t=tracker();for(let i=0;i<30;i++){assert.ok(t.select([ball()],person(),'drill',1280,720));assert.equal(t.missed,0);}
});
test('default selector retains its prior background decision',()=>assert.equal(tracker(false).select([ball()],person(),'drill',1280,720),null));
test('countdown does not use the experimental continuation exemption',()=>assert.equal(tracker().select([ball()],person(),'countdown',1280,720),null));
test('background object away from both hands remains rejected',()=>assert.equal(tracker().select([ball()],person(100,100),'drill',1280,720),null));
test('a background overlap cannot continue without visible wrists',()=>assert.equal(tracker().select([ball()],null,'drill',1280,720),null));
test('an abrupt location jump cannot bypass background memory',()=>{
 const t=tracker();t.background[0].center=[800,400];assert.equal(t.select([ball(800)],person(800),'drill',1280,720),null);
});
test('an abrupt size jump is not a trusted continuation',()=>assert.equal(tracker().select([ball(600,400,110)],person(),'drill',1280,720),null));
test('the original absolute setup-size limit still rejects gradual growth',()=>{
 const t=tracker();t.diameter=130;assert.equal(t.select([ball(600,400,140)],person(),'drill',1280,720),null);
});
test('the original hand reacquisition remains available after a missing frame',()=>{
 const t=tracker();t.missed=1;assert.ok(t.select([ball()],person(),'drill',1280,720));
});
test('sustained held-ball tracking does not generate any dribble proposals or counts',()=>{
 const t=tracker(),counter=new GapAwareBounceCounter(),validator=new PoundControlValidator();
 for(let i=0;i<120;i++){const b=t.select([ball()],person(),'drill',1280,720),g=geometry(b),time=i/30;
  const events=counter.update(time,[g.center[1],g.diameter],720);validator.update(events,[...g.center,g.diameter],person(),time,20);}
 assert.equal(counter.count,0);assert.equal(validator.count,0);
});
