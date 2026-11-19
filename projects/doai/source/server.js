/** DOAI 本地/Vercel 同源代理。业务逻辑与数据位于 atomhub-api 的 DoaiModule。 */
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Vercel 上的 catch-all 函数在本项目只命中单段路径：/api/doai 能进函数，
 * /api/doai/health 直接被平台判为 NOT_FOUND（x-vercel-error: NOT_FOUND）。
 * 因此前端 apiUrl() 把第一段之后的路径压进查询参数 __p，由这里还原成真实路径。
 * 这样既不依赖 vercel.json 的 rewrite（避免查询串在重写时丢失），
 * 也让本地 dev 与线上走同一条链路。
 */
/** 单段路径只允许常规字符；`.` 与 `..` 由 isSafeTail 单独拒绝。 */
const SAFE_SEGMENT = /^[A-Za-z0-9_\-.~]+$/;

/**
 * 还原出来的尾段必须逐段可信：`.`/`..` 会让 new URL() 把路径规范化到别的命名空间
 * （/api/doai?__p=../auth/send-code 会变成 /api/auth/send-code），
 * 也可能撞上本进程自己的 /api/wx/* 路由。因此整段不合格就判定为非法。
 */
function isSafeTail(tail) {
  if (!tail) return true;
  return tail.split('/').every(seg => seg && seg !== '.' && seg !== '..' && SAFE_SEGMENT.test(seg));
}

export function restoreApiPath(url = '') {
  const raw = String(url);
  const queryAt = raw.indexOf('?');
  const pathname = queryAt === -1 ? raw : raw.slice(0, queryAt);
  const search = queryAt === -1 ? '' : raw.slice(queryAt + 1);
  if (!search) return pathname;
  const query = new URLSearchParams(search);
  const rest = query.get('__p');
  // 非法尾段原样返回（仍带 __p），由代理层据此回 404，不会静默改道。
  if (rest === null) return `${pathname}?${search}`;
  const namespace = /^\/api\/([^/]+)$/.exec(pathname);
  if (!namespace) return `${pathname}?${search}`;
  const tail = rest.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!isSafeTail(tail)) return `${pathname}?${search}`;
  query.delete('__p');
  const remaining = query.toString();
  return `/api/${namespace[1]}${tail ? `/${tail}` : ''}${remaining ? `?${remaining}` : ''}`;
}

/** 只放行账号别名与业务接口；判定与转发都基于还原后的 pathname。 */
const ALLOWED = [
  /^\/api\/doai(?:\/|$)/,
  /^\/api\/auth\/(?:send-code|login|logout)$/,
  /^\/api\/user\/me$/,
];

export function isAllowedApiPath(pathname = '') {
  return ALLOWED.some(re => re.test(pathname));
}

const COVER_HOSTS = new Set(['mmbiz.qpic.cn', 'mmbiz.qlogo.cn']);

/* ------------------------------ 公众号同步 ------------------------------ */
const WX_ARTICLES = ['https://mp.weixin.qq.com/s/sMWo7pxvNdycwfz07TfBRg'];
const ARTICLE_TTL = 10 * 60 * 1000;
const articleCache = new Map();

function extractMeta(html, url) {
  const meta = prop => {
    const m = html.match(new RegExp(`property="og:${prop}" content="([^"]*)"`, 'i'));
    return m ? m[1] : '';
  };
  const timeMatch = html.match(/var\s+createTime\s*=\s*['"]([^'"]+)['"]/);
  return {
    url,
    title: meta('title') || '未命名文章',
    cover: meta('image'),
    description: meta('description'),
    publishTime: timeMatch ? timeMatch[1] : '',
    source: '微信公众号',
  };
}

