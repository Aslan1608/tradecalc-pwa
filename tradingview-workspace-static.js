(()=>{'use strict';
const DAX=new Set(['ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON','DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1','HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM','RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL']);
const WIDGET_SRC='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
const LAYOUT_KEY='senseis-tv-workspace-v4';
const DEFAULT_LAYOUT={chartSide:'right',leftPct:34,height:610};
let layout=loadLayout();
let currentSymbol='';
let generation=0;
let retryTimer=0;
let retryCount=0;

function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
function loadLayout(){try{const saved=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'null');return saved?{chartSide:saved.chartSide==='left'?'left':'right',leftPct:clamp(Number(saved.leftPct)||DEFAULT_LAYOUT.leftPct,25,75),height:clamp(Number(saved.height)||DEFAULT_LAYOUT.height,450,950)}:{...DEFAULT_LAYOUT}}catch{return{...DEFAULT_LAYOUT}}}
function saveLayout(){try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(layout))}catch{}}
function ticker(){return String(document.getElementById('stock')?.value||document.getElementById('stockFilter')?.value||'').trim().toUpperCase().replace(/\.DE$/,'')}
function tvSymbol(value){const t=String(value||'').trim().toUpperCase().replace(/\.DE$/,'');return DAX.has(t)?'GETTEX:'+t:t}
function row(){return document.getElementById('senseisMarketRow')}
function live(){return document.querySelector('#senseisMarketRow>.card.live')}
function chart(){return document.querySelector('#senseisMarketRow>.senseis-tv-card')}
function splitter(){return document.getElementById('senseisMarketSplitter')}
function mount(){return document.getElementById('senseisTvMount')}
function setStatus(text,kind='loading'){
  const el=document.getElementById('senseisTvLoading');
  if(!el)return;
  el.textContent=text;
  el.dataset.kind=kind;
}
function applyLayout(){
  const r=row(),l=live(),c=chart(),s=splitter();if(!r||!l||!c||!s)return;
  const left=clamp(layout.leftPct,25,75),right=100-left;
  const leftBasis='calc('+left+'% - 7px)',rightBasis='calc('+right+'% - 7px)';
  if(layout.chartSide==='right'){
    l.style.order='1';s.style.order='2';c.style.order='3';l.style.flexBasis=leftBasis;c.style.flexBasis=rightBasis;
  }else{
    c.style.order='1';s.style.order='2';l.style.order='3';c.style.flexBasis=leftBasis;l.style.flexBasis=rightBasis;
  }
  c.style.height=layout.height+'px';
}
function installControls(){
  const r=row(),l=live(),c=chart(),s=splitter();if(!r||!l||!c||!s||c.dataset.controlsReady==='1')return;
  c.dataset.controlsReady='1';
  c.querySelector('#senseisSwapLayout')?.addEventListener('click',()=>{layout.chartSide=layout.chartSide==='right'?'left':'right';layout.leftPct=100-layout.leftPct;saveLayout();applyLayout()});
  c.querySelector('#senseisResetLayout')?.addEventListener('click',()=>{layout={...DEFAULT_LAYOUT};saveLayout();applyLayout()});
  s.addEventListener('pointerdown',event=>{
    if(matchMedia('(max-width:900px)').matches)return;
    event.preventDefault();s.setPointerCapture(event.pointerId);s.classList.add('dragging');
    const move=e=>{const rect=r.getBoundingClientRect();layout.leftPct=clamp((e.clientX-rect.left)/rect.width*100,25,75);applyLayout()};
    const end=e=>{try{s.releasePointerCapture(e.pointerId)}catch{}s.classList.remove('dragging');s.removeEventListener('pointermove',move);s.removeEventListener('pointerup',end);s.removeEventListener('pointercancel',end);saveLayout()};
    s.addEventListener('pointermove',move);s.addEventListener('pointerup',end);s.addEventListener('pointercancel',end);
  });
  const handle=c.querySelector('#senseisHeightHandle');
  handle?.addEventListener('pointerdown',event=>{
    if(matchMedia('(max-width:900px)').matches)return;
    event.preventDefault();handle.setPointerCapture(event.pointerId);handle.classList.add('dragging');
    const startY=event.clientY,startHeight=layout.height;
    const move=e=>{layout.height=clamp(startHeight+(e.clientY-startY),450,950);applyLayout()};
    const end=e=>{try{handle.releasePointerCapture(e.pointerId)}catch{}handle.classList.remove('dragging');handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);saveLayout()};
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  });
}
function clearRetry(){if(retryTimer){clearTimeout(retryTimer);retryTimer=0}}
function hasIframe(){return !!mount()?.querySelector('iframe')}
function scheduleHealthCheck(myGeneration){
  clearRetry();
  retryTimer=setTimeout(()=>{
    if(myGeneration!==generation)return;
    if(hasIframe()){
      retryCount=0;
      setStatus('TradingView verbunden','ok');
      return;
    }
    retryCount+=1;
    setStatus('TradingView lädt erneut … Versuch '+retryCount,'loading');
    render(true);
  },12000);
}
function render(force=false){
  const m=mount();if(!m)return;
  const selected=ticker(),symbol=tvSymbol(selected);if(!symbol)return;
  if(!force&&symbol===currentSymbol&&hasIframe())return;
  currentSymbol=symbol;
  generation+=1;
  const myGeneration=generation;
  const badge=document.getElementById('senseisTvSymbol');if(badge)badge.textContent=selected;
  m.innerHTML='<div id="senseisTvLoading" class="senseis-tv-loading" data-kind="loading">TradingView wird geladen …</div>';
  const container=document.createElement('div');container.className='tradingview-widget-container';
  const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';container.appendChild(widget);
  const script=document.createElement('script');script.type='text/javascript';script.src=WIDGET_SRC;script.async=true;
  script.textContent=JSON.stringify({autosize:true,symbol,interval:'60',timezone:'Europe/Berlin',theme:'dark',style:'1',locale:'de_DE',backgroundColor:'rgba(5, 6, 7, 1)',gridColor:'rgba(42, 46, 57, 0.35)',hide_top_toolbar:false,hide_legend:false,hide_side_toolbar:false,allow_symbol_change:true,save_image:false,calendar:false,details:false,hotlist:false,withdateranges:true,support_host:'https://www.tradingview.com'});
  script.onerror=()=>{if(myGeneration===generation){setStatus('TradingView konnte nicht geladen werden – neuer Versuch läuft','error');scheduleHealthCheck(myGeneration)}};
  container.appendChild(script);m.appendChild(container);
  const observer=new MutationObserver(()=>{if(myGeneration!==generation){observer.disconnect();return}if(hasIframe()){observer.disconnect();clearRetry();retryCount=0;document.getElementById('senseisTvLoading')?.remove()}});
  observer.observe(m,{subtree:true,childList:true});
  scheduleHealthCheck(myGeneration);
}
function boot(){
  if(!row()||!live()||!chart()||!mount()){setTimeout(boot,100);return}
  installControls();applyLayout();render(true);
  document.addEventListener('change',event=>{if(event.target?.id==='stock'||event.target?.id==='stockFilter'){retryCount=0;setTimeout(()=>render(true),80)}});
  window.addEventListener('pageshow',()=>setTimeout(()=>{applyLayout();if(!hasIframe())render(true)},150));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!hasIframe())setTimeout(()=>render(true),150)});
  new ResizeObserver(()=>applyLayout()).observe(row());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();