import React, { useEffect, useMemo, useState } from 'react';
import './courtstreak-experience.css';

const sampleTrophies = [
  { id:'first-workout', name:'First Workout', category:'Milestones', description:'Complete your first full workout.', unlocked:true, progress:1, goal:1, symbol:'★' },
  { id:'week-streak', name:'7-Day Streak', category:'Consistency', description:'Complete training on seven consecutive days.', unlocked:true, progress:7, goal:7, symbol:'♨' },
  { id:'handles-25', name:'Handles Builder', category:'Ball Handling', description:'Finish 25 ball-handling workouts.', unlocked:false, progress:16, goal:25, symbol:'◉' },
  { id:'team-player', name:'Team Player', category:'Training Circles', description:'Contribute 10 full workouts to a circle challenge.', unlocked:false, progress:6, goal:10, symbol:'✦' },
  { id:'century', name:'Century Club', category:'Milestones', description:'Complete 100 full workouts.', unlocked:false, progress:37, goal:100, symbol:'◆' },
  { id:'thirty-day', name:'30-Day Streak', category:'Consistency', description:'Protect a 30-day training streak.', unlocked:false, progress:18, goal:30, symbol:'♛' },
];
const sampleCircles = [
  { id:'varsity', name:'Varsity Basketball', description:'High School Team', members:[{ id:'you',name:'You',workouts:5,xp:720 },{id:'jordan',name:'Jordan',workouts:6,xp:840},{id:'marcus',name:'Marcus',workouts:4,xp:690},{id:'alex',name:'Alex',workouts:3,xp:510}], goals:{current:18,target:25}, daysLeft:3 },
  { id:'friends', name:'The Gym Crew', description:'Friends', members:[{id:'you',name:'You',workouts:5,xp:720},{id:'mila',name:'Mila',workouts:5,xp:760},{id:'dev',name:'Dev',workouts:3,xp:490}],goals:{current:13,target:20},daysLeft:5 }
];
const clamp = (v,min,max)=> Math.max(min,Math.min(max,Number(v)||0));
const number = v => Number.isFinite(Number(v)) ? Math.max(0,Math.round(Number(v))) : 0;

export function WorkoutCelebration({ open=true, onClose=()=>{}, workoutName='Ball Handling Workout', xpEarned=140, streak=18, workoutCount=37, unlockedTrophies=[], reducedMotion=false }) {
  const [showDetails,setShowDetails]=useState(false);
  useEffect(()=> { if(open) setShowDetails(false); },[open]);
  useEffect(()=> { if(!open)return; const onKey=(e)=>{if(e.key==='Escape')onClose()}; window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey) },[open,onClose]);
  if(!open) return null;
  return <div className={`csx-celebration ${reducedMotion?'csx-no-motion':''}`} role="dialog" aria-modal="true" aria-label="Workout complete">
    <div className="csx-celebration-card">
      <button className="csx-close" onClick={onClose} aria-label="Close celebration">×</button>
      <div className="csx-kicker">THE WORK ADDS UP</div>
      <div className="csx-ball-wrap" aria-hidden="true"><div className="csx-ball"><i/><b/></div><span className="csx-spark csx-spark-a"/><span className="csx-spark csx-spark-b"/></div>
      <h2>Workout complete.</h2><p className="csx-muted">{workoutName}</p>
      <div className="csx-stat-grid"><div><strong>+{number(xpEarned)}</strong><span>XP earned</span></div><div><strong>{number(streak)} <em>🔥</em></strong><span>Day streak</span></div><div><strong>{number(workoutCount)}</strong><span>Total workouts</span></div></div>
      {unlockedTrophies.length>0 && <div className="csx-unlocks" role="status">🏆 {unlockedTrophies.length} new {unlockedTrophies.length===1?'trophy':'trophies'} unlocked: {unlockedTrophies.map(t=>t.name||t).join(', ')}</div>}
      {showDetails && <p className="csx-muted csx-fine">Keep your streak alive by completing at least one qualifying drill within 24 hours. Full workouts award separate completion credit.</p>}
      <div className="csx-actions"><button className="csx-secondary" onClick={()=>setShowDetails(s=>!s)} aria-expanded={showDetails}>{showDetails?'Hide details':'How progress works'}</button><button className="csx-primary" onClick={onClose}>Keep going</button></div>
    </div>
  </div>;
}

