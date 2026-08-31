(()=>{'use strict';
const FINNHUB_KEY='tradecalc-finnhub-key';
let calculatorRetryDone=false;
let stockRetryDone=false;
let rateRetryTimer=0;

function key(){try{return String(localStorage.getItem(FINNHUB_KEY)||'').trim()}catch{return''}}
function text(id){return String(document.getElementById(id)?.textContent||'').trim()}
function clickOnce(id){const button=document.getElementById(id);if(!button||button.disabled)return false;button.click();return true}

function recoverCalculator(){
  if(calculatorRetryDone||!key())return;
  const button=document.getElementById('refreshLive');
  if(!button)return;
  const price=text('livePrice');
  const message=text('apiMessage');
  if(price&&price!=='—'){calculatorRetryDone=true;return;}
  if(/Kurs wird geladen|Live-Referenzkurs geladen|Cache aktiv/i.test(message))return;
  calculatorRetryDone=clickOnce('refreshLive')||calculatorRetryDone;
}

function recoverStocks(){
  if(stockRetryDone||!key())return;
  if(!document.getElementById('siRefresh'))return;
  stockRetryDone=clickOnce('siRefresh')||stockRetryDone;
}

function recoverForContext(){
  setTimeout(()=>{
    if(document.getElementById('refreshLive'))recoverCalculator();
    if(document.getElementById('siRefresh'))recoverStocks();
  },350);
}

function watchRateLimit(){
  const message=document.getElementById('apiMessage');
  if(!message)return;
  const schedule=()=>{
    if(rateRetryTimer||calculatorRetryDone)return;
    if(!/429|Finnhub-Limit erreicht/i.test(text('apiMessage')))return;
    rateRetryTimer=setTimeout(()=>{
      rateRetryTimer=0;
      calculatorRetryDone=false;
      recoverCalculator();
    },65000);
  };
  new MutationObserver(schedule).observe(message,{childList:true,subtree:true,characterData:true});
  schedule();
}

async function boot(){
  const api=window.SenSeiSApiPersistence;
  if(!api)return;
  try{
    const results=await (api.whenReady?.()||api.ready||Promise.resolve([]));
    const fin=Array.isArray(results)?results.find(x=>x?.key===FINNHUB_KEY):null;
    if(fin?.value&&fin.restored)recoverForContext();
  }catch{}
  window.addEventListener('senseis:api-settings-restored',event=>{
    const detail=event.detail||{};
    if(detail.key!==FINNHUB_KEY)return;
    if(detail.source==='restored'||detail.source==='cross-context'||detail.source==='storage'){
      calculatorRetryDone=false;
      stockRetryDone=false;
      recoverForContext();
    }
  });
  setTimeout(watchRateLimit,500);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
