import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ChevronDown,Clock,Flame,Swords,Target,Users} from 'lucide-react';
import './progress-community-ui.css';

export default function FriendChallengePreview(){
 return <article className="cs-community-showcase cs-friends-demo" aria-label="Sample friend challenge">
  <header className="cs-demo-card-header"><div><p>TRAINING CIRCLE</p><h3>Your crew. Your edge.</h3></div><span className="cs-demo-crew-icon"><Users size={22}/></span></header>
  <div className="cs-demo-crew"><div className="cs-demo-crew-faces" aria-hidden="true"><span>MJ</span><span>DK</span><span>YOU</span></div><div><strong>Friends Circle</strong><span>6 players · Showing up together</span></div><span className="cs-demo-sample">SAMPLE</span></div>
  <div className="cs-demo-crew-pulse"><Flame size={16}/><span><strong>18 drills</strong> logged together this week.</span></div>
  <section className="cs-demo-challenge" aria-labelledby="cs-demo-challenge-title">
   <div className="cs-demo-challenge-kicker"><span><Swords size={14}/>FRIEND CHALLENGE</span><span><Clock size={12}/>23h left</span></div>
   <div className="cs-demo-challenger"><span className="cs-demo-marcus-avatar" aria-hidden="true">MJ</span><div><h3 id="cs-demo-challenge-title">Marcus set the pace.</h3><p>Crossover Control · 30 seconds</p></div></div>
   <div className="cs-demo-scoreboard"><div><span>TO BEAT</span><strong>52<small>reps</small></strong><span>Marcus</span></div><span className="cs-demo-versus">VS</span><div><span>YOUR BEST</span><strong>49<small>reps</small></strong><span>You</span></div></div>
   <div className="cs-demo-challenge-goal"><Target size={21}/><div><strong>4 reps to take the lead.</strong><span>Your next target: 53 reps.</span></div><ArrowUpRight size={18}/></div>
   <details className="cs-demo-challenge-details"><summary>View challenge<ChevronDown size={16}/></summary><div><p>Same drill. Same 30-second round. Record 53 or more controlled reps to move ahead of Marcus in this sample challenge.</p><Link to="/preview/lab/drill/stationary-crossover">Preview this drill<ArrowRight size={15}/></Link><small>Sample challenge · No invitation or score is posted.</small></div></details>
  </section>
  <Link className="cs-demo-text-link" to="/preview/circles/sample-crew">Explore Training Circles<ArrowRight size={15}/></Link>
 </article>;
}
