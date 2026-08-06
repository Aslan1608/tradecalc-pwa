(()=>{'use strict';
const VERSION='3.10';
const LABEL='FOUNDATION '+VERSION;
window.SENSEIS_VERSION=VERSION;
window.SENSEIS_VERSION_LABEL=LABEL;
window.SENSEIS_BUILD_LABEL='Installable PWA';
function apply(root=document){
  root.querySelectorAll?.('[data-senseis-version]').forEach(el=>{el.textContent=LABEL});
  root.querySelectorAll?.('.v37-version').forEach(el=>{el.textContent=LABEL});
  root.querySelectorAll?.('[data-senseis-build]').forEach(el=>{el.textContent=window.SENSEIS_BUILD_LABEL});
}
function boot(){
  apply();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){if(node.nodeType===1)apply(node)}
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
