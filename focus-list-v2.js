(()=>{'use strict';
const DB_KEY='senseis-focus-engine-v1';
const SELECT_KEY='senseis-stock-intelligence-symbol';
const TAB_KEY='senseis-focus-list-tab-v2';
const STATE_RANK={ACTIVE:6,FOCUS:5,WATCH:4,CANDIDATE:3,COOLDOWN:2,UNIVERSE:1};
const STATE_LABEL={ACTIVE:'ACTIVE CONTEXT',FOCUS:'FOCUS',WATCH:'WATCH',CANDIDATE:'CANDIDATE',COOLDOWN:'COOLDOWN',UNIVERSE:'UNIVERSE'};
const REASON_LABEL={QUALITY_STRONG:'Qualität stark',GROWTH_POSITIVE:'Wachstum positiv',VALUATION_HISTORIC_LOW:'Bewertung historisch niedrig',VALUATION_ATTRACTIVE_PROXY:'Bewertung/Kurslage attraktiv',DRAWDOWN_EXTREME:'Extremer Drawdown',DRAWDOWN_DEEP:'Deutlicher Drawdown',QUALITY_GAP_DOWN:'Quality Gap Opportunity',GAP_FULL_SESSION:'Gap vollständig offen',GAP_RECLAIM_STARTED:'Gap-Rückeroberung begonnen',GAP_FILL_50:'Gap mindestens 50 % gefüllt',STRUCTURAL_DAMAGE_RISK:'Risk Gate blockiert',RISK_GATE_PASSED:'Risk Gate bestanden',DELTA_HISTORY_WARMING_UP:'Historie wird aufgebaut'};
const TABS=[['check','🔥 Jetzt prüfen'],['watch','👀 Beobachten'],['all','📋 Alle'],['errors','⚠️ Datenfehler']];
let universeRows=[];
let activeTab=sessionStorage.getItem(TAB_KEY)||'check';
let running=false;
let renderTimer=0;
let hostObserver=null;

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const number=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
const fmt=(value,digits=0)=>number(value)==null?'—':number(value).toLocaleString('de-DE',{maximumFractionDigits:digits});
const sym=value=>String(value||'').trim().toUpperCase().replace(/\.DE$/,'');

function readDb(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'{}')}catch{return{}}}
function decision(entry){
  if(window.SenSeiSFocusDecision?.evaluate)return window.SenSeiSFocusDecision.evaluate(entry);
  if(!entry)return{code:'NOT_SCANNED',label:'NOCH NICHT GESCANNT',group:'errors',tone:'muted',priority:0,summary:'Für diese Aktie liegt noch kein Focus-Scan vor.'};
  if(entry.lastError)return{code:'DATA_ERROR',label:'DATENFEHLER',group:'errors',tone:'bad',priority:1,summary:'Die Datenquelle konnte diese Aktie nicht vollständig bewerten.'};
  if(['ACTIVE','FOCUS'].includes(entry.state))return{code:'CHECK',label:'JETZT PRÜFEN',group:'check',tone:'good',priority:5,summary:'Hohe Focus-Priorität. Chart und Risiken jetzt genauer prüfen.'};
  if(['WATCH','CANDIDATE','COOLDOWN'].includes(entry.state))return{code:'WATCH',label:'BEOBACHTEN',group:'watch',tone:'mid',priority:3,summary:'Interessant, aber noch nicht stark genug für die erste Prüfliste.'};
  return{code:'UNIVERSE',label:'KEIN AKTUELLER FOKUS',group:'all',tone:'muted',priority:1,summary:'Aktuell unter der Focus-Schwelle oder ohne ausreichende Wochenrelevanz.'};
}

function whyNot(entry){
  if(!entry)return['Noch nicht gescannt'];
  if(entry.lastError)return[`Abruffehler: ${String(entry.lastError).replace(/^Error:\s*/,'')}`];
  if(entry.hardRisk)return['Risk Gate blockiert die Aktie'];
  const reasons=[];
  if(number(entry.focusScore)!=null&&entry.focusScore<55)reasons.push(`Focus Score ${fmt(entry.focusScore)} liegt unter CANDIDATE 55`);
  if(number(entry.weeklyRelevance)!=null&&entry.weeklyRelevance<50)reasons.push('Aktuelle Wochenrelevanz ist gering');
  if(number(entry.qualityScore)!=null&&entry.qualityScore<55)reasons.push('Qualitätsscore ist noch zu schwach');
  if(number(entry.valuationScore)!=null&&entry.valuationScore<55)reasons.push('Bewertung/Kurslage ist aktuell nicht attraktiv genug');
  if(number(entry.technicalReadiness)!=null&&entry.technicalReadiness<55)reasons.push('Technische Lage ist noch nicht bereit');
  if(!reasons.length&&entry.state==='UNIVERSE')reasons.push('Keine ausreichende Kombination aus Qualität, Bewertung und aktueller Relevanz');
  return reasons.slice(0,2);
}

