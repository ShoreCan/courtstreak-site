import { createClient } from '@supabase/supabase-js';
import {createRecoverySession} from './recoverySession.mjs';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const recoverySession=createRecoverySession();
// The route is lazy loaded; capture verified recovery before its React effect.
const recoverySubscription=supabase?.auth.onAuthStateChange((event,session)=>recoverySession.observe(event,session));
if(import.meta.hot)import.meta.hot.dispose(()=>recoverySubscription?.data.subscription.unsubscribe());
