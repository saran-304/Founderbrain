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
    .select('*')
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
    .select('*')
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
  // Try to select all columns, but gracefully handle missing columns
  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .select('*')
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
    .select('*')
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

function calculateCompatibility(myProfile: any, otherProfile: any): { score: number; explanation: string[] } {
  const explanation: string[] = [];
  let score = 0;

  // Check if both are looking for co-founders (30 points)
  if (myProfile.looking_for_co_founder && otherProfile.looking_for_co_founder) {
    score += 30;
    explanation.push('Both actively seeking co-founders');
  } else if (otherProfile.looking_for_co_founder) {
    score += 15;
    explanation.push('They are looking for a co-founder');
  }

  // Complementary skills (up to 25 points)
  const mySkills = new Set(myProfile.skills || []);
  const otherSkills = new Set(otherProfile.skills || []);
  const complementarySkills = [...otherSkills].filter((s: string) => !mySkills.has(s));
  if (complementarySkills.length > 0) {
    const skillScore = Math.min(25, complementarySkills.length * 5);
    score += skillScore;
    explanation.push(`Complementary skills: ${complementarySkills.slice(0, 3).join(', ')}`);
  }

  // Shared professional interests (up to 20 points)
  const myInterests = new Set(myProfile.professional_interests || []);
  const otherInterests = new Set(otherProfile.professional_interests || []);
  const sharedInterests = [...myInterests].filter((i: string) => otherInterests.has(i));
  if (sharedInterests.length > 0) {
    const interestScore = Math.min(20, sharedInterests.length * 7);
    score += interestScore;
    explanation.push(`Shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
  }

  // Startup stage compatibility (up to 15 points)
  const stageOrder = ['idea', 'bootstrapped', 'pre_seed', 'seed', 'series_a', 'series_b_plus', 'other'];
  const myStageIndex = stageOrder.indexOf(myProfile.stage || 'idea');
  const otherStageIndex = stageOrder.indexOf(otherProfile.stage || 'idea');
  const stageDiff = Math.abs(myStageIndex - otherStageIndex);
  if (stageDiff <= 1) {
    score += 15;
    explanation.push('Similar startup stage');
  } else if (stageDiff <= 2) {
    score += 8;
    explanation.push('Compatible startup stage');
  }

  // Collaboration preferences match (up to 10 points)
  if (myProfile.collaboration_preferences && otherProfile.collaboration_preferences) {
    const myPrefs = myProfile.collaboration_preferences.toLowerCase();
    const otherPrefs = otherProfile.collaboration_preferences.toLowerCase();
    if (myPrefs.includes(otherPrefs) || otherPrefs.includes(myPrefs)) {
      score += 10;
      explanation.push('Aligned collaboration preferences');
    }
  }

  return { score: Math.min(100, score), explanation };
}

router.get('/founders/matches', async (req, res): Promise<void> => {
  const parsed = api.GetFounderMatchesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid match parameters.' });
    return;
  }

  const userId = getRequestUser(req).id;
  const limit = parsed.data.limit ?? 10;

  // Get current user's profile
  const { data: myProfile, error: profileError } = await getRequestSupabase(req)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    sendSupabaseError(req, res, profileError, 'load your profile');
    return;
  }
  if (!myProfile) {
    res.status(404).json({ error: 'Your profile not found. Please complete your profile first.' });
    return;
  }

  // Get discoverable profiles excluding self
  const { data, error } = await getRequestSupabase(req)
    .from('profiles')
    .select('*')
    .eq('is_discoverable', true)
    .neq('id', userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    sendSupabaseError(req, res, error, 'load founder profiles for matching');
    return;
  }

  // Calculate compatibility for each profile
  const matches = (data ?? [])
    .map((profile) => {
      const { score, explanation } = calculateCompatibility(myProfile, profile);
      return {
        founder: toProfile(profile),
        compatibilityScore: score,
        explanation,
      };
    })
    .filter((match) => match.compatibilityScore > 20) // Only show meaningful matches
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);

  res.json(api.GetFounderMatchesResponse.parse(matches));
});

// Saved founders endpoints
router.get('/founders/saved', async (req, res): Promise<void> => {
  const userId = getRequestUser(req).id;
  const { data, error } = await getRequestSupabase(req)
    .from('saved_founders')
    .select('founder_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    sendSupabaseError(req, res, error, 'load saved founders');
    return;
  }

  if (!data || data.length === 0) {
    res.json([]);
    return;
  }

  const founderIds = data.map((item) => item.founder_id);
  const { data: profiles, error: profilesError } = await getRequestSupabase(req)
    .from('profiles')
    .select('*')
    .in('id', founderIds);

  if (profilesError) {
    sendSupabaseError(req, res, profilesError, 'load saved founder profiles');
    return;
  }

  res.json(api.ListSavedFoundersResponse.parse((profiles ?? []).map(toProfile)));
});

router.post('/founders/saved', async (req, res): Promise<void> => {
  const body = api.SaveFounderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'A valid founderId is required.' });
    return;
  }

  const userId = getRequestUser(req).id;
  const founderId = body.data.founderId;

  if (founderId === userId) {
    res.status(400).json({ error: 'You cannot save yourself.' });
    return;
  }

  // Check if founder exists and is discoverable
  const { data: profile, error: profileError } = await getRequestSupabase(req)
    .from('profiles')
    .select('id,display_name,is_discoverable')
    .eq('id', founderId)
    .maybeSingle();

  if (profileError) {
    sendSupabaseError(req, res, profileError, 'check founder profile');
    return;
  }

  if (!profile) {
    res.status(404).json({ error: 'Founder profile not found.' });
    return;
  }

  // Check if already saved
  const { data: existing, error: existingError } = await getRequestSupabase(req)
    .from('saved_founders')
    .select('id')
    .eq('user_id', userId)
    .eq('founder_id', founderId)
    .maybeSingle();

  if (existingError) {
    sendSupabaseError(req, res, existingError, 'check existing saved founder');
    return;
  }

  if (existing) {
    res.status(409).json({ error: 'Founder already saved.' });
    return;
  }

  const { data, error } = await getRequestSupabase(req)
    .from('saved_founders')
    .insert({ user_id: userId, founder_id: founderId })
    .select('founder_id')
    .single();

  if (error) {
    sendSupabaseError(req, res, error, 'save founder');
    return;
  }

  res.status(201).end();
});

router.delete('/founders/saved/:founderId', async (req, res): Promise<void> => {
  const params = api.UnsaveFounderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: 'A valid founderId is required.' });
    return;
  }

  const userId = getRequestUser(req).id;
  const founderId = params.data.founderId;

  const { data, error } = await getRequestSupabase(req)
    .from('saved_founders')
    .delete()
    .eq('user_id', userId)
    .eq('founder_id', founderId)
    .select('id')
    .maybeSingle();

  if (error) {
    sendSupabaseError(req, res, error, 'unsave founder');
    return;
  }

  if (!data) {
    res.status(404).json({ error: 'Saved founder not found.' });
    return;
  }

  res.status(204).end();
});

export default router;
