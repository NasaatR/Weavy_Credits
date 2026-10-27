import {test} from 'node:test';
import assert from 'node:assert/strict';
import {historicalModel} from '../extension/pricing.js';
import {nativeProjection,ingestNative} from '../extension/native.js';
import {initial,summarize,cost,cleanRun,mergeRun,validateBackup} from '../extension/core.js';

const file=(extra={})=>({id:'f',workspaceId:'w',name:'A project',edges:[],nodes:[{id:'n',isModel:true,data:{model:{name:'Gemini 3 Pro'},...extra}}]});
const generation=(extra={})=>({batchId:'b',order:0,kind:{id:'o'},input:{model:'GPT Image 1 Edit'},...extra});
const history=(extra={},batchId='b')=>({recipeId:'f',batchId,recipeRuns:[{id:'pr',nodeRuns:[{id:'nr',nodeId:'n',status:'completed',result:[{id:'o'}],...extra}]}]});
const feed=(s,v)=>ingestNative(s,nativeProjection(v));
const summary=s=>summarize(Object.values(s.runs),s.rates,s.mappings);

test('historical input wins over a differently selected current node model',()=>{
 assert.equal(historicalModel({input:{model:'GPT Image 1 Edit'},data:{model:{name:'Gemini 3 Pro'}}}),'GPT Image 1 Edit');
 assert.equal(historicalModel({input:{model:'gpt-image-2.5'},model:'GPT Image 1 Edit'}),'gpt-image-2.5');
});
test('models in historical key/value pairs and wrapped values resolve',()=>{
 for(const input of [[['model','openai/gpt-image-2']],[[{id:'model'},{data:{value:'openai/gpt-image-2'}}]]])
  assert.equal(historicalModel({input}),'ChatGPT Images 2.0');
});
test('wrapper service falls through to concrete version; arbitrary media names are ignored',()=>{
 assert.equal(historicalModel({data:{kind:{model:{service:'fal_imported',version:'openai/gpt-image-2',name:'Gemini 3 Pro'}}}}),'ChatGPT Images 2.0');
 assert.equal(historicalModel({data:{model:{service:'fal-ai/nano-banana-2',name:'Renamed'}}}),'Gemini 3.1 Flash (Nano Banana 2)');
 for(const value of [{name:'GPT Image 1 Edit'},{label:'Gemini 3 Pro'},{input:{image:{model:'GPT Image 1 Edit'}}}])assert.equal(historicalModel(value),null);
});
test('saved generation model enriches its exact run in either arrival order',()=>{
 const f=file({generations:[generation()]});
 for(const values of [[f,history()],[history(),f]]){
  const s=initial();for(const v of values)feed(s,v);
  assert.equal(summary(s).total,1);assert.equal(summary(s).estimate,8);
  assert.equal(Object.values(s.runs)[0].model,'GPT Image 1 Edit');
  for(let i=0;i<3;i++){feed(s,history());feed(s,f);}
  assert.equal(summary(s).estimate,8);assert.equal(summary(s).unknown,0);
 }
});
test('missing run batch joins only by unique output identity within file and node',()=>{
 const s=initial();feed(s,file({generations:[generation()]}));feed(s,history({},null));
 assert.equal(summary(s).total,1);assert.equal(summary(s).estimate,8);
 const other=file({generations:[generation()]});other.id='other';feed(s,other);
 assert.equal(summary(s).total,2);assert.equal(summary(s).estimate,16);
});
test('explicit different batch IDs are never joined even with the same asset',()=>{
 const s=initial();feed(s,file({generations:[generation()]}));feed(s,history({},'other-batch'));
 assert.equal(summary(s).total,2);
});
test('object results and observed output.result/output.out shapes yield one output',()=>{
 for(const extra of [{result:{id:'o'}},{result:null,output:{result:{id:'o'}}},{result:null,output:{out:{id:'o'}}}]){
  const s=initial();feed(s,file({model:{name:'GPT Image 1 Edit'}}));feed(s,history(extra));
  assert.equal(summary(s).estimate,8);assert.equal(Object.values(s.runs)[0].resultCount,1);
 }
});
test('a technical node stays out of unknown expenses; unknown node classification stays visible',()=>{
 const s=initial(),f=file();f.nodes[0].isModel=false;f.nodes[0].data={};feed(s,f);feed(s,history());
 assert.equal(summary(s).unknown,0);assert.equal(summary(s).total,0);assert.equal(summary(s).excluded,1);
 const unknown=initial();f.nodes=[];feed(unknown,f);feed(unknown,history());
 assert.equal(summary(unknown).unknown,1);
});
test('a completed poll without timestamps enriches the previous in-flight record',()=>{
 const s=initial();feed(s,file({model:{name:'GPT Image 1 Edit'}}));
 feed(s,history({status:'running',result:null}));feed(s,history());
 assert.equal(summary(s).estimate,8);assert.equal(summary(s).unknown,0);
 feed(s,history({status:'running',result:null}));
 assert.equal(summary(s).estimate,8);assert.equal(Object.values(s.runs)[0].native.outputs.length,1);
});
test('stale native snapshots cannot erase completed output metadata',()=>{
 const a=cleanRun({workspaceId:'w',fileId:'f',runId:'r',model:'GPT Image 1 Edit',status:'completed',updatedAt:'2026-09-24T10:00:00Z',resultCount:1,parameters:{},events:[],native:{outputs:[{id:'o',parameters:{quality:'high'}}]}});
 const b=cleanRun({...a,status:'running',updatedAt:'2026-09-24T09:00:00Z',resultCount:null,native:{outputs:[]}});
 const merged=mergeRun(a,b);assert.equal(merged.native.outputs.length,1);assert.equal(merged.status,'completed');assert.equal(cost(merged).credits,8);
});
test('matched history retains refund markers and parameter conflicts',()=>{
 for(const extra of [{refundedAt:'2026-09-24T10:00:00Z'},{input:{model:'GPT Image 1 Edit',quality:'medium'}}]){
  const s=initial();feed(s,file({generations:[generation(extra)]}));feed(s,history({input:{quality:'high'}}));
  assert.equal(summary(s).total,1);assert.equal(summary(s).unknown,1);assert.equal(summary(s).estimate,0);
 }
});
test('model conflict between generation and run remains unknown',()=>{
 const s=initial();feed(s,file({generations:[generation()]}));feed(s,history({input:{model:'Gemini 3 Pro'}}));
 assert.equal(summary(s).unknown,1);assert.equal(summary(s).estimate,0);
});
test('saved object results and pair models survive backup roundtrip',()=>{
 const s=initial();feed(s,file({result:{id:'o',batchId:'b',input:[['model','GPT Image 1 Edit']]}}));
 assert.equal(summary(s).estimate,8);assert.equal(summary(validateBackup(s)).estimate,8);
});
test('anonymous outputs do not accumulate on every poll',()=>{
 const s=initial();feed(s,file({model:{name:'GPT Image 1 Edit'}}));
 for(let i=0;i<10;i++)feed(s,history({result:[{},{}]}));
 assert.equal(Object.values(s.runs)[0].native.outputs.length,2);assert.equal(summary(s).estimate,16);
});
test('direct ingestion and restore projection keep more than 4,000 saved results',()=>{
 const s=initial();feed(s,file({generations:Array.from({length:4100},(_,i)=>generation({batchId:'b'+i,kind:{id:'o'+i}}))}));
 assert.equal(summary(s).total,4100);assert.equal(summary(s).estimate,32800);
});
