(()=>{'use strict';
const DAX=new Set(['ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON','DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1','HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM','RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL']);
const FEED_KEY='senseis-market-feed-url';
const FINNHUB_KEY='tradecalc-finnhub-key';
let runId=0;
let runningSymbol='';
let completedSymbol='';
let failedSymbol='';

function $(id){return document.getElementById(id)}
function symbol(){return String($('siSymbol')?.value||'').trim().toUpperCase().replace(/\.DE$/,'')}
function feedUrl(){return String(localStorage.getItem(FEED_KEY)||'').trim().replace(/\/$/,'')}
function finnhubKey(){return String(localStorage.getItem(FINNHUB_KEY)||'').trim()}
function number(v){if(v==null||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function jsonp(url,timeout=25000){return new Promise((resolve,reject)=>{const cb='__senseisFinRecovery_'+Date.now()+'_'+Math.random().toString(36).slice(2);const s=document.createElement('script');const timer=setTimeout(()=>done(new Error('SEC_TIMEOUT')),timeout);function done(err,data){clearTimeout(timer);try{delete window[cb]}catch{}s.remove();err?reject(err):resolve(data)}window[cb]=d=>done(null,d);s.onerror=()=>done(new Error('SEC_NETWORK'));s.src=url+(url.includes('?')?'&':'?')+'callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s)})}
async function getJson(url){const r=await fetch(url,{cache:'no-store'});const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{}if(!r.ok)throw new Error(data?.error||('HTTP_'+r.status));if(data?.error)throw new Error(data.error);return data}
function validRows(data){const rows=Array.isArray(data?.annual)?data.annual:[];return rows.filter(x=>number(x.revenue)!=null||number(x.ebitdaApprox)!=null||number(x.operatingIncome)!=null||number(x.netIncome)!=null).sort((a,b)=>Number(a.year)-Number(b.year)).slice(-5)}
function formatBig(v,currency){const n=number(v);if(n==null)return'—';return new Intl.NumberFormat('de-DE',{style:'currency',currency,notation:'compact',maximumFractionDigits:1}).format(n)}
function chart(title,rows,key,currency){const vals=rows.map(x=>number(x[key])).filter(x=>x!=null);if(!vals.length)return`<div class="si-fin-chart"><h4>${title}</h4><div class="si-empty">Keine belastbaren Werte verfügbar.</div></div>`;const max=Math.max(...vals.map(x=>Math.abs(x)),1);return`<div class="si-fin-chart"><h4>${title}</h4>${rows.map(x=>{const v=number(x[key]);if(v==null)return'';const width=Math.max(3,Math.abs(v)/max*100);return`<div class="si-bar-row"><span>${x.year}</span><div class="si-bar-track"><div class="si-bar ${v<0?'negative':''}" style="width:${width}%"></div></div><span class="si-bar-value">${formatBig(v,currency)}</span></div>`}).join('')}</div>`}
function render(data,sourceLabel,selected){const box=$('siFinancials');if(!box)return false;const rows=validRows(data);if(!rows.length)return false;const currency=data.currency||'USD';box.innerHTML=`<div class="si-section-title"><h3>Unternehmensentwicklung</h3><span class="si-chip good">${rows.length} JAHRE</span></div><div class="si-fin-grid">${chart('Umsatz',rows,'revenue',currency)}${chart('EBITDA / Näherung',rows,'ebitdaApprox',currency)}${chart('Nettogewinn',rows,'netIncome',currency)}</div><div class="si-source">Quelle: ${sourceLabel||data.source||'SEC EDGAR'}. ${data.ebitdaNote||'EBITDA wird direkt verwendet oder aus operativem Ergebnis plus Abschreibungen angenähert.'}</div>`;box.dataset.financialsRecovered='1';completedSymbol=selected;failedSymbol='';return true}
function parseFinnhub(data){const reports=Array.isArray(data?.data)?data.data:[],rows=[];for(const report of reports.slice(0,10)){const year=Number(report.year)||Number(String(report.endDate||'').slice(0,4));if(!year)continue;const all=[...(report.report?.ic||[]),...(report.report?.cf||[])];const pick=(patterns,exclude=[])=>{for(const item of all){const text=String(item.concept||'')+' '+String(item.label||'');if(patterns.some(p=>p.test(text))&&!exclude.some(p=>p.test(text))){const v=number(item.value);if(v!=null)return v}}return null};const revenue=pick([/RevenueFromContract/i,/\bRevenue\b/i,/SalesRevenue/i,/Total revenue/i]);const operatingIncome=pick([/OperatingIncomeLoss/i,/Operating profit/i]);const da=pick([/Depreciation.*Amortization/i,/DepreciationDepletionAndAmortization/i]);const directEbitda=pick([/EBITDA/i,/EarningsBeforeInterestTaxesDepreciation/i]);const netIncome=pick([/NetIncomeLoss/i,/ProfitLoss$/i,/Net income/i],[/Gross/i,/Operating/i,/Comprehensive/i]);rows.push({year,revenue,operatingIncome,ebitdaApprox:directEbitda!=null?directEbitda:(operatingIncome!=null&&da!=null?operatingIncome+da:null),netIncome})}return{ok:true,currency:'USD',annual:rows,source:'Finnhub Financials as Reported',ebitdaNote:'EBITDA wird direkt verwendet oder aus operativem Ergebnis plus Abschreibungen angenähert.'}}
async function sec(symbolValue){const url=feedUrl();if(!url)throw new Error('GOOGLE_FEED_FEHLT');const data=await jsonp(url+'?action=us-financials&symbol='+encodeURIComponent(symbolValue));if(!data?.ok)throw new Error(data?.error||'SEC_FEED_FEHLER');if(!validRows(data).length)throw new Error('SEC_KEINE_JAHRESDATEN');return data}
async function finnhub(symbolValue){const key=finnhubKey();if(!key)throw new Error('FINNHUB_KEY_FEHLT');const data=await getJson('https://finnhub.io/api/v1/stock/financials-reported?symbol='+encodeURIComponent(symbolValue)+'&freq=annual&token='+encodeURIComponent(key));const parsed=parseFinnhub(data);if(!validRows(parsed).length)throw new Error('FINNHUB_KEINE_JAHRESDATEN');return parsed}
function errorText(error){const text=String(error?.message||error||'Unbekannt');if(/script\.external_request|authorization|permission|Berechtigung/i.test(text))return'Google Apps Script hat noch keine Freigabe für externe SEC-Abrufe.';if(/UNKNOWN_ACTION/i.test(text))return'Die veröffentlichte Apps-Script-Version enthält den Finanzdaten-Endpunkt noch nicht.';if(/HTTP_403|SEC_HTTP_403/i.test(text))return'Die SEC hat den Serverabruf abgewiesen.';return text}
async function recover(force=false){
  const selected=symbol(),box=$('siFinancials');if(!selected||!box||DAX.has(selected))return;
  if(!force&&box.querySelector('.si-fin-grid')){completedSymbol=selected;return}
  if(!force&&(runningSymbol===selected||completedSymbol===selected||failedSymbol===selected))return;
  const id=++runId;runningSymbol=selected;failedSymbol='';
  box.innerHTML='<div class="si-section-title"><h3>Unternehmensentwicklung</h3><span class="si-chip neutral">DATENABRUF</span></div><div class="si-loading">SEC-Jahresdaten werden geprüft …</div>';
  let secError='';
  try{const data=await sec(selected);if(id!==runId)return;if(render(data,'SEC EDGAR / Company Facts',selected))return}catch(e){secError=errorText(e)}
  try{const data=await finnhub(selected);if(id!==runId)return;if(render(data,'Finnhub Financials as Reported',selected))return}catch(e){if(id!==runId)return;const finError=errorText(e);failedSymbol=selected;box.innerHTML=`<div class="si-section-title"><h3>Unternehmensentwicklung</h3><span class="si-chip warn">ABRUF FEHLER</span></div><div class="si-empty"><strong>Finanzdaten konnten nicht geladen werden.</strong><br>SEC: ${secError}<br>Fallback: ${finError}<br><br>Der Fehler wird sichtbar angezeigt und nicht mehr still als „keine Daten“ verschluckt.</div>`}
  finally{if(id===runId)runningSymbol=''}
}
function resetAndSchedule(){runningSymbol='';completedSymbol='';failedSymbol='';setTimeout(()=>recover(true),350);setTimeout(()=>recover(false),2600)}
function boot(){
  document.addEventListener('change',event=>{if(event.target?.id==='siSymbol')resetAndSchedule()});
  document.addEventListener('click',event=>{if(event.target?.id==='siRefresh')resetAndSchedule()});
  const observer=new MutationObserver(()=>{const selected=symbol(),box=$('siFinancials');if(box&&!box.querySelector('.si-fin-grid')&&!DAX.has(selected)&&runningSymbol!==selected&&completedSymbol!==selected&&failedSymbol!==selected)setTimeout(()=>recover(false),250)});
  observer.observe(document.body,{subtree:true,childList:true});
  setTimeout(()=>recover(false),800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();