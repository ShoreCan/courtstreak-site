import {countAtTime} from './videoCountOverlay.mjs';

// Attach when the actual player mounts, which can be later than recording-ready.
// Playback/seeking only reads accepted counts; it never runs the detector again.
export function observeReplayCounter(player,changes,onCount){
  let closed=false,callback=null,lastCount=null;
  const sync=()=>{
    if(closed)return;
    const {count}=countAtTime(changes,player.currentTime);
    if(count!==lastCount){lastCount=count;onCount(count);}
  };
  const tick=()=>{if(closed)return;sync();callback=player.requestVideoFrameCallback(tick);};
  const events=['loadedmetadata','timeupdate','seeking','seeked','play','pause','ended'];
  for(const event of events)player.addEventListener(event,sync);
  sync();
  if(player.requestVideoFrameCallback)callback=player.requestVideoFrameCallback(tick);
  return()=>{
    closed=true;
    if(callback!==null)player.cancelVideoFrameCallback?.(callback);
    for(const event of events)player.removeEventListener(event,sync);
  };
}
