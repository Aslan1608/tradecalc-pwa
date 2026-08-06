const CACHE_VERSION='senseis-pwa-v4';
const APP_CACHE=`${CACHE_VERSION}-app`;
const RUNTIME_CACHE=`${CACHE_VERSION}-runtime`;
const APP_SHELL=[
  './',
  './index.html',
  './senseis-version.js',
  './senseis-timers.js',
  './legacy-main-force.js',
  './finnhub-key-persistence.js',
  './stock-intelligence-stability.js',
  './stock-intelligence.js',
  './stock-financials-recovery.js',
  './senseis-news-observer-scope.js',
  './news-intelligence-data.js',
  './news-intelligence-recall-patch.js',
  './news-intelligence-v37.js',
  './news-chronology.js',
  './senseis-fetch.js',
  './market-feed.js',
  './index-universe.js',
  './pwa-runtime.js',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(APP_CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('senseis-pwa-')&&!key.startsWith(CACHE_VERSION)).map(key=>caches.delete(key)));await self.clients.claim()})())});
function isNavigation(request){return request.mode==='navigate'||request.destination==='document'}
function isStatic(request,url){return url.origin===self.location.origin&&['script','style','image','font','manifest'].includes(request.destination)}
function isRuntimeData(request,url){if(url.origin!==self.location.origin)return false;return /news|quote|financial|earnings|market|company/.test(url.pathname.toLowerCase())}
async function cacheFirst(request){const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response&&response.ok){const cache=await caches.open(APP_CACHE);await cache.put(request,response.clone())}return response}
async function networkFirst(request){const cache=await caches.open(RUNTIME_CACHE);try{const response=await fetch(request);if(response&&response.ok)await cache.put(request,response.clone());return response}catch(error){const cached=await cache.match(request);if(cached)return cached;throw error}}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(isNavigation(request)){event.respondWith(networkFirst(request).catch(()=>caches.match('./index.html')));return}if(isStatic(request,url)){event.respondWith(cacheFirst(request));return}if(isRuntimeData(request,url))event.respondWith(networkFirst(request))});
