(()=>{'use strict';
const STYLE_ID='senseis-news-sentiment-style';
const SUMMARY_ID='senseisNewsSentimentSummary';
let processing=false;
let scheduled=0;

const BULLISH_STRONG=[
  'beats estimates','beats expectations','raises guidance','raised guidance','guidance raised','record revenue','record sales','record profit','profit jumps','profit surges','revenue jumps','revenue surges','wins contract','major contract','price target raised','target raised','rating upgrade','upgraded to buy','buy rating','strong demand','growth accelerates','outperforms','share buyback','stock buyback','dividend increase','dividend raised','new all-time high','new record high','positive outlook','strong outlook','earnings beat',
  'übertrifft erwartungen','prognose angehoben','ausblick angehoben','rekordumsatz','rekordgewinn','gewinnsprung','umsatzsprung','großauftrag','auftrag gewonnen','kursziel angehoben','hochgestuft','kaufempfehlung','starke nachfrage','wachstum beschleunigt','aktienrückkauf','dividende erhöht','neues allzeithoch','positiver ausblick','zahlen über den erwartungen'
];
const BULLISH_WEAK=[
  'rises','gains','climbs','advances','expands','growth','partnership','partners with','launches','approval','approved','breakthrough','innovation','market share gains','strong quarter','optimistic','opportunity','recovery','rebound','higher revenue','higher profit',
  'steigt','legt zu','klettert','gewinnt','expandiert','wachstum','partnerschaft','kooperation','startet','zulassung','zugelassen','durchbruch','innovation','marktanteil gewonnen','starkes quartal','optimistisch','chance','erholung','höherer umsatz','höherer gewinn'
];
const BEARISH_STRONG=[
  'misses estimates','misses expectations','cuts guidance','cut guidance','guidance cut','profit warning','revenue warning','price target cut','target cut','rating downgrade','downgraded to sell','sell rating','lawsuit','class action','investigation','regulatory probe','fraud','data breach','recall','bankruptcy','default','loss widens','profit plunges','revenue plunges','antitrust charges','accounting irregularities','earnings miss','dividend cut',
  'verfehlt erwartungen','prognose gesenkt','ausblick gesenkt','gewinnwarnung','umsatzwarnung','kursziel gesenkt','herabgestuft','verkaufsempfehlung','klage','sammelklage','ermittlung','untersuchung','betrug','datenleck','rückruf','insolvenz','zahlungsausfall','verlust ausgeweitet','gewinneinbruch','umsatzeinbruch','kartellvorwurf','bilanzunregelmäßigkeiten','zahlen unter den erwartungen','dividende gekürzt'
];
const BEARISH_WEAK=[
  'falls','drops','declines','slips','slumps','plunges','weak demand','slowing growth','layoffs','job cuts','cuts jobs','loss','losses','margin pressure','cost pressure','headwinds','warning','concern','risk','uncertainty','delay','delayed','lower revenue','lower profit','disappointing','underperforms',
  'fällt','sinkt','gibt nach','rutscht ab','bricht ein','schwache nachfrage','wachstum verlangsamt','entlassungen','stellenabbau','verlust','verluste','margendruck','kostendruck','gegenwind','warnung','sorge','risiko','unsicherheit','verzögerung','verschoben','niedrigerer umsatz','niedrigerer gewinn','enttäuschend','unterdurchschnittlich'
];

function normalize(text){return String(text||'').toLocaleLowerCase('de-DE').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim()}
function occurrences(text,phrase){let count=0,pos=0;while((pos=text.indexOf(phrase,pos))!==-1){count++;pos+=phrase.length}return count}
function negated(text,phrase){const pos=text.indexOf(phrase);if(pos<0)return false;const prefix=text.slice(Math.max(0,pos-24),pos);return /(?:not|no|without|kein(?:e|en|er|es)?|nicht|ohne)\s+(?:\w+\s+){0,2}$/i.test(prefix)}
function applyList(text,list,weight){let score=0;for(const phrase of list){const count=occurrences(text,phrase);if(!count)continue;score+=(negated(text,phrase)?-weight:weight)*count}return score}
function classifyHeadline(title){
  const text=normalize(title);
  let score=0;
  score+=applyList(text,BULLISH_STRONG,2);
  score+=applyList(text,BULLISH_WEAK,1);
  score-=applyList(text,BEARISH_STRONG,2);
  score-=applyList(text,BEARISH_WEAK,1);
  if(score>=2)return{state:'bullish',label:'Bullish',icon:'🟢',score};
  if(score<=-2)return{state:'bearish',label:'Bearish',icon:'🔴',score};
  return{state:'neutral',label:'Neutral',icon:'⚪',score};
}

function parseGermanDate(value){
  const text=String(value||'').trim();
  if(!text)return 0;
  const direct=Date.parse(text);
  if(Number.isFinite(direct))return direct;
  let m=text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
  if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0)).getTime();
  const months={jan:0,januar:0,feb:1,februar:1,mär:2,maerz:2,märz:2,mar:2,apr:3,april:3,mai:4,jun:5,juni:5,jul:6,juli:6,aug:7,august:7,sep:8,september:8,okt:9,oktober:9,nov:10,november:10,dez:11,dezember:11};
  m=normalize(text).match(/(\d{1,2})\.?\s+([a-zä]+)\.?\s+(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);
  if(m&&months[m[2]]!=null)return new Date(Number(m[3]),months[m[2]],Number(m[1]),Number(m[4]||0),Number(m[5]||0)).getTime();
  return 0;
}

function addStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
  .si-news-sentiment-summary{display:grid;grid-template-columns:minmax(190px,1.2fr) repeat(3,minmax(90px,.6fr));gap:8px;margin:0 0 11px}
  .si-news-sentiment-overall,.si-news-sentiment-count{border:1px solid #252b34;border-radius:12px;background:#12161c;padding:10px 11px;min-width:0}
  .si-news-sentiment-overall span,.si-news-sentiment-count span{display:block;color:#8c95a3;font-size:9px;font-weight:800;letter-spacing:.05em}
  .si-news-sentiment-overall strong,.si-news-sentiment-count strong{display:block;margin-top:5px;font-size:13px}
  .si-news-sentiment-count.bullish strong{color:#30d158}.si-news-sentiment-count.neutral strong{color:#d8dde5}.si-news-sentiment-count.bearish strong{color:#ff453a}
  .si-news-balance{height:7px;border-radius:99px;background:#252b34;overflow:hidden;display:flex;margin-top:9px}
  .si-news-balance span{height:100%;min-width:0}.si-news-balance .bullish{background:#30d158}.si-news-balance .neutral{background:#8c95a3}.si-news-balance .bearish{background:#ff453a}
  .si-news-item{position:relative;padding-right:104px!important}
  .si-news-sentiment-badge{position:absolute;right:10px;top:10px;display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border:1px solid #343c48;border-radius:999px;background:#0d1014;font-size:9px;font-weight:900;white-space:nowrap}
  .si-news-sentiment-badge.bullish{color:#30d158;border-color:rgba(48,209,88,.38);background:rgba(48,209,88,.07)}
  .si-news-sentiment-badge.neutral{color:#d8dde5}
  .si-news-sentiment-badge.bearish{color:#ff453a;border-color:rgba(255,69,58,.38);background:rgba(255,69,58,.07)}
  .si-news-sort-note{color:#8c95a3;font-size:9px;margin:-3px 0 9px}
  @media(max-width:680px){.si-news-sentiment-summary{grid-template-columns:1fr 1fr}.si-news-sentiment-overall{grid-column:1/-1}}
  @media(max-width:420px){.si-news-item{padding-right:12px!important;padding-top:40px!important}.si-news-sentiment-badge{left:11px;right:auto;top:9px}}
  `;
  document.head.appendChild(style);
}

function overallState(counts){
  const net=counts.bullish-counts.bearish;
  if(net>=2)return{state:'bullish',text:'🟢 News-Lage eher bullish',net};
  if(net<=-2)return{state:'bearish',text:'🔴 News-Lage eher bearish',net};
  return{state:'neutral',text:'⚪ News-Lage ausgeglichen',net};
}
function summaryHtml(counts){
  const total=counts.bullish+counts.neutral+counts.bearish||1;
  const overall=overallState(counts);
  return `<div id="${SUMMARY_ID}" class="si-news-sentiment-summary"><div class="si-news-sentiment-overall"><span>AUTOMATISCHE SCHLAGZEILEN-ANALYSE</span><strong>${overall.text}</strong><div class="si-news-balance" title="Verteilung der Meldungen"><span class="bullish" style="width:${counts.bullish/total*100}%"></span><span class="neutral" style="width:${counts.neutral/total*100}%"></span><span class="bearish" style="width:${counts.bearish/total*100}%"></span></div></div><div class="si-news-sentiment-count bullish"><span>BULLISH</span><strong>🟢 ${counts.bullish}</strong></div><div class="si-news-sentiment-count neutral"><span>NEUTRAL</span><strong>⚪ ${counts.neutral}</strong></div><div class="si-news-sentiment-count bearish"><span>BEARISH</span><strong>🔴 ${counts.bearish}</strong></div></div>`;
}

function enhanceNews(){
  if(processing)return;
  const box=document.getElementById('siNews');
  const list=box?.querySelector('.si-news-list');
  if(!box||!list)return;
  const items=[...list.querySelectorAll(':scope > .si-news-item')];
  if(!items.length)return;
  const alreadyEnhanced=!!box.querySelector('#'+SUMMARY_ID)&&items.every(item=>item.querySelector('.si-news-sentiment-badge')&&item.dataset.newsSentiment)&&items.every((item,index)=>index===0||Number(items[index-1].dataset.newsTimestamp||0)>=Number(item.dataset.newsTimestamp||0));
  if(alreadyEnhanced)return;
  processing=true;
  try{
    const rows=items.map((item,index)=>{
      const title=item.querySelector('strong')?.textContent||'';
      const meta=[...item.querySelectorAll('.si-news-meta span')];
      const dateText=meta.at(-1)?.textContent||'';
      const timestamp=parseGermanDate(dateText);
      const sentiment=classifyHeadline(title);
      return{item,index,timestamp,sentiment};
    });
    rows.sort((a,b)=>(b.timestamp-a.timestamp)||(a.index-b.index));
    const fragment=document.createDocumentFragment();
    const counts={bullish:0,neutral:0,bearish:0};
    for(const row of rows){
      counts[row.sentiment.state]++;
      row.item.querySelector('.si-news-sentiment-badge')?.remove();
      const badge=document.createElement('span');
      badge.className='si-news-sentiment-badge '+row.sentiment.state;
      badge.textContent=row.sentiment.icon+' '+row.sentiment.label;
      badge.title='Automatische Schlagzeilenbewertung; Score '+(row.sentiment.score>0?'+':'')+row.sentiment.score;
      row.item.appendChild(badge);
      row.item.dataset.newsTimestamp=String(row.timestamp||0);
      row.item.dataset.newsSentiment=row.sentiment.state;
      fragment.appendChild(row.item);
    }
    list.appendChild(fragment);
    box.querySelector('#'+SUMMARY_ID)?.remove();
    box.querySelector('.si-news-sort-note')?.remove();
    const sectionTitle=box.querySelector('.si-section-title');
    if(sectionTitle){
      sectionTitle.insertAdjacentHTML('afterend',summaryHtml(counts)+'<div class="si-news-sort-note">Neueste Meldung oben · Bewertung basiert ausschließlich auf der Überschrift und ist keine Anlageempfehlung.</div>');
    }
    box.dataset.newsSentimentEnhanced='1';
  }finally{processing=false}
}
function schedule(){clearTimeout(scheduled);scheduled=setTimeout(enhanceNews,80)}
function boot(){
  addStyles();
  const observer=new MutationObserver(()=>{if(!processing)schedule()});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  document.addEventListener('change',event=>{if(event.target?.id==='siSymbol')schedule()});
  document.addEventListener('click',event=>{if(event.target?.id==='siRefresh')schedule()});
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
