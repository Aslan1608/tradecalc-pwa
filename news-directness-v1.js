(()=>{'use strict';
const ALIASES={GOOG:['Alphabet','Google'],GOOGL:['Alphabet','Google'],META:['Meta','Facebook'],NFLX:['Netflix'],AMZN:['Amazon'],MSFT:['Microsoft'],AAPL:['Apple'],NVDA:['Nvidia','NVIDIA'],AVGO:['Broadcom'],AMD:['AMD','Advanced Micro Devices'],ADBE:['Adobe'],CRM:['Salesforce'],COST:['Costco'],JPM:['JPMorgan','JP Morgan'],V:['Visa'],MA:['Mastercard'],ASML:['ASML']};
let mode='direct',timer=0,observer=null,lastTicker='',patching=false,lastResult='';
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function selected(){const s=document.getElementById('siSymbol');if(!s)return null;const ticker=String(s.value||'').trim().toUpperCase().replace(/\.DE$/,'');const text=String(s.options[s.selectedIndex]?.textContent||'');const company=(text.includes('—')?text.split('—').slice(1).join('—'):text).trim();return{ticker,company,aliases:[company,ticker,...(ALIASES[ticker]||[])].filter(Boolean)}}
function directTitle(title,info){const t=' '+norm(title)+' ';for(const alias of info.aliases){const a=norm(alias);if(a.length<3)continue;if(t.includes(' '+a+' '))return true}return false}
function parseScore(story,index){const raw=story.querySelectorAll('.v37-score b')[index]?.textContent||'';const m=raw.match(/(\d+)/);return m?Number(m[1]):0}
function direction(story){for(const x of ['bullish','bearish','ambivalent','neutral'])if(story.classList.contains(x))return x;return'neutral'}
function computePulse(stories){const eligible=stories.filter(s=>!s.classList.contains('v37-opinion')).map(s=>({impact:parseScore(s,0),confidence:parseScore(s,1),dir:direction(s)})).filter(x=>x.impact>=25).sort((a,b)=>b.impact-a.impact).slice(0,5);let num=0,den=0;for(const x of eligible){const sign=x.dir==='bullish'?1:x.dir==='bearish'?-1:0,w=Math.sqrt(x.impact)*(x.confidence/100);num+=sign*w;den+=w}return{score:Math.round(Math.max(0,Math.min(100,50+50*(den?num/den:0)))),used:eligible}}
function style(){if(document.getElementById('newsDirectnessStyles'))return;const s=document.createElement('style');s.id='newsDirectnessStyles';s.textContent=`.snd-filter{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}.snd-filter button{min-height:38px;border:1px solid #343c48;border-radius:10px;background:#0e1319;color:#8c95a3;font-size:9px;font-weight:900}.snd-filter button.active{background:#fff;color:#050607;border-color:#fff}.v37-story.senseis-context{border-style:dashed}.v37-badge.snd-direct{color:#30d158;border-color:rgba(48,209,88,.4)}.v37-badge.snd-context{color:#8c95a3}.snd-note{margin:7px 0;color:#8c95a3;font-size:8px;line-height:1.4}`;document.head.appendChild(s)}
function setText(node,text){if(node&&node.textContent!==text){node.textContent=text;return true}return false}
function setHtml(node,html){if(node&&node.innerHTML!==html){node.innerHTML=html;return true}return false}
function patch(){
  if(patching)return;
  clearTimeout(timer);
  timer=setTimeout(()=>{
    const info=selected(),box=document.getElementById('siNews');if(!info||!box)return;
    const shell=box.querySelector('.sni-v37-shell');if(!shell)return;
    if(lastTicker!==info.ticker){mode='direct';lastTicker=info.ticker;lastResult=''}
    const list=box.querySelector('.v37-list'),stories=[...box.querySelectorAll('.v37-list .v37-story')];if(!list||!stories.length)return;
    patching=true;let changed=false,direct=0,context=0;
    for(const story of stories){
      const title=story.querySelector('h4')?.textContent||'',isDirect=directTitle(title,info),relation=isDirect?'direct':'context',display=mode==='all'||(mode==='direct'&&isDirect)||(mode==='context'&&!isDirect)?'':'none';
      if(story.dataset.senseisRelation!==relation){story.dataset.senseisRelation=relation;changed=true}
      if(story.classList.contains('senseis-direct')!==isDirect){story.classList.toggle('senseis-direct',isDirect);changed=true}
      if(story.classList.contains('senseis-context')===isDirect){story.classList.toggle('senseis-context',!isDirect);changed=true}
      if(story.style.display!==display){story.style.display=display;changed=true}
      direct+=isDirect?1:0;context+=isDirect?0:1;
      let badge=story.querySelector('.snd-relation');if(!badge){badge=document.createElement('span');badge.className='v37-badge snd-relation';story.querySelector('.v37-badges')?.appendChild(badge);changed=true}
      if(badge){badge.classList.toggle('snd-direct',isDirect);badge.classList.toggle('snd-context',!isDirect);changed=setText(badge,isDirect?'🎯 DIREKT':'↔ UMFELD')||changed}
    }
    let filter=box.querySelector('.snd-filter');if(!filter){filter=document.createElement('div');filter.className='snd-filter';list.insertAdjacentElement('beforebegin',filter);changed=true}
    const filterHtml=`<button data-snd="direct">🎯 Direkt ${direct}</button><button data-snd="context">↔ Umfeld ${context}</button><button data-snd="all">Alle ${direct+context}</button>`;
    changed=setHtml(filter,filterHtml)||changed;
    filter.querySelectorAll('button').forEach(b=>{const active=b.dataset.snd===mode;if(b.classList.contains('active')!==active){b.classList.toggle('active',active);changed=true}b.onclick=()=>{if(mode===b.dataset.snd)return;mode=b.dataset.snd;lastResult='';patch()}});
    let note=box.querySelector('.snd-note');if(!note){note=document.createElement('div');note.className='snd-note';filter.insertAdjacentElement('afterend',note);changed=true}
    changed=setText(note,'News-Pulse und Unternehmenslage basieren standardmäßig nur auf direkt zugeordneten Storys. Umfeld bleibt separat sichtbar.')||changed;
    const directStories=stories.filter(s=>s.dataset.senseisRelation==='direct'),p=computePulse(directStories),counts={bullish:0,bearish:0,neutral:0,ambivalent:0};
    directStories.filter(s=>!s.classList.contains('v37-opinion')).forEach(s=>counts[direction(s)]++);
    const ring=box.querySelector('.v37-ring'),strong=ring?.querySelector('strong');if(ring&&ring.style.getPropertyValue('--score')!==String(p.score)){ring.style.setProperty('--score',String(p.score));changed=true}changed=setText(strong,String(p.score))||changed;
    const pulseLabel=p.score>=62?'🟢 DIREKTER STORY-PULSE POSITIV':p.score<=38?'🔴 DIREKTER STORY-PULSE NEGATIV':'⚪ DIREKTER STORY-PULSE AUSGEGLICHEN';changed=setText(box.querySelector('.v37-pulse h4'),pulseLabel)||changed;changed=setText(box.querySelector('.v37-pulse p'),'Richtung nur aus direkt dem Unternehmen zugeordneten, relevanten Story-Clustern — keine Kursprognose.')||changed;
    const stats=box.querySelectorAll('.v37-stat');changed=setHtml(stats[0],`<span>DIREKTE STORYS</span><strong>${direct}</strong>`)||changed;changed=setHtml(stats[3],`<span>DIREKTE PULSE-BASIS</span><strong>${p.used.length} relevant</strong>`)||changed;
    const vals=[['bullish','🟢'],['neutral','⚪'],['ambivalent','🟠'],['bearish','🔴']],countNodes=box.querySelectorAll('.v37-counts span');countNodes.forEach((node,i)=>{const [k,icon]=vals[i]||[];if(k)changed=setText(node,`${icon} ${counts[k]} ${k}`)||changed});
    const result=`${info.ticker}|${direct}|${context}|${p.score}|${counts.bullish}|${counts.neutral}|${counts.ambivalent}|${counts.bearish}`;
    if(result!==lastResult){lastResult=result;window.dispatchEvent(new CustomEvent('senseis-news-directness-updated',{detail:{ticker:info.ticker,direct,context,pulse:p.score}}))}
    setTimeout(()=>{patching=false},0);
  },100)
}
function boot(){
  style();patch();
  document.addEventListener('change',e=>{if(e.target?.id==='siSymbol'){lastTicker='';lastResult='';patch()}});
  document.addEventListener('click',e=>{if(e.target?.id==='siRefresh'){lastResult='';setTimeout(patch,600)}});
  const view=document.getElementById('view-stocks');if(view){observer=new MutationObserver(records=>{if(patching)return;const onlyOwn=records.every(r=>r.target.closest?.('.snd-filter,.snd-note,.snd-relation'));if(!onlyOwn)patch()});observer.observe(view,{subtree:true,childList:true})}
}
if(typeof window!=='undefined')window.SenSeiSNewsDirectness={directTitle,computePulse};
if(typeof module!=='undefined'&&module.exports)module.exports={directTitle,computePulse};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}
})();
