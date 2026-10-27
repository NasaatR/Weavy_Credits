export const FX_SEED={rate:84.0954,date:'2026-09-22',source:'https://www.cbr.ru/scripts/XML_daily.asp?date_req=22/09/2026'};
export const CREDIT_PLANS=[
 {id:'auto',name:'Авто: цена пополнения из Weavy',usdPer10k:10000/120},
 {id:'team',name:'Team · $10 за 1 200 кр.',usdPer10k:10000/120},
 {id:'pro-team',name:'Pro · $10 за 1 200 кр.',usdPer10k:10000/120},
 {id:'starter',name:'Starter · $10 за 1 000 кр.',usdPer10k:100},
 {id:'custom',name:'Своя цена покупки / подписки',usdPer10k:null}
];
export const PLAN_REFERENCE={checkedAt:'2026-09-30',source:'https://weave.figma.com/pricing'};
export function subscriptionPlan(value){
 if(typeof value!=='string')return null;
 const name=value.trim().toLowerCase().replace(/[_-]+/g,' ');
 if(/\b(team|teams)\b/.test(name))return 'team';
 if(/\b(pro|professional)\b/.test(name))return 'pro-team';
 if(/\bstarter\b/.test(name))return 'starter';
 if(/\bfree\b/.test(name))return 'free';
 if(/\benterprise\b/.test(name))return 'enterprise';
 return null;
}
export const planName=id=>({auto:'Автоматически из Weavy',team:'Team','pro-team':'Professional',starter:'Starter',custom:'Своя цена',free:'Free',enterprise:'Enterprise'}[id]||'План не определён');
export function moneyPlan(settings,workspaceIds=[],accountPrices={}){
 const ids=[...new Set(workspaceIds)],quotes=ids.map(id=>accountPrices[id]);
 const known=quotes.filter(Boolean),plans=[...new Set(known.map(q=>q.planId||subscriptionPlan(q.planName)||subscriptionPlan(q.planType)).filter(Boolean))];
 const detected=known.length===ids.length&&plans.length===1&&known.every(q=>q.planId||subscriptionPlan(q.planName)||subscriptionPlan(q.planType))?plans[0]:null;
 const observedRate=ids.length&&quotes.every(q=>Number.isFinite(q?.creditsPerDollar)&&q.creditsPerDollar>0)&&new Set(quotes.map(q=>q.creditsPerDollar)).size===1?quotes[0].creditsPerDollar:null;
 return {detected,observedRate,observedAt:known.map(q=>q.observedAt).filter(Boolean).sort().at(-1)||null,
  selectedName:settings.creditPlan==='auto'?(detected?planName(detected):observedRate?'Цена из Weavy':'Авто · ожидаю Weavy'):planName(settings.creditPlan),
  source:settings.creditPlan==='auto'?(observedRate?'Данные Weavy':detected==='free'?'Weavy · пополнение недоступно':'Резервная цена Team'):settings.creditPlan==='custom'?'Ваша цена':'Официальная цена пополнения',
  mismatch:!!detected&&settings.creditPlan!=='auto'&&settings.creditPlan!=='custom'&&detected!==settings.creditPlan};
}
export function parseCbrUsd(xml,today){
 if(typeof xml!=='string'||xml.length>200000)throw Error('Некорректный ответ ЦБ');
 const date=xml.match(/<ValCurs\b[^>]*\bDate="(\d{2})\.(\d{2})\.(\d{4})"/);
 const usd=[...xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)].map(m=>m[1]).find(s=>/<CharCode>USD<\/CharCode>/.test(s));
 if(!date||!usd)throw Error('В ответе ЦБ нет курса USD');
 const at=`${date[3]}-${date[2]}-${date[1]}`;
 const value=Number(usd.match(/<Value>([\d,\.]+)<\/Value>/)?.[1]?.replace(',','.'));
 const nominal=Number(usd.match(/<Nominal>(\d+)<\/Nominal>/)?.[1]);
 const age=(Date.parse(today)-Date.parse(at))/86400000;
 if(!(value>0&&nominal>0)||!Number.isFinite(value)||!Number.isFinite(nominal)||!Number.isFinite(age)||age<0||age>10)throw Error('ЦБ вернул курс с неподходящей датой');
 return {rate:value/nominal,date:at};
}
export async function fetchCbrUsd(fetcher=fetch,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const [y,m,d]=today.split('-');const url=`https://www.cbr.ru/scripts/XML_daily.asp?date_req=${d}/${m}/${y}`;
 const response=await fetcher(url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('ЦБ недоступен: '+response.status);
 return {...parseCbrUsd(await response.text(),today),source:url,checkedAt:now.toISOString()};
}
export function effectiveMoneySettings(settings,workspaceIds=[],accountPrices={}){
 const out={...settings};
 if(settings.creditPlan!=='auto')return out;
 const ids=[...new Set(workspaceIds)];
 const rates=ids.map(id=>accountPrices[id]?.creditsPerDollar);
 if(ids.length&&rates.every(v=>Number.isFinite(v)&&v>0)&&new Set(rates).size===1){out.usdPer10k=10000/rates[0];out.creditSource='Цена пополнения из Weavy';}
 else if(ids.length===1&&(accountPrices[ids[0]]?.planId||subscriptionPlan(accountPrices[ids[0]]?.planName))==='free'){out.usdPer10k=null;out.creditSource='Free: у бесплатного плана нет пополнений';}
 else if(ids.length>1&&rates.some(v=>Number.isFinite(v)&&v>0)){out.usdPer10k=null;out.creditSource='Разные или неизвестные цены workspace: выберите один файл или задайте общий тариф';}
 else out.creditSource='Pro / Team по умолчанию; цена вашего плана ещё не получена';
 return out;
}
