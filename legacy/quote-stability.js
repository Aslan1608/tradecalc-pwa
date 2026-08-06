(()=>{'use strict';
const PROFILE_KEY='tradecalc-custom-stocks';
const STABLE_PREFIX='senseis-last-good-quote-';
const AUTO_KEY='senseis-auto-refresh-default-v1';
const DAX=new Set(['ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON','DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1','HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM','RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL']);
const nativeFetch=window.fetch.bind(window);
let lastRecovery=0;

function profiles(){try{const x=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function profile(ticker){return profiles().find(x=>x.ticker===ticker)}
function mappedTicker(ticker){const p=profile(ticker);if(p?.apiTicker)return p.apiTicker;if(p?.index==='DAX'||DAX.has(ticker))return ticker+'.DE';return ticker}
function validQuote(q){return q&&Number.isFinite(Number(q.c))&&Number(q.c)>0}
function coreCacheKey(t){return'tradecalc-quote-'+t}
function stableCacheKey(t){return STABLE_PREFIX+t}
function parse(raw){try{return JSON.parse(raw||'null')}catch{return null}}
function readLastGood(ticker){const stable=parse(localStorage.getItem(stableCacheKey(ticker)));if(stable&&validQuote(stable.data))return stable;const core=parse(localStorage.getItem(coreCacheKey(ticker)));if(core&&validQuote(core.data))return core;return null}
function writeLastGood(ticker,data){const entry={data,time:Date.now(),source:'finnhub'};try{localStorage.setItem(stableCacheKey(ticker),JSON.stringify(entry));localStorage.setItem(coreCacheKey(ticker),JSON.stringify(entry))}catch{}return entry}
function emit(detail){try{window.dispatchEvent(new CustomEvent('senseis:quote-status',{detail}))}catch{}}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function rewriteInput(input,url){return typeof input==='string'?url.toString():new Request(url.toString(),input)}
function cachedResponse(entry){const data={...entry.data,_senseisStale:true,_senseisCachedAt:entry.time};return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json','X-SenSeiS-Quote':'stale-cache'}})}

window.__senseisFetchMap=true;
window.fetch=async(input,init)=>{
  let raw='';try{raw=typeof input==='string'?input:input.url}catch{return nativeFetch(input,init)}
  if(!raw.includes('finnhub.io/api/v1/')||!raw.includes('symbol='))return nativeFetch(input,init);
  let url;try{url=new URL(raw)}catch{return nativeFetch(input,init)}
  const displayTicker=url.searchParams.get('symbol')||'';
  const apiTicker=mappedTicker(displayTicker);
  if(apiTicker&&apiTicker!==displayTicker)url.searchParams.set('symbol',apiTicker);
  const rewritten=rewriteInput(input,url);
  if(!url.pathname.endsWith('/quote'))return nativeFetch(rewritten,init);

  let lastResponse=null,lastError=null,reason='NO_DATA';
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await nativeFetch(rewritten,init);lastResponse=response;
      if(response.ok){
        const data=await response.clone().json().catch(()=>null);
        if(validQuote(data)){
          const entry=writeLastGood(displayTicker,data);
          emit({state:'fresh',ticker:displayTicker,apiTicker,cachedAt:entry.time,attempt:attempt+1});
          return response;
        }
        reason='NO_DATA';
        if(attempt===0){await sleep(650);continue}
      }else{
        reason='HTTP_'+response.status;
        if(response.status===429||response.status<500)break;
        if(attempt===0){await sleep(850);continue}
      }
    }catch(error){
      lastError=error;reason='NETWORK';
      if(attempt===0){await sleep(850);continue}
    }
  }

  const cached=readLastGood(displayTicker);
  if(cached){
    emit({state:'stale',ticker:displayTicker,apiTicker,cachedAt:cached.time,reason});
    return cachedResponse(cached);
  }
  emit({state:'error',ticker:displayTicker,apiTicker,reason});
  if(lastResponse)return lastResponse;
  throw lastError||new Error(reason);
};

function el(id){return document.getElementById(id)}
function formatTime(ts){try{return new Date(ts).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch{return'—'}}
function applyStatus(detail){setTimeout(()=>{
  const message=el('apiMessage'),time=el('liveTime');
  if(detail.state==='fresh'){
    if(message){message.textContent='Live-Referenzkurs geladen · stabile Aktualisierung aktiv.';message.className='api-note oktext'}
  }else if(detail.state==='stale'){
    if(message){message.textContent='Letzter gültiger Kurs angezeigt · Finnhub momentan nicht erreichbar ('+detail.reason+'). Automatischer Neuversuch aktiv.';message.className='api-note warntext'}
    if(time)time.textContent=formatTime(detail.cachedAt)+' · Cache';
  }else if(detail.state==='error'&&message){
    message.textContent='Kurs aktuell nicht verfügbar ('+detail.reason+'). Die App versucht es automatisch erneut; der API-Key bleibt gespeichert.';message.className='api-note warntext';
  }
},80)}
window.addEventListener('senseis:quote-status',e=>applyStatus(e.detail||{}));

function hasKey(){return!!localStorage.getItem('tradecalc-finnhub-key')}
function priceMissing(){const t=el('livePrice')?.textContent?.trim();return!t||t==='—'}
function recover(force=false){
  if(!hasKey()||document.visibilityState==='hidden')return;
  const now=Date.now();if(!force&&now-lastRecovery<12000)return;lastRecovery=now;
  const refresh=el('refreshLive');if(refresh&&!refresh.disabled)refresh.click();
}
function scheduleRecovery(delay=900,force=false){setTimeout(()=>{if(priceMissing()||force)recover(force)},delay)}

function init(){
  const stock=el('stock'),auto=el('autoRefresh');
  if(auto&&hasKey()&&!localStorage.getItem(AUTO_KEY)){
    auto.checked=true;auto.dispatchEvent(new Event('change',{bubbles:true}));localStorage.setItem(AUTO_KEY,'1');
  }
  if(stock)stock.addEventListener('change',()=>scheduleRecovery(1200,false));
  window.addEventListener('online',()=>scheduleRecovery(500,true));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRecovery(700,true)});
  scheduleRecovery(1300,false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();