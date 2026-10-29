import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowRight, BriefcaseBusiness, CheckSquare2, Clock3, Goal, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/founderbrain-design-system/components/ui/card';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';
import { Progress } from '@workspace/founderbrain-design-system/components/ui/progress';
import { useAuth } from '@/contexts/auth-context';
import {
  getGetDashboardSummaryQueryKey, getListRecentActivityQueryKey, getListWorkspacesQueryKey,
  useGetDashboardSummary, useGetCurrentUser, useHealthCheck, useListRecentActivity, useListWorkspaces,
} from '@workspace/api-client-react';
import { EmptyState, LoadingBlock, PageHeading, QueryError, useWorkspaceSelection } from '@/components/workspace';

const timeLabel = (date: string) => {
  const elapsed = Date.now() - new Date(date).getTime();
  const hours = Math.floor(elapsed / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: currentUser } = useGetCurrentUser();
  const { data: workspaces, isLoading: workspacesLoading, isError: workspaceError } = useListWorkspaces();
  const { workspaceId } = useWorkspaceSelection();
  const params = { workspaceId };
  const queryClient = useQueryClient();
  const summary = useGetDashboardSummary(params, { query: { enabled: !!workspaceId, queryKey: getGetDashboardSummaryQueryKey(params) } });
  const activity = useListRecentActivity({ workspaceId, limit: 6 }, { query: { enabled: !!workspaceId, queryKey: getListRecentActivityQueryKey({ workspaceId, limit: 6 }) } });
  const health = useHealthCheck();
  if (workspacesLoading) return <LoadingBlock title="Loading your workspace" />;
  if (workspaceError) return <QueryError onRetry={() => void queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() })} />;
  if (workspaces?.length && !workspaceId) return <LoadingBlock title="Selecting your workspace" />;
  const greeting = (currentUser?.displayName || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Founder').split(' ')[0];
  if (!workspaceId) return <div className="mx-auto max-w-3xl pt-8"><PageHeading eyebrow="Your private workspace" title={`A clear start, ${greeting}.`} description="Create your workspace from the left navigation, then begin turning your goals into focused project work." /><EmptyState title="Your workspace starts here" description="Create a workspace from the sidebar to bring your projects, tasks, goals, and progress into one calm place." /></div>;
  if (summary.isLoading) return <LoadingBlock title="Loading dashboard data" />;
  if (summary.isError || !summary.data) return <QueryError onRetry={() => void summary.refetch()} />;
  const data = summary.data;
  const progress = Math.max(0, Math.min(100, data.goalProgress ?? 0));
  const metrics = [
    { label: 'Active projects', value: data.activeProjects, hint: 'Moving forward', icon: BriefcaseBusiness, color: 'text-primary', link: '/projects' },
    { label: 'Open tasks', value: data.openTasks, hint: `${data.completedTasks} completed`, icon: CheckSquare2, color: 'text-chart-3', link: '/tasks' },
    { label: 'Due soon', value: data.dueSoonTasks, hint: data.overdueTasks ? `${data.overdueTasks} overdue` : 'Nothing overdue', icon: Clock3, color: data.overdueTasks ? 'text-destructive' : 'text-chart-2', link: '/tasks' },
    { label: 'Active goals', value: data.activeGoals, hint: 'Keep your north star close', icon: Goal, color: 'text-chart-4', link: '/goals' },
  ];
  return <div>
    <PageHeading eyebrow="Your founder workspace" title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${greeting}.`} description="Here’s the signal on your work today. Make space for the next thing that matters." action={<div className="flex gap-2"><Button asChild variant="outline"><Link href="/tasks"><CheckSquare2 className="h-4 w-4" />Review tasks</Link></Button><Button asChild><Link href="/projects"><Plus className="h-4 w-4" />New project</Link></Button></div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, hint, icon: Icon, color, link }) => <Link href={link} key={label} className="group">
        <Card className="h-full transition-shadow hover:shadow-md"><CardContent className="p-5"><div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl bg-secondary ${color}`}><Icon className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></div><div className="mt-5 text-3xl font-semibold tracking-tight">{value}</div><div className="mt-1 flex items-center justify-between gap-2"><span className="text-sm font-medium">{label}</span><span className="text-right text-xs text-muted-foreground">{hint}</span></div></CardContent></Card>
      </Link>)}
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border/70 px-5 py-4 sm:px-6">
          <div><CardTitle className="text-base">Recent activity</CardTitle><p className="mt-1 text-sm text-muted-foreground">A quiet record of what’s changed.</p></div>
          <Badge variant="outline" className="gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-destructive' : 'bg-chart-4'}`} />{health.isError ? 'API unavailable' : 'Workspace connected'}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {activity.isLoading ? <div className="space-y-4 p-6"><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /></div>
            : activity.isError ? <div className="p-6"><QueryError message="Recent activity could not be loaded." onRetry={() => void activity.refetch()} /></div>
              : activity.data?.length ? <div className="divide-y divide-border/70">{activity.data.map((item) => {
                const Icon = item.kind === 'project' ? BriefcaseBusiness : item.kind === 'task' ? CheckSquare2 : Goal;
                const href = item.kind === 'project' ? '/projects' : item.kind === 'task' ? '/tasks' : '/goals';
                return <Link href={href} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/50 sm:px-6" key={item.id} data-testid={`activity-item-${item.id}`}>
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{item.title}</div>{item.detail && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.detail}</p>}</div>
                  <span className="shrink-0 pt-1 text-xs text-muted-foreground">{timeLabel(item.updatedAt)}</span>
                </Link>;
              })}</div> : <div className="p-6"><EmptyState title="Your activity will appear here" description="As your project work moves forward, recent updates will be collected in this space." /></div>}
        </CardContent>
      </Card>
      <Card className="bg-sidebar text-sidebar-foreground">
        <CardContent className="p-6 sm:p-7">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sidebar-primary"><TrendingUp className="h-4 w-4" />Momentum</div>
          <div className="mt-5 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight">{progress}%</span><span className="text-sm text-sidebar-foreground/65">goal progress</span></div>
          <Progress value={progress} className="mt-4 h-2 bg-sidebar-accent [&>div]:bg-sidebar-primary" />
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/70">Progress is built one meaningful milestone at a time. Keep your goals visible and your next step small.</p>
          <Button asChild variant="outline" className="mt-6 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"><Link href="/goals">View your goals<ArrowRight className="h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>
    </div>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5"><p className="text-xs text-muted-foreground">Workspace data is private and only visible to your signed-in account.</p><Link href="/settings" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Workspace settings<ArrowRight className="h-3 w-3" /></Link></div>
  </div>;
}
