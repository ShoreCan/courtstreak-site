import { supabase } from './supabaseClient.js';
import {getHubAccount} from '../hub/api.js';

export function normalizeStats(data) { return Array.isArray(data) ? data[0] ?? null : data ?? null; }

export async function requireTrainingAccess() {
  if (!supabase) throw new Error('Training is unavailable. Please reload or contact support.');
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error('Please log in before saving training.');
  const account=await getHubAccount();
  if(account.role!=='player')throw new Error('Players record their own training. Use your Team or Family Hub to view progress.');
  const membership = await supabase.rpc('has_active_courtstreak_membership');
  if (membership.error) throw new Error('We could not verify your membership. Try again.');
  if (!membership.data) throw new Error('An active membership is required to record training.');
  return data.user;
}
