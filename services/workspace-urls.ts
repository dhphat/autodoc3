// workspace-auth v2 — copied from fes-workspace/templates; do not edit in app repos
// Framework-independent helpers shared by the hub and every workspace app.

/** Default session cookie name (production). Staging overrides it via *_WORKSPACE_COOKIE_NAME. */
export const WORKSPACE_COOKIE_NAME = 'sb-fes-auth';

export type WorkspaceCookieOptions = {
  name: string;
  domain?: string;
  path: '/';
  sameSite: 'lax';
  secure: boolean;
};

const COOKIE_NAME_RE = /^[A-Za-z0-9_-]+$/;

/**
 * Cookie options for @supabase/ssr. `domain` is undefined in local dev (host-only, not secure).
 * `name` comes from NEXT_PUBLIC_WORKSPACE_COOKIE_NAME / VITE_WORKSPACE_COOKIE_NAME (optional);
 * empty or unset means WORKSPACE_COOKIE_NAME. Every app of one environment must use the same name.
 */
export function workspaceCookieOptions(domain: string | undefined, name?: string): WorkspaceCookieOptions {
  const cookieName = name || WORKSPACE_COOKIE_NAME;
  if (!COOKIE_NAME_RE.test(cookieName)) {
    throw new Error(`Invalid workspace cookie name "${cookieName}" (allowed: letters, digits, '-', '_')`);
  }
  return {
    name: cookieName,
    ...(domain !== undefined ? { domain } : {}),
    path: '/',
    sameSite: 'lax',
    secure: domain !== undefined,
  };
}

// C0 controls and DEL. The URL parser silently strips tab/newline, which can turn
// "/\t/evil.com" into "//evil.com", so these are rejected before parsing.
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

const RELATIVE_BASE = 'http://relative.invalid';

/** True when `hostname` is `root` itself or a subdomain of it (e.g. task.fptsx.space). */
export function isWorkspaceHost(hostname: string, root: string): boolean {
  return hostname !== '' && (hostname === root || hostname.endsWith(`.${root}`));
}

/**
 * Returns `next` when it stays inside the workspace, otherwise '/'.
 * Accepted: a relative path starting with exactly one '/' (returned normalized as
 * pathname + search + hash), or an https:// URL whose hostname is
 * `root` or a subdomain of it (no credentials, no port). When `root === 'localhost'`,
 * http(s)://localhost:<port> is accepted instead.
 */
export function safeNext(next: string | null | undefined, root: string): string {
  if (typeof next !== 'string' || next === '') return '/';
  if (next.includes('\\') || hasControlChars(next)) return '/';

  if (next.startsWith('/')) {
    if (next.startsWith('//')) return '/';
    // Resolve dot segments ("/.//evil.com" -> "//evil.com") against a dummy origin and re-check.
    let rel: URL;
    try {
      rel = new URL(next, RELATIVE_BASE);
    } catch {
      return '/';
    }
    if (rel.origin !== RELATIVE_BASE || rel.pathname.startsWith('//')) return '/';
    return rel.pathname + rel.search + rel.hash;
  }

  let url: URL;
  try {
    url = new URL(next);
  } catch {
    return '/';
  }
  if (url.username !== '' || url.password !== '') return '/';

  if (root === 'localhost') {
    const ok = (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname === 'localhost';
    return ok ? url.href : '/';
  }

  if (url.protocol !== 'https:' || !isWorkspaceHost(url.hostname, root) || url.port !== '') return '/';
  return url.href;
}

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

export function hubLoginUrl(hubUrl: string, returnTo: string): string {
  return `${trimTrailingSlashes(hubUrl)}/login?next=${encodeURIComponent(returnTo)}`;
}

export function hubRequestAccessUrl(hubUrl: string, app: string): string {
  return `${trimTrailingSlashes(hubUrl)}/request/${encodeURIComponent(app)}`;
}
