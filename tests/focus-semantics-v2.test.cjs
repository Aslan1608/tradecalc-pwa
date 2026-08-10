const assert=require('assert');
const focus=require('../focus-quality-v2.js');
const decision=require('../focus-decision-v2.js');
const financial=require('../stock-financials-recovery.js');
const news=require('../news-directness-v1.js');

const db={snapshots:{NFLX:[
  {date:'2026-08-01',price:72.00,drawdown:-43.0,pe:22.1},
  {date:'2026-08-07',price:74.14,drawdown:-41.5,pe:22.62}
]}};
const nflx={
  ticker:'NFLX',state:'WATCH',manualPin:false,hardRisk:false,
  qualityScore:71,valuationScore:81,growthScore:91,riskScore:67,
  weeklyRelevance:100,technicalReadiness:85,
  price:74.14,drawdown:-41.5,rangePosition:15,
  gap:{gapPct:-0.77,previousClose:73.69,fillProgress:null,current:74.14,open:73.12,down:false},
  updatedAt:'2026-08-07T20:00:00Z',reasons:[]
};
const enriched=focus.enrichEntry(db,'NFLX',nflx);
assert(enriched.priceDislocationScore>=75,'NFLX should be strongly price-dislocated');
assert(enriched.currentRelevanceScore<30,'old drawdown must not inflate current relevance');
assert(enriched.focusScore>=70&&enriched.focusScore<=85,'opportunity should remain attractive but not directional');
assert.strictEqual(enriched.technicalLocationScore,85,'old technical score becomes price-location context only');
const verdict=decision.evaluate(enriched);
assert.strictEqual(verdict.code,'RECOVERY_CANDIDATE','NFLX-like case should be recovery candidate, not technical buy/readiness');
assert(!/JETZT TECHNISCH PRÜFEN/.test(verdict.label),'old technical-threshold label must be gone');

const parsed=financial.parseFinnhub({data:[{year:2025,endDate:'2025-12-31',report:{ic:[
  {concept:'AdvertisingRevenue',label:'Advertising revenue',value:254900000},
  {concept:'Revenues',label:'Revenues',value:39000000000},
  {concept:'NetIncomeLoss',label:'Net income',value:11000000000},
  {concept:'OperatingIncomeLoss',label:'Operating income',value:13000000000}
],cf:[{concept:'DepreciationDepletionAndAmortization',label:'Depreciation and amortization',value:1500000000}]}}]});
assert.strictEqual(parsed.annual[0].revenue,39000000000,'parser must prefer total revenue over a small revenue sub-line');
assert.strictEqual(parsed.annual[0].netIncome,11000000000);
assert.strictEqual(parsed.annual[0].ebitdaApprox,14500000000);

const info={ticker:'NFLX',aliases:['Netflix','NFLX']};
assert.strictEqual(news.directTitle('Netflix Calendar Spread: A Smart Play for a Neutral Outlook',info),true);
assert.strictEqual(news.directTitle("Disney's Quarterly Earnings Top Views",info),false);
assert.strictEqual(news.directTitle('Warner Bros. Posts Surprise Quarterly Profit Amid Streaming Gains',info),false);

console.log('Focus semantic v2 fixtures passed');
