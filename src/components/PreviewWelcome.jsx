import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Flame, ShieldCheck, Users, Activity, ChevronRight } from 'lucide-react';
import '../preview-welcome.css';

export function PreviewVisual({ role }) {
  if (role === 'player') return <div className="cs-discover-visual player" aria-label="Sample player view: four-day streak, level seven">
    <div className="cs-discover-mini-top"><span>JORDAN CARTER</span><span className="cs-sample-chip">SAMPLE</span></div>
    <div className="cs-discover-ball-row"><div><Flame size={23} /><strong>4 <small>day streak</small></strong><span>Show up. Stack good days.</span></div><img src={`${import.meta.env.BASE_URL}hub-assets/basketball.webp`} alt="" /></div>
    <div className="cs-discover-level"><span>PLAYER LEVEL <strong>07</strong></span><span>615 XP</span></div><div className="cs-discover-track"><i style={{width:'15%'}} /></div>
  </div>;
  if (role === 'parent') return <div className="cs-discover-visual parent" aria-label="Sample parent view: Jordan Carter, 32 active minutes, one of two assigned sessions completed">
    <div className="cs-discover-mini-top"><span>YOUR CHILD’S PROGRESS</span><span className="cs-sample-chip">SAMPLE</span></div>
    <div className="cs-discover-child"><span className="cs-discover-avatar">JC</span><span><strong>Jordan Carter</strong><small>This week</small></span><Check size={18} /></div>
    <div className="cs-discover-parent-stats"><div><strong>32<small> min</small></strong><span>Active practice</span><svg viewBox="0 0 160 45" role="img" aria-label="Illustrative sample progress trend"><path d="M2 38L28 31L54 33L80 19L106 22L132 11L158 4" fill="none" stroke="#ffab69" strokeWidth="3" strokeLinecap="round" /></svg></div><div className="cs-discover-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="33" fill="none" stroke="#314b69" strokeWidth="7" /><circle cx="40" cy="40" r="33" fill="none" stroke="#ffab69" strokeWidth="7" strokeDasharray="104 208" transform="rotate(-90 40 40)" strokeLinecap="round" /></svg><strong>1 / 2</strong><span>Sessions done</span></div></div>
  </div>;
  return <div className="cs-discover-visual coach" aria-label="Sample coach view: eight players, eleven of sixteen assigned sessions completed">
    <div className="cs-discover-mini-top"><span>TEAM ACCOUNTABILITY</span><span className="cs-sample-chip">SAMPLE</span></div>
    <div className="cs-discover-team-total"><strong>11 <small>/ 16</small></strong><span>Assigned sessions<br />completed</span></div>
    <div className="cs-discover-team-grid">{[['JC',50],['MB',100],['EB',50],['RC',50],['NR',100],['AE',100],['LA',0],['SH',100]].map(([name, value]) => <div key={name}><span>{name}</span><div className="cs-discover-track"><i style={{width:`${value}%`}} /></div>{value === 100 ? <Check size={13} /> : <small>{value ? '1/2' : '0/2'}</small>}</div>)}</div>
  </div>;
}
const content = {
  player: ['Player', 'Make every session count.', 'Explore training, progress, and your streak.', Activity],
  parent: ['Parent', 'See the effort. Support the growth.', 'Follow your child’s work and assign a clear next step.', ShieldCheck],
  coach: ['Coach', 'One team. Clear accountability.', 'See who has trained and give every player a plan.', Users],
};
export function PreviewRoleCard({role, inviteCode}) {
  const [name,title,detail,Icon] = content[role];
  const target=role === 'player' ? `/preview/player${inviteCode ? '?invite='+encodeURIComponent(inviteCode) : ''}` : `/preview/hub?view=${role}`;
  return <Link className={`cs-discover-card ${role}`} to={target}>
    <div className="cs-discover-role"><Icon size={20} /><strong>For {name === 'Player' ? 'players' : name === 'Parent' ? 'parents' : 'coaches'}</strong></div>
    <PreviewVisual role={role} />
    <div className="cs-discover-card-copy"><h2>{title}</h2><p>{detail}</p><span>Explore {name === 'Player' ? 'CourtStreak' : name === 'Parent' ? 'Family Hub' : 'Team Hub'} <ArrowUpRight size={18} /></span></div>
  </Link>;
}
export default function PreviewWelcome({inviteCode}) {
  return <main className="cs-discover-page"><header className="cs-discover-header"><Link className="cs-discover-logo" to="/">Court<span>Streak</span></Link><Link to="/login">Log in <ChevronRight size={16} /></Link></header><section className="cs-discover-intro"><p>EXPLORE COURTSTREAK</p><h1>See the work.<br /><span>Know the progress.</span></h1><p>Pick your view. Get a feel for what CourtStreak can do for you.</p><span className="cs-discover-assurance"><ShieldCheck size={15} /> No account or payment needed · Fictional sample data</span></section><div className="cs-discover-cards">{['player','parent','coach'].map(role=><PreviewRoleCard key={role} role={role} inviteCode={inviteCode} />)}</div><footer className="cs-discover-footer"><p>Explore freely. Training, saving, and sending assignments stay locked in previews.</p>{inviteCode && <Link to={`/training-circles/join/${encodeURIComponent(inviteCode)}`}>Back to your invitation <ArrowUpRight size={16} /></Link>}</footer></main>;
}
export function SupporterPromo({role}) {
  const name=role==='parent' ? 'Family' : 'Team';
  return <section className="cs-supporter-promo"><div><p className="cs-discover-eyebrow">YOUR OWN {name.toUpperCase()} HUB</p><h2>{role === 'parent' ? 'Their work, in your corner.' : 'Every player. One clear picture.'}</h2><div className="cs-supporter-points"><span><Check size={17} /> {role === 'parent' ? 'Follow your child’s progress' : 'See team completion at a glance'}</span><span><Check size={17} /> Assign workouts with clear deadlines</span><span><Check size={17} /> Open individual scores and feedback</span></div><Link to={`/preview/hub?view=${role}`}>Explore {name} Hub <ArrowUpRight size={18} /></Link><small>Sample data · No account needed</small></div><PreviewVisual role={role} /></section>;
}
