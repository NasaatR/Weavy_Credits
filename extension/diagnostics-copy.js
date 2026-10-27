let nextDialog=0;

// Copy the worker's existing sanitized export, never the raw state or page data.
export function diagnosticsCopy({getDiagnostics,download}){
 const make=(tag,attrs={},text='')=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);n.textContent=text;return n;};
 const button=make('button',{type:'button',class:'primary'},'Копировать диагностику');
 const status=make('p',{class:'small muted diagnostics-copy-status',role:'status','aria-live':'polite'});
 let busy=false;
 const write=text=>{
  if(typeof globalThis.navigator?.clipboard?.writeText!=='function')return Promise.reject(Error('Clipboard unavailable'));
  return navigator.clipboard.writeText(text);
 };
 const success=()=>status.textContent='Диагностика скопирована. Вставьте её в сообщение — Ctrl+V.';
 const fallback=text=>{
  const titleId='diagnostics-copy-title-'+(++nextDialog),dialog=make('dialog',{class:'diagnostics-dialog','aria-labelledby':titleId});
  const area=make('textarea',{class:'diagnostics-text',readonly:'',spellcheck:'false','aria-label':'Диагностика JSON'});area.value=text;
  const hint=make('p',{class:'small muted',role:'status'},'Браузер не дал скопировать автоматически. Текст выделен: нажмите Ctrl+C или попробуйте ещё раз.');
  const actions=make('div',{class:'actions'}),retry=make('button',{type:'button',class:'primary'},'Копировать ещё раз'),save=make('button',{type:'button'},'Скачать JSON'),close=make('button',{type:'button'},'Закрыть');
  const select=()=>{area.focus?.();area.select?.();};
  retry.onclick=async()=>{
   if(retry.disabled)return;retry.disabled=true;
   try{await write(text);success();dialog.close();}
   catch{hint.textContent='Копирование заблокировано. Нажмите Ctrl+C в выделенном тексте или скачайте JSON.';select();}
   finally{retry.disabled=false;}
  };
  save.onclick=()=>download('weavy-credits-diagnostics.json',text);
  close.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{dialog.remove();button.focus?.({preventScroll:true});},{once:true});
  actions.append(retry,save,close);dialog.append(make('h2',{id:titleId},'Диагностика для отправки'),hint,area,actions);document.body.append(dialog);dialog.showModal();select();
 };
 button.onclick=async()=>{
  if(busy)return;busy=true;button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='Подготовка диагностики…';
  try{
   const data=await getDiagnostics();if(!data||typeof data!=='object'||!data.version)throw Error('No diagnostic export');
   const text=JSON.stringify(data,null,2);
   try{await write(text);success();}
   catch{status.textContent='Автокопирование недоступно. Диагностика открыта для ручного копирования.';fallback(text);}
  }catch{status.textContent='Не удалось получить диагностику. Попробуйте ещё раз.';}
  finally{busy=false;button.disabled=false;button.removeAttribute('aria-busy');}
 };
 return {button,status};
}
