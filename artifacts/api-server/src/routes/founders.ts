import { Router, type IRouter } from 'express';
import * as api from '@workspace/api-zod';
import {
  getRequestSupabase,
  getRequestUser,
  sendSupabaseError,
} from '../lib/supabase-api';

const router: IRouter = Router();

function toProfile(row: any) {
  return {
    id: row.id,
    displayName: row.display_name || 'Founder',
    headline: row.headline,
    bio: row.bio,
    skills: row.skills ?? [],
    location: row.location,
    company: row.company,
    stage: row.stage,
    websiteUrl: row.website_url,
    isDiscoverable: row.is_discoverable,
    portfolioIsPublic: row.portfolio_is_public,
    lookingForCoFounder: row.looking_for_co_founder,
    professionalInterests: row.professional_interests ?? [],
    collaborationPreferences: row.collaboration_preferences,
    preferredCollaborationSkills: row.preferred_collaboration_skills ?? [],
    startupIdea: row.startup_idea,
    updatedAt: row.updated_at,
  };
}

async function getDisplayNames(req: Parameters<typeof getRequestSupabase>[0], ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map<string, string>();
  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .select('id,display_name')
    .in('id', uniqueIds);
  if (error) throw error;
  return new Map((data ?? []).map((profile) => [profile.id, profile.display_name || 'Founder']));
}

function toConnection(row: any, names: Map<string, string>) {
  return {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: names.get(row.requester_id) ?? 'Founder',
    recipientId: row.recipient_id,
    recipientName: names.get(row.recipient_id) ?? 'Founder',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/founders', async (req, res): Promise<void> => {
  const parsed = api.SearchFoundersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid founder search.' });
    return;
  }

  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .select('id,display_name,headline,bio,skills,location,company,stage,website_url,is_discoverable,portfolio_is_public,looking_for_co_founder,professional_interests,collaboration_preferences,preferred_collaboration_skills,startup_idea,updated_at')
    .eq('is_discoverable', true)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) {
    sendSupabaseError(req, res, error, 'search founder profiles');
    return;
  }

  const q = parsed.data.q?.trim().toLocaleLowerCase();
  const skill = parsed.data.skill?.trim().toLocaleLowerCase();
  const stage = parsed.data.stage;
  const lookingForCoFounder = parsed.data.lookingForCoFounder;
  const founders = (data ?? [])
    .map(toProfile)
    .filter((profile) => {
      const text = [
        profile.displayName,
        profile.headline ?? '',
        profile.bio ?? '',
        profile.company ?? '',
        profile.location ?? '',
        ...(profile.skills ?? []),
        ...(profile.professionalInterests ?? []),
        profile.collaborationPreferences ?? '',
      ].join(' ').toLocaleLowerCase();
      return (!q || text.includes(q))
        && (!skill || profile.skills.some((item: string) => item.toLocaleLowerCase().includes(skill)))
        && (!stage || profile.stage === stage)
        && (lookingForCoFounder === undefined || profile.lookingForCoFounder === lookingForCoFounder);
    })
    .slice(0, parsed.data.limit ?? 20);

  res.json(api.SearchFoundersResponse.parse(founders));
});

router.get('/founders/me', async (req, res): Promise<void> => {
  const user = getRequestUser(req);
  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .select('id,display_name,headline,bio,skills,location,company,stage,website_url,is_discoverable,portfolio_is_public,looking_for_co_founder,professional_interests,collaboration_preferences,preferred_collaboration_skills,startup_idea,updated_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'load founder profile');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Founder profile not found. Apply the supplied Supabase migrations first.' });
    return;
  }
  res.json(api.GetFounderProfileResponse.parse(toProfile(data)));
});

router.patch('/founders/me', async (req, res): Promise<void> => {
  const body = api.UpdateFounderProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Enter valid profile details.' });
    return;
  }
  const values: Record<string, unknown> = {};
  const fields: Record<string, string> = {
    displayName: 'display_name',
    headline: 'headline',
    bio: 'bio',
    skills: 'skills',
    location: 'location',
    company: 'company',
    stage: 'stage',
    websiteUrl: 'website_url',
    isDiscoverable: 'is_discoverable',
    portfolioIsPublic: 'portfolio_is_public',
    lookingForCoFounder: 'looking_for_co_founder',
    professionalInterests: 'professional_interests',
    collaborationPreferences: 'collaboration_preferences',
    preferredCollaborationSkills: 'preferred_collaboration_skills',
    startupIdea: 'startup_idea',
  };
  for (const [key, column] of Object.entries(fields)) {
    if (body.data[key as keyof typeof body.data] !== undefined) {
      const value = body.data[key as keyof typeof body.data];
      values[column] = typeof value === 'string' ? value.trim() || null : value;
    }
  }
  if (typeof values.display_name === 'object') {
    res.status(400).json({ error: 'Display name cannot be blank.' });
    return;
  }

  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .update(values)
    .eq('id', getRequestUser(req).id)
    .select('id,display_name,headline,bio,skills,location,company,stage,website_url,is_discoverable,portfolio_is_public,looking_for_co_founder,professional_interests,collaboration_preferences,preferred_collaboration_skills,startup_idea,updated_at')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'update founder profile');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Founder profile not found.' });
    return;
  }
  res.json(api.UpdateFounderProfileResponse.parse(toProfile(data)));
});

