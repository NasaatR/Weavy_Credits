import fs from 'node:fs';
import '../extension/vendor/catalog.js';
const input=JSON.parse(fs.readFileSync(new URL('../docs/official-rows.json',import.meta.url)));
const old=globalThis.WEAVY_CREDITS_REFERENCE_CATALOG.entries;
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const entries=[];
for(const row of input){
 const previous=old.find(e=>norm(e.name)===norm(row.name)||(e.aliases||[]).some(a=>norm(a)===norm(row.name)));
 const name=previous?.name||row.name;
 const base={...row,name,aliases:[...new Set([...(previous?.aliases||[]),...(row.name!==name?[row.name]:[])])],category:previous?.category||row.source.split('/').at(-1).replace(/^\d+-|models-comparison/g,''),provenance:'official-help'};
 const raw=row.priceText;
 if(/^\d+(\.\d+)?$/.test(raw))Object.assign(base,{kind:'fixed',min:Number(raw),max:Number(raw)});
 else if(/^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(raw)){const [min,max]=raw.split('-').map(Number);Object.assign(base,{kind:'range',min,max});}
 else if(previous?.kind==='dynamic'&&previous.options.every(o=>new RegExp('(^|[^\\d.])'+String(o.credits).replace('.','\\.')+'([^\\d.]|$)').test(raw))){
  Object.assign(base,{kind:'dynamic',options:previous.options,min:previous.min,max:previous.max,parameterLabel:previous.parameterLabel});
  if(/1080p prices are different/i.test(raw))base.unsupportedResolutions=['1080','1080p'];
 }else {Object.assign(base,{kind:'unknown',min:null,max:null});}
 if(previous&&JSON.stringify({kind:base.kind,min:base.min,max:base.max})!==JSON.stringify({kind:previous.kind,min:previous.min,max:previous.max}))base.previousPrice={kind:previous.kind,min:previous.min,max:previous.max,note:'Предыдущий каталог отличается; его цены не считаются текущими'};
 if(previous?.preferCatalogPricing&&previous.kind==='dynamic')base.parameterRules={options:previous.options,source:'Предоставленный анализатор 0.20.0',sourceDate:'2026-07-28',verifiedCurrent:false};
 base.aliases=base.aliases.filter(a=>!(/nano.banana.2.lite/i.test(a)));
 entries.push(base);
}
for(const e of old)if(!entries.some(x=>norm(x.name)===norm(e.name)))entries.push({...e,provenance:'reference-only',source:'Предоставленный каталог 0.20.0',publishedAt:'2026-07-28',checkedAt:null,priceText:e.kind==='formula'?'Формула из предыдущего каталога':String(e.min)+(e.min!==e.max?'–'+e.max:'')});
for(const e of entries)if(e.name==='Seedream V5 Edit')e.aliases.push('Seedream V5.0 Edit','Seedream 5.0 Edit');
// The comparison table groups distinct Kling versions into one column. They
// must remain separate identities so a correction cannot cross versions.
const kling=entries.find(e=>e.name==='Kling Video');
if(kling){
 const variants=['Kling 2.1 Standard','Kling 2.1 Pro','Kling 2.1 Master','Kling 2.5 Turbo Pro','Kling 2.6 Pro'];
 kling.aliases=kling.aliases.filter(a=>!variants.includes(a));
 // The source lists 2.6 Pro twice for 5s; it does not establish a 10s price.
 kling.options=kling.options.map(o=>o.when.text==='2.6 pro'?{...o,when:{...o.when,duration:5}}:o);
 for(const name of variants){
  const variant=name.replace(/^Kling /,'').toLowerCase(),options=kling.options.filter(o=>o.when.text===variant).map(o=>({credits:o.credits,when:{duration:o.when.duration}}));
  const prices=options.map(o=>o.credits);
  entries.push({name,aliases:[],category:kling.category,provenance:'official-help-variant',source:kling.source,checkedAt:'2026-10-23',publishedAt:kling.publishedAt,derivedFrom:kling.name,modelVariant:variant,kind:'dynamic',options,min:Math.min(...prices),max:Math.max(...prices),priceText:options.map(o=>o.when.duration+'s — '+o.credits).join(' / '),...(name==='Kling 2.6 Pro'?{pricedDurations:[5],pricingWarning:'В источнике две разные цены для Kling 2.6 Pro за 5 секунд; точный тариф не подтверждён'}:{})});
 }
}
// Promote explicit modes from existing numeric rules into named variants. No
// interpolation or optional-word matching is used to invent another tariff.
for(const parent of [...entries]){
 const modes=[...new Set((parent.options||[]).map(o=>o.when?.mode).filter(Boolean))];
 for(const mode of modes){
  const title=mode[0].toUpperCase()+mode.slice(1),name=parent.name+' '+title;
  if(entries.some(e=>e.name===name))continue;
  const options=parent.options.filter(o=>o.when.mode===mode).map(o=>({credits:o.credits,when:Object.fromEntries(Object.entries(o.when).filter(([k])=>k!=='mode'))}));
  const prices=options.map(o=>o.credits),names=[parent.name,...parent.aliases];
  const aliases=[...new Set(names.flatMap(n=>[n+' '+title,n.replace(/ (Text to|Image to|Reference$|Video$|Edit Video$)/i,' '+title+' $1')]).filter(n=>n!==name&&!names.includes(n)))];
  entries.push({...parent,name,aliases,derivedFrom:parent.name,provenance:'official-help-variant',options,min:Math.min(...prices),max:Math.max(...prices),modelMode:mode,parameterLabel:'Параметры варианта '+title,priceText:title+' · '+prices.join(' / ')+'; остальные условия из исходной таблицы'});
 }
}
const catalog={version:'2026-10-23',checkedAt:'2026-09-22',variantsUpdatedAt:'2026-10-23',officialCount:input.length,variantCount:entries.filter(e=>e.derivedFrom).length,entries};
fs.writeFileSync(new URL('../extension/catalog-data.js',import.meta.url),'// Public numeric tariff data: all ten official comparison tables. See docs/PRICING-RESEARCH.md.\nexport const BUILTIN_CATALOG = '+JSON.stringify(catalog,null,2)+';\n');
fs.writeFileSync(new URL('../docs/catalog-data.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
console.log({official:input.length,total:entries.length,unknown:entries.filter(e=>e.kind==='unknown').map(e=>[e.name,e.priceText])});
