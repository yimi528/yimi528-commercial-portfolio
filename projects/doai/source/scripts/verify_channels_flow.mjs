import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const site=process.env.TEST_SITE||'http://localhost:3210/doai';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();await page.setViewport({width:1360,height:1000});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
let account='operator',channel='dobe',superAdmin=false,grantBody,registrationBody,ticketBody,capable=true;
const channels=['public','atom','dobe','overseas'];
const registrations=channels.map((channel,i)=>({id:`reg-${channel}`,channel,ownerUserId:`owner-${channel}`,makerId:`MAKER-${channel}`,projectName:`${channel}-private-project`,teamName:`${channel}-team`,type:'individual',track:'creator',status:'submitted',projectSummary:'QA summary',videoUrl:'',docUrl:'',members:[{id:`owner-${channel}`,name:'Owner',phone:'13800000000',isLeader:true,roleTitle:'Maker'}],submittedAt:'2026-10-30T00:00:00Z'}));
registrations.push({...registrations[0],id:'historical',projectName:'historical-private-project',channel:null});
const applications=channels.flatMap(channel=>[false,true].map(media=>({id:`ticket-${channel}-${media}`,ownerUserId:`owner-${channel}`,channel,type:'guest',bookingKey:media?'attendance:media:seat-open':'attendance:pass-day2',title:`${channel}-${media?'media':'public'}-application`,titleEn:`${channel} application`,status:media?'pending_review':'claimed',qrCode:media?'':`QR-${channel}`,holderName:`${channel}-attendee`,holderPhone:'13800000000',organization:'QA organization',issuedAt:'2026-10-30T00:00:00Z'})));

