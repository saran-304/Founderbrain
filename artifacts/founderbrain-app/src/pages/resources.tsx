import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, CheckSquare2, Goal, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Input } from '@workspace/founderbrain-design-system/components/ui/input';
import { Textarea } from '@workspace/founderbrain-design-system/components/ui/textarea';
import { Card, CardContent } from '@workspace/founderbrain-design-system/components/ui/card';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@workspace/founderbrain-design-system/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/founderbrain-design-system/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@workspace/founderbrain-design-system/components/ui/alert-dialog';
import { Progress } from '@workspace/founderbrain-design-system/components/ui/progress';
import { toast } from '@workspace/founderbrain-design-system/hooks/use-toast';
import {
  GoalStatus, ProjectStatus, TaskPriority, TaskStatus,
  getGetDashboardSummaryQueryKey, getGetGoalQueryKey, getGetProjectQueryKey, getGetTaskQueryKey,
  getListGoalsQueryKey, getListProjectsQueryKey, getListRecentActivityQueryKey, getListTasksQueryKey,
  getListWorkspacesQueryKey, useCreateGoal, useCreateProject, useCreateTask,
  useDeleteGoal, useDeleteProject, useDeleteTask, useGetGoal, useGetProject, useGetTask,
  useListGoals, useListProjects, useListTasks, useListWorkspaces,
  useUpdateGoal, useUpdateProject, useUpdateTask,
} from '@workspace/api-client-react';
import type { Goal as GoalRecord, Project, Task } from '@workspace/api-client-react';
import { BackLink, EmptyState, LoadingBlock, PageHeading, QueryError, useWorkspaceSelection } from '@/components/workspace';

