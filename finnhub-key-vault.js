(()=>{'use strict';
const PRIMARY='tradecalc-finnhub-key';
const BACKUP='senseis-finnhub-key-backup-v1';
const DB_NAME='senseis-terminal-settings';
const DB_VERSION=1;
const STORE='settings';
const RECORD='finnhub-api-key';
const nativeGet=Storage.prototype.getItem;
const nativeSet=Storage.prototype.setItem;
const nativeRemove=Storage.prototype.removeItem;
let recoveredKey='';
let recoveryPromise=null;

function clean(value){const key=String(value||'').trim();return key==='SENSEIS_DAX_ONLY'?'':key}
function localGet(key){try{return clean(nativeGet.call(localStorage,key))}catch{return''}}
function localSet(key,value){try{nativeSet.call(localStorage,key,value);return true}catch{return false}}
function localRemove(key){try{nativeRemove.call(localStorage,key)}catch{}}
function openDb(){return new Promise((resolve,reject)=>{try{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IDB_OPEN_FAILED'));req.onblocked=()=>reject(new Error('IDB_BLOCKED'))}catch(error){reject(error)}})}
async function dbGet(){let db;try{db=await openDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(RECORD);req.onsuccess=()=>resolve(clean(req.result));req.onerror=()=>reject(req.error)})}catch{return''}finally{try{db?.close()}catch{}}}
async function dbSet(value){let db;try{db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,RECORD);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});return true}catch{return false}finally{try{db?.close()}catch{}}}
async function dbDelete(){let db;try{db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(RECORD);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}catch{}finally{try{db?.close()}catch{}}}
function updateInput(value){const input=document.getElementById('apiKeyInput');if(input&&value&&!input.value)input.value=value}
function showStatus(text,kind='ok'){const message=document.getElementById('apiMessage');if(!message)return;message.className='api-note '+(kind==='ok'?'oktext':'warntext');message.textContent=text}
async function requestPersistentStorage(){try{if(navigator.storage?.persist)await navigator.storage.persist()}catch{}}
async function save(value,{requestPersistence=false,announce=false}={}){const key=clean(value);if(!key)return false;recoveredKey=key;localSet(PRIMARY,key);localSet(BACKUP,key);await dbSet(key);if(requestPersistence)await requestPersistentStorage();updateInput(key);if(announce)showStatus('✓ Finnhub-Key dauerhaft auf diesem Gerät gesichert.');return true}
async function clear(){recoveredKey='';localRemove(PRIMARY);localRemove(BACKUP);await dbDelete()}
async function recover(){if(recoveryPromise)return recoveryPromise;recoveryPromise=(async()=>{const primary=localGet(PRIMARY);const backup=localGet(BACKUP);const indexed=await dbGet();const key=primary||backup||indexed;if(!key)return'';const neededRestore=!primary||primary!==key||!backup||backup!==key;await save(key);if(neededRestore)showStatus('✓ Finnhub-Key aus der lokalen Gerätesicherung wiederhergestellt.');return key})();return recoveryPromise}
function backupCurrent(){const key=localGet(PRIMARY)||recoveredKey;if(key)save(key)}
function attachUi(){
  const saveButton=document.getElementById('saveKey');
  const clearButton=document.getElementById('clearKey');
  const settingsButton=document.getElementById('apiSettings');
  const input=document.getElementById('apiKeyInput');
  saveButton?.addEventListener('click',()=>{const key=clean(input?.value);if(key)save(key,{requestPersistence:true,announce:true})},true);
  clearButton?.addEventListener('click',()=>clear(),true);
  settingsButton?.addEventListener('click',()=>setTimeout(async()=>{const key=localGet(PRIMARY)||recoveredKey||await recover();if(input&&key)input.value=key},0));
}
async function boot(){
  const key=await recover();
  if(key)updateInput(key);
  attachUi();
  window.addEventListener('pagehide',backupCurrent);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)backupCurrent()});
  window.addEventListener('storage',event=>{if(event.key===PRIMARY&&clean(event.newValue))save(event.newValue)});
}
window.SenSeiSFinnhubVault={recover,save,clear,get:()=>localGet(PRIMARY)||recoveredKey};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
