export const FLOOR_VIEW_REVISION='SAME FRAME FLOOR VIEW 01';
const visible=(p,i)=>p?.confidence?.[i]>=.5&&p.xy?.[i]?.length===2&&p.xy[i].every(v=>Number.isFinite(v)&&v>0);
export function floorViewROI({person,measurement,diameter:d,lane,phase,width,height,calibrated=true}){
 if(!calibrated||!['active','review','drill'].includes(phase)||!Number.isFinite(d)||d<=0||!Number.isFinite(lane)||![width,height].every(v=>Number.isFinite(v)&&v>0)||![10,15,16].every(i=>visible(person,i)))return null;
 if(measurement&&(!Array.isArray(measurement)||measurement.length!==3||!measurement.every(Number.isFinite)||measurement[2]<=0))return null;
 const feet=Math.max(person.xy[15][1],person.xy[16][1]);
 if(measurement&&measurement[2]>=d*.8&&measurement[1]+measurement[2]*.5<feet-d*3)return null;
 const roi=[Math.max(0,Math.floor(Math.min(lane,person.xy[10][0])-d*2.2)),Math.max(0,Math.floor(feet-d*4.5)),Math.min(width,Math.ceil(Math.max(lane,person.xy[10][0])+d*2.2)),Math.min(height,Math.ceil(feet+d*.9))];
 return roi[2]>roi[0]&&roi[3]>roi[1]?roi:null;
}
const iou=(a,b)=>{const overlap=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));return overlap/Math.max(1,(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-overlap);};
export function mergeFloorProposals(primary,secondary){
 const combined=[];
 for(const c of [...primary,...secondary].sort((a,b)=>b.score-a.score))if(combined.every(k=>iou(k.box,c.box)<.7))combined.push(c);
 return combined;
}
