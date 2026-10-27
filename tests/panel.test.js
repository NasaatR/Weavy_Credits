import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {catalogEntries} from '../extension/pricing.js';
import {initial,addRuns,cleanSettings,cleanRate,modelAssignmentKey} from '../extension/core.js';
const {window,document}=parseHTML(fs.readFileSync(new URL('../extension/panel.html',import.meta.url),'utf8'));
Object.assign(globalThis,{window,document,location:new URL('https://extension.test/panel.html?tab=5')});
window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||'';},set(value){for(const opt of this.querySelectorAll('option'))if(opt.value===value)opt.setAttribute('selected','');else opt.removeAttribute('selected');}});
const state=initial(),messages=[],listeners=[],context={fileKey:'["w","f"]',url:'https://app.weavy.ai/fixture'};
addRuns(state,[{workspaceId:'w',fileId:'f',runId:'r1',nodeId:'n1',fileName:'TEST file',nodeName:'Known node',model:'Known',status:'completed',createdAt:'2026-09-20T00:00:00Z',events:[{id:'tx1',kind:'debit',credits:100}]},{workspaceId:'w',fileId:'f',runId:'r2',nodeId:'n2',nodeName:'Unknown node',model:'Unknown',status:'completed',createdAt:'2026-09-20T00:00:00Z'},{workspaceId:'w',fileId:'f',runId:'r3',nodeId:'n3',model:'Estimated',status:'completed',createdAt:'2026-09-20T00:00:00Z'}]);
state.rates=[cleanRate({id:'t',model:'Estimated',unit:'run',rate:50,validFrom:'2026-01-01T00:00:00Z',source:'TEST ONLY',checkedAt:'2026-09-22T00:00:00Z'})];
let copied='';Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async t=>{copied=t;}}},configurable:true});
globalThis.chrome={runtime:{sendMessage:async m=>{messages.push(m);if(m.type==='get')return {state:structuredClone(state),context,bytes:1234};if(m.type==='settings')state.settings=cleanSettings({...state.settings,...m.settings});if(m.type==='mapping')state.mappings[m.model]=m.target;if(m.type==='assignModel'){const k=modelAssignmentKey(state.runs[m.key],m.scope);if(m.target)state.modelAssignments[k]=m.target;else delete state.modelAssignments[k];}if(m.type==='find')return {found:false,message:'Not rendered'};return {ok:true};},onMessage:{addListener:f=>listeners.push(f)}},storage:{session:{get:async()=>({})}},tabs:{query:async()=>[{id:5}]}};
const nativeTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...rest)=>{const t=nativeTimeout(fn,ms,...rest);if(ms>=1000)t.unref();return t;};
await import('../extension/panel.js');
const tick=()=>new Promise(r=>nativeTimeout(r,5));await tick();
const button=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label);
const click=async label=>{const b=button(label);assert.ok(b,'button '+label);b.click();await tick();};
test('report separates actual, estimate, default currency conversion and unknown costs',()=>{const t=document.querySelector('main').textContent;assert.ok(t.includes('100'));assert.ok(t.includes('≈ 50'));assert.ok(t.includes('1 записей без оценки'));assert.ok(t.includes('частичная'));assert.equal(document.querySelectorAll('.money strong')[0].textContent,'0,83');});
test('unpriced node has an immediately visible model field and saves without a dialog or apply button',async()=>{
 const box=document.querySelector('.model-fixes');assert.ok(box.textContent.includes('Unknown'));assert.equal(box.querySelector('button'),null);assert.ok(document.querySelector('#rows .row').textContent.includes('Unknown node'));
 const search=box.querySelector('[role=combobox]');search.onfocus();search.value='Estimated';search.oninput();box.querySelector('[role=option]').click();await tick();
 assert.equal(state.modelAssignments[modelAssignmentKey(state.runs['["w","r2"]'],'name')],'Estimated');assert.ok(document.querySelector('.model-fixes').textContent.includes('Оценка: 50 кр.'));assert.ok(document.querySelector('.model-fixes [role=combobox]').value==='Estimated');assert.ok(!document.querySelector('#rateDialog').open);
 assert.equal(messages.filter(m=>m.type==='assignModel').at(-1).scope,'name');
 const reset=document.querySelector('.model-fixes [role=combobox]');reset.onfocus();document.querySelector('.model-fixes [role=option]').click();await tick();assert.deepEqual(state.modelAssignments,{});
});
test('show node action is direct from run list',async()=>{await click('По запускам');await click('Показать в Weavy');assert.ok(messages.some(m=>m.type==='find'));assert.ok(document.querySelector('#message').textContent.includes('Not rendered'));});
test('individual generation model selection stays scoped to that generation',async()=>{
 const row=[...document.querySelectorAll('#rows .row')].find(r=>r.textContent.includes('Unknown node')),search=row.querySelector('[role=combobox]');search.onfocus();search.value='Estimated';search.oninput();row.querySelector('[role=option]').click();await tick();
 assert.equal(messages.filter(m=>m.type==='assignModel').at(-1).scope,'run');assert.equal(state.modelAssignments[modelAssignmentKey(state.runs['["w","r2"]'])],'Estimated');
 const updated=[...document.querySelectorAll('#rows .row')].find(r=>r.textContent.includes('Unknown node'));assert.ok(updated.textContent.includes('Выбрано вами: Estimated · для этой генерации'));updated.querySelector('[role=combobox]').onfocus();updated.querySelector('[role=option]').click();await tick();
});
test('clear file selection does not retain previous total',async()=>{await click('Сбросить выбор');assert.equal(document.querySelector('.total').firstChild.textContent,'—');await click('Только этот файл');assert.ok(document.querySelector('.total').textContent.includes('100'));});
test('summary includes currency assumptions and coverage',async()=>{await click('Копировать сводку');assert.ok(copied.includes('100'));assert.ok(copied.includes('Отдельная оценка: 50'));assert.ok(copied.includes('2/3'));assert.ok(copied.includes('1 USD = 84,0954 RUB'));});
test('theme toggles and settings contain required defaults',async()=>{document.querySelector('#theme').click();await tick();assert.ok(document.body.classList.contains('light'));await click('Настройки');assert.equal(document.querySelector('[name=fontSize]').value,'14');assert.equal(document.querySelector('[name=usdPer10k]').value,String(10000/120));assert.equal(document.querySelector('[name=rubPerUsd]').value,'84.0954');assert.ok(button('Сбросить положение панели'));});
test('data screen discloses unverified integration, supports diagnostics export',async()=>{await click('Данные');assert.ok(document.querySelector('main').textContent.includes('Для полного расхода за всё время ещё нужен источник сумм списаний'));assert.ok(button('Скачать диагностику'));assert.ok(button('Импорт JSON'));});
test('data screen presents direct diagnostic copying with its result status',()=>{const b=button('Копировать диагностику');assert.ok(b);assert.ok(b.classList.contains('primary'));assert.ok(document.querySelector('.diagnostics-copy-status[role=status]'));assert.ok(document.querySelector('main').textContent.includes('Ctrl+V'));});
test('saved history estimate and its money range replace the empty hero',async()=>{
 state.runs={};state.settings.usdPer10k=100;state.settings.rubPerUsd=90;
 addRuns(state,[{workspaceId:'w',fileId:'f',runId:'saved-result',nodeId:'saved-node',status:'completed',resultCount:1,native:{savedHistory:true,estimateModel:'ChatGPT Images 2.0 Edit',outputs:[]}}]);
 await click('Обновить');await click('Отчёт');
 assert.ok(document.querySelector('.total').textContent.includes('≈ 1–37'));
 assert.equal(document.querySelector('.money strong').textContent,'0,01–0,37');
 assert.ok(document.querySelector('main').textContent.includes('полнота истории не подтверждены'));
});
test('catalog contains built-in models, supports search and applies the chosen mapping',async()=>{
 await click('Настройки');await click('Добавить тариф');
 const search=document.querySelector('[name=catalogSearch]'),select=document.querySelector('[name=catalogModel]');
 assert.ok(select.querySelectorAll('option').length>=149);
 search.value='GPT Image 1 Edit';search.oninput();assert.ok(select.querySelectorAll('option').length>=2);
 document.querySelector('#rateBody [name=model]').value='V5.0 Pro';select.value='GPT Image 1 Edit';select.onchange();
 assert.match(document.querySelector('#rateBody').textContent,/проверено 2026-09-22/);
 await click('Использовать тарифы этой модели');assert.equal(state.mappings['V5.0 Pro'],'GPT Image 1 Edit');
});
test('manual edits switch currency presets and show automatic FX controls',async()=>{
 await click('Настройки');const plan=document.querySelector('[name=creditPlan]'),usd=document.querySelector('[name=usdPer10k]'),rub=document.querySelector('[name=rubPerUsd]');
 plan.value='starter';plan.onchange();assert.equal(usd.value,'100');
 usd.value='72';usd.oninput();assert.equal(plan.value,'custom');
 rub.value='91';rub.oninput();assert.equal(document.querySelector('[name=fxMode]').value,'manual');
 assert.ok(button('Обновить курс ЦБ'));
});
test('range records are visible as uncertain and excluded from the resolved progress bar',async()=>{
 await click('Отчёт');
 assert.ok(document.querySelector('main').textContent.includes('только диапазон'));
 assert.ok(button('Показать, что уточнить'));
 assert.ok(button('Скачать проверку расчёта'));
 assert.equal(document.querySelector('.progress i').style.width,'0%');
 await click('Показать, что уточнить');assert.ok(document.querySelector('#rows').textContent.includes('В истории нет: Quality'));
});
test('run report exposes the model and tariff evidence without requiring raw JSON',async()=>{
 assert.ok(document.querySelector('#rows').textContent.includes('Проверка расчёта'));
 assert.ok(document.querySelector('#rows').textContent.includes('Модель в истории: не указана'));
 assert.ok(document.querySelector('#rows').textContent.includes('Тариф: найден'));
});
test('report has no dedicated money tariff button and package conversion stays in settings',async()=>{
 await click('Отчёт');assert.equal(document.querySelector('#quick-plan'),null);assert.equal(document.querySelector('.plan-card'),null);assert.equal(button('Изменить тариф'),undefined);await click('Настройки');
 const price=document.querySelector('[name=packagePrice]'),credits=document.querySelector('[name=packageCredits]'),plan=document.querySelector('[name=creditPlan]');
 plan.value='custom';plan.onchange();price.value='25';credits.value='2500';credits.oninput();
 assert.equal(document.querySelector('[name=usdPer10k]').value,'100');
 assert.ok(document.querySelector('.money-result').textContent.includes('10 USD'));
});
test('model catalog searches aliases and has independent name and price sorting',async()=>{
 await click('Тарифы моделей');const search=document.querySelector('[name=catalogBrowse]');search.value='nano banana';search.oninput();
 assert.ok(document.querySelectorAll('.catalog-item').length>=2);
 const sort=document.querySelector('[aria-label="Сортировка"]');sort.value='name-desc';sort.onchange();
 const names=[...document.querySelectorAll('.catalog-item h3')].map(e=>e.textContent);
 assert.deepEqual(names,[...names].sort((a,b)=>b.localeCompare(a,'ru',{numeric:true,sensitivity:'base'})));
});
test('simple custom model price exposes output unit, scope and optional parameter conditions',async()=>{
 await click('✏️ Изменить');
 assert.ok(document.querySelector('[name=rate]'));assert.equal(document.querySelector('[name=unit]').value,'result');
 assert.ok(document.querySelector('[name=resolution]'));assert.ok(document.querySelector('[name=quality]'));assert.ok(document.querySelector('[name=allowUndated]'));
 document.querySelector('#rateDialog').close();
});
test('many unknown nodes stay searchable and model names are alphabetized in the inline field',async()=>{
 state.runs={};addRuns(state,Array.from({length:200},(_,i)=>({workspaceId:'w',fileId:'f',runId:'large-'+i,nodeId:'node-'+i,nodeName:'Unknown node '+i,model:'Imported '+i,status:'completed',resultCount:1,native:{savedHistory:true}})));
 await click('Данные');await click('Обновить');await click('Отчёт');await click('По нодам');assert.equal(document.querySelectorAll('.model-fix').length,6);assert.equal(document.querySelectorAll('#rows>.row').length,150);
 const search=document.querySelector('[name=fixesSearch]');search.value='node 199';search.oninput();assert.equal(document.querySelectorAll('.model-fix').length,1);assert.ok(document.querySelector('.model-fix').textContent.includes('Imported 199'));
 const picker=document.querySelector('.model-fix [role=combobox]');picker.onfocus();const names=[...document.querySelectorAll('.model-fix .model-option-name')].map(n=>n.textContent);assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true,sensitivity:'base'})));picker.onblur();search.value='';search.oninput();
});
test('background history updates do not close the inline model search while typing',async()=>{
 const search=document.querySelector('.model-fix [role=combobox]');search.onfocus();search.value='nano banana';search.oninput();listeners[0]({type:'changed'});await new Promise(r=>nativeTimeout(r,210));
 assert.ok(search.isConnected);assert.equal(search.value,'nano banana');assert.ok(document.querySelector('.model-fix [role=listbox]').textContent.includes('Nano Banana'));search.onblur();await tick();
});
test('matching names from several nodes share one visible picker and one selection recalculates the group',async()=>{
 state.runs={};state.modelAssignments={};
 addRuns(state,[{workspaceId:'w',fileId:'f',runId:'common-a',nodeId:'common-n1',nodeName:'First node',model:'Imported V5.0 Edit',status:'completed',resultCount:1},{workspaceId:'w',fileId:'f',runId:'common-b',nodeId:'common-n2',nodeName:'Second node',model:'Imported 5 Edit',status:'completed',resultCount:1},{workspaceId:'w2',fileId:'f2',runId:'common-c',nodeId:'common-n3',model:'IMPORTED V5 EDIT',status:'completed',resultCount:1}]);
 await click('Данные');await click('Обновить');await click('Отчёт');assert.equal(document.querySelectorAll('.model-fix').length,1);const box=document.querySelector('.model-fix');assert.match(box.textContent,/Нод: 2 · генераций: 2/);assert.match(box.textContent,/во всех сохранённых файлах/i);assert.match(box.textContent,/нод: 3/i);
 const search=box.querySelector('[role=combobox]');search.onfocus();search.value='Recraft V3';search.oninput();box.querySelector('[role=option]').click();await tick();assert.equal(messages.filter(m=>m.type==='assignModel').at(-1).scope,'name');assert.equal(document.querySelector('.total').firstChild.textContent,'≈ 10');assert.equal(state.modelAssignments[modelAssignmentKey(state.runs['["w2","common-c"]'],'name')],'Recraft V3');
});
test('old Seedream hint is priced automatically and unrelated minor version is offered similar models first',async()=>{
 state.runs={};state.modelAssignments={};addRuns(state,[{workspaceId:'w',fileId:'f',runId:'seedream-known',nodeId:'seedream-node',status:'completed',resultCount:1,native:{savedHistory:true,modelHint:'Seedream V5.0 Edit'}},{workspaceId:'w',fileId:'f',runId:'seedream-new',nodeId:'seedream-new-node',model:'Seedream V5.1 Edit',status:'completed',resultCount:1,native:{savedHistory:true}}]);
 await click('Данные');await click('Обновить');await click('Отчёт');assert.equal(document.querySelector('.total').firstChild.textContent,'≈ 4');assert.equal(document.querySelectorAll('.model-fix').length,1);const input=document.querySelector('.model-fix [role=combobox]');input.onfocus();assert.equal(document.querySelector('.model-fix .model-option-name').textContent,'Seedream V5 Edit');assert.match(document.querySelector('.model-fix [aria-live]').textContent,/выберите/);assert.deepEqual(state.modelAssignments,{});input.onblur();
});
test('catalog finds formatted model IDs and retains derived variants in the official-source filter',async()=>{
 await click('Тарифы моделей');const search=document.querySelector('[name=catalogBrowse]');search.value='sora_2_pro';search.oninput();
 const source=document.querySelector('[aria-label="Источник тарифа"]');source.value='official-help';source.onchange();assert.equal(document.querySelector('.catalog-item h3').textContent,'Sora 2 Pro');assert.match(document.querySelector('.catalog-item').textContent,/288/);
});
test('conflicting historical model evidence asks for one generation while source-price conflicts stay visible',async()=>{
 state.runs={};state.modelAssignments={};state.mappings={};
 addRuns(state,[{workspaceId:'w',fileId:'f',runId:'model-conflict',nodeId:'conflicting-node',model:'Seedream V5 Edit',status:'completed',resultCount:1,native:{outputs:[{id:'o',model:'GPT Image 1 Edit',parameters:{}}]}},{workspaceId:'w',fileId:'f',runId:'price-conflict',nodeId:'price-node',model:'Gemini 3 Pro',status:'completed',resultCount:1,parameters:{resolution:'2K'}}]);
 await click('Данные');await click('Обновить');await click('Отчёт');assert.match(document.querySelector('main').textContent,/Источники цены расходятся/);
 const box=document.querySelector('.model-fix');assert.match(box.textContent,/Модель этой генерации/);const input=box.querySelector('[role=combobox]');input.onfocus();input.value='Recraft V3';input.oninput();box.querySelector('[role=option]').click();await tick();assert.equal(messages.filter(m=>m.type==='assignModel').at(-1).scope,'run');
 const corrected=[...document.querySelectorAll('.model-fix')].find(b=>b.textContent.includes('Модель этой генерации'));assert.ok(corrected,'the corrected conflict remains available for another choice');assert.equal(corrected.querySelector('[role=combobox]').value,'Recraft V3');assert.match(corrected.textContent,/Только эта генерация/);
});
test('catalog pagination reaches every entry and resets when searching',async()=>{
 await click('Тарифы моделей');const source=document.querySelector('[aria-label="Источник тарифа"]');source.value='all';source.onchange();const search=document.querySelector('[name=catalogBrowse]');search.value='';search.oninput();
 assert.equal(document.querySelectorAll('.catalog-item').length,150);document.querySelector('.catalog-list .load-more').click();
 assert.equal(document.querySelectorAll('.catalog-item').length,catalogEntries().length+state.rates.length);assert.equal(document.querySelector('.catalog-list .load-more'),null);
 search.value='seedream';search.oninput();assert.ok(document.querySelectorAll('.catalog-item').length<150);search.value='';search.oninput();assert.equal(document.querySelectorAll('.catalog-item').length,150);
});
test('report pagination exposes groups and generations beyond the first page',async()=>{
 state.runs={};state.modelAssignments={};addRuns(state,Array.from({length:310},(_,i)=>({workspaceId:'w',fileId:'f',runId:'paged-'+i,nodeId:'paged-node-'+i,nodeName:'Paged '+i,model:'Unrecognized model',status:'completed',resultCount:1})));
 await click('Данные');await click('Обновить');await click('Отчёт');await click('По нодам');assert.equal(document.querySelectorAll('#rows>.row').length,150);
 document.querySelector('#rows>.load-more').click();assert.equal(document.querySelectorAll('#rows>.row').length,300);document.querySelector('#rows>.load-more').click();assert.equal(document.querySelectorAll('#rows>.row').length,310);
 const search=document.querySelector('[name=filter]');search.value='Paged 309';search.oninput();assert.equal(document.querySelectorAll('#rows>.row').length,1);search.value='';search.oninput();assert.equal(document.querySelectorAll('#rows>.row').length,150);
 await click('По запускам');assert.equal(document.querySelectorAll('#rows>.row').length,250);document.querySelector('#rows>.load-more').click();assert.equal(document.querySelectorAll('#rows>.row').length,310);
});
test('compact disclosure controls retain calculation facts and selected file count',async()=>{
 assert.equal(document.querySelector('.calculation-details').hasAttribute('open'),false);assert.match(document.querySelector('.calculation-details').textContent,/История: частичная/);
 assert.match(document.querySelector('.file-picker summary').textContent,/1 из/);assert.ok(document.querySelector('.file-picker .file input').checked);
 await click('Настройки');for(const a of document.querySelectorAll('.settings-links a'))assert.ok(document.querySelector(a.getAttribute('href')));
});
