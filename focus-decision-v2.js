(()=>{'use strict';
const ROOT=typeof window!=='undefined'?window:globalThis;
const DB_KEY='senseis-focus-engine-v1';
const SELECT_KEY='senseis-stock-intelligence-symbol';
const n=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const fmt=(v,d=0)=>n(v)==null?'—':n(v).toLocaleString('de-DE',{maximumFractionDigits:d});
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function result(code,label,group,tone,priority,summary,reasons,nextStep,entry){return{code,label,group,tone,priority,summary,reasons,nextStep,score:n(entry?.focusScore)}}
function missing(entry){if(!entry)return['entry'];return['focusScore','qualityScore','valuationScore','growthScore','riskScore','priceDislocationScore','currentRelevanceScore'].filter(k=>n(entry[k])==null)}
function evaluate(entry){
  if(!entry)return result('NOT_SCANNED','NOCH NICHT GESCANNT','errors','muted',0,'Noch keine belastbare Bewertung vorhanden.',['Kein vollständiger Focus-Scan.'],'Fokus-Scan starten.',entry);
  if(entry.lastError)return result('DATA_INCOMPLETE','DATEN UNVOLLSTÄNDIG','errors','bad',1,'Die Datenquelle konnte die Aktie nicht vollständig bewerten.',[`Quelle: ${String(entry.lastError).replace(/^Error:\s*/,'')}`],'Daten erneut laden; keine Trading-Ableitung verwenden.',entry);
  if(missing(entry).length>=3)return result('DATA_INCOMPLETE','DATEN UNVOLLSTÄNDIG','errors','bad',1,'Zu viele Kernwerte fehlen für eine belastbare Einordnung.',[`Fehlende Felder: ${missing(entry).join(', ')}`],'Daten erneut laden.',entry);
  if(entry.hardRisk)return result('NOT_TRADABLE','NICHT HANDELBAR','all','bad',2,'Das Risk Gate hat Vorrang vor günstiger Bewertung oder starkem Drawdown.',[`Qualität ${fmt(entry.qualityScore)}/100`,`Risikoqualität ${fmt(entry.riskScore)}/100`],'Erst neu prüfen, wenn das Risk Gate wieder bestanden ist.',entry);
  const focus=n(entry.focusScore)||0,rel=n(entry.currentRelevanceScore)||0,dis=n(entry.priceDislocationScore)||0,quality=n(entry.qualityScore)||0,risk=n(entry.riskScore)||0,loc=n(entry.technicalLocationScore);
  if(focus>=68&&rel>=65&&quality>=55&&risk>=45){
    return result('CATALYST_REVIEW','AKTUELLER KATALYSATOR · CHART PRÜFEN','check','good',6,'Opportunity und aktuelle Bewegung sind gleichzeitig auffällig. Eine echte Trendbestätigung ist aber noch nicht Teil der Dashboard-Daten.',[`Opportunity Score ${fmt(focus)}/100`,`Aktuelle Relevanz ${fmt(rel)}/100`,`Preisdislokation ${fmt(dis)}/100`],`H1/H4/D1 gezielt prüfen. Preisstandort ${fmt(loc)}/100 ist nur Kontext; Entry erst nach echter Struktur-/Close-Bestätigung.`,entry);
  }
  if(focus>=68&&dis>=65&&quality>=55&&risk>=45){
    const rec=entry.recoveryEvidence?'Erste kurzfristige Recovery-Reaktion vorhanden.':'Noch kein belastbarer kurzfristiger Recovery-Trigger.';
    return result('RECOVERY_CANDIDATE','RECOVERY-KANDIDAT · TRIGGER FEHLT','watch','mid',5,'Die Aktie ist qualitativ interessant und stark preislich disloziert. Das ist eine Beobachtungschance, kein bullishes Signal.',[`Opportunity Score ${fmt(focus)}/100`,`Preisdislokation ${fmt(dis)}/100`,rec],`Auf einen echten H1/H4/D1-Trigger warten. Aktuelle Relevanz: ${fmt(rel)}/100${entry.currentRelevanceStatus==='READY'?'':' · Verlauf noch WARMING_UP'}.`,entry);
  }
  if(focus>=65){
    return result('WAIT_TRIGGER','AUF TRIGGER WARTEN','watch','mid',4,'Fundamental beziehungsweise bewertungsseitig interessant, aber ohne ausreichenden aktuellen Katalysator oder Recovery-Kontext.',[`Opportunity Score ${fmt(focus)}/100`,`Aktuelle Relevanz ${fmt(rel)}/100`,`Preisdislokation ${fmt(dis)}/100`],'Beobachten; erst bei neuer Relevanz oder technischem Trigger hochstufen.',entry);
  }
  if(quality>=65&&risk>=45)return result('FUNDAMENTAL_WATCH','FUNDAMENTAL BEOBACHTEN','watch','neutral',3,'Das Unternehmen ist grundsätzlich interessant, aktuell aber nicht stark genug disloziert oder relevant.',[`Qualität ${fmt(quality)}/100`,`Risikoqualität ${fmt(risk)}/100`,`Opportunity Score ${fmt(focus)}/100`],'In der Liste behalten, aber keinen aktiven Chart-Check priorisieren.',entry);
  return result('NOT_PRIORITIZED','DERZEIT NICHT PRIORISIERT','all','muted',2,'Die aktuelle Kombination reicht nicht für die engere Prüfung.',[`Opportunity Score ${fmt(focus)}/100`,`Aktuelle Relevanz ${fmt(rel)}/100`,`Preisdislokation ${fmt(dis)}/100`],'Keine aktive Aktion; bei deutlicher Veränderung neu bewerten.',entry);
}
ROOT.SenSeiSFocusDecision={evaluate,missingCore:missing,version:'2.0'};
if(typeof module!=='undefined'&&module.exports)module.exports={evaluate,missing};
if(typeof document==='undefined')return;
let timer=0,painting=false;
function db(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'{}')}catch{return{}}}
function ticker(){return String(document.querySelector('#siSymbol')?.value||localStorage.getItem(SELECT_KEY)||'').trim().toUpperCase().replace(/\.DE$/,'')}
function style(){if(document.getElementById('focusDecisionV2Styles'))return;const s=document.createElement('style');s.id='focusDecisionV2Styles';s.textContent=`#focusDecisionCard{display:none!important}.fd2{margin:12px 14px;padding:15px;border:1px solid #303946;border-radius:17px;background:#0b0f14;color:#f7f8fa}.fd2.good{border-color:rgba(48,209,88,.42)}.fd2.mid{border-color:rgba(255,214,10,.38)}.fd2.bad{border-color:rgba(255,69,58,.45)}.fd2 h3{margin:5px 0 0;font-size:18px}.fd2-head{display:flex;justify-content:space-between;gap:10px}.fd2-head span{color:#8c95a3;font-size:8px;font-weight:900;letter-spacing:.12em}.fd2-score{font-size:18px;font-weight:900}.fd2 p{color:#b9c1cc;font-size:10px;line-height:1.5}.fd2-r{display:grid;gap:6px}.fd2-r div{padding:8px 9px;border-radius:10px;background:#141a21;color:#9ca6b4;font-size:9px}.fd2-next{margin-top:10px;padding:10px;border:1px solid #303946;border-radius:11px;font-size:9px;line-height:1.45}.fd2-next b{display:block;color:#8c95a3;font-size:7px;margin-bottom:4px}.fd2-warn{margin-top:8px;color:#7f8997;font-size:8px;line-height:1.45}`;document.head.appendChild(s)}
function render(){if(painting)return;clearTimeout(timer);timer=setTimeout(()=>{const view=document.getElementById('view-stocks'),t=ticker(),e=db().entries?.[t];let card=document.getElementById('focusDecisionCardV2');if(!view||!e){card?.remove();return}const v=evaluate(e);if(!card){card=document.createElement('section');card.id='focusDecisionCardV2';const old=document.getElementById('focusDecisionCard');old?old.insertAdjacentElement('afterend',card):(view.querySelector('.si-toolbar')?.insertAdjacentElement('afterend',card))}painting=true;card.className=`fd2 ${v.tone}`;card.innerHTML=`<div class="fd2-head"><div><span>PRÜFENTSCHEIDUNG · ${esc(t)}</span><h3>${esc(v.label)}</h3></div><div class="fd2-score">${fmt(e.focusScore)} / 100</div></div><p>${esc(v.summary)}</p><div class="fd2-r">${v.reasons.map(x=>`<div>✓ ${esc(x)}</div>`).join('')}</div><div class="fd2-next"><b>NÄCHSTER SCHRITT</b>${esc(v.nextStep)}</div><div class="fd2-warn">Opportunity Score ≠ bullish. Preisstandort ≠ Trendbestätigung. Die echte H1/H4/D1-Technik kommt später aus TradingView.</div>`;setTimeout(()=>{painting=false},0)},80)}
function boot(){style();render();document.addEventListener('change',e=>{if(e.target?.id==='siSymbol')render()});window.addEventListener('senseis-focus-v2-updated',render);const view=document.getElementById('view-stocks');if(view)new MutationObserver(()=>{if(!painting)render()}).observe(view,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
