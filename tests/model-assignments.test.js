import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,migrate,addRuns,cleanRun,cleanRate,cost,summarize,runKey,modelAssignmentKey,modelAssignment,validateBackup,pricingAudit,csv} from '../extension/core.js';

const run=(extra={})=>cleanRun({workspaceId:'w',fileId:'f',runId:'r',nodeId:'n',status:'completed',resultCount:2,createdAt:'2026-09-20T00:00:00Z',native:{savedHistory:true,modelHint:'Imported model',outputs:[]},...extra});
const assign=(r,model='Recraft V3',scope='node')=>({[modelAssignmentKey(r,scope)]:model});

test('node choice resolves matching unknown generations without rewriting model evidence or touching other files',()=>{
 const r=run(),assignments=assign(r),related=run({runId:'next'});
 const others=[run({runId:'different-node',nodeId:'n2'}),run({runId:'different-file',fileId:'f2'}),run({workspaceId:'w2'}),run({runId:'other-model',model:'Future Model'}),run({runId:'known-model',model:'Recraft V3 SVG'})];
 assert.equal(summarize([r,related],[],{},assignments).estimate,20);
 for(const other of others)assert.equal(modelAssignment(other,assignments),null);
 assert.equal(r.model,null);assert.equal(r.native.modelHint,'Imported model');
 assert.equal(cost(others[0],[],{},assignments).kind,'unknown');
});

test('generation choice takes priority and resetting it returns to the node model',()=>{
 const r=run(),assignments={...assign(r),...assign(r,'Recraft V3 SVG','run')};
 assert.equal(cost(r,[],{},assignments).credits,20);
 assert.equal(cost(run({runId:'next'}),[],{},assignments).credits,10);
 delete assignments[modelAssignmentKey(r)];assert.equal(cost(r,[],{},assignments).credits,10);
 delete assignments[modelAssignmentKey(r,'node')];assert.equal(cost(r,[],{},assignments).kind,'unknown');
});
test('equivalent model aliases and letter case share a node correction while other versions stay separate',()=>{
 const r=run({model:'fal-ai/nano-banana-2/edit'}),assignments=assign(r),alias=run({runId:'alias',model:'Nano Banana 2'});
 assert.equal(modelAssignment(alias,assignments).model,'Recraft V3');assert.equal(modelAssignment(run({runId:'case',model:'FAL-AI/NANO-BANANA-2/EDIT'}),assignments).model,'Recraft V3');
 assert.equal(modelAssignment(run({runId:'pro',model:'Nano Banana Pro'}),assignments),null);assert.equal(modelAssignment(run({runId:'lite',model:'Nano Banana 2 Lite'}),assignments),null);
});

test('chosen model applies a custom historical rate and cannot be redirected by a global alias',()=>{
 const r=run({native:null}),assignments=assign(r,'Custom rate','run');
 const rate=cleanRate({id:'custom',model:'Custom rate',unit:'result',rate:7,validFrom:'2026-01-01T00:00:00Z',checkedAt:'2026-09-22T00:00:00Z',source:'Synthetic test'});
 assert.equal(cost(r,[rate],{'Custom rate':'Unrelated model'},assignments).credits,14);
 assert.equal(cost(run({createdAt:null,native:null}),[rate],{},assignments).kind,'unknown');
});

test('selecting a model does not fill missing price parameters or claim a receipt',()=>{
 const r=run(),c=cost(r,[],{},assign(r,'ChatGPT Images 2.0 Edit'));
 assert.equal(c.kind,'estimate');assert.ok(c.maxCredits>c.credits);assert.match(c.gap,/Quality|разрешение/);
 const noResults=run({resultCount:null});assert.equal(cost(noResults,[],{},assign(noResults)).kind,'unknown');
 const failed=run({status:'failed'});assert.equal(cost(failed,[],{},assign(failed)).kind,'unknown');
 const conflict=run({parameters:{pricingConflict:true}});assert.equal(cost(conflict,[],{},assign(conflict)).kind,'unknown');
});

test('actual debits and refunds have priority over any selected model',()=>{
 const r=run({events:[{id:'debit',kind:'debit',credits:80},{id:'refund',kind:'refund',credits:20}]}),c=cost(r,[],{},assign(r));
 assert.equal(c.kind,'actual');assert.equal(c.credits,60);
 const refund=run({events:[{id:'refund-only',kind:'refund',credits:10}]});assert.equal(cost(refund,[],{},assign(refund)).kind,'unknown');
});

