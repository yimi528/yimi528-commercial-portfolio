import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site=process.env.TEST_SITE||'http://localhost:3210/doai';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
// Every API, including SMS and cookie sessions, is a local mock.
async function scenario(cookie=null) {
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
  const state={cookie,identityFail:false,logoutFail:false,hang:null,logins:0,reads:0,sms:0};
  page.on('pageerror',e=>errors.push(String(e)));
  await page.evaluateOnNewDocument(()=>{const timeout=AbortSignal.timeout.bind(AbortSignal);AbortSignal.timeout=ms=>timeout(ms===20000?1500:ms);});
  await page.setRequestInterception(true);
  page.on('request',request=>{
    const url=new URL(request.url());if(!url.pathname.includes('/api/'))return request.continue();
    const path=url.pathname.slice(url.pathname.indexOf('/api/')),route=url.searchParams.has('__p')?`${path}/${url.searchParams.get('__p')}`:path;
    const reply=(data,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(data)}).catch(()=>{});
    if(route==='/api/auth/send-code'){state.sms++;if(state.hang==='sms')return;return reply({ok:true});}
    if(route==='/api/auth/login'){state.logins++;if(state.hang==='login')return;state.cookie='a';return reply({token:'qa-a'});}
    if(route==='/api/auth/logout'){if(state.logoutFail)return reply({message:'Logout unavailable'},503);state.cookie=null;return reply({ok:true});}
    if(route==='/api/user/me'){state.reads++;return state.identityFail?reply({message:'Temporary account failure'},503):state.cookie?reply({id:'a',name:'Recovery QA'}):reply({message:'Sign in'},401);}
    if(route==='/api/doai/me')return reply({isAdmin:false,profile:{userId:'a',isPublic:false,allowCardExchange:false}});
    if(route==='/api/doai/site-config')return reply({config:null});
    if(route==='/api/doai/forum-bookmarks')return reply({ok:true,userId:'a',bookmarks:[]});
    if(route==='/api/doai/forum-stats')return reply({ok:true,forums:Array.from({length:18},(_,i)=>({id:`forum-${i+1}`,bookedCount:0,checkedInCount:0}))});
    for(const key of ['cards','notifications','registrations','recruitments','talents','tickets'])if(route===`/api/doai/${key}`)return reply({[key]:[]});
    return reply({ok:true});
  });
  const text=value=>page.waitForFunction(value=>document.body.textContent.includes(value),{},value);
  const click=async(label,selector='button')=>{const found=await page.evaluate(label=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===label),label);assert.ok(found,`Missing ${label}`);await page.$$eval(selector,(buttons,label)=>buttons.find(b=>b.textContent.trim()===label).click(),label);};
  const open=async()=>{await text('使用原子公社账号登录');await click('使用原子公社账号登录');await page.waitForSelector('#atomclub-phone');};
  const fill=async()=>{await page.type('#atomclub-phone','13800000000');await page.type('#atomclub-code','123456');await page.click('[role="dialog"] input[type="checkbox"]');};
  const go=()=>page.goto(`${site}/dashboard/settings`,{waitUntil:'domcontentloaded'});
  return {context,page,state,errors,text,click,open,fill,go};
}
try {
  for(const reload of [false,true]){
    const s=await scenario();try{
      await s.go();await s.open();await s.fill();s.state.identityFail=true;await s.click('登录 / 注册');await s.text('登录已提交，账号资料尚未确认');
      assert.equal(await s.page.$('img[alt="Recovery QA"]'),null);assert.equal(s.state.logins,1);
      if(reload){const reads=s.state.reads;await s.page.reload({waitUntil:'domcontentloaded'});await s.text('账号状态暂时无法确认');assert.equal(s.state.reads,reads);assert.equal(await s.page.$('img[alt="Recovery QA"]'),null);}
      s.state.identityFail=false;await s.click('重新读取账号');await s.page.waitForSelector('img[alt="Recovery QA"]');assert.equal(s.state.logins,1);assert.equal(await s.page.evaluate(()=>localStorage.getItem('doai_login_pending')),null);assert.deepEqual(s.errors,[]);
      console.log(`PASS: issued login credential needs explicit confirmation after failure${reload?' and refresh':''}, without OTP resubmission`);
    }finally{await s.context.close();}
  }
  {
    const s=await scenario('a');try{
      await s.go();await s.page.waitForSelector('img[alt="Recovery QA"]');s.state.logoutFail=true;await s.click('退出登录');await s.text('服务器会话清理未确认');
      const reads=s.state.reads;await s.page.reload({waitUntil:'domcontentloaded'});await s.text('上次退出尚未确认');assert.equal(s.state.reads,reads);assert.equal(await s.page.$('img[alt="Recovery QA"]'),null);
      await s.page.evaluate(()=>dispatchEvent(new Event('focus')));assert.equal(s.state.reads,reads);
      s.state.logoutFail=false;await s.click('重试退出');await s.page.waitForFunction(()=>!localStorage.getItem('doai_logout_pending'));assert.equal(s.state.cookie,null);
      await s.go();await s.text('使用原子公社账号登录');assert.equal(await s.page.$('img[alt="Recovery QA"]'),null);assert.deepEqual(s.errors,[]);
      console.log('PASS: failed cookie logout stays signed out after refresh and supports explicit cleanup retry');
    }finally{await s.context.close();}
  }
  {
    const s=await scenario('a');try{
      s.state.identityFail=true;await s.go();await s.text('账号状态暂时无法确认');assert.equal(await s.page.$('img[alt="Recovery QA"]'),null);
      s.state.identityFail=false;await s.click('重新读取账号');await s.page.waitForSelector('img[alt="Recovery QA"]');await s.page.waitForFunction(()=>!document.body.textContent.includes('账号状态暂时无法确认'));assert.deepEqual(s.errors,[]);
      console.log('PASS: initial account service failure is visible and has a working retry');
    }finally{await s.context.close();}
  }
  for(const hang of ['sms','login']){
    const s=await scenario();try{
      await s.go();await s.open();await s.fill();s.state.hang=hang;await s.click(hang==='sms'?'获取验证码':'登录 / 注册');await s.text('请求超时');
      assert.equal(await s.page.$eval('button[aria-label="关闭登录窗口"]',button=>button.disabled),false);
      await s.page.click('button[aria-label="关闭登录窗口"]');await s.page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));await s.open();await s.fill();s.state.hang=null;await s.click('登录 / 注册');await s.page.waitForSelector('img[alt="Recovery QA"]');assert.deepEqual(s.errors,[]);
      console.log(`PASS: hung ${hang} times out, unlocks the dialog and permits a fresh login`);
    }finally{await s.context.close();}
  }
}finally{await browser.close();}
