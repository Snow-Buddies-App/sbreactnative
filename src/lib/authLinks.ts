import { supabase } from './supabase';

export type AuthLinkParams = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  type?: string;
  errorDescription?: string;
};

/** Read Supabase auth params from a deep link's query string or #fragment. */
export function parseAuthLink(url: string): AuthLinkParams | null {
  const params = new URLSearchParams();
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  for (const part of [query, hash]) {
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }
  const result: AuthLinkParams = {
    accessToken: params.get('access_token') ?? undefined,
    refreshToken: params.get('refresh_token') ?? undefined,
    code: params.get('code') ?? undefined,
    type: params.get('type') ?? undefined,
    errorDescription: params.get('error_description') ?? undefined,
  };
  const isAuthLink =
    (result.accessToken && result.refreshToken) || result.code || result.errorDescription;
  return isAuthLink ? result : null;
}

/**
 * Sign in from an email confirmation / password reset link.
 * Returns the link type (e.g. "recovery") when a session was created.
 */
export async function handleAuthLink(url: string): Promise<string | null> {
  const params = parseAuthLink(url);
  if (!params) return null;
  if (params.errorDescription) throw new Error(params.errorDescription);
  if (params.accessToken && params.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    if (error) throw error;
  } else if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
  }
  return params.type ?? 'signin';
}
