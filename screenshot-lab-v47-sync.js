(()=>{"use strict";
const $=id=>document.getElementById(id);
let queued=null,running=false;
function pn(v){let s=String(v??"").trim().replace(/\s/g,"");if(!s)return NaN;const c=s.lastIndexOf(","),d=s.lastIndexOf(".");if(c>-1&&d>-1)s=c>d?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");else if(c>-1)s=s.replace(",",".");return Number(s)}
function fmt(v,d=2){return Number.isFinite(v)?new Intl.NumberFormat("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d}).format(v):""}
function fire(el,type){el&&el.dispatchEvent(new Event(type,{bubbles:true}))}
function calcDoc(){try{return window.parent.document.getElementById("calcFrame")?.contentDocument||null}catch{return null}}
function closeEnough(a,b,pct=.02,abs=.9){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(abs,Math.abs(b)*pct)}
function syncFinance(){
  const q=pn($("tvQuantity")?.value),acc=pn($("tvAccount")?.value),tvLoss=pn($("tvLoss")?.value),tvProfit=pn($("tvProfit")?.value);
  if(!Number.isFinite(q)||q<=0||!Number.isFinite(tvLoss)||tvLoss<0||!Number.isFinite(tvProfit)||tvProfit<0)return false;
  const doc=calcDoc();if(!doc)return false;
  const lots=doc.getElementById("lots"),account=doc.getElementById("account"),risk=doc.getElementById("risk"),entry=doc.getElementById("entry"),sl=doc.getElementById("sl"),tp=doc.getElementById("tp");
  if(!lots||!entry||!sl||!tp)return false;
  const e=pn(entry.value),s=pn(sl.value),t=pn(tp.value),cs=pn(doc.getElementById("cs")?.textContent)||1;
  if(![e,s,t,cs].every(Number.isFinite)||e<=0||cs<=0)return false;
  const expectedLoss=Math.abs(e-s)*q*cs,expectedProfit=Math.abs(t-e)*q*cs;
  const lossMatch=closeEnough(expectedLoss,tvLoss),profitMatch=closeEnough(expectedProfit,tvProfit);
  if(!lossMatch||!profitMatch){
    const msg=doc.getElementById("autoMessage");
    if(msg){msg.className="auto-note warntext";msg.textContent="Screenshot-Menge wurde NICHT übernommen: TV Loss/Profit passen mathematisch noch nicht zu Entry, SL, TP und Menge."}
    return false;
  }
  lots.value=fmt(q,2);
  let accountImported=false,existingAcc=pn(account?.value);
  if(account&&Number.isFinite(acc)&&acc>0){account.value=fmt(acc,2);accountImported=true;existingAcc=acc}
  if(risk&&accountImported&&acc>0){risk.value=fmt(tvLoss/acc*100,3)}
  fire(lots,"input");fire(lots,"change");
  if(accountImported){fire(account,"input");fire(account,"change");fire(risk,"input");fire(risk,"change")}
  else if(account&&Number.isFinite(existingAcc)&&existingAcc>0){fire(account,"input");fire(account,"change")}
  const msg=doc.getElementById("autoMessage");
  if(msg){
    if(accountImported){msg.className="auto-note oktext";msg.textContent="✓ TradingView übernommen: Menge "+fmt(q,2)+", Konto "+fmt(acc,2)+". Crosscheck bestanden: Rechner Loss "+fmt(expectedLoss,2)+" ≈ TV "+fmt(tvLoss,2)+" und Profit "+fmt(expectedProfit,2)+" ≈ TV "+fmt(tvProfit,2)+"."}
    else{msg.className="auto-note oktext";msg.textContent="✓ TradingView-Menge "+fmt(q,2)+" übernommen. Crosscheck mit TV Loss "+fmt(tvLoss,2)+" und TV Profit "+fmt(tvProfit,2)+" bestanden. Kontogröße wurde im Screenshot nicht sicher gelesen und deshalb nicht überschrieben."}
  }
  try{
    const p=window.parent.document,chip=p.getElementById("importChip"),sym=$("symbol")?.value.trim().toUpperCase()||"",tf=$("timeframe")?.value.trim().toUpperCase()||"";
    if(chip){chip.classList.toggle("warn",!accountImported);chip.classList.add("show");chip.textContent=(accountImported?"✓ TV-Match: ":"✓ TV-Menge verifiziert: ")+sym+" · "+tf+" · Menge "+fmt(q,2)+(accountImported?" · Konto "+fmt(acc,2):" · Konto nicht überschrieben")}
  }catch{}
  return true;
}
function hasApiKey(){try{return !!window.parent.localStorage.getItem("tradecalc-finnhub-key")}catch{return false}}
function refreshLive(){const doc=calcDoc();if(!doc)return;const stock=doc.getElementById("stock"),apiMsg=doc.getElementById("apiMessage");if(stock)fire(stock,"change");if(!hasApiKey()){if(apiMsg){apiMsg.className="api-note warntext";apiMsg.textContent="Live-Preis nicht verfügbar: Finnhub API-Key fehlt auf diesem Gerät."}return}setTimeout(()=>{const live=doc.getElementById("livePrice")?.textContent?.trim(),refresh=doc.getElementById("refreshLive");if((!live||live==="—")&&refresh&&!refresh.disabled){refresh.click();if(apiMsg){apiMsg.className="api-note";apiMsg.textContent="Live-Referenzkurs wird nach dem Screenshot-Import aktualisiert …"}}},900)}
function afterExport(){if(running)return;running=true;let tries=0;const t=setInterval(()=>{tries++;const synced=syncFinance();if(synced||tries>30){clearInterval(t);running=false;refreshLive()}},180)}
function queueAfterExport(delay=360){if(queued)clearTimeout(queued);queued=setTimeout(()=>{queued=null;afterExport()},delay)}
function onParentImport(e){if(e.origin!==location.origin||e.data?.type!=="TRADECALC_IMPORT")return;queueAfterExport(320)}
function install(){
  try{const v=window.parent.document.querySelector(".version");if(v)v.textContent="V4.8";window.parent.addEventListener("message",onParentImport,false)}catch{}
  const v=document.querySelector(".version");if(v)v.textContent="V4.8";
  const b=$("importToCalc");if(!b)return false;
  b.addEventListener("pointerup",()=>queueAfterExport(520),true);
  return true
}
if(!install()){let n=0,t=setInterval(()=>{if(install()||++n>50)clearInterval(t)},100)}
})();