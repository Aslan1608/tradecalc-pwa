(()=>{'use strict';
const ROOT=typeof window!=='undefined'?window:globalThis;
const KEY='senseis-focus-engine-v1',SEL='senseis-stock-intelligence-symbol';
const W={quality:30,valuation:20,growth:16,weekly:20,risk:10,gap:4};
const L={quality:'Qualität',valuation:'Bewertung',growth:'Wachstum',weekly:'Wochenrelevanz',risk:'Risikoqualität',gap:'Gap Opportunity'};
const n=v=>Number.isFinite(Number(v))?Number(v):null,cl=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
const fmt=(v,d=1)=>n(v)==null?'—':n(v).toLocaleString('de-DE',{maximumFractionDigits:d});
const pct=(v,d=1)=>n(v)==null?'—':`${n(v)>0?'+':''}${fmt(v,d)} %`;
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function weighted(rows){let s=0,w=0;for(const [v,x] of rows){if(v==null)continue;s+=cl(v)*x;w+=x}return w?s/w:null}
function linear(v,a,b){v=n(v);return v==null?null:cl((v-a)/(b-a)*100)}
function low(v,a,b){v=n(v);return v==null?null:cl((b-v)/(b-a)*100)}
function pePoints(v){v=n(v);if(v==null)return null;if(v<=0)return 10;if(v<8)return 45;if(v<=18)return 90;if(v<=25)return 78;if(v<=35)return 55;if(v<=50)return 32;return 15}
function betaPoints(v){v=n(v);if(v==null)return null;if(v<=1.15)return 90;if(v<=1.5)return 70;if(v<=2)return 45;return 20}
function dimensions(e){return[
 ['quality',e.qualityScore,W.quality],['valuation',e.valuationScore,W.valuation],['growth',e.growthScore,W.growth],
 ['weekly',e.weeklyRelevance,W.weekly],['risk',e.riskScore,W.risk],['gap',e.gapOpportunity,W.gap]
].map(([id,score,weight])=>({id,label:L[id],score:n(score),weight})).filter(x=>x.score!=null)}
function contributions(e){const rows=dimensions(e),sum=rows.reduce((a,x)=>a+x.weight,0);return rows.map(x=>({...x,effectiveWeight:x.weight/sum*100,points:x.score*x.weight/sum}))}
function parts(e){
 const m=e.metrics||{},g=e.gap||{},range=n(e.rangePosition),dd=n(e.drawdown),rangePts=range==null?null:100-range;
 const drawPts=dd==null?null:cl((Math.abs(Math.min(dd,0))-8)/27*100),gapPct=n(g.gapPct),gapPts=gapPct==null?null:cl((Math.abs(gapPct)-1.5)/8.5*100);
 return{
  quality:[['ROE',pct(m.roe),linear(m.roe,5,30),25,'Kapitalrendite'],['Nettomarge',pct(m.margin),linear(m.margin,0,25),22,'Profitabilität'],['Bruttomarge',pct(m.gross),linear(m.gross,15,65),12,'Preissetzungsmacht'],['Current Ratio',fmt(m.cur,2),linear(m.cur,.8,2.2),12,'Liquidität'],['FCF-Marge',pct(m.fcf),linear(m.fcf,0,20),14,'Cash Conversion'],['Marktgröße',m.cap==null?'—':`${fmt(m.cap/1000,1)} Mrd.`,m.cap==null?null:linear(Math.log10(Math.max(m.cap,1)),3,6),15,'Stabilitätsproxy']],
  valuation:[['KGV',fmt(m.pe,1),pePoints(m.pe),55,'Startband'],['52W-Lage',range==null?'—':`${fmt(range,0)} %`,rangePts,45,'Preisdislokation'],['Eigene Historie',e.historyStatus==='READY'?`${fmt(e.valuationPercentile,0)}. Perzentil`:`WARMING_UP ${e.historyCount||0}/20`,e.historyStatus==='READY'?100-n(e.valuationPercentile):null,40,'erst nach 20 Snapshots']],
  growth:[['Umsatzwachstum',pct(m.rev),linear(m.rev,-5,20),55,'Geschäftswachstum'],['EPS-Wachstum',pct(m.eps),linear(m.eps,-10,25),45,'Gewinnwachstum']],
  weekly:[['Drawdown',pct(dd),drawPts,60,'Warum gerade jetzt'],['Abwärts-Gap',g.down?pct(gapPct):'kein aktives Gap',g.down?gapPts:null,40,'zusätzlicher Relevanztrigger']],
  risk:[['Debt/Equity',pct(m.de),low(m.de,30,250),45,'Verschuldung'],['Beta',fmt(m.beta,2),betaPoints(m.beta),30,'Marktsensitivität'],['Current Ratio',fmt(m.cur,2),linear(m.cur,.7,2),25,'Liquiditätspuffer']],
  technical:[['52W-Standort',range==null?'—':`${fmt(range,0)} %`,rangePts,55,'nur Standort'],['Gap-Fill',g.down?`${fmt(g.fillProgress,0)} %`:'kein aktives Gap',g.down?n(g.fillProgress):null,35,'Rückeroberung'],['Stabilisierung',g.down?(n(g.current)>=n(g.open)?'über Gap-Eröffnung':'unter Gap-Eröffnung'):'nicht anwendbar',g.down?(n(g.current)>=n(g.open)?75:30):null,10,'einfache Prüfung']]
 }
}
function coverage(rows){const total=rows.reduce((a,x)=>a+x[3],0),got=rows.filter(x=>x[2]!=null).reduce((a,x)=>a+x[3],0);return total?Math.round(got/total*100):0}
function explain(e){const c=contributions(e),p=parts(e);return{contributions:c,total:c.reduce((a,x)=>a+x.points,0),parts:p,coverage:Object.fromEntries(Object.entries(p).map(([k,v])=>[k,coverage(v)]))}}
ROOT.SenSeiSFocusExplain={explain,contributions,parts,pePoints,betaPoints};
if(typeof document==='undefined')return;

let renderTimer=0,newsObserver=null;
function db(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}}
function ticker(){return String(document.querySelector('#siSymbol')?.value||localStorage.getItem(SEL)||'').trim().toUpperCase().replace(/\.DE$/,'')}
function macro(t){
 if(['ADBE','CRM','MSFT'].includes(t))return['Zinsen beeinflussen Software-Multiples.','IT-Budgets bestimmen die Nachfrage.','KI-Monetarisierung und Wettbewerb entscheiden über künftiges Wachstum.'];
 if(['NVDA','AVGO','ASML','AMD'].includes(t))return['Halbleiter-Capex ist zyklisch.','Exportregeln und China-Risiken beeinflussen Nachfrage.','KI-Investitionen stützen, hohe Erwartungen erhöhen das Enttäuschungsrisiko.'];
 if(['GOOG','GOOGL','META'].includes(t))return['Werbebudgets hängen an Konsum und Konjunktur.','Regulierung bleibt ein Bewertungsrisiko.','KI-Ausgaben müssen sich in Produktivität und Umsatz übersetzen.'];
 if(['AMZN','AAPL','COST','NFLX'].includes(t))return['Konsum und Finanzierungskosten prägen Nachfrage.','Kosten und Margen bleiben zentrale Treiber.','Währungen beeinflussen internationale Erlöse.'];
 if(['JPM','V','MA'].includes(t))return['Zinsen, Kreditqualität und Konsum bestimmen Erträge.','Zahlungsvolumen ist ein Wachstumstreiber.','Regulierung und Kapitalanforderungen beeinflussen Renditen.'];
 return['Zinsen beeinflussen Bewertung.','Branchenzyklus beeinflusst Umsatz und Margen.','Regulierung, Währungen und Geopolitik bleiben Risiken.'];
}
function news(){
 const root=document.querySelector('#siNews');if(!root)return[];const out=[],seen=new Set();
 for(const a of root.querySelectorAll('a[href]')){
  const title=String(a.textContent||'').replace(/\s+/g,' ').trim();if(title.length<22||seen.has(title)||/Google.News|erneut versuchen|trotzdem anzeigen/i.test(title))continue;seen.add(title);
  const box=a.closest('article,li,[class*="story"],[class*="news"]')||a.parentElement,text=String(box?.textContent||title).replace(/\s+/g,' ').trim();
  const stamp=(text.match(/\d{2}\.\d{2}\.\d{4}\s*[·,\-]?\s*\d{2}:\d{2}\s*Uhr/i)||text.match(/\d{2}\.\d{2}\.\d{4}/))?.[0]||'';
  let host='';try{host=new URL(a.href,location.href).hostname.replace(/^www\./,'')}catch{}
  const type=/\b(ceo|cfo|chief executive|chief financial|management|leadership|succession|steps down|resigns?|appoints?|vorstand|führung|nachfolge|tritt zurück|ernannt)\b/i.test(text)?'MANAGEMENT':/\b(cut|lower|warning|probe|lawsuit|investigation|downgrade|senkt|warnt|klage|ermittlung)\b/i.test(text)?'RISIKO':/\b(raise|record|beat|upgrade|growth|hebt an|rekord|übertrifft|wachstum)\b/i.test(text)?'POSITIV':'UNTERNEHMEN';
  out.push({title,stamp,host,type,href:a.href});if(out.length===4)break;
 }
 return out;
}
function itemRow(x){return`<div class="fxr"><div><b>${esc(x[0])}</b><span>${esc(x[1])} · Gewicht ${x[3]} %</span><small>${esc(x[4])}</small></div><strong>${x[2]==null?'—':fmt(x[2],0)}</strong></div>`}
function detail(title,score,rows,cov,note=''){return`<details class="fxd"><summary><span>${esc(title)}<em>Datenabdeckung ${cov} %</em></span><b>${score==null?'—':fmt(score,0)}</b></summary>${note?`<p>${esc(note)}</p>`:''}<div>${rows.map(itemRow).join('')}</div></details>`}
function newsHtml(){const rows=news();return rows.length?rows.map(x=>`<a class="fxn" href="${esc(x.href)}" target="_blank" rel="noopener"><span>${x.type}</span><b>${esc(x.title)}</b><small>${esc([x.stamp,x.host].filter(Boolean).join(' · '))}</small></a>`).join(''):'<div class="fxempty">Noch keine belastbaren Meldungen geladen. Die News-Pipeline ergänzt diesen Bereich automatisch.</div>'}
function render(){
 clearTimeout(renderTimer);renderTimer=setTimeout(()=>{
  const view=document.querySelector('#view-stocks'),t=ticker(),e=db().entries?.[t];let card=document.getElementById('focusExplainCard');
  if(!view||!e){card?.remove();return}if(!card){card=document.createElement('section');card.id='focusExplainCard';card.className='fxe';const tb=view.querySelector('.si-toolbar');tb?tb.insertAdjacentElement('afterend',card):view.prepend(card)}
  const x=explain(e),rank=[['Bewertung',e.valuationScore],['Wochenrelevanz',e.weeklyRelevance],['Qualität',e.qualityScore],['Wachstum',e.growthScore],['Risikoqualität',e.riskScore],['Technische Bereitschaft',e.technicalReadiness]].filter(v=>n(v[1])!=null).sort((a,b)=>b[1]-a[1]);
  const strongest=rank.slice(0,2).map(v=>`${v[0]} ${fmt(v[1],0)}`).join(' und '),weakest=[...rank].sort((a,b)=>a[1]-b[1]).slice(0,2).map(v=>`${v[0]} ${fmt(v[1],0)}`).join(' und ');
  const active=e.state==='ACTIVE'?`ACTIVE CONTEXT entsteht durch einen Calculator- oder Screenshot-Kontext, nicht allein durch den ${fmt(e.focusScore,0)}er Score. `:'';
  const norm=x.contributions.some(v=>v.id==='gap')?'Alle Dimensionen sind aktiv.':'Gap Opportunity ist nicht aktiv; die übrigen Gewichte werden auf 100 % normiert.';
  card.innerHTML=`<header><div><span>WARUM IM FOKUS · ${esc(t)}</span><h3>${e.state==='ACTIVE'?'ACTIVE CONTEXT':esc(e.state)} · ${fmt(e.focusScore,0)} / 100</h3></div><i>ERKLÄRBAR</i></header>
  <p class="fxv">${esc(active)}Stärkste Treiber: ${esc(strongest)}. Schwächste Bereiche: ${esc(weakest)}. ${e.gap?.down?'Ein Abwärts-Gap ist aktiv.':'Aktuell kein Quality-Gap-Signal.'}</p>
  <section><h4>So entsteht der Focus Score</h4><p>${esc(norm)} Technische Bereitschaft bleibt bewusst ein separater Timing-Score.</p><div class="fxc">${x.contributions.map(v=>`<div><span>${esc(v.label)} ${fmt(v.score,0)} × ${fmt(v.effectiveWeight,1)} %</span><b>+${fmt(v.points,1)}</b></div>`).join('')}<div class="total"><span>Gerundetes Ergebnis</span><b>${fmt(x.total,1)} → ${fmt(e.focusScore,0)}</b></div></div></section>
  <section><h4>Rohdaten hinter den Scores</h4>${detail('Qualität',e.qualityScore,x.parts.quality,x.coverage.quality)}${detail('Bewertung',e.valuationScore,x.parts.valuation,x.coverage.valuation,e.historyStatus==='READY'?'Eigene Historie aktiv.':'Historie bleibt bis 20 echten Snapshots im WARMING_UP.')}${detail('Wachstum',e.growthScore,x.parts.growth,x.coverage.growth)}${detail('Wochenrelevanz',e.weeklyRelevance,x.parts.weekly,x.coverage.weekly,'Misst, warum die Aktie gerade jetzt auffällt.')}${detail('Risikoqualität',e.riskScore,x.parts.risk,x.coverage.risk)}${detail('Technische Bereitschaft',e.technicalReadiness,x.parts.technical,x.coverage.technical,'Noch kein vollständiges H4/D1-Setup.')}</section>
  <div class="fxgrid"><section><h4>Technische Einordnung</h4><p>${e.rangePosition==null?'52-Wochen-Lage nicht verfügbar.':`Kurs bei ${fmt(e.rangePosition,0)} % der 52-Wochen-Spanne und ${pct(e.drawdown)} unter dem Hoch.`} ${e.gap?.down?`Gap-Fill ${fmt(e.gap.fillProgress,0)} %.`:'Kein aktives Gap.'}</p><div class="warn">Screening- und Standortsignal, noch keine bestätigte Trade-Idee.</div></section><section><h4>Makro- und Branchenfaktoren</h4><ul>${macro(t).map(v=>`<li>${esc(v)}</li>`).join('')}</ul><div class="warn">Kontext, noch kein live berechneter Makro-Score.</div></section></div>
  <section><h4>Aktuelle Unternehmenslage</h4>${newsHtml()}<p>CEO-/CFO-, Management-, Guidance-, Rechts- und operative Meldungen werden hier sichtbar. Sie verändern den Focus Score derzeit nicht stillschweigend.</p></section>`;
  attachNews();
 },100)
}
function attachNews(){const root=document.querySelector('#siNews');if(!root||root.dataset.fxObserved)return;newsObserver?.disconnect();root.dataset.fxObserved='1';newsObserver=new MutationObserver(()=>render());newsObserver.observe(root,{childList:true,subtree:true})}
function styles(){if(document.getElementById('focusExplainStyles'))return;const s=document.createElement('style');s.id='focusExplainStyles';s.textContent=`.fxe{margin:12px 14px;padding:15px;border:1px solid rgba(48,209,88,.3);border-radius:18px;background:#0b0e12;color:#f7f8fa}.fxe header{display:flex;justify-content:space-between;gap:10px}.fxe header span{font-size:9px;letter-spacing:.12em;color:#8c95a3;font-weight:900}.fxe h3{margin:5px 0 0;font-size:22px}.fxe header i{height:max-content;padding:6px 8px;border:1px solid rgba(48,209,88,.4);border-radius:999px;color:#30d158;font-size:8px;font-style:normal;font-weight:900}.fxv{color:#c7ced8!important;font-size:11px!important}.fxe section{margin-top:11px;padding:11px;border:1px solid #252b34;border-radius:13px;background:#10141a}.fxe h4{margin:0 0 7px;font-size:12px}.fxe p,.fxe li{color:#9fa8b6;font-size:9px;line-height:1.5}.fxc{display:grid;gap:5px}.fxc>div{display:flex;justify-content:space-between;gap:8px;padding:7px 8px;border-radius:8px;background:#151a21;font-size:9px}.fxc .total{border:1px solid #3a4452;font-weight:900}.fxd{margin-top:6px;border:1px solid #2c3440;border-radius:10px;background:#0d1116;overflow:hidden}.fxd summary{display:flex;justify-content:space-between;align-items:center;padding:9px;cursor:pointer;list-style:none}.fxd summary::-webkit-details-marker{display:none}.fxd summary span{font-size:10px;font-weight:900}.fxd summary em{display:block;color:#7f8996;font-size:8px;font-style:normal}.fxd summary b{font-size:18px}.fxd>p{padding:0 9px}.fxd>div{display:grid;gap:5px;padding:0 7px 7px}.fxr{display:grid;grid-template-columns:1fr auto;gap:8px;padding:7px;border-radius:8px;background:#151a21}.fxr b,.fxr span,.fxr small{display:block}.fxr b{font-size:9px}.fxr span,.fxr small{margin-top:3px;color:#8c95a3;font-size:8px}.fxr strong{font-size:15px}.fxgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.warn{margin-top:7px;padding:7px;border:1px solid #343c48;border-radius:8px;color:#8c95a3;font-size:8px}.fxn{display:block;margin-top:6px;padding:8px;border:1px solid #2c3440;border-radius:9px;background:#151a21;color:#fff;text-decoration:none}.fxn span{color:#ffd60a;font-size:7px;font-weight:900}.fxn b,.fxn small{display:block;margin-top:3px}.fxn b{font-size:9px;line-height:1.35}.fxn small{color:#8c95a3;font-size:8px}.fxempty{padding:9px;border:1px dashed #343c48;border-radius:9px;color:#8c95a3;font-size:9px}@media(max-width:620px){.fxe{margin:10px 12px;padding:12px}.fxgrid{grid-template-columns:1fr}.fxe h3{font-size:19px}}`;document.head.appendChild(s)}
function boot(){styles();const view=document.querySelector('#view-stocks');if(!view)return;view.addEventListener('change',e=>{if(e.target?.id==='siSymbol')render()});const hostObserver=new MutationObserver(records=>{const card=document.getElementById('focusExplainCard');if(card&&records.every(r=>r.target===card||card.contains(r.target)))return;render();attachNews()});hostObserver.observe(view,{childList:true,subtree:true});window.addEventListener('storage',e=>{if(e.key===KEY||e.key===SEL)render()});render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
