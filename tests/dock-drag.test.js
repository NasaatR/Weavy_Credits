import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {attachDockDrag} from '../extension/dock-drag.js';
function harness(){
 const {window,document}=parseHTML('<html><body><div id="dock"><span>credits</span><button>report</button></div></body></html>');globalThis.window=window;
 const dock=document.querySelector('#dock'),frames=new Map(),saved=[],captured=[];let id=0,reads=0,time=0;
 dock.getBoundingClientRect=()=>{reads++;return {left:20,top:30,width:200,height:50};};dock.setPointerCapture=p=>captured.push(p);dock.releasePointerCapture=()=>{};
 const control=attachDockDrag({dock,viewport:()=>({width:600,height:400}),save:p=>saved.push(p),now:()=>time,requestFrame:f=>{frames.set(++id,f);return id;},cancelFrame:i=>frames.delete(i)});
 const event=(target,type,props={})=>{const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{button:0,pointerId:1,clientX:40,clientY:50},props);target.dispatchEvent(e);};
 return {window,dock,control,frames,saved,captured,event,reads:()=>reads,tick:()=>{const all=[...frames.values()];frames.clear();all.forEach(f=>f());},advance:()=>time+=121};
}
test('many pointer events share one visual frame and persist only on release',()=>{
 const h=harness();h.event(h.dock.querySelector('span'),'pointerdown');for(let i=0;i<100;i++)h.event(h.window,'pointermove',{clientX:50+i,clientY:60+i});
 assert.equal(h.frames.size,1);assert.equal(h.reads(),1);assert.equal(h.saved.length,0);h.tick();assert.equal(h.dock.style.translate,'109px 109px');
 h.event(h.window,'pointerup');assert.deepEqual(h.saved,[{x:129,y:139}]);assert.equal(h.dock.style.translate,'');assert.equal(h.control.active,false);assert.equal(h.control.suppressClick,true);h.advance();assert.equal(h.control.suppressClick,false);
});
test('buttons remain clickable and a different pointer cannot take over the drag',()=>{
 const h=harness();h.event(h.dock.querySelector('button'),'pointerdown');assert.equal(h.control.active,false);
 h.event(h.dock,'pointerdown');h.event(h.window,'pointermove',{pointerId:2,clientX:400});assert.equal(h.frames.size,0);assert.deepEqual(h.captured,[1]);h.event(h.window,'pointerup',{pointerId:2});assert.equal(h.control.active,true);h.event(h.window,'pointerup');assert.equal(h.saved.length,0);
});
test('cancel commits the last clamped point once and clears the translation',()=>{
 const h=harness();h.event(h.dock,'pointerdown');h.event(h.window,'pointermove',{clientX:1000,clientY:1000});h.event(h.window,'pointercancel');
 assert.deepEqual(h.saved,[{x:396,y:346}]);assert.equal(h.frames.size,0);assert.equal(h.dock.style.translate,'');h.event(h.dock,'lostpointercapture');assert.equal(h.saved.length,1);
});
