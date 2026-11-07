const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

function controls(rows,hand,d){
 const other=hand==='right'?'left':'right';
 const owned=rows.filter(r=>r.measurement&&r.hands?.[hand]&&
  distance(r.measurement,r.hands[hand])/d<=1.1&&
  (!r.hands[other]||(distance(r.measurement,r.hands[other])-distance(r.measurement,r.hands[hand]))/d>=.15));
 const found=[];
 for(let i=1;i<owned.length;i++)for(let j=i-1;j>=0;j--){
  const before=owned[j],now=owned[i],dt=now.time-before.time;
  if(dt>.2)break;if(dt<.03)continue;
  const relative=r=>r.measurement.slice(0,2).map((v,k)=>v-r.hands[hand][k]);
  if(distance(relative(before),relative(now))<=d*.3&&
   (distance(before.measurement,now.measurement)<=d*.5||distance(before.hands[hand],now.hands[hand])>=d*.2)){
   found.push({hand,time:now.time});break;
  }
 }
 return found;
}

// Positive, distinguishable control by the other hand contradicts a right-hand
// pound. Missing or ambiguous wrists do not establish that contradiction.
// Keep receipts within the first ascent/return; a later bounce cannot repair it.
export function poundHandConflict(proposal,context){
 const floor=proposal.event_timestamp_exact??proposal.event_time_seconds,d=proposal.ball_scale_pixels;
 const highEnough=r=>r.measurement&&r.measurement[1]<=proposal.bottom_center_y-d*.6;
 const before=context.filter(r=>r.time<floor&&floor-r.time<=.65&&highEnough(r));
 const sources=[...controls(before,'right',d),...controls(before,'left',d)].sort((a,b)=>b.time-a.time);
 const rightAfterSource=sources[0]?.hand==='left'&&before.some(r=>r.time>sources[0].time&&r.hands?.right&&
  distance(r.measurement,r.hands.right)/d<=2.6&&(!r.hands.left||distance(r.measurement,r.hands.left)-distance(r.measurement,r.hands.right)>=d*.15));
 if(sources[0]?.hand==='left'&&!rightAfterSource)return 'observed_opposite_release_hand';
 const after=[];let high=proposal.bottom_center_y,closed=false;
 for(const row of context){
  if(row.time<=floor||row.time-floor>.65||!row.measurement)continue;
  high=Math.min(high,row.measurement[1]);
  if(proposal.bottom_center_y-high>=d*.6&&row.measurement[1]-high>=d*.35){closed=true;break;}
  if(highEnough(row))after.push(row);
 }
 const receipts=[...controls(after,'right',d),...controls(after,'left',d)].sort((a,b)=>a.time-b.time);
 if(receipts[0]?.hand==='left')return 'observed_opposite_receiving_hand';
 const rightObserved=after.some(r=>r.hands?.right&&distance(r.measurement,r.hands.right)/d<=2.6&&
  (!r.hands.left||(distance(r.measurement,r.hands.left)-distance(r.measurement,r.hands.right))/d>=.15));
 return closed&&!rightObserved?'unverified_first_return':null;
}
