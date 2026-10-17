import {
  createClient,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import type { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      founderbrainSupabase?: SupabaseClient;
      founderbrainUser?: User;
    }
  }
}

export const SUPABASE_SETUP_ERROR =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to this Replit project’s Secrets.';

export function createAnonymousSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error(SUPABASE_SETUP_ERROR);
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function createUserSupabaseClient(accessToken: string) {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error(SUPABASE_SETUP_ERROR);
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

export const requireSupabaseUser: RequestHandler = async (
  req,
  res,
  next,
): Promise<void> => {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    res.status(503).json({ error: SUPABASE_SETUP_ERROR });
    return;
  }

  const authorization = req.header('authorization');
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: 'Sign in to access this workspace.' });
    return;
  }

  try {
    const supabase = createUserSupabaseClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Your session is invalid or expired.' });
      return;
    }

    req.founderbrainSupabase = supabase;
    req.founderbrainUser = data.user;
    next();
  } catch (error) {
    req.log.error(
      { errorType: error instanceof Error ? error.name : 'unknown' },
      'Supabase authentication check failed',
    );
    res.status(503).json({ error: 'Unable to verify your session right now.' });
  }
};
