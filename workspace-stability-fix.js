(()=>{'use strict';
const MODULE_URL='./tradingview-chart-left.js?v=3-workspace-stable';
let moduleLoading=false;
let moduleReloads=0;
let widgetRetries=0;
let mountSeenAt=0;

function stockSelect(){return document.getElementById('stock')||document.getElementById('stockFilter')}
function liveCard(){return document.querySelector('.card.live')}
function marketRow(){return document.getElementById('senseisMarketRow')}
function chartCard(){return document.querySelector('.senseis-tv-card')}
function chartMount(){return document.getElementById('senseisTvMount')}

function removeBrokenWorkspace(row,live){
  if(!row)return;
  try{
    if(live&&row.contains(live)&&row.parentNode)row.parentNode.insertBefore(live,row);
    row.remove();
  }catch{}
}

function reloadChartModule(){
  if(moduleLoading||moduleReloads>=4)return;
  moduleLoading=true;
  moduleReloads+=1;
  const script=document.createElement('script');
  script.src=MODULE_URL+'&retry='+moduleReloads+'&t='+Date.now();
  script.async=false;
  script.onload=()=>{moduleLoading=false;setTimeout(ensureWorkspace,120)};
  script.onerror=()=>{moduleLoading=false;setTimeout(ensureWorkspace,900)};
  document.body.appendChild(script);
}

function retryWidget(mount){
  if(!mount||widgetRetries>=3)return;
  const hasIframe=!!mount.querySelector('iframe');
  if(hasIframe){widgetRetries=0;mountSeenAt=Date.now();return;}
  if(!mountSeenAt)mountSeenAt=Date.now();
  if(Date.now()-mountSeenAt<8500)return;
  widgetRetries+=1;
  mountSeenAt=Date.now();
  mount.innerHTML='';
  const select=stockSelect();
  if(select)select.dispatchEvent(new Event('change',{bubbles:true}));
}

function ensureWorkspace(){
  const live=liveCard();
  if(!live)return;
  const row=marketRow();
  const card=chartCard();
  const mount=chartMount();

  const healthy=!!row&&!!card&&!!mount&&row.contains(live)&&row.contains(card);
  if(!healthy){
    removeBrokenWorkspace(row,live);
    reloadChartModule();
    return;
  }

  // Never allow another late module to move the Live card out of the workspace.
  if(live.parentElement!==row)row.insertBefore(live,row.firstChild);
  retryWidget(mount);
}

function boot(){
  ensureWorkspace();
  const observer=new MutationObserver(()=>requestAnimationFrame(ensureWorkspace));
  observer.observe(document.body,{subtree:true,childList:true});
  nativeInterval=setInterval(ensureWorkspace,1400);
  window.addEventListener('pageshow',()=>setTimeout(ensureWorkspace,100));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(ensureWorkspace,100)});
}

let nativeInterval=0;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
