(()=>{'use strict';
const VERSION='5.5';
const LABEL='FOUNDATION '+VERSION;
window.SENSEIS_VERSION=VERSION;
window.SENSEIS_VERSION_LABEL=LABEL;
window.SENSEIS_BUILD_LABEL='Focus Semantics & Data Integrity';
function apply(root=document){root.querySelectorAll?.('[data-senseis-version]').forEach(el=>{el.textContent=LABEL});root.querySelectorAll?.('.v37-version').forEach(el=>{el.textContent=LABEL});root.querySelectorAll?.('[data-senseis-build]').forEach(el=>{el.textContent=window.SENSEIS_BUILD_LABEL})}
function loadScript(key,src,next){if(document.querySelector(`script[data-senseis-${key}]`)){next?.();return}const s=document.createElement('script');s.dataset['senseis'+key.split('-').map(x=>x[0].toUpperCase()+x.slice(1)).join('')]='1';s.src=src;s.onload=()=>next?.();s.onerror=()=>next?.();document.head.appendChild(s)}
function loadExtras(){loadScript('event-integrity','./stock-event-integrity.js?v=1');loadScript('news-directness','./news-directness-v1.js?v=1')}
function loadListSemantics(){loadScript('focus-list-semantics','./focus-list-semantics-v2.js?v=1',loadExtras)}
function loadOverview(){loadScript('focus-overview','./focus-list-v2.js?v=3',loadListSemantics)}
function loadExplain(){loadScript('focus-explain-v2','./focus-explainability-v2.js?v=1',loadOverview)}
function loadDecision(){loadScript('focus-decision-v2','./focus-decision-v2.js?v=1',loadExplain)}
function loadMenu(){loadScript('focus-menu','./focus-menu.js?v=1',loadDecision)}
function loadQuality(){loadScript('focus-quality-v2','./focus-quality-v2.js?v=1',loadMenu)}
function loadFocus(){loadScript('focus','./focus-engine.js?v=1',loadQuality)}
function boot(){apply();loadFocus();const observer=new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes){if(node.nodeType===1)apply(node)}}});observer.observe(document.documentElement,{subtree:true,childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
