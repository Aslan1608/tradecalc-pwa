(()=>{'use strict';
const KEY='tradecalc-finnhub-key';
const BACKUP='senseis-finnhub-key-backup-v1';
const DB_NAME='senseis-terminal-settings';
const STORE='settings';
const RECORD='finnhub-api-key';
const rawGet=Storage.prototype.getItem;
const rawSet=Storage.prototype.setItem;
const rawRemove=Storage.prototype.removeItem;
let memory='';

function clean(value){const key=String(value||'').trim();return key&&key!=='SENSEIS_DAX_ONLY'?key:''}
function localRead(key){try{return clean(rawGet.call(localStorage,key))}catch{return''}}
function localWrite(key,value){try{rawSet.call(localStorage,key,value)}catch{}}
function localDelete(key){try{rawRemove.call(localStorage,key)}catch{}}
function openDb(){return new Promise((resolve,reject)=>{try{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('IDB_BLOCKED'))}catch(error){reject(error)}})}
async function dbRead(){let db;try{db=await openDb();return await new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(RECORD);req.onsuccess=()=>resolve(clean(req.result));req.onerror=()=>reject(req.error)})}catch{return''}finally{try{db?.close()}catch{}}}
async function dbWrite(value){let db;try{db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,RECORD);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}catch{}finally{try{db?.close()}catch{}}}
async function dbDelete(){let db;try{db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(RECORD);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}catch{}finally{try{db?.close()}catch{}}}
function persist(value){const key=clean(value);if(!key)return'';memory=key;localWrite(KEY,key);localWrite(BACKUP,key);dbWrite(key);try{navigator.storage?.persist?.()}catch{}return key}
function clear(){memory='';localDelete(KEY);localDelete(BACKUP);dbDelete()}

if(!window.__senseisFinnhubPersistence){
  window.__senseisFinnhubPersistence=true;
  Storage.prototype.getItem=function(key){if(key===KEY)return localRead(KEY)||localRead(BACKUP)||memory||null;return rawGet.call(this,key)};
  Storage.prototype.setItem=function(key,value){if(key===KEY){persist(value);return}return rawSet.call(this,key,value)};
  Storage.prototype.removeItem=function(key){if(key===KEY){clear();return}return rawRemove.call(this,key)};
}

async function restore(){const primary=localRead(KEY),backup=localRead(BACKUP),indexed=await dbRead();const key=primary||backup||indexed;if(!key)return'';const restored=!primary;persist(key);if(restored){setTimeout(()=>document.getElementById('refreshLive')?.click(),300);try{window.dispatchEvent(new CustomEvent('senseis:finnhub-key-restored'))}catch{}}return key}
restore();
window.SenSeiSFinnhubPersistence={restore,save:persist,clear,get:()=>localRead(KEY)||localRead(BACKUP)||memory};
})();
