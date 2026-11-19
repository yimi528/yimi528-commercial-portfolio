import puppeteer from 'puppeteer-core';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveApiPath } from '../src/lib/api.ts';

const defaultSite = 'https://atomclub.cn/doai/';
const entryAssets = html => [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(match => match[1]);
const meta = (html, property) => [...html.matchAll(/<meta\b[^>]*>/gi)].find(match => match[0].includes(`property="${property}"`))?.[0].match(/content="([^"]*)"/)?.[1];

/** Public GETs only, in a fresh browser context. No login, SMS or business writes. */
export async function auditProduction({ site = defaultSite, output = '/tmp/doai-production-audit.json' } = {}) {
  const target = new URL(site);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) throw new Error('Use an HTTP(S) site URL without credentials, query or hash');
  const base = target.pathname.replace(/\/+$/, '');
  const siteUrl = route => `${target.origin}${base}/${route}`;
  const apiUrl = path => new URL(resolveApiPath(`/api/doai/${path}`, base), target.origin).href;
  const report = { schemaVersion: 1, checkedAt: new Date().toISOString(), target: siteUrl(''), readOnly: true, checks: [], diagnostics: { blockedWrites: [], browserErrors: [], apiErrors: [] } };
  const check = (id, pass, actual, expected) => {
    report.checks.push({ id, pass: Boolean(pass), expected, actual });
    console.log(`${pass ? 'PASS' : 'FAIL'}: ${id}`);
  };
  const get = async url => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
      const text = await response.text(); let json;
      try { json = JSON.parse(text); } catch { /* HTML is inspected separately. */ }
      return { status: response.status, type: response.headers.get('content-type') || '', text, json };
    } catch (error) { return { status: 0, error: error.message, text: '', type: '' }; }
  };
  const index = await get(siteUrl(''));
  let expectedAssets = [];
  try { expectedAssets = entryAssets(await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')); } catch { /* Missing local release is a failed gate, not a match. */ }
  const actualAssets = entryAssets(index.text);
  check('current-frontend-build', index.status === 200 && expectedAssets.length > 0 && JSON.stringify(actualAssets) === JSON.stringify(expectedAssets), { assets: actualAssets, status: index.status }, { assets: expectedAssets, status: 200 });
  const staticBody = (index.text.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  check('share-readable-without-javascript', index.status === 200 && staticBody.length > 200 && staticBody.includes('DOAI'), { bodyCharacters: staticBody.length }, 'At least 200 characters of crawlable DOAI body content');
  const image = meta(index.text, 'og:image'), title = meta(index.text, 'og:title'), description = meta(index.text, 'og:description');
  check('share-metadata', title && description && image && /^https?:\/\//.test(image), { title: title || null, descriptionPresent: Boolean(description), image: image || null }, 'Open Graph title, description and absolute image URL');
  try {
    const cover = await fetch(siteUrl('share-cover.jpg'), { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    check('share-cover-resource', cover.ok && (cover.headers.get('content-type') || '').startsWith('image/'), { status: cover.status, type: cover.headers.get('content-type') }, 'A deployed image resource');
  } catch (error) { check('share-cover-resource', false, error.message, 'A deployed image resource'); }
  const probes = await Promise.all([
    ['backend-health', 'health', 200], ['recruitment-api', 'recruitments', 200], ['forum-statistics-api', 'forum-stats', 200],
    ['anonymous-bookmarks-isolation', 'forum-bookmarks', 401], ['anonymous-registration-receipt-isolation', 'registration-requests/audit-read-only-key', 401],
  ].map(async ([id, path, expected]) => ({ id, path, expected, result: await get(apiUrl(path)) })));
  for (const { id, path, expected, result } of probes) {
    let valid = result.status === expected;
    if (path === 'health') valid &&= result.json?.ok === true && result.json?.module === 'doai';
    if (path === 'recruitments') valid &&= Array.isArray(result.json?.recruitments);
    if (path === 'forum-stats') valid &&= result.json?.ok === true && Array.isArray(result.json?.forums) && result.json.forums.length === 18;
    check(id, valid, { status: result.status, error: result.error || (result.status >= 400 ? result.json?.message || result.json?.error?.message : undefined) }, { status: expected });
  }
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 960 });
  await page.evaluateOnNewDocument(() => localStorage.setItem('doai_lang', 'zh'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      report.diagnostics.blockedWrites.push({ method: request.method(), url: request.url() });
      return request.abort('blockedbyclient');
    }
    return request.continue();
  });
  page.on('pageerror', error => report.diagnostics.browserErrors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400 && response.url().includes('/api/') && response.status() !== 401) report.diagnostics.apiErrors.push({ url: response.url(), status: response.status() }); });
  const go = async route => {
    await page.goto(siteUrl(route), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('header', { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('main')?.textContent.length > 80, { timeout: 15000 });
  };
  const main = () => page.$eval('main', node => node.textContent);
  const safe = async (id, work) => { try { await work(); } catch (error) { check(id, false, error.message, 'Public page check completes'); } };
  const click = label => page.evaluate(label => {
    const nodes = [...document.querySelectorAll('header button, main button, header a, main a')];
    const node = nodes.find(node => node.getClientRects().length && node.textContent.includes(label));
    if (!node) return { found: false };
    if (node.getAttribute('aria-disabled') === 'true' || (node instanceof HTMLButtonElement && node.disabled)) return { found: false, disabled: true };
    if (node instanceof HTMLAnchorElement && node.href.startsWith('mailto:')) return { found: true, mailto: node.href };
    node.click(); return { found: true };
  }, label);
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  try {
    await safe('home-runtime', async () => {
      await go(''); const text = await main();
      check('home-runtime', text.includes('DOAI') && text.includes('12.5') && text.includes('12.6'), { title: await page.$eval('main h1', node => node.textContent) }, 'Current December DOAI homepage');
      const footer = await page.$eval('footer', node => node.textContent);
      check('footer-year', footer.includes('© 2026') && !footer.includes('© 2025'), { correctYear: footer.includes('© 2026') }, '2026 copyright');
      const alert = await page.$$eval('[role="alert"]', nodes => nodes.map(node => node.textContent));
      check('home-no-recruitment-error', !alert.some(text => text.includes('Cannot GET') || text.includes('recruitments')), { alerts: alert }, 'No persistent recruitment error');
    });
    await safe('legacy-tickets-route', async () => { await go('tickets'); check('legacy-tickets-route', (await main()).includes('立即报名参会'), { path: new URL(page.url()).pathname, title: await page.$eval('main h1', node => node.textContent) }, 'Attendance content'); });
    await safe('showcase-route', async () => { await go('showcase'); check('showcase-route', (await main()).includes('入围项目待公布'), { path: new URL(page.url()).pathname, title: await page.$eval('main h1', node => node.textContent) }, 'Independent truthful project showcase'); });
    await safe('showcase-navigation', async () => {
      await go(''); const action = await click('项目展示'); await settle();
      check('showcase-navigation', action.found && new URL(page.url()).pathname === `${base}/showcase` && (await main()).includes('入围项目待公布'), { action, path: new URL(page.url()).pathname }, `${base}/showcase`);
    });
    await safe('english-ticket-navigation', async () => {
      await go(''); await page.evaluate(() => { const control = document.querySelector('button[aria-label="Switch to English"]') || [...document.querySelectorAll('header button')].find(node => /^(?:中|ZH)\s*\/\s*EN$/.test(node.textContent.trim())); control?.click(); });
      await page.waitForFunction(() => [...document.querySelectorAll('header button, header a, main button, main a')].some(node => node.textContent.includes('Get Tickets')), { timeout: 5000 });
      const action = await click('Get Tickets'); await settle();
      check('english-ticket-navigation', action.found && new URL(page.url()).pathname === `${base}/attend`, { action, path: new URL(page.url()).pathname }, `${base}/attend`);
    });
    await safe('partnership-contact', async () => {
      await go('partner'); const action = await click('发送合作咨询');
      let visible = false;
      if (!action.mailto && action.found) { try { await page.waitForFunction(() => { const box = document.getElementById('partnership-contact')?.getBoundingClientRect(); return box && box.top < innerHeight && box.bottom > 0; }, { timeout: 4000 }); visible = true; } catch { /* The target and email are still checked below. */ } }
      check('partnership-contact', Boolean(action.mailto?.includes('jocelyn@atomesh.cn') || (visible && page.url().startsWith(siteUrl('partner')) && (await main()).includes('jocelyn@atomesh.cn'))), { action, visible, path: new URL(page.url()).pathname }, 'Valid partner email or in-page contact');
    });
    await safe('fde-specific-brief', async () => { await go('register/industry/b-prop-sf'); const value = await page.$eval('#entry-direction', node => node.value); check('fde-specific-brief', value === 'b-prop-sf', { value }, 'b-prop-sf is visibly selected before submission'); });
    await safe('contest-entry-scroll', async () => {
      await go('maker'); const action = await click('选择赛道并报名');
      await page.waitForFunction(() => { const box = document.getElementById('maker-tracks')?.getBoundingClientRect(); return box && box.top < innerHeight && box.bottom > 0; }, { timeout: 4000 });
      check('contest-entry-scroll', action.found, { action }, 'Track choices scroll into view');
    });
    await safe('news-no-old-demo-partner', async () => { await go('news'); const text = await main(); check('news-no-old-demo-partner', !text.includes('首批战略合作方确认：涂鸦智能、上服集团、飞书深诺、素然服装'), { oldDemoPresent: text.includes('首批战略合作方确认：涂鸦智能、上服集团、飞书深诺、素然服装') }, 'No outdated synthetic partner announcement'); });
    check('runtime-no-exceptions', report.diagnostics.browserErrors.length === 0, report.diagnostics.browserErrors, []);
    check('audit-no-write-attempts', report.diagnostics.blockedWrites.length === 0, report.diagnostics.blockedWrites, []);
  } finally { await context.close(); await browser.close(); }
  report.totals = { passed: report.checks.filter(check => check.pass).length, failed: report.checks.filter(check => !check.pass).length };
  if (output) await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ target: report.target, ...report.totals, output }));
  return report;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const report = await auditProduction({ site: process.env.TEST_SITE || defaultSite, output: process.env.DOAI_AUDIT_OUTPUT || '/tmp/doai-production-audit.json' });
  if (report.totals.failed) process.exitCode = 1;
}
