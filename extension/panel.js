import {APPEARANCE} from './appearance.js';
import {appearanceSections,applyPageAppearance} from './appearance-ui.js';
import {modelPicker} from './model-picker.js';
import {availableModels,modelValue} from './model-list.js';
import {VERSION} from './version.js';
import {diagnosticsCopy} from './diagnostics-copy.js';
import {modelIdentity,compareModelNames} from './model-matching.js';
import {catalogEntries,catalogEntry,historicalModel,canonicalModelName,CATALOG_VERSION} from './pricing.js';
import {CREDIT_PLANS,effectiveMoneySettings,moneyPlan,planName,PLAN_REFERENCE} from './currency.js';
import {summarize,centralCredits,reportTotal,modelSuggestionHints,pricingAudit,executionCheck,fileKey,runKey,money,key,csv,cleanRate,cleanProfile,modelAssignmentKey,modelAssignment,resolvedModel,sourceModelName} from './core.js';
const $=s=>document.querySelector(s),main=$('#main');
let state,context,tabId=Number(new URLSearchParams(location.search).get('tab'))||null,view=new URLSearchParams(location.search).get('view')||'report';
let selected=new Set(),lastActive=null,group='nodes',filter='',onlyUnknown=false,fileSearch='',nodeModel='',unknownIndex=-1,busy=0,rowsSort='unresolved',catalogSearch='',catalogSort='name',catalogFilter='all',deferredRefresh=false;
const recentlyAssigned=new Set();
let fixesSearch='';
let filesExpanded=null,loadSequence=0,assignmentSequence=0;
let rowPageKey='',rowPageLimit=150,catalogPageKey='',catalogPageLimit=150;
let displayState,displayModels=new WeakMap(),summaryState,summarySelection,summaryValue;
const numberFormats=new Map(),fmt=(v,max=2)=>{if(v==null)return '—';if(!numberFormats.has(max))numberFormats.set(max,new Intl.NumberFormat('ru-RU',{maximumFractionDigits:max}));return numberFormats.get(max).format(v);};
const range=(a,b)=>fmt(a)+(b!=null&&b!==a?'–'+fmt(b):'');
const modelOf=r=>{if(displayState!==state){displayState=state;displayModels=new WeakMap();}if(!displayModels.has(r))displayModels.set(r,canonicalModelName(resolvedModel(r,state.mappings,state.modelAssignments))||'Модель неизвестна');return displayModels.get(r);};
const groupScope=r=>r.cost?.code==='model-conflict'||modelAssignment(r,state.modelAssignments)?.scope==='run'?'run':modelAssignmentKey(r,'name')?'name':r.nodeId?'node':'run';
const fixKey=r=>modelAssignmentKey(r,groupScope(r));
let nameStatsState,nameStats;
function sharedNameStats(){
 if(nameStatsState===state)return nameStats;nameStatsState=state;nameStats=new Map();
 for(const r of Object.values(state.runs)){const k=modelAssignmentKey(r,'name');if(!k)continue;if(!nameStats.has(k))nameStats.set(k,{nodes:new Set(),generations:0});const g=nameStats.get(k);g.nodes.add(key(r.workspaceId,r.fileId,r.nodeId||r.runId));g.generations++;}
 return nameStats;
}
const dateFormat=new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const date=v=>v&&Number.isFinite(new Date(v).getTime())?dateFormat.format(new Date(v)):'Неизвестно';
function el(tag,attrs={},...children){const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k.startsWith('on'))n.addEventListener(k.slice(2).toLowerCase(),v);else if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k==='checked')n.checked=v;else if(k==='value')n.value=v;else if(k==='disabled')n.disabled=v;else n.setAttribute(k,v);}for(const c of children.flat())if(c!=null)n.append(typeof c==='string'?document.createTextNode(c):c);return n;}
const btn=(label,fn,cls='')=>el('button',{type:'button',class:cls,onClick:async()=>{try{await fn();}catch(e){toast(e.message);}}},label);
const note=t=>el('div',{class:'notice'},t);
const field=(label,input)=>el('label',{class:'field'},el('span',{},label),input);
const input=(name,value,type='text',props={})=>el('input',{name,type,value:value??'',...props});
const actions=(...nodes)=>el('div',{class:'actions'},...nodes);
function toast(t){$('#message').textContent=t;$('#message').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#message').hidden=true,15000);}
async function rpc(m){const r=await chrome.runtime.sendMessage(m);if(r?.error)throw Error(r.error);return r;}
function ask(title,description){return new Promise(resolve=>{const d=$('#confirmDialog');$('#confirmTitle').textContent=title;$('#confirmText').textContent=description;const done=v=>{d.close();resolve(v);};$('#confirmCancel').onclick=()=>done(false);$('#confirmYes').onclick=()=>done(true);d.oncancel=()=>resolve(false);d.showModal();});}
async function mutate(m){await rpc(m);await load();}
function download(name,body,type='application/json'){const b=new Blob([typeof body==='string'?body:JSON.stringify(body,null,2)],{type}),url=URL.createObjectURL(b),a=el('a',{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function chooseJSON(){return new Promise((resolve,reject)=>{const i=el('input',{type:'file',accept:'.json,application/json'});i.oncancel=()=>resolve(null);i.onchange=async()=>{try{const f=i.files[0];if(!f)return resolve(null);if(f.size>40*1024*1024)throw Error('Файл больше 40 МБ');resolve(JSON.parse(await f.text()));}catch(e){reject(e);}};i.click();});}
function setTheme(){applyPageAppearance(state.settings);$('#brand').textContent=state.settings.title;document.title=state.settings.title;}
const workspaceIds=()=>{const ids=[...new Set([...selected].map(k=>state.files[k]?.workspaceId).filter(Boolean))];const known=Object.keys(state.native?.accountPrices||{});return ids.length?ids:known.length===1?known:[];};
async function load(renderNow=true){const request=++loadSequence,data=await rpc({type:'get',tabId});if(request!==loadSequence)return;state=data.state;context=data.context;state.bytes=data.bytes;displayState=null;displayModels=new WeakMap();summaryState=null;summaryValue=null;nameStatsState=null;nameStats=null;if(state.settings.autoFollow&&lastActive!==context?.fileKey){lastActive=context?.fileKey||null;selected=new Set(lastActive?[lastActive]:[]);}selected=new Set([...selected].filter(k=>state.files[k]));setTheme();if(renderNow)render();}
function render(){document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});main.replaceChildren();if(view==='settings')renderSettings();else if(view==='catalog')renderCatalog();else if(view==='data'){renderData();appendNativeData();}else renderReport();}
const selectedRuns=()=>Object.values(state.runs).filter(r=>selected.has(fileKey(r)));
const summary=()=>{const selection=JSON.stringify([...selected].sort());if(summaryState!==state||summarySelection!==selection){summaryState=state;summarySelection=selection;summaryValue=summarize(selectedRuns(),state.rates,state.mappings,state.modelAssignments);}return summaryValue;};
const moneySettings=()=>effectiveMoneySettings(state.settings,workspaceIds(),state.native?.accountPrices||{});
function moneyBlock(value,maxValue=null){const m=value===null?{usd:null,rub:null}:money(value,moneySettings()),hi=maxValue===null?m:money(maxValue,moneySettings());return el('div',{class:'money'},el('div',{},el('span',{class:'label'},'USD'),el('strong',{},range(m.usd,hi.usd))),el('div',{},el('span',{class:'label'},'RUB'),el('strong',{},range(m.rub,hi.rub))));}
function renderReport(){
 const sum=summary(),total=reportTotal(sum),hero=el('section',{class:'hero'},el('div',{class:'label'},sum.estimateCount?'Оценка расхода · сохранённая история':sum.actualCount?'Фактические списания · доступная часть':'Расход · данных недостаточно'),el('div',{class:'total'},total===null?'—':(sum.estimateCount?'≈ ':'')+fmt(total),el('small',{},'кредитов')),moneyBlock(total));
 if(sum.estimateCount)hero.append(el('p',{class:'small muted'},'Средняя оценка по доступным тарифам. Источники и границы расчёта — в подробностях.'));
 if(sum.estimateCount&&!sum.actualCount)hero.append(el('p',{class:'small muted'},'Фактические списания и полнота истории не подтверждены.'));
 if(sum.excluded)hero.append(el('p',{class:'small muted'},'Технических запусков вне расходов: '+sum.excluded+'.'));
 if(sum.unknown)hero.append(el('p',{class:'warn small'},sum.unknown+' записей без оценки. Итог может быть выше.'));
 if(!sum.total)hero.append(el('p',{class:'muted small'},'Нет данных о запусках. Это не означает нулевой расход.'));
 const budgetKey=key(...[...selected].sort()),budget=state.budgets[budgetKey];if(budget!==undefined)hero.append(el('div',{class:'budget small'},'Бюджет '+fmt(budget)+' кр. · '+(sum.actual>budget?'превышен по факту':sum.actual+sum.estimateMax>budget?'может быть превышен с учётом оценки':'соблюдение не подтверждено: история неполная')));
 hero.append(el('p',{class:'small muted'},(moneySettings().creditSource||CREDIT_PLANS.find(p=>p.id===state.settings.creditPlan)?.name||'Своя цена кредита')+' · курс '+(state.settings.fxMode==='auto'?'ЦБ на '+state.settings.fxDate:'задан вручную')));
 main.append(hero);
 if(sum.unknown||sum.rows.some(r=>recentlyAssigned.has(fixKey(r))))main.append(unknownPanel(sum));
 if(sum.estimateCount)main.append(precisionPanel(sum));
 if(!sum.total&&!state.native?.lastSeen)main.append(note('Ожидаю данные Weavy. После обновления расширения перезагрузите страницу проекта. Встроенный адаптер распознаёт файлы, записи запусков и текущие цены.'));
 main.append(filePicker());
 const details=el('details',{class:'calculation-details'},el('summary',{},'Подробнее о расчёте'),el('div',{class:'metrics'},...[[sum.actualCount,'подтверждено списанием'],[sum.singleCount,'рассчитано одной суммой'],[sum.rangeCount,'только диапазон'],[sum.unknown,'без оценки']].map(([v,l])=>el('div',{class:'metric'},el('strong',{},String(v)),l))),el('div',{class:'progress'},el('i',{style:'width:'+(sum.total?(sum.actualCount+sum.singleCount)/sum.total*100:0)+'%'})),el('p',{class:'small muted'},'Записей: '+sum.total+' · нод: '+sum.nodes+'. Зелёная шкала не включает диапазоны. История: частичная, полнота не подтверждена. Последнее обновление: '+date(state.updatedAt)),el('p',{class:'small muted'},'10 000 кр. = '+fmt(moneySettings().usdPer10k)+' USD · 1 USD = '+fmt(state.settings.rubPerUsd,4)+' RUB. Округление только при отображении.'),el('p',{class:'small muted'},'Деньги — эквивалент по выбранной цене кредита и текущему курсу, не история платежей. Списания учитываются только по операциям debit со стабильным ID; предварительная цена в итог не входит.'));
 if(state.native?.lastSeen)details.append(el('p',{class:'small muted'},'Weavy: распознано '+Object.keys(state.files).length+' файлов и '+Object.keys(state.runs).length+' записей генераций. Доступные старые результаты оцениваются автоматически; неизвестные параметры цены дают диапазон.'));
 if(selected.size===1&&context)details.append(btn('Связать с текущей страницей',async()=>{if(await ask('Связать файл с открытой страницей?',`Подтвердите, что ${state.files[[...selected][0]].name} сейчас открыт в Weavy. Это сохранит ссылку для кнопки «Показать в Weavy».`))await mutate({type:'bind',tabId,fileKey:[...selected][0]});}));
 main.append(details);
 const controls=el('section',{class:'report-controls','aria-label':'Вид и поиск генераций'}),tabs=el('div',{class:'tabs',role:'group','aria-label':'Группировка генераций'});for(const [id,label]of [['models','По моделям'],['nodes','По нодам'],['runs','По запускам']]){const b=btn(label,()=>{group=id;render();},group===id?'active':'');b.setAttribute('aria-pressed',String(group===id));tabs.append(b);}controls.append(tabs);main.append(controls);
 const search=input('filter',filter,'search',{placeholder:'Модель, нода или ID запуска', 'aria-label':'Поиск запусков'});search.oninput=()=>{filter=search.value;drawRows(sum);};
 const check=el('input',{type:'checkbox',checked:onlyUnknown});check.onchange=()=>{onlyUnknown=check.checked;drawRows(sum);};const sorting=sortControl(rowsSort,v=>{rowsSort=v;drawRows(sum);});controls.append(el('div',{class:'toolbar'},search,sorting),el('label',{class:'check small'},check,'Только без точного расчёта'));
 if(nodeModel)main.append(actions(el('span',{class:'pill'},nodeModel),btn('Сбросить модель',()=>{nodeModel='';render();})));
 if(sum.unknown)main.append(actions(btn('← Предыдущая без оценки',()=>nextUnknown(-1)),btn('Следующая без оценки →',()=>nextUnknown(1))));
 main.append(el('div',{id:'rows'}));drawRows(sum);
 main.append(el('details',{},el('summary',{},'Экспорт, снимок и бюджет'),actions(btn('Скачать проверку расчёта',exportPricingAudit),btn('Копировать сводку',copySummary),btn('CSV',()=>download('weavy-credits-report.csv',csv(sum.rows),'text/csv;charset=utf-8')),btn('JSON',()=>download('weavy-credits-runs.json',{schema:1,runs:selectedRuns()})),btn('Снимок расчёта',()=>download('weavy-credits-snapshot.json',{schema:1,type:'report-snapshot',createdAt:new Date().toISOString(),files:[...selected].map(k=>state.files[k]),settings:state.settings,effectiveMoney:moneySettings(),catalogVersion:CATALOG_VERSION,rates:state.rates,mappings:state.mappings,modelAssignments:state.modelAssignments,summary:sum,coverage:'partial'}))),budgetEditor(budget)));
}
function unknownPanel(sum){
 const groups=new Map();for(const r of sum.rows){const k=fixKey(r);if(!needsModel(r)&&!recentlyAssigned.has(k))continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
 const unknown=sum.rows.filter(r=>r.cost.kind==='unknown'),missing=unknown.filter(needsModel).length,box=el('section',{class:'card model-fixes'},el('h3',{},groups.size?missing?'Уточните модель · '+missing+' без тарифа':'Модели уточнены':'Без оценки · '+unknown.length));
 if(groups.size)box.append(el('p',{class:'small muted'},'Выбор сохраняется сразу. Под полем указано, к каким генерациям он применяется.'));
 const list=el('div',{class:'model-fix-list'}),count=el('p',{class:'small muted'}),draw=()=>{list.replaceChildren();
 const matches=[...groups].filter(([k,rr])=>[k,...rr.flatMap(r=>[r.nodeName,sourceModelName(r),modelOf(r),state.files[fileKey(r)]?.name])].join(' ').toLowerCase().includes(fixesSearch.toLowerCase())).sort((a,b)=>(sourceModelName(a[1][0])||a[0]).localeCompare(sourceModelName(b[1][0])||b[0],'ru',{numeric:true,sensitivity:'base'}));
 for(const [k,rr]of matches.slice(0,6)){const r=rr[0],scope=groupScope(r),picked=modelAssignment(r,state.modelAssignments),pending=rr.filter(x=>x.cost.kind==='unknown').length,nodes=new Set(rr.map(x=>key(x.workspaceId,x.fileId,x.nodeId||x.runId))).size;
  const card=el('div',{class:'model-fix','data-model-target':k},el('div',{class:'rowtop'},el('strong',{class:'rowtitle'},sourceModelName(r)||r.nodeId||'Генерация'),el('span',{class:'badge '+(pending?'warn':'')},pending?'Без оценки: '+pending:'Пересчитано')),
   el('p',{class:'small muted'},'Нод: '+nodes+' · генераций: '+rr.length));
  if(!picked)card.append(el('p',{class:'small muted'},'Распознано: '+(r.model||r.native?.estimateModel||r.native?.modelHint||'модель не определена')));
  const hint=r.native?.estimateModel||r.native?.modelHint;if(hint&&hint!==sourceModelName(r))card.append(el('p',{class:'small muted'},'Модель ноды: '+hint));
  card.append(inlineModel(r,scope,'fixes'));
  if(picked){const estimated=rr.filter(x=>x.cost.kind==='estimate'),actual=rr.filter(x=>x.cost.kind==='actual');card.append(el('p',{class:'small '+(pending?'warn':'muted')},pending?'Модель сохранена. '+(rr.find(x=>x.cost.kind==='unknown').cost.reason||'Для расчёта ещё нужны данные запуска'):estimated.length?'Оценка: '+fmt(estimated.reduce((n,x)=>n+centralCredits(x.cost),0))+' кр.':'Сумма подтверждена списанием'));if(actual.length)card.append(el('p',{class:'small muted'},'Подтверждено списанием: '+fmt(actual.reduce((n,x)=>n+x.cost.credits,0))+' кр.'));}
  list.append(card);
 }
 count.textContent=matches.length>6?'Показано 6 из '+matches.length+' названий. Найдите нужное через поиск.':!matches.length&&groups.size?'Совпадений нет. Измените запрос.':'';
 };if(groups.size>6||fixesSearch){const search=input('fixesSearch',fixesSearch,'search',{placeholder:'Найти модель, ноду или файл','aria-label':'Поиск неподсчитанных моделей'});search.oninput=()=>{fixesSearch=search.value;draw();};box.append(search);}draw();box.append(list,count);
 const other=unknown.filter(r=>!needsModel(r));if(other.length)box.append(el('details',{},el('summary',{},other.length+' без оценки по другим причинам'),...[...new Set(other.map(r=>r.cost.reason||'Недостаточно данных'))].map(why=>el('p',{class:'small muted'},why))));
 return box;
}
function needsModel(r){
 if(r.cost.kind!=='unknown'||r.eventConflict||r.snapshotConflict||r.parameters.pricingConflict||r.events?.some(e=>e.kind==='refund')||r.native?.refundedAt||!['completed','succeeded','success'].includes(r.status.toLowerCase()))return false;
 const model=canonicalModelName(modelOf(r));return r.cost.code==='model-conflict'||(!catalogEntry(model)||catalogEntry(model).kind==='unknown')&&!state.rates.some(t=>modelIdentity(canonicalModelName(t.model))===modelIdentity(model));
}
let modelChoicesState=null,modelChoicesCache=[];
function modelChoices(){
 if(modelChoicesState===state)return modelChoicesCache;
 const choices=new Map(availableModels(state).map(e=>[modelValue(e),{name:e.name,model:modelValue(e),category:e.category,searchTerms:e.category==='llm'?['Any LLM','AnyLLM','Large Language Model','Текстовая модель']:[],hasTariff:e.kind!=='unknown',aliases:[...(e.aliases||[])],hint:e.kind==='formula'?'Цена по параметрам':e.min==null?(e.category==='llm'?'LLM · ':'')+'Тариф Weavy не получен'+(e.quoteMin!=null?' · текущий ориентир '+range(e.quoteMin,e.quoteMax)+' кр.':''):range(e.min,e.max)+' кр. / результат'}]));
 for(const t of state.rates){const model=canonicalModelName(t.model),old=choices.get(model);if(old){old.aliases.push(t.model,t.label);old.hint='Мой тариф / каталог';}else choices.set(model,{name:t.label===t.model?model:t.label+' · '+model,model,aliases:[t.model,t.label],hint:'Мой тариф: '+fmt(t.rate)+' кр. / '+unitLabel(t.unit)});}
 modelChoicesState=state;modelChoicesCache=[...choices.values()].sort((a,b)=>compareModelNames(a.name,b.name));return modelChoicesCache;
}
function inlineModel(r,scope='run',area='rows'){
 const k=modelAssignmentKey(r,scope),picked=modelAssignment(r,state.modelAssignments),value=state.modelAssignments?.[k]||(picked?.scope===scope?picked.model:''),detected=canonicalModelName(modelOf(r)),picker=modelPicker({entries:modelChoices(),value,fallbackValue:!needsModel(r)?detected:'',suggestionHints:modelSuggestionHints(r),suggestedFor:!r.model?r.native?.outputs?.find(o=>o.model)?.model||sourceModelName(r):sourceModelName(r),
  label:scope==='name'?'Модель для всех «'+sourceModelName(r)+'»':scope==='node'?'Модель для этих генераций ноды':'Модель этой генерации',
  onSelect:async target=>{const sequence=++assignmentSequence,top=picker.getBoundingClientRect?.().top;busy++;try{await rpc({type:'assignModel',key:runKey(r),scope,target});recentlyAssigned.add(k);deferredRefresh=false;await load(false);if(sequence!==assignmentSequence)return;render();const next=[...document.querySelectorAll('.model-picker')].find(n=>n.dataset.assignmentKey===k&&n.dataset.pickerArea===area);next?.focusField?.();if(next&&Number.isFinite(top)&&typeof window.scrollBy==='function'){const current=next.getBoundingClientRect().top;window.scrollBy({top:current-top,behavior:'instant'});}}finally{busy--; }},
  onClose:()=>{if(deferredRefresh&&!busy){deferredRefresh=false;load().catch(e=>toast(e.message));}}
 });picker.dataset.assignmentKey=k;picker.dataset.pickerArea=area;
 const shared=scope==='name'?sharedNameStats().get(k):null;
 const control=picker.querySelector('input'),scopeId=control.id+'-scope';control.setAttribute('aria-describedby',control.id+'-status '+scopeId);
 picker.append(el('p',{id:scopeId,class:'small muted model-scope'},scope==='name'?'Во всех сохранённых файлах · нод: '+(shared?.nodes.size||0)+' · включая новые генерации':scope==='node'?'Эта нода и исходная модель в данном файле':'Только эта генерация'));
 if(picked&&(!value||picked.scope!==scope))picker.append(el('p',{class:'small muted'},'Для этой генерации: '+modelOf(r)+' · '+({name:'общее уточнение названия',node:'уточнение ноды',run:'отдельное уточнение генерации'}[picked.scope])));
 return picker;
}
function executionDetails(r){
 const c=executionCheck(r,state.rates,state.mappings,state.modelAssignments);
 return el('details',{},el('summary',{},'Проверка расчёта · '+({Confirmed:'подтверждено',Calculated:'расчёт по тарифу',Estimated:'оценка',Unknown:'неизвестно'}[c.status]||c.status)),
  ...['Запуск: '+(c.executionFound?'найден':'не найден'),'Нода: '+(c.nodeFound?'найдена':'не загружена'),
   'Модель в истории: '+(c.historicalModel||'не указана'),'Модель ноды для оценки: '+(c.nodeModel||'не определена'),
   ...(c.assignedModel?['Выбрано вами: '+c.assignedModel+' · '+({name:'для всех с этим названием',node:'для этой ноды',run:'для этой генерации'}[c.assignmentScope])]:[]),
   'Тариф: '+(c.tariffFound?'найден':'не найден'),'Результатов: '+(c.resultCount??'неизвестно'),
   ...(r.cost?.kind==='estimate'&&r.cost.maxCredits>r.cost.credits?['Границы оценки: '+range(r.cost.credits,r.cost.maxCredits)+' кр. · на экране показана середина']:[])].map(t=>el('p',{class:'small muted'},t)));
}
const needsPrecision=c=>c.kind==='unknown'||c.kind==='estimate'&&(c.maxCredits??c.credits)!==c.credits;
function precisionPanel(sum){
 const box=el('details',{class:'card precision'},el('summary',{},'Из чего складывается сумма'));
 if(sum.actualCount)box.append(el('p',{class:'small'},'Подтверждено списаниями: '+fmt(sum.actual)+' кр.'));
 box.append(el('p',{class:'small muted'},'Для диапазонов показана середина. Это ориентир, а не статистически наиболее вероятное значение.'));
 box.append(el('div',{class:'rowtop'},el('span',{},'Расчёт одной суммой · '+sum.singleCount+' записей'),el('strong',{},'≈ '+fmt(sum.singleEstimate)+' кр.')));
 if(sum.rangeCount)box.append(el('div',{class:'rowtop warn'},el('span',{},'Требуют уточнения · '+sum.rangeCount+' записей'),el('strong',{},range(sum.rangeMin,sum.rangeMax)+' кр.')));
 box.append(el('p',{class:'small muted'},'Одна сумма по тарифу — ещё не подтверждённое списание. Источник и сохранённые параметры доступны в каждой записи.'));
 if(sum.rangeCount){
  const groups=new Map();for(const r of sum.rows.filter(r=>needsPrecision(r.cost))){const model=modelOf(r);if(!groups.has(model))groups.set(model,{n:0,spread:0,reasons:new Set()});const g=groups.get(model);g.n++;g.spread+=(r.cost.maxCredits??0)-(r.cost.credits??0);g.reasons.add(r.cost.gap||r.cost.reason||'Не хватает данных');}
  for(const [model,g]of [...groups].sort((a,b)=>b[1].spread-a[1].spread).slice(0,10))box.append(el('div',{class:'precision-row'},el('strong',{},model),el('p',{class:'small'},g.n+' записей · разброс '+fmt(g.spread)+' кр.'),el('p',{class:'small muted'},[...g.reasons].join('; '))));
  box.append(actions(btn('Показать, что уточнить',()=>{onlyUnknown=true;nodeModel='';filter='';group='runs';render();}),btn('Скачать проверку расчёта',exportPricingAudit)));
 }
 return box;
}
function exportPricingAudit(){const runs=selected.size?selectedRuns():Object.values(state.runs);download('weavy-credits-pricing-audit.json',pricingAudit(runs,state.rates,state.mappings,moneySettings(),state.modelAssignments));toast('Сохранены модели, параметры и расчёт. Идентификаторы заменены; названия проектов, промпты и медиа не включены.');}
function filePicker(){const expanded=filesExpanded??!selected.size,box=el('details',{class:'section file-picker',...(expanded?{open:''}:{})},el('summary',{},'Файлы',el('span',{class:'file-selection-count'},selected.size+' из '+Object.keys(state.files).length)));box.addEventListener('toggle',()=>filesExpanded=box.open);const search=input('fileSearch',fileSearch,'search',{placeholder:'Найти файл', 'aria-label':'Поиск файлов'});const list=el('div',{class:'files'});
 const draw=()=>{list.replaceChildren();const files=Object.entries(state.files).filter(([k,f])=>(f.name+' '+f.fileId).toLowerCase().includes(fileSearch.toLowerCase()));for(const [k,f]of files){const c=el('input',{type:'checkbox',checked:selected.has(k)});c.onchange=()=>{if(c.checked)selected.add(k);else selected.delete(k);render();};list.append(el('label',{class:'file'},c,el('span',{},f.name||f.fileId,el('small',{},(context?.fileKey===k?'Открыт сейчас · ':'')+f.workspaceId))));}if(!files.length)list.append(el('p',{class:'muted small'},'Файлы появятся после получения истории запусков.'));};search.oninput=()=>{fileSearch=search.value;draw();};draw();box.append(search,list,actions(btn('Только этот файл',()=>{selected=new Set(context?.fileKey?[context.fileKey]:[]);if(!context?.fileKey)toast('Открытый файл пока не определён. Дождитесь подключения или свяжите импортированный файл с текущей страницей.');render();}),btn('Сбросить выбор',()=>{selected.clear();render();}),btn('Сохранить набор',()=>saveSet())));
 if(state.sets.length){const select=el('select',{'aria-label':'Сохранённые наборы'},el('option',{value:''},'Сохранённые наборы…'),...state.sets.map(s=>el('option',{value:s.id},s.name)));select.onchange=()=>{const s=state.sets.find(s=>s.id===select.value);if(s){selected=new Set(s.files);render();}};box.append(select);}return box;}
function saveSet(){if(!selected.size)return toast('Сначала выберите файлы.');const d=$('#rateDialog');$('#rateBody').replaceChildren(el('h3',{},'Сохранить набор'));const name=input('setname','Набор файлов');$('#rateBody').append(field('Название набора',name),btn('Сохранить',async()=>{await mutate({type:'set',name:name.value,files:[...selected]});d.close();},'primary'));d.showModal();}
function budgetEditor(value){const i=input('budget',value,'number',{min:0,step:'any',placeholder:'Не задан'});return el('div',{},field('Бюджет выбранных файлов, кредиты',i),btn('Сохранить бюджет',()=>mutate({type:'budget',files:[...selected],amount:i.value===''?null:Number(i.value)})));}
function sortControl(value,change,options=[['unresolved','Сначала без тарифа'],['name','Название · А–Я'],['name-desc','Название · Я–А'],['amount','Сначала дороже'],['date','Сначала новые']]){
 const s=el('select',{'aria-label':'Сортировка'},...options.map(([v,t])=>el('option',{value:v},t)));s.value=value;s.onchange=()=>change(s.value);return s;
}
function compareRows(a,b){
 if(rowsSort==='unresolved')return Number(needsModel(b)||recentlyAssigned.has(fixKey(b)))-Number(needsModel(a)||recentlyAssigned.has(fixKey(a)))||Number(needsPrecision(b.cost))-Number(needsPrecision(a.cost));
 if(rowsSort==='amount')return (centralCredits(b.cost)??-1)-(centralCredits(a.cost)??-1);
 if(rowsSort==='date')return (b.createdAt||'').localeCompare(a.createdAt||'');
 return (rowsSort==='name-desc'?-1:1)*modelOf(a).localeCompare(modelOf(b),'ru',{numeric:true,sensitivity:'base'});
}
function renderCatalog(){
 main.append(el('h2',{},'🏷️ Тарифы моделей'),el('p',{class:'small muted catalog-help'},'Цены генераций в кредитах. Уточнить модель неподсчитанной ноды можно прямо в отчёте.'),actions(btn('Добавить тариф',()=>openCustom(''),'primary'),btn('Импорт каталога',importCatalog)));
 const search=input('catalogBrowse',catalogSearch,'search',{placeholder:'Название модели или алиас: GPT, Nano Banana, Kling…','aria-label':'Поиск тарифов'});
 const filters=el('select',{'aria-label':'Источник тарифа'},...[[ 'all','Все источники'],['official-help','Справка Weavy'],['reference-only','Предоставленный каталог'],['llm','Текстовые модели (LLM)'],['weavy-observed','Из Weavy'],['custom','Мои тарифы']].map(([v,t])=>el('option',{value:v},t)));filters.value=catalogFilter;
 const sorting=sortControl(catalogSort,v=>{catalogSort=v;draw();},[['name','Название · А–Я'],['name-desc','Название · Я–А'],['price','Цена · дешевле'],['price-desc','Цена · дороже']]);
 const count=el('p',{class:'catalog-count'}),list=el('div',{class:'catalog-list'});
 const draw=(keepScroll=false)=>{
  catalogSearch=search.value;catalogFilter=filters.value;const q=catalogSearch.trim().toLowerCase();
  const pageKey=JSON.stringify([q,catalogFilter,catalogSort]),top=keepScroll===true?list.scrollTop:0;if(pageKey!==catalogPageKey){catalogPageKey=pageKey;catalogPageLimit=150;}
  const entries=[...availableModels(state).map(e=>({...e,custom:false})),...state.rates.map(r=>({name:r.label||r.model,model:r.model,min:r.rate,max:r.rate,priceText:fmt(r.rate)+' / '+unitLabel(r.unit),custom:true,rate:r,provenance:'custom',aliases:[r.model]}))]
   .filter(e=>(catalogFilter==='all'||catalogFilter==='llm'&&e.category==='llm'||e.provenance===catalogFilter||catalogFilter==='official-help'&&e.provenance?.startsWith('official-help'))&&((e.name+' '+(e.aliases||[]).join(' ')+(e.category==='llm'?' Any LLM AnyLLM Large Language Model Текстовая модель':'')).toLowerCase().includes(q)||modelIdentity(e.name+' '+(e.aliases||[]).join(' ')+(e.category==='llm'?' Any LLM AnyLLM Large Language Model Текстовая модель':'')).includes(modelIdentity(q))))
   .sort((a,b)=>catalogSort==='price'||catalogSort==='price-desc'?(catalogSort==='price-desc'?-1:1)*((a.min??Infinity)-(b.min??Infinity)):(catalogSort==='name-desc'?-1:1)*a.name.localeCompare(b.name,'ru',{numeric:true,sensitivity:'base'}));
  count.textContent='Найдено '+entries.length+' · доступно '+availableModels(state).length+' моделей и вариантов';list.replaceChildren();
  for(const e of entries.slice(0,catalogPageLimit))list.append(el('article',{class:'row catalog-item'},el('div',{},el('h3',{},e.name),el('div',{class:'catalog-meta'},el('span',{class:'badge'},e.custom?'Мой тариф':e.provenance?.startsWith('official-help')?'Справка Weavy':e.category==='llm'?'LLM':e.provenance==='weavy-observed'?'Из Weavy':'Каталог'),e.custom?unitLabel(e.rate.unit):e.kind==='unknown'?'Нужен тариф Weavy':e.kind==='formula'?'Формула по параметрам':e.min!==e.max?'Зависит от параметров':'За результат')),el('div',{},el('div',{class:'catalog-price'},e.custom?e.priceText+' кр.':e.kind==='unknown'?'Цена не получена':e.min==null?'По формуле':range(e.min,e.max)+' кр.'),actions(btn('✏️ Изменить',()=>openCustom(e.model||e.name,e.custom?e.rate:null)),...(!e.custom?[btn('Правила',()=>openRate(modelValue(e)))]:[])))));
  if(entries.length>catalogPageLimit)list.append(btn('Показать ещё '+Math.min(150,entries.length-catalogPageLimit),()=>{catalogPageLimit+=150;draw(true);},'load-more'));if(!entries.length)list.append(note('Ничего не найдено. Измените запрос или источник.'));list.scrollTop=top;
 };
 search.oninput=draw;filters.onchange=draw;main.append(el('div',{class:'toolbar'},search,sorting),filters,count,list,el('details',{},el('summary',{},'📦 Импорт и экспорт'),actions(btn('Экспорт своих тарифов',()=>download('weavy-credits-rates.json',{schema:1,rates:state.rates})),btn('Скачать встроенный каталог',()=>download('weavy-credits-catalog.json',{version:CATALOG_VERSION,entries:catalogEntries()})))),el('p',{class:'small muted'},'Цена в Weavy может зависеть от разрешения, длительности и других параметров. Каталог — источник расчёта, не подтверждение списания.'));draw();
}
function costLabel(c){return c.kind==='actual'?fmt(c.credits)+' кр.':c.kind==='estimate'?'≈ '+fmt(centralCredits(c))+' кр.':'Без оценки';}
function drawRows(sum){
 const out=$('#rows');if(!out)return;out.replaceChildren();
 const pageKey=JSON.stringify([group,filter,onlyUnknown,nodeModel,rowsSort,[...selected].sort()]),pageSize=group==='runs'?250:150;if(pageKey!==rowPageKey){rowPageKey=pageKey;rowPageLimit=pageSize;}
 const more=count=>btn('Показать ещё '+Math.min(pageSize,count-rowPageLimit),()=>{const top=window.scrollY;rowPageLimit+=pageSize;drawRows(sum);if(Number.isFinite(top))window.scrollTo?.({top,behavior:'instant'});},'load-more');
 const rows=sum.rows.filter(r=>(!onlyUnknown||needsPrecision(r.cost))&&(!nodeModel||modelOf(r)===nodeModel)&&[modelOf(r),r.model,r.nodeName,r.nodeId,r.runId].join(' ').toLowerCase().includes(filter.toLowerCase())).sort(compareRows);
 if(!rows.length){out.append(el('div',{class:'empty'},el('strong',{},'Запусков пока нет'),selected.size?'Измените фильтр или загрузите историю.':'Выберите файлы для отчёта.'));return;}
 if(group==='runs'){
  for(const r of rows.slice(0,rowPageLimit)){
   const box=el('article',{class:'row'+(needsModel(r)?' needs-model':'')},el('div',{class:'rowtop'},el('span',{class:'rowtitle'},r.nodeName||r.nodeId||'Нода неизвестна'),el('span',{class:'amount'},costLabel(r.cost))),
    el('p',{class:'small muted'},modelOf(r)+' · '+date(r.createdAt)),el('span',{class:'badge'},r.native?.savedHistory?'Сохранённый результат · '+r.status:r.status),
    el('p',{class:'small '+(r.cost.kind==='unknown'?'warn':'muted')},r.cost.gap||r.cost.reason||((r.cost.kind==='actual'?'Источник списания: ':'Источник тарифа: ')+r.cost.source)));
   if(r.cost.kind!=='actual')box.append(inlineModel(r,'run'));
   box.append(actions(btn('Показать в Weavy',()=>showRun(r))),el('details',{},el('summary',{},'Параметры запуска'),el('pre',{},JSON.stringify({runId:r.runId,nodeId:r.nodeId,model:r.model,modelAssignment:r.modelAssignment,provider:r.provider,version:r.version,parameters:r.parameters,results:r.resultCount,previewCredits:r.previewCredits,events:r.events,native:r.native},null,2))),executionDetails(r));
   out.append(box);
  }
  if(rows.length>rowPageLimit)out.append(more(rows.length));return;
 }
 const groups=new Map();for(const r of rows){const k=group==='models'?modelOf(r):key(r.workspaceId,r.fileId,r.nodeId||r.runId);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
 const title=([k,rr])=>group==='models'?k:rr[0].nodeName||rr[0].nodeId||'Нода неизвестна';
 const stats=new Map();for(const [k,rr]of groups){const a=[],e=[],u=[];let amount=0,latest='',priority=0,estimateMax=0,estimateCentral=0;for(const r of rr){amount+=centralCredits(r.cost)??0;if(r.createdAt>latest)latest=r.createdAt;if(needsModel(r)||recentlyAssigned.has(fixKey(r)))priority=2;else if(needsPrecision(r.cost))priority=Math.max(priority,1);if(r.cost.kind==='actual')a.push(r);else if(r.cost.kind==='estimate'){e.push(r);estimateMax+=r.cost.maxCredits??r.cost.credits;estimateCentral+=centralCredits(r.cost);}else u.push(r);}stats.set(k,{a,e,u,amount,latest,priority,estimateMax,estimateCentral});}
 const sorted=[...groups].sort((a,b)=>{const aa=stats.get(a[0]),bb=stats.get(b[0]);return rowsSort==='unresolved'?bb.priority-aa.priority||compareModelNames(title(a),title(b)):rowsSort==='amount'?bb.amount-aa.amount:rowsSort==='date'?bb.latest.localeCompare(aa.latest):(rowsSort==='name-desc'?-1:1)*compareModelNames(title(a),title(b));});
 for(const item of sorted.slice(0,rowPageLimit)){const [k,rr]=item,{a,e,u,estimateMax,estimateCentral}=stats.get(k);
  const box=el('article',{class:'row'+(rr.some(needsModel)?' needs-model':'')},el('div',{class:'rowtop'},el('span',{class:'rowtitle'},title(item)),el('span',{class:'amount'},a.length||e.length?(e.length?'≈ ':'')+fmt(a.reduce((n,r)=>n+r.cost.credits,0)+estimateCentral)+' кр.':'Без оценки')),
   el('p',{class:'small muted'},rr.length+' записей'+(u.length?' · '+u.length+' без оценки':'')+(a.length&&e.length?' · включает факт и оценку':'')));
  if(group==='nodes')box.append(el('p',{class:'small muted'},[...new Set(rr.map(modelOf))].join(' · ')));
  const edits=new Map();for(const r of rr)if(r.cost.kind!=='actual'&&(needsModel(r)||modelAssignment(r,state.modelAssignments)))edits.set(fixKey(r),r);
  for(const r of edits.values()){if(group==='models')box.append(el('p',{class:'small'},sourceModelName(r)));box.append(inlineModel(r,groupScope(r)));}
  for(const why of [...new Set(u.map(r=>r.cost.reason))].filter(Boolean).slice(0,3))box.append(el('p',{class:'small warn'},why));
  box.append(actions(group==='models'?btn('Показать ноды',()=>{nodeModel=modelOf(rr[0]);group='nodes';render();}):btn('Показать в Weavy',()=>showRun(u[0]||rr[0]))));out.append(box);
 }
 if(sorted.length>rowPageLimit)out.append(more(sorted.length));
}
async function showRun(r){const result=await rpc({type:'find',key:runKey(r)});toast(result.message);}
async function nextUnknown(delta){const rows=summary().rows.filter(r=>r.cost.kind==='unknown');if(!rows.length)return;unknownIndex=(unknownIndex+delta+rows.length)%rows.length;await showRun(rows[unknownIndex]);}
async function copySummary(){const s=summary(),total=reportTotal(s),names=[...selected].map(k=>state.files[k].name).join(', '),m=total===null?{usd:null,rub:null}:money(total,moneySettings());await navigator.clipboard.writeText(`${state.settings.title}\nФайлы: ${names||'не выбраны'}\n${s.estimateCount?'Средняя оценка':'Подтверждённый расход'}: ${total===null?'нет данных':fmt(total)} кр. (${fmt(m.usd)} USD / ${fmt(m.rub)} RUB)\nПодтверждено списанием: ${s.actualCount}; по тарифам: ${s.estimateCount}; из них с диапазоном: ${s.rangeCount}.\nПокрытие: ${s.actualCount+s.estimateCount}/${s.total}, без оценки: ${s.unknown}. История частичная.\nДля диапазонов взята середина; точное списание не подтверждено.\n10 000 кр. = ${fmt(moneySettings().usdPer10k)} USD. 1 USD = ${fmt(state.settings.rubPerUsd,4)} RUB.\nОбновлено: ${date(state.updatedAt)}`);toast('Сводка скопирована.');}
function renderSettings(){
 const form=el('form',{class:'settings-form section',id:'general-settings'}),s=state.settings;
 main.append(el('nav',{class:'settings-links','aria-label':'Разделы настроек'},...[['general-settings','Основное'],['dock-appearance','Оформление панели'],['page-appearance','Оформление страницы'],['backup-settings','Резервная копия']].map(([id,label])=>el('a',{href:'#'+id},label))));
 form.append(el('h2',{},'⚙️ Основные настройки'),field('Название расширения',input('title',s.title,'text',{maxlength:48})),el('div',{class:'grid2'},field('Размер текста, px',input('fontSize',s.fontSize,'number',{min:12,max:22}))),moneyControls(s),
 el('h3',{class:'section'},'Плавающая панель'),field('Масштаб панели',input('panelScale',s.panelScale,'number',{min:.6,max:1.5,step:.05})));
 for(const [k,label]of [['dock','Показывать панель в Weavy'],['showCredits','Кредиты'],['showUsd','USD'],['showRub','RUB'],['autoFollow','Следовать за открытым файлом'],['showPreview','Показывать доступную предварительную цену']])form.append(el('label',{class:'check'},el('input',{type:'checkbox',name:k,checked:s[k]}),label));
 form.append(el('p',{class:'small muted'},'Цена возле запуска появляется только если Weavy явно включает её в подпись той же кнопки. Поддержка реального интерфейса пока не подтверждена.'),el('button',{type:'submit',class:'primary'},'Сохранить настройки'));
 form.onsubmit=async e=>{e.preventDefault();const d=new FormData(form),settings={};for(const [k,v]of d)settings[k]=v;for(const k of ['usdPer10k','rubPerUsd','fontSize','panelScale'])settings[k]=d.get(k)===''?null:Number(d.get(k));for(const k of ['dock','showCredits','showUsd','showRub','autoFollow','showPreview'])settings[k]=d.has(k);try{await mutate({type:'settings',settings});toast('Настройки сохранены.');}catch(e){toast(e.message);}};
 main.append(form,...appearanceSections(s,{el,btn,field,input,actions,save:async value=>{await rpc({type:'settings',settings:{appearance:value}});state.settings.appearance=value;}}),actions(btn('Отменить изменение',()=>mutate({type:'undo'})),btn('Повторить',()=>mutate({type:'redo'}))),el('h3',{class:'section',id:'backup-settings'},'Резервная копия'),actions(btn('Сохранить резервную копию',()=>download('weavy-credits-backup.json',state)),btn('Восстановить из JSON',restore)),btn('Сбросить положение панели',()=>mutate({type:'settings',settings:{position:null,dock:true}})),el('h3',{class:'section'},'Каталог тарифов'),actions(btn('Добавить тариф',()=>openRate('')),btn('Импорт каталога',importCatalog),btn('Экспорт своих тарифов',()=>download('weavy-credits-rates.json',{schema:1,rates:state.rates})),btn('Скачать встроенный каталог',()=>download('weavy-credits-catalog.json',{version:CATALOG_VERSION,entries:catalogEntries()}))));
 for(const r of [...state.rates].sort((a,b)=>a.label.localeCompare(b.label,'ru',{numeric:true})))main.append(el('div',{class:'row'},el('div',{class:'rowtitle'},r.label),el('p',{class:'small muted'},r.model+' · '+fmt(r.rate)+' кр. / '+unitLabel(r.unit)+' · с '+date(r.validFrom)),actions(btn('Изменить',()=>openCustom(r.model,r)),btn('Удалить',async()=>{await mutate({type:'deleteRate',id:r.id});toast('Тариф удалён. Можно отменить изменение.');}))));
 if(!state.rates.length)main.append(note('Встроенный каталог: '+catalogEntries().length+' моделей. Своих тарифов пока нет.'));}
async function restore(){const backup=await chooseJSON();if(!backup)return;if(await ask('Восстановить резервную копию?','Запуски будут объединены по ID без дублей. Настройки, каталог тарифов и адаптеры заменятся данными из копии; изменения настроек можно отменить.')){await mutate({type:'restore',backup,replaceSettings:true});toast('Копия восстановлена. Запуски объединены.');}}
async function importCatalog(){const v=await chooseJSON();if(v){if(v.entries&&!v.rates)throw Error('Встроенный каталог уже установлен. Для импорта своих тарифов нужен экспорт с полем rates.');await mutate({type:'catalog',rates:Array.isArray(v)?v:v.rates});toast('Каталог добавлен. Существующие тарифы сохранены.');}}
const unitLabel=u=>({run:'запуск',result:'результат',second:'секунда',inputTokens:'входные токены',outputTokens:'выходные токены',inputCount:'входные материалы'}[u]||u);
function openRate(model){
 const d=$('#rateDialog'),body=$('#rateBody');body.replaceChildren(el('h3',{},'Взять тариф из каталога'));
 const modelInput=input('model',model||'','text',{placeholder:'Точное название модели'});
 const search=input('catalogSearch','','search',{placeholder:'Поиск: Seedream, Nano Banana, Kling…'});
 $('#dialog-title').textContent='Тариф модели';const entries=[...availableModels(state)].sort((a,b)=>a.name.localeCompare(b.name,'ru',{numeric:true})),custom=[...new Set(state.rates.map(r=>r.model))].filter(n=>!entries.some(e=>e.name===n));
 const select=el('select',{name:'catalogModel','aria-label':'Модель в каталоге'}),info=el('div',{class:'card small'});
 const label=e=>e.kind==='formula'?e.name+' · формула':e.name+(e.provenance==='reference-only'?' · не перепроверено':'')+' · '+(e.min==null?'цена не подтверждена':range(e.min,e.max)+' кр.');
 const details=()=>{info.replaceChildren();const e=availableModels(state).find(e=>modelValue(e)===select.value);if(!e){info.append('Ваши ручные тарифы применяются по дате и параметрам.');return;}
  info.append(el('strong',{},e.name),el('p',{},e.kind==='unknown'?'Модель распознана. Введите подтверждённый тариф Weavy; цены API других сервисов здесь не применяются.':e.priceText+' кредитов · условия из источника'),el('p',{class:'muted'},e.provenance?.startsWith('official-help')?'Справка Weavy · опубликовано '+e.publishedAt+' · проверено '+e.checkedAt:e.provenance==='model-directory'?'Справочник названий LLM; наличие и цена в Weavy не подтверждены':e.provenance==='weavy-observed'?'Модель из наблюдаемых данных Weavy':'Предыдущий каталог: цена не перепроверена на Weavy'));
  if(e.parameterRules)info.append(el('p',{class:'muted'},'Дополнительные правила по параметрам: '+e.parameterRules.source+' · '+e.parameterRules.sourceDate+'. Это расчётное правило, не подтверждение списания.'),el('div',{class:'tariff-rules'},...e.parameterRules.options.map(o=>el('div',{},Object.entries(o.when).map(([k,v])=>k+': '+v).join(' · ')+' → '+o.credits+' кр.'))));
  if(e.options)info.append(el('div',{class:'tariff-rules'},...e.options.map(o=>el('div',{},Object.entries(o.when||{}).map(([k,v])=>k+': '+v).join(' · ')+' → '+o.credits+' кр.'))));
  if(e.source?.startsWith('https://'))info.append(el('a',{href:e.source,target:'_blank',rel:'noreferrer'},'Открыть источник'));
  if(e.previousPrice)info.append(el('p',{class:'warn'},'Справка и предоставленные подробные правила различаются. Подробное правило применяется только внутри опубликованного диапазона. Если старые цены противоречат справке, остаётся диапазон и причина расхождения.'));
 };
 const fill=()=>{const prev=select.value||state.mappings[model]||historicalModel({model})||model||'';const q=search.value.toLowerCase();const filtered=entries.filter(e=>(e.name+' '+e.aliases.join(' ')).toLowerCase().includes(q));select.replaceChildren(el('option',{value:''},'Выберите модель каталога'),...filtered.map(e=>el('option',{value:modelValue(e)},label(e))),...custom.filter(n=>n.toLowerCase().includes(q)).map(n=>el('option',{value:n},n+' · свой тариф')));select.value=prev;details();};
 search.oninput=fill;select.onchange=details;fill();
 body.append(field('Модель в вашем отчёте',modelInput),field('Поиск в каталоге · '+entries.length+' моделей и вариантов',search),field('Модель в каталоге',select),info,
  el('p',{class:'small muted'},'Выбранное правило используется для оценки. Сохранённые параметры определяют вариант цены; если их не хватает, будет диапазон.'),
  btn('Использовать тарифы этой модели',async()=>{if(!modelInput.value||!select.value)throw Error('Выберите модель каталога');await mutate({type:'mapping',model:modelInput.value,target:select.value});d.close();},'primary'),
  actions(btn('✏️ Изменить цену этой модели',()=>openCustom(modelInput.value||select.value)),...(state.mappings[model]?[btn('Вернуть автоопределение',async()=>{await mutate({type:'mapping',model,target:null});d.close();})]:[])),el('hr'),btn('Создать свой тариф',()=>openCustom(modelInput.value||select.value)),actions(btn('Импортировать каталог JSON',async()=>{await importCatalog();openRate(modelInput.value);})));
 if(!d.open)d.showModal();
}
function moneyControls(s){
 const box=el('section',{},el('h3',{},'💱 Цена кредита и курс'));
 const plan=el('select',{name:'creditPlan'},...CREDIT_PLANS.map(p=>el('option',{value:p.id},planName(p.id)+(p.id==='auto'?' · данные аккаунта':p.id==='custom'?' · ваш пакет':p.id==='starter'?' · $10 / 1 000 кр.':' · $10 / 1 200 кр.'))));plan.value=s.creditPlan||'custom';
 const usd=input('usdPer10k',s.usdPer10k,'number',{min:0,step:'any'}),rub=input('rubPerUsd',s.rubPerUsd,'number',{min:0,step:'any'});
 const fx=el('select',{name:'fxMode'},el('option',{value:'auto'},'Курс ЦБ · автоматически'),el('option',{value:'manual'},'Мой курс'));fx.value=s.fxMode||'manual';
 const packagePrice=input('packagePrice',10,'number',{min:0,step:'any'}),packageCredits=input('packageCredits',s.creditPlan==='starter'?1000:1200,'number',{min:1,step:1});
 const noteBox=el('p',{class:'small muted'}),preview=el('div',{class:'money-result','aria-live':'polite'});
 const info=()=>{
  const draft={...s,creditPlan:plan.value,usdPer10k:usd.value===''?null:Number(usd.value),rubPerUsd:rub.value===''?null:Number(rub.value)};
  const effective=effectiveMoneySettings(draft,workspaceIds(),state.native?.accountPrices||{}),detected=moneyPlan(draft,workspaceIds(),state.native?.accountPrices||{}),price=effective.usdPer10k;
  noteBox.textContent=plan.value==='auto'?detected.source+(detected.detected?' · '+planName(detected.detected):' · название плана не подтверждено'):plan.value==='custom'?'Укажите цену пакета и число кредитов — пересчёт выполнится автоматически.':'Цена пополнения '+planName(plan.value)+'. Кредиты подписки могут иметь другую стоимость.';
  packagePrice.disabled=packageCredits.disabled=plan.value!=='custom';
  preview.replaceChildren(el('strong',{},price==null?'Денежная цена не определена':'1 000 кр. = '+fmt(price/10)+' USD'+(draft.rubPerUsd!=null?' / '+fmt(price/10*draft.rubPerUsd)+' RUB':'')),el('p',{class:'small muted'},'Цена кредита: '+(price==null?'—':fmt(price/10000,6)+' USD')+'. Изменение тарифа не меняет расход в кредитах.'));
 };
 plan.onchange=()=>{const p=CREDIT_PLANS.find(p=>p.id===plan.value);if(p?.usdPer10k!=null)usd.value=p.usdPer10k;packageCredits.value=plan.value==='starter'?1000:1200;info();};
 usd.oninput=()=>{plan.value='custom';info();};rub.oninput=()=>{fx.value='manual';info();};fx.onchange=info;
 const calculate=()=>{if(packagePrice.value!==''&&Number(packageCredits.value)>0){usd.value=Number(packagePrice.value)/Number(packageCredits.value)*10000;plan.value='custom';info();}};
 packagePrice.oninput=packageCredits.oninput=calculate;info();
 box.append(field('Тариф Weavy',plan),noteBox,el('div',{class:'grid2'},field('Цена вашего пакета, USD',packagePrice),field('Кредитов в пакете',packageCredits)),preview,
  el('details',{},el('summary',{},'Точная цена за 10 000 кредитов'),field('Цена 10 000 кредитов, USD',usd)),
  el('div',{class:'grid2'},field('Курс USD/RUB',fx),field('1 USD = … RUB',rub)),
  el('p',{class:'small muted'},'Курс ЦБ на '+(s.fxDate||'неизвестную дату')+'. При ошибке обновления остаётся последний полученный курс.'),
  btn('Обновить курс ЦБ',async()=>{await rpc({type:'refreshFx'});await load(false);rub.value=state.settings.rubPerUsd;fx.value='auto';info();toast('Курс ЦБ обновлён.');}),
  el('p',{class:'small muted'},el('a',{href:PLAN_REFERENCE.source,target:'_blank',rel:'noreferrer'},'Официальные тарифы Weavy'),' · проверено '+PLAN_REFERENCE.checkedAt+'. Меняется цена расчёта в расширении, подписка Weavy остаётся прежней.'));
 return box;
}
function openCustom(model,old=null){
 const d=$('#rateDialog'),body=$('#rateBody'),today=new Date().toISOString().slice(0,16),builtin=catalogEntry(model)||availableModels(state).find(e=>modelValue(e)===model);$('#dialog-title').textContent=old?'✏️ Изменить цену модели':'✏️ Своя цена модели';body.replaceChildren();
 const form=el('form'),units=el('select',{name:'unit'},...['result','run','second','inputTokens','outputTokens','inputCount'].map(u=>el('option',{value:u},unitLabel(u))));units.value=old?.unit||(builtin&&builtin.category!=='llm'?'result':'run');
 const modelInput=input('model',old?.model||model,'text',{required:''}),rate=input('rate',old?.rate??(builtin?.min===builtin?.max?builtin?.min:null),'number',{min:0,step:'any',required:''}),label=input('label',old?.label||model,'text',{placeholder:'Название тарифа в списке'});
 form.append(el('p',{class:'small muted'},'Эта цена заменит расчёт по каталогу для подходящих запусков. Фактические списания останутся прежними.'),field('Модель',modelInput),el('div',{class:'grid2'},field('Цена, кредиты',rate),field('За что списывается',units)));
 const resolution=input('resolution',old?.conditions?.resolution||'','text',{placeholder:'Любое · либо 1080p, 2K…'}),quality=el('select',{name:'quality'},el('option',{value:''},'Любое качество'),...['low','medium','high'].map(q=>el('option',{value:q},{low:'Low · низкое',medium:'Medium · среднее',high:'High · высокое'}[q])));quality.value=old?.conditions?.quality||'';
 form.append(el('details',{},el('summary',{},'🎛️ Только для определённых параметров'),el('div',{class:'grid2'},field('Разрешение',resolution),field('Качество',quality))));
 const since=input('validFrom',(old?.validFrom||today).slice(0,16),'datetime-local',{required:''}),until=input('validTo',old?.validTo?.slice(0,16)||'','datetime-local');
 const missing=Object.values(state.runs).filter(r=>modelOf(r)===model&&!r.createdAt).length;
 const undated=el('input',{type:'checkbox',name:'allowUndated',checked:!!old?.allowUndated});
 const scope=el('details',missing?{open:''}:{},el('summary',{},'📅 К каким запускам применить'),field('Действует с (UTC)',since),field('До, не включая (UTC)',until),el('label',{class:'check'},undated,'Оценивать также сохранённые результаты без даты'),missing?el('p',{class:'small warn'},missing+' результатов без даты. Для них эта цена будет только оценкой.'):null,
 btn('Использовать для загруженной истории',()=>{const dates=Object.values(state.runs).filter(r=>modelOf(r)===model&&r.createdAt).map(r=>r.createdAt).sort();if(dates[0])since.value=dates[0].slice(0,16);undated.checked=missing>0;toast('Проверьте, что указанная цена подходила в выбранный период.');}));form.append(scope);
 const source=input('source',old?.source||'Цена в интерфейсе Weavy, проверено '+new Date().toISOString().slice(0,10),'text',{required:''});
 const advanced=el('details',{},el('summary',{},'Дополнительные правила'),field('Название тарифа',label),el('div',{class:'grid2'},field('Поставщик',input('provider',old?.provider)),field('Версия',input('version',old?.version))),field('Источник цены / ссылка',source),el('div',{class:'grid2'},field('Фиксированная часть, кр.',input('base',old?.base??0,'number',{min:0,step:'any'})),field('Минимальная цена, кр.',input('minimum',old?.minimum??0,'number',{min:0,step:'any'})),field('Шаг округления',input('step',old?.step??1,'number',{min:.000001,step:'any'})),field('За сколько единиц цена',input('divisor',old?.divisor??1,'number',{min:.000001,step:'any'}))));
 const conditions=el('textarea',{name:'conditions'});conditions.value=JSON.stringify(old?.conditions||{},null,2);
 const components=el('textarea',{name:'components'});components.value=JSON.stringify(old?.components||[],null,2);
 const multiply=el('select',{name:'multiplyBy'},el('option',{value:''},'Без умножения'),el('option',{value:'resultCount'},'Число результатов'),el('option',{value:'count'},'Параметр count'),el('option',{value:'inputCount'},'Число входов'));multiply.value=old?.multiplyBy||'';
 advanced.append(field('Умножать переменную часть на',multiply),field('Дополнительные компоненты (JSON)',components),field('Остальные условия (JSON)',conditions));form.append(advanced);
 const sample=el('p',{class:'money-result','aria-live':'polite'}),preview=()=>{const amount=Number(rate.value);sample.textContent=rate.value===''?'Введите цену':units.value==='result'?'Пример: 3 результата → '+fmt(amount*3)+' кр.':units.value==='second'?'Пример: 5 секунд → '+fmt(amount*5)+' кр.':fmt(amount)+' кр. / '+unitLabel(units.value);};rate.oninput=units.onchange=preview;preview();form.append(sample,el('div',{class:'dialog-footer'},btn('Отмена',()=>d.close()),el('button',{type:'submit',class:'primary'},'💾 Сохранить тариф')));
 form.onsubmit=async e=>{e.preventDefault();try{const f=new FormData(form),cond=JSON.parse(f.get('conditions')||'{}');if(resolution.value.trim())cond.resolution=resolution.value.trim();else delete cond.resolution;if(quality.value)cond.quality=quality.value;else delete cond.quality;
  const r={id:old?.id||crypto.randomUUID(),label:f.get('label')||f.get('model'),model:f.get('model').trim(),provider:f.get('provider'),version:f.get('version'),unit:f.get('unit'),rate:Number(f.get('rate')),base:Number(f.get('base')),minimum:Number(f.get('minimum')),step:Number(f.get('step')),divisor:Number(f.get('divisor')),validFrom:f.get('validFrom')+':00.000Z',validTo:f.get('validTo')?f.get('validTo')+':00.000Z':null,source:f.get('source'),checkedAt:new Date().toISOString(),conditions:cond,allowUndated:undated.checked,multiplyBy:f.get('multiplyBy')||null,components:JSON.parse(f.get('components')||'[]')};cleanRate(r);await mutate({type:'rate',rate:r});d.close();toast('Тариф сохранён. Подходящие запуски пересчитаны.');
 }catch(e){toast(e.message);}};body.append(form);if(!d.open)d.showModal();
}
function renderData(){const copy=diagnosticsCopy({getDiagnostics:()=>rpc({type:'diagnostics'}),download});main.append(el('h2',{},'Подключение и история'),note('Версия '+VERSION+'. Подключены сохранённые результаты, nodeRuns и автоматическая тарифная оценка. Для полного расхода за всё время ещё нужен источник сумм списаний и полной истории. Баланс и текущий прайс не считаются старыми расходами.'),el('div',{class:'card'},el('h3',{},'Безопасная диагностика'),el('p',{class:'small muted'},'Содержит схемы разных элементов списков, статусы и параметры примеров запусков, текущие цены моделей и шаблоны путей запросов. ID в примерах заменены. Названия проектов, авторизация, промпты и ссылки на медиа не включаются. Перед отправкой можно просмотреть скачанный JSON.'),el('p',{class:'small'},'Получено схем: '+state.diagnostics.length+' · запусков: '+Object.keys(state.runs).length),actions(copy.button,btn('Скачать диагностику',async()=>download('weavy-credits-diagnostics.json',await rpc({type:'diagnostics'}))),btn('Обновить',()=>load()),btn('Очистить диагностику',()=>mutate({type:'clearDiagnostics'}))),copy.status,el('p',{class:'small muted'},'Откройте свой файл Weavy, обновите страницу и просмотрите существующую историю. Запускать платную генерацию не требуется. Затем нажмите «Копировать диагностику» и вставьте её в сообщение — Ctrl+V.')),
 el('h3',{class:'section'},'Импорт запусков'),el('p',{class:'small muted'},'Принимается нормализованный JSON с постоянными workspaceId, fileId и runId. Формат описан в DATA-FORMAT.md в архиве. Неизвестные CSV не импортируются с догадками.'),actions(btn('Импорт JSON',async()=>{const v=await chooseJSON();if(!v)return;const runs=Array.isArray(v)?v:Array.isArray(v.runs)?v.runs:Object.values(v.runs||{});if(!runs.length)throw Error('В файле нет массива запусков');await mutate({type:'importRuns',runs});toast('Запуски импортированы: '+runs.length+'. Выберите файл в отчёте.');}),btn('Полная резервная копия',()=>download('weavy-credits-backup.json',state))),el('p',{class:'small muted'},'Для сверки с Weave: Settings → Workspace Settings → Credits → Download Credits Usage History. Импорт формата этой выгрузки требует реального образца; одинаковые расходы нельзя складывать повторно без стабильных ID.'),
 el('details',{},el('summary',{},'Адаптеры данных — дополнительно'),el('p',{class:'small muted'},'Встроенный адаптер распознаёт подтверждённую структуру recipeRuns/nodeRuns без ручной настройки. Дополнительные JSON-адаптеры могут подключить другие проверенные источники.'),actions(btn('Импорт адаптера JSON',async()=>{const p=await chooseJSON();if(!p)return;cleanProfile(p);if(await ask('Подключить адаптер?','Адаптер определяет, какие поля считать списаниями. Используйте конфигурацию, проверенную на ваших данных. После импорта обновите страницу Weavy.'))await mutate({type:'profile',profile:p});})),...state.profiles.map(p=>el('div',{class:'row'},el('strong',{},p.name||p.id),el('p',{class:'small muted'},p.evidence),btn(p.enabled?'Отключить':'Включить',()=>mutate({type:'profile',profile:{...p,enabled:!p.enabled}}))))),
 el('details',{},el('summary',{},'Состояние наблюдателя'),el('p',{class:'small muted'},'Размер данных: '+fmt(state.bytes/1024)+' КБ. Наблюдаются fetch и XMLHttpRequest JSON на доменах weavy.ai. WebSocket, SSE и ответы больше 32 МБ не обрабатываются. При чтении страницы распознаются доступные старые и новые записи; неизвестные страницы истории не запрашиваются.'),...state.diagnostics.map(d=>el('details',{},el('summary',{},d.signature+' · '+d.count),el('p',{class:'small muted'},date(d.seenAt)),el('pre',{},JSON.stringify(JSON.parse(d.schema),null,2))))));}
function appendNativeData(){if(!state.native)return;const n=state.native,quotes=Object.values(n.menuPrices||{});main.append(el('details',{},el('summary',{},'Что удалось загрузить'),el('p',{class:'small'},'Сохранённых результатов: '+Object.keys(n.saved||{}).length+' · подробных записей запуска: '+Object.keys(n.pending||{}).length+' · текущих тарифов: '+Object.keys(n.prices||{}).length),el('p',{class:'small muted'},'Сохранённые результаты позволяют оценить стоимость, но не подтверждают списания. Если подробных записей нет, их даты и суммы нельзя восстановить из пустых данных.')));main.append(el('h3',{class:'section'},'Текущие цены из Weavy'),note('Это текущий каталог, не история списаний. Цена может зависеть от параметров. Старые запуски по нему автоматически не пересчитываются.'));
 const qsearch=input('priceSearch','','search',{placeholder:'Найти модель в текущем каталоге','aria-label':'Поиск цены модели'}),list=el('div',{});const draw=()=>{list.replaceChildren();const rows=quotes.filter(q=>(q.name+' '+q.modelName).toLowerCase().includes(qsearch.value.toLowerCase()));for(const q of rows.slice(0,80)){list.append(el('div',{class:'row'},el('div',{class:'rowtop'},el('strong',{},q.name||q.modelName),el('span',{},fmt(q.price)+' кр.'+(q.isPerSecond===true?' / с':' — правило требует проверки'))),el('p',{class:'small muted'},'Получено '+date(q.observedAt)+(q.isByok?' · BYOK':'')),btn('Взять за основу тарифа',()=>openCustom(q.modelName||q.name,{model:q.modelName||q.name,rate:q.price,unit:q.isPerSecond===true?'second':'run',validFrom:q.observedAt,source:'Текущая цена menu.price из Weavy, '+q.observedAt+'; условия нужно сверить',conditions:{}}))));}if(!rows.length)list.append(el('p',{class:'small muted'},'Каталог меню пока не получен. Откройте список моделей в Weavy.'));if(rows.length>80)list.append(note('Показано 80 моделей. Уточните поиск.'));};qsearch.oninput=draw;draw();main.append(qsearch,list);
 const pending=Object.values(n.pending||{}),refs=Object.values(n.batches||{});main.append(el('details',{},el('summary',{},'Доступность старой истории'),el('p',{class:'small muted'},'Наблюдалось записей nodeRuns: '+pending.length+'. Ссылок на пакеты в файлах: '+refs.length+'. Полнота истории не подтверждена. Повторная загрузка той же записи не удваивает число запусков.'),el('p',{class:'small muted'},'Если в отчёте появились запуски, но кредиты остаются неизвестными, пришлите новую диагностику после просмотра старого результата или истории в Weavy. Она покажет поля, которые первая версия пропускала.')));
}
$('#theme').onclick=()=>{const light=!document.body.classList.contains('light');return mutate({type:'settings',settings:{theme:light?'light':'dark',appearance:{...state.settings.appearance,settingsBgColor:light?'#f4f4f4':'#1e1e1e',settingsPanelColor:light?'#ffffff':'#2b2b2b',settingsAccentColor:light?'#16161d':'#ffffff'}}}).catch(e=>toast(e.message));};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{view=b.dataset.view;render();};
let refreshTimer;
chrome.runtime.onMessage.addListener(m=>{if(m.type==='changed'||m.type==='context'&&m.tabId===tabId){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(busy||document.querySelector('.model-picker [aria-expanded=true]')){deferredRefresh=true;return;}load(view==='report').catch(e=>toast(e.message));},180);}if(m.type==='view'&&m.tabId===tabId){view=m.view==='settings'?'settings':'report';render();}});
async function start(){if(!tabId){const tabs=await chrome.tabs.query({active:true,currentWindow:true,url:'https://app.weavy.ai/*'});tabId=tabs[0]?.id||null;}if(tabId&&view!=='settings'){const saved=await chrome.storage.session.get('view:'+tabId);view=saved['view:'+tabId]||view;}if(!['report','catalog','settings','data'].includes(view))view='report';await load();}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>document.documentElement.style.setProperty('--topbar-height',entries[0].target.getBoundingClientRect().height+'px')).observe(document.querySelector('.topbar'));
start().catch(e=>{main.replaceChildren(note('Не удалось открыть данные: '+e.message));});
