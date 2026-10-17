import type { SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';

type OperationError = {
  code?: string;
};

export function getRequestSupabase(req: Request): SupabaseClient {
  if (!req.founderbrainSupabase) {
    throw new Error('Authenticated Supabase client is missing.');
  }
  return req.founderbrainSupabase;
}

export function getRequestUser(req: Request) {
  if (!req.founderbrainUser) {
    throw new Error('Authenticated Supabase user is missing.');
  }
  return req.founderbrainUser;
}

export async function requireWorkspaceAccess(
  req: Request,
  res: Response,
  workspaceId: string,
): Promise<boolean> {
  const supabase = getRequestSupabase(req);
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'check workspace access');
    return false;
  }
  if (!data) {
    res.status(404).json({ error: 'Workspace not found.' });
    return false;
  }
  return true;
}

export async function requireWorkspaceAdmin(
  req: Request,
  res: Response,
  workspaceId: string,
): Promise<boolean> {
  if (!(await requireWorkspaceAccess(req, res, workspaceId))) return false;

  const { data, error } = await getRequestSupabase(req)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', getRequestUser(req).id)
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'check workspace permissions');
    return false;
  }
  if (!data || !['owner', 'admin'].includes(data.role)) {
    res.status(403).json({ error: 'A workspace owner or admin must do that.' });
    return false;
  }
  return true;
}

export function sendSupabaseError(
  req: Request,
  res: Response,
  error: OperationError,
  action: string,
): void {
  req.log.error(
    { code: error.code ?? 'unknown' },
    `Supabase could not ${action}`,
  );

  if (error.code === '42501') {
    res.status(403).json({ error: 'Your workspace role cannot do that.' });
    return;
  }

  if (error.code === '23503' && action === 'delete project') {
    res.status(409).json({
      error: 'Move or remove the project’s tasks before deleting this project.',
    });
    return;
  }

  if (['22023', '23503', '23505', '23514'].includes(error.code ?? '')) {
    res.status(400).json({ error: 'The requested change is invalid.' });
    return;
  }

  res.status(500).json({ error: `Unable to ${action}. Please try again.` });
}
