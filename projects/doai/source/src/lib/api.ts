import {
  actorSnapshot,
  actorSnapshotIsCurrent,
  currentAuthToken,
  doaiRequestPath,
  doaiRouteNeedsActor,
  PENDING_ACTOR,
  ANONYMOUS_ACTOR,
  requestAuthChange,
} from './authSession.ts';

// 业务接口统一位于主站 /api/doai；账号接口复用 /api/auth 和 /api/user。
//
// 两种部署形态共用同一个 apiUrl()，靠构建时的 BASE 自动分流：
//
// 1) 独立部署（本地 dev / Vercel 域名）：BASE_URL 为 '/'，页面与 serverless 函数同域。
//    Vercel 的 catch-all 函数只命中单段路径——/api/doai 能进函数，/api/doai/me 直接被
//    平台判成 NOT_FOUND（x-vercel-error: NOT_FOUND）。因此把第一段之后的路径压进 __p
//    查询参数，由 server.js 的 restoreApiPath() 还原成真实路径。
// 2) 主站子路径部署（BASE=/doai/）：纯静态目录，没有 serverless 函数，也不做压缩，
//    请求带 /doai 前缀走真实多段路径，由 nginx 把 /doai/api/* 反代回主站 /api/*。
//    线上实测 /doai/api/doai/me 返回 401、/doai/api/doai?__p=me 返回 404。
// import.meta.env 只在 Vite 里存在；node --test 直接跑本文件时需要兜底。
const BASE = ((import.meta.env?.BASE_URL as string | undefined) || '/').replace(
  /\/$/,
  '',
);

export const apiBase = BASE;

/** 构建时以子路径发布（如 /doai），静态托管 + 反代，不走路径压缩。 */
export const isSubPathDeploy = BASE !== '';

/** 只有这些命名空间直连上游，其余 /api/x 一律映射进 /api/doai/x。 */
const DIRECT = /^\/api\/(?:auth|user|doai|health)(?:[/-]|$)/;
/** 公众号同步：独立部署由 server.js 自带代理；子路径部署没有该路由，落回 doai 命名空间。 */
const WX = /^\/api\/wx(?:[/-]|$)/;

/**
 * 归属命名空间映射：子路径部署下 wx 也并入 /api/doai（后端只有
 * /api/doai/wx-articles，/api/wx-articles 为 404；封面没有代理路由）。
 */
export function mapApiNamespace(
  path: string,
  subPath = isSubPathDeploy,
): string {
  if (DIRECT.test(path)) return path;
  if (WX.test(path)) {
    return subPath
      ? path.replace(/^\/api\/wx(?=[/-]|$)/, '/api/doai/wx')
      : path;
  }
  return path.replace(/^\/api(?=\/|$)/, '/api/doai');
}

/**
 * Vercel 上本项目的 serverless 函数只命中单段路径：/api/doai 能进函数，
 * /api/doai/me 会直接被平台判成 NOT_FOUND（x-vercel-error: NOT_FOUND）。
 * 因此把第一段之后的路径压进 __p 查询参数，由 server.js 的 restoreApiPath()
 * 还原成真实路径。本地 vite 代理与线上走同一条链路，行为一致、可本地验证。
 */
export function flattenApiPath(path: string): string {
  const hashAt = path.indexOf('#');
  const hash = hashAt === -1 ? '' : path.slice(hashAt);
  const clean = hashAt === -1 ? path : path.slice(0, hashAt);
  const queryAt = clean.indexOf('?');
  const pathname = queryAt === -1 ? clean : clean.slice(0, queryAt);
  const search = queryAt === -1 ? '' : clean.slice(queryAt + 1);
  const matched = /^\/api\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (!matched || !matched[2]) return path;
  // URLSearchParams 会解码后重新编码，u= 这类已编码参数能正确往返。
  const params = new URLSearchParams(search);
  params.set('__p', matched[2]);
  return `/api/${matched[1]}?${params.toString()}${hash}`;
}

/** 纯函数入口，便于测试两种 base 下的完整结果。 */
export function resolveApiPath(path: string, base: string = BASE): string {
  const subPath = base !== '';
  const mapped = mapApiNamespace(path, subPath);
  return subPath ? base + mapped : flattenApiPath(mapped);
}

export function apiUrl(path: string): string {
  return resolveApiPath(path);
}

/**
 * 公众号封面防盗链代理：独立部署由 server.js 提供 /api/wx/cover；
 * 子路径部署没有该反代路由（/api/wx/cover 为 404），直接给原图地址，
 * 由 <img referrerPolicy="no-referrer"> 绕过防盗链。
 */
export function wxCoverUrl(
  cover: string,
  subPath: boolean = isSubPathDeploy,
): string {
  return subPath
    ? cover
    : apiUrl(`/api/wx/cover?u=${encodeURIComponent(cover)}`);
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request =
    typeof Request !== 'undefined' && input instanceof Request ? input : null;
  const method = (init?.method || request?.method || 'GET').toUpperCase();
  const headers = new Headers(init?.headers || request?.headers);
  const token = currentAuthToken(),
    snapshot = actorSnapshot(),
    path = doaiRequestPath(input);
  const bound = Boolean(
    path && doaiRouteNeedsActor(path, method) && snapshot.actor !== null,
  );
  if (
    bound &&
    snapshot.actor !== ANONYMOUS_ACTOR &&
    snapshot.actor !== PENDING_ACTOR &&
    token !== snapshot.token
  ) {
    requestAuthChange(token ? 'login' : 'logout', snapshot);
    throw new ApiError(
      '登录账号已变化，本次操作未提交，请确认账号后重试',
      409,
      'DOAI_SESSION_CHANGED',
    );
  }
  if (bound && snapshot.actor === PENDING_ACTOR)
    throw new ApiError(
      '正在确认登录状态，请稍后重试',
      409,
      'DOAI_SESSION_CHECKING',
    );
  if (
    bound &&
    snapshot.actor === ANONYMOUS_ACTOR &&
    !['GET', 'HEAD'].includes(method)
  )
    throw new ApiError('请先登录', 401, 'DOAI_SESSION_EXPIRED');
  if (bound) headers.set('X-DOAI-Actor', snapshot.actor!);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const timeout = AbortSignal.timeout(20_000);
  const callerSignal = init?.signal || request?.signal;
  const signal = callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (timeout.aborted && !callerSignal?.aborted)
      throw new ApiError('请求超时，请检查网络后重试', 408, 'REQUEST_TIMEOUT');
    throw error;
  }
  if (
    bound &&
    snapshot.actor !== ANONYMOUS_ACTOR &&
    snapshot.actor !== PENDING_ACTOR &&
    actorSnapshotIsCurrent(snapshot)
  ) {
    if (currentAuthToken() !== snapshot.token)
      requestAuthChange(currentAuthToken() ? 'login' : 'logout', snapshot);
    else if (response.status === 401) requestAuthChange('expired', snapshot);
    else if (response.status === 409) {
      const data = await response
        .clone()
        .json()
        .catch(() => null);
      if (data?.error?.code === 'DOAI_SESSION_CHANGED')
        requestAuthChange('recheck', snapshot);
    }
  }
  return response;
}
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
export async function apiRequest<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const res = await apiFetch(apiUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(error => {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError')
      throw new ApiError('请求超时，请检查网络后重试', 408, 'REQUEST_TIMEOUT');
    return null;
  });
  if (!res.ok || !data)
    throw new ApiError(
      data?.error?.message || data?.message || `请求失败 (${res.status})`,
      res.status,
      data?.error?.code,
    );
  return data as T;
}
