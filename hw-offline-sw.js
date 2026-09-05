const CACHE='hw-checker-r8-sandbox-oklogic2-shell-v1';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('hw-checker-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})());});
self.addEventListener('message',event=>{
  const d=event.data||{};
  if(d.type==='CACHE_PAGE'&&d.url){
    event.waitUntil((async()=>{try{const r=await fetch(d.url,{cache:'reload'});if(r&&r.ok){const c=await caches.open(CACHE);await c.put(d.url,r.clone());}}catch(e){}})());
  }
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok){const c=await caches.open(CACHE);await c.put(req,fresh.clone());}
        return fresh;
      }catch(e){
        const c=await caches.open(CACHE);
        return (await c.match(req))||(await c.match(req.url))||Response.error();
      }
    })());
  }
});
