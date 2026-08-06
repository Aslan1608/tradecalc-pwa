(()=>{'use strict';
const VERSION='5.4';
const LABEL='FOUNDATION '+VERSION;
window.SENSEIS_VERSION=VERSION;
window.SENSEIS_VERSION_LABEL=LABEL;
window.SENSEIS_BUILD_LABEL='Focus Decision Status';
function apply(root=document){root.querySelectorAll?.('[data-senseis-version]').forEach(el=>{el.textContent=LABEL});root.querySelectorAll?.('.v37-version').forEach(el=>{el.textContent=LABEL});root.querySelectorAll?.('[data-senseis-build]').forEach(el=>{el.textContent=window.SENSEIS_BUILD_LABEL})}
function loadOverview(){if(document.querySelector('script[data-senseis-focus-overview]'))return;const script=document.createElement('script');script.dataset.senseisFocusOverview='1';script.src='./focus-list-v2.js?v=2';document.head.appendChild(script)}
function loadDecision(){const existing=document.querySelector('script[data-senseis-focus-decision]');if(existing){loadOverview();return}const script=document.createElement('script');script.dataset.senseisFocusDecision='1';script.src='./focus-decision.js?v=1';script.onload=loadOverview;script.onerror=loadOverview;document.head.appendChild(script)}
function loadExplain(){const existing=document.querySelector('script[data-senseis-focus-explain]');if(existing){loadDecision();return}const script=document.createElement('script');script.dataset.senseisFocusExplain='1';script.src='./focus-explainability.js?v=1';script.onload=loadDecision;script.onerror=loadDecision;document.head.appendChild(script)}
function loadMenu(){const existing=document.querySelector('script[data-senseis-focus-menu]');if(existing){loadExplain();return}const script=document.createElement('script');script.dataset.senseisFocusMenu='1';script.src='./focus-menu.js?v=1';script.onload=loadExplain;script.onerror=loadExplain;document.head.appendChild(script)}
function loadFocus(){const existing=document.querySelector('script[data-senseis-focus]');if(existing){loadMenu();return}const script=document.createElement('script');script.dataset.senseisFocus='1';script.src='./focus-engine.js?v=1';script.onload=loadMenu;script.onerror=loadMenu;document.head.appendChild(script)}
function boot(){apply();loadFocus();const observer=new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes){if(node.nodeType===1)apply(node)}}});observer.observe(document.documentElement,{subtree:true,childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
