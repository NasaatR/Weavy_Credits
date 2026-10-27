import {VERSION} from './version.js';
import {APPEARANCE} from './appearance.js';
import {FX_SEED,CREDIT_PLANS} from './currency.js';
import {estimateHistory,catalogEntry,catalogEntries,priceGap,canonicalModelName,historicalOutputModel,sameModel,sameParameter} from './pricing.js';
import {modelIdentity,findModelMatch,rankModels} from './model-matching.js';
export const SCHEMA = 1;
export const DEFAULTS = {title:'WEAVY CREDITS',theme:'dark',accent:'#ffffff',appearance:APPEARANCE.snapshot(APPEARANCE.defaults),fontSize:14,panelScale:1,usdPer10k:10000/120,rubPerUsd:FX_SEED.rate,creditPlan:'team',teamDefaultApplied:true,fxMode:'auto',fxDate:FX_SEED.date,fxSource:FX_SEED.source,autoFollow:true,dock:true,showCredits:true,showUsd:true,showRub:true,showPreview:true,position:null};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export const text=(v,n=200)=>typeof v==='string'?v.slice(0,n):'';
export const id=v=>{if(typeof v!=='string'||!v.trim()||v.length>300||['__proto__','prototype','constructor'].includes(v))throw Error('Отсутствует стабильный ID');return v;};
export const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
export const key=(...p)=>JSON.stringify(p);
export const fileKey=r=>key(r.workspaceId,r.fileId);
export const runKey=r=>key(r.workspaceId,r.runId);
export const sourceModelName=(r,includeLabel=true)=>r.model||historicalOutputModel(r)||r.native?.estimateModel||r.native?.modelHint||(includeLabel?r.nodeName:'')||'';
const modelHint=r=>sourceModelName(r,false);
export const modelNameKey=r=>modelIdentity(canonicalModelName(sourceModelName(r)));
export const modelAssignmentKey=(r,scope='run')=>scope==='name'?modelNameKey(r)?key('name',modelNameKey(r)):null:scope==='node'&&r.nodeId?key('node',r.workspaceId,r.fileId,r.nodeId,canonicalModelName(modelHint(r)).toLowerCase()):key('run',r.workspaceId,r.fileId,r.runId);
const assignmentsPrepared=Symbol('assignmentsPrepared');
const emptyAssignments={};Object.defineProperty(emptyAssignments,assignmentsPrepared,{value:true});Object.freeze(emptyAssignments);
export function normalizedModelAssignmentKey(k){
 try{const p=JSON.parse(k);if(p[0]==='name'&&p.length===2)return key('name',modelIdentity(canonicalModelName(p[1])));if(p[0]==='node'&&p.length===5)return key(...p.slice(0,4),canonicalModelName(p[4]).toLowerCase());}catch{}
 return k;
}
function assignmentView(assignments){
 if(assignments[assignmentsPrepared])return assignments;
 if(!Object.keys(assignments).length)return emptyAssignments;
 const out={...assignments},groups=new Map();
 for(const [k,model]of Object.entries(assignments)){const normalized=normalizedModelAssignmentKey(k);if(!groups.has(normalized))groups.set(normalized,[]);groups.get(normalized).push(model);}
 for(const [k,models]of groups)out[k]=new Set(models.map(canonicalModelName)).size===1?models[0]:null;
 Object.defineProperty(out,assignmentsPrepared,{value:true});return out;
}
export const equivalentNameKeys=(assignments,run)=>Object.keys(assignments).filter(k=>k.startsWith('["name",')&&normalizedModelAssignmentKey(k)===modelAssignmentKey(run,'name'));
export function modelAssignment(run,assignments={}){
 assignments=assignmentView(assignments);
 const single=assignments[modelAssignmentKey(run)];if(single)return {model:single,scope:'run'};
 const node=run.nodeId&&assignments[modelAssignmentKey(run,'node')];if(node)return {model:node,scope:'node'};
 const shared=assignments[modelAssignmentKey(run,'name')];return shared?{model:shared,scope:'name'}:null;
}
export function mappedModelName(name,mappings={}){
 if(mappings[name])return mappings[name];const identity=modelIdentity(canonicalModelName(name));if(!identity)return null;
 const matches=[...new Set(Object.entries(mappings).filter(([raw])=>modelIdentity(canonicalModelName(raw))===identity).map(([,target])=>target))];return matches.length===1?matches[0]:null;
}
export function resolvedModel(run,mappings={},assignments={}){const picked=modelAssignment(run,assignments),output=historicalOutputModel(run),refined=output&&(!run.model||catalogEntry(output)?.derivedFrom===canonicalModelName(run.model))?output:null;return picked?.model||mappedModelName(modelHint(run),mappings)||refined||modelHint(run)||null;}
export function cleanModelAssignments(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>50000)throw Error('Некорректные уточнения моделей');
 const out={};for(const [k,model]of Object.entries(value)){let parts;try{parts=JSON.parse(k);}catch{throw Error('Некорректный ID уточнения модели');}
  if(!Array.isArray(parts)||!['run','node','name'].includes(parts[0])||parts.length!==(parts[0]==='name'?2:parts[0]==='node'?5:4))throw Error('Некорректная область уточнения модели');
  if(parts[0]==='name')parts[1]=id(modelIdentity(canonicalModelName(id(parts[1]))));else parts.slice(1,4).forEach(id);if(parts[0]==='node'){if(typeof parts[4]!=='string'||parts[4].length>300)throw Error('Некорректное исходное имя модели');parts[4]=canonicalModelName(parts[4]).toLowerCase();}
  if(out[key(...parts)]&&out[key(...parts)]!==model)throw Error('Конфликт уточнений одного названия');
  out[key(...parts)]=id(model);
 }return out;
}
export function iso(v,required=false){const ok=typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v));if(!ok&&required)throw Error('Нужна дата ISO 8601 с временем');return ok?new Date(v).toISOString():null;}
const PARAMS=['duration','seconds','resolution','quality','count','audio','inputTokens','outputTokens','width','height','fps','steps','mode','inputCount','pricingConflict'];
export function params(v){const out={};for(const k of PARAMS)if(own(v||{},k)&&['string','number','boolean'].includes(typeof v[k]))out[k]=typeof v[k]==='string'?text(v[k],80):v[k];return out;}
export function safeUrl(v){try{const u=new URL(v);if(u.origin!=='https://app.weavy.ai')return null;return u.origin+u.pathname;}catch{return null;}}
export function cleanRun(v){
 const r={workspaceId:id(v.workspaceId),fileId:id(v.fileId),runId:id(v.runId),nodeId:v.nodeId?id(v.nodeId):null,nodeName:text(v.nodeName),nodeType:text(v.nodeType),model:text(v.model)||null,provider:text(v.provider),version:text(v.version),createdAt:iso(v.createdAt),updatedAt:iso(v.updatedAt)||iso(v.createdAt),status:text(v.status,40)||'unknown',parameters:params(v.parameters),resultCount:number(v.resultCount),previewCredits:number(v.previewCredits),source:text(v.source)||'import',events:[],fileName:text(v.fileName),fileUrl:safeUrl(v.fileUrl),snapshotConflict:!!v.snapshotConflict,eventConflict:!!v.eventConflict,native:v.native?{savedHistory:!!v.native.savedHistory,isModel:typeof v.native.isModel==='boolean'?v.native.isModel:null,nodeFound:!!v.native.nodeFound,estimateModel:text(v.native.estimateModel)||null,outputs:(v.native.outputs||[]).slice(0,50000).map(o=>({id:text(o.id,300)||null,batchId:text(o.batchId,300)||null,order:o.order==null?null:String(o.order).slice(0,10),secondaryOrder:o.secondaryOrder==null?null:String(o.secondaryOrder).slice(0,10),model:text(o.model)||null,parameters:params(o.parameters)})),nodeRunId:text(v.native.nodeRunId,300),recipeRunId:text(v.native.recipeRunId,300),batchId:text(v.native.batchId,300),startedAt:iso(v.native.startedAt),refundedAt:iso(v.native.refundedAt),modelHint:text(v.native.modelHint)}:null};
 if(Array.isArray(v.events))for(const e of v.events.slice(0,1000)){if(!['debit','refund'].includes(e.kind)||number(e.credits)===null)throw Error('Некорректная операция списания/возврата');r.events.push({id:id(e.id),kind:e.kind,credits:e.credits,at:iso(e.at),source:text(e.source)||r.source});}
 const unique=[];for(const e of r.events){const old=unique.find(x=>x.id===e.id);if(!old)unique.push(e);else if(old.credits!==e.credits||old.kind!==e.kind)r.eventConflict=true;}r.events=unique;return r;
}
export function mergeOutputs(previous,incoming,preferIncoming=true){
 let outputs=previous.map(o=>({...o,parameters:{...o.parameters}})),conflict=false;
 const anonymous=o=>!o.id&&o.order===null;
 if(incoming.length&&incoming.every(anonymous)&&outputs.every(anonymous)){
  return {outputs:preferIncoming||!outputs.length?incoming:outputs,conflict};
 }
 const ids=new Map(),slots=new Map(),slotKey=o=>key(o.batchId,o.order,o.secondaryOrder??'0'),index=o=>{
  for(const [map,k,valid]of [[ids,o.id,!!o.id],[slots,slotKey(o),!!o.batchId&&o.order!==null]])if(valid){if(!map.has(k))map.set(k,[]);if(!map.get(k).includes(o))map.get(k).push(o);}
 };
 outputs.forEach(index);
 for(const o of incoming){const candidates=o.batchId&&o.order!==null?(slots.get(slotKey(o))||[]).filter(x=>!x.id||!o.id||x.id===o.id):[],old=(o.id?(ids.get(o.id)||[]).find(x=>!x.batchId||!o.batchId||x.batchId===o.batchId):null)||(candidates.length===1?candidates[0]:null);
  if(!old){const copy={...o,parameters:{...o.parameters}};outputs.push(copy);index(copy);continue;}
  for(const [k,v]of Object.entries(o.parameters||{})){if(old.parameters[k]!==undefined&&!sameParameter(old.parameters[k],v))conflict=true;else old.parameters[k]=v;}
  if(old.model&&o.model&&!sameModel(old.model,o.model))conflict=true;old.model ||= o.model;
  old.id ||= o.id;old.batchId ||= o.batchId;old.order ??= o.order;old.secondaryOrder ??= o.secondaryOrder;index(old);
 }
 return {outputs,conflict};
}
export function mergeRun(a,b){
 if(!a)return b;
 if(runKey(a)!==runKey(b))throw Error('Разные запуски');
 const out={...a,events:[...a.events],snapshotConflict:a.snapshotConflict||b.snapshotConflict,eventConflict:a.eventConflict||b.eventConflict||a.fileId!==b.fileId};
 for(const f of ['nodeId','model','provider','version','createdAt']){if(!out[f]&&b[f])out[f]=b[f];else if(out[f]&&b[f]&&(f==='model'?!sameModel(out[f],b[f]):out[f]!==b[f]))out.snapshotConflict=true;}
 out.parameters={...a.parameters};
 for(const [k,v]of Object.entries(b.parameters)){if(!own(out.parameters,k))out.parameters[k]=v;else if(!sameParameter(out.parameters[k],v))out.snapshotConflict=true;}
 if(out.parameters.duration!==undefined&&out.parameters.seconds!==undefined&&out.parameters.duration!==out.parameters.seconds)out.snapshotConflict=true;
 const terminal=x=>['completed','succeeded','success','failed','cancelled'].includes(String(x).toLowerCase());
 const newer=(!a.updatedAt||b.updatedAt&&b.updatedAt>=a.updatedAt)&&(!terminal(a.status)||terminal(b.status));
 if(a.updatedAt===b.updatedAt&&terminal(a.status)&&terminal(b.status)&&a.status.toLowerCase()!==b.status.toLowerCase()&&!([a.status,b.status].every(x=>['completed','succeeded','success'].includes(x.toLowerCase()))))out.snapshotConflict=true;
 if(b.native){out.native={...a.native,...b.native,estimateModel:a.native?.estimateModel||b.native.estimateModel,refundedAt:b.native.refundedAt||a.native?.refundedAt||null};
  const merged=mergeOutputs(a.native?.outputs||[],b.native.outputs||[],newer);
  out.native.outputs=merged.outputs;out.snapshotConflict ||= merged.conflict;
 }
 if(out.resultCount===null&&b.resultCount!==null)out.resultCount=b.resultCount;
 if(newer){for(const f of ['status','updatedAt','nodeName','nodeType','fileName','fileUrl'])if(b[f])out[f]=b[f];if(b.resultCount!==null)out.resultCount=b.resultCount;if(b.previewCredits!==null)out.previewCredits=b.previewCredits;}
 for(const e of b.events){const old=out.events.find(x=>x.id===e.id);if(!old)out.events.push(e);else if(old.credits!==e.credits||old.kind!==e.kind)out.eventConflict=true;}
 return out;
}
export function cleanRate(v){
 const units=['run','result','second','inputTokens','outputTokens','inputCount'];
 if(!units.includes(v.unit)||number(v.rate)===null)throw Error('Проверьте единицу и цену тарифа');
 for(const [k,x]of Object.entries(v.conditions||{}))if(!PARAMS.includes(k)||!['string','number','boolean'].includes(typeof x)||(typeof x==='number'&&!Number.isFinite(x)))throw Error('Неподдерживаемое условие тарифа: '+k);
 const r={id:id(v.id),model:id(v.model),label:text(v.label)||v.model,provider:text(v.provider),version:text(v.version),unit:v.unit,rate:v.rate,base:number(v.base)??0,minimum:number(v.minimum)??0,step:number(v.step)??1,divisor:number(v.divisor)??1,conditions:params(v.conditions),validFrom:iso(v.validFrom,true),validTo:iso(v.validTo),source:text(v.source,500),checkedAt:iso(v.checkedAt,true),allowUndated:!!v.allowUndated,multiplyBy:['resultCount','count','inputCount'].includes(v.multiplyBy)?v.multiplyBy:null,components:[]};
 if(v.components!==undefined&&!Array.isArray(v.components))throw Error('Дополнительные компоненты тарифа должны быть массивом');
 for(const c of (v.components||[]).slice(0,8)){if(!units.includes(c.unit)||number(c.rate)===null)throw Error('Некорректный компонент тарифа');const part={unit:c.unit,rate:c.rate,step:number(c.step)??1,divisor:number(c.divisor)??1,multiplyBy:['resultCount','count','inputCount'].includes(c.multiplyBy)?c.multiplyBy:null};if(part.step<=0||part.divisor<=0)throw Error('Неверный шаг компонента');r.components.push(part);}
 if(r.step<=0||r.divisor<=0||!r.source)throw Error('Укажите источник и положительный шаг');
 if(r.validTo&&r.validTo<=r.validFrom)throw Error('Конец тарифа раньше начала');return r;
}
export function rateFor(run,rates,mappings={}){
 if(!run.createdAt&&!rates.some(t=>t.allowUndated))return {reason:'Нет даты запуска для выбора исторического тарифа'};
 const modelKey=v=>modelIdentity(canonicalModelName(v));const mapped=mappedModelName(run.model,mappings);
 const list=rates.filter(t=>modelKey(t.model)===modelKey(mapped||run.model)&&(!t.provider||t.provider===run.provider)&&(!t.version||t.version===run.version)&&(run.createdAt?run.createdAt>=t.validFrom&&(!t.validTo||run.createdAt<t.validTo):t.allowUndated)&&Object.entries(t.conditions).every(([k,v])=>own(run.parameters,k)&&(typeof v==='string'&&typeof run.parameters[k]==='string'?run.parameters[k].trim().toLowerCase()===v.trim().toLowerCase():run.parameters[k]===v)));
 if(!list.length)return {reason:'Нет подходящего тарифа для даты и параметров'};
 if(list.length>1)return {blocked:true,reason:'Подходят несколько тарифов: уточните условия или даты'};
 return {rate:list[0]};
}
function inferredNodeModel(run,rates){
 const hint=run.native?.modelHint;if(!hint)return null;
 const named=canonicalModelName(hint);return catalogEntry(named)?named:rates.length?findModelMatch(hint,rates.map(t=>({name:canonicalModelName(t.model)}))).model:null;
}
function rateCost(run,t){
 if(run.parameters.duration!==undefined&&run.parameters.seconds!==undefined&&run.parameters.duration!==run.parameters.seconds)return {kind:'unknown',credits:null,reason:'Противоречивые исторические параметры длительности'};
 let variable=0;for(const part of [t,...(t.components||[])]){const units=part.unit==='run'?1:part.unit==='result'?run.resultCount:part.unit==='second'?(run.parameters.duration??run.parameters.seconds):run.parameters[part.unit];const multiplier=part.multiplyBy==='resultCount'?run.resultCount:part.multiplyBy?run.parameters[part.multiplyBy]:1;
  if(number(units)===null||number(multiplier)===null)return {kind:'unknown',credits:null,reason:'Не хватает параметра: '+part.unit+(part.multiplyBy?' × '+part.multiplyBy:'')};
  variable+=Math.ceil(units/part.step)*part.step/part.divisor*part.rate*multiplier;
 }
 const credits=Math.max(t.minimum,t.base+variable);
 if(!Number.isFinite(credits))return {kind:'unknown',credits:null,reason:'Переполнение расчёта'};
 return {kind:'estimate',credits,rateId:t.id,source:t.source,reason:!run.createdAt?'Нет даты: применён выбранный вами тариф для оценки сохранённых результатов':null};
}
const perOutputRate=t=>!t.base&&!t.minimum&&[t,...(t.components||[])].every(p=>p.unit==='result'?p.step===1&&p.multiplyBy!=='resultCount':p.multiplyBy==='resultCount');
function repeatedOutputs(outputs){
 const seen=new Set();for(const o of outputs){const k=o.id?key('id',o.batchId,o.id):o.batchId&&o.order!==null?key('slot',o.batchId,o.order,o.secondaryOrder??'0'):null;if(k){if(seen.has(k))return true;seen.add(k);}}return false;
}
export function cost(run,rates=[],mappings={},assignments={}){
 if(run.eventConflict)return {kind:'unknown',credits:null,reason:'Конфликт операций: одинаковый ID с разной суммой'};
 const debits=run.events.filter(e=>e.kind==='debit'),refunds=run.events.filter(e=>e.kind==='refund');
 if(debits.length){const d=debits.reduce((n,e)=>n+e.credits,0),f=refunds.reduce((n,e)=>n+e.credits,0);if(f>d)return {kind:'unknown',credits:null,reason:'Возвраты превышают доступные списания'};return {kind:'actual',credits:d-f,debit:d,refund:f,source:[...new Set(run.events.map(e=>e.source))].join(', ')};}
 if(!debits.length&&!refunds.length&&run.native?.isModel===false&&!run.model&&!run.native?.estimateModel&&!run.native?.savedHistory)return {kind:'ignored',credits:null,reason:'Техническая нода: не является моделью'};
 if(refunds.length)return {kind:'unknown',credits:null,reason:'Есть возврат, но исходное списание не загружено'};
 if(run.native?.refundedAt)return {kind:'unknown',credits:null,reason:'Weavy отметил возврат, но сумма списания и возврата не передана'};
 const picked=modelAssignment(run,assignments),mapped=!picked&&mappedModelName(modelHint(run),mappings);
 const outputs=run.native?.outputs||[],historical=historicalOutputModel(run),models=outputs.filter(o=>o.model).map(o=>o.model);
 if((run.resultCount!==null&&outputs.length>run.resultCount)||repeatedOutputs(outputs))return {kind:'unknown',credits:null,reason:'Число результатов противоречит сохранённым выходам или содержит повторяющиеся ID'};
 const refinesModel=historical&&run.model&&catalogEntry(historical)?.derivedFrom===canonicalModelName(run.model);
 if(!picked&&!mapped&&((run.model&&!refinesModel&&models.some(m=>!sameModel(m,run.model)))||(!run.model&&models.length&&!historical)))return {kind:'unknown',credits:null,code:'model-conflict',reason:'Модели исторических результатов различаются или указаны не для всех выходов: уточните модель этой генерации'};
 if(picked||mapped){run={...run,model:picked?.model||mapped};mappings={};}
 else if((!run.model||refinesModel)&&historical)run={...run,model:historical};
 if(!run.model&&!run.native?.estimateModel&&run.native?.modelHint){
  const matched=inferredNodeModel(run,rates);
  if(matched)run={...run,native:{...run.native,estimateModel:matched}};
 }
 if(run.native&&!run.model&&!run.native.estimateModel)return {kind:'unknown',credits:null,reason:'Запуск получен из Weavy, но ответ не содержит историческую модель и сумму списания'};
 if(run.parameters.pricingConflict||(run.native?.outputs||[]).some(o=>o.parameters?.pricingConflict))return {kind:'unknown',credits:null,reason:'Противоречивые исторические параметры цены'};
 if(run.snapshotConflict)return {kind:'unknown',credits:null,reason:'Противоречивые настройки одного запуска'};
 if(!run.model&&!run.native?.estimateModel)return {kind:'unknown',credits:null,reason:'Модель запуска неизвестна'};
 if(!['completed','succeeded','success'].includes(run.status.toLowerCase()))return {kind:'unknown',credits:null,reason:'Списание не подтверждено; статус '+run.status};
 if(run.resultCount===1&&outputs.length===1)run={...run,parameters:{...run.parameters,...outputs[0].parameters}};
 if(run.parameters.duration!==undefined&&run.parameters.seconds!==undefined&&run.parameters.duration!==run.parameters.seconds)return {kind:'unknown',credits:null,reason:'Противоречивые исторические параметры длительности'};
 if(rates.length&&run.resultCount>1&&outputs.length===run.resultCount){
  const perOutput=outputs.map(o=>{const sample={...run,model:run.model||run.native?.estimateModel,resultCount:1,parameters:{...run.parameters,...o.parameters}};return {sample,...rateFor(sample,rates,mappings)};});
  if(perOutput.some(v=>v.blocked))return {kind:'unknown',credits:null,reason:'Для результатов подходят несколько тарифов: уточните условия или даты'};
  if(perOutput.every(v=>v.rate&&perOutputRate(v.rate))){const prices=perOutput.map(v=>rateCost(v.sample,v.rate)),failed=prices.find(v=>v.kind==='unknown');if(failed)return failed;const credits=prices.reduce((sum,v)=>sum+v.credits,0);if(!Number.isFinite(credits))return {kind:'unknown',credits:null,reason:'Переполнение расчёта'};return {kind:'estimate',credits,source:[...new Set(prices.map(v=>v.source))].join('; '),rateIds:[...new Set(prices.map(v=>v.rateId))],basis:'per-output-rates',reason:'Расчёт каждого результата по его сохранённым параметрам'};}
  const batch=rateFor({...run,model:run.model||run.native?.estimateModel},rates,mappings);
  if(perOutput.some(v=>v.rate)&&(!batch.rate||perOutput.some(v=>!v.rate||v.rate.id!==batch.rate.id)))return {kind:'unknown',credits:null,reason:'Сохранённым результатам подходят разные или неполные ручные тарифы; общую цену запуска применить нельзя'};
 }
 const {rate:t,reason,blocked}=rateFor(run.model?run:{...run,model:run.native?.estimateModel},rates,mappings);if(!t){const estimated=!blocked&&(picked||mapped||run.native||catalogEntry(canonicalModelName(run.model)))?estimateHistory(run,mappings):null;
  if(estimated)return estimated;
  const model=mappings[run.model||run.native?.estimateModel]||run.model||run.native?.estimateModel;
  return {kind:'unknown',credits:null,reason:blocked?reason:run.native&&!(run.resultCount>0)?'Не загружены результаты запуска: число выходов неизвестно или равно нулю':run.native||catalogEntry(canonicalModelName(model))?priceGap(model,run.parameters):reason};}
 return rateCost(run,t);
}
export function executionCheck(run,rates=[],mappings={},assignments={}){
 const picked=modelAssignment(run,assignments),c=cost(run,rates,mappings,assignments),model=resolvedModel(run,mappings,assignments);
 const t=rateFor({...run,model},rates,picked?{}:mappings);
 return {status:c.kind==='actual'?'Confirmed':c.kind==='ignored'?'Excluded':c.kind==='estimate'?(!picked&&run.model&&(c.maxCredits??c.credits)===c.credits?'Calculated':'Estimated'):'Unknown',
  executionFound:!!run.runId,nodeFound:run.native?!!run.native.nodeFound||!!run.native.savedHistory:!!run.nodeId,
  historicalModel:run.model||historicalOutputModel(run)||null,nodeModel:run.native?.estimateModel||inferredNodeModel(run,rates)||null,assignedModel:picked?.model||null,assignmentScope:picked?.scope||null,
  tariffFound:!!t.rate||c.kind==='estimate'||!!catalogEntry(model),
  resultCount:run.resultCount,reason:c.gap||c.reason||null};
}
export function summarize(runs,rates,mappings,assignments={}){
 assignments=assignmentView(assignments);
 const out={rows:[],total:0,excluded:0,actual:0,estimate:0,estimateMax:0,actualCount:0,estimateCount:0,unknown:0,singleEstimate:0,singleCount:0,rangeMin:0,rangeMax:0,rangeCount:0,nodes:0,duration:0};const nodes=new Set();
 for(const run of runs){const c=cost(run,rates,mappings,assignments);if(c.kind==='ignored'){out.excluded++;continue;}out.total++;out.rows.push({...run,modelAssignment:modelAssignment(run,assignments),cost:c});nodes.add(key(run.workspaceId,run.fileId,run.nodeId||run.runId));out.duration+=number(run.parameters.duration??run.parameters.seconds)??0;
  if(c.kind==='actual'){out.actual+=c.credits;out.actualCount++;}
  else if(c.kind==='estimate'){const max=c.maxCredits??c.credits;out.estimate+=c.credits;out.estimateMax+=max;out.estimateCount++;if(max===c.credits){out.singleCount++;out.singleEstimate+=c.credits;}else{out.rangeCount++;out.rangeMin+=c.credits;out.rangeMax+=max;}}
  else out.unknown++;
 }out.nodes=nodes.size;return out;
}
export function pricingAudit(runs,rates,mappings,settings,assignments={}){
 assignments=assignmentView(assignments);
 const ids=new Map(),anon=v=>{if(!ids.has(v))ids.set(v,'id-'+(ids.size+1));return ids.get(v);};const sum=summarize(runs,rates,mappings,assignments);
 const gaps=new Map();for(const r of sum.rows){if(r.cost.kind!=='unknown'&&!(r.cost.kind==='estimate'&&(r.cost.maxCredits??r.cost.credits)!==r.cost.credits))continue;
  const model=canonicalModelName(resolvedModel(r,mappings,assignments)||sourceModelName(r,false))||'Модель не указана';if(!gaps.has(model))gaps.set(model,{model,records:0,unknown:0,ranged:0,reasons:new Map()});const g=gaps.get(model);g.records++;g[r.cost.kind==='unknown'?'unknown':'ranged']++;const reason=r.cost.gap||r.cost.reason||'Не хватает данных';g.reasons.set(reason,(g.reasons.get(reason)||0)+1);
 }
 const coverage={unknownRecords:sum.unknown,rangedRecords:sum.rangeCount,models:[...gaps.values()].sort((a,b)=>b.records-a.records||a.model.localeCompare(b.model)).map(g=>({...g,modelKnown:!!catalogEntry(g.model)||rates.some(t=>sameModel(t.model,g.model)),reasons:[...g.reasons].map(([reason,records])=>({reason,records})),suggestions:catalogEntry(g.model)?[]:rankModels(catalogEntries(),g.model).filter(e=>e.similarity>=.5).slice(0,3).map(e=>e.name)}))};
 return {version:VERSION,type:'pricing-audit',createdAt:new Date().toISOString(),coverage,settings:{creditPlan:settings.creditPlan,usdPer10k:settings.usdPer10k,rubPerUsd:settings.rubPerUsd},totals:{records:sum.total,actual:sum.actual,actualCount:sum.actualCount,singleEstimate:sum.singleEstimate,singleCount:sum.singleCount,rangeMin:sum.rangeMin,rangeMax:sum.rangeMax,rangeCount:sum.rangeCount,unknown:sum.unknown},records:sum.rows.map(r=>({workspace:anon(r.workspaceId),file:anon(fileKey(r)),node:anon(key(r.workspaceId,r.fileId,r.nodeId)),run:anon(runKey(r)),model:r.model,modelAssignment:r.modelAssignment,modelHint:r.native?.estimateModel||r.native?.modelHint||null,mapping:mappings?.[r.model||r.native?.estimateModel||r.native?.modelHint]||null,parameters:r.parameters,outputs:(r.native?.outputs||[]).map(o=>({model:o.model||null,parameters:o.parameters})),resultCount:r.resultCount,status:r.status,createdAt:r.createdAt,check:executionCheck(r,rates,mappings,assignments),cost:{kind:r.cost.kind,min:r.cost.credits,max:r.cost.maxCredits??r.cost.credits,basis:r.cost.basis||null,source:r.cost.source||null,reason:r.cost.reason||null,gap:r.cost.gap||null}}))};
}
export function money(credits,settings){const usd=number(settings.usdPer10k)===null?null:credits*settings.usdPer10k/10000;return {usd,rub:usd===null||number(settings.rubPerUsd)===null?null:usd*settings.rubPerUsd};}
export function initial(){return {schema:SCHEMA,settings:{...DEFAULTS},runs:{},files:{},rates:[],mappings:{},modelAssignments:{},sets:[],budgets:{},profiles:[],diagnostics:[],undo:[],redo:[],updatedAt:null};}
export function migrate(s){if(!s)return initial();if(s.schema!==SCHEMA)throw Error('Неизвестная версия данных. Сделайте резервную копию.');const settings={...DEFAULTS,...s.settings};if(!s.settings?.creditPlan){settings.creditPlan=number(s.settings?.usdPer10k)===null?'auto':'custom';if(settings.creditPlan==='auto')settings.usdPer10k=DEFAULTS.usdPer10k;}if(!s.settings?.fxMode){settings.fxMode=number(s.settings?.rubPerUsd)===null?'auto':'manual';if(settings.fxMode==='auto')settings.rubPerUsd=FX_SEED.rate;else settings.fxDate=null;}if(!s.settings?.teamDefaultApplied&&['auto','pro-team'].includes(settings.creditPlan)){settings.creditPlan='team';settings.usdPer10k=10000/120;}settings.teamDefaultApplied=true;settings.appearance=APPEARANCE.normalize(s.settings?.appearance||{accentColor:s.settings?.accent||'#ffffff',settingsAccentColor:s.settings?.accent||'#ffffff',...(s.settings?.theme==='light'?{settingsBgColor:'#f4f4f4',settingsPanelColor:'#ffffff'}:{})});return {...initial(),...s,settings,modelAssignments:s.modelAssignments||{}};}
export function cleanSettings(v){const s={...DEFAULTS};for(const k of ['autoFollow','dock','showCredits','showUsd','showRub','showPreview'])if(typeof v[k]==='boolean')s[k]=v[k];s.appearance=APPEARANCE.snapshot(v.appearance||{...APPEARANCE.defaults,accentColor:v.accent||'#ffffff'});s.title=text(v.title,48)||s.title;s.theme=v.theme==='light'?'light':'dark';s.accent=/^#[a-f0-9]{6}$/i.test(v.accent)?v.accent:s.accent;s.fontSize=Math.max(12,Math.min(22,number(v.fontSize)??14));s.panelScale=Math.max(.6,Math.min(1.5,number(v.panelScale)??1));s.creditPlan=CREDIT_PLANS.some(p=>p.id===v.creditPlan)?v.creditPlan:'custom';s.fxMode=v.fxMode==='auto'?'auto':'manual';s.usdPer10k=number(v.usdPer10k);s.rubPerUsd=number(v.rubPerUsd);if(s.creditPlan!=='custom')s.usdPer10k=CREDIT_PLANS.find(p=>p.id===s.creditPlan).usdPer10k;s.fxDate=/^\d{4}-\d{2}-\d{2}$/.test(v.fxDate)?v.fxDate:null;s.fxSource=text(v.fxSource,300);if(v.position&&number(v.position.x)!==null&&number(v.position.y)!==null)s.position={x:v.position.x,y:v.position.y};return s;}
export function addRuns(s,values){if(!Array.isArray(values)||values.length>50000)throw Error('Ожидается массив до 50 000 запусков');const runs=values.map(cleanRun);for(const r of runs){s.runs[runKey(r)]=mergeRun(s.runs[runKey(r)],r);const fk=fileKey(r);s.files[fk]={...s.files[fk],workspaceId:r.workspaceId,fileId:r.fileId,name:r.fileName||s.files[fk]?.name||r.fileId,url:r.fileUrl||s.files[fk]?.url||null,coverage:'partial',lastSeen:new Date().toISOString()};}const seen=new Map();for(const r of Object.values(s.runs))for(const e of r.events){const k=key(r.workspaceId,e.id),other=seen.get(k);if(other&&runKey(other)!==runKey(r)){other.eventConflict=true;r.eventConflict=true;}else seen.set(k,r);}return runs.length;}
export function validateBackup(v){if(v.schema!==SCHEMA)throw Error('Неподдерживаемая версия резервной копии');const s=initial();s.settings=cleanSettings(v.settings||{});addRuns(s,Object.values(v.runs||{}));s.rates=(v.rates||[]).map(cleanRate);s.profiles=(v.profiles||[]).map(cleanProfile);s.modelAssignments=cleanModelAssignments(v.modelAssignments);for(const [k,f]of Object.entries(v.files||{})){if(fileKey(f)!==k)throw Error('Некорректный ID файла');s.files[k]={workspaceId:id(f.workspaceId),fileId:id(f.fileId),name:text(f.name),url:safeUrl(f.url),coverage:'partial',lastSeen:iso(f.lastSeen)};}for(const [k,m]of Object.entries(v.mappings||{}))s.mappings[id(k)]=id(m);s.sets=(v.sets||[]).slice(0,100).map(x=>({id:id(x.id),name:text(x.name),files:(x.files||[]).filter(k=>own(s.files,k))}));for(const [k,b]of Object.entries(v.budgets||{}))if(number(b)!==null)s.budgets[k]=b;return s;}
export function csv(rows){const headers=['workspaceId','fileId','nodeId','nodeName','runId','model','assignedModel','assignmentScope','version','createdAt','status','resultCount','kind','credits','maxCredits','reason','source','parameters'];const cell=v=>{let s=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return '\uFEFF'+[headers,...rows.map(r=>headers.map(h=>h==='parameters'?JSON.stringify(r.parameters):h==='assignedModel'?r.modelAssignment?.model:h==='assignmentScope'?r.modelAssignment?.scope:['kind','credits','maxCredits','reason','source'].includes(h)?r.cost[h]:r[h]))].map(r=>r.map(cell).join(',')).join('\r\n');}
// Adapter mappings are configuration, never executable code. No Weavy endpoints are assumed.
const FIELDS=['workspaceId','fileId','runId','nodeId','nodeName','nodeType','model','provider','version','createdAt','updatedAt','status','resultCount','previewCredits','fileName','fileUrl','debitCredits','refundCredits','debitId','refundId',...PARAMS.map(x=>'parameters.'+x)];
export function cleanProfile(v){const u=new URL(v.origin);if(u.protocol!=='https:'||!(u.hostname==='weavy.ai'||u.hostname.endsWith('.weavy.ai')))throw Error('Адаптер может читать только домены weavy.ai');const fields={};for(const [k,p]of Object.entries(v.fields||{})){if(FIELDS.includes(k)&&typeof p==='string'&&p.length<200&&!/(__proto__|constructor|prototype)/.test(p))fields[k]=p;}
 for(const f of ['workspaceId','fileId','runId'])if(!fields[f])throw Error('Адаптеру нужны workspaceId, fileId, runId из ответа');
 if(!text(v.evidence))throw Error('Нужен источник проверки формата');
 return {id:id(v.id),name:text(v.name),origin:u.origin,pathPrefix:text(v.pathPrefix)||'/',itemsPath:text(v.itemsPath),fields,evidence:text(v.evidence,500),statusMap:Object.fromEntries(Object.entries(v.statusMap||{}).filter(([k,x])=>k.length<50&&['completed','succeeded','success','failed','cancelled','running','pending'].includes(x))),enabled:!!v.enabled};}
function at(obj,path){if(!path)return obj;return path.split('.').reduce((o,k)=>o&&typeof o==='object'&&own(o,k)?o[k]:undefined,obj);}
export function adapt(body,profile){let rows=[body];for(const part of profile.itemsPath.split('.').filter(Boolean))rows=rows.flatMap(x=>part==='*'?(Array.isArray(x)?x:[]):[at(x,part)]).filter(x=>x!==undefined);return rows.flatMap(item=>{try{const v={parameters:{},events:[],source:'adapter:'+profile.id};for(const [k,p]of Object.entries(profile.fields)){const value=at(p.startsWith('$.')?body:item,p.startsWith('$.')?p.slice(2):p);if(k.startsWith('parameters.'))v.parameters[k.slice(11)]=value;else v[k]=value;}v.status=profile.statusMap[v.status]||v.status;for(const kind of ['debit','refund'])if(v[kind+'Id']&&number(v[kind+'Credits'])!==null)v.events.push({id:String(v[kind+'Id']),kind,credits:v[kind+'Credits'],source:profile.evidence});return [cleanRun(v)];}catch{return [];}});}

export function cleanShape(v,depth=0,budget={n:0}){
 if(++budget.n>1800||depth>13)return '…';
 if(Array.isArray(v))return v.slice(0,8).map(x=>cleanShape(x,depth+1,budget));
 if(v&&typeof v==='object'){const out=Object.create(null);for(const [k,x]of Object.entries(v).slice(0,70)){if(/access.?token|refresh.?token|cookie|secret|authorization|password|prompt|email|media|base64/i.test(k))continue;if(['__proto__','constructor','prototype'].includes(k))continue;const name=/^[a-zA-Z_][a-zA-Z0-9_]{0,55}$/.test(k)?k:'<dynamic-key>';out[name]=cleanShape(x,depth+1,budget);}return out;}
 return ['string','number','boolean','null','object','undefined','empty','…'].includes(v)?v:'<redacted>';
}
