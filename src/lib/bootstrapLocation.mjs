export function restoreAppLocation(win,base='/courtstreak-site'){
 try{
  const storage=win.sessionStorage,value=storage.getItem('courtstreakRedirect');
  if(!value)return false;
  storage.removeItem('courtstreakRedirect');
  if(!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return false;
  const url=new URL(value,win.location.origin);
  if(url.origin!==win.location.origin)return false;
  win.history.replaceState(null,'',base.replace(/\/$/,'')+url.pathname+url.search+url.hash);
  return true;
 }catch{return false;}
}
if(typeof window!=='undefined')restoreAppLocation(window);