function combine(){
  const db=readDb();
  const entries=db.entries||{};
  return universeRows.map(item=>{
    const ticker=sym(item.symbol);
    const entry=entries[ticker]||null;
    const verdict=decision(entry);
    return{ticker,name:item.name||ticker,entry,verdict};
  });
}

function stats(rows){
  const successful=rows.filter(row=>row.entry&&!row.entry.lastError).length;
  const errors=rows.filter(row=>row.entry?.lastError).length;
  const pending=rows.filter(row=>!row.entry).length;
  const hidden=rows.filter(row=>row.entry&&!row.entry.lastError&&row.entry.state==='UNIVERSE'&&!row.entry.manualPin).length;
  return{total:rows.length,successful,errors,pending,hidden};
}

function visible(rows){
  if(activeTab==='all')return rows;
  if(activeTab==='errors')return rows.filter(row=>row.verdict.group==='errors');
  return rows.filter(row=>row.verdict.group===activeTab);
}

function sortRows(rows){
  return [...rows].sort((a,b)=>
    (b.verdict.priority-a.verdict.priority)||
    ((STATE_RANK[b.entry?.state]||0)-(STATE_RANK[a.entry?.state]||0))||
    ((number(b.entry?.focusScore)??-1)-(number(a.entry?.focusScore)??-1))||
    a.ticker.localeCompare(b.ticker)
  );
}

function rowHtml(row){
  const e=row.entry,v=row.verdict;
  const reasons=e?.reasons?.map(code=>REASON_LABEL[code]||code).filter(Boolean).slice(0,2)||[];
  const explanation=reasons.length?reasons:whyNot(e);
  const state=e?STATE_LABEL[e.state]||e.state:'NICHT GESCANNT';
  const score=number(e?.focusScore)==null?'—':fmt(e.focusScore);
  const updated=e?.updatedAt?new Date(e.updatedAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
  return`<button class="fl2-row" data-focus-symbol="${esc(row.ticker)}" type="button">
    <div class="fl2-main">
      <div class="fl2-title"><strong>${e?.manualPin?'★ ':''}${esc(row.ticker)}</strong><span>${esc(row.name)}</span></div>
      <div class="fl2-badges"><i class="${esc(v.tone)}">${esc(v.label)}</i><i>${esc(state)}</i>${updated?`<small>${esc(updated)}</small>`:''}</div>
      <p>${esc(v.summary)}</p>
      <div class="fl2-reasons">${explanation.map(text=>`<span>${esc(text)}</span>`).join('')}</div>
    </div>
    <div class="fl2-score"><b>${score}</b><span>Focus</span><em>›</em></div>
  </button>`;
}

function ensureStyles(){
  if(document.getElementById('focusListV2Styles'))return;
  const style=document.createElement('style');
  style.id='focusListV2Styles';
  style.textContent=`
  #view-focus #focusPanel{display:none!important}
  .fl2{display:grid;gap:11px}
  .fl2-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
  .fl2-stat{padding:10px 8px;border:1px solid #29313c;border-radius:12px;background:#0d1116;text-align:center}
  .fl2-stat b{display:block;font-size:18px}.fl2-stat span{display:block;margin-top:3px;color:#8993a2;font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
  .fl2-actions{display:flex;gap:8px;align-items:center;justify-content:space-between}
  .fl2-actions button{min-height:44px;padding:0 13px;border:1px solid #3b4552;border-radius:12px;background:#11161c;color:#fff;font-weight:900}
  .fl2-actions button.primary{border-color:rgba(48,209,88,.45);color:#30d158}.fl2-actions button:disabled{opacity:.55}
  .fl2-last{color:#8c95a3;font-size:9px;text-align:right}
  .fl2-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .fl2-tab{min-height:40px;padding:6px;border:1px solid #29313c;border-radius:11px;background:#0d1116;color:#8c95a3;font-size:9px;font-weight:900}
  .fl2-tab.active{background:#fff;color:#050607;border-color:#fff}
  .fl2-list{display:grid;gap:8px}
  .fl2-row{width:100%;display:grid;grid-template-columns:1fr auto;gap:10px;padding:12px;border:1px solid #29313c;border-radius:14px;background:#11161c;color:#fff;text-align:left}
  .fl2-title{display:flex;align-items:baseline;gap:7px}.fl2-title strong{font-size:13px}.fl2-title span{color:#a6afbc;font-size:10px}
  .fl2-badges{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:6px}.fl2-badges i{padding:4px 6px;border:1px solid #394351;border-radius:999px;color:#c8ced8;font-size:7px;font-style:normal;font-weight:900}.fl2-badges i.good{border-color:rgba(48,209,88,.45);color:#30d158}.fl2-badges i.mid{border-color:rgba(255,214,10,.38);color:#ffd60a}.fl2-badges i.bad{border-color:rgba(255,69,58,.45);color:#ff6961}.fl2-badges i.muted{color:#8993a2}.fl2-badges small{color:#727c8a;font-size:7px}
  .fl2-main p{margin:8px 0 0;color:#b1b9c5;font-size:9px;line-height:1.45}.fl2-reasons{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.fl2-reasons span{padding:4px 6px;border-radius:7px;background:#171d25;color:#8993a2;font-size:7px}
  .fl2-score{min-width:48px;text-align:center;align-self:center}.fl2-score b{display:block;font-size:24px}.fl2-score span{display:block;color:#7f8997;font-size:7px}.fl2-score em{display:block;margin-top:5px;color:#fff;font-size:18px;font-style:normal}
  .fl2-empty{padding:18px;border:1px dashed #394351;border-radius:14px;color:#8993a2;font-size:10px;line-height:1.5;text-align:center}
  @media(max-width:620px){.fl2-summary{grid-template-columns:repeat(3,1fr)}.fl2-tabs{grid-template-columns:1fr 1fr}.fl2-actions{align-items:stretch;flex-direction:column}.fl2-actions button{width:100%}.fl2-last{text-align:left}.fl2-row{padding:11px}.fl2-title{display:block}.fl2-title span{display:block;margin-top:2px}}
  `;
  document.head.appendChild(style);
}

function selectStock(ticker){
  const select=document.getElementById('siSymbol');
  const option=select&&[...select.options].find(item=>sym(item.value)===ticker);
  if(option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));try{localStorage.setItem(SELECT_KEY,option.value)}catch{}}
  const nav=[...document.querySelectorAll('.nav-btn[data-view="stocks"]')].find(button=>button.offsetParent!==null)||document.querySelector('.nav-btn[data-view="stocks"]');
  nav?.click();
}

