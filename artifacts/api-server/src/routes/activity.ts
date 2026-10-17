import { Router, type IRouter } from 'express';
import {
  ListRecentActivityQueryParams,
  ListRecentActivityResponse,
} from '@workspace/api-zod';
import {
  getRequestSupabase,
  requireWorkspaceAccess,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

router.get('/activity', async (req, res): Promise<void> => {
  const parsed = ListRecentActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid workspaceId and activity limit.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, parsed.data.workspaceId))) return;

  const limit = parsed.data.limit;
  const supabase = getRequestSupabase(req);
  const [projectsResult, tasksResult, goalsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id,name,status,updated_at')
      .eq('workspace_id', parsed.data.workspaceId)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('tasks')
      .select('id,title,status,updated_at')
      .eq('workspace_id', parsed.data.workspaceId)
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase
      .from('goals')
      .select('id,title,status,updated_at')
      .eq('workspace_id', parsed.data.workspaceId)
      .order('updated_at', { ascending: false })
      .limit(limit),
  ]);

  if (projectsResult.error) {
    sendSupabaseError(req, res, projectsResult.error, 'load recent activity');
    return;
  }
  if (tasksResult.error) {
    sendSupabaseError(req, res, tasksResult.error, 'load recent activity');
    return;
  }
  if (goalsResult.error) {
    sendSupabaseError(req, res, goalsResult.error, 'load recent activity');
    return;
  }

  const activity = [
    ...(projectsResult.data ?? []).map((item) => ({
      id: `project:${item.id}`,
      kind: 'project' as const,
      title: item.name,
      detail: item.status,
      updatedAt: item.updated_at,
    })),
    ...(tasksResult.data ?? []).map((item) => ({
      id: `task:${item.id}`,
      kind: 'task' as const,
      title: item.title,
      detail: item.status,
      updatedAt: item.updated_at,
    })),
    ...(goalsResult.data ?? []).map((item) => ({
      id: `goal:${item.id}`,
      kind: 'goal' as const,
      title: item.title,
      detail: item.status,
      updatedAt: item.updated_at,
    })),
  ]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);

  res.json(ListRecentActivityResponse.parse(activity));
});

export default router;
