(()=>{'use strict';
const $=id=>document.getElementById(id);
const DAX=new Set(['ADS','AIR','ALV','BAS','BAYN','BEI','BMW','BNR','CBK','CON','DTG','DBK','DB1','DHL','DTE','EOAN','FRE','FME','G1A','HNR1','HEI','HEN3','HOT','IFX','MBG','MRK','MTX','MUV2','QIA','RHM','RWE','SAP','G24','SIE','ENR','SHL','SY1','VOW3','VNA','ZAL']);
const KNOWN_US={
  AAPL:'NASDAQ:AAPL',AMZN:'NASDAQ:AMZN',GOOG:'NASDAQ:GOOG',GOOGL:'NASDAQ:GOOGL',
  MSFT:'NASDAQ:MSFT',NVDA:'NASDAQ:NVDA',META:'NASDAQ:META',TSLA:'NASDAQ:TSLA',
  AMD:'NASDAQ:AMD',AVGO:'NASDAQ:AVGO',NFLX:'NASDAQ:NFLX',PLTR:'NASDAQ:PLTR'
};
const MAP_KEY='senseis-tradingview-symbol-map-v1';
let renderId=0;

function style(){
  if($('senseisTvStyles'))return;
  const s=document.createElement('style');s.id='senseisTvStyles';s.textContent=`
main.app{max-width:1240px!important}
main.app>header,main.app>.card,main.app>.heroes,main.app>.note{max-width:680px;margin-left:auto;margin-right:auto}
.market-workspace{width:100%;display:grid;grid-template-columns:minmax(360px,.82fr) minmax(520px,1.35fr);gap:14px;align-items:stretch;margin-bottom:14px}
.market-left{display:flex;flex-direction:column;gap:14px;min-width:0}.market-left>.card{width:100%;margin:0!important}
.tv-chart-card{min-width:0;min-height:650px;margin:0!important;padding:0!important;overflow:hidden;display:flex;flex-direction:column;border-color:#343c48!important;background:#0d1014!important}
.tv-chart-head{min-height:58px;padding:13px 15px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0d1014}
.tv-chart-title{font-size:17px;font-weight:900}.tv-chart-sub{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}.tv-chart-badge{padding:6px 9px;border:1px solid #343c48;border-radius:999px;background:#12161c;color:#f7f8fa;font-size:10px;font-weight:900;white-space:nowrap}
.tv-chart-host{position:relative;flex:1;min-height:590px;background:#0d1014}.tv-chart-host .tradingview-widget-container{height:100%;width:100%}.tv-chart-host .tradingview-widget-container__widget{height:calc(100% - 28px);width:100%}.tv-chart-host .tradingview-widget-copyright{height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#8c95a3;background:#0d1014}.tv-chart-host .tradingview-widget-copyright a{color:#c8cdd5;text-decoration:none}.tv-chart-host .trademark{margin-left:3px}
@media(max-width:980px){main.app{max-width:760px!important}.market-workspace{grid-template-columns:1fr}.tv-chart-card{min-height:540px}.tv-chart-host{min-height:480px}}
@media(max-width:520px){.tv-chart-card{min-height:470px}.tv-chart-host{min-height:410px}.tv-chart-head{padding:12px}.tv-chart-badge{display:none}}
`;document.head.appendChild(s)
}
function ticker(){return String($('stock')?.value||'AAPL').trim().toUpperCase().replace(/\.DE$/,'')}
function loadMap(){try{const x=JSON.parse(localStorage.getItem(MAP_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
function saveMap(map){try{localStorage.setItem(MAP_KEY,JSON.stringify(map))}catch{}}
function tvTicker(t){return t.replace(/-/g,'.')}
function initialSymbol(t){
  if(DAX.has(t))return t==='QIA'?'FWB:QIA':'XETR:'+t;
  if(KNOWN_US[t])return KNOWN_US[t];
  const saved=loadMap()[t];if(saved)return saved;
  return 'NASDAQ:'+tvTicker(t)
}
function exchangeFromProfile(exchange){
  const x=String(exchange||'').toUpperCase();
  if(x.includes('NASDAQ'))return'NASDAQ';
  if(x.includes('NEW YORK')||x.includes('NYSE'))return'NYSE';
  if(x.includes('AMEX')||x.includes('AMERICAN'))return'AMEX';
  return''
}
async function resolveUsSymbol(t,myId){
  if(DAX.has(t)||KNOWN_US[t]||loadMap()[t])return;
  const key=String(localStorage.getItem('tradecalc-finnhub-key')||'').trim();if(!key)return;
  try{
    const r=await fetch('https://finnhub.io/api/v1/stock/profile2?symbol='+encodeURIComponent(t)+'&token='+encodeURIComponent(key),{cache:'no-store'});
    if(!r.ok)return;const p=await r.json(),ex=exchangeFromProfile(p?.exchange);if(!ex)return;
    const before=initialSymbol(t),resolved=ex+':'+tvTicker(t),map=loadMap();map[t]=resolved;saveMap(map);
    if(myId===renderId&&ticker()===t&&resolved!==before)renderChart()
  }catch{}
}
function buildWorkspace(){
  if($('marketWorkspace'))return;
  const live=$('livePrice')?.closest('section');if(!live)return;
  const event=$('eventCard');
  const workspace=document.createElement('section');workspace.id='marketWorkspace';workspace.className='market-workspace';
  const left=document.createElement('div');left.className='market-left';
  const chart=document.createElement('section');chart.id='tvChartCard';chart.className='card tv-chart-card';chart.innerHTML=`<div class="tv-chart-head"><div><div class="tv-chart-title">TradingView Chart</div><div id="tvChartSymbol" class="tv-chart-sub">Chart wird vorbereitet …</div></div><span class="tv-chart-badge">AUTO SYNC</span></div><div id="tvChartHost" class="tv-chart-host"></div>`;
  live.parentNode.insertBefore(workspace,live);workspace.appendChild(left);left.appendChild(live);if(event)left.appendChild(event);workspace.appendChild(chart)
}
function widgetConfig(symbol){return{
  autosize:true,symbol,interval:'60',timezone:'Europe/Berlin',theme:'dark',style:'1',locale:'de_DE',
  backgroundColor:'#0d1014',gridColor:'rgba(140,149,163,0.10)',allow_symbol_change:true,
  calendar:false,details:false,hotlist:false,hide_side_toolbar:false,hide_top_toolbar:false,
  hide_legend:false,hide_volume:false,save_image:false,withdateranges:true,compareSymbols:[],studies:[],
  support_host:'https://www.tradingview.com'
}}
function renderWidget(symbol,t){
  const host=$('tvChartHost');if(!host)return;host.innerHTML='';
  const container=document.createElement('div');container.className='tradingview-widget-container';container.style.height='100%';container.style.width='100%';
  const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';
  const copyright=document.createElement('div');copyright.className='tradingview-widget-copyright';
  const link=document.createElement('a');link.href='https://www.tradingview.com/symbols/'+symbol.replace(':','-').replace('.','-')+'/';link.rel='noopener nofollow';link.target='_blank';link.textContent=t+' Chart';
  const mark=document.createElement('span');mark.className='trademark';mark.textContent=' by TradingView';copyright.append(link,mark);
  const script=document.createElement('script');script.type='text/javascript';script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.async=true;script.textContent=JSON.stringify(widgetConfig(symbol));
  container.append(widget,copyright,script);host.appendChild(container)
}
function renderChart(){
  const t=ticker(),symbol=initialSymbol(t),myId=++renderId;
  const label=$('tvChartSymbol');if(label)label.textContent=t+' · '+symbol+' · H1 Standard';
  renderWidget(symbol,t);resolveUsSymbol(t,myId)
}
function init(){
  style();buildWorkspace();renderChart();
  const stock=$('stock');if(stock)stock.addEventListener('change',()=>setTimeout(renderChart,80));
  const visible=$('stockFilter');if(visible)visible.addEventListener('change',()=>setTimeout(renderChart,120))
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
