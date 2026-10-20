// Preserve the requested tracker check through login, within the existing gate.
const path='/lab/drill/right-hand-pound/session';
const modes=new Set(['iphone-vision-test','recorded-profile','pose-execution','recording-load']);
export function safeTrackerReturn(value){
  if(typeof value!=='string'||!value.startsWith(path+'?')||/[\\\r\n]/.test(value))return null;
  try{const url=new URL(value,'https://courtstreak.invalid');const all=url.searchParams.getAll('mode');
    return url.origin==='https://courtstreak.invalid'&&url.pathname===path&&all.length===1&&modes.has(all[0])?`${path}?mode=${all[0]}`:null;
  }catch{return null;}
}
