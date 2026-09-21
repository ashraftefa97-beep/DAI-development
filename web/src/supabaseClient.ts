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
export const supabaseUrl = runtime.url || import.meta.env.VITE_SUPABASE_URL || '';
export const supabasePublishableKey =
  runtime.publishableKey ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const authConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = authConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
