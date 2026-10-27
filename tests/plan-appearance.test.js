import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeProjection,ingestNative} from '../extension/native.js';
import {initial,cleanSettings,migrate,cleanRate,rateFor,cost,cleanRun} from '../extension/core.js';
import {moneyPlan,subscriptionPlan,effectiveMoneySettings} from '../extension/currency.js';
import {APPEARANCE} from '../extension/appearance.js';

test('account subscription identity comes from name/type, not the common top-up rate',()=>{
 for(const [name,id]of [['Professional','pro-team'],['Weavy Team','team'],['starter_monthly','starter'],['Free','free'],['Enterprise','enterprise']])assert.equal(subscriptionPlan(name),id);
 assert.equal(subscriptionPlan('A private workspace'),null);
 const detected=moneyPlan({...initial().settings,creditPlan:'auto'},['w'],{w:{creditsPerDollar:120}});
 assert.equal(detected.detected,null);assert.equal(detected.selectedName,'Цена из Weavy');
});
test('native collection projects all observed workspace subscription fields and preserves manual selection',()=>{
 const s=initial();const p=nativeProjection({activeWorkspace:{workspaceId:'a',subscription:{name:'Team',type:'team',creditsPerDollar:120,monthlyCredits:4500,billingCycle:'monthly'}},workspaces:[{workspaceId:'b',subscription:{name:'Starter',creditsPerDollar:100}}]});
 ingestNative(s,p);assert.equal(s.native.accountPrices.a.planId,'team');assert.equal(s.native.accountPrices.b.planId,'starter');assert.equal(s.native.accountPrices.a.monthlyCredits,4500);assert.equal(s.settings.creditPlan,'team');
 assert.equal(moneyPlan(s.settings,['b'],s.native.accountPrices).mismatch,true);
 assert.equal(effectiveMoneySettings({...s.settings,creditPlan:'auto'},['a','b'],s.native.accountPrices).usdPer10k,null);
});
test('a late workspace price cannot replace a newer observation; free has no dollar top-up price',()=>{
 const s=initial();ingestNative(s,{accountPrices:[{workspaceId:'w',planName:'Starter',creditsPerDollar:100}],observedAt:'2026-09-30T12:00:00Z'});
 ingestNative(s,{accountPrices:[{workspaceId:'w',planName:'Team',creditsPerDollar:120}],observedAt:'2026-09-29T12:00:00Z'});
 assert.equal(s.native.accountPrices.w.planId,'starter');
 assert.equal(effectiveMoneySettings({...s.settings,creditPlan:'auto'},['f'],{f:{planName:'Free',creditsPerDollar:null}}).usdPer10k,null);
});
test('appearance normalization preserves meaningful zeros and separates page from dock',()=>{
 const s=cleanSettings({...initial().settings,appearance:{...APPEARANCE.defaults,borderRadius:0,dockBlur:0,dockShadow:0,dockBorderWidth:0,settingsPatternOpacity:0}});
 for(const key of ['borderRadius','dockBlur','dockShadow','dockBorderWidth','settingsPatternOpacity'])assert.equal(s.appearance[key],0);
 assert.equal(s.appearance.settingsBgColor,'#1e1e1e');assert.equal(APPEARANCE.normalize({...s.appearance,bgColor:'#123456'}).settingsBgColor,'#1e1e1e');
 assert.equal(APPEARANCE.normalize({borderRadius:99}).borderRadius,24);
});
test('appearance migration keeps the previous accent and manual currency settings',()=>{
 const s=initial();delete s.settings.appearance;s.settings.accent='#C9F28B';s.settings.creditPlan='custom';s.settings.usdPer10k=79;
 const upgraded=migrate(s);assert.equal(upgraded.settings.appearance.accentColor,'#C9F28B');assert.equal(upgraded.settings.usdPer10k,79);
});
test('undated history uses a custom price only with explicit opt-in and still detects ambiguity',()=>{
 const r=cleanRun({workspaceId:'w',fileId:'f',runId:'r',model:'GPT Image 1 Edit',status:'completed',resultCount:2,native:{savedHistory:true},parameters:{}});
 const t=cleanRate({id:'t',model:r.model,unit:'result',rate:12,validFrom:'2026-09-30T00:00:00Z',source:'Observed and selected',checkedAt:'2026-09-30T00:00:00Z'});
 assert.equal(rateFor(r,[t]).rate,undefined);
 const opted=cleanRate({...t,allowUndated:true});assert.equal(cost(r,[opted]).credits,24);assert.match(cost(r,[opted]).reason,/Нет даты/);
 assert.equal(cost(r,[opted,{...opted,id:'other'}]).kind,'unknown');
});
test('a manual model tariff matches known provider aliases and parameter casing',()=>{
 const r=cleanRun({workspaceId:'w',fileId:'f',runId:'r',model:'openai/gpt-image-2',status:'completed',createdAt:'2026-09-30T12:00:00Z',resultCount:1,parameters:{quality:'HIGH'}});
 const t=cleanRate({id:'t',model:'ChatGPT Images 2.0',unit:'result',rate:17,conditions:{quality:'high'},validFrom:'2026-09-30T00:00:00Z',source:'Checked price',checkedAt:'2026-09-30T00:00:00Z'});
 assert.equal(cost(r,[t]).credits,17);
 assert.equal(cost({...r,model:'gpt-image-2.5'},[t]).kind,'unknown');
});
