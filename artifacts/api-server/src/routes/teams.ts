import { createHash, randomBytes } from 'node:crypto';
import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  requireWorkspaceAccess,
  requireWorkspaceAdmin,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

async function getMemberProfiles(req: Parameters<typeof getRequestSupabase>[0], userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);
  if (error) throw error;
  return new Map((data ?? []).map((profile) => [profile.id, profile.display_name || 'Founder']));
}

router.get('/workspaces/:workspaceId/members', async (req, res): Promise<void> => {
  const params = api.ListWorkspaceMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAccess(req, res, params.data.workspaceId))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('workspace_members')
    .select('workspace_id,user_id,role,created_at')
    .eq('workspace_id', params.data.workspaceId)
    .order('created_at', { ascending: true });
  if (error) {
    sendSupabaseError(req, res, error, 'load workspace members');
    return;
  }

  try {
    const names = await getMemberProfiles(req, (data ?? []).map((item) => item.user_id));
    res.json(api.ListWorkspaceMembersResponse.parse((data ?? []).map((member) => ({
      userId: member.user_id,
      displayName: names.get(member.user_id) ?? 'Founder',
      role: member.role,
      joinedAt: member.created_at,
    }))));
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load workspace member profiles');
  }
});

router.patch('/workspaces/:workspaceId/members/:memberId', async (req, res): Promise<void> => {
  const params = api.UpdateWorkspaceMemberParams.safeParse(req.params);
  const body = api.UpdateWorkspaceMemberBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid member and role.' });
    return;
  }
  if (!(await requireWorkspaceAdmin(req, res, params.data.workspaceId))) return;

  const supabase = getRequestSupabase(req);
  const { data: target, error: lookupError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', params.data.workspaceId)
    .eq('user_id', params.data.memberId)
    .maybeSingle();
  if (lookupError) {
    sendSupabaseError(req, res, lookupError, 'load workspace member');
    return;
  }
  if (!target) {
    res.status(404).json({ error: 'Workspace member not found.' });
    return;
  }
  if (target.role === 'owner') {
    res.status(403).json({ error: 'The workspace owner role cannot be changed.' });
    return;
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .update({ role: body.data.role })
    .eq('workspace_id', params.data.workspaceId)
    .eq('user_id', params.data.memberId)
    .select('workspace_id,user_id,role,created_at')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update workspace member');
    return;
  }
  if (!data) {
    res.status(403).json({ error: 'You cannot change this member.' });
    return;
  }

  try {
    const names = await getMemberProfiles(req, [data.user_id]);
    res.json(api.UpdateWorkspaceMemberResponse.parse({
      userId: data.user_id,
      displayName: names.get(data.user_id) ?? 'Founder',
      role: data.role,
      joinedAt: data.created_at,
    }));
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load workspace member profile');
  }
});

router.delete('/workspaces/:workspaceId/members/:memberId', async (req, res): Promise<void> => {
  const params = api.RemoveWorkspaceMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid workspace and member are required.' });
    return;
  }
  if (!(await requireWorkspaceAdmin(req, res, params.data.workspaceId))) return;

  const supabase = getRequestSupabase(req);
  const { data: target, error: lookupError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', params.data.workspaceId)
    .eq('user_id', params.data.memberId)
    .maybeSingle();
  if (lookupError) {
    sendSupabaseError(req, res, lookupError, 'load workspace member');
    return;
  }
  if (!target) {
    res.status(404).json({ error: 'Workspace member not found.' });
    return;
  }
  if (target.role === 'owner') {
    res.status(403).json({ error: 'The workspace owner cannot be removed.' });
    return;
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', params.data.workspaceId)
    .eq('user_id', params.data.memberId)
    .select('user_id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'remove workspace member');
    return;
  }
  if (!data) {
    res.status(403).json({ error: 'You cannot remove this member.' });
    return;
  }
  res.status(204).end();
});

router.get('/workspaces/:workspaceId/invitations', async (req, res): Promise<void> => {
  const params = api.ListWorkspaceInvitationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAdmin(req, res, params.data.workspaceId))) return;

  const { data, error } = await getRequestSupabase(req)
    .from('workspace_invitations')
    .select('id,workspace_id,email,role,status,expires_at,created_at')
    .eq('workspace_id', params.data.workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load workspace invitations');
    return;
  }
  res.json(api.ListWorkspaceInvitationsResponse.parse((data ?? []).map((invite) => ({
    id: invite.id,
    workspaceId: invite.workspace_id,
    email: invite.email,
    role: invite.role,
    status: invite.expires_at <= new Date().toISOString() ? 'expired' : invite.status,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
  }))));
});

router.post('/workspaces/:workspaceId/invitations', async (req, res): Promise<void> => {
  const params = api.CreateWorkspaceInvitationParams.safeParse(req.params);
  const body = api.CreateWorkspaceInvitationBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid workspace invitation.' });
    return;
  }
  if (!(await requireWorkspaceAdmin(req, res, params.data.workspaceId))) return;

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const email = body.data.email?.trim().toLowerCase() ?? null;
  const { data, error } = await getRequestSupabase(req)
    .from('workspace_invitations')
    .insert({
      workspace_id: params.data.workspaceId,
      email,
      role: body.data.role,
      token_hash: tokenHash,
      created_by: getRequestUser(req).id,
    })
    .select('id,workspace_id,email,role,status,expires_at,created_at')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create workspace invitation');
    return;
  }

  res.status(201).json(api.CreateWorkspaceInvitationResponse.parse({
    invitation: {
      id: data.id,
      workspaceId: data.workspace_id,
      email: data.email,
      role: data.role,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    },
    token,
  }));
});

