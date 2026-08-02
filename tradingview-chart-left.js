(()=>{'use strict';
const DAX=new Set(['ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON','DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1','HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM','RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL']);
const WIDGET_SRC='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
let renderedSymbol='';

function ticker(){return String(document.getElementById('stock')?.value||'').trim().toUpperCase().replace(/\.DE$/,'')}
function tvSymbol(value){const t=String(value||'').trim().toUpperCase().replace(/\.DE$/,'');return DAX.has(t)?'XETR:'+t:t}

function addStyles(){
  if(document.getElementById('senseis-tv-left-style'))return;
  const style=document.createElement('style');
  style.id='senseis-tv-left-style';
  style.textContent=`
  .app{max-width:1180px!important}
  .app>header,.app>section:not(.senseis-market-row),.app>.heroes,.app>p.note{width:100%;max-width:680px;margin-left:auto!important;margin-right:auto!important}
  .senseis-market-row{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(380px,.85fr);gap:14px;align-items:stretch;margin:0 auto 14px;width:100%}
  .senseis-market-row>.card.live{margin:0!important;min-width:0;height:100%}
  .senseis-tv-card{min-width:0;min-height:390px;background:#0d1014;border:1px solid #343c48;border-radius:19px;padding:14px;overflow:hidden}
  .senseis-tv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}
  .senseis-tv-head h2{margin:0;font-size:17px;color:#f7f8fa}
  .senseis-tv-head p{margin:4px 0 0;color:#8c95a3;font-size:11px}
  .senseis-tv-symbol{flex:0 0 auto;padding:6px 9px;border:1px solid #343c48;border-radius:999px;background:#12161c;color:#f7f8fa;font-size:10px;font-weight:900}
  .senseis-tv-mount{height:318px;min-height:318px;border:1px solid #252b34;border-radius:13px;overflow:hidden;background:#050607}
  .senseis-tv-mount .tradingview-widget-container,.senseis-tv-mount .tradingview-widget-container__widget{height:100%!important;width:100%!important}
  .senseis-tv-note{margin:9px 2px 0;color:#8c95a3;font-size:10px;line-height:1.4}
  @media(max-width:900px){
    .app{max-width:680px!important}
    .senseis-market-row{grid-template-columns:1fr}
    .senseis-tv-card{min-height:374px}
    .senseis-tv-mount{height:302px;min-height:302px}
  }
  @media(max-width:430px){
    .senseis-tv-card{padding:12px;min-height:350px}
    .senseis-tv-mount{height:280px;min-height:280px}
  }`;
  document.head.appendChild(style);
}

function createCard(){
  const card=document.createElement('section');
  card.className='senseis-tv-card';
  card.innerHTML='<div class="senseis-tv-head"><div><h2>TradingView Chart</h2><p>Visuelle Marktansicht · synchron zur Aktienauswahl</p></div><span id="senseisTvSymbol" class="senseis-tv-symbol">—</span></div><div id="senseisTvMount" class="senseis-tv-mount"></div><p class="senseis-tv-note">Nur zur visuellen Orientierung. Für Entry, SL und TP bleibt der Referenzkurs beziehungsweise dein Brokerkurs maßgeblich.</p>';
  return card;
}

function buildLayout(){
  const live=document.querySelector('.card.live');
  if(!live)return false;
  if(live.parentElement?.classList.contains('senseis-market-row'))return true;
  const row=document.createElement('section');
  row.className='senseis-market-row';
  live.parentNode.insertBefore(row,live);
  row.appendChild(createCard());
  row.appendChild(live);
  return true;
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