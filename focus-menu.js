(()=>{'use strict';
const FOCUS_VIEW='focus';
const subtitles={focus:'Bot-generierte Fokusaktien'};

function style(){
  if(document.getElementById('senseisFocusMenuStyles'))return;
  const s=document.createElement('style');
  s.id='senseisFocusMenuStyles';
  s.textContent=`
  .bottom-nav{grid-template-columns:repeat(6,1fr)!important}
  .bottom-nav .nav-btn{font-size:8px!important;min-width:0;padding-left:2px;padding-right:2px}
  .bottom-nav .nav-btn .ico{font-size:18px!important}
  #focusToggle{display:none!important}
  #view-focus{background:#050607}
  .focus-view-wrap{max-width:1180px;margin:0 auto;padding:16px 14px 110px}
  .focus-view-intro{margin-bottom:12px;padding:14px;border:1px solid #252b34;border-radius:16px;background:#0d1014}
  .focus-view-intro strong{display:block;font-size:14px;margin-bottom:5px}
  .focus-view-intro span{display:block;color:#8c95a3;font-size:10px;line-height:1.5}
  .focus-view-status{padding:14px;border:1px solid #343c48;border-radius:14px;background:#0d1014;color:#8c95a3;font-size:11px}
  @media(max-width:390px){.bottom-nav .nav-btn{font-size:7.5px!important}.bottom-nav .nav-btn .ico{font-size:17px!important}}
  `;
  document.head.appendChild(s);
}

function addNav(container,beforeSelector,markup){
  if(!container||container.querySelector('[data-view="focus"]'))return;
  const before=container.querySelector(beforeSelector);
  const holder=document.createElement('div');
  holder.innerHTML=markup.trim();
  const button=holder.firstElementChild;
  before?container.insertBefore(button,before):container.appendChild(button);
  button.addEventListener('click',activateFocus);
}

function addView(){
  if(document.getElementById('view-focus'))return true;
  const stage=document.querySelector('.stage');
  if(!stage)return false;
  const section=document.createElement('section');
  section.id='view-focus';
  section.className='view';
  section.innerHTML=`
    <div class="module-head">
      <div><h2>🎯 Fokus Aktien</h2><small>Opportunity · Preisdislokation · aktuelle Relevanz</small></div>
      <span class="version">ENGINE</span>
    </div>
    <div class="focus-view-wrap">
      <div class="focus-view-intro">
        <strong>Welche Qualitätsaktien verdienen gerade besondere Aufmerksamkeit?</strong>
        <span>Opportunity, aktuelle Relevanz und spätere TradingView-Technik bleiben bewusst getrennt. Ein hoher Score ist kein Buy-Signal.</span>
      </div>
      <div id="focusMount"><div class="focus-view-status">Focus Engine wird vorbereitet …</div></div>
    </div>`;
  const fx=document.getElementById('view-fx');
  fx?stage.insertBefore(section,fx):stage.appendChild(section);
  return true;
}

function build(){
  style();
  const ready=addView();
  addNav(document.querySelector('.desktop-nav'),'[data-view="fx"]','<button class="nav-btn" data-view="focus"><span class="ico">🎯</span>Fokus Aktien</button>');
  addNav(document.querySelector('.bottom-nav'),'[data-view="fx"]','<button class="nav-btn" data-view="focus"><span class="ico">🎯</span><span>Fokus</span></button>');
  return ready;
}

function activateFocus(){
  if(!document.getElementById('view-focus'))build();
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-focus'));
  document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===FOCUS_VIEW));
  const subtitle=document.getElementById('pageSubtitle');
  if(subtitle)subtitle.textContent=subtitles.focus;
  try{sessionStorage.setItem('senseis-view',FOCUS_VIEW)}catch{}
  window.dispatchEvent(new CustomEvent('senseis-focus-view-opened'));
}

function restoreInitialView(){
  let initial='';
  try{initial=sessionStorage.getItem('senseis-view')||''}catch{}
  if(initial===FOCUS_VIEW)setTimeout(activateFocus,120);
}

function boot(){
  build();
  restoreInitialView();
  let tries=0;
  const retry=setInterval(()=>{
    tries++;
    const ready=build();
    if(ready&&document.querySelector('.bottom-nav [data-view="focus"],.desktop-nav [data-view="focus"]'))clearInterval(retry);
    else if(tries>=30)clearInterval(retry);
  },400);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