applications.push({...applications[0],id:'historical-attendance',channel:null,title:'historical-attendance-title',holderName:'historical-attendee'});
await page.setRequestInterception(true);
page.on('request',request=>{
 const url=new URL(request.url());if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return request.abort();
 if(!url.pathname.includes('/api/'))return request.continue();
 const path=url.pathname.slice(url.pathname.indexOf('/api/'));const route=url.searchParams.has('__p')?`${path}/${url.searchParams.get('__p')}`:path;
 const reply=(data,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(data)});
 if(route==='/api/user/me')return reply({id:account,name:'QA Owner',phone:'13800000000',city:'上海'});
 if(route==='/api/doai/me')return reply({ok:true,isAdmin:superAdmin,operatorChannel:superAdmin?null:account==='operator'?channel:null,channelPolicy:capable?'scoped-v1':undefined,profile:{userId:account,isPublic:false,allowCardExchange:true}});
 if(route==='/api/doai/registrations'&&request.method()==='GET')return reply({ok:true,registrations}); // deliberately overbroad response also tests defensive UI scoping
 if(route==='/api/doai/registrations'){
  registrationBody=JSON.parse(request.postData());const saved={...registrationBody,id:'new-registration',ownerUserId:account,makerId:'MAKER-NEW',status:'submitted',submittedAt:'2026-10-30T00:00:00Z',accountContact:{userId:account,phone:'13800000000',source:'account',capturedAt:'2026-10-30T00:00:00Z'},applicant:{...registrationBody.applicant,userId:account}};
  return reply({ok:true,userId:account,requestKey:registrationBody.requestKey,found:true,created:true,registration:saved,ticket:{id:'entry-ticket',ownerUserId:account,type:'maker',bookingKey:'registration:new-registration',status:'claimed',qrCode:'ENTRY-QR'}});
 }
 if(route.startsWith('/api/doai/registration-requests/'))return reply({ok:true,userId:account,requestKey:route.split('/').at(-1),found:false,channelPolicy:capable?'scoped-v1':undefined,applicantPolicy:'snapshot-v2',applicantFieldsPolicy:'organization-position-age-v1',contactPolicy:'account',teamPolicy:'linked-v1'});
 if(route==='/api/doai/attendance-applications')return reply({ok:true,applications});
 if(route==='/api/doai/admins'&&request.method()==='GET')return reply({admins:[{userId:'root',name:'总管理员',source:'bootstrap',role:'super_admin',channel:null,enabled:true},{userId:'operator',name:'德必运营',source:'database',role:'channel_operator',channel:'dobe',enabled:true}]});
 if(route==='/api/doai/admins') {grantBody=JSON.parse(request.postData());return reply({admin:{...grantBody,userId:grantBody.userId||'granted-user',name:'New operator',enabled:true,source:'database'}});}
 if(route==='/api/doai/tickets'&&request.method()==='GET')return reply({tickets:[]});
 if(route==='/api/doai/tickets'){ticketBody=JSON.parse(request.postData());return reply({ok:true,ticket:{...ticketBody,id:'new-attendance',ownerUserId:account,status:ticketBody.passType==='pass-media'?'pending_review':'claimed',qrCode:ticketBody.passType==='pass-media'?'':'ATTENDANCE-QR'}});}
 if(route==='/api/doai/my-team')return reply({ok:true,team:null});
 if(route==='/api/doai/site-config')return reply({config:null});
 if(route==='/api/doai/forum-stats')return reply({ok:true,forums:[]});
 if(route==='/api/doai/forum-bookmarks')return reply({ok:true,userId:account,bookmarks:[]});
 const lists={'notifications':'notifications','cards':'cards','recruitments':'recruitments','talents':'talents'};
 const key=lists[route.split('/').at(-1)];if(key)return reply({ok:true,[key]:[]});
 return reply({ok:true});
});
const go=async route=>{await page.goto(`${site}/${route}`,{waitUntil:'domcontentloaded'});};
const text=value=>page.waitForFunction(value=>document.body.textContent.includes(value),{},value);
const click=label=>page.evaluate(label=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===label||button.textContent.includes(label));if(!button)throw new Error(`Missing ${label}`);button.click();},label);
const fill=async(selector,value)=>{await page.focus(selector);await page.$eval(selector,node=>node.select());await page.keyboard.type(value);};
const content=()=>page.$eval('body',node=>node.textContent);
const fit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
const captureDownloads=()=>page.evaluate(()=>{window.qaDownloads=[];HTMLAnchorElement.prototype.click=function(){window.qaDownloads.push(this.href);};});
const csv=()=>page.evaluate(async()=>{const href=window.qaDownloads.at(-1);return href?.startsWith('blob:')?fetch(href).then(row=>row.text()):decodeURIComponent(href.split(',').slice(1).join(','));});
try{
 await go('admin');await text('当前管理范围');await text('报名渠道分布');
 assert.ok(!(await content()).includes('管理员管理'));assert.ok(!(await content()).includes('CMS 首页配置'));
 await click('报名评审审核');await text('dobe-private-project');
 for(const other of ['atom','public','overseas','historical'])assert.ok(!(await content()).includes(`${other}-private-project`));
 await captureDownloads();await click('导出报名数据');let exported=await csv();assert.ok(exported.includes('dobe-private-project'));assert.ok(!exported.includes('atom-private-project'));
 await click('大会报名与审核');await text('dobe-media-application');await text('dobe-public-application');
 assert.ok(!(await content()).includes('atom-media-application'));
 await click('导出参会数据');exported=await csv();assert.ok(exported.includes('dobe-media-application'));assert.ok(!exported.includes('atom-media-application'));
 await page.screenshot({path:'/tmp/doai-channel-operator-desktop.png',fullPage:true});
 await page.setViewport({width:390,height:844});await fit();await page.screenshot({path:'/tmp/doai-channel-operator-mobile.png',fullPage:true});
 channel='atom';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await text('原子公社');await page.select('#admin-section-select','tickets');await text('atom-media-application');assert.ok(!(await content()).includes('dobe-media-application'));
 account='root';superAdmin=true;await page.setViewport({width:1360,height:1000});await go('admin');await page.waitForSelector('#admin-channel-filter');await click('报名评审审核');await text('dobe-private-project');await text('historical-private-project');await captureDownloads();await click('导出报名数据');assert.ok((await csv()).includes('historical-private-project'));assert.ok(!(await content()).includes('未标注渠道'));assert.deepEqual(await page.$$eval('#admin-channel-filter option',nodes=>nodes.map(node=>node.value)),['all',...channels]);
 await click('大会报名与审核');await text('dobe-public-application');await text('historical-attendee');await captureDownloads();await click('导出参会数据');assert.ok((await csv()).includes('historical-attendee'));await click('报名评审审核');await page.select('#admin-channel-filter','dobe');await text('dobe-private-project');assert.ok(!(await content()).includes('atom-private-project'));assert.ok(!(await content()).includes('historical-private-project'));
 await click('管理员管理');await page.waitForSelector('#admin-access-role');await text('渠道运营 · 德必集团');
 await page.select('#admin-identity-kind','userId');await fill('#admin-identity','new-operator');await page.select('#admin-access-channel','overseas');capable=false;await click('保存管理权限');await text('渠道权限服务尚未就绪');assert.equal(grantBody,undefined);capable=true;await click('保存管理权限');await text('已保存 New operator');assert.deepEqual(grantBody,{userId:'new-operator',role:'channel_operator',channel:'overseas'});
 await page.screenshot({path:'/tmp/doai-channel-accounts-desktop.png',fullPage:true});
 // Exercise the actual contest wizard with a selected source.
 account='applicant';superAdmin=false;await go('register/creator');await page.waitForSelector('#registration-channel');
 assert.equal(await page.$eval('#registration-channel',node=>node.required),true);assert.equal(await page.$eval('#registration-channel',node=>node.value),'');
 await page.select('#registration-channel','overseas');await fill('#registration-email','owner@example.com');await fill('#registration-bio','QA maker');await fill('#registration-organization','QA school');await fill('#registration-position','Engineer');await fill('#registration-age','25');
 await page.setViewport({width:390,height:844});await page.$eval('#registration-channel',node=>node.scrollIntoView({block:'center'}));await fit();await page.screenshot({path:'/tmp/doai-channel-register-mobile.png'});
 await click('下一步：参赛模式');await text('个人独立参赛');await click('个人独立参赛');await click('下一步：项目与作品');await page.waitForSelector('input[placeholder*="NeuroFlow"]');
 const entry=await page.$$eval('#entry-direction option',nodes=>nodes.find(node=>node.value)?.value);await page.select('#entry-direction',entry);
 await fill('input[placeholder*="NeuroFlow"]','QA new project');await fill('textarea[placeholder*="100-200"]','A complete project summary');await click('立即提交申报');await text('赛事申报提交成功');assert.equal(registrationBody.channel,'overseas');await text('报名渠道：海外专场');
 // Both regular attendance and media application retain the chosen channel.
 for(const media of [false,true]){
  await go('attend');await page.waitForSelector('#attendance-channel');await page.evaluate(media=>[...document.querySelectorAll('main button')].find(node=>node.querySelector('h3')?.textContent===(media?'媒体 / 行业观摩':'公众开放日')).click(),media);
  if(media)await page.evaluate(()=>{const section=[...document.querySelectorAll('section')].find(node=>node.querySelector('h2')?.textContent==='场次选座');[...section.querySelectorAll('button')].find(node=>node.textContent.includes('开幕主会场')).click();});
  await fill('#att-org','QA organization');await page.select('#attendance-channel','dobe');await page.$eval('#attendance-channel',node=>node.scrollIntoView({block:'center'}));await fit();if(!media)await page.screenshot({path:'/tmp/doai-channel-attend-mobile.png'});
  if(!media){capable=false;await click('提交报名');await text('报名渠道服务尚未就绪');assert.equal(ticketBody,undefined);capable=true;}
  await click('提交报名');await text(media?'申请已提交':'报名成功');assert.equal(ticketBody.channel,'dobe');await text('报名渠道：德必集团');
 }
 // Missing channel protocol retains release-compatible signup, without offering a channel that cannot be saved.
 capable=false;await go('register/industry');await page.waitForSelector('#registration-email');assert.equal(await page.$('#registration-channel'),null);
 await fill('#registration-email','legacy@example.com');await fill('#registration-bio','Legacy API maker');await fill('#registration-organization','Legacy company');await fill('#registration-position','Engineer');await fill('#registration-age','25');
 await click('下一步：参赛模式');await text('个人独立参赛');await click('个人独立参赛');await click('下一步：项目与作品');await page.waitForSelector('input[placeholder*="NeuroFlow"]');
 const legacyEntry=await page.$$eval('#entry-direction option',nodes=>nodes.find(node=>node.value)?.value);await page.select('#entry-direction',legacyEntry);
 await fill('input[placeholder*="NeuroFlow"]','Legacy FDE project');await fill('textarea[placeholder*="100-200"]','Legacy API compatible project');registrationBody=undefined;await click('立即提交申报');await text('赛事申报提交成功');assert.ok(registrationBody);assert.equal('channel' in registrationBody,false);assert.equal(registrationBody.track,'industry');
 await page.screenshot({path:'/tmp/doai-legacy-registration-mobile.png'});
 await go('attend');await page.waitForSelector('#att-name');assert.equal(await page.$('#attendance-channel'),null);await page.evaluate(()=>[...document.querySelectorAll('main button')].find(node=>node.querySelector('h3')?.textContent==='公众开放日').click());ticketBody=undefined;await click('提交报名');await text('报名成功');assert.ok(ticketBody);assert.equal('channel' in ticketBody,false);await fit();await page.screenshot({path:'/tmp/doai-legacy-attendance-mobile.png'});
 capable=true;await go('attend');await page.waitForSelector('#attendance-channel');await page.evaluate(()=>[...document.querySelectorAll('main button')].find(node=>node.querySelector('h3')?.textContent==='公众开放日').click());await page.select('#attendance-channel','dobe');await click('提交报名');await text('报名成功');
 await page.setViewport({width:1360,height:1000});await page.click('button[aria-label="Switch to English"]');await text('Registration channel: Dobe Group');await page.setViewport({width:390,height:844});await fit();await page.screenshot({path:'/tmp/doai-channel-attend-english-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: both signup flows persist required channels, operator tabs/lists/CSV remain scoped, focus refresh replaces old scope, root filters and grants operators, desktop/mobile fit.');
}finally{await browser.close();}
