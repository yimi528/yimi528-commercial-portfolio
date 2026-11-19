import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
// All API traffic is intercepted. Camera frames are generated from local QR SVGs.
const site = process.env.TEST_SITE || 'http://localhost:3210/doai';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100 });
const errors = []; page.on('pageerror', error => errors.push(String(error)));
let account = 'admin-a', recordFails = true, mode = 'fail', posts = 0, heldPost, heldRecords, holdRead = false, posted;
let rows = [];
let statsReads = 0;
const tickets = { 'admin-a': [{ id: 'ticket-a', qrCode: 'QA-DASHBOARD', type: 'guest', status: 'claimed', ownerUserId: 'admin-a', title: '大会凭证', titleEn: 'Conference Pass', holderName: 'QA', holderPhone: '13800000000', issuedAt: '2026-10-27' }], 'admin-b': [] };
const wait = async fn => { const until = Date.now() + 5000; while (!fn()) { if (Date.now() > until) throw new Error('Intercepted request missing'); await new Promise(resolve => setTimeout(resolve, 10)); } };
await page.evaluateOnNewDocument(() => {
  window.__cameraRequests = 0; window.__streams = []; window.__cameraDeferred = false;
  navigator.mediaDevices.getUserMedia = async () => {
    ++window.__cameraRequests;
    if (window.__cameraDeferred) await new Promise(resolve => { window.__releaseCamera = resolve; });
    const canvas = window.__qrCanvas; const stream = canvas.captureStream(10);
    const refresh = setInterval(() => canvas.getContext('2d').drawImage(canvas, 0, 0), 100);
    stream.getVideoTracks()[0].addEventListener('ended', () => clearInterval(refresh));
    window.__streams.push(stream); return stream;
  };
  window.__drawQR = async svg => {
    const canvas = window.__qrCanvas ||= document.createElement('canvas'); canvas.width = 360; canvas.height = 360;
    const image = new Image(); image.src = 'data:image/svg+xml,' + encodeURIComponent(svg); await image.decode();
    canvas.getContext('2d').drawImage(image, 0, 0, 360, 360);
  };
});
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url()); if (!url.pathname.includes('/api/')) return request.continue();
  const path = url.pathname.slice(url.pathname.indexOf('/api/')); const route = url.searchParams.has('__p') ? `${path}/${url.searchParams.get('__p')}` : path;
  const reply = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (route === '/api/doai/forum-bookmarks') return reply({ ok: true, userId: account, bookmarks: [] });
  if (route === '/api/doai/forum-stats') { ++statsReads; return reply({ ok: true, forums: Array.from({ length: 18 }, (_, index) => ({ id: `forum-${index + 1}`, bookedCount: 0, checkedInCount: 0 })) }); }
  if (route === '/api/user/me') return reply({ id: account, name: account, phone: '13800000000' });
  if (route === '/api/doai/me') return reply({ isAdmin: true });
  if (route === '/api/doai/checkins') {
    const snapshot = structuredClone(rows);
    if (holdRead) { heldRecords = () => reply({ ok: true, checkins: snapshot }); holdRead = false; return; }
    return recordFails ? reply({ error: { message: '本地记录读取失败' } }, 503) : reply({ ok: true, checkins: snapshot });
  }
  if (route === '/api/doai/checkin') {
    ++posts; posted = JSON.parse(request.postData());
    if (mode === 'fail') return reply({ error: { message: '凭证码不存在或已失效' } }, 422);
    if (mode === 'malformed') return reply({ ok: true });
    if (mode === 'duplicate') return reply({ error: { message: '该凭证已核销' } }, 409);
    const input = { ...posted }, owner = account;
    const complete = () => {
      const record = { code: input.code, gate: input.gate, holder: 'QA holder', time: '2026-10-27T00:00:00.000Z' }; rows = [record, ...rows.filter(row => row.code !== record.code)];
      tickets[owner] = tickets[owner].map(ticket => ticket.qrCode === input.code ? { ...ticket, status: 'checked_in', checkedInAt: record.time } : ticket);
      return reply({ ok: true, record });
    };
    if (mode === 'hold') { heldPost = complete; return; } return complete();
  }
  if (route === '/api/doai/tickets') return reply({ tickets: tickets[account] });
  for (const key of ['registrations', 'notifications', 'cards', 'recruitments', 'talents']) if (route === `/api/doai/${key}`) return reply({ [key]: [] });
  if (route === '/api/doai/site-config') return reply({ config: null });
  return reply({ ok: true });
});
const text = value => page.waitForFunction(value => document.body.textContent.includes(value), {}, value);
const checked = code => page.waitForFunction(code => [...document.querySelectorAll('[role="status"]')].some(node => node.textContent.includes('签到成功，可以入场') && node.textContent.includes(code)), {}, code);
const click = async label => { const handle = await page.evaluateHandle(label => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label), label); assert.ok(handle.asElement(), `Missing button: ${label}`); await handle.asElement().evaluate(node => node.click()); await handle.dispose(); };
const route = path => page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `${new URL(site).pathname}/${path}`);
const inputCode = async value => { await page.focus('#checkin-code'); await page.$eval('#checkin-code', node => node.select()); await page.keyboard.type(value); };
const drawQR = code => page.evaluate(svg => window.__drawQR(svg), renderToStaticMarkup(React.createElement(QRCodeSVG, { value: code, size: 360, marginSize: 4, bgColor: '#fff', fgColor: '#000' })).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
try {
  await page.goto(`${site}/admin`, { waitUntil: 'domcontentloaded' }); await text('组委会管理中枢'); await click('验票签到'); await text('签到记录暂时无法加载');
  assert.equal((await page.$eval('main', node => node.textContent)).includes('还没有签到记录'), false);
  recordFails = false; await click('重新加载签到记录'); await text('还没有签到记录');
  await inputCode('QA-FIRST'); await click('验票并签到'); await text('凭证码不存在或已失效'); assert.equal(await page.$eval('#checkin-code', node => node.value), 'QA-FIRST');
  mode = 'malformed'; await click('验票并签到'); await text('核销结果未确认');
  holdRead = true; await click('刷新记录'); await wait(() => heldRecords);
  mode = 'hold'; heldPost = null;
  await page.$eval('form[aria-label="现场验票签到"]', form => { form.requestSubmit(); form.requestSubmit(); }); await wait(() => heldPost); assert.equal(posts, 3);
  assert.equal(await page.$eval('#checkin-gate', node => node.matches(':disabled')), true);
  const beforeStats = statsReads; await heldPost(); mode = 'ok'; await checked('QA-FIRST'); await wait(() => statsReads > beforeStats); await heldRecords(); await text('QA holder');
  assert.equal(await page.$eval('#checkin-code', node => node.value), '');
  assert.equal(await page.$eval('#checkin-code', node => node === document.activeElement), true);
  assert.equal(await page.$eval('#checkin-gate', node => node.selectedOptions[0].textContent), '主入口');
  await page.screenshot({ path: '/tmp/doai-checkin-desktop.png', fullPage: true });
  await drawQR('QA-CAMERA'); await click('开启摄像头扫码'); await page.waitForSelector('video');
  await checked('QA-CAMERA'); const afterCamera = posts;
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 800))); assert.equal(posts, afterCamera);
  await page.select('#checkin-gate', '乐动虹桥'); mode = 'hold'; heldPost = null; await drawQR('QA-CAMERA-NEXT'); await wait(() => heldPost);
  assert.equal(posted.gate, '乐动虹桥'); await page.$eval('form[aria-label="现场验票签到"]', form => { form.requestSubmit(); form.requestSubmit(); }); assert.equal(posts, afterCamera + 1);
  await heldPost(); mode = 'fail'; await checked('QA-CAMERA-NEXT'); await drawQR('QA-RETRY'); await text('重试识别的凭证'); await text('凭证码不存在或已失效');
  mode = 'ok'; await click('重试识别的凭证'); await checked('QA-RETRY');
  await page.type('input[type="search"]', 'not-a-real-holder'); await text('未找到匹配记录');
  await page.$eval('input[type="search"]', node => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(node, 'QA holder'); node.dispatchEvent(new Event('input', { bubbles: true })); });
  await text('在已加载记录中找到 4 条');
  await click('关闭摄像头');
  mode = 'duplicate'; await inputCode('QA-FIRST'); await click('验票并签到'); await text('该凭证已签到');
  assert.equal(await page.$$eval('section[aria-label="签到记录"] tbody tr', nodes => nodes.length), 4);
  mode = 'ok';
  await page.waitForFunction(() => window.__streams.every(stream => stream.getTracks().every(track => track.readyState === 'ended')));
  await page.evaluate(() => { window.__cameraDeferred = true; }); await click('开启摄像头扫码'); await text('取消开启摄像头');
  await route('conference'); await page.evaluate(() => window.__releaseCamera());
  await page.waitForFunction(() => window.__streams.length === 2 && window.__streams.every(stream => stream.getTracks().every(track => track.readyState === 'ended')));
  console.log('PASS: explicit record-load errors, failure drafts, malformed confirmation, manual/camera duplicate lock, latest gate, QR failure retry and late camera-stream cleanup');

  await route('dashboard/passport'); await text('大会参会凭证'); await text('现场核销');
  mode = 'fail'; await click('现场核销'); await text('凭证码不存在或已失效');
  assert.equal((await page.$eval('main', node => node.textContent)).includes('闸机已接收电子签到信号'), false);
  await text('有效凭证'); mode = 'duplicate'; await click('现场核销'); await text('该凭证已核销'); await text('有效凭证');
  mode = 'malformed'; await click('现场核销'); await text('核销结果未确认'); await text('有效凭证');
  mode = 'hold'; heldPost = null; const before = posts;
  await page.evaluate(() => { const node = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === '现场核销'); node.click(); node.click(); }); await wait(() => heldPost); assert.equal(posts, before + 1);
  await heldPost(); await text('核销成功：主入口'); await text('已现场核销');
  assert.equal(tickets['admin-a'][0].checkedInAt, '2026-10-27T00:00:00.000Z');
  console.log('PASS: dashboard errors never show success, conflicts reload actual state, guest passes are correctly labelled and successful check-in uses the saved audit time');
  await page.setViewport({ width: 390, height: 844 }); await route('admin'); await text('组委会管理中枢'); await click('验票签到'); await text('QA holder');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); assert.equal(await page.$eval('#checkin-code', node => node === document.activeElement), false); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: '/tmp/doai-checkin-mobile.png', fullPage: true });
  tickets['admin-a'][0].status = 'claimed';
  await page.goto(`${site}/dashboard/passport`, { waitUntil: 'domcontentloaded' }); await text('现场核销'); mode = 'hold'; heldPost = null;
  await click('现场核销'); await wait(() => heldPost);
  await route('dashboard/settings'); await text('重新读取账号'); account = 'admin-b'; await click('重新读取账号');
  await page.waitForSelector('img[alt="admin-b"]'); await route('dashboard/passport'); await heldPost();
  assert.equal((await page.$eval('main', node => node.textContent)).includes('QA-DASHBOARD'), false);
  assert.equal((await page.$eval('main', node => node.textContent)).includes('核销成功：'), false);
  console.log('PASS: an old administrator check-in response cannot change the new account passes or display its success notice');
  assert.deepEqual(errors, []);
} catch (error) { console.log(await page.evaluate(() => ({ text: document.body.textContent.slice(-2500), video: document.querySelector('video') && { readyState: document.querySelector('video').readyState, width: document.querySelector('video').videoWidth, time: document.querySelector('video').currentTime }, cameras: window.__cameraRequests }))); throw error; } finally { await browser.close(); }
