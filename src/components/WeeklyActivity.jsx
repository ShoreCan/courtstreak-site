import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { previewSessions } from '../lib/previewData.js';
import { loadTrainingHistory } from '../lib/resultContext.js';

const localKey=value=>{const date=new Date(value);return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;};
export default function WeeklyActivity({ previewOnly=false }) {
  const [sessions,setSessions]=useState(null);
  const [selected,setSelected]=useState((new Date().getDay()+6)%7);
  const [error,setError]=useState(false);
  const [retry,setRetry]=useState(0);
  const today=new Date();today.setHours(0,0,0,0);
  const start=new Date(today);start.setDate(start.getDate()-(start.getDay()+6)%7);
  useEffect(()=>{
    let active=true;
    setError(false);setSessions(null);
    async function load(){
      if(previewOnly){if(active)setSessions(previewSessions());return;}
      const {data,error:authError}=await supabase.auth.getUser();
      if(authError||!data?.user)throw new Error('Unavailable');
      const result=await loadTrainingHistory(data.user.id,start.toISOString());
      if(result.error)throw result.error;
      if(active)setSessions(result.data);
    }
    load().catch(()=>{if(active)setError(true);});
    return()=>{active=false;};
  },[previewOnly,retry]);
  if(error)return <div className="cs-week-interactive"><button onClick={()=>setRetry(value=>value+1)}>Retry weekly activity</button></div>;
  if(!sessions)return <div className="cs-week-interactive" role="status">Loading activity…</div>;
  const days=Array.from({length:7},(_,index)=>{const date=new Date(start);date.setDate(date.getDate()+index);return {date,count:sessions.filter(session=>localKey(session.completed_at)===localKey(date)).length};});
  const selectedDay=days[selected];
  return <div className="cs-week-interactive"><div className="cs-week-taps" aria-label="Training days this week">{days.map((day,index)=><button key={index} disabled={day.date>today} className={`${day.count?'trained':''} ${index===selected?'selected':''}`} aria-pressed={index===selected} aria-label={`${day.date.toLocaleDateString(undefined,{weekday:'long'})}: ${day.count} recorded drills`} onClick={()=>setSelected(index)}><span>{['M','T','W','T','F','S','S'][index]}</span><i>{day.count?'✓':'·'}</i></button>)}</div><p role="status">{selectedDay.date.toLocaleDateString(undefined,{weekday:'short'})} · {selectedDay.count} recorded {selectedDay.count===1?'drill':'drills'}</p></div>;
}
