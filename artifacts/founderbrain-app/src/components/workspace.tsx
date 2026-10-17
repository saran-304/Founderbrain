import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowLeft, ArrowRight, Bell, BriefcaseBusiness, CheckSquare2,
  Award, CircleHelp, Command, Goal, LayoutDashboard, LogOut, Menu,
  MessageCircle, Plus, Search, Settings, Sparkles, TrendingUp, Users, X,
} from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Input } from '@workspace/founderbrain-design-system/components/ui/input';
import { Card, CardContent } from '@workspace/founderbrain-design-system/components/ui/card';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';
import { Skeleton } from '@workspace/founderbrain-design-system/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@workspace/founderbrain-design-system/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@workspace/founderbrain-design-system/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/founderbrain-design-system/components/ui/select';
import { toast } from '@workspace/founderbrain-design-system/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import {
  getListWorkspacesQueryKey, useCreateWorkspace, useGetCurrentUser,
  useListWorkspaces,
} from '@workspace/api-client-react';

export function LoadingBlock({ title = 'Loading your workspace' }: { title?: string }) {
  return <div className="space-y-4" aria-label={title}>
    <Skeleton className="h-8 w-56" />
    <Skeleton className="h-4 w-80 max-w-full" />
    <div className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => <Skeleton className="h-32 rounded-xl" key={item} />)}
    </div>
    <Skeleton className="h-64 rounded-xl" />
  </div>;
}

export function QueryError({ onRetry, message = 'We couldn’t load this view right now.' }: { onRetry: () => void; message?: string }) {
  return <Alert variant="destructive" className="max-w-2xl">
    <CircleHelp className="h-4 w-4" />
    <AlertTitle>Something needs attention</AlertTitle>
    <AlertDescription className="mt-1 flex flex-wrap items-center justify-between gap-3">
      <span>{message}</span><Button size="sm" variant="outline" onClick={onRetry} data-testid="button-retry">Try again</Button>
    </AlertDescription>
  </Alert>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <Card className="border-dashed shadow-none">
    <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary"><Sparkles className="h-5 w-5" /></div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </CardContent>
  </Card>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading, isConfigured, setupMessage } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!isLoading && isConfigured && !user) navigate('/login');
  }, [isLoading, isConfigured, user, navigate]);
  if (isLoading) return <div className="grid min-h-screen place-items-center bg-background p-6"><LoadingBlock title="Checking your session" /></div>;
  if (!isConfigured) return <div className="grid min-h-screen place-items-center bg-background p-6"><Alert className="max-w-xl"><CircleHelp className="h-4 w-4" /><AlertTitle>Connect your workspace</AlertTitle><AlertDescription className="mt-2">{setupMessage}</AlertDescription></Alert></div>;
  if (!user) return null;
  return <>{children}</>;
}

type WorkspaceOption = { id: string; name: string };
const WorkspaceSelectionContext = createContext<{ workspaceId: string; setWorkspaceId: (id: string) => void }>({ workspaceId: '', setWorkspaceId: () => undefined });

export function useWorkspaceSelection() {
  return useContext(WorkspaceSelectionContext);
}

