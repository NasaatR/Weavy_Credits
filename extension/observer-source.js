import {nativeProjection,richShape,endpointShape} from './native.js';
import {cleanProfile,adapt,safeUrl} from './core.js';
// Built locally by scripts/build.mjs. Never stores request headers or bodies.
if(!window.__WEAVY_CREDITS_OBSERVER_1__){
 window.__WEAVY_CREDITS_OBSERVER_1__=true;
 let profiles=[],pending=[],early=[],earlySize=0,ready=false;
 const MAX=32*1024*1024,CHANNEL='weavy-credits-observation-v1';
 function emit(v){if(!ready){pending.push(v);pending=pending.slice(-20);return;}window.postMessage({channel:CHANNEL,...v},location.origin);}
 window.addEventListener('message',e=>{if(e.source!==window||e.origin!==location.origin||e.data?.channel!=='weavy-credits-config-v1')return;profiles=(Array.isArray(e.data.profiles)?e.data.profiles:[]).slice(0,20).flatMap(p=>{try{return [cleanProfile(p)];}catch{return [];}});ready=true;for(const v of pending)emit(v);pending=[];for(const v of early)consume(...v);early=[];earlySize=0;});
 const shape=richShape;
 function emitNative(native,transport){
  // Bound bridge messages by serialized bytes as well as row count. A nodeRun
  // can contain thousands of outputs and previously made a whole chunk vanish.
  let chunk={observedAt:native.observedAt},size=100,count=0;
  const flush=()=>{if(!count)return;emit({transport,signature:'native-data',native:chunk,pageUrl:safeUrl(location.href)});chunk={observedAt:native.observedAt};size=100;count=0;};
  const append=(field,row)=>{const bytes=JSON.stringify(row).length;if(count&&(size+bytes>500000||count>=300))flush();(chunk[field]??=[]).push(row);size+=bytes+2;count++;};
  for(const field of ['files','nodes','runs','saved','prices','menuPrices','batches','modelShapes','accountPrices'])for(const row of native[field]){
   if(field==='runs'&&JSON.stringify(row).length>450000&&row.outputs?.length){
    let outputs=[],bytes=0;for(const output of row.outputs){const n=JSON.stringify(output).length;if(bytes+n>350000&&outputs.length){append(field,{...row,outputs});outputs=[];bytes=0;}outputs.push(output);bytes+=n;}
    if(outputs.length)append(field,{...row,outputs});
   }else append(field,row);
  }
  flush();if(native.accountPrice)emit({transport,signature:'native-data',native:{accountPrice:native.accountPrice,observedAt:native.observedAt}});
 }
 function fingerprint(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16);}
 function allowed(raw){try{const u=new URL(raw,location.href);return u.protocol==='https:'&&(u.hostname==='weavy.ai'||u.hostname.endsWith('.weavy.ai'))?u:null;}catch{return null;}}
 function consume(body,url,transport,method='UNKNOWN'){try{if(!ready){const size=JSON.stringify(body).length;if(earlySize+size<=4*MAX){early.push([body,url,transport,method]);earlySize+=size;}return;}const u=allowed(url);if(!u||!body||typeof body!=='object')return;const native=nativeProjection(body);emitNative(native,transport);const endpoint=endpointShape(url,body,method);const sh=shape(body),signature=transport+':'+fingerprint(JSON.stringify(sh));let matched=false;for(const p of profiles){if(p.enabled&&p.origin===u.origin&&u.pathname.startsWith(p.pathPrefix)){const runs=adapt(body,p).slice(0,1000);emit({signature,transport,shape:sh,endpoint,profileId:p.id,runs});matched=true;}}if(!matched)emit({signature,transport,shape:sh,endpoint,runs:[]});}catch{}}
 async function inspect(response,method){try{if(!allowed(response.url)||!response.headers.get('content-type')?.includes('json'))return;if(Number(response.headers.get('content-length'))>MAX)return;const copy=response.clone(),reader=copy.body?.getReader();if(!reader)return;let size=0,chunks=[];for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>MAX){await reader.cancel();return;}chunks.push(part.value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}consume(JSON.parse(new TextDecoder().decode(bytes)),response.url,'fetch',method);}catch{}}
 const originalFetch=window.fetch;
 window.fetch=function(...args){const promise=Reflect.apply(originalFetch,this,args);const method=String(args[1]?.method||args[0]?.method||'GET').toUpperCase();promise.then(r=>inspect(r,method),()=>{});return promise;};
 const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send,urls=new WeakMap();
 XMLHttpRequest.prototype.open=function(method,url,...rest){urls.set(this,{url,method:String(method).toUpperCase()});return Reflect.apply(open,this,[method,url,...rest]);};
 XMLHttpRequest.prototype.send=function(...args){this.addEventListener('load',()=>{try{if(!allowed(this.responseURL||urls.get(this)?.url)||!this.getResponseHeader('content-type')?.includes('json'))return;const b=this.responseType==='json'?this.response:(!this.responseType||this.responseType==='text')&&this.responseText.length<=MAX?JSON.parse(this.responseText):null;if(b&&JSON.stringify(b).length<=MAX)consume(b,this.responseURL||urls.get(this)?.url,'xhr',urls.get(this)?.method);}catch{}},{once:true});return Reflect.apply(send,this,args);};
 emit({signature:'observer-started',transport:'lifecycle',shape:{observer:'ready'},runs:[]});
}
