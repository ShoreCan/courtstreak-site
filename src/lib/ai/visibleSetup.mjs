import {geometry} from './poundCore.mjs';
export const VISIBLE_SETUP_REVISION='VISIBLE SETUP 01';

// Entry framing only. The counting engines still require their own observed
// release, floor bounce and controlled receipt; none of those rules live here.
export function evaluateVisibleSetup(person,ball,w,h,{handMode='right',completeLandmarks=false}={}){
 const r={body:false,hand:false,ball:!!ball,floor:false,owned:false,rightHand:false,valid:false,cue:'find-body',message:'Keep yourself and the basketball in the camera view.'};
 if(!person||!(w>0&&h>0))return r;
 const visible=i=>person.confidence?.[i]>=(completeLandmarks?.5:.2)&&Array.isArray(person.xy?.[i])&&person.xy[i].every(Number.isFinite)&&person.xy[i][0]>0&&person.xy[i][0]<w&&person.xy[i][1]>0&&person.xy[i][1]<h;
 const shoulders=[5,6].filter(visible),hips=[11,12].filter(visible);
 // A face landmark, a narrow stance and a perfectly centered detector box are
 // unnecessary when the player's torso is visible.
 r.body=shoulders.length>0&&hips.length>0;
 const hands=[9,10].filter(visible);
 r.hand=completeLandmarks?hands.length===2:handMode==='right'?visible(10):hands.length>0;
 const feet=[15,16].filter(visible),hipY=hips.length?Math.max(...hips.map(i=>person.xy[i][1])):Infinity;
 // One clear ankle below the hips gives framing clearance even when the other
 // ankle is occluded. This is not floor-contact evidence for a counted rep.
 const clearFeet=feet.filter(i=>person.xy[i][1]>hipY&&person.xy[i][1]<h*.985);
 r.floor=completeLandmarks?clearFeet.length===2:clearFeet.length>0;
 if(!r.body)return {...r,message:'Keep your shoulders and hips in view.'};
 if(!r.hand)return {...r,cue:completeLandmarks||handMode!=='right'?'both-wrists':'right-wrist',message:completeLandmarks?'Keep both wrists visible and clear of your torso.':handMode==='right'?'Keep your right hand in view.':'Keep a hand and the basketball in view.'};
 if(!r.floor)return {...r,cue:'tilt-down',message:'Include your feet and a little floor below you.'};
 if(!ball)return {...r,cue:'show-ball',message:'Keep the basketball visible in your hand.'};
 const g=geometry(ball),radius=g.diameter/2;
 if(!g.center.every(Number.isFinite)||!(g.diameter>0)||g.center[0]-radius<0||g.center[0]+radius>w||g.center[1]-radius<0||g.center[1]+radius>h)return {...r,cue:'center-ball',issue:'ball-edge',message:'Keep the whole basketball inside the camera view.'};
 const near=i=>Math.hypot(g.center[0]-person.xy[i][0],g.center[1]-person.xy[i][1])<=Math.max(110,g.diameter*2.3);
 r.owned=hands.some(near);r.rightHand=visible(10)&&near(10);
 if(!r.owned||handMode==='right'&&!r.rightHand)return {...r,cue:'hold-ball',message:handMode==='right'?'Hold the ball in your right hand, in view.':'Hold the ball in either visible hand.'};
 return {...r,valid:true,cue:'hold-position',message:'Your view is ready. Hold the ball naturally until Go.'};
}
