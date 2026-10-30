import React,{useId,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ChevronDown,Target,TrendingUp,Trophy} from 'lucide-react';
import './progress-community-ui.css';

const DRILLS=[
 {key:'crossovers',name:'Crossover Control',values:[30,33,35,36,38,41,45,49]},
 {key:'right',name:'Right-Hand Pound',values:[28,31,30,35,37,42,40,46]},
 {key:'left',name:'Left-Hand Pound',values:[22,25,28,29,31,33,36,39]},
];

export default function ProgressPreview(){
 const [drillKey,setDrillKey]=useState('crossovers'),[range,setRange]=useState(4),[selected,setSelected]=useState(3);
 const id=useId(),pointRefs=useRef([]),drill=DRILLS.find(item=>item.key===drillKey);
 const values=drill.values.slice(-range),value=values[selected],first=values[0],difference=value-first;
 const gain=Math.round(difference/first*100),latest=selected===values.length-1,best=Math.max(...values);
 const min=Math.floor((Math.min(...values)-3)/10)*10,max=Math.ceil((Math.max(...values)+3)/10)*10;
 const points=values.map((reps,index)=>({x:12+376*index/(values.length-1),y:145-(reps-min)/(max-min)*130}));
 const line=points.map(point=>`${point.x},${point.y}`).join(' '),gradientId=`progress-${id.replaceAll(':','')}`;
 const when=index=>index===values.length-1?'This week':index===values.length-2?'Last week':`${values.length-1-index} weeks ago`;
 function changeRange(next){setRange(next);setSelected(next-1);}
 function movePoint(event,index){
  const next=event.key==='ArrowRight'?Math.min(values.length-1,index+1):event.key==='ArrowLeft'?Math.max(0,index-1):event.key==='Home'?0:event.key==='End'?values.length-1:null;
  if(next===null)return;event.preventDefault();setSelected(next);pointRefs.current[next]?.focus();
 }
 return <article className="cs-progress-showcase cs-progress-demo" aria-labelledby={`${id}-title`}>
  <header className="cs-demo-card-header"><div><p>PLAYER PROGRESS</p><h3 id={`${id}-title`}>Your improvement</h3></div><span className="cs-demo-sample">INTERACTIVE SAMPLE</span></header>
  <div className="cs-demo-controls"><label className="cs-demo-drill-picker"><span>DRILL</span><span><select aria-label="Progress drill" value={drillKey} onChange={event=>{setDrillKey(event.target.value);setSelected(range-1);}}>{DRILLS.map(item=><option key={item.key} value={item.key}>{item.name}</option>)}</select><ChevronDown size={14}/></span></label><div className="cs-demo-range" role="group" aria-label="Progress time range">{[4,8].map(weeks=><button type="button" key={weeks} aria-pressed={range===weeks} onClick={()=>changeRange(weeks)}>{weeks} weeks</button>)}</div></div>
  <div className="cs-demo-result" aria-live="polite" aria-atomic="true"><div><span>{when(selected)} · 30-second round</span><strong>{value}<small>reps</small></strong></div><div className="cs-demo-gain"><TrendingUp size={15}/>{difference===0?'Starting point':`${gain>0?'+':''}${gain}%`}<small>{difference===0?'First shown week':`vs. ${when(0).toLowerCase()}`}</small></div></div>
  <div className="cs-demo-chart-heading"><span>WEEKLY BEST</span><span>Tap a point to explore</span></div>
  <div className="cs-demo-chart"><div className="cs-demo-axis" aria-hidden="true"><span>{max}</span><span>{(max+min)/2}</span><span>{min}</span></div><div className="cs-demo-plot" data-points={values.length}>
   <svg viewBox="0 0 400 160" preserveAspectRatio="none" role="img" aria-label={`${drill.name}, last ${range} weeks: ${values.join(', ')} reps in 30-second rounds`}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--cs-theme-secondary)" stopOpacity=".2"/><stop offset="100%" stopColor="var(--cs-theme-secondary)" stopOpacity="0"/></linearGradient></defs>{[15,80,145].map(y=><line key={y} x1="0" x2="400" y1={y} y2={y} className="cs-demo-gridline"/>)}<path d={`M${points[0].x},145 L${points.map(p=>`${p.x},${p.y}`).join(' L')} L${points.at(-1).x},145 Z`} fill={`url(#${gradientId})`}/><polyline points={line} className="cs-demo-chart-line"/><line x1={points[selected].x} x2={points[selected].x} y1={points[selected].y} y2="145" className="cs-demo-cursor"/></svg>
   {points.map((point,index)=><button type="button" key={index} ref={element=>{pointRefs.current[index]=element;}} className="cs-demo-point" style={{left:`${point.x/4}%`,top:`${point.y/1.6}%`}} aria-label={`${when(index)}, ${values[index]} reps`} aria-pressed={selected===index} onClick={()=>setSelected(index)} onFocus={()=>setSelected(index)} onKeyDown={event=>movePoint(event,index)}><span/></button>)}
  </div></div>
  <div className="cs-demo-dates"><span>{when(0)}</span><span>This week</span></div>
  <div className="cs-demo-insight">{latest&&value===best?<Trophy size={19}/>:<Target size={19}/>}<div><strong>{latest&&value===best?'New personal best':selected===0?'Your starting point':`${when(selected)} check-in`}</strong><span>{difference===0?'Every bit of progress starts here.':`${Math.abs(difference)} ${difference>0?'more':'fewer'} reps than ${when(0).toLowerCase()}.`}</span></div><span className="cs-demo-insight-value">{difference>0?'+':''}{difference}<small>reps</small></span></div>
  <Link className="cs-demo-text-link" to="/preview/progress">Explore the progress dashboard<ArrowRight size={15}/></Link>
 </article>;
}
