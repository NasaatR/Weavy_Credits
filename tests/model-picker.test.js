import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {modelPicker,modelMenuPosition} from '../extension/model-picker.js';
const {window,document}=parseHTML('<html><body></body></html>');globalThis.document=document;
const entries=[{name:'Gemini Nano Banana',model:'Gemini',aliases:['fal-ai/nano-banana'],hint:'По параметрам'},{name:'Recraft V3',model:'Recraft',aliases:[],hint:'5 кр.'}];
const setup=({onSelect=async()=>{},value='',...options}={})=>{const box=modelPicker({entries,value,onSelect,...options});document.body.replaceChildren(box);return {box,input:box.querySelector('input'),list:box.querySelector('[role=listbox]')};};
const tick=()=>new Promise(r=>setTimeout(r,1));
const key=(input,key)=>{const e=new window.Event('keydown');e.key=key;e.preventDefault=()=>{};input.onkeydown(e);};

test('one field searches aliases and saves the clicked model without extra buttons',async()=>{
 const selected=[],h=setup({onSelect:async target=>selected.push(target)});h.input.onfocus();h.input.value='fal-ai/nano';h.input.oninput();
 assert.equal(h.list.querySelectorAll('[role=option]').length,1);h.list.querySelector('[role=option]').click();await tick();assert.deepEqual(selected,['Gemini']);assert.equal(h.input.value,'Gemini');assert.equal(h.input.getAttribute('aria-expanded'),'false');assert.equal(h.box.querySelector('button'),null);
});

test('arrow keys and Enter choose a model; typed text alone is never saved',async()=>{
 const selected=[],h=setup({onSelect:async target=>selected.push(target)});h.input.onfocus();key(h.input,'ArrowUp');assert.ok(h.input.getAttribute('aria-activedescendant').endsWith('-1'));key(h.input,'Enter');await tick();assert.deepEqual(selected,['Recraft']);
 h.input.onfocus();h.input.value='Invented model';h.input.oninput();h.input.onblur();assert.deepEqual(selected,['Recraft']);assert.equal(h.input.value,'Recraft');
});

test('reset is another option in the same field and Escape does not apply a choice',async()=>{
 const selected=[],h=setup({value:'Recraft',onSelect:async target=>selected.push(target)});h.input.onfocus();key(h.input,'Escape');assert.equal(h.list.hidden,true);assert.deepEqual(selected,[]);
 h.input.onfocus();h.list.querySelector('[role=option]').click();await tick();assert.deepEqual(selected,[null]);assert.equal(h.input.value,'');
});

test('save errors retain the choice and duplicate clicks cannot submit twice',async()=>{
 let done,calls=0;const h=setup({value:'Recraft',onSelect:()=>{calls++;return new Promise((resolve,reject)=>done=reject);}});h.input.onfocus();
 const option=h.list.querySelectorAll('[role=option]')[1];option.click();option.click();assert.equal(calls,1);assert.equal(h.input.disabled,true);
 done(Error('Storage unavailable'));await tick();assert.equal(h.input.value,'Recraft');assert.equal(h.input.disabled,false);assert.match(h.box.querySelector('[aria-live]').textContent,/Storage unavailable/);
});
test('opening a field puts related names first; a typo shows a question without auto-saving',()=>{
 const selected=[],choices=[{name:'AAA Unrelated',model:'Other'},{name:'Seedream V4.5 Edit',model:'Seedream V4.5 Edit'},{name:'Seedream V5 Edit',model:'Seedream V5 Edit'}];
 const h=setup({entries:choices,suggestedFor:'Seedream 5.0 Editt',onSelect:async target=>selected.push(target)});h.input.onfocus();assert.equal(h.list.querySelector('.model-option-name').textContent,'Seedream V5 Edit');assert.deepEqual(selected,[]);
 assert.match(h.box.querySelector('[aria-live]').textContent,/выберите/);h.input.value='Seedream 5.0 Editt';h.input.oninput();assert.equal(h.list.querySelector('.model-option-name').textContent,'Seedream V5 Edit');
});
test('ambiguous aliases explicitly ask which model was used',()=>{
 const h=setup({suggestedFor:'same v5.0 edit',entries:[{name:'A',model:'A',aliases:['same v5 edit']},{name:'B',model:'B',aliases:['same 5.0 edit']}]});h.input.onfocus();assert.match(h.box.querySelector('[aria-live]').textContent,/какая модель/);assert.equal(h.list.querySelectorAll('[role=option]').length,2);
});
test('menu flips upward at the bottom and stays inside a narrow viewport',()=>{
 const p=modelMenuPosition({top:500,bottom:540,left:290,width:280},{width:360,height:600},300);
 assert.equal(p.placement,'above');assert.ok(p.left+p.width<=352);assert.ok(p.top>=8);assert.ok(p.top+300<500);
 const small=modelMenuPosition({top:20,bottom:60,left:5,width:200},{width:260,height:130},300);assert.equal(small.placement,'below');assert.ok(small.maxHeight<=56);assert.ok(small.width<=244);
});
test('typing an exact identity supports Enter while a fuzzy suggestion still requires selection',async()=>{
 const selected=[],h=setup({onSelect:async value=>selected.push(value)});h.input.onfocus();h.input.value='Recraft';h.input.oninput();key(h.input,'Enter');await tick();assert.deepEqual(selected,['Recraft']);
 h.input.onfocus();h.input.value='Recraftt';h.input.oninput();key(h.input,'Enter');await tick();assert.deepEqual(selected,['Recraft']);
});
test('only one model menu remains open and pointer highlight clears the previous option',()=>{
 const a=setup();a.input.onfocus();const b=modelPicker({entries,onSelect:async()=>{}});document.body.append(b);b.querySelector('input').onfocus();assert.equal(a.list.hidden,true);
 const choices=b.querySelectorAll('[role=option]');choices[0].onpointermove();choices[1].onpointermove();assert.equal(choices[0].classList.contains('focused'),false);assert.equal(choices[1].classList.contains('focused'),true);
 b.querySelector('input').onblur();
});
test('node context ranks a generic label but an explicit new search takes precedence',()=>{
 const selected=[],h=setup({entries:[{name:'AAA Other',model:'Other'},{name:'Seedream V5 Edit',model:'Seedream V5 Edit'},{name:'Recraft V3',model:'Recraft V3'}],suggestedFor:'V5.0 Pro',suggestionHints:['fal-ai/bytedance/seedream/v5/lite/edit'],onSelect:async v=>selected.push(v)});
 h.input.onfocus();assert.equal(h.list.querySelector('.model-option-name').textContent,'Seedream V5 Edit');assert.deepEqual(selected,[]);
 h.input.value='Recraft';h.input.oninput();assert.equal(h.list.querySelector('.model-option-name').textContent,'Recraft V3');assert.deepEqual(selected,[]);
});
test('an absent model family still warns instead of implying the first option is a match',()=>{
 const selected=[],h=setup({suggestedFor:'Unlisted text model',onSelect:async v=>selected.push(v)});h.input.onfocus();assert.match(h.box.querySelector('[aria-live]').textContent,/Точного совпадения нет/);key(h.input,'Enter');assert.deepEqual(selected,[]);
});
