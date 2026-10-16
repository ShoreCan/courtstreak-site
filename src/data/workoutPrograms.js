import {LAUNCH_DRILL_BY_KEY} from './drillCatalog.js';
export const WORKOUT_GOALS=[{key:'all',label:'All workouts'},{key:'control',label:'Foundations'},{key:'move-skills',label:'Crossovers'},{key:'game-ready',label:'Complete handle'}];
const base=[
 {key:'foundations',name:'Handle Foundations',level:'Foundation',goal:'control',focus:'Touch · Same-hand control · Crossovers',summary:'Build a reliable base using pounds, front V-dribbles, in-and-outs, and crossovers.',outcome:'Control the bounce with either hand before adding complex transfers.',keys:['right-hand-pound','left-hand-pound','front-v-right','front-v-left','in-out-right','in-out-left','stationary-crossover','right-hand-pound','left-hand-pound','stationary-crossover']},
 {key:'crossovers',name:'Crossover Control',level:'Developing',goal:'move-skills',focus:'Setup · Direction changes · Repeatable combinations',summary:'Progress from individual bounces into crossovers and two-action sequences.',outcome:'Link a controlled setup to a clear change of direction.',keys:['right-hand-pound','left-hand-pound','front-v-right','front-v-left','stationary-crossover','in-out-right','in-out-left','double-crossover','pound-cross-alternating','stationary-crossover']},
 {key:'complete',name:'Complete Handle',level:'Developing',goal:'game-ready',focus:'Both hands · Protected transfers · Clean sequences',summary:'Train the core same-hand skills and three protected hand-to-hand transfers.',outcome:'Use the same standards of control across the main ball-handling patterns.',keys:['right-hand-pound','left-hand-pound','in-out-right','in-out-left','stationary-crossover','stationary-between-legs','stationary-behind-back','double-crossover','pound-cross-alternating','crossover-between']},
];
export const WORKOUT_PROGRAMS=[10,20].flatMap(minutes=>base.map(plan=>{
 const keys=minutes===10?plan.keys:[...plan.keys,...plan.keys];
 return {key:`cs-core-${plan.key}-${minutes}`,name:plan.name,durationMinutes:minutes,level:plan.level,intensity:'Controlled',goal:plan.goal,accent:'control',focus:plan.focus,
 summary:plan.summary,outcome:plan.outcome,whyItMatters:minutes===20?'Two passes through the same skills. In the second pass, increase pace only if every receive stays controlled.':'The final repeated rounds let you apply the same control after the earlier work.',workSeconds:45,resetSeconds:15,totalDurationSeconds:minutes*60,
 drills:keys.map((key,index)=>{
 const d=LAUNCH_DRILL_BY_KEY[key];
 return {...d,key,category:'Ball Handling',phase:index%10<2?'Prepare':index%10<8?'Build':'Finish',instructions:d.steps.join(' ')+' '+d.repeat,cue:d.key_points[0],aiProfile:'manual',metricType:d.metric_type,metricLabel:d.metric_label,durationSeconds:45,transitionSeconds:15,duration:'45 sec work · 15 sec reset',order:index+1};
 })};
}));
export function getWorkoutProgram(key){return WORKOUT_PROGRAMS.find(p=>p.key===key)??null;}
export function isCurrentCustomWorkout(program){return Array.isArray(program?.drills)&&program.drills.every(d=>LAUNCH_DRILL_BY_KEY[d.sourceDrillKey||d.drill_key||d.key]);}