export function InteractiveTrophyCase({ trophies=sampleTrophies }) {
  const clean=useMemo(()=>Array.isArray(trophies)?trophies:[],[trophies]);
  const categories=['All',...new Set(clean.map(t=>t.category||'Other'))];
  const [filter,setFilter]=useState('All'),[selected,setSelected]=useState(null);
  const visible=clean.filter(t=>filter==='All'||(t.category||'Other')===filter);
  const active=visible.find(t=>t.id===selected)||visible[0];
  const unlocked=clean.filter(t=>t.unlocked).length;
  return <section className="csx-panel csx-trophies" aria-label="Interactive trophy case">
    <div className="csx-header"><div><span className="csx-kicker">EARNED, NOT GIVEN</span><h2>Your trophy case</h2><p>{unlocked} of {clean.length} trophies unlocked</p></div><div className="csx-count">{unlocked}<small>UNLOCKED</small></div></div>
    <div className="csx-filters" aria-label="Trophy categories">{categories.map(c=><button key={c} className={filter===c?'csx-active':''} onClick={()=>{setFilter(c);setSelected(null)}} aria-pressed={filter===c}>{c}</button>)}</div>
    <div className="csx-shelf" role="list">{visible.map(t=><button role="listitem" key={t.id} className={`csx-trophy ${!t.unlocked?'csx-locked':''} ${active?.id===t.id?'csx-picked':''}`} onClick={()=>setSelected(t.id)} aria-pressed={active?.id===t.id}>
      <span className="csx-medallion" aria-hidden="true">{t.unlocked?(t.symbol||'🏆'):'✧'}</span><strong>{t.name}</strong><span>{t.unlocked?'UNLOCKED':'LOCKED'}</span></button>)}</div>
    {active ? <div className="csx-detail" aria-live="polite"><div><span className="csx-kicker">{active.category||'Achievement'}</span><h3>{active.name}</h3><p>{active.description}</p></div><div className="csx-progress-info"><strong>{active.unlocked?'Completed':`${number(active.progress)} / ${Math.max(1,number(active.goal))}`}</strong><div className="csx-track"><div style={{width:`${active.unlocked?100:clamp((number(active.progress)/Math.max(1,number(active.goal)))*100,0,100)}%`}}/></div></div></div>:<p className="csx-muted">No trophies in this category yet.</p>}
  </section>;
}

