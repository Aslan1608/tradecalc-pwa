(()=>{'use strict';
const ROOT=typeof window!=='undefined'?window:globalThis;
const KEY='senseis-focus-engine-v1';
const SEL='senseis-stock-intelligence-symbol';
const NOMINAL={quality:30,valuation:20,growth:16,weekly:20,risk:10,gap:4};
const LABEL={quality:'Qualität',valuation:'Bewertung',growth:'Wachstum',weekly:'Wochenrelevanz',risk:'Risikoqualität',gap:'Gap Opportunity'};
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const cl=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
const fmt=(v,d=1)=>n(v)==null?'—':n(v).toLocaleString('de-DE',{maximumFractionDigits:d});
const pct=(v,d=1)=>n(v)==null?'—':`${n(v)>0?'+':''}${fmt(v,d)} %`;
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function weighted(parts){let total=0,weight=0;for(const [value,w] of parts){if(value==null)continue;total+=cl(value)*w;weight+=w}return weight?total/weight:null}
function linear(v,a,b){v=n(v);return v==null?null:cl((v-a)/(b-a)*100)}
function low(v,best,worst){v=n(v);return v==null?null:cl((worst-v)/(worst-best)*100)}
function pePoints(v){v=n(v);if(v==null)return null;if(v<=0)return 10;if(v<8)return 45;if(v<=18)return 90;if(v<=25)return 78;if(v<=35)return 55;if(v<=50)return 32;return 15}
function betaPoints(v){v=n(v);if(v==null)return null;if(v<=1.15)return 90;if(v<=1.5)return 70;if(v<=2)return 45;return 20}
function availableDimensions(e){return[
  {id:'quality',score:n(e.qualityScore),weight:NOMINAL.quality},
  {id:'valuation',score:n(e.valuationScore),weight:NOMINAL.valuation},
  {id:'growth',score:n(e.growthScore),weight:NOMINAL.growth},
  {id:'weekly',score:n(e.weeklyRelevance),weight:NOMINAL.weekly},
  {id:'risk',score:n(e.riskScore),weight:NOMINAL.risk},
  {id:'gap',score:n(e.gapOpportunity),weight:NOMINAL.gap}
].filter(x=>x.score!=null)}
function contributions(e){
  const dims=availableDimensions(e),sum=dims.reduce((a,x)=>a+x.weight,0);
  return dims.map(x=>({...x,label:LABEL[x.id],effectiveWeight:x.weight/sum*100,points:x.score*x.weight/sum}));
}
function drivers(e){
  const dims=[
    ['Bewertung',n(e.valuationScore)],['Wochenrelevanz',n(e.weeklyRelevance)],['Qualität',n(e.qualityScore)],
    ['Wachstum',n(e.growthScore)],['Risikoqualität',n(e.riskScore)],['Technische Bereitschaft',n(e.technicalReadiness)],['Gap Opportunity',n(e.gapOpportunity)]
  ].filter(x=>x[1]!=null).sort((a,b)=>b[1]-a[1]);
  return{strong:dims.slice(0,2),weak:[...dims].sort((a,b)=>a[1]-b[1]).slice(0,2)}
}
function metricParts(e){
  const m=e.metrics||{},range=n(e.rangePosition),dd=n(e.drawdown),gap=e.gap||{};
  const quality=[
    {name:'ROE',value:pct(m.roe),points:linear(m.roe,5,30),weight:25,why:'Eigenkapitalrendite zwischen 5 % und 30 % wird auf 0–100 skaliert.'},
    {name:'Nettomarge',value:pct(m.margin),points:linear(m.margin,0,25),weight:22,why:'Höhere nachhaltige Profitabilität erhöht den Qualitätsscore.'},
    {name:'Bruttomarge',value:pct(m.gross),points:linear(m.gross,15,65),weight:12,why:'Zeigt Preissetzungsmacht und Geschäftsmodellqualität.'},
    {name:'Current Ratio',value:fmt(m.cur,2),points:linear(m.cur,.8,2.2),weight:12,why:'Kurzfristige finanzielle Stabilität.'},
    {name:'FCF-Marge',value:pct(m.fcf),points:linear(m.fcf,0,20),weight:14,why:'Wie viel Umsatz als freier Cashflow verbleibt.'},
    {name:'Größe/Stabilität',value:m.cap==null?'—':`${fmt(m.cap/1000,1)} Mrd.`,points:m.cap==null?null:linear(Math.log10(Math.max(m.cap,1)),3,6),weight:15,why:'Marktkapitalisierung dient nur als Stabilitätsproxy, nicht als Qualitätsbeweis.'}
  ];
  const growth=[
    {name:'Umsatzwachstum',value:pct(m.rev),points:linear(m.rev,-5,20),weight:55,why:'Aktuelles oder mehrjähriges Umsatzwachstum.'},
    {name:'EPS-Wachstum',value:pct(m.eps),points:linear(m.eps,-10,25),weight:45,why:'Gewinnwachstum je Aktie.'}
  ];
  const risk=[
    {name:'Debt/Equity',value:pct(m.de),points:low(m.de,30,250),weight:45,why:'Niedrigere Verschuldung erhält mehr Punkte.'},
    {name:'Beta',value:fmt(m.beta,2),points:betaPoints(m.beta),weight:30,why:'Niedrigere Marktsensitivität wird als robuster gewertet.'},
    {name:'Current Ratio',value:fmt(m.cur,2),points:linear(m.cur,.7,2),weight:25,why:'Liquiditätspuffer gegen kurzfristige Belastungen.'}
  ];
  const rangePoints=range==null?null:100-range;
  const valuationProxy=weighted([[pePoints(m.pe),55],[rangePoints,45]]);
  const valuation=[
    {name:'KGV',value:fmt(m.pe,1),points:pePoints(m.pe),weight:55,why:'Bewertung nach festen Startbändern; später durch eigene Historie ergänzt.'},
    {name:'52W-Lage',value:range==null?'—':`${fmt(range,0)} % der Spanne`,points:rangePoints,weight:45,why:'Je tiefer innerhalb der Jahresspanne, desto höher der Dislokationsanteil.'},
    {name:'Eigene Historie',value:e.historyStatus==='READY'?`${fmt(e.valuationPercentile,0)}. Perzentil`:`WARMING_UP ${e.historyCount||0}/20`,points:e.historyStatus==='READY'?100-n(e.valuationPercentile):null,weight:40,why:'Erst nach 20 echten Tagessnapshots aktiv; keine rückgerechneten Daten.'}
  ];
  const drawPoints=dd==null?null:cl((Math.abs(Math.min(dd,0))-8)/27*100);
  const gapPct=n(gap.gapPct),gapMag=gapPct==null?null:cl((Math.abs(gapPct)-1.5)/8.5*100);
  const weekly=[
    {name:'Drawdown',value:pct(dd),points:drawPoints,weight:60,why:'Ab etwa −8 % steigt die Wochenrelevanz; bei rund −35 % erreicht dieser Teil 100.'},
    {name:'Abwärts-Gap',value:gap.down?pct(gapPct):'kein aktives Gap',points:gap.down?gapMag:null,weight:40,why:'Nur ein echtes aktuelles Abwärts-Gap erhöht diesen Teil.'}
  ];
  const technical=[
    {name:'52W-Standort',value:range==null?'—':`${fmt(range,0)} %`,points:rangePoints,weight:55,why:'Preisliche Lage, noch keine Trendbestätigung.'},
    {name:'Gap-Fill',value:gap.down?`${fmt(gap.fillProgress,0)} %`:'kein aktives Gap',points:gap.down?n(gap.fillProgress):null,weight:35,why:'Rückeroberung innerhalb des offenen Gaps.'},
    {name:'Stabilisierung',value:gap.down?(n(gap.current)>=n(gap.open)?'über Gap-Eröffnung':'unter Gap-Eröffnung'):'nicht anwendbar',points:gap.down?(n(gap.current)>=n(gap.open)?75:30):null,weight:10,why:'Nur eine einfache Stabilitätsprüfung, kein vollständiges technisches Setup.'}
  ];
  return{quality,growth,risk,valuation,weekly,technical,valuationProxy};
}
function coverage(rows){const total=rows.reduce((a,x)=>a+x.weight,0),available=rows.filter(x=>x.points!=null).reduce((a,x)=>a+x.weight,0);return total?Math.round(available/total*100):0}
function explain(e){
  const d=drivers(e),c=contributions(e),parts=metricParts(e);
  return{contributions:c,total:c.reduce((a,x)=>a+x.points,0),drivers:d,parts,coverage:{quality:coverage(parts.quality),valuation:coverage(parts.valuation),growth:coverage(parts.growth),risk:coverage(parts.risk),weekly:coverage(parts.weekly),technical:coverage(parts.technical)}}
}
ROOT.SenSeiSFocusExplain={explain,contributions,metricParts,pePoints,betaPoints};
if(typeof document==='undefined')return;

let lastTicker='',newsObserver=null,renderTimer=0;
function readDb(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}}
function ticker(){return String(document.querySelector('#siSymbol')?.value||localStorage.getItem(SEL)||'').trim().toUpperCase().replace(/\.DE$/,'')}
function stateLabel(e){return e.state==='ACTIVE'?'ACTIVE CONTEXT':e.state||'UNIVERSE'}
function macroFor(t){
  const groups={
    software:['ADBE','CRM','MSFT'],semis:['NVDA','AVGO','ASML','AMD'],platform:['GOOG','GOOGL','META'],consumer:['AMZN','AAPL','COST','NFLX'],finance:['JPM','V','MA']
  };
  if(groups.software.includes(t))return['Zinsen und Diskontsätze beeinflussen Software-Multiples.','Unternehmens-IT-Budgets bestimmen die Nachfrage.','KI-Monetarisierung und neuer Wettbewerb entscheiden über künftiges Wachstum.'];
  if(groups.semis.includes(t))return['Halbleiter- und Rechenzentrums-Capex ist zyklisch.','Exportregeln und China-Risiken können Nachfrage und Bewertung verändern.','KI-Investitionen stützen, hohe Erwartungen erhöhen aber das Enttäuschungsrisiko.'];
  if(groups.platform.includes(t))return['Werbebudgets und Konsumkonjunktur beeinflussen das Kerngeschäft.','Regulierung und Kartellverfahren bleiben Bewertungsrisiken.','KI-Investitionen müssen sich in Produktivität und Umsatz übersetzen.'];
  if(groups.consumer.includes(t))return['Konsum, Reallöhne und Finanzierungskosten prägen Nachfrage.','Logistik-, Inhalts- oder Hardwarekosten wirken auf Margen.','Wechselkurse können internationale Erlöse verschieben.'];
  if(groups.finance.includes(t))return['Zinskurve, Kreditqualität und Konjunktur bestimmen Erträge und Ausfälle.','Konsum- und Zahlungsvolumen sind zentrale Wachstumstreiber.','Regulierung und Kapitalanforderungen beeinflussen Renditen.'];
  return['Zinsen beeinflussen Bewertungsmultiplikatoren.','Branchenzyklus und Nachfrage bestimmen Umsatz und Margen.','Regulierung, Währungen und geopolitische Risiken können den Case verändern.'];
}
function newsItems(){
  const root=document.querySelector('#siNews');if(!root)return[];
  const out=[],seen=new Set();
  for(const a of root.querySelectorAll('a[href]')){
    const title=String(a.textContent||'').replace(/\s+/g,' ').trim();
    if(title.length<22||/Google.News.Suche|erneut versuchen|trotzdem anzeigen/i.test(title)||seen.has(title))continue;
    seen.add(title);
    const card=a.closest('article,li,[class*="story"],[class*="news"]')||a.parentElement;
    const text=String(card?.textContent||title).replace(/\s+/g,' ').trim();
    const stamp=(text.match(/\b\d{2}\.\d{2}\.\d{4}\s*[·,\-]?\s*\d{2}:\d{2}\s*Uhr\b/i)||text.match(/\b\d{2}\.\d{2}\.\d{4}\b/))?.[0]||'';
    let host='';try{host=new URL(a.href,location.href).hostname.replace(/^www\./,'')}catch{}
    const management=/\b(ceo|cfo|chief executive|chief financial|management|leadership|succession|steps down|resigns?|appoints?|vorstand|führung|nachfolge|tritt zurück|ernannt)\b/i.test(text);
    const risk=/\b(cut|cuts|lower|lowers|warning|probe|lawsuit|investigation|downgrade|senkt|warnt|klage|ermittlung)\b/i.test(text);
    const positive=/\b(raise|raises|record|beat|beats|upgrade|growth|hebt an|rekord|übertrifft|wachstum)\b/i.test(text);
    out.push({title,stamp,host,management,risk,positive,href:a.href});
    if(out.length>=4)break;
  }
  return out;
}
function rowHtml(x){return`<div class="fx-score-row"><div><strong>${esc(x.name)}</strong><span>${esc(x.value)} · Gewicht ${x.weight} %</span><small>${esc(x.why)}</small></div><b>${x.points==null?'—':fmt(x.points,0)}</b></div>`}
function detailsHtml(title,score,rows,coverageValue,note=''){
  return`<details class="fx-detail"><summary><span>${esc(title)} <em>Datenabdeckung ${coverageValue} %</em></span><b>${score==null?'—':fmt(score,0)}</b></summary>${note?`<p class="fx-note">${esc(note)}</p>`:''}<div class="fx-score-list">${rows.map(rowHtml).join('')}</div></details>`
}
function verdict(e,x){
  const strong=x.drivers.strong.map(v=>`${v[0]} ${fmt(v[1],0)}`).join(' und '),weak=x.drivers.weak.map(v=>`${v[0]} ${fmt(v[1],0)}`).join(' und ');
  let text=`Die stärksten Treiber sind ${strong}. Am wenigsten überzeugen derzeit ${weak}.`;
  if(e.state==='ACTIVE')text+=` ACTIVE entsteht durch einen aktuellen Calculator- oder Screenshot-Kontext, nicht allein durch den Score ${fmt(e.focusScore,0)}.`;
  if(e.hardRisk)text+=' Das Risk Gate blockiert eine positive Fokusbewertung.';
  else if(!e.gap?.down)text+=' Aktuell liegt kein Quality-Gap-Signal vor.';
  return text;
}
function newsHtml(){
  const items=newsItems();
  if(!items.length)return'<div class="fx-empty">Noch keine belastbaren Unternehmensmeldungen geladen. Die bestehende News-Pipeline ergänzt diesen Bereich automatisch.</div>';
  return items.map(i=>`<a class="fx-news" href="${esc(i.href)}" target="_blank" rel="noopener"><div><span>${i.management?'MANAGEMENT':i.risk?'RISIKO':i.positive?'POSITIV':'UNTERNEHMEN'}</span><strong>${esc(i.title)}</strong><small>${esc([i.stamp,i.host].filter(Boolean).join(' · '))}</small></div><b>↗</b></a>`).join('');
}
function render(){
  clearTimeout(renderTimer);renderTimer=setTimeout(()=>{
    const t=ticker(),db=readDb(),e=db.entries?.[t],view=document.querySelector('#view-stocks');
    let card=document.getElementById('focusExplainCard');
    if(!view||!e){card?.remove();return}
    if(!card){card=document.createElement('section');card.id='focusExplainCard';card.className='fx-explain';const toolbar=view.querySelector('.si-toolbar');toolbar?toolbar.insertAdjacentElement('afterend',card):view.prepend(card)}
    const x=explain(e),macro=macroFor(t),sum=x.contributions.reduce((a,v)=>a+v.points,0);
    const weightNote=x.contributions.some(v=>v.id==='gap')?'Alle sechs Dimensionen sind aktiv.':'Gap Opportunity ist nicht aktiv; die übrigen verfügbaren Gewichte werden auf 100 % normiert.';
    card.innerHTML=`
      <div class="fx-head"><div><span>WARUM IM FOKUS · ${esc(t)}</span><h3>${esc(stateLabel(e))} · ${fmt(e.focusScore,0)} / 100</h3></div><div class="fx-live">ERKLÄRBAR</div></div>
      <p class="fx-verdict">${esc(verdict(e,x))}</p>
      <div class="fx-section"><h4>So entsteht der Focus Score</h4><p class="fx-note">${esc(weightNote)} Technische Bereitschaft ist bewusst ein separater Timing-Score und fließt aktuell nicht in den Focus Score ein.</p>
        <div class="fx-contrib">${x.contributions.map(v=>`<div><span>${esc(v.label)} · ${fmt(v.score,0)} × ${fmt(v.effectiveWeight,1)} %</span><b>+${fmt(v.points,1)}</b></div>`).join('')}<div class="total"><span>Gerundetes Ergebnis</span><b>${fmt(sum,1)} → ${fmt(e.focusScore,0)}</b></div></div>
      </div>
      <div class="fx-section"><h4>Score-Details und Rohdaten</h4>
        ${detailsHtml('Qualität',e.qualityScore,x.parts.quality,x.coverage.quality)}
        ${detailsHtml('Bewertung',e.valuationScore,x.parts.valuation,x.coverage.valuation,e.historyStatus==='READY'?'Eigene Bewertungshistorie ist aktiv.':'Historische Einordnung bleibt bis 20 echten Snapshots im WARMING_UP.')}
        ${detailsHtml('Wachstum',e.growthScore,x.parts.growth,x.coverage.growth)}
        ${detailsHtml('Wochenrelevanz',e.weeklyRelevance,x.parts.weekly,x.coverage.weekly,'Misst, warum die Aktie gerade jetzt auffällt; nicht die langfristige Qualität.')}
        ${detailsHtml('Risikoqualität',e.riskScore,x.parts.risk,x.coverage.risk)}
        ${detailsHtml('Technische Bereitschaft',e.technicalReadiness,x.parts.technical,x.coverage.technical,'Aktuell nur Standort, Gap-Fortschritt und einfache Stabilisierung. Kein vollständiges H4/D1-Setup.')}
      </div>
      <div class="fx-grid">
        <div class="fx-section"><h4>Technische Einordnung</h4><p>${e.rangePosition==null?'52-Wochen-Lage nicht verfügbar.':`Der Kurs liegt bei ${fmt(e.rangePosition,0)} % der 52-Wochen-Spanne und ${pct(e.drawdown)} unter dem Hoch.`} ${e.gap?.down?`Das Abwärts-Gap ist zu ${fmt(e.gap.fillProgress,0)} % zurückerobert.`:'Kein aktives Abwärts-Gap wurde erkannt.'}</p><div class="fx-warning">Das ist ein Screening- und Standortsignal, noch keine bestätigte Long- oder Short-Idee.</div></div>
        <div class="fx-section"><h4>Makro- und Branchenfaktoren</h4><ul>${macro.map(v=>`<li>${esc(v)}</li>`).join('')}</ul><div class="fx-warning">Diese Faktoren sind derzeit Kontext und noch kein live berechneter Makro-Score.</div></div>
      </div>
      <div class="fx-section"><div class="fx-title-row"><h4>Aktuelle Unternehmenslage</h4><span>News verändern den ${fmt(e.focusScore,0)}er Score noch nicht stillschweigend</span></div>${newsHtml()}<p class="fx-note">Management-, CEO-/CFO-, Guidance-, Rechts- und operative Meldungen werden hier sichtbar, damit der reine Zahlen-Score nicht ohne Unternehmenskontext gelesen wird.</p></div>`;
    lastTicker=t;attachNewsObserver();
  },80)
}
function styles(){if(document.getElementById('focusExplainStyles'))return;const s=document.createElement('style');s.id='focusExplainStyles';s.textContent=`
.fx-explain{margin:12px 14px;padding:16px;border:1px solid rgba(48,209,88,.3);border-radius:18px;background:#0b0e12;color:#f7f8fa}.fx-head,.fx-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.fx-head span{font-size:9px;letter-spacing:.13em;color:#8c95a3;font-weight:900}.fx-head h3{margin:6px 0 0;font-size:23px}.fx-live{padding:6px 8px;border:1px solid rgba(48,209,88,.4);border-radius:999px;color:#30d158;font-size:8px;font-weight:900}.fx-verdict{margin:12px 0 0;color:#c8ced8;font-size:11px;line-height:1.55}.fx-section{margin-top:12px;padding:12px;border:1px solid #252b34;border-radius:14px;background:#10141a}.fx-section h4{margin:0 0 8px;font-size:12px}.fx-section p,.fx-section li{color:#a7afbc;font-size:10px;line-height:1.55}.fx-section ul{margin:8px 0 0;padding-left:17px}.fx-note,.fx-warning{color:#8c95a3!important;font-size:9px!important;line-height:1.45!important}.fx-warning{margin-top:8px;padding:8px;border:1px solid #343c48;border-radius:9px;background:#0d1014}.fx-contrib{display:grid;gap:5px}.fx-contrib>div{display:flex;justify-content:space-between;gap:10px;padding:7px 8px;border-radius:9px;background:#151a21;font-size:9px}.fx-contrib .total{border:1px solid #3a4452;background:#0b0e12;font-weight:900}.fx-detail{margin-top:7px;border:1px solid #2c3440;border-radius:11px;background:#0d1116;overflow:hidden}.fx-detail summary{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px;cursor:pointer;list-style:none}.fx-detail summary::-webkit-details-marker{display:none}.fx-detail summary span{font-size:10px;font-weight:900}.fx-detail summary em{display:block;margin-top:3px;color:#7f8996;font-size:8px;font-style:normal;font-weight:600}.fx-detail summary b{font-size:19px}.fx-detail>.fx-note{padding:0 10px}.fx-score-list{display:grid;gap:5px;padding:0 8px 8px}.fx-score-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:8px;border-radius:9px;background:#151a21}.fx-score-row strong{display:block;font-size:9px}.fx-score-row span,.fx-score-row small{display:block;margin-top:3px;color:#8c95a3;font-size:8px;line-height:1.35}.fx-score-row b{font-size:16px}.fx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.fx-title-row span{max-width:50%;text-align:right;color:#8c95a3;font-size:8px;line-height:1.35}.fx-news{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px;padding:9px;border:1px solid #2c3440;border-radius:10px;background:#151a21;color:#fff;text-decoration:none}.fx-news span{display:block;color:#ffd60a;font-size:7px;font-weight:900;letter-spacing:.08em}.fx-news strong{display:block;margin-top:3px;font-size:9px;line-height:1.35}.fx-news small{display:block;margin-top:4px;color:#8c95a3;font-size:8px}.fx-empty{padding:10px;border:1px dashed #343c48;border-radius:10px;color:#8c95a3;font-size:9px;line-height:1.45}@media(max-width:620px){.fx-explain{margin:10px 12px;padding:13px}.fx-grid{grid-template-columns:1fr}.fx-head h3{font-size:20px}.fx-title-row{display:block}.fx-title-row span{display:block;max-width:none;margin-top:4px;text-align:left}}
`;document.head.appendChild(s)}
function attachNewsObserver(){const root=document.querySelector('#siNews');if(!root||root.dataset.focusExplainObserved)return;newsObserver?.disconnect();root.dataset.focusExplainObserved='1';newsObserver=new MutationObserver(()=>render());newsObserver.observe(root,{childList:true,subtree:true})}
function boot(){styles();const view=document.querySelector('#view-stocks');if(!view)return;view.addEventListener('change',e=>{if(e.target?.id==='siSymbol')render()});const observer=new MutationObserver(()=>{render();attachNewsObserver()});observer.observe(view,{childList:true,subtree:true});window.addEventListener('storage',e=>{if(e.key===KEY||e.key===SEL)render()});render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
