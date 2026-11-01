export const PHONE_PLACEMENT_REVISION='PLACEMENT 02';

// Camera permission does not mean the phone has been set down. No camera
// observations are requested until the player explicitly presses Start.
export class PhonePlacement {
 constructor(previewStartedAt){this.previewStartedAt=previewStartedAt;this.startRequestedAt=null;}
 start(now){if(this.startRequestedAt===null&&Number.isFinite(now))this.startRequestedAt=now;}
 snapshot(_now,trackerReady){
  const stage=this.startRequestedAt===null?'placing':trackerReady?'ready':'loading';
  return {revision:PHONE_PLACEMENT_REVISION,previewStartedAt:this.previewStartedAt,startRequestedAt:this.startRequestedAt,
   stage,canCheck:stage==='ready'};
 }
}
