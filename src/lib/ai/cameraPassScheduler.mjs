// A completed paired pass usually already has a newer video frame available.
// Yield to the event loop without waiting for an extra display refresh. When
// the video has not advanced, wait for paint instead of spinning timers.
export function createCameraPassScheduler({requestPaint=requestAnimationFrame,cancelPaint=cancelAnimationFrame,queueTask=setTimeout,cancelTask=clearTimeout}={}){
 let paint=null,task=null,videoCancel=null;
 const cancel=()=>{if(paint!==null)cancelPaint(paint);if(task!==null)cancelTask(task);videoCancel?.();paint=task=videoCancel=null;};
 return {cancel,schedule(callback,{paired=false,freshVideo=false,waitForVideoFrame}={}){
  cancel();
  const ready=()=>{videoCancel=null;task=queueTask(()=>{task=null;callback();},0);};
  if(paired&&freshVideo)ready();
  // A delivered-frame callback already yields between passes. Dispatch from
  // that event directly, rather than adding a timer or a second paint wait.
  else if(paired&&waitForVideoFrame&&(videoCancel=waitForVideoFrame(()=>{videoCancel=null;callback();})))return;
  else paint=requestPaint(()=>{paint=null;callback();});
 }};
}
