// Synthetic diagnostic only. These trajectories do not reproduce a filmed test.
import { GapAwareBounceCounter, PoundControlValidator } from '../src/lib/ai/poundCore.mjs';
const person={box:[400,80,850,680],xy:Array.from({length:17},()=>[650,350]),confidence:Array(17).fill(.95)};
Object.assign(person.xy,{5:[600,200],6:[700,200],10:[760,280],11:[600,350],12:[650,350],13:[650,500],14:[700,500],15:[650,650],16:[700,650]});
function trial({fps,reps,period,amplitude}){
  const counter=new GapAwareBounceCounter(),validator=new PoundControlValidator(),end=1+reps*period;
  for(let i=0;i<=Math.ceil((end+2)*fps);i++){
    const t=i/fps,phase=((t-1)/period)%1;
    const y=t>=1&&t<end?280+amplitude*(1-Math.abs(2*phase-1)):280;
    const proposals=counter.update(t,[y,60],720);
    const confirmed=validator.update(proposals,[760,y,60],person,t,end+1);
    confirmed.forEach(event=>counter.rememberControlledFloor(event));
  }
  return {fps,expectedBounces:amplitude===160?0:reps,accepted:validator.count,selectedCoverage:1};
}
console.log(JSON.stringify({scope:'Synthetic positions only; current checked-out counter; no detector execution.',
  aboveKneeDips:trial({fps:30,reps:2,period:.8,amplitude:160}),
  fastCleanTrajectories:[10,15,20,30,60].map(fps=>trial({fps,reps:20,period:.25,amplitude:320}))},null,2));
