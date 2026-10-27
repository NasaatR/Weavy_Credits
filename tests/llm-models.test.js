import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogEntries,canonicalModelName,catalogEntry,historicalModel,historicalParams} from '../extension/pricing.js';
import {rankModels} from '../extension/model-matching.js';
import {availableModels,modelValue} from '../extension/model-list.js';
import {cleanRun,cleanRate,cost,initial} from '../extension/core.js';
test('text model identities include Claude Opus 5 without inventing a Weavy price',()=>{
 const name=canonicalModelName('anthropic/claude-opus-5'),entry=catalogEntry(name);assert.equal(entry.category,'llm');assert.equal(entry.kind,'unknown');assert.equal(entry.min,null);assert.ok(catalogEntries().filter(e=>e.category==='llm').length>=300);
 assert.equal(rankModels(catalogEntries(),'Any LLM')[0].category,'llm');
 const r=cleanRun({workspaceId:'w',fileId:'f',runId:'llm',model:'anthropic/claude-opus-5',status:'completed',resultCount:1,native:{savedHistory:true}});assert.equal(cost(r).kind,'unknown');assert.match(cost(r).reason,/Модель распознана/);
});
test('Any LLM wrappers yield the selected model and historical selection wins over current settings',()=>{
 const wanted=canonicalModelName('anthropic/claude-opus-5');
 assert.equal(historicalModel({input:{model:'Run Any LLM'},parameters:{model:'anthropic/claude-opus-5'}}),wanted);
 assert.equal(historicalModel({model:'Any LLM',parameters:[[{id:'llmModel'},{data:{value:'anthropic/claude-opus-5'}}]]}),wanted);
 assert.equal(historicalModel({data:{kind:{model:{service:'anyllm'},parameters:[['model',{value:'anthropic/claude-opus-5'}]]}}}),wanted);
 assert.equal(historicalModel({input:{language_model:'anthropic/claude-opus-5'},data:{params:{model:'openai/gpt-5'}}}),wanted);
});
test('token usage is captured explicitly; a manual token tariff requires real counters',()=>{
 const p=historicalParams({usage:{prompt_tokens:2000,completion_tokens:500,total_tokens:2500},prompt:'private'});assert.deepEqual(p,{inputTokens:2000,outputTokens:500});
 const model=canonicalModelName('anthropic/claude-opus-5'),r=cleanRun({workspaceId:'w',fileId:'f',runId:'r',model,parameters:p,status:'completed',resultCount:1});
 const rate=cleanRate({id:'tokens',model,unit:'inputTokens',rate:2,divisor:1000,components:[{unit:'outputTokens',rate:10,divisor:1000}],validFrom:'2026-01-01T00:00:00Z',checkedAt:'2026-10-27T00:00:00Z',source:'Synthetic tariff',allowUndated:true});
 assert.equal(cost(r,[rate]).credits,9);assert.equal(cost({...r,parameters:{}},[rate]).kind,'unknown');
 assert.deepEqual(historicalParams({usageMetadata:{promptTokenCount:10,candidatesTokenCount:4}}),{inputTokens:10,outputTokens:4});
});
test('the picker inventory includes newly observed models and preserves manual corrections and static prices',()=>{
 const s=initial();s.native={prices:{one:{name:'Future text model',modelName:'vendor/future-text-model',modelType:'anyllm',credits:7},two:{name:'Recraft',modelName:'recraft-v3',credits:999}}};
 s.modelAssignments={'["name","my model"]':'Recraft V3'};const before=JSON.stringify(s),entries=availableModels(s);
 const found=entries.find(e=>modelValue(e)==='vendor/future-text-model');assert.ok(found);assert.equal(found.kind,'unknown');assert.equal(found.min,null);assert.equal(found.quoteMin,7);assert.equal(JSON.stringify(s),before);
 assert.equal(catalogEntry('Recraft V3').min,5);assert.equal(availableModels(s),entries);
});
test('a generic old label does not displace the actual service identity in suggestions',()=>{
 const s=initial();s.runs.one={model:'Local alias',native:{estimateModel:'vendor/actual-model',outputs:[]}};
 const entries=availableModels(s);assert.ok(entries.some(e=>modelValue(e)==='vendor/actual-model'));assert.ok(!entries.some(e=>modelValue(e)==='Local alias'));
});
