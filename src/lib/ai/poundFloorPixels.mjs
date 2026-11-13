// A low-resolution observation of the same captured image used by the model.
// Learn appearance from a model-owned ball and separate it from stationary
// objects with a recent image. The output is evidence for a shadow counter.
export const POUND_PIXEL_FLOOR_REVISION = 'POUND PIXEL FLOOR 01';

function chroma(data, i) {
 const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
 const sum = Math.max(60, r + g + b);
 return [(r - g) / sum, (g - b) / sum];
}

function median(values) {
 const sorted = values.slice().sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
 return (sorted[middle] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2;
}

function closing(mask, width, height) {
 const grown = new Uint8Array(mask.length), closed = new Uint8Array(mask.length);
 for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
   const i = y * width + x;
   grown[i] = mask[i] || (x > 0 && mask[i - 1]) || (x + 1 < width && mask[i + 1]) ||
    (y > 0 && mask[i - width]) || (y + 1 < height && mask[i + width]);
  }
 }
 for (let y = 1; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
   const i = y * width + x;
   closed[i] = grown[i] && grown[i - 1] && grown[i + 1] && grown[i - width] && grown[i + width];
  }
 }
 return closed;
}

function components(mask, changed, width, height, minimumArea) {
 const found = [], queue = new Int32Array(mask.length);
 for (let i = 0; i < mask.length; i++) {
  if (!mask[i]) continue;
  let n = 1, moved = 0, left = width, top = height, right = 0, bottom = 0;
  queue[0] = i;
  mask[i] = 0;
  for (let j = 0; j < n; j++) {
   const p = queue[j], x = p % width, y = (p - x) / width;
   left = Math.min(left, x); right = Math.max(right, x + 1);
   top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
   moved += changed[p];
   // Closing clears the border, so each queued component is interior.
   for (const next of [p - 1, p + 1, p - width, p + width]) {
    if (mask[next]) { mask[next] = 0; queue[n++] = next; }
   }
  }
  if (n >= minimumArea) found.push({left, top, right, bottom, area: n, motion: moved / n});
 }
 return found;
}

export class PoundFloorPixels {
 constructor({crossover=false}={}) {
  this.crossover=crossover;
  this.appearance = [];
  this.history = [];
  this.anchor = null;
  this.lastVisual = null;
 }

 learn(image, x, y, size) {
  const {width, height, data} = image, margin = Math.max(2, Math.round(size * .17));
  const rg = [], gb = [];
  for (let py = Math.max(0, Math.floor(y) - margin); py < Math.min(height, Math.floor(y) + margin + 1); py++) {
   for (let px = Math.max(0, Math.floor(x) - margin); px < Math.min(width, Math.floor(x) + margin + 1); px++) {
    const [a, b] = chroma(data, 4 * (py * width + px));
    rg.push(a); gb.push(b);
   }
  }
  if (!rg.length) return;
  const a = median(rg), b = median(gb);
  if (Math.hypot(a, b) <= .12) return;
  this.appearance.push({a, b, size});
  if (this.appearance.length > 12) this.appearance.shift();
 }

 update(image, {time, selected, person, frameWidth, frameHeight, serial}) {
  const {width, height} = image, sx = width / frameWidth, sy = height / frameHeight;
  if (serial !== undefined && serial === this.history.at(-1)?.serial) return null;
  if (this.history.length && (this.history.at(-1).image.width !== width ||
      this.history.at(-1).image.height !== height || time <= this.history.at(-1).time)) {
   this.history = []; this.appearance = []; this.anchor = null; this.lastVisual = null;
  }
  const old = this.history.findLast(row => time - row.time >= .052 && time - row.time <= .155)?.image;
  this.history.push({time, image, serial});
  if (this.history.length > 8) this.history.shift();

  let measured = null;
  if (selected) {
   const [l, t, r, b] = selected.box, x = (l + r) * sx / 2, y = (t + b) * sy / 2;
   const size = Math.sqrt((r - l) * sx * (b - t) * sy);
   measured = {x, y, size, time};
   if (selected.score >= .22 && (this.crossover?[9,10]:[10]).some(index=>{
    if(!(person?.confidence?.[index]>=.55))return false;
    const [wx,wy]=person.xy[index];
    return Math.hypot(wx*sx-x,wy*sy-y)<size*1.35;
   })) {
    this.learn(image,x,y,size);
   }
  }
  let hit = null;
  if (old && this.appearance.length >= 2 && this.anchor && time - this.anchor.time < .37 &&
      person?.confidence?.[15] > .45 && person.confidence[16] > .45) {
   const feet = Math.max(person.xy[15][1], person.xy[16][1]) * sy;
   hit = this.search(image, old, feet, time, measured, selected?.score);
   if (hit) this.lastVisual = {x: (hit.left + hit.right) / 2, y: (hit.top + hit.bottom) / 2, time};
  }
  if (measured && selected.score >= .02) this.anchor = this.lastVisual = measured;
  return hit ? {box: [hit.left / sx, hit.top / sy, hit.right / sx, hit.bottom / sy]} : null;
 }