router.get('/connections', async (req, res): Promise<void> => {
  const userId = getRequestUser(req).id;
  const { data, error } = await getRequestSupabase(req)
    .from('founder_connections')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) {
    sendSupabaseError(req, res, error, 'load founder connections');
    return;
  }
  try {
    const names = await getDisplayNames(req, (data ?? []).flatMap((item) => [item.requester_id, item.recipient_id]));
    res.json(api.ListFounderConnectionsResponse.parse((data ?? []).map((row) => toConnection(row, names))));
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load founder connection profiles');
  }
});

router.post('/connections', async (req, res): Promise<void> => {
  const body = api.CreateFounderConnectionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Choose a valid founder to connect with.' });
    return;
  }
  const userId = getRequestUser(req).id;
  if (body.data.recipientId === userId) {
    res.status(400).json({ error: 'You cannot send a connection request to yourself.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,display_name,is_discoverable')
    .eq('id', body.data.recipientId)
    .maybeSingle();
  if (profileError) {
    sendSupabaseError(req, res, profileError, 'check founder profile');
    return;
  }
  if (!profile || !profile.is_discoverable) {
    res.status(404).json({ error: 'This founder is not currently discoverable.' });
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from('founder_connections')
    .select('id,status')
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${body.data.recipientId}),and(requester_id.eq.${body.data.recipientId},recipient_id.eq.${userId})`)
    .maybeSingle();
  if (existingError) {
    sendSupabaseError(req, res, existingError, 'check existing founder connection');
    return;
  }
  if (existing) {
    res.status(409).json({ error: existing.status === 'accepted' ? 'You are already connected.' : 'A connection request already exists.' });
    return;
  }

  const { data, error } = await supabase
    .from('founder_connections')
    .insert({ requester_id: userId, recipient_id: body.data.recipientId })
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'create founder connection');
    return;
  }
  try {
    const names = await getDisplayNames(req, [data.requester_id, data.recipient_id]);
    res.status(201).json(api.CreateFounderConnectionResponse.parse(toConnection(data, names)));
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load founder connection profiles');
  }
});

router.patch('/connections/:connectionId', async (req, res): Promise<void> => {
  const params = api.UpdateFounderConnectionParams.safeParse(req.params);
  const body = api.UpdateFounderConnectionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'Enter a valid connection response.' });
    return;
  }
  const supabase = getRequestSupabase(req);
  const userId = getRequestUser(req).id;
  const { data: current, error: lookupError } = await supabase
    .from('founder_connections')
    .select('*')
    .eq('id', params.data.connectionId)
    .maybeSingle();
  if (lookupError) {
    sendSupabaseError(req, res, lookupError, 'load founder connection');
    return;
  }
  if (!current) {
    res.status(404).json({ error: 'Connection request not found.' });
    return;
  }
  if (current.recipient_id !== userId) {
    res.status(403).json({ error: 'Only the recipient can respond to this request.' });
    return;
  }
  if (current.status !== 'pending') {
    res.status(409).json({ error: 'This connection request has already been answered.' });
    return;
  }

  const { data, error } = await supabase
    .from('founder_connections')
    .update({ status: body.data.status })
    .eq('id', params.data.connectionId)
    .select('*')
    .single();
  if (error) {
    sendSupabaseError(req, res, error, 'respond to founder connection');
    return;
  }
  try {
    const names = await getDisplayNames(req, [data.requester_id, data.recipient_id]);
    res.json(api.UpdateFounderConnectionResponse.parse(toConnection(data, names)));
  } catch (profileError) {
    sendSupabaseError(req, res, profileError as { code?: string }, 'load founder connection profiles');
  }
});

router.delete('/connections/:connectionId', async (req, res): Promise<void> => {
  const params = api.DeleteFounderConnectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid connectionId is required.' });
    return;
  }
  const { data, error } = await getRequestSupabase(req)
    .from('founder_connections')
    .delete()
    .eq('id', params.data.connectionId)
    .select('id')
    .maybeSingle();
  if (error) {
    sendSupabaseError(req, res, error, 'delete founder connection');
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Connection not found or not available to this account.' });
    return;
  }
  res.status(204).end();
});

export default router;
