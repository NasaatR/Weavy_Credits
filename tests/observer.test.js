import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {initial,summarize} from '../extension/core.js';
import {ingestNative} from '../extension/native.js';
const source=fs.readFileSync(new URL('../extension/observer.js',import.meta.url),'utf8');
function harness(body){const messages=[],listeners={};const response=new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});Object.defineProperty(response,'url',{value:'https://app.weavy.ai/fixture-not-real'});const p=Promise.resolve(response);class XHR{open(){}send(){}};const win={fetch:()=>p,postMessage:m=>messages.push(m),addEventListener:(n,f)=>listeners[n]=f};const ctx=vm.createContext({window:win,location:{origin:'https://app.weavy.ai',href:'https://app.weavy.ai/fixture-page'},XMLHttpRequest:XHR,URL,TextDecoder,Uint8Array,console});vm.runInContext(source,ctx);const config=profiles=>listeners.message({source:win,origin:'https://app.weavy.ai',data:{channel:'weavy-credits-config-v1',profiles}});return {win,messages,p,config};}
const settle=()=>new Promise(r=>setTimeout(r,25));
test('observer preserves the original fetch promise and only exports field types by default',async()=>{const h=harness({id:'private-id',prompt:'TOP SECRET',authorization:'Bearer secret',media:'private.png',cost:150,nested:{model:'test'}});h.config([]);assert.equal(h.win.fetch('/fixture'),h.p);await settle();const payload=JSON.stringify(h.messages);assert.ok(payload.includes('number'));assert.ok(!payload.includes('TOP SECRET'));assert.ok(!payload.includes('private-id'));assert.ok(!payload.includes('Bearer'));assert.ok(!payload.includes('private.png'));assert.ok(!payload.includes('150'));});
test('early response is buffered before config without persisting raw values',async()=>{const h=harness({secret:'MUST NEVER EXPORT',id:'private'});h.win.fetch('/fixture');await settle();h.config([]);assert.ok(h.messages.some(x=>x.transport==='fetch'));assert.ok(!JSON.stringify(h.messages).includes('MUST NEVER EXPORT'));});
test('configured adapter emits allowlisted normalized run only',async()=>{const h=harness({w:'w',f:'f',r:'r',prompt:'SECRET',debit:40,receipt:'tx'});h.config([{id:'test',origin:'https://app.weavy.ai',pathPrefix:'/fixture',itemsPath:'',evidence:'test-only',enabled:true,fields:{workspaceId:'w',fileId:'f',runId:'r',debitId:'receipt',debitCredits:'debit'}}]);h.win.fetch('/fixture');await settle();const event=h.messages.find(x=>x.runs?.length);assert.equal(event.runs[0].events[0].credits,40);assert.ok(!JSON.stringify(h.messages).includes('SECRET'));});

test('native history response emits built-in projection without any custom profile',async()=>{const h=harness({recipeId:'f',batchId:'b',recipeRuns:[{id:'pr',startTime:'2026-09-01T00:00:00Z',nodeRuns:[{id:'nr',nodeId:'n',runId:'pr',status:'completed',input:{num_images:2,prompt:'TOP SECRET'},result:[{},{}]}]}]});h.config([]);h.win.fetch('/fixture');await settle();const p=h.messages.find(m=>m.native?.runs?.length);assert.equal(p.native.runs[0].nodeRunId,'nr');assert.equal(p.native.runs[0].resultCount,2);assert.ok(!JSON.stringify(h.messages).includes('TOP SECRET'));});
test('real file shape sends all saved results across chunks without leaking prompt or media',async()=>{
 const h=harness({id:'f',workspaceId:'w',name:'Test',edges:[],nodes:[{id:'n',isModel:true,data:{model:{name:'GPT Image 1 Edit'},generations:Array.from({length:250},(_,i)=>({batchId:'b'+i,order:0,kind:{id:'o'+i,url:'https://private/secret'},input:{quality:'high',prompt:'TOP SECRET'}}))}}]});
 h.config([]);h.win.fetch('/fixture');await settle();
 assert.equal(h.messages.reduce((s,m)=>s+(m.native?.saved?.length||0),0),250);
 assert.ok(!JSON.stringify(h.messages).includes('TOP SECRET'));assert.ok(!JSON.stringify(h.messages).includes('https://private'));
});
test('large nodeRun output arrays are split below the bridge size limit without losing runs',async()=>{
 const h=harness({recipeId:'f',batchId:'b',recipeRuns:[{id:'p',nodeRuns:Array.from({length:12},(_,n)=>({id:'r'+n,nodeId:'n'+n,status:'completed',result:Array.from({length:2500},(_,i)=>({id:'o'+n+'-'+i,width:2048,height:2048}))}))}]});
 h.config([]);h.win.fetch('/fixture');
 for(let i=0;i<40&&!h.messages.some(m=>m.transport==='fetch'&&m.shape);i++)await settle();
 const messages=h.messages.filter(m=>m.native),runs=messages.flatMap(m=>m.native.runs||[]);
 assert.equal(new Set(runs.map(r=>r.nodeRunId)).size,12);
 assert.equal(runs.reduce((s,r)=>s+r.outputs.length,0),30000);
 assert.ok(messages.every(m=>JSON.stringify(m).length<700000));
 const state=initial();ingestNative(state,{files:[{fileId:'f',workspaceId:'w'}]});
 for(const m of messages)ingestNative(state,JSON.parse(JSON.stringify(m.native)));
 assert.equal(Object.keys(state.runs).length,12);
 assert.equal(Object.values(state.runs).reduce((n,r)=>n+r.native.outputs.length,0),30000);
});
test('a single oversized run survives multiple fragments, including fragments in one message',async()=>{
 const h=harness({recipeId:'f',batchId:'b',recipeRuns:[{id:'p',nodeRuns:[{id:'r',nodeId:'n',status:'completed',input:{model:'GPT Image 1 Edit'},result:Array.from({length:10000},(_,i)=>({id:'o'+i,width:2048,height:2048}))}]}]});
 h.config([]);h.win.fetch('/fixture');
 for(let i=0;i<40&&!h.messages.some(m=>m.transport==='fetch'&&m.shape);i++)await settle();
 const messages=h.messages.filter(m=>m.native);
 assert.ok(messages.every(m=>JSON.stringify(m).length<700000));
 const state=initial();ingestNative(state,{files:[{fileId:'f',workspaceId:'w'}]});
 for(const m of messages)ingestNative(state,JSON.parse(JSON.stringify(m.native)));
 assert.equal(Object.values(state.runs)[0].native.outputs.length,10000);
 assert.equal(summarize(Object.values(state.runs)).estimate,80000);
});
