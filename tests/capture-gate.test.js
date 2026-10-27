import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCaptureGate} from '../extension/capture-gate.js';
const message=(credits=4,observedAt='2026-10-27T10:00:00Z')=>({type:'capture',signature:'native-data',pageUrl:'https://app.weavy.ai/f',native:{observedAt,runs:[{nodeRunId:'r',parameters:{quality:'high'},events:[{id:'d',kind:'debit',credits}]}]}});
test('identical acknowledged bursts and observation timestamps are coalesced',async()=>{
 let calls=0;const gate=createCaptureGate(async()=>{calls++;return {count:1};});
 await gate(message());assert.equal((await gate(message(4,'2026-10-27T10:00:01Z'))).deduplicated,true);assert.equal(calls,1);
 await gate(message(5));assert.equal(calls,2);
});
test('changed financial fields, source URL, parameters and update dates always pass',async()=>{
 const sent=[],gate=createCaptureGate(async m=>{sent.push(m);return {count:1};});await gate(message());
 for(const modify of [m=>m.native.runs[0].parameters.quality='low',m=>m.native.runs[0].updatedAt='2026-10-27T11:00:00Z',m=>m.pageUrl='https://app.weavy.ai/other',m=>m.native.runs[0].nodeRunId='other']){const m=message();modify(m);await gate(m);}
 assert.equal(sent.length,5);
});
test('failures are not acknowledged and a subsequent observation retries',async()=>{
 let calls=0;const gate=createCaptureGate(async()=>++calls===1?null:{count:1});await gate(message());await gate(message());assert.equal(calls,2);
 let rejected=0;const errorGate=createCaptureGate(async()=>{if(++rejected===1)throw Error('Worker stopped');return {count:1};});await assert.rejects(errorGate(message()),/Worker stopped/);await errorGate(message());assert.equal(rejected,2);
});
test('identical in-flight captures share the acknowledgement and expiration refreshes freshness',async()=>{
 let done,calls=0,time=0;const gate=createCaptureGate(()=>{calls++;return new Promise(r=>done=r);},{now:()=>time,ttl:100});
 const a=gate(message()),b=gate(message());await Promise.resolve();assert.equal(calls,1);done({count:1});await Promise.all([a,b]);time=101;const c=gate(message());await Promise.resolve();assert.equal(calls,2);done({count:1});await c;
});
test('bounded caches evict older captures and oversized messages remain deliverable',async()=>{
 let calls=0;const gate=createCaptureGate(async()=>{calls++;return {count:1};},{maxEntries:2});for(const n of [1,2,3,1])await gate(message(n));assert.equal(calls,4);
 const big=createCaptureGate(async()=>{calls++;return {count:1};},{maxBytes:10});await big(message());await big(message());assert.equal(calls,6);
});
