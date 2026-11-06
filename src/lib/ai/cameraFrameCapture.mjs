// A live Safari stream can report currentTime=0 while presented frame IDs
// advance. Freshness must follow those frame IDs, not the media time alone.
export function hasFreshCameraPixels({nativeCapture,previousSerial,sourceFrame,previousTime,currentTime}){
 return nativeCapture?!!sourceFrame&&Number.isFinite(sourceFrame.serial)&&sourceFrame.serial!==previousSerial:currentTime!==previousTime;
}
export function captureMirroredFrame(video,canvas,{width,height,nativeCapture}){
 const context=canvas.getContext('2d');context.save();context.translate(canvas.width,0);context.scale(-1,1);context.drawImage(video,0,0,canvas.width,canvas.height);context.restore();
 return nativeCapture?{image:canvas,width,height}:canvas;
}
