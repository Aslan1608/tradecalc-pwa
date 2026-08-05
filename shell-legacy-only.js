(()=>{'use strict';
function boot(){
  const frame=document.getElementById('tradeToolsFrame');
  if(frame&&!/index-core\.html/.test(frame.getAttribute('src')||''))frame.setAttribute('src','./index-core.html?v=legacy-only-1');
  const duplicate=[...document.querySelectorAll('#view-more a.more-btn')].find(a=>/index-core\.html/.test(a.getAttribute('href')||'')||/Legacy TradeCalc/i.test(a.textContent||''));
  duplicate?.remove();
  const head=document.querySelector('#view-trade .module-head');
  const small=head?.querySelector('small');if(small)small.textContent='Bewährter TradeCalc · Screenshot Import';
  const version=head?.querySelector('.version');if(version)version.textContent='LEGACY CORE';
  const tradeCard=[...document.querySelectorAll('#view-dashboard .card')].find(card=>/Trade Calculator/i.test(card.textContent||''));
  const description=tradeCard?.querySelector('p');if(description)description.textContent='Der bewährte Legacy-TradeCalc mit manuellem Rechner und Screenshot-Import.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
