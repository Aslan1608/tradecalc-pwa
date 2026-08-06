const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('focus-engine.js','utf8');
const memory=new Map();
const context={
  console,
  localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},
  document:{readyState:'loading',addEventListener(){},querySelector(){return null},querySelectorAll(){return[]}},
  window:{},
  requestAnimationFrame:fn=>fn(),
  setTimeout,clearTimeout,
  Event:function(){},
  MutationObserver:function(){this.observe=()=>{}},
  alert(){},
  fetch:async()=>{throw new Error('network disabled in fixture test')}
};
context.window=context;
vm.createContext(context);
vm.runInContext(code,context);
const evaluate=context.SenSeiSFocusEngine.evaluate;
const qualityGap=evaluate(
  {symbol:'AMZN',name:'Amazon'},
  {c:210,o:190,pc:205,h:198,l:188},
  {metric:{peTTM:24,roeTTM:28,netProfitMarginTTM:16,grossMarginTTM:48,revenueGrowthTTMYoy:14,epsGrowthTTMYoy:18,currentRatioQuarterly:1.3,'totalDebt/totalEquityQuarterly':55,beta:1.2,'52WeekHigh':242,'52WeekLow':155,marketCapitalization:2200000,freeCashFlowMarginTTM:12,atr14:6}}
);
if(!qualityGap.gap.down)throw new Error('Expected downside gap');
if((qualityGap.gapOpportunity||0)<70)throw new Error('Expected Quality Gap Opportunity >= 70');
if(qualityGap.state!=='WATCH')throw new Error('Strong quality gap should promote to WATCH');
const damaged=evaluate(
  {symbol:'BAD',name:'Bad Co'},
  {c:9,o:9,pc:10,h:9.5,l:8.5},
  {metric:{peTTM:-5,roeTTM:-20,netProfitMarginTTM:-25,revenueGrowthTTMYoy:-30,epsGrowthTTMYoy:-40,currentRatioQuarterly:.4,'totalDebt/totalEquityQuarterly':400,beta:2.8,'52WeekHigh':40,'52WeekLow':8,marketCapitalization:500}}
);
if(!damaged.hardRisk)throw new Error('Risk gate should block damaged company');
if(damaged.state!=='UNIVERSE')throw new Error('Damaged company must not enter focus states');
if(qualityGap.historyStatus!=='WARMING_UP')throw new Error('History must warm up instead of inventing a percentile');
console.log('Focus Engine fixtures passed',JSON.stringify({qualityGap:{focus:qualityGap.focusScore,gap:qualityGap.gapOpportunity,state:qualityGap.state},damaged:{focus:damaged.focusScore,state:damaged.state}}));
