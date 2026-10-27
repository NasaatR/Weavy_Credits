import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeProjection,ingestNative,nativeDiagnostics} from '../extension/native.js';
import {initial,cost,summarize,validateBackup} from '../extension/core.js';
import {historicalParams} from '../extension/pricing.js';
const project=(nodes)=>({id:'project',workspaceId:'workspace',name:'Test',edges:[],nodes});
const node=(model,generations,result=[],extra={})=>({id:'node',isModel:true,type:'custommodelV2',data:{model:{name:model},generations,result,...extra}});
const gen=(batch,id,order=0,extra={})=>({batchId:batch,order,secondaryOrder:0,kind:{id,type:'image',url:'https://private/SECRET'},...extra});
function stateFor(file){const s=initial();ingestNative(s,nativeProjection(file),'https://app.weavy.ai/flow/project');return s;}
const rows=s=>Object.values(s.runs);
const summary=s=>summarize(rows(s),s.rates,s.mappings);
const batch=(outputs,extra={})=>({recipeId:'project',batchId:'b1',recipeRuns:[{id:'recipeRun',startTime:'2026-06-01T00:00:00Z',nodeRuns:[{id:'run1',nodeId:'node',status:'completed',input:{num_images:outputs.length},result:outputs,...extra}]}]});
test('saved old history is recovered without timestamps or nodeRuns; no invented debit',()=>{
 const s=stateFor(project([node('GPT Image 1 Edit',[gen('b1','o1'),gen('b2','o2')])]));
 assert.equal(rows(s).length,2);assert.equal(summary(s).estimate,16);assert.equal(summary(s).actualCount,0);
 assert.equal(rows(s)[0].createdAt,null);assert.equal(rows(s)[0].model,null);
 assert.equal(rows(s)[0].native.estimateModel,'GPT Image 1 Edit');
 assert.ok(cost(rows(s)[0]).reason.includes('не подтверждена'));
 assert.ok(!JSON.stringify(s).includes('SECRET'));
});
test('history and selected result join by identity, never index',()=>{
 const s=stateFor(project([node('ChatGPT Images 2.0 Edit',[
  gen('b1','o1'),gen('b2','o2')
 ],[{id:'o2',batchId:'b2',order:0,secondaryOrder:0,input:{quality:'high'}}]) ]));
 const a=rows(s).find(r=>r.native.batchId==='b1'),b=rows(s).find(r=>r.native.batchId==='b2');
 assert.equal(cost(a).credits,1);assert.equal(cost(a).maxCredits,37);
 assert.equal(cost(b).credits,37);assert.equal(cost(b).maxCredits,37);
 assert.equal(a.parameters.quality,undefined);assert.equal(b.parameters.quality,"high");
 assert.equal(summary(s).estimate,38);assert.equal(summary(s).estimateMax,74);
});
test('multi-output batches, repeated polls, tabs and result reorder never multiply expense',()=>{
 const g=[gen('b1','o1',0),gen('b1','o2',1),gen('b2','o3',0)];
 const f=project([node('GPT Image 1 Edit',g,g.map(x=>({...x.kind,batchId:x.batchId,order:x.order,secondaryOrder:0,input:{num_images:'2'}})))]);
 const s=stateFor(f);for(let i=0;i<5;i++)ingestNative(s,nativeProjection(f));
 f.nodes[0].data.generations.reverse();f.nodes[0].data.result.reverse();ingestNative(s,nativeProjection(f));
 assert.equal(rows(s).length,3);assert.equal(summary(s).estimate,24);
});
test('native nodeRun enriches saved outputs instead of double counting, either arrival order',()=>{
 const f=project([node('GPT Image 1 Edit',[gen('b1','o1',0),gen('b1','o2',1)])]);
 const h=batch([{id:'o1',batchId:'b1',order:0},{id:'o2',batchId:'b1',order:1}]);
 for(const order of [[f,h],[h,f]]){const s=initial();for(const data of order)ingestNative(s,nativeProjection(data));
  assert.equal(rows(s).length,1);assert.equal(rows(s)[0].resultCount,2);assert.equal(summary(s).estimate,16);
  ingestNative(s,nativeProjection(f));assert.equal(summary(s).estimate,16);
 }
});
test('partial status history retains saved outputs that it does not cover',()=>{
 const s=stateFor(project([node('GPT Image 1 Edit',[gen('b1','o1',0),gen('b1','o2',1)])]));
 ingestNative(s,nativeProjection(batch([{id:'o1',batchId:'b1',order:0}])));
 assert.equal(rows(s).length,2);assert.equal(summary(s).estimate,16);
});
test('changed node settings cannot turn old medium quality into high',()=>{
 const f=project([node('ChatGPT Images 2.0 Edit',[gen('b1','o1',0,{input:{quality:'medium'}})],[],{params:{quality:'high',resolution:'4K'}})]);
 const s=stateFor(f);assert.equal(summary(s).estimate,9);
 f.nodes[0].data.params.quality='low';f.nodes[0].data.model.name='Gemini 3 Pro';ingestNative(s,nativeProjection(f));
 assert.equal(summary(s).estimate,9);assert.equal(rows(s)[0].parameters.quality,'medium');
});
test('current node quality is never used to fill missing historical quality',()=>{
 const s=stateFor(project([node('ChatGPT Images 2.0 Edit',[gen('b1','o1')],[],{params:{quality:'medium'}})]));
 assert.equal(summary(s).estimate,1);assert.equal(summary(s).estimateMax,37);
});
test('historical resolution and duration parsed from pairs and strings',()=>{
 assert.deepEqual(historicalParams({input:[['resolution','1080p'],['duration','5.888'],['prompt','PRIVATE']]}),{resolution:'1080p',duration:5.888});
 const s=stateFor(project([node('beeble_switchx',[gen('b1','o1',0,{input:[['resolution','1080p'],['duration','5.888']]})])]));
 assert.equal(summary(s).estimate,360);
 const missing=stateFor(project([node('beeble_switchx',[gen('b1','o1')],[],{params:{duration:6,resolution:'1080p'}})]));
 assert.equal(summary(missing).unknown,1);
});
test('dimensions come from output, not reference image or current node',()=>{
 const s=stateFor(project([node('Gemini 3.1 Flash (Nano Banana 2)',[gen('b1','o1',0,{kind:{id:'o1',width:2048,height:2048},input:{image:{width:4096,height:4096},num_images:4}})])]));
 assert.equal(summary(s).estimate,9);assert.equal(summary(s).estimateMax,9);
 assert.equal(rows(s)[0].parameters.width,2048);assert.equal(rows(s)[0].parameters.height,2048);
});
test('non-model uploads, templates, no stable batch evidence do not become usage',()=>{
 const s=stateFor(project([{id:'upload',isModel:false,data:{generations:[gen('b1','o1')]}},node('GPT Image 1 Edit',[{kind:{id:'asset'}}])]));
 ingestNative(s,nativeProjection({workspaceSubflowTemplates:[project([node('GPT Image 1 Edit',[gen('b1','o1')])])]}));
 assert.equal(rows(s).length,0);
});
test('refund markers and failed records are not estimated as completed paid results',()=>{
 for(const extra of [{refundedAt:'2026-09-01T00:00:00Z'},{status:'failed'},{status:'running'}]){
  const s=stateFor(project([node('GPT Image 1 Edit',[gen('b1','o1',0,extra)])]));assert.equal(summary(s).unknown,1);assert.equal(summary(s).estimate,0);
 }
});
test('backup roundtrip keeps built-in estimates; diagnostics scrub output identifiers',()=>{
 const s=stateFor(project([node('GPT Image 1 Edit',[gen('b1','private-output')])]));
 assert.equal(summary(validateBackup(s)).estimate,8);
 const d=JSON.stringify(nativeDiagnostics(s));assert.ok(!d.includes('private-output'));assert.ok(!d.includes('https://private'));
});
test('a saved slot enriched with an output ID stays singular after backup and restore',()=>{
 const f=project([node('GPT Image 1 Edit',[{batchId:'b1',order:0}])]);
 const s=stateFor(f);f.nodes[0].data.generations[0].kind={id:'new-id'};ingestNative(s,nativeProjection(f));
 assert.equal(rows(s).length,1);assert.equal(summary(s).estimate,8);
 const restored=validateBackup(s);ingestNative(restored,{saved:Object.values(s.native.saved),nodes:Object.values(s.native.nodes)});
 ingestNative(restored,nativeProjection(f));assert.equal(rows(restored).length,1);assert.equal(summary(restored).estimate,8);
});
test('different output IDs in the same batch cannot be hidden by equal output counts',()=>{
 const s=stateFor(project([node('GPT Image 1 Edit',[gen('b1','old-output')])]));
 ingestNative(s,nativeProjection(batch([{id:'new-output',batchId:'b1',order:0}])));
 assert.equal(summary(s).estimate,16);assert.equal(rows(s).length,2);
});
test('Seedream V5.0 spelling from the screenshot resolves to the supplied V5 catalog entry',()=>{
 const s=stateFor(project([node('Seedream V5.0 Edit',[gen('b1','o1')])]));
 assert.equal(summary(s).estimate,4);assert.equal(summary(s).estimateMax,4);
});
test('10,000 saved results across nodes remain complete and isolated by file',()=>{
 const nodes=Array.from({length:100},(_,n)=>({...node('GPT Image 1 Edit',Array.from({length:100},(_,i)=>gen('batch'+i,'asset'+n+'-'+i))),id:'n'+n}));
 const projected=nativeProjection(project(nodes));assert.equal(projected.saved.length,10000);
 const s=initial();ingestNative(s,{files:projected.files,nodes:projected.nodes});
 for(let i=0;i<projected.saved.length;i+=100)ingestNative(s,{saved:projected.saved.slice(i,i+100)});
 assert.equal(rows(s).length,10000);assert.equal(summary(s).estimate,80000);
});
test('reused asset identity across batches never borrows another batch parameters',()=>{
 const s=stateFor(project([node('ChatGPT Images 2.0 Edit',[gen('old','same-id')],[{id:'same-id',batchId:'new',order:0,input:{quality:'high'}}])]));
 assert.equal(rows(s).length,2);
 assert.equal(rows(s).find(r=>r.native.batchId==='old').parameters.quality,undefined);
 assert.equal(rows(s).find(r=>r.native.batchId==='new').parameters.quality,'high');
});
