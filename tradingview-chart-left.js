(()=>{'use strict';
const DAX=new Set(['ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON','DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1','HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM','RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL']);
const WIDGET_SRC='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
const LAYOUT_KEY='senseis-tv-workspace-v2';
const DEFAULT_LAYOUT={chartSide:'right',leftPct:34,height:570};
let renderedSymbol='';
let layout=loadLayout();

function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
function ticker(){return String(document.getElementById('stock')?.value||'').trim().toUpperCase().replace(/\.DE$/,'')}
function tvSymbol(value){const t=String(value||'').trim().toUpperCase().replace(/\.DE$/,'');return DAX.has(t)?'GETTEX:'+t:t}
function loadLayout(){try{const saved=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'null');return saved?{chartSide:saved.chartSide==='left'?'left':'right',leftPct:clamp(Number(saved.leftPct)||DEFAULT_LAYOUT.leftPct,25,75),height:clamp(Number(saved.height)||DEFAULT_LAYOUT.height,430,900)}:{...DEFAULT_LAYOUT}}catch{return{...DEFAULT_LAYOUT}}}
function saveLayout(){try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(layout))}catch{}}

function addStyles(){
  if(document.getElementById('senseis-tv-left-style'))return;
  const style=document.createElement('style');
  style.id='senseis-tv-left-style';
  style.textContent=`
  .app{max-width:1380px!important}
  .app>header,.app>section:not(.senseis-market-row),.app>.heroes,.app>p.note{width:100%;max-width:680px;margin-left:auto!important;margin-right:auto!important}
  .senseis-market-row{display:flex;align-items:stretch;margin:0 auto 14px;width:100%;min-width:0}
  .senseis-market-row>.card.live,.senseis-tv-card{flex:0 0 auto;min-width:0;margin:0!important}
  .senseis-market-row>.card.live{height:auto;overflow:auto}
  .senseis-tv-card{position:relative;background:#0d1014;border:1px solid #343c48;border-radius:19px;padding:15px 15px 18px;overflow:hidden}
  .senseis-tv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}
  .senseis-tv-head h2{margin:0;font-size:17px;color:#f7f8fa}
  .senseis-tv-head p{margin:4px 0 0;color:#8c95a3;font-size:11px}
  .senseis-tv-actions{display:flex;align-items:center;gap:6px;flex:0 0 auto}
  .senseis-tv-symbol{padding:6px 9px;border:1px solid #343c48;border-radius:999px;background:#12161c;color:#f7f8fa;font-size:10px;font-weight:900}
  .senseis-layout-btn{width:32px;height:32px;border:1px solid #343c48;border-radius:9px;background:#12161c;color:#f7f8fa;font-weight:900;cursor:pointer}
  .senseis-layout-btn:hover{border-color:#f7f8fa}
  .senseis-tv-mount{height:calc(100% - 94px);min-height:338px;border:1px solid #252b34;border-radius:13px;overflow:hidden;background:#050607}
  .senseis-tv-mount .tradingview-widget-container,.senseis-tv-mount .tradingview-widget-container__widget{height:100%!important;width:100%!important}
  .senseis-tv-note{margin:8px 2px 0;color:#8c95a3;font-size:10px;line-height:1.35}
  .senseis-splitter{flex:0 0 14px;position:relative;cursor:col-resize;touch-action:none}
  .senseis-splitter:before{content:'';position:absolute;left:5px;top:18px;bottom:18px;width:4px;border-radius:99px;background:#252b34;transition:.15s}
  .senseis-splitter:hover:before,.senseis-splitter.dragging:before{background:#f7f8fa}
  .senseis-height-handle{position:absolute;left:18%;right:18%;bottom:3px;height:10px;cursor:row-resize;touch-action:none}
  .senseis-height-handle:before{content:'';position:absolute;left:35%;right:35%;top:3px;height:3px;border-radius:99px;background:#343c48}
  .senseis-height-handle:hover:before,.senseis-height-handle.dragging:before{background:#f7f8fa}
  .senseis-layout-help{position:absolute;right:14px;bottom:6px;color:#626c79;font-size:9px;pointer-events:none}
  @media(max-width:900px){
    .app{max-width:680px!important}
    .senseis-market-row{display:flex;flex-direction:column!important;gap:14px}
    .senseis-market-row>.card.live,.senseis-tv-card{width:100%!important;flex-basis:auto!important}
    .senseis-market-row>.card.live{order:1!important}
    .senseis-tv-card{order:2!important;height:470px!important}
    .senseis-splitter,.senseis-height-handle,.senseis-layout-help,.senseis-layout-btn.swap{display:none!important}
    .senseis-tv-mount{min-height:370px}
  }
  @media(max-width:430px){
    .senseis-tv-card{padding:12px;height:430px!important}
    .senseis-tv-mount{min-height:330px}
  }`;
  document.head.appendChild(style);
}

function createCard(){
  const card=document.createElement('section');
  card.className='senseis-tv-card';
  card.innerHTML='<div class="senseis-tv-head"><div><h2>TradingView Chart</h2><p>GETTEX Intraday · synchron zur Aktienauswahl</p></div><div class="senseis-tv-actions"><span id="senseisTvSymbol" class="senseis-tv-symbol">—</span><button id="senseisSwapLayout" class="senseis-layout-btn swap" title="Chart und Livekurs tauschen">⇄</button><button id="senseisResetLayout" class="senseis-layout-btn" title="Layout zurücksetzen">↺</button></div></div><div id="senseisTvMount" class="senseis-tv-mount"></div><p class="senseis-tv-note">Chart: GETTEX für Intraday. Referenzkurs: Google/Xetra. Kleine Kursabweichungen zwischen Handelsplätzen sind möglich.</p><div id="senseisHeightHandle" class="senseis-height-handle" title="Ziehen, um die Höhe zu ändern"></div><span class="senseis-layout-help">Trenner/Höhe ziehen</span>';
  return card;
}

