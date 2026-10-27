import {availableModels,modelValue} from './model-list.js';
import {VERSION} from './version.js';
import {fetchCbrUsd} from './currency.js';
import {catalogEntry,canonicalModelName} from './pricing.js';
import {ingestNative,nativeDiagnostics,initNative,cleanEndpoint} from './native.js';
import {initial,migrate,pricingAudit,cleanRun,cleanRate,cleanProfile,cleanSettings,addRuns,fileKey,safeUrl,validateBackup,text,id,number,key,cleanShape,modelAssignmentKey,equivalentNameKeys,normalizedModelAssignmentKey} from './core.js';
let database,queue=Promise.resolve();
function db(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open('weavy-credits',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function read(){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('state'),r=t.objectStore('state').get('main');r.onsuccess=()=>{try{resolve(migrate(r.result));}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
async function write(s){s.updatedAt=new Date().toISOString();if(JSON.stringify(s).length>40*1024*1024)throw Error('Хранилище достигло защитного лимита 40 МБ. Экспортируйте резервную копию.');const d=await db();await new Promise((resolve,reject)=>{const t=d.transaction('state','readwrite');t.objectStore('state').put(s,'main');t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Запись отменена'));});chrome.runtime.sendMessage({type:'changed'}).catch(()=>{});const tabs=await chrome.tabs.query({url:'https://app.weavy.ai/*'});for(const tab of tabs)chrome.tabs.sendMessage(tab.id,{type:'changed'}).catch(()=>{});}
function undoSnapshot(s){return {settings:s.settings,rates:s.rates,mappings:s.mappings,modelAssignments:{...s.modelAssignments},profiles:s.profiles};}
function undoPoint(s){s.undo.push(undoSnapshot(s));s.undo=s.undo.slice(-20);s.redo=[];}
async function context(tabId){if(!Number.isInteger(tabId))return null;return (await chrome.storage.session.get('tab:'+tabId))['tab:'+tabId]||null;}
function trusted(sender){return !sender.tab&&sender.id===chrome.runtime.id&&sender.url?.startsWith(chrome.runtime.getURL(''));}
function fromWeavy(sender){try{return sender.tab&&sender.id===chrome.runtime.id&&new URL(sender.url).origin==='https://app.weavy.ai';}catch{return false;}}
const buckets=new Map();
function limit(tab){const now=Date.now(),b=buckets.get(tab)||{at:now,n:0};if(now-b.at>60000){b.at=now;b.n=0;}b.n++;buckets.set(tab,b);return b.n<=3000;}
async function route(m,sender){
 const page=fromWeavy(sender),ui=trusted(sender);if(!page&&!ui)throw Error('Источник сообщения не разрешён');
 const allowed=['hello','capture','open','route','findResult'];if(page&&!allowed.includes(m.type))throw Error('Сообщение страницы не разрешено');
 if(m.type==='hello'){const s=await read();return {settings:s.settings,profiles:s.profiles,runs:Object.values(s.runs),files:s.files,rates:s.rates,mappings:s.mappings,modelAssignments:s.modelAssignments,accountPrices:s.native?.accountPrices||{}};}
 if(m.type==='route'){
  const url=safeUrl(m.url);if(!url)throw Error('Некорректная страница');const s=await read(),matches=Object.entries(s.files).filter(([k,f])=>f.url===url);
  const c={url,title:text(m.title),fileKey:matches.length===1?matches[0][0]:null,seenAt:new Date().toISOString()};await chrome.storage.session.set({['tab:'+sender.tab.id]:c});
  await chrome.sidePanel.setOptions({tabId:sender.tab.id,path:'panel.html?tab='+sender.tab.id,enabled:true});chrome.runtime.sendMessage({type:'context',tabId:sender.tab.id,context:c}).catch(()=>{});return c;
 }
 if(m.type==='capture'){
  if(!limit(sender.tab.id)||JSON.stringify(m).length>700000)throw Error('Слишком большой поток данных');
  const s=await read();let count=0;
  if(m.native){const result=ingestNative(s,m.native,m.pageUrl);count=result.count;}

  if(Array.isArray(m.runs)&&m.runs.length){const p=s.profiles.find(p=>p.id===m.profileId&&p.enabled);if(!p)throw Error('Неактивный адаптер');count=addRuns(s,m.runs.slice(0,1000).map(r=>({...r,source:'adapter:'+p.id,events:(r.events||[]).map(e=>({...e,source:p.evidence}))})));}
  if(m.shape&&typeof m.shape==='object'){
   const signature=/^(fetch|xhr):[a-f0-9]{1,8}$/.test(m.signature)?m.signature:m.signature==='observer-started'?'observer-started':'unrecognized-schema';const old=s.diagnostics.find(x=>x.signature===signature);const d={signature,transport:['fetch','xhr','lifecycle'].includes(m.transport)?m.transport:'unknown',schema:JSON.stringify(cleanShape(m.shape)),endpoint:cleanEndpoint(m.endpoint),seenAt:new Date().toISOString(),count:(old?.count||0)+1,matched:count};s.diagnostics=s.diagnostics.filter(x=>x.signature!==signature);s.diagnostics.push(d);s.diagnostics=s.diagnostics.slice(-40);
  }
  await write(s);return {count};
 }
 if(m.type==='refreshFx'){const quote=await fetchCbrUsd();const s=await read();s.settings={...s.settings,rubPerUsd:quote.rate,fxMode:'auto',fxDate:quote.date,fxSource:quote.source};await write(s);return {ok:true};}
 if(m.type==='get'){const s=await read();const bytes=JSON.stringify(s).length;return {state:s,context:await context(m.tabId),bytes};}
 const s=await read();
 if(m.type==='diagnostics'){const analysis=pricingAudit(Object.values(s.runs),s.rates,s.mappings,s.settings,s.modelAssignments),focusModels=analysis.records.filter(r=>r.cost.kind==='unknown'||r.cost.min!==r.cost.max).flatMap(r=>[r.model,r.modelHint,...r.outputs.map(o=>o.model)]);return {version:VERSION,createdAt:new Date().toISOString(),integration:'saved-history-catalog-estimates',schemas:s.diagnostics,native:nativeDiagnostics(s,{focusModels}),analysis};}
 if(m.type==='settings'){undoPoint(s);const changes={...m.settings};if('usdPer10k' in changes&&!('creditPlan' in changes))changes.creditPlan='custom';if('rubPerUsd' in changes&&!('fxMode' in changes))changes.fxMode='manual';s.settings=cleanSettings({...s.settings,...changes});}
 else if(m.type==='position'){s.settings=cleanSettings({...s.settings,position:m.position});}
 else if(m.type==='rate'){undoPoint(s);const rate=cleanRate(m.rate);s.rates=s.rates.filter(x=>x.id!==rate.id);s.rates.push(rate);}
 else if(m.type==='catalog'){const rates=m.rates.map(cleanRate);if(new Set(rates.map(x=>x.id)).size!==rates.length)throw Error('Дубли ID тарифов');if(rates.some(x=>s.rates.some(t=>t.id===x.id)))throw Error('Есть совпадающие ID. Импорт не перезаписал ваши тарифы.');undoPoint(s);s.rates.push(...rates);}
 else if(m.type==='deleteRate'){undoPoint(s);s.rates=s.rates.filter(x=>x.id!==m.id);}
 else if(m.type==='mapping'){undoPoint(s);if(m.target)s.mappings[text(m.model)]=text(m.target);else delete s.mappings[text(m.model)];}
 else if(m.type==='assignModel'){
  const run=s.runs[m.key];if(!run)throw Error('Генерация не найдена');
  if(!['run','node','name'].includes(m.scope)||m.scope==='node'&&!run.nodeId)throw Error('Нет точного ID ноды для уточнения');
  const target=m.target===null?null:canonicalModelName(id(m.target));
  if(target&&!availableModels(s).some(e=>modelValue(e)===target)&&!s.rates.some(r=>canonicalModelName(r.model)===target))throw Error('Выберите модель из каталога или своего тарифа');
  const k=modelAssignmentKey(run,m.scope);if(!k)throw Error('Нет названия модели для общего уточнения');
  undoPoint(s);
  if(m.scope==='name')for(const oldKey of equivalentNameKeys(s.modelAssignments,run))delete s.modelAssignments[oldKey];
  if(m.scope==='name'&&target){const nodes=new Set(Object.values(s.runs).filter(r=>r.nodeId&&modelAssignmentKey(r,'name')===k).map(r=>modelAssignmentKey(r,'node')));for(const oldKey of Object.keys(s.modelAssignments))if(nodes.has(normalizedModelAssignmentKey(oldKey)))delete s.modelAssignments[oldKey];}
  if(target)s.modelAssignments[k]=target;else delete s.modelAssignments[k];
 }
 else if(m.type==='profile'){const p=cleanProfile(m.profile);undoPoint(s);s.profiles=s.profiles.filter(x=>x.id!==p.id);s.profiles.push(p);}
 else if(m.type==='importRuns'){addRuns(s,m.runs);}
 else if(m.type==='restore'){const incoming=validateBackup(m.backup);addRuns(s,Object.values(incoming.runs));s.files={...s.files,...incoming.files};undoPoint(s);s.modelAssignments=m.replaceSettings?incoming.modelAssignments:{...s.modelAssignments,...incoming.modelAssignments};if(m.replaceSettings){s.settings=incoming.settings;s.rates=incoming.rates;s.mappings=incoming.mappings;s.profiles=incoming.profiles;}s.sets=[...s.sets,...incoming.sets.filter(x=>!s.sets.some(y=>y.id===x.id))];s.budgets={...s.budgets,...incoming.budgets};if(m.backup.native){const n=m.backup.native;ingestNative(s,{files:[],nodes:Object.values(n.nodes||{}),runs:Object.values(n.pending||{}),saved:Object.values(n.saved||{}),prices:Object.values(n.prices||{}),menuPrices:Object.values(n.menuPrices||{}),batches:Object.values(n.batches||{}),modelShapes:n.modelShapes||[],accountPrices:Object.values(n.accountPrices||{})});}}
 else if(m.type==='undo'||m.type==='redo'){const from=m.type==='undo'?s.undo:s.redo,to=m.type==='undo'?s.redo:s.undo;if(from.length){to.push(undoSnapshot(s));Object.assign(s,from.pop());}}
 else if(m.type==='set'){s.sets.push({id:crypto.randomUUID(),name:text(m.name,60)||'Набор',files:m.files.filter(k=>s.files[k])});}
 else if(m.type==='budget'){const k=key(...m.files.sort());if(number(m.amount)===null)delete s.budgets[k];else s.budgets[k]=m.amount;}
 else if(m.type==='bind'){
  const c=await context(m.tabId);if(!c||!s.files[m.fileKey])throw Error('Откройте файл Weavy в исходной вкладке');s.files[m.fileKey].url=c.url;await chrome.storage.session.set({['tab:'+m.tabId]:{...c,fileKey:m.fileKey}});
 }
 else if(m.type==='find')return locate(s,m);
 else if(m.type==='clearDiagnostics'){s.diagnostics=[];}
 else throw Error('Неизвестная команда');
 await write(s);return {ok:true};
}
async function locate(s,m){const run=s.runs[m.key];if(!run)throw Error('Запуск не найден');const f=s.files[fileKey(run)];if(!f?.url)throw Error('Нет подтверждённой ссылки на файл. Выберите его и нажмите «Связать с текущей страницей» в деталях.');const tabs=await chrome.tabs.query({url:'https://app.weavy.ai/*'});let tab=tabs.find(t=>safeUrl(t.url)===f.url);if(!tab){tab=await chrome.tabs.create({url:f.url});await chrome.storage.session.set({['pending:'+tab.id]:{nodeId:run.nodeId,nodeName:run.nodeName,fileUrl:f.url}});return {found:false,message:'Файл открыт. Проверю точный ID ноды после загрузки. Если она не отрисована, используйте поиск Weavy. Нода: '+(run.nodeName||'без имени')+' · '+(run.nodeId||'нет ID')};}await chrome.tabs.update(tab.id,{active:true});await chrome.windows.update(tab.windowId,{focused:true});try{return await chrome.tabs.sendMessage(tab.id,{type:'find',nodeId:run.nodeId,nodeName:run.nodeName,fileUrl:f.url});}catch{return {found:false,message:'Файл открыт. Обновите его страницу для подключения расширения.'};}}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(!m||typeof m.type!=='string')return;
 if(m.type==='changed'||m.type==='context')return;
 if(m.type==='open'&&fromWeavy(sender)){
  // Keep the open call in the original user-gesture turn.
  const p=chrome.sidePanel.open({tabId:sender.tab.id});
  p.then(async()=>{const view=m.view==='settings'?'settings':'report';await chrome.storage.session.set({['view:'+sender.tab.id]:view});chrome.runtime.sendMessage({type:'view',tabId:sender.tab.id,view}).catch(()=>{});reply({ok:true});}).catch(e=>reply({error:e.message}));return true;
 }
 if(m.type==='pending'&&fromWeavy(sender)){chrome.storage.session.get('pending:'+sender.tab.id).then(async d=>{await chrome.storage.session.remove('pending:'+sender.tab.id);reply(d['pending:'+sender.tab.id]||null);});return true;}
 if(m.type==='position'&&fromWeavy(sender)){queue=queue.then(async()=>{const s=await read();s.settings=cleanSettings({...s.settings,position:m.position});await write(s);reply({ok:true});}).catch(e=>reply({error:e.message}));return true;}
 if(['get','hello'].includes(m.type)&&chrome.runtime.getManifest)maybeRefreshFx();
 queue=queue.then(()=>route(m,sender)).then(reply).catch(e=>reply({error:e.message||'Ошибка хранилища'}));return true;
});
chrome.runtime.onInstalled.addListener(()=>chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}));
chrome.tabs.onRemoved.addListener(id=>{buckets.delete(id);chrome.storage.session.remove(['tab:'+id,'pending:'+id,'view:'+id]);});

let fxPending=false,fxLastAttempt=0;
function maybeRefreshFx(){
 if(fxPending||Date.now()-fxLastAttempt<6*3600000)return;
 fxPending=true;fxLastAttempt=Date.now();
 read().then(async s=>{if(s.settings.fxMode!=='auto')return;const q=await fetchCbrUsd();queue=queue.then(async()=>{const current=await read();if(current.settings.fxMode!=='auto')return;if(current.settings.rubPerUsd===q.rate&&current.settings.fxDate===q.date)return;current.settings={...current.settings,rubPerUsd:q.rate,fxDate:q.date,fxSource:q.source};await write(current);});await queue;}).catch(()=>{}).finally(()=>{fxPending=false;});
}
