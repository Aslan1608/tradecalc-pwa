(()=>{'use strict';
const STYLE_ID='senseis-stock-intelligence-embed-style';
let applying=false;
let watchedCard=null;
let cardObserver=null;

function $(id){return document.getElementById(id)}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}

function addStyles(){
  if($(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
  .live #eventCard{margin:16px 0 0!important;padding:15px 0 0!important;border:0!important;border-top:1px solid var(--line)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
  .live #eventCard .event-top{align-items:center!important;margin-bottom:10px}
  .live #eventCard .event-top h2{font-size:15px!important}
  .live #eventCard .event-top .mini{font-size:10px!important}
  .live #eventCard .event-badge{display:inline-flex;align-items:center;justify-content:center;min-height:27px;padding:5px 8px;font-size:9px;letter-spacing:.02em}
  .live #eventCard .event-badge.signal-green{color:var(--green);border-color:rgba(48,209,88,.38);background:rgba(48,209,88,.09)}
  .live #eventCard .event-badge.signal-orange{color:#ff9f0a;border-color:rgba(255,159,10,.42);background:rgba(255,159,10,.09)}
  .live #eventCard .event-badge.signal-red{color:var(--red);border-color:rgba(255,69,58,.42);background:rgba(255,69,58,.1)}
  .live #eventCard .event-badge.signal-neutral{color:var(--muted);border-color:var(--line);background:var(--card2)}
  .live #eventCard .event-hero{margin-top:0;padding:11px 12px}
  .live #eventCard .event-hero.signal-green{border-color:rgba(48,209,88,.3);background:rgba(48,209,88,.055)}
  .live #eventCard .event-hero.signal-orange{border-color:rgba(255,159,10,.34);background:rgba(255,159,10,.06)}
  .live #eventCard .event-hero.signal-red{border-color:rgba(255,69,58,.36);background:rgba(255,69,58,.065)}
  .live #eventCard .event-hero.signal-neutral{border-color:var(--line);background:var(--card2)}
  .live #eventCard .event-title{font-size:14px}
  .live #eventCard .event-sub{font-size:10px;margin-top:4px}
  .live #eventCard .event-grid{grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
  .live #eventCard .event-cell{padding:8px 9px}
  .live #eventCard .event-cell span{font-size:9px;margin-bottom:3px}
  .live #eventCard .event-cell strong{font-size:11px}
  .live #eventCard .event-actions{margin-top:8px}
  .live #eventCard .event-message{padding:8px 9px;font-size:9px}
  .live #eventCard .event-refresh{min-width:40px;min-height:36px}
  @media(max-width:430px){.live #eventCard .event-grid{grid-template-columns:1fr 1fr}}
  @media(max-width:350px){.live #eventCard .event-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function parseDays(){
  const value=String($('eventCountdown')?.textContent||'').trim();
  if(/^heute$/i.test(value))return 0;
  const match=value.match(/-?\d+/);
  return match?Number(match[0]):null;
}

function signalState(){
  const badgeText=String($('eventBadge')?.textContent||'');
  const titleText=String($('eventTitle')?.textContent||'');
  const messageText=String($('eventMessage')?.textContent||'');
  if(/API FEHLER|Abruf fehlgeschlagen|Key fehlt|Netzwerk|abgewiesen|Limit 429|SAFE_LIMIT/i.test(badgeText+' '+titleText+' '+messageText))return{state:'neutral',days:null,noFuture:false};
  if(/Keine kommenden Earnings gefunden/i.test(titleText))return{state:'green',days:null,noFuture:true};
  const days=parseDays();
  if(days===0)return{state:'red',days,noFuture:false};
  if(Number.isFinite(days)&&days>=1&&days<=7)return{state:'orange',days,noFuture:false};
  if(Number.isFinite(days)&&days>7)return{state:'green',days,noFuture:false};
  return{state:'neutral',days:null,noFuture:false};
}

function applySignal(){
  if(applying||!$('eventCard'))return;
  applying=true;
  try{
    const badge=$('eventBadge');
    const hero=$('eventHero');
    const title=$('eventTitle');
    const result=signalState();
    const states=['signal-green','signal-orange','signal-red','signal-neutral','low','medium','high','error'];
    if(badge){badge.classList.remove(...states);badge.classList.add('signal-'+result.state)}
    if(hero){hero.classList.remove(...states);hero.classList.add('signal-'+result.state)}

    if(result.state==='red'){
      setText(badge,'🔴 EVENT HEUTE');
      setText(title,'🔴 Earnings-Event heute');
    }else if(result.state==='orange'){
      setText(badge,'🟠 EVENT ≤ 7 TAGE');
      setText(title,result.days===1?'🟠 Earnings-Event morgen':'🟠 Earnings-Event diese Woche');
    }else if(result.state==='green'){
      setText(badge,'🟢 KEIN EVENT ≤ 7 TAGE');
      setText(title,result.noFuture?'🟢 Kein bestätigtes Event in den nächsten 7 Tagen':'🟢 Kein Event in den nächsten 7 Tagen');
    }else{
      setText(badge,'⚪ STATUS UNKLAR');
    }
  }finally{
    applying=false;
  }
}

function observeCard(card){
  if(watchedCard===card)return;
  if(cardObserver)cardObserver.disconnect();
  watchedCard=card;
  cardObserver=new MutationObserver(()=>setTimeout(applySignal,0));
  cardObserver.observe(card,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
}

function embed(){
  const live=document.querySelector('.card.live');
  const card=$('eventCard');
  if(!live||!card)return false;
  if(card.parentElement!==live)live.appendChild(card);
  card.classList.remove('card');
  card.classList.add('event-card-embedded');
  const heading=card.querySelector('.event-top h2');
  const mini=card.querySelector('.event-top .mini');
  setText(heading,'Stock Intelligence');
  setText(mini,'Earnings · nächstes und letztes Event');
  observeCard(card);
  applySignal();
  return true;
}

function boot(){
  addStyles();
  let attempts=0;
  const timer=setInterval(()=>{
    if(embed()||attempts++>100)clearInterval(timer);
  },100);
  const bodyObserver=new MutationObserver(()=>embed());
  bodyObserver.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();