 search(image, old, feet, time, measured, score) {
  const a = median(this.appearance.map(p => p.a)), b = median(this.appearance.map(p => p.b));
  const size = median(this.appearance.map(p => p.size)), magnitude = Math.hypot(a, b);
  const u = a / magnitude, v = b / magnitude, anchor = this.anchor;
  const prior = this.lastVisual && time - this.lastVisual.time < .16 ? this.lastVisual : anchor;
  const lateral=this.crossover?Math.min(4,1.55+18*(time-prior.time)):1.55;
  const left = Math.max(0, Math.floor(Math.min(prior.x, anchor.x) - size * lateral));
  const right = Math.min(image.width, Math.floor(Math.max(prior.x, anchor.x) + size * lateral) + 1);
  const top = Math.max(0, Math.floor(Math.min(prior.y, anchor.y) - size * 2.8));
  const bottom = Math.min(image.height, Math.floor(feet + size * 1.3) + 1);
  const width = right - left, height = bottom - top;
  if (width < 3 || height < 3) return null;
  const mask = new Uint8Array(width * height), changed = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
   for (let x = 0; x < width; x++) {
    const p = 4 * ((top + y) * image.width + left + x), i = y * width + x;
    const [rg, gb] = chroma(image.data, p), along = rg * u + gb * v;
    const [beforeRg, beforeGb] = chroma(old.data, p);
    const delta = (rg - beforeRg) ** 2 + (gb - beforeGb) ** 2;
    changed[i] = delta > .045 ** 2;
    mask[i] = delta > .041 ** 2 && along >= magnitude * .52 && along <= magnitude * 1.6 &&
     Math.abs(rg * v - gb * u) < .028 + .14 * along;
   }
  }
  const choices = [];
  for (const piece of components(closing(mask, width, height), changed, width, height, size ** 2 * .12)) {
   const w = piece.right - piece.left, h = piece.bottom - piece.top, diameter = Math.sqrt(w * h);
   const x = left + (piece.left + piece.right) / 2, y = top + (piece.top + piece.bottom) / 2;
   const dy = Math.abs(y - prior.y) / size;
   if (diameter < size * .58 || diameter > size * 1.72 || w / h < .47 || w / h > 2 ||
       piece.area / (w * h) <= .43 || piece.motion <= .17 || Math.abs(x - prior.x) > size * (lateral-.15) ||
       Math.abs(x - anchor.x) > size * (this.crossover?Math.min(4,1.75+18*(time-anchor.time)):1.75) || dy > 1.1 + 32 * (time - prior.time)) continue;
   if (measured && score > .05 && Math.hypot(x - measured.x, y - measured.y) > size * .8) continue;
   const cost = Math.abs(x - prior.x) / size + dy * .28 + Math.abs(Math.log(diameter / size)) * .65 + (1 - piece.motion) * .3;
   choices.push({left: left + piece.left, top: top + piece.top, right: left + piece.right, bottom: top + piece.bottom, cost});
  }
  choices.sort((a, b) => a.cost - b.cost);
  return choices.length === 1 || (choices.length > 1 && choices[1].cost - choices[0].cost > .27) ? choices[0] : null;
 }
}

