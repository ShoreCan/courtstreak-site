export const LIVE_BUDGET_REVISION='LIVE BUDGET 01';
const quantile=(values,q)=>{const s=[...values].sort((a,b)=>a-b),p=(s.length-1)*q,i=Math.floor(p);return s.length?s[i]+(s[Math.ceil(p)]-s[i])*(p-i):null;};
export function trackingCadence(times,{windowSeconds=2,minimumSpan=1.5,minimumSamples=25,minimumHz=20,p90Limit=.085,maxLimit=.16}={}){
 const last=times.at(-1),recent=times.filter(t=>Number.isFinite(t)&&last-t<=windowSeconds),gaps=recent.slice(1).map((t,i)=>t-recent[i]);
 const span=recent.length>1?last-recent[0]:0,hz=span>0?(recent.length-1)/span:0,p90=quantile(gaps,.9),max=gaps.length?Math.max(...gaps):null;
 const ready=recent.length>=minimumSamples&&span>=minimumSpan&&gaps.every(t=>t>0)&&hz>=minimumHz&&p90<=p90Limit&&max<=maxLimit;
 return {revision:LIVE_BUDGET_REVISION,ready,samples:recent.length,span,hz,p90GapSeconds:p90,maxGapSeconds:max};
}
export class LiveTrackingBudget {
 constructor(){this.ballCosts=[];this.captures=[];this.skips={};this.secondaryCalls=0;}
 observeBase(ballTimings){
  const ms=ballTimings&&['preprocessMs','inferenceMs','decodeMs'].reduce((n,k)=>n+(ballTimings[k]??0),0);
  if(Number.isFinite(ms)&&ms>0){this.ballCosts.push(ms);this.ballCosts=this.ballCosts.slice(-32);}
 }
 secondaryDecision(elapsedMs,{needed=true,targetFrameMs=50,reserveMs=5}={}){
  const estimate=quantile(this.ballCosts,.9),reason=!needed?'not_needed':this.ballCosts.length<12?'warming_cost_estimate':!Number.isFinite(elapsedMs)||elapsedMs<0?'invalid_time':elapsedMs+estimate*1.2+reserveMs>targetFrameMs?'frame_budget':'allowed';
  if(reason==='allowed')this.secondaryCalls++;else this.skips[reason]=(this.skips[reason]??0)+1;
  return {allowed:reason==='allowed',reason,elapsedMs,estimatedSecondaryMs:estimate,targetFrameMs};
 }
 captured(at){if(!Number.isFinite(at)||at<=(this.captures.at(-1)??-Infinity))return;this.captures.push(at);this.captures=this.captures.filter(t=>at-t<=3);}
 cadence(){return trackingCadence(this.captures);}
 snapshot(){return {revision:LIVE_BUDGET_REVISION,secondaryCalls:this.secondaryCalls,secondarySkips:{...this.skips},cadence:this.cadence()};}
}
