/**
 * 线上冒烟：首页、深链、代理探针、以及压缩路径（?__p=）是否真正还原。
 * 只读，不写入任何数据。
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.VERIFY_BASE || 'https://doai-website-three.vercel.app';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`, detail === undefined ? '' : JSON.stringify(detail));
};

// 1) 代理层：不依赖浏览器即可判断的关键接口
const probe = async path => {
  const res = await fetch(`${BASE}${path}`);
  const text = (await res.text()).slice(0, 200);
  return { status: res.status, text };
};

const health = await probe('/api/health');
check('代理探针 /api/health', health.status === 200 && health.text.includes('"proxy":"ok"'), health);
check('主站 DoaiModule 已发布', health.text.includes('"doai":"ok"'), { doai: (health.text.match(/"doai":"[^"]+"/) || [])[0] });

// 压缩路径：/api/doai?__p=me 与 /api/user/me 同源同函数，必须不是 Vercel NOT_FOUND
const me = await probe('/api/doai?__p=me');
check('压缩路径 /api/doai?__p=me 未被平台拦截', me.status !== 404 || !me.text.includes('NOT_FOUND'), me);

const cover = await probe('/api/wx?__p=cover&u=https%3A%2F%2Fevil.test%2Fa.jpg');
check('封面代理拒绝非微信域名', cover.status === 400, { status: cover.status });

const traversal = await probe('/api/doai?__p=..%2Fadmin%2Fdelete');
check('压缩路径不能穿越白名单', traversal.status === 404, { status: traversal.status });

// 2) 浏览器：首页与深链
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--disable-gpu'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 100)));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));
  const home = await page.evaluate(() => ({
    title: document.title.slice(0, 40),
    hero: document.body.textContent.includes('GLOBAL AI MAKERS') || document.body.textContent.includes('Dobe'),
    failedAssets: performance.getEntriesByType('resource').filter(e => e.responseStatus >= 400).length,
  }));
  check('公网首页渲染', home.hero && home.failedAssets === 0, { ...home, errors: errors.length });

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1200));
  const deep = await page.evaluate(() => ({ path: location.pathname, dash: document.body.textContent.includes('李晨') || document.body.textContent.includes('Passport') }));
  check('公网深链 /dashboard', deep.dash, deep);
} finally {
  await browser.close();
}

const failed = checks.filter(c => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} 通过`);
process.exit(failed.length ? 1 : 0);
