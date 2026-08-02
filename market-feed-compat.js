(()=>{'use strict';
function repair(){
  const row=document.querySelector('.safe-row');
  if(!row)return;
  let label=row.querySelector('.safe-pill');
  if(!label){label=document.createElement('span');label.className='safe-pill';row.prepend(label)}
  if(label.textContent!=='✓ KOSTENLOSER FEED')label.textContent='✓ KOSTENLOSER FEED';
  let usage=document.getElementById('apiUsage');
  if(!usage){usage=document.createElement('span');usage.id='apiUsage';row.appendChild(usage)}
  if(usage.textContent!=='Kein eigenes 10er-Limit')usage.textContent='Kein eigenes 10er-Limit';
}
function boot(){
  repair();
  const row=document.querySelector('.safe-row');
  if(row)new MutationObserver(repair).observe(row,{childList:true,subtree:true,characterData:true});
  document.getElementById('stock')?.addEventListener('change',()=>setTimeout(repair,180));
  window.addEventListener('senseis:dax-quote',()=>setTimeout(repair,250));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();