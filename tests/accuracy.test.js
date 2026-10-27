import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalModelName,historicalModel,historicalParams} from '../extension/pricing.js';
import {cleanRun,cleanRate,cost,mergeRun,initial,modelAssignmentKey,modelAssignment,pricingAudit} from '../extension/core.js';
import {nativeProjection,ingestNative} from '../extension/native.js';

const run=(extra={})=>cleanRun({workspaceId:'w',fileId:'f',runId:'r',nodeId:'n',status:'completed',resultCount:1,createdAt:'2026-09-20T00:00:00Z',native:{outputs:[]},...extra});
const rate=(extra={})=>cleanRate({id:'custom',model:'ChatGPT Images 2.0 Edit',unit:'result',rate:3,validFrom:'2026-01-01T00:00:00Z',checkedAt:'2026-09-22T00:00:00Z',source:'Synthetic regression fixture',...extra});
const file={id:'f',workspaceId:'w',name:'Fixture',nodes:[{id:'n',isModel:true,data:{name:'Seedream V5 Edit'}}],edges:[]};
const history=(node={})=>({recipeId:'f',batchId:'b',recipeRuns:[{id:'parent',startTime:'2026-09-20T00:00:00Z',nodeRuns:[{id:'r',nodeId:'n',status:'completed',result:[{id:'output'}],...node}]}]});

