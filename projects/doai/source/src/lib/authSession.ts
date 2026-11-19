import { readBrowserValue, writeBrowserValue, removeBrowserValue } from './browserStorage.ts';
export const ANONYMOUS_ACTOR = '__anonymous__',
  PENDING_ACTOR = '__pending__';
export const AUTH_CHANGE_EVENT = 'doai:auth-change';
export type AuthChangeKind = 'login' | 'logout' | 'recheck' | 'expired';
export interface ActorSnapshot {
  actor: string | null;
  token: string | null;
  revision: number;
}
export interface IdentityProof {
  actor: string;
  token: string | null;
}
const identityProofs = new WeakMap<object, IdentityProof>();
export function recordIdentityProof<T extends object>(
  value: T,
  actor: string,
  token: string | null,
): T {
  identityProofs.set(value, { actor, token });
  return value;
}
export function inheritIdentityProof<T extends object>(
  source: object,
  value: T,
): T {
  const proof = identityProofs.get(source);
  if (proof) identityProofs.set(value, proof);
  return value;
}
export const identityProofFor = (value: object) => identityProofs.get(value);
// An unconfirmed server logout must also suppress cookie restoration after refresh.
let epoch = 0,
  signedOut = readBrowserValue('doai_logout_pending') === '1',
  binding: ActorSnapshot = { actor: null, token: null, revision: 0 };
export const currentAuthToken = () =>
  readBrowserValue('user_token') || readBrowserValue('atomhub_user_token');
export const authSessionEpoch = () => epoch;
export const explicitlySignedOut = () => signedOut;
export const actorSnapshot = (): ActorSnapshot => ({ ...binding });
export const actorSnapshotIsCurrent = (snapshot: ActorSnapshot) =>
  snapshot.revision === binding.revision && snapshot.actor === binding.actor;
export function bindDoaiActor(
  actor: string | null,
  verifiedToken?: string | null,
) {
  const hasProof = arguments.length > 1;
  if (
    !hasProof &&
    actor === binding.actor &&
    actor &&
    ![ANONYMOUS_ACTOR, PENDING_ACTOR].includes(actor)
  )
    return;
  const token = hasProof ? verifiedToken! : currentAuthToken();
  if (actor !== binding.actor || token !== binding.token)
    binding = { actor, token, revision: binding.revision + 1 };
}
export function beginAuthTransition(kind: AuthChangeKind) {
  epoch++;
  signedOut = kind === 'logout' || kind === 'expired';
  if (kind === 'login') removeBrowserValue('doai_logout_pending');
  if (binding.actor !== null) bindDoaiActor(PENDING_ACTOR);
  return epoch;
}
export function requestAuthChange(
  kind: AuthChangeKind,
  snapshot?: ActorSnapshot,
) {
  if (snapshot && !actorSnapshotIsCurrent(snapshot)) return;
  const next = beginAuthTransition(kind);
  if (typeof window !== 'undefined')
    window.dispatchEvent(
      new CustomEvent(AUTH_CHANGE_EVENT, {
        detail: { kind, epoch: next, remote: false },
      }),
    );
}
const source = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let channel: BroadcastChannel | null = null;
const seen = new Set<string>();
function remoteChange(value: unknown) {
  if (!value || typeof value !== 'object') return;
  const message = value as { kind?: string; source?: string; nonce?: string };
  if (
    message.source === source ||
    !['login', 'logout'].includes(message.kind || '') ||
    typeof window === 'undefined'
  )
    return;
  if (typeof message.nonce !== 'string' || seen.has(message.nonce)) return;
  seen.add(message.nonce);
  if (seen.size > 64) seen.delete(seen.values().next().value!);
  window.dispatchEvent(
    new CustomEvent(AUTH_CHANGE_EVENT, {
      detail: { kind: message.kind, remote: true },
    }),
  );
}
if (typeof window !== 'undefined') {
  try {
    channel = new BroadcastChannel('doai-auth-session');
    channel.onmessage = (event) => remoteChange(event.data);
  } catch {}
  window.addEventListener('storage', (event) => {
    if (event.key === 'doai_session_signal') {
      try {
        remoteChange(JSON.parse(event.newValue || 'null'));
      } catch {}
      return;
    }
    if (
      event.key !== null &&
      !['user_token', 'atomhub_user_token'].includes(event.key)
    )
      return;
    if (currentAuthToken() === binding.token) return;
    window.dispatchEvent(
      new CustomEvent(AUTH_CHANGE_EVENT, {
        detail: { kind: currentAuthToken() ? 'login' : 'logout', remote: true },
      }),
    );
  });
}
export function announceAuthChange(kind: 'login' | 'logout') {
  const message = { kind, source, nonce: `${Date.now()}-${Math.random()}` };
  try {
    channel?.postMessage(message);
  } catch {}
  writeBrowserValue('doai_session_signal', JSON.stringify(message));
}
export function doaiRequestPath(input: RequestInfo | URL): string | null {
  try {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost';
    const url = new URL(raw, origin);
    if (url.origin !== origin) return null;
    const match = /(?:^|\/)api\/doai(?:\/(.*))?$/.exec(url.pathname);
    if (!match) return null;
    const tail = match[1] || url.searchParams.get('__p') || '';
    return `/${tail.replace(/^\/+|\/+$/g, '')}`;
  } catch {
    return null;
  }
}
export function doaiRouteNeedsActor(path: string, method = 'GET'): boolean {
  if (method.toUpperCase() === 'GET' && /^\/teams\/(?!mine$)[^/]+$/.test(path)) return false;
  if (
    method.toUpperCase() === 'GET' &&
    [
      '/health',
      '/me',
      '/site-config',
      '/forum-stats',
      '/forums',
      '/users',
      '/teams',
      '/wx-articles',
    ].includes(path)
  )
    return false;
  return true;
}
