import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site=process.env.TEST_SITE||'http://localhost:3210/doai';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
await page.evaluateOnNewDocument(()=>localStorage.setItem('doai_lang','zh'));
let config={stats:{makers:1234,finalistProjects:17,prizePool:'88万',judges:31},announcement:'旧的公开公告'},version='2026-10-27T00:00:00.000Z',readMode='invalid',writeMode='fail',posts=0,heldSave;
await page.setRequestInterception(true);
page.on('request',request=>{
 const url=new URL(request.url());if(!url.pathname.includes('/api/'))return request.continue();
 const path=url.pathname.slice(url.pathname.indexOf('/api/')),route=url.searchParams.has('__p')?`${path}/${url.searchParams.get('__p')}`:path;
 const reply=(body,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
 if(route==='/api/user/me')return reply({id:'cms-admin',name:'CMS QA',phone:'13800000000'});
 if(route==='/api/doai/me')return reply({isAdmin:true});
 if(route==='/api/doai/site-config'&&request.method()==='GET'){
  if(readMode==='empty')return reply({config:null,updatedAt:null});
  return reply({config:readMode==='invalid'?{...config,stats:{...config.stats,makers:null}}:config,updatedAt:version});
 }
 if(route==='/api/doai/site-config'){
  posts++;const input=JSON.parse(request.postData());assert.equal(input.expectedUpdatedAt,version);
  if(writeMode==='fail')return reply({message:'本地公告保存失败'},503);
  if(writeMode==='wrong')return reply({config:{...input.config,stats:{...input.config.stats,makers:999}},updatedAt:'2026-10-27T00:00:01.000Z'});
  if(writeMode==='old-version')return reply({config:input.config,updatedAt:version});
  config=input.config;version=new Date(Date.parse(version)+1).toISOString();
  if(writeMode==='hold'){const snapshot=structuredClone({config,updatedAt:version});heldSave=()=>reply(snapshot);return;}
  return reply({config,updatedAt:version});
 }
 if(route==='/api/doai/forum-bookmarks')return reply({ok:true,userId:'cms-admin',bookmarks:[]});
 if(route==='/api/doai/forum-stats')return reply({ok:true,forums:Array.from({length:18},(_,index)=>({id:`forum-${index+1}`,bookedCount:0,checkedInCount:0}))});
 for(const key of ['registrations','tickets','notifications','cards','recruitments','talents'])if(route===`/api/doai/${key}`)return reply({[key]:[]});return reply({ok:true});
});
const text=value=>page.waitForFunction(value=>document.body.textContent.includes(value),{},value);
const click=async label=>{const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===label),label);assert.ok(handle.asElement(),`Missing ${label}`);await handle.asElement().evaluate(node=>node.click());await handle.dispose();};
const route=path=>page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},`${new URL(site).pathname}/${path}`);
const fill=async(selector,value)=>{await page.focus(selector);await page.$eval(selector,node=>node.select());await page.keyboard.type(value);};
try{
 await page.goto(`${site}/`,{waitUntil:'domcontentloaded'});await text('公告暂时无法更新');assert.equal(await page.$$eval('section[aria-label="大会公告"] dd',nodes=>nodes.length),0);
 await route('admin');await text('组委会管理中枢');await click('CMS 首页配置');await page.waitForSelector('#cms-makers');assert.equal(await page.$eval('#cms-makers',node=>node.matches(':disabled')),true);
 readMode='ok';await click('重新加载配置');await page.waitForFunction(()=>document.querySelector('#cms-makers')?.value==='1234');assert.equal(await page.$eval('#cms-prize-en',node=>node.value),'');
 await fill('#cms-makers','2468');await fill('#cms-prize','128万');await fill('#cms-prize-en','CNY 1,280,000');await fill('#cms-announcement','更新后公开公告');await fill('#cms-announcement-en','Updated public notice');
 await click('保存并发布');await text('本地公告保存失败');assert.equal(await page.$eval('#cms-makers',node=>node.value),'2468');
 writeMode='wrong';await click('保存并发布');await text('配置保存结果未确认');assert.equal(await page.$eval('#cms-makers',node=>node.value),'2468');
 writeMode='old-version';await click('保存并发布');await text('配置保存版本未更新');
 writeMode='ok';await click('保存并发布');await text('已保存，官网首页已更新');assert.equal(posts,4);await route('home');await text('更新后公开公告');
 let notice=await page.$('section[aria-label="大会公告"]');assert.ok((await notice.evaluate(node=>node.textContent)).includes('2,468'));assert.ok((await notice.evaluate(node=>node.textContent)).includes('128万'));
 await page.click('button[aria-label="Switch to English"]');await text('Updated public notice');await page.waitForSelector('section[aria-label="Conference notice"]');assert.ok((await page.$eval('section[aria-label="Conference notice"]',node=>node.textContent)).includes('CNY 1,280,000'));
 console.log('PASS: malformed CMS data cannot publish defaults, legacy English fields remain empty, failed/wrong saves retain draft and confirmed CMS values appear on the homepage in both languages');
 await page.click('button[aria-label="切换为中文"]');await route('admin');await text('组委会管理中枢');await click('CMS 首页配置');await page.waitForSelector('#cms-makers');await fill('#cms-makers','3000');writeMode='hold';await click('保存并发布');
 await page.waitForFunction(()=>document.querySelector('#cms-makers').matches(':disabled'));const heldDeadline=Date.now()+5000;while(!heldSave){if(Date.now()>heldDeadline)throw new Error('CMS save was not intercepted');await new Promise(resolve=>setTimeout(resolve,10));}
 await route('home');config={...config,stats:{...config.stats,makers:4000},announcement:'更新的第三方公告',announcementEn:'Newest public notice'};version=new Date(Date.parse(version)+1).toISOString();await click('刷新公告');await text('更新的第三方公告');await heldSave();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok((await page.$eval('section[aria-label="大会公告"]',node=>node.textContent)).includes('4,000'));
 await page.click('button[aria-label="Switch to English"]');await text('Newest public notice');
 readMode='invalid';await click('Refresh notice');await text('The notice could not be updated');assert.ok((await page.$eval('section[aria-label="Conference notice"]',node=>node.textContent)).includes('4,000'));
 readMode='ok';await click('Refresh notice');await page.waitForFunction(()=>!document.body.textContent.includes('The notice could not be updated'));
 await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.$eval('section[aria-label="Conference notice"]',node=>node.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:'/tmp/doai-cms-publication-mobile.png'});
 readMode='empty';await click('Refresh notice');await page.waitForFunction(()=>!document.querySelector('section[aria-label="Conference notice"]'));assert.deepEqual(errors,[]);
 console.log('PASS: failed refresh retains last confirmed public content, retry recovers it, confirmed empty config removes publication and mobile metrics fit the viewport');
}finally{await browser.close();}
