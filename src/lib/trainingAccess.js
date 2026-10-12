import { supabase } from './supabaseClient.js';

export function normalizeStats(data) { return Array.isArray(data) ? data[0] ?? null : data ?? null; }

export async function requireTrainingAccess() {
  if (!supabase) throw new Error('Training is unavailable. Please reload or contact support.');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error('Please log in before saving training.');
  const membership = await supabase.rpc('has_active_courtstreak_membership');
  if (membership.error) throw new Error('We could not verify your membership. Try again.');
  if (!membership.data) throw new Error('An active membership is required to record training.');
  return data.user;
}
