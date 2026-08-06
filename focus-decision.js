(()=>{'use strict';
const ROOT=typeof window!=='undefined'?window:globalThis;
const DB_KEY='senseis-focus-engine-v1';
const SELECT_KEY='senseis-stock-intelligence-symbol';
const THRESHOLDS={checkFocus:70,checkWeekly:65,checkTechnical:68,minRisk:45,minQuality:55,waitFocus:65,fundamentalQuality:65};
const n=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
const fmt=(value,digits=0)=>n(value)==null?'—':n(value).toLocaleString('de-DE',{maximumFractionDigits:digits});
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function missingCore(entry){
  if(!entry)return['entry'];
  const fields=['focusScore','qualityScore','valuationScore','weeklyRelevance','technicalReadiness','riskScore'];
  return fields.filter(field=>n(entry[field])==null);
}

function result(code,label,group,tone,priority,summary,reasons,nextStep,entry){
  return{code,label,group,tone,priority,summary,reasons,nextStep,entryState:entry?.state||null,score:n(entry?.focusScore)};
}

function evaluate(entry){
  if(!entry)return result('NOT_SCANNED','NOCH NICHT GESCANNT','errors','muted',0,'Für diese Aktie liegt noch kein vollständiger Focus-Scan vor.',['Keine belastbare Score-Grundlage vorhanden.'],'Fokus-Scan ausführen.',entry);
  if(entry.lastError)return result('DATA_INCOMPLETE','DATEN UNVOLLSTÄNDIG','errors','bad',1,'Die Aktie konnte wegen eines Datenfehlers nicht zuverlässig eingestuft werden.',[`Quelle meldet: ${String(entry.lastError).replace(/^Error:\s*/,'')}`],'Daten erneut laden; bis dahin keine Trading-Ableitung verwenden.',entry);
  const missing=missingCore(entry);
  if(missing.length>=2)return result('DATA_INCOMPLETE','DATEN UNVOLLSTÄNDIG','errors','bad',1,'Zu viele Kernwerte fehlen für eine belastbare Entscheidung.',[`Fehlende Score-Felder: ${missing.join(', ')}`],'Daten erneut laden; fehlende Werte nicht als neutral interpretieren.',entry);
  if(entry.hardRisk)return result('NOT_TRADABLE','NICHT HANDELBAR','all','bad',2,'Das Risk Gate blockiert die Aktie derzeit.',[
    n(entry.qualityScore)!=null?`Qualität ${fmt(entry.qualityScore)}/100`:'Qualität nicht verfügbar',
    n(entry.riskScore)!=null?`Risikoqualität ${fmt(entry.riskScore)}/100`:'Risikoqualität nicht verfügbar',
    'Fundamentaler Schaden oder unzureichende Risikodaten haben Vorrang vor günstiger Bewertung.'
  ],'Nicht auf einen Long-Trigger warten, bevor das Risk Gate wieder bestanden ist.',entry);

  const focus=n(entry.focusScore)??0;
  const weekly=n(entry.weeklyRelevance)??0;
  const technical=n(entry.technicalReadiness)??0;
  const risk=n(entry.riskScore)??0;
  const quality=n(entry.qualityScore)??0;
  const gap=n(entry.gapOpportunity);
  const state=entry.state||'UNIVERSE';

  if(focus>=THRESHOLDS.checkFocus&&weekly>=THRESHOLDS.checkWeekly&&technical>=THRESHOLDS.checkTechnical&&risk>=THRESHOLDS.minRisk&&quality>=THRESHOLDS.minQuality){
    return result('CHECK_NOW','JETZT TECHNISCH PRÜFEN','check','good',6,'Die Aktie besitzt aktuell genug Qualität, Relevanz und technische Nähe für eine gezielte Chartprüfung.',[
      `Focus Score ${fmt(focus)} ≥ ${THRESHOLDS.checkFocus}`,
      `Wochenrelevanz ${fmt(weekly)} ≥ ${THRESHOLDS.checkWeekly}`,
      `Technische Bereitschaft ${fmt(technical)} ≥ ${THRESHOLDS.checkTechnical}`
    ],'H1, H4 und D1 auf Trend, Struktur, Zone und bestätigenden Schluss prüfen. Das ist noch kein Entry-Signal.',entry);
  }

  if(focus>=THRESHOLDS.waitFocus||['ACTIVE','FOCUS','WATCH'].includes(state)||(gap!=null&&gap>=65)){
    const reasons=[];
    if(focus>=THRESHOLDS.waitFocus)reasons.push(`Focus Score ${fmt(focus)} ist grundsätzlich interessant.`);
    if(weekly>=THRESHOLDS.checkWeekly)reasons.push(`Wochenrelevanz ${fmt(weekly)} ist hoch.`);else reasons.push(`Wochenrelevanz ${fmt(weekly)} reicht noch nicht für „Jetzt prüfen“.`);
    if(technical<THRESHOLDS.checkTechnical)reasons.push(`Technische Bereitschaft ${fmt(technical)} liegt unter ${THRESHOLDS.checkTechnical}.`);
    if(gap!=null&&gap>=65)reasons.push(`Gap Opportunity ${fmt(gap)} ist aktiv.`);
    return result('WAIT_TRIGGER','AUF TRIGGER WARTEN','watch','mid',5,'Fundamental oder preislich interessant, aber die aktuelle technische Bestätigung reicht noch nicht.',reasons.slice(0,3),'Auf H1/H4/D1-Bestätigung warten. Später ersetzt der TradingView-Technik-State diese Vorprüfung durch echte Struktur- und Close-Signale.',entry);
  }

  if(quality>=THRESHOLDS.fundamentalQuality&&risk>=THRESHOLDS.minRisk){
    return result('FUNDAMENTAL_WATCH','FUNDAMENTAL BEOBACHTEN','watch','neutral',3,'Das Unternehmen ist grundsätzlich beobachtenswert, besitzt aber aktuell zu wenig Wochenrelevanz oder Preisnähe.',[
      `Qualität ${fmt(quality)} ≥ ${THRESHOLDS.fundamentalQuality}`,
      `Risikoqualität ${fmt(risk)} ≥ ${THRESHOLDS.minRisk}`,
      `Aktueller Focus Score ${fmt(focus)} liegt unter ${THRESHOLDS.waitFocus}`
    ],'In der Liste behalten, aber keinen aktiven Chart-Alarm priorisieren.',entry);
  }

  return result('NOT_PRIORITIZED','DERZEIT NICHT PRIORISIERT','all','muted',2,'Die derzeitige Kombination reicht weder für eine aktive Prüfung noch für die engere Beobachtung.',[
    `Focus Score ${fmt(focus)}/100`,
    `Qualität ${fmt(quality)}/100`,
    `Wochenrelevanz ${fmt(weekly)}/100`
  ],'Keine aktive Aktion. Erst bei deutlicher Score- oder Relevanzänderung neu prüfen.',entry);
}

ROOT.SenSeiSFocusDecision={evaluate,missingCore,thresholds:THRESHOLDS};
if(typeof document==='undefined')return;

let timer=0;
function db(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'{}')}catch{return{}}}
function ticker(){return String(document.querySelector('#siSymbol')?.value||localStorage.getItem(SELECT_KEY)||'').trim().toUpperCase().replace(/\.DE$/,'')}
function style(){
  if(document.getElementById('focusDecisionStyles'))return;
  const node=document.createElement('style');
  node.id='focusDecisionStyles';
  node.textContent=`
  .fd-card{margin:12px 14px;padding:15px;border:1px solid #303946;border-radius:17px;background:#0b0f14;color:#f7f8fa}
  .fd-card.good{border-color:rgba(48,209,88,.42)}.fd-card.mid{border-color:rgba(255,214,10,.38)}.fd-card.bad{border-color:rgba(255,69,58,.45)}
  .fd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.fd-head span{display:block;color:#8c95a3;font-size:8px;font-weight:900;letter-spacing:.12em}.fd-head h3{margin:5px 0 0;font-size:20px}.fd-pill{padding:6px 8px;border:1px solid #394351;border-radius:999px;color:#c8ced8;font-size:8px;font-style:normal;font-weight:900}.fd-card.good .fd-pill{color:#30d158;border-color:rgba(48,209,88,.42)}.fd-card.mid .fd-pill{color:#ffd60a;border-color:rgba(255,214,10,.38)}.fd-card.bad .fd-pill{color:#ff6961;border-color:rgba(255,69,58,.45)}
  .fd-summary{margin:12px 0 0;color:#c2c9d3;font-size:10px;line-height:1.5}.fd-reasons{display:grid;gap:6px;margin-top:10px}.fd-reasons div{padding:8px 9px;border-radius:10px;background:#141a21;color:#9ca6b4;font-size:9px;line-height:1.4}.fd-next{margin-top:10px;padding:10px;border:1px solid #303946;border-radius:11px;background:#0e1319;color:#fff;font-size:9px;line-height:1.45}.fd-next b{display:block;margin-bottom:4px;color:#8c95a3;font-size:7px;letter-spacing:.1em}.fd-warning{margin-top:8px;color:#7f8997;font-size:8px;line-height:1.4}
  @media(max-width:620px){.fd-card{margin:10px 12px;padding:13px}.fd-head h3{font-size:18px}}
  `;
  document.head.appendChild(node);
}

