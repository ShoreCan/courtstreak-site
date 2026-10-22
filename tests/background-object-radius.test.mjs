import test from 'node:test';
import assert from 'node:assert/strict';
import {BallIdentityTracker,GapAwareBounceCounter,PoundControlValidator,geometry} from '../src/lib/ai/poundCore.mjs';
const ball=(x,y,d=180)=>({box:[x-d/2,y-d/2,x+d/2,y+d/2],score:.9});
const body=()=>({box:[350,50,1000,1000],confidence:Array(17).fill(.95),xy:Array.from({length:17},()=>[700,200])});
function tracker({enabled=true,size=180,bgSize=60,bg=[600,600],last=[700,450]}={}){
 const t=new BallIdentityTracker({handContinuity:true,objectBackgroundRadius:enabled});
 t.last=last;t.velocity=[0,75];t.diameter=size;t.diameters=Array(12).fill(size);t.lanes=Array(12).fill(700);
 t.background=[{center:bg,diameter:bgSize,observations:30}];return t;
}
test('a larger moving ball beside a small remembered object retains tracking',()=>assert.ok(tracker().select([ball(700,600)],body(),'drill',1280,1200)));
test('LOCK 02 remains available for an exact baseline comparison',()=>assert.equal(tracker({enabled:false}).select([ball(700,600)],body(),'drill',1280,1200),null));
test('countdown retains the original background exclusion zone',()=>assert.equal(tracker().select([ball(700,600)],body(),'countdown',1280,1200),null));
test('the remembered object itself is still rejected',()=>assert.equal(tracker({size:100}).select([ball(600,600,70)],body(),'drill',1280,1200),null));
test('a large remembered object keeps its original exclusion area',()=>assert.equal(tracker({bgSize:180}).select([ball(700,600)],body(),'drill',1280,1200),null));
test('the 28-pixel minimum remains active for small background detections',()=>assert.equal(tracker({bgSize:10,bg:[680,600]}).select([ball(700,600)],body(),'drill',1280,1200),null));
test('a second overlapping remembered object still blocks selection',()=>{
 const t=tracker();t.background.push({center:[700,600],diameter:180,observations:5});assert.equal(t.select([ball(700,600)],body(),'drill',1280,1200),null);
});
test('a large foreground proposal still cannot bypass the calibrated-size guard',()=>assert.equal(tracker().select([ball(700,600,330)],body(),'drill',1280,1200),null));
test('a distant proposal still cannot bypass the jump guard',()=>assert.equal(tracker().select([ball(1000,1100)],body(),'drill',1280,1200),null));
test('a stationary background proposal supplies no bounce measurements',()=>{
 const t=tracker({size:100}),c=new GapAwareBounceCounter(),v=new PoundControlValidator();
 for(let i=0;i<90;i++){const b=t.select([ball(600,600,70)],body(),'drill',1280,1200);assert.equal(b,null);v.update(c.update(i/30,null,1200),null,body(),i/30,20);}
 assert.equal(c.count,0);assert.equal(v.count,0);
});
