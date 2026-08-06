(()=>{'use strict';
if(window.SenSeiSFetch)return;
const nativeFetch=window.fetch.bind(window);
const chain=[];
const DAX=new Set(['ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON','DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1','HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM','RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL']);
function profiles(){try{const rows=JSON.parse(localStorage.getItem('tradecalc-custom-stocks')||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
function mappedTicker(ticker){const raw=String(ticker||'').trim().toUpperCase();const profile=profiles().find(item=>String(item.ticker||'').toUpperCase()===raw);if(profile?.apiTicker)return String(profile.apiTicker);if(profile?.index==='DAX'||DAX.has(raw))return raw+'.DE';return raw}
function rewriteInput(input,url){return typeof input==='string'?url.toString():new Request(url.toString(),input)}
async function dispatch(index,input,init){const interceptor=chain[index];if(!interceptor)return nativeFetch(input,init);let called=false;const next=(nextInput=input,nextInit=init)=>{if(called)throw new Error('SENSEIS_FETCH_NEXT_CALLED_TWICE');called=true;return dispatch(index+1,nextInput,nextInit)};return interceptor(input,init,next)}
window.fetch=(input,init)=>dispatch(0,input,init);
window.SenSeiSFetch={
  use(interceptor){if(typeof interceptor!=='function')throw new TypeError('Fetch interceptor must be a function');chain.push(interceptor);return()=>{const index=chain.indexOf(interceptor);if(index>=0)chain.splice(index,1)}},
  native:nativeFetch,
  size:()=>chain.length,
  mappedTicker
};
window.SenSeiSFetch.use((input,init,next)=>{try{const raw=typeof input==='string'?input:input.url;if(!raw.includes('finnhub.io/api/v1/')||!raw.includes('symbol='))return next(input,init);const url=new URL(raw),current=url.searchParams.get('symbol')||'',mapped=mappedTicker(current);if(mapped&&mapped!==current){url.searchParams.set('symbol',mapped);input=rewriteInput(input,url)}}catch{}return next(input,init)});
})();
