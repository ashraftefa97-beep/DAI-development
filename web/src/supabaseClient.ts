import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    DAI_AUTH_CONFIG?: {
      url?: string;
      publishableKey?: string;
    };
  }
}

const runtime = window.DAI_AUTH_CONFIG || {};
const url = runtime.url || import.meta.env.VITE_SUPABASE_URL || '';
const publishableKey =
  runtime.publishableKey ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const authConfigured = Boolean(url && publishableKey);

export const supabase = authConfigured
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
