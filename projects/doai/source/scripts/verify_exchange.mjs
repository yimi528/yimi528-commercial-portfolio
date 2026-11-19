import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--disable-gpu', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000/square', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1500));
// 点交换名片（王羽涵卡）
const r1 = await page.evaluate(async () => {
  const wall = [...document.querySelectorAll('section')].find(s => s.textContent.includes('创客名片墙'));
  const card = [...wall.querySelectorAll('.doa-card')].find(c => c.textContent.includes('王羽涵'));
  const btn = [...card.querySelectorAll('button')].find(b => b.textContent.includes('交换名片'));
  btn.scrollIntoView({ block: 'center' });
  btn.click();
  await new Promise(r => setTimeout(r, 700));
  return { toast: document.body.textContent.includes('名片交换成功') };
});
console.log('1. 交换名片 toast:', r1.toast ? 'PASS' : 'FAIL');
// 站内导航到 dashboard（不整页刷新，保持内存状态）
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === '我的 DOAI');
  btn.click();
});
await new Promise(r => setTimeout(r, 1000));
const r2 = await page.evaluate(() => {
  const m = document.body.textContent.match(/已互换的名片盒 \((\d+)\)/);
  return { count: m?.[1], hasWang: document.body.textContent.includes('王羽涵 Vivian Wang') };
});
console.log('2. Passport 名片盒:', r2.count === '3' && r2.hasWang ? 'PASS' : 'FAIL', JSON.stringify(r2));
await browser.close();
