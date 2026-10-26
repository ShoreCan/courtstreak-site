export const DETECTOR_INPUT_REVISION = 'INPUT 01';

// Detection is sequential. Keep a canvas and CHW buffer for each model instead
// of resizing one canvas and allocating megabytes of Float32 storage per pass.
export class DetectorInput {
  constructor(size, createCanvas=()=>document.createElement('canvas')) {
    this.size=size;
    this.canvas=createCanvas(); this.canvas.width=this.canvas.height=size;
    this.context=this.canvas.getContext('2d',{willReadFrequently:true});
    this.data=new Float32Array(3*size*size);
  }
  prepare(source, roi) {
    const size=this.size, [x,y,x2,y2]=roi, w=x2-x, h=y2-y;
    const scale=Math.min(size/w,size/h), dw=Math.round(w*scale), dh=Math.round(h*scale);
    const px=Math.round((size-dw)/2-.1), py=Math.round((size-dh)/2-.1), c=this.context;
    c.fillStyle='rgb(114,114,114)'; c.fillRect(0,0,size,size);
    c.drawImage(source,x,y,w,h,px,py,dw,dh);
    const rgba=c.getImageData(0,0,size,size).data, n=size*size, data=this.data;
    for (let i=0;i<n;i++) { data[i]=rgba[i*4]/255; data[n+i]=rgba[i*4+1]/255; data[n*2+i]=rgba[i*4+2]/255; }
    return { data, transform:{x,y,scale,px,py} };
  }
  release() { this.canvas.width=this.canvas.height=0; this.data=null; this.context=null; }
}

// Published live preprocessing, retained verbatim for the paired diagnostic.
// This remains the live default until device evidence justifies a change.
export class LegacyDetectorInput {
  constructor(createCanvas=()=>document.createElement('canvas')) {
    this.canvas=createCanvas();
    this.context=this.canvas.getContext('2d',{willReadFrequently:true});
  }
  prepare(source, size, roi) {
    const [x,y,x2,y2]=roi,w=x2-x,h=y2-y,scale=Math.min(size/w,size/h),dw=Math.round(w*scale),dh=Math.round(h*scale),px=Math.round((size-dw)/2-.1),py=Math.round((size-dh)/2-.1);
    const canvas=this.canvas;
    if(canvas.width!==size){canvas.width=canvas.height=size;this.context=canvas.getContext('2d',{willReadFrequently:true});}
    const ctx=this.context;
    ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,size,size);ctx.drawImage(source,x,y,w,h,px,py,dw,dh);
    const rgba=ctx.getImageData(0,0,size,size).data,n=size*size,data=new Float32Array(n*3);
    for(let i=0;i<n;i++){data[i]=rgba[i*4]/255;data[n+i]=rgba[i*4+1]/255;data[n*2+i]=rgba[i*4+2]/255;}
    return {data,transform:{x,y,scale,px,py}};
  }
  release() { this.canvas.width=this.canvas.height=0; this.context=null; }
}
