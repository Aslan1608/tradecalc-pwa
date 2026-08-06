(()=>{'use strict';
const FOCUS_VIEW='focus';
const subtitles={focus:'Bot-generierte Fokusaktien'};
let mounted=false;

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
  #focusMount .focus-panel{margin:0}
  #focusMount .focus-panel[hidden]{display:none}
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
  button.addEventListener('click',()=>activateFocus());
}

function addView(){
  if(document.getElementById('view-focus'))return;
  const stage=document.querySelector('.stage');
  if(!stage)return;
  const section=document.createElement('section');
  section.id='view-focus';
  section.className='view';
  section.innerHTML=`
    <div class="module-head">
      <div><h2>🎯 Fokus Aktien</h2><small>Qualität · Bewertung · Wochenrelevanz · Gap Opportunity</small></div>
      <span class="version">ENGINE</span>
    </div>
    <div class="focus-view-wrap">
      <div class="focus-view-intro">
        <strong>Welche Qualitätsaktien verdienen gerade besondere Aufmerksamkeit?</strong>
        <span>Die Liste trennt langfristige Unternehmensqualität von aktueller Relevanz. Ein hoher Score ist ein Screening-Signal und noch kein fertiger Trade.</span>
      </div>
      <div id="focusMount"><div class="focus-view-status">Focus Engine wird vorbereitet …</div></div>
    </div>`;
  const fx=document.getElementById('view-fx');
  fx?stage.insertBefore(section,fx):stage.appendChild(section);
  section.addEventListener('click',event=>{
    if(event.target.closest('button,select,input,a'))return;
    const row=event.target.closest('.focus-row');
    if(!row)return;
    setTimeout(()=>document.querySelector('.bottom-nav [data-view="stocks"],.desktop-nav [data-view="stocks"]')?.click(),0);
  });
}

function build(){
  style();
  addView();
  addNav(document.querySelector('.desktop-nav'),'[data-view="fx"]','<button class="nav-btn" data-view="focus"><span class="ico">🎯</span>Fokus Aktien</button>');
  addNav(document.querySelector('.bottom-nav'),'[data-view="fx"]','<button class="nav-btn" data-view="focus"><span class="ico">🎯</span><span>Fokus</span></button>');
  mountPanel();
}

function activateFocus(){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-focus'));
  document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===FOCUS_VIEW));
  const subtitle=document.getElementById('pageSubtitle');
  if(subtitle)subtitle.textContent=subtitles.focus;
  try{sessionStorage.setItem('senseis-view',FOCUS_VIEW)}catch{}
  ensureOpen();
  mountPanel();
}

function ensureOpen(){
  const panel=document.getElementById('focusPanel');
  const toggle=document.getElementById('focusToggle');
  if(panel?.hidden&&toggle)toggle.click();
}

function mountPanel(){
  const mount=document.getElementById('focusMount');
  const panel=document.getElementById('focusPanel');
  if(!mount||!panel)return false;
  if(panel.parentElement!==mount)mount.replaceChildren(panel);
  mounted=true;
  if(document.getElementById('view-focus')?.classList.contains('active'))ensureOpen();
  return true;
}

function restoreInitialView(){
  let initial='';
  try{initial=sessionStorage.getItem('senseis-view')||''}catch{}
  if(initial===FOCUS_VIEW)setTimeout(activateFocus,80);
}

function boot(){
  build();
  restoreInitialView();
  const stock=document.getElementById('view-stocks');
  if(stock){
    const observer=new MutationObserver(()=>{
      if(!mounted||document.getElementById('focusPanel')?.parentElement!==document.getElementById('focusMount'))mountPanel();
    });
    observer.observe(stock,{childList:true,subtree:true});
  }
  let tries=0;
  const retry=setInterval(()=>{
    tries++;
    build();
    if(mountPanel()||tries>=30)clearInterval(retry);
  },400);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
