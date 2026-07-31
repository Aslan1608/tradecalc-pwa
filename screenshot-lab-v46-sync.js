(()=>{"use strict";
const $=id=>document.getElementById(id);
function pn(v){let s=String(v??"").trim().replace(/\s/g,"");if(!s)return NaN;let c=s.lastIndexOf(","),d=s.lastIndexOf(".");if(c>-1&&d>-1)s=c>d?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");else if(c>-1)s=s.replace(",",".");return Number(s)}
function fmt(v,d=2){return Number.isFinite(v)?new Intl.NumberFormat("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d}).format(v):""}
function fire(el,type){el&&el.dispatchEvent(new Event(type,{bubbles:true}))}
function moneyNumber(text){let s=String(text||"").replace(/[^0-9,\.\-+]/g,"");return pn(s)}
function syncToCalculator(){
  const box=$("tvFinanceBox"),audit=box?.dataset.audit||"none";
  if(audit!=="pass")return;
  const q=pn($("tvQuantity")?.value),acc=pn($("tvAccount")?.value),tvLoss=pn($("tvLoss")?.value),tvProfit=pn($("tvProfit")?.value);
  if(![q,acc,tvLoss,tvProfit].every(Number.isFinite)||q<=0||acc<=0||tvLoss<0||tvProfit<0)return;
  let pdoc;try{pdoc=window.parent.document}catch{return}
  const calc=pdoc.getElementById("calcFrame");let doc;try{doc=calc?.contentDocument}catch{return}if(!doc)return;
  const lots=doc.getElementById("lots"),account=doc.getElementById("account"),risk=doc.getElementById("risk");
  if(!lots||!account||!risk)return;
  lots.value=fmt(q,2);account.value=fmt(acc,2);risk.value=fmt(tvLoss/acc*100,3);
  [lots,account,risk].forEach(el=>{fire(el,"input");fire(el,"change")});
  setTimeout(()=>{
    const calcLoss=Math.abs(moneyNumber(doc.getElementById("loss")?.textContent)),calcProfit=Math.abs(moneyNumber(doc.getElementById("profit")?.textContent));
    const lossDiff=Number.isFinite(calcLoss)?Math.abs(calcLoss-tvLoss):NaN,profitDiff=Number.isFinite(calcProfit)?Math.abs(calcProfit-tvProfit):NaN;
    const ok=Number.isFinite(lossDiff)&&Number.isFinite(profitDiff)&&lossDiff<=Math.max(.05,tvLoss*.005)&&profitDiff<=Math.max(.05,tvProfit*.005);
    const msg=doc.getElementById("autoMessage");
    if(msg){msg.className="auto-note "+(ok?"oktext":"warntext");msg.textContent=ok?"✓ TradingView Match: Menge, Kontogröße, Max. Loss und Profit wurden aus dem Screenshot übernommen und stimmen mit TradeCalc überein.":"⚠ TradingView-Werte wurden übernommen, aber der Loss/Profit-Crosscheck weicht ab. Brokerprofil/Contract Size prüfen."}
    const chip=pdoc.getElementById("importChip");
    if(chip){chip.classList.toggle("warn",!ok);const sym=$("symbol")?.value.trim().toUpperCase()||"";const tf=$("timeframe")?.value.trim().toUpperCase()||"";chip.textContent=(ok?"✓ TV-Match: ":"⚠ TV-Check: ")+sym+" · "+tf+" · Menge "+fmt(q,2)+" · Konto "+fmt(acc,2)}
    try{window.parent.localStorage.setItem("tradecalc-last-tv-finance",JSON.stringify({quantity:q,account:acc,loss:tvLoss,profit:tvProfit,riskPct:tvLoss/acc*100,match:ok,time:Date.now()}))}catch{}
  },220)
}
function install(){try{const v=window.parent.document.querySelector(".version");if(v)v.textContent="V4.6"}catch{}const b=$("importToCalc");if(!b)return false;b.addEventListener("click",()=>setTimeout(syncToCalculator,420),true);return true}
if(!install()){let n=0,t=setInterval(()=>{if(install()||++n>30)clearInterval(t)},100)}
})();