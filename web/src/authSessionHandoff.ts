import type { SupabaseClient } from '@supabase/supabase-js';

type Auth = SupabaseClient['auth'];
export type DesktopGoogleResult = {
  ok: boolean;
  code?: string;
  session?: { access_token: string; refresh_token: string };
};

export async function signInWithDesktopGoogle(auth: Auth, start: () => Promise<DesktopGoogleResult>) {
  const result = await start();
  if (!result.ok || !result.session) throw new Error(result.code || 'oauth_failed');
  const { data, error } = await auth.setSession(result.session);
  if (error || !data.session?.user?.id) throw new Error('oauth_session_not_saved');
  return data.session;
}

const imports = new Map<string, Promise<Awaited<ReturnType<typeof importFragment>>>>();

async function importFragment(auth: Auth, params: URLSearchParams) {
  const access_token = params.get('access_token') || '';
  const refresh_token = params.get('refresh_token') || '';
  const existing = await auth.getSession();
  const result = existing.data.session?.access_token === access_token
    ? existing
    : await auth.setSession({ access_token, refresh_token });
  if (result.error || !result.data.session?.user?.id) throw new Error('oauth_session_not_saved');
  const current = new URLSearchParams(window.location.hash.slice(1));
  if (current.get('access_token') === access_token) {
    for (const key of ['access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'provider_refresh_token', 'type']) current.delete(key);
    const url = new URL(window.location.href);
    url.hash = current.toString();
    window.history.replaceState(window.history.state, '', url.toString());
  }
  return { session: result.data.session, recovery: params.get('type') === 'recovery' };
}

export async function restoreDesktopSessionFromUrl(auth: Auth) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  if (!access || !refresh) return null;
  const key = access + ':' + refresh;
  let pending = imports.get(key);
  if (!pending) {
    pending = importFragment(auth, params);
    imports.set(key, pending);
    void pending.finally(() => imports.delete(key)).catch(() => undefined);
  }
  return pending;
}
