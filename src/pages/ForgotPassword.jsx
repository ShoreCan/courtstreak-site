import React,{useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../lib/supabaseClient.js';
import {authErrorMessage} from '../lib/accountFlow.mjs';
import AuthShell from '../components/AuthShell.jsx';

export default function ForgotPassword(){
 const [email,setEmail]=useState(''),[error,setError]=useState(''),[sent,setSent]=useState(false),[loading,setLoading]=useState(false),pending=useRef(false);
 async function submit(event){
  event.preventDefault();if(pending.current)return;setError('');
  if(!supabase){setError('Password reset is temporarily unavailable. Please try again shortly.');return;}
  pending.current=true;setLoading(true);
  try{
   const redirectTo=new URL(import.meta.env.BASE_URL+'reset-password',window.location.origin).href;
   const result=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo});
   if(result.error)throw result.error;
   setSent(true);
  }catch(error){setError(authErrorMessage(error,'We couldn’t send the link. Please try again.'));}
  finally{pending.current=false;setLoading(false);}
 }
 return <AuthShell title={sent?'Check your inbox.':'Reset your password.'}>
  {sent?<div className="cs-auth-simple-confirm" role="status"><p>If an account uses that email, a reset link is on its way.</p><Link className="cs-auth-simple-action" to="/login">Back to login</Link><button type="button" className="cs-auth-simple-link" onClick={()=>setSent(false)}>Use a different email</button></div>:<form onSubmit={submit} aria-busy={loading}>
   <p className="cs-auth-simple-note">We’ll email you a reset link.</p>
   <label className="cs-auth-simple-field"><span>Email</span><input name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" disabled={loading}/></label>
   {error&&<p className="cs-auth-simple-error" role="alert">{error}</p>}
   <button type="submit" disabled={loading}>{loading?'Sending…':'Send reset link'}</button>
  </form>}
  {!sent&&<p className="cs-auth-simple-footer"><Link to="/login">Back to login</Link></p>}
 </AuthShell>;
}
