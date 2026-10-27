import {catalogEntries,catalogEntry,canonicalModelName} from './pricing.js';
import {modelIdentity} from './model-matching.js';
const cache=new WeakMap();
const wrapper=v=>/^(fal|fal imported|fal imported v2|replicate|any llm(?: \d+)?|anyllm|run any llm|runanyllm|large language model|openrouter|custommodel|custommodelv2|llm)$/i.test(modelIdentity(v));
export const modelValue=e=>e.model||e.name;
export function availableModels(state){
 if(cache.has(state))return cache.get(state);
 const entries=new Map(catalogEntries().map(e=>[e.name,{...e,aliases:[...(e.aliases||[])]}]));
 const add=(raw,label,aliases=[],quote=null)=>{
  if(typeof raw!=='string'||!raw.trim()||wrapper(raw))return;
  const model=canonicalModelName(raw);let e=entries.get(model);
  if(!e){e={model,name:label||model,aliases:[],kind:'unknown',min:null,max:null,category:/claude|(?:^|\/)gpt[- ]|llama|deepseek|qwen(?!.*(?:image|tts))/i.test(raw)?'llm':'observed',provenance:'weavy-observed',source:'Модель из сохранённых данных Weavy',priceText:'Тариф Weavy не получен'};entries.set(model,e);}
  e.aliases=[...new Set([...e.aliases,raw,...aliases].filter(v=>typeof v==='string'&&v.trim()&&!wrapper(v)))];
  if(quote&&!quote.isByok&&Number.isFinite(quote.credits)&&quote.credits>=0){e.quoteMin=Math.min(e.quoteMin??Infinity,quote.credits);e.quoteMax=Math.max(e.quoteMax??0,quote.credits);e.quoteObservedAt=quote.observedAt;}
 };
 for(const p of Object.values(state.native?.prices||{})){
  const raw=p.modelName&&!wrapper(p.modelName)?p.modelName:p.modelType&&!wrapper(p.modelType)?p.modelType:p.name;
  add(raw,p.name,[p.name,p.modelName,p.modelType],p);
 }
 for(const r of Object.values(state.runs||{})){const hint=r.native?.estimateModel||r.native?.modelHint;for(const raw of [r.model,...(r.native?.outputs||[]).map(o=>o.model)])if(!hint||hint===raw||raw?.includes('/')||catalogEntry(canonicalModelName(raw)))add(raw,raw);for(const raw of [r.native?.estimateModel,r.native?.modelHint])add(raw,raw);}
 const result=[...entries.values()];cache.set(state,result);return result;
}
