import {ORDINARY_BALL_SCORE} from './ballProposalPolicy.mjs';
// Weak proposals can continue a recently observed ball path. They cannot
// acquire a new identity or teleport that path onto a stationary object.
const center=b=>[(b[0]+b[2])/2,(b[1]+b[3])/2];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const OBSERVED_IDENTITY_REVISION='OBSERVED ID 01';
export function observedBallProposal(candidate,samples,person,now,diameter){
 const b=candidate?.box,score=candidate?.score;
 if(!Array.isArray(b)||b.length!==4||![...b,score].every(Number.isFinite)||b[2]<=b[0]||b[3]<=b[1])return {allowed:false,reason:'invalid_geometry'};
 const aspect=(b[2]-b[0])/(b[3]-b[1]);
 if(score<.1&&(aspect<.5||aspect>2.2))return {allowed:false,reason:'uncertain_partial_object'};
 if(score>=ORDINARY_BALL_SCORE)return {allowed:true};
 const trusted=samples.filter(s=>s.score>=ORDINARY_BALL_SCORE),anchor=trusted.at(-1),last=samples.at(-1),previous=samples.at(-2),point=center(b),d=diameter;
 if(!anchor||!last||!(d>0)||!Number.isFinite(now)||now<last.at||now-anchor.at>.2)return {allowed:false,reason:'weak_without_recent_identity'};
 const dt=now-last.at,span=previous?last.at-previous.at:0;
 if(!(span>0&&span<=.25))return {allowed:distance(point,last.center)<=d*.7,reason:'weak_motion_envelope'};
 const v=last.center.map((x,i)=>(x-previous.center[i])/span),travel=Math.hypot(...v)*dt;
 if(travel>d*8)return {allowed:false,reason:'weak_unstable_velocity'};
 const predicted=last.center.map((x,i)=>x+v[i]*dt);
 const feet=person&&[15,16].filter(i=>person.confidence?.[i]>=.5).map(i=>person.xy[i][1]);
 const floor=feet?.length===2?Math.max(...feet):null,nearFloor=floor!==null&&last.center[1]+d*.5>=floor-d*.65;
 const linear=distance(point,predicted)<=d*.7+travel*.3;
 const nearHand=person&&[9,10].some(i=>person.confidence?.[i]>=.5&&(distance(last.center,person.xy[i])<=d*1.35||distance(point,person.xy[i])<=d*1.35));
 const floorTurn=(nearFloor||nearHand)&&Math.abs(point[0]-predicted[0])<=d*.7&&distance(point,last.center)<=travel+d*.75;
 return {allowed:linear||floorTurn,reason:'weak_motion_envelope'};
}
