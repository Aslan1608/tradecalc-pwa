(()=>{'use strict';
function repair(){
  const row=document.querySelector('.safe-row');
  if(!row)return;

  let label=row.querySelector('.safe-pill');
  if(!label){
    label=document.createElement('span');
    label.className='safe-pill';
    row.prepend(label)
  }
  label.textContent='✓ KOSTENLOSER FEED';

  let usage=document.getElementById('apiUsage');
  if(!usage){
    usage=[...row.querySelectorAll('span')].find(x=>x!==label)||document.createElement('span');
    usage.id='apiUsage';
    if(!usage.parentNode)row.appendChild(usage)
  }
  usage.textContent='Kein eigenes 10er-Limit';

  [...row.querySelectorAll('span')].forEach(x=>{
    if(x!==label&&x!==usage)x.remove()
  })
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