export function TrendingCircles({ circles=sampleCircles, currentUserId='you' }) {
  const data=Array.isArray(circles)?circles:[];
  const [circleId,setCircleId]=useState(data[0]?.id||''),[metric,setMetric]=useState('workouts'),[view,setView]=useState('leaderboard');
  const circle=data.find(c=>c.id===circleId)||data[0];
  const members=useMemo(()=> [...(circle?.members||[])].sort((a,b)=>number(b[metric])-number(a[metric])||String(a.name).localeCompare(String(b.name))),[circle,metric]);
  const max=Math.max(1,...members.map(m=>number(m[metric])));
  const current=members.find(m=>m.id===currentUserId),rank=members.findIndex(m=>m.id===currentUserId)+1;
  const goal=circle?.goals||{current:0,target:1};
  return <section className="csx-panel csx-circles" aria-label="Training circles competitions"><div className="csx-header"><div><span className="csx-kicker">BETTER TOGETHER</span><h2>Training Circles</h2><p>Consistency turns into momentum.</p></div><span className="csx-live-dot">WEEKLY</span></div>
    {data.length===0 ? <p className="csx-muted">Join a Training Circle to see your competitions.</p> : <>
      <label className="csx-select-label" htmlFor="csx-circle-select">Your circle</label><select id="csx-circle-select" value={circle?.id||''} onChange={e=>setCircleId(e.target.value)}>{data.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>
      <div className="csx-challenge"><div><span className="csx-kicker">THIS WEEK'S TEAM GOAL</span><h3>{circle?.name}</h3><p>{circle?.description||'Training Circle'} · {number(circle?.daysLeft)} days remaining</p></div><strong>{number(goal.current)}<span> / {Math.max(1,number(goal.target))}</span></strong><div className="csx-track csx-wide"><div style={{width:`${clamp(number(goal.current)/Math.max(1,number(goal.target))*100,0,100)}%`}}/></div><p className="csx-small">{Math.max(0,number(goal.target)-number(goal.current))} more qualifying workouts to reach the team goal</p></div>
      <div className="csx-tabs"><button className={view==='leaderboard'?'csx-active':''} onClick={()=>setView('leaderboard')}>Leaderboard</button><button className={view==='team'?'csx-active':''} onClick={()=>setView('team')}>Team pulse</button></div>
      {view==='leaderboard'?<><div className="csx-metrics"><button className={metric==='workouts'?'csx-active':''} onClick={()=>setMetric('workouts')}>Workouts</button><button className={metric==='xp'?'csx-active':''} onClick={()=>setMetric('xp')}>XP</button></div>
      <div className="csx-rows">{members.map((m,i)=><div className={`csx-rank ${m.id===currentUserId?'csx-you':''}`} key={m.id}><span className="csx-place">{i+1}</span><div className="csx-rank-body"><div className="csx-rank-top"><strong>{m.name}{m.id===currentUserId?' · You':''}</strong><span>{number(m[metric])}{metric==='xp'?' XP':''}</span></div><div className="csx-track"><div style={{width:`${number(m[metric])/max*100}%`}}/></div></div></div>)}</div>
      <p className="csx-small" aria-live="polite">{rank?`You're #${rank} of ${members.length} in ${metric==='xp'?'XP':'completed workouts'} this week.`:'Your ranking will appear after your first qualifying contribution.'}</p></>:<div className="csx-team-pulse"><strong>{members.length} active members shown</strong><p>Every verified full workout moves the team goal forward. Individual drills can protect a streak without inflating the workout leaderboard.</p><p>Encourage your teammates and keep building a streak you don't want to lose.</p></div>}
    </>}
  </section>;
}

export default function CourtStreakExperience(){
 const [tab,setTab]=useState('circles'),[celebrate,setCelebrate]=useState(false);
 return <main className="csx-root"><div className="csx-shell"><div className="csx-preview-tag">UI PREVIEW · SAMPLE DATA ONLY</div><header className="csx-top"><span className="csx-wordmark">COURT<span>STREAK</span></span><h1>Train. Progress. Compete.</h1><p>Explore three interactive experiences before connecting them to live workout and circle data.</p></header>
 <nav className="csx-main-tabs" aria-label="Experience previews"><button onClick={()=>setTab('circles')} className={tab==='circles'?'csx-active':''}>Training Circles</button><button onClick={()=>setTab('trophies')} className={tab==='trophies'?'csx-active':''}>Trophy Case</button><button onClick={()=>setTab('finish')} className={tab==='finish'?'csx-active':''}>Workout Finish</button></nav>
 {tab==='circles'&&<TrendingCircles/>}{tab==='trophies'&&<InteractiveTrophyCase/>}{tab==='finish'&&<section className="csx-panel csx-finish-preview"><span className="csx-kicker">MAKE THE MOMENT COUNT</span><h2>Every workout deserves a finish line.</h2><p>Preview the celebration players will see after a successfully saved full workout.</p><button className="csx-primary" onClick={()=>setCelebrate(true)}>Preview completion animation</button></section>}
 <p className="csx-demo-note">Preview values aren't connected to Supabase, payments, or user accounts. No workout or XP is saved from this screen.</p></div><WorkoutCelebration open={celebrate} onClose={()=>setCelebrate(false)}/></main>
}
