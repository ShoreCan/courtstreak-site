// Chronological one-to-one matching. Repeated predictions remain extras.
export function matchEvents(truth,predicted,tolerance){
 const a=truth.map((event,index)=>({event,index})).sort((x,y)=>x.event.time-y.event.time);
 const b=predicted.map((event,index)=>({event,index})).sort((x,y)=>x.event.time-y.event.time);
 const dp=Array.from({length:a.length+1},()=>Array(b.length+1));
 const better=(x,y)=>!y||x.pairs.length>y.pairs.length||x.pairs.length===y.pairs.length&&x.error<y.error?x:y;
 for(let i=0;i<=a.length;i++)for(let j=0;j<=b.length;j++){
  if(!i||!j){dp[i][j]={pairs:[],error:0};continue;}
  let best=better(dp[i-1][j],dp[i][j-1]);
  const error=Math.abs(a[i-1].event.time-b[j-1].event.time);
  if(error<=tolerance){const prev=dp[i-1][j-1];best=better({pairs:[...prev.pairs,[a[i-1].index,b[j-1].index]],error:prev.error+error},best);}
  dp[i][j]=best;
 }
 const result=dp[a.length][b.length],truthUsed=new Set(result.pairs.map(p=>p[0])),predUsed=new Set(result.pairs.map(p=>p[1]));
 return {...result,matched:result.pairs.length,missed:truth.filter((_,i)=>!truthUsed.has(i)),extra:predicted.filter((_,i)=>!predUsed.has(i)),wrongHand:result.pairs.filter(([i,j])=>truth[i].fromHand&&predicted[j].fromHand&&truth[i].fromHand!==predicted[j].fromHand).length};
}