type Field = { key: string; label: string; type?: 'text' | 'date' | 'number' | 'textarea' | 'select'; options?: { value: string; label: string }[]; required?: boolean };
const EMPTY_ENTITY_VALUES: Record<string, string> = {};
function EntityEditor({ open, onOpenChange, title, description, fields, initial = EMPTY_ENTITY_VALUES, busy = false, submitLabel, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  fields: Field[]; initial?: Record<string, string>; busy?: boolean; submitLabel: string;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  useEffect(() => { if (open) setValues(initial); }, [open]);
  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(values); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      {fields.map((field) => <label key={field.key} className="block space-y-2 text-sm font-medium">{field.label}
        {field.type === 'textarea' ? <Textarea value={values[field.key] ?? ''} onChange={(event) => update(field.key, event.target.value)} required={field.required} rows={3} data-testid={`input-${field.key}`} />
          : field.type === 'select' ? <Select value={values[field.key] || field.options?.[0]?.value} onValueChange={(value) => update(field.key, value)}><SelectTrigger data-testid={`select-${field.key}`}><SelectValue /></SelectTrigger><SelectContent>{field.options?.map((option) => <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
            : <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={values[field.key] ?? ''} onChange={(event) => update(field.key, event.target.value)} required={field.required} min={field.type === 'number' ? 0 : undefined} data-testid={`input-${field.key}`} />}
      </label>)}
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy} data-testid="button-save-record">{busy ? 'Saving…' : submitLabel}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

function DeleteConfirm({ open, onOpenChange, title, onConfirm, busy }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; onConfirm: () => void; busy: boolean }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {title}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This record will be permanently removed from your workspace.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); onConfirm(); }}>{busy ? 'Deleting…' : 'Delete permanently'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function useWorkspaceId() {
  const query = useListWorkspaces();
  const selection = useWorkspaceSelection();
  return { ...query, workspaceId: selection.workspaceId };
}
function invalidateResource(client: ReturnType<typeof useQueryClient>, workspaceId: string, kind: 'projects' | 'tasks' | 'goals', id?: string) {
  if (kind === 'projects') {
    void client.invalidateQueries({ queryKey: getListProjectsQueryKey({ workspaceId }) });
    if (id) void client.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
  } else if (kind === 'tasks') {
    void client.invalidateQueries({ queryKey: getListTasksQueryKey({ workspaceId }) });
    if (id) void client.invalidateQueries({ queryKey: getGetTaskQueryKey(id) });
  } else {
    void client.invalidateQueries({ queryKey: getListGoalsQueryKey({ workspaceId }) });
    if (id) void client.invalidateQueries({ queryKey: getGetGoalQueryKey(id) });
  }
  void client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey({ workspaceId }) });
  void client.invalidateQueries({ queryKey: getListRecentActivityQueryKey({ workspaceId, limit: 6 }) });
}
function noWorkspace(workspaceId: string) {
  return !workspaceId ? <EmptyState title="Create a workspace to begin" description="Your projects, tasks, and goals live inside a private workspace. Create one using the switcher in the sidebar." /> : null;
}
const projectFields: Field[] = [
  { key: 'name', label: 'Project name', required: true }, { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: Object.values(ProjectStatus).map((value) => ({ value, label: value.replace('_', ' ') })) },
  { key: 'targetDate', label: 'Target date', type: 'date' },
];
const taskFields: Field[] = [
  { key: 'title', label: 'Task title', required: true }, { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: Object.values(TaskStatus).map((value) => ({ value, label: value.replace('_', ' ') })) },
  { key: 'priority', label: 'Priority', type: 'select', options: Object.values(TaskPriority).map((value) => ({ value, label: value })) },
  { key: 'dueDate', label: 'Due date', type: 'date' },
];
const goalFields: Field[] = [
  { key: 'title', label: 'Goal title', required: true }, { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'metricLabel', label: 'Metric label' }, { key: 'currentValue', label: 'Current value', type: 'number' },
  { key: 'targetValue', label: 'Target value', type: 'number' }, { key: 'dueDate', label: 'Target date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: Object.values(GoalStatus).map((value) => ({ value, label: value })) },
];
const displayStatus = (status: string) => status.replace('_', ' ');
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set';

function ResourceList({ kind }: { kind: 'projects' | 'tasks' | 'goals' }) {
  const client = useQueryClient();
  const workspace = useWorkspaceId();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const params = { workspaceId: workspace.workspaceId };
  const projectsQuery = useListProjects(params, { query: { enabled: kind === 'projects' && !!params.workspaceId, queryKey: getListProjectsQueryKey(params) } });
  const tasksQuery = useListTasks(params, { query: { enabled: kind === 'tasks' && !!params.workspaceId, queryKey: getListTasksQueryKey(params) } });
  const goalsQuery = useListGoals(params, { query: { enabled: kind === 'goals' && !!params.workspaceId, queryKey: getListGoalsQueryKey(params) } });
  const projectsForTask = useListProjects(params, { query: { enabled: kind === 'tasks' && !!params.workspaceId, queryKey: getListProjectsQueryKey(params) } });
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const createGoal = useCreateGoal();
  const records = kind === 'projects' ? projectsQuery.data : kind === 'tasks' ? tasksQuery.data : goalsQuery.data;
  const query = kind === 'projects' ? projectsQuery : kind === 'tasks' ? tasksQuery : goalsQuery;
  const filtered = useMemo(() => (records ?? []).filter((record) => {
    const label = 'name' in record ? record.name : 'title' in record ? record.title : '';
    const status = record.status;
    return label.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'all' || status === statusFilter);
  }), [records, search, statusFilter]);
  const title = kind === 'projects' ? 'Projects' : kind === 'tasks' ? 'Tasks' : 'Goals';
  const desc = kind === 'projects' ? 'Turn your priorities into focused initiatives, and keep the important work moving.' : kind === 'tasks' ? 'The next clear actions across your workspace, with priority and timing in view.' : 'Keep your long-range direction visible and track meaningful progress over time.';
  const icon = kind === 'projects' ? BriefcaseBusiness : kind === 'tasks' ? CheckSquare2 : Goal;
  const Icon = icon;
  const statuses = kind === 'projects' ? Object.values(ProjectStatus) : kind === 'tasks' ? Object.values(TaskStatus) : Object.values(GoalStatus);
  const onCreate = (values: Record<string, string>) => {
    const onSuccess = () => { setOpen(false); setSearch(''); invalidateResource(client, workspace.workspaceId, kind); toast({ title: `${kind.slice(0, -1)} created`, description: 'Your workspace has been updated.' }); };
    const onError = () => toast({ title: `Could not create ${kind.slice(0, -1)}`, description: 'Please check the details and try again.', variant: 'destructive' });
    if (kind === 'projects') createProject.mutate({ data: { workspaceId: workspace.workspaceId, name: values.name.trim(), description: values.description || null, status: (values.status || 'planning') as Project['status'], targetDate: values.targetDate || null } }, { onSuccess, onError });
    else if (kind === 'tasks') createTask.mutate({ data: { workspaceId: workspace.workspaceId, projectId: !values.projectId || values.projectId === '__no_project__' ? null : values.projectId, title: values.title.trim(), description: values.description || null, status: (values.status || 'todo') as Task['status'], priority: (values.priority || 'medium') as Task['priority'], dueDate: values.dueDate || null } }, { onSuccess, onError });
    else createGoal.mutate({ data: { workspaceId: workspace.workspaceId, title: values.title.trim(), description: values.description || null, metricLabel: values.metricLabel || null, currentValue: values.currentValue === '' ? null : Number(values.currentValue), targetValue: values.targetValue === '' ? null : Number(values.targetValue), dueDate: values.dueDate || null, status: (values.status || 'active') as GoalRecord['status'] } }, { onSuccess, onError });
  };
  if (workspace.isLoading) return <LoadingBlock />;
  if (workspace.isError) return <QueryError onRetry={() => void workspace.refetch()} />;
  if (workspace.data?.length && !workspace.workspaceId) return <LoadingBlock title="Selecting your workspace" />;
  if (!workspace.workspaceId) return noWorkspace(workspace.workspaceId);
  if (query.isLoading || (kind === 'tasks' && projectsForTask.isLoading)) return <LoadingBlock title={`Loading ${kind}`} />;
  if (query.isError) return <QueryError onRetry={() => void query.refetch()} />;
  const busy = createProject.isPending || createTask.isPending || createGoal.isPending;
  const currentFields = kind === 'projects' ? projectFields : kind === 'tasks' ? [
    ...taskFields,
    { key: 'projectId', label: 'Project', type: 'select' as const, options: [{ value: '__no_project__', label: 'No project' }, ...(projectsForTask.data ?? []).map((project) => ({ value: project.id, label: project.name }))] },
  ] : goalFields;
  const emptyTitle = search || statusFilter !== 'all' ? 'No matching records' : `No ${kind} yet`;
  return <div>
    <PageHeading eyebrow="Your workspace" title={title} description={desc} action={<Button onClick={() => setOpen(true)} data-testid={`button-create-${kind}`}><Plus className="h-4 w-4" />New {kind.slice(0, -1)}</Button>} />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder={`Search ${kind.toLowerCase()}…`} value={search} onChange={(event) => setSearch(event.target.value)} aria-label={`Search ${kind}`} data-testid={`input-search-${kind}`} /></div>
      <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="sm:w-48" aria-label={`Filter ${kind} by status`}><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((status) => <SelectItem value={status} key={status}>{displayStatus(status)}</SelectItem>)}</SelectContent></Select>
    </div>
    {filtered.length === 0 ? <EmptyState title={emptyTitle} description={search || statusFilter !== 'all' ? 'Try changing the search or status filter.' : `Add your first ${kind.slice(0, -1)} to bring this part of your work into focus.`} action={!search && statusFilter === 'all' ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create {kind.slice(0, -1)}</Button> : undefined} />
      : <div className="grid gap-3">{filtered.map((record) => {
        const recordTitle = 'name' in record ? record.name : record.title;
        const href = `/${kind}/${record.id}`;
        const date = 'targetDate' in record ? record.targetDate : 'dueDate' in record ? record.dueDate : null;
        const subline = record.description || (kind === 'goals' && 'metricLabel' in record ? record.metricLabel : null) || 'No description added yet.';
        return <Link href={href} className="group" key={record.id} data-testid={`card-${kind}-${record.id}`}><Card className="transition-shadow hover:shadow-md"><CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold">{recordTitle}</h2><Badge variant="secondary" className="capitalize">{displayStatus(record.status)}</Badge>{kind === 'tasks' && 'priority' in record && <Badge variant={record.priority === 'high' ? 'outline' : 'outline'} className="capitalize">{record.priority} priority</Badge>}</div><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{subline}</p></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{formatDate(date)}</div><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent></Card></Link>;
      })}</div>}
    <EntityEditor open={open} onOpenChange={setOpen} title={`Create ${kind.slice(0, -1)}`} description={`Capture the details for a new ${kind.slice(0, -1)}.`} fields={currentFields} busy={busy} submitLabel={`Create ${kind.slice(0, -1)}`} onSubmit={onCreate} />
  </div>;
}

