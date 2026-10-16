import { supabase } from './supabaseClient.js';
import { countKind } from './trainingMetrics.js';

// Context is self-reported, separate from server-awarded XP and completion.
export async function saveResultContext(sessionId, drill, durationSeconds) {
  if (!sessionId || !supabase) return false;
  try {
    const { error } = await supabase.rpc('record_training_result_context', {
      p_session_id: String(sessionId),
      p_drill_key: drill.drill_key || drill.sourceDrillKey || drill.key,
      p_duration_seconds: durationSeconds,
      p_count_kind: countKind(drill),
      p_count_rule_version: 1,
    });
    return !error;
  } catch { return false; }
}

export async function loadResultContexts(userId, sessions) {
  try {
    const rows=[];
    for(let offset=0;;offset+=500) {
      const {data,error}=await supabase.from('training_result_context').select('session_id, drill_key, duration_seconds, count_kind, count_rule_version, verification_mode').eq('user_id', userId).order('session_id').range(offset,offset+499);
      if(error)return {sessions,available:false};
      rows.push(...(data||[]));if(!data||data.length<500)break;
    }
    const contexts = new Map(rows.map(item => [String(item.session_id), item]));
    return { sessions: sessions.map(session => ({ ...session, ...(contexts.get(String(session.id)) || {}) })), available: true };
  } catch { return { sessions, available: false }; }
}

export async function loadTrainingHistory(userId, since) {
  const data=[];
  for(let offset=0;;offset+=500) {
    let query=supabase.from('training_sessions').select('*').eq('user_id',userId).order('completed_at',{ascending:true}).order('id',{ascending:true});
    if(since)query=query.gte('completed_at',since);
    const page=await query.range(offset,offset+499);
    if(page.error)return {data:null,error:page.error};
    data.push(...(page.data||[]));
    if(!page.data||page.data.length<500)return {data,error:null};
  }
}
