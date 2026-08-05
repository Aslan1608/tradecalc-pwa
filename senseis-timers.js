(()=>{'use strict';
if(window.SenSeiSTimers)return;
const downstreamSetInterval=window.setInterval.bind(window);
const downstreamClearInterval=window.clearInterval.bind(window);
const registry=new Map();
let nextId=1;
function normalizeHandler(handler){
  if(typeof handler==='function')return handler;
  const source=String(handler||'');
  return()=>{try{Function(source)()}catch(error){console.warn('SenSeiS timer handler failed',error)}};
}
function normalizeDelay(delay){
  let ms=Math.max(250,Number(delay)||0);
  const stack=String(new Error().stack||'');
  if(stack.includes('news-intelligence-recall-patch'))ms=Math.max(ms,5000);
  return ms;
}
function start(entry){
  if(entry.nativeId||document.hidden)return;
  entry.nativeId=downstreamSetInterval(entry.handler,entry.delay,...entry.args);
}
function stop(entry){
  if(!entry.nativeId)return;
  downstreamClearInterval(entry.nativeId);
  entry.nativeId=0;
}
window.setInterval=function(handler,delay,...args){
  const id=nextId++;
  const entry={id,handler:normalizeHandler(handler),delay:normalizeDelay(delay),args,nativeId:0};
  registry.set(id,entry);
  start(entry);
  return id;
};
window.clearInterval=function(id){
  const entry=registry.get(id);
  if(!entry){downstreamClearInterval(id);return;}
  stop(entry);
  registry.delete(id);
};
function pauseAll(){for(const entry of registry.values())stop(entry)}
function resumeAll(){for(const entry of registry.values())start(entry)}
document.addEventListener('visibilitychange',()=>{document.hidden?pauseAll():resumeAll()});
window.SenSeiSTimers={pauseAll,resumeAll,size:()=>registry.size,minInterval:250,newsPollInterval:5000};
})();
