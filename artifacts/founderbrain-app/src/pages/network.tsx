import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import { ArrowUpRight, Award, Check, CheckCheck, Command, Copy, Heart, MessageCircle, Plus, Search, Send, Shield, Trash2, Users } from 'lucide-react';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { Input } from '@workspace/founderbrain-design-system/components/ui/input';
import { Textarea } from '@workspace/founderbrain-design-system/components/ui/textarea';
import { Badge } from '@workspace/founderbrain-design-system/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/founderbrain-design-system/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/founderbrain-design-system/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@workspace/founderbrain-design-system/components/ui/dialog';
import { Switch } from '@workspace/founderbrain-design-system/components/ui/switch';
import { toast } from '@workspace/founderbrain-design-system/hooks/use-toast';
import {
  getListWorkspaceMembersQueryKey, getListWorkspaceInvitationsQueryKey, getListWorkspacesQueryKey,
  getListWorkspaceJoinRequestsQueryKey, getGetMyWorkspaceJoinRequestQueryKey,
  getSearchFoundersQueryKey, getListFounderConnectionsQueryKey, getGetFounderProfileQueryKey,
  getGetFounderPortfolioQueryKey,
  getListMyAchievementsQueryKey, getListCommunityPostsQueryKey, getListCommunityCommentsQueryKey,
  getListMentorshipQuestionsQueryKey, getListMentorshipAnswersQueryKey, getListMentorshipRequestsQueryKey,
  getListNotificationsQueryKey, useListWorkspaceMembers, useListWorkspaceInvitations,
  useGetMyWorkspaceJoinRequest, useListWorkspaceJoinRequests, useCreateWorkspaceJoinRequest, useUpdateWorkspaceJoinRequest,
  useCreateWorkspaceInvitation, useUpdateWorkspaceMember, useRemoveWorkspaceMember, useAcceptWorkspaceInvitation,
  useSearchFounders, useGetFounderProfile, useUpdateFounderProfile, useListFounderConnections,
  useGetFounderPortfolio,
  useCreateFounderConnection, useUpdateFounderConnection, useDeleteFounderConnection,
  useListMyAchievements, useCreateAchievement, useUpdateAchievement, useDeleteAchievement,
  useListCommunityPosts, useCreateCommunityPost, useUpdateCommunityPost, useDeleteCommunityPost,
  useListCommunityComments, useCreateCommunityComment, useUpdateCommunityComment, useDeleteCommunityComment,
  useSetCommunityReaction, useDeleteCommunityReaction, useListMentorshipQuestions, useCreateMentorshipQuestion,
  useUpdateMentorshipQuestion, useDeleteMentorshipQuestion, useListMentorshipAnswers, useCreateMentorshipAnswer,
  useUpdateMentorshipAnswer, useDeleteMentorshipAnswer, useAcceptMentorshipAnswer, useListMentorshipRequests,
  useCreateMentorshipRequest, useUpdateMentorshipRequest, useListNotifications, useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@workspace/api-client-react';
import type { Achievement, CommunityPost, MentorshipQuestion, WorkspaceInvitationRole, WorkspaceJoinRequest } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { BackLink, EmptyState, LoadingBlock, PageHeading, QueryError, useWorkspaceSelection } from '@/components/workspace';

const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const invalidate = (client: ReturnType<typeof useQueryClient>, key: readonly unknown[]) => void client.invalidateQueries({ queryKey: key });

export function TeamsPage() {
  const client = useQueryClient();
  const [location] = useLocation();
  const { workspaceId } = useWorkspaceSelection();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceInvitationRole>('member');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [joinWorkspaceId, setJoinWorkspaceId] = useState('');
  const [joinRequest, setJoinRequest] = useState<WorkspaceJoinRequest | null>(null);
  const [requestLookupId, setRequestLookupId] = useState('');
  useEffect(() => {
    const token = new URLSearchParams(location.split('?')[1] ?? '').get('invite');
    if (token) setInviteToken(token);
  }, [location]);
  const members = useListWorkspaceMembers(workspaceId, { query: { enabled: !!workspaceId, queryKey: getListWorkspaceMembersQueryKey(workspaceId) } });
  const myJoinRequest = useGetMyWorkspaceJoinRequest(requestLookupId, { query: { enabled: !!requestLookupId, queryKey: getGetMyWorkspaceJoinRequestQueryKey(requestLookupId) } });
  useEffect(() => {
    if (myJoinRequest.data) setJoinRequest(myJoinRequest.data);
  }, [myJoinRequest.data]);
  const currentMember = members.data?.find((member) => member.userId === user?.id);
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const invitations = useListWorkspaceInvitations(workspaceId, { query: { enabled: !!workspaceId && canManage, queryKey: getListWorkspaceInvitationsQueryKey(workspaceId) } });
  const joinRequests = useListWorkspaceJoinRequests(workspaceId, { query: { enabled: !!workspaceId && canManage, queryKey: getListWorkspaceJoinRequestsQueryKey(workspaceId) } });
  const createJoinRequest = useCreateWorkspaceJoinRequest();
  const updateJoinRequest = useUpdateWorkspaceJoinRequest();
  const createInvite = useCreateWorkspaceInvitation();
  const updateMember = useUpdateWorkspaceMember();
  const removeMember = useRemoveWorkspaceMember();
  const accept = useAcceptWorkspaceInvitation();
  const refresh = () => {
    invalidate(client, getListWorkspaceMembersQueryKey(workspaceId));
    invalidate(client, getListWorkspaceInvitationsQueryKey(workspaceId));
    invalidate(client, getListWorkspaceJoinRequestsQueryKey(workspaceId));
    invalidate(client, getListWorkspacesQueryKey());
  };
  const submitJoinRequest = (event: FormEvent) => {
    event.preventDefault();
    const requestedWorkspaceId = joinWorkspaceId.trim();
    if (!requestedWorkspaceId) return;
    createJoinRequest.mutate({ workspaceId: requestedWorkspaceId }, {
      onSuccess: (result) => {
        setJoinRequest(result);
        setRequestLookupId(requestedWorkspaceId);
        setJoinWorkspaceId(requestedWorkspaceId);
        toast({ title: 'Join request submitted', description: 'A workspace admin can now review your request.' });
      },
      onError: () => {
        setRequestLookupId(requestedWorkspaceId);
        void client.invalidateQueries({ queryKey: getGetMyWorkspaceJoinRequestQueryKey(requestedWorkspaceId) });
        toast({ title: 'Could not submit join request', description: 'Check the workspace ID and try again. If you already requested access, its status will appear here.', variant: 'destructive' });
      },
    });
  };
  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    createInvite.mutate({ workspaceId, data: { email: email.trim() || null, role } }, {
      onSuccess: ({ token }) => {
        setInviteToken(token);
        setInviteUrl(`${window.location.origin}/teams?invite=${encodeURIComponent(token)}`);
        setEmail('');
        refresh();
        toast({ title: 'Invitation link created', description: 'Copy the link and share it yourself. No email was sent.' });
      },
      onError: () => toast({ title: 'Could not create invitation', description: 'Please try again.', variant: 'destructive' }),
    });
  };
  const acceptInvite = (event: FormEvent) => {
    event.preventDefault();
    accept.mutate({ data: { token: inviteToken.trim() } }, {
      onSuccess: () => { setInviteToken(''); refresh(); toast({ title: 'Invitation accepted' }); },
      onError: () => toast({ title: 'Invitation could not be accepted', description: 'Check the link and sign in with the invited account.', variant: 'destructive' }),
    });
  };
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteUrl); toast({ title: 'Link copied' }); }
    catch { toast({ title: 'Copy unavailable', description: 'Select and copy the invitation link manually.', variant: 'destructive' }); }
  };
  const joinRequestPanel = <Card><CardHeader><CardTitle className="text-base">Request access to a workspace</CardTitle><CardDescription>Ask an owner or admin for access using the workspace ID they shared with you.</CardDescription></CardHeader><CardContent>
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitJoinRequest}><Input value={joinWorkspaceId} onChange={(event) => setJoinWorkspaceId(event.target.value)} placeholder="Workspace ID" aria-label="Workspace ID" required /><Button type="submit" disabled={!joinWorkspaceId.trim() || createJoinRequest.isPending}>{createJoinRequest.isPending ? 'Submitting…' : 'Request to join'}</Button></form>
    {(joinRequest || myJoinRequest.data) && <p className="mt-3 text-sm text-muted-foreground" role="status">Your request is <span className="font-medium capitalize text-foreground">{(joinRequest ?? myJoinRequest.data)?.status}</span>.</p>}
  </CardContent></Card>;
  if (!workspaceId) return <div className="space-y-5"><PageHeading eyebrow="Workspace access" title="Join a team" description="You do not have a workspace yet. Request access using an ID from an owner or admin." />{joinRequestPanel}</div>;
  if (members.isLoading || (canManage && (invitations.isLoading || joinRequests.isLoading))) return <LoadingBlock title="Loading workspace members" />;
  if (members.isError || (canManage && (invitations.isError || joinRequests.isError))) return <QueryError onRetry={() => { void members.refetch(); if (canManage) { void invitations.refetch(); void joinRequests.refetch(); } }} />;
  return <div className="max-w-5xl">
    <PageHeading eyebrow="Workspace access" title="People who build with you" description="Invite collaborators with a shareable link, and keep workspace access in your hands." />
    {joinRequestPanel}
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <CardHeader><CardTitle className="text-base">Invite a teammate</CardTitle><CardDescription>Create a link for someone you want in this workspace. Founderbrain will not email them.</CardDescription></CardHeader>
        <CardContent>
          {canManage ? <form className="space-y-4" onSubmit={submitInvite}>
            <label className="block space-y-2 text-sm font-medium">Email (optional)<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" aria-label="Invitee email address" /></label>
            <label className="block space-y-2 text-sm font-medium">Workspace role<Select value={role} onValueChange={(value) => setRole(value as WorkspaceInvitationRole)}><SelectTrigger aria-label="Invitation role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">Member</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></label>
            <Button type="submit" disabled={createInvite.isPending}><Plus className="h-4 w-4" />{createInvite.isPending ? 'Creating link…' : 'Create invitation link'}</Button>
          </form> : <p className="text-sm text-muted-foreground">Only workspace owners and admins can create invitation links.</p>}
          {canManage && <div className="mt-4 space-y-2 rounded-lg border bg-muted/40 p-4"><p className="text-sm font-medium">Share your workspace ID for join requests</p><div className="flex gap-2"><Input readOnly value={workspaceId} aria-label="Workspace ID to share" /><Button type="button" size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(workspaceId); toast({ title: 'Workspace ID copied' }); } catch { toast({ title: 'Copy unavailable', description: 'Select and copy the workspace ID manually.', variant: 'destructive' }); } }}>Copy ID</Button></div></div>}
          {inviteUrl && <div className="mt-5 space-y-2 rounded-lg border bg-muted/40 p-4"><p className="text-sm font-medium">Your invitation link is ready</p><div className="flex gap-2"><Input readOnly value={inviteUrl} aria-label="Invitation link" /><Button variant="outline" onClick={() => void copyInvite()} aria-label="Copy invitation link"><Copy className="h-4 w-4" />Copy</Button></div></div>}
          <form className="mt-7 border-t pt-5" onSubmit={acceptInvite}><label className="block space-y-2 text-sm font-medium">Have an invitation token?<Input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} placeholder="Paste your invite token" aria-label="Invitation token" /></label><Button className="mt-3" variant="outline" type="submit" disabled={!inviteToken.trim() || accept.isPending}>{accept.isPending ? 'Accepting…' : 'Accept invitation'}</Button></form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><Users className="h-5 w-5" /></div><div><CardTitle className="text-base">Workspace members</CardTitle><CardDescription>{members.data?.length ?? 0} people with access</CardDescription></div></div></CardHeader>
        <CardContent className="space-y-3">
          {members.data?.length ? members.data.map((member) => <div key={member.userId} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-primary">{member.displayName.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.displayName}</p><p className="text-xs text-muted-foreground">Joined {dateLabel(member.joinedAt)}</p></div>
            {member.role === 'owner' ? <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" />Owner</Badge> : canManage ? <Select value={member.role} onValueChange={(value) => updateMember.mutate({ workspaceId, memberId: member.userId, data: { role: value as 'admin' | 'member' } }, { onSuccess: refresh, onError: () => toast({ title: 'Role update failed', variant: 'destructive' }) })}><SelectTrigger className="w-28" aria-label={`Role for ${member.displayName}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="member">Member</SelectItem></SelectContent></Select> : <Badge variant="outline" className="capitalize">{member.role}</Badge>}
            {canManage && member.role !== 'owner' && <Button variant="ghost" size="icon" aria-label={`Remove ${member.displayName}`} disabled={removeMember.isPending} onClick={() => { if (window.confirm(`Remove ${member.displayName} from this workspace?`)) removeMember.mutate({ workspaceId, memberId: member.userId }, { onSuccess: refresh, onError: () => toast({ title: 'Could not remove member', variant: 'destructive' }) }); }}><Trash2 className="h-4 w-4" /></Button>}
          </div>) : <EmptyState title="Your team starts here" description="Create an invitation link when you are ready to bring someone into your workspace." />}
        </CardContent>
      </Card>
    </div>
    {canManage && <Card className="mt-5"><CardHeader><CardTitle className="text-base">Join requests</CardTitle><CardDescription>Review requests before granting workspace access.</CardDescription></CardHeader><CardContent>{joinRequests.data?.length ? <div className="divide-y">{joinRequests.data.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{request.requesterName}</p><p className="text-xs text-muted-foreground">Requested {dateLabel(request.createdAt)}</p></div><div className="flex items-center gap-2"><Badge variant={request.status === 'pending' ? 'outline' : 'secondary'} className="capitalize">{request.status}</Badge>{request.status === 'pending' && <><Button size="sm" disabled={updateJoinRequest.isPending} onClick={() => updateJoinRequest.mutate({ workspaceId, requestId: request.id, data: { status: 'accepted' } }, { onSuccess: refresh, onError: () => toast({ title: 'Could not accept join request', variant: 'destructive' }) })}>Accept</Button><Button size="sm" variant="outline" disabled={updateJoinRequest.isPending} onClick={() => updateJoinRequest.mutate({ workspaceId, requestId: request.id, data: { status: 'declined' } }, { onSuccess: refresh, onError: () => toast({ title: 'Could not decline join request', variant: 'destructive' }) })}>Decline</Button></>}</div></div>)}</div> : <p className="text-sm text-muted-foreground">No join requests yet.</p>}</CardContent></Card>}
    {canManage && <Card className="mt-5"><CardHeader><CardTitle className="text-base">Recent invitation links</CardTitle><CardDescription>Share links yourself and check their current status.</CardDescription></CardHeader><CardContent>{invitations.data?.length ? <div className="divide-y">{invitations.data.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{invite.email || 'Anyone with the link'}</p><p className="text-xs text-muted-foreground">Created {dateLabel(invite.createdAt)} · expires {dateLabel(invite.expiresAt)}</p></div><Badge variant={invite.status === 'pending' ? 'outline' : 'secondary'} className="capitalize">{invite.status} · {invite.role}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">No invitations yet.</p>}</CardContent></Card>}
  </div>;
}

export function FoundersPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [mentorshipProfile, setMentorshipProfile] = useState<{ id: string; name: string } | null>(null);
  const [mentorshipMessage, setMentorshipMessage] = useState('');
  const params = useMemo(() => ({ q: search.trim() || undefined, limit: 24 }), [search]);
  const profiles = useSearchFounders(params, { query: { queryKey: getSearchFoundersQueryKey(params) } });
  const connections = useListFounderConnections();
  const mentorshipRequests = useListMentorshipRequests();
  const request = useCreateFounderConnection();
  const update = useUpdateFounderConnection();
  const deleteConnection = useDeleteFounderConnection();
  const createMentorshipRequest = useCreateMentorshipRequest();
  const refresh = () => { invalidate(client, getListFounderConnectionsQueryKey()); invalidate(client, getSearchFoundersQueryKey(params)); invalidate(client, getListMentorshipRequestsQueryKey()); };
  if (profiles.isLoading || connections.isLoading || mentorshipRequests.isLoading) return <LoadingBlock title="Finding founders" />;
  if (profiles.isError || connections.isError || mentorshipRequests.isError) return <QueryError onRetry={() => { void profiles.refetch(); void connections.refetch(); void mentorshipRequests.refetch(); }} />;
  const requests = connections.data ?? [];
  const mentorRequests = mentorshipRequests.data ?? [];
  return <div>
    <PageHeading eyebrow="Founder network" title="Meet people building in your orbit" description="Find founders who opted into discovery. A connection or mentorship request is always sent only when you ask for it." />
    <div className="mb-5 relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, company, or skill" aria-label="Search founder profiles" /></div>
    {profiles.data?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{profiles.data.map((profile) => {
      const connection = requests.find((entry) => (entry.requesterId === profile.id && entry.recipientId === user?.id) || (entry.recipientId === profile.id && entry.requesterId === user?.id));
      const outgoing = connection?.requesterId === user?.id;
      const mentorRequest = mentorRequests.find((entry) => entry.senderId === user?.id && entry.recipientId === profile.id);
      return <Card key={profile.id}><CardContent className="p-5">
        <div className="flex items-start justify-between gap-3"><div><div className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-base font-semibold text-primary">{profile.displayName.slice(0, 1).toUpperCase()}</div><h2 className="mt-4 font-semibold">{profile.displayName}</h2><p className="mt-1 text-sm text-muted-foreground">{profile.headline || 'Founder'}</p></div>{profile.stage && <Badge variant="outline" className="capitalize">{profile.stage}</Badge>}</div>
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{profile.bio || 'This founder has not added a bio yet.'}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">{profile.skills.slice(0, 5).map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div>
        <div className="mt-4 space-y-1 text-xs text-muted-foreground">{profile.company && <p>{profile.company}</p>}{profile.location && <p>{profile.location}</p>}</div>
        <div className="mt-5 flex flex-wrap gap-2">
           {!connection && <Button size="sm" disabled={request.isPending} onClick={() => request.mutate({ data: { recipientId: profile.id } }, { onSuccess: refresh, onError: () => toast({ title: 'Request could not be sent', variant: 'destructive' }) })}><Users className="h-4 w-4" />Connect</Button>}
          {connection?.status === 'pending' && outgoing && <Badge variant="outline">Request sent</Badge>}
           {connection?.status === 'pending' && !outgoing && <><Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ connectionId: connection.id, data: { status: 'accepted' } }, { onSuccess: refresh, onError: () => toast({ title: 'Could not accept connection request', variant: 'destructive' }) })}><Check className="h-4 w-4" />Accept</Button><Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ connectionId: connection.id, data: { status: 'declined' } }, { onSuccess: refresh, onError: () => toast({ title: 'Could not decline connection request', variant: 'destructive' }) })}>Decline</Button></>}
          {connection?.status === 'accepted' && <Badge variant="secondary">Connected</Badge>}
          {mentorRequest ? <Badge variant="outline">Mentorship {mentorRequest.status}</Badge> : <Button size="sm" variant="outline" onClick={() => { setMentorshipProfile({ id: profile.id, name: profile.displayName }); setMentorshipMessage(''); }}>Request mentorship</Button>}
        {profile.portfolioIsPublic && <Button size="sm" variant="outline" asChild><Link href={`/portfolio/${profile.id}`}><Award className="h-4 w-4" />Portfolio</Link></Button>}
        {profile.websiteUrl && <Button size="sm" variant="outline" asChild><a href={profile.websiteUrl} target="_blank" rel="noreferrer"><ArrowUpRight className="h-4 w-4" />Website</a></Button>}
        </div>
      </CardContent></Card>;
    })}</div> : <EmptyState title={search ? 'No founders match that search' : 'A network grows one conversation at a time'} description={search ? 'Try a different name, company, or skill.' : 'There are no discoverable profiles to show right now. Complete your profile and choose to be discoverable.'} />}
    <Card className="mt-6"><CardHeader><CardTitle className="text-base">Your connection requests</CardTitle><CardDescription>Incoming requests deserve a thoughtful response. Outgoing requests stay visible here.</CardDescription></CardHeader><CardContent>{requests.length ? <div className="divide-y">{requests.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{entry.requesterId === user?.id ? `You requested ${entry.recipientName}` : `${entry.requesterName} wants to connect`}</p><p className="text-xs text-muted-foreground">{dateLabel(entry.createdAt)}</p></div><div className="flex items-center gap-2"><Badge variant={entry.status === 'accepted' ? 'secondary' : 'outline'} className="capitalize">{entry.status}</Badge>{(entry.requesterId === user?.id || entry.status !== 'pending') && <Button size="sm" variant="ghost" disabled={deleteConnection.isPending} onClick={() => deleteConnection.mutate({ connectionId: entry.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not remove connection', variant: 'destructive' }) })}>Remove</Button>}</div></div>)}</div> : <p className="text-sm text-muted-foreground">No connection requests yet.</p>}</CardContent></Card>
    <Dialog open={!!mentorshipProfile} onOpenChange={(open) => { if (!open) setMentorshipProfile(null); }}><DialogContent><DialogHeader><DialogTitle>Request mentorship</DialogTitle><DialogDescription>Send a direct, thoughtful request to {mentorshipProfile?.name}. Nothing is sent until you submit.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!mentorshipProfile || !mentorshipMessage.trim()) return; createMentorshipRequest.mutate({ data: { recipientId: mentorshipProfile.id, message: mentorshipMessage.trim() } }, { onSuccess: () => { setMentorshipProfile(null); setMentorshipMessage(''); refresh(); toast({ title: 'Mentorship request sent' }); }, onError: () => toast({ title: 'Could not send mentorship request', variant: 'destructive' }) }); }}><label className="block space-y-2 text-sm font-medium">Your message<Textarea rows={5} maxLength={1000} minLength={1} required value={mentorshipMessage} onChange={(event) => setMentorshipMessage(event.target.value)} placeholder="Share what you are working on and what kind of perspective would help…" /></label><DialogFooter><Button type="button" variant="outline" onClick={() => setMentorshipProfile(null)}>Cancel</Button><Button type="submit" disabled={!mentorshipMessage.trim() || createMentorshipRequest.isPending}>{createMentorshipRequest.isPending ? 'Sending…' : 'Send request'}</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

export function PortfolioPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const profile = useGetFounderProfile();
  const achievements = useListMyAchievements();
  const updateProfile = useUpdateFounderProfile();
  const create = useCreateAchievement();
  const update = useUpdateAchievement();
  const remove = useDeleteAchievement();
  const [form, setForm] = useState({
    displayName: '',
    headline: '',
    bio: '',
    skills: '',
    location: '',
    company: '',
    stage: '',
    websiteUrl: '',
    isDiscoverable: false
  });
  const [editing, setEditing] = useState(false);

  // Initialize form with current profile data
  useEffect(() => {
    if (profile.data) {
      setForm({
        displayName: profile.data.displayName || '',
        headline: profile.data.headline || '',
        bio: profile.data.bio || '',
        skills: profile.data.skills.join(', ') || '',
        location: profile.data.location || '',
        company: profile.data.company || '',
        stage: profile.data.stage || '',
        websiteUrl: profile.data.websiteUrl || '',
        isDiscoverable: profile.data.isDiscoverable || false,
      });
    }
  }, [profile.data]);

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    updateProfile.mutate({
      founderId: user!.id,
      data: {
        ...form,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      }
    }, {
      onSuccess: () => {
        setEditing(false);
        refresh();
        toast({ title: 'Profile updated' });
      },
      onError: () => toast({ title: 'Could not update profile', variant: 'destructive' })
    });
  };

  const [achievementForm, setAchievementForm] = useState({ title: '', description: '', category: '', externalUrl: '', issuedOn: '' });
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

  const saveAchievement = (event: FormEvent) => {
    event.preventDefault();
    const data = { title: achievementForm.title.trim(), description: achievementForm.description || null, category: achievementForm.category || null, externalUrl: achievementForm.externalUrl || null, issuedOn: achievementForm.issuedOn || null };
    if (editingAchievement) update.mutate({ achievementId: editingAchievement.id, data }, { onSuccess: () => { setEditingAchievement(null); setAchievementForm({ title: '', description: '', category: '', externalUrl: '', issuedOn: '' }); refresh(); }, onError: () => toast({ title: 'Could not update achievement', variant: 'destructive' }) });
    else create.mutate({ data }, { onSuccess: () => { setAchievementForm({ title: '', description: '', category: '', externalUrl: '', issuedOn: '' }); refresh(); }, onError: () => toast({ title: 'Could not add achievement', variant: 'destructive' }) });
  };
  if (profile.isLoading || achievements.isLoading) return <LoadingBlock title="Loading your portfolio" />;
  if (profile.isError || achievements.isError) return <QueryError onRetry={() => { void profile.refetch(); void achievements.refetch(); }} />;
  const visibility = (value: boolean) => {
    if (!user) return;
    updateProfile.mutate({ founderId: user.id, data: { portfolioIsPublic: value } }, { onSuccess: refresh, onError: () => toast({ title: 'Could not update portfolio privacy', variant: 'destructive' }) });
  };
  return <div className="max-w-5xl">
    <PageHeading eyebrow="Proof of progress" title="Your founder portfolio" description="Bring meaningful milestones together in one place. You decide whether it can be seen publicly." />
    <Card className="mb-5"><CardContent>
        <form onSubmit={saveProfile} className="space-y-4">
            <h2 className="font-semibold">Edit Profile</h2>
            <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-2 text-sm font-medium">Display Name<Input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
                <label className="block space-y-2 text-sm font-medium">Headline<Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></label>
                <label className="block space-y-2 text-sm font-medium sm:col-span-2">Bio<Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
                <label className="block space-y-2 text-sm font-medium">Skills (comma-separated)<Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></label>
                <label className="block space-y-2 text-sm font-medium">Company<Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
                <label className="block space-y-2 text-sm font-medium">Location<Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
                <label className="block space-y-2 text-sm font-medium">Website<Input value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} /></label>
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>Save Profile</Button>
        </form>
    </CardContent></Card>
    <Card className="mb-5"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold">{profile.data?.displayName || 'Your portfolio'}</h2><p className="mt-1 text-sm text-muted-foreground">Visibility is off by default. Your profile discovery preference is managed separately.</p></div><div className="flex items-center gap-3"><span className="text-sm font-medium">{profile.data?.portfolioIsPublic ? 'Public portfolio' : 'Private portfolio'}</span><Switch checked={profile.data?.portfolioIsPublic ?? false} onCheckedChange={visibility} aria-label="Make portfolio public" /></div></CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card><CardHeader><CardTitle className="text-base">{editingAchievement ? 'Edit achievement' : 'Add an achievement'}</CardTitle><CardDescription>Capture a launch, award, milestone, or piece of work worth remembering.</CardDescription></CardHeader><CardContent><form onSubmit={saveAchievement} className="space-y-3">
        <label className="block space-y-2 text-sm font-medium">Title<Input required maxLength={160} value={achievementForm.title} onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })} /></label>
        <label className="block space-y-2 text-sm font-medium">Description<Textarea rows={3} value={achievementForm.description} onChange={(e) => setAchievementForm({ ...achievementForm, description: e.target.value })} /></label>
        <label className="block space-y-2 text-sm font-medium">Category<Input value={achievementForm.category} onChange={(e) => setAchievementForm({ ...achievementForm, category: e.target.value })} placeholder="Launch, funding, award…" /></label>
        <label className="block space-y-2 text-sm font-medium">Link (optional)<Input type="url" value={achievementForm.externalUrl} onChange={(e) => setAchievementForm({ ...achievementForm, externalUrl: e.target.value })} placeholder="https://" /></label>
        <label className="block space-y-2 text-sm font-medium">Date<Input type="date" value={achievementForm.issuedOn} onChange={(e) => setAchievementForm({ ...achievementForm, issuedOn: e.target.value })} /></label>
        <div className="flex gap-2"><Button type="submit" disabled={create.isPending || update.isPending}>{editingAchievement ? 'Save achievement' : 'Add achievement'}</Button>{editingAchievement && <Button type="button" variant="outline" onClick={() => { setEditingAchievement(null); setAchievementForm({ title: '', description: '', category: '', externalUrl: '', issuedOn: '' }); }}>Cancel</Button>}</div>
      </form></CardContent></Card>
      <section className="space-y-3">{achievements.data?.length ? achievements.data.map((achievement) => <Card key={achievement.id}><CardContent className="flex gap-4 p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Award className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{achievement.title}</h3>{achievement.category && <Badge variant="outline">{achievement.category}</Badge>}</div><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{achievement.description || 'A milestone added to your portfolio.'}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{achievement.issuedOn && <span>{dateLabel(achievement.issuedOn)}</span>}{achievement.externalUrl && <a className="inline-flex items-center gap-1 text-primary underline" href={achievement.externalUrl} target="_blank" rel="noreferrer">Open link<ArrowUpRight className="h-3 w-3" /></a>}</div><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => { setEditingAchievement(achievement); setAchievementForm({ title: achievement.title, description: achievement.description ?? '', category: achievement.category ?? '', externalUrl: achievement.externalUrl ?? '', issuedOn: achievement.issuedOn ?? '' }); }}>Edit</Button><Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Delete “${achievement.title}”?`)) remove.mutate({ achievementId: achievement.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not delete achievement', variant: 'destructive' }) }); }}>Delete</Button></div></div></CardContent></Card>) : <EmptyState title="A portfolio of the work that matters" description="Add your first achievement. You can edit or remove it any time." />}</section>
    </div>
  </div>;
}

function PublicPortfolioHeader() {
  const { user } = useAuth();
  return <header className="border-b border-border/70 bg-card/70">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
      <Link href={user ? '/dashboard' : '/login'} className="flex items-center gap-3" aria-label="Founderbrain home">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Command className="h-5 w-5" /></span>
        <span><span className="block text-sm font-semibold tracking-tight">Founderbrain</span><span className="hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">Founder portfolio</span></span>
      </Link>
      <nav className="flex items-center gap-2" aria-label="Portfolio navigation">
        {user ? <Link href="/founders" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Founder network</Link> : <>
          <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Sign in</Link>
          <Link href="/signup" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Create account</Link>
        </>}
      </nav>
    </div>
  </header>;
}

export function PublicPortfolioPage() {
  const { founderId = '' } = useParams<{ founderId: string }>();
  const portfolio = useGetFounderPortfolio(founderId, { query: { enabled: !!founderId, queryKey: getGetFounderPortfolioQueryKey(founderId) } });
  if (portfolio.isLoading) return <div className="min-h-[100dvh] bg-background text-foreground"><PublicPortfolioHeader /><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10"><LoadingBlock title="Loading founder portfolio" /></main></div>;
  if (portfolio.isError || !portfolio.data) return <div className="min-h-[100dvh] bg-background text-foreground"><PublicPortfolioHeader /><main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10"><QueryError message="This portfolio is private or unavailable." onRetry={() => void portfolio.refetch()} /></main></div>;
  const { profile, achievements } = portfolio.data;
  return <div className="min-h-[100dvh] bg-background text-foreground">
    <PublicPortfolioHeader />
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
    <PageHeading eyebrow="Founder portfolio" title={profile.displayName} description={profile.headline || 'A public record of founder milestones and work.'} action={profile.websiteUrl ? <Button variant="outline" asChild><a href={profile.websiteUrl} target="_blank" rel="noreferrer"><ArrowUpRight className="h-4 w-4" />Website</a></Button> : undefined} />
    <Card className="mb-5"><CardContent className="grid gap-4 p-5 sm:grid-cols-2">
      {profile.bio && <div className="sm:col-span-2"><h2 className="text-sm font-semibold">About</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{profile.bio}</p></div>}
      {profile.company && <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Company</p><p className="mt-1 text-sm font-medium">{profile.company}</p></div>}
      {profile.stage && <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stage</p><p className="mt-1 text-sm font-medium capitalize">{profile.stage.replaceAll('_', ' ')}</p></div>}
      {profile.location && <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</p><p className="mt-1 text-sm font-medium">{profile.location}</p></div>}
      {profile.skills.length > 0 && <div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills</p><div className="mt-2 flex flex-wrap gap-1.5">{profile.skills.map((skill) => <Badge variant="secondary" key={skill}>{skill}</Badge>)}</div></div>}
    </CardContent></Card>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Achievements</h2>{achievements.length ? achievements.map((achievement) => <Card key={achievement.id}><CardContent className="flex gap-4 p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Award className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{achievement.title}</h3>{achievement.category && <Badge variant="outline">{achievement.category}</Badge>}</div>{achievement.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{achievement.description}</p>}<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{achievement.issuedOn && <span>{dateLabel(achievement.issuedOn)}</span>}{achievement.externalUrl && <a className="inline-flex items-center gap-1 text-primary underline" href={achievement.externalUrl} target="_blank" rel="noreferrer">Open link<ArrowUpRight className="h-3 w-3" /></a>}</div></div></CardContent></Card>) : <EmptyState title="No achievements have been shared" description="This founder has not added public portfolio milestones yet." />}</section>
    </main>
  </div>;
}

function CommunityPostCard({ post, currentUserId }: { post: CommunityPost; currentUserId?: string }) {
  const client = useQueryClient();
  const comments = useListCommunityComments(post.id, { query: { queryKey: getListCommunityCommentsQueryKey(post.id) } });
  const createComment = useCreateCommunityComment();
  const updateComment = useUpdateCommunityComment();
  const deleteComment = useDeleteCommunityComment();
  const setReaction = useSetCommunityReaction();
  const removeReaction = useDeleteCommunityReaction();
  const editPost = useUpdateCommunityPost();
  const deletePost = useDeleteCommunityPost();
  const [comment, setComment] = useState('');
  const [editText, setEditText] = useState(post.content);
  const [editing, setEditing] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState('');
  const [editingCommentText, setEditingCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const refresh = () => { invalidate(client, getListCommunityPostsQueryKey({ limit: 40 })); invalidate(client, getListCommunityCommentsQueryKey(post.id)); };
  const sendComment = (event: FormEvent) => { event.preventDefault(); if (!comment.trim()) return; createComment.mutate({ postId: post.id, data: { content: comment.trim() } }, { onSuccess: () => { setComment(''); refresh(); }, onError: () => toast({ title: 'Could not add comment', variant: 'destructive' }) }); };
  return <Card><CardContent className="p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-semibold text-primary">{post.authorName.slice(0, 1).toUpperCase()}</div><div><p className="text-sm font-semibold">{post.authorName}</p><p className="text-xs text-muted-foreground">{dateLabel(post.createdAt)}{post.updatedAt !== post.createdAt ? ' · edited' : ''}</p></div></div>
      {post.authorId === currentUserId && <div className="flex gap-1">{editing ? <><Button size="sm" disabled={!editText.trim() || editPost.isPending} onClick={() => editPost.mutate({ postId: post.id, data: { content: editText.trim() } }, { onSuccess: () => { setEditing(false); refresh(); }, onError: () => toast({ title: 'Could not update post', variant: 'destructive' }) })}>Save</Button><Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditText(post.content); }}>Cancel</Button></> : <><Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button><Button size="sm" variant="ghost" aria-label="Delete post" disabled={deletePost.isPending} onClick={() => { if (window.confirm('Delete this post and its conversation?')) deletePost.mutate({ postId: post.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not delete post', variant: 'destructive' }) }); }}><Trash2 className="h-4 w-4" /></Button></>}</div>}
    </div>
    {editing ? <Textarea className="mt-4" rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edit post" /> : <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>}
    <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
      <Button size="sm" variant={post.viewerReaction ? 'secondary' : 'outline'} disabled={setReaction.isPending || removeReaction.isPending} onClick={() => post.viewerReaction ? removeReaction.mutate({ postId: post.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not update reaction', variant: 'destructive' }) }) : setReaction.mutate({ postId: post.id, data: { reaction: 'like' } }, { onSuccess: refresh, onError: () => toast({ title: 'Could not update reaction', variant: 'destructive' }) })}><Heart className="h-4 w-4" />{post.viewerReaction ? 'Reacted' : 'Appreciate'} <span className="text-muted-foreground">{post.reactionCount}</span></Button>
      <Button size="sm" variant="ghost" onClick={() => setShowComments(!showComments)}><MessageCircle className="h-4 w-4" />{showComments ? 'Hide conversation' : 'Comments'} <span className="text-muted-foreground">{post.commentCount}</span></Button>
    </div>
    {showComments && <div className="mt-4 space-y-3 border-t pt-4">
      {comments.isLoading ? <div className="space-y-2"><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /></div> : comments.isError ? <QueryError message="Comments could not be loaded." onRetry={() => void comments.refetch()} /> : comments.data?.length ? comments.data.map((item) => <div className="rounded-lg bg-muted/40 p-3" key={item.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold">{item.authorName}<span className="ml-2 font-normal text-muted-foreground">{dateLabel(item.createdAt)}</span></p>{editingCommentId === item.id ? <Textarea className="mt-2" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} aria-label="Edit comment" /> : <p className="mt-1 whitespace-pre-wrap text-sm">{item.content}</p>}</div>{item.authorId === currentUserId && <div className="flex gap-1">{editingCommentId === item.id ? <Button size="sm" variant="ghost" disabled={!editingCommentText.trim() || updateComment.isPending} onClick={() => updateComment.mutate({ commentId: item.id, data: { content: editingCommentText.trim() } }, { onSuccess: () => { setEditingCommentId(''); refresh(); }, onError: () => toast({ title: 'Could not update comment', variant: 'destructive' }) })}>Save</Button> : <Button size="sm" variant="ghost" onClick={() => { setEditingCommentId(item.id); setEditingCommentText(item.content); }}>Edit</Button>}<Button size="sm" variant="ghost" aria-label="Delete comment" disabled={deleteComment.isPending} onClick={() => deleteComment.mutate({ commentId: item.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not delete comment', variant: 'destructive' }) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>}</div></div>) : <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>}
      <form className="flex gap-2" onSubmit={sendComment}><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add to the conversation…" aria-label="Write a comment" /><Button type="submit" disabled={!comment.trim() || createComment.isPending} aria-label="Send comment"><Send className="h-4 w-4" /></Button></form>
    </div>}
  </CardContent></Card>;
}

export function CommunityPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const params = useMemo(() => ({ limit: 40 }), []);
  const posts = useListCommunityPosts(params, { query: { queryKey: getListCommunityPostsQueryKey(params) } });
  const create = useCreateCommunityPost();
  const submit = (event: FormEvent) => { event.preventDefault(); if (!content.trim()) return; create.mutate({ data: { content: content.trim() } }, { onSuccess: () => { setContent(''); invalidate(client, getListCommunityPostsQueryKey(params)); }, onError: () => toast({ title: 'Could not publish your post', variant: 'destructive' }) }); };
  if (posts.isLoading) return <LoadingBlock title="Loading community" />;
  if (posts.isError) return <QueryError onRetry={() => void posts.refetch()} />;
  return <div className="mx-auto max-w-3xl">
    <PageHeading eyebrow="Founder community" title="Make room for the real conversation" description="Share a question, a lesson, or a small win. Good founder work gets better when it is not done alone." />
    <Card className="mb-5"><CardContent className="p-5"><form onSubmit={submit} className="space-y-3"><label className="block space-y-2 text-sm font-medium">What is on your mind?<Textarea rows={4} maxLength={5000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share context, ask for perspective, or tell the community what you learned…" aria-label="Write a community post" /></label><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{content.length}/5000 characters</span><Button type="submit" disabled={!content.trim() || create.isPending}><Plus className="h-4 w-4" />{create.isPending ? 'Publishing…' : 'Publish post'}</Button></div></form></CardContent></Card>
    <div className="space-y-4">{posts.data?.length ? posts.data.map((post) => <CommunityPostCard key={post.id} post={post} currentUserId={user?.id} />) : <EmptyState title="Your community begins with a first post" description="Ask something you are wrestling with or share a lesson another founder might need." />}</div>
  </div>;
}

export function MentorshipPage() {
  const client = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const params = useMemo(() => ({ limit: 30 }), []);
  const questions = useListMentorshipQuestions(params, { query: { queryKey: getListMentorshipQuestionsQueryKey(params) } });
  const requests = useListMentorshipRequests();
  const createQuestion = useCreateMentorshipQuestion();
  const updateQuestion = useUpdateMentorshipQuestion();
  const deleteQuestion = useDeleteMentorshipQuestion();
  const updateRequest = useUpdateMentorshipRequest();
  const refreshQuestions = () => { invalidate(client, getListMentorshipQuestionsQueryKey(params)); invalidate(client, getListMentorshipRequestsQueryKey()); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !body.trim()) return; createQuestion.mutate({ data: { title: title.trim(), body: body.trim(), tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8) } }, { onSuccess: () => { setTitle(''); setBody(''); setTags(''); refreshQuestions(); }, onError: () => toast({ title: 'Could not post your question', variant: 'destructive' }) }); };
  if (questions.isLoading || requests.isLoading) return <LoadingBlock title="Loading mentorship" />;
  if (questions.isError || requests.isError) return <QueryError onRetry={() => { void questions.refetch(); void requests.refetch(); }} />;
  return <div>
    <PageHeading eyebrow="Learn together" title="Questions that move founders forward" description="Ask for grounded advice, share what you know, and mark the answer that helped most." />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="space-y-4">
        <Card><CardHeader><CardTitle className="text-base">Ask the community</CardTitle><CardDescription>Specific context helps mentors give useful answers.</CardDescription></CardHeader><CardContent><form className="space-y-3" onSubmit={submit}><label className="block space-y-2 text-sm font-medium">Question title<Input maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} required /></label><label className="block space-y-2 text-sm font-medium">Context<Textarea rows={4} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} required /></label><label className="block space-y-2 text-sm font-medium">Topics, separated by commas<Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="fundraising, hiring, product" /></label><Button type="submit" disabled={createQuestion.isPending || !title.trim() || !body.trim()}>Post question</Button></form></CardContent></Card>
        {questions.data?.map((question) => <QuestionCard key={question.id} question={question} currentUserId={user?.id} onRefresh={refreshQuestions} updateQuestion={updateQuestion} deleteQuestion={deleteQuestion} />)}
        {!questions.data?.length && <EmptyState title="A good question can open a new door" description="Start a mentorship conversation by sharing the decision you are trying to make." />}
      </div>
      <aside className="space-y-4">
        <Card><CardHeader><CardTitle className="text-base">Mentorship requests</CardTitle><CardDescription>Direct requests you sent or received.</CardDescription></CardHeader><CardContent>{requests.data?.length ? <div className="space-y-3">{requests.data.map((item) => <div className="rounded-lg border p-3" key={item.id}><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{item.senderId === user?.id ? `To ${item.recipientName}` : `From ${item.senderName}`}</p><Badge variant="outline" className="capitalize">{item.status}</Badge></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.message}</p>{item.status === 'pending' && item.recipientId === user?.id && <div className="mt-3 flex gap-2"><Button size="sm" disabled={updateRequest.isPending} onClick={() => updateRequest.mutate({ requestId: item.id, data: { status: 'accepted' } }, { onSuccess: refreshQuestions, onError: () => toast({ title: 'Could not accept mentorship request', variant: 'destructive' }) })}>Accept</Button><Button size="sm" variant="outline" disabled={updateRequest.isPending} onClick={() => updateRequest.mutate({ requestId: item.id, data: { status: 'declined' } }, { onSuccess: refreshQuestions, onError: () => toast({ title: 'Could not decline mentorship request', variant: 'destructive' }) })}>Decline</Button></div>}</div>)}</div> : <p className="text-sm text-muted-foreground">No requests yet. You can send one from a founder profile.</p>}</CardContent></Card>
        <Card className="bg-muted/40"><CardContent className="p-5"><h3 className="text-sm font-semibold">Make the ask useful</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Describe what you have tried, the constraints you are working within, and what decision would help you move.</p></CardContent></Card>
      </aside>
    </div>
  </div>;
}

function QuestionCard({ question, currentUserId, onRefresh, updateQuestion, deleteQuestion }: {
  question: MentorshipQuestion; currentUserId?: string; onRefresh: () => void;
  updateQuestion: ReturnType<typeof useUpdateMentorshipQuestion>; deleteQuestion: ReturnType<typeof useDeleteMentorshipQuestion>;
}) {
  const client = useQueryClient();
  const answers = useListMentorshipAnswers(question.id, { query: { queryKey: getListMentorshipAnswersQueryKey(question.id) } });
  const createAnswer = useCreateMentorshipAnswer();
  const updateAnswer = useUpdateMentorshipAnswer();
  const deleteAnswer = useDeleteMentorshipAnswer();
  const acceptAnswer = useAcceptMentorshipAnswer();
  const [answer, setAnswer] = useState('');
  const [editingAnswer, setEditingAnswer] = useState('');
  const [editingAnswerBody, setEditingAnswerBody] = useState('');
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(question.title);
  const [body, setBody] = useState(question.body);
  const refresh = () => { invalidate(client, getListMentorshipAnswersQueryKey(question.id)); onRefresh(); };
  return <Card><CardContent className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1">{edit ? <div className="space-y-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Edit question title" /><Textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="Edit question context" /></div> : <><h2 className="text-lg font-semibold">{question.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{question.body}</p></>}<div className="mt-3 flex flex-wrap gap-1.5">{question.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div><p className="mt-3 text-xs text-muted-foreground">Asked by {question.authorName} · {dateLabel(question.createdAt)} · {question.answerCount} answers</p></div>
      {question.authorId === currentUserId && <div className="flex gap-1">{edit ? <><Button size="sm" disabled={!title.trim() || !body.trim() || updateQuestion.isPending} onClick={() => updateQuestion.mutate({ questionId: question.id, data: { title: title.trim(), body: body.trim() } }, { onSuccess: () => { setEdit(false); onRefresh(); }, onError: () => toast({ title: 'Could not update question', variant: 'destructive' }) })}>Save</Button><Button size="sm" variant="ghost" onClick={() => { setEdit(false); setTitle(question.title); setBody(question.body); }}>Cancel</Button></> : <><Button size="sm" variant="ghost" onClick={() => setEdit(true)}>Edit</Button><Button size="sm" variant="ghost" aria-label="Delete question" disabled={deleteQuestion.isPending} onClick={() => { if (window.confirm('Delete this question?')) deleteQuestion.mutate({ questionId: question.id }, { onSuccess: onRefresh, onError: () => toast({ title: 'Could not delete question', variant: 'destructive' }) }); }}><Trash2 className="h-4 w-4" /></Button></>}</div>}
    </div>
    <div className="mt-5 space-y-3 border-t pt-4">
      {answers.isLoading ? <div className="h-16 animate-pulse rounded bg-muted" /> : answers.isError ? <QueryError message="Answers could not be loaded." onRetry={() => void answers.refetch()} /> : answers.data?.length ? answers.data.map((item) => <div key={item.id} className={`rounded-lg border p-4 ${item.accepted ? 'border-primary/50 bg-secondary/40' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.authorName}</p>{item.accepted && <Badge variant="secondary"><CheckCheck className="mr-1 h-3 w-3" />Accepted answer</Badge>}</div>{editingAnswer === item.id ? <Textarea className="mt-2" value={editingAnswerBody} onChange={(event) => setEditingAnswerBody(event.target.value)} aria-label="Edit your answer" /> : <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>}</div><div className="flex flex-wrap gap-1">{question.authorId === currentUserId && !item.accepted && <Button size="sm" variant="outline" disabled={acceptAnswer.isPending} aria-label="Accept answer" onClick={() => acceptAnswer.mutate({ answerId: item.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not accept answer', variant: 'destructive' }) })}><Check className="h-4 w-4" />Accept</Button>}{item.authorId === currentUserId && (editingAnswer === item.id ? <><Button size="sm" variant="ghost" disabled={!editingAnswerBody.trim() || updateAnswer.isPending} onClick={() => updateAnswer.mutate({ answerId: item.id, data: { body: editingAnswerBody.trim() } }, { onSuccess: () => { setEditingAnswer(''); refresh(); }, onError: () => toast({ title: 'Could not update answer', variant: 'destructive' }) })}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingAnswer('')}>Cancel</Button></> : <><Button size="sm" variant="ghost" onClick={() => { setEditingAnswer(item.id); setEditingAnswerBody(item.body); }}>Edit</Button><Button size="sm" variant="ghost" aria-label="Delete answer" disabled={deleteAnswer.isPending} onClick={() => deleteAnswer.mutate({ answerId: item.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not delete answer', variant: 'destructive' }) })}><Trash2 className="h-4 w-4" /></Button></>)}</div></div></div>) : <p className="text-sm text-muted-foreground">No answers yet. Share a perspective or ask a follow-up.</p>}
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!answer.trim()) return; createAnswer.mutate({ questionId: question.id, data: { body: answer.trim() } }, { onSuccess: () => { setAnswer(''); refresh(); }, onError: () => toast({ title: 'Could not add your answer', variant: 'destructive' }) }); }}><Textarea rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Share what you have learned…" aria-label="Write an answer" /><Button className="sm:self-end" type="submit" disabled={!answer.trim() || createAnswer.isPending}><Send className="h-4 w-4" />Answer</Button></form>
    </div>
  </CardContent></Card>;
}

export function NotificationsPage() {
  const client = useQueryClient();
  const notifications = useListNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();
  const refresh = () => invalidate(client, getListNotificationsQueryKey());
  if (notifications.isLoading) return <LoadingBlock title="Loading notifications" />;
  if (notifications.isError) return <QueryError onRetry={() => void notifications.refetch()} />;
  const unreadCount = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  return <div className="max-w-4xl">
    <PageHeading eyebrow="Your activity" title="Notifications" description="A clear record of connection requests, conversation replies, and workspace invitations." action={<Button variant="outline" disabled={!unreadCount || markAll.isPending} onClick={() => markAll.mutate(undefined, { onSuccess: refresh, onError: () => toast({ title: 'Could not mark notifications read', variant: 'destructive' }) })}><CheckCheck className="h-4 w-4" />Mark all read</Button>} />
    <Card><CardContent className="p-0">{notifications.data?.length ? <div className="divide-y">{notifications.data.map((item) => <div key={item.id} className={`flex items-start gap-4 p-5 ${item.readAt ? '' : 'bg-secondary/30'}`}><span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.readAt ? 'bg-muted' : 'bg-primary'}`} aria-label={item.readAt ? 'Read' : 'Unread'} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{item.title}</h2>{!item.readAt && <Badge variant="secondary">New</Badge>}</div>{item.body && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>}<p className="mt-2 text-xs text-muted-foreground">{dateLabel(item.createdAt)}</p></div><div className="flex flex-wrap gap-2">{item.resourcePath && <Button asChild size="sm" variant="outline"><a href={item.resourcePath}>Open</a></Button>}{!item.readAt && <Button size="sm" variant="ghost" aria-label={`Mark ${item.title} read`} onClick={() => markRead.mutate({ notificationId: item.id }, { onSuccess: refresh, onError: () => toast({ title: 'Could not update notification', variant: 'destructive' }) })}>Mark read</Button>}</div></div>)}</div> : <EmptyState title="You are all caught up" description="New activity will appear here when someone responds, invites you, or asks to connect." />}</CardContent></Card>
  </div>;
}
