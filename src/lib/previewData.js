export const PREVIEW_PROFILE = {
  first_name: 'Jordan', last_name: 'Player', xp: 760, level: 8,
  training_streak: 4, best_training_streak: 9, weekly_goal: 4,
  workouts_completed: 12, weekly_workouts: 2,
};
export const PREVIEW_STATS = { ...PREVIEW_PROFILE, total_drill_attempts: 36, days_trained: 12, level_progress_percent: 60, xp_needed_for_next_level: 40 };
export function previewSessions() {
  return Array.from({ length: 12 }, (_, day) => {
    const date = new Date(); date.setDate(date.getDate() - (11 - day) * 2); date.setHours(16, 0, 0, 0);
    return ['Right-Hand Pound', 'Left-Hand Pound', 'Crossovers'].map((name, index) => ({
      id: `sample-${day}-${index}`, drill_name: name, category: 'Ball Handling',
      reps: 30 + day * 2 + index, score: null, completed_at: date.toISOString(),
    }));
  }).flat();
}

// Representative fictional awards, rendered by the actual collection page.
// The private production achievement catalog was not included in the source export.
export const PREVIEW_ACHIEVEMENTS = [
  ['First Workout','Training','dumbbell',1,12,true],
  ['Ten Workouts','Training','trophy',10,12,true],
  ['Ball-Handling Builder','Ball Handling','basketball',25,12,false],
  ['Seven Straight','Consistency','flame',7,4,false],
  ['Progress Starter','XP','zap',500,760,true],
  ['Level Ten','Levels','award',10,8,false],
  ['Challenge Contender','Challenge','target',5,2,false],
  ['Better Together','Training Circles','users',5,2,false],
].map(([name,category,icon,target,current,unlocked],index)=>({
  achievement_id:index+1, achievement_key:`sample-award-${index}`, achievement_name:name,
  achievement_description:`Sample milestone: reach ${target} ${category.toLowerCase()} progress.`,
  achievement_category:category, achievement_icon:icon, requirement_value:target, target_value:target, achievement_tier:unlocked?"bronze":"silver", current_value:current,
  progress_percent:Math.min(100,Math.round(current/target*100)), unlocked,
  display_order:index, tier:unlocked?'bronze':'silver', is_trophy:true, xp_reward:25,
  unlocked_at:unlocked?'2026-10-10T16:00:00Z':null,
}));
export const PREVIEW_EARNED_ACHIEVEMENTS = PREVIEW_ACHIEVEMENTS.filter(a=>a.unlocked).map(a=>({
  ...a,id:a.achievement_id,name:a.achievement_name,description:a.achievement_description,
  category:a.achievement_category,icon:a.achievement_icon,featured:true,
}));
export const PREVIEW_CIRCLES = [{id:'sample-crew',name:'Sample Training Crew',circle_type:'Friends',is_private:true,weekly_workout_goal:20,membershipRole:'member'}];
export const PREVIEW_CIRCLE_STATS = {'sample-crew':{weeklyWorkouts:12,pendingChallenges:1,leaders:[
  {user_id:'alex',first_name:'Alex',last_name:'Player',weekly_training_xp:220},
  {user_id:'jordan',first_name:'Jordan',last_name:'Player',weekly_training_xp:180},
  {user_id:'casey',first_name:'Casey',last_name:'Player',weekly_training_xp:160},
]}};
