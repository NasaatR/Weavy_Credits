import {APPEARANCE} from './appearance.js';
export function applyPageAppearance(settings){
 const a=APPEARANCE.normalize(settings.appearance),root=document.documentElement;
 const fg=APPEARANCE.foreground(a.settingsPanelColor),bgFg=APPEARANCE.foreground(a.settingsBgColor);
 const tokens={'--bg':a.settingsBgColor,'--surface':a.settingsPanelColor,'--surface2':`color-mix(in srgb, ${fg} 7%, ${a.settingsPanelColor})`,'--text':fg,'--muted':fg+'a6','--border':fg+'24','--accent':a.settingsAccentColor,'--accent-text':APPEARANCE.foreground(a.settingsAccentColor),'--pattern':a.settingsPatternEnabled?`rgba(${APPEARANCE.rgb(bgFg).join(',')},${a.settingsPatternOpacity/100})`:'transparent','--pattern-step':a.settingsPatternSpacing+'px'};
 for(const [k,v]of Object.entries(tokens))root.style.setProperty(k,v);
 document.body.classList.toggle('light',fg!=='#ffffff');
 root.style.setProperty('--font',(settings.fontSize||14)+'px');
}
export function appearanceSections(settings,{el,btn,field,input,actions,save}){
 let value=APPEARANCE.snapshot(settings.appearance),timer,busy=false,pending=false;
 const status=el('p',{class:'appearance-status',role:'status'},'Изменения сохраняются автоматически');
 const preview=el('div',{id:'dock-preview-box'},el('span',{class:'value'},'≈ 124 кр.'),...['📊','⚙️'].map((s,i)=>el('button',{type:'button','data-wcr-role':i===0?'primary':'action','aria-label':['Отчёт','Настройки'][i]},el('span',{class:'wcr-glyph'},s))));
 const controls=new Map();
 const paint=()=>{APPEARANCE.apply(preview,value);applyPageAppearance({...settings,appearance:value});for(const [k,c]of controls){if(c.input.type==='checkbox')c.input.checked=value[k];else c.input.value=value[k];if(c.output)c.output.textContent=c.format(value[k]);}};
 const persist=async()=>{
  if(busy){pending=true;return;}busy=true;pending=false;status.textContent='Сохранение…';const snapshot=APPEARANCE.snapshot(value);
  try{await save(snapshot);status.textContent='✓ Сохранено';}catch(e){status.textContent='Не сохранено: '+e.message;}
  finally{busy=false;if(pending)persist();paint();}
 };
 const change=(key,v)=>{value=APPEARANCE.snapshot({...value,[key]:v});paint();status.textContent='Есть изменения…';clearTimeout(timer);timer=setTimeout(persist,140);};
 const color=(key,label)=>{const i=input(key,value[key],'color');const code=el('code',{},value[key]);i.oninput=()=>change(key,i.value);controls.set(key,{input:i,output:code,format:v=>v});return field(label,el('div',{class:'color-row'},i,code));};
 const range=(key,label,min,max,unit='px',step=1,format=v=>v+' '+unit)=>{const i=input(key,value[key],'range',{min,max,step}),o=el('output',{},format(value[key]));i.oninput=()=>change(key,Number(i.value));controls.set(key,{input:i,output:o,format});return field(label,el('div',{class:'range-row'},i,o));};
 const select=(key,label,options)=>{const i=el('select',{name:key},...options.map(([v,t])=>el('option',{value:v},t)));i.value=value[key];i.onchange=()=>change(key,key==='dockButtonSize'?Number(i.value):i.value);controls.set(key,{input:i});return field(label,i);};
 const dockKeys=APPEARANCE.keys.filter(k=>!k.startsWith('settings')),pageKeys=APPEARANCE.keys.filter(k=>k.startsWith('settings'));
 const reset=keys=>{for(const key of keys)value[key]=APPEARANCE.defaults[key];paint();persist();};
 const presets=el('select',{'aria-label':'Пресет оформления'},el('option',{value:''},'Выбрать оформление…'),...APPEARANCE.presets.map(p=>el('option',{value:p.id},p.name)));
 presets.onchange=()=>{const p=APPEARANCE.presets.find(p=>p.id===presets.value);if(p){value={...p.values};paint();persist();}};
 const dock=el('section',{class:'card section',id:'dock-appearance'},el('h2',{},'🎨 Оформление панели'),el('p',{class:'small muted'},'Внешний вид панели внутри Weavy. Все изменения видны сразу.'),el('div',{class:'preset-row'},presets,btn('Сбросить док',()=>reset(dockKeys))),el('div',{class:'preview-stage'},preview),el('p',{class:'preview-caption'},'Предпросмотр панели'),
  el('div',{class:'appearance-grid'},color('accentColor','Акцент дока'),color('bgColor','Фон дока'),range('borderRadius','Радиус углов',0,24),select('dockButtonSize','Размер кнопок',[[30,'30 px · компактный'],[36,'36 px · обычный'],[42,'42 px · крупный']]),range('dockOpacity','Непрозрачность фона',0,100,'%'),range('dockBlur','Размытие за доком',0,24),select('accentMode','Акцент главной кнопки',[['minimal','Minimal · контур'],['normal','Normal · заливка'],['strong','Strong · все кнопки']])) ,
  el('p',{class:'small muted'},'При непрозрачности 100% размытие скрыто фоном. Текст и кнопки всегда непрозрачны.'),
  el('details',{},el('summary',{},'🌘 Тень и обводка'),el('div',{class:'appearance-grid'},range('dockShadow','Сила тени',0,48,'%',1,v=>Math.round(v/48*100)+'%'),range('dockShadowSoftness','Мягкость тени',0,80),range('dockShadowDirection','Направление',0,360,'°'),range('dockShadowDistance','Смещение',0,40,'px',.25),range('dockBorderWidth','Толщина обводки',0,6,'px',.5),color('dockBorderColor','Цвет обводки'),range('dockBorderOpacity','Непрозрачность обводки',0,100,'%'))),status);
 const toggle=el('input',{type:'checkbox',checked:value.settingsPatternEnabled});toggle.onchange=()=>change('settingsPatternEnabled',toggle.checked);controls.set('settingsPatternEnabled',{input:toggle});
 const page=el('section',{class:'card section',id:'page-appearance'},el('h2',{},'🖥️ Оформление страницы'),el('p',{class:'small muted'},'Фон, карточки и элементы этой страницы настраиваются отдельно от дока.'),
  el('div',{class:'appearance-grid'},color('settingsBgColor','Фон страницы'),color('settingsPanelColor','Карточки и верхняя панель'),color('settingsAccentColor','Акцент элементов'),range('settingsPatternSpacing','Расстояние между точками',8,64),range('settingsPatternOpacity','Контраст точек',0,30,'%')),
  el('label',{class:'check'},toggle,'Показывать точки на фоне'),actions(btn('Сбросить страницу',()=>reset(pageKeys))));
 paint();return [dock,page];
}