router.get('/workspaces/:workspaceId/join-requests', async (req, res): Promise<void> => {
  const params = api.ListWorkspaceJoinRequestsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  if (!(await requireWorkspaceAdmin(req, res, params.data.workspaceId))) return;
  const { data, error } = await getRequestSupabase(req)
    .from('workspace_join_requests')
    .select('*')
    .eq('workspace_id', params.data.workspaceId)
    .order('created_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load workspace join requests');
    return;
  }
  res.json(api.ListWorkspaceJoinRequestsResponse.parse((data ?? []).map((item) => ({
    id: item.id,
    workspaceId: item.workspace_id,
    requesterId: item.requester_id,
    requesterName: item.requester_name,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }))));
});

router.get('/workspaces/:workspaceId/join-requests/me', async (req, res): Promise<void> => {
  const params = api.GetMyWorkspaceJoinRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('workspace_join_requests')
    .select('*')
    .eq('workspace_id', params.data.workspaceId)
    .eq('requester_id', getRequestUser(req).id)
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'load your workspace join request');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'You have not requested to join this workspace.' });
    return;
  }
  res.json(api.GetMyWorkspaceJoinRequestResponse.parse({
    id: data.id,
    workspaceId: data.workspace_id,
    requesterId: data.requester_id,
    requesterName: data.requester_name,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }));
});

router.post('/workspaces/:workspaceId/join-requests', async (req, res): Promise<void> => {
  const params = api.CreateWorkspaceJoinRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid workspaceId is required.' });
    return;
  }
  const user = getRequestUser(req);
  const { data: membership, error: memberError } = await getRequestSupabase(req)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', params.data.workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (memberError) {
    sendSupabaseError(req, res, memberError, 'check workspace membership');
    return;
  }
  if (membership) {
    res.status(409).json({ error: 'You are already a member of this workspace.' });
    return;
  }
  const { data: profile, error: profileError } = await getRequestSupabase(req)
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) {
    sendSupabaseError(req, res, profileError, 'load founder profile');
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('workspace_join_requests')
    .insert({
      workspace_id: params.data.workspaceId,
      requester_id: user.id,
      requester_name: profile?.display_name || 'Founder',
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'A join request already exists for this workspace.' });
      return;
    }
    sendSupabaseError(req, res, error, 'create workspace join request');
    return;
  }
  res.status(201).json(api.CreateWorkspaceJoinRequestResponse.parse({
    id: data.id,
    workspaceId: data.workspace_id,
    requesterId: data.requester_id,
    requesterName: data.requester_name,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }));
});

router.patch('/workspaces/:workspaceId/join-requests/:requestId', async (req, res): Promise<void> => {
  const params = api.UpdateWorkspaceJoinRequestParams.safeParse(req.params);
  const body = api.UpdateWorkspaceJoinRequestBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid join request response.' });
    return;
  }
  if (!(await requireWorkspaceAdmin(req, res, params.data.workspaceId))) return;
  const supabase = getRequestSupabase(req);
  const { data: existing, error: lookupError } = await supabase
    .from('workspace_join_requests')
    .select('id,status')
    .eq('workspace_id', params.data.workspaceId)
    .eq('id', params.data.requestId)
    .maybeSingle();
  if (lookupError) {
    sendSupabaseError(req, res, lookupError, 'load workspace join request');
    return;
  }
  if (!existing) {
    res.status(404).json({ error: 'Workspace join request not found.' });
    return;
  }
  if (existing.status !== 'pending') {
    res.status(409).json({ error: 'This join request has already been answered.' });
    return;
  }
  const { error: respondError } = await supabase.rpc('respond_workspace_join_request', {
    p_request_id: params.data.requestId,
    p_status: body.data.status,
  });
  if (respondError) {
    sendSupabaseError(req, res, respondError, 'respond to workspace join request');
    return;
  }
  const { data, error } = await supabase
    .from('workspace_join_requests')
    .select('*')
    .eq('id', params.data.requestId)
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'load updated workspace join request');
    return;
  }
  res.json(api.UpdateWorkspaceJoinRequestResponse.parse({
    id: data.id,
    workspaceId: data.workspace_id,
    requesterId: data.requester_id,
    requesterName: data.requester_name,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }));
});

router.post('/invitations/accept', async (req, res): Promise<void> => {
  const body = api.AcceptWorkspaceInvitationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Enter a valid invitation token.' });
    return;
  }

  const tokenHash = createHash('sha256').update(body.data.token).digest('hex');
  const supabase = getRequestSupabase(req);
  const { data: workspaceId, error: acceptError } = await supabase.rpc(
    'accept_workspace_invitation',
    { p_token_hash: tokenHash },
  );
  if (acceptError || !workspaceId) {
    if (acceptError) {
      sendSupabaseError(req, res, acceptError, 'accept workspace invitation');
      return;
    }
    res.status(400).json({ error: 'Invitation is invalid or expired.' });
    return;
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id,name,created_at')
    .eq('id', workspaceId)
    .single();
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', getRequestUser(req).id)
    .single();
  if (workspaceError || membershipError || !workspace || !membership) {
    sendSupabaseError(req, res, workspaceError ?? membershipError ?? {}, 'load joined workspace');
    return;
  }
  res.json(api.AcceptWorkspaceInvitationResponse.parse({
    id: workspace.id,
    name: workspace.name,
    role: membership.role,
    createdAt: workspace.created_at,
  }));
});

export default router;
