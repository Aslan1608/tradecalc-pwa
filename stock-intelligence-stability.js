(()=>{'use strict';
const SELECTED_KEY='senseis-stock-intelligence-symbol';
const nativeSetInterval=window.setInterval.bind(window);

// Phase 2 used a permanent 1.5-second sync from the Trade Calculator.
// Suppress only that exact interval; all other timers remain untouched.
window.setInterval=function(handler,delay,...args){
  const name=typeof handler==='function'?String(handler.name||''):'';
  const source=typeof handler==='function'?String(handler):'';
  if(Number(delay)===1500&&(name==='syncFromTrade'||(source.includes('currentTradeSymbol')&&source.includes('siSymbol')))){
    return 0;
  }
  return nativeSetInterval(handler,delay,...args);
};

function selectedOptionExists(select,value){
  return !!select&&[...select.options].some(option=>option.value===value);
}

function restoreUserSelection(preferred){
  const select=document.getElementById('siSymbol');
  if(!select||!preferred||!selectedOptionExists(select,preferred)||select.value===preferred)return;
  select.value=preferred;
  select.dispatchEvent(new Event('change',{bubbles:true}));
}

// Remember every deliberate selection immediately.
document.addEventListener('change',event=>{
  if(event.target?.id!=='siSymbol')return;
  const value=String(event.target.value||'').trim().toUpperCase();
  if(value)localStorage.setItem(SELECTED_KEY,value);
},true);

// The old module performs a one-time Trade-Calculator sync when the Stocks tab is opened.
// Preserve the user's saved selection after that handler has completed.
document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest('[data-view="stocks"],[data-go="stocks"]'):null;
  if(!target)return;
  const preferred=String(localStorage.getItem(SELECTED_KEY)||'').trim().toUpperCase();
  if(!preferred)return;
  setTimeout(()=>restoreUserSelection(preferred),260);
  setTimeout(()=>restoreUserSelection(preferred),700);
},true);

function installAuthorizationNotice(){
  const view=document.getElementById('view-stocks');
  if(!view)return;
  const text=String(view.textContent||'');
  const missing=/script\.external_request|UrlFetchApp|erforderliche Berechtigung|authorization is required|not have permission/i.test(text);
  let notice=document.getElementById('siAuthorizationNotice');
  if(!missing){if(notice)notice.remove();return;}
  if(!notice){
    notice=document.createElement('div');
    notice.id='siAuthorizationNotice';
    notice.style.cssText='max-width:1180px;margin:0 auto 12px;padding:12px 14px;border:1px solid rgba(255,159,10,.42);border-radius:13px;background:rgba(255,159,10,.08);color:#ffd08a;font-size:11px;line-height:1.5';
    const wrap=view.querySelector('.si-wrap');
    if(wrap)wrap.insertBefore(notice,wrap.firstChild);
  }
  notice.innerHTML='<strong>Google-Datenzugriff noch nicht autorisiert.</strong><br>Die Oberfläche funktioniert, aber SEC-Finanzdaten und News benötigen einmalig die Apps-Script-Berechtigung für externe Datenabrufe.';
}

function boot(){
  installAuthorizationNotice();
  const observer=new MutationObserver(()=>installAuthorizationNotice());
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
