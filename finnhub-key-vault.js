(()=>{'use strict';
const PRIMARY='tradecalc-finnhub-key';
const BACKUP='senseis-finnhub-key-backup-v2';
const DB_NAME='senseis-terminal-settings';
const STORE='settings';
const RECORD='finnhub-api-key';
const originalGet=Storage.prototype.getItem;
const originalSet=Storage.prototype.setItem;
const originalRemove=Storage.prototype.removeItem;
let memoryKey='';

function clean(value){const key=String(value||'').trim();return key&&key!=='SENSEIS_DAX_ONLY'?key:''}
function rawGet(storage,key){try{return clean(originalGet.call(storage,key))}catch{return''}}
function rawSet(storage,key,value){try{originalSet.call(storage,key,value);return true}catch{return false}}
function rawRemove(storage,key){try{originalRemove.call(storage,key)}catch{}}
function openDb(){return new Promise((resolve,reject)=>{try{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('IDB_OPEN_FAILED'));request.onblocked=()=>reject(new Error('IDB_BLOCKED'))}catch(error){reject(error)}})}
async function dbGet(){let db;try{db=await openDb();return await new Promise((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).get(RECORD);request.onsuccess=()=>resolve(clean(request.result));request.onerror=()=>reject(request.error)})}catch{return''}finally{try{db?.close()}catch{}}}
async function dbSet(value){let db;try{db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,RECORD);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}catch{}finally{try{db?.close()}catch{}}}
async function dbDelete(){let db;try{db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(RECORD);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}catch{}finally{try{db?.close()}catch{}}}
function notifyRestored(){try{window.dispatchEvent(new CustomEvent('senseis:finnhub-key-restored'))}catch{}setTimeout(()=>document.getElementById('refreshLive')?.click(),300);setTimeout(()=>document.getElementById('siRefresh')?.click(),900)}
function persistKey(value,{requestPersistent=false,notify=false}={}){const key=clean(value);if(!key)return'';memoryKey=key;rawSet(localStorage,PRIMARY,key);rawSet(localStorage,BACKUP,key);dbSet(key);if(requestPersistent)try{navigator.storage?.persist?.()}catch{}if(notify)notifyRestored();return key}
function clearKey(){memoryKey='';rawRemove(localStorage,PRIMARY);rawRemove(localStorage,BACKUP);dbDelete()}

if(!window.__senseisFinnhubVaultPatched){
  window.__senseisFinnhubVaultPatched=true;
  Storage.prototype.getItem=function(key){
    if(key===PRIMARY){const primary=rawGet(this,PRIMARY),backup=rawGet(this,BACKUP);return primary||backup||memoryKey||null}
    return originalGet.call(this,key)
  };
  Storage.prototype.setItem=function(key,value){
    if(key===PRIMARY){persistKey(value,{requestPersistent:true});return}
    return originalSet.call(this,key,value)
  };
  Storage.prototype.removeItem=function(key){
    if(key===PRIMARY){clearKey();return}
    return originalRemove.call(this,key)
  };
}

async function restore(){
  const primary=rawGet(localStorage,PRIMARY),backup=rawGet(localStorage,BACKUP),indexed=await dbGet();
  const key=primary||backup||indexed;
  if(!key)return'';
  const restored=!primary||!backup;
  persistKey(key);
  if(restored)notifyRestored();
  return key
}
function attachUi(){
  document.getElementById('saveKey')?.addEventListener('click',()=>{const input=document.getElementById('apiKeyInput');const key=clean(input?.value);if(key)persistKey(key,{requestPersistent:true})},true);
  document.getElementById('apiSettings')?.addEventListener('click',()=>setTimeout(()=>{const input=document.getElementById('apiKeyInput');const key=clean(localStorage.getItem(PRIMARY));if(input&&key)input.value=key},0));
}
async function boot(){await restore();attachUi();window.addEventListener('pagehide',()=>{const key=clean(localStorage.getItem(PRIMARY));if(key)persistKey(key)});document.addEventListener('visibilitychange',()=>{if(document.hidden){const key=clean(localStorage.getItem(PRIMARY));if(key)persistKey(key)}})}
window.SenSeiSFinnhubVault={restore,save:value=>persistKey(value,{requestPersistent:true}),clear:clearKey,get:()=>clean(localStorage.getItem(PRIMARY))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
