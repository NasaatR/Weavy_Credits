// Keep identical observation bursts away from IndexedDB. Cache only acknowledged
// captures; financial fields and source identity are compared in full.
export function createCaptureGate(send,{now=Date.now,ttl=2500,maxEntries=24,maxBytes=750000}={}){
 const acknowledged=new Map(),pending=new Map();let bytes=0;
 const remove=k=>{const old=acknowledged.get(k);if(old){bytes-=old.bytes;acknowledged.delete(k);}};
 return async function capture(message){
  let key;try{key=JSON.stringify(message,(name,value)=>name==='observedAt'?undefined:value);}catch{return send(message);}
  const size=key.length*2,time=now();
  for(const [k,item]of acknowledged)if(time-item.at>=ttl)remove(k);
  if(size>maxBytes)return send(message);
  if(acknowledged.has(key))return {count:0,deduplicated:true};
  if(pending.has(key))return pending.get(key);
  if(pending.size>=maxEntries)return send(message);
  const request=Promise.resolve().then(()=>send(message)).then(reply=>{
   if(reply&&typeof reply==='object'&&!reply.error&&reply.ok!==false){
    while(acknowledged.size>=maxEntries||bytes+size>maxBytes)remove(acknowledged.keys().next().value);
    acknowledged.set(key,{at:now(),bytes:size});bytes+=size;
   }
   return reply;
  }).finally(()=>pending.delete(key));
  pending.set(key,request);return request;
 };
}
