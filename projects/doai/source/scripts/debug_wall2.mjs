import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--disable-gpu', '--hide-scrollbars'] });
const page = await browser.newPage();
const reqs = [];
page.on('response', r => { if (r.url().includes('/api/')) reqs.push(r.status() + ' ' + r.url().replace('http://localhost:3000', '')); });
page.on('pageerror', e => console.log('PAGE-ERR:', String(e).slice(0, 250)));
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000/square', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1800));
const info = await page.evaluate(() => ({
  hasCardWallTitle: document.body.textContent.includes('创客名片墙'),
  bodyTail: document.body.textContent.replace(/\s+/g, ' ').slice(-260),
}));
console.log(JSON.stringify(info));
console.log('API:', reqs.join(' | '));
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: '/tmp/square_bottom.png' });
await browser.close();
