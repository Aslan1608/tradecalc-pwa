(()=>{'use strict';
const LAST_ONLINE_KEY='senseis-last-online-at';
function rememberOnline(){try{localStorage.setItem(LAST_ONLINE_KEY,String(Date.now()))}catch{}}
function ageLabel(){
  try{
    const saved=Number(localStorage.getItem(LAST_ONLINE_KEY)||0);
    if(!saved)return'letzter Online-Stand unbekannt';
    const minutes=Math.max(1,Math.round((Date.now()-saved)/60000));
    if(minutes<60)return`letzter Online-Stand vor ${minutes} Min.`;
    const hours=Math.round(minutes/60);
    if(hours<48)return`letzter Online-Stand vor ${hours} Std.`;
    return`letzter Online-Stand vor ${Math.round(hours/24)} Tagen`;
  }catch{return'letzter Online-Stand unbekannt'}
}
function ensureBanner(){
  let banner=document.getElementById('senseisOfflineBanner');
  if(banner)return banner;
  banner=document.createElement('div');
  banner.id='senseisOfflineBanner';
  banner.setAttribute('role','status');
  banner.style.cssText='position:fixed;left:12px;right:12px;top:max(10px,env(safe-area-inset-top));z-index:99999;padding:10px 12px;border:1px solid rgba(255,159,10,.5);border-radius:12px;background:rgba(30,18,4,.96);color:#ffd08a;font:700 11px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);display:none';
  document.body.appendChild(banner);
  return banner;
}
function renderNetworkState(){
  const banner=ensureBanner();
  if(navigator.onLine){banner.style.display='none';rememberOnline();return;}
  banner.textContent=`Offline-Modus · ${ageLabel()}. Kurse und News können veraltet sein.`;
  banner.style.display='block';
}
async function register(){
  if(!('serviceWorker'in navigator))return;
  try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});}catch(error){console.warn('SenSeiS service worker registration failed',error)}
}
function boot(){rememberOnline();renderNetworkState();register();window.addEventListener('online',renderNetworkState);window.addEventListener('offline',renderNetworkState)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
