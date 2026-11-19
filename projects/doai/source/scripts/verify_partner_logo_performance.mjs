import express from 'express';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
const app = express();
let rejectWorker = false;
app.use('/doai/api', (req, res) => req.path === '/user/me' ? res.status(401).json({ message: 'Sign in' }) : res.json({ ok: true, config: null, [req.path.split('/').pop()]: [] }));
app.use((req,res,next) => rejectWorker && /partnerLogo\.worker-.*\.js/.test(req.path) ? res.sendStatus(503) : next());
app.use('/doai', express.static(fileURLToPath(new URL('../dist/',import.meta.url))));
const server = await new Promise(resolve => { const s = app.listen(0,'127.0.0.1',()=>resolve(s)); });
const site = `http://127.0.0.1:${server.address().port}/doai/`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true });
const results=[];
try {
 for (const mode of ['normal', 'throttled', 'unsupported', 'worker-failure']) {
  const context=await browser.createBrowserContext(), page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewport({width:1440,height:1000,deviceScaleFactor:2});
  if(mode==='throttled') { const cdp=await page.createCDPSession();await cdp.send('Emulation.setCPUThrottlingRate',{rate:4}); }
  await page.evaluateOnNewDocument(mode=>{
   localStorage.setItem('doai_lang','zh');
   window.__pixelCalls=0; window.__logoLongTasks=[];
   if (typeof OffscreenCanvas !== 'undefined') OffscreenCanvas.prototype.getContext=function(){window.__pixelCalls++;throw new Error('Main-thread offscreen processing prohibited');};
 CanvasRenderingContext2D.prototype.getImageData=function(){window.__pixelCalls++;throw new Error('Pixel processing on main thread');};
   HTMLCanvasElement.prototype.toBlob=function(){window.__pixelCalls++;throw new Error('Encoding on main thread');};
   if(mode==='unsupported') Object.defineProperty(window,'Worker',{value:undefined});
   new PerformanceObserver(list=>window.__logoLongTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
  },mode);
  rejectWorker=mode==='worker-failure';
  await page.goto(site,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-partner-logo]');
  await page.evaluate(()=>{window.__logoStart=performance.now();});
  const total=await page.$$eval('[data-partner-logo]',nodes=>nodes.length);
  for(let i=0;i<total;i++) {
   await page.evaluate(i=>document.querySelectorAll('[data-partner-logo]')[i].scrollIntoView({block:'center'}),i);
   await page.waitForFunction((i,fallback)=>{
    const node=document.querySelectorAll('[data-partner-logo]')[i],img=node?.querySelector('img');
    return img?.complete && img.naturalWidth>0 && (fallback ? !img.src.startsWith('blob:') : ['adapted','vector'].includes(node.dataset.partnerLogo));
   },{timeout:20000},i,mode==='unsupported'||mode==='worker-failure');
  }
  // Include observer delivery after the last image changes layout/paint.
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const metrics=await page.evaluate(()=>{
   const tasks=window.__logoLongTasks.filter(t=>t.start>=window.__logoStart);
   return {pixelCalls:window.__pixelCalls,wallMs:performance.now()-window.__logoStart,longTasks:tasks.length,maxLongTaskMs:Math.max(0,...tasks.map(t=>t.duration)),totalLongTaskMs:tasks.reduce((n,t)=>n+t.duration,0),adapted:document.querySelectorAll('[data-partner-logo="adapted"]').length,vectors:document.querySelectorAll('[data-partner-logo="vector"]').length};
  });
  assert.equal(metrics.pixelCalls,0);
  if(mode==='normal'||mode==='throttled') {
   assert.equal(metrics.adapted+metrics.vectors,total);
   assert.ok(metrics.maxLongTaskMs<200,`Logo main-thread long task exceeded project budget: ${metrics.maxLongTaskMs}ms`);
  }
  else {assert.equal(metrics.adapted,0);assert.ok(metrics.vectors>0);}
  assert.deepEqual(errors,[]);
  results.push({mode,total,...metrics});await context.close();
 }
 const report={measuredAt:new Date().toISOString(),environment:'local production /doai/ build; isolated API fixtures; Chrome headless; desktop 1440x1000 @2x',scope:'Long Tasks on the renderer main thread while scrolling all logos. 4x is CDP main-thread CPU throttling, not worker CPU or whole-device throttling. Wall time includes asynchronous work and test polling. These are fresh measurements, not previous review figures.',results};
 await writeFile('/tmp/doai-logo-worker-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {await browser.close();await new Promise(r=>server.close(r));}
