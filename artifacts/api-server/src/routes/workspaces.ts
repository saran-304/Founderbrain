import { Router, type IRouter } from 'express';
import {
  CreateWorkspaceBody,
  CreateWorkspaceResponse,
  ListWorkspacesResponse,
} from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

router.get('/workspaces', async (req, res): Promise<void> => {
  const supabase = getRequestSupabase(req);
  const user = getRequestUser(req);
  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      'role, workspace:workspaces!workspace_members_workspace_id_fkey(id,name,created_at)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    sendSupabaseError(req, res, error, 'load workspaces');
    return;
  }

  const workspaces = (data ?? []).flatMap((membership) => {
    const workspace = Array.isArray(membership.workspace)
      ? membership.workspace[0]
      : membership.workspace;
    if (!workspace) return [];
    return [
      {
        id: workspace.id,
        name: workspace.name,
        role: membership.role,
        createdAt: workspace.created_at,
      },
    ];
  });

  res.json(ListWorkspacesResponse.parse(workspaces));
});

router.post('/workspaces', async (req, res): Promise<void> => {
  const parsed = CreateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a workspace name between 1 and 100 characters.' });
    return;
  }

  const supabase = getRequestSupabase(req);
  const { data: workspaceId, error: createError } = await supabase.rpc(
    'create_workspace',
    { p_name: parsed.data.name },
  );

  if (createError || !workspaceId) {
    if (createError) {
      sendSupabaseError(req, res, createError, 'create workspace');
      return;
    }
    res.status(500).json({ error: 'Unable to create workspace. Please try again.' });
    return;
  }

  const { data, error } = await supabase
    .from('workspaces')
    .select('id,name,created_at')
    .eq('id', workspaceId)
    .single();

  if (error || !data) {
    if (error) {
      sendSupabaseError(req, res, error, 'load the new workspace');
      return;
    }
    res.status(500).json({ error: 'Unable to load the new workspace.' });
    return;
  }

  res.status(201).json(
    CreateWorkspaceResponse.parse({
      id: data.id,
      name: data.name,
      role: 'owner',
      createdAt: data.created_at,
    }),
  );
});

export default router;
