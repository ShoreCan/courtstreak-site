// Remember only a verified SDK recovery event, in memory, before lazy routes
// mount. A regular signed-in session never creates password-recovery proof.
export function createRecoverySession({clock=()=>Date.now(),ttl=15*60*1000}={}){
 let proof=null;const listeners=new Set();
 const valid=()=>!!proof&&clock()<proof.until;
 const notify=()=>listeners.forEach(listener=>listener(valid()));
 const clear=()=>{proof=null;notify();};
 return {
  observe(event,session){
   if(event==='PASSWORD_RECOVERY'&&session?.user?.id&&session.access_token){proof={id:session.user.id,token:session.access_token,until:clock()+ttl};notify();return;}
   if(event==='SIGNED_OUT'||(proof&&session?.user?.id&&session.user.id!==proof.id)){clear();return;}
   if(proof&&event==='TOKEN_REFRESHED'&&session?.user?.id===proof.id&&session.access_token){proof.token=session.access_token;notify();return;}
   if(proof&&event==='SIGNED_IN'&&session?.access_token!==proof.token)clear();
  },
  has(session){return valid()&&(!session||(session.user?.id===proof.id&&session.access_token===proof.token));},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  clear,
 };
}
