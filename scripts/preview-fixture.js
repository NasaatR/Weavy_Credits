import {initial,addRuns,cleanSettings,modelAssignmentKey,pricingAudit} from '../extension/core.js';
import {VERSION} from '../extension/version.js';
const state=initial();
state.settings.fxMode='manual';
const params=new URLSearchParams(location.search);
if(params.has('font'))state.settings.fontSize=Number(params.get('font'));
if(params.get('theme')==='light'){
 state.settings.theme='light';
 Object.assign(state.settings.appearance,{settingsBgColor:'#f4f4f4',settingsPanelColor:'#ffffff',settingsAccentColor:'#16161d'});
}
if(params.has('width'))document.documentElement.style.maxWidth=params.get('width')+'px';
document.documentElement.style.margin='auto';
addRuns(state,[
 ...Array.from({length:5},(_,i)=>({runId:'missing-'+i,nodeId:'edit-'+i%2,nodeName:'Редактирование изображения',model:'Imported Seedream V5 Edit',status:'completed',resultCount:1})),
 {runId:'known',nodeId:'known',nodeName:'Seedream V5.0 Edit',model:'Seedream V5.0 Edit',resultCount:2,status:'completed'},
 {runId:'range',nodeId:'range',nodeName:'Обложка проекта — варианты с разным качеством',model:'ChatGPT Images 2.0 Edit',resultCount:1,status:'completed',native:{savedHistory:true,outputs:[]}},
 {runId:'conflict',nodeId:'conflict',model:'Seedream V5 Edit',resultCount:1,status:'completed',native:{outputs:[{id:'conflict-output',model:'GPT Image 1 Edit',parameters:{}}]}},
 {runId:'receipt',nodeId:'receipt',model:'Recraft V3',status:'completed',events:[{id:'test-receipt',kind:'debit',credits:100}]}
].map(r=>({workspaceId:'preview',fileId:'demo',fileName:'Демонстрационный проект',createdAt:'2026-09-22T12:30:00Z',...r})));
state.native={lastSeen:'2026-09-22T12:30:00Z'};
globalThis.chrome={runtime:{sendMessage:async m=>{
 if(m.type==='get')return {state:structuredClone(state),context:{fileKey:'["preview","demo"]'},bytes:JSON.stringify(state).length};
 if(m.type==='diagnostics')return {version:VERSION,createdAt:new Date().toISOString(),integration:'synthetic-preview',schemas:[],native:{previewOnly:true},analysis:pricingAudit(Object.values(state.runs),state.rates,state.mappings,state.settings,state.modelAssignments)};
 if(m.type==='settings'){state.settings=cleanSettings({...state.settings,...m.settings});return {ok:true};}
 if(m.type==='assignModel'){const k=modelAssignmentKey(state.runs[m.key],m.scope);if(m.target)state.modelAssignments[k]=m.target;else delete state.modelAssignments[k];return {ok:true};}
 if(m.type==='find')return {found:false,message:'Это искусственные данные предпросмотра.'};
 return {error:'В предпросмотре доступны отчёт, выбор модели и настройки оформления.'};
 },onMessage:{addListener(){}}},storage:{session:{get:async()=>({}),set:async()=>{}}},tabs:{query:async()=>[{id:1}]}};
await import('../extension/panel.js');