function buildLayout(){
  const live=document.querySelector('.card.live');
  if(!live)return false;
  if(live.parentElement?.classList.contains('senseis-market-row'))return true;
  const row=document.createElement('section');
  row.className='senseis-market-row';
  row.id='senseisMarketRow';
  const splitter=document.createElement('div');
  splitter.className='senseis-splitter';
  splitter.id='senseisMarketSplitter';
  const chart=createCard();
  live.parentNode.insertBefore(row,live);
  row.appendChild(live);
  row.appendChild(splitter);
  row.appendChild(chart);
  installControls(row,live,chart,splitter);
  applyLayout(row,live,chart,splitter);
  return true;
}

function applyLayout(row,live,chart,splitter){
  const left=clamp(layout.leftPct,25,75);
  const right=100-left;
  const leftBasis='calc('+left+'% - 7px)';
  const rightBasis='calc('+right+'% - 7px)';
  if(layout.chartSide==='right'){
    live.style.order='1';splitter.style.order='2';chart.style.order='3';
    live.style.flexBasis=leftBasis;chart.style.flexBasis=rightBasis;
  }else{
    chart.style.order='1';splitter.style.order='2';live.style.order='3';
    chart.style.flexBasis=leftBasis;live.style.flexBasis=rightBasis;
  }
  chart.style.height=layout.height+'px';
  row.dataset.chartSide=layout.chartSide;
}

function installControls(row,live,chart,splitter){
  const swap=chart.querySelector('#senseisSwapLayout');
  const reset=chart.querySelector('#senseisResetLayout');
  const heightHandle=chart.querySelector('#senseisHeightHandle');

  swap.addEventListener('click',()=>{
    layout.chartSide=layout.chartSide==='right'?'left':'right';
    layout.leftPct=100-layout.leftPct;
    saveLayout();applyLayout(row,live,chart,splitter);
  });

  reset.addEventListener('click',()=>{
    layout={...DEFAULT_LAYOUT};saveLayout();applyLayout(row,live,chart,splitter);
  });

  splitter.addEventListener('pointerdown',event=>{
    if(matchMedia('(max-width:900px)').matches)return;
    event.preventDefault();splitter.setPointerCapture(event.pointerId);splitter.classList.add('dragging');
    const move=e=>{const rect=row.getBoundingClientRect();layout.leftPct=clamp((e.clientX-rect.left)/rect.width*100,25,75);applyLayout(row,live,chart,splitter)};
    const end=e=>{try{splitter.releasePointerCapture(e.pointerId)}catch{}splitter.classList.remove('dragging');splitter.removeEventListener('pointermove',move);splitter.removeEventListener('pointerup',end);splitter.removeEventListener('pointercancel',end);saveLayout()};
    splitter.addEventListener('pointermove',move);splitter.addEventListener('pointerup',end);splitter.addEventListener('pointercancel',end);
  });

  heightHandle.addEventListener('pointerdown',event=>{
    if(matchMedia('(max-width:900px)').matches)return;
    event.preventDefault();heightHandle.setPointerCapture(event.pointerId);heightHandle.classList.add('dragging');
    const startY=event.clientY,startHeight=layout.height;
    const move=e=>{layout.height=clamp(startHeight+(e.clientY-startY),430,900);applyLayout(row,live,chart,splitter)};
    const end=e=>{try{heightHandle.releasePointerCapture(e.pointerId)}catch{}heightHandle.classList.remove('dragging');heightHandle.removeEventListener('pointermove',move);heightHandle.removeEventListener('pointerup',end);heightHandle.removeEventListener('pointercancel',end);saveLayout()};
    heightHandle.addEventListener('pointermove',move);heightHandle.addEventListener('pointerup',end);heightHandle.addEventListener('pointercancel',end);
  });
}

function renderChart(force=false){
  const mount=document.getElementById('senseisTvMount');
  const badge=document.getElementById('senseisTvSymbol');
  if(!mount)return;
  const selected=ticker();
  const symbol=tvSymbol(selected);
  if(!symbol)return;
  if(!force&&renderedSymbol===symbol&&mount.childNodes.length)return;
  renderedSymbol=symbol;
  if(badge)badge.textContent=selected;
  mount.innerHTML='';

  const container=document.createElement('div');
  container.className='tradingview-widget-container';
  const widget=document.createElement('div');
  widget.className='tradingview-widget-container__widget';
  container.appendChild(widget);

  const script=document.createElement('script');
  script.type='text/javascript';
  script.src=WIDGET_SRC;
  script.async=true;
  script.textContent=JSON.stringify({
    autosize:true,
    symbol:symbol,
    interval:'60',
    timezone:'Europe/Berlin',
    theme:'dark',
    style:'1',
    locale:'de_DE',
    backgroundColor:'rgba(5, 6, 7, 1)',
    gridColor:'rgba(42, 46, 57, 0.35)',
    hide_top_toolbar:false,
    hide_legend:false,
    hide_side_toolbar:false,
    allow_symbol_change:true,
    save_image:false,
    calendar:false,
    details:false,
    hotlist:false,
    withdateranges:true,
    support_host:'https://www.tradingview.com'
  });
  container.appendChild(script);
  mount.appendChild(container);
}

function boot(attempt=0){
  addStyles();
  if(!buildLayout()){
    if(attempt<50)setTimeout(()=>boot(attempt+1),100);
    return;
  }
  renderChart(true);
  document.addEventListener('change',event=>{
    if(event.target?.id==='stock'||event.target?.id==='stockFilter')setTimeout(()=>renderChart(false),80);
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot());else boot();
})();