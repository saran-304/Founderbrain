import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { PageHeading, QueryError, LoadingBlock } from '@/components/workspace';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/founderbrain-design-system/components/ui/card';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';
import { Separator } from '@workspace/founderbrain-design-system/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@workspace/founderbrain-design-system/components/ui/alert';
import { CircleCheck, CircleHelp, KeyRound, LogOut, ShieldCheck, UserRound, Workflow } from 'lucide-react';
import { getGetCurrentUserQueryKey, getHealthCheckQueryKey, getListWorkspacesQueryKey, useGetCurrentUser, useHealthCheck, useListWorkspaces } from '@workspace/api-client-react';
import { toast } from '@workspace/founderbrain-design-system/hooks/use-toast';
import { Switch } from '@workspace/founderbrain-design-system/components/ui/switch';
import { getGetUserSettingsQueryKey, useGetUserSettings, useUpdateUserSettings } from '@workspace/api-client-react';

export default function SettingsPage() {
  const auth = useAuth();
  const client = useQueryClient();
  const currentUser = useGetCurrentUser();
  const workspaces = useListWorkspaces();
  const health = useHealthCheck();
  const preferences = useGetUserSettings();
  const updatePreferences = useUpdateUserSettings();
  const loading = currentUser.isLoading || workspaces.isLoading || health.isLoading || preferences.isLoading;
  if (loading) return <LoadingBlock title="Loading settings" />;
  if (currentUser.isError || workspaces.isError || preferences.isError) return <QueryError onRetry={() => {
    void client.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    void client.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
    void client.invalidateQueries({ queryKey: getGetUserSettingsQueryKey() });
  }} />;
  const signOut = async () => {
    try { await auth.signOut(); } catch { toast({ title: 'Sign out failed', description: 'Please try again.', variant: 'destructive' }); }
  };
  const apiState = health.isError ? 'Unavailable' : health.data?.status === 'ok' ? 'Connected' : health.data?.status || 'Connected';
  return <div className="max-w-4xl">
    <PageHeading eyebrow="Preferences & access" title="Settings" description="Manage your account, workspace access, and the services that keep Founderbrain running." />
    {!auth.isConfigured && <Alert className="mb-6"><CircleHelp className="h-4 w-4" /><AlertTitle>Authentication setup is incomplete</AlertTitle><AlertDescription className="mt-1">{auth.setupMessage}</AlertDescription></Alert>}
    <div className="space-y-5">
      <Card><CardHeader><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><UserRound className="h-5 w-5" /></div><div><CardTitle className="text-base">Account</CardTitle><CardDescription>Your signed-in identity.</CardDescription></div></div></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Display name</div><p className="mt-1 text-sm font-medium">{currentUser.data?.displayName || auth.user?.user_metadata?.display_name || 'Not provided'}</p></div><div><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email address</div><p className="mt-1 text-sm font-medium">{currentUser.data?.email || auth.user?.email}</p></div></div>
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-medium">Current session</div><p className="mt-1 text-xs text-muted-foreground">Authenticated securely through Supabase Auth.</p></div><Button variant="outline" onClick={() => void signOut()} data-testid="button-settings-signout"><LogOut className="h-4 w-4" />Sign out</Button></div>
        </CardContent>
      </Card>
      <Card><CardHeader><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Workflow className="h-5 w-5" /></div><div><CardTitle className="text-base">Workspace</CardTitle><CardDescription>Spaces linked to your account.</CardDescription></div></div></CardHeader>
        <CardContent>{workspaces.data?.length ? <div className="divide-y divide-border/70">{workspaces.data.map((workspace) => <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={workspace.id} data-testid={`workspace-row-${workspace.id}`}><div><p className="text-sm font-medium">{workspace.name}</p><p className="mt-1 text-xs text-muted-foreground">Created {new Date(workspace.createdAt).toLocaleDateString()}</p></div><Badge variant="secondary" className="capitalize">{workspace.role}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No workspace is linked to this account yet. Create one from the workspace switcher.</p>}</CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Founder network updates</CardTitle><CardDescription>Choose which community activity can reach your notifications.</CardDescription></CardHeader>
        <CardContent className="space-y-4">{([
          ['communityNotifications', 'Community replies', 'When someone responds to your posts or comments.'],
          ['connectionNotifications', 'Founder connections', 'Incoming connection requests and their outcomes.'],
          ['mentorshipNotifications', 'Mentorship activity', 'Questions, answers, and direct mentorship requests.'],
        ] as const).map(([key, title, description]) => <div className="flex items-center justify-between gap-4" key={key}><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Switch checked={preferences.data?.[key] ?? false} aria-label={title} disabled={updatePreferences.isPending} onCheckedChange={(checked) => updatePreferences.mutate({ data: { [key]: checked } }, {
          onSuccess: (value) => client.setQueryData(getGetUserSettingsQueryKey(), value),
          onError: () => toast({ title: 'Could not update notification preference', variant: 'destructive' }),
        })} /></div>)}</CardContent>
      </Card>
      <Card><CardHeader><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck className="h-5 w-5" /></div><div><CardTitle className="text-base">Connections & security</CardTitle><CardDescription>Live status from your authenticated workspace.</CardDescription></div></div></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><KeyRound className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">Supabase Auth</p><p className="text-xs text-muted-foreground">Session provider</p></div></div><Badge variant={auth.isConfigured ? 'secondary' : 'outline'} className="gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${auth.isConfigured ? 'bg-chart-4' : 'bg-chart-2'}`} />{auth.isConfigured ? 'Configured' : 'Needs setup'}</Badge></div>
          <Separator />
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><CircleCheck className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">Founderbrain API</p><p className="text-xs text-muted-foreground">{health.isError ? 'Health check could not connect.' : 'Service health check'}</p></div></div><Badge variant={health.isError ? 'outline' : 'secondary'}>{apiState}</Badge></div>
          <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => void client.invalidateQueries({ queryKey: getHealthCheckQueryKey() })} data-testid="button-refresh-health">Refresh status</Button></div>
        </CardContent>
      </Card>
      <Card className="border-accent/70 bg-accent/15"><CardContent className="flex gap-3 p-5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><ShieldCheck className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Private by default</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Founderbrain never asks you to expose a service key in the browser. Only the public Supabase publishable key is used for sign-in.</p></div></CardContent></Card>
    </div>
  </div>;
}
