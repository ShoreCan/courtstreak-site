// One fictional snapshot shared by all preview pages. Never written to accounts.
const NOW = new Date();
const weekStart = new Date(NOW); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
const dayKey = date => new Date(date).toLocaleDateString('en-CA');
const offsets = [22,18,14,12,10,8,7,5,3,2,1,0];
const workouts = offsets.map((offset, index) => {
  const date = new Date(NOW); date.setDate(date.getDate() - offset); date.setHours(0,0,0,0);
  if (offset === 0) date.setTime(Math.max(date.getTime(), NOW.getTime() - 60000));
  else date.setHours(16,0,0,0);
  return {id:`sample-workout-${index}`,completed_at:date.toISOString(),xp:45};
});
const weeklyWorkouts = workouts.filter(workout => new Date(workout.completed_at) >= weekStart).length;
export const PREVIEW_PROFILE = {
  first_name:'Jordan',last_name:'Carter',xp:615,level:7,
  training_streak:4,best_training_streak:4,weekly_goal:4,
  workouts_completed:workouts.length,weekly_workouts:weeklyWorkouts,
};
export const PREVIEW_STATS = {...PREVIEW_PROFILE,total_drill_attempts:workouts.length * 3,days_trained:workouts.length,level_progress_percent:15,xp_needed_for_next_level:85};
export const PREVIEW_TODAY_XP = workouts.filter(workout => dayKey(workout.completed_at) === dayKey(NOW)).reduce((sum, workout) => sum + workout.xp, 0);
export function previewSessions() {
  return workouts.flatMap((workout, index) => ['Right-Hand Pound','Left-Hand Pound','Crossovers'].map((name, drillIndex) => ({
    id:`${workout.id}-${drillIndex}`,drill_name:name,category:'Ball Handling',
    drill_key:['right-hand-pound','left-hand-pound','stationary-crossover'][drillIndex],
    duration_seconds:60,count_kind:drillIndex === 2 ? 'transfer' : 'bounce',count_rule_version:1,
    verification_mode:'manual',reps:30 + index * 2 + drillIndex,score:null,completed_at:workout.completed_at,
  })));
}

export const PREVIEW_ACHIEVEMENTS = [
  ['First Workout','Training','dumbbell',1,12,'Complete one full workout.'],
  ['Ten Workouts','Training','trophy',10,12,'Complete ten full workouts.'],
  ['Ball-Handling Builder','Ball Handling','basketball',25,12,'Complete 25 ball-handling workouts.'],
  ['Seven Straight','Consistency','flame',7,4,'Reach a seven-day training streak.'],
  ['Progress Starter','XP','zap',500,615,'Earn 500 total XP.'],
  ['Level Ten','Levels','award',10,7,'Reach player level ten.'],
  ['Challenge Contender','Challenge','target',5,0,'Complete five Circle challenges.'],
  ['Better Together','Training Circles','users',20,weeklyWorkouts,'Share twenty full workouts with a Circle.'],
].map(([name,category,icon,target,current,description],index) => {
  const unlocked=current >= target;
  return {achievement_id:index+1,achievement_key:`sample-award-${index}`,achievement_name:name,achievement_description:description,
    achievement_category:category,achievement_icon:icon,requirement_value:target,target_value:target,
    achievement_tier:unlocked?'bronze':'silver',current_value:current,progress_percent:Math.min(100,Math.round(current/target*100)),unlocked,
    display_order:index,tier:unlocked?'bronze':'silver',is_trophy:true,xp_reward:25,unlocked_at:unlocked?workouts.at(-1).completed_at:null};
});
export const PREVIEW_EARNED_ACHIEVEMENTS = PREVIEW_ACHIEVEMENTS.filter(item => item.unlocked).map(item => ({...item,id:item.achievement_id,name:item.achievement_name,description:item.achievement_description,category:item.achievement_category,icon:item.achievement_icon,featured:true}));
export const PREVIEW_CIRCLES = [{id:'sample-crew',name:'Sample Training Crew',circle_type:'Friends',is_private:true,weekly_workout_goal:20,membershipRole:'member'}];
const elapsedDays=Math.floor((NOW - weekStart)/86400000)+1;
export const PREVIEW_CIRCLE_ACTIVITY = [
  ...workouts.filter(workout => new Date(workout.completed_at) >= weekStart).map(workout => ({id:workout.id,userId:'jordan',name:'Jordan Player',workout:'Ball Handling',minutes:10,xp:workout.xp,completedAt:workout.completed_at})),
  ...['alex','casey'].flatMap((userId,userIndex) => Array.from({length:userIndex === 0 ? 6 : 4},(_,index) => {
    const date=new Date(weekStart); date.setDate(date.getDate() + index % elapsedDays);
    if (dayKey(date) === dayKey(NOW)) date.setTime(Math.max(date.getTime(),NOW.getTime()-60000-index*1000));
    else date.setHours(15,0,0,0);
    return {id:`sample-${userId}-${index}`,userId,name:userId === 'alex'?'Alex Player':'Casey Player',workout:'Ball Handling',minutes:10,xp:45,completedAt:date.toISOString()};
  })),
].sort((a,b) => new Date(b.completedAt)-new Date(a.completedAt));
const leaders=['alex','jordan','casey'].map(user_id => {
  const activity=PREVIEW_CIRCLE_ACTIVITY.filter(item => item.userId === user_id);
  return {user_id,first_name:{alex:'Alex',jordan:'Jordan',casey:'Casey'}[user_id],last_name:'Player',weekly_training_xp:activity.reduce((sum,item)=>sum+item.xp,0),weekly_workouts:activity.length};
}).sort((a,b)=>b.weekly_training_xp-a.weekly_training_xp);
export const PREVIEW_CIRCLE_STATS = {'sample-crew':{weeklyWorkouts:PREVIEW_CIRCLE_ACTIVITY.length,weeklyTrainingXp:PREVIEW_CIRCLE_ACTIVITY.reduce((sum,item)=>sum+item.xp,0),memberCount:3,pendingChallenges:1,leaders}};
const todayMembers=new Set(PREVIEW_CIRCLE_ACTIVITY.filter(item=>dayKey(item.completedAt)===dayKey(NOW)).map(item=>item.userId));
let pulseDays=0;
for(let offset=0;offset<elapsedDays;offset++) { const date=new Date(NOW);date.setDate(date.getDate()-offset); if(new Set(PREVIEW_CIRCLE_ACTIVITY.filter(item=>dayKey(item.completedAt)===dayKey(date)).map(item=>item.userId)).size<2)break; pulseDays++; }
export const PREVIEW_CIRCLE_PULSE={current_streak:pulseDays,active_members_today:todayMembers.size,required_members_today:2};
const consistencyLeader=leaders.map(leader=>({...leader,days:new Set(PREVIEW_CIRCLE_ACTIVITY.filter(item=>item.userId===leader.user_id).map(item=>dayKey(item.completedAt))).size})).sort((a,b)=>b.days-a.days)[0];
export const PREVIEW_CIRCLE_AWARDS=[
  {award_key:'workhorse',winner_user_id:leaders[0].user_id,metric_label:`${leaders[0].weekly_workouts*10} sample minutes`},
  {award_key:'consistency',winner_user_id:consistencyLeader.user_id,metric_label:`${consistencyLeader.days} sample training days`},
];
