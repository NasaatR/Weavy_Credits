import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FX_SEED,CREDIT_PLANS,parseCbrUsd,fetchCbrUsd,effectiveMoneySettings} from '../extension/currency.js';
import {initial,migrate,cleanSettings,money} from '../extension/core.js';
const xml=(date='22.09.2026',value='84,0954',nominal='1')=>`<ValCurs Date="${date}"><Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>${nominal}</Nominal><Value>${value}</Value></Valute></ValCurs>`;
test('official USD seed has exact date and all four decimal places; nominal applied',()=>{
 assert.deepEqual(parseCbrUsd(xml(),'2026-09-22'),{rate:84.0954,date:'2026-09-22'});
 assert.ok(Math.abs(parseCbrUsd(xml('22.09.2026','8409,54','100'),'2026-09-22').rate-FX_SEED.rate)<1e-12);
 assert.equal(initial().settings.rubPerUsd,84.0954);
});
test('CBR rejects tomorrow, stale responses and invalid rates, allows previous business day',()=>{
 for(const v of [xml('23.09.2026'),xml('01.09.2026'),xml('22.09.2026','0'),'<html>Error</html>'])assert.throws(()=>parseCbrUsd(v,'2026-09-22'));
 assert.equal(parseCbrUsd(xml('19.09.2026'),'2026-09-22').date,'2026-09-19');
});
test('FX request uses Moscow current date, no credentials, handles service errors',async()=>{
 let requested,options;
 const q=await fetchCbrUsd(async(url,opts)=>{requested=url;options=opts;return {ok:true,text:async()=>xml()};},new Date('2026-09-21T22:00:00Z'));
 assert.ok(requested.endsWith('date_req=22/09/2026'));assert.equal(options.credentials,'omit');assert.equal(q.rate,84.0954);
 await assert.rejects(fetchCbrUsd(async()=>({ok:false,status:503})),/503/);
});
test('credit purchase presets preserve precision and manual edits override them',()=>{
 const starter=cleanSettings({...initial().settings,creditPlan:'starter'}),pro=cleanSettings({...initial().settings,creditPlan:'pro-team'});
 assert.equal(money(1000,starter).usd,10);assert.equal(money(1200,pro).usd,10);
 assert.equal(pro.usdPer10k,10000/120);assert.equal(CREDIT_PLANS.length,5);
 assert.equal(cleanSettings({...pro,creditPlan:'custom',usdPer10k:72}).usdPer10k,72);
});
test('upgrade fills previously blank currency settings without overwriting manual ones',()=>{
 const old=initial();delete old.settings.creditPlan;delete old.settings.fxMode;old.settings.usdPer10k=null;old.settings.rubPerUsd=null;
 assert.equal(migrate(old).settings.rubPerUsd,84.0954);assert.equal(migrate(old).settings.creditPlan,'auto');
 old.settings.usdPer10k=75;old.settings.rubPerUsd=90;
 const s=migrate(old).settings;assert.equal(s.usdPer10k,75);assert.equal(s.rubPerUsd,90);assert.equal(s.creditPlan,'custom');assert.equal(s.fxMode,'manual');
});
test('observed workspace conversion wins in auto mode; mixed workspace prices remain unknown',()=>{
 const s={...initial().settings,creditPlan:'auto'},prices={a:{creditsPerDollar:100},b:{creditsPerDollar:120}};
 assert.equal(effectiveMoneySettings(s,['a'],prices).usdPer10k,100);
 assert.equal(effectiveMoneySettings(s,['b','b'],prices).usdPer10k,10000/120);
 assert.equal(effectiveMoneySettings(s,['a','b'],prices).usdPer10k,null);
 assert.equal(effectiveMoneySettings(s,['a','missing'],prices).usdPer10k,null);
 assert.match(effectiveMoneySettings(s,['missing'],prices).creditSource,/по умолчанию/);
 assert.equal(effectiveMoneySettings({...s,creditPlan:'custom',usdPer10k:70},['a'],prices).usdPer10k,70);
});
