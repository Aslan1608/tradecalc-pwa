const assert=require('node:assert/strict');
require('../focus-decision.js');
const api=globalThis.SenSeiSFocusDecision;
assert.ok(api,'decision API exported');

assert.equal(api.evaluate(null).code,'NOT_SCANNED');
assert.equal(api.evaluate({lastError:'HTTP_429'}).code,'DATA_INCOMPLETE');

const base={
  state:'WATCH',focusScore:72,qualityScore:69,valuationScore:77,growthScore:64,
  weeklyRelevance:82,technicalReadiness:62,riskScore:67,gapOpportunity:null,
  hardRisk:false
};
const adobe=api.evaluate(base);
assert.equal(adobe.code,'WAIT_TRIGGER','Adobe-style case waits for technical trigger');
assert.equal(adobe.group,'watch');

const checkNow=api.evaluate({...base,focusScore:79,technicalReadiness:74,weeklyRelevance:76});
assert.equal(checkNow.code,'CHECK_NOW');
assert.equal(checkNow.group,'check');
assert.match(checkNow.nextStep,/kein Entry-Signal/i);

const fundamental=api.evaluate({...base,state:'UNIVERSE',focusScore:58,qualityScore:73,weeklyRelevance:30,technicalReadiness:40});
assert.equal(fundamental.code,'FUNDAMENTAL_WATCH');

const blocked=api.evaluate({...base,hardRisk:true,qualityScore:31,riskScore:22});
assert.equal(blocked.code,'NOT_TRADABLE');
assert.equal(blocked.group,'all');

const low=api.evaluate({...base,state:'UNIVERSE',focusScore:42,qualityScore:48,weeklyRelevance:25,technicalReadiness:34,riskScore:52});
assert.equal(low.code,'NOT_PRIORITIZED');

const incomplete=api.evaluate({state:'WATCH',focusScore:70,qualityScore:null,valuationScore:null,weeklyRelevance:80,technicalReadiness:70,riskScore:60});
assert.equal(incomplete.code,'DATA_INCOMPLETE');

console.log('focus decision fixtures passed');
