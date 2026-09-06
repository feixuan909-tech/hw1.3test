const CACHE='hw-checker-r8-sandbox-mergefix23-shell-v1';

async function cacheShell(){
  const c=await caches.open(CACHE);
  const scope=new URL(self.registration.scope);
  const targets=[scope.href,new URL('index.html',scope).href];
  await Promise.all(targets.map(async url=>{
    try{
      const r=await fetch(url,{cache:'reload'});
      if(r&&r.ok) await c.put(url,r.clone());
    }catch(e){}
  }));
}

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(cacheShell());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('hw-checker-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    await cacheShell();
  })());
});

self.addEventListener('message',event=>{
  const d=event.data||{};
  if(d.type==='CACHE_SHELL'||d.type==='CACHE_PAGE'){
    event.waitUntil((async()=>{
      await cacheShell();
      if(d.url){
        try{
          const r=await fetch(d.url,{cache:'reload'});
          if(r&&r.ok){const c=await caches.open(CACHE);await c.put(d.url,r.clone());}
        }catch(e){}
      }
    })());
  }
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin) return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok){
          await c.put(req.url,fresh.clone());
          await cacheShell();
        }
        return fresh;
      }catch(e){
        const scope=new URL(self.registration.scope);
        return (await c.match(req.url)) ||
               (await c.match(scope.href)) ||
               (await c.match(new URL('index.html',scope).href)) ||
               new Response('Offline shell unavailable',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
  }
});