async function runScan(){
  if(running)return;
  const engine=window.SenSeiSFocusEngine;
  if(!engine?.scan){alert('Focus Engine ist noch nicht bereit. Seite kurz neu öffnen.');return;}
  running=true;render();
  try{await engine.scan()}catch(error){console.error('Focus scan failed',error)}
  finally{running=false;render()}
}

function render(){
  clearTimeout(renderTimer);
  renderTimer=setTimeout(()=>{
    const mount=document.getElementById('focusMount');
    if(!mount)return;
    let root=document.getElementById('focusOverviewV2');
    if(!root){root=document.createElement('section');root.id='focusOverviewV2';root.className='fl2';mount.prepend(root)}
    const rows=combine(),counts=stats(rows),list=sortRows(visible(rows));
    const db=readDb();
    const last=db.lastScan?`Letzter Scan: ${new Date(db.lastScan).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`:'Noch kein vollständiger Scan';
    root.innerHTML=`
      <div class="fl2-summary">
        <div class="fl2-stat"><b>${counts.total}</b><span>Universum</span></div>
        <div class="fl2-stat"><b>${counts.successful}</b><span>Ausgewertet</span></div>
        <div class="fl2-stat"><b>${counts.hidden}</b><span>Unter Schwelle</span></div>
        <div class="fl2-stat"><b>${counts.pending}</b><span>Nicht gescannt</span></div>
        <div class="fl2-stat"><b>${counts.errors}</b><span>Datenfehler</span></div>
      </div>
      <div class="fl2-actions"><button id="focusScanV2" class="primary" ${running?'disabled':''}>${running?'Scan läuft …':'Fokus-Scan starten'}</button><div class="fl2-last">${esc(last)}<br>Keine Aktie verschwindet mehr stillschweigend.</div></div>
      <div class="fl2-tabs">${TABS.map(([id,label])=>`<button class="fl2-tab ${activeTab===id?'active':''}" data-focus-tab="${id}" type="button">${label}</button>`).join('')}</div>
      <div class="fl2-list">${list.length?list.map(rowHtml).join(''):`<div class="fl2-empty">In diesem Bereich gibt es aktuell keine Aktien. Unter „Alle“ bleibt das komplette Universum sichtbar.</div>`}</div>`;
    root.querySelector('#focusScanV2')?.addEventListener('click',runScan);
    root.querySelectorAll('[data-focus-tab]').forEach(button=>button.addEventListener('click',()=>{activeTab=button.dataset.focusTab;try{sessionStorage.setItem(TAB_KEY,activeTab)}catch{}render()}));
    root.querySelectorAll('[data-focus-symbol]').forEach(button=>button.addEventListener('click',()=>selectStock(button.dataset.focusSymbol)));
  },60);
}

async function loadUniverse(){
  try{
    const response=await fetch('./focus-universe.json',{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP_${response.status}`);
    const payload=await response.json();
    universeRows=Array.isArray(payload.tickers)?payload.tickers:[];
  }catch(error){
    console.error('Focus universe unavailable',error);
    universeRows=[];
  }
  render();
}

function observe(){
  const mount=document.getElementById('focusMount');
  if(!mount)return false;
  hostObserver?.disconnect();
  hostObserver=new MutationObserver(records=>{
    const own=document.getElementById('focusOverviewV2');
    if(own&&records.every(record=>record.target===own||own.contains(record.target)))return;
    render();
  });
  hostObserver.observe(mount,{childList:true,subtree:true});
  return true;
}

function boot(){
  ensureStyles();loadUniverse();
  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(observe()||attempts>30){clearInterval(timer);render()}},250);
  window.addEventListener('storage',event=>{if(event.key===DB_KEY)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
