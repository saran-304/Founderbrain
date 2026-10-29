import { Router, type IRouter } from 'express';
import {
  CreateProjectBody,
  CreateProjectResponse,
  DeleteProjectParams,
  GetProjectParams,
  GetProjectResponse,
  ListProjectsQueryParams,
  ListProjectsResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from '@workspace/api-zod';
import {
  getRequestSupabase,
  requireWorkspaceAccess,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

function toProject(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    status: row.status,
    targetDate: row.target_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/projects', async (req, res): Promise<void> => {
  const parsed = ListProjectsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, parsed.data.workspaceId))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('projects')
    .select('*')
    .eq('workspace_id', parsed.data.workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    sendSupabaseError(req, res, error, 'load projects');
    return;
  }
  res.json(ListProjectsResponse.parse((data ?? []).map(toProject)));
});

router.post('/projects', async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid project name and workspace.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, parsed.data.workspaceId))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('projects')
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: parsed.data.name.trim(),
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? 'planning',
      target_date: parsed.data.targetDate ?? null,
    })
    .select('*')
    .single();

  if (error) {
    sendSupabaseError(req, res, error, 'create project');
    return;
  }
  res.status(201).json(CreateProjectResponse.parse(toProject(data)));
});

router.get('/projects/:projectId', async (req, res): Promise<void> => {
  const parsed = GetProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid projectId is required.' });
    return;
  }

  const { data: projectCheck, error: checkError } = await getRequestSupabase(req)
    .from('projects')
    .select('workspace_id')
    .eq('id', parsed.data.projectId)
    .maybeSingle();

  if (checkError) {
    sendSupabaseError(req, res, checkError, 'load project');
    return;
  }
  if (!projectCheck) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, projectCheck.workspace_id))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('projects')
    .select('*')
    .eq('id', parsed.data.projectId)
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'load project');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  res.json(GetProjectResponse.parse(toProject(data)));
});

router.patch('/projects/:projectId', async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: 'Enter valid project updates.' });
    return;
  }

  const { data: projectCheck, error: checkError } = await getRequestSupabase(req)
    .from('projects')
    .select('workspace_id')
    .eq('id', params.data.projectId)
    .maybeSingle();

  if (checkError) {
    sendSupabaseError(req, res, checkError, 'update project');
    return;
  }
  if (!projectCheck) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, projectCheck.workspace_id))) return;

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.targetDate !== undefined) patch.target_date = parsed.data.targetDate;

  const { data, error } = await getRequestSupabase(req)
    .from('projects')
    .update(patch)
    .eq('id', params.data.projectId)
    .select('*')
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'update project');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  res.json(UpdateProjectResponse.parse(toProject(data)));
});

router.delete('/projects/:projectId', async (req, res): Promise<void> => {
  const parsed = DeleteProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid projectId is required.' });
    return;
  }

  const { data: projectCheck, error: checkError } = await getRequestSupabase(req)
    .from('projects')
    .select('workspace_id')
    .eq('id', parsed.data.projectId)
    .maybeSingle();

  if (checkError) {
    sendSupabaseError(req, res, checkError, 'delete project');
    return;
  }
  if (!projectCheck) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, projectCheck.workspace_id))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('projects')
    .delete()
    .eq('id', parsed.data.projectId)
    .select('id')
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'delete project');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  res.status(204).end();
});

export default router;
