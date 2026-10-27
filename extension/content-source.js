import {APPEARANCE} from './appearance.js';
import {fileKey,summarize,reportTotal,money,safeUrl} from './core.js';
import {effectiveMoneySettings} from './currency.js';
import {attachDockDrag} from './dock-drag.js';
import {createCaptureGate} from './capture-gate.js';
import DOCK_CSS from './appearance.css';
(()=>{
 let state=null,ctx=null,lastUrl='',host,root,dock,loading=false,timer,dragging,findTimer,deferredRender=false,localPosition=null,positionAcknowledged=false,routeSequence=0,view;const badges=new Map(),invalidatedLabels=new WeakMap();
 const send=async m=>{try{const r=await chrome.runtime.sendMessage(m);if(r?.error)throw Error(r.error);return r;}catch(e){if(dock)dock.title='Расширение: '+e.message;return null;}};
 const capture=createCaptureGate(send);
 let captureChain=Promise.resolve(),inFlight=0;
 window.addEventListener('message',e=>{if(e.source!==window||e.origin!==location.origin||e.data?.channel!=='weavy-credits-observation-v1')return;const d=e.data;if(inFlight>2000||JSON.stringify(d).length>700000)return;inFlight++;captureChain=captureChain.then(()=>capture({type:'capture',shape:d.shape,signature:d.signature,transport:d.transport,profileId:d.profileId,runs:d.runs,native:d.native,pageUrl:d.pageUrl,endpoint:d.endpoint})).catch(()=>null).finally(()=>inFlight--);});
 function button(label,fn,title){const b=document.createElement('button');const glyph=document.createElement('span');glyph.className='wcr-glyph';glyph.textContent=label;b.append(glyph);b.title=title||label;b.setAttribute('aria-label',title||label);b.addEventListener('click',e=>{if(dragging?.suppressClick){e.preventDefault();e.stopPropagation();return;}fn();});return b;}
 function mount(){if(host||!document.body)return;host=document.createElement('div');host.id='weavy-credits-extension';root=host.attachShadow({mode:'closed'});const style=document.createElement('style');style.textContent=':host{all:initial}*{box-sizing:border-box}.dock{position:fixed;z-index:2147483646;display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--bg);color:var(--fg);border:1px solid var(--border);border-radius:13px;box-shadow:0 5px 24px #0004;font:14px/1.35 system-ui,sans-serif;white-space:nowrap;user-select:none;touch-action:none;max-width:calc(100vw - 8px);overflow:auto}.dock button{font:inherit;color:inherit;border:0;background:transparent;border-radius:6px;padding:5px;cursor:pointer}.dock button:hover{background:#8882}.value{font-weight:650;color:var(--accent)}.muted{opacity:.75}.sep{height:20px;width:1px;background:var(--border)}.highlight{position:fixed;border:3px solid var(--accent,#C9F28B);border-radius:12px;pointer-events:none;z-index:2147483645;box-shadow:0 0 0 4px #0005}.notice{position:fixed;bottom:22px;left:22px;max-width:440px;background:#23252b;color:#fafafa;border:1px solid #555;padding:14px;border-radius:12px;z-index:2147483647;font:14px/1.5 system-ui}';style.textContent=style.textContent+DOCK_CSS;root.append(style);dock=document.createElement('div');dock.className='dock';root.append(dock);document.documentElement.append(host);
 const handle=document.createElement('span');handle.className='dock-handle';handle.textContent='⠿';handle.title='Переместить панель';
 const credits=document.createElement('span');credits.className='value';const usd=document.createElement('span'),rub=document.createElement('span');usd.className=rub.className='muted';
 const sep=document.createElement('span');sep.className='sep';const report=button('📊',()=>send({type:'open',view:'report'}),'Отчёт');report.dataset.wcrRole='primary';
 dock.append(handle,credits,usd,rub,sep,report,button('⚙️',()=>send({type:'open',view:'settings'}),'Настройки'));view={credits,usd,rub};
 dragging=attachDockDrag({dock,viewport:()=>({width:innerWidth,height:innerHeight}),save:point=>{localPosition=point;positionAcknowledged=false;if(state)state.settings.position=point;send({type:'position',position:point}).then(reply=>{positionAcknowledged=!!reply;});},onEnd:()=>{if(deferredRender){deferredRender=false;render();}}});
 window.addEventListener('resize',()=>{if(dock&&!dragging.active){const r=dock.getBoundingClientRect();place(r.left,r.top);}});

 }
 function place(x,y){if(!dock)return;const r=dock.getBoundingClientRect();dock.style.left=Math.max(4,Math.min(innerWidth-r.width-4,x))+'px';dock.style.top=Math.max(4,Math.min(innerHeight-r.height-4,y))+'px';}
 const numberFormat=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}),fmt=v=>numberFormat.format(v);
 const setText=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
 function render(){mount();if(!dock||!state)return;if(dragging.active){deferredRender=true;return;}const s=state.settings;APPEARANCE.apply(dock,s.appearance);host.style.setProperty('--accent',APPEARANCE.normalize(s.appearance).accentColor);dock.style.transform='scale('+s.panelScale+')';dock.style.transformOrigin='top left';dock.style.maxWidth=(innerWidth-8)/s.panelScale+'px';dock.style.display=s.dock?'flex':'none';
 const fk=ctx?.fileKey,rr=state.runs.filter(r=>fileKey(r)===fk),sum=summarize(rr,state.rates||[],state.mappings||{},state.modelAssignments||{}),value=reportTotal(sum);
 const label=sum.estimateCount?'Оценка ≈':sum.actualCount?'Факт':'Нет данных';setText(view.credits,value===null?'Кредиты —':label+' '+fmt(value)+(sum.unknown?' + ?':''));view.credits.hidden=!s.showCredits;
 const m=value===null?{usd:null,rub:null}:money(value,effectiveMoneySettings(s,rr.map(r=>r.workspaceId),state.accountPrices||{}));
 for(const [node,shown,n,suffix]of [[view.usd,s.showUsd,m.usd,'USD'],[view.rub,s.showRub,m.rub,'RUB']]){node.hidden=!shown;setText(node,(n===null?'—':fmt(n))+' '+suffix);}
 dock.title=fk?'Подтверждено списанием: '+sum.actualCount+'; одной суммой по тарифу: '+sum.singleCount+'; диапазон: '+sum.rangeCount+'; без оценки: '+sum.unknown+'. Для диапазонов показана середина. Подробности — в отчёте.':'Файл ещё не определён. Откройте отчёт для диагностики.';
 const p=localPosition||s.position||{x:Math.max(8,innerWidth-dock.getBoundingClientRect().width-24),y:innerHeight-75};place(p.x,p.y);
 }
 async function route(force=false){const url=location.origin+location.pathname;if(url===lastUrl&&!force)return;const changed=url!==lastUrl;lastUrl=url;const sequence=++routeSequence;if(changed){ctx=null;render();}const found=await send({type:'route',url,title:document.title});if(sequence!==routeSequence||url!==location.origin+location.pathname)return;ctx=found;render();}
 async function refresh(){if(loading)return;loading=true;const mayAcceptPosition=positionAcknowledged;try{const r=await send({type:'hello'});if(r){state=r;if(mayAcceptPosition&&positionAcknowledged&&!dragging?.active)localPosition=null;window.postMessage({channel:'weavy-credits-config-v1',profiles:r.profiles},location.origin);await route(true);}}finally{loading=false;}}
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{if(m.type==='changed'){clearTimeout(timer);timer=setTimeout(refresh,150);}if(m.type==='find'){reply(findNode(m));}});
 function notice(message){const el=document.createElement('div');el.className='notice';el.textContent=message;root.append(el);setTimeout(()=>el.remove(),12000);}
 function findNode(m){mount();if(safeUrl(location.href)!==m.fileUrl)return {found:false,message:'Открыт другой файл; навигация остановлена.'};const name=m.nodeName||'Без имени';if(!m.nodeId){const message='ID ноды отсутствует. Ориентир: '+name;notice(message);return {found:false,message};}
 // Best-effort DOM fallback. No React internals or guessed canvas API.
 const esc=CSS.escape(m.nodeId),el=document.querySelector('[data-node-id="'+esc+'"], .react-flow__node[data-id="'+esc+'"]');
 if(!el){const message='Точная нода не отрисована или удалена. Поиск/масштабирование canvas пока не подтверждены. '+name+' · ID: '+m.nodeId;notice(message);return {found:false,message};}
 const r=el.getBoundingClientRect();if(r.width<=0||r.height<=0||r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight){const message='Нода есть в DOM, но находится за экраном. Используйте поиск Weavy: '+name+' · '+m.nodeId;notice(message);return {found:false,message};}
 const glow=document.createElement('div');glow.className='highlight';root.append(glow);let frame;const track=()=>{if(!el.isConnected){glow.remove();return;}const r=el.getBoundingClientRect();glow.style.left=Math.max(3,r.left-7)+'px';glow.style.top=Math.max(3,r.top-7)+'px';glow.style.width=Math.max(0,Math.min(innerWidth-3,r.right+7)-Math.max(3,r.left-7))+'px';glow.style.height=Math.max(0,Math.min(innerHeight-3,r.bottom+7)-Math.max(3,r.top-7))+'px';frame=requestAnimationFrame(track);};track();clearTimeout(findTimer);setTimeout(()=>{cancelAnimationFrame(frame);glow.remove();},8000);return {found:true,message:'Подсвечен элемент с точным ID '+m.nodeId+'. Центрирование canvas пока недоступно.'};
 }
 function clearBadges(){for(const [b,badge]of badges){badge.remove();}badges.clear();}
 function prices(){if(!state?.settings.showPreview){clearBadges();return;}for(const [b,badge]of badges)if(!b.isConnected||badge.dataset.signature!==(b.getAttribute('aria-label')||'')){badge.remove();badges.delete(b);}
 // Only mirror a price explicitly included in the same run button's accessible label.
 for(const b of document.querySelectorAll('button[aria-label]')){const label=b.getAttribute('aria-label')||'';if(invalidatedLabels.get(b)===label||!/run|generate|запуст|генер/i.test(label)||!/(\d+(?:[.,]\d+)?)\s*(credits?|кредит)/i.test(label)||badges.has(b))continue;const match=label.match(/(\d+(?:[.,]\d+)?)\s*(credits?|кредит)/i);const badge=document.createElement('span');badge.textContent=' ≈ '+match[1]+' кр.';badge.title='Предварительная цена из подписи Weavy; не списание';badge.dataset.signature=label;badge.style.cssText='display:inline-block;font:12px system-ui;color:#95bb62;margin:0 5px;pointer-events:none';b.after(badge);badges.set(b,badge);}
 }
 function invalidatePrices(e){if(e?.target===host)return;for(const b of document.querySelectorAll('button[aria-label]'))invalidatedLabels.set(b,b.getAttribute('aria-label')||'');clearBadges();}
 document.addEventListener('input',invalidatePrices,true);document.addEventListener('change',invalidatePrices,true);document.addEventListener('pointerdown',invalidatePrices,true);
 const start=async()=>{mount();await refresh();const pending=await send({type:'pending'});if(pending)setTimeout(()=>findNode(pending),1200);setInterval(()=>{route();prices();},1000);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
