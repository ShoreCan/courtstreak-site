export const CAMERA_PREVIEW_REVISION='PREVIEW 01';
const stop=stream=>stream?.getTracks().forEach(track=>track.stop());
const usable=stream=>!!stream?.getVideoTracks().some(track=>track.readyState==='live'&&track.enabled!==false);

// A round owns a recording, not the camera permission. Reuse a healthy preview
// between rounds; release it on exit, backgrounding or an explicit camera stop.
export class CameraPreview {
 constructor(request){this.request=request;this.stream=null;this.pending=null;this.generation=0;}
 get available(){return usable(this.stream);}
 acquire(){
  if(this.available)return Promise.resolve(this.stream);
  if(this.pending)return this.pending;
  stop(this.stream);this.stream=null;
  const generation=this.generation;
  let requested;try{requested=this.request();}catch(error){return Promise.reject(error);}
  const attempt=Promise.resolve(requested).then(stream=>{
   if(generation!==this.generation){stop(stream);const error=new Error('Camera request cancelled.');error.name='AbortError';throw error;}
   if(!usable(stream)){stop(stream);throw new Error('The camera did not return a live video track.');}
   this.stream=stream;return stream;
  }).finally(()=>{if(this.pending===attempt)this.pending=null;});
  this.pending=attempt;return attempt;
 }
 release(){this.generation++;this.pending=null;const stream=this.stream;this.stream=null;stop(stream);}
}
