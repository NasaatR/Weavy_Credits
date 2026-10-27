import {modelIdentity} from './model-matching.js';
import {VERSION} from './version.js';
import {subscriptionPlan} from './currency.js';
import {historicalModel,historicalParams,sameModel} from './pricing.js';
import {savedProjection,cleanSaved,ingestSaved,reconcileSaved,outputMeta,cleanOutput,mergeHistoryParams} from './history.js';
import {text,number,iso,key,fileKey,params,safeUrl,addRuns,cleanShape,mergeOutputs} from './core.js';
// Recognizers grounded in user's 2026-09-22 diagnostic schemas. No guessed API URLs.
const sid=v=>typeof v==='string'&&v.length>0&&v.length<=300&&!['__proto__','constructor','prototype'].includes(v)?v:null;
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
function nodeMeta(n,file){return {fileId:file.fileId,workspaceId:file.workspaceId,nodeId:sid(n.id),isModel:n.isModel===true||n.data?.menu?.isModel===true?true:n.isModel===false||n.data?.menu?.isModel===false?false:null,type:text(n.type),name:text(n.data?.label)||text(n.data?.name)||text(n.originalName),modelHint:text(n.data?.name),estimateModel:historicalModel(n),x:number(n.position?.x),y:number(n.position?.y)};}
function inputParams(v){return historicalParams(v);}
// Only result/output containers are traversed. Inputs are never billable outputs.
function resultValues(n){
 const result=n.result??n.output?.result??n.output?.out;
 return Array.isArray(result)?result:obj(result)?[result]:typeof result==='string'&&result.length?[{}]:[];
}

