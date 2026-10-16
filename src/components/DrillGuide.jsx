import { LAUNCH_DRILL_BY_KEY } from '../data/drillCatalog.js';
import '../drill-cycle.css';
// CourtStreak quality update v1
import { getDrillVideo } from '../data/drillVideos.js';
import React, { useState } from 'react';
import { DRILL_INSTRUCTIONS } from '../data/drillInstructions.js';

export { repRule } from '../lib/trainingMetrics.js';
import { repRule } from '../lib/trainingMetrics.js';

export default function DrillGuide({ drill, showVideo = true }) {
  const [failedVideo, setFailedVideo] = useState(false);
  const spec = LAUNCH_DRILL_BY_KEY[drill.drill_key || drill.sourceDrillKey || drill.key];
  const demoVideo = getDrillVideo(drill);
  const instructions = drill.instructions || DRILL_INSTRUCTIONS[drill.drill_key] || drill.short_description || '';
  const twoBalls = /two.ball/i.test(drill.drill_key || drill.name);
  const markers = /cone|slalom/i.test(drill.drill_key || drill.name);
  const points = Array.isArray(drill.key_points) ? drill.key_points : [drill.cue].filter(Boolean);
  const steps = spec?.steps || instructions.split(/(?<=[.!?])\s+/).filter(Boolean);
  return <section className="cs-drill-guide" aria-label={`${drill.name} instructions`}>
    {showVideo && demoVideo && !failedVideo ? <video key={demoVideo} controls playsInline preload="metadata" src={demoVideo} onError={() => setFailedVideo(true)} aria-label={`${drill.name} demonstration`} /> : null}
    <h3>What counts</h3><p>{spec?.rep_rule || repRule(drill)}</p>
    {spec && <div className="cs-drill-cycle"><span>ONE REP</span><ol aria-label="One rep, in order">{spec.actions.map((a,index)=><li key={index}><strong>{a.move==='front-v'?'V-dribble':a.move==='in-out'?'In-and-out':a.move==='cross'?'Crossover':a.move==='between'?'Between the legs':a.move==='behind'?'Behind the back':'Pound'}</strong><small>{a.from} → {a.to}</small></li>)}</ol><strong>Then repeat</strong><p>{spec.repeat}</p></div>}
    <details className="cs-guide-more"><summary>Technique & setup</summary>
    <h3>Set up</h3>
    <p>Use {twoBalls ? 'two basketballs' : 'one basketball'}{markers ? ' and safe floor markers' : ''} and enough clear space for the movement. Start balanced with your knees bent and chest up. Read the sequence before starting the timer.</p>
    <h3>How to perform it</h3>
    <ol>{steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
    {points.length > 0 && <><h3>Coaching cues</h3><ul>{points.map((point, index) => <li key={index}>{point}</li>)}</ul></>}
    <p className="cs-guide-note">Keep your eyes up, stay balanced, and prioritize clean control over speed.{failedVideo ? ' The video could not load; the written instructions remain available.' : ''}</p>
    </details>
  </section>;
}