async function fetchArticle(url, fetchImpl) {
  const cached = articleCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < ARTICLE_TTL) return cached.data;
  try {
    const response = await fetchImpl(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = extractMeta(await response.text(), url);
    articleCache.set(url, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    // 抓取失败时返回上次成功的缓存，完全没缓存时才暴露错误，避免整块卡片清空。
    if (cached) return cached.data;
    return { url, title: '公众号文章', cover: '', description: '', publishTime: '', source: '微信公众号', error: String(err) };
  }
}

export function createDoaiProxy({ upstream = process.env.ATOMHUB_API_URL || 'https://v2.atomclub.cn', fetchImpl = fetch } = {}) {
  const app = express();
  const origin = new URL(upstream);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('ATOMHUB_API_URL must be an HTTP(S) origin');
  app.use(express.json({ limit: '1mb' }));

  // 先把被压进 __p 的路径还原，后面所有路由与白名单都基于还原后的 URL。
  app.use((req, _res, next) => {
    req.url = restoreApiPath(req.url);
    req.restoredUrl = req.url;
    next();
  });

  /** 单段探针：代理是否在线、主站 DoaiModule 是否已发布，一眼可见。 */
  app.get('/api/health', async (_req, res) => {
    const started = Date.now();
    let status = 0;
    try {
      const response = await fetchImpl(new URL('/api/doai/health', origin), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      status = response.status;
    } catch { status = 0; }
    res.set('Cache-Control', 'no-store').json({
      ok: true,
      proxy: 'ok',
      upstream: origin.origin,
      doai: status === 200 ? 'ok' : status === 0 ? 'unreachable' : `http_${status}`,
      ms: Date.now() - started,
    });
  });

  /** 公众号动态：文章元信息由本进程抓取，前端不再依赖旧 JSON 后端。 */
  app.get(['/api/wx/articles', '/api/wx-articles'], async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, articles: await Promise.all(WX_ARTICLES.map(url => fetchArticle(url, fetchImpl))) });
  });

  /** 公众号封面防盗链代理：只放行微信公众号图片域名，且只接受 https。 */
  app.get(['/api/wx/cover', '/api/wx-cover'], async (req, res) => {
    const raw = String(req.query.u || '');
    let parsed = null;
    try { parsed = new URL(raw); } catch { parsed = null; }
    if (!parsed || parsed.protocol !== 'https:' || !COVER_HOSTS.has(parsed.hostname)) {
      return res.status(400).json({ ok: false, message: '只代理微信公众号图片域名' });
    }
    try {
      const response = await fetchImpl(parsed.href, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://mp.weixin.qq.com/' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      res.set('Cache-Control', 'public, max-age=86400')
        .type(response.headers.get('content-type') || 'image/jpeg')
        .send(Buffer.from(await response.arrayBuffer()));
    } catch { res.status(502).json({ ok: false, message: '封面获取失败' }); }
  });

  app.use('/api', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const raw = req.restoredUrl || req.originalUrl;
    let target;
    try { target = new URL(raw, origin); } catch { target = null; }
    // 还原失败时 __p 会留在查询串里：直接拒绝，避免把非法路径原样透传给上游。
    if (target && target.searchParams.has('__p')) target = null;
    // new URL() 会规范化 ../，所以白名单判定用规范化后的 pathname；同时锁死上游 origin。
    if (!target || target.origin !== origin.origin || !isAllowedApiPath(target.pathname)) {
      return res.status(404).json({ error: { message: '接口不存在' } });
    }
    try {
      const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (req.headers.authorization) headers.Authorization = req.headers.authorization;
      if (typeof req.headers['x-doai-actor'] === 'string' && (target.pathname.startsWith('/api/doai/') || target.pathname.replace(/\/+$/, '') === '/api/auth/logout')) headers['X-DOAI-Actor'] = req.headers['x-doai-actor'];
      const sid = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('sid='));
      if (sid) headers.Cookie = sid;
      const response = await fetchImpl(target, {
        method: req.method, headers, redirect: 'manual', signal: AbortSignal.timeout(15000),
        ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: JSON.stringify(req.body || {}) }),
      });
      // Vercel 域名使用本域 HttpOnly sid；主站会话仍由 atom-auth 校验。
      const cookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
      for (const cookie of cookies) {
        if (/^sid=/i.test(cookie)) {
          let scoped = cookie.replace(/;\s*domain=[^;]*/gi, '');
          if (!/;\s*HttpOnly/i.test(scoped)) scoped += '; HttpOnly';
          if (!/;\s*SameSite=/i.test(scoped)) scoped += '; SameSite=Lax';
          res.append('Set-Cookie', scoped);
        }
      }
      res.status(response.status).type(response.headers.get('content-type') || 'application/json').send(Buffer.from(await response.arrayBuffer()));
    } catch { res.status(502).json({ error: { message: '暂时无法连接原子公社服务' } }); }
  });
  return app;
}
const app = createDoaiProxy();
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) app.listen(process.env.PORT || 3102, () => console.log('[doai-proxy] listening on :3102'));
export default app;
