/** Reproducible UI review against an already exported web build.
 * Install Playwright in a separate tools directory; supply NODE_PATH.
 * node scripts/web-screens/v15-review.cjs http://localhost:8080/buzzle/ [output-dir]
 * Only the isolated browser context uses the demo save; no deployed fixtures.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv[2] || 'http://localhost:8080/';
const out = path.resolve(process.argv[3] || 'screens/v1.5-review');
const root = out;
const reviewSeed = require('./v15-review-seed.json');
const telegramMock = require('../telegram/tg-mock.cjs');
for(const width of [360,390,430]) fs.mkdirSync(path.join(out,String(width)),{recursive:true});
const mainScreens = async page => {
 const seed=reviewSeed,mock=telegramMock;
 const report=[];
 for(const width of [360,390,430]) {
  const ctx=await page.context().browser().newContext({viewport:{width,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,timezoneId:'Europe/Vienna'}),p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.status()+' '+r.url())});
  await p.route('**/telegram-web-app.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
  await p.addInitScript(s=>{const st=JSON.parse(s),now=Date.now(),day=Math.floor((now-new Date().getTimezoneOffset()*60000)/86400000);st.settings={...st.settings,lang:'ru',langPicked:true,lastVersion:'9.9.9',gardenIntroDone:true,tutorialDone:true,autoUpdate:false};st.hive.lastTick=st.garden.lastTick=now;st.login.lastDay=day;st.tasks.day=day;st.week.id=Math.floor((day+3)/7);st.clock={maxSeen:now,maxDay:day};window.__tgLang='ru';localStorage.setItem('bzz:state:v1',JSON.stringify(st));},JSON.stringify(seed));
  const load=async()=>{await p.goto(base);await p.waitForFunction(()=>!document.querySelector('#bzz-boot'));await p.waitForTimeout(600)};
  const tap=async label=>{await p.locator('[aria-label='+JSON.stringify(label)+']').last().click({timeout:5000});await p.waitForTimeout(200)};
  const shot=async name=>{await p.waitForTimeout(900);await p.locator('img').evaluateAll(async es=>Promise.all(es.map(i=>i.decode().catch(()=>{}))));await p.screenshot({path:root+'/'+width+'/'+name+'.png'});report.push({width,name,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),text:(await p.locator('body').innerText()).slice(0,100)})};
  const scrollBottom=async()=>{await p.evaluate(()=>document.querySelectorAll('div').forEach(e=>{if(e.scrollHeight>e.clientHeight+50&&getComputedStyle(e).overflowY.match(/auto|scroll/))e.scrollTop=e.scrollHeight}));await p.waitForTimeout(150)};
  await load();await shot('01-hive');await tap('Улучшения');await shot('15-upgrades');await tap('Закрыть');await tap('Сад');await shot('02-garden');await scrollBottom();await shot('02b-garden-bottom');
  await tap('Играть');await shot('03-play');await tap('Играть ежедневную головоломку');await shot('13-round');
  await load();await tap('Пчёлы');await shot('04-bees');await tap('Наряды');await shot('04b-outfits');await tap('Все');await tap('Жужа');await shot('04c-bee-detail');await tap('Переименовать пчелу');await shot('04d-rename');
  await load();await tap('Сюрпризы');await shot('05-chests');await tap('Лавка');await shot('06-shop');await tap('Альбом');await shot('07-album');await scrollBottom();await shot('07b-album-bottom');
  await tap('Задания');await shot('08-tasks');await scrollBottom();await shot('09-tasks-bottom');await tap('Настройки');await shot('10-settings');await scrollBottom();await shot('10b-settings-bottom');
  await load();await tap('Сюрпризы');
  const labels=await p.locator('[aria-label]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
  const open=labels.find(l=>l.includes('Открыть')&&l.includes('сот'));
  if(open){await tap(open);await shot('12-box-open');for(let i=0;i<3;i++){const labels=await p.locator('[aria-label]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));const hit=labels.find(l=>l.startsWith('Тапни по соте:'));if(hit)await tap(hit)}await p.waitForTimeout(600);await shot('12b-box-reward')}
  await load();await p.evaluate(()=>{const st=JSON.parse(localStorage.getItem('bzz:state:v1'));st.settings.langPicked=false;localStorage.setItem('bzz:state:v1',JSON.stringify(st))});
  // The init fixture would restore langPicked on reload, so use a separate context below for onboarding.
  report.push({width,errors});await ctx.close();
 }
 return {screens:report.filter(r=>r.name).length,overflow:report.filter(r=>r.overflow).map(r=>[r.width,r.name]),errors:report.filter(r=>r.errors?.length)};
};
const languages = async page => {
 const seed=reviewSeed,mock=telegramMock;const reports=[];
 for(const width of [360,390]){
  const context=await page.context().browser().newContext({viewport:{width,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,timezoneId:'Europe/Vienna'}),p=await context.newPage();
  await p.route('**/telegram-web-app.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
  await p.addInitScript(s=>{const st=JSON.parse(s),now=Date.now(),day=Math.floor((now-new Date().getTimezoneOffset()*60000)/86400000);st.settings={...st.settings,lang:'en',langPicked:false,lastVersion:'9.9.9',autoUpdate:false};st.hive.lastTick=st.garden.lastTick=now;st.login.lastDay=day;st.tasks.day=day;st.clock={maxSeen:now,maxDay:day};window.__tgLang='en';localStorage.setItem('bzz:state:v1',JSON.stringify(st))},JSON.stringify(seed));
  await p.goto(base);await p.waitForTimeout(1400);await p.screenshot({path:out+'/'+width+'/11-language.png'});
  await p.getByRole('radio',{name:'English',exact:true}).click();await p.getByLabel('Continue',{exact:true}).click();await p.waitForTimeout(600);
  for(const lang of ['en','uk']){
   if(lang==='uk'){await p.getByLabel('Settings',{exact:true}).click();await p.getByLabel('Українська',{exact:true}).click();await p.waitForTimeout(300);await p.getByLabel('Закрити',{exact:true}).click({timeout:5000});await p.waitForTimeout(200)}
   for(const tab of lang==='en'?['Bees','Surprises','Tasks']:['Бджоли','Сюрпризи','Завдання']){
    await p.getByRole('tab',{name:tab,exact:true}).click();await p.waitForTimeout(350);reports.push({width,lang,tab,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});await p.screenshot({path:out+'/'+width+'/'+lang+'-'+(['Bees','Бджоли'].includes(tab)?'bees':['Surprises','Сюрпризи'].includes(tab)?'surprises':'tasks')+'.png'})
   }
  }
  await context.close();
 }
 return reports;
};
const serviceScreens = async page => {
 const seed=reviewSeed,mock=telegramMock;const report=[];
 for(const width of [360,390,430]) {
  const ctx=await page.context().browser().newContext({viewport:{width,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,timezoneId:'Europe/Vienna'}),p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.status()+' '+r.url())});
  await p.route('**/telegram-web-app.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
  await p.addInitScript(s=>{let now=Date.now(),day=Math.floor((now-new Date().getTimezoneOffset()*60000)/86400000);s.settings={...s.settings,lang:'ru',langPicked:true,lastVersion:'9.9.9',tutorialDone:true,gardenIntroDone:true};s.login.lastDay=day;s.hive.lastTick=s.garden.lastTick=now;s.tasks.day=day;s.week.id=Math.floor((day+3)/7);s.clock={maxSeen:now,maxDay:day};localStorage.setItem('bzz:state:v1',JSON.stringify(s));window.__tgLang='ru'},seed);
  const tap=async l=>{await p.getByLabel(l,{exact:true}).last().click({timeout:5000});await p.waitForTimeout(250)};
  const load=async()=>{await p.goto(base);await p.waitForFunction(()=>!document.getElementById('bzz-boot'));await p.waitForTimeout(500)};
  const shot=async name=>{await p.waitForTimeout(650);await p.screenshot({path:out+'/'+width+'/'+name+'.png'});report.push({width,name,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)})};
  await load();
  for(const [label,name] of [['Об игре','16-about'],['Что нового','17-whats-new'],['Экспорт сохранения','18-export'],['Импорт сохранения','19-import'],['Сбросить прогресс','20-reset-confirm']]) {
   await load();await tap('Настройки');await tap(label);await shot(name);
  }
  await load();await tap('Настройки');await tap('Показать обучение');
  for(let i=0;i<4;i++){await shot('21-tutorial-'+i);if(i<3)await p.getByRole('button',{name:'Дальше',exact:true}).click()}
  report.push({width,errors,mock:await p.evaluate(()=>!!window.__tg)});await ctx.close();
 }
 return {screens:report.filter(x=>x.name).length,overflow:report.filter(x=>x.overflow),errors:report.filter(x=>x.errors?.length),mock:report.filter(x=>x.mock).length};
};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BZZ_CHROME?{executablePath:process.env.BZZ_CHROME}:{})});
 try {
  const context=await browser.newContext(),page=await context.newPage();
  const report={main:await mainScreens(page),languages:await languages(page),service:await serviceScreens(page)};
  fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(report.main.errors.length || report.main.overflow.length || report.service.errors.length || report.service.overflow.length || report.languages.some(r=>r.overflow)) throw new Error('UI review failed');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
