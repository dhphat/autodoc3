// workspace-auth v2 — copied from fes-workspace/templates; do not edit in app repos
// Browser workspace auth for Vite SPAs. Copy next to workspace-urls.ts.
import { createBrowserClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hubLoginUrl, hubRequestAccessUrl, workspaceCookieOptions } from './workspace-urls';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** Shared-cookie domain; required in production builds so the session cookie is never host-only/non-secure. */
function workspaceCookieDomain(): string | undefined {
  const domain: string | undefined = import.meta.env.VITE_WORKSPACE_COOKIE_DOMAIN || undefined;
  if (!domain && import.meta.env.PROD) {
    throw new Error('VITE_WORKSPACE_COOKIE_DOMAIN must be set in production (e.g. .fptsx.space)');
  }
  return domain;
}

/**
 * Creates the app's Supabase client. Call it once per app (module-level): the cookie-based
 * client is a browser singleton. `nativeStorage` (Capacitor) keeps the session in localStorage
 * instead of the shared `.fptsx.space` cookie.
 */
export function createWorkspaceBrowserClient(
  opts: { schema?: string; nativeStorage?: boolean } = {},
): SupabaseClient {
  const url = requireEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
  const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY);
  const db = opts.schema ? { db: { schema: opts.schema } } : {};
  const cookieOptions = workspaceCookieOptions(
    opts.nativeStorage ? undefined : workspaceCookieDomain(),
    import.meta.env.VITE_WORKSPACE_COOKIE_NAME || undefined,
  );

  if (opts.nativeStorage) {
    return createClient(url, anonKey, {
      ...db,
      auth: {
        storage: localStorage,
        storageKey: cookieOptions.name,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }) as SupabaseClient;
  }

  return createBrowserClient(url, anonKey, {
    ...db,
    cookieOptions,
  }) as SupabaseClient;
}

/**
 * Resolves with the user when they may use `app`. Otherwise navigates to the hub (login or
 * request-access page) and never resolves, so the app does not render. RPC failures reject.
 */
export async function ensureAppAccess(
  supabase: SupabaseClient,
  app: string,
): Promise<{ userId: string; email: string }> {
  const hub = requireEnv('VITE_HUB_URL', import.meta.env.VITE_HUB_URL);
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) {
    location.assign(hubLoginUrl(hub, location.href));
    return new Promise(() => {});
  }

  const { data: allowed, error } = await supabase.schema('workspace').rpc('can_access', { p_app: app });
  if (error) throw new Error(`can_access failed: ${error.message}`);
  if (allowed !== true) {
    location.assign(hubRequestAccessUrl(hub, app));
    return new Promise(() => {});
  }

  return { userId: claims.sub, email: claims.email ?? '' };
}
