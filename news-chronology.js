(()=>{'use strict';
const TITLE_TIMES=new Map();
let busy=false;
let pending=0;

function norm(v){return String(v||'').toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function titleOf(link){const clone=link.cloneNode(true);clone.querySelectorAll('span,.si-news-meta,.si-note').forEach(node=>node.remove());return String(clone.textContent||'').replace(/\s+/g,' ').trim()}
function parseGermanDate(value){
  const text=String(value||'').trim();
  if(!text)return 0;
  let timestamp=Date.parse(text);
  if(Number.isFinite(timestamp))return timestamp;
  const numeric=text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})[^\d]*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(numeric){
    let year=Number(numeric[3]);if(year<100)year+=2000;
    const date=new Date(year,Number(numeric[2])-1,Number(numeric[1]),Number(numeric[4]),Number(numeric[5]),Number(numeric[6]||0));
    timestamp=date.getTime();if(Number.isFinite(timestamp))return timestamp;
  }
  const months={januar:0,februar:1,märz:2,maerz:2,april:3,mai:4,juni:5,juli:6,august:7,september:8,oktober:9,november:10,dezember:11};
  const named=norm(text).match(/(\d{1,2})\.?\s+(januar|februar|marz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\s+(\d{4}).*?(\d{1,2}):(\d{2})/);
  if(named){const date=new Date(Number(named[3]),months[named[2]],Number(named[1]),Number(named[4]),Number(named[5]));timestamp=date.getTime();if(Number.isFinite(timestamp))return timestamp;}
  return 0;
}
function formatTime(timestamp){
  if(!Number.isFinite(timestamp)||timestamp<=0)return'Datum/Uhrzeit nicht geliefert';
  const date=new Date(timestamp);
  const day=String(date.getDate()).padStart(2,'0');
  const month=String(date.getMonth()+1).padStart(2,'0');
  const year=date.getFullYear();
  const hour=String(date.getHours()).padStart(2,'0');
  const minute=String(date.getMinutes()).padStart(2,'0');
  return`${day}.${month}.${year} · ${hour}:${minute} Uhr`;
}
function rawTimestamp(link){
  const explicit=Number(link.dataset.publishedAt||0);
  if(explicit>0)return explicit;
  const meta=link.querySelector('.si-news-meta span:nth-child(2),.sni-time');
  return parseGermanDate(meta?.textContent||'');
}
function captureRaw(root){
  root.querySelectorAll?.('a.si-news-item').forEach(link=>{
    const title=titleOf(link);const ts=rawTimestamp(link);
    if(title&&ts>0)TITLE_TIMES.set(norm(title),ts);
    link.dataset.publishedAt=String(ts||0);
    const meta=link.querySelector('.si-news-meta span:nth-child(2)');
    if(meta)meta.textContent=formatTime(ts);
  });
  root.querySelectorAll?.('.si-news-list').forEach(list=>{
    [...list.querySelectorAll(':scope > a.si-news-item')].sort((a,b)=>Number(b.dataset.publishedAt||0)-Number(a.dataset.publishedAt||0)).forEach(link=>list.appendChild(link));
  });
}
function sourceTimestamp(link){
  const title=titleOf(link);const cached=TITLE_TIMES.get(norm(title));
  if(cached)return cached;
  const span=link.querySelector('span');
  return parseGermanDate(span?.textContent||'');
}
function sourceName(link){const text=String(link.querySelector('span')?.textContent||'Quelle unbekannt');return text.split(' · ')[0].trim()||'Quelle unbekannt'}
function finalizeStories(root){
  root.querySelectorAll?.('.v37-story').forEach(story=>{
    const details=story.querySelector('.v37-sources');
    const links=details?[...details.querySelectorAll(':scope > a.v37-source-link')]:[];
    let latest=0;
    links.forEach(link=>{
      const ts=sourceTimestamp(link);latest=Math.max(latest,ts||0);link.dataset.publishedAt=String(ts||0);
      const span=link.querySelector('span');if(span)span.textContent=`${sourceName(link)} · ${formatTime(ts)}`;
    });
    links.sort((a,b)=>Number(b.dataset.publishedAt||0)-Number(a.dataset.publishedAt||0)).forEach(link=>details.appendChild(link));
    story.dataset.latestAt=String(latest||0);
    let stamp=story.querySelector('.senseis-story-time');
    if(!stamp){stamp=document.createElement('div');stamp.className='senseis-story-time';const heading=story.querySelector('h4');heading?.insertAdjacentElement('afterend',stamp)}
    stamp.textContent=latest?`🕒 ${formatTime(latest)} · neuestes Update`:'🕒 Datum/Uhrzeit nicht geliefert';
  });
  root.querySelectorAll?.('.v37-list').forEach(list=>{
    [...list.querySelectorAll(':scope > article.v37-story')].sort((a,b)=>Number(b.dataset.latestAt||0)-Number(a.dataset.latestAt||0)).forEach(story=>list.appendChild(story));
  });
}
function installStyle(){if(document.getElementById('senseis-news-chronology-style'))return;const style=document.createElement('style');style.id='senseis-news-chronology-style';style.textContent='.senseis-story-time{margin:-3px 0 10px;color:#9aa4b2;font-size:8px;font-weight:800;letter-spacing:.02em}.si-news-meta span:last-child{white-space:nowrap}';document.head.appendChild(style)}
function run(){pending=0;if(busy)return;const root=document.getElementById('view-stocks');if(!root)return;busy=true;try{captureRaw(root);finalizeStories(root)}finally{requestAnimationFrame(()=>{busy=false})}}
function schedule(){if(pending||busy)return;pending=requestAnimationFrame(run)}
function boot(){installStyle();const root=document.getElementById('view-stocks');if(!root)return;new MutationObserver(schedule).observe(root,{subtree:true,childList:true});root.addEventListener('click',event=>{if(event.target.closest('.v37-filter,.v37-event'))setTimeout(schedule,0)});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
