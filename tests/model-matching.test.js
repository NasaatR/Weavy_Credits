import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modelIdentity,findModelMatch,rankModels} from '../extension/model-matching.js';
import {canonicalModelName,historicalModel,catalogEntries} from '../extension/pricing.js';
import {cleanRun,cleanRate,cost,executionCheck} from '../extension/core.js';
const run=(extra={})=>cleanRun({workspaceId:'w',fileId:'f',runId:'r',nodeId:'n',status:'completed',resultCount:2,native:{savedHistory:true,modelHint:'Seedream V5.0 Edit'},...extra});

test('case, version marker, trailing zero and separators are safe formatting equivalents',()=>{
 for(const value of ['Seedream V5.0 Edit','seedream 5 edit','SeedreamV5_Edit','SEEDREAM version 5.0.0 edit'])assert.equal(modelIdentity(value),modelIdentity('Seedream V5 Edit'));
 assert.notEqual(modelIdentity('Seedream V5.1 Edit'),modelIdentity('Seedream V5 Edit'));
 assert.notEqual(modelIdentity('Seedream V5.10 Edit'),modelIdentity('Seedream V5.1 Edit'));
 assert.notEqual(modelIdentity('Seedream V5 Edit Pro'),modelIdentity('Seedream V5 Edit'));
});
test('Seedream format variations and known provider aliases resolve automatically',()=>{
 for(const name of ['Seedream V5.0 Edit','Seedream 5 Edit','seedream-v5.0/edit','fal-ai/seedream/v5.0/edit']){
  assert.equal(canonicalModelName(name),'Seedream V5 Edit');assert.equal(historicalModel({input:{model:name}}),'Seedream V5 Edit');
 }
});
test('a known model in old node hints now receives its tariff without writing a model assignment',()=>{
 const r=run(),c=cost(r);assert.equal(c.kind,'estimate');assert.equal(c.credits,8);assert.equal(c.maxCredits,8);assert.equal(r.model,null);assert.equal(r.native.estimateModel,null);
 const check=executionCheck(r);assert.equal(check.nodeModel,'Seedream V5 Edit');assert.equal(check.historicalModel,null);assert.equal(check.status,'Estimated');
});
test('node hint format variants can match a manual tariff while retaining dates and conditions',()=>{
 const rate=cleanRate({id:'manual',model:'Custom V5 Edit',unit:'result',rate:6,validFrom:'2026-01-01T00:00:00Z',checkedAt:'2026-09-22T00:00:00Z',source:'Synthetic test',conditions:{quality:'high'}});
 const r=run({createdAt:'2026-09-20T00:00:00Z',parameters:{quality:'high'},native:{savedHistory:true,modelHint:'Custom 5.0 Edit'}});
 assert.equal(cost(r,[rate]).credits,12);assert.equal(cost(run({native:r.native}),[rate]).kind,'unknown');
 assert.equal(cost({...r,parameters:{quality:'low'}},[rate]).kind,'unknown');
});
test('new minor versions and variants cannot inherit a shorter known model name',()=>{
 for(const name of ['Seedream V5.1 Edit','fal-ai/seedream/v5.1/edit','Seedream V5 Edit Lite','GPT Image 1.7 Edit','Nano Banana 2 Lite','GPT Image 2.5']){
  assert.equal(canonicalModelName(name),name);assert.equal(historicalModel({input:{model:name}}),name);
  assert.equal(cost(run({model:name,parameters:{quality:'high',resolution:'2K'}})).kind,'unknown');
 }
});
test('an explicit historical model cannot be replaced by the recognizable node hint',()=>{
 const r=run({model:'Seedream V5.1 Edit'});assert.equal(cost(r).kind,'unknown');assert.equal(historicalModel({input:{model:'Seedream V5.1 Edit'},data:{name:'Seedream V5 Edit'}}),'Seedream V5.1 Edit');
});
test('similar names rank first but spelling errors never become an automatic choice',()=>{
 const ranked=rankModels(catalogEntries(),'Seedream 5.0 Editt');assert.equal(ranked[0].name,'Seedream V5 Edit');assert.ok(ranked[0].similarity>=.5);
 assert.equal(findModelMatch('Seedream 5.0 Editt',catalogEntries()).model,null);assert.equal(canonicalModelName('Seedream 5.0 Editt'),'Seedream 5.0 Editt');
 const changed=rankModels(catalogEntries(),'Seedream V5.1 Edit');assert.equal(changed[0].name,'Seedream V5 Edit');
});
test('ambiguous aliases do not pick the first catalogue row',()=>{
 const entries=[{name:'Model A',aliases:['same v5 edit']},{name:'Model B',aliases:['same 5.0 edit']}],match=findModelMatch('Same V5.0 Edit',entries);
 assert.equal(match.kind,'ambiguous');assert.equal(match.model,null);assert.equal(match.candidates.length,2);
});
test('generic historical labels use the node service for suggestion order without automatic pricing',()=>{
 const ranked=rankModels(catalogEntries(),'V5.0 Pro',['fal-ai/bytedance/seedream/v5/lite/edit']);assert.equal(ranked[0].name,'Seedream V5 Edit');
 assert.equal(cost(run({model:'V5.0 Pro',native:{savedHistory:true,estimateModel:'fal-ai/bytedance/seedream/v5/lite/edit'}})).kind,'unknown');
 const weak=rankModels([{name:'AAA Unrelated'},{name:'Flux 2 Max'}],'flux2-max-editt');assert.equal(weak[0].name,'Flux 2 Max');
});
test('the verified Flux Max edit endpoint is priced without collapsing other versions or modes',()=>{
 assert.equal(canonicalModelName('fal-ai/flux-2-max/edit'),'Flux 2 Max');assert.equal(cost(run({model:null,native:{savedHistory:true,modelHint:'fal-ai/flux-2-max/edit'}})).credits,20);
 for(const model of ['fal-ai/flux-2-max/ultra/edit','fal-ai/flux-2-max-v2/edit','fal-ai/flux-2-max'])assert.equal(canonicalModelName(model),model);
});
test('a shared provider prefix cannot outrank the actual model family',()=>{
 const ranked=rankModels(catalogEntries(),'fal-ai/flux-2-max/edit');assert.equal(ranked[0].name,'Flux 2 Max');assert.match(ranked[1].name,/Flux/);
});
