import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {diagnosticsCopy} from '../extension/diagnostics-copy.js';
const {window,document}=parseHTML('<html><body></body></html>');
Object.assign(globalThis,{window,document});
window.HTMLElement.prototype.showModal=function(){this.open=true;};
window.HTMLElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
const data={version:'fixture',schemas:[],native:{},analysis:{coverage:'partial'}};
const clipboard=value=>Object.defineProperty(globalThis,'navigator',{value:{clipboard:value},configurable:true});
const component=(getDiagnostics=async()=>structuredClone(data),download=()=>{})=>{document.body.replaceChildren();const c=diagnosticsCopy({getDiagnostics,download});document.body.append(c.button,c.status);return c;};
test('one click copies the complete worker export and only then reports success',async()=>{
 let written,finish;clipboard({writeText:text=>{written=text;return new Promise(r=>finish=r);}});const c=component();
 const pending=c.button.onclick();await Promise.resolve();assert.deepEqual(JSON.parse(written),data);assert.equal(c.button.disabled,true);assert.ok(!c.status.textContent.includes('скопирована'));
 finish();await pending;assert.match(c.status.textContent,/скопирована.*Ctrl\+V/);assert.equal(c.button.disabled,false);assert.equal(document.querySelector('dialog'),null);
});
test('rapid repeated clicks share one diagnostic request and one clipboard write',async()=>{
 let resolve,calls=0,writes=0;clipboard({writeText:async()=>{writes++;}});const c=component(()=>{calls++;return new Promise(r=>resolve=r);});
 const first=c.button.onclick();await c.button.onclick();assert.equal(calls,1);resolve(data);await first;assert.equal(writes,1);
});
test('a denied clipboard opens intact JSON and retry uses a fresh click without refetching',async()=>{
 let calls=0,written;clipboard({writeText:async()=>{throw Error('NotAllowedError');}});const c=component(async()=>{calls++;return data;});await c.button.onclick();
 const dialog=document.querySelector('.diagnostics-dialog');assert.ok(dialog.open);assert.deepEqual(JSON.parse(dialog.querySelector('textarea').value),data);assert.match(c.status.textContent,/Автокопирование недоступно/);
 clipboard({writeText:async text=>{written=text;}});await [...dialog.querySelectorAll('button')].find(b=>b.textContent==='Копировать ещё раз').onclick();
 assert.deepEqual(JSON.parse(written),data);assert.equal(calls,1);assert.equal(document.querySelector('dialog'),null);assert.match(c.status.textContent,/скопирована/);
});
test('without a clipboard API the manual dialog keeps a downloadable full JSON',async()=>{
 let saved;clipboard(undefined);const c=component(undefined,(name,text)=>saved={name,text});await c.button.onclick();
 const dialog=document.querySelector('dialog'),area=dialog.querySelector('textarea');assert.ok(area.hasAttribute('readonly'));assert.deepEqual(JSON.parse(area.value),data);
 [...dialog.querySelectorAll('button')].find(b=>b.textContent==='Скачать JSON').onclick();assert.equal(saved.name,'weavy-credits-diagnostics.json');assert.deepEqual(JSON.parse(saved.text),data);
 dialog.querySelector('button:last-child').onclick();assert.equal(document.querySelector('dialog'),null);
});
test('worker failure never overwrites the clipboard or reports a successful copy',async()=>{
 let writes=0;clipboard({writeText:async()=>{writes++;}});const c=component(async()=>{throw Error('Worker stopped');});await c.button.onclick();
 assert.equal(writes,0);assert.equal(c.button.disabled,false);assert.match(c.status.textContent,/Не удалось получить/);assert.equal(document.querySelector('dialog'),null);
});
