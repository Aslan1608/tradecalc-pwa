(()=>{'use strict';
const $=id=>document.getElementById(id);
const EVENT_CACHE_MS=6*60*60*1000;
const SYMBOL_MAP={MUV2:'MUV2.DE'};
let eventRequest=0;

function ensureStyles(){
  const s=document.createElement('style');
  s.textContent=`
  .event-card{border-color:rgba(255,159,10,.28);background:linear-gradient(145deg,rgba(255,159,10,.07),var(--card) 60%)}
  .event-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
  .event-badge{padding:6px 9px;border-radius:999px;border:1px solid var(--line);font-size:10px;font-weight:900;color:var(--muted);white-space:nowrap}
  .event-badge.low{color:var(--green);border-color:rgba(48,209,88,.35);background:rgba(48,209,88,.08)}
  .event-badge.medium{color:var(--yellow);border-color:rgba(255,214,10,.35);background:rgba(255,214,10,.07)}
  .event-badge.high{color:var(--red);border-color:rgba(255,69,58,.38);background:rgba(255,69,58,.09)}
  .event-hero{margin-top:12px;padding:13px;border-radius:13px;border:1px solid var(--line);background:var(--card2)}
  .event-hero.low{border-color:rgba(48,209,88,.28)}.event-hero.medium{border-color:rgba(255,214,10,.3)}.event-hero.high{border-color:rgba(255,69,58,.32)}
  .event-title{font-size:17px;font-weight:900}.event-sub{color:var(--muted);font-size:11px;line-height:1.45;margin-top:5px}
  .event-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
  .event-cell{padding:10px;border:1px solid var(--line);border-radius:11px;background:var(--card2)}
  .event-cell span{display:block;color:var(--muted);font-size:10px;margin-bottom:4px}.event-cell strong{font-size:13px}
  .event-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}
  .event-message{padding:10px 11px;border:1px solid var(--line);border-radius:11px;background:var(--card2);color:var(--muted);font-size:11px;line-height:1.4}
  .event-refresh{min-width:46px;border:1px solid var(--line);border-radius:11px;background:var(--card2);color:var(--blue);font-weight:900}
  @media(max-width:380px){.event-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function buildCard(){
  const live=$('livePrice')?.closest('section');
  if(!live||$('eventCard'))return;
  const card=document.createElement('section');
  card.id='eventCard';card.className='card event-card';
  card.innerHTML=`
    <div class="event-top"><div><h2 style="margin:0;font-size:17px">Stock Intelligence</h2><p class="mini">Finnhub · Earnings & Event Risk</p></div><span id="eventBadge" class="event-badge">—</span></div>
    <div id="eventHero" class="event-hero"><div id="eventTitle" class="event-title">Earnings werden geprüft …</div><div id="eventSub" class="event-sub">Ausgewählte Aktie: —</div></div>
    <div class="event-grid">
      <div class="event-cell"><span>Nächste Earnings</span><strong id="eventDate">—</strong></div>
      <div class="event-cell"><span>Countdown</span><strong id="eventCountdown">—</strong></div>
      <div class="event-cell"><span>Zeitpunkt</span><strong id="eventHour">—</strong></div>
      <div class="event-cell"><span>EPS Estimate</span><strong id="eventEps">—</strong></div>
      <div class="event-cell"><span>Revenue Estimate</span><strong id="eventRevenue">—</strong></div>
      <div class="event-cell"><span>Letzte Earnings</span><strong id="eventLast">—</strong></div>
    </div>
    <div class="event-actions"><div id="eventMessage" class="event-message">Warte auf Finnhub-Key …</div><button id="eventRefresh" class="event-refresh">↻</button></div>`;
  live.insertAdjacentElement('afterend',card);
  $('eventRefresh').addEventListener('click',()=>loadEvents(true));
}

function apiKey(){return localStorage.getItem('tradecalc-finnhub-key')||''}
function ticker(){return $('stock')?.value||'GOOG'}
function apiTicker(t){return SYMBOL_MAP[t]||t}
function cacheKey(t){return 'tradecalc-earnings-'+t}
function getCache(t){try{return JSON.parse(localStorage.getItem(cacheKey(t))||'null')}catch{return null}}
function setCache(t,data){try{localStorage.setItem(cacheKey(t),JSON.stringify({time:Date.now(),data}))}catch{}}
function iso(d){return d.toISOString().slice(0,10)}
function daysUntil(s){const a=new Date(),b=new Date(s+'T12:00:00');a.setHours(12,0,0,0);return Math.round((b-a)/86400000)}
function hourText(h){return h==='bmo'?'Vor Börsenöffnung':h==='amc'?'Nach Börsenschluss':h==='dmh'?'Während Börsenhandel':h||'Nicht angegeben'}
function revenue(v){const x=Number(v);if(!Number.isFinite(x))return'—';if(Math.abs(x)>=1e9)return(x/1e9).toLocaleString('de-DE',{maximumFractionDigits:2})+' Mrd.';if(Math.abs(x)>=1e6)return(x/1e6).toLocaleString('de-DE',{maximumFractionDigits:1})+' Mio.';return x.toLocaleString('de-DE',{maximumFractionDigits:0})}
function updateUsage(){try{const now=Date.now(),a=JSON.parse(localStorage.getItem('tradecalc-api-reqs')||'[]').filter(x=>now-x<60000);localStorage.setItem('tradecalc-api-reqs',JSON.stringify(a));if($('apiUsage'))$('apiUsage').textContent=a.length+' / 10 Requests · letzte 60 s'}catch{}}
function allowRequest(){try{const now=Date.now(),a=JSON.parse(localStorage.getItem('tradecalc-api-reqs')||'[]').filter(x=>now-x<60000);if(a.length>=10)return false;a.push(now);localStorage.setItem('tradecalc-api-reqs',JSON.stringify(a));updateUsage();return true}catch{return true}}

function clearFields(){['eventDate','eventCountdown','eventHour','eventEps','eventRevenue','eventLast'].forEach(id=>{if($(id))$(id).textContent='—'})}
function showNoData(t,msg='Finnhub hat im Zeitraum keinen bestätigten Termin geliefert.'){
  clearFields();$('eventHero').className='event-hero';$('eventBadge').className='event-badge';$('eventBadge').textContent='KEIN TERMIN';$('eventTitle').textContent='⚪ Keine kommenden Earnings gefunden';$('eventSub').textContent=t+' · '+msg;
}
function showData(t,data,cached=false){
  const arr=Array.isArray(data?.earningsCalendar)?data.earningsCalendar:[];
  const today=iso(new Date()),future=arr.filter(x=>x.date>=today).sort((a,b)=>a.date.localeCompare(b.date)),past=arr.filter(x=>x.date<today).sort((a,b)=>b.date.localeCompare(a.date)),next=future[0]||null,last=past[0]||null;
  if(!next){showNoData(t);$('eventLast').textContent=last?.date||'—';$('eventMessage').textContent=(cached?'Cache · ':'')+'Abruf erfolgreich, aber kein kommender Termin gefunden.';return}
  const d=daysUntil(next.date);let level='low',icon='🟢',label='LOW';if(d<=1){level='high';icon='🔴';label='HIGH'}else if(d<=7){level='medium';icon='🟡';label='MEDIUM'}
  $('eventHero').className='event-hero '+level;$('eventBadge').className='event-badge '+level;$('eventBadge').textContent='EVENT RISK '+label;
  $('eventTitle').textContent=icon+' Earnings '+(d===0?'heute':d===1?'morgen':'in '+d+' Tagen');$('eventSub').textContent=t+' · '+next.date+' · '+hourText(next.hour);
  $('eventDate').textContent=next.date||'—';$('eventCountdown').textContent=d===0?'Heute':d===1?'1 Tag':d+' Tage';$('eventHour').textContent=hourText(next.hour);
  $('eventEps').textContent=Number.isFinite(Number(next.epsEstimate))?Number(next.epsEstimate).toLocaleString('de-DE',{maximumFractionDigits:3}):'—';$('eventRevenue').textContent=revenue(next.revenueEstimate);$('eventLast').textContent=last?.date||'—';
  $('eventMessage').textContent=(cached?'Cache · ':'')+arr.length+' Earnings-Einträge geladen.';
}

async function loadEvents(force=false){
  if(!$('eventCard'))return;
  const t=ticker(),key=apiKey(),mapped=apiTicker(t),cache=getCache(mapped);
  $('eventSub').textContent='Ausgewählte Aktie: '+t;
  if(!key){clearFields();$('eventBadge').className='event-badge';$('eventBadge').textContent='API FEHLT';$('eventTitle').textContent='Finnhub-Key nicht verfügbar';$('eventMessage').textContent='Öffne hier im Rechner ⚙️ API und speichere den bestehenden Key.';return}
  if(!force&&cache&&Date.now()-cache.time<EVENT_CACHE_MS){showData(t,cache.data,true);return}
  if(eventRequest)return;eventRequest=Date.now();$('eventMessage').textContent='Earnings werden geladen …';$('eventTitle').textContent='Earnings werden geprüft …';
  if(!allowRequest()){eventRequest=0;$('eventMessage').textContent='Safe-Mode-Limit erreicht. Kurz warten und erneut versuchen.';return}
  const now=new Date(),from=new Date(now.getTime()-60*86400000),to=new Date(now.getTime()+240*86400000);
  const url='https://finnhub.io/api/v1/calendar/earnings?from='+iso(from)+'&to='+iso(to)+'&symbol='+encodeURIComponent(mapped)+'&international=true&token='+encodeURIComponent(key);
  try{
    const r=await fetch(url,{cache:'no-store'});if(r.status===429)throw new Error('429');if(r.status===403)throw new Error('403');if(!r.ok)throw new Error('HTTP_'+r.status);const data=await r.json();setCache(mapped,data);showData(t,data,false);
  }catch(e){showNoData(t,e.message==='403'?'Earnings Calendar ist für diesen Finnhub-Zugang nicht freigeschaltet.':'Datenabruf fehlgeschlagen.');$('eventMessage').textContent=e.message==='429'?'Finnhub-Limit 429 erreicht. Kurz warten.':e.message==='403'?'Finnhub meldet 403: Endpoint im aktuellen Tarif nicht verfügbar.':'Earnings konnten nicht geladen werden.'}
  finally{eventRequest=0;updateUsage()}
}

function init(){
  ensureStyles();buildCard();
  const stock=$('stock');if(stock)stock.addEventListener('change',()=>setTimeout(()=>loadEvents(false),50));
  const save=$('saveKey');if(save)save.addEventListener('click',()=>setTimeout(()=>loadEvents(true),250));
  const refresh=$('refreshLive');if(refresh)refresh.addEventListener('click',()=>loadEvents(false));
  const version=document.querySelector('.version');if(version)version.textContent='V4.1 EVENTS';
  loadEvents(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();