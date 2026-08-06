const assert=require('node:assert/strict');
require('../focus-explainability.js');
const api=globalThis.SenSeiSFocusExplain;
assert.ok(api,'explainability API exported');
const adobe={
  ticker:'ADBE',state:'ACTIVE',focusScore:72,qualityScore:69,valuationScore:77,growthScore:64,
  weeklyRelevance:82,technicalReadiness:62,riskScore:67,gapOpportunity:null,
  rangePosition:38,drawdown:-30.1,historyStatus:'WARMING_UP',historyCount:0,valuationPercentile:null,
  metrics:{pe:14.8,roe:30,margin:26,gross:89,cur:1.1,de:55,beta:1.45,rev:11,eps:13,fcf:30,cap:104376},
  gap:{down:false,gapPct:null,fillProgress:null,open:null,current:259.32}
};
const explained=api.explain(adobe);
assert.equal(explained.contributions.some(x=>x.id==='gap'),false,'inactive gap is excluded');
assert.equal(explained.contributions.some(x=>x.id==='technical'),false,'technical readiness is separate from focus score');
assert.ok(Math.abs(explained.total-72.33)<0.2,`expected transparent total near 72.33, got ${explained.total}`);
const weekly=explained.parts.weekly.find(x=>x[0]==='Drawdown');
assert.ok(Math.abs(weekly[2]-81.85)<0.2,'drawdown explains weekly relevance near 82');
const technical=explained.parts.technical.find(x=>x[0]==='52W-Standort');
assert.equal(technical[2],62,'38% range position maps to 62 technical location points');
console.log('focus explainability fixtures passed');
