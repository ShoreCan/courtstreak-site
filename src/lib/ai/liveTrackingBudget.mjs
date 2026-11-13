export const LIVE_BUDGET_REVISION='LIVE BUDGET 01';
const quantile=(values,q)=>{const s=[...values].sort((a,b)=>a-b),p=(s.length-1)*q,i=Math.floor(p);return s.length?s[i]+(s[Math.ceil(p)]-s[i])*(p-i):null;};
export function trackingCadence(times,{windowSeconds=2,minimumSpan=1.5,minimumSamples=25,minimumHz=20,p90Limit=.085,maxLimit=.16}={}){
 const last=times.at(-1),recent=times.filter(t=>Number.isFinite(t)&&last-t<=windowSeconds),gaps=recent.slice(1).map((t,i)=>t-recent[i]);
 const span=recent.length>1?last-recent[0]:0,hz=span>0?(recent.length-1)/span:0,p90=quantile(gaps,.9),max=gaps.length?Math.max(...gaps):null;
 const ready=recent.length>=minimumSamples&&span>=minimumSpan&&gaps.every(t=>t>0)&&hz>=minimumHz&&p90<=p90Limit&&max<=maxLimit;
 return {revision:LIVE_BUDGET_REVISION,ready,samples:recent.length,span,hz,p90GapSeconds:p90,maxGapSeconds:max};
}

export const DRILL_TRACKING_CADENCE=Object.freeze({
 windowSeconds:1.2,minimumSpan:.9,minimumSamples:16,minimumHz:16,p90Limit:.10,maxLimit:.16,
});

// The countdown can keep its place during a brief interruption. Go requires
// a fresh, complete view and repeated observations at the counting cadence.
export class DrillStartEvidence {
 constructor(){this.frames=[];}
 observe(time,{checks,poseAt,completedAt}){
  if(time>(this.frames.at(-1)?.time??-Infinity)){
   this.frames=this.frames.filter(frame=>time-frame.time<=DRILL_TRACKING_CADENCE.windowSeconds);
   this.frames.push({time,poseAt,complete:checks.valid,ball:checks.ball});
  }
  const cadence=trackingCadence(this.frames.map(frame=>frame.time),DRILL_TRACKING_CADENCE);
  const complete=this.frames.filter(frame=>frame.complete);
  const poses=new Set(complete.filter(frame=>Number.isFinite(frame.poseAt)).map(frame=>frame.poseAt)).size;
  const landmarkCoverage=complete.length/Math.max(1,this.frames.length);
  const ballCoverage=this.frames.filter(frame=>frame.ball).length/Math.max(1,this.frames.length);
  const reason=!checks.valid?'framing':!Number.isFinite(completedAt)||completedAt-time<0||completedAt-time>.12?'latency':
   poses<3||landmarkCoverage<.7?'landmarks':
   ballCoverage<.85?'ball':!cadence.ready?'cadence':'ready';
  return {ready:reason==='ready',reason,cadence,poses,landmarkCoverage,ballCoverage};
 }
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

// Setup needs fresh observations, not a frame-rate benchmark. Visibility and
// calibrated ball identity are checked independently before Go. Cadence is
// retained as a quality measurement; it never certifies a rep.
export const SETUP_PROCESSING_REVISION='LIVE SETUP 03';
export function setupProcessingReadiness(times,completedAt,passStartedAt,{visibilityFirst=false}={}){
 const span=times.length>1?completedAt-times[0]:0,hz=span>0?(times.length-1)/span:0,passSeconds=completedAt-passStartedAt;
 const chronological=times.every((t,i)=>Number.isFinite(t)&&(i===0||t>times[i-1]))&&times.at(-1)===completedAt;
 const reason=!chronological||!Number.isFinite(passSeconds)||passSeconds<0?'freshness':visibilityFirst?(times.length<2?'warming':passSeconds>=.5?'latency':'ready'):(times.length<16||span<1.5?'warming':hz<10?'speed':passSeconds>=.35?'latency':'ready');
 return {revision:SETUP_PROCESSING_REVISION,ready:reason==='ready',reason,hz,samples:times.length,span,passSeconds,minimumHz:visibilityFirst?null:10,visibilityFirst};
}
export function setupProcessingMessage(check){
 if(!check||check.reason==='warming')return 'Preparing tracking.';
 if(check.reason==='speed')return 'Tracking is running slowly on this device.';
 if(check.reason==='latency'||check.reason==='freshness')return 'Waiting for a fresh camera check. Keep your position.';
 return 'Fresh camera checks are ready.';
}
