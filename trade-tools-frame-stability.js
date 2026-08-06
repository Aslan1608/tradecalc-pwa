(()=>{'use strict';
const BUILD='legacy-main-fresh-1';
const CALC='./calculator.html?v='+BUILD;
const IMPORT='./screenshot-import.html?v='+BUILD;
let attempts=0;
function syncInnerFrames(outer){try{const doc=outer.contentDocument;if(!doc)return;const calc=doc.getElementById('calcFrame');const imp=doc.getElementById('importFrame');if(calc&&!String(calc.getAttribute('src')||'').includes(BUILD))calc.setAttribute('src',CALC);if(imp&&!String(imp.getAttribute('src')||'').includes(BUILD))imp.setAttribute('src',IMPORT)}catch{}}
function boot(){const outer=document.getElementById('tradeToolsFrame');if(!outer){if(attempts++<120)setTimeout(boot,100);return}const apply=()=>syncInnerFrames(outer);outer.addEventListener('load',()=>{setTimeout(apply,0);setTimeout(apply,400)});apply();setTimeout(apply,500);setTimeout(apply,1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
