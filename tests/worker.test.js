import {VERSION} from '../extension/version.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB} from 'fake-indexeddb';
import {runKey,fileKey,modelAssignmentKey,cost} from '../extension/core.js';
const handlers=[],session={},tabs=[{id:11,url:'https://app.weavy.ai/open-a'},{id:12,url:'https://app.weavy.ai/open-b'}];
globalThis.indexedDB=indexedDB;
globalThis.chrome={runtime:{id:'unit-extension',getURL:p=>'chrome-extension://unit-extension/'+p,onMessage:{addListener:f=>handlers.push(f)},sendMessage:async()=>{},onInstalled:{addListener:()=>{}}},storage:{session:{get:async k=>({[k]:session[k]}),set:async v=>Object.assign(session,v),remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete session[k];}}},tabs:{query:async()=>tabs,sendMessage:async()=>({found:false,message:'fixture'}),update:async()=>{},onRemoved:{addListener:()=>{}}},sidePanel:{setOptions:async()=>{},open:async()=>{},setPanelBehavior:async()=>{}},windows:{update:async()=>{}}};
await import('../extension/worker.js');
const ui={id:'unit-extension',url:'chrome-extension://unit-extension/panel.html'};
const page=id=>({id:'unit-extension',url:tabs.find(t=>t.id===id).url,tab:{id}});
const send=(m,sender=ui)=>new Promise(resolve=>{handlers[0](m,sender,resolve);});
const r=(over={})=>({workspaceId:'w',fileId:'f',runId:'r',nodeId:'n',model:'M',createdAt:'2026-09-22T00:00:00Z',status:'completed',events:[{id:'receipt',kind:'debit',credits:20}],...over});
test('worker serializes independent parallel settings updates',async()=>{await Promise.all([send({type:'settings',settings:{title:'Changed'}}),send({type:'settings',settings:{rubPerUsd:85}})]);const s=(await send({type:'get'})).state;assert.equal(s.settings.title,'Changed');assert.equal(s.settings.rubPerUsd,85);});
test('worker imports are idempotent across simultaneous updates',async()=>{const out=await Promise.all([send({type:'importRuns',runs:[r()]}),send({type:'importRuns',runs:[r()]}),send({type:'importRuns',runs:[r({runId:'r2',events:[{id:'receipt2',kind:'debit',credits:30}]})]})]);assert.ok(out.every(x=>x.ok));assert.equal(Object.keys((await send({type:'get'})).state.runs).length,2);});
test('validation errors cannot partly commit import',async()=>{const before=(await send({type:'get'})).state;const response=await send({type:'importRuns',runs:[r({runId:'good-before-error'}),{invalid:true}]});assert.ok(response.error);assert.deepEqual((await send({type:'get'})).state.runs,before.runs);});
test('page bridge cannot change rates, models, settings or restore backups',async()=>{for(const type of ['settings','rate','assignModel','restore','importRuns','get'])assert.ok((await send({type},page(11))).error);});
test('non-Weavy or foreign-extension sender rejected',async()=>{assert.ok((await send({type:'get'},{id:'other',url:ui.url})).error);assert.ok((await send({type:'capture'},{...page(11),url:'https://evil.example/'})).error);});
test('page needs explicitly enabled profile before ingestion',async()=>{assert.ok((await send({type:'capture',profileId:'missing',runs:[r()]},page(11))).error);});
test('route is scoped per tab and bound exact known URL',async()=>{await send({type:'route',url:'https://app.weavy.ai/open-a',title:'A'},page(11));await send({type:'route',url:'https://app.weavy.ai/open-b',title:'B'},page(12));await send({type:'bind',tabId:11,fileKey:fileKey(r())});assert.equal((await send({type:'get',tabId:11})).context.fileKey,fileKey(r()));assert.equal((await send({type:'get',tabId:12})).context.fileKey,null);await send({type:'route',url:'https://app.weavy.ai/open-b',title:'B'},page(11));assert.equal((await send({type:'get',tabId:11})).context.fileKey,null);});
test('undo does not roll back incoming run history',async()=>{await send({type:'settings',settings:{title:'UndoMe'}});await send({type:'importRuns',runs:[r({runId:'history-during-edit',events:[]})]});await send({type:'undo'});const s=(await send({type:'get'})).state;assert.notEqual(s.settings.title,'UndoMe');assert.ok(s.runs[runKey(r({runId:'history-during-edit'}))]);await send({type:'redo'});assert.equal((await send({type:'get'})).state.settings.title,'UndoMe');});
test('diagnostic retention is bounded',async()=>{for(let i=0;i<45;i++)await send({type:'capture',signature:'fetch:'+i.toString(16),transport:'fetch',shape:{id:'string'}},page(12));assert.equal((await send({type:'get'})).state.diagnostics.length,40);});

