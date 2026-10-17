import { Router, type IRouter } from 'express';
import {
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
} from '@workspace/api-zod';
import {
  getRequestSupabase,
  requireWorkspaceAccess,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

router.get('/dashboard/summary', async (req, res): Promise<void> => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, parsed.data.workspaceId))) return;

  const supabase = getRequestSupabase(req);
  const [projectsResult, tasksResult, goalsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id,status')
      .eq('workspace_id', parsed.data.workspaceId),
    supabase
      .from('tasks')
      .select('id,status,due_date')
      .eq('workspace_id', parsed.data.workspaceId),
    supabase
      .from('goals')
      .select('id,status,target_value,current_value')
      .eq('workspace_id', parsed.data.workspaceId),
  ]);

  if (projectsResult.error) {
    sendSupabaseError(req, res, projectsResult.error, 'load dashboard projects');
    return;
  }
  if (tasksResult.error) {
    sendSupabaseError(req, res, tasksResult.error, 'load dashboard tasks');
    return;
  }
  if (goalsResult.error) {
    sendSupabaseError(req, res, goalsResult.error, 'load dashboard goals');
    return;
  }

  const projects = projectsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const goals = goalsResult.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const dueSoonLimit = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const measurableGoals = activeGoals.filter(
    (goal) =>
      goal.target_value !== null &&
      Number(goal.target_value) > 0 &&
      goal.current_value !== null,
  );
  const goalProgress =
    measurableGoals.length > 0
      ? Math.round(
          measurableGoals.reduce((total, goal) => {
            const target = Number(goal.target_value);
            const current = Number(goal.current_value);
            return total + Math.max(0, Math.min(100, (current / target) * 100));
          }, 0) / measurableGoals.length,
        )
      : null;

  res.json(
    GetDashboardSummaryResponse.parse({
      workspaceId: parsed.data.workspaceId,
      activeProjects: projects.filter((project) => project.status === 'active')
        .length,
      openTasks: openTasks.length,
      completedTasks: tasks.filter((task) => task.status === 'done').length,
      dueSoonTasks: openTasks.filter(
        (task) => task.due_date && task.due_date >= today && task.due_date <= dueSoonLimit,
      ).length,
      overdueTasks: openTasks.filter(
        (task) => task.due_date && task.due_date < today,
      ).length,
      activeGoals: activeGoals.length,
      goalProgress,
    }),
  );
});

export default router;