function WorkspacePicker({ workspaces, isLoading, isError, refetch, current, onChange }: {
  workspaces: WorkspaceOption[]; isLoading: boolean; isError: boolean; refetch: () => void;
  current: string; onChange: (id: string) => void;
}) {
  const createWorkspace = useCreateWorkspace();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createWorkspace.mutate({ data: { name: name.trim() } }, {
      onSuccess: async (workspace) => {
        setName('');
        setOpen(false);
        await queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
        onChange(workspace.id);
        toast({ title: 'Workspace created', description: `${workspace.name} is ready.` });
      },
      onError: () => toast({ title: 'Could not create workspace', description: 'Please try again.', variant: 'destructive' }),
    });
  };
  return <>
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent px-3 py-2 text-sidebar-accent-foreground">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">F</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-sidebar-foreground">Workspace</div>
        {isLoading ? <Skeleton className="mt-1 h-3 w-24" /> : isError
          ? <button onClick={() => void refetch()} className="text-left text-xs text-sidebar-foreground/70">Retry loading</button>
          : workspaces.length ? <Select value={current} onValueChange={onChange}><SelectTrigger aria-label="Select workspace" className="h-7 border-0 bg-transparent p-0 text-sm font-semibold text-sidebar-foreground shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent>{workspaces.map((workspace) => <SelectItem className="text-foreground" value={workspace.id} key={workspace.id}>{workspace.name}</SelectItem>)}</SelectContent></Select>
            : <span className="text-xs text-sidebar-foreground/65">No workspace yet</span>}
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Create workspace" onClick={() => setOpen(true)} data-testid="button-create-workspace"><Plus className="h-4 w-4" /></Button>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a workspace</DialogTitle><DialogDescription>Set up a dedicated space for your founder work.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">Workspace name<Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Studio" required maxLength={100} data-testid="input-workspace-name" /></label>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={!name.trim() || createWorkspace.isPending} data-testid="button-submit-workspace">{createWorkspace.isPending ? 'Creating…' : 'Create workspace'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: BriefcaseBusiness },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare2 },
  { href: '/goals', label: 'Goals', icon: Goal },
  { href: '/teams', label: 'Team', icon: Users },
  { href: '/founders', label: 'Founders', icon: Search },
  { href: '/community', label: 'Community', icon: MessageCircle },
  { href: '/portfolio', label: 'Portfolio', icon: Award },
  { href: '/mentorship', label: 'Mentorship', icon: CircleHelp },
  { href: '/assistants', label: 'Assistants', icon: Sparkles },
  { href: '/fundraising', label: 'Fundraising', icon: TrendingUp },
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const workspaceQuery = useListWorkspaces();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const workspaceIds = useMemo(() => (workspaceQuery.data ?? []).map((workspace) => workspace.id), [workspaceQuery.data]);
  useEffect(() => {
    if (!workspaceIds.includes(selectedWorkspaceId)) {
      setSelectedWorkspaceId(workspaceIds[0] ?? '');
    }
  }, [workspaceIds, selectedWorkspaceId]);
  const { data: currentUser } = useGetCurrentUser();
  const name = currentUser?.displayName || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Founder';
  const onSignOut = async () => {
    try { await signOut(); } catch { toast({ title: 'Sign out failed', description: 'Please try again.', variant: 'destructive' }); }
  };
  const aside = <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground">
    <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-2" onClick={() => setMobileOpen(false)}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Command className="h-5 w-5" /></div>
      <div><div className="text-base font-semibold tracking-tight">Founderbrain</div><div className="text-[11px] text-sidebar-foreground/60">FOUNDER WORKSPACE</div></div>
    </Link>
    <WorkspacePicker workspaces={workspaceQuery.data ?? []} isLoading={workspaceQuery.isLoading} isError={workspaceQuery.isError} refetch={() => { void workspaceQuery.refetch(); }} current={selectedWorkspaceId} onChange={setSelectedWorkspaceId} />
    <div className="mt-8 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">Workspace</div>
    <nav className="mt-2 space-y-1" aria-label="Workspace navigation">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href !== '/dashboard' && location.startsWith(`${href}/`));
        return <Link href={href} key={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase()}`} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
          <Icon className={`h-4 w-4 ${active ? 'text-sidebar-primary' : ''}`} />{label}
        </Link>;
      })}
    </nav>
    <div className="mt-auto space-y-4">
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
        <div className="flex items-center gap-2 text-xs font-medium"><Activity className="h-3.5 w-3.5 text-sidebar-primary" /> Your next move</div>
        <p className="mt-1.5 text-xs leading-relaxed text-sidebar-foreground/70">Small, focused steps make ambitious work happen.</p>
      </div>
      <Link href="/settings" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${location === '/settings' ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent'}`} data-testid="link-settings"><Settings className="h-4 w-4" />Settings</Link>
      <div className="flex items-center gap-3 border-t border-sidebar-border pt-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-primary/20 text-sm font-semibold text-sidebar-primary">{name.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{name}</div><div className="truncate text-xs text-sidebar-foreground/55">{currentUser?.email ?? user?.email}</div></div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/65 hover:bg-sidebar-accent" aria-label="Sign out" onClick={() => void onSignOut()} data-testid="button-sign-out"><LogOut className="h-4 w-4" /></Button>
      </div>
    </div>
  </aside>;
  return <WorkspaceSelectionContext.Provider value={{ workspaceId: selectedWorkspaceId, setWorkspaceId: setSelectedWorkspaceId }}><div className="min-h-screen bg-background text-foreground">
    <div className="hidden min-h-screen md:flex">{aside}<div className="min-w-0 flex-1"><WorkspaceTopbar name={name} /><main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{children}</main></div></div>
    <div className="flex min-h-screen flex-col md:hidden">
      <header className="flex h-16 items-center justify-between border-b bg-card px-4"><Link href="/dashboard" className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Command className="h-4 w-4" /></span>Founderbrain</Link><Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu className="h-5 w-5" /></Button></header>
      <main className="flex-1 px-4 py-6">{children}</main>
      {mobileOpen && <div className="fixed inset-0 z-50 flex"><button className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /><div className="relative h-full">{aside}<Button variant="ghost" size="icon" className="absolute right-3 top-3 text-sidebar-foreground" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></Button></div></div>}
    </div>
  </div></WorkspaceSelectionContext.Provider>;
}

function WorkspaceTopbar({ name }: { name: string }) {
  return <header className="flex h-16 items-center justify-between border-b border-border/70 bg-card/70 px-8">
    <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>Workspace</span><ArrowRight className="h-3.5 w-3.5" /><span className="font-medium text-foreground">{name}</span></div>
    <div className="flex items-center gap-3"><Badge variant="outline" className="hidden gap-1.5 border-accent/70 bg-accent/30 text-accent-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-chart-2" />Private workspace</Badge><Link href="/notifications" aria-label="Notifications" title="Open notifications" className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Bell className="h-4 w-4" /></Link></div>
  </header>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>{eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</div>}<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{children}</Link>;
}
