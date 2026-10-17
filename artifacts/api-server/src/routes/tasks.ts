import { Router, type IRouter } from 'express';
import {
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  GetTaskParams,
  GetTaskResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from '@workspace/api-zod';
import {
  getRequestSupabase,
  requireWorkspaceAccess,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

function toTask(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    assigneeId: row.assignee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/tasks', async (req, res): Promise<void> => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, parsed.data.workspaceId))) return;

  let query = getRequestSupabase(req)
    .from('tasks')
    .select('*')
    .eq('workspace_id', parsed.data.workspaceId);
  if (parsed.data.projectId) query = query.eq('project_id', parsed.data.projectId);
  if (parsed.data.status) query = query.eq('status', parsed.data.status);

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load tasks');
    return;
  }
  res.json(ListTasksResponse.parse((data ?? []).map(toTask)));
});

router.post('/tasks', async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid task title and workspace.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, parsed.data.workspaceId))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('tasks')
    .insert({
      workspace_id: parsed.data.workspaceId,
      project_id: parsed.data.projectId ?? null,
      title: parsed.data.title.trim(),
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? 'todo',
      priority: parsed.data.priority ?? 'medium',
      due_date: parsed.data.dueDate ?? null,
      assignee_id: parsed.data.assigneeId ?? null,
    })
    .select('*')
    .single();

  if (error) {
    sendSupabaseError(req, res, error, 'create task');
    return;
  }
  res.status(201).json(CreateTaskResponse.parse(toTask(data)));
});

router.get('/tasks/:taskId', async (req, res): Promise<void> => {
  const parsed = GetTaskParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid taskId is required.' });
    return;
  }

  const { data, error } = await getRequestSupabase(req)
    .from('tasks')
    .select('*')
    .eq('id', parsed.data.taskId)
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'load task');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  res.json(GetTaskResponse.parse(toTask(data)));
});

router.patch('/tasks/:taskId', async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: 'Enter valid task updates.' });
    return;
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.projectId !== undefined) patch.project_id = parsed.data.projectId;
  if (parsed.data.title !== undefined) patch.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.dueDate !== undefined) patch.due_date = parsed.data.dueDate;
  if (parsed.data.assigneeId !== undefined) patch.assignee_id = parsed.data.assigneeId;

  const { data, error } = await getRequestSupabase(req)
    .from('tasks')
    .update(patch)
    .eq('id', params.data.taskId)
    .select('*')
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'update task');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  res.json(UpdateTaskResponse.parse(toTask(data)));
});

router.delete('/tasks/:taskId', async (req, res): Promise<void> => {
  const parsed = DeleteTaskParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid taskId is required.' });
    return;
  }

  const { data, error } = await getRequestSupabase(req)
    .from('tasks')
    .delete()
    .eq('id', parsed.data.taskId)
    .select('id')
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'delete task');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  res.status(204).end();
});

export default router;
