import React,{useRef,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {supabase} from '../lib/supabaseClient.js';
import {accountContext,accountRole,contextQuery,authErrorMessage,explicitAccountDestination} from '../lib/accountFlow.mjs';
import AuthShell,{PasswordField} from '../components/AuthShell.jsx';

export default function CreateAccount(){
 const navigate=useNavigate(),[params]=useSearchParams(),context=accountContext(params);
 const [form,setForm]=useState({firstName:'',lastName:'',email:params.get('email')?.trim().slice(0,254)||'',password:'',confirmPassword:'',accountType:accountRole(params.get('role'))});
 const [error,setError]=useState(''),[loading,setLoading]=useState(false),[sent,setSent]=useState(false),pending=useRef(false);
 const update=event=>setForm(value=>({...value,[event.target.name]:event.target.value}));
 async function submit(event){
  event.preventDefault();if(pending.current)return;setError('');
  if(!supabase){setError('Account creation is temporarily unavailable. Please try again shortly.');return;}
  if(!form.firstName.trim()||!form.lastName.trim()){setError('Enter your first and last name.');return;}
  if(form.password.length<8){setError('Use at least 8 characters for your password.');return;}
  if(form.password!==form.confirmPassword){setError('Your passwords don’t match.');return;}
  pending.current=true;setLoading(true);
  try{
   const redirectTo=new URL(import.meta.env.BASE_URL+'login'+contextQuery(context),window.location.origin).href;
   const result=await supabase.auth.signUp({email:form.email.trim().toLowerCase(),password:form.password,options:{emailRedirectTo:redirectTo,data:{first_name:form.firstName.trim(),last_name:form.lastName.trim(),full_name:form.firstName.trim()+' '+form.lastName.trim(),account_type:form.accountType}}});
   if(result.error)throw result.error;
   if(result.data?.session){navigate(explicitAccountDestination(context)||'/hub',{replace:true});return;}
   setSent(true);setForm(value=>({...value,password:'',confirmPassword:''}));
  }catch(error){setError(authErrorMessage(error,'We couldn’t create your account. Please try again or log in.'));}
  finally{pending.current=false;setLoading(false);}
 }
 return <AuthShell title={sent?'Check your inbox.':'Join CourtStreak.'} variant="join" accountRole={form.accountType}>
  {sent?<div className="cs-auth-simple-confirm" role="status"><p>Open the confirmation link in your email to continue.</p><Link className="cs-auth-simple-action" to={'/login'+contextQuery(context)}>Continue to login</Link><button type="button" className="cs-auth-simple-link" onClick={()=>setSent(false)}>Use a different email</button></div>:<>
   <form onSubmit={submit} aria-busy={loading}><fieldset disabled={loading}>
    <label className="cs-auth-simple-field"><span>Account for</span><select name="accountType" value={form.accountType} onChange={update}><option value="player">Player</option><option value="parent">Parent</option><option value="coach">Coach / trainer</option></select></label>
    <div className="cs-auth-simple-note cs-auth-role-help">{form.accountType==='player'?'Use the player’s name.':'Use your own name.'}{form.accountType!=='player'&&<details><summary>How player accounts work</summary><p>Each player has a separate Player account and sign-in email. They approve your access to their progress after signup.</p></details>}</div>
    <div className="cs-auth-simple-grid"><label className="cs-auth-simple-field"><span>First name</span><input name="firstName" autoComplete="given-name" required value={form.firstName} onChange={update}/></label><label className="cs-auth-simple-field"><span>Last name</span><input name="lastName" autoComplete="family-name" required value={form.lastName} onChange={update}/></label></div>
    <label className="cs-auth-simple-field"><span>Email</span><input name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={form.email} onChange={update} placeholder="you@example.com"/></label>
    <PasswordField name="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={update} placeholder="At least 8 characters"/>
    <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" minLength={8} required value={form.confirmPassword} onChange={update}/>
   </fieldset>{error&&<p className="cs-auth-simple-error" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading?'Creating account…':'Create account'}</button></form>
   <p className="cs-auth-simple-note" style={{marginTop:16}}>Free account. Player training requires membership.</p>
   <p className="cs-auth-simple-footer">Already registered? <Link to={'/login'+contextQuery(context)}>Log in</Link></p>
   <p className="cs-auth-simple-footer"><Link to={context.invite?'/preview?invite='+encodeURIComponent(context.invite):'/preview'}>Explore before joining</Link></p>
  </>}
 </AuthShell>;
}