test('worker re-sanitizes untrusted diagnostic messages',async()=>{await send({type:'capture',signature:'PRIVATE URL',transport:'SECRET',shape:{cost:123,prompt:'SECRET PROMPT',model:'private-model',id:'string'}},page(12));const d=(await send({type:'get'})).state.diagnostics.at(-1);const text=JSON.stringify(d);assert.ok(!text.includes('SECRET'));assert.ok(!text.includes('private-model'));assert.ok(!text.includes('PRIVATE URL'));assert.ok(text.includes('<redacted>'));});
test('native projection ingestion works without a manually installed profile and is deduplicated',async()=>{const native={files:[{workspaceId:'native-w',fileId:'native-f',name:'Native file',full:true}],nodes:[],runs:[{recipeId:'native-f',recipeRunId:'parent',nodeRunId:'nr',nodeId:'nn',status:'completed',createdAt:'2026-09-01T00:00:00Z',updatedAt:'2026-09-01T00:01:00Z',parameters:{count:2},resultCount:2}]};for(let i=0;i<2;i++)assert.equal((await send({type:'capture',native,pageUrl:'https://app.weavy.ai/native-f'},page(11))).error,undefined);const s=(await send({type:'get'})).state;const runs=Object.values(s.runs).filter(r=>r.source==='weavy-native:2026-09-22');assert.equal(runs.length,1);assert.equal(runs[0].events.length,0);assert.equal(runs[0].resultCount,2);});
test('new diagnostic export provides anonymized native samples and no project titles',async()=>{const d=await send({type:'diagnostics'});assert.equal(d.version,VERSION);assert.equal(d.native.runSamples.length,1);assert.ok(!JSON.stringify(d).includes('Native file'));assert.ok(!JSON.stringify(d).includes('native-f'));});
test('manual currency settings persist and changing only a number selects manual mode',async()=>{
 await send({type:'settings',settings:{creditPlan:'starter',fxMode:'auto'}});
 await send({type:'settings',settings:{usdPer10k:74,rubPerUsd:88}});
 const s=(await send({type:'get'})).state.settings;
 assert.equal(s.creditPlan,'custom');assert.equal(s.fxMode,'manual');assert.equal(s.usdPer10k,74);assert.equal(s.rubPerUsd,88);
});
test('failed FX refresh keeps last rate; successful refresh updates date and retains other settings',async()=>{
 const oldFetch=globalThis.fetch,before=(await send({type:'get'})).state.settings;
 try{
  globalThis.fetch=async()=>({ok:false,status:503});assert.match((await send({type:'refreshFx'})).error,/503/);
  assert.deepEqual((await send({type:'get'})).state.settings,before);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const [y,m,d]=today.split('-');
  globalThis.fetch=async()=>({ok:true,text:async()=>`<ValCurs Date="${d}.${m}.${y}"><Valute><CharCode>USD</CharCode><Nominal>1</Nominal><Value>84,0954</Value></Valute></ValCurs>`});
  assert.equal((await send({type:'refreshFx'})).ok,true);
  const after=(await send({type:'get'})).state.settings;assert.equal(after.rubPerUsd,84.0954);assert.equal(after.fxDate,today);assert.equal(after.fxMode,'auto');assert.equal(after.usdPer10k,before.usdPer10k);
 }finally{globalThis.fetch=oldFetch;}
});
test('page cannot request FX refresh, but receives observed workspace conversion for dock',async()=>{
 assert.ok((await send({type:'refreshFx'},page(11))).error);
 await send({type:'capture',native:{accountPrice:{workspaceId:'native-w',creditsPerDollar:120}}},page(11));
 const hello=await send({type:'hello'},page(11));assert.equal(hello.accountPrices['native-w'].creditsPerDollar,120);
});
test('inline model assignment persists, is returned to the dock and undo does not erase received history',async()=>{
 const unknown=r({runId:'inline-unknown',nodeId:'inline-node',model:null,events:[],resultCount:1,native:{savedHistory:true,modelHint:'Imported'}});
 await send({type:'importRuns',runs:[unknown]});assert.equal((await send({type:'assignModel',key:runKey(unknown),scope:'node',target:'Recraft V3'})).ok,true);
 let s=(await send({type:'get'})).state;assert.equal(s.modelAssignments[modelAssignmentKey(unknown,'node')],'Recraft V3');assert.equal(cost(s.runs[runKey(unknown)],s.rates,s.mappings,s.modelAssignments).credits,5);
 assert.equal((await send({type:'hello'},page(11))).modelAssignments[modelAssignmentKey(unknown,'node')],'Recraft V3');
 const later={...unknown,runId:'inline-later'};await send({type:'importRuns',runs:[unknown,later]});await send({type:'undo'});s=(await send({type:'get'})).state;
 assert.equal(s.modelAssignments[modelAssignmentKey(unknown,'node')],undefined);assert.ok(s.runs[runKey(later)]);
 await send({type:'redo'});s=(await send({type:'get'})).state;assert.equal(cost(s.runs[runKey(later)],s.rates,s.mappings,s.modelAssignments).credits,5);
});
test('worker rejects invalid scopes and models without partly committing assignments',async()=>{
 const before=(await send({type:'get'})).state.modelAssignments;
 for(const change of [{key:'missing',scope:'node',target:'Recraft V3'},{key:'["w","inline-unknown"]',scope:'global',target:'Recraft V3'},{key:'["w","inline-unknown"]',scope:'run',target:'Made up model'}])assert.ok((await send({type:'assignModel',...change})).error);
 assert.deepEqual((await send({type:'get'})).state.modelAssignments,before);
});
test('restore retains scoped corrections and diagnostics preserve original historical model',async()=>{
 const backup=(await send({type:'get'})).state,unknown=backup.runs['["w","inline-unknown"]'];await send({type:'assignModel',key:runKey(unknown),scope:'node',target:null});
 assert.equal((await send({type:'restore',backup,replaceSettings:true})).ok,true);const s=(await send({type:'get'})).state;assert.deepEqual(s.modelAssignments,backup.modelAssignments);
 const report=(await send({type:'diagnostics'})).analysis.records.find(r=>r.modelAssignment?.model==='Recraft V3');assert.equal(report.model,null);assert.equal(report.check.assignedModel,'Recraft V3');assert.equal(report.cost.kind,'estimate');
});
test('one shared name choice replaces legacy per-node choices across files and workspaces',async()=>{
 const a=r({workspaceId:'group-w',fileId:'group-f',runId:'group-a',nodeId:'group-node-a',model:'Custom V5.0 Edit',events:[],resultCount:1}),b={...a,runId:'group-b',nodeId:'group-node-b',model:'Custom 5 Edit'},c={...a,workspaceId:'group-w2',fileId:'group-f2',runId:'group-c',nodeId:'group-node-c',model:'CUSTOM V5 EDIT'},other={...a,runId:'group-other',model:'Custom V5.1 Edit'};
 await send({type:'importRuns',runs:[a,b,c,other]});await send({type:'assignModel',key:runKey(a),scope:'node',target:'Recraft V3 SVG'});await send({type:'assignModel',key:runKey(b),scope:'run',target:'GPT Image 1 Edit'});
 assert.equal((await send({type:'assignModel',key:runKey(a),scope:'name',target:'Recraft V3'})).ok,true);
 let s=(await send({type:'get'})).state;assert.equal(s.modelAssignments[modelAssignmentKey(a,'node')],undefined);assert.equal(s.modelAssignments[modelAssignmentKey(a,'name')],'Recraft V3');
 assert.equal(cost(s.runs[runKey(a)],s.rates,s.mappings,s.modelAssignments).credits,5);assert.equal(cost(s.runs[runKey(c)],s.rates,s.mappings,s.modelAssignments).credits,5);assert.equal(cost(s.runs[runKey(b)],s.rates,s.mappings,s.modelAssignments).credits,8);assert.equal(cost(s.runs[runKey(other)],s.rates,s.mappings,s.modelAssignments).kind,'unknown');
 assert.equal((await send({type:'hello'},page(11))).modelAssignments[modelAssignmentKey(a,'name')],'Recraft V3');
 const later={...c,runId:'group-later',nodeId:'new-node',model:'Custom v5.0.0 edit'};await send({type:'importRuns',runs:[later]});s=(await send({type:'get'})).state;assert.equal(cost(s.runs[runKey(later)],s.rates,s.mappings,s.modelAssignments).credits,5);
 await send({type:'undo'});s=(await send({type:'get'})).state;assert.equal(s.modelAssignments[modelAssignmentKey(a,'node')],'Recraft V3 SVG');assert.equal(s.modelAssignments[modelAssignmentKey(a,'name')],undefined);assert.ok(s.runs[runKey(later)]);
 await send({type:'redo'});s=(await send({type:'get'})).state;assert.equal(s.modelAssignments[modelAssignmentKey(a,'name')],'Recraft V3');assert.equal(s.modelAssignments[modelAssignmentKey(a,'node')],undefined);
});
test('clearing a shared name does not delete later explicit generation or node exceptions',async()=>{
 const a=(await send({type:'get'})).state.runs['["group-w","group-a"]'];await send({type:'assignModel',key:runKey(a),scope:'node',target:'Recraft V3 SVG'});await send({type:'assignModel',key:runKey(a),scope:'name',target:null});
 const s=(await send({type:'get'})).state;assert.equal(s.modelAssignments[modelAssignmentKey(a,'name')],undefined);assert.equal(s.modelAssignments[modelAssignmentKey(a,'node')],'Recraft V3 SVG');assert.equal(s.modelAssignments[modelAssignmentKey({...a,runId:'group-b'})],'GPT Image 1 Edit');
});
test('page cannot hide the panel through the removed shortcut command',async()=>{assert.ok((await send({type:'hide'},page(11))).error);});
test('a shared choice preserves generation exceptions even without a node ID',async()=>{
 const a=r({workspaceId:'no-node',fileId:'no-node',runId:'a',nodeId:null,events:[],model:'Seedream V5 Edit',resultCount:1}),b={...a,runId:'b'};
 await send({type:'importRuns',runs:[a,b]});await send({type:'assignModel',key:runKey(a),scope:'run',target:'GPT Image 1 Edit'});await send({type:'assignModel',key:runKey(b),scope:'name',target:'Recraft V3'});
 const s=(await send({type:'get'})).state;assert.equal(cost(s.runs[runKey(a)],[],{},s.modelAssignments).credits,8);assert.equal(cost(s.runs[runKey(b)],[],{},s.modelAssignments).credits,5);
});
