// Formatting equivalence is safe for automatic pricing. Similarity only ranks
// suggestions: a typo, missing variant or different version needs a choice.
const identityCache=new Map(),entryIndexes=new WeakMap();
const nameOrder=new Intl.Collator('ru',{numeric:true,sensitivity:'base'});
export const compareModelNames=(a,b)=>nameOrder.compare(a,b);
export function modelIdentity(value){
 if(typeof value!=='string')return '';
 const raw=value.slice(0,300);if(identityCache.has(raw))return identityCache.get(raw);
 const result=raw.normalize('NFKC').toLowerCase()
  .replace(/(^|[^\p{L}\p{N}])v(\d+(?:_\d+)+)(?=$|[_\W])/gu,(_,prefix,v)=>prefix+'v'+v.replaceAll('_','.'))
  .replace(/[^\p{L}\p{N}.]+/gu,' ')
  .replace(/\b([\p{L}]{3,})v(?=\d)/gu,'$1 ')
  .replace(/\b(?:version|v)\s*(?=\d)/g,'')
  .replace(/\d+(?:[.,]\d+)*/g,n=>{const parts=n.replaceAll(',','.').split('.').map(x=>String(Number(x)));while(parts.length>1&&parts.at(-1)==='0')parts.pop();return parts.join('.');})
  .replace(/([\p{L}])(\d)|(\d)([\p{L}])/gu,(_,a,b,c,d)=>(a||c)+' '+(b||d))
  .replace(/[^\p{L}\p{N}.]+/gu,' ').replace(/(?<!\d)\.|\.(?!\d)/g,' ')
  .trim().replace(/\s+/g,' ');
 if(identityCache.size>=4096)identityCache.clear();identityCache.set(raw,result);return result;
}
const namesOf=e=>[e.model,e.name,...(e.aliases||[])].filter(v=>typeof v==='string'&&v.trim());
const modelOfEntry=e=>e.model||e.name;
function identityVariants(value){
 const all=[modelIdentity(value)];
 let rest=typeof value==='string'?value.trim():'';
 for(let depth=0;depth<4&&/^(?:fal-ai|fal|openai|google|bytedance|replicate|stability-ai|bfl|black-forest-labs|runwayml|anthropic)\//i.test(rest);depth++){rest=rest.replace(/^[^/]+\//,'');all.push(modelIdentity(rest));}
 return [...new Set(all.filter(Boolean))];
}
export function findModelMatch(value,entries){
 const wanted=identityVariants(value),found=new Map();if(!wanted.length)return {kind:'none',model:null,candidates:[]};
 if(!entryIndexes.has(entries)){const index=new Map();for(const e of entries)for(const name of namesOf(e))for(const n of identityVariants(name)){if(!index.has(n))index.set(n,new Map());index.get(n).set(modelOfEntry(e),e);}entryIndexes.set(entries,index);}
 for(const n of wanted)for(const [name,e]of entryIndexes.get(entries).get(n)||[])found.set(name,e);
 const candidates=[...found.values()].filter(e=>!(e.excludedAliases||[]).some(n=>modelIdentity(n)===modelIdentity(value)));
 if(candidates.length===1){const entry=candidates[0];return {kind:namesOf(entry).some(n=>n.trim().toLowerCase()===value.trim().toLowerCase())?'exact':'format',model:modelOfEntry(entry),entry,candidates};}
 return {kind:candidates.length?'ambiguous':'none',model:null,candidates};
}
const grams=s=>new Set(Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)));
const variants=['edit','inpaint','outpaint','fill','pro','lite','turbo','fast','standard','master','mini','preview','ultra','max'];
function similarity(a,b){
 if(!a||!b)return 0;if(a===b)return 1;
 const aa=new Set(a.split(' ')),bb=new Set(b.split(' ')),ga=grams(a),gb=grams(b);
 const overlap=[...aa].filter(t=>bb.has(t)).length/(new Set([...aa,...bb]).size||1);
 const dice=2*[...ga].filter(g=>gb.has(g)).length/(ga.size+gb.size||1);
 const numbers=s=>[...new Set(s.match(/\b\d+(?:\.\d+)*\b/g)||[])].sort().join(',');
 let score=.55*dice+.35*overlap+.1*Number(a.split(' ')[0]===b.split(' ')[0]);
 if(numbers(a)&&numbers(b)&&numbers(a)!==numbers(b))score-=.2;
 score-=Math.min(.2,variants.filter(t=>aa.has(t)!==bb.has(t)).length*.06);
 return Math.max(0,Math.min(1,score));
}
export function modelSimilarity(value,entry){
 const inputs=identityVariants(value).slice(-1);let score=0;
 // Provider prefixes carry no model identity: sharing "fal-ai/" must not
 // make unrelated image families look similar.
 for(const name of namesOf(entry))for(const a of inputs)for(const b of identityVariants(name).slice(-1))score=Math.max(score,similarity(a,b));
 return score;
}
export function rankModels(entries,value='',hints=[]){
 const context=[...new Set(hints.filter(v=>typeof v==='string'&&v.trim()))];
 return entries.map(e=>({...e,similarity:Math.max(modelSimilarity(value,e),...context.map(v=>modelSimilarity(v,e)*.96))})).sort((a,b)=>b.similarity-a.similarity||compareModelNames(a.name,b.name));
}
