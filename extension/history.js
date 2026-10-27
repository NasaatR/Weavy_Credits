import {historicalModel,historicalParams,sameModel,sameParameter} from './pricing.js';
import {key,text,iso,params,number,addRuns,runKey} from './core.js';

const historyId=v=>typeof v==='string'&&v.length>0&&v.length<=300&&!['__proto__','constructor','prototype'].includes(v)?v:null;
const ordinal=v=>typeof v==='number'&&Number.isInteger(v)&&v>=0?String(v):typeof v==='string'&&/^\d{1,10}$/.test(v)?v:null;
export function outputMeta(v) {
 return {id:historyId(v?.id)||historyId(v?.kind?.id)||historyId(v?.publicId)||historyId(v?.kind?.publicId),batchId:historyId(v?.batchId),order:ordinal(v?.order),secondaryOrder:ordinal(v?.secondaryOrder),model:historicalModel(v),parameters:historicalParams({...v?.kind,...v})};
}
export function cleanOutput(v) {
 return {id:historyId(v?.id),batchId:historyId(v?.batchId),order:ordinal(v?.order),secondaryOrder:ordinal(v?.secondaryOrder),model:text(v?.model)||null,parameters:params(v?.parameters)};
}
function sameOutput(a,b) {
 if(a.batchId&&b.batchId&&a.batchId!==b.batchId)return false;
 if (a.id && b.id) return a.id===b.id;
 return !!(a.batchId&&a.batchId===b.batchId&&a.order!==null&&a.order===b.order&&(a.secondaryOrder||'0')===(b.secondaryOrder||'0'));
}
export function savedProjection(node,file) {
 const nodeModel=historicalModel(node);
 if (node.isModel!==true && node.data?.menu?.isModel!==true && !nodeModel) return [];
 const generations=Array.isArray(node.data?.generations)?node.data.generations:[];
 const result=node.data?.result??node.data?.output?.result;
 const results=Array.isArray(result)?result:result&&typeof result==='object'?[result]:[];
 const rows=[],rowIndex=new Map(),resultIds=new Map(),resultSlots=new Map();
 const slotKey=m=>m.batchId&&m.order!==null?key(m.batchId,m.order,m.secondaryOrder||'0'):null;
 for(const value of results){const m=outputMeta(value);if(m.id){if(!resultIds.has(m.id))resultIds.set(m.id,[]);resultIds.get(m.id).push(value);}const slot=slotKey(m);if(slot){if(!resultSlots.has(slot))resultSlots.set(slot,[]);resultSlots.get(slot).push(value);}}
 // Join by output identity, never by array index: result may only hold the
 // currently selected batch while generations contains the whole history.
 for (const value of [...generations,...results]) {
  if (!value || typeof value!=='object') continue;
  const meta=outputMeta(value);
  if (!meta.batchId) continue; // Ordinary uploaded/reference images are not expense evidence.
  if (!meta.id && meta.order===null) continue;
  const match=(meta.id&&(resultIds.get(meta.id)||[]).find(r=>sameOutput(meta,outputMeta(r))))||(resultSlots.get(slotKey(meta))||[]).find(r=>sameOutput(meta,outputMeta(r)));
  const output=match?outputMeta(match):meta;
  const recordId=key(file.fileId,node.id,meta.batchId,meta.id?['asset',meta.id]:['slot',meta.order,meta.secondaryOrder||'0']);
  const old=rowIndex.get(recordId);
  const parameters=mergeHistoryParams(historicalParams(value),output.parameters);
  const row={savedId:recordId,recipeId:file.fileId,workspaceId:file.workspaceId,nodeId:node.id,batchId:meta.batchId,
   model:historicalModel(value)||historicalModel(match),estimateModel:nodeModel,
   createdAt:iso(value.createdAt)||iso(value.completedAt)||iso(match?.createdAt)||iso(match?.completedAt),
   status:text(value.status,40)||text(match?.status,40)||'completed',refundedAt:iso(value.refundedAt)||iso(match?.refundedAt),
   parameters,output:{...meta,id:meta.id||output.id,parameters}};
  if(old){old.parameters=mergeHistoryParams(old.parameters,parameters);old.output.parameters=old.parameters;if(old.model&&row.model&&!sameModel(old.model,row.model))old.parameters.pricingConflict=true;old.model ||= row.model;old.refundedAt ||= row.refundedAt;}
  else {rows.push(row);rowIndex.set(recordId,row);}
 }
 return rows;
}
export function mergeHistoryParams(a={},b={}){
 const out={...a};for(const [k,v]of Object.entries(b)){if(out[k]!==undefined&&k!=='count'&&!sameParameter(out[k],v))out.pricingConflict=true;else out[k]=v;}if(out.duration!==undefined&&out.seconds!==undefined&&out.duration!==out.seconds)out.pricingConflict=true;return out;
}
export function cleanSaved(v) {
 if(!historyId(v?.recipeId)||!historyId(v?.workspaceId)||!historyId(v?.nodeId)||!historyId(v?.batchId))return null;
 const output=cleanOutput(v.output);
 if(!output.id&&output.order===null)return null;
 const savedId=key(v.recipeId,v.nodeId,v.batchId,output.id?['asset',output.id]:['slot',output.order,output.secondaryOrder||'0']);
 return {savedId,recipeId:v.recipeId,workspaceId:v.workspaceId,nodeId:v.nodeId,batchId:v.batchId,output,
  model:text(v.model)||null,estimateModel:text(v.estimateModel)||null,parameters:params(v.parameters),
  createdAt:iso(v.createdAt),updatedAt:iso(v.updatedAt),status:text(v.status,40)||'completed',refundedAt:iso(v.refundedAt)};
}
export function ingestSaved(s,values,observedAt) {
 s.native.saved??={};
 const affected=new Set();if(!values.length)return affected;
 const slots=new Map();
 const slotKey=v=>v.output.order===null?null:key(v.workspaceId,v.recipeId,v.nodeId,v.batchId,v.output.order,v.output.secondaryOrder||'0');
 for(const [k,v]of Object.entries(s.native.saved)){const slot=slotKey(v);if(slot)slots.set(slot,k);}
 for(const raw of values){const v=cleanSaved(raw);if(!v)continue;const k=key(v.workspaceId,v.savedId),old=s.native.saved[k];
  const slot=slotKey(v),alias=slot&&slots.get(slot),previous=old||s.native.saved[alias];
  // An initially ID-less slot may later acquire an output ID. Migrate its
  // accounting identity so restore/reload cannot create another expense.
  const compatible=previous&&(!previous.output.id||!v.output.id||previous.output.id===v.output.id);
  const prior=compatible?previous:old;
  const parameters=mergeHistoryParams(prior?.parameters,v.parameters);
  if(prior?.model&&v.model&&!sameModel(prior.model,v.model))parameters.pricingConflict=true;
  const merged=cleanSaved({...prior,...v,output:{...v.output,id:v.output.id||prior?.output.id,parameters},estimateModel:prior?.estimateModel||v.estimateModel,model:prior?.model||v.model||null,createdAt:prior?.createdAt||v.createdAt,updatedAt:iso(observedAt)||v.updatedAt,refundedAt:v.refundedAt||prior?.refundedAt||null,parameters});
  const storageKey=key(merged.workspaceId,merged.savedId);
  if(prior&&prior.savedId!==merged.savedId){
   delete s.native.saved[key(prior.workspaceId,prior.savedId)];
   const oldKey=runKey({workspaceId:prior.workspaceId,runId:'saved:'+prior.savedId});
   if(s.runs[oldKey]){const previousRun=s.runs[oldKey];delete s.runs[oldKey];previousRun.runId='saved:'+merged.savedId;s.runs[runKey(previousRun)]=previousRun;}
  }
  s.native.saved[storageKey]=merged;if(slot)slots.set(slot,storageKey);affected.add(key(merged.workspaceId,merged.recipeId,merged.nodeId,merged.batchId));
 }
 return affected;
}
export function reconcileSaved(s,affected=null) {
 const normalized=[];
 const saved=Object.values(s.native.saved||{});
 const actual=Object.values(s.runs).filter(r=>r.native?.nodeRunId&&!r.native?.savedHistory);
 const byBatch=new Map(),byOutput=new Map();
 for(const r of actual){const k=key(r.workspaceId,r.fileId,r.nodeId,r.native.batchId);if(!byBatch.has(k))byBatch.set(k,[]);byBatch.get(k).push(r);
  for(const o of r.native.outputs||[])if(o.id){const k=key(r.workspaceId,r.fileId,r.nodeId,o.id);if(!byOutput.has(k))byOutput.set(k,[]);byOutput.get(k).push(r);}
 }
 const groups=new Map();
 for(const row of saved){const k=key(row.workspaceId,row.recipeId,row.nodeId,row.batchId);if(affected&&!affected.has(k))continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);}
 for(const [group,items] of groups){const runs=byBatch.get(group)||[];
  for(const row of items){
   const runId='saved:'+row.savedId;
   const candidates=(row.output.id?byOutput.get(key(row.workspaceId,row.recipeId,row.nodeId,row.output.id))||[]:runs)
    .filter(r=>(!r.native.batchId||r.native.batchId===row.batchId)&&(r.native.outputs||[]).some(o=>sameOutput(o,row.output)));
   const covered=candidates.length===1?candidates[0]
    :candidates.length===0&&runs.length===1&&(number(runs[0].resultCount)??0)===items.length&&!(runs[0].native.outputs||[]).some(o=>o.id)&&items.every(i=>!i.output.id)&&['completed','succeeded','success'].includes(runs[0].status.toLowerCase())?runs[0]:null;
   if(covered){
    covered.native.estimateModel ||= row.estimateModel;
    covered.native.nodeFound=true;
    if(row.model){if(covered.model&&!sameModel(covered.model,row.model))covered.snapshotConflict=true;else covered.model=row.model;}
    covered.native.refundedAt ||= row.refundedAt;
    // Only fill missing parameters; differing history snapshots stay visible as conflicts.
    const output=(covered.native.outputs||[]).find(o=>sameOutput(o,row.output));
    if(output){output.parameters=mergeHistoryParams(output.parameters,row.parameters);output.model ||= row.model;}
    if(covered.resultCount===1)covered.parameters=mergeHistoryParams(covered.parameters,row.parameters);
    const storedKey=runKey({workspaceId:row.workspaceId,runId});
    if(!s.runs[storedKey]?.events.length)delete s.runs[storedKey];
    continue;
   }
   const f=s.files[key(row.workspaceId,row.recipeId)],meta=s.native.nodes[key(row.workspaceId,row.recipeId,row.nodeId)];
   if(!f)continue;
   normalized.push({workspaceId:row.workspaceId,fileId:row.recipeId,runId,nodeId:row.nodeId,nodeName:meta?.name||row.nodeId,nodeType:meta?.type||'',
    model:row.model,createdAt:row.createdAt,updatedAt:row.updatedAt,status:row.status,parameters:row.parameters,resultCount:1,
    source:'weavy-saved-history',fileName:f.name,fileUrl:f.url,events:[],native:{savedHistory:true,batchId:row.batchId,refundedAt:row.refundedAt,
    isModel:true,nodeFound:!!meta,estimateModel:row.estimateModel,modelHint:row.estimateModel||meta?.modelHint||'',outputs:[row.output]}});
  }
 }
 if(normalized.length)addRuns(s,normalized);
 return normalized.length;
}
