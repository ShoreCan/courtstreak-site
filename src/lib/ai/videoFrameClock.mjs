export const VIDEO_FRAME_CLOCK_REVISION='VIDEO FRAMES 01';

// currentTime can advance between decoded images. It is not a frame ID.
// Keep presentation metadata separate from the monotonic capture timestamp.
export class VideoFrameClock {
 constructor(){this.video=null;this.callback=null;this.latest=null;this.generation=0;this.mode=null;this.waiter=null;}
 start(video){
  this.stop();this.video=video;const generation=this.generation;
  if(typeof video.requestVideoFrameCallback==='function'){
   this.mode='video-frame-callback';
   const presented=(_now,metadata)=>{
    if(this.video!==video||this.generation!==generation)return;
    if(Number.isFinite(metadata.presentedFrames)&&Number.isFinite(metadata.mediaTime))this.latest={serial:metadata.presentedFrames,sourceVideoTime:metadata.mediaTime};
    this.callback=video.requestVideoFrameCallback(presented);
    const waiting=this.waiter;
    if(waiting&&this.hasNew(waiting.previous)){this.waiter=null;waiting.notify();}
   };
   this.callback=video.requestVideoFrameCallback(presented);
  }else if(typeof video.getVideoPlaybackQuality==='function')this.mode='decoded-frame-count';
  else throw new Error('This browser cannot confirm fresh camera frames. Try an updated browser, or use the timer.');
 }
 read(){
  if(this.mode==='decoded-frame-count'){
   const serial=this.video?.getVideoPlaybackQuality().totalVideoFrames;
   if(Number.isFinite(serial)&&serial>0)return {serial,sourceVideoTime:this.video.currentTime};
   return null;
  }
  return this.latest;
 }
 hasNew(previous){const current=this.read();return !!current&&current.serial!==previous;}
 waitForNext(previous,notify){
  if(this.mode!=='video-frame-callback')return null;
  const waiter={previous,notify};this.waiter=waiter;
  return ()=>{if(this.waiter===waiter)this.waiter=null;};
 }
 stop(){
  this.generation++;if(this.callback!==null)this.video?.cancelVideoFrameCallback?.(this.callback);
  this.callback=null;this.video=null;this.latest=null;this.mode=null;this.waiter=null;
 }
}