test('node assignments survive history refresh and apply to later matching generations',()=>{
 const s=initial(),r=run();addRuns(s,[r]);s.modelAssignments=assign(r);
 addRuns(s,[r,run({runId:'later',parameters:{resolution:'2K'}})]);
 assert.equal(summarize(Object.values(s.runs),[],{},s.modelAssignments).estimate,20);
 assert.equal(s.runs[runKey(r)].model,null);assert.equal(s.runs[runKey(r)].snapshotConflict,false);
});

test('backup round trip retains scoped models and old backups migrate without assignments',()=>{
 const s=initial(),r=run();addRuns(s,[r]);s.modelAssignments={...assign(r),...assign(r,'Recraft V3 SVG','run')};
 const restored=validateBackup(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.modelAssignments,s.modelAssignments);assert.equal(cost(restored.runs[runKey(r)],[],{},restored.modelAssignments).credits,20);
 const old={...s};delete old.modelAssignments;assert.deepEqual(migrate(old).modelAssignments,{});assert.deepEqual(validateBackup(old).modelAssignments,{});
 assert.throws(()=>validateBackup({...s,modelAssignments:{'["node","w"]':'Recraft V3'}}));
 assert.throws(()=>validateBackup({...s,modelAssignments:JSON.parse('{"__proto__":"Recraft V3"}')}));
});

test('audit and CSV distinguish user model choices from historical evidence',()=>{
 const r=run(),assignments=assign(r),audit=pricingAudit([r],[],{},initial().settings,assignments),record=audit.records[0];
 assert.equal(record.model,null);assert.equal(record.modelAssignment.model,'Recraft V3');assert.equal(record.check.status,'Estimated');assert.equal(record.check.historicalModel,null);assert.equal(record.check.assignedModel,'Recraft V3');
 const report=csv(summarize([r],[],{},assignments).rows);assert.match(report,/assignedModel/);assert.match(report,/"Recraft V3"/);assert.match(report,/"node"/);
});
test('one name assignment covers equivalent names across nodes, files and future generations',()=>{
 const r=run({model:'Custom V5.0 Edit'}),assignments=assign(r,'Recraft V3','name');
 const matching=[r,run({runId:'other-node',nodeId:'n2',model:'Custom 5 Edit'}),run({runId:'other-file',fileId:'f2',model:'CUSTOM V5 EDIT'}),run({workspaceId:'w2',model:'custom-v5.0/edit'}),run({runId:'future',model:'Custom V5 Edit'})];
 for(const other of matching){assert.equal(modelAssignment(other,assignments).scope,'name');assert.equal(cost(other,[],{},assignments).credits,10);}
 assert.equal(summarize(matching,[],{},assignments).estimate,50);
 for(const model of ['Custom V5.1 Edit','Custom V5 Edit Lite','Other V5 Edit'])assert.equal(modelAssignment(run({model}),assignments),null);
});
test('explicit generation and node exceptions keep priority over a shared name rule',()=>{
 const r=run(),assignments={...assign(r,'Recraft V3','name'),...assign(r,'Recraft V3 SVG','node')};
 assert.equal(cost(r,[],{},assignments).credits,20);assert.equal(cost(run({nodeId:'other'}),[],{},assignments).credits,10);
 Object.assign(assignments,assign(r,'GPT Image 1 Edit','run'));assert.equal(cost(r,[],{},assignments).credits,16);
});
test('shared names survive backup, remain separate evidence and never change actual receipts',()=>{
 const s=initial(),r=run({events:[{id:'receipt',kind:'debit',credits:123}]});addRuns(s,[r]);s.modelAssignments=assign(r,'Recraft V3','name');
 const restored=validateBackup(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.modelAssignments,s.modelAssignments);assert.equal(cost(restored.runs[runKey(r)],[],{},restored.modelAssignments).credits,123);
 const audit=pricingAudit([r],[],{},s.settings,s.modelAssignments);assert.equal(audit.records[0].modelAssignment.scope,'name');assert.equal(audit.records[0].model,null);
});
