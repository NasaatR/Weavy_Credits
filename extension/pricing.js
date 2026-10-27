import {BUILTIN_CATALOG} from './catalog-data.js';
import {findModelMatch,modelIdentity} from './model-matching.js';
import './vendor/analyzer-core.js';

// Only model resolution and unit-price helpers are used. No reference hook,
// network requests, broad charge guessing or current node parameters are used.
const referenceCatalog = BUILTIN_CATALOG;
export const CATALOG_VERSION=referenceCatalog.version;
const referenceCore = globalThis.WeavyCreditsReferenceCore;
const priceResolver = referenceCore.createAnalyzer(referenceCatalog);
const entryByName=new Map(referenceCatalog.entries.map(e=>[e.name,e]));
export const sameModel=(a,b)=>typeof a==='string'&&typeof b==='string'&&modelIdentity(canonicalModelName(a))===modelIdentity(canonicalModelName(b));
export const sameParameter=(a,b)=>typeof a==='string'&&typeof b==='string'?a.trim().toLowerCase()===b.trim().toLowerCase():a===b;
export function historicalOutputModel(run){
 const outputs=run.native?.outputs||[];
 if(!outputs.length||outputs.length!==run.resultCount||outputs.some(o=>!o.model))return null;
 return outputs.every(o=>sameModel(o.model,outputs[0].model))?canonicalModelName(outputs[0].model):null;
}
export function historicalModel(value) {
 if(!value||typeof value!=='object')return null;
 // Resolve each evidence tier independently: catalogue confidence must never
 // let a current node name override an explicit historical input model.
 const unwrap=(v,d=0)=>d<4&&v&&typeof v==='object'&&!Array.isArray(v)&&('value' in v||v.data?.value!==undefined)?unwrap(v.data?.value??v.value,d+1):v;
 const field=(v,k)=>{const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');if(Array.isArray(v)){const p=v.find(p=>norm(Array.isArray(p)?typeof p[0]==='string'?p[0]:p[0]?.id||p[0]?.name:p?.id||p?.name)===norm(k));return Array.isArray(p)?p[1]:p?.value??p?.data?.value;}return v&&typeof v==='object'?Object.entries(v).find(([name])=>norm(name)===norm(k))?.[1]:undefined;};
 const wrapper=v=>typeof v==='string'&&/^(?:fal|replicate|openrouter|openai|google|falimported|anyllm|genericmodel|custommodel|importedmodel)$/.test(v.toLowerCase().replace(/[^a-z0-9]/g,''));
 const resolve=(v,depth=0)=>{
  if(depth>8)return null;
  v=unwrap(v);if(v==null)return null;
  if(typeof v==='object'){
   for(const k of ['service','modelSlug','slug','providerModel','model','modelName','version','name']){const m=resolve(v[k],depth+1);if(m)return m;}
   return null;
  }
  if(typeof v!=='string'||wrapper(v)||!v.trim()||/^[\d\s.,_-]+$/.test(v))return null;
  return resolvePriceModel(v)?.canonical||null;
 };
 for(const container of [value.input,value.params,value.parameters,value]){
  for(const k of ['model','modelSlug','modelVersion','providerModel','modelName']){const m=resolve(field(container,k));if(m)return m;}
 }
 for(const v of [value.data?.kind?.model,value.data?.model,value.data?.modelSlug,value.data?.modelName,value.kind?.model]){const m=resolve(v);if(m)return m;}
 // Legacy node identities only. Result/file names and user labels are not models.
 if(value.data)for(const v of [value.data.name,value.data.menu?.modelName]){
  const m=resolvePriceModel(v);if(m?.entry)return m.canonical;
 }
 return null;
}
export function historicalParams(value) {
 const result={};
 const aliases={numimages:'count',numoutputs:'count',outputcount:'count',imagesize:'resolution',videosize:'resolution',outputsize:'resolution',outputresolution:'resolution',generateaudio:'audio',enableaudio:'audio',durationseconds:'duration',durationmilliseconds:'duration',inputcount:'inputCount',inputtokens:'inputTokens',outputtokens:'outputTokens',speed:'mode',tier:'mode',variant:'mode'};
 const allowed=new Set(['duration','seconds','resolution','quality','count','audio','width','height','fps','steps','mode','inputCount','inputTokens','outputTokens']);
 const unwrap=(v,depth=0)=>depth<4&&v&&typeof v==='object'&&!Array.isArray(v)&&('value' in v||v.data?.value!==undefined)?unwrap(v.data?.value??v.value,depth+1):v;
 const set=(name,value)=>{
  if(typeof name!=='string')return;
  const normalized=name.toLowerCase().replace(/[^a-z0-9]/g,'');const k=aliases[normalized]||normalized;
  let v=unwrap(value);if(!allowed.has(k))return;
  if(k==='resolution'&&v&&typeof v==='object'&&!Array.isArray(v)){set('width',v.width);set('height',v.height);return;}
  if(!['string','number','boolean'].includes(typeof v))return;
  if(typeof v==='string'){
   if(v.length>80||/https?:|data:/i.test(v))return;v=v.trim();if(!v)return;
   if(/^(duration|seconds|count|width|height|fps|steps|inputCount|inputTokens|outputTokens)$/.test(k)){
    const m=v.match(/^(\d+(?:[.,]\d+)?)\s*(?:s|secs?|seconds)?$/i);if(!m)return;v=Number(m[1].replace(',','.'));
   }else if(k==='audio'){
    if(/^(true|yes|on|enabled|1)$/i.test(v))v=true;else if(/^(false|no|off|disabled|0)$/i.test(v))v=false;else return;
   }
  }
  if(normalized==='durationmilliseconds'&&typeof v==='number')v/=1000;
  if(typeof v==='number'&&(!Number.isFinite(v)||v<0))return;
  if(k!=='count'&&result[k]!==undefined&&!sameParameter(result[k],v))result.pricingConflict=true;
  else result[k]=v;
 };
 const read=(v,depth=0)=>{
  if(!v||typeof v!=='object'||depth>5)return;
  if(Array.isArray(v)){for(const pair of v.slice(0,100)){
   if(Array.isArray(pair)&&pair.length===2){const def=pair[0];set(typeof def==='string'?def:def?.id||def?.name||def?.title,pair[1]);}
   else if(pair&&typeof pair==='object')read(pair,depth+1);
  }}else{
   for(const [k,x]of Object.entries(v))set(k,x);
   if(typeof (v.name||v.id)==='string')set(v.name||v.id,v.value??v.data?.value);
   for(const k of ['input','params','parameters','settings'])read(v[k],depth+1);
  }
 };
 read(value);if(result.duration!==undefined&&result.seconds!==undefined&&result.duration!==result.seconds)result.pricingConflict=true;return result;
}
function unsupportedResolution(entry,p){
 if(!entry?.unsupportedResolutions?.length)return false;
 const canonical=referenceCore.helpers.canonicalParams(p,'');return entry.unsupportedResolutions.some(v=>canonical.resolutions.has(String(v).toLowerCase().replace(/p$/,'')));
}
function unsupportedDuration(entry,p){
 if(!entry?.pricedDurations?.length)return false;
 const durations=referenceCore.helpers.canonicalParams(p,'').durations;
 return durations.size>0&&[...durations].some(d=>!entry.pricedDurations.includes(d));
}
const conflictingMode=(entry,p)=>p.mode!==undefined&&String(p.mode).trim()!==''&&(entry?.modelMode?!sameParameter(String(p.mode),entry.modelMode):entry?.modelVariant?!modelIdentity(String(p.mode)).split(' ').every(t=>modelIdentity(entry.modelVariant).split(' ').includes(t)):false);
const conflictingRules=e=>e?.provenance==='official-help'&&e.parameterRules?.options.some(o=>o.credits<e.min||o.credits>e.max);
export function estimateHistory(run,mappings={}) {
 const originalModel = run.model || run.native?.estimateModel || (mappings[run.native?.modelHint]?run.native.modelHint:null);
 const model = mappings[originalModel] || originalModel;
 if (!model) return null;
 const info = resolvePriceModel(model);
 if (!info?.entry) return null;
 const count = run.resultCount;
 if (!Number.isInteger(count) || count <= 0) return null;
 const outputs = run.native?.outputs || [];
 // A result already represents one output; num_images must not multiply it again.
 const samples = outputs.length === count ? outputs.map(o=>({...run.parameters,...o.parameters,count:1})) : [ {...run.parameters,count:1} ];
 if(samples.some(p=>unsupportedResolution(info.entry,p)||unsupportedDuration(info.entry,p)||conflictingMode(info.entry,p)||p.duration!==undefined&&p.seconds!==undefined&&p.duration!==p.seconds))return null;
 const estimates = samples.map(p => cachedUnitPrice(info,p));
 if (estimates.some(e=>!Number.isFinite(e.min)||!Number.isFinite(e.max))) return null;
 const multiplier = samples.length === count ? 1 : count;
 const min = estimates.reduce((s,e)=>s+e.min,0)*multiplier;
 const max = estimates.reduce((s,e)=>s+e.max,0)*multiplier;
 if(!Number.isFinite(min)||!Number.isFinite(max))return null;
 const source = estimates.some(e=>e.ruleSource)?[...new Set(estimates.map(e=>e.ruleSource).filter(Boolean))].join('; '):(info.entry?.provenance?.startsWith('official-help')?'Справка Weavy, проверено '+info.entry.checkedAt: 'Неперепроверенный тариф из предоставленного каталога')+' · '+(info.entry?.source||'');
 const reason = (run.model ? '' : 'Модель взята из сохранённой ноды; историческая модель не подтверждена. ')
  + 'Оценка по каталогу, действовавшая цена не подтверждена. '
  + [...new Set(estimates.map(e=>e.reason))].join(' ');
 return {kind:'estimate',credits:min,maxCredits:max,source,reason,basis:estimates.some(e=>e.basis==='parameter-rule')?'parameter-rule':'catalog',precision:min===max?'single':'range',gap:min!==max?priceGap(model,run.parameters):null};
}

const modelCache=new Map(),unitCache=new Map();
function resolvePriceModel(model){
 if(typeof model!=='string'||!model.trim())return null;
 if(!modelCache.has(model)){
  if(modelCache.size>2000)modelCache.clear();
  const match=findModelMatch(model,referenceCatalog.entries),info=priceResolver.resolveModelFromContainer({model:match.model||model},true);
  // The legacy resolver accepts substrings. A new minor version or modifier
  // must not inherit a shorter catalogue identity through that fallback.
 modelCache.set(model,match.model?{...info,raw:model,canonical:match.model,entry:match.entry}:info&&!info.entry?info:{raw:model,canonical:model.trim(),entry:null,resolvedBy:'unmatched-model'});
 }return modelCache.get(model);
}
function cachedUnitPrice(info,p){
 const key=JSON.stringify([info.canonical,info.raw,Object.keys(p).sort().map(k=>[k,p[k]])]);
 if(!unitCache.has(key)){
  if(unitCache.size>5000)unitCache.clear();
  const detailed=!conflictingRules(info.entry)&&info.entry?.parameterRules;
  let estimate=null;
  if(detailed){
   const entry={...info.entry,kind:'dynamic',options:detailed.options};
   const e=referenceCore.helpers.estimateUnitCredits({...info,entry},p,{...referenceCatalog,entries:referenceCatalog.entries.map(x=>x.name===entry.name?entry:x)},null);
   if(e.source==='catalog-parameter-match'&&e.min===e.max)estimate={...e,basis:'parameter-rule',ruleSource:detailed.source+' · '+detailed.sourceDate,reason:'Расчёт по сохранённым параметрам и правилу из предоставленного анализатора. Текущее и историческое списание не подтверждены.'};
  }
  if(!estimate)estimate=referenceCore.helpers.estimateUnitCredits(info,p,referenceCatalog,null);
  unitCache.set(key,estimate);
 }
 return unitCache.get(key);
}
export function priceGap(model,p={}){
 const info=resolvePriceModel(model),e=info?.entry;
 if(p.pricingConflict)return 'Сохранены противоречивые параметры цены';
 if(!e)return 'Не найдено правило для точной модели';
 if(unsupportedResolution(e,p))return 'Для этого разрешения источник требует отдельный тариф; базовая цена не применяется';
 if(unsupportedDuration(e,p))return 'Источник не подтверждает цену для этой длительности';
 if(conflictingMode(e,p))return 'Режим в названии модели противоречит сохранённым параметрам';
 if(conflictingRules(e))return 'Источники цены расходятся: старые подробные правила выходят за диапазон официальной таблицы';
 if(e.pricingWarning)return e.pricingWarning;
 const keys=[...new Set((e.parameterRules?.options||e.options||[]).flatMap(o=>Object.keys(o.when||{})))];
 const missing=keys.filter(k=>p[k]===undefined&&!(k==='resolution'&&p.width&&p.height));
 if(missing.length)return 'В истории нет: '+missing.map(k=>({quality:'Quality',resolution:'разрешение',duration:'длительность',mode:'режим',audio:'аудио'}[k]||k)).join(', ');
 return keys.length?'Для этих параметров нет однозначного ценового правила':'Источник публикует диапазон без точного правила';
}
export function catalogEntries(){return referenceCatalog.entries;}
export function catalogEntry(name){return entryByName.get(name)||null;}
export function canonicalModelName(value){return typeof value==='string'?(resolvePriceModel(value)?.canonical||value).trim():'';}
