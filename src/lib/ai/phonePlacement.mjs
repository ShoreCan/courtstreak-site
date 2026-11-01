export const PHONE_PLACEMENT_REVISION='PLACEMENT 01';
export const PHONE_PLACEMENT_SECONDS=10;

// Camera permission does not mean the phone has been set down. No camera
// observations are requested until this user-controlled interval completes.
export class PhonePlacement {
 constructor(previewStartedAt){this.previewStartedAt=previewStartedAt;this.armedAt=null;}
 arm(now){if(this.armedAt===null&&Number.isFinite(now))this.armedAt=now;}
 snapshot(now,trackerReady){
  const left=this.armedAt===null?PHONE_PLACEMENT_SECONDS:Math.max(0,Math.ceil(PHONE_PLACEMENT_SECONDS-(now-this.armedAt)));
  const stage=this.armedAt===null?'placing':left>0?'settling':trackerReady?'ready':'loading';
  return {revision:PHONE_PLACEMENT_REVISION,previewStartedAt:this.previewStartedAt,armedAt:this.armedAt,
   settlingEndsAt:this.armedAt===null?null:this.armedAt+PHONE_PLACEMENT_SECONDS,left,stage,canCheck:stage==='ready'};
 }
}
