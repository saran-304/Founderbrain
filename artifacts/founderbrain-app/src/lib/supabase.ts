import { setAuthTokenGetter } from '@workspace/api-client-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

export const supabase =
  isSupabaseConfigured && supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;

export const supabaseSetupMessage =
  'In Replit Tools > Secrets, set VITE_SUPABASE_URL to your Supabase Project URL and VITE_SUPABASE_ANON_KEY to its publishable/anon key. Never add the service_role key.';

export function getAuthRedirectUrl(route: '/auth/callback' | '/update-password') {
  const appBase = new URL(import.meta.env.BASE_URL, window.location.origin);
  const basePath = appBase.pathname.replace(/\/+$/, '');
  appBase.pathname = `${basePath}${route}`;
  appBase.search = '';
  appBase.hash = '';
  return appBase.toString();
}

setAuthTokenGetter(async () => {
  if (!supabase) return null;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session?.access_token ?? null;
});