export function nativeProjection(body,observedAt=new Date().toISOString()){
 const out={files:[],nodes:[],runs:[],saved:[],prices:[],menuPrices:[],batches:[],modelShapes:[],accountPrice:null,accountPrices:[],observedAt:iso(observedAt)};
 function file(v,full=false){if(!obj(v)||!sid(v.id)||!sid(v.workspaceId)||typeof v.name!=='string')return;const f={fileId:v.id,workspaceId:v.workspaceId,name:text(v.name),full};out.files.push(f);if(full){for(const n of v.nodes.slice(0,3000)){if(!sid(n?.id))continue;out.nodes.push(nodeMeta(n,f));out.saved.push(...savedProjection(n,f));if(n.isModel===true&&out.modelShapes.length<20){const sh=richShape(n);if(!out.modelShapes.some(x=>x.type===text(n.type)&&JSON.stringify(x.shape)===JSON.stringify(sh)))out.modelShapes.push({type:text(n.type),shape:sh});}}
  for(const b of (Array.isArray(v.batchRuns)?v.batchRuns:[]).slice(0,2000)){const batchId=typeof b==='string'?sid(b):sid(b?.batchId)||sid(b?.id);if(batchId)out.batches.push({fileId:v.id,workspaceId:v.workspaceId,batchId,identitySource:typeof b==='string'?'batchRuns-string':b?.batchId?'batchId':'unverified-id'});if(obj(b)&&Array.isArray(b.recipeRuns)&&sid(b.batchId))history({...b,recipeId:v.id});}
 }}
 function history(b){
  if(!sid(b.recipeId)||!Array.isArray(b.recipeRuns))return;
  for(const parent of b.recipeRuns.slice(0,2000)){
   if(!sid(parent?.id)||!Array.isArray(parent.nodeRuns))continue;
   for(const n of parent.nodeRuns.slice(0,2000)){
    if(!sid(n?.id)||!sid(n.nodeId))continue;
    const merged=mergeOutputs([],resultValues(n).map(outputMeta)),parameters=inputParams(n);
    if(merged.conflict)parameters.pricingConflict=true;
    out.runs.push({recipeId:b.recipeId,batchId:sid(b.batchId)||sid(parent.batchId),recipeRunId:parent.id,nodeRunId:n.id,nodeId:n.nodeId,parentRunId:sid(n.runId),status:text(n.status,40),createdAt:iso(parent.startTime),startedAt:iso(n.startedAt),completedAt:iso(n.completedAt),updatedAt:iso(n.completedAt)||iso(n.startedAt)||iso(parent.startTime),refundedAt:iso(n.refundedAt),model:historicalModel(n),outputs:merged.outputs,parameters,resultCount:n.result!=null||n.output?.result!=null||n.output?.out!=null?merged.outputs.length:null});
   }
  }
 }
 function readEnvelope(body,depth=0){
 if(obj(body)&&Array.isArray(body.nodes)&&Array.isArray(body.edges))file(body,true);
 else if(Array.isArray(body))for(const f of body.slice(0,3000))if(obj(f)&&('poster' in f||'visibility' in f))file(f);
 if(obj(body)&&Array.isArray(body.recipes))for(const f of body.recipes.slice(0,3000))file(f);
 if(obj(body))history(body);
 if(obj(body)&&Array.isArray(body.prices))for(const p of body.prices.slice(0,4000)){if(number(p?.credits)===null||typeof p.name!=='string')continue;out.prices.push({name:text(p.name),provider:text(p.provider),credits:p.credits,modelType:text(p.modelType),modelName:text(p.modelName),modelVariant:text(p.modelVariant),extraDataShape:richShape(p.extraData),isByok:p.isByok===true,observedAt:out.observedAt});}
 if(obj(body?.menu)){const walk=(items,depth=0)=>{if(!Array.isArray(items)||depth>8)return;for(const p of items.slice(0,2000)){if(!obj(p))continue;if(number(p.price)!==null&&sid(p.id))out.menuPrices.push({id:p.id,name:text(p.displayName),modelName:text(p.modelName),price:p.price,fullPrice:number(p.fullPrice),isPerSecond:typeof p.isPerSecond==='boolean'?p.isPerSecond:null,isByok:p.isByok===true,observedAt:out.observedAt});walk(p.children,depth+1);}};walk(body.menu.models);walk(body.menu.communityModels);}
 for(const workspace of [body?.activeWorkspace,...(Array.isArray(body?.workspaces)?body.workspaces:[])]){
  if(!sid(workspace?.workspaceId)||!obj(workspace.subscription))continue;const sub=workspace.subscription;
  const q={workspaceId:workspace.workspaceId,creditsPerDollar:number(sub.creditsPerDollar),planName:text(sub.name,80),planType:text(sub.type,80),planId:subscriptionPlan(sub.name)||subscriptionPlan(sub.type),billingCycle:text(sub.billingCycle,40),monthlyCredits:number(sub.monthlyCredits),observedAt:out.observedAt};
  if(!out.accountPrices.some(x=>x.workspaceId===q.workspaceId))out.accountPrices.push(q);
  if(workspace===body.activeWorkspace)out.accountPrice=q;
 }
 if(depth<3&&obj(body))for(const field of ['data','result','payload','response'])if(body[field]&&typeof body[field]==='object')readEnvelope(body[field],depth+1);
 }
 readEnvelope(body);
 return out;
}
// Sample heterogeneous arrays rather than only element zero. Values are never exported here.
export function richShape(v,depth=0,budget={n:0}){if(++budget.n>1800||depth>13)return '…';if(v===null)return 'null';if(Array.isArray(v)){if(!v.length)return ['empty'];const samples=[];const indices=[...new Set([...Array(Math.min(8,v.length)).keys(),...v.map((x,i)=>x?.isModel===true?i:-1).filter(i=>i>=0).slice(0,12),v.length-1])];for(const i of indices){const sh=richShape(v[i],depth+1,budget),s=JSON.stringify(sh);if(!samples.some(x=>JSON.stringify(x)===s))samples.push(sh);if(samples.length>=8)break;}return samples;}if(typeof v!=='object')return typeof v;const out=Object.create(null);for(const [k,x]of Object.entries(v).slice(0,100)){if(/prompt|authorization|cookie|password|secret|email|base64|access.?token|refresh.?token/i.test(k))continue;const name=/^[a-zA-Z_][a-zA-Z0-9_]{0,55}$/.test(k)?k:'<dynamic-key>';out[name]=richShape(x,depth+1,budget);}return out;}
export function initNative(s){s.native??={saved:{},nodes:{},pending:{},prices:{},menuPrices:{},batches:{},modelShapes:[],accountPrices:{},lastSeen:null};s.native.saved??={};return s.native;}
export function cleanNativeProjection(p){
 // Re-project all structures in the worker: the page cannot supply ledger events.
 const out={files:[],nodes:[],runs:[],saved:[],prices:[],menuPrices:[],batches:[],modelShapes:[],accountPrice:null,accountPrices:[],observedAt:iso(p?.observedAt)||new Date().toISOString()};
 for(const f of (p?.files||[]).slice(0,10000))if(sid(f.fileId)&&sid(f.workspaceId))out.files.push({fileId:f.fileId,workspaceId:f.workspaceId,name:text(f.name),full:!!f.full});
 for(const n of (p?.nodes||[]).slice(0,10000))if(sid(n.fileId)&&sid(n.workspaceId)&&sid(n.nodeId))out.nodes.push({fileId:n.fileId,workspaceId:n.workspaceId,nodeId:n.nodeId,name:text(n.name),type:text(n.type),modelHint:text(n.modelHint),estimateModel:text(n.estimateModel)||null,isModel:typeof n.isModel==='boolean'?n.isModel:null,x:number(n.x),y:number(n.y)});
 for(const r of (p?.runs||[]).slice(0,50000))if(sid(r.recipeId)&&sid(r.nodeRunId)&&sid(r.nodeId)&&sid(r.recipeRunId))out.runs.push({recipeId:r.recipeId,nodeRunId:r.nodeRunId,nodeId:r.nodeId,recipeRunId:r.recipeRunId,batchId:sid(r.batchId),status:text(r.status,40),createdAt:iso(r.createdAt),startedAt:iso(r.startedAt),completedAt:iso(r.completedAt),updatedAt:iso(r.updatedAt),refundedAt:iso(r.refundedAt),model:text(r.model)||null,outputs:(r.outputs||[]).slice(0,50000).map(cleanOutput),parameters:params(r.parameters),resultCount:number(r.resultCount)});
 for(const r of (p?.saved||[]).slice(0,50000)){const v=cleanSaved(r);if(v)out.saved.push(v);}
 for(const r of (p?.prices||[]).slice(0,4000))if(number(r.credits)!==null&&text(r.name))out.prices.push({name:text(r.name),provider:text(r.provider),credits:r.credits,modelType:text(r.modelType),modelName:text(r.modelName),modelVariant:text(r.modelVariant),extraDataShape:cleanShape(r.extraDataShape),isByok:!!r.isByok,observedAt:out.observedAt});
 for(const r of (p?.menuPrices||[]).slice(0,4000))if(sid(r.id)&&number(r.price)!==null)out.menuPrices.push({id:r.id,name:text(r.name),modelName:text(r.modelName),price:r.price,fullPrice:number(r.fullPrice),isPerSecond:typeof r.isPerSecond==='boolean'?r.isPerSecond:null,isByok:!!r.isByok,observedAt:out.observedAt});
 for(const b of (p?.batches||[]).slice(0,2000))if(sid(b.fileId)&&sid(b.workspaceId)&&sid(b.batchId))out.batches.push({fileId:b.fileId,workspaceId:b.workspaceId,batchId:b.batchId,identitySource:['batchRuns-string','batchId','unverified-id'].includes(b.identitySource)?b.identitySource:'unknown'});
 for(const m of (p?.modelShapes||[]).slice(0,20))out.modelShapes.push({type:text(m.type),shape:cleanShape(m.shape)});
 for(const q of [p?.accountPrice,...(Array.isArray(p?.accountPrices)?p.accountPrices:[]).slice(0,1000)])if(sid(q?.workspaceId)){
  const clean={workspaceId:q.workspaceId,creditsPerDollar:number(q.creditsPerDollar),planName:text(q.planName,80),planType:text(q.planType,80),planId:subscriptionPlan(q.planName)||subscriptionPlan(q.planType),billingCycle:text(q.billingCycle,40),monthlyCredits:number(q.monthlyCredits),observedAt:out.observedAt};
  if(!out.accountPrices.some(x=>x.workspaceId===clean.workspaceId))out.accountPrices.push(clean);
  if(q===p.accountPrice)out.accountPrice=clean;
 }
 return out;
}
export function ingestNative(s,raw,pageUrl=null){const p=cleanNativeProjection(raw),n=initNative(s);let count=0;n.lastSeen=p.observedAt;
 for(const f of p.files){const fk=fileKey(f),old=s.files[fk];let url=old?.url||null;try{const u=new URL(pageUrl);if(f.full&&u.pathname.split('/').some(x=>decodeURIComponent(x)===f.fileId))url=safeUrl(pageUrl);}catch{}s.files[fk]={...old,workspaceId:f.workspaceId,fileId:f.fileId,name:f.name||old?.name||f.fileId,url,coverage:'partial',lastSeen:p.observedAt,nativeSeen:true};}
 for(const node of p.nodes)n.nodes[key(node.workspaceId,node.fileId,node.nodeId)]={...node,observedAt:p.observedAt};
 for(const r of p.runs){const k=key(r.recipeId,r.nodeRunId),old=n.pending[k];const terminal=x=>['completed','succeeded','success','failed','cancelled'].includes(String(x).toLowerCase());
  const useNew=!old||(!old.updatedAt||r.updatedAt&&r.updatedAt>=old.updatedAt)&&(!terminal(old.status)||terminal(r.status));
  const base=useNew?r:old,extra=useNew?old:r;
  const merged=mergeOutputs(old?.outputs||[],r.outputs||[],useNew),parameters=mergeHistoryParams(old?.parameters,r.parameters);
 if(merged.conflict||old?.model&&r.model&&!sameModel(old.model,r.model))parameters.pricingConflict=true;
  n.pending[k]={...extra,...base,model:base.model||extra?.model||null,batchId:base.batchId||extra?.batchId||null,refundedAt:r.refundedAt||old?.refundedAt||null,
   parameters,outputs:merged.outputs,resultCount:base.resultCount??extra?.resultCount??null};}
 const filesById=new Map();for(const f of Object.values(s.files)){if(!filesById.has(f.fileId))filesById.set(f.fileId,[]);filesById.get(f.fileId).push(f);}
 const changedFiles=new Set(p.files.map(f=>f.fileId)),changedNodes=new Set(p.nodes.map(v=>key(v.fileId,v.nodeId))),changedRuns=new Set(p.runs.map(v=>key(v.recipeId,v.nodeRunId)));
 const normalized=[];for(const r of Object.values(n.pending)){if(!changedFiles.has(r.recipeId)&&!changedNodes.has(key(r.recipeId,r.nodeId))&&!changedRuns.has(key(r.recipeId,r.nodeRunId)))continue;const matches=filesById.get(r.recipeId)||[];if(matches.length!==1)continue;const f=matches[0],meta=n.nodes[key(f.workspaceId,f.fileId,r.nodeId)];const run={workspaceId:f.workspaceId,fileId:f.fileId,runId:'weavy:'+key(r.recipeId,r.nodeRunId),nodeId:r.nodeId,nodeName:meta?.name||r.nodeId,nodeType:meta?.type||'',model:r.model,createdAt:r.createdAt,updatedAt:r.updatedAt,status:r.status,parameters:r.parameters,resultCount:r.resultCount,events:[],fileName:f.name,fileUrl:f.url,source:'weavy-native:2026-09-22',native:{isModel:meta?.isModel??null,nodeFound:!!meta,estimateModel:s.runs[key(f.workspaceId,'weavy:'+key(r.recipeId,r.nodeRunId))]?.native?.estimateModel||meta?.estimateModel||null,outputs:r.outputs,nodeRunId:r.nodeRunId,recipeRunId:r.recipeRunId,batchId:r.batchId,startedAt:r.startedAt,refundedAt:r.refundedAt,modelHint:meta?.modelHint||meta?.type||''}};normalized.push(run);count++;}if(normalized.length)addRuns(s,normalized);
 const affected=ingestSaved(s,p.saved,p.observedAt);if(p.files.length||p.nodes.length||p.runs.length||p.saved.length)count+=reconcileSaved(s,p.files.length||p.nodes.length||p.runs.length?null:affected);
 for(const r of p.prices)n.prices[key(r.name,r.provider,r.modelName,r.modelVariant,r.isByok,JSON.stringify(r.extraDataShape))]=r;
 for(const r of p.menuPrices)n.menuPrices[r.id]=r;
 for(const b of p.batches)n.batches[key(b.workspaceId,b.fileId,b.batchId)]=b;
 for(const m of p.modelShapes)if(!n.modelShapes.some(x=>x.type===m.type&&JSON.stringify(x.shape)===JSON.stringify(m.shape)))n.modelShapes.push(m);n.modelShapes=n.modelShapes.slice(-40);
 for(const q of p.accountPrices){const old=n.accountPrices[q.workspaceId];if(!old?.observedAt||q.observedAt>=old.observedAt)n.accountPrices[q.workspaceId]={...old,...q,planName:q.planName||old?.planName||'',planType:q.planType||old?.planType||'',planId:q.planId||old?.planId||null};}
 return {count,files:p.files.length};
}
export function nativeDiagnostics(s,{focusModels=[]}={}){
 const n=initNative(s),ids=new Map(),anon=v=>v==null?null:(ids.has(v)?ids.get(v):(ids.set(v,'id-'+(ids.size+1)),ids.get(v)));
 const focus=[...new Set(focusModels.filter(Boolean).map(modelIdentity))];
 const relevant=values=>values.some(v=>{const name=modelIdentity(v);return name&&focus.some(f=>name===f||name.length>5&&f.length>5&&(name.includes(f)||f.includes(name)));});
 const saved=Object.values(n.saved),prices=Object.values(n.prices),menu=Object.values(n.menuPrices),pending=Object.values(n.pending),fileCounts=new Map();
 for(const f of Object.values(s.files))fileCounts.set(f.fileId,(fileCounts.get(f.fileId)||0)+1);
 // Prioritize unresolved models and include different families before filling
 // the remaining slots. The old first-25-price sample hid later model prices.
 const choose=(rows,names,limit)=>{
  const ordered=[...rows].reverse().map(row=>({row,priority:Number(relevant(names(row)))})).sort((a,b)=>b.priority-a.priority).map(x=>x.row),picked=[],seen=new Set(),pickedRows=new Set();
  for(const row of ordered){const family=names(row).filter(Boolean).map(modelIdentity).join('|');if(!seen.has(family)){seen.add(family);picked.push(row);pickedRows.add(row);if(picked.length===limit)return picked;}}
  for(const row of ordered)if(!pickedRows.has(row)){picked.push(row);if(picked.length===limit)break;}
  return picked;
 };
 const savedSamples=choose(saved,r=>[r.model,r.estimateModel],40),priceSamples=choose(prices,p=>[p.name,p.modelName,p.modelType],4000),menuSamples=choose(menu,p=>[p.name,p.modelName],100);
 return {adapter:'weavy-saved-history-'+VERSION,savedResultCount:saved.length,lastSeen:n.lastSeen,fileCount:Object.keys(s.files).length,nodeCount:Object.keys(n.nodes).length,runCount:Object.keys(s.runs).length,directRunCount:pending.length,batchReferenceCount:Object.keys(n.batches).length,unresolvedRunCount:pending.filter(r=>fileCounts.get(r.recipeId)!==1).length,
  runSamples:pending.slice(-30).map(r=>({...r,outputs:(r.outputs||[]).slice(0,10).map(o=>({...o,id:anon(o.id),batchId:anon(o.batchId)})),recipeId:anon(r.recipeId),nodeRunId:anon(r.nodeRunId),nodeId:anon(r.nodeId),recipeRunId:anon(r.recipeRunId),batchId:anon(r.batchId)})),
  savedSamples:savedSamples.map(r=>({recipeId:anon(r.recipeId),nodeId:anon(r.nodeId),batchId:anon(r.batchId),model:r.model,estimateModel:r.estimateModel,status:r.status,createdAt:r.createdAt,parameters:r.parameters,output:{...r.output,id:anon(r.output.id),batchId:anon(r.output.batchId)}})),savedSamplesOmitted:Math.max(0,saved.length-savedSamples.length),
  priceCount:prices.length,priceSamples,priceSamplesOmitted:Math.max(0,prices.length-priceSamples.length),menuPriceCount:menu.length,menuPriceSamples:menuSamples.map(p=>({...p,id:anon(p.id)})),menuPriceSamplesOmitted:Math.max(0,menu.length-menuSamples.length),modelShapes:n.modelShapes};
}