function ProjectDetail() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const client = useQueryClient();
  const [, navigate] = useLocation();
  const workspace = useWorkspaceId();
  const project = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } });
  const tasksParams = { workspaceId: workspace.workspaceId, projectId };
  const tasks = useListTasks(tasksParams, { query: { enabled: !!workspace.workspaceId && !!projectId, queryKey: getListTasksQueryKey(tasksParams) } });
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (project.isLoading || workspace.isLoading) return <LoadingBlock title="Loading project" />;
  if (project.isError || !project.data) return <QueryError onRetry={() => void project.refetch()} message="This project could not be found or loaded." />;
  const item = project.data;
  const initial = { name: item.name, description: item.description ?? '', status: item.status, targetDate: item.targetDate ?? '' };
  const save = (values: Record<string, string>) => update.mutate({ projectId, data: { name: values.name.trim(), description: values.description || null, status: values.status as Project['status'], targetDate: values.targetDate || null } }, {
    onSuccess: () => { setEdit(false); invalidateResource(client, item.workspaceId, 'projects', projectId); toast({ title: 'Project updated' }); },
    onError: () => toast({ title: 'Could not update project', variant: 'destructive' }),
  });
  const deleteRecord = () => remove.mutate({ projectId }, {
    onSuccess: () => { setConfirm(false); invalidateResource(client, item.workspaceId, 'projects', projectId); void client.invalidateQueries({ queryKey: getListWorkspacesQueryKey() }); toast({ title: 'Project deleted' }); navigate('/projects'); },
    onError: () => toast({ title: 'Could not delete project', variant: 'destructive' }),
  });
  return <div className="max-w-4xl">
    <BackLink href="/projects">All projects</BackLink>
    <PageHeading eyebrow="Project" title={item.name} description={item.description || 'Keep this initiative visible and move it forward one clear step at a time.'} action={<div className="flex gap-2"><Button variant="outline" onClick={() => setConfirm(true)} data-testid="button-delete-project"><Trash2 className="h-4 w-4" />Delete</Button><Button onClick={() => setEdit(true)} data-testid="button-edit-project">Edit project</Button></div>} />
    <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div><Badge variant="secondary" className="mt-3 capitalize">{displayStatus(item.status)}</Badge></CardContent></Card><Card><CardContent className="p-5"><div className="text-xs uppercase tracking-wide text-muted-foreground">Target date</div><p className="mt-3 text-sm font-semibold">{formatDate(item.targetDate)}</p></CardContent></Card><Card><CardContent className="p-5"><div className="text-xs uppercase tracking-wide text-muted-foreground">Last updated</div><p className="mt-3 text-sm font-semibold">{formatDate(item.updatedAt)}</p></CardContent></Card></div>
    <Card className="mt-5"><CardContent className="p-5 sm:p-6"><h2 className="font-semibold">Work in this project</h2><p className="mt-1 text-sm text-muted-foreground">Tasks tied to this initiative.</p>{tasks.isLoading ? <div className="mt-4"><LoadingBlock title="Loading project tasks" /></div> : tasks.isError ? <div className="mt-4"><QueryError onRetry={() => void tasks.refetch()} /></div> : tasks.data?.length ? <div className="mt-4 divide-y divide-border/70">{tasks.data.map((task) => <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"><span className="flex min-w-0 items-center gap-2"><CheckSquare2 className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{task.title}</span></span><Badge variant="outline" className="capitalize">{displayStatus(task.status)}</Badge></Link>)}</div> : <div className="mt-4"><EmptyState title="No tasks in this project" description="Create a task from the Tasks page and assign it to this project." /></div>}</CardContent></Card>
    <EntityEditor open={edit} onOpenChange={setEdit} title="Edit project" description="Update the details and status of this project." fields={projectFields} initial={initial} busy={update.isPending} submitLabel="Save project" onSubmit={save} />
    <DeleteConfirm open={confirm} onOpenChange={setConfirm} title="project" busy={remove.isPending} onConfirm={deleteRecord} />
  </div>;
}

function TaskDetail() {
  const { taskId = '' } = useParams<{ taskId: string }>();
  const client = useQueryClient();
  const [, navigate] = useLocation();
  const workspace = useWorkspaceId();
  const task = useGetTask(taskId, { query: { enabled: !!taskId, queryKey: getGetTaskQueryKey(taskId) } });
  const projectsParams = { workspaceId: workspace.workspaceId };
  const projects = useListProjects(projectsParams, { query: { enabled: !!workspace.workspaceId, queryKey: getListProjectsQueryKey(projectsParams) } });
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (task.isLoading || workspace.isLoading) return <LoadingBlock title="Loading task" />;
  if (task.isError || !task.data) return <QueryError onRetry={() => void task.refetch()} message="This task could not be found or loaded." />;
  const item = task.data;
  const taskEditFields = [...taskFields, { key: 'projectId', label: 'Project', type: 'select' as const, options: [{ value: '__no_project__', label: 'No project' }, ...(projects.data ?? []).map((project) => ({ value: project.id, label: project.name }))] }];
  const initial = { title: item.title, description: item.description ?? '', status: item.status, priority: item.priority, dueDate: item.dueDate ?? '', projectId: item.projectId ?? '__no_project__' };
  const save = (values: Record<string, string>) => update.mutate({ taskId, data: { title: values.title.trim(), description: values.description || null, status: values.status as Task['status'], priority: values.priority as Task['priority'], dueDate: values.dueDate || null, projectId: !values.projectId || values.projectId === '__no_project__' ? null : values.projectId } }, {
    onSuccess: () => { setEdit(false); invalidateResource(client, item.workspaceId, 'tasks', taskId); toast({ title: 'Task updated' }); },
    onError: () => toast({ title: 'Could not update task', variant: 'destructive' }),
  });
  const deleteRecord = () => remove.mutate({ taskId }, {
    onSuccess: () => { setConfirm(false); invalidateResource(client, item.workspaceId, 'tasks', taskId); toast({ title: 'Task deleted' }); navigate('/tasks'); },
    onError: () => toast({ title: 'Could not delete task', variant: 'destructive' }),
  });
  const toggleDone = () => update.mutate({ taskId, data: { status: item.status === 'done' ? 'todo' : 'done' } }, {
    onSuccess: () => { invalidateResource(client, item.workspaceId, 'tasks', taskId); toast({ title: item.status === 'done' ? 'Task reopened' : 'Task completed' }); },
    onError: () => toast({ title: 'Could not update task', variant: 'destructive' }),
  });
  return <div className="max-w-4xl">
    <BackLink href="/tasks">All tasks</BackLink>
    <PageHeading eyebrow="Task" title={item.title} description={item.description || 'A focused action that moves your work forward.'} action={<div className="flex gap-2"><Button variant="outline" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />Delete</Button><Button onClick={() => setEdit(true)}>Edit task</Button></div>} />
    <Card><CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div><Badge variant="secondary" className="mt-3 capitalize">{displayStatus(item.status)}</Badge></div><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Priority</div><Badge variant="outline" className="mt-3 capitalize">{item.priority}</Badge></div><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Due date</div><p className="mt-2 text-sm font-semibold">{formatDate(item.dueDate)}</p></div><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Project</div><p className="mt-2 text-sm font-semibold">{projects.data?.find((project) => project.id === item.projectId)?.name || 'No project'}</p></div></CardContent></Card>
    <Button className="mt-5" variant={item.status === 'done' ? 'outline' : 'default'} onClick={toggleDone} disabled={update.isPending} data-testid="button-toggle-task">{item.status === 'done' ? <><ArrowRight className="h-4 w-4" />Reopen task</> : <><Check className="h-4 w-4" />Mark complete</>}</Button>
    <EntityEditor open={edit} onOpenChange={setEdit} title="Edit task" description="Update task details, status, or priority." fields={taskEditFields} initial={initial} busy={update.isPending} submitLabel="Save task" onSubmit={save} />
    <DeleteConfirm open={confirm} onOpenChange={setConfirm} title="task" busy={remove.isPending} onConfirm={deleteRecord} />
  </div>;
}

function GoalDetail() {
  const { goalId = '' } = useParams<{ goalId: string }>();
  const client = useQueryClient();
  const [, navigate] = useLocation();
  const workspace = useWorkspaceId();
  const goal = useGetGoal(goalId, { query: { enabled: !!goalId, queryKey: getGetGoalQueryKey(goalId) } });
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (goal.isLoading || workspace.isLoading) return <LoadingBlock title="Loading goal" />;
  if (goal.isError || !goal.data) return <QueryError onRetry={() => void goal.refetch()} message="This goal could not be found or loaded." />;
  const item = goal.data;
  const progress = item.targetValue ? Math.max(0, Math.min(100, ((item.currentValue ?? 0) / item.targetValue) * 100)) : 0;
  const initial = { title: item.title, description: item.description ?? '', metricLabel: item.metricLabel ?? '', currentValue: item.currentValue?.toString() ?? '', targetValue: item.targetValue?.toString() ?? '', dueDate: item.dueDate ?? '', status: item.status };
  const save = (values: Record<string, string>) => update.mutate({ goalId, data: { title: values.title.trim(), description: values.description || null, metricLabel: values.metricLabel || null, currentValue: values.currentValue === '' ? null : Number(values.currentValue), targetValue: values.targetValue === '' ? null : Number(values.targetValue), dueDate: values.dueDate || null, status: values.status as GoalRecord['status'] } }, {
    onSuccess: () => { setEdit(false); invalidateResource(client, item.workspaceId, 'goals', goalId); toast({ title: 'Goal updated' }); },
    onError: () => toast({ title: 'Could not update goal', variant: 'destructive' }),
  });
  const deleteRecord = () => remove.mutate({ goalId }, {
    onSuccess: () => { setConfirm(false); invalidateResource(client, item.workspaceId, 'goals', goalId); toast({ title: 'Goal deleted' }); navigate('/goals'); },
    onError: () => toast({ title: 'Could not delete goal', variant: 'destructive' }),
  });
  return <div className="max-w-4xl">
    <BackLink href="/goals">All goals</BackLink>
    <PageHeading eyebrow="Goal" title={item.title} description={item.description || 'Keep the outcome clear, and track the progress that brings it within reach.'} action={<div className="flex gap-2"><Button variant="outline" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" />Delete</Button><Button onClick={() => setEdit(true)}>Edit goal</Button></div>} />
    <Card><CardContent className="p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-wide text-primary">Progress</div><div className="mt-2 text-3xl font-semibold tracking-tight">{item.currentValue ?? 0}<span className="ml-2 text-base font-medium text-muted-foreground">of {item.targetValue ?? '—'} {item.metricLabel}</span></div></div><Badge variant="secondary" className="capitalize">{item.status}</Badge></div><Progress value={progress} className="mt-5 h-2.5" /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{Math.round(progress)}% complete</span><span>Target {formatDate(item.dueDate)}</span></div></CardContent></Card>
    <EntityEditor open={edit} onOpenChange={setEdit} title="Edit goal" description="Update your target and current progress." fields={goalFields} initial={initial} busy={update.isPending} submitLabel="Save goal" onSubmit={save} />
    <DeleteConfirm open={confirm} onOpenChange={setConfirm} title="goal" busy={remove.isPending} onConfirm={deleteRecord} />
  </div>;
}

export function ProjectsPage() { return <ResourceList kind="projects" />; }
export function TasksPage() { return <ResourceList kind="tasks" />; }
export function GoalsPage() { return <ResourceList kind="goals" />; }
export function ProjectDetailPage() { return <ProjectDetail />; }
export function TaskDetailPage() { return <TaskDetail />; }
export function GoalDetailPage() { return <GoalDetail />; }
