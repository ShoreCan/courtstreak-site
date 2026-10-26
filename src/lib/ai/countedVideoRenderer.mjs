import {drawCountedVideo,countAtTime,drawCameraPicture} from './videoCountOverlay.mjs';

// Camera pixels change every frame; most typography changes only a few times
// per second. Cache the two small graphic bands, without caching camera frames.
export function createCountedVideoRenderer({layout,changes,finalCount,completed,duration,createCanvas}){
  const make=(width,height)=>createCanvas?createCanvas(width,height):
    typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):
    Object.assign(document.createElement('canvas'),{width,height});
  const top=make(layout.width,layout.top),bottom=make(layout.width,layout.bottom),blank=make(1,1);
  const topCtx=top.getContext('2d'),bottomCtx=bottom.getContext('2d');
  let topKey=null,bottomKey=null;
  return {draw(ctx,source,time,result=false){
    const options={time,changes,finalCount,completed,duration,result};
    if(result){drawCountedVideo(ctx,source,layout,options);return;}
    const state=countAtTime(changes,time),seconds=Math.max(0,Math.ceil(duration-time));
    if(topKey!==seconds){drawCountedVideo(topCtx,blank,layout,options);topKey=seconds;}
    const nextKey=`${state.count}/${state.pulse}/${state.delta}`;
    if(bottomKey!==nextKey){
      bottomCtx.save();bottomCtx.translate(0,-(layout.picture.y+layout.picture.height));
      drawCountedVideo(bottomCtx,blank,layout,options);bottomCtx.restore();bottomKey=nextKey;
    }
    const p=layout.picture;drawCameraPicture(ctx,source,p);
    ctx.drawImage(top,0,0);ctx.drawImage(bottom,0,p.y+p.height);
    const bar=4*layout.unit;ctx.fillStyle='#101e31';ctx.fillRect(0,layout.height-bar,layout.width,bar);
    ctx.fillStyle='#ffa46b';ctx.fillRect(0,layout.height-bar,layout.width*Math.min(1,Math.max(0,time/duration)),bar);
  }};
}
