import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site=process.env.TEST_SITE||'http://127.0.0.1:3215/doai';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-gpu'],defaultViewport:{width:1440,height:1000}});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.setRequestInterception(true);page.on('request',r=>{const url=new URL(r.url());if(url.origin!==new URL(site).origin)return r.abort();if(!url.pathname.includes('/api/'))return r.continue();let status=200,body={ok:true,forums:[],config:null,users:[],recruitments:[],talents:[],teams:[]};if(url.pathname.includes('/user/')){status=401;body={message:'Sign in'};}return r.respond({status,contentType:'application/json',body:JSON.stringify(body)});});
const forbidden=['人才引力场','创投引力场','设计涌现','新青年实验室','逐梦星河','涌现厅','智能体动物园','造物车间','开源星球','代码之外','未来课堂','内容发电站','出海罗盘','金融炼丹炉','健康急救站','安全结界','地力量','合规灯塔','首批 18','first 18'];
try{
 for(const route of ['attend','forum','conference','', 'detail/forum/forum-1']){
  await page.goto(`${site}/${route}`,{waitUntil:'domcontentloaded'});await page.waitForSelector('main');
  const text=await page.$eval('main',n=>n.textContent);for(const word of forbidden)assert.ok(!text.includes(word),`${route}: ${word}`);
  assert.equal(await page.$$eval('main a[href*="/detail/forum/forum-"]',n=>n.length),0);
  if(route==='attend')assert.ok(!text.includes('分会场议题'));
  if(route==='forum') {await page.waitForFunction(()=>document.body.textContent.includes('分论坛排期待公布'));assert.equal(await page.$$eval('main button',buttons=>buttons.filter(b=>/立即预约|免费预约席位|Reserve seat/.test(b.textContent)).length),0);await page.screenshot({path:'/tmp/doai-forum-withdrawn.png',fullPage:true});}
  if(route.startsWith('detail/'))assert.ok(text.includes('不存在')||text.includes('not found'));
 }
 await page.evaluate(()=>localStorage.setItem('doai_lang','en'));await page.goto(`${site}/forum`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.body.textContent.includes('Forum programme coming soon'));
 await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
 console.log('PASS: attendee/home/conference/forum/detail pages contain no provisional topic names or booking links; withdrawn deep links are unavailable; English pending state and mobile layout pass.');
}finally{await browser.close();}
