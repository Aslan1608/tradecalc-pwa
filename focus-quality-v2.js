(()=>{'use strict';
const ROOT=typeof window!=='undefined'?window:globalThis;
const DB_KEY='senseis-focus-engine-v1';
const DAY=86400000;
const WEIGHTS={quality:30,valuation:25,growth:20,risk:15,dislocation:10};
const n=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const cl=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
function weighted(rows){let sum=0,w=0;for(const [value,weight] of rows){if(n(value)==null)continue;sum+=cl(value)*weight;w+=weight}return w?Math.round(sum/w):null}
function scaleAbs(value,start,full){value=Math.abs(n(value)||0);return cl((value-start)/(full-start)*100)}
function readDb(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'{}')}catch{return{}}}
function saveDb(db){try{localStorage.setItem(DB_KEY,JSON.stringify(db))}catch{}}
function historyDelta(db,ticker,entry){
  const rows=(db.snapshots?.[ticker]||[]).filter(x=>x&&x.date&&n(x.price)!=null).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(!rows.length)return{status:'WARMING_UP',days:0,pricePct:null,drawdownPts:null};
  const latestDate=new Date((entry.updatedAt||new Date().toISOString()).slice(0,10)+'T12:00:00Z');
  let prior=null;
  for(const row of rows){const d=new Date(String(row.date).slice(0,10)+'T12:00:00Z');if((latestDate-d)>=5*DAY)prior=row}
  if(!prior)return{status:'WARMING_UP',days:rows.length,pricePct:null,drawdownPts:null};
  const price=n(entry.price),oldPrice=n(prior.price),dd=n(entry.drawdown),oldDd=n(prior.drawdown);
  return{status:'READY',days:Math.round((latestDate-new Date(prior.date+'T12:00:00Z'))/DAY),pricePct:price!=null&&oldPrice>0?(price/oldPrice-1)*100:null,drawdownPts:dd!=null&&oldDd!=null?dd-oldDd:null};
}
function priceDislocation(entry){
  const dd=n(entry.drawdown),range=n(entry.rangePosition),gapPct=n(entry.gap?.gapPct);
  const drawScore=dd==null?null:cl((Math.abs(Math.min(dd,0))-10)/35*100);
  const rangeScore=range==null?null:100-cl(range);
  const gapScore=gapPct==null?null:scaleAbs(gapPct,1.5,10);
  return weighted([[drawScore,55],[rangeScore,35],[gapScore,10]]);
}
function currentRelevance(db,ticker,entry){
  const price=n(entry.price),prev=n(entry.gap?.previousClose),gapPct=n(entry.gap?.gapPct);
  const dailyPct=price!=null&&prev>0?(price/prev-1)*100:null;
  const dailyScore=dailyPct==null?null:scaleAbs(dailyPct,.75,6);
  const gapScore=gapPct==null?null:scaleAbs(gapPct,1.25,8);
  const delta=historyDelta(db,ticker,entry);
  const weekMove=delta.pricePct==null?null:scaleAbs(delta.pricePct,2,12);
  const drawShift=delta.drawdownPts==null?null:scaleAbs(delta.drawdownPts,2,12);
  const score=weighted([[dailyScore,35],[gapScore,30],[weekMove,25],[drawShift,10]]);
  const direction=dailyPct==null?'UNKNOWN':dailyPct>=1?'UP':dailyPct<=-1?'DOWN':'FLAT';
  return{score,status:delta.status,dailyPct,weekPricePct:delta.pricePct,drawdownShift:delta.drawdownPts,direction,historyDays:delta.days};
}
function opportunity(entry,dislocation){return weighted([[entry.qualityScore,WEIGHTS.quality],[entry.valuationScore,WEIGHTS.valuation],[entry.growthScore,WEIGHTS.growth],[entry.riskScore,WEIGHTS.risk],[dislocation,WEIGHTS.dislocation]])}
function restate(entry){
  if(entry.state==='ACTIVE')return'ACTIVE';
  if(entry.hardRisk)return entry.manualPin?'WATCH':'UNIVERSE';
  const score=n(entry.focusScore)||0,now=Date.now();
  if(entry.state==='FOCUS'&&n(entry.minimumStayUntil)>now)return'FOCUS';
  if(score>=80)return'FOCUS';
  if(entry.state==='FOCUS'&&score>=68)return'FOCUS';
  if(score>=68||entry.manualPin)return'WATCH';
  if(score>=55)return'CANDIDATE';
  return'UNIVERSE';
}
function enrichEntry(db,ticker,entry){
  if(!entry||entry.lastError)return entry;
  const dislocation=priceDislocation(entry);
  const relevance=currentRelevance(db,ticker,entry);
  const focus=opportunity(entry,dislocation);
  const oldTechnical=n(entry.technicalLocationScore)??n(entry.technicalReadiness);
  const gapFill=n(entry.gap?.fillProgress);
  const recoveryEvidence=(relevance.dailyPct!=null&&relevance.dailyPct>=1)||(gapFill!=null&&gapFill>=20&&gapFill<100);
  const next={...entry,
    scoringModel:'FOCUS_V2_SEMANTIC',
    opportunityScore:focus,
    focusScore:focus,
    priceDislocationScore:dislocation,
    currentRelevanceScore:relevance.score,
    currentRelevanceStatus:relevance.status,
    currentRelevanceDirection:relevance.direction,
    currentDailyMovePct:relevance.dailyPct,
    currentWeekMovePct:relevance.weekPricePct,
    currentDrawdownShift:relevance.drawdownShift,
    relevanceHistoryDays:relevance.historyDays,
    technicalLocationScore:oldTechnical,
    recoveryEvidence,
    scoreMeaning:'Opportunity, not direction'
  };
  next.state=restate(next);
  const reasons=(entry.reasons||[]).filter(x=>!['DRAWDOWN_EXTREME','DRAWDOWN_DEEP'].includes(x));
  if(dislocation>=75)reasons.push('PRICE_DISLOCATION_HIGH');else if(dislocation>=55)reasons.push('PRICE_DISLOCATION_MEDIUM');
  if(relevance.score>=65)reasons.push('CURRENT_RELEVANCE_HIGH');
  if(relevance.status!=='READY')reasons.push('CURRENT_RELEVANCE_WARMING_UP');
  next.reasons=[...new Set(reasons)];
  return next;
}
function enrichAll(){const db=readDb();if(!db.entries)return db;for(const [ticker,entry] of Object.entries(db.entries))db.entries[ticker]=enrichEntry(db,ticker,entry);db.focusModel='FOCUS_V2_SEMANTIC';db.focusModelUpdatedAt=new Date().toISOString();saveDb(db);try{window.dispatchEvent(new CustomEvent('senseis-focus-v2-updated'))}catch{}return db}
function wrap(){const engine=ROOT.SenSeiSFocusEngine;if(!engine?.scan||engine.__semanticV2)return false;const original=engine.scan.bind(engine);engine.scan=async(...args)=>{const result=await original(...args);enrichAll();return result};engine.__semanticV2=true;engine.enrichV2=enrichAll;enrichAll();return true}
ROOT.SenSeiSFocusQualityV2={weights:WEIGHTS,weighted,priceDislocation,currentRelevance,opportunity,enrichEntry,enrichAll,historyDelta};
if(typeof module!=='undefined'&&module.exports)module.exports={weights:WEIGHTS,weighted,priceDislocation,currentRelevance,opportunity,enrichEntry,historyDelta};
if(typeof document!=='undefined'){let tries=0;const timer=setInterval(()=>{tries++;if(wrap()||tries>40)clearInterval(timer)},100);window.addEventListener('senseis-focus-updated',()=>enrichAll());}
})();
