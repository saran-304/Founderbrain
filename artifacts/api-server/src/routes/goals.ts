import { Router, type IRouter } from 'express';
import {
  CreateGoalBody,
  CreateGoalResponse,
  DeleteGoalParams,
  GetGoalParams,
  GetGoalResponse,
  ListGoalsQueryParams,
  ListGoalsResponse,
  UpdateGoalBody,
  UpdateGoalParams,
  UpdateGoalResponse,
} from '@workspace/api-zod';
import {
  getRequestSupabase,
  requireWorkspaceAccess,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

function toGoal(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    targetValue: row.target_value,
    currentValue: row.current_value,
    metricLabel: row.metric_label,
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/goals', async (req, res): Promise<void> => {
  const parsed = ListGoalsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, parsed.data.workspaceId))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('goals')
    .select('*')
    .eq('workspace_id', parsed.data.workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    sendSupabaseError(req, res, error, 'load goals');
    return;
  }
  res.json(ListGoalsResponse.parse((data ?? []).map(toGoal)));
});

router.post('/goals', async (req, res): Promise<void> => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid goal title and workspace.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, parsed.data.workspaceId))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('goals')
    .insert({
      workspace_id: parsed.data.workspaceId,
      title: parsed.data.title.trim(),
      description: parsed.data.description ?? null,
      target_value: parsed.data.targetValue ?? null,
      current_value: parsed.data.currentValue ?? null,
      metric_label: parsed.data.metricLabel ?? null,
      due_date: parsed.data.dueDate ?? null,
      status: parsed.data.status ?? 'active',
    })
    .select('*')
    .single();

  if (error) {
    sendSupabaseError(req, res, error, 'create goal');
    return;
  }
  res.status(201).json(CreateGoalResponse.parse(toGoal(data)));
});

router.get('/goals/:goalId', async (req, res): Promise<void> => {
  const parsed = GetGoalParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid goalId is required.' });
    return;
  }

  const { data, error } = await getRequestSupabase(req)
    .from('goals')
    .select('workspace_id')
    .eq('id', parsed.data.goalId)
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'load goal');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Goal not found.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, data.workspace_id))) return;

  const { data: goalData, error: goalError } = await getRequestSupabase(req)
    .from('goals')
    .select('*')
    .eq('id', parsed.data.goalId)
    .maybeSingle();

  if (goalError) {
    sendSupabaseError(req, res, goalError, 'load goal');
    return;
  }
  if (!goalData) {
    res.status(404).json({ error: 'Goal not found.' });
    return;
  }
  res.json(GetGoalResponse.parse(toGoal(goalData)));
});

router.patch('/goals/:goalId', async (req, res): Promise<void> => {
  const params = UpdateGoalParams.safeParse(req.params);
  const parsed = UpdateGoalBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: 'Enter valid goal updates.' });
    return;
  }

  const { data: goalCheck, error: checkError } = await getRequestSupabase(req)
    .from('goals')
    .select('workspace_id')
    .eq('id', params.data.goalId)
    .maybeSingle();

  if (checkError) {
    sendSupabaseError(req, res, checkError, 'update goal');
    return;
  }
  if (!goalCheck) {
    res.status(404).json({ error: 'Goal not found.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, goalCheck.workspace_id))) return;

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.targetValue !== undefined) patch.target_value = parsed.data.targetValue;
  if (parsed.data.currentValue !== undefined) patch.current_value = parsed.data.currentValue;
  if (parsed.data.metricLabel !== undefined) patch.metric_label = parsed.data.metricLabel;
  if (parsed.data.dueDate !== undefined) patch.due_date = parsed.data.dueDate;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;

  const { data, error } = await getRequestSupabase(req)
    .from('goals')
    .update(patch)
    .eq('id', params.data.goalId)
    .select('*')
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'update goal');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Goal not found.' });
    return;
  }
  res.json(UpdateGoalResponse.parse(toGoal(data)));
});

router.delete('/goals/:goalId', async (req, res): Promise<void> => {
  const parsed = DeleteGoalParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid goalId is required.' });
    return;
  }

  const { data: goalCheck, error: checkError } = await getRequestSupabase(req)
    .from('goals')
    .select('workspace_id')
    .eq('id', parsed.data.goalId)
    .maybeSingle();

  if (checkError) {
    sendSupabaseError(req, res, checkError, 'delete goal');
    return;
  }
  if (!goalCheck) {
    res.status(404).json({ error: 'Goal not found.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, goalCheck.workspace_id))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('goals')
    .delete()
    .eq('id', parsed.data.goalId)
    .select('id')
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'delete goal');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Goal not found.' });
    return;
  }
  res.status(204).end();
});

export default router;