export class LivePoundFloorPixels {
 constructor({bridge=false,crossover=false,now=()=>performance.now()}={}) {
  this.pixels = new PoundFloorPixels({crossover});
  this.densePixels = bridge ? new PoundFloorPixels({crossover}) : null;
  this.presented = [];
  this.previous = null;
  this.now = now;
  this.context = null;
  this.pausedUntil = -Infinity;
  this.bridgePausedUntil = -Infinity;
  this.slowSamples = 0;
  this.unavailable = false;
 }

 readImage(source, frameWidth, frameHeight, mirror=false) {
  this.context ??= document.createElement('canvas').getContext('2d', {willReadFrequently: true});
  const canvas = this.context.canvas;
  const scale = 320 / Math.max(frameWidth,frameHeight);
  const width = Math.max(1, Math.round(frameWidth * scale));
  const height = Math.max(1, Math.round(frameHeight * scale));
  if (canvas.width !== width || canvas.height !== height) {
   canvas.width = width;
   canvas.height = height;
  }
  this.context.setTransform?.(mirror?-1:1,0,0,1,mirror?width:0,0);
  this.context.drawImage(source, 0, 0, width, height);
  return this.context.getImageData(0, 0, width, height);
 }

 capturePresented(video, {time,serial,frameWidth,frameHeight}) {
  if (!this.densePixels || this.unavailable || time<this.pausedUntil || time<this.bridgePausedUntil || !this.previous ||
      serial<=this.previous.serial || time-this.previous.time<.02) return;
  const started=this.now();
  try {
   const image=this.readImage(video,frameWidth,frameHeight,true);
   this.presented=[...this.presented.slice(-4),{time,serial,image}];
   this.captureMs=(this.captureMs??0)+this.now()-started;
   if (this.captureMs>8) {
    this.bridgePausedUntil=time+.5;
    this.presented=[];
   }
  } catch {
   // The frozen model frame can still provide the ordinary pixel check.
   this.densePixels=null;
   this.presented=[];
  }
 }

 sample(frame, input) {
  if (this.unavailable) return {timing: {status: 'unavailable'}};
  if (input.time < this.pausedUntil) {
   this.previous=null;
   this.presented=[];
   this.captureMs=0;
   return {timing: {status: 'budget'}};
  }
  const started = this.now();
  try {
   const image=this.readImage(frame.image??frame,input.frameWidth,input.frameHeight);
   const evidence = this.pixels.update(image, input);
   const ms=this.now()-started;
   let bridge;
   if(this.densePixels&&input.time>=this.bridgePausedUntil&&ms<8){
    const previous=this.previous, gap=previous?input.time-previous.time:0, intermediate=[];
    if(gap>=.075&&gap<=.3){
     for(const row of this.presented){
      if(row.serial<=previous.serial||row.serial>=input.serial||row.time<=previous.time||
         row.time>=input.time||row.time-previous.time>.2||row.image.width!==image.width||row.image.height!==image.height)continue;
      const hit=this.densePixels.update(row.image,{...input,time:row.time,serial:row.serial,selected:null,person:previous.person});
      if(hit)intermediate.push({...hit,offset:row.time-input.time,serial:row.serial});
     }
    }
    bridge={evidence:this.densePixels.update(image,input),intermediate};
   }
   this.previous=input;
   this.presented=this.presented.filter(row=>row.serial>input.serial);
   const captureMs=this.captureMs??0;
   this.captureMs=0;
   const bridgeMs=this.now()-started-ms+captureMs;
   if(bridgeMs>8)this.bridgePausedUntil=input.time+.5;
   this.slowSamples = ms > 8 ? this.slowSamples + 1 : 0;
   if (ms > 24 || this.slowSamples >= 2) {
    this.pausedUntil = input.time + .5;
    this.slowSamples = 0;
   }
   return {evidence,bridge,timing: {status: 'sampled', ms, ...(this.densePixels?{bridgeMs}:{})}};
  } catch {
   this.unavailable = true;
   return {timing: {status: 'unavailable'}};
  }
 }
}
