import {test} from 'node:test';
import assert from 'node:assert/strict';
import {centralCredits,reportTotal,cleanRun,summarize,pricingAudit,initial} from '../extension/core.js';
const run=(model,extra={})=>cleanRun({workspaceId:'w',fileId:'f',runId:model,model,status:'completed',resultCount:1,native:{savedHistory:true},...extra});
test('the display midpoint retains exact values and never invents an unknown cost',()=>{
 assert.equal(centralCredits({kind:'estimate',credits:10,maxCredits:30}),20);
 assert.equal(centralCredits({kind:'actual',credits:7}),7);
 for(const c of [{kind:'unknown',credits:null},{kind:'estimate',credits:30,maxCredits:10},{kind:'estimate',credits:Infinity}])assert.equal(centralCredits(c),null);
 assert.ok(Number.isFinite(centralCredits({kind:'estimate',credits:Number.MAX_VALUE/2,maxCredits:Number.MAX_VALUE})));
});
test('one display total combines debits and midpoint estimates while the audit keeps bounds and unknowns',()=>{
 const runs=[run('actual',{events:[{id:'receipt',kind:'debit',credits:100},{id:'refund',kind:'refund',credits:10}]}),run('ChatGPT Images 2.0 Edit'),run('unrecognized')];
 const sum=summarize(runs,[],{});assert.equal(reportTotal(sum),109);assert.equal(sum.actual,90);assert.equal(sum.estimate,1);assert.equal(sum.estimateMax,37);assert.equal(sum.unknown,1);
 const audit=pricingAudit(runs,[],{},initial().settings);assert.equal(audit.totals.displayEstimate,109);assert.equal(audit.records[1].cost.central,19);assert.equal(audit.records[1].cost.min,1);assert.equal(audit.records[1].cost.max,37);
 assert.equal(reportTotal(summarize([run('unknown')],[],{})),null);
});
