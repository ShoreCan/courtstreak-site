import { getDrillVideo } from '../data/drillVideos.js';
import React, { useState } from 'react';
import { DRILL_INSTRUCTIONS } from '../data/drillInstructions.js';

export function repRule(drill = {}) {
  if (drill.drill_key === 'two-ball-power-pounds') return 'One rep is a simultaneous pair of controlled bounces, with both balls returning to your hands.';
  if (drill.drill_key === 'two-ball-alternating') return 'One rep is a full right-left pair of controlled bounces. Both balls must return securely to their hands.';
  const text = `${drill.aiProfile || ''} ${drill.metricLabel || drill.metric_label || ''}`.toLowerCase();
  if (/combo|sequence|chain|freestyle|decision|pound-cross|pound-between|pound-behind/.test(text)) {
    return 'One rep is the entire named sequence, ending with the ball under control. Reset after a mishandle; do not count an unfinished sequence.';
  }
  if (/between|behind|crossover/.test(`${text} ${drill.name || ''}`.toLowerCase())) {
    return 'Count only the named transfer: one floor bounce followed by a secure receive in the opposite hand. Reset dribbles, a pass without a bounce, and mishandles do not count.';
  }
  return 'Count each controlled floor bounce that returns securely to your hand. Do not count loose-ball bounces or mishandles.';
}

export default function DrillGuide({ drill, showVideo = true }) {
  const [failedVideo, setFailedVideo] = useState(false);
  const demoVideo = getDrillVideo(drill);
  const instructions = drill.instructions || DRILL_INSTRUCTIONS[drill.drill_key] || drill.short_description || '';
  const twoBalls = /two.ball/i.test(drill.drill_key || drill.name);
  const markers = /cone|slalom/i.test(drill.drill_key || drill.name);
  const points = Array.isArray(drill.key_points) ? drill.key_points : [drill.cue].filter(Boolean);
  const steps = instructions.split(/(?<=[.!?])\s+/).filter(Boolean);
  return <section className="cs-drill-guide" aria-label={`${drill.name} instructions`}>
    {showVideo && demoVideo && !failedVideo ? <video key={demoVideo} controls playsInline preload="metadata" src={demoVideo} onError={() => setFailedVideo(true)} aria-label={`${drill.name} demonstration`} /> : null}
    <h3>Set up</h3>
    <p>Use {twoBalls ? 'two basketballs' : 'one basketball'}{markers ? ' and safe floor markers' : ''} and enough clear space for the movement. Start balanced with your knees bent and chest up. Read the sequence before starting the timer.</p>
    <h3>How to perform it</h3>
    <ol>{steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
    {points.length > 0 && <><h3>Coaching cues</h3><ul>{points.map((point, index) => <li key={index}>{point}</li>)}</ul></>}
    <h3>What counts</h3><p>{repRule(drill)}</p>
    <p className="cs-guide-note">Keep your eyes up, stay balanced, and prioritize clean control over speed.{failedVideo ? ' The video could not load; the written instructions remain available.' : ''}</p>
  </section>;
}