function render(){
  clearTimeout(timer);
  timer=setTimeout(()=>{
    const view=document.getElementById('view-stocks');
    if(!view)return;
    const t=ticker(),entry=db().entries?.[t];
    let card=document.getElementById('focusDecisionCard');
    if(!entry){card?.remove();return;}
    const verdict=evaluate(entry);
    if(!card){
      card=document.createElement('section');
      card.id='focusDecisionCard';
      const explain=document.getElementById('focusExplainCard');
      if(explain)explain.insertAdjacentElement('beforebegin',card);else{
        const toolbar=view.querySelector('.si-toolbar');
        toolbar?toolbar.insertAdjacentElement('afterend',card):view.prepend(card);
      }
    }
    card.className=`fd-card ${verdict.tone}`;
    card.innerHTML=`<div class="fd-head"><div><span>PRÜFENTSCHEIDUNG · ${esc(t)}</span><h3>${esc(verdict.label)}</h3></div><i class="fd-pill">${n(entry.focusScore)==null?'—':fmt(entry.focusScore)} / 100</i></div><p class="fd-summary">${esc(verdict.summary)}</p><div class="fd-reasons">${verdict.reasons.map(reason=>`<div>✓ ${esc(reason)}</div>`).join('')}</div><div class="fd-next"><b>NÄCHSTER SCHRITT</b>${esc(verdict.nextStep)}</div><div class="fd-warning">„Jetzt prüfen“ bedeutet Chartanalyse starten — nicht automatisch kaufen oder verkaufen. Die technische Bereitschaft ist aktuell noch eine Vorprüfung aus 52-Wochen-Lage und Gap-Daten.</div>`;
  },80);
}

function boot(){
  style();
  const view=document.getElementById('view-stocks');
  if(!view)return;
  view.addEventListener('change',event=>{if(event.target?.id==='siSymbol')render()});
  const observer=new MutationObserver(records=>{
    const card=document.getElementById('focusDecisionCard');
    if(card&&records.every(record=>record.target===card||card.contains(record.target)))return;
    render();
  });
  observer.observe(view,{childList:true,subtree:true});
  window.addEventListener('storage',event=>{if(event.key===DB_KEY||event.key===SELECT_KEY)render()});
  window.dispatchEvent(new CustomEvent('senseis-focus-decision-ready'));
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
