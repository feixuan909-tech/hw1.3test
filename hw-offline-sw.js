const CACHE='hw-r8-sandbox-syncfix14';
const scopeRoot=()=>new URL('./',self.registration.scope).href;
const indexUrl=()=>new URL('./index.html',self.registration.scope).href;
async function cacheShell(){
  const cache=await caches.open(CACHE);
  const targets=[scopeRoot(),indexUrl()];
  for(const url of targets){
    try{
      const r=await fetch(url,{cache:'reload'});
      if(r&&r.ok)await cache.put(url,r.clone());
    }catch(e){}
  }
}
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(cacheShell());
});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('hw-r8-sandbox-syncfix14')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  await cacheShell();
})());});
self.addEventListener('message',event=>{
  const d=event.data||{};
  if(d.type==='CACHE_SHELL')event.waitUntil(cacheShell());
  if(d.type==='CACHE_PAGE'&&d.url){
    event.waitUntil((async()=>{try{
      const r=await fetch(d.url,{cache:'reload'});
      if(r&&r.ok){const c=await caches.open(CACHE);await c.put(d.url,r.clone());}
    }catch(e){}})());
  }
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok){
          await cache.put(req,fresh.clone());
          await cache.put(scopeRoot(),fresh.clone());
          await cache.put(indexUrl(),fresh.clone());
        }
        return fresh;
      }catch(e){
        return (await cache.match(req)) ||
               (await cache.match(req.url)) ||
               (await cache.match(scopeRoot())) ||
               (await cache.match(indexUrl())) ||
               new Response('Offline shell unavailable',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
  }
});
