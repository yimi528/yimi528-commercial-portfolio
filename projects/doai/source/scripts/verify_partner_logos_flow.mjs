import { fileURLToPath } from 'node:url';
import express from 'express';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const app=express();
app.use('/doai/api', (req,res)=>{
 if(req.path==='/user/me')return res.status(401).json({message:'Sign in'});
 const path=req.path.split('/').pop();
 return res.json({ok:true,config:null,updatedAt:null,[path]:[]});
});
app.use('/doai',express.static(fileURLToPath(new URL('../dist/', import.meta.url))));
const server=await new Promise(r=>{const s=app.listen(0,'127.0.0.1',()=>r(s));});
const site=`http://127.0.0.1:${server.address().port}/doai/`;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.setRequestInterception(true);page.on('request',r=>new URL(r.url()).origin===new URL(site).origin?r.continue():r.abort());
await page.setViewport({width:1440,height:1000,deviceScaleFactor:2});
await page.evaluateOnNewDocument(()=>{
 window.__logoPixelCalls = 0;
 if (typeof OffscreenCanvas !== 'undefined') OffscreenCanvas.prototype.getContext=function(){window.__logoPixelCalls++;throw new Error('Main-thread offscreen processing prohibited');};
 CanvasRenderingContext2D.prototype.getImageData = function() { window.__logoPixelCalls++; throw new Error('Main-thread pixel processing prohibited'); };
 HTMLCanvasElement.prototype.toBlob = function() { window.__logoPixelCalls++; throw new Error('Main-thread logo encoding prohibited'); };
if(!localStorage.getItem('doai_lang'))localStorage.setItem('doai_lang','zh');});
try {
 for(const lang of ['zh','en']){
  await page.goto(site);await page.evaluate(lang=>localStorage.setItem('doai_lang',lang),lang);await page.reload();
  const ecosystem=lang==='zh'?'生态合作伙伴':'Ecosystem Partners';
  await page.waitForFunction(label=>[...document.querySelectorAll('h2')].some(n=>n.textContent.trim()===label),{},ecosystem);
  const result=await page.evaluate(({ecosystem,strategic,names})=>{
   const eco=[...document.querySelectorAll('h2')].find(n=>n.textContent.trim()===ecosystem).parentElement;
   const strat=[...document.querySelectorAll('span')].find(n=>n.textContent.trim()===strategic).parentElement.parentElement;
   const figures=[...eco.querySelectorAll('figure')];
   return {names:names.map(name=>figures.filter(n=>n.querySelector('figcaption').textContent.trim()===name).length),strategy:strat.textContent,zhihuLogo:!!strat.querySelector('[role="img"][aria-label*="知乎"],[role="img"][aria-label*="Zhihu"]'),ecoHasZhihu:eco.textContent.includes('知乎')||eco.textContent.includes('Zhihu')};
  },{ecosystem,strategic:lang==='zh'?'战略合作方':'Strategic Partners',names:lang==='zh'?['摹宙','SEVENX','哥伦比亚大学上海校友会','伯克利华人国际校友会（BCAIA）','MiniMax','浦发银行']:['MOZO AIGC Technology','SEVENX','Columbia Alumni Shanghai','Berkeley Chinese Alumni International Association','MiniMax','SPD Bank']});
  assert.deepEqual(result.names,[1,1,1,1,1,1]); assert.ok(result.strategy.includes(lang==='zh'?'知乎':'Zhihu')); assert.equal(result.zhihuLogo,true);assert.equal(result.ecoHasZhihu,false);
  assert.ok(!/MiniMax|浦发银行|SPD Bank|SEVENX|MOZO|Columbia|Berkeley|摹宙|哥伦比亚|伯克利/.test(result.strategy));
  await page.evaluate(label=>[...document.querySelectorAll('h2')].find(n=>n.textContent.trim()===label).scrollIntoView({block:'start'}),ecosystem);
  await page.waitForFunction(()=>[...document.querySelectorAll('figure')].slice(0,6).every(n=>n.querySelector('[data-partner-logo="adapted"],[data-partner-logo="vector"]')));
  await page.evaluate(()=>window.scrollBy(0,-110));
  await page.screenshot({path:`/tmp/doai-logo-adaptation-${lang}-desktop.png`});
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:3});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.evaluate(()=>[...document.querySelectorAll('h2')].find(n=>n.textContent.trim()==='Ecosystem Partners').scrollIntoView({block:'start'}));
 await page.screenshot({path:'/tmp/doai-logo-adaptation-mobile.png'});assert.deepEqual(errors,[]);
 const total=await page.$$eval('[data-partner-logo]', nodes=>nodes.length);
 for(let i=0;i<total;i++){
  const el=await page.$$('[data-partner-logo]');await el[i].evaluate(n=>n.scrollIntoView({block:'center'}));
  await page.waitForFunction(i=>['adapted','vector'].includes(document.querySelectorAll('[data-partner-logo]')[i]?.dataset.partnerLogo),{},i);
 }
 assert.equal(await page.evaluate(()=>window.__logoPixelCalls),0);
 assert.equal(await page.$$('canvas').then(nodes=>nodes.length),0);
 const vectorResults=await page.$$eval('[data-partner-logo="vector"]',nodes=>nodes.map(n=>({canvas:n.querySelectorAll('canvas').length,source:n.querySelector('img')?.src})));
 assert.ok(vectorResults.length>10); assert.ok(vectorResults.every(n=>n.canvas===0&&n.source.includes('.svg')));
 const zju=await page.evaluate(()=>{
  const original=[...document.querySelectorAll('figure')].find(n=>/Zhejiang|浙江大学/.test(n.textContent));
  if(!original)return null;
  original.scrollIntoView({block:'center'});
  return {caption:original.querySelector('figcaption').textContent,src:original.querySelector('img').dataset.originalSrc || original.querySelector('img').src,ready:original.querySelector('[data-partner-logo]').dataset.partnerLogo};
 });
 assert.ok(zju?.src.includes('zju-ai-official'));assert.equal(zju.ready,'adapted');
 await page.screenshot({path:'/tmp/doai-logo-adaptation-zju-mobile.png'});
 console.log(`PASS: ${total} logos adapted; all sources load; Zhihu strategic and partners preserved; new ZJU logo; Chinese/English; mobile no overflow; ${vectorResults.length} SVGs kept vector at 2x/3x DPR; no runtime exceptions`);
}catch(e){console.error(page.url(), (await page.$eval('body',n=>n.innerText)).slice(0,1800));throw e;}finally{await browser.close();await new Promise(r=>server.close(r));}
