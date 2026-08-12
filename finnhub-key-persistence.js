(()=>{'use strict';
const DB_NAME='senseis-terminal-settings';
const STORE='settings';
const CHANNEL='senseis-api-settings-v1';
const rawGet=Storage.prototype.getItem;
const rawSet=Storage.prototype.setItem;
const rawRemove=Storage.prototype.removeItem;
const memory=Object.create(null);
const CONFIG={
  'tradecalc-finnhub-key':{
    backup:'senseis-finnhub-key-backup-v1',
    record:'finnhub-api-key',
    cookie:'senseis_finnhub_key_v1',
    clean(value){const key=String(value||'').trim();return key&&key!=='SENSEIS_DAX_ONLY'?key:''}
  },
  'senseis-market-feed-url':{
    backup:'senseis-market-feed-url-backup-v1',
    record:'market-feed-url',
    cookie:'senseis_market_feed_v1',
    clean(value){const url=String(value||'').trim();return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(url)?url.split('?')[0]:''}
  }
};
let channel=null;

function localRead(key,cleaner){try{return cleaner(rawGet.call(localStorage,key))}catch{return''}}
function localWrite(key,value){try{rawSet.call(localStorage,key,value)}catch{}}
function localDelete(key){try{rawRemove.call(localStorage,key)}catch{}}
function cookieRead(name,cleaner){try{const prefix=name+'=';const row=String(document.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(prefix));return row?cleaner(decodeURIComponent(row.slice(prefix.length))):''}catch{return''}}
function cookieWrite(name,value){try{document.cookie=`${name}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/tradecalc-pwa/; SameSite=Lax; Secure`}catch{}}
function cookieDelete(name){try{document.cookie=`${name}=; Max-Age=0; Path=/tradecalc-pwa/; SameSite=Lax; Secure`}catch{}}
function openDb(){return new Promise((resolve,reject)=>{try{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('IDB_BLOCKED'))}catch(error){reject(error)}})}
async function dbRead(record,cleaner){let db;try{db=await openDb();return await new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(record);req.onsuccess=()=>resolve(cleaner(req.result));req.onerror=()=>reject(req.error)})}catch{return''}finally{try{db?.close()}catch{}}}
async function dbWrite(record,value){let db;try{db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}catch{}finally{try{db?.close()}catch{}}}
async function dbDelete(record){let db;try{db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}catch{}finally{try{db?.close()}catch{}}}
function configFor(key){return CONFIG[key]||null}
function primaryFor(key){if(CONFIG[key])return key;return Object.keys(CONFIG).find(primary=>CONFIG[primary].backup===key)||''}
function read(key){const cfg=configFor(key);if(!cfg)return'';return localRead(key,cfg.clean)||localRead(cfg.backup,cfg.clean)||cookieRead(cfg.cookie,cfg.clean)||memory[key]||''}
function notify(key,source='updated',broadcast=true){
  const primary=primaryFor(key);if(!primary)return;
  if(broadcast)try{channel?.postMessage({type:'api-setting',key:primary,source})}catch{}
  try{window.dispatchEvent(new CustomEvent('senseis:api-settings-restored',{detail:{key:primary,source}}))}catch{}
  [120,500,1400,3000].forEach(delay=>setTimeout(()=>{
    try{document.getElementById('refreshLive')?.click()}catch{}
    try{document.getElementById('siRefresh')?.click()}catch{}
    try{const input=document.getElementById('apiKeyInput');if(input&&primary==='tradecalc-finnhub-key')input.value=read(primary)}catch{}
    try{const input=document.getElementById('marketFeedUrlInput');if(input&&primary==='senseis-market-feed-url')input.value=read(primary)}catch{}
  },delay));
}
function persist(key,value,announce=true){const cfg=configFor(key);if(!cfg)return'';const clean=cfg.clean(value);if(!clean)return'';memory[key]=clean;localWrite(key,clean);localWrite(cfg.backup,clean);cookieWrite(cfg.cookie,clean);dbWrite(cfg.record,clean);try{navigator.storage?.persist?.()}catch{}if(announce)notify(key,'saved',true);return clean}
function clear(key,announce=true){const cfg=configFor(key);if(!cfg)return;memory[key]='';localDelete(key);localDelete(cfg.backup);cookieDelete(cfg.cookie);dbDelete(cfg.record);if(announce)notify(key,'cleared',true)}

if(!window.__senseisApiPersistencePatch){
  window.__senseisApiPersistencePatch=true;
  Storage.prototype.getItem=function(key){const cfg=configFor(key);if(cfg)return read(key)||null;return rawGet.call(this,key)};
  Storage.prototype.setItem=function(key,value){const cfg=configFor(key);if(cfg){persist(key,value,true);return}return rawSet.call(this,key,value)};
  Storage.prototype.removeItem=function(key){const cfg=configFor(key);if(cfg){clear(key,true);return}return rawRemove.call(this,key)};
}

try{
  channel=new BroadcastChannel(CHANNEL);
  channel.onmessage=event=>{const key=primaryFor(event?.data?.key);if(key)notify(key,'cross-context',false)};
}catch{}
window.addEventListener('storage',event=>{const key=primaryFor(event.key);if(key)notify(key,'storage',false)});

async function restoreOne(key){const cfg=configFor(key);const primary=localRead(key,cfg.clean);const backup=localRead(cfg.backup,cfg.clean);const cookie=cookieRead(cfg.cookie,cfg.clean);const indexed=await dbRead(cfg.record,cfg.clean);const value=primary||backup||cookie||indexed;if(!value)return{key,value:'',restored:false};persist(key,value,false);return{key,value,restored:!primary}}
async function restore(){const results=await Promise.all(Object.keys(CONFIG).map(restoreOne));for(const result of results)if(result.value)notify(result.key,result.restored?'restored':'ready',false);return results}
const ready=restore();

window.SenSeiSApiPersistence={
  ready,
  restore,
  whenReady:()=>ready,
  getFinnhub:()=>read('tradecalc-finnhub-key'),
  saveFinnhub:value=>persist('tradecalc-finnhub-key',value,true),
  clearFinnhub:()=>clear('tradecalc-finnhub-key',true),
  getFeed:()=>read('senseis-market-feed-url'),
  saveFeed:value=>persist('senseis-market-feed-url',value,true),
  clearFeed:()=>clear('senseis-market-feed-url',true)
};
window.SenSeiSFinnhubPersistence={ready,restore,save:window.SenSeiSApiPersistence.saveFinnhub,clear:window.SenSeiSApiPersistence.clearFinnhub,get:window.SenSeiSApiPersistence.getFinnhub};
})();