export function endpointShape(raw,body,method='UNKNOWN'){try{const u=new URL(raw);if(u.protocol!=='https:'||!(u.hostname==='weavy.ai'||u.hostname.endsWith('.weavy.ai')))return null;const identities=['recipeId','batchId','workspaceId','id'];const safeWords=new Set(['api','v1','v2','v3','recipe','recipes','runs','run','batches','batch','history','nodes','node','prices','pricing','models','catalog','workspace','workspaces','credits','usage','transactions','users','me','user','menu','flows','workflow','workflows','graphql','profile','subscription','execution','executions','node-runs','recipe-runs','batch-runs']);const mask=value=>{const k=identities.find(k=>typeof body?.[k]==='string'&&body[k]===value);return k?'<'+k+'>':/^<(recipeId|batchId|workspaceId|id|segment)>$/.test(value)?value:safeWords.has(value)?value:'<segment>';};return {origin:u.origin,method:['GET','POST','PUT','PATCH','DELETE'].includes(method)?method:'UNKNOWN',path:u.pathname.split('/').map(s=>s?mask(decodeURIComponent(s)):'').join('/'),queryKeys:[...u.searchParams.keys()].filter(k=>/^[a-zA-Z_][a-zA-Z0-9_]{0,40}$/.test(k)&&!/token|secret|auth|key|code|email/i.test(k)).slice(0,30)};}catch{return null;}}
export function cleanEndpoint(v){if(!v)return null;const clean=endpointShape(v.origin+(typeof v.path==='string'?v.path:''),{},v.method);if(!clean)return null;return {...clean,path:clean.path,queryKeys:(Array.isArray(v.queryKeys)?v.queryKeys:[]).filter(k=>typeof k==='string'&&/^[a-zA-Z_][a-zA-Z0-9_]{0,40}$/.test(k)&&!/token|secret|auth|key|code|email/i.test(k)).slice(0,30)};}
