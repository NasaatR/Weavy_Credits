import {findModelMatch,modelIdentity,rankModels} from './model-matching.js';
let nextId=0;
let closeActive=null;

export function modelMenuPosition(anchor,viewport,desiredHeight=300){
 const margin=8,gap=6,width=Math.min(Math.max(anchor.width,240),Math.max(0,viewport.width-margin*2));
 const below=Math.max(0,viewport.height-anchor.bottom-gap-margin),above=Math.max(0,anchor.top-gap-margin);
 const up=below<Math.min(desiredHeight,180)&&above>below,maxHeight=Math.min(300,up?above:below);
 const height=Math.min(desiredHeight,maxHeight),left=Math.min(Math.max(margin,anchor.left),Math.max(margin,viewport.width-width-margin));
 return {left,top:up?Math.max(margin,anchor.top-gap-height):Math.min(anchor.bottom+gap,Math.max(margin,viewport.height-height-margin)),width,maxHeight,placement:up?'above':'below'};
}

// A single searchable field. Picking an option saves immediately; free text
// never becomes a model assignment.
export function modelPicker({entries,value='',fallbackValue='',suggestedFor='',suggestionHints=[],label='Модель для расчёта',onSelect,onClose=()=>{}}){
 const make=(tag,attrs={},text='')=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;};
 const id='model-picker-'+(++nextId),box=make('div',{class:'model-picker'}),caption=make('label',{for:id,class:'model-picker-label'},label);
 const search=make('input',{id,type:'search',role:'combobox','aria-autocomplete':'list','aria-expanded':'false','aria-controls':id+'-list','aria-describedby':id+'-status',autocomplete:'off',placeholder:'Найти и выбрать модель…'});
 const control=make('div',{class:'model-picker-control'}),list=make('div',{id:id+'-list',class:'model-options',role:'listbox','aria-label':'Модели по названию'}),status=make('div',{id:id+'-status',class:'model-picker-status','aria-live':'polite'});
 list.hidden=true;search.value=value||fallbackValue;
 const automatic={name:'Определять автоматически',model:'',hint:'Убрать это уточнение',aliases:[]};
 let matches=[],options=[],active=-1,saving=false,restoreFocus=false,listening=false;
 const viewport=()=>({width:globalThis.window?.visualViewport?.width||globalThis.window?.innerWidth||document.documentElement.clientWidth||360,height:globalThis.window?.visualViewport?.height||globalThis.window?.innerHeight||document.documentElement.clientHeight||600});
 const position=()=>{
  if(list.hidden)return;
  if(!search.isConnected){stopWatching();return;}
  const rect=search.getBoundingClientRect?.();if(!rect)return;
  const v=viewport(),initial=modelMenuPosition(rect,v);
  list.style.width=initial.width+'px';
  const p=modelMenuPosition(rect,v,Math.min(300,list.scrollHeight||300));
  for(const key of ['left','top','width','maxHeight'])list.style[key]=p[key]+'px';
  list.dataset.placement=p.placement;
 };
 const moved=e=>{if(e?.target===list||(e?.target?.nodeType&&list.contains(e.target)))return;position();};
 function stopWatching(){if(!listening)return;globalThis.window?.removeEventListener('resize',moved);globalThis.window?.removeEventListener('scroll',moved,true);listening=false;}
 const close=()=>{try{list.hidePopover?.();}catch{}list.hidden=true;control.classList.remove('is-open');stopWatching();if(closeActive===close)closeActive=null;search.setAttribute('aria-expanded','false');search.removeAttribute('aria-activedescendant');search.value=value||fallbackValue;active=-1;onClose();};
 const activate=(i,scroll=true)=>{options[active]?.classList.remove('focused');active=i;const n=options[i];if(n){n.classList.add('focused');search.setAttribute('aria-activedescendant',n.id);if(scroll)n.scrollIntoView?.({block:'nearest'});}else search.removeAttribute('aria-activedescendant');};
 const choose=async entry=>{
  if(saving)return;let failed=false;saving=true;search.disabled=true;box.setAttribute('aria-busy','true');status.dataset.state='saving';status.textContent='Сохраняю модель и пересчитываю…';
  try{await onSelect(entry.model||null);value=entry.model;close();status.textContent=value?'Модель сохранена':'Автоматическое определение восстановлено';}
  catch(e){failed=true;status.dataset.state='error';status.textContent=e.message||'Не удалось сохранить модель';}
  finally{saving=false;search.disabled=false;box.removeAttribute('aria-busy');if(failed&&search.isConnected){restoreFocus=true;search.focus?.({preventScroll:true});}}
 };
 const draw=(query='')=>{
  const q=query.trim().toLocaleLowerCase('ru'),words=q.split(/\s+/).filter(Boolean),normalized=modelIdentity(q).split(' ').filter(Boolean);
  const hints=!q||modelIdentity(q)===modelIdentity(suggestedFor)?suggestionHints:[];
  const ranked=rankModels(entries,q||suggestedFor||value||fallbackValue,hints);
  matches=[...(value?[automatic]:[]),...ranked].filter(e=>{const hay=(e.name+' '+e.model+' '+(e.aliases||[]).join(' ')+' '+(e.searchTerms||[]).join(' ')).toLocaleLowerCase('ru'),identity=modelIdentity(hay);return !q||words.every(w=>hay.includes(w))||normalized.every(w=>identity.includes(w))||q.length>=3&&e.similarity>=.5;});
  const remaining=Math.max(0,matches.length-80);matches=matches.slice(0,80);
  const matching=findModelMatch(q||suggestedFor,entries);
  status.dataset.state='help';
  status.textContent=matching.entry?.hasTariff===false?'Модель найдена, но тариф Weavy не получен.':matching.kind==='ambiguous'?'Есть несколько совпадений — какая модель использовалась?':matching.kind==='none'&&(q||suggestedFor||hints.length)?'Точного совпадения нет — выберите модель или уточните поиск.':'';
  list.replaceChildren();options=[];active=-1;search.removeAttribute('aria-activedescendant');
  matches.forEach((entry,i)=>{const opt=make('div',{id:id+'-option-'+i,role:'option','aria-selected':String(entry.model===(value||fallbackValue)),class:'model-option'});
   opt.append(make('span',{class:'model-option-name'},entry.name));if(entry.hint)opt.append(make('small',{},(entry.similarity>=.5&&entry.similarity<1?'Похожее название · ':'')+entry.hint));
   opt.onpointerdown=e=>e.preventDefault();opt.onclick=()=>choose(entry);opt.onpointermove=()=>{if(active!==i)activate(i,false);};list.append(opt);options.push(opt);
  });
  if(!matches.length)list.append(make('p',{class:'small muted'},'Нет такой модели. Попробуйте название или алиас.'));
  if(remaining)list.append(make('p',{class:'small muted'},'Ещё '+remaining+' моделей — уточните поиск.'));
  if(closeActive&&closeActive!==close)closeActive();closeActive=close;
  list.hidden=false;control.classList.add('is-open');search.setAttribute('aria-expanded','true');
  if(typeof list.showPopover==='function'){list.setAttribute('popover','manual');try{list.showPopover();}catch{list.removeAttribute('popover');}}
  position();if(!listening&&globalThis.window){window.addEventListener('resize',moved);window.addEventListener('scroll',moved,{capture:true,passive:true});listening=true;}
  if(q&&matching.model){const exact=matches.findIndex(e=>e.model===matching.model);if(exact>=0)activate(exact,false);}
 };
 search.onfocus=()=>{if(restoreFocus){restoreFocus=false;return;}if(!saving){draw();search.select?.();}};
 search.oninput=()=>draw(search.value);
 search.onblur=()=>{if(!saving)close();};
 search.onkeydown=e=>{
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.hidden)draw();if(matches.length)activate(active<0?(e.key==='ArrowDown'?0:matches.length-1):(active+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length);}
  if(e.key==='Enter'){e.preventDefault();if(!list.hidden&&active>=0)choose(matches[active]);}
  if(e.key==='Tab')close();
 };
 box.focusField=()=>{restoreFocus=true;search.focus?.({preventScroll:true});};
 control.append(search,list);box.append(caption,control,status);return box;
}
