import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogEntries,historicalModel} from '../extension/pricing.js';
import {cleanRun,cleanRate,cost,mergeRun} from '../extension/core.js';
const run=(model,extra={})=>cleanRun({workspaceId:'w',fileId:'f',runId:'r',model,status:'completed',resultCount:1,native:{savedHistory:true},...extra});
test('all 147 official model rows have source, publication date and numeric tariff; legacy entry marked',()=>{
 const list=catalogEntries();assert.equal(list.length,188);assert.equal(new Set(list.map(e=>e.name)).size,188);
 const verified=list.filter(e=>e.provenance==='official-help');assert.equal(verified.length,147);assert.equal(new Set(verified.map(e=>e.source)).size,10);
 for(const e of verified){assert.ok(e.source.startsWith('https://help.weavy.ai/en/articles/'));assert.ok(e.publishedAt);assert.equal(e.checkedAt,'2026-09-22');assert.ok(Number.isFinite(e.min)&&e.max>=e.min);}
 assert.equal(list.filter(e=>e.provenance==='reference-only').length,1);
 assert.equal(list.filter(e=>e.provenance==='official-help-variant').length,40);
});
test('catalog mapping affects both named and unknown native models without requiring a timestamp',()=>{
 const mappings={'V5.0 Pro':'GPT Image 1 Edit'};
 assert.equal(cost(run('V5.0 Pro')).kind,'unknown');
 assert.equal(cost(run('V5.0 Pro'),[],mappings).credits,8);
 assert.equal(cost(run(null,{native:{modelHint:'V5.0 Pro'}}),[],mappings).credits,8);
 assert.equal(cost(run(null,{native:{modelHint:'V5.0 Pro'}})).kind,'unknown');
 assert.equal(historicalModel({model:'V5.0 Pro'}),'V5.0 Pro');
});
test('detailed supplied rules calculate one amount only when quality/resolution is known',()=>{
 const gpt=cost(run('ChatGPT Images 2.0 Edit',{parameters:{quality:'high'}}));assert.equal(gpt.credits,37);assert.equal(gpt.kind,"estimate");assert.equal(gpt.basis,"parameter-rule");assert.equal(gpt.maxCredits,37);
 const banana=cost(run('Gemini 3.1 Flash (Nano Banana 2)',{parameters:{resolution:'2K'}}));assert.equal(banana.credits,9);assert.equal(banana.maxCredits,9);
});
test('unsupported Seedance 1080 price remains unknown including per-output parameters',()=>{
 const model=catalogEntries().find(e=>e.unsupportedResolutions)?.name;assert.ok(model);
 assert.equal(cost(run(model,{parameters:{resolution:'1080p',duration:5}})).kind,'unknown');
 assert.equal(cost(run(model,{native:{outputs:[{parameters:{resolution:'1080p',duration:5}}]}})).kind,'unknown');
});
test('overlapping manual tariffs cannot silently fall back to the built-in estimate',()=>{
 const r=run('GPT Image 1 Edit',{createdAt:'2026-09-22T00:00:00Z'});
 const rates=['a','b'].map(id=>cleanRate({id,model:r.model,unit:'result',rate:3,source:'test',validFrom:'2026-01-01T00:00:00Z',checkedAt:'2026-09-22T00:00:00Z'}));
 assert.equal(cost(r,rates).kind,'unknown');assert.match(cost(r,rates).reason,/несколько/);
});
test('uppercase terminal status does not regress on stale running update',()=>{
 const a=run('GPT Image 1 Edit',{status:'COMPLETED',updatedAt:'2026-09-22T00:00:00Z'}),b=run('GPT Image 1 Edit',{status:'RUNNING',updatedAt:a.updatedAt});
 assert.equal(mergeRun(a,b).status,'COMPLETED');
 assert.equal(mergeRun(a,{...a,status:'completed'}).snapshotConflict,false);
});
test('every displayed catalog model resolves to itself without collisions',()=>{
 for(const e of catalogEntries())assert.equal(historicalModel({model:e.name}),e.name);
});