test('underscore IDs, dot separators and nested known provider namespaces match safely',()=>{
 for(const name of ['seedream_v5_edit','seedream.v5.0.edit','fal-ai/bytedance/seedream/v5.0/edit'])assert.equal(canonicalModelName(name),'Seedream V5 Edit');
 for(const name of ['fal-ai/bytedance/seedream/v5.1/edit','private/seedream/v5/edit','seedream_v5_edit_lite'])assert.equal(canonicalModelName(name),name);
});
test('model fields support named records, typed values and snake case',()=>{
 for(const input of [[{name:'model',value:{data:{value:'Seedream V5.0 Edit'}}}],{model_slug:'seedream_v5_edit'},{model:{provider:'fal',model:'seedream_v5_edit'}}])assert.equal(historicalModel({input}),'Seedream V5 Edit');
 assert.equal(historicalModel({input:{model:{version:'1.0',name:'Seedream V5 Edit'}}}),'Seedream V5 Edit');
 assert.equal(historicalModel({data:{modelName:'Seedream V5.0 Edit'}}),'Seedream V5 Edit');
 assert.equal(historicalModel({name:'Seedream V5 Edit',input:{image:{model:'Seedream V5 Edit'}}}),null);
});
test('structured output resolution and token counts are retained without reference-image dimensions',()=>{
 const p=historicalParams({input:{image_size:{width:2048,height:2048},image:{width:4096,height:4096},input_tokens:'100',outputTokens:200,enable_audio:'off'}});
 assert.deepEqual(p,{width:2048,height:2048,inputTokens:100,outputTokens:200,audio:false});
 assert.equal(cost(run({model:'Nano Banana 2',parameters:p})).credits,9);
 assert.equal(cost(run({model:'LLM fixture',parameters:p}),[rate({model:'LLM fixture',unit:'inputTokens',rate:2,divisor:100,components:[{unit:'outputTokens',rate:3,divisor:100}]})]).credits,8);
});
test('contradictory duration aliases block an estimate while equivalent values do not',()=>{
 assert.equal(historicalParams({input:{duration:5,seconds:10}}).pricingConflict,true);
 assert.notEqual(historicalParams({input:{duration:5,seconds:'5 sec'}}).pricingConflict,true);
 const p=historicalParams({input:{image_size:{width:2048,height:2048},width:1024}});assert.equal(p.pricingConflict,true);
 assert.deepEqual(historicalParams({input:{quality:' ',mode:''},parameters:{quality:'high'}}),{quality:'high'});
});
test('equivalent model and parameter spelling never creates a history conflict',()=>{
 const a=run({model:'Nano Banana 2',parameters:{resolution:'2K',quality:'High'}}),b=run({model:'fal-ai/nano-banana-2/edit',parameters:{resolution:' 2k ',quality:'high'}});
 const merged=mergeRun(a,b);assert.equal(merged.snapshotConflict,false);assert.equal(cost(merged).credits,9);
 const changed=mergeRun(a,run({model:'Nano Banana Pro',parameters:a.parameters}));assert.equal(changed.snapshotConflict,true);
 const s=initial();ingestNative(s,nativeProjection(file));ingestNative(s,nativeProjection(history({input:{model:'Nano Banana 2',resolution:'2K'}})));ingestNative(s,nativeProjection(history({input:{model:'fal-ai/nano-banana-2/edit',resolution:'2k'}})));
 assert.equal(Object.values(s.runs)[0].snapshotConflict,false);assert.notEqual(Object.values(s.runs)[0].parameters.pricingConflict,true);
});
test('a unanimous model in historical outputs takes precedence over a current node hint',()=>{
 const r=run({resultCount:2,native:{modelHint:'GPT Image 1 Edit',outputs:[{id:'a',model:'Seedream V5.0 Edit',parameters:{}},{id:'b',model:'seedream_v5_edit',parameters:{}}]}});
 assert.equal(cost(r).credits,8);assert.equal(r.model,null);
 const audit=pricingAudit([r],[],{},initial().settings);assert.equal(audit.records[0].check.historicalModel,'Seedream V5 Edit');assert.equal(audit.records[0].outputs[0].model,'Seedream V5.0 Edit');
});
test('different historical output models cannot silently use one model tariff',()=>{
 const r=run({model:'Seedream V5 Edit',native:{outputs:[{id:'a',model:'GPT Image 1 Edit',parameters:{}}]}});
 assert.equal(cost(r).kind,'unknown');assert.match(cost(r).reason,/модел/i);
 const explicit={[modelAssignmentKey(r)]:'Seedream V5 Edit'};assert.equal(cost(r,[],{},explicit).credits,4);
 const mixed=run({resultCount:2,native:{estimateModel:'Seedream V5 Edit',outputs:[{id:'a',model:'Seedream V5 Edit',parameters:{}},{id:'b',model:'GPT Image 1 Edit',parameters:{}}]}});assert.equal(cost(mixed).kind,'unknown');
});
test('repeated output IDs are counted once and incompatible counts cannot produce a false exact amount',()=>{
 const s=initial();ingestNative(s,nativeProjection(file));ingestNative(s,nativeProjection(history({result:[{id:'a'},{id:'a'}]})));
 const r=Object.values(s.runs)[0];assert.equal(r.resultCount,1);assert.equal(r.native.outputs.length,1);assert.equal(cost(r).credits,4);
 const bad=run({model:'Seedream V5 Edit',native:{outputs:[{id:'a',parameters:{}},{id:'b',parameters:{}}]}});assert.equal(cost(bad).kind,'unknown');assert.match(cost(bad).reason,/результат/i);
});
test('unsupported Seedance resolution is recognized from dimensions as well as text',()=>{
 for(const p of [{width:1920,height:1080},{width:1080,height:1920},{resolution:'1920x1080'},{resolution:'Full HD'}])assert.equal(cost(run({model:'Seedance 2.0',parameters:{duration:4,mode:'fast',...p}})).kind,'unknown');
 assert.equal(cost(run({model:'Seedance 2.0',parameters:{duration:4,mode:'fast',width:1280,height:720}})).credits,116);
});
test('an unverified parameter price outside the official range cannot look like an exact current tariff',()=>{
 for(const size of ['1K','2K','4K']){const c=cost(run({model:'Gemini 3 Pro',parameters:{resolution:size}}));assert.equal(c.kind,'estimate');assert.equal(c.credits,15);assert.equal(c.maxCredits,30);assert.match(c.gap,/источник|правил/i);}
});
test('model variants contained in the old Kling family retain separate identities and conditions',()=>{
 for(const [name,seconds,credits]of [['Kling 2.1 Standard',5,25],['Kling 2.1 Pro',5,45],['Kling 2.1 Master',10,280],['Kling 2.5 Turbo Pro',10,70]]){assert.equal(canonicalModelName(name),name);assert.equal(cost(run({model:historicalModel({input:{model:name}}),parameters:{duration:seconds}})).credits,credits);}
 const a=run({model:'Kling 2.1 Pro'}),b=run({model:'Kling 2.5 Turbo Pro'}),assignments={[modelAssignmentKey(a,'name')]:'Recraft V3'};assert.equal(modelAssignment(b,assignments),null);
 assert.equal(cost(run({model:'Kling 2.6 Pro',parameters:{duration:10}})).kind,'unknown');
});
test('named Fast, Pro and Standard variants carry their documented mode without another manual setting',()=>{
 for(const [name,parameters,expected]of [['Seedance 2.0 Fast',{duration:4},116],['seedance_v2_0_standard',{duration:15},552],['Sora 2 Pro',{},288],['Kling 3 Standard',{duration:3},60],['Veo 3.1 Fast Text to Video',{},120]])assert.equal(cost(run({model:historicalModel({input:{model:name}}),parameters})).credits,expected,name);
 assert.equal(cost(run({model:'Sora 2 Pro',parameters:{mode:'normal'}})).kind,'unknown');
 assert.equal(canonicalModelName('Sora 2 Ultra'),'Sora 2 Ultra');
});
test('manual conditions use historical output parameters and per-output prices without multiplying a run fee',()=>{
 const one=run({model:'ChatGPT Images 2.0 Edit',native:{outputs:[{id:'a',parameters:{quality:'high'}}]}});
 assert.equal(cost(one,[rate({conditions:{quality:'high'}})]).credits,3);
 const two=run({model:'ChatGPT Images 2.0 Edit',resultCount:2,native:{outputs:[{id:'a',parameters:{quality:'medium'}},{id:'b',parameters:{quality:'high'}}]}});
 assert.equal(cost(two,[rate({id:'medium',conditions:{quality:'medium'},rate:3}),rate({id:'high',conditions:{quality:'high'},rate:5})]).credits,8);
 assert.equal(cost(two,[rate({unit:'run',rate:12})]).credits,12);
 const overlapping=[rate({id:'one',conditions:{quality:'high'}}),rate({id:'two',conditions:{quality:'high'}})];assert.equal(cost(two,overlapping).kind,'unknown');
});
test('complete schemas inside transport envelopes are recognized without walking templates or input media',()=>{
 const s=initial();ingestNative(s,nativeProjection({data:{result:file}}));ingestNative(s,nativeProjection({payload:history({input:{model:'seedream_v5_edit'}})}));
 assert.equal(Object.keys(s.runs).length,1);assert.equal(cost(Object.values(s.runs)[0]).credits,4);
 const templates=initial();ingestNative(templates,nativeProjection({templates:[file],input:{image:file}}));assert.equal(Object.keys(templates.files).length,0);
});
test('shared name rules from the previous normalizer survive underscore and version formatting fixes',()=>{
 const r=run({model:'seedream_v5_edit'}),old={'["name","seedream v 5 edit"]':'Recraft V3'};
 assert.equal(modelAssignment(r,old)?.model,'Recraft V3');assert.equal(cost(r,[],{},old).credits,5);
});
test('per-output calculations never duplicate batch base charges or billing steps',()=>{
 const r=run({model:'ChatGPT Images 2.0 Edit',resultCount:2,native:{outputs:[{id:'a',parameters:{quality:'high'}},{id:'b',parameters:{quality:'medium'}}]}});
 assert.equal(cost(r,[rate({base:7})]).credits,13);assert.equal(cost(r,[rate({step:2})]).credits,6);
 assert.equal(cost(r,[rate({multiplyBy:'resultCount'})]).credits,12);
});
test('partial manual output tariffs and overflow cannot fall back to a misleading exact number',()=>{
 const r=run({model:'ChatGPT Images 2.0 Edit',resultCount:2,native:{outputs:[{id:'a',parameters:{quality:'high'}},{id:'b',parameters:{quality:'medium'}}]}});
 assert.equal(cost(r,[rate({conditions:{quality:'high'}})]).kind,'unknown');
 assert.equal(cost(r,[rate({rate:1e308})]).kind,'unknown');
});
test('partial output model evidence cannot be overwritten by a current node model',()=>{
 const r=run({resultCount:2,native:{estimateModel:'GPT Image 1 Edit',outputs:[{id:'a',model:'Seedream V5 Edit',parameters:{}},{id:'b',parameters:{}}]}});assert.equal(cost(r).kind,'unknown');
 const refined=run({model:'Kling Video',parameters:{duration:5},native:{outputs:[{id:'a',model:'Kling 2.1 Pro',parameters:{}}]}});assert.equal(cost(refined).credits,45);
});
test('audit groups unresolved models, keeps output model evidence and identifies price-range causes',()=>{
 const records=[run({model:'Seedream 5 Editt'}),run({model:'Seedream 5 Editt',runId:'other'}),run({model:'Gemini 3 Pro',runId:'range',parameters:{resolution:'2K'}})],audit=pricingAudit(records,[],{},initial().settings);
 assert.equal(audit.coverage.unknownRecords,2);assert.equal(audit.coverage.rangedRecords,1);assert.equal(audit.coverage.models[0].records,2);assert.equal(audit.coverage.models[0].modelKnown,false);assert.equal(audit.coverage.models[0].suggestions[0],'Seedream V5 Edit');
 assert.equal(audit.coverage.models[1].modelKnown,true);assert.match(audit.coverage.models[1].reasons[0].reason,/Источники/);assert.ok(audit.records[2].cost.source);
});
test('model provenance carried by an uploaded result never turns a technical node into a paid generation',()=>{
 const r=run({native:{isModel:false,outputs:[{id:'uploaded-image',model:'Seedream V5 Edit',parameters:{}}]}});assert.equal(cost(r).kind,'ignored');
});
test('a named Kling version rejects contradictory historical mode or version parameters',()=>{
 for(const mode of ['standard','2.5 pro'])assert.equal(cost(run({model:'Kling 2.1 Pro',parameters:{duration:5,mode}})).kind,'unknown');
 for(const mode of ['pro','2.1 pro','',' '])assert.equal(cost(run({model:'Kling 2.1 Pro',parameters:{duration:5,mode}})).credits,45);
});
