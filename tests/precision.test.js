import {test} from 'node:test';
import assert from 'node:assert/strict';
import {historicalParams,historicalModel} from '../extension/pricing.js';
import {cleanRun,cost,summarize,initial,migrate,pricingAudit} from '../extension/core.js';
const r=(model,parameters={},extra={})=>cleanRun({workspaceId:'private-workspace',fileId:'private-project',nodeId:'private-node',runId:'private-run',model,parameters,status:'completed',resultCount:1,native:{savedHistory:true},...extra});
test('Team is the default, previous auto/combined plan upgrades once, later choice persists',()=>{
 assert.equal(initial().settings.creditPlan,'team');
 for(const creditPlan of ['auto','pro-team']){
  const s=initial();delete s.settings.teamDefaultApplied;s.settings.creditPlan=creditPlan;
  const updated=migrate(s);assert.equal(updated.settings.creditPlan,'team');assert.equal(updated.settings.usdPer10k,10000/120);
  updated.settings.creditPlan='starter';updated.settings.usdPer10k=100;assert.equal(migrate(updated).settings.creditPlan,'starter');
 }
 const custom=initial();delete custom.settings.teamDefaultApplied;custom.settings.creditPlan='custom';custom.settings.usdPer10k=72;
 assert.equal(migrate(custom).settings.usdPer10k,72);
});
test('typed historical parameter pairs and named values are read without node defaults',()=>{
 const p=historicalParams({input:[[{id:'quality'},{data:{value:'high'}}],['resolution',{value:'2K'}],['prompt',{value:'PRIVATE'}]],parameters:[{name:'duration_seconds',value:'5,888'}],schema:{quality:{default:'medium'}},image:{width:4000,height:4000}});
 assert.deepEqual(p,{quality:'high',resolution:'2K',duration:5.888});
 assert.equal(cost(r('ChatGPT Images 2.0 Edit',p)).credits,37);
});
test('conflicting historical quality values remain unknown and cannot silently select a rate',()=>{
 const p=historicalParams({input:{quality:'high'},params:{quality:'medium'}});assert.equal(p.pricingConflict,true);
 assert.equal(cost(r('ChatGPT Images 2.0 Edit',p)).kind,'unknown');
 const actual=cost(r('ChatGPT Images 2.0 Edit',p,{events:[{id:'tx',kind:'debit',credits:12}]}));assert.equal(actual.kind,'actual');assert.equal(actual.credits,12);
});
test('known quality calculates per output with no second multiplication by num_images',()=>{
 const s=summarize([r('ChatGPT Images 2.0 Edit',{count:2},{resultCount:2,native:{outputs:[{parameters:{quality:'medium'}},{parameters:{quality:'high'}}]}})],[],{});
 assert.equal(s.singleEstimate,46);assert.equal(s.singleCount,1);assert.equal(s.rangeCount,0);assert.equal(s.actualCount,0);
});
test('resolution rules match historical output sizes; missing or unknown values keep range',()=>{
 for(const [size,expected]of [['1K',6],['2K',9],['4K',13.5]])assert.equal(cost(r('Nano Banana 2',{resolution:size})).credits,expected);
 for(const size of ['1K','2K','4K']){const c=cost(r('Nano Banana Pro',{resolution:size}));assert.equal(c.credits,15);assert.equal(c.maxCredits,30);assert.match(c.gap,/Источники/);}
 const missing=cost(r('ChatGPT Images 2.0 Edit'));assert.equal(missing.credits,1);assert.equal(missing.maxCredits,37);assert.match(missing.gap,/Quality/);
 const low=cost(r('ChatGPT Images 2.0 Edit',{quality:'low'}));assert.equal(low.precision,'range');
});
test('new variants cannot inherit a different family price even inside legacy model wrappers',()=>{
 for(const model of ['GPT Image 2.5','gpt-image-2.5','Nano Banana 2 Lite','fal-ai/nano-banana-2-lite/edit']){
  assert.equal(historicalModel({model}),model);assert.equal(cost(r(model,{quality:'medium',resolution:'2K'})).kind,'unknown');
 }
 assert.equal(historicalModel({model:{name:'gpt_image_1',service:'gpt-image-2.5'}}),'gpt-image-2.5');
});
test('precision breakdown partitions all records; audit removes project names, IDs, media and receipts',()=>{
 const runs=[r('ChatGPT Images 2.0 Edit',{quality:'medium'}),r('ChatGPT Images 2.0 Edit',{}, {runId:'r2'}),r('unknown',{}, {runId:'r3'}),r('actual',{}, {runId:'r4',events:[{id:'private-receipt',kind:'debit',credits:10}],fileName:'PRIVATE TITLE',fileUrl:'https://app.weavy.ai/private-path'})];
 const s=summarize(runs,[],{});assert.equal(s.singleCount,1);assert.equal(s.rangeCount,1);assert.equal(s.unknown,1);assert.equal(s.actualCount,1);assert.equal(s.singleEstimate,9);assert.equal(s.estimate,10);assert.equal(s.estimateMax,46);
 const audit=pricingAudit(runs,[],{},initial().settings);assert.equal(audit.records.length,4);
 const json=JSON.stringify(audit);for(const secret of ['private-workspace','private-project','private-node','private-run','private-receipt','PRIVATE TITLE','private-path'])assert.ok(!json.includes(secret),secret);
 assert.equal(audit.records[0].file,audit.records[1].file);assert.notEqual(audit.records[0].run,audit.records[1].run);
});
